import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Group } from "three";
import { useEngineStore } from "../../stores/engineStore";
import type { PartSelectionController } from "./PartSelectionController";
function Label({
  id,
  registry,
  index,
}: {
  id: string;
  registry: PartSelectionController;
  index: number;
}) {
  const ref = useRef<Group>(null);
  const p = registry.entries.get(id)!.part;
  useFrame(() => {
    const pos = registry.centerOf(id);
    if (pos && ref.current) ref.current.position.copy(pos).addScalar(0);
  });
  return (
    <group ref={ref}>
      <Html distanceFactor={2.8} zIndexRange={[12, 1]}>
        <button
          className={"technical-label label-" + (index % 2)}
          onClick={() => useEngineStore.getState().select(id)}
        >
          <span>{id}</span>
          {p.name_ru}
          <i />
        </button>
      </Html>
    </group>
  );
}
export function TechnicalLabels({
  registry,
  ids: specified,
}: {
  registry: PartSelectionController;
  ids?: string[];
}) {
  const selected = useEngineStore((s) => s.selected);
  const ids =
    specified ??
    (selected
      ? [selected]
      : ["INT-0007", "INT-0132", "HYB-0001"].filter((id) =>
          registry.entries.has(id),
        ));
  return (
    <>
      {ids.map((id, i) => (
        <Label key={id} id={id} registry={registry} index={i} />
      ))}
    </>
  );
}
