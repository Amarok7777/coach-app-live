import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMatchDetail } from '../hooks/useMatchDetail'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'

const STATUS_OPTS = [
    { value: 'starter', label: 'Startelf', icon: 'sports_soccer', color: 'bg-green-500', ring: 'ring-green-300' },
    { value: 'substitute', label: 'Eingewechselt', icon: 'swap_horiz', color: 'bg-amber-400', ring: 'ring-amber-300' },
    { value: 'absent', label: 'Fehlt', icon: 'person_off', color: 'bg-gray-200', ring: 'ring-gray-200' },
]

function statusCfg(status) {
    return STATUS_OPTS.find(o => o.value === status) ?? STATUS_OPTS[2]
}

function QRCodeDisplay({ url }) {
    const ref = useRef(null)
    useEffect(() => {
        if (!url || !ref.current) return
        import('qrcode').then(QR => QR.toCanvas(ref.current, url, { width: 180, margin: 2 })).catch(() => { })
    }, [url])
    return <canvas ref={ref} className="rounded-xl" />
}

// ─── Player row ────────────────────────────────────────────────
function PlayerRow({ player, att, canEdit, onUpsert }) {
    const [showMinutes, setShowMinutes] = useState(false)
    const [showNote, setShowNote] = useState(false)

    const status = att?.status ?? 'absent'
    const goals = att?.goals ?? 0
    const assists = att?.assists ?? 0
    const rating = att?.rating ?? null
    const note = att?.note ?? ''
    const minutes_on = att?.minutes_on ?? null
    const minutes_off = att?.minutes_off ?? null
    const minutesPlayed = att?.minutes_played ?? null
    const isPlaying = status !== 'absent'
    const hasMinutes = minutes_on !== null || minutes_off !== null
    const cfg = statusCfg(status)

    function cycleStatus() {
        const order = ['absent', 'starter', 'substitute']
        const next = order[(order.indexOf(status) + 1) % order.length]
        onUpsert(player.id, { status: next })
    }

    return (
        <div className={`border-b border-md-outline-variant/60 last:border-0 transition-colors
            ${isPlaying ? '' : 'opacity-60'}`}>

            {/* ── Top row: status circle + number + name + note button ── */}
            <div className="flex items-center gap-3 px-4 py-3">

                {/* Status toggle */}
                {canEdit ? (
                    <button
                        onClick={cycleStatus}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0
                            transition-all active:scale-90 ${cfg.color}
                            ${isPlaying ? `ring-2 ${cfg.ring} ring-offset-1 shadow-sm` : ''}`}
                        title={`${cfg.label} — tippen zum Wechseln`}
                    >
                        <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>
                            {cfg.icon}
                        </span>
                    </button>
                ) : (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>
                            {cfg.icon}
                        </span>
                    </div>
                )}

                {/* Jersey number */}
                {player.number && (
                    <span className="text-xs font-black text-md-outline/40 w-5 shrink-0 tabular-nums text-center"
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        {player.number}
                    </span>
                )}

                {/* Name + status badge + minutes badge */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-md-on-surface truncate"
                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                            {player.name}
                        </p>
                        {!canEdit && isPlaying && (
                            <span className={`text-xs font-medium px-1.5 py-px rounded-md border
                                ${status === 'starter'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {cfg.label}
                            </span>
                        )}
                        {isPlaying && minutesPlayed !== null && (
                            <span className="text-xs font-medium px-1.5 py-px rounded-md bg-md-surface text-md-outline border border-md-outline-variant tabular-nums"
                                style={{ fontFamily: "'DM Mono', monospace" }}>
                                {minutesPlayed}'
                            </span>
                        )}
                    </div>
                    {player.position && (
                        <p className="text-xs text-md-outline mt-0.5">{player.position}</p>
                    )}
                </div>

                {/* Note button — always far right, never overlaps */}
                <button
                    onClick={() => setShowNote(s => !s)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0
                        ${note
                            ? 'bg-md-primary-container text-md-primary'
                            : 'text-md-outline/40 hover:bg-md-surface hover:text-md-outline'}`}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                        {note ? 'sticky_note_2' : 'note_add'}
                    </span>
                </button>
            </div>

            {/* ── Actions row — only when playing ── */}
            {/* Rendered below name row so elements never overlap on small screens */}
            {isPlaying && canEdit && (
                <div className="flex items-center gap-2 px-4 pb-3 -mt-1 flex-wrap">

                    {/* Goals */}
                    <div className="flex items-center gap-1 text-xs">
                        <span className="text-md-outline font-medium">T</span>
                        <input
                            type="number" min="0" max="20" value={goals}
                            onChange={e => onUpsert(player.id, { goals: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-10 text-center border border-md-outline-variant rounded-lg py-1.5
                                bg-white focus:outline-none focus:border-md-primary tabular-nums text-xs font-bold"
                        />
                    </div>

                    {/* Assists */}
                    <div className="flex items-center gap-1 text-xs">
                        <span className="text-md-outline font-medium">A</span>
                        <input
                            type="number" min="0" max="20" value={assists}
                            onChange={e => onUpsert(player.id, { assists: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-10 text-center border border-md-outline-variant rounded-lg py-1.5
                                bg-white focus:outline-none focus:border-md-primary tabular-nums text-xs font-bold"
                        />
                    </div>

                    {/* Rating */}
                    <select
                        value={rating ?? ''}
                        onChange={e => onUpsert(player.id, { rating: e.target.value ? parseFloat(e.target.value) : null })}
                        className="text-xs border border-md-outline-variant rounded-lg px-1.5 py-1.5
                            bg-white focus:outline-none focus:border-md-primary shrink-0"
                        style={{ minWidth: 68 }}
                    >
                        <option value="">Note</option>
                        {[...Array(10)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1} ★</option>
                        ))}
                    </select>

                    {/* Minutes button */}
                    <button
                        onClick={() => setShowMinutes(s => !s)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors shrink-0
                            ${hasMinutes
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-white text-md-outline border-md-outline-variant hover:bg-md-surface'}`}
                        title="Wechselminuten"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>timer</span>
                        {hasMinutes ? `${minutes_on ?? '–'}/${minutes_off ?? '90'}` : 'Min.'}
                    </button>
                </div>
            )}

            {/* Read-only stats when canEdit is false */}
            {isPlaying && !canEdit && (goals > 0 || assists > 0 || rating) && (
                <div className="flex items-center gap-2 px-4 pb-3 -mt-1">
                    {goals > 0 && <Badge variant="primary">{goals} T</Badge>}
                    {assists > 0 && <Badge variant="secondary">{assists} A</Badge>}
                    {rating && (
                        <span className={`text-xs font-bold px-1.5 py-px rounded-md tabular-nums
                            ${rating >= 8 ? 'bg-green-50 text-green-700' : rating >= 5 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}
                            style={{ fontFamily: "'DM Mono', monospace" }}>
                            {rating}★
                        </span>
                    )}
                </div>
            )}

            {/* ── Minutes panel ── */}
            {showMinutes && isPlaying && canEdit && (
                <div className="mx-4 mb-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-xs">
                        {status === 'substitute' && (
                            <label className="flex items-center gap-2">
                                <span className="text-amber-700 font-medium shrink-0">Eingewechselt:</span>
                                <input type="number" min="1" max="120" placeholder="z.B. 60"
                                    value={minutes_on ?? ''}
                                    onChange={e => onUpsert(player.id, { minutes_on: e.target.value ? parseInt(e.target.value) : null })}
                                    className="w-16 border border-amber-200 rounded-xl px-2 py-1.5 bg-white text-center
                                        focus:outline-none focus:border-amber-400 tabular-nums"
                                />
                            </label>
                        )}
                        {(status === 'starter' || status === 'substitute') && (
                            <label className="flex items-center gap-2">
                                <span className="text-amber-700 font-medium shrink-0">
                                    {status === 'starter' ? 'Ausgewechselt:' : 'Wieder raus:'}
                                </span>
                                <input type="number" min="1" max="120" placeholder="90"
                                    value={minutes_off ?? ''}
                                    onChange={e => onUpsert(player.id, { minutes_off: e.target.value ? parseInt(e.target.value) : null })}
                                    className="w-16 border border-amber-200 rounded-xl px-2 py-1.5 bg-white text-center
                                        focus:outline-none focus:border-amber-400 tabular-nums"
                                />
                                <span className="text-amber-600/70">leer = 90'</span>
                            </label>
                        )}
                        {hasMinutes && (
                            <button
                                onClick={() => onUpsert(player.id, { minutes_on: null, minutes_off: null })}
                                className="text-xs text-amber-600 hover:text-red-600 transition-colors ml-auto">
                                Zurücksetzen
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Note panel ── */}
            {showNote && (
                <div className="mx-4 mb-3">
                    <input type="text" placeholder="Notiz zum Spieler…" value={note}
                        onChange={e => onUpsert(player.id, { note: e.target.value })}
                        className="w-full text-sm border border-md-outline-variant rounded-xl px-3 py-2
                            bg-white focus:outline-none focus:border-md-primary"
                        autoFocus />
                </div>
            )}

            {/* ── Note preview ── */}
            {note && !showNote && (
                <div className="mx-4 mb-3">
                    <div className="text-xs text-md-on-surface bg-md-primary-container/30
                        border-l-2 border-md-primary px-3 py-2 rounded-r-xl">
                        {note}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main page ─────────────────────────────────────────────────
export default function MatchDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { canEdit } = useAuth()
    const {
        match, players, attMap, shareToken, loading, saving,
        starterCount, subCount,
        updateScore, upsertAttendance, generateShareToken, getWhatsAppText,
        update, remove,
        isOnline, syncing, dirty, sync,
    } = useMatchDetail(id)

    const [scoreForm, setScoreForm] = useState({ own: '', opp: '' })
    const [scoreEdit, setScoreEdit] = useState(false)
    const [showShare, setShowShare] = useState(false)
    const [generatingToken, setGeneratingToken] = useState(false)
    const [copied, setCopied] = useState(false)
    const [search, setSearch] = useState('')
    const [showEdit, setShowEdit] = useState(false)
    const [editForm, setEditForm] = useState(null)
    const [editSaving, setEditSaving] = useState(false)
    const [editErr, setEditErr] = useState(null)

    useEffect(() => {
        if (match) setScoreForm({ own: match.score_own ?? '', opp: match.score_opp ?? '' })
    }, [match?.id])

    function openEdit() {
        setEditForm({
            date: match?.date ?? '',
            opponent: match?.opponent ?? '',
            home_away: match?.home_away ?? 'Heim',
        })
        setEditErr(null)
        setShowEdit(true)
    }

    async function handleEditSave(e) {
        e.preventDefault()
        setEditSaving(true); setEditErr(null)
        try {
            await update(id, { date: editForm.date, opponent: editForm.opponent, home_away: editForm.home_away })
            setShowEdit(false)
        } catch (err) { setEditErr(err.message) }
        finally { setEditSaving(false) }
    }

    async function handleDelete() {
        if (!confirm('Spieltag wirklich löschen?')) return
        try { await remove(id); navigate('/matches') }
        catch (err) { alert(err.message || 'Fehler beim Löschen') }
    }

    if (loading) return (
        <div className="p-4 md:p-8 max-w-2xl space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-32 rounded-2xl" />
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-[60px]" />)}
        </div>
    )
    if (!match) return <div className="p-8 text-center text-md-on-surface-variant">Spieltag nicht gefunden.</div>

    const played = match.score_own !== null && match.score_opp !== null
    const won = played && match.score_own > match.score_opp
    const draw = played && match.score_own === match.score_opp

    async function handleScore(e) {
        e.preventDefault()
        await updateScore(scoreForm.own, scoreForm.opp)
        setScoreEdit(false)
    }

    async function handleGenerateToken() {
        setGeneratingToken(true)
        try {
            const { supabase } = await import('../lib/supabase')
            const { data: existing } = await supabase.from('lineup_plans')
                .select('id').eq('match_id', id).maybeSingle()
            let planId = existing?.id
            if (!planId) {
                const { data: newPlan } = await supabase.from('lineup_plans')
                    .insert({ name: match.opponent, match_id: id }).select('id').single()
                planId = newPlan?.id
            }
            if (planId) await generateShareToken(planId)
        } finally { setGeneratingToken(false) }
    }

    function copyLink() {
        const url = `${window.location.origin}/share/${shareToken.token}`
        navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
    }

    const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken.token}` : null
    const totalMinutes = Object.values(attMap ?? {}).reduce((s, a) => s + (a.minutes_played ?? 0), 0)

    const sorted = [...players]
        .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            const na = parseInt(a.number) || 0
            const nb = parseInt(b.number) || 0
            return na !== nb ? na - nb : a.name.localeCompare(b.name)
        })

    return (
        <div className="p-4 md:p-8 max-w-2xl">

            {/* Nav bar */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => navigate('/matches')} className="btn-text px-0 text-md-primary">
                    <span className="material-symbols-outlined icon-sm">arrow_back</span>
                    Alle Spieltage
                </button>
                {canEdit && (
                    <div className="flex items-center gap-1">
                        <button onClick={openEdit} className="btn-icon w-9 h-9 hover:bg-md-primary/10 hover:text-md-primary">
                            <span className="material-symbols-outlined icon-sm">edit</span>
                        </button>
                        <button onClick={handleDelete} className="btn-icon w-9 h-9 hover:bg-red-50 hover:text-red-600">
                            <span className="material-symbols-outlined icon-sm">delete</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ── Header card ── */}
            <div className="card-outlined p-5 mb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-medium px-1.5 py-px rounded-md border shrink-0
                                ${match.home_away === 'Heim'
                                    ? 'bg-md-primary-container text-md-primary border-md-primary/20'
                                    : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                {match.home_away}
                            </span>
                            <span className="text-xs text-md-outline">
                                {new Date(match.date).toLocaleDateString('de-DE', {
                                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                                })}
                            </span>
                        </div>
                        <h1 className="text-xl font-bold text-md-on-surface truncate"
                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                            {match.opponent}
                        </h1>
                    </div>
                    {canEdit && (
                        <button onClick={() => setShowShare(true)} className="btn-tonal py-2 px-3 text-xs shrink-0">
                            <span className="material-symbols-outlined icon-sm">share</span>Teilen
                        </button>
                    )}
                </div>

                {/* Score */}
                <div className="mt-4 pt-4 border-t border-md-outline-variant/60">
                    {scoreEdit ? (
                        <form onSubmit={handleScore} className="flex items-center gap-3 flex-wrap">
                            <input type="number" min="0" max="99" autoFocus
                                className="w-16 text-center text-2xl font-black border-2 border-md-primary rounded-xl py-2
                                    focus:outline-none tabular-nums"
                                style={{ fontFamily: "'DM Mono', monospace" }}
                                value={scoreForm.own}
                                onChange={e => setScoreForm(f => ({ ...f, own: e.target.value }))} />
                            <span className="text-3xl font-black text-md-outline">:</span>
                            <input type="number" min="0" max="99"
                                className="w-16 text-center text-2xl font-black border-2 border-md-primary rounded-xl py-2
                                    focus:outline-none tabular-nums"
                                style={{ fontFamily: "'DM Mono', monospace" }}
                                value={scoreForm.opp}
                                onChange={e => setScoreForm(f => ({ ...f, opp: e.target.value }))} />
                            <button type="submit" disabled={saving} className="btn-filled py-2 px-3 text-xs">OK</button>
                            <button type="button" onClick={() => setScoreEdit(false)} className="btn-outlined py-2 px-3 text-xs">Abbrechen</button>
                        </form>
                    ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                            {played ? (
                                <>
                                    <span className={`text-4xl font-black tabular-nums leading-none
                                        ${won ? 'text-green-600' : draw ? 'text-amber-500' : 'text-red-500'}`}
                                        style={{ fontFamily: "'DM Mono', monospace" }}>
                                        {match.score_own} : {match.score_opp}
                                    </span>
                                    <span className={`text-sm font-semibold px-2 py-1 rounded-lg border
                                        ${won ? 'bg-green-50 text-green-700 border-green-200'
                                            : draw ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                : 'bg-red-50 text-red-600 border-red-200'}`}>
                                        {won ? 'Sieg' : draw ? 'Unentschieden' : 'Niederlage'}
                                    </span>
                                </>
                            ) : (
                                <span className="text-sm text-md-outline italic">Kein Ergebnis</span>
                            )}
                            {canEdit && (
                                <button
                                    onClick={() => { setScoreForm({ own: match.score_own ?? '', opp: match.score_opp ?? '' }); setScoreEdit(true) }}
                                    className="btn-text py-1 px-2 text-xs ml-auto">
                                    <span className="material-symbols-outlined icon-sm">edit</span>
                                    {played ? 'Ändern' : 'Eintragen'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Summary pills */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-md-outline-variant/60 flex-wrap text-xs">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="font-medium tabular-nums">{starterCount}</span>
                        <span className="text-md-outline">Starter</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="font-medium tabular-nums">{subCount}</span>
                        <span className="text-md-outline">Einwechslungen</span>
                    </span>
                    {totalMinutes > 0 && (
                        <span className="flex items-center gap-1 text-md-outline">
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                            <span className="font-medium tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>
                                {totalMinutes}
                            </span>
                            Min.
                        </span>
                    )}
                    <div className="ml-auto">
                        {dirty ? (
                            <button onClick={sync} disabled={syncing || !isOnline}
                                className={`btn-filled py-1.5 px-3 text-xs ${!isOnline ? 'opacity-50' : ''}`}>
                                <span className="material-symbols-outlined icon-sm">
                                    {syncing ? 'progress_activity' : 'sync'}
                                </span>
                                {isOnline ? 'Speichern' : 'Offline…'}
                            </button>
                        ) : (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                                Gespeichert
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Player list ── */}
            <div className="card-outlined overflow-hidden mb-4">
                <div className="flex items-center gap-2 px-4 py-3 bg-md-surface/80 border-b border-md-outline-variant/60">
                    <span className="material-symbols-outlined icon-sm text-md-primary">groups</span>
                    <h2 className="text-sm font-bold text-md-on-surface">Kader & Aufstellung</h2>
                    {canEdit && (
                        <span className="ml-auto text-xs text-md-outline">Kreis tippen = Status</span>
                    )}
                </div>

                {/* Search */}
                <div className="px-4 py-2.5 border-b border-md-outline-variant/60">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 icon-sm text-md-outline">search</span>
                        <input type="text" placeholder="Spieler suchen…" value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-md-outline-variant
                                bg-white text-sm focus:outline-none focus:border-md-primary" />
                    </div>
                </div>

                {sorted.length === 0 ? (
                    <div className="py-10 text-center text-sm text-md-on-surface-variant">Kein Spieler gefunden</div>
                ) : (
                    sorted.map(p => (
                        <PlayerRow
                            key={p.id}
                            player={p}
                            att={attMap?.[p.id]}
                            canEdit={canEdit}
                            onUpsert={upsertAttendance}
                        />
                    ))
                )}
            </div>

            {/* Match notes */}
            {match.notes && (
                <div className="card-outlined p-4 mb-4">
                    <p className="text-xs font-bold text-md-on-surface-variant uppercase tracking-widest mb-1">Notizen</p>
                    <p className="text-sm text-md-on-surface">{match.notes}</p>
                </div>
            )}

            {/* ── Edit dialog ── */}
            {showEdit && editForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50">
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl"
                        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
                            <div className="w-9 h-9 rounded-xl bg-md-primary-container flex items-center justify-center">
                                <span className="material-symbols-outlined icon-sm text-md-primary">edit</span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-base font-bold text-md-on-surface">Spieltag bearbeiten</h2>
                                {match?.opponent && <p className="text-xs text-md-outline">{match.opponent}</p>}
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
                            <div className="relative">
                                <input required type="date" className="md-input" value={editForm.date}
                                    onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                                <label className="md-input-label">Datum *</label>
                            </div>
                            <div className="relative">
                                <input required type="text" className="md-input" placeholder=" " value={editForm.opponent}
                                    onChange={e => setEditForm(f => ({ ...f, opponent: e.target.value }))} />
                                <label className="md-input-label">Gegner *</label>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-md-on-surface-variant mb-2">Spielort</p>
                                <div className="flex gap-2">
                                    {['Heim', 'Auswärts', 'Neutral'].map(opt => (
                                        <button key={opt} type="button"
                                            onClick={() => setEditForm(f => ({ ...f, home_away: opt }))}
                                            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
                                                ${editForm.home_away === opt
                                                    ? 'bg-md-primary text-white border-md-primary shadow-sm'
                                                    : 'bg-white border-md-outline-variant text-md-on-surface-variant hover:bg-md-surface'}`}>
                                            {opt}
                                        </button>
                                    ))}
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

            {/* ── Share dialog ── */}
            {showShare && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50">
                    <div className="bg-white w-full md:max-w-sm md:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl"
                        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-md-outline-variant">
                            <div className="w-9 h-9 rounded-xl bg-md-primary-container flex items-center justify-center">
                                <span className="material-symbols-outlined icon-sm text-md-primary">share</span>
                            </div>
                            <h2 className="text-base font-bold text-md-on-surface flex-1">Matchcard teilen</h2>
                            <button onClick={() => setShowShare(false)} className="btn-icon w-8 h-8">
                                <span className="material-symbols-outlined icon-sm">close</span>
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            {!shareToken ? (
                                <button onClick={handleGenerateToken} disabled={generatingToken}
                                    className="btn-filled w-full justify-center">
                                    {generatingToken
                                        ? <><span className="material-symbols-outlined icon-sm animate-spin">progress_activity</span>Generiere…</>
                                        : <><span className="material-symbols-outlined icon-sm">link</span>Öffentlichen Link erstellen</>
                                    }
                                </button>
                            ) : (
                                <>
                                    <div className="flex justify-center py-2">
                                        <QRCodeDisplay url={shareUrl} />
                                    </div>
                                    <div className="flex gap-2">
                                        <input readOnly value={shareUrl}
                                            className="flex-1 text-xs border border-md-outline-variant rounded-xl px-3 py-2 bg-md-surface" />
                                        <button onClick={copyLink} className="btn-tonal px-3 text-xs">
                                            <span className="material-symbols-outlined icon-sm">{copied ? 'check' : 'content_copy'}</span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-md-outline text-center">
                                        Gültig bis {new Date(shareToken.expires_at).toLocaleDateString('de-DE')}
                                    </p>
                                </>
                            )}
                            <a href={`https://wa.me/?text=${getWhatsAppText()}`}
                                target="_blank" rel="noopener noreferrer"
                                className="btn-outlined w-full justify-center text-green-600 border-green-200 hover:bg-green-50 flex items-center gap-2">
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