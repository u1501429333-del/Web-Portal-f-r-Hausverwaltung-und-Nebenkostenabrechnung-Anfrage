import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'
import { generateMietvertrag, generateHausordnung, generateReinigungsplan, generateWohnungsuebergabe, generateWmzAnleitung, generateAblesedatenblatt } from '../lib/dokumente'
import { generateAbrechnungHtml } from '../lib/abrechnungPdf'
import { berechneMieterabrechnung } from '../lib/calc'
import { getBranding } from '../lib/settings'

export const dokumenteRoutes = new Hono<AppContext>()

// ============================================================
// Wiederverwendbare Generier-/Speicher-Helfer (auch für Auto-Generierung
// beim Anlegen neuer Wohnungen/Mieter genutzt, siehe routes/wohnungen.ts + objekte.ts)
// ============================================================

export async function generateAndSaveMietvertrag(db: D1Database, mieterId: number) {
  const mieter = await db.prepare('SELECT * FROM mieter WHERE id = ?').bind(mieterId).first<any>()
  if (!mieter) throw new Error('Mieter nicht gefunden')
  const wohnung = await db.prepare('SELECT * FROM wohnungen WHERE id = ?').bind(mieter.wohnung_id).first<any>()
  const objekt = await db.prepare('SELECT * FROM objekte WHERE id = ?').bind(wohnung.objekt_id).first<any>()
  const branding = await getBranding(db)
  const html = generateMietvertrag(objekt, wohnung, mieter, branding)
  const res = await db
    .prepare('INSERT INTO dokumente (objekt_id, wohnung_id, mieter_id, typ, titel, inhalt_html) VALUES (?,?,?,?,?,?)')
    .bind(objekt.id, wohnung.id, mieter.id, 'mietvertrag', `Mietvertrag ${wohnung.bezeichnung} - ${mieter.nachname}`, html)
    .run()
  return { id: res.meta.last_row_id, html }
}

export async function generateAndSaveWohnungsuebergabe(db: D1Database, mieterId: number) {
  const mieter = await db.prepare('SELECT * FROM mieter WHERE id = ?').bind(mieterId).first<any>()
  if (!mieter) throw new Error('Mieter nicht gefunden')
  const wohnung = await db.prepare('SELECT * FROM wohnungen WHERE id = ?').bind(mieter.wohnung_id).first<any>()
  const objekt = await db.prepare('SELECT * FROM objekte WHERE id = ?').bind(wohnung.objekt_id).first<any>()
  const branding = await getBranding(db)
  const html = generateWohnungsuebergabe(objekt, wohnung, mieter, branding, 'einzug')
  const res = await db
    .prepare('INSERT INTO dokumente (objekt_id, wohnung_id, mieter_id, typ, titel, inhalt_html) VALUES (?,?,?,?,?,?)')
    .bind(objekt.id, wohnung.id, mieter.id, 'wohnungsuebergabe', `Wohnungsübergabe ${wohnung.bezeichnung} - ${mieter.nachname}`, html)
    .run()
  return { id: res.meta.last_row_id, html }
}

export async function generateAndSaveHausordnung(db: D1Database, objektId: number) {
  const objekt = await db.prepare('SELECT * FROM objekte WHERE id = ?').bind(objektId).first<any>()
  if (!objekt) throw new Error('Objekt nicht gefunden')
  const branding = await getBranding(db)
  const html = generateHausordnung(objekt, branding)
  const res = await db
    .prepare('INSERT INTO dokumente (objekt_id, typ, titel, inhalt_html) VALUES (?,?,?,?)')
    .bind(objekt.id, 'hausordnung', `Hausordnung ${objekt.name}`, html)
    .run()
  return { id: res.meta.last_row_id, html }
}

/** Regeneriert (löscht + erstellt neu) den Treppenreinigungsplan eines Objekts für ein Jahr.
 *  Wird automatisch aufgerufen, sobald eine neue Wohnung angelegt wird, damit die
 *  wöchentliche Rotation immer alle aktuellen Wohnungen berücksichtigt. */
export async function generateAndSaveReinigungsplan(db: D1Database, objektId: number, jahr?: number) {
  const objekt = await db.prepare('SELECT * FROM objekte WHERE id = ?').bind(objektId).first<any>()
  if (!objekt) throw new Error('Objekt nicht gefunden')
  const year = jahr || new Date().getFullYear()
  const wohnungenRows = await db.prepare('SELECT * FROM wohnungen WHERE objekt_id = ? ORDER BY sort_order, id').bind(objektId).all<any>()
  const branding = await getBranding(db)
  const html = generateReinigungsplan(objekt, wohnungenRows.results as any[], branding, year)
  // Alten Plan für dieses Objekt + Jahr entfernen, damit stets nur ein aktueller Plan existiert
  await db.prepare(`DELETE FROM dokumente WHERE objekt_id = ? AND typ = 'reinigungsplan' AND titel LIKE ?`).bind(objektId, `%${year}%`).run()
  const res = await db
    .prepare('INSERT INTO dokumente (objekt_id, typ, titel, inhalt_html) VALUES (?,?,?,?)')
    .bind(objekt.id, 'reinigungsplan', `Treppenreinigungsplan ${year} - ${objekt.name}`, html)
    .run()
  return { id: res.meta.last_row_id, html }
}

// ============================================================
// Routen
// ============================================================

// Liste gespeicherter Dokumente eines Objekts
dokumenteRoutes.get('/objekt/:objektId', requireAdmin, async (c) => {
  const objektId = c.req.param('objektId')
  const rows = await c.env.DB.prepare('SELECT id, typ, titel, wohnung_id, mieter_id, erstellt_am FROM dokumente WHERE objekt_id = ? ORDER BY erstellt_am DESC')
    .bind(objektId)
    .all()
  return c.json(rows.results)
})

// WMZ-Ablesehilfe (Bedienungsanleitung Sensus PolluCom F/E) - druckfertiges HTML, für Admin und Mieter zugänglich
// WICHTIG: Muss VOR der generischen '/:id/html' Route stehen, da diese sonst 'wmz-ablesehilfe' als :id interpretiert.
dokumenteRoutes.get('/wmz-ablesehilfe/html', async (c) => {
  const session = c.get('session')
  if (!session) return c.text('Nicht angemeldet', 401)

  let objekt: any = null
  const objektIdParam = c.req.query('objektId')
  if (objektIdParam) {
    objekt = await c.env.DB.prepare('SELECT * FROM objekte WHERE id = ?').bind(Number(objektIdParam)).first<any>()
  } else if (session.role === 'mieter') {
    const mieterRow = await c.env.DB.prepare(
      `SELECT o.* FROM objekte o JOIN wohnungen w ON w.objekt_id = o.id JOIN mieter m ON m.wohnung_id = w.id WHERE m.id = ?`
    ).bind(session.mieterId).first<any>()
    objekt = mieterRow
  }
  if (!objekt) {
    objekt = await c.env.DB.prepare('SELECT * FROM objekte ORDER BY id LIMIT 1').first<any>()
  }
  if (!objekt) return c.text('Kein Objekt gefunden', 404)

  const branding = await getBranding(c.env.DB)
  const html = generateWmzAnleitung(objekt, branding)
  return c.html(html)
})

// Ablesedatenblatt (leeres Formular zum handschriftlichen Eintragen der Zählerstände)
// WICHTIG: Ebenfalls VOR '/:id/html' registriert, um Routenkollision zu vermeiden.
dokumenteRoutes.get('/ablesedatenblatt/:wohnungId/:jahr', async (c) => {
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
  const zaehlerRows = await c.env.DB.prepare('SELECT bezeichnung, typ, einheit FROM zaehler WHERE wohnung_id = ? ORDER BY sort_order, id').bind(wohnungId).all<any>()
  const branding = await getBranding(c.env.DB)
  const html = generateAblesedatenblatt(objekt, wohnung, zaehlerRows.results as any[], jahr, branding)
  return c.html(html)
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

// -------- Generatoren (manuell durch Admin auslösbar) --------

dokumenteRoutes.post('/generate/mietvertrag/:mieterId', requireAdmin, async (c) => {
  try {
    const result = await generateAndSaveMietvertrag(c.env.DB, Number(c.req.param('mieterId')))
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 404)
  }
})

dokumenteRoutes.post('/generate/wohnungsuebergabe/:mieterId', requireAdmin, async (c) => {
  try {
    const result = await generateAndSaveWohnungsuebergabe(c.env.DB, Number(c.req.param('mieterId')))
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 404)
  }
})

dokumenteRoutes.post('/generate/hausordnung/:objektId', requireAdmin, async (c) => {
  try {
    const result = await generateAndSaveHausordnung(c.env.DB, Number(c.req.param('objektId')))
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 404)
  }
})

dokumenteRoutes.post('/generate/reinigungsplan/:objektId', requireAdmin, async (c) => {
  const jahr = Number(c.req.query('jahr')) || new Date().getFullYear()
  try {
    const result = await generateAndSaveReinigungsplan(c.env.DB, Number(c.req.param('objektId')), jahr)
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 404)
  }
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

  const branding = await getBranding(c.env.DB)
  const html = generateAbrechnungHtml(objekt, eigene, jahr, vorjahr, branding)
  return c.html(html)
})

