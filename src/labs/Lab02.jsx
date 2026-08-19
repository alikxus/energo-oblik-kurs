import ObisDecoder from '../widgets/ObisDecoder.jsx'

const DECODER = `# dlms_decode.py — розбір DLMS GET-response APDU і OBIS (без стенда)
import struct

# Теги типів даних DLMS (A-XDR)
UINT32, UINT16, INT8, ENUM, STRUCT = 0x06, 0x12, 0x0F, 0x16, 0x02
# Одиниці виміру DLMS (enum), лише потрібні для лаби
UNIT = {27: "Вт", 30: "Вт·год", 33: "А", 35: "В", 44: "Гц"}

def parse_value(b, i=0):
    tag = b[i]; i += 1
    if tag == UINT32: return struct.unpack(">I", b[i:i+4])[0], i+4
    if tag == UINT16: return struct.unpack(">H", b[i:i+2])[0], i+2
    if tag == INT8:   return struct.unpack(">b", b[i:i+1])[0], i+1
    if tag == ENUM:   return b[i], i+1
    raise ValueError(f"непідтриманий тег 0x{tag:02X}")

def get_response_value(hexstr):
    b = bytes.fromhex(hexstr.replace(" ", ""))
    assert b[0] == 0xC4, "не GET-response"
    assert b[1] == 0x01, "не GET-response-normal"
    # b[2] = invoke-id-and-priority; b[3] = result: 0 = data (успіх)
    assert b[3] == 0x00, "доступ відхилено (result != data)"
    val, _ = parse_value(b, 4)
    return val

def scaler_unit(hexstr):
    b = bytes.fromhex(hexstr.replace(" ", ""))
    assert b[4] == STRUCT and b[5] == 0x02, "не структура з 2 елементів"
    scaler, i = parse_value(b, 6)   # INT8
    unit, _   = parse_value(b, i)   # ENUM
    return scaler, unit

def obis(hexstr):
    return ".".join(str(x) for x in bytes.fromhex(hexstr.replace(" ", "")))

if __name__ == "__main__":
    # 1) Активна енергія A+ (Register uint32), OBIS 1.0.1.8.0.255
    e = get_response_value("C4 01 C1 00 06 00 12 D6 87")
    print(f"{obis('01 00 01 08 00 FF'):>16}  E = {e} Вт·год")

    # 2) Напруга L1: сире value (uint16) + scaler_unit, OBIS 1.0.32.7.0.255
    raw = get_response_value("C4 01 C1 00 12 09 01")
    sc, un = scaler_unit("C4 01 C1 00 02 02 0F FF 16 23")
    volts = raw * (10 ** sc)
    print(f"{obis('01 00 20 07 00 FF'):>16}  U = {raw} x10^{sc} = {volts} {UNIT[un]}")
`

const GURUX = `# extension.py — те саме через бібліотеку Gurux (для порівняння)
# pip install gurux-dlms
from gurux_dlms import GXDLMSTranslator
tr = GXDLMSTranslator()
# Той самий APDU активної енергії -> читабельний XML
print(tr.pduToXml("C40101C1000600 12 D6 87".replace(" ", "")))
`

export default function Lab02() {
  return (
    <article>
      <div className="kicker">Лабораторна робота 2</div>
      <h1>Читання DLMS/COSEM (OBIS)</h1>

      <div className="lab-meta">
        <div><b>Зв’язок з лекцією</b>Лекція 5 — DLMS/COSEM</div>
        <div><b>Інструменти</b>Python 3, gurux-dlms (розширення)</div>
        <div><b>Тривалість</b>2–3 год (+ захист 20–30 хв)</div>
        <div><b>Стенд</b>не потрібен — усе на ПК</div>
      </div>

      <div className="goals">
        <b>Мета роботи</b>
        <ul>
          <li>Розібрати реальні DLMS GET-response APDU «по байтах»: тег сервісу, тип даних, значення.</li>
          <li>Застосувати модель Register: value + scaler_unit → фізична величина з одиницею.</li>
          <li>Декодувати OBIS-коди й пов’язати їх із COSEM-об’єктами; звірити результат бібліотекою Gurux.</li>
        </ul>
      </div>

      <div className="callout">
        <b>Що дано.</b> Три APDU, вже звільнені від HDLC/шифрування (як після association):<br />
        • Активна енергія A+ &nbsp;(OBIS <code>1.0.1.8.0.255</code>): <code>C4 01 C1 00 06 00 12 D6 87</code><br />
        • Напруга L1 — value &nbsp;(OBIS <code>1.0.32.7.0.255</code>): <code>C4 01 C1 00 12 09 01</code><br />
        • Напруга L1 — scaler_unit: <code>C4 01 C1 00 02 02 0F FF 16 23</code>
      </div>

      <h2>Хід роботи</h2>
      <ol className="steps">
        <li>
          Розберіть структуру GET-response вручну на папері: <code>C4</code> — GET-response, <code>01</code> —
          normal, далі invoke-id, <code>00</code> — result=data, потім <b>тег типу</b> й значення. Знайдіть у
          першому APDU тег <code>06</code> (double-long-unsigned, uint32) і 4 байти значення.
        </li>
        <li>
          Створіть <code>dlms_decode.py</code> — мінімальний парсер A-XDR і запустіть його:
          <pre className="code"><code>{DECODER}</code></pre>
          <p className="hint">Очікуваний вивід: E = 1234567 Вт·год; U = 2305 ×10⁻¹ = 230.5 В.</p>
        </li>
        <li>
          <b>Модель Register.</b> Поясніть у звіті, чому напруга передається двома зверненнями: атрибут
          <code> value</code> (сире ціле 2305) і атрибут <code>scaler_unit</code> (масштаб −1, одиниця «V»). Порівняйте
          з Modbus, де масштаб треба знати з документації.
        </li>
        <li>
          <b>OBIS.</b> Декодуйте всі три OBIS-коди в <code>dlms_decode.py</code> (функція <code>obis()</code>) і
          розпишіть значення груп A-B:C.D.E*F. Перевірте себе в декодері нижче.
        </li>
        <li>
          <b>Розширення (Gurux).</b> Встановіть <code>pip install gurux-dlms</code> і переконайтесь, що бібліотека
          дає той самий результат — переклад APDU у XML:
          <pre className="code"><code>{GURUX}</code></pre>
          <p className="hint">Якщо gurux не встановлюється у вашому середовищі — цей крок необов’язковий; основний
            результат дає власний парсер із кроку 2. Порівняйте поля XML (GetResponse, DoubleLongUnsigned) зі своїм розбором.</p>
        </li>
        <li>
          <b>Помилка доступу.</b> Змініть у першому APDU байт result з <code>00</code> на <code>01</code>
          (<code>C4 01 C1 01 …</code>) і запустіть парсер. Зафіксуйте, як спрацьовує перевірка «доступ відхилено», і
          поясніть, чому в DLMS результат читання може бути помилкою доступу, а не лише даними.
        </li>
      </ol>

      <ObisDecoder />

      <h2>Питання до захисту</h2>
      <ol>
        <li>Чим об’єктна модель COSEM принципово відрізняється від адресації регістрів Modbus? Наведіть приклад на своєму APDU.</li>
        <li>Розшифруйте OBIS <code>1.0.1.8.0.255</code> і <code>1.0.32.7.0.255</code> по групах. Що змінить D=6 замість D=8?</li>
        <li>Об’єкт якого інтерфейсного класу зберігає напругу, а якого — навантажувальний профіль? Які їх ключові атрибути?</li>
        <li>Навіщо перед GET потрібна association (AARQ/AARE) і що на ній узгоджується?</li>
        <li>value=2305, scaler_unit=(−1, V). Яке реальне значення і чому DLMS відділяє value від scaler_unit?</li>
      </ol>

      <h2>Формат звіту</h2>
      <div className="callout">
        <b>Звіт (1–2 стор.):</b> тема й мета · побайтовий розбір одного GET-response APDU (з підписами полів) ·
        лістинг <code>dlms_decode.py</code> та його вивід · таблиця декодованих OBIS-кодів (A-B:C.D.E*F → зміст) ·
        результат моделі Register (value × 10^scaler = величина) · порівняння з виводом Gurux (якщо виконано крок 5) ·
        експеримент із result=помилка (крок 6) · висновок: переваги самоописної моделі COSEM для «розумного» обліку.
      </div>

      <p className="footer-note">
        📡 Наступний крок курсу — <b>Лекція 6 (MQTT та IoT-обмін)</b>: як дані обліку передають у хмару за
        publish/subscribe-моделлю, і чим це доповнює польові протоколи Modbus та DLMS.
      </p>
    </article>
  )
}
