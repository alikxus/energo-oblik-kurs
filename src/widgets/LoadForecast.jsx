import { useState } from 'react'

// STLF-базлайни та MAPE. Логіку звірено fc_test.mjs.
export function mape(actual, pred) {
  let s = 0, n = 0
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] === 0) continue
    s += Math.abs((actual[i] - pred[i]) / actual[i]); n++
  }
  return n ? (s / n) * 100 : NaN
}
export function forecast(method, full, start) {
  const out = []
  for (let t = start; t < start + 24; t++) {
    if (method === 'persist') out.push(full[start - 1])
    else if (method === 'snaive') out.push(full[t - 24])
    else out.push((full[t - 24] + full[t - 48]) / 2) // 'ma'
  }
  return out
}

// Добовий профіль навантаження, % умовного піка (ніч-провал → вечірній пік).
const BASE = [42, 38, 36, 35, 37, 45, 58, 70, 78, 82, 80, 79, 77, 76, 74, 75, 80, 88, 95, 92, 84, 72, 58, 48]
const day = (k) => BASE.map((v) => +(v * k).toFixed(1))
const FULL = [...day(1.0), ...day(1.06), ...day(0.98)] // 3 доби по 24 год
const START = 48                                        // тест — 3-тя доба
const ACTUAL = FULL.slice(START)                        // = day(0.98)

const METHODS = {
  persist: { label: 'Наївний (persistence)', color: '#c0563a', note: 'ŷ(t) = остання відома. Ігнорує добову сезонність — тому й погана база.' },
  snaive: { label: 'Сезонний наївний', color: '#2e7d5b', note: 'ŷ(t) = той самий час учора (t−24). Простий, але сильний базлайн — його треба «побити».' },
  ma: { label: 'Ковзне середнє за годину', color: '#3b6ea5', note: 'ŷ(t) = середнє тієї ж години за 2 попередні доби. Усереднення гасить добові коливання → менша похибка.' },
}
const SCORES = Object.fromEntries(Object.keys(METHODS).map((m) => [m, mape(ACTUAL, forecast(m, FULL, START))]))

export default function LoadForecast() {
  const [m, setM] = useState('snaive')
  const pred = forecast(m, FULL, START)
  const best = Object.entries(SCORES).sort((a, b) => a[1] - b[1])[0][0]

  const W = 720, H = 170, pad = 8
  const all = [...FULL, ...pred]
  const lo = Math.min(...all) * 0.95, hi = Math.max(...all) * 1.03
  const x = (i) => pad + (i / (FULL.length - 1)) * (W - 2 * pad)
  const y = (v) => H - pad - ((v - lo) / (hi - lo)) * (H - 2 * pad)
  const path = (arr, off = 0) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i + off).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  return (
    <div className="widget">
      <h3>📈 Прогноз навантаження: чи б’єте ви базлайн?</h3>
      <p className="hint">
        Короткостроковий прогноз (STLF) починається не з нейромереж, а з <b>простих базлайнів</b>. Оберіть метод —
        побачите прогноз на 3-тю добу (пунктир) поверх факту та похибку <b>MAPE</b>. Головна теза: складна модель має
        сенс лише якщо <b>перемагає сезонний наївний</b>.
      </p>

      <div className="tabs">
        {Object.entries(METHODS).map(([k, v]) => (
          <button key={k} className={`tab ${m === k ? 'active' : ''}`} onClick={() => setM(k)}>{v.label}</button>
        ))}
      </div>

      <div className="arch" style={{ marginTop: 12 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          {/* межа факт / прогноз */}
          <line x1={x(START)} y1={pad} x2={x(START)} y2={H - pad} stroke="#c9d2dc" strokeWidth="1" strokeDasharray="3 3" />
          {/* факт (3 доби) */}
          <path d={path(FULL)} fill="none" stroke="#8794a6" strokeWidth="1.8" />
          {/* прогноз на 3-тю добу */}
          <path d={path(pred, START)} fill="none" stroke={METHODS[m].color} strokeWidth="2.4" strokeDasharray="5 3" />
          <text x={x(12)} y={H - 2} fontSize="10" textAnchor="middle" fill="#8794a6">доба 1</text>
          <text x={x(36)} y={H - 2} fontSize="10" textAnchor="middle" fill="#8794a6">доба 2</text>
          <text x={x(60)} y={H - 2} fontSize="10" textAnchor="middle" fill={METHODS[m].color}>доба 3 (тест)</text>
        </svg>
      </div>

      <table className="data" style={{ marginTop: 8 }}>
        <thead><tr><th>Метод</th><th>MAPE, %</th><th></th></tr></thead>
        <tbody>
          {Object.entries(METHODS).map(([k, v]) => (
            <tr key={k} style={{ fontWeight: k === m ? 700 : 400 }}>
              <td><span style={{ color: v.color }}>●</span> {v.label}</td>
              <td>{SCORES[k].toFixed(2)}</td>
              <td>{k === best ? '✔ найкращий базлайн' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="verdict ok" style={{ marginTop: 8 }}>{METHODS[m].note}</p>
      <p className="hint">
        MAPE = середнє |факт − прогноз| / факт. Поряд використовують MAE (абсолютна) і RMSE (штрафує великі промахи).
        Реальні STLF-моделі додають <b>календарні ознаки</b> (година, день тижня, свята) і <b>погоду</b> (температуру),
        а далі — регресію, ARIMA чи ML. Але оцінюють їх завжди відносно наївних базлайнів на <b>відкладеній вибірці</b>.
      </p>
    </div>
  )
}
