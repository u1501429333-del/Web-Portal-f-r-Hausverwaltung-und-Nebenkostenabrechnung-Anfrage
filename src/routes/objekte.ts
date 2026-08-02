import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'

export const objekteRoutes = new Hono<AppContext>()

objekteRoutes.get('/', requireAdmin, async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM objekte ORDER BY id').all()
  return c.json(rows.results)
})

objekteRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT * FROM objekte WHERE id = ?').bind(id).first()
  if (!row) return c.json({ error: 'Nicht gefunden' }, 404)
  return c.json(row)
})

objekteRoutes.post('/', requireAdmin, async (c) => {
  const b = await c.req.json<any>()
  const res = await c.env.DB.prepare(
    `INSERT INTO objekte (name, strasse, plz, ort, land, vermieter_name, vermieter_strasse, vermieter_plz_ort, vermieter_telefon, vermieter_email, bank_name, iban, bic, steuernummer)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  )
    .bind(
      b.name || '', b.strasse || '', b.plz || '', b.ort || '', b.land || 'Deutschland',
      b.vermieter_name || '', b.vermieter_strasse || '', b.vermieter_plz_ort || '', b.vermieter_telefon || '', b.vermieter_email || '',
      b.bank_name || '', b.iban || '', b.bic || '', b.steuernummer || ''
    )
    .run()
  return c.json({ id: res.meta.last_row_id })
})

objekteRoutes.put('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const b = await c.req.json<any>()
  await c.env.DB.prepare(
    `UPDATE objekte SET name=?, strasse=?, plz=?, ort=?, land=?, vermieter_name=?, vermieter_strasse=?, vermieter_plz_ort=?, vermieter_telefon=?, vermieter_email=?, bank_name=?, iban=?, bic=?, steuernummer=? WHERE id=?`
  )
    .bind(
      b.name || '', b.strasse || '', b.plz || '', b.ort || '', b.land || 'Deutschland',
      b.vermieter_name || '', b.vermieter_strasse || '', b.vermieter_plz_ort || '', b.vermieter_telefon || '', b.vermieter_email || '',
      b.bank_name || '', b.iban || '', b.bic || '', b.steuernummer || '', id
    )
    .run()
  return c.json({ ok: true })
})

objekteRoutes.delete('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM objekte WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// -------- Wohnungen --------
objekteRoutes.get('/:id/wohnungen', async (c) => {
  const id = c.req.param('id')
  const rows = await c.env.DB.prepare('SELECT * FROM wohnungen WHERE objekt_id = ? ORDER BY sort_order, id').bind(id).all()
  return c.json(rows.results)
})

objekteRoutes.post('/:id/wohnungen', requireAdmin, async (c) => {
  const objektId = c.req.param('id')
  const b = await c.req.json<any>()
  const res = await c.env.DB.prepare(
    'INSERT INTO wohnungen (objekt_id, bezeichnung, lage, flaeche_m2, sort_order) VALUES (?,?,?,?,?)'
  )
    .bind(objektId, b.bezeichnung || '', b.lage || '', b.flaeche_m2 || 0, b.sort_order || 0)
    .run()
  return c.json({ id: res.meta.last_row_id })
})
