import * as THREE from 'three';
import { signTexture } from './Textures.js';
import { mergeByMaterial } from './BuildingFactory.js';

// The village fête, built around the middle of the site: a ring of stalls under striped awnings (cakes, the tombola, a
// coconut shy, plants, bric-a-brac, hook-a-duck), the tea tent, and a bouncy castle. Most of it is merged into a few
// draw calls; the bunting flags, the ducks and the castle move, so they stay apart (returned in `moving`).
const M = new Map(), mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!M.has(k)) M.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o })); return M.get(k); };
const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12), BALL = new THREE.SphereGeometry(0.5, 8, 6);
const stripes = new Map();
/** A striped awning canvas (red and white, blue and white...). */
function stripeMat(col) {
  if (stripes.has(col)) return stripes.get(col);
  const c = document.createElement('canvas'); c.width = 64; c.height = 8; const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f6f2ea' : col; x.fillRect(i * 8, 0, 8, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }); stripes.set(col, m); return m;
}
const put = (grp, geo, m, sx, sy, sz, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; grp.add(o); return o; };
const box = (g, w, h, d, c, x, y, z, o) => put(g, BOX, mat(c, o), w, h, d, x, y + h / 2, z);
const cyl = (g, r, h, c, x, y, z, o) => put(g, CYL, mat(c, o), r * 2, h, r * 2, x, y + h / 2, z);
const ball = (g, r, c, x, y, z) => put(g, BALL, mat(c), r * 2, r * 2, r * 2, x, y, z);
function sign(g, text, y, z, w = 1.6) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshStandardMaterial({ map: signTexture(text, '#f6f2ea', '#2a2a2a'), roughness: 0.9 })); m.position.set(0, y, z); g.add(m); return m; }

/** A stall: a clothed table, four posts, a striped awning, a sign, and whatever goes on the table (fill). Faces +z. */
function stall(col, cloth, label, fill) {
  const g = new THREE.Group();
  box(g, 2.0, 0.78, 0.8, cloth, 0, 0, 0); box(g, 2.06, 0.03, 0.86, 0xf6f2ea, 0, 0.78, 0);
  for (const x of [-1.05, 1.05]) for (const z of [-0.45, 0.45]) box(g, 0.06, 2.3, 0.06, 0x6b4a2a, x, 0, z);
  const aw = new THREE.Mesh(BOX, stripeMat(col)); aw.scale.set(2.3, 0.05, 1.35); aw.position.set(0, 2.35, 0.12); aw.rotation.x = 0.18; g.add(aw);
  const fr = new THREE.Mesh(BOX, stripeMat(col)); fr.scale.set(2.3, 0.22, 0.03); fr.position.set(0, 2.18, 0.8); g.add(fr);   // the scalloped front edge
  sign(g, label, 1.95, 0.83); fill(g); return g;
}
const CAKES = (g) => {
  for (let i = 0; i < 4; i++) { const x = -0.75 + i * 0.5; box(g, 0.32, 0.02, 0.32, 0xffffff, x, 0.81, -0.05); cyl(g, 0.14, 0.07, 0xf3d29a, x, 0.83, -0.05); cyl(g, 0.14, 0.02, 0xc8303a, x, 0.9, -0.05); cyl(g, 0.14, 0.07, 0xf3d29a, x, 0.92, -0.05); cyl(g, 0.14, 0.015, 0xffffff, x, 0.99, -0.05); }   // Victoria sponges
  for (let i = 0; i < 6; i++) { const x = -0.8 + i * 0.32; cyl(g, 0.05, 0.05, 0xd8a060, x, 0.81, 0.25); ball(g, 0.05, [0xf4b8c8, 0xffffff, 0x8a5a3a][i % 3], x, 0.88, 0.25); }   // fairy cakes
  cyl(g, 0.2, 0.12, 0xffffff, 0.75, 0.81, -0.2); cyl(g, 0.14, 0.1, 0xffffff, 0.75, 0.93, -0.2); cyl(g, 0.08, 0.08, 0xffffff, 0.75, 1.03, -0.2); ball(g, 0.03, 0xc8303a, 0.75, 1.13, -0.2);   // a three-tier
};
const TOMBOLA = (g) => {
  const drum = put(g, CYL, mat(0xe8c040, { metalness: 0.2 }), 0.6, 0.55, 0.6, -0.5, 1.12, 0); drum.rotation.z = Math.PI / 2; box(g, 0.05, 0.3, 0.05, 0x3a3a3a, -0.8, 0.8, 0); box(g, 0.05, 0.3, 0.05, 0x3a3a3a, -0.2, 0.8, 0); box(g, 0.04, 0.04, 0.22, 0x3a3a3a, -0.2, 1.12, 0.1);
  for (let i = 0; i < 7; i++) { const x = 0.05 + (i % 4) * 0.22, z = i < 4 ? -0.15 : 0.15; cyl(g, 0.045, 0.24, [0x2a6a2a, 0x6a3a1a, 0xc8303a, 0x2a4a8a][i % 4], x, 0.81, z); box(g, 0.06, 0.04, 0.01, 0xf2c94c, x, 0.95, z + 0.05); }   // bottles with raffle tickets
};
const PLANTS = (g) => { for (let i = 0; i < 8; i++) { const x = -0.8 + (i % 4) * 0.53, z = i < 4 ? -0.18 : 0.2; cyl(g, 0.1, 0.14, 0xb5562e, x, 0.81, z); ball(g, 0.15, 0x3a8a3a, x, 1.04, z); ball(g, 0.05, [0xe84a6a, 0xf2c94c, 0xa060d0, 0xffffff][i % 4], x + 0.06, 1.12, z + 0.06); } };
const BRIC = (g) => {
  box(g, 0.4, 0.25, 0.3, 0x8a6a4a, -0.7, 0.81, 0); cyl(g, 0.12, 0.35, 0xd8d0b8, -0.2, 0.81, -0.1); box(g, 0.25, 0.32, 0.2, 0x2a2a2a, 0.2, 0.81, 0.05);   // a box, a lamp base, a radio
  for (let i = 0; i < 5; i++) box(g, 0.06, 0.24, 0.17, [0xc8303a, 0x2a4a8a, 0x3a7a3a, 0xe0c040, 0x6a3a6a][i], 0.55 + i * 0.07, 0.81, -0.1);   // a row of paperbacks
  cyl(g, 0.11, 0.09, 0xf6f2ea, 0.55, 0.81, 0.25);   // a teapot (more or less)
};
const DUCKS = (g, moving) => {
  const pool = cyl(g, 0.95, 0.3, 0x3a7ac8, 0, 0, 1.6); pool.scale.set(1.9, 0.3, 1.9); cyl(g, 0.86, 0.02, 0x6ab0e8, 0, 0.29, 1.6);
  const ducks = new THREE.Group(); ducks.userData.keep = true; ducks.position.set(0, 0.31, 1.6); g.add(ducks); moving.push({ obj: ducks, spin: 0.35 });
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, d = new THREE.Group(); d.position.set(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62); ball(d, 0.07, 0xf2d020, 0, 0.04, 0); ball(d, 0.045, 0xf2d020, 0, 0.11, 0.05); box(d, 0.03, 0.02, 0.05, 0xff8a20, 0, 0.1, 0.1); ducks.add(d); }
};
function coconutShy(g) {
  for (const x of [-1.3, 1.3]) box(g, 0.08, 2.4, 0.08, 0x6b4a2a, x, 0, -0.4); const back = new THREE.Mesh(BOX, stripeMat('#2a7a3a')); back.scale.set(2.7, 1.5, 0.04); back.position.set(0, 1.25, -0.42); g.add(back);
  for (let i = 0; i < 5; i++) { const x = -1 + i * 0.5; box(g, 0.05, 1.0, 0.05, 0x8a8a8a, x, 0, 0); cyl(g, 0.06, 0.04, 0x8a8a8a, x, 1.0, 0); ball(g, 0.11, 0x6a4a2a, x, 1.15, 0); }
  box(g, 2.6, 0.04, 0.04, 0xd8342c, 0, 0.9, 1.8); for (const x of [-1.3, 1.3]) box(g, 0.05, 0.9, 0.05, 0x6b4a2a, x, 0, 1.8);   // the throwing line
  for (let i = 0; i < 3; i++) box(g, 0.45, 0.35, 0.3, 0xb89a6a, 1.5, 0, 1.4 - i * 0.4);   // sacks of balls
  sign(g, 'Coconut shy', 2.25, -0.38, 1.8);
}
function teaTent(g) {
  box(g, 3.2, 2.2, 2.4, 0xf6f2ea, 0, 0, 0); const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.2, 4), stripeMat('#c8303a')); roof.rotation.y = Math.PI / 4; roof.scale.set(1.0, 1, 0.75); roof.position.set(0, 2.8, 0); g.add(roof);
  box(g, 1.2, 1.6, 0.04, 0x2a2a2a, 0, 0, 1.21);   // the open flap
  box(g, 2.4, 0.78, 0.6, 0xf6f2ea, 0, 0, 1.75); cyl(g, 0.16, 0.42, 0xb8bcc2, -0.7, 0.78, 1.75, { metalness: 0.6, roughness: 0.4 }); for (let i = 0; i < 6; i++) cyl(g, 0.045, 0.06, 0xffffff, -0.2 + i * 0.16, 0.78, 1.7);   // the urn and the cups
  sign(g, 'Teas', 2.0, 1.23, 1.0);
}
function bouncy(g, moving) {
  const c = new THREE.Group(); g.add(c); moving.push({ obj: c, wobble: true });
  box(c, 3.0, 0.45, 3.0, 0x2a5fc8, 0, 0, 0);
  for (const [x, z, w, d] of [[0, -1.4, 3.0, 0.3], [-1.4, 0, 0.3, 3.0], [1.4, 0, 0.3, 3.0]]) box(c, w, 1.4, d, [0xd8342c, 0xf2c94c, 0xf2c94c][Math.abs(x) > 0 ? 1 : 0], x, 0.45, z);
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) { cyl(c, 0.3, 2.3, 0xd8342c, x, 0, z); ball(c, 0.32, 0xf2c94c, x, 2.4, z); }
}

/** Build the whole fête in a group (its origin is the middle of the site). */
export function buildFete(R = 7) {
  const grp = new THREE.Group(), moving = [], put2 = (o, a, r) => { o.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); o.rotation.y = -a - Math.PI / 2; grp.add(o); };   // facing the middle
  const S = [
    stall('#c8303a', 0xf6f2ea, 'Cakes', CAKES), stall('#2a5fc8', 0xd8342c, 'Tombola', TOMBOLA), stall('#3a8a3a', 0xe8e0c8, 'Plants', PLANTS),
    stall('#e8a020', 0x6a8ac8, 'Bric-a-brac', BRIC), stall('#a040a0', 0xf6f2ea, 'Hook-a-duck', (g) => DUCKS(g, moving)),
  ];
  S.forEach((s, i) => put2(s, Math.PI * 2 * (i + 0.5) / 7, R - 1.4));
  const shy = new THREE.Group(); coconutShy(shy); put2(shy, Math.PI * 2 * 5.5 / 7, R - 1.2);
  const tea = new THREE.Group(); teaTent(tea); put2(tea, Math.PI * 2 * 6.5 / 7, R + 0.8);
  const bc = new THREE.Group(); bouncy(bc, moving); bc.position.set(0, 0, 0); bc.scale.setScalar(0.85); grp.add(bc);
  for (const o of [...S, shy, tea]) mergeByMaterial(o);
  return { grp, moving };
}
/** Ducks go round, the castle sways a little. */
export function animateFete(moving, t) {
  for (const m of moving) { if (m.spin) m.obj.rotation.y = t * m.spin; if (m.wobble) { const k = 1 + Math.sin(t * 7) * 0.012; m.obj.scale.set(1 / k, k, 1 / k); } }
}
