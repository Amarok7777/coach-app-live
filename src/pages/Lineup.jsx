/**
 * Lineup.jsx — Aufstellungsplaner
 *
 * POSITIONS (fixed slots on pitch):
 *   TW  — 1x  Torwart             (Tor, Mitte)
 *   IV  — 3x  Innenverteidiger     (Abwehr, 3 zentrale Positionen)
 *   AV  — 2x  Außenverteidiger     (Abwehr, Links + Rechts)
 *   DM  — 2x  Def. Mittelfeld      (vor Abwehr, Links + Rechts)
 *   ZM  — 3x  Zentr. Mittelfeld    (Mittelfeld, 3 zentrale)
 *   AM  — 2x  Äußerer Mittelfeld   (Mittelfeld, Links + Rechts)
 *   OM  — 3x  Off. Mittelfeld      (hinter Sturm, 3 zentrale)
 *   AS  — 2x  Äußerer Stürmer      (Angriff, Links + Rechts)
 *   ST  — 2x  Stürmer              (Sturm, zentral)
 *
 * SLOT IDs sind stabil (positions-basiert, nicht reihen-basiert):
 *   "TW", "IV_L","IV_C","IV_R", "AV_L","AV_R",
 *   "DM_L","DM_R", "ZM_L","ZM_C","ZM_R", "AM_L","AM_R",
 *   "OM_L","OM_C","OM_R", "AS_L","AS_R", "ST_L","ST_R"
 *
 * FORMATIONEN steuern welche Slots AKTIV sind (sichtbar+belegbar).
 * Inaktive Slots werden grau angezeigt aber nicht belegt.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

import { useLineup } from '../hooks/useLineup'
import Skeleton from '../components/Skeleton'

// ─────────────────────────────────────────────────────────────
// 1. FIXED SLOT DEFINITIONS
//    Jede Position hat eine feste (x,y) auf dem Feld.
//    x: 0=links, 1=rechts  |  y: 0=oben(Angriff), 1=unten(Tor)
// ─────────────────────────────────────────────────────────────

// ── Static slot definitions (y fixed, x recalculated dynamically) ──
// x here is only a fallback; real x comes from computeSlotPositions()
const ALL_SLOTS = [
    // Tor
    { id: 'TW', label: 'TW', fullLabel: 'Torwart', y: 0.92, group: 'fixed', fixedX: 0.50 },
    // Abwehr — AV always on wings, IV dynamic center
    { id: 'AV_L', label: 'AV', fullLabel: 'Außenverteidiger L', y: 0.78, group: 'fixed', fixedX: 0.13 },
    { id: 'IV_L', label: 'IV', fullLabel: 'Innenverteidiger L', y: 0.78, group: 'iv' },
    { id: 'IV_C', label: 'IV', fullLabel: 'Innenverteidiger M', y: 0.78, group: 'iv' },
    { id: 'IV_R', label: 'IV', fullLabel: 'Innenverteidiger R', y: 0.78, group: 'iv' },
    { id: 'AV_R', label: 'AV', fullLabel: 'Außenverteidiger R', y: 0.78, group: 'fixed', fixedX: 0.87 },
    // Defensives MF — dynamic center
    { id: 'DM_L', label: 'DM', fullLabel: 'Def. Mittelfeld L', y: 0.63, group: 'dm' },
    { id: 'DM_R', label: 'DM', fullLabel: 'Def. Mittelfeld R', y: 0.63, group: 'dm' },
    // Mittelfeldzone — AM always on wings, ZM dynamic center
    { id: 'AM_L', label: 'AM', fullLabel: 'Äuß. Mittelfeld L', y: 0.49, group: 'fixed', fixedX: 0.13 },
    { id: 'ZM_L', label: 'ZM', fullLabel: 'Zentr. Mittelfeld L', y: 0.49, group: 'zm' },
    { id: 'ZM_C', label: 'ZM', fullLabel: 'Zentr. Mittelfeld M', y: 0.49, group: 'zm' },
    { id: 'ZM_R', label: 'ZM', fullLabel: 'Zentr. Mittelfeld R', y: 0.49, group: 'zm' },
    { id: 'AM_R', label: 'AM', fullLabel: 'Äuß. Mittelfeld R', y: 0.49, group: 'fixed', fixedX: 0.87 },
    // Offensives MF — dynamic center
    { id: 'OM_L', label: 'OM', fullLabel: 'Off. Mittelfeld L', y: 0.35, group: 'om' },
    { id: 'OM_C', label: 'OM', fullLabel: 'Off. Mittelfeld M', y: 0.35, group: 'om' },
    { id: 'OM_R', label: 'OM', fullLabel: 'Off. Mittelfeld R', y: 0.35, group: 'om' },
    // Außenstürmer always on wings
    { id: 'AS_L', label: 'AS', fullLabel: 'Äuß. Stürmer L', y: 0.22, group: 'fixed', fixedX: 0.13 },
    { id: 'AS_R', label: 'AS', fullLabel: 'Äuß. Stürmer R', y: 0.22, group: 'fixed', fixedX: 0.87 },
    // Sturm — dynamic center
    { id: 'ST_L', label: 'ST', fullLabel: 'Stürmer L', y: 0.20, group: 'st' },
    { id: 'ST_R', label: 'ST', fullLabel: 'Stürmer R', y: 0.20, group: 'st' },
]

const SLOT_BY_ID = Object.fromEntries(ALL_SLOTS.map(s => [s.id, s]))

// ── Dynamic x-position calculation ───────────────────────────
function spreadCentered(n, gap) {
    if (n === 0) return []
    if (n === 1) return [0.50]
    const half = (n - 1) / 2
    return Array.from({ length: n }, (_, i) => 0.50 + (i - half) * gap)
}

const GROUP_GAP = {
    iv: 0.18,
    dm: 0.14,
    zm: 0.17,
    om: 0.20,
    st: 0.16,
}

const GROUP_ORDER = {
    iv: ['IV_L', 'IV_C', 'IV_R'],
    dm: ['DM_L', 'DM_R'],
    zm: ['ZM_L', 'ZM_C', 'ZM_R'],
    om: ['OM_L', 'OM_C', 'OM_R'],
    st: ['ST_L', 'ST_R'],
}

function computeSlotPositions(activeSlotIds) {
    const activeSet = new Set(activeSlotIds)
    const positions = {}

    for (const slot of ALL_SLOTS) {
        if (!activeSet.has(slot.id)) continue
        if (slot.group === 'fixed') {
            positions[slot.id] = { x: slot.fixedX, y: slot.y }
        }
    }

    for (const [group, orderedIds] of Object.entries(GROUP_ORDER)) {
        const active = orderedIds.filter(id => activeSet.has(id))
        const gap = GROUP_GAP[group]
        const xs = spreadCentered(active.length, gap)
        active.forEach((id, i) => {
            const slot = SLOT_BY_ID[id]
            positions[id] = { x: xs[i], y: slot.y }
        })
    }

    return positions
}

// ─────────────────────────────────────────────────────────────
// 2. FORMATIONS
// ─────────────────────────────────────────────────────────────

const FORMATIONS = {
    '4-3-3': {
        active: ['TW', 'AV_L', 'IV_L', 'IV_R', 'AV_R', 'ZM_L', 'ZM_C', 'ZM_R', 'AS_L', 'ST_L', 'AS_R'],
        label: '4-3-3',
    },
    '4-4-2': {
        active: ['TW', 'AV_L', 'IV_L', 'IV_R', 'AV_R', 'AM_L', 'ZM_L', 'ZM_R', 'AM_R', 'ST_L', 'ST_R'],
        label: '4-4-2',
    },
    '4-2-3-1': {
        active: ['TW', 'AV_L', 'IV_L', 'IV_R', 'AV_R', 'DM_L', 'DM_R', 'AS_L', 'OM_C', 'AS_R', 'ST_L'],
        label: '4-2-3-1',
    },
    '4-3-2-1': {
        active: ['TW', 'AV_L', 'IV_L', 'IV_R', 'AV_R', 'ZM_L', 'ZM_C', 'ZM_R', 'OM_L', 'OM_R', 'ST_L'],
        label: '4-3-2-1',
    },
    '4-1-4-1': {
        active: ['TW', 'AV_L', 'IV_L', 'IV_R', 'AV_R', 'ZM_C', 'AM_L', 'ZM_L', 'ZM_R', 'AM_R', 'ST_L'],
        label: '4-1-4-1',
    },
    '3-5-2': {
        active: ['TW', 'IV_L', 'IV_C', 'IV_R', 'AM_L', 'DM_L', 'ZM_C', 'DM_R', 'AM_R', 'ST_L', 'ST_R'],
        label: '3-5-2',
    },
    '3-4-3': {
        active: ['TW', 'IV_L', 'IV_C', 'IV_R', 'AM_L', 'ZM_L', 'ZM_R', 'AM_R', 'AS_L', 'ST_L', 'AS_R'],
        label: '3-4-3',
    },
    '5-3-2': {
        active: ['TW', 'AV_L', 'IV_L', 'IV_C', 'IV_R', 'AV_R', 'ZM_L', 'ZM_C', 'ZM_R', 'ST_L', 'ST_R'],
        label: '5-3-2',
    },
    '5-4-1': {
        active: ['TW', 'AV_L', 'IV_L', 'IV_C', 'IV_R', 'AV_R', 'AM_L', 'ZM_L', 'ZM_R', 'AM_R', 'ST_L'],
        label: '5-4-1',
    },
    '4-4-2 DM': {
        active: ['TW', 'AV_L', 'IV_L', 'IV_R', 'AV_R', 'DM_L', 'DM_R', 'AM_L', 'AM_R', 'ST_L', 'ST_R'],
        label: '4-4-2 DM',
    },
    '4-2-4': {
        active: ['TW', 'AV_L', 'IV_L', 'IV_R', 'AV_R', 'DM_L', 'DM_R', 'AS_L', 'ST_L', 'ST_R', 'AS_R'],
        label: '4-2-4',
    },
    '3-4-2-1': {
        active: ['TW', 'IV_L', 'IV_C', 'IV_R', 'AM_L', 'ZM_L', 'ZM_R', 'AM_R', 'OM_L', 'OM_R', 'ST_L'],
        label: '3-4-2-1',
    },
}

const DEFAULT_FORMATION = '4-4-2'

function parseFormation(stored) {
    if (!stored) return { key: DEFAULT_FORMATION, active: FORMATIONS[DEFAULT_FORMATION].active }
    if (FORMATIONS[stored]) return { key: stored, active: FORMATIONS[stored].active }
    try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) return { key: 'custom', active: parsed }
    } catch { }
    return { key: DEFAULT_FORMATION, active: FORMATIONS[DEFAULT_FORMATION].active }
}

const POSITION_OPTIONS = ALL_SLOTS.map(s => ({ id: s.id, label: s.label, fullLabel: s.fullLabel }))

// ─────────────────────────────────────────────────────────────
// 3. AVAILABILITY STYLING
// ─────────────────────────────────────────────────────────────
const AVAIL_STYLE = {
    injured: { ring: 'ring-2 ring-red-500', dot: 'bg-red-500', icon: 'healing', label: 'Verletzt' },
    suspended: { ring: 'ring-2 ring-orange-400', dot: 'bg-orange-400', icon: 'block', label: 'Gesperrt' },
    absent: { ring: 'ring-2 ring-amber-400', dot: 'bg-amber-400', icon: 'event_busy', label: 'Abwesend' },
    vacation: { ring: 'ring-2 ring-yellow-400', dot: 'bg-yellow-400', icon: 'beach_access', label: 'Urlaub' },
}

// ─────────────────────────────────────────────────────────────
// 4. PITCH SLOT COMPONENT (droppable + position adjustment)
// ─────────────────────────────────────────────────────────────
function ratingColor(rating) {
    if (!rating) return null
    if (rating >= 7.5) return { bg: '#16a34a', text: 'white' }
    if (rating >= 6.0) return { bg: '#ca8a04', text: 'white' }
    return { bg: '#dc2626', text: 'white' }
}

function PitchSlot({ slot, player, availType, selected, onTap, onRemove, adjustment, onAdjust }) {
    const avail = availType ? AVAIL_STYLE[availType] : null
    const rating = player?.avg_match_rating ?? null
    const rc = ratingColor(rating)
    const isEmpty = !player

    return (
        <div
            onClick={() => onTap(slot.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%`, zIndex: 20 }}
            onMouseEnter={e => { const b = e.currentTarget.querySelector('.remove-btn'); if (b) b.style.opacity = '1' }}
            onMouseLeave={e => { const b = e.currentTarget.querySelector('.remove-btn'); if (b) b.style.opacity = '0' }}
        >
            {isEmpty ? (
                /* ── Empty slot ── */
                <div className={`
          w-12 h-12 rounded-full border-2 border-dashed
          flex items-center justify-center
          transition-all duration-150 select-none
          ${selected
                        ? 'bg-white/40 border-white scale-110 shadow-xl ring-4 ring-white/30 animate-pulse'
                        : 'bg-white/10 border-white/40 hover:bg-white/25 hover:border-white/70'
                    }
        `}>
                    <span
                        className="text-white/60 font-bold select-none"
                        style={{ fontSize: 9, fontFamily: "'DM Mono', monospace" }}
                    >
                        {slot.label}
                    </span>
                </div>
            ) : (
                /* ── Occupied slot ── */
                <div className={`
          relative select-none transition-all duration-150
          hover:scale-105 ${selected ? 'scale-105' : ''}
        `}>
                    {/* SVG avatar circle */}
                    <svg
                        width="52" height="52"
                        viewBox="0 0 52 52"
                        style={{ display: 'block', filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.55))' }}
                    >
                        <defs>
                            <clipPath id={`clip-${slot.id}`}>
                                <circle cx="26" cy="26" r="24" />
                            </clipPath>
                        </defs>

                        {/* White background */}
                        <circle cx="26" cy="26" r="24" fill="rgba(255,255,255,0.96)" />

                        {/* Bottom rating / availability band */}
                        <rect
                            x="2" y="35" width="48" height="15"
                            clipPath={`url(#clip-${slot.id})`}
                            fill={
                                avail
                                    ? (avail.dot.includes('red') ? '#dc2626' : avail.dot.includes('orange') ? '#ea580c' : '#ca8a04')
                                    : rc
                                        ? rc.bg
                                        : 'rgba(0,0,0,0.45)'
                            }
                        />

                        {/* Selection / availability ring */}
                        <circle
                            cx="26" cy="26" r="24"
                            fill="none"
                            strokeWidth="2.5"
                            stroke={
                                selected
                                    ? 'white'
                                    : avail
                                        ? (avail.dot.includes('red') ? '#ef4444' : avail.dot.includes('orange') ? '#f97316' : '#fbbf24')
                                        : 'rgba(255,255,255,0.5)'
                            }
                        />

                        {/* Initials */}
                        <text
                            x="26" y="28"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{
                                fontFamily: "'DM Sans', system-ui, sans-serif",
                                fontSize: 15,
                                fontWeight: 900,
                                fill: '#161d1c',
                            }}
                        >
                            {player.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')}
                        </text>

                        {/* Rating / label text in band */}
                        <text
                            x="26" y="44"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 9,
                                fontWeight: 900,
                                fill: avail ? 'white' : rc ? rc.text : 'rgba(255,255,255,0.75)',
                            }}
                        >
                            {avail
                                ? avail.label.slice(0, 5)
                                : rc
                                    ? `${rating}★`
                                    : slot.label
                            }
                        </text>
                    </svg>

                    {/* ── Position adjustment chevrons ── */}
                    {/* Rendered below the avatar; clicking does NOT propagate to slot tap */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginTop: 3,
                            display: 'flex',
                            gap: 3,
                            zIndex: 25,
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* ▲ Up — move toward attack (lower y value) */}
                        <button
                            onClick={e => { e.stopPropagation(); onAdjust(slot.id, 'up') }}
                            title="Weiter nach vorne"
                            disabled={adjustment === 'down'}
                            style={{
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: adjustment === 'down' ? 'not-allowed' : 'pointer',
                                background: adjustment === 'up'
                                    ? 'rgba(34,197,94,0.90)'   // active green
                                    : adjustment === 'down'
                                        ? 'rgba(0,0,0,0.18)'   // greyed out
                                        : 'rgba(0,0,0,0.38)',  // neutral
                                transition: 'background 0.15s',
                                padding: 0,
                            }}
                        >
                            <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                                <path
                                    d="M1 6L5 1L9 6"
                                    stroke={adjustment === 'down' ? 'rgba(255,255,255,0.25)' : 'white'}
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>

                        {/* ▼ Down — move toward goal (higher y value) */}
                        <button
                            onClick={e => { e.stopPropagation(); onAdjust(slot.id, 'down') }}
                            title="Weiter nach hinten"
                            disabled={adjustment === 'up'}
                            style={{
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: adjustment === 'up' ? 'not-allowed' : 'pointer',
                                background: adjustment === 'down'
                                    ? 'rgba(239,68,68,0.90)'   // active red
                                    : adjustment === 'up'
                                        ? 'rgba(0,0,0,0.18)'   // greyed out
                                        : 'rgba(0,0,0,0.38)',  // neutral
                                transition: 'background 0.15s',
                                padding: 0,
                            }}
                        >
                            <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                                <path
                                    d="M1 1L5 6L9 1"
                                    stroke={adjustment === 'up' ? 'rgba(255,255,255,0.25)' : 'white'}
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Remove × button */}
            {player && onRemove && (
                <button
                    onClick={e => { e.stopPropagation(); onRemove(slot.id) }}
                    className="remove-btn"
                    style={{
                        position: 'absolute', top: -5, right: -5,
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#ef4444', border: '2px solid white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 30, cursor: 'pointer',
                        opacity: 0, transition: 'opacity 0.15s',
                    }}
                >
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 10, lineHeight: 1 }}>close</span>
                </button>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// 5. SQUAD ROW (FM-style side panel row)
// ─────────────────────────────────────────────────────────────
function SquadRow({ player, availType, selected, isOnPitch, onTap }) {
    const avail = availType ? AVAIL_STYLE[availType] : null
    const rating = player?.avg_match_rating ?? null
    const rc = ratingColor(rating)

    const POS_SHORT = {
        'Torwart': 'TW', 'Innenverteidiger': 'IV', 'Außenverteidiger': 'AV',
        'Defensives Mittelfeld': 'DM', 'Zentrales Mittelfeld': 'ZM', 'Offensives Mittelfeld': 'OM',
        'Linksaußen': 'LA', 'Rechtsaußen': 'RA', 'Stürmer': 'ST',
    }
    const posShort = POS_SHORT[player.position] ?? player.position?.slice(0, 2).toUpperCase() ?? '–'

    return (
        <div
            onClick={e => { e.stopPropagation(); if (!isOnPitch) onTap(player.id) }}
            className={`
        flex items-center gap-2 px-3 py-2 border-b border-md-outline-variant/40
        last:border-0 transition-all duration-100 select-none
        ${isOnPitch
                    ? 'opacity-40 cursor-default bg-md-surface/30'
                    : selected
                        ? 'bg-md-primary/8'
                        : 'hover:bg-md-surface/60 cursor-pointer'
                }
      `}
        >
            {/* Selected indicator bar */}
            <div className={`w-1 h-8 rounded-full shrink-0 transition-all ${selected ? 'bg-md-primary' : 'bg-transparent'}`} />

            {/* Jersey number */}
            <span
                className="w-5 text-center font-black tabular-nums shrink-0"
                style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 11,
                    color: isOnPitch ? 'var(--md-outline)' : 'var(--md-on-surface)',
                }}
            >
                {player.number ?? '–'}
            </span>

            {/* Position badge */}
            <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0 w-7 text-center"
                style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9,
                    background: isOnPitch ? 'rgba(0,0,0,0.08)' : 'rgba(0,106,96,0.12)',
                    color: isOnPitch ? 'var(--md-outline)' : 'var(--md-primary)',
                }}
            >
                {posShort}
            </span>

            {/* Name */}
            <div className="flex-1 min-w-0">
                <p
                    className={`font-semibold truncate leading-tight ${isOnPitch ? 'text-md-outline' : 'text-md-on-surface'}`}
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 12 }}
                >
                    {player.name}
                </p>
                {isOnPitch && (
                    <p className="text-xs text-md-outline" style={{ fontSize: 10 }}>Im Einsatz</p>
                )}
            </div>

            {/* Stats cluster */}
            {!isOnPitch && (
                <div className="flex items-center gap-2 shrink-0">
                    {rc ? (
                        <span
                            className="text-xs font-black tabular-nums px-1.5 py-0.5 rounded-md"
                            style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, background: rc.bg + '22', color: rc.bg }}
                        >
                            {rating}
                        </span>
                    ) : (
                        <span
                            className="text-xs text-md-outline/40 tabular-nums"
                            style={{ fontFamily: "'DM Mono', monospace", fontSize: 10 }}
                        >
                            –
                        </span>
                    )}
                    {(player.total_goals ?? 0) > 0 && (
                        <span
                            className="text-xs font-bold text-md-primary tabular-nums flex items-center gap-0.5"
                            style={{ fontFamily: "'DM Mono', monospace", fontSize: 10 }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>sports_soccer</span>
                            {player.total_goals}
                        </span>
                    )}
                </div>
            )}

            {/* Availability dot */}
            {avail && !isOnPitch && (
                <span className={`w-2 h-2 rounded-full shrink-0 ${avail.dot}`} title={avail.label} />
            )}

            {/* On-pitch checkmark */}
            {isOnPitch && (
                <span className="material-symbols-outlined text-md-outline/40 shrink-0" style={{ fontSize: 14 }}>
                    check_circle
                </span>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// 6. CUSTOM FORMATION EDITOR
// ─────────────────────────────────────────────────────────────
const SLOT_ROWS = [
    { label: 'Sturm', slots: ['ST_L', 'ST_R'] },
    { label: 'Äuß. Stürmer', slots: ['AS_L', 'AS_R'] },
    { label: 'Off. Mittelfeld', slots: ['OM_L', 'OM_C', 'OM_R'] },
    { label: 'Äuß. Mittelfeld', slots: ['AM_L', 'AM_R'] },
    { label: 'Zentr. Mittelfeld', slots: ['ZM_L', 'ZM_C', 'ZM_R'] },
    { label: 'Def. Mittelfeld', slots: ['DM_L', 'DM_R'] },
    { label: 'Abwehr außen', slots: ['AV_L', 'AV_R'] },
    { label: 'Innenverteidiger', slots: ['IV_L', 'IV_C', 'IV_R'] },
    { label: 'Tor', slots: ['TW'] },
]

function CustomFormationEditor({ activeSlots, onChange, onClose }) {
    const activeSet = new Set(activeSlots)

    function toggle(slotId) {
        if (slotId === 'TW') return
        const next = activeSet.has(slotId)
            ? activeSlots.filter(id => id !== slotId)
            : [...activeSlots, slotId]
        onChange(next)
    }

    const count = activeSlots.length

    return (
        <div className="card-outlined p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3
                        className="text-sm font-bold text-md-on-surface"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                    >
                        Eigene Formation
                    </h3>
                    <p className="text-xs text-md-outline mt-0.5">{count} Spieler aktiv</p>
                </div>
                <button onClick={onClose} className="btn-icon w-7 h-7">
                    <span className="material-symbols-outlined icon-sm">close</span>
                </button>
            </div>

            <div className="space-y-2">
                {SLOT_ROWS.map(({ label, slots }) => (
                    <div key={label} className="flex items-center gap-2">
                        <span className="text-xs text-md-outline w-32 shrink-0 text-right pr-2">{label}</span>
                        <div className="flex gap-1.5 flex-wrap">
                            {slots.map(slotId => {
                                const slot = SLOT_BY_ID[slotId]
                                const active = activeSet.has(slotId)
                                const isGoal = slotId === 'TW'
                                return (
                                    <button
                                        key={slotId}
                                        onClick={() => toggle(slotId)}
                                        disabled={isGoal}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all
                      ${active
                                                ? 'bg-md-primary text-white border-md-primary shadow-sm'
                                                : 'bg-white border-md-outline-variant text-md-outline hover:border-md-primary/50'
                                            }
                      ${isGoal ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        title={slot?.fullLabel}
                                    >
                                        {slot?.label ?? slotId}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// 7. QR CODE
// ─────────────────────────────────────────────────────────────
function QRDisplay({ url }) {
    const ref = useRef(null)
    useEffect(() => {
        if (!url || !ref.current) return
        import('qrcode').then(QR =>
            QR.toCanvas(ref.current, url, { width: 200, margin: 2 })
        ).catch(() => { })
    }, [url])
    return <canvas ref={ref} className="rounded-xl mx-auto" />
}

// ─────────────────────────────────────────────────────────────
// 8. MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function Lineup() {
    const {
        plans, plan, players, availability, shareToken,
        loading, saving, saveError,
        selectPlan, createPlan, savePlan, renamePlan, deletePlan, generateShare,
    } = useLineup()

    // ── Local state ──────────────────────────────────────────
    const [assigned, setAssigned] = useState({})                             // { slotId: playerId }
    const [adjustments, setAdjustments] = useState({})                             // { slotId: 'up' | 'down' }
    const [formationKey, setFormationKey] = useState(DEFAULT_FORMATION)
    const [activeSlots, setActiveSlots] = useState(FORMATIONS[DEFAULT_FORMATION].active)
    const [isCustom, setIsCustom] = useState(false)
    const [showCustomEditor, setShowCustomEditor] = useState(false)

    // 2-tap selection
    const [selectedBenchPlayer, setSelectedBenchPlayer] = useState(null)
    const [selectedSlot, setSelectedSlot] = useState(null)

    // UI
    const [editingName, setEditingName] = useState(false)
    const [nameValue, setNameValue] = useState('')
    const [showShare, setShowShare] = useState(false)
    const [generatingToken, setGeneratingToken] = useState(false)
    const [copied, setCopied] = useState(false)

    // ── Sync plan → local state ───────────────────────────────
    useEffect(() => {
        if (!plan) return
        const { key, active } = parseFormation(plan.formation)
        setFormationKey(key)
        setActiveSlots(active)
        setIsCustom(key === 'custom')
        setAssigned(plan.assigned ?? {})
        setAdjustments(plan.adjustments ?? {})
        setNameValue(plan.name ?? '')
        setSelectedBenchPlayer(null)
        setSelectedSlot(null)
    }, [plan?.id])

    // ── Derived ──────────────────────────────────────────────
    // Compute base slot positions from active formation
    const slotPositions = computeSlotPositions(activeSlots)

    // Apply per-slot y-adjustments (always relative to the default base position)
    const slots = activeSlots
        .map(id => {
            const base = SLOT_BY_ID[id]
            const pos = slotPositions[id]
            if (!base || !pos) return null
            const adj = adjustments[id]
            const yOffset = adj === 'up' ? -0.03 : adj === 'down' ? 0.03 : 0
            return { ...base, x: pos.x, y: pos.y + yOffset }
        })
        .filter(Boolean)

    const assignedPlayerIds = new Set(Object.values(assigned).filter(Boolean))
    const benchPlayers = players.filter(p => !assignedPlayerIds.has(p.id))

    // ── Persist helpers ───────────────────────────────────────
    const persistAssigned = useCallback((newAssigned) => {
        if (!plan) return
        setAssigned(newAssigned)
        savePlan(plan.id, { assigned: newAssigned })
    }, [plan, savePlan])

    const persistFormation = useCallback((formKey, active) => {
        if (!plan) return
        const stored = formKey === 'custom' ? JSON.stringify(active) : formKey
        setFormationKey(formKey)
        setActiveSlots(active)
        setIsCustom(formKey === 'custom')
        // Remove assignments for slots no longer active
        const activeSet = new Set(active)
        const prunedAssigned = Object.fromEntries(
            Object.entries(assigned).filter(([slotId]) => activeSet.has(slotId))
        )
        // Also remove adjustments for inactive slots
        const prunedAdjustments = Object.fromEntries(
            Object.entries(adjustments).filter(([slotId]) => activeSet.has(slotId))
        )
        setAssigned(prunedAssigned)
        setAdjustments(prunedAdjustments)
        savePlan(plan.id, { formation: stored, assigned: prunedAssigned, adjustments: prunedAdjustments })
    }, [plan, savePlan, assigned, adjustments])

    // ── Adjustment handler ────────────────────────────────────
    // - Clicking the active direction resets to default (both grey)
    // - Clicking the inactive direction sets it
    // - Clicking the disabled direction does nothing (button is disabled)
    // - y-offset is always computed from the slot's base y (not accumulated)
    const persistAdjustment = useCallback((slotId, dir) => {
        if (!plan) return
        const newAdj = { ...adjustments }
        if (newAdj[slotId] === dir) {
            // Toggle off → back to default
            delete newAdj[slotId]
        } else {
            newAdj[slotId] = dir
        }
        setAdjustments(newAdj)
        savePlan(plan.id, { adjustments: newAdj })
    }, [plan, savePlan, adjustments])

    // ── 2-TAP LOGIC ──────────────────────────────────────────
    function handleBenchTap(playerId) {
        if (selectedBenchPlayer === playerId) {
            setSelectedBenchPlayer(null)
        } else {
            setSelectedBenchPlayer(playerId)
            setSelectedSlot(null)
        }
    }

    function handleSlotTap(slotId) {
        // A: bench player selected → place on slot
        if (selectedBenchPlayer) {
            const newAssigned = { ...assigned }
            Object.keys(newAssigned).forEach(k => {
                if (newAssigned[k] === selectedBenchPlayer) delete newAssigned[k]
            })
            newAssigned[slotId] = selectedBenchPlayer
            persistAssigned(newAssigned)
            setSelectedBenchPlayer(null)
            return
        }

        // B: a slot already selected → swap
        if (selectedSlot) {
            if (selectedSlot === slotId) {
                setSelectedSlot(null)
                return
            }
            const newAssigned = { ...assigned }
            const tmp = newAssigned[slotId]
            newAssigned[slotId] = newAssigned[selectedSlot] ?? undefined
            newAssigned[selectedSlot] = tmp ?? undefined
            Object.keys(newAssigned).forEach(k => { if (!newAssigned[k]) delete newAssigned[k] })
            persistAssigned(newAssigned)
            setSelectedSlot(null)
            return
        }

        // C: nothing selected → select occupied slot
        if (assigned[slotId]) {
            setSelectedSlot(slotId)
        }
    }

    // Remove player from slot → back to bench; also clear its adjustment
    function handleRemoveFromSlot(slotId) {
        const newAssigned = { ...assigned }
        delete newAssigned[slotId]
        persistAssigned(newAssigned)

        // Clear position adjustment for this slot
        const newAdj = { ...adjustments }
        delete newAdj[slotId]
        setAdjustments(newAdj)
        savePlan(plan.id, { adjustments: newAdj })

        setSelectedBenchPlayer(null)
        setSelectedSlot(null)
    }

    // ── FORMATION CHANGE ─────────────────────────────────────
    function applyPreset(key) {
        const f = FORMATIONS[key]
        if (!f) return
        persistFormation(key, f.active)
        setShowCustomEditor(false)
    }

    function applyCustomSlots(newActive) {
        persistFormation('custom', newActive)
    }

    // ── RENAME ────────────────────────────────────────────────
    async function handleRename(e) {
        e.preventDefault()
        if (!nameValue.trim() || !plan) return
        await renamePlan(plan.id, nameValue.trim())
        setEditingName(false)
    }

    // ── SHARE ─────────────────────────────────────────────────
    async function handleGenerateShare() {
        if (!plan) return
        setGeneratingToken(true)
        try { await generateShare(plan.id) }
        finally { setGeneratingToken(false) }
    }

    function copyLink() {
        const url = `${window.location.origin}/share/${shareToken.token}`
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true); setTimeout(() => setCopied(false), 2000)
        })
    }

    function getWhatsAppText() {
        const lines = ALL_SLOTS
            .filter(s => assigned[s.id])
            .map(s => {
                const p = players.find(pl => pl.id === assigned[s.id])
                return `${s.fullLabel}: ${p?.name ?? ''}`
            })
        const fName = isCustom ? 'Eigene' : formationKey
        return encodeURIComponent(`⚽ ${plan?.name ?? 'Aufstellung'}\nFormation: ${fName}\n\n${lines.join('\n')}`)
    }

    const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken.token}` : null

    // ─────────────────────────────────────────────────────────
    if (loading) return (
        <div className="p-4 md:p-8 max-w-5xl space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <div className="flex flex-col md:flex-row gap-4">
                <Skeleton className="flex-1 rounded-2xl" style={{ aspectRatio: '7/10' }} />
                <Skeleton className="w-full md:w-56 h-64 rounded-2xl" />
            </div>
        </div>
    )

    const starters = slots.filter(s => assigned[s.id]).length

    return (
        <div
            className="p-4 md:p-8 max-w-5xl"
            onClick={() => {
                setSelectedBenchPlayer(null)
                setSelectedSlot(null)
            }}
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {editingName ? (
                        <form onSubmit={handleRename} className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <input
                                autoFocus
                                value={nameValue}
                                onChange={e => setNameValue(e.target.value)}
                                className="text-xl font-bold border-b-2 border-md-primary bg-transparent
                  focus:outline-none min-w-0 max-w-48"
                                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                            />
                            <button type="submit" className="btn-icon w-7 h-7 text-md-primary shrink-0">
                                <span className="material-symbols-outlined icon-sm">check</span>
                            </button>
                            <button type="button" onClick={() => setEditingName(false)} className="btn-icon w-7 h-7 shrink-0">
                                <span className="material-symbols-outlined icon-sm">close</span>
                            </button>
                        </form>
                    ) : (
                        <>
                            <h1
                                className="text-xl font-bold text-md-on-surface truncate"
                                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                            >
                                {plan?.name ?? 'Aufstellung'}
                            </h1>
                            {plan && (
                                <button
                                    onClick={e => { e.stopPropagation(); setEditingName(true); setNameValue(plan.name ?? '') }}
                                    className="btn-icon w-7 h-7 text-md-outline shrink-0"
                                >
                                    <span className="material-symbols-outlined icon-sm">edit</span>
                                </button>
                            )}
                        </>
                    )}
                </div>

                <div className="flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                    <select
                        value={plan?.id ?? ''}
                        onChange={e => selectPlan(e.target.value)}
                        className="text-sm rounded-xl border border-md-outline-variant bg-white px-3 py-2
              focus:outline-none focus:border-md-primary max-w-40 truncate"
                    >
                        {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button onClick={() => createPlan()} className="btn-outlined py-2 px-3 text-xs">
                        <span className="material-symbols-outlined icon-sm">add</span>Neu
                    </button>
                    <button onClick={() => setShowShare(true)} className="btn-tonal py-2 px-3 text-xs">
                        <span className="material-symbols-outlined icon-sm">share</span>Teilen
                    </button>
                </div>
            </div>

            {/* ── Formation selector ── */}
            <div className="flex gap-1.5 mb-3 flex-wrap items-center" onClick={e => e.stopPropagation()}>
                {Object.keys(FORMATIONS).map(key => (
                    <button
                        key={key}
                        onClick={() => applyPreset(key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
              ${!isCustom && formationKey === key
                                ? 'bg-md-primary text-white border-md-primary shadow-sm'
                                : 'border-md-outline-variant text-md-on-surface hover:bg-md-surface hover:border-md-primary/40'
                            }`}
                    >
                        {key}
                    </button>
                ))}
                <button
                    onClick={() => setShowCustomEditor(s => !s)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium
            border transition-all
            ${isCustom
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'border-md-outline-variant text-md-on-surface hover:bg-md-surface'
                        }`}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>tune</span>
                    Custom{isCustom ? ' ✓' : ''}
                </button>
            </div>

            {/* ── Custom formation editor ── */}
            {showCustomEditor && (
                <div onClick={e => e.stopPropagation()}>
                    <CustomFormationEditor
                        activeSlots={activeSlots}
                        onChange={applyCustomSlots}
                        onClose={() => setShowCustomEditor(false)}
                    />
                </div>
            )}

            {/* ── Save status bar ── */}
            <div className="flex items-center gap-2 mb-3 text-xs min-h-5">
                {saving && (
                    <span className="flex items-center gap-1 text-md-outline">
                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span>
                        Speichert…
                    </span>
                )}
                {!saving && !saveError && starters > 0 && (
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                        {starters} Spieler · gespeichert
                    </span>
                )}
                {saveError && (
                    <span className="flex items-center gap-1 text-red-600">
                        <span className="material-symbols-outlined icon-sm">error</span>
                        {saveError}
                    </span>
                )}
                {selectedBenchPlayer && (
                    <span className="flex items-center gap-1 text-md-primary font-medium animate-pulse">
                        <span className="material-symbols-outlined icon-sm">touch_app</span>
                        Slot auf dem Feld antippen
                    </span>
                )}
                {selectedSlot && !selectedBenchPlayer && (
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <span className="material-symbols-outlined icon-sm">swap_horiz</span>
                        Anderen Slot antippen zum Tauschen
                    </span>
                )}
            </div>

            {/* ── Main layout ── */}
            <div className="flex flex-col md:flex-row gap-4">

                {/* ── PITCH ── */}
                <div className="flex-1 min-w-0">
                    <div
                        className="relative rounded-2xl overflow-hidden w-full select-none"
                        style={{
                            background: `repeating-linear-gradient(
                0deg,
                #2a7a2a 0px, #2a7a2a 14%,
                #268026 14%, #268026 28%,
                #2a7a2a 28%, #2a7a2a 42%,
                #268026 42%, #268026 56%,
                #2a7a2a 56%, #2a7a2a 70%,
                #268026 70%, #268026 84%,
                #2a7a2a 84%, #2a7a2a 100%
              )`,
                            aspectRatio: '2/3',
                            minHeight: 420,
                        }}
                    >
                        {/* Pitch SVG markings */}
                        <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            viewBox="0 0 100 150"
                            preserveAspectRatio="none"
                        >
                            {/* Pitch boundary */}
                            <rect x="5" y="5" width="90" height="140"
                                fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.7" />

                            {/* Halfway line + centre circle */}
                            <line x1="5" y1="75" x2="95" y2="75"
                                stroke="rgba(255,255,255,0.75)" strokeWidth="0.7" />
                            <circle cx="50" cy="75" r="12.2"
                                fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.65" />
                            <circle cx="50" cy="75" r="0.8" fill="rgba(255,255,255,0.65)" />

                            {/* Own half — penalty area */}
                            <rect x="23.3" y="123" width="53.4" height="22"
                                fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
                            {/* Own goal area */}
                            <rect x="37.9" y="137.7" width="24.2" height="7.3"
                                fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
                            {/* Own penalty spot */}
                            <circle cx="50" cy="130.3" r="0.7" fill="rgba(255,255,255,0.6)" />
                            {/* Own penalty arc */}
                            <path d="M 40.2 123 A 12.2 12.2 0 0 1 59.8 123"
                                fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
                            {/* Own goal */}
                            <rect x="45.1" y="145" width="9.8" height="2.5"
                                fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />

                            {/* Opponent half — penalty area */}
                            <rect x="23.3" y="5" width="53.4" height="22"
                                fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
                            {/* Opponent goal area */}
                            <rect x="37.9" y="5" width="24.2" height="7.3"
                                fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
                            {/* Opponent penalty spot */}
                            <circle cx="50" cy="19.7" r="0.7" fill="rgba(255,255,255,0.6)" />
                            {/* Opponent penalty arc */}
                            <path d="M 40.2 27 A 12.2 12.2 0 0 0 59.8 27"
                                fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
                            {/* Opponent goal */}
                            <rect x="45.1" y="2.5" width="9.8" height="2.5"
                                fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />

                            {/* Corner arcs */}
                            <path d="M 7.5 5    A 2.5 2.5 0 0 1 5    7.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                            <path d="M 92.5 5   A 2.5 2.5 0 0 0 95   7.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                            <path d="M 5   142.5 A 2.5 2.5 0 0 1 7.5  145" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                            <path d="M 95  142.5 A 2.5 2.5 0 0 0 92.5 145" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                        </svg>

                        {/* Direction labels */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
                            <span className="text-white/35 font-bold uppercase tracking-widest" style={{ fontSize: 8 }}>
                                Angriff ▲
                            </span>
                        </div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
                            <span className="text-white/35 font-bold uppercase tracking-widest" style={{ fontSize: 8 }}>
                                ▼ Tor
                            </span>
                        </div>

                        {/* Player slots */}
                        {slots.map(slot => {
                            const playerId = assigned[slot.id]
                            const player = playerId ? players.find(p => p.id === playerId) : null
                            const avail = player ? availability[player.id] : null
                            const isSlotSelected =
                                selectedSlot === slot.id ||
                                (selectedBenchPlayer && !assigned[slot.id])

                            return (
                                <PitchSlot
                                    key={slot.id}
                                    slot={slot}
                                    player={player}
                                    availType={avail}
                                    selected={isSlotSelected}
                                    onTap={handleSlotTap}
                                    onRemove={handleRemoveFromSlot}
                                    adjustment={adjustments[slot.id] ?? null}
                                    onAdjust={persistAdjustment}
                                />
                            )
                        })}
                    </div>
                </div>

                {/* ── BENCH / SQUAD PANEL ── */}
                <div className="w-full md:w-60 shrink-0 space-y-3" onClick={e => e.stopPropagation()}>

                    <BenchArea
                        players={benchPlayers}
                        allPlayers={players}
                        assignedPlayerIds={assignedPlayerIds}
                        availability={availability}
                        selectedPlayer={selectedBenchPlayer}
                        onTap={handleBenchTap}
                    />

                    {/* Legend */}
                    <div className="card-outlined p-3">
                        <p className="text-xs font-bold text-md-outline uppercase tracking-wider mb-2">Legende</p>
                        {Object.entries(AVAIL_STYLE).map(([type, s]) => (
                            <div key={type} className="flex items-center gap-2 text-xs text-md-on-surface-variant mb-1.5 last:mb-0">
                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                                {s.label}
                            </div>
                        ))}
                        <div className="border-t border-md-outline-variant/50 mt-2 pt-2 text-xs text-md-outline space-y-1">
                            <p>1× Spieler → 1× Slot = platzieren</p>
                            <p>Slot → Slot = tauschen</p>
                            <p>▲ / ▼ = Position verschieben</p>
                            <p>✕ = zurück auf Bank</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Share dialog ── */}
            {showShare && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
                    onClick={() => setShowShare(false)}
                >
                    <div
                        className="bg-white w-full md:max-w-sm md:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl"
                        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
                            <div className="w-9 h-9 rounded-xl bg-md-primary-container flex items-center justify-center">
                                <span className="material-symbols-outlined icon-sm text-md-primary">share</span>
                            </div>
                            <h2
                                className="text-base font-bold text-md-on-surface flex-1"
                                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                            >
                                Aufstellung teilen
                            </h2>
                            <button onClick={() => setShowShare(false)} className="btn-icon w-8 h-8">
                                <span className="material-symbols-outlined icon-sm">close</span>
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {!shareToken ? (
                                <button
                                    onClick={handleGenerateShare}
                                    disabled={generatingToken}
                                    className="btn-filled w-full justify-center"
                                >
                                    {generatingToken
                                        ? <><span className="material-symbols-outlined icon-sm animate-spin">progress_activity</span>Generiere…</>
                                        : <><span className="material-symbols-outlined icon-sm">link</span>Öffentlichen Link erstellen</>
                                    }
                                </button>
                            ) : (
                                <>
                                    <QRDisplay url={shareUrl} />
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={shareUrl}
                                            className="flex-1 text-xs border border-md-outline-variant rounded-xl px-3 py-2 bg-md-surface"
                                        />
                                        <button onClick={copyLink} className="btn-tonal px-3 text-xs">
                                            <span className="material-symbols-outlined icon-sm">{copied ? 'check' : 'content_copy'}</span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-center text-md-outline">
                                        Gültig bis {new Date(shareToken.expires_at).toLocaleDateString('de-DE')}
                                    </p>
                                </>
                            )}
                            <a
                                href={`https://wa.me/?text=${getWhatsAppText()}`}
                                target="_blank"
                                rel="noopener noreferrer"
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

// ─────────────────────────────────────────────────────────────
// 9. SQUAD PANEL — FM-style side list
// ─────────────────────────────────────────────────────────────
function BenchArea({ players, allPlayers, assignedPlayerIds, availability, selectedPlayer, onTap }) {
    const [search, setSearch] = useState('')
    const [sortBy, setSortBy] = useState('number')

    const filtered = allPlayers
        .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'number') return (parseInt(a.number) || 99) - (parseInt(b.number) || 99)
            if (sortBy === 'name') return a.name.localeCompare(b.name)
            if (sortBy === 'rating') return (b.avg_match_rating ?? 0) - (a.avg_match_rating ?? 0)
            if (sortBy === 'position') return (a.position ?? 'z').localeCompare(b.position ?? 'z')
            return 0
        })

    const benchCount = allPlayers.filter(p => !assignedPlayerIds.has(p.id)).length

    return (
        <div
            className="bg-white rounded-2xl border-2 overflow-hidden transition-all flex flex-col border-md-outline-variant/60"
            style={{ maxHeight: 'calc(100vh - 240px)', minHeight: 200 }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-3 py-2.5 border-b border-md-outline-variant/60 shrink-0"
                style={{ background: 'rgba(22,29,28,0.88)' }}
            >
                <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Kader</span>
                    <span
                        className="text-xs text-white/40 ml-2 tabular-nums"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                    >
                        {benchCount} verfügbar
                    </span>
                </div>
                <select
                    value={sortBy}
                    onChange={e => { e.stopPropagation(); setSortBy(e.target.value) }}
                    onClick={e => e.stopPropagation()}
                    className="text-xs bg-white/10 border border-white/20 rounded-lg px-2 py-1
            text-white/70 focus:outline-none focus:border-white/50"
                    style={{ fontSize: 10 }}
                >
                    <option value="number">Nr.</option>
                    <option value="name">Name</option>
                    <option value="position">Pos.</option>
                    <option value="rating">Rating</option>
                </select>
            </div>

            {/* Column headers */}
            <div
                className="flex items-center gap-2 px-3 py-1.5 border-b border-md-outline-variant/40 shrink-0"
                style={{ background: 'rgba(22,29,28,0.04)' }}
            >
                <div className="w-1 shrink-0" />
                <span className="w-5 text-center text-xs font-bold text-md-outline uppercase" style={{ fontSize: 9 }}>#</span>
                <span className="w-7 text-center text-xs font-bold text-md-outline uppercase" style={{ fontSize: 9 }}>Pos</span>
                <span className="flex-1 text-xs font-bold text-md-outline uppercase" style={{ fontSize: 9 }}>Name</span>
                <span className="text-xs font-bold text-md-outline uppercase text-right pr-1" style={{ fontSize: 9 }}>Rtg / T</span>
            </div>

            {/* Search */}
            <div className="px-3 py-1.5 border-b border-md-outline-variant/40 shrink-0">
                <div className="relative">
                    <span
                        className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-md-outline"
                        style={{ fontSize: 13 }}
                    >
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Suchen…"
                        value={search}
                        onChange={e => { e.stopPropagation(); setSearch(e.target.value) }}
                        onClick={e => e.stopPropagation()}
                        className="w-full pl-6 pr-2 py-1 rounded-lg border border-md-outline-variant
              bg-white text-xs focus:outline-none focus:border-md-primary"
                    />
                </div>
            </div>

            {/* Player rows */}
            <div className="overflow-y-auto flex-1">
                {filtered.length === 0 ? (
                    <p className="text-xs text-md-outline text-center py-6 italic">Kein Spieler gefunden</p>
                ) : (
                    filtered.map(p => (
                        <SquadRow
                            key={p.id}
                            player={p}
                            availType={availability[p.id]}
                            selected={selectedPlayer === p.id}
                            isOnPitch={assignedPlayerIds.has(p.id)}
                            onTap={onTap}
                        />
                    ))
                )}
            </div>
        </div>
    )
}