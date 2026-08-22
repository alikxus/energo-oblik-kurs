import { useState } from 'react'
import { cost } from './TariffCalc.jsx'

// Гнучкість попиту (demand response): зсув частини вечірнього піку в нічну западину.
// Логіку зсуву звірено demandflex_test.mjs.
const PEAK_H = [17, 18, 19, 20, 21]   // вечірній пік — звідки зсуваємо
const VALLEY_H = [0, 1, 2, 3, 4, 5]   // глибока ніч — куди зсуваємо
const BASE = [30,26,24,23,24,28,42,55,64,66,63,61,60,61,63,66,74,88,100,108,98,80,52,36]

function shiftLoad(base, f) {
  const p = base.slice()
  let moved = 0
  for (const h of PEAK_H) { const d = p[h] * f; p[h] -= d; moved += d }
  const add = moved / VALLEY_H.length
  for (const h of VALLEY_H) p[h] += add
  return p
}
const sum = (p) => p.reduce((a, b) => a + b, 0)
const kz = (p) => (sum(p) / 24) / Math.max(...p)   // Кз = Pсер/Pмакс

export default function DemandFlex() {
  const [pct, setPct] = useState(30)     // % зсуву
  const f = pct / 100
  const shifted = shiftLoad(BASE, f)

  const pk0 = Math.max(...BASE), pk1 = Math.max(...shifted)
  const kz0 = kz(BASE), kz1 = kz(shifted)
  const c0 = cost(BASE, 'two'), c1 = cost(shifted, 'two')
  const save = ((c1 - c0) / c0) * 100

  // графік: база (тінь) + після зсуву (лінія)
  const W = 720, H = 150, pad = 8
  const mx = Math.max(...BASE)
  const x = (h) => pad + (h / 23) * (W - 2 * pad)
  const y = (v) => H - 22 - (v / mx) * (H - 40)
  const line = (p) => p.map((v, h) => `${h ? 'L' : 'M'}${x(h).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  return (
    <div className="widget">
      <h3>🔀 Гнучкість попиту: зрізаємо пік</h3>
      <p className="hint">
        Розумний облік (AMI) і зонні тарифи дають змогу <b>керувати попитом</b>: зсувати частину вечірнього піку в нічні
        години (бойлер, зарядка, накопичувач). Посуньте повзунок — той самий добовий обсяг енергії, але інша <b>форма</b>
        графіка. Дивіться, як падає пік <b>Pмакс</b>, росте рівномірність <b>Кз</b> (Л10) і меншає рахунок за двозонним
        тарифом (Л11).
      </p>

      <label style={{ display: 'block', margin: '10px 0' }}>
        Зсув вечірнього піку в ніч: <b>{pct}%</b>
        <input type="range" min="0" max="50" step="5" value={pct}
          onChange={(e) => setPct(+e.target.value)} style={{ width: '100%' }} />
      </label>

      <div className="arch" style={{ marginTop: 4 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          <rect x={x(0)} y={pad} width={x(6) - x(0)} height={H - 30 - pad} fill="rgba(46,125,91,0.08)" />
          <rect x={x(23)} y={pad} width={x(24) - x(23)} height={H - 30 - pad} fill="rgba(46,125,91,0.08)" />
          <path d={line(BASE)} fill="none" stroke="#c0563a" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.55" />
          <path d={line(shifted)} fill="none" stroke="#2e7d5b" strokeWidth="2.4" />
          {[0, 6, 12, 17, 21, 23].map((h) => (
            <text key={h} x={x(h)} y={H - 4} fontSize="9" textAnchor="middle" fill="#8794a6">{h}</text>
          ))}
          <text x={x(3)} y={H - 14} fontSize="9" textAnchor="middle" fill="#2e7d5b">ніч 0.5</text>
          <text x={x(19)} y={H - 14} fontSize="9" textAnchor="middle" fill="#c0563a">пік</text>
        </svg>
      </div>
      <p className="hint" style={{ marginTop: 0 }}>
        <span style={{ color: '#c0563a' }}>▬ ▬</span> базовий графік &nbsp;·&nbsp;
        <span style={{ color: '#2e7d5b' }}>▬▬</span> після зсуву
      </p>

      <table className="data" style={{ marginTop: 4 }}>
        <thead><tr><th>Показник</th><th>Базовий</th><th>Після зсуву</th></tr></thead>
        <tbody>
          <tr><td>Пік навантаження Pмакс, кВт</td><td>{pk0.toFixed(0)}</td><td style={{ fontWeight: 700, color: '#2e7d5b' }}>{pk1.toFixed(1)}</td></tr>
          <tr><td>Коеф. рівномірності Кз</td><td>{kz0.toFixed(3)}</td><td style={{ fontWeight: 700, color: '#2e7d5b' }}>{kz1.toFixed(3)}</td></tr>
          <tr><td>Рахунок (двозонний), од.</td><td>{c0.toFixed(0)}</td><td style={{ fontWeight: 700, color: '#2e7d5b' }}>{c1.toFixed(0)} ({save.toFixed(1)}%)</td></tr>
        </tbody>
      </table>

      <p className="verdict ok" style={{ marginTop: 8 }}>
        {pct === 0
          ? 'Зсуву немає — базовий графік із гострим вечірнім піком. Посуньте повзунок, щоб перенести частину навантаження в ніч.'
          : `Зсунуто ${pct}% вечірнього піку в нічну зону: пік упав із ${pk0} до ${pk1.toFixed(0)} кВт, Кз зріс до ${kz1.toFixed(2)}, рахунок за двозонним тарифом ${save.toFixed(1)}%. Виграють обидві сторони: споживач платить менше, а мережа розвантажує пік.`}
      </p>
      <p className="hint">
        Це і є <b>гнучкість попиту</b> — один із головних трендів Smart Grid. Але зсув має межу: якщо «злити» в ніч
        забагато, нічна западина сама стане піком (ефект <b>rebound</b>). Тому demand response керують сигналами ціни й
        обмеженнями, а не просто «все на ніч».
      </p>
    </div>
  )
}
