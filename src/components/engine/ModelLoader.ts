import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import type { LoadedModel, Manifest } from "../../types";
let pending: Promise<LoadedModel> | null = null;
export function loadEngine(
  onProgress: (n: number) => void,
): Promise<LoadedModel> {
  if (pending) return pending;
  pending = (async () => {
    const response = await fetch("/models/manifest.json");
    if (!response.ok) throw Error("Не удалось загрузить каталог деталей.");
    const manifest: Manifest = await response.json();
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(manifest.model + '?revision=' + manifest.version, (e) => {
      if (e.total > 0)
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    });
    const actual = new Set<string>();
    gltf.scene.traverse((o) => {
      if (o.userData.part_id) actual.add(o.userData.part_id);
    });
    if (actual.size !== manifest.parts.length)
      throw Error("Модель и каталог не совпадают. Повторите экспорт.");
    onProgress(100);
    return { scene: gltf.scene, manifest };
  })().catch((e) => {
    pending = null;
    throw e;
  });
  return pending;
}
