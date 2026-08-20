/**
 * Ponte verso Drive per il gestionale formazione.
 *
 * Deploy: Distribuisci > Nuova distribuzione > App web
 *   - Esegui come: Me
 *   - Chi ha accesso: vedi la nota in fondo al file
 *
 * Ogni richiesta è un POST con un campo `action`. Le risposte sono sempre
 * JSON con `ok: true|false`; quando `ok` è false, `errore` è una frase in
 * italiano che l'app può mostrare così com'è.
 */

var LIMITE_FILE = 200 // file per risposta
var LIMITE_MS = 240000 // 4 minuti: il tetto di Apps Script è 6
var PROFONDITA_MAX = 6

function doGet() {
  return json({ ok: true, servizio: 'gestionale-formazione', versione: 1 })
}

function doPost(e) {
  try {
    var richiesta = JSON.parse((e && e.postData && e.postData.contents) || '{}')

    var atteso = PropertiesService.getScriptProperties().getProperty('SEGRETO')
    if (atteso && richiesta.segreto !== atteso) {
      return json({ ok: false, errore: 'Segreto mancante o sbagliato.' })
    }

    switch (richiesta.action) {
      case 'scanFolder':
        return json(scanFolder(richiesta))
      case 'renameFile':
        return json(renameFile(richiesta))
      case 'renameBatch':
        return json(renameBatch(richiesta))
      case 'createFolder':
        return json(createFolder(richiesta))
      case 'moveFile':
        return json(moveFile(richiesta))
      case 'createFromTemplate':
        return json(createFromTemplate(richiesta))
      case 'getLink':
        return json(getLink(richiesta))
      default:
        return json({ ok: false, errore: 'Azione sconosciuta: ' + richiesta.action })
    }
  } catch (errore) {
    return json({ ok: false, errore: String((errore && errore.message) || errore) })
  }
}

function json(oggetto) {
  return ContentService.createTextOutput(JSON.stringify(oggetto)).setMimeType(
    ContentService.MimeType.JSON,
  )
}

/* ---------- scanFolder ---------- */

/**
 * Scansione ricorsiva a pezzi. Lo stato del giro precedente torna indietro in
 * `continua`: dentro c'è la coda delle cartelle ancora da visitare e il
 * segnaposto dell'iteratore dei file, così una cartella grande non fa
 * scadere l'esecuzione.
 */
function scanFolder(richiesta) {
  var avvio = Date.now()
  var profondita = Math.min(Number(richiesta.profondita || 3), PROFONDITA_MAX)

  var stato = richiesta.continua
    ? JSON.parse(Utilities.newBlob(Utilities.base64Decode(richiesta.continua)).getDataAsString())
    : {
        coda: [{ id: richiesta.folderId, livello: 0, percorso: '' }],
        corrente: null,
        token: null,
      }

  var file = []

  while (file.length < LIMITE_FILE && Date.now() - avvio < LIMITE_MS) {
    if (!stato.corrente) {
      if (!stato.coda.length) break
      stato.corrente = stato.coda.shift()
      stato.token = null
    }

    var cartella = DriveApp.getFolderById(stato.corrente.id)
    var percorso = stato.corrente.percorso || cartella.getName()
    var iteratore = stato.token
      ? DriveApp.continueFileIterator(stato.token)
      : cartella.getFiles()

    while (iteratore.hasNext() && file.length < LIMITE_FILE && Date.now() - avvio < LIMITE_MS) {
      var f = iteratore.next()
      file.push({
        id: f.getId(),
        nome: f.getName(),
        mimeType: f.getMimeType(),
        size: f.getSize(),
        createdTime: f.getDateCreated().toISOString(),
        webViewLink: f.getUrl(),
        cartella: cartella.getName(),
        percorso: percorso,
      })
    }

    if (iteratore.hasNext()) {
      stato.token = iteratore.getContinuationToken()
      break
    }

    // Cartella finita: accodo le sottocartelle e passo oltre.
    if (stato.corrente.livello < profondita) {
      var sotto = cartella.getFolders()
      while (sotto.hasNext()) {
        var s = sotto.next()
        stato.coda.push({
          id: s.getId(),
          livello: stato.corrente.livello + 1,
          percorso: percorso + '/' + s.getName(),
        })
      }
    }
    stato.corrente = null
    stato.token = null
  }

  var finito = !stato.corrente && !stato.coda.length
  return {
    ok: true,
    file: file,
    continua: finito ? null : Utilities.base64Encode(JSON.stringify(stato)),
  }
}

/* ---------- Scritture ---------- */

function renameFile(richiesta) {
  var file = DriveApp.getFileById(richiesta.fileId)
  var vecchio = file.getName()
  file.setName(richiesta.nuovoNome)
  return { ok: true, fileId: richiesta.fileId, prima: vecchio, dopo: richiesta.nuovoNome }
}

function renameBatch(richiesta) {
  var esiti = (richiesta.rinomine || []).map(function (riga) {
    try {
      var file = DriveApp.getFileById(riga.fileId)
      var vecchio = file.getName()
      file.setName(riga.nuovoNome)
      return { fileId: riga.fileId, ok: true, prima: vecchio, dopo: riga.nuovoNome }
    } catch (errore) {
      return {
        fileId: riga.fileId,
        ok: false,
        errore: String((errore && errore.message) || errore),
      }
    }
  })
  return { ok: true, esiti: esiti, riusciti: esiti.filter(function (e) { return e.ok }).length }
}

/** Crea la cartella solo se non c'è già: chiamarla due volte non duplica. */
function createFolder(richiesta) {
  var padre = richiesta.parentId
    ? DriveApp.getFolderById(richiesta.parentId)
    : DriveApp.getRootFolder()
  var esistenti = padre.getFoldersByName(richiesta.nome)
  if (esistenti.hasNext()) {
    return { ok: true, folderId: esistenti.next().getId(), creata: false }
  }
  return { ok: true, folderId: padre.createFolder(richiesta.nome).getId(), creata: true }
}

function moveFile(richiesta) {
  var file = DriveApp.getFileById(richiesta.fileId)
  file.moveTo(DriveApp.getFolderById(richiesta.targetFolderId))
  return { ok: true, fileId: richiesta.fileId }
}

function createFromTemplate(richiesta) {
  var modello = DriveApp.getFileById(richiesta.templateId)
  var destinazione = DriveApp.getFolderById(richiesta.targetFolderId)
  var copia = modello.makeCopy(richiesta.nome, destinazione)
  return { ok: true, fileId: copia.getId(), webViewLink: copia.getUrl() }
}

function getLink(richiesta) {
  var file = DriveApp.getFileById(richiesta.fileId)
  return { ok: true, fileId: richiesta.fileId, webViewLink: file.getUrl(), nome: file.getName() }
}

/**
 * Nota sull'accesso.
 *
 * "Esegui come: Me" + "Chi ha accesso: Solo io" è la configurazione più
 * chiusa, ma da browser non funziona: la chiamata viene rimandata alla
 * pagina di login di Google e la risposta arriva opaca, quindi l'app vede
 * solo un errore di rete.
 *
 * Configurazione che funziona restando privata nei fatti:
 *   - Esegui come: Me
 *   - Chi ha accesso: Chiunque abbia il link
 *   - Impostazioni progetto > Proprietà script > SEGRETO = una stringa lunga
 *     a caso, la stessa in VITE_APPS_SCRIPT_SEGRETO
 *
 * Senza il segreto giusto ogni richiesta viene rifiutata, e l'indirizzo della
 * web app non è indicizzato da nessuna parte.
 */
