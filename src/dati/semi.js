/* Dati di partenza: due enti, i programmi realmente erogati, tre corsi e i
   materiali collegati. Servono al primo popolamento di Firestore
   (`npm run seed`) e alla modalità demo, così l'app non si apre mai vuota.

   Le date sono relative alla settimana in cui si guarda: aperta oggi o fra un
   mese, la schermata Settimana ha sempre qualcosa dentro. */

import { aggiungiGiorni, inizioSettimana, aChiave, oreTra } from '../lib/date.js'
import { componiNome, componiNomeLibreria } from '../lib/nomiFile.js'

export const ENTI = [
  {
    id: 'ente-filippore',
    sigla: 'FILIPPORE',
    nome: 'IIS Filippo Re',
    tipo: 'scuola',
    referente: {
      nome: 'Segreteria didattica',
      email: 'didattica@iisfilippore.example',
      telefono: '0522 000000',
    },
    driveFolderId: null,
    note: 'Corsi PCTO, aula informatica al primo piano.',
  },
  {
    id: 'ente-sichenia',
    sigla: 'SICHENIA',
    nome: 'Sichenia Gruppo Ceramiche',
    tipo: 'azienda',
    referente: {
      nome: 'Ufficio marketing',
      email: 'marketing@sichenia.example',
      telefono: '0536 000000',
    },
    driveFolderId: null,
    note: 'Formazione finanziata, servono i registri firmati.',
  },
]

export const PROGRAMMI = [
  {
    id: 'prog-smmai',
    titolo: 'Social Media Marketing e AI',
    sigla: 'SMMAI',
    tipologia: 'smm',
    oreTotali: 24,
    versione: 3,
    moduli: [
      {
        n: 1,
        titolo: 'Posizionamento e pubblico',
        ore: 4,
        obiettivi: ['Definire il pubblico di riferimento', 'Scrivere una promessa in una riga'],
        contenuti: ['Analisi dei concorrenti', 'Personas essenziali', 'Promessa e tono di voce'],
      },
      {
        n: 2,
        titolo: 'Contenuti che reggono nel tempo',
        ore: 4,
        obiettivi: ['Costruire formati ripetibili', 'Distinguere contenuto e annuncio'],
        contenuti: ['Formati pilastro', 'Struttura di un post', 'Riuso tra canali'],
      },
      {
        n: 3,
        titolo: 'AI generativa: cosa fa e cosa no',
        ore: 4,
        obiettivi: ['Capire limiti e allucinazioni', 'Scegliere lo strumento giusto'],
        contenuti: ['Modelli di linguaggio', 'Immagini generate', 'Diritti e attribuzione'],
      },
      {
        n: 4,
        titolo: 'Prompting per i contenuti',
        ore: 4,
        obiettivi: ['Scrivere prompt che restituiscono materiale usabile', 'Costruire un brief riutilizzabile'],
        contenuti: ['Struttura di un prompt', 'Esempi e controesempi', 'Revisione umana'],
      },
      {
        n: 5,
        titolo: 'Piano editoriale e strumenti',
        ore: 4,
        obiettivi: ['Pianificare un mese di contenuti', 'Automatizzare il ripetitivo'],
        contenuti: ['Calendario editoriale', 'Canva e template', 'Programmazione dei post'],
      },
      {
        n: 6,
        titolo: 'Misurare e correggere',
        ore: 4,
        obiettivi: ['Leggere i dati senza illudersi', 'Presentare il progetto finale'],
        contenuti: ['Metriche che contano', 'Test e correzioni', 'Presentazioni dei gruppi'],
      },
    ],
  },
  {
    id: 'prog-aiquot',
    titolo: 'AI per il lavoro quotidiano',
    sigla: 'AIQUOT',
    tipologia: 'ai',
    oreTotali: 14,
    versione: 2,
    moduli: [
      {
        n: 1,
        titolo: 'Strumenti e primi usi',
        ore: 4,
        obiettivi: ['Riconoscere le attività che conviene delegare'],
        contenuti: ['Panoramica degli strumenti', 'Dati aziendali e riservatezza'],
      },
      {
        n: 2,
        titolo: 'Scrivere e riassumere',
        ore: 4,
        obiettivi: ['Produrre bozze da rivedere, non da pubblicare'],
        contenuti: ['Email e verbali', 'Riassunti di documenti lunghi'],
      },
      {
        n: 3,
        titolo: 'Dati e fogli di calcolo',
        ore: 3,
        obiettivi: ['Pulire e interrogare tabelle'],
        contenuti: ['Formule spiegate', 'Estrazione da testo libero'],
      },
      {
        n: 4,
        titolo: 'Flussi di lavoro del reparto',
        ore: 3,
        obiettivi: ['Portare a casa un flusso applicato al proprio ufficio'],
        contenuti: ['Casi dei partecipanti', 'Cosa non automatizzare'],
      },
    ],
  },
  {
    id: 'prog-linkedin',
    titolo: 'LinkedIn per chi vende ad aziende',
    sigla: 'LINKB2B',
    tipologia: 'linkedin',
    oreTotali: 8,
    versione: 1,
    moduli: [
      {
        n: 1,
        titolo: 'Profilo e presenza',
        ore: 4,
        obiettivi: ['Riscrivere il profilo come pagina di vendita'],
        contenuti: ['Titolo e riepilogo', 'Prove e referenze'],
      },
      {
        n: 2,
        titolo: 'Contatti e conversazioni',
        ore: 4,
        obiettivi: ['Aprire conversazioni senza sembrare un venditore'],
        contenuti: ['Ricerca dei contatti', 'Messaggi che ricevono risposta'],
      },
    ],
  },
]

/** Lezione costruita dal modulo del programma: i campi denormalizzati
    vengono compilati qui una volta sola. */
function lezione({ id, corso, modulo, data, oraInizio, oraFine, stato, luogo, modalita = 'presenza' }) {
  return {
    id,
    corsoId: corso.id,
    moduloN: modulo.n,
    data: aChiave(data),
    oraInizio,
    oraFine,
    ore: oreTra(oraInizio, oraFine),
    luogo: luogo ?? '',
    modalita,
    stato,
    titolo: modulo.titolo,
    note: '',
    enteSigla: corso.enteSigla,
    corsoSigla: corso.corsoSigla,
    tipologia: corso.tipologia,
  }
}

/**
 * Costruisce corsi, lezioni e materiali attorno alla settimana di `riferimento`.
 * Il corso principale arriva a 12 ore su 24: metà monte ore consumato.
 */
export function costruisciSemi(riferimento = new Date()) {
  const lunedi = inizioSettimana(riferimento)
  const g = (settimane, giorno) => aggiungiGiorni(lunedi, settimane * 7 + giorno)

  const smmai = PROGRAMMI[0]
  const aiquot = PROGRAMMI[1]
  const linkb2b = PROGRAMMI[2]

  const corsi = [
    {
      id: 'corso-smmai-filippore',
      programmaId: smmai.id,
      enteId: 'ente-filippore',
      enteSigla: 'FILIPPORE',
      corsoSigla: 'SMMAI',
      tipologia: 'smm',
      edizione: String(lunedi.getFullYear()),
      oreTotali: 24,
      oreErogate: 12,
      periodo: { inizio: aChiave(g(-2, 1)), fine: aChiave(g(1, 3)) },
      stato: 'in corso',
      driveFolderId: null,
    },
    {
      id: 'corso-aiquot-sichenia',
      programmaId: aiquot.id,
      enteId: 'ente-sichenia',
      enteSigla: 'SICHENIA',
      corsoSigla: 'AIQUOT',
      tipologia: 'ai',
      edizione: String(lunedi.getFullYear()),
      oreTotali: 14,
      oreErogate: 4,
      periodo: { inizio: aChiave(g(-1, 2)), fine: aChiave(g(2, 2)) },
      stato: 'in corso',
      driveFolderId: null,
    },
    {
      id: 'corso-linkb2b-sichenia',
      programmaId: linkb2b.id,
      enteId: 'ente-sichenia',
      enteSigla: 'SICHENIA',
      corsoSigla: 'LINKB2B',
      tipologia: 'linkedin',
      edizione: String(lunedi.getFullYear()),
      oreTotali: 8,
      oreErogate: 8,
      periodo: { inizio: aChiave(g(-7, 1)), fine: aChiave(g(-6, 1)) },
      stato: 'concluso',
      driveFolderId: null,
    },
  ]

  const [cSmm, cAi, cLink] = corsi

  // SMMAI: martedì e giovedì pomeriggio, due moduli a settimana.
  const pianoSmm = [
    [0, -2, 1, 'erogata'],
    [1, -2, 3, 'erogata'],
    [2, -1, 1, 'erogata'],
    [3, 0, 3, 'pianificata'],
    [4, 1, 1, 'pianificata'],
    [5, 1, 3, 'pianificata'],
  ]
  const lezioniSmm = pianoSmm.map(([i, sett, giorno, stato]) =>
    lezione({
      id: `lez-smm-${i + 1}`,
      corso: cSmm,
      modulo: smmai.moduli[i],
      data: g(sett, giorno),
      oraInizio: '14:00',
      oraFine: '18:00',
      stato,
      luogo: 'Aula informatica',
    }),
  )

  // AIQUOT: mercoledì mattina, in azienda; gli ultimi due moduli da 3 ore.
  const pianoAi = [
    [0, -1, 2, 'erogata', '09:00', '13:00'],
    [1, 0, 2, 'pianificata', '09:00', '13:00'],
    [2, 1, 2, 'pianificata', '09:00', '12:00'],
    [3, 2, 2, 'pianificata', '09:00', '12:00'],
  ]
  const lezioniAi = pianoAi.map(([i, sett, giorno, stato, ini, fine]) =>
    lezione({
      id: `lez-ai-${i + 1}`,
      corso: cAi,
      modulo: aiquot.moduli[i],
      data: g(sett, giorno),
      oraInizio: ini,
      oraFine: fine,
      stato,
      luogo: 'Sala riunioni',
    }),
  )

  // LINKB2B: concluso, resta nello storico e nei numeri.
  const lezioniLink = [
    [0, -7, 1],
    [1, -6, 1],
  ].map(([i, sett, giorno]) =>
    lezione({
      id: `lez-link-${i + 1}`,
      corso: cLink,
      modulo: linkb2b.moduli[i],
      data: g(sett, giorno),
      oraInizio: '09:00',
      oraFine: '13:00',
      stato: 'erogata',
      modalita: 'online',
    }),
  )

  const lezioni = [...lezioniSmm, ...lezioniAi, ...lezioniLink]

  const nomeDi = (lez, tipo, versione, est) =>
    componiNome({
      data: lez.data,
      enteSigla: lez.enteSigla,
      corsoSigla: lez.corsoSigla,
      moduloN: lez.moduloN,
      tipo,
      versione,
      estensione: est,
    })

  const materiali = [
    {
      id: 'mat-1',
      driveFileId: 'demo-1',
      nome: nomeDi(lezioniSmm[0], 'slide', 2, 'pdf'),
      webViewLink: null,
      mimeType: 'application/pdf',
      tipo: 'slide',
      versione: 2,
      corsoId: cSmm.id,
      lezioniIds: [lezioniSmm[0].id],
      tag: ['posizionamento'],
      riutilizzabile: false,
      consegnatoA: [{ enteId: cSmm.enteId, data: lezioniSmm[0].data, versione: 2 }],
      parsingOk: true,
    },
    {
      id: 'mat-2',
      driveFileId: 'demo-2',
      nome: nomeDi(lezioniSmm[1], 'slide', 1, 'pdf'),
      webViewLink: null,
      mimeType: 'application/pdf',
      tipo: 'slide',
      versione: 1,
      corsoId: cSmm.id,
      lezioniIds: [lezioniSmm[1].id],
      tag: ['contenuti'],
      riutilizzabile: false,
      consegnatoA: [],
      parsingOk: true,
    },
    {
      id: 'mat-3',
      driveFileId: 'demo-3',
      nome: nomeDi(lezioniSmm[2], 'esercizio', 1, 'pdf'),
      webViewLink: null,
      mimeType: 'application/pdf',
      tipo: 'esercizio',
      versione: 1,
      corsoId: cSmm.id,
      // Stesso file usato in due lezioni: un solo documento, due riferimenti.
      lezioniIds: [lezioniSmm[2].id, lezioniSmm[3].id],
      tag: ['ai', 'prompting'],
      riutilizzabile: false,
      consegnatoA: [],
      parsingOk: true,
    },
    {
      id: 'mat-lib-1',
      driveFileId: 'demo-4',
      nome: componiNomeLibreria({ tipo: 'esercizio', argomento: 'prompt brief', versione: 1, estensione: 'pdf' }),
      webViewLink: null,
      mimeType: 'application/pdf',
      tipo: 'esercizio',
      versione: 1,
      corsoId: null,
      lezioniIds: [],
      tag: ['prompting', 'ai'],
      riutilizzabile: true,
      consegnatoA: [{ enteId: 'ente-sichenia', data: aChiave(g(-1, 2)), versione: 1 }],
      parsingOk: true,
    },
    {
      id: 'mat-lib-2',
      driveFileId: 'demo-5',
      nome: componiNomeLibreria({ tipo: 'slide', argomento: 'canva basi', versione: 3, estensione: 'pdf' }),
      webViewLink: null,
      mimeType: 'application/pdf',
      tipo: 'slide',
      versione: 3,
      corsoId: null,
      lezioniIds: [],
      tag: ['canva', 'contenuti'],
      riutilizzabile: true,
      consegnatoA: [],
      parsingOk: true,
    },
    // Fuori convenzione: finiscono nella coda "Da sistemare".
    {
      id: 'mat-x-1',
      driveFileId: 'demo-6',
      nome: 'Presentazione modulo 4 DEF.pptx',
      webViewLink: null,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      tipo: 'slide',
      versione: 1,
      corsoId: cSmm.id,
      lezioniIds: [],
      tag: [],
      riutilizzabile: false,
      consegnatoA: [],
      parsingOk: false,
      cartella: 'M04',
      createdTime: aChiave(g(0, 0)),
    },
    {
      id: 'mat-x-2',
      driveFileId: 'demo-7',
      nome: 'slide ai 12-09-2026 (1).pdf',
      webViewLink: null,
      mimeType: 'application/pdf',
      tipo: 'slide',
      versione: 1,
      corsoId: cAi.id,
      lezioniIds: [],
      tag: [],
      riutilizzabile: false,
      consegnatoA: [],
      parsingOk: false,
      cartella: 'M02',
      createdTime: aChiave(g(-1, 2)),
    },
    {
      id: 'mat-x-3',
      driveFileId: 'demo-8',
      nome: 'registro presenze sichenia.xlsx',
      webViewLink: null,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      tipo: 'registro',
      versione: 1,
      corsoId: cAi.id,
      lezioniIds: [],
      tag: [],
      riutilizzabile: false,
      consegnatoA: [],
      parsingOk: false,
      cartella: 'M01',
      createdTime: aChiave(g(-1, 2)),
    },
    {
      id: 'mat-x-4',
      driveFileId: 'demo-9',
      nome: 'esercizio prompt brief_v2.docx',
      webViewLink: null,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      tipo: 'esercizio',
      versione: 2,
      corsoId: null,
      lezioniIds: [],
      tag: ['prompting'],
      riutilizzabile: true,
      consegnatoA: [],
      parsingOk: false,
      cartella: '_Libreria',
      createdTime: aChiave(g(-3, 4)),
    },
  ]

  return { enti: ENTI, programmi: PROGRAMMI, corsi, lezioni, materiali }
}
