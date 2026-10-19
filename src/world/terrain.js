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
  // Slope: how much the ground rises per meter in x and in z.
  gradient(x, z) {
    const e = 1.5;
    return { x: (current.height(x + e, z) - current.height(x - e, z)) / (2 * e), z: (current.height(x, z + e) - current.height(x, z - e)) / (2 * e) };
  },
  get flat() { return current.flat; },
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
  if (!T.hills && !T.mountains) { current = flatTerrain(); return terrain; }
  current = hillyTerrain(region);
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
