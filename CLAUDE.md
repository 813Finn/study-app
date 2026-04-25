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
- `GradeUtils` – grade formatting and ECTS-weighted average calculation
- `initApp(pageName)` – must be called first in every page JS; injects the navbar, applies the saved theme, and prompts for a name on first visit

Each page JS file calls `initApp('pagename')` as its first line, then runs its own logic.

### localStorage keys

All keys are prefixed `sf_` to avoid collisions:

| Key | Shape |
|-----|-------|
| `sf_exams` | `[{ id, subject, date }]` |
| `sf_study_settings` | `{ daysOfWeek: number[], hoursPerDay, weeksBeforeExam }` |
| `sf_grades` | `[{ id, name, subjects: [{ name, grade, ects }] }]` |
| `sf_timer_settings` | `{ workMinutes, shortBreakMinutes, longBreakMinutes, cyclesBeforeLong }` |
| `sf_today_stats` | `{ date: string, pomodoros, focusMinutes }` |
| `sf_profile` | `{ name }` |
| `sf_theme` | `'light' \| 'dark'` |

### CSS system

`css/style.css` defines all design tokens as CSS custom properties on `:root` (spacing, type scale, radii) and theme-specific values (`--bg`, `--fg`, `--fg-2`, `--fg-3`, `--border`, etc.) on `[data-theme="light"]` and `[data-theme="dark"]`. The accent color is OKLCH-based (`oklch(0.58 0.20 268)`). Always use existing tokens; do not hard-code colors or spacing values.

`css/components.css` contains shared UI components (navbar, buttons, cards, forms, modal). Page-specific styles live in `<style>` blocks inside each HTML file.

### Study plan algorithm

`kalender.js → computeStudyDays(exams, settings)` returns a `Set` of ISO date strings. Logic: for each exam, iterate every day from `(examDate − weeksBeforeExam * 7)` to `examDate`, keep only days whose `getDay()` value appears in `settings.daysOfWeek`. The result drives both the calendar highlight and the dashboard "today" block.

### Timer

The Pomodoro state in `timer.js` is entirely in-memory (not persisted between page loads). Only the daily totals (`sf_today_stats`) and settings (`sf_timer_settings`) are saved. The SVG ring uses `stroke-dashoffset` on a circle with `r=104` (circumference ≈ 653).
