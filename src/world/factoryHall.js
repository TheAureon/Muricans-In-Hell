// THE FACTORY HALL (Iron Foundry): the whole region is indoors. A steel
// roof high overhead held up by a forest of columns, roof trusses, hanging
// lamps, skylights glowing red with Hell outside, and great outer walls
// with rows of lit windows where the sky used to be.
//   region.indoor = { height, grid (column spacing m), keepClear(x, z) }
// The roof never casts shadows (that would put everything in the dark).
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';
import { terrain } from './terrain.js';

export function createFactoryHall(scene, physics, region, keepClear = () => false) {
  const I = region.indoor;
  const H = I.height ?? 42;
  const size = region.terrain.size, half = size / 2 - 20;
  const { RAPIER, world } = physics;
  const steel = litMaterial({ color: region.palette.steel ?? 0x6e7078, flatShading: true, roughness: 0.6, metalness: 0.4 });
  const dark = litMaterial({ color: 0x2a2a30, flatShading: true, roughness: 0.8, metalness: 0.3 });
  // (Unlit, so its underside isn't pitch black; the haze fades it in the distance.)
  const roofMat = new THREE.MeshBasicMaterial({ color: 0x2e2420, side: THREE.DoubleSide });
  const glow = new THREE.MeshBasicMaterial({ color: region.palette.lava ?? 0xffa030 });
  const sky = new THREE.MeshBasicMaterial({ color: 0xc02a10, fog: false }); // Hell, seen through the skylights
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd8a0 });

  // The roof itself: one big sheet...
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2), roofMat);
  roof.position.y = H;
  scene.add(roof);
  // ...with long skylight strips glowing red
  const step = I.grid ?? 110;
  for (let x = -half + step / 2; x < half; x += step * 2) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(12, size - 40).rotateX(Math.PI / 2), sky);
    s.position.set(x, H - 0.05, 0);
    scene.add(s);
  }

  // Roof trusses (steel beams in a grid) and hanging lamps
  const lines = [];
  for (let v = -half; v <= half; v += step / 2) lines.push(v);
  const beams = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 2.6, 1), steel, lines.length * 2);
  const d = new THREE.Object3D();
  let n = 0;
  for (const v of lines) {
    d.position.set(v, H - 1.4, 0); d.rotation.set(0, 0, 0); d.scale.set(1, 1, size); d.updateMatrix(); beams.setMatrixAt(n++, d.matrix);
    d.position.set(0, H - 1.4, v); d.scale.set(size, 1, 1); d.updateMatrix(); beams.setMatrixAt(n++, d.matrix);
  }
  scene.add(beams);
  const lampSpots = [];
  for (const x of lines) for (const z of lines) if ((Math.round(x / (step / 2)) + Math.round(z / (step / 2))) % 2 === 0) lampSpots.push([x, z]);
  const lamps = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.6, 2.4, 1.2, 8), lampMat, lampSpots.length);
  const cables = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 10, 0.15), dark, lampSpots.length);
  lampSpots.forEach(([x, z], i) => {
    d.scale.set(1, 1, 1);
    d.position.set(x, H - 13, z); d.updateMatrix(); lamps.setMatrixAt(i, d.matrix);
    d.position.set(x, H - 7.5, z); d.updateMatrix(); cables.setMatrixAt(i, d.matrix);
  });
  scene.add(lamps, cables);

  // Columns holding it all up (solid), on a grid, but never on the machinery
  const cols = [];
  for (let x = -half + step; x < half; x += step) {
    for (let z = -half + step; z < half; z += step) {
      if (keepClear(x, z) || Math.hypot(x, z) < 60) continue;
      cols.push([x, z]);
    }
  }
  const colMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, H, 2.4).translate(0, H / 2, 0), steel, cols.length);
  const baseMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(4, 1.6, 4).translate(0, 0.8, 0), dark, cols.length);
  const stripe = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.8, 2.6), litMaterial({ color: 0xe0b020, flatShading: true }), cols.length);
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  cols.forEach(([x, z], i) => {
    const g = terrain.height(x, z);
    d.position.set(x, g, z); d.updateMatrix(); colMesh.setMatrixAt(i, d.matrix); baseMesh.setMatrixAt(i, d.matrix);
    d.position.set(x, g + 2.2, z); d.updateMatrix(); stripe.setMatrixAt(i, d.matrix);
    world.createCollider(RAPIER.ColliderDesc.cuboid(2, H / 2, 2).setTranslation(x, g + H / 2, z), body);
  });
  colMesh.castShadow = true;
  colMesh.receiveShadow = baseMesh.receiveShadow = true;
  scene.add(colMesh, baseMesh, stripe);

  // The outer walls, with rows of lit windows
  const wallMat = litMaterial({ color: 0x3a3430, flatShading: true, roughness: 0.9 });
  for (const [x, z, ry] of [[0, half + 18, 0], [0, -half - 18, 0], [half + 18, 0, Math.PI / 2], [-half - 18, 0, Math.PI / 2]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(size, H, 4), wallMat);
    wall.position.set(x, H / 2 - 1, z);
    wall.rotation.y = ry;
    scene.add(wall);
    const inward = new THREE.Vector3(-Math.sign(x), 0, -Math.sign(z)).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0);
    const win = new THREE.InstancedMesh(new THREE.BoxGeometry(6, 3, 0.3), glow, 2 * Math.floor(size / 30));
    let k = 0;
    for (const wy of [H * 0.45, H * 0.75]) {
      for (let t = -size / 2 + 15; t < size / 2 - 15 && k < win.count; t += 30) {
        const p = ry ? new THREE.Vector3(x, wy, t) : new THREE.Vector3(t, wy, z);
        p.addScaledVector(inward, 2.3);
        d.position.copy(p); d.rotation.set(0, ry, 0); d.updateMatrix(); win.setMatrixAt(k++, d.matrix);
      }
    }
    win.count = k;
    scene.add(win);
  }
}
