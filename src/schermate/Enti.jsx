/* Anagrafica degli enti, con lo storico dei corsi e le ore erogate per
   ciascuno: la risposta a "quanto abbiamo fatto insieme finora". */

import { useState } from 'react'
import Modale from '../componenti/Modale.jsx'
import { useDati } from '../dati/store.jsx'
import { TIPI_ENTE } from '../lib/costanti.js'
import { formattaOre, intervalloEsteso } from '../lib/date.js'
import { oreErogate } from '../lib/calcoli.js'
import { sigla as ripulisciSigla } from '../lib/nomiFile.js'
import { indirizzo } from '../lib/rotta.js'

export default function Enti() {
  const { enti, corsi, lezioni } = useDati()
  const [inModifica, setInModifica] = useState(null)

  return (
    <>
      <div className="intestazione">
        <div>
          <h1>Enti</h1>
          <p className="dati tenue">{enti.length} tra aziende, enti e scuole</p>
        </div>
        <div className="intestazione__azioni">
          <button type="button" className="btn btn-primario" onClick={() => setInModifica({})}>
            Nuovo ente
          </button>
        </div>
      </div>

      {!enti.length ? (
        <div className="vuoto">
          <h2>Nessun ente</h2>
          <p>Aggiungi chi ti commissiona i corsi: la sigla finisce nei nomi dei file.</p>
        </div>
      ) : (
        <div className="righe">
          {enti.map((ente) => {
            const suoi = corsi.filter((c) => c.enteId === ente.id)
            const sueLezioni = lezioni.filter((l) => suoi.some((c) => c.id === l.corsoId))
            return (
              <article className="riga" key={ente.id}>
                <div className="riga__testata">
                  <h2 className="riga__titolo">{ente.nome}</h2>
                  <button
                    type="button"
                    className="btn btn-fantasma btn-piccolo"
                    onClick={() => setInModifica(ente)}
                  >
                    Modifica
                  </button>
                </div>

                <div className="riga__meta">
                  <span>{ente.sigla}</span>
                  <span>{ente.tipo}</span>
                  {ente.referente?.nome && <span>{ente.referente.nome}</span>}
                  {ente.referente?.email && <span>{ente.referente.email}</span>}
                  {ente.referente?.telefono && <span>{ente.referente.telefono}</span>}
                </div>

                <div className="riga__corpo">
                  <p className="numerone">{formattaOre(oreErogate(sueLezioni))}</p>
                  <p className="etichetta">ore erogate in {suoi.length} corsi</p>

                  {suoi.length > 0 && (
                    <ul className="moduli" style={{ marginTop: 'var(--s-3)' }}>
                      {suoi.map((c) => (
                        <li className="modulo" key={c.id} style={{ '--colore': 'var(--bordo)' }}>
                          <span className="modulo__n">{c.corsoSigla}</span>
                          <a className="modulo__titolo" href={indirizzo('corsi', c.id)}>
                            {c.edizione} · {intervalloEsteso(c.periodo?.inizio, c.periodo?.fine)}
                          </a>
                          <span className="dati tenue">
                            {formattaOre(c.oreErogate ?? 0)}/{formattaOre(c.oreTotali)} ore
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {ente.note && <p className="tenue" style={{ marginTop: 'var(--s-3)' }}>{ente.note}</p>}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {inModifica && (
        <FormEnte ente={inModifica.id ? inModifica : null} onChiudi={() => setInModifica(null)} />
      )}
    </>
  )
}

function FormEnte({ ente, onChiudi }) {
  const { azioni, corsi } = useDati()
  const [bozza, setBozza] = useState(() => ({
    nome: '',
    sigla: '',
    tipo: 'azienda',
    referente: { nome: '', email: '', telefono: '' },
    driveFolderId: null,
    note: '',
    ...ente,
  }))
  const [errore, setErrore] = useState(null)

  const cambia = (campo) => (e) => setBozza((b) => ({ ...b, [campo]: e.target.value }))
  const cambiaReferente = (campo) => (e) =>
    setBozza((b) => ({ ...b, referente: { ...b.referente, [campo]: e.target.value } }))

  const usato = ente ? corsi.some((c) => c.enteId === ente.id) : false

  async function salva(e) {
    e.preventDefault()
    if (!bozza.nome.trim() || !bozza.sigla.trim()) {
      setErrore('Servono nome e sigla.')
      return
    }
    try {
      await azioni.salvaEnte({ ...bozza, sigla: ripulisciSigla(bozza.sigla) })
      onChiudi()
    } catch {
      setErrore('Non sono riuscito a salvare. Riprova.')
    }
  }

  return (
    <Modale
      titolo={ente ? 'Ente' : 'Nuovo ente'}
      onChiudi={onChiudi}
      piede={
        <>
          <button type="submit" form="form-ente" className="btn btn-primario">
            Salva
          </button>
          {ente && !usato && (
            <button
              type="button"
              className="btn btn-fantasma a-destra"
              onClick={async () => {
                await azioni.eliminaEnte(ente.id)
                onChiudi()
              }}
            >
              Elimina
            </button>
          )}
        </>
      }
    >
      <form id="form-ente" onSubmit={salva} className="campi">
        {errore && <p className="avviso">{errore}</p>}

        <label className="campo">
          <span className="etichetta">Nome</span>
          <input value={bozza.nome} onChange={cambia('nome')} required />
        </label>

        <div className="riga-campi">
          <label className="campo">
            <span className="etichetta">Sigla</span>
            <input
              value={bozza.sigla}
              onChange={(e) => setBozza((b) => ({ ...b, sigla: e.target.value.toUpperCase() }))}
              placeholder="FILIPPORE"
              required
            />
          </label>
          <label className="campo">
            <span className="etichetta">Tipo</span>
            <select value={bozza.tipo} onChange={cambia('tipo')}>
              {TIPI_ENTE.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="riga-campi">
          <label className="campo">
            <span className="etichetta">Referente</span>
            <input value={bozza.referente?.nome ?? ''} onChange={cambiaReferente('nome')} />
          </label>
          <label className="campo">
            <span className="etichetta">Email</span>
            <input type="email" value={bozza.referente?.email ?? ''} onChange={cambiaReferente('email')} />
          </label>
          <label className="campo">
            <span className="etichetta">Telefono</span>
            <input value={bozza.referente?.telefono ?? ''} onChange={cambiaReferente('telefono')} />
          </label>
        </div>

        <label className="campo">
          <span className="etichetta">Note</span>
          <textarea value={bozza.note} onChange={cambia('note')} />
        </label>
      </form>
    </Modale>
  )
}
