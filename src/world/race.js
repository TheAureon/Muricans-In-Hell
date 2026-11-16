// RACES vs MIRROR HANK (set up by Buck, once you've done his first job).
// Every region has one race course: a START gate near where you come in,
// then glowing rings to drive through, in order. You race a mirror clone
// of yourself: a see-through silver car that replays your BEST run on this
// course. No best run yet? It drives Buck's par time instead.
// Beat it to win. The first win in each region pays Buck's prize.
// Best times (and the ghost's path) are kept in the browser.
import * as THREE from 'three';
import { terrain } from './terrain.js';
import { createCarModel } from '../vehicle/carModel.js';
import { makeRandom } from '../core/random.js';
import { SETTINGS } from '../settings.js';
import { REGIONS } from '../regions/index.js';

const KEY = 'helldrive.races';
const RING_R = 9;          // how close you must pass a ring (m)
const PAR_SPEED = 30;      // m/s Buck's par ghost drives at (~108 km/h)
const SAMPLE = 0.1;        // seconds between ghost path samples

// Where the rings go for this region: [{ x, z }, ...] (the first is the start).
function course(region, spawn) {
  const rng = makeRandom(region.id.length * 7919 + 13);
  const ok = (x, z) => terrain.spawnable(x, z) && (terrain.depth?.(x, z) || 0) < 0.6
    && Math.abs(x) < region.terrain.size / 2 - 60 && Math.abs(z) < region.terrain.size / 2 - 60
    && !(region.boss && Math.hypot(x - region.boss.arena.x, z - region.boss.arena.z) < region.boss.arena.radius + 40)
    && !(region.base && Math.abs(x - region.base.x) < region.base.half + 15 && Math.abs(z - region.base.z) < region.base.half + 15);
  // Canyon regions: along the canyon from the start.
  const path = region.canyon?.path;
  if (path) {
    const pts = [];
    let walked = 0, next = 60;
    for (let i = 0; i < path.length - 1 && pts.length < 9; i++) {
      const [ax, az] = path[i], [bx, bz] = path[i + 1], len = Math.hypot(bx - ax, bz - az);
      while (next <= walked + len && pts.length < 9) {
        const t = (next - walked) / len, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        if (terrain.spawnable(x, z)) { pts.push({ x, z }); next += 160; } else next += 15; // (not over a chasm)
      }
      walked += len;
    }
    return pts;
  }
  // Open regions: a loop out in front of where you come in, and back.
  const sx = spawn.x, sz = spawn.z + (region.base ? region.base.half + 45 : 40);
  for (let radius = 230; radius > 80; radius -= 30) {
    const cx = sx, cz = sz + radius;
    const pts = [{ x: sx, z: sz }];
    let good = ok(sx, sz);
    for (let i = 1; i < 8 && good; i++) {
      const a = -Math.PI / 2 + (i / 8) * Math.PI * 2 + (rng() - 0.5) * 0.3;
      const r = radius * (0.85 + rng() * 0.3);
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (!ok(x, z)) good = false;
      pts.push({ x, z });
    }
    if (good) { pts.push({ x: sx, z: sz }); return pts; } // (finish back at the start)
  }
  return null; // no room for a course here
}

export class Race {
  constructor(scene, region, spawn, { hud, audio, radio, jobs, progress, souls }) {
    this.scene = scene;
    this.region = region;
    this.fx = { hud, audio, radio, jobs, progress, souls };
    this.points = course(region, spawn);
    this.state = 'idle'; // idle | countdown | racing
    this.saved = {};
    try { this.saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* fresh */ }
    if (!this.points) return;
    const len = this.points.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - this.points[i].x, p.z - this.points[i].z), 0);
    this.par = Math.round((len / PAR_SPEED) * 1.1);
    this.prize = Math.round((300 + len / 10) * (1 + Math.max(0, REGIONS.indexOf(region)) * 0.35) / 10) * 10; // (more in later regions)

    // The rings (standing up, facing along the course).
    this.group = new THREE.Group();
    scene.add(this.group);
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0x60ffd0, transparent: true, opacity: 0.25 });
    this.nextMat = new THREE.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: 0.85 });
    this.startMat = new THREE.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: 0.6 });
    const geo = new THREE.TorusGeometry(RING_R * 0.8, 0.35, 6, 28);
    this.rings = this.points.map((p, i) => {
      const n = this.points[Math.min(i + 1, this.points.length - 1)], b = this.points[Math.max(i - 1, 0)];
      const m = new THREE.Mesh(geo, this.ringMat);
      m.position.set(p.x, terrain.height(p.x, p.z) + RING_R * 0.8, p.z);
      m.rotation.y = Math.atan2(n.x - b.x, n.z - b.z);
      this.group.add(m);
      return m;
    });
    // The START sign: a name tag over the first ring.
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d');
    g.font = 'bold 46px Arial Black, Impact, sans-serif'; g.textAlign = 'center'; g.lineWidth = 8; g.strokeStyle = '#000';
    g.strokeText('🏁 RACE vs MIRROR HANK', 256, 70, 500); g.fillStyle = '#ffd040'; g.fillText('🏁 RACE vs MIRROR HANK', 256, 70, 500);
    this.sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
    this.sign.scale.set(14, 3.5, 1);
    this.sign.position.copy(this.rings[0].position).setY(this.rings[0].position.y + RING_R + 2);
    this.group.add(this.sign);

    // The ghost: a see-through silver copy of the car.
    this.ghost = createCarModel().root;
    const ghostMat = new THREE.MeshStandardMaterial({ color: 0xd8e4f0, metalness: 1, roughness: 0.15, transparent: true, opacity: 0.45, depthWrite: false });
    this.ghost.traverse((m) => { if (m.isMesh) { m.material = ghostMat; m.castShadow = false; } });
    this.ghost.visible = false;
    scene.add(this.ghost);

    // The timer on screen.
    this.el = document.createElement('div');
    this.el.id = 'race-hud';
    document.body.appendChild(this.el);
    this.#show(false);
  }

  get unlocked() { return !!this.points && (SETTINGS.dev.creative || this.fx.jobs.jobs.buckHello?.status === 'done'); }
  get racing() { return this.state !== 'idle'; }
  get best() { return this.saved[this.region.id] || null; }

  // The next ring to drive through (for the arrow).
  get target() { return this.racing ? this.points[this.next] : null; }

  update(dt, car, playing) {
    if (!this.points) return;
    const show = this.unlocked && playing;
    this.group.visible = show;
    if (!show) { if (this.racing) this.#end(false, 'Race called off.'); return; }
    const p = car.currPos;
    const near = (q) => Math.hypot(p.x - q.x, p.z - q.z) < RING_R;
    for (let i = 0; i < this.rings.length; i++) this.rings[i].material = this.racing ? (i === this.next ? this.nextMat : this.ringMat) : (i === 0 ? this.startMat : this.ringMat);
    this.sign.visible = !this.racing;

    if (this.state === 'idle') {
      if (near(this.points[0]) && !car.wrecked && !this.cool) this.#countdown();
      if (this.cool && !near(this.points[0])) this.cool = false; // (drive out of the gate before you can start again)
      return;
    }
    if (car.wrecked) { this.#end(false, 'Wrecked! Race over.'); return; }
    this.t += dt;
    if (this.state === 'countdown') {
      const left = Math.ceil(-this.t);
      this.el.innerHTML = `<b class="rc-count">${left > 0 ? left : 'GO!'}</b>`;
      if (this.t >= 0) { this.state = 'racing'; this.fx.audio.chime(); }
      return;
    }
    // Racing: record your path, move the ghost, check the rings.
    if ((this.sampleT += dt) >= SAMPLE) { this.sampleT = 0; this.path.push([+p.x.toFixed(1), +p.z.toFixed(1)]); }
    this.#moveGhost();
    if (near(this.points[this.next])) {
      this.next++;
      this.fx.audio.chime();
      if (this.next >= this.points.length) { this.#finish(); return; }
    }
    const ghostT = this.ghostTime;
    this.el.innerHTML = `<div class="rc-t">${fmt(this.t)}</div><div class="rc-sub">Ring ${this.next}/${this.points.length - 1} · Mirror Hank: ${fmt(ghostT)}${this.best ? ' (your best)' : ' (Buck\'s par)'}</div>`;
    if (this.t > ghostT + 60) this.#end(false, 'Mirror Hank finished a minute ago. Race over.');
  }

  // How long the ghost takes.
  get ghostTime() { return this.best ? this.best.time : this.par; }

  #moveGhost() {
    const b = this.best;
    let x, z, yaw;
    if (b && b.path.length > 1) {
      const f = THREE.MathUtils.clamp(this.t / SAMPLE, 0, b.path.length - 1.001), i = Math.floor(f), k = f - i;
      const [ax, az] = b.path[i], [bx, bz] = b.path[i + 1];
      x = ax + (bx - ax) * k; z = az + (bz - az) * k;
      yaw = Math.atan2(bx - ax, bz - az);
    } else {
      const u = THREE.MathUtils.clamp(this.t / this.par, 0, 1);
      const pos = this.curve.getPointAt(u);
      const tan = this.curve.getTangentAt(Math.min(0.999, Math.max(0.001, u)));
      x = pos.x; z = pos.z; yaw = Math.atan2(tan.x, tan.z);
    }
    this.ghost.position.set(x, terrain.height(x, z) + 0.5, z);
    if (Math.abs(yaw) > 0) this.ghost.rotation.set(0, yaw, 0);
  }

  #countdown() {
    this.state = 'countdown';
    this.t = -3;
    this.next = 1;
    this.path = [];
    this.sampleT = 0;
    this.curve = new THREE.CatmullRomCurve3(this.points.map((q) => new THREE.Vector3(q.x, 0, q.z)));
    this.ghost.visible = true;
    this.#moveGhost();
    this.#show(true);
    this.fx.hud.toast(this.best ? `Race your best: ${fmt(this.best.time)}` : `Beat Buck's par: ${fmt(this.par)}`, 'job');
    if (!this.best) this.fx.radio.talk?.([['buck', 'That\'s you in the mirror, Mercer. Beat yourself. Shouldn\'t be hard.']]);
  }

  #finish() {
    const time = this.t, beat = time < this.ghostTime;
    const firstWin = beat && !this.saved[`${this.region.id}:won`];
    if (!this.best || time < this.best.time) {
      this.saved[this.region.id] = { time, path: this.path };
    }
    if (beat) this.saved[`${this.region.id}:won`] = true;
    try { localStorage.setItem(KEY, JSON.stringify(this.saved)); } catch { /* ignore */ }
    if (beat) {
      this.fx.jobs.emit('race');
      if (firstWin) this.fx.progress.addSouls(this.prize);
      this.fx.hud.banner('YOU WIN!', `${fmt(time)}${firstWin ? `  ·  +${this.prize} souls from Buck` : ' · new best'}`, 6);
      this.fx.radio.talk?.([['buck', firstWin ? 'Beat your own reflection. That\'s a first for an F1 guy.' : 'Faster than yesterday\'s you. Freaky.']]);
    } else this.fx.hud.banner('MIRROR HANK WINS', `${fmt(time)} vs ${fmt(this.ghostTime)}. Try again: drive through the start gate.`, 6);
    this.#end(null);
  }

  #end(won, why) {
    if (why) this.fx.hud.toast(why, 'warn');
    this.state = 'idle';
    this.cool = true;
    this.ghost.visible = false;
    this.#show(false);
  }

  #show(on) { this.el.style.display = on ? 'block' : 'none'; }
}

const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;
