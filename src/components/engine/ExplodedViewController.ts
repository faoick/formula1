import { Object3D, Vector3, Quaternion } from "three";
import type { Manifest } from "../../types";
import { storyAssembly, trajectoryAmount } from "./assemblyTimeline";
export class ExplodedViewController {
  readonly groups = new Map<
    string,
    {
      object: Object3D;
      position: Vector3;
      quaternion: Quaternion;
      scale: Vector3;
      offset: Vector3;
    }
  >();
  constructor(root: Object3D, private manifest: Manifest) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      const name = o.userData.assembly_group;
      if (name && manifest.groups[name]) {
        // Metadata vectors are WORLD directions. Convert direction through the parent's inverse
        // rotation/scale (no translation), so nested and rotated assemblies remain reversible.
        const world = new Vector3(...manifest.groups[name]);
        let local = world;
        if (o.parent) {
          const a = o.parent.worldToLocal(world.clone()),
            b = o.parent.worldToLocal(new Vector3());
          local = a.sub(b);
        }
        this.groups.set(name, {
          object: o,
          position: o.position.clone(),
          quaternion: o.quaternion.clone(),
          scale: o.scale.clone(),
          offset: local,
        });
      }
    });
  }
  apply(
    assembly: number,
    progress: number,
    story: boolean,
    overrides: Record<string, number> = {},
  ) {
    let clock = story ? storyAssembly(progress) : assembly;
    // A requested inner assembly automatically clears earlier removal stages.
    // Manual controls cannot pull a piston through an attached cylinder head.
    if (!story) for (const [name,value] of Object.entries(overrides)) {
      const route = this.manifest.trajectories?.[name];
      if(route && value>0) clock = Math.max(clock, route.start+(route.end-route.start)*value);
    }
    for (const [name, g] of this.groups) {
      const route = this.manifest.trajectories?.[name];
      const p = route ? trajectoryAmount(clock,route.start,route.end) : clock;
      g.object.position
        .copy(g.position)
        .addScaledVector(g.offset, Math.max(0, Math.min(1, p)));
      g.object.quaternion.copy(g.quaternion);
      g.object.scale.copy(g.scale);
    }
  }
  reset() {
    this.apply(0, 0, false);
  }
}
