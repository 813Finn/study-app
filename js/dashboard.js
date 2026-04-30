/* ═══════════════════════════════════════════════════════════
   Dashboard
═══════════════════════════════════════════════════════════ */

initApp('dashboard');

const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

/* ── Begrüßung ────────────────────────────────────────── */
function renderGreeting() {
  const now = new Date();
  const profile = getProfile();
  const name = profile.name || '…';

  document.getElementById('greetingName').textContent = name;

  const dateStr = `${DAYS_DE[now.getDay()]}, ${now.getDate()}. ${MONTHS_DE[now.getMonth()]} ${now.getFullYear()}`;
  document.getElementById('greetingDate').textContent = dateStr;

  const todaySub = document.getElementById('todaySubtitle');
  if (todaySub) todaySub.textContent = dateStr;
}

document.addEventListener('profileUpdated', renderGreeting);

/* ── Klausur-Liste ────────────────────────────────────── */
function renderExamList() {
  const exams = store.get('sf_exams') || [];
  const todayISO = DateUtils.todayISO();

  // Nur zukünftige, sortiert
  const upcoming = exams
    .filter(e => e.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  document.getElementById('statExams').textContent = upcoming.length;

  const listEl = document.getElementById('examList');

  if (!upcoming.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎓</div>
        <p>Noch keine Klausuren eingetragen.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = upcoming.map(exam => {
    const days = DateUtils.diffDays(exam.date);
    let urgencyClass = '';
    if (days <= 0)       urgencyClass = 'urgent';
    else if (days <= 7)  urgencyClass = 'urgent';
    else if (days <= 14) urgencyClass = 'soon';

    return `
      <div class="exam-item">
        <div class="exam-days-badge ${urgencyClass}">
          <span class="exam-days-num">${days <= 0 ? '!' : days}</span>
          <span class="exam-days-label">${days <= 0 ? 'heute' : 'Tage'}</span>
        </div>
        <div class="flex-1">
          <div class="list-item-title">${escapeHtml(exam.subject)}</div>
          <div class="list-item-sub">${DateUtils.formatShort(exam.date)}</div>
        </div>
      </div>`;
  }).join('');
}

/* ── Heutiger Lernplan ────────────────────────────────── */
function renderTodayStudy() {
  const examPlans = store.get('sf_exam_plans') || {};
  const exams     = store.get('sf_exams') || [];
  const todayISO  = DateUtils.todayISO();
  const todayDow  = new Date().getDay();

  const savedStats = store.get('sf_today_stats');
  const bySubject  = (savedStats && savedStats.date === todayISO && savedStats.bySubject)
    ? savedStats.bySubject : {};

  const todayItems = [];

  exams.forEach(exam => {
    const days = DateUtils.diffDays(exam.date);

    if (days === 0) {
      todayItems.push({ subject: exam.subject, type: 'exam' });
      return;
    }
    if (days < 0) return;

    const plan = examPlans[exam.id];
    if (!plan || !plan.weeklyHours || !plan.weeklyHours[todayDow]) return;
    const plannedMins = plan.weeklyHours[todayDow] * 60;
    if (plannedMins <= 0) return;

    const studiedMins   = bySubject[exam.subject] || 0;
    const remainingMins = Math.max(0, plannedMins - studiedMins);
    todayItems.push({ subject: exam.subject, type: 'study', plannedMins, studiedMins, remainingMins, days });
  });

  const totalRemainingMins = todayItems.filter(i => i.type === 'study').reduce((s, i) => s + i.remainingMins, 0);
  const focusMins = (savedStats && savedStats.date === todayISO) ? (savedStats.focusMinutes || 0) : 0;

  document.getElementById('statTodayDone').textContent = formatMins(focusMins);
  document.getElementById('statToday').textContent     = formatMins(totalRemainingMins);

  const listEl = document.getElementById('todayStudyList');

  if (!todayItems.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <p>Heute stehen keine Lerneinheiten an. Genieße deinen freien Tag!</p>
      </div>`;
    return;
  }

  listEl.innerHTML = todayItems.map(item => {
    if (item.type === 'exam') {
      return `
        <div class="study-item">
          <div class="study-item-title">${escapeHtml(item.subject)}</div>
          <div class="study-item-meta">Prüfung heute!</div>
        </div>`;
    }
    const isDone = item.remainingMins === 0;
    return `
      <div class="study-item">
        <div class="study-item-title">${escapeHtml(item.subject)}</div>
        ${isDone
          ? `<span class="badge badge-good" style="display:inline-flex;align-items:center;gap:4px"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>Fertig</span>`
          : `<div class="study-item-meta">${formatMins(item.remainingMins)} übrig</div>`}
      </div>`;
  }).join('');
}

/* ── Minuten lesbar formatieren (z.B. "1 Std 30 Min") ── */
function formatMins(mins) {
  if (mins <= 0) return '0 Min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} Std ${m} Min`;
  if (h > 0)          return `${h} Std`;
  return `${m} Min`;
}

/* ── Notendurchschnitt ────────────────────────────────── */
function renderGradeAvg() {
  const grades = store.get('sf_grades') || [];
  const allSubjects = grades.flatMap(sem => sem.subjects || []);
  const simpleAvg = GradeUtils.simpleAverage(allSubjects);

  const el = document.getElementById('statAvg');
  el.textContent = GradeUtils.format(simpleAvg);
  el.className = `grade-avg-value ${GradeUtils.gradeClass(simpleAvg)}`;
}

/* ── Nächste Klausur Hero ─────────────────────────────── */
function renderNextExamHero() {
  const exams = (store.get('sf_exams') || [])
    .filter(e => e.date >= DateUtils.todayISO())
    .sort((a, b) => a.date.localeCompare(b.date));

  const heroEl = document.getElementById('nextExamHero');
  if (!exams.length) { heroEl.hidden = true; return; }

  const exam = exams[0];
  const days = DateUtils.diffDays(exam.date);
  if (days > 30) { heroEl.hidden = true; return; }

  heroEl.hidden = false;

  const urgency = days <= 7 ? 'urgent' : days <= 14 ? 'soon' : '';
  const countdownEl = document.getElementById('heroCountdown');
  countdownEl.textContent = days === 0 ? 'Heute' : days;
  countdownEl.className = `hero-countdown${urgency ? ' ' + urgency : ''}`;

  document.getElementById('heroMeta').textContent =
    days === 0 ? 'Klausur heute' : `Nächste Klausur · in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
  document.getElementById('heroSubject').textContent = exam.subject;
  document.getElementById('heroDate').textContent = DateUtils.formatShort(exam.date);
}

/* ── Motivations-Zitat ────────────────────────────────── */
const QUOTES = [
  { text: 'Bildung ist nicht das Füllen eines Eimers, sondern das Entzünden eines Feuers.', author: 'W. B. Yeats' },
  { text: 'Investiere in Wissen – es zahlt die besten Zinsen.', author: 'Benjamin Franklin' },
  { text: 'Die Wurzel der Bildung ist bitter, aber ihre Früchte sind süß.', author: 'Aristoteles' },
  { text: 'Lernen ist ein Schatz, der seinem Träger überall folgt.', author: 'Chinesisches Sprichwort' },
  { text: 'Wer aufhört zu lernen, ist alt. Wer weiter lernt, bleibt jung.', author: 'Henry Ford' },
  { text: 'Der Geist ist kein Gefäß, das gefüllt, sondern ein Feuer, das entfacht werden will.', author: 'Plutarch' },
  { text: 'Disziplin ist die Brücke zwischen Zielen und Leistung.', author: 'Jim Rohn' },
  { text: 'Lernen ohne zu denken ist verlorene Zeit. Denken ohne zu lernen ist eine Gefahr.', author: 'Konfuzius' },
  { text: 'Bildung ist das, was übrig bleibt, wenn man alles Gelernte vergessen hat.', author: 'B. F. Skinner' },
  { text: 'Der einzige Weg, großartige Arbeit zu leisten, ist, das zu lieben, was man tut.', author: 'Steve Jobs' },
  { text: 'Kleine Schritte jeden Tag führen zu großen Ergebnissen.', author: '' },
  { text: 'Heute gelernt ist morgen gewonnen.', author: '' },
];

function renderQuote() {
  const idx = Math.floor(Date.now() / 86400000) % QUOTES.length;
  const q   = QUOTES[idx];
  const el  = document.getElementById('quoteCard');
  if (!el) return;
  el.innerHTML = `
    <p class=”quote-text”>${escapeHtml(q.text)}</p>
    ${q.author ? `<span class="quote-author">— ${escapeHtml(q.author)}</span>` : ''}`;
}

/* ── Wochenübersicht ──────────────────────────────────── */
function renderWeekBar() {
  const barEl = document.getElementById('weekBar');
  if (!barEl) return;

  const today      = new Date();
  const todayISO   = DateUtils.todayISO();
  const dow        = (today.getDay() + 6) % 7; // 0 = Mo
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dow);

  const exams      = store.get('sf_exams') || [];
  const history    = store.get('sf_study_history') || {};
  const todayStats = store.get('sf_today_stats');
  const studyDays  = computeStudyDays(exams);
  const examDates  = new Set(exams.map(e => e.date));

  const LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  barEl.innerHTML = LABELS.map((label, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const iso = DateUtils.toISO(date);

    let status = 'free';
    if (examDates.has(iso)) {
      status = 'exam';
    } else {
      let mins = 0;
      if (history[iso]) mins = Object.values(history[iso]).reduce((s, m) => s + m, 0);
      if (iso === todayISO && todayStats && todayStats.date === todayISO)
        mins = Math.max(mins, todayStats.focusMinutes || 0);
      if (mins > 0)            status = 'done';
      else if (studyDays.has(iso)) status = 'planned';
    }

    const isToday = iso === todayISO;
    const dayNum  = date.getDate();
    return `
      <div class="week-chip ${status}${isToday ? ' is-today' : ''}">
        <span class="week-chip-day">${label}</span>
        <span class="week-chip-date">${dayNum}</span>
        <span class="week-chip-dot"></span>
      </div>`;
  }).join('');
}

/* ── Lernstreak ───────────────────────────────────────── */
function renderStreak() {
  const history    = store.get('sf_study_history') || {};
  const todayStats = store.get('sf_today_stats');
  const todayISO   = DateUtils.todayISO();
  const todayMins  = (todayStats && todayStats.date === todayISO)
    ? (todayStats.focusMinutes || 0) : 0;

  let streak = 0;
  const cur  = new Date(DateUtils.today());
  if (todayMins === 0) cur.setDate(cur.getDate() - 1);

  while (true) {
    const iso = DateUtils.toISO(cur);
    let mins  = 0;
    if (iso === todayISO) {
      mins = todayMins;
    } else if (history[iso]) {
      mins = Object.values(history[iso]).reduce((s, m) => s + m, 0);
    }
    if (mins === 0) break;
    streak++;
    cur.setDate(cur.getDate() - 1);
  }

  document.getElementById('streakValue').textContent = streak;
  document.getElementById('streakSub').textContent   = streak === 0
    ? 'Heute starten!'
    : streak === 1 ? 'Tag in Folge' : 'Tage in Folge';
}

/* ── HTML escapen ─────────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Kalender-Widget ──────────────────────────────────── */
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

const CAL_DAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function computeStudyDays(exams) {
  const examPlans = store.get('sf_exam_plans') || {};
  const studySet  = new Set();
  const todayISO  = DateUtils.todayISO();

  exams.forEach(exam => {
    if (exam.date < todayISO) return;
    const examDate = DateUtils.fromISO(exam.date);
    const plan     = examPlans[exam.id];
    if (!plan || !plan.weeklyHours || Object.keys(plan.weeklyHours).length === 0) return;

    const daysOfWeek = Object.keys(plan.weeklyHours).map(Number);
    const cur = new Date(DateUtils.today());
    while (cur < examDate) {
      if (daysOfWeek.includes(cur.getDay())) studySet.add(DateUtils.toISO(cur));
      cur.setDate(cur.getDate() + 1);
    }
  });
  return studySet;
}

function renderCalendarWidget() {
  const exams    = store.get('sf_exams') || [];
  const examDates = new Set(exams.map(e => e.date));
  const studyDays = computeStudyDays(exams);
  const todayISO  = DateUtils.todayISO();

  document.getElementById('calMonthLabel').textContent = DateUtils.formatMonth(calYear, calMonth);

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  CAL_DAYS_SHORT.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-header';
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDow   = new Date(calYear, calMonth, 1).getDay();
  const offset     = (firstDow + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  for (let i = 0; i < offset; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const el  = document.createElement('div');
    el.className = 'cal-day';
    el.setAttribute('role', 'gridcell');

    if (iso === todayISO)       el.classList.add('today');
    if (iso < todayISO)         el.classList.add('past');
    if (examDates.has(iso))     el.classList.add('exam-day');
    else if (studyDays.has(iso)) el.classList.add('study-day');

    el.dataset.iso  = iso;
    el.textContent  = d;

    const dots = [];
    if (examDates.has(iso))                        dots.push('<span class="cal-dot exam"></span>');
    if (studyDays.has(iso) && !examDates.has(iso)) dots.push('<span class="cal-dot study"></span>');
    if (dots.length) el.insertAdjacentHTML('beforeend', `<div class="dot-row">${dots.join('')}</div>`);

    el.addEventListener('click', () => showDayDetail(iso, exams, studyDays));
    grid.appendChild(el);
  }
}

function showDayDetail(iso, exams, studyDays) {
  document.querySelectorAll('.cal-day.selected').forEach(d => d.classList.remove('selected'));
  const activeDay = document.querySelector(`.cal-day[data-iso="${iso}"]`);
  if (activeDay) activeDay.classList.add('selected');

  const detail    = document.getElementById('dayDetail');
  const dateEl    = document.getElementById('dayDetailDate');
  const contentEl = document.getElementById('dayDetailContent');

  dateEl.textContent = DateUtils.formatLong(iso);
  detail.hidden = false;

  const items      = [];
  const examsOnDay = exams.filter(e => e.date === iso);
  examsOnDay.forEach(e => items.push({ type: 'exam', text: `Klausur: ${e.subject}` }));

  if (studyDays.has(iso) && !examsOnDay.length) {
    const examPlans = store.get('sf_exam_plans') || {};
    const dow       = DateUtils.fromISO(iso).getDay();
    const selectedDate = DateUtils.fromISO(iso);

    exams.filter(e => iso < e.date).forEach(e => {
      const plan = examPlans[e.id];
      if (!plan || !plan.weeklyHours || !plan.weeklyHours[dow]) return;
      const examDate = DateUtils.fromISO(e.date);
      const daysLeft = Math.ceil((examDate - selectedDate) / (1000 * 60 * 60 * 24));
      items.push({ type: 'study', text: `${e.subject} · noch ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tage'}` });
    });
  }

  if (!items.length) {
    contentEl.innerHTML = `<p class="day-detail-empty">Kein Eintrag für diesen Tag.</p>`;
    return;
  }

  contentEl.innerHTML = items.map(item => `
    <div class="day-detail-item">
      <span class="day-detail-dot ${item.type}"></span>
      <span>${escapeHtml(item.text)}</span>
    </div>`).join('');
}

document.getElementById('todayBtn').addEventListener('click', () => {
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  renderCalendarWidget();
  const exams     = store.get('sf_exams') || [];
  const studyDays = computeStudyDays(exams);
  showDayDetail(DateUtils.todayISO(), exams, studyDays);
});

document.getElementById('prevMonth').addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendarWidget();
});

document.getElementById('nextMonth').addEventListener('click', () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendarWidget();
});

/* ── Lernzeit pro Modul ───────────────────────────────── */
function renderSubjectStats() {
  const el = document.getElementById('subjectBreakdown');
  if (!el) return;

  const todayKey  = DateUtils.todayISO();
  const saved     = store.get('sf_today_stats');
  const bySubject = (saved && saved.date === todayKey && saved.bySubject)
    ? saved.bySubject : {};
  const entries   = Object.entries(bySubject).filter(([, m]) => m > 0);

  if (!entries.length) {
    el.hidden = true;
    return;
  }

  const maxMins = Math.max(...entries.map(([, m]) => m));
  el.hidden = false;

  document.getElementById('subjectBreakdownList').innerHTML = entries
    .sort((a, b) => b[1] - a[1])
    .map(([subject, mins]) => {
      const pct = Math.round(mins / maxMins * 100);
      return `
        <div class="subject-breakdown-row">
          <span class="subject-breakdown-name">${escapeHtml(subject)}</span>
          <div class="subject-breakdown-bar-wrap">
            <div class="subject-breakdown-bar" style="width:${pct}%"></div>
          </div>
          <span class="subject-breakdown-val">${formatMins(mins)}</span>
        </div>`;
    }).join('');
}

/* ── Lernzeit nach Semester ───────────────────────────── */
function renderStudyHistorySection() {
  const grades  = store.get('sf_grades') || [];
  const history = store.get('sf_study_history') || {};
  const exams   = store.get('sf_exams') || [];
  const selEl   = document.getElementById('histSemesterSelect');
  const listEl  = document.getElementById('histModuleList');
  if (!selEl || !listEl) return;

  // Semester-Optionen befüllen (neueste zuerst, wie auf der Modul-Seite)
  const prevVal = selEl.value;
  selEl.innerHTML = grades.length === 0
    ? '<option value="">Keine Semester vorhanden</option>'
    : [...grades].reverse().map((sem, revI) => {
        const origI = grades.length - 1 - revI;
        return `<option value="${origI}">${escapeHtml(sem.name)}</option>`;
      }).join('');

  // Vorige Auswahl wiederherstellen, falls noch gültig
  if (prevVal !== '' && grades[parseInt(prevVal)]) selEl.value = prevVal;

  const semIdx = parseInt(selEl.value);
  if (isNaN(semIdx) || !grades[semIdx]) {
    listEl.innerHTML = '<p style="font-size:var(--text-sm);color:var(--fg-3);padding:var(--sp-4) 0">Kein Semester ausgewählt.</p>';
    return;
  }

  const semester = grades[semIdx];

  // Heute immer live aus sf_today_stats einbeziehen (history enthält evtl. noch keinen Eintrag)
  const todayKey   = DateUtils.todayISO();
  const todayStats = store.get('sf_today_stats');
  const mergedHistory = { ...history };
  if (todayStats && todayStats.date === todayKey && todayStats.bySubject) {
    mergedHistory[todayKey] = todayStats.bySubject;
  }

  // Gesamtminuten pro Prüfungsleistungs-Subjekt über alle Tage summieren
  const totalBySubject = {};
  for (const dayData of Object.values(mergedHistory)) {
    for (const [subject, mins] of Object.entries(dayData)) {
      totalBySubject[subject] = (totalBySubject[subject] || 0) + mins;
    }
  }

  // Pro Modul alle verknüpften Prüfungsleistungen aufsummieren
  const moduleData = (semester.subjects || []).map(module => {
    let totalMins = 0;
    for (const sg of (module.subGrades || [])) {
      if (sg.examId) {
        const exam = exams.find(e => e.id === sg.examId);
        if (exam && totalBySubject[exam.subject]) {
          totalMins += totalBySubject[exam.subject];
        }
      }
    }
    return { name: module.name, mins: totalMins };
  });

  if (!moduleData.some(m => m.mins > 0)) {
    listEl.innerHTML = '<p style="font-size:var(--text-sm);color:var(--fg-3);padding:var(--sp-4) 0">Noch keine Lernzeit für dieses Semester erfasst.</p>';
    return;
  }

  const maxMins = Math.max(...moduleData.map(m => m.mins));
  listEl.innerHTML = moduleData
    .slice()
    .sort((a, b) => b.mins - a.mins)
    .filter(m => m.mins > 0)
    .map(({ name, mins }) => {
      const pct = Math.round(mins / maxMins * 100);
      return `
        <div class="subject-breakdown-row">
          <span class="subject-breakdown-name">${escapeHtml(name)}</span>
          <div class="subject-breakdown-bar-wrap">
            <div class="subject-breakdown-bar" style="width:${pct}%"></div>
          </div>
          <span class="subject-breakdown-val">${formatMins(mins)}</span>
        </div>`;
    }).join('');
}

/* ── Lernzeit diese Woche ─────────────────────────────── */
function renderWeeklySummary() {
  const rowsEl  = document.getElementById('weeklySummaryRows');
  const totalEl = document.getElementById('weeklySummaryTotal');
  if (!rowsEl) return;

  const todayISO   = DateUtils.todayISO();
  const today      = new Date();
  const dow        = (today.getDay() + 6) % 7;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dow);

  const history    = store.get('sf_study_history') || {};
  const todayStats = store.get('sf_today_stats');
  const LABELS     = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const days = LABELS.map((label, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const iso = DateUtils.toISO(date);
    let mins = history[iso] ? Object.values(history[iso]).reduce((s, m) => s + m, 0) : 0;
    if (iso === todayISO && todayStats && todayStats.date === todayISO)
      mins = Math.max(mins, todayStats.focusMinutes || 0);
    return { label, mins, isToday: iso === todayISO, isFuture: iso > todayISO };
  });

  const maxMins  = Math.max(...days.map(d => d.mins), 1);
  const totalMins = days.reduce((s, d) => s + d.mins, 0);

  rowsEl.innerHTML = days.map(d => `
    <div class="weekly-summary-row${d.isToday ? ' is-today' : ''}">
      <span class="weekly-summary-day">${d.label}</span>
      <div class="weekly-summary-bar-wrap">
        ${d.mins > 0 ? `<div class="weekly-summary-bar" style="width:${Math.round(d.mins / maxMins * 100)}%"></div>` : ''}
      </div>
      <span class="weekly-summary-val">${d.mins > 0 ? formatMins(d.mins) : d.isFuture ? '' : '–'}</span>
    </div>`).join('');

  totalEl.textContent = totalMins > 0 ? formatMins(totalMins) : '0 Min';
}

/* ── Init ─────────────────────────────────────────────── */
renderGreeting();
renderNextExamHero();
renderQuote();
renderExamList();
renderTodayStudy();
renderWeekBar();
renderGradeAvg();
renderSubjectStats();
renderStudyHistorySection();
renderStreak();
renderWeeklySummary();
renderCalendarWidget();

// Heutigen Tag im Kalender vorauswählen
{
  const exams     = store.get('sf_exams') || [];
  const studyDays = computeStudyDays(exams);
  showDayDetail(DateUtils.todayISO(), exams, studyDays);
}

document.getElementById('histSemesterSelect')
  .addEventListener('change', renderStudyHistorySection);
