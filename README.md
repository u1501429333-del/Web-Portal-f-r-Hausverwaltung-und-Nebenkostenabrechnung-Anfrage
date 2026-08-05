# Hausverwaltung Portal – Nebenkostenabrechnung für Mehrfamilienhäuser

## Projektübersicht
- **Name**: Hausverwaltung Portal
- **Ziel**: Vollständige Verwaltung eines (oder mehrerer) Mehrfamilienhäuser inkl.
  rechtskonformer Nebenkostenabrechnung nach deutschem Recht (BetrKV, HeizkostenV),
  mit getrennten Rollen für Admin (Hausverwaltung) und Mieter.
- **Hierarchie**: Objekte → Wohnungen → Mieter → Kosten/Zählerstände/Dokumente
  (flexibel für beliebig viele Objekte/Wohnungen konfigurierbar, nicht hartkodiert).

## Hauptfunktionen
- **Admin- und Mieter-Login** mit Rollen-/Rechtetrennung, PBKDF2-Passwort-Hashing,
  HMAC-signierte Session-Cookies (httpOnly).
- **WMZ-Zählerstände** (Wärmemengenzähler Heizung, Warmwasser, Kaltwasser) mit
  Jahresvergleich (Vorjahr/aktuelles Jahr).
- **Nebenkostenabrechnung nach BetrKV §2** (alle 17 gesetzlichen Kostenarten) und
  **HeizkostenV §7/§8** (30 %/70 %-Split Grundkosten/Verbrauchskosten bei Heizung/Warmwasser).
- **Individuelle Verteilerschlüssel**: Für Kostenarten mit Schlüssel "individuell"
  können pro Wohnung beliebige Prozent-Anteile hinterlegt werden (automatisch auf
  100 % normalisiert; ohne Eintrag gleichmäßige Verteilung als Fallback).
- **Auto-generierte Dokumente** (HTML, druckbar/als PDF exportierbar über
  `@media print`), inkl. Firmen-Logo im Briefkopf:
  - Mietvertrag (inkl. Stellplatz/Garage/Keller/Garten/Schlüssel-Angaben)
  - Wohnungsübergabeprotokoll
  - Hausordnung
  - Treppenreinigungsplan (**echte wöchentliche ISO-Kalenderwochen-Rotation**, nicht
    monatlich)
  - Nebenkostenabrechnung pro Mieter
  - Dokumente werden automatisch (neu) erzeugt, wenn eine neue Wohnung oder ein
    neuer Mieter angelegt wird.
- **Branding**: Editierbarer App-Name + Logo-Upload (Data-URL, in der Datenbank
  gespeichert), erscheint in Sidebar, Login-Seite und allen 5 Dokumenttypen.
- **Flexibler Demo-Datengenerator** (Admin-einstellbar: Anzahl Wohnungen, Jahre,
  Namensschema, E-Mail-Domain, optionales automatisches Anlegen von Mieter-Logins)
  – ersetzt fest verdrahtete Testdaten.
- **Mieter einladen**: Admin kann für jeden Mieter ein Login anlegen/zurücksetzen
  (idempotent – erneutes Einladen aktualisiert statt zu duplizieren).

## URLs
- **Lokale Entwicklung (Sandbox)**: `http://localhost:3000` (via PM2 + `wrangler pages dev`)
- **Selbst-Hosting (Docker, z. B. TV-Box)**: `http://<Server-IP>:3000` – siehe
  [`INSTALL.md`](./INSTALL.md) für die vollständige Schritt-für-Schritt-Anleitung.
- **GitHub**: https://github.com/dunyali58xx-ship-it/Hausverwaltung-Software-APP

## Daten-Architektur
- **Datenmodell** (SQLite/D1): `objekte`, `wohnungen`, `mieter`, `zaehler`,
  `zaehlerstaende`, `kostenarten`, `kosten`, `individuelle_anteile`, `dokumente`,
  `users`, `einstellungen` (Key-Value, u. a. Branding).
- **Storage**: Cloudflare D1 (SQLite) – im Self-Hosting-Betrieb lokal emuliert über
  `wrangler pages dev --local` (Miniflare), persistiert in einem Docker-Volume.
- **Datenfluss**: Zählerstände + Kosten pro Objekt/Jahr → `berechneVerteilung()`
  (BetrKV/HeizkostenV-konforme Verteilung inkl. individueller Anteile) →
  Nebenkostenabrechnung pro Mieter (HTML/PDF).

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
9. **Mieter-Login**: Mieter sehen ihre eigene Abrechnung, Zählerstände und Dokumente.

**Demo-Zugangsdaten (Basis-Migration):**
| Rolle  | E-Mail                     | Passwort   |
|--------|-----------------------------|------------|
| Admin  | `admin@hausverwaltung.de`   | `admin123` |
| Mieter | `mieter1@example.com`       | `mieter123`|

## Noch nicht implementiert
- UI-Dialog zum Ändern des eigenen Passworts (aktuell nur per DB/Admin-Reset möglich).
- Echter Versand von Dokumenten per E-Mail (aktuell nur HTML-Ansicht/Druck).
- Mehrsprachigkeit (aktuell nur Deutsch).
- Automatisierte Tests (aktuell manuell per curl/Playwright verifiziert).

## Empfohlene nächste Schritte
- Passwort-Ändern-Dialog für Admin/Mieter ergänzen.
- E-Mail-Versand (z. B. via Resend/SendGrid REST-API) für generierte Dokumente.
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
- **Letzte Aktualisierung**: 2026-08-05

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
git clone https://github.com/dunyali58xx-ship-it/Hausverwaltung-Software-APP.git
cd Hausverwaltung-Software-APP
bash scripts/install.sh
```
