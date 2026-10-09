import { test } from "node:test";
import assert from "node:assert/strict";
import { Group, Vector3, Mesh, BoxGeometry, MeshStandardMaterial } from "three";
import { ExplodedViewController } from "../src/components/engine/ExplodedViewController";
import { pistonPosition } from "../src/components/engine/WorkingCycleController";
import { PartSelectionController } from "../src/components/engine/PartSelectionController";
import type { Manifest, Part } from "../src/types";
function close(a: number, b: number, eps = 1e-10) {
  assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
}
test("Exploded groups respect rotated, scaled, translated parents and reverse exactly", () => {
  const root = new Group(),
    parent = new Group(),
    group = new Group();
  parent.position.set(2, 3, 4);
  parent.rotation.set(0.2, 0.4, -0.3);
  parent.scale.set(2, 1.5, 0.6);
  root.add(parent);
  parent.add(group);
  group.position.set(0.2, 0.1, 0.3);
  group.userData.assembly_group = "pistons";
  root.updateMatrixWorld(true);
  const initial = group.getWorldPosition(new Vector3());
  const rest = group.position.clone(),
    quaternion = group.quaternion.clone(),
    scale = group.scale.clone();
  const manifest = {
    groups: { pistons: [0.1, 0.5, -0.3] },
  } as unknown as Manifest;
  const c = new ExplodedViewController(root, manifest);
  c.apply(1, 0, false);
  root.updateMatrixWorld(true);
  const current = group.getWorldPosition(new Vector3()).sub(initial);
  [current.x, current.y, current.z].forEach((x, i) =>
    close(x, [0.1, 0.5, -0.3][i]),
  );
  for (let i = 0; i < 200; i++) {
    c.apply((i % 17) / 16, 0, false);
    c.apply(0, 0, false);
  }
  assert.deepEqual(group.position.toArray(), rest.toArray());
  assert.deepEqual(group.quaternion.toArray(), quaternion.toArray());
  assert.deepEqual(group.scale.toArray(), scale.toArray());
});
test("Scroll timeline is deterministic and returns every group at progress 1", () => {
  const root = new Group();
  const groups = ["pistons", "covers", "crank", "electric"];
  const manifest = {
    groups: Object.fromEntries(groups.map((g) => [g, [0.1, 0.3, 0.2]])),
  } as unknown as Manifest;
  for (const name of groups) {
    const group = new Group();
    group.userData.assembly_group = name;
    root.add(group);
  }
  const c = new ExplodedViewController(root, manifest);
  c.apply(0, 0.85, true);
  for (const g of root.children) close(g.position.y, 0.3);
  c.apply(0, 0.35, true);
  const a = root.children.map((g) => g.position.toArray());
  c.apply(0, 0.75, true);
  c.apply(0, 0.35, true);
  assert.deepEqual(
    root.children.map((g) => g.position.toArray()),
    a,
  );
  c.apply(0, 1, true);
  for (const g of root.children)
    assert.deepEqual(g.position.toArray(), [0, 0, 0]);
});
test("Each bank slider-crank maintains the 112mm connecting rod over 720 degrees", () => {
  for (const sign of [-1, 1]) {
    const axis = new Vector3(0, 1 / Math.sqrt(2), sign / Math.sqrt(2));
    let min = Infinity,
      max = -Infinity;
    for (let degree = 0; degree <= 720; degree++) {
      const { crank, piston } = pistonPosition((degree * Math.PI) / 180, axis);
      close(piston.distanceTo(crank), 0.112);
      close(piston.clone().cross(axis).length(), 0);
      const distance = piston.dot(axis);
      min = Math.min(min, distance);
      max = Math.max(max, distance);
    }
    close(max - min, 0.05305, 1e-7);
  }
});
test("Instanced fasteners retain individual IDs and single-material meshes remain drawable", () => {
  const root = new Group(),
    parts: Part[] = [];
  const geometry = new BoxGeometry(0.01, 0.01, 0.01),
    material = new MeshStandardMaterial();
  for (let i = 0; i < 5; i++) {
    const object = new Mesh(geometry, material);
    object.position.set(i * 0.1, 0, 0);
    object.userData.part_id = "B-" + i;
    root.add(object);
    parts.push({
      id: "B-" + i,
      part_id: "B-" + i,
      group: "covers",
      is_detail: true,
      is_casing: false,
      name_en: "Bolt",
      system: "09_VALVE_TRAIN",
      center: [i * 0.1, 0, 0],
    } as Part);
  }
  const graph = new PartSelectionController(root, { parts } as Manifest);
  assert.equal(graph.batches.length, 1);
  assert.equal(graph.batches[0].count, 5);
  assert.equal(graph.partId(graph.batches[0], 3), "B-3");
  close(graph.centerOf("B-3")!.x, 0.3);
  assert.equal(Array.isArray(graph.batches[0].material), false);
  graph.dispose();
});
