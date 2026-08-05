-- ============================================================
-- Erweiterung: Branding/Logo, Stellplatz/Garage/Keller/Garten/Schlüssel,
-- individuelle Verteilerschlüssel-Anteile, Wohnungsübergabe-Dokumenttyp
-- ============================================================

-- Globale Einstellungen (App-Name, Logo als Data-URL) -----------------
CREATE TABLE IF NOT EXISTS einstellungen (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);
INSERT OR IGNORE INTO einstellungen (key, value) VALUES ('app_name', 'Hausverwaltung Portal');
INSERT OR IGNORE INTO einstellungen (key, value) VALUES ('logo_data_url', '');

-- Zusätzliche Mieter-Felder: Stellplatz, Garage, Keller, Garten, Schlüssel
ALTER TABLE mieter ADD COLUMN stellplatz_vorhanden INTEGER DEFAULT 0;
ALTER TABLE mieter ADD COLUMN stellplatz_nr TEXT DEFAULT '';
ALTER TABLE mieter ADD COLUMN stellplatz_miete REAL DEFAULT 0;
ALTER TABLE mieter ADD COLUMN garage_vorhanden INTEGER DEFAULT 0;
ALTER TABLE mieter ADD COLUMN garage_nr TEXT DEFAULT '';
ALTER TABLE mieter ADD COLUMN garage_miete REAL DEFAULT 0;
ALTER TABLE mieter ADD COLUMN keller_vorhanden INTEGER DEFAULT 0;
ALTER TABLE mieter ADD COLUMN keller_nr TEXT DEFAULT '';
ALTER TABLE mieter ADD COLUMN garten_vorhanden INTEGER DEFAULT 0;
ALTER TABLE mieter ADD COLUMN garten_beschreibung TEXT DEFAULT '';
ALTER TABLE mieter ADD COLUMN anzahl_hausschluessel INTEGER DEFAULT 0;
ALTER TABLE mieter ADD COLUMN anzahl_briefkastenschluessel INTEGER DEFAULT 0;
ALTER TABLE mieter ADD COLUMN sonstige_schluessel TEXT DEFAULT '';

-- Individuelle (frei definierbare) Verteilerschlüssel-Anteile je Kostenart & Wohnung
CREATE TABLE IF NOT EXISTS individuelle_anteile (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kostenart_id INTEGER NOT NULL REFERENCES kostenarten(id) ON DELETE CASCADE,
  wohnung_id INTEGER NOT NULL REFERENCES wohnungen(id) ON DELETE CASCADE,
  anteil_pct REAL NOT NULL DEFAULT 0,
  UNIQUE(kostenart_id, wohnung_id)
);
CREATE INDEX IF NOT EXISTS idx_individuelle_anteile_ka ON individuelle_anteile(kostenart_id);

-- dokumente.typ CHECK-Constraint erweitern um 'wohnungsuebergabe' (Tabelle neu aufbauen, da SQLite
-- keine direkte ALTER-CHECK-Änderung unterstützt)
CREATE TABLE dokumente_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objekt_id INTEGER REFERENCES objekte(id) ON DELETE CASCADE,
  wohnung_id INTEGER REFERENCES wohnungen(id) ON DELETE CASCADE,
  mieter_id INTEGER REFERENCES mieter(id) ON DELETE CASCADE,
  typ TEXT NOT NULL CHECK(typ IN ('mietvertrag','hausordnung','reinigungsplan','wohnungsuebergabe','sonstige')),
  titel TEXT DEFAULT '',
  inhalt_html TEXT,
  erstellt_am TEXT DEFAULT (datetime('now'))
);
INSERT INTO dokumente_new (id, objekt_id, wohnung_id, mieter_id, typ, titel, inhalt_html, erstellt_am)
  SELECT id, objekt_id, wohnung_id, mieter_id, typ, titel, inhalt_html, erstellt_am FROM dokumente;
DROP TABLE dokumente;
ALTER TABLE dokumente_new RENAME TO dokumente;
CREATE INDEX IF NOT EXISTS idx_dokumente_wohnung ON dokumente(wohnung_id);
CREATE INDEX IF NOT EXISTS idx_dokumente_objekt ON dokumente(objekt_id);
