/* Deposito: l'unico punto in cui l'app scrive e legge i dati.

   Due attuazioni con la stessa interfaccia. Firestore quando il progetto è
   configurato, memoria + localStorage in modalità demo. Le collezioni sono
   piccole (un formatore, qualche centinaio di lezioni all'anno) quindi si
   tengono per intero in memoria: le schermate incrociano corsi, lezioni e
   materiali senza una query per riga. */

import { configurato } from './config.js'
import { nuovoId } from './identita.js'
import { costruisciSemi } from './semi.js'

export { nuovoId }

export const COLLEZIONI = ['enti', 'programmi', 'corsi', 'lezioni', 'materiali']

const CHIAVE_DEMO = 'formazione:demo-v1'

/* ---------- Demo ---------- */

class DepositoDemo {
  constructor() {
    this.modalita = 'demo'
    this.ascoltatori = new Map()
    this.dati = this.carica()
  }

  carica() {
    try {
      const grezzo = localStorage.getItem(CHIAVE_DEMO)
      if (grezzo) {
        const salvato = JSON.parse(grezzo)
        if (COLLEZIONI.every((c) => Array.isArray(salvato[c]))) return salvato
      }
    } catch {
      // Storage pieno o dati illeggibili: si riparte dal seed.
    }
    const semi = costruisciSemi()
    this.scrivi(semi)
    return semi
  }

  scrivi(dati) {
    try {
      localStorage.setItem(CHIAVE_DEMO, JSON.stringify(dati))
    } catch {
      // Senza storage la demo resta in memoria fino al ricaricamento.
    }
  }

  avvisa(collezione) {
    this.scrivi(this.dati)
    for (const cb of this.ascoltatori.get(collezione) ?? []) cb([...this.dati[collezione]])
  }

  osserva(collezione, callback) {
    if (!this.ascoltatori.has(collezione)) this.ascoltatori.set(collezione, new Set())
    this.ascoltatori.get(collezione).add(callback)
    callback([...(this.dati[collezione] ?? [])])
    return () => this.ascoltatori.get(collezione)?.delete(callback)
  }

  async crea(collezione, dati) {
    const id = dati.id ?? nuovoId(collezione.slice(0, 3))
    this.dati[collezione] = [...this.dati[collezione], { ...dati, id }]
    this.avvisa(collezione)
    return id
  }

  async aggiorna(collezione, id, modifiche) {
    this.dati[collezione] = this.dati[collezione].map((d) =>
      d.id === id ? { ...d, ...modifiche, id } : d,
    )
    this.avvisa(collezione)
  }

  async elimina(collezione, id) {
    this.dati[collezione] = this.dati[collezione].filter((d) => d.id !== id)
    this.avvisa(collezione)
  }

  /** Più scritture in un colpo solo. `operazioni`: {collezione, tipo, id, dati} */
  async lotto(operazioni) {
    const toccate = new Set()
    for (const op of operazioni) {
      toccate.add(op.collezione)
      if (op.tipo === 'crea') {
        const id = op.dati.id ?? nuovoId(op.collezione.slice(0, 3))
        this.dati[op.collezione] = [...this.dati[op.collezione], { ...op.dati, id }]
      } else if (op.tipo === 'aggiorna') {
        this.dati[op.collezione] = this.dati[op.collezione].map((d) =>
          d.id === op.id ? { ...d, ...op.dati, id: d.id } : d,
        )
      } else if (op.tipo === 'elimina') {
        this.dati[op.collezione] = this.dati[op.collezione].filter((d) => d.id !== op.id)
      }
    }
    for (const c of toccate) this.avvisa(c)
  }

  /** Riporta la demo ai dati di partenza. */
  async ripristina() {
    this.dati = costruisciSemi()
    for (const c of COLLEZIONI) this.avvisa(c)
  }
}

/* ---------- Fabbrica ---------- */

let deposito = null

/** Asincrona: l'SDK di Firebase viene scaricato solo se serve davvero. */
export async function ottieniDeposito() {
  if (deposito) return deposito
  if (configurato) {
    const { DepositoFirestore } = await import('./depositoFirestore.js')
    deposito = new DepositoFirestore()
  } else {
    deposito = new DepositoDemo()
  }
  return deposito
}
