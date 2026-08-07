import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'

export const budgetRoutes = new Hono<AppContext>()

// Soll-Ist-Vergleich: für jede Kostenart des Objekts/Jahres den Budget-Soll-Wert
// und den tatsächlich erfassten Ist-Wert (aus "kosten") gegenüberstellen.
budgetRoutes.get('/objekt/:objektId/jahr/:jahr', requireAdmin, async (c) => {
  const objektId = c.req.param('objektId')
  const jahr = c.req.param('jahr')
  const rows = await c.env.DB.prepare(
    `SELECT ka.id as kostenart_id, ka.nr, ka.bezeichnung, ka.verteilerschluessel,
            COALESCE(b.betrag_soll, 0) as betrag_soll,
            COALESCE(k.betrag, 0) as betrag_ist
     FROM kostenarten ka
     LEFT JOIN budget b ON b.kostenart_id = ka.id AND b.jahr = ?
     LEFT JOIN kosten k ON k.kostenart_id = ka.id AND k.jahr = ?
     WHERE ka.objekt_id = ? AND ka.aktiv = 1
     ORDER BY ka.sort_order, ka.nr`
  )
    .bind(jahr, jahr, objektId)
    .all<any>()

  const result = (rows.results as any[]).map((r) => ({
    ...r,
    differenz: r.betrag_ist - r.betrag_soll,
    differenz_pct: r.betrag_soll > 0 ? ((r.betrag_ist - r.betrag_soll) / r.betrag_soll) * 100 : null,
  }))

  const summeSoll = result.reduce((s, r) => s + r.betrag_soll, 0)
  const summeIst = result.reduce((s, r) => s + r.betrag_ist, 0)

  return c.json({ positionen: result, summe_soll: summeSoll, summe_ist: summeIst, differenz: summeIst - summeSoll })
})

// Einzelnen Budget-Sollwert setzen/aktualisieren
budgetRoutes.post('/objekt/:objektId/jahr/:jahr', requireAdmin, async (c) => {
  const objektId = c.req.param('objektId')
  const jahr = Number(c.req.param('jahr'))
  const b = await c.req.json<any>() // { kostenart_id, betrag_soll }
  await c.env.DB.prepare(
    `INSERT INTO budget (objekt_id, kostenart_id, jahr, betrag_soll) VALUES (?,?,?,?)
     ON CONFLICT(kostenart_id, jahr) DO UPDATE SET betrag_soll=excluded.betrag_soll`
  )
    .bind(objektId, b.kostenart_id, jahr, b.betrag_soll || 0)
    .run()
  return c.json({ ok: true })
})
