import { useState } from 'react'
import Lecture01 from './lectures/Lecture01.jsx'
import Lecture02 from './lectures/Lecture02.jsx'

// Реєстр вмісту: id → компонент. Готовий пункт = є в CONTENT.
const CONTENT = {
  l1: Lecture01,
  l2: Lecture02,
}

const LECTURES = [
  { id: 'l1', n: 1, title: 'Архітектура ІС обліку. АСКОЕ/АІІС' },
  { id: 'l2', n: 2, title: 'Первинні прилади та перетворювачі' },
  { id: 'l3', n: 3, title: 'УСПД, канали та топології' },
  { id: 'l4', n: 4, title: 'Протокол Modbus RTU/TCP' },
  { id: 'l5', n: 5, title: 'DLMS/COSEM' },
  { id: 'l6', n: 6, title: 'MQTT та IoT-обмін' },
  { id: 'l7', n: 7, title: 'OPC UA та SCADA' },
  { id: 'l8', n: 8, title: 'БД та часові ряди' },
  { id: 'l9', n: 9, title: 'Візуалізація та дашборди' },
  { id: 'l10', n: 10, title: 'Аналітика та прогнозування' },
  { id: 'l11', n: 11, title: 'Білінг та ринок електроенергії' },
  { id: 'l12', n: 12, title: 'Кібербезпека систем обліку' },
  { id: 'l13', n: 13, title: 'Нормативна база України. Тренди' },
]

const LABS = [
  { id: 'lr1', n: 1, title: 'Опитування лічильника по Modbus' },
  { id: 'lr2', n: 2, title: 'Телеметрія через MQTT + Node-RED' },
  { id: 'lr3', n: 3, title: 'Читання DLMS/COSEM (OBIS)' },
  { id: 'lr4', n: 4, title: 'InfluxDB + Grafana дашборд' },
  { id: 'lr5', n: 5, title: 'Прогнозування споживання' },
  { id: 'lr6', n: 6, title: 'Тарифікація + захищеність каналу' },
]

export default function App() {
  const [active, setActive] = useState('l1')
  const Active = CONTENT[active]

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          Інформаційні системи обліку енергії
          <small>174 · Автоматизація, комп’ютерно-інтегровані технології (КІТ), робототехніка&nbsp;&nbsp;|&nbsp;&nbsp;141 · Електроенергетика</small>
        </div>

        <div className="nav-group">
          <h4>Лекції</h4>
          {LECTURES.map((l) => {
            const ready = !!CONTENT[l.id]
            return (
              <button
                key={l.id}
                className={`nav-item ${active === l.id ? 'active' : ''} ${ready ? '' : 'disabled'}`}
                onClick={() => ready && setActive(l.id)}
              >
                <span className="num">Л{l.n}</span>{l.title}
              </button>
            )
          })}
        </div>

        <div className="nav-group">
          <h4>Лабораторні</h4>
          {LABS.map((l) => (
            <button key={l.id} className="nav-item disabled">
              <span className="num">ЛР{l.n}</span>{l.title}
            </button>
          ))}
        </div>
      </aside>

      <main className="content">
        {Active && <Active />}
      </main>
    </div>
  )
}
