import { Vector3 } from "three";
import type { Vec3 } from "../../types";
import { ease5 } from "./assemblyTimeline";
import type { PartSelectionController } from "./PartSelectionController";
type Shot = {
  at: number;
  ids?: string[];
  target: Vec3;
  eye: Vec3;
  caption: string;
};
// Editorial holds and macro shots. All focus points follow the actual moving geometry.
export const shots: Shot[] = [
  {
    at: 0,
    target: [0.69, 0.39, 0],
    eye: [0.86, 0.62, 1.11],
    caption: "Силовая установка в сборе",
  },
  {
    at: 0.08,
    target: [0.66, 0.4, 0],
    eye: [1.15, 0.8, 1.35],
    caption: "Компоновка V6",
  },
  {
    at: 0.16,
    target: [0.59, 0.55, 0],
    eye: [0.95, 0.7, 1.2],
    caption: "Последовательно освобождаем внутренние узлы",
  },
  {
    at: 0.23,
    ids: ["INT-0007", "INT-0048", "INT-0089"],
    target: [0.59, 0.68, 0.4],
    eye: [0.48, 0.3, 0.73],
    caption: "Поршни выходят вдоль осей своих цилиндров",
  },
  {
    at: 0.265,
    ids: ["INT-0007"],
    target: [0.48, 0.67, 0.4],
    eye: [0.21, 0.16, 0.36],
    caption: "Днище поршня · выборки под клапаны · три кольца",
  },
  {
    at: 0.29,
    ids: ["INT-0004"],
    target: [0.48, 0.61, 0.4],
    eye: [0.24, 0.16, 0.37],
    caption: "Палец и I-образный шатун · единая кинематическая цепь",
  },
  {
    at: 0.34,
    ids: ["INT-0132", "INT-0133"],
    target: [0.59, -0.045, 0],
    eye: [0.58, 0.33, 0.7],
    caption: "Коренные шейки и профилированные щёки",
  },
  {
    at: 0.375,
    ids: ["INT-0001"],
    target: [0.48, -0.02, 0],
    eye: [0.23, 0.16, 0.35],
    caption: "Эксцентриситет шатунной шейки задаёт ход поршня",
  },
  {
    at: 0.435,
    target: [1, 1.08, 0],
    eye: [-0.39, 0.24, 0.51],
    caption: "Компрессор и турбина · два колеса на одном валу",
  },
  {
    at: 0.475,
    target: [0.93, 1.08, 0],
    eye: [-0.23, 0.12, 0.27],
    caption: "Изогнутые рабочие лопатки компрессора",
  },
  {
    at: 0.535,
    target: [0.59, 1.32, 1.075],
    eye: [0.47, 0.32, 0.65],
    caption: "Распределительные валы · профиль кулачка",
  },
  {
    at: 0.575,
    target: [0.47, 1.1, 0.85],
    eye: [0.23, 0.15, 0.31],
    caption: "Клапан · направляющая · пневматический возврат",
  },
  {
    at: 0.635,
    ids: ["HYB-0001"],
    target: [-0.64, 0.3, 0],
    eye: [0.58, 0.4, 0.8],
    caption: "MGU-K · механическая связь с силовой установкой",
  },
  {
    at: 0.675,
    ids: ["HYB-0003"],
    target: [-0.8, 0.3, 0],
    eye: [0.7, 0.48, 0.9],
    caption: "Преобразование и хранение электрической энергии",
  },
  {
    at: 0.735,
    ids: ["CL-0125"],
    target: [0.77, 0.26, 1.78],
    eye: [0.43, 0.3, 0.6],
    caption: "Маслобак вынесен за пределы горячего выпуска",
  },
  {
    at: 0.775,
    target: [0.02, 0.3, 1.85],
    eye: [0.65, 0.45, 0.9],
    caption: "Радиатор · бачки · теплообменные трубки",
  },
  {
    at: 0.82,
    target: [0.65, 0.65, 0],
    eye: [3.45, 2.3, 4.1],
    caption: "Полная разборка · вращайте экспозицию",
  },
  {
    at: 0.9,
    target: [0.65, 0.65, 0],
    eye: [3.45, 2.3, 4.1],
    caption: "Обратная последовательность сборки",
  },
  {
    at: 1,
    target: [0.66, 0.4, 0],
    eye: [1.35, 0.95, 1.55],
    caption: "Все детали точно на исходных местах",
  },
];
function anchor(shot: Shot, registry: PartSelectionController | null) {
  const points = shot.ids
    ?.map((id) => registry?.centerOf(id))
    .filter((p): p is Vector3 => !!p);
  return points?.length
    ? points
        .reduce((sum, p) => sum.add(p), new Vector3())
        .divideScalar(points.length)
    : new Vector3(...shot.target);
}
export function cinematicView(
  progress: number,
  registry: PartSelectionController | null,
) {
  const i = Math.max(
    0,
    shots.findIndex(
      (s, j) => j < shots.length - 1 && progress <= shots[j + 1].at,
    ),
  );
  const a = shots[i],
    b = shots[Math.min(shots.length - 1, i + 1)];
  const raw = Math.max(0, Math.min(1, (progress - a.at) / (b.at - a.at || 1)));
  // A short hold at each shot, followed by a zero-velocity, zero-acceleration transition.
  const t = ease5((raw - 0.22) / 0.7);
  const target = anchor(a, registry).lerp(anchor(b, registry), t);
  const offset = new Vector3(...a.eye).lerp(new Vector3(...b.eye), t);
  // Lift out between macro shots so the camera never takes a straight shortcut through the part.
  offset.multiplyScalar(1 + Math.sin(Math.PI * t) ** 2 * 0.18);
  return { target, offset };
}
export function shotCaption(p: number) {
  return (
    [...shots].reverse().find((s) => p >= s.at)?.caption ?? shots[0].caption
  );
}
