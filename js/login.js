/* ═══════════════════════════════════════════════════════════
   Login / Registrierung
═══════════════════════════════════════════════════════════ */

// Theme sofort anwenden
(function () {
  const t = localStorage.getItem('sf_theme');
  document.documentElement.setAttribute('data-theme',
    (t === 'dark' || t === 'light') ? t :
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
})();

// Bereits eingeloggt → direkt weiter
(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) window.location.replace('index.html');
})();

/* ── State ────────────────────────────────────────────── */
let isLogin = true;

const tabLogin       = document.getElementById('tabLogin');
const tabSignup      = document.getElementById('tabSignup');
const submitBtn      = document.getElementById('submitBtn');
const emailInput     = document.getElementById('emailInput');
const passwordInput  = document.getElementById('passwordInput');
const errorEl        = document.getElementById('loginError');
const infoEl         = document.getElementById('loginInfo');

/* ── Tab-Wechsel ──────────────────────────────────────── */
tabLogin.addEventListener('click', () => {
  isLogin = true;
  tabLogin.classList.add('active');
  tabSignup.classList.remove('active');
  submitBtn.textContent = 'Anmelden';
  hideMessages();
});

tabSignup.addEventListener('click', () => {
  isLogin = false;
  tabSignup.classList.add('active');
  tabLogin.classList.remove('active');
  submitBtn.textContent = 'Konto erstellen';
  hideMessages();
});

/* ── Helpers ──────────────────────────────────────────── */
function hideMessages() {
  errorEl.classList.remove('visible');
  infoEl.classList.remove('visible');
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.add('visible');
  infoEl.classList.remove('visible');
}

function showInfo(msg) {
  infoEl.textContent = msg;
  infoEl.classList.add('visible');
  errorEl.classList.remove('visible');
}

function translateError(msg) {
  if (msg.includes('Invalid login credentials')) return 'E-Mail oder Passwort falsch.';
  if (msg.includes('Email not confirmed'))        return 'Bitte erst die E-Mail-Adresse bestätigen.';
  if (msg.includes('already registered'))         return 'Diese E-Mail ist bereits registriert.';
  if (msg.includes('Password should be'))         return 'Das Passwort muss mindestens 6 Zeichen lang sein.';
  return msg;
}

/* ── Submit ───────────────────────────────────────────── */
async function submit() {
  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) { showError('Bitte E-Mail und Passwort eingeben.'); return; }

  submitBtn.disabled    = true;
  submitBtn.textContent = '…';
  hideMessages();

  let error, data;

  if (isLogin) {
    ({ data, error } = await supabaseClient.auth.signInWithPassword({ email, password }));
  } else {
    ({ data, error } = await supabaseClient.auth.signUp({ email, password }));
  }

  if (error) {
    showError(translateError(error.message));
    submitBtn.disabled    = false;
    submitBtn.textContent = isLogin ? 'Anmelden' : 'Konto erstellen';
    return;
  }

  if (!isLogin && !data.session) {
    // E-Mail-Bestätigung erforderlich
    showInfo('Konto erstellt! Prüfe deine E-Mail zur Bestätigung, dann hier anmelden.');
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Anmelden';
    isLogin = true;
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    return;
  }

  window.location.replace('index.html');
}

submitBtn.addEventListener('click', submit);
[emailInput, passwordInput].forEach(el =>
  el.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); })
);
