// THE MIRROR WASTES' MIRRORS.
//  MONOLITHS  tall standing mirrors along the canyon. Some are REAL (solid:
//             ram one hard, or shoot it, and it shatters) and some are only
//             REFLECTIONS (you drive straight through them). They look the
//             same. Now and then a real one spits out a MIRROR CLONE.
//  CLONES     a dark chrome copy of YOUR car (your build, your guns) that
//             hunts you: it rams you and shoots back. Uncommon.
//  PORTALS    framed teleport mirrors standing across the road: drive into
//             one and you come out of its partner, somewhere else.
// MirrorDriver is the "drives like a car" brain + body shared by the clones
// and the boss (The Reflection, a giant one).
import * as THREE from 'three';
import { SETTINGS } from '../settings.js';
import { terrain } from './terrain.js';
import { raySphere } from '../demons/demons.js';
import { mirrorMaterial } from './mirrorWorld.js';

// ======================================================================
//  A mirror copy of the car that drives on its own
// ======================================================================
export class MirrorDriver {
  constructor(scene, physics, car, { scale = 1, hp, speed, damage, fx }) {
    this.scene = scene;
    this.car = car;
    this.fx = fx; // { projectiles, gore, sparks, audio, chase }
    this.scale = scale;
    this.maxHp = hp;
    this.hp = hp;
    this.speed = speed;
    this.damage = damage;
    this.isTarget = true;
    this.alive = true;
    this.pos = new THREE.Vector3();
    this.prev = new THREE.Vector3();
    this.yaw = 0;
    this.vel = 0;
    this.flash = 0;
    this.ramCd = 0;
    this.gunCd = 1.5;
    this.chrome = mirrorMaterial(0x3a3a48, 0.08);
    this.glow = new THREE.MeshBasicMaterial({ color: 0x8a60ff });
    this.#copyCar();
    const { RAPIER, world } = physics;
    this.world = world;
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -200, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(1.1 * scale, 0.7 * scale, 2.3 * scale).setTranslation(0, 0.7 * scale, 0), this.body);
  }

  // The copy: your car as it is right now (your build, your guns), in dark
  // chrome, without its lights. (Call again to re-copy a changed build.)
  recopy() { this.scene.remove(this.root); this.#copyCar(); }
  #copyCar() {
    const car = this.car, scale = this.scale;
    this.root = car.model.root.clone(true);
    const strip = [];
    this.root.traverse((o) => {
      if (o.isLight) strip.push(o);
      else if (o.isMesh) {
        const basic = o.material?.isMeshBasicMaterial;
        o.material = basic ? this.glow : this.chrome;
        o.castShadow = true;
      }
    });
    for (const l of strip) l.parent?.remove(l);
    this.root.scale.setScalar(scale);
    this.scene.add(this.root);
    // Guns: as many as your car has (cannons fire missiles)
    this.guns = Math.max(1, car.turrets.filter((t) => t.weapon !== 'cannon').length);
    this.cannons = car.turrets.filter((t) => t.weapon === 'cannon').length;
  }

  place(x, z, yaw) {
    this.pos.set(x, terrain.height(x, z), z);
    this.prev.copy(this.pos);
    this.yaw = yaw;
    this.vel = 0;
  }

  raycast(o, dir) {
    if (!this.alive) return null;
    const t = raySphere(o, dir, this.pos.clone().setY(this.pos.y + 0.9 * this.scale), 2.2 * this.scale);
    return t === null ? null : { t, point: o.clone().addScaledVector(dir, t) };
  }
  distanceTo(p) { return Math.max(0, this.pos.distanceTo(p) - 2 * this.scale); }

  takeHit(amount) {
    if (!this.alive) return false;
    this.hp -= amount;
    this.flash = 1;
    if (this.hp <= 0) { this.shatter(); return true; }
    return false;
  }

  // Drive at the car: steer toward where it's going, don't climb walls or
  // drive off into a chasm, ram it, shoot at it.
  drive(dt, { aggression = 1, speedMul = 1 } = {}) {
    if (!this.alive) return;
    const car = this.car, tp = car.currPos;
    this.prev.copy(this.pos);
    this.flash = Math.max(0, this.flash - dt * 5);
    this.ramCd -= dt; this.gunCd -= dt;
    const lv = car.body.linvel();
    const aim = new THREE.Vector3(tp.x + lv.x * 0.5, 0, tp.z + lv.z * 0.5);
    let want = Math.atan2(aim.x - this.pos.x, aim.z - this.pos.z);
    // Look ahead: a wall or a chasm? Turn away from it.
    const look = 8 * this.scale + this.vel * 0.6;
    const ax = this.pos.x + Math.sin(this.yaw) * look, az = this.pos.z + Math.cos(this.yaw) * look;
    const hAhead = terrain.height(ax, az), hHere = terrain.height(this.pos.x, this.pos.z);
    if (hAhead > hHere + 3 || hAhead < hHere - 5) want = this.yaw + Math.PI * 0.6 * (Math.sin(this.pos.x * 0.1) > 0 ? 1 : -1);
    let d = want - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += THREE.MathUtils.clamp(d, -1.6 * dt, 1.6 * dt);
    const top = this.speed * speedMul * (Math.abs(d) > 1.2 ? 0.5 : 1);
    this.vel += THREE.MathUtils.clamp(top - this.vel, -20 * dt, 12 * dt);
    const nx = this.pos.x + Math.sin(this.yaw) * this.vel * dt, nz = this.pos.z + Math.cos(this.yaw) * this.vel * dt;
    const nh = terrain.height(nx, nz);
    if (nh < hHere + 2.5 && nh > hHere - 4) { this.pos.x = nx; this.pos.z = nz; this.pos.y = nh; } else this.vel *= 0.3;
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y, z: this.pos.z });
    this.body.setNextKinematicRotation({ x: 0, y: Math.sin(this.yaw / 2), z: 0, w: Math.cos(this.yaw / 2) });
    if (car.wrecked) return;

    // Ram
    const dist = Math.hypot(tp.x - this.pos.x, tp.z - this.pos.z);
    if (dist < 3.2 * this.scale + 1 && this.ramCd <= 0) {
      this.ramCd = 1.2;
      car.takeDamage(this.damage * (0.5 + this.vel / this.speed), this.pos.clone().setY(tp.y));
      car.nudge(Math.sin(this.yaw) * 7 * this.scale ** 0.5, Math.cos(this.yaw) * 7 * this.scale ** 0.5);
      this.fx.chase.addShake(0.4 * this.scale);
      this.fx.audio.thump();
      this.vel *= 0.4;
    }
    // Shoot (your own guns, turned on you)
    if (this.gunCd <= 0 && dist < 80 && dist > 6) {
      this.gunCd = (this.cannons ? 2.4 : 1.3) / aggression;
      const roof = this.pos.clone().setY(this.pos.y + 1.6 * this.scale);
      for (let g = 0; g < Math.min(4, this.guns); g++) {
        this.fx.projectiles.throwAt('shell', roof.clone().add(new THREE.Vector3((g - 1.5) * 0.6 * this.scale, 0, 0)), SETTINGS.mirror.shellDamage, 1.5, THREE.MathUtils.clamp(dist / 70, 0.3, 1.1), null, SETTINGS.mirror.shellMiss);
      }
      for (let c = 0; c < Math.min(2, this.cannons); c++) {
        this.fx.projectiles.throwAt('missile', roof.clone(), SETTINGS.mirror.shellDamage * 3, 4, THREE.MathUtils.clamp(dist / 30, 0.8, 2), null, 3);
      }
      this.fx.audio.gunshot();
    }
  }

  render(alpha) {
    this.root.position.lerpVectors(this.prev, this.pos, alpha);
    this.root.rotation.set(0, this.yaw, 0);
    this.chrome.emissive?.setRGB(this.flash * 0.6, this.flash * 0.4, this.flash * 0.9);
  }

  shatter() {
    this.alive = false;
    this.root.visible = false;
    this.body.setNextKinematicTranslation({ x: 0, y: -200, z: 0 });
    const at = this.pos.clone().setY(this.pos.y + 1 * this.scale);
    this.fx.gore.explode(at, new THREE.Vector3(0, 6, 0), [0xd8dce8, 0x8a8a9a, 0x3a3a48, 0x8a60ff], 1.5 * this.scale);
    for (let i = 0; i < 25; i++) this.fx.sparks.spawn(at, new THREE.Vector3((Math.random() - 0.5) * 12, 3 + Math.random() * 6, (Math.random() - 0.5) * 12), 0.12, 0.6);
    this.fx.audio.wreck();
  }

  dispose() {
    this.scene.remove(this.root);
    this.world.removeRigidBody(this.body);
  }
}

// ======================================================================
//  Monoliths, clones and portals
// ======================================================================
export class Mirrors {
  constructor(scene, physics, region, car, fx) {
    this.scene = scene;
    this.physics = physics;
    this.car = car;
    this.fx = fx; // { projectiles, gore, sparks, audio, chase, hud, onCloneKilled }
    const M = region.mirror;
    const { RAPIER, world } = physics;
    this.RAPIER = RAPIER;
    this.world = world;
    this.time = 0;
    // ---- Monoliths ----
    this.monoliths = [];
    const faceMat = mirrorMaterial(0xd0d4e0, 0.04);
    const frameMat = mirrorMaterial(0x2a2430, 0.3);
    const geoFace = new THREE.BoxGeometry(6, 14, 0.5).translate(0, 7, 0);
    const geoFrame = new THREE.BoxGeometry(6.8, 0.8, 1).translate(0, 14.2, 0);
    for (const [x, z, yaw, real] of M.monoliths) {
      if (!terrain.spawnable(x, z)) continue; // (not in a wall or a chasm)
      const g = new THREE.Group();
      g.position.set(x, terrain.height(x, z) - 0.3, z);
      g.rotation.y = yaw;
      const face = new THREE.Mesh(geoFace, faceMat);
      face.castShadow = true;
      g.add(face, new THREE.Mesh(geoFrame, frameMat));
      scene.add(g);
      const mono = { x, z, yaw, real, g, alive: true, hp: SETTINGS.mirror.monolithHp, isTarget: true, pos: new THREE.Vector3(x, g.position.y + 7, z), body: null };
      if (real) {
        mono.body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, g.position.y + 7, z).setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }));
        world.createCollider(RAPIER.ColliderDesc.cuboid(3, 7, 0.4), mono.body);
      }
      // Bullets: a real one cracks and shatters, a reflection just ripples and vanishes.
      mono.raycast = (o, dir) => { if (!mono.alive) return null; const t = raySphere(o, dir, mono.pos, 3.5); return t === null ? null : { t, point: o.clone().addScaledVector(dir, t) }; };
      mono.distanceTo = (p) => Math.max(0, mono.pos.distanceTo(p) - 3);
      mono.takeHit = (amount) => { if (!mono.alive) return false; mono.hp -= mono.real ? amount : 9999; if (mono.hp <= 0) this.#shatterMono(mono); return mono.hp <= 0; };
      this.monoliths.push(mono);
    }
    // ---- Portals (pairs) ----
    this.portals = [];
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xb080ff });
    const swirlMat = mirrorMaterial(0x9a80c8, 0.02, { emissive: 0x3a1a6a, emissiveIntensity: 0.6 });
    for (const [a, b] of M.portals) {
      const pa = this.#portal(a, rimMat, swirlMat), pb = this.#portal(b, rimMat, swirlMat);
      pa.to = pb; pb.to = pa;
      this.portals.push(pa, pb);
    }
    this.clones = [];
    this.cloneCd = 20;
  }

  // Everything you can shoot here (for the bullets)
  get targets() { return [...this.monoliths, ...this.clones]; }

  #portal([x, z, yaw], rimMat, swirlMat) {
    const g = new THREE.Group();
    const y = terrain.height(x, z);
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    const W = 14, H = 11;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H).translate(0, H / 2, 0), swirlMat);
    face.material.side = THREE.DoubleSide;
    g.add(face);
    for (const [px, py, sx, sy] of [[-W / 2, H / 2, 0.8, H], [W / 2, H / 2, 0.8, H], [0, H, W + 0.8, 0.8]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.8), rimMat);
      bar.position.set(px, py, 0);
      g.add(bar);
    }
    this.scene.add(g);
    // (the frame's posts are solid; the middle is the way through)
    const body = this.world.createRigidBody(this.RAPIER.RigidBodyDesc.fixed());
    for (const s of [-1, 1]) {
      const ox = Math.cos(yaw) * s * W / 2, oz = -Math.sin(yaw) * s * W / 2;
      this.world.createCollider(this.RAPIER.ColliderDesc.cuboid(0.5, H / 2, 0.5).setTranslation(x + ox, y + H / 2, z + oz), body);
    }
    return { x, z, y, yaw, nx: Math.sin(yaw), nz: Math.cos(yaw), half: W / 2 - 0.6, face, g };
  }

  fixedUpdate(dt) {
    const car = this.car, t = car.body.translation(), M = SETTINGS.mirror;
    this.time += dt;
    // ---- Teleport through a portal ----
    this.portalCd = Math.max(0, (this.portalCd || 0) - dt);
    if (!car.wrecked && this.portalCd <= 0) {
      for (const p of this.portals) {
        const rx = t.x - p.x, rz = t.z - p.z;
        const side = rx * p.nx + rz * p.nz, along = rx * p.nz - rz * p.nx;
        if (Math.abs(side) < 1.6 && Math.abs(along) < p.half && t.y < p.y + 6) {
          const q = p.to, v = car.body.linvel();
          const sp = Math.max(8, Math.hypot(v.x, v.z));
          const dirIn = Math.sign(v.x * p.nx + v.z * p.nz) || 1; // which way you went through
          const ox = q.x + q.nx * dirIn * 5, oz = q.z + q.nz * dirIn * 5;
          const yaw = Math.atan2(q.nx * dirIn, q.nz * dirIn);
          car.body.setTranslation({ x: ox, y: terrain.height(ox, oz) + 1, z: oz }, true);
          car.body.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, true);
          car.body.setLinvel({ x: q.nx * dirIn * sp, y: 0, z: q.nz * dirIn * sp }, true);
          car.capture(); car.capture();
          this.portalCd = 1.5;
          this.fx.audio.chime();
          this.fx.chase.initialized = false;
          this.onTeleport?.();
          break;
        }
      }
    }
    // ---- Ramming a real monolith shatters it; driving through a fake one ripples it ----
    for (const m of this.monoliths) {
      if (!m.alive) continue;
      const rx = t.x - m.x, rz = t.z - m.z;
      const side = rx * Math.sin(m.yaw) + rz * Math.cos(m.yaw), along = rx * Math.cos(m.yaw) - rz * Math.sin(m.yaw);
      if (Math.abs(side) < 2.5 && Math.abs(along) < 3.6) {
        if (!m.real) { this.#shatterMono(m, true); this.onFake?.(); }
        else if (car.lastCrash || Math.hypot(car.vBefore.x, car.vBefore.z) * 3.6 > M.shatterKmh) { this.#shatterMono(m); car.takeDamage(M.shatterDamage, m.pos.clone()); }
      }
    }
    // ---- Mirror clones (uncommon) ----
    this.cloneCd -= dt;
    if (this.cloneCd <= 0 && !car.wrecked && this.clones.filter((c) => c.alive).length < M.maxClones) {
      this.cloneCd = M.cloneEvery[0] + Math.random() * (M.cloneEvery[1] - M.cloneEvery[0]);
      const near = this.monoliths.filter((m) => m.alive && m.real && Math.hypot(m.x - t.x, m.z - t.z) < 90 && Math.hypot(m.x - t.x, m.z - t.z) > 25);
      if (near.length && Math.random() < M.cloneChance) this.spawnClone(near[Math.floor(Math.random() * near.length)]);
    }
    for (const c of this.clones) c.drive(dt);
    for (const c of [...this.clones]) {
      if (!c.alive && !c.counted) { c.counted = true; this.fx.onCloneKilled?.(c); }
      if (!c.alive && (c.gone = (c.gone || 0) + dt) > 3) { c.dispose(); this.clones.splice(this.clones.indexOf(c), 1); }
    }
  }

  spawnClone(m) {
    const M = SETTINGS.mirror;
    const c = new MirrorDriver(this.scene, this.physics, this.car, { scale: 1, hp: M.cloneHp, speed: M.cloneSpeed, damage: M.cloneDamage, fx: this.fx });
    const out = { x: Math.sin(m.yaw), z: Math.cos(m.yaw) };
    const toCar = (this.car.currPos.x - m.x) * out.x + (this.car.currPos.z - m.z) * out.z > 0 ? 1 : -1; // out of the face looking your way
    c.place(m.x + out.x * 4 * toCar, m.z + out.z * 4 * toCar, Math.atan2(out.x * toCar, out.z * toCar));
    this.clones.push(c);
    this.fx.hud.toast('Your reflection climbed out of the mirror!', 'bad');
    this.fx.audio.chime();
    this.onClone?.();
  }

  #shatterMono(m, fake = false) {
    m.alive = false;
    if (!fake) this.onShatter?.(m);
    m.g.visible = false;
    if (m.body) { this.world.removeRigidBody(m.body); m.body = null; }
    if (fake) {
      for (let i = 0; i < 20; i++) this.fx.sparks.spawn(m.pos.clone(), new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4), 0.1, 0.5);
      return;
    }
    this.fx.gore.explode(m.pos.clone(), new THREE.Vector3(0, 5, 0), [0xd8dce8, 0xa8acb8, 0x6a6a7a, 0xffffff], 2);
    this.fx.audio.wreck();
    this.fx.chase.addShake(0.4);
  }

  render(alpha, dt) {
    for (const c of this.clones) if (c.alive) c.render(alpha);
    for (const p of this.portals) p.face.material.emissiveIntensity = 0.5 + Math.sin(this.time * 3) * 0.3;
  }

  // After a wreck: every mirror back, every clone gone.
  reset() {
    for (const c of this.clones) c.dispose();
    this.clones = [];
    this.cloneCd = 20;
    for (const m of this.monoliths) {
      m.alive = true;
      m.g.visible = true;
      m.hp = SETTINGS.mirror.monolithHp;
      if (m.real && !m.body) {
        m.body = this.world.createRigidBody(this.RAPIER.RigidBodyDesc.fixed().setTranslation(m.x, m.pos.y, m.z).setRotation({ x: 0, y: Math.sin(m.yaw / 2), z: 0, w: Math.cos(m.yaw / 2) }));
        this.world.createCollider(this.RAPIER.ColliderDesc.cuboid(3, 7, 0.4), m.body);
      }
    }
  }
}
