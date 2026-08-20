/* Elenco dei corsi con l'avanzamento del monte ore. Una riga per corso: la
   barra dice a colpo d'occhio quanto è stato erogato e quando si torna. */

import { useState } from 'react'
import BarraMonteOre from '../componenti/BarraMonteOre.jsx'
import { useDati } from '../dati/store.jsx'
import { indirizzo } from '../lib/rotta.js'
import { intervalloEsteso, formattaOre } from '../lib/date.js'

const FILTRI = [
  { id: 'attivi', nome: 'Attivi' },
  { id: 'conclusi', nome: 'Conclusi' },
  { id: 'tutti', nome: 'Tutti' },
]

export default function Corsi() {
  const { corsi, lezioni, programmi, enti } = useDati()
  const [filtro, setFiltro] = useState('attivi')

  const visibili = corsi.filter((c) => {
    if (filtro === 'attivi') return c.stato === 'in corso' || c.stato === 'pianificato'
    if (filtro === 'conclusi') return c.stato === 'concluso' || c.stato === 'annullato'
    return true
  })

  return (
    <>
      <div className="intestazione">
        <div>
          <h1>Corsi</h1>
          <p className="dati tenue">{corsi.length} in tutto</p>
        </div>
        <div className="intestazione__azioni">
          <a className="btn btn-fantasma" href={indirizzo('enti')}>
            Enti
          </a>
          <a className="btn btn-primario" href={indirizzo('programmi')}>
            Parti da un programma
          </a>
        </div>
      </div>

      <div className="filtri">
        {FILTRI.map((f) => (
          <button
            key={f.id}
            type="button"
            className="chip"
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
          >
            {f.nome}
          </button>
        ))}
      </div>

      {!visibili.length ? (
        <div className="vuoto">
          <h2>Nessun corso attivo</h2>
          <p>Parti da un programma e scegli l'ente.</p>
        </div>
      ) : (
        <div className="righe">
          {visibili.map((corso) => {
            const sue = lezioni.filter((l) => l.corsoId === corso.id)
            const programma = programmi.find((p) => p.id === corso.programmaId)
            const ente = enti.find((e) => e.id === corso.enteId)
            return (
              <article className="riga" key={corso.id}>
                <div className="riga__testata">
                  <a className="riga__titolo" href={indirizzo('corsi', corso.id)}>
                    {programma?.titolo ?? corso.corsoSigla}
                  </a>
                  <span className={`stato stato--${corso.stato.replace(' ', '-')}`}>{corso.stato}</span>
                </div>

                <div className="riga__meta">
                  <span>{ente?.nome ?? corso.enteSigla}</span>
                  <span>{corso.edizione}</span>
                  <span>{intervalloEsteso(corso.periodo?.inizio, corso.periodo?.fine)}</span>
                  <span>{formattaOre(corso.oreTotali)} ore</span>
                </div>

                <div className="riga__corpo">
                  <BarraMonteOre
                    lezioni={sue}
                    oreTotali={corso.oreTotali}
                    tipologia={corso.tipologia}
                    titolo={
                      <>
                        <span className="barra-ore__sigla">{corso.corsoSigla}</span> ·{' '}
                        {ente?.nome ?? corso.enteSigla}
                      </>
                    }
                  />
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
