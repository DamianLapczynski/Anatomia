"""Eksport geometrii z szablonu Z-Anatomy (Startup.blend) do surowego formatu pośredniego.

Uruchomienie:  python3 -I tools/export_blend.py <Startup.blend> <katalog_wyjściowy>
Wymaga modułu `bpy` (pip install bpy). Plik .blend jest czytany wyłącznie jako dane —
automatyczne wykonywanie osadzonych skryptów jest wyłączone.
"""
import bpy, json, re, struct, sys
import numpy as np

SRC, OUT = sys.argv[-2], sys.argv[-1]
bpy.context.preferences.filepaths.use_scripts_auto_execute = False
bpy.ops.wm.open_mainfile(filepath=SRC, use_scripts=False, load_ui=False)
scene = bpy.context.scene

SYSTEMS = {
    '1: Skeletal system': 'skeleton',
    '2: Muscular insertions': 'insertions',
    '3: Joints': 'joints',
    '4: Muscular system': 'muscles',
    '5: Cardiovascular system': 'cardio',
    '7: Nervous system & Sense organs': 'nervous',
}
top = {}
for c in scene.collection.children:
    if c.name in SYSTEMS:
        for o in c.all_objects:
            top.setdefault(o.name, SYSTEMS[c.name])

LABEL_RE = re.compile(r'\.(j|i|t|s|g)$')
objs = [o for o in bpy.data.objects if o.name in top and o.type in ('MESH', 'CURVE') and not LABEL_RE.search(o.name)]

# Ograniczenie zagęszczenia siatki u źródła (taniej i ładniej niż późniejsza decymacja rurek).
for o in objs:
    if o.type == 'CURVE':
        o.data.resolution_u = min(o.data.resolution_u, 3)
        o.data.bevel_resolution = min(o.data.bevel_resolution, 1)
    for m in o.modifiers:
        if m.type == 'SUBSURF':
            m.levels = min(m.levels, 1)

dg = bpy.context.evaluated_depsgraph_get()
index, blob, offset = [], open(f'{OUT}/geometry.bin', 'wb'), 0
for o in objs:
    e = o.evaluated_get(dg)
    try:
        me = e.to_mesh()
    except RuntimeError:
        continue
    me.calc_loop_triangles()
    nt, nv = len(me.loop_triangles), len(me.vertices)
    if nt == 0:
        e.to_mesh_clear(); continue
    pos = np.empty(nv * 3, np.float32); me.vertices.foreach_get('co', pos)
    mw = np.array(o.matrix_world, np.float64)
    p = pos.reshape(-1, 3).astype(np.float64) @ mw[:3, :3].T + mw[:3, 3]
    tri = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('vertices', tri)
    tm = np.empty(nt, np.int32); me.loop_triangles.foreach_get('material_index', tm)
    mats = [s.material.name if s.material else None for s in e.material_slots]
    e.to_mesh_clear()
    chain, par = [], o.parent
    while par:
        chain.append(par.name); par = par.parent
    pb, tb, mb = p.astype(np.float32).tobytes(), tri.astype(np.uint32).tobytes(), tm.astype(np.uint8).tobytes()
    index.append(dict(name=o.name, sys=top[o.name], kind=o.type, colls=[c.name for c in o.users_collection],
                      parents=chain, mats=mats, nv=nv, nt=nt, off=offset))
    blob.write(pb); blob.write(tb); blob.write(mb); offset += len(pb) + len(tb) + len(mb)
blob.close()

# Etykiety punktów kostnych: obiekt tekstowy "<nazwa>.t" + linia "<nazwa>.j" wskazująca miejsce na kości.
labels = []
for o in bpy.data.objects:
    if o.type == 'FONT' and o.name.endswith('.t'):
        base = o.name[:-2]
        line = bpy.data.objects.get(base + '.j')
        pts = []
        if line and line.type == 'MESH':
            e = line.evaluated_get(dg); me = e.to_mesh()
            pts = [[round(c, 5) for c in (e.matrix_world @ v.co)] for v in me.vertices]
            e.to_mesh_clear()
        par = o.parent
        while par and LABEL_RE.search(par.name):
            par = par.parent
        labels.append(dict(name=base, text=[round(c, 5) for c in o.matrix_world.translation], line=pts,
                           parent=par.name if par else None, colls=[c.name for c in o.users_collection]))

json.dump(dict(objects=index, labels=labels), open(f'{OUT}/index.json', 'w'))
json.dump({m.name: [round(c, 4) for c in m.diffuse_color] for m in bpy.data.materials}, open(f'{OUT}/materials.json', 'w'))
json.dump({t.name: t.as_string() for t in bpy.data.texts}, open(f'{OUT}/texts.json', 'w'))
print('objects', len(index), 'tris', sum(i['nt'] for i in index), 'labels', len(labels))
