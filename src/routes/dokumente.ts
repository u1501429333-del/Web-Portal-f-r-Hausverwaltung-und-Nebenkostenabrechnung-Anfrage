import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'
import { generateMietvertrag, generateHausordnung, generateReinigungsplan } from '../lib/dokumente'
import { generateAbrechnungHtml } from '../lib/abrechnungPdf'
import { berechneMieterabrechnung } from '../lib/calc'

export const dokumenteRoutes = new Hono<AppContext>()

// Liste gespeicherter Dokumente eines Objekts
dokumenteRoutes.get('/objekt/:objektId', requireAdmin, async (c) => {
  const objektId = c.req.param('objektId')
  const rows = await c.env.DB.prepare('SELECT id, typ, titel, wohnung_id, mieter_id, erstellt_am FROM dokumente WHERE objekt_id = ? ORDER BY erstellt_am DESC')
    .bind(objektId)
    .all()
  return c.json(rows.results)
})

dokumenteRoutes.get('/:id/html', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT * FROM dokumente WHERE id = ?').bind(id).first<any>()
  if (!row) return c.text('Nicht gefunden', 404)
  return c.html(row.inhalt_html)
})

dokumenteRoutes.delete('/:id', requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM dokumente WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// -------- Generatoren --------

dokumenteRoutes.post('/generate/mietvertrag/:mieterId', requireAdmin, async (c) => {
  const mieterId = c.req.param('mieterId')
  const mieter = await c.env.DB.prepare('SELECT * FROM mieter WHERE id = ?').bind(mieterId).first<any>()
  if (!mieter) return c.json({ error: 'Mieter nicht gefunden' }, 404)
  const wohnung = await c.env.DB.prepare('SELECT * FROM wohnungen WHERE id = ?').bind(mieter.wohnung_id).first<any>()
  const objekt = await c.env.DB.prepare('SELECT * FROM objekte WHERE id = ?').bind(wohnung.objekt_id).first<any>()

  const html = generateMietvertrag(objekt, wohnung, mieter)
  const res = await c.env.DB.prepare(
    'INSERT INTO dokumente (objekt_id, wohnung_id, mieter_id, typ, titel, inhalt_html) VALUES (?,?,?,?,?,?)'
  )
    .bind(objekt.id, wohnung.id, mieter.id, 'mietvertrag', `Mietvertrag ${wohnung.bezeichnung} - ${mieter.nachname}`, html)
    .run()
  return c.json({ id: res.meta.last_row_id, html })
})

dokumenteRoutes.post('/generate/hausordnung/:objektId', requireAdmin, async (c) => {
  const objektId = c.req.param('objektId')
  const objekt = await c.env.DB.prepare('SELECT * FROM objekte WHERE id = ?').bind(objektId).first<any>()
  if (!objekt) return c.json({ error: 'Objekt nicht gefunden' }, 404)

  const html = generateHausordnung(objekt)
  const res = await c.env.DB.prepare(
    'INSERT INTO dokumente (objekt_id, typ, titel, inhalt_html) VALUES (?,?,?,?)'
  )
    .bind(objekt.id, 'hausordnung', `Hausordnung ${objekt.name}`, html)
    .run()
  return c.json({ id: res.meta.last_row_id, html })
})

dokumenteRoutes.post('/generate/reinigungsplan/:objektId', requireAdmin, async (c) => {
  const objektId = c.req.param('objektId')
  const objekt = await c.env.DB.prepare('SELECT * FROM objekte WHERE id = ?').bind(objektId).first<any>()
  if (!objekt) return c.json({ error: 'Objekt nicht gefunden' }, 404)
  const wohnungenRows = await c.env.DB.prepare('SELECT * FROM wohnungen WHERE objekt_id = ? ORDER BY sort_order, id').bind(objektId).all<any>()

  const html = generateReinigungsplan(objekt, wohnungenRows.results as any[])
  const res = await c.env.DB.prepare(
    'INSERT INTO dokumente (objekt_id, typ, titel, inhalt_html) VALUES (?,?,?,?)'
  )
    .bind(objekt.id, 'reinigungsplan', `Treppenreinigungsplan ${objekt.name}`, html)
    .run()
  return c.json({ id: res.meta.last_row_id, html })
})

// Nebenkostenabrechnung als druckfertiges HTML (live, ohne Speicherung) - für Admin und Mieter (eigene Wohnung)
dokumenteRoutes.get('/abrechnung-html/:wohnungId/:jahr', async (c) => {
  const session = c.get('session')
  if (!session) return c.text('Nicht angemeldet', 401)

  const wohnungId = Number(c.req.param('wohnungId'))
  const jahr = Number(c.req.param('jahr'))

  const wohnung = await c.env.DB.prepare('SELECT * FROM wohnungen WHERE id = ?').bind(wohnungId).first<any>()
  if (!wohnung) return c.text('Wohnung nicht gefunden', 404)

  if (session.role === 'mieter') {
    const mieterRow = await c.env.DB.prepare('SELECT wohnung_id FROM mieter WHERE id = ?').bind(session.mieterId).first<any>()
    if (!mieterRow || mieterRow.wohnung_id !== wohnungId) return c.text('Keine Berechtigung', 403)
  }

  const objekt = await c.env.DB.prepare('SELECT * FROM objekte WHERE id = ?').bind(wohnung.objekt_id).first<any>()
  const { abrechnungen } = await berechneMieterabrechnung(c.env.DB, wohnung.objekt_id, jahr)
  const eigene = abrechnungen.find((a) => a.wohnung_id === wohnungId)
  if (!eigene) return c.text('Keine Abrechnungsdaten für dieses Jahr', 404)

  let vorjahr = null
  try {
    const vj = await berechneMieterabrechnung(c.env.DB, wohnung.objekt_id, jahr - 1)
    vorjahr = vj.abrechnungen.find((a) => a.wohnung_id === wohnungId) || null
  } catch {
    vorjahr = null
  }

  const html = generateAbrechnungHtml(objekt, eigene, jahr, vorjahr)
  return c.html(html)
})
