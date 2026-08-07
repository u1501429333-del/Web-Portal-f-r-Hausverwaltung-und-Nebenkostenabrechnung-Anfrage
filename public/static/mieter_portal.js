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

    <div class="card p-5 mb-4">
      <button id="btn-toggle-wmz-hilfe" class="flex items-center justify-between w-full text-left">
        <h3 class="font-bold text-slate-700"><i class="fas fa-circle-question text-blue-600 mr-1"></i> Anleitung: Wärmemengenzähler (WMZ) ablesen — Sensus PolluCom F/E</h3>
        <i class="fas fa-chevron-down text-slate-400" id="wmz-hilfe-chevron"></i>
      </button>
      <div id="wmz-hilfe-body" class="hidden mt-4">
        ${wmzAblesehilfeHtml()}
      </div>
    </div>

    <div class="card p-5">
      <table class="data-table w-full text-sm">
        <thead><tr><th>Zähler</th><th class="text-right">Vorjahr (${jahr - 1})</th><th class="text-right">Aktueller Stand (${jahr})</th><th>Ablesedatum</th><th></th></tr></thead>
        <tbody>
          ${eigene.map((z) => `
            <tr>
              <td>${zaehlerTypLabel(z.typ)} ${escapeHtml(z.bezeichnung)} ${z.ebene ? '<span class="text-xs text-slate-400">(' + escapeHtml(z.ebene) + ')</span>' : ''} ${z.typ === 'wmz_heizung' ? '<span class="text-xs text-slate-400">(kWh bzw. bei älteren Geräten MWh — 1 MWh = 1.000 kWh)</span>' : ''}</td>
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

  const toggleBtn = document.getElementById('btn-toggle-wmz-hilfe');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const body = document.getElementById('wmz-hilfe-body');
      const chevron = document.getElementById('wmz-hilfe-chevron');
      body.classList.toggle('hidden');
      chevron.classList.toggle('fa-chevron-down');
      chevron.classList.toggle('fa-chevron-up');
    });
  }

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

// -------- WMZ-Ablesehilfe (Sensus PolluCom F/E) --------
function wmzAblesehilfeHtml() {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
      <div>
        <img src="/static/img/wmz_anleitung.png" alt="Anleitung Wärmemengenzähler Sensus PolluCom F ablesen" class="w-full rounded-lg border border-slate-200">
        <p class="text-xs text-slate-400 mt-1">Schematische Illustration des Wärmemengenzählers Sensus PolluCom F/E mit Anzeige und Bedientaste.</p>
      </div>
      <div class="text-sm text-slate-700 space-y-3">
        <div>
          <p class="font-semibold text-slate-800 mb-1"><i class="fas fa-eye text-blue-600 mr-1"></i> L1 — Aktuellen Verbrauchswert ablesen</p>
          <p>Kurz auf die rote Taste am Zähler drücken. Im Display erscheint der aktuelle <b>Wärmeverbrauch in MWh (bei neueren Geräten kWh)</b>. <b>Genau dieser Wert</b> ist in das Feld "Aktueller Stand" oben einzutragen (bei MWh-Anzeige: Wert × 1.000 = kWh).</p>
        </div>
        <div>
          <p class="font-semibold text-slate-800 mb-1"><i class="fas fa-layer-group text-blue-600 mr-1"></i> L2–L3 — Weitere Anzeige-Ebenen (nur bei Bedarf)</p>
          <p>Taste ca. <b>8 Sekunden gedrückt halten</b>, danach zweimal kurz (je ca. 2 Sekunden) drücken, um zu Ebene L3 zu wechseln. Dort lassen sich u. a. Volumen (m³), Vorlauf-/Rücklauftemperatur und Leistung ablesen — für die reine Zählerstandsmeldung wird dies i. d. R. <b>nicht</b> benötigt.</p>
        </div>
        <div>
          <p class="font-semibold text-slate-800 mb-1"><i class="fas fa-calendar-days text-blue-600 mr-1"></i> L4–L5 — Monatswerte (historische Ablesungen)</p>
          <p>Mit kurzen Tastendrücken durch die Monate blättern, bis "Today" (heutiger Wert) angezeigt wird. Mit "Return" wieder zur Hauptanzeige zurückkehren.</p>
        </div>
        <div>
          <p class="font-semibold text-slate-800 mb-1"><i class="fas fa-triangle-exclamation text-amber-600 mr-1"></i> L6 — Störungshinweis</p>
          <p>Erscheint im Display ein <b>"F"</b>, liegt eine Störung vor (z. B. Fühlerdefekt). Bitte in diesem Fall den Hausverwalter/Vermieter informieren, damit ein Techniker den Zähler prüfen kann.</p>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <i class="fas fa-lightbulb mr-1"></i> <b>Tipp:</b> Fotografieren Sie das Display bei der Ablesung (Datum + Wert gut lesbar) und laden Sie das Foto im Bereich <a href="#/mieter/unterlagen" class="underline font-semibold">Unterlagen</a> hoch — das erleichtert die Kontrolle bei Rückfragen.
        </div>
      </div>
    </div>
    <div class="mt-4 flex gap-3">
      <a href="/api/dokumente/wmz-ablesehilfe/html" target="_blank" class="text-blue-600 hover:underline text-sm"><i class="fas fa-file-pdf mr-1"></i> Anleitung als PDF öffnen/drucken</a>
    </div>
  `;
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

// -------- Schadensmeldung --------
registerRoute('/mieter/schaeden', async (app) => {
  app.innerHTML = renderLayout('schaeden', `<div id="m-sch" class="flex items-center justify-center py-16"><div class="spinner"></div></div>`, { title: 'Schadensmeldung' });
  attachLayoutHandlersMieter();
  await loadMieterSchaeden();
});

async function loadMieterSchaeden() {
  const container = document.getElementById('m-sch');
  const { wohnung } = await getMieterWohnung();
  const liste = await API.listSchaedenByWohnung(wohnung.id);

  container.innerHTML = `
    <div class="card p-5 mb-5">
      <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-screwdriver-wrench text-blue-600 mr-1"></i> Neue Schadensmeldung erstellen</h3>
      <form id="m-schaden-form" class="space-y-3">
        <div>
          <label class="text-xs font-semibold text-slate-500">Titel *</label>
          <input class="form-input" name="titel" required placeholder="z. B. Heizung funktioniert nicht">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-semibold text-slate-500">Raum</label>
            <select class="form-input" name="raum">
              <option value="">— bitte wählen —</option>
              <option>Küche</option>
              <option>Bad</option>
              <option>Wohnzimmer</option>
              <option>Schlafzimmer</option>
              <option>Flur</option>
              <option>Keller</option>
              <option>Balkon</option>
              <option>Sonstiges</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500">Priorität *</label>
            <select class="form-input" name="prioritaet" required>
              <option value="niedrig">Niedrig</option>
              <option value="mittel" selected>Mittel</option>
              <option value="hoch">Hoch (dringend)</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500">Beschreibung</label>
          <textarea class="form-input" name="beschreibung" rows="3" placeholder="Bitte beschreiben Sie das Problem möglichst genau…"></textarea>
        </div>
        <button type="submit" class="bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold"><i class="fas fa-paper-plane mr-1"></i> Melden</button>
      </form>
    </div>

    <div class="card p-5">
      <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-list text-blue-600 mr-1"></i> Meine Meldungen</h3>
      <div class="space-y-3">
        ${liste.length ? liste.map((s) => `
          <div class="border border-slate-200 rounded-lg p-3">
            <div class="flex justify-between items-start">
              <div>
                <span class="font-semibold">${escapeHtml(s.titel)}</span>
                <span class="text-xs px-2 py-0.5 rounded ml-2 ${SCHADEN_STATUS_COLOR_M[s.status] || ''}">${SCHADEN_STATUS_LABEL_M[s.status] || s.status}</span>
              </div>
              <span class="text-xs text-slate-400">${fmtDate((s.erstellt_am || '').slice(0, 10))}</span>
            </div>
            <p class="text-sm text-slate-600 mt-1">${escapeHtml(s.beschreibung || '')}</p>
            ${s.admin_notiz ? `<div class="mt-2 bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-800"><i class="fas fa-reply mr-1"></i> Rückmeldung: ${escapeHtml(s.admin_notiz)}</div>` : ''}
          </div>
        `).join('') : '<p class="text-slate-400 text-sm">Noch keine Schadensmeldungen vorhanden.</p>'}
      </div>
    </div>
  `;

  document.getElementById('m-schaden-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      await API.createSchaden(data);
      toast('Schadensmeldung übermittelt', 'success');
      e.target.reset();
      await loadMieterSchaeden();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

const SCHADEN_STATUS_LABEL_M = { offen: 'Offen', in_bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt' };
const SCHADEN_STATUS_COLOR_M = { offen: 'bg-red-100 text-red-700', in_bearbeitung: 'bg-amber-100 text-amber-700', erledigt: 'bg-emerald-100 text-emerald-700' };

// -------- Unterlagen (Upload z. B. Zählerfotos) --------
registerRoute('/mieter/unterlagen', async (app) => {
  app.innerHTML = renderLayout('unterlagen', `<div id="m-unt" class="flex items-center justify-center py-16"><div class="spinner"></div></div>`, { title: 'Unterlagen' });
  attachLayoutHandlersMieter();
  await loadMieterUnterlagen();
});

async function loadMieterUnterlagen() {
  const container = document.getElementById('m-unt');
  const { wohnung } = await getMieterWohnung();
  const liste = await API.listUnterlagenByWohnung(wohnung.id);

  container.innerHTML = `
    <div class="card p-5 mb-5">
      <h3 class="font-bold text-slate-700 mb-1"><i class="fas fa-cloud-arrow-up text-blue-600 mr-1"></i> Dokument hochladen</h3>
      <p class="text-sm text-slate-500 mb-3">Laden Sie hier z. B. ein Foto Ihres Wasserzählers, des Ablesedatenblatts oder andere Unterlagen für die Hausverwaltung hoch (max. 5 MB, PDF oder Bild).</p>
      <form id="m-upload-form" class="flex flex-wrap items-end gap-3">
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Beschreibung</label>
          <input type="text" id="m-unt-beschreibung" class="form-input !py-1.5 text-sm" placeholder="z. B. Foto Kaltwasserzähler Küche">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Datei</label>
          <input type="file" id="m-unt-file" class="form-input !py-1.5 text-sm" accept=".pdf,.jpg,.jpeg,.png">
        </div>
        <button type="submit" class="bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2 rounded-lg text-sm">
          <i class="fas fa-upload mr-1"></i> Hochladen
        </button>
      </form>
    </div>

    <div class="card p-0 overflow-hidden">
      <table class="data-table w-full text-sm">
        <thead><tr><th>Datei</th><th>Beschreibung</th><th>Hochgeladen am</th><th></th></tr></thead>
        <tbody>
          ${liste.length ? liste.map((u) => `
            <tr>
              <td class="font-medium"><i class="fas ${u.content_type?.includes('pdf') ? 'fa-file-pdf text-red-500' : 'fa-file-image text-blue-500'} mr-1"></i>${escapeHtml(u.dateiname)}</td>
              <td>${escapeHtml(u.beschreibung || '—')}</td>
              <td class="text-xs text-slate-500">${fmtDate((u.erstellt_am || '').slice(0, 10))}</td>
              <td>
                <button class="text-blue-600 hover:underline text-xs m-unt-download" data-id="${u.id}">Öffnen</button>
                ${u.hochgeladen_von === 'mieter' ? `<button class="text-red-500 hover:underline text-xs ml-2 m-unt-delete" data-id="${u.id}">Löschen</button>` : ''}
              </td>
            </tr>
          `).join('') : '<tr><td colspan="4" class="text-center text-slate-400 py-8">Noch keine Unterlagen hochgeladen.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('m-upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('m-unt-file');
    const file = fileInput.files[0];
    if (!file) { toast('Bitte eine Datei auswählen', 'error'); return; }
    if (file.size > 5_000_000) { toast('Datei zu groß (max. 5 MB)', 'error'); return; }
    const beschreibung = document.getElementById('m-unt-beschreibung').value;
    try {
      const data_url = await fileToDataUrl(file);
      await API.uploadUnterlage({
        wohnung_id: wohnung.id,
        beschreibung,
        dateiname: file.name,
        content_type: file.type,
        data_url,
      });
      toast('Dokument hochgeladen', 'success');
      await loadMieterUnterlagen();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  container.querySelectorAll('.m-unt-download').forEach((btn) => {
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

  container.querySelectorAll('.m-unt-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Dokument wirklich löschen?')) return;
      try {
        await API.deleteUnterlage(btn.dataset.id);
        toast('Gelöscht', 'success');
        await loadMieterUnterlagen();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });
}
