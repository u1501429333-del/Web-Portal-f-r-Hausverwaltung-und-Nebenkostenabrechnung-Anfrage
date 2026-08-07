import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'
import { generateAndSaveReinigungsplan } from './dokumente'

export const objekteRoutes = new Hono<AppContext>()

// Die 17 Betriebskostenarten gemäß § 2 BetrKV (Betriebskostenverordnung).
// Wird automatisch für jedes neu angelegte Objekt erzeugt, damit der Admin
// nicht jede Kostenart manuell anlegen muss.
const BETRKV_KOSTENARTEN: Array<{ nr: number; bezeichnung: string; schluessel: string; beschreibung: string }> = [
  { nr: 1, bezeichnung: 'Grundsteuer', schluessel: 'flaeche', beschreibung: '§2 Nr.1 BetrKV' },
  { nr: 2, bezeichnung: 'Wasserversorgung (Frischwasser)', schluessel: 'wasser_verbrauch', beschreibung: '§2 Nr.2 BetrKV' },
  { nr: 3, bezeichnung: 'Entwässerung / Abwasser', schluessel: 'wasser_verbrauch', beschreibung: '§2 Nr.3 BetrKV' },
  { nr: 4, bezeichnung: 'Heizung (Raumwärme)', schluessel: 'heizung_30_70', beschreibung: '§2 Nr.4a BetrKV, HeizkostenV §7/§8' },
  { nr: 5, bezeichnung: 'Warmwasser (Erwärmung)', schluessel: 'warmwasser_30_70', beschreibung: '§2 Nr.5a BetrKV, HeizkostenV §7/§8' },
  { nr: 6, bezeichnung: 'Aufzug', schluessel: 'einheiten', beschreibung: '§2 Nr.7 BetrKV' },
  { nr: 7, bezeichnung: 'Straßenreinigung / Müllabfuhr', schluessel: 'personen', beschreibung: '§2 Nr.8 BetrKV' },
  { nr: 8, bezeichnung: 'Gebäudereinigung / Ungezieferbekämpfung', schluessel: 'einheiten', beschreibung: '§2 Nr.9 BetrKV' },
  { nr: 9, bezeichnung: 'Gartenpflege', schluessel: 'einheiten', beschreibung: '§2 Nr.10 BetrKV' },
  { nr: 10, bezeichnung: 'Beleuchtung (Allgemeinstrom)', schluessel: 'einheiten', beschreibung: '§2 Nr.11 BetrKV' },
  { nr: 11, bezeichnung: 'Schornsteinreinigung', schluessel: 'einheiten', beschreibung: '§2 Nr.12 BetrKV' },
  { nr: 12, bezeichnung: 'Sach- und Haftpflichtversicherung', schluessel: 'flaeche', beschreibung: '§2 Nr.13 BetrKV' },
  { nr: 13, bezeichnung: 'Hauswart / Hausmeister', schluessel: 'einheiten', beschreibung: '§2 Nr.14 BetrKV' },
  { nr: 14, bezeichnung: 'Gemeinschafts-Antennenanlage / Kabelanschluss', schluessel: 'einheiten', beschreibung: '§2 Nr.15 BetrKV' },
  { nr: 15, bezeichnung: 'Wasch-/Trockeneinrichtungen', schluessel: 'einheiten', beschreibung: '§2 Nr.16 BetrKV' },
  { nr: 16, bezeichnung: 'Wartung Heizung', schluessel: 'einheiten', beschreibung: '§2 Nr.4c BetrKV' },
  { nr: 17, bezeichnung: 'Sonstige Betriebskosten', schluessel: 'flaeche', beschreibung: '§2 Nr.17 BetrKV' },
]

async function erzeugeBetrKVKostenarten(db: D1Database, objektId: number) {
  for (const k of BETRKV_KOSTENARTEN) {
    await db
      .prepare(
        'INSERT INTO kostenarten (objekt_id, nr, bezeichnung, verteilerschluessel, beschreibung, sort_order, aktiv) VALUES (?,?,?,?,?,?,1)'
      )
      .bind(objektId, k.nr, k.bezeichnung, k.schluessel, k.beschreibung, k.nr)
      .run()
  }
}

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

  const objektId = Number(res.meta.last_row_id)
  // Automatisch die 17 gesetzlichen Betriebskostenarten gem. §2 BetrKV anlegen,
  // damit der Admin nicht jede Kostenart einzeln erfassen muss.
  try {
    await erzeugeBetrKVKostenarten(c.env.DB, objektId)
  } catch (e) {
    // ignorieren - Kostenarten können später manuell angelegt werden
  }

  return c.json({ id: objektId })
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

  const wohnungId = Number(res.meta.last_row_id)

  // Automatisch die 3 Standard-Zähler (WMZ Heizung, Warmwasser, Kaltwasser)
  // für die neue Wohnung anlegen, damit nicht jeder Zähler einzeln erfasst
  // werden muss. Der Admin kann sie danach umbenennen/ergänzen.
  try {
    const bez = b.bezeichnung || `Wohnung ${wohnungId}`
    const standardZaehler: Array<{ typ: string; bezeichnung: string; einheit: string }> = [
      { typ: 'wmz_heizung', bezeichnung: `Wärmemengenzähler Heizung ${bez}`, einheit: 'kWh' },
      { typ: 'warmwasser', bezeichnung: `Warmwasserzähler ${bez}`, einheit: 'm³' },
      { typ: 'kaltwasser', bezeichnung: `Kaltwasserzähler ${bez}`, einheit: 'm³' },
    ]
    for (let i = 0; i < standardZaehler.length; i++) {
      const z = standardZaehler[i]
      await c.env.DB.prepare(
        'INSERT INTO zaehler (objekt_id, wohnung_id, typ, bezeichnung, einheit, sort_order) VALUES (?,?,?,?,?,?)'
      )
        .bind(objektId, wohnungId, z.typ, z.bezeichnung, z.einheit, i)
        .run()
    }
  } catch (e) {
    // ignorieren - Zähler können später manuell angelegt werden
  }

  // Treppenreinigungsplan automatisch neu erzeugen, da sich die Anzahl der
  // Wohnungen (und damit die wöchentliche Rotation) geändert hat.
  try {
    await generateAndSaveReinigungsplan(c.env.DB, Number(objektId), new Date().getFullYear())
  } catch (e) {
    // ignorieren - Plan kann später manuell erzeugt werden
  }

  return c.json({ id: wohnungId })
})
