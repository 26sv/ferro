import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { storage } from "./storage";

const KEY = "palestra-v1";

const PROGRAM = {
  A: {
    focus: "Catena posteriore e spinta",
    exercises: [
      { id: "a1", name: "Stacco rumeno", short: "Stacco rum.", sets: 4, reps: 6, note: "Discesa in 3 secondi", inc: 2.5 },
      { id: "a2", name: "Panca piana", short: "Panca", sets: 4, reps: 5, note: "Mai a cedimento", inc: 2.5 },
      { id: "a3", name: "Bulgarian split squat", short: "Split squat", sets: 3, reps: 8, note: "Per gamba, profondità senza dolore", inc: 2 },
      { id: "a4", name: "Calf raise in piedi", short: "Calf", sets: 3, reps: 12, note: "Discesa in 3 secondi", inc: 5 },
      { id: "a5", name: "Pallof press", short: "Pallof", sets: 3, reps: 10, note: "Per lato", inc: 1 },
    ],
  },
  B: {
    focus: "Spinta gambe e trazione",
    exercises: [
      { id: "b1", name: "Squat bilanciere", short: "Squat", sets: 4, reps: 5, note: "Tempo controllato", inc: 2.5 },
      { id: "b2", name: "Trazioni o lat machine", short: "Trazioni", sets: 4, reps: 6, inc: 2.5 },
      { id: "b3", name: "Hip thrust o nordic curl", short: "Hip thrust", sets: 3, reps: 8, inc: 5 },
      { id: "b4", name: "Military press", short: "Military", sets: 3, reps: 8, inc: 2 },
      { id: "b5", name: "Dead bug", short: "Dead bug", sets: 3, reps: 10, note: "Per lato", inc: 1 },
    ],
  },
};

const WARMUP = ["5 min bici o vogatore", "Mobilità anche e caviglie", 'Isometria ginocchio 4×40"'];
const REST_PRESETS = [90, 120, 180];
const INCREMENTS = [1, 2.5, 5];
const FEEL = [
  { id: "ok", label: "Bene", tone: "verde" },
  { id: "lieve", label: "Fastidio lieve", tone: "ambra" },
  { id: "forte", label: "Fastidio marcato", tone: "piastra" },
];

const ALL_EXERCISES = [...PROGRAM.A.exercises, ...PROGRAM.B.exercises];
const emptyData = { history: [], lastWeights: {}, weeklyTarget: 3, active: null };

/* ---------------- helpers ---------------- */

const pad = (n) => String(n).padStart(2, "0");

const clock = (t) => {
  const s = Math.max(0, Math.floor(t));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

const startOfWeek = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

const dayLabel = (iso) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
const fullLabel = (iso) => new Date(iso).toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long" });
const num = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(".", ","));

const sessionVolume = (s) =>
  s.log ? Object.values(s.log).reduce((t, arr) => t + arr.reduce((a, x) => a + (x.weight || 0) * (x.reps || 0), 0), 0) : 0;

const setsDone = (log) => (log ? Object.values(log).reduce((t, a) => t + a.length, 0) : 0);
const plannedSets = (type) => PROGRAM[type].exercises.reduce((t, e) => t + e.sets, 0);

const buzz = (ms) => {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {}
};

const beep = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.18].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 760;
      const t0 = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
      osc.start(t0);
      osc.stop(t0 + 0.18);
    });
  } catch (e) {}
};

/* ---------------- app ---------------- */

export default function App() {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("oggi");
  const [now, setNow] = useState(Date.now());
  const [rest, setRest] = useState(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const [summary, setSummary] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [flash, setFlash] = useState(null);
  const [toast, setToast] = useState(null);
  const saveTimer = useRef(null);
  const beeped = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await storage.get(KEY);
        const parsed = res ? JSON.parse(res.value) : null;
        if (alive && parsed) setData({ ...emptyData, ...parsed });
      } catch (e) {
        /* prima apertura */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next) => {
    setData(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await storage.set(KEY, JSON.stringify(next));
      } catch (e) {
        setToast("Salvataggio non riuscito. Resta tutto sullo schermo, riprova a fine serie.");
        setTimeout(() => setToast(null), 4000);
      }
    }, 500);
  }, []);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);

  const active = data.active;

  /* schermo sempre acceso durante l'allenamento */
  useEffect(() => {
    let lock = null;
    let cancelled = false;
    if (active && navigator.wakeLock) {
      navigator.wakeLock
        .request("screen")
        .then((l) => {
          if (cancelled) l.release();
          else lock = l;
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      try {
        if (lock) lock.release();
      } catch (e) {}
    };
  }, [active]);

  useEffect(() => {
    if (!rest) {
      beeped.current = false;
      return;
    }
    if (!beeped.current && now >= rest.endsAt) {
      beeped.current = true;
      beep();
      buzz([120, 80, 120]);
    }
  }, [now, rest]);

  const elapsed = active ? (now - new Date(active.startedAt).getTime()) / 1000 : 0;
  const restLeft = rest ? Math.max(0, (rest.endsAt - now) / 1000) : 0;

  const bestWeights = useMemo(() => {
    const best = {};
    data.history.forEach((s) => {
      if (!s.log) return;
      Object.entries(s.log).forEach(([id, sets]) => {
        sets.forEach((x) => {
          if ((x.weight || 0) > (best[id] || 0)) best[id] = x.weight || 0;
        });
      });
    });
    return best;
  }, [data.history]);

  const lastPerformance = useCallback(
    (exId) => {
      const s = data.history.find((h) => h.log && h.log[exId] && h.log[exId].length);
      return s ? { date: s.date, sets: s.log[exId] } : null;
    },
    [data.history]
  );

  /* azioni */
  const startSession = (type) => {
    persist({ ...data, active: { type, startedAt: new Date().toISOString(), log: {}, warmup: [] } });
    setFocusIdx(0);
    setTab("oggi");
  };

  const toggleWarmup = (item) => {
    const w = active.warmup || [];
    persist({ ...data, active: { ...active, warmup: w.includes(item) ? w.filter((x) => x !== item) : [...w, item] } });
  };

  const logSet = (ex, weight, reps) => {
    const log = { ...(active.log || {}) };
    log[ex.id] = [...(log[ex.id] || []), { weight, reps }];
    persist({ ...data, lastWeights: { ...data.lastWeights, [ex.id]: weight }, active: { ...active, log } });
    const isRecord = weight > 0 && weight > (bestWeights[ex.id] || 0);
    setFlash(isRecord ? "record" : "ok");
    setTimeout(() => setFlash(null), isRecord ? 1600 : 700);
    buzz(isRecord ? [40, 60, 40] : 25);
    setRest({ endsAt: Date.now() + REST_PRESETS[0] * 1000, duration: REST_PRESETS[0] });
    beeped.current = false;
  };

  const undoSet = (ex) => {
    const log = { ...(active.log || {}) };
    if (!log[ex.id] || !log[ex.id].length) return;
    log[ex.id] = log[ex.id].slice(0, -1);
    persist({ ...data, active: { ...active, log } });
    buzz(15);
  };

  const saveSession = (feel) => {
    const entry = {
      id: `s${Date.now()}`,
      date: active.startedAt,
      type: active.type,
      durationSec: Math.round(elapsed),
      log: active.log,
      feel: feel || null,
    };
    persist({ ...data, history: [entry, ...data.history], active: null });
    setRest(null);
    setSummary(false);
    setFocusIdx(0);
    setTab("progressi");
  };

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const thisWeek = data.history.filter((s) => new Date(s.date) >= weekStart);

  if (loading) {
    return (
      <div className="root center">
        <Style />
        <p className="mono muted">Carico i dati</p>
      </div>
    );
  }

  const done = active ? setsDone(active.log) : 0;
  const total = active ? plannedSets(active.type) : 0;

  return (
    <div className="root">
      <Style />

      <header className="topbar">
        {active ? (
          <>
            <div>
              <p className="eyebrow">Seduta {active.type} in corso</p>
              <p className="clock mono">{clock(elapsed)}</p>
            </div>
            <div className="ring" role="img" aria-label={`${done} serie su ${total}`}>
              <span className="mono ring-n">{done}</span>
              <span className="mono ring-d">/{total}</span>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="eyebrow">Scheda forza</p>
              <h1 className="brand">FERRO</h1>
            </div>
            <div className="right">
              <p className="eyebrow">Settimana</p>
              <p className="clock mono">
                {thisWeek.length}
                <span className="muted">/{data.weeklyTarget}</span>
              </p>
            </div>
          </>
        )}
      </header>

      <main className={rest ? "content with-rest" : "content"}>
        {tab === "oggi" &&
          (active ? (
            <Sessione
              active={active}
              data={data}
              focusIdx={focusIdx}
              setFocusIdx={setFocusIdx}
              bestWeights={bestWeights}
              lastPerformance={lastPerformance}
              onLog={logSet}
              onUndo={undoSet}
              onWarmup={toggleWarmup}
              onFinish={() => setSummary(true)}
              confirmCancel={confirmCancel}
              setConfirmCancel={setConfirmCancel}
              onCancel={() => {
                persist({ ...data, active: null });
                setRest(null);
                setConfirmCancel(false);
              }}
            />
          ) : (
            <PreSessione data={data} onStart={startSession} />
          ))}
        {tab === "progressi" && (
          <Progressi
            data={data}
            thisWeek={thisWeek}
            bestWeights={bestWeights}
            onTarget={(t) => persist({ ...data, weeklyTarget: t })}
          />
        )}
        {tab === "storico" && <Storico data={data} />}
      </main>

      {flash && <div className={flash === "record" ? "flash flash-record" : "flash"}>{flash === "record" ? "Nuovo record" : ""}</div>}

      {rest && (
        <RestOverlay
          left={restLeft}
          duration={rest.duration}
          onSet={(secs) => {
            setRest({ endsAt: Date.now() + secs * 1000, duration: secs });
            beeped.current = false;
          }}
          onAdd={() => setRest({ ...rest, endsAt: rest.endsAt + 30000 })}
          onClose={() => setRest(null)}
        />
      )}

      {summary && active && (
        <Riepilogo
          active={active}
          elapsed={elapsed}
          bestWeights={bestWeights}
          onSave={saveSession}
          onBack={() => setSummary(false)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      <nav className="tabbar">
        {[
          ["oggi", "Oggi"],
          ["progressi", "Progressi"],
          ["storico", "Storico"],
        ].map(([id, label]) => (
          <button key={id} className={tab === id ? "tab tab-on" : "tab"} onClick={() => setTab(id)}>
            {label}
            {id === "oggi" && active && <span className="live" />}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ---------------- prima della seduta ---------------- */

function PreSessione({ data, onStart }) {
  const last = data.history[0];
  const suggested = last ? (last.type === "A" ? "B" : "A") : "A";

  return (
    <div className="stack">
      <section className="card">
        <p className="eyebrow">{last ? `Ultima: seduta ${last.type}, ${dayLabel(last.date)}` : "Nessuna seduta registrata"}</p>
        <h2 className="h2">{last ? `In alternanza tocca la ${suggested}` : "Si parte dalla A"}</h2>
      </section>

      {["A", "B"].map((t) => (
        <section key={t} className={suggested === t ? "card card-hi" : "card"}>
          <div className="between">
            <div>
              <h3 className="h3">Seduta {t}</h3>
              <p className="body muted">{PROGRAM[t].focus}</p>
            </div>
            <span className="badge mono">{plannedSets(t)} serie</span>
          </div>
          <ul className="list">
            {PROGRAM[t].exercises.map((e) => (
              <li key={e.id} className="row">
                <span className="body">{e.name}</span>
                <span className="mono muted">
                  {e.sets}×{e.reps}
                </span>
              </li>
            ))}
          </ul>
          <button className={suggested === t ? "btn btn-primary" : "btn btn-line"} onClick={() => onStart(t)}>
            Inizia seduta {t}
          </button>
        </section>
      ))}

      <p className="footnote">
        Fastidio al ginocchio fino a 3/10 durante l'esercizio: prosegui riducendo il range. Sopra quella soglia, o se il
        mattino dopo è peggio, fermati e fallo vedere.
      </p>
    </div>
  );
}

/* ---------------- seduta: una cosa alla volta ---------------- */

function Sessione({
  active, data, focusIdx, setFocusIdx, bestWeights, lastPerformance,
  onLog, onUndo, onWarmup, onFinish, confirmCancel, setConfirmCancel, onCancel,
}) {
  const list = PROGRAM[active.type].exercises;
  const idx = Math.min(focusIdx, list.length - 1);
  const ex = list[idx];
  const logged = (active.log && active.log[ex.id]) || [];
  const complete = logged.length >= ex.sets;
  const warmupDone = (active.warmup || []).length === WARMUP.length;

  return (
    <div className="stack">
      {!warmupDone && (
        <section className="card">
          <p className="eyebrow">Riscaldamento</p>
          <ul className="list">
            {WARMUP.map((w) => {
              const on = (active.warmup || []).includes(w);
              return (
                <li key={w}>
                  <button className={on ? "check check-on" : "check"} onClick={() => onWarmup(w)}>
                    <span className="box">{on ? "✓" : ""}</span>
                    <span className="body">{w}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <nav className="rail" aria-label="Esercizi della seduta">
        {list.map((e, i) => {
          const n = ((active.log && active.log[e.id]) || []).length;
          const state = n >= e.sets ? "rail-done" : i === idx ? "rail-on" : "";
          return (
            <button key={e.id} className={`rail-item ${state}`} onClick={() => setFocusIdx(i)}>
              <span className="rail-bar" style={{ "--fill": `${(n / e.sets) * 100}%` }} />
              <span className="rail-label">{e.short}</span>
            </button>
          );
        })}
      </nav>

      <Esercizio
        key={ex.id}
        ex={ex}
        idx={idx}
        count={list.length}
        logged={logged}
        best={bestWeights[ex.id] || 0}
        lastWeight={data.lastWeights[ex.id]}
        last={lastPerformance(ex.id)}
        onLog={onLog}
        onUndo={onUndo}
      />

      <div className="navrow">
        <button className="btn btn-line" disabled={idx === 0} onClick={() => setFocusIdx(idx - 1)}>
          ‹ Precedente
        </button>
        <button
          className={complete && idx < list.length - 1 ? "btn btn-line btn-next" : "btn btn-line"}
          disabled={idx === list.length - 1}
          onClick={() => setFocusIdx(idx + 1)}
        >
          {complete && idx < list.length - 1 ? `${list[idx + 1].short} ›` : "Successivo ›"}
        </button>
      </div>

      <button className="btn btn-primary" onClick={onFinish}>
        Termina allenamento
      </button>

      {confirmCancel ? (
        <div className="card card-warn">
          <p className="body">Butti via questa seduta senza salvarla?</p>
          <div className="navrow">
            <button className="btn btn-line" onClick={() => setConfirmCancel(false)}>
              Continua ad allenarti
            </button>
            <button className="btn btn-danger" onClick={onCancel}>
              Butta via
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost" onClick={() => setConfirmCancel(true)}>
          Annulla seduta
        </button>
      )}
    </div>
  );
}

function Esercizio({ ex, idx, count, logged, best, lastWeight, last, onLog, onUndo }) {
  const [weight, setWeight] = useState(lastWeight ?? 0);
  const [reps, setReps] = useState(ex.reps);
  const [inc, setInc] = useState(ex.inc || 2.5);
  const [typing, setTyping] = useState(false);
  const complete = logged.length >= ex.sets;

  const step = (d) => setWeight((w) => Math.max(0, Math.round((w + d) * 100) / 100));

  return (
    <section className={complete ? "card card-done" : "card card-focus"}>
      <div className="between">
        <div>
          <p className="eyebrow">
            Esercizio {idx + 1} di {count}
          </p>
          <h2 className="h1">{ex.name}</h2>
          <p className="body muted">
            <span className="mono strong">
              {ex.sets}×{ex.reps}
            </span>
            {ex.note ? (
              <>
                {" "}
                <span className="dot" /> {ex.note}
              </>
            ) : null}
          </p>
        </div>
        {best > 0 && <span className="badge mono">max {num(best)}</span>}
      </div>

      <p className="lastline mono">
        {last ? (
          <>
            <span className="muted">Volta scorsa {dayLabel(last.date)}:</span>{" "}
            {last.sets.map((s, i) => (
              <span key={i}>
                {s.weight > 0 ? num(s.weight) : "cl"}×{s.reps}{" "}
              </span>
            ))}
          </>
        ) : (
          <span className="muted">Prima volta con questo esercizio</span>
        )}
      </p>

      <div className="plates">
        {Array.from({ length: ex.sets }).map((_, i) => {
          const s = logged[i];
          const isLast = i === logged.length - 1;
          return (
            <button
              key={i}
              className={s ? "plate plate-on" : i === logged.length ? "plate plate-next" : "plate"}
              onClick={() => (isLast ? onUndo(ex) : null)}
              aria-label={s ? `Serie ${i + 1}: ${s.weight} kg per ${s.reps}` : `Serie ${i + 1} da fare`}
            >
              {s ? (
                <span className="pv mono">
                  {s.weight > 0 ? num(s.weight) : "cl"}
                  <em>{s.reps} rip</em>
                </span>
              ) : (
                <span className="pi mono">{i + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="steppers">
        <div className="stepper">
          <button className="step" onClick={() => step(-inc)} aria-label={`Togli ${inc} chili`}>
            −
          </button>
          {typing ? (
            <input
              className="win mono"
              type="number"
              inputMode="decimal"
              autoFocus
              value={weight}
              onChange={(e) => setWeight(Math.max(0, Number(e.target.value)))}
              onBlur={() => setTyping(false)}
            />
          ) : (
            <button className="sval" onClick={() => setTyping(true)}>
              <span className="mono big">{weight > 0 ? num(weight) : "—"}</span>
              <span className="unit">kg</span>
            </button>
          )}
          <button className="step" onClick={() => step(inc)} aria-label={`Aggiungi ${inc} chili`}>
            +
          </button>
        </div>
        <div className="stepper">
          <button className="step" onClick={() => setReps((r) => Math.max(1, r - 1))} aria-label="Una ripetizione in meno">
            −
          </button>
          <div className="sval">
            <span className="mono big">{reps}</span>
            <span className="unit">rip</span>
          </div>
          <button className="step" onClick={() => setReps((r) => r + 1)} aria-label="Una ripetizione in più">
            +
          </button>
        </div>
      </div>

      <div className="incs">
        <span className="eyebrow">Scatto</span>
        {INCREMENTS.map((v) => (
          <button key={v} className={inc === v ? "chip chip-on" : "chip"} onClick={() => setInc(v)}>
            {num(v)} kg
          </button>
        ))}
      </div>

      {complete ? (
        <p className="doneline mono">Esercizio completato. Tocca l'ultimo disco per correggere.</p>
      ) : (
        <button className="btn btn-log" onClick={() => onLog(ex, weight, reps)}>
          Registra serie {logged.length + 1}
          <span className="btn-sub mono">
            {weight > 0 ? `${num(weight)} kg` : "corpo libero"} × {reps}
          </span>
        </button>
      )}
    </section>
  );
}

/* ---------------- recupero ---------------- */

function RestOverlay({ left, duration, onSet, onAdd, onClose }) {
  const pct = Math.max(0, Math.min(100, (left / duration) * 100));
  const over = left <= 0;
  return (
    <div className={over ? "rest rest-over" : "rest"} role="status" aria-live="polite">
      <div className="rest-drain" style={{ width: `${pct}%` }} />
      <div className="rest-in">
        <div>
          <p className="eyebrow">{over ? "Recupero finito" : "Recupero"}</p>
          <p className="rest-clock mono">{clock(left)}</p>
        </div>
        <div className="rest-actions">
          {REST_PRESETS.map((p) => (
            <button key={p} className={duration === p ? "chip chip-on" : "chip"} onClick={() => onSet(p)}>
              {p / 60 === 1.5 ? "1:30" : `${p / 60}:00`}
            </button>
          ))}
          <button className="chip" onClick={onAdd}>
            +30s
          </button>
          <button className="chip chip-x" onClick={onClose} aria-label="Chiudi il recupero">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- riepilogo di fine seduta ---------------- */

function Riepilogo({ active, elapsed, bestWeights, onSave, onBack }) {
  const [feel, setFeel] = useState(null);
  const list = PROGRAM[active.type].exercises;
  const done = setsDone(active.log);
  const total = plannedSets(active.type);
  const vol = sessionVolume({ log: active.log });
  const records = list.filter((e) => {
    const sets = (active.log && active.log[e.id]) || [];
    return sets.some((s) => s.weight > 0 && s.weight > (bestWeights[e.id] || 0));
  });

  return (
    <div className="sheet">
      <div className="sheet-in">
        <p className="eyebrow">Seduta {active.type}</p>
        <h2 className="h1">Fatto.</h2>

        <div className="grid3">
          <div>
            <p className="eyebrow">Durata</p>
            <p className="mono stat">{clock(elapsed)}</p>
          </div>
          <div>
            <p className="eyebrow">Serie</p>
            <p className="mono stat">
              {done}
              <span className="muted">/{total}</span>
            </p>
          </div>
          <div>
            <p className="eyebrow">Volume</p>
            <p className="mono stat">
              {Math.round(vol)}
              <span className="unit">kg</span>
            </p>
          </div>
        </div>

        {records.length > 0 && (
          <p className="record-line">
            Nuovo carico massimo su {records.map((r) => r.short).join(", ")}
          </p>
        )}

        <p className="eyebrow spaced">Come è andato il ginocchio</p>
        <div className="feelrow">
          {FEEL.map((f) => (
            <button key={f.id} className={feel === f.id ? `feel feel-${f.tone} feel-on` : `feel feel-${f.tone}`} onClick={() => setFeel(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        {feel === "forte" && (
          <p className="footnote">
            Alla prossima riduci il range e il carico sulle alzate di gamba. Se si ripete, meglio farlo vedere prima di
            insistere.
          </p>
        )}

        <button className="btn btn-primary" onClick={() => onSave(feel)}>
          Salva allenamento
        </button>
        <button className="btn btn-ghost" onClick={onBack}>
          Torna indietro
        </button>
      </div>
    </div>
  );
}

/* ---------------- progressi ---------------- */

function Progressi({ data, thisWeek, bestWeights, onTarget }) {
  const [chartEx, setChartEx] = useState("b1");
  const [metric, setMetric] = useState("peso");

  const weekPct = Math.min(100, Math.round((thisWeek.length / data.weeklyTarget) * 100));
  const totalVolume = data.history.reduce((t, s) => t + sessionVolume(s), 0);

  const chartData = useMemo(
    () =>
      data.history
        .filter((s) => s.log && s.log[chartEx] && s.log[chartEx].length)
        .map((s) => ({
          date: dayLabel(s.date),
          ts: new Date(s.date).getTime(),
          peso: Math.max(...s.log[chartEx].map((x) => x.weight || 0)),
          volume: s.log[chartEx].reduce((t, x) => t + (x.weight || 0) * (x.reps || 0), 0),
        }))
        .sort((a, b) => a.ts - b.ts),
    [data.history, chartEx]
  );

  const status = useMemo(
    () =>
      ALL_EXERCISES.map((ex) => {
        const pts = data.history
          .filter((s) => s.log && s.log[ex.id] && s.log[ex.id].length)
          .map((s) => ({ ts: new Date(s.date).getTime(), w: Math.max(...s.log[ex.id].map((x) => x.weight || 0)) }))
          .sort((a, b) => a.ts - b.ts);
        const first = pts.length ? pts[0].w : null;
        const lastW = pts.length ? pts[pts.length - 1].w : null;
        return { ex, first, lastW, delta: first !== null ? lastW - first : null, count: pts.length };
      }),
    [data.history]
  );

  return (
    <div className="stack">
      <section className="card card-hi">
        <div className="between">
          <div>
            <p className="eyebrow">Obiettivo settimanale</p>
            <p className="clock big-clock mono">
              {thisWeek.length}
              <span className="muted">/{data.weeklyTarget}</span>
            </p>
          </div>
          <div className="rest-actions">
            {[2, 3].map((t) => (
              <button key={t} className={data.weeklyTarget === t ? "chip chip-on" : "chip"} onClick={() => onTarget(t)}>
                {t} a sett.
              </button>
            ))}
          </div>
        </div>
        <div className="bar">
          <div className="bar-fill" style={{ width: `${weekPct}%` }} />
        </div>
        <p className="body muted">
          {thisWeek.length >= data.weeklyTarget
            ? "Settimana chiusa. Il resto è recupero."
            : `Mancano ${data.weeklyTarget - thisWeek.length} sedute a chiudere la settimana.`}
        </p>
      </section>

      <div className="grid2">
        <section className="card mini">
          <p className="eyebrow">Sedute totali</p>
          <p className="clock mono">{data.history.length}</p>
        </section>
        <section className="card mini">
          <p className="eyebrow">Volume sollevato</p>
          <p className="clock mono">
            {(totalVolume / 1000).toFixed(1)}
            <span className="unit">t</span>
          </p>
        </section>
      </div>

      <section className="card">
        <div className="between">
          <p className="eyebrow">Andamento</p>
          <div className="rest-actions">
            <button className={metric === "peso" ? "chip chip-on" : "chip"} onClick={() => setMetric("peso")}>
              Carico
            </button>
            <button className={metric === "volume" ? "chip chip-on" : "chip"} onClick={() => setMetric("volume")}>
              Volume
            </button>
          </div>
        </div>
        <select className="select" value={chartEx} onChange={(e) => setChartEx(e.target.value)}>
          {ALL_EXERCISES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        {chartData.length >= 2 ? (
          <div className="chart">
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#1E2229" vertical={false} />
                <XAxis dataKey="date" stroke="#ABA69A" tick={{ fontSize: 11, fontFamily: "Space Mono, monospace" }} tickLine={false} />
                <YAxis stroke="#ABA69A" tick={{ fontSize: 11, fontFamily: "Space Mono, monospace" }} tickLine={false} width={46} />
                <Tooltip
                  contentStyle={{ background: "#0C0E11", border: "1px solid #262A31", borderRadius: 10, color: "#F7F5F0" }}
                  labelStyle={{ color: "#ABA69A" }}
                  formatter={(v) => [`${v} kg`, metric === "peso" ? "Carico max" : "Volume"]}
                />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke="#FF2D3E"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#FF2D3E", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="body muted spaced">
            {chartData.length === 1
              ? "Un punto solo non è una curva. Alla prossima seduta comincia a dire qualcosa."
              : "Registra questo esercizio almeno due volte e la curva compare qui."}
          </p>
        )}
      </section>

      <section className="card">
        <p className="eyebrow">Previsto e fatto</p>
        <ul className="list">
          {status.map(({ ex, lastW, delta, count }) => (
            <li key={ex.id} className="statusrow">
              <div>
                <p className="body">{ex.name}</p>
                <p className="mono muted small">
                  previsto {ex.sets}×{ex.reps}
                  {count > 0 ? ` · ${count} sedute` : " · mai fatto"}
                </p>
              </div>
              <div className="right">
                <p className="mono">{lastW !== null ? `${num(lastW)} kg` : "—"}</p>
                {delta !== null && delta !== 0 && (
                  <p className={delta > 0 ? "mono small up" : "mono small down"}>
                    {delta > 0 ? "+" : ""}
                    {num(delta)} kg
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ---------------- storico ---------------- */

function Storico({ data }) {
  const [open, setOpen] = useState(null);

  if (!data.history.length) {
    return (
      <div className="stack">
        <section className="card">
          <p className="eyebrow">Storico</p>
          <h2 className="h2">Ancora niente qui</h2>
          <p className="body muted">Chiudi la prima seduta: comparirà con durata, serie, carichi e volume.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      {data.history.map((s) => {
        const isOpen = open === s.id;
        const feel = FEEL.find((f) => f.id === s.feel);
        return (
          <section key={s.id} className="card">
            <button className="between full" onClick={() => setOpen(isOpen ? null : s.id)}>
              <div className="left">
                <p className="eyebrow">{fullLabel(s.date)}</p>
                <h3 className="h3">Seduta {s.type}</h3>
                <p className="mono muted small">
                  {clock(s.durationSec)} · {setsDone(s.log)}/{plannedSets(s.type)} serie · {Math.round(sessionVolume(s))} kg
                </p>
              </div>
              <div className="right">
                {feel && <span className={`pill pill-${feel.tone}`}>{feel.label}</span>}
                <span className="caret">{isOpen ? "−" : "+"}</span>
              </div>
            </button>
            {isOpen && (
              <ul className="list">
                {PROGRAM[s.type].exercises.map((ex) => {
                  const sets = (s.log && s.log[ex.id]) || [];
                  return (
                    <li key={ex.id} className="row">
                      <span className="body">{ex.name}</span>
                      <span className="mono muted small">
                        {sets.length ? sets.map((x) => `${x.weight ? num(x.weight) : "cl"}×${x.reps}`).join("  ") : "saltato"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ---------------- stile ---------------- */

function Style() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=Space+Grotesk:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap');

.root {
  --ferro:#000000; --ghisa:#0C0E11; --alto:#14171B; --bordo:#262A31;
  --gesso:#F7F5F0; --bronzo:#ABA69A; --piastra:#FF2D3E; --verde:#3FD37C; --ambra:#FFB627;
  position:relative; display:flex; flex-direction:column; height:100dvh; overflow:hidden;
  background:var(--ferro); color:var(--gesso);
  font-family:'Space Grotesk',system-ui,sans-serif; letter-spacing:-.004em;
}
.root.center { align-items:center; justify-content:center; }
.root button { font-family:inherit; color:inherit; background:none; border:none; cursor:pointer; }
.root button:focus-visible { outline:2px solid var(--gesso); outline-offset:2px; border-radius:6px; }
.root button:disabled { opacity:.32; cursor:default; }

.mono { font-family:'Space Mono',ui-monospace,monospace; font-variant-numeric:tabular-nums; letter-spacing:-.03em; }
.muted { color:var(--bronzo); }
.small { font-size:11.5px; }
.strong { font-weight:700; }
.right { text-align:right; }
.left { text-align:left; }
.unit { font-size:12px; color:var(--bronzo); margin-left:2px; }
.up { color:var(--verde); }
.down { color:var(--piastra); }
.spaced { margin-top:14px; }

.topbar { display:flex; align-items:center; justify-content:space-between; padding:13px 16px; border-bottom:1px solid var(--bordo); flex-shrink:0; }
.brand { font-family:'Big Shoulders Display',sans-serif; font-weight:800; font-size:33px; letter-spacing:.22em; margin:0; line-height:.95; }
.eyebrow { font-family:'Space Mono',monospace; font-size:9.5px; letter-spacing:.18em; text-transform:uppercase; color:var(--bronzo); margin:0 0 4px; font-weight:400; }
.clock { font-size:24px; font-weight:700; margin:0; line-height:1; }
.big-clock { font-size:34px; }
.ring { width:52px; height:52px; border-radius:50%; border:2px solid var(--piastra); display:flex; align-items:baseline; justify-content:center; gap:1px; }
.ring-n { font-size:17px; font-weight:700; line-height:52px; }
.ring-d { font-size:11px; color:var(--bronzo); }

.content { flex:1; overflow-y:auto; padding:14px 16px 96px; }
.content.with-rest { padding-bottom:186px; }
.stack { display:flex; flex-direction:column; gap:12px; }

.card { background:var(--ghisa); border:1px solid var(--bordo); border-radius:16px; padding:15px; }
.card-hi { border-color:var(--piastra); }
.card-focus { background:linear-gradient(174deg,#1C0F13 0%,var(--ghisa) 58%); border-color:#43222A; }
.card-done { border-color:var(--verde); }
.card-warn { border-color:var(--piastra); }
.card.mini { padding:13px 15px; }

.h1 { font-family:'Big Shoulders Display',sans-serif; font-size:42px; font-weight:800; margin:0 0 6px; line-height:.92; letter-spacing:.012em; text-transform:uppercase; }
.h2 { font-family:'Big Shoulders Display',sans-serif; font-size:31px; font-weight:700; margin:0 0 5px; line-height:.98; letter-spacing:.012em; text-transform:uppercase; }
.h3 { font-family:'Big Shoulders Display',sans-serif; font-size:26px; font-weight:700; margin:0 0 3px; line-height:1; letter-spacing:.012em; text-transform:uppercase; }
.body { font-size:13.5px; margin:0; line-height:1.45; }
.footnote { font-size:11.5px; color:var(--bronzo); line-height:1.55; margin:10px 2px 0; }

.between { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.between.full { width:100%; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:16px 0 4px; }
.stat { font-size:21px; font-weight:700; margin:0; }
.navrow { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.navrow .btn { margin-top:0; }

.badge { font-size:11px; color:var(--bronzo); border:1px solid var(--bordo); border-radius:999px; padding:4px 9px; white-space:nowrap; }
.pill { font-size:10.5px; padding:3px 8px; border-radius:999px; white-space:nowrap; }
.pill-verde { background:rgba(79,174,104,.16); color:var(--verde); }
.pill-ambra { background:rgba(224,163,46,.16); color:var(--ambra); }
.pill-piastra { background:rgba(217,48,63,.16); color:var(--piastra); }

.list { list-style:none; padding:0; margin:11px 0 0; display:flex; flex-direction:column; gap:8px; }
.row { display:flex; justify-content:space-between; align-items:baseline; gap:12px; font-size:13.5px; }
.statusrow { display:flex; justify-content:space-between; gap:12px; padding-bottom:8px; border-bottom:1px solid var(--bordo); }
.statusrow:last-child { border-bottom:none; padding-bottom:0; }

.bar { height:7px; background:var(--bordo); border-radius:999px; overflow:hidden; margin:12px 0 9px; }
.bar-fill { height:100%; background:var(--piastra); border-radius:999px; transition:width 260ms ease; }
.dot { display:inline-block; width:3px; height:3px; border-radius:50%; background:var(--bronzo); margin:0 5px; vertical-align:middle; }

/* rail degli esercizi */
.rail { display:flex; gap:6px; }
.rail-item { flex:1; min-width:0; padding:0; text-align:left; }
.rail-bar { display:block; height:4px; border-radius:999px; background:var(--bordo); position:relative; overflow:hidden; }
.rail-bar::after { content:""; position:absolute; inset:0 auto 0 0; width:var(--fill); background:var(--bronzo); border-radius:999px; }
.rail-on .rail-bar::after, .rail-done .rail-bar::after { background:var(--piastra); }
.rail-done .rail-bar::after { background:var(--verde); }
.rail-label { display:block; font-size:9.5px; letter-spacing:.04em; text-transform:uppercase; color:var(--bronzo); margin-top:5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rail-on .rail-label { color:var(--gesso); font-weight:600; }

.lastline { font-size:12px; margin:12px 0 0; line-height:1.5; }

.plates { display:flex; gap:8px; margin-top:13px; flex-wrap:wrap; }
.plate { width:58px; height:58px; border-radius:50%; border:2px solid var(--bordo); background:#07080A; display:flex; align-items:center; justify-content:center; transition:transform 120ms ease,background 160ms ease,border-color 160ms ease; }
.plate:active { transform:scale(.94); }
.plate-next { border-style:dashed; border-color:var(--bronzo); }
.plate-on { background:var(--piastra); border-color:var(--piastra); }
.pv { display:flex; flex-direction:column; align-items:center; font-size:13px; font-weight:700; line-height:1.05; }
.pv em { font-style:normal; font-size:8.5px; opacity:.85; margin-top:2px; letter-spacing:0; }
.pi { font-size:14px; color:var(--bronzo); }

.steppers { display:grid; grid-template-columns:1.35fr 1fr; gap:10px; margin-top:14px; }
.stepper { display:flex; align-items:center; justify-content:space-between; border:1px solid var(--bordo); border-radius:12px; padding:4px; background:#07080A; }
.step { width:42px; height:42px; font-size:22px; border-radius:9px; color:var(--bronzo); }
.step:active { background:var(--bordo); }
.sval { text-align:center; padding:0 4px; }
.big { font-size:20px; font-weight:700; }
.win { width:74px; background:none; border:none; color:var(--gesso); font-size:19px; font-weight:700; text-align:center; font-family:'Space Mono',monospace; }
.win:focus { outline:none; }

.incs { display:flex; align-items:center; gap:6px; margin-top:11px; }
.incs .eyebrow { margin:0 4px 0 0; }

.check { display:flex; align-items:center; gap:10px; width:100%; text-align:left; padding:3px 0; }
.box { width:21px; height:21px; border-radius:6px; border:1px solid var(--bordo); display:flex; align-items:center; justify-content:center; font-size:12px; flex-shrink:0; }
.check-on .box { background:var(--verde); border-color:var(--verde); color:#0F1114; }
.check-on .body { color:var(--bronzo); text-decoration:line-through; }

.btn { width:100%; padding:14px; border-radius:13px; font-size:15px; font-weight:600; margin-top:12px; }
.btn-primary { background:var(--piastra); color:#fff; }
.btn-primary:active { background:#B8262F; }
.btn-log { background:var(--gesso); color:var(--ferro); display:flex; flex-direction:column; gap:3px; padding:16px; font-family:'Big Shoulders Display',sans-serif; font-size:23px; font-weight:800; letter-spacing:.03em; text-transform:uppercase; box-shadow:0 0 34px rgba(247,245,240,.09); }
.btn-log:active { background:#D9D5CB; }
.btn-sub { font-family:'Space Mono',monospace; font-size:11px; font-weight:400; letter-spacing:0; text-transform:none; opacity:.6; }
.btn-line { border:1px solid var(--bordo); }
.btn-next { border-color:var(--verde); color:var(--verde); }
.btn-ghost { border:1px solid transparent; color:var(--bronzo); font-weight:500; margin-top:4px; }
.btn-danger { background:var(--piastra); color:#fff; }
.doneline { font-size:11.5px; color:var(--verde); margin:14px 0 0; }

.select { width:100%; margin-top:11px; padding:11px; border-radius:11px; background:#07080A; border:1px solid var(--bordo); color:var(--gesso); font-family:'Space Grotesk',sans-serif; font-size:13.5px; }
.chart { margin-top:12px; }
.caret { font-size:22px; color:var(--bronzo); line-height:1; margin-left:8px; }

/* recupero */
.rest { position:absolute; left:0; right:0; bottom:calc(58px + env(safe-area-inset-bottom)); background:var(--alto); border-top:1px solid var(--bordo); overflow:hidden; }
.rest-drain { position:absolute; top:0; left:0; height:100%; background:rgba(217,48,63,.16); transition:width 250ms linear; }
.rest-over .rest-drain { background:rgba(217,48,63,.3); width:100% !important; }
.rest-in { position:relative; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:11px 16px; }
.rest-clock { font-size:27px; font-weight:700; margin:0; line-height:1; }
.rest-over .rest-clock { color:var(--piastra); }
.rest-actions { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
.chip { font-size:12px; padding:7px 10px; border-radius:999px; border:1px solid var(--bordo); color:var(--bronzo); }
.chip-on { background:var(--gesso); color:var(--ferro); border-color:var(--gesso); }
.chip-x { color:var(--bronzo); padding:7px 11px; }

/* riepilogo */
.sheet { position:absolute; inset:0; background:rgba(12,13,16,.86); display:flex; align-items:flex-end; z-index:20; }
.sheet-in { width:100%; max-height:92%; overflow-y:auto; background:var(--ghisa); border-top:2px solid var(--piastra); border-radius:20px 20px 0 0; padding:20px 18px 26px; }
.record-line { font-size:12.5px; color:var(--ambra); margin:14px 0 0; }
.feelrow { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:9px; }
.feel { padding:11px 6px; border-radius:11px; border:1px solid var(--bordo); font-size:12px; color:var(--bronzo); }
.feel-on.feel-verde { border-color:var(--verde); color:var(--verde); background:rgba(79,174,104,.12); }
.feel-on.feel-ambra { border-color:var(--ambra); color:var(--ambra); background:rgba(224,163,46,.12); }
.feel-on.feel-piastra { border-color:var(--piastra); color:var(--piastra); background:rgba(217,48,63,.12); }

.flash { position:absolute; inset:0; pointer-events:none; box-shadow:inset 0 0 0 3px var(--gesso); opacity:.5; animation:fade 700ms ease forwards; z-index:15; }
.flash-record { box-shadow:inset 0 0 0 3px var(--ambra); display:flex; align-items:center; justify-content:center; font-family:'Big Shoulders Display',sans-serif; font-size:52px; font-weight:800; color:var(--ambra); letter-spacing:.06em; text-transform:uppercase; animation:fade 1600ms ease forwards; }
@keyframes fade { 0%{opacity:.9} 70%{opacity:.6} 100%{opacity:0} }

.toast { position:absolute; left:16px; right:16px; bottom:130px; background:var(--piastra); color:#fff; padding:12px; border-radius:11px; font-size:12.5px; z-index:25; }

.tabbar { position:absolute; bottom:0; left:0; right:0; height:calc(58px + env(safe-area-inset-bottom)); padding-bottom:env(safe-area-inset-bottom); display:flex; border-top:1px solid var(--bordo); background:var(--ferro); }
.tab { flex:1; font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--bronzo); font-weight:500; border-top:2px solid transparent; position:relative; }
.tab-on { color:var(--gesso); border-top-color:var(--piastra); }
.live { position:absolute; top:12px; right:22%; width:6px; height:6px; border-radius:50%; background:var(--piastra); }

@media (prefers-reduced-motion:reduce) { .root *,.root *::after { transition:none !important; animation:none !important; } }
`}</style>
  );
}
