import bpy
from mathutils import Vector
bpy.context.window.scene=bpy.data.scenes['FULL CAR']
for bank in [-1,1]:
    o=next(o for o in bpy.context.scene.objects if o.get('name_en')=='Cylinder bank '+str(bank))
    d=Vector((0,bank,1)).normalized()
    for x in [.48,.581,.682]:
        point=Vector((x+bank*.0125,0,.255))+d*.30
        inv=o.matrix_world.inverted()
        hit,loc,normal,idx=o.ray_cast(inv@point,inv.to_3x3()@(-d))
        print('BANK_RAY',bank,x,hit,tuple(o.matrix_world@loc),flush=True)
