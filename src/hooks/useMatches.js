import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useMatches() {
  const { user } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('match_days')
      .select('*')
      .order('date', { ascending: false })
    if (error) setError(error.message)
    else setMatches(data ?? [])
    setLoading(false)
  }

  async function create(fields) {
    const { error } = await supabase.from('match_days').insert({ ...fields, user_id: user.id })
    if (error) throw error
    await load()
  }

  async function remove(id) {
    const { error } = await supabase.from('match_days').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  return { matches, loading, error, reload: load, create, remove }
}
