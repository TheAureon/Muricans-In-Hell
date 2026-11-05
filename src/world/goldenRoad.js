// THE GOLDEN ROAD (The Throne): gold paving slabs down the middle of the
// canyon all the way to the palace (gaps where the chasms are, and under
// the lava, ice and mud).
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';
import { terrain } from './terrain.js';

export function createGoldenRoad(scene, region, hazards) {
  const C = terrain.canyon;
  if (!C) return;
  const spots = [];
  for (const sg of C.segs) {
    for (let d = 0; d < sg.len; d += 3.2) {
      const x = sg.ax + sg.tx * d, z = sg.az + sg.tz * d;
      const h = terrain.height(x, z);
      if (h < -0.2 || h > 2 || hazards?.lavaAt(x, z, 2)) continue;
      spots.push({ x, z, y: h, yaw: Math.atan2(sg.tx, sg.tz) });
    }
  }
  const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(10, 0.12, 3), litMaterial({ color: region.palette.gold ?? 0xf0c040, flatShading: true, roughness: 0.3, metalness: 0.85 }), spots.length);
  const edge = new THREE.InstancedMesh(new THREE.BoxGeometry(11, 0.14, 0.3), litMaterial({ color: 0x8a5a10, flatShading: true, roughness: 0.4, metalness: 0.7 }), spots.length);
  const d = new THREE.Object3D();
  spots.forEach((p, i) => {
    d.position.set(p.x, p.y + 0.06, p.z);
    d.rotation.set(0, p.yaw, 0);
    d.updateMatrix();
    slabs.setMatrixAt(i, d.matrix);
    d.position.y += 0.01;
    d.updateMatrix();
    edge.setMatrixAt(i, d.matrix);
  });
  slabs.receiveShadow = true;
  scene.add(slabs, edge);
}
