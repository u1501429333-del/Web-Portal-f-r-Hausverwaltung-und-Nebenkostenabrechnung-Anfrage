#!/bin/bash
set -e

echo "============================================================"
echo " UHV-Web-Portal Blau v3 – Installation"
echo "============================================================"
echo ""

# 1. Systemprüfung
echo "==> Pruefe Systemvoraussetzungen ..."
ARCH=$(uname -m)
echo "    Architektur: $ARCH"
case "$ARCH" in
  aarch64|arm64) echo "    OK: ARM64 wird unterstuetzt." ;;
  x86_64) echo "    OK: x86_64 wird unterstuetzt." ;;
  *) echo "    WARNUNG: Unbekannte Architektur ($ARCH)." ;;
esac

RAM=$(free -m | awk '/^Mem:/{print $2}')
echo "    RAM: ${RAM} MB"
if [ "$RAM" -lt 900 ]; then
  echo "    WARNUNG: Weniger als 1 GB RAM."
fi

DISK=$(df -Pm / | awk 'NR==2{print $4}')
echo "    Freier Speicherplatz: ${DISK} MB"
if [ "$DISK" -lt 2000 ]; then
  echo "    WARNUNG: Weniger als 2 GB frei."
fi

echo ""

# 2. Docker prüfen
if ! command -v docker >/dev/null 2>&1; then
  echo "==> Docker wird installiert ..."
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sh /tmp/get-docker.sh
fi
docker compose version || { echo "FEHLER: docker compose nicht gefunden."; exit 1; }

# 3. Projektverzeichnis erstellen
mkdir -p /opt/Uhv-Portal-v3-Blau
cd /opt/Uhv-Portal-v3-Blau

# 4. docker-compose.yml erstellen
echo "==> Erstelle docker-compose.yml ..."
cat > docker-compose.yml << 'EOF'
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

# 5. Alte Container entfernen
echo "==> Entferne alte Container (falls vorhanden) ..."
docker stop uhv-web-portal-blau-p3000 uhv-web-portal 2>/dev/null || true
docker rm uhv-web-portal-blau-p3000 uhv-web-portal 2>/dev/null || true

# 6. Image bauen und Container starten
echo "==> Baue Docker-Image (kann einige Minuten dauern) ..."
docker compose build
echo "==> Starte Container ..."
docker compose up -d

sleep 10
docker compose ps

echo ""
echo "============================================================"
echo " Installation abgeschlossen!"
echo " Aufrufbar unter: http://$(hostname -I | awk '{print $1}'):3000"
echo " Admin: admin@hausverwaltung.de / admin123"
echo "============================================================"
