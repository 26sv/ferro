/* I file restano su Drive: qui ci sono solo i riferimenti, i filtri per
   ritrovarli e la coda di quelli fuori convenzione. Niente viene rinominato
   senza una conferma esplicita. */

import { useMemo, useState } from 'react'
import FormMateriale from '../componenti/FormMateriale.jsx'
import { useDati } from '../dati/store.jsx'
import { TIPI_MATERIALE, coloreTipologia } from '../lib/costanti.js'
import { analizzaNome, proponiNome } from '../lib/nomiFile.js'
import { driveConfigurato, RADICE_DRIVE, rinominaLotto, scansionaTutto } from '../drive/appsScript.js'

export default function Materiali() {
  const { materiali, corsi, enti, programmi, azioni } = useDati()
  const [vista, setVista] = useState('griglia')
  const [tipo, setTipo] = useState(null)
  const [tag, setTag] = useState(null)
  const [corsoId, setCorsoId] = useState('')
  const [messaggio, setMessaggio] = useState(null)
  const [scansione, setScansione] = useState(false)
  const [inScheda, setInScheda] = useState(null)

  const sigleEnti = enti.map((e) => e.sigla)
  const sigleCorsi = programmi.map((p) => p.sigla)

  /** Ogni file letto una volta sola: nome analizzato e, se serve, proposta. */
  const analizzati = useMemo(
    () =>
      materiali.map((m) => {
        const lettura = analizzaNome(m.nome)
        const corso = corsi.find((c) => c.id === m.corsoId)
        const proposta = lettura.ok
          ? null
          : proponiNome(
              { nome: m.nome, createdTime: m.createdTime },
              {
                enteSigla: corso?.enteSigla,
                corsoSigla: corso?.corsoSigla,
                cartella: m.cartella,
                sigleEnti,
                sigleCorsi,
                libreria: m.corsoId === null && (m.riutilizzabile || m.cartella === '_Libreria'),
              },
            )
        return { ...m, lettura, proposta, corso }
      }),
    [materiali, corsi, enti, programmi],
  )

  const daSistemare = analizzati.filter((m) => !m.lettura.ok)

  const tags = useMemo(
    () => [...new Set(materiali.flatMap((m) => m.tag ?? []))].sort(),
    [materiali],
  )

  const visibili = analizzati.filter((m) => {
    if (tipo && m.tipo !== tipo) return false
    if (tag && !(m.tag ?? []).includes(tag)) return false
    if (corsoId === '_libreria') return m.corsoId === null
    if (corsoId && m.corsoId !== corsoId) return false
    return true
  })

  async function scansionaDrive() {
    setScansione(true)
    setMessaggio('Leggo la cartella su Drive…')
    try {
      const file = await scansionaTutto(RADICE_DRIVE, {
        suProgresso: (quanti) => setMessaggio(`Letti ${quanti} file…`),
      })
      const quanti = await azioni.importaDaDrive(file)
      setMessaggio(`Aggiornati ${quanti} file da Drive.`)
    } catch (errore) {
      setMessaggio(errore.message)
    }
    setScansione(false)
  }

  return (
    <>
      <div className="intestazione">
        <div>
          <h1>Materiali</h1>
          <p className="dati tenue">{materiali.length} file collegati</p>
        </div>
        <div className="intestazione__azioni">
          {driveConfigurato && (
            <button type="button" className="btn btn-fantasma" onClick={scansionaDrive} disabled={scansione}>
              Scansiona Drive
            </button>
          )}
          <button
            type="button"
            className="btn"
            aria-pressed={vista === 'griglia'}
            onClick={() => setVista('griglia')}
          >
            Tutti
          </button>
          <button
            type="button"
            className={`btn${daSistemare.length ? ' btn-primario' : ''}`}
            aria-pressed={vista === 'coda'}
            onClick={() => setVista('coda')}
          >
            Da sistemare
            {daSistemare.length > 0 && <span className="badge">{daSistemare.length}</span>}
          </button>
        </div>
      </div>

      {messaggio && <p className="avviso">{messaggio}</p>}

      {vista === 'coda' ? (
        <Coda
          key={daSistemare.map((f) => f.id).join('|')}
          file={daSistemare}
          onFatto={(quanti) => {
            setMessaggio(`Rinominati ${quanti} file.`)
            setVista('griglia')
          }}
        />
      ) : (
        <>
          <div className="filtri">
            {TIPI_MATERIALE.map((t) => (
              <button
                key={t}
                type="button"
                className="chip"
                aria-pressed={tipo === t}
                onClick={() => setTipo(tipo === t ? null : t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="filtri">
            <select
              className="chip"
              value={corsoId}
              onChange={(e) => setCorsoId(e.target.value)}
              aria-label="Filtra per corso"
            >
              <option value="">Tutti i corsi</option>
              <option value="_libreria">Libreria trasversale</option>
              {corsi.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.corsoSigla} · {c.enteSigla}
                </option>
              ))}
            </select>
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                className="chip"
                aria-pressed={tag === t}
                onClick={() => setTag(tag === t ? null : t)}
              >
                #{t}
              </button>
            ))}
          </div>

          {!visibili.length ? (
            <div className="vuoto">
              <h2>Nessun file con questi filtri</h2>
              <p>Togli un filtro, oppure scansiona la cartella di Drive.</p>
            </div>
          ) : (
            <div className="griglia-materiali">
              {visibili.map((m) => (
                <article
                  className="materiale"
                  key={m.id}
                  style={{ '--colore': coloreTipologia(m.corso?.tipologia ?? 'altro') }}
                >
                  <p className="materiale__nome">{m.nome}</p>
                  <p className="materiale__meta">
                    <span>{m.tipo}</span>
                    <span>v{m.versione}</span>
                    {m.corso ? <span>{m.corso.corsoSigla}</span> : <span>libreria</span>}
                    {m.lezioniIds?.length > 1 && <span>{m.lezioniIds.length} lezioni</span>}
                  </p>
                  {m.tag?.length > 0 && (
                    <p className="materiale__meta">
                      {m.tag.map((t) => (
                        <span className="tag" key={t}>
                          {t}
                        </span>
                      ))}
                    </p>
                  )}
                  <div className="materiale__azioni">
                    <button
                      type="button"
                      className="btn btn-piccolo"
                      onClick={() => setInScheda(materiali.find((x) => x.id === m.id))}
                    >
                      Scheda
                    </button>
                    {m.webViewLink && (
                      <a className="btn btn-piccolo" href={m.webViewLink} target="_blank" rel="noreferrer">
                        Apri su Drive
                      </a>
                    )}
                    {!m.lettura.ok && (
                      <button type="button" className="btn btn-piccolo" onClick={() => setVista('coda')}>
                        Sistema il nome
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {inScheda && <FormMateriale materiale={inScheda} onChiudi={() => setInScheda(null)} />}
    </>
  )
}

/* ---------- Coda "Da sistemare" ---------- */

function Coda({ file, onFatto }) {
  const { azioni } = useDati()
  const [scelti, setScelti] = useState(() => new Set(file.filter((f) => f.proposta?.nome).map((f) => f.id)))
  const [nomi, setNomi] = useState(() =>
    Object.fromEntries(file.map((f) => [f.id, f.proposta?.nome ?? ''])),
  )
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState(null)

  const gira = (id) =>
    setScelti((s) => {
      const nuovo = new Set(s)
      if (nuovo.has(id)) nuovo.delete(id)
      else nuovo.add(id)
      return nuovo
    })

  const rinominabili = file.filter((f) => scelti.has(f.id) && nomi[f.id])

  async function rinomina() {
    setInCorso(true)
    setErrore(null)
    const rinomine = rinominabili.map((f) => ({ id: f.id, driveFileId: f.driveFileId, nome: nomi[f.id] }))
    try {
      if (driveConfigurato) {
        const esito = await rinominaLotto(
          rinomine.map((r) => ({ fileId: r.driveFileId, nuovoNome: r.nome })),
        )
        const riusciti = new Set(
          (esito.esiti ?? []).filter((e) => e.ok).map((e) => e.fileId),
        )
        const falliti = (esito.esiti ?? []).filter((e) => !e.ok)
        await azioni.applicaRinomine(rinomine.filter((r) => riusciti.has(r.driveFileId)))
        if (falliti.length) {
          setErrore(
            `${falliti.length} file non sono stati rinominati: forse sono stati spostati su Drive.`,
          )
          setInCorso(false)
          return
        }
        onFatto(riusciti.size)
      } else {
        await azioni.applicaRinomine(rinomine)
        onFatto(rinomine.length)
      }
    } catch (e) {
      setErrore(e.message)
      setInCorso(false)
    }
  }

  if (!file.length) {
    return (
      <div className="vuoto">
        <h2>Tutti i nomi sono a posto</h2>
        <p>Quando un file arriva fuori convenzione lo trovi qui, con il nome già proposto.</p>
      </div>
    )
  }

  return (
    <>
      <p className="avviso">
        {file.length} file fuori convenzione. Guarda i nomi proposti: cambio solo quelli spuntati.
      </p>

      {errore && <p className="avviso">{errore}</p>}

      <div className="coda">
        {file.map((f) => (
          <div className="coda__riga" key={f.id}>
            <input
              type="checkbox"
              checked={scelti.has(f.id)}
              onChange={() => gira(f.id)}
              disabled={!nomi[f.id]}
              aria-label={`Rinomina ${f.nome}`}
            />
            <div>
              <div className="coda__nomi">
                <span className="coda__prima">{f.nome}</span>
                <span className="coda__freccia" aria-hidden="true">
                  →
                </span>
                {nomi[f.id] ? (
                  <input
                    className={`coda__dopo${f.proposta?.sicuro ? '' : ' coda__dopo--incerto'}`}
                    value={nomi[f.id]}
                    onChange={(e) => setNomi((n) => ({ ...n, [f.id]: e.target.value }))}
                    aria-label={`Nuovo nome per ${f.nome}`}
                  />
                ) : (
                  <span className="coda__dopo tenue">{f.proposta?.motivo ?? 'Non so come chiamarlo'}</span>
                )}
              </div>
              {f.proposta?.dedotti?.length > 0 && nomi[f.id] && (
                <p className="dati tenue" style={{ marginTop: 'var(--s-1)' }}>
                  dedotti: {f.proposta.dedotti.join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="coda__barra">
        <button
          type="button"
          className="btn btn-primario"
          onClick={rinomina}
          disabled={!rinominabili.length || inCorso}
        >
          Rinomina {rinominabili.length} file
        </button>
        <button type="button" className="btn btn-fantasma" onClick={() => setScelti(new Set())}>
          Deseleziona tutto
        </button>
        <button
          type="button"
          className="btn btn-fantasma"
          onClick={() => setScelti(new Set(file.filter((f) => nomi[f.id]).map((f) => f.id)))}
        >
          Seleziona tutto
        </button>
        {!driveConfigurato && (
          <span className="dati tenue">Drive non è collegato: cambio solo i nomi qui dentro.</span>
        )}
      </div>
    </>
  )
}
