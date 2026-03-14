# ⚽ Coach App

Spieler-Management und Leistungs-Tracking für Fußballtrainer.

## Features

- **Spieler-Profile** — Name, Position, Rückennummer, Jahrgang
- **Notizen** — Freitextnotizen pro Spieler mit Zeitstempel
- **Trainingsplanung** — Einheiten anlegen, Anwesenheit tracken
- **Statistiken** — Tore, Assists, Bewertungen mit Diagrammen

---

## Setup (einmalig, ~10 Min.)

### 1. Supabase-Projekt anlegen

1. Gehe zu [supabase.com](https://supabase.com) → **New Project**
2. Projekt benennen (z.B. `coach-app`) und Region wählen
3. Im Dashboard: **SQL Editor** öffnen
4. Inhalt von `supabase-schema.sql` einfügen und auf **Run** klicken
5. Unter **Settings → API** findest du:
   - `Project URL` → das ist dein `VITE_SUPABASE_URL`
   - `anon public` Key → das ist dein `VITE_SUPABASE_ANON_KEY`

### 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env.local
```

Öffne `.env.local` und füge deine Supabase-Werte ein:

```
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key-hier
```

### 3. Abhängigkeiten installieren und starten

```bash
npm install
npm run dev
```

Die App läuft dann auf [http://localhost:5173](http://localhost:5173).

---

## Kostenloses Hosting (Vercel)

### Voraussetzungen
- GitHub-Account (kostenlos)
- Vercel-Account (kostenlos, Login mit GitHub)

### Schritt-für-Schritt

1. **Code auf GitHub hochladen:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # Repo auf github.com erstellen, dann:
   git remote add origin https://github.com/DEIN-NAME/coach-app.git
   git push -u origin main
   ```

2. **Vercel verbinden:**
   - [vercel.com](https://vercel.com) → **New Project**
   - GitHub-Repo auswählen → **Import**
   - Framework: **Vite** (wird automatisch erkannt)

3. **Umgebungsvariablen in Vercel eintragen:**
   - Im Vercel-Projekt: **Settings → Environment Variables**
   - `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` eintragen

4. **Deploy** — jeder `git push` deployt automatisch!

---

## Projektstruktur

```
coach-app/
├── src/
│   ├── components/
│   │   ├── Layout.jsx        # Sidebar + Content wrapper
│   │   └── Sidebar.jsx       # Navigation
│   ├── hooks/
│   │   └── useAuth.js        # Supabase Auth Hook
│   ├── lib/
│   │   └── supabase.js       # Supabase Client
│   ├── pages/
│   │   ├── Dashboard.jsx     # Übersicht
│   │   ├── Login.jsx         # Anmeldung
│   │   ├── Players.jsx       # Spieler & Notizen
│   │   ├── Stats.jsx         # Statistiken & Charts
│   │   └── Training.jsx      # Trainingsplanung
│   ├── App.jsx               # Router & Auth-Guard
│   ├── main.jsx              # Entry Point
│   └── index.css             # Tailwind + Custom Classes
├── supabase-schema.sql       # Datenbankschema (in Supabase ausführen)
├── .env.example              # Vorlage für Umgebungsvariablen
├── vite.config.js
└── tailwind.config.js
```

## VS Code Extensions (empfohlen)

- **ESLint** — Code-Qualität
- **Prettier** — Formatierung
- **Tailwind CSS IntelliSense** — Autocomplete für Klassen
- **GitLens** — Git-Integration

---

## Kostenübersicht

| Service   | Free Tier          | Limit                     |
|-----------|--------------------|---------------------------|
| Supabase  | Unbegrenzt kostenlos | 500 MB DB, 2 GB Transfer  |
| Vercel    | Unbegrenzt kostenlos | 100 GB Bandwidth/Monat    |
| GitHub    | Kostenlos          | Unbegrenzte Repos         |

Für eine Trainer-App mit einem Team ist das Free Tier völlig ausreichend.
