import { useState } from 'react'
import Lecture01 from './lectures/Lecture01.jsx'
import Lecture02 from './lectures/Lecture02.jsx'
import Lecture03 from './lectures/Lecture03.jsx'
import Lecture04 from './lectures/Lecture04.jsx'
import Lecture05 from './lectures/Lecture05.jsx'
import Lecture06 from './lectures/Lecture06.jsx'
import Lecture07 from './lectures/Lecture07.jsx'
import Lecture08 from './lectures/Lecture08.jsx'
import Lecture09 from './lectures/Lecture09.jsx'
import Lecture10 from './lectures/Lecture10.jsx'
import Lecture11 from './lectures/Lecture11.jsx'
import Lecture12 from './lectures/Lecture12.jsx'
import Lecture13 from './lectures/Lecture13.jsx'
import Lab01 from './labs/Lab01.jsx'
import Lab02 from './labs/Lab02.jsx'
import Lab03 from './labs/Lab03.jsx'
import Lab04 from './labs/Lab04.jsx'
import Lab05 from './labs/Lab05.jsx'
import Lab06 from './labs/Lab06.jsx'

// Реєстр вмісту: id → компонент. Готовий пункт = є в CONTENT.
const CONTENT = {
  l1: Lecture01,
  l2: Lecture02,
  l3: Lecture03,
  l4: Lecture04,
  l5: Lecture05,
  l6: Lecture06,
  l7: Lecture07,
  l8: Lecture08,
  l9: Lecture09,
  l10: Lecture10,
  l11: Lecture11,
  l12: Lecture12,
  l13: Lecture13,
  lr1: Lab01,
  lr2: Lab02,
  lr3: Lab03,
  lr4: Lab04,
  lr5: Lab05,
  lr6: Lab06,
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
  { id: 'lr2', n: 2, title: 'Читання DLMS/COSEM (OBIS)' },
  { id: 'lr3', n: 3, title: 'Телеметрія через MQTT + Node-RED' },
  { id: 'lr4', n: 4, title: 'Часовий ряд у SQLite + дашборд' },
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
          {LABS.map((l) => {
            const ready = !!CONTENT[l.id]
            return (
              <button
                key={l.id}
                className={`nav-item ${active === l.id ? 'active' : ''} ${ready ? '' : 'disabled'}`}
                onClick={() => ready && setActive(l.id)}
              >
                <span className="num">ЛР{l.n}</span>{l.title}
              </button>
            )
          })}
        </div>
      </aside>

      <main className="content">
        {Active && <Active />}
      </main>
    </div>
  )
}
