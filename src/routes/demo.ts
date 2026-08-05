import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'
import { generateSalt, hashPassword } from '../lib/auth'
import { generateAndSaveReinigungsplan, generateAndSaveMietvertrag, generateAndSaveWohnungsuebergabe } from './dokumente'

export const demoRoutes = new Hono<AppContext>()

const KOSTENARTEN_VORLAGE: { nr: number; bezeichnung: string; verteilerschluessel: string; beschreibung: string; gewicht: number }[] = [
  { nr: 1, bezeichnung: 'Grundsteuer', verteilerschluessel: 'flaeche', beschreibung: 'Verteilung nach Wohnfläche (§2 Nr.1 BetrKV)', gewicht: 0.09 },
  { nr: 2, bezeichnung: 'Heizung Gas (Raumwärme)', verteilerschluessel: 'heizung_30_70', beschreibung: '30% nach m² + 70% nach WMZ-Verbrauch (§7 HeizkostenV)', gewicht: 0 },
  { nr: 3, bezeichnung: 'Warmwasser Gas (Erwärmung)', verteilerschluessel: 'warmwasser_30_70', beschreibung: '30% nach m² + 70% nach WW-m³ (§8 HeizkostenV)', gewicht: 0 },
  { nr: 4, bezeichnung: 'Wasserversorgung (Frischwasser)', verteilerschluessel: 'wasser_verbrauch', beschreibung: 'WW-m³ + KW-m³ pro Wohnung', gewicht: 0.12 },
  { nr: 5, bezeichnung: 'Abwasser (Schmutzwasser)', verteilerschluessel: 'wasser_verbrauch', beschreibung: 'Nach Gesamtfrischwasser (WW+KW)', gewicht: 0.16 },
  { nr: 6, bezeichnung: 'Müllabfuhr', verteilerschluessel: 'personen', beschreibung: 'Nach Personenzahl je Wohnung', gewicht: 0.07 },
  { nr: 7, bezeichnung: 'Straßenreinigung', verteilerschluessel: 'einheiten', beschreibung: 'Pro Wohneinheit', gewicht: 0.018 },
  { nr: 8, bezeichnung: 'Gebäudereinigung', verteilerschluessel: 'einheiten', beschreibung: 'Pro Wohneinheit', gewicht: 0.12 },
  { nr: 9, bezeichnung: 'Gartenpflege', verteilerschluessel: 'einheiten', beschreibung: 'Pro Wohneinheit', gewicht: 0.06 },
  { nr: 10, bezeichnung: 'Allgemeinstrom', verteilerschluessel: 'einheiten', beschreibung: 'Pro Wohneinheit', gewicht: 0.024 },
  { nr: 11, bezeichnung: 'Schornsteinfeger', verteilerschluessel: 'einheiten', beschreibung: 'Pro Wohneinheit', gewicht: 0.012 },
  { nr: 12, bezeichnung: 'Versicherungen (Sach/Haft)', verteilerschluessel: 'flaeche', beschreibung: 'Verteilung nach Wohnfläche', gewicht: 0.09 },
  { nr: 13, bezeichnung: 'Hauswart / Hausmeister', verteilerschluessel: 'einheiten', beschreibung: 'Pro Wohneinheit', gewicht: 0.24 },
  { nr: 14, bezeichnung: 'Wartung Heizung', verteilerschluessel: 'einheiten', beschreibung: 'Pro Wohneinheit', gewicht: 0.03 },
  { nr: 15, bezeichnung: 'Aufzug', verteilerschluessel: 'einheiten', beschreibung: 'Pro Wohneinheit', gewicht: 0.036 },
  { nr: 16, bezeichnung: 'Kabelanschluss', verteilerschluessel: 'einheiten', beschreibung: 'Pro Wohneinheit', gewicht: 0.036 },
  { nr: 17, bezeichnung: 'Sonstige Kosten', verteilerschluessel: 'flaeche', beschreibung: 'Verteilung nach Wohnfläche', gewicht: 0.018 },
]

const VORNAMEN = ['Anna', 'Max', 'Julia', 'Tom', 'Lena', 'Paul', 'Laura', 'Jonas', 'Nina', 'Felix', 'Sophie', 'Leon', 'Emma', 'David', 'Sarah', 'Tim', 'Marie', 'Erik', 'Clara', 'Jan']
const NACHNAMEN = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hofmann', 'Lange']
const LAGEN = ['EG links', 'EG rechts', '1.OG links', '1.OG rechts', '2.OG links', '2.OG rechts', 'DG links', 'DG rechts']

function randomPassword(len = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length]
  return out
}

// Admin kann sich selbst flexibel einen Demo-Bereich (Objekt + Wohnungen + Mieter + Zähler +
// Kosten + optional Login-Zugänge) anlegen - beliebig oft, mit selbst gewählter Größe/Namen.
// Ersetzt die frühere feste "Admin-Demo/Mieter-Demo"-Fixierung durch ein flexibles Self-Service-Tool.
demoRoutes.post('/generate', requireAdmin, async (c) => {
  const db = c.env.DB
  const b = await c.req.json<any>().catch(() => ({}))

  const anzahlWohnungen = Math.min(30, Math.max(1, Number(b.anzahl_wohnungen) || 6))
  const jetzt = new Date().getFullYear()
  const jahrAktuell = Number(b.jahr) || jetzt
  const jahrVorjahr = jahrAktuell - 1
  const jahrBasis = jahrVorjahr - 1 // Basiswert für Zählerstände, damit Vorjahr einen Verbrauch hat
  const emailDomain = (b.email_domain || 'demo.local').replace(/[^a-z0-9.\-]/gi, '') || 'demo.local'
  const createLogins = !!b.create_logins
  const name = (b.name && String(b.name).trim()) || `Demo-Objekt ${new Date().toLocaleDateString('de-DE')}`

  // 1. Objekt anlegen -------------------------------------------------
  const objRes = await db
    .prepare(
      `INSERT INTO objekte (name, strasse, plz, ort, land, vermieter_name, vermieter_strasse, vermieter_plz_ort, vermieter_telefon, vermieter_email, bank_name, iban, bic, steuernummer)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      name, 'Musterweg 1', '10115', 'Berlin', 'Deutschland',
      'Demo Hausverwaltung GmbH', 'Musterweg 1', '10115 Berlin', '030 1234567', 'verwaltung@' + emailDomain,
      'Demo-Bank', 'DE00 0000 0000 0000 0000 00', 'DEMODEXX', '00/000/00000'
    )
    .run()
  const objektId = objRes.meta.last_row_id as number

  // 2. Wohnungen + Mieter + Zähler -------------------------------------
  const wohnungIds: number[] = []
  const mieterIds: number[] = []
  const zaehlerMap: { wohnung_id: number; heizung_id: number; ww_id: number; kw_id: number }[] = []
  let flaecheGesamt = 0

  for (let i = 0; i < anzahlWohnungen; i++) {
    const flaeche = 55 + ((i * 7) % 40) // 55..94 m²
    flaecheGesamt += flaeche
    const lage = LAGEN[i % LAGEN.length]
    const wRes = await db
      .prepare('INSERT INTO wohnungen (objekt_id, bezeichnung, lage, flaeche_m2, sort_order) VALUES (?,?,?,?,?)')
      .bind(objektId, `W${i + 1}`, lage, flaeche, i + 1)
      .run()
    const wohnungId = wRes.meta.last_row_id as number
    wohnungIds.push(wohnungId)

    const personen = 1 + (i % 4)
    const vorname = VORNAMEN[i % VORNAMEN.length]
    const nachname = NACHNAMEN[(i * 3) % NACHNAMEN.length]
    const kaltmieteQm = 7.5 + (i % 3) * 0.5
    const kaltmieteMonat = Math.round(flaeche * kaltmieteQm)
    const vorauszahlung = Math.round(flaeche * 2.3 + personen * 15)
    const email = `mieter.${(vorname + nachname).toLowerCase().replace(/[^a-z]/g, '')}${i + 1}@${emailDomain}`

    const mRes = await db
      .prepare(
        `INSERT INTO mieter (wohnung_id, anrede, vorname, nachname, email, telefon, personen, mietbeginn, mietende,
          kaltmiete_qm, kaltmiete_monat, erhoehung_pct, vorauszahlung_nk_monat, aktiv)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)`
      )
      .bind(
        wohnungId, i % 2 === 0 ? 'Herr' : 'Frau', vorname, nachname, email, '',
        personen, `${jahrBasis}-01-01`, null,
        kaltmieteQm, kaltmieteMonat, 0, vorauszahlung
      )
      .run()
    const mieterId = mRes.meta.last_row_id as number
    mieterIds.push(mieterId)

    // Zähler
    const hzRes = await db
      .prepare(`INSERT INTO zaehler (objekt_id, wohnung_id, typ, bezeichnung, einheit, sort_order) VALUES (?,?, 'wmz_heizung', 'Wärmemengenzähler Heizung', 'kWh', ?)`)
      .bind(objektId, wohnungId, i * 10 + 1)
      .run()
    const wwRes = await db
      .prepare(`INSERT INTO zaehler (objekt_id, wohnung_id, typ, bezeichnung, einheit, sort_order) VALUES (?,?, 'warmwasser', 'Warmwasserzähler', 'm³', ?)`)
      .bind(objektId, wohnungId, i * 10 + 2)
      .run()
    const kwRes = await db
      .prepare(`INSERT INTO zaehler (objekt_id, wohnung_id, typ, bezeichnung, einheit, sort_order) VALUES (?,?, 'kaltwasser', 'Kaltwasserzähler', 'm³', ?)`)
      .bind(objektId, wohnungId, i * 10 + 3)
      .run()

    zaehlerMap.push({
      wohnung_id: wohnungId,
      heizung_id: hzRes.meta.last_row_id as number,
      ww_id: wwRes.meta.last_row_id as number,
      kw_id: kwRes.meta.last_row_id as number,
    })
  }

  // Gebäude-Boiler-WMZ (für Gas-Aufteilung Heizung/Warmwasser)
  const boilerRes = await db
    .prepare(`INSERT INTO zaehler (objekt_id, wohnung_id, typ, bezeichnung, einheit, sort_order) VALUES (?, NULL, 'wmz_boiler', 'Boiler-WMZ Warmwasser-Erzeugung (Gas-Zentral)', 'kWh', 0)`)
    .bind(objektId)
    .run()
  const boilerId = boilerRes.meta.last_row_id as number

  // 3. Zählerstände (Basisjahr = 0, dann kumulierend ansteigend über Vorjahr -> aktuelles Jahr) ----
  // Boiler-Zählerstand wird GEBÄUDEWEIT (nicht pro Wohnung) einmal pro Jahr fortgeschrieben,
  // daher zuerst über alle Wohnungen aufsummieren und erst danach je Jahr EINMAL einfügen
  // (sonst UNIQUE-Constraint-Verletzung auf zaehlerstaende(zaehler_id, jahr)).
  let boilerStand = 0
  await db.prepare('INSERT INTO zaehlerstaende (zaehler_id, jahr, stand, ablesedatum) VALUES (?,?,?,?)')
    .bind(boilerId, jahrBasis, boilerStand, `${jahrBasis}-12-31`).run()

  const boilerStandProJahr: Record<number, number> = { [jahrVorjahr]: 0, [jahrAktuell]: 0 }

  for (let idx = 0; idx < zaehlerMap.length; idx++) {
    const z = zaehlerMap[idx]
    const wohnung = { flaeche_m2: 55 + ((idx * 7) % 40) }
    const personen = 1 + (idx % 4)
    await db.prepare('INSERT INTO zaehlerstaende (zaehler_id, jahr, stand, ablesedatum) VALUES (?,?,0,?)').bind(z.heizung_id, jahrBasis, `${jahrBasis}-12-31`).run()
    await db.prepare('INSERT INTO zaehlerstaende (zaehler_id, jahr, stand, ablesedatum) VALUES (?,?,0,?)').bind(z.ww_id, jahrBasis, `${jahrBasis}-12-31`).run()
    await db.prepare('INSERT INTO zaehlerstaende (zaehler_id, jahr, stand, ablesedatum) VALUES (?,?,0,?)').bind(z.kw_id, jahrBasis, `${jahrBasis}-12-31`).run()

    let hzStand = 0
    let wwStand = 0
    let kwStand = 0
    for (const jahr of [jahrVorjahr, jahrAktuell]) {
      const hzVerbrauch = Math.round(wohnung.flaeche_m2 * 14 + idx * 25)
      const wwVerbrauch = Math.round(personen * 22 + idx * 2)
      const kwVerbrauch = Math.round(personen * 16 + idx * 1.5)
      hzStand += hzVerbrauch
      wwStand += wwVerbrauch
      kwStand += kwVerbrauch
      boilerStandProJahr[jahr] += Math.round(wwVerbrauch * 6.2) // Boiler-Verbrauch proportional zu WW (grobe Näherung)
      await db.prepare('INSERT INTO zaehlerstaende (zaehler_id, jahr, stand, ablesedatum) VALUES (?,?,?,?)').bind(z.heizung_id, jahr, hzStand, `${jahr}-12-31`).run()
      await db.prepare('INSERT INTO zaehlerstaende (zaehler_id, jahr, stand, ablesedatum) VALUES (?,?,?,?)').bind(z.ww_id, jahr, wwStand, `${jahr}-12-31`).run()
      await db.prepare('INSERT INTO zaehlerstaende (zaehler_id, jahr, stand, ablesedatum) VALUES (?,?,?,?)').bind(z.kw_id, jahr, kwStand, `${jahr}-12-31`).run()
    }
  }

  // Boiler-Zählerstand kumulierend über die Jahre (Vorjahr -> aktuelles Jahr), je Jahr genau EIN Datensatz
  for (const jahr of [jahrVorjahr, jahrAktuell]) {
    boilerStand += boilerStandProJahr[jahr]
    await db.prepare('INSERT INTO zaehlerstaende (zaehler_id, jahr, stand, ablesedatum) VALUES (?,?,?,?)').bind(boilerId, jahr, boilerStand, `${jahr}-12-31`).run()
  }

  // 4. Kostenarten + Kosten (17 BetrKV-Positionen) ---------------------
  const kostenartIds: Record<number, number> = {}
  for (const ka of KOSTENARTEN_VORLAGE) {
    const res = await db
      .prepare('INSERT INTO kostenarten (objekt_id, nr, bezeichnung, verteilerschluessel, beschreibung, sort_order) VALUES (?,?,?,?,?,?)')
      .bind(objektId, ka.nr, ka.bezeichnung, ka.verteilerschluessel, ka.beschreibung, ka.nr)
      .run()
    kostenartIds[ka.nr] = res.meta.last_row_id as number
  }

  const gesamtbudgetBasis = anzahlWohnungen * 950
  for (const [jahr, faktor] of [[jahrVorjahr, 0.95], [jahrAktuell, 1.0]] as [number, number][]) {
    const budget = gesamtbudgetBasis * faktor
    for (const ka of KOSTENARTEN_VORLAGE) {
      const betrag = ka.gewicht > 0 ? Math.round(budget * ka.gewicht * 100) / 100 : 0
      await db
        .prepare('INSERT INTO kosten (objekt_id, kostenart_id, jahr, betrag) VALUES (?,?,?,?)')
        .bind(objektId, kostenartIds[ka.nr], jahr, betrag)
        .run()
    }
    // Gasabrechnung (deckt Heizung/Warmwasser automatisch ab)
    const gasBetrag = Math.round(anzahlWohnungen * 380 * faktor * 100) / 100
    await db.prepare('INSERT INTO gasabrechnung (objekt_id, jahr, gesamtbetrag) VALUES (?,?,?)').bind(objektId, jahr, gasBetrag).run()
  }

  // 5. Login-Zugänge für Demo-Mieter (optional) -------------------------
  const credentials: { email: string; password: string; name: string }[] = []
  if (createLogins) {
    for (const mieterId of mieterIds) {
      const mieter = await db.prepare('SELECT * FROM mieter WHERE id = ?').bind(mieterId).first<any>()
      const password = randomPassword(10)
      const salt = generateSalt()
      const hash = await hashPassword(password, salt)
      const uname = `${mieter.anrede || ''} ${mieter.vorname || ''} ${mieter.nachname}`.trim()
      await db
        .prepare('INSERT INTO users (email, password_hash, salt, role, mieter_id, name, active) VALUES (?,?,?,?,?,?,1)')
        .bind(mieter.email, hash, salt, 'mieter', mieterId, uname)
        .run()
      credentials.push({ email: mieter.email, password, name: uname })
    }
  }

  // 6. Dokumente automatisch erzeugen (Mietverträge, Übergabeprotokolle, Reinigungsplan) ----
  for (const mieterId of mieterIds) {
    try { await generateAndSaveMietvertrag(db, mieterId) } catch {}
    try { await generateAndSaveWohnungsuebergabe(db, mieterId) } catch {}
  }
  try { await generateAndSaveReinigungsplan(db, objektId, jahrAktuell) } catch {}

  return c.json({
    ok: true,
    objekt_id: objektId,
    anzahl_wohnungen: anzahlWohnungen,
    jahre: [jahrVorjahr, jahrAktuell],
    credentials,
  })
})
