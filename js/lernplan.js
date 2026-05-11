/* ═══════════════════════════════════════════════════════════
   Lernplan – Pro-Prüfungs-Planung
═══════════════════════════════════════════════════════════ */

const DAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mo–So

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatHours(minutes) {
  if (minutes <= 0) return '0h';
  const h = minutes / 60;
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
}

/* ── Gelernte Minuten für eine Prüfung (exam.subject als Key) ── */
function getStudiedMinutes(examSubject) {
  const history  = store.get('sf_study_history') || {};
  const todayKey = DateUtils.todayISO();
  const todaySt  = store.get('sf_today_stats');

  let total = 0;
  for (const dayData of Object.values(history)) {
    total += dayData[examSubject] || 0;
  }

  if (todaySt && todaySt.date === todayKey && !(todayKey in history)) {
    total += (todaySt.bySubject && todaySt.bySubject[examSubject]) || 0;
  }

  return total;
}

/* ── Geplante Minuten ab heute bis Klausurtag ───────────── */
function computeRemainingMinutes(weeklyHours, examDate) {
  const examD = DateUtils.fromISO(examDate);
  const cur   = new Date(DateUtils.today());

  let total = 0;
  while (cur < examD) {
    const h = weeklyHours[cur.getDay()];
    if (h) total += h * 60;
    cur.setDate(cur.getDate() + 1);
  }
  return total;
}

/* ── Wochentag-Zeile ────────────────────────────────────── */
function renderWeekdayRow(examId, weeklyHours) {
  return DAYS_ORDER.map(dow => {
    const active  = dow in weeklyHours;
    const hours   = weeklyHours[dow] || 1;
    const inputId = `day-${examId}-${dow}`;
    return `
      <div class="weekday-item">
        <label class="weekday-item-label" for="${inputId}">${DAYS_SHORT[dow]}</label>
        <input type="checkbox" class="day-cb" id="${inputId}"
               data-dow="${dow}" ${active ? 'checked' : ''} />
        <input type="number" class="form-input weekday-hours"
               data-dow="${dow}" value="${hours}"
               min="0.5" max="12" step="0.5"
               style="visibility:${active ? 'visible' : 'hidden'}" />
      </div>`;
  }).join('');
}

/* ── Eine Prüfungs-Karte rendern ────────────────────────── */
function renderExamCard(exam, plan, animIdx) {
  const days        = DateUtils.diffDays(exam.date);
  const weeklyHours = (plan && plan.weeklyHours) ? plan.weeklyHours : {};
  const hasPlan     = Object.keys(weeklyHours).length > 0;

  const studiedMins   = getStudiedMinutes(exam.subject);
  const remainingMins = hasPlan ? computeRemainingMinutes(weeklyHours, exam.date) : 0;
  const totalMins     = studiedMins + remainingMins;
  const pct           = totalMins > 0 ? Math.round(studiedMins / totalMins * 100) : 0;

  const todayDow       = new Date().getDay();
  const todayPlannedH  = weeklyHours[todayDow] || 0;
  const todaySt        = store.get('sf_today_stats');
  const todayKey       = DateUtils.todayISO();
  const todayStudiedM  = (todaySt && todaySt.date === todayKey && todaySt.bySubject)
    ? (todaySt.bySubject[exam.subject] || 0) : 0;

  const daysLabel = days <= 0 ? 'Heute' : days === 1 ? 'Morgen' : `${days} Tage`;

  let progressHTML = '';
  if (hasPlan) {
    if (remainingMins > 0) {
      progressHTML = `
        <div class="today-plan-info">
          <div class="plan-stat-val">${formatHours(remainingMins)}</div>
          <div class="plan-stat-label">noch bis zur<br>Prüfung geplant</div>
        </div>`;
    } else {
      progressHTML = `
        <div class="today-plan-info done">
          <div class="plan-stat-val">✓</div>
          <div class="plan-stat-label">Alle geplanten Einheiten<br>abgeschlossen</div>
        </div>`;
    }
  }
  const noPlanHint = !hasPlan
    ? `<p class="no-plan-hint">Noch kein Lernplan – wähle deine Lerntage unten.</p>` : '';

  return `
    <div class="card anim-up-${animIdx}" data-exam-id="${escapeHtml(exam.id)}">
      <div class="card-header">
        <div>
          <div class="card-title">${escapeHtml(exam.subject)}</div>
          <div class="card-subtitle">${DateUtils.formatShort(exam.date)} · ${daysLabel}</div>
        </div>
      </div>
      ${noPlanHint}
      ${progressHTML}
      <div class="form-group">
        <label class="form-label">Wochentage &amp; Stunden</label>
        <div class="weekday-row">${renderWeekdayRow(exam.id, weeklyHours)}</div>
      </div>
      <div class="plan-save-row">
        <button class="btn btn-primary save-plan-btn">Speichern</button>
      </div>
    </div>`;
}

/* ── Event-Listener für Karten ──────────────────────────── */
function attachCardListeners(container) {
  container.querySelectorAll('.day-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const hoursInput = cb.closest('.weekday-item').querySelector('.weekday-hours');
      hoursInput.style.visibility = cb.checked ? 'visible' : 'hidden';
    });
  });

  container.querySelectorAll('.save-plan-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card   = btn.closest('[data-exam-id]');
      const examId = card.dataset.examId;
      const weeklyHours = {};

      card.querySelectorAll('.day-cb').forEach(cb => {
        if (cb.checked) {
          const dow        = parseInt(cb.dataset.dow);
          const hoursInput = cb.closest('.weekday-item').querySelector('.weekday-hours');
          weeklyHours[dow] = parseFloat(hoursInput.value) || 1;
        }
      });

      const plans    = store.get('sf_exam_plans') || {};
      plans[examId]  = { weeklyHours };
      store.set('sf_exam_plans', plans);

      btn.textContent = 'Gespeichert ✓';
      btn.disabled    = true;
      setTimeout(() => render(), 1500);
    });
  });
}

/* ── Wochenstatistik ────────────────────────────────────── */
function renderWeeklyStats(exams, plans) {
  const totals = {};
  DAYS_ORDER.forEach(dow => { totals[dow] = 0; });

  exams.forEach(exam => {
    const wh = (plans[exam.id] && plans[exam.id].weeklyHours) || {};
    Object.entries(wh).forEach(([dow, h]) => {
      totals[parseInt(dow)] += h;
    });
  });

  const max    = Math.max(...Object.values(totals));
  const hasAny = max > 0;

  const el = document.getElementById('weeklyStats');
  if (!hasAny) { el.innerHTML = ''; return; }

  const safeMax = max || 1;
  const cols = DAYS_ORDER.map(dow => {
    const h   = totals[dow];
    const pct = Math.round(h / safeMax * 100);
    const val = h === 0 ? '–' : (h % 1 === 0 ? `${h}h` : `${h.toFixed(1).replace('.', ',')}h`);
    return `
      <div class="ws-col${h === 0 ? ' ws-col--empty' : ''}">
        <div class="ws-bar-wrap">
          <div class="ws-bar" style="height:${h === 0 ? 3 : Math.max(pct, 6)}%"></div>
        </div>
        <div class="ws-day">${DAYS_SHORT[dow]}</div>
        <div class="ws-val">${val}</div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="card" style="margin-bottom:var(--sp-4)">
      <div class="ws-title">Geplante Stunden pro Wochentag</div>
      <div class="ws-grid">${cols}</div>
    </div>`;
}

/* ── Hauptrender ────────────────────────────────────────── */
function render() {
  const todayISO = DateUtils.todayISO();
  const exams    = (store.get('sf_exams') || [])
    .filter(e => e.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date));

  const plans     = store.get('sf_exam_plans') || {};
  const container = document.getElementById('examPlansList');

  renderWeeklyStats(exams, plans);

  if (!exams.length) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <p>Keine anstehenden Prüfungen. Trage Klausurdaten auf der <a href="#module">Modul-Seite</a> ein.</p>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = exams
    .map((exam, i) => renderExamCard(exam, plans[exam.id], Math.min(i + 2, 6)))
    .join('');

  attachCardListeners(container);
}

/* ── Init ─────────────────────────────────────────────── */
function initPage_lernplan() {
  render();
}
