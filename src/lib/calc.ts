// ============================================================
// Berechnungs-Engine: Nebenkostenabrechnung
// Rechtsgrundlage: BetrKV §2 (17 Betriebskostenarten) + HeizkostenV §7/§8 (30/70-Verteilung)
// Diese Datei enthält die komplette fachliche Logik, 1:1 abgeleitet aus der
// mitgelieferten Referenz-Exceltabelle (Stammdaten/Zaehlerstaende/Kosten/Berechnung).
// ============================================================

import type { Bindings, Wohnung, Mieter, Kostenart, Verteilerschluessel } from './types'

export interface WohnungVerbrauch {
  wohnung_id: number
  bezeichnung: string
  lage: string
  flaeche_m2: number
  personen: number
  wmz_heizung_verbrauch: number // kWh, Summe aller WMZ-Heizung-Zähler dieser Wohnung
  ww_verbrauch: number // m³
  kw_verbrauch: number // m³
  frischwasser_gesamt: number // m³ = WW + KW
}

export interface GebaeudeSummen {
  flaeche_gesamt: number
  personen_gesamt: number
  einheiten_gesamt: number
  wmz_heizung_gesamt: number
  wmz_boiler_gesamt: number // Gebäude-Boiler-WMZ (Warmwasser-Erzeugung)
  ww_gesamt: number
  kw_gesamt: number
  frischwasser_gesamt: number
}

/** Verbrauch = Zählerstand aktuelles Jahr − Zählerstand Vorjahr (0 falls kein Vorjahreswert existiert) */
async function verbrauchProZaehler(
  db: D1Database,
  objektId: number,
  jahr: number
): Promise<Map<number, { verbrauch: number; vorwert: number; aktuell: number; typ: string; wohnung_id: number | null }>> {
  const zaehlerRows = await db
    .prepare('SELECT id, typ, wohnung_id FROM zaehler WHERE objekt_id = ?')
    .bind(objektId)
    .all()
  const result = new Map<
    number,
    { verbrauch: number; vorwert: number; aktuell: number; typ: string; wohnung_id: number | null }
  >()
  for (const z of zaehlerRows.results as any[]) {
    const aktuellRow = await db
      .prepare('SELECT stand FROM zaehlerstaende WHERE zaehler_id = ? AND jahr = ?')
      .bind(z.id, jahr)
      .first<{ stand: number }>()
    const vorRow = await db
      .prepare('SELECT stand FROM zaehlerstaende WHERE zaehler_id = ? AND jahr = ?')
      .bind(z.id, jahr - 1)
      .first<{ stand: number }>()
    const aktuell = aktuellRow?.stand ?? 0
    const vorwert = vorRow?.stand ?? 0
    const verbrauch = Math.max(0, aktuell - vorwert)
    result.set(z.id, { verbrauch, vorwert, aktuell, typ: z.typ, wohnung_id: z.wohnung_id })
  }
  return result
}

export async function getVerbrauchsdaten(
  db: D1Database,
  objektId: number,
  jahr: number
): Promise<{ wohnungen: WohnungVerbrauch[]; summen: GebaeudeSummen; boiler_verbrauch: number }> {
  const wohnungenRows = await db
    .prepare('SELECT * FROM wohnungen WHERE objekt_id = ? ORDER BY sort_order, id')
    .bind(objektId)
    .all<Wohnung>()
  const wohnungen = wohnungenRows.results as unknown as Wohnung[]

  const zaehlerVerbrauch = await verbrauchProZaehler(db, objektId, jahr)

  let boiler_verbrauch = 0
  for (const [, v] of zaehlerVerbrauch) {
    if (v.typ === 'wmz_boiler' && v.wohnung_id === null) boiler_verbrauch += v.verbrauch
  }

  const result: WohnungVerbrauch[] = []
  const summen: GebaeudeSummen = {
    flaeche_gesamt: 0,
    personen_gesamt: 0,
    einheiten_gesamt: wohnungen.length,
    wmz_heizung_gesamt: 0,
    wmz_boiler_gesamt: boiler_verbrauch,
    ww_gesamt: 0,
    kw_gesamt: 0,
    frischwasser_gesamt: 0,
  }

  for (const w of wohnungen) {
    // Mieter für Personenzahl (aktiver Mietvertrag)
    const mieterRow = await db
      .prepare('SELECT personen FROM mieter WHERE wohnung_id = ? AND aktiv = 1 ORDER BY id DESC LIMIT 1')
      .bind(w.id)
      .first<{ personen: number }>()
    const personen = mieterRow?.personen ?? 0

    let wmzHeizung = 0
    let ww = 0
    let kw = 0
    for (const [, v] of zaehlerVerbrauch) {
      if (v.wohnung_id !== w.id) continue
      if (v.typ === 'wmz_heizung') wmzHeizung += v.verbrauch
      if (v.typ === 'warmwasser') ww += v.verbrauch
      if (v.typ === 'kaltwasser') kw += v.verbrauch
    }

    const frischwasser = ww + kw
    result.push({
      wohnung_id: w.id,
      bezeichnung: w.bezeichnung,
      lage: w.lage,
      flaeche_m2: w.flaeche_m2,
      personen,
      wmz_heizung_verbrauch: wmzHeizung,
      ww_verbrauch: ww,
      kw_verbrauch: kw,
      frischwasser_gesamt: frischwasser,
    })

    summen.flaeche_gesamt += w.flaeche_m2
    summen.personen_gesamt += personen
    summen.wmz_heizung_gesamt += wmzHeizung
    summen.ww_gesamt += ww
    summen.kw_gesamt += kw
    summen.frischwasser_gesamt += frischwasser
  }

  return { wohnungen: result, summen, boiler_verbrauch }
}

/** Gas-Aufteilung nach HeizkostenV §7/§8: proportional zum WMZ-Verbrauch Heizung vs. Boiler */
export function computeGasAufteilung(gasGesamt: number, wmzHeizungGesamt: number, wmzBoilerGesamt: number) {
  const summe = wmzHeizungGesamt + wmzBoilerGesamt
  if (summe <= 0) {
    return { anteilHeizung: 0, anteilWarmwasser: 0, kostenHeizung: 0, kostenWarmwasser: 0 }
  }
  const anteilHeizung = wmzHeizungGesamt / summe
  const anteilWarmwasser = wmzBoilerGesamt / summe
  return {
    anteilHeizung,
    anteilWarmwasser,
    kostenHeizung: gasGesamt * anteilHeizung,
    kostenWarmwasser: gasGesamt * anteilWarmwasser,
  }
}

export interface KostenartVerteilung {
  kostenart_id: number
  nr: number
  bezeichnung: string
  verteilerschluessel: Verteilerschluessel
  beschreibung: string
  gesamtbetrag: number
  anteile: Record<number, { anteil_pct: number; betrag: number }> // wohnung_id -> {..}
  summe_verteilt: number
  differenz: number
}

/** Ermittelt den Verteilungs-Anteil (0..1) einer Wohnung für einen gegebenen Schlüssel */
function anteilFuerSchluessel(
  schluessel: Verteilerschluessel,
  w: WohnungVerbrauch,
  summen: GebaeudeSummen
): number {
  switch (schluessel) {
    case 'flaeche':
      return summen.flaeche_gesamt > 0 ? w.flaeche_m2 / summen.flaeche_gesamt : 0
    case 'personen':
      return summen.personen_gesamt > 0 ? w.personen / summen.personen_gesamt : 0
    case 'einheiten':
    case 'individuell':
      return summen.einheiten_gesamt > 0 ? 1 / summen.einheiten_gesamt : 0
    case 'wasser_verbrauch':
      return summen.frischwasser_gesamt > 0 ? w.frischwasser_gesamt / summen.frischwasser_gesamt : 0
    case 'heizung_30_70': {
      const flAnteil = summen.flaeche_gesamt > 0 ? w.flaeche_m2 / summen.flaeche_gesamt : 0
      const vbAnteil = summen.wmz_heizung_gesamt > 0 ? w.wmz_heizung_verbrauch / summen.wmz_heizung_gesamt : 0
      return 0.3 * flAnteil + 0.7 * vbAnteil
    }
    case 'warmwasser_30_70': {
      const flAnteil = summen.flaeche_gesamt > 0 ? w.flaeche_m2 / summen.flaeche_gesamt : 0
      const vbAnteil = summen.ww_gesamt > 0 ? w.ww_verbrauch / summen.ww_gesamt : 0
      return 0.3 * flAnteil + 0.7 * vbAnteil
    }
    default:
      return 0
  }
}

export async function berechneVerteilung(
  db: D1Database,
  objektId: number,
  jahr: number
): Promise<{
  wohnungen: WohnungVerbrauch[]
  summen: GebaeudeSummen
  boiler_verbrauch: number
  kostenarten: KostenartVerteilung[]
  gesamtkosten: number
  wohnungSummen: Record<number, number>
  gasInfo: { gesamtbetrag: number; anteilHeizung: number; anteilWarmwasser: number; kostenHeizung: number; kostenWarmwasser: number } | null
}> {
  const { wohnungen, summen, boiler_verbrauch } = await getVerbrauchsdaten(db, objektId, jahr)

  const kostenartenRows = await db
    .prepare('SELECT * FROM kostenarten WHERE objekt_id = ? AND aktiv = 1 ORDER BY sort_order, nr')
    .bind(objektId)
    .all<Kostenart>()
  const kostenartenList = kostenartenRows.results as unknown as Kostenart[]

  const kostenRows = await db
    .prepare('SELECT kostenart_id, betrag FROM kosten WHERE objekt_id = ? AND jahr = ?')
    .bind(objektId, jahr)
    .all<{ kostenart_id: number; betrag: number }>()
  const kostenMap = new Map<number, number>()
  for (const r of kostenRows.results as any[]) kostenMap.set(r.kostenart_id, r.betrag)

  // Gas-Aufteilung (falls Gasabrechnung für das Jahr existiert)
  const gasRow = await db
    .prepare('SELECT gesamtbetrag FROM gasabrechnung WHERE objekt_id = ? AND jahr = ?')
    .bind(objektId, jahr)
    .first<{ gesamtbetrag: number }>()
  let gasInfo = null as any
  if (gasRow) {
    const g = computeGasAufteilung(gasRow.gesamtbetrag, summen.wmz_heizung_gesamt, boiler_verbrauch)
    gasInfo = { gesamtbetrag: gasRow.gesamtbetrag, ...g }
  }

  const kostenarten: KostenartVerteilung[] = []
  let gesamtkosten = 0
  const wohnungSummen: Record<number, number> = {}
  for (const w of wohnungen) wohnungSummen[w.wohnung_id] = 0

  for (const ka of kostenartenList) {
    let gesamtbetrag = kostenMap.get(ka.id) ?? 0
    // Automatische Gas-Aufteilung überschreibt manuellen Betrag, falls Gasabrechnung vorhanden ist
    // und diese Kostenart per 30/70-Heizung bzw. 30/70-Warmwasser verteilt wird UND kein manueller Wert > 0 gesetzt ist.
    if (gasInfo && gesamtbetrag === 0) {
      if (ka.verteilerschluessel === 'heizung_30_70') gesamtbetrag = gasInfo.kostenHeizung
      if (ka.verteilerschluessel === 'warmwasser_30_70') gesamtbetrag = gasInfo.kostenWarmwasser
    }

    // Bei "individuell" kann der Admin für diese Kostenart pro Wohnung einen frei definierten
    // Prozentanteil hinterlegt haben (Tabelle individuelle_anteile). Ist nichts hinterlegt,
    // fällt anteilFuerSchluessel() automatisch auf eine Gleichverteilung zurück.
    let customMap: Record<number, number> | null = null
    if (ka.verteilerschluessel === 'individuell') {
      const rows = await db
        .prepare('SELECT wohnung_id, anteil_pct FROM individuelle_anteile WHERE kostenart_id = ?')
        .bind(ka.id)
        .all<{ wohnung_id: number; anteil_pct: number }>()
      const raw = rows.results as any[]
      if (raw.length > 0) {
        const sum = raw.reduce((s, r) => s + (r.anteil_pct || 0), 0)
        if (sum > 0) {
          customMap = {}
          for (const r of raw) customMap[r.wohnung_id] = (r.anteil_pct || 0) / sum
        }
      }
    }

    const anteile: Record<number, { anteil_pct: number; betrag: number }> = {}
    let summeVerteilt = 0
    for (const w of wohnungen) {
      const pct = customMap ? customMap[w.wohnung_id] ?? 0 : anteilFuerSchluessel(ka.verteilerschluessel, w, summen)
      const betrag = gesamtbetrag * pct
      anteile[w.wohnung_id] = { anteil_pct: pct, betrag }
      summeVerteilt += betrag
      wohnungSummen[w.wohnung_id] += betrag
    }

    kostenarten.push({
      kostenart_id: ka.id,
      nr: ka.nr,
      bezeichnung: ka.bezeichnung,
      verteilerschluessel: ka.verteilerschluessel,
      beschreibung: ka.beschreibung,
      gesamtbetrag,
      anteile,
      summe_verteilt: summeVerteilt,
      differenz: summeVerteilt - gesamtbetrag,
    })
    gesamtkosten += gesamtbetrag
  }

  return { wohnungen, summen, boiler_verbrauch, kostenarten, gesamtkosten, wohnungSummen, gasInfo }
}

/** Tagesgenaue Abrechnung: Tage = Mietende - Mietbeginn + 1 (begrenzt auf Jahreslänge), Tagesfaktor = Tage / Jahreslänge */
export function berechneTagesfaktor(jahr: number, mietbeginn: string | null, mietende: string | null) {
  const jahresanfang = new Date(Date.UTC(jahr, 0, 1))
  const jahresende = new Date(Date.UTC(jahr, 11, 31))
  const jahresTage = Math.round((jahresende.getTime() - jahresanfang.getTime()) / 86400000) + 1

  let start = jahresanfang
  let ende = jahresende
  if (mietbeginn) {
    const d = new Date(mietbeginn + 'T00:00:00Z')
    if (d > start) start = d
  }
  if (mietende) {
    const d = new Date(mietende + 'T00:00:00Z')
    if (d < ende) ende = d
  }
  let tage = Math.round((ende.getTime() - start.getTime()) / 86400000) + 1
  if (tage < 0) tage = 0
  if (tage > jahresTage) tage = jahresTage
  const tagesfaktor = jahresTage > 0 ? tage / jahresTage : 0
  return { tage, jahresTage, tagesfaktor }
}

export interface MieterAbrechnung {
  wohnung_id: number
  bezeichnung: string
  lage: string
  mieter: Mieter | null
  verbrauch: WohnungVerbrauch
  kostenarten: { nr: number; bezeichnung: string; verteilerschluessel: string; gesamt: number; anteil_pct: number; betrag: number }[]
  summe_nebenkosten_volljahr: number
  tage: number
  jahresTage: number
  tagesfaktor: number
  summe_nebenkosten_tag_genau: number
  vorauszahlung_soll: number
  vorauszahlung_ist: number
  differenz: number
  status: 'Nachzahlung' | 'Guthaben' | 'Ausgeglichen'
  kaltmiete_monat: number
  kaltmiete_neu_monat: number
  kaltmiete_jahr_tag_genau: number
  gesamtforderung: number
}

export async function berechneMieterabrechnung(
  db: D1Database,
  objektId: number,
  jahr: number
): Promise<{ abrechnungen: MieterAbrechnung[]; verteilung: Awaited<ReturnType<typeof berechneVerteilung>> }> {
  const verteilung = await berechneVerteilung(db, objektId, jahr)
  const abrechnungen: MieterAbrechnung[] = []

  for (const w of verteilung.wohnungen) {
    const mieterRow = await db
      .prepare('SELECT * FROM mieter WHERE wohnung_id = ? AND aktiv = 1 ORDER BY id DESC LIMIT 1')
      .bind(w.wohnung_id)
      .first<Mieter>()
    const mieter = (mieterRow as unknown as Mieter) ?? null

    const kostenartenDetail = verteilung.kostenarten.map((ka) => ({
      nr: ka.nr,
      bezeichnung: ka.bezeichnung,
      verteilerschluessel: ka.verteilerschluessel,
      gesamt: ka.gesamtbetrag,
      anteil_pct: ka.anteile[w.wohnung_id]?.anteil_pct ?? 0,
      betrag: ka.anteile[w.wohnung_id]?.betrag ?? 0,
    }))
    const summeVolljahr = kostenartenDetail.reduce((s, k) => s + k.betrag, 0)

    const { tage, jahresTage, tagesfaktor } = berechneTagesfaktor(jahr, mieter?.mietbeginn ?? null, mieter?.mietende ?? null)
    const summeTagGenau = summeVolljahr * tagesfaktor

    const vzMonat = mieter?.vorauszahlung_nk_monat ?? 0
    const vorauszahlungSoll = vzMonat * 12 * tagesfaktor
    const vorauszahlungIst = vzMonat * 12 * tagesfaktor // Ist = tatsächlich gezahlt; ohne Extra-Tabelle identisch zu Soll
    const differenz = summeTagGenau - vorauszahlungIst
    const status: MieterAbrechnung['status'] = differenz > 0.005 ? 'Nachzahlung' : differenz < -0.005 ? 'Guthaben' : 'Ausgeglichen'

    const kaltmieteMonat = mieter?.kaltmiete_monat ?? 0
    const erhoehung = mieter?.erhoehung_pct ?? 0
    const kaltmieteNeu = kaltmieteMonat * (1 + erhoehung)
    const kaltmieteJahrTagGenau = kaltmieteNeu * 12 * tagesfaktor

    abrechnungen.push({
      wohnung_id: w.wohnung_id,
      bezeichnung: w.bezeichnung,
      lage: w.lage,
      mieter,
      verbrauch: w,
      kostenarten: kostenartenDetail,
      summe_nebenkosten_volljahr: summeVolljahr,
      tage,
      jahresTage,
      tagesfaktor,
      summe_nebenkosten_tag_genau: summeTagGenau,
      vorauszahlung_soll: vorauszahlungSoll,
      vorauszahlung_ist: vorauszahlungIst,
      differenz,
      status,
      kaltmiete_monat: kaltmieteMonat,
      kaltmiete_neu_monat: kaltmieteNeu,
      kaltmiete_jahr_tag_genau: kaltmieteJahrTagGenau,
      gesamtforderung: kaltmieteJahrTagGenau + summeTagGenau,
    })
  }

  return { abrechnungen, verteilung }
}
