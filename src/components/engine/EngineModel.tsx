import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEngineStore } from "../../stores/engineStore";
import type { LoadedModel } from "../../types";
import { ExplodedViewController } from "./ExplodedViewController";
import { PartSelectionController } from "./PartSelectionController";
import { WorkingCycleController } from "./WorkingCycleController";
import { TechnicalLabels } from "./TechnicalLabels";
import { chapters, smooth } from "../../data/chapters";
export function EngineModel({
  model,
  onRegistry,
}: {
  model: LoadedModel;
  onRegistry: (r: PartSelectionController) => void;
}) {
  const root = useMemo(() => model.scene.clone(true), [model]);
  const graph = useMemo(
    () => new PartSelectionController(root, model.manifest),
    [root, model],
  );
  const exploded = useMemo(
    () => new ExplodedViewController(root, model.manifest),
    [root, model],
  );
  const cycle = useMemo(() => new WorkingCycleController(graph), [graph]);
  const labels = useEngineStore((s) => s.labels),
    mode = useEngineStore((s) => s.mode),
    stage = useEngineStore((s) => s.stage),
    chapter = useEngineStore((s) => s.chapter);
  const assembly = useRef(0);
  useEffect(() => {
    onRegistry(graph);
    return () => graph.dispose();
  }, [graph, onRegistry]);
  useFrame((_, dt) => {
    const s = useEngineStore.getState();
    assembly.current +=
      ((s.playing ? 0 : s.assembly) - assembly.current) *
      (s.reducedMotion ? 1 : 1 - Math.exp(-dt * 7));
    exploded.apply(
      assembly.current,
      s.stage === "hero" ? 0 : s.progress,
      s.mode === "story",
      s.playing ? {} : s.systemAssembly,
    );
    cycle.update(s.playing, dt);
    root.updateMatrixWorld(true);
    const groups =
      s.mode === "story" && s.stage === "story"
        ? chapters[s.chapter].groups
        : [];
    graph.style(
      s,
      groups,
      s.mode === "story" && s.progress > 0.08 && s.progress < 0.79,
      s.quality === "low" || (s.quality === "auto" && window.innerWidth < 700),
    );
    if (s.mode === "story") {
      const p = s.stage === "hero" ? 0 : s.progress;
      graph.fadeCasings(
        1 - 0.88 * smooth((p - 0.06) / 0.07) * (1 - smooth((p - 0.72) / 0.08)),
      );
    }
    if (import.meta.env.DEV)
      (window as unknown as { __engineDebug: unknown }).__engineDebug = {
        parts: graph.entries.size,
        instances: graph.batches.reduce((n, b) => n + b.count, 0),
        visible: [...graph.entries.values()].filter(
          (e) => e.object.userData.webVisible,
        ).length,
        selected: s.selected,
        progress: s.progress,
        chapter: s.chapter,
        assembly: assembly.current,
        groups: Object.fromEntries(
          [...exploded.groups].map(([name, g]) => [
            name,
            g.object.position.toArray(),
          ]),
        ),
      };
  });
  function point(event: ThreeEvent<PointerEvent>, click = false) {
    const s = useEngineStore.getState();
    if (s.mode !== "lab" && s.chapter !== 8) return;
    event.stopPropagation();
    const id = graph.partId(event.object, event.instanceId);
    if (click && id) {
      s.select(id);
      s.set({ sharedCamera: null });
    } else s.set({ hovered: id });
  }
  const kinds = [
    [],
    ["liner"],
    ["piston", "rod"],
    ["crankshaft"],
    ["impeller_hub", "turbo_shaft"],
    ["camshaft", "valve"],
    ["mgu_k", "inverter"],
    ["oil_tank"],
    ["piston", "crankshaft", "mgu_k"],
    [],
  ][chapter];
  const autoIds =
    mode === "story" && stage === "story"
      ? kinds
          .map(
            (kind) =>
              model.manifest.parts.find((p) => p.component_kind === kind)?.id,
          )
          .filter((id): id is string => !!id)
      : [];
  return (
    <>
      <primitive
        object={root}
        dispose={null}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => point(e)}
        onPointerOut={() => useEngineStore.getState().set({ hovered: null })}
        onClick={(e: ThreeEvent<MouseEvent>) =>
          point(e as unknown as ThreeEvent<PointerEvent>, true)
        }
      />
      {(labels || autoIds.length > 0) && (
        <TechnicalLabels
          registry={graph}
          ids={autoIds.length ? autoIds : undefined}
        />
      )}
    </>
  );
}
