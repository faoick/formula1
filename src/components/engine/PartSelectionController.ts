import {
  Box3,
  Color,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import type { Manifest, Part } from "../../types";
import { systemOf } from "../../types";
import type { EngineState } from "../../stores/engineStore";
export interface Entry {
  part: Part;
  object: Object3D;
  meshes: Mesh[];
  center: Vector3;
  rest: Matrix4;
  batch?: { mesh: InstancedMesh; index: number; matrix: Matrix4 };
}
export class PartSelectionController {
  entries = new Map<string, Entry>();
  batches: InstancedMesh[] = [];
  private signature = "";
  private transitions = new Map<
    MeshStandardMaterial,
    {
      color: Color;
      env: number;
      opacity: number;
      emissive: Color;
      emission: number;
      object: Object3D;
      visible: boolean;
    }
  >();
  constructor(
    public root: Object3D,
    manifest: Manifest,
  ) {
    const data = new Map(manifest.parts.map((p) => [p.id, p]));
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      const part = data.get(o.userData.part_id);
      if (!part) return;
      const meshes: Mesh[] = [];
      o.traverse((n) => {
        if (n instanceof Mesh) meshes.push(n);
      });
      const center = new Box3().setFromObject(o).getCenter(new Vector3());
      o.worldToLocal(center);
      this.entries.set(part.id, {
        part,
        object: o,
        meshes,
        center,
        rest: o.matrix.clone(),
      });
    });
    // Batch only exactly shared geometry/material in the same assembly. IDs stay individually selectable.
    const candidates = new Map<string, Entry[]>();
    for (const e of this.entries.values()) {
      if (
        e.part.is_casing ||
        ["pistons", "crank"].includes(e.part.group) ||
        e.meshes.length !== 1 ||
        e.object !== e.meshes[0]
      )
        continue;
      const m = e.meshes[0];
      const key = [
        m.geometry.uuid,
        (m.material as MeshStandardMaterial).uuid,
        m.parent?.uuid,
      ].join("/");
      candidates.set(key, [...(candidates.get(key) || []), e]);
    }
    for (const list of candidates.values()) {
      if (list.length < 3) continue;
      const sample = list[0].meshes[0];
      const batch = new InstancedMesh(
        sample.geometry,
        (sample.material as MeshStandardMaterial).clone(),
        list.length,
      );
      batch.name = "Repeated hardware | " + list[0].part.group;
      batch.userData.partIds = list.map((e) => e.part.id);
      sample.parent!.add(batch);
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        e.object.updateMatrix();
        const matrix = e.object.matrix.clone();
        batch.setMatrixAt(i, matrix);
        batch.setColorAt(i, new Color("white"));
        e.batch = { mesh: batch, index: i, matrix };
        e.object.visible = false;
      }
      batch.computeBoundingSphere();
      this.batches.push(batch);
    }
    for (const e of this.entries.values())
      if (!e.batch)
        for (const mesh of e.meshes) {
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map((m) => m.clone())
            : mesh.material.clone();
          for (const mat of (Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]) as MeshStandardMaterial[])
            mat.userData.originalColor = mat.color.clone();
        }
  }
  centerOf(id: string) {
    const e = this.entries.get(id);
    return e ? e.object.localToWorld(e.center.clone()) : null;
  }
  radiusOf(id: string) {
    const e = this.entries.get(id);
    if (!e) return 0.15;
    const size = new Box3()
      .setFromObject(e.object)
      .getSize(new Vector3())
      .length();
    return Math.max(0.065, Math.min(0.8, size));
  }
  style(
    state: EngineState,
    highlight: string[],
    storyReveal: boolean,
    low: boolean,
  ) {
    const sig = JSON.stringify([
      state.mode,
      state.stage,
      state.chapter,
      state.systems,
      state.selected,
      state.hovered,
      state.isolate,
      state.xray,
      state.hideCasing,
      state.playing,
      state.reducedMotion,
      highlight,
      storyReveal,
      low,
    ]);
    if (sig === this.signature) return;
    const initial = !this.signature;
    this.signature = sig;
    const selected = state.selected;
    for (const [id, e] of this.entries) {
      const p = e.part;
      let visible =
        state.mode === "story" || state.systems.includes(systemOf(p));
      if (state.mode === "lab" && state.hideCasing && p.is_casing)
        visible = false;
      if (state.mode === "lab" && state.isolate && selected && selected !== id)
        visible = false;
      if (low && p.is_detail && id !== selected && id !== state.hovered)
        visible = false;
      if (state.mode === "story" && state.chapter < 8) {
        const name = p.name_en.toLowerCase();
        const hero = state.stage === "hero" || state.chapter === 0;
        const focusGroups =
          state.chapter === 6
            ? ["electric", "block", "crank"]
            : state.chapter === 7
              ? ["cooling", "block", "electric"]
              : [];
        if (
          ["gearbox", "gearbox_shell", "drivetrain", "wiring"].includes(p.group)
        )
          visible = false;
        if (hero || state.chapter < 6) {
          if (p.group === "cooling") visible = false;
          if (p.group === "electric" && !/mgu|stator/.test(name))
            visible = false;
          if (
            /fuel cell|fuel supply|fresh air trunk|tailpipe|wastegate outlet/.test(
              name,
            )
          )
            visible = false;
        }
        if (focusGroups.length && !focusGroups.includes(p.group))
          visible = false;
      }
      if (state.mode === "lab" && state.playing)
        visible = Number(p.system.slice(0, 2)) === 8;
      e.object.userData.webVisible = visible;
      const hot = id === selected || id === state.hovered;
      const dim = selected
        ? selected !== id
        : highlight.length > 0 && !highlight.includes(p.group);
      if (e.batch) {
        const { mesh, index, matrix } = e.batch;
        mesh.setMatrixAt(
          index,
          visible ? matrix : new Matrix4().makeScale(0, 0, 0),
        );
        mesh.setColorAt(
          index,
          new Color(hot ? "#ff392e" : dim ? "#454951" : "#ffffff"),
        );
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor!.needsUpdate = true;
        continue;
      }
      const wasVisible = e.object.visible;
      const soften = state.mode === "story" && !initial && !state.reducedMotion;
      e.object.visible = visible || (soften && wasVisible);
      for (const mesh of e.meshes)
        for (const mat of (Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]) as MeshStandardMaterial[]) {
          if (!mat.isMeshStandardMaterial) continue;
          const color: Color = mat.userData.originalColor.clone();
          if (dim) color.multiplyScalar(state.mode === "story" ? 0.2 : 0.5);
          const env = dim && state.mode === "story" ? 0.18 : 1;
          const emissive = new Color(hot ? "#e10600" : "#000000");
          const transparent = !!(
            p.is_casing &&
            (state.mode === "lab"
              ? state.xray || (selected && selected !== id)
              : storyReveal)
          );
          const opacity = soften && !visible ? 0 : transparent ? 0.12 : 1;
          if (soften && visible && !wasVisible) mat.opacity = 0;
          const goal = {
            color,
            env,
            opacity,
            emissive,
            emission: hot ? 0.09 : 0,
            object: e.object,
            visible,
          };
          if (initial || state.reducedMotion) {
            if (mat.transparent !== transparent) mat.needsUpdate = true;
            mat.color.copy(color);
            mat.envMapIntensity = env;
            mat.opacity = opacity;
            mat.emissive.copy(emissive);
            mat.emissiveIntensity = goal.emission;
            mat.transparent = transparent;
            mat.depthWrite = !transparent;
            this.transitions.delete(mat);
          } else {
            this.transitions.set(mat, goal);
            if (opacity < 1 || mat.opacity < 1) {
              if (!mat.transparent) mat.needsUpdate = true;
              mat.transparent = true;
              mat.depthWrite = false;
            }
          }
        }
    }
  }
  animateMaterials(dt: number) {
    const a = 1 - Math.exp(-Math.min(dt, 0.05) * 8);
    for (const [mat, g] of this.transitions) {
      mat.color.lerp(g.color, a);
      mat.emissive.lerp(g.emissive, a);
      mat.opacity += (g.opacity - mat.opacity) * a;
      mat.envMapIntensity += (g.env - mat.envMapIntensity) * a;
      mat.emissiveIntensity += (g.emission - mat.emissiveIntensity) * a;
      if (
        Math.abs(mat.opacity - g.opacity) +
          Math.abs(mat.envMapIntensity - g.env) +
          Math.abs(mat.color.r - g.color.r) +
          Math.abs(mat.color.g - g.color.g) +
          Math.abs(mat.color.b - g.color.b) <
        0.002
      ) {
        mat.opacity = g.opacity;
        mat.color.copy(g.color);
        mat.envMapIntensity = g.env;
        mat.emissive.copy(g.emissive);
        mat.emissiveIntensity = g.emission;
        if (mat.transparent !== g.opacity < 1) mat.needsUpdate = true;
        mat.transparent = g.opacity < 1;
        mat.depthWrite = g.opacity === 1;
        g.object.visible = g.visible;
        this.transitions.delete(mat);
      }
    }
  }
  partId(object: Object3D, instanceId?: number) {
    if (object instanceof InstancedMesh && instanceId !== undefined)
      return object.userData.partIds[instanceId] as string;
    let cursor: Object3D | null = object;
    while (cursor) {
      if (cursor.userData.part_id) return cursor.userData.part_id as string;
      cursor = cursor.parent;
    }
    return null;
  }
  dispose() {
    for (const e of this.entries.values())
      if (!e.batch)
        for (const m of e.meshes)
          for (const mat of Array.isArray(m.material)
            ? m.material
            : [m.material])
            mat.dispose();
    for (const b of this.batches) {
      (b.material as MeshStandardMaterial).dispose();
      b.removeFromParent();
    }
  }
}
