// SCREAMING CANYON's hazards (the chasms and ledges are in terrain.js):
//  - SCREAMING WIND: every so often a gust howls across the canyon and
//    shoves your car sideways for a few seconds (much harder while you're
//    in the air: mind your jumps). A warning comes just before.
//  - ROCKSLIDES: boulders break off the canyon walls ahead of you, crash
//    down the slope and roll along the floor. Dodge them or get flattened.
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';
import { SETTINGS } from '../settings.js';
import { terrain } from './terrain.js';

const MAX_BOULDERS = 18;
const rnd = (a, b) => a + Math.random() * (b - a);

export class CanyonHazards {
  constructor(scene, region, fx) {
    this.fx = fx; // { dust, gore, audio, chase, demons }
    const mat = litMaterial({ color: region.palette.rock ?? 0x6a4030, flatShading: true, roughness: 0.95 });
    const geo = new THREE.IcosahedronGeometry(1, 0);
    this.boulders = [];
    for (let i = 0; i < MAX_BOULDERS; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.visible = false;
      scene.add(m);
      this.boulders.push({ m, alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), r: 2, life: 0 });
    }
    this.reset();
  }

  reset() {
    const C = SETTINGS.canyon;
    this.nextGust = rnd(...C.windEvery);
    this.gust = null;      // { dir, t, warn } while a gust is coming / blowing
    this.nextSlide = rnd(...C.slideEvery);
    for (const b of this.boulders) { b.alive = false; b.m.visible = false; }
  }

  get windWarning() { return this.gust && this.gust.t < this.gust.warn; }
  get windBlowing() { return this.gust && this.gust.t >= this.gust.warn; }

  fixedUpdate(dt, car) {
    const C = SETTINGS.canyon;
    const t = car.body.translation();
    if (car.wrecked) { this.gust = null; }

    // ---- Wind ----
    if (!this.gust && (this.nextGust -= dt) <= 0) {
      const dir = terrain.canyon.dirAt(t.x, t.z);
      const side = Math.random() < 0.5 ? 1 : -1;
      this.gust = { dir: { x: dir.z * side, z: -dir.x * side }, t: 0, warn: 1.2, end: 1.2 + C.windTime };
      this.fx.audio.roar?.(0.35); // the canyon screams
    }
    if (this.gust) {
      this.gust.t += dt;
      if (this.windBlowing && !car.wrecked) {
        const push = C.windPush * (car.grounded ? 1 : C.windAirMult) * dt;
        const nx = t.x + this.gust.dir.x * push, nz = t.z + this.gust.dir.z * push;
        // It can blow you toward a chasm, but never up a canyon wall.
        if (terrain.height(nx, nz) < terrain.height(t.x, t.z) + 0.15) {
          car.body.setTranslation({ x: nx, y: t.y, z: nz }, true);
          car.currPos.x = nx; car.currPos.z = nz;
        }
      }
      if (this.gust.t > this.gust.end) { this.gust = null; this.nextGust = rnd(...C.windEvery); }
    }

    // ---- Rockslides ----
    if ((this.nextSlide -= dt) <= 0 && !car.wrecked) {
      this.nextSlide = rnd(...C.slideEvery);
      this.rockslide(car);
    }
    for (const b of this.boulders) {
      if (!b.alive) continue;
      b.life -= dt;
      const g = terrain.gradient(b.pos.x, b.pos.z);
      b.vel.x -= g.x * SETTINGS.car.gravity * 0.9 * dt;
      b.vel.z -= g.z * SETTINGS.car.gravity * 0.9 * dt;
      b.vel.multiplyScalar(1 - 0.12 * dt);
      b.pos.x += b.vel.x * dt; b.pos.z += b.vel.z * dt;
      const ground = terrain.height(b.pos.x, b.pos.z);
      b.pos.y = Math.max(b.pos.y - 25 * dt, ground + b.r * 0.8); // (drops off ledges)
      const sp = Math.hypot(b.vel.x, b.vel.z);
      b.m.rotation.x += (b.vel.z / b.r) * dt;
      b.m.rotation.z -= (b.vel.x / b.r) * dt;
      b.m.position.copy(b.pos);
      if (b.life <= 0 || ground < -30 && b.pos.y < -20) { this.#smash(b, false); continue; }
      // Hit the car?
      const d = Math.hypot(t.x - b.pos.x, t.z - b.pos.z);
      if (d < b.r + 1.8 && Math.abs(t.y - b.pos.y) < b.r + 1.5 && !car.wrecked) {
        car.takeDamage(C.boulderDamage * Math.min(2, 0.5 + sp / 12) * (b.r / 2), b.pos.clone());
        car.nudge((b.vel.x / (sp || 1)) * 8, (b.vel.z / (sp || 1)) * 8);
        this.fx.chase.addShake(0.8);
        this.#smash(b, true);
        continue;
      }
      // Flatten demons in its way
      if (sp > 4) this.fx.demons.damageArea(b.pos, b.r + 0.5, 200, 'gun');
    }
  }

  // A few boulders break off the walls ahead of you and come crashing down.
  rockslide(car) {
    const t = car.currPos;
    const dir = terrain.canyon.dirAt(t.x, t.z);
    const lv = car.body.linvel();
    const fwd = Math.sign(dir.x * lv.x + dir.z * lv.z) || 1; // which way you're going along the canyon
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const b = this.boulders.find((q) => !q.alive);
      if (!b) return;
      const ahead = rnd(45, 110) * fwd, side = Math.random() < 0.5 ? 1 : -1, out = rnd(30, 42);
      b.pos.set(t.x + dir.x * ahead + dir.z * side * out, 0, t.z + dir.z * ahead - dir.x * side * out);
      b.pos.y = terrain.height(b.pos.x, b.pos.z) + 3;
      b.vel.set(-dir.z * side * rnd(6, 10) - dir.x * fwd * rnd(2, 6), 0, dir.x * side * rnd(6, 10) - dir.z * fwd * rnd(2, 6));
      b.r = rnd(1.4, 2.6);
      b.m.scale.set(b.r, b.r * rnd(0.8, 1.1), b.r);
      b.life = 14;
      b.alive = true;
      b.m.visible = true;
    }
    this.fx.audio.thump();
    this.fx.chase.addShake(0.35);
    this.onSlide?.();
  }

  #smash(b, loud) {
    b.alive = false;
    b.m.visible = false;
    if (b.pos.y < -10) return; // (gone down a chasm)
    this.fx.gore.explode(b.pos.clone(), b.vel.clone().multiplyScalar(0.3).setY(4), [0x6a4030, 0x5a3020, 0x8a5a3a], 1.3);
    for (let i = 0; i < 10; i++) this.fx.dust.spawn(b.pos.clone(), new THREE.Vector3((Math.random() - 0.5) * 8, 2 + Math.random() * 4, (Math.random() - 0.5) * 8), 0.8, 1.2);
    if (loud) this.fx.audio.wreck();
  }

  // Dust streaming past in the wind.
  update(dt, carPos) {
    if (!this.windBlowing) return;
    const g = this.gust;
    for (let n = 0; n < 3; n++) {
      const p = new THREE.Vector3(carPos.x - g.dir.x * 25 + (Math.random() - 0.5) * 30, carPos.y + Math.random() * 6, carPos.z - g.dir.z * 25 + (Math.random() - 0.5) * 30);
      this.fx.dust.spawn(p, new THREE.Vector3(g.dir.x * 30, (Math.random() - 0.3) * 2, g.dir.z * 30), 0.3 + Math.random() * 0.4, 1.4);
    }
  }
}
