import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Box, RefreshCcw, AlertCircle } from "lucide-react";
import { Navigation, navigate } from "./components/navigation/Navigation";
import { Hero, ScrollExperience } from "./components/ScrollExperience";
import { EngineLab } from "./components/engine/EngineLab";
import { EngineLibrary } from "./components/EngineLibrary";
import { TechnicalEncyclopedia } from "./components/TechnicalEncyclopedia";
import { loadEngine } from "./components/engine/ModelLoader";
import { enterLab, useEngineStore } from "./stores/engineStore";
import type { LoadedModel, Vec3 } from "./types";
const EngineScene = lazy(() => import("./scenes/EngineScene"));
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}
function canWebGL() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    const ok = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}
function Fallback({ reason }: { reason: string }) {
  return (
    <div className="model-fallback">
      <img
        src="/images/engine-internals.png"
        alt="Рендер поршней, коленвала и газораспределения из исходного Blender-проекта"
      />
      <p>
        <AlertCircle size={17} />
        {reason}
      </p>
      <span>Каталог и энциклопедия доступны ниже.</span>
    </div>
  );
}
export default function App() {
  const [model, setModel] = useState<LoadedModel | null>(null),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [webgl, setWebgl] = useState(canWebGL);
  const mode = useEngineStore((s) => s.mode),
    presentation = useEngineStore((s) => s.presentation);
  useEffect(() => {
    let active = true;
    setError("");
    loadEngine(setProgress)
      .then((m) => {
        if (active) setModel(m);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Ошибка загрузки модели");
      });
    return () => {
      active = false;
    };
  }, [retry]);
  useEffect(() => {
    const lost = () => setWebgl(false);
    window.addEventListener("engine-context-lost", lost);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () =>
      useEngineStore.getState().set({ reducedMotion: media.matches });
    media.addEventListener("change", change);
    return () => {
      window.removeEventListener("engine-context-lost", lost);
      media.removeEventListener("change", change);
    };
  }, []);
  useEffect(() => {
    const route = () => {
      const hash = location.hash.slice(1);
      if (hash.startsWith("lab")) {
        const params = new URLSearchParams(hash.split("?")[1] || "");
        const part = params.get("part");
        const state = useEngineStore.getState();
        state.set({
          mode: "lab",
          assembly: Math.max(
            0,
            Math.min(1, Number(params.get("assembly") || 0)),
          ),
        });
        if (part && model?.manifest.parts.some((p) => p.id === part))
          state.select(part);
        const position = params.get("camera")?.split(",").map(Number),
          target = params.get("target")?.split(",").map(Number);
        if (
          position?.length === 3 &&
          target?.length === 3 &&
          [...position, ...target].every(Number.isFinite)
        )
          state.set({
            sharedCamera: {
              position: position as Vec3,
              target: target as Vec3,
            },
          });
      } else useEngineStore.getState().set({ mode: "story", playing: false });
    };
    route();
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, [model]);
  if (mode === "lab" && !webgl && model)
    return (
      <>
        <Navigation />
        <Fallback reason="Для лаборатории требуется WebGL 2." />
        <div className="fallback-lab">
          <h2>3D недоступно на этом устройстве</h2>
          <p>
            Откройте каталог и технические материалы или повторите загрузку
            после включения аппаратного ускорения.
          </p>
          <button
            className="button primary"
            onClick={() => navigate("components")}
          >
            Перейти к компонентам
          </button>
          <button
            className="button secondary"
            onClick={() => location.reload()}
          >
            Повторить загрузку
          </button>
        </div>
      </>
    );
  if (error)
    return (
      <div className="loading-screen">
        <AlertCircle size={36} />
        <span className="eyebrow">MODEL LOAD ERROR</span>
        <h1>Не удалось открыть двигатель</h1>
        <p>{error}</p>
        <button className="button primary" onClick={() => setRetry(retry + 1)}>
          <RefreshCcw size={16} />
          Повторить загрузку
        </button>
        <p className="fine-print">
          Требуются /models/engine.glb и /models/manifest.json. Подробности
          импорта — в README проекта.
        </p>
      </div>
    );
  if (!model)
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <span className="brand">
          <span className="brand-f1">F1</span> / ENGINEERING
        </span>
        <p className="eyebrow">PREPARING THE MACHINE</p>
        <h1>
          {progress}
          <span>%</span>
        </h1>
        <div className="loading-track">
          <i style={{ width: progress + "%" }} />
        </div>
        <p>
          {progress === 100
            ? "Подготовка геометрии…"
            : "Загружаем детали вашего двигателя"}
        </p>
        <span className="mono">VANTA R26 / GLB</span>
      </div>
    );
  return (
    <>
      <a href="#components" className="skip-link">
        Перейти к каталогу деталей
      </a>
      {!presentation && <Navigation />}
      {webgl ? (
        <SceneBoundary
          fallback={
            <Fallback reason="Не удалось создать 3D-сцену на этом устройстве." />
          }
        >
          <Suspense
            fallback={<div className="scene-loading">Подготовка 3D-сцены…</div>}
          >
            <EngineScene model={model} />
          </Suspense>
        </SceneBoundary>
      ) : (
        <Fallback reason="WebGL 2 недоступен или графический контекст потерян." />
      )}
      <main aria-hidden={mode === "lab"} inert={mode === "lab"}>
        <Hero />
        <ScrollExperience />
        <section className="lab-invitation content-section">
          <div>
            <p className="eyebrow">FROM OBSERVATION TO EXPLORATION</p>
            <h2>
              Теперь —<br />
              ваше исследование.
            </h2>
            <p>
              Снимите оболочку. Разберите систему.
              <br />
              Приблизьтесь к тому, что движет машиной.
            </p>
            <button className="button primary" onClick={() => enterLab()}>
              <Box size={17} />
              Открыть 3D-лабораторию
            </button>
          </div>
          <img
            src="/images/engine-internals.png"
            alt="Внутренняя механика V6 из исходной модели Blender"
            loading="lazy"
          />
          <span className="invitation-caption mono">
            ACTUAL BLENDER RENDER / ENGINE INTERNALS
          </span>
        </section>
        <EngineLibrary manifest={model.manifest} />
        <TechnicalEncyclopedia manifest={model.manifest} />
        <section id="about" className="about content-section">
          <p className="eyebrow">AN INDEPENDENT ENGINEERING STUDY</p>
          <h2>
            Создано, чтобы
            <br />
            <span className="muted">разобраться.</span>
          </h2>
          <div className="about-grid">
            <p>
              VANTA R26 — образовательная реконструкция современной гибридной
              силовой установки. Здесь используется геометрия вашего
              Blender-проекта: с отдельными деталями, исходными именами и
              техническими описаниями.
            </p>
            <p>
              Общая архитектура опирается на открытые инженерные сведения.
              Компоновка, формы и размеры многих деталей — авторские. Это не
              заводская модель, не разработка конкретной команды и не цифровая
              сертификация FIA.
            </p>
          </div>
          <div className="about-stats">
            <div>
              <strong>{model.manifest.parts.length}</strong>
              <span>компонентов в веб-модели</span>
            </div>
            <div>
              <strong>{Object.keys(model.manifest.groups).length}</strong>
              <span>логических групп разборки</span>
            </div>
            <div>
              <strong>
                Blender {model.manifest.blender_version.split(" ").slice(0, 1)}
              </strong>
              <span>источник редактируемой геометрии</span>
            </div>
          </div>
          <a
            className="text-button"
            href="/documentation/TECHNICAL_LIMITATIONS.md"
            target="_blank"
            rel="noreferrer"
          >
            Происхождение и технические ограничения
          </a>
        </section>
        <footer>
          <span className="brand">
            <span className="brand-f1">F1</span> / ENGINEERING
          </span>
          <span>INSIDE THE MACHINE · VANTA R26</span>
          <span>INDEPENDENT EDUCATIONAL PROJECT / 2026</span>
        </footer>
      </main>
      {mode === "lab" && <EngineLab manifest={model.manifest} />}
    </>
  );
}
