import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useStats() {
    const [players, setPlayers] = useState([])
    const [teamSummary, setTeamSummary] = useState(null)
    const [filter, setFilter] = useState({ position: '', player: '' })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        setError(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Nicht angemeldet')

            const [playersRes, summaryRes] = await Promise.all([
                supabase
                    .from('player_stats_summary')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('total_goals', { ascending: false }),

                supabase
                    .from('team_summary')
                    .select('*')
                    .eq('user_id', user.id)
                    .single(),
            ])

            if (playersRes.error) throw playersRes.error
            if (summaryRes.error && summaryRes.error.code !== 'PGRST116') throw summaryRes.error

            setPlayers(playersRes.data ?? [])
            setTeamSummary(summaryRes.data ?? null)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    function filteredPlayers() {
        return players.filter(p => {
            const posOk = !filter.position || p.position === filter.position
            const nameOk = !filter.player || p.name.toLowerCase().includes(filter.player.toLowerCase())
            return posOk && nameOk
        })
    }

    // ── CSV Export ──────────────────────────────────────────────
    function exportCSV() {
        const fp = filteredPlayers()
        if (!fp.length) return

        const headers = [
            'Name', 'Position',
            'Spiele', 'Minuten Spiele',
            'Tore', 'Assists', 'Zu Null',
            'Ø Rating Spiel',
            'Trainings', 'Minuten Training',
            'Ø Rating Training',
            'Anwesenheit Spiele %', 'Anwesenheit Training %',
        ]

        const rows = fp.map(p => [
            p.name,
            p.position ?? '',
            p.matches_played ?? 0,
            p.match_minutes ?? 0,
            p.total_goals ?? 0,
            p.total_assists ?? 0,
            p.clean_sheets ?? 0,
            p.avg_match_rating ?? '',
            p.trainings_attended ?? 0,
            p.training_minutes ?? 0,
            p.avg_training_rating ?? '',
            p.attendance_match_pct != null ? `${p.attendance_match_pct}%` : '',
            p.attendance_training_pct != null ? `${p.attendance_training_pct}%` : '',
        ])

        const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'statistiken.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    // ── PDF Export ──────────────────────────────────────────────
    async function exportPDF() {
        const fp = filteredPlayers()
        if (!fp.length) return

        const { jsPDF } = await import('jspdf')
        const { applyPlugin } = await import('jspdf-autotable')
        applyPlugin(jsPDF)

        const doc = new jsPDF({ orientation: 'landscape' })
        doc.setFontSize(16)
        doc.text('Saisonstatistik', 14, 18)
        doc.setFontSize(10)
        doc.text(`Erstellt: ${new Date().toLocaleDateString('de-DE')}`, 14, 26)

        doc.autoTable({
            startY: 32,
            head: [[
                'Name', 'Pos',
                'Sp', 'Min.Sp',
                'Tore', 'Ass.', 'Z.N.',
                'Rtg.Sp',
                'Train.', 'Min.Tr',
                'Rtg.Tr',
                'Anw.Sp%', 'Anw.Tr%',
            ]],
            body: fp.map(p => [
                p.name,
                p.position ?? '',
                p.matches_played ?? 0,
                p.match_minutes ?? 0,
                p.total_goals ?? 0,
                p.total_assists ?? 0,
                p.clean_sheets ?? 0,
                p.avg_match_rating != null ? `${p.avg_match_rating}★` : '–',
                p.trainings_attended ?? 0,
                p.training_minutes ?? 0,
                p.avg_training_rating != null ? `${p.avg_training_rating}★` : '–',
                p.attendance_match_pct != null ? `${p.attendance_match_pct}%` : '–',
                p.attendance_training_pct != null ? `${p.attendance_training_pct}%` : '–',
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 106, 96] },
            columnStyles: {
                0: { cellWidth: 32 },  // Name
                1: { cellWidth: 12 },  // Pos
            },
        })

        doc.save('statistiken.pdf')
    }

    return {
        players: filteredPlayers(),
        allPlayers: players,
        teamSummary,
        filter,
        setFilter,
        loading,
        error,
        exportCSV,
        exportPDF,
        reload: load,
    }
}