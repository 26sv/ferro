/* Conti sulle ore. Girano tutti sulle lezioni, che portano già dentro di sé
   ente, corso e tipologia: senza quei campi denormalizzati ogni numero di
   questa pagina sarebbe una catena di query annidate. */

import { aData, daChiave, meseChiave, aMezzanotte } from './date.js'

export const oreErogate = (lezioni) =>
  lezioni.reduce((somma, l) => (l.stato === 'erogata' ? somma + (l.ore || 0) : somma), 0)

export const orePianificate = (lezioni) =>
  lezioni.reduce((somma, l) => (l.stato === 'pianificata' ? somma + (l.ore || 0) : somma), 0)

/** Le lezioni di un corso, in ordine di data e poi di orario. */
export function lezioniDelCorso(lezioni, corsoId) {
  return lezioni
    .filter((l) => l.corsoId === corsoId)
    .sort(
      (a, b) =>
        aData(a.data) - aData(b.data) || String(a.oraInizio).localeCompare(String(b.oraInizio)),
    )
}

/** Prima lezione ancora da fare, da oggi in avanti. */
export function prossimaLezione(lezioni, adesso = new Date()) {
  const limite = aMezzanotte(adesso)
  return lezioni
    .filter((l) => l.stato === 'pianificata' && aData(l.data) >= limite)
    .sort((a, b) => aData(a.data) - aData(b.data))[0]
}

export function avanzamento(corso, lezioni) {
  const sue = lezioniDelCorso(lezioni, corso.id)
  const erogate = oreErogate(sue)
  const totali = corso.oreTotali || sue.reduce((s, l) => s + (l.ore || 0), 0)
  return {
    lezioni: sue,
    erogate,
    totali,
    quota: totali ? erogate / totali : 0,
    prossima: prossimaLezione(sue),
  }
}

/** Somma le ore erogate raggruppando per una chiave della lezione. */
function raggruppa(lezioni, chiave) {
  const mappa = new Map()
  for (const l of lezioni) {
    if (l.stato !== 'erogata') continue
    const k = l[chiave] ?? 'altro'
    mappa.set(k, (mappa.get(k) ?? 0) + (l.ore || 0))
  }
  return [...mappa.entries()]
    .map(([id, ore]) => ({ id, ore }))
    .sort((a, b) => b.ore - a.ore)
}

export const orePerEnte = (lezioni) => raggruppa(lezioni, 'enteSigla')
export const orePerTipologia = (lezioni) => raggruppa(lezioni, 'tipologia')

/**
 * Ore erogate mese per mese, ogni mese spezzato per tipologia: la striscia
 * mensile è fatta degli stessi segmenti della barra del monte ore.
 */
export function orePerMese(lezioni, { da, a } = {}) {
  const mappa = new Map()
  for (const l of lezioni) {
    if (l.stato !== 'erogata') continue
    const data = aData(l.data)
    if (da && data < aData(da)) continue
    if (a && data > aData(a)) continue
    const k = meseChiave(data)
    if (!mappa.has(k)) mappa.set(k, { mese: k, totale: 0, perTipologia: {} })
    const voce = mappa.get(k)
    voce.totale += l.ore || 0
    voce.perTipologia[l.tipologia] = (voce.perTipologia[l.tipologia] ?? 0) + (l.ore || 0)
  }
  return [...mappa.values()].sort((x, y) => x.mese.localeCompare(y.mese))
}

const MASSIMO_MESI = 24

/**
 * Come `orePerMese`, ma senza buchi: i mesi vuoti restano nella serie, se no
 * la striscia mensile racconta una continuità che non c'è. Oltre due anni si
 * torna ai soli mesi con qualcosa dentro, altrimenti diventa illeggibile.
 */
export function serieMensile(lezioni, { da, a } = {}) {
  const pieni = orePerMese(lezioni, { da, a })
  if (!pieni.length) return []

  const primo = daChiave(`${da ? meseChiave(da) : pieni[0].mese}-01`)
  const ultimo = daChiave(`${a ? meseChiave(a) : pieni[pieni.length - 1].mese}-01`)
  const perChiave = new Map(pieni.map((m) => [m.mese, m]))

  const serie = []
  const cursore = new Date(primo)
  while (cursore <= ultimo && serie.length <= MASSIMO_MESI) {
    const chiave = meseChiave(cursore)
    serie.push(perChiave.get(chiave) ?? { mese: chiave, totale: 0, perTipologia: {} })
    cursore.setMonth(cursore.getMonth() + 1)
  }

  return serie.length > MASSIMO_MESI ? pieni : serie
}

/** Lezioni comprese in un intervallo di giorni, estremi inclusi. */
export function lezioniTra(lezioni, da, a) {
  const inizio = aMezzanotte(da)
  const fine = aMezzanotte(a)
  return lezioni.filter((l) => {
    const d = aMezzanotte(l.data)
    return d >= inizio && d <= fine
  })
}

/**
 * Stato del corso ricavato dalle sue lezioni: si aggiorna da solo quando una
 * lezione cambia stato, così non resta "pianificato" a corso finito.
 */
export function statoDedotto(corso, lezioni) {
  if (corso.stato === 'annullato') return 'annullato'
  const sue = lezioniDelCorso(lezioni, corso.id)
  if (!sue.length) return 'pianificato'
  const attive = sue.filter((l) => l.stato !== 'annullata')
  if (!attive.length) return 'annullato'
  if (attive.every((l) => l.stato === 'erogata')) return 'concluso'
  if (attive.some((l) => l.stato === 'erogata')) return 'in corso'
  return 'pianificato'
}
