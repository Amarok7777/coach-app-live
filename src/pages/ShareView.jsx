import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Formation layout (same x/y logic as Lineup.jsx)
const FORMATIONS = {
  '4-3-3':  [['TW'],['LV','IV','IV','RV'],['DM','ZM','ZM'],['LA','MS','RA']],
  '4-4-2':  [['TW'],['LV','IV','IV','RV'],['LM','ZM','ZM','RM'],['ST','ST']],
  '3-5-2':  [['TW'],['IV','IV','IV'],['LM','DM','ZM','DM','RM'],['ST','ST']],
  '4-2-3-1':[['TW'],['LV','IV','IV','RV'],['DM','DM'],['LA','ZOM','RA'],['ST']],
  '5-3-2':  [['TW'],['LV','IV','IV','IV','RV'],['ZM','ZM','ZM'],['ST','ST']],
}

function buildSlots(formation) {
  const rows = FORMATIONS[formation] ?? FORMATIONS['4-3-3']
  return rows.flatMap((row, ri) =>
    row.map((label, ci) => ({ id: `slot_${ri}_${ci}`, label, row: ri, col: ci, rowLen: row.length }))
  )
}

function getXY(slot, totalRows) {
  const y = 100 - (slot.row / (totalRows - 1)) * 80 - 10
  const x = slot.rowLen === 1 ? 50
    : slot.rowLen === 2 ? [30, 70][slot.col]
    : slot.rowLen === 3 ? [20, 50, 80][slot.col]
    : slot.rowLen === 4 ? [15, 38, 62, 85][slot.col]
    : slot.rowLen === 5 ? [10, 27, 50, 73, 90][slot.col]
    : 50
  return { x, y }
}

export default function ShareView() {
  const { token } = useParams()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    async function load() {
      const { data: result, error } = await supabase.rpc('get_lineup_by_token', { p_token: token })
      if (error || result?.error) {
        setError(result?.error ?? error.message)
      } else {
        setData(result)
      }
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <span className="material-symbols-outlined animate-spin text-gray-400" style={{ fontSize: 40 }}>
          progress_activity
        </span>
        <p className="text-sm text-gray-500 mt-3">Lade Aufstellung...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm">
        <span className="material-symbols-outlined text-gray-300 mb-3" style={{ fontSize: 64 }}>link_off</span>
        <h1 className="text-lg font-medium text-gray-700 mb-1">Link ungültig oder abgelaufen</h1>
        <p className="text-sm text-gray-500">Bitte frage den Trainer nach einem neuen Link.</p>
      </div>
    </div>
  )

  const formation = data.formation ?? '4-3-3'
  const slots     = buildSlots(formation)
  const totalRows = (FORMATIONS[formation] ?? FORMATIONS['4-3-3']).length
  const assigned  = data.assigned ?? {}
  const players   = data.players ?? []
  const playerMap = Object.fromEntries(players.map(p => [p.id, p]))

  const starters = slots
    .filter(s => assigned[s.id])
    .map(s => ({ slot: s, player: playerMap[assigned[s.id]] }))
    .filter(x => x.player)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--md-primary, #1976D2)' }}>
            <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>sports_soccer</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-800">
              {data.name ?? 'Aufstellung'}
            </h1>
            <p className="text-xs text-gray-500">Formation: {formation}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Pitch */}
        <div
          className="relative rounded-2xl overflow-hidden w-full"
          style={{
            background: 'linear-gradient(to bottom, #2d7a2d 0%, #3a963a 50%, #2d7a2d 100%)',
            aspectRatio: '7/10',
          }}
        >
          {/* Field lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 140" preserveAspectRatio="none" opacity={0.25}>
            <rect x="10" y="5" width="80" height="130" fill="none" stroke="white" strokeWidth="0.8" />
            <line x1="10" y1="70" x2="90" y2="70" stroke="white" strokeWidth="0.8" />
            <circle cx="50" cy="70" r="12" fill="none" stroke="white" strokeWidth="0.8" />
            <rect x="30" y="5" width="40" height="18" fill="none" stroke="white" strokeWidth="0.8" />
            <rect x="30" y="117" width="40" height="18" fill="none" stroke="white" strokeWidth="0.8" />
          </svg>

          {/* Player tokens */}
          {slots.map(slot => {
            const { x, y } = getXY(slot, totalRows)
            const player = playerMap[assigned[slot.id]]
            return (
              <div
                key={slot.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className={`flex flex-col items-center gap-1`}>
                  <div className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center text-center
                    ${player ? 'bg-white border-white shadow-md' : 'bg-white/20 border-white/40 border-dashed'}`}>
                    {player ? (
                      <>
                        <span className="text-xs font-bold text-gray-800 leading-tight truncate px-1 max-w-full">
                          {player.name.split(' ').at(-1)}
                        </span>
                        {player.number && (
                          <span className="text-xs text-gray-500 leading-none">#{player.number}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-white/50 text-xs">{slot.label}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Player list */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-700">
            Aufstellung ({starters.length} Spieler)
          </div>
          {starters.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">Keine Spieler eingetragen</div>
          ) : (
            <ul>
              {starters.map(({ slot, player }, i) => (
                <li key={slot.id} className={`flex items-center gap-3 px-4 py-2.5 ${i < starters.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <span className="text-xs font-medium text-gray-400 w-8 shrink-0">{slot.label}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{player.name}</span>
                    {player.position && (
                      <span className="text-xs text-gray-400 ml-2">{player.position}</span>
                    )}
                  </div>
                  {player.number && (
                    <span className="text-xs text-gray-400 font-mono shrink-0">#{player.number}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          Diese Ansicht ist öffentlich — kein Login erforderlich
        </p>
      </div>
    </div>
  )
}
