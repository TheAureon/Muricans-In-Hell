// THE FACTORY HALL (Iron Foundry): the whole region is indoors, one
// gigantic, low, crowded factory floor:
//  - a low steel roof with a grid of trusses and red skylights (Hell outside)
//  - a forest of support columns with hazard stripes (solid)
//  - fat pipes running along the ceiling, and pipe bridges on posts low
//    enough that you drive right under them
//  - gantry cranes with hooks hanging on chains
//  - catwalks with railings strung between the columns
//  - lamps hanging low on cables, painted aisle lines on the concrete
//  - outer walls with rows of lit windows where the sky used to be
//   region.indoor = { height, grid (column spacing m) }
// The roof never casts shadows (that would put everything in the dark).
// Everything big is instanced, so a hall this size stays cheap to draw.
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';
import { terrain } from './terrain.js';
import { makeRandom } from '../core/random.js';

export function createFactoryHall(scene, physics, region, keepClear = () => false) {
  const I = region.indoor;
  const H = I.height ?? 24;
  const step = I.grid ?? 70;
  const size = region.terrain.size, half = size / 2 - 20;
  const rand = makeRandom(region.id.length * 523);
  const { RAPIER, world } = physics;
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const steel = litMaterial({ color: region.palette.steel ?? 0x6e7078, flatShading: true, roughness: 0.6, metalness: 0.4 });
  const dark = litMaterial({ color: 0x2e2e34, flatShading: true, roughness: 0.8, metalness: 0.3 });
  const yellow = litMaterial({ color: 0xe0b020, flatShading: true, roughness: 0.6 });
  const pipeMat = litMaterial({ color: 0x7a4a30, flatShading: true, roughness: 0.5, metalness: 0.5 });   // rusty copper
  const pipeMat2 = litMaterial({ color: 0x4a6a5a, flatShading: true, roughness: 0.5, metalness: 0.4 });  // old green paint
  const glow = new THREE.MeshBasicMaterial({ color: region.palette.lava ?? 0xffa030 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd8a0 });
  // (Unlit, so its underside isn't pitch black; the haze fades it in the distance.)
  const roofMat = new THREE.MeshBasicMaterial({ color: 0x2a2220, side: THREE.DoubleSide });
  const sky = new THREE.MeshBasicMaterial({ color: 0xb02a10 }); // Hell, through the skylights
  const d = new THREE.Object3D();
  // Build an InstancedMesh from a list of placements { x, y, z, ry, sx, sy, sz }
  const inst = (geo, mat, list, { shadow = false } = {}) => {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((p, i) => {
      d.position.set(p.x, p.y, p.z);
      d.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
      d.scale.set(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.castShadow = shadow;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const solid = (x, y, z, hx, hy, hz, ry = 0) => world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz)
    .setTranslation(x, y, z).setRotation({ x: 0, y: Math.sin(ry / 2), z: 0, w: Math.cos(ry / 2) }), body);
  const grid = [];
  for (let v = -half + step; v < half; v += step) grid.push(v);

  // ---- Roof, skylights, trusses ----
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2), roofMat);
  roof.position.y = H;
  scene.add(roof);
  const skylights = [];
  for (let k = 1; k < grid.length; k += 3) skylights.push({ x: grid[k] + step / 2, y: H - 0.05, z: 0, sz: size - 40 });
  inst(new THREE.PlaneGeometry(10, 1).rotateX(Math.PI / 2), sky, skylights);
  const trusses = [];
  for (const v of grid) {
    trusses.push({ x: v, y: H - 1.2, z: 0, sz: size }, { x: 0, y: H - 1.2, z: v, sx: size });
  }
  inst(new THREE.BoxGeometry(1, 2.2, 1), steel, trusses);
  // diagonal bracing between the trusses (the zig-zag look)
  const braces = [];
  for (const v of grid) for (let t = -half; t < half; t += 12) braces.push({ x: v, y: H - 1.2, z: t + 6, rx: 0.7 });
  inst(new THREE.BoxGeometry(0.25, 0.25, 8.5), steel, braces);

  // ---- Columns (solid) ----
  const cols = [];
  for (const x of grid) for (const z of grid) if (!keepClear(x, z) && Math.hypot(x, z) > 50) cols.push([x, z]);
  inst(new THREE.BoxGeometry(2, H, 2).translate(0, H / 2, 0), steel, cols.map(([x, z]) => ({ x, y: terrain.height(x, z), z })), { shadow: true });
  inst(new THREE.BoxGeometry(3.2, 1.2, 3.2).translate(0, 0.6, 0), dark, cols.map(([x, z]) => ({ x, y: terrain.height(x, z), z })));
  inst(new THREE.BoxGeometry(2.2, 0.7, 2.2), yellow, cols.map(([x, z]) => ({ x, y: terrain.height(x, z) + 2, z })));
  for (const [x, z] of cols) solid(x, H / 2, z, 1.6, H / 2, 1.6);

  // ---- Ceiling pipes: bundles running the length of the hall ----
  const pipesA = [], pipesB = [];
  for (let k = 0; k < grid.length; k += 2) {
    const z = grid[k] + 8;
    pipesA.push({ x: 0, y: H - 4, z, rz: Math.PI / 2, sy: size, sx: 1.3, sz: 1.3 });
    pipesB.push({ x: 0, y: H - 4.6, z: z + 3, rz: Math.PI / 2, sy: size, sx: 0.8, sz: 0.8 });
    pipesB.push({ x: 0, y: H - 3.4, z: z + 5, rz: Math.PI / 2, sy: size, sx: 0.6, sz: 0.6 });
  }
  inst(new THREE.CylinderGeometry(0.7, 0.7, 1, 8), pipeMat, pipesA);
  inst(new THREE.CylinderGeometry(0.7, 0.7, 1, 8), pipeMat2, pipesB);

  // ---- Pipe bridges: pipes on posts, low enough to drive under ----
  const racks = [], rackPosts = [], rackPipes = [];
  for (let n = 0; n < 90; n++) {
    const along = rand() < 0.5, c = grid[Math.floor(rand() * grid.length)] + step / 2, from = grid[Math.floor(rand() * (grid.length - 3))];
    const len = step * (2 + Math.floor(rand() * 3));
    const mid = from + len / 2;
    const cx = along ? mid : c, cz = along ? c : mid;
    // posts every 20 m, skipped where they'd land on the machinery
    for (let t = -len / 2; t <= len / 2; t += 20) {
      const px = along ? cx + t : cx, pz = along ? cz : cz + t;
      if (keepClear(px, pz) || Math.hypot(px, pz) < 50) continue;
      rackPosts.push({ x: px, y: terrain.height(px, pz), z: pz });
      solid(px, 5.5, pz, 0.5, 5.5, 0.5);
    }
    racks.push({ x: cx, y: 11, z: cz, ry: along ? Math.PI / 2 : 0, sz: len });
    for (const [o, y, r] of [[-0.8, 11.9, 0.6], [0.8, 11.9, 0.45], [0, 12.6, 0.35]]) {
      rackPipes.push({ x: cx + (along ? 0 : o), y, z: cz + (along ? o : 0), rx: along ? 0 : Math.PI / 2, rz: along ? Math.PI / 2 : 0, sy: len, sx: r / 0.7, sz: r / 0.7 });
    }
  }
  inst(new THREE.BoxGeometry(0.8, 11, 0.8).translate(0, 5.5, 0), dark, rackPosts, { shadow: true });
  inst(new THREE.BoxGeometry(3, 0.5, 1), steel, racks);
  inst(new THREE.CylinderGeometry(0.7, 0.7, 1, 8), pipeMat2, rackPipes, { shadow: true });

  // ---- Gantry cranes, with hooks hanging on chains ----
  const beams = [], trolleys = [], chains = [], hooks = [];
  for (let n = 0; n < 80; n++) {
    const x = grid[Math.floor(rand() * (grid.length - 1))] + step / 2, z = grid[Math.floor(rand() * grid.length)];
    beams.push({ x, y: H - 3.5, z, sx: step });
    const tx = x + (rand() - 0.5) * step * 0.7, drop = 4 + rand() * 6;
    trolleys.push({ x: tx, y: H - 4.6, z });
    chains.push({ x: tx, y: H - 5 - drop / 2, z, sy: drop });
    hooks.push({ x: tx, y: H - 5.3 - drop, z });
  }
  inst(new THREE.BoxGeometry(1, 1.8, 2.2), yellow, beams);
  inst(new THREE.BoxGeometry(3, 1.4, 2.8), dark, trolleys);
  inst(new THREE.BoxGeometry(0.2, 1, 0.2), dark, chains);
  inst(new THREE.TorusGeometry(0.6, 0.18, 5, 10, Math.PI * 1.4), steel, hooks);

  // ---- Catwalks between the columns (with railings) ----
  const walks = [], rails = [];
  for (let n = 0; n < 120; n++) {
    const along = rand() < 0.5, a = grid[Math.floor(rand() * (grid.length - 1))], b = grid[Math.floor(rand() * grid.length)];
    const x = along ? a + step / 2 : b, z = along ? b : a + step / 2;
    walks.push({ x, y: 15, z, ry: along ? 0 : Math.PI / 2, sx: step });
    for (const s of [-1, 1]) rails.push({ x: x + (along ? 0 : s * 1.1), y: 16, z: z + (along ? s * 1.1 : 0), ry: along ? 0 : Math.PI / 2, sx: step });
  }
  inst(new THREE.BoxGeometry(1, 0.25, 2.2), dark, walks, { shadow: true });
  inst(new THREE.BoxGeometry(1, 0.12, 0.12), yellow, rails);

  // ---- Lamps hanging low on cables ----
  const lamps = [], cables = [];
  for (const x of grid) for (const z of grid) {
    if ((Math.round(x / step) + Math.round(z / step)) % 2) continue;
    const lx = x + step / 2, lz = z + step / 2;
    lamps.push({ x: lx, y: H - 8, z: lz });
    cables.push({ x: lx, y: H - 4.5, z: lz, sy: 7 });
  }
  inst(new THREE.CylinderGeometry(1.2, 2.0, 1.0, 8), lampMat, lamps);
  inst(new THREE.BoxGeometry(0.12, 1, 0.12), dark, cables);

  // ---- Painted aisle lines on the concrete ----
  const lines = [];
  for (const v of grid) {
    for (const o of [-5, 5]) {
      lines.push({ x: v + step / 2 + o, y: 0.05, z: 0, sz: size - 40 });
      lines.push({ x: 0, y: 0.05, z: v + step / 2 + o, sx: size - 40 });
    }
  }
  inst(new THREE.BoxGeometry(0.5, 0.02, 0.5), new THREE.MeshBasicMaterial({ color: 0x6a5420 }), lines);

  // ---- Outer walls, with rows of lit windows ----
  const wallMat = litMaterial({ color: 0x3a3430, flatShading: true, roughness: 0.9 });
  const windows = [];
  for (const [x, z, ry] of [[0, half + 18, 0], [0, -half - 18, 0], [half + 18, 0, Math.PI / 2], [-half - 18, 0, Math.PI / 2]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(size, H, 4), wallMat);
    wall.position.set(x, H / 2 - 1, z);
    wall.rotation.y = ry;
    scene.add(wall);
    for (const wy of [H * 0.35, H * 0.7]) {
      for (let t = -size / 2 + 15; t < size / 2 - 15; t += 24) {
        windows.push(ry ? { x: x - Math.sign(x) * 2.3, y: wy, z: t, ry } : { x: t, y: wy, z: z - Math.sign(z) * 2.3 });
      }
    }
  }
  inst(new THREE.BoxGeometry(6, 2.6, 0.3), glow, windows);
}
