# StudyFlow

Persönliche Lernapp für Studenten. Klausuren planen, Noten tracken, fokussiert lernen – alles in einem.

## Features

- **Dashboard** – Tagesübersicht mit heutigem Lernplan, nächsten Klausuren und aktuellem Notendurchschnitt
- **Lernplan** – Klausurtermine eintragen und automatisch einen Lernplan berechnen lassen (konfigurierbare Lerntage, Stunden und Vorlaufzeit)
- **Module** – Fächer und Noten pro Semester verwalten, ECTS-gewichteter Gesamtschnitt wird automatisch berechnet
- **Pomodoro-Timer** – Lernphasen und Pausen mit konfigurierbaren Intervallen, SVG-Fortschrittsring und Audio-Signal
- **Dark / Light Mode** – systemseitige Präferenz wird erkannt, manuell umschaltbar

## Starten

Kein Build-Schritt nötig. Einfach `index.html` im Browser öffnen:

```bash
open index.html
```

Oder mit einem lokalen Dev-Server (z. B. VS Code Live Server, `npx serve .`).

## Technologie

- Reines HTML, CSS und Vanilla JavaScript – kein Framework, kein Build-Tool
- Single Page Application mit Hash-basiertem Router (`#dashboard`, `#lernplan`, `#module`, `#timer`)
- [Supabase](https://supabase.com) für Authentifizierung und geräteübergreifende Synchronisierung
- Daten lokal im `localStorage` (Prefix `sf_`), bei Login mit Supabase synchronisiert
- Schriften: [Eczar](https://fonts.google.com/specimen/Eczar) (variable Serif, Überschriften) + [Onest](https://fonts.google.com/specimen/Onest) (Body) via Google Fonts
- Design-Richtung „Warm Scholar": Amber-Gold-Akzent, cremige Oberflächen, warme Erdtöne

## Projektstruktur

```
study-app/
├── index.html          # SPA – alle Seiten als <section>-Elemente
├── login.html          # Login-Seite (außerhalb der SPA)
├── reset-password.html # Passwort-Reset (außerhalb der SPA)
├── css/
│   ├── style.css       # Design-Tokens, Reset, Layout
│   └── components.css  # Navbar, Buttons, Cards, Formulare
└── js/
    ├── supabase.js     # Supabase-Client
    ├── sync.js         # localStorage ↔ Supabase-Sync
    ├── app.js          # Router, store, DateUtils, GradeUtils
    ├── dashboard.js
    ├── lernplan.js
    ├── module.js
    ├── timer.js
    └── login.js
```

## Roadmap

- [ ] Mobile App (PWA)
