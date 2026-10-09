import { useState } from "react";
import type { Topic } from "../../data/technology";
export function TechnicalDiagram({ type }: { type: Topic["diagram"] }) {
  const [angle, setAngle] = useState(0);
  const [recovery, setRecovery] = useState(false);
  if (type === "cycle" || type === "ratio") {
    const phase = Math.floor(angle / 180) % 4;
    const rad = (angle * Math.PI) / 180;
    const piston = 92 + 28 * Math.cos(rad);
    return (
      <div className="technical-diagram">
        <svg
          viewBox="0 0 480 210"
          role="img"
          aria-label="Интерактивная схема кривошипно-шатунного механизма"
        >
          <defs>
            <linearGradient id="piston-metal">
              <stop stopColor="#657080" />
              <stop offset=".5" stopColor="#c4cbd4" />
              <stop offset="1" stopColor="#515a68" />
            </linearGradient>
          </defs>
          <path
            d="M165 30v111M235 30v111"
            stroke="#677180"
            strokeWidth="3"
            fill="none"
          />
          <path d="M170 30h60" stroke="#e10600" strokeWidth="3" />
          <rect
            x="173"
            y={piston - 40}
            width="54"
            height="25"
            rx="3"
            fill="url(#piston-metal)"
          />
          <path
            d={`M200 ${piston - 26} L${200 + 26 * Math.sin(rad)} ${159 + 26 * Math.cos(rad)}`}
            stroke="#c3c8cf"
            strokeWidth="7"
          />
          <circle
            cx="200"
            cy="159"
            r="27"
            stroke="#59616c"
            strokeWidth="2"
            fill="none"
          />
          <path
            d={`M200 159 L${200 + 26 * Math.sin(rad)} ${159 + 26 * Math.cos(rad)}`}
            stroke="#e10600"
            strokeWidth="10"
          />
          <circle cx="200" cy="159" r="5" fill="#eee" />
          <text x="300" y="88" fill="#f5f5f5" fontSize="22">
            {angle}°
          </text>
          <text x="300" y="114" fill="#a3aab4" fontSize="14">
            {["Впуск", "Сжатие", "Рабочий ход", "Выпуск"][phase]}
          </text>
          <text x="300" y="148" fill="#a3aab4" fontSize="12">
            {type === "ratio"
              ? "Распредвал: " + Math.round(angle / 2) + "°"
              : "720° = полный цикл"}
          </text>
        </svg>
        <label className="diagram-slider">
          Угол коленвала
          <input
            type="range"
            min="0"
            max="719"
            step="1"
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
          />
        </label>
        <div className="cycle-tabs">
          {["Впуск", "Сжатие", "Рабочий ход", "Выпуск"].map((n, i) => (
            <button
              key={n}
              className={phase === i ? "active" : ""}
              onClick={() => setAngle(i * 180 + 90)}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="fine-print">
          Функциональная схема, без масштаба и реальных фаз клапанов.
        </span>
      </div>
    );
  }
  if (type === "energy")
    return (
      <div className="technical-diagram energy-diagram">
        <div className="energy-switch">
          <button
            className={!recovery ? "active" : ""}
            onClick={() => setRecovery(false)}
          >
            Разгон
          </button>
          <button
            className={recovery ? "active" : ""}
            onClick={() => setRecovery(true)}
          >
            Рекуперация
          </button>
        </div>
        <div className={"energy-path " + (recovery ? "reverse" : "")}>
          {["ENERGY STORE", "INVERTER", "MGU-K", "CRANKSHAFT"].map((x, i) => (
            <div key={x}>
              <span className="mono">0{i + 1}</span>
              <strong>{x}</strong>
              {i < 3 && <i />}
            </div>
          ))}
        </div>
        <p>
          {recovery
            ? "Механическая энергия → электрическая энергия → накопление."
            : "Энергия аккумулятора → фазные токи → дополнительный момент."}
        </p>
      </div>
    );
  return (
    <div className="technical-diagram flow-diagram">
      <div>
        <span className="flow-node">ИСТОЧНИК</span>
        <i />
        <span className="flow-node">ПРЕОБРАЗОВАНИЕ</span>
        <i />
        <span className="flow-node">ПОТРЕБИТЕЛЬ</span>
      </div>
      <p>
        Следуйте функциональным связям в описании и включите «Потоки» в
        3D-лаборатории для магистралей наддува, выхлопа и откачки масла.
      </p>
    </div>
  );
}
