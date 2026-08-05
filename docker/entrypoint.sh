#!/bin/sh
# ============================================================
# Entrypoint: wendet beim Start automatisch alle noch offenen
# D1-Migrationen an (idempotent) und startet dann den Server.
# So funktionieren "docker compose up" beim allerersten Start
# (Datenbank leer, alle Migrationen + Seed werden angewendet)
# und spätere Updates (nur neue Migrationsdateien werden
# ausgeführt, bestehende Daten bleiben erhalten) ohne manuelle
# Schritte.
# ============================================================
set -e

echo "[entrypoint] Wende D1-Migrationen an (lokal, persistiert unter /app/.wrangler/state) ..."
npx wrangler d1 migrations apply webapp-production --local || {
  echo "[entrypoint] WARNUNG: Migration fehlgeschlagen oder nichts zu tun – fahre trotzdem fort."
}

echo "[entrypoint] Starte Hausverwaltung Portal auf Port ${PORT:-3000} ..."
exec npx wrangler pages dev dist --d1=webapp-production --local --ip 0.0.0.0 --port "${PORT:-3000}"
