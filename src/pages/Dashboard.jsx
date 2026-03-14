import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'

export default function Dashboard() {
  const { summary, nextEvents, topScorers, recentNotes, activeInjuries, loading, reload } = useDashboard()

  if (loading) return (
    <div className="p-4 md:p-8 max-w-4xl space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  )

  const statCards = [
    { label: 'Spieler',    value: summary?.player_count  ?? 0, icon: 'group',          to: '/players',  },
    { label: 'Trainings',  value: summary?.session_count ?? 0, icon: 'calendar_month', to: '/training', },
    { label: 'Ø-Rating',   value: summary?.avg_rating_recent ?? '–',   icon: 'star', to: '/stats', },
    { label: 'Anwesenheit',value: summary?.attendance_pct_recent ? `${summary.attendance_pct_recent}%` : '–', icon: 'check_circle', to: '/stats', },
    { label: 'Verletzt',   value: summary?.active_injuries ?? 0, icon: 'local_hospital', to: '/injuries', },
    { label: 'Spiele',     value: summary?.match_count ?? 0, icon: 'sports_soccer', to: '/matches', },
  ]

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-md-on-surface">Übersicht</h1>
        <p className="text-sm text-md-on-surface-variant mt-0.5">
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {statCards.map(({ label, value, icon, to }) => (
          <Link key={label} to={to}>
            <div className="card-outlined p-3 md:p-4 hover:shadow-el1 transition-shadow text-center">
              <div className="w-8 h-8 rounded-xl bg-md-primary-container flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-outlined text-md-primary" style={{ fontSize: 16 }}>{icon}</span>
              </div>
              <p className="text-xl font-medium text-md-on-surface">{value}</p>
              <p className="text-xs text-md-on-surface-variant mt-0.5 leading-tight">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Nächste Termine */}
        <div className="card-outlined overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-md-outline-variant">
            <span className="material-symbols-outlined icon-sm text-md-primary">event</span>
            <h2 className="text-sm font-medium text-md-on-surface">Nächste Termine</h2>
          </div>
          {nextEvents.length === 0 ? (
            <div className="py-8 text-center text-md-on-surface-variant text-sm">Keine bevorstehenden Termine</div>
          ) : (
            <ul>
              {nextEvents.map((ev, i) => (
                <li key={`${ev.type}-${ev.id}`}
                    className={`list-item ${i < nextEvents.length - 1 ? 'border-b border-md-outline-variant' : ''}`}>
                  <Badge variant={ev.type === 'match' ? 'error' : 'primary'}>
                    {ev.type === 'match' ? 'Spiel' : 'Training'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-md-on-surface truncate">{ev.title}</p>
                    {ev.detail && <p className="text-xs text-md-on-surface-variant">{ev.detail}</p>}
                  </div>
                  <p className="text-xs text-md-outline shrink-0">
                    {new Date(ev.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top-Torschützen */}
        <div className="card-outlined overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-md-outline-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined icon-sm text-md-primary">emoji_events</span>
              <h2 className="text-sm font-medium text-md-on-surface">Top-Torschützen</h2>
            </div>
            <Link to="/stats" className="btn-text py-1 px-2 text-xs">Alle</Link>
          </div>
          {topScorers.length === 0 ? (
            <div className="py-8 text-center text-md-on-surface-variant text-sm">Noch keine Daten</div>
          ) : (
            <ul>
              {topScorers.map((p, i) => (
                <li key={p.player_id}
                    className={`list-item ${i < topScorers.length - 1 ? 'border-b border-md-outline-variant' : ''}`}>
                  <span className="text-sm font-bold text-md-outline w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-md-on-surface truncate">{p.name}</p>
                    <p className="text-xs text-md-on-surface-variant">{p.position}</p>
                  </div>
                  <div className="flex gap-3 text-xs shrink-0">
                    <span title="Tore" className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-md-primary" style={{ fontSize: 13 }}>sports_soccer</span>
                      {p.goals}
                    </span>
                    <span title="Assists" className="flex items-center gap-0.5 text-md-on-surface-variant">
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>assistant</span>
                      {p.assists}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Aktive Verletzungen */}
        {activeInjuries.length > 0 && (
          <div className="card-outlined overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-md-outline-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined icon-sm text-md-error">local_hospital</span>
                <h2 className="text-sm font-medium text-md-on-surface">Aktive Verletzungen</h2>
              </div>
              <Link to="/injuries" className="btn-text py-1 px-2 text-xs">Alle</Link>
            </div>
            <ul>
              {activeInjuries.map((inj, i) => (
                <li key={inj.id}
                    className={`list-item ${i < activeInjuries.length - 1 ? 'border-b border-md-outline-variant' : ''}`}>
                  <span className="material-symbols-outlined icon-sm text-md-error">healing</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-md-on-surface">{inj.players?.name}</p>
                    <p className="text-xs text-md-on-surface-variant truncate">{inj.description}</p>
                  </div>
                  {inj.expected_return && (
                    <p className="text-xs text-md-outline shrink-0">
                      Rückkehr: {new Date(inj.expected_return).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Letzte Notizen */}
        <div className="card-outlined overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-md-outline-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined icon-sm text-md-primary">history</span>
              <h2 className="text-sm font-medium text-md-on-surface">Letzte Notizen</h2>
            </div>
            <Link to="/players" className="btn-text py-1 px-2 text-xs">Alle</Link>
          </div>
          {recentNotes.length === 0 ? (
            <div className="py-8 text-center text-md-on-surface-variant text-sm">Noch keine Notizen</div>
          ) : (
            <ul>
              {recentNotes.map((note, i) => (
                <li key={note.id}
                    className={`list-item ${i < recentNotes.length - 1 ? 'border-b border-md-outline-variant' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-md-secondary-container flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-md-on-primary-container">
                      {note.players?.name?.charAt(0) ?? '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-md-on-surface">{note.players?.name}</p>
                    <p className="text-sm text-md-on-surface-variant truncate">{note.content}</p>
                  </div>
                  <p className="text-xs text-md-outline shrink-0">
                    {new Date(note.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
