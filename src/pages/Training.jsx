import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTraining } from '../hooks/useTraining'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'

const SESSION_TYPES = ['Technik', 'Taktik', 'Kondition', 'Spielform', 'Torschuss', 'Standards', 'Testspiel', 'Sonstiges']

const TYPE_CONFIG = {
    Technik: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', border: 'border-blue-200' },
    Taktik: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400', border: 'border-purple-200' },
    Kondition: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400', border: 'border-orange-200' },
    Spielform: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400', border: 'border-green-200' },
    Torschuss: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', border: 'border-red-200' },
    Standards: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', border: 'border-amber-200' },
    Testspiel: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-400', border: 'border-teal-200' },
    Sonstiges: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-300', border: 'border-gray-200' },
}
const DEFAULT_TYPE = { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-300', border: 'border-gray-200' }

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

const EMPTY = { date: '', title: '', type: '', description: '', duration_min: 90 }

function SessionRow({ session: s, index, total, canEdit, onEdit, onDelete }) {
    const cfg = TYPE_CONFIG[s.type] ?? DEFAULT_TYPE
    const d = new Date(s.date)
    const day = d.getDate()
    const wd = WEEKDAYS[d.getDay()]
    const isToday = s.date === new Date().toISOString().split('T')[0]

    return (
        <div
            className={`group relative flex items-center gap-4 px-4 py-3 bg-white
        transition-all duration-150
        ${index < total - 1 ? 'border-b border-md-outline-variant/60' : ''}
      `}
            style={{ borderLeft: '3px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.borderLeftColor = `var(--${s.type ? s.type.toLowerCase() : 'gray'}-400, #006A60)`}
            onMouseLeave={e => e.currentTarget.style.borderLeftColor = 'transparent'}
        >
            {/* Clickable area — navigates to detail */}
            <Link
                to={`/training/${s.id}`}
                className="absolute inset-0"
                tabIndex={-1}
                aria-hidden="true"
            />

            {/* Date tile */}
            <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border relative z-10 pointer-events-none
        ${isToday ? 'bg-md-primary border-md-primary' : `${cfg.bg} ${cfg.border}`}`}
            >
                <span className={`text-sm font-black leading-none tabular-nums
          ${isToday ? 'text-white' : cfg.text}`}
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
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-md-on-surface truncate"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        {s.title || 'Training'}
                    </p>
                    {isToday && (
                        <span className="text-xs font-medium px-1.5 py-px rounded-md bg-md-primary text-white">
                            Heute
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {s.type && (
                        <span className={`text-xs font-medium px-1.5 py-px rounded-md ${cfg.bg} ${cfg.text}`}>
                            {s.type}
                        </span>
                    )}
                    <span className="text-xs text-md-outline flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>
                        {s.duration_min} Min.
                    </span>
                </div>
            </div>

            {/* Action buttons — appear on hover, only for canEdit */}
            {canEdit && (
                <div
                    className="relative z-10 hidden md:flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(s) }}
                        className="btn-icon w-8 h-8 hover:bg-md-primary/10 hover:text-md-primary"
                        title="Bearbeiten"
                    >
                        <span className="material-symbols-outlined icon-sm">edit</span>
                    </button>
                    <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(e, s.id) }}
                        className="btn-icon w-8 h-8 hover:bg-red-50 hover:text-red-600"
                        title="Löschen"
                    >
                        <span className="material-symbols-outlined icon-sm">delete</span>
                    </button>
                </div>
            )}

            {/* Chevron — fades out when action buttons appear (canEdit), always visible otherwise */}
            {!canEdit && (
                <span className="relative z-10 material-symbols-outlined icon-sm text-md-outline/40
          group-hover:text-md-primary group-hover:translate-x-0.5 transition-all shrink-0 pointer-events-none">
                    chevron_right
                </span>
            )}
            {canEdit && (
                <span className="relative z-10 material-symbols-outlined icon-sm text-md-outline/30 shrink-0
          md:group-hover:opacity-0 transition-opacity pointer-events-none">
                    chevron_right
                </span>
            )}
        </div>
    )
}

export default function Training() {
    const { canEdit } = useAuth()
    const { sessions, loading, create, update, remove } = useTraining()
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(EMPTY)
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState(null)

    function openEdit(s) {
        setForm({
            id: s.id,
            date: s.date ?? '',
            title: s.title ?? '',
            type: s.type ?? '',
            description: s.description ?? '',
            duration_min: s.duration_min != null ? String(s.duration_min) : '90',
        })
        setShowForm(true)
    }

    async function handleDelete(e, id) {
        e.preventDefault(); e.stopPropagation()
        if (!confirm('Trainingseinheit wirklich löschen?')) return
        try { await remove(id) } catch (error) { alert(error.message || 'Fehler beim Löschen') }
    }

    async function handleSave(e) {
        e.preventDefault()
        setSaving(true); setErr(null)
        try {
            const fields = {
                date: form.date,
                title: form.title || null,
                type: form.type || null,
                description: form.description || null,
                duration_min: form.duration_min ? parseInt(form.duration_min) : 90,
            }
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

    // Group by month — preserve insertion order
    const grouped = sessions.reduce((acc, s) => {
        const key = new Date(s.date).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
        if (!acc[key]) acc[key] = []
        acc[key].push(s)
        return acc
    }, {})

    // Quick stats
    const totalSessions = sessions.length
    const thisMonthKey = new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    const thisMonth = (grouped[thisMonthKey] ?? []).length

    return (
        <div className="p-4 md:p-8 max-w-3xl">

            {/* Header */}
            <div className="flex items-start justify-between mb-5 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-md-on-surface tracking-tight"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        Training
                    </h1>
                    <p className="text-sm text-md-outline mt-0.5">
                        {totalSessions} Einheiten gesamt
                        {thisMonth > 0 && ` · ${thisMonth} diesen Monat`}
                    </p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => { setForm(EMPTY); setShowForm(true) }}
                        className="btn-filled py-2 px-4 text-xs shrink-0"
                    >
                        <span className="material-symbols-outlined icon-sm">add</span>
                        Einheit
                    </button>
                )}
            </div>

            {/* Type legend — mini chips */}
            <div className="flex gap-1.5 mb-5 flex-wrap">
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                    <span key={type} className={`text-xs font-medium px-2 py-1 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {type}
                    </span>
                ))}
            </div>

            {/* Empty state */}
            {sessions.length === 0 && (
                <div className="card-outlined flex flex-col items-center py-20 text-md-on-surface-variant">
                    <div className="w-16 h-16 rounded-2xl bg-md-surface-variant flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-md-outline" style={{ fontSize: 32 }}>
                            calendar_month
                        </span>
                    </div>
                    <p className="text-sm font-semibold text-md-on-surface">Noch keine Trainingseinheiten</p>
                    <p className="text-xs text-md-outline mt-1">Lege die erste Einheit an</p>
                </div>
            )}

            {/* Grouped list */}
            <div className="space-y-5">
                {Object.entries(grouped).map(([month, items]) => (
                    <div key={month}>
                        <div className="flex items-center gap-3 mb-2 px-1">
                            <h2 className="text-xs font-bold text-md-on-surface-variant uppercase tracking-widest capitalize">
                                {month}
                            </h2>
                            <div className="flex-1 h-px bg-md-outline-variant/40" />
                            <span className="text-xs text-md-outline tabular-nums">{items.length}</span>
                        </div>
                        <div className="card-outlined overflow-hidden">
                            {items.map((s, i) => (
                                <SessionRow
                                    key={s.id}
                                    session={s}
                                    index={i}
                                    total={items.length}
                                    canEdit={canEdit}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Form dialog */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50">
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl"
                        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
                            <div className="w-9 h-9 rounded-xl bg-md-primary-container flex items-center justify-center">
                                <span className="material-symbols-outlined icon-sm text-md-primary">
                                    {form.id ? 'edit' : 'calendar_add_on'}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-base font-bold text-md-on-surface">
                                    {form.id ? 'Einheit bearbeiten' : 'Neue Trainingseinheit'}
                                </h2>
                                {form.id && form.title && (
                                    <p className="text-xs text-md-outline">{form.title}</p>
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
                            <div className="md-field">
                                <input required type="date" className="md-input" value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                                <label className="md-input-label">Datum *</label>
                            </div>
                            <div className="md-field">
                                <input type="text" className="md-input" placeholder=" " value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                                <label className="md-input-label">Titel (optional)</label>
                            </div>

                            {/* Type — visual pill selector */}
                            <div>
                                <p className="text-xs font-medium text-md-on-surface-variant mb-2">Typ</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {SESSION_TYPES.map(t => {
                                        const cfg = TYPE_CONFIG[t] ?? DEFAULT_TYPE
                                        const sel = form.type === t
                                        return (
                                            <button key={t} type="button"
                                                onClick={() => setForm(f => ({ ...f, type: sel ? '' : t }))}
                                                className={`text-xs font-medium px-3 py-1.5 rounded-xl border transition-all
                          ${sel ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm scale-105` : 'bg-white border-md-outline-variant text-md-on-surface-variant hover:bg-md-surface'}`}>
                                                {t}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="md-field">
                                <input type="number" min="15" max="240" className="md-input" placeholder=" "
                                    value={form.duration_min}
                                    onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))} />
                                <label className="md-input-label">Dauer (Minuten)</label>
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