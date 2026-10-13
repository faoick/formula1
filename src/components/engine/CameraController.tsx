import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useEngineStore } from "../../stores/engineStore";
import { cinematicView } from "./cinematicShots";
import type { PartSelectionController } from "./PartSelectionController";
import { DampedValue } from "../../utils/motion";
export function CameraController({
  controls,
  registry,
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
  registry: PartSelectionController | null;
}) {
  const { camera, size } = useThree();
  const last = useRef("");
  const transition = useRef(0);
  const desired = useRef(new Vector3(2.5, 1.5, 2));
  const target = useRef(new Vector3(0.6, 0.4, 0));
  const mode = useEngineStore((s) => s.mode);
  const motion = useRef(Array.from({ length: 6 }, () => new DampedValue()));
  const initialized = useRef(false);
  useEffect(() => {
    const control = controls.current;
    const takeControl = () => {
      transition.current = 0;
      initialized.current = false;
    };
    control?.addEventListener("start", takeControl);
    return () => control?.removeEventListener("start", takeControl);
  }, [controls]);
  useEffect(() => {
    last.current = "";
  }, [mode]);
  useFrame((_, dt) => {
    const s = useEngineStore.getState();
    if (!controls.current) return;
    const c = controls.current;
    const mobile = size.width < 650;
    const factor = mobile ? 1.18 : 1;
    if (s.mode === "story") {
      if (s.stage === "below") return;
      if (s.stage === "story" && s.chapter === 8) {
        const key = "exploded-orbit";
        if (last.current !== key) {
          last.current = key;
          target.current.set(0.65, 0.65, 0);
          desired.current
            .set(3.45, 2.3, 4.1)
            .multiplyScalar(factor)
            .add(target.current);
          transition.current = 1;
        }
      } else {
        last.current = "story";
        const p = s.progress;
        const view = cinematicView(p, registry);
        target.current.copy(view.target);
        desired.current
          .copy(view.offset)
          .multiplyScalar(factor)
          .add(target.current);
        if (s.stage === "hero" && p < 0.00001) {
          target.current.set(0.69, 0.39, 0);
          desired.current.set(1.55, 1.01, 1.11);
          if (mobile)
            desired.current
              .sub(target.current)
              .multiplyScalar(0.95)
              .add(target.current);
          if (!s.reducedMotion)
            desired.current.x += Math.sin(performance.now() * 0.00012) * 0.065;
        }
        transition.current = 1;
      }
    } else {
      const key = [
        s.cameraReset,
        s.focusToken,
        s.playing,
        s.assembly,
        Math.round(size.width),
        Math.round(size.height),
      ].join(":");
      if (last.current !== key) {
        last.current = key;
        transition.current = 1;
        const center = s.selected && registry?.centerOf(s.selected);
        if (s.sharedCamera) {
          target.current.set(...s.sharedCamera.target);
          desired.current.set(...s.sharedCamera.position);
        } else if (s.playing) {
          target.current.set(0.59, 0.3, 0);
          desired.current.set(1.1, 0.69, 0.65);
        } else if (center) {
          target.current.copy(center);
          const distance = (registry?.radiusOf(s.selected!) ?? 0.2) * 1.7;
          desired.current
            .copy(center)
            .add(
              new Vector3(0.8, 0.6, 1)
                .normalize()
                .multiplyScalar(distance * factor),
            );
        } else {
          target.current.set(0.63, 0.4 + 0.22 * s.assembly, 0);
          desired.current
            .set(3.2, 2.4, 3.5)
            .sub(target.current)
            .multiplyScalar(1 + 0.65 * s.assembly)
            .add(target.current);
          if (mobile)
            desired.current
              .sub(target.current)
              .multiplyScalar(Math.max(1, 1.05 / (size.width / size.height)))
              .add(target.current);
        }
      }
    }
    if (transition.current > 0) {
      if (!initialized.current) {
        [...camera.position.toArray(), ...c.target.toArray()].forEach((v, i) =>
          motion.current[i].reset(v),
        );
        initialized.current = true;
      }
      const goal = [...desired.current.toArray(), ...target.current.toArray()];
      const values = motion.current.map((m, i) =>
        s.reducedMotion ? m.reset(goal[i]) : m.step(goal[i], dt, 9),
      );
      camera.position.set(values[0], values[1], values[2]);
      c.target.set(values[3], values[4], values[5]);
      c.update();
      if (s.mode === "lab" || s.chapter === 8) {
        if (
          motion.current.every(
            (m, i) =>
              Math.abs(m.value - goal[i]) < 0.0001 &&
              Math.abs(m.velocity) < 0.001,
          )
        ) {
          transition.current = 0;
          initialized.current = false;
        }
      }
    } else {
      initialized.current = false;
    }
    if (import.meta.env.DEV)
      (window as unknown as { __camera: unknown }).__camera = {
        position: camera.position.toArray(),
        target: c.target.toArray(),
      };
    (window as unknown as { engineView?: () => unknown }).engineView = () => ({
      position: camera.position.toArray(),
      target: c.target.toArray(),
    });
  });
  return null;
}
