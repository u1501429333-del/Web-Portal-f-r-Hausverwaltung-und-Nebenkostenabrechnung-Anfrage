import { Hono } from 'hono'
import type { AppContext } from '../lib/types'
import { requireAdmin } from './auth'
import { generateSalt, hashPassword } from '../lib/auth'

export const mieterRoutes = new Hono<AppContext>()

mieterRoutes.get('/:id', async (c) => {
  const session = c.get('session')
  const id = c.req.param('id')
  // Mieter dürfen nur ihre eigenen Daten sehen
  if (session?.role === 'mieter' && session.mieterId !== Number(id)) {
    return c.json({ error: 'Keine Berechtigung' }, 403)
  }
  const row = await c.env.DB.prepare('SELECT * FROM mieter WHERE id = ?').bind(id).first()
  if (!row) return c.json({ error: 'Nicht gefunden' }, 404)
  return c.json(row)
})

mieterRoutes.put('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const b = await c.req.json<any>()
  await c.env.DB.prepare(
    `UPDATE mieter SET anrede=?, vorname=?, nachname=?, email=?, telefon=?, personen=?, mietbeginn=?, mietende=?,
      kaltmiete_qm=?, kaltmiete_monat=?, erhoehung_pct=?, vorauszahlung_nk_monat=?, iban=?, kontoinhaber=?, aktiv=?,
      stellplatz_vorhanden=?, stellplatz_nr=?, stellplatz_miete=?, garage_vorhanden=?, garage_nr=?, garage_miete=?,
      keller_vorhanden=?, keller_nr=?, garten_vorhanden=?, garten_beschreibung=?,
      anzahl_hausschluessel=?, anzahl_briefkastenschluessel=?, sonstige_schluessel=?
     WHERE id=?`
  )
    .bind(
      b.anrede || '', b.vorname || '', b.nachname || '', b.email || '', b.telefon || '',
      b.personen || 1, b.mietbeginn || null, b.mietende || null,
      b.kaltmiete_qm || 0, b.kaltmiete_monat || 0, b.erhoehung_pct || 0, b.vorauszahlung_nk_monat || 0,
      b.iban || '', b.kontoinhaber || '', b.aktiv ?? 1,
      b.stellplatz_vorhanden ? 1 : 0, b.stellplatz_nr || '', b.stellplatz_miete || 0,
      b.garage_vorhanden ? 1 : 0, b.garage_nr || '', b.garage_miete || 0,
      b.keller_vorhanden ? 1 : 0, b.keller_nr || '',
      b.garten_vorhanden ? 1 : 0, b.garten_beschreibung || '',
      b.anzahl_hausschluessel || 0, b.anzahl_briefkastenschluessel || 0, b.sonstige_schluessel || '',
      id
    )
    .run()
  return c.json({ ok: true })
})

mieterRoutes.delete('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM mieter WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// ============================================================
// Login-Zugang für Mieter erstellen / verwalten (Fix: "Mieter einladen")
// ============================================================

function randomPassword(len = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length]
  return out
}

// Status: existiert bereits ein Login für diesen Mieter?
mieterRoutes.get('/:id/login-status', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const user = await c.env.DB.prepare('SELECT id, email, active FROM users WHERE mieter_id = ?').bind(id).first<any>()
  return c.json({ has_login: !!user, email: user?.email || null, active: user ? !!user.active : null })
})

// Neuen Login-Zugang anlegen (oder vorhandenen aktualisieren, falls doch schon einer existiert)
mieterRoutes.post('/:id/create-login', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const b = await c.req.json<any>().catch(() => ({}))

  const mieter = await c.env.DB.prepare('SELECT * FROM mieter WHERE id = ?').bind(id).first<any>()
  if (!mieter) return c.json({ error: 'Mieter nicht gefunden' }, 404)

  const email = (b.email || mieter.email || '').trim().toLowerCase()
  if (!email) return c.json({ error: 'Es ist keine E-Mail-Adresse hinterlegt. Bitte zuerst beim Mieter eine E-Mail eintragen oder hier angeben.' }, 400)

  // Ist die E-Mail bereits von einem ANDEREN Benutzer belegt?
  const existingByEmail = await c.env.DB.prepare('SELECT id, mieter_id FROM users WHERE email = ?').bind(email).first<any>()
  if (existingByEmail && existingByEmail.mieter_id !== id) {
    return c.json({ error: `Die E-Mail-Adresse "${email}" wird bereits für einen anderen Benutzer verwendet.` }, 400)
  }

  const password = (b.password && String(b.password).length >= 6) ? String(b.password) : randomPassword(10)
  const salt = generateSalt()
  const hash = await hashPassword(password, salt)
  const name = `${mieter.anrede || ''} ${mieter.vorname || ''} ${mieter.nachname}`.trim()

  const existingForMieter = await c.env.DB.prepare('SELECT id FROM users WHERE mieter_id = ?').bind(id).first<any>()

  if (existingForMieter) {
    await c.env.DB.prepare('UPDATE users SET email=?, password_hash=?, salt=?, name=?, active=1 WHERE id=?')
      .bind(email, hash, salt, name, existingForMieter.id)
      .run()
  } else {
    await c.env.DB.prepare('INSERT INTO users (email, password_hash, salt, role, mieter_id, name, active) VALUES (?,?,?,?,?,?,1)')
      .bind(email, hash, salt, 'mieter', id, name)
      .run()
  }

  // Mieter-E-Mail nachpflegen, falls beim Mieter noch keine hinterlegt war
  if (!mieter.email && email) {
    await c.env.DB.prepare('UPDATE mieter SET email=? WHERE id=?').bind(email, id).run()
  }

  return c.json({ ok: true, email, password })
})

// Neues (zufälliges oder vorgegebenes) Passwort für bereits bestehenden Zugang vergeben
mieterRoutes.post('/:id/reset-password', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const b = await c.req.json<any>().catch(() => ({}))

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE mieter_id = ?').bind(id).first<any>()
  if (!user) return c.json({ error: 'Für diesen Mieter existiert noch kein Login-Zugang.' }, 404)

  const password = (b.password && String(b.password).length >= 6) ? String(b.password) : randomPassword(10)
  const salt = generateSalt()
  const hash = await hashPassword(password, salt)

  await c.env.DB.prepare('UPDATE users SET password_hash=?, salt=?, active=1 WHERE id=?').bind(hash, salt, user.id).run()

  return c.json({ ok: true, email: user.email, password })
})
