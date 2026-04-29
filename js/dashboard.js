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
    let daysLabel = '';
    if (days <= 0) {
      urgencyClass = 'urgent';
      daysLabel = 'Heute!';
    } else if (days <= 7) {
      urgencyClass = 'urgent';
      daysLabel = days === 1 ? 'Morgen' : `${days} Tage`;
    } else if (days <= 14) {
      urgencyClass = 'soon';
      daysLabel = `${days} Tage`;
    } else {
      daysLabel = `${days} Tage`;
    }

    return `
      <div class="exam-item">
        <div class="exam-days-badge ${urgencyClass}">
          <span class="exam-days-num">${days <= 0 ? '!' : days}</span>
          <span class="exam-days-label">${days <= 0 ? 'heute' : 'Tage'}</span>
        </div>
        <div class="flex-1">
          <div class="list-item-title">${escapeHtml(exam.subject)}</div>
          <div class="list-item-sub">${DateUtils.formatShort(exam.date)} · ${daysLabel}</div>
        </div>
      </div>`;
  }).join('');
}

/* ── Heutiger Lernplan ────────────────────────────────── */
function renderTodayStudy() {
  const settings = store.get('sf_study_settings') || {
    daysOfWeek: [1, 2, 3, 4, 5],
    hoursPerDay: 2,
    weeksBeforeExam: 4,
  };
  const exams    = store.get('sf_exams') || [];
  const todayISO = DateUtils.todayISO();
  const todayDow = new Date().getDay();

  // Bereits heute gelernte Minuten pro Fach
  const savedStats  = store.get('sf_today_stats');
  const todayKey    = DateUtils.todayISO();
  const bySubject   = (savedStats && savedStats.date === todayKey && savedStats.bySubject)
    ? savedStats.bySubject : {};

  const plannedMinsPerExam = settings.hoursPerDay * 60;

  const todayItems = [];

  if (settings.daysOfWeek.includes(todayDow)) {
    const examsNeedingStudy = exams.filter(e => {
      const days = DateUtils.diffDays(e.date);
      return days >= 0 && days <= settings.weeksBeforeExam * 7;
    });

    examsNeedingStudy.forEach(exam => {
      const days           = DateUtils.diffDays(exam.date);
      const studiedMins    = bySubject[exam.subject] || 0;
      const remainingMins  = Math.max(0, plannedMinsPerExam - studiedMins);

      if (days === 0) {
        todayItems.push({ subject: exam.subject, type: 'exam', info: 'Klausur heute!', remainingMins: 0 });
      } else {
        const remainingStr = remainingMins === 0
          ? `Heute erledigt · noch ${days} ${days === 1 ? 'Tag' : 'Tage'}`
          : `${formatMins(remainingMins)} noch heute · ${days} ${days === 1 ? 'Tag' : 'Tage'}`;
        todayItems.push({ subject: exam.subject, type: 'study', info: remainingStr, remainingMins });
      }
    });
  }

  // Klausuren die heute stattfinden (auch wenn kein Lerntag)
  exams.filter(e => e.date === todayISO).forEach(exam => {
    if (!todayItems.find(i => i.subject === exam.subject && i.type === 'exam')) {
      todayItems.push({ subject: exam.subject, type: 'exam', info: 'Klausur heute!', remainingMins: 0 });
    }
  });

  // Stat: verbleibende Lernstunden heute
  const totalRemainingMins = todayItems
    .filter(i => i.type === 'study')
    .reduce((sum, i) => sum + i.remainingMins, 0);
  const statVal = totalRemainingMins >= 60
    ? (totalRemainingMins / 60).toFixed(1).replace(/\.0$/, '')
    : totalRemainingMins > 0 ? `${totalRemainingMins}m` : '0';
  document.getElementById('statToday').textContent = statVal;

  // Stat: bereits gelernte Zeit heute (aus Timer-Daten)
  const focusMins = (savedStats && savedStats.date === todayKey) ? (savedStats.focusMinutes || 0) : 0;
  document.getElementById('statTodayDone').textContent = formatMins(focusMins);

  const listEl = document.getElementById('todayStudyList');

  if (!todayItems.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <p>Heute stehen keine Lerneinheiten an. Genieße deinen freien Tag!</p>
      </div>`;
    return;
  }

  listEl.innerHTML = todayItems.map(item => `
    <div class="study-item">
      <div class="study-item-dot ${item.type === 'exam' ? 'exam' : ''}"></div>
      <div class="study-item-text">
        <div class="study-item-title">${escapeHtml(item.subject)}</div>
        <div class="study-item-meta">${item.info}</div>
      </div>
      ${item.type === 'study'
        ? item.remainingMins > 0
          ? `<a href="timer.html?subject=${encodeURIComponent(item.subject)}" class="btn btn-ghost btn-sm">Start</a>`
          : `<span class="badge badge-good">Fertig</span>`
        : `<span class="badge badge-bad">Heute</span>`
      }
    </div>`).join('');
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
  const weightedAvg = GradeUtils.weightedAverage(allSubjects);
  const simpleAvg   = GradeUtils.simpleAverage(allSubjects);

  const el = document.getElementById('statAvg');
  el.textContent = GradeUtils.format(weightedAvg);
  el.className = `stat-value ${GradeUtils.gradeClass(weightedAvg)}`;

  const el2 = document.getElementById('statAvgSimple');
  el2.textContent = GradeUtils.format(simpleAvg);
  el2.className = `stat-value ${GradeUtils.gradeClass(simpleAvg)}`;
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

function computeStudyDays(exams, settings) {
  const studySet = new Set();
  const todayISO = DateUtils.todayISO();
  exams.forEach(exam => {
    if (exam.date < todayISO) return;
    const examDate  = DateUtils.fromISO(exam.date);
    const startDate = new Date(examDate);
    startDate.setDate(startDate.getDate() - settings.weeksBeforeExam * 7);
    const cur = new Date(startDate > DateUtils.today() ? startDate : DateUtils.today());
    while (cur < examDate) {
      if (settings.daysOfWeek.includes(cur.getDay())) studySet.add(DateUtils.toISO(cur));
      cur.setDate(cur.getDate() + 1);
    }
  });
  return studySet;
}

function renderCalendarWidget() {
  const exams    = store.get('sf_exams') || [];
  const settings = store.get('sf_study_settings') || { daysOfWeek: [1,2,3,4,5], hoursPerDay: 2, weeksBeforeExam: 4 };
  const examDates = new Set(exams.map(e => e.date));
  const studyDays = computeStudyDays(exams, settings);
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

    el.addEventListener('click', () => showDayDetail(iso, exams, settings, studyDays));
    grid.appendChild(el);
  }
}

function showDayDetail(iso, exams, settings, studyDays) {
  document.querySelectorAll('.cal-day.selected').forEach(d => d.classList.remove('selected'));
  const activeDay = document.querySelector(`.cal-day[data-iso="${iso}"]`);
  if (activeDay) activeDay.classList.add('selected');

  const detail    = document.getElementById('dayDetail');
  const dateEl    = document.getElementById('dayDetailDate');
  const contentEl = document.getElementById('dayDetailContent');
  const todayISO  = DateUtils.todayISO();

  dateEl.textContent = DateUtils.formatLong(iso);
  detail.hidden = false;

  const items       = [];
  const examsOnDay  = exams.filter(e => e.date === iso);
  examsOnDay.forEach(e => items.push({ type: 'exam', text: `Klausur: ${e.subject}` }));

  if (studyDays.has(iso) && !examsOnDay.length) {
    const activeExams = exams.filter(e => {
      const examDate  = DateUtils.fromISO(e.date);
      const startDate = new Date(examDate);
      startDate.setDate(startDate.getDate() - settings.weeksBeforeExam * 7);
      const isoDate = DateUtils.fromISO(iso);
      return isoDate >= startDate && isoDate < examDate;
    });
    if (activeExams.length) {
      activeExams.forEach(e => {
        const daysLeft = DateUtils.diffDays(e.date);
        items.push({ type: 'study', text: `Lernen für: ${e.subject} · ${settings.hoursPerDay} Std (noch ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tage'})` });
      });
    } else {
      items.push({ type: 'study', text: `Lerntag · ${settings.hoursPerDay} Stunden geplant` });
    }
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

/* ── Init ─────────────────────────────────────────────── */
renderGreeting();
renderExamList();
renderTodayStudy();
renderGradeAvg();
renderSubjectStats();
renderStudyHistorySection();
renderCalendarWidget();

document.getElementById('histSemesterSelect')
  .addEventListener('change', renderStudyHistorySection);
