import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useTraining() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('training_sessions')
      .select('*, training_attendance(count)')
      .order('date', { ascending: false })
    if (error) setError(error.message)
    else setSessions(data ?? [])
    setLoading(false)
  }

  async function create(fields) {
    const { error } = await supabase.from('training_sessions').insert({ ...fields, user_id: user.id })
    if (error) throw error
    await load()
  }

  async function remove(id) {
    const { error } = await supabase.from('training_sessions').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  return { sessions, loading, error, reload: load, create, remove }
}
