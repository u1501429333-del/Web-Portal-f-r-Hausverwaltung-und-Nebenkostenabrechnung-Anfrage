#!/bin/sh
# ============================================================
# Entrypoint: startet den nativen Node.js-Server (server/node-server.mjs).
#
# Frueher wurde hier "wrangler pages dev" (workerd) gestartet. Das wurde
# entfernt, weil workerd auf ARM64-Geraeten mit 39-Bit-Kernel-Adressraum
# (Standard bei Armbian/TV-Boxen, Raspberry Pi OS u.a.) mit einem seit
# 2023 offenen, ungeloesten TCMalloc-Bug abstuerzt - unabhaengig von der
# Node.js-Version (siehe Kommentar im Dockerfile fuer Details/Links).
#
# server/node-server.mjs wendet beim Start automatisch alle noch offenen
# Migrationen aus migrations/*.sql auf die node:sqlite-Datenbank unter
# /app/data an (idempotent, per _migrations-Tabelle nachverfolgt) und
# startet danach den HTTP-Server. So funktionieren "docker compose up"
# beim allerersten Start (Datenbank leer, alle Migrationen + Seed werden
# angewendet) und spaetere Updates (nur neue Migrationsdateien werden
# ausgefuehrt, bestehende Daten bleiben erhalten) ohne manuelle Schritte.
# ============================================================
set -e

echo "[entrypoint] Starte UHV-Web-Portal v3 (nativer Node-Server) auf Port ${PORT:-3000} ..."
exec node --experimental-sqlite server/node-server.mjs
