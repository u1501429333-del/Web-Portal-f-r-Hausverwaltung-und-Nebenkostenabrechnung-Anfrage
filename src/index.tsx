import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import type { AppContext } from './lib/types'
import { authRoutes, sessionMiddleware } from './routes/auth'
import { objekteRoutes } from './routes/objekte'
import { wohnungenRoutes } from './routes/wohnungen'
import { mieterRoutes } from './routes/mieter'
import { zaehlerRoutes } from './routes/zaehler'
import { kostenRoutes } from './routes/kosten'
import { abrechnungRoutes } from './routes/abrechnung'
import { dokumenteRoutes } from './routes/dokumente'
import { einstellungenRoutes } from './routes/einstellungen'
import { demoRoutes } from './routes/demo'

const app = new Hono<AppContext>()

app.use('*', sessionMiddleware)

app.use('/static/*', serveStatic({ root: './public' }))

app.route('/api/auth', authRoutes)
app.route('/api/objekte', objekteRoutes)
app.route('/api/wohnungen', wohnungenRoutes)
app.route('/api/mieter', mieterRoutes)
app.route('/api/zaehler', zaehlerRoutes)
app.route('/api/kosten', kostenRoutes)
app.route('/api/abrechnung', abrechnungRoutes)
app.route('/api/dokumente', dokumenteRoutes)
app.route('/api/einstellungen', einstellungenRoutes)
app.route('/api/demo', demoRoutes)

app.get('*', (c) => {
  return c.html(indexHtml)
})

const indexHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hausverwaltung &amp; Nebenkostenabrechnung</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏠</text></svg>">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body class="bg-slate-100 text-slate-800">
  <div id="app"></div>
  <script src="/static/api.js"></script>
  <script src="/static/state.js"></script>
  <script src="/static/layout.js"></script>
  <script src="/static/app.js"></script>
  <script src="/static/admin_dashboard.js"></script>
  <script src="/static/admin_objekte.js"></script>
  <script src="/static/admin_wohnung_detail.js"></script>
  <script src="/static/admin_zaehler.js"></script>
  <script src="/static/admin_kosten.js"></script>
  <script src="/static/admin_abrechnung.js"></script>
  <script src="/static/admin_dokumente.js"></script>
  <script src="/static/admin_einstellungen.js"></script>
  <script src="/static/mieter_portal.js"></script>
</body>
</html>`

export default app
