/* Instradamento minimo sull'hash: sei schermate e qualche dettaglio, non
   serve altro. `#/corsi/abc` diventa ['corsi', 'abc']. */

import { useCallback, useEffect, useState } from 'react'

function leggi() {
  const grezzo = window.location.hash.replace(/^#\/?/, '')
  const parti = grezzo.split('/').filter(Boolean).map(decodeURIComponent)
  return parti.length ? parti : ['settimana']
}

export function useRotta() {
  const [parti, setParti] = useState(leggi)

  useEffect(() => {
    const suCambio = () => setParti(leggi())
    window.addEventListener('hashchange', suCambio)
    return () => window.removeEventListener('hashchange', suCambio)
  }, [])

  const vai = useCallback((...pezzi) => {
    window.location.hash = `#/${pezzi.filter(Boolean).map(encodeURIComponent).join('/')}`
    // La schermata nuova comincia dall'alto, non a metà della precedente.
    window.scrollTo({ top: 0 })
  }, [])

  return { parti, sezione: parti[0], dettaglio: parti[1], vai }
}

export const indirizzo = (...pezzi) =>
  `#/${pezzi.filter(Boolean).map(encodeURIComponent).join('/')}`
