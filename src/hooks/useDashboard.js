import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useDashboard() {
  const [summary, setSummary]   = useState(null)
  const [nextEvents, setNextEvents] = useState([])
  const [topScorers, setTopScorers] = useState([])
  const [recentNotes, setRecentNotes] = useState([])
  const [activeInjuries, setActiveInjuries] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [summaryRes, eventsRes, notesRes, injuriesRes, scorersRes] = await Promise.all([
        supabase.rpc('team_dashboard_summary'),
        supabase.rpc('next_events', { limit_n: 5 }),
        supabase.from('notes')
          .select('id, content, created_at, players(id, name)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('injuries')
          .select('id, description, expected_return, players(id, name)')
          .eq('status', 'active')
          .order('injury_date', { ascending: false })
          .limit(5),
        supabase.from('top_scorers')
          .select('player_id, name, position, number, goals, assists, goal_contributions')
          .limit(5),
      ])

      if (summaryRes.error) throw summaryRes.error
      setSummary(summaryRes.data)
      setNextEvents(eventsRes.data ?? [])
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

  return { summary, nextEvents, topScorers, recentNotes, activeInjuries, loading, error, reload: load, addQuickNote }
}
