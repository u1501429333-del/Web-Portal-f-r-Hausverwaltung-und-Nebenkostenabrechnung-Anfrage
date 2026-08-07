import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'
import { getBranding, setBranding, getEinstellungen, setEinstellungen } from '../lib/settings'

export const einstellungenRoutes = new Hono<AppContext>()

// Öffentlich lesbar (wird auch auf der Login-Seite / Sidebar angezeigt) - nur Branding, keine sensiblen Werte
einstellungenRoutes.get('/', async (c) => {
  const branding = await getBranding(c.env.DB)
  return c.json(branding)
})

// Nur Admin darf App-Name / Logo ändern (Stammdaten)
einstellungenRoutes.put('/', requireAdmin, async (c) => {
  const b = await c.req.json<any>()
  // Einfache Größenprüfung für das Logo (Base64 Data-URL), um die DB nicht zu überlasten (~700 KB Rohdaten)
  if (b.logo_data_url && b.logo_data_url.length > 900_000) {
    return c.json({ error: 'Logo ist zu groß (max. ca. 650 KB). Bitte kleineres Bild wählen.' }, 400)
  }
  await setBranding(c.env.DB, { app_name: b.app_name, logo_data_url: b.logo_data_url })
  const branding = await getBranding(c.env.DB)
  return c.json(branding)
})

// -------- Erweiterte Einstellungen (nur Admin: Heizungsanteil, §9a-Zuschlag, PIN-Schutz, Fristen) --------
einstellungenRoutes.get('/erweitert', requireAdmin, async (c) => {
  const e = await getEinstellungen(c.env.DB)
  // PIN nicht im Klartext zurückgeben, nur ob gesetzt
  return c.json({ ...e, pin_code: undefined, pin_gesetzt: !!e.pin_code })
})

einstellungenRoutes.put('/erweitert', requireAdmin, async (c) => {
  const b = await c.req.json<any>()
  await setEinstellungen(c.env.DB, {
    heizkosten_verbrauch_anteil: b.heizkosten_verbrauch_anteil,
    zuschlag_9a_pct: b.zuschlag_9a_pct,
    pin_schutz_aktiv: b.pin_schutz_aktiv,
    pin_code: b.pin_code !== undefined && b.pin_code !== '' ? b.pin_code : undefined,
    erinnerung_ablesung_tage_vorher: b.erinnerung_ablesung_tage_vorher,
    erinnerung_abrechnung_frist_monate: b.erinnerung_abrechnung_frist_monate,
    vermieter_email_steuerberater: b.vermieter_email_steuerberater,
  })
  const e = await getEinstellungen(c.env.DB)
  return c.json({ ...e, pin_code: undefined, pin_gesetzt: !!e.pin_code })
})

// PIN-Verifikation (für den Zusatzschutz vor sensiblen Admin-Bereichen)
einstellungenRoutes.post('/pin-verify', requireAdmin, async (c) => {
  const b = await c.req.json<any>().catch(() => ({}))
  const e = await getEinstellungen(c.env.DB)
  if (!e.pin_schutz_aktiv || !e.pin_code) return c.json({ ok: true, required: false })
  const ok = String(b.pin || '') === e.pin_code
  return c.json({ ok, required: true })
})
