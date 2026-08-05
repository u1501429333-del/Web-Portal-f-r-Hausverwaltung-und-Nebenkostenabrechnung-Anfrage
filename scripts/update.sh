#!/bin/bash
# ============================================================
# Update-Skript: Hausverwaltung Portal (Docker / TV-Box)
#
# Aktualisiert die App auf die neueste Version aus GitHub und
# startet den Container neu. Die Datenbank (Docker-Volume
# "hausverwaltung_data") bleibt dabei unangetastet erhalten.
#
# Nutzung (im Projektordner, z.B. /opt/hausverwaltung):
#   bash scripts/update.sh
#
# Optional: vorher automatisch ein Backup erstellen
#   bash scripts/update.sh --backup
# ============================================================
set -e

cd "$(dirname "$0")/.."

if [ "$1" == "--backup" ]; then
  echo "==> Erstelle Backup vor dem Update ..."
  bash scripts/backup.sh
fi

echo "==> Hole neueste Version von GitHub ..."
if [ -d .git ]; then
  git fetch origin
  git reset --hard origin/main
else
  echo "FEHLER: Kein Git-Repository gefunden. Bitte zuerst 'git clone' verwenden."
  exit 1
fi

echo "==> Baue Docker-Image neu (kann einige Minuten dauern) ..."
docker compose build --no-cache

echo "==> Starte Container mit neuer Version neu ..."
docker compose up -d

echo "==> Warte auf Start des Dienstes ..."
sleep 5
docker compose ps

echo ""
echo "==> Fertig! Migrations werden beim Container-Start automatisch angewendet."
echo "==> Logs pruefen mit: docker compose logs -f --tail=50"
