/* ═══════════════════════════════════════════════════════════
   Globale App-Logik
   Läuft auf jeder Seite: Theme, Navbar, Profil, localStorage
═══════════════════════════════════════════════════════════ */

/* ── localStorage Helpers ─────────────────────────────── */
const store = {
  get(key) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    syncKey(key, value).catch(console.error);
  },
  remove(key) {
    localStorage.removeItem(key);
    removeKey(key).catch(console.error);
  },
};

/* ── Theme ────────────────────────────────────────────── */
function getInitialTheme() {
  const saved = store.get('sf_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  store.set('sf_theme', theme);

  const btnDark  = document.getElementById('btnDark');
  const btnLight = document.getElementById('btnLight');
  if (btnDark)  btnDark.classList.toggle('active',  theme === 'dark');
  if (btnLight) btnLight.classList.toggle('active', theme === 'light');
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* ── Profil ───────────────────────────────────────────── */
function getProfile() {
  return store.get('sf_profile') || { name: '' };
}

function saveProfile(profile) {
  store.set('sf_profile', profile);
}

function getFirstLetter(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

/* ── Navbar HTML ──────────────────────────────────────── */
function buildNavbarHTML(activePage) {
  const pages = [
    { key: 'dashboard', href: 'index.html',    label: 'Dashboard' },
    { key: 'lernplan',  href: 'lernplan.html', label: 'Lernplan'  },
    { key: 'module',    href: 'module.html',   label: 'Module'    },
    { key: 'timer',     href: 'timer.html',    label: 'Timer'     },
  ];

  const linksHTML = pages
    .map(p => `
      <a href="${p.href}" class="nav-link${p.key === activePage ? ' active' : ''}" data-page="${p.key}">
        ${p.label}
      </a>`)
    .join('');

  return `
    <nav class="navbar" id="navbar">
      <div class="navbar-inner">
        <div class="navbar-brand"></div>
        <div class="navbar-links">${linksHTML}</div>
        <div class="navbar-actions">
          <div class="profile-wrapper" id="profileWrapper">
            <button class="profile-btn" id="profileBtn" aria-expanded="false" aria-haspopup="true">
              <span class="profile-avatar" id="profileAvatar">?</span>
              <span class="profile-name"   id="profileNameEl">Profil</span>
              <svg class="profile-chevron" xmlns="http://www.w3.org/2000/svg"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="profile-dropdown" id="profileDropdown" role="menu">
              <div class="dropdown-header">
                <span class="dropdown-user-name" id="dropdownUserName">–</span>
                <span class="dropdown-user-sub" id="dropdownUserEmail">–</span>
              </div>
              <div class="dropdown-divider"></div>
              <div class="theme-row">
                <span class="theme-row-label">Ansicht</span>
                <div class="theme-switcher" role="group" aria-label="Ansicht wählen">
                  <button class="theme-opt" id="btnDark" data-theme-val="dark"
                          title="Dunkelmodus" aria-label="Dunkelmodus">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                         aria-hidden="true">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                  </button>
                  <button class="theme-opt" id="btnLight" data-theme-val="light"
                          title="Hellmodus" aria-label="Hellmodus">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                         aria-hidden="true">
                      <circle cx="12" cy="12" r="5"/>
                      <line x1="12" y1="1"  x2="12" y2="3"/>
                      <line x1="12" y1="21" x2="12" y2="23"/>
                      <line x1="4.22" y1="4.22"   x2="5.64"  y2="5.64"/>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                      <line x1="1"  y1="12" x2="3"  y2="12"/>
                      <line x1="21" y1="12" x2="23" y2="12"/>
                      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
                      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" id="editNameBtn">Name ändern</button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" id="logoutBtn" style="color:var(--grade-bad)">Abmelden</button>
            </div>
          </div>
        </div>
      </div>
    </nav>`;
}

/* ── Name-Modal ───────────────────────────────────────── */
function buildNameModalHTML() {
  return `
    <div class="modal-backdrop" id="nameModal" role="dialog" aria-modal="true" aria-labelledby="nameModalTitle">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title" id="nameModalTitle">Wie heißt du?</h2>
          <p style="margin-top: 0.5rem; font-size: var(--text-sm); color: var(--fg-3); max-width: none;">
            Dein Anzeigename in der App.
          </p>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="nameInput">Vorname</label>
            <input class="form-input" type="text" id="nameInput"
                   placeholder="z.B. Finn" maxlength="40" autocomplete="given-name" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" id="saveNameBtn">Speichern</button>
        </div>
      </div>
    </div>`;
}

/* ── Navbar initialisieren ────────────────────────────── */
function initNavbar(activePage) {
  // Navbar in DOM einfügen
  document.body.insertAdjacentHTML('afterbegin', buildNavbarHTML(activePage));

  const profileBtn      = document.getElementById('profileBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const editNameBtn     = document.getElementById('editNameBtn');

  // Theme-Buttons (Mond / Sonne)
  document.getElementById('btnDark').addEventListener('click',  () => applyTheme('dark'));
  document.getElementById('btnLight').addEventListener('click', () => applyTheme('light'));

  // Profil-Dropdown öffnen/schließen
  profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = profileDropdown.classList.contains('open');
    profileDropdown.classList.toggle('open', !isOpen);
    profileBtn.setAttribute('aria-expanded', !isOpen);
  });

  document.addEventListener('click', () => {
    profileDropdown.classList.remove('open');
    profileBtn.setAttribute('aria-expanded', 'false');
  });

  profileDropdown.addEventListener('click', (e) => e.stopPropagation());

  // Name ändern
  editNameBtn.addEventListener('click', () => {
    profileDropdown.classList.remove('open');
    profileBtn.setAttribute('aria-expanded', 'false');
    openNameModal();
  });

  // Abmelden
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    Object.keys(localStorage).filter(k => k.startsWith('sf_')).forEach(k => localStorage.removeItem(k));
    window.location.replace('login.html');
  });

  updateProfileUI();
}

/* ── Profil-UI aktualisieren ──────────────────────────── */
function updateProfileUI() {
  const profile = getProfile();
  const email   = window._supabaseUser?.email || '';
  const name    = profile.name || email.split('@')[0] || 'Profil';

  const avatarEl       = document.getElementById('profileAvatar');
  const nameEl         = document.getElementById('profileNameEl');
  const dropdownNameEl = document.getElementById('dropdownUserName');
  const emailEl        = document.getElementById('dropdownUserEmail');

  if (avatarEl)       avatarEl.textContent      = getFirstLetter(name);
  if (nameEl)         nameEl.textContent         = name;
  if (dropdownNameEl) dropdownNameEl.textContent = name;
  if (emailEl)        emailEl.textContent        = email;
}

/* ── Name-Modal ───────────────────────────────────────── */
function openNameModal(isFirstVisit = false) {
  if (!document.getElementById('nameModal')) {
    document.body.insertAdjacentHTML('beforeend', buildNameModalHTML());
  }

  const modal    = document.getElementById('nameModal');
  const input    = document.getElementById('nameInput');
  const saveBtn  = document.getElementById('saveNameBtn');

  if (!isFirstVisit) {
    const profile = getProfile();
    input.value = profile.name || '';
    saveBtn.textContent = 'Speichern';
  } else {
    saveBtn.textContent = 'Los geht\'s';
  }

  // Open with animation
  requestAnimationFrame(() => {
    modal.classList.add('open');
    setTimeout(() => input.focus(), 80);
  });

  function save() {
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }
    saveProfile({ name });
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 250);
    updateProfileUI();
    // Custom event for pages that need to react
    document.dispatchEvent(new CustomEvent('profileUpdated', { detail: { name } }));
  }

  saveBtn.onclick = save;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape' && !isFirstVisit) {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 250);
    }
  });

  // Close on backdrop click (only if not first visit)
  if (!isFirstVisit) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 250);
      }
    });
  }
}

/* ── App initialisieren ───────────────────────────────── */
function initApp(activePage = 'dashboard') {
  applyTheme(getInitialTheme());
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') window.location.replace('reset-password.html');
  });
  window.appReady = _initAppAsync(activePage);
  return window.appReady;
}

async function _initAppAsync(activePage) {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    if (!window.location.pathname.endsWith('login.html')) {
      window.location.replace('login.html');
      await new Promise(() => {});
    }
    return;
  }

  window._supabaseUser = session.user;
  await loadUserData();
  applyTheme(getInitialTheme());
  initNavbar(activePage);

  const profile = getProfile();
  if (!profile.name) setTimeout(() => openNameModal(true), 300);
}

/* ── Datum-Utilities ──────────────────────────────────── */
const DateUtils = {
  today() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  },

  toISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  fromISO(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  },

  diffDays(dateStr) {
    const target = this.fromISO(dateStr);
    const diff = Math.ceil((target - this.today()) / (1000 * 60 * 60 * 24));
    return diff;
  },

  formatShort(dateStr) {
    const d = this.fromISO(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  formatLong(dateStr) {
    const d = this.fromISO(dateStr);
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  },

  formatMonth(year, month) {
    const d = new Date(year, month, 1);
    return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  },

  todayISO() {
    return this.toISO(this.today());
  },
};

/* ── Grade-Utilities ──────────────────────────────────── */
const GradeUtils = {
  // Effektive Note eines Fachs (berechnet aus Teilleistungen oder direkt)
  effectiveGrade(sub) {
    const sgs = (sub.subGrades || []).filter(sg => sg.grade !== '' && sg.grade != null);
    if (sgs.length > 0) {
      return sgs.reduce((sum, sg) => sum + Number(sg.grade), 0) / sgs.length;
    }
    return (sub.grade !== '' && sub.grade != null) ? Number(sub.grade) : null;
  },

  // Durchschnitt (alle Fächer gleich gewichtet)
  simpleAverage(subjects) {
    const valid = subjects.filter(s => GradeUtils.effectiveGrade(s) !== null);
    if (!valid.length) return null;
    return valid.reduce((sum, s) => sum + GradeUtils.effectiveGrade(s), 0) / valid.length;
  },

  // Klasse für Farbgebung
  gradeClass(avg) {
    if (avg === null) return '';
    if (avg <= 2.0) return 'grade-good';
    if (avg <= 3.5) return 'grade-mid';
    return 'grade-bad';
  },

  format(num) {
    if (num === null || num === undefined) return '–';
    return Number(num).toFixed(1).replace('.', ',');
  },
};
