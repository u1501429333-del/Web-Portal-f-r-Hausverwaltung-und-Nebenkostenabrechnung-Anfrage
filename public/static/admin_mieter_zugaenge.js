// ============================================================
// Admin: Zentrale Übersicht "Mieter-Zugänge" (Login-Verwaltung
// für das Mieter-Portal, objektübergreifend gebündelt statt
// versteckt in der Wohnung-Detailansicht).
// ============================================================
registerRoute('/admin/mieter-zugaenge', async (app) => {
  await ensureObjekteLoaded();

  if (!AppState.objekte.length) {
    app.innerHTML = renderLayout('mieter-zugaenge', `
      <div class="card p-10 text-center">
        <i class="fas fa-key text-5xl text-slate-300 mb-4"></i>
        <h2 class="text-xl font-bold text-slate-700 mb-2">Noch kein Objekt angelegt</h2>
        <p class="text-slate-500 mb-4">Legen Sie zuerst eine Liegenschaft mit Wohnungen und Mietern an.</p>
      </div>
    `, { title: 'Mieter-Zugänge' });
    return;
  }

  app.innerHTML = renderLayout('mieter-zugaenge', `<div id="mz-content" class="flex items-center justify-center py-16"><div class="spinner"></div></div>`, { title: 'Mieter-Zugänge' });
  attachLayoutHandlers(() => loadMieterZugaenge());
  await loadMieterZugaenge();
});

async function loadMieterZugaenge() {
  const container = document.getElementById('mz-content');
  container.innerHTML = `<div class="flex items-center justify-center py-16"><div class="spinner"></div></div>`;
  const objektId = AppState.currentObjektId;
  const liste = await API.listMieterZugaenge(objektId);

  const aktive = liste.filter((m) => m.aktiv);
  const anzahlMitLogin = aktive.filter((m) => m.has_login).length;

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="card p-5">
        <div class="text-slate-500 text-sm mb-1"><i class="fas fa-users mr-1"></i> Aktive Mieter</div>
        <div class="text-2xl font-bold text-slate-800">${aktive.length}</div>
      </div>
      <div class="card p-5">
        <div class="text-slate-500 text-sm mb-1"><i class="fas fa-key mr-1"></i> Mit Portal-Zugang</div>
        <div class="text-2xl font-bold text-emerald-600">${anzahlMitLogin}</div>
      </div>
      <div class="card p-5 ${aktive.length - anzahlMitLogin > 0 ? 'border-l-4 border-amber-500' : ''}">
        <div class="text-slate-500 text-sm mb-1"><i class="fas fa-triangle-exclamation mr-1"></i> Ohne Zugang</div>
        <div class="text-2xl font-bold ${aktive.length - anzahlMitLogin > 0 ? 'text-amber-600' : 'text-slate-800'}">${aktive.length - anzahlMitLogin}</div>
      </div>
    </div>

    <div class="card p-0 overflow-hidden">
      <table class="data-table w-full text-sm">
        <thead><tr>
          <th>Mieter</th><th>Wohnung</th><th>Login-E-Mail</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          ${liste.length ? liste.map((m) => `
            <tr class="${!m.aktiv ? 'opacity-50' : ''}">
              <td class="font-semibold">${escapeHtml(m.name)}${!m.aktiv ? ' <span class="badge bg-slate-100 text-slate-500 ml-1">Ehemalig</span>' : ''}</td>
              <td>${escapeHtml(m.wohnung_bezeichnung || '')}</td>
              <td>${m.has_login ? escapeHtml(m.login_email || '') : '<span class="text-slate-400">—</span>'}</td>
              <td>
                ${m.has_login
                  ? (m.login_active
                      ? '<span class="badge bg-emerald-100 text-emerald-700"><i class="fas fa-check mr-1"></i>Aktiv</span>'
                      : '<span class="badge bg-red-100 text-red-700"><i class="fas fa-ban mr-1"></i>Deaktiviert</span>')
                  : '<span class="badge bg-amber-100 text-amber-700"><i class="fas fa-circle-exclamation mr-1"></i>Kein Zugang</span>'}
              </td>
              <td class="text-right">
                <button class="px-3 py-1.5 rounded-lg text-xs font-semibold ${m.has_login ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}" onclick="openMieterLoginModal(${m.id}, loadMieterZugaenge)">
                  <i class="fas ${m.has_login ? 'fa-rotate' : 'fa-key'} mr-1"></i>${m.has_login ? 'Passwort zurücksetzen' : 'Zugang erstellen'}
                </button>
                <a href="#/admin/wohnung/${m.wohnung_id}" class="ml-2 text-blue-600 hover:underline text-xs">Wohnung <i class="fas fa-arrow-right"></i></a>
              </td>
            </tr>
          `).join('') : `<tr><td colspan="5" class="text-center text-slate-400 py-8">Keine Mieter erfasst.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}
