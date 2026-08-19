import { useState } from 'react'

// Shared self-check quiz. Pass `questions`: [{ q, opts: [{ t, ok }], ex }]
export default function Quiz({ questions, title = '✅ Самоперевірка' }) {
  const [picked, setPicked] = useState({})
  return (
    <div className="quiz">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {questions.map((item, qi) => (
        <div key={qi}>
          <div className="q">{item.q}</div>
          {item.opts.map((o, oi) => {
            const sel = picked[qi]
            let cls = 'opt'
            if (sel !== undefined) {
              if (oi === sel && o.ok) cls += ' correct'
              else if (oi === sel && !o.ok) cls += ' wrong'
              else if (o.ok) cls += ' correct'
            }
            return (
              <button key={oi} className={cls}
                onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}>
                {o.t}
              </button>
            )
          })}
          {picked[qi] !== undefined && <div className="explain">💡 {item.ex}</div>}
        </div>
      ))}
    </div>
  )
}
