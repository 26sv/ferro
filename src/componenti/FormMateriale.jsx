/* Scheda di un materiale: tipo, tag, e a quali lezioni è collegato.
   Il file su Drive non si tocca mai da qui: qui ci sono solo i riferimenti. */

import { useState } from 'react'
import Modale from './Modale.jsx'
import { useDati } from '../dati/store.jsx'
import { TIPI_MATERIALE } from '../lib/costanti.js'
import { dataBreve } from '../lib/date.js'
import { lezioniDelCorso } from '../lib/calcoli.js'

export default function FormMateriale({ materiale, onChiudi }) {
  const { corsi, lezioni, azioni } = useDati()
  const [bozza, setBozza] = useState(() => ({
    tipo: 'materiale',
    versione: 1,
    corsoId: null,
    lezioniIds: [],
    tag: [],
    riutilizzabile: false,
    ...materiale,
  }))
  const [inCancellazione, setInCancellazione] = useState(false)
  const [errore, setErrore] = useState(null)

  const suoi = bozza.corsoId ? lezioniDelCorso(lezioni, bozza.corsoId) : []

  const giraLezione = (id) =>
    setBozza((b) => ({
      ...b,
      lezioniIds: b.lezioniIds.includes(id)
        ? b.lezioniIds.filter((x) => x !== id)
        : [...b.lezioniIds, id],
    }))

  async function salva(e) {
    e.preventDefault()
    try {
      await azioni.salvaMateriale({
        ...bozza,
        versione: Number(bozza.versione) || 1,
        tag: Array.isArray(bozza.tag) ? bozza.tag : [],
      })
      onChiudi()
    } catch {
      setErrore('Non sono riuscito a salvare. Riprova.')
    }
  }

  return (
    <Modale
      titolo="Materiale"
      sottotitolo={materiale.nome}
      onChiudi={onChiudi}
      piede={
        <>
          <button type="submit" form="form-materiale" className="btn btn-primario">
            Salva
          </button>
          {materiale.webViewLink && (
            <a className="btn" href={materiale.webViewLink} target="_blank" rel="noreferrer">
              Apri su Drive
            </a>
          )}
          <button
            type="button"
            className="btn btn-fantasma a-destra"
            onClick={() => setInCancellazione(true)}
          >
            Togli il riferimento
          </button>
        </>
      }
    >
      {inCancellazione ? (
        <div className="campi">
          <p>
            Tolgo il riferimento a questo file. Il file su Drive resta dov'è: sparisce solo da
            qui dentro.
          </p>
          <div className="modale__piede" style={{ borderTop: 0, marginTop: 0 }}>
            <button
              type="button"
              className="btn btn-primario"
              onClick={async () => {
                await azioni.eliminaMateriale(materiale.id)
                onChiudi()
              }}
            >
              Togli il riferimento
            </button>
            <button type="button" className="btn" onClick={() => setInCancellazione(false)}>
              Lascia stare
            </button>
          </div>
        </div>
      ) : (
        <form id="form-materiale" onSubmit={salva} className="campi">
          {errore && <p className="avviso">{errore}</p>}

          <div className="riga-campi">
            <label className="campo">
              <span className="etichetta">Tipo</span>
              <select
                value={bozza.tipo}
                onChange={(e) => setBozza((b) => ({ ...b, tipo: e.target.value }))}
              >
                {TIPI_MATERIALE.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="campo">
              <span className="etichetta">Versione</span>
              <input
                type="number"
                min="1"
                value={bozza.versione}
                onChange={(e) => setBozza((b) => ({ ...b, versione: e.target.value }))}
              />
            </label>
          </div>

          <label className="campo">
            <span className="etichetta">Corso</span>
            <select
              value={bozza.corsoId ?? ''}
              onChange={(e) =>
                setBozza((b) => ({
                  ...b,
                  corsoId: e.target.value || null,
                  lezioniIds: [],
                  riutilizzabile: !e.target.value,
                }))
              }
            >
              <option value="">Libreria trasversale</option>
              {corsi.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.corsoSigla} · {c.enteSigla} · {c.edizione}
                </option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span className="etichetta">Tag, separati da virgola</span>
            <input
              value={(bozza.tag ?? []).join(', ')}
              onChange={(e) =>
                setBozza((b) => ({
                  ...b,
                  tag: e.target.value
                    .split(',')
                    .map((t) => t.trim().toLowerCase())
                    .filter(Boolean),
                }))
              }
              placeholder="prompting, canva"
            />
          </label>

          <label className="chip" style={{ alignSelf: 'flex-start' }}>
            <input
              type="checkbox"
              checked={Boolean(bozza.riutilizzabile)}
              onChange={(e) => setBozza((b) => ({ ...b, riutilizzabile: e.target.checked }))}
            />
            Riutilizzabile in altri corsi
          </label>

          {suoi.length > 0 && (
            <div className="campo">
              <span className="etichetta">Lezioni in cui lo uso</span>
              <ul className="moduli">
                {suoi.map((l) => (
                  <li className="modulo" key={l.id} style={{ '--colore': 'var(--bordo)' }}>
                    <input
                      type="checkbox"
                      checked={bozza.lezioniIds.includes(l.id)}
                      onChange={() => giraLezione(l.id)}
                      aria-label={`Collega a M${String(l.moduloN).padStart(2, '0')}`}
                    />
                    <span className="modulo__titolo">
                      M{String(l.moduloN).padStart(2, '0')} · {l.titolo}
                    </span>
                    <span className="dati tenue">{dataBreve(l.data)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      )}
    </Modale>
  )
}
