import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useLineup() {
  const { user } = useAuth()
  const [plans, setPlans]     = useState([])
  const [plan, setPlan]       = useState(null)
  const [players, setPlayers] = useState([])
  const [availability, setAvailability] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [shareToken, setShareToken] = useState(null)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const [plansRes, playersRes] = await Promise.all([
      supabase.from('lineup_plans').select('*').order('updated_at', { ascending: false }),
      supabase.from('players').select('id, name, number, position').order('name'),
    ])
    const allPlans = plansRes.data ?? []
    setPlans(allPlans)
    setPlan(allPlans[0] ?? null)
    setPlayers(playersRes.data ?? [])

    // Availability for today
    const today = new Date().toISOString().split('T')[0]
    const { data: avail }    = await supabase.from('player_availability')
      .select('player_id, type').lte('date_from', today).gte('date_to', today)
    const { data: injuries } = await supabase.from('injuries')
      .select('player_id').eq('status', 'active')
    const map = {}
    ;(avail    ?? []).forEach(a => { map[a.player_id] = a.type })
    ;(injuries ?? []).forEach(i => { map[i.player_id] = 'injured' })
    setAvailability(map)

    setLoading(false)
  }

  async function selectPlan(id) {
    const p = plans.find(pl => pl.id === id)
    setPlan(p ?? null)
    const { data } = await supabase.from('share_tokens')
      .select('*').eq('lineup_plan_id', id)
      .gte('expires_at', new Date().toISOString()).maybeSingle()
    setShareToken(data ?? null)
  }

  async function createPlan(name = 'Neue Aufstellung') {
    const { data, error } = await supabase.from('lineup_plans')
      .insert({ name, user_id: user.id }).select().single()
    if (error) throw error
    await load()
    setPlan(data)
    return data
  }

  async function savePlan(updates) {
    if (!plan) return
    setSaving(true)
    const { error } = await supabase.from('lineup_plans')
      .update(updates).eq('id', plan.id)
    if (error) throw error
    // Update local plans list too
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, ...updates } : p))
    setPlan(p => ({ ...p, ...updates }))
    setSaving(false)
  }

  async function renamePlan(name) {
    await savePlan({ name })
  }

  async function generateShare() {
    if (!plan) return
    const { data, error } = await supabase.from('share_tokens')
      .insert({
        user_id: user.id,
        lineup_plan_id: plan.id,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .select().single()
    if (error) throw error
    setShareToken(data)
    return data
  }

  return {
    plans, plan, players, availability, shareToken,
    loading, saving,
    selectPlan, createPlan, savePlan, renamePlan, generateShare, reload: load,
  }
}
