/* I programmi sono i template: qui sta il risparmio di tempo vero, perché un
   corso già erogato non si riscrive, si duplica. */

import { useState } from 'react'
import FormCorsoDaProgramma from '../componenti/FormCorsoDaProgramma.jsx'
import FormProgramma from '../componenti/FormProgramma.jsx'
import { useDati } from '../dati/store.jsx'
import { coloreTipologia, nomeTipologia } from '../lib/costanti.js'
import { formattaOre } from '../lib/date.js'

export default function Programmi({ vai }) {
  const { programmi, corsi } = useDati()
  const [inCreazione, setInCreazione] = useState(null)
  const [inModifica, setInModifica] = useState(null)

  return (
    <>
      <div className="intestazione">
        <div>
          <h1>Programmi</h1>
          <p className="dati tenue">{programmi.length} template riutilizzabili</p>
        </div>
        <div className="intestazione__azioni">
          <button type="button" className="btn btn-primario" onClick={() => setInModifica({})}>
            Nuovo programma
          </button>
        </div>
      </div>

      {!programmi.length ? (
        <div className="vuoto">
          <h2>Nessun programma</h2>
          <p>Scrivi qui la scaletta di un corso: la riuserai a ogni edizione.</p>
        </div>
      ) : (
        <div className="righe">
          {programmi.map((p) => {
            const usato = corsi.filter((c) => c.programmaId === p.id).length
            return (
              <article className="riga" key={p.id}>
                <div className="riga__testata">
                  <h2 className="riga__titolo">{p.titolo}</h2>
                  <div className="intestazione__azioni">
                    <button
                      type="button"
                      className="btn btn-fantasma btn-piccolo"
                      onClick={() => setInModifica(p)}
                    >
                      Modifica
                    </button>
                    <button type="button" className="btn btn-piccolo" onClick={() => setInCreazione(p)}>
                      Crea corso da questo programma
                    </button>
                  </div>
                </div>

                <div className="riga__meta">
                  <span>{p.sigla}</span>
                  <span>{nomeTipologia(p.tipologia)}</span>
                  <span>{formattaOre(p.oreTotali)} ore</span>
                  <span>{p.moduli.length} moduli</span>
                  <span>versione {p.versione}</span>
                  <span>{usato ? `usato in ${usato} corsi` : 'mai usato'}</span>
                </div>

                <div className="riga__corpo">
                  <ul className="moduli">
                    {p.moduli.map((m) => (
                      <li
                        className="modulo"
                        key={m.n}
                        style={{ '--colore': coloreTipologia(p.tipologia) }}
                      >
                        <span className="modulo__n">M{String(m.n).padStart(2, '0')}</span>
                        <span className="modulo__titolo">{m.titolo}</span>
                        <span className="dati tenue">{formattaOre(m.ore)} ore</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {inCreazione && (
        <FormCorsoDaProgramma
          programma={inCreazione}
          onChiudi={() => setInCreazione(null)}
          onCreato={(id) => {
            setInCreazione(null)
            vai('corsi', id)
          }}
        />
      )}

      {inModifica && (
        <FormProgramma
          programma={inModifica.id ? inModifica : null}
          onChiudi={() => setInModifica(null)}
        />
      )}
    </>
  )
}
