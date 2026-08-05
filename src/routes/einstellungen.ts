import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'
import { getBranding, setBranding } from '../lib/settings'

export const einstellungenRoutes = new Hono<AppContext>()

// Öffentlich lesbar (wird auch auf der Login-Seite / Sidebar angezeigt)
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
