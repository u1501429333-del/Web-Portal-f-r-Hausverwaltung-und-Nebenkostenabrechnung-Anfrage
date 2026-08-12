// ============================================================
// API-Wrapper (axios) für das Hausverwaltungs-Portal
// ============================================================
const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err?.response?.data?.error || 'Ein Fehler ist aufgetreten';
    if (err?.response?.status === 401 && location.hash !== '#/login') {
      location.hash = '#/login';
    }
    return Promise.reject(new Error(msg));
  }
);

const API = {
  // Auth
  login: (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),

  // Objekte
  listObjekte: () => api.get('/objekte').then((r) => r.data),
  getObjekt: (id) => api.get(`/objekte/${id}`).then((r) => r.data),
  createObjekt: (data) => api.post('/objekte', data).then((r) => r.data),
  updateObjekt: (id, data) => api.put(`/objekte/${id}`, data).then((r) => r.data),
  deleteObjekt: (id) => api.delete(`/objekte/${id}`).then((r) => r.data),

  // Wohnungen
  listWohnungen: (objektId) => api.get(`/objekte/${objektId}/wohnungen`).then((r) => r.data),
  getWohnung: (id) => api.get(`/wohnungen/${id}`).then((r) => r.data),
  createWohnung: (objektId, data) => api.post(`/objekte/${objektId}/wohnungen`, data).then((r) => r.data),
  updateWohnung: (id, data) => api.put(`/wohnungen/${id}`, data).then((r) => r.data),
  deleteWohnung: (id) => api.delete(`/wohnungen/${id}`).then((r) => r.data),

  // Mieter
  listMieterByWohnung: (wohnungId) => api.get(`/wohnungen/${wohnungId}/mieter`).then((r) => r.data),
  getMieter: (id) => api.get(`/mieter/${id}`).then((r) => r.data),
  createMieter: (wohnungId, data) => api.post(`/wohnungen/${wohnungId}/mieter`, data).then((r) => r.data),
  updateMieter: (id, data) => api.put(`/mieter/${id}`, data).then((r) => r.data),
  deleteMieter: (id) => api.delete(`/mieter/${id}`).then((r) => r.data),

  // Mieter-Login-Zugang (Einladen/Zugang erstellen)
  getMieterLoginStatus: (id) => api.get(`/mieter/${id}/login-status`).then((r) => r.data),
  createMieterLogin: (id, data) => api.post(`/mieter/${id}/create-login`, data).then((r) => r.data),
  resetMieterPassword: (id, data) => api.post(`/mieter/${id}/reset-password`, data || {}).then((r) => r.data),

  // Zähler
  listZaehlerByObjekt: (objektId) => api.get(`/zaehler/objekt/${objektId}`).then((r) => r.data),
  getZaehler: (id) => api.get(`/zaehler/${id}`).then((r) => r.data),
  listZaehlerMitStand: (objektId, jahr) => api.get(`/zaehler/objekt/${objektId}/jahr/${jahr}`).then((r) => r.data),
  createZaehler: (data) => api.post('/zaehler', data).then((r) => r.data),
  updateZaehler: (id, data) => api.put(`/zaehler/${id}`, data).then((r) => r.data),
  deleteZaehler: (id) => api.delete(`/zaehler/${id}`).then((r) => r.data),
  getZaehlerStaende: (id) => api.get(`/zaehler/${id}/staende`).then((r) => r.data),
  setZaehlerStand: (id, data) => api.post(`/zaehler/${id}/staende`, data).then((r) => r.data),

  // Kosten
  listKostenarten: (objektId) => api.get(`/kosten/kostenarten/${objektId}`).then((r) => r.data),
  createKostenart: (data) => api.post('/kosten/kostenarten', data).then((r) => r.data),
  updateKostenart: (id, data) => api.put(`/kosten/kostenarten/${id}`, data).then((r) => r.data),
  deleteKostenart: (id) => api.delete(`/kosten/kostenarten/${id}`).then((r) => r.data),
  listKosten: (objektId, jahr) => api.get(`/kosten/objekt/${objektId}/jahr/${jahr}`).then((r) => r.data),
  setKosten: (objektId, jahr, data) => api.post(`/kosten/objekt/${objektId}/jahr/${jahr}`, data).then((r) => r.data),
  getGas: (objektId, jahr) => api.get(`/kosten/gas/${objektId}/${jahr}`).then((r) => r.data),
  setGas: (objektId, jahr, data) => api.post(`/kosten/gas/${objektId}/${jahr}`, data).then((r) => r.data),
  getIndividuelleAnteile: (kostenartId) => api.get(`/kosten/kostenarten/${kostenartId}/anteile`).then((r) => r.data),
  setIndividuelleAnteile: (kostenartId, data) => api.post(`/kosten/kostenarten/${kostenartId}/anteile`, data).then((r) => r.data),

  // Abrechnung
  getVerteilung: (objektId, jahr) => api.get(`/abrechnung/objekt/${objektId}/jahr/${jahr}`).then((r) => r.data),
  getAlleMieterabrechnungen: (objektId, jahr) => api.get(`/abrechnung/mieter/objekt/${objektId}/jahr/${jahr}`).then((r) => r.data),
  getWohnungAbrechnung: (wohnungId, jahr) => api.get(`/abrechnung/wohnung/${wohnungId}/jahr/${jahr}`).then((r) => r.data),
  getWohnungHistorie: (wohnungId) => api.get(`/abrechnung/wohnung/${wohnungId}/historie`).then((r) => r.data),

  // Dokumente
  listDokumente: (objektId) => api.get(`/dokumente/objekt/${objektId}`).then((r) => r.data),
  deleteDokument: (id) => api.delete(`/dokumente/${id}`).then((r) => r.data),
  generateMietvertrag: (mieterId) => api.post(`/dokumente/generate/mietvertrag/${mieterId}`).then((r) => r.data),
  generateWohnungsuebergabe: (mieterId) => api.post(`/dokumente/generate/wohnungsuebergabe/${mieterId}`).then((r) => r.data),
  generateHausordnung: (objektId) => api.post(`/dokumente/generate/hausordnung/${objektId}`).then((r) => r.data),
  generateReinigungsplan: (objektId, jahr) => api.post(`/dokumente/generate/reinigungsplan/${objektId}${jahr ? '?jahr=' + jahr : ''}`).then((r) => r.data),
  abrechnungHtmlUrl: (wohnungId, jahr) => `/api/dokumente/abrechnung-html/${wohnungId}/${jahr}`,
  dokumentHtmlUrl: (id) => `/api/dokumente/${id}/html`,

  // Einstellungen (Branding: App-Name & Logo)
  getEinstellungen: () => api.get('/einstellungen').then((r) => r.data),
  updateEinstellungen: (data) => api.put('/einstellungen', data).then((r) => r.data),

  // Demo-Daten (flexibel, admin-gesteuert)
  generateDemo: (data) => api.post('/demo/generate', data).then((r) => r.data),

  // Einstellungen erweitert (Heizungsanteil, §9a, PIN-Schutz, Erinnerungen, Vermieter-Kontakt)
  getEinstellungenErweitert: () => api.get('/einstellungen/erweitert').then((r) => r.data),
  updateEinstellungenErweitert: (data) => api.put('/einstellungen/erweitert', data).then((r) => r.data),
  verifyPin: (pin) => api.post('/einstellungen/pin-verify', { pin }).then((r) => r.data),

  // Dashboard erweitert (Leerstand, Mietende-Warnungen, Nachzahlungen, 3-Jahres-Kostentrend)
  getDashboardErweitert: (objektId, jahr) => api.get(`/dashboard/objekt/${objektId}${jahr ? '?jahr=' + jahr : ''}`).then((r) => r.data),

  // Zähler: Ablesungs-Ampel + CSV-Export
  zaehlerCsvUrl: (objektId, jahr) => `/api/zaehler/objekt/${objektId}/jahr/${jahr}/csv`,

  // Budget (Soll-Ist-Vergleich)
  getBudget: (objektId, jahr) => api.get(`/budget/objekt/${objektId}/jahr/${jahr}`).then((r) => r.data),
  setBudget: (objektId, jahr, kostenartId, betragSoll) =>
    api.post(`/budget/objekt/${objektId}/jahr/${jahr}`, { kostenart_id: kostenartId, betrag_soll: betragSoll }).then((r) => r.data),

  // Schadensmeldungen
  listSchaedenByObjekt: (objektId, status) => api.get(`/schaeden/objekt/${objektId}${status ? '?status=' + status : ''}`).then((r) => r.data),
  listSchaedenByWohnung: (wohnungId) => api.get(`/schaeden/wohnung/${wohnungId}`).then((r) => r.data),
  createSchaden: (data) => api.post('/schaeden', data).then((r) => r.data),
  updateSchaden: (id, data) => api.put(`/schaeden/${id}`, data).then((r) => r.data),
  deleteSchaden: (id) => api.delete(`/schaeden/${id}`).then((r) => r.data),

  // Unterlagen (Dateiupload: Steuerberater-Dokumente, Mieter-Uploads etc.)
  listUnterlagenByObjekt: (objektId, ordner) => api.get(`/unterlagen/objekt/${objektId}${ordner ? '?ordner=' + ordner : ''}`).then((r) => r.data),
  listUnterlagenByWohnung: (wohnungId) => api.get(`/unterlagen/wohnung/${wohnungId}`).then((r) => r.data),
  getUnterlageData: (id) => api.get(`/unterlagen/${id}/data`).then((r) => r.data),
  uploadUnterlage: (data) => api.post('/unterlagen', data).then((r) => r.data),
  deleteUnterlage: (id) => api.delete(`/unterlagen/${id}`).then((r) => r.data),
};

// ---- kleine Utility-Funktionen ----
function fmtEuro(n) {
  return (n ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fmtNum(n, digits = 1) {
  return (n ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}
function fmtPct(n) {
  return ((n ?? 0) * 100).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
}
function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('de-DE');
  } catch {
    return d;
  }
}
function toast(msg, type = 'info') {
  const colors = { info: 'bg-blue-600', success: 'bg-emerald-600', error: 'bg-red-600' };
  const el = document.createElement('div');
  el.className = `toast fixed top-4 right-4 z-50 ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 2800);
}
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
