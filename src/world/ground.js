// Builds the ground and scatters scenery, all from the region data file.
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeRandom } from '../core/random.js';
import { terrain } from './terrain.js';

export function createGround(scene, physics, region, hazards = null) {
  const { RAPIER, world } = physics;
  const p = region.palette;
  const size = region.terrain.size;
  const rand = makeRandom(region.id.length * 9973);

  // ---- Visible ground: flat-shaded triangles with patchy ash colors ----
  const segs = Math.round(size / region.terrain.patchSize);
  const geo = new THREE.PlaneGeometry(size, size, segs, segs).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  // Hills (if the region has any), plus a tiny wobble so the flat shading
  // catches the light.
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, terrain.visualHeight(x, z) + (Math.sin(x * 0.37 + z * 0.11) + Math.cos(z * 0.29 - x * 0.07)) * 0.04);
  }
  const palette = [new THREE.Color(p.groundA), new THREE.Color(p.groundB), new THREE.Color(p.groundC)];
  const cliff = new THREE.Color(p.cliff ?? p.rock), peak = new THREE.Color(p.peak ?? p.groundA);
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let tri = 0; tri < pos.count / 3; tri++) {
    c.copy(palette[Math.floor(rand() * palette.length)]);
    if (!terrain.flat) {
      // Steep faces are bare rock, high ground is pale.
      const i0 = tri * 3;
      e1.set(pos.getX(i0 + 1) - pos.getX(i0), pos.getY(i0 + 1) - pos.getY(i0), pos.getZ(i0 + 1) - pos.getZ(i0));
      e2.set(pos.getX(i0 + 2) - pos.getX(i0), pos.getY(i0 + 2) - pos.getY(i0), pos.getZ(i0 + 2) - pos.getZ(i0));
      const ny = Math.abs(e1.cross(e2).normalize().y);
      const h = (pos.getY(i0) + pos.getY(i0 + 1) + pos.getY(i0 + 2)) / 3;
      if (ny < 0.82) c.lerp(cliff, Math.min(1, (0.82 - ny) * 5));
      c.lerp(peak, Math.min(0.7, Math.max(0, (h - 35) / 60)));
      if (terrain.waterLevel != null && h < terrain.waterLevel + 0.1) c.lerp(new THREE.Color(p.bed ?? 0x1a2018), 0.8); // muddy bottom
      if (terrain.bogLevel != null) { // blood-mud: dark and wet
        const cx = (pos.getX(i0) + pos.getX(i0 + 1) + pos.getX(i0 + 2)) / 3, cz = (pos.getZ(i0) + pos.getZ(i0 + 1) + pos.getZ(i0 + 2)) / 3;
        c.lerp(new THREE.Color(p.mud ?? 0x3a1410), Math.min(1, terrain.mud(cx, cz) * 1.4));
      }
    }
    c.multiplyScalar(0.9 + rand() * 0.2);
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (tri * 3 + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, litMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- Physics ground: one big flat slab ----
  // (Under water regions it sits below the deepest water: the car follows
  // the carved ground itself, like hills.)
  const floorY = terrain.waterLevel != null || terrain.bogLevel != null ? -6 : 0;
  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, floorY - 1, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(size / 2, 1, size / 2).setFriction(0.8), groundBody);

  // ---- Invisible walls at the edge of the region ----
  const half = size / 2 - 30;
  const walls = [
    [0, half + 5, half + 10, 5], [0, -half - 5, half + 10, 5],
    [half + 5, 0, 5, half + 10], [-half - 5, 0, 5, half + 10],
  ];
  for (const [x, z, hx, hz] of walls) {
    // Tall enough to stop you even where a mountain runs into the edge.
    let top = 0;
    for (let t = -1; t <= 1; t += 0.01) top = Math.max(top, hx > hz ? terrain.height(x + t * hx, z) : terrain.height(x, z + t * hz));
    const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, top / 2 + 10, z));
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, top / 2 + 30, hz), b);
  }

  // ---- Scenery ----
  // Keep the start, the boss arena and the lava free of random scenery.
  const arena = region.boss?.arena;
  const tele = region.teleporter;
  // (The Hellgate rises next to the arena, on the side you come from: see main.js.)
  const gateOff = arena && arena.style !== 'island' ? (arena.radius + 25) / (Math.hypot(arena.x, arena.z) || 1) : 0;
  const gateX = arena ? arena.x - arena.x * gateOff : 0, gateZ = arena ? arena.z - arena.z * gateOff : 0;
  // Iron Foundry machinery: keep scenery off the belts, rails and towers.
  const lines = [...(region.belts || []).map((b) => ({ ...b, pad: b.width / 2 + 6 })), ...(region.rails || []).map((r) => ({ ...r, pad: 6 }))];
  const spots = [...(region.turrets || []), ...(region.magnets || []).map((m) => [m.x, m.z]), ...(region.crushers || []).map((c) => [c.x, c.z])];
  const onMachinery = (x, z) => spots.some(([sx, sz]) => (x - sx) ** 2 + (z - sz) ** 2 < 144) || lines.some((l) => {
    const [ax, az] = l.from, [bx, bz] = l.to, len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len;
    const t = Math.min(len, Math.max(0, (x - ax) * tx + (z - az) * tz));
    return Math.hypot(x - ax - tx * t, z - az - tz * t) < l.pad;
  });
  const keepClear = (x, z) => x * x + z * z < region.clearRadiusAtStart ** 2 || onMachinery(x, z) ||
    (arena && (x - arena.x) ** 2 + (z - arena.z) ** 2 < (arena.radius + 15) ** 2) ||
    (arena && gateOff && (x - gateX) ** 2 + (z - gateZ) ** 2 < 16 ** 2) ||
    (hazards && hazards.lavaAt(x, z, 4)) ||
    terrain.wet(x, z, 5) ||
    terrain.walks.some((w) => w.segs.some((sg) => { const px = x - sg.ax, pz = z - sg.az, al = Math.min(sg.len, Math.max(0, px * sg.tx + pz * sg.tz)); return Math.hypot(px - sg.tx * al, pz - sg.tz * al) < w.width / 2 + 3; })) ||
    terrain.bridges.some((b) => (x - b.x) ** 2 + (z - b.z) ** 2 < (b.across + 18) ** 2) || // (bridge approaches)
    (tele && (x - tele.x) ** 2 + (z - tele.z) ** 2 < (tele.radius + 12) ** 2);
  for (const prop of region.props) {
    const builder = PROP_BUILDERS[prop.type];
    if (!builder) { console.warn('Unknown prop type', prop.type); continue; }
    placeProps(scene, physics, prop, builder(p), half, keepClear, rand);
  }
  if (arena?.style === 'island') createIsland(scene, physics, arena, p, rand);
  else if (arena?.style === 'lake') createLakeShore(scene, physics, arena, p, rand);
  else if (arena?.style === 'pool') createBogPool(scene, physics, arena, p, rand);
  else if (arena?.style === 'glacier') createGlacier(scene, physics, arena, p, rand);
  else if (arena?.style === 'yard') createFoundryYard(scene, physics, arena, p, rand);
  else if (arena) createArena(scene, physics, arena, p, rand);

  return { size, half };
}

const ROCK_GEO = new THREE.IcosahedronGeometry(1, 0);

// A box with its bottom at y = 0, colored one color (for vertex-colored props).
function coloredBox(w, h, d, x, y, z, color) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(x, y + h / 2, z);
  const c = new THREE.Color(color), arr = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < arr.length; i += 3) arr.set([c.r, c.g, c.b], i);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

// A ruined city building (12 x 20 x 12 m before scaling): stone walls, rows
// of dark empty windows, a broken jagged top and a collapsed corner.
function buildingGeometry(p) {
  const wall = p.stone ?? 0x6a6660, dark = 0x0c0c0e, trim = p.stoneDark ?? 0x3a3834;
  const parts = [coloredBox(12, 16, 12, 0, 0, 0, wall)];
  // jagged broken top
  parts.push(coloredBox(7, 3, 12, -2.5, 16, 0, wall), coloredBox(4, 1.6, 6, 3, 16, 3, wall), coloredBox(3, 5, 3, -4.5, 19, -4.5, wall));
  // floor bands
  for (const y of [5.2, 10.4]) parts.push(coloredBox(12.3, 0.4, 12.3, 0, y, 0, trim));
  parts.push(coloredBox(12.4, 1.2, 12.4, 0, 0, 0, trim)); // plinth
  // windows on all four sides (thin dark boxes standing out a little)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if ((row * 3 + col) % 4 === 3) continue; // some bricked up
      const y = 1.8 + row * 5.2, o = -3.6 + col * 3.6;
      parts.push(coloredBox(1.8, 2.6, 0.2, o, y, 6.02, dark), coloredBox(1.8, 2.6, 0.2, o, y, -6.02, dark));
      parts.push(coloredBox(0.2, 2.6, 1.8, 6.02, y, o, dark), coloredBox(0.2, 2.6, 1.8, -6.02, y, o, dark));
    }
  }
  return mergeGeometries(parts);
}

// Each prop type: a shape, a material, how to sit on the ground, and its crash shape.
const PROP_BUILDERS = {
  // ---- Iron Foundry ----
  smokestack: (p) => {
    const steel = p.steel ?? 0x4a4c52, dark = 0x1e1e22, glowc = p.lava ?? 0xff6010;
    const g = mergeGeometries([
      coloredBox(4, 3, 4, 0, 0, 0, dark),
      ...[0, 1, 2, 3, 4].map((k) => coloredBox(2.2 - k * 0.12, 4, 2.2 - k * 0.12, 0, 3 + k * 4, 0, k % 2 ? steel : dark)),
      coloredBox(2.0, 0.4, 2.0, 0, 23, 0, glowc),
    ]);
    return {
      geometry: g,
      material: litMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: 0.8 }),
      shadows: true,
      place: (m, s, rand) => { m.scale.set(s, s * rand.range(0.7, 1.3), s); m.rotation.y = rand() * 6; },
      collider: (RAPIER, m) => RAPIER.ColliderDesc.cuboid(2 * m.scale.x, 1.5 * m.scale.y, 2 * m.scale.z).setTranslation(0, 1.5 * m.scale.y, 0),
      colorJitter: 0.15,
    };
  },
  // A steel girder frame (an unfinished building)
  girder: (p) => {
    const steel = p.steel ?? 0x6a4a3a;
    const parts = [];
    for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) parts.push(coloredBox(0.6, 12, 0.6, x, 0, z, steel));
    for (const y of [5.5, 11.4]) {
      parts.push(coloredBox(8.6, 0.6, 0.6, 0, y, -4, steel), coloredBox(8.6, 0.6, 0.6, 0, y, 4, steel));
      parts.push(coloredBox(0.6, 0.6, 8.6, -4, y, 0, steel), coloredBox(0.6, 0.6, 8.6, 4, y, 0, steel));
    }
    return {
      geometry: mergeGeometries(parts),
      material: litMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: 0.6, metalness: 0.4 }),
      shadows: true,
      place: (m, s, rand) => { m.scale.set(s, s * rand.range(0.6, 1.4), s); m.rotation.y = Math.floor(rand() * 4) * Math.PI / 2; },
      // (only the four legs are solid: drive through the middle)
      collider: (RAPIER, m) => [[-4, -4], [4, -4], [-4, 4], [4, 4]].map(([x, z]) => {
        const v = new THREE.Vector3(x * m.scale.x, 0, z * m.scale.z).applyQuaternion(m.quaternion);
        return RAPIER.ColliderDesc.cuboid(0.35 * m.scale.x, 6 * m.scale.y, 0.35 * m.scale.z).setTranslation(v.x, 6 * m.scale.y, v.z);
      }),
      colorJitter: 0.2,
    };
  },
  // Oil drums. THE OIL. Stacks of it.
  barrels: (p) => {
    const parts = [];
    const drum = (x, y, z, c) => { const g = new THREE.CylinderGeometry(0.45, 0.45, 1.3, 10).translate(x, y + 0.65, z).toNonIndexed(); const col = new THREE.Color(c), arr = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < arr.length; i += 3) arr.set([col.r, col.g, col.b], i); g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return g; };
    parts.push(drum(0, 0, 0, 0x8a1a12), drum(1, 0, 0.1, 0x1a1a1e), drum(0.5, 0, 0.95, 0x8a1a12), drum(0.5, 1.3, 0.35, 0xc8a020));
    return {
      geometry: mergeGeometries(parts),
      material: litMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: 0.6, metalness: 0.3 }),
      shadows: true,
      place: (m, s, rand) => { m.scale.setScalar(s); m.rotation.y = rand() * 6; },
      collider: (RAPIER, m) => RAPIER.ColliderDesc.cylinder(1.3 * m.scale.y, 1.0 * m.scale.x).setTranslation(0.5 * m.scale.x, 1.3 * m.scale.y, 0.4 * m.scale.z),
      colorJitter: 0.2,
    };
  },
  // A heap of twisted scrap metal
  scrapPile: (p) => ({
    geometry: ROCK_GEO,
    material: litMaterial({ color: p.steel ?? 0x5a5c62, flatShading: true, roughness: 0.5, metalness: 0.6 }),
    shadows: true,
    place: (m, s, rand) => { m.scale.set(s * rand.range(1, 2), s * rand.range(0.4, 0.8), s * rand.range(1, 2)); m.position.y = m.scale.y * 0.3; m.rotation.set(rand() * 3, rand() * 6, rand() * 3); },
    collider: (RAPIER, m) => RAPIER.ColliderDesc.ball(Math.min(m.scale.x, m.scale.z) * 0.6).setTranslation(0, m.scale.y * 0.2, 0),
    colorJitter: 0.3,
  }),

  // ---- Ice Hell ----
  iceSpire: (p) => {
    const g = mergeGeometries([
      new THREE.ConeGeometry(1, 6, 5).translate(0, 3, 0).toNonIndexed(),
      new THREE.ConeGeometry(0.5, 3, 4).translate(0.9, 1.5, 0.3).toNonIndexed(),
      new THREE.ConeGeometry(0.45, 2.4, 4).translate(-0.7, 1.2, -0.4).toNonIndexed(),
    ]);
    return {
      geometry: g,
      material: litMaterial({ color: p.ice ?? 0x9ad0f0, flatShading: true, roughness: 0.1, metalness: 0.1, emissive: 0x1a3a5a, emissiveIntensity: 0.4 }),
      shadows: true,
      place: (m, s, rand) => { m.scale.set(s, s * rand.range(0.8, 1.6), s); m.rotation.set(rand.range(-0.15, 0.15), rand() * 6, rand.range(-0.15, 0.15)); },
      collider: (RAPIER, m) => RAPIER.ColliderDesc.cylinder(3 * m.scale.y, 0.9 * m.scale.x).setTranslation(0, 3 * m.scale.y, 0),
      colorJitter: 0.15,
    };
  },
  // Snow drifts: soft white mounds (you plow right through).
  snowDrift: (p) => {
    const g = new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    return {
      geometry: g,
      material: litMaterial({ color: p.groundC ?? 0xffffff, flatShading: true, roughness: 1 }),
      shadows: true,
      place: (m, s, rand) => { m.scale.set(s * rand.range(1.5, 3), s * rand.range(0.3, 0.6), s * rand.range(1.2, 2.2)); m.rotation.y = rand() * 6; m.position.y = -0.1; },
      colorJitter: 0.06,
    };
  },
  // The damned, frozen in the ice up to their necks (heads and a reaching hand).
  frozenDamned: (p) => {
    const skin = 0x8aa0b8, dark = 0x101420, ice = p.ice ?? 0x9ad0f0;
    const g = mergeGeometries([
      coloredBox(0.5, 0.55, 0.5, 0, 0, 0, skin),
      coloredBox(0.36, 0.08, 0.04, 0, 0.12, 0.25, dark),          // open mouth
      coloredBox(0.08, 0.08, 0.04, 0.11, 0.33, 0.25, dark), coloredBox(0.08, 0.08, 0.04, -0.11, 0.33, 0.25, dark),
      coloredBox(0.14, 0.7, 0.14, 0.55, 0, 0.1, skin),            // a hand reaching up
      coloredBox(0.22, 0.2, 0.08, 0.55, 0.7, 0.1, skin),
      coloredBox(1.6, 0.25, 1.4, 0, -0.1, 0, ice),                // the ice around them
    ]);
    return {
      geometry: g,
      material: litMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: 0.6 }),
      shadows: true,
      place: (m, s, rand) => { m.scale.setScalar(s); m.rotation.y = rand() * 6; m.position.y = -0.15; },
      collider: (RAPIER, m) => RAPIER.ColliderDesc.ball(0.35 * m.scale.x).setTranslation(0, 0.3 * m.scale.y, 0),
      colorJitter: 0.15,
    };
  },

  // ---- Blood Swamp ----
  // A clump of tall reeds (you drive straight through them).
  reed: (p) => {
    const parts = [];
    for (let k = 0; k < 7; k++) {
      const a = k * 2.4, r = 0.15 + (k % 3) * 0.12, h = 1.2 + (k % 4) * 0.35;
      const g = new THREE.ConeGeometry(0.035, h, 3).translate(Math.sin(a) * r, h / 2, Math.cos(a) * r);
      g.rotateZ((k % 3 - 1) * 0.12);
      parts.push(g.toNonIndexed());
    }
    parts.push(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 4).translate(0.05, 1.45, 0).toNonIndexed()); // a cattail head
    return {
      geometry: mergeGeometries(parts),
      material: litMaterial({ color: p.reed ?? 0x4a4a22, flatShading: true, roughness: 1 }),
      shadows: false,
      place: (m, s, rand) => { m.scale.set(s, s * rand.range(0.8, 1.4), s); m.rotation.y = rand() * 6; },
      colorJitter: 0.3,
    };
  },

  // ---- Flooded City ----
  ruin: (p) => ({
    geometry: buildingGeometry(p),
    material: litMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: 0.95 }),
    shadows: true,
    place: (m, s, rand) => {
      m.scale.set(s * rand.range(0.8, 1.3), s * rand.range(0.6, 1.5), s * rand.range(0.8, 1.3));
      m.rotation.y = Math.floor(rand() * 4) * Math.PI / 2 + rand.range(-0.08, 0.08); // lined up with the streets
      m.position.y = -0.4;
    },
    collider: (RAPIER, m) => {
      const d = RAPIER.ColliderDesc.cuboid(6 * m.scale.x, 8 * m.scale.y, 6 * m.scale.z).setTranslation(0, 8 * m.scale.y, 0);
      const a = m.rotation.y;
      d.setRotation({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) });
      return d;
    },
    colorJitter: 0.25,
  }),

  column: (p) => {
    const g = new THREE.CylinderGeometry(0.7, 0.8, 7, 8);
    g.translate(0, 3.5, 0);
    const cap = new THREE.BoxGeometry(2, 0.6, 2).translate(0, 0.3, 0);
    return {
      geometry: mergeGeometries([g.toNonIndexed(), cap.toNonIndexed()]),
      material: litMaterial({ color: p.stone ?? 0x6a6660, flatShading: true, roughness: 0.85 }),
      shadows: true,
      place: (m, s, rand) => {
        m.scale.set(s, s * rand.range(0.4, 1.1), s); // broken off at different heights
        m.rotation.set(rand.range(-0.12, 0.12), rand() * 6, rand.range(-0.12, 0.12));
      },
      collider: (RAPIER, m) => RAPIER.ColliderDesc.cylinder(3.5 * m.scale.y, 0.8 * m.scale.x).setTranslation(0, 3.5 * m.scale.y, 0),
      colorJitter: 0.2,
    };
  },

  // Rusted-out cars left behind when the city drowned.
  carWreck: (p) => {
    const rust = 0x5a3424, dark = 0x1a1412;
    const g = mergeGeometries([
      coloredBox(2, 0.8, 4.4, 0, 0.3, 0, rust),
      coloredBox(1.7, 0.6, 2.2, 0, 1.1, -0.3, rust),
      coloredBox(1.75, 0.45, 1.2, 0, 1.15, 0.3, dark), // empty windows
      ...[[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]].map(([x, z]) => coloredBox(0.3, 0.6, 0.6, x, 0, z, dark)),
    ]);
    return {
      geometry: g,
      material: litMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: 1 }),
      shadows: true,
      place: (m, s, rand) => { m.scale.setScalar(s); m.rotation.set(rand.range(-0.06, 0.06), rand() * 6, rand.range(-0.1, 0.1)); },
      collider: (RAPIER, m) => {
        const a = m.rotation.y;
        return RAPIER.ColliderDesc.cuboid(1 * m.scale.x, 0.7 * m.scale.y, 2.2 * m.scale.z).setTranslation(0, 0.7 * m.scale.y, 0)
          .setRotation({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) });
      },
      colorJitter: 0.3,
    };
  },

  rock: (p) => ({
    geometry: ROCK_GEO,
    material: litMaterial({ color: p.rock, flatShading: true, roughness: 0.95 }),
    shadows: true,
    place: (m, s, rand) => {
      m.scale.set(s * rand.range(0.8, 1.4), s * rand.range(0.5, 0.9), s * rand.range(0.8, 1.4));
      m.position.y = m.scale.y * 0.35;
      m.rotation.set(rand() * 3, rand() * 6, rand() * 3);
    },
    // Collision shape = the rock's exact shape (a ball used to stick out
    // above flat rocks, leaving cars perched on invisible bumps).
    collider: (RAPIER, m) => {
      const pos = ROCK_GEO.attributes.position;
      const pts = new Float32Array(pos.count * 3);
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).multiply(m.scale).applyQuaternion(m.quaternion);
        pts.set([v.x, v.y, v.z], i * 3);
      }
      return RAPIER.ColliderDesc.convexHull(pts);
    },
    colorJitter: 0.25,
  }),

  boneSpike: (p) => {
    const g = new THREE.ConeGeometry(0.45, 4, 5);
    g.translate(0, 2, 0);
    return {
      geometry: g,
      material: litMaterial({ color: p.bone, flatShading: true, roughness: 0.8 }),
      shadows: true,
      place: (m, s, rand) => {
        m.scale.setScalar(s);
        m.rotation.set(rand.range(-0.25, 0.25), rand() * 6, rand.range(-0.25, 0.25));
      },
      collider: (RAPIER, m) => RAPIER.ColliderDesc.cylinder(2 * m.scale.y, 0.45 * m.scale.x).setTranslation(0, 2 * m.scale.y, 0),
      colorJitter: 0.15,
    };
  },

  deadTree: (p) => {
    const trunk = new THREE.CylinderGeometry(0.18, 0.35, 5, 5);
    trunk.translate(0, 2.5, 0);
    const b1 = new THREE.CylinderGeometry(0.06, 0.14, 2.4, 4);
    b1.rotateZ(0.9); b1.translate(0.8, 3.6, 0);
    const b2 = new THREE.CylinderGeometry(0.05, 0.12, 2, 4);
    b2.rotateZ(-1.0); b2.rotateY(1.2); b2.translate(-0.3, 4.1, -0.6);
    const b3 = new THREE.CylinderGeometry(0.04, 0.1, 1.6, 4);
    b3.rotateX(0.8); b3.translate(0, 2.8, 0.6);
    return {
      geometry: mergeGeometries([trunk, b1, b2, b3]),
      material: litMaterial({ color: p.deadTree, flatShading: true, roughness: 1 }),
      shadows: true,
      place: (m, s, rand) => {
        m.scale.setScalar(s);
        m.rotation.set(rand.range(-0.1, 0.1), rand() * 6, rand.range(-0.1, 0.1));
      },
      collider: (RAPIER, m) => RAPIER.ColliderDesc.cylinder(2.5 * m.scale.y, 0.3 * m.scale.x).setTranslation(0, 2.5 * m.scale.y, 0),
      colorJitter: 0.2,
    };
  },

  lavaPool: (p) => {
    const g = new THREE.CircleGeometry(1, 7);
    g.rotateX(-Math.PI / 2);
    return {
      geometry: g,
      material: new THREE.MeshBasicMaterial({ color: p.lava }),
      shadows: false,
      place: (m, s, rand) => {
        m.scale.set(s * rand.range(0.6, 1.4), 1, s * rand.range(0.6, 1.4));
        m.position.y = 0.06;
        m.rotation.y = rand() * 6;
      },
      collider: null,
      colorJitter: 0.2,
    };
  },

  // Hexagonal basalt columns, standing in clumps.
  basaltColumn: (p) => {
    const parts = [];
    for (const [x, z, h] of [[0, 0, 4], [0.9, 0.3, 3], [-0.6, 0.8, 2.4], [0.2, -0.9, 3.4], [-0.8, -0.4, 1.6]]) {
      const c = new THREE.CylinderGeometry(0.5, 0.55, h, 6);
      c.translate(x, h / 2, z);
      parts.push(c);
    }
    return {
      geometry: mergeGeometries(parts),
      material: litMaterial({ color: p.rock, flatShading: true, roughness: 0.85 }),
      shadows: true,
      place: (m, s, rand) => { m.scale.set(s, s * rand.range(0.8, 1.5), s); m.rotation.y = rand() * 6; },
      collider: (RAPIER, m) => RAPIER.ColliderDesc.cylinder(2 * m.scale.y, 1.2 * m.scale.x).setTranslation(0, 2 * m.scale.y, 0),
      colorJitter: 0.3,
    };
  },

  // Glassy black obsidian shards jutting out of the ground.
  obsidian: (p) => {
    const parts = [];
    for (const [x, z, h, rx, rz] of [[0, 0, 3.2, 0.1, -0.2], [0.6, 0.2, 2, 0.3, 0.4], [-0.5, -0.3, 1.6, -0.4, -0.3]]) {
      const c = new THREE.ConeGeometry(0.45, h, 4);
      c.translate(0, h / 2, 0); c.rotateX(rx); c.rotateZ(rz); c.translate(x, 0, z);
      parts.push(c);
    }
    return {
      geometry: mergeGeometries(parts),
      material: litMaterial({ color: p.obsidian ?? 0x15121c, flatShading: true, roughness: 0.15, metalness: 0.6 }),
      shadows: true,
      place: (m, s, rand) => { m.scale.setScalar(s); m.rotation.y = rand() * 6; },
      collider: (RAPIER, m) => RAPIER.ColliderDesc.cylinder(1.4 * m.scale.y, 0.55 * m.scale.x).setTranslation(0, 1.4 * m.scale.y, 0),
      colorJitter: 0.4,
    };
  },

  // Giant rib bones arching out of the ground (drive under them!).
  ribArch: (p) => {
    const parts = [];
    for (const z of [-1.5, 0, 1.5]) {
      const rib = new THREE.TorusGeometry(4.5, 0.32, 5, 10, Math.PI);
      rib.translate(0, 0, z);
      parts.push(rib);
    }
    const spine = new THREE.CylinderGeometry(0.4, 0.4, 4.2, 6).rotateX(Math.PI / 2);
    spine.translate(0, 4.5, 0);
    parts.push(spine);
    return {
      geometry: mergeGeometries(parts.map((g) => g.index ? g.toNonIndexed() : g)),
      material: litMaterial({ color: p.bone, flatShading: true, roughness: 0.8 }),
      shadows: true,
      place: (m, s, rand) => { m.scale.setScalar(s); m.rotation.y = rand() * 6; m.position.y = -0.3; },
      // Only the two feet of the arch are solid (the middle is a tunnel).
      collider: (RAPIER, m) => {
        const s = m.scale.x, a = m.rotation.y;
        const dx = Math.cos(a) * 4.5 * s, dz = -Math.sin(a) * 4.5 * s;
        const d = RAPIER.ColliderDesc.cuboid(0.5 * s, 1.5 * s, 2.3 * s);
        d.setTranslation(dx, 1.5 * s, dz);
        d.setRotation({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) });
        const d2 = RAPIER.ColliderDesc.cuboid(0.5 * s, 1.5 * s, 2.3 * s);
        d2.setTranslation(-dx, 1.5 * s, -dz);
        d2.setRotation({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) });
        return [d, d2];
      },
      colorJitter: 0.15,
    };
  },

  // Huge horned skulls half-buried in the dust.
  skull: (p) => {
    const cranium = new THREE.SphereGeometry(1, 7, 5);
    cranium.scale(1, 0.85, 1.15);
    cranium.translate(0, 0.9, 0);
    const jaw = new THREE.BoxGeometry(1.2, 0.4, 1.0);
    jaw.translate(0, 0.25, 0.75);
    const hornL = new THREE.ConeGeometry(0.22, 1.6, 5);
    hornL.rotateZ(-1.0); hornL.translate(1.3, 1.5, -0.1);
    const hornR = new THREE.ConeGeometry(0.22, 1.6, 5);
    hornR.rotateZ(1.0); hornR.translate(-1.3, 1.5, -0.1);
    const geo = mergeGeometries([cranium, jaw, hornL, hornR].map((g) => g.index ? g.toNonIndexed() : g));
    geo.deleteAttribute('uv');
    return {
      geometry: geo,
      material: litMaterial({ color: p.bone, flatShading: true, roughness: 0.75 }),
      shadows: true,
      place: (m, s, rand) => { m.scale.setScalar(s); m.rotation.set(rand.range(-0.2, 0.2), rand() * 6, rand.range(-0.2, 0.2)); m.position.y = -0.2 * s; },
      collider: (RAPIER, m) => RAPIER.ColliderDesc.ball(1.0 * m.scale.x).setTranslation(0, 0.8 * m.scale.x, 0),
      colorJitter: 0.2,
    };
  },

  pebble: (p) => ({
    geometry: new THREE.IcosahedronGeometry(1, 0),
    material: litMaterial({ color: p.rock, flatShading: true }),
    shadows: false,
    place: (m, s, rand) => {
      m.scale.set(s, s * 0.6, s);
      m.position.y = s * 0.2;
      m.rotation.set(rand() * 3, rand() * 6, 0);
    },
    collider: null,
    colorJitter: 0.35,
  }),
};

// Uses one "instanced" mesh per prop type: hundreds of copies drawn in a
// single go, which keeps the game fast.
function placeProps(scene, physics, prop, b, half, keepClear, rand) {
  const { RAPIER, world } = physics;
  const mesh = new THREE.InstancedMesh(b.geometry, b.material, prop.count);
  mesh.castShadow = b.shadows;
  mesh.receiveShadow = b.shadows;
  const dummy = new THREE.Object3D();
  const base = new THREE.Color(b.material.color);
  const col = new THREE.Color();
  const fixedBody = prop.solid ? world.createRigidBody(RAPIER.RigidBodyDesc.fixed()) : null;

  for (let i = 0; i < prop.count; i++) {
    let x, z;
    do {
      x = rand.range(-half, half);
      z = rand.range(-half, half);
    } while (keepClear(x, z));

    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    b.place(dummy, rand.range(prop.minScale, prop.maxScale), rand);
    dummy.position.y += terrain.height(x, z); // sit on the hills
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, col.copy(base).multiplyScalar(1 - b.colorJitter / 2 + rand() * b.colorJitter));

    if (fixedBody && b.collider) {
      for (const desc of [].concat(b.collider(RAPIER, dummy))) {
        const t = desc.translation;
        desc.setTranslation(x + t.x, dummy.position.y + t.y, z + t.z).setRestitution(0.2).setFriction(0.5);
        world.createCollider(desc, fixedBody);
      }
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);
}

// The boss arena: a scorched circle ringed by giant bone spikes (with four
// gaps to drive in through), glowing cracks, and a ribcage throne.
function createArena(scene, physics, arena, p, rand) {
  const { RAPIER, world } = physics;
  const { x: ax, z: az, radius: R } = arena;
  const group = new THREE.Group();
  const ay = terrain.height(ax, az);
  group.position.set(ax, ay, az);
  scene.add(group);

  // Scorched floor
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 6, 40).rotateX(-Math.PI / 2),
    litMaterial({ color: 0x2a2220, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }));
  floor.position.y = 0.05;
  floor.receiveShadow = true;
  group.add(floor);

  // Glowing cracks radiating from the middle
  const lava = new THREE.MeshBasicMaterial({ color: p.lava });
  for (let n = 0; n < 14; n++) {
    const a = (n / 14) * Math.PI * 2 + rand() * 0.2;
    const len = R * (0.5 + rand() * 0.5);
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.5 + rand() * 0.6, 0.05, len), lava);
    crack.position.set(Math.sin(a) * len / 2, 0.08, Math.cos(a) * len / 2);
    crack.rotation.y = a;
    group.add(crack);
  }

  // Ring of giant bone spikes, with four gaps to get in
  const boneMat = litMaterial({ color: p.bone, flatShading: true, roughness: 0.8 });
  const spikeGeo = new THREE.ConeGeometry(1.4, 14, 6).translate(0, 7, 0);
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(ax, ay, az));
  const count = 36;
  for (let n = 0; n < count; n++) {
    if (n % 9 === 0 || n % 9 === 1) continue; // gaps
    const a = (n / count) * Math.PI * 2;
    const s = 0.8 + rand() * 0.5;
    const m = new THREE.Mesh(spikeGeo, boneMat);
    m.position.set(Math.sin(a) * (R + 4), 0, Math.cos(a) * (R + 4));
    m.scale.set(s, s * (0.8 + rand() * 0.5), s);
    m.rotation.set(Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25); // lean outward
    m.castShadow = true;
    group.add(m);
    world.createCollider(RAPIER.ColliderDesc.cylinder(5, 1.3 * s).setTranslation(m.position.x, 5, m.position.z), body);
  }

  // Ribcage "throne" behind the boss (on the far side, seen from the start)
  const away = Math.atan2(ax, az); // direction pointing away from the start
  for (let n = 0; n < 6; n++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(6, 0.5, 5, 12, Math.PI), boneMat);
    const d = 16 + n * 2.2;
    rib.position.set(Math.sin(away) * d, 0, Math.cos(away) * d);
    rib.rotation.y = away;
    rib.castShadow = true;
    group.add(rib);
  }
}

// Island arena (Lava Rivers): a basalt island in a lake of lava, ringed by
// basalt columns, with a smoking volcano behind the boss. The lava moat
// itself is drawn by the hazards system.
function createIsland(scene, physics, arena, p, rand) {
  const { RAPIER, world } = physics;
  const { x: ax, z: az, radius: R } = arena;
  const group = new THREE.Group();
  const ay = terrain.height(ax, az);
  group.position.set(ax, ay, az);
  scene.add(group);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 6, 40).rotateX(-Math.PI / 2),
    litMaterial({ color: 0x1c1818, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }));
  floor.position.y = 0.05;
  floor.receiveShadow = true;
  group.add(floor);

  const lava = new THREE.MeshBasicMaterial({ color: p.lava });
  for (let n = 0; n < 18; n++) {
    const a = (n / 18) * Math.PI * 2 + rand() * 0.2;
    const len = R * (0.4 + rand() * 0.6);
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.4 + rand() * 0.6, 0.05, len), lava);
    crack.position.set(Math.sin(a) * len / 2, 0.08, Math.cos(a) * len / 2);
    crack.rotation.y = a;
    group.add(crack);
  }

  // Basalt columns around the shore (gaps to drive through)
  const colMat = litMaterial({ color: p.rock, flatShading: true, roughness: 0.85 });
  const colGeo = new THREE.CylinderGeometry(1.1, 1.3, 1, 6).translate(0, 0.5, 0);
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(ax, ay, az));
  const count = 40;
  for (let n = 0; n < count; n++) {
    if (n % 10 < 3) continue; // gaps
    const a = (n / count) * Math.PI * 2;
    const h = 4 + rand() * 9;
    const m = new THREE.Mesh(colGeo, colMat);
    m.position.set(Math.sin(a) * (R + 1), 0, Math.cos(a) * (R + 1));
    m.scale.set(1, h, 1);
    m.castShadow = true;
    group.add(m);
    world.createCollider(RAPIER.ColliderDesc.cylinder(h / 2, 1.2).setTranslation(m.position.x, h / 2, m.position.z), body);
  }

  // A volcano behind the boss (far side from the start), glowing at the top.
  const away = Math.atan2(ax, az);
  const vx = Math.sin(away) * (R - 14), vz = Math.cos(away) * (R - 14);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(3, 13, 16, 9),
    litMaterial({ color: 0x1a1414, flatShading: true, roughness: 1 }));
  cone.position.set(vx, 8, vz);
  cone.castShadow = true;
  group.add(cone);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.3, 9), new THREE.MeshBasicMaterial({ color: 0xffb030 }));
  top.position.set(vx, 16.05, vz);
  group.add(top);
  world.createCollider(RAPIER.ColliderDesc.cylinder(8, 11).setTranslation(vx, 8, vz), body);
}

// Lake arena (Flooded City): the drowned plaza. The lake itself is carved
// by the terrain; around its shore stand broken columns (gaps to drive
// through) and a half-sunk statue of some forgotten king.
function createLakeShore(scene, physics, arena, p, rand) {
  const { RAPIER, world } = physics;
  const { x: ax, z: az, radius: R } = arena;
  const group = new THREE.Group();
  group.position.set(ax, 0, az);
  scene.add(group);
  const stone = litMaterial({ color: p.stone ?? 0x6a6660, flatShading: true, roughness: 0.85 });
  const colGeo = new THREE.CylinderGeometry(1.1, 1.3, 1, 8).translate(0, 0.5, 0);
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(ax, 0, az));
  const count = 32, ring = R + 16;
  for (let n = 0; n < count; n++) {
    if (n % 8 < 2) continue; // gaps
    const a = (n / count) * Math.PI * 2;
    const h = 3 + rand() * 9;
    const m = new THREE.Mesh(colGeo, stone);
    m.position.set(Math.sin(a) * ring, -0.3, Math.cos(a) * ring);
    m.scale.set(1, h, 1);
    m.rotation.set(rand.range(-0.1, 0.1), 0, rand.range(-0.1, 0.1));
    m.castShadow = true;
    group.add(m);
    world.createCollider(RAPIER.ColliderDesc.cylinder(h / 2, 1.2).setTranslation(m.position.x, h / 2, m.position.z), body);
  }
  // A giant statue sinking in the middle-back of the lake (head and a raised arm)
  const away = Math.atan2(ax, az);
  const sx = Math.sin(away) * R * 0.55, sz = Math.cos(away) * R * 0.55;
  const statue = new THREE.Group();
  statue.position.set(sx, -2, sz);
  statue.rotation.set(0.25, away + Math.PI, 0.15);
  const green = litMaterial({ color: 0x4a6a58, flatShading: true, roughness: 0.7, metalness: 0.3 }); // old bronze
  const head = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 5), green); head.position.y = 6; statue.add(head);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(3, 2.6, 2, 6, 1, true), green); crown.position.y = 9.6; statue.add(crown);
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 6), green); shoulders.position.y = 1.5; statue.add(shoulders);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 12, 2.2), green); arm.position.set(6, 7, 0); arm.rotation.z = -0.3; statue.add(arm);
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.6, 2.4, 6), green); torch.position.set(7.9, 13.4, 0); statue.add(torch);
  const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), new THREE.MeshBasicMaterial({ color: p.lava ?? 0x60ffd0 }));
  flame.position.set(7.9, 15.2, 0); statue.add(flame);
  statue.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  group.add(statue);
  world.createCollider(RAPIER.ColliderDesc.cuboid(6, 6, 3.5).setTranslation(sx, 2, sz), body);
}

// Pool arena (Blood Swamp): the Bog Mother's pool of blood (carved by the
// terrain). Around it: a ring of twisted dead trees hung with bones, gaps to
// drive through, and bone totems.
function createBogPool(scene, physics, arena, p, rand) {
  const { RAPIER, world } = physics;
  const { x: ax, z: az, radius: R } = arena;
  const group = new THREE.Group();
  group.position.set(ax, 0, az);
  scene.add(group);
  const wood = litMaterial({ color: p.deadTree, flatShading: true, roughness: 1 });
  const bone = litMaterial({ color: p.bone, flatShading: true, roughness: 0.8 });
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(ax, 0, az));
  const trunk = new THREE.CylinderGeometry(0.5, 1.1, 1, 6).translate(0, 0.5, 0);
  const count = 30, ring = R + 22;
  for (let n = 0; n < count; n++) {
    if (n % 6 < 2) continue; // gaps
    const a = (n / count) * Math.PI * 2;
    const x = Math.sin(a) * ring, z = Math.cos(a) * ring, y = terrain.height(ax + x, az + z);
    const h = 7 + rand() * 7;
    const t = new THREE.Mesh(trunk, wood);
    t.position.set(x, y - 0.5, z);
    t.scale.set(1, h, 1);
    t.rotation.set(rand.range(-0.2, 0.2), rand() * 6, rand.range(-0.2, 0.2));
    t.castShadow = true;
    group.add(t);
    // a crooked branch, and a skull hanging off it
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 4, 4), wood);
    br.position.set(x, y + h * 0.75, z);
    br.rotation.set(0, a, 1.1);
    group.add(br);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), bone);
    skull.position.set(x + Math.cos(a) * 1.5, y + h * 0.75 - 1.6, z - Math.sin(a) * 1.5);
    group.add(skull);
    world.createCollider(RAPIER.ColliderDesc.cylinder(h / 2, 0.9).setTranslation(x, y + h / 2, z), body);
  }
}

// Glacier arena (Ice Hell): a frozen lake (made by the terrain), with a
// great curved wall of glacier ice behind the Warden and spires of ice
// around the shore (gaps to drive through).
function createGlacier(scene, physics, arena, p, rand) {
  const { RAPIER, world } = physics;
  const { x: ax, z: az, radius: R } = arena;
  const group = new THREE.Group();
  group.position.set(ax, 0, az);
  scene.add(group);
  const ice = litMaterial({ color: p.ice ?? 0x9ad0f0, flatShading: true, roughness: 0.1, metalness: 0.1, emissive: 0x16304a, emissiveIntensity: 0.5 });
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(ax, 0, az));
  const away = Math.atan2(ax, az);
  // The glacier wall: big tilted blocks in an arc behind the Warden
  for (let n = 0; n < 22; n++) {
    const a = away + (n / 21 - 0.5) * 2.4;
    const r = R + 8 + rand() * 6;
    const h = 18 + rand() * 16;
    const m = new THREE.Mesh(new THREE.BoxGeometry(14, h, 10), ice);
    m.position.set(Math.sin(a) * r, h / 2 - 2, Math.cos(a) * r);
    m.rotation.set(rand.range(-0.15, 0.15), a, rand.range(-0.12, 0.12));
    m.castShadow = true;
    group.add(m);
    world.createCollider(RAPIER.ColliderDesc.cuboid(7, h / 2, 5).setTranslation(m.position.x, m.position.y, m.position.z)
      .setRotation({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) }), body);
  }
  // Spires around the rest of the shore
  const spire = new THREE.ConeGeometry(1.6, 1, 5).translate(0, 0.5, 0);
  for (let n = 0; n < 26; n++) {
    const a = away + Math.PI + (n / 26 - 0.5) * 3.6;
    if (n % 6 < 2) continue; // gaps
    const h = 6 + rand() * 10;
    const m = new THREE.Mesh(spire, ice);
    m.position.set(Math.sin(a) * (R + 14), -0.3, Math.cos(a) * (R + 14));
    m.scale.set(1, h, 1);
    m.castShadow = true;
    group.add(m);
    world.createCollider(RAPIER.ColliderDesc.cylinder(h / 2, 1.3).setTranslation(m.position.x, h / 2, m.position.z), body);
  }
}

// Foundry yard arena (Iron Foundry): a cast-iron floor ringed by a wall of
// smokestacks and furnaces (gaps to drive through), glowing slag pools at
// the edges, the Iron Colossus standing in the middle.
function createFoundryYard(scene, physics, arena, p, rand) {
  const { RAPIER, world } = physics;
  const { x: ax, z: az, radius: R } = arena;
  const group = new THREE.Group();
  const ay = terrain.height(ax, az);
  group.position.set(ax, ay, az);
  scene.add(group);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 8, 40).rotateX(-Math.PI / 2),
    litMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.5, polygonOffset: true, polygonOffsetFactor: -1 }));
  floor.position.y = 0.05;
  floor.receiveShadow = true;
  group.add(floor);
  const glowMat = new THREE.MeshBasicMaterial({ color: p.lava ?? 0xff6010 });
  for (let n = 0; n < 12; n++) { // floor seams glowing with heat
    const a = (n / 12) * Math.PI * 2;
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, R * 0.8), glowMat);
    seam.position.set(Math.sin(a) * R * 0.45, 0.08, Math.cos(a) * R * 0.45);
    seam.rotation.y = a;
    group.add(seam);
  }
  const dark = litMaterial({ color: 0x1e1e22, flatShading: true, roughness: 0.8 });
  const steel = litMaterial({ color: p.steel ?? 0x4a4c52, flatShading: true, roughness: 0.6, metalness: 0.4 });
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(ax, ay, az));
  const count = 28;
  for (let n = 0; n < count; n++) {
    if (n % 7 < 2) continue; // gaps
    const a = (n / count) * Math.PI * 2;
    const h = 14 + rand() * 16;
    const x = Math.sin(a) * (R + 10), z = Math.cos(a) * (R + 10);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, h, 8), n % 2 ? dark : steel);
    stack.position.set(x, h / 2, z);
    stack.castShadow = true;
    group.add(stack);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 8), glowMat);
    top.position.set(x, h + 0.1, z);
    group.add(top);
    world.createCollider(RAPIER.ColliderDesc.cylinder(h / 2, 2.2).setTranslation(x, h / 2, z), body);
  }
}
