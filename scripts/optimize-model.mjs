import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import fs from "node:fs/promises";
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const doc = await io.read("artifacts/engine.source.glb");
const ids = doc
  .getRoot()
  .listNodes()
  .map((n) => n.getExtras().part_id)
  .filter(Boolean);
await doc.transform(
  dedup({ propertyTypes: ["Accessor", "Mesh", "Material", "Texture"] }),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
await io.write("public/models/engine.glb", doc);
const after = await io.read("public/models/engine.glb");
if (
  ids.join("|") !==
  after
    .getRoot()
    .listNodes()
    .map((n) => n.getExtras().part_id)
    .filter(Boolean)
    .join("|")
)
  throw Error("Part IDs changed");
console.log(
  JSON.stringify({
    parts: ids.length,
    source_bytes: (await fs.stat("artifacts/engine.source.glb")).size,
    compressed_bytes: (await fs.stat("public/models/engine.glb")).size,
  }),
);

