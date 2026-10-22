// HELLDRIVERS — game start-up and main loop.
import * as THREE from 'three';
import { SETTINGS } from './settings.js';
import { REGIONS, regionById, nextRegion, PLANNED_REGIONS } from './regions/index.js';
import { createPhysics, PHYSICS_STEP } from './core/physics.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { createScene } from './world/scene.js';
import { createGround } from './world/ground.js';
import { Dust, Embers, AimMarker } from './world/effects.js';
import { Gore } from './world/gore.js';
import { Scrap } from './world/scrap.js';
import { Demons } from './demons/demons.js';
import { Boss } from './demons/boss.js';
import { Hazards } from './world/hazards.js';
import { Hellgate } from './world/hellgate.js';
import { Projectiles } from './demons/projectiles.js';
import { Bullets } from './combat/bullets.js';
import { Stats } from './combat/stats.js';
import { Car } from './vehicle/car.js';
import { ChaseCamera } from './camera/chaseCamera.js';
import { Hud } from './ui/hud.js';
import { showTitleScreen } from './ui/titleScreen.js';
import { Autopilot, Director } from './ui/attract.js';
import { Lighting } from './world/lighting.js';
import { GFX, setQuality } from './core/graphics.js';
import { Base } from './world/base.js';
import { setupTerrain, terrain } from './world/terrain.js';
import { Teleporter } from './world/teleporter.js';
import { Radio, speakLine } from './story/radio.js';
import { playIntro } from './story/intro.js';
import { BOSS_DEATH } from './story/story.js';
import { createTuningPanel } from './ui/tuning.js';
import { Garage } from './ui/garage.js';
import { Progress } from './core/progress.js';
import { Souls } from './world/souls.js';
import { JobBoard } from './missions/jobBoard.js';
import { JobLog } from './ui/jobLog.js';
import { Beacons } from './world/beacon.js';
import { DevPanel, loadDevSettings } from './ui/devPanel.js';

async function main() {
  loadDevSettings(); // dev/creative switches first, so "no enemies" applies from the start
  // Souls, unlocks, chassis tier, and which region you're in.
  const progress = new Progress();
  // A dev-panel jump in creative mode is a one-off visit (nothing saved).
  let jump = null, creativeStash = null, arrive = 'spawn';
  try {
    jump = sessionStorage.getItem('helldrive.jump');
    creativeStash = JSON.parse(sessionStorage.getItem('helldrive.creative') || 'null');
    arrive = sessionStorage.getItem('helldrive.arrive') || 'spawn'; // spawn / base / teleporter
    sessionStorage.removeItem('helldrive.jump');
    sessionStorage.removeItem('helldrive.creative');
    sessionStorage.removeItem('helldrive.arrive');
  } catch { /* ignore */ }
  const region = regionById(jump || progress.region);
  const next = nextRegion(region);
  setupTerrain(region); // hills (or flat ground) for this region
  const physics = await createPhysics();
  const { renderer, scene, camera, followPlayer, lights } = createScene(region);
  // The graphics card gave up (driver crash, out of video memory...): say so
  // instead of freezing on a black screen.
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    try { car.build.save(); } catch { /* not built yet */ }
    showProblem('GRAPHICS CRASHED', `The browser lost the 3D graphics (it happens when the graphics card runs out of memory or its driver hiccups). Your progress is saved.${GFX.name !== 'low' ? ' If it keeps happening, try Low graphics.' : ''}`,
      [['RELOAD', () => location.reload()], ...(GFX.name !== 'low' ? [['RELOAD ON LOW GRAPHICS', reloadOnLow]] : [])]);
  });
  const hazards = new Hazards(scene, region);
  createGround(scene, physics, region, hazards);

  // Doc's walled base (Ash Plains) and this region's teleporter, if any.
  const base = region.base ? new Base(scene, physics, region.base) : null;
  const tele = region.teleporter ? new Teleporter(scene, region.teleporter) : null;
  tele?.setEstablished(!!progress.teleporters[region.id]);
  base?.setPadActive(REGIONS.some((r) => progress.teleporters[r.id]));
  // Where you start / respawn: the teleporter if you've set one up here,
  // else the base (Ash Plains), else where you came in.
  const onGround = (v) => { v.y = terrain.height(v.x, v.z) + 1; return v; };
  const regionSpawn = () => onGround(region.base ? new THREE.Vector3(region.base.x, 0, region.base.z) : new THREE.Vector3(0, 0, 0));
  const respawnPoint = () => (tele?.established ? onGround(tele.pos.clone().add(new THREE.Vector3(0, 0, 8))) : regionSpawn());
  const startPoint = arrive === 'teleporter' && tele?.established ? respawnPoint()
    : arrive === 'base' && base ? onGround(base.pad.clone().add(new THREE.Vector3(-9, 0, 0))) : regionSpawn();

  const car = new Car(scene, physics, startPoint);
  car.hazards = hazards;
  const chase = new ChaseCamera(camera);
  const input = new Input(renderer.domElement);
  const audio = new Audio();
  const hud = new Hud();
  const tuning = createTuningPanel();
  const dust = new Dust(scene);
  const embers = new Embers(scene, GFX.embers);
  const aim = new AimMarker(scene);
  const smoke = new Dust(scene, 120, 0x1a1414, 0.7);
  const flames = new Dust(scene, 200, 0xff6a10, 0.9);
  const gore = new Gore(scene);
  const stats = new Stats();
  const sparks = new Dust(scene, 160, 0xffd040, 0.95);
  const projectiles = new Projectiles(scene, { car, dust, sparks, audio, chase });
  const demons = new Demons(scene, region, { gore, audio, stats, hud, chase, physics, projectiles });
  demons.base = base;
  demons.hazards = hazards;
  const radio = new Radio(audio);
  // Jobs (missions) from Doc and whoever else needs something done.
  const jobs = new JobBoard({ region, progress, radio, hud, audio });
  const jobLog = new JobLog(jobs);
  const beacons = new Beacons(scene);
  jobs.onChange = () => { hud.jobs(jobs); jobLog.render(); beacons.set(jobs.beacons()); };
  jobs.onChange();
  let jobsClicked = false;
  document.getElementById('jobs-btn').addEventListener('click', (e) => { jobsClicked = true; e.currentTarget.blur(); });
  const bullets = new Bullets(scene, { demons, dust, gore, audio });
  if (SETTINGS.dev.creative && creativeStash) {
    // Came here by a creative-mode jump: bring the creative build along.
    car.build.load(creativeStash.build);
    progress.tier = creativeStash.tier;
  }
  car.setTier(progress.tier);
  const garage = new Garage({ camera, renderer, car, audio, progress });
  // The garage is a real place now: Doc's base in the Ash Plains. G or the
  // corner button opens it there (or anywhere in creative mode).
  const canGarage = () => SETTINGS.dev.creative || !!base?.contains(car.currPos);
  function toggleGarage() {
    if (garage.open) garage.close();
    else if (car.wrecked) { /* wait for respawn */ }
    else if (canGarage()) garage.openGarage();
    else if (base) hud.toast('The garage is back at base. Drive home!', 'warn');
    else if (tele?.established) hud.toast('No garage out here. Teleport home from the pad (F).', 'warn');
    else hud.toast('No garage out here. Find the hell-magic source (purple light) to set up a teleporter.', 'warn');
  }
  let garageClicked = false;
  document.getElementById('garage-btn').addEventListener('click', (e) => { garageClicked = true; e.currentTarget.blur(); });
  garage.onOpenChange = (open) => base?.showShell(!open); // see the car, not the hangar walls
  let lastChime = 0;
  const souls = new Souls(scene, (value) => {
    progress.addSouls(value);
    if (performance.now() - lastChime > 70) { audio.chime(); lastChime = performance.now(); }
    if (mode === 'play') radio.say('firstSouls');
  });
  hud.souls(progress.souls);
  progress.onChange((p) => hud.souls(p.souls));
  // Every kill drops souls (ram kills pay extra).
  demons.onKill = (d, source) => {
    lighting.flash(d.pos, d.def.heavy ? 1.5 : 0.6);
    if (mode === 'title') return; // the title-screen movie doesn't earn souls
    radio.say('firstKill');
    jobs.emit('kill', { type: d.type, source });
    const P = SETTINGS.progression;
    souls.burst(d.pos, (P.souls[d.type] || 1) * (source === 'ram' ? P.ramBonus : 1));
  };
  const scrap = new Scrap(scene);

  // The Hellgate to the next region: next to the arena, on the side you
  // come from. It opens when the boss dies (or right away if you beat it before).
  let gate = null;
  if (region.boss) {
    const A = region.boss.arena;
    const center = new THREE.Vector3(A.x, 0, A.z);
    const towardStart = center.clone().negate().normalize();
    const off = A.style === 'island' ? A.radius * 0.6 : A.radius + 25;
    gate = new Hellgate(scene, center.clone().addScaledVector(towardStart, off), new THREE.Vector3(0, 0, 0), next);
    gate.setOpen(!!progress.cleared[region.id]);
  }

  // The region's boss (and what happens when you beat it).
  const boss = region.boss ? new Boss(scene, physics, {
    region, car, demons, projectiles, gore, audio, hud, chase, dust, stats, hazards,
    // Its last moment: the Ash Titan roars, the Magma Colossus... talks.
    onDying: () => {
      const death = BOSS_DEATH[region.boss.type] || {};
      if (death.roar) { audio.roar(); chase.addShake(1); }
      if (death.line) setTimeout(() => speakLine(death.line, death.voice, audio), 500);
    },
    onDefeated: () => {
      setTimeout(() => radio.say(region.radio?.bossDead), 1500);
      if (region.radio?.afterBoss) setTimeout(() => radio.say(region.radio.afterBoss), 16000);
      const sealedName = PLANNED_REGIONS[REGIONS.indexOf(region) + 1];
      hud.victory(region.name.replace(/^The /, '').toUpperCase(), next
        ? `${boss.name} is dead. A HELLGATE has opened: follow the arrow to ${next.name}!`
        : `${boss.name} is dead. A Hellgate rose, but the way to ${sealedName || 'the next region'} is still sealed (coming soon).`);
      souls.burst(boss.pos.clone().setY(4), boss.B.souls);
      progress.cleared[region.id] = true;
      progress.save();
      jobs.emit('boss');
      gate?.setOpen(true);
    },
  }) : null;
  demons.boss = boss;
  demons.populate(car.currPos);

  // Dev / creative mode (press C): no enemies, no damage, free building.
  // Off to another region: save everything, then reload into it.
  let traveling = false;
  // arriveAt: 'spawn' (the region's way in), 'base' (the home pad) or
  // 'teleporter' (that region's teleporter).
  function travelTo(target, arriveAt = 'spawn', { keepSave = false } = {}) {
    // (Not while wrecked: the wreck has to finish first, or it would be skipped.)
    if (traveling || (car.wrecked && !keepSave)) return;
    traveling = true;
    car.invulnerable = true; // nothing can happen to you mid-teleport
    if (arriveAt === 'spawn') hud.travel(target.name);
    else hud.travel(arriveAt === 'base' ? "Doc's base" : target.name, 'TELEPORTING TO');
    try { sessionStorage.setItem('helldrive.arrive', arriveAt); } catch { /* ignore */ }
    audio.wreck();
    if (keepSave) { /* just going back: the real save is already right */ } else if (SETTINGS.dev.creative) {
      try {
        sessionStorage.setItem('helldrive.jump', target.id);
        sessionStorage.setItem('helldrive.creative', JSON.stringify({ build: car.build.snapshot(), tier: progress.tier }));
      } catch { /* ignore */ }
    } else {
      progress.region = target.id === REGIONS[0].id ? null : target.id;
      progress.save();
      car.build.save();
    }
    setTimeout(() => location.reload(), 1300);
  }

  const dev = new DevPanel({
    regions: REGIONS,
    current: region.id,
    onRegion: (id) => travelTo(regionById(id), 'spawn'),
    onChange: (which) => {
      const D = SETTINGS.dev;
      if (which === 'noEnemies') {
        if (D.noEnemies) {
          demons.clearAround(car.currPos, 1e9);
          projectiles.clear();
          boss?.setDisabled(true);
          hud.bossBar(null);
        } else {
          boss?.setDisabled(false);
          demons.populate(car.currPos);
        }
      }
      // Undo history from one mode must never be undone into the other.
      if (which === 'creative') garage.history = [];
      if (which === 'creative' && !D.creative) {
        // Came here by a creative jump? That visit wasn't real: go back to
        // where you really are.
        if (jump && jump !== (progress.region || REGIONS[0].id)) {
          progress.reloadSaved();
          travelTo(regionById(progress.region), 'spawn', { keepSave: true });
          return;
        }
        // Back to reality: your real saved build, souls, unlocks and chassis.
        progress.reloadSaved();
        jobs.reloadSaved();
        car.build.restore();
        car.savedBuild = car.build.snapshot();
        car.setTier(progress.tier);
        hud.souls(progress.souls);
        // ...and the real state of this region (boss, gate, teleporter).
        tele?.setEstablished(!!progress.teleporters[region.id]);
        base?.setPadActive(REGIONS.some((r) => progress.teleporters[r.id]));
        gate?.setOpen(!!progress.cleared[region.id]);
        if (boss && boss.defeated && !progress.cleared[region.id]) { boss.defeated = false; boss.reset(); }
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
  if (SETTINGS.dev.noEnemies) boss?.setDisabled(true);

  // Pieces breaking off the car become scrap lying in the world.
  car.onDetach = (pieces) => {
    if (mode === 'play') radio.say('firstLoss');
    for (const p of pieces) {
      scrap.spawn(p.objects, p.item, p.push);
      hud.toast(`LOST: ${p.item.label}`, 'bad');
      const at = new THREE.Box3().setFromObject(p.objects[0]).getCenter(new THREE.Vector3());
      for (let i = 0; i < 10; i++) sparks.spawn(at, new THREE.Vector3((Math.random() - 0.5) * 8, 2 + Math.random() * 5, (Math.random() - 0.5) * 8), 0.08, 0.4);
    }
    audio.thump();
    chase.addShake(0.4);
  };

  // ---- Title screen + menu, with the attract-mode movie behind them ----
  // The car drives itself (invincible) through the demons while a virtual
  // camera crew films it. Nothing that happens in it counts.
  let mode = 'title';
  car.invulnerable = true;
  const attractAt = region.attractCenter || { x: 0, z: 0 };
  const autopilot = new Autopilot(car, demons, attractAt, base);
  car.body.setTranslation({ x: attractAt.x, y: terrain.height(attractAt.x, attractAt.z) + 1, z: attractAt.z }, true); // (film outside the walls)
  car.capture(); car.capture();
  const cutEl = document.getElementById('cut');
  const flashCut = () => { cutEl.className = ''; void cutEl.offsetWidth; cutEl.className = 'flash'; };
  const director = new Director(camera, car, flashCut);
  const lighting = new Lighting({ renderer, scene, camera, lights, car });
  lighting.dim([dust.mesh.material]);
  lighting.setCinema(true);
  let intro = { t: 1, pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const introLook = new THREE.Vector3();

  // DRIVE pressed: cut to black, reset the world, swoop into the chase camera.
  function startPlaying() {
    audio.start();
    cutEl.className = 'black';
    setTimeout(() => {
      mode = 'play';
      car.invulnerable = false;
      lighting.setCinema(false);
      car.reset(true);
      car.burns.clear();
      car.build.repairAll();
      car.applyBuild();
      demons.clearAround(car.currPos, 1e9);
      demons.populate(car.currPos);
      projectiles.clear();
      bullets.clear();
      gore.clear();
      hazards.clearPools();
      souls.clear();
      scrap.clear();
      stats.reset();
      if (boss && boss.state !== 'dead') boss.reset();
      camera.fov = SETTINGS.camera.fov;
      camera.updateProjectionMatrix();
      chase.initialized = false;
      // Start high above and behind the car, then swoop down.
      intro = { t: 0, pos: car.currPos.clone().add(new THREE.Vector3(0, 16, -22)), look: car.currPos.clone() };
      cutEl.className = 'fadeout';
      if (region.gatingRule?.requires !== 'none') hud.banner(region.name.toUpperCase(), region.gatingRule.description, 9);
      setTimeout(() => radio.say(region.radio?.arrive), 1200);
    }, 320);
  }

  const timer = new THREE.Timer();
  let accumulator = 0;
  let dustTimer = 0;
  let elapsed = 0;
  let wreckTimer = 0;
  let damageFxTimer = 0;
  let smokeTimer = 0;
  let regionTime = 0;
  const tmp = new THREE.Vector3();
  const tmpAim = new THREE.Vector3();

  function frame() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    elapsed += dt;

    const playing = mode === 'play';
    if (!playing) autopilot.update(dt);

    // --- One-shot keys ---
    if (playing) {
      if (input.wasPressed('KeyT')) tuning.toggle();
      if (input.wasPressed('KeyC')) dev.toggle();
      if (input.wasPressed('KeyH')) hud.toggleHelp();
      if (input.wasPressed('KeyM')) audio.toggleMute();
      if (!jobLog.open && (input.wasPressed('KeyG') || garageClicked || (garage.open && input.wasPressed('Escape')))) {
        garageClicked = false;
        toggleGarage();
        input.mouse.down = false;
      }
      // Teleport: from a region's pad home to base, or from the base pad out.
      if (input.wasPressed('KeyF') && !car.wrecked && !garage.open && !jobLog.open) { // (F = mirror in the garage)
        if (tele?.onPad(car.currPos)) travelTo(REGIONS[0], 'base');
        else if (base?.onPad(car.currPos)) {
          const linked = REGIONS.filter((r) => progress.teleporters[r.id]);
          if (linked.length) travelTo(linked[linked.length - 1], 'teleporter');
          else hud.toast('No teleporters linked yet. Doc needs a hell-magic source out there first.', 'warn');
        }
      }
      // Job board: J or the corner button. The game pauses while it's open.
      if (!garage.open && (input.wasPressed('KeyJ') || jobsClicked || (jobLog.open && input.wasPressed('Escape')))) {
        jobLog.toggle();
        input.mouse.down = false;
      }
      jobsClicked = false;
      if (jobLog.open || garage.open) audio.update(0, 0, 0); // paused: no engine roar or tire screech
      if (jobLog.open) {
        aim.mesh.visible = false;
        lighting.render();
        input.endFrame();
        requestAnimationFrame(frame);
        return;
      }
      if (garage.open) {
        // Paused: only the garage camera moves.
        aim.mesh.visible = false;
        garage.update(dt);
        lighting.render();
        input.endFrame();
        requestAnimationFrame(frame);
        return;
      }
      if (input.wasPressed('KeyR')) car.reset(false);
      if (input.wasPressed('Backspace')) { car.reset(true); demons.clearAround(car.currPos, 60); } // back to the start / teleporter
    }

    // --- Physics at a fixed rate ---
    accumulator += dt;
    while (accumulator >= PHYSICS_STEP) {
      car.fixedUpdate(playing ? input : autopilot.input, PHYSICS_STEP);
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
        smoke.spawn(tmp.copy(car.position).setY(car.position.y + 1.2), new THREE.Vector3((Math.random() - 0.5) * 1.5, 3 + Math.random() * 2, (Math.random() - 0.5) * 1.5), 0.6 + Math.random() * 0.5, 1.6);
      }
      if (wreckTimer > SETTINGS.damage.respawnDelay) {
        wreckTimer = 0;
        // Full restart of the RUN (stock car + starting kit, no souls, no
        // unlocks), back at this region's teleporter if it has one, else at
        // the start. Where you've been (regions, bosses beaten, teleporters)
        // is remembered.
        car.spawn.copy(respawnPoint());
        car.respawn();
        scrap.clear();
        projectiles.clear();
        demons.clearAround(car.currPos, 99999);
        demons.populate(car.currPos);
        if (boss) { boss.defeated = false; boss.reset(); }
        souls.clear();
        hazards.clearPools();
        if (!SETTINGS.progression.keepOnWreck) progress.reset();
        progress.save();
        gate?.setOpen(!!progress.cleared[region.id]);
        setTimeout(() => radio.say('wrecked'), 1500);
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
    else if (aim.mesh.visible) aimPoint = tmpAim.copy(aimPoint).setY(aimPoint.y + 0.8);
    if (!playing) { aim.mesh.visible = false; aimPoint = autopilot.aim; }
    car.render(alpha, dt, aimPoint);
    demons.render(alpha, dt);
    if (!SETTINGS.dev.noEnemies) boss?.render(alpha, dt);
    if (!playing) director.update(dt);
    else {
      chase.update(car, dt, input.wheel);
      if (intro.t < 1) {
        intro.t = Math.min(1, intro.t + dt / 1.8);
        const k = 1 - (1 - intro.t) ** 3; // ease out
        camera.position.lerpVectors(intro.pos, camera.position, k);
        camera.lookAt(introLook.lerpVectors(intro.look, chase.lookAt, k));
      }
    }

    // --- Shooting: every gun fires at its own weapon's rate ---
    let shot = false, boomed = false;
    car.model.root.updateMatrixWorld(true);
    for (const t of car.turrets) {
      t.cooldown -= dt;
      if (!(playing ? input.mouse.down : autopilot.fire) || t.cooldown > 0 || car.wrecked) continue;
      const W = Bullets.weapon(t.weapon);
      t.cooldown = 1 / W.fireRate;
      car.fireVisual(t);
      bullets.fire(car.muzzleWorld(t), aimPoint, t.weapon);
      if (t.weapon === 'cannon') { boomed = true; chase.addShake(0.15); } else shot = true;
      lighting.gunFlash(t.weapon === 'cannon');
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
        tmp.y = terrain.height(tmp.x, tmp.z) + 0.2;
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
      // Burning pieces (lava, fire claws...)
      for (const p of car.burningPoints()) {
        for (let n = 0; n < 2; n++) flames.spawn(p, new THREE.Vector3((Math.random() - 0.5) * 1.2, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 1.2), 0.18 + Math.random() * 0.22, 0.5);
      }
      // Exhaust: smoke when you floor it, flames when it backfires
      if (!car.wrecked) {
        const pipes = car.exhaustPoints();
        const back = car.heading.clone().multiplyScalar(-1);
        for (const p of pipes) {
          if (car.backfire > 0) {
            for (let n = 0; n < 3; n++) flames.spawn(p, back.clone().multiplyScalar(4 + Math.random() * 4).add(new THREE.Vector3(0, Math.random(), 0)), 0.18 + Math.random() * 0.15, 0.25);
          } else if (car.throttle > 0 && Math.random() < 0.5) {
            smoke.spawn(p, back.clone().multiplyScalar(1.5).add(new THREE.Vector3(0, 0.8, 0)), 0.12 + Math.random() * 0.1, 0.7);
          }
        }
        if (car.backfire > 0.2) { audio.thump(); lighting.gunFlash(false); car.backfire = 0.19; }
      }
      // Lava splashing up from under the car
      if (car.onLava > 0 && car.grounded && car.speed > 2) {
        for (let n = 0; n < 3; n++) sparks.spawn(tmp.copy(car.position).add(new THREE.Vector3((Math.random() - 0.5) * 2.5, 0.2, (Math.random() - 0.5) * 3)), new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3), 0.1, 0.5);
      }
      for (const p of car.smokingPoints(SETTINGS.damage.smokeBelow)) {
        if (Math.random() < 0.6) smoke.spawn(p.pos, new THREE.Vector3((Math.random() - 0.5), 2 + Math.random() * 1.5, (Math.random() - 0.5)), 0.25 + (1 - p.frac) * 0.3, 1.2);
        if (p.frac < 0.25 && Math.random() < 0.5) sparks.spawn(p.pos, new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6), 0.06, 0.35);
      }
    }

    // --- Teleporter field: set it up the first time, heal while inside ---
    let healing = false;
    if (tele) {
      tele.update(dt, sparks);
      if (playing && !car.wrecked && tele.inField(car.currPos)) {
        if (!tele.established) {
          tele.setEstablished(true);
          progress.teleporters[region.id] = true;
          progress.save();
          audio.chime();
          hud.banner('TELEPORTER ONLINE', 'Stay in the field to heal. Press F on the pad to teleport home to the garage.', 7);
          radio.say('teleporterFound', { force: true });
          jobs.emit('teleporter');
        }
        healing = car.healStep(dt);
      }
    }
    base?.update(dt);

    // --- Radio: the story's big (and small) moments ---
    if (playing) {
      radio.update(dt);
      if (base && !base.contains(car.currPos)) radio.say('leaveBase');
      if (car.onLava > 0 && car.grounded) radio.say('firstLava');
      if (car.slipping > 0.5) radio.say('firstSlip');
      hud.garageButton(canGarage() && !car.wrecked, canGarage() ? 'Open the garage (G)' : base ? 'The garage is at base (drive home)' : 'The garage is at base (teleport home from a teleporter pad)');
      if (boss && !SETTINGS.dev.noEnemies) {
        if (boss.awake) radio.say(region.radio?.bossAwake);
        else if (boss.state !== 'dead' && boss.arenaCenter.distanceTo(car.currPos) < 260) radio.say(region.radio?.nearBoss);
      }
      if (tele && !tele.established && (regionTime += dt) > 75) radio.say('teleporterHint');
      jobs.update(dt, car);
      if (!car.wrecked && car.onLava > 0 && car.grounded) jobs.emit('lava', { dt });
      if (!car.wrecked && car.drifting) jobs.emit('drift', { dt });
    }

    // --- Scrap: press E to grab what's in reach ---
    const reach = scrap.inReach(car.position, SETTINGS.damage.pickupRadius);
    if (reach.length && !car.wrecked && playing) {
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
    } else if (playing && !car.wrecked) {
      // Other prompts: teleporter pads, the hangar, healing
      let prompt = '';
      if (tele?.onPad(car.currPos)) prompt = "[F] Teleport home to Doc's garage";
      else if (base?.onPad(car.currPos)) {
        const linked = REGIONS.filter((r) => progress.teleporters[r.id]);
        prompt = linked.length ? `[F] Teleport to ${linked[linked.length - 1].name}` : 'Teleporter pad (no teleporters linked yet)';
      } else if (base?.inHangar(car.currPos)) prompt = '[G] Open the garage';
      else if (healing) prompt = 'Healing… (hell magic)';
      hud.setPrompt(prompt);
    } else hud.setPrompt('');

    dust.update(dt);
    smoke.update(dt);
    sparks.update(dt);
    scrap.update(dt);
    souls.update(dt, car.position);
    projectiles.update(dt);
    hazards.update(dt, car.position, sparks);
    flames.update(dt);
    if (gate?.update(dt, car, sparks) && playing) {
      if (gate.leadsTo) travelTo(gate.leadsTo, 'spawn');
      else if (!gate.toldSealed) { gate.toldSealed = true; hud.toast('This Hellgate is sealed... for now (next update!)', 'warn'); }
    } else if (gate) gate.toldSealed = false;
    // On lava: warn, and say how protected the car is.
    if (car.onLava > 0 && car.grounded && !car.wrecked) {
      const fans = car.stats.fans || 0;
      const shield = Math.round(car.heatShield * 100);
      hud.lava(shield >= 100 ? 'Fully protected: the Hover Fans keep you cool' : `Burning! Heat protection ${shield}% (chassis ${Math.round((car.build.tier.heatResist || 0) * 100)}% · Hover Fans ${fans}/4)`);
    } else hud.lava(null);

    // --- Objective arrow: the Hellgate once it's open, else the boss arena ---
    const pointAt = (target, label) => {
      const to = target.clone().sub(car.position).setY(0);
      const camFwd = new THREE.Vector3();
      camera.getWorldDirection(camFwd);
      const angle = Math.atan2(camFwd.x * to.z - camFwd.z * to.x, camFwd.x * to.x + camFwd.z * to.z);
      hud.objective(`${label} · ${Math.round(to.length())} m`, angle);
    };
    if (boss?.awake && !SETTINGS.dev.noEnemies) hud.objective(null);
    else if (gate?.open) pointAt(gate.pos, gate.leadsTo ? `⛧ HELLGATE → ${gate.leadsTo.name.toUpperCase()}` : '⛧ HELLGATE (sealed)');
    else if (boss && boss.state !== 'dead' && !SETTINGS.dev.noEnemies) pointAt(boss.arenaCenter, `☠ ${boss.name.toUpperCase()}`);
    else hud.objective(null);
    // Second arrow: the nearest spot the tracked job wants you to go.
    beacons.update(dt);
    const spots = playing ? jobs.beacons().filter((b) => b.tracked) : [];
    if (spots.length) {
      const near = spots.reduce((a, b) => (Math.hypot(a.x - car.position.x, a.z - car.position.z) < Math.hypot(b.x - car.position.x, b.z - car.position.z) ? a : b));
      const to = new THREE.Vector3(near.x - car.position.x, 0, near.z - car.position.z);
      const camFwd = new THREE.Vector3();
      camera.getWorldDirection(camFwd);
      const angle = Math.atan2(camFwd.x * to.z - camFwd.z * to.x, camFwd.x * to.x + camFwd.z * to.z);
      hud.jobPointer(`◆ ${jobs.trackedJob.title.toUpperCase()} · ${Math.round(to.length())} m`, angle, near.color);
    } else hud.jobPointer(null);
    bullets.update(dt);
    gore.update(dt);
    stats.tick(dt);
    embers.update(dt, car.position);
    followPlayer(car.position);

    const driftAmount = car.grounded ? THREE.MathUtils.clamp((Math.abs(car.sidewaysSpeed) - 2) / 10, 0, 1) : 0;
    audio.update(Math.min(Math.abs(car.forwardSpeed) / SETTINGS.car.topSpeed, 1), car.throttle, driftAmount);
    hud.update(car, SETTINGS.car.topSpeed, dt, input.mouse);
    hud.combat(car, stats);

    lighting.update(dt, boss);
    lighting.render();
    input.endFrame();
    requestAnimationFrame(frame);
  }
  await lighting.precompile(); // build every shader now, not mid-game
  requestAnimationFrame(frame);
  showTitleScreen({ region, progress, onMenu: () => audio.start(), onStory: () => { radio.markSeen('intro'); return playIntro(); } }).then(async () => {
    // A brand new game starts with the story.
    if (progress.fresh && !radio.hasSeen('intro')) { radio.markSeen('intro'); await playIntro(); }
    startPlaying();
  });

  // Handy for debugging in the browser console.
  window.HELLDRIVERS = { dev, progress, souls, boss, projectiles, car, chase, lighting, SETTINGS, physics, scene, camera, demons, stats, garage, scrap, region, hazards, gate, travelTo, base, tele, radio, jobs, jobLog };
}

// A full-screen message with buttons (graphics trouble).
function showProblem(title, text, buttons) {
  document.getElementById('problem')?.remove();
  const el = document.createElement('div');
  el.id = 'problem';
  el.innerHTML = `<div><b>${title}</b><p>${text}</p><div class="pb-btns"></div></div>`;
  for (const [label, fn] of buttons) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = fn;
    el.querySelector('.pb-btns').appendChild(b);
  }
  document.body.appendChild(el);
}
const reloadOnLow = () => { setQuality('low'); location.reload(); };

main().catch((err) => {
  console.error(err);
  if (err.message === 'NO_WEBGL') {
    showProblem('YOUR BROWSER WON\'T DRAW 3D RIGHT NOW',
      'The browser refused to start WebGL (3D graphics). Usually one of these fixes it:<br>'
      + '• <b>Close the tab and reopen it</b>, or restart the browser (after a graphics crash, browsers turn 3D off until restart).<br>'
      + '• Close other tabs with games, maps or 3D in them.<br>'
      + '• Turn on <b>hardware acceleration</b> in the browser settings (Chrome: Settings → System → "Use graphics acceleration").<br>'
      + '• Try another browser (Chrome, Edge, Firefox, Safari).',
      [['TRY AGAIN', () => location.reload()], ['TRY AGAIN ON LOW GRAPHICS', reloadOnLow]]);
    return;
  }
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88;position:fixed;top:0;left:0;z-index:99">Failed to start: ${err.message}</pre>`);
});
