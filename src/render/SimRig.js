import * as THREE from 'three';

/**
 * Articulated low-poly person. Every limb segment is ONE merged, vertex-coloured mesh (cheap to draw),
 * parented to joint groups that the Animator rotates. Origin at the feet, facing +z.
 */
const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
const plain = {};
const pm = (c) => plain[c] || (plain[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
export const HIP_H = 0.93;

class Merger {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.idx = []; this.n = 0; this.tmp = new THREE.Matrix4(); this.q = new THREE.Quaternion(); }
  box(w, h, d, x, y, z, hex, rx = 0, ry = 0, rz = 0) {
    const g = new THREE.BoxGeometry(w, h, d); this.tmp.compose(new THREE.Vector3(x, y, z), this.q.setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)); g.applyMatrix4(this.tmp);
    const c = new THREE.Color(hex), p = g.attributes.position, nr = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { this.pos.push(p.getX(i), p.getY(i), p.getZ(i)); this.nor.push(nr.getX(i), nr.getY(i), nr.getZ(i)); this.col.push(c.r, c.g, c.b); }
    for (const i of g.index.array) this.idx.push(i + this.n); this.n += p.count; g.dispose(); return this;
  }
  mesh() {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); g.setIndex(this.idx);
    const m = new THREE.Mesh(g, mat); m.matrixAutoUpdate = true; return m;
  }
}
const shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); };

export const HAIR_STYLES = ['short', 'long', 'bun', 'bald', 'afro', 'side', 'pony'];

export function createRig(look = {}) {
  const L = {
    skin: 0xe0b48f, hair: 0x3b2a1a, hairStyle: 'short', shirt: 0x3f8f5a, pants: 0x333a48, shoes: 0x222222, longSleeve: false, shorts: false, skirt: false,
    hat: null, glasses: false, backpack: false, accessory: null, h: 1, w: 1, ...look,
  };
  const root = new THREE.Group(), body = new THREE.Group(), hips = new THREE.Group(); root.add(body); body.add(hips); hips.position.y = HIP_H;
  const j = { root, body, hips };
  const grp = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const skinD = shade(L.skin, 0.86);

  // pelvis / lower clothing
  const pel = new Merger().box(0.42, 0.2, 0.26, 0, 0.0, 0, L.pants).box(0.43, 0.04, 0.27, 0, 0.1, 0, 0x2b2118);
  if (L.skirt) pel.box(0.5, 0.3, 0.32, 0, -0.17, 0, L.pants);
  hips.add(pel.mesh());
  // spine / torso
  j.spine = grp(hips, 0, 0.08, 0);
  const tor = new Merger().box(0.46, 0.54, 0.26, 0, 0.27, 0, L.shirt).box(0.12, 0.04, 0.12, 0, 0.56, 0.02, skinD);
  const acc = L.accessory;
  if (acc === 'tie') tor.box(0.06, 0.3, 0.012, 0, 0.36, 0.132, 0xb02828).box(0.14, 0.04, 0.13, 0, 0.56, 0.02, 0xf2f2f2);
  if (acc === 'apron') tor.box(0.4, 0.5, 0.025, 0, 0.12, 0.14, 0xf4f1e6).box(0.3, 0.1, 0.03, 0, 0.1, 0.16, 0xe0d9c0);
  if (acc === 'coat') tor.box(0.5, 0.58, 0.3, 0, 0.26, 0, 0xf5f6f8).box(0.5, 0.34, 0.3, 0, -0.14, 0, 0xf5f6f8).box(0.04, 0.8, 0.31, 0, 0.1, 0.002, 0xdfe3e8);
  if (acc === 'vest') tor.box(0.48, 0.46, 0.285, 0, 0.3, 0, 0xf2931e).box(0.485, 0.045, 0.29, 0, 0.18, 0, 0xeeeeee).box(0.485, 0.045, 0.29, 0, 0.4, 0, 0xeeeeee);
  if (acc === 'badge') tor.box(0.07, 0.05, 0.01, 0.12, 0.38, 0.135, 0xf1c40f);
  if (acc === 'overalls') tor.box(0.4, 0.34, 0.03, 0, 0.14, 0.14, 0x3b5a8a).box(0.05, 0.3, 0.03, -0.14, 0.4, 0.14, 0x3b5a8a).box(0.05, 0.3, 0.03, 0.14, 0.4, 0.14, 0x3b5a8a);
  if (acc === 'uniform') tor.box(0.47, 0.08, 0.27, 0, 0.5, 0, shade(L.shirt, 0.8)).box(0.05, 0.05, 0.01, -0.12, 0.4, 0.135, 0xf1c40f).box(0.47, 0.05, 0.27, 0, 0.02, 0, 0x151515);
  if (L.backpack) tor.box(0.32, 0.38, 0.15, 0, 0.3, -0.2, 0x8a3b2a).box(0.28, 0.12, 0.04, 0, 0.18, -0.29, 0x6e2d1f);
  j.torso = tor.mesh(); j.spine.add(j.torso);
  // neck/head
  j.neck = grp(j.spine, 0, 0.58, 0); j.head = grp(j.neck, 0, 0.03, 0);
  const hd = new Merger().box(0.3, 0.32, 0.3, 0, 0.17, 0, L.skin).box(0.1, 0.06, 0.1, 0, -0.01, 0, skinD)
    .box(0.03, 0.08, 0.06, -0.165, 0.17, 0, skinD).box(0.03, 0.08, 0.06, 0.165, 0.17, 0, skinD)
    .box(0.07, 0.065, 0.012, -0.075, 0.2, 0.152, 0xffffff).box(0.07, 0.065, 0.012, 0.075, 0.2, 0.152, 0xffffff)
    .box(0.035, 0.05, 0.014, -0.07, 0.2, 0.158, 0x1b1b24).box(0.035, 0.05, 0.014, 0.07, 0.2, 0.158, 0x1b1b24)
    .box(0.04, 0.06, 0.05, 0, 0.14, 0.165, skinD);
  const hc = L.hair, hs = L.hairStyle, hatOn = !!L.hat;
  const brow = shade(hc, 0.8); hd.box(0.08, 0.016, 0.012, -0.075, 0.27, 0.153, brow).box(0.08, 0.016, 0.012, 0.075, 0.27, 0.153, brow);
  if (hs !== 'bald') {
    hd.box(0.32, 0.1, 0.32, 0, 0.35, 0, hc).box(0.32, 0.22, 0.09, 0, 0.25, -0.14, hc).box(0.04, 0.12, 0.28, -0.165, 0.28, 0, hc).box(0.04, 0.12, 0.28, 0.165, 0.28, 0, hc);
    if (hs === 'long') hd.box(0.33, 0.42, 0.08, 0, 0.1, -0.15, hc).box(0.04, 0.34, 0.1, -0.17, 0.1, -0.04, hc).box(0.04, 0.34, 0.1, 0.17, 0.1, -0.04, hc);
    if (hs === 'bun') hd.box(0.12, 0.12, 0.12, 0, 0.44, -0.08, hc);
    if (hs === 'afro') hd.box(0.42, 0.3, 0.42, 0, 0.36, -0.02, hc);
    if (hs === 'side') hd.box(0.34, 0.07, 0.12, -0.02, 0.4, 0.12, hc).box(0.1, 0.18, 0.1, 0.12, 0.26, 0.14, hc);
    if (hs === 'pony') hd.box(0.08, 0.3, 0.08, 0, 0.18, -0.2, hc).box(0.06, 0.06, 0.06, 0, 0.34, -0.19, 0xd9532b);
    if (hatOn && hs !== 'afro') { /* hat covers the top */ }
  }
  if (L.hat) {
    const h = L.hat; const hcol = h.color ?? 0xe8772e;
    if (h.type === 'cap') hd.box(0.34, 0.1, 0.34, 0, 0.37, 0, hcol).box(0.3, 0.025, 0.15, 0, 0.33, 0.2, shade(hcol, 0.8));
    if (h.type === 'hard') hd.box(0.35, 0.13, 0.35, 0, 0.38, 0, 0xf2c200).box(0.42, 0.025, 0.42, 0, 0.33, 0.02, 0xe0b000).box(0.06, 0.04, 0.36, 0, 0.45, 0, 0xf2c200);
    if (h.type === 'beanie') hd.box(0.34, 0.14, 0.34, 0, 0.38, 0, hcol).box(0.06, 0.06, 0.06, 0, 0.48, 0, shade(hcol, 1.3));
    if (h.type === 'police') hd.box(0.35, 0.1, 0.35, 0, 0.38, 0, 0x1b2340).box(0.3, 0.025, 0.16, 0, 0.33, 0.2, 0x0e1428).box(0.07, 0.05, 0.01, 0, 0.38, 0.18, 0xf1c40f);
    if (h.type === 'sun') hd.box(0.34, 0.07, 0.34, 0, 0.36, 0, 0xe9d9a0).box(0.62, 0.02, 0.62, 0, 0.33, 0, 0xe9d9a0);
  }
  if (L.glasses) hd.box(0.28, 0.02, 0.01, 0, 0.21, 0.162, 0x222222).box(0.095, 0.075, 0.01, -0.075, 0.2, 0.163, 0x6a8fb5).box(0.095, 0.075, 0.01, 0.075, 0.2, 0.163, 0x6a8fb5);
  j.headMesh = hd.mesh(); j.head.add(j.headMesh);
  // face parts that animate
  j.lids = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.07, 0.02), new THREE.MeshStandardMaterial({ color: L.skin, roughness: 0.9 })); j.lids.position.set(0, 0.2, 0.162); j.lids.visible = false; j.head.add(j.lids);
  const mc = new THREE.MeshBasicMaterial({ color: 0x5a1f1f });
  j.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.012), mc); j.mouth.position.set(0, 0.075, 0.153); j.head.add(j.mouth);
  j.mouthL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.012), mc); j.mouthR = j.mouthL.clone(); j.head.add(j.mouthL, j.mouthR);
  // arms & legs
  const arm = (side) => {
    const s = side === 'L' ? -1 : 1, sh = grp(j.spine, s * 0.3, 0.5, 0);
    const up = new Merger().box(0.14, 0.31, 0.15, 0, -0.14, 0, L.shirt).box(0.15, 0.04, 0.16, 0, -0.01, 0, shade(L.shirt, 0.9)); const upm = up.mesh(); sh.add(upm);
    const el = grp(sh, 0, -0.3, 0); const fo = new Merger().box(0.12, 0.27, 0.13, 0, -0.13, 0, L.longSleeve ? L.shirt : L.skin); el.add(fo.mesh());
    const wr = grp(el, 0, -0.27, 0); wr.add(new Merger().box(0.1, 0.11, 0.1, 0, -0.05, 0, L.skin).mesh());
    const hand = grp(wr, 0, -0.1, 0.02); return { sh, el, wr, hand };
  };
  const leg = (side) => {
    const s = side === 'L' ? -1 : 1, th = grp(hips, s * 0.11, -0.02, 0);
    th.add(new Merger().box(0.18, 0.45, 0.2, 0, -0.21, 0, L.pants).mesh());
    const kn = grp(th, 0, -0.44, 0); kn.add(new Merger().box(0.15, 0.43, 0.17, 0, -0.21, 0, L.shorts ? L.skin : L.pants).box(0.155, 0.05, 0.175, 0, -0.38, 0, L.shorts ? 0xf2f2f2 : shade(L.pants, 0.8)).mesh());
    const an = grp(kn, 0, -0.42, 0); an.add(new Merger().box(0.15, 0.08, 0.27, 0, -0.03, 0.05, L.shoes).box(0.15, 0.02, 0.27, 0, -0.07, 0.05, 0xdddddd).mesh());
    return { th, kn, an };
  };
  Object.assign(j, { armL: arm('L'), armR: arm('R'), legL: leg('L'), legR: leg('R') });
  root.scale.set(L.w, L.h, L.w); root.userData.rig = j; j.look = L;
  // simple far-away LOD: single merged mesh (no joints)
  const lod = new Merger().box(0.46, 0.54, 0.26, 0, 1.28, 0, L.shirt).box(0.3, 0.32, 0.3, 0, 1.83, 0, L.skin).box(0.32, 0.12, 0.32, 0, 2.0, 0, hs === 'bald' ? L.skin : L.hair).box(0.17, 0.9, 0.2, -0.11, 0.45, 0, L.pants).box(0.17, 0.9, 0.2, 0.11, 0.45, 0, L.pants);
  j.lod = lod.mesh(); j.lod.visible = false; root.add(j.lod);
  j.parts = []; root.traverse((o) => { if (o.isMesh && o !== j.lod) j.parts.push(o); });
  j.props = {};
  return j;
}

// ---------- props ----------
const pbox = (g, w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pm(c)); m.position.set(x, y, z); g.add(m); return m; };
const PROPS = {
  hammer: () => { const g = new THREE.Group(); pbox(g, 0.04, 0.34, 0.04, 0x8a5a33, 0, -0.1, 0.02); pbox(g, 0.06, 0.07, 0.18, 0x707880, 0, 0.08, 0.02); return g; },
  crate: () => { const g = new THREE.Group(); pbox(g, 0.5, 0.4, 0.5, 0xb5834a, 0, 0, 0); pbox(g, 0.52, 0.06, 0.52, 0x8a6236, 0, 0.12, 0); return g; },
  clipboard: () => { const g = new THREE.Group(); pbox(g, 0.24, 0.32, 0.02, 0x8a6a40, 0, 0.0, 0); pbox(g, 0.2, 0.27, 0.025, 0xf4f4ee, 0, 0, 0.004); return g; },
  phone: () => { const g = new THREE.Group(); pbox(g, 0.07, 0.13, 0.015, 0x111418, 0, 0, 0); pbox(g, 0.06, 0.11, 0.017, 0x5aa5e8, 0, 0, 0.002); return g; },
  mug: () => { const g = new THREE.Group(); pbox(g, 0.075, 0.09, 0.075, 0xf4f4f4, 0, 0.0, 0); pbox(g, 0.02, 0.05, 0.03, 0xf4f4f4, 0.05, 0, 0); return g; },
  book: () => { const g = new THREE.Group(); pbox(g, 0.2, 0.26, 0.04, 0x2f5f9a, 0, 0, 0); pbox(g, 0.17, 0.24, 0.045, 0xf6f1e0, 0.01, 0, 0); return g; },
  bag: () => { const g = new THREE.Group(); pbox(g, 0.26, 0.28, 0.14, 0x3f8f5a, 0, -0.15, 0); pbox(g, 0.12, 0.08, 0.02, 0x2d6a42, 0, 0.0, 0); return g; },
  wrench: () => { const g = new THREE.Group(); pbox(g, 0.035, 0.3, 0.02, 0xaeb4bc, 0, -0.08, 0.02); pbox(g, 0.09, 0.07, 0.03, 0xaeb4bc, 0, 0.1, 0.02); return g; },
  broom: () => { const g = new THREE.Group(); pbox(g, 0.03, 1.3, 0.03, 0x8a5a33, 0, -0.3, 0); pbox(g, 0.28, 0.2, 0.08, 0xd9c26a, 0, -0.98, 0); return g; },
  tablet: () => { const g = new THREE.Group(); pbox(g, 0.2, 0.28, 0.015, 0x1b1f26, 0, 0, 0); pbox(g, 0.18, 0.25, 0.017, 0x7ad0c0, 0, 0, 0.002); return g; },
  papers: () => { const g = new THREE.Group(); pbox(g, 0.22, 0.3, 0.02, 0xf6f6f0, 0, 0, 0); return g; },
};
/** Attach (or hide) a prop on a slot: 'handR' | 'handL' | 'chest'. */
export function setProp(rig, slot, name, color) {
  const key = slot; const cur = rig.props[key];
  if (cur && cur.name === name) { if (name === 'crate' && color != null) cur.obj.children[0].material = pm(color); return; }
  if (cur) { cur.obj.parent && cur.obj.parent.remove(cur.obj); delete rig.props[key]; }
  if (!name) return;
  const obj = PROPS[name](); if (name === 'crate' && color != null) obj.children[0].material = pm(color);
  const parent = slot === 'handR' ? rig.armR.hand : slot === 'handL' ? rig.armL.hand : rig.spine;
  if (slot === 'chest') obj.position.set(0, 0.28, 0.33); parent.add(obj); rig.props[key] = { name, obj };
}
