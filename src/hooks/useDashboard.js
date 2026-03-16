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

            const [summaryRes, matchesRes, trainingsRes, notesRes, injuriesRes, scorersRes] = await Promise.all([
                // Team summary from our new view
                supabase
                    .from('team_summary')
                    .select('*')
                    .eq('user_id', user.id)
                    .single(),

                // Upcoming matches
                supabase
                    .from('match_days')
                    .select('id, date, opponent, home_away, score_own, score_opp')
                    .eq('user_id', user.id)
                    .gte('date', today)
                    .order('date', { ascending: true })
                    .limit(3),

                // Upcoming training sessions
                supabase
                    .from('training_sessions')
                    .select('id, date, title, type, duration_min')
                    .eq('user_id', user.id)
                    .gte('date', today)
                    .order('date', { ascending: true })
                    .limit(3),

                // Recent notes
                supabase
                    .from('notes')
                    .select('id, content, created_at, players(id, name)')
                    .order('created_at', { ascending: false })
                    .limit(5),

                // Active injuries
                supabase
                    .from('injuries')
                    .select('id, description, expected_return, players(id, name)')
                    .eq('status', 'active')
                    .order('injury_date', { ascending: false })
                    .limit(5),

                // Top scorers from view
                supabase
                    .from('top_scorers')
                    .select('player_id, name, position, number, goals, assists, goal_contributions')
                    .eq('user_id', user.id)
                    .order('goal_contributions', { ascending: false })
                    .limit(5),
            ])

            // summary — PGRST116 = no rows, not a real error
            if (summaryRes.error && summaryRes.error.code !== 'PGRST116') throw summaryRes.error
            setSummary(summaryRes.data ?? null)

            // Merge matches + trainings into a unified next-events list, sorted by date
            const matchEvents = (matchesRes.data ?? []).map(m => ({
                id: m.id,
                type: 'match',
                date: m.date,
                title: m.opponent ?? 'Spiel',
                detail: m.home_away === 'home' ? 'Heimspiel' : m.home_away === 'away' ? 'Auswärtsspiel' : null,
            }))
            const trainingEvents = (trainingsRes.data ?? []).map(t => ({
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

            setRecentNotes(notesRes.data ?? [])
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