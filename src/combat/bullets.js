// Real bullets: they fly from the gun, hit demons or the ground.
import * as THREE from 'three';
import { SETTINGS } from '../settings.js';

export class Bullets {
  constructor(scene, { demons, dust, gore, audio }) {
    this.demons = demons;
    this.dust = dust;
    this.gore = gore;
    this.audio = audio;
    const geo = new THREE.BoxGeometry(0.09, 0.09, 2.0);
    geo.translate(0, 0, -1.0); // tail trails behind the tip
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe080 });
    this.pool = Array.from({ length: 64 }, () => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, pos: new THREE.Vector3(), dir: new THREE.Vector3(), traveled: 0, active: false };
    });
    this.next = 0;
  }

  fire(from, target) {
    const T = SETTINGS.turret;
    const b = this.pool[this.next];
    this.next = (this.next + 1) % this.pool.length;
    b.pos.copy(from);
    b.dir.subVectors(target, from).normalize();
    // A bit of random spread
    const s = THREE.MathUtils.degToRad(T.spread);
    b.dir.x += (Math.random() - 0.5) * s * 2;
    b.dir.y += (Math.random() - 0.5) * s * 2;
    b.dir.z += (Math.random() - 0.5) * s * 2;
    b.dir.normalize();
    b.traveled = 0;
    b.active = true;
    b.mesh.visible = true;
    b.mesh.position.copy(b.pos);
    b.mesh.lookAt(_tmp.copy(b.pos).add(b.dir)); // point the tracer where it's going
  }

  update(dt) {
    const T = SETTINGS.turret;
    for (const b of this.pool) {
      if (!b.active) continue;
      let step = T.bulletSpeed * dt;
      // Hit a demon?
      const hit = this.demons.segmentHit(b.pos, b.dir, step);
      if (hit) {
        b.pos.addScaledVector(b.dir, hit.t);
        this.gore.spray(b.pos, b.dir);
        this.audio.hit();
        this.demons.damage(hit.demon, T.damage, 'gun', b.dir.clone().multiplyScalar(14));
        this.#stop(b);
        continue;
      }
      // Hit the ground?
      const nextY = b.pos.y + b.dir.y * step;
      if (nextY <= 0 && b.dir.y < 0) {
        step = -b.pos.y / b.dir.y;
        b.pos.addScaledVector(b.dir, step);
        for (let i = 0; i < 2; i++) {
          this.dust.spawn(b.pos, new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3), 0.25, 0.5);
        }
        this.#stop(b);
        continue;
      }
      b.pos.addScaledVector(b.dir, step);
      b.traveled += step;
      if (b.traveled > T.range) { this.#stop(b); continue; }
      b.mesh.position.copy(b.pos);
    }
  }

  #stop(b) {
    b.active = false;
    b.mesh.visible = false;
  }
}
const _tmp = new THREE.Vector3();
