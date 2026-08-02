// Generiert INSERT-Statements für Demo-User mit PBKDF2-Hash (kompatibel zu src/lib/auth.ts)
import { webcrypto as crypto } from 'crypto'

const PBKDF2_ITERATIONS = 100_000
const KEY_LENGTH = 32

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return bytes
}
function generateSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return bufToHex(bytes.buffer)
}
async function hashPassword(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBuf(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH * 8
  )
  return bufToHex(derived)
}

const users = [
  { email: 'admin@hausverwaltung.de', password: 'admin123', role: 'admin', mieter_id: null, name: 'Hausverwaltung Admin' },
  { email: 'mieter1@example.com', password: 'mieter123', role: 'mieter', mieter_id: 1, name: 'Beispiel-Mieter 1' },
  { email: 'mieter2@example.com', password: 'mieter123', role: 'mieter', mieter_id: 2, name: 'Beispiel-Mieter 2' },
  { email: 'mieter3@example.com', password: 'mieter123', role: 'mieter', mieter_id: 3, name: 'Beispiel-Mieter 3' },
  { email: 'mieter4@example.com', password: 'mieter123', role: 'mieter', mieter_id: 4, name: 'Beispiel-Mieter 4' },
  { email: 'mieter5@example.com', password: 'mieter123', role: 'mieter', mieter_id: 5, name: 'Beispiel-Mieter 5' },
  { email: 'mieter6@example.com', password: 'mieter123', role: 'mieter', mieter_id: 6, name: 'Beispiel-Mieter 6' },
]

let sql = '-- Auto-generiert von scripts/gen_seed_users.mjs\n'
for (const u of users) {
  const salt = generateSalt()
  const hash = await hashPassword(u.password, salt)
  const mieterVal = u.mieter_id === null ? 'NULL' : u.mieter_id
  sql += `INSERT INTO users (email, password_hash, salt, role, mieter_id, name) VALUES ('${u.email}', '${hash}', '${salt}', '${u.role}', ${mieterVal}, '${u.name.replace(/'/g, "''")}');\n`
}

console.log(sql)
