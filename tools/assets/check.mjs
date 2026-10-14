#!/usr/bin/env node
/**
 * Sam City asset check: drop .glb models into assets/incoming/<category>/ and run
 *
 *     node tools/assets/check.mjs            (from the repo root; first time: cd tools/assets && npm install)
 *
 * For every new or changed model it:
 *   1. measures it (triangles, draw calls, materials, textures, size in metres, file size) against its category's budget;
 *   2. tidies it: duplicate data removed, parts that share a material joined into one draw call, plain-colour materials
 *      merged onto one small palette texture, oversized textures shrunk, the origin put at the bottom middle;
 *   3. brings it down to the triangle budget if it's over (keeping its shape; it says so if it can't without damage);
 *   4. makes two distance versions (about 40% and 12% of the triangles) for when it's further away;
 *   5. compresses the lot and writes it to assets/models/lib/<category>/, adds it to the manifest the game loads
 *      from, and writes assets/models/lib/REPORT.md (also printed here).
 *
 * Options:  --force   redo everything, not just new or changed files
 *           --keep    don't cut triangles to the budget (still tidied, still gets distance versions)
 *           --report  only measure and report; write nothing
 *           --in DIR / --out DIR   other folders (for testing)
 * Parts named with "wheel", "door", "keep_" or "move_" are kept separate, so the game can spin or open them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO, Logger } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, join, flatten, palette, simplify, textureCompress, meshopt, getBounds, cloneDocument, center, getGLPrimitiveCount, transformPrimitive, joinPrimitives } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2), flag = (f) => args.includes(f), opt = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? path.resolve(args[i + 1]) : d; };
const IN = opt('--in', path.join(ROOT, 'assets/incoming')), OUT = opt('--out', path.join(ROOT, 'assets/models/lib'));
const FORCE = flag('--force'), KEEP = flag('--keep'), REPORT_ONLY = flag('--report');

/**
 * Budgets per category (the folder a model is in). tris: triangles for the closest version; mats: materials (each one
 * is another draw call); tex: biggest texture side in pixels; lod: distances in metres at which the game switches to
 * the 40% and 12% versions (null: always close, no distance versions); far: beyond this it isn't drawn at all.
 */
export const BUDGETS = {
  props: { tris: 500, mats: 2, tex: 512, lod: [10, 25], far: 70, label: 'Small props (cups, signs, bins)' },
  furniture: { tris: 2000, mats: 3, tex: 1024, lod: [12, 30], far: 80, label: 'Furniture' },
  people: { tris: 3000, mats: 3, tex: 1024, lod: [15, 40], far: 140, label: 'People' },
  animals: { tris: 3000, mats: 3, tex: 1024, lod: [15, 40], far: 140, label: 'Animals (horses, dogs)' },
  bikes: { tris: 4000, mats: 3, tex: 1024, lod: [15, 40], far: 140, label: 'Bikes and motorbikes' },
  cars: { tris: 8000, mats: 4, tex: 1024, lod: [20, 55], far: 220, label: 'Cars, vans and buses' },
  buildings: { tris: 20000, mats: 6, tex: 2048, lod: [45, 110], far: 600, label: 'Building shells' },
  guns: { tris: 10000, mats: 4, tex: 2048, lod: null, far: 0, label: 'First-person guns (one on screen)' },
};
const ALIASES = { prop: 'props', vehicles: 'cars', car: 'cars', bike: 'bikes', person: 'people', animal: 'animals', building: 'buildings', gun: 'guns', weapons: 'guns' };
const KEEP_SEPARATE = /wheel|door|keep_|move_/i;   // parts the game moves
const LOD_RATIO = [0.4, 0.12], LOD_ERR = [[0.01, 0.025, 0.05], [0.04, 0.09, 0.18]];

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const QUIET = new Logger(Logger.Verbosity.WARN), quiet = (d) => { d.setLogger(QUIET); return d; };
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

/** Everything that matters for performance, measured. */
function measure(doc, bytes) {
  const root = doc.getRoot(), scene = root.getDefaultScene() || root.listScenes()[0]; let tris = 0, verts = 0, calls = 0; const skinned = root.listSkins().length > 0, animated = root.listAnimations().length > 0;
  const odd = new Set();
  const visit = (node) => { const mesh = node.getMesh(); if (mesh) for (const p of mesh.listPrimitives()) { calls++; const m = p.getMode(); if (m >= 4) tris += getGLPrimitiveCount(p); else odd.add(m === 0 ? 'points' : 'lines'); const pos = p.getAttribute('POSITION'); if (pos) verts += pos.getCount(); } for (const c of node.listChildren()) visit(c); };
  if (scene) for (const n of scene.listChildren()) visit(n);
  const tex = root.listTextures().map((t) => ({ name: t.getName() || t.getURI() || 'texture', size: t.getSize() || [0, 0], type: t.getMimeType() }));
  let size = [0, 0, 0], min = [0, 0, 0]; if (scene) { const b = getBounds(scene); size = b.max.map((v, i) => v - b.min[i]); min = b.min; }
  return { tris, verts, calls, mats: root.listMaterials().length, tex, size, min, bytes, skinned, animated, odd: [...odd] };
}
// 4x4 matrices (column-major, as glTF stores them)
const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let v = 0; for (let k = 0; k < 4; k++) v += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = v; } return o; };
function inv(m) {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m, b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  const d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
  return [(a11 * b11 - a12 * b10 + a13 * b09) * d, (a02 * b10 - a01 * b11 - a03 * b09) * d, (a31 * b05 - a32 * b04 + a33 * b03) * d, (a22 * b04 - a21 * b05 - a23 * b03) * d, (a12 * b08 - a10 * b11 - a13 * b07) * d, (a00 * b11 - a02 * b08 + a03 * b07) * d, (a32 * b02 - a30 * b05 - a33 * b01) * d, (a20 * b05 - a22 * b02 + a23 * b01) * d, (a10 * b10 - a11 * b08 + a13 * b06) * d, (a01 * b08 - a00 * b10 - a03 * b06) * d, (a30 * b04 - a31 * b02 + a33 * b00) * d, (a21 * b02 - a20 * b04 - a23 * b00) * d, (a11 * b07 - a10 * b09 - a12 * b06) * d, (a00 * b09 - a01 * b07 + a02 * b06) * d, (a31 * b01 - a30 * b03 - a32 * b00) * d, (a20 * b03 - a21 * b01 + a22 * b00) * d];
};
/** A part the game moves (a wheel, a door) made of several pieces becomes one mesh on its own node, so it can still turn as a whole once the rest is joined up. */
function collapseGroups(doc, notes) {
  const root = doc.getRoot(), groups = root.listNodes().filter((n) => KEEP_SEPARATE.test(n.getName()) && !root.listNodes().some((p) => p !== n && KEEP_SEPARATE.test(p.getName()) && p.listChildren().includes(n)));
  for (const g of groups) {
    const parts = []; const walk = (n) => { if (n.getMesh()) parts.push(n); for (const c of n.listChildren()) walk(c); }; walk(g); if (!parts.length) continue;
    const toLocal = inv(g.getWorldMatrix()), byMat = new Map();
    for (const n of parts) { const M = mul(toLocal, n.getWorldMatrix()); for (const p of n.getMesh().listPrimitives()) { const q = p.clone(); for (const s of p.listSemantics()) q.setAttribute(s, p.getAttribute(s).clone()); if (p.getIndices()) q.setIndices(p.getIndices().clone()); transformPrimitive(q, M); const k = q.getMaterial(); (byMat.get(k) || byMat.set(k, []).get(k)).push(q); } }
    const mesh = doc.createMesh(g.getName()); for (const prims of byMat.values()) { mesh.addPrimitive(prims.length > 1 ? joinPrimitives(prims) : prims[0]); if (prims.length > 1) for (const q of prims) q.dispose(); }
    for (const n of parts) if (n !== g) n.dispose(); g.setMesh(mesh);
  }
  return groups;
}
/** Tidy: drop duplicates, join parts that share a material, merge plain colours onto one palette, origin at the bottom middle. */
async function tidy(doc, cat, notes) {
  const root = doc.getRoot(), simple = !root.listSkins().length && !root.listAnimations().length;
  await doc.transform(dedup(), prune(), weld());
  if (cat !== 'guns') { await doc.transform(center({ pivot: 'below' })); }
  const plain = root.listMaterials().filter((m) => !m.getBaseColorTexture() && !m.getNormalTexture() && !m.getEmissiveTexture()).length;
  if (plain >= 2) { await doc.transform(palette({ min: 2 })); notes.push(`${plain} plain-colour materials merged onto one palette texture`); }
  if (simple) {   // join everything that can be joined (except the parts the game moves), across the whole model
    collapseGroups(doc, notes); await doc.transform(flatten());
    const kept = new Set(); for (const n of root.listNodes()) { if (KEEP_SEPARATE.test(n.getName()) && n.getMesh()) kept.add(n); else n.setName(''); } for (const m of root.listMeshes()) if (![...kept].some((n) => n.getMesh() === m)) m.setName('');
    await doc.transform(join({ keepNamed: true }), weld(), prune());
    if (kept.size) notes.push(`kept separate so the game can move them: ${[...kept].map((n) => n.getName()).join(', ')}`);
  }
}
/** Bring the triangle count down to `target` with as little change to the shape as possible: { ok, error } (error in % of the model's size). */
async function fit(doc, target, errs) {
  const before = measure(doc).tris; if (before <= target) return { doc, ok: true, error: 0 };
  let best = null;
  for (const error of errs) {
    const d = quiet(cloneDocument(doc)); await d.transform(simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, target / before), error, lockBorder: false }), prune());
    const t = measure(d).tris; best = { doc: d, ok: t <= target * 1.05, error: error * 100, tris: t }; if (best.ok) break;
  }
  return best;
}
async function shrinkTextures(doc, cap, notes) {
  const big = doc.getRoot().listTextures().filter((t) => { const s = t.getSize(); return s && Math.max(s[0], s[1]) > cap; });
  if (!big.length) return; await doc.transform(textureCompress({ encoder: sharp, resize: [cap, cap] })); notes.push(`${big.length} texture(s) shrunk to fit ${cap}px`);
}
/**
 * Moving parts keep their pivot: compression re-centres each mesh and moves its node to make up for it, which would put
 * a clock hand's (or a wheel's) turning point somewhere else. So the named part becomes an empty pivot node (exactly
 * where the artist put it) with the mesh on a child; compression only ever touches the child.
 */
function pivotParts(d) { for (const n of d.getRoot().listNodes()) { if (!KEEP_SEPARATE.test(n.getName()) || !n.getMesh()) continue; const child = d.createNode('').setMesh(n.getMesh()); n.setMesh(null); n.addChild(child); } }
async function write(doc, file) { const d = quiet(cloneDocument(doc)); pivotParts(d); await d.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' })); fs.mkdirSync(path.dirname(file), { recursive: true }); await io.write(file, d); return fs.statSync(file).size; }

const kb = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'), n = (x) => x.toLocaleString('en-GB'), m = (x) => (x >= 10 ? x.toFixed(0) : x.toFixed(2));
function categoryOf(file) { const rel = path.relative(IN, file).split(path.sep); const c = (rel.length > 1 ? rel[0] : 'props').toLowerCase(); return BUDGETS[c] ? c : ALIASES[c] || null; }
function list(dir) { if (!fs.existsSync(dir)) return []; return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? list(path.join(dir, e.name)) : /\.(glb|gltf)$/i.test(e.name) ? [path.join(dir, e.name)] : [])); }

const manifestFile = path.join(OUT, 'manifest.json'), manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { assets: {} };
const files = list(IN), results = [];
if (!files.length) { console.log(`Nothing to check: put .glb files in ${path.relative(ROOT, IN) || IN}/<category>/ (categories: ${Object.keys(BUDGETS).join(', ')}).`); process.exit(0); }
for (const file of files) {
  const cat = categoryOf(file), name = path.basename(file).replace(/\.(glb|gltf)$/i, ''), B = BUDGETS[cat], rel = path.relative(ROOT, file);
  if (!B) { results.push({ name, cat: '?', verdict: 'SKIPPED', notes: [`unknown category folder "${path.relative(IN, file).split(path.sep)[0]}": use one of ${Object.keys(BUDGETS).join(', ')}`] }); continue; }
  const out0 = path.join(OUT, cat, name + '.glb');
  if (!FORCE && !REPORT_ONLY && fs.existsSync(out0) && fs.statSync(out0).mtimeMs >= fs.statSync(file).mtimeMs && manifest.assets[cat + '/' + name]) { results.push({ ...manifest.assets[cat + '/' + name].report, unchanged: true }); continue; }
  const notes = [], warn = [];
  let doc; try { doc = quiet(await io.read(file)); } catch (e) { results.push({ name, cat, verdict: 'BROKEN', notes: [`couldn't read it: ${e.message}`] }); continue; }
  const before = measure(doc, fs.statSync(file).size);
  // the obvious mistakes first
  const big = Math.max(...before.size), badScale = big > 120 || (big > 0 && big < 0.03);
  if (big > 120) warn.push(`it's ${m(big)} m across: probably exported in centimetres (scale it by 0.01, or tick "Apply Unit" in Blender's glTF export)`);
  else if (big > 0 && big < 0.03) warn.push(`it's only ${m(big * 100)} cm across: check the scale (1 Blender unit = 1 metre)`);
  if (before.odd.length) warn.push(`has ${before.odd.join(' and ')} as well as triangles (they're drawn separately)`);
  await tidy(doc, cat, notes);
  if (cat !== 'guns' && (Math.abs(before.min[1]) > 0.02 || Math.abs(before.min[0] + before.size[0] / 2) > 0.05 || Math.abs(before.min[2] + before.size[2] / 2) > 0.05)) notes.push('origin moved to the bottom middle (where it stands)');
  await shrinkTextures(doc, B.tex, notes);
  let lod0 = doc, fitErr = 0, over = false; const tidied = measure(doc);
  if (tidied.tris > B.tris && !KEEP) { const r = await fit(doc, B.tris, [0.003, 0.008, 0.02, 0.04]); lod0 = r.doc; fitErr = r.error; over = !r.ok; notes.push(`cut from ${n(tidied.tris)} to ${n(measure(lod0).tris)} triangles (shape kept to within ${r.error.toFixed(1)}% of its size)`); }
  else if (tidied.tris > B.tris) over = true;
  const after = measure(lod0);
  if (after.mats > B.mats) warn.push(`${after.mats} materials (budget ${B.mats}): each one is another draw call. Share materials, or colour from one texture`);
  if (after.calls > B.mats + 2) warn.push(`${after.calls} draw calls for one copy`);
  if (after.skinned) notes.push('rigged (skinned): left whole, not joined');
  const lods = [];
  // distance versions: not for small models (under 1,000 triangles a cheaper copy saves next to nothing: it's the draw call that costs). They carry
  // no textures of their own: the game lends them the full version's materials (one copy of each texture, not three)
  if (B.lod && after.tris >= 1000) for (let i = 0; i < 2; i++) { const r = await fit(lod0, Math.max(12, Math.round(after.tris * LOD_RATIO[i])), LOD_ERR[i]); for (const t of r.doc.getRoot().listTextures()) t.dispose(); lods.push({ doc: r.doc, tris: measure(r.doc).tris }); }
  const verdict = badScale ? 'FIX THE SCALE' : over ? (KEEP ? 'OVER (kept as is: --keep)' : 'OVER: needs work in Blender') : warn.length ? 'OK, with warnings' : tidied.tris > B.tris ? 'OK (cut to budget)' : 'OK';
  if (over && !KEEP) warn.push(`couldn't get under ${n(B.tris)} without spoiling the shape: simplify it in Blender (Decimate modifier) or split it into parts`);
  const res = { name, cat, file: rel, verdict, budget: B.tris, before: { tris: before.tris, mats: before.mats, calls: before.calls, bytes: before.bytes, tex: before.tex }, after: { tris: after.tris, mats: after.mats, calls: after.calls, tex: after.tex }, lods: lods.map((l) => l.tris), size: after.size.map((v) => +v.toFixed(2)), fitErr, notes, warn };
  if (!REPORT_ONLY) {
    const dir = path.join(OUT, cat), files = [name + '.glb', ...lods.map((_, i) => `${name}.lod${i + 1}.glb`)];
    for (let i = lods.length + 1; i <= 2; i++) fs.rmSync(path.join(dir, `${name}.lod${i}.glb`), { force: true });   // (distance versions from an earlier, bigger version of the model)
    let bytes = await write(lod0, path.join(dir, files[0])); for (let i = 0; i < lods.length; i++) bytes += await write(lods[i].doc, path.join(dir, files[i + 1]));
    res.bytesOut = bytes;
    manifest.assets[cat + '/' + name] = { cat, files: files.map((f) => cat + '/' + f), dist: [0, ...(B.lod || []).slice(0, lods.length)], shareMats: lods.length > 0, far: B.far, tris: [after.tris, ...lods.map((l) => l.tris)], size: res.size, report: res };
  }
  results.push(res);
}

// ---------- the report ----------
const ok = results.filter((r) => /^OK/.test(r.verdict)).length, bad = results.filter((r) => /^(OVER|BROKEN|SKIPPED|FIX)/.test(r.verdict));
let md = `# Asset check\n\n${results.length} model(s): ${ok} fine, ${bad.length} need attention.${REPORT_ONLY ? ' (Report only: nothing was written.)' : ''}\n\n`;
md += '| Model | Category | Triangles (before → after, budget) | Distance versions | Materials | Draw calls | File size | Verdict |\n|---|---|---|---|---|---|---|---|\n';
for (const r of results) {
  if (!r.before) { md += `| ${r.name} | ${r.cat} | | | | | | ${r.verdict} |\n`; continue; }
  md += `| ${r.name}${r.unchanged ? ' (unchanged)' : ''} | ${r.cat} | ${n(r.before.tris)} → **${n(r.after.tris)}** (${n(r.budget)}) | ${r.lods.length ? r.lods.map(n).join(' / ') : 'none'} | ${r.before.mats} → ${r.after.mats} | ${r.before.calls} → ${r.after.calls} | ${kb(r.before.bytes)} → ${r.bytesOut ? kb(r.bytesOut) + ' (all versions)' : '-'} | ${r.verdict} |\n`;
}
for (const r of results) { if (!(r.notes || []).length && !(r.warn || []).length) continue; md += `\n### ${r.name}\n`; if (r.size) md += `- Size: ${r.size.map(m).join(' × ')} m (width × height × depth)\n`; for (const w of r.warn || []) md += `- ⚠️ ${w}\n`; for (const x of r.notes || []) md += `- ${x}\n`; }
md += `\n## Budgets\n\n| Category (folder) | Triangles | Materials | Biggest texture | Distance versions at |\n|---|---|---|---|---|\n${Object.entries(BUDGETS).map(([k, b]) => `| ${b.label} (\`${k}\`) | ${n(b.tris)} | ${b.mats} | ${b.tex} px | ${b.lod ? b.lod.join(' m, ') + ' m' : 'always close'} |`).join('\n')}\n`;
if (!REPORT_ONLY) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(manifestFile, JSON.stringify({ note: 'Written by tools/assets/check.mjs: models the game can load (src/render/Assets.js).', assets: Object.fromEntries(Object.entries(manifest.assets).map(([k, v]) => { const { report, ...rest } = v; return [k, { ...rest, report }]; })) }, null, 1)); fs.writeFileSync(path.join(OUT, 'REPORT.md'), md); }
console.log(md.replace(/\*\*/g, ''));
process.exitCode = bad.length ? 1 : 0;
