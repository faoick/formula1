import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, Box, Play, Wind, BookOpen, Flame } from "lucide-react";
import { CombustionReadout } from './engine/CombustionEffects';
import { chapters } from "../data/chapters";
import { shotCaption } from "./engine/cinematicShots";
import { enterLab, useEngineStore } from "../stores/engineStore";
import { DampedValue } from "../utils/motion";
gsap.registerPlugin(ScrollTrigger);
export function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-topline mono">
        <span className="small-line" /> ENGINEERING SERIES{" "}
        <span className="muted">/</span> 2026
      </div>
      <div className="hero-heading">
        <p className="eyebrow">THE ENGINE EXPERIENCE</p>
        <h1>
          <span>FORMULA 1</span>
          <span className="outline-text">INSIDE THE</span>
          <span>
            MACHINE<span className="red">.</span>
          </span>
        </h1>
        <p className="hero-description">
          Исследуй инженерное совершенство.
          <br />
          От первого оборота коленвала до гибридной системы современной
          Формулы-1.
        </p>
        <div className="hero-actions">
          <button
            className="button primary"
            onClick={() =>
              document.getElementById("experience")?.scrollIntoView({
                behavior: useEngineStore.getState().reducedMotion
                  ? "instant"
                  : "smooth",
              })
            }
          >
            Исследовать двигатель
          </button>
          <button className="text-button" onClick={() => enterLab()}>
            <Box size={17} />
            3D-лаборатория
          </button>
        </div>
      </div>
      <div className="hero-side-tag mono">
        <span>VANTA R26</span>
        <span>POWER UNIT / 01</span>
      </div>
      <div className="hero-bottom">
        <button
          className="scroll-cue mono"
          onClick={() =>
            document
              .getElementById("experience")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span className="scroll-line" />
          SCROLL TO EXPLORE
          <ArrowDown size={16} />
        </button>
        <div className="hero-specs">
          <div>
            <strong>
              1.6<span>L</span>
            </strong>
            <small>V6 TURBO</small>
          </div>
          <div>
            <strong>
              350<span>kW</span>
            </strong>
            <small>MGU-K · МАКС.¹</small>
          </div>
          <div>
            <strong>2026</strong>
            <small>HYBRID GENERATION</small>
          </div>
        </div>
      </div>
    </section>
  );
}
export function ScrollExperience() {
  const ref = useRef<HTMLElement>(null);
  const progressBar = useRef<HTMLDivElement>(null);
  const progressText = useRef<HTMLSpanElement>(null);
  const caption = useEngineStore((s) => shotCaption(s.progress));
  const combustion=useEngineStore(s=>s.combustion);
  const chapter = useEngineStore((s) => s.chapter),
    flows = useEngineStore((s) => s.flows),
    reduced = useEngineStore((s) => s.reducedMotion);
  const current = chapters[chapter];
  useEffect(() => {
    let previous = -1;
    const paint = () => {
      const p = useEngineStore.getState().progress;
      if (p === previous) return;
      previous = p;
      if (progressBar.current)
        progressBar.current.style.transform = `scaleX(${p})`;
      if (progressText.current)
        progressText.current.textContent = `${Math.round(p * 100)
          .toString()
          .padStart(3, "0")}% EXPLORED`;
    };
    paint();
    return useEngineStore.subscribe(paint);
  }, []);
  useEffect(() => {
    const section = ref.current!;
    const timeline = { p: 0 };
    const motion = new DampedValue(useEngineStore.getState().progress);
    const tick = (_time: number, delta: number) => {
      const state = useEngineStore.getState();
      if (state.mode === "lab") return;
      const p = reduced
        ? motion.reset(timeline.p)
        : motion.step(timeline.p, delta / 1000, 11, 0.28);
      if (Math.abs(p - state.progress) > 1e-8)
        state.set({ progress: p, chapter: Math.min(9, Math.floor(p * 10)) });
    };
    const ctx = gsap.context(() => {
      gsap.to(timeline, {
        p: 1,
        ease: "none",
        scrollTrigger: {
          id: "engine-story",
          trigger: section,
          start: "top top",
          end: () => "+=" + innerHeight * 12,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            useEngineStore
              .getState()
              .set({ stage: self.progress === 1 ? "below" : "story" });
          },
          onEnter: () => useEngineStore.getState().set({ stage: "story" }),
          onLeave: () => useEngineStore.getState().set({ stage: "below" }),
          onEnterBack: () => useEngineStore.getState().set({ stage: "story" }),
          onLeaveBack: () => useEngineStore.getState().set({ stage: "hero" }),
        },
      });
    }, section);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ctx.revert();
    };
  }, [reduced]);
  const jump = (i: number) => {
    const trigger = ScrollTrigger.getById("engine-story");
    if (trigger)
      window.scrollTo({
        top: trigger.start + ((trigger.end - trigger.start) * (i + 0.025)) / 10,
        behavior: reduced ? "instant" : "smooth",
      });
  };
  return (
    <section id="experience" className="experience" ref={ref}>
      <div
        ref={progressBar}
        className="story-progress"
        style={{ transform: "scaleX(0)" }}
      />
      <div className="chapter-top mono">
        <span>
          <span className="red">{String(chapter + 1).padStart(2, "0")}</span> /
          10
        </span>
        <span>THE ANATOMY OF PERFORMANCE</span>
        <button onClick={() => enterLab()} className="text-button">
          Перейти в лабораторию <Box size={16} />
        </button>
      </div>
      <div className="story-copy" key={chapter}>
        <p className="eyebrow">{current.tag}</p>
        <h2>{current.title}</h2>
        <p className="story-sub mono">{current.sub}</p>
        <p className="story-description">{current.text}</p>
        <div className="chapter-fact">
          <strong>{current.fact[0]}</strong>
          <span>{current.fact[1]}</span>
        </div>
        <p className="shot-caption" key={caption}>
          <span />
          {caption}
        </p>
        {chapter===2&&<button className="text-button combustion-toggle" aria-pressed={combustion} onClick={()=>useEngineStore.getState().set({combustion:!combustion})}><Flame size={15}/>{combustion?'Скрыть процесс сгорания':'Показать процесс сгорания'}</button>}
        {(chapter === 2 || chapter === 3) && (
          <button
            className="button secondary"
            onClick={() => {
              enterLab();
              useEngineStore.getState().set({ playing: true });
            }}
          >
            <Play size={15} />
            Посмотреть рабочий цикл
          </button>
        )}
        {(chapter === 4 || chapter === 7) && (
          <button
            className={"button secondary " + (flows ? "active" : "")}
            aria-pressed={flows}
            onClick={() => useEngineStore.getState().set({ flows: !flows })}
          >
            <Wind size={16} />
            {flows ? "Скрыть потоки" : "Показать потоки"}
          </button>
        )}
        {chapter === 8 && (
          <p className="interaction-note">
            <Box size={15} />
            Вращайте модель мышью или касанием
          </p>
        )}
        {chapter === 9 && (
          <button className="button primary" onClick={() => enterLab()}>
            <BookOpen size={16} />
            Изучить все детали
          </button>
        )}
      </div>
      <nav className="chapter-rail" aria-label="Главы исследования">
        {chapters.map((c, i) => (
          <button
            key={c.tag}
            title={c.tag}
            aria-label={"Глава " + (i + 1) + ": " + c.tag}
            aria-current={i === chapter ? "step" : undefined}
            onClick={() => jump(i)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <i />
          </button>
        ))}
      </nav>
      {chapter===2&&combustion&&<div className="story-process"><CombustionReadout/></div>}
      <div className="story-bottom mono">
        <span>VANTA R26 / EDUCATIONAL RECONSTRUCTION</span>
        <span ref={progressText}>000% EXPLORED</span>
      </div>
    </section>
  );
}
