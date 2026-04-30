# CLAUDE.md

## Running the app

No build step — open `index.html` directly or `npx serve .`.

## Architecture

**`js/app.js`** runs first on every page, exposes globals:
- `store` – localStorage wrapper (`store.get/set/remove`)
- `DateUtils` – always use `DateUtils.toISO(date)`, never `.toISOString()` (UTC shift bug)
- `GradeUtils` – `simpleAverage`, `effectiveGrade`, `gradeClass`, `format`
- `initApp(pageName)` – must be first line of every page JS

**Pages:** `index.html` → `dashboard.js` · `lernplan.html` → `lernplan.js` · `module.html` → `module.js` · `timer.html` → `timer.js`

## localStorage keys (all prefixed `sf_`)

| Key | Shape |
|-----|-------|
| `sf_exams` | `[{ id, subject, date }]` |
| `sf_grades` | `[{ id, name, subjects: [{ name, ects, subGrades: [{ id, name, grade, examDate, examId }] }] }]` |
| `sf_study_settings` | `{ daysOfWeek: number[], hoursPerDay, weeksBeforeExam }` |
| `sf_timer_settings` | `{ workMinutes, shortBreakMinutes, longBreakMinutes, cyclesBeforeLong }` |
| `sf_today_stats` | `{ date, pomodoros, focusMinutes, bySubject: { [subject]: minutes } }` |
| `sf_study_history` | `{ [dateISO]: { [subject]: minutes } }` – kumuliert über alle Tage |
| `sf_profile` | `{ name }` |
| `sf_theme` | `'light' \| 'dark'` |

**Key cross-file rule:** Sub-grades store `examId`. When a date is set, an `sf_exams` entry is created with `subject = "${moduleName} – ${subGradeName}"`. Renames and deletes must propagate via `examId`.

## CSS

`css/style.css` – design tokens (never hard-code colors/spacing). `css/components.css` – shared components + `.anim-up-1`…`.anim-up-6` (70ms stagger). Page styles in `<style>` blocks.

**Design: "Warm Scholar"** – Eczar (serif, headings) + Onest (sans, body). Accent: `oklch(0.68 0.18 58)` amber-gold. No cold blues.

## Page notes

**Module:** Grades always computed from sub-grades via `GradeUtils.effectiveGrade()`, never entered directly. Semesters render newest-first (reversed HTML, but `semIdx` = original array index). UI state: `collapsedSemesters`, `expandedSubjects`, `editingSubjects`, `editingSgRows` (Sets). Creation via `showFormModal()`, deletion via `showDeleteConfirm()`. Date/grade fields only editable when pencil is active.

**Dashboard:** `computeStudyDays()` builds study-day Set for the calendar. "Lernzeit heute" reads `sf_today_stats`. "Lernzeit nach Semester" aggregates `sf_study_history` + live-merges today's `sf_today_stats` (in case history not written yet); maps subjects to modules via `subGrade.examId → sf_exams`.

**Lernplan:** Read/write only for `sf_study_settings`. No dynamic rendering – fields load on page init, save on button click.

**Timer:** Pomodoro state in-memory only. Completing a work phase writes to both `sf_today_stats` and `sf_study_history`. Subject pre-selectable via `?subject=` URL param.
