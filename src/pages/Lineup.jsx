import { useState, useRef, useEffect } from 'react'
import {
  DndContext, closestCenter,
  PointerSensor, TouchSensor,
  useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useLineup } from '../hooks/useLineup'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'

// ─────────────────────────────────────────────────────────────
// POSITION SYSTEM — exact spec from requirements
//
// Rows (bottom → top on pitch):
//   Row 0  y=0.88  TW / MS        (always x=0.50)
//   Row 1  y=0.74  LV IV IV IV RV (1–5 slots)
//   Row 2  y=0.60  DM DM          (0–2 slots)
//   Row 3  y=0.46  LM ZM ZM RM    (0–4 slots)
//   Row 4  y=0.32  ZOM ZOM ZOM    (0–3 slots)
//   Row 5  y=0.20  LA  MS  RA     (0–3 slots)
//   Row 6  y=0.10  ST  ST         (0–2 slots)
//
// X-coordinates per position label:
//   TW, MS (single)  → 0.50
//   LV, LM, LA       → 0.12
//   RV, RM, RA       → 0.88
//   IV/DM/ZM/ZOM  1× → 0.50
//   IV/DM/ZM/ZOM  2× → 0.37 · 0.63
//   IV/ZM/ZOM     3× → 0.30 · 0.50 · 0.70
//   ST            1× → 0.50
//   ST            2× → 0.37 · 0.63
// ─────────────────────────────────────────────────────────────

const ROW_Y = [0.88, 0.74, 0.60, 0.46, 0.32, 0.20, 0.10]

// Fixed x per label — label + occurrence index + total count in row
function resolveX(label, idx, total) {
  switch (label) {
    case 'TW': case 'MS': return 0.50
    case 'LV': case 'LM': case 'LA': return 0.12
    case 'RV': case 'RM': case 'RA': return 0.88
    case 'IV': case 'DM': case 'ZM': case 'ZOM':
      if (total === 1) return 0.50
      if (total === 2) return idx === 0 ? 0.37 : 0.63
      if (total >= 3)  return [0.30, 0.50, 0.70][idx] ?? 0.50
      return 0.50
    case 'ST':
      if (total === 1) return 0.50
      return idx === 0 ? 0.37 : 0.63
    default:
      // Fallback for custom labels: distribute evenly
      if (total === 1) return 0.50
      return 0.15 + (0.70 / (total - 1)) * idx
  }
}

// Build slot list from a formation row array
// e.g. [['TW'],['LV','IV','IV','RV'],['ZM','ZM'],['ST','ST']]
function buildSlots(rows) {
  const slots = []
  rows.forEach((row, ri) => {
    // Count occurrences per label within this row
    const counts = {}
    row.forEach(l => { counts[l] = (counts[l] ?? 0) + 1 })
    const seen = {}
    row.forEach((label, ci) => {
      const nth   = seen[label] ?? 0
      seen[label] = nth + 1
      const total = counts[label]
      slots.push({
        id:    `slot_${ri}_${ci}`,
        label,
        row:   ri,
        col:   ci,
        x:     resolveX(label, nth, total),
        y:     ROW_Y[ri] ?? (0.88 - ri * 0.13),
      })
    })
  })
  return slots
}

// ─── Preset formations ────────────────────────────────────
const PRESET_FORMATIONS = {
  '4-3-3':   [['TW'],['LV','IV','IV','RV'],['DM','ZM','ZM'],['LA','MS','RA']],
  '4-4-2':   [['TW'],['LV','IV','IV','RV'],['LM','ZM','ZM','RM'],['ST','ST']],
  '3-5-2':   [['TW'],['IV','IV','IV'],['LM','DM','ZM','DM','RM'],['ST','ST']],
  '4-2-3-1': [['TW'],['LV','IV','IV','RV'],['DM','DM'],['LA','ZOM','RA'],['ST']],
  '5-3-2':   [['TW'],['LV','IV','IV','IV','RV'],['ZM','ZM','ZM'],['ST','ST']],
  '4-3-2-1': [['TW'],['LV','IV','IV','RV'],['ZM','ZM','ZM'],['ZOM','ZOM'],['ST']],
}

// ─── Custom formation editor ──────────────────────────────
const POSITION_OPTIONS = ['TW','LV','IV','RV','DM','LM','ZM','RM','ZOM','LA','MS','RA','ST']

function CustomFormationEditor({ rows, onChange }) {
  function addRow() {
    onChange([...rows, ['ZM']])
  }
  function removeRow(ri) {
    onChange(rows.filter((_, i) => i !== ri))
  }
  function addPosition(ri) {
    const next = rows.map((r, i) => i === ri ? [...r, 'ZM'] : r)
    onChange(next)
  }
  function removePosition(ri, ci) {
    const next = rows.map((r, i) => i === ri ? r.filter((_, j) => j !== ci) : r)
    onChange(next.filter(r => r.length > 0))
  }
  function changeLabel(ri, ci, val) {
    const next = rows.map((r, i) => i === ri ? r.map((l, j) => j === ci ? val : l) : r)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {[...rows].reverse().map((row, revIdx) => {
        const ri = rows.length - 1 - revIdx
        return (
          <div key={ri} className="flex items-center gap-1.5 flex-wrap bg-md-surface rounded-xl px-3 py-2">
            <span className="text-xs text-md-on-surface-variant w-14 shrink-0">
              {ri === 0 ? 'Tor' : ri === 1 ? 'Abwehr' : ri === rows.length - 1 ? 'Sturm' : `Reihe ${ri}`}
            </span>
            {row.map((label, ci) => (
              <div key={ci} className="flex items-center gap-0.5">
                <select
                  value={label}
                  onChange={e => changeLabel(ri, ci, e.target.value)}
                  className="text-xs border border-md-outline-variant rounded-lg px-1.5 py-1 bg-white"
                >
                  {POSITION_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button onClick={() => removePosition(ri, ci)}
                  className="w-4 h-4 rounded-full bg-md-error/20 text-md-error flex items-center justify-center">
                  <span className="material-symbols-outlined" style={{fontSize:10}}>close</span>
                </button>
              </div>
            ))}
            <button onClick={() => addPosition(ri)}
              className="text-xs text-md-primary flex items-center gap-0.5 px-1.5 py-1 rounded-lg hover:bg-md-primary/8">
              <span className="material-symbols-outlined" style={{fontSize:12}}>add</span>Pos
            </button>
            {ri > 0 && (
              <button onClick={() => removeRow(ri)}
                className="ml-auto text-xs text-md-error px-1.5 py-1 rounded-lg hover:bg-md-error/8">
                <span className="material-symbols-outlined" style={{fontSize:12}}>delete</span>
              </button>
            )}
          </div>
        )
      })}
      <button onClick={addRow}
        className="btn-outlined w-full py-1.5 text-xs justify-center">
        <span className="material-symbols-outlined icon-sm">add</span>Reihe hinzufügen
      </button>
    </div>
  )
}

// ─── Availability badge colors ────────────────────────────
const AVAIL_RING = {
  injured:   'ring-2 ring-red-500',
  suspended: 'ring-2 ring-orange-400',
  absent:    'ring-2 ring-amber-400',
  vacation:  'ring-2 ring-amber-300',
}
const AVAIL_ICON = { injured:'healing', suspended:'block', absent:'event_busy', vacation:'beach_access' }

// ─── Draggable player chip ────────────────────────────────
function DraggablePlayer({ player, avail }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: player.id })
  const ring = avail ? AVAIL_RING[avail] : ''
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      className={`flex items-center gap-1.5 bg-white rounded-xl px-2.5 py-1.5 shadow-sm
        cursor-grab active:cursor-grabbing select-none text-xs font-medium
        text-md-on-surface border border-md-outline-variant ${ring}
        ${isDragging ? 'opacity-40' : ''}`}
    >
      {player.number && <span className="text-md-outline">#{player.number}</span>}
      <span className="truncate max-w-[80px]">{player.name.split(' ').at(-1)}</span>
      {avail && (
        <span className="material-symbols-outlined text-red-500" style={{fontSize:13}}>
          {AVAIL_ICON[avail]}
        </span>
      )}
    </div>
  )
}

// ─── Pitch slot (droppable) ───────────────────────────────
function PitchSlot({ slot, player, avail, onRemove }) {
  const { isOver, setNodeRef } = useDroppable({ id: slot.id })
  const ring = avail ? AVAIL_RING[avail] : ''

  return (
    <div
      ref={setNodeRef}
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1
        transition-transform ${isOver ? 'scale-110' : ''}`}
      style={{ left: `${slot.x * 100}%`, top: `${(1 - slot.y) * 100}%`, minWidth: 60 }}
    >
      <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center
        text-center transition-all select-none
        ${player
          ? `bg-md-primary-container border-md-primary ${ring}`
          : isOver
            ? 'bg-white/60 border-white'
            : 'bg-white/25 border-white/60 border-dashed'
        }`}
      >
        {player ? (
          <>
            <span className="text-xs font-bold text-md-primary leading-tight truncate px-1 max-w-full">
              {player.name.split(' ').at(-1)}
            </span>
            {player.number && (
              <span className="text-xs text-md-primary/70 leading-none">#{player.number}</span>
            )}
            {avail && (
              <span className="material-symbols-outlined text-red-500" style={{fontSize:11}}>
                {AVAIL_ICON[avail]}
              </span>
            )}
          </>
        ) : (
          <span className="text-white/70 text-xs font-medium">{slot.label}</span>
        )}
      </div>
      {player && onRemove && (
        <button
          onClick={() => onRemove(slot.id)}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-md-error
            flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-white" style={{fontSize:10}}>close</span>
        </button>
      )}
    </div>
  )
}

// ─── QR code ─────────────────────────────────────────────
function QRDisplay({ url }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!url || !ref.current) return
    import('qrcode').then(QR => QR.toCanvas(ref.current, url, { width: 160, margin: 1 })).catch(() => {})
  }, [url])
  return <canvas ref={ref} className="rounded-lg mx-auto" />
}

// ─── Main page ────────────────────────────────────────────
export default function Lineup() {
  const {
    plans, plan, players, availability, shareToken,
    loading, saving,
    selectPlan, createPlan, savePlan, generateShare, renamePlan,
  } = useLineup()

  const [assigned, setAssigned]     = useState({})
  const [rows, setRows]             = useState(PRESET_FORMATIONS['4-3-3'])
  const [formation, setFormation]   = useState('4-3-3')
  const [isCustom, setIsCustom]     = useState(false)
  const [showCustomEditor, setShowCustomEditor] = useState(false)
  const [dragActive, setDragActive] = useState(null)
  const [showShare, setShowShare]   = useState(false)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [copied, setCopied]         = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue]   = useState('')

  useEffect(() => {
    if (!plan) return
    setAssigned(plan.assigned ?? {})
    const f = plan.formation ?? '4-3-3'
    if (PRESET_FORMATIONS[f]) {
      setFormation(f)
      setRows(PRESET_FORMATIONS[f])
      setIsCustom(false)
    } else {
      // Custom formation stored as JSON string in formation field
      try {
        const parsed = JSON.parse(f)
        setRows(parsed)
        setFormation('custom')
        setIsCustom(true)
      } catch {
        setFormation(f)
        setRows(PRESET_FORMATIONS[f] ?? PRESET_FORMATIONS['4-3-3'])
        setIsCustom(false)
      }
    }
    setNameValue(plan.name ?? 'Aufstellung')
  }, [plan?.id])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const slots              = buildSlots(rows)
  const assignedPlayerIds  = new Set(Object.values(assigned))
  const unassigned         = players.filter(p => !assignedPlayerIds.has(p.id))

  function applyPreset(f) {
    setFormation(f)
    setRows(PRESET_FORMATIONS[f])
    setIsCustom(false)
    savePlan({ formation: f })
  }

  function applyCustomRows(newRows) {
    setRows(newRows)
    setIsCustom(true)
    setFormation('custom')
    savePlan({ formation: JSON.stringify(newRows), customActive: true })
  }

  function handleDragStart(e) { setDragActive(e.active.id) }

  function handleDragEnd(e) {
    setDragActive(null)
    const { active, over } = e
    if (!over || !over.id.startsWith('slot_')) return
    const playerId = active.id
    const slotId   = over.id
    const next = Object.fromEntries(Object.entries(assigned).filter(([, pid]) => pid !== playerId))
    next[slotId] = playerId
    setAssigned(next)
    savePlan({ assigned: next })
  }

  function removeFromSlot(slotId) {
    const next = { ...assigned }
    delete next[slotId]
    setAssigned(next)
    savePlan({ assigned: next })
  }

  async function handleRename(e) {
    e.preventDefault()
    if (!nameValue.trim()) return
    await renamePlan(nameValue.trim())
    setEditingName(false)
  }

  async function handleGenerateShare() {
    setGeneratingToken(true)
    try { await generateShare() } finally { setGeneratingToken(false) }
  }

  function copyLink() {
    const url = `${window.location.origin}/share/${shareToken.token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  function getWhatsApp() {
    const lines = slots
      .filter(s => assigned[s.id])
      .map(s => {
        const p = players.find(pl => pl.id === assigned[s.id])
        return `${s.label}: ${p?.name ?? ''}`
      })
    const planName = plan?.name ?? 'Aufstellung'
    const fName    = isCustom ? 'Custom' : formation
    return encodeURIComponent(
      `⚽ ${planName}\nFormation: ${fName}\n\n${lines.join('\n')}`
    )
  }

  if (loading) return (
    <div className="p-4 md:p-8 max-w-5xl space-y-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken.token}` : null

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {editingName ? (
            <form onSubmit={handleRename} className="flex items-center gap-2">
              <input
                autoFocus
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                className="text-lg font-medium border-b-2 border-md-primary bg-transparent focus:outline-none"
              />
              <button type="submit" className="btn-icon w-7 h-7 text-md-primary">
                <span className="material-symbols-outlined icon-sm">check</span>
              </button>
              <button type="button" onClick={() => setEditingName(false)} className="btn-icon w-7 h-7">
                <span className="material-symbols-outlined icon-sm">close</span>
              </button>
            </form>
          ) : (
            <>
              <h1 className="text-xl font-medium text-md-on-surface">
                {plan?.name ?? 'Aufstellungsplaner'}
              </h1>
              {plan && (
                <button onClick={() => { setEditingName(true); setNameValue(plan.name ?? 'Aufstellung') }}
                  className="btn-icon w-7 h-7 text-md-outline">
                  <span className="material-symbols-outlined icon-sm">edit</span>
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Plan selector */}
          <select
            value={plan?.id ?? ''}
            onChange={e => selectPlan(e.target.value)}
            className="text-sm rounded-xl border border-md-outline-variant bg-white px-3 py-2 focus:outline-none"
          >
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => createPlan('Neue Aufstellung')}
            className="btn-outlined py-2 px-3 text-xs">
            <span className="material-symbols-outlined icon-sm">add</span>Neu
          </button>
          <button onClick={() => setShowShare(true)} className="btn-tonal py-2 px-3 text-xs">
            <span className="material-symbols-outlined icon-sm">share</span>Teilen
          </button>
        </div>
      </div>

      {/* Formation selector */}
      <div className="flex gap-2 mb-2 flex-wrap items-center">
        {Object.keys(PRESET_FORMATIONS).map(f => (
          <button key={f} onClick={() => applyPreset(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors
              ${!isCustom && formation === f
                ? 'bg-md-primary text-white border-md-primary'
                : 'border-md-outline-variant text-md-on-surface hover:bg-md-surface'}`}>
            {f}
          </button>
        ))}
        <button
          onClick={() => setShowCustomEditor(s => !s)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1
            ${isCustom
              ? 'bg-amber-500 text-white border-amber-500'
              : 'border-md-outline-variant text-md-on-surface hover:bg-md-surface'}`}
        >
          <span className="material-symbols-outlined" style={{fontSize:13}}>tune</span>
          Custom{isCustom ? ' ✓' : ''}
        </button>
      </div>

      {/* Custom formation editor */}
      {showCustomEditor && (
        <div className="card-outlined p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-md-on-surface">Eigene Formation</h3>
            <button onClick={() => setShowCustomEditor(false)} className="btn-icon w-7 h-7">
              <span className="material-symbols-outlined icon-sm">close</span>
            </button>
          </div>
          <CustomFormationEditor rows={rows} onChange={applyCustomRows} />
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Pitch */}
          <div className="flex-1">
            <div
              className="relative rounded-2xl overflow-hidden w-full"
              style={{
                background: 'linear-gradient(to bottom, #2d7a2d 0%, #3a963a 50%, #2d7a2d 100%)',
                aspectRatio: '7/10',
                minHeight: 380,
              }}
            >
              {/* Field markings */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 140"
                preserveAspectRatio="none" opacity={0.25}>
                <rect x="10" y="5" width="80" height="130" fill="none" stroke="white" strokeWidth="0.8"/>
                <line x1="10" y1="70" x2="90" y2="70" stroke="white" strokeWidth="0.8"/>
                <circle cx="50" cy="70" r="12" fill="none" stroke="white" strokeWidth="0.8"/>
                <rect x="30" y="5" width="40" height="18" fill="none" stroke="white" strokeWidth="0.8"/>
                <rect x="30" y="117" width="40" height="18" fill="none" stroke="white" strokeWidth="0.8"/>
                <circle cx="50" cy="70" r="1" fill="white"/>
              </svg>

              {slots.map(slot => {
                const playerId = assigned[slot.id]
                const player   = playerId ? players.find(p => p.id === playerId) : null
                const avail    = player ? availability[player.id] : null
                return (
                  <PitchSlot
                    key={slot.id}
                    slot={slot}
                    player={player}
                    avail={avail}
                    onRemove={removeFromSlot}
                  />
                )
              })}
            </div>
          </div>

          {/* Bench */}
          <div className="w-full md:w-56 space-y-3">
            <div className="card-outlined overflow-hidden">
              <div className="px-3 py-2.5 border-b border-md-outline-variant text-xs font-medium
                text-md-on-surface-variant uppercase tracking-wider">
                Bank / Verfügbar ({unassigned.length})
              </div>
              <div className="p-3 flex flex-wrap gap-2 max-h-80 overflow-y-auto">
                {unassigned.length === 0 && (
                  <p className="text-xs text-md-on-surface-variant w-full text-center py-4">
                    Alle Spieler eingeteilt
                  </p>
                )}
                {unassigned.map(p => (
                  <DraggablePlayer key={p.id} player={p} avail={availability[p.id]} />
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="card-outlined p-3 space-y-1.5">
              <p className="text-xs font-medium text-md-on-surface-variant mb-1">Legende</p>
              {[
                { color: 'bg-red-500',    label: 'Verletzt' },
                { color: 'bg-orange-400', label: 'Gesperrt' },
                { color: 'bg-amber-400',  label: 'Abwesend' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-md-on-surface-variant">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  {label}
                </div>
              ))}
            </div>

            {saving && (
              <p className="text-xs text-md-on-surface-variant text-center flex items-center justify-center gap-1">
                <span className="material-symbols-outlined icon-sm animate-spin">progress_activity</span>
                Speichert…
              </p>
            )}
          </div>
        </div>

        <DragOverlay>
          {dragActive && (() => {
            const p = players.find(pl => pl.id === dragActive)
            if (!p) return null
            return (
              <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-el3 text-xs font-medium
                text-md-on-surface border border-md-primary">
                {p.number && `#${p.number} `}{p.name.split(' ').at(-1)}
              </div>
            )
          })()}
        </DragOverlay>
      </DndContext>

      {/* Share Dialog */}
      {showShare && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-sm md:rounded-2xl rounded-t-2xl overflow-hidden shadow-el3">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
              <span className="material-symbols-outlined text-md-primary">share</span>
              <h2 className="text-base font-medium flex-1">Aufstellung teilen</h2>
              <button onClick={() => setShowShare(false)} className="btn-icon w-8 h-8">
                <span className="material-symbols-outlined icon-sm">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {!shareToken ? (
                <button onClick={handleGenerateShare} disabled={generatingToken}
                  className="btn-filled w-full justify-center">
                  <span className="material-symbols-outlined icon-sm">link</span>
                  {generatingToken ? 'Generiere…' : 'Öffentlichen Link erstellen'}
                </button>
              ) : (
                <>
                  <QRDisplay url={shareUrl} />
                  <div className="flex gap-2">
                    <input readOnly value={shareUrl}
                      className="flex-1 text-xs border border-md-outline-variant rounded-xl px-3 py-2 bg-md-surface" />
                    <button onClick={copyLink} className="btn-tonal px-3 text-xs">
                      <span className="material-symbols-outlined icon-sm">
                        {copied ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </>
              )}
              <a href={`https://wa.me/?text=${getWhatsApp()}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-outlined w-full justify-center text-green-600 border-green-200 hover:bg-green-50">
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
