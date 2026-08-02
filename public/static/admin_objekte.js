// ============================================================
// Admin: Objekte, Wohnungen, Mieter verwalten
// ============================================================
registerRoute('/admin/objekte', async (app) => {
  await ensureObjekteLoaded();
  app.innerHTML = renderLayout('objekte', `<div id="objekte-content"></div>`, { title: 'Objekte & Wohnungen' });
  attachLayoutHandlers(() => router());
  renderObjekteList();
});

function renderObjekteList() {
  const container = document.getElementById('objekte-content');
  container.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <p class="text-slate-500 text-sm">Verwalten Sie beliebig viele Liegenschaften, Wohnungen und Mietverhältnisse.</p>
      <button id="btn-new-objekt" class="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"><i class="fas fa-plus mr-1"></i> Neues Objekt</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="objekte-grid"></div>
  `;
  document.getElementById('btn-new-objekt').addEventListener('click', () => openObjektModal());
  renderObjekteGrid();
}

function renderObjekteGrid() {
  const grid = document.getElementById('objekte-grid');
  grid.innerHTML = AppState.objekte.map((o) => `
    <div class="card p-5">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-slate-800 text-lg">${escapeHtml(o.name)}</h3>
          <p class="text-slate-500 text-sm">${escapeHtml(o.strasse)}, ${escapeHtml(o.plz)} ${escapeHtml(o.ort)}</p>
        </div>
        <div class="flex gap-2">
          <button class="text-slate-400 hover:text-blue-600" onclick="openObjektModal(${o.id})"><i class="fas fa-pen"></i></button>
          <button class="text-slate-400 hover:text-red-600" onclick="deleteObjektConfirm(${o.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600">
        <p><i class="fas fa-user w-4 text-slate-400"></i> ${escapeHtml(o.vermieter_name || '—')}</p>
        <p><i class="fas fa-university w-4 text-slate-400"></i> ${escapeHtml(o.iban || '—')}</p>
      </div>
      <button class="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium" onclick="showWohnungen(${o.id})">
        <i class="fas fa-door-open mr-1"></i> Wohnungen verwalten
      </button>
    </div>
  `).join('') || `<p class="text-slate-400 col-span-2 text-center py-8">Keine Objekte vorhanden.</p>`;
}

function openObjektModal(id) {
  const objekt = id ? AppState.objekte.find((o) => o.id === id) : {};
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <h2 class="text-lg font-bold mb-4">${id ? 'Objekt bearbeiten' : 'Neues Objekt'}</h2>
      <form id="objekt-form" class="grid grid-cols-2 gap-3">
        <div class="col-span-2"><label class="text-xs font-semibold text-slate-500">Name der Liegenschaft *</label><input class="form-input" name="name" required value="${escapeHtml(objekt.name || '')}"></div>
        <div class="col-span-2"><label class="text-xs font-semibold text-slate-500">Straße & Hausnummer</label><input class="form-input" name="strasse" value="${escapeHtml(objekt.strasse || '')}"></div>
        <div><label class="text-xs font-semibold text-slate-500">PLZ</label><input class="form-input" name="plz" value="${escapeHtml(objekt.plz || '')}"></div>
        <div><label class="text-xs font-semibold text-slate-500">Ort</label><input class="form-input" name="ort" value="${escapeHtml(objekt.ort || '')}"></div>

        <div class="col-span-2 mt-2 pt-2 border-t"><span class="text-sm font-bold text-blue-700">Vermieter (Briefkopf)</span></div>
        <div class="col-span-2"><label class="text-xs font-semibold text-slate-500">Name Vermieter</label><input class="form-input" name="vermieter_name" value="${escapeHtml(objekt.vermieter_name || '')}"></div>
        <div class="col-span-2"><label class="text-xs font-semibold text-slate-500">Anschrift Vermieter</label><input class="form-input" name="vermieter_strasse" value="${escapeHtml(objekt.vermieter_strasse || '')}"></div>
        <div class="col-span-2"><label class="text-xs font-semibold text-slate-500">PLZ/Ort Vermieter</label><input class="form-input" name="vermieter_plz_ort" value="${escapeHtml(objekt.vermieter_plz_ort || '')}"></div>
        <div><label class="text-xs font-semibold text-slate-500">Telefon</label><input class="form-input" name="vermieter_telefon" value="${escapeHtml(objekt.vermieter_telefon || '')}"></div>
        <div><label class="text-xs font-semibold text-slate-500">E-Mail</label><input class="form-input" name="vermieter_email" value="${escapeHtml(objekt.vermieter_email || '')}"></div>

        <div class="col-span-2 mt-2 pt-2 border-t"><span class="text-sm font-bold text-blue-700">Bankverbindung</span></div>
        <div class="col-span-2"><label class="text-xs font-semibold text-slate-500">Bank</label><input class="form-input" name="bank_name" value="${escapeHtml(objekt.bank_name || '')}"></div>
        <div><label class="text-xs font-semibold text-slate-500">IBAN</label><input class="form-input" name="iban" value="${escapeHtml(objekt.iban || '')}"></div>
        <div><label class="text-xs font-semibold text-slate-500">BIC</label><input class="form-input" name="bic" value="${escapeHtml(objekt.bic || '')}"></div>
        <div class="col-span-2"><label class="text-xs font-semibold text-slate-500">Steuernummer</label><input class="form-input" name="steuernummer" value="${escapeHtml(objekt.steuernummer || '')}"></div>

        <div class="col-span-2 flex justify-end gap-2 mt-4">
          <button type="button" class="px-4 py-2 rounded-lg text-slate-600 bg-slate-100" onclick="this.closest('.fixed').remove()">Abbrechen</button>
          <button type="submit" class="px-4 py-2 rounded-lg text-white bg-blue-700 font-semibold">Speichern</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#objekt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      if (id) {
        await API.updateObjekt(id, data);
        toast('Objekt aktualisiert', 'success');
      } else {
        await API.createObjekt(data);
        toast('Objekt angelegt', 'success');
      }
      AppState.objekte = await API.listObjekte();
      modal.remove();
      renderObjekteGrid();
      if (!AppState.currentObjektId && AppState.objekte.length) AppState.currentObjektId = AppState.objekte[0].id;
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

async function deleteObjektConfirm(id) {
  if (!confirm('Objekt inkl. aller Wohnungen, Mieter und Daten wirklich löschen?')) return;
  await API.deleteObjekt(id);
  AppState.objekte = await API.listObjekte();
  if (AppState.currentObjektId === id) AppState.currentObjektId = AppState.objekte[0]?.id || null;
  renderObjekteGrid();
  toast('Objekt gelöscht', 'success');
}

async function showWohnungen(objektId) {
  AppState.currentObjektId = objektId;
  location.hash = '#/admin/wohnungen';
}

// -------- Wohnungen-Liste eines Objekts --------
registerRoute('/admin/wohnungen', async (app) => {
  await ensureObjekteLoaded();
  app.innerHTML = renderLayout('objekte', `<div id="wohnungen-content"></div>`, { title: 'Wohnungen' });
  attachLayoutHandlers(() => renderWohnungenList());
  await renderWohnungenList();
});

async function renderWohnungenList() {
  const container = document.getElementById('wohnungen-content');
  container.innerHTML = `<div class="flex items-center justify-center py-16"><div class="spinner"></div></div>`;
  const objektId = AppState.currentObjektId;
  const objekt = currentObjekt();
  const wohnungen = await API.listWohnungen(objektId);

  container.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <div>
        <a href="#/admin/objekte" class="text-sm text-blue-600 hover:underline"><i class="fas fa-arrow-left mr-1"></i> Zurück zu Objekten</a>
        <h2 class="text-xl font-bold text-slate-800 mt-1">${escapeHtml(objekt?.name || '')}</h2>
      </div>
      <button id="btn-new-wohnung" class="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"><i class="fas fa-plus mr-1"></i> Wohnung anlegen</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="wohnungen-grid">
      ${wohnungen.map((w) => `
        <div class="card p-4">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-bold text-slate-800">${escapeHtml(w.bezeichnung)}</h3>
              <p class="text-slate-500 text-sm">${escapeHtml(w.lage)} · ${fmtNum(w.flaeche_m2)} m²</p>
            </div>
            <button class="text-slate-400 hover:text-blue-600" onclick="openWohnungModal(${w.id})"><i class="fas fa-pen"></i></button>
          </div>
          <a href="#/admin/wohnung/${w.id}" class="mt-3 block text-center bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium">
            <i class="fas fa-eye mr-1"></i> Details & Mieter
          </a>
        </div>
      `).join('') || `<p class="text-slate-400 col-span-3 text-center py-8">Keine Wohnungen angelegt.</p>`}
    </div>
  `;

  document.getElementById('btn-new-wohnung').addEventListener('click', () => openWohnungModal());
}

function openWohnungModal(id) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4';
  const isNew = !id;
  let wohnung = {};

  const render = () => {
    modal.innerHTML = `
      <div class="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 class="text-lg font-bold mb-4">${isNew ? 'Neue Wohnung' : 'Wohnung bearbeiten'}</h2>
        <form id="wohnung-form" class="space-y-3">
          <div><label class="text-xs font-semibold text-slate-500">Bezeichnung (z.B. W1) *</label><input class="form-input" name="bezeichnung" required value="${escapeHtml(wohnung.bezeichnung || '')}"></div>
          <div><label class="text-xs font-semibold text-slate-500">Lage (z.B. EG links)</label><input class="form-input" name="lage" value="${escapeHtml(wohnung.lage || '')}"></div>
          <div><label class="text-xs font-semibold text-slate-500">Wohnfläche (m²) *</label><input class="form-input" type="number" step="0.01" name="flaeche_m2" required value="${wohnung.flaeche_m2 || ''}"></div>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" class="px-4 py-2 rounded-lg text-slate-600 bg-slate-100" onclick="this.closest('.fixed').remove()">Abbrechen</button>
            <button type="submit" class="px-4 py-2 rounded-lg text-white bg-blue-700 font-semibold">Speichern</button>
          </div>
        </form>
      </div>
    `;
    modal.querySelector('#wohnung-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      data.flaeche_m2 = Number(data.flaeche_m2);
      try {
        if (isNew) {
          await API.createWohnung(AppState.currentObjektId, data);
          toast('Wohnung angelegt', 'success');
        } else {
          await API.updateWohnung(id, data);
          toast('Wohnung aktualisiert', 'success');
        }
        modal.remove();
        renderWohnungenList();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  if (!isNew) {
    API.getWohnung(id).then((w) => { wohnung = w; render(); });
  } else {
    render();
  }
  document.body.appendChild(modal);
}
