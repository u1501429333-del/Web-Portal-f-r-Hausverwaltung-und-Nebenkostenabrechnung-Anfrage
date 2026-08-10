// ============================================================
// Dokumenten-Generator: Mietvertrag, Hausordnung, Treppenreinigungsplan, Wohnungsübergabe
// Erzeugt druckfertiges HTML (wird im Browser per "Drucken -> Als PDF speichern" exportiert)
// ============================================================

import type { Objekt, Wohnung, Mieter, Branding } from './types'
import { logoImgTag } from './settings'

function fmtDate(d: string | null | undefined): string {
  if (!d) return '_______________'
  const dt = new Date(d + 'T00:00:00Z')
  return dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtEuro(n: number): string {
  return (n ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

const emptyBranding: Branding = { app_name: 'UHV-Web-Portal', logo_data_url: '' }

const baseStyles = `
  <style>
    @page { size: A4; margin: 20mm 18mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; font-size: 12.5px; line-height: 1.55; margin:0; }
    .doc-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 8px; }
    .doc-header .title-block { flex:1; }
    h1 { font-size: 19px; color: #0f172a; margin: 0 0 4px 0; }
    h2 { font-size: 14.5px; color: #1e40af; margin-top: 22px; margin-bottom: 8px; border-left: 4px solid #2563eb; padding-left: 8px;}
    p { margin: 6px 0; }
    .meta { color:#64748b; font-size: 11px; margin-bottom: 16px; }
    table { width:100%; border-collapse: collapse; margin: 8px 0 14px; }
    td, th { padding: 5px 8px; border: 1px solid #d1d9e6; vertical-align: top; }
    th { background:#eff4ff; text-align:left; font-weight:600;}
    .sig-row { display:flex; justify-content: space-between; margin-top: 46px; }
    .sig-box { width: 45%; border-top: 1px solid #333; padding-top: 4px; font-size: 11px; text-align:center;}
    .small { font-size: 10.5px; color:#6b7280; }
    .paragraf { font-weight:600; }
    ol.clauses > li { margin-bottom: 10px; }
    .footer-note { margin-top: 26px; font-size: 10px; color:#94a3b8; border-top:1px dashed #cbd5e1; padding-top:8px;}
    .badge { display:inline-block; background:#dbeafe; color:#1e3a8a; padding:2px 8px; border-radius:4px; font-size:10.5px; font-weight:600;}
    .blank-line { display:inline-block; min-width:120px; border-bottom:1px solid #94a3b8; }
    .fill-box { border:1px solid #cbd5e1; border-radius:4px; min-height: 20px; padding: 4px 6px; background:#f8fafc; }
    tr.month-sep td { background:#1e40af; color:#fff; font-weight:700; text-align:center; }
    @media print { .no-print { display:none; } }
  </style>
`

function docHeader(title: string, subline: string, branding: Branding = emptyBranding): string {
  return `<div class="doc-header">
    <div class="title-block">
      <h1>${title}</h1>
      <p class="meta">${subline}</p>
    </div>
    ${branding.logo_data_url ? `<div style="text-align:right;">${logoImgTag(branding, 60)}<div style="font-size:9.5px;color:#64748b;margin-top:2px;">${branding.app_name || ''}</div></div>` : `<div style="text-align:right;font-size:11px;font-weight:700;color:#1e40af;">${branding.app_name || ''}</div>`}
  </div>`
}

export function generateMietvertrag(objekt: Objekt, wohnung: Wohnung, mieter: Mieter, branding: Branding = emptyBranding): string {
  const kaltmiete = mieter.kaltmiete_monat || (mieter.kaltmiete_qm || 0) * (wohnung.flaeche_m2 || 0)
  const nkVorauszahlung = mieter.vorauszahlung_nk_monat || 0
  const stellplatzMiete = mieter.stellplatz_vorhanden ? mieter.stellplatz_miete || 0 : 0
  const garageMiete = mieter.garage_vorhanden ? mieter.garage_miete || 0 : 0
  const gesamtmiete = kaltmiete + nkVorauszahlung + stellplatzMiete + garageMiete
  const mieterName = `${mieter.anrede || ''} ${mieter.vorname || ''} ${mieter.nachname}`.trim()

  const zusatzRaeumeRows: string[] = []
  if (mieter.stellplatz_vorhanden) {
    zusatzRaeumeRows.push(`<tr><td>Pkw-Stellplatz${mieter.stellplatz_nr ? ' Nr. ' + mieter.stellplatz_nr : ''}</td><td class="num">${fmtEuro(stellplatzMiete)}/Monat</td></tr>`)
  }
  if (mieter.garage_vorhanden) {
    zusatzRaeumeRows.push(`<tr><td>Garage${mieter.garage_nr ? ' Nr. ' + mieter.garage_nr : ''}</td><td class="num">${fmtEuro(garageMiete)}/Monat</td></tr>`)
  }
  if (mieter.keller_vorhanden) {
    zusatzRaeumeRows.push(`<tr><td>Kellerraum${mieter.keller_nr ? ' Nr. ' + mieter.keller_nr : ''}</td><td class="num">im Mietverhältnis enthalten</td></tr>`)
  }
  if (mieter.garten_vorhanden) {
    zusatzRaeumeRows.push(`<tr><td>Gartenmitbenutzung${mieter.garten_beschreibung ? ' (' + mieter.garten_beschreibung + ')' : ''}</td><td class="num">im Mietverhältnis enthalten</td></tr>`)
  }

  const schluesselRows = `
    <tr><td>Wohnungsschlüssel</td><td class="num">nach Übergabeprotokoll</td></tr>
    <tr><td>Haustürschlüssel</td><td class="num">${mieter.anzahl_hausschluessel || 0} Stück</td></tr>
    <tr><td>Briefkastenschlüssel</td><td class="num">${mieter.anzahl_briefkastenschluessel || 0} Stück</td></tr>
    ${mieter.sonstige_schluessel ? `<tr><td>Sonstige Schlüssel</td><td class="num">${mieter.sonstige_schluessel}</td></tr>` : ''}
  `

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Mietvertrag ${wohnung.bezeichnung}</title>${baseStyles}</head>
  <body>
    ${docHeader('Wohnraum-Mietvertrag', `Erstellt automatisch gemäß §§ 535 ff. BGB · Objekt: ${objekt.name}`, branding)}

    <h2>§ 1 Vertragsparteien</h2>
    <table>
      <tr><th style="width:30%">Vermieter</th><td>${objekt.vermieter_name || '—'}, ${objekt.vermieter_strasse || ''}, ${objekt.vermieter_plz_ort || ''}</td></tr>
      <tr><th>Mieter</th><td>${mieterName}, ${mieter.email || ''} ${mieter.telefon ? '· Tel: ' + mieter.telefon : ''}</td></tr>
    </table>

    <h2>§ 2 Mieträume</h2>
    <p>Der Vermieter vermietet dem Mieter die Wohnung <span class="badge">${wohnung.bezeichnung}</span> (${wohnung.lage || ''}) im Gebäude ${objekt.strasse}, ${objekt.plz} ${objekt.ort}, mit einer Wohnfläche von <b>${wohnung.flaeche_m2} m²</b>, bezogen von <b>${mieter.personen} Person(en)</b>.</p>

    <h2>§ 3 Mietzeit</h2>
    <p>Das Mietverhältnis beginnt am <b>${fmtDate(mieter.mietbeginn)}</b>${mieter.mietende ? ` und endet am <b>${fmtDate(mieter.mietende)}</b>` : ' und läuft auf unbestimmte Zeit'}.</p>

    <h2>§ 4 Miete und Nebenkosten</h2>
    <table>
      <tr><th style="width:55%">Nettokaltmiete pro Monat</th><td>${fmtEuro(kaltmiete)}</td></tr>
      <tr><th>Vorauszahlung Betriebs-/Nebenkosten pro Monat</th><td>${fmtEuro(nkVorauszahlung)}</td></tr>
      ${mieter.stellplatz_vorhanden ? `<tr><th>Stellplatz${mieter.stellplatz_nr ? ' Nr. ' + mieter.stellplatz_nr : ''}</th><td>${fmtEuro(stellplatzMiete)}</td></tr>` : ''}
      ${mieter.garage_vorhanden ? `<tr><th>Garage${mieter.garage_nr ? ' Nr. ' + mieter.garage_nr : ''}</th><td>${fmtEuro(garageMiete)}</td></tr>` : ''}
      <tr><th><b>Gesamtmiete pro Monat</b></th><td><b>${fmtEuro(gesamtmiete)}</b></td></tr>
    </table>
    <p class="small">Die Nebenkostenvorauszahlung wird jährlich gemäß Betriebskostenverordnung (BetrKV) und Heizkostenverordnung (HeizkostenV) abgerechnet. Über- oder Unterzahlungen werden mit der jährlichen Nebenkostenabrechnung ausgeglichen.</p>

    <h2>§ 5 Zahlung</h2>
    <p>Die Miete ist monatlich im Voraus, spätestens zum dritten Werktag eines Monats, auf folgendes Konto zu entrichten:</p>
    <table>
      <tr><th style="width:30%">Kontoinhaber</th><td>${objekt.vermieter_name || '—'}</td></tr>
      <tr><th>Bank</th><td>${objekt.bank_name || '—'}</td></tr>
      <tr><th>IBAN</th><td>${objekt.iban || '—'}</td></tr>
      <tr><th>BIC</th><td>${objekt.bic || '—'}</td></tr>
    </table>

    <h2>§ 6 Kaution</h2>
    <p>Der Mieter leistet eine Kaution in Höhe von drei Nettokaltmieten (${fmtEuro(kaltmiete * 3)}), zahlbar in drei gleichen Monatsraten gemäß § 551 BGB.</p>

    <h2>§ 7 Betriebskosten (§ 2 BetrKV)</h2>
    <p>Zu den umlagefähigen Betriebskosten zählen insbesondere: Grundsteuer, Wasserversorgung, Entwässerung, Heizung und Warmwasser (Verteilung nach § 7/§ 8 HeizkostenV, 30 % nach Wohnfläche und 70 % nach Verbrauch), Aufzug, Straßenreinigung, Müllabfuhr, Gebäudereinigung, Gartenpflege, Beleuchtung, Schornsteinreinigung, Sach- und Haftpflichtversicherung, Hauswart, Gemeinschaftsantenne sowie sonstige Betriebskosten.</p>

    <h2>§ 8 Nebenräume, Stellplatz, Garage, Keller, Garten</h2>
    <p>Zusätzlich zur Wohnung werden dem Mieter folgende Neben­räume/-flächen zur Nutzung überlassen:</p>
    <table>
      <tr><th style="width:60%">Bezeichnung</th><th>Kosten/Hinweis</th></tr>
      ${zusatzRaeumeRows.length ? zusatzRaeumeRows.join('') : '<tr><td colspan="2" class="small">Keine zusätzlichen Nebenräume/-flächen vereinbart.</td></tr>'}
    </table>

    <h2>§ 9 Schlüsselübergabe</h2>
    <table>
      <tr><th style="width:60%">Schlüsselart</th><th>Anzahl</th></tr>
      ${schluesselRows}
    </table>
    <p class="small">Die genaue Schlüsselanzahl und der Zustand der Wohnung werden zusätzlich im separaten Wohnungsübergabeprotokoll dokumentiert.</p>

    <h2>§ 10 Instandhaltung und Schönheitsreparaturen</h2>
    <p>Der Mieter ist verpflichtet, die Mieträume pflegend zu behandeln. Schönheitsreparaturen richten sich nach den gesetzlichen Bestimmungen (§ 535 BGB) und aktueller BGH-Rechtsprechung.</p>

    <h2>§ 11 Hausordnung</h2>
    <p>Die dem Mietvertrag als Anlage beigefügte Hausordnung ist Bestandteil dieses Vertrages.</p>

    <h2>§ 12 Kündigung</h2>
    <p>Die Kündigungsfristen richten sich nach § 573c BGB. Die gesetzliche Kündigungsfrist für den Mieter beträgt drei Monate.</p>

    <h2>§ 13 Sonstige Vereinbarungen</h2>
    <p>Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Sollte eine Bestimmung dieses Vertrages unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</p>

    <div class="sig-row">
      <div class="sig-box">Ort, Datum, Unterschrift Vermieter</div>
      <div class="sig-box">Ort, Datum, Unterschrift Mieter</div>
    </div>
    <p class="footer-note">Dieser Mietvertrag wurde automatisch aus den hinterlegten Stammdaten erstellt und ersetzt keine individuelle Rechtsberatung. Es empfiehlt sich vor Unterzeichnung eine Prüfung durch einen Rechtsanwalt oder Mieterverein.</p>
  </body></html>`
}

export function generateHausordnung(objekt: Objekt, branding: Branding = emptyBranding): string {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Hausordnung</title>${baseStyles}</head>
  <body>
    ${docHeader('Hausordnung', `${objekt.name} · ${objekt.strasse}, ${objekt.plz} ${objekt.ort}`, branding)}

    <p>Diese Hausordnung regelt das Zusammenleben aller Bewohner und ist Bestandteil des Mietvertrages. Sie dient der Ordnung, Sicherheit und dem guten nachbarschaftlichen Miteinander im Haus.</p>

    <h2>1. Ruhezeiten</h2>
    <p>Mittagsruhe: 13:00 – 15:00 Uhr · Nachtruhe: 22:00 – 07:00 Uhr. In diesen Zeiten ist auf Zimmerlautstärke zu achten (Musik, Fernsehen, Haushaltsgeräte, Feiern).</p>

    <h2>2. Treppenhaus und Gemeinschaftsflächen</h2>
    <p>Treppenhaus, Hauseingang und Gemeinschaftsflächen sind aus Brandschutzgründen freizuhalten (keine Schuhe, Fahrräder, Kinderwagen dauerhaft abstellen). Die Reinigung erfolgt im wöchentlichen Wechsel gemäß dem Treppenreinigungsplan (siehe separates Dokument).</p>

    <h2>3. Müllentsorgung</h2>
    <p>Müll ist ausschließlich in den dafür vorgesehenen Behältern zu entsorgen. Mülltrennung (Restmüll, Papier, Verpackung, Glas, Bio) ist verpflichtend. Sperrmüll darf nicht im Hausflur oder Hof gelagert werden.</p>

    <h2>4. Lüften und Heizen</h2>
    <p>Zur Vermeidung von Schimmelbildung sind Wohnräume regelmäßig zu lüften (Stoßlüften, mehrmals täglich). In der Heizperiode ist eine Mindesttemperatur zu halten, um Frost- und Feuchtigkeitsschäden zu vermeiden.</p>

    <h2>5. Waschküche / Gemeinschaftswaschmaschine</h2>
    <p>Sofern vorhanden, ist die Nutzung der Waschküche nach dem ausgehängten Belegungsplan zu koordinieren. Nach Benutzung ist die Waschküche sauber zu verlassen.</p>

    <h2>6. Stellplätze, Garagen, Keller und Garten</h2>
    <p>Stellplätze und Garagen dürfen nur mit zugelassenen Kraftfahrzeugen des jeweiligen Nutzers belegt werden. Kellerräume sind trocken und ordentlich zu halten. Gemeinschaftlich genutzte Gartenflächen sind pflegend zu behandeln; individuelle Beete bedürfen der Abstimmung mit der Hausverwaltung.</p>

    <h2>7. Balkone, Fenster und Außenbereiche</h2>
    <p>Blumengießen und Ausklopfen von Teppichen dürfen andere Bewohner nicht beeinträchtigen. Das Füttern von Tauben und wilden Tieren ist zu unterlassen.</p>

    <h2>8. Tierhaltung</h2>
    <p>Die Haltung von Haustieren bedarf grundsätzlich der Zustimmung des Vermieters, soweit im Mietvertrag nicht abweichend geregelt. Hunde sind im Treppenhaus an der Leine zu führen.</p>

    <h2>9. Sicherheit</h2>
    <p>Haus- und Wohnungstüren sind stets zu verschließen. Fremden Personen ist der Zutritt zum Haus nicht ohne triftigen Grund zu gewähren. Rauchen im Treppenhaus ist aus Brandschutzgründen untersagt.</p>

    <h2>10. Instandhaltungsmängel</h2>
    <p>Mängel und Schäden am Gemeinschaftseigentum sind unverzüglich der Hausverwaltung zu melden.</p>

    <p class="footer-note">Diese Hausordnung ist Bestandteil des Mietvertrages. Verstöße können nach vorheriger Abmahnung zu mietrechtlichen Konsequenzen führen. Erstellt: ${new Date().toLocaleDateString('de-DE')}</p>
  </body></html>`
}

// -------------------------------------------------------------
// Treppenreinigungsplan: ECHTER wöchentlicher Rotationsplan
// Jede Kalenderwoche (Montag–Sonntag) des gewählten Jahres ist genau
// EINE Wohnung zuständig; die Zuständigkeit rotiert durchgehend
// wohnungenweise (nicht monatlich!). Bei Änderung der Wohnungsanzahl
// wird der Plan automatisch neu erzeugt (siehe Routen: auto-regeneration).
// -------------------------------------------------------------

function mondayOfWeekUTC(d: Date): Date {
  const day = d.getUTCDay()
  const diff = (day === 0 ? -6 : 1) - day
  const res = new Date(d)
  res.setUTCDate(d.getUTCDate() + diff)
  res.setUTCHours(0, 0, 0, 0)
  return res
}

function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

interface KalenderWoche {
  kw: number
  start: Date
  end: Date
}

function getIsoWeeksOfYear(year: number): KalenderWoche[] {
  const weeks: KalenderWoche[] = []
  let cur = mondayOfWeekUTC(new Date(Date.UTC(year, 0, 1)))
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const thursday = new Date(cur)
    thursday.setUTCDate(cur.getUTCDate() + 3)
    if (thursday.getUTCFullYear() > year) break
    if (thursday.getUTCFullYear() === year) {
      const end = new Date(cur)
      end.setUTCDate(cur.getUTCDate() + 6)
      weeks.push({ kw: isoWeekNumber(cur), start: new Date(cur), end })
    }
    cur = new Date(cur)
    cur.setUTCDate(cur.getUTCDate() + 7)
  }
  return weeks
}

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function fmtKurzDatum(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

export function generateReinigungsplan(objekt: Objekt, wohnungen: Wohnung[], branding: Branding = emptyBranding, jahr?: number): string {
  const year = jahr || new Date().getFullYear()
  const weeks = getIsoWeeksOfYear(year)
  const n = wohnungen.length

  let rows = ''
  let currentMonth = -1
  weeks.forEach((w, i) => {
    const month = w.start.getUTCMonth()
    if (month !== currentMonth) {
      currentMonth = month
      rows += `<tr class="month-sep"><td colspan="4">${MONATE[month]} ${year}</td></tr>`
    }
    const wohnung = n > 0 ? wohnungen[i % n] : null
    rows += `<tr>
      <td>KW ${w.kw}</td>
      <td>${fmtKurzDatum(w.start)} – ${fmtKurzDatum(w.end)}</td>
      <td>${wohnung ? `<b>${wohnung.bezeichnung}</b>${wohnung.lage ? ' (' + wohnung.lage + ')' : ''}` : '—'}</td>
      <td>Treppenhaus, Hauseingang, Klingelanlage</td>
    </tr>`
  })

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Treppenreinigungsplan ${year}</title>${baseStyles}</head>
  <body>
    ${docHeader(`Treppenreinigungsplan ${year}`, `${objekt.name} · ${objekt.strasse}, ${objekt.plz} ${objekt.ort} · Wöchentlicher Rotationsplan (jede Woche wechselt die zuständige Wohnung)`, branding)}

    <p>Die Reinigung des Treppenhauses erfolgt <b>jede Woche</b> durch die Bewohner der jeweils zuständigen Wohnung. Die Zuständigkeit wechselt wöchentlich (Montag bis Sonntag) im durchgehenden Rotationsverfahren zwischen allen ${n} Wohnungen des Objekts. Zu reinigen sind: Treppenstufen, Handlauf, Fensterbänke im Treppenhaus, Hauseingangsbereich sowie die Klingel-/Briefkastenanlage.</p>

    <h2>Rotationsplan Kalenderjahr ${year} (${weeks.length} Kalenderwochen)</h2>
    <table>
      <tr><th>KW</th><th>Zeitraum</th><th>Zuständige Wohnung</th><th>Aufgabenbereich</th></tr>
      ${rows}
    </table>

    <h2>Reinigungsumfang</h2>
    <ul>
      <li>Treppenstufen feucht wischen (mind. 1× pro Woche)</li>
      <li>Handlauf und Geländer abwischen</li>
      <li>Fensterbänke im Treppenhaus staubfrei halten</li>
      <li>Hauseingang / Fußmatte reinigen, Spinnweben entfernen</li>
      <li>Klingel- und Briefkastenanlage abwischen</li>
    </ul>

    <p class="footer-note">Bei Verhinderung ist rechtzeitig für eine Vertretung durch eine andere Partei zu sorgen oder die Hausverwaltung zu informieren. Der Plan wird automatisch aktualisiert, sobald neue Wohnungen hinzukommen. Erstellt: ${new Date().toLocaleDateString('de-DE')}</p>
  </body></html>`
}

// -------------------------------------------------------------
// Wohnungsübergabeprotokoll (Ein- oder Auszug)
// -------------------------------------------------------------
export function generateWohnungsuebergabe(objekt: Objekt, wohnung: Wohnung, mieter: Mieter, branding: Branding = emptyBranding, art: 'einzug' | 'auszug' = 'einzug'): string {
  const mieterName = `${mieter.anrede || ''} ${mieter.vorname || ''} ${mieter.nachname}`.trim()
  const raeume = ['Wohnzimmer', 'Schlafzimmer', 'Küche', 'Bad/WC', 'Flur/Diele', 'Balkon/Terrasse', 'Weiterer Raum']

  const raumRows = raeume
    .map(
      (r) => `<tr><td>${r}</td><td class="fill-box">&nbsp;</td><td class="fill-box">&nbsp;</td></tr>`
    )
    .join('')

  const zaehlerRows = ['Strom (allgemein)', 'Heizungs-Wärmemengenzähler (WMZ)', 'Warmwasserzähler', 'Kaltwasserzähler', 'Gaszähler (falls vorhanden)']
    .map((z) => `<tr><td>${z}</td><td class="fill-box">&nbsp;</td><td class="fill-box">Zählernr.:&nbsp;</td></tr>`)
    .join('')

  const schluesselTable = `
    <table>
      <tr><th style="width:60%">Schlüsselart</th><th>Anzahl übergeben</th></tr>
      <tr><td>Wohnungsschlüssel</td><td class="fill-box">&nbsp;</td></tr>
      <tr><td>Haustürschlüssel</td><td>${mieter.anzahl_hausschluessel || 0} Stück</td></tr>
      <tr><td>Briefkastenschlüssel</td><td>${mieter.anzahl_briefkastenschluessel || 0} Stück</td></tr>
      ${mieter.keller_vorhanden ? `<tr><td>Kellerschlüssel${mieter.keller_nr ? ' (Keller Nr. ' + mieter.keller_nr + ')' : ''}</td><td class="fill-box">&nbsp;</td></tr>` : ''}
      ${mieter.garage_vorhanden ? `<tr><td>Garagenschlüssel/-fernbedienung${mieter.garage_nr ? ' (Garage Nr. ' + mieter.garage_nr + ')' : ''}</td><td class="fill-box">&nbsp;</td></tr>` : ''}
      ${mieter.sonstige_schluessel ? `<tr><td>${mieter.sonstige_schluessel}</td><td class="fill-box">&nbsp;</td></tr>` : ''}
    </table>
  `

  const zusatzTable = `
    <table>
      <tr><th style="width:60%">Nebenraum / -fläche</th><th>Zustand / Bemerkung</th></tr>
      ${mieter.stellplatz_vorhanden ? `<tr><td>Pkw-Stellplatz${mieter.stellplatz_nr ? ' Nr. ' + mieter.stellplatz_nr : ''}</td><td class="fill-box">&nbsp;</td></tr>` : ''}
      ${mieter.garage_vorhanden ? `<tr><td>Garage${mieter.garage_nr ? ' Nr. ' + mieter.garage_nr : ''}</td><td class="fill-box">&nbsp;</td></tr>` : ''}
      ${mieter.keller_vorhanden ? `<tr><td>Kellerraum${mieter.keller_nr ? ' Nr. ' + mieter.keller_nr : ''}</td><td class="fill-box">&nbsp;</td></tr>` : ''}
      ${mieter.garten_vorhanden ? `<tr><td>Gartenfläche${mieter.garten_beschreibung ? ' (' + mieter.garten_beschreibung + ')' : ''}</td><td class="fill-box">&nbsp;</td></tr>` : ''}
      ${!mieter.stellplatz_vorhanden && !mieter.garage_vorhanden && !mieter.keller_vorhanden && !mieter.garten_vorhanden ? '<tr><td colspan="2" class="small">Keine zusätzlichen Nebenräume/-flächen vereinbart.</td></tr>' : ''}
    </table>
  `

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Wohnungsübergabeprotokoll ${wohnung.bezeichnung}</title>${baseStyles}</head>
  <body>
    ${docHeader(`Wohnungsübergabeprotokoll (${art === 'einzug' ? 'Einzug' : 'Auszug'})`, `${objekt.name} · ${objekt.strasse}, ${objekt.plz} ${objekt.ort}`, branding)}

    <h2>1 · Beteiligte</h2>
    <table>
      <tr><th style="width:30%">Vermieter / Hausverwaltung</th><td>${objekt.vermieter_name || '—'}</td></tr>
      <tr><th>Mieter</th><td>${mieterName}</td></tr>
      <tr><th>Wohnung</th><td>${wohnung.bezeichnung} (${wohnung.lage || ''}), ${wohnung.flaeche_m2} m²</td></tr>
      <tr><th>Datum der Übergabe</th><td class="fill-box">&nbsp;</td></tr>
      <tr><th>Art der Übergabe</th><td>☐ Einzug &nbsp;&nbsp;&nbsp; ☐ Auszug</td></tr>
    </table>

    <h2>2 · Zählerstände bei Übergabe</h2>
    <table>
      <tr><th style="width:45%">Zählerart</th><th>Zählerstand</th><th>Zählernummer</th></tr>
      ${zaehlerRows}
    </table>

    <h2>3 · Zustand der Räume</h2>
    <table>
      <tr><th style="width:30%">Raum</th><th>Zustand (Wände/Boden/Fenster)</th><th>Festgestellte Mängel</th></tr>
      ${raumRows}
    </table>

    <h2>4 · Schlüsselübergabe</h2>
    ${schluesselTable}

    <h2>5 · Nebenräume / -flächen (Stellplatz, Garage, Keller, Garten)</h2>
    ${zusatzTable}

    <h2>6 · Sonstige Vereinbarungen / Bemerkungen</h2>
    <table><tr><td class="fill-box" style="min-height:70px;">&nbsp;</td></tr></table>

    <h2>7 · Bestätigung</h2>
    <p class="small">Beide Parteien bestätigen mit ihrer Unterschrift die Richtigkeit der vorstehenden Angaben. Dieses Protokoll ist Bestandteil des Mietverhältnisses und wird beiden Parteien in Kopie ausgehändigt.</p>

    <div class="sig-row">
      <div class="sig-box">Ort, Datum, Unterschrift Vermieter/Hausverwaltung</div>
      <div class="sig-box">Ort, Datum, Unterschrift Mieter</div>
    </div>
    <p class="footer-note">Erstellt am ${new Date().toLocaleDateString('de-DE')} · Dient als Nachweis für spätere Kautions- bzw. Schadensabrechnung.</p>
  </body></html>`
}

// -------------------------------------------------------------
// WMZ-Ablesehilfe (Bedienungsanleitung Sensus PolluCom F/E) als
// druckfertiges Dokument für Mieter · L1-L6 Bedienschritte
// -------------------------------------------------------------

export function generateWmzAnleitung(objekt: Objekt, branding: Branding = emptyBranding): string {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>WMZ-Ablesehilfe</title>${baseStyles}
  <style>
    .step { display:flex; gap:12px; margin: 10px 0; align-items:flex-start; }
    .step .num { flex:0 0 30px; height:30px; border-radius:50%; background:#2563eb; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; }
    .step .txt { flex:1; }
    .tip-box { background:#fffbeb; border:1px solid #fcd34d; border-radius:6px; padding:10px 14px; margin:14px 0; font-size:11.5px; }
    .display-box { display:inline-block; background:#0f172a; color:#4ade80; font-family: monospace; padding:6px 14px; border-radius:4px; font-size:13px; }
  </style>
  </head>
  <body>
    ${docHeader('WMZ-Ablesehilfe', `Bedienungsanleitung Wärmemengenzähler (Sensus PolluCom F/E) · ${objekt.name}`, branding)}

    <p>Diese Anleitung erklärt Schritt für Schritt, wie Sie Ihren Wärmemengenzähler (Heizung) bzw. Wasserzähler selbst ablesen können. Bitte lesen Sie <span class="paragraf">jährlich zum Stichtag</span> (siehe Erinnerung im Mieterportal) den aktuellen Zählerstand ab und melden Sie ihn über das Mieterportal.</p>

    <h2>Anzeige-Tasten am Gerät</h2>
    <div class="step"><div class="num">L1</div><div class="txt">Kurzer Tastendruck (Taste rechts unten am Display) &rarr; zeigt den <span class="paragraf">aktuellen Wärmeverbrauch</span> in <span class="display-box">MWh</span> bzw. <span class="display-box">kWh</span> an. <b>Dies ist der Wert, den Sie ablesen und übertragen müssen.</b></div></div>
    <div class="step"><div class="num">L2</div><div class="txt">Taste erneut kurz drücken &rarr; weitere Zusatzwerte (z. B. Betriebsstunden) werden nacheinander angezeigt.</div></div>
    <div class="step"><div class="num">L3</div><div class="txt">Taste 8 Sekunden gedrückt halten, danach 2× kurz (je ca. 2 Sekunden) drücken &rarr; Zusatzmenü mit Durchflussmenge (m³), Vor-/Rücklauftemperatur und aktueller Leistung. <span class="small">(Für die normale Ablesung nicht erforderlich.)</span></div></div>
    <div class="step"><div class="num">L4</div><div class="txt">Im Zusatzmenü: Navigation zu monatlichen Rückblick-Werten möglich (Anzeige "Monat", Datum blinkt).</div></div>
    <div class="step"><div class="num">L5</div><div class="txt">Mit "Zurück" (lange gedrückt halten) gelangen Sie wieder zur Startanzeige "Heute" / aktueller Stand.</div></div>
    <div class="step"><div class="num">L6</div><div class="txt">Erscheint im Display ein <span class="display-box">F</span> (Störungshinweis / Fehlercode), liegt eine technische Störung vor. Bitte umgehend die Hausverwaltung informieren – <b>nicht selbst öffnen oder reparieren.</b></div></div>

    <div class="tip-box"><i class="paragraf">Tipp:</i> Fotografieren Sie den Zähler inkl. Displayanzeige und laden Sie das Foto im Mieterportal unter „Unterlagen" hoch – das erleichtert die Prüfung durch die Hausverwaltung.</div>

    <h2>Wasserzähler (Warmwasser / Kaltwasser)</h2>
    <p>Die Wasserzähler zeigen den Verbrauch in <span class="display-box">m³</span> direkt über ein mechanisches Rollenzählwerk an – kein Tastendruck notwendig. Bitte lesen Sie alle schwarzen (ganze m³) und roten (Nachkommastellen) Ziffern von links nach rechts ab.</p>

    <h2>Wo trage ich den Wert ein?</h2>
    <p>Melden Sie den abgelesenen Wert im Mieterportal unter „Zählerstände" oder verwenden Sie das separate Ablesedatenblatt (siehe Dokumente-Bereich).</p>

    <p class="footer-note">Bei Fragen zur Ablesung wenden Sie sich an die Hausverwaltung. Erstellt: ${new Date().toLocaleDateString('de-DE')}</p>
  </body></html>`
}

// -------------------------------------------------------------
// Ablesedatenblatt: Formular zum handschriftlichen Notieren der
// Zählerstände (z.B. wenn Online-Eingabe nicht möglich ist)
// -------------------------------------------------------------

export function generateAblesedatenblatt(objekt: Objekt, wohnung: Wohnung, zaehlerListe: { bezeichnung: string; typ: string; einheit: string }[], jahr: number, branding: Branding = emptyBranding): string {
  const rows = zaehlerListe.length
    ? zaehlerListe.map((z) => `<tr><td>${z.bezeichnung}</td><td>${z.typ}</td><td class="fill-box" style="text-align:center;">&nbsp;</td><td>${z.einheit}</td><td class="fill-box" style="min-width:110px;">&nbsp;</td></tr>`).join('')
    : `<tr><td colspan="5" class="small">Keine Zähler für diese Wohnung erfasst.</td></tr>`

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Ablesedatenblatt</title>${baseStyles}</head>
  <body>
    ${docHeader('Ablesedatenblatt', `${wohnung.bezeichnung} · ${objekt.name} · Ablesejahr ${jahr}`, branding)}

    <p>Bitte tragen Sie hier die aktuellen Zählerstände ein und geben Sie das Blatt bei der Hausverwaltung ab oder übertragen Sie die Werte anschließend online ins Mieterportal.</p>

    <table>
      <tr><th>Zähler</th><th>Typ</th><th>Zählerstand</th><th>Einheit</th><th>Ablesedatum</th></tr>
      ${rows}
    </table>

    <h2>Bemerkungen</h2>
    <table><tr><td class="fill-box" style="min-height:60px;">&nbsp;</td></tr></table>

    <div class="sig-row">
      <div class="sig-box">Ort, Datum, Unterschrift Mieter</div>
      <div class="sig-box">&nbsp;</div>
    </div>
    <p class="footer-note">Erstellt am ${new Date().toLocaleDateString('de-DE')}</p>
  </body></html>`
}
