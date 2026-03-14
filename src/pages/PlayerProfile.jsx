import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'

const AVAIL_LABELS = { available: 'Verfügbar', absent: 'Abwesend', vacation: 'Urlaub', suspended: 'Gesperrt' }
const AVAIL_VARIANT = { available: 'success', absent: 'error', vacation: 'warning', suspended: 'orange' }
const CONSENT_LABELS = { contact_data: 'Kontaktdaten', photo_release: 'Fotofreigabe', data_processing: 'Datenverarbeitung' }

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

function Avatar({ name }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'
  return (
    <div className="w-16 h-16 rounded-full bg-md-primary-container flex items-center justify-center shrink-0 text-xl font-medium text-md-on-primary-container">
      {initials}
    </div>
  )
}

export default function PlayerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canEdit } = useAuth()
  const {
    player, notes, injuries, availability, matchHistory, trainingHistory, consents, stats,
    loading, error,
    addNote, deleteNote, addInjury, updateInjury, setAvail, grantConsent, revokeConsent,
  } = usePlayerProfile(id)

  const [tab, setTab]         = useState('overview')
  const [noteText, setNoteText] = useState('')
  const [showInjuryForm, setShowInjuryForm] = useState(false)
  const [showAvailForm, setShowAvailForm]   = useState(false)
  const [injuryForm, setInjuryForm] = useState({ injury_date: '', expected_return: '', description: '', status: 'active' })
  const [availForm, setAvailForm]   = useState({ date_from: '', date_to: '', type: 'absent', note: '' })
  const [saving, setSaving] = useState(false)

  if (loading) return (
    <div className="p-4 md:p-8 max-w-3xl space-y-4">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
  if (error) return <div className="p-8 text-md-error">{error}</div>
  if (!player) return null

  const activeInjury = injuries.find(i => i.status === 'active')

  const chartData = matchHistory
    .filter(m => m.rating != null)
    .map(m => ({
      date: new Date(m.match_days?.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
      Rating: m.rating,
      Minuten: m.minutes ?? 90,
    }))
    .reverse()

  const tabs = [
    { id: 'overview', label: 'Übersicht', icon: 'person' },
    { id: 'stats',    label: 'Statistik', icon: 'bar_chart' },
    { id: 'notes',    label: `Notizen (${notes.length})`, icon: 'sticky_note_2' },
    { id: 'injuries', label: 'Verletzungen', icon: 'healing' },
    { id: 'availability', label: 'Verfügbarkeit', icon: 'event_available' },
    { id: 'gdpr',     label: 'DSGVO', icon: 'verified_user' },
  ]

  async function handleAddNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setSaving(true)
    try { await addNote(noteText.trim()); setNoteText('') } finally { setSaving(false) }
  }

  async function handleAddInjury(e) {
    e.preventDefault(); setSaving(true)
    try { await addInjury(injuryForm); setShowInjuryForm(false); setInjuryForm({ injury_date: '', expected_return: '', description: '', status: 'active' }) }
    finally { setSaving(false) }
  }

  async function handleAddAvail(e) {
    e.preventDefault(); setSaving(true)
    try { await setAvail(availForm); setShowAvailForm(false); setAvailForm({ date_from: '', date_to: '', type: 'absent', note: '' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {/* Back */}
      <button onClick={() => navigate('/players')} className="btn-text px-0 mb-4 text-md-primary">
        <span className="material-symbols-outlined icon-sm">arrow_back</span>
        Alle Spieler
      </button>

      {/* Header */}
      <div className="card-outlined p-5 mb-4">
        <div className="flex items-start gap-4">
          <Avatar name={player.name} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-medium text-md-on-surface">{player.name}</h1>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {player.number && <span className="chip-selected text-xs"><span className="material-symbols-outlined icon-sm">tag</span>{player.number}</span>}
              {player.position && <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${POS_COLOR[player.position] ?? 'bg-gray-100 text-gray-700'}`}>{player.position}</span>}
              {player.birth_year && <span className="chip text-xs"><span className="material-symbols-outlined icon-sm">cake</span>Jg. {player.birth_year}</span>}
              {activeInjury && <Badge variant="error">Verletzt</Badge>}
            </div>
          </div>
        </div>
        {stats && (
          <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-md-outline-variant">
            {[
              { label: 'Spiele',   value: stats.matches_played },
              { label: 'Tore',     value: stats.total_goals },
              { label: 'Assists',  value: stats.total_assists },
              { label: 'Anwesenh.', value: stats.attendance_pct != null ? `${stats.attendance_pct}%` : '–' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-medium text-md-on-surface">{s.value ?? 0}</p>
                <p className="text-xs text-md-on-surface-variant">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4 border-b border-md-outline-variant">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${tab === t.id ? 'text-md-primary border-b-2 border-md-primary' : 'text-md-on-surface-variant hover:text-md-on-surface'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Übersicht */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="card-outlined overflow-hidden">
            <div className="px-4 py-3 border-b border-md-outline-variant text-sm font-medium text-md-on-surface">Letzte Spiele</div>
            {matchHistory.slice(0, 5).length === 0 ? (
              <div className="py-6 text-center text-sm text-md-on-surface-variant">Noch keine Spiele</div>
            ) : (
              <ul>
                {matchHistory.slice(0, 5).map((m, i) => (
                  <li key={m.id} className={`list-item ${i < 4 ? 'border-b border-md-outline-variant' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-md-on-surface">{m.match_days?.opponent}</p>
                      <p className="text-xs text-md-on-surface-variant">
                        {m.match_days?.date && new Date(m.match_days.date).toLocaleDateString('de-DE')} · {m.match_days?.home_away}
                      </p>
                    </div>
                    <div className="flex gap-2 text-xs text-md-on-surface-variant">
                      {m.goals > 0 && <Badge variant="primary">{m.goals} T</Badge>}
                      {m.assists > 0 && <Badge variant="secondary">{m.assists} A</Badge>}
                      {m.rating && <span className="font-medium text-md-on-surface">{m.rating}★</span>}
                      <Badge variant={m.status === 'starter' ? 'success' : m.status === 'substitute' ? 'warning' : 'neutral'}>
                        {m.status === 'starter' ? 'Start' : m.status === 'substitute' ? 'Einw.' : 'Fehlt'}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Tab: Statistik */}
      {tab === 'stats' && (
        <div className="space-y-4">
          {chartData.length > 1 ? (
            <>
              <div className="card-outlined p-4">
                <h3 className="text-sm font-medium mb-3">Rating-Verlauf</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Rating" stroke="var(--md-primary)" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card-outlined p-4">
                <h3 className="text-sm font-medium mb-3">Minuten gespielt</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="Minuten" fill="var(--md-primary)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="card-outlined py-12 text-center text-sm text-md-on-surface-variant">
              Nicht genug Daten für Diagramme
            </div>
          )}
        </div>
      )}

      {/* Tab: Notizen */}
      {tab === 'notes' && (
        <div className="space-y-3">
          {canEdit && (
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input type="text" className="flex-1 md-input py-3" placeholder="Neue Notiz..." value={noteText}
                onChange={e => setNoteText(e.target.value)} />
              <button type="submit" disabled={saving || !noteText.trim()} className="btn-tonal px-4">
                <span className="material-symbols-outlined icon-sm">send</span>
              </button>
            </form>
          )}
          {notes.length === 0 ? (
            <div className="card-outlined py-10 text-center text-sm text-md-on-surface-variant">Keine Notizen</div>
          ) : (
            <div className="card-outlined overflow-hidden">
              {notes.map((note, i) => (
                <div key={note.id} className={`flex items-start gap-3 px-4 py-3 group ${i < notes.length - 1 ? 'border-b border-md-outline-variant' : ''}`}>
                  <span className="material-symbols-outlined icon-sm text-md-outline mt-0.5 shrink-0">chat_bubble</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-md-on-surface">{note.content}</p>
                    <p className="text-xs text-md-outline mt-0.5">{new Date(note.created_at).toLocaleDateString('de-DE')}</p>
                  </div>
                  {canEdit && (
                    <button onClick={() => deleteNote(note.id)} className="btn-icon w-7 h-7 opacity-0 group-hover:opacity-100 text-md-outline hover:text-md-error transition-opacity">
                      <span className="material-symbols-outlined icon-sm">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Verletzungen */}
      {tab === 'injuries' && (
        <div className="space-y-3">
          {canEdit && (
            <button onClick={() => setShowInjuryForm(true)} className="btn-filled py-2 px-4 text-xs">
              <span className="material-symbols-outlined icon-sm">add</span>
              Verletzung eintragen
            </button>
          )}
          {injuries.length === 0 ? (
            <div className="card-outlined py-10 text-center text-sm text-md-on-surface-variant">Keine Verletzungshistorie</div>
          ) : (
            <div className="card-outlined overflow-hidden">
              {injuries.map((inj, i) => (
                <div key={inj.id} className={`px-4 py-3 ${i < injuries.length - 1 ? 'border-b border-md-outline-variant' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={inj.status === 'active' ? 'error' : 'success'}>
                          {inj.status === 'active' ? 'Aktiv' : 'Erholt'}
                        </Badge>
                        <span className="text-xs text-md-outline">{new Date(inj.injury_date).toLocaleDateString('de-DE')}</span>
                      </div>
                      <p className="text-sm text-md-on-surface">{inj.description}</p>
                      {inj.expected_return && (
                        <p className="text-xs text-md-on-surface-variant mt-0.5">
                          Geplante Rückkehr: {new Date(inj.expected_return).toLocaleDateString('de-DE')}
                        </p>
                      )}
                    </div>
                    {canEdit && inj.status === 'active' && (
                      <button onClick={() => updateInjury(inj.id, { status: 'recovered' })} className="btn-outlined py-1 px-2 text-xs">
                        Erholt
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Verfügbarkeit */}
      {tab === 'availability' && (
        <div className="space-y-3">
          {canEdit && (
            <button onClick={() => setShowAvailForm(true)} className="btn-filled py-2 px-4 text-xs">
              <span className="material-symbols-outlined icon-sm">add</span>
              Verfügbarkeit eintragen
            </button>
          )}
          {availability.length === 0 ? (
            <div className="card-outlined py-10 text-center text-sm text-md-on-surface-variant">Keine Einträge</div>
          ) : (
            <div className="card-outlined overflow-hidden">
              {availability.map((av, i) => (
                <div key={av.id} className={`flex items-center gap-3 px-4 py-3 ${i < availability.length - 1 ? 'border-b border-md-outline-variant' : ''}`}>
                  <Badge variant={AVAIL_VARIANT[av.type] ?? 'neutral'}>{AVAIL_LABELS[av.type] ?? av.type}</Badge>
                  <div className="flex-1">
                    <p className="text-sm text-md-on-surface">
                      {new Date(av.date_from).toLocaleDateString('de-DE')} – {new Date(av.date_to).toLocaleDateString('de-DE')}
                    </p>
                    {av.note && <p className="text-xs text-md-on-surface-variant">{av.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: DSGVO */}
      {tab === 'gdpr' && (
        <div className="space-y-3">
          <div className="card-outlined overflow-hidden">
            <div className="px-4 py-3 border-b border-md-outline-variant text-sm font-medium">Einwilligungen</div>
            {['contact_data', 'photo_release', 'data_processing'].map(type => {
              const consent = consents.find(c => c.consent_type === type && !c.revoked_at)
              return (
                <div key={type} className="flex items-center justify-between px-4 py-3 border-b border-md-outline-variant last:border-0">
                  <div>
                    <p className="text-sm font-medium text-md-on-surface">{CONSENT_LABELS[type]}</p>
                    {consent && <p className="text-xs text-md-on-surface-variant">Erteilt am {new Date(consent.granted_at).toLocaleDateString('de-DE')}</p>}
                  </div>
                  {canEdit && (
                    consent
                      ? <button onClick={() => revokeConsent(consent.id)} className="btn-outlined py-1 px-2 text-xs text-md-error">Widerrufen</button>
                      : <button onClick={() => grantConsent(type)} className="btn-tonal py-1 px-2 text-xs">Erteilen</button>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-md-on-surface-variant px-1">
            Einwilligungen werden versioniert gespeichert und können jederzeit widerrufen werden (Art. 7 DSGVO).
          </p>
        </div>
      )}

      {/* Verletzungs-Dialog */}
      {showInjuryForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-el3">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
              <span className="material-symbols-outlined text-md-error">healing</span>
              <h2 className="text-base font-medium flex-1">Verletzung eintragen</h2>
              <button onClick={() => setShowInjuryForm(false)} className="btn-icon w-8 h-8"><span className="material-symbols-outlined icon-sm">close</span></button>
            </div>
            <form onSubmit={handleAddInjury} className="p-5 space-y-4">
              <div className="relative">
                <input required type="date" className="md-input" value={injuryForm.injury_date}
                  onChange={e => setInjuryForm(f => ({ ...f, injury_date: e.target.value }))} />
                <label className="md-input-label">Verletzungsdatum *</label>
              </div>
              <div className="relative">
                <input type="date" className="md-input" value={injuryForm.expected_return}
                  onChange={e => setInjuryForm(f => ({ ...f, expected_return: e.target.value }))} />
                <label className="md-input-label">Voraussichtliche Rückkehr</label>
              </div>
              <div className="relative">
                <textarea className="md-input py-3 resize-none" rows={3} placeholder=" " value={injuryForm.description}
                  onChange={e => setInjuryForm(f => ({ ...f, description: e.target.value }))} />
                <label className="md-input-label">Beschreibung</label>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowInjuryForm(false)} className="btn-outlined flex-1 justify-center">Abbrechen</button>
                <button type="submit" disabled={saving} className="btn-filled flex-1 justify-center">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verfügbarkeits-Dialog */}
      {showAvailForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-el3">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
              <span className="material-symbols-outlined text-md-primary">event_available</span>
              <h2 className="text-base font-medium flex-1">Verfügbarkeit eintragen</h2>
              <button onClick={() => setShowAvailForm(false)} className="btn-icon w-8 h-8"><span className="material-symbols-outlined icon-sm">close</span></button>
            </div>
            <form onSubmit={handleAddAvail} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input required type="date" className="md-input" value={availForm.date_from}
                    onChange={e => setAvailForm(f => ({ ...f, date_from: e.target.value }))} />
                  <label className="md-input-label">Von *</label>
                </div>
                <div className="relative">
                  <input required type="date" className="md-input" value={availForm.date_to}
                    onChange={e => setAvailForm(f => ({ ...f, date_to: e.target.value }))} />
                  <label className="md-input-label">Bis *</label>
                </div>
              </div>
              <select className="md-select" value={availForm.type}
                onChange={e => setAvailForm(f => ({ ...f, type: e.target.value }))}>
                <option value="available">Verfügbar</option>
                <option value="absent">Abwesend</option>
                <option value="vacation">Urlaub</option>
                <option value="suspended">Gesperrt</option>
              </select>
              <div className="relative">
                <input type="text" className="md-input" placeholder=" " value={availForm.note}
                  onChange={e => setAvailForm(f => ({ ...f, note: e.target.value }))} />
                <label className="md-input-label">Notiz (optional)</label>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAvailForm(false)} className="btn-outlined flex-1 justify-center">Abbrechen</button>
                <button type="submit" disabled={saving} className="btn-filled flex-1 justify-center">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
