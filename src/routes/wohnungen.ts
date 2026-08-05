import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'
import { generateAndSaveMietvertrag, generateAndSaveWohnungsuebergabe, generateAndSaveReinigungsplan } from './dokumente'

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
      kaltmiete_qm, kaltmiete_monat, erhoehung_pct, vorauszahlung_nk_monat, iban, kontoinhaber, aktiv,
      stellplatz_vorhanden, stellplatz_nr, stellplatz_miete, garage_vorhanden, garage_nr, garage_miete,
      keller_vorhanden, keller_nr, garten_vorhanden, garten_beschreibung,
      anzahl_hausschluessel, anzahl_briefkastenschluessel, sonstige_schluessel)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  )
    .bind(
      wohnungId, b.anrede || '', b.vorname || '', b.nachname || '', b.email || '', b.telefon || '',
      b.personen || 1, b.mietbeginn || null, b.mietende || null,
      b.kaltmiete_qm || 0, b.kaltmiete_monat || 0, b.erhoehung_pct || 0, b.vorauszahlung_nk_monat || 0,
      b.iban || '', b.kontoinhaber || '', b.aktiv ?? 1,
      b.stellplatz_vorhanden ? 1 : 0, b.stellplatz_nr || '', b.stellplatz_miete || 0,
      b.garage_vorhanden ? 1 : 0, b.garage_nr || '', b.garage_miete || 0,
      b.keller_vorhanden ? 1 : 0, b.keller_nr || '',
      b.garten_vorhanden ? 1 : 0, b.garten_beschreibung || '',
      b.anzahl_hausschluessel || 0, b.anzahl_briefkastenschluessel || 0, b.sonstige_schluessel || ''
    )
    .run()
  const mieterId = res.meta.last_row_id as number

  // Automatische Dokumentenerstellung: Mietvertrag + Wohnungsübergabeprotokoll,
  // sobald ein neuer Mieter angelegt wird (Fehler hierbei dürfen das Anlegen nicht blockieren)
  let autoDocs: { mietvertrag?: number; wohnungsuebergabe?: number } = {}
  try {
    const mv = await generateAndSaveMietvertrag(c.env.DB, mieterId)
    autoDocs.mietvertrag = mv.id as number
  } catch (e) {
    // ignorieren - Dokument kann später manuell erstellt werden
  }
  try {
    const wu = await generateAndSaveWohnungsuebergabe(c.env.DB, mieterId)
    autoDocs.wohnungsuebergabe = wu.id as number
  } catch (e) {
    // ignorieren
  }

  return c.json({ id: mieterId, autoDocs })
})

// -------- Zähler je Wohnung --------
wohnungenRoutes.get('/:id/zaehler', async (c) => {
  const id = c.req.param('id')
  const rows = await c.env.DB.prepare('SELECT * FROM zaehler WHERE wohnung_id = ? ORDER BY sort_order, id').bind(id).all()
  return c.json(rows.results)
})
