// The two heroes as chunky low-poly figures (for the story scenes):
//   HANK: retired F1 champion, ex-military. Leather jacket (his one accessory).
//   DOC:  genius engineer. Lab coat and a hard hat.
// Built facing +Z; the story scenes show them from behind.
import * as THREE from 'three';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...extra });

function box(parent, w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// An arm hinged at the shoulder: upper arm + forearm (bent) + hand.
function arm(parent, side, M, sleeve, { up = 0, out = 0.5, bend = 1.2 } = {}) {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.36, 1.52, 0);
  parent.add(shoulder);
  shoulder.rotation.z = side * out;
  shoulder.rotation.x = -up;
  box(shoulder, 0.2, 0.42, 0.22, sleeve, 0, -0.2, 0);
  const elbow = new THREE.Group();
  elbow.position.set(0, -0.4, 0);
  elbow.rotation.z = -side * bend;
  shoulder.add(elbow);
  box(elbow, 0.18, 0.38, 0.2, sleeve, 0, -0.18, 0);
  box(elbow, 0.15, 0.14, 0.16, M.skin, 0, -0.42, 0);
  return { shoulder, elbow };
}

export function createHank() {
  const M = { skin: mat(0xd8a080), jacket: mat(0x2a1a12, { roughness: 0.45 }), jeans: mat(0x2a3a5a), hair: mat(0x1a1210), boot: mat(0x111111), shirt: mat(0xe8e2d8) };
  const g = new THREE.Group();
  box(g, 0.2, 0.82, 0.24, M.jeans, -0.13, 0.43, 0); // legs
  box(g, 0.2, 0.82, 0.24, M.jeans, 0.13, 0.43, 0);
  box(g, 0.24, 0.1, 0.32, M.boot, -0.13, 0.05, 0.04);
  box(g, 0.24, 0.1, 0.32, M.boot, 0.13, 0.05, 0.04);
  box(g, 0.66, 0.74, 0.36, M.jacket, 0, 1.22, 0); // leather jacket
  box(g, 0.68, 0.12, 0.38, M.jacket, 0, 0.88, 0);  // waistband
  box(g, 0.5, 0.12, 0.3, M.jacket, 0, 1.62, -0.02); // collar
  box(g, 0.2, 0.5, 0.02, M.shirt, 0, 1.32, 0.19);   // shirt under the open jacket
  box(g, 0.14, 0.12, 0.14, M.skin, 0, 1.68, 0);     // neck
  box(g, 0.36, 0.38, 0.36, M.skin, 0, 1.92, 0);     // head
  box(g, 0.38, 0.14, 0.38, M.hair, 0, 2.08, -0.02); // hair
  box(g, 0.38, 0.22, 0.1, M.hair, 0, 1.95, -0.16);
  // Hands on hips, elbows out (like the sketch)
  const L = arm(g, 1, M, M.jacket, { out: 0.75, bend: 1.9 });
  const R = arm(g, -1, M, M.jacket, { out: 0.75, bend: 1.9 });
  return { group: g, arms: [L, R], update: (t) => { g.position.y = Math.sin(t * 2) * 0.008; g.rotation.y = Math.sin(t * 0.5) * 0.05; } };
}

export function createDoc() {
  const M = { skin: mat(0xe0b090), coat: mat(0xf2f2ee), pants: mat(0x3a3a40), hat: mat(0xf0c020, { roughness: 0.4 }), shoe: mat(0x222222), hair: mat(0x8a8a88) };
  const g = new THREE.Group();
  box(g, 0.18, 0.8, 0.22, M.pants, -0.12, 0.42, 0);
  box(g, 0.18, 0.8, 0.22, M.pants, 0.12, 0.42, 0);
  box(g, 0.22, 0.1, 0.3, M.shoe, -0.12, 0.05, 0.04);
  box(g, 0.22, 0.1, 0.3, M.shoe, 0.12, 0.05, 0.04);
  box(g, 0.62, 0.8, 0.34, M.coat, 0, 1.2, 0);       // lab coat
  box(g, 0.64, 0.42, 0.36, M.coat, 0, 0.66, 0);     // coat tails down to the knees
  box(g, 0.02, 0.6, 0.01, mat(0xcccccc), 0, 0.8, -0.181); // back seam
  box(g, 0.14, 0.12, 0.14, M.skin, 0, 1.66, 0);
  box(g, 0.34, 0.36, 0.34, M.skin, 0, 1.9, 0);
  box(g, 0.36, 0.12, 0.2, M.hair, 0, 1.8, -0.12);   // grey hair at the back
  // Hard hat: dome + brim
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), M.hat);
  dome.position.set(0, 2.05, 0);
  dome.castShadow = true;
  g.add(dome);
  box(g, 0.56, 0.04, 0.56, M.hat, 0, 2.06, 0.02);
  box(g, 0.06, 0.06, 0.5, M.hat, 0, 2.27, 0);       // ridge
  // One hand on the hip, the other pointing up at the plan
  const L = arm(g, 1, M, M.coat, { out: 0.75, bend: 1.9 });
  const R = arm(g, -1, M, M.coat, { up: 0, out: 2.5, bend: -0.5 });
  return {
    group: g, arms: [L, R],
    update: (t) => {
      g.position.y = Math.sin(t * 2.3) * 0.008;
      R.shoulder.rotation.z = -2.5 + Math.sin(t * 3) * 0.12; // jabbing at the plan
      R.elbow.rotation.z = 0.5 + Math.sin(t * 3 + 1) * 0.15;
    },
  };
}
