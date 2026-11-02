// REGION 7 — THE IRON FOUNDRY
// The Throne's industrial hell, where Hell's oil is refined and its war
// machines are built. Everything here is out to get you:
//  - gun TURRETS on towers fire bursts of shells (blow them up; Radar
//    Jammers make them miss)
//  - CONVEYOR BELTS carry you along (or back where you came from)
//  - CRUSHERS slam down over the belts on a rhythm (watch the red light)
//  - runaway ORE CARTS roll back and forth on their rails
//  - MAGNET towers switch on and pull your car in: the more parts, the
//    harder (Degaussers shield you)
//  - channels of MOLTEN METAL burn like lava (cross on the bridges)
// The Iron Colossus guards the foundry yard in the south-east.

// A belt from a to b, and a crusher across it at fraction f of the way.
const along = (from, to, f) => [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f];
const yawOf = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]);
const BELTS = [
  { from: [-60, 70], to: [-60, 620], width: 10, speed: 9 },     // north, toward the teleporter
  { from: [700, -80], to: [100, -80], width: 10, speed: 9 },     // west (against you, going east)
  { from: [180, -180], to: [420, -420], width: 10, speed: 10 },  // toward the foundry yard
  { from: [-420, -300], to: [-70, -300], width: 10, speed: 8 },  // east
  { from: [300, 300], to: [900, 300], width: 10, speed: 9 },     // east
  { from: [-180, 760], to: [-420, 760], width: 9, speed: 8 },    // west
];
const crusher = (b, f, offset) => { const [x, z] = along(BELTS[b].from, BELTS[b].to, f); return { x, z, yaw: yawOf(BELTS[b].from, BELTS[b].to), size: 4.5, offset }; };

// Turrets scattered over the map, but not on the start, the belts, the
// teleporter or the boss's yard. (A fixed pattern, so it's the same every visit.)
function turretSpots() {
  const out = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const clear = (x, z) => Math.hypot(x, z) > 140 && Math.hypot(x - 600, z + 650) > 120 && Math.hypot(x + 500, z - 450) > 70
    && Math.abs(x + 450) > 25 && Math.abs(z + 460) > 25 // (not in the molten channels)
    && BELTS.every((b) => {
      const [ax, az] = b.from, [bx, bz] = b.to, len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len;
      const t = Math.min(len, Math.max(0, (x - ax) * tx + (z - az) * tz));
      return Math.hypot(x - ax - tx * t, z - az - tz * t) > 18;
    });
  while (out.length < 34) {
    const x = (rnd() - 0.5) * 2000, z = (rnd() - 0.5) * 2000;
    if (clear(x, z)) out.push([Math.round(x), Math.round(z)]);
  }
  return out;
}

export default {
  id: 'iron_foundry',
  name: 'The Iron Foundry',
  tagline: 'Everything here is a machine. Including the floor.',

  palette: {
    sky: 0x160a06,
    fog: 0x34201a,
    groundA: 0x5a544c, // soot and cast iron
    groundB: 0x4c4741,
    groundC: 0x645d54,
    rock: 0x3a3632,
    bone: 0xc8bca4,
    deadTree: 0x1a1612,
    steel: 0x6e7078,
    lava: 0xffa030,    // molten metal
    sun: 0xffbc88,
    ambientSky: 0xb8988a,
    ambientGround: 0x241208,
  },

  terrain: { size: 2200, patchSize: 12 },

  // It's all indoors: one gigantic factory hall with a steel roof 42 m up,
  // held up by columns every 110 m.
  indoor: { height: 42, grid: 110 },

  // Channels of molten metal (straight, with steel bridges)
  hazards: {
    lavaRivers: [
      { points: [[-1100, -460], [1100, -460]], width: 18, straight: true, bridges: [0.2, 0.45, 0.7, 0.88] },
      { points: [[-450, -1100], [-450, 1100]], width: 16, straight: true, bridges: [0.15, 0.36, 0.5, 0.66, 0.85] },
    ],
  },

  belts: BELTS,
  crushers: [crusher(0, 0.35, 0), crusher(0, 0.7, 1.4), crusher(2, 0.55, 0.6), crusher(3, 0.5, 2.0), crusher(4, 0.45, 1.0), crusher(1, 0.6, 2.5)],
  rails: [
    { from: [-420, 150], to: [-110, 150], carts: 2 },
    { from: [250, 100], to: [250, 600], carts: 2 },
    { from: [-250, -900], to: [-250, -520], carts: 2 },
    { from: [700, 0], to: [1000, 0], carts: 1 },
    { from: [-900, 500], to: [-900, 950], carts: 2 },
  ],
  magnets: [
    { x: 330, z: 120, radius: 55 }, { x: -380, z: 380, radius: 55 }, { x: -300, z: -650, radius: 55 },
    { x: 820, z: -200, radius: 55 }, { x: 120, z: 520, radius: 55 }, { x: -800, z: -100, radius: 55 },
  ],
  turrets: turretSpots(),

  props: [
    { type: 'smokestack', count: 110,  minScale: 0.7, maxScale: 1.3, solid: true },
    { type: 'girder',     count: 130,  minScale: 0.8, maxScale: 1.2, solid: true },
    { type: 'barrels',    count: 320,  minScale: 0.9, maxScale: 1.2, solid: true },
    { type: 'scrapPile',  count: 300,  minScale: 0.8, maxScale: 2.2, solid: true },
    { type: 'rock',       count: 120,  minScale: 0.6, maxScale: 1.6, solid: true },
    { type: 'pebble',     count: 3000, minScale: 0.15, maxScale: 0.45, solid: false },
  ],
  clearRadiusAtStart: 45,
  attractCenter: { x: 0, z: 160 },

  // The hell-magic source: north-west, at the end of the north belt.
  teleporter: { x: -500, z: 450, radius: 14 },

  demons: [
    { type: 'ironHusk',   weight: 6 },
    { type: 'fireImp',    weight: 6 },
    { type: 'hound',      weight: 3, minDistance: 120 },
    { type: 'spitter',    weight: 3, minDistance: 180 },
    { type: 'magmaBrute', weight: 2, minDistance: 350 },
  ],

  gatingRule: {
    requires: 'nerve',
    description: 'Turrets shoot (RADAR JAMMERS make them miss), belts carry you, crushers slam on a rhythm, ore carts run you over, MAGNETS pull your car in (DEGAUSSERS help), molten metal burns.',
  },

  boss: {
    type: 'ironColossus',
    name: 'The Iron Colossus',
    arena: { x: 600, z: -650, radius: 60, style: 'yard' },
    look: { mech: true, skin: 0x8a8e96, dark: 0x3a3a42, glow: 0xff7020, eye: 0xff3020 },
    summons: [['ironHusk', 5], ['fireImp', 8], ['ironHusk', 5]],
    throwKind: 'missile',
    throwCount: 4,
  },

  radio: { arrive: 'foundryArrive', nearBoss: 'nearIronColossus', bossAwake: 'ironColossusAwake', bossDead: 'ironColossusDead' },
};
