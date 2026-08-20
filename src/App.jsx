/* Guscio dell'app: navigazione e scelta della schermata. Le schermate stanno
   una per file dentro `src/schermate`. */

import { useEffect, useState } from 'react'
import {
  IconaCorsi,
  IconaEnti,
  IconaMateriali,
  IconaNumeri,
  IconaProgrammi,
  IconaSettimana,
} from './componenti/Icone.jsx'
import Corsi from './schermate/Corsi.jsx'
import DettaglioCorso from './schermate/DettaglioCorso.jsx'
import Enti from './schermate/Enti.jsx'
import Materiali from './schermate/Materiali.jsx'
import Numeri from './schermate/Numeri.jsx'
import Programmi from './schermate/Programmi.jsx'
import Settimana from './schermate/Settimana.jsx'
import { useDati } from './dati/store.jsx'
import { configurato, OWNER_UID } from './dati/config.js'
import { entra, esci, osservaAccesso } from './dati/accesso.js'
import { indirizzo, useRotta } from './lib/rotta.js'

const VOCI = [
  { id: 'settimana', nome: 'Settimana', Icona: IconaSettimana, telefono: true },
  { id: 'corsi', nome: 'Corsi', Icona: IconaCorsi, telefono: true },
  { id: 'programmi', nome: 'Programmi', Icona: IconaProgrammi },
  { id: 'materiali', nome: 'Materiali', Icona: IconaMateriali, telefono: true },
  { id: 'enti', nome: 'Enti', Icona: IconaEnti },
  { id: 'numeri', nome: 'Numeri', Icona: IconaNumeri, telefono: true },
]

export default function App() {
  const { pronto, errore, enti, materiali, azioni } = useDati()
  const { sezione, dettaglio, vai } = useRotta()
  const utente = useAccesso()

  if (configurato && utente === undefined) return <Attesa testo="Controllo l'accesso…" />
  if (configurato && utente === null) return <Accesso />
  if (configurato && OWNER_UID && utente.uid !== OWNER_UID) return <NonTuo onEsci={esci} />

  const daSistemare = materiali.filter((m) => m.parsingOk === false).length

  const schermata = () => {
    switch (sezione) {
      case 'corsi':
        return dettaglio ? <DettaglioCorso corsoId={dettaglio} vai={vai} /> : <Corsi />
      case 'programmi':
        return <Programmi vai={vai} />
      case 'materiali':
        return <Materiali />
      case 'enti':
        return <Enti />
      case 'numeri':
        return <Numeri />
      default:
        return <Settimana />
    }
  }

  return (
    <div className="app">
      <nav className="nav-lato" aria-label="Sezioni">
        {VOCI.map(({ id, nome, Icona }) => (
          <a
            key={id}
            className="nav-lato__voce"
            href={indirizzo(id)}
            aria-current={sezione === id ? 'page' : undefined}
          >
            <Icona className="nav-lato__icona" />
            <span className="nav-lato__testo">{nome}</span>
          </a>
        ))}

        {enti.length > 0 && (
          <div className="nav-lato__sigle">
            {enti.slice(0, 6).map((e) => (
              <a key={e.id} className="nav-lato__sigla" href={indirizzo('enti')} title={e.nome}>
                {e.sigla}
              </a>
            ))}
          </div>
        )}
      </nav>

      <main className="contenuto">
        {errore && (
          <p className="avviso">
            Firestore non risponde: {errore.message}. Controlla le regole e la connessione.
          </p>
        )}

        {pronto ? schermata() : <Attesa testo="Carico i corsi…" />}

        {azioni.modalita === 'demo' && (
          <p className="dati tenue" style={{ marginTop: 'var(--s-7)' }}>
            Modalità demo: i dati stanno in questo browser. Riempi <code>.env.local</code> per
            passare a Firestore.{' '}
            <button type="button" className="btn btn-fantasma btn-piccolo" onClick={azioni.ripristinaDemo}>
              Rimetti i dati di esempio
            </button>
          </p>
        )}
      </main>

      <nav className="nav-basso" aria-label="Sezioni">
        {VOCI.filter((v) => v.telefono).map(({ id, nome, Icona }) => (
          <a
            key={id}
            className="nav-basso__voce"
            href={indirizzo(id)}
            aria-current={sezione === id ? 'page' : undefined}
          >
            <Icona className="nav-basso__icona" />
            <span className="nav-basso__testo">
              {nome}
              {id === 'materiali' && daSistemare > 0 && <span className="badge">{daSistemare}</span>}
            </span>
          </a>
        ))}
      </nav>
    </div>
  )
}

/** `undefined` finché non si sa, `null` se nessuno è entrato. */
function useAccesso() {
  const [utente, setUtente] = useState(configurato ? undefined : null)

  useEffect(() => {
    if (!configurato) return undefined
    return osservaAccesso((u) => setUtente(u ?? null))
  }, [])

  return utente
}

function Attesa({ testo }) {
  return (
    <div className="vuoto">
      <p>{testo}</p>
    </div>
  )
}

function Accesso() {
  const [errore, setErrore] = useState(null)

  return (
    <main className="contenuto">
      <div className="vuoto" style={{ maxWidth: '480px', margin: '15vh auto 0' }}>
        <h2>Gestionale formazione</h2>
        <p style={{ marginBottom: 'var(--s-4)' }}>Entra con il tuo account Google per vedere i corsi.</p>
        {errore && <p className="avviso">{errore}</p>}
        <button
          type="button"
          className="btn btn-primario"
          onClick={() => entra().catch(() => setErrore('Accesso non riuscito. Riprova.'))}
        >
          Entra con Google
        </button>
      </div>
    </main>
  )
}

function NonTuo({ onEsci }) {
  return (
    <main className="contenuto">
      <div className="vuoto" style={{ maxWidth: '480px', margin: '15vh auto 0' }}>
        <h2>Questo account non è il tuo</h2>
        <p style={{ marginBottom: 'var(--s-4)' }}>
          I dati sono leggibili solo dall'account proprietario.
        </p>
        <button type="button" className="btn" onClick={onEsci}>
          Esci
        </button>
      </div>
    </main>
  )
}
