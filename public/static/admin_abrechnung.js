// ============================================================
// Admin: Abrechnungsübersicht aller Mieter + Druck/PDF
// ============================================================
registerRoute('/admin/abrechnung', async (app) => {
  await ensureObjekteLoaded();
  app.innerHTML = renderLayout('abrechnung', `<div id="abr-content"><div class="flex items-center justify-center py-16"><div class="spinner"></div></div></div>`, { title: 'Abrechnung' });
  attachLayoutHandlers(() => loadAbrechnungUebersicht());
  await loadAbrechnungUebersicht();
});

async function loadAbrechnungUebersicht() {
  const container = document.getElementById('abr-content');
  container.innerHTML = `<div class="flex items-center justify-center py-16"><div class="spinner"></div></div>`;
  const objektId = AppState.currentObjektId;
  const jahr = AppState.currentJahr;

  try {
    const { abrechnungen, verteilung } = await API.getAlleMieterabrechnungen(objektId, jahr);

    let vorjahrGesamt = null;
    try {
      const vj = await API.getVerteilung(objektId, jahr - 1);
      vorjahrGesamt = vj.gesamtkosten;
    } catch {}

    container.innerHTML = `
      <div class="card p-5 mb-5">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-slate-700"><i class="fas fa-calculator text-blue-600 mr-1"></i> Plausibilitätsprüfung Σ-Verteilung ${jahr}</h3>
          <span class="badge ${Math.abs(verteilung.gesamtkosten - Object.values(verteilung.wohnungSummen).reduce((s,v)=>s+v,0)) < 0.5 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">
            ✓ Gesamt: ${fmtEuro(verteilung.gesamtkosten)}
          </span>
        </div>
        ${vorjahrGesamt ? `<p class="text-sm text-slate-500">Vorjahresvergleich: ${jahr - 1}: ${fmtEuro(vorjahrGesamt)} ${vergleichBadgeHtml(verteilung.gesamtkosten, vorjahrGesamt)}</p>` : ''}
      </div>

      <div class="card p-5">
        <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-users text-blue-600 mr-1"></i> Mieterabrechnungen ${jahr}</h3>
        <div class="overflow-x-auto">
          <table class="data-table w-full text-sm">
            <thead><tr>
              <th>Wohnung</th><th>Mieter</th><th class="text-right">Σ Nebenkosten</th><th class="text-right">Vorauszahlung</th><th class="text-right">Differenz</th><th>Status</th><th class="text-right">Gesamtforderung</th><th></th>
            </tr></thead>
            <tbody>
              ${abrechnungen.map((a) => `
                <tr>
                  <td class="font-semibold">${escapeHtml(a.bezeichnung)} <span class="text-xs text-slate-400">${escapeHtml(a.lage)}</span></td>
                  <td>${a.mieter ? escapeHtml(a.mieter.vorname + ' ' + a.mieter.nachname) : '<span class="text-slate-400">Kein Mieter</span>'}</td>
                  <td class="text-right">${fmtEuro(a.summe_nebenkosten_tag_genau)}</td>
                  <td class="text-right text-slate-500">${fmtEuro(a.vorauszahlung_ist)}</td>
                  <td class="text-right font-semibold ${a.status === 'Nachzahlung' ? 'text-red-600' : a.status === 'Guthaben' ? 'text-emerald-600' : 'text-slate-500'}">${fmtEuro(Math.abs(a.differenz))}</td>
                  <td><span class="badge ${a.status === 'Nachzahlung' ? 'bg-red-100 text-red-700' : a.status === 'Guthaben' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}">${a.status}</span></td>
                  <td class="text-right font-bold">${fmtEuro(a.gesamtforderung)}</td>
                  <td class="text-right"><button class="text-blue-600 hover:underline text-xs" onclick="openAbrechnungDruck(${a.wohnung_id}, ${jahr})"><i class="fas fa-print mr-1"></i>PDF</button></td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="font-bold bg-slate-100">
                <td colspan="2">GESAMT</td>
                <td class="text-right">${fmtEuro(abrechnungen.reduce((s,a)=>s+a.summe_nebenkosten_tag_genau,0))}</td>
                <td class="text-right">${fmtEuro(abrechnungen.reduce((s,a)=>s+a.vorauszahlung_ist,0))}</td>
                <td colspan="2"></td>
                <td class="text-right">${fmtEuro(abrechnungen.reduce((s,a)=>s+a.gesamtforderung,0))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="card p-5 mt-5">
        <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-table text-blue-600 mr-1"></i> Detaillierte Kostenverteilung nach Art</h3>
        <div class="overflow-x-auto">
          <table class="data-table w-full text-xs">
            <thead><tr>
              <th>Kostenart</th><th class="text-right">Gesamt</th>
              ${abrechnungen.map((a) => `<th class="text-right">${escapeHtml(a.bezeichnung)}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${verteilung.kostenarten.map((ka) => `
                <tr>
                  <td>${ka.nr}. ${escapeHtml(ka.bezeichnung)}</td>
                  <td class="text-right font-semibold">${fmtEuro(ka.gesamtbetrag)}</td>
                  ${abrechnungen.map((a) => `<td class="text-right">${fmtEuro(ka.anteile[a.wohnung_id]?.betrag || 0)}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card p-6 border-l-4 border-amber-500"><p class="text-slate-600">${escapeHtml(err.message)}</p><p class="text-xs text-slate-400 mt-2">Hinweis: Stellen Sie sicher, dass für dieses Jahr Zählerstände und Kosten erfasst sind.</p></div>`;
  }
}

function vergleichBadgeHtml(aktuell, alt) {
  if (!alt) return '';
  const diffPct = ((aktuell - alt) / alt) * 100;
  if (Math.abs(diffPct) < 0.5) return '<span class="text-slate-400">(unverändert)</span>';
  const cls = diffPct > 0 ? 'text-red-600' : 'text-emerald-600';
  const arrow = diffPct > 0 ? '▲' : '▼';
  return `<span class="${cls} font-semibold">${arrow} ${Math.abs(diffPct).toFixed(1)}%</span>`;
}

function openAbrechnungDruck(wohnungId, jahr) {
  const url = API.abrechnungHtmlUrl(wohnungId, jahr);
  const win = window.open(url, '_blank');
}
