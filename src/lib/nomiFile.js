/* La convenzione sui nomi file, in un posto solo: si legge, si scrive e si
   propone una correzione per ciò che non la rispetta.

   AAAA-MM-GG_ENTE_CORSO_M##_tipo_v#.est
   2026-09-14_FILIPPORE_SMMAI_M03_slide_v2.pdf

   I file della libreria trasversale non hanno data né modulo:
   LIB_esercizio_prompt-brief_v1.pdf                                        */

import { TIPI_MATERIALE } from './costanti.js'
import { aChiave, aData } from './date.js'

export const RE = /^(\d{4}-\d{2}-\d{2})_([A-Z0-9]+)_([A-Z0-9]+)_M(\d{2})_([a-z]+)_v(\d+)\.(\w+)$/
export const RE_LIB = /^LIB_([a-z]+)_([a-z0-9-]+)_v(\d+)\.(\w+)$/

/** Sigla di ente o corso: maiuscole, niente accenti, niente spazi. */
export function sigla(testo) {
  return String(testo ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/** Argomento dei file di libreria: minuscole separate da trattini. */
export function slug(testo) {
  return String(testo ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function estensione(nome) {
  const m = /\.([A-Za-z0-9]+)$/.exec(String(nome ?? ''))
  return m ? m[1].toLowerCase() : ''
}

export function componiNome({ data, enteSigla, corsoSigla, moduloN, tipo, versione, estensione: est }) {
  const n = String(moduloN ?? 1).padStart(2, '0')
  return `${aChiave(data)}_${sigla(enteSigla)}_${sigla(corsoSigla)}_M${n}_${tipo}_v${versione ?? 1}.${est}`
}

export function componiNomeLibreria({ tipo, argomento, versione, estensione: est }) {
  return `LIB_${tipo}_${slug(argomento)}_v${versione ?? 1}.${est}`
}

/**
 * Legge un nome file. Restituisce sempre un oggetto: `ok` dice se rispetta la
 * convenzione, `motivo` perché no.
 */
export function analizzaNome(nome) {
  const testo = String(nome ?? '')

  const m = RE.exec(testo)
  if (m) {
    const [, data, enteSigla, corsoSigla, moduloN, tipo, versione, est] = m
    if (!TIPI_MATERIALE.includes(tipo)) {
      return { ok: false, motivo: `"${tipo}" non è un tipo previsto`, tipoNome: 'corso' }
    }
    return {
      ok: true,
      tipoNome: 'corso',
      data,
      enteSigla,
      corsoSigla,
      moduloN: Number(moduloN),
      tipo,
      versione: Number(versione),
      estensione: est.toLowerCase(),
    }
  }

  const l = RE_LIB.exec(testo)
  if (l) {
    const [, tipo, argomento, versione, est] = l
    if (!TIPI_MATERIALE.includes(tipo)) {
      return { ok: false, motivo: `"${tipo}" non è un tipo previsto`, tipoNome: 'libreria' }
    }
    return {
      ok: true,
      tipoNome: 'libreria',
      argomento,
      tipo,
      versione: Number(versione),
      estensione: est.toLowerCase(),
    }
  }

  return { ok: false, motivo: 'Non segue la convenzione' }
}

/* ---------- Deduzione ---------- */

const PAROLE_TIPO = [
  ['slide', /\b(slide|slides|presentazione|deck|ppt)\b/i],
  ['dispensa', /\b(dispensa|dispense|handout|manuale|guida)\b/i],
  ['esercizio', /\b(esercizi|esercizio|exercise|lab|prova|brief)\b/i],
  ['registro', /\b(registro|presenze|firme|foglio)\b/i],
  ['video', /\b(video|registrazione|screencast)\b/i],
]

const TIPO_DA_ESTENSIONE = {
  ppt: 'slide', pptx: 'slide', key: 'slide', odp: 'slide',
  mp4: 'video', mov: 'video', webm: 'video', m4v: 'video',
}

function tipoDedotto(nome, est) {
  for (const [tipo, re] of PAROLE_TIPO) if (re.test(nome)) return { tipo, sicuro: true, re }
  if (TIPO_DA_ESTENSIONE[est]) return { tipo: TIPO_DA_ESTENSIONE[est], sicuro: true, re: null }
  return { tipo: 'materiale', sicuro: false, re: null }
}

const MESI_CORTI = {
  gen: 0, feb: 1, mar: 2, apr: 3, mag: 4, giu: 5,
  lug: 6, ago: 7, set: 8, sett: 8, ott: 9, nov: 10, dic: 11,
}

/** Cerca una data dentro il nome, nei formati che si scrivono a mano. */
function dataDaNome(nome) {
  let m = /(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})/.exec(nome)
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    if (!Number.isNaN(d.getTime()) && d.getMonth() === Number(m[2]) - 1) return d
  }
  m = /\b(\d{1,2})[-_./](\d{1,2})[-_./](20\d{2})\b/.exec(nome)
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
    if (!Number.isNaN(d.getTime())) return d
  }
  m = /\b(\d{1,2})[ _-]?(gen|feb|mar|apr|mag|giu|lug|ago|sett?|ott|nov|dic)[a-z]*[ _-]?(20\d{2})?\b/i.exec(nome)
  if (m) {
    const anno = m[3] ? Number(m[3]) : new Date().getFullYear()
    return new Date(anno, MESI_CORTI[m[2].toLowerCase()], Number(m[1]))
  }
  return null
}

function moduloDaTesto(testo) {
  const m = /\bm(?:od(?:ulo)?)?[ _.-]?(\d{1,2})\b/i.exec(String(testo ?? ''))
  return m ? Number(m[1]) : null
}

function siglaDaNome(nome, sigleNote) {
  const parole = String(nome).split(/[^A-Za-z0-9]+/)
  for (const p of parole) {
    const s = sigla(p)
    if (s.length >= 3 && sigleNote.includes(s)) return s
  }
  return null
}

/**
 * Propone il nome corretto per un file fuori convenzione, deducendolo dalla
 * cartella in cui si trova, dalla data di creazione e dal nome attuale.
 *
 * `contesto`: { enteSigla, corsoSigla, moduloN, cartella, sigleEnti, sigleCorsi, libreria }
 * Restituisce anche `sicuro` e `dedotti`: quando qualcosa è stato tirato a
 * indovinare, l'interfaccia lo segnala invece di far finta di niente.
 */
export function proponiNome(file, contesto = {}) {
  const nome = String(file?.nome ?? '')
  const est = estensione(nome) || 'pdf'
  const senzaEst = nome.replace(/\.[A-Za-z0-9]+$/, '')
  const dedotti = []

  const versioneM = /[_-]?v[ ._-]?(\d+)\b/i.exec(senzaEst)
  const versione = versioneM ? Number(versioneM[1]) : 1
  if (!versioneM) dedotti.push('versione')

  const { tipo, sicuro: tipoSicuro, re: reTipo } = tipoDedotto(senzaEst, est)
  if (!tipoSicuro) dedotti.push('tipo')

  if (contesto.libreria) {
    // L'argomento è ciò che resta togliendo prefisso, tipo e versione: il
    // tipo sta già nel suo pezzo di nome, non serve ripeterlo.
    const resto = senzaEst
      .replace(/\b(lib|libreria)\b/gi, ' ')
      .replace(/[_-]?v[ ._-]?\d+/i, ' ')
    const argomento = slug(reTipo ? resto.replace(reTipo, ' ') : resto) || 'senza-titolo'
    return {
      nome: componiNomeLibreria({ tipo, argomento, versione, estensione: est }),
      sicuro: dedotti.length === 0,
      dedotti,
    }
  }

  const enteSigla =
    sigla(contesto.enteSigla) ||
    siglaDaNome(senzaEst, (contesto.sigleEnti ?? []).map(sigla)) ||
    ''
  if (!contesto.enteSigla) dedotti.push('ente')

  const corsoSigla =
    sigla(contesto.corsoSigla) ||
    siglaDaNome(senzaEst, (contesto.sigleCorsi ?? []).map(sigla)) ||
    ''
  if (!contesto.corsoSigla) dedotti.push('corso')

  const moduloN =
    contesto.moduloN ?? moduloDaTesto(contesto.cartella) ?? moduloDaTesto(senzaEst) ?? 1
  if (contesto.moduloN == null && moduloDaTesto(contesto.cartella) == null && moduloDaTesto(senzaEst) == null) {
    dedotti.push('modulo')
  }

  const data = dataDaNome(senzaEst) ?? aData(file?.createdTime) ?? new Date()
  if (!dataDaNome(senzaEst)) dedotti.push('data')

  if (!enteSigla || !corsoSigla) {
    return { nome: null, sicuro: false, dedotti, motivo: 'Manca la sigla di ente o corso' }
  }

  return {
    nome: componiNome({ data, enteSigla, corsoSigla, moduloN, tipo, versione, estensione: est }),
    sicuro: dedotti.length === 0,
    dedotti,
  }
}
