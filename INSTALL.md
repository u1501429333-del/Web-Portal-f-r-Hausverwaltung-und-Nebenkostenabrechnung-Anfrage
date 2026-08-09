# Installationsanleitung – Hausverwaltung Portal auf der TV-Box (Amlogic S912 / Armbian)

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
4. Führt `docker compose build` aus (baut das Image – Node 20, installiert Abhängigkeiten, führt `npm run build` aus).
5. Führt `docker compose up -d` aus (startet den Container im Hintergrund, `restart: unless-stopped`).
6. Beim Container-Start wendet der Entrypoint automatisch alle Datenbank-Migrationen an (`docker/entrypoint.sh`) – beim allerersten Start wird die komplette Datenbank inkl. Demo-Daten angelegt, bei späteren Starts nur neue Migrationen.

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
[entrypoint] Wende D1-Migrationen an ...
[entrypoint] Starte Hausverwaltung Portal auf Port 3000 ...
⎔ Starting local server...
[wrangler] Ready on http://0.0.0.0:3000
```

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
| Daten nach Update/Neustart weg | Volume-Mount in `docker-compose.yml` prüfen (`hausverwaltung_data:/app/.wrangler/state`) – niemals `docker compose down -v` verwenden (das `-v` löscht Volumes!). Nur `docker compose down` (ohne `-v`) bzw. `docker compose restart`. |
| `permission denied` bei `docker`-Befehlen (frisch installiert) | Einmal ab- und wieder anmelden, damit die Gruppenmitgliedschaft `docker` aktiv wird, oder `sudo` vor die Befehle stellen. |

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
entwickelt. Für das Self-Hosting auf deiner TV-Box läuft sie **nicht** über echtes
Cloudflare, sondern über `wrangler pages dev` (Miniflare) als lokalen Node.js-Prozess
inkl. lokal emulierter D1-SQLite-Datenbank – **funktional identisch** (gleicher Code,
gleiche Berechnungen, gleiche Dokumente), aber eben lokal statt in der Cloudflare-Cloud.
Das ist im `Dockerfile` als Kommentar dokumentiert.
