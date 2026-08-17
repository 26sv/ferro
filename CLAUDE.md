# Ferro

App personale per gestire la scheda di forza in palestra: la consulto col telefono
appoggiato alla panca, tra una serie e l'altra.

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

Lo stato dell'app è un unico oggetto salvato sotto la chiave `ferro:palestra-v1`:

```js
{
  history: [ { id, date, type, durationSec, log: { exId: [{weight, reps}] }, feel } ],
  lastWeights: { exId: number },
  weeklyTarget: 2 | 3,
  active: { type, startedAt, log, warmup } | null
}
```

`active` viene salvato a ogni serie registrata: se chiudo l'app a metà allenamento
e riapro, ritrovo il cronometro che gira e le serie già fatte.

## Convenzioni

- Interfaccia e commenti in italiano
- Le scritture su storage passano da un debounce di 500 ms, non chiamare `storage.set` a raffica
- Tre famiglie tipografiche con ruoli fissi: Big Shoulders Display per i titoli,
  Space Grotesk per i testi, Space Mono per tutti i numeri
- Niente numeri o colori scritti a mano nel CSS: usare le variabili su `.root`

## Vincoli

- Deve restare usabile con una mano sola e leggibile a un metro di distanza
- Il Wake Lock funziona solo su HTTPS o localhost
- Ogni funzione nuova non deve allungare il percorso "registra la serie": resta un solo tocco

## Cose da fare

- [ ] Il bundle è a 561 kB perché recharts entra tutto: caricarlo con `React.lazy`
      solo quando apro la scheda Progressi
- [ ] Export e import dello storico in JSON (`esporta()` in `storage.js` è già pronta,
      manca il pulsante e la reimportazione)
- [ ] Deload automatico: dopo 5 settimane piene proporre la settimana a carico ridotto
- [ ] Incrociare le sensazioni al ginocchio con il carico usato, per capire quale
      esercizio le fa comparire
- [ ] Spostare `PROGRAM` in un file separato e renderlo modificabile dall'app
- [ ] Splittare `App.jsx`: sopra le 1000 righe conviene separare le schermate
