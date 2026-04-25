/* ═══════════════════════════════════════════════════════════
   Kalender & Lernplan
═══════════════════════════════════════════════════════════ */

initApp('kalender');

/* ── State ────────────────────────────────────────────── */
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

const DAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/* ── HTML escapen ─────────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Lernplan-Berechnung ──────────────────────────────── */
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
      // cur.getDay(): 0=So … 6=Sa → wir prüfen, ob dieser Tag im Lernplan liegt
      if (settings.daysOfWeek.includes(cur.getDay())) {
        studySet.add(DateUtils.toISO(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
  });

  return studySet;
}

/* ── Kalender rendern ─────────────────────────────────── */
function renderCalendar() {
  const exams    = store.get('sf_exams') || [];
  const settings = store.get('sf_study_settings') || {
    daysOfWeek: [1, 2, 3, 4, 5],
    hoursPerDay: 2,
    weeksBeforeExam: 4,
  };

  const examDates  = new Set(exams.map(e => e.date));
  const studyDays  = computeStudyDays(exams, settings);
  const todayISO   = DateUtils.todayISO();

  document.getElementById('calMonthLabel').textContent = DateUtils.formatMonth(calYear, calMonth);

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  // Wochentag-Header (Mo–So)
  DAYS_SHORT.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-header';
    el.textContent = d;
    grid.appendChild(el);
  });

  // Ersten Wochentag des Monats bestimmen (Mo = 0)
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const offset   = (firstDow + 6) % 7; // 0=Mo, 6=So
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Leere Zellen vor dem 1.
  for (let i = 0; i < offset; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }

  // Tage
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const el = document.createElement('div');
    el.className = 'cal-day';
    el.setAttribute('role', 'gridcell');

    if (iso === todayISO) el.classList.add('today');
    if (iso < todayISO)   el.classList.add('past');
    if (examDates.has(iso))  el.classList.add('exam-day');
    else if (studyDays.has(iso)) el.classList.add('study-day');

    el.dataset.iso = iso;
    el.textContent = d;

    // Dot indicators
    const dots = [];
    if (examDates.has(iso))  dots.push('<span class="cal-dot exam"></span>');
    if (studyDays.has(iso) && !examDates.has(iso)) dots.push('<span class="cal-dot study"></span>');
    if (dots.length) {
      el.insertAdjacentHTML('beforeend', `<div class="dot-row">${dots.join('')}</div>`);
    }

    // Klick-Handler
    el.addEventListener('click', () => showDayDetail(iso, exams, settings, studyDays));

    grid.appendChild(el);
  }
}

/* ── Klausurliste (Sidebar) ───────────────────────────── */
function renderExamSidebar() {
  const exams    = store.get('sf_exams') || [];
  const todayISO = DateUtils.todayISO();
  const sorted   = [...exams].sort((a, b) => a.date.localeCompare(b.date));
  const listEl   = document.getElementById('examSidebarList');

  if (!sorted.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎓</div>
        <p>Noch keine Klausuren eingetragen.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = sorted.map(exam => {
    const days = DateUtils.diffDays(exam.date);
    const isPast = days < 0;
    let chipClass = 'badge-neutral';
    if (!isPast && days <= 7)  chipClass = 'badge-bad';
    else if (!isPast && days <= 14) chipClass = 'badge-mid';

    return `
      <div class="exam-sidebar-item">
        <span class="exam-sidebar-name">${escapeHtml(exam.subject)}</span>
        <span class="exam-sidebar-date">${DateUtils.formatShort(exam.date)}</span>
        <button class="btn btn-danger btn-sm" data-delete="${exam.id}" aria-label="${escapeHtml(exam.subject)} löschen">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>`;
  }).join('');

  // Löschen-Handler
  listEl.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.delete;
      let exams = store.get('sf_exams') || [];
      exams = exams.filter(e => e.id !== id);
      store.set('sf_exams', exams);
      renderAll();
    });
  });
}

/* ── Settings laden ───────────────────────────────────── */
function loadSettings() {
  const s = store.get('sf_study_settings') || {
    daysOfWeek: [1, 2, 3, 4, 5],
    hoursPerDay: 2,
    weeksBeforeExam: 4,
  };

  document.getElementById('hoursInput').value = s.hoursPerDay;
  document.getElementById('weeksInput').value = s.weeksBeforeExam;

  s.daysOfWeek.forEach(d => {
    const cb = document.getElementById(`day${d}`);
    if (cb) cb.checked = true;
  });
}

/* ── Settings speichern ───────────────────────────────── */
document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  const daysOfWeek = [0, 1, 2, 3, 4, 5, 6].filter(d => {
    const cb = document.getElementById(`day${d}`);
    return cb && cb.checked;
  });

  const hoursPerDay    = parseFloat(document.getElementById('hoursInput').value) || 2;
  const weeksBeforeExam = parseInt(document.getElementById('weeksInput').value)   || 4;

  store.set('sf_study_settings', { daysOfWeek, hoursPerDay, weeksBeforeExam });

  const btn = document.getElementById('saveSettingsBtn');
  btn.textContent = 'Gespeichert ✓';
  btn.classList.add('btn-primary');
  btn.classList.remove('btn-secondary');
  setTimeout(() => {
    btn.textContent = 'Einstellungen speichern';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  }, 1500);

  renderCalendar();
});

/* ── Klausur hinzufügen ───────────────────────────────── */
document.getElementById('addExamBtn').addEventListener('click', () => {
  const subjectInput = document.getElementById('examSubject');
  const dateInput    = document.getElementById('examDate');

  const subject = subjectInput.value.trim();
  const date    = dateInput.value;

  if (!subject || !date) {
    if (!subject) subjectInput.focus();
    else dateInput.focus();
    return;
  }

  const exams = store.get('sf_exams') || [];
  exams.push({
    id: `exam_${Date.now()}`,
    subject,
    date,
  });
  store.set('sf_exams', exams);

  subjectInput.value = '';
  dateInput.value    = '';
  subjectInput.focus();

  // Zum Monat der neuen Klausur springen
  const [y, m] = date.split('-').map(Number);
  calYear  = y;
  calMonth = m - 1;

  renderAll();
});

/* ── Monats-Navigation ────────────────────────────────── */
document.getElementById('prevMonth').addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

/* ── Tag-Detail anzeigen ──────────────────────────────── */
function showDayDetail(iso, exams, settings, studyDays) {
  // Ausgewählten Tag visuell markieren
  document.querySelectorAll('.cal-day.selected').forEach(d => d.classList.remove('selected'));
  const activeDay = document.querySelector(`.cal-day[data-iso="${iso}"]`);
  if (activeDay) activeDay.classList.add('selected');

  const detail      = document.getElementById('dayDetail');
  const dateEl      = document.getElementById('dayDetailDate');
  const contentEl   = document.getElementById('dayDetailContent');
  const todayISO    = DateUtils.todayISO();

  dateEl.textContent = DateUtils.formatLong(iso);
  detail.hidden = false;

  const items = [];

  // Klausuren an diesem Tag
  const examsOnDay = exams.filter(e => e.date === iso);
  examsOnDay.forEach(e => {
    items.push({
      type: 'exam',
      text: `Klausur: ${e.subject}`,
    });
  });

  // Lerntag? Welche Klausur(en) stehen in diesem Zeitraum?
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
        items.push({
          type: 'study',
          text: `Lernen für: ${e.subject} · ${settings.hoursPerDay} Std (noch ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tage'})`,
        });
      });
    } else {
      items.push({ type: 'study', text: `Lerntag · ${settings.hoursPerDay} Stunden geplant` });
    }
  }

  if (iso === todayISO && !items.length) {
    items.push({ type: 'today', text: 'Heute – kein Lernplan für diesen Tag.' });
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

/* ── Standarddatum auf heute ──────────────────────────── */
document.getElementById('examDate').value = DateUtils.todayISO();

/* ── Alles rendern ────────────────────────────────────── */
function renderAll() {
  renderCalendar();
  renderExamSidebar();
}

loadSettings();
renderAll();
