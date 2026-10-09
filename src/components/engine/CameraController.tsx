import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useEngineStore } from "../../stores/engineStore";
import { chapters, smooth } from "../../data/chapters";
import type { PartSelectionController } from "./PartSelectionController";
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
          const chapter = chapters[8];
          target.current.set(...chapter.target);
          desired.current
            .set(...chapter.eye)
            .multiplyScalar(factor)
            .add(target.current);
          transition.current = 1;
        }
      } else {
        last.current = "story";
        const p = s.stage === "hero" ? 0 : s.progress;
        const x = Math.min(9, p * 10);
        const i = Math.floor(x),
          j = Math.min(9, i + 1),
          t = smooth(x - i);
        target.current
          .set(...chapters[i].target)
          .lerp(new Vector3(...chapters[j].target), t);
        desired.current
          .set(...chapters[i].eye)
          .lerp(new Vector3(...chapters[j].eye), t)
          .multiplyScalar(factor)
          .add(target.current);
        if (s.stage === "hero") {
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
          target.current.set(0.63, 0.4, 0);
          desired.current.set(3.2, 2.4, 3.5);
          if (mobile)
            desired.current
              .sub(target.current)
              .multiplyScalar(Math.max(1, 1.05 / (size.width / size.height)))
              .add(target.current);
        }
      }
    }
    if (transition.current > 0) {
      const alpha = s.reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
      camera.position.lerp(desired.current, alpha);
      c.target.lerp(target.current, alpha);
      c.update();
      if (s.mode === "lab" || s.chapter === 8) {
        transition.current -= dt * 0.7;
        if (camera.position.distanceTo(desired.current) < 0.002)
          transition.current = 0;
      }
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
