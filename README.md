# GYM BUDDY

Scheda di forza, cronometro serie e recuperi, storico e progressi.
Chiede l'energia a ogni apertura e la soddisfazione a fine seduta; la scheda Dati
mostra su un calendario i giorni in cui mi sono allenato.

## Avvio

```bash
npm install
npm run dev
```

Vite stampa due indirizzi. Quello `Network:` si apre dal telefono
collegato alla stessa rete wifi.

## Installazione sul telefono

Serve HTTPS (oppure localhost): in locale il Wake Lock e l'installazione
PWA non funzionano dall'indirizzo di rete. Per usarla davvero in palestra
pubblicala su un hosting statico:

```bash
npm run build      # genera dist/
```

Poi trascina `dist/` su Netlify Drop, oppure collega la repo a Vercel.
Dal browser del telefono: Condividi, "Aggiungi a schermata Home".

## Dati

Tutto in `localStorage`, chiave `gymbuddy:palestra-v1`. Niente account,
niente server. Svuotare i dati del sito cancella lo storico, quindi
prima o poi vale la pena implementare l'export in JSON.

Chi arriva dalla vecchia versione chiamata Ferro non deve fare niente:
al primo avvio `migraDaFerro()` ricopia le chiavi `ferro:` sotto il nuovo
prefisso, lasciando le originali al loro posto per sicurezza.
