import { useEffect, useState } from "react";
import { Menu, X, Box } from "lucide-react";
import { enterLab, useEngineStore } from "../../stores/engineStore";
export function navigate(section: string) {
  useEngineStore
    .getState()
    .set({
      mode: "story",
      playing: false,
      selected: null,
      hovered: null,
      presentation: false,
    });
  history.replaceState(null, "", "#" + section);
  requestAnimationFrame(() =>
    document
      .getElementById(section)
      ?.scrollIntoView({
        behavior: useEngineStore.getState().reducedMotion
          ? "instant"
          : "smooth",
      }),
  );
}
export function Navigation() {
  const [open, setOpen] = useState(false),
    [compact, setCompact] = useState(false);
  const mode = useEngineStore((s) => s.mode);
  useEffect(() => {
    const scroll = () => setCompact(window.scrollY > 30);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  const links = [
    ["Главная", "home"],
    ["Исследование", "experience"],
    ["3D-лаборатория", "lab"],
    ["Компоненты", "components"],
    ["Технологии", "technology"],
    ["О проекте", "about"],
  ];
  return (
    <header className={"navigation " + (compact ? "compact" : "")}>
      <a
        className="brand"
        href="#home"
        onClick={(e) => {
          e.preventDefault();
          navigate("home");
        }}
        aria-label="F1 Engineering — Главная"
      >
        <span className="brand-f1">F1</span>
        <span className="brand-slash">/</span>
        <span>ENGINEERING</span>
      </a>
      <nav
        className={open ? "nav-links open" : "nav-links"}
        aria-label="Основная навигация"
      >
        {links.map(([name, id]) => (
          <a
            key={id}
            href={"#" + id}
            aria-current={mode === "lab" && id === "lab" ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
              id === "lab" ? enterLab() : navigate(id);
            }}
          >
            {name}
          </a>
        ))}
      </nav>
      <button className="nav-explore" onClick={() => enterLab()}>
        <Box size={15} /> EXPLORE 3D
      </button>
      <button
        className="menu-toggle icon-button"
        aria-expanded={open}
        aria-label={open ? "Закрыть меню" : "Открыть меню"}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
    </header>
  );
}
