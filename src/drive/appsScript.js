/* Ponte verso Drive. Tutto passa dalla web app di Apps Script pubblicata a
   nome del proprietario: `DriveApp` gira già autenticato, quindi l'app non
   deve gestire OAuth né token che scadono ogni sette giorni.

   Il corpo parte come `text/plain` di proposito: con `application/json` il
   browser manda una preflight OPTIONS, che Apps Script non sa gestire. */

const URL_SCRIPT = import.meta.env.VITE_APPS_SCRIPT_URL ?? ''

// Parola d'ordine condivisa con lo script: vedi la nota in fondo a
// `apps-script/Codice.gs` sul perché la web app resta "chiunque col link".
const SEGRETO = import.meta.env.VITE_APPS_SCRIPT_SEGRETO ?? ''

export const RADICE_DRIVE = import.meta.env.VITE_DRIVE_ROOT_ID ?? ''

export const driveConfigurato = Boolean(URL_SCRIPT)

async function chiama(action, dati = {}) {
  if (!driveConfigurato) {
    throw new Error('Drive non è collegato: manca l’indirizzo della web app di Apps Script.')
  }

  let risposta
  try {
    risposta = await fetch(URL_SCRIPT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, segreto: SEGRETO, ...dati }),
    })
  } catch {
    throw new Error('Drive non risponde. Controlla la rete e riprova.')
  }

  if (!risposta.ok) {
    throw new Error(`Drive ha risposto ${risposta.status}. Forse il deploy non è aggiornato.`)
  }

  const esito = await risposta.json()
  if (esito?.ok === false) throw new Error(esito.errore || 'Drive ha rifiutato la richiesta.')
  return esito
}

/**
 * Un pezzo di cartella per volta. `continua` è il segnaposto da rimandare
 * indietro: senza, su cartelle grandi Apps Script sbatte nel limite dei
 * sei minuti.
 */
export const scansionaCartella = (folderId, { continua = null, profondita = 3 } = {}) =>
  chiama('scanFolder', { folderId, continua, profondita })

/** Scansione completa, un pezzo dopo l'altro. `suProgresso` riceve i file via via. */
export async function scansionaTutto(folderId, { profondita = 3, suProgresso } = {}) {
  const tutti = []
  let continua = null
  do {
    const esito = await scansionaCartella(folderId, { continua, profondita })
    tutti.push(...(esito.file ?? []))
    suProgresso?.(tutti.length)
    continua = esito.continua ?? null
  } while (continua)
  return tutti
}

export const rinominaFile = (fileId, nuovoNome) => chiama('renameFile', { fileId, nuovoNome })

/** `rinomine`: [{ fileId, nuovoNome }]. Torna l'esito riga per riga. */
export const rinominaLotto = (rinomine) => chiama('renameBatch', { rinomine })

export const creaCartella = (parentId, nome) => chiama('createFolder', { parentId, nome })

export const spostaFile = (fileId, targetFolderId) => chiama('moveFile', { fileId, targetFolderId })

export const creaDaModello = (templateId, nome, targetFolderId) =>
  chiama('createFromTemplate', { templateId, nome, targetFolderId })

export const ottieniLink = (fileId) => chiama('getLink', { fileId })

/**
 * Crea, se non ci sono, le cartelle di un corso: /Formazione/ENTE/ANNO_CORSO/M##.
 * I file esistenti non vengono mai spostati.
 */
export async function preparaCartelleCorso({ enteSigla, edizione, corsoSigla, moduli }) {
  const ente = await creaCartella(RADICE_DRIVE, enteSigla)
  const corso = await creaCartella(ente.folderId, `${edizione}_${corsoSigla}`)
  const cartelleModuli = {}
  for (const n of moduli) {
    const nome = `M${String(n).padStart(2, '0')}`
    const esito = await creaCartella(corso.folderId, nome)
    cartelleModuli[nome] = esito.folderId
  }
  return { enteFolderId: ente.folderId, corsoFolderId: corso.folderId, cartelleModuli }
}
