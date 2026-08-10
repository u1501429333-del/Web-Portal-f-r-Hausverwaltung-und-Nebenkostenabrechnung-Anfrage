#!/bin/bash
# ============================================================
# Backup-Skript: Sichert die komplette Datenbank
# (D1-SQLite-Datei mit allen Objekten/Wohnungen/Mietern/
#  Zählerständen/Kosten/Dokumenten/Logo) als tar.gz-Archiv.
#
# Nutzung:
#   bash scripts/backup.sh
#
# Die Backups werden im Ordner "backups/" mit Zeitstempel
# abgelegt, z.B. backups/uhv-web-portal_backup_2026-08-05_14-30.tar.gz
# ============================================================
set -e

cd "$(dirname "$0")/.."

TS=$(date +%Y-%m-%d_%H-%M)
OUTDIR="backups"
OUTFILE="$OUTDIR/uhv-web-portal_backup_${TS}.tar.gz"
mkdir -p "$OUTDIR"

echo "==> Sichere Docker-Volume 'hausverwaltung_data' ..."
# Volume-Inhalt über einen temporären Helfer-Container in ein tar.gz packen,
# damit auch bei laufendem Hauptcontainer ein konsistentes Backup entsteht.
docker run --rm \
  -v hausverwaltung_data:/data:ro \
  -v "$(pwd)/${OUTDIR}":/backup \
  alpine \
  sh -c "tar -czf /backup/$(basename "$OUTFILE") -C /data ."

echo "==> Backup erstellt: ${OUTFILE}"
echo "==> Groesse: $(du -h "$OUTFILE" | cut -f1)"
echo ""
echo "Wiederherstellen (Beispiel):"
echo "  docker compose down"
echo "  docker run --rm -v hausverwaltung_data:/data -v \$(pwd)/${OUTDIR}:/backup alpine sh -c \"rm -rf /data/* && tar -xzf /backup/$(basename "$OUTFILE") -C /data\""
echo "  docker compose up -d"
