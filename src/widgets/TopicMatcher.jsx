import { useMemo, useState } from 'react'

// MQTT topic-filter matcher: + = один рівень, # = будь-яка кількість (лише в кінці).
// Топіки, що починаються з $, не ловляться підпискою з wildcard на першому рівні.
export function topicMatches(filter, topic) {
  if (!filter || !topic) return false
  const f = filter.split('/')
  const t = topic.split('/')
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') {
      if (i === 0 && t[0].startsWith('$')) return false
      return true
    }
    if (i >= t.length) return false
    if (f[i] === '+') {
      if (i === 0 && t[0].startsWith('$')) return false
      continue
    }
    if (f[i] !== t[i]) return false
  }
  return f.length === t.length
}

// Топіки, які «публікують» лічильники — по них перевіряємо підписку.
const TOPICS = [
  'meters/007/energy',
  'meters/007/voltage',
  'meters/012/energy',
  'plant/line1/meters/007/power',
  '$SYS/broker/uptime',
]

export default function TopicMatcher() {
  const [filter, setFilter] = useState('meters/+/energy')
  const matched = useMemo(() => TOPICS.map((t) => [t, topicMatches(filter, t)]), [filter])
  const valid = /^[^#]*(#$)?$/.test(filter) && !/#.+/.test(filter) // # лише в кінці

  return (
    <div className="widget">
      <h3>🎯 Підписка на топіки (MQTT wildcards)</h3>
      <p className="hint">
        Топік — ієрархія рівнів через <code>/</code>. У підписці <code>+</code> замінює рівно один рівень,
        а <code>#</code> — будь-яку кількість рівнів (лише в кінці фільтра). Змініть фільтр і подивіться,
        які повідомлення лічильників його зловлять.
      </p>

      <div className="tabs">
        {['meters/+/energy', 'meters/007/#', 'meters/#', '+/+/energy', '#'].map((f) => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      <div className="field">
        <label>Фільтр підписки</label>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      {!valid && <p className="verdict bad">⛔ «#» дозволено лише як останній рівень фільтра (напр. meters/#).</p>}

      <table className="data">
        <thead>
          <tr><th>Опублікований топік</th><th>Ловиться?</th></tr>
        </thead>
        <tbody>
          {matched.map(([t, ok]) => (
            <tr key={t}>
              <td><code>{t}</code></td>
              <td>{ok ? '✅ так' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">
        Зверніть увагу: службові топіки <code>$SYS/#</code> не ловляться підпискою <code>#</code> чи <code>+</code> —
        їх треба запитувати явно.
      </p>
    </div>
  )
}
