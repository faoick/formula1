"""R3: machined surfaces and more credible profiles, keeping the original part IDs.

Educational geometry: radii and finishes are authored, not manufacturer CAD.
Small embedded PBR textures survive GLB export instead of flattening to constants.
"""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix

def replace(o, vertices, faces):
    materials=list(o.data.materials)
    data=bpy.data.meshes.new(o['part_id']+' | R3 surface')
    data.from_pydata(vertices,[],faces); data.update()
    o.data=data; o.matrix_world=Matrix.Identity(4); o.modifiers.clear()
    for m in materials: data.materials.append(m)
    for p in data.polygons: p.use_smooth=True
    o['surface_revision']='R3: refined machined profile'

def revolved(o, origin, axis, profile, segments=128):
    q=Vector(axis).to_track_quat('Z','Y'); origin=Vector(origin)
    vertices=[]; rings=[]; faces=[]
    for z,r in profile:
        ring=[]
        for j in range(segments if r>0 else 1):
            a=j*math.tau/segments
            ring.append(len(vertices)); vertices.append(tuple(origin+q@Vector((r*math.cos(a),r*math.sin(a),z))))
        rings.append(ring)
    for a,b in zip(rings,rings[1:]):
        for j in range(segments):
            k=(j+1)%segments
            if len(a)==1: faces.append((a[0],b[k],b[j]))
            elif len(b)==1: faces.append((a[j],a[k],b[0]))
            else: faces.append((a[j],a[k],b[k],b[j]))
    replace(o,vertices,faces)

def bore(o,point,axis,r,depth):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=r,depth=depth,location=point)
    cutter=bpy.context.object; cutter.rotation_mode='QUATERNION'; cutter.rotation_quaternion=Vector(axis).to_track_quat('Z','Y')
    mod=o.modifiers.new('R3 machined recess','BOOLEAN'); mod.operation='DIFFERENCE'; mod.solver='EXACT'; mod.object=cutter
    bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)

def edge_finish(o,radius):
    m=o.modifiers.new('R3 micro fillets','BEVEL'); m.width=radius; m.segments=3
    m.limit_method='ANGLE'; m.angle_limit=.52
    m=o.modifiers.new('R3 weighted machined normals','WEIGHTED_NORMAL'); m.keep_sharp=True; m.weight=40

def refine_pistons(objects):
    ordered=sorted([o for o in objects if o['part_id'].startswith('INT-')],key=lambda o:int(o['part_id'][4:]))
    piston=None
    for o in ordered:
        kind=o.get('component_kind')
        if kind=='piston':
            piston=o
            edge_finish(o,.00018)
        if kind=='piston_crown':
            origin=Vector(piston['pin_center']); axis=Vector(piston['axis_direction'])
            across=Vector((0,axis.z,-axis.y))
            # Shallow bowl, crown land and rounded outer shoulder. Original 80 mm bore envelope retained.
            profile=[(.0175,0),(.0175,.0392),(.0178,.0396),(.01935,.0396),(.01985,.0392),(.020,.036),(.020,.026),(.0198,.013),(.0193,.009),(.0191,0)]
            revolved(o,origin,axis,profile)
            for dx in [-.013,.013]:
                for dy in [-.0167,.0167]: bore(o,origin+axis*.022+Vector((dx,0,0))+across*dy,axis,.010,.006)
            edge_finish(o,.00016)
            o['description']='Точёное днище с неглубокой чашей, четырьмя выборками под клапаны и скруглённой кромкой. Учебный профиль.'
        if kind=='rod':
            a,b=Vector(o['big_end']),Vector(o['small_end']); length=(b-a).length; q=(b-a).to_track_quat('Z','Y')
            stations=[(.019,.012),(.035,.008),(.065,.006),(.093,.008),(.105,.009)]
            vertices=[]; faces=[]
            for i in range(33):
                z=.019+.086*i/32
                k=next((k for k in range(4) if z<=stations[k+1][0]),3)
                za,wa=stations[k]; zb,wb=stations[k+1]; t=(z-za)/(zb-za); t=t*t*(3-2*t)
                w=wa+(wb-wa)*t
                profile=[(-.007,-w),(.007,-w),(.007,-w+.0024),(.0023,-w+.0024),(.0023,w-.0024),(.007,w-.0024),(.007,w),(-.007,w),(-.007,w-.0024),(-.0023,w-.0024),(-.0023,-w+.0024),(-.007,-w+.0024)]
                vertices.extend(tuple(a+q@Vector((x,y,z))) for x,y in profile)
            faces=[tuple(reversed(range(12))),tuple(32*12+j for j in range(12))]
            for i in range(32):
                for j in range(12): faces.append((i*12+j,i*12+(j+1)%12,(i+1)*12+(j+1)%12,(i+1)*12+j))
            replace(o,vertices,faces); edge_finish(o,.00065)

def refine_valves(objects):
    for o in objects:
        name=o['name_en']
        if name in ['Intake valve head','Exhaust valve head']:
            axis=o.matrix_world.to_quaternion()@Vector((0,0,1)); seat=o.matrix_world.translation-axis*.0004
            r=.012 if name.startswith('Intake') else .0105
            revolved(o,seat,axis,[(-.001,0),(-.001,r-.0006),(-.0006,r),(.0006,r),(.0018,r-.001),(.0035,r*.72),(.0055,r*.46),(.008,.0026),(.010,.0023),(.010,0)],96)
            edge_finish(o,.00012)
            o['description']='Тарелка клапана с коническим пояском седла и плавным тюльпанообразным переходом к стержню.'
        elif name=='Finger follower':
            o['name_en']='DLC-coated bucket follower'; o['name_ru']='Тарельчатый толкатель с покрытием DLC'
            o['description']='Упрощённый толкатель передаёт движение кулачка стержню клапана. Тёмная контактная поверхность обозначает износостойкое покрытие.'
            o.name=o['part_id']+' | '+o['name_en']+' | '+o['name_ru']

def refine_impellers(objects):
    blade_index={True:0,False:0}
    for o in objects:
        kind=o.get('component_kind'); name=o['name_en']; comp='Compressor' in name
        if kind=='impeller_hub':
            x=.93 if comp else 1.07; direction=1 if comp else -1
            profile=[(-.028,.0057),(-.028,.0105),(-.027,.012)]
            profile += [(-.027+.045*(i/48)**.72,.012+.056*i/48) for i in range(1,49)]
            profile += [(.019,.068),(.022,.0677),(.023,.0668),(.023,.0057),(-.028,.0057)]
            revolved(o,(x,0,.46),(direction,0,0),profile,160)
        elif kind in ['blade','splitter_blade']:
            index=blade_index[comp]; blade_index[comp]+=1
            count=11 if comp else 13; splitter=kind=='splitter_blade'
            # Original creation order is full-span row then splitter row.
            j=(index-count+.5) if splitter else index
            x=.93 if comp else 1.07; direction=1 if comp else -1
            vertices=[]; faces=[]; N=40; H=7; span=(N+1)*(H+1)
            for side in [-1,1]:
                for k in range(N+1):
                    t=(.43 if splitter else .04)+(1-(.43 if splitter else .04))*k/N
                    rad=.012+.056*t; base=-.027+.045*t**.72
                    for h in range(H+1):
                        u=h/H; thickness=.00009+.00038*math.sin(math.pi*u)**.7
                        theta=math.tau*j/count+(.95*t*t if comp else -.55*t)+direction*.10*u*math.sin(math.pi*t)+side*thickness/rad
                        xx=x+direction*(base-.023*(1-.62*t)*u)
                        vertices.append((xx,rad*math.cos(theta),.46+rad*math.sin(theta)))
            for k in range(N):
                for h in range(H):
                    a=k*(H+1)+h;b=a+H+1
                    faces.extend([(a,b,b+1,a+1),(span+a+1,span+b+1,span+b,span+a)])
            for k in range(N):
                for h in [0,H]:
                    a=k*(H+1)+h;b=a+H+1;faces.append((a,span+a,span+b,b))
            for k in [0,N]:
                for h in range(H):
                    a=k*(H+1)+h;faces.append((a,a+1,span+a+1,span+a))
            replace(o,vertices,faces)
            o['description']='Лопатка с гладкими пространственными поверхностями, скруглённой толщиной профиля и согласованным с опорным диском корнем. Геометрия учебная.'

def texture(name,kind):
    n=256; rng=random.Random(162026); image=bpy.data.images.new(name,width=n,height=n)
    image.colorspace_settings.name='sRGB' if kind=='carbon' else 'Non-Color'
    pixels=[]
    for y in range(n):
        for x in range(n):
            noise=rng.random()
            if kind=='carbon':
                cell=16; horizontal=((x//cell+y//cell)%2)==0
                strand=math.sin((y if horizontal else x)*math.pi/3)**2
                v=.12+.055*strand+.018*noise; pixels.extend((v*.78,v*.89,v,1))
            elif kind=='roughness':
                v=.62+.22*noise+.10*math.sin(y*.84)**2; pixels.extend((v,v,v,1))
            else:
                gx=(noise-.5)*.05; gy=math.sin(y*.84)*.065+(rng.random()-.5)*.035
                pixels.extend((.5+gx,.5+gy,math.sqrt(max(0,1-gx*gx-gy*gy))*.5+.5,1))
    image.pixels.foreach_set(pixels); image.update(); image.pack()
    return image

def finishes(objects):
    rough=texture('R3 | satin machining roughness','roughness'); normal=texture('R3 | microscopic brushed normal','normal'); carbon=texture('R3 | woven carbon colour','carbon')
    specs={
        'Aluminium':((.48,.51,.55),1,.34), 'Titanium':((.30,.32,.35),1,.31),
        'Steel':((.25,.27,.30),1,.25), 'Inconel':((.27,.23,.19),1,.40),
        'Copper':((.51,.29,.16),1,.30), 'Thermal':((.34,.31,.26),.85,.58),
        'Carbon':((.025,.03,.035),.35,.32), 'Anodized':((.014,.09,.105),.85,.32),
        'R3 Graphite skirt':((.055,.06,.065),.3,.42), 'R3 DLC follower':((.028,.033,.042),.7,.22),
    }
    for name,(color,metal,rgh) in specs.items():
        m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True;m['web_pbr']=True
        nodes=m.node_tree.nodes; links=m.node_tree.links; nodes.clear()
        p=nodes.new('ShaderNodeBsdfPrincipled'); out=nodes.new('ShaderNodeOutputMaterial'); links.new(p.outputs['BSDF'],out.inputs['Surface'])
        p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rgh
        uv=nodes.new('ShaderNodeTexCoord'); tex=nodes.new('ShaderNodeTexImage');tex.image=normal;links.new(uv.outputs['UV'],tex.inputs['Vector'])
        n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.20 if name!='Carbon' else .32
        links.new(tex.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],p.inputs['Normal'])
        # A greyscale texture supplies the roughness channel. Keep calibrated finishes distinct.
        r=nodes.new('ShaderNodeTexImage');r.image=rough;links.new(uv.outputs['UV'],r.inputs['Vector'])
        mult=nodes.new('ShaderNodeMath');mult.operation='MULTIPLY';mult.inputs[1].default_value=rgh
        links.new(r.outputs['Color'],mult.inputs[0]);links.new(mult.outputs[0],p.inputs['Roughness'])
        if name=='Carbon':
            c=nodes.new('ShaderNodeTexImage');c.image=carbon;links.new(uv.outputs['UV'],c.inputs['Vector']);links.new(c.outputs['Color'],p.inputs['Base Color'])
    for o in objects:
        if o.type!='MESH': continue
        # The source has duplicate material datablocks from its prepared scenes.
        # Resolve by the authoritative part metadata, not a .001 Blender suffix.
        name=o.get('material','')
        if name in specs:
            o.data=o.data.copy();o.data.materials.clear();o.data.materials.append(bpy.data.materials[name])
        if o.get('component_kind')=='piston':
            o.data=o.data.copy(); o.data.materials.append(bpy.data.materials['R3 Graphite skirt'])
            origin=Vector(o['pin_center']); axis=Vector(o['axis_direction'])
            for p in o.data.polygons:
                z=(o.matrix_world@p.center-origin).dot(axis)
                if z<.004: p.material_index=len(o.data.materials)-1
        elif o['name_en']=='DLC-coated bucket follower':
            o.data=o.data.copy();o.data.materials.clear();o.data.materials.append(bpy.data.materials['R3 DLC follower'])
        data=o.data
        if data.uv_layers: continue
        uv=data.uv_layers.new(name='Machined surface UV')
        # Metre-space, dominant-face projection. Very fine texture avoids conspicuous seams.
        for p in data.polygons:
            axis=max(range(3),key=lambda i:abs(p.normal[i])); axes=[i for i in range(3) if i!=axis]
            for li in p.loop_indices:
                v=data.vertices[data.loops[li].vertex_index].co
                uv.data[li].uv=(v[axes[0]]/.025,v[axes[1]]/.025)

def refine(objects):
    refine_pistons(objects); refine_valves(objects); refine_impellers(objects)
    for o in objects:
        if o.type=='CURVE' and o.data.bevel_depth>=.012:
            o.data=o.data.copy();o.data.resolution_u=12;o.data.bevel_resolution=4;o.data.use_fill_caps=False
            bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
            bpy.ops.object.convert(target='MESH')
            solid=o.modifiers.new('R3 real tube wall','SOLIDIFY');solid.thickness=.0014;solid.offset=-1
            o['surface_revision']='R3: hollow pipe with visible wall at its connections'
        if o.type=='MESH':
            bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
            for edge in bm.edges:
                if len(edge.link_faces)==2: edge.smooth=edge.calc_face_angle(0)<.6
            bm.to_mesh(o.data);bm.free();o.data.update()
            for p in o.data.polygons:
                if len(p.vertices)>6: p.use_smooth=False
    bpy.context.view_layer.update();finishes(objects)
    print('R3_SURFACES_COMPLETE',len(objects),flush=True)
