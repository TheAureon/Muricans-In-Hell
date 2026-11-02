// REGION 5 — THE BLOOD SWAMP
// A rotting bog of blood-mud, dead trees and reeds. The mud grabs HEAVY
// builds: the heavier your car, the slower you go and the deeper you sink.
// Light, fast builds skim across. Mud Tires (new part) cut the stickiness.
// Rickety boardwalks are the dry way through. The Bog Mother squats in her
// pool of blood in the south-east.

export default {
  id: 'blood_swamp',
  name: 'The Blood Swamp',
  tagline: 'Heavy sinks. Light lives.',

  palette: {
    sky: 0x1a0606,
    fog: 0x2e100c,
    groundA: 0x3e4224, // moss and rot
    groundB: 0x30341c,
    groundC: 0x4a4a2c,
    cliff: 0x2a2014,
    peak: 0x4a4430,
    mud: 0x2e1410,     // blood-mud
    blood: 0x5a0608,   // the pools
    rock: 0x3a342a,
    bone: 0xd0c4a8,
    deadTree: 0x1e1610,
    reed: 0x4a4a22,
    wood: 0x4a3420,    // boardwalks
    lava: 0xff4030,    // (glows)
    sun: 0xffc0a0,
    ambientSky: 0x98806a,
    ambientGround: 0x200808,
  },

  terrain: { size: 2400, patchSize: 8 }, // flat: the bog does the shaping

  // The bog: blood-mud wherever the noise says so, except along the
  // boardwalks and around the start and the teleporter.
  bog: {
    scale: 150,
    threshold: 0.45,
    carve: 0.65,      // the deepest mud is this far below the ground (pools of blood show there)
    level: -0.42,     // the blood's surface
    walks: [
      { points: [[0, 30], [-180, 160], [-400, 290], [-560, 420]], width: 7 },                      // to the teleporter
      { points: [[30, -10], [220, -200], [420, -420], [560, -600], [600, -650]], width: 7 },       // to the Bog Mother
      { points: [[-560, 420], [-260, 720], [260, 640], [700, 240], [660, -300], [560, -600]], width: 6 }, // the long way round
      { points: [[-30, -20], [-400, -350], [-800, -420]], width: 6 },                             // west
    ],
    dry: [{ x: 0, z: 0, r: 70 }, { x: -560, z: 420, r: 40 }],
    pools: [{ x: 650, z: -700, r: 40, depth: 1.4 }], // the Bog Mother's pool
  },

  props: [
    { type: 'deadTree',  count: 900,  minScale: 0.9, maxScale: 2.0, solid: true },
    { type: 'reed',      count: 3500, minScale: 0.8, maxScale: 1.6, solid: false },
    { type: 'rock',      count: 220,  minScale: 0.6, maxScale: 2.0, solid: true },
    { type: 'skull',     count: 90,   minScale: 0.6, maxScale: 1.6, solid: true },
    { type: 'boneSpike', count: 120,  minScale: 0.8, maxScale: 2.0, solid: true },
    { type: 'pebble',    count: 3000, minScale: 0.15, maxScale: 0.45, solid: false },
  ],
  clearRadiusAtStart: 45,
  attractCenter: { x: 0, z: 160 },

  // The hell-magic source: a dry island at the end of the north-west boardwalk.
  teleporter: { x: -560, z: 420, radius: 14 },

  demons: [
    { type: 'leech',    weight: 8 },
    { type: 'imp',      weight: 3 },
    { type: 'mireToad', weight: 3, minDistance: 120 },
    { type: 'hound',    weight: 2, minDistance: 150 },
    { type: 'bloater',  weight: 2, minDistance: 200 },
    { type: 'brute',    weight: 2, minDistance: 350 },
    { type: 'eggSac',   weight: 0 }, // (only the Bog Mother lays these)
  ],

  gatingRule: {
    requires: 'light',
    description: 'Blood-mud grabs HEAVY builds: the heavier your car, the slower you go and the deeper you sink. Go light, bolt on MUD TIRES, or stick to the boardwalks.',
  },

  boss: {
    type: 'bogMother',
    name: 'The Bog Mother',
    arena: { x: 650, z: -700, radius: 40, style: 'pool' },
    look: { skin: 0x6e7a48, dark: 0x30301a, belly: 0xc8b890, glow: 0xff4030, eye: 0xffe040, hair: 0x0e0808, bone: 0xd8cfb8, egg: 0xd0e060 },
  },

  radio: { arrive: 'swampArrive', nearBoss: 'nearBogMother', bossAwake: 'bogMotherAwake', bossDead: 'bogMotherDead' },
};
