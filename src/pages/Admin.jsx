import { useState } from 'react'
import { useAdmin } from '../hooks/useAdmin'
import { useAuth } from '../hooks/useAuth'
import Skeleton from '../components/Skeleton'
import Badge from '../components/Badge'

const ACTION_VARIANT = { insert: 'success', update: 'warning', delete: 'error' }
const TABLES = ['players','training_sessions','training_attendance','match_days','match_attendance',
                'notes','injuries','player_availability','lineup_plans','consent_records']

const CONSENT_LABELS = { contact_data: 'Kontaktdaten', photo_release: 'Fotofreigabe', data_processing: 'Datenverarbeitung' }

export default function Admin() {
  const { isHeadCoach } = useAuth()
  const { auditLog, consents, loading, auditFilter, setAuditFilter, exportAllData } = useAdmin()
  const [tab, setTab]         = useState('audit')
  const [exporting, setExporting] = useState(false)

  if (!isHeadCoach) return (
    <div className="p-8 flex flex-col items-center justify-center text-md-on-surface-variant">
      <span className="material-symbols-outlined mb-3" style={{ fontSize: 48 }}>lock</span>
      <p className="text-sm font-medium">Kein Zugriff</p>
      <p className="text-xs mt-1">Nur Trainer mit Head-Coach-Rolle können den Admin-Bereich sehen.</p>
    </div>
  )

  if (loading) return (
    <div className="p-4 md:p-8 max-w-4xl space-y-3">
      <Skeleton className="h-8 w-40" />
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
    </div>
  )

  async function handleExport() {
    setExporting(true)
    try { await exportAllData() } finally { setExporting(false) }
  }

  const tabs = [
    { id: 'audit',  label: 'Audit-Log',    icon: 'history' },
    { id: 'gdpr',   label: 'DSGVO',        icon: 'verified_user' },
    { id: 'export', label: 'Export',       icon: 'download' },
    { id: 'info',   label: 'System',       icon: 'info' },
  ]

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <h1 className="text-xl font-medium text-md-on-surface mb-4">Administration</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-md-outline-variant mb-5 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors
              ${tab === t.id ? 'text-md-primary border-b-2 border-md-primary' : 'text-md-on-surface-variant hover:text-md-on-surface'}`}>
            <span className="material-symbols-outlined icon-sm">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Audit-Log ── */}
      {tab === 'audit' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <select value={auditFilter.table} onChange={e => setAuditFilter(f => ({ ...f, table: e.target.value }))}
              className="text-sm rounded-xl border border-md-outline-variant bg-white px-3 py-2 focus:outline-none">
              <option value="">Alle Tabellen</option>
              {TABLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={auditFilter.action} onChange={e => setAuditFilter(f => ({ ...f, action: e.target.value }))}
              className="text-sm rounded-xl border border-md-outline-variant bg-white px-3 py-2 focus:outline-none">
              <option value="">Alle Aktionen</option>
              <option value="insert">Insert</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>

          {auditLog.length === 0 ? (
            <div className="card-outlined py-12 text-center text-sm text-md-on-surface-variant">
              Keine Audit-Einträge gefunden
            </div>
          ) : (
            <div className="card-outlined overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-md-outline-variant bg-md-surface">
                      <th className="text-left px-4 py-2.5 font-medium text-md-on-surface-variant">Zeitpunkt</th>
                      <th className="text-left px-3 py-2.5 font-medium text-md-on-surface-variant">Aktion</th>
                      <th className="text-left px-3 py-2.5 font-medium text-md-on-surface-variant">Tabelle</th>
                      <th className="text-left px-3 py-2.5 font-medium text-md-on-surface-variant">Datensatz-ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.map((e, i) => (
                      <tr key={e.id} className={`${i < auditLog.length - 1 ? 'border-b border-md-outline-variant' : ''} hover:bg-md-surface`}>
                        <td className="px-4 py-2.5 text-md-on-surface-variant whitespace-nowrap">
                          {new Date(e.changed_at).toLocaleString('de-DE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={ACTION_VARIANT[e.action] ?? 'neutral'}>{e.action}</Badge>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-md-on-surface">{e.table_name}</td>
                        <td className="px-3 py-2.5 font-mono text-md-on-surface-variant truncate max-w-[140px]">
                          {e.record_id?.slice(0, 8)}…
                        </td>
                      </tr>
                    ))}
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
          <div className="card-outlined p-4 border-l-4 border-amber-400 bg-amber-50/50">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 shrink-0">info</span>
              <div>
                <p className="text-sm font-medium text-amber-900">DSGVO-Hinweis</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Einwilligungen sind nach Art. 7 DSGVO jederzeit widerrufbar. Kontaktdaten und Fotos dürfen nur bei
                  aktiver Einwilligung gespeichert werden. Die Datenverarbeitung muss auf einer Rechtsgrundlage beruhen.
                  Aktiviere Supabase PITR (Point-in-Time Recovery) für lückenlose Datensicherung.
                </p>
              </div>
            </div>
          </div>

          {/* Consent overview */}
          <div className="card-outlined overflow-hidden">
            <div className="px-4 py-3 border-b border-md-outline-variant text-sm font-medium">
              Einwilligungsübersicht ({consents.length} Einträge)
            </div>
            {consents.length === 0 ? (
              <div className="py-8 text-center text-sm text-md-on-surface-variant">Keine Einwilligungen vorhanden</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-md-outline-variant bg-md-surface">
                      <th className="text-left px-4 py-2.5 font-medium text-md-on-surface-variant">Spieler</th>
                      <th className="text-left px-3 py-2.5 font-medium text-md-on-surface-variant">Typ</th>
                      <th className="text-left px-3 py-2.5 font-medium text-md-on-surface-variant">Status</th>
                      <th className="text-left px-3 py-2.5 font-medium text-md-on-surface-variant">Erteilt am</th>
                      <th className="text-left px-3 py-2.5 font-medium text-md-on-surface-variant">Version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consents.map((c, i) => (
                      <tr key={c.id} className={`${i < consents.length - 1 ? 'border-b border-md-outline-variant' : ''}`}>
                        <td className="px-4 py-2.5 font-medium text-md-on-surface">{c.players?.name ?? '–'}</td>
                        <td className="px-3 py-2.5 text-md-on-surface">{CONSENT_LABELS[c.consent_type] ?? c.consent_type}</td>
                        <td className="px-3 py-2.5">
                          {c.revoked_at
                            ? <Badge variant="error">Widerrufen</Badge>
                            : c.granted_at
                              ? <Badge variant="success">Aktiv</Badge>
                              : <Badge variant="neutral">Ausstehend</Badge>
                          }
                        </td>
                        <td className="px-3 py-2.5 text-md-on-surface-variant">
                          {c.granted_at ? new Date(c.granted_at).toLocaleDateString('de-DE') : '–'}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-md-on-surface-variant">v{c.version}</td>
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
          <div className="card-outlined p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-md-primary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-md-primary">folder_zip</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-md-on-surface">Vereins-Datenexport</h3>
                <p className="text-xs text-md-on-surface-variant mt-0.5">
                  Exportiert alle Daten (Spieler, Training, Spiele, Notizen, Verletzungen, Einwilligungen)
                  als JSON-Datei. Für DSGVO-Auskunftsanfragen gemäß Art. 15 DSGVO.
                </p>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-filled mt-4 py-2 px-4 text-sm"
            >
              {exporting
                ? <><span className="material-symbols-outlined icon-sm animate-spin">progress_activity</span>Exportiere...</>
                : <><span className="material-symbols-outlined icon-sm">download</span>Alle Daten exportieren (JSON)</>
              }
            </button>
          </div>

          <div className="card-outlined p-4 border-l-4 border-blue-400 bg-blue-50/50">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-600 shrink-0">backup</span>
              <div>
                <p className="text-sm font-medium text-blue-900">Supabase Point-in-Time Recovery</p>
                <p className="text-xs text-blue-800 mt-0.5">
                  Aktiviere PITR in deinem Supabase-Projekt unter <strong>Settings → Backups</strong> für lückenlose
                  Wiederherstellbarkeit. Empfohlen: tägliche Backups mit 7 Tage Aufbewahrung (Pro-Plan).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── System / Info ── */}
      {tab === 'info' && (
        <div className="space-y-4">
          <div className="card-outlined overflow-hidden">
            <div className="px-4 py-3 border-b border-md-outline-variant text-sm font-medium">DSGVO-Checkliste</div>
            {[
              { done: true,  label: 'Einwilligungsnachweise (consent_records) mit Versionierung' },
              { done: true,  label: 'Datensparsamkeit — Kontaktdaten nur mit aktiver Einwilligung' },
              { done: true,  label: 'Recht auf Löschung — ON DELETE CASCADE auf allen player-FKs' },
              { done: true,  label: 'Audit-Log mit INSERT/UPDATE/DELETE-Trigger' },
              { done: true,  label: 'RLS auf allen Tabellen, user-scoped Policies' },
              { done: true,  label: 'Vereins-Datenexport (Art. 15 DSGVO Auskunftsrecht)' },
              { done: false, label: 'Supabase PITR aktivieren (manuell im Dashboard)' },
              { done: false, label: 'Datenschutzerklärung auf Anmeldeseite verlinken' },
              { done: false, label: 'Auftragsverarbeitungsvertrag mit Supabase abschließen' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < 8 ? 'border-b border-md-outline-variant' : ''}`}>
                <span className={`material-symbols-outlined icon-sm ${item.done ? 'text-green-600' : 'text-md-outline'}`}>
                  {item.done ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span className={`text-sm ${item.done ? 'text-md-on-surface' : 'text-md-on-surface-variant'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="card-outlined p-4">
            <h3 className="text-sm font-medium mb-2">App-Versionen</h3>
            <div className="space-y-1 text-xs text-md-on-surface-variant font-mono">
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
