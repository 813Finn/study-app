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
  const exams = store.get('sf_exams') || [];
  const todayISO = DateUtils.todayISO();
  const todayDow = new Date().getDay(); // 0=So, 1=Mo …

  const todayItems = [];

  if (settings.daysOfWeek.includes(todayDow)) {
    const examsNeedingStudy = exams.filter(e => {
      const days = DateUtils.diffDays(e.date);
      return days >= 0 && days <= settings.weeksBeforeExam * 7;
    });

    examsNeedingStudy.forEach(exam => {
      const days = DateUtils.diffDays(exam.date);
      if (days === 0) {
        todayItems.push({ subject: exam.subject, type: 'exam', info: 'Klausur heute!' });
      } else {
        todayItems.push({
          subject: exam.subject,
          type: 'study',
          info: `${settings.hoursPerDay} Std · noch ${days} ${days === 1 ? 'Tag' : 'Tage'}`,
        });
      }
    });
  }

  // Klausuren die heute stattfinden (auch wenn kein Lerntag)
  exams.filter(e => e.date === todayISO).forEach(exam => {
    if (!todayItems.find(i => i.subject === exam.subject && i.type === 'exam')) {
      todayItems.push({ subject: exam.subject, type: 'exam', info: 'Klausur heute!' });
    }
  });

  // Stat aktualisieren
  const studyHours = todayItems.filter(i => i.type === 'study').length > 0
    ? settings.hoursPerDay * todayItems.filter(i => i.type === 'study').length
    : 0;
  document.getElementById('statToday').textContent = studyHours || '0';

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
        ? `<a href="timer.html" class="btn btn-ghost btn-sm">Start</a>`
        : `<span class="badge badge-bad">Heute</span>`
      }
    </div>`).join('');
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

/* ── Init ─────────────────────────────────────────────── */
renderGreeting();
renderExamList();
renderTodayStudy();
renderGradeAvg();
