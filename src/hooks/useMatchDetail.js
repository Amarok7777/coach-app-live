import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useMatchDetail(matchId) {
  const [match, setMatch]         = useState(null)
  const [players, setPlayers]     = useState([])
  // attendance stored as a map: { [playerId]: {status, goals, assists, rating, note, minutes_on, minutes_off, minutes_played} }
  const [attMap, setAttMap]       = useState({})
  const [shareToken, setShareToken] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)

  useEffect(() => { if (matchId) load() }, [matchId])

  async function load() {
    setLoading(true)
    try {
      const [matchRes, attRes, playersRes, tokenRes] = await Promise.all([
        supabase.from('match_days').select('*').eq('id', matchId).single(),
        supabase.from('match_attendance').select('*').eq('match_id', matchId),
        supabase.from('players').select('id, name, number, position').order('name'),
        supabase.from('share_tokens')
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
      ;(attRes.data ?? []).forEach(a => {
        map[a.player_id] = {
          status:         a.status         ?? 'absent',
          goals:          a.goals          ?? 0,
          assists:        a.assists        ?? 0,
          rating:         a.rating         ?? null,
          note:           a.note           ?? '',
          minutes_on:     a.minutes_on     ?? null,
          minutes_off:    a.minutes_off    ?? null,
          minutes_played: a.minutes_played ?? null,
        }
      })
      setAttMap(map)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateScore(score_own, score_opp) {
    setSaving(true)
    const { error } = await supabase.from('match_days')
      .update({ score_own: parseInt(score_own), score_opp: parseInt(score_opp) })
      .eq('id', matchId)
    if (error) throw error
    setMatch(m => ({ ...m, score_own: parseInt(score_own), score_opp: parseInt(score_opp) }))
    setSaving(false)
  }

  // Optimistic update — no full reload, writes to DB silently in background
  function upsertAttendance(playerId, fields) {
    const empty = { status:'absent', goals:0, assists:0, rating:null, note:'', minutes_on:null, minutes_off:null, minutes_played:null }

    setAttMap(prev => {
      const merged = { ...(prev[playerId] ?? empty), ...fields }

      // Recalculate minutes_played locally
      const s   = merged.status
      const on  = merged.minutes_on
      const off = merged.minutes_off
      if (s === 'starter')    merged.minutes_played = off !== null ? off : 90
      else if (s === 'substitute') merged.minutes_played = on !== null ? (off !== null ? off : 90) - on : null
      else                    merged.minutes_played = null

      // Fire-and-forget DB write
      supabase.from('match_attendance').upsert(
        { match_id: matchId, player_id: playerId, updated_at: new Date().toISOString(), ...merged },
        { onConflict: 'match_id,player_id' }
      ).then(({ error }) => { if (error) console.error('upsert:', error.message) })

      return { ...prev, [playerId]: merged }
    })
  }

  async function generateShareToken(lineupPlanId) {
    const { data: m } = await supabase.from('match_days').select('user_id').eq('id', matchId).single()
    const { data, error } = await supabase.from('share_tokens')
      .insert({ user_id: m.user_id, lineup_plan_id: lineupPlanId,
                expires_at: new Date(Date.now() + 7 * 86400000).toISOString() })
      .select().single()
    if (error) throw error
    setShareToken(data)
    return data
  }

  function getWhatsAppText() {
    if (!match) return ''
    const starters = Object.entries(attMap)
      .filter(([, a]) => a.status === 'starter')
      .map(([pid]) => players.find(p => p.id === pid)?.name ?? '')
      .filter(Boolean)
    const score = match.score_own !== null ? `${match.score_own}:${match.score_opp}` : 'noch nicht gespielt'
    return encodeURIComponent(
      `⚽ Spieltag: ${match.opponent} (${match.home_away})\n` +
      `📅 ${new Date(match.date).toLocaleDateString('de-DE')}\n` +
      `🏆 Ergebnis: ${score}\n\n` +
      `Aufstellung:\n${starters.join('\n')}`
    )
  }

  const starterCount = Object.values(attMap).filter(a => a.status === 'starter').length
  const subCount     = Object.values(attMap).filter(a => a.status === 'substitute').length

  return {
    match, players, attMap, shareToken, loading, saving, error,
    starterCount, subCount,
    reload: load, updateScore, upsertAttendance, generateShareToken, getWhatsAppText,
  }
}
