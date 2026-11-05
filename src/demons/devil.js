// THE DEVIL, CEO of INFERNAL PETROLEUM INC. (The Throne, final boss).
// The one who's been pumping Hell dry and selling it at $15 a gallon.
// He fights in three phases:
//  1. ON THE THRONE (full health to 2/3): sits on his throne of oil barrels
//     and runs the meeting: throws flaming oil barrels (they leave burning
//     oil), sends lines of fire pillars racing at you, calls in Security.
//  2. "YOU'RE FIRED." (2/3 to 1/3): stands up and comes at you: fist
//     slams, stomps, barrels, fire pillars.
//  3. TRUE FORM (last third): the suit burns away, wings and fire. Faster,
//     fire breath up close, and burning oil raining from the sky.
// Same outside shape as boss.js, so the rest of the game treats it the same.
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';
import { raySphere } from './demons.js';
import { SETTINGS } from '../settings.js';
import { terrain } from '../world/terrain.js';

const PILLARS = 40;

export class Devil {
  constructor(scene, physics, ctx) {
    this.isBoss = true;
    const cfg = ctx.region.boss;
    this.cfg = cfg;
    this.name = cfg.name;
    this.B = SETTINGS.bosses[cfg.type];
    this.ctx = ctx;
    const A = cfg.arena;
    this.arenaCenter = new THREE.Vector3(A.x, terrain.height(A.x, A.z), A.z);
    this.arenaRadius = A.radius;
    this.radius = 3.5;
    // The throne sits at the back of the hall, facing the way you come in.
    const away = Math.atan2(A.x, A.z);
    this.throneAt = new THREE.Vector3(A.x + Math.sin(away) * A.radius * 0.6, 0, A.z + Math.cos(away) * A.radius * 0.6);
    this.throneAt.y = terrain.height(this.throneAt.x, this.throneAt.z);
    this.throneYaw = away + Math.PI;
    this.#buildModel(scene);
    const { RAPIER, world } = physics;
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(this.throneAt.x, this.throneAt.y, this.throneAt.z));
    world.createCollider(RAPIER.ColliderDesc.capsule(3, 2.6).setTranslation(0, 5, 0).setRestitution(0.4), this.body);
    const throneBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const back = new THREE.Vector3(Math.sin(away) * 4, 0, Math.cos(away) * 4);
    world.createCollider(RAPIER.ColliderDesc.cuboid(7, 7, 2.5).setTranslation(this.throneAt.x + back.x, this.throneAt.y + 7, this.throneAt.z + back.z)
      .setRotation({ x: 0, y: Math.sin(away / 2), z: 0, w: Math.cos(away / 2) }), throneBody);
    // Shockwave ring and fire pillars
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff6020, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.visible = false;
    scene.add(this.ring);
    const pGeo = new THREE.CylinderGeometry(1.1, 1.6, 9, 7).translate(0, 4.5, 0);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0.85 });
    this.pillars = [];
    for (let i = 0; i < PILLARS; i++) { const m = new THREE.Mesh(pGeo, pMat); m.visible = false; scene.add(m); this.pillars.push({ m, life: 0 }); }
    this.reset();
  }

  get awake() { return this.state !== 'dormant' && this.state !== 'dead'; }
  distanceTo(p) { return Math.max(0, Math.hypot(p.x - this.pos.x, p.z - this.pos.z) - this.radius); }

  reset() {
    if (this.state === 'dying' && !this.exploded) this.#explode();
    this.pos = this.throneAt.clone();
    this.prev = this.pos.clone();
    this.yaw = this.throneYaw;
    this.hp = this.B.health;
    this.state = this.defeated ? 'dead' : 'dormant';
    this.phase = 1;
    this.timer = 0;
    this.action = null;
    this.cd = { barrels: 2, pillars: 4, security: 6, slam: 0, stomp: 3, breath: 4, rain: 6 };
    this.lines = [];
    this.wave = null;
    this.flash = 0;
    this.walk = 0;
    this.transition = 0;
    for (const p of this.pillars) { p.life = 0; p.m.visible = false; }
    this.ring.visible = false;
    this.root.visible = !this.defeated;
    this.#setForm(1);
    this.body.setNextKinematicTranslation(this.defeated || this.disabled ? { x: 0, y: -200, z: 0 } : this.pos);
    this.ctx.hud?.bossBar(null);
  }

  setDisabled(on) { this.disabled = on; this.reset(); if (on) this.root.visible = false; }

  takeHit(amount, source) {
    if (this.state === 'dead' || this.state === 'dying' || this.disabled || this.transition > 0) return false;
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
    const sit = this.phase === 1 ? -1.5 : 0;
    let best = null;
    for (const [y, r] of [[6.5 + sit, 3.4], [10.2 + sit, 2.0]]) {
      const t = raySphere(o, dir, this.pos.clone().setY(this.pos.y + y), r);
      if (t !== null && (!best || t < best.t)) best = { t, point: o.clone().addScaledVector(dir, t) };
    }
    return best;
  }

  // ------------------------------------------------------------------ update
  fixedUpdate(dt, car) {
    const B = this.B;
    this.prev.copy(this.pos);
    this.flash = Math.max(0, this.flash - dt * 5);
    this.#updatePillars(dt, car);
    const carPos = car.currPos;
    const toCar = new THREE.Vector3(carPos.x - this.pos.x, 0, carPos.z - this.pos.z);
    const dist = toCar.length();
    const fromArena = Math.hypot(carPos.x - this.arenaCenter.x, carPos.z - this.arenaCenter.z);
    if (this.state === 'dead') return;
    if (this.state === 'dormant') {
      if (fromArena < this.arenaRadius && !car.wrecked) this.#wake();
      return;
    }
    if (this.state === 'dying') {
      this.timer += dt;
      if (this.timer > 3.5 && !this.exploded) this.#explode();
      return;
    }
    if (this.state === 'waking') {
      this.timer += dt;
      if (this.timer > 2.5) this.state = 'fight';
      return;
    }
    // Wandered off: he sits back down and heals (the board gives him time).
    if (car.wrecked || fromArena > B.leash) {
      this.lines = [];
      this.action = null;
      this.hp = Math.min(B.health, this.hp + B.health * 0.04 * dt);
      const home = new THREE.Vector3().subVectors(this.throneAt, this.pos).setY(0);
      if (home.length() > 1) { this.pos.addScaledVector(home.normalize(), 6 * dt); this.walk += dt * 4; this.yaw = turn(this.yaw, Math.atan2(home.x, home.z), 2 * dt); }
      this.#sync();
      if (this.hp >= B.health && home.length() <= 1) { this.state = 'dormant'; this.phase = 1; this.#setForm(1); this.yaw = this.throneYaw; this.ctx.hud.bossBar(null); }
      return;
    }
    // Phase changes
    const frac = this.hp / B.health;
    const want = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
    if (want > this.phase) {
      this.phase = want;
      this.transition = 2.6;
      this.action = null;
      if (want === 2) this.ctx.speak?.("You're FIRED.");
      else { this.ctx.speak?.('Let me show you my TRUE quarterly earnings!'); this.#setForm(3); }
      this.ctx.chase.addShake(1);
      this.ctx.audio.roar?.();
      this.wave = { r: 4, hit: false };
      this.ring.position.set(this.pos.x, this.pos.y + 0.3, this.pos.z);
      this.ring.visible = true;
    }
    if (this.transition > 0) { this.transition -= dt; this.#tickWave(dt, car, dist); this.#sync(); this.ctx.hud.bossBar(this.name, frac, this.phase === 3); return; }

    const rate = this.phase === 3 ? 1.5 : 1;
    for (const k in this.cd) this.cd[k] -= dt * rate;
    if (this.action) this.#runAction(dt, car, dist, toCar);
    else {
      const P = this.phase;
      if (P >= 2 && dist < 13 && this.cd.slam <= 0) this.action = { type: 'slam', t: 0, windup: 0.9 };
      else if (P >= 2 && dist < 30 && this.cd.stomp <= 0) this.action = { type: 'stomp', t: 0, windup: 0.9 };
      else if (P === 3 && dist < 32 && this.cd.breath <= 0) this.action = { type: 'breath', t: 0, windup: 0.7 };
      else if (P === 3 && this.cd.rain <= 0) this.action = { type: 'rain', t: 0, windup: 1.0 };
      else if (this.cd.pillars <= 0 && dist > 14) this.action = { type: 'pillars', t: 0, windup: 0.7 };
      else if (this.cd.barrels <= 0 && dist > 16) this.action = { type: 'barrels', t: 0, windup: 0.8 };
      else if (this.cd.security <= 0) this.action = { type: 'security', t: 0, windup: 0.6 };
      else if (P >= 2) {
        // Walk at you
        this.yaw = turn(this.yaw, Math.atan2(toCar.x, toCar.z), (P === 3 ? 1.6 : 1.0) * dt);
        if (dist > 9) {
          const sp = P === 3 ? B.trueSpeed : B.walkSpeed;
          this.pos.x += Math.sin(this.yaw) * sp * dt;
          this.pos.z += Math.cos(this.yaw) * sp * dt;
          this.walk += dt * sp * 0.55;
        }
      } else this.yaw = turn(this.yaw, Math.atan2(toCar.x, toCar.z), 0.6 * dt); // (seated: just turns his head... and chair)
    }
    // Ramming him
    if (car.lastCrash && dist < this.radius + 4) {
      const c = car.lastCrash;
      this.takeHit(SETTINGS.ramming.ramPower * (c.lost / (SETTINGS.ramming.splatSpeedKmh / 3.6)) ** 2 * car.totalMass / SETTINGS.steering.referenceMass, 'ram');
      this.ctx.audio.thump();
    }
    // Stay in his palace
    const off = new THREE.Vector3().subVectors(this.pos, this.arenaCenter).setY(0);
    if (off.length() > this.arenaRadius * 0.85) this.pos.copy(this.arenaCenter).add(off.setLength(this.arenaRadius * 0.85));
    this.#tickWave(dt, car, dist);
    this.#sync();
    this.ctx.hud.bossBar(this.name + ['', '', ' — FURIOUS', ' — TRUE FORM'][this.phase], frac, this.phase === 3);
  }

  #runAction(dt, car, dist, toCar) {
    const B = this.B, a = this.action;
    a.t += dt;
    this.yaw = turn(this.yaw, Math.atan2(toCar.x, toCar.z), 0.8 * dt);
    if (a.type === 'breath' && a.t >= a.windup) {
      // A cone of hellfire from his mouth for a couple of seconds
      const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      const ang = Math.acos(THREE.MathUtils.clamp(toCar.dot(fwd) / (dist || 1), -1, 1));
      if (dist < 34 && ang < 0.45 && !car.wrecked && (a.tick = (a.tick || 0) - dt) <= 0) { a.tick = 0.25; car.igniteAt(car.currPos.clone().setY(car.currPos.y + 0.5), B.fireDps, 3); }
      const mouth = this.head.getWorldPosition(new THREE.Vector3());
      for (let n = 0; n < 6; n++) {
        const v = fwd.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, -0.35 + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.5)).normalize().multiplyScalar(22 + Math.random() * 10);
        this.ctx.flames?.spawn(mouth, v, 0.6 + Math.random() * 0.6, 1.1);
      }
      if (a.t > a.windup + 2.4) { this.action = null; this.cd.breath = 7; }
      return;
    }
    if (a.t < a.windup || a.done) { if (a.done && a.t > a.windup + 0.7) this.action = null; return; }
    a.done = true;
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const hand = this.pos.clone().add(new THREE.Vector3(0, this.phase === 1 ? 8 : 10, 0)).addScaledVector(fwd, 2);
    const pool = (at) => this.ctx.hazards?.addPool(at.x, at.z, B.poolRadius, B.poolTime);
    if (a.type === 'barrels') {
      this.cd.barrels = this.phase === 1 ? 3.2 : 4;
      const n = this.phase === 3 ? 5 : 3;
      for (let i = 0; i < n; i++) this.ctx.projectiles.throwAt('oilBarrel', hand.clone().add(new THREE.Vector3(fwd.z, 0, -fwd.x).multiplyScalar((i - (n - 1) / 2) * 2)), B.throwDamage, B.throwSplash, THREE.MathUtils.clamp(dist / 22, 1, 2.4) * (0.8 + Math.random() * 0.4), pool, 4);
      this.ctx.audio.thump();
    } else if (a.type === 'pillars') {
      this.cd.pillars = 5;
      const offs = this.phase === 1 ? [0] : this.phase === 2 ? [-0.15, 0.15] : [-0.3, 0, 0.3];
      for (const o of offs) {
        const dir = toCar.clone().normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), o);
        this.lines.push({ from: this.pos.clone().addScaledVector(dir, 6), dir, d: 0, next: 0, hit: false });
      }
      this.ctx.audio.wreck();
    } else if (a.type === 'security') {
      this.cd.security = this.phase === 1 ? 12 : 16;
      for (let i = 0; i < 2; i++) {
        const ang = this.yaw + (i ? 1 : -1) * 1.2;
        this.ctx.demons.spawnPack(this.pos.clone().add(new THREE.Vector3(Math.sin(ang) * 20, 0, Math.cos(ang) * 20)), 4, 'security');
      }
      this.ctx.hud.toast('SECURITY!', 'warn');
    } else if (a.type === 'slam') {
      this.cd.slam = 2.6;
      const at = this.pos.clone().addScaledVector(fwd, 7);
      const d = Math.hypot(car.currPos.x - at.x, car.currPos.z - at.z);
      if (d < B.slamRadius + 2 && !car.wrecked) {
        car.takeDamage(B.slamDamage, at.clone().setY(car.currPos.y));
        car.igniteAt(at.clone().setY(car.currPos.y), B.fireDps, 3);
        const away = car.currPos.clone().sub(at).setY(0).normalize();
        car.nudge(away.x * 10, away.z * 10);
      }
      this.ctx.audio.wreck();
      this.ctx.chase.addShake(Math.max(0.3, 1.2 - dist / 40));
    } else if (a.type === 'stomp') {
      this.cd.stomp = 7;
      this.wave = { r: 3, hit: false };
      this.ring.position.set(this.pos.x, this.pos.y + 0.3, this.pos.z);
      this.ring.visible = true;
      this.ctx.audio.wreck();
      this.ctx.chase.addShake(0.8);
    } else if (a.type === 'rain') {
      this.cd.rain = 9;
      // Burning oil rains down all around you
      for (let i = 0; i < 8; i++) {
        const from = car.currPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 40, 40, (Math.random() - 0.5) * 40));
        this.ctx.projectiles.throwAt('oilBarrel', from, B.throwDamage * 0.7, B.throwSplash, 1.2 + Math.random() * 1.2, pool, 14);
      }
      this.ctx.hud.toast('It\'s raining burning oil!', 'warn');
    }
  }

  #tickWave(dt, car, dist) {
    if (!this.wave) return;
    this.wave.r += 22 * dt;
    if (!this.wave.hit && Math.abs(dist - this.wave.r) < 2 && car.grounded && !car.wrecked) {
      this.wave.hit = true;
      const d = Math.max(1, dist);
      car.takeDamage(this.B.stompDamage, car.currPos.clone().add(new THREE.Vector3(this.pos.x - car.currPos.x, 0, this.pos.z - car.currPos.z).normalize().multiplyScalar(1.5)));
      car.nudge(((car.currPos.x - this.pos.x) / d) * 9, ((car.currPos.z - this.pos.z) / d) * 9);
      this.ctx.chase.addShake(0.6);
    }
    if (this.wave.r > this.B.stompRadius) { this.wave = null; this.ring.visible = false; }
  }

  // Fire pillar lines race out; each pillar erupts, burns you if you're on it, dies down.
  #updatePillars(dt, car) {
    for (const p of this.pillars) {
      if (p.life <= 0) continue;
      p.life -= dt;
      const k = p.life > 0.9 ? Math.min(1, (1.2 - p.life) / 0.1) : Math.max(0, p.life / 0.9);
      p.m.scale.set(0.6 + k * 0.4, Math.max(0.01, k), 0.6 + k * 0.4);
      if (p.life <= 0) p.m.visible = false;
    }
    for (const L of this.lines) {
      L.d += this.B.pillarSpeed * dt;
      while (L.next <= L.d && L.next < 90) {
        const at = L.from.clone().addScaledVector(L.dir, L.next);
        at.y = terrain.height(at.x, at.z);
        const p = this.pillars.find((q) => q.life <= 0);
        if (p) { p.life = 1.2; p.m.position.copy(at); p.m.scale.set(0.6, 0.01, 0.6); p.m.visible = true; }
        if (!L.hit && !car.wrecked && Math.hypot(car.currPos.x - at.x, car.currPos.z - at.z) < 2.8) {
          L.hit = true;
          car.takeDamage(this.B.pillarDamage, at.clone().setY(car.currPos.y - 0.3));
          car.igniteAt(at.clone().setY(car.currPos.y), this.B.fireDps, 2.5);
          this.ctx.chase.addShake(0.5);
        }
        L.next += 3;
      }
    }
    this.lines = this.lines.filter((L) => L.next < 90);
  }

  #sync() {
    this.pos.y = terrain.height(this.pos.x, this.pos.z);
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y, z: this.pos.z });
  }

  #wake() {
    if (this.state !== 'dormant') return;
    this.state = 'waking';
    this.timer = 0;
    this.ctx.speak?.('Ah. The customer.');
    this.ctx.hud.bossBar(this.name, this.hp / this.B.health, false);
    this.ctx.chase.addShake(0.6);
  }

  #die() {
    this.ctx.onDying?.();
    this.state = 'dying';
    this.timer = 0;
    this.exploded = false;
    this.action = null;
    this.lines = [];
    this.ctx.stats.kill('gun');
    this.ctx.hud.bossBar(null);
    this.ctx.audio.wreck();
  }

  #explode() {
    this.exploded = true;
    this.defeated = true;
    this.state = 'dead';
    for (let k = 0; k < 6; k++) this.ctx.gore.explode(this.pos.clone().setY(this.pos.y + 2 + k * 1.6), new THREE.Vector3((Math.random() - 0.5) * 16, 10, (Math.random() - 0.5) * 16), [0xb01818, 0x141418, 0xffd040, 0xff6020, 0xf0f0f0], 5);
    this.ctx.audio.wreck();
    this.ctx.chase.addShake(1.5);
    this.root.visible = false;
    this.body.setNextKinematicTranslation({ x: 0, y: -200, z: 0 });
    this.ctx.onDefeated?.();
  }

  // ------------------------------------------------------------------ drawing
  #setForm(form) {
    // Phases 1-2: the suit. Phase 3: suit gone, wings out, bigger horns, on fire.
    const trueForm = form === 3;
    for (const m of this.suitParts) m.visible = !trueForm;
    for (const m of this.trueParts) m.visible = trueForm;
    this.root.scale.setScalar(trueForm ? 1.15 : 1);
  }

  render(alpha, dt) {
    if (!this.root.visible) return;
    const now = performance.now() / 1000;
    this.root.position.lerpVectors(this.prev, this.pos, alpha);
    this.root.rotation.y = this.yaw;
    this.matSkin.emissive.setRGB(0.25 + this.flash * 0.8, this.flash * 0.3, 0);
    const seated = this.phase === 1 && this.state !== 'dying';
    const a = this.action, wind = a ? Math.min(1, a.t / a.windup) : 0, after = a && a.t > a.windup;
    // Legs: seated (thighs forward), walking, or bracing
    const swing = seated ? 0 : Math.sin(this.walk) * 0.45;
    const k = 1 - Math.exp(-8 * dt);
    const hipX = seated ? -1.5 : 0, kneeX = seated ? 1.5 : 0;
    this.legs.forEach((l, i) => {
      const s = i ? -1 : 1;
      l.hip.rotation.x += (hipX + swing * s - l.hip.rotation.x) * k;
      l.knee.rotation.x += (kneeX + Math.max(0, -swing * s) * 0.6 - l.knee.rotation.x) * k;
    });
    this.upper.position.y += ((seated ? -2.2 : 0) - this.upper.position.y) * k;
    // Arms
    let armL = seated ? -0.6 : -0.2 + swing * 0.3, armR = seated ? -0.6 : -0.2 - swing * 0.3, lean = 0;
    if (a) {
      if (a.type === 'barrels' || a.type === 'rain') { armR = after ? -1.0 : -2.8 * wind; lean = -0.1 * wind; }
      if (a.type === 'slam') { armL = armR = after ? -0.4 : -2.9 * wind; lean = after ? 0.4 : -0.2 * wind; }
      if (a.type === 'pillars') { armL = after ? -0.3 : -1.6 * wind; }
      if (a.type === 'security') { armR = -1.5 * wind; } // (snaps his fingers)
      if (a.type === 'breath') { lean = after ? 0.25 : -0.2 * wind; }
    }
    if (this.transition > 0) { armL = armR = -2.6; lean = -0.3; }
    if (this.state === 'dying') { const d = Math.min(1, this.timer / 3.5); lean = d * 1.1; armL = armR = 0.5 * d; this.root.position.y -= d * 2; }
    this.armL.rotation.x += (armL - this.armL.rotation.x) * k;
    this.armR.rotation.x += (armR - this.armR.rotation.x) * k;
    this.upper.rotation.x += (lean - this.upper.rotation.x) * k;
    this.tail.rotation.y = Math.sin(now * 1.5) * 0.4;
    for (const [i, w] of this.wings.entries()) w.rotation.z = (i ? -1 : 1) * (0.5 + Math.sin(now * 2) * 0.15);
    this.jaw.rotation.x = a?.type === 'breath' && after ? 0.5 : this.transition > 0 ? 0.6 : 0.05;
    // In true form he's on fire
    if (this.phase === 3 && this.ctx.flames && Math.random() < 0.6) {
      const at = this.root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 8, (Math.random() - 0.5) * 6));
      this.ctx.flames.spawn(at, new THREE.Vector3((Math.random() - 0.5) * 2, 4 + Math.random() * 3, (Math.random() - 0.5) * 2), 0.5 + Math.random() * 0.5, 0.8);
    }
    if (this.wave) {
      this.ring.scale.setScalar(this.wave.r);
      this.ring.material.opacity = 0.8 * (1 - this.wave.r / this.B.stompRadius);
    }
  }

  // ------------------------------------------------------------------ model
  #buildModel(scene) {
    const L = { skin: 0xb01818, suit: 0x141418, stripe: 0x3a3a44, shirt: 0xf0ece4, tie: 0xd01010, gold: 0xf0c040, horn: 0x1a1414, eye: 0xffe040, hair: 0x0a0808, ...this.cfg.look };
    this.matSkin = litMaterial({ color: L.skin, emissive: 0x400000, flatShading: true, roughness: 0.6 });
    const suit = litMaterial({ color: L.suit, flatShading: true, roughness: 0.5 });
    const stripe = litMaterial({ color: L.stripe, flatShading: true, roughness: 0.5 });
    const shirt = litMaterial({ color: L.shirt, flatShading: true, roughness: 0.7 });
    const tie = litMaterial({ color: L.tie, flatShading: true, roughness: 0.4 });
    const gold = litMaterial({ color: L.gold, flatShading: true, roughness: 0.25, metalness: 0.9 });
    const horn = litMaterial({ color: L.horn, flatShading: true, roughness: 0.4 });
    const hair = litMaterial({ color: L.hair, flatShading: true, roughness: 0.3 });
    const shoe = litMaterial({ color: 0x050505, flatShading: true, roughness: 0.15, metalness: 0.3 });
    const eye = new THREE.MeshBasicMaterial({ color: L.eye });
    const fire = new THREE.MeshBasicMaterial({ color: 0xff7a20 });
    const wingMat = litMaterial({ color: 0x3a0606, flatShading: true, roughness: 0.6, side: THREE.DoubleSide });
    this.suitParts = []; this.trueParts = [];
    const add = (parent, geo, mat, x = 0, y = 0, z = 0, list = null) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      if (list) list.push(m);
      return m;
    };
    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const root = new THREE.Group();
    this.root = root;
    scene.add(root);

    // ---- The throne of oil barrels (stays put) ----
    const throne = new THREE.Group();
    throne.position.copy(this.throneAt);
    throne.rotation.y = this.throneYaw;
    scene.add(throne);
    const drum = new THREE.CylinderGeometry(1.1, 1.1, 2.6, 12);
    const drumMats = [litMaterial({ color: 0x1a1a1e, flatShading: true, roughness: 0.4, metalness: 0.4 }), litMaterial({ color: 0x8a1010, flatShading: true, roughness: 0.4, metalness: 0.3 })];
    let n = 0;
    for (let row = 0; row < 5; row++) for (let col = -3; col <= 3; col++) {
      if (row > 2 && Math.abs(col) > 2) continue;
      const d = add(throne, drum, drumMats[n++ % 2], col * 2.25, 1.3 + row * 2.6, -4 - (row > 1 ? 0 : 0));
      add(d, new THREE.CylinderGeometry(1.15, 1.15, 0.2, 12), gold, 0, 0.8, 0);
    }
    for (let col = -2; col <= 2; col++) add(throne, drum, drumMats[n++ % 2], col * 2.25, 1.3, -1.5).rotation.set(Math.PI / 2, 0, 0); // the seat
    add(throne, box(17, 0.8, 1.2), gold, 0, 14.2, -4);
    // The company logo on top: a golden oil drop on fire
    add(throne, new THREE.SphereGeometry(1.8, 12, 10), gold, 0, 17, -4).scale.set(1, 1.3, 0.5);
    add(throne, new THREE.ConeGeometry(1.5, 2.6, 12), gold, 0, 19.2, -4).scale.z = 0.5;
    add(throne, new THREE.ConeGeometry(0.9, 2.2, 8), fire, 0, 21.5, -4);

    // ---- The Devil ----
    this.legs = [];
    for (const s of [1, -1]) {
      const hip = new THREE.Group();
      hip.position.set(s * 1.3, 5, 0);
      root.add(hip);
      add(hip, box(1.5, 2.8, 1.6), suit, 0, -1.4, 0, this.suitParts);                       // trouser leg
      add(hip, box(0.12, 2.8, 1.62), stripe, 0.4, -1.4, 0, this.suitParts);                 // pinstripe
      add(hip, box(1.5, 2.8, 1.6), this.matSkin, 0, -1.4, 0, this.trueParts);              // (true form: red, bare)
      const knee = new THREE.Group();
      knee.position.set(0, -2.8, 0);
      hip.add(knee);
      add(knee, box(1.3, 2.3, 1.4), suit, 0, -1.15, 0, this.suitParts);
      add(knee, box(1.3, 2.3, 1.4), this.matSkin, 0, -1.15, 0, this.trueParts);
      add(knee, box(1.5, 0.5, 2.6), shoe, 0, -2.25, 0.5, this.suitParts);                    // polished shoes
      add(knee, new THREE.ConeGeometry(0.8, 1, 4), horn, 0, -2.2, 0.2, this.trueParts);     // cloven hooves
      this.legs.push({ hip, knee });
    }
    const upper = new THREE.Group();
    root.add(upper);
    this.upper = upper;
    add(upper, box(4.4, 2.0, 2.6), suit, 0, 5.4, 0, this.suitParts);                         // hips
    add(upper, box(5.2, 4.4, 2.8), suit, 0, 8.4, 0, this.suitParts);                         // jacket
    for (const sx of [-1.6, -0.6, 0.6, 1.6]) add(upper, box(0.12, 4.4, 2.82), stripe, sx, 8.4, 0, this.suitParts);
    add(upper, box(1.6, 3.6, 0.1), shirt, 0, 8.8, 1.42, this.suitParts);                     // shirt
    add(upper, box(0.6, 2.8, 0.12), tie, 0, 8.6, 1.5, this.suitParts);                       // tie
    add(upper, box(0.8, 0.2, 0.14), gold, 0, 8.4, 1.56, this.suitParts);                     // tie clip
    for (const s of [-1, 1]) { const lap = add(upper, box(0.8, 3, 0.15), suit, s * 0.95, 9.2, 1.47, this.suitParts); lap.rotation.z = s * 0.25; }
    add(upper, box(5.0, 6.2, 2.6), this.matSkin, 0, 7.6, 0, this.trueParts);                 // true form: bare red torso
    for (let r = 0; r < 4; r++) add(upper, box(4.2, 0.2, 0.1), horn, 0, 6.2 + r * 0.9, 1.32, this.trueParts); // ribs/scars
    add(upper, new THREE.IcosahedronGeometry(0.7, 0), fire, 0, 8.6, 1.3, this.trueParts);   // a heart of fire
    // Head
    const head = new THREE.Group();
    head.position.set(0, 11.4, 0.3);
    upper.add(head);
    this.head = head;
    add(head, box(2.2, 2.4, 2.2), this.matSkin, 0, 0, 0);
    add(head, box(2.3, 0.7, 2.3), hair, 0, 1.25, -0.1);                                      // slicked-back hair
    add(head, box(0.5, 1.0, 0.4), hair, 0, -1.25, 1.05);                                     // goatee
    for (const s of [-1, 1]) {
      add(head, box(0.5, 0.25, 0.1), eye, s * 0.5, 0.3, 1.12);
      add(head, box(0.7, 0.18, 0.1), hair, s * 0.5, 0.65, 1.12).rotation.z = s * -0.35;      // angry eyebrows
      const h1 = add(head, new THREE.ConeGeometry(0.35, 2.2, 6), horn, s * 0.9, 1.9, 0, this.suitParts);
      h1.rotation.z = -s * 0.5;
      const h2 = add(head, new THREE.ConeGeometry(0.6, 4.2, 6), horn, s * 1.4, 2.6, -0.3, this.trueParts); // true form: huge curling horns
      h2.rotation.set(-0.4, 0, -s * 0.9);
    }
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.6, 0.4);
    head.add(jaw);
    this.jaw = jaw;
    add(jaw, box(1.6, 0.25, 0.5), shirt, 0, 0, 0.75);                                       // the grin (teeth)
    // Arms (shoulder pivots)
    const arm = (s) => {
      const g = new THREE.Group();
      g.position.set(s * 3.1, 10, 0);
      upper.add(g);
      add(g, box(1.4, 3.6, 1.4), suit, 0, -1.8, 0, this.suitParts);
      add(g, box(1.4, 3.6, 1.4), this.matSkin, 0, -1.8, 0, this.trueParts);
      add(g, box(1.5, 0.5, 1.5), shirt, 0, -3.7, 0, this.suitParts);                         // cuff
      add(g, box(1.3, 1.6, 1.0), this.matSkin, 0, -4.6, 0.1);                                // hand
      for (let f = 0; f < 4; f++) add(g, new THREE.ConeGeometry(0.12, 0.7, 4), horn, -0.45 + f * 0.3, -5.6, 0.2).rotation.x = Math.PI;
      if (s > 0) add(g, box(1.45, 0.35, 1.1), gold, 0, -3.95, 0, this.suitParts);           // gold watch
      else add(g, new THREE.TorusGeometry(0.25, 0.08, 5, 8), gold, 0.4, -5.0, 0.4);           // gold ring
      return g;
    };
    this.armL = arm(1);
    this.armR = arm(-1);
    // Tail (always) and wings (true form)
    this.tail = new THREE.Group();
    this.tail.position.set(0, 5.4, -1.3);
    upper.add(this.tail);
    add(this.tail, box(0.4, 0.4, 4), this.matSkin, 0, -0.5, -2).rotation.x = 0.4;
    add(this.tail, new THREE.ConeGeometry(0.6, 1, 3), this.matSkin, 0, -1.3, -4).rotation.x = -Math.PI / 2;
    this.wings = [];
    for (const s of [1, -1]) {
      const w = new THREE.Group();
      w.position.set(s * 1.8, 10, -1.4);
      upper.add(w);
      add(w, box(8, 0.5, 0.5), this.matSkin, s * 4, 2, 0, this.trueParts).rotation.z = s * 0.4;
      for (let f = 0; f < 4; f++) { const memb = add(w, new THREE.ConeGeometry(2.2, 7 + f, 3), wingMat, s * (1.8 + f * 2), -1 + f * 0.5, 0, this.trueParts); memb.rotation.z = Math.PI; memb.scale.z = 0.1; }
      this.wings.push(w);
    }
    root.position.copy(this.throneAt);
    root.rotation.y = this.throneYaw;
  }
}

function turn(a, b, max) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + THREE.MathUtils.clamp(d, -max, max);
}
