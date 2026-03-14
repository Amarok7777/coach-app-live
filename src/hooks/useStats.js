import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useStats() {
  const [players, setPlayers]       = useState([])
  const [teamSummary, setTeamSummary] = useState(null)
  const [filter, setFilter]         = useState({ period: '90', position: '', player: '' })
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => { load() }, [filter.period])

  async function load() {
    setLoading(true)
    try {
      const [playersRes, summaryRes] = await Promise.all([
        supabase.from('player_stats_summary').select('*').order('total_goals', { ascending: false }),
        supabase.rpc('team_dashboard_summary'),
      ])
      if (playersRes.error) throw playersRes.error
      setPlayers(playersRes.data ?? [])
      setTeamSummary(summaryRes.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function filteredPlayers() {
    return players.filter(p => {
      const posOk    = !filter.position || p.position === filter.position
      const nameOk   = !filter.player   || p.name.toLowerCase().includes(filter.player.toLowerCase())
      return posOk && nameOk
    })
  }

  function exportCSV() {
    const fp = filteredPlayers()
    if (!fp.length) return
    const headers = ['Name','Position','Spiele','Minuten','Tore','Assists','Ø-Rating Match','Anwesenheit%']
    const rows = fp.map(p => [
      p.name, p.position ?? '',
      p.matches_played, p.total_minutes, p.total_goals, p.total_assists,
      p.avg_match_rating ?? '', p.attendance_pct ?? '',
    ])
    const csv  = [headers, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'statistiken.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function exportPDF() {
    const fp = filteredPlayers()
    // jspdf@3: named export; jspdf-autotable@5 is built into jspdf@3
    const { jsPDF } = await import('jspdf')
    const { applyPlugin } = await import('jspdf-autotable')
    applyPlugin(jsPDF)
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Saisonstatistik', 14, 18)
    doc.setFontSize(10)
    doc.text(`Erstellt: ${new Date().toLocaleDateString('de-DE')}`, 14, 26)
    autoTable(doc, {
      startY: 32,
      head: [['Name','Pos','Sp','Min','Tore','A','Rating','Anw%']],
      body: fp.map(p => [
        p.name, p.position ?? '',
        p.matches_played, p.total_minutes, p.total_goals, p.total_assists,
        p.avg_match_rating ?? '–', p.attendance_pct != null ? `${p.attendance_pct}%` : '–',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 133, 244] },
    })
    doc.save('statistiken.pdf')
  }

  return {
    players: filteredPlayers(), allPlayers: players, teamSummary,
    filter, setFilter,
    loading, error,
    exportCSV, exportPDF, reload: load,
  }
}
