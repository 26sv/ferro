# GESTIONALE FORMAZIONE

App per un formatore freelance: programmi riutilizzabili, corsi venduti a monte
ore, lezioni, e i file che stanno su Drive. Si usa dal telefono in aula e dal
computer alla scrivania, con la stessa interfaccia.

Tre problemi da risolvere, in quest'ordine: non riscrivere da zero un programma
già erogato altrove; sapere quale versione di quale file è andata a quale
cliente; sapere quante ore sono state fatte per ente e per tipologia.

Utente singolo. Nessun ruolo, nessun invito, nessun onboarding.

## Comandi

```bash
npm install
npm run dev      # server locale, --host così si apre dal telefono sulla stessa rete
npm run build
npm run preview
npm run seed     # primo popolamento di Firestore, vedi README
```

## Stack

- React 18 + Vite, PWA con vite-plugin-pwa
- Firestore per i dati, Google Drive per i file
- Apps Script come unico ponte verso Drive (`apps-script/Codice.gs`)
- Nessuna libreria di UI e nessuna libreria di grafici: le barre sono div, e
  parlano la stessa lingua della barra del monte ore

## Struttura

```
src/
  App.jsx                  guscio: navigazione e scelta della schermata
  schermate/               una per voce di menu, più DettaglioCorso
  componenti/              BarraMonteOre, Modale, i form, le icone
  dati/
    config.js              variabili d'ambiente, senza importare l'SDK
    firebase.js            SDK Firebase, importato solo dinamicamente
    deposito.js            interfaccia di persistenza + attuazione demo
    depositoFirestore.js   attuazione Firestore
    store.jsx              contesto React: collezioni in memoria e azioni
    semi.js                dati di partenza, condivisi tra seed e demo
  drive/appsScript.js      client della web app
  lib/                     date, calcoli sulle ore, nomi file, rotte
apps-script/Codice.gs      backend Drive
firestore.rules            lettura e scrittura solo al proprietario
```

## Come funziona

**I dati** stanno in cinque collezioni: `enti`, `programmi`, `corsi`, `lezioni`,
`materiali`. Un programma è il template (moduli, ore, obiettivi); un corso è
quel programma erogato a un ente in un'edizione; le lezioni sono le singole
giornate.

Le lezioni portano dentro di sé `enteSigla`, `corsoSigla` e `tipologia` anche se
sono già nel corso. È voluto: Firestore non fa join, e senza quei campi ogni
numero della schermata Numeri diventerebbe una catena di query annidate.

**Il deposito** è l'unico posto che scrive. `ottieniDeposito()` è asincrona e
restituisce l'attuazione Firestore se le variabili d'ambiente ci sono, quella
demo (memoria + localStorage, dati da `semi.js`) se mancano. Le collezioni si
tengono per intero in memoria: sono piccole, e così le schermate incrociano
corsi, lezioni e materiali senza una query per riga.

**Le ore erogate di un corso** non si scrivono a mano: `ricalcolaCorso` in
`store.jsx` le ricalcola dalle lezioni a ogni cambio di stato, insieme allo
stato del corso, e le due scritture partono nello stesso lotto.

**I nomi file** hanno un formato solo, `AAAA-MM-GG_ENTE_CORSO_M##_tipo_v#.est`,
e i file di libreria `LIB_tipo_argomento_v#.est`. `lib/nomiFile.js` li legge, li
scrive e propone una correzione per quelli fuori convenzione, deducendo data,
ente, corso, modulo e tipo da cartella, data di creazione e nome attuale.
`dedotti` elenca cosa è stato tirato a indovinare, e l'interfaccia lo mostra
invece di far finta di niente.

**Drive** risponde solo attraverso Apps Script. `scanFolder` è ricorsivo,
limitato in profondità e paginato con un segnaposto: su cartelle grandi
un'esecuzione sola andrebbe oltre i sei minuti.

## Direzione visiva

Il riferimento non è la dashboard SaaS: è l'orario appeso in aula, il registro,
il monte ore che si consuma lezione dopo lezione.

- Tutti i colori e le misure stanno in `stili/token.css`. Nel resto del CSS non
  si scrive mai un valore a mano.
- Scala tipografica a sei gradini: 12 / 14 / 16 / 20 / 28 / 44. Nessuna misura
  intermedia inventata per caso.
- Tre famiglie con ruoli fissi: Bricolage Grotesque per i titoli e i numeri
  grandi, Public Sans per i testi, JetBrains Mono per date, orari, sigle e
  codici modulo.
- `--evidenziatore` è il segnale, non una decorazione: **una apparizione per
  schermata**. Nella Settimana è la passata storta sulla colonna di oggi,
  l'unico dettaglio volutamente imperfetto dell'interfaccia. Il fuoco da
  tastiera lo usa anch'esso, ed è l'unica eccezione ammessa.
- I colori per tipologia stanno sotto ai segmenti e alle bande laterali, mai
  sotto al testo: solo `--tipologia-smm` e `--tipologia-ai` passerebbero AA.
- **La barra del monte ore** (`componenti/BarraMonteOre.jsx`) è l'elemento che
  rende l'app riconoscibile: un segmento per lezione, largo quanto le sue ore,
  in tre varianti (`lista`, `dettaglio`, `card`). Quando una lezione passa a
  erogata il segmento si riempie da sinistra in 320 ms: è l'unica animazione
  elaborata dell'app, e `prefers-reduced-motion` la spegne.
- Anche i grafici della schermata Numeri sono fatti di quei segmenti: un solo
  linguaggio grafico, non due.
- Il reset dei bottoni è `:where(button)`: senza `:where()` la sua specificità
  batte le classi con fondo pieno (`.btn-primario`) e le rende trasparenti.

## Convenzioni

- Interfaccia, commenti e nomi di funzione in italiano
- Il pulsante dice cosa succede ("Segna erogata", non "Aggiorna stato"), e
  l'azione mantiene lo stesso nome fino alla conferma ("Rinomina" → "Rinominati
  14 file")
- Errori concreti: "Il file non è più su Drive, forse è stato spostato", non
  "Errore di sincronizzazione"
- Gli stati vuoti sono un invito, non un rimprovero
- Mobile first vero: sotto gli 860 px la settimana diventa un'agenda verticale,
  non la stessa griglia rimpicciolita (`useSchermoStretto`)

## Vincoli

- Nessun file viene rinominato o spostato senza una conferma esplicita. Mai.
- Un materiale usato in tre lezioni resta un file solo con tre riferimenti:
  su Drive non si duplica niente.
- Niente gestione utenti, permessi, inviti.
- Nessuna schermata nuova oltre alle sei della barra senza chiedere prima.
- Responsive fino a 360 px, tocchi da 44 px, contrasto AA, fuoco sempre visibile.

## Cose da fare

- [ ] Presenze e attestati: la collezione `presenze` è nel modello ma non c'è
      ancora né interfaccia né PDF. Serve solo per i corsi finanziati.
- [ ] `scanFolder` limitata alla cartella di un corso, non solo alla radice
- [ ] Consegna al cliente: `consegnatoA` si popola solo dal seed, manca il gesto
      "ho consegnato questa versione a questo ente"
- [ ] Le query filtrate degli indici in `firestore.indexes.json` non sono ancora
      usate: oggi si carica tutto e si filtra in memoria. Vanno usate quando le
      lezioni supereranno il migliaio.
- [ ] Il chunk di Firebase è 519 kB: si può togliere `firebase/auth` passando a
      un accesso con link via email, o restare così e accettarlo
