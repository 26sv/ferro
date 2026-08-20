# GESTIONALE FORMAZIONE

Programmi riutilizzabili, corsi venduti a monte ore, lezioni sul calendario e i
file che restano su Google Drive. Si apre sul telefono in aula e sul computer
alla scrivania.

## Avvio

```bash
npm install
npm run dev
```

Vite stampa due indirizzi: quello `Network:` si apre dal telefono collegato alla
stessa rete wifi.

Senza configurazione l'app parte in **modalità demo**: due enti, tre programmi,
tre corsi e qualche file fuori convenzione, tutto salvato nel browser. Serve per
guardarla girare prima di collegare Firebase.

## Collegare Firebase

1. Crea un progetto su [console.firebase.google.com](https://console.firebase.google.com),
   aggiungi un'app web e attiva **Firestore** e **Authentication** con il
   provider Google.
2. Copia `.env.example` in `.env.local` e riempi i valori.
3. In `firestore.rules` sostituisci `INCOLLA_QUI_UID_DEL_PROPRIETARIO` con il tuo
   uid (Authentication > Utenti), mettilo anche in `VITE_OWNER_UID`, e pubblica
   regole e indici:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

4. Primo popolamento, con la chiave di servizio scaricata da
   Impostazioni progetto > Account di servizio:

   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=./chiave.json npm run seed
   ```

   Il seed è idempotente: rilanciarlo non duplica niente. Con `-- --forza`
   sovrascrive quello che c'è.

## Collegare Drive

I file restano su Drive: l'app ne salva solo `driveFileId` e `webViewLink`, e
non sposta né rinomina niente senza conferma.

1. Crea un progetto su [script.google.com](https://script.google.com) e incolla
   `apps-script/Codice.gs`.
2. Impostazioni progetto > Proprietà script: aggiungi `SEGRETO` con una stringa
   lunga a caso.
3. Distribuisci > Nuova distribuzione > App web, **esegui come: me**,
   **chi ha accesso: chiunque abbia il link**.
4. Metti l'indirizzo della web app in `VITE_APPS_SCRIPT_URL`, lo stesso segreto
   in `VITE_APPS_SCRIPT_SEGRETO`, e l'id della cartella `/Formazione` in
   `VITE_DRIVE_ROOT_ID`.

Sull'accesso "chiunque abbia il link": la configurazione più chiusa
("solo io") da browser non funziona, perché la chiamata viene rimandata alla
pagina di login di Google e la risposta arriva opaca. Il segreto tiene fuori
chiunque non lo conosca; la nota completa sta in fondo a `apps-script/Codice.gs`.

## Nomi dei file

Un formato solo:

```
2026-09-14_FILIPPORE_SMMAI_M03_slide_v2.pdf
LIB_esercizio_prompt-brief_v1.pdf
```

Quello che non lo rispetta finisce nella coda **Da sistemare**, dove l'app
propone il nome corretto e mostra il prima e il dopo. Si rinomina solo quello
che spunti, e solo quando premi il pulsante.

## Struttura su Drive

```
/Formazione
  /_Libreria                 materiali riutilizzabili, senza data
  /FILIPPORE
    /2026_SMMAI
      /M01 /M02 /M03
```

Le cartelle mancanti le crea l'app quando prepari un corso. I file che ci sono
già non vengono mai spostati.

## Installazione sul telefono

Serve HTTPS (o localhost). Pubblicata su un hosting statico — `npm run build`
genera `dist/` — dal browser del telefono: Condividi, "Aggiungi a schermata
Home". I materiali dell'ultimo corso aperto restano consultabili anche senza
rete.
