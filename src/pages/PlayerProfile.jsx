import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
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

const POSITIONS = [
    'Torwart', 'Innenverteidiger', 'Außenverteidiger',
    'Defensives Mittelfeld', 'Zentrales Mittelfeld', 'Offensives Mittelfeld',
    'Linksaußen', 'Rechtsaußen', 'Stürmer',
]

const POS_SHORT = {
    'Torwart': 'TW', 'Innenverteidiger': 'IV', 'Außenverteidiger': 'AV',
    'Defensives Mittelfeld': 'DM', 'Zentrales Mittelfeld': 'ZM', 'Offensives Mittelfeld': 'OM',
    'Linksaußen': 'LA', 'Rechtsaußen': 'RA', 'Stürmer': 'ST',
}

const POS_ACCENT = {
    'Torwart': { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700' },
    'Innenverteidiger': { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700' },
    'Außenverteidiger': { bg: 'bg-sky-50', border: 'border-sky-400', text: 'text-sky-700' },
    'Defensives Mittelfeld': { bg: 'bg-violet-50', border: 'border-violet-500', text: 'text-violet-700' },
    'Zentrales Mittelfeld': { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700' },
    'Offensives Mittelfeld': { bg: 'bg-pink-50', border: 'border-pink-400', text: 'text-pink-700' },
    'Linksaußen': { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700' },
    'Rechtsaußen': { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700' },
    'Stürmer': { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700' },
}
const DEFAULT_ACCENT = { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-600' }

function Avatar({ name }) {
    const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'
    return (
        <div className="w-16 h-16 rounded-full bg-md-primary-container flex items-center justify-center shrink-0 text-xl font-medium text-md-on-primary-container">
            {initials}
        </div>
    )
}

// ─── Stat tile for stats tab ──────────────────────────────────
function StatTile({ label, value, icon, sub, color = 'text-md-on-surface' }) {
    return (
        <div className="bg-white rounded-2xl border border-md-outline-variant/60 p-4 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-xl bg-md-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-md-primary" style={{ fontSize: 15 }}>{icon}</span>
            </div>
            <div>
                <p className={`text-xl font-black tabular-nums leading-none ${color}`}
                    style={{ fontFamily: "'DM Mono', monospace" }}>
                    {value ?? 0}
                </p>
                <p className="text-xs text-md-outline mt-0.5 font-medium">{label}</p>
                {sub && <p className="text-xs text-md-outline/60 mt-0.5">{sub}</p>}
            </div>
        </div>
    )
}

// ─── Source flair for notes ───────────────────────────────────
function SourceFlair({ type, label }) {
    const cfg = {
        manual: { bg: 'bg-md-primary/10', text: 'text-md-primary', icon: 'sticky_note_2' },
        match: { bg: 'bg-red-50', text: 'text-red-700', icon: 'sports_soccer' },
        training: { bg: 'bg-green-50', text: 'text-green-700', icon: 'fitness_center' },
    }[type] ?? { bg: 'bg-gray-50', text: 'text-gray-600', icon: 'note' }

    return (
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg ${cfg.bg} ${cfg.text} shrink-0`}>
            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{cfg.icon}</span>
            {label}
        </span>
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
        update, remove,
    } = usePlayerProfile(id)

    const [tab, setTab] = useState('overview')
    const [noteText, setNoteText] = useState('')
    const [showInjuryForm, setShowInjuryForm] = useState(false)
    const [showAvailForm, setShowAvailForm] = useState(false)
    const [injuryForm, setInjuryForm] = useState({ injury_date: '', expected_return: '', description: '', status: 'active' })
    const [availForm, setAvailForm] = useState({ date_from: '', date_to: '', type: 'absent', note: '' })
    const [saving, setSaving] = useState(false)

    const [showEdit, setShowEdit] = useState(false)
    const [editForm, setEditForm] = useState(null)
    const [editSaving, setEditSaving] = useState(false)
    const [editErr, setEditErr] = useState(null)

    function openEdit() {
        setEditForm({
            name: player?.name ?? '',
            position: player?.position ?? '',
            number: player?.number != null ? String(player.number) : '',
            birth_year: player?.birth_year != null ? String(player.birth_year) : '',
        })
        setEditErr(null)
        setShowEdit(true)
    }

    async function handleEditSave(e) {
        e.preventDefault()
        setEditSaving(true); setEditErr(null)
        try {
            await update(id, {
                name: editForm.name,
                position: editForm.position || null,
                number: editForm.number ? parseInt(editForm.number) : null,
                birth_year: editForm.birth_year ? parseInt(editForm.birth_year) : null,
            })
            setShowEdit(false)
        } catch (err) { setEditErr(err.message) }
        finally { setEditSaving(false) }
    }

    async function handleDelete() {
        if (!confirm(`${player?.name ?? 'Spieler'} wirklich löschen?`)) return
        try { await remove(id); navigate('/players') }
        catch (err) { alert(err.message || 'Fehler beim Löschen') }
    }

    // ── Merged notes (manual + match + training) ──────────────
    const allNotes = useMemo(() => {
        const manual = notes.map(n => ({
            key: `manual-${n.id}`,
            id: n.id,
            source: 'manual',
            content: n.content,
            date: n.created_at,
            label: 'Notiz',
            canDelete: true,
        }))

        const matchNotes = matchHistory
            .filter(m => m.note && m.note.trim())
            .map(m => ({
                key: `match-${m.id}`,
                id: null,
                source: 'match',
                content: m.note,
                date: m.match_days?.date,
                label: m.match_days?.opponent ?? 'Spiel',
                canDelete: false,
            }))

        const trainingNotes = trainingHistory
            .filter(t => t.note && t.note.trim())
            .map(t => ({
                key: `training-${t.id}`,
                id: null,
                source: 'training',
                content: t.note,
                date: t.training_sessions?.date,
                label: t.training_sessions?.title || t.training_sessions?.type || 'Training',
                canDelete: false,
            }))

        return [...manual, ...matchNotes, ...trainingNotes]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
    }, [notes, matchHistory, trainingHistory])

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

    // ── Chart data ────────────────────────────────────────────
    const ratingChartData = matchHistory
        .filter(m => m.rating != null)
        .map(m => ({
            date: new Date(m.match_days?.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
            Rating: Number(m.rating),
        }))
        .reverse()

    const minutesChartData = matchHistory
        .filter(m => m.status === 'starter' || m.status === 'substitute')
        .map(m => ({
            date: new Date(m.match_days?.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
            Minuten: m.minutes_played ?? m.minutes ?? 0,
        }))
        .reverse()

    const trainingRatingData = trainingHistory
        .filter(t => t.rating != null && t.present)
        .map(t => ({
            date: new Date(t.training_sessions?.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
            Rating: Number(t.rating),
        }))
        .reverse()

    const totalNoteCount = allNotes.length

    const tabs = [
        { id: 'overview', label: 'Übersicht', icon: 'person' },
        { id: 'stats', label: 'Statistik', icon: 'bar_chart' },
        { id: 'notes', label: `Notizen (${totalNoteCount})`, icon: 'sticky_note_2' },
        { id: 'injuries', label: 'Verletzungen', icon: 'healing' },
        { id: 'availability', label: 'Verfügbarkeit', icon: 'event_available' },
        { id: 'gdpr', label: 'DSGVO', icon: 'verified_user' },
    ]

    async function handleAddNote(e) {
        e.preventDefault()
        if (!noteText.trim()) return
        setSaving(true)
        try { await addNote(noteText.trim()); setNoteText('') } finally { setSaving(false) }
    }

    async function handleAddInjury(e) {
        e.preventDefault(); setSaving(true)
        try {
            await addInjury(injuryForm)
            setShowInjuryForm(false)
            setInjuryForm({ injury_date: '', expected_return: '', description: '', status: 'active' })
        } finally { setSaving(false) }
    }

    async function handleAddAvail(e) {
        e.preventDefault(); setSaving(true)
        try {
            await setAvail(availForm)
            setShowAvailForm(false)
            setAvailForm({ date_from: '', date_to: '', type: 'absent', note: '' })
        } finally { setSaving(false) }
    }

    return (
        <div className="p-4 md:p-8 max-w-3xl">

            {/* Nav bar */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => navigate('/players')} className="btn-text px-0 text-md-primary">
                    <span className="material-symbols-outlined icon-sm">arrow_back</span>
                    Alle Spieler
                </button>
                {canEdit && (
                    <div className="flex items-center gap-1">
                        <button onClick={openEdit} className="btn-icon w-9 h-9 hover:bg-md-primary/10 hover:text-md-primary" title="Spieler bearbeiten">
                            <span className="material-symbols-outlined icon-sm">edit</span>
                        </button>
                        <button onClick={handleDelete} className="btn-icon w-9 h-9 hover:bg-red-50 hover:text-red-600" title="Spieler löschen">
                            <span className="material-symbols-outlined icon-sm">delete</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Header card */}
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
                            { label: 'Spiele', value: stats.matches_played },
                            { label: 'Tore', value: stats.total_goals },
                            { label: 'Assists', value: stats.total_assists },
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
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors
                            ${tab === t.id ? 'text-md-primary border-b-2 border-md-primary' : 'text-md-on-surface-variant hover:text-md-on-surface'}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Tab: Übersicht ── */}
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

            {/* ── Tab: Statistik ── */}
            {tab === 'stats' && (
                <div className="space-y-5">

                    {/* ── Kennzahlen-Kacheln ── */}
                    {stats ? (
                        <>
                            {/* Spiele */}
                            <div>
                                <p className="text-xs font-bold text-md-outline uppercase tracking-wider mb-2 px-0.5">Spiele</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <StatTile label="Spiele" value={stats.matches_played} icon="sports_soccer" />
                                    <StatTile label="Minuten" value={stats.match_minutes} icon="schedule" sub="Spielminuten gesamt" />
                                    <StatTile label="Tore" value={stats.total_goals} icon="emoji_events" color="text-md-primary" />
                                    <StatTile label="Assists" value={stats.total_assists} icon="handshake" />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                                    <StatTile label="Zu Null" value={stats.clean_sheets} icon="shield" />
                                    <StatTile label="Ø Rating"
                                        value={stats.avg_match_rating != null ? `${stats.avg_match_rating}★` : '–'}
                                        icon="star"
                                        color={stats.avg_match_rating >= 7 ? 'text-green-600' : stats.avg_match_rating >= 5 ? 'text-amber-500' : 'text-red-500'}
                                    />
                                    <StatTile label="Anwesenheit Spiele"
                                        value={stats.attendance_match_pct != null ? `${stats.attendance_match_pct}%` : '–'}
                                        icon="check_circle"
                                        color={stats.attendance_match_pct >= 75 ? 'text-green-600' : stats.attendance_match_pct >= 50 ? 'text-amber-500' : 'text-red-500'}
                                    />
                                </div>
                            </div>

                            {/* Training */}
                            <div>
                                <p className="text-xs font-bold text-md-outline uppercase tracking-wider mb-2 px-0.5">Training</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <StatTile label="Einheiten" value={stats.trainings_attended} icon="fitness_center" />
                                    <StatTile label="Minuten" value={stats.training_minutes} icon="schedule" sub="Trainingsminuten gesamt" />
                                    <StatTile label="Ø Rating"
                                        value={stats.avg_training_rating != null ? `${stats.avg_training_rating}★` : '–'}
                                        icon="star"
                                        color={stats.avg_training_rating >= 7 ? 'text-green-600' : stats.avg_training_rating >= 5 ? 'text-amber-500' : 'text-red-500'}
                                    />
                                    <StatTile label="Anwesenheit Training"
                                        value={stats.attendance_training_pct != null ? `${stats.attendance_training_pct}%` : '–'}
                                        icon="check_circle"
                                        color={stats.attendance_training_pct >= 75 ? 'text-green-600' : stats.attendance_training_pct >= 50 ? 'text-amber-500' : 'text-red-500'}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="card-outlined py-8 text-center text-sm text-md-on-surface-variant">
                            Keine Statistiken verfügbar
                        </div>
                    )}

                    {/* ── Diagramme ── */}
                    {ratingChartData.length > 1 && (
                        <div className="card-outlined p-4">
                            <h3 className="text-sm font-medium text-md-on-surface mb-3">Rating-Verlauf Spiele</h3>
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={ratingChartData}>
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 12, border: '1px solid var(--md-outline-variant)', fontSize: 12 }}
                                        formatter={v => [`${v}★`, 'Rating']}
                                    />
                                    <Line type="monotone" dataKey="Rating" stroke="var(--md-primary)"
                                        dot={{ r: 3, fill: 'var(--md-primary)' }} strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {minutesChartData.length > 1 && (
                        <div className="card-outlined p-4">
                            <h3 className="text-sm font-medium text-md-on-surface mb-3">Spielminuten</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={minutesChartData}>
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={24} domain={[0, 90]} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 12, border: '1px solid var(--md-outline-variant)', fontSize: 12 }}
                                        formatter={v => [`${v} Min.`, 'Minuten']}
                                    />
                                    <Bar dataKey="Minuten" fill="var(--md-primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {trainingRatingData.length > 1 && (
                        <div className="card-outlined p-4">
                            <h3 className="text-sm font-medium text-md-on-surface mb-3">Rating-Verlauf Training</h3>
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={trainingRatingData}>
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 12, border: '1px solid var(--md-outline-variant)', fontSize: 12 }}
                                        formatter={v => [`${v}★`, 'Rating']}
                                    />
                                    <Line type="monotone" dataKey="Rating" stroke="#10b981"
                                        dot={{ r: 3, fill: '#10b981' }} strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {ratingChartData.length <= 1 && minutesChartData.length <= 1 && trainingRatingData.length <= 1 && (
                        <div className="card-outlined py-8 text-center text-sm text-md-on-surface-variant">
                            Nicht genug Daten für Diagramme
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Notizen ── */}
            {tab === 'notes' && (
                <div className="space-y-3">
                    {canEdit && (
                        <form onSubmit={handleAddNote} className="flex gap-2">
                            <input type="text" className="flex-1 md-input py-3" placeholder="Neue Notiz..."
                                value={noteText} onChange={e => setNoteText(e.target.value)} />
                            <button type="submit" disabled={saving || !noteText.trim()} className="btn-tonal px-4">
                                <span className="material-symbols-outlined icon-sm">send</span>
                            </button>
                        </form>
                    )}

                    {allNotes.length === 0 ? (
                        <div className="card-outlined py-10 text-center text-sm text-md-on-surface-variant">Keine Notizen</div>
                    ) : (
                        <div className="card-outlined overflow-hidden">
                            {allNotes.map((note, i) => (
                                <div
                                    key={note.key}
                                    className={`flex items-start gap-3 px-4 py-3 group
                                        ${i < allNotes.length - 1 ? 'border-b border-md-outline-variant' : ''}
                                        ${note.source !== 'manual' ? 'bg-md-surface/40' : ''}`}
                                >
                                    {/* Left icon */}
                                    <span className={`material-symbols-outlined icon-sm mt-0.5 shrink-0
                                        ${note.source === 'match' ? 'text-red-400' : note.source === 'training' ? 'text-green-500' : 'text-md-outline'}`}
                                        style={{ fontSize: 15 }}>
                                        {note.source === 'match' ? 'sports_soccer' : note.source === 'training' ? 'fitness_center' : 'chat_bubble'}
                                    </span>

                                    <div className="flex-1 min-w-0">
                                        {/* Flair + date row */}
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <SourceFlair type={note.source} label={note.label} />
                                            <span className="text-xs text-md-outline">
                                                {note.date ? new Date(note.date).toLocaleDateString('de-DE') : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-md-on-surface">{note.content}</p>
                                    </div>

                                    {/* Delete — only manual notes */}
                                    {canEdit && note.canDelete && (
                                        <button
                                            onClick={() => deleteNote(note.id)}
                                            className="btn-icon w-7 h-7 opacity-0 group-hover:opacity-100 text-md-outline hover:text-md-error transition-opacity shrink-0"
                                        >
                                            <span className="material-symbols-outlined icon-sm">close</span>
                                        </button>
                                    )}

                                    {/* Read-only indicator for match/training notes */}
                                    {note.source !== 'manual' && (
                                        <span className="material-symbols-outlined text-md-outline/30 shrink-0 mt-0.5" style={{ fontSize: 14 }}>
                                            lock
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Legend */}
                    <div className="flex items-center gap-4 px-1">
                        {[
                            { type: 'manual', label: 'Manuelle Notiz' },
                            { type: 'match', label: 'Aus Spieltag' },
                            { type: 'training', label: 'Aus Training' },
                        ].map(f => (
                            <div key={f.type} className="flex items-center gap-1.5">
                                <SourceFlair type={f.type} label={f.label} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Tab: Verletzungen ── */}
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

            {/* ── Tab: Verfügbarkeit ── */}
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

            {/* ── Tab: DSGVO ── */}
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

            {/* ── Edit player dialog ── */}
            {showEdit && editForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50">
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl"
                        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
                            <div className="w-9 h-9 rounded-xl bg-md-primary-container flex items-center justify-center">
                                <span className="material-symbols-outlined icon-sm text-md-primary">edit</span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-base font-bold text-md-on-surface">Spieler bearbeiten</h2>
                                <p className="text-xs text-md-outline">{player.name}</p>
                            </div>
                            <button onClick={() => setShowEdit(false)} className="btn-icon w-8 h-8">
                                <span className="material-symbols-outlined icon-sm">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleEditSave} className="p-5 space-y-4">
                            {editErr && (
                                <div className="flex items-start gap-2 text-sm text-md-error bg-red-50 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined icon-sm shrink-0 mt-0.5">error</span>
                                    {editErr}
                                </div>
                            )}
                            <div className="md-field">
                                <input required className="md-input" placeholder=" " value={editForm.name}
                                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                                <label className="md-input-label">Vollständiger Name *</label>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-md-on-surface-variant mb-2 px-0.5">Position</p>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {POSITIONS.map(pos => {
                                        const a = POS_ACCENT[pos] ?? DEFAULT_ACCENT
                                        const selected = editForm.position === pos
                                        return (
                                            <button key={pos} type="button"
                                                onClick={() => setEditForm(f => ({ ...f, position: selected ? '' : pos }))}
                                                className={`px-2 py-2 rounded-xl text-xs font-medium text-center transition-all border
                                                    ${selected
                                                        ? `${a.bg} ${a.text} ${a.border} shadow-sm`
                                                        : 'bg-white border-md-outline-variant text-md-on-surface-variant hover:bg-md-surface'
                                                    }`}>
                                                <span className="block font-bold">{POS_SHORT[pos]}</span>
                                                <span className="block text-xs opacity-70 truncate">{pos.split(' ')[0]}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="md-field">
                                    <input type="number" min="1" max="99" className="md-input" placeholder=" "
                                        value={editForm.number}
                                        onChange={e => setEditForm(f => ({ ...f, number: e.target.value }))} />
                                    <label className="md-input-label">Rückennummer</label>
                                </div>
                                <div className="md-field">
                                    <input type="number" min="1950" max={new Date().getFullYear()} className="md-input" placeholder=" "
                                        value={editForm.birth_year}
                                        onChange={e => setEditForm(f => ({ ...f, birth_year: e.target.value }))} />
                                    <label className="md-input-label">Jahrgang</label>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowEdit(false)} className="btn-outlined flex-1 justify-center">Abbrechen</button>
                                <button type="submit" disabled={editSaving} className="btn-filled flex-1 justify-center">
                                    {editSaving
                                        ? <><span className="material-symbols-outlined icon-sm animate-spin">progress_activity</span>Speichern…</>
                                        : <><span className="material-symbols-outlined icon-sm">check</span>Speichern</>
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Verletzungs-Dialog ── */}
            {showInjuryForm && (
                <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-el3">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
                            <span className="material-symbols-outlined text-md-error">healing</span>
                            <h2 className="text-base font-medium flex-1">Verletzung eintragen</h2>
                            <button onClick={() => setShowInjuryForm(false)} className="btn-icon w-8 h-8">
                                <span className="material-symbols-outlined icon-sm">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleAddInjury} className="p-5 space-y-4">
                            <div className="md-field">
                                <input required type="date" className="md-input" value={injuryForm.injury_date}
                                    onChange={e => setInjuryForm(f => ({ ...f, injury_date: e.target.value }))} />
                                <label className="md-input-label">Verletzungsdatum *</label>
                            </div>
                            <div className="md-field">
                                <input type="date" className="md-input" value={injuryForm.expected_return}
                                    onChange={e => setInjuryForm(f => ({ ...f, expected_return: e.target.value }))} />
                                <label className="md-input-label">Voraussichtliche Rückkehr</label>
                            </div>
                            <div className="md-field">
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

            {/* ── Verfügbarkeits-Dialog ── */}
            {showAvailForm && (
                <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-el3">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
                            <span className="material-symbols-outlined text-md-primary">event_available</span>
                            <h2 className="text-base font-medium flex-1">Verfügbarkeit eintragen</h2>
                            <button onClick={() => setShowAvailForm(false)} className="btn-icon w-8 h-8">
                                <span className="material-symbols-outlined icon-sm">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleAddAvail} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="md-field">
                                    <input required type="date" className="md-input" value={availForm.date_from}
                                        onChange={e => setAvailForm(f => ({ ...f, date_from: e.target.value }))} />
                                    <label className="md-input-label">Von *</label>
                                </div>
                                <div className="md-field">
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
                            <div className="md-field">
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