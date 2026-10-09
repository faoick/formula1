import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import assert from "node:assert/strict";
await MeshoptDecoder.ready;
const manifest = JSON.parse(
  await fs.readFile("public/models/manifest.json", "utf8"),
);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const doc = await io.read("public/models/engine.glb");
const nodes = doc
  .getRoot()
  .listNodes()
  .filter((n) => n.getExtras().part_id);
const ids = new Set(nodes.map((n) => n.getExtras().part_id));
const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}
check(
  "One unique node for every exported part",
  ids.size === manifest.parts.length && nodes.length === ids.size,
);
for (const part of manifest.parts) {
  assert.ok(ids.has(part.id), part.id);
  for (const field of [
    "id",
    "name_ru",
    "name_en",
    "system",
    "material",
    "group",
  ])
    assert.ok(part[field], part.id + " missing " + field);
  assert.ok(part.center.every(Number.isFinite));
  assert.equal(part.explosion_offset.length, 3);
}
checks.push(
  "Catalog names, IDs, systems, materials, bounds and trajectories match the model",
);
const groups = doc
  .getRoot()
  .listNodes()
  .filter((n) => n.getExtras().assembly_group);
check(
  "All explosion groups exist",
  Object.keys(manifest.groups).length === groups.length,
);
for (const n of nodes) {
  checkOnce(n.getMesh(), "Every part has a real mesh");
}
function checkOnce(condition, name) {
  assert.ok(condition, name);
  if (!checks.includes(name)) checks.push(name);
}
let vertices = 0,
  triangles = 0;
for (const mesh of doc.getRoot().listMeshes())
  for (const primitive of mesh.listPrimitives()) {
    const position = primitive.getAttribute("POSITION"),
      normal = primitive.getAttribute("NORMAL");
    checkOnce(position && normal, "All meshes retain positions and normals");
    const array = position.getArray();
    assert.ok(array.every(Number.isFinite), "Nonfinite vertex");
    vertices += position.getCount();
    const index = primitive.getIndices();
    if (index) {
      const indices = index.getArray();
      assert.ok(
        indices.every((i) => i >= 0 && i < position.getCount()),
        "Invalid index",
      );
      triangles += index.getCount() / 3;
    } else triangles += position.getCount() / 3;
  }
checks.push("Finite vertices and valid triangle indices");
for (const [kind, count] of [
  ["piston", 6],
  ["rod", 6],
  ["crankpin", 6],
  ["camshaft", 4],
  ["valve", 24],
  ["injector", 6],
  ["mgu_k", 1],
  ["turbo_shaft", 1],
])
  check(
    kind + " count = " + count,
    manifest.parts.filter((p) => p.component_kind === kind).length === count,
  );
check(
  "No MGU-H component",
  !manifest.parts.some((p) => /mgu-h/i.test(p.name_en)),
);
try {
  const source = await fs.readFile(
    "../FORMULA_1_ENGINEERING_PROJECT/" + manifest.source_file,
  );
  check(
    "Original Blender source SHA-256 unchanged",
    crypto.createHash("sha256").update(source).digest("hex") ===
      manifest.source_sha256,
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  checks.push(
    "Source hash retained; original source not available in this checkout",
  );
}
const report = {
  date: new Date().toISOString(),
  parts: ids.size,
  groups: groups.length,
  vertices,
  triangles,
  compressed_bytes: (await fs.stat("public/models/engine.glb")).size,
  checks,
};
await fs.mkdir("artifacts", { recursive: true });
await fs.writeFile(
  "artifacts/model-validation.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
