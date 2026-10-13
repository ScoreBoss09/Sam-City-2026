import * as THREE from 'three';
import { mergeByMaterial } from '../render/BuildingFactory.js';
import { makeStreetLamp, LAMP_GLOW } from '../render/Vehicles.js';
import { AGES } from '../data/ages.js';

/**
 * Street lamps, placed on road tiles with the Roads tool. They look like their age (a lantern on a post, oil lamps,
 * Victorian gas lamps, orange sodium, modern white) and are all rebuilt when the age turns. At night each throws a pool
 * of light on the road. All the lamps together are a handful of draw calls.
 */
export const LAMP_COST = 15;
const LAMP_NAMES = ['lanterns on posts', 'oil lamps', 'gas lamps', 'sodium lamps', 'modern lamps'];
export function lampName(age) { return LAMP_NAMES[age] || LAMP_NAMES[4]; }

export class StreetLights {
  constructor(game) {
    this.game = game; this.tiles = new Set(); this.group = null; this.age = -1; this.dirty = true;
    this.head = new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd080, emissiveIntensity: 0, roughness: 0.4 });
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    this.poolMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffc070 });
  }
  key(tx, tz, slot) { return tx + ',' + tz + ',' + slot; }
  /** Which of the 8 spots on a tile (4 corners, 4 edge middles) is nearest world point x,z; and where that is. */
  slotAt(tx, tz, x, z) { const dx = x - (tx + 0.5) * 8, dz = z - (tz + 0.5) * 8, a = Math.atan2(dz, dx); return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; }
  slotPos(tx, tz, slot) { const a = slot * Math.PI / 4, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a)), cx = (tx + 0.5) * 8, cz = (tz + 0.5) * 8; return { x: cx + c * 3.3, z: cz + s * 3.3, rot: Math.atan2(s, -c) }; }   // the arm points in, over the road
  toggle(tx, tz, slot = 5) {
    const g = this.game, w = g.world, k = this.key(tx, tz, slot);
    if (this.tiles.has(k)) { this.tiles.delete(k); this.dirty = true; return; }
    if (!w.inBounds(tx, tz) || !(w.road[w.idx(tx, tz)] || g.roadPlans.get(tx, tz))) { g.ui.toast('Street lamps go on roads and paths.', 1600); return; }
    if (!g.economy.spend(LAMP_COST, 'Street lamps')) { g.ui.toast('Not enough funds.'); return; }
    this.tiles.add(k); this.dirty = true; g.flags.lamps = this.tiles.size;
  }
  /** A new building gets a lamp on the pavement outside its door (free: it comes with the building), unless one's close. */
  autoFor(b) {
    const g = this.game, w = g.world; if (!g.started || g.flags.noAutoLamps || !b.doorTile || b.def.special || (b.def.park && b.w * b.d <= 1) || b.id === 'postbox' || b.id === 'well') return;   // not for phone boxes, postboxes and the like
    const { x: dx, z: dz } = b.doorTile, cand = [[dx, dz], [dx + 1, dz], [dx - 1, dz], [dx, dz + 1], [dx, dz - 1]].filter(([x, z]) => w.inBounds(x, z) && w.road[w.idx(x, z)]);
    if (!cand.length) return;
    const [tx, tz] = cand.sort((a, c) => Math.hypot((a[0] + 0.5) * 8 - b.doorOut.x, (a[1] + 0.5) * 8 - b.doorOut.z) - Math.hypot((c[0] + 0.5) * 8 - b.doorOut.x, (c[1] + 0.5) * 8 - b.doorOut.z))[0];
    const ang = Math.atan2(b.cz - (tz + 0.5) * 8, b.cx - (tx + 0.5) * 8), slot = ((Math.round(ang / (Math.PI / 2)) * 2) % 8 + 8) % 8, q = this.slotPos(tx, tz, slot);   // the side of the road the building's on
    for (const k of this.tiles) { const [x, z, s] = k.split(',').map(Number), p = this.slotPos(x, z, s); if (Math.hypot(p.x - q.x, p.z - q.z) < 14) return; }
    this.tiles.add(this.key(tx, tz, slot)); this.dirty = true;
  }
  rebuild() {
    const g = this.game, w = g.world, age = g.tech ? g.tech.age : 2; this.age = age; this.dirty = false;
    if (this.group) { g.scene.remove(this.group); this.group.traverse((o) => { if (o.geometry && o.geometry.userData.own) o.geometry.dispose(); }); this.group = null; }
    if (!this.tiles.size) return;
    this.head.color.setHex(LAMP_GLOW[age]); this.head.emissive.setHex(LAMP_GLOW[age]); this.poolMat.color.setHex(LAMP_GLOW[age]);
    const grp = new THREE.Group(), pools = [];
    for (const k of this.tiles) {
      const [tx, tz, sl] = k.split(',').map(Number); if (!w.inBounds(tx, tz) || !(w.road[w.idx(tx, tz)] || g.roadPlans.get(tx, tz))) continue;
      const q = this.slotPos(tx, tz, isNaN(sl) ? 5 : sl), lamp = makeStreetLamp(age, this.head); lamp.position.set(q.x, 0, q.z); lamp.rotation.y = q.rot; grp.add(lamp);
      const reach = age >= 3 ? 1.1 : 0.5, px = q.x + Math.cos(q.rot) * reach, pz = q.z - Math.sin(q.rot) * reach, R = [6, 7.5, 9, 10.5, 12][age] || 10.5, p = new THREE.PlaneGeometry(R, R); p.rotateX(-Math.PI / 2); p.translate(px, 0.07, pz); pools.push(p);   // brighter lamps, bigger pools of light as the ages go by
    }
    grp.traverse((o) => { if (o.isMesh) { o.castShadow = o.material !== this.head; o.receiveShadow = false; } });
    mergeByMaterial(grp);
    if (pools.length) { const geo = mergeGeos(pools); geo.userData.own = true; const m = new THREE.Mesh(geo, this.poolMat); m.renderOrder = 2; grp.add(m); }
    g.scene.add(grp); this.group = grp;
  }
  update() {
    const g = this.game; this.chk = (this.chk || 0) + 1; if (this.chk % 300 === 0 && this.tiles.size) { const w = g.world; for (const k of [...this.tiles]) { const [tx, tz] = k.split(',').map(Number); if (!(w.road[w.idx(tx, tz)] || g.roadPlans.get(tx, tz))) { this.tiles.delete(k); this.dirty = true; } } }   // the road went: so does its lamp
    if (this.dirty || (g.tech && g.tech.age !== this.age)) this.rebuild();
    const n = (g.atmosphere ? g.atmosphere.night || 0 : 0) * (g.hazards && g.hazards.powerCut > 0 && this.age >= 3 ? 0 : 1); this.head.emissiveIntensity = n * 1.8; this.poolMat.opacity = n * ([0.22, 0.25, 0.28, 0.32, 0.36][this.age] || 0.4);
  }
  serialize() { return [...this.tiles]; }
  load(a) { this.tiles = new Set((a || []).map((k) => (k.split(',').length === 2 ? k + ',5' : k))); this.dirty = true; }   // old saves: the north-west corner
  info() { return `${lampName(this.game.tech ? this.game.tech.age : 2)} (${AGES[this.game.tech ? this.game.tech.age : 2]} age), £${LAMP_COST} each. Click where you want it on the road square (corner or side); click it again to remove it. New buildings get one outside free, unless there's one close by.`; }
}
function mergeGeos(list) {
  const pos = [], uv = [], idx = []; let o = 0;
  for (const g of list) { pos.push(...g.attributes.position.array); uv.push(...g.attributes.uv.array); for (const i of g.index.array) idx.push(i + o); o += g.attributes.position.count; g.dispose(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); return geo;
}
