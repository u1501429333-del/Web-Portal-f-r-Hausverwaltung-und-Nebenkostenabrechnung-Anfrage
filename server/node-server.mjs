#!/usr/bin/env node
// ============================================================
// Nativer Node.js-Server fuer Self-Hosting (Docker / TV-Box / SBC).
//
// Ersetzt "wrangler pages dev" (workerd) zur Laufzeit vollstaendig, weil
// workerd auf ARM64-Geraeten mit 39-Bit-Kernel-Adressraum (Standard bei
// Armbian, Raspberry Pi OS u.a.) zuverlaessig mit einem TCMalloc-Fehler
// abstuerzt (siehe Kommentar in server/d1-shim.mjs fuer Details/Links).
//
// Laedt den von "vite build" erzeugten Standard-Cloudflare-Worker
// (dist/_worker.js, ein reines ES-Modul mit `export default { fetch }`)
// und bedient ihn ueber einen normalen node:http-Server. Statische
// Dateien aus public/static werden direkt von Node ausgeliefert (die
// Worker-Route /static/* wird ohnehin von Cloudflare Pages nie an den
// Worker weitergereicht, siehe dist/_routes.json "exclude").
//
// env.DB wird durch server/d1-shim.mjs (node:sqlite) ersetzt - identische
// Methodenkette (prepare/bind/first/all/run/batch) wie Cloudflare D1.
// ============================================================

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { D1Shim } from './d1-shim.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || '0.0.0.0'
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data')
const DB_FILE = path.join(DATA_DIR, 'hausverwaltung.sqlite3')
const MIGRATIONS_DIR = path.join(ROOT, 'migrations')
const STATIC_DIR = path.join(ROOT, 'public', 'static')
const WORKER_PATH = path.join(ROOT, 'dist', '_worker.js')

function log(...args) {
  console.log('[server]', ...args)
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function applyMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `)
  const applied = new Set(
    db.prepare('SELECT filename FROM _migrations').all().map((r) => r.filename)
  )
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  let appliedCount = 0
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    log(`Wende Migration an: ${file}`)
    try {
      db.exec(sql)
      db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file)
      appliedCount++
    } catch (err) {
      console.error(`[server] FEHLER in Migration ${file}:`, err.message)
      throw err
    }
  }
  if (appliedCount === 0) {
    log('Alle Migrationen bereits angewendet, keine Aenderung noetig.')
  } else {
    log(`${appliedCount} neue Migration(en) angewendet.`)
  }
}

const MIME_TYPES = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function serveStaticFile(req, res, urlPath) {
  // urlPath beginnt mit "/static/"
  const relative = urlPath.slice('/static/'.length)
  // Verzeichnis-Traversal verhindern
  const safePath = path.normalize(relative).replace(/^(\.\.[/\\])+/, '')
  const filePath = path.join(STATIC_DIR, safePath)
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403)
    res.end('Forbidden')
    return true
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false
  }
  const ext = path.extname(filePath).toLowerCase()
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
  })
  fs.createReadStream(filePath).pipe(res)
  return true
}

async function nodeRequestToWebRequest(req) {
  const url = `http://${req.headers.host || `${HOST}:${PORT}`}${req.url}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v)
    } else {
      headers.set(key, value)
    }
  }
  let body
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    body = chunks.length ? Buffer.concat(chunks) : undefined
  }
  return new Request(url, { method: req.method, headers, body })
}

async function webResponseToNodeResponse(webRes, res) {
  const headers = {}
  for (const [key, value] of webRes.headers.entries()) {
    // set-cookie kann mehrfach vorkommen
    if (key.toLowerCase() === 'set-cookie') continue
    headers[key] = value
  }
  const setCookies =
    typeof webRes.headers.getSetCookie === 'function' ? webRes.headers.getSetCookie() : []
  // WICHTIG: setHeader() muss VOR writeHead() aufgerufen werden - danach
  // sind die Header bereits gesendet und jede weitere setHeader()-Aenderung
  // wirft ERR_HTTP_HEADERS_SENT (betraf z.B. /api/auth/login, das per
  // Set-Cookie den Session-Cookie setzt).
  if (setCookies.length) {
    res.setHeader('Set-Cookie', setCookies)
  }
  res.writeHead(webRes.status, headers)
  if (webRes.body) {
    const reader = webRes.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  }
  res.end()
}

async function main() {
  ensureDataDir()

  if (!fs.existsSync(WORKER_PATH)) {
    console.error(`[server] FEHLER: ${WORKER_PATH} nicht gefunden. Bitte zuerst "npm run build" ausfuehren.`)
    process.exit(1)
  }

  log(`Oeffne Datenbank: ${DB_FILE}`)
  const db = new D1Shim(DB_FILE)
  applyMigrations(db.db)

  log('Lade Worker-Modul dist/_worker.js ...')
  const workerModule = await import(`${WORKER_PATH}?t=${Date.now()}`)
  const worker = workerModule.default
  if (!worker || typeof worker.fetch !== 'function') {
    console.error('[server] FEHLER: dist/_worker.js exportiert kein gueltiges { fetch } Objekt.')
    process.exit(1)
  }

  const env = {
    DB: db,
    SESSION_SECRET: process.env.SESSION_SECRET || 'change-me-in-production-please',
  }

  const server = http.createServer(async (req, res) => {
    try {
      if (req.url && req.url.startsWith('/static/')) {
        if (serveStaticFile(req, res, req.url.split('?')[0])) return
      }
      const webReq = await nodeRequestToWebRequest(req)
      const ctx = {
        waitUntil: () => {},
        passThroughOnException: () => {},
      }
      const webRes = await worker.fetch(webReq, env, ctx)
      await webResponseToNodeResponse(webRes, res)
    } catch (err) {
      console.error('[server] Unbehandelter Fehler:', err)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
      }
      res.end(JSON.stringify({ error: 'Interner Serverfehler' }))
    }
  })

  server.listen(PORT, HOST, () => {
    log(`UHV-Web-Portal v3 laeuft auf http://${HOST}:${PORT}`)
  })

  const shutdown = () => {
    log('Beende Server ...')
    server.close(() => {
      db.close()
      process.exit(0)
    })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[server] Startfehler:', err)
  process.exit(1)
})
