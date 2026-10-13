import { Matrix4 } from 'three';
import type { PartSelectionController } from './PartSelectionController';
import { ease5 } from './assemblyTimeline';
export class TurboRotorController {
  private entries;
  private active=false;
  constructor(graph:PartSelectionController) {
    this.entries=[...graph.entries.values()].filter(e=>e.part.group==='turbo_rotor').map(e=>({e,world:e.object.matrixWorld.clone(),parent:e.object.parent!.matrixWorld.clone().invert()}));
  }
  update(progress:number,enabled:boolean) {
    const active=enabled&&progress>=.41&&progress<.49;
    if(!active&&!this.active)return;
    this.active=active;
    const angle=active?Math.PI*6*ease5((progress-.41)/.08):0;
    const spin=new Matrix4().makeTranslation(0,.46,0).multiply(new Matrix4().makeRotationX(angle)).multiply(new Matrix4().makeTranslation(0,-.46,0));
    for(const {e,world,parent} of this.entries) {
      const local=parent.clone().multiply(spin).multiply(world);
      local.decompose(e.object.position,e.object.quaternion,e.object.scale);
    }
  }
}
