// ============================================================
// Dokumenten-Generator: Mietvertrag, Hausordnung, Treppenreinigungsplan
// Erzeugt druckfertiges HTML (wird im Browser per "Drucken -> Als PDF speichern" exportiert)
// ============================================================

import type { Objekt, Wohnung, Mieter } from './types'

function fmtDate(d: string | null): string {
  if (!d) return '_______________'
  const dt = new Date(d + 'T00:00:00Z')
  return dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtEuro(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

const baseStyles = `
  <style>
    @page { size: A4; margin: 20mm 18mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; font-size: 12.5px; line-height: 1.55; margin:0; }
    h1 { font-size: 19px; color: #0f172a; border-bottom: 3px solid #2563eb; padding-bottom: 8px; margin-bottom: 4px;}
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
  </style>
`

export function generateMietvertrag(objekt: Objekt, wohnung: Wohnung, mieter: Mieter): string {
  const kaltmiete = mieter.kaltmiete_monat || (mieter.kaltmiete_qm || 0) * (wohnung.flaeche_m2 || 0)
  const nkVorauszahlung = mieter.vorauszahlung_nk_monat || 0
  const gesamtmiete = kaltmiete + nkVorauszahlung
  const mieterName = `${mieter.anrede || ''} ${mieter.vorname || ''} ${mieter.nachname}`.trim()

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Mietvertrag ${wohnung.bezeichnung}</title>${baseStyles}</head>
  <body>
    <h1>Wohnraum-Mietvertrag</h1>
    <p class="meta">Erstellt automatisch gemäß §§ 535 ff. BGB · Objekt: ${objekt.name}</p>

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

    <h2>§ 8 Instandhaltung und Schönheitsreparaturen</h2>
    <p>Der Mieter ist verpflichtet, die Mieträume pflegend zu behandeln. Schönheitsreparaturen richten sich nach den gesetzlichen Bestimmungen (§ 535 BGB) und aktueller BGH-Rechtsprechung.</p>

    <h2>§ 9 Hausordnung</h2>
    <p>Die dem Mietvertrag als Anlage beigefügte Hausordnung ist Bestandteil dieses Vertrages.</p>

    <h2>§ 10 Kündigung</h2>
    <p>Die Kündigungsfristen richten sich nach § 573c BGB. Die gesetzliche Kündigungsfrist für den Mieter beträgt drei Monate.</p>

    <h2>§ 11 Sonstige Vereinbarungen</h2>
    <p>Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Sollte eine Bestimmung dieses Vertrages unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</p>

    <div class="sig-row">
      <div class="sig-box">Ort, Datum, Unterschrift Vermieter</div>
      <div class="sig-box">Ort, Datum, Unterschrift Mieter</div>
    </div>
    <p class="footer-note">Dieser Mietvertrag wurde automatisch aus den hinterlegten Stammdaten erstellt und ersetzt keine individuelle Rechtsberatung. Es empfiehlt sich vor Unterzeichnung eine Prüfung durch einen Rechtsanwalt oder Mieterverein.</p>
  </body></html>`
}

export function generateHausordnung(objekt: Objekt): string {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Hausordnung</title>${baseStyles}</head>
  <body>
    <h1>Hausordnung</h1>
    <p class="meta">${objekt.name} · ${objekt.strasse}, ${objekt.plz} ${objekt.ort}</p>

    <p>Diese Hausordnung regelt das Zusammenleben aller Bewohner und ist Bestandteil des Mietvertrages. Sie dient der Ordnung, Sicherheit und dem guten nachbarschaftlichen Miteinander im Haus.</p>

    <h2>1. Ruhezeiten</h2>
    <p>Mittagsruhe: 13:00 – 15:00 Uhr · Nachtruhe: 22:00 – 07:00 Uhr. In diesen Zeiten ist auf Zimmerlautstärke zu achten (Musik, Fernsehen, Haushaltsgeräte, Feiern).</p>

    <h2>2. Treppenhaus und Gemeinschaftsflächen</h2>
    <p>Treppenhaus, Hauseingang und Gemeinschaftsflächen sind aus Brandschutzgründen freizuhalten (keine Schuhe, Fahrräder, Kinderwagen dauerhaft abstellen). Die Reinigung erfolgt gemäß dem Treppenreinigungsplan (siehe separates Dokument).</p>

    <h2>3. Müllentsorgung</h2>
    <p>Müll ist ausschließlich in den dafür vorgesehenen Behältern zu entsorgen. Mülltrennung (Restmüll, Papier, Verpackung, Glas, Bio) ist verpflichtend. Sperrmüll darf nicht im Hausflur oder Hof gelagert werden.</p>

    <h2>4. Lüften und Heizen</h2>
    <p>Zur Vermeidung von Schimmelbildung sind Wohnräume regelmäßig zu lüften (Stoßlüften, mehrmals täglich). In der Heizperiode ist eine Mindesttemperatur zu halten, um Frost- und Feuchtigkeitsschäden zu vermeiden.</p>

    <h2>5. Waschküche / Gemeinschaftswaschmaschine</h2>
    <p>Sofern vorhanden, ist die Nutzung der Waschküche nach dem ausgehängten Belegungsplan zu koordinieren. Nach Benutzung ist die Waschküche sauber zu verlassen.</p>

    <h2>6. Balkone, Fenster und Außenbereiche</h2>
    <p>Blumengießen und Ausklopfen von Teppichen dürfen andere Bewohner nicht beeinträchtigen. Das Füttern von Tauben und wilden Tieren ist zu unterlassen.</p>

    <h2>7. Tierhaltung</h2>
    <p>Die Haltung von Haustieren bedarf grundsätzlich der Zustimmung des Vermieters, soweit im Mietvertrag nicht abweichend geregelt. Hunde sind im Treppenhaus an der Leine zu führen.</p>

    <h2>8. Sicherheit</h2>
    <p>Haus- und Wohnungstüren sind stets zu verschließen. Fremden Personen ist der Zutritt zum Haus nicht ohne triftigen Grund zu gewähren. Rauchen im Treppenhaus ist aus Brandschutzgründen untersagt.</p>

    <h2>9. Instandhaltungsmängel</h2>
    <p>Mängel und Schäden am Gemeinschaftseigentum sind unverzüglich der Hausverwaltung zu melden.</p>

    <p class="footer-note">Diese Hausordnung ist Bestandteil des Mietvertrages. Verstöße können nach vorheriger Abmahnung zu mietrechtlichen Konsequenzen führen. Erstellt: ${new Date().toLocaleDateString('de-DE')}</p>
  </body></html>`
}

export function generateReinigungsplan(objekt: Objekt, wohnungen: Wohnung[]): string {
  const wochen = ['KW 1', 'KW 2', 'KW 3', 'KW 4', 'KW 5', 'KW 6', 'KW 7', 'KW 8']
  const rows = wochen
    .map((w, i) => {
      const wohnung = wohnungen[i % wohnungen.length]
      return `<tr><td>${w}</td><td>${wohnung ? wohnung.bezeichnung + (wohnung.lage ? ' (' + wohnung.lage + ')' : '') : '—'}</td><td>Treppenhaus, Hauseingang, Klingelanlage</td></tr>`
    })
    .join('')

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Treppenreinigungsplan</title>${baseStyles}</head>
  <body>
    <h1>Treppenreinigungsplan</h1>
    <p class="meta">${objekt.name} · ${objekt.strasse}, ${objekt.plz} ${objekt.ort} · Rotationsplan im wöchentlichen Wechsel</p>

    <p>Die Reinigung des Treppenhauses erfolgt im wöchentlichen Turnus durch die Bewohner der jeweiligen Wohnung. Zu reinigen sind: Treppenstufen, Handlauf, Fensterbänke im Treppenhaus, Hauseingangsbereich sowie die Klingel-/Briefkastenanlage.</p>

    <h2>Rotationsplan (Beispiel für 8 Kalenderwochen, danach Wiederholung)</h2>
    <table>
      <tr><th>Kalenderwoche</th><th>Zuständige Wohnung</th><th>Aufgabenbereich</th></tr>
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

    <p class="footer-note">Bei Verhinderung ist rechtzeitig für eine Vertretung durch eine andere Partei zu sorgen oder die Hausverwaltung zu informieren. Erstellt: ${new Date().toLocaleDateString('de-DE')}</p>
  </body></html>`
}
