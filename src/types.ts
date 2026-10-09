import type { Group } from "three";
export type Vec3 = [number, number, number];
export type SystemId =
  | "engine"
  | "pistons"
  | "valves"
  | "turbo"
  | "hybrid"
  | "fuel"
  | "cooling"
  | "oil"
  | "electric"
  | "transmission";
export interface Part {
  id: string;
  part_id: string;
  name_ru: string;
  name_en: string;
  description: string;
  function: string;
  system: string;
  material: string;
  group: string;
  component_kind: string;
  center: Vec3;
  explosion_offset: Vec3;
  bounds: Vec3[];
  is_casing: boolean;
  is_detail: boolean;
  connections?: string[] | string;
  cylinder_index?: number;
  axis_origin?: Vec3;
  axis_direction?: Vec3;
  pin_center?: Vec3;
  crankpin_center?: Vec3;
  big_end?: Vec3;
  small_end?: Vec3;
  rod_length?: number;
}
export interface Manifest {
  version: number;
  source_file: string;
  source_sha256: string;
  blender_version: string;
  units: string;
  model: string;
  parts: Part[];
  groups: Record<string, Vec3>;
  educational_reconstruction: boolean;
}
export interface LoadedModel {
  scene: Group;
  manifest: Manifest;
}
export const SYSTEMS: { id: SystemId; name: string; code: string }[] = [
  { id: "engine", name: "Блок и головки", code: "01" },
  { id: "pistons", name: "Поршневая группа", code: "02" },
  { id: "valves", name: "Газораспределение", code: "03" },
  { id: "turbo", name: "Турбонаддув", code: "04" },
  { id: "hybrid", name: "Гибридная система", code: "05" },
  { id: "fuel", name: "Топливная система", code: "06" },
  { id: "cooling", name: "Охлаждение", code: "07" },
  { id: "oil", name: "Смазка", code: "08" },
  { id: "electric", name: "Электрика", code: "09" },
  { id: "transmission", name: "Трансмиссия", code: "10" },
];
export function systemOf(p: Part): SystemId {
  const n = Number(p.system.slice(0, 2));
  if (n === 7) return "engine";
  if (n === 8) return "pistons";
  if (n === 9) return "valves";
  if (n === 10) return "turbo";
  if (n === 11) return "fuel";
  if (n === 12)
    return /oil|scavenge|масл/i.test(p.name_en + " " + p.name_ru)
      ? "oil"
      : "cooling";
  if (n === 13) return "hybrid";
  if (n === 14 || n === 15) return "transmission";
  return "electric";
}
