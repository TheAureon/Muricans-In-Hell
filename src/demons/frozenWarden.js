// THE FROZEN WARDEN (Ice Hell boss): a giant three-faced demon frozen up
// to its waist in a glacier, at the edge of a frozen lake (slippery!).
// It can't move, but its arms, breath and the ice itself fight for it:
//  - FIST SMASH when you're close in front of it: a big hit where the
//    fists land, and a ring of shattered ice rolling outward.
//  - ICE SPIKES: a line of spikes erupts from the ice, racing toward you.
//    Keep moving sideways!
//  - FREEZING BREATH: a blast of wind that shoves you away and freezes
//    your engine (Heaters help).
//  - At 2/3 and 1/3 health it calls Frost Wraiths out of the snow.
//  - Below half health: faster, angrier.
// Same outside shape as boss.js, so the rest of the game treats it the same.
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';
import { raySphere } from './demons.js';
import { SETTINGS } from '../settings.js';
import { terrain } from '../world/terrain.js';
import { Dust } from '../world/effects.js';

const SPIKES = 36;

export class FrozenWarden {
  constructor(scene, physics, ctx) {
    this.isBoss = true;
    const cfg = ctx.region.boss;
    this.cfg = cfg;
    this.name = cfg.name;
    this.B = SETTINGS.bosses[cfg.type];
    this.ctx = ctx;
    const A = cfg.arena;
    this.arenaCenter = new THREE.Vector3(A.x, terrain.height(A.x, A.z), A.z);
    this.arenaRadius = A.radius + 30;
    this.radius = 7;
    // It's frozen at the glacier, on the far side of the lake from the way you come in.
    const away = Math.atan2(A.x, A.z);
    this.home = new THREE.Vector3(A.x + Math.sin(away) * A.radius * 0.75, 0, A.z + Math.cos(away) * A.radius * 0.75);
    this.home.y = terrain.height(this.home.x, this.home.z);
    this.#buildModel(scene);
    this.frost = new Dust(scene, 260, 0xe8f6ff, 0.6);
    const { RAPIER, world } = physics;
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(this.home.x, this.home.y, this.home.z));
    world.createCollider(RAPIER.ColliderDesc.cylinder(4, 7.5).setTranslation(0, 4, 0), this.body);

    const ringGeo = new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xc0f0ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.visible = false;
    scene.add(this.ring);
    // A pool of ice spikes for the spike lines
    const spikeGeo = new THREE.ConeGeometry(0.9, 4.5, 5).translate(0, 2.25, 0);
    const spikeMat = litMaterial({ color: 0xbfe8ff, emissive: 0x2a6a9a, emissiveIntensity: 0.5, flatShading: true, roughness: 0.15, metalness: 0.1 });
    this.spikes = [];
    for (let i = 0; i < SPIKES; i++) {
      const m = new THREE.Mesh(spikeGeo, spikeMat);
      m.visible = false;
      m.castShadow = true;
      scene.add(m);
      this.spikes.push({ m, life: 0 });
    }
    this.mouth = new THREE.Vector3();
    this.reset();
  }

  get awake() { return this.state !== 'dormant' && this.state !== 'dead'; }
  distanceTo(p) { return Math.max(0, Math.hypot(p.x - this.pos.x, p.z - this.pos.z) - this.radius); }

  reset() {
    if (this.state === 'dying' && !this.exploded) this.#explode();
    this.pos = this.home.clone();
    this.prev = this.pos.clone();
    this.yaw = Math.atan2(this.arenaCenter.x - this.home.x, this.arenaCenter.z - this.home.z); // faces the lake
    this.baseYaw = this.yaw;
    this.hp = this.B.health;
    this.state = this.defeated ? 'dead' : 'dormant';
    this.timer = 0;
    this.action = null;
    this.cd = { smash: 2, spikes: 2, breath: 5 };
    this.summoned = { a: false, b: false };
    this.flash = 0;
    this.wave = null;
    this.line = null;
    for (const s of this.spikes) { s.life = 0; s.m.visible = false; }
    this.ring.visible = false;
    this.root.visible = !this.defeated;
    this.body.setNextKinematicTranslation(this.defeated || this.disabled ? { x: 0, y: -200, z: 0 } : { x: this.pos.x, y: this.pos.y, z: this.pos.z });
    this.ctx.hud?.bossBar(null);
  }

  setDisabled(on) {
    this.disabled = on;
    this.reset();
    if (on) this.root.visible = false;
  }

  // ------------------------------------------------------------------ hits
  takeHit(amount, source) {
    if (this.state === 'dead' || this.state === 'dying' || this.disabled) return false;
    if (this.state === 'dormant') this.#wake();
    const dealt = Math.min(amount, this.hp);
    this.hp -= amount;
    this.flash = 1;
    this.ctx.stats.record(source, dealt);
    if (this.hp <= 0) { this.#die(); return true; }
    return false;
  }

  raycast(o, dir) {
    if (this.state === 'dead' || this.disabled) return null;
    let best = null;
    const spots = [[this.pos.clone().setY(this.pos.y + 10), 5.5], [this.pos.clone().setY(this.pos.y + 17), 3.8], [this.pos.clone().setY(this.pos.y + 4), 7]];
    for (const [c, r] of spots) {
      const t = raySphere(o, dir, c, r);
      if (t !== null && (!best || t < best.t)) best = { t, point: o.clone().addScaledVector(dir, t) };
    }
    return best;
  }

  // ------------------------------------------------------------------ update
  fixedUpdate(dt, car) {
    const B = this.B;
    this.prev.copy(this.pos);
    this.flash = Math.max(0, this.flash - dt * 5);
    const carPos = car.currPos;
    const dist = Math.hypot(carPos.x - this.pos.x, carPos.z - this.pos.z);
    const fromArena = Math.hypot(carPos.x - this.arenaCenter.x, carPos.z - this.arenaCenter.z);
    this.#updateSpikes(dt, car);
    if (this.state === 'dead') return;
    if (this.state === 'dormant') {
      if (fromArena < this.arenaRadius && !car.wrecked) this.#wake();
      return;
    }
    if (this.state === 'dying') {
      this.timer += dt;
      if (this.timer > 2.8 && !this.exploded) this.#explode();
      return;
    }
    if (this.state === 'waking') {
      this.timer += dt;
      if (this.timer > 2.5) this.state = 'fight';
      return;
    }
    if (car.lastCrash && dist < this.radius + 4) {
      const c = car.lastCrash;
      this.takeHit(SETTINGS.ramming.ramPower * (c.lost / (SETTINGS.ramming.splatSpeedKmh / 3.6)) ** 2 * car.totalMass / SETTINGS.steering.referenceMass, 'ram');
      this.ctx.audio.thump();
    }
    if (car.wrecked || fromArena > B.leash) {
      this.action = null;
      this.hp = Math.min(B.health, this.hp + B.health * 0.05 * dt);
      if (this.hp >= B.health) { this.state = 'dormant'; this.ctx.hud.bossBar(null); }
      return;
    }

    const frac = this.hp / B.health;
    if (frac < 0.66 && !this.summoned.a) { this.summoned.a = true; this.#summon(); }
    if (frac < 0.33 && !this.summoned.b) { this.summoned.b = true; this.#summon(); }
    const enraged = frac < 0.5;
    const rate = enraged ? 1.4 : 1;
    for (const k in this.cd) this.cd[k] -= dt * rate;

    // Frozen in the ice: it can only twist its upper body so far.
    const want = Math.atan2(carPos.x - this.pos.x, carPos.z - this.pos.z);
    let d = want - this.baseYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const target = this.baseYaw + THREE.MathUtils.clamp(d, -1.3, 1.3);
    this.yaw += THREE.MathUtils.clamp(target - this.yaw, -0.8 * dt, 0.8 * dt);

    if (this.action) this.#runAction(dt, car, dist);
    else {
      if (dist < 28 && this.cd.smash <= 0) this.action = { type: 'smash', t: 0, windup: 1.1, done: false };
      else if (dist < B.breathRange && this.cd.breath <= 0) this.action = { type: 'breath', t: 0, windup: 0.8, done: false, blow: 2.8 };
      else if (dist > 16 && this.cd.spikes <= 0) this.action = { type: 'spikes', t: 0, windup: 0.6, done: false };
    }

    if (this.wave) {
      this.wave.r += 22 * dt;
      const wd = Math.hypot(carPos.x - this.wave.x, carPos.z - this.wave.z);
      if (!this.wave.hit && Math.abs(wd - this.wave.r) < 2 && car.grounded && !car.wrecked) {
        this.wave.hit = true;
        car.takeDamage(B.stompDamage, new THREE.Vector3(this.wave.x, carPos.y, this.wave.z).sub(carPos).setY(0).normalize().multiplyScalar(1.5).add(carPos));
        car.nudge(((carPos.x - this.wave.x) / (wd || 1)) * 7, ((carPos.z - this.wave.z) / (wd || 1)) * 7);
        this.ctx.chase.addShake(0.7);
      }
      if (this.wave.r > B.stompRadius) { this.wave = null; this.ring.visible = false; }
    }
    this.ctx.hud.bossBar(this.name, frac, enraged);
  }

  #runAction(dt, car, dist) {
    const B = this.B, a = this.action;
    a.t += dt;
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    if (a.t >= a.windup && !a.done) {
      a.done = true;
      if (a.type === 'smash') {
        this.cd.smash = 4;
        const at = this.pos.clone().addScaledVector(fwd, 13);
        at.y = terrain.height(at.x, at.z);
        const d = Math.hypot(car.currPos.x - at.x, car.currPos.z - at.z);
        if (d < B.slamRadius + 2 && !car.wrecked) {
          car.takeDamage(B.slamDamage, at.clone().setY(car.currPos.y));
          const away = car.currPos.clone().sub(at).setY(0).normalize();
          car.nudge(away.x * 10, away.z * 10);
        }
        this.wave = { x: at.x, z: at.z, r: 3, hit: d < B.slamRadius + 2 };
        this.ring.position.set(at.x, at.y + 0.2, at.z);
        this.ring.visible = true;
        for (let i = 0; i < 40; i++) {
          const ang = Math.random() * Math.PI * 2, s = 3 + Math.random() * 8;
          this.frost.spawn(at.clone().setY(at.y + 0.5), new THREE.Vector3(Math.cos(ang) * s, 3 + Math.random() * 6, Math.sin(ang) * s), 0.3 + Math.random() * 0.5, 1.0);
        }
        this.ctx.audio.wreck();
        this.ctx.chase.addShake(Math.max(0.3, 1.3 - d / 40));
      } else if (a.type === 'spikes') {
        this.cd.spikes = 3.6;
        // From its base straight at where you are now (two lines when enraged).
        const lines = this.hp < this.B.health * 0.5 ? [-0.12, 0.12] : [0];
        this.line = lines.map((off) => {
          const dir = new THREE.Vector3(car.currPos.x - this.pos.x, 0, car.currPos.z - this.pos.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), off);
          return { from: this.pos.clone().addScaledVector(dir, 9), dir, d: 0, next: 0, hit: false };
        });
        this.ctx.audio.thump();
      }
    }
    // The breath keeps blowing for a while after the wind-up.
    if (a.type === 'breath' && a.t >= a.windup) {
      const to = new THREE.Vector3(car.currPos.x - this.pos.x, 0, car.currPos.z - this.pos.z);
      const d = to.length();
      const ang = Math.acos(THREE.MathUtils.clamp(to.dot(fwd) / (d || 1), -1, 1));
      if (d < B.breathRange && ang < 0.45 && !car.wrecked) {
        to.divideScalar(d || 1);
        car.nudge(to.x * B.breathPush * dt * 4, to.z * B.breathPush * dt * 4);
        car.chill(B.breathChill * dt);
      }
      for (let n = 0; n < 4; n++) {
        const spread = new THREE.Vector3((Math.random() - 0.5) * 0.7, -0.25 + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.7);
        const v = fwd.clone().add(spread).normalize().multiplyScalar(30 + Math.random() * 15);
        this.frost.spawn(this.mouth.clone(), v, 0.5 + Math.random() * 0.7, 2.2);
      }
      if (a.t > a.windup + a.blow) { this.action = null; this.cd.breath = 9; }
      return;
    }
    if (a.t > a.windup + (a.type === 'smash' ? 0.9 : 0.4)) this.action = null;
  }

  // Spike lines race outward; each spike pops up, hurts you if you're on
  // top of it, then sinks back after a moment.
  #updateSpikes(dt, car) {
    for (const s of this.spikes) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const k = s.life > 1.0 ? Math.min(1, (1.4 - s.life) / 0.12) : Math.max(0, s.life);
      s.m.scale.set(1, Math.max(0.01, k), 1);
      if (s.life <= 0) s.m.visible = false;
    }
    if (!this.line) return;
    for (const L of this.line) {
      L.d += this.B.spikeSpeed * dt;
      while (L.next <= L.d && L.next < 95) {
        const at = L.from.clone().addScaledVector(L.dir, L.next);
        at.y = terrain.height(at.x, at.z) - 0.3;
        const s = this.spikes.find((q) => q.life <= 0);
        if (s) {
          s.life = 1.4;
          s.m.position.copy(at);
          s.m.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 6, (Math.random() - 0.5) * 0.4);
          s.m.scale.set(1, 0.01, 1);
          s.m.visible = true;
        }
        if (!L.hit && !car.wrecked && Math.hypot(car.currPos.x - at.x, car.currPos.z - at.z) < 2.8) {
          L.hit = true;
          car.takeDamage(this.B.spikeDamage, at.clone().setY(car.currPos.y - 0.3));
          car.nudge(0, 0);
          car.body.setLinvel({ x: car.body.linvel().x * 0.5, y: 6, z: car.body.linvel().z * 0.5 }, true); // knocked up in the air
          this.ctx.chase.addShake(0.6);
          this.ctx.audio.thump();
        }
        L.next += 2.4;
      }
    }
    if (this.line.every((L) => L.next >= 95)) this.line = null;
  }

  #summon() {
    const { demons, hud } = this.ctx;
    for (let i = 0; i < 3; i++) {
      const ang = this.yaw + (i - 1) * 0.8;
      demons.spawnPack(this.pos.clone().add(new THREE.Vector3(Math.sin(ang) * 30, 0, Math.cos(ang) * 30)), 6, 'frostWraith');
    }
    hud.toast(`${this.name} calls the frozen dead!`, 'warn');
    this.ctx.audio.wreck();
  }

  #wake() {
    if (this.state !== 'dormant') return;
    this.state = 'waking';
    this.timer = 0;
    this.ctx.hud.toast(`${this.name.toUpperCase()} AWAKENS!`, 'warn');
    this.ctx.hud.bossBar(this.name, this.hp / this.B.health, false);
    this.ctx.audio.roar?.();
    this.ctx.chase.addShake(1);
  }

  #die() {
    this.ctx.onDying?.();
    this.state = 'dying';
    this.timer = 0;
    this.exploded = false;
    this.action = null;
    this.wave = null;
    this.line = null;
    this.ring.visible = false;
    this.ctx.stats.kill('gun');
    this.ctx.hud.bossBar(null);
    this.ctx.audio.wreck();
  }

  #explode() {
    this.exploded = true;
    this.defeated = true;
    this.state = 'dead';
    const L = this.cfg.look || {};
    const colors = [L.skin ?? 0x5a6a8a, L.dark ?? 0x1a2030, 0xc8f0ff, 0x9a0a0a, 0xffffff];
    for (let k = 0; k < 5; k++) this.ctx.gore.explode(this.pos.clone().setY(this.pos.y + 3 + k * 3), new THREE.Vector3((Math.random() - 0.5) * 14, 8, (Math.random() - 0.5) * 14), colors, 4);
    this.ctx.audio.wreck();
    this.ctx.chase.addShake(1.4);
    this.root.visible = false;
    this.body.setNextKinematicTranslation({ x: 0, y: -200, z: 0 });
    this.ctx.onDefeated?.();
  }

  // ------------------------------------------------------------------ drawing
  render(alpha, dt) {
    this.frost.update(dt);
    if (!this.root.visible) return;
    const now = performance.now() / 1000;
    this.root.position.copy(this.pos);
    this.upper.rotation.y = this.yaw - this.baseYaw;
    this.matSkin.emissive.setRGB(this.flash * 0.5, this.flash * 0.7, this.flash * 0.9);
    this.matGlow.emissiveIntensity = 1.2 + Math.sin(now * 2.5) * 0.4 + (this.hp < this.B.health * 0.5 ? 0.8 : 0);

    // Arms: hanging / raised for a smash / bracing for the breath
    const a = this.action;
    const wind = a ? Math.min(1, a.t / a.windup) : 0, after = a && a.t > a.windup;
    let arm = -0.3, lean = 0, jaw = 0.05;
    if (this.state === 'dormant') { arm = 0.2; lean = 0.35; }
    if (this.state === 'waking') { const k = Math.max(0, 1 - this.timer / 2.5); arm = 0.2 * k - 2.4 * (1 - k) * (k > 0.4 ? 1 : 0); lean = 0.35 * k; jaw = 0.5 * (1 - k); }
    if (a?.type === 'smash') { arm = after ? 0.9 : -2.9 * wind; lean = after ? 0.45 : -0.2 * wind; }
    if (a?.type === 'breath') { lean = after ? 0.15 : -0.15 * wind; jaw = after ? 0.6 : 0.3 * wind; arm = -0.6; }
    if (a?.type === 'spikes') { arm = after ? 0.6 : -1.2 * wind; lean = after ? 0.25 : 0; }
    if (this.state === 'dying') { const k = Math.min(1, this.timer / 2.8); lean = k * 0.9; arm = 1.2 * k; jaw = 0.7; }
    const k = 1 - Math.exp(-10 * dt);
    for (const [i, s] of [this.armL, this.armR].entries()) {
      const want = arm + (i ? 0.08 : -0.08) * Math.sin(now * 1.5);
      s.rotation.x += (want - s.rotation.x) * k;
    }
    this.upper.rotation.x += (lean - this.upper.rotation.x) * k;
    for (const j of this.jaws) j.rotation.x += (jaw - j.rotation.x) * k;
    this.upper.scale.y = 1 + Math.sin(now * 0.9) * 0.01;
    this.root.updateMatrixWorld(true);
    this.mouthMark.getWorldPosition(this.mouth);
    if (this.wave) {
      this.ring.scale.setScalar(this.wave.r);
      this.ring.material.opacity = 0.8 * (1 - this.wave.r / this.B.stompRadius);
    }
  }

  // ------------------------------------------------------------------ model
  #buildModel(scene) {
    const L = { skin: 0x5a6a8a, dark: 0x1a2030, glow: 0x80e0ff, eye: 0xe0ffff, horn: 0x101018, ice: 0xbfe8ff, wing: 0x2a3048, ...this.cfg.look };
    this.matSkin = litMaterial({ color: L.skin, flatShading: true, roughness: 0.55, metalness: 0.15 });
    const dark = litMaterial({ color: L.dark, flatShading: true, roughness: 0.8 });
    this.matGlow = litMaterial({ color: L.glow, emissive: L.glow, emissiveIntensity: 1.4, flatShading: true });
    const horn = litMaterial({ color: L.horn, flatShading: true, roughness: 0.4 });
    const ice = litMaterial({ color: L.ice, flatShading: true, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 });
    const wingMat = litMaterial({ color: L.wing, flatShading: true, roughness: 0.6, side: THREE.DoubleSide });
    const eye = new THREE.MeshBasicMaterial({ color: L.eye });
    const add = (parent, geo, mat, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      return m;
    };
    const root = new THREE.Group();
    this.root = root;
    scene.add(root);
    // The glacier it's frozen into: a jagged block of ice around its waist,
    // with ice spires around it.
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const blk = add(root, new THREE.BoxGeometry(6 + (k % 3), 5 + (k % 4) * 1.5, 5), ice, Math.sin(a) * 4.5, 2.5, Math.cos(a) * 4.5);
      blk.rotation.set((k % 2) * 0.2, a, (k % 3 - 1) * 0.15);
    }
    for (let k = 0; k < 6; k++) {
      const a = Math.PI + (k - 2.5) * 0.45; // behind it
      add(root, new THREE.ConeGeometry(2.2, 14 + (k % 3) * 5, 5), ice, Math.sin(a) * 10, 7 + (k % 3) * 2, Math.cos(a) * 10).rotation.z = (k - 2.5) * 0.08;
    }
    // Upper body (turns at the waist)
    const upper = new THREE.Group();
    upper.position.y = 5;
    root.add(upper);
    this.upper = upper;
    add(upper, new THREE.BoxGeometry(9, 7, 5), this.matSkin, 0, 4, 0);                 // chest
    add(upper, new THREE.BoxGeometry(7, 3, 4.5), this.matSkin, 0, 0.5, 0);              // belly
    for (let r = 0; r < 4; r++) add(upper, new THREE.BoxGeometry(7.4, 0.35, 0.3), dark, 0, 1.6 + r * 1.3, 2.55); // ribs
    add(upper, new THREE.IcosahedronGeometry(1.1, 0), this.matGlow, 0, 4.8, 2.4);      // frozen heart, glowing
    // Frost on its shoulders
    for (const s of [-1, 1]) add(upper, new THREE.BoxGeometry(3.5, 1, 4), ice, s * 4.2, 7.6, 0);
    // Three faces (like the old poems): one forward, two to the sides
    this.jaws = [];
    const head = new THREE.Group();
    head.position.set(0, 9.5, 0.3);
    upper.add(head);
    const face = (yaw, scale) => {
      const f = new THREE.Group();
      f.rotation.y = yaw;
      f.scale.setScalar(scale);
      head.add(f);
      add(f, new THREE.BoxGeometry(3.4, 3.6, 3.2), this.matSkin, 0, 1.6, 0.6);
      add(f, new THREE.BoxGeometry(3.6, 0.6, 3.4), dark, 0, 2.6, 0.7);                 // heavy brow
      for (const s of [-1, 1]) add(f, new THREE.BoxGeometry(0.7, 0.35, 0.2), eye, s * 0.85, 2.05, 2.25);
      const jaw = new THREE.Group();
      jaw.position.set(0, 0.2, 0);
      f.add(jaw);
      add(jaw, new THREE.BoxGeometry(3.0, 1.0, 2.8), dark, 0, -0.4, 1.0);
      for (let t = 0; t < 5; t++) add(jaw, new THREE.ConeGeometry(0.14, 0.5, 4), ice, -1.0 + t * 0.5, 0.2, 2.3);
      this.jaws.push(jaw);
      return f;
    };
    face(0, 1);
    face(Math.PI / 2 + 0.35, 0.75).position.x = 2.4;
    face(-Math.PI / 2 - 0.35, 0.75).position.x = -2.4;
    for (const s of [-1, 1]) {
      const h1 = add(head, new THREE.ConeGeometry(0.55, 5, 6), horn, s * 1.5, 4.8, 0.2);
      h1.rotation.set(-0.35, 0, -s * 0.45);
      const h2 = add(head, new THREE.ConeGeometry(0.4, 3.2, 6), horn, s * 2.6, 3.6, -0.6);
      h2.rotation.set(-0.6, 0, -s * 1.1);
    }
    this.mouthMark = new THREE.Object3D();
    this.mouthMark.position.set(0, 1.0, 2.6);
    head.add(this.mouthMark);
    // Huge frozen bat wings spread behind it
    for (const s of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(s * 3.5, 7, -2.5);
      wing.rotation.set(0.25, s * 0.5, s * 0.35);
      upper.add(wing);
      add(wing, new THREE.BoxGeometry(0.6, 0.6, 0.6), dark).scale.set(1, 1, 1);
      const arm = add(wing, new THREE.BoxGeometry(14, 0.6, 0.6), dark, s * 7, 3, 0);
      arm.rotation.z = s * 0.45;
      for (let k = 0; k < 4; k++) {
        const memb = add(wing, new THREE.ConeGeometry(2.4, 8 + k, 3), wingMat, s * (3.5 + k * 3), 0.5 + k * 0.7, 0);
        memb.rotation.z = Math.PI;
        memb.scale.z = 0.12;
        add(wing, new THREE.ConeGeometry(0.25, 2.2, 4), ice, s * (3.5 + k * 3), -4 - k * 0.5, 0.2).rotation.z = Math.PI; // icicles
      }
    }
    // Arms (shoulder pivots), with big clawed fists
    const makeArm = (s) => {
      const g = new THREE.Group();
      g.position.set(s * 5.4, 6.5, 0.5);
      upper.add(g);
      add(g, new THREE.BoxGeometry(2.4, 6, 2.4), this.matSkin, s * 0.6, -3, 0);
      add(g, new THREE.BoxGeometry(2.6, 1.0, 2.6), ice, s * 0.6, -1.2, 0);              // frost ring
      add(g, new THREE.BoxGeometry(2.0, 5.5, 2.0), this.matSkin, s * 0.8, -8.2, 0.6);
      add(g, new THREE.BoxGeometry(3.0, 2.4, 3.0), dark, s * 0.8, -11.6, 0.8);          // fist
      for (let f = 0; f < 4; f++) add(g, new THREE.ConeGeometry(0.2, 1.4, 4), horn, s * 0.8 + (f - 1.5) * 0.65, -13.2, 1.8).rotation.x = Math.PI;
      return g;
    };
    this.armL = makeArm(-1);
    this.armR = makeArm(1);
  }
}
