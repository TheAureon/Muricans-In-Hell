// REGION 3 — THE BONE MOUNTAINS
// The first region with real hills: rolling bone-dust valleys between
// steep ridges. Uphill slows you down, downhill speeds you up, and on a
// slope too steep for your tires you slide back down. Wheels manage the
// valleys; treads (Half-Track, HELL TANK) climb the steep stuff. The boss
// waits on the highest plateau.

export default {
  id: 'bone_mountains',
  name: 'The Bone Mountains',
  tagline: 'What goes up must slide back down.',

  palette: {
    sky: 0x1e0c14,
    fog: 0x4a2a2e,
    groundA: 0x8a7e6c, // bone dust
    groundB: 0x6e6252,
    groundC: 0x9a8a70,
    cliff: 0x4e4438,   // steep rock faces
    peak: 0xd8cfb8,    // bleached-bone high ground
    rock: 0x7a7060,
    bone: 0xe0d6bc,
    deadTree: 0x2a211d,
    lava: 0xff5a1a,
    sun: 0xffb080,
    ambientSky: 0xffa090,
    ambientGround: 0x302028,
  },

  // Hills: gentle rolling valleys + sharp mountain ridges. Flattened spots
  // (r = flat radius, blend = ramp width, h = height) for the start, the
  // teleporter and the boss's plateau.
  terrain: {
    size: 3000,
    patchSize: 12,
    hills: { amp: 8, scale: 150 },
    mountains: { amp: 85, scale: 520, threshold: 0.5 },
    flats: [
      { x: 0, z: 0, r: 60, blend: 90, h: 2 },
      { x: -300, z: 280, r: 26, blend: 60 },
      { x: -720, z: -40, r: 100, blend: 145, h: 55 },
    ],
  },

  props: [
    { type: 'rock',      count: 700, minScale: 0.8, maxScale: 3.0, solid: true },
    { type: 'boneSpike', count: 650, minScale: 1.0, maxScale: 3.0, solid: true },
    { type: 'ribArch',   count: 90,  minScale: 0.8, maxScale: 1.8, solid: true },
    { type: 'skull',     count: 160, minScale: 0.8, maxScale: 2.5, solid: true },
    { type: 'deadTree',  count: 200, minScale: 0.8, maxScale: 1.4, solid: true },
    { type: 'pebble',    count: 6000, minScale: 0.15, maxScale: 0.45, solid: false },
  ],
  clearRadiusAtStart: 45,

  // The hell-magic source for this region's teleporter.
  teleporter: { x: -300, z: 280, radius: 14 },

  demons: [
    { type: 'imp',        weight: 8 },
    { type: 'boneRam',    weight: 4, minDistance: 120 },
    { type: 'hound',      weight: 3, minDistance: 150 },
    { type: 'boneArcher', weight: 4, minDistance: 180 },
    { type: 'spiker',     weight: 2, minDistance: 260 },
    { type: 'brute',      weight: 2, minDistance: 380 },
  ],

  gatingRule: {
    requires: 'climb',
    description: 'Steep slopes! Wheels slide back down the steep stuff; treads (Half-Track, HELL TANK) climb much steeper. The boss waits on the highest plateau.',
  },

  boss: {
    type: 'boneKing',
    name: 'The Bone King',
    arena: { x: -720, z: -40, radius: 60, style: 'bones' },
    look: { skin: 0xd8cfb8, dark: 0x5a4e40, glow: 0x60ffa0, horn: 0x2a1e18, eye: 0x9affc0, vents: false, crown: true },
    summons: [['boneArcher', 4], ['boneRam', 3], ['imp', 8]],
    throwKind: 'boneBoulder',
  },

  radio: { arrive: 'boneArrive', nearBoss: 'nearBoneKing', bossAwake: 'boneKingAwake', bossDead: 'boneKingDead' },
};
