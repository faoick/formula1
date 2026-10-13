"""Actual mesh-surface checks for the reported collisions. Not a full CAD tolerance audit."""
import bpy,json,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
root=Path(__file__).resolve().parents[2]
m=json.loads((root/'public/models/manifest.json').read_text(encoding='utf-8'))
bpy.context.window.scene=bpy.data.scenes['FULL CAR']
lookup={o.get('part_id'):o for o in bpy.context.scene.objects if o.get('web_assembly')}
deps=bpy.context.evaluated_depsgraph_get()
cache={}
for p in m['parts']:
    o=lookup[p['id']]; ev=o.evaluated_get(deps); mesh=ev.to_mesh()
    vs=[o.matrix_world@v.co for v in mesh.vertices]
    fs=[tuple(p.vertices) for p in mesh.polygons]
    cache[p['id']]=(vs,fs,Vector(tuple(min(v[i] for v in vs) for i in range(3))),Vector(tuple(max(v[i] for v in vs) for i in range(3))))
    ev.to_mesh_clear()
def ease(t):
    t=min(1,max(0,t)); return t*t*t*(t*(t*6-15)+10)
def shift(p,t):
    route=m['trajectories'][p['assembly_key']]; a=ease((t-route['start'])/(route['end']-route['start']))
    x,y,z=route['offset']; return Vector((x,-z,y))*a
def overlap(a,b,t):
    av,af,amin,amax=cache[a['id']]; bv,bf,bmin,bmax=cache[b['id']]
    sa,sb=shift(a,t),shift(b,t)
    if any(amax[i]+sa[i]<bmin[i]+sb[i] or bmax[i]+sb[i]<amin[i]+sa[i] for i in range(3)): return False
    return bool(BVHTree.FromPolygons([v+sa for v in av],af).overlap(BVHTree.FromPolygons([v+sb for v in bv],bf)))
parts=m['parts']; checks=[]; failures=[]
def check_pairs(label,left,right,steps):
    found=[]; examined=0
    for t in steps:
        for a in left:
            for b in right:
                examined+=1
                if overlap(a,b,t): found.append((a['id'],b['id'],round(t,4)))
    checks.append(dict(name=label,pairs_at_samples=examined,intersections=len(found)))
    failures.extend(found)
    print(label,len(found),'intersections /',examined,'sampled pairs',flush=True)
check_pairs('Oil reservoir versus all exhaust meshes',[p for p in parts if p['id']=='CL-0125'],[p for p in parts if p['group']=='exhaust'],[i/100 for i in range(101)])
check_pairs('Pistons, crowns and rods versus heat shields',[p for p in parts if p['component_kind'] in ['piston','piston_crown','rod']],[p for p in parts if p['assembly_key'].startswith('shield_') and not p['is_detail']],[i/150 for i in range(151)])
check_pairs('Gear teeth versus two casing halves',[p for p in parts if p['group']=='gearbox' and p['component_kind']=='gear'],[p for p in parts if p['component_kind']=='gearbox_housing'],[i/100 for i in range(101)])
check_pairs('Piston crowns versus both cylinder heads',[p for p in parts if p['component_kind']=='piston_crown'],[p for p in parts if p['name_en'].startswith('Cylinder head')],[i/150 for i in range(151)])
check_pairs('Pistons and rods versus exhaust runners',[p for p in parts if p['component_kind'] in ['piston','piston_crown','rod']],[p for p in parts if p['group']=='exhaust' and 'runner' in p['name_en'].lower()],[i/150 for i in range(151)])
check_pairs('Piston crowns versus rebuilt bank solids',[p for p in parts if p['component_kind']=='piston_crown'],[p for p in parts if p['name_en'].startswith('Cylinder bank')],[i/150 for i in range(151)])
check_pairs('Turbomachinery wheels versus housings',[p for p in parts if p['group']=='turbo_rotor' and p['component_kind'] in ['impeller_hub','blade']],[p for p in parts if p['component_kind']=='volute'],[i/120 for i in range(121)])
result=dict(checks=checks,failures=failures,scope='Triangle surface overlaps in the reported interference pairs, sampled in the actual exported trajectories. Does not certify all 1267 parts as a manufacturing assembly.')
(root/'artifacts/revision/collision-audit.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
if failures: raise RuntimeError(str(failures[:20]))
