import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'

export const mieterRoutes = new Hono<AppContext>()

mieterRoutes.get('/:id', async (c) => {
  const session = c.get('session')
  const id = c.req.param('id')
  // Mieter dürfen nur ihre eigenen Daten sehen
  if (session?.role === 'mieter' && session.mieterId !== Number(id)) {
    return c.json({ error: 'Keine Berechtigung' }, 403)
  }
  const row = await c.env.DB.prepare('SELECT * FROM mieter WHERE id = ?').bind(id).first()
  if (!row) return c.json({ error: 'Nicht gefunden' }, 404)
  return c.json(row)
})

mieterRoutes.put('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const b = await c.req.json<any>()
  await c.env.DB.prepare(
    `UPDATE mieter SET anrede=?, vorname=?, nachname=?, email=?, telefon=?, personen=?, mietbeginn=?, mietende=?,
      kaltmiete_qm=?, kaltmiete_monat=?, erhoehung_pct=?, vorauszahlung_nk_monat=?, iban=?, kontoinhaber=?, aktiv=? WHERE id=?`
  )
    .bind(
      b.anrede || '', b.vorname || '', b.nachname || '', b.email || '', b.telefon || '',
      b.personen || 1, b.mietbeginn || null, b.mietende || null,
      b.kaltmiete_qm || 0, b.kaltmiete_monat || 0, b.erhoehung_pct || 0, b.vorauszahlung_nk_monat || 0,
      b.iban || '', b.kontoinhaber || '', b.aktiv ?? 1, id
    )
    .run()
  return c.json({ ok: true })
})

mieterRoutes.delete('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM mieter WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})
