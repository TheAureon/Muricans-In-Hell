// A REGION TELEPORTER. Doc's teleporters run on hell magic, so they only
// work where there's a natural source of it: a cluster of purple crystals,
// with a beam of light you can see from far away.
//   - Drive into the field the first time: the teleporter gets set up.
//   - Stay in the field: your car is completely healed.
//   - Press F on it: teleport home to the base (and back from the base pad).
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';

export class Teleporter {
  // cfg: { x, z, radius }
  constructor(scene, cfg) {
    this.pos = new THREE.Vector3(cfg.x, 0, cfg.z);
    this.radius = cfg.radius || 14;
    this.established = false;
    this.t = 0;
    const g = new THREE.Group();
    g.position.copy(this.pos);
    scene.add(g);
    this.root = g;

    // Crystal cluster (the hell-magic source), off to one side of the pad
    const crystalMat = litMaterial({ color: 0x8a3aff, emissive: 0x7a20ff, emissiveIntensity: 1.6, flatShading: true, roughness: 0.2 });
    this.crystalMat = crystalMat;
    const crystals = new THREE.Group();
    crystals.position.set(-7, 0, -5);
    for (let k = 0; k < 7; k++) {
      const h = 2 + (k === 0 ? 5 : Math.random() * 3);
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), crystalMat);
      c.scale.set(0.7, h, 0.7);
      const a = k * 2.4, r = k === 0 ? 0 : 1.2 + Math.random();
      c.position.set(Math.cos(a) * r, h * 0.6, Math.sin(a) * r);
      c.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 3, (Math.random() - 0.5) * 0.5);
      c.castShadow = true;
      crystals.add(c);
    }
    g.add(crystals);
    // The beam (visible from far away)
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 260, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xb060ff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    this.beam.position.set(-7, 130, -5);
    g.add(this.beam);
    // The field (where you heal)
    this.field = new THREE.Mesh(new THREE.RingGeometry(this.radius - 0.4, this.radius, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xb060ff, transparent: true, opacity: 0.4, depthWrite: false }));
    this.field.position.y = 0.1;
    g.add(this.field);

    // Doc's pad (appears when the teleporter gets set up)
    this.pad = new THREE.Group();
    const steel = litMaterial({ color: 0x5a5d63, flatShading: true, roughness: 0.6, metalness: 0.5 });
    const dark = litMaterial({ color: 0x1e1e20, flatShading: true });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 0.4, 16), steel);
    disc.position.y = 0.2;
    disc.receiveShadow = true;
    this.pad.add(disc);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.18, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb060ff }));
    this.ring.position.y = 0.5;
    this.pad.add(this.ring);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 0.4), dark);
      p.position.set(Math.cos(a) * 4.2, 1.5, Math.sin(a) * 4.2);
      p.castShadow = true;
      this.pad.add(p);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0x7fd8ff }));
      tip.position.set(Math.cos(a) * 4.2, 3.2, Math.sin(a) * 4.2);
      this.pad.add(tip);
    }
    this.pad.visible = false;
    g.add(this.pad);
  }

  setEstablished(on) {
    this.established = on;
    this.pad.visible = on;
  }

  inField(p) { return Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < this.radius; }
  onPad(p) { return this.established && Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 4.5; }

  update(dt, sparks) {
    this.t += dt;
    this.crystalMat.emissiveIntensity = 1.4 + Math.sin(this.t * 2) * 0.4;
    this.beam.material.opacity = 0.18 + Math.sin(this.t * 1.3) * 0.06;
    this.field.material.opacity = 0.3 + Math.sin(this.t * 3) * 0.12;
    this.ring.rotation.y += dt * 1.5;
    if (sparks && Math.random() < 0.4) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * this.radius;
      sparks.spawn(new THREE.Vector3(this.pos.x + Math.cos(a) * r, 0.2, this.pos.z + Math.sin(a) * r), new THREE.Vector3(0, 1.5 + Math.random() * 2, 0), 0.08, 1.2);
    }
  }
}
