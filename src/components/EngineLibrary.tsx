import { useMemo, useState, useRef, useEffect } from "react";
import { Search, Box, ChevronLeft, ChevronRight, X } from "lucide-react";
import { SYSTEMS, systemOf, type Manifest, type Part } from "../types";
import { enterLab } from "../stores/engineStore";
export function EngineLibrary({ manifest }: { manifest: Manifest }) {
  const [query, setQuery] = useState(""),
    [system, setSystem] = useState("all"),
    [page, setPage] = useState(0),
    [detail, setDetail] = useState<Part | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (detail && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [detail]);
  const filtered = useMemo(
    () =>
      manifest.parts.filter(
        (p) =>
          (system === "all" || systemOf(p) === system) &&
          (p.id + " " + p.name_ru + " " + p.name_en)
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [manifest, query, system],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  return (
    <section className="library content-section" id="components">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ENGINE COMPONENT LIBRARY</p>
          <h2>
            Большая инженерия.
            <br />
            <span className="muted">В мельчайших деталях.</span>
          </h2>
        </div>
        <p>
          От проточки поршня до лопатки турбины.
          <br />
          Каталог объектов исходной модели с их собственными идентификаторами.
        </p>
      </div>
      <div className="library-filter">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Поиск компонентов"
            placeholder="Название, ID или английский термин"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          {query && (
            <button
              className="icon-button"
              aria-label="Очистить поиск"
              onClick={() => {
                setQuery("");
                setPage(0);
              }}
            >
              <X size={16} />
            </button>
          )}
        </label>
        <select
          aria-label="Фильтр компонентов по системе"
          value={system}
          onChange={(e) => {
            setSystem(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">Все системы</option>
          {SYSTEMS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="mono filtered-count">{filtered.length} ДЕТАЛЕЙ</span>
      </div>
      <div className="part-grid">
        {filtered.slice(page * 12, page * 12 + 12).map((p) => (
          <article key={p.id} className="part-card">
            <div className="part-card-top">
              <span className="mono">{p.id}</span>
              <span className="part-material">{p.material}</span>
            </div>
            <button className="part-title" onClick={() => setDetail(p)}>
              {p.name_ru}
            </button>
            <p className="part-en">{p.name_en}</p>
            <p className="part-purpose">
              {p.description ||
                p.function ||
                "Конструктивная деталь сборки " + p.group + "."}
            </p>
            <button
              className="text-button part-3d"
              onClick={() => enterLab(p.id)}
            >
              <Box size={16} />
              Показать в 3D
            </button>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="empty-state">
          <Search size={28} />
          <h3>Деталь не найдена</h3>
          <p>Попробуйте «поршень», «crankshaft» или ID вида INT-0007.</p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setSystem("all");
            }}
          >
            Сбросить фильтры
          </button>
        </div>
      )}
      <div className="pagination">
        <span>
          Показано {Math.min(filtered.length, page * 12 + 1)}–
          {Math.min(filtered.length, (page + 1) * 12)} из {filtered.length}
        </span>
        <div>
          <button
            className="icon-button"
            disabled={page === 0}
            aria-label="Предыдущая страница"
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="mono">
            {page + 1} / {pages}
          </span>
          <button
            className="icon-button"
            disabled={page >= pages - 1}
            aria-label="Следующая страница"
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      {detail && (
        <dialog
          ref={dialogRef}
          onCancel={(e) => {
            e.preventDefault();
            setDetail(null);
          }}
          className="part-dialog"
          aria-labelledby="part-dialog-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setDetail(null);
          }}
        >
          <button
            autoFocus
            className="icon-button dialog-close"
            aria-label="Закрыть описание"
            onClick={() => setDetail(null)}
          >
            <X />
          </button>
          <p className="eyebrow">
            {detail.id} / {detail.group}
          </p>
          <h3 id="part-dialog-title">{detail.name_ru}</h3>
          <p className="part-en">{detail.name_en}</p>
          <p>{detail.description || detail.function}</p>
          <dl>
            <div>
              <dt>Материал</dt>
              <dd>{detail.material}</dd>
            </div>
            <div>
              <dt>Система</dt>
              <dd>{SYSTEMS.find((s) => s.id === systemOf(detail))?.name}</dd>
            </div>
          </dl>
          <button
            className="button primary"
            onClick={() => {
              enterLab(detail.id);
              setDetail(null);
            }}
          >
            <Box size={16} />
            Исследовать в 3D
          </button>
        </dialog>
      )}
    </section>
  );
}
