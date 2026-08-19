import { useMemo, useState } from 'react'

// CRC-16/MODBUS: poly 0xA001 (reflected), init 0xFFFF. Returns [lo, hi] as Modbus sends it.
function crc16(bytes) {
  let crc = 0xffff
  for (const b of bytes) {
    crc ^= b
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1
    }
  }
  return [crc & 0xff, (crc >> 8) & 0xff]
}

const hx = (n) => n.toString(16).toUpperCase().padStart(2, '0')

const FUNCS = {
  3: 'Read Holding Registers (0x03)',
  4: 'Read Input Registers (0x04)',
  6: 'Write Single Register (0x06)',
}

function Byte({ v, label, cls }) {
  return (
    <span className={`byte ${cls}`}>
      <span className="hx">{hx(v)}</span>
      <span className="lb">{label}</span>
    </span>
  )
}

export default function ModbusFrameBuilder() {
  const [mode, setMode] = useState('rtu') // rtu | tcp
  const [addr, setAddr] = useState(1)
  const [func, setFunc] = useState(3)
  const [start, setStart] = useState(0)
  const [qty, setQty] = useState(2) // for FC03/04 = quantity; for FC06 = value to write

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo))

  const frame = useMemo(() => {
    const a = clamp(addr, 0, 247)
    const f = func
    const s = clamp(start, 0, 65535)
    const q = clamp(qty, f === 6 ? 0 : 1, 65535)
    // PDU = func + start(hi,lo) + qty/value(hi,lo)
    const pdu = [f, (s >> 8) & 0xff, s & 0xff, (q >> 8) & 0xff, q & 0xff]

    if (mode === 'rtu') {
      const body = [a, ...pdu]
      const [clo, chi] = crc16(body)
      const cells = [
        { v: a, label: 'addr', cls: 'b-addr' },
        { v: pdu[0], label: 'func', cls: 'b-func' },
        { v: pdu[1], label: 'reg Hi', cls: 'b-data' },
        { v: pdu[2], label: 'reg Lo', cls: 'b-data' },
        { v: pdu[3], label: f === 6 ? 'val Hi' : 'qty Hi', cls: 'b-data' },
        { v: pdu[4], label: f === 6 ? 'val Lo' : 'qty Lo', cls: 'b-data' },
        { v: clo, label: 'CRC Lo', cls: 'b-crc' },
        { v: chi, label: 'CRC Hi', cls: 'b-crc' },
      ]
      return { cells, note: `RTU-кадр по RS-485: ${cells.length} байт. CRC-16/MODBUS рахується від адреси до кінця даних; передається молодшим байтом уперед (Lo, Hi).` }
    }
    // TCP: MBAP (txid Hi/Lo, proto=0, len, unit) + PDU (без CRC — цілісність забезпечує TCP)
    const txid = 1
    const len = pdu.length + 1 // unit + PDU
    const cells = [
      { v: (txid >> 8) & 0xff, label: 'txid Hi', cls: 'b-mbap' },
      { v: txid & 0xff, label: 'txid Lo', cls: 'b-mbap' },
      { v: 0, label: 'proto Hi', cls: 'b-mbap' },
      { v: 0, label: 'proto Lo', cls: 'b-mbap' },
      { v: (len >> 8) & 0xff, label: 'len Hi', cls: 'b-mbap' },
      { v: len & 0xff, label: 'len Lo', cls: 'b-mbap' },
      { v: a, label: 'unit', cls: 'b-addr' },
      { v: pdu[0], label: 'func', cls: 'b-func' },
      { v: pdu[1], label: 'reg Hi', cls: 'b-data' },
      { v: pdu[2], label: 'reg Lo', cls: 'b-data' },
      { v: pdu[3], label: f === 6 ? 'val Hi' : 'qty Hi', cls: 'b-data' },
      { v: pdu[4], label: f === 6 ? 'val Lo' : 'qty Lo', cls: 'b-data' },
    ]
    return { cells, note: `TCP-кадр: 7-байтовий заголовок MBAP + PDU, без CRC — цілісність гарантує TCP. Порт за замовчуванням 502.` }
  }, [mode, addr, func, start, qty])

  const hexString = frame.cells.map((c) => hx(c.v)).join(' ')

  return (
    <div className="widget">
      <h3>🔧 Живий конструктор Modbus-кадру</h3>
      <p className="hint">
        Змоделюйте запит до лічильника: оберіть RTU (RS-485) чи TCP, функцію та регістр — кадр і контрольна
        сума перерахуються миттєво. Це та сама логіка, що всередині <code>pymodbus</code> у ЛР&nbsp;1.
      </p>

      <div className="seg" role="tablist">
        <button className={mode === 'rtu' ? 'on' : ''} onClick={() => setMode('rtu')}>Modbus RTU</button>
        <button className={mode === 'tcp' ? 'on' : ''} onClick={() => setMode('tcp')}>Modbus TCP</button>
      </div>

      <div className="controls">
        <div className="field">
          <label>Адреса slave (1–247)</label>
          <input type="number" min="0" max="247" value={addr}
            onChange={(e) => setAddr(parseInt(e.target.value, 10))} />
        </div>
        <div className="field">
          <label>Функція</label>
          <select value={func} onChange={(e) => setFunc(parseInt(e.target.value, 10))}>
            {Object.entries(FUNCS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Стартовий регістр</label>
          <input type="number" min="0" max="65535" value={start}
            onChange={(e) => setStart(parseInt(e.target.value, 10))} />
        </div>
        <div className="field">
          <label>{func === 6 ? 'Значення для запису' : 'Кількість регістрів'}</label>
          <input type="number" min="0" max="65535" value={qty}
            onChange={(e) => setQty(parseInt(e.target.value, 10))} />
        </div>
      </div>

      <div className="frame">
        <div className="bytes">
          {frame.cells.map((c, i) => <Byte key={i} v={c.v} label={c.label} cls={c.cls} />)}
        </div>
      </div>
      <div className="frame" style={{ padding: '10px 14px' }}>{hexString}</div>

      <div className="legend">
        {mode === 'tcp' && <span className="lg-mbap">MBAP-заголовок</span>}
        <span className="lg-addr">{mode === 'tcp' ? 'Unit ID' : 'Адреса'}</span>
        <span className="lg-func">Код функції</span>
        <span className="lg-data">Дані (регістр/к-сть)</span>
        {mode === 'rtu' && <span className="lg-crc">CRC-16</span>}
      </div>
      <p className="hint">{frame.note}</p>
    </div>
  )
}
