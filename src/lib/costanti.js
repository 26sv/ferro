/* Liste chiuse: tipologie, tipi di materiale, stati. Chi aggiunge una voce
   qui la trova subito nei filtri, nei form e nei grafici. */

export const TIPOLOGIE = [
  { id: 'smm', nome: 'Social media marketing' },
  { id: 'ai', nome: 'AI' },
  { id: 'linkedin', nome: 'LinkedIn' },
  { id: 'startup', nome: 'Metodologia startup' },
  { id: 'hospitality', nome: 'Hospitality' },
  { id: 'altro', nome: 'Altro' },
]

export const nomeTipologia = (id) =>
  TIPOLOGIE.find((t) => t.id === id)?.nome ?? 'Altro'

/** Colore della tipologia, sempre come variabile CSS: nessun esadecimale
    scritto a mano nei componenti. */
export const coloreTipologia = (id) =>
  `var(--tipologia-${TIPOLOGIE.some((t) => t.id === id) ? id : 'altro'})`

export const TIPI_MATERIALE = [
  'slide',
  'dispensa',
  'esercizio',
  'registro',
  'materiale',
  'video',
]

export const TIPI_ENTE = ['azienda', 'ente', 'scuola']

export const STATI_LEZIONE = ['pianificata', 'erogata', 'annullata']

export const STATI_CORSO = ['pianificato', 'in corso', 'concluso', 'annullato']

export const MODALITA = ['presenza', 'online']
