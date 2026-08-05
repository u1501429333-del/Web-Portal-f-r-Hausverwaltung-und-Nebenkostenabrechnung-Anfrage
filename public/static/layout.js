// ============================================================
// Gemeinsames Layout: Sidebar + Content-Bereich
// ============================================================
function renderLayout(activeKey, contentHtml, opts = {}) {
  const isAdmin = AppState.user?.role === 'admin';
  const navItemsAdmin = [
    { key: 'dashboard', href: '#/admin', icon: 'fa-gauge-high', label: 'Dashboard' },
    { key: 'objekte', href: '#/admin/objekte', icon: 'fa-building', label: 'Objekte & Wohnungen' },
    { key: 'zaehler', href: '#/admin/zaehler', icon: 'fa-gauge', label: 'Zählerstände' },
    { key: 'kosten', href: '#/admin/kosten', icon: 'fa-file-invoice-dollar', label: 'Kosten erfassen' },
    { key: 'abrechnung', href: '#/admin/abrechnung', icon: 'fa-calculator', label: 'Abrechnung' },
    { key: 'dokumente', href: '#/admin/dokumente', icon: 'fa-file-contract', label: 'Dokumente' },
    { key: 'einstellungen', href: '#/admin/einstellungen', icon: 'fa-gear', label: 'Stammdaten / Branding' },
  ];
  const navItemsMieter = [
    { key: 'dashboard', href: '#/mieter', icon: 'fa-gauge-high', label: 'Übersicht' },
    { key: 'zaehler', href: '#/mieter/zaehler', icon: 'fa-gauge', label: 'Zählerstand melden' },
    { key: 'historie', href: '#/mieter/historie', icon: 'fa-chart-line', label: 'Verlauf & Vergleich' },
    { key: 'abrechnung', href: '#/mieter/abrechnung', icon: 'fa-file-invoice', label: 'Nebenkostenabrechnung' },
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
            <span class="font-bold text-white text-lg truncate">${escapeHtml(AppState.branding?.app_name || 'Hausverwaltung')}</span>
          </div>
          <p class="text-xs text-slate-400 mt-1">${isAdmin ? 'Admin-Bereich' : 'Mieter-Portal'}</p>
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
          <div class="px-3 py-2 text-xs text-slate-400">Angemeldet als</div>
          <div class="px-3 pb-2 text-sm font-medium text-white truncate">${escapeHtml(AppState.user?.name || AppState.user?.email || '')}</div>
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
