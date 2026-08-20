/* Quante ore, per chi, di che tipo. Niente riquadri con la percentuale in
   verde: gli stessi segmenti della barra del monte ore, girati in
   orizzontale e impilati per mese. */

import { useMemo, useState } from 'react'
import { useDati } from '../dati/store.jsx'
import { TIPOLOGIE, coloreTipologia, nomeTipologia } from '../lib/costanti.js'
import { aggiungiGiorni, daChiave, formattaOre, nomeMeseBreve } from '../lib/date.js'
import { orePerEnte, orePerTipologia, serieMensile } from '../lib/calcoli.js'

const PERIODI = [
  { id: '12mesi', nome: 'Ultimi 12 mesi' },
  { id: 'anno', nome: "Quest'anno" },
  { id: 'tutto', nome: 'Tutto' },
]

function estremi(periodo, personalizzato) {
  const oggi = new Date()
  if (periodo === 'personalizzato' && personalizzato.da && personalizzato.a) {
    return { da: daChiave(personalizzato.da), a: daChiave(personalizzato.a) }
  }
  if (periodo === 'anno') {
    return { da: new Date(oggi.getFullYear(), 0, 1), a: new Date(oggi.getFullYear(), 11, 31) }
  }
  if (periodo === '12mesi') {
    return { da: aggiungiGiorni(oggi, -365), a: oggi }
  }
  return { da: null, a: null }
}

export default function Numeri() {
  const { lezioni, enti } = useDati()
  const [periodo, setPeriodo] = useState('12mesi')
  const [personalizzato, setPersonalizzato] = useState({ da: '', a: '' })

  const { da, a } = estremi(periodo, personalizzato)

  const nelPeriodo = useMemo(
    () =>
      lezioni.filter((l) => {
        if (l.stato !== 'erogata') return false
        const d = daChiave(l.data)
        if (da && d < da) return false
        if (a && d > a) return false
        return true
      }),
    [lezioni, da, a],
  )

  const totale = nelPeriodo.reduce((s, l) => s + (l.ore || 0), 0)
  const perEnte = orePerEnte(nelPeriodo)
  const perTipologia = orePerTipologia(nelPeriodo)
  const perMese = serieMensile(nelPeriodo, { da, a })

  // Ogni ente si spezza per tipologia: la barra racconta anche *cosa* è stato
  // fatto lì dentro, non solo quanto.
  const enteConTipologie = perEnte.map((voce) => {
    const dentro = nelPeriodo.filter((l) => l.enteSigla === voce.id)
    const pezzi = TIPOLOGIE.map((t) => ({
      tipologia: t.id,
      ore: dentro.filter((l) => l.tipologia === t.id).reduce((s, l) => s + (l.ore || 0), 0),
    })).filter((p) => p.ore > 0)
    return { ...voce, pezzi, nome: enti.find((e) => e.sigla === voce.id)?.nome ?? voce.id }
  })

  const massimoEnte = Math.max(1, ...perEnte.map((v) => v.ore))
  const massimoTipologia = Math.max(1, ...perTipologia.map((v) => v.ore))
  const massimoMese = Math.max(1, ...perMese.map((m) => m.totale))

  return (
    <>
      <div className="intestazione">
        <div>
          <h1>Numeri</h1>
          <p className="dati tenue">solo le ore già erogate</p>
        </div>
        <div>
          <p className="numerone">{formattaOre(totale)}</p>
          <p className="etichetta">ore nel periodo</p>
        </div>
      </div>

      <div className="filtri">
        {PERIODI.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            aria-pressed={periodo === p.id}
            onClick={() => setPeriodo(p.id)}
          >
            {p.nome}
          </button>
        ))}
        <label className="chip">
          dal
          <input
            type="date"
            className="dati"
            value={personalizzato.da}
            onChange={(e) => {
              setPersonalizzato((p) => ({ ...p, da: e.target.value }))
              setPeriodo('personalizzato')
            }}
            style={{ border: 0, background: 'none' }}
          />
        </label>
        <label className="chip">
          al
          <input
            type="date"
            className="dati"
            value={personalizzato.a}
            onChange={(e) => {
              setPersonalizzato((p) => ({ ...p, a: e.target.value }))
              setPeriodo('personalizzato')
            }}
            style={{ border: 0, background: 'none' }}
          />
        </label>
      </div>

      {!nelPeriodo.length ? (
        <div className="vuoto">
          <h2>Nessuna ora erogata in questo periodo</h2>
          <p>Allarga il periodo, oppure segna erogate le lezioni che hai già fatto.</p>
        </div>
      ) : (
        <>
          <section className="sezione">
            <h2 className="sezione__titolo">Ore per ente</h2>
            <div className="barre">
              {enteConTipologie.map((voce) => (
                <div className="barre__riga" key={voce.id}>
                  <span className="barre__nome" title={voce.nome}>
                    {voce.id}
                  </span>
                  <div className="barre__traccia">
                    <div style={{ display: 'flex', height: '100%', width: `${(voce.ore / massimoEnte) * 100}%` }}>
                      {voce.pezzi.map((p) => (
                        <div
                          key={p.tipologia}
                          className="barre__pieno"
                          style={{
                            '--colore': coloreTipologia(p.tipologia),
                            width: `${(p.ore / voce.ore) * 100}%`,
                          }}
                          title={`${nomeTipologia(p.tipologia)}: ${formattaOre(p.ore)} ore`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="barre__valore">{formattaOre(voce.ore)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="sezione">
            <h2 className="sezione__titolo">Ore per tipologia</h2>
            <div className="barre">
              {perTipologia.map((voce) => (
                <div className="barre__riga" key={voce.id}>
                  <span className="barre__nome">{nomeTipologia(voce.id)}</span>
                  <div className="barre__traccia">
                    <div
                      className="barre__pieno"
                      style={{
                        '--colore': coloreTipologia(voce.id),
                        width: `${(voce.ore / massimoTipologia) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="barre__valore">{formattaOre(voce.ore)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="sezione">
            <h2 className="sezione__titolo">Mese per mese</h2>
            <div className="scorre">
            <div
              className="striscia"
              style={{ gridTemplateColumns: `repeat(${perMese.length}, 44px)` }}
              role="img"
              aria-label={`Ore erogate mese per mese, da ${perMese[0]?.mese} a ${perMese[perMese.length - 1]?.mese}`}
            >
              {perMese.map((m) => (
                <div className="striscia__mese" key={m.mese}>
                  {TIPOLOGIE.filter((t) => m.perTipologia[t.id]).map((t) => (
                    <div
                      key={t.id}
                      className="striscia__pezzo"
                      style={{
                        '--colore': coloreTipologia(t.id),
                        height: `${(m.perTipologia[t.id] / massimoMese) * 100}%`,
                      }}
                      title={`${nomeTipologia(t.id)}: ${formattaOre(m.perTipologia[t.id])} ore`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div
              className="striscia__etichette"
              style={{ gridTemplateColumns: `repeat(${perMese.length}, 44px)` }}
            >
              {perMese.map((m) => (
                <span className="striscia__etichetta" key={m.mese}>
                  {nomeMeseBreve(daChiave(`${m.mese}-01`))}
                </span>
              ))}
            </div>
            </div>

            <div className="legenda">
              {perTipologia.map((voce) => (
                <span className="legenda__voce" key={voce.id}>
                  <span className="legenda__pallino" style={{ '--colore': coloreTipologia(voce.id) }} />
                  {nomeTipologia(voce.id)}
                </span>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  )
}
