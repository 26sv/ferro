/* Configurazione letta dalle variabili d'ambiente. Sta in un file suo, senza
   importare l'SDK: così sapere *se* Firebase è configurato non costa 400 kB
   di JavaScript scaricati prima del primo disegno. */

export const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Senza queste due l'app parte in modalità demo. */
export const configurato = Boolean(config.apiKey && config.projectId)

export const OWNER_UID = import.meta.env.VITE_OWNER_UID ?? ''
