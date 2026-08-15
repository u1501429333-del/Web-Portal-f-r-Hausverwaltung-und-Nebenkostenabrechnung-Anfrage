# ============================================================
# UHV-Web-Portal (v3) – Docker-Image für Selbst-Hosting
# (z.B. auf TV-Box / Amlogic S912 mit Armbian, ARM64)
#
# Wichtiger Hinweis zur Architektur:
# Diese App ist für Cloudflare Pages/Workers entwickelt (Hono + D1).
# "npm run build" (vite build) erzeugt weiterhin den normalen
# Cloudflare-Worker (dist/_worker.js) – daran ändert sich nichts.
#
# ZUR LAUFZEIT wird dieser Worker hier aber NICHT über "wrangler pages dev"
# (workerd) ausgeführt, sondern über einen schlanken, selbst geschriebenen
# node:http-Server (server/node-server.mjs), der den Worker per fetch()
# aufruft und env.DB durch eine node:sqlite-basierte D1-kompatible Schicht
# ersetzt (server/d1-shim.mjs). Funktional gleichwertig (identischer
# Anwendungscode, identische Berechnungen/Dokumente), aber kein "echtes"
# Cloudflare-Deployment.
#
# WARUM nicht "wrangler pages dev"?
# Cloudflares workerd-Runtime hat einen seit 2023 offenen, ungelösten
# TCMalloc-Speicherzuweisungsfehler, der auf JEDEM aarch64-Gerät mit
# 39-Bit-Kernel-Adressraum sofort abstürzt ("MmapAligned() failed" /
# "write EPIPE") – das betrifft praktisch alle Armbian-Images für
# TV-Boxen/SBCs (Amlogic, Rockchip, Raspberry Pi OS u.a.), unabhängig
# von der Node.js-Version. Siehe:
#   https://github.com/cloudflare/workerd/issues/5013
#   https://github.com/cloudflare/workerd/issues/5020
#   https://github.com/cloudflare/workers-sdk/issues/10878
# Der native Node-Server umgeht workerd komplett und läuft daher auch
# auf diesen Geräten stabil. "wrangler"/"vite" bleiben nur als
# Build-Zeit-Werkzeuge (devDependencies) im Einsatz.
# ============================================================
FROM node:22-bookworm-slim

ENV CI=true \
    PORT=3000

WORKDIR /app

# 1) Abhängigkeiten getrennt cachen (schnellere Rebuilds bei Code-Änderungen)
#    --include=dev erzwingt die devDependencies-Installation (vite, wrangler-
#    Typen etc. werden nur für den Build-Schritt gebraucht).
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --include=dev

# 2) Restlichen Quellcode kopieren und Produktions-Build erstellen
COPY . .
RUN npm run build

# 3) Entrypoint ausführbar machen
RUN chmod +x docker/entrypoint.sh

ENV NODE_ENV=production

EXPOSE 3000

# /app/data enthält die SQLite-Datenbank (node:sqlite, D1-kompatibel via
# server/d1-shim.mjs) – inkl. Logo/Branding, alle Objekte/Wohnungen/
# Mieter/Kosten/Dokumente – MUSS als Volume persistiert werden!
VOLUME ["/app/data"]

ENTRYPOINT ["docker/entrypoint.sh"]
