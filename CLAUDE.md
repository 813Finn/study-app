# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

No build step — open `index.html` directly or `npx serve .`.

## Architecture

Single Page Application. All pages live in `index.html` as `<section id="page-*" class="page-section" hidden>` elements. The hash-based router in `js/app.js` shows/hides sections and calls `initPage_<name>()` on each navigation.

**Script load order (bottom of `index.html`):**
`supabase.js` → `sync.js` → `app.js` → `dashboard.js` → `lernplan.js` → `module.js` → `timer.js` → inline `initApp()`

**`js/app.js`** runs first, exposes globals:
- `store` – localStorage wrapper with Supabase sync (`store.get/set/remove`)
- `DateUtils` – always use `DateUtils.toISO(date)`, never `.toISOString()` (UTC shift bug)
- `GradeUtils` – `simpleAverage`, `effectiveGrade`, `gradeClass`, `format`
- `router` – `router.go(hash)` / `router.init()`; calls `window['initPage_' + page](params)`

**Auth pages** (`login.html`, `reset-password.html`) are separate HTML files outside the SPA and load their own scripts.

## localStorage keys (all prefixed `sf_`)

| Key | Shape |
|-----|-------|
| `sf_exams` | `[{ id, subject, date }]` |
| `sf_grades` | `[{ id, name, subjects: [{ name, ects, subGrades: [{ id, name, grade, examDate, examId }] }] }]` |
| `sf_exam_plans` | `{ [examId]: { weeklyHours: { [dow]: hours } } }` – Lernplan pro Prüfung |
| `sf_timer_settings` | `{ workMinutes, shortBreakMinutes, longBreakMinutes, cyclesBeforeLong }` |
| `sf_today_stats` | `{ date, pomodoros, focusMinutes, bySubject: { [subject]: minutes } }` |
| `sf_study_history` | `{ [dateISO]: { [subject]: minutes } }` – kumuliert über alle Tage |
| `sf_profile` | `{ name }` |
| `sf_theme` | `'light' \| 'dark'` |

**Key cross-file rule:** Sub-grades store `examId`. When a date is set, an `sf_exams` entry is created with `subject = "${moduleName} – ${subGradeName}"`. Renames and deletes must propagate via `examId`.

## CSS

`css/style.css` – design tokens (never hard-code colors/spacing). `css/components.css` – shared components + `.anim-up-1`…`.anim-up-6` (70ms stagger). Page styles live in the `<style>` block inside `index.html`.

**Design: "Warm Scholar"** – Eczar (serif, headings) + Onest (sans, body). Accent: `oklch(0.68 0.18 58)` amber-gold. No cold blues.

## Page notes

**Module:** Grades always computed from sub-grades via `GradeUtils.effectiveGrade()`, never entered directly. Semesters render newest-first (reversed HTML, but `semIdx` = original array index). UI state: `collapsedSemesters`, `expandedSubjects`, `editingSubjects`, `editingSgRows` (Sets). Creation via `showFormModal()`, deletion via `showDeleteConfirm()`. Date/grade fields only editable when pencil is active.

**Dashboard:** `computeStudyDays()` builds study-day Set for the calendar. "Lernzeit heute" reads `sf_today_stats`. "Lernzeit nach Semester" aggregates `sf_study_history` + live-merges today's `sf_today_stats`; maps subjects to modules via `subGrade.examId → sf_exams`. Study items in the "Lernplan" card are hash links `#timer?subject=...`. The `histSemesterSelect` change listener is attached only once via `_dashboardReady` flag.

**Lernplan:** Reads `sf_exams` for upcoming exams, reads/writes `sf_exam_plans`. `computeRemainingMinutes()` counts planned hours from today (inclusive) until the exam day.

**Timer:** Pomodoro state is in-memory only. `timerInitialized` flag ensures settings and `switchToPhase('work')` run only once across navigations. Completing a work phase writes to both `sf_today_stats` and `sf_study_history`. Subject selector shows only subjects with planned time today. Space bar shortcut is guarded by `page-timer` visibility. `updateUI()` only sets `document.title` when the timer page is visible.
