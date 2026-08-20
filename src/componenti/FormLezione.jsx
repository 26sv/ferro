/* Aggiunta e modifica di una lezione. Si apre dalla settimana toccando uno
   spazio libero, o da una lezione già in calendario. */

import { useMemo, useState } from 'react'
import Modale from './Modale.jsx'
import { useDati } from '../dati/store.jsx'
import { MODALITA } from '../lib/costanti.js'
import { dataEstesa, formattaOre, minutiDaOra, oraDaMinuti, oreTra } from '../lib/date.js'

export default function FormLezione({ lezione, onChiudi }) {
  const { corsi, programmi, azioni } = useDati()
  const [bozza, setBozza] = useState(() => ({
    corsoId: corsi[0]?.id ?? '',
    moduloN: 1,
    data: '',
    oraInizio: '14:00',
    oraFine: '18:00',
    luogo: '',
    modalita: 'presenza',
    stato: 'pianificata',
    titolo: '',
    note: '',
    ...lezione,
  }))
  const [salvataggio, setSalvataggio] = useState(false)
  const [errore, setErrore] = useState(null)

  const corso = corsi.find((c) => c.id === bozza.corsoId)
  const programma = programmi.find((p) => p.id === corso?.programmaId)
  const moduli = useMemo(() => programma?.moduli ?? [], [programma])
  const ore = oreTra(bozza.oraInizio, bozza.oraFine)
  const esistente = Boolean(lezione?.id)

  const cambia = (campo) => (e) => setBozza((b) => ({ ...b, [campo]: e.target.value }))

  /** Cambiando modulo si porta dietro titolo e durata previsti dal programma. */
  function cambiaModulo(e) {
    const n = Number(e.target.value)
    const modulo = moduli.find((m) => m.n === n)
    setBozza((b) => ({
      ...b,
      moduloN: n,
      titolo: modulo?.titolo ?? b.titolo,
      oraFine: modulo ? oraDaMinuti(minutiDaOra(b.oraInizio) + modulo.ore * 60) : b.oraFine,
    }))
  }

  async function salva(e) {
    e.preventDefault()
    if (!bozza.corsoId || !bozza.data) {
      setErrore('Servono il corso e la data.')
      return
    }
    if (ore <= 0) {
      setErrore('L’ora di fine deve venire dopo quella di inizio.')
      return
    }
    setSalvataggio(true)
    try {
      await azioni.salvaLezione(bozza)
      onChiudi()
    } catch {
      setErrore('Non sono riuscito a salvare. Riprova.')
      setSalvataggio(false)
    }
  }

  async function cambiaStato(stato) {
    setSalvataggio(true)
    try {
      if (esistente) await azioni.cambiaStatoLezione(lezione.id, stato)
      else await azioni.salvaLezione({ ...bozza, stato })
      onChiudi()
    } catch {
      setErrore('Non sono riuscito a salvare. Riprova.')
      setSalvataggio(false)
    }
  }

  async function elimina() {
    setSalvataggio(true)
    try {
      await azioni.eliminaLezione(lezione.id)
      onChiudi()
    } catch {
      setErrore('Non sono riuscito a eliminare la lezione. Riprova.')
      setSalvataggio(false)
    }
  }

  return (
    <Modale
      titolo={esistente ? 'Lezione' : 'Nuova lezione'}
      sottotitolo={bozza.data ? dataEstesa(bozza.data) : null}
      onChiudi={onChiudi}
      piede={
        <>
          <button type="submit" form="form-lezione" className="btn btn-primario" disabled={salvataggio}>
            Salva
          </button>
          {bozza.stato !== 'erogata' && (
            <button type="button" className="btn" onClick={() => cambiaStato('erogata')} disabled={salvataggio}>
              Segna erogata
            </button>
          )}
          {esistente && bozza.stato !== 'annullata' && (
            <button type="button" className="btn" onClick={() => cambiaStato('annullata')} disabled={salvataggio}>
              Segna annullata
            </button>
          )}
          {esistente && (
            <button
              type="button"
              className="btn btn-fantasma a-destra"
              onClick={elimina}
              disabled={salvataggio}
            >
              Elimina
            </button>
          )}
        </>
      }
    >
      <form id="form-lezione" onSubmit={salva} className="campi">
        {errore && <p className="avviso">{errore}</p>}

        <label className="campo">
          <span className="etichetta">Corso</span>
          <select value={bozza.corsoId} onChange={cambia('corsoId')}>
            {corsi.map((c) => (
              <option key={c.id} value={c.id}>
                {c.corsoSigla} · {c.enteSigla} · {c.edizione}
              </option>
            ))}
          </select>
        </label>

        <div className="riga-campi">
          <label className="campo">
            <span className="etichetta">Modulo</span>
            <select value={bozza.moduloN} onChange={cambiaModulo}>
              {(moduli.length ? moduli : [{ n: bozza.moduloN, titolo: '' }]).map((m) => (
                <option key={m.n} value={m.n}>
                  M{String(m.n).padStart(2, '0')} {m.titolo ? `· ${m.titolo}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="campo campo--data">
            <span className="etichetta">Data</span>
            <input type="date" value={bozza.data} onChange={cambia('data')} required />
          </label>
        </div>

        <div className="riga-campi">
          <label className="campo campo--ora">
            <span className="etichetta">Dalle</span>
            <input type="time" value={bozza.oraInizio} onChange={cambia('oraInizio')} required />
          </label>
          <label className="campo campo--ora">
            <span className="etichetta">Alle</span>
            <input type="time" value={bozza.oraFine} onChange={cambia('oraFine')} required />
          </label>
          <div className="campo">
            <span className="etichetta">Ore</span>
            <p className="dati" style={{ paddingTop: 'var(--s-2)' }}>
              {formattaOre(ore)}
            </p>
          </div>
        </div>

        <label className="campo">
          <span className="etichetta">Titolo</span>
          <input value={bozza.titolo} onChange={cambia('titolo')} placeholder="Titolo del modulo" />
        </label>

        <div className="riga-campi">
          <label className="campo">
            <span className="etichetta">Sede</span>
            <input value={bozza.luogo} onChange={cambia('luogo')} placeholder="Aula, indirizzo" />
          </label>
          <label className="campo">
            <span className="etichetta">Modalità</span>
            <select value={bozza.modalita} onChange={cambia('modalita')}>
              {MODALITA.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
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
