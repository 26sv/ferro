/* Accesso, avvolto in import dinamici: la schermata compare subito e l'SDK
   di Firebase arriva dopo, senza bloccare il primo disegno. */

import { configurato } from './config.js'

export function osservaAccesso(callback) {
  if (!configurato) {
    callback(null)
    return () => {}
  }
  let stop = null
  let annullato = false
  import('./firebase.js').then((firebase) => {
    if (annullato) return
    stop = firebase.osservaAccesso(callback)
  })
  return () => {
    annullato = true
    stop?.()
  }
}

export async function entra() {
  const firebase = await import('./firebase.js')
  return firebase.entra()
}

export async function esci() {
  const firebase = await import('./firebase.js')
  return firebase.esci()
}
