import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useInjuries() {
  const { user } = useAuth()
  const [injuries, setInjuries] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('injuries')
      .select('*, players(id, name, position, number)')
      .order('injury_date', { ascending: false })
    if (error) setError(error.message)
    else setInjuries(data ?? [])
    setLoading(false)
  }

  async function create(fields) {
    const { error } = await supabase.from('injuries').insert({ ...fields, user_id: user.id })
    if (error) throw error
    await load()
  }

  async function update(id, fields) {
    const { error } = await supabase.from('injuries').update(fields).eq('id', id)
    if (error) throw error
    await load()
  }

  async function recover(id) {
    await update(id, { status: 'recovered' })
  }

  return { injuries, loading, error, reload: load, create, update, recover }
}
