import RegisterDecoder from '../widgets/RegisterDecoder.jsx'

const SERVER = `# meter_server.py — емулятор лічильника (Modbus TCP slave)
# pip install "pymodbus>=3.6,<3.10"
import struct
from pymodbus.datastore import ModbusSequentialDataBlock, ModbusSlaveContext, ModbusServerContext
from pymodbus.server import StartTcpServer

def f32(x):        # float32 -> 2 регістри (big-endian, старше слово першим)
    hi, lo = struct.unpack(">HH", struct.pack(">f", x))
    return [hi, lo]

def u32(x):        # uint32 -> 2 регістри
    hi, lo = struct.unpack(">HH", struct.pack(">I", x))
    return [hi, lo]

# Мапа holding registers з адреси 0:
regs  = f32(230.5)     # @0-1  напруга, В
regs += f32(12.3)      # @2-3  струм, А
regs += f32(2.65)      # @4-5  активна потужність, кВт
regs += f32(0.93)      # @6-7  коефіцієнт потужності
regs += u32(1234567)   # @8-9  активна енергія, Вт·год
regs += [5001]         # @10   частота ×100 -> 50.01 Гц

block = ModbusSequentialDataBlock(0, regs)
ctx = ModbusServerContext(slaves=ModbusSlaveContext(hr=block), single=True)
print("Meter emulator on 127.0.0.1:5020, registers:", regs)
StartTcpServer(ctx, address=("127.0.0.1", 5020))
`

const CLIENT = `# meter_client.py — опитування й декодування
# pip install "pymodbus>=3.6,<3.10"
import struct
from pymodbus.client import ModbusTcpClient

def dec_f32(regs, i):          # 2 регістри -> float32 (big-endian word order)
    return struct.unpack(">f", struct.pack(">HH", regs[i], regs[i+1]))[0]

def dec_u32(regs, i):
    return struct.unpack(">I", struct.pack(">HH", regs[i], regs[i+1]))[0]

client = ModbusTcpClient("127.0.0.1", port=5020)
client.connect()
rr = client.read_holding_registers(0, count=11, slave=1)   # FC03
client.close()

if rr.isError():
    raise SystemExit(f"Modbus error: {rr}")

r = rr.registers
print("Raw:", r)
print(f"U   = {dec_f32(r,0):.2f} В")
print(f"I   = {dec_f32(r,2):.2f} А")
print(f"P   = {dec_f32(r,4):.3f} кВт")
print(f"PF  = {dec_f32(r,6):.2f}")
print(f"E   = {dec_u32(r,8)} Вт·год")
print(f"f   = {r[10]/100:.2f} Гц")
`

export default function Lab01() {
  return (
    <article>
      <div className="kicker">Лабораторна робота 1</div>
      <h1>Опитування лічильника по Modbus</h1>

      <div className="lab-meta">
        <div><b>Зв’язок з лекцією</b>Лекція 4 — Modbus RTU/TCP</div>
        <div><b>Інструменти</b>Python 3, pymodbus ≥3.6,&lt;3.10</div>
        <div><b>Тривалість</b>2–3 год (+ захист 20–30 хв)</div>
        <div><b>Стенд</b>не потрібен — усе на ПК</div>
      </div>

      <div className="goals">
        <b>Мета роботи</b>
        <ul>
          <li>Підняти програмний емулятор лічильника як Modbus TCP slave.</li>
          <li>Зчитати holding registers клієнтом (FC03) і опрацювати помилки/таймаути.</li>
          <li>Коректно декодувати виміри: float32, uint32, масштабований uint16 — з урахуванням порядку слів.</li>
        </ul>
      </div>

      <h2>Хід роботи</h2>
      <ol className="steps">
        <li>
          Встановіть бібліотеку у віртуальному середовищі:
          <pre className="code"><code>python -m venv venv &amp;&amp; venv\\Scripts\\activate  {/* Windows */}
pip install "pymodbus&gt;=3.6,&lt;3.10"</code></pre>
          <p className="hint">Версію фіксуємо навмисно: у pymodbus 3.10+ змінилися імена (<code>slave→device_id</code>, <code>ModbusSlaveContext→ModbusDeviceContext</code>). З фіксованою версією код нижче працює без правок.</p>
        </li>
        <li>
          Створіть <code>meter_server.py</code> — емулятор лічильника з мапою регістрів і запустіть його в окремому терміналі:
          <pre className="code"><code>{SERVER}</code></pre>
        </li>
        <li>
          У другому терміналі створіть і запустіть <code>meter_client.py</code> — опитування й декодування:
          <pre className="code"><code>{CLIENT}</code></pre>
          <p className="hint">Очікуваний вивід: U=230.50 В, I=12.30 А, P=2.650 кВт, PF=0.93, E=1234567 Вт·год, f=50.01 Гц.</p>
        </li>
        <li>
          <b>Експеримент із порядком слів.</b> У функції <code>dec_f32</code> замініть <code>"&gt;HH"</code> на <code>"&lt;HH"</code> (переставте регістри) і знову зчитайте напругу. Поясніть у звіті, чому значення стає безглуздим, хоча кадр Modbus коректний.
        </li>
        <li>
          <b>Обробка помилок.</b> Спробуйте прочитати з неіснуючої адреси (напр. <code>read_holding_registers(500, count=2, slave=1)</code>) та зупиніть сервер і зробіть запит. Зафіксуйте у звіті різницю між <code>rr.isError()</code> (виняток протоколу) і винятком з’єднання/таймаутом.
        </li>
        <li>
          Перевірте свої «сирі» регістри в декодері нижче — вставте масив із поля <code>Raw:</code> і порівняйте з еталоном. Перемкніть порядок слів, щоб побачити ефект із кроку 4.
        </li>
      </ol>

      <RegisterDecoder />

      <h2>Питання до захисту</h2>
      <ol>
        <li>Який код функції читає holding registers і скільки байтів займе відповідь на читання 11 регістрів (RTU)?</li>
        <li>Чому float32 займає два регістри і як порядок слів впливає на результат? Наведіть приклад із вашого експерименту.</li>
        <li>Чим <code>rr.isError()</code> відрізняється від таймауту з’єднання? Як їх обробляти по-різному в реальному опитувальнику?</li>
        <li>Частота передана як 5001. Як відновити 50,01 Гц і чому вендор обрав масштабування, а не float?</li>
        <li>Що зміниться в клієнті, якщо перейти з Modbus TCP на RTU (RS-485)? Які параметри порту треба узгодити?</li>
      </ol>

      <h2>Формат звіту</h2>
      <div className="callout">
        <b>Звіт (1–2 стор.):</b> тема й мета · схема «сервер ↔ клієнт» (порт, адреса slave, діапазон регістрів) ·
        лістинги <code>meter_server.py</code> та <code>meter_client.py</code> · скріншот виводу клієнта з декодованими
        величинами · результат експерименту з порядком слів (крок 4) і обробкою помилок (крок 5) · відповіді на 1–2
        контрольні питання за завданням викладача · висновок: які типи кодування зустрічаються в лічильниках і чому
        мапу регістрів завжди беруть із документації.
      </div>

      <p className="footer-note">
        📄 Наступний крок курсу — <b>Лекція 5 (DLMS/COSEM)</b>: стандартизована модель об’єктів обліку, де на відміну
        від «сирих» регістрів Modbus кожна величина має самоописний OBIS-код.
      </p>
    </article>
  )
}
