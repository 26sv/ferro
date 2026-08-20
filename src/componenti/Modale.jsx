/* Finestra modale: su schermo largo sta al centro, su telefono sale dal
   basso. Esc chiude, il fuoco resta dentro finché è aperta e torna dov'era
   quando si chiude. */

import { useEffect, useId, useRef } from 'react'

export default function Modale({ titolo, sottotitolo, onChiudi, piede, children }) {
  const riquadro = useRef(null)
  const provenienza = useRef(null)
  const idTitolo = useId()

  useEffect(() => {
    provenienza.current = document.activeElement
    const primo = riquadro.current?.querySelector(
      'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
    )
    primo?.focus()

    const suTasto = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onChiudi()
        return
      }
      if (e.key !== 'Tab') return
      const fuochi = riquadro.current?.querySelectorAll(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href]',
      )
      if (!fuochi?.length) return
      const inizio = fuochi[0]
      const fine = fuochi[fuochi.length - 1]
      if (e.shiftKey && document.activeElement === inizio) {
        e.preventDefault()
        fine.focus()
      } else if (!e.shiftKey && document.activeElement === fine) {
        e.preventDefault()
        inizio.focus()
      }
    }

    document.addEventListener('keydown', suTasto, true)
    const scorrimento = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', suTasto, true)
      document.body.style.overflow = scorrimento
      provenienza.current?.focus?.()
    }
  }, [onChiudi])

  return (
    <div
      className="velo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onChiudi()
      }}
    >
      <div
        className="modale"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitolo}
        ref={riquadro}
      >
        <div className="modale__testata">
          <div>
            <h2 id={idTitolo}>{titolo}</h2>
            {sottotitolo && <p className="dati tenue">{sottotitolo}</p>}
          </div>
          <button type="button" className="btn btn-fantasma btn-piccolo" onClick={onChiudi}>
            Chiudi
          </button>
        </div>

        <div className="modale__corpo">{children}</div>

        {piede && <div className="modale__piede">{piede}</div>}
      </div>
    </div>
  )
}
