/* Primo popolamento di Firestore: due enti, i programmi, i corsi e i
   materiali di esempio. Idempotente, gli id sono fissi.
 *
 * Serve una chiave di servizio (Firebase Console > Impostazioni progetto >
 * Account di servizio > Genera nuova chiave privata):
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./chiave.json npm run seed
 *   GOOGLE_APPLICATION_CREDENTIALS=./chiave.json npm run seed -- --forza
 *
 * Senza `--forza` i documenti che esistono già restano come sono.
 */

import { existsSync, readFileSync } from 'node:fs'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { costruisciSemi } from '../src/dati/semi.js'

const forza = process.argv.includes('--forza')

// Le variabili di .env.local valgono anche qui: il progetto è lo stesso.
if (existsSync('.env.local')) {
  for (const riga of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(riga)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    'Manca GOOGLE_APPLICATION_CREDENTIALS: indica il file json della chiave di servizio.',
  )
  process.exit(1)
}

initializeApp({ credential: applicationDefault(), projectId })

const db = getFirestore()
const semi = costruisciSemi()

let scritti = 0
let saltati = 0

for (const [collezione, documenti] of Object.entries(semi)) {
  for (const { id, ...dati } of documenti) {
    const riferimento = db.collection(collezione).doc(id)
    if (!forza && (await riferimento.get()).exists) {
      saltati += 1
      continue
    }
    await riferimento.set(dati)
    scritti += 1
  }
}

console.log(
  `Scritti ${scritti} documenti in ${Object.keys(semi).length} collezioni.` +
    (saltati ? ` Saltati ${saltati} già presenti (usa --forza per sovrascriverli).` : ''),
)
process.exit(0)
