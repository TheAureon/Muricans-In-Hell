// Beams of light marking places a job wants you to go (sensor spots...).
// Tall enough to see from far away, colored like the person who asked.
import * as THREE from 'three';
import { terrain } from './terrain.js';

const MAX = 8;

export class Beacons {
  constructor(scene) {
    this.items = [];
    this.key = '';
    this.t = 0;
    const beamGeo = new THREE.CylinderGeometry(1.6, 2.4, 160, 16, 1, true).translate(0, 80, 0);
    const coreGeo = new THREE.CylinderGeometry(0.35, 0.5, 160, 8, 1, true).translate(0, 80, 0);
    const ringGeo = new THREE.RingGeometry(7.5, 9, 40).rotateX(-Math.PI / 2);
    const gemGeo = new THREE.OctahedronGeometry(1.2);
    const glow = (opacity) => new THREE.MeshBasicMaterial({ transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    for (let i = 0; i < MAX; i++) {
      const g = new THREE.Group();
      const beam = new THREE.Mesh(beamGeo, glow(0.22));
      const core = new THREE.Mesh(coreGeo, glow(0.7));
      const ring = new THREE.Mesh(ringGeo, glow(0.6));
      const gem = new THREE.Mesh(gemGeo, new THREE.MeshBasicMaterial({ fog: false }));
      ring.position.y = 0.3;
      gem.position.y = 5;
      g.add(beam, core, ring, gem);
      g.visible = false;
      for (const m of g.children) m.renderOrder = 2;
      scene.add(g);
      this.items.push({ g, beam, core, ring, gem });
    }
  }

  // points: [{ x, z, color, tracked }]
  set(points) {
    const key = points.map((p) => `${p.x},${p.z},${p.color},${p.tracked}`).join('|');
    if (key === this.key) return;
    this.key = key;
    this.items.forEach((it, i) => {
      const p = points[i];
      it.g.visible = !!p;
      if (!p) return;
      it.g.position.set(p.x, terrain.height(p.x, p.z), p.z);
      for (const m of [it.beam, it.core, it.ring, it.gem]) m.material.color.set(p.color);
      it.tracked = p.tracked;
    });
  }

  update(dt) {
    this.t += dt;
    for (const it of this.items) {
      if (!it.g.visible) continue;
      const k = it.tracked ? 1 : 0.55;
      it.beam.material.opacity = (0.16 + Math.sin(this.t * 2.5) * 0.05) * k;
      it.core.material.opacity = 0.6 * k;
      it.ring.scale.setScalar(1 + (this.t * 0.6 % 1) * 0.3);
      it.ring.material.opacity = 0.7 * (1 - (this.t * 0.6 % 1)) * k;
      it.gem.position.y = 5 + Math.sin(this.t * 2) * 0.6;
      it.gem.rotation.y += dt * 1.5;
    }
  }
}
