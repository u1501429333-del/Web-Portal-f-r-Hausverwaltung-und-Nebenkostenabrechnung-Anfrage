// ============================================================
// Router & App-Bootstrap
// ============================================================
const routes = {};
function registerRoute(path, handler) {
  routes[path] = handler;
}

function matchRoute(hash) {
  const path = hash.replace(/^#/, '') || '/login';
  const [pathname, query] = path.split('?');
  const params = new URLSearchParams(query || '');

  for (const pattern in routes) {
    const paramNames = [];
    const regexStr = pattern.replace(/:([a-zA-Z]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${regexStr}$`);
    const match = pathname.match(regex);
    if (match) {
      const pathParams = {};
      paramNames.forEach((name, i) => (pathParams[name] = match[i + 1]));
      return { handler: routes[pattern], params: pathParams, query: params };
    }
  }
  return null;
}

async function router() {
  const app = document.getElementById('app');
  const matched = matchRoute(location.hash);

  if (!matched) {
    app.innerHTML = `<div class="min-h-screen flex items-center justify-center"><div class="text-center"><h1 class="text-2xl font-bold text-slate-700">404 - Seite nicht gefunden</h1><a href="#/login" class="text-blue-600 underline">Zurück zum Login</a></div></div>`;
    return;
  }

  // Auth-Check
  if (!AppState.user) {
    try {
      const res = await API.me();
      AppState.user = res.user;
    } catch {
      AppState.user = null;
    }
  }

  const isLoginRoute = location.hash === '#/login' || location.hash === '';
  if (!AppState.user && !isLoginRoute) {
    location.hash = '#/login';
    return;
  }
  if (AppState.user && isLoginRoute) {
    location.hash = AppState.user.role === 'admin' ? '#/admin' : '#/mieter';
    return;
  }

  try {
    await ensureBrandingLoaded();
  } catch {
    // Branding ist rein kosmetisch – Fehler hier dürfen die App nicht blockieren
  }

  // PIN-Schutz-Gate: läuft NACH dem Auth-Check, aber VOR jedem echten Routen-Handler.
  // Betrifft nur den Admin-Bereich (Mieter haben keinen PIN-Schutz). Solange der PIN
  // in dieser Browser-Session noch nicht bestätigt wurde, wird statt der Zielseite
  // ein Eingabe-Bildschirm gerendert; erst nach erfolgreicher Prüfung wird der
  // eigentliche Handler aufgerufen.
  if (AppState.user?.role === 'admin') {
    const granted = await checkPinGate(app);
    if (!granted) return;
  }

  try {
    await matched.handler(app, matched.params, matched.query);
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="p-8"><div class="card p-6 border-l-4 border-red-500"><h2 class="font-bold text-red-700">Fehler beim Laden</h2><p class="text-slate-600 mt-1">${escapeHtml(err.message)}</p></div></div>`;
  }
}

// ============================================================
// PIN-Schutz-Frontend-Gate
// ============================================================
// Prüft (einmal pro Browser-Session), ob PIN-Schutz aktiv ist, und blockiert
// andernfalls den Zugriff auf den Admin-Bereich, bis der korrekte PIN über
// POST /api/einstellungen/pin-verify bestätigt wurde.
async function checkPinGate(app) {
  if (!AppState.pinChecked) {
    try {
      const e = await API.getEinstellungenErweitert();
      AppState.pinRequired = !!(e.pin_schutz_aktiv && e.pin_gesetzt);
    } catch {
      // Bei Fehlern (z.B. Netzwerkproblem) lieber nicht blockieren –
      // die eigentlichen API-Routen sind ohnehin serverseitig durch die
      // Session-Middleware (requireAdmin) abgesichert.
      AppState.pinRequired = false;
    }
    AppState.pinChecked = true;
  }

  if (!AppState.pinRequired || AppState.pinVerified) {
    return true;
  }

  renderPinGate(app);
  return false;
}

function renderPinGate(app) {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black px-4">
      <div class="w-full max-w-sm">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-3">
            <i class="fas fa-lock text-3xl text-white"></i>
          </div>
          <h1 class="text-xl font-bold text-white">Zusätzlicher PIN-Schutz</h1>
          <p class="text-slate-300 text-sm mt-1">Bitte PIN eingeben, um den Admin-Bereich zu öffnen.</p>
        </div>
        <div class="card p-6">
          <form id="pin-gate-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-600 mb-1">PIN</label>
              <input type="password" inputmode="numeric" id="pin-gate-input" class="form-input text-center text-lg tracking-widest" placeholder="••••" autofocus required>
            </div>
            <div id="pin-gate-error" class="hidden text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-2"></div>
            <button type="submit" class="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2">
              <i class="fas fa-unlock"></i> Entsperren
            </button>
          </form>
          <button onclick="doLogout()" class="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 transition">
            <i class="fas fa-right-from-bracket mr-1"></i> Abmelden
          </button>
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById('pin-gate-form');
  const errorBox = document.getElementById('pin-gate-error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    const pin = document.getElementById('pin-gate-input').value;
    try {
      const res = await API.verifyPin(pin);
      if (res.ok) {
        AppState.pinVerified = true;
        router();
      } else {
        errorBox.textContent = 'Falscher PIN. Bitte erneut versuchen.';
        errorBox.classList.remove('hidden');
        document.getElementById('pin-gate-input').value = '';
        document.getElementById('pin-gate-input').focus();
      }
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
    }
  });
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  if (!location.hash) location.hash = '#/login';
  router();
});

// ============================================================
// Login-Seite
// ============================================================
registerRoute('/login', async (app) => {
  try { await ensureBrandingLoaded(); } catch {}
  const branding = AppState.branding || { app_name: 'Hausverwaltung Portal', logo_data_url: '' };
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 px-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-3 overflow-hidden">
            ${branding.logo_data_url
              ? `<img src="${branding.logo_data_url}" alt="Logo" class="w-full h-full object-contain p-1" />`
              : '<i class="fas fa-building-shield text-3xl text-white"></i>'}
          </div>
          <h1 class="text-2xl font-bold text-white">${escapeHtml(branding.app_name || 'Hausverwaltung Portal')}</h1>
          <p class="text-blue-200 text-sm mt-1">Nebenkostenabrechnung &amp; Mieterverwaltung</p>
        </div>
        <div class="card p-8">
          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-600 mb-1">E-Mail</label>
              <input type="email" id="login-email" class="form-input" placeholder="admin@hausverwaltung.de" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-600 mb-1">Passwort</label>
              <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
            </div>
            <div id="login-error" class="hidden text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-2"></div>
            <button type="submit" class="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2">
              <i class="fas fa-arrow-right-to-bracket"></i> Anmelden
            </button>
          </form>
          <div class="mt-6 pt-5 border-t border-slate-200 text-xs text-slate-500 space-y-1">
            <p class="font-semibold text-slate-600 mb-1"><i class="fas fa-flask mr-1"></i>Demo-Zugänge:</p>
            <p>Admin: <code class="bg-slate-100 px-1 rounded">admin@hausverwaltung.de</code> / <code class="bg-slate-100 px-1 rounded">admin123</code></p>
            <p>Mieter: <code class="bg-slate-100 px-1 rounded">mieter1@example.com</code> / <code class="bg-slate-100 px-1 rounded">mieter123</code></p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorBox = document.getElementById('login-error');
    errorBox.classList.add('hidden');
    try {
      const res = await API.login(email, password);
      AppState.user = res.user;
      location.hash = res.user.role === 'admin' ? '#/admin' : '#/mieter';
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
    }
  });
});

async function doLogout() {
  await API.logout();
  AppState.user = null;
  // PIN-Gate-Status zurücksetzen, damit sich nach erneutem Login (ggf. als
  // anderer Nutzer) niemand am Cache eines vorherigen "entsperrt"-Zustands vorbeischleicht.
  AppState.pinVerified = false;
  AppState.pinChecked = false;
  location.hash = '#/login';
}
