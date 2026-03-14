import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlayers } from '../hooks/usePlayers'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'

const POSITIONS = ['Torwart','Innenverteidiger','Außenverteidiger','Defensives Mittelfeld',
  'Zentrales Mittelfeld','Offensives Mittelfeld','Linksaußen','Rechtsaußen','Stürmer']

const POS_COLOR = {
  'Torwart': 'bg-amber-100 text-amber-800',
  'Innenverteidiger': 'bg-blue-100 text-blue-800',
  'Außenverteidiger': 'bg-sky-100 text-sky-800',
  'Defensives Mittelfeld': 'bg-violet-100 text-violet-800',
  'Zentrales Mittelfeld': 'bg-purple-100 text-purple-800',
  'Offensives Mittelfeld': 'bg-pink-100 text-pink-800',
  'Linksaußen': 'bg-green-100 text-green-800',
  'Rechtsaußen': 'bg-emerald-100 text-emerald-800',
  'Stürmer': 'bg-red-100 text-red-800',
}

function Avatar({ name, size = 'md' }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'
  const cls = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={`${cls} rounded-full bg-md-primary-container flex items-center justify-center shrink-0 font-medium text-md-on-primary-container`}>
      {initials}
    </div>
  )
}

const EMPTY_FORM = { name: '', position: '', number: '', birth_year: '' }

export default function Players() {
  const { canEdit } = useAuth()
  const { players, loading, create, update, remove, exportCSV } = usePlayers()
  const [search, setSearch]   = useState('')
  const [posFilter, setPosFilter] = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState(null)

  const filtered = players.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchPos    = !posFilter || p.position === posFilter
    return matchSearch && matchPos
  })

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setFormError(null)
    try {
      const fields = {
        name: form.name,
        position: form.position || null,
        number: form.number ? parseInt(form.number) : null,
        birth_year: form.birth_year ? parseInt(form.birth_year) : null,
      }
      if (form.id) await update(form.id, fields)
      else await create(fields)
      setShowForm(false); setForm(EMPTY_FORM)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="p-4 md:p-8 max-w-4xl space-y-3">
      <Skeleton className="h-8 w-40" />
      {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-medium text-md-on-surface">Spieler <span className="text-md-outline text-base">({players.length})</span></h1>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-outlined py-2 px-3 text-xs">
            <span className="material-symbols-outlined icon-sm">download</span>
            CSV
          </button>
          {canEdit && (
            <button onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }} className="btn-filled py-2 px-4 text-xs">
              <span className="material-symbols-outlined icon-sm">person_add</span>
              Neu
            </button>
          )}
        </div>
      </div>

      {/* Filter / Suche */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 icon-sm text-md-outline">search</span>
          <input
            type="text"
            placeholder="Suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-md-outline-variant bg-white text-sm focus:outline-none focus:border-md-primary"
          />
        </div>
        <select
          value={posFilter}
          onChange={e => setPosFilter(e.target.value)}
          className="text-sm rounded-xl border border-md-outline-variant bg-white px-3 py-2 focus:outline-none focus:border-md-primary"
        >
          <option value="">Alle Positionen</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="card-outlined flex flex-col items-center py-16 text-md-on-surface-variant">
          <span className="material-symbols-outlined mb-3" style={{ fontSize: 48 }}>group_add</span>
          <p className="text-sm font-medium">Keine Spieler gefunden</p>
          {canEdit && <p className="text-xs mt-1">Lege deinen ersten Spieler an.</p>}
        </div>
      ) : (
        <div className="card-outlined overflow-hidden">
          {filtered.map((p, i) => (
            <Link
              key={p.id}
              to={`/players/${p.id}`}
              className={`w-full list-item text-left ripple hover:bg-md-surface ${i < filtered.length - 1 ? 'border-b border-md-outline-variant' : ''}`}
            >
              <Avatar name={p.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-md-on-surface truncate">{p.name}</p>
                  {p.number && <span className="text-xs text-md-outline">#{p.number}</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {p.position && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${POS_COLOR[p.position] ?? 'bg-gray-100 text-gray-700'}`}>
                      {p.position}
                    </span>
                  )}
                  {p.birth_year && <span className="text-xs text-md-outline">Jg. {p.birth_year}</span>}
                </div>
              </div>
              <div className="hidden md:flex items-center gap-4 text-xs text-md-on-surface-variant shrink-0">
                <span title="Spiele">{p.matches_played ?? 0} Sp.</span>
                <span title="Tore">{p.total_goals ?? 0} T</span>
                <span title="Assists">{p.total_assists ?? 0} A</span>
                {p.attendance_pct != null && (
                  <Badge variant={p.attendance_pct >= 75 ? 'success' : p.attendance_pct >= 50 ? 'warning' : 'error'}>
                    {p.attendance_pct}%
                  </Badge>
                )}
              </div>
              <span className="material-symbols-outlined icon-sm text-md-outline">chevron_right</span>
            </Link>
          ))}
        </div>
      )}

      {/* Formular-Dialog */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-el3">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
              <span className="material-symbols-outlined text-md-primary">{form.id ? 'edit' : 'person_add'}</span>
              <h2 className="text-base font-medium flex-1">{form.id ? 'Spieler bearbeiten' : 'Neuer Spieler'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon w-8 h-8">
                <span className="material-symbols-outlined icon-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {formError && <p className="text-sm text-md-error bg-md-error/8 rounded-lg px-3 py-2">{formError}</p>}
              <div className="relative">
                <input required className="md-input" placeholder=" " value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <label className="md-input-label">Name *</label>
              </div>
              <select className="md-select" value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))}>
                <option value="">Position wählen</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input type="number" min="1" max="99" className="md-input" placeholder=" "
                    value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
                  <label className="md-input-label">Rückennummer</label>
                </div>
                <div className="relative">
                  <input type="number" min="1950" max={new Date().getFullYear()} className="md-input" placeholder=" "
                    value={form.birth_year} onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))} />
                  <label className="md-input-label">Jahrgang</label>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outlined flex-1 justify-center">Abbrechen</button>
                <button type="submit" disabled={saving} className="btn-filled flex-1 justify-center">
                  {saving ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
