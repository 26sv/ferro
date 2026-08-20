/* Il programma è il template che si riusa: si scrive una volta e da lì
   nascono i corsi. Le ore totali sono la somma dei moduli, non un campo da
   tenere allineato a mano. */

import { useState } from 'react'
import Modale from './Modale.jsx'
import { useDati } from '../dati/store.jsx'
import { TIPOLOGIE } from '../lib/costanti.js'
import { formattaOre } from '../lib/date.js'
import { sigla as ripulisciSigla } from '../lib/nomiFile.js'

const MODULO_VUOTO = { n: 1, titolo: '', ore: 4, obiettivi: [], contenuti: [] }

const righe = (testo) =>
  String(testo ?? '')
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean)

export default function FormProgramma({ programma, onChiudi }) {
  const { azioni } = useDati()
  const [bozza, setBozza] = useState(() => ({
    titolo: '',
    sigla: '',
    tipologia: 'smm',
    moduli: [{ ...MODULO_VUOTO }],
    versione: 1,
    ...programma,
  }))
  const [errore, setErrore] = useState(null)
  const [inCorso, setInCorso] = useState(false)

  const oreTotali = bozza.moduli.reduce((s, m) => s + (Number(m.ore) || 0), 0)

  const cambia = (campo) => (e) => setBozza((b) => ({ ...b, [campo]: e.target.value }))

  const cambiaModulo = (i, campo, valore) =>
    setBozza((b) => ({
      ...b,
      moduli: b.moduli.map((m, k) => (k === i ? { ...m, [campo]: valore } : m)),
    }))

  const aggiungiModulo = () =>
    setBozza((b) => ({
      ...b,
      moduli: [...b.moduli, { ...MODULO_VUOTO, n: b.moduli.length + 1 }],
    }))

  const togliModulo = (i) =>
    setBozza((b) => ({
      ...b,
      moduli: b.moduli.filter((_, k) => k !== i).map((m, k) => ({ ...m, n: k + 1 })),
    }))

  async function salva(e) {
    e.preventDefault()
    if (!bozza.titolo.trim() || !bozza.sigla.trim()) {
      setErrore('Servono titolo e sigla.')
      return
    }
    setInCorso(true)
    try {
      await azioni.salvaProgramma({
        ...bozza,
        sigla: ripulisciSigla(bozza.sigla),
        oreTotali,
        moduli: bozza.moduli.map((m, i) => ({
          ...m,
          n: i + 1,
          ore: Number(m.ore) || 0,
          obiettivi: Array.isArray(m.obiettivi) ? m.obiettivi : righe(m.obiettivi),
          contenuti: Array.isArray(m.contenuti) ? m.contenuti : righe(m.contenuti),
        })),
        versione: programma?.id ? (programma.versione ?? 1) + 1 : 1,
      })
      onChiudi()
    } catch {
      setErrore('Non sono riuscito a salvare. Riprova.')
      setInCorso(false)
    }
  }

  return (
    <Modale
      titolo={programma?.id ? 'Programma' : 'Nuovo programma'}
      sottotitolo={`${formattaOre(oreTotali)} ore in ${bozza.moduli.length} moduli`}
      onChiudi={onChiudi}
      piede={
        <>
          <button type="submit" form="form-programma" className="btn btn-primario" disabled={inCorso}>
            Salva
          </button>
          {programma?.id && (
            <button
              type="button"
              className="btn btn-fantasma a-destra"
              onClick={async () => {
                await azioni.eliminaProgramma(programma.id)
                onChiudi()
              }}
            >
              Elimina
            </button>
          )}
        </>
      }
    >
      <form id="form-programma" onSubmit={salva} className="campi">
        {errore && <p className="avviso">{errore}</p>}

        <label className="campo">
          <span className="etichetta">Titolo</span>
          <input value={bozza.titolo} onChange={cambia('titolo')} required />
        </label>

        <div className="riga-campi">
          <label className="campo">
            <span className="etichetta">Sigla</span>
            <input
              value={bozza.sigla}
              onChange={(e) => setBozza((b) => ({ ...b, sigla: e.target.value.toUpperCase() }))}
              placeholder="SMMAI"
              required
            />
          </label>
          <label className="campo">
            <span className="etichetta">Tipologia</span>
            <select value={bozza.tipologia} onChange={cambia('tipologia')}>
              {TIPOLOGIE.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="campo">
          <span className="etichetta">Moduli</span>
          <div className="moduli">
            {bozza.moduli.map((m, i) => (
              <div className="modulo" key={i} style={{ '--colore': 'var(--bordo)', display: 'block' }}>
                <div className="riga-campi">
                  <label className="campo">
                    <span className="etichetta">M{String(i + 1).padStart(2, '0')} titolo</span>
                    <input
                      value={m.titolo}
                      onChange={(e) => cambiaModulo(i, 'titolo', e.target.value)}
                    />
                  </label>
                  <label className="campo">
                    <span className="etichetta">Ore</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={m.ore}
                      onChange={(e) => cambiaModulo(i, 'ore', e.target.value)}
                    />
                  </label>
                </div>

                <label className="campo" style={{ marginTop: 'var(--s-2)' }}>
                  <span className="etichetta">Obiettivi, uno per riga</span>
                  <textarea
                    value={Array.isArray(m.obiettivi) ? m.obiettivi.join('\n') : m.obiettivi}
                    onChange={(e) => cambiaModulo(i, 'obiettivi', righe(e.target.value))}
                  />
                </label>

                <label className="campo" style={{ marginTop: 'var(--s-2)' }}>
                  <span className="etichetta">Contenuti, uno per riga</span>
                  <textarea
                    value={Array.isArray(m.contenuti) ? m.contenuti.join('\n') : m.contenuti}
                    onChange={(e) => cambiaModulo(i, 'contenuti', righe(e.target.value))}
                  />
                </label>

                {bozza.moduli.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-fantasma btn-piccolo"
                    style={{ marginTop: 'var(--s-2)' }}
                    onClick={() => togliModulo(i)}
                  >
                    Togli il modulo
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-piccolo" style={{ marginTop: 'var(--s-3)' }} onClick={aggiungiModulo}>
            Aggiungi un modulo
          </button>
        </div>
      </form>
    </Modale>
  )
}
