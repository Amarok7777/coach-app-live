import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayers } from '../hooks/usePlayers'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'

const POSITIONS = [
    'Torwart', 'Innenverteidiger', 'Außenverteidiger',
    'Defensives Mittelfeld', 'Zentrales Mittelfeld', 'Offensives Mittelfeld',
    'Linksaußen', 'Rechtsaußen', 'Stürmer',
]

// Position abbreviations for the card badge
const POS_SHORT = {
    'Torwart': 'TW',
    'Innenverteidiger': 'IV',
    'Außenverteidiger': 'AV',
    'Defensives Mittelfeld': 'DM',
    'Zentrales Mittelfeld': 'ZM',
    'Offensives Mittelfeld': 'OM',
    'Linksaußen': 'LA',
    'Rechtsaußen': 'RA',
    'Stürmer': 'ST',
}

// Accent color per position — used for the left border + avatar ring
const POS_ACCENT = {
    'Torwart': { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', dot: 'bg-amber-400' },
    'Innenverteidiger': { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', dot: 'bg-blue-500' },
    'Außenverteidiger': { bg: 'bg-sky-50', border: 'border-sky-400', text: 'text-sky-700', dot: 'bg-sky-400' },
    'Defensives Mittelfeld': { bg: 'bg-violet-50', border: 'border-violet-500', text: 'text-violet-700', dot: 'bg-violet-500' },
    'Zentrales Mittelfeld': { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700', dot: 'bg-purple-500' },
    'Offensives Mittelfeld': { bg: 'bg-pink-50', border: 'border-pink-400', text: 'text-pink-700', dot: 'bg-pink-400' },
    'Linksaußen': { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', dot: 'bg-green-500' },
    'Rechtsaußen': { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'Stürmer': { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700', dot: 'bg-red-500' },
}
const DEFAULT_ACCENT = { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-600', dot: 'bg-gray-400' }

function getAccent(position) {
    return POS_ACCENT[position] ?? DEFAULT_ACCENT
}

// Initials avatar — uses position color
function Avatar({ name, position, size = 'md' }) {
    const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'
    const accent = getAccent(position)
    const dim = size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-xs'
    return (
        <div className={`${dim} rounded-xl flex items-center justify-center shrink-0 font-bold
      ${accent.bg} ${accent.text} ring-2 ${accent.border} ring-opacity-60`}
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '0.02em' }}
        >
            {initials}
        </div>
    )
}

// Stat pill — compact number + label
function StatPill({ value, label, highlight = false }) {
    return (
        <div className="flex flex-col items-center min-w-[36px]">
            <span className={`text-sm font-bold leading-none tabular-nums
        ${highlight ? 'text-md-primary' : 'text-md-on-surface'}`}
                style={{ fontFamily: "'DM Mono', 'Courier New', monospace" }}
            >
                {value ?? 0}
            </span>
            <span className="text-xs text-md-outline mt-0.5 leading-none">{label}</span>
        </div>
    )
}

// Rating bar — visual attendance indicator
function AttendanceBar({ pct }) {
    if (pct == null) return null
    const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
    return (
        <div className="flex items-center gap-1.5" title={`Anwesenheit: ${pct}%`}>
            <div className="w-16 h-1.5 bg-md-outline-variant/30 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-medium tabular-nums"
                style={{ color: pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626' }}>
                {pct}%
            </span>
        </div>
    )
}

// ─── Player card row ─────────────────────────────────────────
function PlayerCard({ player: p, index, canEdit, onEdit, onDelete }) {
    const navigate = useNavigate()
    const accent = getAccent(p.position)
    const age = p.birth_year ? new Date().getFullYear() - p.birth_year : null

    return (
        <div
            className={`group relative flex items-center gap-4 px-4 py-3 bg-white
        transition-all duration-150 cursor-pointer select-none
        hover:bg-md-surface/80
        ${index > 0 ? 'border-t border-md-outline-variant/60' : ''}
      `}
            style={{ borderLeft: `3px solid transparent` }}
            onMouseEnter={e => e.currentTarget.style.borderLeftColor = `var(--accent-color, #006A60)`}
            onMouseLeave={e => e.currentTarget.style.borderLeftColor = 'transparent'}
            onClick={() => navigate(`/players/${p.id}`)}
        >
            {/* Position accent dot (always visible) */}
            <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full
          transition-all duration-200 opacity-0 group-hover:opacity-100 ${accent.dot}`}
                style={{ height: '60%' }}
            />

            {/* Jersey number */}
            <div className="w-7 shrink-0 text-center">
                {p.number ? (
                    <span className="text-base font-black text-md-outline/50 tabular-nums leading-none"
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        {p.number}
                    </span>
                ) : (
                    <span className="text-xs text-md-outline/30">—</span>
                )}
            </div>

            {/* Avatar */}
            <Avatar name={p.name} position={p.position} />

            {/* Name + position + age */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-md-on-surface truncate leading-tight"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        {p.name}
                    </p>
                    {/* Active injury indicator */}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {p.position ? (
                        <span className={`text-xs font-medium px-1.5 py-px rounded-md ${accent.bg} ${accent.text}`}>
                            {POS_SHORT[p.position] ?? p.position.slice(0, 3).toUpperCase()}
                            <span className="hidden sm:inline"> · {p.position}</span>
                        </span>
                    ) : (
                        <span className="text-xs text-md-outline/50 italic">Keine Position</span>
                    )}
                    {age && (
                        <span className="text-xs text-md-outline">{age} J.</span>
                    )}
                </div>
            </div>

            {/* Stats — desktop only */}
            <div className="hidden lg:flex items-center gap-5 shrink-0">
                <StatPill value={p.matches_played} label="Sp." />
                <StatPill value={p.total_goals} label="Tore" highlight />
                <StatPill value={p.total_assists} label="Ass." />
                {p.avg_match_rating != null && (
                    <div className="flex flex-col items-center min-w-[36px]">
                        <span className="text-sm font-bold leading-none text-amber-500 tabular-nums"
                            style={{ fontFamily: "'DM Mono', monospace" }}>
                            {p.avg_match_rating}
                        </span>
                        <span className="text-xs text-md-outline mt-0.5 leading-none">Rtg.</span>
                    </div>
                )}
            </div>

            {/* Attendance bar — tablet+ */}
            <div className="hidden md:flex items-center shrink-0 w-28">
                <AttendanceBar pct={p.attendance_pct} />
            </div>

            {/* Action buttons — appear on hover */}
            {canEdit && (
                <div
                    className="hidden md:flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={e => { e.stopPropagation(); onEdit(p) }}
                        className="btn-icon w-8 h-8 hover:bg-md-primary/10 hover:text-md-primary"
                        title="Bearbeiten"
                    >
                        <span className="material-symbols-outlined icon-sm">edit</span>
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(e, p.id) }}
                        className="btn-icon w-8 h-8 hover:bg-red-50 hover:text-red-600"
                        title="Löschen"
                    >
                        <span className="material-symbols-outlined icon-sm">delete</span>
                    </button>
                </div>
            )}

            {/* Chevron — always visible, not for canEdit (they have action buttons) */}
            {!canEdit && (
                <span className="material-symbols-outlined icon-sm text-md-outline/40 shrink-0
          group-hover:text-md-primary group-hover:translate-x-0.5 transition-all">
                    chevron_right
                </span>
            )}
            {canEdit && (
                <span className="material-symbols-outlined icon-sm text-md-outline/30 shrink-0 md:group-hover:opacity-0 transition-opacity">
                    chevron_right
                </span>
            )}
        </div>
    )
}

// ─── Group header ─────────────────────────────────────────────
function GroupHeader({ label, count, accent }) {
    return (
        <div className={`flex items-center gap-3 px-4 py-2 ${accent.bg} border-b border-md-outline-variant/40`}>
            <div className={`w-1.5 h-4 rounded-full ${accent.dot}`} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accent.text.replace('text-', '') }}>
                {label}
            </span>
            <span className="text-xs text-md-outline ml-auto tabular-nums">{count}</span>
        </div>
    )
}

// ─── Position groups order ─────────────────────────────────────
const POSITION_ORDER = [
    'Torwart',
    'Innenverteidiger', 'Außenverteidiger',
    'Defensives Mittelfeld', 'Zentrales Mittelfeld', 'Offensives Mittelfeld',
    'Linksaußen', 'Rechtsaußen',
    'Stürmer',
]

const EMPTY_FORM = { name: '', position: '', number: '', birth_year: '' }

// ─── Main page ─────────────────────────────────────────────────
export default function Players() {
    const navigate = useNavigate()
    const { canEdit } = useAuth()
    const { players, loading, create, update, remove, exportCSV } = usePlayers()

    const [search, setSearch] = useState('')
    const [posFilter, setPosFilter] = useState('')
    const [groupBy, setGroupBy] = useState('position') // 'position' | 'flat'
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState(null)

    const filtered = players.filter(p => {
        const ms = !search || p.name.toLowerCase().includes(search.toLowerCase())
        const mp = !posFilter || p.position === posFilter
        return ms && mp
    })

    // Group by position
    const grouped = POSITION_ORDER.reduce((acc, pos) => {
        const group = filtered.filter(p => p.position === pos)
        if (group.length > 0) acc.push({ pos, players: group })
        return acc
    }, [])
    const noPosition = filtered.filter(p => !p.position)
    if (noPosition.length > 0) grouped.push({ pos: null, players: noPosition })

    function openEdit(p) {
        setForm({
            id: p.id,
            name: p.name ?? '',
            position: p.position ?? '',
            number: p.number != null ? String(p.number) : '',
            birth_year: p.birth_year != null ? String(p.birth_year) : '',
        })
        setShowForm(true)
    }

    async function handleDelete(e, id) {
        e.preventDefault(); e.stopPropagation()
        if (!confirm('Spieler wirklich löschen?')) return
        try { await remove(id) } catch (err) { alert(err.message || 'Fehler') }
    }

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
        } catch (e) { setFormError(e.message) }
        finally { setSaving(false) }
    }

    if (loading) return (
        <div className="p-4 md:p-8 max-w-4xl space-y-3">
            <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
            <Skeleton className="h-11 rounded-xl" />
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[60px] rounded-none first:rounded-t-xl last:rounded-b-xl" />)}
        </div>
    )

    return (
        <div className="p-4 md:p-8 max-w-4xl">

            {/* ── Header ── */}
            <div className="flex items-start justify-between mb-5 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-md-on-surface tracking-tight"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        Kader
                    </h1>
                    <p className="text-sm text-md-outline mt-0.5">
                        {players.length} Spieler · {players.filter(p => p.position).length} mit Position
                    </p>
                </div>
                <div className="flex gap-2 items-center flex-wrap justify-end">
                    <button onClick={exportCSV} className="btn-outlined py-2 px-3 text-xs">
                        <span className="material-symbols-outlined icon-sm">download</span>
                        Export
                    </button>
                    {canEdit && (
                        <button
                            onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }}
                            className="btn-filled py-2 px-4 text-xs"
                        >
                            <span className="material-symbols-outlined icon-sm">person_add</span>
                            Spieler
                        </button>
                    )}
                </div>
            </div>

            {/* ── Filter bar ── */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-48">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 icon-sm text-md-outline">
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Name suchen…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-md-outline-variant
              bg-white text-sm focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary/20"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-md-outline hover:text-md-on-surface"
                        >
                            <span className="material-symbols-outlined icon-sm">close</span>
                        </button>
                    )}
                </div>

                {/* Position filter */}
                <select
                    value={posFilter}
                    onChange={e => setPosFilter(e.target.value)}
                    className="text-sm rounded-xl border border-md-outline-variant bg-white px-3 py-2.5
            focus:outline-none focus:border-md-primary min-w-36"
                >
                    <option value="">Alle Positionen</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{POS_SHORT[p]} · {p}</option>)}
                </select>

                {/* Group toggle */}
                <div className="flex rounded-xl border border-md-outline-variant overflow-hidden">
                    {[['position', 'Nach Position', 'grid_view'], ['flat', 'Alle', 'list']].map(([val, label, icon]) => (
                        <button
                            key={val}
                            onClick={() => setGroupBy(val)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors
                ${groupBy === val
                                    ? 'bg-md-primary text-white'
                                    : 'bg-white text-md-on-surface-variant hover:bg-md-surface'
                                }`}
                        >
                            <span className="material-symbols-outlined icon-sm">{icon}</span>
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Empty state ── */}
            {filtered.length === 0 && (
                <div className="card-outlined flex flex-col items-center py-20 text-md-on-surface-variant">
                    <div className="w-16 h-16 rounded-2xl bg-md-surface-variant flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-md-outline" style={{ fontSize: 32 }}>
                            {search ? 'search_off' : 'group_add'}
                        </span>
                    </div>
                    <p className="text-sm font-semibold text-md-on-surface">
                        {search ? `Kein Treffer für „${search}"` : 'Noch keine Spieler'}
                    </p>
                    <p className="text-xs text-md-outline mt-1">
                        {search ? 'Suchbegriff anpassen' : 'Füge deinen ersten Spieler hinzu'}
                    </p>
                </div>
            )}

            {/* ── Player list — grouped ── */}
            {filtered.length > 0 && groupBy === 'position' && (
                <div className="space-y-3">
                    {grouped.map(({ pos, players: group }) => {
                        const accent = getAccent(pos)
                        const label = pos ?? 'Keine Position'
                        return (
                            <div key={pos ?? '_none'} className="card-outlined overflow-hidden">
                                <GroupHeader label={label} count={group.length} accent={accent} />
                                {group.map((p, i) => (
                                    <PlayerCard
                                        key={p.id}
                                        player={p}
                                        index={i}
                                        canEdit={canEdit}
                                        onEdit={openEdit}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Player list — flat ── */}
            {filtered.length > 0 && groupBy === 'flat' && (
                <div className="card-outlined overflow-hidden">
                    {/* Table header */}
                    <div className="hidden md:grid px-4 py-2 bg-md-surface/80 border-b border-md-outline-variant/60
            text-xs font-semibold text-md-outline uppercase tracking-wider"
                        style={{ gridTemplateColumns: '28px 36px 1fr repeat(4, 44px) 128px 40px' }}
                    >
                        <span></span>
                        <span></span>
                        <span>Spieler</span>
                        <span className="text-center">Sp.</span>
                        <span className="text-center">T</span>
                        <span className="text-center">A</span>
                        <span className="text-center">Rtg.</span>
                        <span className="text-center">Anwesenh.</span>
                        <span></span>
                    </div>
                    {filtered.map((p, i) => (
                        <PlayerCard
                            key={p.id}
                            player={p}
                            index={i}
                            canEdit={canEdit}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* ── Form dialog ── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50">
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl"
                        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>

                        {/* Dialog header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
                            <div className="w-9 h-9 rounded-xl bg-md-primary-container flex items-center justify-center">
                                <span className="material-symbols-outlined icon-sm text-md-primary">
                                    {form.id ? 'edit' : 'person_add'}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-base font-bold text-md-on-surface">
                                    {form.id ? 'Spieler bearbeiten' : 'Neuer Spieler'}
                                </h2>
                                {form.id && form.name && (
                                    <p className="text-xs text-md-outline">{form.name}</p>
                                )}
                            </div>
                            <button onClick={() => setShowForm(false)} className="btn-icon w-8 h-8">
                                <span className="material-symbols-outlined icon-sm">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            {formError && (
                                <div className="flex items-start gap-2 text-sm text-md-error bg-red-50 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined icon-sm shrink-0 mt-0.5">error</span>
                                    {formError}
                                </div>
                            )}

                            {/* Name */}
                            <div className="md-field">
                                <input
                                    required
                                    className="md-input"
                                    placeholder=" "
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                />
                                <label className="md-input-label">Vollständiger Name *</label>
                            </div>

                            {/* Position */}
                            <div>
                                <p className="text-xs font-medium text-md-on-surface-variant mb-2 px-0.5">Position</p>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {POSITIONS.map(pos => {
                                        const a = getAccent(pos)
                                        const selected = form.position === pos
                                        return (
                                            <button
                                                key={pos}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, position: selected ? '' : pos }))}
                                                className={`px-2 py-2 rounded-xl text-xs font-medium text-center transition-all border
                          ${selected
                                                        ? `${a.bg} ${a.text} ${a.border} shadow-sm`
                                                        : 'bg-white border-md-outline-variant text-md-on-surface-variant hover:bg-md-surface'
                                                    }`}
                                            >
                                                <span className="block font-bold">{POS_SHORT[pos]}</span>
                                                <span className="block text-xs opacity-70 truncate">{pos.split(' ')[0]}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Number + Jahrgang */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="md-field">
                                    <input
                                        type="number" min="1" max="99"
                                        className="md-input" placeholder=" "
                                        value={form.number}
                                        onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                                    />
                                    <label className="md-input-label">Rückennummer</label>
                                </div>
                                <div className="md-field">
                                    <input
                                        type="number" min="1950" max={new Date().getFullYear()}
                                        className="md-input" placeholder=" "
                                        value={form.birth_year}
                                        onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))}
                                    />
                                    <label className="md-input-label">Jahrgang</label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="btn-outlined flex-1 justify-center"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-filled flex-1 justify-center"
                                >
                                    {saving
                                        ? <><span className="material-symbols-outlined icon-sm animate-spin">progress_activity</span>Speichern…</>
                                        : <><span className="material-symbols-outlined icon-sm">check</span>Speichern</>
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}