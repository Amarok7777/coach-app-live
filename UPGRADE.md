# Sauberes Neu-Install — Schritt für Schritt

## Problem war

`npm audit fix --force` hat `vite-plugin-pwa@0.19.8` gezogen, die nur
Vite 3–5 unterstützt. Mit Vite 6 gibt es daher einen Peer-Dependency-Konflikt.

## Lösung

`vite-plugin-pwa` wurde auf **0.21.1** angehoben — das ist die erste Version
mit offiziellem Vite 6 Support.

## Anleitung

```powershell
# 1. Im Projektordner: alles zurücksetzen
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# 2. Neue package.json einspielen (aus diesem ZIP)

# 3. Sauber installieren — KEIN --force nötig
npm install

# Erwartete Ausgabe:
# added NNN packages, and audited NNN packages
# found 0 vulnerabilities   ✅
```

## Was in package.json geändert wurde

| Paket | Alt | Neu | Grund |
|---|---|---|---|
| `vite-plugin-pwa` | 0.19.x / 1.0.0 | **0.21.1** | Vite 6 Support |
| `jspdf` | 2.5.1 | **3.0.1** | behebt source-map@0.8 beta |
| `jspdf-autotable` | 3.8.2 | **5.0.2** | passend zu jspdf@3 |
| `vite` | 5.0 | **6.3.1** | behebt sourcemap-codec |
| Alle anderen | diverse | aktuell | Sicherheits-Patches |

`overrides` erzwingt sichere Versionen für transitive Abhängigkeiten:
```json
"overrides": {
  "sourcemap-codec": "npm:@jridgewell/sourcemap-codec@^1.5.0",
  "source-map": "^0.7.4",
  "serialize-javascript": "^6.0.2",
  "workbox-build": "^7.3.0"
}
```

## jspdf@3 Import (bereits in useStats.js angepasst)

```js
// jspdf@3 — benannter Export statt default
import { jsPDF } from 'jspdf'
import { applyPlugin } from 'jspdf-autotable'
applyPlugin(jsPDF)
const doc = new jsPDF()
```
