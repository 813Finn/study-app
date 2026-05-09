/* ═══════════════════════════════════════════════════════════
   Pomodoro-Timer
═══════════════════════════════════════════════════════════ */

/* ── Konstanten ───────────────────────────────────────── */
const CIRCUMFERENCE = 2 * Math.PI * 104; // ≈ 653.45

const PHASE_LABELS = {
  work:  'Lernphase',
  short: 'Kurze Pause',
  long:  'Lange Pause',
};

/* ── Settings laden ───────────────────────────────────── */
function loadTimerSettings() {
  return {
    workMinutes:      25,
    shortBreakMinutes: 5,
    longBreakMinutes:  15,
    cyclesBeforeLong:  4,
    ...(store.get('sf_timer_settings') || {}),
  };
}

/* ── HTML escapen ─────────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── State ────────────────────────────────────────────── */
let settings        = loadTimerSettings();
let currentPhase    = 'work';   // 'work' | 'short' | 'long'
let timeLeft        = settings.workMinutes * 60;
let totalTime       = settings.workMinutes * 60;
let isRunning       = false;
let intervalId      = null;
let cyclesDone      = 0;        // Abgeschlossene Pomodoros in diesem Zyklus
let todayKey        = DateUtils.todayISO();
let selectedSubject = '';       // Aktuell gewähltes Fach (leer = kein Fach)
let timerInitialized = false;

/* ── Minuten lesbar formatieren ───────────────────────── */
function formatMins(mins) {
  if (mins <= 0) return '0 Min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} Std ${m} Min`;
  if (h > 0)          return `${h} Std`;
  return `${m} Min`;
}

/* ── Geplante Minuten für ein Fach heute ──────────────── */
function getPlannedMinsForSubject(subject) {
  const exams      = store.get('sf_exams') || [];
  const examPlans  = store.get('sf_exam_plans') || {};
  const todayISO   = DateUtils.todayISO();
  const todayDow   = new Date().getDay();
  const exam = exams.find(e => e.subject === subject && e.date >= todayISO);
  if (!exam) return 0;
  const plan = examPlans[exam.id];
  if (!plan || !plan.weeklyHours) return 0;
  return (plan.weeklyHours[todayDow] || 0) * 60;
}

/* ── Verbleibende Zeit für gewähltes Fach anzeigen ────── */
function renderSubjectProgress() {
  const el = document.getElementById('subjectProgress');
  if (!el) return;

  if (!selectedSubject) {
    el.style.display = 'none';
    el.classList.remove('done');
    return;
  }

  const plannedMins   = getPlannedMinsForSubject(selectedSubject);
  const stats         = getTodayStats();
  const studiedMins   = (stats.bySubject && stats.bySubject[selectedSubject]) || 0;
  const remainingMins = Math.max(0, plannedMins - studiedMins);

  el.style.display = 'block';

  if (remainingMins === 0) {
    el.classList.add('done');
    el.textContent = `✓ Heute erledigt (${formatMins(studiedMins)} gelernt)`;
  } else {
    el.classList.remove('done');
    el.textContent = `Noch ${formatMins(remainingMins)} für heute`;
  }
}

/* ── Fach-Selector befüllen ───────────────────────────── */
function renderSubjectSelector() {
  const sel = document.getElementById('subjectSelect');
  if (!sel) return;

  const exams      = store.get('sf_exams') || [];
  const examPlans  = store.get('sf_exam_plans') || {};
  const todayISO   = DateUtils.todayISO();
  const todayDow   = new Date().getDay();

  // Nur Fächer mit Lernzeit für heute
  const todaySubjects = exams
    .filter(e => {
      if (e.date < todayISO) return false;
      const plan = examPlans[e.id];
      return plan && plan.weeklyHours && (plan.weeklyHours[todayDow] || 0) > 0;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  sel.innerHTML = `<option value="">– Kein Fach ausgewählt –</option>` +
    todaySubjects.map(e =>
      `<option value="${escapeHtml(e.subject)}">${escapeHtml(e.subject)} (${DateUtils.formatShort(e.date)})</option>`
    ).join('');

  // Vorab-Auswahl wiederherstellen (aus URL-Param oder gespeichertem Wert)
  if (selectedSubject) sel.value = selectedSubject;
}

/* ── Tageszähler ──────────────────────────────────────── */
function getTodayStats() {
  todayKey = DateUtils.todayISO(); // Tageswechsel auch bei offener Seite erkennen
  const saved = store.get('sf_today_stats');
  if (!saved || saved.date !== todayKey) {
    return { date: todayKey, pomodoros: 0, focusMinutes: 0, bySubject: {} };
  }
  if (!saved.bySubject) saved.bySubject = {};
  return saved;
}

function saveTodayStats(stats) {
  store.set('sf_today_stats', stats);
  // Kumulierte History für die Semester-Lernzeit-Ansicht im Dashboard
  const history = store.get('sf_study_history') || {};
  history[stats.date] = { ...(stats.bySubject || {}) };
  store.set('sf_study_history', history);
}

function renderTodayStats() {
  const stats = getTodayStats();
  document.getElementById('statPomodoros').textContent = stats.pomodoros;
  const h = Math.floor(stats.focusMinutes / 60);
  const m = stats.focusMinutes % 60;
  document.getElementById('statFocusTime').textContent =
    h > 0 ? `${h} h ${m} Min` : `${m} Min`;
  renderModuleTimeCard();
}

function renderModuleTimeCard() {
  const card  = document.getElementById('moduleTimeCard');
  const label = document.getElementById('moduleTimeLabel');
  const value = document.getElementById('moduleTimeValue');
  if (!card) return;

  if (!selectedSubject) {
    card.hidden = true;
    return;
  }

  // Modulname = Teil vor " – " (z.B. "Analysis – Klausur" → "Analysis")
  const moduleName = selectedSubject.includes(' – ')
    ? selectedSubject.split(' – ')[0]
    : selectedSubject;

  // Alle Teilleistungen dieses Moduls aus heutigen Stats summieren
  const bySubject  = getTodayStats().bySubject || {};
  const moduleMins = Object.entries(bySubject)
    .filter(([key]) => key === selectedSubject || key.startsWith(moduleName + ' – '))
    .reduce((sum, [, mins]) => sum + mins, 0);

  label.textContent = `Lernzeit heute für ${moduleName}`;
  value.textContent = moduleMins > 0 ? formatMins(moduleMins) : '0 Min';
  card.hidden = false;
}

/* ── Zeitanzeige ──────────────────────────────────────── */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ── SVG-Ring aktualisieren ───────────────────────────── */
function updateRing() {
  const progress = totalTime > 0 ? timeLeft / totalTime : 1;
  const offset   = CIRCUMFERENCE * (1 - progress);
  document.getElementById('timerRing').style.strokeDashoffset = offset;
}

/* ── Zyklus-Dots ──────────────────────────────────────── */
function renderCycleDots() {
  const dotsEl = document.getElementById('cycleDots');
  dotsEl.innerHTML = Array.from({ length: settings.cyclesBeforeLong }, (_, i) =>
    `<div class="cycle-dot ${i < cyclesDone ? 'done' : ''}" aria-hidden="true"></div>`
  ).join('');
}

/* ── Vollständige UI aktualisieren ────────────────────── */
function updateUI() {
  document.getElementById('timerDisplay').textContent    = formatTime(timeLeft);
  document.getElementById('timerPhaseLabel').textContent = PHASE_LABELS[currentPhase];

  const isBreak = currentPhase !== 'work';
  const ring    = document.getElementById('timerRing');
  const playBtn = document.getElementById('playPauseBtn');

  ring.classList.toggle('break-mode', isBreak);
  playBtn.classList.toggle('break-mode', isBreak);

  // Play/Pause-Icon tauschen
  document.getElementById('iconPlay').style.display  = isRunning ? 'none'  : 'block';
  document.getElementById('iconPause').style.display = isRunning ? 'block' : 'none';

  playBtn.setAttribute('aria-label', isRunning ? 'Pausieren' : 'Starten');

  // Dokument-Titel (nur wenn Timer-Seite sichtbar)
  if (!document.getElementById('page-timer')?.hidden) {
    document.title = `${formatTime(timeLeft)} – ${PHASE_LABELS[currentPhase]}`;
  }

  // Phase-Tabs
  document.querySelectorAll('.phase-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.phase === currentPhase);
  });

  updateRing();
  renderCycleDots();
}

/* ── Ton-Signal (Web Audio API) ───────────────────────── */
function playBeep(type = 'work') {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'work') {
      // Höherer, kräftiger Ton: Lernphase beginnt
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.30, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.7);
    } else {
      // Weicherer, tiefer Ton: Pause beginnt
      osc.frequency.value = 528;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.20, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.0);
    }
  } catch {
    // Audio nicht verfügbar → still ignorieren
  }
}

/* ── Browser-Notification ─────────────────────────────── */
function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '' });
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/* ── Phase abschließen → nächste Phase starten ────────── */
function nextPhase() {
  stopTimer();

  if (currentPhase === 'work') {
    // Pomodoro fertig
    cyclesDone++;
    const stats = getTodayStats();
    stats.pomodoros++;
    stats.focusMinutes += settings.workMinutes;
    // Minuten dem gewählten Fach gutschreiben
    if (selectedSubject) {
      if (!stats.bySubject) stats.bySubject = {};
      stats.bySubject[selectedSubject] = (stats.bySubject[selectedSubject] || 0) + settings.workMinutes;
    }
    saveTodayStats(stats);
    renderTodayStats();
    renderSubjectProgress();

    if (cyclesDone >= settings.cyclesBeforeLong) {
      cyclesDone = 0;
      switchToPhase('long');
      playBeep('break');
      sendNotification('Lange Pause!', `Du hast ${settings.cyclesBeforeLong} Pomodoros geschafft. Zeit für eine längere Pause.`);
    } else {
      switchToPhase('short');
      playBeep('break');
      sendNotification('Kurze Pause!', `Pomodoro ${cyclesDone} abgeschlossen. ${settings.cyclesBeforeLong - cyclesDone} bis zur langen Pause.`);
    }
  } else {
    // Pause vorbei → zurück zum Lernen
    switchToPhase('work');
    playBeep('work');
    sendNotification('Lernphase!', 'Pause vorbei – zurück an die Bücher!');
  }

  renderCycleDots();
  renderTodayStats();
}

/* ── Phase wechseln ───────────────────────────────────── */
function switchToPhase(phase) {
  currentPhase = phase;

  if (phase === 'work')  totalTime = settings.workMinutes       * 60;
  if (phase === 'short') totalTime = settings.shortBreakMinutes * 60;
  if (phase === 'long')  totalTime = settings.longBreakMinutes  * 60;

  timeLeft  = totalTime;
  isRunning = false;
  updateUI();
}

/* ── Timer-Tick ───────────────────────────────────────── */
function tick() {
  if (timeLeft <= 0) {
    nextPhase();
    return;
  }
  timeLeft--;
  updateUI();
}

/* ── Start / Stop ─────────────────────────────────────── */
function startTimer() {
  if (isRunning) return;
  if (currentPhase === 'work' && !selectedSubject) {
    const wrap = document.querySelector('.subject-selector');
    document.getElementById('subjectHint').hidden = false;
    wrap.classList.remove('shake');
    void wrap.offsetWidth; // reflow zum Neustart der Animation
    wrap.classList.add('shake');
    wrap.addEventListener('animationend', () => wrap.classList.remove('shake'), { once: true });
    return;
  }
  isRunning  = true;
  intervalId = setInterval(tick, 1000);
  updateUI();
  requestNotificationPermission();
}

function stopTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(intervalId);
  intervalId = null;
  updateUI();
}

function toggleTimer() {
  isRunning ? stopTimer() : startTimer();
}

function resetTimer() {
  stopTimer();
  timeLeft  = totalTime;
  isRunning = false;
  updateUI();
}

/* ── Event-Listener ───────────────────────────────────── */
document.getElementById('playPauseBtn').addEventListener('click', toggleTimer);

document.getElementById('resetBtn').addEventListener('click', resetTimer);

document.getElementById('skipBtn').addEventListener('click', () => {
  stopTimer();
  nextPhase();
});

// Phase-Tab manuell wählen
document.querySelectorAll('.phase-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    stopTimer();
    switchToPhase(tab.dataset.phase);
  });
});

// Tastatur-Shortcut: Leertaste = Play/Pause (nur wenn Timer-Seite aktiv)
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target === document.body) {
    if (document.getElementById('page-timer')?.hidden) return;
    e.preventDefault();
    toggleTimer();
  }
});

/* ── Einstellungen ────────────────────────────────────── */
document.getElementById('settingsToggle').addEventListener('click', () => {
  const body    = document.getElementById('settingsBody');
  const toggle  = document.getElementById('settingsToggle');
  const isOpen  = body.classList.toggle('open');
  toggle.setAttribute('aria-expanded', isOpen);
});

document.getElementById('applySettings').addEventListener('click', () => {
  const work   = parseInt(document.getElementById('setWork').value)   || 25;
  const short_ = parseInt(document.getElementById('setShort').value)  || 5;
  const long_  = parseInt(document.getElementById('setLong').value)   || 15;
  const cycles = parseInt(document.getElementById('setCycles').value) || 4;

  settings = {
    workMinutes:       Math.max(1, Math.min(120, work)),
    shortBreakMinutes: Math.max(1, Math.min(60,  short_)),
    longBreakMinutes:  Math.max(1, Math.min(120, long_)),
    cyclesBeforeLong:  Math.max(2, Math.min(8,   cycles)),
  };
  store.set('sf_timer_settings', settings);

  // Timer zurücksetzen auf neue Werte
  stopTimer();
  switchToPhase(currentPhase);
  renderCycleDots();

  const btn = document.getElementById('applySettings');
  btn.textContent = 'Übernommen ✓';
  setTimeout(() => { btn.textContent = 'Übernehmen'; }, 1500);
});

// Fach-Selektor Änderung
document.getElementById('subjectSelect').addEventListener('change', (e) => {
  selectedSubject = e.target.value;
  if (selectedSubject) document.getElementById('subjectHint').hidden = true;
  renderSubjectProgress();
  renderModuleTimeCard();
});

/* ── Init ─────────────────────────────────────────────── */
function initPage_timer(params = {}) {
  if (!timerInitialized) {
    settings  = loadTimerSettings();
    timeLeft  = settings.workMinutes * 60;
    totalTime = settings.workMinutes * 60;

    document.getElementById('setWork').value   = settings.workMinutes;
    document.getElementById('setShort').value  = settings.shortBreakMinutes;
    document.getElementById('setLong').value   = settings.longBreakMinutes;
    document.getElementById('setCycles').value = settings.cyclesBeforeLong;

    switchToPhase('work');
    timerInitialized = true;
  }

  if (params.subject) selectedSubject = params.subject;
  renderSubjectSelector();
  renderSubjectProgress();
  renderTodayStats();
  renderModuleTimeCard();
}
