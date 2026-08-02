// ============================================================
// Auth-Hilfsfunktionen: Passwort-Hashing (PBKDF2/WebCrypto) & Session-Tokens
// Läuft vollständig auf Cloudflare Workers Web Crypto API (kein Node "crypto")
// ============================================================

const PBKDF2_ITERATIONS = 100_000
const HASH_ALGO = 'SHA-256'
const KEY_LENGTH = 32 // bytes

function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return bufToHex(bytes.buffer)
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBuf(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    KEY_LENGTH * 8
  )
  return bufToHex(derived)
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const actual = await hashPassword(password, salt)
  // Konstante-Zeit-Vergleich (einfach genug für diesen Zweck)
  if (actual.length !== expectedHash.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i)
  }
  return diff === 0
}

// ---- Session-Token: signiertes, zeitlich begrenztes Token (HMAC-SHA256) ----

export interface SessionPayload {
  uid: number
  role: 'admin' | 'mieter'
  mieterId?: number | null
  exp: number // unix seconds
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

function b64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(str: string): string {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4))
  return atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad)
}

export async function createSessionToken(payload: SessionPayload, secret: string): Promise<string> {
  const body = b64urlEncode(JSON.stringify(payload))
  const key = await hmacKey(secret)
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const sig = b64urlEncode(bufToHex(sigBuf))
  return `${body}.${sig}`
}

export async function verifySessionToken(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const [body, sig] = token.split('.')
    if (!body || !sig) return null
    const key = await hmacKey(secret)
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
    const expectedSig = b64urlEncode(bufToHex(sigBuf))
    if (expectedSig !== sig) return null
    const payload: SessionPayload = JSON.parse(b64urlDecode(body))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
