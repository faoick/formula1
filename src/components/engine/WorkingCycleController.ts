import { Matrix4, Quaternion, Vector3 } from "three";
import { PartSelectionController, type Entry } from "./PartSelectionController";
const convert = (a: number[]) => new Vector3(a[0], a[2], -a[1]);
export function pistonPosition(
  theta: number,
  axis: Vector3,
  radius = 0.026525,
  length = 0.112,
) {
  const crank = new Vector3(
    0,
    Math.cos(theta) * radius,
    -Math.sin(theta) * radius,
  );
  const projected = crank.dot(axis);
  const t =
    projected +
    Math.sqrt(length * length - crank.lengthSq() + projected * projected);
  return { crank, piston: axis.clone().multiplyScalar(t) };
}
export class WorkingCycleController {
  private phase = 0;
  private active = false;
  get angle() { return this.phase; }
  get running() { return this.active; }
  private parentBases = new Map<string, Matrix4>();
  private bases = new Map<string, Matrix4>();
  private pistons: {
    entry: Entry;
    root: Vector3;
    axis: Vector3;
    pin: Vector3;
    crank: Vector3;
    theta: number;
  }[] = [];
  constructor(private registry: PartSelectionController) {
    registry.root.updateMatrixWorld(true);
    for (const [id, e] of registry.entries) {
      this.bases.set(id, e.object.matrixWorld.clone());
      this.parentBases.set(id,e.object.parent!.matrixWorld.clone().invert());
      if (
        e.part.component_kind === "piston" &&
        e.part.axis_origin &&
        e.part.pin_center &&
        e.part.crankpin_center
      ) {
        const root = convert(e.part.axis_origin);
        const crank = convert(e.part.crankpin_center);
        const delta = crank.clone().sub(root);
        this.pistons.push({
          entry: e,
          root,
          axis: convert(e.part.axis_direction!),
          pin: convert(e.part.pin_center),
          crank,
          theta: Math.atan2(-delta.z, delta.y),
        });
      }
    }
  }
  update(playing: boolean, delta: number, authoredPhase?: number) {
    if (!playing) {
      if (this.active) {
        for (const e of this.registry.entries.values()) {
          e.object.matrix.copy(e.rest);
          e.object.matrix.decompose(
            e.object.position,
            e.object.quaternion,
            e.object.scale,
          );
        }
        this.phase = 0;
      }
      this.active = playing;
      return;
    }
    this.active = true;
    this.phase = authoredPhase ?? this.phase + delta * 0.9;
    for (const [id, e] of this.registry.entries) {
      if (e.part.group === "crank" && !/bearing/i.test(e.part.name_en)) {
        const pivot = new Vector3(0, 0.255, 0);
        const transform = new Matrix4()
          .makeTranslation(...pivot.toArray())
          .multiply(new Matrix4().makeRotationX(-this.phase))
          .multiply(new Matrix4().makeTranslation(0, -0.255, 0));
        this.assign(e, transform.multiply(this.bases.get(id)!));
      }
      if (e.part.group !== "pistons") continue;
      const p = this.pistons.find(p => p.entry.part.cylinder_index === e.part.cylinder_index);
      if (!p) throw new Error(`Missing authored cylinder binding for ${id}`);
      const state = pistonPosition(p.theta + this.phase, p.axis);
      const pin = state.piston.add(p.root),
        crank = state.crank.add(p.root);
      let transform: Matrix4;
      if (e.part.motion_role === "rod") {
        const rotation = new Quaternion().setFromUnitVectors(
          p.pin.clone().sub(p.crank).normalize(),
          pin.clone().sub(crank).normalize(),
        );
        transform = new Matrix4()
          .makeTranslation(...crank.toArray())
          .multiply(new Matrix4().makeRotationFromQuaternion(rotation))
          .multiply(
            new Matrix4().makeTranslation(
              ...p.crank.clone().negate().toArray(),
            ),
          );
      } else {
        const isBig = e.part.motion_role === "bearing";
        const shift = isBig
          ? crank.clone().sub(p.crank)
          : pin.clone().sub(p.pin);
        transform = new Matrix4().makeTranslation(...shift.toArray());
      }
      this.assign(e, transform.multiply(this.bases.get(id)!));
    }
  }
  private assign(e: Entry, world: Matrix4) {
    // Work in the original assembly frame. The exploded parent still positions
    // the entire mechanism, instead of the animation cancelling its translation.
    const local = this.parentBases.get(e.part.id)!.clone().multiply(world);
    local.decompose(e.object.position, e.object.quaternion, e.object.scale);
  }
}
