import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMatches } from '../hooks/useMatches'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'

const EMPTY = { date: '', opponent: '', home_away: 'Heim' }

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

// Result badge styling
function resultStyle(won, draw, played) {
    if (!played) return { label: '–', color: 'text-md-outline', bg: 'bg-gray-50', border: 'border-gray-200' }
    if (won) return { label: 'S', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' }
    if (draw) return { label: 'U', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' }
    return { label: 'N', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' }
}

function MatchRow({ match: m, index, total, canEdit, onEdit, onDelete }) {
    const d = new Date(m.date)
    const day = d.getDate()
    const wd = WEEKDAYS[d.getDay()]
    const played = m.score_own !== null && m.score_opp !== null
    const won = played && m.score_own > m.score_opp
    const draw = played && m.score_own === m.score_opp
    const result = resultStyle(won, draw, played)
    const isHome = m.home_away === 'Heim'
    const isToday = m.date === new Date().toISOString().split('T')[0]

    return (
        <div
            className={`group relative flex items-center gap-4 px-4 py-3 bg-white
        transition-all duration-150
        ${index < total - 1 ? 'border-b border-md-outline-variant/60' : ''}
      `}
            style={{ borderLeft: '3px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.borderLeftColor = played
                ? (won ? '#16a34a' : draw ? '#d97706' : '#dc2626')
                : '#006A60'}
            onMouseLeave={e => e.currentTarget.style.borderLeftColor = 'transparent'}
        >
            {/* Clickable area — navigates to detail */}
            <Link
                to={`/matches/${m.id}`}
                className="absolute inset-0"
                tabIndex={-1}
                aria-hidden="true"
            />

            {/* Date tile */}
            <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border relative z-10 pointer-events-none
        ${isToday ? 'bg-md-primary border-md-primary' : 'bg-md-surface border-md-outline-variant/60'}`}>
                <span className={`text-sm font-black leading-none tabular-nums
          ${isToday ? 'text-white' : 'text-md-on-surface'}`}
                    style={{ fontFamily: "'DM Mono', monospace" }}>
                    {String(day).padStart(2, '0')}
                </span>
                <span className={`text-xs leading-none mt-0.5 font-medium
          ${isToday ? 'text-white/80' : 'text-md-outline'}`}>
                    {wd}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 relative z-10 pointer-events-none">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-md-on-surface truncate"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        {m.opponent}
                    </p>
                    {/* Home/Away pill */}
                    <span className={`text-xs font-medium px-1.5 py-px rounded-md border
            ${isHome
                            ? 'bg-md-primary-container text-md-primary border-md-primary/20'
                            : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {isHome ? 'Heim' : 'Auswärts'}
                    </span>
                    {isToday && (
                        <span className="text-xs font-medium px-1.5 py-px rounded-md bg-md-primary text-white">Heute</span>
                    )}
                </div>

                {/* Score or date string */}
                {played ? (
                    <p className={`text-sm font-bold mt-0.5 tabular-nums ${result.color}`}
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        {m.score_own} : {m.score_opp}
                        <span className="text-xs font-medium ml-2 opacity-70">
                            {won ? 'Sieg' : draw ? 'Unentschieden' : 'Niederlage'}
                        </span>
                    </p>
                ) : (
                    <p className="text-xs text-md-outline mt-0.5">
                        {d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                )}
            </div>

            {/* Result badge */}
            {played && (
                <div className={`relative z-10 w-8 h-8 rounded-lg border flex items-center justify-center shrink-0
          font-black text-sm pointer-events-none ${result.bg} ${result.color} ${result.border}`}
                    style={{ fontFamily: "'DM Mono', monospace" }}>
                    {result.label}
                </div>
            )}

            {/* Action buttons — appear on hover, only for canEdit */}
            {canEdit && (
                <div
                    className="relative z-10 flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(m) }}
                        className="btn-icon w-8 h-8 hover:bg-md-primary/10 hover:text-md-primary"
                        title="Bearbeiten"
                    >
                        <span className="material-symbols-outlined icon-sm">edit</span>
                    </button>
                    <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(e, m.id) }}
                        className="btn-icon w-8 h-8 hover:bg-red-50 hover:text-red-600"
                        title="Löschen"
                    >
                        <span className="material-symbols-outlined icon-sm">delete</span>
                    </button>
                </div>
            )}

            {/* Chevron */}
            {!canEdit && (
                <span className="relative z-10 material-symbols-outlined icon-sm text-md-outline/40
          group-hover:text-md-primary group-hover:translate-x-0.5 transition-all shrink-0 pointer-events-none">
                    chevron_right
                </span>
            )}
            {canEdit && (
                <span className="relative z-10 material-symbols-outlined icon-sm text-md-outline/30 shrink-0
          group-hover:opacity-0 transition-opacity pointer-events-none">
                    chevron_right
                </span>
            )}
        </div>
    )
}

export default function Matches() {
    const { canEdit } = useAuth()
    const { matches, loading, create, update, remove } = useMatches()
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(EMPTY)
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState(null)

    function openEdit(m) {
        setForm({
            id: m.id,
            date: m.date ?? '',
            opponent: m.opponent ?? '',
            home_away: m.home_away ?? 'Heim',
        })
        setShowForm(true)
    }

    async function handleDelete(e, id) {
        e.preventDefault(); e.stopPropagation()
        if (!confirm('Spieltag wirklich löschen?')) return
        try { await remove(id) } catch (error) { alert(error.message || 'Fehler beim Löschen') }
    }

    async function handleSave(e) {
        e.preventDefault()
        setSaving(true); setErr(null)
        try {
            const fields = { date: form.date, opponent: form.opponent, home_away: form.home_away }
            if (form.id) await update(form.id, fields)
            else await create(fields)
            setShowForm(false); setForm(EMPTY)
        } catch (e) { setErr(e.message) }
        finally { setSaving(false) }
    }

    if (loading) return (
        <div className="p-4 md:p-8 max-w-3xl space-y-3">
            <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-9 w-20 rounded-xl" />
            </div>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[60px] rounded-none first:rounded-t-xl last:rounded-b-xl" />)}
        </div>
    )

    const upcoming = matches.filter(m => new Date(m.date) >= new Date(new Date().toDateString()))
    const past = matches.filter(m => new Date(m.date) < new Date(new Date().toDateString()))

    // Win/draw/loss stats
    const played = past.filter(m => m.score_own !== null)
    const wins = played.filter(m => m.score_own > m.score_opp).length
    const draws = played.filter(m => m.score_own === m.score_opp).length
    const losses = played.filter(m => m.score_own < m.score_opp).length

    return (
        <div className="p-4 md:p-8 max-w-3xl">

            {/* Header */}
            <div className="flex items-start justify-between mb-5 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-md-on-surface tracking-tight"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        Spieltage
                    </h1>
                    <p className="text-sm text-md-outline mt-0.5">
                        {matches.length} Spiele
                        {played.length > 0 && ` · ${played.length} gespielt`}
                    </p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => { setForm(EMPTY); setShowForm(true) }}
                        className="btn-filled py-2 px-4 text-xs shrink-0"
                    >
                        <span className="material-symbols-outlined icon-sm">add</span>
                        Spieltag
                    </button>
                )}
            </div>

            {/* Season stats bar */}
            {played.length > 0 && (
                <div className="card-outlined p-4 mb-5 flex items-center gap-6">
                    <div className="flex-1">
                        <p className="text-xs font-bold text-md-on-surface-variant uppercase tracking-widest mb-2">Bilanz</p>
                        {/* W-D-L bar */}
                        <div className="flex h-2 rounded-full overflow-hidden gap-px">
                            {wins > 0 && <div className="bg-green-500 transition-all" style={{ flex: wins }} />}
                            {draws > 0 && <div className="bg-amber-400 transition-all" style={{ flex: draws }} />}
                            {losses > 0 && <div className="bg-red-400 transition-all" style={{ flex: losses }} />}
                        </div>
                    </div>
                    {[
                        { label: 'S', value: wins, color: 'text-green-600' },
                        { label: 'U', value: draws, color: 'text-amber-600' },
                        { label: 'N', value: losses, color: 'text-red-600' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="text-center shrink-0">
                            <p className={`text-xl font-black tabular-nums leading-none ${color}`}
                                style={{ fontFamily: "'DM Mono', monospace" }}>
                                {value}
                            </p>
                            <p className="text-xs text-md-outline mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {matches.length === 0 && (
                <div className="card-outlined flex flex-col items-center py-20 text-md-on-surface-variant">
                    <div className="w-16 h-16 rounded-2xl bg-md-surface-variant flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-md-outline" style={{ fontSize: 32 }}>
                            sports_soccer
                        </span>
                    </div>
                    <p className="text-sm font-semibold text-md-on-surface">Noch keine Spieltage</p>
                    <p className="text-xs text-md-outline mt-1">Trage das erste Spiel ein</p>
                </div>
            )}

            <div className="space-y-5">
                {upcoming.length > 0 && (
                    <div>
                        <div className="flex items-center gap-3 mb-2 px-1">
                            <h2 className="text-xs font-bold text-md-on-surface-variant uppercase tracking-widest">Bevorstehend</h2>
                            <div className="flex-1 h-px bg-md-outline-variant/40" />
                            <span className="text-xs text-md-outline tabular-nums">{upcoming.length}</span>
                        </div>
                        <div className="card-outlined overflow-hidden">
                            {upcoming.map((m, i) => (
                                <MatchRow
                                    key={m.id}
                                    match={m}
                                    index={i}
                                    total={upcoming.length}
                                    canEdit={canEdit}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {past.length > 0 && (
                    <div>
                        <div className="flex items-center gap-3 mb-2 px-1">
                            <h2 className="text-xs font-bold text-md-on-surface-variant uppercase tracking-widest">Gespielt</h2>
                            <div className="flex-1 h-px bg-md-outline-variant/40" />
                            <span className="text-xs text-md-outline tabular-nums">{past.length}</span>
                        </div>
                        <div className="card-outlined overflow-hidden">
                            {past.map((m, i) => (
                                <MatchRow
                                    key={m.id}
                                    match={m}
                                    index={i}
                                    total={past.length}
                                    canEdit={canEdit}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Form dialog */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50">
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl"
                        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
                            <div className="w-9 h-9 rounded-xl bg-md-primary-container flex items-center justify-center">
                                <span className="material-symbols-outlined icon-sm text-md-primary">
                                    {form.id ? 'edit' : 'sports_soccer'}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-base font-bold text-md-on-surface">
                                    {form.id ? 'Spieltag bearbeiten' : 'Neuer Spieltag'}
                                </h2>
                                {form.id && form.opponent && (
                                    <p className="text-xs text-md-outline">{form.opponent}</p>
                                )}
                            </div>
                            <button onClick={() => setShowForm(false)} className="btn-icon w-8 h-8">
                                <span className="material-symbols-outlined icon-sm">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            {err && (
                                <div className="flex items-start gap-2 text-sm text-md-error bg-red-50 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined icon-sm shrink-0 mt-0.5">error</span>
                                    {err}
                                </div>
                            )}
                            <div className="relative">
                                <input required type="date" className="md-input" value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                                <label className="md-input-label">Datum *</label>
                            </div>
                            <div className="relative">
                                <input required type="text" className="md-input" placeholder=" " value={form.opponent}
                                    onChange={e => setForm(f => ({ ...f, opponent: e.target.value }))} />
                                <label className="md-input-label">Gegner *</label>
                            </div>

                            {/* Home/Away — toggle buttons */}
                            <div>
                                <p className="text-xs font-medium text-md-on-surface-variant mb-2">Spielort</p>
                                <div className="flex gap-2">
                                    {['Heim', 'Auswärts', 'Neutral'].map(opt => (
                                        <button
                                            key={opt} type="button"
                                            onClick={() => setForm(f => ({ ...f, home_away: opt }))}
                                            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
                        ${form.home_away === opt
                                                    ? 'bg-md-primary text-white border-md-primary shadow-sm'
                                                    : 'bg-white border-md-outline-variant text-md-on-surface-variant hover:bg-md-surface'}`}>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-outlined flex-1 justify-center">Abbrechen</button>
                                <button type="submit" disabled={saving} className="btn-filled flex-1 justify-center">
                                    {saving
                                        ? <><span className="material-symbols-outlined icon-sm animate-spin">progress_activity</span>Speichern…</>
                                        : <><span className="material-symbols-outlined icon-sm">check</span>Speichern</>
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}