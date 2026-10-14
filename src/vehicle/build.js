// The vehicle build: which parts sit in which grid cells, the rules for
// where parts may go, and the numbers they add up to (weight, balance...).
//
// Grid: cells are 0.5 m cubes in the car's own space (x = right/left,
// y = up, z = forward). Cell (i, j, k) has its center at
//   x = (i + 0.5) * 0.5,  y = 0.15 + j * 0.5,  z = (k + 0.5) * 0.5
// The car body itself fills some cells; parts must touch the body or
// another part (face to face). No building underneath the car (j < 0)
// or inside the wheels.
import { SETTINGS } from '../settings.js';
import { PART_TYPES } from './parts.js';

export const CELL = 0.5;
export const cellCenter = (i, j, k) => ({ x: (i + 0.5) * CELL, y: 0.15 + j * CELL, z: (k + 0.5) * CELL });
export const key = (i, j, k) => `${i},${j},${k}`;

// Cells filled by the car itself.
export const BODY_CELLS = new Set();
for (let i = -2; i <= 1; i++) {
  for (let k = -4; k <= 4; k++) BODY_CELLS.add(key(i, 0, k));   // chassis + front bumper
  for (let k = -3; k <= 1; k++) BODY_CELLS.add(key(i, 1, k));   // cabin
}
for (let i = -1; i <= 0; i++) for (let k = -2; k <= -1; k++) BODY_CELLS.add(key(i, 2, k)); // roof gun

// Cells where the wheels are (can't build there).
const WHEEL_CELLS = new Set();
for (const i of [-3, 2]) for (const k of [-4, -3, 2, 3]) WHEEL_CELLS.add(key(i, 0, k));

const NEIGHBORS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const LIMIT = { i: 8, j: 8, k: 10 }; // how far from the car you can build

export class Build {
  constructor() {
    this.parts = new Map(); // key -> { type, i, j, k, normal: [x,y,z] }
  }

  get count() { return this.parts.size; }

  isFilled(i, j, k) { return BODY_CELLS.has(key(i, j, k)) || this.parts.has(key(i, j, k)); }

  // Can a part go in this cell? Returns a reason string if not.
  whyNot(i, j, k) {
    if (j < 0) return 'Not under the car (the wheels need the ground)';
    if (Math.abs(i) > LIMIT.i || j > LIMIT.j || Math.abs(k) > LIMIT.k) return 'Too far from the car';
    if (this.isFilled(i, j, k)) return 'Something is already there';
    if (WHEEL_CELLS.has(key(i, j, k))) return 'That is where the wheel is';
    if (this.count >= SETTINGS.build.maxParts) return `Part limit reached (${SETTINGS.build.maxParts})`;
    if (!NEIGHBORS.some(([a, b, c]) => this.isFilled(i + a, j + b, k + c))) return 'Must touch the car or another part';
    return null;
  }

  add(type, i, j, k, normal) {
    if (this.whyNot(i, j, k)) return false;
    this.parts.set(key(i, j, k), { type, i, j, k, normal: [...normal] });
    return true;
  }

  // Remove a part, plus anything left floating (not connected to the car).
  remove(i, j, k) {
    if (!this.parts.delete(key(i, j, k))) return 0;
    return 1 + this.#dropFloating();
  }

  #dropFloating() {
    const connected = new Set();
    const queue = [...BODY_CELLS].map((s) => s.split(',').map(Number));
    while (queue.length) {
      const [i, j, k] = queue.pop();
      for (const [a, b, c] of NEIGHBORS) {
        const kk = key(i + a, j + b, k + c);
        if (this.parts.has(kk) && !connected.has(kk)) { connected.add(kk); queue.push([i + a, j + b, k + c]); }
      }
    }
    let dropped = 0;
    for (const kk of [...this.parts.keys()]) if (!connected.has(kk)) { this.parts.delete(kk); dropped++; }
    return dropped;
  }

  clear() { this.parts.clear(); }

  // ---- What the build adds up to ----
  stats() {
    const P = SETTINGS.parts;
    const base = SETTINGS.car.mass;
    let mass = base, momentZ = 0, momentX = 0, power = 0, topSpeed = 0, armor = 0, guns = 0;
    const ramBonus = { '1,0': 0, '-1,0': 0, '0,1': 0, '0,-1': 0 }; // by side: x,z direction
    for (const p of this.parts.values()) {
      const s = P[p.type];
      const c = cellCenter(p.i, p.j, p.k);
      mass += s.mass;
      momentZ += s.mass * c.z;
      momentX += s.mass * c.x;
      if (s.power) power += s.power;
      if (s.topSpeed) topSpeed += s.topSpeed;
      if (s.armor) armor += s.armor;
      if (PART_TYPES[p.type].isGun) guns++;
      if (s.ramBonus) {
        const side = `${p.normal[0]},${p.normal[2]}`;
        if (side in ramBonus) ramBonus[side] += s.ramBonus;
      }
    }
    return {
      count: this.parts.size,
      mass,
      partMass: mass - base,
      comZ: momentZ / mass, // + = nose heavy
      comX: momentX / mass,
      // -1 (very tail heavy) .. +1 (very nose heavy)
      balance: Math.max(-1, Math.min(1, (momentZ / mass) / 1.0)),
      enginePower: SETTINGS.car.enginePower + power,
      topSpeed: SETTINGS.car.topSpeed + topSpeed,
      maxHealth: SETTINGS.health.max + armor,
      armor,
      guns: guns + 1, // + the built-in roof gun
      ramBonus,
    };
  }

  // ---- Save / load (kept in the browser between visits) ----
  toJSON() { return [...this.parts.values()]; }
  load(list) {
    this.parts.clear();
    for (const p of list || []) {
      if (!PART_TYPES[p.type]) continue;
      this.parts.set(key(p.i, p.j, p.k), { type: p.type, i: p.i, j: p.j, k: p.k, normal: p.normal });
    }
    this.#dropFloating();
  }
  save() { try { localStorage.setItem('helldrive.build', JSON.stringify(this)); } catch { /* storage blocked: fine */ } }
  restore() {
    try { this.load(JSON.parse(localStorage.getItem('helldrive.build') || '[]')); } catch { /* ignore */ }
  }
}
