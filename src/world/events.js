// RANDOM EVENTS: every couple of minutes of driving, something happens.
//   DEMON STAMPEDE  a huge herd charges at you. Survive it.
//   FIRE RAIN       burning rocks fall from the sky. Keep moving.
//   OIL CONVOY      an Infernal Petroleum tanker crosses the plain, with
//                   guards. Blow it up (or ram it) for a fat soul payout.
//   SOUL STORM      souls rain down. Grab as many as you can!
// Survive one (don't get wrecked) for bonus souls. Not while racing, in a
// boss fight, or at base.
import * as THREE from 'three';
import { terrain } from './terrain.js';
import { raySphere } from '../demons/demons.js';
import { litMaterial } from '../core/graphics.js';
import { REGIONS } from '../regions/index.js';

const GAP = [100, 160]; // seconds of driving between events

const EVENTS = {
  stampede: { name: 'DEMON STAMPEDE!', sub: 'A herd is coming right at you. Survive!', time: 40, line: [['doc', 'Hank, the seismograph is going crazy. Something BIG is coming your way. Lots of somethings.']] },
  fireRain: { name: 'FIRE RAIN!', sub: 'Burning rocks from the sky. Keep moving!', time: 25, line: [['doc', 'Uh. The sky is on fire. More than usual. Don\'t stop driving.']] },
  convoy: { name: 'OIL CONVOY!', sub: 'An Infernal Petroleum tanker. Blow it up before it gets away!', time: 60, line: [['carol', 'Hank! One of his tankers is crossing near you. Guarded. I\'d LOVE to see it burn.']] },
  soulStorm: { name: 'SOUL STORM!', sub: 'Souls are raining down. Grab them!', time: 18, line: [['doc', 'Whoa. Some kind of soul front moving through. Free juice, Hank! Drive through it!']] },
};

export class Events {
  constructor(scene, region, { demons, projectiles, souls, hud, audio, radio, jobs, gore, sparks, chase }) {
    this.scene = scene;
    this.region = region;
    this.fx = { demons, projectiles, souls, hud, audio, radio, jobs, gore, sparks, chase };
    this.level = Math.max(0, REGIONS.indexOf(region));
    this.timer = GAP[0] + Math.random() * (GAP[1] - GAP[0]);
    this.active = null;
    this.targets = []; // (the tanker: shootable like a demon)
    this.el = document.createElement('div');
    this.el.id = 'event-hud';
    document.body.appendChild(this.el);
    this.el.style.display = 'none';
  }

  get running() { return !!this.active; }

  update(dt, car, { allowed }) {
    if (!this.active) {
      if (!allowed || car.wrecked) return;
      if ((this.timer -= dt) <= 0) this.start(null, car);
      return;
    }
    const e = this.active;
    e.t += dt;
    if (car.wrecked) { this.#end(false, 'Wrecked! Event failed.'); return; }
    switch (e.kind) {
      case 'stampede': this.#stampede(e, dt, car); break;
      case 'fireRain': this.#fireRain(e, dt, car); break;
      case 'convoy': this.#convoy(e, dt, car); break;
      case 'soulStorm': this.#soulStorm(e, dt, car); break;
    }
    if (!this.active) return;
    const left = Math.max(0, Math.ceil(e.def.time - e.t));
    this.el.innerHTML = `<b>${e.def.name}</b><span>${e.status || ''} · ${left}s</span>`;
    if (e.t >= e.def.time) this.#end(e.kind !== 'convoy', e.kind === 'convoy' ? 'The tanker got away.' : null);
  }

  // Start an event (kind = null: a random one).
  start(kind, car) {
    const kinds = Object.keys(EVENTS);
    kind ||= kinds[Math.floor(Math.random() * kinds.length)];
    const def = EVENTS[kind];
    this.active = { kind, def, t: 0, status: '', spawnT: 0, fwd: new THREE.Vector3(Math.sin(car.yaw ?? 0), 0, Math.cos(car.yaw ?? 0)) };
    const lv = car.body.linvel();
    if (Math.hypot(lv.x, lv.z) > 3) this.active.fwd.set(lv.x, 0, lv.z).normalize();
    this.fx.hud.banner(def.name, def.sub, 4);
    this.fx.audio.roar?.();
    this.fx.radio.talk?.(def.line);
    this.el.style.display = 'block';
    if (kind === 'convoy') this.#spawnTanker(car);
  }

  // ---------------------------------------------------------- the events
  #stampede(e, dt, car) {
    // Four waves of packs, from ahead, spread out.
    if (e.t >= e.spawnT && e.spawnT < 16) {
      e.spawnT += 4;
      const side = new THREE.Vector3(-e.fwd.z, 0, e.fwd.x);
      for (let i = -1; i <= 1; i++) {
        const c = car.currPos.clone().addScaledVector(e.fwd, 70).addScaledVector(side, i * 22);
        if (terrain.spawnable(c.x, c.z)) this.fx.demons.spawnPack(c, 5 + Math.round(this.level * 0.6));
      }
    }
    e.status = 'Survive the herd';
  }

  #fireRain(e, dt, car) {
    if ((e.spawnT -= dt) > 0) return;
    e.spawnT = Math.max(0.25, 0.6 - this.level * 0.03);
    const from = car.currPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 30, 45, (Math.random() - 0.5) * 30));
    this.fx.projectiles.throwAt(Math.random() < 0.5 ? 'lavaBomb' : 'fireball', from, 20 + this.level * 4, 4, 1.6, null, 14);
    e.status = 'Keep moving';
  }

  #soulStorm(e, dt, car) {
    if ((e.spawnT -= dt) > 0) return;
    e.spawnT = 0.35;
    const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 35;
    const p = car.currPos.clone().addScaledVector(e.fwd, 25);
    p.x += Math.cos(a) * r; p.z += Math.sin(a) * r;
    p.y = terrain.height(p.x, p.z) + 6;
    this.fx.souls.burst(p, 4 + this.level);
    e.status = 'Grab the souls';
  }

  // ---------------------------------------------------------- the tanker
  #spawnTanker(car) {
    const e = this.active;
    const side = new THREE.Vector3(-e.fwd.z, 0, e.fwd.x);
    // It starts off to one side ahead of you and drives across your path.
    let start = car.currPos.clone().addScaledVector(e.fwd, 110).addScaledVector(side, -120);
    if (!terrain.spawnable(start.x, start.z)) start = car.currPos.clone().addScaledVector(e.fwd, 100);
    const g = new THREE.Group();
    const red = litMaterial({ color: 0x8a1010, flatShading: true, roughness: 0.5, metalness: 0.3 });
    const dark = litMaterial({ color: 0x1a1a1c, flatShading: true });
    const tank = litMaterial({ color: 0xc0c4c8, flatShading: true, roughness: 0.3, metalness: 0.7 });
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(2.6, 2.2, 2.6), red, 0, 1.8, 4.2);                       // cab
    add(new THREE.BoxGeometry(2.4, 0.8, 1.2), dark, 0, 2.6, 5.2);                      // windshield
    add(new THREE.CylinderGeometry(1.5, 1.5, 7.5, 12).rotateX(Math.PI / 2), tank, 0, 2.2, -1.2); // the oil tank
    add(new THREE.BoxGeometry(2.8, 0.4, 11), dark, 0, 0.7, 0.5);                       // chassis
    for (const z of [4.2, 0.5, -3.5]) for (const x of [-1.3, 1.3]) add(new THREE.CylinderGeometry(0.7, 0.7, 0.5, 10).rotateZ(Math.PI / 2), dark, x, 0.7, z);
    // "IP" logo on the tank
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const x2 = c.getContext('2d'); x2.fillStyle = '#c0c4c8'; x2.fillRect(0, 0, 256, 64);
    x2.font = 'bold 40px Arial Black, Impact, sans-serif'; x2.fillStyle = '#8a1010'; x2.textAlign = 'center'; x2.fillText('INFERNAL PETROLEUM', 128, 46, 250);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
    for (const s of [-1, 1]) { const l = logo.clone(); l.position.set(s * 1.52, 2.4, -1.2); l.rotation.y = s * Math.PI / 2; g.add(l); }
    this.scene.add(g);
    const maxHp = 900 + this.level * 300;
    const tk = {
      isTarget: true, kind: 'tanker', alive: true, hp: maxHp, maxHp, group: g,
      pos: start.clone(), dir: side.clone(), speed: 13,
      raycast: (o, dir) => { if (!tk.alive) return null; const t = raySphere(o, dir, tk.pos.clone().setY(tk.pos.y + 2), 3.4); return t === null ? null : { t, point: o.clone().addScaledVector(dir, t) }; },
      distanceTo: (p) => Math.max(0, tk.pos.distanceTo(p) - 3),
      takeHit: (amount, source) => {
        if (!tk.alive) return false;
        tk.hp -= amount;
        this.fx.sparks.spawn(tk.pos.clone().setY(tk.pos.y + 2.5), new THREE.Vector3((Math.random() - 0.5) * 4, 3, (Math.random() - 0.5) * 4), 0.12, 0.3);
        if (tk.hp <= 0) this.#blowUp(tk, source);
        return tk.hp <= 0;
      },
    };
    this.tanker = tk;
    this.targets = [tk];
    // Its guards
    this.fx.demons.spawnPack(start.clone().addScaledVector(side, 10), 6 + this.level);
    this.#placeTanker(tk);
  }

  #placeTanker(tk) {
    tk.pos.y = terrain.height(tk.pos.x, tk.pos.z);
    tk.group.position.copy(tk.pos);
    tk.group.rotation.y = Math.atan2(tk.dir.x, tk.dir.z);
  }

  #convoy(e, dt, car) {
    const tk = this.tanker;
    if (!tk?.alive) return;
    // Drive on, steering around chasms and the edge of the map.
    const next = tk.pos.clone().addScaledVector(tk.dir, tk.speed * dt);
    const half = this.region.terrain.size / 2 - 60;
    if (!terrain.spawnable(next.x, next.z) || Math.abs(next.x) > half || Math.abs(next.z) > half) tk.dir.applyAxisAngle(_up, 1.2 * dt);
    else tk.pos.copy(next);
    this.#placeTanker(tk);
    // Rammed? (big hits only)
    const d = tk.pos.distanceTo(car.currPos);
    if (d < 5 && car.speed > 10 && !e.ramCd) {
      e.ramCd = true;
      tk.takeHit(car.speed * 12, 'ram');
      car.takeDamage(car.speed * 2, tk.pos.clone().setY(tk.pos.y + 1));
      this.fx.chase.addShake(0.8);
      setTimeout(() => { e.ramCd = false; }, 600);
    }
    e.status = `Tanker ${Math.max(0, Math.round((tk.hp / tk.maxHp) * 100))}% · ${Math.round(d)} m`;
  }

  #blowUp(tk, source) {
    tk.alive = false;
    const at = tk.pos.clone().setY(tk.pos.y + 2);
    this.fx.gore.explode(at, new THREE.Vector3(0, 10, 0), [0x8a1010, 0x1a1a1c, 0xc0c4c8, 0xffa030, 0x101010], 3);
    for (let i = 0; i < 50; i++) this.fx.sparks.spawn(at, new THREE.Vector3((Math.random() - 0.5) * 18, 4 + Math.random() * 12, (Math.random() - 0.5) * 18), 0.3, 1.2);
    this.fx.audio.wreck();
    this.fx.chase.addShake(1.2);
    this.fx.demons.damageArea(at, 14, 400, source);
    this.scene.remove(tk.group);
    this.fx.souls.burst(at, 150 + this.level * 60);
    this.#end(true, null);
  }

  #end(survived, why) {
    const e = this.active;
    if (!e) return;
    this.active = null;
    this.el.style.display = 'none';
    this.timer = GAP[0] + Math.random() * (GAP[1] - GAP[0]);
    if (this.tanker) { if (this.tanker.alive) this.scene.remove(this.tanker.group); this.tanker = null; this.targets = []; }
    if (why) this.fx.hud.toast(why, 'warn');
    if (!survived) return;
    const bonus = e.kind === 'soulStorm' ? 0 : 60 + this.level * 30;
    if (bonus) this.fx.souls.burst(this.fx.demons.car?.currPos.clone().setY((this.fx.demons.car?.currPos.y || 0) + 3) || new THREE.Vector3(), bonus);
    this.fx.hud.banner(e.kind === 'convoy' ? 'TANKER DESTROYED!' : 'SURVIVED!', bonus ? `+${bonus} bonus souls` : 'Nice haul.', 4);
    this.fx.jobs.emit('event');
  }

  // Wreck / respawn: call it all off.
  reset() { if (this.active) this.#end(false, null); }
}

const _up = new THREE.Vector3(0, 1, 0);
