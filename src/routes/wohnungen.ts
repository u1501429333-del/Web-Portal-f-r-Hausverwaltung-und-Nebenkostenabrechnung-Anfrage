import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'

export const wohnungenRoutes = new Hono<AppContext>()

wohnungenRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT * FROM wohnungen WHERE id = ?').bind(id).first()
  if (!row) return c.json({ error: 'Nicht gefunden' }, 404)
  return c.json(row)
})

wohnungenRoutes.put('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const b = await c.req.json<any>()
  await c.env.DB.prepare('UPDATE wohnungen SET bezeichnung=?, lage=?, flaeche_m2=?, sort_order=? WHERE id=?')
    .bind(b.bezeichnung || '', b.lage || '', b.flaeche_m2 || 0, b.sort_order || 0, id)
    .run()
  return c.json({ ok: true })
})

wohnungenRoutes.delete('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM wohnungen WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// -------- Mieter je Wohnung --------
wohnungenRoutes.get('/:id/mieter', async (c) => {
  const id = c.req.param('id')
  const rows = await c.env.DB.prepare('SELECT * FROM mieter WHERE wohnung_id = ? ORDER BY id DESC').bind(id).all()
  return c.json(rows.results)
})

wohnungenRoutes.post('/:id/mieter', requireAdmin, async (c) => {
  const wohnungId = c.req.param('id')
  const b = await c.req.json<any>()
  const res = await c.env.DB.prepare(
    `INSERT INTO mieter (wohnung_id, anrede, vorname, nachname, email, telefon, personen, mietbeginn, mietende,
      kaltmiete_qm, kaltmiete_monat, erhoehung_pct, vorauszahlung_nk_monat, iban, kontoinhaber, aktiv)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  )
    .bind(
      wohnungId, b.anrede || '', b.vorname || '', b.nachname || '', b.email || '', b.telefon || '',
      b.personen || 1, b.mietbeginn || null, b.mietende || null,
      b.kaltmiete_qm || 0, b.kaltmiete_monat || 0, b.erhoehung_pct || 0, b.vorauszahlung_nk_monat || 0,
      b.iban || '', b.kontoinhaber || '', b.aktiv ?? 1
    )
    .run()
  return c.json({ id: res.meta.last_row_id })
})

// -------- Zähler je Wohnung --------
wohnungenRoutes.get('/:id/zaehler', async (c) => {
  const id = c.req.param('id')
  const rows = await c.env.DB.prepare('SELECT * FROM zaehler WHERE wohnung_id = ? ORDER BY sort_order, id').bind(id).all()
  return c.json(rows.results)
})
