// HIDDEN AREAS: two secret stashes in every region, far out in the wilds:
// a ring of old standing stones around a glowing lockbox. Drive into one:
//   - a LORE NOTE (Infernal Petroleum's dirty secrets) for the NOTES page
//     of the logbook (J)
//   - a SOUL STASH
//   - sometimes a SECRET PAINT JOB for the paint shop
// Carol (who filed half these documents) crackles over the radio when
// you're getting close. What you find is kept forever, even through NEW RUN.
import * as THREE from 'three';
import { terrain } from './terrain.js';
import { makeRandom } from '../core/random.js';
import { SETTINGS } from '../settings.js';

const KEY = 'helldrive.secrets';
const GRAB = 7;    // drive this close to open it (m)
const HINT = 140;  // Carol hints when you're this close (m)

// region id -> its two stashes: { title, text (the lore note), souls, paint? }
export const SECRETS = {
  ash_plains: [
    { title: 'Memo: Site Survey #1', souls: 150, text: 'To: The CEO. From: Geology. The Ash Plains hold no oil. Recommend we stop drilling. Reply (handwritten, in red): "Drill DEEPER." Geology department was then thrown into the deeper hole.' },
    { title: 'A Very Old Gas Receipt', souls: 200, text: 'A receipt from Infernal Petroleum Station #1, dated 1,000 years before cars were invented. "Regular: one soul per gallon." Someone has written underneath: "We\'ll get them hooked first."' },
  ],
  lava_rivers: [
    { title: 'Safety Poster', souls: 250, paint: 'hellfire', text: '"DAYS WITHOUT A LAVA INCIDENT: 0." The 0 is painted on. It has never been anything else. A smaller line at the bottom: "Remember: if you fall in, that\'s on you. -Management"' },
    { title: 'Patent Application', souls: 250, text: 'Patent for "Brimstone Diesel": lava, filtered through screaming. Status: REJECTED, "Too efficient. Customers would only need to buy it once." Signed, the CEO.' },
  ],
  bone_mountains: [
    { title: 'The First Pipeline', souls: 300, text: 'Construction log, year 1: "The Bone King agreed to let our pipe through his mountains, in exchange for a crown." Year 2: "The crown was made of the construction crew." Year 3: "New construction crew hired."' },
    { title: 'Employee of the Millennium', souls: 300, text: 'A framed photo of a smiling demon in a hard hat. "Gary. 900 years, never a sick day." On the back, in Grizzle\'s handwriting: "Gary was me. They spelled it wrong for 900 years."' },
  ],
  flooded_city: [
    { title: 'Drowned Ledger', souls: 350, paint: 'ghost', text: 'Accounts for the city that used to be here. It sold its water rights to Infernal Petroleum for one barrel a year, "forever". The very next day, the company flooded it. Technically, they gave the water back.' },
    { title: 'Leviathan Feeding Schedule', souls: 350, text: 'Mon: auditors. Tue: auditors. Wed: union reps. Thu: whoever asked for a raise. Fri: auditors again (they keep sending more). Sat-Sun: closed.' },
  ],
  blood_swamp: [
    { title: 'Complaint Form', souls: 400, text: 'From: The Bog Mother. "Your pipeline is leaking oil into my swamp and my children are getting slippery." Company reply: "Thank you for your feedback. Your children are now classified as lubricant."' },
    { title: 'Waterproof Diary', souls: 400, text: 'Day 1: Hired to clean the swamp. Day 40: The swamp is cleaning ME. Day 300: I am the swamp now. Please tell my wife the swamp says hi.' },
  ],
  ice_hell: [
    { title: 'Frozen Board Meeting Minutes', souls: 450, paint: 'frostbite', text: 'Item 1: Hell is too warm for the executives. Motion to build a frozen floor for "focused thinking." Passed. Item 2: Who will guard it? "Someone cold-hearted." Every head turned to the Frozen Warden. He was the Head of Human Resources.' },
    { title: 'Thermostat Note', souls: 450, text: 'Taped to a frozen-solid thermostat set to -40: "DO NOT TOUCH. -Mgmt." Below it, in at least nine different handwritings: "please".' },
  ],
  iron_foundry: [
    { title: 'Turret Purchase Order', souls: 500, text: '10,000 automated turrets. Purpose: "employee motivation". Footnote: the turrets get a better dental plan than the employees do.' },
    { title: 'The Iron Colossus Blueprint', souls: 500, text: 'Original design: "A giant robot to build pipelines." Revision 2: "A giant robot to guard pipelines." Revision 47: "A giant robot. Make it angry." Approved.' },
  ],
  screaming_canyon: [
    { title: 'Why the Canyon Screams', souls: 550, text: 'Engineering report: the screaming is wind, through 40,000 miles of empty pipe. The pipes are empty because the oil was never there. The CEO ordered the report shredded and the canyon "louder, so nobody can think about it."' },
    { title: 'A Harpy\'s Lost & Found', souls: 550, text: 'Inventory: 3,000 hubcaps. 1 trombone. 6 tourists (returned, mostly). 1 "Buck Dawson #3 Dirt Track Champion" trophy, which Buck says he definitely did not lose in a bet.' },
  ],
  mirror_wastes: [
    { title: 'Vanity Budget', souls: 600, paint: 'mirror', text: 'Annual spending: oil exploration, 2%. Safety, 0%. Mirrors so the CEO can admire himself from every angle, 98%. Carol\'s note in the margin: "I polished every single one."' },
    { title: 'The Reflection\'s Contract', souls: 600, text: 'The CEO\'s reflection is legally a separate employee, because the CEO refused to share credit with it. It is paid in compliments. It is very, very underpaid.' },
  ],
  the_throne: [
    { title: 'The Truth About the Oil', souls: 800, paint: 'oilBaron', text: 'Top secret, the CEO\'s eyes only. "There is no oil in Hell. There never was. We sell people the IDEA of oil, so they keep burning. Keep the price going up." Price on Earth when this was written: $2 a gallon.' },
    { title: 'Carol\'s Termination Email', souls: 800, text: '"Dear Carlo, your services are no longer reqired. Please leave your stapler. -The CEO." Carol has highlighted every typo. There are eleven. She is going to frame it.' },
  ],
};

const HINT_LINES = [
  [['carol', 'Hank, I filed something around here once. Not on any map. Look around.']],
  [['carol', 'Oh! You\'re close to one of my old filing spots. It\'s hidden. Keep looking.']],
  [['carol', 'Warm... warmer... I hid company secrets around here. Drive around a bit.']],
];

export class Secrets {
  constructor(scene, region, { hud, audio, radio, jobs, souls, paints, onPaint }) {
    this.region = region;
    this.fx = { hud, audio, radio, jobs, souls, paints, onPaint };
    this.found = new Set();
    try { for (const id of JSON.parse(localStorage.getItem(KEY) || '[]')) this.found.add(id); } catch { /* fresh */ }
    this.list = (SECRETS[region.id] || []).map((s, i) => ({ ...s, id: `${region.id}:${i}` }));
    this.hinted = new Set();
    const spots = this.#spots(this.list.length);
    this.group = new THREE.Group();
    scene.add(this.group);
    const stone = new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.95, flatShading: true });
    const box = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.6, metalness: 0.3, flatShading: true });
    const glow = new THREE.MeshBasicMaterial({ color: 0xc890ff, transparent: true, opacity: 0.9 });
    this.list.forEach((s, i) => {
      s.pos = spots[i];
      if (!s.pos) return;
      const g = new THREE.Group();
      const y = terrain.height(s.pos.x, s.pos.z);
      g.position.set(s.pos.x, y, s.pos.z);
      // Standing stones in a ring (with a gap to drive in through)
      for (let k = 0; k < 7; k++) {
        const a = (k / 8) * Math.PI * 2, r = 11;
        const h = 6 + (k % 3) * 1.5;
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, h, 1.4), stone);
        m.position.set(Math.cos(a) * r, h / 2 - 0.3, Math.sin(a) * r);
        m.rotation.set(0, -a, (k % 2 ? 0.08 : -0.06));
        m.castShadow = true;
        g.add(m);
      }
      // The lockbox, glowing purple (Carol's color)
      const chest = new THREE.Group();
      chest.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1.1), box));
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 1.2), glow);
      lid.position.y = 0.6;
      chest.add(lid);
      chest.position.y = 0.6;
      g.add(chest);
      s.chest = chest;
      const light = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.8, 22, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xc890ff, transparent: true, opacity: 0.35, depthWrite: false }));
      light.position.y = 12;
      g.add(light);
      s.light = light;
      s.group = g;
      if (this.found.has(s.id)) { chest.visible = false; light.visible = false; }
      this.group.add(g);
    });
  }

  get total() { return Object.values(SECRETS).reduce((n, l) => n + l.length, 0); }
  get foundCount() { return this.found.size; }

  // Far from the start, on solid ground, out of the boss arena and the base.
  #spots(n) {
    const R = this.region, half = R.terrain.size / 2 - 80;
    const rng = makeRandom(R.id.length * 104729 + R.id.charCodeAt(0));
    const out = [];
    for (let tries = 0; tries < 4000 && out.length < n; tries++) {
      const x = (rng() * 2 - 1) * half, z = (rng() * 2 - 1) * half;
      const far = R.canyon ? 300 : 500;
      if (Math.hypot(x, z) < far) continue;
      if (!terrain.spawnable(x, z) || (terrain.depth?.(x, z) || 0) > 0.4 || (terrain.mud?.(x, z) || 0) > 0.3) continue;
      if (R.boss && Math.hypot(x - R.boss.arena.x, z - R.boss.arena.z) < R.boss.arena.radius + 60) continue;
      if (R.teleporter && Math.hypot(x - R.teleporter.x, z - R.teleporter.z) < 60) continue;
      if (out.some((p) => Math.hypot(p.x - x, p.z - z) < 500)) continue; // (spread them out)
      out.push({ x, z });
    }
    return out;
  }

  update(dt, car, playing) {
    if (!playing) return;
    const p = car.currPos;
    for (const s of this.list) {
      if (!s.pos || this.found.has(s.id)) continue;
      s.chest.rotation.y += dt * 0.8;
      const d = Math.hypot(p.x - s.pos.x, p.z - s.pos.z);
      if (d < HINT && !this.hinted.has(s.id)) {
        this.hinted.add(s.id);
        this.fx.radio.talk?.(HINT_LINES[this.found.size % HINT_LINES.length]);
      }
      if (d < GRAB && !car.wrecked) this.#open(s);
    }
  }

  #open(s) {
    if (!SETTINGS.dev.creative) {
      this.found.add(s.id);
      try { localStorage.setItem(KEY, JSON.stringify([...this.found])); } catch { /* ignore */ }
    }
    s.chest.visible = false;
    s.light.visible = false;
    const pos = new THREE.Vector3(s.pos.x, terrain.height(s.pos.x, s.pos.z) + 1.5, s.pos.z);
    this.fx.souls.burst(pos, s.souls);
    let extra = '';
    if (s.paint && this.fx.paints?.give(s.paint)) { extra = ' + a SECRET PAINT JOB!'; this.fx.onPaint?.(s.paint); }
    this.fx.hud.banner('SECRET FOUND', `📄 "${s.title}" (read it: J → NOTES) · +${s.souls} souls${extra}`, 7);
    this.fx.audio.chime();
    this.fx.jobs.emit('secret');
  }

  // The NOTES page of the logbook: every note found, in every region.
  html(regions) {
    const rows = [];
    for (const r of regions) {
      const list = SECRETS[r.id] || [];
      const notes = list.map((s, i) => (this.found.has(`${r.id}:${i}`)
        ? `<div class="nt-note"><b>📄 ${s.title}</b><p>${s.text}</p></div>`
        : '<div class="nt-note locked">🔒 Not found yet. Somewhere out in the wilds...</div>')).join('');
      rows.push(`<h3>${r.name.toUpperCase()}</h3>${notes}`);
    }
    return `<div class="jl-empty">Found ${this.foundCount} of ${this.total} secrets. Look far from the roads, for rings of standing stones. Carol will tell you when you're close.</div>${rows.join('')}`;
  }
}
