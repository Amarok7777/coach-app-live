import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePlayerProfile(playerId) {
    const [player, setPlayer] = useState(null)
    const [notes, setNotes] = useState([])
    const [injuries, setInjuries] = useState([])
    const [availability, setAvailability] = useState([])
    const [matchHistory, setMatchHistory] = useState([])
    const [trainingHistory, setTrainingHistory] = useState([])
    const [consents, setConsents] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => { if (playerId) load() }, [playerId])

    async function load() {
        setLoading(true)
        setError(null)
        try {
            const [
                playerRes, notesRes, injuriesRes, availRes,
                matchRes, trainingRes, consentRes, statsRes,
            ] = await Promise.all([
                supabase
                    .from('players')
                    .select('*')
                    .eq('id', playerId)
                    .single(),

                supabase
                    .from('notes')
                    .select('*')
                    .eq('player_id', playerId)
                    .order('created_at', { ascending: false }),

                supabase
                    .from('injuries')
                    .select('*')
                    .eq('player_id', playerId)
                    .order('injury_date', { ascending: false }),

                supabase
                    .from('player_availability')
                    .select('*')
                    .eq('player_id', playerId)
                    .order('date_from', { ascending: false }),

                // clean_sheet mitladen damit Spielerprofil Zu-Null-Spiele zeigen kann
                supabase
                    .from('match_attendance')
                    .select('*, match_days(date, opponent, home_away, score_own, score_opp, clean_sheet)')
                    .eq('player_id', playerId)
                    .order('match_days(date)', { ascending: false })
                    .limit(20),

                supabase
                    .from('training_attendance')
                    .select('*, training_sessions(date, title, type, duration_min)')
                    .eq('player_id', playerId)
                    .order('training_sessions(date)', { ascending: false })
                    .limit(20),

                supabase
                    .from('consent_records')
                    .select('*')
                    .eq('player_id', playerId),

                // player_stats_summary nach id filtern (id = players.id in der View)
                supabase
                    .from('player_stats_summary')
                    .select('*')
                    .eq('id', playerId)
                    .maybeSingle(),
            ])

            if (playerRes.error) throw playerRes.error
            setPlayer(playerRes.data)
            setNotes(notesRes.data ?? [])
            setInjuries(injuriesRes.data ?? [])
            setAvailability(availRes.data ?? [])
            setMatchHistory(matchRes.data ?? [])
            setTrainingHistory(trainingRes.data ?? [])
            setConsents(consentRes.data ?? [])
            setStats(statsRes.data ?? null)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    // ── Notes ─────────────────────────────────────────────────
    async function addNote(content) {
        const { error } = await supabase
            .from('notes')
            .insert({ player_id: playerId, content })
        if (error) throw error
        const { data } = await supabase
            .from('notes')
            .select('*')
            .eq('player_id', playerId)
            .order('created_at', { ascending: false })
        setNotes(data ?? [])
    }

    async function deleteNote(id) {
        const { error } = await supabase.from('notes').delete().eq('id', id)
        if (error) throw error
        setNotes(prev => prev.filter(n => n.id !== id))
    }

    // ── Injuries ──────────────────────────────────────────────
    async function addInjury(fields) {
        const { data: p } = await supabase
            .from('players').select('user_id').eq('id', playerId).single()
        const { error } = await supabase
            .from('injuries')
            .insert({ ...fields, player_id: playerId, user_id: p.user_id })
        if (error) throw error
        load()
    }

    async function updateInjury(id, fields) {
        const { error } = await supabase.from('injuries').update(fields).eq('id', id)
        if (error) throw error
        load()
    }

    // ── Availability ──────────────────────────────────────────
    async function setAvail(fields) {
        const { data: p } = await supabase
            .from('players').select('user_id').eq('id', playerId).single()
        const { error } = await supabase
            .from('player_availability')
            .insert({ ...fields, player_id: playerId, user_id: p.user_id })
        if (error) throw error
        load()
    }

    // ── Consents ──────────────────────────────────────────────
    async function grantConsent(consentType, version = '1.0') {
        const { data: p } = await supabase
            .from('players').select('user_id').eq('id', playerId).single()
        const { error } = await supabase
            .from('consent_records')
            .upsert(
                {
                    player_id: playerId,
                    user_id: p.user_id,
                    consent_type: consentType,
                    version,
                    granted_at: new Date().toISOString(),
                    revoked_at: null,
                },
                { onConflict: 'player_id,consent_type,version' }
            )
        if (error) throw error
        load()
    }

    async function revokeConsent(id) {
        const { error } = await supabase
            .from('consent_records')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', id)
        if (error) throw error
        load()
    }

    // ── Derived helpers ───────────────────────────────────────
    // Gibt nur Spiele zurück wo der Spieler aktiv war (starter/substitute)
    const activeMatches = matchHistory.filter(
        m => m.status === 'starter' || m.status === 'substitute'
    )

    // Gibt nur Trainings zurück wo der Spieler anwesend war
    const attendedTrainings = trainingHistory.filter(t => t.present === true)

    return {
        player,
        notes,
        injuries,
        availability,
        matchHistory,
        trainingHistory,
        activeMatches,
        attendedTrainings,
        consents,
        stats,
        loading,
        error,
        reload: load,
        addNote,
        deleteNote,
        addInjury,
        updateInjury,
        setAvail,
        grantConsent,
        revokeConsent,
    }
}