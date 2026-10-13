import { useRef, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEngineStore, enterLab } from "../../stores/engineStore";
import type { PartSelectionController } from "./PartSelectionController";
import { DampedValue } from "../../utils/motion";

export function TechnicalLabels({
  registry,
  ids: specified,
}: {
  registry: PartSelectionController;
  ids?: string[];
}) {
  const { camera, size, gl } = useThree();
  const selected = useEngineStore((s) => s.selected);
  const ids =
    specified ??
    (selected
      ? [selected]
      : ["INT-0007", "INT-0132", "HYB-0001"].filter((id) =>
          registry.entries.has(id),
        ));
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const leaders = useRef(new Map<string, SVGPathElement>());
  const positions = useRef(
    new Map<string, { x: DampedValue; y: DampedValue }>(),
  );
  const heights = useRef(new Map<string, number>());
  useFrame((_, dt) => {
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    for (const [i, id] of ids.entries()) {
      const element = buttons.current.get(id),
        line = leaders.current.get(id);
      const pos = registry.centerOf(id);
      if (!element || !line || !pos) continue;
      const p = pos.project(camera),
        x = ((p.x + 1) * size.width) / 2,
        y = ((1 - p.y) * size.height) / 2;
      const visible =
        registry.entries.get(id)?.object.userData.webVisible &&
        p.z > -1 &&
        p.z < 1 &&
        x > 12 &&
        x < size.width - 12 &&
        y > 40 &&
        y < size.height - 45;
      element.style.visibility = line.style.visibility = visible
        ? "visible"
        : "hidden";
      if (!visible) continue;
      const w = Math.min(210, size.width - 40),
        h = heights.current.get(id) ?? 62;
      const left = Math.max(
        16,
        Math.min(size.width - w - 16, i % 2 === 0 ? x + 36 : x - w - 36),
      );
      const preferred = Math.max(
        45,
        Math.min(size.height - h - 35, y + (i % 2 === 0 ? -h - 40 : 35)),
      );
      let top = preferred;
      for (const offset of [0, -90, 90, -180, 180, -270, 270]) {
        const candidate = Math.max(
          45,
          Math.min(size.height - h - 35, preferred + offset),
        );
        if (
          !placed.some(
            (r) =>
              left < r.x + r.w + 12 &&
              left + w + 12 > r.x &&
              candidate < r.y + r.h + 14 &&
              candidate + h + 14 > r.y,
          )
        ) {
          top = candidate;
          break;
        }
      }
      placed.push({ x: left, y: top, w, h });
      if (!positions.current.has(id))
        positions.current.set(id, {
          x: new DampedValue(left),
          y: new DampedValue(top),
        });
      const position = positions.current.get(id)!;
      const reduced = useEngineStore.getState().reducedMotion;
      const lx = reduced
        ? position.x.reset(left)
        : position.x.step(left, dt, 12);
      const ly = reduced ? position.y.reset(top) : position.y.step(top, dt, 12);
      element.style.transform = `translate3d(${lx}px,${ly}px,0)`;
      const endX = Math.max(lx, Math.min(lx + w, x)),
        endY = ly + (y > ly + h ? h : 0);
      line.setAttribute("d", `M${x},${y} L${endX},${endY}`);
    }
  });
  const host = gl.domElement.closest(".scene-shell");
  const content = (
    <div className="technical-overlay">
      <svg width="100%" height="100%" aria-hidden="true">
        {ids.map((id) => (
          <path
            key={id}
            className="technical-leader"
            ref={(el) => {
              if (el) leaders.current.set(id, el);
              else leaders.current.delete(id);
            }}
          />
        ))}
      </svg>
      {ids.map((id) => (
        <button
          key={id}
          ref={(el) => {
            if (el) {
              buttons.current.set(id, el);
              heights.current.set(id, el.offsetHeight);
            } else buttons.current.delete(id);
          }}
          className="technical-label"
          onClick={() =>
            useEngineStore.getState().mode === "story"
              ? enterLab(id)
              : useEngineStore.getState().select(id)
          }
        >
          <span>{id}</span>
          <strong>{registry.entries.get(id)?.part.name_ru}</strong>
        </button>
      ))}
    </div>
  );
  useLayoutEffect(() => {
    if (!host) return;
    const container = document.createElement("div");
    container.className = "technical-portal";
    host.appendChild(container);
    const root = createRoot(container);
    root.render(content);
    return () => {
      container.remove();
      queueMicrotask(() => root.unmount());
    };
  }, [host, ids.join("|")]);
  return null;
}
