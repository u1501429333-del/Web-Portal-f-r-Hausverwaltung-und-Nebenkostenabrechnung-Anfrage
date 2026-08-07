import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'
import { berechneVerteilung } from '../lib/calc'

export const dashboardRoutes = new Hono<AppContext>()

/** Einfache lineare Regression (Methode der kleinsten Quadrate) über {x,y}-Punkte.
 *  Gibt Steigung (pro Jahr) und die Prognose für das nächste Jahr zurück. */
function linreg(points: { x: number; y: number }[]): { steigung: number; achsenabschnitt: number; prognoseNaechstesJahr: number | null } {
  const n = points.length
  if (n < 2) return { steigung: 0, achsenabschnitt: points[0]?.y ?? 0, prognoseNaechstesJahr: null }
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return { steigung: 0, achsenabschnitt: sumY / n, prognoseNaechstesJahr: null }
  const steigung = (n * sumXY - sumX * sumY) / denom
  const achsenabschnitt = (sumY - steigung * sumX) / n
  const naechstesX = Math.max(...points.map((p) => p.x)) + 1
  const prognose = achsenabschnitt + steigung * naechstesX
  return { steigung, achsenabschnitt, prognoseNaechstesJahr: Math.max(0, prognose) }
}

// Erweiterte Dashboard-Kennzahlen: Leerstand, Nachzahlungssummen, 3-Jahres-Kostentrend + Regression, Mietende-Warnungen
dashboardRoutes.get('/objekt/:objektId', requireAdmin, async (c) => {
  const objektId = Number(c.req.param('objektId'))
  const jahr = Number(c.req.query('jahr')) || new Date().getFullYear()

  // -------- Leerstand: Wohnungen ohne aktiven Mieter --------
  const wohnungenRows = await c.env.DB.prepare('SELECT * FROM wohnungen WHERE objekt_id = ? ORDER BY sort_order, id')
    .bind(objektId)
    .all<any>()
  const wohnungen = wohnungenRows.results as any[]

  let leerstehendeWohnungen: any[] = []
  let flaecheLeerstand = 0
  for (const w of wohnungen) {
    const aktiverMieter = await c.env.DB.prepare('SELECT id FROM mieter WHERE wohnung_id = ? AND aktiv = 1').bind(w.id).first<any>()
    if (!aktiverMieter) {
      leerstehendeWohnungen.push({ id: w.id, bezeichnung: w.bezeichnung, lage: w.lage, flaeche_m2: w.flaeche_m2 })
      flaecheLeerstand += w.flaeche_m2
    }
  }
  const flaecheGesamt = wohnungen.reduce((s, w) => s + w.flaeche_m2, 0)
  const leerstandQuotePct = flaecheGesamt > 0 ? (flaecheLeerstand / flaecheGesamt) * 100 : 0

  // -------- Mietende-Warnungen: Mietverträge, die in den nächsten 90 Tagen enden --------
  const heute = new Date()
  const in90Tagen = new Date(heute.getTime() + 90 * 86400000)
  const mietendeRows = await c.env.DB.prepare(
    `SELECT m.id, m.vorname, m.nachname, m.mietende, w.id as wohnung_id, w.bezeichnung as wohnung_bezeichnung
     FROM mieter m JOIN wohnungen w ON w.id = m.wohnung_id
     WHERE w.objekt_id = ? AND m.aktiv = 1 AND m.mietende IS NOT NULL AND m.mietende != ''`
  )
    .bind(objektId)
    .all<any>()
  const mietendeWarnungen = (mietendeRows.results as any[])
    .filter((m) => {
      const d = new Date(m.mietende + 'T00:00:00')
      return d >= heute && d <= in90Tagen
    })
    .map((m) => ({
      ...m,
      tage_bis_mietende: Math.round((new Date(m.mietende + 'T00:00:00').getTime() - heute.getTime()) / 86400000),
    }))
    .sort((a, b) => a.tage_bis_mietende - b.tage_bis_mietende)

  // -------- Nachzahlungen/Guthaben-Summen für das aktuelle Jahr --------
  let nachzahlungenSumme = 0
  let guthabenSumme = 0
  let anzahlNachzahlung = 0
  let anzahlGuthaben = 0
  try {
    const { berechneMieterabrechnung } = await import('../lib/calc')
    const { abrechnungen } = await berechneMieterabrechnung(c.env.DB, objektId, jahr)
    for (const a of abrechnungen) {
      if (a.status === 'Nachzahlung') {
        nachzahlungenSumme += a.differenz
        anzahlNachzahlung++
      } else if (a.status === 'Guthaben') {
        guthabenSumme += Math.abs(a.differenz)
        anzahlGuthaben++
      }
    }
  } catch {
    // keine Daten für dieses Jahr vorhanden
  }

  // -------- 3(+)-Jahres-Kostentrend mit linearer Regression --------
  const jahre = [jahr - 2, jahr - 1, jahr]
  const trendPunkte: { x: number; y: number }[] = []
  for (const j of jahre) {
    try {
      const v = await berechneVerteilung(c.env.DB, objektId, j)
      if (v.gesamtkosten > 0) trendPunkte.push({ x: j, y: v.gesamtkosten })
    } catch {
      // Jahr ohne Daten überspringen
    }
  }
  const regression = linreg(trendPunkte)

  return c.json({
    leerstand: {
      wohnungen: leerstehendeWohnungen,
      anzahl: leerstehendeWohnungen.length,
      von_wohnungen_gesamt: wohnungen.length,
      flaeche_leerstand_m2: flaecheLeerstand,
      flaeche_gesamt_m2: flaecheGesamt,
      quote_pct: leerstandQuotePct,
    },
    mietende_warnungen: mietendeWarnungen,
    nachzahlungen: {
      summe_nachzahlung: nachzahlungenSumme,
      summe_guthaben: guthabenSumme,
      anzahl_nachzahlung: anzahlNachzahlung,
      anzahl_guthaben: anzahlGuthaben,
      jahr,
    },
    kostentrend: {
      punkte: trendPunkte,
      steigung_pro_jahr: regression.steigung,
      prognose_naechstes_jahr: regression.prognoseNaechstesJahr,
    },
  })
})
