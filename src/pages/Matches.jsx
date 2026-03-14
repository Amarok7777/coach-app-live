import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMatches } from '../hooks/useMatches'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'

const EMPTY = { date: '', opponent: '', home_away: 'Heim' }

export default function Matches() {
  const { canEdit } = useAuth()
  const { matches, loading, create, remove } = useMatches()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState(null)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setErr(null)
    try {
      await create({ date: form.date, opponent: form.opponent, home_away: form.home_away })
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

  const upcoming = matches.filter(m => new Date(m.date) >= new Date(new Date().toDateString()))
  const past     = matches.filter(m => new Date(m.date) <  new Date(new Date().toDateString()))

  function MatchCard({ m }) {
    const played = m.score_own !== null && m.score_opp !== null
    const won    = played && m.score_own > m.score_opp
    const draw   = played && m.score_own === m.score_opp
    return (
      <Link
        to={`/matches/${m.id}`}
        className="list-item hover:bg-md-surface ripple"
      >
        <div className="w-10 h-10 rounded-xl bg-md-primary-container flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-bold text-md-primary leading-none">
            {new Date(m.date).toLocaleDateString('de-DE', { day: '2-digit' })}
          </span>
          <span className="text-xs text-md-primary/70 leading-none">
            {new Date(m.date).toLocaleDateString('de-DE', { month: 'short' })}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-md-on-surface truncate">{m.opponent}</p>
            <Badge variant={m.home_away === 'Heim' ? 'primary' : 'neutral'}>{m.home_away}</Badge>
          </div>
          {played && (
            <p className={`text-sm font-bold mt-0.5 ${won ? 'text-green-600' : draw ? 'text-amber-600' : 'text-red-600'}`}>
              {m.score_own} : {m.score_opp} {won ? '(S)' : draw ? '(U)' : '(N)'}
            </p>
          )}
        </div>
        <span className="material-symbols-outlined icon-sm text-md-outline">chevron_right</span>
      </Link>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-medium text-md-on-surface">Spieltage</h1>
        {canEdit && (
          <button onClick={() => { setForm(EMPTY); setShowForm(true) }} className="btn-filled py-2 px-4 text-xs">
            <span className="material-symbols-outlined icon-sm">add</span>Neu
          </button>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="card-outlined flex flex-col items-center py-16 text-md-on-surface-variant">
          <span className="material-symbols-outlined mb-3" style={{ fontSize: 48 }}>sports_soccer</span>
          <p className="text-sm font-medium">Noch keine Spieltage</p>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider mb-2 px-1">Bevorstehend</h2>
              <div className="card-outlined overflow-hidden">
                {upcoming.map((m, i) => (
                  <div key={m.id} className={i < upcoming.length - 1 ? 'border-b border-md-outline-variant' : ''}>
                    <MatchCard m={m} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider mb-2 px-1">Gespielt</h2>
              <div className="card-outlined overflow-hidden">
                {past.map((m, i) => (
                  <div key={m.id} className={i < past.length - 1 ? 'border-b border-md-outline-variant' : ''}>
                    <MatchCard m={m} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-el3">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
              <span className="material-symbols-outlined text-md-primary">sports_soccer</span>
              <h2 className="text-base font-medium flex-1">Neuer Spieltag</h2>
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
                <input required type="text" className="md-input" placeholder=" " value={form.opponent}
                  onChange={e => setForm(f => ({ ...f, opponent: e.target.value }))} />
                <label className="md-input-label">Gegner *</label>
              </div>
              <select className="md-select" value={form.home_away}
                onChange={e => setForm(f => ({ ...f, home_away: e.target.value }))}>
                <option value="Heim">Heimspiel</option>
                <option value="Auswärts">Auswärtsspiel</option>
                <option value="Neutral">Neutraler Platz</option>
              </select>
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
