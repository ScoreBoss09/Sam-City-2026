import * as THREE from 'three';
import { Markers } from './systems/Markers.js';
import { Birds } from './render/Birds.js';
import { NightFlyers } from './render/NightFlyers.js';
import { Plot } from './systems/Plot.js';
import { Stairway } from './systems/Stairway.js';
import { Transport } from './systems/Transport.js';
import { Crime } from './systems/Crime.js';
import { StreetLights } from './systems/StreetLights.js';
import { Hazards } from './systems/Hazards.js';
import { Happenings } from './systems/Happenings.js';
import { TILE, MAP } from './config.js';
import { Watchdog } from './core/Watchdog.js';
import { Glass } from './systems/Glass.js';
import { Decals } from './systems/Decals.js';
import { Photos } from './systems/Photos.js';
import { ModelLib } from './render/ModelLib.js';
// the town's systems: SIM_STEP run in every simulation round, SIM_FRAME once a frame (see Game.sys)
const SIM_STEP = ['economy', 'logistics', 'population', 'resources', 'social', 'traffic', 'planner', 'raids', 'security', 'tech'];
const SIM_FRAME = ['crime', 'hazards', 'happenings', 'transport', 'cars', 'rescue', 'carting', 'beerGarden', 'functionRoom', 'nightlife', 'plazas', 'overview', 'service', 'groundskeepers', 'lamps', 'markers', 'glass', 'decals', 'photos', 'models'];
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
import { Skills } from './systems/Skills.js';
import { Challenges } from './systems/Challenges.js';
import { Celebrations } from './systems/Celebrations.js';
import { Intro } from './systems/Intro.js';
import { Cutscene } from './systems/Cutscene.js';
import { PauseScene } from './systems/PauseScene.js';
import { TrackBuilder } from './systems/TrackBuilder.js';
import { Cars } from './systems/Cars.js';
import { Net } from './net/Net.js';
import { Combat } from './systems/Combat.js';
import { Rescue } from './systems/Rescue.js';
import { Carting } from './systems/Carting.js';
import { BeerGarden, FunctionRoom } from './systems/BeerGarden.js';
import { Nightlife } from './systems/Nightlife.js';
import { Plaza } from './systems/Plaza.js';
import { Overview } from './systems/Overview.js';
import { Service } from './systems/Service.js';
import { Groundskeepers } from './systems/Groundskeepers.js';
import { Fireworks } from './render/Fireworks.js';
import { Upgrades } from './systems/Upgrades.js';
import { PerfMonitor } from './core/PerfMonitor.js';
import { LiftRides } from './systems/LiftRides.js';
import { Autopilot } from './player/Autopilot.js';
import { Particles } from './render/Particles.js';
import { Piles } from './systems/Piles.js';
import { Mail } from './systems/Mail.js';
import { Talk } from './systems/Talk.js';
import { Favours } from './systems/Favours.js';
import { Curios } from './systems/Curios.js';
import { Events } from './systems/Events.js';
import { Weather } from './render/Weather.js';
import { Wildlife } from './render/Wildlife.js';
import { SiteLabels } from './render/SiteLabels.js';
import { TownBatch } from './render/TownBatch.js';
import { ToolRack } from './systems/Tools.js';
import { Planner } from './systems/Planner.js';
import { Resources } from './systems/Resources.js';
import { Social } from './systems/Social.js';
import { Decor } from './render/Decor.js';
import { Traffic } from './systems/Traffic.js';
import { Harbor } from './render/Harbor.js';
import { Tech } from './systems/Tech.js';
import { Seasons } from './render/Seasons.js';
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
    this.watchdog = new Watchdog(this); this.glass = new Glass(this); this.decals = new Decals(this); this.photos = new Photos(this); this.models = new ModelLib(this); Watchdog.watchContext(this, canvas);   // checked models (tools/assets/check.mjs); a freeze or a graphics-card reset always gets explained
    this.post = new Post(this.renderer, { enabled: opts.post !== false });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(70, 1, 0.3, 600);
    this.input = new Input(canvas); this.clock = new Clock(); this.messages = new Messages();
    this.world = new World(); this.terrain = new Terrain(this.scene, this.world); this.atmosphere = new Atmosphere(this.scene, this.renderer);
    this.tech = new Tech(this); this.roadPlans = new RoadPlans(this); this.tools = new ToolRack(this); this.resources = new Resources(this); this.economy = new Economy(this); this.buildings = new BuildingManager(this); this.construction = new ConstructionSystem(this); this.upgrades = new Upgrades(this); this.perf = new PerfMonitor(this); this.liftRides = new LiftRides(this); this.autopilot = new Autopilot(this); this.logistics = new Logistics(this);
    this.player = new Player(this); this.population = new Population(this); this.story = new Story(this); this.security = new Security(this); this.raids = new Raids(this); this.combat = new Combat(this); this.transport = new Transport(this); this.markers = new Markers(this); this.crime = new Crime(this); this.lamps = new StreetLights(this); this.hazards = new Hazards(this); this.happenings = new Happenings(this); this.planner = new Planner(this); this.social = new Social(this);
    this.god = new GodControls(this); this.ui = new UI(this); this.minimap = new Minimap(this); this.workgame = new WorkGame(this); this.skills = new Skills(this); this.challenges = new Challenges(this); this.celebrations = new Celebrations(this); this.introScene = new Intro(this); this.cutscene = new Cutscene(this); this.pauseScene = new PauseScene(this); this.trackBuilder = new TrackBuilder(this); this.cars = new Cars(this); this.net = new Net(this); this.rescue = new Rescue(this); this.carting = new Carting(this); this.beerGarden = new BeerGarden(this); this.functionRoom = new FunctionRoom(this); this.nightlife = new Nightlife(this); this.plazas = new Plaza(this); this.overview = new Overview(this); this.service = new Service(this); this.groundskeepers = new Groundskeepers(this); this.fireworks = new Fireworks(this); this.particles = new Particles(this.scene); this.piles = new Piles(this); this.mail = new Mail(this); this.talk = new Talk(this); this.favours = new Favours(this); this.events = new Events(this); this.weather = new Weather(this); this.siteLabels = new SiteLabels(this); this.townBatch = new TownBatch(this); this.decor = new Decor(this); this.traffic = new Traffic(this); this.harbor = new Harbor(this); this.elapsed = 0;
    this.clock.on('week', () => this.economy.monthly());   // (pay day is every Monday: rates, wages, upkeep and the accounts)
    // objective beacon
    this.beacon = new THREE.Group(); const bm = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, depthTest: false });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 4), bm); cone.rotation.x = Math.PI; cone.renderOrder = 20; const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 40, 6), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.22, depthWrite: false }));
    beam.position.y = 20; this.beacon.add(cone, beam); this.beacon.userData.cone = cone; this.beacon.visible = false; this.scene.add(this.beacon);
    this.setupCity(); this.resize(); window.addEventListener('resize', () => this.resize());
    this.input.allowLock = () => this.mode === 'sim' && this.started && !this.ui.modalOpen && !this.ending;
    this.input.onLockLost = () => { if (this.started && !this.ending && this.ui.pause && !this.ui.pause.open) this.ui.pause.show(); };   // Esc frees the mouse: that's the pause menu, as in most games
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
    const d = this.lift.doorOut; this.plaza = { x: d.x, z: d.z + 8 };
    for (const t of this.terrain.trees) if (t.alive && Math.hypot(t.x - this.lift.trigger.x, t.z - this.lift.trigger.z) < 14) this.terrain.removeTree(t);   // the Lift yard is kept clear
    this.tools.build(d.x + 8, d.z + 13);
    this.security.init(); this.wildlife = new Wildlife(this); this.birds = new Birds(this); this.nightFlyers = new NightFlyers(this); this.plot = new Plot(this); this.stairway = new Stairway(this); this.curios = new Curios(this);
    this.player.teleport(d.x + 2, d.z + 17, 0); this.player.yaw = Math.PI;
    this.god.target.set(d.x + 4, 0, d.z + 22); this.god.dist = 105; this.god.pitch = 1.05;
  }

  setMode(mode) {
    if (mode === 'sim' && this.autopilot && this.autopilot.on) {   // take the controls back from Sam's autopilot
      const n = this.autopilot.note; this.autopilot.on = false; this.autopilot.stop();
      if (this.player.sleeping) { this.clock.sleepBoost = 8; this.ui.fade(0.55, 'Zzz...'); } else if (n && this.started) this.ui.toast('Sam was ' + n + '.', 2600);
    }
    if (mode === 'god' && this.player) { if (this.player.platform && this.transport) this.transport.samDown(); if (this.player.mounted) this.player.mount(false); }   // (a train ride carries on: Sam gets off at the next station)
    if (mode === 'god' && this.player && !this.player.transit && (this.player.floorY || 0) > 0.3) { const b = this.buildings.buildingAtPoint(this.player.x, this.player.z); if (b && b.doorOut) this.player.teleport(b.doorOut.x, b.doorOut.z); else this.player.floorY = 0; }   // the autopilot only walks on the ground
    this.mode = mode; if (mode === 'sim') this.flags.sawSim = true; this.camera.fov = mode === 'god' ? 38 : 72; this.camera.near = mode === 'god' ? 1.5 : 0.3; this.camera.far = mode === 'god' ? 1400 : 600; this.camera.updateProjectionMatrix();   // planning view: the whole sea, without the depth fighting
    this.ui.setMode(mode); if (mode === 'god') { this.ui.setPrompt(null); this.god.setTool('pan'); }
  }
  start() {
    this.started = true; this.ui.start(); this.watchdog.start();
    INTRO.forEach(([f, t]) => this.messages.push(f, t, 'quiet'));   // (in the town news; the objective says what to do)
    this.ui.renderObjectives();
  }
  startDialogue(sim) {
    sim.frozen = true; sim.talkingToPlayer = true; if (sim.chat) this.social.endChat(sim); sim.heading = Math.atan2(this.player.x - sim.x, this.player.z - sim.z); this.player.heading = Math.atan2(sim.x - this.player.x, sim.z - this.player.z);
    this.ui.openDialogue(sim, this.talk.conversation(sim));
  }

  demo() { generateDemo(this); }
  save() { return SaveGame.save(this); }
  /** A new game opens on the wake-up scene instead of instructions. */
  playIntro() { this.introScene.start(); }
  loadSave(from) { const d = SaveGame.load(from); if (!d) return false; try { SaveGame.restore(this, d); this.ui.toast('Game loaded', 2000); return true; } catch (e) { console.error('load failed', e); return false; } }
  /** Out of Sam City: route is how (ride: the unguarded Lift; blast: down the ladder; stairs: through the overseers' door). */
  escape(route = 'ride') {
    if (this.ending) return; this.ending = true; this.flags.escapeRoute = route; this.ui.fade(1, ''); this.input.unlock(); this.messages.push('Sam (thought)', 'Keep walking. Don\'t look back.', 'story');
    setTimeout(() => { this.ui.fade(0); this.ui.showEnding(route); }, 2500);
  }

  /** Run one town system: tell the watchdog which one (so a freeze names it) and note any call that takes over 250 ms. */
  /** Freeze detail (only after a freeze among the townsfolk): say which step of whose update we're in, so a freeze names the function. */
  get tracing() { return !!(this.watchdog && this.watchdog.detail); }
  trace(label) { if (this.tracing) this.watchdog.beat((this._tr || '') + ' > ' + label); }
  sys(k, dt) {
    const o = this[k]; if (!o) return; this.watchdog.beat('town: ' + k); const t = performance.now(); o.update(dt); const d = performance.now() - t;
    if (d > 250) this.slowNote(k, d);
  }
  /** Something took far too long: into the F8 report, and kept (across a reload) for the next start's message. */
  slowNote(what, ms) {
    this.perf.note(`slow: ${what} took ${Math.round(ms)} ms`); if (performance.now() - (this._slowW || 0) < 1500) return; this._slowW = performance.now();
    try { const L = JSON.parse(localStorage.getItem('samcity-slow') || '[]'); L.push({ k: what, ms: Math.round(ms), at: Date.now() }); localStorage.setItem('samcity-slow', JSON.stringify(L.slice(-12))); } catch (e) { /* no storage */ }
  }
  /** The title screen: a slow flight round the island behind the menu (the planning camera itself isn't touched). */
  titleFlight(dt) {
    this.elapsed += dt; const t = this.elapsed, c = MAP * TILE / 2, cam = this.camera, tx = c + Math.cos(t * 0.03) * 36, tz = c + Math.sin(t * 0.03) * 28, yaw = t * 0.035 + 0.6, pitch = 0.5, d = 165;
    if (cam.fov !== 42) { cam.fov = 42; cam.near = 1.5; cam.far = 1400; cam.updateProjectionMatrix(); }
    cam.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, tz + Math.cos(yaw) * Math.cos(pitch) * d); cam.lookAt(tx, 0, tz);
    try { this.atmosphere.camPos = cam.position; this.atmosphere.hideDome = true; this.atmosphere.update(dt, this.clock, { x: tx, z: tz }, this.story, 0); } catch (e) { /* the sky can wait for the game */ }
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
    if (!this.started) { this.titleFlight(dt); this.render(dt); inp.endFrame(); return; }
    // the mouse may only be captured while walking around as Sam (a late capture after switching views would hide the cursor in planning)
    if (inp.locked && (this.mode !== 'sim' || ui.modalOpen || this.ending)) inp.unlock();
    // ...and taken back when Sam's walking about again (after the planning view, a form, the post, the pause menu), if it was captured before
    else if (inp.wantLock && !inp.locked && !inp.padActive && inp.allowLock() && document.hasFocus() && performance.now() - (this._lockTry || 0) > 1000) { this._lockTry = performance.now(); inp.lock(); }
    // modal / toggles
    const wasModal = ui.modalOpen;
    if (ui.pause.open && inp.hit('Escape')) { ui.pause.hide(); inp.pressed.delete('Escape'); }
    else if (!wasModal && this.started && !this.ending && ((inp.hit('Escape') && (this.mode === 'sim' || this.god.tool.id === 'pan')) || inp.hit('PadSpeed'))) { ui.pause.show(); inp.pressed.delete('Escape'); inp.pressed.delete('PadSpeed'); }   // the in-game menu
    if (ui.dialogue) ui.dialogueKeys(inp);
    if (ui.plan.open && (inp.hit('Escape') || inp.hit('KeyB') || inp.hit('KeyO'))) { ui.plan.close(); inp.pressed.delete('KeyB'); inp.pressed.delete('KeyO'); inp.pressed.delete('Escape'); }
    else if (this.started && !this.ending && !this.netVisitor && !ui.modalOpen && inp.hit('KeyO')) { ui.plan.show('town'); inp.pressed.delete('KeyO'); }   // the town overview, from anywhere (what the warning badge is about)
    else if (this.mode === 'god' && this.started && !ui.modalOpen && inp.hit('KeyB')) ui.plan.show();
    if (inp.hit('F8') || (ui.perfOpen && inp.hit('Escape'))) { ui.togglePerf(); inp.pressed.delete('Escape'); }
    if (ui.terminalB && inp.hit('Escape')) ui.closeTerminal();
    if (ui.invOpen && (inp.hit('Escape') || inp.hit('KeyI'))) { ui.closeInventory(); inp.pressed.delete('KeyI'); }
    if (ui.journalOpen && (inp.hit('Escape') || inp.hit('KeyJ'))) { ui.closeJournal(); inp.pressed.delete('KeyJ'); }
    if (ui.dialogue && inp.padHit(1)) ui.closeDialogue();
    if (!ui.modalOpen && !this.ending && !this.netVisitor && inp.hit('Tab') && !(this.combat.on && this.mode === 'sim' && !inp.padActive)) { this.setMode(this.mode === 'god' ? 'sim' : 'god'); inp.pressed.delete('Tab'); }   // (in combat a held Tab is the weapon wheel, so a tap switches on letting go: Combat.controls)
    if (inp.hit('KeyP') && !ui.modalOpen && !this.netVisitor) this.clock.speed = this.clock.speed ? 0 : 1;
    if ((inp.hit('PadCycle') || inp.hit('Period')) && !ui.modalOpen && !this.netVisitor && this.started) {   // one button cycles the speed
      const S = [1, 2, 4, 0], i = S.indexOf(this.clock.speed); this.clock.speed = S[(i + 1) % S.length]; if (this.clock.speed) ui.toast(`Speed ${this.clock.speed}x`, 1200);   // 1x > 2x > 4x > paused > 1x (paused says so in the PAUSED badge at the top)
    }
    if (!ui.modalOpen && this.mode === 'god') { if (inp.hit('Digit0')) this.clock.speed = 0; }
    if (!ui.modalOpen && !this.netVisitor && this.started) {   // + and - : faster and slower (1x, 2x, 4x; slower than 1x is paused)
      const S = [0, 1, 2, 4], i = Math.max(0, S.indexOf(this.clock.speed)), up = inp.hit('Equal') || inp.hit('NumpadAdd'), down = inp.hit('Minus') || inp.hit('NumpadSubtract');
      if (up || down) { this.clock.speed = S[Math.max(0, Math.min(S.length - 1, i + (up ? 1 : -1)))]; if (this.clock.speed) ui.toast(`Speed ${this.clock.speed}x`, 1200); }
    }
    // saving by itself: this game's slot every minute and a half, and a backup in the next autosave every five minutes,
    // done when the browser has a moment to spare (a save is a few milliseconds; the database write happens off to one side)
    this.saveT = (this.saveT || 0) + dt; this.autoT = (this.autoT || 0) + dt;
    if (this.saveT > 90 && !this.savePending) { this.saveT = 0; this.savePending = true; const later = window.requestIdleCallback || ((f) => setTimeout(f, 50)); later(() => { this.savePending = false; const auto = this.autoT > 300; if (auto) this.autoT = 0; if (this.save()) { if (auto) SaveGame.autosave(this); this.ui.saved && this.ui.saved(); } }, { timeout: 3000 }); }

    const gdt = this.clock.tick(dt) * (ui.modalOpen && this.mode === 'sim' ? 1 : 1);
    const steps = Math.min(40, Math.max(1, Math.ceil(gdt / 0.1))), sdt = gdt / steps;
    this.perf.lap('input+ui');
    // the town, in rounds of at most 0.1 game-seconds; when the computer can't keep up (4x speed, sleeping through the night in a big
    // town) it does what fits in ~45 ms this frame instead of trying to catch up and stalling
    if (gdt > 0) { const t0 = performance.now(); for (let i = 0; i < steps; i++) {
      for (const k of SIM_STEP) this.sys(k, sdt);
      if (i < steps - 1 && performance.now() - t0 > 45) { this.perf.simShort = (this.perf.simShort || 0) + 1; break; }
    } }
    else this.security.update(0);
    if (this.player.sleeping && this.clock.sleepBoost && this.clock.hour >= 6 && this.clock.hour < 7) { this.player.energy = 100; this.player.wake(); }
    for (const k of SIM_FRAME) this.sys(k, dt);
    this.perf.lap('simulation');
    if (!this.introScene.live && !this.cutscene.live) this.player.update(gdt, dt); this.perf.lap('Sam');
    for (const s of this.population.sims) s.sync(dt); this.social.render(dt); this.pauseScene.update(dt); this.net.update(dt); this.combat.update(dt);
    this.perf.lap('people anim');
    this.buildings.update(dt); this.tools.update(dt); this.story.update(dt); this.plot.update(dt); this.stairway.update(dt); this.ui.update(dt); this.minimap.update(dt); this.siteLabels.update(dt); this.townBatch.update(dt); this.workgame.update(dt); this.particles.update(dt); this.piles.update(dt * Math.max(0, this.clock.speed)); this.resources.animate(dt); this.mail.update(); this.challenges.update(dt); this.weather.update(dt); if (!this.seasons && this.decor) this.seasons = new Seasons(this); if (this.seasons) this.seasons.update(dt); if (this.started) this.favours.update(dt * this.clock.speed); if (this.curios) this.curios.update(dt); if (this.started) this.events.update(dt); this.celebrations.update(dt); this.liftRides.update(this.clock.speed > 0 ? dt : 0); this.fireworks.update(dt); this.atmosphere.flash = Math.max(this.fireworks.flash || 0, this.weather.flash || 0); this.atmosphere.flashCol = (this.weather.flash || 0) > (this.fireworks.flash || 0) ? 0xdfe8ff : this.fireworks.flashCol; if (this.wildlife) this.wildlife.update(dt); this.birds.update(dt); if (this.nightFlyers) this.nightFlyers.update(dt);

    this.perf.lap('town systems');
    // camera
    let focus;
    if (this.mode === 'god') { this.god.update(dt, inp, true); focus = this.god.target; if (this.player.cut && this.player.cut.size) this.player.cutaway(null); }
    else { this.god.update(dt, inp, false); this.god.grid.visible = false; this.god.ghost.visible = false; this.god.tileBox.visible = false; if (this.introScene.live) this.introScene.camera(this.camera, dt); else if (this.cutscene.live) this.cutscene.camera(this.camera, dt); else this.player.placeCamera(this.camera); focus = { x: this.player.x, z: this.player.z }; }
    { const t = this.story.target(); const p = this.player;
      if (t && this.started) { const near = this.mode === 'sim' && Math.hypot(t.x - p.x, t.z - p.z) < 7; this.beacon.visible = !near; const k = this.mode === 'god' ? this.god.dist / 40 : 1; this.beacon.position.set(t.x, 0, t.z); this.beacon.userData.cone.position.y = 5 + Math.sin(this.elapsed * 3) * 0.5; this.beacon.userData.cone.scale.setScalar(Math.max(1, k)); } else this.beacon.visible = false; }
    this.elapsed += dt; this.terrain.day = this.atmosphere.dayLevel; this.terrain.update(dt, this.mode === 'god'); this.atmosphere.hideDome = this.mode === 'god'; this.atmosphere.camPos = this.camera.position; this.atmosphere.update(dt, this.clock, focus, this.story, 0); this.decor.update(dt); this.decor.setNight(this.atmosphere.night); this.traffic.setNight(this.atmosphere.night); this.harbor.update(dt, this.elapsed);
    this.perf.lap('camera+sky+decor');
    this.render(dt); this.perf.lap('render'); inp.endFrame();
  }
  render() { if (!this.skipRender) { const inf = this.renderer.info; inf.autoReset = false; inf.reset(); this.post.render(this.scene, this.camera); } }
  /** Test/automation helper: run the simulation without rendering. */
  advance(seconds, step = 0.1) { this.skipRender = true; for (let t = 0; t < seconds; t += step) this.update(step); this.skipRender = false; }
  /** If the game runs slowly for a few seconds, trade a little prettiness for smoothness (shadows, then resolution). */
  guard(raw) {
    if (!this.started || raw > 3 || document.hidden || this.contextLost) return; this.ft = this.ft === undefined ? raw : this.ft * 0.95 + Math.min(raw, 1) * 0.05;
    // Auto quality keeps 24 fps; on High it only steps in when it's dangerously slow (under ~7 fps), before the graphics driver gives up
    this.slowT = this.ft > (this.lockQuality ? 0.15 : 0.042) ? (this.slowT || 0) + raw : 0; if (this.slowT < 4) return; this.slowT = 0; this.ft = 1 / 60;
    const sun = this.atmosphere.sun;
    if (sun.castShadow) { sun.castShadow = false; this.perf.note('sun shadows switched off (slow frames)'); this.ui.toast('Running slowly: shadows switched off to keep it smooth.', 4000); return; }
    if (this.renderScale > 0.42) { this.renderScale = Math.max(0.4, +(this.renderScale - 0.1).toFixed(2)); this.resize(); this.perf.note('render scale lowered to ' + this.renderScale); this.ui.toast(`Running slowly: picture resolution lowered (${Math.round(this.renderScale * 100)}%).`, 4000); }
  }
  run() {
    const loop = (t) => {
      const raw = (t - this.last) / 1000; this.last = t; this.guard(raw); this.perf.begin();
      try { this.update(raw); this.perf.frame(raw, performance.now() - this.perf.t0); } catch (e) {
        console.error(e); this.ui.reportError && this.ui.reportError(e);
        // keep the planning tools and the picture alive even if some other system tripped up this frame
        try { if (this.started && this.mode === 'god') this.god.update(Math.min(0.1, raw), this.input, true); this.render(raw); } catch (e2) { console.error(e2); }
        this.input.endFrame();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
