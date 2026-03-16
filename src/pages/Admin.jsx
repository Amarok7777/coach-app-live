import { useState } from 'react'
import { useAdmin } from '../hooks/useAdmin'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'

const ACTION_CONFIG = {
    insert: { label: 'INSERT', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    update: { label: 'UPDATE', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    delete: { label: 'DELETE', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
}

const CONSENT_LABELS = {
    contact_data: 'Kontaktdaten',
    photo_release: 'Fotofreigabe',
    data_processing: 'Datenverarbeitung',
}

const TABLES = ['players', 'training_sessions', 'training_attendance', 'match_days',
    'match_attendance', 'notes', 'injuries', 'player_availability', 'lineup_plans', 'consent_records']

const TABS = [
    { id: 'audit', label: 'Audit-Log', icon: 'history' },
    { id: 'gdpr', label: 'DSGVO', icon: 'verified_user' },
    { id: 'export', label: 'Export', icon: 'download' },
    { id: 'info', label: 'System', icon: 'info' },
]

export default function Admin() {
    const { isHeadCoach } = useAuth()
    const { auditLog, consents, loading, auditFilter, setAuditFilter, exportAllData } = useAdmin()
    const [tab, setTab] = useState('audit')
    const [exporting, setExporting] = useState(false)

    if (!isHeadCoach) return (
        <div className="p-8 flex flex-col items-center justify-center min-h-64 text-md-on-surface-variant">
            <div className="w-16 h-16 rounded-2xl bg-md-surface-variant flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-md-outline" style={{ fontSize: 32 }}>lock</span>
            </div>
            <p className="text-sm font-bold text-md-on-surface">Kein Zugriff</p>
            <p className="text-xs text-md-outline mt-1">Nur der Head Coach kann den Admin-Bereich sehen.</p>
        </div>
    )

    if (loading) return (
        <div className="p-4 md:p-8 max-w-4xl space-y-3">
            <Skeleton className="h-8 w-40 mb-6" />
            {[...Array(4)].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
        </div>
    )

    async function handleExport() {
        setExporting(true)
        try { await exportAllData() } finally { setExporting(false) }
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl">

            {/* ── Header ── */}
            <div className="mb-5">
                <h1 className="text-2xl font-bold text-md-on-surface tracking-tight"
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    Administration
                </h1>
                <p className="text-sm text-md-outline mt-0.5">System, DSGVO & Datenverwaltung</p>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 mb-5 overflow-x-auto border-b border-md-outline-variant/60">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap
              transition-colors border-b-2 -mb-px
              ${tab === t.id
                                ? 'text-md-primary border-md-primary'
                                : 'text-md-on-surface-variant border-transparent hover:text-md-on-surface'}`}>
                        <span className="material-symbols-outlined icon-sm">{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Audit-Log ── */}
            {tab === 'audit' && (
                <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                        <select value={auditFilter.table}
                            onChange={e => setAuditFilter(f => ({ ...f, table: e.target.value }))}
                            className="text-sm rounded-xl border border-md-outline-variant bg-white px-3 py-2.5 focus:outline-none focus:border-md-primary">
                            <option value="">Alle Tabellen</option>
                            {TABLES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={auditFilter.action}
                            onChange={e => setAuditFilter(f => ({ ...f, action: e.target.value }))}
                            className="text-sm rounded-xl border border-md-outline-variant bg-white px-3 py-2.5 focus:outline-none focus:border-md-primary">
                            <option value="">Alle Aktionen</option>
                            <option value="insert">Insert</option>
                            <option value="update">Update</option>
                            <option value="delete">Delete</option>
                        </select>
                    </div>

                    {auditLog.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-md-outline-variant/60
              py-16 text-center text-sm text-md-outline">
                            Keine Einträge gefunden
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-md-outline-variant/60 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-md-outline-variant/60 bg-md-surface/60">
                                            {['Zeitpunkt', 'Aktion', 'Tabelle', 'ID'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 font-bold text-md-outline uppercase tracking-wider whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLog.map((e, i) => {
                                            const cfg = ACTION_CONFIG[e.action] ?? { label: e.action, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
                                            return (
                                                <tr key={e.id}
                                                    className={`hover:bg-md-surface/40 transition-colors
                            ${i < auditLog.length - 1 ? 'border-b border-md-outline-variant/50' : ''}`}>
                                                    <td className="px-4 py-3 text-md-outline whitespace-nowrap tabular-nums"
                                                        style={{ fontFamily: "'DM Mono', monospace" }}>
                                                        {new Date(e.changed_at).toLocaleString('de-DE', {
                                                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                                            {cfg.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 font-medium text-md-on-surface font-mono">
                                                        {e.table_name}
                                                    </td>
                                                    <td className="px-3 py-3 text-md-outline font-mono truncate max-w-[120px]">
                                                        {e.record_id?.slice(0, 8)}…
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── DSGVO ── */}
            {tab === 'gdpr' && (
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-amber-700" style={{ fontSize: 18 }}>info</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-900">DSGVO-Hinweis</p>
                            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                Einwilligungen sind nach Art. 7 DSGVO jederzeit widerrufbar. Kontaktdaten und Fotos
                                dürfen nur bei aktiver Einwilligung gespeichert werden. Aktiviere Supabase PITR
                                für lückenlose Datensicherung.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-md-outline-variant/60 overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-md-outline-variant/60 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-md-on-surface"
                                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                Einwilligungen
                            </h3>
                            <span className="text-xs text-md-outline tabular-nums">{consents.length} Einträge</span>
                        </div>
                        {consents.length === 0 ? (
                            <div className="py-10 text-center text-sm text-md-outline">Keine Einwilligungen</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-md-outline-variant/60 bg-md-surface/60">
                                            {['Spieler', 'Typ', 'Status', 'Erteilt', 'Version'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 font-bold text-md-outline uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {consents.map((c, i) => (
                                            <tr key={c.id}
                                                className={`hover:bg-md-surface/40 ${i < consents.length - 1 ? 'border-b border-md-outline-variant/50' : ''}`}>
                                                <td className="px-4 py-3 font-semibold text-md-on-surface">
                                                    {c.players?.name ?? '–'}
                                                </td>
                                                <td className="px-4 py-3 text-md-on-surface">
                                                    {CONSENT_LABELS[c.consent_type] ?? c.consent_type}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {c.revoked_at ? (
                                                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200">Widerrufen</span>
                                                    ) : c.granted_at ? (
                                                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200">Aktiv</span>
                                                    ) : (
                                                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-gray-50 text-gray-500 border border-gray-200">Ausstehend</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-md-outline tabular-nums font-mono">
                                                    {c.granted_at ? new Date(c.granted_at).toLocaleDateString('de-DE') : '–'}
                                                </td>
                                                <td className="px-4 py-3 text-md-outline font-mono">v{c.version}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Export ── */}
            {tab === 'export' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-md-outline-variant/60 p-5">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-md-primary-container flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-md-primary">folder_zip</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-md-on-surface"
                                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                    Vereins-Datenexport
                                </h3>
                                <p className="text-xs text-md-outline mt-1 leading-relaxed">
                                    Exportiert alle Daten (Spieler, Training, Spiele, Notizen, Verletzungen,
                                    Einwilligungen) als JSON-Datei — für DSGVO-Auskunftsanfragen gemäß Art. 15 DSGVO.
                                </p>
                            </div>
                        </div>
                        <button onClick={handleExport} disabled={exporting}
                            className="btn-filled py-2 px-4 text-sm">
                            {exporting
                                ? <><span className="material-symbols-outlined icon-sm animate-spin">progress_activity</span>Exportiere…</>
                                : <><span className="material-symbols-outlined icon-sm">download</span>Alle Daten exportieren (JSON)</>
                            }
                        </button>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-blue-700" style={{ fontSize: 18 }}>backup</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-blue-900">Supabase Point-in-Time Recovery</p>
                            <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                                Aktiviere PITR unter <strong>Settings → Backups</strong> im Supabase Dashboard.
                                Empfohlen: tägliche Backups, 7 Tage Aufbewahrung (Pro-Plan).
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── System / Info ── */}
            {tab === 'info' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-md-outline-variant/60 overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-md-outline-variant/60">
                            <h3 className="text-sm font-bold text-md-on-surface"
                                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                DSGVO-Checkliste
                            </h3>
                        </div>
                        {[
                            { done: true, label: 'Einwilligungsnachweise (consent_records) mit Versionierung' },
                            { done: true, label: 'Datensparsamkeit — Kontaktdaten nur mit aktiver Einwilligung' },
                            { done: true, label: 'Recht auf Löschung — ON DELETE CASCADE auf allen player-FKs' },
                            { done: true, label: 'Audit-Log mit INSERT/UPDATE/DELETE-Trigger' },
                            { done: true, label: 'RLS auf allen Tabellen, user-scoped Policies' },
                            { done: true, label: 'Vereins-Datenexport (Art. 15 DSGVO Auskunftsrecht)' },
                            { done: false, label: 'Supabase PITR aktivieren (manuell im Dashboard)' },
                            { done: false, label: 'Datenschutzerklärung auf Anmeldeseite verlinken' },
                            { done: false, label: 'Auftragsverarbeitungsvertrag mit Supabase abschließen' },
                        ].map((item, i) => (
                            <div key={i}
                                className={`flex items-center gap-3 px-5 py-3.5
                  ${i < 8 ? 'border-b border-md-outline-variant/50' : ''}`}>
                                <span className={`material-symbols-outlined icon-sm shrink-0
                  ${item.done ? 'text-green-500' : 'text-md-outline/40'}`}>
                                    {item.done ? 'check_circle' : 'radio_button_unchecked'}
                                </span>
                                <span className={`text-sm ${item.done ? 'text-md-on-surface font-medium' : 'text-md-outline'}`}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl border border-md-outline-variant/60 p-5">
                        <h3 className="text-sm font-bold text-md-on-surface mb-3"
                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                            Abhängigkeiten
                        </h3>
                        <div className="space-y-1.5 text-xs text-md-outline font-mono">
                            <p>React 18 · React Router 6 · Supabase JS 2</p>
                            <p>@dnd-kit/core · recharts · date-fns · qrcode</p>
                            <p>jspdf · jspdf-autotable · vite-plugin-pwa</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}