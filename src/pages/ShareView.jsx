import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Same position system as Lineup.jsx
const ROW_Y = [0.88, 0.74, 0.60, 0.46, 0.32, 0.20, 0.10]

function resolveX(label, idx, total) {
    switch (label) {
        case 'TW': case 'MS': return 0.50
        case 'LV': case 'LM': case 'LA': return 0.12
        case 'RV': case 'RM': case 'RA': return 0.88
        case 'IV': case 'DM': case 'ZM': case 'ZOM':
            if (total === 1) return 0.50
            if (total === 2) return idx === 0 ? 0.37 : 0.63
            return [0.30, 0.50, 0.70][idx] ?? 0.50
        case 'ST':
            return total === 1 ? 0.50 : idx === 0 ? 0.37 : 0.63
        default:
            return total === 1 ? 0.50 : 0.15 + (0.70 / (total - 1)) * idx
    }
}

const PRESET_FORMATIONS = {
    '4-3-3': [['TW'], ['LV', 'IV', 'IV', 'RV'], ['DM', 'ZM', 'ZM'], ['LA', 'MS', 'RA']],
    '4-4-2': [['TW'], ['LV', 'IV', 'IV', 'RV'], ['LM', 'ZM', 'ZM', 'RM'], ['ST', 'ST']],
    '3-5-2': [['TW'], ['IV', 'IV', 'IV'], ['LM', 'DM', 'ZM', 'DM', 'RM'], ['ST', 'ST']],
    '4-2-3-1': [['TW'], ['LV', 'IV', 'IV', 'RV'], ['DM', 'DM'], ['LA', 'ZOM', 'RA'], ['ST']],
    '5-3-2': [['TW'], ['LV', 'IV', 'IV', 'IV', 'RV'], ['ZM', 'ZM', 'ZM'], ['ST', 'ST']],
}

function parseFormation(f) {
    if (PRESET_FORMATIONS[f]) return PRESET_FORMATIONS[f]
    try { return JSON.parse(f) } catch { return PRESET_FORMATIONS['4-3-3'] }
}

function buildSlots(rows) {
    const slots = []
    rows.forEach((row, ri) => {
        const counts = {}
        row.forEach(l => { counts[l] = (counts[l] ?? 0) + 1 })
        const seen = {}
        row.forEach((label, ci) => {
            const nth = seen[label] ?? 0; seen[label] = nth + 1
            slots.push({
                id: `slot_${ri}_${ci}`, label, row: ri, col: ci,
                x: resolveX(label, nth, counts[label]),
                y: ROW_Y[ri] ?? 0.50,
            })
        })
    })
    return slots
}

export default function ShareView() {
    const { token } = useParams()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        supabase.rpc('get_lineup_by_token', { p_token: token }).then(({ data: result, error: err }) => {
            if (err || result?.error) setError(result?.error ?? err.message)
            else setData(result)
            setLoading(false)
        })
    }, [token])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f0fdf9, #f4fbf9)' }}>
            <div className="text-center">
                <span className="material-symbols-outlined animate-spin text-md-outline" style={{ fontSize: 36 }}>
                    progress_activity
                </span>
                <p className="text-sm text-md-outline mt-3">Lade Aufstellung…</p>
            </div>
        </div>
    )

    if (error || !data) return (
        <div className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(135deg, #f0fdf9, #f4fbf9)' }}>
            <div className="text-center max-w-xs">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 32 }}>link_off</span>
                </div>
                <h1 className="text-lg font-bold text-md-on-surface mb-1"
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    Link ungültig oder abgelaufen
                </h1>
                <p className="text-sm text-md-outline">Bitte frage den Trainer nach einem neuen Link.</p>
            </div>
        </div>
    )

    const formation = data.formation ?? '4-3-3'
    const rows = parseFormation(formation)
    const slots = buildSlots(rows)
    const assigned = data.assigned ?? {}
    const players = data.players ?? []
    const playerMap = Object.fromEntries(players.map(p => [p.id, p]))
    const formLabel = PRESET_FORMATIONS[formation] ? formation : 'Custom'

    const starters = slots
        .filter(s => assigned[s.id])
        .map(s => ({ slot: s, player: playerMap[assigned[s.id]] }))
        .filter(x => x.player)

    return (
        <div className="min-h-screen"
            style={{ background: 'linear-gradient(135deg, #f0fdf9 0%, #e8f5f3 50%, #f4fbf9 100%)' }}>

            {/* ── Header ── */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-md-outline-variant/40 px-4 py-4 sticky top-0 z-10">
                <div className="max-w-lg mx-auto flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--md-primary)' }}>
                        <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>sports_soccer</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold text-md-on-surface truncate"
                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                            {data.name ?? 'Aufstellung'}
                        </h1>
                        <p className="text-xs text-md-outline">Formation: {formLabel}</p>
                    </div>
                    <span className="text-xs text-md-outline bg-md-surface px-2 py-1 rounded-lg border border-md-outline-variant/60">
                        {starters.length} Spieler
                    </span>
                </div>
            </div>

            <div className="max-w-lg mx-auto p-4 space-y-4">

                {/* ── Pitch ── */}
                <div className="relative rounded-2xl overflow-hidden shadow-lg"
                    style={{
                        background: 'linear-gradient(175deg, #1e6b1e 0%, #2d8a2d 40%, #2d8a2d 60%, #1e6b1e 100%)',
                        aspectRatio: '7/10',
                    }}>
                    {/* Field lines */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 140"
                        preserveAspectRatio="none" opacity={0.2}>
                        <rect x="10" y="5" width="80" height="130" fill="none" stroke="white" strokeWidth="0.8" />
                        <line x1="10" y1="70" x2="90" y2="70" stroke="white" strokeWidth="0.8" />
                        <circle cx="50" cy="70" r="12" fill="none" stroke="white" strokeWidth="0.8" />
                        <rect x="30" y="5" width="40" height="18" fill="none" stroke="white" strokeWidth="0.8" />
                        <rect x="30" y="117" width="40" height="18" fill="none" stroke="white" strokeWidth="0.8" />
                        <circle cx="50" cy="70" r="1" fill="white" />
                    </svg>

                    {/* Player tokens */}
                    {slots.map(slot => {
                        const player = playerMap[assigned[slot.id]]
                        return (
                            <div key={slot.id}
                                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                                style={{ left: `${slot.x * 100}%`, top: `${(1 - slot.y) * 100}%` }}>
                                <div className={`w-12 h-12 rounded-full border-2 flex flex-col items-center
                  justify-center text-center shadow-md transition-all
                  ${player
                                        ? 'bg-white border-white'
                                        : 'bg-white/15 border-white/40 border-dashed'}`}>
                                    {player ? (
                                        <>
                                            <span className="text-xs font-black text-md-on-surface leading-tight truncate px-1 max-w-full"
                                                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                                {player.name.split(' ').at(-1)}
                                            </span>
                                            {player.number && (
                                                <span className="text-xs text-md-outline leading-none tabular-nums"
                                                    style={{ fontFamily: "'DM Mono', monospace" }}>
                                                    #{player.number}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-white/40 text-xs font-medium">{slot.label}</span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Player list ── */}
                <div className="bg-white rounded-2xl border border-md-outline-variant/60 overflow-hidden shadow-sm">
                    <div className="px-4 py-3.5 border-b border-md-outline-variant/60 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-md-on-surface"
                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                            Aufstellung
                        </h2>
                        <span className="text-xs text-md-outline tabular-nums">{starters.length} Spieler</span>
                    </div>

                    {starters.length === 0 ? (
                        <div className="py-10 text-center text-sm text-md-outline">Keine Spieler eingetragen</div>
                    ) : (
                        <ul>
                            {starters.map(({ slot, player }, i) => (
                                <li key={slot.id}
                                    className={`flex items-center gap-3 px-4 py-3
                    ${i < starters.length - 1 ? 'border-b border-md-outline-variant/50' : ''}`}>
                                    {/* Position label */}
                                    <span className="text-xs font-bold text-md-outline w-9 shrink-0 tabular-nums"
                                        style={{ fontFamily: "'DM Mono', monospace" }}>
                                        {slot.label}
                                    </span>
                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-md-on-surface"
                                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                            {player.name}
                                        </p>
                                        {player.position && (
                                            <p className="text-xs text-md-outline">{player.position}</p>
                                        )}
                                    </div>
                                    {/* Number */}
                                    {player.number && (
                                        <span className="text-xs font-black text-md-outline/50 shrink-0 tabular-nums"
                                            style={{ fontFamily: "'DM Mono', monospace" }}>
                                            #{player.number}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <p className="text-center text-xs text-md-outline pb-4 flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>lock_open</span>
                    Öffentliche Ansicht · kein Login erforderlich
                </p>
            </div>
        </div>
    )
}