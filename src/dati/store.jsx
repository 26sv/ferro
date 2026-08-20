/* Stato dell'app: le cinque collezioni sempre in memoria, più le azioni che
   le scrivono. I componenti non parlano mai direttamente col deposito. */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { COLLEZIONI, ottieniDeposito } from './deposito.js'
import { configurato } from './config.js'
import { nuovoId } from './identita.js'
import { aChiave, aData, aggiungiGiorni, minutiDaOra, oraDaMinuti, oreTra } from '../lib/date.js'
import { lezioniDelCorso, oreErogate, statoDedotto } from '../lib/calcoli.js'

const Contesto = createContext(null)

const VUOTO = { enti: [], programmi: [], corsi: [], lezioni: [], materiali: [] }

export function ProvvedituraDati({ children }) {
  const [dati, setDati] = useState(VUOTO)
  const [caricate, setCaricate] = useState(0)
  const [errore, setErrore] = useState(null)

  // Le azioni leggono da qui: lo stato al momento del clic, non quello
  // catturato quando la funzione è stata creata.
  const ultimi = useRef(VUOTO)
  ultimi.current = dati

  useEffect(() => {
    let vivo = true
    const stop = []
    const viste = new Set()

    ottieniDeposito().then((deposito) => {
      if (!vivo) return
      for (const c of COLLEZIONI) {
        stop.push(
          deposito.osserva(
            c,
            (elenco) => {
              setDati((precedente) => ({ ...precedente, [c]: elenco }))
              if (!viste.has(c)) {
                viste.add(c)
                setCaricate(viste.size)
              }
            },
            (err) => setErrore(err),
          ),
        )
      }
    })

    return () => {
      vivo = false
      stop.forEach((f) => f?.())
    }
  }, [])

  /** Riallinea ore erogate e stato del corso dopo un cambio sulle lezioni. */
  const ricalcolaCorso = useCallback((corsoId, lezioni) => {
    const corso = ultimi.current.corsi.find((c) => c.id === corsoId)
    if (!corso) return []
    const sue = lezioniDelCorso(lezioni, corsoId)
    const erogate = oreErogate(sue)
    const stato = statoDedotto(corso, lezioni)
    if (corso.oreErogate === erogate && corso.stato === stato) return []
    return [
      { collezione: 'corsi', tipo: 'aggiorna', id: corsoId, dati: { oreErogate: erogate, stato } },
    ]
  }, [])

  const azioni = useMemo(() => {
    const conRicalcolo = async (corsoId, operazioni, lezioniDopo) => {
      const deposito = await ottieniDeposito()
      await deposito.lotto([...operazioni, ...ricalcolaCorso(corsoId, lezioniDopo)])
    }

    return {
      modalita: configurato ? 'firestore' : 'demo',

      /* --- Lezioni --- */

      async salvaLezione(lezione) {
        const corso = ultimi.current.corsi.find((c) => c.id === lezione.corsoId)
        const completa = {
          ...lezione,
          data: aChiave(lezione.data),
          ore: oreTra(lezione.oraInizio, lezione.oraFine),
          enteSigla: corso?.enteSigla ?? lezione.enteSigla ?? '',
          corsoSigla: corso?.corsoSigla ?? lezione.corsoSigla ?? '',
          tipologia: corso?.tipologia ?? lezione.tipologia ?? 'altro',
        }
        const nuova = !completa.id
        const id = completa.id ?? nuovoId('lez')
        const dopo = nuova
          ? [...ultimi.current.lezioni, { ...completa, id }]
          : ultimi.current.lezioni.map((l) => (l.id === id ? { ...l, ...completa } : l))
        await conRicalcolo(
          completa.corsoId,
          [
            {
              collezione: 'lezioni',
              tipo: nuova ? 'crea' : 'aggiorna',
              id,
              dati: { ...completa, id },
            },
          ],
          dopo,
        )
        return id
      },

      async cambiaStatoLezione(id, stato) {
        const lezione = ultimi.current.lezioni.find((l) => l.id === id)
        if (!lezione) return
        const dopo = ultimi.current.lezioni.map((l) => (l.id === id ? { ...l, stato } : l))
        await conRicalcolo(
          lezione.corsoId,
          [{ collezione: 'lezioni', tipo: 'aggiorna', id, dati: { stato } }],
          dopo,
        )
      },

      async eliminaLezione(id) {
        const lezione = ultimi.current.lezioni.find((l) => l.id === id)
        if (!lezione) return
        const dopo = ultimi.current.lezioni.filter((l) => l.id !== id)
        await conRicalcolo(lezione.corsoId, [{ collezione: 'lezioni', tipo: 'elimina', id }], dopo)
      },

      /* --- Corsi --- */

      /**
       * Duplica i moduli di un programma dentro un corso nuovo: qui sta il
       * risparmio di tempo, un programma già erogato non si riscrive.
       */
      async creaCorsoDaProgramma({
        programmaId,
        enteId,
        dataInizio,
        giorni,
        oraInizio,
        luogo,
        modalita,
        edizione,
      }) {
        const programma = ultimi.current.programmi.find((p) => p.id === programmaId)
        const ente = ultimi.current.enti.find((e) => e.id === enteId)
        if (!programma || !ente) throw new Error('Programma o ente non trovato')

        const corsoId = nuovoId('corso')
        const date = pianificaDate(dataInizio, giorni, programma.moduli.length)

        const lezioni = programma.moduli.map((modulo, i) => ({
          id: nuovoId('lez'),
          corsoId,
          moduloN: modulo.n,
          data: aChiave(date[i]),
          oraInizio,
          oraFine: oraDaMinuti(minutiDaOra(oraInizio) + modulo.ore * 60),
          ore: modulo.ore,
          luogo: luogo ?? '',
          modalita: modalita ?? 'presenza',
          stato: 'pianificata',
          titolo: modulo.titolo,
          note: '',
          enteSigla: ente.sigla,
          corsoSigla: programma.sigla,
          tipologia: programma.tipologia,
        }))

        const corso = {
          id: corsoId,
          programmaId,
          enteId,
          enteSigla: ente.sigla,
          corsoSigla: programma.sigla,
          tipologia: programma.tipologia,
          edizione: edizione || String(aData(dataInizio).getFullYear()),
          oreTotali: programma.oreTotali,
          oreErogate: 0,
          periodo: { inizio: aChiave(date[0]), fine: aChiave(date[date.length - 1]) },
          stato: 'pianificato',
          driveFolderId: null,
        }

        const deposito = await ottieniDeposito()
        await deposito.lotto([
          { collezione: 'corsi', tipo: 'crea', dati: corso },
          ...lezioni.map((l) => ({ collezione: 'lezioni', tipo: 'crea', dati: l })),
        ])
        return corsoId
      },

      async salvaCorso(corso) {
        const deposito = await ottieniDeposito()
        const id = corso.id ?? nuovoId('corso')
        if (corso.id) await deposito.aggiorna('corsi', id, corso)
        else await deposito.crea('corsi', { ...corso, id })
        return id
      },

      async eliminaCorso(id) {
        const deposito = await ottieniDeposito()
        const sue = ultimi.current.lezioni.filter((l) => l.corsoId === id)
        await deposito.lotto([
          ...sue.map((l) => ({ collezione: 'lezioni', tipo: 'elimina', id: l.id })),
          { collezione: 'corsi', tipo: 'elimina', id },
        ])
      },

      /* --- Programmi ed enti --- */

      async salvaProgramma(programma) {
        const deposito = await ottieniDeposito()
        const id = programma.id ?? nuovoId('prog')
        const dati = { ...programma, id, aggiornatoIl: new Date().toISOString() }
        if (programma.id) await deposito.aggiorna('programmi', id, dati)
        else await deposito.crea('programmi', dati)
        return id
      },

      async eliminaProgramma(id) {
        const deposito = await ottieniDeposito()
        await deposito.elimina('programmi', id)
      },

      async salvaEnte(ente) {
        const deposito = await ottieniDeposito()
        const id = ente.id ?? nuovoId('ente')
        if (ente.id) await deposito.aggiorna('enti', id, ente)
        else await deposito.crea('enti', { ...ente, id })
        return id
      },

      async eliminaEnte(id) {
        const deposito = await ottieniDeposito()
        await deposito.elimina('enti', id)
      },

      /* --- Materiali --- */

      async salvaMateriale(materiale) {
        const deposito = await ottieniDeposito()
        const id = materiale.id ?? nuovoId('mat')
        if (materiale.id) await deposito.aggiorna('materiali', id, materiale)
        else await deposito.crea('materiali', { ...materiale, id })
        return id
      },

      async eliminaMateriale(id) {
        const deposito = await ottieniDeposito()
        await deposito.elimina('materiali', id)
      },

      /** Applica i nuovi nomi già confermati dall'utente. */
      async applicaRinomine(rinomine) {
        const deposito = await ottieniDeposito()
        await deposito.lotto(
          rinomine.map(({ id, nome }) => ({
            collezione: 'materiali',
            tipo: 'aggiorna',
            id,
            dati: { nome, parsingOk: true, ultimoSync: new Date().toISOString() },
          })),
        )
      },

      /** Aggiunge o aggiorna i file arrivati da una scansione di Drive. */
      async importaDaDrive(file, { corsoId = null } = {}) {
        const esistenti = new Map(ultimi.current.materiali.map((m) => [m.driveFileId, m]))
        const operazioni = file.map((f) => {
          const vecchio = esistenti.get(f.id)
          const dati = {
            driveFileId: f.id,
            nome: f.nome,
            webViewLink: f.webViewLink ?? null,
            mimeType: f.mimeType ?? null,
            cartella: f.cartella ?? null,
            createdTime: f.createdTime ?? null,
            ultimoSync: new Date().toISOString(),
          }
          return vecchio
            ? { collezione: 'materiali', tipo: 'aggiorna', id: vecchio.id, dati }
            : {
                collezione: 'materiali',
                tipo: 'crea',
                dati: {
                  ...dati,
                  id: nuovoId('mat'),
                  tipo: 'materiale',
                  versione: 1,
                  corsoId,
                  lezioniIds: [],
                  tag: [],
                  riutilizzabile: corsoId === null,
                  consegnatoA: [],
                  parsingOk: false,
                },
              }
        })
        const deposito = await ottieniDeposito()
        await deposito.lotto(operazioni)
        return operazioni.length
      },

      async ripristinaDemo() {
        const deposito = await ottieniDeposito()
        await deposito.ripristina?.()
      },
    }
  }, [ricalcolaCorso])

  const valore = useMemo(
    () => ({ ...dati, pronto: caricate === COLLEZIONI.length, errore, azioni }),
    [dati, caricate, errore, azioni],
  )

  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>
}

export function useDati() {
  const valore = useContext(Contesto)
  if (!valore) throw new Error('useDati fuori dalla ProvvedituraDati')
  return valore
}

/**
 * Date delle lezioni a partire da `inizio`, sui giorni della settimana scelti
 * (1 = lunedì ... 7 = domenica), finché non se ne hanno `quante`.
 */
export function pianificaDate(inizio, giorni, quante) {
  const ammessi = giorni?.length ? [...giorni] : [((aData(inizio).getDay() + 6) % 7) + 1]
  const date = []
  let cursore = aData(inizio)
  let passi = 0
  while (date.length < quante && passi < 400) {
    const numeroGiorno = ((cursore.getDay() + 6) % 7) + 1
    if (ammessi.includes(numeroGiorno)) date.push(cursore)
    cursore = aggiungiGiorni(cursore, 1)
    passi += 1
  }
  return date
}
