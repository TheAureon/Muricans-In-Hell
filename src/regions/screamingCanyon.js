// REGION 8 — SCREAMING CANYON
// The oil barrels go up a long winding canyon toward the Throne. The
// canyon screams, and everything about it is out to throw you off:
//  - CHASMS cut across the canyon floor: hit the ramp fast and JUMP them
//    (fall in and you're wrecked). Jump Jets (new part) help you fly.
//  - LEDGES: stretches where half the floor has fallen away
//  - SCREAMING WIND: gusts that shove your car sideways (worse in the air)
//  - ROCKSLIDES: boulders crash down the walls and roll at you
//  - HARPIES: flying hags that swoop down and rip parts off your car
// The Harpy Queen nests in a great bowl at the far end of the canyon.

export default {
  id: 'screaming_canyon',
  name: 'Screaming Canyon',
  tagline: 'Jump, or fall forever.',

  palette: {
    sky: 0x1e0806,
    fog: 0x4a2418,
    groundA: 0x8a5a3a, // red canyon dust
    groundB: 0x7a4e32,
    groundC: 0x9a6644,
    cliff: 0x5a3020,   // the canyon walls
    peak: 0xa87a58,    // the plateau up top
    abyss: 0x2a0402,   // down in the chasms
    rock: 0x6a4030,
    bone: 0xd8cbb0,
    deadTree: 0x2a1a12,
    steel: 0x5a5c62,
    lava: 0xff5020,
    sun: 0xffb080,
    ambientSky: 0xb08070,
    ambientGround: 0x301008,
  },

  terrain: { size: 2800, patchSize: 8 },

  canyon: {
    // The canyon's middle line, from the start to the Harpy Queen's nest
    path: [[0, -80], [0, 300], [250, 600], [200, 900], [-200, 1100], [-600, 1000], [-850, 650], [-820, 250],
      [-500, 0], [-600, -400], [-300, -750], [100, -850], [500, -680], [820, -330], [1000, 100], [1080, 560]],
    width: [22, 40],
    wall: 55,
    gaps: [
      { at: 0.08, len: 14 }, { at: 0.15, len: 16 }, { at: 0.23, len: 18 }, { at: 0.36, len: 16 },
      { at: 0.47, len: 20 }, { at: 0.55, len: 18 }, { at: 0.66, len: 20 }, { at: 0.74, len: 22 }, { at: 0.86, len: 22 },
    ],
    ledges: [
      { from: 0.18, to: 0.21, side: 1 }, { from: 0.42, to: 0.45, side: -1 },
      { from: 0.60, to: 0.63, side: 1 }, { from: 0.79, to: 0.83, side: -1 },
    ],
    bowls: [{ x: -850, z: 650, r: 55 }, { x: 1080, z: 560, r: 110 }], // the teleporter's alcove, the Harpy Queen's nest
  },

  props: [
    { type: 'rock',      count: 900,  minScale: 0.8, maxScale: 3.5, solid: true },
    { type: 'boneSpike', count: 300,  minScale: 1.0, maxScale: 2.6, solid: true },
    { type: 'skull',     count: 120,  minScale: 0.8, maxScale: 2.0, solid: true },
    { type: 'deadTree',  count: 250,  minScale: 0.8, maxScale: 1.5, solid: true },
    { type: 'barrels',   count: 160,  minScale: 0.9, maxScale: 1.2, solid: true }, // (oil barrels that fell off the convoys)
    { type: 'pebble',    count: 4000, minScale: 0.15, maxScale: 0.45, solid: false },
  ],
  clearRadiusAtStart: 40,
  attractCenter: { x: 0, z: 120 },

  // The hell-magic source: in a wide alcove halfway up the canyon.
  teleporter: { x: -850, z: 650, radius: 14 },

  demons: [
    { type: 'harpy',      weight: 6 },
    { type: 'imp',        weight: 5 },
    { type: 'boneRam',    weight: 3, minDistance: 120 },
    { type: 'hound',      weight: 3, minDistance: 150 },
    { type: 'boneArcher', weight: 2, minDistance: 200 },
    { type: 'brute',      weight: 1, minDistance: 400 },
  ],

  gatingRule: {
    requires: 'jump',
    description: 'Chasms: hit the ramps FAST and jump (fall in = wrecked). Wind gusts shove you, rockslides roll at you, harpies rip parts off. JUMP JETS help you fly.',
  },

  boss: {
    type: 'harpyQueen',
    name: 'The Harpy Queen',
    arena: { x: 1080, z: 560, radius: 90, style: 'eyrie' },
    look: { skin: 0x9aa0a8, dark: 0x1a1420, feather: 0x2a1a3a, hair: 0xe8e4dc, glow: 0xff3040, eye: 0xffe060, bone: 0xd8cbb0 },
  },

  radio: { arrive: 'canyonArrive', nearBoss: 'nearHarpyQueen', bossAwake: 'harpyQueenAwake', bossDead: 'harpyQueenDead' },
};
