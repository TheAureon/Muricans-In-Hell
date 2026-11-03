// THE MIRROR LOOK (Mirror Wastes): chrome and glass everywhere.
//  - A shared "environment" picture (red sky above, dark glass below) that
//    mirror materials reflect, so they look like polished chrome.
//  - The mirrored CEILING over the whole region: on Medium/High graphics it
//    really reflects the world (you see it all upside down above you); on
//    Low it's polished chrome.
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { litMaterial, GFX } from '../core/graphics.js';

let env = null;

// Build the reflection picture once (needs the renderer).
export function setupMirrorEnv(renderer) {
  if (env) return env;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 24, 12);
  const col = [], pos = geo.attributes.position;
  // (pale silvery-violet with a hint of hellfire: chrome should look like chrome, not like copper)
  const top = new THREE.Color(0x2a2236), hor = new THREE.Color(0xe0d8ec), low = new THREE.Color(0x24202c);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 50;
    const c = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.6)) : hor.clone().lerp(low, Math.pow(-y, 0.4));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  // a few bright "lights" so chrome gets highlights
  const ember = new THREE.Mesh(new THREE.SphereGeometry(30, 12, 6, 0, Math.PI * 2, Math.PI * 0.46, Math.PI * 0.05), new THREE.MeshBasicMaterial({ color: 0x5a1a14, side: THREE.BackSide }));
  s.add(ember); // a band of hell-red low on the horizon
  for (const [x, y, z] of [[20, 25, 10], [-25, 18, -15], [5, 30, -25]]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0e0 }));
    b.position.set(x, y, z);
    s.add(b);
  }
  env = pmrem.fromScene(s, 0.02).texture;
  pmrem.dispose();
  return env;
}
export const mirrorEnv = () => env;

// A polished mirror/chrome material.
export function mirrorMaterial(color = 0xc8ccd8, roughness = 0.06, extra = {}) {
  return litMaterial({ color, metalness: 1, roughness, envMap: env, flatShading: true, ...extra });
}

// The mirrored ceiling over the whole region.
export function createMirrorCeiling(scene, region) {
  const size = region.terrain.size, H = region.mirror.ceiling ?? 75;
  const geo = new THREE.PlaneGeometry(size, size);
  let ceiling;
  if (GFX.name !== 'low') {
    const scale = GFX.name === 'high' ? 0.6 : 0.4;
    ceiling = new Reflector(geo, {
      textureWidth: Math.round(window.innerWidth * scale), textureHeight: Math.round(window.innerHeight * scale),
      color: 0x9a8a90, clipBias: 0.003,
    });
  } else {
    ceiling = new THREE.Mesh(geo, mirrorMaterial(0x8a8088, 0.15, { side: THREE.DoubleSide }));
  }
  ceiling.rotation.x = Math.PI / 2; // facing down
  ceiling.position.y = H;
  scene.add(ceiling);
  // Seams between the giant mirror panes (dark lines)
  const seam = new THREE.MeshBasicMaterial({ color: 0x14101a });
  const lines = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.4, 1), seam, 2 * Math.ceil(size / 120));
  const d = new THREE.Object3D();
  let n = 0;
  for (let v = -size / 2; v <= size / 2 && n < lines.count - 1; v += 120) {
    d.position.set(v, H - 0.3, 0); d.scale.set(1.2, 1, size); d.updateMatrix(); lines.setMatrixAt(n++, d.matrix);
    d.position.set(0, H - 0.3, v); d.scale.set(size, 1, 1.2); d.updateMatrix(); lines.setMatrixAt(n++, d.matrix);
  }
  lines.count = n;
  scene.add(lines);
  return ceiling;
}
