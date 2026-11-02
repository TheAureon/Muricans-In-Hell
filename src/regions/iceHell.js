// REGION 6 — ICE HELL
// The frozen bottom of Hell: a white waste of snow and great sheets of
// glassy ice, the damned frozen in it up to their necks. On ice you slide
// and drift and brake forever (Spiked Tires give the grip back), and the
// cold slowly freezes your engine unless you keep moving fast (Heaters
// help). The Frozen Warden is locked in a glacier at the edge of a frozen
// lake in the south-east.

export default {
  id: 'ice_hell',
  name: 'Ice Hell',
  tagline: 'Keep moving or freeze.',
  snow: true, // (it snows here)

  palette: {
    sky: 0x0a0e1c,
    fog: 0x5a6880,
    groundA: 0xd4dce6, // snow
    groundB: 0xc0cad6,
    groundC: 0xe2e8f0,
    cliff: 0x8a9aae,
    peak: 0xf0f4f8,
    ice: 0x8ac4e8,     // the ice sheets
    rock: 0x4e5868,
    bone: 0xd8e0e8,
    deadTree: 0x4a5262, // frost-blackened trees
    lava: 0x80e0ff,    // (glows)
    sun: 0xd0e0ff,
    ambientSky: 0x90a4c4,
    ambientGround: 0x2a3244,
  },

  terrain: { size: 2400, patchSize: 8 }, // flat: the ice does the shaping

  // Ice sheets wherever the noise says so (and the Warden's frozen lake),
  // snowy ground elsewhere. Snow roads are the grippy way through.
  ice: {
    scale: 190,
    threshold: 0.44,
    carve: 0.5,
    level: -0.3,      // the ice's surface
    walks: [
      { points: [[0, 30], [-200, 120], [-420, 220], [-600, 300]], width: 10 },               // to the teleporter
      { points: [[20, -20], [260, -230], [480, -470], [600, -560]], width: 10 },             // toward the Warden
      { points: [[-600, 300], [-300, 650], [300, 600], [720, 150], [700, -300]], width: 9 }, // the long way round
    ],
    dry: [{ x: 0, z: 0, r: 70 }, { x: -600, z: 300, r: 40 }],
    pools: [{ x: 700, z: -650, r: 70, depth: 0.8 }], // the frozen lake
  },

  props: [
    { type: 'iceSpire',     count: 380,  minScale: 0.8, maxScale: 2.6, solid: true },
    { type: 'snowDrift',    count: 600,  minScale: 0.8, maxScale: 2.2, solid: false },
    { type: 'frozenDamned', count: 260,  minScale: 0.9, maxScale: 1.5, solid: true },
    { type: 'deadTree',     count: 260,  minScale: 0.8, maxScale: 1.5, solid: true },
    { type: 'rock',         count: 260,  minScale: 0.6, maxScale: 2.2, solid: true },
    { type: 'skull',        count: 60,   minScale: 0.6, maxScale: 1.4, solid: true },
    { type: 'pebble',       count: 2500, minScale: 0.15, maxScale: 0.45, solid: false },
  ],
  clearRadiusAtStart: 45,
  attractCenter: { x: 0, z: 160 },

  // The hell-magic source: at the end of the north-west snow road.
  teleporter: { x: -600, z: 300, radius: 14 },

  demons: [
    { type: 'frostWraith', weight: 8 },
    { type: 'imp',         weight: 3 },
    { type: 'hound',       weight: 3, minDistance: 120 },
    { type: 'boneArcher',  weight: 2, minDistance: 180 },
    { type: 'spitter',     weight: 2, minDistance: 220 },
    { type: 'frostBrute',  weight: 2, minDistance: 300 },
  ],

  gatingRule: {
    requires: 'grip',
    description: 'Ice sheets: you slide, drift and brake forever (SPIKED TIRES give grip back). The cold freezes your engine unless you keep moving fast (HEATERS help).',
  },

  boss: {
    type: 'frozenWarden',
    name: 'The Frozen Warden',
    arena: { x: 700, z: -650, radius: 70, style: 'glacier' },
    look: { skin: 0x5a6a8a, dark: 0x1a2030, glow: 0x80e0ff, eye: 0xe0ffff, horn: 0x101018, ice: 0xbfe8ff, wing: 0x2a3048 },
  },

  radio: { arrive: 'iceArrive', nearBoss: 'nearWarden', bossAwake: 'wardenAwake', bossDead: 'wardenDead' },
};
