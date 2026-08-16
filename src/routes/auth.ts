import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import type { AppContext } from '../lib/types'
import { verifyPassword, createSessionToken, verifySessionToken } from '../lib/auth'

export const authRoutes = new Hono<AppContext>()

const SESSION_COOKIE = 'hv_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 Tage

function getSecret(c: any): string {
  return c.env.SESSION_SECRET || 'dev-insecure-secret-change-me'
}

// Das "Secure"-Cookie-Attribut sagt dem Browser: "Nur ueber HTTPS senden".
// Auf Cloudflare Pages ist die eingehende Verbindung immer HTTPS, daher dort
// secure=true. Beim Self-Hosting (z.B. Docker auf einer TV-Box) laeuft die
// App aber typischerweise ohne eigenes TLS-Zertifikat einfach ueber
// http://<lan-ip>:3000 - mit secure=true wuerde der Browser das Cookie dann
// STILLSCHWEIGEND verwerfen, wodurch jeder Login sofort wieder als "nicht
// angemeldet" erscheint (Fehler "Keine Berechtigung"). Wir erkennen das
// tatsaechliche Protokoll daher automatisch aus der Request-URL bzw. dem von
// Reverse-Proxies gesetzten "X-Forwarded-Proto"-Header.
function isSecureRequest(c: any): boolean {
  const forwardedProto = c.req.header('x-forwarded-proto')
  if (forwardedProto) return forwardedProto.split(',')[0].trim().toLowerCase() === 'https'
  try {
    return new URL(c.req.url).protocol === 'https:'
  } catch {
    return false
  }
}

authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}))
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  if (!email || !password) {
    return c.json({ error: 'E-Mail und Passwort erforderlich' }, 400)
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND active = 1')
    .bind(email)
    .first<any>()

  if (!user) return c.json({ error: 'Ungültige Anmeldedaten' }, 401)

  const ok = await verifyPassword(password, user.salt, user.password_hash)
  if (!ok) return c.json({ error: 'Ungültige Anmeldedaten' }, 401)

  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const token = await createSessionToken(
    { uid: user.id, role: user.role, mieterId: user.mieter_id ?? null, exp },
    getSecret(c)
  )

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(c),
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })

  return c.json({
    ok: true,
    user: { id: user.id, email: user.email, role: user.role, name: user.name, mieterId: user.mieter_id },
  })
})

authRoutes.post('/logout', async (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
  return c.json({ ok: true })
})

authRoutes.get('/me', async (c) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return c.json({ user: null })
  const payload = await verifySessionToken(token, getSecret(c))
  if (!payload) return c.json({ user: null })

  const user = await c.env.DB.prepare('SELECT id, email, role, name, mieter_id FROM users WHERE id = ? AND active = 1')
    .bind(payload.uid)
    .first<any>()
  if (!user) return c.json({ user: null })

  return c.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, mieterId: user.mieter_id } })
})

// Middleware: Session prüfen und in Context ablegen
export async function sessionMiddleware(c: any, next: any) {
  const token = getCookie(c, SESSION_COOKIE)
  if (token) {
    const payload = await verifySessionToken(token, getSecret(c))
    if (payload) {
      c.set('session', payload)
    }
  }
  await next()
}

export async function requireAuth(c: any, next: any) {
  const session = c.get('session')
  if (!session) return c.json({ error: 'Nicht angemeldet' }, 401)
  await next()
}

export async function requireAdmin(c: any, next: any) {
  const session = c.get('session')
  if (!session || session.role !== 'admin') return c.json({ error: 'Keine Berechtigung' }, 403)
  await next()
}
