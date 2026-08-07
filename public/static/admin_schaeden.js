// ============================================================
// Admin: Schadensmeldungen (Status-Workflow offen -> in Bearbeitung -> erledigt)
// ============================================================
registerRoute('/admin/schaeden', async (app) => {
  await ensureObjekteLoaded();
  app.innerHTML = renderLayout('schaeden', `<div id="sch-content" class="flex items-center justify-center py-16"><div class="spinner"></div></div>`, { title: 'Schadensmeldungen' });
  attachLayoutHandlers(() => loadSchaeden());
  await loadSchaeden();
});

const SCHADEN_STATUS_LABEL = { offen: 'Offen', in_bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt' };
const SCHADEN_STATUS_COLOR = { offen: 'bg-red-100 text-red-700', in_bearbeitung: 'bg-amber-100 text-amber-700', erledigt: 'bg-emerald-100 text-emerald-700' };
const SCHADEN_PRIO_LABEL = { hoch: 'Hoch', mittel: 'Mittel', niedrig: 'Niedrig' };
const SCHADEN_PRIO_COLOR = { hoch: 'bg-red-600 text-white', mittel: 'bg-amber-500 text-white', niedrig: 'bg-slate-400 text-white' };

let schadenFilterStatus = '';

async function loadSchaeden() {
  const container = document.getElementById('sch-content');
  container.innerHTML = `<div class="flex items-center justify-center py-16"><div class="spinner"></div></div>`;
  const objektId = AppState.currentObjektId;
  const liste = await API.listSchaedenByObjekt(objektId, schadenFilterStatus || undefined);

  const filterBtn = (val, label) => `<button class="filter-schaden-btn px-3 py-1.5 rounded-lg text-xs font-medium border ${schadenFilterStatus === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200'}" data-status="${val}">${label}</button>`;

  container.innerHTML = `
    <div class="mb-4 flex items-center gap-2">
      ${filterBtn('', 'Alle')}
      ${filterBtn('offen', 'Offen')}
      ${filterBtn('in_bearbeitung', 'In Bearbeitung')}
      ${filterBtn('erledigt', 'Erledigt')}
    </div>
    <div class="card p-0 overflow-hidden">
      <table class="data-table w-full text-sm">
        <thead><tr>
          <th>Prio</th><th>Titel</th><th>Wohnung / Mieter</th><th>Raum</th><th>Status</th><th>Erstellt am</th><th>Admin-Notiz</th><th></th>
        </tr></thead>
        <tbody>
          ${liste.length ? liste.map((s) => `
            <tr>
              <td><span class="px-2 py-0.5 rounded text-xs font-semibold ${SCHADEN_PRIO_COLOR[s.prioritaet] || ''}">${SCHADEN_PRIO_LABEL[s.prioritaet] || s.prioritaet}</span></td>
              <td class="font-medium">
                ${escapeHtml(s.titel)}
                <div class="text-xs text-slate-500 mt-0.5">${escapeHtml(s.beschreibung || '')}</div>
              </td>
              <td>${escapeHtml(s.wohnung_bezeichnung || '')}${s.mieter_name ? ' · ' + escapeHtml(s.mieter_name) : ''}</td>
              <td>${escapeHtml(s.raum || '—')}</td>
              <td>
                <select class="form-input !py-1 !text-xs schaden-status" data-id="${s.id}">
                  ${Object.entries(SCHADEN_STATUS_LABEL).map(([v, l]) => `<option value="${v}" ${s.status === v ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
              </td>
              <td class="text-xs text-slate-500">${fmtDate((s.erstellt_am || '').slice(0, 10))}</td>
              <td><input type="text" class="form-input !py-1 !text-xs schaden-notiz" data-id="${s.id}" value="${escapeHtml(s.admin_notiz || '')}" placeholder="Notiz für Mieter…"></td>
              <td>
                <button class="text-blue-600 hover:underline text-xs schaden-save" data-id="${s.id}">Speichern</button>
                <button class="text-red-500 hover:underline text-xs ml-2 schaden-delete" data-id="${s.id}">Löschen</button>
              </td>
            </tr>
          `).join('') : `<tr><td colspan="8" class="text-center text-slate-400 py-8">Keine Schadensmeldungen vorhanden.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('.filter-schaden-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      schadenFilterStatus = btn.dataset.status;
      loadSchaeden();
    });
  });

  container.querySelectorAll('.schaden-save').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const status = container.querySelector(`.schaden-status[data-id="${id}"]`).value;
      const admin_notiz = container.querySelector(`.schaden-notiz[data-id="${id}"]`).value;
      try {
        await API.updateSchaden(id, { status, admin_notiz });
        toast('Schadensmeldung aktualisiert', 'success');
        await loadSchaeden();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });

  container.querySelectorAll('.schaden-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Schadensmeldung wirklich löschen?')) return;
      try {
        await API.deleteSchaden(btn.dataset.id);
        toast('Gelöscht', 'success');
        await loadSchaeden();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });
}
