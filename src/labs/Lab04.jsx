import Downsampler from '../widgets/Downsampler.jsx'

const INGEST = `# ingest.py — створює SQLite-схему й наповнює її добовим потоком показів.
# sqlite3 уже вбудований у Python — встановлювати нічого не треба.
import sqlite3, time, math, random

DB, METER, STEP, DAY = "readings.sqlite", "M007", 60, 24 * 3600   # семпл раз на хвилину

con = sqlite3.connect(DB)
con.executescript("""
CREATE TABLE IF NOT EXISTS readings(
    ts       INTEGER NOT NULL,   -- unix epoch, секунди
    meter_id TEXT    NOT NULL,
    power    REAL,               -- миттєва потужність, кВт
    energy   REAL,               -- накопичена енергія, кВт*год
    voltage  REAL
);
CREATE INDEX IF NOT EXISTS idx_readings_ts ON readings(ts);
""")

# генеруємо минулу добу; профіль потужності з ранковим (~8:00) і вечірнім (~20:00) піком
start = int(time.time()) - DAY
start -= start % STEP
energy = 100000.0                 # стартовий показ накопичувального регістра, кВт*год
rows = []
for ts in range(start, start + DAY, STEP):
    hour = (ts % DAY) / 3600
    base = 3 + 5 * math.exp(-((hour - 8) ** 2) / 4) + 6 * math.exp(-((hour - 20) ** 2) / 5)
    power = max(0.2, base + random.uniform(-0.6, 0.6))      # кВт
    energy += power * (STEP / 3600)                          # приріст енергії за крок
    rows.append((ts, METER, round(power, 3), round(energy, 3), round(230 + random.uniform(-4, 4), 1)))

con.executemany("INSERT INTO readings(ts, meter_id, power, energy, voltage) VALUES (?,?,?,?,?)", rows)
con.commit()
print(f"inserted {len(rows)} readings у {DB}")
con.close()
`

const QUERY = `# query.py — downsampling (GROUP BY по часу) і retention (DELETE старого).
import sqlite3, datetime

con = sqlite3.connect("readings.sqlite")

# --- Downsampling: сирі хвилинні семпли -> погодинні агрегати ---
# (ts/3600)*3600 округлює час донизу до початку години -> це і є "часовий бакет".
print("=== Погодинний профіль ===")
q = """
SELECT (ts/3600)*3600                      AS bucket,
       COUNT(*)                            AS n,
       ROUND(AVG(power), 2)                AS avg_kw,
       ROUND(MAX(power), 2)                AS max_kw,
       ROUND(MAX(energy) - MIN(energy), 2) AS kwh   -- приріст накопич. регістра за годину
FROM readings
WHERE meter_id = 'M007'
GROUP BY bucket
ORDER BY bucket
"""
for bucket, n, avg_kw, max_kw, kwh in con.execute(q):
    hh = datetime.datetime.fromtimestamp(bucket).strftime("%d.%m %H:%M")
    print(f"{hh}  n={n:3d}  avg={avg_kw:5.2f}  max={max_kw:5.2f}  spent={kwh:5.2f} кВт*год")

total = con.execute("SELECT ROUND(MAX(energy)-MIN(energy),2) FROM readings WHERE meter_id='M007'").fetchone()[0]
print("Разом за добу, кВт*год:", total)

# перевіримо, що індекс за часом реально використовується
print("\\nПлан запиту за діапазоном часу:")
for r in con.execute("EXPLAIN QUERY PLAN SELECT * FROM readings WHERE ts BETWEEN 0 AND 9999999999"):
    print(" ", r[-1])

# --- Retention: прибрати сирі дані старші за 30 діб (тут дані свіжі -> 0 рядків) ---
cur = con.execute("DELETE FROM readings WHERE ts < strftime('%s','now','-30 days')")
print("retention: видалено старих рядків:", cur.rowcount)
con.commit(); con.close()
`

const DASHBOARD = `# dashboard.py — читає агрегати із SQLite і будує інтерактивний HTML-дашборд.
# pip install plotly    (жодного сервера — результат це один .html файл)
import sqlite3, datetime, webbrowser, os
import plotly.graph_objects as go
from plotly.subplots import make_subplots

con = sqlite3.connect("readings.sqlite")
rows = con.execute("""
    SELECT (ts/3600)*3600 AS bucket,
           AVG(power) AS avg_p, MAX(power) AS max_p,
           MAX(energy) - MIN(energy) AS kwh
    FROM readings WHERE meter_id = 'M007'
    GROUP BY bucket ORDER BY bucket
""").fetchall()
con.close()

t     = [datetime.datetime.fromtimestamp(r[0]) for r in rows]
avg_p = [r[1] for r in rows]
max_p = [r[2] for r in rows]
kwh   = [r[3] for r in rows]

fig = make_subplots(rows=2, cols=1, shared_xaxes=True,
    subplot_titles=("Потужність за годину (avg / max), кВт", "Спожита енергія за годину, кВт*год"))
fig.add_trace(go.Scatter(x=t, y=avg_p, name="avg",       mode="lines+markers"), row=1, col=1)
fig.add_trace(go.Scatter(x=t, y=max_p, name="max (пік)", mode="lines"),         row=1, col=1)
fig.add_trace(go.Bar(x=t, y=kwh, name="кВт*год"),                               row=2, col=1)
fig.update_layout(title="Дашборд обліку — лічильник M007", height=720, hovermode="x unified")

out = os.path.abspath("dashboard.html")
fig.write_html(out)
print("saved:", out, "| годин:", len(rows), "| разом кВт*год:", round(sum(kwh), 2))
webbrowser.open("file://" + out)
`

export default function Lab04() {
  return (
    <article>
      <div className="kicker">Лабораторна робота 4</div>
      <h1>Часовий ряд у SQLite + дашборд</h1>

      <div className="lab-meta">
        <div><b>Зв’язок з лекцією</b>Лекція 8 — Бази даних та часові ряди</div>
        <div><b>Інструменти</b>Python (sqlite3 — вбудований), Plotly</div>
        <div><b>Тривалість</b>2–3 год (+ захист 20–30 хв)</div>
        <div><b>Стенд</b>не потрібен — усе на ПК, без серверів</div>
      </div>

      <div className="goals">
        <b>Мета роботи</b>
        <ul>
          <li>Спроєктувати схему зберігання часового ряду показів і наповнити її потоком даних у SQLite.</li>
          <li>Застосувати downsampling (<code>GROUP BY</code> по часу), індекс за часом і retention (<code>DELETE</code>).</li>
          <li>Побудувати інтерактивний дашборд обліку в Python (Plotly) без встановлення серверів БД чи візуалізації.</li>
        </ul>
      </div>

      <div className="callout">
        <b>Чому SQLite, а не InfluxDB?</b> <code>sqlite3</code> уже входить у стандартну бібліотеку Python — нічого
        не встановлювати, ідеально для роботи «без стенда». А ви вже знаєте SQL. Уся суть часових рядів тут та сама:
        схема з часом, індекс, проріджування, retention. Перенести це згодом на InfluxDB чи TimescaleDB — питання
        синтаксису, а не ідеї (пор. Лекція 8). Повноцінну <b>Grafana</b> розберемо в Лекції 9.
      </div>

      <h2>Хід роботи</h2>
      <ol className="steps">
        <li>
          <b>Схема та інжест.</b> Створіть <code>ingest.py</code> — він оголошує таблицю <code>readings</code> з
          індексом за часом і наповнює її добовим потоком (1440 семплів по хвилині):
          <pre className="code"><code>{INGEST}</code></pre>
          Запустіть і перевірте результат прямо з консолі:
          <pre className="code"><code>{`python ingest.py\npython -c "import sqlite3;print(sqlite3.connect('readings.sqlite').execute('SELECT COUNT(*),MIN(ts),MAX(ts) FROM readings').fetchone())"`}</code></pre>
          У звіт: чому <code>ts</code> зберігаємо як число (epoch), навіщо окремий <b>індекс за часом</b> і чому
          <code> energy</code> — накопичувальний регістр, а не приріст.
        </li>
        <li>
          <b>Downsampling + retention.</b> Створіть <code>query.py</code>: він згортає хвилинні семпли в погодинний
          профіль і показує план запиту та retention-видалення:
          <pre className="code"><code>{QUERY}</code></pre>
          Поясніть у звіті вираз <code>(ts/3600)*3600</code> як «часовий бакет», різницю <b>avg</b> і <b>max</b> у
          пікові години та навіщо потрібне <code>MAX(energy)-MIN(energy)</code>. У плані запиту знайдіть, що
          використано <code>idx_readings_ts</code> (а не повний скан).
        </li>
        <li>
          <b>Погра́йтесь із проріджуванням</b> у віджеті нижче — той самий <code>GROUP BY</code> по часу, лише
          інтерактивно. Підберіть бакет, за якого добовий профіль лишається читабельним, але піки ще не «з’їдаються».
          <Downsampler />
        </li>
        <li>
          <b>Дашборд.</b> Встановіть Plotly (<code>pip install plotly</code>) і створіть <code>dashboard.py</code> —
          він читає агрегати й генерує <b>інтерактивний</b> <code>dashboard.html</code> (масштаб, hover, легенда),
          що відкривається у браузері без жодного сервера:
          <pre className="code"><code>{DASHBOARD}</code></pre>
          У звіт — скріншот дашборда з підписаними ранковим і вечірнім піками.
        </li>
        <li>
          <b>Масштаб і cardinality.</b> Додайте в <code>ingest.py</code> другий лічильник (<code>M008</code> зі своїм
          профілем) і переконайтесь, що запити з <code>WHERE meter_id=? GROUP BY bucket</code> досі коректні. Поясніть
          у звіті: чому <code>meter_id</code> — гарний кандидат у індекс/тег, а <code>ts</code> у ролі тега був би
          катастрофою (див. cardinality, Лекція 8).
        </li>
      </ol>

      <h2>Питання до захисту</h2>
      <ol>
        <li>Чим часовий ряд відрізняється від типових OLTP-даних і як це вплинуло на вашу схему <code>readings</code>?</li>
        <li>Що робить вираз <code>(ts/3600)*3600</code> і як би ви змінили його на 15-хвилинний бакет?</li>
        <li>Навіщо індекс за <code>ts</code>? Що показав <code>EXPLAIN QUERY PLAN</code> з ним і що було б без нього?</li>
        <li>Чому енергію рахуємо як <code>MAX(energy)-MIN(energy)</code> у бакеті, а потужність — через <code>AVG</code>/<code>MAX</code>?</li>
        <li>Що таке downsampling і retention та як вони разом стримують ріст обсягу? Наведіть приклад політики для добових показів.</li>
        <li>Що таке cardinality й чому не можна класти високоунікальні значення в індексовані теги?</li>
      </ol>

      <h2>Формат звіту</h2>
      <div className="callout">
        <b>Звіт (1–2 стор.):</b> тема й мета · <code>.schema</code> таблиці й пояснення полів · лістинги
        <code> ingest.py</code> / <code>query.py</code> / <code>dashboard.py</code> · вивід погодинного профілю ·
        план запиту з підтвердженням індексу · <b>скріншот дашборда</b> Plotly з підписаними піками · короткий
        коментар про downsampling/retention/cardinality · висновок: роль historian у архітектурі АСКОЕ.
      </div>

      <p className="footer-note">
        📊 Далі — <b>Лекція 9 (Візуалізація та дашборди)</b>: принципи хороших дашбордів обліку і промислова
        <b> Grafana</b> поверх сховища часових рядів, яке ви щойно наповнили.
      </p>
    </article>
  )
}
