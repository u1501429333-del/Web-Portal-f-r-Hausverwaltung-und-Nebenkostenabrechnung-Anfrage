// ============================================================
// Globaler App-State
// ============================================================
const AppState = {
  user: null, // { id, email, role, name, mieterId }
  objekte: [],
  currentObjektId: null,
  currentJahr: new Date().getFullYear(),
  branding: null, // { app_name, logo_data_url }
};

function currentObjekt() {
  return AppState.objekte.find((o) => o.id === AppState.currentObjektId) || null;
}

async function ensureBrandingLoaded() {
  if (!AppState.branding) {
    try {
      AppState.branding = await API.getEinstellungen();
    } catch {
      AppState.branding = { app_name: 'Hausverwaltung Portal', logo_data_url: '' };
    }
  }
  return AppState.branding;
}
