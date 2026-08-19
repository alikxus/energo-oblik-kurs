import { useMemo, useState } from 'react'

// Декодер карти регістрів емульованого лічильника з ЛР1.
// Регістри — 16-бітні слова (holding registers). Значення парами:
// f32 @0 V, @2 I, @4 P, @6 PF; u32 @8 енергія; u16 @10 частота×100.

// Розбір рядка: числа через пробіл/кому, dec або 0xHEX.
function parseRegs(text) {
  return text
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((t) => (t.toLowerCase().startsWith('0x') ? parseInt(t, 16) : parseInt(t, 10)))
    .map((n) => (Number.isFinite(n) ? n & 0xffff : NaN))
}

function pick(regs, i, order) {
  let a = regs[i]
  let b = regs[i + 1]
  if (order === 'little') [a, b] = [b, a]
  return [a, b]
}

export function decodeFloat32(regs, i, order) {
  const [a, b] = pick(regs, i, order)
  const dv = new DataView(new ArrayBuffer(4))
  dv.setUint16(0, a)
  dv.setUint16(2, b)
  return dv.getFloat32(0)
}

export function decodeUint32(regs, i, order) {
  const [a, b] = pick(regs, i, order)
  return a * 65536 + b
}

const CORRECT = '17254 32768 16708 52429 16425 39322 16238 5243 18 54919 5001'

export default function RegisterDecoder() {
  const [text, setText] = useState(CORRECT)
  const [order, setOrder] = useState('big')
  const regs = useMemo(() => parseRegs(text), [text])
  const ok = regs.length >= 11 && regs.every(Number.isFinite)

  const rows = ok
    ? [
        ['Напруга L1', decodeFloat32(regs, 0, order).toFixed(2), 'В', 'float32 @0–1'],
        ['Струм L1', decodeFloat32(regs, 2, order).toFixed(2), 'А', 'float32 @2–3'],
        ['Активна потужність', decodeFloat32(regs, 4, order).toFixed(3), 'кВт', 'float32 @4–5'],
        ['Коефіцієнт потужності', decodeFloat32(regs, 6, order).toFixed(2), '', 'float32 @6–7'],
        ['Активна енергія', decodeUint32(regs, 8, order).toLocaleString('uk-UA'), 'Вт·год', 'uint32 @8–9'],
        ['Частота', (regs[10] / 100).toFixed(2), 'Гц', 'uint16 @10 ×100'],
      ]
    : []

  return (
    <div className="widget">
      <h3>🔎 Декодер карти регістрів лічильника</h3>
      <p className="hint">
        Вставте регістри, які повернув ваш клієнт у ЛР1 (11 значень, dec або 0x…). Віджет декодує їх за картою
        лічильника. Спробуйте перемкнути порядок слів — і побачите, чому «неправильний» порядок дає безглузді числа.
      </p>

      <div className="field">
        <label>Регістри (holding, з адреси 0)</label>
        <input value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="tabs">
        <button className={`tab ${order === 'big' ? 'active' : ''}`} onClick={() => setOrder('big')}>
          Порядок слів: big-endian (стандарт)
        </button>
        <button className={`tab ${order === 'little' ? 'active' : ''}`} onClick={() => setOrder('little')}>
          little-endian (word-swap)
        </button>
      </div>

      {ok ? (
        <table className="data">
          <thead>
            <tr><th>Величина</th><th>Значення</th><th>Од.</th><th>Кодування</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                <td>{r[0]}</td>
                <td><b>{r[1]}</b></td>
                <td>{r[2]}</td>
                <td>{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="verdict bad">⛔ Потрібно щонайменше 11 числових регістрів. Зараз розпізнано: {regs.filter(Number.isFinite).length}.</p>
      )}
      <p className="hint">
        Еталон (big-endian): V≈230,5 В, I≈12,3 А, P≈2,65 кВт, PF≈0,93, E=1 234 567 Вт·год, f=50,01 Гц.
      </p>
    </div>
  )
}
