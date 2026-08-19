import { useMemo, useState } from 'react'

// Метровий множник: лічильник рахує вторинні величини, а комерційний облік —
// первинні. Коефіцієнт K = Kт·Kн множить виміряну вторинну потужність на первинну.
export default function CTVTCalculator() {
  const [ctP, setCtP] = useState(300)
  const [ctS, setCtS] = useState(5)
  const [vtP, setVtP] = useState(10000)
  const [vtS, setVtS] = useState(100)
  const [i2, setI2] = useState(4)
  const [u2, setU2] = useState(100)
  const [cos, setCos] = useState(0.9)

  const r = useMemo(() => {
    const kt = ctP / ctS || 0
    const kn = vtP / vtS || 0
    const k = kt * kn
    const i1 = i2 * kt
    const u1 = u2 * kn
    // 3-фазна симетрична система, U — лінійна напруга
    const s1 = Math.sqrt(3) * u1 * i1 // ВА
    const p1 = s1 * cos // Вт
    return { kt, kn, k, i1, u1, s1, p1 }
  }, [ctP, ctS, vtP, vtS, i2, u2, cos])

  const fmt = (n, d = 0) => n.toLocaleString('uk-UA', { maximumFractionDigits: d })

  return (
    <div className="widget">
      <h3>🧮 Калькулятор вимірювального тракту (ТС/ТН)</h3>
      <p className="hint">
        Лічильник фізично вимірює <b>вторинні</b> струм і напругу після трансформаторів. Комерційний облік ведеться в
        <b> первинних</b> величинах — тому в лічильник закладають коефіцієнти трансформації. Змініть параметри й
        подивіться, як виміряні вторинні значення перетворюються на первинну потужність мережі.
      </p>

      <div className="controls">
        <div className="field">
          <label>ТС: первинний струм, А</label>
          <input type="number" value={ctP} onChange={(e) => setCtP(+e.target.value)} />
        </div>
        <div className="field">
          <label>ТС: вторинний струм, А</label>
          <select value={ctS} onChange={(e) => setCtS(+e.target.value)}>
            <option value={5}>5</option>
            <option value={1}>1</option>
          </select>
        </div>
        <div className="field">
          <label>ТН: первинна напруга, В</label>
          <input type="number" value={vtP} onChange={(e) => setVtP(+e.target.value)} />
        </div>
        <div className="field">
          <label>ТН: вторинна напруга, В</label>
          <select value={vtS} onChange={(e) => setVtS(+e.target.value)}>
            <option value={100}>100</option>
            <option value={110}>110</option>
          </select>
        </div>
        <div className="field">
          <label>Виміряний вторинний струм I₂, А</label>
          <input type="number" step="0.1" value={i2} onChange={(e) => setI2(+e.target.value)} />
        </div>
        <div className="field">
          <label>Виміряна вторинна напруга U₂, В</label>
          <input type="number" step="1" value={u2} onChange={(e) => setU2(+e.target.value)} />
        </div>
        <div className="field">
          <label>cos φ</label>
          <input type="number" step="0.01" min="0" max="1" value={cos} onChange={(e) => setCos(+e.target.value)} />
        </div>
      </div>

      <table className="data">
        <tbody>
          <tr><td>Коефіцієнт ТС, Kт</td><td><b>{fmt(r.kt, 1)}</b> ({ctP}/{ctS})</td></tr>
          <tr><td>Коефіцієнт ТН, Kн</td><td><b>{fmt(r.kn, 1)}</b> ({vtP}/{vtS})</td></tr>
          <tr><td>Загальний множник лічильника K = Kт·Kн</td><td><b>{fmt(r.k, 1)}</b></td></tr>
          <tr><td>Первинний струм I₁ = I₂·Kт</td><td><b>{fmt(r.i1, 1)}</b> А</td></tr>
          <tr><td>Первинна напруга U₁ = U₂·Kн (лінійна)</td><td><b>{fmt(r.u1)}</b> В</td></tr>
          <tr><td>Повна потужність S₁ = √3·U₁·I₁</td><td><b>{fmt(r.s1 / 1000, 1)}</b> кВА</td></tr>
          <tr><td>Активна потужність P₁ = S₁·cos φ</td><td><b>{fmt(r.p1 / 1000, 1)}</b> кВт</td></tr>
        </tbody>
      </table>
      <p className="hint">
        Помилка у введеному коефіцієнті трансформації (напр. 300/5 замість 200/5) множиться на всю енергію — це
        типова причина грубих похибок комерційного обліку й перерахунків.
      </p>
    </div>
  )
}
