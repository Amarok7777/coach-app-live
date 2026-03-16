import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrainingDetail } from '../hooks/useTrainingDetail'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'

const AVAIL_CONFIG = {
    absent: { variant: 'error', label: 'Abwesend', icon: 'event_busy', dot: 'bg-red-400' },
    vacation: { variant: 'warning', label: 'Urlaub', icon: 'beach_access', dot: 'bg-amber-400' },
    suspended: { variant: 'orange', label: 'Gesperrt', icon: 'block', dot: 'bg-orange-400' },
    injured: { variant: 'error', label: 'Verletzt', icon: 'healing', dot: 'bg-red-500' },
}

function PlayerRow({ player, att, avail, sessionDuration, onToggle, onNote, onRating, onMinutes }) {
    const [showNote, setShowNote] = useState(false)
    const [showMinutes, setShowMinutes] = useState(false)

    const present = att?.present ?? false
    const minutes = att?.minutes ?? null
    const hasCustomMinutes = present && minutes !== null && minutes < sessionDuration
    const availCfg = avail ? AVAIL_CONFIG[avail.type] : null

    return (
        <div className={`border-b border-md-outline-variant/60 last:border-0 transition-colors
      ${present ? 'bg-green-50/40' : 'opacity-80'}`}>

            {/* Main tap row */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none active:bg-md-on-surface/4"
                onClick={() => onToggle(player.id)}
            >
                {/* Toggle circle */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all
          ${present ? 'bg-green-500 shadow-sm shadow-green-200' : 'bg-md-outline-variant/25 border border-md-outline-variant/50'}`}>
                    <span className={`material-symbols-outlined transition-all`}
                        style={{ fontSize: 18, color: present ? 'white' : 'var(--md-outline)' }}>
                        {present ? 'check' : 'close'}
                    </span>
                </div>

                {/* Jersey number */}
                {player.number && (
                    <span className="text-xs font-black text-md-outline/40 w-5 shrink-0 tabular-nums text-center"
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        {player.number}
                    </span>
                )}

                {/* Name + badges */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-md-on-surface"
                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                            {player.name}
                        </p>
                        {availCfg && (
                            <span className={`flex items-center gap-1 text-xs font-medium px-1.5 py-px rounded-md`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${availCfg.dot}`} />
                                <Badge variant={availCfg.variant}>{availCfg.label}</Badge>
                            </span>
                        )}
                        {hasCustomMinutes && (
                            <span className="text-xs font-medium px-1.5 py-px rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                {minutes}'
                            </span>
                        )}
                    </div>
                    {player.position && (
                        <p className="text-xs text-md-outline mt-0.5">{player.position}</p>
                    )}
                </div>

                {/* Rating — only when present */}
                {present && (
                    <select
                        value={att?.rating ?? ''}
                        onChange={e => { e.stopPropagation(); onRating(player.id, e.target.value || null) }}
                        onClick={e => e.stopPropagation()}
                        className="text-xs border border-md-outline-variant rounded-lg px-2 py-1.5 bg-white w-20
              focus:outline-none focus:border-md-primary shrink-0"
                    >
                        <option value="">Note</option>
                        {[...Array(10)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1} ★</option>
                        ))}
                    </select>
                )}

                {/* Minutes button */}
                {present && (
                    <button
                        onClick={e => { e.stopPropagation(); setShowMinutes(s => !s) }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0
              ${hasCustomMinutes
                                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                : 'text-md-outline/50 hover:bg-md-surface hover:text-md-outline'}`}
                        title="Minuten anpassen"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>timer</span>
                    </button>
                )}

                {/* Note button */}
                <button
                    onClick={e => { e.stopPropagation(); setShowNote(s => !s) }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0
            ${att?.note
                            ? 'bg-md-primary-container text-md-primary'
                            : 'text-md-outline/50 hover:bg-md-surface hover:text-md-outline'}`}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                        {att?.note ? 'sticky_note_2' : 'note_add'}
                    </span>
                </button>
            </div>

            {/* Minutes panel */}
            {showMinutes && present && (
                <div className="mx-4 mb-3 flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                    <span className="material-symbols-outlined text-amber-600" style={{ fontSize: 16 }}>timer</span>
                    <span className="text-xs text-amber-800 font-medium w-20 shrink-0">Minuten:</span>
                    <input
                        type="number" min="1" max={sessionDuration}
                        placeholder={String(sessionDuration)}
                        value={att?.minutes ?? ''}
                        onChange={e => onMinutes(player.id, e.target.value ? parseInt(e.target.value) : null)}
                        className="w-20 text-sm border border-amber-200 rounded-xl px-3 py-1.5
              focus:outline-none focus:border-amber-400 bg-white text-center tabular-nums"
                        autoFocus
                    />
                    <span className="text-xs text-amber-700">/ {sessionDuration}'</span>
                    {att?.minutes != null && (
                        <button onClick={() => onMinutes(player.id, null)}
                            className="text-xs text-amber-600 hover:text-red-600 ml-auto transition-colors">
                            Zurücksetzen
                        </button>
                    )}
                </div>
            )}

            {/* Note panel */}
            {showNote && (
                <div className="mx-4 mb-3">
                    <input
                        type="text"
                        placeholder="Notiz zum Spieler…"
                        value={att?.note ?? ''}
                        onChange={e => { e.stopPropagation(); onNote(player.id, e.target.value) }}
                        className="w-full text-sm border border-md-outline-variant rounded-xl px-3 py-2
              focus:outline-none focus:border-md-primary bg-white"
                        autoFocus
                    />
                </div>
            )}

            {/* Note preview — when note exists but editor is closed */}
            {att?.note && !showNote && (
                <div className="mx-4 mb-3">
                    <div className="text-xs text-md-on-surface bg-md-primary-container/30
            border-l-2 border-md-primary px-3 py-2 rounded-r-xl break-words">
                        {att.note}
                    </div>
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
            <Skeleton className="h-24 rounded-2xl" />
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-[60px] rounded-none first:rounded-t-xl last:rounded-b-xl" />)}
        </div>
    )

    const sessionDuration = session?.duration_min ?? 90
    const presentCount = players.filter(p => attendance[p.id]?.present).length
    const totalMinutes = players.reduce((sum, p) => {
        const att = attendance[p.id]
        if (!att?.present) return sum
        return sum + (att.minutes ?? sessionDuration)
    }, 0)

    const sorted = [...players]
        .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            const na = parseInt(a.number) || 0
            const nb = parseInt(b.number) || 0
            return na !== nb ? na - nb : a.name.localeCompare(b.name)
        })

    // Attendance pct
    const pct = players.length > 0 ? Math.round((presentCount / players.length) * 100) : 0
    const pctColor = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'

    return (
        <div className="p-4 md:p-8 max-w-2xl">
            <button onClick={() => navigate('/training')} className="btn-text px-0 mb-4 text-md-primary">
                <span className="material-symbols-outlined icon-sm">arrow_back</span>
                Alle Trainings
            </button>

            {/* Session header card */}
            <div className="card-outlined p-4 mb-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-md-on-surface"
                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                            {session?.title || 'Training'}
                        </h1>
                        <p className="text-sm text-md-outline mt-0.5">
                            {session?.date && new Date(session.date).toLocaleDateString('de-DE', {
                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                            })}
                            {session?.type && ` · ${session.type}`}
                            {` · ${sessionDuration} Min.`}
                        </p>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium shrink-0
            ${isOnline ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                            {isOnline ? 'wifi' : 'wifi_off'}
                        </span>
                        {isOnline ? 'Online' : 'Offline'}
                    </div>
                </div>

                {/* Attendance bar + stats */}
                <div className="mt-4 pt-3 border-t border-md-outline-variant/60">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-md-on-surface-variant">Anwesenheit</span>
                        <span className="text-xs font-bold tabular-nums text-md-on-surface"
                            style={{ fontFamily: "'DM Mono', monospace" }}>
                            {presentCount}/{players.length} · {pct}%
                        </span>
                    </div>
                    <div className="h-2 bg-md-outline-variant/20 rounded-full overflow-hidden mb-3">
                        <div className={`h-full rounded-full transition-all ${pctColor}`}
                            style={{ width: `${pct}%` }} />
                    </div>

                    <div className="flex items-center gap-4 flex-wrap text-xs text-md-outline">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            {presentCount} anwesend
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-md-outline-variant/40" />
                            {players.length - presentCount} abwesend
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                            {totalMinutes} Min. gesamt
                        </span>

                        <div className="ml-auto">
                            {dirty ? (
                                <button onClick={sync} disabled={syncing || !isOnline}
                                    className={`btn-filled py-1.5 px-3 text-xs ${!isOnline ? 'opacity-50' : ''}`}>
                                    {syncing
                                        ? <span className="material-symbols-outlined icon-sm animate-spin">progress_activity</span>
                                        : <span className="material-symbols-outlined icon-sm">sync</span>
                                    }
                                    {isOnline ? 'Speichern' : 'Offline…'}
                                </button>
                            ) : (
                                <span className="flex items-center gap-1 text-green-600 font-medium">
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                                    Gespeichert
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Search + hint */}
            <div className="relative mb-2">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 icon-sm text-md-outline">
                    search
                </span>
                <input
                    type="text" placeholder="Spieler suchen…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-md-outline-variant
            bg-white text-sm focus:outline-none focus:border-md-primary"
                />
            </div>
            <p className="text-xs text-md-outline mb-3 px-1 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white" style={{ fontSize: 10 }}>check</span>
                    </span>
                    Tippen = Anwesenheit
                </span>
                <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-amber-500" style={{ fontSize: 14 }}>timer</span>
                    Minuten
                </span>
                <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-md-primary" style={{ fontSize: 14 }}>note_add</span>
                    Notiz
                </span>
            </p>

            {/* Player list */}
            <div className="card-outlined overflow-hidden">
                {/* Sticky header */}
                <div className="px-4 py-2 bg-md-surface/80 border-b border-md-outline-variant/60
          flex items-center justify-between sticky top-0 z-10">
                    <span className="text-xs font-bold text-md-on-surface-variant uppercase tracking-widest">
                        Spieler
                    </span>
                    <div className="flex items-center gap-3 text-xs text-md-outline">
                        <span>Note</span>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>timer</span>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>note_add</span>
                    </div>
                </div>

                {sorted.length === 0 ? (
                    <div className="py-12 text-center text-sm text-md-on-surface-variant">
                        Kein Spieler gefunden
                    </div>
                ) : (
                    sorted.map(p => (
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