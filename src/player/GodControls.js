import * as THREE from 'three';
import { TILE, MAP } from '../config.js';
import { BUILDINGS } from '../data/buildings.js';
import { ZONE } from '../world/World.js';
import { clamp } from '../util.js';

const ROAD_COST = 15;

/** God mode: orbit/pan camera over the city plus the planning tools (road, zone, build, bulldoze, query). */
export class GodControls {
  constructor(game) {
    this.game = game; this.target = new THREE.Vector3(80, 0, 64); this.yaw = 0; this.pitch = 1.1; this.dist = 150;
    this.tool = { id: 'pan', sub: null }; this.prefRot = 0; this.hover = null; this.painting = false; this.lastTile = null; this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const size = MAP * TILE; const pts = [];
    for (let i = 0; i <= MAP; i++) { pts.push(i * TILE, 0.07, 0, i * TILE, 0.07, size, 0, 0.07, i * TILE, size, 0.07, i * TILE); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.grid = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 })); this.grid.visible = false; game.scene.add(this.grid);
    this.tileBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })); this.tileBox.visible = false; game.scene.add(this.tileBox);
    this.ghost = new THREE.Group(); this.ghostBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x44ff66, transparent: true, opacity: 0.5, depthWrite: false })); this.ghost.add(this.ghostBox);
    this.ghostDoor = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); this.ghostDoor.rotation.x = Math.PI / 2; this.ghost.add(this.ghostDoor); this.ghost.visible = false; game.scene.add(this.ghost);
  }
  setTool(id, sub = null) {
    this.tool = { id, sub }; this.game.ui.refreshTools(); this.ghost.visible = false; this.tileBox.visible = false; this.painting = false;
  }
  placing() { return ['build', 'park', 'util'].includes(this.tool.id) && this.tool.sub; }

  pick(inp) {
    const g = this.game, cam = g.camera; this.ray.setFromCamera(new THREE.Vector2(inp.mouse.x * 2 - 1, -(inp.mouse.y * 2 - 1)), cam);
    const p = new THREE.Vector3(); if (!this.ray.ray.intersectPlane(this.plane, p)) return null; return p;
  }
  update(dt, inp, active) {
    const g = this.game, cam = g.camera;
    if (active && !g.ui.modalOpen) {
      let mx = 0, mz = 0; if (inp.down('KeyW') || inp.down('ArrowUp')) mz -= 1; if (inp.down('KeyS') || inp.down('ArrowDown')) mz += 1; if (inp.down('KeyA') || inp.down('ArrowLeft')) mx -= 1; if (inp.down('KeyD') || inp.down('ArrowRight')) mx += 1;
      const sp = this.dist * 0.9 * dt * (inp.down('ShiftLeft') ? 2 : 1), s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      this.target.x += (mx * c + mz * s) * sp; this.target.z += (-mx * s + mz * c) * sp;
      if (inp.down('KeyQ')) this.yaw += dt * 1.4; if (inp.down('KeyE')) this.yaw -= dt * 1.4;
      if (inp.mouse.wheel) this.dist = clamp(this.dist * (inp.mouse.wheel > 0 ? 1.12 : 0.89), 22, 230);
      if ((inp.mouse.right || inp.mouse.middle) && (inp.mouse.dx || inp.mouse.dy)) {
        if (inp.down('ShiftLeft') || inp.mouse.middle) { this.yaw -= inp.mouse.dx * 0.005; this.pitch = clamp(this.pitch + inp.mouse.dy * 0.004, 0.45, 1.5); }
        else { const k = this.dist * 0.0022; this.target.x -= (inp.mouse.dx * c + inp.mouse.dy * s) * k; this.target.z -= (-inp.mouse.dx * s + inp.mouse.dy * c) * k; }
      }
      if (inp.hit('KeyR')) this.prefRot = (this.prefRot + 1) % 4;
      if (inp.hit('Escape')) this.setTool('pan');
      const hs = { Digit1: ['bulldoze'], Digit2: ['road'], Digit3: ['zone', 'res'], Digit4: ['build'], Digit5: ['park'], Digit6: ['util'], Digit7: ['query'] };
      for (const k of Object.keys(hs)) if (inp.hit(k)) this.setTool(hs[k][0], hs[k][1] || null), g.ui.openSub(hs[k][0]);
    }
    const half = MAP * TILE; this.target.x = clamp(this.target.x, 0, half); this.target.z = clamp(this.target.z, 0, half);
    const cp = Math.cos(this.pitch), d = this.dist;
    cam.position.set(this.target.x + Math.sin(this.yaw) * cp * d, Math.sin(this.pitch) * d, this.target.z + Math.cos(this.yaw) * cp * d); cam.lookAt(this.target);
    // tool interaction
    this.grid.visible = active && this.tool.id !== 'pan' && this.tool.id !== 'query';
    if (!active || g.ui.modalOpen || !g.ui.mouseOverCanvas) { this.ghost.visible = false; this.tileBox.visible = false; if (!inp.mouse.left) this.painting = false; return; }
    const p = this.pick(inp); if (!p) return; const tx = Math.floor(p.x / TILE), tz = Math.floor(p.z / TILE); this.hover = [tx, tz];
    if (g.world.inBounds(tx, tz)) g.ui.setHover(this.describe(tx, tz));
    const id = this.tool.id; this.tileBox.visible = false; this.ghost.visible = false;
    if (id === 'road' || id === 'bulldoze' || id === 'zone') {
      this.tileBox.visible = g.world.inBounds(tx, tz); this.tileBox.scale.set(TILE, 0.2, TILE); this.tileBox.position.set((tx + 0.5) * TILE, 0.15, (tz + 0.5) * TILE);
      this.tileBox.material.color.setHex(id === 'bulldoze' ? 0xff5544 : id === 'road' ? 0xcccccc : 0x66ff99);
      if (inp.mouse.down) { this.painting = true; this.lastTile = null; }
      if (inp.mouse.left && this.painting) this.paint(tx, tz); else this.painting = false;
    } else if (this.placing()) {
      const def = BUILDINGS[this.tool.sub], ev = g.buildings.evaluate(this.tool.sub, tx, tz, this.prefRot), unlocked = g.economy.isUnlocked(this.tool.sub);
      const T4 = TILE, h = def.park ? 0.4 : Math.max(2, (def.floors || 1) * 3.2);
      this.ghost.visible = true; this.ghost.position.set(ev.geo.cx, 0, ev.geo.cz); this.ghostBox.scale.set(ev.w * T4, h, ev.d * T4); this.ghostBox.position.y = h / 2;
      const ok = ev.ok && unlocked; this.ghostBox.material.color.setHex(ok ? 0x44ff66 : 0xff4455);
      const [dx, dz] = [ev.geo.doorOut[0] - ev.geo.cx, ev.geo.doorOut[1] - ev.geo.cz]; this.ghostDoor.visible = def.needsRoad !== false; this.ghostDoor.position.set(dx, 0.9, dz); this.ghostDoor.rotation.set(0, Math.atan2(dx, dz), 0); this.ghostDoor.rotation.x = 0; this.ghostDoor.material.color.setHex(ok ? 0xffffff : 0xff8888);
      g.ui.setHover(`${def.name}: ${!unlocked ? 'Permit needed (use a terminal)' : ev.ok ? 'Click to place' : ev.reason}`);
      if (inp.mouse.down) {
        if (!unlocked) g.ui.toast('Permit required. Request it at a computer terminal.');
        else if (!ev.ok) g.ui.toast(ev.reason);
        else { const b = g.buildings.place(this.tool.sub, ev.x0, ev.z0, ev.rot); this.prefRot = ev.rot; g.messages.push('Planning Office', `${def.name} planned. It needs materials and workers.`); g.ui.toast(`${def.name} placed - needs building!`); }
      }
    } else if (id === 'query') {
      if (inp.mouse.down) g.ui.query(this.queryAt(p, tx, tz));
    }
  }
  paint(tx, tz) {
    const g = this.game, w = g.world; if (!w.inBounds(tx, tz)) return; const key = tx + ',' + tz; if (this.lastTile === key) return; this.lastTile = key; const id = this.tool.id;
    if (id === 'road') { if (w.canRoad(tx, tz)) { if (g.economy.spend(ROAD_COST)) w.addRoad(tx, tz); else g.ui.toast('Not enough funds.'); } }
    else if (id === 'zone') { const z = { res: ZONE.RES, com: ZONE.COM, ind: ZONE.IND, none: ZONE.NONE }[this.tool.sub || 'res']; w.setZone(tx, tz, z); }
    else if (id === 'bulldoze') {
      const b = w.buildingAt(tx, tz);
      if (b) { if (b.def.special) { g.ui.toast('That cannot be demolished.'); return; } g.buildings.remove(b); g.messages.push('Planning Office', `${b.def.name} demolished.`); }
      else if (w.road[w.idx(tx, tz)]) { if (!this.roadTouchesDoor(tx, tz) || true) w.removeRoad(tx, tz); }
      else if (w.zone[w.idx(tx, tz)]) w.setZone(tx, tz, 0);
    }
  }
  roadTouchesDoor() { return false; }
  describe(tx, tz) {
    const w = this.game.world, b = w.buildingAt(tx, tz); if (b) return `${b.def.name}${b.state === 'site' ? ` (building ${Math.round(b.progress * 100)}%)` : ''}`;
    if (w.road[w.idx(tx, tz)]) return 'Road'; const z = w.zone[w.idx(tx, tz)]; if (z) return ['', 'Residential zone', 'Commercial zone', 'Industrial zone'][z];
    const t = w.terrain[w.idx(tx, tz)]; return ['Water', 'Open land', 'Forest', 'Beach'][t];
  }
  queryAt(p, tx, tz) {
    const g = this.game; const s = g.population.nearest(p.x, p.z, 3.5); if (s) return { sim: s };
    const b = g.world.buildingAt(tx, tz); if (b) return { b }; return { tile: [tx, tz] };
  }
}
