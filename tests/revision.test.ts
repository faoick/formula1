import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3, Matrix4, Texture } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { PartSelectionController } from '../src/components/engine/PartSelectionController';
import { WorkingCycleController } from '../src/components/engine/WorkingCycleController';
import { ExplodedViewController } from '../src/components/engine/ExplodedViewController';
import { storyAssembly, trajectoryAmount } from '../src/components/engine/assemblyTimeline';
import type { Manifest } from '../src/types';
const manifest:Manifest=JSON.parse(readFileSync('public/models/manifest.json','utf8'));
async function model() {
  const bytes=readFileSync('public/models/engine.glb');
  // Node has no image decoder. These tests exercise real geometry and transforms;
  // embedded textures are decoded and checked in the browser smoke test.
  return (await new GLTFLoader().register(()=>({name:'NodeGeometryTextureStub',loadTexture:()=>Promise.resolve(new Texture())})).setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength), '')).scene;
}
test('Real piston hardware stays on its authored cylinder throughout two crank revolutions',async()=>{
  const graph=new PartSelectionController(await model(),manifest);
  const rig=new WorkingCycleController(graph);
  const pistons=manifest.parts.filter(p=>p.component_kind==='piston');
  const attached=manifest.parts.filter(p=>p.group==='pistons' && p.motion_role==='piston');
  assert.equal(pistons.length,6);
  assert.equal(manifest.parts.filter(p=>p.component_kind==='pin_boss').length,12);
  const offsets=new Map(attached.map(p=>[p.id,graph.centerOf(p.id)!.sub(graph.centerOf(pistons.find(s=>s.cylinder_index===p.cylinder_index)!.id)!)]));
  for(let frame=0;frame<144;frame++) {
    rig.update(true,(Math.PI/36)/.9); graph.root.updateMatrixWorld(true);
    for(const p of attached) {
      const owner=pistons.find(s=>s.cylinder_index===p.cylinder_index)!;
      assert.ok(owner,`No owner for ${p.id}`);
      const relative=graph.centerOf(p.id)!.sub(graph.centerOf(owner.id)!);
      assert.ok(relative.distanceTo(offsets.get(p.id)!)<1e-6,`${p.id} separated from cylinder ${p.cylinder_index}`);
    }
  }
  rig.update(false,0); graph.root.updateMatrixWorld(true);
  for(const e of graph.entries.values()) {
    e.object.updateMatrix();
    assert.ok(e.object.matrix.elements.every((v,i)=>Math.abs(v-e.rest.elements[i])<1e-6),`Nonreversible ${e.part.id}`);
  }
  graph.dispose();
});
test('Authored sequence clears shields, heads and sump before internal parts withdraw',()=>{
  const r=manifest.trajectories!;
  for(const bank of ['L','R']) {
    assert.ok(r['shield_'+bank].end<r['pistons_'+bank].start);
    assert.ok(r['heads_'+bank].end<=r['pistons_'+bank].start);
    assert.ok(r['cams_'+bank].end<=r['heads_'+bank].end);
    const direction=new Vector3(...r['pistons_'+bank].offset).normalize();
    const piston=manifest.parts.find(p=>p.component_kind==='piston' && p.assembly_key==='pistons_'+bank)!;
    const [x,y,z]=piston.axis_direction!;
    assert.ok(direction.distanceTo(new Vector3(x,z,-y))<1e-7);
  }
  assert.ok(r.sump.end<r.crank.start);
  assert.ok(r.gearbox_upper.end<r.gearbox.start);
  let prev=0;
  for(let i=0;i<=900;i++) {const p=storyAssembly(i/1000);assert.ok(p>=prev-1e-10);prev=p;}
  assert.equal(storyAssembly(1),0);
});
test('Every real assembly restores its exact transforms after 240 forward/reverse samples',async()=>{
  const root=await model();const controller=new ExplodedViewController(root,manifest);
  const rest=new Map([...controller.groups].map(([id,g])=>[id,g.object.matrix.clone()]));
  for(let i=0;i<=120;i++) controller.apply(i/120,0,false);
  for(let i=120;i>=0;i--) controller.apply(i/120,0,false);
  for(const [id,g] of controller.groups) {
    g.object.updateMatrix();assert.deepEqual(g.object.matrix.elements,rest.get(id)!.elements);
  }
});
test('All staged paths have stationary endpoints and continuous acceleration',()=>{
  const h=1e-4;
  for(const r of Object.values(manifest.trajectories!)) {
    const f=(t:number)=>trajectoryAmount(t,r.start,r.end);
    assert.equal(f(r.start),0);assert.equal(f(r.end),1);
    assert.ok(f(r.start+h)/h<.01);
    assert.ok((1-f(r.end-h))/h<.01);
  }
});
