// DEMON BOUNTIES: every region has one WANTED demon, a named, oversized,
// extra-tough one. Grizzle posts the bounty (it's a job on the job board).
// Once you take it, the demon shows up somewhere out there; the job arrow
// points at it. Hurt it badly and it runs, so you have to chase it down.
import * as THREE from 'three';
import { terrain } from '../world/terrain.js';
import { DEMON_TYPES } from './demonTypes.js';

// region id -> the wanted demon. hpMult: how many times tougher than normal.
export const BOUNTIES = {
  ash_plains:       { type: 'brute',      name: 'Big Earl',              souls: 400,  hpMult: 6,  wanted: 'For eating three of Doc\'s survey drones.' },
  lava_rivers:      { type: 'magmaBrute', name: 'Old Smokey',            souls: 600,  hpMult: 5,  wanted: 'For setting fire to everything. Even for Hell, it\'s a lot.' },
  bone_mountains:   { type: 'boneRam',    name: 'Ramses the Unbreakable', souls: 800, hpMult: 10, wanted: 'Has never lost a head-butt. Has never been run over by a tank.' },
  flooded_city:     { type: 'bloater',    name: 'Mister Bubbles',        souls: 1000, hpMult: 10, wanted: 'Holds the record for most swimmers popped. Don\'t pop HIM up close.' },
  blood_swamp:      { type: 'mireToad',   name: 'Grandma Croak',         souls: 1200, hpMult: 8,  wanted: 'Mother of half the swamp. Grandmother of the other half.' },
  ice_hell:         { type: 'frostBrute', name: 'The Abominable Steve',  souls: 1400, hpMult: 5,  wanted: 'Nobody knows why he\'s called Steve. Nobody asks.' },
  iron_foundry:     { type: 'ironHusk',   name: 'Unit 666',              souls: 1600, hpMult: 8,  wanted: 'Infernal Petroleum\'s employee of the month, 400 years running.' },
  screaming_canyon: { type: 'harpy',      name: 'Shrieking Sally',       souls: 1800, hpMult: 12, wanted: 'Stole Buck\'s hubcaps. Buck wants them back.' },
  mirror_wastes:    { type: 'brute',      name: 'The Other Earl',        souls: 2000, hpMult: 7,  wanted: 'Big Earl\'s reflection. Meaner. Better hair.' },
  the_throne:       { type: 'security',   name: 'Head of Security Dale', souls: 2500, hpMult: 10, wanted: 'Walked Carol out of the building. Carol remembers.' },
};

// The bounty as a job for the job board (see missions.js), or null.
export function bountyJob(region) {
  const b = BOUNTIES[region.id];
  if (!b) return null;
  return {
    id: `bounty-${region.id}`, giver: 'grizzle', region: region.id, after: ['roadTest'],
    title: `WANTED: ${b.name}`,
    brief: `A giant ${DEMON_TYPES[b.type]?.name || b.type}. ${b.wanted} Hurt it and it runs: chase it down.`,
    offer: [['grizzle', `Bounty. ${b.name}. ${b.wanted}`], ['grizzle', 'Big, mean, and it runs when it\'s losing. Take the job and I\'ll tell you where it is.']],
    goals: [{ kind: 'bounty', name: b.name }],
    reward: { souls: b.souls },
    done: [['grizzle', `${b.name}. Finally. I\'ll have the head mounted in the garage.`]],
  };
}

export class Bounty {
  constructor(scene, demons, region, jobs) {
    this.demons = demons;
    // A name tag + health bar floating over its head.
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512; this.canvas.height = 128;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, depthTest: false, transparent: true }));
    this.tag.scale.set(8, 2, 1);
    this.tag.renderOrder = 10;
    this.tag.visible = false;
    scene.add(this.tag);
    this.drawnHp = -1;
    this.region = region;
    this.jobs = jobs;
    this.def = BOUNTIES[region.id];
    this.job = bountyJob(region);
    this.demon = null;
    this.wait = 3; // (a moment before it appears)
  }

  get alive() { return !!this.demon?.alive && this.demon.bounty?.name === this.def?.name; }
  get pos() { return this.alive ? this.demon.pos : null; }
  get hunting() { return !!this.job && this.jobs.status(this.job) === 'active'; }

  update(dt, car, playing) {
    if (!playing || !this.def || !this.hunting) return;
    if (this.alive) return;
    // Not out there (yet, or it got cleared away by a wreck): put it somewhere far.
    if ((this.wait -= dt) > 0) return;
    this.wait = 5;
    const p = this.#spot(car.currPos);
    if (p) this.demon = this.demons.spawnBounty(this.def.type, p, { name: this.def.name, hpMult: this.def.hpMult });
  }

  // Somewhere 250-450 m away, on solid ground, out of the base and the boss arena.
  #spot(from) {
    const boss = this.demons.boss;
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = 250 + Math.random() * 200;
      const x = from.x + Math.cos(a) * r, z = from.z + Math.sin(a) * r;
      if (Math.abs(x) > this.demons.mapHalf || Math.abs(z) > this.demons.mapHalf) continue;
      if (!terrain.spawnable(x, z)) continue;
      if ((terrain.depth?.(x, z) || 0) > 0.5 || (terrain.mud?.(x, z) || 0) > 0.5) continue;
      if (boss && Math.hypot(x - boss.arenaCenter.x, z - boss.arenaCenter.z) < boss.arenaRadius + 40) continue;
      if (this.demons.base?.contains({ x, z }, 30)) continue;
      return new THREE.Vector3(x, 0, z);
    }
    return null;
  }

  // Each frame: the name tag follows it around.
  render() {
    const d = this.alive ? this.demon : null;
    this.tag.visible = !!d;
    if (!d) return;
    this.tag.position.set(d.pos.x, d.pos.y + 3.2 * d.size + 1.5, d.pos.z);
    const frac = Math.max(0, d.hp / d.bounty.maxHp);
    if (Math.abs(frac - this.drawnHp) < 0.005) return;
    this.drawnHp = frac;
    const c = this.canvas.getContext('2d');
    c.clearRect(0, 0, 512, 128);
    c.font = 'bold 44px Arial Black, Impact, sans-serif';
    c.textAlign = 'center';
    c.lineWidth = 8; c.strokeStyle = '#000';
    const text = `☠ ${this.def.name.toUpperCase()}`;
    c.strokeText(text, 256, 52, 500);
    c.fillStyle = '#ffc040'; c.fillText(text, 256, 52, 500);
    c.fillStyle = '#000c'; c.fillRect(56, 76, 400, 26);
    c.fillStyle = frac < 0.5 ? '#ff4020' : '#ffc040'; c.fillRect(60, 80, 392 * frac, 18);
    this.tex.needsUpdate = true;
  }

  // Was this kill the bounty?
  isBounty(d) { return !!d.bounty && d.bounty.name === this.def?.name; }
}
