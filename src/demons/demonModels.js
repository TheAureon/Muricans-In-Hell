// 3D shapes for the other demons. Like the imp, each is built from simple
// painted pieces merged into ONE shape, with legs/arms/head/tail tagged so
// the demon shader can animate them. All face +Z with feet at y = 0.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { piece, limb, glow, PART } from './demonShader.js';

const merged = (parts) => { const g = mergeGeometries(parts); g.computeVertexNormals(); return g; };
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cone = (r, h, s = 4) => new THREE.ConeGeometry(r, h, s);
const ico = (r) => new THREE.IcosahedronGeometry(r, 0);

// HELLHOUND: low, lean, black-red, glowing eyes, spiky back. Gallops.
export const HOUND_GORE = [0x2a0e0c, 0x5a1410, 0x9a0a0a, 0xffa020];
export function createHoundGeometry() {
  const BODY = 0x2a0e0c, RED = 0x7a1a12, EYE = glow(0xffb020), BONE = 0xd8cfb8, MOUTH = glow(0xff4010, 0.6);
  const leg = (part, x, z, front) => limb(part, [x, 0.78, z], [
    piece(box(0.16, 0.36, 0.2), BODY, x, 0.6, z + (front ? 0.02 : -0.04)),    // thigh
    piece(box(0.1, 0.36, 0.11), RED, x, 0.27, z + (front ? 0.06 : -0.08)),    // shin
    piece(box(0.14, 0.07, 0.2), BODY, x, 0.04, z + (front ? 0.1 : -0.02)),    // paw
    piece(cone(0.025, 0.08, 3), BONE, x, 0.04, z + (front ? 0.22 : 0.1), Math.PI / 2),
  ]);
  return merged([
    // Body: deep chest, thin waist, spiky back
    piece(box(0.55, 0.5, 0.6), BODY, 0, 0.82, 0.35),
    piece(box(0.42, 0.38, 0.75), BODY, 0, 0.8, -0.3),
    piece(box(0.4, 0.06, 1.2), RED, 0, 1.05, 0.0),                              // red mane stripe
    ...[-0.5, -0.2, 0.1, 0.4].map((z) => piece(cone(0.06, 0.32), RED, 0, 1.18, z, -0.4)),
    ...[-0.25, 0.0, 0.25].map((z) => piece(box(0.46, 0.04, 0.05), RED, 0, 0.7, z)), // ribs showing
    // Legs: back (PART.leg*), front (PART.arm*)
    ...leg(PART.legL, 0.2, -0.5, false), ...leg(PART.legR, -0.2, -0.5, false),
    ...leg(PART.armL, 0.22, 0.45, true), ...leg(PART.armR, -0.22, 0.45, true),
    // Head on a neck: long snout, open jaw with fangs, ears
    ...limb(PART.head, [0, 0.98, 0.6], [
      piece(box(0.26, 0.26, 0.3), BODY, 0, 1.0, 0.72, 0.3),                     // neck
      piece(box(0.42, 0.36, 0.42), BODY, 0, 1.1, 0.95),
      piece(box(0.28, 0.16, 0.42), RED, 0, 1.06, 1.3),                          // snout
      piece(box(0.24, 0.07, 0.36), BODY, 0, 0.92, 1.26, -0.25),                 // lower jaw (open)
      piece(box(0.2, 0.03, 0.3), MOUTH, 0, 0.98, 1.26),
      ...[0.08, -0.08].map((x) => piece(cone(0.035, 0.14), BONE, x, 0.96, 1.46, Math.PI)),
      ...[0.08, -0.08].map((x) => piece(cone(0.03, 0.1), BONE, x, 0.96, 1.4)),
      piece(box(0.09, 0.06, 0.04), EYE, 0.13, 1.2, 1.16),
      piece(box(0.09, 0.06, 0.04), EYE, -0.13, 1.2, 1.16),
      piece(cone(0.07, 0.3), BODY, 0.15, 1.38, 0.88, -0.3),
      piece(cone(0.07, 0.3), BODY, -0.15, 1.38, 0.88, -0.3),
    ]),
    // Tail
    ...limb(PART.tail, [0, 0.92, -0.65], [
      piece(cone(0.07, 0.5), RED, 0, 0.95, -0.9, -1.9),
      piece(cone(0.05, 0.35), RED, 0, 0.98, -1.2, -1.6),
    ]),
  ]);
}

// PINCUSHION: a squat ball of grey-purple flesh bristling with bone spikes
// that twitch and stab outward.
export const SPIKER_GORE = [0x4a3448, 0x6a4a60, 0xe0d6bc, 0x9a0a0a];
export function createSpikerGeometry() {
  const FLESH = 0x5a3a52, DARK = 0x3a2436, BONE = 0xe8dcc0, EYE = glow(0x80ff40), MOUTH = glow(0x80ff40, 0.4);
  const spikes = [];
  for (let n = 0; n < 22; n++) {
    const a = n * 2.399, y = 1 - (n / 21) * 1.7;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const dir = new THREE.Vector3(Math.cos(a) * r, y * 0.8, Math.sin(a) * r).normalize();
    const g = cone(0.07 + (n % 3) * 0.015, 0.5 + (n % 4) * 0.1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    spikes.push(piece(g, BONE, dir.x * 0.85, 0.9 + dir.y * 0.85, dir.z * 0.85));
  }
  return merged([
    piece(ico(0.78), FLESH, 0, 0.9, 0),
    piece(ico(0.5), DARK, 0, 0.75, -0.25),
    piece(box(0.13, 0.09, 0.04), EYE, 0.2, 1.08, 0.72),
    piece(box(0.13, 0.09, 0.04), EYE, -0.2, 1.08, 0.72),
    piece(box(0.09, 0.07, 0.04), EYE, 0, 1.24, 0.66),                            // third eye
    piece(box(0.36, 0.08, 0.05), MOUTH, 0, 0.82, 0.74),
    ...limb(PART.spikes, [0, 0.9, 0], spikes),
    ...limb(PART.legL, [0.32, 0.38, 0], [piece(box(0.2, 0.38, 0.22), DARK, 0.32, 0.2, 0), piece(box(0.24, 0.07, 0.3), DARK, 0.32, 0.03, 0.06)]),
    ...limb(PART.legR, [-0.32, 0.38, 0], [piece(box(0.2, 0.38, 0.22), DARK, -0.32, 0.2, 0), piece(box(0.24, 0.07, 0.3), DARK, -0.32, 0.03, 0.06)]),
    ...limb(PART.armL, [0.6, 0.9, 0.3], [piece(box(0.1, 0.3, 0.1), FLESH, 0.65, 0.76, 0.35), piece(cone(0.04, 0.16, 3), BONE, 0.65, 0.58, 0.38, Math.PI)]),
    ...limb(PART.armR, [-0.6, 0.9, 0.3], [piece(box(0.1, 0.3, 0.1), FLESH, -0.65, 0.76, 0.35), piece(cone(0.04, 0.16, 3), BONE, -0.65, 0.58, 0.38, Math.PI)]),
  ]);
}

// CINDER SPITTER: tall and thin, long neck, glowing fire sac on its belly.
export const SPITTER_GORE = [0x6a2a10, 0xff7a20, 0xffc040, 0x3a1a10];
export function createSpitterGeometry() {
  const SKIN = 0x5a2410, DARK = 0x2a1008, GLOW = glow(0xff8a20), HOT = glow(0xffc040), EYE = glow(0xffee60);
  return merged([
    // Legs: backward-bent like a bird's
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.legL : PART.legR, [s * 0.16, 0.95, 0], [
      piece(box(0.13, 0.5, 0.15), DARK, s * 0.16, 0.72, 0.06, 0.3),
      piece(box(0.1, 0.5, 0.1), SKIN, s * 0.16, 0.3, -0.02, -0.25),
      piece(box(0.16, 0.06, 0.24), DARK, s * 0.16, 0.03, 0.04),
    ])),
    // Body with the glowing fire sac
    piece(box(0.5, 0.6, 0.42), SKIN, 0, 1.2, 0),
    piece(ico(0.3), GLOW, 0, 1.08, 0.2),
    piece(ico(0.16), HOT, 0, 1.08, 0.36),
    ...[-0.12, 0, 0.12].map((x) => piece(cone(0.04, 0.2), DARK, x, 1.55, -0.2, -0.6)),
    // Thin arms
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.armL : PART.armR, [s * 0.3, 1.42, 0.05], [
      piece(box(0.08, 0.42, 0.08), SKIN, s * 0.33, 1.2, 0.08),
      piece(box(0.06, 0.3, 0.06), DARK, s * 0.34, 0.9, 0.12),
      piece(cone(0.025, 0.12, 3), DARK, s * 0.34, 0.72, 0.14, Math.PI),
    ])),
    // Long neck + head (lunges forward to spit)
    ...limb(PART.head, [0, 1.45, 0.08], [
      piece(box(0.15, 0.6, 0.15), SKIN, 0, 1.72, 0.2, 0.4),
      piece(box(0.32, 0.26, 0.44), SKIN, 0, 2.06, 0.42),
      piece(box(0.22, 0.12, 0.14), GLOW, 0, 1.97, 0.64),                       // glowing mouth
      piece(box(0.07, 0.06, 0.04), EYE, 0.1, 2.15, 0.63),
      piece(box(0.07, 0.06, 0.04), EYE, -0.1, 2.15, 0.63),
      piece(cone(0.05, 0.3), DARK, 0.1, 2.28, 0.3, -0.7),
      piece(cone(0.05, 0.3), DARK, -0.1, 2.28, 0.3, -0.7),
    ]),
  ]);
}

// ASH BRUTE: 2.8 m of grey muscle with glowing lava cracks and huge fists.
export const BRUTE_GORE = [0x55504c, 0x3a3634, 0xff6a20, 0x9a0a0a];
export function createBruteGeometry(colors = {}, extra = {}) {
  const { ASH, DARK, LAVA, HORN, EYE } = { ASH: 0x5a5450, DARK: 0x3a3432, LAVA: 0xff6a20, HORN: 0x1a1414, EYE: 0xffd040, ...colors };
  const lava = glow(LAVA), eye = glow(EYE);
  return merged([
    // Legs (thick, bowed)
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.legL : PART.legR, [s * 0.42, 1.05, 0], [
      piece(box(0.5, 0.55, 0.55), DARK, s * 0.44, 0.78, 0),
      piece(box(0.42, 0.5, 0.45), ASH, s * 0.46, 0.3, 0.02),
      piece(box(0.5, 0.12, 0.62), DARK, s * 0.46, 0.06, 0.08),
    ])),
    // Torso: hunched, with lava cracks
    piece(box(1.5, 1.2, 0.95), ASH, 0, 1.65, 0),
    piece(box(1.1, 0.5, 0.8), ASH, 0, 2.2, -0.1),                                // hunch
    piece(box(1.2, 0.08, 0.97), lava, 0, 1.5, 0),
    piece(box(0.08, 0.9, 0.97), lava, 0.2, 1.75, 0),
    piece(box(0.5, 0.08, 0.97), lava, -0.35, 1.95, 0),
    ...[-0.35, 0, 0.35].map((x) => piece(cone(0.1, 0.4), HORN, x, 2.5, -0.35, -0.6)),  // back spikes
    ...(extra.body || []),
    // Head (low between the shoulders)
    ...limb(PART.head, [0, 2.2, 0.15], [
      piece(box(0.7, 0.55, 0.6), ASH, 0, 2.45, 0.25),
      piece(box(0.6, 0.15, 0.3), DARK, 0, 2.3, 0.48),                            // jaw
      ...[0.18, -0.18].map((x) => piece(cone(0.06, 0.2), 0xe0d6bc, x, 2.45, 0.6)),     // tusks
      piece(box(0.13, 0.08, 0.04), eye, 0.16, 2.52, 0.56), piece(box(0.13, 0.08, 0.04), eye, -0.16, 2.52, 0.56),
      piece(cone(0.12, 0.6), HORN, 0.35, 2.85, 0.15, 0, 0, -0.7), piece(cone(0.12, 0.6), HORN, -0.35, 2.85, 0.15, 0, 0, 0.7),
      ...(extra.head || []),
    ]),
    // Arms: huge, hanging down to the knees, with fists
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.armL : PART.armR, [s * 0.88, 2.05, 0.05], [
      piece(ico(0.36), DARK, s * 0.9, 2.05, 0.05),                              // shoulder
      piece(box(0.42, 0.7, 0.45), ASH, s * 0.98, 1.65, 0.1),
      piece(box(0.36, 0.6, 0.4), ASH, s * 1.0, 1.15, 0.2),
      piece(box(0.6, 0.55, 0.6), DARK, s * 1.0, 0.75, 0.3),                     // fist
      ...(extra.fist ? extra.fist(s) : []),
    ])),
  ]);
}

// MAGMA BRUTE (Lava Rivers): basalt brute with molten fists and a little
// volcano smoking on each shoulder.
export const MAGMA_BRUTE_GORE = [0x221e1e, 0x120f0f, 0xff7a10, 0xffd040];
export function createMagmaBruteGeometry() {
  const LAVA = glow(0xff7a10), HOT = glow(0xffc030), ROCK = 0x1c1818;
  return createBruteGeometry({ ASH: 0x262222, DARK: 0x141111, LAVA: 0xff7a10, HORN: 0x2a1418, EYE: 0xfff070 }, {
    fist: (s) => [piece(box(0.62, 0.2, 0.62), HOT, s * 1.0, 0.55, 0.3)],
    body: [
      piece(cone(0.35, 0.6, 6), ROCK, 0.6, 2.55, -0.25), piece(cone(0.35, 0.6, 6), ROCK, -0.6, 2.55, -0.25),
      piece(box(0.14, 0.08, 0.14), HOT, 0.6, 2.85, -0.25), piece(box(0.14, 0.08, 0.14), HOT, -0.6, 2.85, -0.25),
      piece(box(0.08, 0.08, 0.97), LAVA, -0.4, 1.9, 0), piece(box(1.0, 0.08, 0.97), LAVA, 0.1, 2.05, 0),
    ],
  });
}

// BONE RAM (Bone Mountains): a skeletal goat-thing with huge curled horns.
// It lowers its head and CHARGES.
export const BONE_RAM_GORE = [0xe0d6bc, 0xb8ad98, 0x6a5a4a, 0x9a0a0a];
export function createBoneRamGeometry() {
  const BONE = 0xe0d6bc, OLD = 0xb8ad98, DARK = 0x3a2e24, EYE = glow(0x9affc0), HORN = 0x5a4a3a;
  const leg = (part, x, z, front) => limb(part, [x, 0.95, z], [
    piece(box(0.13, 0.5, 0.13), BONE, x, 0.7, z),
    piece(box(0.1, 0.48, 0.1), OLD, x, 0.25, z + (front ? 0.04 : -0.04)),
    piece(box(0.16, 0.08, 0.2), DARK, x, 0.04, z + 0.03),                   // hooves
  ]);
  const ribs = [];
  for (let k = 0; k < 5; k++) ribs.push(piece(new THREE.TorusGeometry(0.34, 0.035, 4, 8, Math.PI), BONE, 0, 1.05, -0.45 + k * 0.2, Math.PI, Math.PI / 2, 0));
  const curl = (s) => {
    const t = new THREE.TorusGeometry(0.28, 0.08, 5, 9, Math.PI * 1.5);
    return piece(t, HORN, s * 0.3, 1.55, 0.72, 0, Math.PI / 2, s > 0 ? 0 : Math.PI);
  };
  return merged([
    piece(box(0.12, 0.12, 1.3), BONE, 0, 1.35, -0.05),                       // spine
    ...ribs,
    piece(box(0.55, 0.35, 0.4), OLD, 0, 1.15, -0.65),                        // pelvis
    ...leg(PART.legL, 0.22, -0.6, false), ...leg(PART.legR, -0.22, -0.6, false),
    ...leg(PART.armL, 0.22, 0.45, true), ...leg(PART.armR, -0.22, 0.45, true),
    ...limb(PART.head, [0, 1.35, 0.55], [
      piece(box(0.4, 0.38, 0.5), BONE, 0, 1.4, 0.82),                        // skull
      piece(box(0.28, 0.2, 0.36), OLD, 0, 1.22, 1.08),                       // snout
      piece(box(0.1, 0.08, 0.04), EYE, 0.12, 1.47, 1.08), piece(box(0.1, 0.08, 0.04), EYE, -0.12, 1.47, 1.08),
      curl(1), curl(-1),
    ]),
    ...limb(PART.tail, [0, 1.3, -0.75], [piece(cone(0.05, 0.4), BONE, 0, 1.25, -0.95, -2.0)]),
  ]);
}

// BONE ARCHER (Bone Mountains): a tall skeleton that hurls bone spears
// from a distance and backs off if you get close.
export const BONE_ARCHER_GORE = [0xe0d6bc, 0xb8ad98, 0x3a2e24, 0x60ffa0];
export function createBoneArcherGeometry() {
  const BONE = 0xe0d6bc, OLD = 0xc8bca4, DARK = 0x2a221c, EYE = glow(0x9affc0), RAG = 0x4a2a2a;
  const ribs = [];
  for (let k = 0; k < 4; k++) ribs.push(piece(new THREE.TorusGeometry(0.24, 0.03, 4, 8, Math.PI), BONE, 0, 1.35 + k * 0.13, 0, 0, 0, Math.PI));
  return merged([
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.legL : PART.legR, [s * 0.14, 1.0, 0], [
      piece(box(0.08, 0.5, 0.08), BONE, s * 0.14, 0.74, 0),
      piece(box(0.07, 0.5, 0.07), OLD, s * 0.14, 0.26, 0),
      piece(box(0.12, 0.05, 0.2), BONE, s * 0.14, 0.03, 0.05),
    ])),
    piece(box(0.4, 0.14, 0.2), OLD, 0, 1.05, 0),                             // pelvis
    piece(box(0.06, 0.8, 0.06), BONE, 0, 1.45, -0.08),                       // spine
    ...ribs,
    piece(box(0.5, 0.35, 0.05), RAG, 0, 1.25, -0.14),                        // tattered rag
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.armL : PART.armR, [s * 0.28, 1.82, 0], [
      piece(box(0.07, 0.42, 0.07), BONE, s * 0.3, 1.6, 0.02),
      piece(box(0.06, 0.38, 0.06), OLD, s * 0.31, 1.22, 0.06),
      ...(s > 0 ? [piece(box(0.04, 0.04, 1.3), OLD, s * 0.31, 1.05, 0.2)] : []), // bone spear in hand
    ])),
    ...limb(PART.head, [0, 1.88, 0], [
      piece(box(0.3, 0.32, 0.32), BONE, 0, 2.06, 0.02),                      // skull
      piece(box(0.22, 0.1, 0.2), OLD, 0, 1.88, 0.08),                        // jaw
      piece(box(0.07, 0.07, 0.04), EYE, 0.07, 2.08, 0.18), piece(box(0.07, 0.07, 0.04), EYE, -0.07, 2.08, 0.18),
      piece(box(0.08, 0.04, 0.03), DARK, 0, 1.97, 0.18),                     // nose hole
    ]),
  ]);
}

// DROWNED: a waterlogged corpse, grey-green and swollen, hunched forward
// with its arms reaching out, weeds hanging off it, pale glowing eyes.
export const DROWNED_GORE = [0x4a5a4a, 0x2a3a2e, 0x6a7a5a, 0x5a1010];
export function createDrownedGeometry() {
  const SKIN = 0x6a7a66, DARK = 0x3a463c, RAG = 0x2a3036, WEED = 0x2e4a22, EYE = glow(0xa0fff0), MOUTH = 0x140c0c;
  return merged([
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.legL : PART.legR, [s * 0.16, 0.95, 0], [
      piece(box(0.17, 0.5, 0.18), RAG, s * 0.16, 0.7, 0),                      // trouser leg
      piece(box(0.13, 0.45, 0.14), SKIN, s * 0.16, 0.24, 0.02),
      piece(box(0.16, 0.07, 0.26), DARK, s * 0.16, 0.03, 0.06),
    ])),
    piece(box(0.5, 0.62, 0.32), RAG, 0, 1.25, 0, 0.35),                         // torn shirt, hunched
    piece(box(0.44, 0.3, 0.3), SKIN, 0, 1.0, 0.08, 0.2),                        // bloated belly
    ...[-0.14, 0.02, 0.16].map((x) => piece(box(0.04, 0.5, 0.03), WEED, x, 1.05, -0.17, 0.2)), // weeds down the back
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.armL : PART.armR, [s * 0.3, 1.5, 0.12], [
      piece(box(0.12, 0.12, 0.45), SKIN, s * 0.31, 1.45, 0.38),                 // reaching forward
      piece(box(0.1, 0.1, 0.36), DARK, s * 0.31, 1.38, 0.76),
      piece(box(0.14, 0.06, 0.14), SKIN, s * 0.31, 1.36, 0.98),
      piece(box(0.03, 0.3, 0.03), WEED, s * 0.31, 1.2, 0.6),
    ])),
    ...limb(PART.head, [0, 1.62, 0.18], [
      piece(box(0.3, 0.34, 0.3), SKIN, 0, 1.78, 0.28, 0.3),                     // drooping head
      piece(box(0.2, 0.08, 0.06), MOUTH, 0, 1.66, 0.43),                        // slack mouth
      piece(box(0.07, 0.06, 0.03), EYE, 0.08, 1.82, 0.43), piece(box(0.07, 0.06, 0.03), EYE, -0.08, 1.82, 0.43),
      piece(box(0.32, 0.08, 0.32), WEED, 0, 1.96, 0.24, 0.3),                   // weed "hair"
    ]),
  ]);
}

// BLOATER: a swollen sack of rotten gas on stubby legs, covered in glowing
// pustules. Pops when it dies (or when it reaches you).
export const BLOATER_GORE = [0x6a7a3a, 0x9aff40, 0x4a5a2a, 0x7a1010];
export function createBloaterGeometry() {
  const SKIN = 0x7a8a52, DARK = 0x4a5430, PUS = glow(0xb0ff40, 0.9), EYE = glow(0xffe040), MOUTH = 0x1a0c08;
  const blobs = [];
  for (let k = 0; k < 14; k++) {
    const a = k * 2.4, y = 0.7 + (k % 5) * 0.28, r = 0.78 - Math.abs(y - 1.25) * 0.35;
    blobs.push(piece(ico(0.09 + (k % 3) * 0.03), PUS, Math.sin(a) * r, y, Math.cos(a) * r));
  }
  const belly = new THREE.IcosahedronGeometry(0.8, 1);
  belly.scale(1, 0.95, 1);
  return merged([
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.legL : PART.legR, [s * 0.32, 0.5, 0], [
      piece(box(0.22, 0.42, 0.24), DARK, s * 0.32, 0.22, 0),
      piece(box(0.26, 0.08, 0.32), DARK, s * 0.32, 0.03, 0.05),
    ])),
    piece(belly, SKIN, 0, 1.2, 0),
    ...blobs,
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.armL : PART.armR, [s * 0.72, 1.4, 0.1], [
      piece(box(0.1, 0.32, 0.1), DARK, s * 0.78, 1.22, 0.16),                   // tiny useless arms
    ])),
    ...limb(PART.head, [0, 1.9, 0.1], [
      piece(box(0.3, 0.26, 0.28), SKIN, 0, 2.05, 0.18),
      piece(box(0.18, 0.08, 0.04), MOUTH, 0, 1.97, 0.33),
      piece(box(0.06, 0.06, 0.03), EYE, 0.08, 2.1, 0.33), piece(box(0.06, 0.06, 0.03), EYE, -0.08, 2.1, 0.33),
    ]),
  ]);
}

// BLOOD LEECH: a fat, glossy red slug with a round mouth full of teeth.
// Comes in swarms. (Sways side to side as it crawls.)
export const LEECH_GORE = [0x7a0a10, 0xb01818, 0x3a0608, 0xff3030];
export function createLeechGeometry() {
  const RED = 0x8a1018, DARK = 0x4a080c, BELLY = 0xb84040, TEETH = 0xe8dcc0, MAW = glow(0xff2020, 0.5);
  const body = [];
  for (let k = 0; k < 5; k++) {
    const r = 0.22 - Math.abs(k - 1.5) * 0.03;
    body.push(piece(new THREE.SphereGeometry(r, 7, 5), k % 2 ? RED : DARK, 0, r * 0.9, -0.35 + k * 0.17));
  }
  return merged([
    ...limb(PART.tail, [0, 0.2, -0.3], body.slice(0, 2)),
    ...body.slice(2),
    piece(box(0.3, 0.06, 0.6), BELLY, 0, 0.04, -0.05),
    ...limb(PART.head, [0, 0.25, 0.3], [
      piece(new THREE.CylinderGeometry(0.17, 0.2, 0.18, 8), RED, 0, 0.26, 0.42, Math.PI / 2),
      piece(new THREE.CircleGeometry(0.13, 8), MAW, 0, 0.26, 0.515),
      ...[0, 1, 2, 3, 4, 5].map((n) => piece(cone(0.025, 0.08, 3), TEETH, Math.cos(n) * 0.1, 0.26 + Math.sin(n) * 0.1, 0.52, Math.PI / 2)),
    ]),
  ]);
}

// MIRE TOAD: a squat, warty toad the size of a cow, red-brown, with a
// glowing throat sac it fills with blood before spitting.
export const MIRE_TOAD_GORE = [0x5a2a1a, 0x8a3a20, 0x2a1008, 0xd04020];
export function createMireToadGeometry() {
  const SKIN = 0x6a3420, DARK = 0x3a1a10, BELLY = 0xa87050, SAC = glow(0xff4030, 0.7), EYE = glow(0xffe040), WART = 0x8a5030;
  const warts = [];
  for (let k = 0; k < 10; k++) { const a = k * 2.2; warts.push(piece(ico(0.06 + (k % 3) * 0.02), WART, Math.sin(a) * 0.5, 0.95 + (k % 3) * 0.12, Math.cos(a) * 0.45 - 0.1)); }
  const bodyG = new THREE.SphereGeometry(0.75, 9, 6); bodyG.scale(1.1, 0.7, 1.2);
  return merged([
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.legL : PART.legR, [s * 0.55, 0.6, -0.35], [
      piece(box(0.32, 0.42, 0.6), SKIN, s * 0.68, 0.4, -0.45),                 // big folded back legs
      piece(box(0.3, 0.08, 0.5), DARK, s * 0.72, 0.04, -0.2),
    ])),
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.armL : PART.armR, [s * 0.45, 0.6, 0.45], [
      piece(box(0.14, 0.5, 0.14), SKIN, s * 0.5, 0.3, 0.55),
      piece(box(0.24, 0.06, 0.24), DARK, s * 0.5, 0.03, 0.62),
    ])),
    piece(bodyG, SKIN, 0, 0.75, 0),
    piece(box(0.9, 0.2, 1.0), BELLY, 0, 0.42, 0.05),
    ...warts,
    ...limb(PART.head, [0, 0.9, 0.6], [
      piece(box(0.95, 0.4, 0.55), SKIN, 0, 1.0, 0.75),                         // wide flat head
      piece(box(0.9, 0.06, 0.5), DARK, 0, 0.86, 0.78),                         // mouth line
      piece(new THREE.SphereGeometry(0.28, 8, 6), SAC, 0, 0.72, 0.85),          // throat sac
      piece(new THREE.SphereGeometry(0.13, 6, 5), SKIN, 0.32, 1.25, 0.72), piece(new THREE.SphereGeometry(0.13, 6, 5), SKIN, -0.32, 1.25, 0.72),
      piece(box(0.1, 0.08, 0.05), EYE, 0.32, 1.27, 0.84), piece(box(0.1, 0.08, 0.05), EYE, -0.32, 1.27, 0.84),
    ]),
  ]);
}

// EGG SAC: a cluster of slimy, glowing eggs on a stalk, something
// squirming inside each one.
export const EGG_SAC_GORE = [0xc0d060, 0x8a9a30, 0x6a1010, 0xf0ffa0];
export function createEggSacGeometry() {
  const SLIME = 0x5a4a20, EGG = glow(0xd0e060, 0.55), VEIN = 0x7a1010, INSIDE = 0x2a1a08;
  const eggs = [];
  const spots = [[0, 0.9, 0], [0.42, 0.7, 0.15], [-0.4, 0.75, -0.1], [0.1, 0.65, -0.42], [-0.15, 0.6, 0.42], [0.05, 1.45, 0.05], [0.3, 1.2, -0.25], [-0.3, 1.25, 0.25]];
  for (const [x, y, z] of spots) {
    eggs.push(piece(new THREE.SphereGeometry(0.32, 8, 6), EGG, x, y, z));
    eggs.push(piece(new THREE.SphereGeometry(0.12, 5, 4), INSIDE, x * 1.1, y, z * 1.1 + 0.05));
  }
  return merged([
    piece(new THREE.CylinderGeometry(0.5, 0.8, 0.3, 8), SLIME, 0, 0.15, 0),
    ...limb(PART.body, [0, 0.3, 0], eggs),
    ...[0, 1, 2, 3].map((k) => piece(box(0.04, 1.1, 0.04), VEIN, Math.sin(k * 1.6) * 0.3, 0.9, Math.cos(k * 1.6) * 0.3, 0.2, 0, k)),
  ]);
}

// FROST WRAITH: a hooded ghost of frost floating above the snow, its robe
// fraying into icicles, glowing cyan eyes and long icy claws. No legs.
export const FROST_WRAITH_GORE = [0xc8e8ff, 0x8ab8e0, 0x2a3a5a, 0xa0ffff];
export function createFrostWraithGeometry() {
  const ROBE = 0x3a4a6a, PALE = 0x9ab8d8, ICE = 0xd0f0ff, EYE = glow(0x80ffff), HOLLOW = 0x06080e;
  const shreds = [];
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; shreds.push(piece(cone(0.09, 0.6, 3), ICE, Math.sin(a) * 0.32, 0.45, Math.cos(a) * 0.3, Math.PI)); }
  return merged([
    // (legs = the two halves of the robe's hem, so it billows as it glides)
    ...limb(PART.legL, [0.12, 1.2, 0], [piece(cone(0.32, 1.0, 5), ROBE, 0.12, 0.85, 0, Math.PI), ...shreds.slice(0, 4)]),
    ...limb(PART.legR, [-0.12, 1.2, 0], [piece(cone(0.32, 1.0, 5), ROBE, -0.12, 0.85, 0, Math.PI), ...shreds.slice(4)]),
    piece(box(0.55, 0.75, 0.38), ROBE, 0, 1.6, 0),                                // torso
    piece(box(0.6, 0.1, 0.42), ICE, 0, 1.95, 0),                                  // frosted shoulders
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.armL : PART.armR, [s * 0.3, 1.9, 0.05], [
      piece(box(0.12, 0.12, 0.6), PALE, s * 0.36, 1.82, 0.32),                    // reaching
      ...[-0.05, 0, 0.05].map((dx) => piece(cone(0.025, 0.28, 3), ICE, s * 0.36 + dx, 1.8, 0.72, Math.PI / 2)),
    ])),
    ...limb(PART.head, [0, 2.05, 0], [
      piece(cone(0.32, 0.75, 4), ROBE, 0, 2.38, -0.04, 0, Math.PI / 4),            // pointed hood
      piece(box(0.34, 0.32, 0.1), HOLLOW, 0, 2.2, 0.16),                           // dark face hole
      piece(box(0.07, 0.05, 0.03), EYE, 0.08, 2.24, 0.22), piece(box(0.07, 0.05, 0.03), EYE, -0.08, 2.24, 0.22),
    ]),
  ]);
}

// FROST BRUTE: a huge shaggy white-furred demon with curling black horns,
// icicles hanging off its fur, blue skin on its face and fists.
export const FROST_BRUTE_GORE = [0xe8eef4, 0xb8c8d8, 0x3a4a6a, 0x9a0a0a];
export function createFrostBruteGeometry() {
  const FUR = 0xdce4ec, FUR2 = 0xb8c4d0, SKIN = 0x4a6a9a, HORN = 0x1a1a22, ICE = 0xc8f0ff, EYE = glow(0x80ffff), MOUTH = 0x0a0c14;
  const icicles = [];
  for (let k = 0; k < 9; k++) icicles.push(piece(cone(0.06, 0.4, 3), ICE, -0.8 + k * 0.2, 1.55, 0.45 - (k % 2) * 0.1, Math.PI));
  return merged([
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.legL : PART.legR, [s * 0.5, 1.3, 0], [
      piece(box(0.6, 0.8, 0.6), FUR2, s * 0.5, 0.95, 0),
      piece(box(0.5, 0.55, 0.5), FUR, s * 0.5, 0.35, 0.02),
      piece(box(0.55, 0.15, 0.65), SKIN, s * 0.5, 0.07, 0.08),
    ])),
    piece(box(1.8, 1.4, 1.1), FUR, 0, 2.1, 0),                                     // huge shaggy chest
    piece(box(1.5, 0.8, 0.9), FUR2, 0, 1.5, 0),
    ...icicles,
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.armL : PART.armR, [s * 1.0, 2.6, 0], [
      piece(box(0.6, 1.1, 0.6), FUR, s * 1.15, 2.05, 0.05),
      piece(box(0.55, 0.9, 0.55), FUR2, s * 1.2, 1.15, 0.12),
      piece(box(0.7, 0.55, 0.7), SKIN, s * 1.2, 0.55, 0.15),                       // big blue fists
    ])),
    ...limb(PART.head, [0, 2.8, 0.2], [
      piece(box(0.8, 0.7, 0.7), FUR, 0, 3.05, 0.35),
      piece(box(0.6, 0.45, 0.2), SKIN, 0, 2.98, 0.72),                             // blue face
      piece(box(0.42, 0.1, 0.05), MOUTH, 0, 2.85, 0.83),
      piece(box(0.12, 0.08, 0.04), EYE, 0.15, 3.08, 0.83), piece(box(0.12, 0.08, 0.04), EYE, -0.15, 3.08, 0.83),
      ...[1, -1].flatMap((s) => [
        piece(cone(0.13, 0.7, 5), HORN, s * 0.5, 3.45, 0.25, 0, 0, -s * 0.9),
        piece(cone(0.08, 0.45, 4), HORN, s * 0.85, 3.75, 0.25, 0, 0, -s * 0.2),
      ]),
    ]),
  ]);
}

// IRON HUSK: half demon, half machine. Riveted iron plates over red
// flesh, a glowing furnace grate in its belly, a claw on one arm and a
// steaming pipe on the other, a welding-mask face with one red eye.
export const IRON_HUSK_GORE = [0x4a4c52, 0x7a1a12, 0xffa030, 0x1a1a1e];
export function createIronHuskGeometry() {
  const IRON = 0x55585e, DARK = 0x222226, FLESH = 0x7a2418, FIRE = glow(0xff8020), EYE = glow(0xff2010), RIVET = 0x8a8c92;
  return merged([
    ...[1, -1].flatMap((s) => limb(s > 0 ? PART.legL : PART.legR, [s * 0.28, 1.05, 0], [
      piece(box(0.3, 0.55, 0.32), FLESH, s * 0.28, 0.8, 0),
      piece(box(0.34, 0.5, 0.36), IRON, s * 0.28, 0.32, 0.02),                 // iron shin guards
      piece(box(0.4, 0.12, 0.5), DARK, s * 0.28, 0.06, 0.06),
    ])),
    piece(box(0.85, 0.85, 0.55), IRON, 0, 1.55, 0),                            // armored torso
    piece(box(0.5, 0.35, 0.05), FIRE, 0, 1.4, 0.29),                           // furnace grate
    ...[-0.12, 0, 0.12].map((y) => piece(box(0.52, 0.04, 0.06), DARK, 0, 1.4 + y, 0.31)),
    ...[[-0.35, 1.9], [0.35, 1.9], [-0.35, 1.2], [0.35, 1.2]].map(([x, y]) => piece(box(0.06, 0.06, 0.04), RIVET, x, y, 0.29)),
    piece(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6), DARK, -0.25, 2.2, -0.2), // smokestack
    ...limb(PART.armL, [0.5, 1.85, 0], [
      piece(box(0.22, 0.6, 0.22), FLESH, 0.55, 1.55, 0.05),
      piece(box(0.12, 0.45, 0.12), IRON, 0.5, 1.1, 0.2),                       // claw
      piece(cone(0.06, 0.35, 3), RIVET, 0.43, 0.85, 0.28, Math.PI), piece(cone(0.06, 0.35, 3), RIVET, 0.57, 0.85, 0.28, Math.PI),
    ]),
    ...limb(PART.armR, [-0.5, 1.85, 0], [
      piece(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 6), IRON, -0.55, 1.4, 0.1),  // pipe arm
      piece(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 6), DARK, -0.55, 0.92, 0.1),
    ]),
    ...limb(PART.head, [0, 2.0, 0.05], [
      piece(box(0.42, 0.42, 0.4), DARK, 0, 2.22, 0.06),                        // welding-mask head
      piece(box(0.3, 0.1, 0.04), EYE, 0, 2.26, 0.27),
      piece(box(0.46, 0.06, 0.44), IRON, 0, 2.45, 0.06),
    ]),
  ]);
}
