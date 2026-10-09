import { create } from "zustand";
import { SYSTEMS, type SystemId, type Vec3 } from "../types";
export interface EngineState {
  mode: "story" | "lab";
  stage: "hero" | "story" | "below";
  progress: number;
  chapter: number;
  assembly: number;
  systemAssembly: Record<string, number>;
  selected: string | null;
  hovered: string | null;
  isolate: boolean;
  xray: boolean;
  hideCasing: boolean;
  labels: boolean;
  flows: boolean;
  playing: boolean;
  presentation: boolean;
  systems: SystemId[];
  quality: "auto" | "high" | "low";
  cameraReset: number;
  focusToken: number;
  reducedMotion: boolean;
  sharedCamera: { position: Vec3; target: Vec3 } | null;
  set: (v: Partial<EngineState>) => void;
  select: (id: string | null) => void;
  toggleSystem: (id: SystemId) => void;
  reset: () => void;
}
export const useEngineStore = create<EngineState>((set, get) => ({
  mode: "story",
  stage: "hero",
  progress: 0,
  chapter: 0,
  assembly: 0,
  systemAssembly: {},
  selected: null,
  hovered: null,
  isolate: false,
  xray: false,
  hideCasing: false,
  labels: false,
  flows: false,
  playing: false,
  presentation: false,
  systems: SYSTEMS.map((s) => s.id),
  quality: "auto",
  cameraReset: 0,
  focusToken: 0,
  reducedMotion:
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  sharedCamera: null,
  set,
  select: (id) =>
    set({ selected: id, focusToken: get().focusToken + 1, playing: false }),
  toggleSystem: (id) =>
    set({
      systems: get().systems.includes(id)
        ? get().systems.filter((s) => s !== id)
        : [...get().systems, id],
    }),
  reset: () =>
    set({
      assembly: 0,
      systemAssembly: {},
      selected: null,
      hovered: null,
      isolate: false,
      xray: false,
      hideCasing: false,
      labels: false,
      flows: false,
      playing: false,
      systems: SYSTEMS.map((s) => s.id),
      cameraReset: get().cameraReset + 1,
      sharedCamera: null,
    }),
}));
export function enterLab(id?: string) {
  const params = new URLSearchParams();
  if (id) params.set("part", id);
  location.hash = "lab" + (params.size ? "?" + params : "");
  useEngineStore.setState({ mode: "lab", playing: false });
  if (id) useEngineStore.getState().select(id);
}
