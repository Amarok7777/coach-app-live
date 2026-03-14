import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { startOfMonth, endOfMonth, format, eachDayOfInterval, isSameDay } from 'date-fns'
import { de } from 'date-fns/locale'

export function useAvailability() {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [records, setRecords]   = useState([])
  const [injuries, setInjuries] = useState([])
  const [players, setPlayers]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { load() }, [currentMonth])

  async function load() {
    setLoading(true)
    const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const to   = format(endOfMonth(currentMonth),   'yyyy-MM-dd')

    const [playersRes, availRes, injuriesRes] = await Promise.all([
      supabase.from('players').select('id, name, position, number').order('name'),
      supabase.from('player_availability')
        .select('*, players(name)')
        .gte('date_to', from)
        .lte('date_from', to),
      supabase.from('injuries')
        .select('player_id, injury_date, expected_return, description, players(name)')
        .eq('status', 'active'),
    ])

    setPlayers(playersRes.data ?? [])
    setRecords(availRes.data ?? [])
    setInjuries(injuriesRes.data ?? [])
    setLoading(false)
  }

  async function addRecord(fields) {
    const { error } = await supabase.from('player_availability')
      .insert({ ...fields, user_id: user.id })
    if (error) throw error
    load()
  }

  async function deleteRecord(id) {
    const { error } = await supabase.from('player_availability').delete().eq('id', id)
    if (error) throw error
    load()
  }

  function getDaysInMonth() {
    return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  }

  function getEventsForDay(date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    const avail = records.filter(r => r.date_from <= dateStr && r.date_to >= dateStr)
    const inj   = injuries.filter(i => {
      const injStart = i.injury_date
      const injEnd   = i.expected_return ?? '9999-12-31'
      return injStart <= dateStr && injEnd >= dateStr
    }).map(i => ({ ...i, type: 'injured', player_id: i.player_id }))
    return [...avail, ...inj]
  }

  const prevMonth = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))

  return {
    currentMonth, players, records, injuries, loading,
    getDaysInMonth, getEventsForDay,
    prevMonth, nextMonth,
    addRecord, deleteRecord, reload: load,
  }
}
