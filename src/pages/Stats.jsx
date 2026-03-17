import { useState } from 'react'
import { useStats } from '../hooks/useStats'
import Skeleton from '../components/Skeleton'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer,
} from 'recharts'

const POSITIONS = [
    'Torwart', 'Innenverteidiger', 'Außenverteidiger',
    'Defensives Mittelfeld', 'Zentrales Mittelfeld', 'Offensives Mittelfeld',
    'Linksaußen', 'Rechtsaußen', 'Stürmer',
]

const POS_SHORT = {
    'Torwart': 'TW', 'Innenverteidiger': 'IV', 'Außenverteidiger': 'AV',
    'Defensives Mittelfeld': 'DM', 'Zentrales Mittelfeld': 'ZM',
    'Offensives Mittelfeld': 'OM', 'Linksaußen': 'LA',
    'Rechtsaußen': 'RA', 'Stürmer': 'ST',
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function fmt(v, fallback = 0) {
    return v ?? fallback
}

function ratingColor(v) {
    if (v == null) return 'text-md-outline'
    if (v >= 7) return 'text-green-600'
    if (v >= 5) return 'text-amber-500'
    return 'text-red-500'
}

function attendColor(v) {
    if (v == null) return ''
    if (v >= 75) return 'text-green-600'
    if (v >= 50) return 'text-amber-600'
    return 'text-red-500'
}

// ─────────────────────────────────────────────────────────────
// Custom recharts tooltip
// ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, unit = '' }) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white border border-md-outline-variant rounded-xl px-3 py-2 shadow-lg text-xs">
            <p className="font-semibold text-md-on-surface mb-1">{label}</p>
            {payload.map(p => (
                <p key={p.dataKey} style={{ color: p.fill }}>
                    {p.name}: <span className="font-bold tabular-nums">{p.value}{unit}</span>
                </p>
            ))}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Summary tile
// ─────────────────────────────────────────────────────────────
function Tile({ label, value, icon, sub }) {
    return (
        <div className="bg-white rounded-2xl border border-md-outline-variant/60 p-4">
            <div className="w-8 h-8 rounded-xl bg-md-primary-container flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-md-primary" style={{ fontSize: 16 }}>{icon}</span>
            </div>
            <p
                className="text-2xl font-black text-md-on-surface tabular-nums leading-none"
                style={{ fontFamily: "'DM Mono', monospace" }}
            >
                {value ?? 0}
            </p>
            <p className="text-xs text-md-outline mt-1 font-medium">{label}</p>
            {sub != null && (
                <p className="text-xs text-md-outline/60 mt-0.5 tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {sub}
                </p>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Column header (sortable)
// ─────────────────────────────────────────────────────────────
function Th({ children, col, sortCol, sortDir, onSort, className = '' }) {
    const active = sortCol === col
    return (
        <th
            onClick={() => onSort(col)}
            className={`py-3 font-bold text-md-outline uppercase tracking-wider cursor-pointer
        select-none whitespace-nowrap transition-colors hover:text-md-on-surface
        ${active ? 'text-md-primary' : ''} ${className}`}
        >
            <span className="inline-flex items-center gap-0.5">
                {children}
                {active && (
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                        {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                )}
            </span>
        </th>
    )
}

// ─────────────────────────────────────────────────────────────
// Column group tab
// ─────────────────────────────────────────────────────────────
function ColTab({ id, label, icon, active, onClick }) {
    return (
        <button
            onClick={() => onClick(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all whitespace-nowrap
        ${active
                    ? 'bg-md-primary text-white border-md-primary shadow-sm'
                    : 'border-md-outline-variant text-md-on-surface hover:bg-md-surface hover:border-md-primary/40'
                }`}
        >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{icon}</span>
            {label}
        </button>
    )
}

// ─────────────────────────────────────────────────────────────
// Column group definitions
// ─────────────────────────────────────────────────────────────
const COL_GROUPS = [
    { id: 'spiele', label: 'Spiele', icon: 'sports_soccer' },
    { id: 'training', label: 'Training', icon: 'fitness_center' },
    { id: 'rating', label: 'Rating', icon: 'star' },
    { id: 'anwesen', label: 'Anwesenheit', icon: 'check_circle' },
]

// ─────────────────────────────────────────────────────────────
// Chart card wrapper
// ─────────────────────────────────────────────────────────────
function ChartCard({ title, children, empty }) {
    return (
        <div className="bg-white rounded-2xl border border-md-outline-variant/60 p-5 flex flex-col">
            <h3 className="text-sm font-bold text-md-on-surface mb-4 shrink-0"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {title}
            </h3>
            {empty
                ? <div className="flex-1 flex items-center justify-center text-sm text-md-outline min-h-[160px]">Keine Daten</div>
                : children
            }
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function Stats() {
    const {
        players, allPlayers, teamSummary,
        filter, setFilter,
        loading, exportCSV, exportPDF,
    } = useStats()

    const [colGroup, setColGroup] = useState('spiele')
    const [sortCol, setSortCol] = useState('total_goals')
    const [sortDir, setSortDir] = useState('desc')

    if (loading) return (
        <div className="p-4 md:p-6 xl:p-8 space-y-4">
            <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-20 rounded-xl" />
                    <Skeleton className="h-9 w-20 rounded-xl" />
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
        </div>
    )

    // ── Sort ─────────────────────────────────────────────────
    function handleSort(col) {
        if (sortCol === col) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc')
        } else {
            setSortCol(col)
            setSortDir('desc')
        }
    }

    const sorted = [...players].sort((a, b) => {
        const av = a[sortCol] ?? -1
        const bv = b[sortCol] ?? -1
        return sortDir === 'desc' ? bv - av : av - bv
    })

    // ── Chart data ────────────────────────────────────────────
    const topGoals = [...allPlayers]
        .sort((a, b) => (b.total_goals ?? 0) - (a.total_goals ?? 0))
        .slice(0, 8)

    const topAttendMatch = [...allPlayers]
        .filter(p => p.attendance_match_pct != null)
        .sort((a, b) => (b.attendance_match_pct ?? 0) - (a.attendance_match_pct ?? 0))
        .slice(0, 8)

    const topAssists = [...allPlayers]
        .sort((a, b) => (b.total_assists ?? 0) - (a.total_assists ?? 0))
        .filter(p => (p.total_assists ?? 0) > 0)
        .slice(0, 8)

    const topScorers = [...allPlayers]
        .sort((a, b) => ((b.total_goals ?? 0) + (b.total_assists ?? 0)) - ((a.total_goals ?? 0) + (a.total_assists ?? 0)))
        .filter(p => (p.total_goals ?? 0) + (p.total_assists ?? 0) > 0)
        .slice(0, 8)
        .map(p => ({ ...p, goal_contributions: (p.total_goals ?? 0) + (p.total_assists ?? 0) }))

    const topAttendTraining = [...allPlayers]
        .filter(p => p.attendance_training_pct != null)
        .sort((a, b) => (b.attendance_training_pct ?? 0) - (a.attendance_training_pct ?? 0))
        .slice(0, 8)

    // ── Summary tiles ─────────────────────────────────────────
    const tiles = teamSummary ? [
        { label: 'Spieler', value: teamSummary.player_count, icon: 'group' },
        {
            label: 'Spiele', value: teamSummary.match_count, icon: 'sports_soccer',
            sub: `${teamSummary.total_match_minutes ?? 0} Min. gesamt`
        },
        {
            label: 'Trainings', value: teamSummary.session_count, icon: 'fitness_center',
            sub: `${teamSummary.total_training_minutes ?? 0} Min. gesamt`
        },
        { label: 'Tore gesamt', value: teamSummary.total_goals, icon: 'emoji_events' },
        { label: 'Assists gesamt', value: teamSummary.total_assists, icon: 'handshake' },
        {
            label: 'Zu Null', value: teamSummary.clean_sheets, icon: 'shield',
            sub: 'Team gesamt'
        },
        {
            label: 'Ø Rating Spiel', value: teamSummary.avg_match_rating != null
                ? `${teamSummary.avg_match_rating}` : '–', icon: 'star'
        },
        { label: 'Verletzt', value: teamSummary.active_injuries, icon: 'healing' },
    ] : []

    // ── Bar chart shared props ────────────────────────────────
    const barMargin = { left: 60, right: 16, top: 0, bottom: 0 }

    return (
        // Removed max-w-5xl → full width, padded generously on large screens
        <div className="p-4 md:p-6 xl:p-8 w-full">

            {/* ── Header ── */}
            <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
                <div>
                    <h1
                        className="text-2xl font-bold text-md-on-surface tracking-tight"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                    >
                        Statistiken
                    </h1>
                    <p className="text-sm text-md-outline mt-0.5">
                        {allPlayers.length} Spieler · Saison-Übersicht
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCSV} className="btn-outlined py-2 px-3 text-xs">
                        <span className="material-symbols-outlined icon-sm">download</span>CSV
                    </button>
                    <button onClick={exportPDF} className="btn-outlined py-2 px-3 text-xs">
                        <span className="material-symbols-outlined icon-sm">picture_as_pdf</span>PDF
                    </button>
                </div>
            </div>

            {/* ── Team summary tiles ──
                Mobile: 2 cols → Tablet: 4 cols → Desktop: 8 cols (all in one row) */}
            {teamSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
                    {tiles.map(s => (
                        <Tile key={s.label} label={s.label} value={s.value} icon={s.icon} sub={s.sub} />
                    ))}
                </div>
            )}

            {/* ── Filters ── */}
            <div className="flex gap-2 mb-5 flex-wrap">
                <select
                    value={filter.position}
                    onChange={e => setFilter(f => ({ ...f, position: e.target.value }))}
                    className="text-sm rounded-xl border border-md-outline-variant bg-white px-3 py-2.5
            focus:outline-none focus:border-md-primary"
                >
                    <option value="">Alle Positionen</option>
                    {POSITIONS.map(p => (
                        <option key={p} value={p}>{POS_SHORT[p]} · {p}</option>
                    ))}
                </select>
                <div className="relative flex-1 min-w-44">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 icon-sm text-md-outline">
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Spieler suchen…"
                        value={filter.player}
                        onChange={e => setFilter(f => ({ ...f, player: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-md-outline-variant bg-white text-sm
              focus:outline-none focus:border-md-primary"
                    />
                </div>
            </div>

            {/* ── Charts ──
                Mobile: 1 col → Tablet: 2 cols → Desktop: 3 cols  */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">

                {/* Top-Torschützen */}
                <ChartCard title="Top-Torschützen" empty={topGoals.length === 0}>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={topGoals} layout="vertical" margin={barMargin}>
                            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--md-outline)' }}
                                axisLine={false} tickLine={false} allowDecimals={false}
                                tickCount={Math.min(6, Math.max(...topGoals.map(p => p.total_goals ?? 0)) + 1)} />
                            <YAxis type="category" dataKey="name"
                                tick={{ fontSize: 10, fill: 'var(--md-on-surface)' }}
                                width={60} tickFormatter={v => v.split(' ').at(-1)}
                                axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,106,96,0.06)' }} />
                            <Bar dataKey="total_goals" name="Tore" fill="var(--md-primary)"
                                radius={[0, 6, 6, 0]} maxBarSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Top-Assistgeber */}
                <ChartCard title="Top-Assistgeber" empty={topAssists.length === 0}>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={topAssists} layout="vertical" margin={barMargin}>
                            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--md-outline)' }}
                                axisLine={false} tickLine={false} allowDecimals={false}
                                tickCount={Math.min(6, Math.max(...topAssists.map(p => p.total_assists ?? 0)) + 1)} />
                            <YAxis type="category" dataKey="name"
                                tick={{ fontSize: 10, fill: 'var(--md-on-surface)' }}
                                width={60} tickFormatter={v => v.split(' ').at(-1)}
                                axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                            <Bar dataKey="total_assists" name="Assists" fill="#6366f1"
                                radius={[0, 6, 6, 0]} maxBarSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Top-Scorer (Tore + Assists) */}
                <ChartCard
                    title={<>Top-Scorer <span className="ml-1.5 text-xs font-normal text-md-outline">Tore + Assists</span></>}
                    empty={topScorers.length === 0}
                >
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={topScorers} layout="vertical" margin={barMargin}>
                            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--md-outline)' }}
                                axisLine={false} tickLine={false} allowDecimals={false}
                                tickCount={Math.min(6, Math.max(...topScorers.map(p => p.goal_contributions ?? 0)) + 1)} />
                            <YAxis type="category" dataKey="name"
                                tick={{ fontSize: 10, fill: 'var(--md-on-surface)' }}
                                width={60} tickFormatter={v => v.split(' ').at(-1)}
                                axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245,158,11,0.06)' }} />
                            <Bar dataKey="goal_contributions" name="Torbeteiligungen" fill="#f59e0b"
                                radius={[0, 6, 6, 0]} maxBarSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Anwesenheit Training */}
                <ChartCard title="Anwesenheit Training" empty={topAttendTraining.length === 0}>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={topAttendTraining} layout="vertical" margin={barMargin}>
                            <XAxis type="number" domain={[0, 100]}
                                tick={{ fontSize: 11, fill: 'var(--md-outline)' }}
                                unit="%" axisLine={false} tickLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="name"
                                tick={{ fontSize: 10, fill: 'var(--md-on-surface)' }}
                                width={60} tickFormatter={v => v.split(' ').at(-1)}
                                axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip unit="%" />} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
                            <Bar dataKey="attendance_training_pct" name="Anwesenheit" fill="#10b981"
                                radius={[0, 6, 6, 0]} maxBarSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Anwesenheit Spiele */}
                <ChartCard title="Anwesenheit Spiele" empty={topAttendMatch.length === 0}>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={topAttendMatch} layout="vertical" margin={barMargin}>
                            <XAxis
                                type="number" domain={[0, 100]}
                                tick={{ fontSize: 11, fill: 'var(--md-outline)' }}
                                unit="%" axisLine={false} tickLine={false}
                            />
                            <YAxis
                                type="category" dataKey="name"
                                tick={{ fontSize: 10, fill: 'var(--md-on-surface)' }}
                                width={60} tickFormatter={v => v.split(' ').at(-1)}
                                axisLine={false} tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip unit="%" />} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
                            <Bar dataKey="attendance_match_pct" name="Anwesenheit" fill="#10b981"
                                radius={[0, 6, 6, 0]} maxBarSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

            </div>

            {/* ── Player table ── */}
            <div className="bg-white rounded-2xl border border-md-outline-variant/60 overflow-hidden">

                {/* Table header + column group tabs */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-md-outline-variant/60 gap-3 flex-wrap">
                    <h3
                        className="text-sm font-bold text-md-on-surface shrink-0"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                    >
                        Spielerstatistiken
                        <span className="ml-2 text-xs font-normal text-md-outline tabular-nums">
                            {sorted.length} Spieler
                        </span>
                    </h3>
                    <div className="flex gap-1.5 flex-wrap">
                        {COL_GROUPS.map(g => (
                            <ColTab
                                key={g.id}
                                id={g.id}
                                label={g.label}
                                icon={g.icon}
                                active={colGroup === g.id}
                                onClick={setColGroup}
                            />
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-md-outline-variant/60 bg-md-surface/60">

                                <Th
                                    col="name"
                                    sortCol={sortCol} sortDir={sortDir} onSort={handleSort}
                                    className="text-left px-5"
                                >
                                    Spieler
                                </Th>

                                {/* ── Spiele ── */}
                                {colGroup === 'spiele' && <>
                                    <Th col="matches_played" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right px-3">Sp.</Th>
                                    <Th col="match_minutes" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right px-3">Min.</Th>
                                    <Th col="total_goals" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right px-3 text-md-primary">Tore</Th>
                                    <Th col="total_assists" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right px-3">Ass.</Th>
                                    <Th col="clean_sheets" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right px-4">Z.N.</Th>
                                </>}

                                {/* ── Training ── */}
                                {colGroup === 'training' && <>
                                    <Th col="trainings_attended" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right px-3">Einh.</Th>
                                    <Th col="training_minutes" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right px-3">Min.</Th>
                                </>}

                                {/* ── Rating ── */}
                                {colGroup === 'rating' && <>
                                    <Th col="avg_match_rating" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right px-3">Ø Spiel</Th>
                                    <Th col="avg_training_rating" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right px-4">Ø Training</Th>
                                </>}

                                {/* ── Anwesenheit ── */}
                                {colGroup === 'anwesen' && <>
                                    <Th col="attendance_match_pct" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right px-3">Spiele</Th>
                                    <Th col="attendance_training_pct" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right px-4">Training</Th>
                                </>}
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-sm text-md-outline">
                                        Keine Daten
                                    </td>
                                </tr>
                            ) : sorted.map((p, i) => (
                                <tr
                                    key={p.id}
                                    className={`transition-colors hover:bg-md-surface/50
                    ${i < sorted.length - 1 ? 'border-b border-md-outline-variant/50' : ''}`}
                                >
                                    {/* Name + position */}
                                    <td className="px-5 py-3">
                                        <div
                                            className="font-semibold text-md-on-surface"
                                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                                        >
                                            {p.name}
                                        </div>
                                        {p.position && (
                                            <div className="text-md-outline" style={{ fontSize: 10 }}>
                                                {POS_SHORT[p.position] ?? p.position}
                                            </div>
                                        )}
                                    </td>

                                    {/* ── Spiele ── */}
                                    {colGroup === 'spiele' && <>
                                        <td className="text-right px-3 py-3 tabular-nums text-md-on-surface"
                                            style={{ fontFamily: "'DM Mono', monospace" }}>
                                            {fmt(p.matches_played)}
                                        </td>
                                        <td className="text-right px-3 py-3 tabular-nums text-md-outline"
                                            style={{ fontFamily: "'DM Mono', monospace" }}>
                                            {fmt(p.match_minutes)}
                                        </td>
                                        <td className="text-right px-3 py-3 tabular-nums font-bold text-md-primary"
                                            style={{ fontFamily: "'DM Mono', monospace" }}>
                                            {fmt(p.total_goals)}
                                        </td>
                                        <td className="text-right px-3 py-3 tabular-nums text-md-on-surface"
                                            style={{ fontFamily: "'DM Mono', monospace" }}>
                                            {fmt(p.total_assists)}
                                        </td>
                                        <td className="text-right px-4 py-3 tabular-nums text-md-on-surface"
                                            style={{ fontFamily: "'DM Mono', monospace" }}>
                                            {POS_SHORT[p.position] === 'TW' || p.clean_sheets > 0
                                                ? fmt(p.clean_sheets)
                                                : <span className="text-md-outline/40">–</span>
                                            }
                                        </td>
                                    </>}

                                    {/* ── Training ── */}
                                    {colGroup === 'training' && <>
                                        <td className="text-right px-3 py-3 tabular-nums text-md-on-surface"
                                            style={{ fontFamily: "'DM Mono', monospace" }}>
                                            {fmt(p.trainings_attended)}
                                        </td>
                                        <td className="text-right px-4 py-3 tabular-nums text-md-outline"
                                            style={{ fontFamily: "'DM Mono', monospace" }}>
                                            {fmt(p.training_minutes)}
                                        </td>
                                    </>}

                                    {/* ── Rating ── */}
                                    {colGroup === 'rating' && <>
                                        <td className="text-right px-3 py-3">
                                            {p.avg_match_rating != null ? (
                                                <span
                                                    className={`font-bold tabular-nums ${ratingColor(p.avg_match_rating)}`}
                                                    style={{ fontFamily: "'DM Mono', monospace" }}
                                                >
                                                    {p.avg_match_rating}
                                                </span>
                                            ) : <span className="text-md-outline">–</span>}
                                        </td>
                                        <td className="text-right px-4 py-3">
                                            {p.avg_training_rating != null ? (
                                                <span
                                                    className={`font-bold tabular-nums ${ratingColor(p.avg_training_rating)}`}
                                                    style={{ fontFamily: "'DM Mono', monospace" }}
                                                >
                                                    {p.avg_training_rating}
                                                </span>
                                            ) : <span className="text-md-outline">–</span>}
                                        </td>
                                    </>}

                                    {/* ── Anwesenheit ── */}
                                    {colGroup === 'anwesen' && <>
                                        <td className="text-right px-3 py-3">
                                            {p.attendance_match_pct != null ? (
                                                <span
                                                    className={`font-bold tabular-nums ${attendColor(p.attendance_match_pct)}`}
                                                    style={{ fontFamily: "'DM Mono', monospace" }}
                                                >
                                                    {p.attendance_match_pct}%
                                                </span>
                                            ) : <span className="text-md-outline">–</span>}
                                        </td>
                                        <td className="text-right px-4 py-3">
                                            {p.attendance_training_pct != null ? (
                                                <span
                                                    className={`font-bold tabular-nums ${attendColor(p.attendance_training_pct)}`}
                                                    style={{ fontFamily: "'DM Mono', monospace" }}
                                                >
                                                    {p.attendance_training_pct}%
                                                </span>
                                            ) : <span className="text-md-outline">–</span>}
                                        </td>
                                    </>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Zu Null note ── */}
                <div className="px-5 py-3 border-t border-md-outline-variant/40 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-md-outline" style={{ fontSize: 13 }}>info</span>
                    <p className="text-xs text-md-outline">
                        <span className="font-semibold">Z.N.</span> = Zu Null ·
                        Wird über das Feld <code className="bg-md-surface px-1 py-0.5 rounded text-xs">clean_sheet</code> pro Spiel erfasst ·
                        Nur für Torwarte hervorgehoben
                    </p>
                </div>
            </div>
        </div>
    )
}