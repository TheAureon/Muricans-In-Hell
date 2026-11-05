// THE DROWNED LEVIATHAN (Flooded City boss): a giant sea serpent living in
// the lake of the drowned plaza. Unlike the walking giants (boss.js) it
// fights from the water:
//  - Drive to the lake shore and it RISES near you.
//  - While up it SPITS balls of black water at you, and if you're close
//    it rears back and SLAMS its head down: a big hit where it lands, plus
//    a wave rolling outward.
//  - After a while it DIVES (can't be hurt under water) and comes up
//    somewhere else, near you.
//  - At 2/3 and 1/3 health it calls the Drowned out of the water.
//  - Below half health it gets angry: shorter dives, faster attacks.
// Only its head and neck can be hit. Floating on Pontoons you can get
// close (and ram its neck), but that's where the slam lands...
// Same outside shape as boss.js, so the rest of the game treats it the same.
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';
import { raySphere } from './demons.js';
import { SETTINGS } from '../settings.js';
import { terrain } from '../world/terrain.js';

const SEGS = 13;          // neck pieces from the water to the head
const UNDER_Y = -16;      // how far down it hides
const SINK_TIME = 7;      // seconds from the killing blow until it's gone below
const smoothstep = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

export class Leviathan {
  constructor(scene, physics, ctx) {
    this.isBoss = true;
    const cfg = ctx.region.boss;
    this.cfg = cfg;
    this.name = cfg.name;
    this.B = SETTINGS.bosses[cfg.type];
    this.ctx = ctx;
    const A = cfg.arena;
    this.level = terrain.waterLevel ?? 0;
    this.arenaCenter = new THREE.Vector3(A.x, this.level, A.z);
    this.arenaRadius = A.radius + 25; // (wakes when you reach the shore)
    this.lakeRadius = A.radius;
    this.radius = 2.2;
    this.#buildModel(scene);
    const { RAPIER, world } = physics;
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(A.x, -200, A.z));
    world.createCollider(RAPIER.ColliderDesc.capsule(2.5, 2.0).setTranslation(0, 1.5, 0).setRestitution(0.5), this.body);

    const ringGeo = new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xa0fff0, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.visible = false;
    scene.add(this.ring);
    this.head = new THREE.Vector3();
    this.reset();
  }

  get awake() { return this.state !== 'dormant' && this.state !== 'dead'; }
  get up() { return this.state === 'up' || this.state === 'rising' || this.state === 'waking'; }
  distanceTo(p) { return this.up ? Math.max(0, Math.hypot(p.x - this.head.x, p.z - this.head.z) - this.radius) : Infinity; }

  reset() {
    if (this.state === 'dying' && !this.exploded) this.#explode();
    this.pos = this.arenaCenter.clone();
    this.prev = this.pos.clone();
    this.yaw = Math.atan2(-this.arenaCenter.x, -this.arenaCenter.z);
    this.hp = this.B.health;
    this.state = this.defeated ? 'dead' : 'dormant';
    this.rise = 0;            // 0 = under water, 1 = fully up
    this.timer = 0;
    this.action = null;
    this.cd = { spit: 1.5, slam: 3 };
    this.summoned = { a: false, b: false };
    this.flash = 0;
    this.wave = null;
    this.ring.visible = false;
    this.root.visible = false;
    this.root.rotation.set(0, 0, 0);
    this.#park();
    this.ctx.hud?.bossBar(null);
  }

  setDisabled(on) {
    this.disabled = on;
    this.reset();
  }

  // ------------------------------------------------------------------ hits
  takeHit(amount, source) {
    if (!this.up || this.disabled || this.state === 'dying') return false;
    const dealt = Math.min(amount, this.hp);
    this.hp -= amount;
    this.flash = 1;
    this.ctx.stats.record(source, dealt);
    if (this.hp <= 0) { this.#die(); return true; }
    return false;
  }

  raycast(o, dir) {
    if (!this.up || this.disabled || this.rise < 0.3) return null;
    let best = null;
    const spots = [[this.head, 2.4], ...this.neckPts.slice(SEGS - 6, SEGS - 1).map((p) => [p, 1.6])];
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
    const carFromLake = Math.hypot(carPos.x - this.arenaCenter.x, carPos.z - this.arenaCenter.z);
    if (this.state === 'dead') return;
    if (this.state === 'dormant') {
      if (carFromLake < this.arenaRadius && !car.wrecked) this.#wake(carPos);
      return;
    }
    if (this.state === 'dying') {
      // It thrashes, its neck topples onto the water (SPLASH), and it slowly
      // sinks out of sight in a stream of bubbles.
      const before = this.timer;
      this.timer += dt;
      if (before < 3.6 && this.timer >= 3.6) {
        this.#splash(this.head.clone().setY(this.level), 70);
        this.#splash(this.neckPts[Math.floor(SEGS / 2)].clone().setY(this.level), 40);
        this.ctx.audio.wreck();
        this.ctx.chase.addShake(1);
      }
      if (this.timer > 3.6 && Math.random() < dt * 30) {
        const p = this.neckPts[Math.floor(Math.random() * SEGS)];
        this.ctx.dust.spawn(new THREE.Vector3(p.x + (Math.random() - 0.5) * 4, this.level + 0.1, p.z + (Math.random() - 0.5) * 4),
          new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 1.5), 0.3 + Math.random() * 0.5, 1.1);
      }
      if (this.timer > SINK_TIME && !this.exploded) this.#explode();
      return;
    }
    const frac = this.hp / B.health;
    const enraged = frac < 0.5;
    const rate = enraged ? 1.4 : 1;

    // Too far away (or you got wrecked): sink down, heal, go back to sleep.
    if (car.wrecked || carFromLake > B.leash) {
      if (this.state !== 'leaving') { this.state = 'leaving'; this.action = null; }
    }
    if (this.state === 'leaving') {
      this.rise = Math.max(0, this.rise - dt / 1.5);
      this.hp = Math.min(B.health, this.hp + B.health * 0.04 * dt);
      if (this.rise <= 0) this.#park();
      if (!car.wrecked && carFromLake < this.arenaRadius) { this.#surfaceNear(carPos); return; }
      if (this.rise <= 0 && this.hp >= B.health) { this.state = 'dormant'; this.ctx.hud.bossBar(null); }
      return;
    }

    // Reinforcements: the Drowned climb out of the lake.
    if (frac < 0.66 && !this.summoned.a) { this.summoned.a = true; this.#summon(); }
    if (frac < 0.33 && !this.summoned.b) { this.summoned.b = true; this.#summon(); }

    this.timer += dt;
    if (this.state === 'waking' || this.state === 'rising') {
      this.rise = Math.min(1, this.rise + dt / (this.state === 'waking' ? 2.2 : 1.3));
      this.#face(carPos, 1.5 * dt);
      if (this.rise >= 1) { this.state = 'up'; this.timer = 0; }
    } else if (this.state === 'up') {
      this.#face(carPos, (enraged ? 1.1 : 0.8) * dt);
      for (const k in this.cd) this.cd[k] -= dt * rate;
      const reach = Math.hypot(carPos.x - this.pos.x, carPos.z - this.pos.z);
      if (this.action) this.#runAction(dt, car);
      else if (this.timer > B.upTime / rate) { this.state = 'diving'; this.timer = 0; }
      else if (reach < 24 && this.cd.slam <= 0) this.action = { type: 'slam', t: 0, windup: 1.0, done: false };
      else if (this.cd.spit <= 0) this.action = { type: 'spit', t: 0, windup: 0.7, done: false };
    } else if (this.state === 'diving') {
      this.rise = Math.max(0, this.rise - dt / 1.1);
      if (this.rise <= 0) { this.state = 'under'; this.timer = 0; this.#park(); this.#splash(this.pos, 30); }
    } else if (this.state === 'under') {
      if (this.timer > B.downTime / rate) this.#surfaceNear(carPos);
    }

    // The wave from a slam rolls outward.
    if (this.wave) {
      this.wave.r += 20 * dt;
      const d = Math.hypot(carPos.x - this.wave.x, carPos.z - this.wave.z);
      if (!this.wave.hit && Math.abs(d - this.wave.r) < 2 && car.grounded && !car.wrecked) {
        this.wave.hit = true;
        car.takeDamage(B.stompDamage, new THREE.Vector3(this.wave.x, carPos.y, this.wave.z).sub(carPos).setY(0).normalize().multiplyScalar(1.5).add(carPos));
        car.nudge(((carPos.x - this.wave.x) / (d || 1)) * 7, ((carPos.z - this.wave.z) / (d || 1)) * 7);
        this.ctx.chase.addShake(0.7);
      }
      if (this.wave.r > B.stompRadius) { this.wave = null; this.ring.visible = false; }
    }

    if (this.up && this.rise > 0.5) {
      this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.level - 1, z: this.pos.z });
    }
    this.ctx.hud.bossBar(this.name + (this.state === 'under' || this.state === 'diving' ? ' (under water)' : ''), frac, enraged);
  }

  #face(target, maxTurn) {
    const want = Math.atan2(target.x - this.pos.x, target.z - this.pos.z);
    let d = want - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += THREE.MathUtils.clamp(d, -maxTurn, maxTurn);
  }

  #runAction(dt, car) {
    const B = this.B, a = this.action;
    a.t += dt;
    if (a.t >= a.windup && !a.done) {
      a.done = true;
      const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      if (a.type === 'spit') {
        this.cd.spit = 2.8;
        const mouth = this.head.clone().addScaledVector(fwd, 2);
        const dist = mouth.distanceTo(car.currPos);
        const flight = THREE.MathUtils.clamp(dist / 24, 0.9, 2.4);
        for (let n = 0; n < 3; n++) {
          const from = mouth.clone().add(new THREE.Vector3(fwd.z, 0, -fwd.x).multiplyScalar((n - 1) * 1.5));
          this.ctx.projectiles.throwAt('waterBolt', from, B.throwDamage, B.throwSplash, flight * (0.8 + n * 0.2));
        }
        this.ctx.audio.thump();
      } else {
        this.cd.slam = 4.5;
        const at = this.pos.clone().addScaledVector(fwd, 15);
        const d = Math.hypot(car.currPos.x - at.x, car.currPos.z - at.z);
        if (d < B.slamRadius + 2 && !car.wrecked) {
          car.takeDamage(B.biteDamage, at.clone().setY(car.currPos.y));
          const away = car.currPos.clone().sub(at).setY(0).normalize();
          car.nudge(away.x * 10, away.z * 10);
        }
        this.wave = { x: at.x, z: at.z, r: 3, hit: d < B.slamRadius + 2 };
        this.ring.position.set(at.x, Math.max(this.level, terrain.height(at.x, at.z)) + 0.15, at.z);
        this.ring.visible = true;
        this.#splash(at, 40);
        this.ctx.audio.wreck();
        this.ctx.chase.addShake(Math.max(0.3, 1.3 - d / 40));
      }
    }
    if (a.t > a.windup + (a.type === 'slam' ? 1.0 : 0.5)) this.action = null;
  }

  // Come up somewhere in the lake between the middle and you.
  #surfaceNear(carPos) {
    const toCar = Math.atan2(carPos.x - this.arenaCenter.x, carPos.z - this.arenaCenter.z);
    const a = toCar + (Math.random() - 0.5) * 1.6;
    const r = this.lakeRadius * (0.35 + Math.random() * 0.4);
    this.pos.set(this.arenaCenter.x + Math.sin(a) * r, this.level, this.arenaCenter.z + Math.cos(a) * r);
    this.prev.copy(this.pos);
    this.yaw = Math.atan2(carPos.x - this.pos.x, carPos.z - this.pos.z);
    this.state = 'rising';
    this.timer = 0;
    this.action = null;
    this.root.visible = true;
    this.#splash(this.pos, 40);
    this.ctx.audio.wreck();
    this.ctx.chase.addShake(0.4);
  }

  #wake(carPos) {
    this.#surfaceNear(carPos);
    this.state = 'waking';
    this.ctx.hud.toast(`${this.name.toUpperCase()} RISES!`, 'warn');
    this.ctx.hud.bossBar(this.name, this.hp / this.B.health, false);
    this.ctx.chase.addShake(1);
  }

  #summon() {
    const { demons, hud } = this.ctx;
    const list = this.cfg.summons || [['drowned', 10]];
    list.forEach(([type, n], i) => {
      const ang = (i / list.length) * Math.PI * 2 + Math.random();
      const r = this.lakeRadius + 12;
      demons.spawnPack(new THREE.Vector3(this.arenaCenter.x + Math.cos(ang) * r, 0, this.arenaCenter.z + Math.sin(ang) * r), n, type);
    });
    hud.toast(`The Drowned answer ${this.name}!`, 'warn');
    this.ctx.audio.wreck();
  }

  #park() { this.body.setNextKinematicTranslation({ x: this.pos.x, y: -200, z: this.pos.z }); }

  #splash(at, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 8;
      this.ctx.dust.spawn(new THREE.Vector3(at.x, this.level + 0.3, at.z), new THREE.Vector3(Math.cos(a) * s, 4 + Math.random() * 7, Math.sin(a) * s), 0.5 + Math.random() * 0.7, 1.3);
    }
  }

  #die() {
    this.ctx.onDying?.();
    this.state = 'dying';
    this.timer = 0;
    this.exploded = false;
    this.action = null;
    this.wave = null;
    this.ring.visible = false;
    this.ctx.stats.kill('gun');
    this.ctx.hud.bossBar(null);
    this.ctx.audio.wreck();
    this.#park();
  }

  #explode() {
    this.exploded = true;
    this.defeated = true;
    this.state = 'dead';
    // Gone under for good: one last burst of bubbles where it went down.
    for (let i = 0; i < 40; i++) {
      const p = this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 16, 0, 6 + Math.random() * 18).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw));
      this.ctx.dust.spawn(p.setY(this.level + 0.1), new THREE.Vector3((Math.random() - 0.5) * 2, 2 + Math.random() * 4, (Math.random() - 0.5) * 2), 0.4 + Math.random() * 0.6, 1.4);
    }
    this.ctx.audio.thump();
    this.root.visible = false;
    this.#park();
    this.ctx.onDefeated?.();
  }

  // ------------------------------------------------------------------ drawing
  render(alpha, dt) {
    if (!this.root.visible) return;
    const now = performance.now() / 1000;
    this.root.position.lerpVectors(this.prev, this.pos, alpha);
    this.root.rotation.y = this.yaw;
    this.mat.emissive.setRGB(this.flash * 0.6, this.flash * 0.8, this.flash * 0.7);
    this.matGlow.emissiveIntensity = 1.2 + Math.sin(now * 3) * 0.4 + (this.hp < this.B.health * 0.5 ? 0.8 : 0);

    // The neck: an S-curve rising out of the water toward the head.
    // rise lifts the whole thing out; actions bend it.
    const rise = this.rise;
    let rear = 0, lunge = 0, open = 0.15;
    const a = this.action;
    if (a) {
      const wind = Math.min(1, a.t / a.windup), after = a.t > a.windup;
      if (a.type === 'slam') { rear = after ? 0 : wind; lunge = after ? Math.max(0, 1 - (a.t - a.windup) / 0.6) : 0; open = after ? 0.6 : 0.2 + wind * 0.5; }
      if (a.type === 'spit') { rear = after ? 0 : wind * 0.35; open = after ? 0.8 : wind * 0.8; }
    }
    // Dying: thrash, topple forward onto the water, then sink
    const T = this.state === 'dying' ? this.timer : 0;
    const topple = this.state === 'dying' ? smoothstep((T - 1.4) / 2.2) : 0;
    const sink = this.state === 'dying' ? smoothstep((T - 3.6) / (SINK_TIME - 3.6)) : 0;
    const thrash = this.state === 'dying' ? (1 - topple) * Math.min(1, T * 2) : 0;
    if (this.state === 'dying') { open = 0.9 - sink * 0.6; this.matGlow.emissiveIntensity *= 1 - sink; }
    const sway = Math.sin(now * 1.1) * 0.6;
    for (let i = 0; i < SEGS; i++) {
      const t = i / (SEGS - 1);
      // forward distance and height along the neck
      let fz = t * 9 - rear * t * t * 5 + lunge * t * t * 14;
      let y = Math.sin(t * Math.PI * 0.55) * 13 * (1 - lunge * t * 0.8) + rear * t * 4;
      y = y * rise + UNDER_Y * (1 - rise) + (t < 0.15 ? -3 * (1 - t / 0.15) : 0);
      // toppled: lying stretched out along the water; sinking: going under
      fz = THREE.MathUtils.lerp(fz, t * 26, topple);
      y = THREE.MathUtils.lerp(y, 0.2 - (t < 0.15 ? 2 : 0), topple) - sink * 16;
      const fx = Math.sin(t * Math.PI * 1.5 + now * 0.9) * 1.2 * t + sway * t + Math.sin(now * 11 + i * 0.7) * 1.6 * t * thrash;
      const seg = this.segs[i];
      seg.position.set(fx, y, fz);
    }
    this.root.updateMatrixWorld(true);
    for (let i = 0; i < SEGS; i++) {
      const next = this.segs[Math.min(SEGS - 1, i + 1)], prev = this.segs[Math.max(0, i - 1)];
      this.segs[i].lookAt(_v.copy(next.position).sub(prev.position).add(this.segs[i].position).applyMatrix4(this.root.matrixWorld));
    }
    const h = this.segs[SEGS - 1];
    this.headGroup.position.copy(h.position);
    this.headGroup.rotation.set(THREE.MathUtils.lerp(-0.25 + lunge * 0.9 - rear * 0.5 - thrash * 0.6 * Math.sin(now * 9), 1.1, topple), Math.sin(now * 0.7) * 0.15 + Math.sin(now * 8) * 0.5 * thrash, topple * 0.6);
    this.jaw.rotation.x = open;
    // The humps of its body behind, rolling through the water
    this.humps.forEach((hp, k) => {
      hp.position.y = this.level - this.pos.y - 1.6 + Math.sin(now * 1.4 + k * 1.3) * 0.6 * rise + (1 - rise) * -6 - sink * 12;
    });
    // World positions for hit checks / effects
    this.root.updateMatrixWorld(true);
    this.headGroup.getWorldPosition(this.head);
    for (let i = 0; i < SEGS; i++) this.segs[i].getWorldPosition(this.neckPts[i]);

    if (this.wave) {
      this.ring.scale.setScalar(this.wave.r);
      this.ring.material.opacity = 0.8 * (1 - this.wave.r / this.B.stompRadius);
    }
  }

  // ------------------------------------------------------------------ model
  #buildModel(scene) {
    const L = { skin: 0x2a4a48, dark: 0x14242a, belly: 0x8a9a7a, glow: 0x60ffd0, eye: 0xd0fff0, horn: 0xc8c0a8, ...this.cfg.look };
    this.mat = litMaterial({ color: L.skin, flatShading: true, roughness: 0.45, metalness: 0.2 });
    const dark = litMaterial({ color: L.dark, flatShading: true, roughness: 0.6 });
    const belly = litMaterial({ color: L.belly, flatShading: true, roughness: 0.7 });
    this.matGlow = litMaterial({ color: L.glow, emissive: L.glow, emissiveIntensity: 1.4, flatShading: true });
    const bone = litMaterial({ color: L.horn, flatShading: true });
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

    // Neck: scaled balls (thick at the water, thinner at the head), with a
    // spiny crest of fins down its back and glowing spots along the side.
    this.segs = [];
    this.neckPts = [];
    for (let i = 0; i < SEGS; i++) {
      const t = i / (SEGS - 1);
      const seg = new THREE.Group();
      const r = 2.3 - t * 1.1;
      add(seg, new THREE.IcosahedronGeometry(r, 1), this.mat).scale.set(1, 1, 1.25);
      add(seg, new THREE.BoxGeometry(r * 1.1, r * 0.5, r * 1.5), belly, 0, -r * 0.55, 0);   // pale belly plates
      const fin = add(seg, new THREE.ConeGeometry(0.35 + r * 0.15, 1.6 + r * 0.6, 4), dark, 0, r + 0.6, 0);
      fin.rotation.x = -0.5;
      if (i % 2 === 0) for (const s of [-1, 1]) add(seg, new THREE.IcosahedronGeometry(0.22, 0), this.matGlow, s * r * 0.95, r * 0.2, 0);
      root.add(seg);
      this.segs.push(seg);
      this.neckPts.push(new THREE.Vector3());
    }

    // Head: a long armored skull, glowing eyes, frill, horns, and a jaw full of teeth.
    const head = new THREE.Group();
    this.headGroup = head;
    root.add(head);
    add(head, new THREE.BoxGeometry(2.8, 2.0, 4.6), this.mat, 0, 0.3, 1.6);               // skull
    add(head, new THREE.BoxGeometry(2.0, 1.2, 2.6), this.mat, 0, 0.0, 4.6);               // snout
    add(head, new THREE.BoxGeometry(2.9, 0.4, 4.0), dark, 0, 1.35, 1.4);                  // brow plate
    for (const s of [-1, 1]) {
      add(head, new THREE.BoxGeometry(0.5, 0.35, 0.3), eye, s * 1.2, 0.9, 3.3);            // eyes
      const horn = add(head, new THREE.ConeGeometry(0.35, 3.2, 5), bone, s * 1.1, 1.8, -0.6);
      horn.rotation.set(-1.0, 0, s * 0.35);
      const frill = add(head, new THREE.ConeGeometry(1.4, 3.4, 3), dark, s * 2.0, 0.6, -0.3);
      frill.rotation.set(0, 0, s * -1.25);
      frill.scale.z = 0.25;
      for (let k = 0; k < 4; k++) add(head, new THREE.ConeGeometry(0.14, 0.7, 4), bone, s * 0.8, -0.65, 2.2 + k * 0.85).rotation.x = Math.PI; // upper teeth
    }
    add(head, new THREE.BoxGeometry(1.8, 0.2, 3.6), this.matGlow, 0, -0.55, 3.0);          // glowing mouth
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.6, 0.6);
    head.add(jaw);
    this.jaw = jaw;
    add(jaw, new THREE.BoxGeometry(2.3, 0.7, 4.8), dark, 0, -0.35, 2.2);
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) add(jaw, new THREE.ConeGeometry(0.13, 0.6, 4), bone, s * 0.75, 0.2, 1.3 + k * 0.9);

    // Humps of its long body, coiling through the water behind the neck.
    this.humps = [];
    for (let k = 0; k < 3; k++) {
      const hump = new THREE.Mesh(new THREE.TorusGeometry(3.2 - k * 0.5, 1.5 - k * 0.25, 6, 10, Math.PI), this.mat);
      hump.position.set(Math.sin(k * 1.7) * 4, 0, -9 - k * 8);
      hump.rotation.y = Math.PI / 2 + Math.sin(k) * 0.3;
      hump.castShadow = true;
      root.add(hump);
      this.humps.push(hump);
    }
    const tail = add(this.humps[2], new THREE.ConeGeometry(1.8, 4, 3), dark, 0, 3.4, 0);
    tail.scale.z = 0.3;
    root.visible = false;
  }
}

const _v = new THREE.Vector3();
