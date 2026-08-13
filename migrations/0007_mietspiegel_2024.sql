-- ============================================================
-- Mietspiegel-Modul: Nachtrag der Ausgabe Stand 01.01.2024
-- (diese Ausgabe war während des gesamten Jahres 2025 gültig,
--  bevor sie am 01.01.2026 durch die Ausgabe 2026 abgelöst wurde)
--
-- Quelle: NICHT der kostenpflichtige Shop von Haus und Grund
-- Rhein-Berg e.V. (3,50€/4,00€ Schutzgebühr), sondern die
-- KOSTENLOSE offizielle Veröffentlichung der Stadt Bergisch
-- Gladbach selbst über deren Formularhandler/Dokumenten-Center:
-- https://www.bergischgladbach.de/module/Behoerdenlotse/Formularhandler.aspx?id=1138
-- ("Mietspiegel für frei finanzierte Wohnungen im Stadtgebiet
-- Bergisch Gladbach und des Umlandes", Stand: 1. Januar 2024).
--
-- Herausgeber/Mitwirkende (identisch zur 2026er-Ausgabe):
-- Haus und Grund Rhein-Berg e.V., Mieterverein Köln e.V.,
-- Gutachterausschuss der Stadt Bergisch Gladbach,
-- Rheinische Immobilienbörse e.V., unter Mitwirkung der Stadt
-- Bergisch Gladbach.
--
-- Geltungsbereich (Erläuterung Nr. 6, WORTGLEICH zur 2026er-Ausgabe,
-- per OCR aus dem Original-PDF verifiziert):
-- "Dieser Mietspiegel gilt uneingeschränkt auch für Odenthal,
--  Overath und Rösrath. Er ist gleichzeitig für Kürten unter
--  Abzug eines 10%igen Abschlages anwendbar."
-- => Für Overath (PLZ 51491) gilt diese Ausgabe 2024 daher OHNE
--    Abschlag, exakt wie die Ausgabe 2026.
--
-- Rechtlich: einfacher Mietspiegel nach §558c BGB (unverändert).
-- ============================================================

INSERT INTO mietspiegel_ausgaben (region, stichtag, gueltig_bis, typ, quelle, quelle_url, hinweis, ist_aktuell) VALUES (
  'Overath (PLZ 51491) / Bergisch Gladbach und Umland',
  '2024-01-01',
  '2025-12-31',
  'einfach',
  'Haus und Grund Rhein-Berg e.V., Mieterverein Köln e.V., Gutachterausschuss der Stadt Bergisch Gladbach, Rheinische Immobilienbörse e.V. unter Mitwirkung der Stadt Bergisch Gladbach',
  'https://www.bergischgladbach.de/module/Behoerdenlotse/Formularhandler.aspx?id=1138',
  'Einfacher Mietspiegel nach §558c BGB, Stand 01.01.2024 - war während des gesamten Jahres 2025 gültig (abgelöst zum 01.01.2026 durch die Ausgabe 2026). Laut amtlicher Erläuterung Nr. 6 gilt dieser Mietspiegel uneingeschränkt auch für Odenthal, Overath und Rösrath (für Kürten mit 10%-Abschlag). Wohnungen über 150 m² sind ausgeschlossen; Balkon-/Terrassenflächen werden zu 1/4 angerechnet. Quelle: kostenlose offizielle Veröffentlichung der Stadt Bergisch Gladbach (nicht der kostenpflichtige Shop von Haus und Grund Rhein-Berg e.V.).',
  0
);

-- Baualtersklasse I: bis 1960 (Ausgabe 2024, ausgabe_id=2)
INSERT INTO mietspiegel_werte (ausgabe_id, groessenklasse, groesse_m2_bezug, baualtersklasse, baujahr_von, baujahr_bis, ausstattung, wohnlage, von_eur_m2, bis_eur_m2, sort_order) VALUES
 (2,'A',40,'I',NULL,1960,'normal','mittel',6.60,7.70,10),(2,'A',40,'I',NULL,1960,'normal','gut',7.20,8.10,11),
 (2,'A',40,'I',NULL,1960,'besonders','mittel',7.30,7.90,12),(2,'A',40,'I',NULL,1960,'besonders','gut',8.00,8.60,13),
 (2,'B',60,'I',NULL,1960,'normal','mittel',6.80,7.70,20),(2,'B',60,'I',NULL,1960,'normal','gut',7.40,8.30,21),
 (2,'B',60,'I',NULL,1960,'besonders','mittel',7.50,8.20,22),(2,'B',60,'I',NULL,1960,'besonders','gut',8.20,8.80,23),
 (2,'C',80,'I',NULL,1960,'normal','mittel',6.80,7.70,30),(2,'C',80,'I',NULL,1960,'normal','gut',7.40,8.30,31),
 (2,'C',80,'I',NULL,1960,'besonders','mittel',7.50,8.10,32),(2,'C',80,'I',NULL,1960,'besonders','gut',8.20,8.80,33),
 (2,'D',100,'I',NULL,1960,'normal','mittel',6.70,7.40,40),(2,'D',100,'I',NULL,1960,'normal','gut',7.10,8.20,41),
 (2,'D',100,'I',NULL,1960,'besonders','mittel',7.30,8.10,42),(2,'D',100,'I',NULL,1960,'besonders','gut',8.10,8.70,43),
 (2,'E',120,'I',NULL,1960,'normal','mittel',6.70,7.40,50),(2,'E',120,'I',NULL,1960,'normal','gut',7.10,8.20,51),
 (2,'E',120,'I',NULL,1960,'besonders','mittel',7.30,8.10,52),(2,'E',120,'I',NULL,1960,'besonders','gut',8.10,8.70,53);

-- Baualtersklasse II: 1961 bis 1976 (Ausgabe 2024)
INSERT INTO mietspiegel_werte (ausgabe_id, groessenklasse, groesse_m2_bezug, baualtersklasse, baujahr_von, baujahr_bis, ausstattung, wohnlage, von_eur_m2, bis_eur_m2, sort_order) VALUES
 (2,'A',40,'II',1961,1976,'normal','mittel',7.80,8.80,110),(2,'A',40,'II',1961,1976,'normal','gut',8.40,9.70,111),
 (2,'A',40,'II',1961,1976,'besonders','mittel',8.30,9.70,112),(2,'A',40,'II',1961,1976,'besonders','gut',9.00,10.40,113),
 (2,'B',60,'II',1961,1976,'normal','mittel',7.70,8.90,120),(2,'B',60,'II',1961,1976,'normal','gut',8.10,9.70,121),
 (2,'B',60,'II',1961,1976,'besonders','mittel',8.20,9.80,122),(2,'B',60,'II',1961,1976,'besonders','gut',8.80,10.50,123),
 (2,'C',80,'II',1961,1976,'normal','mittel',7.50,8.80,130),(2,'C',80,'II',1961,1976,'normal','gut',8.10,9.60,131),
 (2,'C',80,'II',1961,1976,'besonders','mittel',7.90,9.70,132),(2,'C',80,'II',1961,1976,'besonders','gut',8.60,10.40,133),
 (2,'D',100,'II',1961,1976,'normal','mittel',6.80,8.40,140),(2,'D',100,'II',1961,1976,'normal','gut',7.70,9.10,141),
 (2,'D',100,'II',1961,1976,'besonders','mittel',7.20,9.20,142),(2,'D',100,'II',1961,1976,'besonders','gut',8.20,9.90,143),
 (2,'E',120,'II',1961,1976,'normal','mittel',6.80,8.40,150),(2,'E',120,'II',1961,1976,'normal','gut',7.70,9.10,151),
 (2,'E',120,'II',1961,1976,'besonders','mittel',7.20,9.20,152),(2,'E',120,'II',1961,1976,'besonders','gut',8.20,9.90,153);

-- Baualtersklasse III: 1977 bis 1989 (Ausgabe 2024)
INSERT INTO mietspiegel_werte (ausgabe_id, groessenklasse, groesse_m2_bezug, baualtersklasse, baujahr_von, baujahr_bis, ausstattung, wohnlage, von_eur_m2, bis_eur_m2, sort_order) VALUES
 (2,'A',40,'III',1977,1989,'normal','mittel',8.70,9.50,210),(2,'A',40,'III',1977,1989,'normal','gut',9.50,10.40,211),
 (2,'A',40,'III',1977,1989,'besonders','mittel',9.50,10.20,212),(2,'A',40,'III',1977,1989,'besonders','gut',9.80,11.10,213),
 (2,'B',60,'III',1977,1989,'normal','mittel',8.20,9.30,220),(2,'B',60,'III',1977,1989,'normal','gut',9.10,10.10,221),
 (2,'B',60,'III',1977,1989,'besonders','mittel',9.10,10.40,222),(2,'B',60,'III',1977,1989,'besonders','gut',9.40,10.90,223),
 (2,'C',80,'III',1977,1989,'normal','mittel',8.00,9.20,230),(2,'C',80,'III',1977,1989,'normal','gut',8.90,10.00,231),
 (2,'C',80,'III',1977,1989,'besonders','mittel',8.90,10.30,232),(2,'C',80,'III',1977,1989,'besonders','gut',9.20,10.70,233),
 (2,'D',100,'III',1977,1989,'normal','mittel',7.60,9.00,240),(2,'D',100,'III',1977,1989,'normal','gut',8.30,9.50,241),
 (2,'D',100,'III',1977,1989,'besonders','mittel',8.40,9.70,242),(2,'D',100,'III',1977,1989,'besonders','gut',9.10,10.20,243),
 (2,'E',120,'III',1977,1989,'normal','mittel',7.40,8.80,250),(2,'E',120,'III',1977,1989,'normal','gut',8.10,9.30,251),
 (2,'E',120,'III',1977,1989,'besonders','mittel',8.20,9.50,252),(2,'E',120,'III',1977,1989,'besonders','gut',8.90,10.00,253);

-- Baualtersklasse IV: 1990 bis 2004 (Ausgabe 2024)
INSERT INTO mietspiegel_werte (ausgabe_id, groessenklasse, groesse_m2_bezug, baualtersklasse, baujahr_von, baujahr_bis, ausstattung, wohnlage, von_eur_m2, bis_eur_m2, sort_order) VALUES
 (2,'A',40,'IV',1990,2004,'normal','mittel',9.50,10.40,310),(2,'A',40,'IV',1990,2004,'normal','gut',9.90,11.00,311),
 (2,'A',40,'IV',1990,2004,'besonders','mittel',10.10,10.80,312),(2,'A',40,'IV',1990,2004,'besonders','gut',10.40,11.50,313),
 (2,'B',60,'IV',1990,2004,'normal','mittel',9.00,9.90,320),(2,'B',60,'IV',1990,2004,'normal','gut',9.60,10.70,321),
 (2,'B',60,'IV',1990,2004,'besonders','mittel',9.50,10.40,322),(2,'B',60,'IV',1990,2004,'besonders','gut',10.10,11.20,323),
 (2,'C',80,'IV',1990,2004,'normal','mittel',8.90,9.80,330),(2,'C',80,'IV',1990,2004,'normal','gut',9.50,10.60,331),
 (2,'C',80,'IV',1990,2004,'besonders','mittel',9.40,10.30,332),(2,'C',80,'IV',1990,2004,'besonders','gut',10.00,11.10,333),
 (2,'D',100,'IV',1990,2004,'normal','mittel',8.60,9.50,340),(2,'D',100,'IV',1990,2004,'normal','gut',9.20,10.30,341),
 (2,'D',100,'IV',1990,2004,'besonders','mittel',9.10,10.00,342),(2,'D',100,'IV',1990,2004,'besonders','gut',9.70,10.90,343),
 (2,'E',120,'IV',1990,2004,'normal','mittel',8.30,9.20,350),(2,'E',120,'IV',1990,2004,'normal','gut',8.90,10.00,351),
 (2,'E',120,'IV',1990,2004,'besonders','mittel',8.80,9.70,352),(2,'E',120,'IV',1990,2004,'besonders','gut',9.40,10.60,353);

-- Baualtersklasse V: 2005 bis 2017 (Ausgabe 2024)
INSERT INTO mietspiegel_werte (ausgabe_id, groessenklasse, groesse_m2_bezug, baualtersklasse, baujahr_von, baujahr_bis, ausstattung, wohnlage, von_eur_m2, bis_eur_m2, sort_order) VALUES
 (2,'A',40,'V',2005,2017,'normal','mittel',9.50,10.50,410),(2,'A',40,'V',2005,2017,'normal','gut',10.10,11.20,411),
 (2,'A',40,'V',2005,2017,'besonders','mittel',10.30,11.00,412),(2,'A',40,'V',2005,2017,'besonders','gut',10.60,11.70,413),
 (2,'B',60,'V',2005,2017,'normal','mittel',9.30,10.20,420),(2,'B',60,'V',2005,2017,'normal','gut',9.90,11.00,421),
 (2,'B',60,'V',2005,2017,'besonders','mittel',9.80,10.70,422),(2,'B',60,'V',2005,2017,'besonders','gut',10.40,11.50,423),
 (2,'C',80,'V',2005,2017,'normal','mittel',9.40,10.30,430),(2,'C',80,'V',2005,2017,'normal','gut',10.00,11.10,431),
 (2,'C',80,'V',2005,2017,'besonders','mittel',9.90,10.80,432),(2,'C',80,'V',2005,2017,'besonders','gut',10.50,11.60,433),
 (2,'D',100,'V',2005,2017,'normal','mittel',9.10,10.00,440),(2,'D',100,'V',2005,2017,'normal','gut',9.70,10.80,441),
 (2,'D',100,'V',2005,2017,'besonders','mittel',9.60,10.50,442),(2,'D',100,'V',2005,2017,'besonders','gut',10.20,11.40,443),
 (2,'E',120,'V',2005,2017,'normal','mittel',9.10,10.00,450),(2,'E',120,'V',2005,2017,'normal','gut',9.70,10.80,451),
 (2,'E',120,'V',2005,2017,'besonders','mittel',9.60,10.50,452),(2,'E',120,'V',2005,2017,'besonders','gut',10.20,11.40,453);

-- Baualtersklasse VI: seit 01.01.2018 (Ausgabe 2024)
INSERT INTO mietspiegel_werte (ausgabe_id, groessenklasse, groesse_m2_bezug, baualtersklasse, baujahr_von, baujahr_bis, ausstattung, wohnlage, von_eur_m2, bis_eur_m2, sort_order) VALUES
 (2,'A',40,'VI',2018,NULL,'normal','mittel',9.80,10.90,510),(2,'A',40,'VI',2018,NULL,'normal','gut',10.40,11.60,511),
 (2,'A',40,'VI',2018,NULL,'besonders','mittel',10.60,11.40,512),(2,'A',40,'VI',2018,NULL,'besonders','gut',10.90,12.10,513),
 (2,'B',60,'VI',2018,NULL,'normal','mittel',9.60,10.60,520),(2,'B',60,'VI',2018,NULL,'normal','gut',10.20,11.40,521),
 (2,'B',60,'VI',2018,NULL,'besonders','mittel',10.10,11.10,522),(2,'B',60,'VI',2018,NULL,'besonders','gut',10.70,11.90,523),
 (2,'C',80,'VI',2018,NULL,'normal','mittel',9.80,10.80,530),(2,'C',80,'VI',2018,NULL,'normal','gut',10.40,11.60,531),
 (2,'C',80,'VI',2018,NULL,'besonders','mittel',10.30,11.30,532),(2,'C',80,'VI',2018,NULL,'besonders','gut',10.90,12.10,533),
 (2,'D',100,'VI',2018,NULL,'normal','mittel',9.50,10.50,540),(2,'D',100,'VI',2018,NULL,'normal','gut',10.10,11.30,541),
 (2,'D',100,'VI',2018,NULL,'besonders','mittel',10.00,11.00,542),(2,'D',100,'VI',2018,NULL,'besonders','gut',10.60,11.90,543),
 (2,'E',120,'VI',2018,NULL,'normal','mittel',9.50,10.50,550),(2,'E',120,'VI',2018,NULL,'normal','gut',10.10,11.30,551),
 (2,'E',120,'VI',2018,NULL,'besonders','mittel',10.00,11.00,552),(2,'E',120,'VI',2018,NULL,'besonders','gut',10.60,11.90,553);
