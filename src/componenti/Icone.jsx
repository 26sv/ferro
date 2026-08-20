/* Icone della navigazione. Sono le sole ammesse: nel resto dell'interfaccia
   le etichette parlano da sole. Tratto uniforme, nessun riempimento. */

const comuni = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
}

export function IconaSettimana(props) {
  return (
    <svg {...comuni} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <path d="M3 10h18M9 5V3M15 5V3M9 10v11M15 10v11" />
    </svg>
  )
}

export function IconaCorsi(props) {
  return (
    <svg {...comuni} {...props}>
      <path d="M3 7h7M3 12h13M3 17h5" />
      <path d="M13 7h8M19 12h2M10 17h11" />
    </svg>
  )
}

export function IconaProgrammi(props) {
  return (
    <svg {...comuni} {...props}>
      <path d="M5 3h9l5 5v13H5z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  )
}

export function IconaMateriali(props) {
  return (
    <svg {...comuni} {...props}>
      <path d="M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    </svg>
  )
}

export function IconaEnti(props) {
  return (
    <svg {...comuni} {...props}>
      <path d="M4 21V6l7-3 7 3v15" />
      <path d="M4 21h16M9 21v-5h4v5M8 9h1M12 9h1M8 12h1M12 12h1" />
    </svg>
  )
}

export function IconaNumeri(props) {
  return (
    <svg {...comuni} {...props}>
      <path d="M4 20V4" />
      <path d="M8 17h11M8 12h7M8 7h4" />
    </svg>
  )
}
