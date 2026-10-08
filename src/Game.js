import * as THREE from 'three';
import { TILE, MAP } from './config.js';
import { World } from './world/World.js';
import { Terrain } from './render/Terrain.js';
import { Atmosphere } from './render/Atmosphere.js';
import { BuildingManager } from './world/BuildingManager.js';
import { Clock } from './core/Clock.js';
import { Input } from './core/Input.js';
import { Messages } from './systems/Messages.js';
import { Economy } from './systems/Economy.js';
import { Logistics } from './systems/Logistics.js';
import { ConstructionSystem } from './systems/Construction.js';
import { Population } from './systems/Population.js';
import { Story } from './systems/Story.js';
import { Security } from './systems/Security.js';
import { Raids } from './systems/Raids.js';
import { RoadPlans } from './systems/RoadPlans.js';
import { Minimap } from './ui/Minimap.js';
import { WorkGame } from './ui/WorkGame.js';
import { Particles } from './render/Particles.js';
import { Piles } from './systems/Piles.js';
import { SiteLabels } from './render/SiteLabels.js';
import { ToolRack } from './systems/Tools.js';
import { Planner } from './systems/Planner.js';
import { Resources } from './systems/Resources.js';
import { Social } from './systems/Social.js';
import { Decor } from './render/Decor.js';
import { Traffic } from './systems/Traffic.js';
import { Harbor } from './render/Harbor.js';
import { generateDemo } from './systems/Demo.js';
import { Post } from './render/Post.js';
import * as SaveGame from './core/Save.js';
import { Player } from './player/Player.js';
import { GodControls } from './player/GodControls.js';
import { UI } from './ui/UI.js';
import { INTRO } from './data/story.js';

/** Composition root. In Unity this is the GameManager that wires the same systems together. */
export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas; this.flags = {}; this.mode = 'sim'; this.ending = false; this.fps = 60; this.glitch = 0; this.started = false; this.renderScale = opts.scale || 0.6;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.post = new Post(this.renderer, { enabled: opts.post !== false });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(70, 1, 0.3, 600);
    this.input = new Input(canvas); this.clock = new Clock(); this.messages = new Messages();
    this.world = new World(); this.terrain = new Terrain(this.scene, this.world); this.atmosphere = new Atmosphere(this.scene, this.renderer);
    this.roadPlans = new RoadPlans(this); this.tools = new ToolRack(this); this.resources = new Resources(this); this.economy = new Economy(this); this.buildings = new BuildingManager(this); this.construction = new ConstructionSystem(this); this.logistics = new Logistics(this);
    this.player = new Player(this); this.population = new Population(this); this.story = new Story(this); this.security = new Security(this); this.raids = new Raids(this); this.planner = new Planner(this); this.social = new Social(this);
    this.god = new GodControls(this); this.ui = new UI(this); this.minimap = new Minimap(this); this.workgame = new WorkGame(this); this.particles = new Particles(this.scene); this.piles = new Piles(this); this.siteLabels = new SiteLabels(this); this.decor = new Decor(this); this.traffic = new Traffic(this); this.harbor = new Harbor(this); this.elapsed = 0;
    this.clock.on('month', () => this.economy.monthly());
    // objective beacon
    this.beacon = new THREE.Group(); const bm = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, depthTest: false });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 4), bm); cone.rotation.x = Math.PI; cone.renderOrder = 20; const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 40, 6), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.22, depthWrite: false }));
    beam.position.y = 20; this.beacon.add(cone, beam); this.beacon.userData.cone = cone; this.beacon.visible = false; this.scene.add(this.beacon);
    this.setupCity(); this.resize(); window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('click', () => { if (this.mode === 'sim' && !this.ui.modalOpen && this.started && !this.ending) this.input.lock(); });
    this.setMode('god'); this.last = performance.now(); this.frames = 0;
  }
  get depot() { return this.buildings.list.find((b) => b.def.stores && b.state === 'done') || null; }
  get townhall() { return this.buildings.list.find((b) => b.id === 'surveyor') || this.buildings.list.find((b) => b.id === 'townhall') || null; }
  largeCount() { return this.buildings.list.filter((b) => b.def.large && b.state === 'done').length; }

  setupCity() {
    const B = this.buildings;
    // The island starts empty: only the Supply Lift and the Service Tunnel exist. Everything else is ordered in god mode and built by hand.
    this.lift = B.place('lift', 18, 2, 0, { instant: true });
    this.tunnel = B.place('tunnel', 34, 19, 3, { instant: true });
    const d = this.lift.doorOut; this.plaza = { x: d.x, z: d.z + 8 };
    for (const t of this.terrain.trees) if (t.alive && Math.hypot(t.x - this.lift.trigger.x, t.z - this.lift.trigger.z) < 13) this.terrain.killTree(t);   // the Lift yard is kept clear
    this.tools.build(d.x + 8, d.z + 13);
    this.security.init();
    this.player.teleport(d.x + 2, d.z + 17, 0); this.player.yaw = Math.PI;
    this.god.target.set(d.x + 4, 0, d.z + 22); this.god.dist = 105; this.god.pitch = 1.05;
  }

  setMode(mode) {
    this.mode = mode; if (mode === 'sim') this.flags.sawSim = true; this.camera.fov = mode === 'god' ? 38 : 72; this.camera.updateProjectionMatrix();
    this.ui.setMode(mode); if (mode === 'god') { this.ui.setPrompt(null); this.god.setTool('pan'); }
  }
  start() {
    this.started = true; this.ui.start();
    INTRO.forEach(([f, t], i) => setTimeout(() => this.messages.push(f, t), 600 + i * 2500));
    this.ui.renderObjectives(); this.ui.toast('Welcome! Start with the objective on the right. Nothing gets built until you order it here.', 5500);
  }
  startDialogue(sim) {
    const res = this.story.dialogue(sim); sim.frozen = true; sim.talkingToPlayer = true; if (sim.chat) this.social.endChat(sim); sim.heading = Math.atan2(this.player.x - sim.x, this.player.z - sim.z); this.player.heading = Math.atan2(sim.x - this.player.x, sim.z - this.player.z);
    this.ui.openDialogue(sim, res);
  }
  demo() { generateDemo(this); }
  save() { return SaveGame.save(this); }
  loadSave() { const d = SaveGame.load(); if (!d) return false; try { SaveGame.restore(this, d); this.ui.toast('Game loaded', 2000); return true; } catch (e) { console.error('load failed', e); return false; } }
  escape() {
    if (this.ending) return; this.ending = true; this.ui.fade(1, ''); this.input.unlock(); this.messages.push('Sam (thought)', 'The gate is open. Keep walking.', 'story');
    setTimeout(() => { this.ui.fade(0); this.ui.showEnding(); }, 2500);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(1); this.renderer.setSize(Math.max(320, Math.floor(w * this.renderScale)), Math.max(200, Math.floor(h * this.renderScale)), false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const sz = new THREE.Vector2(); this.renderer.getSize(sz); this.post.setSize(sz.x, sz.y);
  }

  update(raw) {
    const inp = this.input, ui = this.ui; const dt = Math.min(raw, 0.1);
    if (!this.skipRender) this.fps += ((1 / Math.max(raw, 0.001)) - this.fps) * 0.05;
    inp.pollPad(dt, !this.started || ui.modalOpen ? 'menu' : this.mode); ui.padUpdate(inp, dt);
    if (!this.started) { this.render(dt); inp.endFrame(); return; }
    // modal / toggles
    if (ui.dialogue && (inp.hit('KeyE') || inp.hit('Space') || inp.mouse.down)) ui.advanceDialogue();
    if (ui.terminalB && inp.hit('Escape')) ui.closeTerminal();
    if (ui.invOpen && (inp.hit('Escape') || inp.hit('KeyI'))) ui.closeInventory();
    if (ui.dialogue && inp.padHit(1)) ui.closeDialogue();
    if (!ui.modalOpen && !this.ending && inp.hit('Tab')) this.setMode(this.mode === 'god' ? 'sim' : 'god');
    if (inp.hit('KeyP') && !ui.modalOpen) this.clock.speed = this.clock.speed ? 0 : 1;
    if (!ui.modalOpen) { if (inp.hit('Digit0')) this.clock.speed = 0; }
    this.saveT = (this.saveT || 0) + dt; if (this.saveT > 45) { this.saveT = 0; this.save(); }

    const gdt = this.clock.tick(dt) * (ui.modalOpen && this.mode === 'sim' ? 1 : 1);
    const steps = Math.min(40, Math.max(1, Math.ceil(gdt / 0.1))), sdt = gdt / steps;
    if (gdt > 0) for (let i = 0; i < steps; i++) { this.economy.update(sdt); this.logistics.update(sdt); this.population.update(sdt); this.resources.update(sdt); this.social.update(sdt); this.traffic.update(sdt); this.planner.update(sdt); this.raids.update(sdt); this.security.update(sdt); }
    else this.security.update(0);
    if (this.player.sleeping && this.clock.sleepBoost && this.clock.hour >= 6 && this.clock.hour < 7) { this.player.energy = 100; this.player.wake(); }
    this.player.update(gdt, dt);
    for (const s of this.population.sims) s.sync(dt); this.social.render(dt);
    this.buildings.update(dt); this.story.update(dt); this.ui.update(dt); this.minimap.update(dt); this.siteLabels.update(dt); this.workgame.update(dt); this.particles.update(dt);

    // camera
    let focus;
    if (this.mode === 'god') { this.god.update(dt, inp, true); focus = this.god.target; if (this.player.cut && this.player.cut.size) this.player.cutaway(null); }
    else { this.god.update(dt, inp, false); this.god.grid.visible = false; this.god.ghost.visible = false; this.god.tileBox.visible = false; this.player.placeCamera(this.camera); focus = { x: this.player.x, z: this.player.z }; }
    { const o = this.story.currentObjective, t = o && o.target ? o.target(this) : null; const p = this.player;
      if (t && this.started) { const near = this.mode === 'sim' && Math.hypot(t.x - p.x, t.z - p.z) < 7; this.beacon.visible = !near; const k = this.mode === 'god' ? this.god.dist / 40 : 1; this.beacon.position.set(t.x, 0, t.z); this.beacon.userData.cone.position.y = 5 + Math.sin(this.elapsed * 3) * 0.5; this.beacon.userData.cone.scale.setScalar(Math.max(1, k)); } else this.beacon.visible = false; }
    this.elapsed += dt; this.terrain.day = this.atmosphere.dayLevel; this.terrain.update(dt, this.mode === 'god'); this.atmosphere.hideDome = this.mode === 'god'; this.atmosphere.update(dt, this.clock, focus, this.story, 0); this.decor.update(dt); this.decor.setNight(this.atmosphere.night); this.traffic.setNight(this.atmosphere.night); this.harbor.update(dt, this.elapsed);
    this.render(dt); inp.endFrame();
  }
  render() { if (!this.skipRender) this.post.render(this.scene, this.camera); }
  /** Test/automation helper: run the simulation without rendering. */
  advance(seconds, step = 0.1) { this.skipRender = true; for (let t = 0; t < seconds; t += step) this.update(step); this.skipRender = false; }
  run() { const loop = (t) => { const raw = (t - this.last) / 1000; this.last = t; try { this.update(raw); } catch (e) { console.error(e); } requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
}
