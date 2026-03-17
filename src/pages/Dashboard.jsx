import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard'
import Skeleton from '../components/Skeleton'

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function today() {
    const d = new Date()
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// ─── Carousel tile — cycles through slides automatically ──
// slides: [{ value, sublabel }]  — icon is fixed per tile, not per slide
function CarouselTile({ slides, icon, to, interval = 3000 }) {
    const [idx, setIdx] = useState(0)

    useEffect(() => {
        const t = setInterval(() => setIdx(i => (i + 1) % slides.length), interval)
        return () => clearInterval(t)
    }, [slides.length, interval])

    const slide = slides[idx]

    return (
        <Link to={to}>
            <div className="group relative bg-white rounded-2xl border border-md-outline-variant/60
        p-4 flex flex-col hover:shadow-md transition-all duration-200 overflow-hidden"
                style={{ minHeight: '7rem' }}>
                <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-md-primary/5
          group-hover:bg-md-primary/10 transition-colors" />

                {/* Fixed icon */}
                <div className="w-9 h-9 rounded-xl bg-md-primary-container flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-md-primary" style={{ fontSize: 18 }}>
                        {icon}
                    </span>
                </div>

                {/* Value + sublabel — animate on slide change */}
                <div key={idx} className="flex-1" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
                    <p className="text-2xl font-black text-md-on-surface leading-none tabular-nums"
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        {slide.value}
                    </p>
                    <p className="text-xs text-md-outline mt-1 font-medium">{slide.sublabel}</p>
                </div>

                {/* Dots — scale down for many slides */}
                <div className="flex justify-center mt-2" style={{ gap: 3 }}>
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={e => { e.preventDefault(); setIdx(i) }}
                            style={{
                                width: i === idx ? 6 : slides.length > 5 ? 3 : 4,
                                height: i === idx ? 4 : slides.length > 5 ? 3 : 4,
                                padding: 0,
                                flexShrink: 0,
                                borderRadius: 999,
                                transition: 'all 0.2s',
                                background: i === idx
                                    ? 'var(--md-primary, #006A60)'
                                    : 'rgba(120,130,140,0.35)',
                                border: 'none',
                            }}
                        />
                    ))}
                </div>
            </div>
        </Link>
    )
}

// Inject fade animation once
if (typeof document !== 'undefined' && !document.getElementById('carousel-tile-style')) {
    const s = document.createElement('style')
    s.id = 'carousel-tile-style'
    s.textContent = '@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }'
    document.head.appendChild(s)
}

// ─── Section card ─────────────────────────────────────────
function SectionCard({ title, icon, iconColor = 'text-md-primary', to, toLabel, children, empty, emptyText }) {
    return (
        <div className="bg-white rounded-2xl border border-md-outline-variant/60 overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-md-outline-variant/60">
                <span className={`material-symbols-outlined icon-sm ${iconColor}`}>{icon}</span>
                <h2 className="text-sm font-bold text-md-on-surface flex-1"
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    {title}
                </h2>
                {to && (
                    <Link to={to}
                        className="text-xs font-medium text-md-primary hover:underline px-1">
                        {toLabel ?? 'Alle'}
                    </Link>
                )}
            </div>
            {empty
                ? <div className="py-8 text-center text-sm text-md-outline">{emptyText}</div>
                : children
            }
        </div>
    )
}

export default function Dashboard() {
    const { summary, nextEvents, topScorers, recentNotes, activeInjuries, loading } = useDashboard()

    if (loading) return (
        <div className="p-4 md:p-8 max-w-5xl space-y-5">
            <div className="mb-2">
                <Skeleton className="h-8 w-36 mb-1" />
                <Skeleton className="h-4 w-56" />
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[...Array(6)].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <Skeleton className="h-48 rounded-2xl" />
                <Skeleton className="h-48 rounded-2xl" />
            </div>
        </div>
    )

    const t = summary?.training_by_type ?? {}

    const playerSlides = [
        { value: summary?.player_count ?? 0, sublabel: 'Gesamt' },
        { value: summary?.defense_count ?? 0, sublabel: 'Defensiv' },
        { value: summary?.midfield_count ?? 0, sublabel: 'Mittelfeld' },
        { value: summary?.offense_count ?? 0, sublabel: 'Offensiv' },
    ]

    const trainingSlides = [
        { value: summary?.session_count ?? 0, sublabel: 'Gesamt' },
        { value: t['Technik'] ?? 0, sublabel: 'Technik' },
        { value: t['Taktik'] ?? 0, sublabel: 'Taktik' },
        { value: t['Kondition'] ?? 0, sublabel: 'Kondition' },
        { value: t['Spielform'] ?? 0, sublabel: 'Spielform' },
        { value: t['Torschuss'] ?? 0, sublabel: 'Torschuss' },
        { value: t['Standards'] ?? 0, sublabel: 'Standards' },
        { value: t['Testspiel'] ?? 0, sublabel: 'Testspiel' },
        { value: t['Sonstiges'] ?? 0, sublabel: 'Sonstiges' },
    ]

    const matchSlides = [
        { value: summary?.match_count ?? 0, sublabel: 'Gesamt' },
        { value: summary?.wins ?? 0, sublabel: 'Siege' },
        { value: summary?.draws ?? 0, sublabel: 'Unentschieden' },
        { value: summary?.losses ?? 0, sublabel: 'Niederlagen' },
        { value: summary?.goals_for ?? 0, sublabel: 'Tore' },
        { value: summary?.goals_against ?? 0, sublabel: 'Gegentore' },
    ]

    const ratingSlides = [
        { value: summary?.avg_match_rating != null ? `${summary.avg_match_rating}` : '–', sublabel: 'Spiel' },
        { value: summary?.avg_training_rating != null ? `${summary.avg_training_rating}` : '–', sublabel: 'Training' },
    ]

    const attendanceSlides = [
        { value: summary?.avg_attendance_match_pct != null ? `${summary.avg_attendance_match_pct}%` : '–', sublabel: 'Spiele' },
        { value: summary?.avg_attendance_training_pct != null ? `${summary.avg_attendance_training_pct}%` : '–', sublabel: 'Training' },
    ]

    const vacationCount = summary?.vacation_count ?? 0

    const injurySlides = [
        { value: summary?.active_injuries ?? 0, sublabel: 'Verletzt' },
        { value: vacationCount, sublabel: 'Urlaub' },
    ]

    return (
        <div className="p-4 md:p-8 max-w-5xl">

            {/* ── Header ── */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-md-on-surface tracking-tight"
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    Übersicht
                </h1>
                <p className="text-sm text-md-outline mt-0.5">{today()}</p>
            </div>

            {/* ── Stat tiles ── */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                <CarouselTile slides={playerSlides} icon="group" to="/players" interval={2500} />
                <CarouselTile slides={trainingSlides} icon="calendar_month" to="/training" interval={2000} />
                <CarouselTile slides={matchSlides} icon="sports_soccer" to="/matches" interval={2200} />
                <CarouselTile slides={ratingSlides} icon="star" to="/stats" interval={3000} />
                <CarouselTile slides={attendanceSlides} icon="check_circle" to="/stats" interval={3500} />
                <CarouselTile slides={injurySlides} icon="healing" to="/players" interval={4000} />
            </div>

            {/* ── Row 1: Termine + Torschützen ── */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">

                {/* Next events */}
                <SectionCard
                    title="Nächste Termine" icon="event"
                    empty={nextEvents.length === 0} emptyText="Keine bevorstehenden Termine"
                >
                    <ul>
                        {nextEvents.map((ev, i) => {
                            const isMatch = ev.type === 'match'
                            return (
                                <li key={`${ev.type}-${ev.id}`}
                                    className={`flex items-center gap-3 px-4 py-3 ${i < nextEvents.length - 1 ? 'border-b border-md-outline-variant/50' : ''}`}>
                                    {/* Type indicator */}
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border
                    ${isMatch
                                            ? 'bg-red-50 border-red-200'
                                            : 'bg-md-primary-container/50 border-md-primary/20'}`}>
                                        <span className={`material-symbols-outlined ${isMatch ? 'text-red-600' : 'text-md-primary'}`}
                                            style={{ fontSize: 15 }}>
                                            {isMatch ? 'sports_soccer' : 'fitness_center'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-md-on-surface truncate"
                                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                            {ev.title}
                                        </p>
                                        {ev.detail && <p className="text-xs text-md-outline">{ev.detail}</p>}
                                    </div>
                                    <p className="text-xs font-medium text-md-outline shrink-0 tabular-nums"
                                        style={{ fontFamily: "'DM Mono', monospace" }}>
                                        {new Date(ev.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                                    </p>
                                </li>
                            )
                        })}
                    </ul>
                </SectionCard>

                {/* Top scorers */}
                <SectionCard
                    title="Top-Torschützen" icon="emoji_events"
                    to="/stats" toLabel="Alle"
                    empty={topScorers.length === 0} emptyText="Noch keine Spieldaten"
                >
                    <ul>
                        {topScorers.map((p, i) => (
                            <li key={p.player_id}
                                className={`flex items-center gap-3 px-4 py-3 ${i < topScorers.length - 1 ? 'border-b border-md-outline-variant/50' : ''}`}>
                                {/* Rank */}
                                <span className={`text-sm font-black w-5 shrink-0 tabular-nums text-center
                  ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-md-outline/40'}`}
                                    style={{ fontFamily: "'DM Mono', monospace" }}>
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-md-on-surface truncate"
                                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                        {p.name}
                                    </p>
                                    {p.position && <p className="text-xs text-md-outline">{p.position}</p>}
                                </div>
                                <div className="flex items-center gap-3 text-xs shrink-0">
                                    <span className="flex items-center gap-1 font-bold text-md-primary tabular-nums"
                                        style={{ fontFamily: "'DM Mono', monospace" }}>
                                        <span className="material-symbols-outlined text-md-primary" style={{ fontSize: 13 }}>sports_soccer</span>
                                        {p.goals}
                                    </span>
                                    <span className="flex items-center gap-1 text-md-outline tabular-nums"
                                        style={{ fontFamily: "'DM Mono', monospace" }}>
                                        <span className="material-symbols-outlined text-md-outline" style={{ fontSize: 13 }}>assistant</span>
                                        {p.assists}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </SectionCard>
            </div>

            {/* ── Row 2: Injuries + Notes ── */}
            <div className="grid md:grid-cols-2 gap-4">

                {/* Active injuries */}
                {activeInjuries.length > 0 && (
                    <SectionCard
                        title="Aktive Verletzungen" icon="local_hospital" iconColor="text-red-500"
                        to="/injuries" toLabel="Alle"
                    >
                        <ul>
                            {activeInjuries.map((inj, i) => (
                                <li key={inj.id}
                                    className={`flex items-center gap-3 px-4 py-3 ${i < activeInjuries.length - 1 ? 'border-b border-md-outline-variant/50' : ''}`}>
                                    <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200
                    flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-red-500" style={{ fontSize: 15 }}>healing</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-md-on-surface"
                                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                            {inj.players?.name}
                                        </p>
                                        {inj.description && (
                                            <p className="text-xs text-md-outline truncate">{inj.description}</p>
                                        )}
                                    </div>
                                    {inj.expected_return && (
                                        <p className="text-xs text-md-outline shrink-0 tabular-nums"
                                            style={{ fontFamily: "'DM Mono', monospace" }}>
                                            {new Date(inj.expected_return).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </SectionCard>
                )}

                {/* Recent notes */}
                <SectionCard
                    title="Letzte Notizen" icon="sticky_note_2"
                    to="/players" toLabel="Alle"
                    empty={recentNotes.length === 0} emptyText="Noch keine Notizen"
                >
                    <ul>
                        {recentNotes.map((note, i) => {
                            const initial = note.players?.name?.charAt(0)?.toUpperCase() ?? '?'
                            return (
                                <li key={note.id}
                                    className={`flex items-center gap-3 px-4 py-3 ${i < recentNotes.length - 1 ? 'border-b border-md-outline-variant/50' : ''}`}>
                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-xl bg-md-secondary-container border border-md-secondary-container
                    flex items-center justify-center shrink-0 font-bold text-xs text-md-on-primary-container"
                                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                        {initial}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-md-on-surface"
                                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                            {note.players?.name}
                                        </p>
                                        <p className="text-xs text-md-outline truncate">{note.content}</p>
                                    </div>
                                    <p className="text-xs text-md-outline/60 shrink-0 tabular-nums"
                                        style={{ fontFamily: "'DM Mono', monospace" }}>
                                        {new Date(note.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                                    </p>
                                </li>
                            )
                        })}
                    </ul>
                </SectionCard>
            </div>
        </div>
    )
}