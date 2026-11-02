// BOARDWALKS (Blood Swamp): rickety wooden walkways along the dry paths
// through the bog (see terrain.walks). Planks across, posts at the edges
// every few meters. The ground under them is dry, so they're just for looks:
// they show you the way across without getting stuck.
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';
import { terrain } from './terrain.js';
import { makeRandom } from '../core/random.js';

export function createBoardwalks(scene, region) {
  const walks = terrain.walks;
  if (!walks.length) return;
  const rand = makeRandom(region.id.length * 811);
  const planks = [], posts = [];
  for (const w of walks) {
    for (const sg of w.segs) {
      const yaw = Math.atan2(sg.tx, sg.tz);
      for (let d = 0; d < sg.len; d += 1.1) {
        const x = sg.ax + sg.tx * d, z = sg.az + sg.tz * d;
        if (rand() < 0.06) continue; // a missing plank here and there
        planks.push({ x, z, yaw: yaw + (rand() - 0.5) * 0.08, w: w.width * (0.85 + rand() * 0.1), tilt: (rand() - 0.5) * 0.05 });
        if (Math.floor(d / 1.1) % 5 === 0) for (const s of [-1, 1]) posts.push({ x: x + sg.tz * s * w.width * 0.47, z: z - sg.tx * s * w.width * 0.47, h: 0.8 + rand() * 0.6 });
      }
    }
  }
  const wood = litMaterial({ color: region.palette.wood ?? 0x4a3420, flatShading: true, roughness: 1 });
  const plankMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.12, 0.9), wood, planks.length);
  const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 1, 0.22).translate(0, 0.5, 0), wood, posts.length);
  const m = new THREE.Object3D();
  planks.forEach((pl, i) => {
    m.position.set(pl.x, terrain.height(pl.x, pl.z) + 0.12, pl.z);
    m.rotation.set(0, pl.yaw, pl.tilt);
    m.scale.set(pl.w, 1, 1);
    m.updateMatrix();
    plankMesh.setMatrixAt(i, m.matrix);
  });
  posts.forEach((p, i) => {
    m.position.set(p.x, terrain.height(p.x, p.z) - 0.2, p.z);
    m.rotation.set(0, 0, 0);
    m.scale.set(1, p.h, 1);
    m.updateMatrix();
    postMesh.setMatrixAt(i, m.matrix);
  });
  plankMesh.receiveShadow = true;
  postMesh.castShadow = true;
  scene.add(plankMesh, postMesh);
}
