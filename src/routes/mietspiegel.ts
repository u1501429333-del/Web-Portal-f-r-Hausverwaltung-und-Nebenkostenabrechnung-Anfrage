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
  if (!baujahr || !groesseM2) {
    return c.json({ error: 'Parameter baujahr und groesse_m2 erforderlich' }, 400)
  }
  const ausgabe = await c.env.DB
    .prepare('SELECT * FROM mietspiegel_ausgaben WHERE ist_aktuell = 1 ORDER BY stichtag DESC LIMIT 1')
    .first()
  if (!ausgabe) return c.json({ error: 'Keine aktuelle Mietspiegel-Ausgabe hinterlegt' }, 404)

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
