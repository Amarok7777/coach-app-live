import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function usePlayers() {
  const { user } = useAuth()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('player_stats_summary')
      .select('*')
      .order('name', { ascending: true })
    if (error) setError(error.message)
    else setPlayers(data ?? [])
    setLoading(false)
  }

  async function create(fields) {
    const { error } = await supabase.from('players').insert({ ...fields, user_id: user.id })
    if (error) throw error
    await load()
  }

  async function update(id, fields) {
    const { error } = await supabase.from('players').update(fields).eq('id', id)
    if (error) throw error
    await load()
  }

  async function remove(id) {
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  function exportCSV() {
    if (!players.length) return
    const headers = ['Name','Position','Nummer','Jahrgang','Spiele','Minuten','Tore','Assists','Ø-Rating','Anwesenheit%']
    const rows = players.map(p => [
      p.name, p.position ?? '', p.number ?? '', p.birth_year ?? '',
      p.matches_played, p.total_minutes, p.total_goals, p.total_assists,
      p.avg_match_rating ?? '', p.attendance_pct ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'spielerliste.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return { players, loading, error, reload: load, create, update, remove, exportCSV }
}
