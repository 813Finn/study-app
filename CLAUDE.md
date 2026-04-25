# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

No build step. Open `index.html` directly in the browser or use a local server:

```bash
npx serve .
# or VS Code Live Server
```

## Architecture

### Global scope via app.js

`js/app.js` is loaded first on every page and exposes several globals that all other JS files depend on:

- `store` – localStorage wrapper (`store.get(key)`, `store.set(key, val)`, `store.remove(key)`)
- `DateUtils` – date helpers; always use `DateUtils.toISO(date)` (not `.toISOString()`) to avoid UTC timezone shift bugs
- `GradeUtils` – grade formatting and average calculation. Key methods: `weightedAverage(subjects)` (ECTS-weighted), `simpleAverage(subjects)` (unweighted), `effectiveGrade(sub)` (computes grade from subGrades average, falls back to `sub.grade`), `gradeClass(grade)`, `format(grade)`
- `initApp(pageName)` – must be called first in every page JS; injects the navbar, applies the saved theme, and prompts for a name on first visit

Each page JS file calls `initApp('pagename')` as its first line, then runs its own logic.

### localStorage keys

All keys are prefixed `sf_` to avoid collisions:

| Key | Shape |
|-----|-------|
| `sf_exams` | `[{ id, subject, date }]` |
| `sf_study_settings` | `{ daysOfWeek: number[], hoursPerDay, weeksBeforeExam }` |
| `sf_grades` | `[{ id, name, subjects: [{ name, ects, subGrades: [{ id, name, grade }] }] }]` |
| `sf_timer_settings` | `{ workMinutes, shortBreakMinutes, longBreakMinutes, cyclesBeforeLong }` |
| `sf_today_stats` | `{ date: string, pomodoros, focusMinutes }` |
| `sf_profile` | `{ name }` |
| `sf_theme` | `'light' \| 'dark'` |

### CSS system

`css/style.css` defines all design tokens as CSS custom properties on `:root` (spacing, type scale, radii) and theme-specific values (`--bg`, `--fg`, `--fg-2`, `--fg-3`, `--border`, etc.) on `[data-theme="light"]` and `[data-theme="dark"]`. Always use existing tokens; do not hard-code colors or spacing values.

**Design direction – "Warm Scholar":** The aesthetic is warm and bookish, not sterile SaaS.

- **Fonts:** `Eczar` (variable serif 400–800, headings/display numbers) + `Onest` (humanist sans, body). The navbar brand stays in Onest for a sans/serif contrast.
- **Accent:** `oklch(0.68 0.18 58)` (amber-gold). Dark mode variant: `oklch(0.78 0.16 58)`. Never use cold blue or indigo.
- **Surfaces:** Light theme uses warm cream tints (hue 75), dark theme uses warm dark-brown tints (hue 55–65).
- **Calendar colors:** `--cal-exam` is warm terracotta (hue 35), `--cal-study` is warm sage green (hue 145). Both are hardcoded inline in `kalender.html`'s `<style>` block as well.
- **Type scale:** Includes `--text-6xl: 3.75rem` used for the dashboard hero greeting.
- **Entrance animations:** `.anim-up-1` through `.anim-up-5` in `components.css` with staggered 70ms delays. Respect `prefers-reduced-motion`.

`css/components.css` contains shared UI components (navbar, buttons, cards, forms, modal, animations). Page-specific styles live in `<style>` blocks inside each HTML file.

### Noten page (noten.js / noten.html)

Modules are created with name + ECTS only. Grades are never entered directly on a module — they are always computed as the average of its **Prüfungsleistungen** (sub-grades) via `GradeUtils.effectiveGrade()`.

The layout uses **CSS Flexbox** (not `<table>`): each module row is `.subject-row-flex` with fixed-width columns `.col-name (flex:1)`, `.col-note (80px)`, `.col-ects (80px)`, `.col-actions (88px)`. The sub-grades panel (`.sub-grades-row`) is a sibling div that toggles `is-expanded`.

UI state is tracked with module-level JS Sets:
- `expandedSubjects` – which module rows have their sub-grades panel open (key: `"semIdx-subIdx"`)
- `editingSubjects` – which module rows are in edit mode
- `editingSgRows` – which sub-grade rows are in name-edit mode (key: `"semIdx-subIdx-sgIdx"`)

Clicking the pencil button on a module auto-expands its sub-grades panel; clicking the checkmark closes it again. The `.computed-grade` display uses `text-decoration: underline dashed` (not `border-bottom`) to avoid affecting row height.

Both ECTS-weighted and unweighted averages are shown in the summary bar and per semester header, and on the dashboard (`statAvg` / `statAvgSimple`).

### Study plan algorithm

`kalender.js → computeStudyDays(exams, settings)` returns a `Set` of ISO date strings. Logic: for each exam, iterate every day from `(examDate − weeksBeforeExam * 7)` to `examDate`, keep only days whose `getDay()` value appears in `settings.daysOfWeek`. The result drives both the calendar highlight and the dashboard "today" block.

### Timer

The Pomodoro state in `timer.js` is entirely in-memory (not persisted between page loads). Only the daily totals (`sf_today_stats`) and settings (`sf_timer_settings`) are saved. The SVG ring uses `stroke-dashoffset` on a circle with `r=104` (circumference ≈ 653).
