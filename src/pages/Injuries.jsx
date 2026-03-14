import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInjuries } from '../hooks/useInjuries'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'

const EMPTY = { player_id: '', injury_date: '', expected_return: '', description: '', status: 'active' }

export default function Injuries() {
  const { canEdit } = useAuth()
  const { injuries, loading, create, recover } = useInjuries()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [players, setPlayers]   = useState([])
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState(null)
  const [tab, setTab]           = useState('active')  // 'active' | 'all'

  // Load players for form select
  useState(() => {
    import('../lib/supabase').then(({ supabase }) => {
      supabase.from('players').select('id, name').order('name').then(({ data }) => setPlayers(data ?? []))
    })
  })

  const active = injuries.filter(i => i.status === 'active')
  const past   = injuries.filter(i => i.status === 'recovered')
  const shown  = tab === 'active' ? active : injuries

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setErr(null)
    try {
      await create(form)
      setShowForm(false); setForm(EMPTY)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="p-4 md:p-8 max-w-2xl space-y-3">
      <Skeleton className="h-8 w-40" />
      {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-medium text-md-on-surface">
          Verletzungen
          {active.length > 0 && (
            <span className="ml-2 text-sm font-normal text-md-error">({active.length} aktiv)</span>
          )}
        </h1>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-filled py-2 px-4 text-xs">
            <span className="material-symbols-outlined icon-sm">add</span>Eintragen
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-md-outline-variant mb-4">
        {[['active','Aktiv'], ['all','Alle']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === id ? 'text-md-primary border-b-2 border-md-primary' : 'text-md-on-surface-variant hover:text-md-on-surface'}`}>
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card-outlined flex flex-col items-center py-16 text-md-on-surface-variant">
          <span className="material-symbols-outlined mb-3" style={{ fontSize: 48 }}>healing</span>
          <p className="text-sm font-medium">{tab === 'active' ? 'Keine aktiven Verletzungen 🎉' : 'Keine Einträge'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(inj => {
            const daysLeft = inj.expected_return
              ? Math.ceil((new Date(inj.expected_return) - new Date()) / 86400000)
              : null
            return (
              <div key={inj.id} className="card-outlined p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={`/players/${inj.players?.id}`}
                        className="text-sm font-medium text-md-primary hover:underline">
                        {inj.players?.name}
                      </Link>
                      {inj.players?.position && (
                        <span className="text-xs text-md-on-surface-variant">{inj.players.position}</span>
                      )}
                      <Badge variant={inj.status === 'active' ? 'error' : 'success'}>
                        {inj.status === 'active' ? 'Aktiv' : 'Erholt'}
                      </Badge>
                    </div>

                    {inj.description && (
                      <p className="text-sm text-md-on-surface mb-2">{inj.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-md-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>event</span>
                        Seit {new Date(inj.injury_date).toLocaleDateString('de-DE')}
                      </span>
                      {inj.expected_return && (
                        <span className={`flex items-center gap-1 ${daysLeft !== null && daysLeft <= 7 ? 'text-md-primary font-medium' : ''}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                          Rückkehr: {new Date(inj.expected_return).toLocaleDateString('de-DE')}
                          {daysLeft !== null && daysLeft > 0 && ` (${daysLeft} Tage)`}
                          {daysLeft !== null && daysLeft <= 0 && ' (bereit!)'}
                        </span>
                      )}
                    </div>
                  </div>

                  {canEdit && inj.status === 'active' && (
                    <button onClick={() => recover(inj.id)} className="btn-tonal py-1.5 px-3 text-xs shrink-0">
                      <span className="material-symbols-outlined icon-sm">check_circle</span>
                      Erholt
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form dialog */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-el3">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
              <span className="material-symbols-outlined text-md-error">healing</span>
              <h2 className="text-base font-medium flex-1">Verletzung eintragen</h2>
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
              <div className="relative">
                <input required type="date" className="md-input" value={form.injury_date}
                  onChange={e => setForm(f => ({ ...f, injury_date: e.target.value }))} />
                <label className="md-input-label">Verletzungsdatum *</label>
              </div>
              <div className="relative">
                <input type="date" className="md-input" value={form.expected_return}
                  onChange={e => setForm(f => ({ ...f, expected_return: e.target.value }))} />
                <label className="md-input-label">Geplante Rückkehr</label>
              </div>
              <div className="relative">
                <textarea className="md-input py-3 resize-none" rows={3} placeholder=" " value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                <label className="md-input-label">Beschreibung</label>
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
