// ============================================================
// Admin: Wohnungsdetail (Mieter + Zähler dieser Wohnung)
// ============================================================
registerRoute('/admin/wohnung/:id', async (app, params) => {
  await ensureObjekteLoaded();
  app.innerHTML = renderLayout('objekte', `<div id="wd-content" class="flex items-center justify-center py-16"><div class="spinner"></div></div>`, { title: 'Wohnungsdetail' });
  attachLayoutHandlers(() => router());
  await loadWohnungDetail(params.id);
});

async function loadWohnungDetail(wohnungId) {
  const container = document.getElementById('wd-content');
  const [wohnung, mieterListe, zaehlerListe] = await Promise.all([
    API.getWohnung(wohnungId),
    API.listMieterByWohnung(wohnungId),
    API.listZaehlerByObjekt(AppState.currentObjektId),
  ]);
  const zaehlerDerWohnung = zaehlerListe.filter((z) => z.wohnung_id === Number(wohnungId));
  const aktiverMieter = mieterListe.find((m) => m.aktiv) || mieterListe[0];

  container.innerHTML = `
    <a href="#/admin/wohnungen" class="text-sm text-blue-600 hover:underline"><i class="fas fa-arrow-left mr-1"></i> Zurück zur Wohnungsliste</a>
    <div class="flex justify-between items-start mt-2 mb-6">
      <div>
        <h2 class="text-2xl font-bold text-slate-800">${escapeHtml(wohnung.bezeichnung)} <span class="text-slate-400 text-lg font-normal">· ${escapeHtml(wohnung.lage)}</span></h2>
        <p class="text-slate-500">${fmtNum(wohnung.flaeche_m2)} m² Wohnfläche</p>
      </div>
      <div class="flex gap-2">
        <a href="#/admin/abrechnung?wohnung=${wohnungId}" class="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"><i class="fas fa-file-invoice mr-1"></i> Abrechnung ansehen</a>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-5">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-slate-700"><i class="fas fa-user text-blue-600 mr-1"></i> Mieter</h3>
          <button id="btn-new-mieter" class="text-sm text-blue-600 font-semibold"><i class="fas fa-plus mr-1"></i> Neuer Mieter</button>
        </div>
        <div id="mieter-list" class="space-y-2">
          ${mieterListe.map((m) => `
            <div class="border rounded-lg p-3 ${m.aktiv ? 'border-blue-200 bg-blue-50' : 'border-slate-200'}">
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-semibold">${escapeHtml(m.anrede)} ${escapeHtml(m.vorname)} ${escapeHtml(m.nachname)} ${m.aktiv ? '<span class="badge bg-emerald-100 text-emerald-700 ml-1">Aktiv</span>' : '<span class="badge bg-slate-100 text-slate-500 ml-1">Ehemalig</span>'}</p>
                  <p class="text-xs text-slate-500">${escapeHtml(m.email || '')} · ${m.personen} Person(en)</p>
                  <p class="text-xs text-slate-500">Mietbeginn: ${fmtDate(m.mietbeginn)} ${m.mietende ? '· Ende: ' + fmtDate(m.mietende) : ''}</p>
                  <p class="text-xs text-slate-500">Kaltmiete: ${fmtEuro(m.kaltmiete_monat)}/Monat · NK-Vorauszahlung: ${fmtEuro(m.vorauszahlung_nk_monat)}/Monat</p>
                </div>
                <div class="flex gap-2">
                  <button class="text-slate-400 hover:text-blue-600" title="Bearbeiten" onclick="openMieterModal(${wohnungId}, ${m.id})"><i class="fas fa-pen"></i></button>
                  <button class="text-slate-400 hover:text-emerald-600" title="Login-Zugang / Mieter einladen" onclick="openMieterLoginModal(${m.id})"><i class="fas fa-key"></i></button>
                  <button class="text-slate-400 hover:text-purple-600" title="Mietvertrag erzeugen" onclick="genMietvertrag(${m.id})"><i class="fas fa-file-contract"></i></button>
                  <button class="text-slate-400 hover:text-amber-600" title="Wohnungsübergabe erzeugen" onclick="genWohnungsuebergabe(${m.id})"><i class="fas fa-house-circle-check"></i></button>
                </div>
              </div>
            </div>
          `).join('') || `<p class="text-slate-400 text-sm text-center py-4">Kein Mieter erfasst.</p>`}
        </div>
      </div>

      <div class="card p-5">
        <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-gauge text-blue-600 mr-1"></i> Zähler dieser Wohnung</h3>
        <table class="data-table w-full text-sm">
          <thead><tr><th>Bezeichnung</th><th>Typ</th><th>Einheit</th></tr></thead>
          <tbody>
            ${zaehlerDerWohnung.map((z) => `<tr><td>${escapeHtml(z.bezeichnung)} ${z.ebene ? '<span class="text-xs text-slate-400">(' + escapeHtml(z.ebene) + ')</span>' : ''}</td><td>${zaehlerTypLabel(z.typ)}</td><td>${escapeHtml(z.einheit)}</td></tr>`).join('') || '<tr><td colspan="3" class="text-center text-slate-400 py-4">Keine Zähler zugeordnet.</td></tr>'}
          </tbody>
        </table>
        <button id="btn-new-zaehler" class="mt-3 text-sm text-blue-600 font-semibold"><i class="fas fa-plus mr-1"></i> Zähler hinzufügen</button>
      </div>
    </div>
  `;

  document.getElementById('btn-new-mieter').addEventListener('click', () => openMieterModal(wohnungId));
  document.getElementById('btn-new-zaehler').addEventListener('click', () => openZaehlerModal(wohnungId));
}

function zaehlerTypLabel(typ) {
  return {
    wmz_heizung: '<span class="badge bg-orange-100 text-orange-700">WMZ Heizung</span>',
    wmz_boiler: '<span class="badge bg-red-100 text-red-700">WMZ Boiler</span>',
    warmwasser: '<span class="badge bg-cyan-100 text-cyan-700">Warmwasser</span>',
    kaltwasser: '<span class="badge bg-blue-100 text-blue-700">Kaltwasser</span>',
    sonstige: '<span class="badge bg-slate-100 text-slate-600">Sonstige</span>',
  }[typ] || typ;
}

function openMieterModal(wohnungId, mieterId) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4';
  let mieter = {};

  const render = () => {
    modal.innerHTML = `
      <div class="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-bold mb-4">${mieterId ? 'Mieter bearbeiten' : 'Neuer Mieter'}</h2>
        <form id="mieter-form" class="grid grid-cols-2 gap-3">
          <div><label class="text-xs font-semibold text-slate-500">Anrede</label><input class="form-input" name="anrede" value="${escapeHtml(mieter.anrede || '')}" placeholder="Herr/Frau"></div>
          <div><label class="text-xs font-semibold text-slate-500">Vorname</label><input class="form-input" name="vorname" value="${escapeHtml(mieter.vorname || '')}"></div>
          <div class="col-span-2"><label class="text-xs font-semibold text-slate-500">Nachname *</label><input class="form-input" name="nachname" required value="${escapeHtml(mieter.nachname || '')}"></div>
          <div><label class="text-xs font-semibold text-slate-500">E-Mail</label><input class="form-input" type="email" name="email" value="${escapeHtml(mieter.email || '')}"></div>
          <div><label class="text-xs font-semibold text-slate-500">Telefon</label><input class="form-input" name="telefon" value="${escapeHtml(mieter.telefon || '')}"></div>
          <div><label class="text-xs font-semibold text-slate-500">Personen im Haushalt *</label><input class="form-input" type="number" name="personen" required value="${mieter.personen || 1}"></div>
          <div><label class="text-xs font-semibold text-slate-500">Aktiv?</label>
            <select class="form-input" name="aktiv"><option value="1" ${mieter.aktiv !== 0 ? 'selected' : ''}>Aktiv</option><option value="0" ${mieter.aktiv === 0 ? 'selected' : ''}>Ehemalig</option></select>
          </div>
          <div><label class="text-xs font-semibold text-slate-500">Mietbeginn</label><input class="form-input" type="date" name="mietbeginn" value="${mieter.mietbeginn || ''}"></div>
          <div><label class="text-xs font-semibold text-slate-500">Mietende (bei Kündigung)</label><input class="form-input" type="date" name="mietende" value="${mieter.mietende || ''}"></div>

          <div class="col-span-2 mt-2 pt-2 border-t"><span class="text-sm font-bold text-blue-700">Miete & Nebenkosten</span></div>
          <div><label class="text-xs font-semibold text-slate-500">Kaltmiete €/m²</label><input class="form-input" type="number" step="0.01" name="kaltmiete_qm" value="${mieter.kaltmiete_qm || 0}"></div>
          <div><label class="text-xs font-semibold text-slate-500">Kaltmiete/Monat (€) *</label><input class="form-input" type="number" step="0.01" name="kaltmiete_monat" required value="${mieter.kaltmiete_monat || 0}"></div>
          <div><label class="text-xs font-semibold text-slate-500">Mieterhöhung % (z.B. 0.03 = 3%)</label><input class="form-input" type="number" step="0.001" name="erhoehung_pct" value="${mieter.erhoehung_pct || 0}"></div>
          <div><label class="text-xs font-semibold text-slate-500">NK-Vorauszahlung €/Monat *</label><input class="form-input" type="number" step="0.01" name="vorauszahlung_nk_monat" required value="${mieter.vorauszahlung_nk_monat || 0}"></div>

          <div class="col-span-2 mt-2 pt-2 border-t"><span class="text-sm font-bold text-blue-700">Bankverbindung Mieter (SEPA-Lastschrift o.ä.)</span></div>
          <div><label class="text-xs font-semibold text-slate-500">Kontoinhaber</label><input class="form-input" name="kontoinhaber" value="${escapeHtml(mieter.kontoinhaber || '')}"></div>
          <div><label class="text-xs font-semibold text-slate-500">IBAN</label><input class="form-input" name="iban" value="${escapeHtml(mieter.iban || '')}"></div>

          <div class="col-span-2 mt-2 pt-2 border-t"><span class="text-sm font-bold text-blue-700">Stellplatz / Garage / Keller / Garten</span></div>
          <div class="flex items-center gap-2 col-span-2">
            <label class="text-xs font-semibold text-slate-500 flex items-center gap-1"><input type="checkbox" name="stellplatz_vorhanden" ${mieter.stellplatz_vorhanden ? 'checked' : ''}> Stellplatz vorhanden</label>
          </div>
          <div><label class="text-xs font-semibold text-slate-500">Stellplatz-Nr.</label><input class="form-input" name="stellplatz_nr" value="${escapeHtml(mieter.stellplatz_nr || '')}"></div>
          <div><label class="text-xs font-semibold text-slate-500">Stellplatz-Miete €/Monat</label><input class="form-input" type="number" step="0.01" name="stellplatz_miete" value="${mieter.stellplatz_miete || 0}"></div>

          <div class="flex items-center gap-2 col-span-2">
            <label class="text-xs font-semibold text-slate-500 flex items-center gap-1"><input type="checkbox" name="garage_vorhanden" ${mieter.garage_vorhanden ? 'checked' : ''}> Garage vorhanden</label>
          </div>
          <div><label class="text-xs font-semibold text-slate-500">Garage-Nr.</label><input class="form-input" name="garage_nr" value="${escapeHtml(mieter.garage_nr || '')}"></div>
          <div><label class="text-xs font-semibold text-slate-500">Garage-Miete €/Monat</label><input class="form-input" type="number" step="0.01" name="garage_miete" value="${mieter.garage_miete || 0}"></div>

          <div class="flex items-center gap-2 col-span-2">
            <label class="text-xs font-semibold text-slate-500 flex items-center gap-1"><input type="checkbox" name="keller_vorhanden" ${mieter.keller_vorhanden ? 'checked' : ''}> Kellerraum vorhanden</label>
          </div>
          <div class="col-span-2"><label class="text-xs font-semibold text-slate-500">Keller-Nr./Bezeichnung</label><input class="form-input" name="keller_nr" value="${escapeHtml(mieter.keller_nr || '')}"></div>

          <div class="flex items-center gap-2 col-span-2">
            <label class="text-xs font-semibold text-slate-500 flex items-center gap-1"><input type="checkbox" name="garten_vorhanden" ${mieter.garten_vorhanden ? 'checked' : ''}> Gartennutzung vorhanden</label>
          </div>
          <div class="col-span-2"><label class="text-xs font-semibold text-slate-500">Garten-Beschreibung</label><input class="form-input" name="garten_beschreibung" value="${escapeHtml(mieter.garten_beschreibung || '')}"></div>

          <div class="col-span-2 mt-2 pt-2 border-t"><span class="text-sm font-bold text-blue-700">Schlüsselübergabe</span></div>
          <div><label class="text-xs font-semibold text-slate-500">Anzahl Hausschlüssel</label><input class="form-input" type="number" name="anzahl_hausschluessel" value="${mieter.anzahl_hausschluessel ?? 2}"></div>
          <div><label class="text-xs font-semibold text-slate-500">Anzahl Briefkastenschlüssel</label><input class="form-input" type="number" name="anzahl_briefkastenschluessel" value="${mieter.anzahl_briefkastenschluessel ?? 2}"></div>
          <div class="col-span-2"><label class="text-xs font-semibold text-slate-500">Sonstige Schlüssel (z.B. Kellerschlüssel, Briefkasten separat)</label><input class="form-input" name="sonstige_schluessel" value="${escapeHtml(mieter.sonstige_schluessel || '')}"></div>

          <div class="col-span-2 flex justify-end gap-2 mt-4">
            <button type="button" class="px-4 py-2 rounded-lg text-slate-600 bg-slate-100" onclick="this.closest('.fixed').remove()">Abbrechen</button>
            <button type="submit" class="px-4 py-2 rounded-lg text-white bg-blue-700 font-semibold">Speichern</button>
          </div>
        </form>
      </div>
    `;
    modal.querySelector('#mieter-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      data.personen = Number(data.personen);
      data.kaltmiete_qm = Number(data.kaltmiete_qm);
      data.kaltmiete_monat = Number(data.kaltmiete_monat);
      data.erhoehung_pct = Number(data.erhoehung_pct);
      data.vorauszahlung_nk_monat = Number(data.vorauszahlung_nk_monat);
      data.aktiv = Number(data.aktiv);
      // Checkboxen: nur vorhanden in FormData, wenn angehakt -> explizit auf 0/1 normalisieren
      ['stellplatz_vorhanden', 'garage_vorhanden', 'keller_vorhanden', 'garten_vorhanden'].forEach((key) => {
        data[key] = fd.has(key) ? 1 : 0;
      });
      data.stellplatz_miete = Number(data.stellplatz_miete) || 0;
      data.garage_miete = Number(data.garage_miete) || 0;
      data.anzahl_hausschluessel = Number(data.anzahl_hausschluessel) || 0;
      data.anzahl_briefkastenschluessel = Number(data.anzahl_briefkastenschluessel) || 0;
      try {
        if (mieterId) {
          await API.updateMieter(mieterId, data);
        } else {
          await API.createMieter(wohnungId, data);
        }
        toast('Mieter gespeichert', 'success');
        modal.remove();
        loadWohnungDetail(wohnungId);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  if (mieterId) {
    API.getMieter(mieterId).then((m) => { mieter = m; render(); });
  } else {
    render();
  }
  document.body.appendChild(modal);
}

function openZaehlerModal(wohnungId) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-6 w-full max-w-md">
      <h2 class="text-lg font-bold mb-4">Neuer Zähler</h2>
      <form id="zaehler-form" class="space-y-3">
        <div><label class="text-xs font-semibold text-slate-500">Typ *</label>
          <select class="form-input" name="typ" required>
            <option value="wmz_heizung">WMZ Heizung</option>
            <option value="warmwasser">Warmwasser</option>
            <option value="kaltwasser">Kaltwasser</option>
            <option value="sonstige">Sonstige</option>
          </select>
        </div>
        <div><label class="text-xs font-semibold text-slate-500">Bezeichnung *</label><input class="form-input" name="bezeichnung" required value="Wärmemengenzähler"></div>
        <div><label class="text-xs font-semibold text-slate-500">Ebene (optional, z.B. für DG mit 2 Zählern)</label><input class="form-input" name="ebene"></div>
        <div><label class="text-xs font-semibold text-slate-500">Einheit *</label><input class="form-input" name="einheit" required value="kWh"></div>
        <div class="flex justify-end gap-2 mt-4">
          <button type="button" class="px-4 py-2 rounded-lg text-slate-600 bg-slate-100" onclick="this.closest('.fixed').remove()">Abbrechen</button>
          <button type="submit" class="px-4 py-2 rounded-lg text-white bg-blue-700 font-semibold">Speichern</button>
        </div>
      </form>
    </div>
  `;
  modal.querySelector('#zaehler-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.objekt_id = AppState.currentObjektId;
    data.wohnung_id = wohnungId;
    try {
      await API.createZaehler(data);
      toast('Zähler angelegt', 'success');
      modal.remove();
      loadWohnungDetail(wohnungId);
    } catch (err) {
      toast(err.message, 'error');
    }
  });
  document.body.appendChild(modal);
}

async function genMietvertrag(mieterId) {
  try {
    const res = await API.generateMietvertrag(mieterId);
    const win = window.open('', '_blank');
    win.document.write(res.html);
    win.document.close();
    toast('Mietvertrag erstellt', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function genWohnungsuebergabe(mieterId) {
  try {
    const res = await API.generateWohnungsuebergabe(mieterId);
    const win = window.open('', '_blank');
    win.document.write(res.html);
    win.document.close();
    toast('Wohnungsübergabe-Protokoll erstellt', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ============================================================
// Mieter-Login-Zugang: Einladen / Zugang erstellen / Passwort zurücksetzen
// ============================================================
function openMieterLoginModal(mieterId) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4';
  modal.innerHTML = `<div class="bg-white rounded-xl p-6 w-full max-w-md"><div class="flex items-center justify-center py-10"><div class="spinner"></div></div></div>`;
  document.body.appendChild(modal);

  const renderStatus = (status) => {
    const hasLogin = !!status.has_login;
    modal.innerHTML = `
      <div class="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 class="text-lg font-bold mb-1"><i class="fas fa-key text-emerald-600 mr-1"></i> Mieter-Login-Zugang</h2>
        <p class="text-sm text-slate-500 mb-4">${hasLogin ? 'Dieser Mieter besitzt bereits einen Zugang für das Mieter-Portal.' : 'Diesem Mieter noch keinen Zugang zum Mieter-Portal eingerichtet.'}</p>

        ${hasLogin ? `
          <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-sm">
            <p><span class="font-semibold">E-Mail:</span> ${escapeHtml(status.email || '')}</p>
            <p><span class="font-semibold">Status:</span> ${status.active ? '<span class="text-emerald-600">Aktiv</span>' : '<span class="text-red-600">Deaktiviert</span>'}</p>
          </div>
        ` : ''}

        <form id="mieter-login-form" class="space-y-3">
          <div>
            <label class="text-xs font-semibold text-slate-500">E-Mail-Adresse ${hasLogin ? '(nur bei Bedarf ändern)' : '*'}</label>
            <input class="form-input" type="email" name="email" value="${escapeHtml(status.email || '')}" ${hasLogin ? '' : 'required'} placeholder="mieter@example.com">
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500">Passwort (leer lassen = automatisch generieren)</label>
            <input class="form-input" type="text" name="password" placeholder="Automatisch generieren...">
          </div>
          <div id="mieter-login-result" class="hidden bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm"></div>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" class="px-4 py-2 rounded-lg text-slate-600 bg-slate-100" onclick="this.closest('.fixed').remove()">Schließen</button>
            ${hasLogin
              ? '<button type="submit" data-action="reset" class="px-4 py-2 rounded-lg text-white bg-amber-600 font-semibold"><i class="fas fa-rotate mr-1"></i>Passwort zurücksetzen</button>'
              : '<button type="submit" data-action="create" class="px-4 py-2 rounded-lg text-white bg-emerald-600 font-semibold"><i class="fas fa-paper-plane mr-1"></i>Zugang erstellen</button>'}
          </div>
        </form>
      </div>
    `;

    modal.querySelector('#mieter-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      const action = e.submitter?.dataset.action || (hasLogin ? 'reset' : 'create');
      const resultBox = modal.querySelector('#mieter-login-result');
      try {
        const res = action === 'create'
          ? await API.createMieterLogin(mieterId, { email: fd.email || undefined, password: fd.password || undefined })
          : await API.resetMieterPassword(mieterId, { password: fd.password || undefined });
        resultBox.classList.remove('hidden');
        resultBox.innerHTML = `
          <p class="font-semibold text-emerald-700 mb-1"><i class="fas fa-check-circle mr-1"></i>${action === 'create' ? 'Zugang erstellt' : 'Passwort zurückgesetzt'}</p>
          <p>E-Mail: <code class="bg-white px-1 rounded border">${escapeHtml(res.email)}</code></p>
          <p>Passwort: <code class="bg-white px-1 rounded border">${escapeHtml(res.password)}</code></p>
          <p class="text-xs text-slate-500 mt-1">Bitte diese Zugangsdaten sicher an den Mieter weitergeben (werden nicht automatisch per E-Mail versendet).</p>
        `;
        toast(action === 'create' ? 'Login-Zugang erstellt' : 'Passwort zurückgesetzt', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  API.getMieterLoginStatus(mieterId).then(renderStatus).catch((err) => {
    modal.innerHTML = `<div class="bg-white rounded-xl p-6 w-full max-w-md"><p class="text-red-600">${escapeHtml(err.message)}</p><button class="mt-4 px-4 py-2 rounded-lg bg-slate-100" onclick="this.closest('.fixed').remove()">Schließen</button></div>`;
  });
}
