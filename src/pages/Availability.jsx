import { useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAvailability } from '../hooks/useAvailability'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'

const TYPE_CONFIG = {
  available:  { label: 'Verfügbar',  variant: 'success', bg: 'bg-green-100',  text: 'text-green-800',  icon: 'check_circle' },
  absent:     { label: 'Abwesend',   variant: 'error',   bg: 'bg-red-100',    text: 'text-red-800',    icon: 'event_busy' },
  vacation:   { label: 'Urlaub',     variant: 'warning', bg: 'bg-amber-100',  text: 'text-amber-800',  icon: 'beach_access' },
  suspended:  { label: 'Gesperrt',   variant: 'orange',  bg: 'bg-orange-100', text: 'text-orange-800', icon: 'block' },
  injured:    { label: 'Verletzt',   variant: 'error',   bg: 'bg-red-200',    text: 'text-red-900',    icon: 'healing' },
}

const EMPTY_FORM = { player_id: '', date_from: '', date_to: '', type: 'absent', note: '' }

export default function Availability() {
  const { canEdit } = useAuth()
  const {
    currentMonth, players, records, loading,
    getDaysInMonth, getEventsForDay,
    prevMonth, nextMonth,
    addRecord, deleteRecord,
  } = useAvailability()

  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [err, setErr]             = useState(null)

  const days    = getDaysInMonth()
  const weekdays = ['Mo','Di','Mi','Do','Fr','Sa','So']
  const firstDayOffset = (new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() + 6) % 7

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
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-medium text-md-on-surface">Verfügbarkeit</h1>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-filled py-2 px-4 text-xs">
            <span className="material-symbols-outlined icon-sm">add</span>Eintragen
          </button>
        )}
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="btn-icon">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <h2 className="text-base font-medium text-md-on-surface capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: de })}
        </h2>
        <button onClick={nextMonth} className="btn-icon">
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="card-outlined overflow-hidden mb-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-md-outline-variant">
          {weekdays.map(d => (
            <div key={d} className="text-center text-xs font-medium text-md-on-surface-variant py-2">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {[...Array(firstDayOffset)].map((_, i) => (
            <div key={`empty-${i}`} className="h-14 border-r border-b border-md-outline-variant last:border-r-0" />
          ))}

          {days.map((day, i) => {
            const events    = getEventsForDay(day)
            const isToday   = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
            const isSelected = selectedDay && format(day, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd')
            const col       = (firstDayOffset + i) % 7
            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`h-14 p-1 border-r border-b border-md-outline-variant cursor-pointer transition-colors
                  ${col === 6 ? 'border-r-0' : ''}
                  ${isToday ? 'bg-md-primary-container/20' : ''}
                  ${isSelected ? 'bg-md-secondary-container' : 'hover:bg-md-surface'}
                `}
              >
                <div className={`text-xs font-medium mb-0.5 w-5 h-5 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-md-primary text-white' : 'text-md-on-surface'}`}>
                  {format(day, 'd')}
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {events.slice(0, 3).map((ev, ei) => {
                    const cfg = TYPE_CONFIG[ev.type]
                    return (
                      <div key={ei} className={`w-2 h-2 rounded-full ${cfg?.bg ?? 'bg-gray-100'}`} title={ev.players?.name} />
                    )
                  })}
                  {events.length > 3 && <div className="text-xs text-md-outline">+{events.length - 3}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day detail */}
      {selectedDay && (
        <div className="card-outlined overflow-hidden mb-4">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-md-outline-variant">
            <span className="material-symbols-outlined icon-sm text-md-primary">event</span>
            <h3 className="text-sm font-medium text-md-on-surface">
              {format(selectedDay, 'EEEE, d. MMMM', { locale: de })}
            </h3>
          </div>
          {selectedDayEvents.length === 0 ? (
            <div className="py-6 text-center text-sm text-md-on-surface-variant">Keine Einträge</div>
          ) : (
            <ul>
              {selectedDayEvents.map((ev, i) => {
                const cfg = TYPE_CONFIG[ev.type]
                return (
                  <li key={i} className={`flex items-center gap-3 px-4 py-2.5 ${i < selectedDayEvents.length - 1 ? 'border-b border-md-outline-variant' : ''}`}>
                    <span className={`material-symbols-outlined icon-sm ${cfg?.text ?? ''}`}>{cfg?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-md-on-surface">{ev.players?.name}</p>
                      {ev.note && <p className="text-xs text-md-on-surface-variant">{ev.note}</p>}
                    </div>
                    <Badge variant={cfg?.variant ?? 'neutral'}>{cfg?.label ?? ev.type}</Badge>
                    {canEdit && ev.id && (
                      <button onClick={() => deleteRecord(ev.id)} className="btn-icon w-6 h-6 text-md-outline hover:text-md-error">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-md-on-surface-variant">
            <div className={`w-3 h-3 rounded-full ${cfg.bg}`} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* Form dialog */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-el3">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
              <span className="material-symbols-outlined text-md-primary">event_available</span>
              <h2 className="text-base font-medium flex-1">Verfügbarkeit eintragen</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon w-8 h-8">
                <span className="material-symbols-outlined icon-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {err && <p className="text-sm text-md-error bg-md-error/8 rounded-lg px-3 py-2">{err}</p>}
              <select required className="md-select" value={form.player_id}
                onChange={e => setForm(f => ({ ...f, player_id: e.target.value }))}>
                <option value="">Spieler wählen *</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="md-select" value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {['available','absent','vacation','suspended'].map(t => (
                  <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input required type="date" className="md-input" value={form.date_from}
                    onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} />
                  <label className="md-input-label">Von *</label>
                </div>
                <div className="relative">
                  <input required type="date" className="md-input" value={form.date_to}
                    onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} />
                  <label className="md-input-label">Bis *</label>
                </div>
              </div>
              <div className="relative">
                <input type="text" className="md-input" placeholder=" " value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                <label className="md-input-label">Notiz (optional)</label>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outlined flex-1 justify-center">Abbrechen</button>
                <button type="submit" disabled={saving} className="btn-filled flex-1 justify-center">{saving ? '...' : 'Speichern'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
