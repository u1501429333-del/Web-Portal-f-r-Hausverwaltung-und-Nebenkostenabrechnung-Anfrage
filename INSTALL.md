# Installationsanleitung – UHV-Web-Portal v3 auf der TV-Box (Amlogic S912 / Armbian)

Diese Anleitung ist speziell zugeschnitten auf dein System:

| Eigenschaft         | Wert |
|---------------------|------|
| Gerät                | TV-Box mit Amlogic S912 (ARM64, Cortex-A53, meist Quad-/Octa-Core) |
| Betriebssystem       | Armbian Linux `6.1.149-ophub` |
| Basis                | Debian `bookworm` |
| LAN-IP               | `192.168.178.192` |
| Bereits laufend      | Container `homeassistant`, `portainer` |
| Ziel-Port neue App   | `3000` (frei wählbar, siehe Schritt 2) |

Die App läuft komplett in einem eigenen Docker-Container und läuft **parallel** zu deinen
bestehenden Containern `homeassistant` und `portainer` – sie verwendet ein eigenes
Docker-Netzwerk und ein eigenes Daten-Volume, es gibt keine Kollision mit deren Daten.

---

## Schritt 0: Vorab-Systemcheck (Leistung prüfen)

Bevor du installierst, prüfe kurz, ob genug Reserven für einen dritten Container da sind.
Melde dich per SSH auf der TV-Box an (`ssh <user>@192.168.178.192`) und führe aus:

```bash
echo "--- Architektur ---"; uname -m
echo "--- RAM (frei/gesamt in MB) ---"; free -m
echo "--- Speicherplatz auf / ---"; df -h /
echo "--- CPU-Kerne ---"; nproc
echo "--- Laufende Container & deren Ressourcenverbrauch ---"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker stats --no-stream homeassistant portainer 2>/dev/null
```

**Faustregeln für den Amlogic S912 (typisch 2–3 GB RAM gesamt):**

| Prüfung                     | Grenzwert (Warnung wenn darunter/darüber)     |
|------------------------------|-----------------------------------------------|
| Architektur (`uname -m`)     | sollte `aarch64` sein (ARM64 – passt zum S912)|
| Freier RAM                   | mindestens **400–500 MB frei** zusätzlich zu Home Assistant + Portainer |
| Freier Speicherplatz auf `/` | mindestens **2 GB frei** (Docker-Image + Datenbank) |
| CPU-Kerne                    | 2+ empfohlen (1 Kern funktioniert, Build dauert dann nur länger) |

Falls der freie RAM knapp ist (S912-Boxen mit 2 GB Gesamt-RAM sind bei
Home Assistant + Portainer oft schon zu 60–70 % ausgelastet): Der Node-Build-Schritt
(`npm run build`) im Docker-Build braucht kurzfristig etwas mehr RAM als der laufende
Betrieb danach. Falls der Build mit "Killed" abbricht, hilft meist ein Swapfile
(siehe Anhang A) oder das Bauen auf einem anderen Rechner + Image übertragen.

Das Install-Skript (Schritt 3) führt diesen Check **automatisch** noch einmal aus,
bevor es irgendetwas installiert.

---

## Schritt 1: Port-Konflikt mit vorhandenen Containern prüfen

Prüfe, welche Ports `homeassistant` und `portainer` schon belegen:

```bash
docker ps --format "{{.Names}}: {{.Ports}}"
```

Typische Belegung:
- `homeassistant` → meist Port `8123`
- `portainer` → meist Port `9000` und/oder `9443`

Die Hausverwaltung nutzt standardmäßig **Port 3000**. Das kollidiert normalerweise mit
keinem der beiden. Falls Port 3000 auf deiner Box dennoch schon belegt ist (z. B. durch
einen anderen Dienst), ändere ihn **vor dem ersten Start** in `docker-compose.yml`:

```yaml
ports:
  - "3000:3000"   # Format: "<Host-Port>:<Container-Port>" – nur die linke Zahl ändern!
```

z. B. auf `"3050:3000"`, wenn 3000 belegt ist. Danach ist die App unter `http://192.168.178.192:3050` erreichbar.

---

## Schritt 2: Docker prüfen (ist auf der Box schon vorhanden)

Da `homeassistant` und `portainer` bereits laufen, ist Docker + Docker Compose auf deiner
Box mit hoher Wahrscheinlichkeit schon installiert. Kurzer Check:

```bash
docker --version
docker compose version
```

Wenn beides eine Version ausgibt → weiter zu Schritt 3.
Falls `docker compose version` einen Fehler zeigt (altes Docker ohne Compose-Plugin):

```bash
sudo apt-get update
sudo apt-get install -y docker-compose-plugin
```

---

## Schritt 3: Automatische Installation (empfohlener Weg)

Das Repository enthält ein fertiges Skript, das **alle** folgenden Schritte automatisch
ausführt: Systemcheck → Docker-Check → Repository klonen → Image bauen → Container starten.

```bash
# Einmalig herunterladen und ausführen (klont automatisch nach /opt/hausverwaltung):
curl -fsSL https://raw.githubusercontent.com/u1501429333-del/Web-Portal-f-r-Hausverwaltung-und-Nebenkostenabrechnung-Anfrage/main/scripts/install.sh -o /tmp/install.sh
bash /tmp/install.sh
```

Alternativ, falls du das Repo bereits manuell geklont hast:

```bash
cd /opt/hausverwaltung   # oder dein gewählter Pfad
bash scripts/install.sh
```

Das Skript zeigt am Ende die erreichbare URL und die Standard-Zugangsdaten an.

**Was das Skript im Detail macht** (siehe `scripts/install.sh`):
1. Prüft Architektur, RAM, Speicherplatz, CPU-Kerne (siehe Schritt 0) und gibt Warnungen aus, bricht aber nicht ab.
2. Prüft ob Docker + `docker compose` Plugin vorhanden sind, installiert Docker nur falls nötig.
3. Klont `https://github.com/u1501429333-del/Web-Portal-f-r-Hausverwaltung-und-Nebenkostenabrechnung-Anfrage.git` nach `/opt/hausverwaltung` (falls noch nicht vorhanden).
4. Führt `docker compose build` aus (baut das Image – Node 22, installiert Abhängigkeiten, führt `npm run build` aus).
5. Führt `docker compose up -d` aus (startet den Container im Hintergrund, `restart: unless-stopped`).
6. Beim Container-Start startet der Entrypoint (`docker/entrypoint.sh`) einen **eigenen, nativen Node.js-HTTP-Server** (`server/node-server.mjs`), der automatisch alle Datenbank-Migrationen anwendet – beim allerersten Start wird die komplette Datenbank inkl. Demo-Daten angelegt, bei späteren Starts nur neue Migrationen. (Warum kein `wrangler pages dev` mehr läuft, siehe Anhang B.)

---

## Schritt 4: Manuelle Installation (Alternative, Schritt für Schritt)

Falls du lieber jeden Schritt selbst ausführen möchtest, oder Portainer zur
Verwaltung nutzen willst:

### 4.1 Repository klonen

```bash
sudo mkdir -p /opt/hausverwaltung
sudo chown "$USER":"$USER" /opt/hausverwaltung
git clone https://github.com/u1501429333-del/Web-Portal-f-r-Hausverwaltung-und-Nebenkostenabrechnung-Anfrage.git /opt/hausverwaltung
cd /opt/hausverwaltung
chmod +x scripts/*.sh docker/entrypoint.sh
```

### 4.2 Image bauen

```bash
docker compose build
```

Auf einem S912 (ARM Cortex-A53) dauert `npm ci` + `npm run build` je nach Kernanzahl
und RAM-Reserven typischerweise **3–10 Minuten** beim ersten Mal. Das ist normal und
passiert nur einmal (spätere Updates bauen nur geänderte Layer neu).

### 4.3 Container starten

```bash
docker compose up -d
```

### 4.4 Status prüfen

```bash
docker compose ps
docker compose logs -f hausverwaltung   # Strg+C zum Beenden der Log-Ansicht
```

Erwartete Ausgabe in den Logs (nach ca. 5–15 Sekunden):
```
[server] Oeffne Datenbank: /app/data/hausverwaltung.sqlite3
[server] Wende Migration an: 0001_initial.sql
[server] Wende Migration an: 0002_...
[server] Wende Migration an: 0007_mietspiegel_2024.sql
[server] 7 neue Migration(en) angewendet.
[server] Lade Worker-Modul dist/_worker.js ...
[server] UHV-Web-Portal v3 laeuft auf http://0.0.0.0:3000
```

> Bei späteren Neustarts (Datenbank existiert bereits) fällt die Zeile
> `N neue Migration(en) angewendet.` entsprechend kürzer aus bzw. zeigt `0 neue Migration(en)`.
>
> **Hinweis:** Diese Ausgabe ersetzt seit der Umstellung auf den nativen Node-Server
> die früher hier dokumentierte `wrangler`/`⎔ Starting local server...`-Ausgabe. Wenn du
> stattdessen noch `[entrypoint] Wende D1-Migrationen an (lokal, persistiert unter
> /app/.wrangler/state) ...` gefolgt von TCMalloc-/`MmapAligned()`-Fehlern siehst, läuft
> noch ein altes Image – siehe Fehlerbehebung unten ("TCMalloc / MmapAligned() failed").

### 4.5 Alternative: Verwaltung über Portainer (statt CLI)

Da Portainer bereits läuft, kannst du den Stack auch dort einbinden:
1. Portainer öffnen → **Stacks** → **Add stack**.
2. Namen vergeben, z. B. `hausverwaltung`.
3. Bei "Build method" **Repository** wählen, Repo-URL `https://github.com/u1501429333-del/Web-Portal-f-r-Hausverwaltung-und-Nebenkostenabrechnung-Anfrage.git`, Branch `main`, Compose-Pfad `docker-compose.yml`.
4. **Deploy the stack** klicken. Portainer baut und startet den Container genauso wie `docker compose up -d`.
5. Fortschritt/Logs siehst du danach direkt im Portainer-UI unter dem Stack → Container `hausverwaltung`.

---

## Schritt 5: Erreichbarkeit testen

```bash
curl -I http://localhost:3000/
```

Erwartung: `HTTP/1.1 200 OK`. Von einem anderen Gerät im selben LAN aus im Browser öffnen:

```
http://192.168.178.192:3000
```

---

## Schritt 6: Erster Login

| Rolle  | E-Mail                     | Passwort   |
|--------|-----------------------------|------------|
| Admin  | `admin@hausverwaltung.de`   | `admin123` |
| Mieter | `mieter1@example.com`       | `mieter123`|

**Wichtig – sofort nach dem ersten Login:**
- Admin-Passwort ändern (aktuell noch nicht per UI-Dialog möglich; falls benötigt,
  kann ich dir dafür kurzfristig einen "Passwort ändern"-Dialog nachrüsten).
- Unter **Admin → Stammdaten / Branding** eigenen App-Namen und Logo hinterlegen.
- Unter **Admin → Objekte** dein echtes Objekt anlegen oder den Demo-Generator
  (**Admin → Stammdaten / Branding**, unterer Bereich) für Testdaten nutzen.

---

## Wartung / Updates

Für spätere Updates (neue Version aus GitHub holen und neu bauen) **nicht** Schritt 3/4
wiederholen, sondern das Update-Skript nutzen:

```bash
cd /opt/hausverwaltung
bash scripts/update.sh            # holt neuesten main-Branch, baut neu, startet neu
bash scripts/update.sh --backup   # wie oben, aber vorher automatisch die Datenbank sichern
```

Die Datenbank (alle Objekte/Wohnungen/Mieter/Zählerstände/Kosten/Dokumente/Logo) bleibt
dabei erhalten, da sie im Docker-Volume `hausverwaltung_data` liegt und **nicht** im
Image selbst.

### Manuelles Backup

```bash
bash scripts/backup.sh
```
Legt eine `.tar.gz`-Sicherung unter `backups/` an (Inhalt des Datenbank-Volumes).

---

## Fehlerbehebung (Troubleshooting)

| Problem | Lösung |
|---|---|
| `docker compose build` bricht mit "Killed" ab | Zu wenig RAM während des Builds. Swapfile anlegen (Anhang A) oder auf leistungsstärkerem Rechner bauen und Image exportieren/importieren (`docker save` / `docker load`). |
| Port 3000 schon belegt | In `docker-compose.yml` den Host-Port ändern, siehe Schritt 1. |
| `docker compose up -d` startet, aber `curl localhost:3000` antwortet nicht | `docker compose logs -f hausverwaltung` prüfen – meist Migration-Fehler beim ersten Start; Container einmal `docker compose restart hausverwaltung`. |
| Daten nach Update/Neustart weg | Volume-Mount in `docker-compose.yml` prüfen (`hausverwaltung_data:/app/data`) – niemals `docker compose down -v` verwenden (das `-v` löscht Volumes!). Nur `docker compose down` (ohne `-v`) bzw. `docker compose restart`. |
| `permission denied` bei `docker`-Befehlen (frisch installiert) | Einmal ab- und wieder anmelden, damit die Gruppenmitgliedschaft `docker` aktiv wird, oder `sudo` vor die Befehle stellen. |
| Container startet und stoppt sofort wieder (Endlos-Neustart durch `restart: unless-stopped`); in `docker compose logs -f hausverwaltung` steht `Wrangler requires at least Node.js v22.0.0. You are using v20...` | **Ursache war ein veraltetes Docker-Image (Node 20) – seit dem Update auf Node 22 im `Dockerfile` behoben.** Mit `bash scripts/update.sh` (bzw. `docker compose build --no-cache && docker compose up -d`) das Image komplett neu bauen. Falls der Container danach immer noch mit `wrangler`-bezogenen Fehlern abstürzt, siehe nächste Zeile – ab dieser Version läuft zur Laufzeit gar kein `wrangler` mehr, dieser Fehler kann also nicht mehr auftreten. |
| Container-Log zeigt `external/tcmalloc.../MmapAligned() failed`, `CHECK in Alloc: FATAL ERROR: Out of memory`, `✘ [ERROR] write EPIPE` und Endlos-Neustart | **Bekannter, von Cloudflare bisher ungelöster Bug in `workerd`** (dem internen Laufzeit-Kern von `wrangler pages dev`): Auf praktisch jedem ARM64-Gerät mit 39-Bit-Kernel-Adressraum (Standard bei Armbian/TV-Boxen, auch Raspberry Pi OS) stürzt `workerd`s TCMalloc-Speicherallokator beim Start ab (siehe `cloudflare/workerd#5013`, `#5020`, `cloudflare/workers-sdk#10878`). **Das ist unabhängig von der Node-Version** und nicht durch Konfiguration behebbar. **Lösung ab dieser Version:** Die App läuft zur Laufzeit nicht mehr über `wrangler pages dev`, sondern über einen eigenen nativen `node:http`-Server (`server/node-server.mjs`) mit `node:sqlite` statt Miniflare-D1 – `workerd` wird beim Self-Hosting dadurch komplett umgangen. Mit `git pull` + `docker compose build --no-cache && docker compose up -d` (bzw. `bash scripts/update.sh`) auf die neue Version aktualisieren. Falls du bereits eine ältere Version mit echten Daten unter `/app/.wrangler/state` laufen hattest: siehe Hinweis "Umzug von altem Datenpfad" direkt unten. |
| Umzug von altem Datenpfad (`/app/.wrangler/state`) auf neuen Datenpfad (`/app/data`) | Ab dieser Version speichert die App ihre SQLite-Datenbank unter `/app/data` statt `/app/.wrangler/state` (das alte, Miniflare-spezifische Verzeichnis existiert mit dem neuen nativen Server gar nicht mehr). Da die App vorher wegen des TCMalloc-Bugs auf ARM64-TV-Boxen ohnehin nie stabil durchgestartet ist, dürfte in der Praxis kein Datenverlust entstehen. Falls du dennoch schon echte Daten auf einem anderen (z. B. x86_64-)Rechner gesammelt hast: Container stoppen (`docker compose down`, ohne `-v`), altes Volume mounten und die Datei darin suchen (`docker run --rm -v hausverwaltung_data:/old alpine find /old -name '*.sqlite3*'`), falls vorhanden nach `/app/data/hausverwaltung.sqlite3` im (neuen) `hausverwaltung_data`-Volume kopieren, dann `docker compose up -d` erneut ausführen. |

---

## Anhang A: Swapfile anlegen (falls RAM beim Build knapp wird)

Nur nötig, falls `docker compose build` mit "Killed" fehlschlägt:

```bash
sudo fallocate -l 1G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -m   # zur Kontrolle: "Swap:"-Zeile sollte jetzt ~1024 MB zeigen
```

Danach `docker compose build` erneut ausführen.

---

## Anhang B: Technischer Hintergrund (kurz)

Die App ist ursprünglich für **Cloudflare Pages/Workers** (Hono-Framework, D1-Datenbank)
entwickelt. `npm run build` (Vite) erzeugt daraus unverändert ein Standard-Cloudflare-
Worker-Modul (`dist/_worker.js`), das nur Web-APIs verwendet (`Request`/`Response`/
`fetch`) – dieser Build-Schritt und der komplette Anwendungscode (`src/`) sind von den
folgenden Änderungen **nicht** betroffen.

Für das Self-Hosting auf deiner TV-Box wurde die Laufzeitumgebung jedoch umgestellt:

**Ursprünglicher Ansatz (bis einschließlich Commit `5f48e53`):** Die App lief über
`wrangler pages dev` (intern basierend auf Cloudflares `workerd`-Laufzeit) als lokalen
Node.js-Prozess inkl. lokal emulierter D1-SQLite-Datenbank. Das funktionierte auf x86_64-
Rechnern einwandfrei, stürzte aber auf ARM64-Geräten mit 39-Bit-Kernel-Adressraum
(Standard-Konfiguration bei Armbian, den meisten TV-Box-Images und Raspberry Pi OS)
regelmäßig mit einem TCMalloc-Speicherfehler (`MmapAligned() failed`, `CHECK in Alloc:
FATAL ERROR: Out of memory`, `write EPIPE`) beim Start ab. Es handelt sich um einen
bei Cloudflare seit 2023 bekannten, bis heute (2026) ungelösten Bug in `workerd` selbst
(siehe GitHub-Issues `cloudflare/workerd#5013`, `#5020`, `cloudflare/workers-sdk#10878`,
`#3457`) – die einzigen dort genannten Workarounds sind entweder ein neu kompilierter
Kernel mit `CONFIG_ARM64_VA_BITS_48=y` (für normale Nutzer nicht praktikabel) oder eine
Korrektur seitens Cloudflare, die bislang nicht erfolgt ist. **Dieses Problem ist
unabhängig von der Node.js-Version** – der vorherige Fix (Node 20 → 22) war notwendig
(wrangler selbst benötigt Node ≥ 22), aber allein nicht ausreichend.

**Aktueller Ansatz (ab dieser Version):** Zur Laufzeit im Docker-Container läuft
`workerd`/`wrangler pages dev` gar nicht mehr. Stattdessen startet `docker/entrypoint.sh`
einen eigenen, schlanken `node:http`-Server (`server/node-server.mjs`), der das
unveränderte `dist/_worker.js`-Modul direkt lädt und dessen `fetch(request, env, ctx)`-
Handler pro eingehendem HTTP-Request aufruft (Konvertierung zwischen `http.IncomingMessage`
und den Web-Standard-Objekten `Request`/`Response`/`Headers` erfolgt in diesem Server).
Als Ersatz für die Cloudflare-D1-Datenbank kommt `server/d1-shim.mjs` zum Einsatz: eine
dünne Kompatibilitätsschicht auf Basis von Node's eingebautem `node:sqlite`-Modul
(`--experimental-sqlite`), die dieselbe API (`prepare()`, `bind()`, `first()`, `all()`,
`run()`, passende `meta`-Rückgabewerte) bereitstellt wie `env.DB` unter echtem Cloudflare
D1. `node:sqlite` wurde bewusst gewählt, weil es **ohne native Kompilierung** auskommt –
wichtig auf ARM64-TV-Boxen ohne vollständige Build-Toolchain, anders als z. B.
`better-sqlite3`. Die SQLite-Datei liegt unter `/app/data/hausverwaltung.sqlite3`
(Docker-Volume `hausverwaltung_data`), die Migrationen aus `migrations/*.sql` werden vom
nativen Server selbst und automatisch angewendet. Ergebnis: **funktional identischer**
Anwendungscode, gleiche Berechnungen, gleiche Dokumente – nur ohne `workerd` als
Laufzeitumgebung und damit ohne den ARM64-TCMalloc-Absturz. Für Entwicklung auf x86_64
(z. B. in der Genspark-Sandbox) bleibt weiterhin `wrangler pages dev` im Einsatz, da der
Bug dort nicht auftritt – ausschließlich der Docker-Self-Hosting-Pfad (`docker/entrypoint.sh`)
nutzt den nativen Server.
