// ============================================================
// Zentrale Typdefinitionen
// ============================================================

export type Bindings = {
  DB: D1Database
  SESSION_SECRET?: string
}

export type AppContext = {
  Bindings: Bindings
  Variables: {
    session?: { uid: number; role: 'admin' | 'mieter'; mieterId?: number | null }
  }
}

export interface Objekt {
  id: number
  name: string
  strasse: string
  plz: string
  ort: string
  land: string
  vermieter_name: string
  vermieter_strasse: string
  vermieter_plz_ort: string
  vermieter_telefon: string
  vermieter_email: string
  bank_name: string
  iban: string
  bic: string
  steuernummer: string
}

export interface Wohnung {
  id: number
  objekt_id: number
  bezeichnung: string
  lage: string
  flaeche_m2: number
  sort_order: number
}

export interface Mieter {
  id: number
  wohnung_id: number
  anrede: string
  vorname: string
  nachname: string
  email: string
  telefon: string
  personen: number
  mietbeginn: string | null
  mietende: string | null
  kaltmiete_qm: number
  kaltmiete_monat: number
  erhoehung_pct: number
  vorauszahlung_nk_monat: number
  iban: string
  kontoinhaber: string
  aktiv: number
  stellplatz_vorhanden?: number
  stellplatz_nr?: string
  stellplatz_miete?: number
  garage_vorhanden?: number
  garage_nr?: string
  garage_miete?: number
  keller_vorhanden?: number
  keller_nr?: string
  garten_vorhanden?: number
  garten_beschreibung?: string
  anzahl_hausschluessel?: number
  anzahl_briefkastenschluessel?: number
  sonstige_schluessel?: string
}

export interface Branding {
  app_name: string
  logo_data_url: string
}

export interface Einstellungen extends Branding {
  heizkosten_verbrauch_anteil: number // HeizkostenV §7: 0.5 - 0.7 (Anteil verbrauchsabhängig, Rest = Grundkosten nach Fläche)
  zuschlag_9a_pct: number // §9a HeizkostenV Nichtabrechnungs-Zuschlag in % (0 = deaktiviert)
  pin_schutz_aktiv: boolean
  pin_code: string
  erinnerung_ablesung_tage_vorher: number
  erinnerung_abrechnung_frist_monate: number
  vermieter_email_steuerberater: string
}

export type SchadenPrioritaet = 'hoch' | 'mittel' | 'niedrig'
export type SchadenStatus = 'offen' | 'in_bearbeitung' | 'erledigt'

export interface Schadensmeldung {
  id: number
  objekt_id: number
  wohnung_id: number
  mieter_id: number | null
  titel: string
  beschreibung: string
  raum: string
  prioritaet: SchadenPrioritaet
  status: SchadenStatus
  admin_notiz: string
  erstellt_am: string
  aktualisiert_am: string
}

export interface Unterlage {
  id: number
  objekt_id: number | null
  wohnung_id: number | null
  mieter_id: number | null
  ordner: string
  dateiname: string
  content_type: string
  data_url: string
  groesse_bytes: number
  hochgeladen_von: string
  beschreibung: string
  erstellt_am: string
}

export type ZaehlerTyp = 'wmz_heizung' | 'wmz_boiler' | 'warmwasser' | 'kaltwasser' | 'sonstige'

export interface Zaehler {
  id: number
  objekt_id: number
  wohnung_id: number | null
  typ: ZaehlerTyp
  ebene: string
  bezeichnung: string
  einheit: string
  seriennummer: string
  sort_order: number
}

export interface Zaehlerstand {
  id: number
  zaehler_id: number
  jahr: number
  ablesedatum: string | null
  stand: number
  quelle: string
  notiz: string
}

export type Verteilerschluessel =
  | 'flaeche'
  | 'personen'
  | 'einheiten'
  | 'wasser_verbrauch'
  | 'heizung_30_70'
  | 'warmwasser_30_70'
  | 'individuell'

export interface Kostenart {
  id: number
  objekt_id: number
  nr: number
  bezeichnung: string
  verteilerschluessel: Verteilerschluessel
  beschreibung: string
  sort_order: number
  aktiv: number
}

export interface KostenEintrag {
  id: number
  objekt_id: number
  kostenart_id: number
  jahr: number
  betrag: number
}
