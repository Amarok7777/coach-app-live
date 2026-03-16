import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useMatchDetail(matchId) {
    const [match, setMatch] = useState(null)
    const [players, setPlayers] = useState([])
    // { [playerId]: { status, goals, assists, rating, note, minutes_on, minutes_off, minutes_played } }
    const [attMap, setAttMap] = useState({})
    const [shareToken, setShareToken] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    // Sync / offline state
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
    const [syncing, setSyncing] = useState(false)
    const [dirty, setDirty] = useState(false)

    useEffect(() => { if (matchId) load() }, [matchId])

    useEffect(() => {
        const on = () => { setIsOnline(true); if (dirty) sync() }
        const off = () => setIsOnline(false)
        window.addEventListener('online', on)
        window.addEventListener('offline', off)
        return () => {
            window.removeEventListener('online', on)
            window.removeEventListener('offline', off)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dirty])

    async function load() {
        setLoading(true)
        try {
            const [matchRes, attRes, playersRes, tokenRes] = await Promise.all([
                supabase.from('match_days').select('*').eq('id', matchId).single(),
                supabase.from('match_attendance').select('*').eq('match_id', matchId),
                supabase.from('players').select('id, name, number, position').order('name'),
                supabase
                    .from('share_tokens')
                    .select('*')
                    .eq('lineup_plan_id', matchId)
                    .gte('expires_at', new Date().toISOString())
                    .maybeSingle(),
            ])

            if (matchRes.error) throw matchRes.error
            setMatch(matchRes.data)
            setPlayers(playersRes.data ?? [])
            setShareToken(tokenRes.data ?? null)

            const map = {}
                ; (attRes.data ?? []).forEach(a => {
                    map[a.player_id] = {
                        status: a.status ?? 'absent',
                        goals: a.goals ?? 0,
                        assists: a.assists ?? 0,
                        rating: a.rating ?? null,
                        note: a.note ?? '',
                        minutes_on: a.minutes_on ?? null,
                        minutes_off: a.minutes_off ?? null,
                        minutes_played: a.minutes_played ?? null,
                    }
                })
            setAttMap(map)
            setDirty(false)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    // ── Score + clean sheet update ────────────────────────────
    // clean_sheet can be passed explicitly; if omitted it is auto-derived from score_opp
    async function updateScore(score_own, score_opp, clean_sheet = undefined) {
        setSaving(true)
        try {
            const own = parseInt(score_own)
            const opp = parseInt(score_opp)
            // Auto-derive clean sheet if not explicitly provided: clean when opp scored 0
            const cs = clean_sheet !== undefined ? Boolean(clean_sheet) : opp === 0

            const { error } = await supabase
                .from('match_days')
                .update({ score_own: own, score_opp: opp, clean_sheet: cs })
                .eq('id', matchId)

            if (error) throw error
            setMatch(m => ({ ...m, score_own: own, score_opp: opp, clean_sheet: cs }))
        } finally {
            setSaving(false)
        }
    }

    // ── Optimistic attendance update ──────────────────────────
    function upsertAttendance(playerId, fields) {
        const empty = {
            status: 'absent', goals: 0, assists: 0, rating: null,
            note: '', minutes_on: null, minutes_off: null, minutes_played: null,
        }

        setAttMap(prev => {
            const merged = { ...(prev[playerId] ?? empty), ...fields }

            // Recalculate minutes_played locally
            const s = merged.status
            const on = merged.minutes_on
            const off = merged.minutes_off
            if (s === 'starter') merged.minutes_played = off !== null ? off : 90
            else if (s === 'substitute') merged.minutes_played = on !== null ? (off !== null ? off : 90) - on : null
            else merged.minutes_played = null

            setDirty(true)
            return { ...prev, [playerId]: merged }
        })
    }

    // ── Batch sync to DB ──────────────────────────────────────
    async function sync() {
        if (!isOnline) return
        setSyncing(true)
        try {
            const upserts = Object.entries(attMap).map(([player_id, a]) => ({
                match_id: matchId,
                player_id,
                status: a.status ?? 'absent',
                goals: Number.isFinite(Number(a.goals)) ? parseInt(a.goals) : 0,
                assists: Number.isFinite(Number(a.assists)) ? parseInt(a.assists) : 0,
                rating: a.rating != null ? parseFloat(a.rating) : null,
                note: a.note || null,
                minutes_on: a.minutes_on != null ? parseInt(a.minutes_on) : null,
                minutes_off: a.minutes_off != null ? parseInt(a.minutes_off) : null,
                // Do NOT write minutes_played — generated column in DB
                updated_at: new Date().toISOString(),
            }))

            if (upserts.length === 0) {
                setDirty(false)
                return
            }

            const { error } = await supabase
                .from('match_attendance')
                .upsert(upserts, { onConflict: 'match_id,player_id' })

            if (error) {
                console.error('sync match_attendance error', error)
                setError(error.message)
            } else {
                setDirty(false)
            }
        } catch (e) {
            console.error('sync exception', e)
            setError(e.message)
        } finally {
            setSyncing(false)
        }
    }

    // ── Share token ───────────────────────────────────────────
    async function generateShareToken(lineupPlanId) {
        const { data: m } = await supabase
            .from('match_days').select('user_id').eq('id', matchId).single()
        const { data, error } = await supabase
            .from('share_tokens')
            .insert({
                user_id: m.user_id,
                lineup_plan_id: lineupPlanId,
                expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
            })
            .select()
            .single()
        if (error) throw error
        setShareToken(data)
        return data
    }

    // ── WhatsApp share text ───────────────────────────────────
    function getWhatsAppText() {
        if (!match) return ''
        const starters = Object.entries(attMap)
            .filter(([, a]) => a.status === 'starter')
            .map(([pid]) => players.find(p => p.id === pid)?.name ?? '')
            .filter(Boolean)
        const score = match.score_own !== null
            ? `${match.score_own}:${match.score_opp}`
            : 'noch nicht gespielt'
        const cs = match.clean_sheet ? ' 🛡️ Zu Null' : ''
        return encodeURIComponent(
            `⚽ Spieltag: ${match.opponent} (${match.home_away})\n` +
            `📅 ${new Date(match.date).toLocaleDateString('de-DE')}\n` +
            `🏆 Ergebnis: ${score}${cs}\n\n` +
            `Aufstellung:\n${starters.join('\n')}`
        )
    }

    const starterCount = Object.values(attMap).filter(a => a.status === 'starter').length
    const subCount = Object.values(attMap).filter(a => a.status === 'substitute').length

    return {
        match, players, attMap, shareToken,
        loading, saving, error,
        starterCount, subCount,
        reload: load, updateScore, upsertAttendance, generateShareToken, getWhatsAppText,
        isOnline, syncing, dirty, sync,
    }
}