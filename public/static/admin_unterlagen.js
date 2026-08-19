// ============================================================
// Admin: Unterlagen (Steuerberater-Dokumente + Mieter-Uploads, z.B. Zählerfotos)
// ============================================================
registerRoute('/admin/unterlagen', async (app) => {
  await ensureObjekteLoaded();
  app.innerHTML = renderLayout('unterlagen', `<div id="unt-content"><div class="flex items-center justify-center py-16"><div class="spinner"></div></div></div>`, { title: 'Unterlagen' });
  attachLayoutHandlers(() => loadUnterlagen());
  await loadUnterlagen();
});

let unterlagenFilterOrdner = '';

const ORDNER_LABEL = { allgemein: 'Allgemein', steuerberater: 'Steuerberater (steuerliche Dokumente)', zaehlerfotos: 'Zählerfotos' };

async function loadUnterlagen() {
  const container = document.getElementById('unt-content');
  container.innerHTML = `<div class="flex items-center justify-center py-16"><div class="spinner"></div></div>`;
  const objektId = AppState.currentObjektId;
  const liste = await API.listUnterlagenByObjekt(objektId, unterlagenFilterOrdner || undefined);

  const filterBtn = (val, label) => `<button class="filter-ordner-btn px-3 py-1.5 rounded-lg text-xs font-medium border ${unterlagenFilterOrdner === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200'}" data-ordner="${val}">${label}</button>`;

  container.innerHTML = `
    <div class="card p-5 mb-5">
      <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-upload mr-1"></i> Neues Dokument hochladen (z. B. steuerliche Unterlagen als PDF)</h3>
      <form id="unt-upload-form" class="flex flex-wrap items-end gap-3">
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Ordner</label>
          <select id="unt-ordner" class="form-input !py-1.5 text-sm">
            <option value="allgemein">Allgemein</option>
            <option value="steuerberater">Steuerberater (steuerliche Dokumente)</option>
            <option value="zaehlerfotos">Zählerfotos</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Beschreibung</label>
          <input type="text" id="unt-beschreibung" class="form-input !py-1.5 text-sm" placeholder="z. B. Jahresabschluss 2025">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Datei (max. 5 MB)</label>
          <input type="file" id="unt-file" class="form-input !py-1.5 text-sm" accept=".pdf,.jpg,.jpeg,.png">
        </div>
        <button type="submit" class="bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2 rounded-lg text-sm">
          <i class="fas fa-cloud-arrow-up mr-1"></i> Hochladen
        </button>
      </form>
    </div>

    <div class="mb-4 flex items-center gap-2">
      ${filterBtn('', 'Alle')}
      ${filterBtn('steuerberater', 'Steuerberater')}
      ${filterBtn('zaehlerfotos', 'Zählerfotos')}
      ${filterBtn('allgemein', 'Allgemein')}
    </div>

    <div class="card p-0 overflow-hidden">
      <table class="data-table w-full text-sm">
        <thead><tr>
          <th>Datei</th><th>Ordner</th><th>Beschreibung</th><th>Von</th><th>Wohnung</th><th>Größe</th><th>Hochgeladen am</th><th></th>
        </tr></thead>
        <tbody>
          ${liste.length ? liste.map((u) => `
            <tr>
              <td class="font-medium"><i class="fas ${u.content_type?.includes('pdf') ? 'fa-file-pdf text-red-500' : 'fa-file-image text-blue-500'} mr-1"></i>${escapeHtml(u.dateiname)}</td>
              <td>${ORDNER_LABEL[u.ordner] || escapeHtml(u.ordner)}</td>
              <td>${escapeHtml(u.beschreibung || '—')}</td>
              <td>${u.hochgeladen_von === 'admin' ? 'Admin' : 'Mieter'}</td>
              <td>${escapeHtml(u.wohnung_bezeichnung || '—')}</td>
              <td class="text-xs text-slate-500">${((u.groesse_bytes || 0) / 1024).toFixed(0)} KB</td>
              <td class="text-xs text-slate-500">${fmtDate((u.erstellt_am || '').slice(0, 10))}</td>
              <td>
                <button class="text-blue-600 hover:underline text-xs unt-download" data-id="${u.id}" data-name="${escapeHtml(u.dateiname)}">Öffnen</button>
                <button class="text-red-500 hover:underline text-xs ml-2 unt-delete" data-id="${u.id}">Löschen</button>
              </td>
            </tr>
          `).join('') : `<tr><td colspan="8" class="text-center text-slate-400 py-8">Keine Unterlagen vorhanden.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('.filter-ordner-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      unterlagenFilterOrdner = btn.dataset.ordner;
      loadUnterlagen();
    });
  });

  document.getElementById('unt-upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('unt-file');
    const file = fileInput.files[0];
    if (!file) { toast('Bitte eine Datei auswählen', 'error'); return; }
    if (file.size > 5_000_000) { toast('Datei zu groß (max. 5 MB)', 'error'); return; }
    const ordner = document.getElementById('unt-ordner').value;
    const beschreibung = document.getElementById('unt-beschreibung').value;
    try {
      const data_url = await fileToDataUrl(file);
      await API.uploadUnterlage({
        objekt_id: objektId,
        ordner,
        beschreibung,
        dateiname: file.name,
        content_type: file.type,
        data_url,
      });
      toast('Dokument hochgeladen', 'success');
      await loadUnterlagen();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  container.querySelectorAll('.unt-download').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const data = await API.getUnterlageData(btn.dataset.id);
        const w = window.open('', '_blank');
        if (data.content_type?.includes('pdf') || data.content_type?.includes('image')) {
          w.document.write(`<iframe src="${data.data_url}" style="width:100%;height:100vh;border:0;"></iframe>`);
        } else {
          w.location.href = data.data_url;
        }
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });

  container.querySelectorAll('.unt-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Dokument wirklich löschen?')) return;
      try {
        await API.deleteUnterlage(btn.dataset.id);
        toast('Gelöscht', 'success');
        await loadUnterlagen();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
