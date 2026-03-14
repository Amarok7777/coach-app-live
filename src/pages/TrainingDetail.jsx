import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrainingDetail } from '../hooks/useTrainingDetail'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'

const AVAIL_BADGE = {
  absent:    { variant: 'error',   label: 'Abwesend' },
  vacation:  { variant: 'warning', label: 'Urlaub' },
  suspended: { variant: 'orange',  label: 'Gesperrt' },
  injured:   { variant: 'error',   label: 'Verletzt' },
}

function PlayerRow({ player, att, avail, sessionDuration, onToggle, onNote, onRating, onMinutes }) {
  const [showNote, setShowNote]     = useState(false)
  const [showMinutes, setShowMinutes] = useState(false)
  const availInfo = avail ? AVAIL_BADGE[avail.type] : null
  const present   = att?.present ?? false
  const minutes   = att?.minutes ?? null
  // Show reduced minutes hint when custom minutes set
  const hasCustomMinutes = present && minutes !== null && minutes < sessionDuration

  return (
    <div className={`border-b border-md-outline-variant last:border-0 transition-colors ${present ? 'bg-green-50/60' : ''}`}>
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none active:bg-md-on-surface/4"
        onClick={() => onToggle(player.id)}
      >
        {/* Toggle indicator */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors
          ${present ? 'bg-green-500' : 'bg-md-outline-variant/30'}`}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>
            {present ? 'check' : 'close'}
          </span>
        </div>

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-md-on-surface">{player.name}</p>
            {player.number && <span className="text-xs text-md-outline">#{player.number}</span>}
            {availInfo && <Badge variant={availInfo.variant}>{availInfo.label}</Badge>}
            {hasCustomMinutes && (
              <Badge variant="warning">{minutes} Min.</Badge>
            )}
          </div>
          {player.position && <p className="text-xs text-md-on-surface-variant">{player.position}</p>}
        </div>

        {/* Rating */}
        {present && (
          <select
            value={att?.rating ?? ''}
            onChange={e => { e.stopPropagation(); onRating(player.id, e.target.value || null) }}
            onClick={e => e.stopPropagation()}
            className="text-xs border border-md-outline-variant rounded-lg px-2 py-1 bg-white w-20"
          >
            <option value="">Kein</option>
            {[...Array(10)].map((_, i) => (
              <option key={i+1} value={i+1}>{i+1} ★</option>
            ))}
          </select>
        )}

        {/* Minutes toggle — only when present */}
        {present && (
          <button
            onClick={e => { e.stopPropagation(); setShowMinutes(s => !s) }}
            className={`btn-icon w-7 h-7 ${hasCustomMinutes ? 'text-amber-500' : 'text-md-outline'}`}
            title="Trainingsminuten setzen"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>timer</span>
          </button>
        )}

        {/* Note toggle */}
        <button
          onClick={e => { e.stopPropagation(); setShowNote(s => !s) }}
          className={`btn-icon w-7 h-7 ${att?.note ? 'text-md-primary' : 'text-md-outline'}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {att?.note ? 'sticky_note_2' : 'note_add'}
          </span>
        </button>
      </div>

      {/* Minutes input */}
      {showMinutes && present && (
        <div className="px-4 pb-3 flex items-center gap-3">
          <span className="material-symbols-outlined icon-sm text-md-outline">timer</span>
          <span className="text-xs text-md-on-surface-variant">Minuten:</span>
          <input
            type="number"
            min="1"
            max={sessionDuration}
            placeholder={String(sessionDuration)}
            value={att?.minutes ?? ''}
            onChange={e => onMinutes(player.id, e.target.value ? parseInt(e.target.value) : null)}
            className="w-20 text-sm border border-md-outline-variant rounded-xl px-3 py-1.5 focus:outline-none focus:border-md-primary bg-white"
            autoFocus
          />
          <span className="text-xs text-md-on-surface-variant">/ {sessionDuration} Min.</span>
          {att?.minutes !== null && (
            <button
              onClick={() => onMinutes(player.id, null)}
              className="text-xs text-md-outline hover:text-md-error"
            >
              Zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Note input */}
      {showNote && (
        <div className="px-4 pb-3">
          <input
            type="text"
            placeholder="Kurze Notiz..."
            value={att?.note ?? ''}
            onChange={e => onNote(player.id, e.target.value)}
            className="w-full text-sm border border-md-outline-variant rounded-xl px-3 py-2 focus:outline-none focus:border-md-primary bg-white"
            autoFocus
          />
        </div>
      )}
    </div>
  )
}

export default function TrainingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    session, players, attendance, availability,
    loading, syncing, isOnline, dirty,
    togglePresent, setNote, setRating, setMinutes, sync,
  } = useTrainingDetail(id)

  const [search, setSearch] = useState('')

  if (loading) return (
    <div className="p-4 md:p-8 max-w-2xl space-y-3">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-20 rounded-2xl" />
      {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
    </div>
  )

  const sessionDuration = session?.duration_min ?? 90
  const presentCount    = players.filter(p => attendance[p.id]?.present).length
  const totalMinutes    = players.reduce((sum, p) => {
    const att = attendance[p.id]
    if (!att?.present) return sum
    return sum + (att.minutes ?? sessionDuration)
  }, 0)

  const filtered = players.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <button onClick={() => navigate('/training')} className="btn-text px-0 mb-4 text-md-primary">
        <span className="material-symbols-outlined icon-sm">arrow_back</span>
        Alle Trainings
      </button>

      {/* Session info */}
      <div className="card-outlined p-4 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-medium text-md-on-surface">{session?.title || 'Training'}</h1>
            <p className="text-sm text-md-on-surface-variant mt-0.5">
              {session?.date && new Date(session.date).toLocaleDateString('de-DE', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
              {` · ${sessionDuration} Min.`}
              {session?.type && ` · ${session.type}`}
            </p>
          </div>
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full
            ${isOnline ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
              {isOnline ? 'wifi' : 'wifi_off'}
            </span>
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-md-outline-variant flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-md-on-surface">{presentCount} anwesend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-md-outline-variant/40" />
            <span className="text-sm text-md-on-surface-variant">{players.length - presentCount} abwesend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined icon-sm text-md-outline">schedule</span>
            <span className="text-sm text-md-on-surface-variant">{totalMinutes} Gesamtminuten</span>
          </div>
          <div className="ml-auto">
            {dirty && (
              <button
                onClick={sync}
                disabled={syncing || !isOnline}
                className={`btn-filled py-1.5 px-3 text-xs ${!isOnline ? 'opacity-50' : ''}`}
              >
                {syncing
                  ? <span className="material-symbols-outlined icon-sm animate-spin">progress_activity</span>
                  : <span className="material-symbols-outlined icon-sm">sync</span>
                }
                {isOnline ? 'Speichern' : 'Offline…'}
              </button>
            )}
            {!dirty && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                Gespeichert
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-2">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 icon-sm text-md-outline">search</span>
        <input
          type="text"
          placeholder="Spieler suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-md-outline-variant bg-white text-sm focus:outline-none focus:border-md-primary"
        />
      </div>
      <p className="text-xs text-md-on-surface-variant mb-3 px-1">
        Tippen = Anwesenheit · <span className="material-symbols-outlined" style={{fontSize:12,verticalAlign:'middle'}}>timer</span> = Minuten setzen · <span className="material-symbols-outlined" style={{fontSize:12,verticalAlign:'middle'}}>note_add</span> = Notiz
      </p>

      {/* Player list */}
      <div className="card-outlined overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-md-on-surface-variant">Kein Spieler gefunden</div>
        ) : (
          filtered.map(p => (
            <PlayerRow
              key={p.id}
              player={p}
              att={attendance[p.id]}
              avail={availability[p.id]}
              sessionDuration={sessionDuration}
              onToggle={togglePresent}
              onNote={setNote}
              onRating={setRating}
              onMinutes={setMinutes}
            />
          ))
        )}
      </div>
    </div>
  )
}
