// ============================================================
// Globaler App-State
// ============================================================
const AppState = {
  user: null, // { id, email, role, name, mieterId }
  objekte: [],
  currentObjektId: null,
  currentJahr: new Date().getFullYear(),
};

function currentObjekt() {
  return AppState.objekte.find((o) => o.id === AppState.currentObjektId) || null;
}
