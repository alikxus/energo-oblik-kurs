import { useMemo, useState } from 'react'

// Парсер OPC UA NodeId: [ns=<int>;]<type>=<value>, type ∈ i|s|g|b.
export function parseNodeId(text) {
  const m = text.trim().match(/^(?:ns=(\d+);)?([isgb])=(.+)$/)
  if (!m) return null
  const ns = m[1] === undefined ? 0 : parseInt(m[1], 10)
  const type = m[2]
  const id = m[3]
  if (type === 'i' && !/^\d+$/.test(id)) return null
  return { ns, type, id }
}

const TYPE_NAME = {
  i: 'Numeric — числовий ідентифікатор',
  s: 'String — рядковий (людиночитний) ідентифікатор',
  g: 'GUID — глобально унікальний ідентифікатор',
  b: 'Opaque — довільні байти (base64)',
}

// Приклади з простору адрес лічильника (ns=2 — namespace вендора).
const EXAMPLES = {
  'i=2258': 'Server_ServerStatus_CurrentTime (стандартний вузол, namespace 0)',
  'ns=2;s=Meter007.Energy': 'Змінна «активна енергія» лічильника 007 (рядковий NodeId)',
  'ns=2;s=Meter007.Voltage.L1': 'Змінна «напруга L1» лічильника 007',
  'ns=2;i=1001': 'Об’єкт «Meter007» (числовий NodeId у namespace вендора)',
}

export default function NodeIdDecoder() {
  const [text, setText] = useState('ns=2;s=Meter007.Energy')
  const node = useMemo(() => parseNodeId(text), [text])
  const known = node ? EXAMPLES[text.trim()] : null

  return (
    <div className="widget">
      <h3>🧭 Декодер OPC UA NodeId</h3>
      <p className="hint">
        У OPC UA кожен вузол простору адрес адресується <b>NodeId</b> — парою «індекс простору імен + ідентифікатор».
        На відміну від номера регістра Modbus чи топіка MQTT, вузол ще має тип, клас і зв’язки. Розберіть NodeId:
      </p>

      <div className="tabs">
        {Object.keys(EXAMPLES).map((ex) => (
          <button key={ex} className={`tab ${text === ex ? 'active' : ''}`} onClick={() => setText(ex)}>
            {ex}
          </button>
        ))}
      </div>
      <div className="field">
        <label>NodeId (напр. ns=2;s=Meter007.Energy)</label>
        <input value={text} onChange={(e) => setText(e.target.value)} />
      </div>

      {known && <p className="verdict ok">✅ {known}</p>}

      {node ? (
        <table className="data">
          <thead>
            <tr><th>Складова</th><th>Значення</th><th>Роль</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><b>NamespaceIndex</b></td>
              <td>{node.ns}</td>
              <td>{node.ns === 0 ? 'простір OPC Foundation (стандартні вузли)' : 'простір імен вендора/сервера'}</td>
            </tr>
            <tr>
              <td><b>IdentifierType</b></td>
              <td>{node.type}</td>
              <td>{TYPE_NAME[node.type]}</td>
            </tr>
            <tr>
              <td><b>Identifier</b></td>
              <td>{node.id}</td>
              <td>унікальний у межах свого простору імен</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="verdict bad">⛔ Формат: [ns=&lt;число&gt;;]&lt;i|s|g|b&gt;=&lt;значення&gt;. Приклад: ns=2;i=1001 або i=2258.</p>
      )}
    </div>
  )
}
