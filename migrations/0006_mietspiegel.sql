-- ============================================================
-- Mietspiegel-Modul: Ortsübliche Vergleichsmiete für Overath (PLZ 51491)
-- Rechtsgrundlage: § 558 BGB (ortsübliche Vergleichsmiete), § 558c BGB
-- (einfacher Mietspiegel). Overath besitzt selbst keinen eigenen
-- Mietspiegel; gemäß amtlicher Erläuterung Nr. 6 des Mietspiegels für
-- frei finanzierte Wohnungen in Bergisch Gladbach gilt dieser
-- ausdrücklich UNEINGESCHRÄNKT auch für Odenthal, Overath und Rösrath
-- (Kürten: mit 10%-Abschlag). Quelle: Haus und Grund Rhein-Berg e.V.,
-- Mieterverein Köln e.V., Rheinische Immobilienbörse e.V. unter
-- Mitwirkung der Stadt Bergisch Gladbach - "Mietspiegel für frei
-- finanzierte Wohnungen", Stand 01.01.2026 (Ausgabe alle 2 Jahre).
-- ============================================================

-- Eine Zeile je Ausgabejahr des Mietspiegels (der Mietspiegel wird ca.
-- alle 2 Jahre neu herausgegeben, gilt aber bis zur nächsten Ausgabe
-- fort - daher "gueltig_bis" statt eines einzelnen Jahres).
CREATE TABLE IF NOT EXISTS mietspiegel_ausgaben (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region TEXT NOT NULL DEFAULT 'Overath (PLZ 51491) / Bergisch Gladbach und Umland',
  stichtag TEXT NOT NULL,            -- z.B. '2026-01-01'
  gueltig_bis TEXT,                  -- NULL = aktuell gültig (bis zur nächsten Ausgabe)
  typ TEXT NOT NULL DEFAULT 'einfach' CHECK(typ IN ('einfach','qualifiziert')),
  quelle TEXT NOT NULL DEFAULT '',   -- Herausgeber/Quelle
  quelle_url TEXT DEFAULT '',
  hinweis TEXT DEFAULT '',           -- Geltungsbereich/rechtlicher Hinweis (z.B. §558c-Text)
  ist_aktuell INTEGER NOT NULL DEFAULT 0, -- 1 = wird für neue Mieterhöhungsvorschläge verwendet
  erstellt_am TEXT DEFAULT (datetime('now'))
);

-- Tabellenwerte je Ausgabe: Baualtersklasse × Wohnungsgrößenklasse × Ausstattung × Wohnlage
-- -> Nettokaltmiete-Spanne (€/m²). Struktur folgt exakt dem Original-Mietspiegel
-- (Größenklassen A-E ~ 40/60/80/100/120 m², Baualtersklassen I-VI, je 'normale' und
-- 'besondere' Ausstattung, je 'mittlere' und 'gute' Wohnlage).
CREATE TABLE IF NOT EXISTS mietspiegel_werte (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ausgabe_id INTEGER NOT NULL REFERENCES mietspiegel_ausgaben(id) ON DELETE CASCADE,
  groessenklasse TEXT NOT NULL,      -- 'A' (~40m²) .. 'E' (~120m²)
  groesse_m2_bezug REAL NOT NULL,    -- Bezugsgröße in m² (40/60/80/100/120)
  baualtersklasse TEXT NOT NULL,     -- 'I'..'VI'
  baujahr_von INTEGER,               -- z.B. NULL für "bis 1960"
  baujahr_bis INTEGER,               -- z.B. 1960
  ausstattung TEXT NOT NULL CHECK(ausstattung IN ('normal','besonders')),
  wohnlage TEXT NOT NULL CHECK(wohnlage IN ('mittel','gut')),
  von_eur_m2 REAL NOT NULL,
  bis_eur_m2 REAL NOT NULL,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mswerte_ausgabe ON mietspiegel_werte(ausgabe_id);

-- Erweiterte Einstellung: letzte automatische Prüfung auf neue Mietspiegel-Ausgabe
-- (siehe settings.ts / cron-Route). Zusätzlich zur bestehenden 'einstellungen'-Tabelle.
INSERT OR IGNORE INTO einstellungen (key, value) VALUES ('mietspiegel_letzte_pruefung', '');
INSERT OR IGNORE INTO einstellungen (key, value) VALUES ('mietspiegel_email_erinnerung', '');

-- ------------------------------------------------------------
-- Ausgabe 2026 (Stand 01.01.2026) - amtliche/offizielle Daten,
-- geprüft aus dem Original-PDF des Herausgebers (Haus und Grund
-- Rhein-Berg e.V.), Download: rheinische-immobilienboerse.de
-- ------------------------------------------------------------
INSERT INTO mietspiegel_ausgaben (region, stichtag, gueltig_bis, typ, quelle, quelle_url, hinweis, ist_aktuell) VALUES (
  'Overath (PLZ 51491) / Bergisch Gladbach und Umland',
  '2026-01-01',
  NULL,
  'einfach',
  'Haus und Grund Rhein-Berg e.V., Mieterverein Köln e.V., Rheinische Immobilienbörse e.V. unter Mitwirkung der Stadt Bergisch Gladbach',
  'https://www.rheinische-immobilienboerse.de/Mietspiegel_Bergisch_Gladbach_2026.AxCMS',
  'Einfacher Mietspiegel nach §558c BGB. Laut amtlicher Erläuterung Nr. 6 gilt dieser Mietspiegel uneingeschränkt auch für Odenthal, Overath und Rösrath (für Kürten mit 10%-Abschlag). Wohnungen über 150 m² sind ausgeschlossen; Balkon-/Terrassenflächen werden zu 1/4 angerechnet.',
  1
);

-- Baualtersklasse I: bis 1960
INSERT INTO mietspiegel_werte (ausgabe_id, groessenklasse, groesse_m2_bezug, baualtersklasse, baujahr_von, baujahr_bis, ausstattung, wohnlage, von_eur_m2, bis_eur_m2, sort_order) VALUES
 (1,'A',40,'I',NULL,1960,'normal','mittel',7.20,8.30,10),(1,'A',40,'I',NULL,1960,'normal','gut',7.80,8.80,11),
 (1,'A',40,'I',NULL,1960,'besonders','mittel',7.90,8.60,12),(1,'A',40,'I',NULL,1960,'besonders','gut',8.70,9.30,13),
 (1,'B',60,'I',NULL,1960,'normal','mittel',7.20,8.10,20),(1,'B',60,'I',NULL,1960,'normal','gut',7.80,8.80,21),
 (1,'B',60,'I',NULL,1960,'besonders','mittel',7.90,8.70,22),(1,'B',60,'I',NULL,1960,'besonders','gut',8.70,9.30,23),
 (1,'C',80,'I',NULL,1960,'normal','mittel',7.10,8.10,30),(1,'C',80,'I',NULL,1960,'normal','gut',7.70,8.70,31),
 (1,'C',80,'I',NULL,1960,'besonders','mittel',7.80,8.50,32),(1,'C',80,'I',NULL,1960,'besonders','gut',8.60,9.20,33),
 (1,'D',100,'I',NULL,1960,'normal','mittel',7.10,7.80,40),(1,'D',100,'I',NULL,1960,'normal','gut',7.50,8.70,41),
 (1,'D',100,'I',NULL,1960,'besonders','mittel',7.70,8.60,42),(1,'D',100,'I',NULL,1960,'besonders','gut',8.60,9.20,43),
 (1,'E',120,'I',NULL,1960,'normal','mittel',7.20,7.90,50),(1,'E',120,'I',NULL,1960,'normal','gut',7.60,8.80,51),
 (1,'E',120,'I',NULL,1960,'besonders','mittel',7.80,8.70,52),(1,'E',120,'I',NULL,1960,'besonders','gut',8.70,9.30,53);

-- Baualtersklasse II: 1961 bis 1976
INSERT INTO mietspiegel_werte (ausgabe_id, groessenklasse, groesse_m2_bezug, baualtersklasse, baujahr_von, baujahr_bis, ausstattung, wohnlage, von_eur_m2, bis_eur_m2, sort_order) VALUES
 (1,'A',40,'II',1961,1976,'normal','mittel',7.80,8.80,110),(1,'A',40,'II',1961,1976,'normal','gut',8.40,9.70,111),
 (1,'A',40,'II',1961,1976,'besonders','mittel',8.30,9.70,112),(1,'A',40,'II',1961,1976,'besonders','gut',9.00,10.40,113),
 (1,'B',60,'II',1961,1976,'normal','mittel',7.70,8.90,120),(1,'B',60,'II',1961,1976,'normal','gut',8.10,9.70,121),
 (1,'B',60,'II',1961,1976,'besonders','mittel',8.20,9.80,122),(1,'B',60,'II',1961,1976,'besonders','gut',8.80,10.50,123),
 (1,'C',80,'II',1961,1976,'normal','mittel',7.50,8.80,130),(1,'C',80,'II',1961,1976,'normal','gut',8.10,9.60,131),
 (1,'C',80,'II',1961,1976,'besonders','mittel',7.90,9.70,132),(1,'C',80,'II',1961,1976,'besonders','gut',8.60,10.40,133),
 (1,'D',100,'II',1961,1976,'normal','mittel',7.00,8.60,140),(1,'D',100,'II',1961,1976,'normal','gut',7.90,9.30,141),
 (1,'D',100,'II',1961,1976,'besonders','mittel',7.40,9.40,142),(1,'D',100,'II',1961,1976,'besonders','gut',8.40,10.10,143),
 (1,'E',120,'II',1961,1976,'normal','mittel',7.10,8.70,150),(1,'E',120,'II',1961,1976,'normal','gut',8.00,9.40,151),
 (1,'E',120,'II',1961,1976,'besonders','mittel',7.50,9.50,152),(1,'E',120,'II',1961,1976,'besonders','gut',8.50,10.20,153);

-- Baualtersklasse III: 1977 bis 1989
INSERT INTO mietspiegel_werte (ausgabe_id, groessenklasse, groesse_m2_bezug, baualtersklasse, baujahr_von, baujahr_bis, ausstattung, wohnlage, von_eur_m2, bis_eur_m2, sort_order) VALUES
 (1,'A',40,'III',1977,1989,'normal','mittel',9.00,9.90,210),(1,'A',40,'III',1977,1989,'normal','gut',9.90,10.80,211),
 (1,'A',40,'III',1977,1989,'besonders','mittel',9.90,10.60,212),(1,'A',40,'III',1977,1989,'besonders','gut',10.20,11.50,213),
 (1,'B',60,'III',1977,1989,'normal','mittel',8.50,9.70,220),(1,'B',60,'III',1977,1989,'normal','gut',9.50,10.50,221),
 (1,'B',60,'III',1977,1989,'besonders','mittel',9.50,10.80,222),(1,'B',60,'III',1977,1989,'besonders','gut',9.80,11.30,223),
 (1,'C',80,'III',1977,1989,'normal','mittel',8.30,9.60,230),(1,'C',80,'III',1977,1989,'normal','gut',9.30,10.40,231),
 (1,'C',80,'III',1977,1989,'besonders','mittel',9.30,10.70,232),(1,'C',80,'III',1977,1989,'besonders','gut',9.60,11.10,233),
 (1,'D',100,'III',1977,1989,'normal','mittel',8.00,9.40,240),(1,'D',100,'III',1977,1989,'normal','gut',8.60,9.90,241),
 (1,'D',100,'III',1977,1989,'besonders','mittel',8.80,10.10,242),(1,'D',100,'III',1977,1989,'besonders','gut',9.50,10.60,243),
 (1,'E',120,'III',1977,1989,'normal','mittel',7.70,9.20,250),(1,'E',120,'III',1977,1989,'normal','gut',8.40,9.70,251),
 (1,'E',120,'III',1977,1989,'besonders','mittel',8.50,9.80,252),(1,'E',120,'III',1977,1989,'besonders','gut',9.30,10.40,253);

-- Baualtersklasse IV: 1990 bis 2004
INSERT INTO mietspiegel_werte (ausgabe_id, groessenklasse, groesse_m2_bezug, baualtersklasse, baujahr_von, baujahr_bis, ausstattung, wohnlage, von_eur_m2, bis_eur_m2, sort_order) VALUES
 (1,'A',40,'IV',1990,2004,'normal','mittel',9.50,10.40,310),(1,'A',40,'IV',1990,2004,'normal','gut',9.90,11.00,311),
 (1,'A',40,'IV',1990,2004,'besonders','mittel',10.10,10.80,312),(1,'A',40,'IV',1990,2004,'besonders','gut',10.40,11.50,313),
 (1,'B',60,'IV',1990,2004,'normal','mittel',9.00,9.90,320),(1,'B',60,'IV',1990,2004,'normal','gut',9.60,10.70,321),
 (1,'B',60,'IV',1990,2004,'besonders','mittel',9.50,10.40,322),(1,'B',60,'IV',1990,2004,'besonders','gut',10.10,11.20,323),
 (1,'C',80,'IV',1990,2004,'normal','mittel',8.90,9.80,330),(1,'C',80,'IV',1990,2004,'normal','gut',9.50,10.60,331),
 (1,'C',80,'IV',1990,2004,'besonders','mittel',9.40,10.30,332),(1,'C',80,'IV',1990,2004,'besonders','gut',10.00,11.10,333),
 (1,'D',100,'IV',1990,2004,'normal','mittel',8.90,9.80,340),(1,'D',100,'IV',1990,2004,'normal','gut',9.50,10.60,341),
 (1,'D',100,'IV',1990,2004,'besonders','mittel',9.40,10.30,342),(1,'D',100,'IV',1990,2004,'besonders','gut',10.00,11.20,343),
 (1,'E',120,'IV',1990,2004,'normal','mittel',8.30,9.20,350),(1,'E',120,'IV',1990,2004,'normal','gut',8.90,10.00,351),
 (1,'E',120,'IV',1990,2004,'besonders','mittel',8.80,9.70,352),(1,'E',120,'IV',1990,2004,'besonders','gut',9.40,10.60,353);

-- Baualtersklasse V: 2005 bis 2017
INSERT INTO mietspiegel_werte (ausgabe_id, groessenklasse, groesse_m2_bezug, baualtersklasse, baujahr_von, baujahr_bis, ausstattung, wohnlage, von_eur_m2, bis_eur_m2, sort_order) VALUES
 (1,'A',40,'V',2005,2017,'normal','mittel',9.80,10.80,410),(1,'A',40,'V',2005,2017,'normal','gut',10.40,11.50,411),
 (1,'A',40,'V',2005,2017,'besonders','mittel',10.60,11.30,412),(1,'A',40,'V',2005,2017,'besonders','gut',10.90,12.10,413),
 (1,'B',60,'V',2005,2017,'normal','mittel',9.60,10.50,420),(1,'B',60,'V',2005,2017,'normal','gut',10.20,11.30,421),
 (1,'B',60,'V',2005,2017,'besonders','mittel',10.10,11.00,422),(1,'B',60,'V',2005,2017,'besonders','gut',10.70,11.80,423),
 (1,'C',80,'V',2005,2017,'normal','mittel',9.70,10.60,430),(1,'C',80,'V',2005,2017,'normal','gut',10.30,11.40,431),
 (1,'C',80,'V',2005,2017,'besonders','mittel',10.20,11.10,432),(1,'C',80,'V',2005,2017,'besonders','gut',10.80,11.90,433),
 (1,'D',100,'V',2005,2017,'normal','mittel',9.40,10.30,440),(1,'D',100,'V',2005,2017,'normal','gut',10.00,11.10,441),
 (1,'D',100,'V',2005,2017,'besonders','mittel',9.90,10.80,442),(1,'D',100,'V',2005,2017,'besonders','gut',10.50,11.70,443),
 (1,'E',120,'V',2005,2017,'normal','mittel',9.40,10.30,450),(1,'E',120,'V',2005,2017,'normal','gut',10.00,11.10,451),
 (1,'E',120,'V',2005,2017,'besonders','mittel',9.90,10.80,452),(1,'E',120,'V',2005,2017,'besonders','gut',10.50,11.70,453);

-- Baualtersklasse VI: seit 01.01.2018
INSERT INTO mietspiegel_werte (ausgabe_id, groessenklasse, groesse_m2_bezug, baualtersklasse, baujahr_von, baujahr_bis, ausstattung, wohnlage, von_eur_m2, bis_eur_m2, sort_order) VALUES
 (1,'A',40,'VI',2018,NULL,'normal','mittel',10.80,12.00,510),(1,'A',40,'VI',2018,NULL,'normal','gut',11.40,12.80,511),
 (1,'A',40,'VI',2018,NULL,'besonders','mittel',11.70,12.50,512),(1,'A',40,'VI',2018,NULL,'besonders','gut',12.00,13.30,513),
 (1,'B',60,'VI',2018,NULL,'normal','mittel',10.40,11.40,520),(1,'B',60,'VI',2018,NULL,'normal','gut',11.00,12.30,521),
 (1,'B',60,'VI',2018,NULL,'besonders','mittel',10.90,12.00,522),(1,'B',60,'VI',2018,NULL,'besonders','gut',11.60,12.90,523),
 (1,'C',80,'VI',2018,NULL,'normal','mittel',10.60,11.70,530),(1,'C',80,'VI',2018,NULL,'normal','gut',11.20,12.50,531),
 (1,'C',80,'VI',2018,NULL,'besonders','mittel',11.10,12.20,532),(1,'C',80,'VI',2018,NULL,'besonders','gut',11.80,13.10,533),
 (1,'D',100,'VI',2018,NULL,'normal','mittel',10.50,11.60,540),(1,'D',100,'VI',2018,NULL,'normal','gut',11.10,12.40,541),
 (1,'D',100,'VI',2018,NULL,'besonders','mittel',11.00,12.10,542),(1,'D',100,'VI',2018,NULL,'besonders','gut',11.70,13.10,543),
 (1,'E',120,'VI',2018,NULL,'normal','mittel',10.50,11.60,550),(1,'E',120,'VI',2018,NULL,'normal','gut',11.10,12.40,551),
 (1,'E',120,'VI',2018,NULL,'besonders','mittel',11.00,12.10,552),(1,'E',120,'VI',2018,NULL,'besonders','gut',11.70,13.10,553);
