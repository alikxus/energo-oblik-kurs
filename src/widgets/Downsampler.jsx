import { useMemo, useState } from 'react'

// downsample(points, bucketSec, agg) — групує сирі семпли у часові бакети (як GROUP BY по часу в SQL).
// points: [{ t: epochSec, v: number }]. Логіка звірена ds_test.mjs (11/11).
export function downsample(points, bucketSec, agg) {
  const buckets = new Map()
  for (const p of points) {
    const start = Math.floor(p.t / bucketSec) * bucketSec
    let b = buckets.get(start)
    if (!b) { b = { sum: 0, min: Infinity, max: -Infinity, count: 0, lastT: -Infinity, lastV: 0 }; buckets.set(start, b) }
    b.sum += p.v; b.count++
    if (p.v < b.min) b.min = p.v
    if (p.v > b.max) b.max = p.v
    if (p.t > b.lastT) { b.lastT = p.t; b.lastV = p.v }
  }
  const out = []
  for (const start of [...buckets.keys()].sort((a, b) => a - b)) {
    const b = buckets.get(start)
    let v
    if (agg === 'avg') v = b.sum / b.count
    else if (agg === 'min') v = b.min
    else if (agg === 'max') v = b.max
    else if (agg === 'sum') v = b.sum
    else v = b.lastV // last
    out.push({ start, v, count: b.count })
  }
  return out
}

// Сирий ряд: активна потужність (кВт), семпл кожні 5 хв від 08:00, 1 година = 12 точок.
const BASE = 8 * 3600 // 08:00 у секундах доби
const RAW = [3.2, 3.5, 4.1, 6.8, 7.2, 5.9, 4.4, 4.0, 8.1, 9.3, 6.0, 3.8]
  .map((v, i) => ({ t: BASE + i * 300, v }))

const BUCKETS = [
  { s: 900, label: '15 хв' },
  { s: 1800, label: '30 хв' },
  { s: 3600, label: '1 год' },
]
const AGGS = [
  { k: 'avg', label: 'avg (середнє)' },
  { k: 'max', label: 'max (пік)' },
  { k: 'min', label: 'min' },
  { k: 'last', label: 'last (останнє)' },
]

const hhmm = (sec) => {
  const h = Math.floor(sec / 3600) % 24
  const m = Math.floor((sec % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function Downsampler() {
  const [bucketSec, setBucketSec] = useState(900)
  const [agg, setAgg] = useState('avg')
  const rows = useMemo(() => downsample(RAW, bucketSec, agg), [bucketSec, agg])
  const maxV = Math.max(...rows.map((r) => r.v), ...RAW.map((r) => r.v))

  return (
    <div className="widget">
      <h3>📉 Downsampling часового ряду</h3>
      <p className="hint">
        Сирі покази пишуться часто (тут — потужність кожні 5&nbsp;хв). Для трендів і довгого зберігання їх
        <b> проріджують</b>: групують у часові <b>бакети</b> й рахують агрегат. У SQL це <code>GROUP BY</code> по
        <b> округленому часу</b> — саме те, що ви зробите в ЛР4 над SQLite. Оберіть інтервал і функцію:
      </p>

      <div className="field">
        <label>Розмір бакета</label>
        <div className="tabs">
          {BUCKETS.map((b) => (
            <button key={b.s} className={`tab ${bucketSec === b.s ? 'active' : ''}`} onClick={() => setBucketSec(b.s)}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Агрегація</label>
        <div className="tabs">
          {AGGS.map((a) => (
            <button key={a.k} className={`tab ${agg === a.k ? 'active' : ''}`} onClick={() => setAgg(a.k)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <p className="verdict ok">
        12 сирих точок → <b>{rows.length}</b> {rows.length === 1 ? 'бакет' : rows.length < 5 ? 'бакети' : 'бакетів'} по {BUCKETS.find((b) => b.s === bucketSec).label}
      </p>

      <table className="data">
        <thead>
          <tr><th>Бакет (початок)</th><th>Семплів</th><th>{agg}, кВт</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.start}>
              <td><b>{hhmm(r.start)}</b></td>
              <td>{r.count}</td>
              <td>{r.v.toFixed(2)}</td>
              <td style={{ width: '45%' }}>
                <span style={{
                  display: 'inline-block', height: '0.9em', borderRadius: 3,
                  background: 'var(--accent, #4a9)', width: `${(r.v / maxV) * 100}%`, minWidth: 2,
                }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="hint">
        Менший бакет — більше точок і деталей, але більший обсяг; більший бакет — компактний тренд, але піки
        «згладжуються» (порівняйте <b>avg</b> і <b>max</b> на 1&nbsp;год: середнє ховає пік 9.3&nbsp;кВт). Тому в
        обліку часто зберігають сирі дані короткий час, а агрегати — довго (retention + downsampling).
      </p>
    </div>
  )
}
