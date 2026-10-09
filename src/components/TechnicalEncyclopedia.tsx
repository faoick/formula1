import { useState, useEffect } from "react";
import { Box, BookOpen, ExternalLink } from "lucide-react";
import { marked } from "marked";
import { topics } from "../data/technology";
import { TechnicalDiagram } from "./technical/TechnicalDiagram";
import { enterLab, useEngineStore } from "../stores/engineStore";
import type { Manifest } from "../types";
const documents = ["SYSTEMS.md", "TECHNICAL_LIMITATIONS.md", "ENGINE.md"];
export function TechnicalEncyclopedia({ manifest }: { manifest: Manifest }) {
  const [active, setActive] = useState(0),
    [document, setDocument] = useState<string | null>(null),
    [markdown, setMarkdown] = useState(""),
    [error, setError] = useState("");
  const topic = topics[active];
  useEffect(() => {
    if (!document) return;
    let cancelled = false;
    setMarkdown("");
    setError("");
    fetch("/documentation/" + document)
      .then((r) => {
        if (!r.ok) throw Error("Документ недоступен");
        return r.text();
      })
      .then(async (text) => {
        const renderer = new marked.Renderer();
        renderer.html = () => "";
        const html = await marked.parse(text, { renderer });
        if (!cancelled) setMarkdown(html);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [document]);
  return (
    <section className="technology content-section" id="technology">
      <div className="section-heading">
        <div>
          <p className="eyebrow">THE ENGINEERING ENCYCLOPEDIA</p>
          <h2>
            Понять — значит
            <br />
            <span className="muted">увидеть взаимосвязи.</span>
          </h2>
        </div>
        <p>
          13 тем о том, как отдельные механизмы
          <br />
          становятся одной силовой установкой.
        </p>
      </div>
      <div className="encyclopedia-layout">
        <nav aria-label="Темы энциклопедии" className="topic-list">
          {topics.map((t, i) => (
            <button
              key={t.id}
              className={i === active ? "active" : ""}
              onClick={() => {
                setActive(i);
                setDocument(null);
              }}
            >
              <span className="mono">{String(i + 1).padStart(2, "0")}</span>
              {
                [
                  "Двигатель внутреннего сгорания",
                  "Четырёхтактный цикл",
                  "Архитектура V6",
                  "Турбонаддув",
                  "Газораспределение",
                  "Непосредственный впрыск",
                  "Система смазки",
                  "Охлаждение",
                  "Рекуперация энергии",
                  "Гибридная архитектура",
                  "Коробка передач",
                  "Трансмиссия",
                  "Формула-1 / 2026",
                ][i]
              }
            </button>
          ))}
        </nav>
        <article className="topic-article" key={topic.id}>
          <p className="eyebrow">{topic.en}</p>
          <h3>{topic.title}</h3>
          <p className="article-intro">{topic.intro}</p>
          <TechnicalDiagram type={topic.diagram} />
          {topic.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <div className="topic-facts">
            {topic.facts.map(([value, label]) => (
              <div key={value}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <aside className="technical-note">
            <BookOpen size={18} />
            <div>
              <span className="mono">ТЕХНИЧЕСКОЕ ПРИМЕЧАНИЕ</span>
              <p>{topic.note}</p>
            </div>
          </aside>
          <button
            className="button secondary"
            onClick={() => {
              const part = manifest.parts.find(
                (p) => topic.groups.includes(p.group) && !p.is_detail,
              );
              enterLab(part?.id);
              useEngineStore.getState().set({ assembly: 0.3 });
            }}
          >
            <Box size={16} />
            Посмотреть узел в 3D
          </button>
          <div className="article-source">
            <span>Основа: документация Blender-проекта.</span>
            <button onClick={() => setDocument("SYSTEMS.md")}>
              Открыть SYSTEMS.md
            </button>
          </div>
        </article>
      </div>
      <div className="source-docs">
        <span className="eyebrow">ПЕРВОИСТОЧНИКИ ПРОЕКТА</span>
        {documents.map((d) => (
          <button
            key={d}
            className={document === d ? "active" : ""}
            onClick={() => setDocument(document === d ? null : d)}
          >
            <BookOpen size={16} />
            {d}
          </button>
        ))}
      </div>
      {document && (
        <div className="markdown-document">
          <div className="panel-heading">
            <h3>{document}</h3>
            <button className="text-button" onClick={() => setDocument(null)}>
              Закрыть документ
            </button>
          </div>
          {error ? (
            <p role="alert">{error}</p>
          ) : markdown ? (
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: markdown }}
            />
          ) : (
            <p role="status">Загрузка документа…</p>
          )}
        </div>
      )}
      <div className="sources-note">
        <p>
          ¹ MGU-K: 350 кВт — предельная мощность в ключевых зонах ускорения; в
          других частях круга уточнение FIA указывает 250 кВт. Не постоянная
          мощность на всём круге.
        </p>
        <a
          href="https://www.fia.com/news/refinements-2026-fia-formula-1-regulations-agreed-all-stakeholders"
          target="_blank"
          rel="noreferrer"
        >
          FIA · уточнения правил 2026 <ExternalLink size={13} />
        </a>
        <a
          href="https://www.formula1.com/en/latest/article/all-you-need-to-know-about-f1s-new-power-units.14jfv7a36905uDJDdNyfQd"
          target="_blank"
          rel="noreferrer"
        >
          Formula 1 · архитектура силовой установки <ExternalLink size={13} />
        </a>
      </div>
    </section>
  );
}
