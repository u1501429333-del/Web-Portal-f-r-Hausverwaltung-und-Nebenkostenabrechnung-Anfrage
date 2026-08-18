# UHV-Web-Portal v3 – Nebenkostenabrechnung für Mehrfamilienhäuser

## Projektübersicht
- **Name**: UHV-Web-Portal v3
- **Ziel**: Vollständige Verwaltung eines (oder mehrerer) Mehrfamilienhäuser inkl.
  rechtskonformer Nebenkostenabrechnung nach deutschem Recht (BetrKV, HeizkostenV),
  mit getrennten Rollen für Admin (Hausverwaltung) und Mieter.
- **Hierarchie**: Objekte → Wohnungen → Mieter → Kosten/Zählerstände/Dokumente
  (flexibel für beliebig viele Objekte/Wohnungen konfigurierbar, nicht hartkodiert).

## Hauptfunktionen
- **Admin- und Mieter-Login** mit Rollen-/Rechtetrennung, PBKDF2-Passwort-Hashing,
  HMAC-signierte Session-Cookies (httpOnly). Optionaler **PIN-Schutz** für sensible
  Admin-Bereiche (Einstellungen, verifizierbar per `/api/einstellungen/pin-verify`).
- **WMZ-Zählerstände** (Wärmemengenzähler Heizung, Warmwasser, Kaltwasser) mit
  Jahresvergleich (Vorjahr/aktuelles Jahr), **Ablesungs-Ampel** (grün/gelb/rot je nach
  Aktualität der letzten Ablesung) und **CSV-Export für den Steuerberater**
  (UTF-8-BOM, semikolon-getrennt für Excel) inkl. direktem **„An Steuerberater
  senden"-Mailto-Link**.
- **Nebenkostenabrechnung nach BetrKV §2** (alle 17 gesetzlichen Kostenarten,
  **automatisch beim Anlegen eines neuen Objekts erzeugt**) und **HeizkostenV
  §7/§8** mit **konfigurierbarem Verbrauchsanteil (50–70 %, Admin-einstellbar)**
  statt fest 30/70, sowie optionalem **§9a-Nichtabrechnungszuschlag (0–15 %)**.
- **Auto-Zähler bei neuer Wohnung**: Beim Anlegen einer Wohnung werden automatisch
  3 Standardzähler (WMZ Heizung/kWh, Warmwasser/m³, Kaltwasser/m³) angelegt.
- **Individuelle Verteilerschlüssel**: Für Kostenarten mit Schlüssel "individuell"
  können pro Wohnung beliebige Prozent-Anteile hinterlegt werden (automatisch auf
  100 % normalisiert; ohne Eintrag gleichmäßige Verteilung als Fallback).
- **Admin-Dashboard** mit Leerstandsquote, offenen Nachzahlungen/Guthaben,
  Mietende-Warnungen (90-Tage-Vorschau) und **3-Jahres-Kostentrend mit linearer
  Regressionsanalyse** (Chart.js-Diagramm inkl. Prognose fürs Folgejahr).
- **Budgetplanung (Soll-Ist-Vergleich)** je Kostenart und Jahr, mit farbiger
  Differenzanzeige.
- **Schadensmeldungen**: Mieter können Schäden mit Priorität, Raumauswahl und
  Beschreibung melden; Admin verwaltet Status-Workflow (offen → in Bearbeitung →
  erledigt) inkl. Rückmeldungs-Notiz an den Mieter.
- **Unterlagen-Verwaltung**: Datei-Upload (Base64-Data-URL, bis ~5 MB) in Ordnern
  „Allgemein", „Steuerberater" (nur Admin) und „Zählerfotos"; Mieter können eigene
  Dateien (z. B. Zählerfotos, Ablesedatenblätter) hochladen und wieder löschen.
- **WMZ-Ablesehilfe** (Bedienungsanleitung Sensus PolluCom F/E, Schritte L1–L6) als
  aufklappbare Karte im Mieterportal sowie als druckfertiges HTML-Dokument, inkl.
  Bildbeispiel und **leerem Ablesedatenblatt zum Ausdrucken**.
- **Auto-generierte Dokumente** (HTML, druckbar/als PDF exportierbar über
  `@media print`), inkl. Firmen-Logo im Briefkopf:
  - Mietvertrag (inkl. Stellplatz/Garage/Keller/Garten/Schlüssel-Angaben)
  - Wohnungsübergabeprotokoll
  - Hausordnung
  - Treppenreinigungsplan (**echte wöchentliche ISO-Kalenderwochen-Rotation**, nicht
    monatlich)
  - Nebenkostenabrechnung pro Mieter
  - WMZ-Ablesehilfe (Sensus PolluCom F/E) und Ablesedatenblatt
  - Dokumente werden automatisch (neu) erzeugt, wenn eine neue Wohnung oder ein
    neuer Mieter angelegt wird.
- **Branding**: Editierbarer App-Name + Logo-Upload (Data-URL, in der Datenbank
  gespeichert), erscheint in Sidebar, Login-Seite und allen Dokumenttypen.
- **Flexibler Demo-Datengenerator** (Admin-einstellbar: Anzahl Wohnungen, Jahre,
  Namensschema, E-Mail-Domain, optionales automatisches Anlegen von Mieter-Logins)
  – ersetzt fest verdrahtete Testdaten.
- **Mieter einladen**: Admin kann für jeden Mieter ein Login anlegen/zurücksetzen
  (idempotent – erneutes Einladen aktualisiert statt zu duplizieren).
- **WMZ kWh/MWh-Korrektheit**: Jeder Wärmemengenzähler (WMZ Heizung/Boiler) hat in
  den Stammdaten ein explizites **Ableseeinheit-Feld (kWh oder MWh)**. Die
  Verbrauchsberechnung (`normalizeWaermeeinheitZuKwh()`) normalisiert den erfassten
  Zählerwert unabhängig von der am Gerät angezeigten Einheit **immer auf kWh**, bevor
  er in die Nebenkostenabrechnung einfließt – Geräte, die nur MWh anzeigen
  (z. B. Sensus PolluCom E/F), liefern dadurch garantiert korrekte Abrechnungsbeträge.
  Serverseitige Validierung (`ERLAUBTE_EINHEITEN`) verhindert unpassende Einheiten je
  Zählertyp (z. B. Wasserzähler nur m³). Der CSV-Export für den Steuerberater enthält
  zusätzlich eine normalisierte kWh-Spalte neben dem Rohwert.
- **Korrigierte Sensus-WMZ-Ablesehilfe**: Die Bedienungsanleitung beschreibt jetzt
  fachlich korrekt die 6 echten Geräte-Ebenen (L1 Benutzerebene = für Mieter
  relevant, L2 Stichtagsebene, L3 Archivebene, L4 Serviceebene, L5
  Tariffunktionsebene, L6 Parameterebene = passwortgeschützt/eichrechtlich
  gesperrt) inkl. der echten Navigationsschritte (roten Knopf 5 Sek. halten →
  Ebene wählen → 2 Sek. halten zum Öffnen → Werte durchblättern) sowie einer
  Warnung zur MWh/kWh-Anzeige.
- **Mietspiegel-Modul (Overath, PLZ 51491) – ZWEI Ausgaben hinterlegt**: Neue
  Datenbanktabellen `mietspiegel_ausgaben` / `mietspiegel_werte` und API
  (`/api/mietspiegel/*`) mit der vollständigen amtlichen Nettokaltmieten-Tabelle
  (jeweils 96 Wertkombinationen aus Baualtersklasse × Größenklasse × Ausstattung ×
  Wohnlage) des **Mietspiegels für frei finanzierte Wohnungen in Bergisch Gladbach**:
  - **Ausgabe Stand 01.01.2026** (aktuell gültig, `ist_aktuell = 1`)
  - **Ausgabe Stand 01.01.2024** (war während des gesamten Jahres **2025** gültig)
  Overath besitzt keinen eigenen Mietspiegel, ist aber laut amtlicher Erläuterung
  Nr. 6 in **beiden** Ausgaben wortgleich **uneingeschränkt eingeschlossen** (ebenso
  Odenthal und Rösrath; Kürten mit 10 %-Abschlag) – rechtlich ein **einfacher
  Mietspiegel nach §558c BGB**. Die 2024er-Ausgabe wurde entgegen der ursprünglichen
  Annahme **nicht** beim kostenpflichtigen Haus-und-Grund-Shop, sondern **kostenlos
  direkt bei der Stadt Bergisch Gladbach** (amtliches Dokumenten-Center,
  `bergischgladbach.de`) bezogen – damit ist auch die "2025er-Datenlücke" aus einer
  früheren Version dieses Projekts vollständig geschlossen.
  - `GET /api/mietspiegel/jahr/:jahr` liefert automatisch die für das jeweilige
    Abrechnungsjahr gültige Ausgabe (z. B. `jahr=2025` → Ausgabe Stand 2024,
    `jahr=2026` → Ausgabe Stand 2026).
  - `GET /api/mietspiegel/einordnung?baujahr=&groesse_m2=&jahr=` liefert die passende
    Nettokaltmieten-Spanne (€/m²) zur Einordnung einer Wohnung für ein bestimmtes Jahr
    (ohne `jahr`-Parameter wird die aktuell gültige Ausgabe verwendet).
- **Automatische Mietspiegel-Update-Prüfung (realistische Umsetzung)**: Da Cloudflare
  Workers keine eigenständigen Hintergrundprozesse/Web-Scraper zur Laufzeit ausführen
  können, wurde bewusst **kein** simuliertes "automatisches Herunterladen" umgesetzt.
  Stattdessen ist die Datenstruktur so vorbereitet (`einstellungen.mietspiegel_letzte_pruefung`,
  `mietspiegel_email_erinnerung`), dass eine spätere Erinnerungsfunktion (Dashboard-Banner
  bzw. E-Mail zu Jahresbeginn: „Bitte prüfen, ob eine neue Mietspiegel-Ausgabe erschienen
  ist") ergänzt werden kann. Eine echte automatische Beschaffung neuer amtlicher Daten
  ist auf dieser Plattform technisch nicht möglich und würde zudem eine manuelle
  Prüfung durch den Vermieter nicht ersetzen (Mietspiegel sind amtliche, kostenpflichtige
  bzw. urheberrechtlich geschützte Dokumente).

## URLs
- **Lokale Entwicklung (Sandbox)**: `http://localhost:3000` (via PM2 + `wrangler pages dev`)
- **Selbst-Hosting (Docker, z. B. TV-Box)**: `http://<Server-IP>:3000` – siehe
  [`INSTALL.md`](./INSTALL.md) für die vollständige Schritt-für-Schritt-Anleitung.
- **GitHub**: https://github.com/u1501429333-del/Web-Portal-f-r-Hausverwaltung-und-Nebenkostenabrechnung-Anfrage

## Daten-Architektur
- **Datenmodell** (SQLite/D1): `objekte`, `wohnungen`, `mieter`, `zaehler`,
  `zaehlerstaende`, `kostenarten`, `kosten`, `individuelle_anteile`, `dokumente`,
  `users`, `einstellungen` (Key-Value, u. a. Branding/Heizkosten-Split/PIN),
  `schadensmeldungen`, `unterlagen` (Base64-Data-URL-Dateien), `budget`
  (Soll-Werte je Kostenart/Jahr).
- **Storage**: Cloudflare D1 (SQLite) – im Self-Hosting-Betrieb lokal emuliert über
  `wrangler pages dev --local` (Miniflare), persistiert in einem Docker-Volume.
- **Datenfluss**: Zählerstände + Kosten pro Objekt/Jahr → `berechneVerteilung()`
  (BetrKV/HeizkostenV-konforme Verteilung inkl. individueller Anteile) →
  Nebenkostenabrechnung pro Mieter (HTML/PDF).

## API-Endpunkte (Auswahl, alle unter `/api/*`, Session-Cookie erforderlich)
| Bereich | Methode & Pfad | Zugriff |
|---|---|---|
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | öffentlich/beide |
| Dashboard | `GET /dashboard/objekt/:objektId?jahr=` (Leerstand, Nachzahlungen, Mietende, Kostentrend+Regression) | Admin |
| Einstellungen | `GET/PUT /einstellungen/erweitert`, `POST /einstellungen/pin-verify` | Admin |
| Zähler | `GET /zaehler/objekt/:objektId/jahr/:jahr/csv` (CSV-Export, Ablesungs-Ampel) | Admin |
| Budget | `GET /budget/objekt/:objektId/jahr/:jahr`, `POST /budget/objekt/:objektId/jahr/:jahr` (Soll-Ist) | Admin |
| Schadensmeldungen | `GET/POST/PUT/DELETE /schaeden/*` (Objekt/Wohnung-Listen, Status-Workflow) | Admin+Mieter (eigene) |
| Unterlagen | `GET/POST/DELETE /unterlagen/*` (Ordner: allgemein/steuerberater/zaehlerfotos) | Admin+Mieter (eigene) |
| Dokumente | `GET /dokumente/wmz-ablesehilfe/html`, `GET /dokumente/ablesedatenblatt/:wohnungId/:jahr` | Admin+Mieter (eigene Wohnung) |
| Objekte/Wohnungen | `POST /objekte` (erzeugt automatisch 17 BetrKV-Kostenarten), `POST /objekte/:id/wohnungen` (erzeugt automatisch 3 Standardzähler) | Admin |
| Mietspiegel | `GET /mietspiegel/aktuell`, `GET /mietspiegel/jahr/:jahr`, `GET /mietspiegel/ausgaben`, `GET /mietspiegel/einordnung?baujahr=&groesse_m2=&jahr=` (Overath/Bergisch Gladbach, Ausgaben 2024 & 2026) | Admin |

## Benutzerhandbuch (Kurzfassung)
1. **Admin-Login** mit den Zugangsdaten aus der Demo-Migration (siehe unten) oder
   eigenem Account.
2. **Admin → Objekte**: Objekt anlegen, darunter Wohnungen anlegen.
3. **Admin → Wohnung-Detail**: Mieter anlegen (inkl. Stellplatz/Garage/Keller/Garten/
   Schlüssel), Mieter-Login per Klick einladen.
4. **Admin → Zähler**: Zählerstände je Jahr erfassen.
5. **Admin → Kosten**: Kostenarten (BetrKV §2) mit Betrag und Verteilerschlüssel je
   Jahr erfassen; bei "individuell" per "%"-Button eigene Wohnungs-Anteile festlegen.
6. **Admin → Abrechnung**: Nebenkostenabrechnung berechnen und je Mieter ansehen/drucken.
7. **Admin → Dokumente**: Mietvertrag/Hausordnung/Wohnungsübergabe/Reinigungsplan
   einsehen bzw. neu generieren.
8. **Admin → Stammdaten / Branding**: App-Name/Logo ändern, Demo-Daten generieren.
9. **Mieter-Login**: Mieter sehen ihre eigene Abrechnung, Zählerstände (inkl.
   WMZ-Ablesehilfe), Dokumente, können Schäden melden und eigene Unterlagen hochladen.
10. **Admin → Einstellungen**: Heizkostenanteil (§7/§8) und §9a-Zuschlag anpassen,
    PIN-Schutz aktivieren, Erinnerungsfristen und Steuerberater-E-Mail hinterlegen.
11. **Admin → Schadensmeldungen**: Status setzen, Rückmeldung an Mieter notieren.
12. **Admin → Unterlagen**: Steuerberater-Dokumente hochladen, Mieter-Uploads einsehen.

**Demo-Zugangsdaten (Basis-Migration):**
| Rolle  | E-Mail                     | Passwort   |
|--------|-----------------------------|------------|
| Admin  | `admin@hausverwaltung.de`   | `admin123` |
| Mieter | `mieter1@example.com`       | `mieter123`|

## Noch nicht implementiert
- Mietspiegel-Admin-UI (Frontend-Ansicht der Tabelle + Wohnungs-Einordnung im
  Browser) – Backend/API und Datenbank sind vollständig fertig, die Anzeige im
  Admin-Bereich fehlt noch.
- UI-Dialog zum Ändern des eigenen Passworts (aktuell nur per DB/Admin-Reset möglich).
- Echter (serverseitiger) E-Mail-Versand von Dokumenten/CSV-Exporten (aktuell nur
  `mailto:`-Link bzw. HTML-Ansicht/Druck – kein SMTP/API-Versand).
- PIN-Schutz ist aktuell nur eine Einstellung + Verifikations-Endpoint; es fehlt noch
  ein Frontend-Gate/Modal, das den Admin-Bereich beim Öffnen tatsächlich sperrt.
- Taggenauer PDF-Export mit Briefkopf für die **Jahresübersicht aller Wohnungen**
  (Summenfußzeile) ist noch nicht umgesetzt – aktuell nur Einzelabrechnung pro Mieter.
- Mehrsprachigkeit (aktuell nur Deutsch).
- Automatisierte Tests (aktuell manuell per curl/Playwright verifiziert).

## Empfohlene nächste Schritte
- PIN-Schutz-Frontend-Gate (Modal-Abfrage vor Zugriff auf Admin-Bereich) ergänzen.
- Passwort-Ändern-Dialog für Admin/Mieter ergänzen.
- Echter E-Mail-Versand (z. B. via Resend/SendGrid REST-API) statt `mailto:`-Link.
- Jahresübersicht-PDF (alle Wohnungen, Summenfußzeile) als weiteres Dokument ergänzen.
- Echtes Cloudflare-Deployment (Pages + echte D1-Datenbank) als Alternative zum
  Self-Hosting anbieten.

## Deployment
- **Plattform (Self-Hosting)**: Docker Compose auf beliebigem Linux-Host (getestet
  für Amlogic S912 / Armbian 6.1.149-ophub / Debian bookworm), läuft parallel zu
  bestehenden Containern wie `homeassistant`/`portainer`.
- **Plattform (alternativ)**: Cloudflare Pages/Workers (nativer Zielstack der App).
- **Tech-Stack**: Hono + TypeScript (Backend), Vanilla JS SPA + Tailwind CSS + Chart.js
  (Frontend, CDN-basiert), Cloudflare D1/SQLite (Datenbank).
- **Status**: ✅ Aktiv (lokale Sandbox-Instanz läuft), Docker-Self-Hosting-Setup
  bereitgestellt (`Dockerfile`, `docker-compose.yml`, `scripts/install.sh`,
  `scripts/update.sh`, `scripts/backup.sh`) – siehe [`INSTALL.md`](./INSTALL.md).
- **Letzte Aktualisierung**: 2026-08-16 (1. Docker-Self-Hosting: `workerd`/`wrangler pages dev`
  zur Laufzeit durch einen eigenen nativen `node:http`-Server (`server/node-server.mjs`) mit
  `node:sqlite`-D1-Kompatibilitätsschicht (`server/d1-shim.mjs`) ersetzt – behebt einen
  bekannten, bei Cloudflare ungelösten `workerd`-TCMalloc-Absturz auf ARM64-Geräten mit
  39-Bit-Kernel-Adressraum (Standard bei Armbian/TV-Boxen); Datenpfad im Docker-Volume
  geändert von `/app/.wrangler/state` auf `/app/data`.
  2. Login-Fix: Session-Cookie (`src/routes/auth.ts`) hatte fest `secure: true` gesetzt,
  wodurch Browser es bei reinem HTTP-Self-Hosting (z. B. `http://<lan-ip>:3000` ohne eigenes
  TLS) stillschweigend verwarfen – jeder Login führte danach sofort zu "Keine Berechtigung".
  Wird jetzt automatisch anhand des tatsächlichen Verbindungsprotokolls gesetzt.
  Siehe [`INSTALL.md`](./INSTALL.md#fehlerbehebung-troubleshooting) für Details.
  3. UI/UX-Überarbeitung (Screenshots-Feedback): `admin/schaeden`-Absturz durch
  SQL-Zitat-Bug behoben (`node:sqlite` erlaubt anders als D1/Miniflare keine
  doppelten Anführungszeichen für String-Literale); neuer Selbstbedienungs-Dialog
  "Mein Konto" (E-Mail/Passwort ändern) für Admin **und** Mieter über die Sidebar;
  neue zentrale Übersichtsseite "Mieter-Zugänge" (`/admin/mieter-zugaenge`), die
  objektübergreifend zeigt, welche Mieter bereits einen Portal-Login haben und
  erlaubt, Zugänge direkt anzulegen/zurückzusetzen (vorher nur versteckt in der
  Wohnungs-Detailansicht auffindbar).
  4. Vollständiges Seiten-Audit (alle `admin_*.js`-Seiten + komplettes
  Mieter-Portal) auf "stille" JavaScript-Fehler geprüft: `admin_dokumente.js`
  referenzierte für die Treppenreinigungsplan-Generierung ein nicht mehr
  existierendes Formularfeld (`reinigungsplan-jahr`) – Button schlug bei jedem
  Klick fehl, jetzt behoben (nutzt den globalen Jahres-Filter der Kopfzeile).
  5. Dashboard und Seiten-Layout kompakter/professioneller gestaltet: KPI-Kacheln
  in einer schlanken Zeile statt zwei Reihen, Mietende-Warnungen als schmale
  Hinweiszeile statt große Box, kleinere Diagramme, Wohnungstabelle mit
  Scroll-Begrenzung und fixiertem Tabellenkopf; Sidebar/Header verschlankt;
  gesamtes Layout nutzt jetzt feste Bildschirmhöhe mit eigenständig scrollendem
  Inhaltsbereich, damit Seiten wie bei einer professionellen
  Hausverwaltungs-Software auf den Bildschirm passen, auch bei vielen Wohnungen.)

## Entwicklung (lokal / Sandbox)
```bash
npm install
npm run build
pm2 start ecosystem.config.cjs   # oder: npm run dev:sandbox
curl http://localhost:3000
```

## Selbst-Hosting (Docker)
Siehe die ausführliche Anleitung in [`INSTALL.md`](./INSTALL.md) – kurz zusammengefasst:
```bash
git clone https://github.com/u1501429333-del/Web-Portal-f-r-Hausverwaltung-und-Nebenkostenabrechnung-Anfrage.git
cd Web-Portal-f-r-Hausverwaltung-und-Nebenkostenabrechnung-Anfrage
bash scripts/install.sh
```
