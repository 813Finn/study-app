/* ═══════════════════════════════════════════════════════════
   Lernplan – Einstellungen
═══════════════════════════════════════════════════════════ */

initApp('lernplan');

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

  const hoursPerDay     = parseFloat(document.getElementById('hoursInput').value) || 2;
  const weeksBeforeExam = parseInt(document.getElementById('weeksInput').value)   || 4;

  store.set('sf_study_settings', { daysOfWeek, hoursPerDay, weeksBeforeExam });

  const btn = document.getElementById('saveSettingsBtn');
  btn.textContent = 'Gespeichert ✓';
  setTimeout(() => { btn.textContent = 'Einstellungen speichern'; }, 1500);
});

/* ── Init ─────────────────────────────────────────────── */
loadSettings();
