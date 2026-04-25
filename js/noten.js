/* ═══════════════════════════════════════════════════════════
   Notenverwaltung
═══════════════════════════════════════════════════════════ */

initApp('noten');

/* ── HTML escapen ─────────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Daten laden / speichern ──────────────────────────── */
function getGrades() {
  return store.get('sf_grades') || [];
}

function saveGrades(grades) {
  store.set('sf_grades', grades);
}

/* ── Gesamtzusammenfassung ────────────────────────────── */
function renderSummary() {
  const grades = getGrades();
  const allSubjects = grades.flatMap(sem => sem.subjects || []);
  const totalEcts = allSubjects.reduce((sum, s) => sum + (Number(s.ects) || 0), 0);
  const totalSubjects = allSubjects.filter(s => s.grade).length;
  const overallAvg = GradeUtils.weightedAverage(allSubjects);

  const el = document.getElementById('gradeSummary');
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Gesamtschnitt</div>
      <div class="stat-value ${GradeUtils.gradeClass(overallAvg)}">
        ${GradeUtils.format(overallAvg)}
      </div>
      <div class="stat-sub">ECTS-gewichtet</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Semester</div>
      <div class="stat-value">${grades.length}</div>
      <div class="stat-sub">eingetragen</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Fächer benotet</div>
      <div class="stat-value">${totalSubjects}</div>
      <div class="stat-sub">von ${allSubjects.length} gesamt</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">ECTS gesamt</div>
      <div class="stat-value">${totalEcts}</div>
      <div class="stat-sub">Kreditpunkte</div>
    </div>`;
}

/* ── Semester-Liste rendern ───────────────────────────── */
function renderSemesters() {
  const grades = getGrades();
  const listEl = document.getElementById('semesterList');

  if (!grades.length) {
    listEl.innerHTML = `
      <div class="empty-state" style="padding-top: var(--sp-20)">
        <div class="empty-state-icon">📚</div>
        <p>Noch kein Semester angelegt.<br>Erstelle dein erstes Semester oben.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = grades.map((sem, semIdx) => {
    const avg = GradeUtils.weightedAverage(sem.subjects || []);
    const semEcts = (sem.subjects || []).reduce((sum, s) => sum + (Number(s.ects) || 0), 0);

    const rows = (sem.subjects || []).map((sub, subIdx) => {
      const gc = sub.grade ? GradeUtils.gradeClass(Number(sub.grade)) : '';
      return `
        <tr>
          <td class="subject-name-cell">${escapeHtml(sub.name)}</td>
          <td>
            <input class="form-input" type="number" value="${sub.grade || ''}"
                   placeholder="1,0–5,0" min="1" max="5" step="0.1" style="width:70px"
                   data-sem="${semIdx}" data-sub="${subIdx}" data-field="grade"
                   aria-label="Note für ${escapeHtml(sub.name)}" />
          </td>
          <td>
            <input class="form-input" type="number" value="${sub.ects || ''}"
                   placeholder="ECTS" min="1" max="30" step="1" style="width:70px"
                   data-sem="${semIdx}" data-sub="${subIdx}" data-field="ects"
                   aria-label="ECTS für ${escapeHtml(sub.name)}" />
          </td>
          <td>
            <button class="btn btn-danger btn-sm" data-del-sub="${semIdx},${subIdx}"
                    aria-label="${escapeHtml(sub.name)} löschen">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2.5"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="semester-block" id="sem-${semIdx}">
        <div class="semester-header" data-toggle="${semIdx}">
          <div class="semester-header-left">
            <span class="semester-name">${escapeHtml(sem.name)}</span>
            <span class="badge badge-neutral">${semEcts} ECTS · ${sem.subjects?.length || 0} Fächer</span>
          </div>
          <div style="display:flex; align-items:center; gap:var(--sp-4)">
            ${avg !== null
              ? `<span class="semester-avg ${GradeUtils.gradeClass(avg)}">${GradeUtils.format(avg)}</span>`
              : `<span class="semester-avg" style="color:var(--fg-3)">–</span>`
            }
            <button class="btn btn-danger btn-sm" data-del-sem="${semIdx}"
                    aria-label="${escapeHtml(sem.name)} löschen" style="opacity:.7">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2.5"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="semester-body">
          <table class="subjects-table">
            <thead>
              <tr>
                <th>Fach</th>
                <th>Note</th>
                <th>ECTS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${rows || `
                <tr>
                  <td colspan="4" style="text-align:center; padding: var(--sp-5); color:var(--fg-3)">
                    Noch kein Fach eingetragen.
                  </td>
                </tr>`}
            </tbody>
          </table>
          <!-- Fach hinzufügen -->
          <div class="add-subject-row">
            <input class="form-input" type="text"
                   placeholder="Fachname" maxlength="80"
                   data-new-sub-name="${semIdx}" />
            <input class="form-input narrow" type="number"
                   placeholder="Note" min="1" max="5" step="0.1"
                   data-new-sub-grade="${semIdx}" />
            <input class="form-input narrow" type="number"
                   placeholder="ECTS" min="1" max="30" step="1"
                   data-new-sub-ects="${semIdx}" />
            <button class="btn btn-secondary btn-sm" data-add-sub="${semIdx}">
              + Fach
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  attachListeners();
}

/* ── Event-Listener für dynamische Elemente ───────────── */
function attachListeners() {
  // Note / ECTS inline bearbeiten
  document.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('change', () => {
      const semIdx = parseInt(input.dataset.sem);
      const subIdx = parseInt(input.dataset.sub);
      const field  = input.dataset.field;
      const val    = input.value.trim();

      const grades = getGrades();
      if (!grades[semIdx] || !grades[semIdx].subjects[subIdx]) return;

      if (val === '') {
        grades[semIdx].subjects[subIdx][field] = '';
      } else if (field === 'grade') {
        const num = parseFloat(val.replace(',', '.'));
        grades[semIdx].subjects[subIdx][field] = (num >= 1 && num <= 5) ? num : '';
      } else {
        const num = parseInt(val);
        grades[semIdx].subjects[subIdx][field] = num > 0 ? num : '';
      }

      saveGrades(grades);
      renderSummary();
      renderSemesters();
    });
  });

  // Fach löschen
  document.querySelectorAll('[data-del-sub]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const [semIdx, subIdx] = btn.dataset.delSub.split(',').map(Number);
      const grades = getGrades();
      grades[semIdx].subjects.splice(subIdx, 1);
      saveGrades(grades);
      renderSummary();
      renderSemesters();
    });
  });

  // Semester löschen
  document.querySelectorAll('[data-del-sem]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const semIdx = parseInt(btn.dataset.delSem);
      const grades = getGrades();
      if (!confirm(`Semester "${grades[semIdx]?.name}" wirklich löschen?`)) return;
      grades.splice(semIdx, 1);
      saveGrades(grades);
      renderSummary();
      renderSemesters();
    });
  });

  // Fach hinzufügen
  document.querySelectorAll('[data-add-sub]').forEach(btn => {
    btn.addEventListener('click', () => {
      const semIdx = parseInt(btn.dataset.addSub);
      const nameInput  = document.querySelector(`[data-new-sub-name="${semIdx}"]`);
      const gradeInput = document.querySelector(`[data-new-sub-grade="${semIdx}"]`);
      const ectsInput  = document.querySelector(`[data-new-sub-ects="${semIdx}"]`);

      const name  = nameInput.value.trim();
      const grade = gradeInput.value ? parseFloat(gradeInput.value.replace(',', '.')) : '';
      const ects  = ectsInput.value  ? parseInt(ectsInput.value)  : '';

      if (!name) { nameInput.focus(); return; }

      const grades = getGrades();
      if (!grades[semIdx]) return;

      grades[semIdx].subjects.push({
        name,
        grade: (grade !== '' && grade >= 1 && grade <= 5) ? grade : '',
        ects:  (ects  !== '' && ects > 0)  ? ects  : '',
      });

      saveGrades(grades);
      renderSummary();
      renderSemesters();
    });
  });
}

/* ── Semester hinzufügen ──────────────────────────────── */
document.getElementById('addSemesterBtn').addEventListener('click', () => {
  const input = document.getElementById('semesterNameInput');
  const name  = input.value.trim();
  if (!name) { input.focus(); return; }

  const grades = getGrades();
  grades.push({ id: `sem_${Date.now()}`, name, subjects: [] });
  saveGrades(grades);
  input.value = '';

  renderSummary();
  renderSemesters();
});

document.getElementById('semesterNameInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addSemesterBtn').click();
});

/* ── Init ─────────────────────────────────────────────── */
renderSummary();
renderSemesters();
