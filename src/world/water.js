// THE WATER SURFACE (Flooded City): one big sheet of murky water at the
// water level. The ground is carved below it where the canals and lakes are
// (see terrain.js), so the water only shows there. Plus stone bridges where
// the streets cross the canals (with railings so you don't drive off).
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';
import { terrain } from './terrain.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class Water {
  // (Also used for the Blood Swamp's pools of blood: pass level and color.)
  // disks: [{ x, z, r }] = only these round patches instead of one sheet over
  // everything (the Throne, which has both ice and blood on one road).
  constructor(scene, physics, region, { level = terrain.waterLevel, color = region.palette.water, opacity = 0.9, disks = null } = {}) {
    this.level = level;
    this.time = 0;
    const p = region.palette;
    const size = region.terrain.size;
    let geo = new THREE.PlaneGeometry(size, size, 1, 1).rotateX(-Math.PI / 2);
    if (disks) geo = mergeGeometries(disks.map((d) => new THREE.CircleGeometry(d.r + 8, 40).rotateX(-Math.PI / 2).translate(d.x, 0, d.z)));
    this.mat = litMaterial({ color, transparent: true, opacity, roughness: 0.1, metalness: 0.25, depthWrite: false });
    this.base = new THREE.Color(color);
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.y = this.level;
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
    this.#bridges(scene, physics, p);
  }

  #bridges(scene, physics, p) {
    const { RAPIER, world } = physics;
    const stone = litMaterial({ color: p.stone ?? 0x6a6660, flatShading: true, roughness: 0.9 });
    const dark = litMaterial({ color: p.stoneDark ?? 0x3a3834, flatShading: true, roughness: 1 });
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    for (const b of terrain.bridges) {
      const g = new THREE.Group();
      g.position.set(b.x, 0, b.z);
      g.rotation.y = Math.atan2(b.tx, b.tz) + Math.PI / 2; // (local z runs across the canal)
      const len = b.across * 2, w = b.along * 2;
      // A solid stone span from the water up to the street
      const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, len), stone);
      deck.position.y = -0.65;
      deck.receiveShadow = true;
      g.add(deck);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, len), dark); // darker band at the waterline
      trim.position.y = -0.45;
      g.add(trim);
      // Railings along both sides, with posts
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, len - 4), stone);
        rail.position.set(side * (w / 2 - 0.2), 0.45, 0);
        rail.castShadow = true;
        g.add(rail);
        for (let k = -2; k <= 2; k++) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.3, 0.6), dark);
          post.position.set(side * (w / 2 - 0.2), 0.65, k * (len - 4) / 4);
          post.castShadow = true;
          g.add(post);
        }
        // Collider for the railing (in world space)
        const off = new THREE.Vector3(side * (w / 2 - 0.2), 0.6, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y);
        world.createCollider(RAPIER.ColliderDesc.cuboid(0.25, 0.8, (len - 4) / 2)
          .setTranslation(b.x + off.x, off.y, b.z + off.z)
          .setRotation({ x: 0, y: Math.sin(g.rotation.y / 2), z: 0, w: Math.cos(g.rotation.y / 2) }), body);
      }
      scene.add(g);
    }
  }

  // A slow shimmer.
  update(dt) {
    this.time += dt;
    this.mat.color.copy(this.base).multiplyScalar(0.92 + Math.sin(this.time * 0.9) * 0.05);
  }
}
