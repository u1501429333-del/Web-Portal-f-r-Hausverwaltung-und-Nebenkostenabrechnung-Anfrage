// ============================================================
// Admin: Zählerstände erfassen (Übersicht aller Zähler + Verlauf)
// ============================================================
registerRoute('/admin/zaehler', async (app) => {
  await ensureObjekteLoaded();
  app.innerHTML = renderLayout('zaehler', `<div id="zs-content" class="flex items-center justify-center py-16"><div class="spinner"></div></div>`, { title: 'Zählerstände' });
  attachLayoutHandlers(() => loadZaehlerstaende());
  await loadZaehlerstaende();
});

async function loadZaehlerstaende() {
  const container = document.getElementById('zs-content');
  container.innerHTML = `<div class="flex items-center justify-center py-16"><div class="spinner"></div></div>`;
  const objektId = AppState.currentObjektId;
  const jahr = AppState.currentJahr;
  const daten = await API.listZaehlerMitStand(objektId, jahr);
  const einstellungen = await API.getEinstellungenErweitert().catch(() => ({}));
  const steuerberaterEmail = einstellungen.vermieter_email_steuerberater || '';

  const gruppen = {
    wmz_boiler: { label: 'Wärmemengenzähler Boiler (Gebäude)', items: [] },
    wmz_heizung: { label: 'Wärmemengenzähler Heizung', items: [] },
    warmwasser: { label: 'Warmwasserzähler', items: [] },
    kaltwasser: { label: 'Kaltwasserzähler', items: [] },
    sonstige: { label: 'Sonstige Zähler', items: [] },
  };
  daten.forEach((z) => gruppen[z.typ]?.items.push(z));

  const ampelDot = (a) => {
    const color = a === 'gruen' ? 'bg-emerald-500' : a === 'gelb' ? 'bg-amber-400' : 'bg-red-500';
    const title = a === 'gruen' ? 'Aktuell abgelesen' : a === 'gelb' ? 'Ablesung älter/ungenau' : 'Keine Ablesung vorhanden';
    return `<span class="inline-block w-2.5 h-2.5 rounded-full ${color} mr-1.5" title="${title}"></span>`;
  };

  container.innerHTML = `
    <div class="mb-4 flex items-center justify-between">
      <p class="text-slate-500 text-sm">Zählerjahr <b>${jahr}</b> — Verbrauch = Zählerstand ${jahr} − Zählerstand ${jahr - 1}. <span class="ml-2">${ampelDot('gruen')}aktuell ${ampelDot('gelb')}veraltet ${ampelDot('rot')}fehlt</span></p>
      <div class="flex gap-2">
        <a href="${API.zaehlerCsvUrl(objektId, jahr)}" target="_blank" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <i class="fas fa-file-csv mr-1"></i> CSV-Export für Steuerberater
        </a>
        ${steuerberaterEmail ? `<a href="mailto:${encodeURIComponent(steuerberaterEmail)}?subject=${encodeURIComponent('Zählerstände ' + jahr)}&body=${encodeURIComponent('Sehr geehrte Damen und Herren,\n\nanbei die Zählerstände für das Jahr ' + jahr + '. Bitte laden Sie die CSV-Datei separat unter folgendem Link herunter:\n' + window.location.origin + API.zaehlerCsvUrl(objektId, jahr) + '\n\nMit freundlichen Grüßen')}" class="bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg" title="E-Mail an ${escapeHtml(steuerberaterEmail)}">
          <i class="fas fa-envelope mr-1"></i> An Steuerberater senden
        </a>` : `<span class="text-xs text-amber-600 self-center"><i class="fas fa-triangle-exclamation mr-1"></i>Keine Steuerberater-E-Mail in Einstellungen hinterlegt</span>`}
      </div>
    </div>
    ${Object.entries(gruppen).map(([typ, grp]) => grp.items.length ? `
      <div class="card p-5 mb-5">
        <h3 class="font-bold text-slate-700 mb-3">${zaehlerTypLabel(typ)} ${grp.label}</h3>
        <div class="overflow-x-auto">
          <table class="data-table w-full text-sm">
            <thead><tr>
              <th></th><th>Zähler</th><th>Wohnung</th>
              <th class="text-right">Stand ${jahr - 1}</th>
              <th class="text-right">Stand ${jahr}</th>
              <th class="text-right">Verbrauch ${jahr}</th>
              <th class="text-right">Verbrauch ${jahr - 1}</th>
              <th class="text-right">Δ Vorjahr</th>
              <th>Ablesedatum</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${grp.items.map((z) => {
                const diff = z.verbrauch_aktuell != null && z.verbrauch_vorjahr != null
                  ? z.verbrauch_aktuell - z.verbrauch_vorjahr : null;
                const diffPct = diff != null && z.verbrauch_vorjahr ? (diff / z.verbrauch_vorjahr) * 100 : null;
                return `<tr>
                  <td>${ampelDot(z.ablesung_ampel || 'rot')}</td>
                  <td class="font-medium">${escapeHtml(z.bezeichnung)}${z.ebene ? ' <span class="text-xs text-slate-400">(' + escapeHtml(z.ebene) + ')</span>' : ''}</td>
                  <td>${z.wohnung_bezeichnung ? escapeHtml(z.wohnung_bezeichnung) + ' · ' + escapeHtml(z.wohnung_lage || '') : '<span class="text-slate-400">Gebäude</span>'}</td>
                  <td class="text-right text-slate-500">${z.stand_vorjahr != null ? fmtNum(z.stand_vorjahr) : '—'}</td>
                  <td class="text-right">
                    <input type="number" step="0.01" class="form-input !py-1 !w-28 text-right inline-zaehlerstand" data-zaehler-id="${z.id}" value="${z.stand_aktuell ?? ''}" placeholder="Stand eintragen">
                  </td>
                  <td class="text-right font-semibold">${z.verbrauch_aktuell != null ? fmtNum(z.verbrauch_aktuell) + ' ' + escapeHtml(z.einheit) : '—'}</td>
                  <td class="text-right text-slate-500">${z.verbrauch_vorjahr != null ? fmtNum(z.verbrauch_vorjahr) + ' ' + escapeHtml(z.einheit) : '—'}</td>
                  <td class="text-right ${diffPct > 0 ? 'text-red-600' : diffPct < 0 ? 'text-emerald-600' : 'text-slate-400'}">${diffPct != null ? (diffPct >= 0 ? '▲' : '▼') + Math.abs(diffPct).toFixed(1) + '%' : '—'}</td>
                  <td><input type="date" class="form-input !py-1 !text-xs inline-ablesedatum" data-zaehler-id="${z.id}" value="${z.ablesedatum_aktuell || ''}"></td>
                  <td><button class="text-blue-600 hover:underline text-xs save-zaehlerstand" data-zaehler-id="${z.id}">Speichern</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : '').join('')}
  `;

  container.querySelectorAll('.save-zaehlerstand').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const zid = btn.dataset.zaehlerId;
      const standInput = container.querySelector(`.inline-zaehlerstand[data-zaehler-id="${zid}"]`);
      const dateInput = container.querySelector(`.inline-ablesedatum[data-zaehler-id="${zid}"]`);
      const stand = Number(standInput.value);
      if (Number.isNaN(stand) || standInput.value === '') {
        toast('Bitte einen gültigen Zählerstand eingeben', 'error');
        return;
      }
      try {
        await API.setZaehlerStand(zid, { jahr, stand, ablesedatum: dateInput.value || null });
        toast('Zählerstand gespeichert', 'success');
        await loadZaehlerstaende();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });
}
