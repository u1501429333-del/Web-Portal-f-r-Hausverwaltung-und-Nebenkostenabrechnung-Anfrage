import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { berechneMieterabrechnung, berechneVerteilung } from '../lib/calc'

export const abrechnungRoutes = new Hono<AppContext>()

// Gesamt-Verteilungsübersicht (Admin) für ein Objekt + Jahr
abrechnungRoutes.get('/objekt/:objektId/jahr/:jahr', async (c) => {
  const session = c.get('session')
  if (!session || session.role !== 'admin') return c.json({ error: 'Keine Berechtigung' }, 403)
  const objektId = Number(c.req.param('objektId'))
  const jahr = Number(c.req.param('jahr'))
  const result = await berechneVerteilung(c.env.DB, objektId, jahr)
  return c.json(result)
})

// Alle Mieterabrechnungen eines Objekts für ein Jahr (Admin)
abrechnungRoutes.get('/mieter/objekt/:objektId/jahr/:jahr', async (c) => {
  const session = c.get('session')
  if (!session || session.role !== 'admin') return c.json({ error: 'Keine Berechtigung' }, 403)
  const objektId = Number(c.req.param('objektId'))
  const jahr = Number(c.req.param('jahr'))
  const result = await berechneMieterabrechnung(c.env.DB, objektId, jahr)
  return c.json(result)
})

// Einzelne Wohnungsabrechnung (Admin oder der jeweilige Mieter selbst)
abrechnungRoutes.get('/wohnung/:wohnungId/jahr/:jahr', async (c) => {
  const session = c.get('session')
  if (!session) return c.json({ error: 'Nicht angemeldet' }, 401)

  const wohnungId = Number(c.req.param('wohnungId'))
  const jahr = Number(c.req.param('jahr'))

  const wohnung = await c.env.DB.prepare('SELECT * FROM wohnungen WHERE id = ?').bind(wohnungId).first<any>()
  if (!wohnung) return c.json({ error: 'Wohnung nicht gefunden' }, 404)

  if (session.role === 'mieter') {
    const mieterRow = await c.env.DB.prepare('SELECT wohnung_id FROM mieter WHERE id = ?').bind(session.mieterId).first<any>()
    if (!mieterRow || mieterRow.wohnung_id !== wohnungId) {
      return c.json({ error: 'Keine Berechtigung' }, 403)
    }
  }

  const { abrechnungen } = await berechneMieterabrechnung(c.env.DB, wohnung.objekt_id, jahr)
  const eigene = abrechnungen.find((a) => a.wohnung_id === wohnungId)
  if (!eigene) return c.json({ error: 'Keine Abrechnungsdaten' }, 404)

  const objekt = await c.env.DB.prepare('SELECT * FROM objekte WHERE id = ?').bind(wohnung.objekt_id).first()

  // Vorjahresvergleich (falls vorhanden)
  let vorjahr = null
  try {
    const vj = await berechneMieterabrechnung(c.env.DB, wohnung.objekt_id, jahr - 1)
    vorjahr = vj.abrechnungen.find((a) => a.wohnung_id === wohnungId) || null
  } catch {
    vorjahr = null
  }

  return c.json({ objekt, abrechnung: eigene, vorjahr })
})

// Mehrjahres-Historie für eine Wohnung (Verbrauch + Kosten über mehrere Jahre, für Charts)
abrechnungRoutes.get('/wohnung/:wohnungId/historie', async (c) => {
  const session = c.get('session')
  if (!session) return c.json({ error: 'Nicht angemeldet' }, 401)

  const wohnungId = Number(c.req.param('wohnungId'))
  const wohnung = await c.env.DB.prepare('SELECT * FROM wohnungen WHERE id = ?').bind(wohnungId).first<any>()
  if (!wohnung) return c.json({ error: 'Wohnung nicht gefunden' }, 404)

  if (session.role === 'mieter') {
    const mieterRow = await c.env.DB.prepare('SELECT wohnung_id FROM mieter WHERE id = ?').bind(session.mieterId).first<any>()
    if (!mieterRow || mieterRow.wohnung_id !== wohnungId) {
      return c.json({ error: 'Keine Berechtigung' }, 403)
    }
  }

  // Alle Jahre ermitteln, für die Zählerstände existieren
  const jahreRows = await c.env.DB.prepare(
    `SELECT DISTINCT zs.jahr FROM zaehlerstaende zs
     JOIN zaehler z ON z.id = zs.zaehler_id
     WHERE z.objekt_id = ? ORDER BY zs.jahr`
  )
    .bind(wohnung.objekt_id)
    .all<any>()
  const jahre = (jahreRows.results as any[]).map((r) => r.jahr).filter((j) => j >= 2000)

  const historie = []
  for (const jahr of jahre) {
    try {
      const { abrechnungen } = await berechneMieterabrechnung(c.env.DB, wohnung.objekt_id, jahr)
      const eigene = abrechnungen.find((a) => a.wohnung_id === wohnungId)
      if (eigene) {
        historie.push({
          jahr,
          wmz_heizung: eigene.verbrauch.wmz_heizung_verbrauch,
          ww_verbrauch: eigene.verbrauch.ww_verbrauch,
          kw_verbrauch: eigene.verbrauch.kw_verbrauch,
          summe_nebenkosten: eigene.summe_nebenkosten_volljahr,
          vorauszahlung: eigene.vorauszahlung_ist,
          differenz: eigene.differenz,
        })
      }
    } catch {
      // Jahr ohne vollständige Daten überspringen
    }
  }

  return c.json(historie)
})
