// ============================================================
// Globaler App-State
// ============================================================
const AppState = {
  user: null, // { id, email, role, name, mieterId }
  objekte: [],
  currentObjektId: null,
  currentJahr: new Date().getFullYear(),
  branding: null, // { app_name, logo_data_url }
  // PIN-Schutz-Gate (siehe app.js router() + admin_einstellungen.js):
  // pinVerified bleibt für die Dauer der Browser-Session gesetzt (kein Reload-Schutz
  // über Tabs hinweg), wird aber bei Logout und bei jedem vollständigen Seiten-Reload
  // zurückgesetzt – wer den Admin-Bereich neu öffnet, muss den PIN erneut eingeben.
  pinVerified: false,
  pinChecked: false, // wurde der PIN-Schutz-Status bereits einmal vom Server geladen?
  pinRequired: false, // Ergebnis dieser Prüfung (pin_schutz_aktiv && pin_gesetzt)
};

function currentObjekt() {
  return AppState.objekte.find((o) => o.id === AppState.currentObjektId) || null;
}

async function ensureBrandingLoaded() {
  if (!AppState.branding) {
    try {
      AppState.branding = await API.getEinstellungen();
    } catch {
      AppState.branding = { app_name: 'UHV-Web-Portal', logo_data_url: '' };
    }
  }
  return AppState.branding;
}
