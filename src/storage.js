/**
 * Adattatore di persistenza.
 *
 * Negli artifact di Claude esiste window.storage (asincrono).
 * Qui fuori quell'oggetto non c'è, quindi replichiamo la stessa identica
 * interfaccia sopra localStorage: App.jsx non sa la differenza e resta
 * portabile in entrambi i mondi.
 *
 * Se un domani vuoi sincronizzare su Firestore, ti basta riscrivere
 * questo file mantenendo le stesse quattro funzioni.
 */

const PREFIX = "gymbuddy:";

/* L'app si chiamava Ferro e scriveva sotto "ferro:". Le vecchie chiavi restano
   dove sono: le ricopiamo, non le spostiamo, così un rollback non perde niente. */
const PREFIX_FERRO = "ferro:";

export const storage = {
  async get(key) {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) throw new Error(`chiave non trovata: ${key}`);
    return { key, value: raw };
  },

  async set(key, value) {
    localStorage.setItem(PREFIX + key, value);
    return { key, value };
  },

  async delete(key) {
    localStorage.removeItem(PREFIX + key);
    return { key, deleted: true };
  },

  async list(prefix = "") {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX + prefix)) keys.push(k.slice(PREFIX.length));
    }
    return { keys, prefix };
  },
};

/**
 * Ricopia una tantum i dati salvati dalle versioni chiamate Ferro.
 * Va chiamata prima della prima lettura. Copia solo le chiavi che ancora non
 * esistono sotto il prefisso nuovo, quindi rieseguirla non sovrascrive nulla.
 */
export function migraDaFerro() {
  try {
    const vecchie = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX_FERRO)) vecchie.push(k);
    }
    for (const k of vecchie) {
      const nuova = PREFIX + k.slice(PREFIX_FERRO.length);
      if (localStorage.getItem(nuova) === null) localStorage.setItem(nuova, localStorage.getItem(k));
    }
  } catch (e) {
    /* localStorage negato (navigazione privata): si riparte da zero */
  }
}

/** Esporta tutto lo storico in un file JSON (backup manuale). */
export async function esporta() {
  const { keys } = await storage.list();
  const out = {};
  for (const k of keys) {
    try {
      out[k] = JSON.parse((await storage.get(k)).value);
    } catch (e) {
      /* chiave non leggibile, la salto */
    }
  }
  return JSON.stringify(out, null, 2);
}
