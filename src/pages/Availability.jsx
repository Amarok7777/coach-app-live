import { useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAvailability } from '../hooks/useAvailability'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'

// ─── Type config ──────────────────────────────────────────
const TYPE_CONFIG = {
    available: {
        label: 'Verfügbar', icon: 'check_circle',
        dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200',
        calBg: 'bg-green-400',
    },
    absent: {
        label: 'Abwesend', icon: 'event_busy',
        dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200',
        calBg: 'bg-red-400',
    },
    vacation: {
        label: 'Urlaub', icon: 'beach_access',
        dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
        calBg: 'bg-amber-400',
    },
    suspended: {
        label: 'Gesperrt', icon: 'block',
        dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200',
        calBg: 'bg-orange-400',
    },
    injured: {
        label: 'Verletzt', icon: 'healing',
        dot: 'bg-red-600', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300',
        calBg: 'bg-red-600',
    },
}

const TYPE_KEYS_FORM = ['available', 'absent', 'vacation', 'suspended']

const EMPTY_FORM = { player_id: '', date_from: '', date_to: '', type: 'absent', note: '' }
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function Availability() {
    const { canEdit } = useAuth()
    const {
        currentMonth, players, records, loading,
        getDaysInMonth, getEventsForDay,
        prevMonth, nextMonth,
        addRecord, deleteRecord,
    } = useAvailability()

    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [selectedDay, setSelectedDay] = useState(null)
    const [err, setErr] = useState(null)

    async function handleSave(e) {
        e.preventDefault()
        setSaving(true); setErr(null)
        try {
            await addRecord(form)
            setShowForm(false); setForm(EMPTY_FORM)
        } catch (e) { setErr(e.message) }
        finally { setSaving(false) }
    }

    if (loading) return (
        <div className="p-4 md:p-8 max-w-3xl space-y-3">
            <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-72 rounded-2xl" />
        </div>
    )

    const days = getDaysInMonth()
    const firstDayOffset = (new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() + 6) % 7
    const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

    // Count events for current month for quick stats
    const allEvents = days.flatMap(d => getEventsForDay(d))
    const unavailable = allEvents.filter(e => ['absent', 'vacation', 'suspended', 'injured'].includes(e.type))

    return (
        <div className="p-4 md:p-8 max-w-3xl">

            {/* ── Header ── */}
            <div className="flex items-start justify-between mb-5 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-md-on-surface tracking-tight"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        Verfügbarkeit
                    </h1>
                    <p className="text-sm text-md-outline mt-0.5">
                        {players.length} Spieler
                        {unavailable.length > 0 && ` · ${unavailable.length} Abwesenheiten diesen Monat`}
                    </p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn-filled py-2 px-4 text-xs shrink-0"
                    >
                        <span className="material-symbols-outlined icon-sm">add</span>
                        Eintragen
                    </button>
                )}
            </div>

            {/* ── Month navigator ── */}
            <div className="flex items-center gap-4 mb-4">
                <button onClick={prevMonth}
                    className="w-9 h-9 rounded-xl border border-md-outline-variant bg-white flex items-center
            justify-center text-md-on-surface-variant hover:bg-md-surface transition-colors">
                    <span className="material-symbols-outlined icon-sm">chevron_left</span>
                </button>
                <h2 className="flex-1 text-center text-base font-bold text-md-on-surface capitalize"
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    {format(currentMonth, 'MMMM yyyy', { locale: de })}
                </h2>
                <button onClick={nextMonth}
                    className="w-9 h-9 rounded-xl border border-md-outline-variant bg-white flex items-center
            justify-center text-md-on-surface-variant hover:bg-md-surface transition-colors">
                    <span className="material-symbols-outlined icon-sm">chevron_right</span>
                </button>
            </div>

            {/* ── Calendar ── */}
            <div className="card-outlined overflow-hidden mb-4">

                {/* Weekday header */}
                <div className="grid grid-cols-7 bg-md-surface/60 border-b border-md-outline-variant/60">
                    {WEEKDAYS.map(d => (
                        <div key={d}
                            className="text-center text-xs font-bold text-md-outline uppercase tracking-wider py-2.5">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                    {[...Array(firstDayOffset)].map((_, i) => (
                        <div key={`e-${i}`}
                            className={`h-16 bg-md-surface/30 ${i < firstDayOffset - 1 || firstDayOffset === 0 ? 'border-r' : ''}
                border-b border-md-outline-variant/40`} />
                    ))}

                    {days.map((day, i) => {
                        const events = getEventsForDay(day)
                        const todayStr = format(new Date(), 'yyyy-MM-dd')
                        const dayStr = format(day, 'yyyy-MM-dd')
                        const isToday = dayStr === todayStr
                        const isSelected = selectedDay && format(selectedDay, 'yyyy-MM-dd') === dayStr
                        const col = (firstDayOffset + i) % 7
                        const isWeekend = col === 5 || col === 6

                        return (
                            <div
                                key={dayStr}
                                onClick={() => setSelectedDay(isSelected ? null : day)}
                                className={`h-16 p-1.5 cursor-pointer transition-colors select-none
                  ${col < 6 ? 'border-r' : ''} border-b border-md-outline-variant/40
                  ${isSelected
                                        ? 'bg-md-primary/8 ring-1 ring-inset ring-md-primary/30'
                                        : isToday
                                            ? 'bg-md-primary-container/20'
                                            : isWeekend
                                                ? 'bg-md-surface/50 hover:bg-md-surface'
                                                : 'bg-white hover:bg-md-surface/60'
                                    }`}
                            >
                                {/* Day number */}
                                <div className={`w-6 h-6 flex items-center justify-center rounded-full mb-1
                  text-xs font-bold transition-colors
                  ${isToday
                                        ? 'bg-md-primary text-white'
                                        : isSelected
                                            ? 'bg-md-primary/20 text-md-primary'
                                            : isWeekend
                                                ? 'text-md-outline'
                                                : 'text-md-on-surface'
                                    }`}
                                    style={{ fontFamily: "'DM Mono', monospace" }}>
                                    {format(day, 'd')}
                                </div>

                                {/* Event dots */}
                                <div className="flex flex-wrap gap-0.5">
                                    {events.slice(0, 4).map((ev, ei) => {
                                        const cfg = TYPE_CONFIG[ev.type]
                                        return (
                                            <div
                                                key={ei}
                                                className={`w-2 h-2 rounded-full ${cfg?.calBg ?? 'bg-gray-300'} shadow-sm`}
                                                title={`${ev.players?.name ?? ''} · ${cfg?.label ?? ev.type}`}
                                            />
                                        )
                                    })}
                                    {events.length > 4 && (
                                        <span className="text-xs text-md-outline leading-none"
                                            style={{ fontFamily: "'DM Mono', monospace" }}>
                                            +{events.length - 4}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ── Selected day detail ── */}
            {selectedDay && (
                <div className="card-outlined overflow-hidden mb-4">
                    <div className="flex items-center gap-3 px-4 py-3 bg-md-surface/60 border-b border-md-outline-variant/60">
                        <div className="w-9 h-9 rounded-xl bg-md-primary-container flex flex-col items-center justify-center shrink-0">
                            <span className="text-sm font-black text-md-primary leading-none"
                                style={{ fontFamily: "'DM Mono', monospace" }}>
                                {format(selectedDay, 'd')}
                            </span>
                            <span className="text-xs text-md-primary/70 leading-none">
                                {format(selectedDay, 'EEE', { locale: de })}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-md-on-surface"
                                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                {format(selectedDay, 'EEEE, d. MMMM', { locale: de })}
                            </h3>
                            <p className="text-xs text-md-outline">
                                {selectedDayEvents.length === 0
                                    ? 'Keine Einträge'
                                    : `${selectedDayEvents.length} Einträge`}
                            </p>
                        </div>
                        {canEdit && (
                            <button
                                onClick={() => {
                                    const ds = format(selectedDay, 'yyyy-MM-dd')
                                    setForm(f => ({ ...f, date_from: ds, date_to: ds }))
                                    setShowForm(true)
                                }}
                                className="ml-auto btn-tonal py-1.5 px-3 text-xs"
                            >
                                <span className="material-symbols-outlined icon-sm">add</span>
                                Eintrag
                            </button>
                        )}
                    </div>

                    {selectedDayEvents.length === 0 ? (
                        <div className="py-8 text-center text-sm text-md-on-surface-variant">
                            Kein Eintrag für diesen Tag
                        </div>
                    ) : (
                        <ul>
                            {selectedDayEvents.map((ev, i) => {
                                const cfg = TYPE_CONFIG[ev.type]
                                return (
                                    <li key={i}
                                        className={`flex items-center gap-3 px-4 py-3
                      ${i < selectedDayEvents.length - 1 ? 'border-b border-md-outline-variant/50' : ''}`}>
                                        {/* Type icon */}
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${cfg?.bg} ${cfg?.border}`}>
                                            <span className={`material-symbols-outlined icon-sm ${cfg?.text}`}>{cfg?.icon}</span>
                                        </div>

                                        {/* Player + note */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-md-on-surface"
                                                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                                {ev.players?.name ?? '–'}
                                            </p>
                                            {ev.note && (
                                                <p className="text-xs text-md-outline mt-0.5">{ev.note}</p>
                                            )}
                                        </div>

                                        {/* Type badge */}
                                        <span className={`text-xs font-medium px-2 py-1 rounded-lg border shrink-0 ${cfg?.bg} ${cfg?.text} ${cfg?.border}`}>
                                            {cfg?.label ?? ev.type}
                                        </span>

                                        {/* Delete */}
                                        {canEdit && ev.id && (
                                            <button
                                                onClick={() => deleteRecord(ev.id)}
                                                className="w-7 h-7 rounded-full flex items-center justify-center
                          text-md-outline/50 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                                            </button>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            )}

            {/* ── Legend ── */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                    <div key={type}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                    </div>
                ))}
            </div>

            {/* ── Form dialog ── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50">
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl"
                        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>

                        <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
                            <div className="w-9 h-9 rounded-xl bg-md-primary-container flex items-center justify-center">
                                <span className="material-symbols-outlined icon-sm text-md-primary">event_available</span>
                            </div>
                            <h2 className="text-base font-bold text-md-on-surface flex-1">Verfügbarkeit eintragen</h2>
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

                            {/* Player */}
                            <select required className="md-select" value={form.player_id}
                                onChange={e => setForm(f => ({ ...f, player_id: e.target.value }))}>
                                <option value="">Spieler wählen *</option>
                                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>

                            {/* Type — visual toggle buttons */}
                            <div>
                                <p className="text-xs font-medium text-md-on-surface-variant mb-2">Status</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {TYPE_KEYS_FORM.map(t => {
                                        const cfg = TYPE_CONFIG[t]
                                        const sel = form.type === t
                                        return (
                                            <button key={t} type="button"
                                                onClick={() => setForm(f => ({ ...f, type: t }))}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm
                          font-medium transition-all text-left
                          ${sel
                                                        ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm`
                                                        : 'bg-white border-md-outline-variant text-md-on-surface-variant hover:bg-md-surface'
                                                    }`}>
                                                <span className={`material-symbols-outlined icon-sm ${sel ? cfg.text : 'text-md-outline'}`}>
                                                    {cfg.icon}
                                                </span>
                                                {cfg.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Date range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="md-field">
                                    <input required type="date" className="md-input" value={form.date_from}
                                        onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} />
                                    <label className="md-input-label">Von *</label>
                                </div>
                                <div className="md-field">
                                    <input required type="date" className="md-input" value={form.date_to}
                                        onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} />
                                    <label className="md-input-label">Bis *</label>
                                </div>
                            </div>

                            {/* Note */}
                            <div className="md-field">
                                <input type="text" className="md-input" placeholder=" " value={form.note}
                                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                                <label className="md-input-label">Notiz (optional)</label>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="btn-outlined flex-1 justify-center">Abbrechen</button>
                                <button type="submit" disabled={saving}
                                    className="btn-filled flex-1 justify-center">
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