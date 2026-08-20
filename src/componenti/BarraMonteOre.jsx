/* La barra del monte ore: un segmento per lezione, largo quanto le sue ore.
   Pieno se erogata, tratteggiato se ancora da fare, barrato se annullata.
   Compare nella lista corsi, in cima al dettaglio e in versione compatta
   dentro le card: è la stessa cosa in tre misure, non tre componenti. */

import { useEffect, useRef, useState } from 'react'
import { coloreTipologia } from '../lib/costanti.js'
import { dataBreve, formattaOre } from '../lib/date.js'
import { prossimaLezione } from '../lib/calcoli.js'

const CLASSE_STATO = {
  erogata: 'segmento--erogata',
  pianificata: 'segmento--pianificata',
  annullata: 'segmento--annullata',
}

export default function BarraMonteOre({
  lezioni,
  oreTotali,
  tipologia,
  titolo,
  variante = 'lista',
  etichette = variante !== 'card',
  testata = variante !== 'card',
  onLezione,
}) {
  const erogate = lezioni.reduce((s, l) => (l.stato === 'erogata' ? s + (l.ore || 0) : s), 0)
  const pianificate = lezioni.reduce((s, l) => s + (l.ore || 0), 0)
  const totali = oreTotali || pianificate
  const prossima = prossimaLezione(lezioni)

  // Ore del programma non ancora messe a calendario: restano in coda come
  // spazio vuoto, così la barra dice sempre quanto manca davvero.
  const scoperte = Math.max(0, totali - pianificate)

  const segmenti = [
    ...lezioni.map((l) => ({
      chiave: l.id,
      ore: l.ore || 0,
      stato: l.stato,
      etichetta: `M${String(l.moduloN).padStart(2, '0')}`,
      lezione: l,
    })),
    ...(scoperte > 0
      ? [{ chiave: 'scoperte', ore: scoperte, stato: 'scoperta', etichetta: '·' }]
      : []),
  ]

  const appena = useSegmentiAppenaErogati(lezioni)
  const colore = coloreTipologia(tipologia)
  const descrizione = `${formattaOre(erogate)} ore erogate su ${formattaOre(totali)}`

  return (
    <div className={`barra-ore barra-ore--${variante}`} style={{ '--colore': colore }}>
      {testata && (
        <div className="barra-ore__testata">
          <span className="barra-ore__titolo">{titolo}</span>
          <span className="barra-ore__conteggio">
            {formattaOre(erogate)} / {formattaOre(totali)} ore
          </span>
        </div>
      )}

      <div className="barra-ore__segmenti" role="img" aria-label={descrizione}>
        {segmenti.map((s) => {
          const classi = [
            'segmento',
            CLASSE_STATO[s.stato] ?? 'segmento--pianificata',
            appena.has(s.chiave) ? 'segmento--appena' : '',
          ]
            .filter(Boolean)
            .join(' ')

          const contenuto = s.stato === 'erogata' ? <span className="segmento__riempimento" /> : null
          const stile = {
            flexGrow: s.ore || 0.25,
            flexBasis: 0,
            ...(s.stato === 'scoperta' ? { '--colore': 'var(--bordo)' } : null),
          }

          return onLezione && s.lezione ? (
            <button
              key={s.chiave}
              type="button"
              className={classi}
              style={stile}
              onClick={() => onLezione(s.lezione)}
              aria-label={`${s.etichetta}, ${s.lezione.stato}, ${dataBreve(s.lezione.data)}`}
            >
              {contenuto}
            </button>
          ) : (
            <div key={s.chiave} className={classi} style={stile} aria-hidden="true">
              {contenuto}
            </div>
          )
        })}
      </div>

      {etichette && (
        <div className="barra-ore__etichette" aria-hidden="true">
          {segmenti.map((s) => (
            <span
              key={s.chiave}
              className="barra-ore__etichetta"
              style={{ flexGrow: s.ore || 0.25, flexBasis: 0 }}
            >
              {s.etichetta}
            </span>
          ))}
        </div>
      )}

      {etichette && prossima && (
        <div className="barra-ore__prossima">
          {segmenti.map((s) => (
            <span
              key={s.chiave}
              className="barra-ore__marcatore"
              style={{ flexGrow: s.ore || 0.25, flexBasis: 0 }}
            >
              {s.chiave === prossima.id && <span>▲ prossima, {dataBreve(prossima.data)}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const NIENTE = new Set()

/**
 * Quali segmenti sono passati a "erogata" proprio adesso: solo quelli si
 * riempiono con l'animazione, gli altri sono già pieni all'apertura.
 */
function useSegmentiAppenaErogati(lezioni) {
  const precedenti = useRef(new Map())
  const [appena, setAppena] = useState(NIENTE)

  useEffect(() => {
    const attuali = new Map(lezioni.map((l) => [l.id, l.stato]))
    const nuovi = new Set()
    for (const [id, stato] of attuali) {
      const prima = precedenti.current.get(id)
      if (stato === 'erogata' && prima && prima !== 'erogata') nuovi.add(id)
    }
    precedenti.current = attuali
    if (!nuovi.size) return undefined
    setAppena(nuovi)
    // Tolta la classe, il segmento resta pieno: l'animazione non si ripete
    // al primo ridisegno che capita.
    const timer = setTimeout(() => setAppena(NIENTE), 400)
    return () => clearTimeout(timer)
  }, [lezioni])

  return appena
}
