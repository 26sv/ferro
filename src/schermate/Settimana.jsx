/* La schermata che si apre per prima: cosa c'è questa settimana, e nient'altro.
   Su schermo largo è la griglia oraria dell'aula, su telefono un'agenda per
   giorno. Toccare uno spazio libero apre già la lezione giusta, con giorno e
   ora compilati. */

import { useMemo, useState } from 'react'
import BarraMonteOre from '../componenti/BarraMonteOre.jsx'
import FormLezione from '../componenti/FormLezione.jsx'
import { useDati } from '../dati/store.jsx'
import { coloreTipologia } from '../lib/costanti.js'
import {
  aChiave,
  aggiungiGiorni,
  dataEstesa,
  giorniSettimana,
  intervalloEsteso,
  minutiDaOra,
  nomeGiornoBreve,
  nomeMese,
  numeroSettimana,
  oraDaMinuti,
  stessoGiorno,
} from '../lib/date.js'
import { lezioniTra } from '../lib/calcoli.js'
import { useSchermoStretto } from '../lib/schermo.js'

const PRIMA_ORA = 9
const ULTIMA_ORA = 19

export default function Settimana() {
  const { lezioni, corsi } = useDati()
  const [ancora, setAncora] = useState(() => new Date())
  const [inModifica, setInModifica] = useState(null)
  const stretto = useSchermoStretto()

  const giorni = useMemo(() => giorniSettimana(ancora), [ancora])
  const dellaSettimana = useMemo(
    () => lezioniTra(lezioni, giorni[0], giorni[6]),
    [lezioni, giorni],
  )

  // L'intervallo orario si allarga per contenere le lezioni fuori orario.
  const { prima, ultima } = useMemo(() => {
    let a = PRIMA_ORA
    let b = ULTIMA_ORA
    for (const l of dellaSettimana) {
      a = Math.min(a, Math.floor(minutiDaOra(l.oraInizio) / 60))
      b = Math.max(b, Math.ceil(minutiDaOra(l.oraFine) / 60))
    }
    return { prima: a, ultima: b }
  }, [dellaSettimana])

  const fasce = Array.from({ length: ultima - prima }, (_, i) => prima + i)
  const altezza = `calc(${fasce.length} * var(--altezza-ora))`

  const perGiorno = (giorno) =>
    dellaSettimana
      .filter((l) => stessoGiorno(l.data, giorno))
      .sort((a, b) => minutiDaOra(a.oraInizio) - minutiDaOra(b.oraInizio))

  const corsiAttivi = corsi.filter((c) => c.stato === 'in corso' || c.stato === 'pianificato')

  const nuovaLezione = (giorno, ora) =>
    setInModifica({
      data: aChiave(giorno),
      oraInizio: oraDaMinuti((ora ?? 14) * 60),
      oraFine: oraDaMinuti(((ora ?? 14) + 4) * 60),
      corsoId: corsiAttivi[0]?.id ?? corsi[0]?.id ?? '',
    })

  return (
    <>
      <div className="intestazione">
        <div>
          <h1>Settimana {numeroSettimana(giorni[0])}</h1>
          <p className="dati tenue">{intervalloEsteso(giorni[0], giorni[6])}</p>
        </div>
        <div className="intestazione__azioni">
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => setAncora(aggiungiGiorni(ancora, -7))}
          >
            ‹<span className="solo-lettori">Settimana precedente</span>
          </button>
          <button type="button" className="btn btn-fantasma" onClick={() => setAncora(new Date())}>
            Oggi
          </button>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => setAncora(aggiungiGiorni(ancora, 7))}
          >
            ›<span className="solo-lettori">Settimana successiva</span>
          </button>
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => nuovaLezione(new Date(), 14)}
            disabled={!corsi.length}
          >
            Nuova lezione
          </button>
        </div>
      </div>

      {!corsi.length ? (
        <div className="vuoto">
          <h2>Non c'è ancora nessun corso</h2>
          <p>Parti da un programma e scegli l'ente: le lezioni finiscono qui da sole.</p>
        </div>
      ) : stretto ? (
        <Agenda giorni={giorni} perGiorno={perGiorno} onApri={setInModifica} onNuova={nuovaLezione} />
      ) : (
        <Griglia
          giorni={giorni}
          fasce={fasce}
          prima={prima}
          altezza={altezza}
          perGiorno={perGiorno}
          onApri={setInModifica}
          onNuova={nuovaLezione}
        />
      )}

      {corsiAttivi.length > 0 && (
        <section className="sezione" style={{ marginTop: 'var(--s-6)' }}>
          <h2 className="sezione__titolo">Come stanno andando</h2>
          <div className="righe">
            {corsiAttivi.map((c) => (
              <div className="riga" key={c.id}>
                <BarraMonteOre
                  lezioni={lezioni.filter((l) => l.corsoId === c.id)}
                  oreTotali={c.oreTotali}
                  tipologia={c.tipologia}
                  titolo={
                    <>
                      <span className="barra-ore__sigla">{c.corsoSigla}</span> · {c.enteSigla}
                    </>
                  }
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {inModifica && (
        <FormLezione
          lezione={inModifica}
          onChiudi={() => setInModifica(null)}
        />
      )}
    </>
  )
}

/* ---------- Griglia oraria ---------- */

function Griglia({ giorni, fasce, prima, altezza, perGiorno, onApri, onNuova }) {
  const oggi = new Date()

  return (
    <section className="settimana">
      <div className="settimana__giorni">
        <div className="settimana__angolo" />
        {giorni.map((g) => (
          <button
            type="button"
            key={aChiave(g)}
            className={`settimana__giorno${stessoGiorno(g, oggi) ? ' settimana__giorno--oggi' : ''}`}
            onClick={() => onNuova(g, 14)}
            title={`Aggiungi una lezione, ${dataEstesa(g)}`}
          >
            <span className="settimana__giorno-nome">{nomeGiornoBreve(g)}</span>
            <span className="settimana__giorno-numero">{g.getDate()}</span>
          </button>
        ))}
      </div>

      <div className="settimana__corpo">
        <div className="settimana__ore" style={{ height: altezza }} aria-hidden="true">
          {fasce.map((h, i) => (
            <span
              key={h}
              className="settimana__ora"
              style={{ top: `calc(${i} * var(--altezza-ora))` }}
            >
              {String(h).padStart(2, '0')}
            </span>
          ))}
        </div>

        {giorni.map((g) => {
          const festivo = g.getDay() === 0
          const oggiQui = stessoGiorno(g, oggi)
          return (
            <div
              key={aChiave(g)}
              className={[
                'settimana__colonna',
                festivo ? 'settimana__colonna--festivo' : '',
                oggiQui ? 'settimana__colonna--oggi' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ height: altezza }}
            >
              {/* Celle vuote: comodità del clic. Chi usa la tastiera aggiunge
                  dalla testata del giorno o dal bottone in alto. */}
              {fasce.map((h, i) => (
                <div
                  key={h}
                  className="settimana__vuoto"
                  style={{ top: `calc(${i} * var(--altezza-ora))` }}
                  onClick={() => onNuova(g, h)}
                  aria-hidden="true"
                />
              ))}

              {perGiorno(g).map((l) => (
                <BloccoLezione key={l.id} lezione={l} prima={prima} onApri={onApri} />
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function BloccoLezione({ lezione, prima, onApri }) {
  const inizio = minutiDaOra(lezione.oraInizio) / 60 - prima
  const durata = Math.max(0.75, minutiDaOra(lezione.oraFine) / 60 - minutiDaOra(lezione.oraInizio) / 60)

  return (
    <button
      type="button"
      className={`lezione lezione--${lezione.stato}`}
      style={{
        '--colore': coloreTipologia(lezione.tipologia),
        top: `calc(${inizio} * var(--altezza-ora) + 2px)`,
        height: `calc(${durata} * var(--altezza-ora) - 5px)`,
      }}
      onClick={() => onApri(lezione)}
    >
      <span className="lezione__ora">
        {lezione.oraInizio}–{lezione.oraFine}
      </span>
      <span className="lezione__titolo">{lezione.titolo || lezione.corsoSigla}</span>
      <span className="lezione__meta">
        {lezione.enteSigla} · M{String(lezione.moduloN).padStart(2, '0')}
        {lezione.luogo ? ` · ${lezione.luogo}` : ''}
      </span>
    </button>
  )
}

/* ---------- Agenda (telefono) ---------- */

function Agenda({ giorni, perGiorno, onApri, onNuova }) {
  const oggi = new Date()

  return (
    <div className="agenda">
      {giorni.map((g) => {
        const lezioni = perGiorno(g)
        const oggiQui = stessoGiorno(g, oggi)
        return (
          <section
            key={aChiave(g)}
            className={`agenda__giorno${oggiQui ? ' agenda__giorno--oggi' : ''}`}
          >
            <div className="agenda__data">
              <span className="agenda__nome">{nomeGiornoBreve(g)}</span>
              <span className="agenda__numero">
                {g.getDate()} {nomeMese(g)}
              </span>
            </div>

            {lezioni.length ? (
              <div className="agenda__lezioni">
                {lezioni.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={`lezione lezione--${l.stato}`}
                    style={{ '--colore': coloreTipologia(l.tipologia) }}
                    onClick={() => onApri(l)}
                  >
                    <span className="lezione__ora">
                      {l.oraInizio}–{l.oraFine}
                    </span>
                    <span className="lezione__titolo">{l.titolo || l.corsoSigla}</span>
                    <span className="lezione__meta">
                      {l.corsoSigla} · {l.enteSigla} · M{String(l.moduloN).padStart(2, '0')}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" className="agenda__niente btn btn-fantasma" onClick={() => onNuova(g, 14)}>
                Libero. Aggiungi una lezione.
              </button>
            )}
          </section>
        )
      })}
    </div>
  )
}
