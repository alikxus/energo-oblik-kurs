import { useState } from 'react'

// describe(net, conn) — конфіг схеми або null для нереальної комбінації.
// Блондель: вимірювальних елементів = провідників − 1.
// Звірено conn_test.mjs (8/8).
const NETS = {
  '1f2': { label: '1-фазна, 2-провідна', phases: ['L'], neutral: true, elements: 1 },
  '3f4': { label: '3-фазна, 4-провідна (з N)', phases: ['L1', 'L2', 'L3'], neutral: true, elements: 3 },
  '3f3': { label: '3-фазна, 3-провідна (без N)', phases: ['L1', 'L2', 'L3'], neutral: false, elements: 2 },
}
const INVALID = new Set(['1f2|indirect', '3f3|direct', '3f3|semi'])

export function describe(net, conn) {
  const N = NETS[net]
  if (!N || !['direct', 'semi', 'indirect'].includes(conn)) return null
  if (INVALID.has(`${net}|${conn}`)) return null
  const ct = conn !== 'direct'
  const vt = conn === 'indirect'
  return {
    elements: N.elements,
    ct, vt,
    cts: ct ? N.elements : 0,
    vts: vt ? N.elements : 0,
    K: conn === 'direct' ? '1' : conn === 'semi' ? 'Kт' : 'Kт · Kн',
  }
}

const CONN = {
  direct: {
    label: 'Пряме',
    hint: 'Лічильник у розсічку кола без трансформаторів. Струм і напруга — напряму. K = 1.',
    use: 'Побутовий і дрібний комерційний облік у мережі 0,4 кВ при струмах до ~100 А.',
  },
  semi: {
    label: 'Напівпряме (через ТС)',
    hint: 'Струм — через трансформатори струму (ТС), напруга — напряму. K = Kт.',
    use: 'Облік 0,4 кВ при великих струмах (сотні А), де прямий струм у лічильник завести не можна.',
  },
  indirect: {
    label: 'Непряме (ТС + ТН)',
    hint: 'І струм (ТС), і напруга (ТН) — через вимірювальні трансформатори. K = Kт · Kн.',
    use: 'Мережі середньої/високої напруги (6 / 10 / 35 кВ і вище), де прямі струм і напруга недопустимі.',
  },
}
const INVALID_WHY = {
  '1f2|indirect': 'Однофазний облік через ТН практично не застосовують — непряме вмикання — це мережі СН/ВН, а вони трифазні.',
  '3f3|direct': '3-провідна мережа без нейтралі — це середня/висока напруга; прямо завести струм і напругу в лічильник неможливо.',
  '3f3|semi': 'У мережі СН/ВН напругу не можна подати на лічильник напряму — потрібні й ТН, тобто лише непряме вмикання.',
}

export default function ConnectionScheme() {
  const [net, setNet] = useState('3f4')
  const [conn, setConn] = useState('semi')
  const d = describe(net, conn)
  const N = NETS[net]

  return (
    <div className="widget">
      <h3>🔌 Схеми підключення лічильника</h3>
      <p className="hint">
        Оберіть <b>мережу</b> й <b>спосіб вмикання</b> — побачите, де стоять ТС/ТН, скільки в лічильнику
        вимірювальних елементів і який множник K. Не всі комбінації реальні: непридатні позначено.
      </p>

      <div className="field"><label>Мережа:</label></div>
      <div className="tabs">
        {Object.entries(NETS).map(([k, v]) => (
          <button key={k} className={`tab ${net === k ? 'active' : ''}`} onClick={() => setNet(k)}>{v.label}</button>
        ))}
      </div>

      <div className="field" style={{ marginTop: 10 }}><label>Спосіб вмикання:</label></div>
      <div className="tabs">
        {Object.entries(CONN).map(([k, v]) => (
          <button key={k} className={`tab ${conn === k ? 'active' : ''}`} onClick={() => setConn(k)}>{v.label}</button>
        ))}
      </div>

      <SchemeSVG net={N} d={d} />

      {d ? (
        <>
          <table className="data" style={{ marginTop: 12 }}>
            <tbody>
              <tr><th>Спосіб</th><td>{CONN[conn].label}</td></tr>
              <tr><th>Трансформатори струму (ТС)</th><td>{d.ct ? `так, ${d.cts} шт.` : 'ні (струм напряму)'}</td></tr>
              <tr><th>Трансформатори напруги (ТН)</th><td>{d.vt ? `так, ${d.vts} шт.` : 'ні (напруга напряму)'}</td></tr>
              <tr><th>Вимірювальних елементів</th><td><b>{d.elements}</b>{net === '3f3' ? ' (2-елементна «схема Арона»)' : net === '3f4' ? ' (3-елементна)' : ' (1-елементний)'}</td></tr>
              <tr><th>Множник обліку K</th><td><b>K = {d.K}</b> → W = Wлічильника · K</td></tr>
            </tbody>
          </table>
          <p className="verdict ok">✔ {CONN[conn].hint}</p>
          <p className="hint">{CONN[conn].use}</p>
        </>
      ) : (
        <p className="verdict bad">⛔ Нереальна комбінація. {INVALID_WHY[`${net}|${conn}`]}</p>
      )}

      <p className="hint">
        Правило числа елементів — <b>теорема Блонделя</b>: для мережі з <i>n</i> провідників достатньо
        <i> n−1</i> вимірювальних елементів. Тому 4-провідна (3 фази + N) → 3 елементи, а 3-провідна
        (без нейтралі) → 2 елементи (класична двоватметрова «схема Арона»).
      </p>
    </div>
  )
}

// Схематична (не монтажна) діаграма: фазні лінії → [ТС] → [ТН] → лічильник.
function SchemeSVG({ net, d }) {
  const cond = [...net.phases, ...(net.neutral ? ['N'] : [])]
  // Скільки ТС, стільки й позначок. Якщо менше, ніж фаз (Арон 2 з 3) — на крайніх фазах.
  const np = net.phases.length
  const ctSet = new Set(d && d.ct ? (d.cts >= np ? net.phases.map((_, i) => i) : [0, np - 1]) : [])
  const y0 = 34, dy = 30
  const yOf = (i) => y0 + i * dy
  const H = yOf(cond.length - 1) + 34
  const xLabel = 24, xStart = 54, xCT = 150, xVT = 235, xMeter = 320, xMeterW = 150

  return (
    <div className="arch" style={{ marginTop: 12 }}>
      <svg viewBox={`0 0 ${xMeter + xMeterW + 20} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {cond.map((c, i) => {
          const y = yOf(i)
          const isN = c === 'N'
          return (
            <g key={c}>
              <line x1={xStart} y1={y} x2={xMeter} y2={y}
                stroke={isN ? '#8a94a6' : '#3b6ea5'} strokeWidth="2"
                strokeDasharray={isN ? '5 4' : ''} />
              <text x={xLabel} y={y + 4} fontSize="13" fill="#334" fontWeight="600">{c}</text>
              {ctSet.has(i) && !isN && (
                <>
                  <circle cx={xCT} cy={y} r="9" fill="#fff" stroke="#c76b2e" strokeWidth="2" />
                  <text x={xCT} y={y + 4} fontSize="9" textAnchor="middle" fill="#c76b2e" fontWeight="700">ТС</text>
                </>
              )}
            </g>
          )
        })}

        {d && d.vt && (
          <g>
            <rect x={xVT - 20} y={yOf(0) - 12} width="40" height={yOf(net.phases.length - 1) - yOf(0) + 24}
              rx="5" fill="#fff" stroke="#7a4fbf" strokeWidth="2" />
            <text x={xVT} y={(yOf(0) + yOf(net.phases.length - 1)) / 2 + 4} fontSize="11"
              textAnchor="middle" fill="#7a4fbf" fontWeight="700">ТН</text>
          </g>
        )}

        <rect x={xMeter} y={yOf(0) - 14} width={xMeterW} height={yOf(cond.length - 1) - yOf(0) + 28}
          rx="7" fill="#eef3f8" stroke="#3b6ea5" strokeWidth="2" />
        <text x={xMeter + xMeterW / 2} y={(yOf(0) + yOf(cond.length - 1)) / 2 - 2} fontSize="13"
          textAnchor="middle" fill="#274b73" fontWeight="700">Лічильник</text>
        <text x={xMeter + xMeterW / 2} y={(yOf(0) + yOf(cond.length - 1)) / 2 + 16} fontSize="11"
          textAnchor="middle" fill="#5a6b82">{d ? `${d.elements}-елем. · K=${d.K}` : '—'}</text>
      </svg>
      <p className="arch-desc">
        Схематична діаграма (не монтажна): {net.phases.length === 1 ? 'фаза' : 'фази'} {net.neutral ? '+ нейтраль ' : ''}
        → {d && d.ct ? 'ТС → ' : ''}{d && d.vt ? 'ТН → ' : ''}лічильник.
      </p>
    </div>
  )
}
