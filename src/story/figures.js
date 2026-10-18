// The two heroes as R6-style block figures (for the story scenes): a
// rounded head, a square torso, block arms (one piece, swinging at the
// shoulder) and block legs, with softened edges.
//   HANK: retired F1 champion, ex-military. Leather jacket (his only accessory).
//   DOC:  genius engineer. Lab coat and a hard hat.
// Built facing +Z. Turn them with figure.group.rotation.y; the idle
// animation moves an inner group, so it never undoes that turn.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const U = 0.37; // one "stud": arms/legs are 1x2x1 studs, the torso 2x2x1
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });

function part(parent, w, h, d, material, x, y, z, r = 0.035) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// The shared body. colors: { skin, torso, arms, legs }. Returns the pieces
// so each character can add clothes and pose the arms.
function r6Body(colors) {
  const group = new THREE.Group();
  const body = new THREE.Group(); // (idle animation moves this)
  group.add(body);
  const legH = 2 * U, torsoY = legH + U;
  for (const s of [-1, 1]) part(body, U * 0.98, legH, U, colors.legs, s * U / 2, legH / 2, 0);
  const torso = part(body, 2 * U, 2 * U, U, colors.torso, 0, torsoY, 0);
  // Head: a rounded cylinder sitting on the torso
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(U * 0.62, U * 0.45, 6, 16), colors.skin);
  head.position.set(0, legH + 2 * U + U * 0.7, 0);
  head.castShadow = true;
  body.add(head);
  // Arms hinge at the top of the shoulder
  const arms = [-1, 1].map((s) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 1.5 * U, legH + 2 * U - 0.02, 0);
    body.add(shoulder);
    part(shoulder, U * 0.98, 2 * U, U, colors.arms, 0, -U, 0);
    part(shoulder, U * 0.9, U * 0.35, U * 0.9, colors.skin, 0, -2 * U + U * 0.1, 0, 0.05); // hand
    return shoulder;
  });
  return { group, body, torso, head, arms, legH, torsoY };
}

export function createHank() {
  const C = { skin: mat(0xd8a080), torso: mat(0x2a1a12, { roughness: 0.4 }), arms: mat(0x2a1a12, { roughness: 0.4 }), legs: mat(0x2a3a5a) };
  const f = r6Body(C);
  // Leather jacket details: collar, open front over a white shirt, zip line
  part(f.body, 2 * U + 0.02, U * 0.22, U + 0.04, mat(0x1e120c, { roughness: 0.4 }), 0, f.torsoY + U * 0.92, 0, 0.03);
  part(f.body, U * 0.55, 2 * U - 0.08, 0.02, mat(0xe8e2d8), 0, f.torsoY, U / 2 + 0.005, 0.005);
  part(f.body, 2 * U + 0.02, U * 0.16, U + 0.02, mat(0x1e120c, { roughness: 0.4 }), 0, f.torsoY - U * 0.92, 0, 0.03); // waistband
  part(f.body, 0.02, 2 * U - 0.1, 0.02, mat(0x8a8070, { metalness: 0.8, roughness: 0.3 }), -U * 0.3, f.torsoY, U / 2 + 0.012, 0.005);
  const [R, L] = f.arms;
  L.rotation.z = 0.12; R.rotation.z = -0.12;
  return {
    group: f.group,
    update: (t) => {
      f.body.position.y = Math.sin(t * 2) * 0.006;
      f.body.rotation.y = Math.sin(t * 0.5) * 0.04;
      L.rotation.x = Math.sin(t * 1.1) * 0.04;
      R.rotation.x = -Math.sin(t * 1.1) * 0.04;
    },
  };
}

export function createDoc() {
  const coat = mat(0xf2f2ee);
  const C = { skin: mat(0xe0b090), torso: coat, arms: coat, legs: mat(0x3a3a40) };
  const f = r6Body(C);
  // Lab coat flaps down over the thighs, pocket, and a hard hat
  part(f.body, 2 * U + 0.03, U * 0.8, U + 0.03, coat, 0, f.legH - U * 0.35, 0, 0.02);
  part(f.body, 0.01, U * 0.8, 0.012, mat(0xcfcfca), 0, f.legH - U * 0.35, U / 2 + 0.02, 0.004);
  part(f.body, U * 0.4, U * 0.3, 0.02, mat(0xdcdcd6), U * 0.5, f.torsoY + U * 0.35, U / 2 + 0.01, 0.005);
  const hat = new THREE.Group();
  hat.position.copy(f.head.position).add(new THREE.Vector3(0, U * 0.45, 0));
  f.body.add(hat);
  const yellow = mat(0xf0c020, { roughness: 0.35 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(U * 0.72, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), yellow);
  dome.castShadow = true;
  hat.add(dome);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(U * 0.95, U * 0.95, 0.03, 20), yellow);
  hat.add(brim);
  part(hat, 0.07, 0.07, U * 1.3, yellow, 0, U * 0.68, 0, 0.02); // ridge
  const [R, L] = f.arms;
  L.rotation.z = 0.1;
  return {
    group: f.group,
    update: (t) => {
      f.body.position.y = Math.sin(t * 2.3) * 0.006;
      // Right arm up, jabbing at the plan
      R.rotation.x = -2.5 + Math.sin(t * 3) * 0.12;
      R.rotation.z = -0.25;
      L.rotation.x = Math.sin(t * 1.3) * 0.04;
    },
  };
}
