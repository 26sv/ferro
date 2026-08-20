/* Larghezza dello schermo e preferenze di movimento, come hook. */

import { useEffect, useState } from 'react'

function usaMedia(query) {
  const [attiva, setAttiva] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const suCambio = (e) => setAttiva(e.matches)
    setAttiva(mq.matches)
    mq.addEventListener('change', suCambio)
    return () => mq.removeEventListener('change', suCambio)
  }, [query])

  return attiva
}

/** Sotto gli 860 px la settimana diventa un'agenda: due strutture diverse,
    non la stessa griglia rimpicciolita. */
export const useSchermoStretto = () => usaMedia('(max-width: 860px)')

export const useMovimentoRidotto = () => usaMedia('(prefers-reduced-motion: reduce)')
