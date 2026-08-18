# GYM BUDDY

App personale per gestire la scheda di forza in palestra: la consulto col telefono
appoggiato alla panca, tra una serie e l'altra.

Si chiamava Ferro fino ad agosto 2026. Il rename ha portato con sé il path di
GitHub Pages (`/gym-buddy/`, deve combaciare col nome della repo) e il prefisso di
localStorage (`gymbuddy:`); `migraDaFerro()` in `storage.js` ricopia i dati vecchi.

## Comandi

```bash
npm install
npm run dev      # server locale, --host così lo apro dal telefono sulla stessa rete
npm run build
npm run preview
```

## Stack

- React 18 + Vite
- recharts per il grafico dell'andamento
- vite-plugin-pwa per l'installazione sul telefono
- Nessuna libreria di UI: tutto il CSS sta in un tag `<style>` dentro `App.jsx`,
  con le variabili colore su `.root`

## Struttura

```
src/App.jsx       tutta l'app: dati della scheda, schermate, stile
src/storage.js    adattatore di persistenza su localStorage
public/icon.svg   icona PWA
```

## Come funziona

`PROGRAM` in cima ad `App.jsx` descrive le due sedute (A e B) e i relativi esercizi.
Cambiare la scheda significa cambiare quell'oggetto, nient'altro.

Lo stato dell'app è un unico oggetto salvato sotto la chiave `gymbuddy:palestra-v1`:

```js
{
  history: [ { id, date, type, durationSec, log: { exId: [{weight, reps}] },
               feel, satisfaction: 1..4, energy: 1..4 } ],
  lastWeights: { exId: number },
  weeklyTarget: 2 | 3,
  active: { type, startedAt, log, warmup, energy } | null,
  userName: string | null,
  energyLog: [ { ts, level: 1..4 } ]   // più recente in testa, tenuti gli ultimi 400
}
```

`active` viene salvato a ogni serie registrata: se chiudo l'app a metà allenamento
e riapro, ritrovo il cronometro che gira e le serie già fatte.

Due scale a quattro gradini, `ENERGIA` e `SODDISFAZIONE`, entrambe in cima ad
`App.jsx`. L'energia si chiede a ogni apertura, la soddisfazione a fine seduta;
l'energia del momento viene copiata dentro `active.energy` all'avvio della seduta,
così la riga di storico porta con sé come sono partito e come sono finito.

Al primo avvio in assoluto (`userName` nullo) l'app mostra `Onboarding` al posto di
tutto il resto; da lì in poi la topbar saluta con "Ciao <nome>". Lo stesso componente
serve al pulsante "Cambia" nella scheda Dati.

## Convenzioni

- Interfaccia e commenti in italiano
- Le scritture su storage passano da un debounce di 500 ms (`persist`), non chiamare
  `storage.set` a raffica. `salvaSubito` scrive senza attesa: è per le scelte una tantum
  (nome, energia) dopo le quali si può ricaricare la pagina all'istante
- Tre famiglie tipografiche con ruoli fissi: Big Shoulders Display per i titoli,
  Space Grotesk per i testi, Space Mono per tutti i numeri
- Niente numeri o colori scritti a mano nel CSS: usare le variabili su `.root`
- Il reset dei bottoni è `:where(.root button)`: senza `:where()` la sua specificità
  batte le classi con sfondo pieno (`.btn-primary`, `.cal-a`…) e le rende trasparenti

## Vincoli

- Deve restare usabile con una mano sola e leggibile a un metro di distanza
- Il Wake Lock funziona solo su HTTPS o localhost
- Ogni funzione nuova non deve allungare il percorso "registra la serie": resta un solo tocco
- Il prompt dell'energia non compare mai a seduta aperta: riaprendo tra una serie e
  l'altra devo ritrovare il cronometro, non una domanda

## Cose da fare

- [ ] Il bundle è a 561 kB perché recharts entra tutto: caricarlo con `React.lazy`
      solo quando apro la scheda Progressi
- [ ] Export e import dello storico in JSON (`esporta()` in `storage.js` è già pronta,
      manca il pulsante e la reimportazione)
- [ ] Deload automatico: dopo 5 settimane piene proporre la settimana a carico ridotto
- [ ] Incrociare le sensazioni al ginocchio con il carico usato, per capire quale
      esercizio le fa comparire
- [ ] Spostare `PROGRAM` in un file separato e renderlo modificabile dall'app
- [ ] Splittare `App.jsx`: ormai sfiora le 1400 righe, le schermate vanno separate
- [ ] Nella scheda Dati, mettere a confronto energia iniziale e soddisfazione finale
      seduta per seduta, non solo come due medie separate
