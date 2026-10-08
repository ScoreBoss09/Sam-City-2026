import * as THREE from 'three';

const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
function boxGeo(parts) {
  const pos = [], nor = [], col = [], idx = []; let n = 0;
  for (const [w, h, d, x, y, z, hex] of parts) {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); const c = new THREE.Color(hex), p = g.attributes.position, nr = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(nr.getX(i), nr.getY(i), nr.getZ(i)); col.push(c.r, c.g, c.b); }
    for (const i of g.index.array) idx.push(i + n); n += p.count;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g;
}
const COATS = [[0xb8814a, 0x8a5a30], [0x2b2b2e, 0x1a1a1c], [0xe8e0cf, 0xc9bfa8], [0x8a6a4a, 0xf2ece0]];

/** A little low-poly dog that trots after its owner. */
export class Dog {
  constructor(game, owner) {
    this.game = game; this.owner = owner; const [c1, c2] = COATS[Math.floor(Math.random() * COATS.length)];
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    const m = (parts, x = 0, y = 0, z = 0) => { const k = new THREE.Mesh(boxGeo(parts), mat); k.position.set(x, y, z); return k; };
    this.torso = m([[0.26, 0.26, 0.55, 0, 0, 0, c1], [0.2, 0.08, 0.3, 0, 0.16, -0.05, c2]], 0, 0.38, 0); this.body.add(this.torso);
    this.head = new THREE.Group(); this.head.position.set(0, 0.55, 0.3); this.body.add(this.head);
    this.head.add(m([[0.2, 0.2, 0.2, 0, 0, 0.05, c1], [0.12, 0.1, 0.14, 0, -0.04, 0.2, c2], [0.04, 0.04, 0.02, 0, -0.02, 0.28, 0x111111], [0.06, 0.12, 0.05, -0.1, 0.06, 0, c2], [0.06, 0.12, 0.05, 0.1, 0.06, 0, c2]]));
    this.tail = new THREE.Group(); this.tail.position.set(0, 0.5, -0.28); this.body.add(this.tail); this.tail.add(m([[0.05, 0.05, 0.28, 0, 0.0, -0.12, c2]]));
    this.legs = [[-0.09, 0.2], [0.09, 0.2], [-0.09, -0.2], [0.09, -0.2]].map(([x, z]) => { const g = new THREE.Group(); g.position.set(x, 0.3, z); g.add(m([[0.07, 0.3, 0.07, 0, -0.15, 0, c1]])); this.body.add(g); return g; });
    this.x = owner.x - 1; this.z = owner.z; this.h = owner.heading; this.ph = Math.random() * 6; this.sit = 0; this.still = 0; this.t = Math.random() * 9;
    game.scene.add(this.root);
  }
  update(dt) {
    const o = this.owner, g = this.game; this.t += dt;
    const hidden = o.hidden || !o.mesh.visible || (o.inside && !o.inside.def.open && o.inside !== g.buildings.playerInside);
    this.root.visible = !hidden; if (hidden) { this.x = o.x - Math.sin(o.heading) * 1.2; this.z = o.z - Math.cos(o.heading) * 1.2; return; }
    const tx = o.x - Math.sin(o.heading) * 1.25 + Math.cos(o.heading) * 0.5, tz = o.z - Math.cos(o.heading) * 1.25 - Math.sin(o.heading) * 0.5, dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
    let speed = 0; if (d > 0.35) { speed = Math.min(5.2, 1.4 + d * 2.2); const want = Math.atan2(dx, dz); let dh = want - this.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); this.h += dh * Math.min(1, dt * 9); this.x += Math.sin(this.h) * speed * dt; this.z += Math.cos(this.h) * speed * dt; this.still = 0; } else this.still += dt;
    const sitting = this.still > 2.5; this.sit += ((sitting ? 1 : 0) - this.sit) * Math.min(1, dt * 6);
    this.ph += speed * dt * 4.2; const run = Math.min(1, speed / 3), s = Math.sin(this.ph);
    this.legs[0].rotation.x = s * 0.9 * run; this.legs[1].rotation.x = -s * 0.9 * run; this.legs[2].rotation.x = -s * 0.9 * run + this.sit * -1.2; this.legs[3].rotation.x = s * 0.9 * run + this.sit * -1.2;
    this.body.rotation.x = -this.sit * 0.5; this.body.position.y = -this.sit * 0.13 + Math.abs(s) * 0.025 * run;
    this.tail.rotation.y = Math.sin(this.t * (sitting ? 9 : 6)) * (0.5 + this.sit * 0.3); this.tail.rotation.x = -0.5; this.head.rotation.x = Math.sin(this.t * 0.7) * 0.08 + (speed > 1 ? 0.15 : 0); this.head.rotation.y = Math.sin(this.t * 0.4) * 0.3 * (1 - run);
    this.root.position.set(this.x, 0, this.z); this.root.rotation.y = this.h;
  }
  dispose() { this.game.scene.remove(this.root); }
}
