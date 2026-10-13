import { Suspense, useCallback, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  OrbitControls,
  Line,
} from "@react-three/drei";
import { CatmullRomCurve3, Group, Mesh, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { EngineModel } from "../components/engine/EngineModel";
import { CameraController } from "../components/engine/CameraController";
import { PerformanceManager } from "../components/engine/PerformanceManager";
import { PartSelectionController } from "../components/engine/PartSelectionController";
import { useEngineStore } from "../stores/engineStore";
import type { LoadedModel, Vec3 } from "../types";
const flowPaths: { group: string; color: string; points: Vec3[] }[] = [
  {
    group: "intake",
    color: "#65c4ff",
    points: [
      [0.12, 0.865, 0],
      [0.39, 0.76, 0],
      [0.8, 0.63, 0],
      [0.88, 0.46, 0],
    ],
  },
  {
    group: "intake",
    color: "#65c4ff",
    points: [
      [0.93, 0.46, -0.08],
      [0.94, 0.49, -0.22],
      [0.77, 0.4, -0.39],
      [0.64, 0.4, -0.39],
      [0.51, 0.4, -0.39],
      [0.38, 0.51, -0.26],
      [0.42, 0.57, 0],
    ],
  },
  {
    group: "exhaust_L",
    color: "#ff8047",
    points: [
      [0.58, 0.38, 0.17],
      [0.58, 0.37, 0.29],
      [0.7, 0.34, 0.33],
      [1.04, 0.42, 0.18],
      [1.07, 0.46, 0.09],
      [1.1, 0.46, 0],
      [1.29, 0.46, 0],
      [1.58, 0.46, 0],
    ],
  },
  {
    group: "cooling_L",
    color: "#efb650",
    points: [
      [0.52, 0.215, 0.12],
      [.57, .15, .22],
      [.75, .145, .43],
      [.92, .212, .48],
    ],
  },
];
function Flow({
  path,
  registry,
}: {
  path: (typeof flowPaths)[number];
  registry: PartSelectionController;
}) {
  const curve = useRef(
    new CatmullRomCurve3(path.points.map((p) => new Vector3(...p))),
  );
  const dots = useRef<(Mesh | null)[]>([]);
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    const assembly = [...registry.entries.values()].find(
      (e) => e.part.assembly_key === path.group,
    )?.object.parent;
    if (assembly && group.current)
      group.current.position.copy(assembly.position);
    if (useEngineStore.getState().reducedMotion) return;
    dots.current.forEach((d, i) =>
      d?.position.copy(
        curve.current.getPoint((clock.elapsedTime * 0.15 + i / 6) % 1),
      ),
    );
  });
  return (
    <group ref={group}>
      <Line
        points={curve.current.getPoints(60)}
        color={path.color}
        lineWidth={1.3}
        transparent
        opacity={0.6}
      />
      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            dots.current[i] = m;
          }}
          position={curve.current.getPoint(i / 6)}
        >
          <sphereGeometry args={[0.006, 8, 6]} />
          <meshBasicMaterial color={path.color} />
        </mesh>
      ))}
    </group>
  );
}
export default function EngineScene({ model }: { model: LoadedModel }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const [registry, setRegistry] = useState<PartSelectionController | null>(
    null,
  );
  const register = useCallback(
    (r: PartSelectionController) => setRegistry(r),
    [],
  );
  const mode = useEngineStore((s) => s.mode),
    stage = useEngineStore((s) => s.stage),
    chapter = useEngineStore((s) => s.chapter),
    flows = useEngineStore((s) => s.flows),
    hovered = useEngineStore((s) => s.hovered);
  const interactive = mode === "lab" || (stage === "story" && chapter === 8);
  useEffect(() => {
    document.body.classList.toggle("hovering-part", !!hovered);
    return () => document.body.classList.remove("hovering-part");
  }, [hovered]);
  return (
    <div
      className={
        "scene-shell " +
        (mode === "lab"
          ? "lab-scene"
          : stage === "hero"
            ? "hero-scene"
            : "story-scene") +
        (stage === "below" && mode !== "lab" ? " scene-dormant" : "")
      }
      aria-label="Интерактивная трёхмерная модель двигателя"
      role="img"
      style={{ pointerEvents: interactive ? "auto" : "none" }}
    >
      <Canvas
        camera={{ position: [2.5, 1.5, 2], fov: 34, near: 0.004, far: 100 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.4]}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 0.82;
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            window.dispatchEvent(new Event("engine-context-lost"));
          });
        }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[1, 4, 3]}
          intensity={1.25}
          color="#e8efff"
        />
        <directionalLight
          position={[-2, 1, -2]}
          intensity={1.1}
          color="#cad7ff"
        />
        <directionalLight
          position={[3, 0.2, -1]}
          intensity={0.45}
          color="#ff472f"
        />
        <Suspense fallback={null}>
          <Environment resolution={256} frames={1}>
            <Lightformer
              form="rect"
              intensity={2.3}
              position={[0, 3, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[5, 2.2, 1]}
            />
            <Lightformer
              form="rect"
              intensity={1.8}
              position={[-3, 1, 0]}
              rotation={[0, Math.PI / 2, 0]}
              scale={[2, 6, 1]}
            />
            <Lightformer
              form="rect"
              intensity={1.4}
              position={[0, 1, 4]}
              scale={[5, 1, 1]}
            />
          </Environment>
        </Suspense>
        <EngineModel model={model} onRegistry={register} />
        <CameraController controls={controls} registry={registry} />
        <PerformanceManager />
        {flows &&
          registry &&
          flowPaths
            .filter((p) =>
              p.group === "cooling_L"
                ? chapter === 7 || mode === "lab"
                : chapter === 4 || mode === "lab",
            )
            .map((p, i) => <Flow key={i} path={p} registry={registry} />)}
        <OrbitControls
          ref={controls}
          enabled={interactive}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={0.055}
          maxDistance={10}
          target={[0.63, 0.4, 0]}
          enablePan={mode === "lab"}
        />
      </Canvas>
    </div>
  );
}
