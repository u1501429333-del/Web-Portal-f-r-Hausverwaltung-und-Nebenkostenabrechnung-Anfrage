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
    const [wohnungen, verteilung] = await Promise.all([
      API.listWohnungen(objektId),
      API.getVerteilung(objektId, jahr).catch(() => null),
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
  } catch (err) {
    container.innerHTML = `<div class="card p-6 border-l-4 border-amber-500"><p class="text-slate-600">${escapeHtml(err.message)}</p></div>`;
  }
}
