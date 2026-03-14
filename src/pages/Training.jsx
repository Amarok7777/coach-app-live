import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTraining } from '../hooks/useTraining'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'

const SESSION_TYPES = ['Technik','Taktik','Kondition','Spielform','Torschuss','Standards','Testspiel','Sonstiges']

const TYPE_COLOR = {
  Technik: 'bg-blue-100 text-blue-800',
  Taktik: 'bg-purple-100 text-purple-800',
  Kondition: 'bg-orange-100 text-orange-800',
  Spielform: 'bg-green-100 text-green-800',
  Torschuss: 'bg-red-100 text-red-800',
  Standards: 'bg-yellow-100 text-yellow-800',
  Testspiel: 'bg-teal-100 text-teal-800',
  Sonstiges: 'bg-gray-100 text-gray-700',
}

const EMPTY = { date: '', title: '', type: '', description: '', duration_min: 90 }

export default function Training() {
  const { canEdit } = useAuth()
  const { sessions, loading, create, remove } = useTraining()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState(null)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setErr(null)
    try {
      await create({
        date: form.date,
        title: form.title || null,
        type: form.type || null,
        description: form.description || null,
        duration_min: form.duration_min ? parseInt(form.duration_min) : 90,
      })
      setShowForm(false); setForm(EMPTY)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="p-4 md:p-8 max-w-3xl space-y-3">
      <Skeleton className="h-8 w-40" />
      {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </div>
  )

  // Group by month
  const grouped = sessions.reduce((acc, s) => {
    const key = new Date(s.date).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-medium text-md-on-surface">Training</h1>
        {canEdit && (
          <button onClick={() => { setForm(EMPTY); setShowForm(true) }} className="btn-filled py-2 px-4 text-xs">
            <span className="material-symbols-outlined icon-sm">add</span>Neu
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="card-outlined flex flex-col items-center py-16 text-md-on-surface-variant">
          <span className="material-symbols-outlined mb-3" style={{ fontSize: 48 }}>calendar_month</span>
          <p className="text-sm font-medium">Noch keine Trainingseinheiten</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h2 className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider mb-2 px-1">{month}</h2>
              <div className="card-outlined overflow-hidden">
                {items.map((s, i) => (
                  <Link
                    key={s.id}
                    to={`/training/${s.id}`}
                    className={`list-item hover:bg-md-surface ripple ${i < items.length - 1 ? 'border-b border-md-outline-variant' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-md-primary-container flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-md-primary leading-none">
                        {new Date(s.date).toLocaleDateString('de-DE', { day: '2-digit' })}
                      </span>
                      <span className="text-xs text-md-primary/70 leading-none">
                        {new Date(s.date).toLocaleDateString('de-DE', { weekday: 'short' })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-md-on-surface">{s.title || 'Training'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {s.type && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLOR[s.type] ?? 'bg-gray-100 text-gray-700'}`}>
                            {s.type}
                          </span>
                        )}
                        <span className="text-xs text-md-outline">{s.duration_min} Min.</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined icon-sm text-md-outline">chevron_right</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-el3">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
              <span className="material-symbols-outlined text-md-primary">calendar_add_on</span>
              <h2 className="text-base font-medium flex-1">Neue Trainingseinheit</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon w-8 h-8">
                <span className="material-symbols-outlined icon-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {err && <p className="text-sm text-md-error bg-md-error/8 rounded-lg px-3 py-2">{err}</p>}
              <div className="relative">
                <input required type="date" className="md-input" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                <label className="md-input-label">Datum *</label>
              </div>
              <div className="relative">
                <input type="text" className="md-input" placeholder=" " value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <label className="md-input-label">Titel</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select className="md-select" value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="">Typ wählen</option>
                  {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="relative">
                  <input type="number" min="15" max="240" className="md-input" placeholder=" "
                    value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))} />
                  <label className="md-input-label">Dauer (Min.)</label>
                </div>
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
