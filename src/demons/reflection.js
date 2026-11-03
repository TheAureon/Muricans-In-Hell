// THE REFLECTION (Mirror Wastes boss): a giant dark chrome copy of YOUR
// car, your exact build blown up three times over, driven by a shadow of
// Hank. It waits in the great mirror bowl at the end of the wastes.
//  - Drives at you and RAMS (it's three times your size).
//  - Fires YOUR guns back at you (as many as you have; cannons = missiles).
//  - Every so often it backs off, revs, and CHARGES in a straight line.
//  - Below half health it calls its own smaller reflections out of the
//    mirrors around the bowl, and gets faster.
// Same outside shape as boss.js, so the rest of the game treats it the same.
import * as THREE from 'three';
import { SETTINGS } from '../settings.js';
import { terrain } from '../world/terrain.js';
import { MirrorDriver } from '../world/mirrors.js';

export class Reflection {
  constructor(scene, physics, ctx) {
    this.isBoss = true;
    const cfg = ctx.region.boss;
    this.cfg = cfg;
    this.name = cfg.name;
    this.B = SETTINGS.bosses[cfg.type];
    this.ctx = ctx;
    const A = cfg.arena;
    this.arenaCenter = new THREE.Vector3(A.x, terrain.height(A.x, A.z), A.z);
    this.arenaRadius = A.radius + 20;
    this.radius = 6;
    this.driver = new MirrorDriver(scene, physics, ctx.car, {
      scale: this.B.scale, hp: this.B.health, speed: this.B.speed, damage: this.B.ramDamage,
      fx: { projectiles: ctx.projectiles, gore: ctx.gore, sparks: ctx.sparks, audio: ctx.audio, chase: ctx.chase },
    });
    this.body = this.driver.body;
    this.reset();
  }

  get root() { return this.driver.root; }
  get pos() { return this.driver.pos; }
  get yaw() { return this.driver.yaw; }
  get hp() { return this.driver.hp; }
  set hp(v) { this.driver.hp = v; }
  get awake() { return this.state !== 'dormant' && this.state !== 'dead'; }
  distanceTo(p) { return this.driver.distanceTo(p); }

  reset() {
    if (this.state === 'dying' && !this.exploded) this.#explode();
    const d = this.driver;
    d.place(this.arenaCenter.x, this.arenaCenter.z, Math.atan2(-this.arenaCenter.x, -this.arenaCenter.z));
    d.hp = this.B.health;
    d.alive = true;
    d.root.visible = !this.defeated && !this.disabled;
    this.state = this.defeated ? 'dead' : 'dormant';
    this.timer = 0;
    this.charge = null;
    this.cd = { charge: 8 };
    this.summoned = false;
    d.body.setNextKinematicTranslation(this.defeated || this.disabled ? { x: 0, y: -200, z: 0 } : d.pos);
    this.ctx.hud?.bossBar(null);
  }

  setDisabled(on) { this.disabled = on; this.reset(); }

  takeHit(amount, source) {
    if (this.state === 'dead' || this.state === 'dying' || this.disabled) return false;
    if (this.state === 'dormant') this.#wake();
    const dealt = Math.min(amount, this.driver.hp);
    this.driver.hp -= amount;
    this.driver.flash = 1;
    this.ctx.stats.record(source, dealt);
    if (this.driver.hp <= 0) { this.#die(); return true; }
    return false;
  }

  raycast(o, dir) { return this.state === 'dead' || this.disabled ? null : this.driver.raycast(o, dir); }

  fixedUpdate(dt, car) {
    const B = this.B, d = this.driver;
    const fromArena = Math.hypot(car.currPos.x - this.arenaCenter.x, car.currPos.z - this.arenaCenter.z);
    if (this.state === 'dead') return;
    if (this.state === 'dormant') {
      d.prev.copy(d.pos);
      if (fromArena < this.arenaRadius && !car.wrecked) this.#wake();
      return;
    }
    if (this.state === 'dying') {
      this.timer += dt;
      d.prev.copy(d.pos);
      d.root.rotation.z = Math.sin(this.timer * 20) * 0.05 * (1 + this.timer);
      if (this.timer > 2.4 && !this.exploded) this.#explode();
      return;
    }
    if (this.state === 'waking') {
      this.timer += dt;
      d.prev.copy(d.pos);
      if (this.timer > 2) this.state = 'fight';
      return;
    }
    // Gone too far / wrecked: it drives back home and heals.
    if (car.wrecked || fromArena > B.leash) {
      d.prev.copy(d.pos);
      d.hp = Math.min(B.health, d.hp + B.health * 0.05 * dt);
      const home = Math.atan2(this.arenaCenter.x - d.pos.x, this.arenaCenter.z - d.pos.z);
      d.yaw = home;
      if (Math.hypot(this.arenaCenter.x - d.pos.x, this.arenaCenter.z - d.pos.z) > 3) {
        d.pos.x += Math.sin(home) * 10 * dt; d.pos.z += Math.cos(home) * 10 * dt; d.pos.y = terrain.height(d.pos.x, d.pos.z);
      }
      d.body.setNextKinematicTranslation(d.pos);
      if (d.hp >= B.health) { this.state = 'dormant'; this.ctx.hud.bossBar(null); }
      return;
    }
    const frac = d.hp / B.health;
    const enraged = frac < 0.5;
    if (enraged && !this.summoned) {
      this.summoned = true;
      const mirrors = this.ctx.mirrors;
      if (mirrors) for (const m of mirrors.monoliths.filter((q) => q.alive && q.real && Math.hypot(q.x - this.arenaCenter.x, q.z - this.arenaCenter.z) < 160).slice(0, 2)) mirrors.spawnClone(m);
      this.ctx.hud.toast(`${this.name} calls its reflections!`, 'warn');
    }
    this.cd.charge -= dt * (enraged ? 1.4 : 1);
    if (!this.charge && this.cd.charge <= 0) { this.charge = { t: 0 }; this.ctx.audio.roar?.(0.5); }
    let speedMul = enraged ? 1.25 : 1;
    if (this.charge) {
      this.charge.t += dt;
      if (this.charge.t < 1.2) speedMul = 0.15;     // revving
      else if (this.charge.t < 3.2) speedMul = 2.0;  // CHARGE
      else { this.charge = null; this.cd.charge = 8; }
    }
    d.drive(dt, { aggression: enraged ? 1.5 : 1, speedMul });
    this.ctx.hud.bossBar(this.name, frac, enraged);
  }

  #wake() {
    if (this.state !== 'dormant') return;
    this.driver.recopy(); // it copies the car you've got NOW
    this.driver.root.visible = true;
    this.state = 'waking';
    this.timer = 0;
    this.ctx.hud.toast(`${this.name.toUpperCase()} WAKES UP!`, 'warn');
    this.ctx.hud.bossBar(this.name, this.driver.hp / this.B.health, false);
    this.ctx.audio.roar?.();
    this.ctx.chase.addShake(0.8);
  }

  #die() {
    this.ctx.onDying?.();
    this.state = 'dying';
    this.timer = 0;
    this.exploded = false;
    this.charge = null;
    this.ctx.stats.kill('gun');
    this.ctx.hud.bossBar(null);
    this.ctx.audio.wreck();
  }

  #explode() {
    this.exploded = true;
    this.defeated = true;
    this.state = 'dead';
    this.driver.shatter();
    for (let k = 0; k < 3; k++) this.ctx.gore.explode(this.driver.pos.clone().setY(this.driver.pos.y + 2 + k * 2), new THREE.Vector3((Math.random() - 0.5) * 14, 9, (Math.random() - 0.5) * 14), [0xd8dce8, 0x3a3a48, 0x8a60ff, 0xffffff], 4);
    this.ctx.chase.addShake(1.3);
    this.ctx.onDefeated?.();
  }

  render(alpha) {
    if (this.state === 'dead') return;
    this.driver.render(alpha);
  }
}
