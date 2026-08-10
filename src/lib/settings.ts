// ============================================================
// Globale Einstellungen (Branding, HeizkostenV-Konfiguration, PIN-Schutz,
// Erinnerungsfristen) - alle in der Key-Value-Tabelle "einstellungen"
// ============================================================
import type { Branding, Einstellungen } from './types'

const DEFAULTS: Record<string, string> = {
  app_name: 'UHV-Web-Portal',
  logo_data_url: '',
  heizkosten_verbrauch_anteil: '0.7',
  zuschlag_9a_pct: '0',
  pin_schutz_aktiv: '0',
  pin_code: '',
  erinnerung_ablesung_tage_vorher: '14',
  erinnerung_abrechnung_frist_monate: '12',
  vermieter_email_steuerberater: '',
}

async function getAllRaw(db: D1Database): Promise<Record<string, string>> {
  const rows = await db.prepare('SELECT key, value FROM einstellungen').all<{ key: string; value: string }>()
  const map: Record<string, string> = { ...DEFAULTS }
  for (const r of rows.results as any[]) map[r.key] = r.value
  return map
}

export async function getBranding(db: D1Database): Promise<Branding> {
  const map = await getAllRaw(db)
  return {
    app_name: map.app_name || 'UHV-Web-Portal',
    logo_data_url: map.logo_data_url || '',
  }
}

export async function setBranding(db: D1Database, b: Partial<Branding>): Promise<void> {
  if (b.app_name !== undefined) await setKey(db, 'app_name', b.app_name)
  if (b.logo_data_url !== undefined) await setKey(db, 'logo_data_url', b.logo_data_url)
}

export async function getEinstellungen(db: D1Database): Promise<Einstellungen> {
  const map = await getAllRaw(db)
  return {
    app_name: map.app_name || 'UHV-Web-Portal',
    logo_data_url: map.logo_data_url || '',
    heizkosten_verbrauch_anteil: Number(map.heizkosten_verbrauch_anteil) || 0.7,
    zuschlag_9a_pct: Number(map.zuschlag_9a_pct) || 0,
    pin_schutz_aktiv: map.pin_schutz_aktiv === '1',
    pin_code: map.pin_code || '',
    erinnerung_ablesung_tage_vorher: Number(map.erinnerung_ablesung_tage_vorher) || 14,
    erinnerung_abrechnung_frist_monate: Number(map.erinnerung_abrechnung_frist_monate) || 12,
    vermieter_email_steuerberater: map.vermieter_email_steuerberater || '',
  }
}

async function setKey(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(`INSERT INTO einstellungen (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`)
    .bind(key, value)
    .run()
}

export async function setEinstellungen(db: D1Database, b: Partial<Einstellungen>): Promise<void> {
  if (b.app_name !== undefined) await setKey(db, 'app_name', b.app_name)
  if (b.logo_data_url !== undefined) await setKey(db, 'logo_data_url', b.logo_data_url)
  if (b.heizkosten_verbrauch_anteil !== undefined) {
    // HeizkostenV §7 erlaubt 50-70% verbrauchsabhängig; Rest ist Grundkostenanteil nach Fläche
    let v = Number(b.heizkosten_verbrauch_anteil)
    if (Number.isNaN(v)) v = 0.7
    v = Math.min(0.7, Math.max(0.5, v))
    await setKey(db, 'heizkosten_verbrauch_anteil', String(v))
  }
  if (b.zuschlag_9a_pct !== undefined) {
    let v = Number(b.zuschlag_9a_pct)
    if (Number.isNaN(v) || v < 0) v = 0
    if (v > 15) v = 15 // §9a: übliche Praxis-Obergrenze, Sicherheitslimit
    await setKey(db, 'zuschlag_9a_pct', String(v))
  }
  if (b.pin_schutz_aktiv !== undefined) await setKey(db, 'pin_schutz_aktiv', b.pin_schutz_aktiv ? '1' : '0')
  if (b.pin_code !== undefined) await setKey(db, 'pin_code', b.pin_code)
  if (b.erinnerung_ablesung_tage_vorher !== undefined) await setKey(db, 'erinnerung_ablesung_tage_vorher', String(Number(b.erinnerung_ablesung_tage_vorher) || 14))
  if (b.erinnerung_abrechnung_frist_monate !== undefined) await setKey(db, 'erinnerung_abrechnung_frist_monate', String(Number(b.erinnerung_abrechnung_frist_monate) || 12))
  if (b.vermieter_email_steuerberater !== undefined) await setKey(db, 'vermieter_email_steuerberater', b.vermieter_email_steuerberater)
}

/** Rendert das Logo (falls vorhanden) als <img> für Dokumenten-Briefköpfe */
export function logoImgTag(branding: Branding, maxHeight = 58): string {
  if (!branding.logo_data_url) return ''
  return `<img src="${branding.logo_data_url}" alt="Logo" style="max-height:${maxHeight}px;max-width:200px;object-fit:contain;" />`
}
