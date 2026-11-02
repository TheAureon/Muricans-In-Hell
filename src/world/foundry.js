// THE IRON FOUNDRY'S MACHINERY. Everything is read from the region file:
//  turrets   gun towers that fire bursts of shells at you. Shoot them down
//            (they count as kills). Radar Jammers make them miss.
//  belts     conveyor belts: drive onto one and it carries you along.
//  crushers  giant pistons over the belts that slam down on a rhythm.
//            Watch the red light and time your run.
//  rails     tracks with runaway ore carts rolling back and forth.
//  magnets   electromagnet towers that switch on and off and pull your car
//            in: the more parts bolted on, the harder. Degaussers help.
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';
import { SETTINGS } from '../settings.js';
import { terrain } from './terrain.js';
import { raySphere } from '../demons/demons.js';

const UP = new THREE.Vector3(0, 1, 0);

export class Foundry {
  constructor(scene, physics, region, fx) {
    this.scene = scene;
    this.fx = fx; // { projectiles, audio, gore, sparks, chase, hud, onTurretKilled }
    this.time = 0;
    const { RAPIER, world } = physics;
    this.RAPIER = RAPIER;
    this.world = world;
    this.fixedBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.mat = {
      steel: litMaterial({ color: 0x7e8088, flatShading: true, roughness: 0.5, metalness: 0.6 }),
      dark: litMaterial({ color: 0x3a3a42, flatShading: true, roughness: 0.7, metalness: 0.4 }),
      rust: litMaterial({ color: 0x6a3a22, flatShading: true, roughness: 0.9 }),
      hazard: litMaterial({ color: 0xe0b020, flatShading: true, roughness: 0.6 }),
      ore: litMaterial({ color: 0xffa030, emissive: 0xff7010, emissiveIntensity: 1.2, flatShading: true }),
    };
    this.turrets = (region.turrets || []).map((p) => this.#turret(p));
    this.belts = (region.belts || []).map((b) => this.#belt(b));
    this.crushers = (region.crushers || []).map((c) => this.#crusher(c));
    this.carts = [];
    for (const r of region.rails || []) this.#rail(r);
    this.magnets = (region.magnets || []).map((m) => this.#magnet(m));
  }

  // Back to how it all started (after a wreck): every turret rebuilt.
  reset() {
    for (const t of this.turrets) {
      t.alive = true;
      t.hp = SETTINGS.foundry.turretHp;
      t.head.visible = true;
      t.cd = 1 + Math.random() * 2;
    }
  }

  // ------------------------------------------------------------------ physics
  fixedUpdate(dt, car) {
    const F = SETTINGS.foundry;
    this.time += dt;
    const t = car.body.translation();
    const carPos = car.currPos;
    let shiftX = 0, shiftZ = 0;
    this.onBelt = null;
    this.pulled = null;

    // Turrets: turn to face you, fire bursts.
    for (const tr of this.turrets) {
      if (!tr.alive) continue;
      const dx = carPos.x - tr.pos.x, dz = carPos.z - tr.pos.z, d = Math.hypot(dx, dz);
      if (d > F.turretRange || car.wrecked) continue;
      const want = Math.atan2(dx, dz);
      let dy = want - tr.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      tr.yaw += THREE.MathUtils.clamp(dy, -2.5 * dt, 2.5 * dt);
      tr.cd -= dt;
      if (tr.cd <= 0 && Math.abs(dy) < 0.3) {
        tr.shots = (tr.shots || 0) + 1;
        tr.cd = tr.shots % F.turretBurst === 0 ? F.turretPause : F.turretInterval;
        const muzzle = tr.pos.clone().add(new THREE.Vector3(Math.sin(tr.yaw) * 2, 0.2, Math.cos(tr.yaw) * 2));
        const miss = F.turretMiss + (car.stats.jammers || 0) * F.jammerMiss;
        this.fx.projectiles.throwAt('shell', muzzle, F.turretDamage, 1.5, THREE.MathUtils.clamp(d / 70, 0.3, 1.1), null, miss);
        tr.recoil = 1;
        this.fx.audio.gunshot();
      }
    }

    // Conveyor belts carry you along.
    for (const b of this.belts) {
      const px = t.x - b.ax, pz = t.z - b.az;
      const along = px * b.tx + pz * b.tz, across = px * b.tz - pz * b.tx;
      if (along > 0 && along < b.len && Math.abs(across) < b.width / 2 && t.y < terrain.height(t.x, t.z) + 1.2) {
        shiftX += b.tx * b.speed * dt;
        shiftZ += b.tz * b.speed * dt;
        this.onBelt = b;
      }
    }

    // Magnets pull you in (more parts = more metal = harder).
    for (const m of this.magnets) {
      const phase = (this.time + m.offset) % (F.magnetOn + F.magnetOff);
      m.on = phase < F.magnetOn;
      m.warm = !m.on && phase > F.magnetOn + F.magnetOff - 0.9; // warning glow
      if (!m.on || car.wrecked) continue;
      const dx = m.x - t.x, dz = m.z - t.z, d = Math.hypot(dx, dz);
      if (d > m.radius || d < 5) continue;
      const shield = Math.min(1, (car.stats.degaussers || 0) * F.degausserShield);
      const pull = (F.magnetPull + car.stats.count * F.magnetPerPart) * (1 - shield) * Math.sqrt(1 - d / m.radius);
      shiftX += (dx / d) * pull * dt;
      shiftZ += (dz / d) * pull * dt;
      if (pull > 0.5) this.pulled = m;
    }
    if ((shiftX || shiftZ) && !car.wrecked) {
      car.body.setTranslation({ x: t.x + shiftX, y: t.y, z: t.z + shiftZ }, true);
      car.currPos.x += shiftX; car.currPos.z += shiftZ;
    }

    // Crushers: up... up... SLAM.
    for (const c of this.crushers) {
      const P = c.period, ph = ((this.time + c.offset) % P) / P;
      let y;
      if (ph < 0.55) y = c.top;                                          // waiting at the top
      else if (ph < 0.6) y = c.top * (1 - (ph - 0.55) / 0.05);            // SLAM
      else if (ph < 0.72) y = 0;                                         // down
      else y = c.top * ((ph - 0.72) / 0.28);                             // rising
      c.warn = ph > 0.38 && ph < 0.6;
      const slamming = ph >= 0.55 && ph < 0.62;
      c.y = y;
      c.body.setNextKinematicTranslation({ x: c.x, y: c.ground + y + 1, z: c.z });
      if (!slamming) { c.hit = false; continue; }
      if (c.hit || y > 1.6 || car.wrecked) continue;
      const lx = (t.x - c.x) * Math.cos(c.yaw) - (t.z - c.z) * Math.sin(c.yaw), lz = (t.x - c.x) * Math.sin(c.yaw) + (t.z - c.z) * Math.cos(c.yaw);
      if (Math.abs(lx) < c.half + 1 && Math.abs(lz) < c.half + 1) {
        c.hit = true;
        car.takeDamage(F.crusherDamage, new THREE.Vector3(t.x, t.y + 1.5, t.z));
        car.takeDamage(F.crusherDamage * 0.5, new THREE.Vector3(t.x, t.y + 1.5, t.z));
        this.fx.chase.addShake(1);
        this.fx.audio.wreck();
      }
      if (ph < 0.6 && ph + dt / P >= 0.6) { this.fx.audio.thump(); this.fx.chase.addShake(Math.max(0, 0.6 - Math.hypot(t.x - c.x, t.z - c.z) / 80)); }
    }

    // Ore carts roll back and forth along their rails.
    for (const k of this.carts) {
      k.s += k.dir * F.cartSpeed * dt;
      if (k.s > k.rail.len - 2) { k.s = k.rail.len - 2; k.dir = -1; }
      if (k.s < 2) { k.s = 2; k.dir = 1; }
      const r = k.rail;
      k.x = r.ax + r.tx * k.s; k.z = r.az + r.tz * k.s;
      k.body.setNextKinematicTranslation({ x: k.x, y: r.ground + 1.0, z: k.z });
      k.cd -= dt;
      if (k.cd > 0 || car.wrecked) continue;
      if (Math.hypot(t.x - k.x, t.z - k.z) < 3.2) {
        k.cd = 1;
        car.takeDamage(F.cartDamage, new THREE.Vector3(k.x, t.y, k.z));
        car.nudge(r.tx * k.dir * 10, r.tz * k.dir * 10);
        this.fx.chase.addShake(0.6);
        this.fx.audio.thump();
      }
    }
  }

  // ------------------------------------------------------------------ visuals
  update(dt) {
    for (const b of this.belts) b.tex.offset.y -= (b.speed / 4) * dt; // the belt surface moves
    for (const tr of this.turrets) {
      if (!tr.alive) continue;
      tr.head.rotation.y = tr.yaw;
      tr.recoil = Math.max(0, (tr.recoil || 0) - dt * 6);
      tr.barrels.position.z = 0.8 - tr.recoil * 0.3;
    }
    for (const c of this.crushers) {
      c.head.position.y = c.y + 1;
      c.light.color.setHex(c.warn && Math.sin(this.time * 25) > 0 ? 0xff2010 : 0x401008);
    }
    for (const k of this.carts) { k.mesh.position.set(k.x, k.rail.ground, k.z); }
    for (const m of this.magnets) {
      const glow = m.on ? 1.6 + Math.sin(this.time * 30) * 0.3 : m.warm ? 0.6 + Math.sin(this.time * 20) * 0.4 : 0.05;
      m.coilMat.emissiveIntensity = glow;
      if (m.on && Math.random() < dt * 12) {
        const a = Math.random() * Math.PI * 2;
        this.fx.sparks.spawn(new THREE.Vector3(m.x + Math.cos(a) * 1.5, m.ground + 13 + Math.random() * 2, m.z + Math.sin(a) * 1.5),
          new THREE.Vector3(Math.cos(a) * 3, 1 + Math.random() * 3, Math.sin(a) * 3), 0.1, 0.4);
      }
    }
  }

  // ------------------------------------------------------------------ building
  #add(parent, geo, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  #collider(desc, x, y, z, yaw = 0) {
    desc.setTranslation(x, y, z).setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
    this.world.createCollider(desc, this.fixedBody);
  }

  #turret([x, z]) {
    const F = SETTINGS.foundry, g = terrain.height(x, z);
    const tower = new THREE.Group();
    tower.position.set(x, g, z);
    this.scene.add(tower);
    this.#add(tower, new THREE.BoxGeometry(2.4, 4.5, 2.4), this.mat.dark, 0, 2.25, 0);
    this.#add(tower, new THREE.BoxGeometry(3.2, 0.4, 3.2), this.mat.hazard, 0, 4.6, 0);
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) this.#add(tower, new THREE.BoxGeometry(0.3, 4.5, 0.3), this.mat.steel, a * 1.3, 2.25, b * 1.3);
    const head = new THREE.Group();
    head.position.y = 5.4;
    tower.add(head);
    this.#add(head, new THREE.CylinderGeometry(1.0, 1.2, 1.2, 8), this.mat.steel);
    this.#add(head, new THREE.BoxGeometry(0.5, 0.3, 0.2), new THREE.MeshBasicMaterial({ color: 0xff2020 }), 0, 0.25, 0.95); // red eye
    const barrels = new THREE.Group();
    barrels.position.set(0, 0.1, 0.8);
    head.add(barrels);
    for (const s of [-0.3, 0.3]) this.#add(barrels, new THREE.CylinderGeometry(0.14, 0.14, 1.8, 6).rotateX(Math.PI / 2), this.mat.dark, s, 0, 0.7);
    this.#collider(this.RAPIER.ColliderDesc.cuboid(1.3, 2.4, 1.3), x, g + 2.4, z);
    const tr = {
      isTarget: true, kind: 'turret', alive: true, hp: F.turretHp, cd: 1 + Math.random() * 2, yaw: Math.random() * 6,
      pos: new THREE.Vector3(x, g + 5.4, z), head, barrels,
      raycast: (o, dir) => { const t = raySphere(o, dir, tr.pos, 1.8); return t === null ? null : { t, point: o.clone().addScaledVector(dir, t) }; },
      distanceTo: (p) => Math.max(0, tr.pos.distanceTo(p) - 1.5),
      takeHit: (amount, source) => {
        if (!tr.alive) return false;
        tr.hp -= amount;
        this.fx.sparks.spawn(tr.pos.clone(), new THREE.Vector3((Math.random() - 0.5) * 4, 3, (Math.random() - 0.5) * 4), 0.1, 0.3);
        if (tr.hp > 0) return false;
        tr.alive = false;
        head.visible = false;
        this.fx.gore.explode(tr.pos.clone(), new THREE.Vector3(0, 6, 0), [0x5a5c62, 0x24242a, 0xffa030, 0xe0b020], 1.6);
        for (let i = 0; i < 20; i++) this.fx.sparks.spawn(tr.pos.clone(), new THREE.Vector3((Math.random() - 0.5) * 10, 3 + Math.random() * 6, (Math.random() - 0.5) * 10), 0.12, 0.6);
        this.fx.audio.wreck();
        this.fx.onTurretKilled?.(tr, source);
        return true;
      },
    };
    return tr;
  }

  #belt(b) {
    const [ax, az] = b.from, [bx, bz] = b.to;
    const len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len;
    const g = terrain.height((ax + bx) / 2, (az + bz) / 2);
    // A striped belt texture (chevrons pointing the way it moves)
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 64;
    const c2 = cv.getContext('2d');
    c2.fillStyle = '#2a2a2e'; c2.fillRect(0, 0, 64, 64);
    c2.strokeStyle = '#4a4a50'; c2.lineWidth = 6;
    c2.beginPath(); c2.moveTo(4, 44); c2.lineTo(32, 18); c2.lineTo(60, 44); c2.stroke();
    c2.fillStyle = '#1a1a1e'; c2.fillRect(0, 60, 64, 4);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, len / b.width);
    tex.colorSpace = THREE.SRGBColorSpace;
    const belt = new THREE.Mesh(new THREE.PlaneGeometry(b.width, len).rotateX(-Math.PI / 2), litMaterial({ map: tex, roughness: 0.8 }));
    belt.position.set((ax + bx) / 2, g + 0.06, (az + bz) / 2);
    belt.rotation.y = Math.atan2(tx, tz);
    belt.receiveShadow = true;
    this.scene.add(belt);
    // Low steel edges with hazard stripes
    for (const s of [-1, 1]) {
      const edge = this.#add(this.scene, new THREE.BoxGeometry(0.5, 0.35, len), s > 0 ? this.mat.hazard : this.mat.steel,
        (ax + bx) / 2 + tz * s * (b.width / 2 + 0.25), g + 0.17, (az + bz) / 2 - tx * s * (b.width / 2 + 0.25));
      edge.rotation.y = Math.atan2(tx, tz);
    }
    return { ax, az, tx, tz, len, width: b.width, speed: b.speed, tex };
  }

  #crusher(c) {
    const g = terrain.height(c.x, c.z), half = c.size ?? 3.5, top = 7;
    const frame = new THREE.Group();
    frame.position.set(c.x, g, c.z);
    frame.rotation.y = c.yaw || 0;
    this.scene.add(frame);
    for (const s of [-1, 1]) {
      this.#add(frame, new THREE.BoxGeometry(1.4, 12, 1.4), this.mat.dark, s * (half + 1.6), 6, 0);
      const off = new THREE.Vector3(s * (half + 1.6), 0, 0).applyAxisAngle(UP, c.yaw || 0);
      this.#collider(this.RAPIER.ColliderDesc.cuboid(0.7, 6, 0.7), c.x + off.x, g + 6, c.z + off.z, c.yaw || 0);
    }
    this.#add(frame, new THREE.BoxGeometry(half * 2 + 4.6, 1.4, 1.8), this.mat.hazard, 0, 12.4, 0);
    const light = new THREE.MeshBasicMaterial({ color: 0x401008 });
    this.#add(frame, new THREE.SphereGeometry(0.5, 8, 6), light, 0, 13.4, 0);
    const head = new THREE.Group();
    frame.add(head);
    this.#add(head, new THREE.BoxGeometry(half * 2, 2, half * 2), this.mat.steel, 0, 0, 0);
    for (let k = -1; k <= 1; k += 2) this.#add(head, new THREE.BoxGeometry(half * 2 + 0.1, 0.4, 0.5), this.mat.hazard, 0, 0.6, k * half * 0.6);
    this.#add(head, new THREE.CylinderGeometry(0.6, 0.6, 10, 8), this.mat.dark, 0, 6, 0);              // piston rod
    const body = this.world.createRigidBody(this.RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(c.x, g + top + 1, c.z)
      .setRotation({ x: 0, y: Math.sin((c.yaw || 0) / 2), z: 0, w: Math.cos((c.yaw || 0) / 2) }));
    this.world.createCollider(this.RAPIER.ColliderDesc.cuboid(half, 1, half), body);
    return { x: c.x, z: c.z, yaw: c.yaw || 0, ground: g, half, top, period: c.period ?? 3.6, offset: c.offset ?? Math.random() * 3, head, light, body, y: top };
  }

  #rail(r) {
    const [ax, az] = r.from, [bx, bz] = r.to;
    const len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len, yaw = Math.atan2(tx, tz);
    const ground = terrain.height((ax + bx) / 2, (az + bz) / 2);
    const rail = { ax, az, tx, tz, len, ground };
    for (const s of [-0.7, 0.7]) {
      const m = this.#add(this.scene, new THREE.BoxGeometry(0.18, 0.2, len), this.mat.steel, (ax + bx) / 2 + tz * s, ground + 0.15, (az + bz) / 2 - tx * s);
      m.rotation.y = yaw;
    }
    const n = Math.floor(len / 1.4);
    const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.12, 0.4), this.mat.rust, n);
    const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) { d.position.set(ax + tx * i * 1.4, ground + 0.05, az + tz * i * 1.4); d.rotation.y = yaw; d.updateMatrix(); sleepers.setMatrixAt(i, d.matrix); }
    sleepers.receiveShadow = true;
    this.scene.add(sleepers);
    for (let k = 0; k < (r.carts ?? 2); k++) {
      const mesh = new THREE.Group();
      mesh.rotation.y = yaw;
      this.scene.add(mesh);
      this.#add(mesh, new THREE.BoxGeometry(2.4, 1.5, 3.4), this.mat.rust, 0, 1.15, 0);
      this.#add(mesh, new THREE.BoxGeometry(2.0, 0.5, 3.0), this.mat.ore, 0, 2.0, 0);                  // glowing ore
      for (const [wx, wz] of [[1, 1.1], [-1, 1.1], [1, -1.1], [-1, -1.1]]) this.#add(mesh, new THREE.CylinderGeometry(0.35, 0.35, 0.2, 8).rotateZ(Math.PI / 2), this.mat.dark, wx * 0.9, 0.35, wz);
      const body = this.world.createRigidBody(this.RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(ax, ground + 1, az)
        .setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }));
      this.world.createCollider(this.RAPIER.ColliderDesc.cuboid(1.2, 0.8, 1.7), body);
      this.carts.push({ rail, mesh, body, s: 2 + (len - 4) * ((k + 0.5) / (r.carts ?? 2)), dir: k % 2 ? 1 : -1, cd: 0, x: ax, z: az });
    }
  }

  #magnet(m) {
    const g = terrain.height(m.x, m.z);
    const tower = new THREE.Group();
    tower.position.set(m.x, g, m.z);
    this.scene.add(tower);
    this.#add(tower, new THREE.CylinderGeometry(2.2, 3, 8, 8), this.mat.dark, 0, 4, 0);
    const coilMat = litMaterial({ color: 0xb06020, emissive: 0x40a0ff, emissiveIntensity: 0.05, flatShading: true, metalness: 0.5, roughness: 0.4 });
    for (let k = 0; k < 4; k++) this.#add(tower, new THREE.TorusGeometry(1.7, 0.45, 6, 14), coilMat, 0, 8.6 + k * 0.9, 0).rotation.x = Math.PI / 2;
    // The big horseshoe magnet on top: red, with steel tips
    const shoe = this.#add(tower, new THREE.TorusGeometry(2.4, 0.7, 6, 14, Math.PI), litMaterial({ color: 0xc8202a, flatShading: true, roughness: 0.5 }), 0, 13.6, 0);
    shoe.rotation.z = Math.PI;
    for (const s of [-1, 1]) this.#add(tower, new THREE.BoxGeometry(1.4, 1.2, 1.4), this.mat.steel, s * 2.4, 13.6, 0);
    this.#collider(this.RAPIER.ColliderDesc.cylinder(4, 2.8), m.x, g + 4, m.z);
    return { x: m.x, z: m.z, ground: g, radius: m.radius ?? 60, offset: m.offset ?? Math.random() * 7, coilMat, on: false, warm: false };
  }
}
