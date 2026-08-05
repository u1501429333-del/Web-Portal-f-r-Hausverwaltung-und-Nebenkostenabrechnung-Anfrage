// ============================================================
// Admin: Stammdaten / Branding (App-Name, Logo) + Demo-Daten-Generator
// ============================================================
registerRoute('/admin/einstellungen', async (app) => {
  await ensureObjekteLoaded();
  app.innerHTML = renderLayout('einstellungen', `<div id="est-content" class="flex items-center justify-center py-16"><div class="spinner"></div></div>`, { title: 'Stammdaten / Branding' });
  attachLayoutHandlers(() => router());
  await loadEinstellungen();
});

async function loadEinstellungen() {
  const container = document.getElementById('est-content');
  const branding = await API.getEinstellungen();
  AppState.branding = branding;

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-6">
        <h3 class="font-bold text-slate-700 mb-1"><i class="fas fa-signature text-blue-600 mr-1"></i> App-Name &amp; Logo</h3>
        <p class="text-sm text-slate-500 mb-4">Der App-Name und das Logo erscheinen im Menü, auf der Login-Seite und im Briefkopf aller erzeugten Dokumente (Nebenkostenabrechnung, Mietvertrag, Hausordnung, Wohnungsübergabe, Reinigungsplan).</p>
        <form id="branding-form" class="space-y-4">
          <div>
            <label class="text-xs font-semibold text-slate-500">App-Name</label>
            <input class="form-input" name="app_name" value="${escapeHtml(branding.app_name || '')}" placeholder="Hausverwaltung Portal">
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500">Logo (PNG/JPG, empfohlen max. 500 KB, transparenter Hintergrund)</label>
            <input class="form-input" type="file" name="logo_file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
            <div id="logo-preview-wrap" class="mt-3 flex items-center gap-4 ${branding.logo_data_url ? '' : 'hidden'}">
              <img id="logo-preview" src="${branding.logo_data_url || ''}" alt="Logo-Vorschau" class="h-16 max-w-[160px] object-contain border rounded bg-slate-50 p-1">
              <button type="button" id="btn-remove-logo" class="text-sm text-red-600 hover:underline"><i class="fas fa-trash mr-1"></i>Logo entfernen</button>
            </div>
          </div>
          <button type="submit" class="bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold"><i class="fas fa-save mr-1"></i> Speichern</button>
        </form>
      </div>

      <div class="card p-6">
        <h3 class="font-bold text-slate-700 mb-1"><i class="fas fa-flask text-emerald-600 mr-1"></i> Demo-/Beispieldaten generieren</h3>
        <p class="text-sm text-slate-500 mb-4">Erstellt flexibel ein komplettes Beispiel-Objekt mit beliebig vielen Wohnungen, Mietern, Zählern, zwei Abrechnungsjahren und allen 17 BetrKV-Kostenarten – ideal zum Ausprobieren oder als Vorlage für Schulungen.</p>
        <form id="demo-form" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-semibold text-slate-500">Anzahl Wohnungen</label>
              <input class="form-input" type="number" name="anzahl_wohnungen" min="1" max="30" value="6">
            </div>
            <div>
              <label class="text-xs font-semibold text-slate-500">Abrechnungsjahr (aktuell)</label>
              <input class="form-input" type="number" name="jahr" value="${new Date().getFullYear()}">
            </div>
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500">Objekt-/Beispielname</label>
            <input class="form-input" name="name" placeholder="z.B. Demo Mehrfamilienhaus">
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500">E-Mail-Domain für Demo-Mieter</label>
            <input class="form-input" name="email_domain" value="beispiel-demo.de">
          </div>
          <label class="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="create_logins" checked> Mieter-Portal-Logins für alle Demo-Mieter automatisch anlegen
          </label>
          <button type="submit" class="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold"><i class="fas fa-magic mr-1"></i> Demo-Objekt erstellen</button>
        </form>
        <div id="demo-result" class="hidden mt-4"></div>
      </div>
    </div>
  `;

  // ---- Branding-Formular ----
  let pendingLogoDataUrl = branding.logo_data_url || '';
  const fileInput = container.querySelector('input[name="logo_file"]');
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 900_000) {
      toast('Datei zu groß (max. ca. 650 KB als Bilddatei empfohlen)', 'error');
      fileInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingLogoDataUrl = reader.result;
      const wrap = document.getElementById('logo-preview-wrap');
      const img = document.getElementById('logo-preview');
      img.src = pendingLogoDataUrl;
      wrap.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  const removeBtn = document.getElementById('btn-remove-logo');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      pendingLogoDataUrl = '';
      document.getElementById('logo-preview-wrap').classList.add('hidden');
      fileInput.value = '';
    });
  }

  document.getElementById('branding-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    try {
      const updated = await API.updateEinstellungen({ app_name: fd.app_name, logo_data_url: pendingLogoDataUrl });
      AppState.branding = updated;
      toast('Stammdaten gespeichert', 'success');
      router(); // Sidebar/Header mit neuem Branding neu rendern
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // ---- Demo-Generator-Formular ----
  document.getElementById('demo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.anzahl_wohnungen = Number(data.anzahl_wohnungen) || 6;
    data.jahr = Number(data.jahr) || new Date().getFullYear();
    data.create_logins = fd.has('create_logins');
    const resultBox = document.getElementById('demo-result');
    resultBox.classList.remove('hidden');
    resultBox.innerHTML = `<div class="flex items-center gap-2 text-slate-500 text-sm"><div class="spinner-sm"></div> Demo-Daten werden erstellt...</div>`;
    try {
      const res = await API.generateDemo(data);
      AppState.objekte = []; // Objektliste neu laden erzwingen
      let credRows = '';
      if (res.credentials && res.credentials.length) {
        credRows = `
          <div class="mt-3 max-h-56 overflow-y-auto border rounded-lg">
            <table class="data-table w-full text-xs">
              <thead><tr><th>Mieter</th><th>E-Mail</th><th>Passwort</th></tr></thead>
              <tbody>
                ${res.credentials.map((c) => `<tr><td>${escapeHtml(c.name)}</td><td><code>${escapeHtml(c.email)}</code></td><td><code>${escapeHtml(c.password)}</code></td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          <p class="text-xs text-slate-500 mt-2">Diese Zugangsdaten werden nur einmalig angezeigt – bitte notieren oder an die (Demo-)Mieter weitergeben.</p>
        `;
      }
      resultBox.innerHTML = `
        <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p class="font-semibold text-emerald-700"><i class="fas fa-check-circle mr-1"></i> Demo-Objekt erfolgreich erstellt (${res.anzahl_wohnungen} Wohnungen, Jahre ${res.jahre.join(' & ')})</p>
          <a href="#/admin/objekte" class="text-sm text-blue-600 hover:underline"><i class="fas fa-arrow-right mr-1"></i>Zu den Objekten wechseln</a>
          ${credRows}
        </div>
      `;
      toast('Demo-Daten erstellt', 'success');
    } catch (err) {
      resultBox.innerHTML = `<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">${escapeHtml(err.message)}</div>`;
      toast(err.message, 'error');
    }
  });
}
