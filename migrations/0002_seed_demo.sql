-- ============================================================
-- Demo-Seed: 6-Familienhaus "Musterstrasse 1" (aus Referenz-Excel übernommen)
-- Enthält Jahr 2024 (Vorjahr) und 2025 (aktuell) zum Vergleich
-- ============================================================

INSERT INTO objekte (id, name, strasse, plz, ort, vermieter_name, vermieter_strasse, vermieter_plz_ort, vermieter_telefon, vermieter_email, bank_name, iban, bic, steuernummer)
VALUES (1, 'Mehrfamilienhaus Musterstrasse 1', 'Musterstrasse 1', '12345', 'Musterstadt',
  'Max Mustermann', 'Musterstrasse 1', '12345 Musterstadt', '0123 456789', 'verwaltung@musterhaus.de',
  'Musterbank AG', 'DE12 3456 7890 1234 5678 90', 'MUSTDE12', '123/456/78901');

INSERT INTO wohnungen (id, objekt_id, bezeichnung, lage, flaeche_m2, sort_order) VALUES
 (1, 1, 'W1', 'EG links', 80, 1),
 (2, 1, 'W2', 'EG rechts', 80, 2),
 (3, 1, 'W3', 'OG links', 80, 3),
 (4, 1, 'W4', 'OG rechts', 80, 4),
 (5, 1, 'W5', 'DG-1', 80, 5),
 (6, 1, 'W6', 'DG-2', 80, 6);

-- Mieter (aktiv, 2025)
INSERT INTO mieter (id, wohnung_id, vorname, nachname, email, telefon, personen, mietbeginn, mietende,
  kaltmiete_qm, kaltmiete_monat, erhoehung_pct, vorauszahlung_nk_monat, aktiv) VALUES
 (1, 1, '', 'Beispiel-Mieter 1', 'mieter1@example.com', '', 2, '2025-01-01', '2025-12-31', 10,   800, 0, 240, 1),
 (2, 2, '', 'Beispiel-Mieter 2', 'mieter2@example.com', '', 1, '2025-01-01', '2025-12-31', 10.5, 840, 0, 200, 1),
 (3, 3, '', 'Beispiel-Mieter 3', 'mieter3@example.com', '', 3, '2025-01-01', '2025-12-31', 11,   880, 0, 280, 1),
 (4, 4, '', 'Beispiel-Mieter 4', 'mieter4@example.com', '', 2, '2025-01-01', '2025-12-31', 10.5, 840, 0, 260, 1),
 (5, 5, '', 'Beispiel-Mieter 5', 'mieter5@example.com', '', 2, '2025-01-01', '2025-12-31', 12,   960, 0, 260, 1),
 (6, 6, '', 'Beispiel-Mieter 6', 'mieter6@example.com', '', 2, '2025-01-01', '2025-12-31', 12,   960, 0, 260, 1);

-- Zähler: WMZ Heizung (W1-W4 je 1, W5/W6 je 2 Ebenen), WMZ Boiler (Gebäude), Warmwasser + Kaltwasser je Wohnung
INSERT INTO zaehler (id, objekt_id, wohnung_id, typ, ebene, bezeichnung, einheit, sort_order) VALUES
 (1, 1, NULL, 'wmz_boiler', '', 'Boiler-WMZ Warmwasser-Hzg (300L, Gas-Zentral)', 'kWh', 0),
 (2, 1, 1, 'wmz_heizung', '', 'Wärmemengenzähler Heizung', 'kWh', 1),
 (3, 1, 2, 'wmz_heizung', '', 'Wärmemengenzähler Heizung', 'kWh', 2),
 (4, 1, 3, 'wmz_heizung', '', 'Wärmemengenzähler Heizung', 'kWh', 3),
 (5, 1, 4, 'wmz_heizung', '', 'Wärmemengenzähler Heizung', 'kWh', 4),
 (6, 1, 5, 'wmz_heizung', 'Ebene 1', 'Wärmemengenzähler Heizung Ebene 1', 'kWh', 5),
 (7, 1, 5, 'wmz_heizung', 'Ebene 2', 'Wärmemengenzähler Heizung Ebene 2', 'kWh', 6),
 (8, 1, 6, 'wmz_heizung', 'Ebene 1', 'Wärmemengenzähler Heizung Ebene 1', 'kWh', 7),
 (9, 1, 6, 'wmz_heizung', 'Ebene 2', 'Wärmemengenzähler Heizung Ebene 2', 'kWh', 8),
 (10, 1, 1, 'warmwasser', '', 'Warmwasserzähler', 'm³', 9),
 (11, 1, 2, 'warmwasser', '', 'Warmwasserzähler', 'm³', 10),
 (12, 1, 3, 'warmwasser', '', 'Warmwasserzähler', 'm³', 11),
 (13, 1, 4, 'warmwasser', '', 'Warmwasserzähler', 'm³', 12),
 (14, 1, 5, 'warmwasser', '', 'Warmwasserzähler', 'm³', 13),
 (15, 1, 6, 'warmwasser', '', 'Warmwasserzähler', 'm³', 14),
 (16, 1, 1, 'kaltwasser', '', 'Kaltwasserzähler', 'm³', 15),
 (17, 1, 2, 'kaltwasser', '', 'Kaltwasserzähler', 'm³', 16),
 (18, 1, 3, 'kaltwasser', '', 'Kaltwasserzähler', 'm³', 17),
 (19, 1, 4, 'kaltwasser', '', 'Kaltwasserzähler', 'm³', 18),
 (20, 1, 5, 'kaltwasser', '', 'Kaltwasserzähler', 'm³', 19),
 (21, 1, 6, 'kaltwasser', '', 'Kaltwasserzähler', 'm³', 20);

-- Zählerstände 2024 (Vorjahr = "Vorwert" aus Excel) und 2025 (aktuell)
-- Boiler
INSERT INTO zaehlerstaende (zaehler_id, jahr, stand, ablesedatum) VALUES
 (1, 2024, 85000, '2024-12-31'), (1, 2025, 91050, '2025-12-31'),
-- W1
 (2, 2024, 12500, '2024-12-31'), (2, 2025, 14200, '2025-12-31'),
 (10, 2024, 8500, '2024-12-31'), (10, 2025, 9800, '2025-12-31'),
 (16, 2024, 4200, '2024-12-31'), (16, 2025, 4850, '2025-12-31'),
-- W2
 (3, 2024, 11800, '2024-12-31'), (3, 2025, 13100, '2025-12-31'),
 (11, 2024, 7900, '2024-12-31'), (11, 2025, 8850, '2025-12-31'),
 (17, 2024, 3900, '2024-12-31'), (17, 2025, 4400, '2025-12-31'),
-- W3
 (4, 2024, 13200, '2024-12-31'), (4, 2025, 15400, '2025-12-31'),
 (12, 2024, 9200, '2024-12-31'), (12, 2025, 10900, '2025-12-31'),
 (18, 2024, 4500, '2024-12-31'), (18, 2025, 5350, '2025-12-31'),
-- W4
 (5, 2024, 12100, '2024-12-31'), (5, 2025, 13850, '2025-12-31'),
 (13, 2024, 8300, '2024-12-31'), (13, 2025, 9500, '2025-12-31'),
 (19, 2024, 4100, '2024-12-31'), (19, 2025, 4700, '2025-12-31'),
-- W5 (2 Ebenen Heizung)
 (6, 2024, 10500, '2024-12-31'), (6, 2025, 11400, '2025-12-31'),
 (7, 2024, 5200, '2024-12-31'), (7, 2025, 5800, '2025-12-31'),
 (14, 2024, 8200, '2024-12-31'), (14, 2025, 8950, '2025-12-31'),
 (20, 2024, 4000, '2024-12-31'), (20, 2025, 4600, '2025-12-31'),
-- W6 (2 Ebenen Heizung)
 (8, 2024, 10800, '2024-12-31'), (8, 2025, 11700, '2025-12-31'),
 (9, 2024, 5100, '2024-12-31'), (9, 2025, 5700, '2025-12-31'),
 (15, 2024, 8400, '2024-12-31'), (15, 2025, 9200, '2025-12-31'),
 (21, 2024, 4100, '2024-12-31'), (21, 2025, 4750, '2025-12-31');

-- Kostenarten (17 Positionen gemäß §2 BetrKV + Heizung/Warmwasser nach §7/§8 HeizkostenV)
INSERT INTO kostenarten (id, objekt_id, nr, bezeichnung, verteilerschluessel, beschreibung, sort_order) VALUES
 (1, 1, 1, 'Grundsteuer', 'flaeche', 'Verteilung nach Wohnfläche (§2 Nr.1 BetrKV)', 1),
 (2, 1, 2, 'Heizung Gas (Raumwärme)', 'heizung_30_70', '30% nach m² + 70% nach WMZ-Verbrauch (§7 HeizkostenV)', 2),
 (3, 1, 3, 'Warmwasser Gas (Erwärmung)', 'warmwasser_30_70', '30% nach m² + 70% nach WW-m³ (§8 HeizkostenV)', 3),
 (4, 1, 4, 'Wasserversorgung (Frischwasser)', 'wasser_verbrauch', 'WW-m³ + KW-m³ pro Wohnung', 4),
 (5, 1, 5, 'Abwasser (Schmutzwasser)', 'wasser_verbrauch', 'Nach Gesamtfrischwasser (WW+KW)', 5),
 (6, 1, 6, 'Müllabfuhr', 'personen', 'Nach Personenzahl je Wohnung', 6),
 (7, 1, 7, 'Straßenreinigung', 'einheiten', 'Pro Wohneinheit', 7),
 (8, 1, 8, 'Gebäudereinigung', 'einheiten', 'Pro Wohneinheit', 8),
 (9, 1, 9, 'Gartenpflege', 'einheiten', 'Pro Wohneinheit', 9),
 (10, 1, 10, 'Allgemeinstrom', 'einheiten', 'Pro Wohneinheit', 10),
 (11, 1, 11, 'Schornsteinfeger', 'einheiten', 'Pro Wohneinheit', 11),
 (12, 1, 12, 'Versicherungen (Sach/Haft)', 'flaeche', 'Verteilung nach Wohnfläche', 12),
 (13, 1, 13, 'Hauswart / Hausmeister', 'einheiten', 'Pro Wohneinheit', 13),
 (14, 1, 14, 'Wartung Heizung', 'einheiten', 'Pro Wohneinheit', 14),
 (15, 1, 15, 'Aufzug', 'einheiten', 'Pro Wohneinheit', 15),
 (16, 1, 16, 'Kabelanschluss', 'einheiten', 'Pro Wohneinheit', 16),
 (17, 1, 17, 'Sonstige Kosten', 'flaeche', 'Verteilung nach Wohnfläche', 17);

-- Kosten 2025 (Heizung/Warmwasser = 0 -> wird automatisch aus Gasabrechnung berechnet)
INSERT INTO kosten (objekt_id, kostenart_id, jahr, betrag) VALUES
 (1, 1, 2025, 1800), (1, 2, 2025, 0), (1, 3, 2025, 0), (1, 4, 2025, 2400), (1, 5, 2025, 3200),
 (1, 6, 2025, 1440), (1, 7, 2025, 360), (1, 8, 2025, 2400), (1, 9, 2025, 1200), (1, 10, 2025, 480),
 (1, 11, 2025, 240), (1, 12, 2025, 1800), (1, 13, 2025, 4800), (1, 14, 2025, 600), (1, 15, 2025, 720),
 (1, 16, 2025, 720), (1, 17, 2025, 360);

-- Kosten 2024 (Vorjahr, leicht abweichend, zum Vergleich)
INSERT INTO kosten (objekt_id, kostenart_id, jahr, betrag) VALUES
 (1, 1, 2024, 1750), (1, 2, 2024, 0), (1, 3, 2024, 0), (1, 4, 2024, 2250), (1, 5, 2024, 3000),
 (1, 6, 2024, 1380), (1, 7, 2024, 350), (1, 8, 2024, 2300), (1, 9, 2024, 1150), (1, 10, 2024, 460),
 (1, 11, 2024, 230), (1, 12, 2024, 1750), (1, 13, 2024, 4650), (1, 14, 2024, 580), (1, 15, 2024, 700),
 (1, 16, 2024, 700), (1, 17, 2024, 340);

-- Gas-Jahresrechnung (Versorger) -> automatische Aufteilung Heizung/Warmwasser
INSERT INTO gasabrechnung (objekt_id, jahr, gesamtbetrag) VALUES
 (1, 2025, 8300),
 (1, 2024, 7900);

-- Zählerstände für 2023 (damit 2024 auch einen "Vorwert" für Verbrauchsberechnung hat) - grob geschätzt anteilig kleiner
INSERT INTO zaehlerstaende (zaehler_id, jahr, stand, ablesedatum) VALUES
 (1, 2023, 79500, '2023-12-31'),
 (2, 2023, 10950, '2023-12-31'), (10, 2023, 7300, '2023-12-31'), (16, 2023, 3650, '2023-12-31'),
 (3, 2023, 10600, '2023-12-31'), (11, 2023, 6950, '2023-12-31'), (17, 2023, 3450, '2023-12-31'),
 (4, 2023, 11500, '2023-12-31'), (12, 2023, 7800, '2023-12-31'), (18, 2023, 3800, '2023-12-31'),
 (5, 2023, 10600, '2023-12-31'), (13, 2023, 7250, '2023-12-31'), (19, 2023, 3600, '2023-12-31'),
 (6, 2023, 9700, '2023-12-31'), (7, 2023, 4700, '2023-12-31'), (14, 2023, 7550, '2023-12-31'), (20, 2023, 3500, '2023-12-31'),
 (8, 2023, 9950, '2023-12-31'), (9, 2023, 4600, '2023-12-31'), (15, 2023, 7700, '2023-12-31'), (21, 2023, 3550, '2023-12-31');

-- Admin- und Mieter-Logins (Demo-Passwort: "admin123" bzw. "mieter123" -- wird per Setup-Skript gesetzt)
