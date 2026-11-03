// =====================================================================
//  HELLDRIVERS — FEEL SETTINGS
// =====================================================================
//  Every number that changes how the game *feels* lives here.
//  Change a number, save the file, and the game reloads by itself.
//
//  Tip: press  T  in the game to open the live Tuning panel. You can drag
//  sliders while driving. Those changes are NOT saved, so when you find
//  values you like, copy them back into this file (or tell Claude).
//
//  Units: distances are in meters, speeds in meters per second
//  (1 m/s = 3.6 km/h), weights in kilograms.
// =====================================================================

export const SETTINGS = {
  // ---------------------------------------------------------------
  //  DEV / CREATIVE MODE (press C in the game to switch these)
  // ---------------------------------------------------------------
  dev: {
    noEnemies: false, // no demons, no boss
    noDamage: false,  // your car can't be hurt
    creative: false,  // free building: unlimited parts, all unlocked, free upgrades
  },

  // ---------------------------------------------------------------
  //  CAR: power, speed and weight
  // ---------------------------------------------------------------
  car: {
    // How heavy the bare car is (kg), before any parts you bolt on.
    // Heavier = slower to speed up, slower to turn, harder to stop, and
    // hits harder when ramming.
    mass: 1200,

    // Engine push. Bigger = faster acceleration.
    // Acceleration is roughly enginePower / mass, so a heavier car with the
    // same engine feels slower. That's the weight tradeoff.
    enginePower: 15000,

    // Top speed going forward (m/s). 40 m/s = 144 km/h.
    topSpeed: 40,

    // Top speed in reverse (m/s).
    reverseSpeed: 13,

    // How hard the brakes bite (S while moving forward).
    brakePower: 26000,

    // How quickly the car slows down when you let go of the gas.
    // 0 = coasts forever, bigger = stops sooner.
    coastSlowdown: 0.5,

    // Extra drag from weight. Makes heavy builds lose a bit of top speed.
    rollingResistance: 0.03,

    // Gravity strength. Real Earth is 9.8. Games often use more so the car
    // feels planted and lands quickly. (This is Hell. Gravity is rude.)
    gravity: 22,
  },

  // ---------------------------------------------------------------
  //  STEERING
  // ---------------------------------------------------------------
  steering: {
    // How fast the car can spin around when steering.
    // Bigger = sharper, twitchier turning.
    turnRate: 2.3,

    // How quickly the steering wheel moves to full lock when you press A/D.
    // Bigger = more instant, smaller = smoother/lazier.
    steerSpeed: 6,

    // At top speed, steering is reduced by this fraction so you don't
    // spin out from a tiny tap. 0 = no reduction, 0.6 = 60% less at top speed.
    highSpeedReduction: 0.55,

    // Speed (m/s) needed before you get full steering. Below this you turn
    // less, like a real car that can't spin in place.
    fullSteerSpeed: 7,

    // How much weight slows down turning. 0 = weight doesn't matter,
    // 1 = double the weight means half the turn speed.
    weightTurnPenalty: 0.6,

    // The "normal" car weight that the penalty above is measured against.
    referenceMass: 1200,
  },

  // ---------------------------------------------------------------
  //  GRIP & DRIFTING
  // ---------------------------------------------------------------
  grip: {
    // How strongly the tires resist sliding sideways (m/s² of sideways
    // force the tires can hold). Bigger = more "on rails".
    // Smaller = slides and drifts more easily in fast turns.
    tireGrip: 30,

    // When holding SPACE (handbrake), grip is multiplied by this.
    // Smaller = big, loose drifts.
    handbrakeGrip: 0.4,

    // Handbrake also slows you down a bit (how much).
    handbrakeDrag: 0.6,

    // While sliding, a bit of the sideways speed is turned back into forward
    // speed so drifts keep momentum. 0 = none, 1 = lots.
    driftCarry: 0.35,

    // Sideways speed (m/s) above which we call it a drift (dust + sound).
    driftThreshold: 4,
  },

  // ---------------------------------------------------------------
  //  BODY WOBBLE (visual only, makes weight feel real)
  // ---------------------------------------------------------------
  body: {
    // How much the body leans in turns (degrees at max).
    roll: 6,
    // How much the nose dips when braking / lifts when accelerating.
    pitch: 3.5,
    // How springy the wobble is. Bigger = stiffer, settles faster.
    stiffness: 9,
  },

  // ---------------------------------------------------------------
  //  CAMERA
  // ---------------------------------------------------------------
  camera: {
    // How far behind the car the camera sits (m).
    distance: 11,
    // How high above the car the camera sits (m).
    height: 4.6,
    // Camera pulls back by this much extra at top speed (m).
    speedPullback: 3.5,
    // How quickly the camera swings around to follow the car's direction.
    // Smaller = lazier, more cinematic. Bigger = locked behind the car.
    followSpeed: 4.5,
    // Field of view (zoom) when stopped and at top speed. Widening at
    // speed makes going fast feel fast.
    fov: 62,
    fovAtTopSpeed: 76,
    // Mouse wheel zoom limits (multiplier on distance).
    minZoom: 0.6,
    maxZoom: 2.0,
  },

  // ---------------------------------------------------------------
  //  GUN TURRET
  // ---------------------------------------------------------------
  // The HELL TANK's main cannon (and the Hell Cannon part) fire these.
  cannonShell: { damage: 30, fireRate: 1.6, bulletSpeed: 110, range: 160, spread: 0.6, splash: 3.5 },

  turret: {
    // How fast the turret swings toward your mouse (bigger = snappier).
    turnSpeed: 12,
    // Shots per second when holding the mouse button.
    fireRate: 8,
    // Damage per bullet. An imp has 40 health, so 5 = 8 bullets (~1 s).
    // Started balanced with ramming (same "damage per minute"), then nudged
    // up a bit after play-testing. Watch the DPM meter (top right) to compare.
    damage: 5,
    // Bullet speed (m/s) and how far bullets fly (m).
    bulletSpeed: 160,
    range: 140,
    // Random inaccuracy in degrees. 0 = laser-perfect.
    spread: 1.2,
  },

  // ---------------------------------------------------------------
  //  RAMMING
  // ---------------------------------------------------------------
  ramming: {
    // Hitting a demon at this speed (km/h) with a normal-weight car does
    // exactly enough damage to splat an imp. Faster = more damage.
    // Heavier cars hit harder, so they splat at lower speeds.
    splatSpeedKmh: 40,
    // How much the car slows down per demon it plows through
    // (fraction of demon weight vs car weight). 0 = none.
    momentumLoss: 1.0,
    // Damage a normal-weight car does hitting a demon at the splat speed.
    ramPower: 40,
    // Camera shake on a splat. 0 = none.
    shake: 0.35,
    // Seconds between ram kills that still count toward a SPLAT combo.
    comboTime: 1.5,
  },

  // ---------------------------------------------------------------
  //  BUILDER (press G for the garage)
  // ---------------------------------------------------------------
  build: {
    // Most parts allowed on one vehicle (keeps the game smooth).
    maxParts: 40,
    // true = build with unlimited free parts (no stock counts).
    unlimitedParts: false,
    // The parts you start the game with in your stock.
    startingKit: { armor: 4, spike: 4, gun: 1 },
    // How strongly front/back weight changes handling. 0 = not at all.
    //  Nose-heavy  -> understeer (turns wider, more stable)
    //  Tail-heavy  -> oversteer (tail slides out more easily)
    balanceEffect: 1.0,
  },

  // Every part: weight (kg), hit points (hp) and what it does.
  parts: {
    armor:   { mass: 60,  hp: 140 },                // tough block that soaks up hits
    spike:   { mass: 25,  hp: 50,  ramBonus: 0.3 }, // +30% ram damage on the side it faces
    plow:    { mass: 120, hp: 160, ramBonus: 0.7 }, // +70% ram damage on the side it faces
    gun:     { mass: 80,  hp: 60 },                 // one more gun that fires with your main gun
    booster: { mass: 40,  hp: 50,  power: 3500, topSpeed: 2.5 }, // more engine push and top speed (m/s)
    weight:  { mass: 250, hp: 220 },                // just heavy. Hits harder, handles worse.
    heavyArmor: { mass: 140, hp: 380 },             // a slab of hell-forged steel
    saw:     { mass: 60,  hp: 90,  ramBonus: 1.2 }, // spinning blade: +120% ram damage on its side
    cannon:  { mass: 160, hp: 120 },                // big gun: slow, hard-hitting, explosive shells
    hoverFan: { mass: 50, hp: 70 },                 // blows lava away: less lava burn and drag (see "lava")
    pontoon:  { mass: 40, hp: 60 },                 // a float: keeps you up in deep water (see "water")
    mudTire:  { mass: 45, hp: 80 },                 // a fat paddle tire: less stuck in blood-mud (see "mud")
    spikeTire: { mass: 45, hp: 80 },                // a studded tire: grip on ice (see "ice")
    heater:   { mass: 70, hp: 70 },                 // keeps the engine warm (see "cold")
    jammer:   { mass: 35, hp: 50 },                 // radar jammer: turrets miss more (see "foundry")
    degausser: { mass: 60, hp: 70 },                // shields you from the magnets (see "foundry")
    jumpJet:  { mass: 45, hp: 60 },                 // thrust, lift and steering in the AIR (see "canyon")
  },

  // ---------------------------------------------------------------
  //  PROGRESSION: souls, the shop, and the car-to-tank upgrades
  // ---------------------------------------------------------------
  progression: {
    // Souls each demon drops. Ram kills pay extra (ramBonus x).
    souls: { imp: 2, hound: 2, spiker: 5, spitter: 4, brute: 25, fireImp: 3, magmaBrute: 35, boneRam: 8, boneArcher: 6, drowned: 4, bloater: 10, leech: 1, mireToad: 12, eggSac: 6, frostWraith: 4, frostBrute: 40, ironHusk: 12, harpy: 6 },
    // (boss souls are with each boss, under "bosses")
    ramBonus: 1.5,
    // Getting wrecked restarts the run. true = keep souls, unlocks and
    // chassis upgrades across wrecks anyway.
    keepOnWreck: false,
  },

  // What parts cost in the garage. "unlock" = one-time souls to unlock
  // the part (0 = available from the start), "price" = souls per part.
  shop: {
    armor:      { unlock: 0,   price: 20 },
    spike:      { unlock: 0,   price: 15 },
    gun:        { unlock: 0,   price: 60 },
    weight:     { unlock: 80,  price: 25 },
    plow:       { unlock: 150, price: 50 },
    booster:    { unlock: 200, price: 50 },
    saw:        { unlock: 300, price: 80 },
    heavyArmor: { unlock: 350, price: 60 },
    hoverFan:   { unlock: 250, price: 60 },
    pontoon:    { unlock: 400, price: 70 },
    mudTire:    { unlock: 500, price: 70 },
    spikeTire:  { unlock: 600, price: 70 },
    heater:     { unlock: 600, price: 80 },
    jammer:     { unlock: 700, price: 80 },
    degausser:  { unlock: 700, price: 90 },
    jumpJet:    { unlock: 800, price: 90 },
    cannon:     { unlock: 500, price: 150 },
  },

  // The car-to-tank upgrade path, in order. Each tier multiplies the base
  // car's numbers. cost = souls to upgrade to it.
  //   hp: body toughness   power/topSpeed: engine   grip: less sliding
  //   turn: steering       turnInPlace: can spin on the spot (treads)
  //   heatResist: how much less lava burns you (0.4 = 40% less)
  //   maxClimb: steepest slope (degrees) it can drive up; steeper = slides back
  //   sinks: too heavy to float, even with Pontoons (treads)
  chassisTiers: [
    { id: 'car',      name: 'Muscle Car',   cost: 0,    massAdd: 0,    hp: 1.0, power: 1.0,  topSpeed: 1.0,  grip: 1.0, turn: 1.0,  turnInPlace: false, heatResist: 0,   maxClimb: 20 },
    { id: 'armored',  name: 'Armored Car',  cost: 400,  massAdd: 350,  hp: 1.6, power: 1.3,  topSpeed: 0.97, grip: 1.0, turn: 1.0,  turnInPlace: false, heatResist: 0.4, maxClimb: 23 },
    { id: 'halftrack',name: 'Half-Track',   cost: 1200, massAdd: 900,  hp: 2.4, power: 1.8,  topSpeed: 0.9,  grip: 1.35, turn: 1.1,  turnInPlace: false, heatResist: 0.5, maxClimb: 33, sinks: true },
    { id: 'tank',     name: 'HELL TANK',    cost: 2800, massAdd: 2000, hp: 3.5, power: 2.6,  topSpeed: 0.75, grip: 1.8, turn: 1.25, turnInPlace: true,  heatResist: 0.6, maxClimb: 42, sinks: true },
  ],

  // ---------------------------------------------------------------
  //  HILLS (Bone Mountains and later)
  // ---------------------------------------------------------------
  slopes: {
    pull: 0.8,   // how much hills slow you going up / speed you up going down
    slide: 0.9,  // how hard you slide back down a slope too steep for your tires
  },

  // ---------------------------------------------------------------
  //  LAVA (rivers in the Lava Rivers, and pools the Magma Colossus spits)
  // ---------------------------------------------------------------
  // Driving on lava sets the bottom of your car on fire and bogs you down.
  // Protection: a better chassis (heatResist above) and Hover Fan parts.
  lava: {
    burnDps: 16,      // damage per second to EACH piece touching the lava
    afterBurn: 1.5,   // pieces keep burning this long after you get out (s)
    speedFactor: 0.3, // top speed while on lava (0.3 = 30% of normal)
    fanShield: 0.25,  // each Hover Fan blocks this much burn AND drag (4 fans = immune)
  },

  // ---------------------------------------------------------------
  //  WATER (the Flooded City's canals and lakes)
  // ---------------------------------------------------------------
  // Shallow water slows you down. Deep water floods the engine: you sink to
  // the bottom, crawl, and the low parts of the car take damage... unless
  // you've bolted on enough Pontoon floats: then you float and paddle along
  // like a (slow, slidey) boat. Treads are too heavy to float: Half-Tracks
  // and HELL TANKS always sink.
  water: {
    deep: 0.9,           // water deeper than this (m) is "deep"
    shallowSpeed: 0.6,   // top speed wading through shallow water (0.6 = 60%)
    sinkSpeed: 0.25,     // top speed sunk on the bottom
    floodDps: 9,         // damage per second to EACH low piece while sunk
    pontoonFloat: 0.5,   // each Pontoon gives this much float (2 = floating)
    floatSpeed: 0.55,    // top speed while floating
    floatGrip: 0.3,      // sideways grip while floating (low = slides like a boat)
    floatDraft: 0.3,     // how low the car sits in the water when floating (m)
  },

  // ---------------------------------------------------------------
  //  BLOOD-MUD (the Blood Swamp)
  // ---------------------------------------------------------------
  // The mud grabs HEAVY builds: the heavier your car (body + chassis +
  // parts), the slower you go and the deeper you sink. Light builds skim
  // across. Mud Tire parts cut the stickiness (4 = barely notice it).
  mud: {
    lightMass: 1500,   // at or under this weight (kg) the mud hardly slows you
    heavyMass: 3800,   // at or over this weight you're as stuck as it gets
    stuckSpeed: 0.15,  // top speed when fully stuck (0.15 = 15%)
    drag: 0.15,        // even light builds lose this much top speed in deep mud
    sink: 0.6,         // how deep a fully stuck car sinks (m)
    grip: 0.7,         // sideways grip in mud (lower = slides)
    tireBonus: 0.25,   // each Mud Tire removes this much of the stickiness
  },

  // ---------------------------------------------------------------
  //  ICE and COLD (Ice Hell)
  // ---------------------------------------------------------------
  // Ice sheets have hardly any grip: you slide, drift and brake forever.
  // Spiked Tires give the grip back (each one: a quarter; 4 = full grip).
  ice: {
    grip: 0.16,        // sideways grip on sheer ice (1 = normal)
    brake: 0.25,       // braking power on ice
    traction: 0.5,     // how much engine push actually reaches the ice (wheelspin)
    coast: 0.2,        // how much you slow down when you let go of the gas
    spikeBonus: 0.25,  // each Spiked Tire gives back this much grip
  },
  // The cold slowly freezes your engine: less power and top speed. Driving
  // fast keeps it warm; crawling or sitting still freezes it. Heater parts
  // slow the freezing down (each one: 30%), teleporter fields thaw you out.
  cold: {
    buildup: 0.03,     // how fast it freezes (per second): ~30 s from warm to frozen
    warmup: 0.06,      // how fast driving at full speed warms it back up
    heaterShield: 0.3, // each Heater blocks this much of the freezing
    power: 0.6,        // engine power lost when fully frozen
    topSpeed: 0.35,    // top speed lost when fully frozen
  },

  // ---------------------------------------------------------------
  //  THE IRON FOUNDRY'S MACHINERY
  // ---------------------------------------------------------------
  foundry: {
    turretRange: 75,     // gun towers shoot at you this close (m)
    turretDamage: 7,     // per shell
    turretInterval: 0.35, // seconds between shells in a burst
    turretBurst: 4,      // shells per burst
    turretPause: 2.2,    // seconds between bursts
    turretMiss: 1.2,     // how far off their shells land anyway (m)
    jammerMiss: 3,       // each Radar Jammer adds this much miss (m)
    turretHp: 220,
    turretSouls: 15,     // souls for blowing one up
    crusherDamage: 45,   // caught under a crusher (x1.5)
    cartDamage: 25,      // hit by a runaway ore cart
    cartSpeed: 11,       // m/s
    magnetOn: 4,         // seconds a magnet pulls...
    magnetOff: 3.5,      // ...and rests
    magnetPull: 5,       // how hard it pulls a bare car (m/s)
    magnetPerPart: 0.3,  // extra pull per bolted-on part (metal!)
    degausserShield: 0.5, // each Degausser blocks this much pull (2 = immune)
  },

  // ---------------------------------------------------------------
  //  SCREAMING CANYON
  // ---------------------------------------------------------------
  canyon: {
    fallDepth: -12,      // fall below this height (down a chasm) and you're wrecked
    windEvery: [7, 13],  // seconds between screaming gusts (random in this range)
    windTime: 2.5,       // how long a gust blows
    windPush: 6,         // how hard it shoves you sideways (m/s)
    windAirMult: 2.2,    // ...and how much harder while you're in the air
    slideEvery: [8, 14], // seconds between rockslides
    boulderDamage: 35,   // a boulder rolling into you
  },
  // Jump Jets: each one, while you're in the air, pushes you forward
  // (thrust, m/s per second, when you hold the gas), holds you up (lift: a
  // share of gravity) and lets you steer. Stack a few for long jumps.
  jets: { thrust: 9, lift: 0.15, steer: 0.8 },

  // The car's own body sections: hit points and weight (kg). When one
  // breaks off it drops as that actual piece: pick it up (E) and put it
  // back in the garage, or bolt it on somewhere it doesn't belong.
  // The cabin is where you sit: if it's destroyed, you're wrecked.
  chassis: {
    cabin:  { hp: 220, mass: 450 },
    nose:   { hp: 110, mass: 200 },
    tail:   { hp: 110, mass: 200 },
    doorL:  { hp: 90,  mass: 90 },
    doorR:  { hp: 90,  mass: 90 },
    bumper: { hp: 80,  mass: 90 },
  },

  // ---------------------------------------------------------------
  //  DAMAGE, SCRAP & REPAIR
  // ---------------------------------------------------------------
  damage: {
    // Crashing into rocks: speed lost in one hit (m/s) before it hurts.
    crashMinSpeed: 7,
    // Damage per m/s of crash speed above that.
    crashDamage: 9,
    // Pieces below this fraction of their hp smoke and spark.
    smokeBelow: 0.4,
    // Press E to grab scrap within this distance (m).
    pickupRadius: 8,
    // You can't open the garage with demons this close (m).
    garageSafeRadius: 40,
    // Seconds before you respawn after being wrecked.
    respawnDelay: 2.5,
  },

  // ---------------------------------------------------------------
  //  DEMONS
  // ---------------------------------------------------------------
  // Each demon: health, weight (kg), chase speed (m/s; 11 m/s = 40 km/h),
  // how close you get before it notices you (m), claw/bite damage and
  // seconds between attacks, and how many come in a pack.
  // Ramming: hitting a demon at the splat speed with a normal car does
  // ramming.ramPower damage (40). Twice as fast = 4x the damage.
  //   imp 40 hp = splats at 40 km/h; brute 450 hp = needs a LOT more.
  demons: {
    // Most demons alive at once (performance cap).
    maxActive: 100,
    // Demons farther than this from you vanish and new packs appear (m).
    despawnDistance: 260,
    // Strolling speed when they haven't noticed you.
    wanderSpeed: 2.2,

    // Small swarmers. Run them over.
    imp:     { health: 40,  mass: 60,  chaseSpeed: 8,   noticeRange: 75, attackDamage: 3,  attackInterval: 1.0, packMin: 6, packMax: 14 },
    // Fast pack hunters: faster than the splat speed, but fragile.
    hound:   { health: 20,  mass: 45,  chaseSpeed: 15,  noticeRange: 110, attackDamage: 2, attackInterval: 0.6, packMin: 3, packMax: 6 },
    // Covered in bone spikes: ramming it hurts YOUR car (thornDamage).
    spiker:  { health: 70,  mass: 120, chaseSpeed: 5,   noticeRange: 60, attackDamage: 6,  attackInterval: 1.5, packMin: 2, packMax: 5, thornDamage: 18 },
    // Lobs fireballs from range and runs away if you get close.
    spitter: { health: 30,  mass: 50,  chaseSpeed: 6.5, noticeRange: 90, attackDamage: 11, attackInterval: 2.6, packMin: 2, packMax: 4,
               shootRange: 50, preferredRange: 30, fleeRange: 15, splash: 3 },
    // Huge and heavy: you bounce off unless you hit it very hard.
    brute:   { health: 450, mass: 700, chaseSpeed: 4.5, noticeRange: 60, attackDamage: 22, attackInterval: 2.2, packMin: 1, packMax: 2 },
    // LAVA RIVERS
    // Imps on fire: their claws set the piece they hit burning (burnDps for burnTime s).
    fireImp: { health: 35,  mass: 55,  chaseSpeed: 9,   noticeRange: 80, attackDamage: 2,  attackInterval: 1.0, packMin: 6, packMax: 12, burnDps: 6, burnTime: 3 },
    // A walking volcano: burning punches, and ramming it sets your front on fire.
    magmaBrute: { health: 600, mass: 900, chaseSpeed: 4.2, noticeRange: 60, attackDamage: 24, attackInterval: 2.4, packMin: 1, packMax: 2, burnDps: 10, burnTime: 4 },
    // BONE MOUNTAINS
    // Charges when it gets close: chargeBoost x speed for ~1 s, then a hard shove.
    boneRam: { health: 110, mass: 220, chaseSpeed: 9, noticeRange: 90, attackDamage: 14, attackInterval: 1.6, packMin: 2, packMax: 4,
               chargeBoost: 2.4, chargeCooldown: 4, chargeShove: 9 },
    // Throws bone spears (flat and fast) from range, backs off if you get close.
    boneArcher: { health: 45, mass: 50, chaseSpeed: 6, noticeRange: 110, attackDamage: 14, attackInterval: 2.2, packMin: 2, packMax: 4,
                  shootRange: 70, preferredRange: 40, fleeRange: 18, splash: 1.5, projectile: 'boneSpear' },
    // FLOODED CITY
    // Waterlogged dead: slow, tough for their size, come in big shambling hordes (and wade through water).
    drowned: { health: 60, mass: 70, chaseSpeed: 5.5, noticeRange: 70, attackDamage: 5, attackInterval: 1.2, packMin: 8, packMax: 16 },
    // Swollen gas-bag: waddles up and POPS next to you. Killing it pops it too,
    // so shoot it from afar: ramming one blows up in your face.
    // SCREAMING CANYON
    // Flying hags: circle up high, then swoop down and RIP A PART OFF your car (grab).
    harpy: { health: 40, mass: 30, chaseSpeed: 15, noticeRange: 130, attackDamage: 8, attackInterval: 2.6, packMin: 3, packMax: 6, flyHeight: 8, grab: true },
    // IRON FOUNDRY
    // Half demon, half machine: armored, a furnace in its gut, a claw and a pipe for arms.
    ironHusk: { health: 160, mass: 260, chaseSpeed: 7, noticeRange: 80, attackDamage: 12, attackInterval: 1.4, packMin: 2, packMax: 5 },
    // ICE HELL
    // A hooded ghost of frost: fast, and its touch chills your engine (chill = cold added per hit).
    frostWraith: { health: 35, mass: 40, chaseSpeed: 13, noticeRange: 95, attackDamage: 4, attackInterval: 0.9, packMin: 4, packMax: 8, chill: 0.06 },
    // A huge shaggy horned brute of the ice: solid, and its punches chill you too.
    frostBrute: { health: 650, mass: 950, chaseSpeed: 5, noticeRange: 70, attackDamage: 26, attackInterval: 2.2, packMin: 1, packMax: 2, chill: 0.12 },
    // BLOOD SWAMP (bloater is above)
    // Swarms of fat blood leeches: fast, fragile, nibble constantly.
    leech: { health: 15, mass: 20, chaseSpeed: 12, noticeRange: 70, attackDamage: 1.5, attackInterval: 0.45, packMin: 8, packMax: 16 },
    // Squats in the mud and spits globs of blood at you.
    mireToad: { health: 80, mass: 160, chaseSpeed: 4, noticeRange: 100, attackDamage: 16, attackInterval: 2.4, packMin: 1, packMax: 3,
                shootRange: 60, preferredRange: 32, fleeRange: 12, splash: 3, projectile: 'bloodGlob' },
    // The Bog Mother's eggs: don't move, hatch into Mire Toads after hatchTime s. Shoot or ram them first!
    eggSac: { health: 60, mass: 400, chaseSpeed: 0, noticeRange: 0, attackDamage: 0, attackInterval: 99, packMin: 1, packMax: 1,
              hatchTime: 9, hatches: 'mireToad', hatchCount: 2 },
    bloater: { health: 40, mass: 90, chaseSpeed: 6.5, noticeRange: 80, attackDamage: 0, attackInterval: 1, packMin: 1, packMax: 3,
               popDamage: 45, popRadius: 7 },
  },

  // ---------------------------------------------------------------
  //  BOSSES (one per region)
  // ---------------------------------------------------------------
  bosses: {
    // Ash Plains: a 9 m giant asleep in a ring of bones.
    ashTitan: {
      health: 2500,
      walkSpeed: 4.5,
      enragedSpeed: 6.5,      // below half health it gets angry and faster
      slamDamage: 45,         // fist slam when you're close
      slamRadius: 5,
      slamBurn: 0,            // (sets the hit piece on fire: damage/s)
      stompDamage: 25,        // shockwave ring: get far away or get hit
      stompRadius: 32,
      throwDamage: 35,        // thrown boulders when you're far
      throwSplash: 4,
      // If you drive this far from the arena center it gives up and heals.
      leash: 150,
      souls: 600,
    },
    // Lava Rivers: a basalt giant on an island in a lake of lava.
    magmaColossus: {
      health: 4000,
      walkSpeed: 4.2,
      enragedSpeed: 6.2,
      slamDamage: 55,
      slamRadius: 6,
      slamBurn: 10,
      stompDamage: 30,
      stompRadius: 36,
      throwDamage: 30,        // lava bombs...
      throwSplash: 5,
      poolRadius: 7,          // ...that leave a pool of burning lava (m)
      poolTime: 10,           // for this many seconds
      leash: 170,
      souls: 1000,
    },
    // Bone Mountains: a skeleton giant on the highest plateau.
    boneKing: {
      health: 5200,
      walkSpeed: 4.6,
      enragedSpeed: 7,
      slamDamage: 60,
      slamRadius: 6,
      slamBurn: 0,
      stompDamage: 32,
      stompRadius: 38,
      throwDamage: 40,        // throws giant bone boulders
      throwSplash: 5,
      leash: 180,
      souls: 1500,
    },
    // Flooded City: a sea serpent in the drowned plaza. It surfaces near
    // you, spits water, slams its head down, then dives and comes up
    // somewhere else. Only its head and neck can be hit (and only when up).
    // Blood Swamp: a giant bloated hag-toad squatting in a pool of blood.
    // Her tongue grabs your car and reels it in; she belches up leeches
    // and lays egg sacs that hatch into Mire Toads.
    // Ice Hell: a giant three-faced demon frozen up to its waist in a
    // glacier. Fist smashes up close, lines of ice spikes racing along the
    // ground, and a freezing breath that shoves you and freezes your engine.
    frozenWarden: {
      health: 8500,
      slamDamage: 60,          // fist smash
      slamRadius: 7,
      stompDamage: 30,         // the shock ring from a smash
      stompRadius: 42,
      spikeDamage: 30,         // ice spikes erupting under you
      spikeSpeed: 32,          // how fast a spike line races toward you (m/s)
      breathRange: 85,         // freezing breath reach (m)
      breathPush: 7,           // how hard it shoves you (m/s)
      breathChill: 0.3,        // cold added per second in the breath
      leash: 220,
      souls: 3600,
    },
    // Iron Foundry: a giant demon-powered war machine. Walks like the
    // others, stomps, slams, fires missile volleys, and flamethrowers you
    // up close.
    ironColossus: {
      health: 9500,
      walkSpeed: 4.0,
      enragedSpeed: 6.0,
      slamDamage: 55,
      slamRadius: 6,
      slamBurn: 0,
      stompDamage: 32,
      stompRadius: 40,
      throwDamage: 26,        // each missile
      throwSplash: 5,
      flameRange: 26,         // flamethrower reach (m)
      flameDps: 14,           // fire damage per second to what it hits
      leash: 200,
      souls: 4500,
    },
    // Screaming Canyon: a giant winged hag. Circles, swoops to rip parts off
    // your car, shrieks shockwaves, calls flocks, perches on spires.
    harpyQueen: {
      health: 9000,
      swoopDamage: 30,        // when her swoop catches you (and she rips a part off)
      swoopSpeed: 38,         // m/s
      shriekDamage: 25,       // the shockwave of her shriek
      shriekRadius: 45,
      leash: 220,
      souls: 5200,
    },
    bogMother: {
      health: 7000,
      tongueRange: 55,        // how far her tongue reaches (m)
      tonguePull: 14,         // how hard it reels you in (m/s)
      tongueTime: 1.6,        // seconds it holds on (shoot her to make her let go!)
      chompDamage: 60,        // if she reels you all the way in
      slamDamage: 35,         // belly flop: a wave of blood rolling outward
      stompRadius: 38,
      throwDamage: 22,        // spat blood globs
      throwSplash: 4,
      eggs: 3,                // egg sacs per clutch
      leash: 200,
      souls: 2800,
    },
    leviathan: {
      health: 6000,
      biteDamage: 55,         // head slam/bite when you're close to it
      slamRadius: 7,
      stompDamage: 30,        // the wave from a slam: get far away or get hit
      stompRadius: 40,
      throwDamage: 28,        // water bolts
      throwSplash: 4,
      upTime: 9,              // seconds above water before it dives
      downTime: 3.5,          // seconds under water (can't be hit)
      leash: 200,
      souls: 2200,
    },
  },
};
