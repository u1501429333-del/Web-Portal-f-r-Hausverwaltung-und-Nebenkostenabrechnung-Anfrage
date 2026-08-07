import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'

export const unterlagenRoutes = new Hono<AppContext>()

const MAX_SIZE_BYTES = 5_000_000 // ca. 5 MB pro Datei (Base64 in D1 - bewusst begrenzt)

// -------- Admin: Alle Unterlagen eines Objekts, optional nach Ordner gefiltert --------
unterlagenRoutes.get('/objekt/:objektId', requireAdmin, async (c) => {
  const objektId = c.req.param('objektId')
  const ordner = c.req.query('ordner')
  let query = `SELECT id, objekt_id, wohnung_id, mieter_id, ordner, dateiname, content_type, groesse_bytes, hochgeladen_von, beschreibung, erstellt_am
               FROM unterlagen WHERE objekt_id = ?`
  const binds: any[] = [objektId]
  if (ordner) {
    query += ' AND ordner = ?'
    binds.push(ordner)
  }
  query += ' ORDER BY erstellt_am DESC'
  const rows = await c.env.DB.prepare(query).bind(...binds).all()
  return c.json(rows.results)
})

// -------- Mieter: eigene Unterlagen (nach Wohnung) --------
unterlagenRoutes.get('/wohnung/:wohnungId', async (c) => {
  const session = c.get('session')
  if (!session) return c.json({ error: 'Nicht angemeldet' }, 401)
  const wohnungId = Number(c.req.param('wohnungId'))

  if (session.role === 'mieter') {
    const mieterRow = await c.env.DB.prepare('SELECT wohnung_id FROM mieter WHERE id = ?').bind(session.mieterId).first<any>()
    if (!mieterRow || mieterRow.wohnung_id !== wohnungId) return c.json({ error: 'Keine Berechtigung' }, 403)
  }

  const rows = await c.env.DB.prepare(
    `SELECT id, objekt_id, wohnung_id, mieter_id, ordner, dateiname, content_type, groesse_bytes, hochgeladen_von, beschreibung, erstellt_am
     FROM unterlagen WHERE wohnung_id = ? ORDER BY erstellt_am DESC`
  )
    .bind(wohnungId)
    .all()
  return c.json(rows.results)
})

// -------- Datei-Inhalt abrufen (Data-URL) --------
unterlagenRoutes.get('/:id/data', async (c) => {
  const session = c.get('session')
  if (!session) return c.json({ error: 'Nicht angemeldet' }, 401)
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT * FROM unterlagen WHERE id = ?').bind(id).first<any>()
  if (!row) return c.json({ error: 'Nicht gefunden' }, 404)

  if (session.role === 'mieter') {
    const mieterRow = await c.env.DB.prepare('SELECT wohnung_id FROM mieter WHERE id = ?').bind(session.mieterId).first<any>()
    if (!mieterRow || mieterRow.wohnung_id !== row.wohnung_id) return c.json({ error: 'Keine Berechtigung' }, 403)
  }

  return c.json({ dateiname: row.dateiname, content_type: row.content_type, data_url: row.data_url })
})

// -------- Upload (Admin ODER Mieter für eigene Wohnung) --------
// Body: { wohnung_id, ordner, dateiname, content_type, data_url, beschreibung }
unterlagenRoutes.post('/', async (c) => {
  const session = c.get('session')
  if (!session) return c.json({ error: 'Nicht angemeldet' }, 401)
  const b = await c.req.json<any>()

  if (!b.data_url || typeof b.data_url !== 'string') {
    return c.json({ error: 'Keine Dateidaten übermittelt' }, 400)
  }
  const approxSize = Math.floor((b.data_url.length * 3) / 4)
  if (approxSize > MAX_SIZE_BYTES) {
    return c.json({ error: 'Datei ist zu groß (max. ca. 5 MB je Datei).' }, 400)
  }

  let wohnungId: number | null = null
  let mieterId: number | null = null
  let objektId: number | null = null
  let hochgeladenVon = session.role

  if (session.role === 'mieter') {
    const mieterRow = await c.env.DB.prepare('SELECT id, wohnung_id FROM mieter WHERE id = ?').bind(session.mieterId).first<any>()
    if (!mieterRow) return c.json({ error: 'Mieter nicht gefunden' }, 404)
    wohnungId = mieterRow.wohnung_id
    mieterId = mieterRow.id
    const wohnung = await c.env.DB.prepare('SELECT objekt_id FROM wohnungen WHERE id = ?').bind(wohnungId).first<any>()
    objektId = wohnung?.objekt_id ?? null
  } else {
    wohnungId = b.wohnung_id || null
    mieterId = b.mieter_id || null
    objektId = b.objekt_id || null
    if (!objektId && wohnungId) {
      const wohnung = await c.env.DB.prepare('SELECT objekt_id FROM wohnungen WHERE id = ?').bind(wohnungId).first<any>()
      objektId = wohnung?.objekt_id ?? null
    }
  }

  // Mieter dürfen nur in "eigene Unterlagen"-Ordner hochladen (kein Zugriff auf Steuerberater-Bereich)
  let ordner = String(b.ordner || 'allgemein')
  if (session.role === 'mieter' && ordner === 'steuerberater') ordner = 'allgemein'

  const res = await c.env.DB.prepare(
    `INSERT INTO unterlagen (objekt_id, wohnung_id, mieter_id, ordner, dateiname, content_type, data_url, groesse_bytes, hochgeladen_von, beschreibung)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  )
    .bind(objektId, wohnungId, mieterId, ordner, b.dateiname || 'Datei', b.content_type || 'application/octet-stream', b.data_url, approxSize, hochgeladenVon, b.beschreibung || '')
    .run()

  return c.json({ id: res.meta.last_row_id })
})

unterlagenRoutes.delete('/:id', async (c) => {
  const session = c.get('session')
  if (!session) return c.json({ error: 'Nicht angemeldet' }, 401)
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT * FROM unterlagen WHERE id = ?').bind(id).first<any>()
  if (!row) return c.json({ error: 'Nicht gefunden' }, 404)

  if (session.role === 'mieter') {
    const mieterRow = await c.env.DB.prepare('SELECT wohnung_id FROM mieter WHERE id = ?').bind(session.mieterId).first<any>()
    if (!mieterRow || mieterRow.wohnung_id !== row.wohnung_id || row.hochgeladen_von !== 'mieter') {
      return c.json({ error: 'Keine Berechtigung' }, 403)
    }
  }

  await c.env.DB.prepare('DELETE FROM unterlagen WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})
