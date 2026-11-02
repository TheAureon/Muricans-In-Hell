// TERRAIN HEIGHT: how high the ground is at any (x, z).
// Flat regions (Ash Plains, Lava Rivers) are simply 0 everywhere. Hilly
// regions describe their hills and mountains in the region file:
//   terrain: { hills: { amp, scale }, mountains: { amp, scale } }
// Some spots are flattened (the start, the boss arena, the teleporter...)
// so things can be built there. Everything that touches the ground (the
// car, demons, scenery, gore, souls, the aim marker) asks this module.
import { makeRandom } from '../core/random.js';

let current = flatTerrain();
export const terrain = {
  height: (x, z) => current.height(x, z),
  // The ground you SEE (the swamp's mud bottom under its pools of blood);
  // height() is what you stand on (the blood's surface there).
  visualHeight: (x, z) => (current.visualHeight || current.height)(x, z),
  // Slope: how much the ground rises per meter in x and in z.
  gradient(x, z) {
    const e = 1.5;
    return { x: (current.height(x + e, z) - current.height(x - e, z)) / (2 * e), z: (current.height(x, z + e) - current.height(x, z - e)) / (2 * e) };
  },
  get flat() { return current.flat; },
  // WATER (Flooded City): the water surface height, and how deep the water
  // is at (x, z) (0 = dry).  wet(x, z, margin) = in or near water.
  get waterLevel() { return current.water?.level ?? null; },
  depth(x, z) { return current.water ? Math.max(0, current.water.level - current.height(x, z)) : 0; },
  wet(x, z, margin = 0) { return current.water ? current.water.carve(x, z, margin) > 0 : false; },
  get bridges() { return current.water?.bridges || []; },
  // BOG (Blood Swamp): how muddy (x, z) is, 0 (dry) .. 1 (deep blood-mud),
  // the level of the blood pools, and the boardwalks (dry paths).
  mud(x, z) { return current.bog ? current.bog.mud(x, z) : 0; },
  get bogLevel() { return current.bog?.level ?? null; },
  get walks() { return current.bog?.walks || []; },
  // ICE (Ice Hell): how icy (x, z) is, 0 (snow) .. 1 (sheer ice), and the
  // level of the frozen sheets.
  ice(x, z) { return current.ice ? current.ice.mud(x, z) : 0; },
  get iceLevel() { return current.ice?.level ?? null; },
  get canals() { return current.water?.canals || []; },
  // Where a ray first hits the ground (null if it doesn't within maxDist).
  raycast(origin, dir, maxDist = 500) {
    if (current.flat) {
      if (dir.y >= -1e-4) return null;
      const t = -origin.y / dir.y;
      return t > 0 && t < maxDist ? origin.clone().addScaledVector(dir, t) : null;
    }
    let prevT = 0;
    for (let t = 1; t < maxDist; t += 1.5) {
      const x = origin.x + dir.x * t, y = origin.y + dir.y * t, z = origin.z + dir.z * t;
      if (y <= current.height(x, z)) {
        let a = prevT, b = t; // refine
        for (let k = 0; k < 8; k++) {
          const m = (a + b) / 2;
          if (origin.y + dir.y * m <= current.height(origin.x + dir.x * m, origin.z + dir.z * m)) b = m; else a = m;
        }
        return origin.clone().addScaledVector(dir, b);
      }
      prevT = t;
    }
    return null;
  },
};

// Set up the terrain for a region (call once, before building the world).
export function setupTerrain(region) {
  const T = region.terrain || {};
  current = !T.hills && !T.mountains ? flatTerrain() : hillyTerrain(region);
  if (region.water) current = floodedTerrain(current, region.water);
  if (region.bog) current = boggyTerrain(current, region.bog, region.id);
  // Ice sheets are made the same way as the swamp's mud patches (frozen
  // instead of wet).
  if (region.ice) { current = boggyTerrain(current, region.ice, region.id + 'ice'); current.ice = current.bog; current.bog = null; }
  return terrain;
}

function flatTerrain() { return { flat: true, height: () => 0 }; }

function hillyTerrain(region) {
  const T = region.terrain;
  const rand = makeRandom(region.id.length * 7919 + 13);
  const perm = new Uint16Array(512);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const hash = (x, z) => perm[(perm[x & 255] + z) & 511] / 255;
  const fade = (t) => t * t * (3 - 2 * t);
  // Smooth "value noise" between random heights on a grid (0..1).
  const noise = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    const u = fade(xf), v = fade(zf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, z, oct) => { let s = 0, amp = 0.5, f = 1, n = 0; for (let o = 0; o < oct; o++) { s += noise(x * f, z * f) * amp; n += amp; amp *= 0.5; f *= 2.03; } return s / n; };
  // Ridged noise: sharp mountain crests
  const ridged = (x, z) => { let s = 0, amp = 0.55, f = 1, n = 0; for (let o = 0; o < 4; o++) { const r = 1 - Math.abs(noise(x * f, z * f) * 2 - 1); s += r * r * amp; n += amp; amp *= 0.5; f *= 2.1; } return s / n; };

  const hills = T.hills || { amp: 0, scale: 1 }, mtn = T.mountains || { amp: 0, scale: 1 };
  const natural = (x, z) => fbm(x / hills.scale + 40, z / hills.scale - 17, 3) * hills.amp
    + Math.pow(Math.max(0, ridged(x / mtn.scale + 3.3, z / mtn.scale + 9.1) - (mtn.threshold ?? 0.25)) / (1 - (mtn.threshold ?? 0.25)), 1.3) * mtn.amp;

  // Flattened spots: { x, z, r (flat radius), blend (ramp width), h (height; default = natural) }
  const flats = (T.flats || []).map((f) => ({ ...f, h: f.h ?? natural(f.x, f.z) }));
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  return {
    flat: false,
    height(x, z) {
      let h = natural(x, z);
      for (const f of flats) {
        const d = Math.hypot(x - f.x, z - f.z);
        if (d > f.r + f.blend) continue;
        const k = 1 - smooth(f.r, f.r + f.blend, d);
        h += (f.h - h) * k;
      }
      return h;
    },
  };
}

// Water carved into the ground: canals (straight flooded streets) and lakes.
//   water: { level, canals: [{ points: [[x, z], ...], width, depth, bridges: [0..1] }],
//            lakes: [{ x, z, r, depth }], bank }
// Bridges are gaps in a canal where the street carries on dry.
function floodedTerrain(base, W) {
  const bank = W.bank ?? 7; // width of the sloping edge (m)
  const segs = [], bridges = [], canals = [];
  for (const c of W.canals || []) {
    const hw = c.width / 2, list = [];
    let total = 0;
    for (let i = 0; i < c.points.length - 1; i++) {
      const [ax, az] = c.points[i], [bx, bz] = c.points[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      list.push({ ax, az, bx, bz, len, s0: total, hw, depth: c.depth ?? 1.6, tx: (bx - ax) / len, tz: (bz - az) / len });
      total += len;
    }
    for (const f of c.bridges || []) {
      const s = f * total;
      const sg = list.find((q) => s >= q.s0 && s <= q.s0 + q.len) || list[list.length - 1];
      const k = s - sg.s0;
      bridges.push({ x: sg.ax + sg.tx * k, z: sg.az + sg.tz * k, tx: sg.tx, tz: sg.tz, along: 6, across: hw + bank + 2, width: hw * 2 });
    }
    segs.push(...list);
    canals.push({ ...c, segs: list });
  }
  const lakes = (W.lakes || []).map((l) => ({ ...l, depth: l.depth ?? 3 }));
  // Lookup grid so we only test nearby canal pieces.
  const G = 60, grid = new Map();
  for (const sg of segs) {
    const pad = sg.hw + bank + 12;
    for (let gx = Math.floor((Math.min(sg.ax, sg.bx) - pad) / G); gx <= Math.floor((Math.max(sg.ax, sg.bx) + pad) / G); gx++) {
      for (let gz = Math.floor((Math.min(sg.az, sg.bz) - pad) / G); gz <= Math.floor((Math.max(sg.az, sg.bz) + pad) / G); gz++) {
        const k = gx * 100003 + gz;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(sg);
      }
    }
  }
  const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  // How far below the ground the bottom is here (0 = not water).
  // margin > 0 widens the water (to keep scenery off the banks).
  const carve = (x, z, margin = 0) => {
    let c = 0;
    const cell = grid.get(Math.floor(x / G) * 100003 + Math.floor(z / G));
    if (cell) {
      for (const sg of cell) {
        const px = x - sg.ax, pz = z - sg.az;
        const along = Math.min(sg.len, Math.max(0, px * sg.tx + pz * sg.tz));
        const d = Math.hypot(px - sg.tx * along, pz - sg.tz * along) - margin;
        if (d < sg.hw + bank) c = Math.max(c, sg.depth * (1 - smooth((d - sg.hw) / bank)));
      }
    }
    for (const l of lakes) {
      const d = Math.hypot(x - l.x, z - l.z) - margin;
      if (d < l.r + bank) c = Math.max(c, l.depth * (1 - smooth((d - l.r) / bank)) * (0.75 + 0.25 * smooth(1 - d / l.r)));
    }
    if (c > 0 && margin === 0) {
      for (const b of bridges) {
        const dx = x - b.x, dz = z - b.z;
        if (Math.abs(dx * b.tx + dz * b.tz) < b.along && Math.abs(dx * b.tz - dz * b.tx) < b.across) return 0;
      }
    }
    return c;
  };
  return {
    flat: false,
    height: (x, z) => base.height(x, z) - carve(x, z),
    water: { level: W.level ?? -0.3, carve, bridges, canals, lakes },
  };
}

// Blood-mud carved into the ground in big organic patches (from noise),
// with boardwalks (dry paths), dry spots and pools.
//   bog: { scale, threshold, carve, level, walks: [{ points, width }],
//          dry: [{ x, z, r }], pools: [{ x, z, r, depth }] }
// The deepest mud dips below the blood level, so pools of blood show there.
function boggyTerrain(base, B, seed) {
  const rand = makeRandom(seed.length * 4243 + 7);
  const perm = new Uint16Array(512);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const hash = (x, z) => perm[(perm[x & 255] + z) & 511] / 255;
  const fade = (t) => t * t * (3 - 2 * t);
  const noise = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    const u = fade(xf), v = fade(zf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, z) => (noise(x, z) * 0.6 + noise(x * 2.1, z * 2.1) * 0.28 + noise(x * 4.3, z * 4.3) * 0.12);
  const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  const walks = (B.walks || []).map((w) => {
    const segs = [];
    for (let i = 0; i < w.points.length - 1; i++) {
      const [ax, az] = w.points[i], [bx, bz] = w.points[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      segs.push({ ax, az, len, tx: (bx - ax) / len, tz: (bz - az) / len });
    }
    return { ...w, segs };
  });
  const distToWalk = (x, z, w) => {
    let best = Infinity;
    for (const sg of w.segs) {
      const px = x - sg.ax, pz = z - sg.az;
      const along = Math.min(sg.len, Math.max(0, px * sg.tx + pz * sg.tz));
      best = Math.min(best, Math.hypot(px - sg.tx * along, pz - sg.tz * along));
    }
    return best;
  };
  const scale = B.scale ?? 140, thr = B.threshold ?? 0.48;
  const mud = (x, z) => {
    let m = smooth((fbm(x / scale + 11.3, z / scale - 4.7) - thr) / 0.14);
    for (const pl of B.pools || []) {
      const d = Math.hypot(x - pl.x, z - pl.z);
      if (d < pl.r + 30) m = Math.max(m, 1 - smooth((d - pl.r) / 30));
    }
    if (m <= 0) return 0;
    for (const dr of B.dry || []) {
      const d = Math.hypot(x - dr.x, z - dr.z);
      if (d < dr.r + 25) m *= smooth((d - dr.r) / 25);
    }
    for (const w of walks) {
      if (m <= 0) break;
      const d = distToWalk(x, z, w) - w.width / 2;
      if (d < 8) m *= smooth(d / 8);
    }
    return m;
  };
  const pools = B.pools || [];
  const carve = B.carve ?? 0.7;
  const level = B.level ?? -0.3;
  const bottom = (x, z) => {
    const m = mud(x, z);
    let h = base.height(x, z) - carve * m * m;
    for (const pl of pools) {
      const d = Math.hypot(x - pl.x, z - pl.z);
      if (d < pl.r) h -= (pl.depth ?? 1) * smooth(1 - d / pl.r);
    }
    return h;
  };
  return {
    flat: false,
    // You (and the demons) slosh along just under the blood's surface;
    // heavy cars sink further in (see car.js).
    height: (x, z) => Math.max(bottom(x, z), level - 0.12),
    visualHeight: bottom,
    bog: { mud, level, walks },
    water: base.water,
  };
}
