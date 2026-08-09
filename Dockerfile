# ============================================================
# Hausverwaltung Portal – Docker-Image für Selbst-Hosting
# (z.B. auf TV-Box / Amlogic S912 mit Armbian, ARM64)
#
# Wichtiger Hinweis zur Architektur:
# Diese App ist für Cloudflare Pages/Workers entwickelt (Hono + D1).
# Für Self-Hosting läuft sie hier NICHT über echtes Cloudflare, sondern
# über "wrangler pages dev" (Miniflare) als lokaler Node.js-Prozess –
# inkl. lokal emulierter D1-SQLite-Datenbank. Das ist funktional
# gleichwertig (identischer Code, identische Berechnungen/Dokumente),
# aber kein "echtes" Cloudflare-Deployment.
# ============================================================
FROM node:20-bookworm-slim

# WICHTIG: NODE_ENV=production darf hier NOCH NICHT gesetzt werden!
# npm respektiert NODE_ENV beim Installieren: ist es bereits "production",
# überspringt "npm ci" alle devDependencies (vite, wrangler, @hono/vite-build) –
# der Build-Schritt schlägt dann mit "sh: vite: not found" fehl. Außerdem wird
# "wrangler" (ebenfalls eine devDependency) zur LAUFZEIT im Entrypoint benötigt
# (wrangler pages dev), darf also auch danach nicht entfernt werden.
ENV CI=true \
    WRANGLER_SEND_METRICS=false \
    PORT=3000

WORKDIR /app

# 1) Abhängigkeiten getrennt cachen (schnellere Rebuilds bei Code-Änderungen)
#    --include=dev erzwingt die devDependencies-Installation unabhängig von NODE_ENV.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --include=dev

# 2) Restlichen Quellcode kopieren und Produktions-Build erstellen
COPY . .
RUN npm run build

# 3) Entrypoint ausführbar machen
RUN chmod +x docker/entrypoint.sh

# Erst NACH dem Build auf "production" setzen (nur für den Laufzeit-Prozess selbst
# relevant, z.B. Fehlermeldungen/Performance von Hono – node_modules bleiben vollständig).
ENV NODE_ENV=production

EXPOSE 3000

# .wrangler/state enthält die lokale D1-SQLite-Datenbank (inkl. Logo/Branding,
# alle Objekte/Wohnungen/Mieter/Kosten/Dokumente) – MUSS als Volume persistiert werden!
VOLUME ["/app/.wrangler/state"]

ENTRYPOINT ["docker/entrypoint.sh"]
