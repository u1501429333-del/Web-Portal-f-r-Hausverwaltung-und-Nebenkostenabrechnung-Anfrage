#!/bin/bash
# ============================================================
# Install-Skript: UHV-Web-Portal v3 – Erstinstallation
# Für Debian/Armbian-basierte Systeme (z.B. TV-Box mit Amlogic S912)
#
# Führt automatisch aus:
#   1. System-Leistungsprüfung (RAM, Speicherplatz, CPU, Architektur)
#   2. Prüfung/Installation von Docker + Docker Compose Plugin
#   3. Repository klonen (falls nicht schon vorhanden)
#   4. Docker-Image bauen und Container starten
#   5. Migrationen automatisch anwenden (im Container-Start enthalten)
#
# Nutzung:
#   bash scripts/install.sh
#
# Muss mit einem Benutzer ausgeführt werden, der sudo-Rechte hat
# (für die Docker-Installation, falls Docker noch nicht vorhanden ist).
# ============================================================
set -e

REPO_URL="https://github.com/u1501429333-del/Web-Portal-f-r-Hausverwaltung-und-Nebenkostenabrechnung-Anfrage.git"
INSTALL_DIR="${1:-/opt/hausverwaltung}"

echo "============================================================"
echo " UHV-Web-Portal v3 – Installation"
echo "============================================================"
echo ""

# ---------- 1. System-Leistungsprüfung ----------------------------------
echo "==> Pruefe Systemvoraussetzungen ..."

ARCH=$(uname -m)
echo "    Architektur: $ARCH"
case "$ARCH" in
  aarch64|arm64) echo "    OK: ARM64 wird unterstuetzt (passt zu Amlogic S912)." ;;
  x86_64) echo "    OK: x86_64 wird unterstuetzt." ;;
  *) echo "    WARNUNG: Unbekannte/ungetestete Architektur ($ARCH). Fortsetzen auf eigenes Risiko." ;;
esac

# Robuste RAM-Erkennung: "free -m" liefert je nach Locale/Version/Coreutils-Variante
# (z.B. manche minimalen Armbian-Images ohne "procps") teils eine leere/anders
# formatierte Ausgabe zurück, wodurch der numerische Vergleich unten mit
# "[: : Ganzzahliger Ausdruck erwartet" fehlschlägt. Daher: zuerst /proc/meminfo
# (immer im gleichen Format vorhanden), "free -m" nur als Fallback, und am Ende
# zusätzlich auf eine gültige Zahl prüfen, bevor verglichen wird.
TOTAL_RAM_MB=""
if [ -r /proc/meminfo ]; then
  TOTAL_RAM_KB=$(awk '/^MemTotal:/{print $2}' /proc/meminfo)
  if [ -n "$TOTAL_RAM_KB" ]; then
    TOTAL_RAM_MB=$((TOTAL_RAM_KB / 1024))
  fi
fi
if [ -z "$TOTAL_RAM_MB" ] && command -v free >/dev/null 2>&1; then
  TOTAL_RAM_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}')
fi
echo "    Gesamt-RAM: ${TOTAL_RAM_MB:-unbekannt} MB"
if [ -n "$TOTAL_RAM_MB" ] && [ "$TOTAL_RAM_MB" -eq "$TOTAL_RAM_MB" ] 2>/dev/null; then
  if [ "$TOTAL_RAM_MB" -lt 900 ]; then
    echo "    WARNUNG: Weniger als 1 GB RAM erkannt. Die App benoetigt mindestens ca. 300-500 MB frei."
    echo "             Bitte unwichtige Container (z.B. testweise) stoppen, falls Probleme auftreten."
  else
    echo "    OK: Ausreichend RAM vorhanden."
  fi
else
  echo "    HINWEIS: RAM-Menge konnte nicht ermittelt werden – Pruefung wird uebersprungen."
fi

FREE_DISK_MB=$(df -Pm / 2>/dev/null | awk 'NR==2{print $4}')
echo "    Freier Speicherplatz auf /: ${FREE_DISK_MB:-unbekannt} MB"
if [ -n "$FREE_DISK_MB" ] && [ "$FREE_DISK_MB" -eq "$FREE_DISK_MB" ] 2>/dev/null; then
  if [ "$FREE_DISK_MB" -lt 2000 ]; then
    echo "    WARNUNG: Weniger als 2 GB frei. Docker-Images + Datenbank benoetigen dauerhaft Platz."
  else
    echo "    OK: Ausreichend Speicherplatz vorhanden."
  fi
else
  echo "    HINWEIS: Freier Speicherplatz konnte nicht ermittelt werden – Pruefung wird uebersprungen."
fi

CPU_CORES=$(nproc 2>/dev/null || echo "")
echo "    CPU-Kerne: ${CPU_CORES:-unbekannt}"
if [ -n "$CPU_CORES" ] && [ "$CPU_CORES" -eq "$CPU_CORES" ] 2>/dev/null && [ "$CPU_CORES" -lt 2 ]; then
  echo "    HINWEIS: Nur 1 CPU-Kern erkannt. Der Docker-Build (npm/vite) kann dadurch mehrere Minuten dauern."
fi
echo ""

# ---------- 2. Docker prüfen / installieren ------------------------------
if command -v docker >/dev/null 2>&1; then
  echo "==> Docker ist bereits installiert: $(docker --version)"
else
  echo "==> Docker wird installiert (offizielles Docker-Installationsskript) ..."
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sudo sh /tmp/get-docker.sh
  sudo usermod -aG docker "$USER" || true
  echo "    Docker installiert. Hinweis: Falls 'docker'-Befehle 'permission denied' melden,"
  echo "    einmal ab- und wieder anmelden (Gruppenmitgliedschaft 'docker')."
fi

if docker compose version >/dev/null 2>&1; then
  echo "==> Docker Compose Plugin ist vorhanden: $(docker compose version)"
else
  echo "==> FEHLER: 'docker compose' Plugin nicht gefunden. Bitte manuell installieren:"
  echo "    sudo apt-get update && sudo apt-get install -y docker-compose-plugin"
  exit 1
fi
echo ""

# ---------- 3. Repository klonen -----------------------------------------
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "==> Projektordner existiert bereits unter $INSTALL_DIR – ueberspringe Klonen."
else
  echo "==> Klone Repository nach $INSTALL_DIR ..."
  sudo mkdir -p "$(dirname "$INSTALL_DIR")"
  sudo chown "$USER":"$USER" "$(dirname "$INSTALL_DIR")" 2>/dev/null || true
  git clone "$REPO_URL" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
chmod +x scripts/*.sh docker/entrypoint.sh 2>/dev/null || true
echo ""

# ---------- 4. Docker-Image bauen + starten -------------------------------
echo "==> Baue Docker-Image (dies kann beim ersten Mal einige Minuten dauern) ..."
docker compose build

echo "==> Starte Container ..."
docker compose up -d

echo ""
echo "==> Warte 10 Sekunden auf den Start ..."
sleep 10
docker compose ps

LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
echo ""
echo "============================================================"
echo " Installation abgeschlossen!"
echo " Aufrufbar unter: http://${LOCAL_IP:-<TVBOX-IP>}:3000"
echo ""
echo " Standard-Zugangsdaten (Demo-Daten aus der Basis-Migration):"
echo "   Admin:  admin@hausverwaltung.de  / admin123"
echo "   Mieter: mieter1@example.com      / mieter123"
echo ""
echo " WICHTIG: Bitte nach dem ersten Login sofort das Admin-Passwort"
echo " aendern (aktuell noch ueber die Datenbank/'wrangler d1 execute';"
echo " ein UI-Dialog dafuer ist fuer eine kommende Version geplant)."
echo "============================================================"
