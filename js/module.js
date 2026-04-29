/* ═══════════════════════════════════════════════════════════
   Notenverwaltung
═══════════════════════════════════════════════════════════ */

initApp('module');

// Merkt sich welche Semester zugeklappt sind
const collapsedSemesters = new Set();
// Merkt sich welche Fach-Zeilen aufgeklappt sind (Key: "semIdx-subIdx")
const expandedSubjects = new Set();
// Merkt sich welche Fach-Zeilen im Bearbeitungs-Modus sind
const editingSubjects = new Set();
// Merkt sich welche Prüfungsleistungen im Bearbeitungs-Modus sind (Key: "semIdx-subIdx-sgIdx")
const editingSgRows = new Set();

/* ── Bestätigungs-Dialog ──────────────────────────────── */
function showDeleteConfirm(message, onConfirm) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop open';
  backdrop.innerHTML = `
    <div class="modal" style="max-width:380px">
      <div class="modal-header">
        <h2 class="modal-title" style="font-size:var(--text-lg)">Löschen bestätigen</h2>
      </div>
      <div class="modal-body">
        <p style="margin:0; font-size:var(--text-sm); color:var(--fg-2); line-height:1.6">${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="_confirmCancel">Abbrechen</button>
        <button class="btn btn-danger"    id="_confirmOk">Löschen</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.querySelector('#_confirmOk').addEventListener('click', () => { close(); onConfirm(); });
  backdrop.querySelector('#_confirmCancel').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
}

/* ── Formular-Modal (generisch für alle "Anlegen"-Dialoge) */
function showFormModal({ title, fields, submitLabel, onSubmit }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop open';

  const fieldsHTML = fields.map(f => {
    const optional = !f.required
      ? `<span style="color:var(--fg-3);font-weight:400"> (optional)</span>` : '';
    return `
      <div class="form-group">
        <label class="form-label" for="_mf_${f.id}">${f.label}${optional}</label>
        <input class="form-input" type="${f.type}" id="_mf_${f.id}"
               ${f.placeholder != null ? `placeholder="${f.placeholder}"` : ''}
               ${f.min         != null ? `min="${f.min}"`                 : ''}
               ${f.max         != null ? `max="${f.max}"`                 : ''}
               ${f.step        != null ? `step="${f.step}"`               : ''}
               ${f.maxlength   != null ? `maxlength="${f.maxlength}"`     : ''}
               autocomplete="off" />
      </div>`;
  }).join('');

  backdrop.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
      </div>
      <div class="modal-body">${fieldsHTML}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="_mfCancel">Abbrechen</button>
        <button class="btn btn-primary"   id="_mfSubmit">${submitLabel || 'Hinzufügen'}</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  setTimeout(() => { backdrop.querySelector('.form-input')?.focus(); }, 60);

  const close = () => backdrop.remove();

  const submit = () => {
    const values = {};
    for (const f of fields) {
      const input = backdrop.querySelector(`#_mf_${f.id}`);
      const val   = input.value.trim();
      if (f.required && !val) { input.focus(); return; }
      values[f.id] = val;
    }
    close();
    onSubmit(values);
  };

  backdrop.querySelector('#_mfSubmit').addEventListener('click', submit);
  backdrop.querySelector('#_mfCancel').addEventListener('click', close);
  backdrop.querySelectorAll('.form-input').forEach(inp =>
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); })
  );
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
}

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

    const hasGrade = sg.grade !== '' && sg.grade != null;
    const dateContent = sgEditing
      ? `<input class="form-input" type="date" value="${sg.examDate || ''}"
               data-sg-date="${semIdx},${subIdx},${sgIdx}"
               aria-label="Klausurdatum für ${escapeHtml(sg.name)}" />`
      : `<span class="sg-static">${sg.examDate ? DateUtils.formatShort(sg.examDate) : '–'}</span>`;

    const gradeContent = sgEditing
      ? `<input class="form-input" type="number" value="${sg.grade || ''}"
               placeholder="Note" min="1" max="5" step="0.1"
               data-sg-sem="${semIdx}" data-sg-sub="${subIdx}" data-sg-idx="${sgIdx}"
               aria-label="Note für ${escapeHtml(sg.name)}" />`
      : `<span class="sg-static${hasGrade ? ' sg-grade ' + GradeUtils.gradeClass(Number(sg.grade)) : ''}">${hasGrade ? GradeUtils.format(Number(sg.grade)) : '–'}</span>`;

    return `
      <div class="sg-row">
        <div class="sg-col-name">${nameContent}</div>
        <div class="sg-col-date">${dateContent}</div>
        <div class="sg-col-note">${gradeContent}</div>
        <div class="sg-col-actions">
          ${sgActionBtn}
          <button class="btn btn-danger btn-sm" data-del-sg="${semIdx},${subIdx},${sgIdx}"
                  aria-label="${escapeHtml(sg.name)} löschen">${ICON_CROSS}</button>
        </div>
      </div>`;
  }).join('');

  const addRow = `
    <div class="add-item-row">
      <button class="btn btn-secondary btn-sm" data-add-sg="${semIdx},${subIdx}">+ Neue Prüfungsleistung</button>
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
    const subjects    = sem.subjects || [];
    const weightedAvg = GradeUtils.weightedAverage(subjects);
    const simpleAvg   = GradeUtils.simpleAverage(subjects);
    const semEcts     = subjects.reduce((sum, s) => sum + (Number(s.ects) || 0), 0);
    const isCollapsed = collapsedSemesters.has(semIdx);

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
        <div class="semester-header" data-toggle="${semIdx}" aria-expanded="${!isCollapsed}">
          <div class="semester-header-left">
            <span class="semester-chevron${isCollapsed ? '' : ' expanded'}" aria-hidden="true">${ICON_CHEVRON}</span>
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
        <div class="semester-body${isCollapsed ? ' is-collapsed' : ''}">
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
          <div class="add-item-row">
            <button class="btn btn-secondary btn-sm" data-add-sub="${semIdx}">+ Neues Modul</button>
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
      showDeleteConfirm(
        `Modul <strong>${escapeHtml(sub?.name || '')}</strong> wirklich löschen?<br>Alle Prüfungsleistungen werden ebenfalls entfernt.`,
        () => {
          const sgIds = (sub?.subGrades || []).map(sg => sg.examId).filter(Boolean);
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
        }
      );
    });
  });

  // Semester löschen (inkl. aller Sub-Grade-Klausuren aller Module)
  document.querySelectorAll('[data-del-sem]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const semIdx = parseInt(btn.dataset.delSem);
      const grades = getGrades();
      showDeleteConfirm(
        `Semester <strong>${escapeHtml(grades[semIdx]?.name || '')}</strong> wirklich löschen?<br>Alle Module und Prüfungsleistungen werden entfernt.`,
        () => {
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
        }
      );
    });
  });

  // Modul hinzufügen
  document.querySelectorAll('[data-add-sub]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const semIdx = parseInt(btn.dataset.addSub);
      showFormModal({
        title: 'Neues Modul',
        fields: [
          { id: 'name', label: 'Modulname', type: 'text', placeholder: 'z.B. Analysis I', required: true, maxlength: 80 },
          { id: 'ects', label: 'ECTS', type: 'number', placeholder: 'z.B. 6', required: false, min: 1, max: 30, step: 1 },
        ],
        submitLabel: 'Modul hinzufügen',
        onSubmit: ({ name, ects }) => {
          const grades = getGrades();
          if (!grades[semIdx]) return;
          const ectsNum = ects ? parseInt(ects) : '';
          grades[semIdx].subjects.push({
            name,
            ects:      (ectsNum !== '' && ectsNum > 0) ? ectsNum : '',
            subGrades: [],
          });
          saveGrades(grades);
          renderSummary();
          renderSemesters();
        },
      });
    });
  });

  // Teilleistung hinzufügen
  document.querySelectorAll('[data-add-sg]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const [semIdx, subIdx] = btn.dataset.addSg.split(',').map(Number);
      const key = `${semIdx}-${subIdx}`;
      showFormModal({
        title: 'Neue Prüfungsleistung',
        fields: [
          { id: 'name',  label: 'Prüfungsname', type: 'text',   placeholder: 'z.B. Klausur WS 24/25', required: true, maxlength: 80 },
          { id: 'date',  label: 'Klausurdatum', type: 'date',   required: false },
          { id: 'grade', label: 'Note',          type: 'number', placeholder: 'z.B. 1,7', required: false, min: 1, max: 5, step: 0.1 },
        ],
        submitLabel: 'Prüfungsleistung hinzufügen',
        onSubmit: ({ name, date, grade }) => {
          const grades = getGrades();
          const sub    = grades[semIdx]?.subjects[subIdx];
          if (!sub) return;
          if (!sub.subGrades) sub.subGrades = [];

          let examId = null;
          if (date) {
            examId = `exam_sg_${Date.now()}`;
            const exams = store.get('sf_exams') || [];
            exams.push({ id: examId, subject: `${sub.name} – ${name}`, date });
            store.set('sf_exams', exams);
          }

          const gradeNum = grade ? parseFloat(grade.replace(',', '.')) : '';
          sub.subGrades.push({
            id:       `sg_${Date.now()}`,
            name,
            grade:    (gradeNum !== '' && gradeNum >= 1 && gradeNum <= 5) ? gradeNum : '',
            examDate: date || '',
            examId,
          });

          expandedSubjects.add(key);
          saveGrades(grades);
          renderSummary();
          renderSemesters();
        },
      });
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
      showDeleteConfirm(
        `Prüfungsleistung <strong>${escapeHtml(sg?.name || '')}</strong> wirklich löschen?`,
        () => {
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
        }
      );
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

  // Semester-Header → auf-/zuklappen
  const semHeader = e.target.closest('[data-toggle]');
  if (semHeader) {
    e.stopPropagation();
    const semIdx = parseInt(semHeader.dataset.toggle);
    if (collapsedSemesters.has(semIdx)) {
      collapsedSemesters.delete(semIdx);
    } else {
      collapsedSemesters.add(semIdx);
    }
    renderSemesters();
    return;
  }
});

/* ── Semester hinzufügen ──────────────────────────────── */
document.getElementById('addSemesterBtn').addEventListener('click', () => {
  showFormModal({
    title: 'Neues Semester',
    fields: [
      { id: 'name', label: 'Semestername', type: 'text', placeholder: 'z.B. WS 24/25 oder SoSe 25', required: true, maxlength: 40 },
    ],
    submitLabel: 'Semester anlegen',
    onSubmit: ({ name }) => {
      const grades = getGrades();
      grades.push({ id: `sem_${Date.now()}`, name, subjects: [] });
      saveGrades(grades);
      renderSummary();
      renderSemesters();
    },
  });
});

/* ── Init ─────────────────────────────────────────────── */
renderSummary();
renderSemesters();
