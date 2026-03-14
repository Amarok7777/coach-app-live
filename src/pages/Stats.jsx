import { useStats } from '../hooks/useStats'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  CartesianGrid, Legend,
} from 'recharts'

const POSITIONS = ['Torwart','Innenverteidiger','Außenverteidiger','Defensives Mittelfeld',
  'Zentrales Mittelfeld','Offensives Mittelfeld','Linksaußen','Rechtsaußen','Stürmer']

export default function Stats() {
  const { players, allPlayers, teamSummary, filter, setFilter, loading, exportCSV, exportPDF } = useStats()

  if (loading) return (
    <div className="p-4 md:p-8 max-w-4xl space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )

  // Charts data
  const topGoals    = [...allPlayers].sort((a,b) => (b.total_goals ?? 0)   - (a.total_goals ?? 0)).slice(0, 10)
  const topAssists  = [...allPlayers].sort((a,b) => (b.total_assists ?? 0) - (a.total_assists ?? 0)).slice(0, 10)
  const attendance  = [...allPlayers]
    .filter(p => p.attendance_pct != null)
    .sort((a,b) => (b.attendance_pct ?? 0) - (a.attendance_pct ?? 0))
    .slice(0, 10)

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-medium text-md-on-surface">Berichte & Statistiken</h1>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-outlined py-2 px-3 text-xs">
            <span className="material-symbols-outlined icon-sm">download</span>CSV
          </button>
          <button onClick={exportPDF} className="btn-outlined py-2 px-3 text-xs">
            <span className="material-symbols-outlined icon-sm">picture_as_pdf</span>PDF
          </button>
        </div>
      </div>

      {/* Team summary */}
      {teamSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Spieler',    value: teamSummary.player_count },
            { label: 'Trainings',  value: teamSummary.session_count },
            { label: 'Spiele',     value: teamSummary.match_count },
            { label: 'Verletzt',   value: teamSummary.active_injuries },
          ].map(s => (
            <div key={s.label} className="card-outlined p-4 text-center">
              <p className="text-2xl font-medium text-md-on-surface">{s.value ?? 0}</p>
              <p className="text-xs text-md-on-surface-variant mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={filter.position} onChange={e => setFilter(f => ({ ...f, position: e.target.value }))}
          className="text-sm rounded-xl border border-md-outline-variant bg-white px-3 py-2 focus:outline-none">
          <option value="">Alle Positionen</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="relative flex-1 min-w-40">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 icon-sm text-md-outline">search</span>
          <input type="text" placeholder="Spieler suchen..." value={filter.player}
            onChange={e => setFilter(f => ({ ...f, player: e.target.value }))}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-md-outline-variant bg-white text-sm focus:outline-none focus:border-md-primary" />
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Goals bar chart */}
        <div className="card-outlined p-4">
          <h3 className="text-sm font-medium text-md-on-surface mb-3">Top-Torschützen</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topGoals} layout="vertical" margin={{ left: 60 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60}
                tickFormatter={v => v.split(' ').at(-1)} />
              <Tooltip formatter={v => [`${v} Tore`]} />
              <Bar dataKey="total_goals" fill="var(--md-primary)" radius={[0,4,4,0]} name="Tore" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance bar chart */}
        <div className="card-outlined p-4">
          <h3 className="text-sm font-medium text-md-on-surface mb-3">Anwesenheitsrate</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attendance} layout="vertical" margin={{ left: 60 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60}
                tickFormatter={v => v.split(' ').at(-1)} />
              <Tooltip formatter={v => [`${v}%`]} />
              <Bar dataKey="attendance_pct" fill="#10b981" radius={[0,4,4,0]} name="Anwesenheit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Player stats table */}
      <div className="card-outlined overflow-hidden">
        <div className="px-4 py-3 border-b border-md-outline-variant flex items-center justify-between">
          <h3 className="text-sm font-medium text-md-on-surface">Spielerstatistiken</h3>
          <span className="text-xs text-md-outline">{players.length} Spieler</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-md-outline-variant bg-md-surface">
                <th className="text-left px-4 py-2.5 font-medium text-md-on-surface-variant whitespace-nowrap">Name</th>
                <th className="text-right px-3 py-2.5 font-medium text-md-on-surface-variant">Sp</th>
                <th className="text-right px-3 py-2.5 font-medium text-md-on-surface-variant">Min</th>
                <th className="text-right px-3 py-2.5 font-medium text-md-on-surface-variant">T</th>
                <th className="text-right px-3 py-2.5 font-medium text-md-on-surface-variant">A</th>
                <th className="text-right px-3 py-2.5 font-medium text-md-on-surface-variant">Rating</th>
                <th className="text-right px-3 py-2.5 font-medium text-md-on-surface-variant">Anw%</th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-md-on-surface-variant">Keine Daten</td></tr>
              ) : players.map((p, i) => (
                <tr key={p.id} className={`${i < players.length - 1 ? 'border-b border-md-outline-variant' : ''} hover:bg-md-surface`}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-md-on-surface">{p.name}</div>
                    {p.position && <div className="text-md-on-surface-variant">{p.position}</div>}
                  </td>
                  <td className="text-right px-3 py-2.5 text-md-on-surface">{p.matches_played ?? 0}</td>
                  <td className="text-right px-3 py-2.5 text-md-on-surface">{p.total_minutes ?? 0}</td>
                  <td className="text-right px-3 py-2.5 font-medium text-md-primary">{p.total_goals ?? 0}</td>
                  <td className="text-right px-3 py-2.5 text-md-on-surface">{p.total_assists ?? 0}</td>
                  <td className="text-right px-3 py-2.5">
                    {p.avg_match_rating ? (
                      <span className={`font-medium ${p.avg_match_rating >= 7 ? 'text-green-600' : p.avg_match_rating >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                        {p.avg_match_rating}★
                      </span>
                    ) : '–'}
                  </td>
                  <td className="text-right px-3 py-2.5">
                    {p.attendance_pct != null ? (
                      <Badge variant={p.attendance_pct >= 75 ? 'success' : p.attendance_pct >= 50 ? 'warning' : 'error'}>
                        {p.attendance_pct}%
                      </Badge>
                    ) : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
