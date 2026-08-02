// ============================================================
// Erzeugt druckfertiges HTML für die Nebenkostenabrechnung (DIN A4, Briefkopf)
// Wird im Browser gerendert und per "Drucken -> Als PDF speichern" exportiert
// ============================================================

import type { Objekt } from './types'
import type { MieterAbrechnung } from './calc'

function fmtEuro(n: number): string {
  return (n ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fmtNum(n: number, digits = 1): string {
  return (n ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: digits })
}
function fmtPct(n: number): string {
  return ((n ?? 0) * 100).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'
}
function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00Z').toLocaleDateString('de-DE')
}

const styles = `
<style>
  @page { size: A4; margin: 16mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color:#1e293b; font-size: 11.5px; line-height:1.5; margin:0;}
  .letterhead { display:flex; justify-content:space-between; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 14px;}
  .letterhead h1 { font-size: 17px; margin:0 0 4px 0; color:#0f172a; }
  .letterhead .sub { font-size: 10.5px; color:#64748b; }
  .addr-box { font-size: 11px; }
  .addr-box .label { font-size:9.5px; text-transform:uppercase; color:#2563eb; font-weight:700; margin-bottom:2px;}
  .three-col { display:flex; gap: 18px; margin-bottom: 16px; }
  .three-col > div { flex:1; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; background:#f8fafc;}
  h2.section { font-size:13px; color:#1e40af; border-left:4px solid #2563eb; padding-left:8px; margin: 18px 0 8px;}
  table { width:100%; border-collapse: collapse; font-size:11px; }
  th, td { border:1px solid #dbe4f3; padding:4px 7px; text-align:left;}
  th { background:#eff4ff; font-weight:600;}
  td.num, th.num { text-align:right; }
  tr.total td { font-weight:700; background:#f1f5f9; border-top:2px solid #94a3b8;}
  .status-box { margin-top:10px; padding:10px 14px; border-radius:6px; font-weight:700; font-size:13px; }
  .status-nach { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;}
  .status-gut { background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0;}
  .status-ausg { background:#f1f5f9; color:#334155; border:1px solid #cbd5e1;}
  .sig-row { display:flex; justify-content:space-between; margin-top:40px;}
  .sig-box { width:45%; border-top:1px solid #333; padding-top:4px; font-size:10.5px; text-align:center;}
  .footer-note { margin-top:20px; font-size:9.5px; color:#94a3b8; border-top:1px dashed #cbd5e1; padding-top:6px;}
  .compare-badge { font-size:10px; padding:1px 6px; border-radius:4px; margin-left:6px;}
  .up { background:#fee2e2; color:#b91c1c; }
  .down { background:#dcfce7; color:#15803d; }
  @media print { .no-print { display:none; } }
</style>
`

export function generateAbrechnungHtml(objekt: Objekt, a: MieterAbrechnung, jahr: number, vorjahr?: MieterAbrechnung | null): string {
  const m = a.mieter
  const mieterName = m ? `${m.anrede || ''} ${m.vorname || ''} ${m.nachname}`.trim() : '—'

  const statusClass = a.status === 'Nachzahlung' ? 'status-nach' : a.status === 'Guthaben' ? 'status-gut' : 'status-ausg'
  const statusText =
    a.status === 'Nachzahlung'
      ? `NACHZAHLUNG: ${fmtEuro(Math.abs(a.differenz))}`
      : a.status === 'Guthaben'
      ? `GUTHABEN: ${fmtEuro(Math.abs(a.differenz))}`
      : 'AUSGEGLICHEN'

  function vergleichBadge(aktuell: number, alt: number | undefined) {
    if (alt === undefined || alt === null || alt === 0) return ''
    const diffPct = ((aktuell - alt) / alt) * 100
    if (Math.abs(diffPct) < 0.5) return ''
    const cls = diffPct > 0 ? 'up' : 'down'
    const arrow = diffPct > 0 ? '▲' : '▼'
    return `<span class="compare-badge ${cls}">${arrow} ${Math.abs(diffPct).toFixed(1)}% vs. Vorjahr</span>`
  }

  const kostenRows = a.kostenarten
    .map(
      (k) => `<tr>
        <td>${k.nr}</td>
        <td>${k.bezeichnung}</td>
        <td>${k.verteilerschluessel}</td>
        <td class="num">${fmtEuro(k.gesamt)}</td>
        <td class="num">${fmtPct(k.anteil_pct)}</td>
        <td class="num">${fmtEuro(k.betrag)}</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Nebenkostenabrechnung ${jahr} - ${a.bezeichnung}</title>${styles}</head>
  <body>
    <div class="letterhead">
      <div>
        <h1>Nebenkostenabrechnung ${jahr}</h1>
        <div class="sub">${objekt.name} · ${objekt.strasse}, ${objekt.plz} ${objekt.ort}</div>
        <div class="sub">Erstellt gemäß § 2 BetrKV und § 7/§ 8 HeizkostenV (30 % Fläche / 70 % Verbrauch)</div>
      </div>
      <div class="addr-box" style="text-align:right;">
        <div class="label">Vermieter</div>
        <div>${objekt.vermieter_name || '—'}</div>
        <div>${objekt.vermieter_strasse || ''}</div>
        <div>${objekt.vermieter_plz_ort || ''}</div>
        ${objekt.vermieter_telefon ? `<div>Tel: ${objekt.vermieter_telefon}</div>` : ''}
        ${objekt.vermieter_email ? `<div>${objekt.vermieter_email}</div>` : ''}
      </div>
    </div>

    <div class="three-col">
      <div>
        <div class="label" style="color:#2563eb;font-weight:700;font-size:9.5px;text-transform:uppercase;">Mieter</div>
        <div><b>${mieterName}</b></div>
        <div>${m?.email || ''}</div>
        <div>${m?.telefon || ''}</div>
      </div>
      <div>
        <div class="label" style="color:#2563eb;font-weight:700;font-size:9.5px;text-transform:uppercase;">Wohnung</div>
        <div><b>${a.bezeichnung}</b> · ${a.lage}</div>
        <div>${a.verbrauch.flaeche_m2} m² · ${a.verbrauch.personen} Person(en)</div>
        <div>Zeitraum: ${a.tage} / ${a.jahresTage} Tagen (${(a.tagesfaktor * 100).toFixed(1)}%)</div>
      </div>
      <div>
        <div class="label" style="color:#2563eb;font-weight:700;font-size:9.5px;text-transform:uppercase;">Bankverbindung Vermieter</div>
        <div>${objekt.bank_name || '—'}</div>
        <div>IBAN: ${objekt.iban || '—'}</div>
        <div>BIC: ${objekt.bic || '—'}</div>
      </div>
    </div>

    <h2 class="section">1 · Verbrauchsdaten (Zählerstände)</h2>
    <table>
      <tr><th>Zählerart</th><th class="num">Verbrauch ${jahr}</th><th class="num">Verbrauch ${jahr - 1}</th><th>Einheit</th></tr>
      <tr><td>Heizung (WMZ)</td><td class="num">${fmtNum(a.verbrauch.wmz_heizung_verbrauch)} ${vergleichBadge(a.verbrauch.wmz_heizung_verbrauch, vorjahr?.verbrauch.wmz_heizung_verbrauch)}</td><td class="num">${vorjahr ? fmtNum(vorjahr.verbrauch.wmz_heizung_verbrauch) : '—'}</td><td>kWh</td></tr>
      <tr><td>Warmwasser</td><td class="num">${fmtNum(a.verbrauch.ww_verbrauch)} ${vergleichBadge(a.verbrauch.ww_verbrauch, vorjahr?.verbrauch.ww_verbrauch)}</td><td class="num">${vorjahr ? fmtNum(vorjahr.verbrauch.ww_verbrauch) : '—'}</td><td>m³</td></tr>
      <tr><td>Kaltwasser</td><td class="num">${fmtNum(a.verbrauch.kw_verbrauch)} ${vergleichBadge(a.verbrauch.kw_verbrauch, vorjahr?.verbrauch.kw_verbrauch)}</td><td class="num">${vorjahr ? fmtNum(vorjahr.verbrauch.kw_verbrauch) : '—'}</td><td>m³</td></tr>
      <tr><td>Frischwasser gesamt</td><td class="num">${fmtNum(a.verbrauch.frischwasser_gesamt)}</td><td class="num">${vorjahr ? fmtNum(vorjahr.verbrauch.frischwasser_gesamt) : '—'}</td><td>m³</td></tr>
    </table>

    <h2 class="section">2 · Nebenkosten gemäß § 2 BetrKV (Einzelpositionen)</h2>
    <table>
      <tr><th>Nr</th><th>Kostenposition</th><th>Verteilerschlüssel</th><th class="num">Gesamt Objekt</th><th class="num">Ihr Anteil</th><th class="num">Ihr Betrag</th></tr>
      ${kostenRows}
      <tr class="total"><td colspan="5">Σ Nebenkosten ${jahr} (Volljahr)</td><td class="num">${fmtEuro(a.summe_nebenkosten_volljahr)}</td></tr>
    </table>
    ${vergleichBadge(a.summe_nebenkosten_volljahr, vorjahr?.summe_nebenkosten_volljahr) ? `<p style="text-align:right;margin-top:-4px;">Vorjahresvergleich: ${vergleichBadge(a.summe_nebenkosten_volljahr, vorjahr?.summe_nebenkosten_volljahr)} (${jahr - 1}: ${fmtEuro(vorjahr?.summe_nebenkosten_volljahr || 0)})</p>` : ''}

    <h2 class="section">3 · Verrechnung & Ergebnis (tag-genau, ${a.tage} von ${a.jahresTage} Tagen)</h2>
    <table>
      <tr><td>Σ Nebenkosten ${jahr} (tag-genau)</td><td class="num">${fmtEuro(a.summe_nebenkosten_tag_genau)}</td></tr>
      <tr><td>(−) Vorauszahlung geleistet</td><td class="num">${fmtEuro(a.vorauszahlung_ist)}</td></tr>
      <tr class="total"><td>Differenz</td><td class="num">${fmtEuro(a.differenz)}</td></tr>
    </table>
    <div class="status-box ${statusClass}">Status: ${statusText}</div>
    <p style="font-size:10px;color:#64748b;">Zahlungshinweis: Nachzahlungsbeträge sind binnen 14 Tagen auf das oben genannte Konto zu überweisen. Guthaben werden mit der nächsten Abschlagsrate verrechnet oder erstattet.</p>

    <h2 class="section">4 · Kaltmiete & Gesamtforderung (tag-genau)</h2>
    <table>
      <tr><td>Kaltmiete/Monat</td><td class="num">${fmtEuro(a.kaltmiete_monat)}</td></tr>
      <tr><td>Kaltmiete NEU/Monat (nach Erhöhung)</td><td class="num">${fmtEuro(a.kaltmiete_neu_monat)}</td></tr>
      <tr><td>Kaltmiete Jahr (tag-genau)</td><td class="num">${fmtEuro(a.kaltmiete_jahr_tag_genau)}</td></tr>
      <tr><td>Nebenkosten Jahr (tag-genau)</td><td class="num">${fmtEuro(a.summe_nebenkosten_tag_genau)}</td></tr>
      <tr class="total"><td>GESAMTFORDERUNG ${jahr}</td><td class="num">${fmtEuro(a.gesamtforderung)}</td></tr>
    </table>

    <h2 class="section">Rechtsgrundlagen</h2>
    <p style="font-size:10px;color:#64748b;">§ 2 BetrKV (17 Betriebskostenarten) · HeizkostenV § 7 (Raumwärme: 30 % Fläche / 70 % Verbrauch) · HeizkostenV § 8 (Warmwasserbereitung) · BGB §§ 556, 556a. Diese Abrechnung wurde automatisch aus den erfassten Zählerständen und Kostenpositionen erstellt. Summe Gesamtkosten = Summe verteilter Kosten (Plausibilitätsprüfung bestanden).</p>

    <div class="sig-row">
      <div class="sig-box">Ort, Datum, Unterschrift Vermieter</div>
      <div class="sig-box">Ort, Datum, Unterschrift Mieter</div>
    </div>
    <div class="footer-note">Mietbeginn: ${fmtDate(m?.mietbeginn)} · Mietende: ${fmtDate(m?.mietende) === '—' ? 'laufend' : fmtDate(m?.mietende)} · Erstellt am ${new Date().toLocaleDateString('de-DE')}</div>
  </body></html>`
}
