// THE BOG MOTHER (Blood Swamp boss): a giant bloated hag-toad squatting in
// a pool of blood. She doesn't walk: she turns to face you and
//  - shoots out her TONGUE: if it catches you, she reels your car in. Shoot
//    her hard enough (or get lucky) and she lets go; reach her mouth and
//    she CHOMPS.
//  - SPITS globs of blood when you keep your distance.
//  - BELLY FLOPS when you're close: a wave of blood rolls outward.
//  - BELCHES up a swarm of Blood Leeches.
//  - LAYS EGG SACS around her pool that hatch into Mire Toads (shoot them
//    or drive over them first!).
//  - Below half health she gets angry and does it all faster.
// Same outside shape as boss.js, so the rest of the game treats it the same.
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';
import { raySphere } from './demons.js';
import { SETTINGS } from '../settings.js';
import { terrain } from '../world/terrain.js';

export class BogMother {
  constructor(scene, physics, ctx) {
    this.isBoss = true;
    const cfg = ctx.region.boss;
    this.cfg = cfg;
    this.name = cfg.name;
    this.B = SETTINGS.bosses[cfg.type];
    this.ctx = ctx;
    const A = cfg.arena;
    this.level = terrain.bogLevel ?? terrain.height(A.x, A.z);
    this.arenaCenter = new THREE.Vector3(A.x, this.level, A.z);
    this.arenaRadius = A.radius + 30; // (she notices you at the edge of her pool)
    this.poolRadius = A.radius;
    this.radius = 6;
    this.#buildModel(scene);
    const { RAPIER, world } = physics;
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(A.x, this.level, A.z));
    world.createCollider(RAPIER.ColliderDesc.ball(6.2).setTranslation(0, 2.5, 0).setRestitution(0.4), this.body);

    const ringGeo = new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.visible = false;
    scene.add(this.ring);
    this.mouth = new THREE.Vector3();
    this.reset();
  }

  get awake() { return this.state !== 'dormant' && this.state !== 'dead'; }
  distanceTo(p) { return Math.max(0, Math.hypot(p.x - this.pos.x, p.z - this.pos.z) - this.radius); }

  reset() {
    if (this.state === 'dying' && !this.exploded) this.#explode();
    this.pos = this.arenaCenter.clone();
    this.prev = this.pos.clone();
    this.yaw = Math.atan2(-this.arenaCenter.x, -this.arenaCenter.z); // faces the way you'll come in
    this.hp = this.B.health;
    this.state = this.defeated ? 'dead' : 'dormant';
    this.timer = 0;
    this.action = null;
    this.tongue = null;       // { t, target, grabbed, hold, hpAtGrab }
    this.cd = { tongue: 2, spit: 1, flop: 4, belch: 6, eggs: 3 };
    this.clutches = 0;
    this.flash = 0;
    this.wave = null;
    this.flopY = 0;
    this.ring.visible = false;
    this.root.visible = !this.defeated;
    this.root.scale.setScalar(1);
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
    // Hurt her enough while she's got you, and she lets go.
    if (this.tongue?.grabbed && this.tongue.hpAtGrab - this.hp > this.B.health * 0.035) this.#letGo(false);
    if (this.hp <= 0) { this.#die(); return true; }
    return false;
  }

  raycast(o, dir) {
    if (this.state === 'dead' || this.disabled) return null;
    let best = null;
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const spots = [[this.pos.clone().setY(this.pos.y + 3 + this.flopY), 5.6], [this.pos.clone().addScaledVector(fwd, 5).setY(this.pos.y + 5 + this.flopY), 3.2]];
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
    if (this.state === 'dead') return;
    if (this.state === 'dormant') {
      if (dist < this.arenaRadius && !car.wrecked) this.#wake();
      return;
    }
    if (this.state === 'dying') {
      this.timer += dt;
      if (this.timer > 2.6 && !this.exploded) this.#explode();
      return;
    }
    if (this.state === 'waking') {
      this.timer += dt;
      this.#face(carPos, 1.2 * dt);
      if (this.timer > 2.2) this.state = 'fight';
      return;
    }

    // Ramming her
    if (car.lastCrash && dist < this.radius + 4) {
      const c = car.lastCrash;
      const massFactor = car.totalMass / SETTINGS.steering.referenceMass;
      this.takeHit(SETTINGS.ramming.ramPower * (c.lost / (SETTINGS.ramming.splatSpeedKmh / 3.6)) ** 2 * massFactor, 'ram');
      this.ctx.audio.thump();
    }

    // Gone too far (or wrecked): she settles back into the blood and heals.
    if (car.wrecked || dist > B.leash) {
      this.#letGo(false);
      this.hp = Math.min(B.health, this.hp + B.health * 0.05 * dt);
      if (this.hp >= B.health) { this.state = 'dormant'; this.ctx.hud.bossBar(null); }
      return;
    }

    const frac = this.hp / B.health;
    const enraged = frac < 0.5;
    const rate = enraged ? 1.4 : 1;
    for (const k in this.cd) this.cd[k] -= dt * rate;
    this.#face(carPos, (this.tongue?.grabbed ? 2.5 : enraged ? 1.0 : 0.7) * dt);

    if (this.tongue) this.#updateTongue(dt, car);
    else if (this.action) this.#runAction(dt, car, dist);
    else {
      // Pick something nasty to do.
      if (frac < 0.85 - this.clutches * 0.3 && this.cd.eggs <= 0) this.#start('eggs', 1.0);
      else if (dist < 24 && this.cd.flop <= 0) this.#start('flop', 0.9);
      else if (dist > 12 && dist < B.tongueRange && this.cd.tongue <= 0) this.#start('tongue', 0.6);
      else if (this.cd.belch <= 0) this.#start('belch', 0.8);
      else if (dist > 18 && this.cd.spit <= 0) this.#start('spit', 0.6);
    }

    // The wave of blood from a belly flop
    if (this.wave) {
      this.wave.r += 20 * dt;
      if (!this.wave.hit && Math.abs(dist - this.wave.r) < 2 && car.grounded && !car.wrecked) {
        this.wave.hit = true;
        car.takeDamage(B.slamDamage, this.pos.clone().sub(carPos).setY(0).normalize().multiplyScalar(1.5).add(carPos));
        car.nudge(((carPos.x - this.pos.x) / dist) * 8, ((carPos.z - this.pos.z) / dist) * 8);
        this.ctx.chase.addShake(0.7);
      }
      if (this.wave.r > B.stompRadius) { this.wave = null; this.ring.visible = false; }
    }
    this.ctx.hud.bossBar(this.name, frac, enraged);
  }

  #face(target, maxTurn) {
    const want = Math.atan2(target.x - this.pos.x, target.z - this.pos.z);
    let d = want - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += THREE.MathUtils.clamp(d, -maxTurn, maxTurn);
  }

  #start(type, windup) { this.action = { type, t: 0, windup, done: false }; }

  #runAction(dt, car, dist) {
    const B = this.B, a = this.action;
    a.t += dt;
    if (a.t >= a.windup && !a.done) {
      a.done = true;
      const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      if (a.type === 'tongue') {
        this.cd.tongue = 6;
        // Aim where the car is going to be.
        const lv = car.body.linvel();
        const target = car.currPos.clone().add(new THREE.Vector3(lv.x, 0, lv.z).multiplyScalar(0.25));
        this.tongue = { t: 0, target, grabbed: false, hold: 0, len: 0 };
        this.action = null;
        this.ctx.audio.thump();
        return;
      }
      if (a.type === 'spit') {
        this.cd.spit = 3.2;
        const from = this.mouth.clone();
        const flight = THREE.MathUtils.clamp(dist / 24, 0.9, 2.2);
        for (let n = 0; n < 3; n++) this.ctx.projectiles.throwAt('bloodGlob', from.clone().add(new THREE.Vector3(fwd.z, 0, -fwd.x).multiplyScalar((n - 1) * 1.6)), B.throwDamage, B.throwSplash, flight * (0.8 + n * 0.2));
        this.ctx.audio.thump();
      } else if (a.type === 'flop') {
        this.cd.flop = 6.5;
        this.wave = { r: 6, hit: false };
        this.ring.position.set(this.pos.x, this.level + 0.2, this.pos.z);
        this.ring.visible = true;
        this.#splash(this.pos, 50, 9);
        this.ctx.audio.wreck();
        this.ctx.chase.addShake(Math.max(0.3, 1.2 - dist / 50));
      } else if (a.type === 'belch') {
        this.cd.belch = 10;
        this.ctx.demons.spawnPack(this.mouth.clone().addScaledVector(fwd, 6).setY(0), 10, 'leech');
        this.#splash(this.mouth, 20, 3);
        this.ctx.hud.toast(`${this.name} belches up leeches!`, 'warn');
        this.ctx.audio.wreck();
      } else if (a.type === 'eggs') {
        this.cd.eggs = 16;
        this.clutches++;
        const n = this.B.eggs + (this.hp < this.B.health * 0.5 ? 1 : 0);
        for (let k = 0; k < n; k++) {
          const ang = this.yaw + Math.PI + (k - (n - 1) / 2) * 0.9; // behind and around her
          const r = this.poolRadius + 6;
          this.ctx.demons.spawnPack(new THREE.Vector3(this.pos.x + Math.sin(ang) * r, 0, this.pos.z + Math.cos(ang) * r), 1, 'eggSac');
        }
        this.ctx.hud.toast(`${this.name} lays her eggs! Destroy them before they hatch!`, 'warn');
        this.ctx.audio.wreck();
      }
    }
    const recover = a.type === 'flop' ? 0.8 : 0.5;
    if (a.t > a.windup + recover) this.action = null;
  }

  // The tongue flies out, sticks to the car (or misses), and reels it in.
  #updateTongue(dt, car) {
    const T = this.tongue, B = this.B;
    T.t += dt;
    const carPos = car.currPos;
    if (!T.grabbed) {
      const reach = Math.min(1, T.t / 0.3);
      T.len = this.mouth.distanceTo(T.target) * reach;
      if (reach >= 1) {
        if (!car.wrecked && Math.hypot(carPos.x - T.target.x, carPos.z - T.target.z) < 4.5) {
          T.grabbed = true;
          T.hpAtGrab = this.hp;
          this.ctx.hud.toast('GRABBED! Shoot her to break free!', 'bad');
          this.ctx.chase.addShake(0.5);
        } else if (T.t > 0.6) this.tongue = null; // missed: reel back in
      }
      return;
    }
    T.hold += dt;
    T.target.copy(carPos);
    T.len = this.mouth.distanceTo(carPos);
    const to = new THREE.Vector3(this.pos.x - carPos.x, 0, this.pos.z - carPos.z);
    const d = to.length();
    if (d < this.radius + 4) { // reeled all the way in: CHOMP
      car.takeDamage(B.chompDamage, this.mouth.clone());
      car.nudge((-to.x / d) * 12, (-to.z / d) * 12);
      this.ctx.audio.wreck();
      this.ctx.chase.addShake(1);
      this.#letGo(true);
      return;
    }
    to.divideScalar(d).multiplyScalar(B.tonguePull);
    const v = car.body.linvel();
    const k = Math.min(1, 6 * dt);
    car.body.setLinvel({ x: v.x + (to.x - v.x) * k, y: v.y, z: v.z + (to.z - v.z) * k }, true);
    if (T.hold > B.tongueTime * (this.hp < B.health * 0.5 ? 1.4 : 1) || car.wrecked) this.#letGo(false);
  }

  #letGo(chomped) {
    if (!this.tongue) return;
    if (this.tongue.grabbed && !chomped) this.ctx.hud.toast('Broke free!', 'job');
    this.tongue = null;
  }

  #wake() {
    if (this.state !== 'dormant') return;
    this.state = 'waking';
    this.timer = 0;
    this.ctx.hud.toast(`${this.name.toUpperCase()} STIRS!`, 'warn');
    this.ctx.hud.bossBar(this.name, this.hp / this.B.health, false);
    this.ctx.audio.wreck();
    this.ctx.chase.addShake(1);
  }

  #splash(at, n, spread) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = spread * (0.4 + Math.random() * 0.8);
      this.ctx.dust.spawn(new THREE.Vector3(at.x + Math.cos(a) * 2, this.level + 0.4, at.z + Math.sin(a) * 2), new THREE.Vector3(Math.cos(a) * s, 4 + Math.random() * 6, Math.sin(a) * s), 0.4 + Math.random() * 0.6, 1.2);
    }
  }

  #die() {
    this.ctx.onDying?.();
    this.state = 'dying';
    this.timer = 0;
    this.exploded = false;
    this.action = null;
    this.tongue = null;
    this.wave = null;
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
    const colors = [L.skin ?? 0x5a2a1c, L.dark ?? 0x2a100a, 0x9a0a0a, L.glow ?? 0xff4030, 0xd0e060];
    for (let k = 0; k < 4; k++) this.ctx.gore.explode(this.pos.clone().setY(this.level + 2 + k), new THREE.Vector3((Math.random() - 0.5) * 12, 8, (Math.random() - 0.5) * 12), colors, 4);
    this.#splash(this.pos, 60, 10);
    this.ctx.audio.wreck();
    this.ctx.chase.addShake(1.2);
    this.root.visible = false;
    this.body.setNextKinematicTranslation({ x: 0, y: -200, z: 0 });
    this.ctx.onDefeated?.();
  }

  // ------------------------------------------------------------------ drawing
  render(alpha, dt) {
    if (!this.root.visible) return;
    const now = performance.now() / 1000;
    this.root.position.lerpVectors(this.prev, this.pos, alpha);
    this.root.rotation.y = this.yaw;
    this.matSkin.emissive.setRGB(this.flash * 0.8, this.flash * 0.2, 0);
    this.matGlow.emissiveIntensity = 1.2 + Math.sin(now * 3) * 0.4 + (this.hp < this.B.health * 0.5 ? 0.8 : 0);

    // Breathing, the throat sac swelling before an attack, belly flop hop
    const a = this.action;
    const wind = a ? Math.min(1, a.t / a.windup) : 0, after = a && a.t > a.windup;
    let sac = 0.6 + Math.sin(now * 2) * 0.08, hop = 0, open = 0.08, lean = 0;
    if (a?.type === 'spit' || a?.type === 'belch') { sac = after ? 0.6 : 0.6 + wind * 1.1; open = after ? 0.5 : 0.1; }
    if (a?.type === 'tongue') { open = 0.15 + wind * 0.4; lean = wind * 0.15; }
    if (a?.type === 'flop') { hop = after ? Math.max(0, 1 - (a.t - a.windup) / 0.25) * 2 : Math.sin(wind * Math.PI * 0.5) * 3.5; }
    if (a?.type === 'eggs') { lean = -wind * 0.2; }
    if (this.tongue) open = 0.55;
    if (this.state === 'dormant') { hop = -1.6; open = 0; }
    if (this.state === 'waking') hop = -1.6 * Math.max(0, 1 - this.timer / 2.2);
    if (this.state === 'dying') { const k = Math.min(1, this.timer / 2.6); this.root.scale.set(1 + k * 0.15, 1 - k * 0.6, 1 + k * 0.15); hop = -k * 2; open = 0.7; }
    this.flopY = hop;
    const k = 1 - Math.exp(-12 * dt);
    this.bodyGroup.position.y += (hop - this.bodyGroup.position.y) * k;
    this.bodyGroup.rotation.x += (lean - this.bodyGroup.rotation.x) * k;
    this.bodyGroup.scale.y = 1 + Math.sin(now * 1.6) * 0.025;
    this.sac.scale.setScalar(this.sac.scale.x + (sac - this.sac.scale.x) * k);
    this.jaw.rotation.x += (open - this.jaw.rotation.x) * k;
    for (const [i, h] of this.hair.entries()) h.rotation.z = Math.sin(now * 0.8 + i) * 0.06;
    for (const [i, arm] of this.arms.entries()) arm.rotation.x = Math.sin(now * 1.2 + i * 2) * 0.05 - (a?.type === 'flop' && !after ? wind * 0.6 : 0);

    // World position of her mouth (spit, tongue, leeches)
    this.root.updateMatrixWorld(true);
    this.mouthMark.getWorldPosition(this.mouth);

    // The tongue: a long pink rope from her mouth to its target
    const T = this.tongue;
    this.tongueMesh.visible = !!T;
    if (T) {
      const len = Math.max(0.5, T.len);
      this.tongueMesh.position.copy(this.mouth);
      this.tongueMesh.lookAt(T.target.x, T.target.y + 0.8, T.target.z);
      this.tongueMesh.scale.set(1, 1, len);
      this.tongueTip.scale.set(1, 1, 1 / len); // (undo the stretch: the tip stays round)
    }

    if (this.wave) {
      this.ring.scale.setScalar(this.wave.r);
      this.ring.material.opacity = 0.8 * (1 - this.wave.r / this.B.stompRadius);
    }
  }

  // ------------------------------------------------------------------ model
  #buildModel(scene) {
    const L = { skin: 0x5a2a1c, dark: 0x2a100a, belly: 0x9a6a4a, glow: 0xff4030, eye: 0xffe040, hair: 0x0e0808, bone: 0xd8cfb8, egg: 0xd0e060, ...this.cfg.look };
    this.matSkin = litMaterial({ color: L.skin, flatShading: true, roughness: 0.6 });
    const dark = litMaterial({ color: L.dark, flatShading: true, roughness: 0.8 });
    const belly = litMaterial({ color: L.belly, flatShading: true, roughness: 0.7 });
    this.matGlow = litMaterial({ color: L.glow, emissive: L.glow, emissiveIntensity: 1.4, flatShading: true });
    const eggMat = litMaterial({ color: L.egg, emissive: L.egg, emissiveIntensity: 0.6, flatShading: true, roughness: 0.3 });
    const hairMat = litMaterial({ color: L.hair, flatShading: true, roughness: 1 });
    const bone = litMaterial({ color: L.bone, flatShading: true });
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
    const body = new THREE.Group();
    this.bodyGroup = body;
    root.add(body);

    // The huge bloated body, half sunk in the blood
    add(body, new THREE.IcosahedronGeometry(6, 2), this.matSkin, 0, 2.6, -0.5).scale.set(1.15, 0.72, 1.1);
    add(body, new THREE.IcosahedronGeometry(5, 1), belly, 0, 1.6, 1.2).scale.set(1.05, 0.55, 0.9);
    for (let k = 0; k < 26; k++) { // warts
      const a = k * 2.39, y = 3 + (k % 5) * 0.55;
      const r = 6.2 - Math.abs(y - 3.5) * 0.7;
      add(body, new THREE.IcosahedronGeometry(0.3 + (k % 3) * 0.18, 0), k % 4 ? dark : this.matGlow, Math.sin(a) * r, y, Math.cos(a) * r * 0.95 - 0.5);
    }
    // Eggs heaped on her back
    for (let k = 0; k < 9; k++) {
      const a = k * 1.9;
      add(body, new THREE.SphereGeometry(0.75 + (k % 3) * 0.2, 8, 6), eggMat, Math.sin(a) * 2.2, 6.1 + (k % 2) * 0.6, -2.5 + Math.cos(a) * 1.6);
    }

    // The head: wide and flat, a ring of little eyes, a curtain of black hair, a crown of finger bones
    const head = new THREE.Group();
    head.position.set(0, 4.2, 4.6);
    body.add(head);
    add(head, new THREE.SphereGeometry(1, 14, 10), this.matSkin, 0, 0.7, 0.4).scale.set(3.8, 1.5, 2.6);   // wide flat toad head
    add(head, new THREE.SphereGeometry(1, 12, 8), belly, 0, -0.2, 0.9).scale.set(3.4, 0.9, 2.2);          // pale chin
    // Two big bulging toad eyes on top, and a row of little extra ones
    for (const s of [-1, 1]) {
      add(head, new THREE.SphereGeometry(1.0, 10, 8), this.matSkin, s * 1.9, 1.9, 1.0);
      add(head, new THREE.SphereGeometry(0.8, 10, 8), eye, s * 1.9, 2.05, 1.45);
      add(head, new THREE.BoxGeometry(0.25, 0.9, 0.2), dark, s * 1.9, 2.05, 2.2);                         // slit pupil
    }
    for (const x of [-0.8, 0, 0.8]) add(head, new THREE.SphereGeometry(0.28, 6, 5), eye, x, 2.0, 1.9);
    for (let k = 0; k < 7; k++) {
      const spike = add(head, new THREE.ConeGeometry(0.16, 1.4, 4), bone, -1.8 + k * 0.6, 2.8, -0.6);
      spike.rotation.x = -0.3;
    }
    this.hair = [];
    for (let k = 0; k < 16; k++) {
      const side = k < 8 ? -1 : 1, i = k % 8;
      const h = add(head, new THREE.BoxGeometry(0.35, 4.5 + (i % 3), 0.2), hairMat, side * (2.6 + (i % 2) * 0.6), -0.6, -1.6 + i * 0.45);
      h.geometry.translate(0, -1.5, 0);
      this.hair.push(h);
    }
    // Mouth: a huge jaw, a glowing gullet, a throat sac
    add(head, new THREE.BoxGeometry(6.4, 0.45, 0.8), this.matGlow, 0, -0.45, 2.6);
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.6, -1.2);
    head.add(jaw);
    this.jaw = jaw;
    add(jaw, new THREE.BoxGeometry(6.8, 0.9, 4.2), dark, 0, -0.35, 1.3);
    for (let k = 0; k < 9; k++) add(jaw, new THREE.ConeGeometry(0.15, 0.6, 4), bone, -2.8 + k * 0.7, 0.3, 3.2);
    this.sac = add(head, new THREE.SphereGeometry(1.6, 10, 8), this.matGlow, 0, -1.6, 1.2);
    this.mouthMark = new THREE.Object3D();
    this.mouthMark.position.set(0, -0.2, 2.6);
    head.add(this.mouthMark);

    // Two long thin hag arms, clawed hands resting on the edge of her pool
    this.arms = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 5.6, 3.4, 2.5);
      body.add(arm);
      const up = add(arm, new THREE.BoxGeometry(0.8, 0.8, 4.2), this.matSkin, 0, -0.6, 1.8);
      up.rotation.x = 0.35;
      add(arm, new THREE.BoxGeometry(0.6, 0.6, 3.8), this.matSkin, s * 0.3, -2.0, 5.0).rotation.x = 0.55;
      add(arm, new THREE.BoxGeometry(1.4, 0.4, 1.2), dark, s * 0.3, -3.2, 6.8);
      for (let f = 0; f < 4; f++) add(arm, new THREE.ConeGeometry(0.12, 1.2, 4), bone, s * 0.3 + (f - 1.5) * 0.35, -3.3, 7.8).rotation.x = Math.PI / 2;
      this.arms.push(arm);
    }

    // The tongue (only shown when it's out): a unit-long rope we stretch
    const tGeo = new THREE.CylinderGeometry(0.35, 0.45, 1, 8).rotateX(Math.PI / 2).translate(0, 0, 0.5);
    this.tongueMesh = new THREE.Mesh(tGeo, litMaterial({ color: 0xd05070, roughness: 0.3 }));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), litMaterial({ color: 0xe06080, roughness: 0.3 }));
    tip.position.z = 1;
    this.tongueMesh.add(tip);
    this.tongueTip = tip;
    this.tongueMesh.visible = false;
    scene.add(this.tongueMesh);
  }
}
