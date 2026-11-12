// The catalog of bolt-on parts. Each part fills one grid cell (0.5 m).
// Every model is built "pointing up" (+Y = away from the surface it's
// bolted to); the builder turns it to face outward from that surface.
// Weights and effects are in settings.js -> parts.
import * as THREE from 'three';
import { litMaterial } from '../core/graphics.js';

const mat = (color, extra = {}) => litMaterial({ color, flatShading: true, roughness: 0.6, metalness: 0.2, ...extra });
const M = {
  steel: mat(0x6a6e75, { metalness: 0.5 }),
  dark: mat(0x232326),
  bone: mat(0xe0d6bc),
  red: mat(0xc8202a),
  blue: mat(0x3a66d0),
  yellow: mat(0xf0c020),
  lead: mat(0x2c2e33, { metalness: 0.7, roughness: 0.4 }),
  flame: new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.85 }),
  cool: new THREE.MeshBasicMaterial({ color: 0x60d0ff }),
  float: mat(0xff7a20, { roughness: 0.5, metalness: 0 }),
  glowHot: new THREE.MeshBasicMaterial({ color: 0xff7020 }),
  copper: mat(0xb06a30, { metalness: 0.6, roughness: 0.35 }),
  // (boss salvage)
  ash: mat(0x3a3430, { roughness: 0.9 }),
  ember: new THREE.MeshBasicMaterial({ color: 0xff5010 }),
  gold: mat(0xf0c040, { metalness: 0.8, roughness: 0.3 }),
  tooth: mat(0xe8e4d0, { roughness: 0.4 }),
  bogGreen: new THREE.MeshBasicMaterial({ color: 0x80ff40 }),
  ice: mat(0x9ad8ff, { metalness: 0.1, roughness: 0.15, transparent: true, opacity: 0.85 }),
  reactor: new THREE.MeshBasicMaterial({ color: 0x40ffd0 }),
  feather: mat(0x4a2a3a, { roughness: 0.8 }),
  mirror: mat(0xd8e0ea, { metalness: 1, roughness: 0.05 }),
  devil: new THREE.MeshBasicMaterial({ color: 0xff2020 }),
  paper: mat(0xe8d8a8, { roughness: 0.9 }),
};

function add(group, geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

export const PART_TYPES = {
  armor: {
    name: 'Armor Block',
    icon: '🛡️',
    desc: 'Tough block. Soaks up hits for what is behind it.',
    build(g) {
      add(g, new THREE.BoxGeometry(0.48, 0.48, 0.48), M.steel);
      for (const [x, z] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) {
        add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.04, 5), M.dark, x, 0.25, z); // rivets
      }
    },
  },
  spike: {
    name: 'Ram Spike',
    icon: '🔱',
    desc: '+30% ram damage on the side it points.',
    build(g) {
      add(g, new THREE.BoxGeometry(0.44, 0.1, 0.44), M.dark, 0, -0.2, 0);
      add(g, new THREE.ConeGeometry(0.16, 0.85, 5), M.bone, 0, 0.27, 0);
    },
  },
  plow: {
    name: 'Ram Plow',
    icon: '🚜',
    desc: '+70% ram damage on the side it faces. Very heavy.',
    build(g) {
      add(g, new THREE.BoxGeometry(0.5, 0.12, 0.5), M.dark, 0, -0.19, 0);
      const blade = add(g, new THREE.BoxGeometry(0.56, 0.08, 0.6), M.yellow, 0, 0.05, 0);
      blade.rotation.x = 0.55;
      for (const x of [-0.18, 0, 0.18]) add(g, new THREE.ConeGeometry(0.05, 0.2, 4), M.steel, x, 0.2, 0.27).rotation.x = 0.55;
    },
  },
  gun: {
    name: 'Machine Gun',
    icon: '🔫',
    desc: 'Another gun. Fires with your main gun.',
    isGun: true,
    build(g) {
      add(g, new THREE.CylinderGeometry(0.22, 0.25, 0.3, 7), M.dark, 0, -0.1, 0);
    },
  },
  booster: {
    name: 'Rocket Booster',
    icon: '🚀',
    desc: '+engine power and top speed. Flames!',
    build(g) {
      add(g, new THREE.CylinderGeometry(0.18, 0.2, 0.42, 7), M.red, 0, -0.04, 0);
      add(g, new THREE.CylinderGeometry(0.14, 0.2, 0.12, 7), M.dark, 0, 0.22, 0);
      const flame = add(g, new THREE.ConeGeometry(0.13, 0.6, 6), M.flame, 0, 0.58, 0);
      flame.rotation.x = Math.PI; // points away from the car
      flame.castShadow = false;
      g.userData.flame = flame;
    },
  },
  heavyArmor: {
    name: 'Heavy Armor',
    icon: '🧱',
    desc: 'Hell-forged slab. Very tough, very heavy.',
    build(g) {
      add(g, new THREE.BoxGeometry(0.5, 0.5, 0.5), M.lead);
      add(g, new THREE.BoxGeometry(0.52, 0.12, 0.52), M.red, 0, 0.12, 0);
      for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) {
        add(g, new THREE.ConeGeometry(0.06, 0.12, 4), M.steel, x, 0.3, z); // studs
      }
    },
  },
  saw: {
    name: 'Saw Blade',
    icon: '🪚',
    desc: '+120% ram damage on the side it faces. Spins!',
    build(g) {
      add(g, new THREE.BoxGeometry(0.3, 0.2, 0.3), M.dark, 0, -0.15, 0);
      const disc = new THREE.Group();
      disc.position.y = 0.12;
      const blade = add(disc, new THREE.CylinderGeometry(0.42, 0.42, 0.05, 10), M.steel);
      blade.rotation.x = Math.PI / 2;
      for (let n = 0; n < 10; n++) { // teeth
        const a = (n / 10) * Math.PI * 2;
        const t = add(disc, new THREE.ConeGeometry(0.06, 0.16, 3), M.steel, Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0);
        t.rotation.z = a - Math.PI / 2;
      }
      g.add(disc);
      g.userData.saw = disc;
    },
  },
  cannon: {
    name: 'Hell Cannon',
    icon: '💥',
    desc: 'Slow, heavy-hitting gun. Shells explode.',
    isGun: true,
    weapon: 'cannon',
    build(g) {
      add(g, new THREE.CylinderGeometry(0.26, 0.3, 0.3, 8), M.dark, 0, -0.1, 0);
    },
  },
  hoverFan: {
    name: 'Hover Fan',
    icon: '🌀',
    desc: 'Blows lava away from the car. Each fan: -25% lava burn & drag (4 = immune).',
    build(g) {
      add(g, new THREE.CylinderGeometry(0.24, 0.24, 0.1, 10), M.dark, 0, -0.2, 0);          // mount
      const duct = add(g, new THREE.TorusGeometry(0.22, 0.05, 5, 12), M.steel, 0, 0.05, 0);  // ring
      duct.rotation.x = Math.PI / 2;
      add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6), M.dark, 0, -0.05, 0);          // shaft
      const rotor = new THREE.Group();
      rotor.position.y = 0.06;
      for (let n = 0; n < 3; n++) {
        const blade = add(rotor, new THREE.BoxGeometry(0.36, 0.02, 0.09), M.steel);
        blade.rotation.y = (n / 3) * Math.PI * 2;
        blade.rotation.x = 0.35;
      }
      add(rotor, new THREE.CylinderGeometry(0.06, 0.06, 0.06, 8), M.cool);                    // glowing hub
      g.add(rotor);
      g.userData.fan = rotor;
    },
  },
  pontoon: {
    name: 'Pontoon',
    icon: '🛟',
    desc: 'A float. 2 Pontoons keep you up in deep water (wheels only: treads sink).',
    build(g) {
      // A fat orange float lying along the car, on a little bracket.
      add(g, new THREE.BoxGeometry(0.16, 0.14, 0.3), M.dark, 0, -0.17, 0);
      const tube = add(g, new THREE.CapsuleGeometry(0.17, 0.2, 4, 10), M.float, 0, 0.06, 0);
      tube.rotation.x = Math.PI / 2;
      for (const z of [-0.12, 0.12]) {
        const band = add(g, new THREE.TorusGeometry(0.175, 0.025, 4, 12), M.steel, 0, 0.06, z);
        band.rotation.y = 0;
      }
    },
  },
  mudTire: {
    name: 'Mud Tire',
    icon: '🛞',
    desc: 'A fat paddle tire that churns through mud. Each one: -25% blood-mud stickiness (4 = barely notice).',
    build(g) {
      add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6), M.steel, 0, -0.15, 0);       // axle stub
      const tire = new THREE.Group();
      tire.position.y = 0.04;
      add(tire, new THREE.CylinderGeometry(0.24, 0.24, 0.2, 12), M.dark);                  // fat tire
      add(tire, new THREE.CylinderGeometry(0.12, 0.12, 0.22, 8), M.red);                   // hub
      for (let n = 0; n < 8; n++) {                                                        // paddles
        const paddle = add(tire, new THREE.BoxGeometry(0.06, 0.2, 0.08), M.dark);
        const a = (n / 8) * Math.PI * 2;
        paddle.position.set(Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26);
        paddle.rotation.y = -a;
      }
      g.add(tire);
      g.userData.fan = tire; // (spins like a fan)
    },
  },
  spikeTire: {
    name: 'Spiked Tire',
    icon: '❄️',
    desc: 'A studded tire that bites into ice. Each one gives back 25% grip on ice (4 = full grip).',
    build(g) {
      add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6), M.steel, 0, -0.15, 0);
      const tire = new THREE.Group();
      tire.position.y = 0.04;
      add(tire, new THREE.CylinderGeometry(0.23, 0.23, 0.18, 12), M.dark);
      add(tire, new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8), M.steel);
      for (let n = 0; n < 12; n++) { // steel studs
        const a = (n / 12) * Math.PI * 2;
        const stud = add(tire, new THREE.ConeGeometry(0.035, 0.1, 4), M.steel, Math.cos(a) * 0.26, (n % 2 ? 0.05 : -0.05), Math.sin(a) * 0.26);
        stud.rotation.z = -Math.PI / 2;
        stud.rotation.y = -a;
      }
      g.add(tire);
      g.userData.fan = tire; // (spins)
    },
  },
  heater: {
    name: 'Heater',
    icon: '🔥',
    desc: 'A glowing radiator that keeps the engine warm. Each one: 30% slower freezing in Ice Hell.',
    build(g) {
      add(g, new THREE.BoxGeometry(0.44, 0.3, 0.44), M.dark, 0, -0.08, 0);
      for (let k = -1; k <= 1; k++) add(g, new THREE.BoxGeometry(0.4, 0.14, 0.06), M.glowHot, 0, 0.12, k * 0.13); // glowing fins
      add(g, new THREE.CylinderGeometry(0.04, 0.04, 0.2, 5), M.steel, 0.15, 0.25, 0.15);                      // little chimney
    },
  },
  jammer: {
    name: 'Radar Jammer',
    icon: '📡',
    desc: 'Scrambles the Iron Foundry turrets: each one makes their shells land 3 m further off.',
    build(g) {
      add(g, new THREE.BoxGeometry(0.3, 0.2, 0.3), M.dark, 0, -0.15, 0);
      add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.3, 5), M.steel, 0, 0.05, 0);
      const dish = new THREE.Group();
      dish.position.y = 0.22;
      add(dish, new THREE.CylinderGeometry(0.24, 0.05, 0.1, 10), M.steel).rotation.x = 0.5;
      add(dish, new THREE.SphereGeometry(0.04, 6, 4), M.cool, 0, 0.1, 0.06);
      g.add(dish);
      g.userData.fan = dish; // (spins slowly... well, quickly)
    },
  },
  degausser: {
    name: 'Degausser',
    icon: '🧲',
    desc: 'A humming coil that cancels magnetism. Each one blocks half the Foundry magnets\' pull (2 = immune).',
    build(g) {
      add(g, new THREE.BoxGeometry(0.42, 0.14, 0.42), M.dark, 0, -0.17, 0);
      for (let k = 0; k < 3; k++) add(g, new THREE.TorusGeometry(0.15, 0.05, 5, 10), M.copper, 0, -0.04 + k * 0.1, 0).rotation.x = Math.PI / 2;
      add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6), M.cool, 0, 0.05, 0);
    },
  },
  jumpJet: {
    name: 'Jump Jet',
    icon: '🚀',
    desc: 'A rocket nozzle that fires while you\'re in the air: forward thrust (hold gas), a little lift, and air steering. Stack them for long jumps.',
    build(g) {
      add(g, new THREE.BoxGeometry(0.3, 0.16, 0.3), M.dark, 0, -0.17, 0);
      add(g, new THREE.CylinderGeometry(0.16, 0.12, 0.3, 8), M.steel, 0, 0, 0);
      add(g, new THREE.CylinderGeometry(0.12, 0.2, 0.18, 8), M.dark, 0, 0.22, 0);   // bell nozzle
      const flame = add(g, new THREE.ConeGeometry(0.13, 0.5, 8), M.flame, 0, 0.55, 0);
      flame.visible = false;
      g.userData.jetFlame = flame;
    },
  },
  weight: {
    name: 'Lead Weight',
    icon: '🏋️',
    desc: '250 kg of nothing. Hits harder, handles worse.',
    build(g) {
      add(g, new THREE.BoxGeometry(0.46, 0.46, 0.46), M.lead);
      add(g, new THREE.BoxGeometry(0.47, 0.1, 0.47), M.yellow, 0, 0.1, 0);
    },
  },

  // ---------------- BOSS SALVAGE (one per boss; see settings.bossSalvage) ----------------
  titanFist: {
    name: "Titan's Fist", icon: '👊', boss: true,
    desc: 'BOSS SALVAGE (Ash Titan). A stone fist: +200% ram damage on the side it faces.',
    build(g) {
      add(g, new THREE.BoxGeometry(0.46, 0.14, 0.46), M.dark, 0, -0.18, 0);
      add(g, new THREE.DodecahedronGeometry(0.3, 0), M.ash, 0, 0.12, 0).scale.set(1, 0.85, 1.1);
      for (const x of [-0.15, -0.05, 0.05, 0.15]) add(g, new THREE.BoxGeometry(0.08, 0.12, 0.1), M.ash, x, 0.36, 0.08);
      add(g, new THREE.BoxGeometry(0.4, 0.03, 0.03), M.ember, 0, 0.2, 0.26);
    },
  },
  magmaHeart: {
    name: 'Magma Heart', icon: '🔥', boss: true,
    desc: 'BOSS SALVAGE (Magma Colossus). Lava can\'t touch you (like 4 Hover Fans) and +engine power.',
    build(g) {
      add(g, new THREE.CylinderGeometry(0.2, 0.24, 0.16, 8), M.dark, 0, -0.17, 0);
      add(g, new THREE.IcosahedronGeometry(0.22, 0), M.ember, 0, 0.12, 0);
      for (const [x, y, z] of [[0.14, 0.2, 0.08], [-0.15, 0.08, 0.1], [0.02, 0.05, -0.18], [-0.05, 0.3, -0.05]]) add(g, new THREE.DodecahedronGeometry(0.1, 0), M.ash, x, y, z); // crust
      for (const a of [0, 2.1, 4.2]) add(g, new THREE.BoxGeometry(0.05, 0.3, 0.05), M.ember, Math.cos(a) * 0.2, 0.1, Math.sin(a) * 0.2);
    },
  },
  boneCrown: {
    name: 'Bone Crown', icon: '👑', boss: true,
    desc: 'BOSS SALVAGE (Bone King). Demons you kill drop +50% souls.',
    build(g) {
      add(g, new THREE.CylinderGeometry(0.22, 0.22, 0.14, 8, 1, true), M.bone, 0, -0.12, 0);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(g, new THREE.ConeGeometry(0.06, 0.26, 4), M.bone, Math.cos(a) * 0.2, 0.08, Math.sin(a) * 0.2); }
      add(g, new THREE.OctahedronGeometry(0.07, 0), M.gold, 0, -0.04, 0.22);
    },
  },
  leviathanTooth: {
    name: 'Leviathan Tooth', icon: '🦷', boss: true,
    desc: 'BOSS SALVAGE (Drowned Leviathan). +150% ram damage on its side, and it floats (like 3 Pontoons).',
    build(g) {
      add(g, new THREE.BoxGeometry(0.44, 0.12, 0.44), M.dark, 0, -0.19, 0);
      add(g, new THREE.ConeGeometry(0.2, 0.95, 6), M.tooth, 0, 0.32, 0).rotation.z = 0.15;
    },
  },
  bogHeart: {
    name: 'Bog Heart', icon: '💚', boss: true,
    desc: 'BOSS SALVAGE (Bog Mother). It slowly repairs your whole car, and you never get stuck in mud.',
    build(g) {
      add(g, new THREE.CylinderGeometry(0.22, 0.2, 0.14, 8), M.dark, 0, -0.17, 0);
      add(g, new THREE.SphereGeometry(0.2, 8, 6), M.bogGreen, 0, 0.08, 0);
      for (const a of [0.5, 2.4, 4.4]) add(g, new THREE.TorusGeometry(0.2, 0.025, 4, 10), M.feather, 0, 0.08, 0).rotation.set(a, a * 0.7, 0);
    },
  },
  frostCore: {
    name: 'Frost Core', icon: '❄️', boss: true,
    desc: 'BOSS SALVAGE (Frozen Warden). No cold (like 3 Heaters) and grip on ice (like 3 Spiked Tires).',
    build(g) {
      add(g, new THREE.BoxGeometry(0.4, 0.12, 0.4), M.steel, 0, -0.18, 0);
      add(g, new THREE.OctahedronGeometry(0.26, 0), M.ice, 0, 0.16, 0).scale.set(0.8, 1.3, 0.8);
      add(g, new THREE.OctahedronGeometry(0.08, 0), M.cool, 0, 0.16, 0);
    },
  },
  colossusReactor: {
    name: 'Colossus Reactor', icon: '⚛️', boss: true,
    desc: 'BOSS SALVAGE (Iron Colossus). Huge engine power and top speed, and magnets can\'t grab you.',
    build(g) {
      add(g, new THREE.CylinderGeometry(0.22, 0.24, 0.5, 8), M.steel, 0, 0, 0);
      add(g, new THREE.CylinderGeometry(0.16, 0.16, 0.52, 8), M.reactor, 0, 0, 0).scale.set(1, 1, 0.3);
      for (const y of [-0.15, 0.15]) add(g, new THREE.TorusGeometry(0.23, 0.03, 4, 12), M.yellow, 0, y, 0).rotation.x = Math.PI / 2;
    },
  },
  harpyWings: {
    name: 'Harpy Wings', icon: '🪽', boss: true,
    desc: 'BOSS SALVAGE (Harpy Queen). You glide when you\'re in the air, with jet thrust (like 2 Jump Jets).',
    build(g) {
      add(g, new THREE.BoxGeometry(0.3, 0.14, 0.3), M.dark, 0, -0.17, 0);
      for (const s of [-1, 1]) {
        const w = add(g, new THREE.BoxGeometry(0.7, 0.04, 0.32), M.feather, s * 0.35, 0.05, 0);
        w.rotation.z = s * 0.35;
      }
      const flame = add(g, new THREE.ConeGeometry(0.1, 0.4, 6), M.flame, 0, 0.3, 0);
      flame.visible = false;
      g.userData.jetFlame = flame;
    },
  },
  mirrorShard: {
    name: 'Mirror Shard', icon: '🪞', boss: true,
    desc: 'BOSS SALVAGE (The Reflection). Your whole car takes 25% less damage.',
    build(g) {
      add(g, new THREE.BoxGeometry(0.36, 0.1, 0.36), M.dark, 0, -0.2, 0);
      add(g, new THREE.TetrahedronGeometry(0.34, 0), M.mirror, 0, 0.14, 0).scale.set(0.7, 1.3, 0.35);
    },
  },
  devilsContract: {
    name: "Devil's Contract", icon: '📜', boss: true,
    desc: 'BOSS SALVAGE (The Devil). DOUBLE souls from kills, 10% less damage, and slow self-repair. Signed in blood.',
    build(g) {
      add(g, new THREE.BoxGeometry(0.36, 0.1, 0.36), M.dark, 0, -0.2, 0);
      add(g, new THREE.CylinderGeometry(0.08, 0.08, 0.42, 8), M.paper, 0, 0.0, 0).rotation.z = Math.PI / 2;
      add(g, new THREE.BoxGeometry(0.36, 0.3, 0.02), M.paper, 0, 0.12, 0.04);
      add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), M.devil, 0.1, 0.06, 0.06).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) add(g, new THREE.ConeGeometry(0.04, 0.18, 5), M.devil, s * 0.16, 0.34, 0).rotation.z = -s * 0.4;
    },
  },
};

// A small gun turret (used by the Machine Gun part). Its aiming parts stay
// lined up with the car, no matter which surface the base is bolted to.
export function createGunTurret(kind = 'gun') {
  const big = kind === 'cannon';
  const turret = new THREE.Group();
  const yaw = new THREE.Group();
  turret.add(yaw);
  add(yaw, new THREE.BoxGeometry(big ? 0.5 : 0.34, big ? 0.3 : 0.2, big ? 0.6 : 0.42), big ? M.red : M.blue, 0, 0.08, 0);
  const pitch = new THREE.Group();
  pitch.position.set(0, big ? 0.18 : 0.12, 0.1);
  yaw.add(pitch);
  const barrels = new THREE.Group();
  pitch.add(barrels);
  const len = big ? 1.2 : 0.8;
  const bg = new THREE.CylinderGeometry(big ? 0.1 : 0.045, big ? 0.12 : 0.05, len, 7);
  bg.rotateX(Math.PI / 2);
  add(barrels, bg, M.steel, 0, 0, len / 2);
  if (big) add(barrels, new THREE.CylinderGeometry(0.15, 0.15, 0.2, 7).rotateX(Math.PI / 2), M.dark, 0, 0, len); // muzzle brake
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, len + 0.1);
  barrels.add(muzzle);
  const flash = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.9 }));
  flash.userData.ownMat = true; // (its own material: freed when the gun is)
  flash.scale.set(1, 1, 1.8);
  flash.visible = false;
  muzzle.add(flash);
  return { group: turret, yaw, pitch, barrels, muzzle, flash };
}
