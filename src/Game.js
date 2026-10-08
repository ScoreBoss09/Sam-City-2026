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
import { Planner } from './systems/Planner.js';
import { Social } from './systems/Social.js';
import { Decor } from './render/Decor.js';
import { Traffic } from './systems/Traffic.js';
import { Harbor } from './render/Harbor.js';
import { generateDemo } from './systems/Demo.js';
import { Player } from './player/Player.js';
import { GodControls } from './player/GodControls.js';
import { UI } from './ui/UI.js';
import { INTRO } from './data/story.js';

/** Composition root. In Unity this is the GameManager that wires the same systems together. */
export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas; this.flags = {}; this.mode = 'sim'; this.ending = false; this.fps = 60; this.glitch = 0; this.started = false; this.renderScale = opts.scale || 0.6;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(70, 1, 0.2, 700);
    this.input = new Input(canvas); this.clock = new Clock(); this.messages = new Messages();
    this.world = new World(); this.terrain = new Terrain(this.scene, this.world); this.atmosphere = new Atmosphere(this.scene, this.renderer);
    this.economy = new Economy(this); this.buildings = new BuildingManager(this); this.construction = new ConstructionSystem(this); this.logistics = new Logistics(this);
    this.player = new Player(this); this.population = new Population(this); this.story = new Story(this); this.security = new Security(this); this.planner = new Planner(this); this.social = new Social(this);
    this.god = new GodControls(this); this.ui = new UI(this); this.decor = new Decor(this); this.traffic = new Traffic(this); this.harbor = new Harbor(this); this.elapsed = 0;
    this.clock.on('month', () => this.economy.monthly());
    this.setupCity(); this.resize(); window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('click', () => { if (this.mode === 'sim' && !this.ui.modalOpen && this.started && !this.ending) this.input.lock(); });
    this.setMode('sim'); this.last = performance.now(); this.frames = 0;
  }
  get depot() { return this.buildings.list.find((b) => b.id === 'depot' && b.state === 'done') || null; }
  get townhall() { return this.buildings.list.find((b) => b.id === 'townhall') || null; }
  largeCount() { return this.buildings.list.filter((b) => b.def.large && b.state === 'done').length; }

  setupCity() {
    const w = this.world, B = this.buildings;
    const road = (x0, z0, x1, z1) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) w.addRoad(x, z); };
    // place buildings first (roads cannot overlap footprints), then roads
    this.lift = B.place('lift', 18, 2, 0, { instant: true });
    this.townhall0 = B.place('townhall', 20, 12, 0, { instant: true });
    B.place('depot', 11, 13, 0, { instant: true });
    this.starterHome = B.place('cottage', 23, 16, 2, { instant: true });
    this.tunnel = B.place('tunnel', 34, 19, 3, { instant: true });
    road(19, 5, 19, 24); road(9, 15, 30, 15); road(19, 20, 33, 20);
    this.starterHome.reservedForPlayer = true; this.starterHome.spots.bed[0].taken = 'player';
    this.plaza = { x: 19.5 * TILE, z: 17.5 * TILE };
    this.security.init();
    const h = this.starterHome, dx = h.doorOut.x - h.doorIn.x, dz = h.doorOut.z - h.doorIn.z; this.player.teleport(h.doorIn.x, h.doorIn.z, Math.atan2(dx, dz)); this.player.yaw = Math.atan2(-dx, -dz);
    this.god.target.set(20 * TILE, 0, 16 * TILE);
  }

  setMode(mode) {
    this.mode = mode; this.camera.fov = mode === 'god' ? 38 : 72; this.camera.updateProjectionMatrix();
    this.ui.setMode(mode); if (mode === 'god') { this.ui.setPrompt(null); this.god.setTool('pan'); }
  }
  start() {
    this.started = true; this.ui.start();
    INTRO.forEach(([f, t], i) => setTimeout(() => this.messages.push(f, t), 600 + i * 2500));
    this.ui.renderObjectives(); this.ui.toast('Click the view to capture the mouse. TAB = planning view.', 4500);
  }
  startDialogue(sim) {
    const res = this.story.dialogue(sim); sim.frozen = true; sim.talkingToPlayer = true; if (sim.chat) this.social.endChat(sim); sim.heading = Math.atan2(this.player.x - sim.x, this.player.z - sim.z); this.player.heading = Math.atan2(sim.x - this.player.x, sim.z - this.player.z);
    this.ui.openDialogue(sim, res);
  }
  demo() { generateDemo(this); }
  escape() {
    if (this.ending) return; this.ending = true; this.ui.fade(1, ''); this.input.unlock(); this.messages.push('Sam (thought)', 'The gate is open. Keep walking.', 'story');
    setTimeout(() => { this.ui.fade(0); this.ui.showEnding(); }, 2500);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(1); this.renderer.setSize(Math.max(320, Math.floor(w * this.renderScale)), Math.max(200, Math.floor(h * this.renderScale)), false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  update(raw) {
    const inp = this.input, ui = this.ui; const dt = Math.min(raw, 0.1);
    if (!this.skipRender) this.fps += ((1 / Math.max(raw, 0.001)) - this.fps) * 0.05;
    if (!this.started) { this.render(dt); inp.endFrame(); return; }
    // modal / toggles
    if (ui.dialogue && (inp.hit('KeyE') || inp.hit('Space') || inp.mouse.down)) ui.advanceDialogue();
    if (ui.terminalB && inp.hit('Escape')) ui.closeTerminal();
    if (!ui.modalOpen && !this.ending && inp.hit('Tab')) this.setMode(this.mode === 'god' ? 'sim' : 'god');
    if (inp.hit('KeyP') && !ui.modalOpen) this.clock.speed = this.clock.speed ? 0 : 1;
    if (!ui.modalOpen) { if (inp.hit('Digit0')) this.clock.speed = 0; }
    if (this.glitch > 0) this.glitch -= dt;

    const gdt = this.clock.tick(dt) * (ui.modalOpen && this.mode === 'sim' ? 1 : 1);
    const steps = Math.min(40, Math.max(1, Math.ceil(gdt / 0.1))), sdt = gdt / steps;
    if (gdt > 0) for (let i = 0; i < steps; i++) { this.economy.update(sdt); this.logistics.update(sdt); this.population.update(sdt); this.social.update(sdt); this.traffic.update(sdt); this.planner.update(sdt); this.security.update(sdt); }
    else this.security.update(0);
    if (this.player.sleeping && this.clock.sleepBoost && this.clock.hour >= 6 && this.clock.hour < 7) { this.player.energy = 100; this.player.wake(); }
    this.player.update(gdt, dt);
    for (const s of this.population.sims) s.sync(dt); this.social.render(dt);
    this.buildings.update(dt); this.story.update(dt); this.ui.update(dt);

    // camera
    let focus;
    if (this.mode === 'god') { this.god.update(dt, inp, true); focus = this.god.target; }
    else { this.god.update(dt, inp, false); this.god.grid.visible = false; this.god.ghost.visible = false; this.god.tileBox.visible = false; this.player.placeCamera(this.camera); focus = { x: this.player.x, z: this.player.z }; }
    this.elapsed += dt; this.terrain.update(dt, this.mode === 'god'); this.atmosphere.update(dt, this.clock, focus, this.story, this.glitch); this.decor.update(dt); this.decor.setNight(this.atmosphere.night); this.traffic.setNight(this.atmosphere.night); this.harbor.update(dt, this.elapsed);
    this.render(dt); inp.endFrame();
  }
  render() { if (!this.skipRender) this.renderer.render(this.scene, this.camera); }
  /** Test/automation helper: run the simulation without rendering. */
  advance(seconds, step = 0.1) { this.skipRender = true; for (let t = 0; t < seconds; t += step) this.update(step); this.skipRender = false; }
  run() { const loop = (t) => { const raw = (t - this.last) / 1000; this.last = t; try { this.update(raw); } catch (e) { console.error(e); } requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
}
