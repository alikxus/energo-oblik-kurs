import TopicMatcher from '../widgets/TopicMatcher.jsx'

const PUBLISHER = `# meter_pub.py — імітатор лічильника: публікує телеметрію в MQTT (paho-mqtt 2.x)
# pip install paho-mqtt
import json, time, random
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion

BROKER, PORT = "localhost", 1883      # або "test.mosquitto.org" для публічного брокера
METER = "007"
BASE = f"meters/{METER}"

cli = mqtt.Client(CallbackAPIVersion.VERSION2, client_id=f"pub-{METER}")
# Last Will: якщо видавець нештатно відпаде — брокер сповістить підписників
cli.will_set(f"{BASE}/status", payload="offline", qos=1, retain=True)
cli.connect(BROKER, PORT, keepalive=30)
cli.loop_start()

# retained: новий підписник одразу побачить, що лічильник онлайн
cli.publish(f"{BASE}/status", "online", qos=1, retain=True)

energy = 1234567          # Вт·год, накопичувальний
try:
    while True:
        energy += random.randint(1, 5)
        payload = {
            "meter": METER,
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "voltage": round(230 + random.uniform(-3, 3), 1),
            "current": round(random.uniform(4, 12), 2),
            "power": round(random.uniform(1000, 2600)),
            "energy": energy,
        }
        # миттєві величини — QoS 0 (часті, втрата не критична)
        cli.publish(f"{BASE}/telemetry", json.dumps(payload), qos=0)
        # розрахунковий показ енергії — QoS 2 (для білінгу дубль недопустимий)
        cli.publish(f"{BASE}/energy", json.dumps({"energy": energy, "ts": payload["ts"]}), qos=2)
        print("published:", payload)
        time.sleep(2)
except KeyboardInterrupt:
    cli.publish(f"{BASE}/status", "offline", qos=1, retain=True)
    cli.loop_stop(); cli.disconnect()
`

const SUBSCRIBER = `# meter_sub.py — підписник: ловить телеметрію всіх лічильників (paho-mqtt 2.x)
import json
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion

def on_connect(client, userdata, flags, reason_code, properties):
    print("connected:", reason_code)
    client.subscribe("meters/+/telemetry", qos=0)   # + = будь-який лічильник
    client.subscribe("meters/+/status", qos=1)

def on_message(client, userdata, msg):
    if msg.topic.endswith("/status"):
        print(f"[STATUS] {msg.topic} -> {msg.payload.decode()}")
        return
    d = json.loads(msg.payload)
    print(f"[{d['ts']}] лічильник {d['meter']}: "
          f"U={d['voltage']} В  P={d['power']} Вт  E={d['energy']} Вт·год")

cli = mqtt.Client(CallbackAPIVersion.VERSION2, client_id="sub-dashboard")
cli.on_connect = on_connect
cli.on_message = on_message
cli.connect("localhost", 1883, 30)
cli.loop_forever()
`

const NODERED = `[
  {"id":"mqtt_in","type":"mqtt in","name":"meters/+/telemetry","topic":"meters/+/telemetry","qos":"0","broker":"broker_cfg","x":150,"y":100,"wires":[["json_node"]]},
  {"id":"json_node","type":"json","name":"parse JSON","x":330,"y":100,"wires":[["fn_power","dbg"]]},
  {"id":"fn_power","type":"function","name":"msg.payload = power","func":"msg.payload = msg.payload.power;\\nreturn msg;","outputs":1,"x":520,"y":100,"wires":[["gauge_power"]]},
  {"id":"gauge_power","type":"ui_gauge","name":"Потужність","label":"P, Вт","min":0,"max":3000,"x":720,"y":100,"wires":[]},
  {"id":"dbg","type":"debug","name":"telemetry","active":true,"x":520,"y":160,"wires":[]},
  {"id":"broker_cfg","type":"mqtt-broker","name":"localhost","broker":"localhost","port":"1883","keepalive":"30"}
]`

export default function Lab03() {
  return (
    <article>
      <div className="kicker">Лабораторна робота 3</div>
      <h1>Телеметрія через MQTT + Node-RED</h1>

      <div className="lab-meta">
        <div><b>Зв’язок з лекцією</b>Лекція 6 — MQTT та IoT-обмін</div>
        <div><b>Інструменти</b>Mosquitto, Python (paho-mqtt), Node-RED</div>
        <div><b>Тривалість</b>2–3 год (+ захист 20–30 хв)</div>
        <div><b>Стенд</b>не потрібен — усе на ПК</div>
      </div>

      <div className="goals">
        <b>Мета роботи</b>
        <ul>
          <li>Підняти брокер MQTT і реалізувати обмін publish/subscribe між Python-клієнтами.</li>
          <li>Застосувати на практиці QoS, retained та Last Will для телеметрії обліку.</li>
          <li>Побудувати обробку потоку й дашборд у Node-RED без написання коду.</li>
        </ul>
      </div>

      <div className="callout">
        <b>Брокер.</b> Локально: <code>mosquitto</code> (Windows-інсталятор або <code>docker run -p 1883:1883 eclipse-mosquitto</code>).
        Якщо локально не вдається — використайте публічний <code>test.mosquitto.org:1883</code> (тоді додайте
        унікальний префікс до топіків, напр. <code>lab3-ІВАНОВ/meters/...</code>, щоб не змішатися з чужим трафіком).
      </div>

      <h2>Хід роботи</h2>
      <ol className="steps">
        <li>
          <b>Брокер.</b> Запустіть Mosquitto й перевірте його штатними утилітами у двох терміналах:
          <pre className="code"><code>{`mosquitto_sub -h localhost -t "meters/#" -v\nmosquitto_pub -h localhost -t "meters/007/energy" -m "1234567"`}</code></pre>
          Переконайтесь, що підписник побачив повідомлення. Поясніть у звіті роль брокера.
        </li>
        <li>
          <b>Видавець.</b> Створіть <code>meter_pub.py</code> — імітатор лічильника, що публікує телеметрію
          (миттєві — QoS 0, енергію — QoS 2, статус — retained + LWT):
          <pre className="code"><code>{PUBLISHER}</code></pre>
        </li>
        <li>
          <b>Підписник.</b> Створіть <code>meter_sub.py</code> і запустіть його <b>першим</b>, потім видавця.
          Зверніть увагу: підписка <code>meters/+/telemetry</code> ловить будь-який лічильник.
          <pre className="code"><code>{SUBSCRIBER}</code></pre>
          <p className="hint">Перевірте retained: підпишіться на <code>meters/007/status</code> уже ПІСЛЯ старту видавця —
            і ви одразу отримаєте <code>online</code>, хоча публікація була раніше.</p>
        </li>
        <li>
          <b>Wildcards.</b> Погравшись у декодері нижче, підберіть підписку, яка ловить телеметрію всіх лічильників,
          але не статуси. Обґрунтуйте вибір <code>+</code> проти <code>#</code>.
        </li>
        <li>
          <b>Node-RED.</b> Встановіть (<code>npm i -g node-red</code>), запустіть (<code>node-red</code> → http://localhost:1880),
          додайте палітру <code>node-red-dashboard</code>. Імпортуйте потік (Menu → Import) і вкажіть свій брокер:
          <pre className="code"><code>{NODERED}</code></pre>
          Розгорніть (Deploy) і відкрийте дашборд <code>/ui</code> — стрілковий індикатор має показувати потужність у
          реальному часі, поки працює <code>meter_pub.py</code>.
        </li>
        <li>
          <b>Last Will.</b> Зупиніть видавця <b>жорстко</b> (закрийте термінал, а не Ctrl+C). Переконайтесь, що
          підписник <code>meters/+/status</code> отримав <code>offline</code> від брокера (спрацював LWT), і поясніть,
          навіщо це в системі обліку.
        </li>
      </ol>

      <TopicMatcher />

      <h2>Питання до захисту</h2>
      <ol>
        <li>Чим publish/subscribe принципово відрізняється від опитування Modbus/DLMS? Яку проблему масштабування вирішує брокер?</li>
        <li>Чому в коді миттєві величини йдуть QoS 0, а енергія — QoS 2? Що станеться з білінгом при дублі QoS 1?</li>
        <li>Що таке retained-повідомлення і як ви це продемонстрували зі <code>status</code>?</li>
        <li>Як працює Last Will і чим він корисний для діагностики «відпаду» лічильника?</li>
        <li>Поясніть різницю підписок <code>meters/+/telemetry</code>, <code>meters/#</code> та <code>#</code> на ваших топіках.</li>
      </ol>

      <h2>Формат звіту</h2>
      <div className="callout">
        <b>Звіт (1–2 стор.):</b> тема й мета · схема обміну (видавець → брокер → підписник/Node-RED) · лістинги
        <code> meter_pub.py</code> / <code>meter_sub.py</code> зі скріншотом виводу · таблиця «топік → QoS → чому» ·
        скріншот дашборда Node-RED · демонстрація retained і LWT (що спостерігали) · висновок: коли MQTT доповнює
        польові протоколи в архітектурі АСКОЕ.
      </div>

      <p className="footer-note">
        🔌 Наступний крок курсу — <b>Лекція 7 (OPC UA та SCADA)</b>: промисловий стандарт інтеграції з єдиним
        інформаційним простором і моделлю даних, та його місце поряд з MQTT.
      </p>
    </article>
  )
}
