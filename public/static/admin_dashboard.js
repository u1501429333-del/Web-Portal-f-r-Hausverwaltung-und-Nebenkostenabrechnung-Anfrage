// ============================================================
// Admin: Dashboard
// ============================================================
registerRoute('/admin', async (app) => {
  await ensureObjekteLoaded();

  if (!AppState.objekte.length) {
    app.innerHTML = renderLayout('dashboard', `
      <div class="card p-10 text-center">
        <i class="fas fa-building text-5xl text-slate-300 mb-4"></i>
        <h2 class="text-xl font-bold text-slate-700 mb-2">Noch kein Objekt angelegt</h2>
        <p class="text-slate-500 mb-4">Legen Sie zuerst eine Liegenschaft an, um mit der Verwaltung zu starten.</p>
        <a href="#/admin/objekte" class="inline-block bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold"><i class="fas fa-plus mr-1"></i> Objekt anlegen</a>
      </div>
    `, { title: 'Dashboard' });
    return;
  }

  app.innerHTML = renderLayout('dashboard', `<div id="dash-content" class="flex items-center justify-center py-20"><div class="spinner"></div></div>`, { title: 'Dashboard' });
  attachLayoutHandlers(() => router());

  await loadDashboard();
});

async function loadDashboard() {
  const objektId = AppState.currentObjektId;
  const jahr = AppState.currentJahr;
  const container = document.getElementById('dash-content');

  try {
    const [wohnungen, verteilung, erweitert] = await Promise.all([
      API.listWohnungen(objektId),
      API.getVerteilung(objektId, jahr).catch(() => null),
      API.getDashboardErweitert(objektId, jahr).catch(() => null),
    ]);

    const objekt = currentObjekt();
    const flaecheGesamt = wohnungen.reduce((s, w) => s + w.flaeche_m2, 0);

    let vorjahrGesamt = null;
    try {
      const vj = await API.getVerteilung(objektId, jahr - 1);
      vorjahrGesamt = vj.gesamtkosten;
    } catch {}

    const gesamtkosten = verteilung?.gesamtkosten || 0;
    const diffPct = vorjahrGesamt ? ((gesamtkosten - vorjahrGesamt) / vorjahrGesamt) * 100 : null;

    const leerstand = erweitert?.leerstand;
    const mietende = erweitert?.mietende_warnungen || [];
    const nachzahl = erweitert?.nachzahlungen;
    const trend = erweitert?.kostentrend;

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="card p-5">
          <div class="text-slate-500 text-sm mb-1"><i class="fas fa-door-open mr-1"></i> Wohnungen</div>
          <div class="text-2xl font-bold text-slate-800">${wohnungen.length}</div>
        </div>
        <div class="card p-5">
          <div class="text-slate-500 text-sm mb-1"><i class="fas fa-ruler-combined mr-1"></i> Gesamtfläche</div>
          <div class="text-2xl font-bold text-slate-800">${fmtNum(flaecheGesamt)} m²</div>
        </div>
        <div class="card p-5">
          <div class="text-slate-500 text-sm mb-1"><i class="fas fa-euro-sign mr-1"></i> Nebenkosten ${jahr}</div>
          <div class="text-2xl font-bold text-slate-800">${fmtEuro(gesamtkosten)}</div>
          ${diffPct !== null ? `<div class="text-xs mt-1 ${diffPct >= 0 ? 'text-red-600' : 'text-emerald-600'}"><i class="fas fa-arrow-${diffPct >= 0 ? 'up' : 'down'}"></i> ${Math.abs(diffPct).toFixed(1)}% vs. ${jahr - 1}</div>` : ''}
        </div>
        <div class="card p-5">
          <div class="text-slate-500 text-sm mb-1"><i class="fas fa-check-double mr-1"></i> Plausibilität</div>
          <div class="text-lg font-bold ${verteilung ? 'text-emerald-600' : 'text-amber-600'}">${verteilung ? '✓ OK' : '⚠ Keine Daten'}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="card p-5 ${leerstand?.anzahl ? 'border-l-4 border-amber-500' : ''}">
          <div class="text-slate-500 text-sm mb-1"><i class="fas fa-house-circle-xmark mr-1"></i> Leerstand</div>
          <div class="text-2xl font-bold ${leerstand?.anzahl ? 'text-amber-600' : 'text-slate-800'}">${leerstand?.anzahl ?? 0} / ${leerstand?.von_wohnungen_gesamt ?? wohnungen.length}</div>
          <div class="text-xs text-slate-500 mt-1">${leerstand ? fmtPct((leerstand.quote_pct || 0) / 100) + ' der Fläche' : '—'}</div>
        </div>
        <div class="card p-5 ${nachzahl?.anzahl_nachzahlung ? 'border-l-4 border-red-500' : ''}">
          <div class="text-slate-500 text-sm mb-1"><i class="fas fa-hand-holding-dollar mr-1"></i> Nachzahlungen ${jahr}</div>
          <div class="text-2xl font-bold text-red-600">${fmtEuro(nachzahl?.summe_nachzahlung || 0)}</div>
          <div class="text-xs text-slate-500 mt-1">${nachzahl?.anzahl_nachzahlung ?? 0} Mieter · Guthaben: ${fmtEuro(nachzahl?.summe_guthaben || 0)}</div>
        </div>
        <div class="card p-5 col-span-2">
          <div class="text-slate-500 text-sm mb-1"><i class="fas fa-triangle-exclamation mr-1 text-amber-500"></i> Mietende-Warnungen (nächste 90 Tage)</div>
          ${mietende.length ? `
            <div class="max-h-24 overflow-y-auto text-sm space-y-1 mt-1">
              ${mietende.map((m) => `<div><b>${escapeHtml(m.mieter_name)}</b> (${escapeHtml(m.wohnung_bezeichnung)}) — endet in ${m.tage_bis_mietende} Tag(en), ${fmtDate(m.mietende)}</div>`).join('')}
            </div>
          ` : `<div class="text-sm text-slate-400 mt-2">Keine anstehenden Mietenden.</div>`}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-5">
          <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-chart-pie text-blue-600 mr-1"></i> Kostenverteilung nach Art</h3>
          <canvas id="chart-kostenarten" height="220"></canvas>
        </div>
        <div class="card p-5">
          <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-users text-blue-600 mr-1"></i> Nebenkosten pro Wohnung</h3>
          <canvas id="chart-wohnungen" height="220"></canvas>
        </div>
      </div>

      ${trend && trend.punkte && trend.punkte.length ? `
      <div class="card p-5 mt-6">
        <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-chart-line text-blue-600 mr-1"></i> 3-Jahres-Kostentrend mit Regressionsprognose</h3>
        <canvas id="chart-trend" height="180"></canvas>
        <p class="text-xs text-slate-500 mt-2">Lineare Regression: Änderung ca. ${fmtEuro(trend.steigung_pro_jahr)} pro Jahr. Prognose ${jahr + 1}: <b>${fmtEuro(trend.prognose_naechstes_jahr)}</b></p>
      </div>
      ` : ''}

      <div class="card p-5 mt-6">
        <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-list text-blue-600 mr-1"></i> Wohnungsübersicht ${jahr}</h3>
        <div class="overflow-x-auto">
          <table class="data-table w-full text-sm">
            <thead><tr><th>Wohnung</th><th>Lage</th><th class="text-right">Fläche</th><th class="text-right">Nebenkosten</th><th></th></tr></thead>
            <tbody>
              ${wohnungen.map((w) => {
                const summe = verteilung?.wohnungSummen?.[w.id] || 0;
                return `<tr>
                  <td class="font-semibold">${escapeHtml(w.bezeichnung)}</td>
                  <td>${escapeHtml(w.lage)}</td>
                  <td class="text-right">${fmtNum(w.flaeche_m2)} m²</td>
                  <td class="text-right font-semibold">${fmtEuro(summe)}</td>
                  <td class="text-right"><a href="#/admin/wohnung/${w.id}" class="text-blue-600 hover:underline text-xs">Details <i class="fas fa-arrow-right"></i></a></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (verteilung) {
      new Chart(document.getElementById('chart-kostenarten'), {
        type: 'doughnut',
        data: {
          labels: verteilung.kostenarten.map((k) => k.bezeichnung),
          datasets: [{
            data: verteilung.kostenarten.map((k) => k.gesamtbetrag),
            backgroundColor: ['#2563eb','#0891b2','#16a34a','#ca8a04','#dc2626','#9333ea','#0d9488','#c026d3','#65a30d','#ea580c','#4f46e5','#0284c7','#be185d','#059669','#7c3aed','#d97706','#475569'],
          }],
        },
        options: { plugins: { legend: { display: false } }, responsive: true },
      });

      new Chart(document.getElementById('chart-wohnungen'), {
        type: 'bar',
        data: {
          labels: wohnungen.map((w) => w.bezeichnung),
          datasets: [{ label: 'Nebenkosten €', data: wohnungen.map((w) => verteilung.wohnungSummen?.[w.id] || 0), backgroundColor: '#2563eb' }],
        },
        options: { plugins: { legend: { display: false } }, responsive: true },
      });
    }

    if (trend && trend.punkte && trend.punkte.length && document.getElementById('chart-trend')) {
      const labels = trend.punkte.map((p) => p.x);
      const nextLabel = jahr + 1;
      const regressionData = [...trend.punkte.map((p) => trend.steigung_pro_jahr * p.x + trend.achsenabschnitt), trend.prognose_naechstes_jahr];
      new Chart(document.getElementById('chart-trend'), {
        type: 'line',
        data: {
          labels: [...labels, nextLabel],
          datasets: [
            { label: 'Tatsächliche Kosten', data: [...trend.punkte.map((p) => p.y), null], borderColor: '#2563eb', backgroundColor: '#2563eb', tension: 0.2 },
            { label: 'Regression / Prognose', data: regressionData, borderColor: '#dc2626', borderDash: [6, 4], pointRadius: 3, tension: 0 },
          ],
        },
        options: { plugins: { legend: { position: 'bottom' } }, responsive: true },
      });
    }
  } catch (err) {
    container.innerHTML = `<div class="card p-6 border-l-4 border-amber-500"><p class="text-slate-600">${escapeHtml(err.message)}</p></div>`;
  }
}
