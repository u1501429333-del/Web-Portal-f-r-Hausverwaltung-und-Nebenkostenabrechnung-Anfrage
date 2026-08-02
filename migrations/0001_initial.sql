-- ============================================================
-- Hausverwaltung & Nebenkostenabrechnung - Initiales Datenbankschema
-- Basis: BetrKV §2 (17 Betriebskostenarten), HeizkostenV §7/§8 (30/70)
-- ============================================================

-- Objekte (Liegenschaften / Mehrfamilienhäuser)
CREATE TABLE IF NOT EXISTS objekte (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  strasse TEXT NOT NULL DEFAULT '',
  plz TEXT NOT NULL DEFAULT '',
  ort TEXT NOT NULL DEFAULT '',
  land TEXT DEFAULT 'Deutschland',
  vermieter_name TEXT DEFAULT '',
  vermieter_strasse TEXT DEFAULT '',
  vermieter_plz_ort TEXT DEFAULT '',
  vermieter_telefon TEXT DEFAULT '',
  vermieter_email TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  iban TEXT DEFAULT '',
  bic TEXT DEFAULT '',
  steuernummer TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Wohnungen (Einheiten innerhalb eines Objekts)
CREATE TABLE IF NOT EXISTS wohnungen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objekt_id INTEGER NOT NULL REFERENCES objekte(id) ON DELETE CASCADE,
  bezeichnung TEXT NOT NULL,
  lage TEXT DEFAULT '',
  flaeche_m2 REAL NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Mieter (aktuelle & historische Mietverhältnisse pro Wohnung)
CREATE TABLE IF NOT EXISTS mieter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wohnung_id INTEGER NOT NULL REFERENCES wohnungen(id) ON DELETE CASCADE,
  anrede TEXT DEFAULT '',
  vorname TEXT DEFAULT '',
  nachname TEXT NOT NULL,
  email TEXT DEFAULT '',
  telefon TEXT DEFAULT '',
  personen INTEGER NOT NULL DEFAULT 1,
  mietbeginn TEXT,
  mietende TEXT,
  kaltmiete_qm REAL DEFAULT 0,
  kaltmiete_monat REAL DEFAULT 0,
  erhoehung_pct REAL DEFAULT 0,
  vorauszahlung_nk_monat REAL DEFAULT 0,
  iban TEXT DEFAULT '',
  kontoinhaber TEXT DEFAULT '',
  aktiv INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Benutzer / Login (Admin & Mieter)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','mieter')),
  mieter_id INTEGER REFERENCES mieter(id) ON DELETE SET NULL,
  name TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Zähler (WMZ Heizung, WMZ Boiler, Warmwasser, Kaltwasser, Sonstige)
CREATE TABLE IF NOT EXISTS zaehler (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objekt_id INTEGER NOT NULL REFERENCES objekte(id) ON DELETE CASCADE,
  wohnung_id INTEGER REFERENCES wohnungen(id) ON DELETE CASCADE, -- NULL = Gebäude/Gemeinschaft (z.B. Boiler)
  typ TEXT NOT NULL CHECK(typ IN ('wmz_heizung','wmz_boiler','warmwasser','kaltwasser','sonstige')),
  ebene TEXT DEFAULT '',
  bezeichnung TEXT NOT NULL,
  einheit TEXT NOT NULL DEFAULT 'kWh',
  seriennummer TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Zählerstände pro Abrechnungsjahr
CREATE TABLE IF NOT EXISTS zaehlerstaende (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zaehler_id INTEGER NOT NULL REFERENCES zaehler(id) ON DELETE CASCADE,
  jahr INTEGER NOT NULL,
  ablesedatum TEXT,
  stand REAL NOT NULL DEFAULT 0,
  quelle TEXT DEFAULT 'admin',
  erfasst_von INTEGER REFERENCES users(id),
  erfasst_am TEXT DEFAULT (datetime('now')),
  notiz TEXT DEFAULT '',
  UNIQUE(zaehler_id, jahr)
);

-- Kostenarten (Katalog der Betriebskostenarten je Objekt)
CREATE TABLE IF NOT EXISTS kostenarten (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objekt_id INTEGER NOT NULL REFERENCES objekte(id) ON DELETE CASCADE,
  nr INTEGER NOT NULL,
  bezeichnung TEXT NOT NULL,
  verteilerschluessel TEXT NOT NULL CHECK(verteilerschluessel IN
    ('flaeche','personen','einheiten','wasser_verbrauch','heizung_30_70','warmwasser_30_70','individuell')),
  beschreibung TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  aktiv INTEGER DEFAULT 1
);

-- Kosten (Jahresbeträge je Kostenart)
CREATE TABLE IF NOT EXISTS kosten (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objekt_id INTEGER NOT NULL REFERENCES objekte(id) ON DELETE CASCADE,
  kostenart_id INTEGER NOT NULL REFERENCES kostenarten(id) ON DELETE CASCADE,
  jahr INTEGER NOT NULL,
  betrag REAL NOT NULL DEFAULT 0,
  UNIQUE(kostenart_id, jahr)
);

-- Gas-Jahresrechnung (für automatische Aufteilung Heizung/Warmwasser nach HeizkostenV §7/§8)
CREATE TABLE IF NOT EXISTS gasabrechnung (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objekt_id INTEGER NOT NULL REFERENCES objekte(id) ON DELETE CASCADE,
  jahr INTEGER NOT NULL,
  gesamtbetrag REAL NOT NULL DEFAULT 0,
  UNIQUE(objekt_id, jahr)
);

-- Generierte Dokumente (Mietvertrag, Hausordnung, Reinigungsplan, etc.)
CREATE TABLE IF NOT EXISTS dokumente (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objekt_id INTEGER REFERENCES objekte(id) ON DELETE CASCADE,
  wohnung_id INTEGER REFERENCES wohnungen(id) ON DELETE CASCADE,
  mieter_id INTEGER REFERENCES mieter(id) ON DELETE CASCADE,
  typ TEXT NOT NULL CHECK(typ IN ('mietvertrag','hausordnung','reinigungsplan','sonstige')),
  titel TEXT DEFAULT '',
  inhalt_html TEXT,
  erstellt_am TEXT DEFAULT (datetime('now'))
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_wohnungen_objekt ON wohnungen(objekt_id);
CREATE INDEX IF NOT EXISTS idx_mieter_wohnung ON mieter(wohnung_id);
CREATE INDEX IF NOT EXISTS idx_zaehler_objekt ON zaehler(objekt_id);
CREATE INDEX IF NOT EXISTS idx_zaehler_wohnung ON zaehler(wohnung_id);
CREATE INDEX IF NOT EXISTS idx_zaehlerstaende_zaehler ON zaehlerstaende(zaehler_id);
CREATE INDEX IF NOT EXISTS idx_zaehlerstaende_jahr ON zaehlerstaende(jahr);
CREATE INDEX IF NOT EXISTS idx_kostenarten_objekt ON kostenarten(objekt_id);
CREATE INDEX IF NOT EXISTS idx_kosten_objekt_jahr ON kosten(objekt_id, jahr);
CREATE INDEX IF NOT EXISTS idx_users_mieter ON users(mieter_id);
CREATE INDEX IF NOT EXISTS idx_dokumente_wohnung ON dokumente(wohnung_id);
