/* Un corso per intero: barra del monte ore in cima, poi i moduli con la loro
   lezione e i materiali collegati. Da qui si segna una lezione erogata senza
   passare dal calendario. */

import { useState } from 'react'
import BarraMonteOre from '../componenti/BarraMonteOre.jsx'
import FormLezione from '../componenti/FormLezione.jsx'
import FormMateriale from '../componenti/FormMateriale.jsx'
import Modale from '../componenti/Modale.jsx'
import { useDati } from '../dati/store.jsx'
import { coloreTipologia } from '../lib/costanti.js'
import { dataBreve, formattaOre, intervalloEsteso } from '../lib/date.js'
import { lezioniDelCorso } from '../lib/calcoli.js'
import { indirizzo } from '../lib/rotta.js'
import { driveConfigurato, preparaCartelleCorso } from '../drive/appsScript.js'

export default function DettaglioCorso({ corsoId, vai }) {
  const { corsi, programmi, enti, lezioni, materiali, azioni } = useDati()
  const [inModifica, setInModifica] = useState(null)
  const [inCancellazione, setInCancellazione] = useState(false)
  const [inScheda, setInScheda] = useState(null)
  const [messaggio, setMessaggio] = useState(null)

  const corso = corsi.find((c) => c.id === corsoId)
  if (!corso) {
    return (
      <div className="vuoto">
        <h2>Questo corso non c'è più</h2>
        <p>
          Forse è stato eliminato. <a href={indirizzo('corsi')}>Torna ai corsi</a>.
        </p>
      </div>
    )
  }

  const programma = programmi.find((p) => p.id === corso.programmaId)
  const ente = enti.find((e) => e.id === corso.enteId)
  const sue = lezioniDelCorso(lezioni, corso.id)
  const suoiMateriali = materiali.filter(
    (m) => m.corsoId === corso.id || m.lezioniIds?.some((id) => sue.some((l) => l.id === id)),
  )

  const moduli = programma?.moduli ?? [
    ...new Map(sue.map((l) => [l.moduloN, { n: l.moduloN, titolo: l.titolo, ore: l.ore }])).values(),
  ]

  async function preparaCartelle() {
    setMessaggio('Preparo le cartelle su Drive…')
    try {
      const esito = await preparaCartelleCorso({
        enteSigla: corso.enteSigla,
        edizione: corso.edizione,
        corsoSigla: corso.corsoSigla,
        moduli: moduli.map((m) => m.n),
      })
      await azioni.salvaCorso({ ...corso, driveFolderId: esito.corsoFolderId })
      setMessaggio('Cartelle pronte su Drive.')
    } catch (errore) {
      setMessaggio(errore.message)
    }
  }

  return (
    <>
      <div className="intestazione">
        <div>
          <a className="dati tenue" href={indirizzo('corsi')}>
            ‹ Corsi
          </a>
          <h1>{programma?.titolo ?? corso.corsoSigla}</h1>
          <p className="riga__meta">
            <span>{ente?.nome ?? corso.enteSigla}</span>
            <span>{corso.edizione}</span>
            <span>{intervalloEsteso(corso.periodo?.inizio, corso.periodo?.fine)}</span>
            <span className={`stato stato--${corso.stato.replace(' ', '-')}`}>{corso.stato}</span>
          </p>
        </div>
        <div className="intestazione__azioni">
          {driveConfigurato && (
            <button type="button" className="btn btn-fantasma" onClick={preparaCartelle}>
              Prepara cartelle
            </button>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => setInModifica({ corsoId: corso.id, moduloN: moduli.length + 1 })}
          >
            Aggiungi lezione
          </button>
        </div>
      </div>

      {messaggio && <p className="avviso">{messaggio}</p>}

      <section className="sezione">
        <BarraMonteOre
          lezioni={sue}
          oreTotali={corso.oreTotali}
          tipologia={corso.tipologia}
          variante="dettaglio"
          titolo={
            <>
              <span className="barra-ore__sigla">{corso.corsoSigla}</span> ·{' '}
              <span className="barra-ore__sigla">{corso.enteSigla}</span>
            </>
          }
          onLezione={(l) => setInModifica(l)}
        />
      </section>

      <section className="sezione">
        <h2 className="sezione__titolo">Moduli</h2>
        <div className="moduli">
          {moduli.map((modulo) => {
            const lezione = sue.find((l) => l.moduloN === modulo.n)
            const collegati = suoiMateriali.filter((m) => m.lezioniIds?.includes(lezione?.id))
            return (
              <article
                className="modulo"
                key={modulo.n}
                style={{ '--colore': coloreTipologia(corso.tipologia) }}
              >
                <span className="modulo__n">M{String(modulo.n).padStart(2, '0')}</span>

                <div>
                  <p className="modulo__titolo">{modulo.titolo}</p>
                  {modulo.obiettivi?.length > 0 && (
                    <ul className="modulo__elenco">
                      {modulo.obiettivi.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  )}
                  {collegati.length > 0 && (
                    <p className="materiale__meta" style={{ marginTop: 'var(--s-2)' }}>
                      {collegati.map((m) => (
                        <span key={m.id}>{m.nome}</span>
                      ))}
                    </p>
                  )}
                </div>

                <div style={{ display: 'grid', gap: 'var(--s-2)', justifyItems: 'end' }}>
                  <span className="dati tenue">
                    {lezione ? `${dataBreve(lezione.data)} · ${lezione.oraInizio}` : 'da fissare'}
                  </span>
                  <span className="dati">{formattaOre(modulo.ore)} ore</span>
                  {lezione && lezione.stato === 'pianificata' && (
                    <button
                      type="button"
                      className="btn btn-piccolo"
                      onClick={() => azioni.cambiaStatoLezione(lezione.id, 'erogata')}
                    >
                      Segna erogata
                    </button>
                  )}
                  {lezione && lezione.stato !== 'pianificata' && (
                    <span className={`stato stato--${lezione.stato === 'erogata' ? 'in-corso' : 'annullato'}`}>
                      {lezione.stato}
                    </span>
                  )}
                  {!lezione && (
                    <button
                      type="button"
                      className="btn btn-piccolo"
                      onClick={() =>
                        setInModifica({
                          corsoId: corso.id,
                          moduloN: modulo.n,
                          titolo: modulo.titolo,
                        })
                      }
                    >
                      Metti in calendario
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="sezione">
        <h2 className="sezione__titolo">Materiali del corso</h2>
        {suoiMateriali.length ? (
          <div className="griglia-materiali">
            {suoiMateriali.map((m) => (
              <article
                className="materiale"
                key={m.id}
                style={{ '--colore': coloreTipologia(corso.tipologia) }}
              >
                <p className="materiale__nome">{m.nome}</p>
                <p className="materiale__meta">
                  <span>{m.tipo}</span>
                  <span>v{m.versione}</span>
                  {m.lezioniIds?.length > 1 && <span>{m.lezioniIds.length} lezioni</span>}
                  {!m.parsingOk && <span>fuori convenzione</span>}
                </p>
                <div className="materiale__azioni">
                  <button type="button" className="btn btn-piccolo" onClick={() => setInScheda(m)}>
                    Scheda
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="tenue">
            Ancora niente. I file arrivano da <a href={indirizzo('materiali')}>Materiali</a>.
          </p>
        )}
      </section>

      <section className="sezione">
        <button type="button" className="btn btn-fantasma" onClick={() => setInCancellazione(true)}>
          Elimina il corso
        </button>
      </section>

      {inModifica && <FormLezione lezione={inModifica} onChiudi={() => setInModifica(null)} />}

      {inScheda && <FormMateriale materiale={inScheda} onChiudi={() => setInScheda(null)} />}

      {inCancellazione && (
        <Modale
          titolo="Elimino il corso?"
          onChiudi={() => setInCancellazione(false)}
          piede={
            <>
              <button
                type="button"
                className="btn btn-primario"
                onClick={async () => {
                  await azioni.eliminaCorso(corso.id)
                  vai('corsi')
                }}
              >
                Elimina il corso
              </button>
              <button type="button" className="btn" onClick={() => setInCancellazione(false)}>
                Lascia stare
              </button>
            </>
          }
        >
          <p>
            Spariscono il corso e le sue {sue.length} lezioni. I file su Drive restano dove sono.
          </p>
        </Modale>
      )}
    </>
  )
}
