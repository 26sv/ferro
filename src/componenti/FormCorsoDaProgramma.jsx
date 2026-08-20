/* "Crea corso da questo programma": i moduli sono già scritti, qui si dice
   solo per chi, da quando e dove. Le date proposte si vedono prima di
   confermare. */

import { useMemo, useState } from 'react'
import Modale from './Modale.jsx'
import { pianificaDate, useDati } from '../dati/store.jsx'
import { MODALITA } from '../lib/costanti.js'
import { aChiave, dataBreve, formattaOre, minutiDaOra, oraDaMinuti } from '../lib/date.js'

const GIORNI = [
  { n: 1, nome: 'lun' },
  { n: 2, nome: 'mar' },
  { n: 3, nome: 'mer' },
  { n: 4, nome: 'gio' },
  { n: 5, nome: 'ven' },
  { n: 6, nome: 'sab' },
]

export default function FormCorsoDaProgramma({ programma, onChiudi, onCreato }) {
  const { enti, azioni } = useDati()
  const [bozza, setBozza] = useState(() => ({
    enteId: enti[0]?.id ?? '',
    dataInizio: aChiave(new Date()),
    giorni: [2, 4],
    oraInizio: '14:00',
    luogo: '',
    modalita: 'presenza',
    edizione: String(new Date().getFullYear()),
  }))
  const [errore, setErrore] = useState(null)
  const [inCorso, setInCorso] = useState(false)

  const anteprima = useMemo(() => {
    if (!bozza.dataInizio) return []
    const date = pianificaDate(bozza.dataInizio, bozza.giorni, programma.moduli.length)
    return programma.moduli.map((m, i) => ({
      modulo: m,
      data: date[i],
      oraFine: oraDaMinuti(minutiDaOra(bozza.oraInizio) + m.ore * 60),
    }))
  }, [bozza.dataInizio, bozza.giorni, bozza.oraInizio, programma.moduli])

  const cambia = (campo) => (e) => setBozza((b) => ({ ...b, [campo]: e.target.value }))

  const giraGiorno = (n) =>
    setBozza((b) => ({
      ...b,
      giorni: b.giorni.includes(n) ? b.giorni.filter((x) => x !== n) : [...b.giorni, n].sort(),
    }))

  async function crea(e) {
    e.preventDefault()
    if (!bozza.enteId) {
      setErrore('Scegli l’ente.')
      return
    }
    if (!bozza.giorni.length) {
      setErrore('Scegli almeno un giorno della settimana.')
      return
    }
    setInCorso(true)
    try {
      const id = await azioni.creaCorsoDaProgramma({ programmaId: programma.id, ...bozza })
      onCreato?.(id)
    } catch {
      setErrore('Non sono riuscito a creare il corso. Riprova.')
      setInCorso(false)
    }
  }

  return (
    <Modale
      titolo="Crea corso"
      sottotitolo={`${programma.sigla} · ${formattaOre(programma.oreTotali)} ore in ${programma.moduli.length} moduli`}
      onChiudi={onChiudi}
      piede={
        <>
          <button type="submit" form="form-corso" className="btn btn-primario" disabled={inCorso}>
            Crea il corso
          </button>
          <button type="button" className="btn btn-fantasma" onClick={onChiudi}>
            Lascia stare
          </button>
        </>
      }
    >
      <form id="form-corso" onSubmit={crea} className="campi">
        {errore && <p className="avviso">{errore}</p>}

        <label className="campo">
          <span className="etichetta">Ente</span>
          <select value={bozza.enteId} onChange={cambia('enteId')}>
            {enti.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </label>

        <div className="riga-campi">
          <label className="campo campo--data">
            <span className="etichetta">Si parte il</span>
            <input type="date" value={bozza.dataInizio} onChange={cambia('dataInizio')} required />
          </label>
          <label className="campo campo--ora">
            <span className="etichetta">Dalle</span>
            <input type="time" value={bozza.oraInizio} onChange={cambia('oraInizio')} required />
          </label>
          <label className="campo">
            <span className="etichetta">Edizione</span>
            <input value={bozza.edizione} onChange={cambia('edizione')} />
          </label>
        </div>

        <div className="campo">
          <span className="etichetta">Giorni</span>
          <div className="filtri" style={{ margin: 0 }}>
            {GIORNI.map((g) => (
              <button
                key={g.n}
                type="button"
                className="chip"
                aria-pressed={bozza.giorni.includes(g.n)}
                onClick={() => giraGiorno(g.n)}
              >
                {g.nome}
              </button>
            ))}
          </div>
        </div>

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

        <div className="campo">
          <span className="etichetta">Lezioni che nascono</span>
          <ul className="moduli">
            {anteprima.map(({ modulo, data, oraFine }) => (
              <li className="modulo" key={modulo.n} style={{ '--colore': 'var(--bordo)' }}>
                <span className="modulo__n">M{String(modulo.n).padStart(2, '0')}</span>
                <span className="modulo__titolo">{modulo.titolo}</span>
                <span className="dati tenue">
                  {dataBreve(data)} · {bozza.oraInizio}–{oraFine}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </form>
    </Modale>
  )
}
