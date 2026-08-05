// ============================================================
// Globale Einstellungen (App-Branding: Name & Logo)
// ============================================================
import type { Branding } from './types'

export async function getBranding(db: D1Database): Promise<Branding> {
  const rows = await db.prepare('SELECT key, value FROM einstellungen').all<{ key: string; value: string }>()
  const map: Record<string, string> = {}
  for (const r of rows.results as any[]) map[r.key] = r.value
  return {
    app_name: map.app_name || 'Hausverwaltung Portal',
    logo_data_url: map.logo_data_url || '',
  }
}

export async function setBranding(db: D1Database, b: Partial<Branding>): Promise<void> {
  if (b.app_name !== undefined) {
    await db
      .prepare(`INSERT INTO einstellungen (key, value) VALUES ('app_name', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`)
      .bind(b.app_name)
      .run()
  }
  if (b.logo_data_url !== undefined) {
    await db
      .prepare(`INSERT INTO einstellungen (key, value) VALUES ('logo_data_url', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`)
      .bind(b.logo_data_url)
      .run()
  }
}

/** Rendert das Logo (falls vorhanden) als <img> für Dokumenten-Briefköpfe */
export function logoImgTag(branding: Branding, maxHeight = 58): string {
  if (!branding.logo_data_url) return ''
  return `<img src="${branding.logo_data_url}" alt="Logo" style="max-height:${maxHeight}px;max-width:200px;object-fit:contain;" />`
}
