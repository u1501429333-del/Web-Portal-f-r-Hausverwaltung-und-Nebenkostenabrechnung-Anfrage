import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'

export const zaehlerRoutes = new Hono<AppContext>()

// Alle Zähler eines Objekts (inkl. Gebäude-Zähler ohne Wohnung, z.B. Boiler)
zaehlerRoutes.get('/objekt/:objektId', async (c) => {
  const objektId = c.req.param('objektId')
  const rows = await c.env.DB.prepare('SELECT * FROM zaehler WHERE objekt_id = ? ORDER BY sort_order, id')
    .bind(objektId)
    .all()
  return c.json(rows.results)
})

zaehlerRoutes.post('/', requireAdmin, async (c) => {
  const b = await c.req.json<any>()
  const res = await c.env.DB.prepare(
    'INSERT INTO zaehler (objekt_id, wohnung_id, typ, ebene, bezeichnung, einheit, seriennummer, sort_order) VALUES (?,?,?,?,?,?,?,?)'
  )
    .bind(b.objekt_id, b.wohnung_id ?? null, b.typ, b.ebene || '', b.bezeichnung || '', b.einheit || 'kWh', b.seriennummer || '', b.sort_order || 0)
    .run()
  return c.json({ id: res.meta.last_row_id })
})

zaehlerRoutes.put('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const b = await c.req.json<any>()
  await c.env.DB.prepare('UPDATE zaehler SET typ=?, ebene=?, bezeichnung=?, einheit=?, seriennummer=?, sort_order=? WHERE id=?')
    .bind(b.typ, b.ebene || '', b.bezeichnung || '', b.einheit || 'kWh', b.seriennummer || '', b.sort_order || 0, id)
    .run()
  return c.json({ ok: true })
})

zaehlerRoutes.delete('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM zaehler WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// -------- Zählerstände --------

// Alle Stände eines Zählers (Historie über Jahre)
zaehlerRoutes.get('/:id/staende', async (c) => {
  const id = c.req.param('id')
  const rows = await c.env.DB.prepare('SELECT * FROM zaehlerstaende WHERE zaehler_id = ? ORDER BY jahr DESC')
    .bind(id)
    .all()
  return c.json(rows.results)
})

// Zählerstände für ein Objekt + Jahr (inkl. Vorjahr) - für Übersichtstabelle
zaehlerRoutes.get('/objekt/:objektId/jahr/:jahr', async (c) => {
  const objektId = c.req.param('objektId')
  const jahr = Number(c.req.param('jahr'))
  const zaehlerRows = await c.env.DB.prepare(
    `SELECT z.*, w.bezeichnung as wohnung_bezeichnung, w.lage as wohnung_lage
     FROM zaehler z LEFT JOIN wohnungen w ON w.id = z.wohnung_id
     WHERE z.objekt_id = ? ORDER BY z.sort_order, z.id`
  )
    .bind(objektId)
    .all()

  const result = []
  for (const z of zaehlerRows.results as any[]) {
    const aktuell = await c.env.DB.prepare('SELECT stand, ablesedatum FROM zaehlerstaende WHERE zaehler_id=? AND jahr=?')
      .bind(z.id, jahr)
      .first<any>()
    const vorjahr = await c.env.DB.prepare('SELECT stand, ablesedatum FROM zaehlerstaende WHERE zaehler_id=? AND jahr=?')
      .bind(z.id, jahr - 1)
      .first<any>()
    const vorvorjahr = await c.env.DB.prepare('SELECT stand FROM zaehlerstaende WHERE zaehler_id=? AND jahr=?')
      .bind(z.id, jahr - 2)
      .first<any>()

    // Ablesungs-Ampel: grün = Ablesedatum vorhanden und aktuelles Kalenderjahr abgelesen,
    // gelb = Wert vorhanden aber (z.B. Vorjahres-)Datum älter, rot = für dieses Jahr noch kein Wert erfasst.
    let ampel: 'gruen' | 'gelb' | 'rot' = 'rot'
    if (aktuell?.stand != null) {
      if (aktuell.ablesedatum) {
        const tageSeitAblesung = (Date.now() - new Date(aktuell.ablesedatum + 'T00:00:00').getTime()) / 86400000
        ampel = tageSeitAblesung <= 400 ? 'gruen' : 'gelb'
      } else {
        ampel = 'gelb'
      }
    }

    result.push({
      ...z,
      stand_aktuell: aktuell?.stand ?? null,
      ablesedatum_aktuell: aktuell?.ablesedatum ?? null,
      stand_vorjahr: vorjahr?.stand ?? null,
      verbrauch_aktuell: aktuell && vorjahr ? Math.max(0, aktuell.stand - vorjahr.stand) : null,
      verbrauch_vorjahr: vorjahr && vorvorjahr ? Math.max(0, vorjahr.stand - vorvorjahr.stand) : null,
      ablesung_ampel: ampel,
    })
  }
  return c.json(result)
})

// CSV-Export der Zählerstände eines Jahres - für Steuerberater/Buchhaltung
zaehlerRoutes.get('/objekt/:objektId/jahr/:jahr/csv', requireAdmin, async (c) => {
  const objektId = c.req.param('objektId')
  const jahr = Number(c.req.param('jahr'))
  const zaehlerRows = await c.env.DB.prepare(
    `SELECT z.*, w.bezeichnung as wohnung_bezeichnung
     FROM zaehler z LEFT JOIN wohnungen w ON w.id = z.wohnung_id
     WHERE z.objekt_id = ? ORDER BY z.sort_order, z.id`
  )
    .bind(objektId)
    .all<any>()

  const typLabels: Record<string, string> = {
    wmz_heizung: 'WMZ Heizung',
    wmz_boiler: 'WMZ Boiler',
    warmwasser: 'Warmwasser',
    kaltwasser: 'Kaltwasser',
    sonstige: 'Sonstige',
  }

  const zeilen = ['Wohnung;Zaehlertyp;Bezeichnung;Seriennummer;Einheit;Stand_Vorjahr;Stand_' + jahr + ';Verbrauch;Ablesedatum']
  for (const z of zaehlerRows.results as any[]) {
    const aktuell = await c.env.DB.prepare('SELECT stand, ablesedatum FROM zaehlerstaende WHERE zaehler_id=? AND jahr=?').bind(z.id, jahr).first<any>()
    const vorjahr = await c.env.DB.prepare('SELECT stand FROM zaehlerstaende WHERE zaehler_id=? AND jahr=?').bind(z.id, jahr - 1).first<any>()
    const verbrauch = aktuell && vorjahr ? Math.max(0, aktuell.stand - vorjahr.stand) : ''
    const wohnungLabel = z.wohnung_bezeichnung || 'Gebäude'
    zeilen.push(
      [
        wohnungLabel,
        typLabels[z.typ] || z.typ,
        z.bezeichnung,
        z.seriennummer || '',
        z.einheit,
        vorjahr?.stand ?? '',
        aktuell?.stand ?? '',
        verbrauch,
        aktuell?.ablesedatum ?? '',
      ]
        .map((v) => String(v).replace(/;/g, ','))
        .join(';')
    )
  }
  const csv = '\uFEFF' + zeilen.join('\r\n') // BOM für korrekte Umlaute in Excel
  c.header('Content-Type', 'text/csv; charset=utf-8')
  c.header('Content-Disposition', `attachment; filename="Zaehlerstaende_${jahr}.csv"`)
  return c.body(csv)
})

// Zählerstand eintragen/aktualisieren (Admin ODER Mieter für eigene Wohnung)
zaehlerRoutes.post('/:id/staende', async (c) => {
  const session = c.get('session')
  if (!session) return c.json({ error: 'Nicht angemeldet' }, 401)

  const zaehlerId = c.req.param('id')
  const b = await c.req.json<any>()
  const jahr = Number(b.jahr)
  const stand = Number(b.stand)
  if (!jahr || Number.isNaN(stand)) return c.json({ error: 'Ungültige Daten' }, 400)

  // Mieter dürfen nur Zähler ihrer eigenen Wohnung erfassen
  if (session.role === 'mieter') {
    const zaehler = await c.env.DB.prepare('SELECT wohnung_id FROM zaehler WHERE id = ?').bind(zaehlerId).first<any>()
    if (!zaehler) return c.json({ error: 'Zähler nicht gefunden' }, 404)
    const mieterRow = await c.env.DB.prepare('SELECT wohnung_id FROM mieter WHERE id = ?').bind(session.mieterId).first<any>()
    if (!mieterRow || mieterRow.wohnung_id !== zaehler.wohnung_id) {
      return c.json({ error: 'Keine Berechtigung für diesen Zähler' }, 403)
    }
  }

  await c.env.DB.prepare(
    `INSERT INTO zaehlerstaende (zaehler_id, jahr, stand, ablesedatum, quelle, erfasst_von, notiz)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(zaehler_id, jahr) DO UPDATE SET stand=excluded.stand, ablesedatum=excluded.ablesedatum, quelle=excluded.quelle, erfasst_von=excluded.erfasst_von, notiz=excluded.notiz`
  )
    .bind(zaehlerId, jahr, stand, b.ablesedatum || null, session.role, session.uid, b.notiz || '')
    .run()

  return c.json({ ok: true })
})
