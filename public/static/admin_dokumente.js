// ============================================================
// Admin: Dokumente (Hausordnung, Reinigungsplan, Mietverträge)
// ============================================================
registerRoute('/admin/dokumente', async (app) => {
  await ensureObjekteLoaded();
  app.innerHTML = renderLayout('dokumente', `<div id="doc-content" class="flex items-center justify-center py-16"><div class="spinner"></div></div>`, { title: 'Dokumente' });
  attachLayoutHandlers(() => loadDokumente());
  await loadDokumente();
});

const DOC_TYP_LABELS = {
  mietvertrag: '<span class="badge bg-blue-100 text-blue-700"><i class="fas fa-file-contract mr-1"></i>Mietvertrag</span>',
  hausordnung: '<span class="badge bg-purple-100 text-purple-700"><i class="fas fa-scroll mr-1"></i>Hausordnung</span>',
  reinigungsplan: '<span class="badge bg-emerald-100 text-emerald-700"><i class="fas fa-broom mr-1"></i>Reinigungsplan</span>',
  sonstige: '<span class="badge bg-slate-100 text-slate-600">Sonstige</span>',
};

async function loadDokumente() {
  const container = document.getElementById('doc-content');
  container.innerHTML = `<div class="flex items-center justify-center py-16"><div class="spinner"></div></div>`;
  const objektId = AppState.currentObjektId;
  const dokumente = await API.listDokumente(objektId);

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="card p-5">
        <i class="fas fa-scroll text-3xl text-purple-500 mb-2"></i>
        <h3 class="font-bold text-slate-700">Hausordnung</h3>
        <p class="text-sm text-slate-500 mb-3">Erstellt eine rechtskonforme Hausordnung mit Ruhezeiten, Treppenhausregeln, Müllentsorgung u.v.m.</p>
        <button id="btn-gen-hausordnung" class="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-semibold"><i class="fas fa-magic mr-1"></i> Generieren</button>
      </div>
      <div class="card p-5">
        <i class="fas fa-broom text-3xl text-emerald-500 mb-2"></i>
        <h3 class="font-bold text-slate-700">Treppenreinigungsplan</h3>
        <p class="text-sm text-slate-500 mb-3">Erstellt einen Rotationsplan für die Treppenhausreinigung basierend auf allen Wohnungen des Objekts.</p>
        <button id="btn-gen-reinigungsplan" class="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold"><i class="fas fa-magic mr-1"></i> Generieren</button>
      </div>
      <div class="card p-5">
        <i class="fas fa-file-contract text-3xl text-blue-500 mb-2"></i>
        <h3 class="font-bold text-slate-700">Mietvertrag</h3>
        <p class="text-sm text-slate-500 mb-3">Mietverträge werden direkt bei einem Mieter über die Wohnungsdetailseite erstellt (Symbol <i class="fas fa-file-contract"></i>).</p>
        <a href="#/admin/wohnungen" class="w-full block text-center bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold"><i class="fas fa-arrow-right mr-1"></i> Zu den Wohnungen</a>
      </div>
    </div>

    <div class="card p-5">
      <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-folder-open text-blue-600 mr-1"></i> Erstellte Dokumente</h3>
      <table class="data-table w-full text-sm">
        <thead><tr><th>Typ</th><th>Titel</th><th>Erstellt am</th><th></th></tr></thead>
        <tbody>
          ${dokumente.map((d) => `
            <tr>
              <td>${DOC_TYP_LABELS[d.typ] || d.typ}</td>
              <td>${escapeHtml(d.titel)}</td>
              <td class="text-slate-500">${new Date(d.erstellt_am).toLocaleString('de-DE')}</td>
              <td class="flex gap-3 justify-end">
                <a href="${API.dokumentHtmlUrl(d.id)}" target="_blank" class="text-blue-600 hover:underline text-xs"><i class="fas fa-print mr-1"></i>Öffnen/Drucken</a>
                <button class="text-slate-400 hover:text-red-600 text-xs" onclick="deleteDokumentConfirm(${d.id})"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="4" class="text-center text-slate-400 py-6">Noch keine Dokumente erstellt.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-gen-hausordnung').addEventListener('click', async () => {
    try {
      const res = await API.generateHausordnung(objektId);
      window.open(API.dokumentHtmlUrl(res.id), '_blank');
      toast('Hausordnung erstellt', 'success');
      loadDokumente();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('btn-gen-reinigungsplan').addEventListener('click', async () => {
    try {
      const jahr = AppState.currentJahr;
      const res = await API.generateReinigungsplan(objektId, jahr);
      window.open(API.dokumentHtmlUrl(res.id), '_blank');
      toast('Reinigungsplan erstellt', 'success');
      loadDokumente();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

async function deleteDokumentConfirm(id) {
  if (!confirm('Dokument wirklich löschen?')) return;
  await API.deleteDokument(id);
  loadDokumente();
  toast('Dokument gelöscht', 'success');
}
