/* Firebase, inizializzato una volta sola. Questo file viene importato solo
   in modo dinamico (`await import('./firebase.js')`): in modalità demo non
   entra nemmeno nel pacchetto scaricato. */

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore'
import { config } from './config.js'

let app = null
let db = null
let auth = null

function avvia() {
  if (app) return
  app = initializeApp(config)
  // Cache locale persistente: in aula, senza rete, l'ultimo stato letto
  // resta consultabile e le scritture partono appena la rete torna.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
  })
  auth = getAuth(app)
}

export function firestore() {
  avvia()
  return db
}

export function autenticazione() {
  avvia()
  return auth
}

export function osservaAccesso(callback) {
  return onAuthStateChanged(autenticazione(), callback)
}

export function entra() {
  return signInWithPopup(autenticazione(), new GoogleAuthProvider())
}

export function esci() {
  return signOut(autenticazione())
}
