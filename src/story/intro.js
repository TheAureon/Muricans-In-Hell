// THE INTRO: how this all started, as full-screen 3D scenes with captions.
// Click / Space / Enter = next (or finish the typing). Esc = skip all.
// It has its own little 3D renderer, thrown away when the intro ends.
import * as THREE from 'three';
import { INTRO, CAST } from './story.js';
import { createHank, createDoc } from './figures.js';
import { createRip } from '../world/rip.js';
import { createCarModel } from '../vehicle/carModel.js';
import { Base } from '../world/base.js';
import { GFX } from '../core/graphics.js';

// ------------------------------------------------------------------ helpers
function stage({ bg = 0x1a0505, fog = [0x1a0505, 12, 70], ground = 0x141010, groundRough = 0.9 } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.Fog(...fog);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: ground, roughness: groundRough, metalness: groundRough < 0.5 ? 0.3 : 0 }));
  floor.receiveShadow = true;
  scene.add(floor);
  scene.add(new THREE.HemisphereLight(0xff9a70, 0x201010, 0.6));
  return scene;
}

function camera(fov = 50) {
  const c = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 600);
  return c;
}

function sunLight(scene, color, intensity, pos) {
  const sun = new THREE.DirectionalLight(color, intensity);
  sun.position.copy(pos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const s = sun.shadow.camera; s.left = -20; s.right = 20; s.top = 20; s.bottom = -20; s.far = 120;
  scene.add(sun);
  return sun;
}

// Jagged dark mountains on the horizon
function mountains(scene, color = 0x1a0806, glowTips = true) {
  const mat = new THREE.MeshBasicMaterial({ color, fog: false });
  const glow = new THREE.MeshBasicMaterial({ color: 0xff4a10, fog: false });
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2, r = 220 + Math.sin(i * 3.1) * 30;
    const h = 30 + Math.abs(Math.sin(i * 1.7)) * 70, w = 40 + Math.abs(Math.cos(i * 2.3)) * 40;
    const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 5), mat);
    m.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
    scene.add(m);
    if (glowTips && i % 7 === 0) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(w * 0.12, 6, 5), glow);
      tip.position.set(m.position.x, h - 4, m.position.z);
      scene.add(tip);
    }
  }
}

function canvasTexture(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const cx = cv.getContext('2d');
  draw(cx, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, cx, redraw: () => { draw(cx, w, h); tex.needsUpdate = true; } };
}

function embers(scene, n = 200, area = 30, color = 0xff7a30) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * area, Math.random() * 12, (Math.random() - 0.5) * area - 5], i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.08 }));
  scene.add(pts);
  return (dt) => {
    for (let i = 0; i < n; i++) {
      let y = pos[i * 3 + 1] + dt * (0.6 + (i % 5) * 0.2);
      if (y > 12) y = 0;
      pos[i * 3 + 1] = y;
      pos[i * 3] += Math.sin(y + i) * dt * 0.2;
    }
    geo.attributes.position.needsUpdate = true;
  };
}

// Doc's garage on Earth: concrete walls, a roll-up door, shelves of junk.
function garageRoom(scene) {
  const wall = new THREE.MeshStandardMaterial({ color: 0x4a4644, roughness: 1 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x5a5d63, roughness: 0.6, metalness: 0.4 });
  const add = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.receiveShadow = true; o.castShadow = true; scene.add(o); return o; };
  add(24, 8, 0.4, wall, 0, 4, -11);               // back wall
  add(0.4, 8, 20, wall, -9, 4, -2);               // side wall
  for (let k = 0; k < 8; k++) add(5.8, 0.5, 0.1, metal, 5, 0.6 + k * 0.6, -10.75); // roll-up door slats
  for (const y of [1.2, 2.4, 3.6]) add(0.8, 0.08, 5, metal, -8.5, y, -4);           // shelves
  const junk = [0xc8202a, 0x3a66d0, 0xf0c020, 0x5a5d63];
  for (let k = 0; k < 9; k++) add(0.4, 0.4, 0.4, new THREE.MeshStandardMaterial({ color: junk[k % 4] }), -8.5, 1.45 + (k % 3) * 1.2, -6 + Math.floor(k / 3) * 1.5);
  const flag = add(2.4, 1.3, 0.02, new THREE.MeshStandardMaterial({ color: 0xb02020 }), -3, 5.5, -10.75);
  add(1, 0.7, 0.03, new THREE.MeshStandardMaterial({ color: 0x24408a }), -3.7, 5.8, -10.73);
  return flag;
}

// ------------------------------------------------------------------ scenes
const SCENES = {
  // 1. Gas at $14.99: Hank stares at the price sign.
  gas() {
    const scene = stage({ bg: 0x1c0606, fog: [0x1c0606, 10, 60], ground: 0x0c0a0a, groundRough: 0.25 });
    let regular = 14.49;
    const sign = canvasTexture(1024, 620, (cx, w, h) => {
      cx.fillStyle = '#c8202a'; cx.fillRect(0, 0, w, h);
      cx.fillStyle = '#111'; cx.fillRect(24, 140, w - 48, h - 164);
      cx.fillStyle = '#fff'; cx.font = 'bold 110px Arial Black, Impact, sans-serif'; cx.textAlign = 'center';
      cx.fillText('GAS', w / 2, 112);
      const rows = [['REGULAR', regular], ['PREMIUM', regular + 5], ['DIESEL', regular + 7.5]];
      rows.forEach(([label, price], i) => {
        const y = 250 + i * 135;
        cx.textAlign = 'left'; cx.fillStyle = '#ddd'; cx.font = 'bold 54px Arial Black, sans-serif';
        cx.fillText(label, 70, y);
        cx.textAlign = 'right'; cx.font = 'bold 110px Courier New, monospace';
        cx.shadowColor = '#ff6a00'; cx.shadowBlur = 30; cx.fillStyle = '#ffa020';
        cx.fillText(`$${price.toFixed(2)}`, w - 60, y + 20);
        cx.shadowBlur = 0;
      });
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.6), new THREE.MeshBasicMaterial({ map: sign.tex }));
    board.position.set(-3.4, 5.2, -7);
    scene.add(board);
    const back = new THREE.Mesh(new THREE.BoxGeometry(7.8, 4.8, 0.3), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    back.position.set(-3.4, 5.2, -7.2);
    back.castShadow = true;
    scene.add(back);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3, 0.35), new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6, roughness: 0.4 }));
    pole.position.set(-2.4, 1.5, -7.2);
    pole.castShadow = true;
    scene.add(pole);
    const signGlow = new THREE.PointLight(0xff5a20, 40, 25, 1.4);
    signGlow.position.set(-3.4, 4.5, -5);
    scene.add(signGlow);
    const rim = new THREE.SpotLight(0xff3010, 60, 30, 0.5, 0.6, 1.2);
    rim.position.set(4, 6, -8); rim.target.position.set(1.5, 1, -1.5);
    rim.castShadow = true;
    scene.add(rim, rim.target);
    const fill = new THREE.PointLight(0xffb080, 16, 12, 1.5); // warm light on Hank's back
    fill.position.set(2.6, 2.6, 2);
    scene.add(fill);
    const hank = createHank();
    hank.group.position.set(1.4, 0, -1.6);
    hank.group.rotation.y = Math.PI + 0.45; // facing the sign, back to us
    scene.add(hank.group);
    const cam = camera(45);
    const em = embers(scene, 120, 26, 0xff9a40);
    let tick = 0;
    return {
      scene, camera: cam,
      update(t, dt) {
        cam.position.set(3.0 - t * 0.12, 2.4, 6.6 - t * 0.35);
        cam.lookAt(-1.0, 2.1, -6);
        hank.update(t);
        em(dt);
        if ((tick += dt) > 0.35 && regular < 14.99) { tick = 0; regular = Math.min(14.99, regular + 0.05); sign.redraw(); }
        signGlow.intensity = 36 + Math.random() * 8;
      },
    };
  },

  // 2. Doc's blueprint: PROJECT CHEAP GAS. Doc jabs at it.
  doc() {
    const scene = stage({ bg: 0x0a0d18, fog: [0x0a0d18, 10, 50], ground: 0x101218 });
    const plan = canvasTexture(1600, 900, (cx, w, h) => {
      cx.fillStyle = '#123f86'; cx.fillRect(0, 0, w, h);
      cx.strokeStyle = 'rgba(255,255,255,0.13)'; cx.lineWidth = 2;
      for (let x = 0; x < w; x += 50) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, h); cx.stroke(); }
      for (let y = 0; y < h; y += 50) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(w, y); cx.stroke(); }
      cx.fillStyle = '#e8f6ff'; cx.font = 'bold 72px Courier New, monospace'; cx.textAlign = 'center';
      cx.fillText('PROJECT: CHEAP GAS', w / 2, 100);
      cx.setLineDash([14, 10]); cx.strokeStyle = '#e8f6ff'; cx.lineWidth = 3;
      cx.beginPath(); cx.moveTo(220, 140); cx.lineTo(w - 220, 140); cx.stroke(); cx.setLineDash([]);
      cx.lineWidth = 6;
      cx.beginPath(); cx.ellipse(w / 2, 260, 150, 62, 0, 0, Math.PI * 2); cx.stroke();
      cx.font = 'bold 60px Courier New, monospace'; cx.fillText('EARTH', w / 2, 280);
      cx.font = '70px Courier New, monospace'; cx.fillText('↓   ↓   ↓', w / 2, 420);
      cx.strokeStyle = '#ff8a60'; cx.fillStyle = '#ff8a60'; cx.lineWidth = 7;
      cx.strokeRect(w / 2 - 190, 470, 380, 175);
      cx.font = 'bold 66px Courier New, monospace'; cx.fillText('HELL', w / 2, 545);
      cx.font = '52px Courier New, monospace'; cx.fillText('(OIL??)', w / 2, 615);
      cx.save(); cx.translate(w - 360, 760); cx.rotate(-0.13);
      cx.fillStyle = '#ffe080'; cx.font = 'italic 56px Courier New, monospace'; cx.fillText('definitely safe*', 0, 0);
      cx.font = 'italic 40px Courier New, monospace'; cx.fillText('*probably', 60, 52); cx.restore();
      cx.fillStyle = 'rgba(232,246,255,0.7)'; cx.font = 'italic 26px Courier New, monospace'; cx.textAlign = 'left';
      ['rip = 9.81 MJ?', 'oil pressure ↑↑', 'BRING SNACKS'].forEach((s, i) => cx.fillText(s, 60, 640 + i * 40));
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(11, 6.2), new THREE.MeshStandardMaterial({ map: plan.tex, roughness: 0.9, emissive: 0xffffff, emissiveMap: plan.tex, emissiveIntensity: 0.35 }));
    board.position.set(0, 3.6, -6);
    board.receiveShadow = true;
    scene.add(board);
    const lamp = new THREE.SpotLight(0xfff0d0, 90, 30, 0.7, 0.5, 1.2);
    lamp.position.set(2, 8, 1); lamp.target.position.set(0, 3, -6);
    lamp.castShadow = true;
    scene.add(lamp, lamp.target);
    const doc = createDoc();
    doc.group.position.set(-2.2, 0, -2.6);
    doc.group.rotation.y = Math.PI - 0.15;
    scene.add(doc.group);
    const cam = camera(48);
    return {
      scene, camera: cam,
      update(t) {
        cam.position.set(1.2 - t * 0.1, 2.5, 6.4 - t * 0.25);
        cam.lookAt(-0.5, 2.4, -6);
        doc.update(t);
      },
    };
  },

  // 3. The Reality Ripper tears a hole in the world, right in Doc's garage
  // (on Earth). Hell glows through it.
  tear() {
    const scene = stage({ bg: 0x0a0806, fog: [0x0a0806, 8, 40], ground: 0x3a3836, groundRough: 0.95 });
    garageRoom(scene);
    const rip = createRip({ height: 6.5, width: 2.6, seed: 5, hellView: true });
    rip.group.position.set(0.6, 0.3, -6.5);
    scene.add(rip.group);
    const ripLight = new THREE.PointLight(0xff5a10, 80, 30, 1.3);
    ripLight.position.set(0.6, 3.2, -5.5);
    ripLight.castShadow = true;
    scene.add(ripLight);
    const bulb = new THREE.PointLight(0xfff0d0, 6, 14, 1.5); // the garage's one sad light bulb
    bulb.position.set(-3, 4.5, -1);
    scene.add(bulb);
    // The machine: a base, two pylons and a dish firing a beam at the rip
    const steel = new THREE.MeshStandardMaterial({ color: 0x5a5d63, metalness: 0.6, roughness: 0.4, flatShading: true });
    const machine = new THREE.Group();
    machine.position.set(-4.6, 0, -3.5);
    machine.rotation.y = -0.85;
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; machine.add(o); return o; };
    add(new THREE.BoxGeometry(2, 0.6, 1.6), steel, 0, 0.3, 0);
    for (const x of [-0.7, 0.7]) {
      add(new THREE.BoxGeometry(0.25, 2.2, 0.25), steel, x, 1.7, -0.4);
      add(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshBasicMaterial({ color: 0x7fd8ff }), x, 2.9, -0.4);
    }
    const dish = add(new THREE.CylinderGeometry(0.9, 0.2, 0.5, 10, 1, true), steel, 0, 1.5, 0.4);
    dish.rotation.x = Math.PI / 2;
    dish.material = steel.clone(); dish.material.side = THREE.DoubleSide;
    scene.add(machine);
    machine.updateMatrixWorld(true);
    const from = new THREE.Vector3(0, 1.5, 0.7).applyMatrix4(machine.matrixWorld);
    const to = new THREE.Vector3(0.6, 3.3, -6.5);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, from.distanceTo(to), 6, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.copy(from).lerp(to, 0.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    scene.add(beam);
    const hank = createHank(), doc = createDoc();
    hank.group.position.set(-1.0, 0, -1); hank.group.rotation.y = Math.PI + 0.1;
    doc.group.position.set(-2.3, 0, -1.6); doc.group.rotation.y = Math.PI - 0.5;
    scene.add(hank.group, doc.group);
    const em = embers(scene, 140, 10, 0xffa040);
    const cam = camera(50);
    return {
      scene, camera: cam,
      update(t, dt) {
        rip.update(dt);
        hank.update(t); doc.update(t * 1.5);
        em(dt);
        ripLight.intensity = 70 + Math.random() * 30;
        bulb.intensity = Math.random() < 0.08 ? 1 : 6; // flickering
        beam.material.opacity = 0.5 + Math.random() * 0.5;
        const shake = 0.03;
        cam.position.set(0.8 + (Math.random() - 0.5) * shake, 1.9 + (Math.random() - 0.5) * shake, 5.2 - t * 0.3);
        cam.lookAt(-0.4, 2.4, -6);
      },
    };
  },

  // 4. On Earth, at night: the muscle car floors it down a desert highway
  // straight into a rip, with Hell burning on the other side.
  car() {
    const scene = stage({ bg: 0x0b0a14, fog: [0x120c16, 25, 170], ground: 0x2a2620 });
    // Night sky with stars, glowing red low down where the rip is
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true, fog: false }));
    const sc = [], sp = sky.geometry.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const y = sp.getY(i) / 300, z = sp.getZ(i) / 300;
      const c = new THREE.Color(0x07060f).lerp(new THREE.Color(0x3a0c08), Math.max(0, 1 - y * 3) * Math.max(0, -z) * 0.9);
      sc.push(c.r, c.g, c.b);
    }
    sky.geometry.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    scene.add(sky);
    const stars = new THREE.BufferGeometry();
    const st = [];
    for (let i = 0; i < 600; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.3; st.push(Math.cos(a) * Math.cos(e) * 280, Math.sin(e) * 280, Math.sin(a) * Math.cos(e) * 280); }
    stars.setAttribute('position', new THREE.Float32BufferAttribute(st, 3));
    scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, fog: false })));
    // Desert mesas on the horizon (Earth, not Hell)
    const mesaMat = new THREE.MeshBasicMaterial({ color: 0x0a0910, fog: false });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, r = 200;
      const w = 25 + (i % 3) * 18, h = 10 + (i % 4) * 6;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.8, w, h, 6), mesaMat);
      m.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r);
      scene.add(m);
    }
    // The highway: asphalt, a dashed yellow line, telephone poles
    const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 400).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.6 }));
    road.position.set(0, 0.02, -120);
    road.receiveShadow = true;
    scene.add(road);
    const dash = new THREE.MeshBasicMaterial({ color: 0xe0b020 });
    for (let k = 0; k < 60; k++) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.5).rotateX(-Math.PI / 2), dash);
      d.position.set(0, 0.03, 20 - k * 6);
      scene.add(d);
    }
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a1e16 });
    for (let k = 0; k < 14; k++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 8, 0.25), poleMat);
      p.position.set(7, 4, 10 - k * 22);
      p.castShadow = true;
      scene.add(p);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.15), poleMat);
      bar.position.set(7, 7.4, 10 - k * 22);
      scene.add(bar);
    }
    const moon = new THREE.DirectionalLight(0x8090c0, 0.8);
    moon.position.set(30, 50, 40);
    scene.add(moon);
    // The rip, Hell burning inside it
    const rip = createRip({ height: 16, width: 5.5, seed: 11, hellView: true });
    rip.group.position.set(0, 0.3, -60);
    scene.add(rip.group);
    const ripLight = new THREE.PointLight(0xff4a10, 400, 90, 1.2);
    ripLight.position.set(0, 6, -55);
    ripLight.castShadow = true;
    scene.add(ripLight);
    const car = createCarModel();
    car.root.position.y = 0.45;
    car.root.rotation.y = Math.PI; // driving away from us, toward the rip
    car.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(car.root);
    for (const x of [-0.65, 0.65]) {
      const spot = new THREE.SpotLight(0xfff0c8, 40, 60, 0.4, 0.6, 1.3);
      spot.position.set(x, 0.55, 2.15); spot.target.position.set(x * 1.6, -0.6, 18);
      car.root.add(spot, spot.target);
    }
    const cam = camera(55);
    let z = 6;
    return {
      scene, camera: cam,
      update(t, dt) {
        rip.update(dt);
        z -= dt * (8 + t * 4);
        if (z < -56) { z = 6; flash(); }
        car.root.position.z = z;
        for (const w of car.wheels) w.spin.rotation.x += dt * 25;
        car.body.position.y = Math.sin(t * 40) * 0.01;
        cam.position.set(2.2, 1.4, z + 7.5);
        cam.lookAt(0, 1.8, z - 20);
        ripLight.intensity = 340 + Math.random() * 120;
      },
    };
  },

  // 5. The base in the Ash Plains: walls, hangar, teleporter pad.
  base() {
    const scene = stage({ bg: 0x3a1410, fog: [0x5a2a1c, 40, 260], ground: 0x5b5450 });
    mountains(scene);
    sunLight(scene, 0xffa060, 2.6, new THREE.Vector3(-40, 60, 30));
    const base = new Base(scene, null, { x: 0, z: 0, half: 44, gate: 16 });
    base.setPadActive(true);
    const car = createCarModel();
    car.root.position.set(0, 0.45, -14);
    car.root.rotation.y = 0.4;
    car.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(car.root);
    const hank = createHank(), doc = createDoc();
    hank.group.position.set(3, 0, -12); hank.group.rotation.y = Math.PI - 0.3;
    doc.group.position.set(5, 0, -13); doc.group.rotation.y = Math.PI + 0.4;
    scene.add(hank.group, doc.group);
    const cam = camera(50);
    return {
      scene, camera: cam,
      update(t, dt) {
        base.update(dt);
        hank.update(t); doc.update(t);
        const k = Math.min(1, t / 7);
        const e = 1 - (1 - k) ** 2;
        cam.position.set(30 - e * 20, 34 - e * 26, 70 - e * 58);
        cam.lookAt(2, 2 + (1 - e) * 2, -16);
      },
    };
  },

  // 6. Now find the oil.
  go() {
    const scene = stage({ bg: 0x2a0a06, fog: [0x2a0a06, 25, 220], ground: 0x3a3230 });
    mountains(scene);
    sunLight(scene, 0xff7a40, 1.6, new THREE.Vector3(30, 20, -80));
    const car = createCarModel();
    car.root.position.y = 0.45;
    car.root.rotation.y = Math.PI;
    car.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(car.root);
    for (const x of [-0.65, 0.65]) {
      const spot = new THREE.SpotLight(0xfff0c8, 40, 60, 0.4, 0.6, 1.3);
      spot.position.set(x, 0.55, 2.15); spot.target.position.set(x * 1.6, -0.6, 18);
      car.root.add(spot, spot.target);
    }
    const em = embers(scene, 240, 50);
    const cam = camera(50);
    return {
      scene, camera: cam,
      update(t, dt) {
        em(dt);
        car.body.position.y = Math.sin(t * 55) * 0.012; // engine idling, raring to go
        car.body.rotation.x = Math.sin(t * 40) * 0.004;
        const k = t * 0.25;
        cam.position.set(Math.sin(k) * 1.5 + 1.5, 1.2 + t * 0.15, 6 + t * 0.6);
        cam.lookAt(0, 1.2, -12);
      },
    };
  },
};

let flash = () => {};

// ------------------------------------------------------------------ player
export function playIntro() {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.id = 'intro';
    el.innerHTML = `<canvas></canvas><div class="i-fade"></div><div class="i-logo">HELLDRIVERS</div>
      <div class="i-cap"><h2></h2><p></p><div class="i-quote"></div></div>
      <div class="i-nav"><span class="i-dots"></span><span>CLICK / SPACE: next &nbsp;·&nbsp; ESC: skip</span></div>`;
    document.body.appendChild(el);
    const canvas = el.querySelector('canvas');
    // Its own 3D view, as sharp as the graphics setting allows. If the
    // browser won't give it one, skip the story rather than get stuck.
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: GFX.antialias }); } catch (e) {
      console.warn('Intro skipped: no WebGL', e);
      el.remove();
      resolve();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, GFX.pixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = GFX.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    const fade = el.querySelector('.i-fade');
    flash = () => { fade.className = 'i-fade'; void fade.offsetWidth; fade.className = 'i-fade white'; };
    const h2 = el.querySelector('h2'), p = el.querySelector('p'), quote = el.querySelector('.i-quote'), dots = el.querySelector('.i-dots');
    let i = -1, typing = null, current = null, t = 0, running = true, last = performance.now();

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (current) { current.camera.aspect = window.innerWidth / window.innerHeight; current.camera.updateProjectionMatrix(); }
    };
    window.addEventListener('resize', onResize);

    const loop = () => {
      if (!running) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt;
      if (current) { current.update(t, dt); renderer.render(current.scene, current.camera); }
      requestAnimationFrame(loop);
    };

    const finish = () => {
      clearInterval(typing);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      el.classList.add('out');
      setTimeout(() => {
        running = false;
        renderer.dispose();
        renderer.forceContextLoss();
        el.remove();
        resolve();
      }, 500);
    };
    const show = (n) => {
      i = n;
      if (i >= INTRO.length) return finish();
      const s = INTRO[i];
      fade.className = 'i-fade'; void fade.offsetWidth; fade.className = 'i-fade black';
      current = SCENES[s.art]?.() || SCENES.go();
      current.camera.aspect = window.innerWidth / window.innerHeight;
      current.camera.updateProjectionMatrix();
      t = 0;
      el.classList.toggle('last', s.art === 'go');
      h2.textContent = s.title;
      quote.innerHTML = '';
      dots.innerHTML = INTRO.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
      let c = 0;
      p.textContent = '';
      clearInterval(typing);
      typing = setInterval(() => {
        c += 2;
        p.textContent = s.text.slice(0, c);
        if (c >= s.text.length) { clearInterval(typing); typing = null; showQuote(s); }
      }, 24);
    };
    const showQuote = (s) => {
      if (!s.quote) return;
      const who = CAST[s.quote.who];
      quote.innerHTML = `<b style="color:${who.color}">${who.name}:</b> ${s.quote.line}`;
    };
    const next = () => {
      if (typing) {
        clearInterval(typing); typing = null;
        p.textContent = INTRO[i].text;
        showQuote(INTRO[i]);
        return;
      }
      show(i + 1);
    };
    const onKey = (e) => {
      if (e.code === 'Escape') finish();
      else if (['Space', 'Enter', 'ArrowRight'].includes(e.code)) { e.preventDefault(); next(); }
    };
    el.addEventListener('click', next);
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => el.classList.add('on'));
    show(0);
    loop();
  });
}
