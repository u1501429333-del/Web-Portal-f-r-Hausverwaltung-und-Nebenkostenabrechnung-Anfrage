// ============================================================
// Gemeinsames Layout: Sidebar + Content-Bereich
// ============================================================
function renderLayout(activeKey, contentHtml, opts = {}) {
  const isAdmin = AppState.user?.role === 'admin';
  const navItemsAdmin = [
    { key: 'dashboard', href: '#/admin', icon: 'fa-gauge-high', label: 'Dashboard' },
    { key: 'objekte', href: '#/admin/objekte', icon: 'fa-building', label: 'Objekte & Wohnungen' },
    { key: 'mieter-zugaenge', href: '#/admin/mieter-zugaenge', icon: 'fa-key', label: 'Mieter-Zugänge' },
    { key: 'zaehler', href: '#/admin/zaehler', icon: 'fa-gauge', label: 'Zählerstände' },
    { key: 'kosten', href: '#/admin/kosten', icon: 'fa-file-invoice-dollar', label: 'Kosten erfassen' },
    { key: 'abrechnung', href: '#/admin/abrechnung', icon: 'fa-calculator', label: 'Abrechnung' },
    { key: 'dokumente', href: '#/admin/dokumente', icon: 'fa-file-contract', label: 'Dokumente' },
    { key: 'schaeden', href: '#/admin/schaeden', icon: 'fa-screwdriver-wrench', label: 'Schadensmeldungen' },
    { key: 'unterlagen', href: '#/admin/unterlagen', icon: 'fa-folder-open', label: 'Unterlagen' },
    { key: 'einstellungen', href: '#/admin/einstellungen', icon: 'fa-gear', label: 'Stammdaten / Branding' },
  ];
  const navItemsMieter = [
    { key: 'dashboard', href: '#/mieter', icon: 'fa-gauge-high', label: 'Übersicht' },
    { key: 'zaehler', href: '#/mieter/zaehler', icon: 'fa-gauge', label: 'Zählerstand melden' },
    { key: 'historie', href: '#/mieter/historie', icon: 'fa-chart-line', label: 'Verlauf & Vergleich' },
    { key: 'abrechnung', href: '#/mieter/abrechnung', icon: 'fa-file-invoice', label: 'Nebenkostenabrechnung' },
    { key: 'schaeden', href: '#/mieter/schaeden', icon: 'fa-screwdriver-wrench', label: 'Schadensmeldung' },
    { key: 'unterlagen', href: '#/mieter/unterlagen', icon: 'fa-folder-open', label: 'Unterlagen' },
  ];
  const navItems = isAdmin ? navItemsAdmin : navItemsMieter;

  const objektSelector = isAdmin && AppState.objekte.length
    ? `<select id="objekt-selector" class="form-input text-sm !py-1.5 bg-slate-700 text-white border-slate-600">
        ${AppState.objekte.map((o) => `<option value="${o.id}" ${o.id === AppState.currentObjektId ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('')}
      </select>`
    : '';

  return `
    <div class="min-h-screen flex">
      <aside class="w-64 bg-slate-900 text-slate-200 flex flex-col no-print">
        <div class="p-5 border-b border-slate-700">
          <div class="flex items-center gap-2">
            ${AppState.branding?.logo_data_url
              ? `<img src="${AppState.branding.logo_data_url}" alt="Logo" class="h-8 max-w-[40px] object-contain rounded bg-white p-0.5" />`
              : '<i class="fas fa-building-shield text-blue-400 text-xl"></i>'}
            <span class="font-bold text-white text-lg truncate">${escapeHtml(AppState.branding?.app_name || 'UHV-Web-Portal')}</span>
          </div>
          <p class="text-xs text-slate-400 mt-1">${isAdmin ? 'Admin-Bereich' : 'Mieter-Portal'} <span class="text-slate-500">· v3</span></p>
        </div>
        <nav class="flex-1 p-3 space-y-1">
          ${navItems
            .map(
              (item) => `<a href="${item.href}" class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeKey === item.key ? 'active' : ''}">
              <i class="fas ${item.icon} w-5 text-center"></i> ${item.label}
            </a>`
            )
            .join('')}
        </nav>
        <div class="p-3 border-t border-slate-700">
          <button onclick="openMeinKontoModal()" class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700/60 transition group" title="Mein Konto (E-Mail / Passwort ändern)">
            <div class="text-xs text-slate-400 flex items-center justify-between">
              Angemeldet als
              <i class="fas fa-user-gear text-slate-500 group-hover:text-white transition"></i>
            </div>
            <div class="text-sm font-medium text-white truncate">${escapeHtml(AppState.user?.name || AppState.user?.email || '')}</div>
            <div class="text-xs text-slate-400 truncate">${escapeHtml(AppState.user?.email || '')}</div>
          </button>
          ${isAdmin && AppState.pinRequired ? `<button onclick="lockPinGate()" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700/60 transition">
            <i class="fas fa-lock"></i> Admin-Bereich sperren
          </button>` : ''}
          <button onclick="doLogout()" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-900/40 transition">
            <i class="fas fa-right-from-bracket"></i> Abmelden
          </button>
        </div>
      </aside>
      <main class="flex-1 flex flex-col min-h-screen">
        <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between no-print">
          <h1 class="text-lg font-bold text-slate-800">${opts.title || ''}</h1>
          <div class="flex items-center gap-3">
            ${objektSelector}
            <select id="jahr-selector" class="form-input text-sm !py-1.5 w-28">
              ${[0, -1, -2, -3].map((d) => {
                const j = new Date().getFullYear() + d;
                return `<option value="${j}" ${j === AppState.currentJahr ? 'selected' : ''}>${j}</option>`;
              }).join('')}
            </select>
          </div>
        </header>
        <div class="flex-1 p-6 bg-slate-50 overflow-y-auto">${contentHtml}</div>
      </main>
    </div>
  `;
}

function attachLayoutHandlers(onChange) {
  const objSel = document.getElementById('objekt-selector');
  if (objSel) {
    objSel.addEventListener('change', (e) => {
      AppState.currentObjektId = Number(e.target.value);
      onChange && onChange();
    });
  }
  const jahrSel = document.getElementById('jahr-selector');
  if (jahrSel) {
    jahrSel.addEventListener('change', (e) => {
      AppState.currentJahr = Number(e.target.value);
      onChange && onChange();
    });
  }
}

async function ensureObjekteLoaded() {
  if (AppState.objekte.length === 0) {
    AppState.objekte = await API.listObjekte();
    if (AppState.objekte.length && !AppState.currentObjektId) {
      AppState.currentObjektId = AppState.objekte[0].id;
    }
  }
}

// ============================================================
// "Mein Konto": eigene E-Mail-Adresse und/oder eigenes Passwort ändern.
// Für Admin UND Mieter über die Sidebar erreichbar.
// ============================================================
function openMeinKontoModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-6 w-full max-w-md">
      <h2 class="text-lg font-bold mb-1"><i class="fas fa-user-gear text-blue-600 mr-1"></i> Mein Konto</h2>
      <p class="text-sm text-slate-500 mb-4">E-Mail-Adresse und/oder Passwort für den eigenen Zugang ändern.</p>
      <form id="mein-konto-form" class="space-y-3">
        <div>
          <label class="text-xs font-semibold text-slate-500">E-Mail-Adresse</label>
          <input class="form-input" type="email" name="email" value="${escapeHtml(AppState.user?.email || '')}" required>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500">Neues Passwort (leer lassen = unverändert)</label>
          <input class="form-input" type="password" name="new_password" autocomplete="new-password" placeholder="Mind. 6 Zeichen">
        </div>
        <div class="pt-2 border-t border-slate-100">
          <label class="text-xs font-semibold text-slate-500">Aktuelles Passwort <span class="text-red-500">*</span> (zur Bestätigung erforderlich)</label>
          <input class="form-input" type="password" name="current_password" autocomplete="current-password" required placeholder="Zur Sicherheit erneut eingeben">
        </div>
        <div id="mein-konto-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2"></div>
        <div class="flex justify-end gap-2 mt-4">
          <button type="button" class="px-4 py-2 rounded-lg text-slate-600 bg-slate-100" onclick="this.closest('.fixed').remove()">Abbrechen</button>
          <button type="submit" class="px-4 py-2 rounded-lg text-white bg-blue-600 font-semibold"><i class="fas fa-save mr-1"></i>Speichern</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#mein-konto-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const errorBox = modal.querySelector('#mein-konto-error');
    errorBox.classList.add('hidden');
    try {
      const res = await API.updateMyAccount({
        email: fd.email,
        new_password: fd.new_password || undefined,
        current_password: fd.current_password,
      });
      AppState.user = res.user;
      toast('Konto aktualisiert', 'success');
      modal.remove();
      router();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
    }
  });
}
