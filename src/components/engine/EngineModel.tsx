import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEngineStore } from "../../stores/engineStore";
import type { LoadedModel } from "../../types";
import { ExplodedViewController } from "./ExplodedViewController";
import { PartSelectionController } from "./PartSelectionController";
import { WorkingCycleController } from "./WorkingCycleController";
import { TechnicalLabels } from "./TechnicalLabels";
import { chapters } from "../../data/chapters";
import { DampedValue } from "../../utils/motion";
import { CombustionEffects } from './CombustionEffects';
import { storyCycleAngle } from './combustionCycle';
import { TurboRotorController } from './TurboRotorController';
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
  const turbo=useMemo(()=>new TurboRotorController(graph),[graph]);
  const labels = useEngineStore((s) => s.labels),
    mode = useEngineStore((s) => s.mode),
    stage = useEngineStore((s) => s.stage),
    chapter = useEngineStore((s) => s.chapter);
  const assembly = useRef(new DampedValue(0));
  const debugTime = useRef(0);
  useEffect(() => {
    onRegistry(graph);
    return () => graph.dispose();
  }, [graph, onRegistry]);
  useFrame((_, dt) => {
    const s = useEngineStore.getState();
    const amount = s.reducedMotion
      ? assembly.current.reset(s.playing ? 0 : s.assembly)
      : assembly.current.step(s.playing ? 0 : s.assembly, dt, 9, 0.8);
    exploded.apply(amount, s.progress, s.mode === "story", {});
    const storyCycle=s.mode==='story' && s.progress>=.248 && s.progress<.3 && s.combustion && !s.reducedMotion;
    cycle.update(storyCycle || (s.playing && amount < 0.003),Math.min(dt,.05),storyCycle?storyCycleAngle(s.progress):undefined);
    turbo.update(s.progress,s.mode==='story'&&!s.reducedMotion);
    root.updateMatrixWorld(true);
    const groups =
      s.mode === "story" && s.stage === "story"
        ? chapters[s.chapter].groups
        : [];
    graph.style(
      s,
      groups,
      false,
      s.quality === "low" || (s.quality === "auto" && window.innerWidth < 700),
    );
    graph.animateMaterials(dt);
    debugTime.current += dt;
    if (import.meta.env.DEV && debugTime.current >= 0.08) {
      debugTime.current = 0;
      (window as unknown as { __engineDebug: unknown }).__engineDebug = {
        parts: graph.entries.size,
        instances: graph.batches.reduce((n, b) => n + b.count, 0),
        visible: [...graph.entries.values()].filter(
          (e) => e.object.userData.webVisible,
        ).length,
        selected: s.selected,
        progress: s.progress,
        chapter: s.chapter,
        assembly: amount,
        groups: Object.fromEntries(
          [...exploded.groups].map(([name, g]) => [
            name,
            g.object.position.toArray(),
          ]),
        ),
      };
    }
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
      <CombustionEffects registry={graph} cycle={cycle}/>
      {(labels || autoIds.length > 0) && (
        <TechnicalLabels
          registry={graph}
          ids={autoIds.length ? autoIds : undefined}
        />
      )}
    </>
  );
}
