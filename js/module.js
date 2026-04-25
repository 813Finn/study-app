/* ═══════════════════════════════════════════════════════════
   Notenverwaltung
═══════════════════════════════════════════════════════════ */

initApp('module');

// Merkt sich welche Fach-Zeilen aufgeklappt sind (Key: "semIdx-subIdx")
const expandedSubjects = new Set();
// Merkt sich welche Fach-Zeilen im Bearbeitungs-Modus sind
const editingSubjects = new Set();
// Merkt sich welche Prüfungsleistungen im Bearbeitungs-Modus sind (Key: "semIdx-subIdx-sgIdx")
const editingSgRows = new Set();

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

/* ── Wiederverwendbare SVG-Icons ──────────────────────── */
const ICON_CHEVRON = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2.5"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="9 18 15 12 9 6"/>
</svg>`;

const ICON_CROSS = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2.5"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <line x1="18" y1="6" x2="6" y2="18"/>
  <line x1="6" y1="6" x2="18" y2="18"/>
</svg>`;

const ICON_PENCIL = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2.5"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 20h9"/>
  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
</svg>`;

const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2.5"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="20 6 9 17 4 12"/>
</svg>`;

const ICON_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2.5"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="3 6 5 6 21 6"/>
  <path d="M19 6l-1 14H6L5 6"/>
  <path d="M10 11v6M14 11v6"/>
  <path d="M9 6V4h6v2"/>
</svg>`;

/* ── Gesamtzusammenfassung ────────────────────────────── */
function renderSummary() {
  const grades = getGrades();
  const allSubjects = grades.flatMap(sem => sem.subjects || []);
  const totalEcts = allSubjects.reduce((sum, s) => sum + (Number(s.ects) || 0), 0);
  const totalSubjects = allSubjects.filter(s => GradeUtils.effectiveGrade(s) !== null).length;
  const overallWeighted = GradeUtils.weightedAverage(allSubjects);
  const overallSimple   = GradeUtils.simpleAverage(allSubjects);

  document.getElementById('gradeSummary').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Gesamtschnitt</div>
      <div class="stat-value ${GradeUtils.gradeClass(overallWeighted)}">
        ${GradeUtils.format(overallWeighted)}
      </div>
      <div class="stat-sub">ECTS-gewichtet</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Gesamtschnitt</div>
      <div class="stat-value ${GradeUtils.gradeClass(overallSimple)}">
        ${GradeUtils.format(overallSimple)}
      </div>
      <div class="stat-sub">Ungewichtet (Ø)</div>
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

/* ── Teilleistungen-Panel rendern ─────────────────────── */
function renderSubGradesRow(sub, semIdx, subIdx) {
  const key        = `${semIdx}-${subIdx}`;
  const subGrades  = sub.subGrades || [];
  const isExpanded = expandedSubjects.has(key);

  const sgRows = subGrades.map((sg, sgIdx) => {
    const sgKey     = `${semIdx}-${subIdx}-${sgIdx}`;
    const sgEditing = editingSgRows.has(sgKey);

    const nameContent = sgEditing
      ? `<input class="form-input" type="text" value="${escapeHtml(sg.name)}"
                style="flex:1; min-width:0"
                data-sg-name="${semIdx},${subIdx},${sgIdx}"
                aria-label="Prüfungsname" />`
      : `<span class="sub-grade-tree-char">└</span>
         <span style="flex:1">${escapeHtml(sg.name)}</span>`;

    const sgActionBtn = sgEditing
      ? `<button class="btn btn-secondary btn-sm" data-done-sg="${semIdx},${subIdx},${sgIdx}" title="Fertig">${ICON_CHECK}</button>`
      : `<button class="btn btn-secondary btn-sm" data-edit-sg="${semIdx},${subIdx},${sgIdx}" title="Name bearbeiten">${ICON_PENCIL}</button>`;

    return `
      <div class="sg-row">
        <div class="sg-col-name">${nameContent}</div>
        <div class="sg-col-date">
          <input class="form-input" type="date" value="${sg.examDate || ''}"
                 data-sg-date="${semIdx},${subIdx},${sgIdx}"
                 aria-label="Klausurdatum für ${escapeHtml(sg.name)}" />
        </div>
        <div class="sg-col-note">
          <input class="form-input" type="number" value="${sg.grade || ''}"
                 placeholder="Note" min="1" max="5" step="0.1"
                 data-sg-sem="${semIdx}" data-sg-sub="${subIdx}" data-sg-idx="${sgIdx}"
                 aria-label="Note für ${escapeHtml(sg.name)}" />
        </div>
        <div class="sg-col-actions">
          ${sgActionBtn}
          <button class="btn btn-danger btn-sm" data-del-sg="${semIdx},${subIdx},${sgIdx}"
                  aria-label="${escapeHtml(sg.name)} löschen">${ICON_CROSS}</button>
        </div>
      </div>`;
  }).join('');

  const addRow = `
    <div class="sg-row sg-add-row">
      <div class="sg-col-name">
        <input class="form-input" type="text"
               placeholder="Prüfungsname" maxlength="80"
               data-new-sg-name="${key}" style="flex:1; min-width:0" />
      </div>
      <div class="sg-col-date">
        <input class="form-input" type="date"
               data-new-sg-date="${key}" />
      </div>
      <div class="sg-col-note">
        <input class="form-input" type="number"
               placeholder="Note" min="1" max="5" step="0.1"
               data-new-sg-grade="${key}" />
      </div>
      <div class="sg-col-actions">
        <button class="btn btn-secondary btn-sm" data-add-sg="${semIdx},${subIdx}">+ Leistung</button>
      </div>
    </div>`;

  return `
    <div class="sub-grades-row${isExpanded ? ' is-expanded' : ''}" data-subject-key="${key}">
      <div class="sub-grades-inner">
        ${sgRows}
        ${addRow}
      </div>
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

  // Neueste Semester oben – semIdx bleibt der echte Array-Index für alle Datenoperationen
  listEl.innerHTML = grades.map((sem, semIdx) => {
    const subjects = sem.subjects || [];
    const weightedAvg = GradeUtils.weightedAverage(subjects);
    const simpleAvg   = GradeUtils.simpleAverage(subjects);
    const semEcts = subjects.reduce((sum, s) => sum + (Number(s.ects) || 0), 0);

    const items = subjects.map((sub, subIdx) => {
      const key = `${semIdx}-${subIdx}`;
      const hasSubGrades = (sub.subGrades || []).length > 0;
      const effectiveGrade = GradeUtils.effectiveGrade(sub);
      const gc = effectiveGrade !== null ? GradeUtils.gradeClass(effectiveGrade) : '';
      const isExpanded = expandedSubjects.has(key);
      const isEditing  = editingSubjects.has(key);

      const gradeTitle = hasSubGrades
        ? `Ø aus ${sub.subGrades.length} Prüfungsleistung(en)`
        : 'Noch keine Prüfungsleistungen eingetragen';

      const nameCol = isEditing
        ? `<button class="expand-toggle expanded" data-toggle-sub="${key}" aria-expanded="true">
             ${ICON_CHEVRON}
           </button>
           <input class="form-input" type="text" value="${escapeHtml(sub.name)}"
                  style="flex:1; min-width:0; margin-left:var(--sp-2)"
                  data-sem="${semIdx}" data-sub="${subIdx}" data-field="name"
                  aria-label="Modulname" />`
        : `<button class="expand-toggle${isExpanded ? ' expanded' : ''}" data-toggle-sub="${key}" aria-expanded="${isExpanded}">
             ${ICON_CHEVRON}
           </button>
           <span style="margin-left:var(--sp-2)">${escapeHtml(sub.name)}</span>`;

      const noteCol = `<span class="computed-grade ${gc}" title="${gradeTitle}">
                         ${GradeUtils.format(effectiveGrade)}
                       </span>`;

      const ectsCol = isEditing
        ? `<input class="form-input" type="number" value="${sub.ects || ''}"
                  placeholder="ECTS" min="1" max="30" step="1"
                  data-sem="${semIdx}" data-sub="${subIdx}" data-field="ects"
                  aria-label="ECTS" />`
        : `<span class="ects-display">${sub.ects !== '' && sub.ects != null ? sub.ects : '–'}</span>`;

      const actionBtn = isEditing
        ? `<button class="btn btn-secondary btn-sm" data-done-sub="${key}" title="Fertig">${ICON_CHECK}</button>`
        : `<button class="btn btn-secondary btn-sm" data-edit-sub="${key}" title="Bearbeiten">${ICON_PENCIL}</button>`;

      return `
        <div class="subject-item">
          <div class="subject-row-flex">
            <div class="col-name">${nameCol}</div>
            <div class="col-note">${noteCol}</div>
            <div class="col-ects">${ectsCol}</div>
            <div class="col-actions">
              ${actionBtn}
              <button class="btn btn-danger btn-sm" data-del-sub="${semIdx},${subIdx}"
                      aria-label="${escapeHtml(sub.name)} löschen">${ICON_CROSS}</button>
            </div>
          </div>
          ${renderSubGradesRow(sub, semIdx, subIdx)}
        </div>`;
    }).join('');

    return `
      <div class="semester-block" id="sem-${semIdx}">
        <div class="semester-header" data-toggle="${semIdx}">
          <div class="semester-header-left">
            <span class="semester-name">${escapeHtml(sem.name)}</span>
            <span class="badge badge-neutral">${semEcts} ECTS · ${subjects.length} Module</span>
          </div>
          <div style="display:flex; align-items:center; gap:var(--sp-4)">
            <div class="sem-avg-block">
              <div class="sem-avg-item">
                <span class="sem-avg-label">ECTS</span>
                <span class="semester-avg ${GradeUtils.gradeClass(weightedAvg)}">${GradeUtils.format(weightedAvg)}</span>
              </div>
              <div class="sem-avg-item">
                <span class="sem-avg-label">Ø</span>
                <span class="semester-avg ${GradeUtils.gradeClass(simpleAvg)}">${GradeUtils.format(simpleAvg)}</span>
              </div>
            </div>
            <button class="btn btn-danger btn-sm" data-del-sem="${semIdx}"
                    aria-label="${escapeHtml(sem.name)} löschen" style="opacity:.7">
              ${ICON_TRASH}
            </button>
          </div>
        </div>
        <div class="semester-body">
          <div class="subjects-list">
            <div class="subjects-header">
              <div class="col-name">Modul</div>
              <div class="col-note">Note</div>
              <div class="col-ects">ECTS</div>
              <div class="col-actions"></div>
            </div>
            ${items || `<div style="text-align:center; padding:var(--sp-5); color:var(--fg-3)">
                          Noch kein Modul eingetragen.
                        </div>`}
          </div>
          <!-- Modul hinzufügen -->
          <div class="add-subject-row">
            <input class="form-input" type="text"
                   placeholder="Modulname" maxlength="80"
                   data-new-sub-name="${semIdx}" />
            <input class="form-input narrow" type="number"
                   placeholder="ECTS" min="1" max="30" step="1"
                   data-new-sub-ects="${semIdx}" />
            <button class="btn btn-secondary btn-sm" data-add-sub="${semIdx}">
              + Modul
            </button>
          </div>
        </div>
      </div>`;
  }).reverse().join('');

  attachListeners();
}

/* ── Event-Listener für dynamische Elemente ───────────── */
function attachListeners() {
  // Name / ECTS eines Moduls im Edit-Modus speichern
  document.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('change', () => {
      const semIdx = parseInt(input.dataset.sem);
      const subIdx = parseInt(input.dataset.sub);
      const field  = input.dataset.field;
      const val    = input.value.trim();
      const key    = `${semIdx}-${subIdx}`;

      const grades = getGrades();
      if (!grades[semIdx] || !grades[semIdx].subjects[subIdx]) return;

      if (field === 'name') {
        if (val) {
          const sub = grades[semIdx].subjects[subIdx];
          grades[semIdx].subjects[subIdx].name = val;
          // Exam-Einträge aller Sub-Grades umbenennen
          const exams = store.get('sf_exams') || [];
          let changed = false;
          (sub.subGrades || []).forEach(sg => {
            if (sg.examId) {
              const idx = exams.findIndex(e => e.id === sg.examId);
              if (idx !== -1) { exams[idx].subject = `${val} – ${sg.name}`; changed = true; }
            }
          });
          if (changed) store.set('sf_exams', exams);
        }
      } else if (field === 'ects') {
        const num = parseInt(val);
        grades[semIdx].subjects[subIdx].ects = (val && num > 0) ? num : '';
      }

      editingSubjects.add(key);
      saveGrades(grades);
      renderSummary();
      renderSemesters();
    });
  });

  // Name einer Prüfungsleistung speichern
  document.querySelectorAll('[data-sg-name]').forEach(input => {
    input.addEventListener('change', () => {
      const [semIdx, subIdx, sgIdx] = input.dataset.sgName.split(',').map(Number);
      const val    = input.value.trim();
      const grades = getGrades();
      const sg     = grades[semIdx]?.subjects[subIdx]?.subGrades?.[sgIdx];
      if (!sg) return;
      if (val) {
        sg.name = val;
        // Exam-Subject aktualisieren
        if (sg.examId) {
          const modName = grades[semIdx]?.subjects[subIdx]?.name || '';
          const exams   = store.get('sf_exams') || [];
          const idx     = exams.findIndex(e => e.id === sg.examId);
          if (idx !== -1) { exams[idx].subject = `${modName} – ${val}`; store.set('sf_exams', exams); }
        }
      }
      editingSgRows.add(`${semIdx}-${subIdx}-${sgIdx}`);
      expandedSubjects.add(`${semIdx}-${subIdx}`);
      saveGrades(grades);
      renderSemesters();
    });
  });

  // Datum einer Prüfungsleistung ändern
  document.querySelectorAll('[data-sg-date]').forEach(input => {
    input.addEventListener('change', () => {
      const [semIdx, subIdx, sgIdx] = input.dataset.sgDate.split(',').map(Number);
      const val    = input.value;
      const key    = `${semIdx}-${subIdx}`;
      const grades = getGrades();
      const sub    = grades[semIdx]?.subjects[subIdx];
      const sg     = sub?.subGrades?.[sgIdx];
      if (!sg) return;

      sg.examDate = val;

      const exams   = store.get('sf_exams') || [];
      if (sg.examId) {
        const idx = exams.findIndex(e => e.id === sg.examId);
        if (idx !== -1) { exams[idx].date = val; store.set('sf_exams', exams); }
      } else if (val) {
        const examId  = `exam_sg_${Date.now()}`;
        sg.examId     = examId;
        const modName = sub.name || '';
        exams.push({ id: examId, subject: `${modName} – ${sg.name}`, date: val });
        store.set('sf_exams', exams);
      }

      expandedSubjects.add(key);
      saveGrades(grades);
    });
  });

  // Note einer Teilleistung bearbeiten
  document.querySelectorAll('[data-sg-sem]').forEach(input => {
    input.addEventListener('change', () => {
      const semIdx = parseInt(input.dataset.sgSem);
      const subIdx = parseInt(input.dataset.sgSub);
      const sgIdx  = parseInt(input.dataset.sgIdx);
      const val    = input.value.trim();
      const key    = `${semIdx}-${subIdx}`;

      const grades = getGrades();
      const sub    = grades[semIdx]?.subjects[subIdx];
      if (!sub || !sub.subGrades || !sub.subGrades[sgIdx]) return;

      if (val === '') {
        sub.subGrades[sgIdx].grade = '';
      } else {
        const num = parseFloat(val.replace(',', '.'));
        sub.subGrades[sgIdx].grade = (num >= 1 && num <= 5) ? num : '';
      }

      expandedSubjects.add(key);
      saveGrades(grades);
      renderSummary();
      renderSemesters();
    });
  });

  // Fach löschen (inkl. aller Sub-Grade-Klausuren)
  document.querySelectorAll('[data-del-sub]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const [semIdx, subIdx] = btn.dataset.delSub.split(',').map(Number);
      const grades = getGrades();
      const sub    = grades[semIdx]?.subjects[subIdx];
      const sgIds  = (sub?.subGrades || []).map(sg => sg.examId).filter(Boolean);
      if (sgIds.length) {
        const exams = (store.get('sf_exams') || []).filter(e => !sgIds.includes(e.id));
        store.set('sf_exams', exams);
      }
      grades[semIdx].subjects.splice(subIdx, 1);
      expandedSubjects.clear();
      editingSubjects.clear();
      editingSgRows.clear();
      saveGrades(grades);
      renderSummary();
      renderSemesters();
    });
  });

  // Semester löschen (inkl. aller Sub-Grade-Klausuren aller Module)
  document.querySelectorAll('[data-del-sem]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const semIdx = parseInt(btn.dataset.delSem);
      const grades = getGrades();
      if (!confirm(`Semester "${grades[semIdx]?.name}" wirklich löschen?`)) return;
      const allSgIds = (grades[semIdx]?.subjects || [])
        .flatMap(s => (s.subGrades || []).map(sg => sg.examId))
        .filter(Boolean);
      if (allSgIds.length) {
        const exams = (store.get('sf_exams') || []).filter(e => !allSgIds.includes(e.id));
        store.set('sf_exams', exams);
      }
      grades.splice(semIdx, 1);
      expandedSubjects.clear();
      editingSubjects.clear();
      editingSgRows.clear();
      saveGrades(grades);
      renderSummary();
      renderSemesters();
    });
  });

  // Modul hinzufügen (kein Datum mehr nötig – kommt über Prüfungsleistungen)
  document.querySelectorAll('[data-add-sub]').forEach(btn => {
    btn.addEventListener('click', () => {
      const semIdx    = parseInt(btn.dataset.addSub);
      const nameInput = document.querySelector(`[data-new-sub-name="${semIdx}"]`);
      const ectsInput = document.querySelector(`[data-new-sub-ects="${semIdx}"]`);

      const name = nameInput.value.trim();
      const ects = ectsInput.value ? parseInt(ectsInput.value) : '';

      if (!name) { nameInput.focus(); return; }

      const grades = getGrades();
      if (!grades[semIdx]) return;

      grades[semIdx].subjects.push({
        name,
        ects:      (ects !== '' && ects > 0) ? ects : '',
        subGrades: [],
      });

      nameInput.value = '';
      ectsInput.value = '';
      saveGrades(grades);
      renderSummary();
      renderSemesters();
    });
  });

  // Teilleistung hinzufügen (mit optionalem Datum → sf_exams)
  document.querySelectorAll('[data-add-sg]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const [semIdx, subIdx] = btn.dataset.addSg.split(',').map(Number);
      const key        = `${semIdx}-${subIdx}`;
      const nameInput  = document.querySelector(`[data-new-sg-name="${key}"]`);
      const dateInput  = document.querySelector(`[data-new-sg-date="${key}"]`);
      const gradeInput = document.querySelector(`[data-new-sg-grade="${key}"]`);

      const name     = nameInput.value.trim();
      const examDate = dateInput?.value || '';
      const grade    = gradeInput.value ? parseFloat(gradeInput.value.replace(',', '.')) : '';

      if (!name) { nameInput.focus(); return; }

      const grades = getGrades();
      const sub    = grades[semIdx]?.subjects[subIdx];
      if (!sub) return;
      if (!sub.subGrades) sub.subGrades = [];

      let examId = null;
      if (examDate) {
        examId = `exam_sg_${Date.now()}`;
        const exams = store.get('sf_exams') || [];
        exams.push({ id: examId, subject: `${sub.name} – ${name}`, date: examDate });
        store.set('sf_exams', exams);
      }

      sub.subGrades.push({
        id: `sg_${Date.now()}`,
        name,
        grade:    (grade !== '' && grade >= 1 && grade <= 5) ? grade : '',
        examDate,
        examId,
      });

      nameInput.value = '';
      if (dateInput) dateInput.value = '';
      gradeInput.value = '';

      expandedSubjects.add(key);
      saveGrades(grades);
      renderSummary();
      renderSemesters();
    });
  });

  // Teilleistung löschen (inkl. Klausur aus sf_exams)
  document.querySelectorAll('[data-del-sg]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const [semIdx, subIdx, sgIdx] = btn.dataset.delSg.split(',').map(Number);
      const key    = `${semIdx}-${subIdx}`;
      const grades = getGrades();
      const sub    = grades[semIdx]?.subjects[subIdx];
      if (!sub || !sub.subGrades) return;
      const sg = sub.subGrades[sgIdx];
      if (sg?.examId) {
        const exams = (store.get('sf_exams') || []).filter(e => e.id !== sg.examId);
        store.set('sf_exams', exams);
      }
      sub.subGrades.splice(sgIdx, 1);
      editingSgRows.clear();
      if (sub.subGrades.length > 0) expandedSubjects.add(key);
      saveGrades(grades);
      renderSummary();
      renderSemesters();
    });
  });
}

/* ── Expand-Toggle + Edit-Toggle (einmalig per Event-Delegation) ── */
document.getElementById('semesterList').addEventListener('click', (e) => {
  // Aufklapp-Pfeil für Teilleistungen
  const toggleBtn = e.target.closest('[data-toggle-sub]');
  if (toggleBtn) {
    e.stopPropagation();
    const key = toggleBtn.dataset.toggleSub;
    const subRow = document.querySelector(`.sub-grades-row[data-subject-key="${key}"]`);
    if (!subRow) return;
    const isExpanded = expandedSubjects.has(key);
    if (isExpanded) {
      expandedSubjects.delete(key);
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.classList.remove('expanded');
      subRow.classList.remove('is-expanded');
    } else {
      expandedSubjects.add(key);
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.classList.add('expanded');
      subRow.classList.add('is-expanded');
    }
    return;
  }

  // Bleistift → Bearbeitungsmodus aktivieren + Zeile automatisch aufklappen
  const editBtn = e.target.closest('[data-edit-sub]');
  if (editBtn) {
    e.stopPropagation();
    const key = editBtn.dataset.editSub;
    editingSubjects.add(key);
    expandedSubjects.add(key); // Prüfungsleistungen automatisch einblenden
    renderSemesters();
    // Fokus auf Namens-Eingabe setzen
    const nameInput = document.querySelector(`[data-field="name"][data-sem="${key.split('-')[0]}"][data-sub="${key.split('-')[1]}"]`);
    if (nameInput) nameInput.focus();
    return;
  }

  // Bleistift → Prüfungsleistungs-Name bearbeiten
  const editSgBtn = e.target.closest('[data-edit-sg]');
  if (editSgBtn) {
    e.stopPropagation();
    const sgKey = editSgBtn.dataset.editSg.replace(/,/g, '-');
    const [semIdx, subIdx] = sgKey.split('-');
    editingSgRows.add(sgKey);
    expandedSubjects.add(`${semIdx}-${subIdx}`);
    renderSemesters();
    const nameInput = document.querySelector(`[data-sg-name="${editSgBtn.dataset.editSg}"]`);
    if (nameInput) nameInput.focus();
    return;
  }

  // Haken → Prüfungsleistungs-Bearbeitung beenden
  const doneSgBtn = e.target.closest('[data-done-sg]');
  if (doneSgBtn) {
    e.stopPropagation();
    const sgKey = doneSgBtn.dataset.doneSg.replace(/,/g, '-');
    const [semIdx, subIdx] = sgKey.split('-');
    editingSgRows.delete(sgKey);
    expandedSubjects.add(`${semIdx}-${subIdx}`); // Panel bleibt offen
    renderSemesters();
    return;
  }

  // Haken → Bearbeitungsmodus beenden + Prüfungsleistungen einklappen
  const doneBtn = e.target.closest('[data-done-sub]');
  if (doneBtn) {
    e.stopPropagation();
    const key = doneBtn.dataset.doneSub;
    editingSubjects.delete(key);
    expandedSubjects.delete(key);
    renderSemesters();
    return;
  }
});

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
