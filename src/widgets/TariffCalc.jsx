import { useState } from 'react'

// Зонні коефіцієнти (класичні НКРЕКП). Логіку звірено tariff_test.mjs.
const k2 = (h) => (h >= 23 || h < 7) ? 0.5 : 1.0           // двозонний: ніч 23–7
const k3 = (h) => {                                         // тризонний
  if (h >= 23 || h < 7) return 0.35                         // ніч 23–7
  if ((h >= 8 && h < 11) || (h >= 20 && h < 22)) return 1.5 // пік 8–11, 20–22
  return 1.02                                               // напівпік — решта
}
const SCHEMES = { one: () => 1.0, two: k2, three: k3 }
export function cost(profile, scheme) {
  const k = SCHEMES[scheme]
  return profile.reduce((s, e, h) => s + e * k(h), 0)
}

// профілі нормалізовано до однакового добового обсягу — порівнюємо ФОРМУ графіка, не обсяг
const norm = (p, t) => { const s = p.reduce((a, b) => a + b, 0); return p.map((v) => +(v * t / s).toFixed(2)) }
const T = 1560 // = 65 кВт·год × 24 год
const RAW = {
  pobut: [42,38,36,35,37,45,58,70,78,82,80,79,77,76,74,75,80,88,95,92,84,72,58,48],
  nich:  [92,95,96,95,93,90,60,38,28,24,22,22,24,26,28,30,30,28,26,25,24,26,60,90],
  flat:  Array(24).fill(65),
}
const PROFILES = {
  pobut: { label: 'Побут (ранковий + вечірній пік)', data: norm(RAW.pobut, T),
    note: 'Споживання припадає на пікові години (ранок і вечір). Двозонний дає впевнену економію на нічній зоні, а тризонний майже не виграє: коефіцієнт піку 1.5 з’їдає нічну економію. Висновок — для типового побуту переходити на тризонний немає сенсу.' },
  nich: { label: 'Нічне опалення / нічна зміна', data: norm(RAW.nich, T),
    note: 'Основне навантаження — у глибокій нічній зоні (23–07), а пікові години майже порожні. Саме тут тризонний виграє найбільше (ніч 0.35 проти 0.5 у двозонного). Класичний випадок вигоди зонного обліку — електроопалення/бойлер уночі, накопичувачі.' },
  flat: { label: 'Рівномірне (безперервне виробництво)', data: norm(RAW.flat, T),
    note: 'Плаский графік без вираженого піку. Двозонний дає помірну економію за рахунок нічних годин; тризонний програє двозонному через денний напівпік і пікові години. Рівний графік — двозонний оптимальний.' },
}
const SCHEME_META = {
  one: { label: 'Одноставковий', color: '#8794a6' },
  two: { label: 'Двозонний', color: '#2e7d5b' },
  three: { label: 'Тризонний', color: '#3b6ea5' },
}

export default function TariffCalc() {
  const [pid, setPid] = useState('pobut')
  const prof = PROFILES[pid]
  const c = { one: cost(prof.data, 'one'), two: cost(prof.data, 'two'), three: cost(prof.data, 'three') }
  const best = Object.entries(c).sort((a, b) => a[1] - b[1])[0][0]
  const maxC = Math.max(c.one, c.two, c.three)

  // мінікарта профілю + зони
  const W = 720, H = 130, pad = 8
  const data = prof.data, mx = Math.max(...data)
  const x = (h) => pad + (h / 23) * (W - 2 * pad)
  const y = (v) => H - 22 - (v / mx) * (H - 40)
  const path = data.map((v, h) => `${h ? 'L' : 'M'}${x(h).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const zoneRect = (h0, h1, fill) => <rect key={`${h0}`} x={x(h0)} y={pad} width={x(h1) - x(h0)} height={H - 30 - pad} fill={fill} />

  return (
    <div className="widget">
      <h3>💵 Який тариф вигідний для цього графіка?</h3>
      <p className="hint">
        Той самий добовий обсяг енергії коштує <b>по-різному</b> залежно від форми графіка й обраного тарифу. Оберіть
        типовий профіль споживання — і побачите вартість доби за <b>одноставковим</b>, <b>двозонним</b> і
        <b> тризонним</b> обліком (умовний тариф T = 1 од./кВт·год, зонні коефіцієнти НКРЕКП).
      </p>

      <div className="tabs">
        {Object.entries(PROFILES).map(([k, v]) => (
          <button key={k} className={`tab ${pid === k ? 'active' : ''}`} onClick={() => setPid(k)}>{v.label.split(' (')[0]}</button>
        ))}
      </div>

      <div className="arch" style={{ marginTop: 12 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          {/* зони тризонного тарифу як тло */}
          {zoneRect(0, 7, 'rgba(59,110,165,0.08)')}
          {zoneRect(23, 24, 'rgba(59,110,165,0.08)')}
          {zoneRect(8, 11, 'rgba(192,86,58,0.10)')}
          {zoneRect(20, 22, 'rgba(192,86,58,0.10)')}
          <path d={path} fill="none" stroke="#33475b" strokeWidth="2" />
          {[0, 6, 8, 11, 20, 22, 23].map((h) => (
            <text key={h} x={x(h)} y={H - 4} fontSize="9" textAnchor="middle" fill="#8794a6">{h}</text>
          ))}
          <text x={x(3.5)} y={H - 14} fontSize="9" textAnchor="middle" fill="#3b6ea5">ніч 0.35</text>
          <text x={x(9.5)} y={H - 14} fontSize="9" textAnchor="middle" fill="#c0563a">пік 1.5</text>
          <text x={x(21)} y={H - 14} fontSize="9" textAnchor="middle" fill="#c0563a">пік</text>
        </svg>
      </div>

      <table className="data" style={{ marginTop: 8 }}>
        <thead><tr><th>Тариф</th><th>Вартість доби, од.</th><th></th><th></th></tr></thead>
        <tbody>
          {Object.entries(SCHEME_META).map(([k, m]) => (
            <tr key={k} style={{ fontWeight: k === best ? 700 : 400 }}>
              <td><span style={{ color: m.color }}>●</span> {m.label}</td>
              <td>{c[k].toFixed(1)}</td>
              <td style={{ width: '45%' }}>
                <div style={{ background: '#eef1f5', borderRadius: 3, height: 12 }}>
                  <div style={{ width: `${(c[k] / maxC) * 100}%`, background: m.color, height: 12, borderRadius: 3 }} />
                </div>
              </td>
              <td>{k === best ? '✔ найдешевший' : `+${(((c[k] - c[best]) / c[best]) * 100).toFixed(1)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="verdict ok" style={{ marginTop: 8 }}>{prof.note}</p>
      <p className="hint">
        Головна теза: зонний облік вигідний <b>лише якщо графік споживання зміщений у дешеві зони</b>. «Просто перейти на
        тризонний» без зсуву навантаження може навіть підвищити рахунок (пік 1.5). Тому вибір тарифу — це рішення на
        основі <b>аналізу графіка навантаження</b> (Л10), а сам розрахунок — ядро <b>білінгу</b>.
      </p>
    </div>
  )
}
