// REGION 9 — THE MIRROR WASTES
// The last stretch before the Throne: a canyon of mirrors under a mirrored
// sky. Nothing here can be trusted:
//  - the canyon walls and floor are polished glass and chrome
//  - the CEILING is one enormous mirror (you see the world upside down above you)
//  - MIRRORS stand along the road: some are real (solid; ram or shoot them
//    to shatter them), some are only reflections (drive right through)
//  - now and then a mirror spits out a CLONE: a dark copy of your own car
//  - framed TELEPORT MIRRORS across the road send you somewhere else
//  - some of the demons are only reflections too (harmless; they shatter)
//  - a few mirror chasms to jump
// The Reflection, a giant copy of your car, waits in the great mirror bowl.

const PATH = [[0, -80], [0, 250], [-300, 450], [-650, 380], [-850, 50], [-700, -350], [-300, -550], [150, -450],
  [450, -650], [800, -500], [900, -100], [650, 250], [700, 600], [1000, 800]];

// Points along the path (s = meters from the start)
function along(s) {
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], len = Math.hypot(bx - ax, bz - az);
    if (s <= len) return { x: ax + (bx - ax) * s / len, z: az + (bz - az) * s / len, tx: (bx - ax) / len, tz: (bz - az) / len };
    s -= len;
  }
  return null;
}
const TOTAL = PATH.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1]), 0);

// Mirrors along both sides of the road, every ~65 m, about 60% real.
function monoliths() {
  const out = [];
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let s = 120; s < TOTAL - 200; s += 55 + rnd() * 25) {
    const p = along(s), side = rnd() < 0.5 ? 1 : -1, off = 10 + rnd() * 9;
    out.push([Math.round(p.x + p.tz * side * off), Math.round(p.z - p.tx * side * off), Math.atan2(p.tx, p.tz) + Math.PI / 2 + (rnd() - 0.5) * 0.5, rnd() < 0.6]);
  }
  return out;
}
// Teleport mirrors: pairs, standing across the road.
const portal = (f) => { const p = along(f * TOTAL); return [Math.round(p.x), Math.round(p.z), Math.atan2(p.tx, p.tz)]; };

export default {
  id: 'mirror_wastes',
  name: 'The Mirror Wastes',
  tagline: 'Which one of you is real?',
  noSky: true, // (there's a mirror ceiling instead)

  palette: {
    sky: 0x140a1a,
    fog: 0x2a2238,
    groundA: 0x2e2e3a, // dark glass
    groundB: 0x26262f,
    groundC: 0x383844,
    cliff: 0xa8acb8,   // silver mirror walls
    peak: 0xc8ccd8,
    abyss: 0x14081e,
    rock: 0x5a5a6a,
    bone: 0xd8dce8,
    deadTree: 0x8a8a9a, // (chrome trees)
    lava: 0x9a70ff,     // (violet glows)
    sun: 0xe8dcff,
    ambientSky: 0xa898c0,
    ambientGround: 0x201828,
  },

  terrain: { size: 2600, patchSize: 8 },

  canyon: {
    path: PATH,
    width: [24, 42],
    wall: 52,
    hazards: false, // (no wind or rockslides here)
    gaps: [{ at: 0.2, len: 16 }, { at: 0.48, len: 18 }, { at: 0.8, len: 20 }],
    ledges: [{ from: 0.62, to: 0.66, side: 1 }],
    bowls: [{ x: -850, z: 50, r: 55 }, { x: 1000, z: 800, r: 100 }], // the teleporter, the great mirror bowl
  },

  mirror: {
    ceiling: 75,
    illusions: 0.3, // share of demons that are only reflections
    monoliths: monoliths(),
    portals: [[portal(0.12), portal(0.58)], [portal(0.33), portal(0.9)], [portal(0.45), portal(0.06)]],
  },

  props: [
    { type: 'glassShard', count: 500,  minScale: 0.8, maxScale: 2.6, solid: true },
    { type: 'rock',       count: 300,  minScale: 0.6, maxScale: 2.0, solid: true },
    { type: 'deadTree',   count: 160,  minScale: 0.8, maxScale: 1.4, solid: true },
    { type: 'skull',      count: 80,   minScale: 0.8, maxScale: 1.6, solid: true },
    { type: 'pebble',     count: 3000, minScale: 0.15, maxScale: 0.45, solid: false },
  ],
  clearRadiusAtStart: 40,
  attractCenter: { x: 0, z: 120 },

  teleporter: { x: -850, z: 50, radius: 14 },

  demons: [
    { type: 'imp',         weight: 6 },
    { type: 'hound',       weight: 4, minDistance: 120 },
    { type: 'frostWraith', weight: 3, minDistance: 150 },
    { type: 'boneArcher',  weight: 2, minDistance: 200 },
    { type: 'ironHusk',    weight: 2, minDistance: 250 },
    { type: 'brute',       weight: 1, minDistance: 400 },
  ],

  gatingRule: {
    requires: 'wits',
    description: 'Mirrors everywhere: some are real (ram or shoot to shatter), some are just reflections (drive through). Teleport mirrors send you elsewhere. Your own reflection may come after you.',
  },

  boss: {
    type: 'reflection',
    name: 'The Reflection',
    arena: { x: 1000, z: 800, radius: 80, style: 'mirrorBowl' },
  },

  radio: { arrive: 'mirrorArrive', nearBoss: 'nearReflection', bossAwake: 'reflectionAwake', bossDead: 'reflectionDead' },
};
