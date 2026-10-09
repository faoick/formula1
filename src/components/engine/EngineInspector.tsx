import { X, Focus, Copy, Check, ScanEye } from "lucide-react";
import { useState } from "react";
import { useEngineStore } from "../../stores/engineStore";
import { SYSTEMS, systemOf, type Part } from "../../types";
export function EngineInspector({ part }: { part: Part }) {
  const [copied, setCopied] = useState(false);
  const isolate = useEngineStore((s) => s.isolate);
  return (
    <aside className="inspector panel" aria-label="Информация о детали">
      <div className="panel-heading">
        <span className="eyebrow">COMPONENT DETAILS</span>
        <button
          className="icon-button"
          aria-label="Закрыть информацию о детали"
          onClick={() => useEngineStore.getState().select(null)}
        >
          <X size={18} />
        </button>
      </div>
      <p className="part-id mono">{part.id}</p>
      <h2>{part.name_ru}</h2>
      <p className="part-english">{part.name_en}</p>
      <p>
        {part.description ||
          part.function ||
          "Конструктивный элемент указанного узла."}
      </p>
      <dl>
        <div>
          <dt>Система</dt>
          <dd>{SYSTEMS.find((s) => s.id === systemOf(part))?.name}</dd>
        </div>
        <div>
          <dt>Материал</dt>
          <dd>{part.material}</dd>
        </div>
        <div>
          <dt>Группа</dt>
          <dd>{part.group}</dd>
        </div>
        <div>
          <dt>Координаты, м</dt>
          <dd className="mono">
            {part.center.map((n) => n.toFixed(3)).join(" / ")}
          </dd>
        </div>
      </dl>
      <div className="inspector-connection">
        <span className="eyebrow">ФУНКЦИОНАЛЬНАЯ СВЯЗЬ</span>
        <p>
          {part.function ||
            part.description ||
            "Соединяется с деталями своей сборочной группы."}
        </p>
      </div>
      <div className="inspector-actions">
        <button
          className="button secondary"
          onClick={() => useEngineStore.getState().select(part.id)}
        >
          <Focus size={15} />В фокус
        </button>
        <button
          className={"button secondary " + (isolate ? "active" : "")}
          aria-pressed={isolate}
          onClick={() => useEngineStore.getState().set({ isolate: !isolate })}
        >
          <ScanEye size={15} />
          {isolate ? "Вернуть детали" : "Изолировать"}
        </button>
      </div>
      <button
        className="text-button copy-link"
        onClick={async () => {
          const s = useEngineStore.getState();
          const getter = (
            window as unknown as {
              engineView?: () => { position: number[]; target: number[] };
            }
          ).engineView;
          const view = getter?.();
          const params = new URLSearchParams({
            part: part.id,
            assembly: s.assembly.toFixed(3),
          });
          if (view) {
            params.set(
              "camera",
              view.position.map((x) => x.toFixed(4)).join(","),
            );
            params.set(
              "target",
              view.target.map((x) => x.toFixed(4)).join(","),
            );
          }
          const url = location.origin + location.pathname + "#lab?" + params;
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            window.prompt("Скопируйте ссылку на деталь", url);
          }
        }}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
        {copied ? "Ссылка скопирована" : "Поделиться ракурсом"}
      </button>
      <p className="fine-print">
        Авторская учебная реконструкция. Материал указан как визуальная
        категория.
      </p>
    </aside>
  );
}
