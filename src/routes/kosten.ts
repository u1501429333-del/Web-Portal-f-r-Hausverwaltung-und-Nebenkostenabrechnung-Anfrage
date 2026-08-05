import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'

export const kostenRoutes = new Hono<AppContext>()

// -------- Kostenarten (Katalog) --------
kostenRoutes.get('/kostenarten/:objektId', async (c) => {
  const objektId = c.req.param('objektId')
  const rows = await c.env.DB.prepare('SELECT * FROM kostenarten WHERE objekt_id = ? ORDER BY sort_order, nr')
    .bind(objektId)
    .all()
  return c.json(rows.results)
})

kostenRoutes.post('/kostenarten', requireAdmin, async (c) => {
  const b = await c.req.json<any>()
  const res = await c.env.DB.prepare(
    'INSERT INTO kostenarten (objekt_id, nr, bezeichnung, verteilerschluessel, beschreibung, sort_order) VALUES (?,?,?,?,?,?)'
  )
    .bind(b.objekt_id, b.nr, b.bezeichnung, b.verteilerschluessel, b.beschreibung || '', b.sort_order || b.nr)
    .run()
  return c.json({ id: res.meta.last_row_id })
})

kostenRoutes.put('/kostenarten/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const b = await c.req.json<any>()
  await c.env.DB.prepare('UPDATE kostenarten SET nr=?, bezeichnung=?, verteilerschluessel=?, beschreibung=?, sort_order=?, aktiv=? WHERE id=?')
    .bind(b.nr, b.bezeichnung, b.verteilerschluessel, b.beschreibung || '', b.sort_order || b.nr, b.aktiv ?? 1, id)
    .run()
  return c.json({ ok: true })
})

kostenRoutes.delete('/kostenarten/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM kostenarten WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// -------- Individuelle Verteilerschlüssel-Anteile (frei definierbar je Wohnung) --------
// Wird genutzt, wenn eine Kostenart den Verteilerschlüssel "individuell" verwendet:
// Der Admin kann hier für jede Wohnung einen eigenen Prozentsatz festlegen (statt Gleichverteilung).
kostenRoutes.get('/kostenarten/:id/anteile', requireAdmin, async (c) => {
  const kostenartId = c.req.param('id')
  const ka = await c.env.DB.prepare('SELECT * FROM kostenarten WHERE id = ?').bind(kostenartId).first<any>()
  if (!ka) return c.json({ error: 'Kostenart nicht gefunden' }, 404)
  const wohnungen = await c.env.DB.prepare('SELECT id, bezeichnung, lage FROM wohnungen WHERE objekt_id = ? ORDER BY sort_order, id')
    .bind(ka.objekt_id)
    .all<any>()
  const anteileRows = await c.env.DB.prepare('SELECT wohnung_id, anteil_pct FROM individuelle_anteile WHERE kostenart_id = ?')
    .bind(kostenartId)
    .all<any>()
  const map = new Map<number, number>()
  for (const r of anteileRows.results as any[]) map.set(r.wohnung_id, r.anteil_pct)
  const result = (wohnungen.results as any[]).map((w) => ({
    wohnung_id: w.id,
    bezeichnung: w.bezeichnung,
    lage: w.lage,
    anteil_pct: map.get(w.id) ?? 0,
  }))
  return c.json(result)
})

kostenRoutes.post('/kostenarten/:id/anteile', requireAdmin, async (c) => {
  const kostenartId = c.req.param('id')
  const b = await c.req.json<any>() // { anteile: [{ wohnung_id, anteil_pct }] } -- anteil_pct als Bruch 0..1
  const anteile = Array.isArray(b.anteile) ? b.anteile : []
  for (const a of anteile) {
    await c.env.DB.prepare(
      `INSERT INTO individuelle_anteile (kostenart_id, wohnung_id, anteil_pct) VALUES (?,?,?)
       ON CONFLICT(kostenart_id, wohnung_id) DO UPDATE SET anteil_pct=excluded.anteil_pct`
    )
      .bind(kostenartId, a.wohnung_id, a.anteil_pct || 0)
      .run()
  }
  return c.json({ ok: true })
})

// -------- Kosten (Jahresbeträge) --------
kostenRoutes.get('/objekt/:objektId/jahr/:jahr', async (c) => {
  const objektId = c.req.param('objektId')
  const jahr = c.req.param('jahr')
  const rows = await c.env.DB.prepare(
    `SELECT k.id as kosten_id, k.betrag, ka.*
     FROM kostenarten ka
     LEFT JOIN kosten k ON k.kostenart_id = ka.id AND k.jahr = ?
     WHERE ka.objekt_id = ? AND ka.aktiv = 1
     ORDER BY ka.sort_order, ka.nr`
  )
    .bind(jahr, objektId)
    .all()
  return c.json(rows.results)
})

kostenRoutes.post('/objekt/:objektId/jahr/:jahr', requireAdmin, async (c) => {
  const objektId = c.req.param('objektId')
  const jahr = Number(c.req.param('jahr'))
  const b = await c.req.json<any>() // { kostenart_id, betrag }
  await c.env.DB.prepare(
    `INSERT INTO kosten (objekt_id, kostenart_id, jahr, betrag) VALUES (?,?,?,?)
     ON CONFLICT(kostenart_id, jahr) DO UPDATE SET betrag=excluded.betrag`
  )
    .bind(objektId, b.kostenart_id, jahr, b.betrag || 0)
    .run()
  return c.json({ ok: true })
})

// -------- Gasabrechnung (für automatische Aufteilung Heizung/Warmwasser) --------
kostenRoutes.get('/gas/:objektId/:jahr', async (c) => {
  const objektId = c.req.param('objektId')
  const jahr = c.req.param('jahr')
  const row = await c.env.DB.prepare('SELECT * FROM gasabrechnung WHERE objekt_id = ? AND jahr = ?')
    .bind(objektId, jahr)
    .first()
  return c.json(row || { gesamtbetrag: 0 })
})

kostenRoutes.post('/gas/:objektId/:jahr', requireAdmin, async (c) => {
  const objektId = c.req.param('objektId')
  const jahr = c.req.param('jahr')
  const b = await c.req.json<any>()
  await c.env.DB.prepare(
    `INSERT INTO gasabrechnung (objekt_id, jahr, gesamtbetrag) VALUES (?,?,?)
     ON CONFLICT(objekt_id, jahr) DO UPDATE SET gesamtbetrag=excluded.gesamtbetrag`
  )
    .bind(objektId, jahr, b.gesamtbetrag || 0)
    .run()
  return c.json({ ok: true })
})
