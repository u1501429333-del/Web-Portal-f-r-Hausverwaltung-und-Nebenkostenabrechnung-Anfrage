import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'

export const schaedenRoutes = new Hono<AppContext>()

// -------- Admin: Alle Schadensmeldungen eines Objekts --------
schaedenRoutes.get('/objekt/:objektId', requireAdmin, async (c) => {
  const objektId = c.req.param('objektId')
  const status = c.req.query('status') // optionaler Filter
  let query = `SELECT s.*, w.bezeichnung as wohnung_bezeichnung, m.vorname, m.nachname
               FROM schadensmeldungen s
               LEFT JOIN wohnungen w ON w.id = s.wohnung_id
               LEFT JOIN mieter m ON m.id = s.mieter_id
               WHERE s.objekt_id = ?`
  const binds: any[] = [objektId]
  if (status) {
    query += ' AND s.status = ?'
    binds.push(status)
  }
  query += ' ORDER BY CASE s.prioritaet WHEN "hoch" THEN 0 WHEN "mittel" THEN 1 ELSE 2 END, s.erstellt_am DESC'
  const rows = await c.env.DB.prepare(query).bind(...binds).all()
  return c.json(rows.results)
})

// -------- Mieter: eigene Schadensmeldungen (nach eigener Wohnung) --------
schaedenRoutes.get('/wohnung/:wohnungId', async (c) => {
  const session = c.get('session')
  if (!session) return c.json({ error: 'Nicht angemeldet' }, 401)
  const wohnungId = Number(c.req.param('wohnungId'))

  if (session.role === 'mieter') {
    const mieterRow = await c.env.DB.prepare('SELECT wohnung_id FROM mieter WHERE id = ?').bind(session.mieterId).first<any>()
    if (!mieterRow || mieterRow.wohnung_id !== wohnungId) return c.json({ error: 'Keine Berechtigung' }, 403)
  }

  const rows = await c.env.DB.prepare('SELECT * FROM schadensmeldungen WHERE wohnung_id = ? ORDER BY erstellt_am DESC')
    .bind(wohnungId)
    .all()
  return c.json(rows.results)
})

// -------- Neue Schadensmeldung erstellen (Admin ODER Mieter für eigene Wohnung) --------
schaedenRoutes.post('/', async (c) => {
  const session = c.get('session')
  if (!session) return c.json({ error: 'Nicht angemeldet' }, 401)
  const b = await c.req.json<any>()

  let wohnungId = Number(b.wohnung_id)
  let mieterId: number | null = null

  if (session.role === 'mieter') {
    const mieterRow = await c.env.DB.prepare('SELECT id, wohnung_id FROM mieter WHERE id = ?').bind(session.mieterId).first<any>()
    if (!mieterRow) return c.json({ error: 'Mieter nicht gefunden' }, 404)
    wohnungId = mieterRow.wohnung_id
    mieterId = mieterRow.id
  } else {
    mieterId = b.mieter_id || null
  }

  const wohnung = await c.env.DB.prepare('SELECT objekt_id FROM wohnungen WHERE id = ?').bind(wohnungId).first<any>()
  if (!wohnung) return c.json({ error: 'Wohnung nicht gefunden' }, 404)

  const prioritaet = ['hoch', 'mittel', 'niedrig'].includes(b.prioritaet) ? b.prioritaet : 'mittel'

  const res = await c.env.DB.prepare(
    `INSERT INTO schadensmeldungen (objekt_id, wohnung_id, mieter_id, titel, beschreibung, raum, prioritaet, status)
     VALUES (?,?,?,?,?,?,?,'offen')`
  )
    .bind(wohnung.objekt_id, wohnungId, mieterId, b.titel || 'Schadensmeldung', b.beschreibung || '', b.raum || '', prioritaet)
    .run()

  return c.json({ id: res.meta.last_row_id })
})

// -------- Status/Notiz aktualisieren (nur Admin) --------
schaedenRoutes.put('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const b = await c.req.json<any>()
  const status = ['offen', 'in_bearbeitung', 'erledigt'].includes(b.status) ? b.status : 'offen'
  await c.env.DB.prepare(
    `UPDATE schadensmeldungen SET status=?, admin_notiz=?, aktualisiert_am=datetime('now') WHERE id=?`
  )
    .bind(status, b.admin_notiz || '', id)
    .run()
  return c.json({ ok: true })
})

schaedenRoutes.delete('/:id', requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM schadensmeldungen WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})
