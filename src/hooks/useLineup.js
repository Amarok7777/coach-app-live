import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useLineup() {
    const { user } = useAuth()
    const [plans, setPlans] = useState([])
    const [plan, setPlan] = useState(null)
    const [players, setPlayers] = useState([])
    const [availability, setAvailability] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState(null)
    const [shareToken, setShareToken] = useState(null)

    useEffect(() => { if (user) load() }, [user])

    async function load() {
        setLoading(true)
        try {
            const [plansRes, playersRes] = await Promise.all([
                supabase.from('lineup_plans').select('*').order('updated_at', { ascending: false }),
                supabase.from('player_stats_summary').select('id, name, number, position, avg_match_rating, total_goals, total_assists, matches_played, attendance_pct').order('name'),
            ])
            const allPlans = plansRes.data ?? []
            setPlans(allPlans)
            setPlan(allPlans[0] ?? null)
            setPlayers(playersRes.data ?? [])

            const today = new Date().toISOString().split('T')[0]
            const [{ data: avail }, { data: injuries }] = await Promise.all([
                supabase.from('player_availability')
                    .select('player_id, type').lte('date_from', today).gte('date_to', today),
                supabase.from('injuries').select('player_id').eq('status', 'active'),
            ])
            const map = {}
                ; (avail ?? []).forEach(a => { map[a.player_id] = a.type })
                ; (injuries ?? []).forEach(i => { map[i.player_id] = 'injured' })
            setAvailability(map)
        } finally {
            setLoading(false)
        }
    }

    async function selectPlan(id) {
        const found = plans.find(p => p.id === id)
        if (found) {
            setPlan(found)
            setShareToken(null)
            const { data } = await supabase.from('share_tokens')
                .select('*').eq('lineup_plan_id', id)
                .gte('expires_at', new Date().toISOString()).maybeSingle()
            setShareToken(data ?? null)
        }
    }

    async function createPlan(name = 'Neue Aufstellung') {
        const { data, error } = await supabase.from('lineup_plans')
            .insert({ name, user_id: user.id, assigned: {}, formation: '4-4-2' })
            .select().single()
        if (error) throw error
        const updated = [data, ...plans]
        setPlans(updated)
        setPlan(data)
        setShareToken(null)
        return data
    }

    // Debounced save — avoids hammering Supabase on every drag
    const savePlan = useCallback(async (planId, updates) => {
        if (!planId) return
        setSaving(true)
        setSaveError(null)
        try {
            const { error } = await supabase.from('lineup_plans')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', planId)
            if (error) throw error
            setPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updates } : p))
            setPlan(prev => prev?.id === planId ? { ...prev, ...updates } : prev)
        } catch (e) {
            setSaveError(e.message)
        } finally {
            setSaving(false)
        }
    }, [])

    async function renamePlan(planId, name) {
        await savePlan(planId, { name })
    }

    async function deletePlan(planId) {
        await supabase.from('lineup_plans').delete().eq('id', planId)
        const remaining = plans.filter(p => p.id !== planId)
        setPlans(remaining)
        if (plan?.id === planId) {
            setPlan(remaining[0] ?? null)
            setShareToken(null)
        }
    }

    async function generateShare(planId) {
        const { data, error } = await supabase.from('share_tokens')
            .insert({
                user_id: user.id,
                lineup_plan_id: planId,
                expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
            })
            .select().single()
        if (error) throw error
        setShareToken(data)
        return data
    }

    return {
        plans, plan, players, availability, shareToken,
        loading, saving, saveError,
        selectPlan, createPlan, savePlan, renamePlan, deletePlan, generateShare,
        reload: load,
    }
}