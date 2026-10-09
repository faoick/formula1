import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useEngineStore } from "../../stores/engineStore";
export function PerformanceManager() {
  const { setDpr, gl } = useThree();
  const quality = useEngineStore((s) => s.quality);
  const mode = useEngineStore((s) => s.mode);
  const stage = useEngineStore((s) => s.stage);
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    const mobile = window.innerWidth < 800;
    setDpr(
      quality === "low"
        ? 1
        : quality === "high"
          ? Math.min(devicePixelRatio, 1.75)
          : mobile
            ? 1
            : Math.min(devicePixelRatio, 1.4),
    );
  }, [quality, setDpr]);
  useEffect(() => {
    setFrameloop(mode === "lab" || stage !== "below" ? "always" : "demand");
  }, [mode, stage, setFrameloop]);
  useFrame(() => {
    if (import.meta.env.DEV)
      (window as unknown as { __engineStats: unknown }).__engineStats = {
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      };
  });
  return null;
}
