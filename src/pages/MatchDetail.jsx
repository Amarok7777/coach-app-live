import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMatchDetail } from '../hooks/useMatchDetail'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'

// ── Status config ─────────────────────────────────────────────
const STATUS_OPTS = [
  { value: 'starter',    label: 'Startelf',      variant: 'success' },
  { value: 'substitute', label: 'Eingewechselt', variant: 'warning' },
  { value: 'absent',     label: 'Fehlt',         variant: 'neutral' },
]

function statusVariant(status) {
  return STATUS_OPTS.find(o => o.value === status)?.variant ?? 'neutral'
}
function statusLabel(status) {
  return STATUS_OPTS.find(o => o.value === status)?.label ?? status
}

// ── QR Code ───────────────────────────────────────────────────
function QRCodeDisplay({ url }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    if (!url || !canvasRef.current) return
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current, url, { width: 180, margin: 2 }, err => {
        if (err) console.error('QR error', err)
      })
    }).catch(() => {})
  }, [url])
  return <canvas ref={canvasRef} className="rounded-lg" />
}

// ── Per-player row ────────────────────────────────────────────
function PlayerRow({ player, att, canEdit, onUpsert }) {
  const [showMinutes, setShowMinutes] = useState(false)
  const [showNote,    setShowNote]    = useState(false)

  const status     = att?.status      ?? 'absent'
  const goals      = att?.goals       ?? 0
  const assists    = att?.assists     ?? 0
  const rating     = att?.rating      ?? null
  const note       = att?.note        ?? ''
  const minutes_on  = att?.minutes_on  ?? null
  const minutes_off = att?.minutes_off ?? null
  const minutesPlayed = att?.minutes_played ?? null

  const isPlaying = status !== 'absent'
  const hasMinutes = minutes_on !== null || minutes_off !== null

  // Status cycle: absent → starter → substitute → absent
  function cycleStatus() {
    const order = ['absent', 'starter', 'substitute']
    const next  = order[(order.indexOf(status) + 1) % order.length]
    onUpsert(player.id, { status: next })
    if (next !== 'absent') setShowMinutes(false)
  }

  const statusColors = {
    starter:    'bg-green-500',
    substitute: 'bg-amber-400',
    absent:     'bg-gray-200',
  }

  return (
    <div className={`border-b border-md-outline-variant last:border-0 transition-colors ${isPlaying ? '' : 'opacity-70'}`}>
      {/* Main row */}
      <div className="flex items-center gap-2 px-4 py-3">

        {/* Status toggle button */}
        {canEdit ? (
          <button
            onClick={cycleStatus}
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 ${statusColors[status]}`}
            title={`Status: ${statusLabel(status)} — tippen zum Wechseln`}
          >
            <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>
              {status === 'starter' ? 'sports_soccer' : status === 'substitute' ? 'swap_horiz' : 'person_off'}
            </span>
          </button>
        ) : (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${statusColors[status]}`}>
            <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>
              {status === 'starter' ? 'sports_soccer' : status === 'substitute' ? 'swap_horiz' : 'person_off'}
            </span>
          </div>
        )}

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-md-on-surface">{player.name}</p>
            {player.number && <span className="text-xs text-md-outline">#{player.number}</span>}
            {!canEdit && <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>}
            {isPlaying && minutesPlayed !== null && (
              <Badge variant="neutral">{minutesPlayed}'</Badge>
            )}
          </div>
          {player.position && <p className="text-xs text-md-on-surface-variant">{player.position}</p>}
        </div>

        {/* Goals / Assists — only when playing */}
        {isPlaying && (
          <div className="flex items-center gap-1 text-xs shrink-0">
            <span className="text-md-outline w-3">T</span>
            {canEdit ? (
              <input type="number" min="0" max="20"
                value={goals}
                onChange={e => onUpsert(player.id, { goals: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-9 text-center border border-md-outline-variant rounded-lg py-1 text-xs bg-white focus:outline-none focus:border-md-primary"
              />
            ) : <span className="font-semibold w-5 text-center">{goals}</span>}
            <span className="text-md-outline w-3 ml-1">A</span>
            {canEdit ? (
              <input type="number" min="0" max="20"
                value={assists}
                onChange={e => onUpsert(player.id, { assists: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-9 text-center border border-md-outline-variant rounded-lg py-1 text-xs bg-white focus:outline-none focus:border-md-primary"
              />
            ) : <span className="font-semibold w-5 text-center">{assists}</span>}
          </div>
        )}

        {/* Rating select — only when playing */}
        {isPlaying && canEdit && (
          <select
            value={rating ?? ''}
            onChange={e => onUpsert(player.id, { rating: e.target.value ? parseFloat(e.target.value) : null })}
            className="text-xs border border-md-outline-variant rounded-lg px-1.5 py-1 bg-white w-16 focus:outline-none focus:border-md-primary shrink-0"
          >
            <option value="">Note</option>
            {[...Array(10)].map((_, i) => (
              <option key={i+1} value={i+1}>{i+1} ★</option>
            ))}
          </select>
        )}
        {isPlaying && !canEdit && rating && (
          <Badge variant={rating >= 8 ? 'success' : rating >= 5 ? 'warning' : 'error'}>{rating} ★</Badge>
        )}

        {/* Minutes toggle */}
        {isPlaying && canEdit && (
          <button
            onClick={() => setShowMinutes(s => !s)}
            className={`btn-icon w-7 h-7 shrink-0 ${hasMinutes ? 'text-amber-500' : 'text-md-outline'}`}
            title="Wechselminuten"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>timer</span>
          </button>
        )}

        {/* Note toggle */}
        <button
          onClick={() => setShowNote(s => !s)}
          className={`btn-icon w-7 h-7 shrink-0 ${note ? 'text-md-primary' : 'text-md-outline'}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
            {note ? 'sticky_note_2' : 'note_add'}
          </span>
        </button>
      </div>

      {/* Minutes panel */}
      {showMinutes && isPlaying && canEdit && (
        <div className="px-4 pb-3 pt-1 bg-amber-50/60 border-t border-amber-100">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            {status === 'substitute' && (
              <label className="flex items-center gap-2">
                <span className="text-gray-500 w-32">Eingewechselt (Min.):</span>
                <input
                  type="number" min="1" max="120"
                  placeholder="z.B. 60"
                  value={minutes_on ?? ''}
                  onChange={e => onUpsert(player.id, {
                    minutes_on: e.target.value ? parseInt(e.target.value) : null
                  })}
                  className="w-16 border border-md-outline-variant rounded-xl px-2 py-1.5 bg-white text-center focus:outline-none focus:border-md-primary"
                />
              </label>
            )}
            {(status === 'starter' || status === 'substitute') && (
              <label className="flex items-center gap-2">
                <span className="text-gray-500 w-32">
                  {status === 'starter' ? 'Ausgewechselt (Min.):' : 'Wieder ausgewechselt:'}
                </span>
                <input
                  type="number" min="1" max="120"
                  placeholder="90"
                  value={minutes_off ?? ''}
                  onChange={e => onUpsert(player.id, {
                    minutes_off: e.target.value ? parseInt(e.target.value) : null
                  })}
                  className="w-16 border border-md-outline-variant rounded-xl px-2 py-1.5 bg-white text-center focus:outline-none focus:border-md-primary"
                />
                <span className="text-gray-400">(leer = 90')</span>
              </label>
            )}
            {hasMinutes && (
              <button
                onClick={() => onUpsert(player.id, { minutes_on: null, minutes_off: null })}
                className="text-xs text-md-outline hover:text-md-error transition-colors"
              >
                Zurücksetzen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Note panel */}
      {showNote && (
        <div className="px-4 pb-3 pt-1 border-t border-md-outline-variant">
          <input
            type="text"
            placeholder="Kurze Notiz zum Spieler..."
            value={note}
            onChange={e => onUpsert(player.id, { note: e.target.value })}
            className="w-full text-sm border border-md-outline-variant rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-md-primary"
            autoFocus
          />
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function MatchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canEdit } = useAuth()
  const {
    match, players, attMap, shareToken, loading, saving,
    starterCount, subCount,
    updateScore, upsertAttendance, generateShareToken, getWhatsAppText,
  } = useMatchDetail(id)

  const [scoreForm, setScoreForm]   = useState({ own: '', opp: '' })
  const [scoreEdit, setScoreEdit]   = useState(false)
  const [showShare, setShowShare]   = useState(false)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [copied, setCopied]         = useState(false)
  const [search, setSearch]         = useState('')

  if (loading) return (
    <div className="p-4 md:p-8 max-w-2xl space-y-3">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-28 rounded-2xl" />
      {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
    </div>
  )

  if (!match) return (
    <div className="p-8 text-center text-md-on-surface-variant">Spieltag nicht gefunden.</div>
  )

  const played = match.score_own !== null && match.score_opp !== null
  const won    = played && match.score_own > match.score_opp
  const draw   = played && match.score_own === match.score_opp

  async function handleScore(e) {
    e.preventDefault()
    await updateScore(scoreForm.own, scoreForm.opp)
    setScoreEdit(false)
  }

  async function handleGenerateToken() {
    setGeneratingToken(true)
    try {
      let planId
      const { supabase } = await import('../lib/supabase')
      const { data: existing } = await supabase.from('lineup_plans')
        .select('id').eq('match_id', id).maybeSingle()
      planId = existing?.id
      if (!planId) {
        const { data: newPlan } = await supabase.from('lineup_plans')
          .insert({ name: match.opponent, match_id: id })
          .select('id').single()
        planId = newPlan?.id
      }
      if (planId) await generateShareToken(planId)
    } finally { setGeneratingToken(false) }
  }

  function copyLink() {
    const url = `${window.location.origin}/share/${shareToken.token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken.token}` : null

  // Total minutes played by all players
  const totalMinutes = Object.values(attMap)
    .reduce((sum, a) => sum + (a.minutes_played ?? 0), 0)

  const filtered = players.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  // Sort: starters first, then subs, then absent
  const sorted = [...filtered].sort((a, b) => {
    const order = { starter: 0, substitute: 1, absent: 2 }
    return (order[attMap[a.id]?.status ?? 'absent'] ?? 2) - (order[attMap[b.id]?.status ?? 'absent'] ?? 2)
  })

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <button onClick={() => navigate('/matches')} className="btn-text px-0 mb-4 text-md-primary">
        <span className="material-symbols-outlined icon-sm">arrow_back</span>
        Alle Spieltage
      </button>

      {/* ── Header card ── */}
      <div className="card-outlined p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-medium text-md-on-surface">{match.opponent}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={match.home_away === 'Heim' ? 'primary' : 'neutral'}>{match.home_away}</Badge>
              <span className="text-sm text-md-on-surface-variant">
                {new Date(match.date).toLocaleDateString('de-DE', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
            </div>
          </div>
          {canEdit && (
            <button onClick={() => setShowShare(true)} className="btn-tonal py-2 px-3 text-xs shrink-0">
              <span className="material-symbols-outlined icon-sm">share</span>Teilen
            </button>
          )}
        </div>

        {/* Score */}
        <div className="mt-4 pt-4 border-t border-md-outline-variant">
          {scoreEdit ? (
            <form onSubmit={handleScore} className="flex items-center gap-3 flex-wrap">
              <input type="number" min="0" max="99"
                className="w-16 text-center text-xl font-bold border-2 border-md-primary rounded-xl py-2 focus:outline-none"
                value={scoreForm.own} onChange={e => setScoreForm(f => ({ ...f, own: e.target.value }))}
                autoFocus />
              <span className="text-2xl font-bold text-md-on-surface-variant">:</span>
              <input type="number" min="0" max="99"
                className="w-16 text-center text-xl font-bold border-2 border-md-primary rounded-xl py-2 focus:outline-none"
                value={scoreForm.opp} onChange={e => setScoreForm(f => ({ ...f, opp: e.target.value }))} />
              <button type="submit" className="btn-filled py-2 px-3 text-xs" disabled={saving}>OK</button>
              <button type="button" onClick={() => setScoreEdit(false)} className="btn-outlined py-2 px-3 text-xs">Abbrechen</button>
            </form>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              {played ? (
                <>
                  <span className={`text-3xl font-bold ${won ? 'text-green-600' : draw ? 'text-amber-600' : 'text-red-600'}`}>
                    {match.score_own} : {match.score_opp}
                  </span>
                  <span className="text-sm text-md-on-surface-variant">
                    {won ? 'Sieg' : draw ? 'Unentschieden' : 'Niederlage'}
                  </span>
                </>
              ) : (
                <span className="text-sm text-md-on-surface-variant italic">Kein Ergebnis eingetragen</span>
              )}
              {canEdit && (
                <button onClick={() => {
                  setScoreForm({ own: match.score_own ?? '', opp: match.score_opp ?? '' })
                  setScoreEdit(true)
                }} className="btn-text py-1 px-2 text-xs ml-auto">
                  <span className="material-symbols-outlined icon-sm">edit</span>
                  {played ? 'Ändern' : 'Ergebnis eintragen'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Summary row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-md-outline-variant flex-wrap text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
            <span className="font-medium">{starterCount}</span>
            <span className="text-md-outline">Starter</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span className="font-medium">{subCount}</span>
            <span className="text-md-outline">Einwechslungen</span>
          </span>
          {totalMinutes > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-md-outline" style={{ fontSize: 13 }}>schedule</span>
              <span className="font-medium">{totalMinutes}</span>
              <span className="text-md-outline">Gesamtminuten</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Player list ── */}
      <div className="card-outlined overflow-hidden mb-4">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-md-outline-variant">
          <span className="material-symbols-outlined icon-sm text-md-primary">groups</span>
          <h2 className="text-sm font-medium text-md-on-surface">Kader & Aufstellung</h2>
          {canEdit && (
            <span className="ml-auto text-xs text-md-outline">Tippe auf ○ zum Statuswechsel</span>
          )}
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-md-outline-variant">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 icon-sm text-md-outline">search</span>
            <input
              type="text"
              placeholder="Spieler suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-md-outline-variant bg-white text-sm focus:outline-none focus:border-md-primary"
            />
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="py-10 text-center text-sm text-md-on-surface-variant">Kein Spieler gefunden</div>
        ) : (
          sorted.map(p => (
            <PlayerRow
              key={p.id}
              player={p}
              att={attMap[p.id]}
              canEdit={canEdit}
              onUpsert={upsertAttendance}
            />
          ))
        )}
      </div>

      {/* ── Match notes ── */}
      {match.notes && (
        <div className="card-outlined p-4 mb-4">
          <p className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide mb-1">Spielnotizen</p>
          <p className="text-sm text-md-on-surface">{match.notes}</p>
        </div>
      )}

      {/* ── Share dialog ── */}
      {showShare && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-sm md:rounded-2xl rounded-t-2xl overflow-hidden shadow-el3">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
              <span className="material-symbols-outlined text-md-primary">share</span>
              <h2 className="text-base font-medium flex-1">Matchcard teilen</h2>
              <button onClick={() => setShowShare(false)} className="btn-icon w-8 h-8">
                <span className="material-symbols-outlined icon-sm">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {!shareToken ? (
                <button onClick={handleGenerateToken} disabled={generatingToken} className="btn-filled w-full justify-center">
                  {generatingToken
                    ? <><span className="material-symbols-outlined icon-sm animate-spin">progress_activity</span> Generiere…</>
                    : <><span className="material-symbols-outlined icon-sm">link</span> Öffentlichen Link erstellen</>
                  }
                </button>
              ) : (
                <>
                  <div className="flex justify-center">
                    <QRCodeDisplay url={shareUrl} />
                  </div>
                  <div className="flex gap-2">
                    <input readOnly value={shareUrl}
                      className="flex-1 text-xs border border-md-outline-variant rounded-xl px-3 py-2 bg-md-surface" />
                    <button onClick={copyLink} className="btn-tonal px-3 text-xs">
                      <span className="material-symbols-outlined icon-sm">{copied ? 'check' : 'content_copy'}</span>
                    </button>
                  </div>
                  <div className="text-xs text-md-on-surface-variant text-center">
                    Gültig bis {new Date(shareToken.expires_at).toLocaleDateString('de-DE')}
                  </div>
                </>
              )}
              <a
                href={`https://wa.me/?text=${getWhatsAppText()}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-outlined w-full justify-center text-green-600 border-green-200 hover:bg-green-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined icon-sm">chat</span>
                Per WhatsApp teilen
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
