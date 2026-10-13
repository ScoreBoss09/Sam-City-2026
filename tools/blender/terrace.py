# Victorian terraced house shell (8 m x 8 m plot, two storeys): brick front with a canted bay window and sashes,
# blank party walls with chimney stacks, back with the kitchen and bathroom windows, a Welsh slate roof.
# Run: <blender python> tools/blender/terrace.py   -> assets/models/buildings/terrace.glb (+ preview png)
import bpy, bmesh, math, os, sys
sys.path.insert(0, os.path.dirname(__file__)); from common import *
reset()
OUT = os.path.join(os.path.dirname(__file__), '../../assets/models/buildings'); os.makedirs(OUT, exist_ok=True)
W, D, T, H = 8.0, 8.0, 0.3, 6.4          # plot, wall thickness, eaves height (two 3.2 m storeys)
def brickpx(x, y):
    row = y // 4; off = 4 if row % 2 else 0; mortar = y % 4 == 3 or (x + off) % 8 == 7
    v = ((x * 7 + y * 13) % 5) / 40; return (0.82, 0.8, 0.74) if mortar else (0.55 + v, 0.24 + v / 2, 0.17)
brick = mat('Brick', (1, 1, 1), 0.9, image=image('brick', 32, 32, brickpx)); plaster = mat('Plaster', (0.93, 0.9, 0.82), 0.95)
stone = mat('Stone', (0.86, 0.82, 0.72), 0.8); white = mat('Frame', (0.95, 0.95, 0.93), 0.5); slate = mat('Slate', (0.24, 0.27, 0.32), 0.7)
ridge = mat('RidgeTile', (0.55, 0.25, 0.18), 0.8); pot = mat('Pot', (0.62, 0.32, 0.2), 0.8); glass = mat('Glass', (0.55, 0.7, 0.8), 0.05, 0.3); dark = mat('Plinth', (0.32, 0.16, 0.12), 0.9)
FRONT, BACK = -D / 2, D / 2                                   # Blender y of the front (street) and back walls
walls = [box('front', W, T, H, 0, FRONT + T / 2, 0, brick), box('back', W, T, H, 0, BACK - T / 2, 0, brick),
         box('left', T, D - 2 * T, H, -W / 2 + T / 2, 0, 0, brick), box('right', T, D - 2 * T, H, W / 2 - T / 2, 0, 0, brick)]
holes = []   # (wall, x or y centre, width, sill z, top z)
def opening(wall, c, w, z0, z1, depth=1.0):
    o = walls[wall]; y = o.location.y if wall < 2 else 0; x = c if wall < 2 else o.location.x
    cutter = box('cut', w if wall < 2 else depth, depth if wall < 2 else w, z1 - z0, x, y if wall < 2 else c, z0, brick); cut(o, cutter)
DOOR_X, DOOR_W, DOOR_H = -2.0, 2.0, 2.6                     # the game's doorway (people and Sam walk through it)
opening(0, DOOR_X, DOOR_W, 0, DOOR_H + 0.45)                  # door + fanlight
opening(0, 1.7, 3.0, 0.7, 2.6)                                # bay opening
for c, w in ((-2.0, 1.0), (1.7, 1.2)): opening(0, c, w, 3.9, 5.6)   # front bedroom sashes
opening(1, 1.5, 1.2, 1.1, 2.4); opening(1, 0.5, 1.0, 3.9, 5.5); opening(1, 2.9, 0.6, 4.6, 5.5)   # kitchen; back bedroom; bathroom
parts = list(walls)
def sash(x, y, w, z0, z1, facing=-1, frosted=False):
    """A painted timber sash window in an opening centred at x on the wall plane y, stone sill below, lintel above."""
    fz = y + facing * -0.08; parts.append(box('sill', w + 0.3, 0.32, 0.1, x, y + facing * 0.06, z0 - 0.1, stone))
    parts.append(box('lintel', w + 0.3, 0.22, 0.24, x, y + facing * 0.02, z1, stone))
    for dx in (-w / 2 + 0.04, w / 2 - 0.04): parts.append(box('jamb', 0.08, 0.1, z1 - z0, x + dx, fz, z0, white))
    for z in (z0, (z0 + z1) / 2 - 0.03, z1 - 0.07): parts.append(box('rail', w, 0.1, 0.07, x, fz, z, white))
    parts.append(box('bar', 0.04, 0.08, z1 - z0, x, fz, z0, white))
    g = box('pane', w - 0.08, 0.02, z1 - z0, x, fz, z0, glass); g['glass'] = 1; panes.append(g)
panes = []
for c, w in ((-2.0, 1.0), (1.7, 1.2)): sash(c, FRONT, w, 3.9, 5.6)
sash(1.5, BACK, 1.2, 1.1, 2.4, 1); sash(0.5, BACK, 1.0, 3.9, 5.5, 1); sash(2.9, BACK, 0.6, 4.6, 5.5, 1)
# the canted bay: a stone base, three sashes (front and two angled sides), a little slate roof
BX, BW, BD = 1.7, 3.0, 0.75
parts.append(box('baybase', BW + 0.2, BD, 0.7, BX, FRONT - BD / 2, 0, stone))
sash(BX, FRONT - BD, 1.6, 0.7, 2.6)
for s in (-1, 1):
    pv = box('bayside', 0.9, 0.1, 1.9, BX + s * (BW / 2 - 0.3), FRONT - BD / 2, 0.7, white); pv.rotation_euler.z = s * 0.9
    g = box('pane', 0.7, 0.03, 1.7, BX + s * (BW / 2 - 0.3), FRONT - BD / 2 - 0.03, 0.8, glass); g.rotation_euler.z = s * 0.9; panes.append(g); parts.append(pv)
parts.append(box('bayroof', BW + 0.3, BD + 0.2, 0.18, BX, FRONT - BD / 2 + 0.05, 2.6, slate))
# the front door's surround: stone step, pilasters and a semicircular-headed fanlight
parts.append(box('step', DOOR_W + 0.4, 0.5, 0.15, DOOR_X, FRONT - 0.25, 0, stone))
for s in (-1, 1): parts.append(box('pilaster', 0.16, 0.12, DOOR_H + 0.45, DOOR_X + s * (DOOR_W / 2 + 0.08), FRONT - 0.05, 0, stone))
parts.append(box('doorhead', DOOR_W + 0.5, 0.2, 0.25, DOOR_X, FRONT - 0.04, DOOR_H + 0.45, stone))
g = box('fanlight', DOOR_W, 0.03, 0.4, DOOR_X, FRONT + 0.15, DOOR_H + 0.02, glass); panes.append(g)
# plinth and a string course of dark brick between the storeys
parts.append(box('plinth', W + 0.04, 0.06, 0.45, 0, FRONT - 0.01, 0, dark)); parts.append(box('course', W + 0.04, 0.06, 0.18, 0, FRONT - 0.01, 3.15, dark))
# the roof: Welsh slate, ridge parallel to the street, eaves over front and back; brick gable ends (party walls)
rise, ov = 2.7, 0.35
bm = bmesh.new(); vs = [bm.verts.new(v) for v in ((-W / 2, FRONT - ov, H - 0.15), (W / 2, FRONT - ov, H - 0.15), (W / 2, 0, H + rise), (-W / 2, 0, H + rise), (-W / 2, BACK + ov, H - 0.15), (W / 2, BACK + ov, H - 0.15))]
bm.faces.new((vs[0], vs[1], vs[2], vs[3])); bm.faces.new((vs[3], vs[2], vs[5], vs[4])); me = bpy.data.meshes.new('roof'); bm.to_mesh(me); ro = bpy.data.objects.new('roof', me); bpy.context.collection.objects.link(ro); ro.data.materials.append(slate)
sol = ro.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.12; bpy.context.view_layer.objects.active = ro; bpy.ops.object.modifier_apply(modifier='sol')
roofparts = [ro, box('ridge', W, 0.3, 0.16, 0, 0, H + rise - 0.06, ridge)]
for s in (-1, 1):   # gables: a triangle of brick on each party wall, a chimney stack on the ridge with pots
    bm = bmesh.new(); vs = [bm.verts.new(v) for v in ((s * (W / 2 - T / 2), FRONT, H), (s * (W / 2 - T / 2), BACK, H), (s * (W / 2 - T / 2), 0, H + rise))]; bm.faces.new(vs)
    me = bpy.data.meshes.new('gable'); bm.to_mesh(me); gb = bpy.data.objects.new('gable', me); bpy.context.collection.objects.link(gb); gb.data.materials.append(brick)
    so = gb.modifiers.new('s', 'SOLIDIFY'); so.thickness = T; bpy.context.view_layer.objects.active = gb; bpy.ops.object.modifier_apply(modifier='s'); roofparts.append(gb)
    st = box('stack', 0.7, 1.1, 1.5, s * (W / 2 - 0.35), 0, H + rise - 0.6, brick); roofparts.append(st); roofparts.append(box('cap', 0.8, 1.2, 0.1, s * (W / 2 - 0.35), 0, H + rise + 0.9, stone))
    for i in (-0.3, 0.0, 0.3):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=0.45, location=(s * (W / 2 - 0.35), i, H + rise + 1.22)); p = bpy.context.object; p.data.materials.append(pot); roofparts.append(p)
for o in parts + roofparts: world_uv(o, 1.0)
# inside faces of the outside walls: plaster, not brick
for o in walls:
    me = o.data; me.materials.append(plaster)
    for f in me.polygons:
        c = o.matrix_world @ f.center; n = f.normal
        if n.x * c.x + n.y * c.y < -0.01 and abs(c.x) < W / 2 - 0.05 and abs(c.y) < D / 2 - 0.05: f.material_index = 1
shell = join(parts, 'shell'); gl = join(panes, 'glass'); roof = join(roofparts, 'roof')
export(os.path.join(OUT, 'terrace.glb'))
preview(os.path.join(OUT, 'terrace_preview.png'), cam=(13, -17, 9), target=(0, 0, 4.2))
