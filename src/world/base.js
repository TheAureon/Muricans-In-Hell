// THE BASE (Ash Plains): Doc's walled compound. The garage is a real place
// now: a big hangar (room for absurd builds) inside high walls with three
// gates. Doc's demon wards at the gates keep demons out of the base.
// There's also the home teleporter pad, which links to teleporters you set
// up in other regions.
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';

export class Base {
  // cfg: { x, z, half (half the wall length), gate (gate width) }
  constructor(scene, physics, cfg) {
    this.c = new THREE.Vector3(cfg.x, 0, cfg.z);
    this.half = cfg.half;
    this.gate = cfg.gate;
    // Where things are (relative to the base center)
    this.hangar = { x: 0, z: -cfg.half + 12, w: 32, d: 22, h: 11 }; // open toward +z
    this.pad = new THREE.Vector3(cfg.x + cfg.half - 13, 0, cfg.z - cfg.half + 14);
    this.#build(scene, physics);
  }

  // Inside the walls? (margin > 0 = a bit bigger)
  contains(p, margin = 0) {
    return Math.abs(p.x - this.c.x) < this.half + margin && Math.abs(p.z - this.c.z) < this.half + margin;
  }

  // In the hangar (where the garage prompt shows)?
  inHangar(p) {
    const H = this.hangar;
    return Math.abs(p.x - this.c.x - H.x) < H.w / 2 && Math.abs(p.z - this.c.z - H.z) < H.d / 2 + 4;
  }

  onPad(p) { return Math.hypot(p.x - this.pad.x, p.z - this.pad.z) < 4.5; }

  // Keep demons out: shove anything inside the walls back out the nearest side.
  pushOut(pos, r) {
    const dx = pos.x - this.c.x, dz = pos.z - this.c.z, lim = this.half + r + 1;
    if (Math.abs(dx) >= lim || Math.abs(dz) >= lim) return false;
    const ox = lim - Math.abs(dx), oz = lim - Math.abs(dz);
    if (ox < oz) pos.x = this.c.x + Math.sign(dx || 1) * lim;
    else pos.z = this.c.z + Math.sign(dz || 1) * lim;
    return true;
  }

  // Home pad glows once a teleporter somewhere else is linked to it.
  setPadActive(on) {
    this.padActive = on;
    this.padRing.material.color.set(on ? 0xb060ff : 0x3a2a44);
    this.padBeam.visible = on;
  }

  // Hide the hangar's walls + roof (so the garage camera can see the car).
  showShell(on) { this.shell.visible = on; }

  update(dt) {
    this.t = (this.t || 0) + dt;
    this.padRing.rotation.y += dt * (this.padActive ? 1.5 : 0.2);
    this.padBeam.material.opacity = 0.25 + Math.sin(this.t * 3) * 0.08;
    for (const w of this.wards) w.material.opacity = 0.45 + Math.sin(this.t * 4 + w.userData.k) * 0.2;
  }

  // ---------------------------------------------------------------- model
  #build(scene, physics) {
    const { RAPIER, world } = physics;
    const g = new THREE.Group();
    g.position.copy(this.c);
    scene.add(g);
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(this.c.x, 0, this.c.z));
    const solid = (x, y, z, hx, hy, hz) => world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setFriction(0.3).setRestitution(0.2), body);
    const box = (w, h, d, mat, x, y, z, shadow = true) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = shadow; m.receiveShadow = true;
      g.add(m);
      return m;
    };
    const concrete = litMaterial({ color: 0x6a6662, flatShading: true, roughness: 0.95 });
    const steel = litMaterial({ color: 0x5a5d63, flatShading: true, roughness: 0.6, metalness: 0.5 });
    const rust = litMaterial({ color: 0x6a3a22, flatShading: true, roughness: 0.9 });
    const dark = litMaterial({ color: 0x1e1e20, flatShading: true });
    const yellow = litMaterial({ color: 0xf0c020, flatShading: true });
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
    const H = this.half, W = 1.6, WH = 5, G = this.gate / 2;

    // Floor: a big concrete slab with painted lines
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, H * 2).rotateX(-Math.PI / 2),
      litMaterial({ color: 0x4a4744, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }));
    floor.position.y = 0.03;
    floor.receiveShadow = true;
    g.add(floor);
    for (const x of [-6, 6]) box(0.3, 0.02, 20, yellow, x, 0.05, -H + 30, false);

    // Walls: concrete with steel plates and spikes on top. Gates N, E, W.
    const wall = (x, z, len, alongX) => {
      if (len <= 0) return;
      const w = alongX ? len : W, d = alongX ? W : len;
      box(w, WH, d, concrete, x, WH / 2, z);
      box(alongX ? len : W + 0.2, 0.5, alongX ? W + 0.2 : len, steel, x, WH + 0.25, z);
      const n = Math.floor(len / 3);
      for (let k = 0; k < n; k++) {
        const t = -len / 2 + 1.5 + k * 3;
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 4), rust);
        sp.position.set(x + (alongX ? t : 0), WH + 1.1, z + (alongX ? 0 : t));
        g.add(sp);
        if (k % 2 === 0) box(alongX ? 2.6 : 0.15, 2.4, alongX ? 0.15 : 2.6, rust, x + (alongX ? t : (x > 0 ? 0.88 : -0.88)), 2.2, z + (alongX ? (z > 0 ? 0.88 : -0.88) : t), false);
      }
      solid(x, WH / 2, z, w / 2, WH / 2 + 2, d / 2);
    };
    const seg = (H - G) / 2 + 0.01;
    wall(0, -H, H * 2 + W, true);                                   // south (back)
    wall(-(G + seg) , H, H - G, true); wall(G + seg, H, H - G, true); // north + gate
    wall(-H, -(G + seg), H - G, false); wall(-H, G + seg, H - G, false); // west + gate
    wall(H, -(G + seg), H - G, false); wall(H, G + seg, H - G, false);   // east + gate

    // Gate posts + Doc's demon wards (glowing lines demons won't cross)
    this.wards = [];
    const wardMat = () => new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.5, depthWrite: false });
    const gates = [[0, H, true], [-H, 0, false], [H, 0, false]];
    gates.forEach(([x, z, alongX], k) => {
      for (const s of [-1, 1]) {
        const px = x + (alongX ? s * (G + 0.6) : 0), pz = z + (alongX ? 0 : s * (G + 0.6));
        box(2, WH + 2, 2, steel, px, (WH + 2) / 2, pz);
        box(0.6, 0.6, 0.6, new THREE.MeshBasicMaterial({ color: 0x7fd8ff }), px, WH + 2.4, pz, false);
      }
      const ward = new THREE.Mesh(new THREE.BoxGeometry(alongX ? G * 2 : 0.5, 0.06, alongX ? 0.5 : G * 2), wardMat());
      ward.position.set(x, 0.08, z);
      ward.userData.k = k;
      g.add(ward);
      this.wards.push(ward);
    });

    // Floodlight towers in the corners
    for (const [x, z] of [[-H + 3, -H + 3], [H - 3, -H + 3], [-H + 3, H - 3], [H - 3, H - 3]]) {
      box(0.5, 12, 0.5, steel, x, 6, z);
      const head = box(2.2, 0.8, 0.6, dark, x, 12.2, z);
      head.rotation.y = Math.atan2(-x, -z);
      const glass = box(1.9, 0.5, 0.1, lamp, x - Math.sign(x) * 0.35, 12.2, z - Math.sign(z) * 0.35, false);
      glass.rotation.y = head.rotation.y;
      solid(x, 6, z, 0.3, 6, 0.3);
    }

    // THE HANGAR (garage): corrugated steel, open front, big enough for anything
    const A = this.hangar;
    const corr = litMaterial({ color: 0x7a7e85, flatShading: true, roughness: 0.55, metalness: 0.4 });
    const hz = A.z, back = hz - A.d / 2;
    // (walls + roof are grouped so the garage view can hide them)
    this.shell = new THREE.Group();
    g.add(this.shell);
    const shell = (m) => { this.shell.attach(m); return m; };
    shell(box(A.w, A.h, 0.6, corr, A.x, A.h / 2, back));                                   // back wall
    for (const s of [-1, 1]) shell(box(0.6, A.h, A.d, corr, A.x + s * A.w / 2, A.h / 2, hz)); // side walls
    // Arched roof made of slanted panels
    for (const s of [-1, 1]) {
      const roof = shell(box(A.w / 2 + 1.2, 0.5, A.d + 1, corr, A.x + s * A.w / 4, A.h + 1.6, hz));
      roof.rotation.z = -s * 0.22;
    }
    shell(box(A.w + 1, 1.4, 0.4, dark, A.x, A.h - 0.2, hz + A.d / 2));                   // header beam
    // Big sign
    const sign = document.createElement('canvas');
    sign.width = 512; sign.height = 96;
    const cx = sign.getContext('2d');
    cx.fillStyle = '#1a1a1c'; cx.fillRect(0, 0, 512, 96);
    cx.fillStyle = '#ffd040'; cx.font = 'bold 64px Arial Black, Impact, sans-serif'; cx.textAlign = 'center';
    cx.fillText("DOC'S GARAGE", 256, 72);
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sign) }));
    signMesh.material.map.colorSpace = THREE.SRGBColorSpace;
    signMesh.position.set(A.x, A.h + 1.2, hz + A.d / 2 + 0.25);
    this.shell.add(signMesh);
    // Workbenches, tool racks, oil drums (empty, sadly)
    for (const s of [-1, 1]) {
      box(1.2, 1, 6, steel, A.x + s * (A.w / 2 - 1.4), 0.5, hz - 2);
      box(0.3, 3.5, 6, dark, A.x + s * (A.w / 2 - 0.5), 2.2, hz - 2, false);
      for (let k = 0; k < 3; k++) {
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.2, 8), k % 2 ? litMaterial({ color: 0xc8202a, flatShading: true }) : steel);
        drum.position.set(A.x + s * (A.w / 2 - 2.2), 0.6, back + 1.4 + k * 1.1);
        drum.castShadow = true;
        g.add(drum);
      }
    }
    box(4, 0.1, 8, yellow, A.x, 0.05, hz, false);                                    // build spot
    solid(A.x, A.h / 2, back, A.w / 2, A.h / 2, 0.4);
    for (const s of [-1, 1]) solid(A.x + s * A.w / 2, A.h / 2, hz, 0.4, A.h / 2, A.d / 2);
    for (const s of [-1, 1]) solid(A.x + s * (A.w / 2 - 1.4), 0.5, hz - 2, 0.6, 0.5, 3);

    // Home teleporter pad
    const P = this.pad.clone().sub(this.c);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 0.4, 16), steel);
    base.position.set(P.x, 0.2, P.z);
    base.receiveShadow = true;
    g.add(base);
    this.padRing = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.18, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a2a44 }));
    this.padRing.position.set(P.x, 0.5, P.z);
    g.add(this.padRing);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      box(0.4, 3, 0.4, dark, P.x + Math.cos(a) * 4.2, 1.5, P.z + Math.sin(a) * 4.2);
      box(0.5, 0.5, 0.5, new THREE.MeshBasicMaterial({ color: 0xb060ff }), P.x + Math.cos(a) * 4.2, 3.2, P.z + Math.sin(a) * 4.2, false);
    }
    this.padBeam = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 14, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xb060ff, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
    this.padBeam.position.set(P.x, 7, P.z);
    g.add(this.padBeam);
    this.setPadActive(false);
  }
}
