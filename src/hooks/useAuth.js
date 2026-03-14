import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser]     = useState(null)
  const [role, setRole]     = useState(null)   // 'head_coach' | 'assistant_coach' | 'manager' | null
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadRole(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadRole(session.user.id)
      else { setRole(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadRole(uid) {
    // head_coach = user owns their own data; also check team_members for delegated roles
    const { data } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', uid)
      .maybeSingle()
    // If no team_members record → this user IS the head coach of their own data
    setRole(data?.role ?? 'head_coach')
    setLoading(false)
  }

  const signIn  = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp  = (email, password) => supabase.auth.signUp({ email, password })
  const signOut = () => supabase.auth.signOut()

  const isHeadCoach = role === 'head_coach'
  const canEdit     = role === 'head_coach' || role === 'assistant_coach'

  return { user, loading, role, isHeadCoach, canEdit, signIn, signUp, signOut }
}
