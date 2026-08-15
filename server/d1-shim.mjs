// ============================================================
// D1-kompatible Laufzeit-Schicht auf Basis von node:sqlite (Node >=22)
//
// Hintergrund: Cloudflares "wrangler pages dev" (workerd) hat einen seit
// 2023 offenen, ungeloesten Bug in der TCMalloc-Speicherverwaltung, der auf
// praktisch JEDEM aarch64-Geraet mit 39-Bit-Kernel-Adressraum sofort mit
// "MmapAligned() failed" / "write EPIPE" abstuerzt - das betrifft u.a.
// Raspberry Pi OS, die meisten Armbian-Images (TV-Boxen wie Amlogic S912)
// und sogar manche ARM64-Chromebooks. Siehe:
//   https://github.com/cloudflare/workerd/issues/5013
//   https://github.com/cloudflare/workerd/issues/5020
//   https://github.com/cloudflare/workers-sdk/issues/10878
// Ein aelterer Node.js (v20 statt v22) behebt das NICHT - der Bug liegt in
// workerd selbst, nicht in wrangler's Node-Versions-Check.
//
// Loesung fuer Self-Hosting: wrangler/workerd wird zur LAUFZEIT komplett
// vermieden. "npm run build" (vite build) laeuft weiterhin unveraendert und
// erzeugt den Standard-Cloudflare-Worker (dist/_worker.js, ein reines
// ES-Modul mit `export default { fetch(request, env, ctx) }`, das nur
// Web-APIs wie Request/Response nutzt). Dieses Modul wird stattdessen von
// einem einfachen node:http-Server geladen (server/node-server.mjs), und
// env.DB wird durch DIESE Klasse ersetzt, die dieselbe Methodenkette wie
// Cloudflare D1 nachbildet (prepare/bind/first/all/run/batch), aber intern
// node:sqlite (in Node 22 fest eingebaut, kein natives Kompilieren noetig -
// wichtig fuer ARM64/TV-Boxen ohne Build-Toolchain) verwendet.
// ============================================================

import { DatabaseSync } from 'node:sqlite'

/**
 * Bildet das Ergebnis eines D1 .run()-Aufrufs nach:
 * { success: true, meta: { last_row_id, changes, duration } }
 */
class D1Result {
  constructor({ results = [], lastInsertRowid = 0, changes = 0 } = {}) {
    this.results = results
    this.success = true
    this.meta = {
      last_row_id: Number(lastInsertRowid) || 0,
      changes: Number(changes) || 0,
      duration: 0,
      rows_read: results.length,
      rows_written: changes || 0,
    }
  }
}

class D1PreparedStatement {
  constructor(db, sql) {
    this.db = db
    this.sql = sql
    this.params = []
  }

  bind(...params) {
    const stmt = new D1PreparedStatement(this.db, this.sql)
    stmt.params = params
    return stmt
  }

  #stmt() {
    return this.db.prepare(this.sql)
  }

  async first(column) {
    const row = this.#stmt().get(...this.params)
    if (row === undefined) return null
    if (column) return row[column] ?? null
    return row
  }

  async all() {
    const rows = this.#stmt().all(...this.params)
    return new D1Result({ results: rows })
  }

  async raw() {
    const rows = this.#stmt().all(...this.params)
    if (rows.length === 0) return []
    const keys = Object.keys(rows[0])
    return rows.map((r) => keys.map((k) => r[k]))
  }

  async run() {
    const trimmed = this.sql.trim().toUpperCase()
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
      const rows = this.#stmt().all(...this.params)
      return new D1Result({ results: rows })
    }
    const info = this.#stmt().run(...this.params)
    return new D1Result({
      lastInsertRowid: info.lastInsertRowid,
      changes: info.changes,
    })
  }
}

export class D1Shim {
  constructor(filename) {
    this.db = new DatabaseSync(filename)
    // Fremdschluessel-Constraints aktivieren (D1/SQLite-Standardverhalten
    // in den Migrationen dieses Projekts wird davon ausgegangen)
    this.db.exec('PRAGMA foreign_keys = ON;')
    this.db.exec('PRAGMA journal_mode = WAL;')
  }

  prepare(sql) {
    return new D1PreparedStatement(this.db, sql)
  }

  async batch(statements) {
    const results = []
    for (const stmt of statements) {
      results.push(await stmt.run())
    }
    return results
  }

  async exec(sql) {
    this.db.exec(sql)
    return { count: 0, duration: 0 }
  }

  async dump() {
    throw new Error('dump() wird im Self-Hosting-Modus nicht unterstuetzt')
  }

  close() {
    this.db.close()
  }
}
