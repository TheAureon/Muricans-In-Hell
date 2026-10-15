// HELLDRIVERS — game start-up and main loop.
import * as THREE from 'three';
import { SETTINGS } from './settings.js';
import { STARTING_REGION } from './regions/index.js';
import { createPhysics, PHYSICS_STEP } from './core/physics.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { createScene } from './world/scene.js';
import { createGround } from './world/ground.js';
import { Dust, Embers, AimMarker } from './world/effects.js';
import { Gore } from './world/gore.js';
import { Scrap } from './world/scrap.js';
import { Demons } from './demons/demons.js';
import { AshTitan } from './demons/boss.js';
import { Projectiles } from './demons/projectiles.js';
import { Bullets } from './combat/bullets.js';
import { Stats } from './combat/stats.js';
import { Car } from './vehicle/car.js';
import { ChaseCamera } from './camera/chaseCamera.js';
import { Hud, showStartScreen } from './ui/hud.js';
import { createTuningPanel } from './ui/tuning.js';
import { Garage } from './ui/garage.js';
import { Progress } from './core/progress.js';
import { Souls } from './world/souls.js';
import { DevPanel, loadDevSettings } from './ui/devPanel.js';

async function main() {
  loadDevSettings(); // dev/creative switches first, so "no enemies" applies from the start
  const region = STARTING_REGION;
  const physics = await createPhysics();
  const { renderer, scene, camera, followPlayer } = createScene(region);
  createGround(scene, physics, region);

  const car = new Car(scene, physics, new THREE.Vector3(0, 1, 0));
  const chase = new ChaseCamera(camera);
  const input = new Input(renderer.domElement);
  const audio = new Audio();
  const hud = new Hud();
  const tuning = createTuningPanel();
  const dust = new Dust(scene);
  const embers = new Embers(scene);
  const aim = new AimMarker(scene);
  const smoke = new Dust(scene, 120, 0x1a1414, 0.7);
  const gore = new Gore(scene);
  const stats = new Stats();
  const sparks = new Dust(scene, 160, 0xffd040, 0.95);
  const projectiles = new Projectiles(scene, { car, dust, sparks, audio, chase });
  const demons = new Demons(scene, region, { gore, audio, stats, hud, chase, physics, projectiles });
  const bullets = new Bullets(scene, { demons, dust, gore, audio });
  // Souls, unlocks and your chassis tier.
  const progress = new Progress();
  car.setTier(progress.tier);
  const garage = new Garage({ camera, renderer, car, audio, progress });
  let lastChime = 0;
  const souls = new Souls(scene, (value) => {
    progress.addSouls(value);
    if (performance.now() - lastChime > 70) { audio.chime(); lastChime = performance.now(); }
  });
  hud.souls(progress.souls);
  progress.onChange((p) => hud.souls(p.souls));
  // Every kill drops souls (ram kills pay extra).
  demons.onKill = (d, source) => {
    const P = SETTINGS.progression;
    souls.burst(d.pos, (P.souls[d.type] || 1) * (source === 'ram' ? P.ramBonus : 1));
  };
  const scrap = new Scrap(scene);

  // The region's boss (and what happens when you beat it).
  const boss = region.boss ? new AshTitan(scene, physics, {
    region, car, demons, projectiles, gore, audio, hud, chase, dust, stats,
    onDefeated: () => {
      hud.victory();
      souls.burst(boss.pos.clone().setY(4), SETTINGS.progression.souls.boss);
      progress.cleared[region.id] = true;
      progress.save();
    },
  }) : null;
  demons.boss = boss;
  demons.populate(car.currPos);

  // Dev / creative mode (press C): no enemies, no damage, free building.
  const dev = new DevPanel({
    onChange: (which) => {
      const D = SETTINGS.dev;
      if (which === 'noEnemies') {
        if (D.noEnemies) {
          demons.clearAround(car.currPos, 1e9);
          projectiles.clear();
          boss?.reset();
          if (boss) boss.root.visible = false;
          hud.bossBar(null);
        } else {
          boss?.reset();
          demons.populate(car.currPos);
        }
      }
      if (which === 'creative' && !D.creative) {
        // Back to reality: your real saved build, souls, unlocks and chassis.
        progress.reloadSaved();
        car.build.restore();
        car.savedBuild = car.build.snapshot();
        car.setTier(progress.tier);
        hud.souls(progress.souls);
      }
      if (which === 'creative') car.applyBuild();
      garage.refresh();
      hud.toast(`${{ noEnemies: 'No enemies', noDamage: 'No damage', creative: 'Free build' }[which]}: ${D[which] ? 'ON' : 'OFF'}`, 'warn');
    },
    onTier: (i) => {
      if (!SETTINGS.dev.creative) return;
      progress.tier = i; // (not saved in creative mode)
      car.setTier(i);
      garage.refresh();
      hud.toast(`Chassis: ${SETTINGS.chassisTiers[i].name}`, 'warn');
    },
  });
  if (SETTINGS.dev.noEnemies && boss) boss.root.visible = false;

  // Pieces breaking off the car become scrap lying in the world.
  car.onDetach = (pieces) => {
    for (const p of pieces) {
      scrap.spawn(p.objects, p.item, p.push);
      hud.toast(`LOST: ${p.item.label}`, 'bad');
      const at = new THREE.Box3().setFromObject(p.objects[0]).getCenter(new THREE.Vector3());
      for (let i = 0; i < 10; i++) sparks.spawn(at, new THREE.Vector3((Math.random() - 0.5) * 8, 2 + Math.random() * 5, (Math.random() - 0.5) * 8), 0.08, 0.4);
    }
    audio.thump();
    chase.addShake(0.4);
  };

  // Draw one frame behind the start screen so it isn't empty.
  car.capture(); car.capture();
  car.render(1, 0, null);
  demons.render(1, 0);
  chase.update(car, 1 / 60, 0);
  renderer.render(scene, camera);

  await showStartScreen(region.name);
  audio.start();

  const timer = new THREE.Timer();
  let accumulator = 0;
  let dustTimer = 0;
  let elapsed = 0;
  let wreckTimer = 0;
  let damageFxTimer = 0;
  let smokeTimer = 0;
  const tmp = new THREE.Vector3();
  const tmpAim = new THREE.Vector3();

  function frame() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    elapsed += dt;

    // --- One-shot keys ---
    if (input.wasPressed('KeyT')) tuning.toggle();
    if (input.wasPressed('KeyC')) dev.toggle();
    if (input.wasPressed('KeyH')) hud.toggleHelp();
    if (input.wasPressed('KeyM')) audio.toggleMute();
    if (input.wasPressed('KeyG') || (garage.open && input.wasPressed('Escape'))) {
      const near = demons.nearestDistance(car.currPos);
      if (garage.open) garage.close();
      else if (car.wrecked) { /* wait for respawn */ }
      else if (near < SETTINGS.damage.garageSafeRadius) hud.toast(`Demons too close! Get ${Math.ceil(SETTINGS.damage.garageSafeRadius - near)} m further away to open the garage.`, 'warn');
      else garage.openGarage();
      input.mouse.down = false;
    }
    if (garage.open) {
      // Paused: only the garage camera moves.
      aim.mesh.visible = false;
      garage.update(dt);
      renderer.render(scene, camera);
      input.endFrame();
      requestAnimationFrame(frame);
      return;
    }
    if (input.wasPressed('KeyR')) car.reset(false);
    if (input.wasPressed('Backspace')) { car.reset(true); demons.clearAround(car.currPos, 60); }

    // --- Physics at a fixed rate ---
    accumulator += dt;
    while (accumulator >= PHYSICS_STEP) {
      car.fixedUpdate(input, PHYSICS_STEP);
      physics.world.step();
      car.capture();
      car.afterStep(); // crash damage from hitting rocks
      demons.fixedUpdate(PHYSICS_STEP, car);
      if (!SETTINGS.dev.noEnemies) boss?.fixedUpdate(PHYSICS_STEP, car);
      car.applyCrashDamage();
      accumulator -= PHYSICS_STEP;
    }
    const alpha = accumulator / PHYSICS_STEP;

    // --- Wrecked? Boom, smoke, then respawn ---
    if (car.wrecked) {
      if (wreckTimer === 0) {
        audio.wreck();
        chase.addShake(1);
        gore.explode(car.currPos, new THREE.Vector3(), [0x3a66d0, 0x1a1a1c, 0x5a5d63, 0xc8202a], 1.5);
      }
      wreckTimer += dt;
      if ((smokeTimer -= dt) <= 0) {
        smokeTimer = 0.05;
        smoke.spawn(tmp.copy(car.position).setY(1.2), new THREE.Vector3((Math.random() - 0.5) * 1.5, 3 + Math.random() * 2, (Math.random() - 0.5) * 1.5), 0.6 + Math.random() * 0.5, 1.6);
      }
      if (wreckTimer > SETTINGS.damage.respawnDelay) {
        wreckTimer = 0;
        // Full restart: stock car + starting kit, scrap gone, fresh demons,
        // the Titan asleep again, and the region no longer counts as cleared.
        car.respawn();
        scrap.clear();
        projectiles.clear();
        demons.clearAround(car.currPos, 99999);
        demons.populate(car.currPos);
        if (boss) { boss.defeated = false; boss.reset(); }
        souls.clear();
        if (!SETTINGS.progression.keepOnWreck) progress.reset();
        progress.save();
        hud.souls(progress.souls);
        car.setTier(progress.tier);
        stats.reset();
        hud.toast('Starting over with a fresh car!', 'warn');
      }
    }

    // --- Aim + car visuals + camera ---
    let aimPoint = aim.update(camera, input.mouse.ndcX, input.mouse.ndcY, elapsed);
    // If the mouse is over a demon, aim at its body, not the ground behind it.
    // Otherwise aim at chest height above the ground spot, so shots skim
    // along at demon height instead of plunging into the dirt.
    const aimed = demons.raycast(aim.raycaster.ray);
    if (aimed) aimPoint = aimed.point;
    else if (aim.mesh.visible) aimPoint = tmpAim.copy(aimPoint).setY(0.8);
    car.render(alpha, dt, aimPoint);
    demons.render(alpha, dt);
    if (!SETTINGS.dev.noEnemies) boss?.render(alpha, dt);
    chase.update(car, dt, input.wheel);

    // --- Shooting: every gun fires at its own weapon's rate ---
    let shot = false, boomed = false;
    car.model.root.updateMatrixWorld(true);
    for (const t of car.turrets) {
      t.cooldown -= dt;
      if (!input.mouse.down || t.cooldown > 0 || car.wrecked) continue;
      const W = Bullets.weapon(t.weapon);
      t.cooldown = 1 / W.fireRate;
      car.fireVisual(t);
      bullets.fire(car.muzzleWorld(t), aimPoint, t.weapon);
      if (t.weapon === 'cannon') { boomed = true; chase.addShake(0.15); } else shot = true;
    }
    if (shot) audio.gunshot();
    if (boomed) audio.cannon();

    // --- Dust from the rear tires when drifting, braking or flooring it ---
    const hardLaunch = car.throttle > 0 && car.forwardSpeed < 12 && car.forwardSpeed > 0.5;
    const hardBrake = car.throttle < 0 && car.forwardSpeed > 8;
    dustTimer -= dt;
    if (dustTimer <= 0 && car.grounded && (car.drifting || hardLaunch || hardBrake || (car.handbrake && car.speed > 4))) {
      dustTimer = 1 / 45; // puffs per second, per tire
      for (const w of car.model.wheels) {
        if (w.front) continue;
        w.steer.getWorldPosition(tmp);
        tmp.y = 0.2;
        const vel = new THREE.Vector3((Math.random() - 0.5) * 2, 0.5 + Math.random(), (Math.random() - 0.5) * 2);
        dust.spawn(tmp, vel, 0.3 + Math.random() * 0.3, 0.6 + Math.random() * 0.5);
      }
    }

    // --- Crashes, smoke and sparks from damaged pieces ---
    if (car.crashed) {
      chase.addShake(Math.min(1, car.crashed / 20));
      audio.thump();
      car.crashed = 0;
    }
    if ((damageFxTimer -= dt) <= 0) {
      damageFxTimer = 0.09;
      for (const p of car.smokingPoints(SETTINGS.damage.smokeBelow)) {
        if (Math.random() < 0.6) smoke.spawn(p.pos, new THREE.Vector3((Math.random() - 0.5), 2 + Math.random() * 1.5, (Math.random() - 0.5)), 0.25 + (1 - p.frac) * 0.3, 1.2);
        if (p.frac < 0.25 && Math.random() < 0.5) sparks.spawn(p.pos, new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6), 0.06, 0.35);
      }
    }

    // --- Scrap: press E to grab what's in reach ---
    const reach = scrap.inReach(car.position, SETTINGS.damage.pickupRadius);
    if (reach.length && !car.wrecked) {
      const names = reach.map((s) => s.item.label);
      hud.setPrompt(`[E] Grab scrap: ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2} more` : ''}`);
      if (input.wasPressed('KeyE')) {
        for (const item of scrap.collect(reach, car.position)) {
          car.build.give(item.type, item.count);
          hud.toast(`+${item.count} ${item.label}`);
        }
        car.build.save();
        audio.hit();
      }
    } else hud.setPrompt('');

    dust.update(dt);
    smoke.update(dt);
    sparks.update(dt);
    scrap.update(dt);
    souls.update(dt, car.position);
    projectiles.update(dt);

    // --- Objective arrow: points at the boss arena until it's awake ---
    if (boss && !boss.awake && boss.state !== 'dead' && !SETTINGS.dev.noEnemies) {
      const to = boss.arenaCenter.clone().sub(car.position).setY(0);
      const camFwd = new THREE.Vector3();
      camera.getWorldDirection(camFwd);
      const angle = Math.atan2(camFwd.x * to.z - camFwd.z * to.x, camFwd.x * to.x + camFwd.z * to.z);
      const cleared = progress.cleared[region.id] ? ' (beaten before)' : '';
      hud.objective(`☠ ${boss.name.toUpperCase()}${cleared} · ${Math.round(to.length())} m`, angle);
    } else hud.objective(null);
    bullets.update(dt);
    gore.update(dt);
    stats.tick(dt);
    embers.update(dt, car.position);
    followPlayer(car.position);

    const driftAmount = car.grounded ? THREE.MathUtils.clamp((Math.abs(car.sidewaysSpeed) - 2) / 10, 0, 1) : 0;
    audio.update(Math.min(Math.abs(car.forwardSpeed) / SETTINGS.car.topSpeed, 1), car.throttle, driftAmount);
    hud.update(car, SETTINGS.car.topSpeed, dt, input.mouse);
    hud.combat(car, stats);

    renderer.render(scene, camera);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Handy for debugging in the browser console.
  window.HELLDRIVERS = { dev, progress, souls, boss, projectiles, car, SETTINGS, physics, scene, camera, demons, stats, garage, scrap };
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88;position:fixed;top:0;left:0;z-index:99">Failed to start: ${err.message}</pre>`);
});
