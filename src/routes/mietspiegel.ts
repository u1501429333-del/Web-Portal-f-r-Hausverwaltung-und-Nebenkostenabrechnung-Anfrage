import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export const mietspiegelRoutes = new Hono<{ Bindings: Bindings }>()

// Liste aller bisherigen Mietspiegel-Ausgaben (Historie)
mietspiegelRoutes.get('/ausgaben', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM mietspiegel_ausgaben ORDER BY stichtag DESC'
  ).all()
  return c.json(rows.results)
})

// Die aktuell gültige Ausgabe inkl. aller Tabellenwerte
mietspiegelRoutes.get('/aktuell', async (c) => {
  const ausgabe = await c.env.DB
    .prepare('SELECT * FROM mietspiegel_ausgaben WHERE ist_aktuell = 1 ORDER BY stichtag DESC LIMIT 1')
    .first()
  if (!ausgabe) return c.json({ ausgabe: null, werte: [] })
  const werte = await c.env.DB
    .prepare('SELECT * FROM mietspiegel_werte WHERE ausgabe_id = ? ORDER BY sort_order, baualtersklasse, groessenklasse')
    .bind((ausgabe as any).id)
    .all()
  return c.json({ ausgabe, werte: werte.results })
})

// Die für ein bestimmtes Kalenderjahr gültige Ausgabe (z.B. jahr=2025 -> Ausgabe Stand 2024,
// jahr=2026 -> Ausgabe Stand 2026). Ermittelt anhand stichtag/gueltig_bis.
mietspiegelRoutes.get('/jahr/:jahr', async (c) => {
  const jahr = parseInt(c.req.param('jahr'), 10)
  if (!jahr) return c.json({ error: 'Ungültiges Jahr' }, 400)
  const stichtagVergleich = `${jahr}-12-31`
  const ausgabe = await c.env.DB
    .prepare(
      `SELECT * FROM mietspiegel_ausgaben
       WHERE stichtag <= ?
         AND (gueltig_bis IS NULL OR gueltig_bis >= ?)
       ORDER BY stichtag DESC LIMIT 1`
    )
    .bind(stichtagVergleich, `${jahr}-01-01`)
    .first()
  if (!ausgabe) return c.json({ error: `Keine Mietspiegel-Ausgabe für ${jahr} gefunden`, jahr }, 404)
  const werte = await c.env.DB
    .prepare('SELECT * FROM mietspiegel_werte WHERE ausgabe_id = ? ORDER BY sort_order, baualtersklasse, groessenklasse')
    .bind((ausgabe as any).id)
    .all()
  return c.json({ jahr, ausgabe, werte: werte.results })
})

// Werte + Ausgabe zu einer bestimmten Ausgabe-ID (für Historie/Vergleich)
mietspiegelRoutes.get('/ausgaben/:id', async (c) => {
  const id = c.req.param('id')
  const ausgabe = await c.env.DB.prepare('SELECT * FROM mietspiegel_ausgaben WHERE id = ?').bind(id).first()
  if (!ausgabe) return c.json({ error: 'Ausgabe nicht gefunden' }, 404)
  const werte = await c.env.DB
    .prepare('SELECT * FROM mietspiegel_werte WHERE ausgabe_id = ? ORDER BY sort_order, baualtersklasse, groessenklasse')
    .bind(id)
    .all()
  return c.json({ ausgabe, werte: werte.results })
})

// Einfache Einordnungshilfe: anhand Baujahr + Wohnungsgröße die passende
// Baualtersklasse/Größenklasse der aktuellen Ausgabe ermitteln und die
// Nettokaltmiete-Spanne (€/m²) für 'normal'/'besonders' x 'mittel'/'gut' zurückgeben.
mietspiegelRoutes.get('/einordnung', async (c) => {
  const baujahr = parseInt(c.req.query('baujahr') || '', 10)
  const groesseM2 = parseFloat(c.req.query('groesse_m2') || '')
  const abrechnungsjahr = parseInt(c.req.query('jahr') || '', 10) || null
  if (!baujahr || !groesseM2) {
    return c.json({ error: 'Parameter baujahr und groesse_m2 erforderlich' }, 400)
  }

  // Wenn ein Abrechnungsjahr angegeben ist: die für dieses Jahr gültige Ausgabe
  // verwenden (z.B. 2025 -> Ausgabe Stand 2024). Sonst: aktuell gültige Ausgabe.
  let ausgabe: any
  if (abrechnungsjahr) {
    ausgabe = await c.env.DB
      .prepare(
        `SELECT * FROM mietspiegel_ausgaben
         WHERE stichtag <= ? AND (gueltig_bis IS NULL OR gueltig_bis >= ?)
         ORDER BY stichtag DESC LIMIT 1`
      )
      .bind(`${abrechnungsjahr}-12-31`, `${abrechnungsjahr}-01-01`)
      .first()
  } else {
    ausgabe = await c.env.DB
      .prepare('SELECT * FROM mietspiegel_ausgaben WHERE ist_aktuell = 1 ORDER BY stichtag DESC LIMIT 1')
      .first()
  }
  if (!ausgabe) return c.json({ error: 'Keine passende Mietspiegel-Ausgabe hinterlegt', abrechnungsjahr }, 404)

  const alleWerte = (
    await c.env.DB
      .prepare('SELECT * FROM mietspiegel_werte WHERE ausgabe_id = ?')
      .bind((ausgabe as any).id)
      .all()
  ).results as any[]

  // Baualtersklasse bestimmen (Bereichsgrenzen aus baujahr_von/baujahr_bis)
  const passendeBaujahre = alleWerte.filter((w) => {
    const von = w.baujahr_von
    const bis = w.baujahr_bis
    if (von == null && bis != null) return baujahr <= bis
    if (von != null && bis == null) return baujahr >= von
    if (von != null && bis != null) return baujahr >= von && baujahr <= bis
    return false
  })
  if (passendeBaujahre.length === 0) {
    return c.json({ error: 'Kein passender Baualtersklassen-Bereich gefunden', ausgabe }, 404)
  }
  const baualtersklasse = passendeBaujahre[0].baualtersklasse

  // Nächstliegende Größenklasse ermitteln (kleinster Abstand zur Bezugsgröße)
  const groessenOptionen = Array.from(new Set(alleWerte.map((w) => w.groesse_m2_bezug))).sort(
    (a, b) => a - b
  )
  const naechsteGroesse = groessenOptionen.reduce((best, g) =>
    Math.abs(g - groesseM2) < Math.abs(best - groesseM2) ? g : best
  )

  const treffer = alleWerte.filter(
    (w) => w.baualtersklasse === baualtersklasse && w.groesse_m2_bezug === naechsteGroesse
  )

  return c.json({
    ausgabe,
    baujahr,
    groesse_m2: groesseM2,
    baualtersklasse,
    groessenklasse_bezug: naechsteGroesse,
    werte: treffer,
  })
})
