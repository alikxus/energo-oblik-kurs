import LoadForecast from '../widgets/LoadForecast.jsx'

const GEN = `# gen.py — синтезує 21 добу погодинного навантаження з добовою+тижневою сезонністю у load.csv.
# Лише стандартна бібліотека (csv, math, random) — встановлювати нічого не треба.
import csv, math, random, time

random.seed(42)
DAYS, STEP = 21, 3600                       # погодинні семпли
# добовий профіль, кВт (ніч-провал -> вечірній пік)
BASE = [42,38,36,35,37,45,58,70,78,82,80,79,77,76,74,75,80,88,95,92,84,72,58,48]
start = int(time.time()) - DAYS * 24 * STEP
start -= start % STEP

rows = []
for d in range(DAYS):
    dow = d % 7
    wfac = 0.85 if dow >= 5 else 1.0        # вихідні нижче
    trend = 1 + 0.003 * d                    # легкий ріст
    for h in range(24):
        ts = start + (d * 24 + h) * STEP
        kw = BASE[h] * wfac * trend + random.gauss(0, 2.0)
        rows.append((ts, round(max(1.0, kw), 2)))

with open("load.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["ts", "kw"]); w.writerows(rows)
print(f"gen: {len(rows)} годин у load.csv")
`

const FORECAST = `# forecast.py — базлайни STLF і метрики похибки на відкладеній вибірці (останні 2 доби). Лише stdlib.
import csv, math

with open("load.csv") as f:
    rows = list(csv.DictReader(f))
y = [float(r["kw"]) for r in rows]
N, H = len(y), 48                            # тест = останні 48 год
test_idx = range(N - H, N)

def predict(method, i):                      # i — глобальний індекс години
    if method == "persist": return y[N - H - 1]           # остання відома, повторена
    if method == "snaive":  return y[i - 24]              # той самий час учора
    if method == "wnaive":  return y[i - 168]             # той самий час тиждень тому
    if method == "ma3":     return sum(y[i - 24*k] for k in (1,2,3)) / 3  # сер. години за 3 доби
    raise ValueError(method)

def metrics(method):
    ae = ape = se = 0.0
    for i in test_idx:
        p, a = predict(method, i), y[i]
        ae += abs(a - p); se += (a - p) ** 2
        if a: ape += abs((a - p) / a)
    return ape / H * 100, ae / H, math.sqrt(se / H)   # MAPE %, MAE, RMSE

print(f"{'метод':<10}{'MAPE %':>9}{'MAE кВт':>10}{'RMSE':>9}")
best = None
for m in ("persist", "snaive", "wnaive", "ma3"):
    mape, mae, rmse = metrics(m)
    print(f"{m:<10}{mape:9.2f}{mae:10.2f}{rmse:9.2f}")
    if best is None or mape < best[1]: best = (m, mape)
print("найкращий базлайн:", best[0], f"({best[1]:.2f}% MAPE)")
`

const PLOT = `# plot.py — факт проти обраного базлайна на тестовому вікні (Plotly, один .html без сервера).
# pip install plotly
import csv, datetime, os, webbrowser
import plotly.graph_objects as go

METHOD = "wnaive"    # спробуйте persist / snaive / wnaive / ma3

with open("load.csv") as f:
    rows = list(csv.DictReader(f))
ts = [datetime.datetime.fromtimestamp(int(r["ts"])) for r in rows]
y  = [float(r["kw"]) for r in rows]
N, H = len(y), 48

def predict(i):
    if METHOD == "persist": return y[N - H - 1]
    if METHOD == "snaive":  return y[i - 24]
    if METHOD == "wnaive":  return y[i - 168]
    if METHOD == "ma3":     return sum(y[i - 24*k] for k in (1,2,3)) / 3

pred = [predict(i) for i in range(N - H, N)]

fig = go.Figure()
fig.add_trace(go.Scatter(x=ts, y=y, name="факт", mode="lines", line=dict(color="#8794a6")))
fig.add_trace(go.Scatter(x=ts[N-H:], y=pred, name=f"прогноз ({METHOD})",
                         mode="lines", line=dict(color="#3b6ea5", dash="dash")))
fig.add_vline(x=ts[N-H], line_dash="dot", line_color="#c9d2dc")
fig.update_layout(title=f"STLF — факт vs {METHOD}", hovermode="x unified", height=480)

out = os.path.abspath("forecast.html")
fig.write_html(out); print("saved:", out)
webbrowser.open("file://" + out)
`

export default function Lab05() {
  return (
    <article>
      <div className="kicker">Лабораторна робота 5</div>
      <h1>Прогнозування споживання</h1>

      <div className="lab-meta">
        <div><b>Зв’язок з лекцією</b>Лекція 10 — Аналітика та прогнозування</div>
        <div><b>Інструменти</b>Python (csv/math — вбудовані), Plotly</div>
        <div><b>Тривалість</b>2–3 год (+ захист 20–30 хв)</div>
        <div><b>Стенд</b>не потрібен — усе на ПК, без серверів</div>
      </div>

      <div className="goals">
        <b>Мета роботи</b>
        <ul>
          <li>Підготувати ряд погодинного навантаження з добовою й тижневою сезонністю та розбити його на train/test.</li>
          <li>Реалізувати наївні базлайни прогнозу (persistence, сезонний і тижневий наївний, ковзне середнє) та оцінити їх MAPE/MAE/RMSE.</li>
          <li>Зрозуміти, чому будь-яку «розумну» модель порівнюють із базлайном, і візуалізувати прогноз проти факту.</li>
        </ul>
      </div>

      <div className="callout">
        <b>Ідея роботи.</b> Прогноз навантаження починається не з ML, а з <b>базлайнів</b>. Ви згенеруєте реалістичний
        ряд, відкладете останні 2 доби як тест і побачите на числах головну істину STLF: <b>сезонний/тижневий наївний</b>
        уже дає малу похибку, і складна модель має сенс лише якщо його <i>перемагає</i>. Жодних важких залежностей —
        усе на стандартній бібліотеці Python.
      </div>

      <h2>Хід роботи</h2>
      <ol className="steps">
        <li>
          <b>Дані.</b> Створіть <code>gen.py</code> — він синтезує 21 добу погодинного навантаження (504 значення) з
          добовим профілем, зниженням у вихідні та легким трендом і зашумленням:
          <pre className="code"><code>{GEN}</code></pre>
          <pre className="code"><code>{`python gen.py`}</code></pre>
          У звіт: чому в ряду є <b>кілька сезонностей</b> (доба, тиждень) і як це впливає на вибір базлайна. За бажання —
          замініть синтетику на відкритий датасет навантаження (напр. з Kaggle/ENTSO-E), звівши його до тих самих колонок.
        </li>
        <li>
          <b>Базлайни й метрики.</b> Створіть <code>forecast.py</code> — відкладає останні 48 год як тест і рахує чотири
          базлайни та їх похибки:
          <pre className="code"><code>{FORECAST}</code></pre>
          <pre className="code"><code>{`python forecast.py`}</code></pre>
          У звіт — таблицю метрик. Поясніть: чому <b>persistence</b> найгірший; чому тут <b>тижневий наївний</b>
          (t−168) б’є добовий (t−24); що показують MAE (кВт) і RMSE, чого не показує MAPE. Чому оцінюємо <b>лише</b> на
          відкладеній вибірці, а не на всьому ряду?
        </li>
        <li>
          <b>Погра́йтесь із базлайнами</b> у віджеті нижче: перемикайте метод і дивіться, як змінюються крива прогнозу
          й MAPE. Зверніть увагу, як ковзне середнє гасить коливання порівняно з наївним.
          <LoadForecast />
        </li>
        <li>
          <b>Візуалізація.</b> Встановіть Plotly (<code>pip install plotly</code>) і створіть <code>plot.py</code> — він
          будує факт проти обраного базлайна на тестовому вікні в інтерактивному <code>forecast.html</code>:
          <pre className="code"><code>{PLOT}</code></pre>
          Побудуйте графік для двох різних методів (напр. <code>snaive</code> і <code>wnaive</code>) і у звіт — скріншоти
          з коментарем, де саме прогноз «промахується» (підказка: пікові години, перехід будні→вихідні).
        </li>
        <li>
          <b>Крок до моделі.</b> Запропонуйте (текстом або кодом) одне <b>покращення</b> над найкращим базлайном:
          додати календарну ознаку (вихідний/свято), усереднити тижневий наївний за 2–3 тижні, або ввести поправку на
          тренд. Оцініть його тим самим <code>forecast.py</code> і зробіть висновок: <b>перемогли</b> базлайн чи ні.
        </li>
      </ol>

      <h2>Питання до захисту</h2>
      <ol>
        <li>Що таке train/test split і чому не можна оцінювати прогноз на даних, на яких «навчались»?</li>
        <li>Які сезонності є у вашому ряду і як кожна відображена в базлайнах (t−24, t−168)?</li>
        <li>Чим відрізняються MAPE, MAE і RMSE? Коли MAPE оманливий (підказка: малі значення факту)?</li>
        <li>Чому сезонний/тижневий наївний — сильний орієнтир, і що означає «побити базлайн»?</li>
        <li>Навіщо реальні STLF-моделі використовують погоду та календар? Наведіть приклад ознаки.</li>
        <li>Де у вашому прогнозі найбільша похибка і чому саме там вона найдорожча для планування закупівлі?</li>
      </ol>

      <h2>Формат звіту</h2>
      <div className="callout">
        <b>Звіт (1–2 стор.):</b> тема й мета · опис ряду й сезонностей · лістинги <code>gen.py</code> /
        <code> forecast.py</code> / <code>plot.py</code> · <b>таблиця MAPE/MAE/RMSE</b> для всіх базлайнів із висновком
        про найкращий · <b>скріншоти</b> факт vs прогноз для двох методів · опис і оцінка вашого покращення (побили
        базлайн чи ні) · висновок: місце прогнозу в плануванні закупівлі та балансі (зв’язок з ринком — Лекція 11).
      </div>

      <p className="footer-note">
        💵 Далі — <b>Лекція 11 (Білінг та ринок електроенергії)</b>: як спрогнозоване й обліковане споживання
        перетворюється на гроші — тарифи, зони, розрахунки й роль на ринку.
      </p>
    </article>
  )
}
