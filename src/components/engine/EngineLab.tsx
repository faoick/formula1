import { useEffect, useRef, useState } from "react";
import {
  Box,
  RotateCcw,
  Maximize,
  Minimize,
  Tags,
  ScanLine,
  EyeOff,
  Layers,
  Play,
  Pause,
  SlidersHorizontal,
  X,
  Wind,
  Monitor,
  PanelLeftClose,
  Search,
} from "lucide-react";
import { SYSTEMS, type Manifest } from "../../types";
import { useEngineStore } from "../../stores/engineStore";
import { EngineInspector } from "./EngineInspector";
export function EngineLab({ manifest }: { manifest: Manifest }) {
  const s = useEngineStore();
  const ref = useRef<HTMLDivElement>(null);
  const [controlsOpen, setControlsOpen] = useState(innerWidth > 800),
    [fullscreen, setFullscreen] = useState(false),
    [query, setQuery] = useState("");
  const selected = manifest.parts.find((p) => p.id === s.selected);
  const hovered = manifest.parts.find((p) => p.id === s.hovered);
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const changed = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", changed);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("fullscreenchange", changed);
    };
  }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (s.presentation) s.set({ presentation: false });
        else if (s.selected) s.select(null);
        else leave();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [s]);
  function leave() {
    if (document.fullscreenElement) void document.exitFullscreen();
    history.replaceState(null, "", "#experience");
    s.set({
      mode: "story",
      playing: false,
      selected: null,
      hovered: null,
      presentation: false,
    });
  }
  const toggle = (key: "xray" | "hideCasing" | "labels" | "flows") =>
    s.set({ [key]: !s[key] });
  return (
    <div className={"lab " + (s.presentation ? "presentation" : "")} ref={ref}>
      <div className="lab-top">
        <div>
          <span className="eyebrow">INTERACTIVE WORKSPACE</span>
          <h1>
            3D ENGINE LAB<span className="red">.</span>
          </h1>
        </div>
        <div className="lab-top-actions">
          <span className="mono lab-count">
            {manifest.parts.length.toLocaleString("ru-RU")} КОМПОНЕНТОВ
          </span>
          <button className="button secondary" onClick={leave}>
            <X size={15} />
            Закрыть лабораторию
          </button>
        </div>
      </div>
      {!s.presentation && (
        <>
          <button
            className="lab-controls-toggle button secondary"
            aria-expanded={controlsOpen}
            onClick={() => setControlsOpen(!controlsOpen)}
          >
            <SlidersHorizontal size={17} />
            Системы
          </button>
          {controlsOpen && (
            <aside className="lab-controls panel">
              <div className="panel-heading">
                <span className="eyebrow">SYSTEM VISIBILITY</span>
                <button
                  className="icon-button"
                  aria-label="Свернуть настройки систем"
                  onClick={() => setControlsOpen(false)}
                >
                  <PanelLeftClose size={18} />
                </button>
              </div>
              <div className="lab-search">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Деталь или ID…"
                  aria-label="Найти деталь в лаборатории"
                />
              </div>
              {query && (
                <div className="lab-search-results">
                  {manifest.parts
                    .filter((p) =>
                      (p.id + " " + p.name_ru + " " + p.name_en)
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .slice(0, 8)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          s.select(p.id);
                          setQuery("");
                        }}
                      >
                        <span className="mono">{p.id}</span>
                        {p.name_ru}
                      </button>
                    ))}
                </div>
              )}
              <div className="system-toggles">
                {SYSTEMS.map((system) => (
                  <label key={system.id}>
                    <input
                      type="checkbox"
                      checked={s.systems.includes(system.id)}
                      onChange={() => s.toggleSystem(system.id)}
                    />
                    <span className="mono">{system.code}</span>
                    <span>{system.name}</span>
                  </label>
                ))}
              </div>
              <button
                className="text-button restore-button"
                onClick={() =>
                  s.set({
                    systems: SYSTEMS.map((x) => x.id),
                    isolate: false,
                    selected: null,
                    hideCasing: false,
                  })
                }
              >
                <Layers size={15} />
                Вернуть все детали
              </button>
              <details className="group-explorer">
                <summary>Разборка отдельных систем</summary>
                {Object.keys(manifest.groups).map((group) => (
                  <label key={group}>
                    {group}
                    <input
                      aria-label={"Разборка группы " + group}
                      type="range"
                      min="0"
                      max="1"
                      step=".01"
                      value={s.systemAssembly[group] ?? s.assembly}
                      onChange={(e) =>
                        s.set({
                          systemAssembly: {
                            ...s.systemAssembly,
                            [group]: Number(e.target.value),
                          },
                          playing: false,
                        })
                      }
                    />
                  </label>
                ))}
              </details>
              <label className="quality-select">
                Качество
                <select
                  value={s.quality}
                  onChange={(e) =>
                    s.set({ quality: e.target.value as typeof s.quality })
                  }
                >
                  <option value="auto">Адаптивное</option>
                  <option value="high">Высокое</option>
                  <option value="low">Экономичное</option>
                </select>
              </label>
            </aside>
          )}
          {selected ? (
            <EngineInspector part={selected} />
          ) : (
            <div className="lab-hint">
              <Box size={21} />
              <p>Каждая деталь — начало открытия.</p>
              <span>Выберите её на модели или найдите по названию.</span>
            </div>
          )}
          <div className="lab-toolbar">
            {[
              { key: "labels" as const, icon: Tags, title: "Подписи" },
              {
                key: "hideCasing" as const,
                icon: EyeOff,
                title: "Скрыть корпус",
              },
              { key: "xray" as const, icon: ScanLine, title: "Рентген" },
              { key: "flows" as const, icon: Wind, title: "Потоки" },
            ].map(({ key, icon: Icon, title }) => (
              <button
                key={key}
                aria-pressed={s[key]}
                className={s[key] ? "active" : ""}
                onClick={() => toggle(key)}
                title={title}
              >
                <Icon size={18} />
                <span>{title}</span>
              </button>
            ))}
            <span className="toolbar-divider" />
            <button
              onClick={() =>
                s.set({
                  cameraReset: s.cameraReset + 1,
                  selected: null,
                  sharedCamera: null,
                })
              }
              title="Сбросить камеру"
            >
              <RotateCcw size={18} />
              <span>Камера</span>
            </button>
            <button
              className={s.playing ? "active" : ""}
              aria-pressed={s.playing}
              onClick={() =>
                s.set({
                  playing: !s.playing,
                  selected: null,
                  assembly: 0,
                  systemAssembly: {},
                  isolate: false,
                })
              }
            >
              {s.playing ? <Pause size={18} /> : <Play size={18} />}
              <span>{s.playing ? "Остановить" : "Рабочий цикл"}</span>
            </button>
            <button
              onClick={() => s.set({ presentation: true })}
              title="Режим презентации"
            >
              <Monitor size={18} />
              <span>Презентация</span>
            </button>
            <button
              aria-label={
                fullscreen ? "Выйти из полного экрана" : "Полный экран"
              }
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else
                  void document.documentElement
                    .requestFullscreen()
                    .catch(() => {});
              }}
            >
              {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
          <div className="assembly-control panel">
            <div className="assembly-label mono">
              <span>ASSEMBLED</span>
              <span className="assembly-value">
                {Math.round(s.assembly * 100)}
                <small>%</small>
              </span>
              <span>EXPLODED</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step=".001"
              value={s.assembly}
              aria-label="Степень разборки двигателя"
              aria-valuetext={Math.round(s.assembly * 100) + "% разобрано"}
              onChange={(e) =>
                s.set({
                  assembly: Number(e.target.value),
                  systemAssembly: {},
                  playing: false,
                })
              }
            />
            <div className="assembly-foot">
              <span>Потяните, чтобы разобрать двигатель</span>
              <button onClick={s.reset}>Восстановить исходный вид</button>
            </div>
          </div>
          {hovered && !selected && (
            <div className="part-tooltip">
              <span className="mono red">{hovered.id}</span>
              {hovered.name_ru}
            </div>
          )}
          {s.playing && (
            <div className="cycle-note">
              <span className="red">●</span> УЧЕБНЫЙ ЦИКЛ · ЗАМЕДЛЕНО
              <p>
                Кинематика реальной геометрии модели. Фазы сгорания условные;
                цепи, клапаны и передача здесь неподвижны.
              </p>
            </div>
          )}
        </>
      )}
      {s.presentation && (
        <button
          className="button secondary presentation-exit"
          onClick={() => s.set({ presentation: false })}
        >
          <X size={16} />
          Вернуть интерфейс
        </button>
      )}
    </div>
  );
}
