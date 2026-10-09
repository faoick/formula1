import type { Vec3 } from "../types";
export const chapters = [
  {
    tag: "THE HEART OF SPEED",
    title: "Сердце\nскорости.",
    sub: "1.6L V6 TURBO HYBRID",
    text: "Шесть цилиндров, один турбокомпрессор и электрическая машина. Два источника энергии работают как единая силовая установка.",
    groups: [],
    fact: ["1,6 л", "рабочий объём V6"],
    target: [0.68, 0.38, 0],
    eye: [1.75, 1.15, 1.8],
  },
  {
    tag: "UNDER THE SURFACE",
    title: "За пределами\nоболочки.",
    sub: "ОТ КОРПУСА К МЕХАНИКЕ",
    text: "Крышки уходят в сторону. Под ними — головки, четыре распределительных вала и механизмы, которые связывают каждый рабочий такт.",
    groups: ["covers", "heads", "block"],
    fact: ["90°", "угол между банками"],
    target: [0.6, 0.46, 0],
    eye: [1.0, 0.68, 1.1],
  },
  {
    tag: "THE PISTONS",
    title: "Шесть цилиндров.\nОдна система.",
    sub: "ДАВЛЕНИЕ СТАНОВИТСЯ УСИЛИЕМ",
    text: "Газы давят на днище поршня. Палец передаёт усилие шатуну, а шатун — эксцентричной шейке коленвала. Два банка по три цилиндра образуют V6.",
    groups: ["pistons"],
    fact: ["4 такта", "за два оборота коленвала"],
    target: [0.59, 0.41, 0.13],
    eye: [0.7, 0.47, 0.9],
  },
  {
    tag: "CRANKSHAFT",
    title: "Движение.\nВращение.\nМощность.",
    sub: "КОЛЕНЧАТЫЙ ВАЛ",
    text: "Смещённые шатунные шейки превращают возвратно-поступательное движение во вращение. Коренные опоры передают нагрузку на картер.",
    groups: ["crank"],
    fact: ["6 шеек", "соединяют поршни с валом"],
    target: [0.59, 0.2, 0.08],
    eye: [0.58, 0.34, 0.75],
  },
  {
    tag: "TURBOCHARGER",
    title: "Энергия,\nкоторая остаётся.",
    sub: "FORCED INDUCTION",
    text: "Поток выхлопа раскручивает турбинное колесо. На том же валу компрессор сжимает свежий воздух. После интеркулера он возвращается к цилиндрам.",
    groups: ["turbo_rotor", "turbo_housing", "exhaust", "intake"],
    fact: ["1 вал", "связывает два рабочих колеса"],
    target: [1.28, 0.57, 0.04],
    eye: [-0.66, 0.43, 0.7],
  },
  {
    tag: "VALVETRAIN",
    title: "Точность\nкаждого такта.",
    sub: "ГАЗОРАСПРЕДЕЛЕНИЕ",
    text: "Распредвалы вращаются вдвое медленнее коленвала. Кулачки определяют моменты открытия клапанов, а пневматический возврат закрывает их.",
    groups: ["valves", "cams"],
    fact: ["24", "клапана в этой модели"],
    target: [0.59, 0.85, 0],
    eye: [0.65, 0.6, 0.9],
  },
  {
    tag: "HYBRID POWER",
    title: "Мощность\nза пределами\nсгорания.",
    sub: "POWER BEYOND COMBUSTION",
    text: "При замедлении MGU-K преобразует механическую энергию в электрическую. Energy Store сохраняет её, а инвертор управляет возвратом мощности при разгоне.",
    groups: ["electric"],
    fact: ["350 кВт", "максимум MGU-K¹"],
    target: [0.11, 0.28, 0],
    eye: [1.1, 0.9, 1.45],
  },
  {
    tag: "COOLING & LUBRICATION",
    title: "Управляя\nтемпературой.",
    sub: "CONTROL THE HEAT",
    text: "Охлаждение отводит тепло от нагруженных деталей. Масло разделяет поверхности подшипников; сухой картер откачивает его в отдельный резервуар.",
    groups: ["cooling"],
    fact: ["2 контура", "разные задачи: тепло и трение"],
    target: [0.58, 0.3, -0.3],
    eye: [1.25, 1.4, 1.6],
  },
  {
    tag: "COMPLETE EXPLODED VIEW",
    title: "У каждой детали\nесть назначение.",
    sub: "EVERY COMPONENT HAS A PURPOSE",
    text: "Исследуйте пространственную компоновку. Направления разнесения взяты из исходного Blender-проекта; это учебная экспозиция, а не порядок ремонта.",
    groups: [],
    fact: ["1266", "отдельных деталей"],
    target: [0.9, 0.64, -0.12],
    eye: [3.1, 2.0, 3.2],
  },
  {
    tag: "REASSEMBLY",
    title: "На пределе\nвозможного.",
    sub: "ENGINEERED FOR THE LIMIT",
    text: "Каждая деталь возвращается в исходное положение. Теперь откройте лабораторию: выберите узел, изолируйте его и рассмотрите конструкцию со всех сторон.",
    groups: [],
    fact: ["2026", "новая гибридная архитектура"],
    target: [0.64, 0.4, 0],
    eye: [1.9, 1.25, 2.0],
  },
] as {
  tag: string;
  title: string;
  sub: string;
  text: string;
  groups: string[];
  fact: string[];
  target: Vec3;
  eye: Vec3;
}[];
export const phasePoses: Record<string, number>[] = [
  {},
  { covers: 0.9, heads: 0.2 },
  {
    covers: 1,
    heads: 0.65,
    valves: 0.55,
    cams: 0.6,
    pistons: 0.65,
    crank: 0.2,
  },
  { covers: 1, heads: 0.75, valves: 0.7, cams: 0.7, pistons: 0.8, crank: 0.7 },
  {
    covers: 1,
    heads: 0.4,
    pistons: 0.25,
    turbo_housing: 0.72,
    turbo_rotor: 0.52,
    intake: 0.5,
    exhaust: 0.25,
  },
  { covers: 1, heads: 0.55, valves: 0.65, cams: 0.75 },
  { covers: 0.7, electric: 0.45 },
  { covers: 0.85, cooling: 0.45 },
  { all: 1 },
  { all: 1 },
  {},
];
export function smooth(t: number) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}
export function storyPose(progress: number) {
  const x = Math.max(0, Math.min(1, progress)) * 10;
  const index = Math.min(9, Math.floor(x));
  return {
    a: phasePoses[index],
    b: phasePoses[index + 1],
    t: smooth(x - index),
  };
}
