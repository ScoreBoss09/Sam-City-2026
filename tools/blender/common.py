# Shared helpers for building Sam City models in Blender (run with Blender's Python: bpy). Blender is Z-up; the glTF
# exporter turns that into Three.js Y-up, with Blender -Y becoming the game's +Z (the front / street side).
import bpy, bmesh, math
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
_mats = {}
def mat(name, rgb, rough=0.85, metal=0.0, image=None, alpha=None):
    if name in _mats: return _mats[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if image is not None:
        t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = image; t.interpolation = 'Closest'; m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
    if alpha is not None: b.inputs['Alpha'].default_value = alpha; m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
    _mats[name] = m; return m
def image(name, w, h, fn):
    """A pixel texture: fn(x, y) -> (r, g, b) in 0..1."""
    im = bpy.data.images.new(name, w, h); px = []
    for y in range(h):
        for x in range(w): px += [*fn(x, y), 1.0]
    im.pixels = px; im.pack(); return im
def box(name, sx, sy, sz, x, y, z, m, bevel=0.0):
    """A box sx * sy * sz whose BOTTOM centre is at (x, y, z) (Blender axes)."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + sz / 2)); o = bpy.context.object; o.name = name; o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(m)
    if bevel: md = o.modifiers.new('bev', 'BEVEL'); md.width = bevel; md.segments = 2
    return o
def cut(target, cutter):
    md = target.modifiers.new('cut', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = cutter; md.solver = 'EXACT'
    bpy.context.view_layer.objects.active = target; bpy.ops.object.modifier_apply(modifier=md.name); bpy.data.objects.remove(cutter)
def world_uv(o, scale=1.0):
    """Planar UVs from world position (by each face's main axis), `scale` metres per texture repeat."""
    me = o.data; bm = bmesh.new(); bm.from_mesh(me); uv = bm.loops.layers.uv.verify(); M = o.matrix_world
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            p = M @ l.vert.co; a, b = [(p.y, p.z), (p.x, p.z), (p.x, p.y)][ax]; l[uv].uv = (a / scale, b / scale)
    bm.to_mesh(me); bm.free()
def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); o = bpy.context.object; o.name = name; return o
def export(path):
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True)
def preview(path, cam=(9, -11, 7), target=(0, 0, 3), res=(640, 420), samples=16):
    bpy.ops.object.camera_add(location=cam); c = bpy.context.object; bpy.context.scene.camera = c
    t = c.constraints.new('TRACK_TO'); bpy.ops.object.empty_add(location=target); t.target = bpy.context.object
    bpy.ops.object.light_add(type='SUN', location=(4, -6, 10)); bpy.context.object.data.energy = 3.5; bpy.context.object.rotation_euler = (0.7, 0.2, 0.6)
    w = bpy.data.worlds.new('w'); bpy.context.scene.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.75, 0.82, 0.9, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.8
    s = bpy.context.scene; s.render.engine = 'CYCLES'; s.cycles.samples = samples; s.cycles.device = 'CPU'; s.render.resolution_x, s.render.resolution_y = res; s.render.filepath = path; bpy.ops.render.render(write_still=True)
