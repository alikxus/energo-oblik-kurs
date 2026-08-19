import { useMemo, useState } from 'react'

// Модель бюджету опитування RS-485/Modbus RTU:
// час кадру = кількість байтів × час байта (11 біт/байт для 8N1),
// на лічильник = запит + відповідь + пауза (turnaround + обробка).
// cycle = meters × perMeter; розклад здійсненний, якщо cycle ≤ interval.
export function pollingModel({ meters, regs, baud, gap }) {
  const charTime = 11 / baud // с/байт (старт+8+стоп ≈ 11 біт)
  const reqBytes = 8 // Modbus RTU: addr+func+addr(2)+qty(2)+CRC(2)
  const respBytes = 5 + 2 * regs // addr+func+bytecount+дані(2·regs)+CRC(2)
  const perMeter = (reqBytes + respBytes) * charTime + gap
  const cycle = meters * perMeter
  return { charTime, reqBytes, respBytes, perMeter, cycle }
}

export default function PollingBudget() {
  const [meters, setMeters] = useState(30)
  const [regs, setRegs] = useState(20)
  const [baud, setBaud] = useState(9600)
  const [gap, setGap] = useState(50) // мс, пауза між транзакціями
  const [interval, setIntervalSec] = useState(60) // с, період опитування

  const r = useMemo(
    () => pollingModel({ meters, regs, baud, gap: gap / 1000 }),
    [meters, regs, baud, gap]
  )
  const feasible = r.cycle <= interval
  const maxMeters = Math.floor(interval / r.perMeter)

  const fmt = (n, d = 2) => n.toLocaleString('uk-UA', { maximumFractionDigits: d })

  return (
    <div className="widget">
      <h3>⏱️ Калькулятор бюджету опитування (RS-485 / Modbus RTU)</h3>
      <p className="hint">
        УСПД опитує лічильники <b>послідовно</b> по спільній шині. Скільки встигнути за період? Модель рахує час кадрів
        (швидкість × байти) плюс паузу на кожну транзакцію. Змінюйте параметри — і дивіться, коли розклад «не влазить».
      </p>

      <div className="controls">
        <div className="field">
          <label>Лічильників на шині</label>
          <input type="number" min="1" value={meters} onChange={(e) => setMeters(+e.target.value)} />
        </div>
        <div className="field">
          <label>Реєстрів на лічильник</label>
          <input type="number" min="1" value={regs} onChange={(e) => setRegs(+e.target.value)} />
        </div>
        <div className="field">
          <label>Швидкість, бод</label>
          <select value={baud} onChange={(e) => setBaud(+e.target.value)}>
            <option value={1200}>1200</option>
            <option value={2400}>2400</option>
            <option value={9600}>9600</option>
            <option value={19200}>19200</option>
            <option value={38400}>38400</option>
            <option value={115200}>115200</option>
          </select>
        </div>
        <div className="field">
          <label>Пауза на транзакцію, мс</label>
          <input type="number" min="0" step="5" value={gap} onChange={(e) => setGap(+e.target.value)} />
        </div>
        <div className="field">
          <label>Період опитування, с</label>
          <input type="number" min="1" value={interval} onChange={(e) => setIntervalSec(+e.target.value)} />
        </div>
      </div>

      <table className="data">
        <tbody>
          <tr><td>Час одного байта</td><td><b>{fmt(r.charTime * 1000, 3)}</b> мс</td></tr>
          <tr><td>Кадр відповіді</td><td><b>{r.respBytes}</b> байт</td></tr>
          <tr><td>Час на 1 лічильник</td><td><b>{fmt(r.perMeter * 1000, 0)}</b> мс</td></tr>
          <tr><td>Повний цикл ({meters} лічильн.)</td><td><b>{fmt(r.cycle, 2)}</b> с</td></tr>
          <tr><td>Макс. лічильників за період</td><td><b>{maxMeters}</b></td></tr>
        </tbody>
      </table>

      <p className={feasible ? 'verdict ok' : 'verdict bad'}>
        {feasible
          ? `✅ Розклад здійсненний: цикл ${fmt(r.cycle, 1)} с ≤ період ${interval} с (запас ${fmt(interval - r.cycle, 1)} с).`
          : `⛔ Не влазить: цикл ${fmt(r.cycle, 1)} с > період ${interval} с. Підняти швидкість, зменшити реєстри/паузу або розбити на кілька шин.`}
      </p>
    </div>
  )
}
