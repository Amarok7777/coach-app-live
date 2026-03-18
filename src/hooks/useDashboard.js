import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useDashboard() {
    const [summary, setSummary] = useState(null)
    const [nextEvents, setNextEvents] = useState([])
    const [topScorers, setTopScorers] = useState([])
    const [recentNotes, setRecentNotes] = useState([])
    const [activeInjuries, setActiveInjuries] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        setError(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Nicht angemeldet')

            const today = new Date().toISOString().split('T')[0]

            const [
                summaryRes,
                playerStatsRes,
                allMatchesRes,
                allTrainingsRes,
                playerPositionsRes,
                upcomingMatchesRes,
                upcomingTrainingsRes,
                notesRes,
                matchNotesRes,
                trainingNotesRes,
                injuriesRes,
                scorersRes,
            ] = await Promise.all([
                // Team summary view
                supabase
                    .from('team_summary')
                    .select('*')
                    .eq('user_id', user.id)
                    .single(),

                // Player stats — for attendance + training rating averages
                // (team_summary view does not contain these aggregates)
                supabase
                    .from('player_stats_summary')
                    .select('avg_match_rating, avg_training_rating, attendance_match_pct, attendance_training_pct')
                    .eq('user_id', user.id),

                // All played matches — for wins/draws/losses/goals against
                supabase
                    .from('match_days')
                    .select('score_own, score_opp')
                    .eq('user_id', user.id)
                    .not('score_own', 'is', null)
                    .not('score_opp', 'is', null),

                // All training sessions — for type breakdown
                supabase
                    .from('training_sessions')
                    .select('type')
                    .eq('user_id', user.id),

                // Players with position — for position group counts
                supabase
                    .from('players')
                    .select('position')
                    .eq('user_id', user.id),

                // Upcoming matches (next events)
                supabase
                    .from('match_days')
                    .select('id, date, opponent, home_away, score_own, score_opp')
                    .eq('user_id', user.id)
                    .gte('date', today)
                    .order('date', { ascending: true })
                    .limit(3),

                // Upcoming training sessions (next events)
                supabase
                    .from('training_sessions')
                    .select('id, date, title, type, duration_min')
                    .eq('user_id', user.id)
                    .gte('date', today)
                    .order('date', { ascending: true })
                    .limit(3),

                // Manual notes (notes table) — no user_id filter, RLS handles scope
                // usePlayerProfile inserts without user_id so eq filter would exclude them
                supabase
                    .from('notes')
                    .select('id, content, created_at, player_id, players!notes_player_id_fkey(id, name)')
                    .order('created_at', { ascending: false })
                    .limit(20),

                // Match attendance notes — rows with a non-empty note field
                supabase
                    .from('match_attendance')
                    .select('id, note, updated_at, player_id, players!match_attendance_player_id_fkey(id, name), match_days!match_attendance_match_id_fkey(date, opponent)')
                    .not('note', 'is', null)
                    .neq('note', '')
                    .order('updated_at', { ascending: false })
                    .limit(20),

                // Training attendance notes — rows with a non-empty note field
                supabase
                    .from('training_attendance')
                    .select('id, note, updated_at, player_id, players!training_attendance_player_id_fkey(id, name), training_sessions!training_attendance_session_id_fkey(date, title, type)')
                    .not('note', 'is', null)
                    .neq('note', '')
                    .order('updated_at', { ascending: false })
                    .limit(20),

                // Active injuries — user_id filtered
                supabase
                    .from('injuries')
                    .select('id, description, expected_return, players(id, name)')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .order('injury_date', { ascending: false })
                    .limit(5),

                // Top scorers
                supabase
                    .from('top_scorers')
                    .select('player_id, name, position, number, goals, assists, goal_contributions')
                    .eq('user_id', user.id)
                    .order('goal_contributions', { ascending: false })
                    .limit(5),
            ])

            // PGRST116 = no rows, not a real error
            if (summaryRes.error && summaryRes.error.code !== 'PGRST116') throw summaryRes.error

            // ── Team averages from player_stats_summary ──────────────────
            // team_summary view does not contain attendance or training rating
            const playerRows = playerStatsRes.data ?? []
            function teamAvg(rows, key) {
                const vals = rows.map(p => p[key]).filter(v => v != null)
                if (!vals.length) return null
                return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
            }

            // ── Match results breakdown ───────────────────────────────────
            const playedMatches = allMatchesRes.data ?? []
            const wins = playedMatches.filter(m => m.score_own > m.score_opp).length
            const draws = playedMatches.filter(m => m.score_own === m.score_opp).length
            const losses = playedMatches.filter(m => m.score_own < m.score_opp).length
            const goalsFor = playedMatches.reduce((s, m) => s + (m.score_own ?? 0), 0)
            const goalsAgainst = playedMatches.reduce((s, m) => s + (m.score_opp ?? 0), 0)

            // ── Training type breakdown ───────────────────────────────────
            const SESSION_TYPES = ['Technik', 'Taktik', 'Kondition', 'Spielform', 'Torschuss', 'Standards', 'Testspiel', 'Sonstiges']
            const allSessions = allTrainingsRes.data ?? []
            const trainingByType = SESSION_TYPES.reduce((acc, t) => {
                acc[t] = allSessions.filter(s => s.type === t).length
                return acc
            }, {})

            // ── Player position groups ────────────────────────────────────
            const DEFENSE_POS = ['Torwart', 'Innenverteidiger', 'Außenverteidiger']
            const MIDFIELD_POS = ['Defensives Mittelfeld', 'Zentrales Mittelfeld', 'Offensives Mittelfeld']
            const OFFENSE_POS = ['Linksaußen', 'Rechtsaußen', 'Stürmer']
            const allPlayers = playerPositionsRes.data ?? []
            const defenseCount = allPlayers.filter(p => DEFENSE_POS.includes(p.position)).length
            const midfieldCount = allPlayers.filter(p => MIDFIELD_POS.includes(p.position)).length
            const offenseCount = allPlayers.filter(p => OFFENSE_POS.includes(p.position)).length

            // ── Compose enriched summary ──────────────────────────────────
            const derivedSummary = summaryRes.data ? {
                ...summaryRes.data,
                // Match breakdown
                wins, draws, losses,
                goals_for: goalsFor,
                goals_against: goalsAgainst,
                // Training type counts
                training_by_type: trainingByType,
                // Player position groups
                defense_count: defenseCount,
                midfield_count: midfieldCount,
                offense_count: offenseCount,
                // Team averages not in team_summary view
                avg_training_rating: teamAvg(playerRows, 'avg_training_rating'),
                avg_attendance_match_pct: teamAvg(playerRows, 'attendance_match_pct'),
                avg_attendance_training_pct: teamAvg(playerRows, 'attendance_training_pct'),
            } : null

            setSummary(derivedSummary)

            // ── Next events — merge matches + trainings ───────────────────
            // DB stores 'Heim'/'Auswärts'/'Neutral', not 'home'/'away'
            const matchEvents = (upcomingMatchesRes.data ?? []).map(m => ({
                id: m.id,
                type: 'match',
                date: m.date,
                title: m.opponent ?? 'Spiel',
                detail: m.home_away === 'Heim' ? 'Heimspiel'
                    : m.home_away === 'Auswärts' ? 'Auswärtsspiel'
                        : m.home_away ?? null,
            }))
            const trainingEvents = (upcomingTrainingsRes.data ?? []).map(t => ({
                id: t.id,
                type: 'training',
                date: t.date,
                title: t.title || 'Training',
                detail: t.type ?? null,
            }))
            const merged = [...matchEvents, ...trainingEvents]
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 5)
            setNextEvents(merged)

            // ── Merge all three note sources, sort by date, take 5 ────────
            const manualNotes = (notesRes.data ?? []).map(n => ({
                key: `manual-${n.id}`,
                playerName: n.players?.name ?? null,
                content: n.content,
                date: n.created_at,
                source: 'manual',
            }))

            const matchNotes = (matchNotesRes.data ?? [])
                .filter(n => n.note?.trim())
                .map(n => ({
                    key: `match-${n.id}`,
                    playerName: n.players?.name ?? null,
                    content: n.note,
                    date: n.updated_at,
                    source: 'match',
                    context: n.match_days?.opponent ?? 'Spiel',
                }))

            const trainingNotes = (trainingNotesRes.data ?? [])
                .filter(n => n.note?.trim())
                .map(n => ({
                    key: `training-${n.id}`,
                    playerName: n.players?.name ?? null,
                    content: n.note,
                    date: n.updated_at,
                    source: 'training',
                    context: n.training_sessions?.title || n.training_sessions?.type || 'Training',
                }))

            const allNotesMerged = [...manualNotes, ...matchNotes, ...trainingNotes]
                .filter(n => n.playerName)  // only show if player resolved
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)

            setRecentNotes(allNotesMerged)
            setActiveInjuries(injuriesRes.data ?? [])
            setTopScorers(scorersRes.data ?? [])
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    async function addQuickNote(playerId, content) {
        const { error } = await supabase.from('notes').insert({ player_id: playerId, content })
        if (error) throw error
        load()
    }

    return {
        summary,
        nextEvents,
        topScorers,
        recentNotes,
        activeInjuries,
        loading,
        error,
        reload: load,
        addQuickNote,
    }
}