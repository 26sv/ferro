/* Attuazione del deposito su Firestore. Caricata solo quando il progetto è
   configurato: in demo questo file non viene mai scaricato. */

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { firestore } from './firebase.js'
import { nuovoId } from './identita.js'

export class DepositoFirestore {
  constructor() {
    this.modalita = 'firestore'
    this.db = firestore()
  }

  osserva(collezione, callback, suErrore) {
    return onSnapshot(
      collection(this.db, collezione),
      (istantanea) => callback(istantanea.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (errore) => suErrore?.(errore),
    )
  }

  async crea(collezione, dati) {
    const id = dati.id ?? nuovoId(collezione.slice(0, 3))
    const { id: _scartato, ...resto } = dati
    await setDoc(doc(this.db, collezione, id), resto)
    return id
  }

  async aggiorna(collezione, id, modifiche) {
    const { id: _scartato, ...resto } = modifiche
    await updateDoc(doc(this.db, collezione, id), resto)
  }

  async elimina(collezione, id) {
    await deleteDoc(doc(this.db, collezione, id))
  }

  async lotto(operazioni) {
    // Firestore accetta al massimo 500 scritture per batch.
    for (let i = 0; i < operazioni.length; i += 400) {
      const gruppo = operazioni.slice(i, i + 400)
      const batch = writeBatch(this.db)
      for (const op of gruppo) {
        if (op.tipo === 'crea') {
          const id = op.dati.id ?? nuovoId(op.collezione.slice(0, 3))
          const { id: _scartato, ...resto } = op.dati
          batch.set(doc(this.db, op.collezione, id), resto)
        } else if (op.tipo === 'aggiorna') {
          const { id: _scartato, ...resto } = op.dati
          batch.update(doc(this.db, op.collezione, op.id), resto)
        } else if (op.tipo === 'elimina') {
          batch.delete(doc(this.db, op.collezione, op.id))
        }
      }
      await batch.commit()
    }
  }
}
