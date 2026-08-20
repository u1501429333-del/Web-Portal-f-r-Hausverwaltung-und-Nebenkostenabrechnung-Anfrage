#!/bin/bash
# ============================================================
# Install-Skript: UHV-Web-Portal Blau v3 – Erstinstallation
# Für Debian/Armbian-basierte Systeme (z.B. TV-Box mit Amlogic S912)
#
# Nutzung:
#   bash scripts/install.sh
# ============================================================
set -e

REPO_URL="https://github.com/u1501429333-del/Web-Portal-f-r-Hausverwaltung-und-Nebenkostenabrechnung-Anfrage.git"
INSTALL_DIR="${1:-/opt/Uhv-Portal-v3-Blau}"

echo "============================================================"
echo " UHV-Web-Portal Blau v3 – Installation"
echo "============================================================"
echo ""

# ---------- 1. Systemprüfung ----------------------------------
echo "==> Pruefe Systemvoraussetzungen ..."
ARCH=$(uname -m)
echo "    Architektur: $ARCH"
case "$ARCH" in
  aarch64|arm64) echo "    OK: ARM64 wird unterstuetzt." ;;
  x86_64) echo "    OK: x86_64 wird unterstuetzt." ;;
  *) echo "    WARNUNG: Unbekannte Architektur ($ARCH)." ;;
esac

TOTAL_RAM_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}')
echo "    Gesamt-RAM: ${TOTAL_RAM_MB:-unbekannt} MB"
if [ -n "$TOTAL_RAM_MB" ] && [ "$TOTAL_RAM_MB" -lt 900 ]; then
  echo "    WARNUNG: Weniger als 1 GB RAM."
fi

FREE_DISK_MB=$(df -Pm / 2>/dev/null | awk 'NR==2{print $4}')
echo "    Freier Speicherplatz auf /: ${FREE_DISK_MB:-unbekannt} MB"
if [ -n "$FREE_DISK_MB" ] && [ "$FREE_DISK_MB" -lt 2000 ]; then
  echo "    WARNUNG: Weniger als 2 GB frei."
fi

CPU_CORES=$(nproc 2>/dev/null || echo "")
echo "    CPU-Kerne: ${CPU_CORES:-unbekannt}"
echo ""

# ---------- 2. Docker prüfen ---------------------------------
if command -v docker >/dev/null 2>&1; then
  echo "==> Docker ist bereits installiert: $(docker --version)"
else
  echo "==> Docker wird installiert ..."
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sudo sh /tmp/get-docker.sh
  sudo usermod -aG docker "$USER" || true
fi

if docker compose version >/dev/null 2>&1; then
  echo "==> Docker Compose Plugin ist vorhanden: $(docker compose version)"
else
  echo "==> FEHLER: 'docker compose' Plugin nicht gefunden."
  exit 1
fi
echo ""

# ---------- 3. Repository klonen -----------------------------
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "==> Projektordner existiert bereits – ueberspringe Klonen."
else
  echo "==> Klone Repository nach $INSTALL_DIR ..."
  sudo mkdir -p "$(dirname "$INSTALL_DIR")"
  sudo chown "$USER":"$USER" "$(dirname "$INSTALL_DIR")" 2>/dev/null || true
  git clone "$REPO_URL" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
chmod +x scripts/*.sh docker/entrypoint.sh 2>/dev/null || true

# ---------- 4. docker-compose.yml korrekt erstellen ----------
echo "==> Erstelle docker-compose.yml mit korrekten Werten ..."
cat > docker-compose.yml << 'EOF'
# ============================================================
# UHV-Web-Portal-blau (v3) – docker-compose für Self-Hosting
# Getestet für: Amlogic S912 TV-Box, Armbian Linux 6.1.149-ophub,
#               Debian bookworm, ARM64 (arm64/aarch64)
#
# Start:   docker compose up -d --build
# Logs:    docker compose logs -f
# Stop:    docker compose down
# Update:  siehe scripts/update.sh
# ============================================================
services:
  hausverwaltung-blau-p3000:
    build:
      context: .
      dockerfile: Dockerfile
    image: uhv-web-portal:latest
    container_name: uhv-web-portal-blau-p3000
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - uhv-web-blau-p3000_data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
    networks:
      - uhv-web-blau-p3000_net

networks:
  uhv-web-blau-p3000_net:
    driver: bridge

volumes:
  uhv-web-blau-p3000_data:
    driver: local
EOF

echo ""

# ---------- 5. Alte Container entfernen (falls vorhanden) ----
echo "==> Entferne alte Container (falls vorhanden) ..."
docker stop uhv-web-portal-blau-p3000 uhv-web-portal 2>/dev/null
docker rm uhv-web-portal-blau-p3000 uhv-web-portal 2>/dev/null

# ---------- 6. Docker-Image bauen + starten -----------------
echo "==> Baue Docker-Image (kann einige Minuten dauern) ..."
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
