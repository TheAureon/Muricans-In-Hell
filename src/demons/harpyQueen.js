// THE HARPY QUEEN (Screaming Canyon boss): a giant winged hag nesting in a
// bowl at the far end of the canyon. She fights from the air:
//  - CIRCLES high over the bowl, watching you.
//  - SWOOPS: dives low across the bowl straight at you; if she catches you,
//    she rips a part off your car (and it hurts). Swerve!
//  - SHRIEKS: a screaming shockwave rolls out across the ground (and shakes
//    rocks loose from the canyon walls).
//  - Calls FLOCKS of harpies.
//  - PERCHES on a rock spire for a few seconds to rest: your best chance
//    to shoot her (she's also low enough to ram while she swoops).
//  - Below half health: faster and meaner, and she grabs twice.
// Same outside shape as boss.js, so the rest of the game treats it the same.
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';
import { raySphere } from './demons.js';
import { SETTINGS } from '../settings.js';
import { terrain } from '../world/terrain.js';

export class HarpyQueen {
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
    this.radius = 3.5;
    this.spires = A.spires || [];
    this.#buildModel(scene);
    const { RAPIER, world } = physics;
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(A.x, -200, A.z));
    world.createCollider(RAPIER.ColliderDesc.ball(3).setRestitution(0.4), this.body);
    const ringGeo = new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff6080, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.visible = false;
    scene.add(this.ring);
    this.reset();
  }

  get awake() { return this.state !== 'dormant' && this.state !== 'dead'; }
  distanceTo(p) { return Math.max(0, this.pos.distanceTo(p) - this.radius); }

  reset() {
    if (this.state === 'dying' && !this.exploded) this.#explode();
    this.pos = this.arenaCenter.clone().setY(this.arenaCenter.y + 2.5); // asleep on her nest
    this.prev = this.pos.clone();
    this.yaw = Math.atan2(-this.arenaCenter.x, -this.arenaCenter.z);
    this.hp = this.B.health;
    this.state = this.defeated ? 'dead' : 'dormant';
    this.mode = 'circle';
    this.timer = 0;
    this.angle = 0;
    this.cd = { swoop: 3, shriek: 7, flock: 10, perch: 16 };
    this.swoop = null;
    this.perch = null;
    this.wave = null;
    this.flash = 0;
    this.flap = 0;
    this.ring.visible = false;
    this.root.visible = !this.defeated;
    this.root.rotation.set(0, 0, 0);
    this.body.setNextKinematicTranslation(this.defeated || this.disabled ? { x: 0, y: -200, z: 0 } : this.pos);
    this.ctx.hud?.bossBar(null);
  }

  setDisabled(on) {
    this.disabled = on;
    this.reset();
    if (on) this.root.visible = false;
  }

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
    const t = raySphere(o, dir, this.pos.clone().setY(this.pos.y + 2), 4.2);
    return t === null ? null : { t, point: o.clone().addScaledVector(dir, t) };
  }

  // ------------------------------------------------------------------ update
  fixedUpdate(dt, car) {
    const B = this.B;
    this.prev.copy(this.pos);
    this.flash = Math.max(0, this.flash - dt * 5);
    const carPos = car.currPos;
    const fromArena = Math.hypot(carPos.x - this.arenaCenter.x, carPos.z - this.arenaCenter.z);
    if (this.state === 'dead') return;
    if (this.state === 'dormant') {
      if (fromArena < this.arenaRadius && !car.wrecked) this.#wake();
      return;
    }
    if (this.state === 'dying') {
      this.timer += dt;
      const ground = terrain.height(this.pos.x, this.pos.z) + 1;
      this.pos.y = Math.max(ground, this.pos.y - (6 + this.timer * 12) * dt); // falls out of the sky
      if (this.timer > 2.6 && !this.exploded) this.#explode();
      return;
    }
    if (this.state === 'waking') {
      this.timer += dt;
      this.pos.y += 8 * dt; // takes off
      if (this.timer > 2.2) { this.state = 'fight'; this.mode = 'circle'; }
      this.#syncBody();
      return;
    }
    if (car.wrecked || fromArena > B.leash) {
      // She goes back to her nest and heals.
      this.mode = 'circle';
      this.swoop = this.perch = null;
      this.hp = Math.min(B.health, this.hp + B.health * 0.05 * dt);
      this.#flyTo(this.arenaCenter.clone().setY(this.arenaCenter.y + 2.5), 20, dt);
      if (this.hp >= B.health && this.pos.distanceTo(this.arenaCenter) < 4) { this.state = 'dormant'; this.ctx.hud.bossBar(null); }
      this.#syncBody();
      return;
    }

    const frac = this.hp / B.health;
    const enraged = frac < 0.5;
    const rate = enraged ? 1.4 : 1;
    for (const k in this.cd) this.cd[k] -= dt * rate;
    this.timer += dt;
    const ground = this.arenaCenter.y;

    if (this.mode === 'circle') {
      this.angle += dt * 0.35 * rate;
      const want = new THREE.Vector3(this.arenaCenter.x + Math.sin(this.angle) * 50, ground + 22 + Math.sin(this.timer) * 2, this.arenaCenter.z + Math.cos(this.angle) * 50);
      this.#flyTo(want, 24, dt);
      this.#face(carPos, 2 * dt);
      if (this.cd.swoop <= 0) this.#startSwoop(carPos);
      else if (this.cd.shriek <= 0) { this.mode = 'shriek'; this.timer = 0; }
      else if (this.cd.flock <= 0) this.#flock();
      else if (this.cd.perch <= 0 && this.spires.length) {
        this.cd.perch = 18;
        const sp = this.spires.reduce((a, b) => (Math.hypot(a.x - carPos.x, a.z - carPos.z) < Math.hypot(b.x - carPos.x, b.z - carPos.z) ? b : a)); // the far one
        this.perch = { x: sp.x, y: sp.top + 0.5, z: sp.z, t: 0 };
        this.mode = 'perch';
      }
    } else if (this.mode === 'swoop') {
      const S = this.swoop;
      S.t += dt;
      // Down the line through where you were, low over the ground, and back up.
      const k = Math.min(1, S.t / S.time);
      const p = S.from.clone().lerp(S.to, k);
      p.y = THREE.MathUtils.lerp(S.from.y, terrain.height(p.x, p.z) + 2.2, Math.sin(k * Math.PI)) ;
      this.pos.copy(p);
      this.yaw = Math.atan2(S.to.x - S.from.x, S.to.z - S.from.z);
      if (!S.hit && !car.wrecked && this.pos.distanceTo(carPos) < 5.5) {
        S.hit = true;
        car.takeDamage(B.swoopDamage, this.pos.clone());
        car.grabPart(this.pos.clone(), 0);
        if (enraged) car.grabPart(this.pos.clone(), 0);
        car.nudge(Math.sin(this.yaw) * 9, Math.cos(this.yaw) * 9);
        this.ctx.hud.toast('The Harpy Queen ripped parts off your car!', 'bad');
        this.ctx.audio.claw();
        this.ctx.chase.addShake(0.8);
      }
      if (k >= 1) { this.mode = 'circle'; this.swoop = null; }
    } else if (this.mode === 'shriek') {
      this.#face(carPos, 2 * dt);
      this.pos.y += Math.sin(this.timer * 8) * 0.05;
      if (this.timer > 1.0 && !this.wave) {
        this.wave = { x: this.pos.x, z: this.pos.z, r: 4, hit: false };
        this.ring.position.set(this.pos.x, terrain.height(this.pos.x, this.pos.z) + 0.3, this.pos.z);
        this.ring.visible = true;
        this.ctx.audio.roar?.();
        this.ctx.chase.addShake(0.7);
        this.ctx.onShriek?.(); // (rocks come down the walls)
        this.cd.shriek = 10;
        this.mode = 'circle';
      }
    } else if (this.mode === 'perch') {
      const P = this.perch;
      if (P.t === 0 && this.pos.distanceTo(new THREE.Vector3(P.x, P.y, P.z)) > 1.5) this.#flyTo(new THREE.Vector3(P.x, P.y, P.z), 26, dt);
      else {
        P.t += dt;
        this.pos.set(P.x, P.y, P.z);
        this.#face(carPos, 1.5 * dt);
        if (P.t > 5) { this.mode = 'circle'; this.perch = null; this.cd.swoop = Math.min(this.cd.swoop, 0.5); }
      }
    }

    // The shriek's shockwave
    if (this.wave) {
      this.wave.r += 24 * dt;
      const wd = Math.hypot(carPos.x - this.wave.x, carPos.z - this.wave.z);
      if (!this.wave.hit && Math.abs(wd - this.wave.r) < 2.5 && car.grounded && !car.wrecked) {
        this.wave.hit = true;
        car.takeDamage(B.shriekDamage, carPos.clone().add(new THREE.Vector3(this.wave.x - carPos.x, 0, this.wave.z - carPos.z).normalize().multiplyScalar(1.5)));
        car.nudge(((carPos.x - this.wave.x) / (wd || 1)) * 10, ((carPos.z - this.wave.z) / (wd || 1)) * 10);
      }
      if (this.wave.r > B.shriekRadius) { this.wave = null; this.ring.visible = false; }
    }
    this.#syncBody();
    this.ctx.hud.bossBar(this.name, frac, enraged);
  }

  #startSwoop(carPos) {
    this.cd.swoop = 5.5;
    const lv = this.ctx.car.body.linvel();
    const aim = carPos.clone().add(new THREE.Vector3(lv.x, 0, lv.z).multiplyScalar(0.6)); // leads you a little
    const dir = aim.clone().sub(this.pos).setY(0);
    const len = dir.length() + 40;
    dir.normalize();
    const to = this.pos.clone().addScaledVector(dir, len).setY(this.arenaCenter.y + 20);
    this.swoop = { from: this.pos.clone(), to, t: 0, time: len / this.B.swoopSpeed, hit: false };
    this.mode = 'swoop';
    this.ctx.audio.roar?.(0.5);
  }

  #flock() {
    this.cd.flock = 16;
    const { demons, hud } = this.ctx;
    for (let i = 0; i < 2; i++) {
      const a = this.angle + i * Math.PI;
      demons.spawnPack(new THREE.Vector3(this.arenaCenter.x + Math.sin(a) * 40, 0, this.arenaCenter.z + Math.cos(a) * 40), 5, 'harpy');
    }
    hud.toast(`${this.name} calls her flock!`, 'warn');
    this.ctx.audio.roar?.(0.4);
  }

  #flyTo(target, speed, dt) {
    const d = target.clone().sub(this.pos);
    const len = d.length();
    if (len > 0.01) this.pos.addScaledVector(d, Math.min(1, (speed * dt) / len));
    if (Math.hypot(d.x, d.z) > 1) this.yaw = turn(this.yaw, Math.atan2(d.x, d.z), 3 * dt);
  }

  #face(target, maxTurn) { this.yaw = turn(this.yaw, Math.atan2(target.x - this.pos.x, target.z - this.pos.z), maxTurn); }

  #syncBody() { this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + 1.5, z: this.pos.z }); }

  #wake() {
    if (this.state !== 'dormant') return;
    this.state = 'waking';
    this.timer = 0;
    this.ctx.hud.toast(`${this.name.toUpperCase()} TAKES FLIGHT!`, 'warn');
    this.ctx.hud.bossBar(this.name, this.hp / this.B.health, false);
    this.ctx.audio.roar?.();
    this.ctx.chase.addShake(0.8);
  }

  #die() {
    this.ctx.onDying?.();
    this.state = 'dying';
    this.timer = 0;
    this.exploded = false;
    this.swoop = this.perch = this.wave = null;
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
    const colors = [L.feather ?? 0x2a1a3a, L.skin ?? 0x9aa0a8, L.hair ?? 0xe8e4dc, 0x7a1010];
    for (let k = 0; k < 4; k++) this.ctx.gore.explode(this.pos.clone().setY(this.pos.y + 1 + k), new THREE.Vector3((Math.random() - 0.5) * 12, 8, (Math.random() - 0.5) * 12), colors, 4);
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
    this.matSkin.emissive.setRGB(this.flash * 0.8, this.flash * 0.3, this.flash * 0.4);
    // Wings: folded when she sits, beating when she flies, swept back in a swoop
    const sitting = this.state === 'dormant' || (this.mode === 'perch' && this.perch?.t > 0) || this.state === 'dying';
    const swooping = this.mode === 'swoop';
    const beat = sitting ? 0 : swooping ? 0.15 : 0.7;
    this.flap += dt * (swooping ? 4 : 7);
    for (const [i, w] of this.wings.entries()) {
      const s = i ? -1 : 1;
      const want = sitting ? s * -1.2 : s * (Math.sin(this.flap) * beat + (swooping ? -0.2 : 0.15));
      w.rotation.z += (want - w.rotation.z) * Math.min(1, dt * 10);
      w.rotation.y += ((sitting ? s * 0.9 : swooping ? s * 0.6 : 0) - w.rotation.y) * Math.min(1, dt * 6);
    }
    this.body3d.rotation.x += ((swooping ? 0.9 : this.mode === 'shriek' ? -0.3 : sitting ? 0 : 0.25) - this.body3d.rotation.x) * Math.min(1, dt * 5);
    this.jaw.rotation.x = this.mode === 'shriek' ? 0.6 + Math.sin(now * 30) * 0.1 : 0.1;
    if (this.state === 'dying') this.root.rotation.z += dt * 4;
    for (const [i, h] of this.hair.entries()) h.rotation.x = 0.3 + Math.sin(now * 3 + i) * 0.15 + (swooping ? 0.5 : 0);
    if (this.wave) {
      this.ring.scale.setScalar(this.wave.r);
      this.ring.material.opacity = 0.8 * (1 - this.wave.r / this.B.shriekRadius);
    }
  }

  // ------------------------------------------------------------------ model
  #buildModel(scene) {
    const L = { skin: 0x9aa0a8, dark: 0x1a1420, feather: 0x2a1a3a, hair: 0xe8e4dc, glow: 0xff3040, eye: 0xffe060, bone: 0xd8cbb0, ...this.cfg.look };
    this.matSkin = litMaterial({ color: L.skin, flatShading: true, roughness: 0.7 });
    const feather = litMaterial({ color: L.feather, flatShading: true, roughness: 0.8, side: THREE.DoubleSide });
    const feather2 = litMaterial({ color: new THREE.Color(L.feather).lerp(new THREE.Color(0x6a3a8a), 0.4), flatShading: true, roughness: 0.8, side: THREE.DoubleSide });
    const dark = litMaterial({ color: L.dark, flatShading: true, roughness: 0.6 });
    const hairMat = litMaterial({ color: L.hair, flatShading: true, roughness: 0.9 });
    const bone = litMaterial({ color: L.bone, flatShading: true });
    const eye = new THREE.MeshBasicMaterial({ color: L.eye });
    const glowM = new THREE.MeshBasicMaterial({ color: L.glow });
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
    body.position.y = 2;
    root.add(body);
    this.body3d = body;
    // Gaunt torso and feathered hips
    add(body, new THREE.BoxGeometry(1.8, 2.6, 1.3), this.matSkin, 0, 1.0, 0);
    for (let r = 0; r < 4; r++) add(body, new THREE.BoxGeometry(1.7, 0.12, 0.1), dark, 0, 0.3 + r * 0.45, 0.66); // ribs
    add(body, new THREE.BoxGeometry(2.0, 1.4, 1.5), feather, 0, -0.6, 0);
    add(body, new THREE.IcosahedronGeometry(0.35, 0), glowM, 0, 1.4, 0.68);           // a cursed red gem on her chest
    // Tail fan
    for (let k = -2; k <= 2; k++) {
      const t = add(body, new THREE.BoxGeometry(0.4, 0.08, 3), k % 2 ? feather : feather2, k * 0.35, -0.9, -2);
      t.rotation.y = k * 0.18;
      t.rotation.x = 0.3;
    }
    // Head: hag face, glowing eyes, a jaw for shrieking, a crown of bones, and a wild mane of white hair
    const head = new THREE.Group();
    head.position.set(0, 2.9, 0.2);
    body.add(head);
    add(head, new THREE.BoxGeometry(1.2, 1.3, 1.1), this.matSkin, 0, 0.3, 0.1);
    add(head, new THREE.ConeGeometry(0.16, 0.6, 4), this.matSkin, 0, 0.25, 0.85).rotation.x = Math.PI / 2 + 0.4; // hooked nose
    for (const s of [-1, 1]) add(head, new THREE.BoxGeometry(0.28, 0.16, 0.08), eye, s * 0.3, 0.55, 0.68);
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.2, 0.2);
    head.add(jaw);
    this.jaw = jaw;
    add(jaw, new THREE.BoxGeometry(1.0, 0.35, 0.8), dark, 0, -0.15, 0.3);
    for (let k = 0; k < 7; k++) add(head, new THREE.ConeGeometry(0.1, 0.9, 4), bone, -0.75 + k * 0.25, 1.35 + (k % 2) * 0.2, -0.1);
    this.hair = [];
    for (let k = 0; k < 10; k++) {
      const h = add(head, new THREE.BoxGeometry(0.25, 2.6, 0.18), hairMat, -0.6 + (k % 5) * 0.3, 0.6, -0.4 - Math.floor(k / 5) * 0.2);
      h.geometry.translate(0, -1.2, 0);
      this.hair.push(h);
    }
    // Wings: huge, made of long feathers, pivoting at the shoulders
    this.wings = [];
    for (const s of [1, -1]) {
      const w = new THREE.Group();
      w.position.set(s * 0.9, 2.0, 0);
      body.add(w);
      add(w, new THREE.BoxGeometry(5.5, 0.3, 0.4), this.matSkin, s * 2.75, 0, 0);       // arm
      for (let k = 0; k < 9; k++) {
        const len = 4.2 - Math.abs(k - 3) * 0.35;
        const f = add(w, new THREE.BoxGeometry(0.75, 0.08, len), k % 2 ? feather : feather2, s * (0.5 + k * 0.65), -0.05, -len / 2 + 0.2);
        f.rotation.y = -s * (k * 0.06);
      }
      for (let c = 0; c < 3; c++) add(w, new THREE.ConeGeometry(0.1, 0.6, 4), bone, s * 5.6, 0, 0.2 + c * 0.2).rotation.x = Math.PI / 2; // wing claws
      this.wings.push(w);
    }
    // Bird legs with big talons
    for (const s of [1, -1]) {
      add(body, new THREE.BoxGeometry(0.4, 1.4, 0.4), feather, s * 0.5, -1.6, 0);
      add(body, new THREE.BoxGeometry(0.18, 1.2, 0.18), dark, s * 0.5, -2.7, 0.15);
      for (const dx of [-0.2, 0, 0.2]) add(body, new THREE.ConeGeometry(0.08, 0.7, 4), dark, s * 0.5 + dx, -3.3, 0.55).rotation.x = Math.PI / 2 + 0.6;
    }
    root.position.copy(this.arenaCenter);
  }
}

function turn(a, b, max) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + THREE.MathUtils.clamp(d, -max, max);
}
