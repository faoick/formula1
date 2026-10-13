"""Authored, reproducible corrections to the supplied educational engine.

All dimensions are reconstruction choices, not team/manufacturer data.
The original .blend stays untouched; export_engine saves a separate revised file.
"""
import bpy, math
from mathutils import Vector, Matrix

def center(o):
    return sum((o.matrix_world @ Vector(v) for v in o.bound_box), Vector()) / 8

def move(o, delta):
    o.matrix_world = Matrix.Translation(Vector(delta)) @ o.matrix_world

def route(o, points):
    o.data = o.data.copy()
    o.data.splines.clear()
    spline = o.data.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for p, co in zip(spline.bezier_points, points):
        p.co = co
        p.handle_left_type = p.handle_right_type = 'AUTO'
    o.matrix_world = Matrix.Identity(4)
    o['revision'] = 'R2: routed below exhaust, with an outboard dry-sump reservoir'

def housing_mesh(upper):
    # Hollow superellipse shell: the original ellipse cut into the layshaft gears.
    # Separate halves withdraw away from the gears; 9 mm wall, 6+ mm gear clearance.
    stations = [(.812,.155,.118),(.86,.17,.13),(1.50,.17,.13),(1.80,.17,.13),(1.87,.15,.115)]
    vertices, faces = [], []
    n=49
    for inner in [False,True]:
        for x,w,h in stations:
            w-=.009 if inner else 0; h-=.009 if inner else 0
            for j in range(n):
                a=math.pi*j/(n-1)+(0 if upper else math.pi)
                c,s=math.cos(a),math.sin(a)
                vertices.append((x,.035+w*math.copysign(abs(c)**.55,c),.255+h*math.copysign(abs(s)**.55,s)))
    stride=len(stations)*n
    for layer in range(2):
        for i in range(len(stations)-1):
            for j in range(n-1):
                a=layer*stride+i*n+j
                f=(a,a+1,a+n+1,a+n)
                faces.append(f if layer==0 else f[::-1])
    for i in range(len(stations)-1):
        for j in [0,n-1]:
            a=i*n+j; faces.append((a,a+n,a+n+stride,a+stride))
    for i in [0,len(stations)-1]:
        for j in range(n-1):
            a=i*n+j; faces.append((a,a+stride,a+1+stride,a+1))
    mesh=bpy.data.meshes.new('R2 split transmission casting')
    mesh.from_pydata(vertices,[],faces); mesh.update()
    for p in mesh.polygons: p.use_smooth=True
    return mesh

def repair_geometry(objects):
    lookup={o['part_id']:o for o in objects}
    # The supplied negative bank contained coplanar faces covering its bores.
    # Rebuild both bank solids with applied transforms and explicit triangulation.
    for side,pid in [(-1,'ENG-0003'),(1,'ENG-0025')]:
        o=lookup[pid]; mats=list(o.data.materials)
        d=Vector((0,side,1)).normalized(); q=d.to_track_quat('Z','Y')
        bpy.ops.mesh.primitive_cube_add(size=1,location=Vector((.59,0,.255))+d*.113)
        temp=bpy.context.object; temp.scale=(.35,.111,.094); temp.rotation_mode='QUATERNION'; temp.rotation_quaternion=q
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
        o.data=temp.data.copy(); o.matrix_world=temp.matrix_world.copy(); o.modifiers.clear()
        bpy.data.objects.remove(temp,do_unlink=True)
        for mat in mats: o.data.materials.append(mat)
        for x in [.48,.581,.682]:
            point=Vector((x+side*.0125,0,.255))+d*.113
            bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=.044,depth=.40,location=point)
            cutter=bpy.context.object; cutter.rotation_mode='QUATERNION'; cutter.rotation_quaternion=q
            bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
            mod=o.modifiers.new('Through cylinder bore','BOOLEAN'); mod.solver='EXACT'; mod.operation='DIFFERENCE'; mod.object=cutter
            bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
            bpy.data.objects.remove(cutter,do_unlink=True)
        bevel=o.modifiers.new('Machined casting edges','BEVEL'); bevel.width=.0018; bevel.segments=3
        normal=o.modifiers.new('Face normals','WEIGHTED_NORMAL'); normal.keep_sharp=True
        tri=o.modifiers.new('Explicit bore triangulation','TRIANGULATE')
        o['revision']='R2: rebuilt through bores; original negative bank had coplanar blocking faces'
    upper=lookup['GB-0001']; materials=list(upper.data.materials)
    upper.data=housing_mesh(True); upper.matrix_world=Matrix.Identity(4)
    upper.modifiers.clear()
    for mat in materials: upper.data.materials.append(mat)
    upper['name_en']='Gearbox upper casing'; upper['name_ru']='Верхняя половина корпуса КПП'
    upper.name='GB-0001 | Gearbox upper casing | Верхняя половина корпуса КПП'
    lower=upper.copy(); lower.data=housing_mesh(False)
    for mat in materials: lower.data.materials.append(mat)
    upper.users_collection[0].objects.link(lower)
    lower['part_id']='GB-0061'; lower['name_en']='Gearbox lower casing'; lower['name_ru']='Нижняя половина корпуса КПП'
    lower.name='GB-0061 | Gearbox lower casing | Нижняя половина корпуса КПП'
    for o in [upper,lower]:
        o['description']='Разъёмный полый корпус с зазором вокруг восьми пар шестерён; учебная реконструкция R2.'
        o['revision']='R2: split superellipse housing; reconstructed envelope, not factory dimensions'
        # Half-shaft exits are physical bores, not shafts intersecting the wall.
        bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.039,depth=.65,location=(1.70,.035,.255),rotation=(math.pi/2,0,0))
        cutter=bpy.context.object
        mod=o.modifiers.new('Differential output apertures','BOOLEAN'); mod.operation='DIFFERENCE'; mod.object=cutter
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(cutter,do_unlink=True)
        bevel=o.modifiers.new('Machined edge radius','BEVEL'); bevel.width=.0012; bevel.segments=2
    objects.append(lower)
    # Move side flange fasteners onto the corrected flange rather than leaving them inside.
    for o in objects:
        if o['part_id'].startswith('GB-') and (o.get('component_kind')=='fastener' or 'washer' in o['name_en'].lower()):
            c=center(o)
            if abs(abs(c.y)-.13)<.01: move(o,(0,(.203 if c.y>0 else -.133)-c.y,0))
    tank=lookup['CL-0125']; move(tank,(0,-.23,0))
    tank['revision']='R2: outboard tank, 230 mm lateral relocation clear of exhaust'
    for o in objects:
        if o['name_en']=='Temperature sender' and (center(o)-Vector((.92,-.25,.469))).length<.025:
            move(o,(0,-.23,0))
    route(lookup['CL-0130'],[(.52,-.12,.215),(.57,-.22,.15),(.75,-.43,.145),(.92,-.48,.212)])
    route(lookup['CL-0131'],[(.92,-.48,.26),(.85,-.43,.18),(.76,-.25,.155),(.59,-.15,.20),(.59,-.08,.255)])
    route(lookup['CL-0147'],[(.88,.28,.27),(.96,.23,.16),(1.01,.12,.085),(1.01,-.40,.085),(.98,-.48,.18),(.92,-.48,.28)])
    # Original scroll passage cut into the 68 mm impellers. Increase its radial
    # envelope while retaining the authored hollow spiral and growing passage.
    for pid in ['TUR-0001','TUR-0043']:
        o=lookup[pid]; o.data=o.data.copy()
        for i,v in enumerate(o.data.vertices):
            t=((i//16)%97)/96; a=math.tau*t; delta=.020+.010*t
            v.co.y+=delta*math.cos(a); v.co.z+=delta*math.sin(a)
        o['revision']='R2: scroll inner radius >=77 mm clears the 68 mm rotor'
    # The hot wheel faces the opposite direction: its inlet flange belongs on
    # that side, not through the broad part of the turbine wheel.
    for o in objects:
        number=int(o['part_id'].split('-')[1])
        if o['part_id'].startswith('TUR-') and 59<=number<=75: move(o,(.063,0,0))
    bpy.context.view_layer.update()

def bind_mechanism(objects):
    # Provenance comes from the generator's creation order, NEVER nearest spatial centre:
    # a pin boss is closer in X to the opposite-bank cylinder than to its own cylinder.
    internals=sorted([o for o in objects if o['part_id'].startswith('INT-')],key=lambda o:int(o['part_id'].split('-')[1]))
    cylinder=-1
    for o in internals:
        if o.get('component_kind')=='crankpin': cylinder+=1
        if o.get('explosion_group')!='pistons': continue
        assert 0<=cylinder<6
        o['cylinder_index']=cylinder
        name=o['name_en'].lower()
        o['motion_role']='rod' if ('connecting rod' in name or 'washer' in name or o.get('component_kind')=='rod' or o.get('component_kind') in ['fastener','washer']) else 'bearing' if name=='big end bearing' else 'piston'

def prepare(objects):
    repair_geometry(objects)
    from surface_revision import refine
    refine(objects)
    bind_mechanism(objects)
    routes={}
    def assign(o,key,offset,start,end,family,label):
        o['web_assembly']=key
        routes[key]={'offset':[offset[0],offset[2],-offset[1]],'start':start,'end':end,'family':family,'label':label}
    for o in objects:
        group=o.get('explosion_group') or ('gearbox' if o['system'].startswith('14') else 'drivetrain')
        c=center(o); name=o['name_en'].lower(); kind=o.get('component_kind','')
        side=-1 if c.y<0 else 1
        if 'cylinder_index' in o: side=-1 if o['cylinder_index']%2==0 else 1
        suffix='L' if side<0 else 'R'
        if group=='pistons':
            # The complete piston/rod assembly exits along its actual bore axis.
            assign(o,'pistons_'+suffix,(0,side*.32,.32),.46,.61,group,'Поршни · '+suffix)
        elif group in ['covers','cams','valves','heads']:
            distance,start,end={'covers':(1.18,.16,.29),'cams':(.91,.24,.37),'valves':(.70,.30,.43),'heads':(.49,.35,.46)}[group]
            # Timing chains must first withdraw axially from crank/cam sprockets.
            if 'chain' in name:
                assign(o,'timing_drive',(-.82,0,-.22),.08,.16,'cams','Привод ГРМ')
            else: assign(o,group+'_'+suffix,(0,side*distance,distance),start,end,group,{'covers':'Крышка','cams':'Распредвалы','valves':'Клапаны','heads':'Головка'}[group]+' · '+suffix)
        elif group=='block':
            if 'sump' in name or ('fastener'==kind or 'washer' in name) and c.z<.21:
                assign(o,'sump',(0,0,-.62),.12,.26,'block','Нижний картер')
            elif 'crankcase' in name or 'bearing saddle' in name:
                assign(o,'crankcase',(-.52,0,0),.64,.75,'block','Картер и коренные опоры')
            else: assign(o,'block',(0,0,0),0,1,'block','Блок и гильзы')
        elif group=='crank': assign(o,'crank',(0,0,-.30),.76,.87,group,'Коленчатый вал')
        elif group=='gearbox_shell':
            up=o['part_id']!='GB-0061'
            assign(o,'gearbox_upper' if up else 'gearbox_lower',(0,0,.56 if up else -.53),.14,.28,group,'Корпус КПП · '+('верх' if up else 'низ'))
        elif group in ['gearbox','drivetrain']:
            if kind=='halfshaft' or name.startswith('cv ') or group=='drivetrain':
                assign(o,'output_'+suffix,(0,side*.65,0),.01,.12,'drivetrain','Полуось · '+suffix)
            else: assign(o,'gearbox',(.75,0,0),.30,.46,'gearbox','Шестерни и дифференциал')
        elif group in ['turbo_housing','turbo_rotor']:
            if group=='turbo_housing' and name!='bearing housing':
                compressor=c.x<1
                assign(o,'compressor_shell' if compressor else 'turbine_shell',(-.22 if compressor else .27,0,.62),.65,.79,'turbo_housing','Корпус компрессора' if compressor else 'Корпус турбины')
            else: assign(o,'turbo_core',(0,0,.62),.65,.79,group,'Вал и рабочие колёса')
        elif group=='exhaust':
            shield='shield' in name or (o['system'].startswith('16') and abs(c.y)>.34)
            if shield: assign(o,'shield_'+suffix,(0,side*1.10,-.10),.065,.125,group,'Тепловой экран · '+suffix)
            else: assign(o,'exhaust_'+suffix,(.22,side*.76,-.10),.13,.20,group,'Выпуск · '+suffix)
        elif group=='intake': assign(o,'intake',(-.40,0,1.35),.05,.16,group,'Впуск и интеркулер')
        elif group=='fuel':
            assign(o,'fuel_'+suffix,(-.30,side*.55,.80),.05,.15,group,'Впрыск и зажигание · '+suffix)
        elif group=='wiring': assign(o,'wiring_'+suffix,(-.55,side*.80,0),.01,.09,group,'Жгут · '+suffix)
        elif group=='cooling': assign(o,'cooling_'+suffix,(-.15,side*1.30,-.08),0,.06,group,'Охлаждение и масло · '+suffix)
        elif group=='electric': assign(o,'electric',(-1.15,0,-.04),.01,.14,group,'Гибридная система')
        else: assign(o,group,(0,0,0),0,1,group,group)
    return routes
