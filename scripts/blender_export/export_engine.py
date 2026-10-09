"""Export the supplied Blender project without saving or modifying its source file.
blender -b Formula1_Engineering.blend --python export_engine.py -- --output SITE/public
"""
import bpy, json, math, sys, argparse, hashlib
from pathlib import Path
from mathutils import Vector

args=argparse.ArgumentParser()
args.add_argument('--output', required=True)
args=args.parse_args(sys.argv[sys.argv.index('--')+1:])
out=Path(args.output); (out/'models').mkdir(parents=True,exist_ok=True)
source=Path(bpy.data.filepath)
source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.context.window.scene=bpy.data.scenes['FULL CAR']
originals=[o for o in bpy.context.scene.objects if o.get('part_id') and not o.get('source_part_id') and int(o.get('system','00')[:2]) in range(7,17)]
# Keep the power unit's wiring and mountings; omit vehicle-wide brake and suspension items.
originals=[o for o in originals if int(o['system'][:2])!=16 or o.get('explosion_group')]
copies={o.get('source_part_id'):o for o in bpy.data.scenes['ENGINE EXPLODED VIEW'].objects if o.get('source_part_id')}
def xyz(v): return [round(float(v[0]),7),round(float(v[2]),7),round(float(-v[1]),7)]
def serial(v):
    if hasattr(v,'to_list'): return v.to_list()
    if hasattr(v,'to_dict'): return v.to_dict()
    if isinstance(v,(str,int,float,bool,list)): return v
    return str(v)
groups={}; parts=[]
for o in sorted(originals,key=lambda o:o['part_id']):
    group=o.get('explosion_group') or ('gearbox' if int(o['system'][:2])==14 else 'drivetrain')
    offset=list(copies[o['part_id']]['explosion_offset']) if o['part_id'] in copies else {'gearbox':(.48,0,.08),'gearbox_shell':(.48,0,.50),'drivetrain':(.64,0,-.08)}.get(group,(0,0,0))
    if group not in groups:
        parent=bpy.data.objects.new('ASSEMBLY | '+group,None)
        bpy.context.scene.collection.objects.link(parent)
        parent['assembly_group']=group; parent['web_explosion_offset']=xyz(offset)
        groups[group]=parent
    matrix=o.matrix_world.copy(); oldparent=o.parent.name if o.parent else None
    o.parent=groups[group]; o.matrix_world=matrix
    # Web representation retains all parts; soften costly modifiers without decimating mechanisms.
    for mod in o.modifiers:
        if mod.type=='SUBSURF': mod.levels=min(mod.levels,1); mod.render_levels=min(mod.render_levels,1)
        if mod.type=='BEVEL': mod.segments=min(mod.segments,2)
    if o.type=='CURVE': o.data.resolution_u=min(o.data.resolution_u,6); o.data.bevel_resolution=min(o.data.bevel_resolution,2)
    corners=[matrix@Vector(c) for c in o.bound_box]
    center=sum(corners,Vector())/8
    data={k:serial(v) for k,v in o.items() if k!='_RNA_UI'}
    data.update({'id':o['part_id'],'group':group,'object_name':o.name,'center':xyz(center),'explosion_offset':xyz(offset),'source_parent':oldparent,'source_matrix':[list(row) for row in matrix], 'bounds':[xyz(c) for c in corners]})
    name=o['name_en'].lower(); kind=o.get('component_kind','')
    data['is_casing']=group=='covers' or kind in ['block','cylinder_head','gearbox_housing','volute','mgu_k','energy_store'] or any(w in name for w in ['crankcase','sump','cylinder bank','cylinder head','plenum','energy store enclosure','energy store lid','motor housing'])
    data['is_detail']=kind in ['fastener','washer'] or any(w in name for w in ['bolt','washer','chain roller','clamp screw','bearing ball'])
    o['web_group']=group; o['web_explosion_offset']=xyz(offset); o['web_center']=xyz(center); o['web_is_casing']=data['is_casing']; o['web_is_detail']=data['is_detail']
    parts.append(data)
# Recreate the original PBR constants in export-friendly materials. Source shaders stay on disk.
for material in bpy.data.materials:
    if not material.use_nodes: continue
    shader=next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if not shader: continue
    rgba=list(shader.inputs['Base Color'].default_value); metal=shader.inputs['Metallic'].default_value; rough=shader.inputs['Roughness'].default_value
    material.node_tree.nodes.clear(); shader=material.node_tree.nodes.new('ShaderNodeBsdfPrincipled'); output=material.node_tree.nodes.new('ShaderNodeOutputMaterial')
    shader.inputs['Base Color'].default_value=rgba; shader.inputs['Metallic'].default_value=metal; shader.inputs['Roughness'].default_value=rough
    material.node_tree.links.new(shader.outputs['BSDF'],output.inputs['Surface'])
bpy.ops.object.select_all(action='DESELECT')
for o in originals+list(groups.values()): o.hide_set(False); o.hide_render=False; o.select_set(True)
bpy.context.view_layer.update()
target=out/'models'/'engine.source.glb'
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_extras=True,export_apply=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_materials='EXPORT',export_texcoords=False,export_normals=True)
manifest={'version':1,'source_file':source.name,'source_sha256':source_hash,'blender_version':bpy.app.version_string,'units':'metres','coordinate_system':'right-handed Y-up; Blender (x,y,z) -> (x,z,-y)','model':'/models/engine.glb','parts':parts,'groups':{k:list(v['web_explosion_offset']) for k,v in groups.items()},'source_scene':'FULL CAR','exploded_scene':'ENGINE EXPLODED VIEW','educational_reconstruction':True}
(out/'models'/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
assert source_hash==hashlib.sha256(source.read_bytes()).hexdigest()
print('EXPORT_COMPLETE',len(parts),'parts',target.stat().st_size,'bytes',flush=True)
