# StudyFlow

Persönliche Lernapp für Studenten. Klausuren planen, Noten tracken, fokussiert lernen – alles in einem.

## Features

- **Dashboard** – Tagesübersicht mit heutigem Lernplan, nächsten Klausuren und aktuellem Notendurchschnitt
- **Kalender** – Klausurtermine eintragen und automatisch einen Lernplan berechnen lassen (konfigurierbare Lerntage, Stunden und Vorlaufzeit)
- **Noten** – Fächer und Noten pro Semester verwalten, ECTS-gewichteter Gesamtschnitt wird automatisch berechnet
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
- Alle Daten werden im `localStorage` des Browsers gespeichert
- Schriften: [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) + [Onest](https://fonts.google.com/specimen/Onest) via Google Fonts

## Projektstruktur

```
study-app/
├── index.html        # Dashboard
├── kalender.html     # Kalender & Lernplan
├── noten.html        # Notenverwaltung
├── timer.html        # Pomodoro-Timer
├── css/
│   ├── style.css     # Design-Tokens, Reset, Layout
│   └── components.css# Navbar, Buttons, Cards, Formulare
└── js/
    ├── app.js        # Theme, Navbar, localStorage-Helpers
    ├── dashboard.js
    ├── kalender.js
    ├── noten.js
    └── timer.js
```

## Roadmap

- [ ] Backend (Node.js / Express)
- [ ] Benutzer-Authentifizierung
- [ ] Datenbank-Anbindung (Daten geräteübergreifend synchronisieren)
- [ ] Mobile App (PWA oder React Native)
