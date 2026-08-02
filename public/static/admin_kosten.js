// ============================================================
// Admin: Kosten erfassen (17 BetrKV-Kostenarten + Gas-Aufteilung)
// ============================================================
registerRoute('/admin/kosten', async (app) => {
  await ensureObjekteLoaded();
  app.innerHTML = renderLayout('kosten', `<div id="kosten-content" class="flex items-center justify-center py-16"><div class="spinner"></div></div>`, { title: 'Kosten erfassen' });
  attachLayoutHandlers(() => loadKosten());
  await loadKosten();
});

const VERTEILER_LABELS = {
  flaeche: 'Wohnfläche (m²)',
  personen: 'Personen',
  einheiten: 'Wohneinheit (WE)',
  wasser_verbrauch: 'Wasserverbrauch (m³)',
  heizung_30_70: '30/70 Heizung (§7 HeizkostenV)',
  warmwasser_30_70: '30/70 Warmwasser (§8 HeizkostenV)',
  individuell: 'Individuell / gleichmäßig',
};

async function loadKosten() {
  const container = document.getElementById('kosten-content');
  container.innerHTML = `<div class="flex items-center justify-center py-16"><div class="spinner"></div></div>`;
  const objektId = AppState.currentObjektId;
  const jahr = AppState.currentJahr;

  const [kosten, gas] = await Promise.all([
    API.listKosten(objektId, jahr),
    API.getGas(objektId, jahr),
  ]);

  const gesamt = kosten.reduce((s, k) => s + (k.betrag || 0), 0);

  container.innerHTML = `
    <div class="card p-5 mb-5 bg-amber-50 border border-amber-200">
      <h3 class="font-bold text-amber-800 mb-2"><i class="fas fa-fire mr-1"></i> Gas-Jahresrechnung (automatische Heizung/Warmwasser-Aufteilung)</h3>
      <p class="text-sm text-amber-700 mb-3">Tragen Sie hier den Gesamtbetrag der Versorger-Jahresrechnung ein. Die Aufteilung auf "Heizung Gas" und "Warmwasser Gas" erfolgt automatisch proportional zu den WMZ-Verbrauchswerten (Heizungszähler vs. Boiler-Zähler) gemäß HeizkostenV §7/§8 — sofern die jeweilige Kostenposition unten auf 0 gesetzt ist.</p>
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-amber-800">Gas-Gesamtbetrag ${jahr} (€):</label>
        <input type="number" step="0.01" id="gas-gesamtbetrag" class="form-input !w-40" value="${gas.gesamtbetrag || 0}">
        <button id="btn-save-gas" class="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Speichern</button>
      </div>
    </div>

    <div class="card p-5">
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-slate-700"><i class="fas fa-file-invoice-dollar text-blue-600 mr-1"></i> Betriebskostenarten §2 BetrKV — Jahr ${jahr}</h3>
        <button id="btn-new-kostenart" class="text-sm text-blue-600 font-semibold"><i class="fas fa-plus mr-1"></i> Kostenart hinzufügen</button>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table w-full text-sm">
          <thead><tr><th>Nr</th><th>Kostenart</th><th>Verteilerschlüssel</th><th class="text-right">Jahresbetrag €</th><th></th></tr></thead>
          <tbody>
            ${kosten.map((k) => `
              <tr>
                <td>${k.nr}</td>
                <td>${escapeHtml(k.bezeichnung)} ${(k.verteilerschluessel === 'heizung_30_70' || k.verteilerschluessel === 'warmwasser_30_70') ? '<span class="badge bg-amber-100 text-amber-700 ml-1">Auto (Gas)</span>' : ''}</td>
                <td class="text-xs text-slate-500">${VERTEILER_LABELS[k.verteilerschluessel] || k.verteilerschluessel}</td>
                <td class="text-right">
                  <input type="number" step="0.01" class="form-input !py-1 !w-32 text-right inline-kosten" data-kostenart-id="${k.id}" value="${k.betrag ?? 0}">
                </td>
                <td class="flex gap-2 justify-end">
                  <button class="text-blue-600 hover:underline text-xs save-kosten" data-kostenart-id="${k.id}">Speichern</button>
                  <button class="text-slate-400 hover:text-red-600 text-xs" onclick="deleteKostenartConfirm(${k.id})"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="font-bold bg-slate-100"><td colspan="3">GESAMT</td><td class="text-right">${fmtEuro(gesamt)}</td><td></td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-save-gas').addEventListener('click', async () => {
    const betrag = Number(document.getElementById('gas-gesamtbetrag').value);
    await API.setGas(objektId, jahr, { gesamtbetrag: betrag });
    toast('Gas-Jahresrechnung gespeichert', 'success');
    loadKosten();
  });

  container.querySelectorAll('.save-kosten').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const kid = btn.dataset.kostenartId;
      const input = container.querySelector(`.inline-kosten[data-kostenart-id="${kid}"]`);
      const betrag = Number(input.value);
      try {
        await API.setKosten(objektId, jahr, { kostenart_id: kid, betrag });
        toast('Kosten gespeichert', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });

  document.getElementById('btn-new-kostenart').addEventListener('click', () => openKostenartModal(objektId));
}

function openKostenartModal(objektId) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-6 w-full max-w-md">
      <h2 class="text-lg font-bold mb-4">Neue Kostenart</h2>
      <form id="ka-form" class="space-y-3">
        <div><label class="text-xs font-semibold text-slate-500">Nr *</label><input class="form-input" type="number" name="nr" required></div>
        <div><label class="text-xs font-semibold text-slate-500">Bezeichnung *</label><input class="form-input" name="bezeichnung" required></div>
        <div><label class="text-xs font-semibold text-slate-500">Verteilerschlüssel *</label>
          <select class="form-input" name="verteilerschluessel" required>
            ${Object.entries(VERTEILER_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
        </div>
        <div><label class="text-xs font-semibold text-slate-500">Beschreibung</label><input class="form-input" name="beschreibung"></div>
        <div class="flex justify-end gap-2 mt-4">
          <button type="button" class="px-4 py-2 rounded-lg text-slate-600 bg-slate-100" onclick="this.closest('.fixed').remove()">Abbrechen</button>
          <button type="submit" class="px-4 py-2 rounded-lg text-white bg-blue-700 font-semibold">Speichern</button>
        </div>
      </form>
    </div>
  `;
  modal.querySelector('#ka-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.objekt_id = objektId;
    data.nr = Number(data.nr);
    try {
      await API.createKostenart(data);
      toast('Kostenart angelegt', 'success');
      modal.remove();
      loadKosten();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
  document.body.appendChild(modal);
}

async function deleteKostenartConfirm(id) {
  if (!confirm('Kostenart wirklich löschen?')) return;
  await API.deleteKostenart(id);
  loadKosten();
  toast('Kostenart gelöscht', 'success');
}
