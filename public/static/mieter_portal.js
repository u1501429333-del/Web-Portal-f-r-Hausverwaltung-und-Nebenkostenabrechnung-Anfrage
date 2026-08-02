// ============================================================
// Mieter-Portal
// ============================================================

async function getMieterWohnung() {
  const mieter = await API.getMieter(AppState.user.mieterId);
  const wohnung = await API.getWohnung(mieter.wohnung_id);
  return { mieter, wohnung };
}

registerRoute('/mieter', async (app) => {
  app.innerHTML = renderLayout('dashboard', `<div id="m-dash" class="flex items-center justify-center py-16"><div class="spinner"></div></div>`, { title: 'Meine Übersicht' });
  attachLayoutHandlersMieter();
  await loadMieterDashboard();
});

function attachLayoutHandlersMieter() {
  const jahrSel = document.getElementById('jahr-selector');
  if (jahrSel) {
    jahrSel.addEventListener('change', (e) => {
      AppState.currentJahr = Number(e.target.value);
      router();
    });
  }
}

async function loadMieterDashboard() {
  const container = document.getElementById('m-dash');
  const jahr = AppState.currentJahr;
  try {
    const { mieter, wohnung } = await getMieterWohnung();
    const res = await API.getWohnungAbrechnung(wohnung.id, jahr);
    const a = res.abrechnung;
    const vj = res.vorjahr;

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div class="card p-5">
          <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-home text-blue-600 mr-1"></i> Meine Wohnung</h3>
          <p class="text-lg font-bold">${escapeHtml(wohnung.bezeichnung)} · ${escapeHtml(wohnung.lage)}</p>
          <p class="text-slate-500">${fmtNum(wohnung.flaeche_m2)} m² · ${mieter.personen} Person(en)</p>
          <p class="text-slate-500 text-sm mt-2">Mietbeginn: ${fmtDate(mieter.mietbeginn)}</p>
        </div>
        <div class="card p-5 ${a.status === 'Nachzahlung' ? 'border-l-4 border-red-500' : a.status === 'Guthaben' ? 'border-l-4 border-emerald-500' : 'border-l-4 border-slate-300'}">
          <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-euro-sign text-blue-600 mr-1"></i> Nebenkosten ${jahr}</h3>
          <p class="text-2xl font-bold">${fmtEuro(a.summe_nebenkosten_tag_genau)}</p>
          <p class="text-sm mt-1 ${a.status === 'Nachzahlung' ? 'text-red-600' : a.status === 'Guthaben' ? 'text-emerald-600' : 'text-slate-500'} font-semibold">${a.status}: ${fmtEuro(Math.abs(a.differenz))}</p>
          ${vj ? `<p class="text-xs text-slate-400 mt-2">Vorjahr ${jahr-1}: ${fmtEuro(vj.summe_nebenkosten_tag_genau)}</p>` : ''}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="card p-4">
          <div class="text-slate-500 text-xs mb-1"><i class="fas fa-temperature-three-quarters mr-1"></i>Heizung (WMZ)</div>
          <div class="text-xl font-bold">${fmtNum(a.verbrauch.wmz_heizung_verbrauch)} kWh</div>
          ${vj ? vergleichSpan(a.verbrauch.wmz_heizung_verbrauch, vj.verbrauch.wmz_heizung_verbrauch) : ''}
        </div>
        <div class="card p-4">
          <div class="text-slate-500 text-xs mb-1"><i class="fas fa-droplet mr-1"></i>Warmwasser</div>
          <div class="text-xl font-bold">${fmtNum(a.verbrauch.ww_verbrauch)} m³</div>
          ${vj ? vergleichSpan(a.verbrauch.ww_verbrauch, vj.verbrauch.ww_verbrauch) : ''}
        </div>
        <div class="card p-4">
          <div class="text-slate-500 text-xs mb-1"><i class="fas fa-faucet-drip mr-1"></i>Kaltwasser</div>
          <div class="text-xl font-bold">${fmtNum(a.verbrauch.kw_verbrauch)} m³</div>
          ${vj ? vergleichSpan(a.verbrauch.kw_verbrauch, vj.verbrauch.kw_verbrauch) : ''}
        </div>
      </div>

      <div class="card p-5">
        <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-list-check text-blue-600 mr-1"></i> Schnellzugriff</h3>
        <div class="flex gap-3 flex-wrap">
          <a href="#/mieter/zaehler" class="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"><i class="fas fa-gauge mr-1"></i> Zählerstand melden</a>
          <a href="#/mieter/abrechnung" class="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"><i class="fas fa-file-invoice mr-1"></i> Abrechnung ansehen/drucken</a>
          <a href="#/mieter/historie" class="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold"><i class="fas fa-chart-line mr-1"></i> Verlauf ansehen</a>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card p-6 border-l-4 border-amber-500"><p class="text-slate-600">${escapeHtml(err.message)}</p><p class="text-xs text-slate-400 mt-2">Für dieses Jahr liegen noch keine vollständigen Abrechnungsdaten vor.</p></div>`;
  }
}

function vergleichSpan(aktuell, alt) {
  if (!alt) return '';
  const diffPct = ((aktuell - alt) / alt) * 100;
  if (Math.abs(diffPct) < 0.5) return '<div class="text-xs text-slate-400 mt-1">≈ Vorjahr</div>';
  const cls = diffPct > 0 ? 'text-red-600' : 'text-emerald-600';
  const arrow = diffPct > 0 ? '▲' : '▼';
  return `<div class="text-xs ${cls} mt-1 font-semibold">${arrow} ${Math.abs(diffPct).toFixed(1)}% vs. Vorjahr</div>`;
}

// -------- Zählerstand melden --------
registerRoute('/mieter/zaehler', async (app) => {
  app.innerHTML = renderLayout('zaehler', `<div id="m-zs" class="flex items-center justify-center py-16"><div class="spinner"></div></div>`, { title: 'Zählerstand melden' });
  attachLayoutHandlersMieter();
  await loadMieterZaehler();
});

async function loadMieterZaehler() {
  const container = document.getElementById('m-zs');
  const jahr = AppState.currentJahr;
  const { wohnung } = await getMieterWohnung();
  const zaehlerListe = await API.listZaehlerMitStand(wohnung.objekt_id, jahr);
  const eigene = zaehlerListe.filter((z) => z.wohnung_id === wohnung.id);

  container.innerHTML = `
    <div class="card p-5 mb-4 bg-blue-50 border border-blue-200">
      <p class="text-sm text-blue-800"><i class="fas fa-circle-info mr-1"></i> Bitte tragen Sie hier Ihre aktuellen Zählerstände für das Jahr <b>${jahr}</b> ein. Der Verbrauch wird automatisch anhand des Vorjahreswerts berechnet.</p>
    </div>
    <div class="card p-5">
      <table class="data-table w-full text-sm">
        <thead><tr><th>Zähler</th><th class="text-right">Vorjahr (${jahr - 1})</th><th class="text-right">Aktueller Stand (${jahr})</th><th>Ablesedatum</th><th></th></tr></thead>
        <tbody>
          ${eigene.map((z) => `
            <tr>
              <td>${zaehlerTypLabel(z.typ)} ${escapeHtml(z.bezeichnung)} ${z.ebene ? '<span class="text-xs text-slate-400">(' + escapeHtml(z.ebene) + ')</span>' : ''}</td>
              <td class="text-right text-slate-500">${z.stand_vorjahr != null ? fmtNum(z.stand_vorjahr) : '—'} ${escapeHtml(z.einheit)}</td>
              <td class="text-right"><input type="number" step="0.01" class="form-input !py-1 !w-32 text-right m-inline-stand" data-zaehler-id="${z.id}" value="${z.stand_aktuell ?? ''}"></td>
              <td><input type="date" class="form-input !py-1 !text-xs m-inline-datum" data-zaehler-id="${z.id}" value="${z.ablesedatum_aktuell || ''}"></td>
              <td><button class="text-blue-600 hover:underline text-xs m-save-stand" data-zaehler-id="${z.id}">Speichern</button></td>
            </tr>
          `).join('') || '<tr><td colspan="5" class="text-center text-slate-400 py-6">Keine Zähler zugeordnet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('.m-save-stand').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const zid = btn.dataset.zaehlerId;
      const standInput = container.querySelector(`.m-inline-stand[data-zaehler-id="${zid}"]`);
      const datumInput = container.querySelector(`.m-inline-datum[data-zaehler-id="${zid}"]`);
      const stand = Number(standInput.value);
      if (Number.isNaN(stand) || standInput.value === '') {
        toast('Bitte einen gültigen Zählerstand eingeben', 'error');
        return;
      }
      try {
        await API.setZaehlerStand(zid, { jahr, stand, ablesedatum: datumInput.value || null });
        toast('Zählerstand gespeichert', 'success');
        loadMieterZaehler();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });
}

// -------- Verlauf & Vergleich --------
registerRoute('/mieter/historie', async (app) => {
  app.innerHTML = renderLayout('historie', `<div id="m-hist" class="flex items-center justify-center py-16"><div class="spinner"></div></div>`, { title: 'Verlauf & Vergleich' });
  attachLayoutHandlersMieter();
  await loadMieterHistorie();
});

async function loadMieterHistorie() {
  const container = document.getElementById('m-hist');
  const { wohnung } = await getMieterWohnung();
  const historie = await API.getWohnungHistorie(wohnung.id);

  if (!historie.length) {
    container.innerHTML = `<div class="card p-8 text-center text-slate-400">Noch keine Verlaufsdaten vorhanden.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card p-5">
        <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-fire text-orange-500 mr-1"></i> Verbrauch über die Jahre</h3>
        <canvas id="chart-verbrauch-hist" height="240"></canvas>
      </div>
      <div class="card p-5">
        <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-euro-sign text-blue-600 mr-1"></i> Nebenkosten &amp; Vorauszahlung</h3>
        <canvas id="chart-kosten-hist" height="240"></canvas>
      </div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-table text-blue-600 mr-1"></i> Datenübersicht</h3>
      <table class="data-table w-full text-sm">
        <thead><tr><th>Jahr</th><th class="text-right">Heizung kWh</th><th class="text-right">Warmwasser m³</th><th class="text-right">Kaltwasser m³</th><th class="text-right">Nebenkosten</th><th class="text-right">Vorauszahlung</th><th class="text-right">Differenz</th></tr></thead>
        <tbody>
          ${historie.map((h) => `
            <tr>
              <td class="font-semibold">${h.jahr}</td>
              <td class="text-right">${fmtNum(h.wmz_heizung)}</td>
              <td class="text-right">${fmtNum(h.ww_verbrauch)}</td>
              <td class="text-right">${fmtNum(h.kw_verbrauch)}</td>
              <td class="text-right">${fmtEuro(h.summe_nebenkosten)}</td>
              <td class="text-right text-slate-500">${fmtEuro(h.vorauszahlung)}</td>
              <td class="text-right font-semibold ${h.differenz > 0 ? 'text-red-600' : 'text-emerald-600'}">${fmtEuro(h.differenz)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  new Chart(document.getElementById('chart-verbrauch-hist'), {
    type: 'line',
    data: {
      labels: historie.map((h) => h.jahr),
      datasets: [
        { label: 'Heizung (kWh)', data: historie.map((h) => h.wmz_heizung), borderColor: '#ea580c', backgroundColor: '#ea580c20', tension: 0.3 },
        { label: 'Warmwasser (m³)', data: historie.map((h) => h.ww_verbrauch), borderColor: '#0891b2', backgroundColor: '#0891b220', tension: 0.3, yAxisID: 'y1' },
        { label: 'Kaltwasser (m³)', data: historie.map((h) => h.kw_verbrauch), borderColor: '#2563eb', backgroundColor: '#2563eb20', tension: 0.3, yAxisID: 'y1' },
      ],
    },
    options: {
      scales: { y: { position: 'left', title: { display: true, text: 'kWh' } }, y1: { position: 'right', title: { display: true, text: 'm³' }, grid: { drawOnChartArea: false } } },
    },
  });

  new Chart(document.getElementById('chart-kosten-hist'), {
    type: 'bar',
    data: {
      labels: historie.map((h) => h.jahr),
      datasets: [
        { label: 'Nebenkosten', data: historie.map((h) => h.summe_nebenkosten), backgroundColor: '#2563eb' },
        { label: 'Vorauszahlung', data: historie.map((h) => h.vorauszahlung), backgroundColor: '#94a3b8' },
      ],
    },
  });
}

// -------- Nebenkostenabrechnung ansehen/drucken --------
registerRoute('/mieter/abrechnung', async (app) => {
  app.innerHTML = renderLayout('abrechnung', `<div id="m-abr" class="flex items-center justify-center py-16"><div class="spinner"></div></div>`, { title: 'Nebenkostenabrechnung' });
  attachLayoutHandlersMieter();
  await loadMieterAbrechnung();
});

async function loadMieterAbrechnung() {
  const container = document.getElementById('m-abr');
  const jahr = AppState.currentJahr;
  const { wohnung } = await getMieterWohnung();

  try {
    const res = await API.getWohnungAbrechnung(wohnung.id, jahr);
    const a = res.abrechnung;

    container.innerHTML = `
      <div class="card p-5 mb-4 flex justify-between items-center">
        <p class="text-slate-600">Ihre Nebenkostenabrechnung für das Jahr <b>${jahr}</b> ist bereit.</p>
        <button id="btn-print" class="bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold"><i class="fas fa-print mr-1"></i> Ansehen &amp; als PDF drucken</button>
      </div>
      <div class="card p-5">
        <h3 class="font-bold text-slate-700 mb-3">Kurzübersicht</h3>
        <table class="data-table w-full text-sm">
          <tr><td>Σ Nebenkosten ${jahr} (tag-genau)</td><td class="text-right font-semibold">${fmtEuro(a.summe_nebenkosten_tag_genau)}</td></tr>
          <tr><td>Vorauszahlung geleistet</td><td class="text-right">${fmtEuro(a.vorauszahlung_ist)}</td></tr>
          <tr class="font-bold bg-slate-100"><td>${a.status}</td><td class="text-right">${fmtEuro(Math.abs(a.differenz))}</td></tr>
        </table>
      </div>
    `;
    document.getElementById('btn-print').addEventListener('click', () => {
      window.open(API.abrechnungHtmlUrl(wohnung.id, jahr), '_blank');
    });
  } catch (err) {
    container.innerHTML = `<div class="card p-6 border-l-4 border-amber-500"><p class="text-slate-600">${escapeHtml(err.message)}</p></div>`;
  }
}
