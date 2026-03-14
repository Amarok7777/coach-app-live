import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useAdmin() {
  const { user } = useAuth()
  const [auditLog, setAuditLog] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [consents, setConsents]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [auditFilter, setAuditFilter] = useState({ table: '', action: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [auditRes, membersRes, consentsRes] = await Promise.all([
      supabase.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(100),
      supabase.from('team_members').select('*'),
      supabase.from('consent_records')
        .select('*, players(name)')
        .order('granted_at', { ascending: false }),
    ])
    setAuditLog(auditRes.data ?? [])
    setTeamMembers(membersRes.data ?? [])
    setConsents(consentsRes.data ?? [])
    setLoading(false)
  }

  async function exportAllData() {
    // Fetch all tables for this user
    const tables = ['players','training_sessions','training_attendance','match_days','match_attendance',
                    'notes','injuries','player_availability','consent_records']
    const results = {}
    for (const t of tables) {
      const { data } = await supabase.from(t).select('*')
      results[t] = data ?? []
    }

    // Export as JSON (ZIP would require a library — simplified here)
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `vereinsdaten_${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function filteredAuditLog() {
    return auditLog.filter(e => {
      const tableOk  = !auditFilter.table  || e.table_name === auditFilter.table
      const actionOk = !auditFilter.action || e.action === auditFilter.action
      return tableOk && actionOk
    })
  }

  return {
    auditLog: filteredAuditLog(), teamMembers, consents,
    loading, auditFilter, setAuditFilter,
    reload: load, exportAllData,
  }
}
