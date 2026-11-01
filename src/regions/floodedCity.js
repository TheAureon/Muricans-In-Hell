// REGION 4 — THE FLOODED CITY OF THE DAMNED
// A drowned hell-city: a grid of flooded streets (canals) between blocks of
// ruined buildings, old rivers winding through it all, crossed by stone
// bridges. Shallow water slows you down;
// deep water floods your engine unless you've bolted on PONTOONS (then you
// float, slow and slidey, like a boat). Treads are too heavy to float.
// The Drowned Leviathan lives in the lake of the old plaza.

// Flooded streets: a straight canal from one end of the map to the other.
// Bridges at 1/4, 1/2 and 3/4 of the way along each one.
const canal = (points, width) => ({ points, width, depth: 1.7, bridges: [0.25, 0.5, 0.75] });

// Old rivers that were here before the city: they wind through the blocks
// (through the given points, snaking side to side by `wiggle` m), with a
// bridge about every 220 m.
function river(points, width, wiggle = 30, phase = 0) {
  const out = [];
  let s = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i], [bx, bz] = points[i + 1];
    const len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len, nz = (bx - ax) / len;
    const steps = Math.max(1, Math.round(len / 25));
    for (let k = 0; k < steps; k++) {
      const t = k / steps, d = s + len * t;
      // (no wiggle at the very ends, so it meets the map edge / lake cleanly)
      const w = Math.sin(d / 140 + phase) * wiggle * Math.min(1, d / 80, i < points.length - 2 ? 1 : (1 - t) * len / 80);
      out.push([Math.round(ax + (bx - ax) * t + nx * w), Math.round(az + (bz - az) * t + nz * w)]);
    }
    s += len;
  }
  out.push(points[points.length - 1]);
  const n = Math.max(1, Math.floor(s / 220));
  return { points: out, width, depth: 1.8, bridges: Array.from({ length: n }, (_, k) => (k + 0.5) / n) };
}

export default {
  id: 'flooded_city',
  name: 'The Flooded City',
  tagline: 'Pontoons or pray.',

  palette: {
    sky: 0x160a0c,
    fog: 0x2a1c1e,
    groundA: 0x6a625a, // old paving stones
    groundB: 0x5a534c,
    groundC: 0x746a5e,
    cliff: 0x2a2622,   // canal walls
    rock: 0x5a544c,
    bone: 0xc8bca4,
    deadTree: 0x1a1612,
    stone: 0x7a7468,
    stoneDark: 0x3a3632,
    water: 0x1e6a64,
    bed: 0x0c1412,     // muddy bottom
    lava: 0x60ffd0,    // (ghostly glows)
    sun: 0xffc8a0,
    ambientSky: 0xb09098,
    ambientGround: 0x201416,
  },

  terrain: { size: 2000, patchSize: 7 },

  water: {
    level: -0.3,
    bank: 7,
    canals: [
      canal([[-720, -1000], [-720, 1000]], 30), canal([[-260, -1000], [-260, 1000]], 26),
      canal([[260, -1000], [260, 1000]], 26), canal([[720, -1000], [720, 1000]], 32),
      canal([[-1000, -720], [1000, -720]], 32), canal([[-1000, -260], [1000, -260]], 26),
      canal([[-1000, 260], [1000, 260]], 28), canal([[-1000, 720], [1000, 720]], 30),
      // Winding rivers through the blocks
      river([[-1000, 560], [-500, 400], [-120, 500], [380, 430], [1000, 560]], 22, 35, 0.5),  // the Old River (north)
      river([[-1000, -60], [-720, -130], [-580, -360], [-535, -440]], 26, 25, 2.0),           // feeds the plaza lake
      river([[-440, -545], [-200, -620], [150, -560], [520, -640], [1000, -540]], 24, 30, 1.2), // drains it, out to the east
      river([[880, 1000], [840, 520], [930, 180], [860, -200], [930, -1000]], 20, 25, 3.1),   // the east river
      river([[-1000, 880], [-420, 900], [120, 860], [600, 940], [1000, 880]], 18, 30, 4.0),   // along the north edge
    ],
    lakes: [{ x: -490, z: -490, r: 70, depth: 3.5 }], // the drowned plaza (boss)
  },

  props: [
    { type: 'ruin',     count: 650, minScale: 0.8, maxScale: 1.7, solid: true },
    { type: 'column',   count: 160, minScale: 0.8, maxScale: 1.4, solid: true },
    { type: 'carWreck', count: 200, minScale: 0.9, maxScale: 1.1, solid: true },
    { type: 'rock',     count: 260, minScale: 0.6, maxScale: 1.8, solid: true },
    { type: 'deadTree', count: 90,  minScale: 0.8, maxScale: 1.3, solid: true },
    { type: 'skull',    count: 60,  minScale: 0.6, maxScale: 1.4, solid: true },
    { type: 'pebble',   count: 4000, minScale: 0.15, maxScale: 0.45, solid: false },
  ],
  clearRadiusAtStart: 45,
  attractCenter: { x: 0, z: 140 },

  // The hell-magic source: a dry square in the east.
  teleporter: { x: 490, z: 0, radius: 14 },

  demons: [
    { type: 'drowned', weight: 10 },
    { type: 'imp',     weight: 4 },
    { type: 'hound',   weight: 3, minDistance: 120 },
    { type: 'bloater', weight: 3, minDistance: 150 },
    { type: 'spitter', weight: 3, minDistance: 200 },
    { type: 'brute',   weight: 2, minDistance: 350 },
  ],

  gatingRule: {
    requires: 'float',
    description: 'Flooded streets! Shallow water slows you. Deep water floods your engine: bolt on 2 PONTOONS to float (wheels only: treads sink). Cross on the bridges.',
  },

  boss: {
    type: 'leviathan',
    name: 'The Drowned Leviathan',
    arena: { x: -490, z: -490, radius: 70, style: 'lake' },
    look: { skin: 0x2a4a48, dark: 0x14242a, belly: 0x8a9a7a, glow: 0x60ffd0, eye: 0xd0fff0, horn: 0xc8c0a8 },
    summons: [['drowned', 12], ['bloater', 2]],
  },

  radio: { arrive: 'floodArrive', nearBoss: 'nearLeviathan', bossAwake: 'leviathanAwake', bossDead: 'leviathanDead' },
};
