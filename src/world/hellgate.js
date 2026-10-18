// THE HELLGATE: a rip in reality that tears open next to a region's arena
// once its boss is dead. Drive into it to travel to the next region. If the
// next region isn't built yet, it stays a thin, dim, sealed scar.
import * as THREE from 'three';
import { createRip } from './rip.js';

export class Hellgate {
  constructor(scene, position, faceToward, leadsTo) {
    this.pos = position.clone().setY(0);
    this.leadsTo = leadsTo; // region data, or null = sealed
    this.open = false;
    this.t = 0;

    const g = new THREE.Group();
    g.position.copy(this.pos);
    g.rotation.y = Math.atan2(faceToward.x - this.pos.x, faceToward.z - this.pos.z);
    // The rip itself, hovering just off the ground
    this.rip = createRip({ height: 13, width: 4.2, seed: 23, sealed: !leadsTo });
    this.rip.group.position.y = 0.3;
    g.add(this.rip.group);
    // Scorched, glowing ground under it
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(7, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x0c0302, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    scorch.position.y = 0.06;
    g.add(scorch);
    const glow = new THREE.Mesh(new THREE.RingGeometry(1.2, 4.5, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: leadsTo ? 0xff4a10 : 0x401008, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.y = 0.08;
    g.add(glow);
    this.glow = glow;
    this.label = leadsTo ? leadsTo.name : null;
    this.root = g;
    g.visible = false;
    scene.add(g);
  }

  setOpen(open) {
    this.open = open;
    this.root.visible = open;
  }

  // Returns true when the car drives into it.
  update(dt, car, sparks) {
    if (!this.open) return false;
    this.t += dt;
    this.rip.update(dt);
    this.glow.material.opacity = 0.25 + Math.sin(this.t * 3) * 0.1;
    if (sparks && this.leadsTo && Math.random() < 0.6) {
      const p = new THREE.Vector3((Math.random() - 0.5) * 3, 0.5 + Math.random() * 12, 0).applyQuaternion(this.root.quaternion).add(this.pos);
      sparks.spawn(p, new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3), 0.12, 0.7);
    }
    const d = Math.hypot(car.currPos.x - this.pos.x, car.currPos.z - this.pos.z);
    this.near = d < 4.5 && !car.wrecked;
    return this.near;
  }

  distanceTo(p) { return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); }
}
