-- ============================================================
-- Erweiterung: Schadensmeldungen, Unterlagen/Upload-Ordner,
-- Budgetplanung, erweiterte Einstellungen (Heizungsanteil §7/§8
-- konfigurierbar, §9a-Zuschlag, PIN-Schutz, Erinnerungsfristen),
-- Mietende-Tracking-Hilfsindex
-- ============================================================

-- Schadensmeldungen (Mieter meldet, Admin bearbeitet Status)
CREATE TABLE IF NOT EXISTS schadensmeldungen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objekt_id INTEGER NOT NULL REFERENCES objekte(id) ON DELETE CASCADE,
  wohnung_id INTEGER NOT NULL REFERENCES wohnungen(id) ON DELETE CASCADE,
  mieter_id INTEGER REFERENCES mieter(id) ON DELETE SET NULL,
  titel TEXT NOT NULL DEFAULT '',
  beschreibung TEXT DEFAULT '',
  raum TEXT DEFAULT '',
  prioritaet TEXT NOT NULL DEFAULT 'mittel' CHECK(prioritaet IN ('hoch','mittel','niedrig')),
  status TEXT NOT NULL DEFAULT 'offen' CHECK(status IN ('offen','in_bearbeitung','erledigt')),
  admin_notiz TEXT DEFAULT '',
  erstellt_am TEXT DEFAULT (datetime('now')),
  aktualisiert_am TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_schaden_wohnung ON schadensmeldungen(wohnung_id);
CREATE INDEX IF NOT EXISTS idx_schaden_objekt ON schadensmeldungen(objekt_id);
CREATE INDEX IF NOT EXISTS idx_schaden_status ON schadensmeldungen(status);

-- Unterlagen (Datei-Uploads: Bilder von Zählern, Steuerdokumente, etc.)
-- Dateien werden als Base64-Data-URL direkt in der DB gespeichert (analog zum Logo-Ansatz),
-- da Cloudflare-Pages/D1-Self-Hosting ohne R2-Objektspeicher läuft.
CREATE TABLE IF NOT EXISTS unterlagen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objekt_id INTEGER REFERENCES objekte(id) ON DELETE CASCADE,
  wohnung_id INTEGER REFERENCES wohnungen(id) ON DELETE CASCADE,
  mieter_id INTEGER REFERENCES mieter(id) ON DELETE CASCADE,
  ordner TEXT NOT NULL DEFAULT 'allgemein', -- z.B. 'steuerberater', 'zaehlerfotos', 'sonstige'
  dateiname TEXT NOT NULL DEFAULT '',
  content_type TEXT DEFAULT 'application/octet-stream',
  data_url TEXT NOT NULL,
  groesse_bytes INTEGER DEFAULT 0,
  hochgeladen_von TEXT DEFAULT '', -- 'admin' oder 'mieter'
  beschreibung TEXT DEFAULT '',
  erstellt_am TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_unterlagen_objekt ON unterlagen(objekt_id);
CREATE INDEX IF NOT EXISTS idx_unterlagen_wohnung ON unterlagen(wohnung_id);
CREATE INDEX IF NOT EXISTS idx_unterlagen_ordner ON unterlagen(ordner);

-- Budgetplanung: geplanter (Soll-)Betrag je Kostenart & Jahr, für Soll-Ist-Vergleich
CREATE TABLE IF NOT EXISTS budget (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objekt_id INTEGER NOT NULL REFERENCES objekte(id) ON DELETE CASCADE,
  kostenart_id INTEGER NOT NULL REFERENCES kostenarten(id) ON DELETE CASCADE,
  jahr INTEGER NOT NULL,
  betrag_soll REAL NOT NULL DEFAULT 0,
  UNIQUE(kostenart_id, jahr)
);
CREATE INDEX IF NOT EXISTS idx_budget_objekt_jahr ON budget(objekt_id, jahr);

-- Erweiterte globale Einstellungen (Key-Value, gleiche Tabelle wie Branding)
INSERT OR IGNORE INTO einstellungen (key, value) VALUES ('heizkosten_verbrauch_anteil', '0.7'); -- konfigurierbar 0.5 - 0.7 (HeizkostenV §7: 50-70% verbrauchsabhängig)
INSERT OR IGNORE INTO einstellungen (key, value) VALUES ('zuschlag_9a_pct', '0');              -- §9a HeizkostenV Nichtabrechnungs-Zuschlag in %, 0 = deaktiviert
INSERT OR IGNORE INTO einstellungen (key, value) VALUES ('pin_schutz_aktiv', '0');             -- '1' = PIN-Schutz für Admin-Einstellungen aktiv
INSERT OR IGNORE INTO einstellungen (key, value) VALUES ('pin_code', '');                      -- gehashter oder Klartext-PIN (kurzer Zusatzschutz, kein Ersatz für Login)
INSERT OR IGNORE INTO einstellungen (key, value) VALUES ('erinnerung_ablesung_tage_vorher', '14'); -- Erinnerungsfrist Zählerablesung
INSERT OR IGNORE INTO einstellungen (key, value) VALUES ('erinnerung_abrechnung_frist_monate', '12'); -- gesetzliche Abrechnungsfrist (§556 Abs. 3 BGB: 12 Monate)
INSERT OR IGNORE INTO einstellungen (key, value) VALUES ('vermieter_email_steuerberater', '');

-- Kostenarten: sort_order-basierter Index für Budget-Abfragen
CREATE INDEX IF NOT EXISTS idx_kosten_objekt_jahr ON kosten(objekt_id, jahr);
