/* Date e orari. Tutto in ora locale: le lezioni si tengono in un'aula, non
   in UTC. Le date circolano nell'app come oggetti Date; `aData` normalizza
   ciò che arriva da Firestore (Timestamp), dal seed (stringa) o dai form. */

const GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica']
const GIORNI_BREVI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']
const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]
const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

export function aData(valore) {
  if (!valore) return null
  if (valore instanceof Date) return valore
  if (typeof valore?.toDate === 'function') return valore.toDate() // Timestamp
  if (typeof valore === 'number') return new Date(valore)
  if (typeof valore === 'string') return daChiave(valore) ?? new Date(valore)
  return null
}

/** 'AAAA-MM-GG' in ora locale, la stessa forma usata nei nomi file. */
export function aChiave(data) {
  const d = aData(data)
  if (!d) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${g}`
}

export function daChiave(chiave) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(chiave ?? '').slice(0, 10))
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function meseChiave(data) {
  return aChiave(data).slice(0, 7)
}

export function aMezzanotte(data) {
  const d = new Date(aData(data))
  d.setHours(0, 0, 0, 0)
  return d
}

export function aggiungiGiorni(data, giorni) {
  const d = new Date(aData(data))
  d.setDate(d.getDate() + giorni)
  return d
}

export function stessoGiorno(a, b) {
  return aChiave(a) === aChiave(b)
}

/** Lunedì della settimana che contiene `data`. */
export function inizioSettimana(data) {
  const d = aMezzanotte(data)
  const scarto = (d.getDay() + 6) % 7 // domenica (0) diventa 6
  return aggiungiGiorni(d, -scarto)
}

export function giorniSettimana(data) {
  const lunedi = inizioSettimana(data)
  return Array.from({ length: 7 }, (_, i) => aggiungiGiorni(lunedi, i))
}

/** Numero di settimana ISO 8601. */
export function numeroSettimana(data) {
  const d = aMezzanotte(data)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)) // giovedì della settimana
  const primoGiovedi = new Date(d.getFullYear(), 0, 4)
  primoGiovedi.setDate(primoGiovedi.getDate() + 3 - ((primoGiovedi.getDay() + 6) % 7))
  return 1 + Math.round((d - primoGiovedi) / (7 * 24 * 3600 * 1000))
}

export const nomeGiorno = (data) => GIORNI[(aData(data).getDay() + 6) % 7]
export const nomeGiornoBreve = (data) => GIORNI_BREVI[(aData(data).getDay() + 6) % 7]
export const nomeMese = (data) => MESI[aData(data).getMonth()]
export const nomeMeseBreve = (data) => MESI_BREVI[aData(data).getMonth()]

/** "15 - 21 settembre 2026", con mese e anno ripetuti solo se cambiano. */
export function intervalloEsteso(inizio, fine) {
  const a = aData(inizio)
  const b = aData(fine)
  if (!a || !b) return ''
  const stessoAnno = a.getFullYear() === b.getFullYear()
  const stessoMese = stessoAnno && a.getMonth() === b.getMonth()
  const sinistra = stessoMese
    ? `${a.getDate()}`
    : stessoAnno
      ? `${a.getDate()} ${nomeMese(a)}`
      : `${a.getDate()} ${nomeMese(a)} ${a.getFullYear()}`
  return `${sinistra} - ${b.getDate()} ${nomeMese(b)} ${b.getFullYear()}`
}

/** "gio 18 set", per marcatori e righe strette. */
export function dataBreve(data) {
  const d = aData(data)
  if (!d) return ''
  return `${nomeGiornoBreve(d)} ${d.getDate()} ${nomeMeseBreve(d)}`
}

/** "giovedì 18 settembre 2026" */
export function dataEstesa(data) {
  const d = aData(data)
  if (!d) return ''
  return `${nomeGiorno(d)} ${d.getDate()} ${nomeMese(d)} ${d.getFullYear()}`
}

export function minutiDaOra(ora) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(ora ?? '').trim())
  if (!m) return 0
  return Number(m[1]) * 60 + Number(m[2])
}

export function oraDaMinuti(minuti) {
  const m = Math.max(0, Math.round(minuti))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Ore tra due orari, arrotondate al quarto d'ora. */
export function oreTra(inizio, fine) {
  const diff = minutiDaOra(fine) - minutiDaOra(inizio)
  if (diff <= 0) return 0
  return Math.round((diff / 60) * 4) / 4
}

/** "4" o "3,5": mezze ore con la virgola, come si scrivono in italiano. */
export function formattaOre(ore) {
  const n = Number(ore) || 0
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '').replace('.', ',')
}
