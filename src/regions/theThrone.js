// REGION 10 — THE THRONE (the finale)
// A golden road up through a burning canyon to the palace of the Devil,
// CEO of Infernal Petroleum Inc. The road is a GAUNTLET of everything
// Hell has thrown at you so far, one stretch after another:
//   LAVA channels  →  ICE sheets  →  BLOOD-MUD  →  the FOUNDRY (turrets,
//   magnets, crushers, a belt running against you)  →  MIRRORS
// with chasms to jump between them, screaming wind and rockslides all the
// way, and the worst demons from every region. At the top: the palace,
// and the Throne.

const PATH = [[0, -80], [0, 350], [350, 650], [300, 1000], [-150, 1250], [-650, 1200], [-1000, 900], [-1050, 450],
  [-750, 100], [-900, -350], [-600, -750], [-100, -900], [400, -800], [800, -550], [1050, -150], [1150, 350], [1100, 850]];
const TOTAL = PATH.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1]), 0);
// A point on the road, f = 0 (start) .. 1 (the palace), side = meters to the right
function at(f, side = 0) {
  let s = f * TOTAL;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], len = Math.hypot(bx - ax, bz - az);
    if (s <= len || i === PATH.length - 2) {
      const tx = (bx - ax) / len, tz = (bz - az) / len;
      return { x: Math.round(ax + tx * s + tz * side), z: Math.round(az + tz * s - tx * side), tx, tz, yaw: Math.atan2(tx, tz) };
    }
    s -= len;
  }
}
const pt = (f, side = 0) => { const p = at(f, side); return [p.x, p.z]; };

// LAVA: channels straight across the road, each with one crust bridge in the middle.
const lavaChannel = (f) => { const p = at(f); return { points: [[p.x - p.tz * 90, p.z + p.tx * 90], [p.x + p.tz * 90, p.z - p.tx * 90]], width: 16, straight: true, bridges: [0.5] }; };

const TELEPORTER = at(0.47, 0);
const PALACE = at(1);

export default {
  id: 'the_throne',
  name: 'The Throne',
  tagline: 'Time to talk about gas prices.',
  finale: true,

  palette: {
    sky: 0x1a0204,
    fog: 0x4a1408,
    groundA: 0x2a1c18, // scorched rock
    groundB: 0x22161a,
    groundC: 0x342420,
    cliff: 0x140c0c,   // black obsidian walls
    peak: 0x3a2018,
    abyss: 0x3a0800,
    rock: 0x2a1a16,
    bone: 0xd8cbb0,
    deadTree: 0x140c0a,
    ice: 0x8ac4e8,
    mud: 0x2e1410,
    blood: 0x5a0608,
    steel: 0x5a5c62,
    gold: 0xf0c040,
    lava: 0xff5a10,
    sun: 0xffa070,
    ambientSky: 0xb07060,
    ambientGround: 0x300a04,
  },

  terrain: { size: 3000, patchSize: 8 },

  canyon: {
    path: PATH,
    width: [26, 42],
    wall: 70,
    floorBumps: 0, // (dead flat, so the lava and ice lie right)
    gaps: [{ at: 0.15, len: 16 }, { at: 0.27, len: 18 }, { at: 0.39, len: 18 }, { at: 0.64, len: 20 }, { at: 0.8, len: 20 }, { at: 0.87, len: 22 }],
    ledges: [{ from: 0.41, to: 0.44, side: 1 }],
    bowls: [{ x: TELEPORTER.x, z: TELEPORTER.z, r: 45 }, { x: PALACE.x, z: PALACE.z, r: 115 }],
  },

  // 1. LAVA
  hazards: { lavaRivers: [lavaChannel(0.05), lavaChannel(0.085), lavaChannel(0.12)] },
  // 2. ICE (only in these patches)
  ice: { scale: 100, threshold: 2, carve: 0.5, level: -0.3, localOnly: true, pools: [{ x: pt(0.19)[0], z: pt(0.19)[1], r: 48, depth: 0.6 }, { x: pt(0.23)[0], z: pt(0.23)[1], r: 48, depth: 0.6 }] },
  // 3. BLOOD-MUD (only in these patches)
  bog: { scale: 100, threshold: 2, carve: 0.65, level: -0.42, localOnly: true, pools: [{ x: pt(0.31)[0], z: pt(0.31)[1], r: 48, depth: 0.5 }, { x: pt(0.35)[0], z: pt(0.35)[1], r: 48, depth: 0.5 }] },
  // 4. THE FOUNDRY
  turrets: [0.51, 0.53, 0.55, 0.57, 0.59, 0.61].flatMap((f, i) => [pt(f, (i % 2 ? 1 : -1) * 20)]),
  magnets: [[0.54, 18], [0.6, -18]].map(([f, side]) => { const [x, z] = pt(f, side); return { x, z, radius: 50 }; }),
  crushers: [0.555, 0.585].map((f, i) => { const p = at(f); return { x: p.x, z: p.z, yaw: p.yaw, size: 6, offset: i * 1.7 }; }),
  belts: [{ from: pt(0.535), to: pt(0.505), width: 12, speed: 9 }], // runs AGAINST you
  // 5. MIRRORS
  mirror: {
    ceiling: false, glassFloor: false, illusions: 0.12,
    monoliths: [0.66, 0.675, 0.69, 0.705, 0.72, 0.735, 0.75, 0.765].map((f, i) => { const p = at(f, (i % 2 ? 1 : -1) * 14); return [p.x, p.z, p.yaw + Math.PI / 2, i % 3 !== 1]; }),
    portals: [],
  },
  goldenRoad: true,

  props: [
    { type: 'rock',      count: 600,  minScale: 0.8, maxScale: 3.0, solid: true },
    { type: 'boneSpike', count: 250,  minScale: 1.0, maxScale: 2.6, solid: true },
    { type: 'skull',     count: 150,  minScale: 0.8, maxScale: 2.0, solid: true },
    { type: 'barrels',   count: 200,  minScale: 0.9, maxScale: 1.2, solid: true },
    { type: 'pebble',    count: 3000, minScale: 0.15, maxScale: 0.45, solid: false },
  ],
  clearRadiusAtStart: 40,
  attractCenter: { x: 0, z: 150 },

  teleporter: { x: TELEPORTER.x, z: TELEPORTER.z, radius: 14 },

  // The worst of every region
  demons: [
    { type: 'fireImp',    weight: 5 },
    { type: 'security',   weight: 4, minDistance: 100 },
    { type: 'hound',      weight: 3, minDistance: 100 },
    { type: 'boneRam',    weight: 3, minDistance: 150 },
    { type: 'harpy',      weight: 3, minDistance: 150 },
    { type: 'bloater',    weight: 2, minDistance: 200 },
    { type: 'ironHusk',   weight: 2, minDistance: 250 },
    { type: 'frostBrute', weight: 1, minDistance: 350 },
    { type: 'magmaBrute', weight: 1, minDistance: 350 },
  ],

  gatingRule: {
    requires: 'everything',
    description: 'The golden road to the Throne: lava, ice, blood-mud, turrets and magnets, mirrors, chasms, wind and rockslides. Everything you\'ve learned. Then the Devil himself.',
  },

  boss: {
    type: 'devil',
    name: 'The Devil, CEO',
    arena: { x: PALACE.x, z: PALACE.z, radius: 95, style: 'palace' },
  },

  radio: { arrive: 'throneArrive', nearBoss: 'nearDevil', bossAwake: 'devilAwake', bossDead: 'devilDead' },
};
