// A RIP IN REALITY: what Doc's Reality Ripper makes (and what opens when a
// region's boss dies). Not a neat round portal: a jagged, torn crack in the
// air with burning edges, Hell glowing inside, cracks spidering out into
// the air around it, and bits of reality peeling off and drifting away.
// It's built from crossed layers so it has depth from any angle.
import * as THREE from 'three';
import { makeRandom } from '../core/random.js';

// hellView: brighter, fiery inside (seen from Earth: Hell burning on the other side).
export function createRip({ height = 10, width = 2.4, seed = 7, sealed = false, hellView = false } = {}) {
  const rand = makeRandom(seed);
  const group = new THREE.Group();

  // ---- The crack's shape: a wobbly center line, widest in the middle,
  // with ragged, torn edges. ----
  const N = 22;
  const center = [], half = [];
  let x = 0;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    x += (rand() - 0.5) * width * 0.5;
    x *= 0.8;
    center.push(x + Math.sin(t * Math.PI * 1.3) * width * 0.25);
    const bulge = Math.pow(Math.sin(t * Math.PI), 0.75);
    half.push((width / 2) * bulge * (0.55 + rand() * 0.6));
  }
  const outline = (grow, extra, jag) => {
    const pts = [];
    for (let i = 0; i <= N; i++) pts.push(new THREE.Vector2(center[i] - half[i] * grow - extra * Math.sin(i / N * Math.PI) - (rand() * jag), (i / N) * height));
    for (let i = N; i >= 0; i--) pts.push(new THREE.Vector2(center[i] + half[i] * grow + extra * Math.sin(i / N * Math.PI) + (rand() * jag), (i / N) * height));
    return new THREE.Shape(pts);
  };
  const s = sealed ? 0.12 : 1;

  // Burning edges (two glow layers), crossed so they read in 3D
  const glowOuter = new THREE.ShapeGeometry(outline(1.9 * s, 0.35 * s, 0.25 * s));
  const glowInner = new THREE.ShapeGeometry(outline(1.35 * s, 0.12 * s, 0.12 * s));
  const add = (geo, color, opacity, z, ry = 0) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
    }));
    m.position.z = z;
    m.rotation.y = ry;
    m.renderOrder = 2;
    group.add(m);
    return m;
  };
  const layers = [];
  for (const ry of [0, 1.0, -1.0]) {
    const k = ry === 0 ? 1 : 0.45;
    layers.push(add(glowOuter, sealed ? 0x601008 : 0xff4a10, 0.5 * k, -0.02, ry));
    layers.push(add(glowInner, sealed ? 0x902010 : 0xffc040, 0.75 * k, -0.01, ry));
  }

  // The void: looking into Hell (glowing red in the middle, black at the torn edges)
  const voidGeo = new THREE.ShapeGeometry(outline(1.0 * s, 0, 0.05));
  const pos = voidGeo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const hot = new THREE.Color(sealed ? 0x200404 : hellView ? 0xff5a10 : 0xa01a04), cold = new THREE.Color(hellView ? 0x300402 : 0x050000), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp(pos.getY(i) / height, 0, 1);
    const k = Math.round(t * N);
    const d = Math.abs(pos.getX(i) - center[k]) / Math.max(0.05, half[k] * s);
    c.copy(cold).lerp(hot, Math.max(0, 1 - d) * (0.6 + 0.4 * Math.sin(t * Math.PI)));
    col.set([c.r, c.g, c.b], i * 3);
  }
  voidGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // (marked transparent so it's drawn after the glow layers and stays dark on top of them)
  const voidMesh = new THREE.Mesh(voidGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false, transparent: true, opacity: 1, depthWrite: false }));
  voidMesh.renderOrder = 3; // drawn over the glow, so the inside stays dark
  group.add(voidMesh);

  // Cracks spidering out into the air
  const crack = [];
  if (!sealed) {
    for (let b = 0; b < 9; b++) {
      const i = 2 + Math.floor(rand() * (N - 4));
      const side = rand() < 0.5 ? -1 : 1;
      let px = center[i] + side * half[i] * 1.2, py = (i / N) * height, ang = side > 0 ? rand() * 1.2 - 0.6 : Math.PI + rand() * 1.2 - 0.6;
      const len = 4 + Math.floor(rand() * 4);
      for (let k = 0; k < len; k++) {
        const step = width * (0.25 + rand() * 0.3);
        const nx = px + Math.cos(ang) * step, ny = py + Math.sin(ang) * step;
        crack.push(px, py, 0, nx, ny, 0);
        px = nx; py = ny; ang += (rand() - 0.5) * 1.1;
      }
    }
  }
  const crackGeo = new THREE.BufferGeometry();
  crackGeo.setAttribute('position', new THREE.Float32BufferAttribute(crack, 3));
  const cracks = new THREE.LineSegments(crackGeo, new THREE.LineBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  group.add(cracks);

  // Shards of reality peeling off the edges
  const shardGeo = new THREE.BufferGeometry();
  shardGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.25, 0, -0.18, -0.15, 0, 0.2, -0.1, 0], 3));
  const shardMats = [0xff6a20, 0x1a0a06, 0xffc040].map((color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: false }));
  const shards = [];
  for (let k = 0; k < (sealed ? 0 : 36); k++) {
    const m = new THREE.Mesh(shardGeo, shardMats[k % 3]);
    group.add(m);
    shards.push({ m, life: rand() * 3, max: 3 });
  }
  const resetShard = (sh) => {
    const i = Math.floor(Math.random() * (N + 1));
    const side = Math.random() < 0.5 ? -1 : 1;
    sh.m.position.set(center[i] + side * half[i] * s, (i / N) * height, (Math.random() - 0.5) * 0.3);
    sh.v = new THREE.Vector3(side * (0.4 + Math.random()), 0.3 + Math.random() * 0.8, (Math.random() - 0.5) * 1.5);
    sh.spin = new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4);
    sh.life = 0;
    sh.max = 1.5 + Math.random() * 2;
    sh.m.scale.setScalar(0.6 + Math.random() * 1.4);
  };
  shards.forEach(resetShard);

  let t = 0;
  return {
    group,
    height,
    update(dt) {
      t += dt;
      const flick = 0.85 + Math.sin(t * 13) * 0.08 + Math.random() * 0.1;
      layers.forEach((l, k) => { l.material.opacity = (k % 2 ? 0.75 : 0.5) * (l.rotation.y ? 0.45 : 1) * flick; });
      group.scale.x = 1 + Math.sin(t * 2.1) * 0.05 + (Math.random() - 0.5) * 0.03;
      cracks.material.opacity = 0.5 + Math.random() * 0.5;
      for (const sh of shards) {
        sh.life += dt;
        if (sh.life > sh.max) resetShard(sh);
        sh.m.position.addScaledVector(sh.v, dt);
        sh.m.rotation.x += sh.spin.x * dt; sh.m.rotation.y += sh.spin.y * dt; sh.m.rotation.z += sh.spin.z * dt;
        const f = 1 - sh.life / sh.max;
        sh.m.scale.setScalar(Math.max(0.01, f * 1.6));
      }
    },
  };
}
