import { useState } from 'react'

// classify(v, warn, crit) -> band. warn<crit. [0,warn)=ok, [warn,crit)=warn, >=crit=crit.
// Звірено thr_test.mjs (7/7).
export function classify(v, warn, crit) {
  if (warn >= crit) return null
  if (v >= crit) return 'crit'
  if (v >= warn) return 'warn'
  return 'ok'
}

const BAND = {
  ok: { color: '#2e9e5b', label: 'Норма', note: 'зелена зона — втручання не потрібне' },
  warn: { color: '#d99a00', label: 'Попередження', note: 'жовта зона — під наглядом, близько до межі' },
  crit: { color: '#cc3333', label: 'Аварія', note: 'червона зона — потрібна дія диспетчера' },
}

const PRESETS = [
  { label: 'Норма 62%', v: 62 },
  { label: 'Перевантаження 88%', v: 88 },
  { label: 'Аварія 101%', v: 101 },
]

const MAX = 120

export default function ThresholdGauge() {
  const [v, setV] = useState(62)
  const [warn, setWarn] = useState(80)
  const [crit, setCrit] = useState(95)

  const band = classify(v, warn, crit)
  const b = band ? BAND[band] : null
  const pct = (x) => `${Math.min(100, (x / MAX) * 100)}%`

  return (
    <div className="widget">
      <h3>🎛️ Пороги та колір: гейдж завантаження</h3>
      <p className="hint">
        Сире число («завантаження 88&nbsp;%») майже не читається на дашборді з десятків панелей. <b>Пороги</b>
        (thresholds) перетворюють його на <b>статус кольором</b> — саме так панель Gauge/Stat у Grafana дає
        оператору картину «з першого погляду». Рухайте значення й пороги:
      </p>

      <div className="tabs">
        {PRESETS.map((p) => (
          <button key={p.label} className={`tab ${v === p.v ? 'active' : ''}`} onClick={() => setV(p.v)}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Смуга-гейдж з кольоровими зонами й позначками порогів */}
      <div style={{ position: 'relative', height: 26, borderRadius: 6, overflow: 'hidden', margin: '14px 0 4px', background: '#e9edf1' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <div style={{ width: pct(warn), background: 'rgba(46,158,91,.28)' }} />
          <div style={{ width: `calc(${pct(crit)} - ${pct(warn)})`, background: 'rgba(217,154,0,.30)' }} />
          <div style={{ width: `calc(100% - ${pct(crit)})`, background: 'rgba(204,51,51,.28)' }} />
        </div>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct(v), background: b ? b.color : '#888', opacity: 0.92 }} />
        <div style={{ position: 'absolute', left: `calc(${pct(v)} - 1px)`, top: 0, bottom: 0, width: 2, background: '#111' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8em', color: '#667' }}>
        <span>0</span><span>warn {warn}%</span><span>crit {crit}%</span><span>{MAX}%</span>
      </div>

      <div className="field">
        <label>Завантаження: <b>{v}%</b></label>
        <input type="range" min="0" max={MAX} value={v} onChange={(e) => setV(+e.target.value)} style={{ width: '100%' }} />
      </div>
      <div className="field">
        <label>Поріг попередження (warn): <b>{warn}%</b></label>
        <input type="range" min="0" max={MAX} value={warn} onChange={(e) => setWarn(+e.target.value)} style={{ width: '100%' }} />
      </div>
      <div className="field">
        <label>Поріг аварії (crit): <b>{crit}%</b></label>
        <input type="range" min="0" max={MAX} value={crit} onChange={(e) => setCrit(+e.target.value)} style={{ width: '100%' }} />
      </div>

      {b ? (
        <p className="verdict" style={{ background: b.color, color: '#fff', borderRadius: 6, padding: '8px 12px' }}>
          ● {b.label} — {b.note}
        </p>
      ) : (
        <p className="verdict bad">⛔ Поріг warn має бути менший за crit. Виправте пороги.</p>
      )}

      <p className="hint">
        Той самий принцип у Grafana: базовий колір + пороги, а не «розфарбовування заради краси». Колір має нести
        <b> сенс</b> (норма / увага / аварія), однаковий на всіх панелях. Ці ж пороги згодом стають умовами
        <b> алертів</b> (Л10) — дашборд і сповіщення дивляться на одні й ті самі межі.
      </p>
    </div>
  )
}
