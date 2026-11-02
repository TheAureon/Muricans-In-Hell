// =====================================================================
//  THE STORY: every line of text lives here, so it's easy to change.
// =====================================================================
//  Names are placeholders: change them here and they change everywhere.
//
//  The story so far: gas got too expensive. A retired F1 champion (and
//  ex-soldier) and his genius engineer friend figured the biggest untapped
//  oil field in existence has to be in Hell. The friend built a machine
//  that rips holes in reality, they drove through, and set up a walled base
//  with a garage in the Ash Plains. Teleporters run on hell magic, so they
//  only work where there's a source of it; standing in one's field heals
//  you completely.
//
//  (Respawning after a wreck is just the game: think of it as being sent
//  back in time. Nobody in the story knows that happens.)
// =====================================================================

export const CAST = {
  you: { name: 'HANK', full: 'Hank "Redline" Mercer', color: '#ffb070', voice: { pitch: 0.7, rate: 1.0 } },
  doc: { name: 'DOC', full: 'Dr. Wendell "Doc" Pike', color: '#7fd8ff', voice: { pitch: 1.25, rate: 1.08 } },
};

// The intro, shown once when you start a new game (and from the menu: STORY).
// art: which little picture to draw (see intro.js).
export const INTRO = [
  {
    art: 'gas',
    title: 'REGULAR: $14.99 / GALLON',
    text: 'The year gas hit fifteen bucks a gallon, Hank "Redline" Mercer (retired F1 champion, ex-military, full-time menace) could no longer afford his favorite hobby: driving extremely fast.',
  },
  {
    art: 'doc',
    title: 'DR. WENDELL "DOC" PIKE',
    text: 'His oldest friend, a brilliant engineer with no sense of self-preservation, had a theory.',
    quote: { who: 'doc', line: '"Where\'s the biggest untapped oil field in the universe, Hank? Somewhere very... very... hot."' },
  },
  {
    art: 'tear',
    title: 'THE REALITY RIPPER',
    text: 'Doc built a machine that tears holes in reality. Every hole leads to the same place.',
    quote: { who: 'you', line: '"Is it safe?"  "Define safe."' },
  },
  {
    art: 'car',
    title: 'SO THEY DROVE INTO HELL',
    text: 'Hank loaded up the muscle car. Doc loaded up everything else.',
  },
  {
    art: 'base',
    title: 'THE BASE',
    text: 'In the Ash Plains they built a garage, a teleporter pad, and walls. Big walls. Demons hate walls.',
    quote: { who: 'doc', line: '"Bring me souls and scrap. I\'ll turn them into car parts. Hell parts. Hell car parts."' },
  },
  {
    art: 'go',
    title: 'NOW FIND THE OIL',
    text: 'And run over everything between here and there.',
  },
];

// Radio chatter during play. Each plays once (ever). Lines are said in
// order; who = 'doc' or 'you'.
export const RADIO = {
  start: [
    ['doc', 'Comms check. Walls are up, the garage is warm. Drive into the hangar any time and press G to build.'],
    ['you', 'Copy. Going oil hunting.'],
  ],
  leaveBase: [['doc', 'You\'re outside the walls. Everything out there wants to eat you. Run it over first.']],
  firstKill: [['you', 'Splat.'], ['doc', 'Ram them at forty plus. Physics works down here too. Mostly.']],
  firstSouls: [['doc', 'Those blue wisps are souls. Hell\'s money, apparently. They go straight in the bank. Spend them in the garage.']],
  firstLoss: [['doc', 'You\'re shedding parts! Press E to grab the scrap. I can bolt it back on at base.']],
  nearTitan: [['doc', 'Huge heat signature dead ahead. Something big is sleeping in that ring of bones.']],
  titanAwake: [['you', 'It\'s awake.'], ['doc', 'Then put it back to sleep. Permanently.']],
  titanDead: [
    ['doc', 'It\'s down! And... whoa. The readings around the arena just went crazy. A portal just opened. That leads deeper.'],
    ['you', 'Deeper is where the oil is.'],
  ],
  wrecked: [['doc', 'Hank? You there? Weird. I could have sworn I just heard you explode. Anyway, the car\'s ready.']],
  lavaArrive: [
    ['doc', 'Lava Rivers. Do not drive on the lava. I mean it. Armored chassis, Hover Fans, or both.'],
    ['you', 'And the garage?'],
    ['doc', 'Too far. But I\'m picking up hell magic out there somewhere. Find the source and I can lock a teleporter onto it.'],
  ],
  firstLava: [['you', 'The car is on fire. The car is ON FIRE.'], ['doc', 'GET OFF THE LAVA.']],
  teleporterHint: [['doc', 'Look for a purple light in the sky. That\'s the hell-magic source. The teleporter field should patch you up, too.']],
  teleporterFound: [
    ['doc', 'Got it! Teleporter locked. Stay in the field and it\'ll heal you right up.'],
    ['doc', 'Press F on the pad to come home to the garage. I set up the pad at base too.'],
  ],
  nearColossus: [['doc', 'Big one on the island. Lava moat all the way around. No bridges. Fun.']],
  colossusDead: [['doc', 'Did... did it just talk?'], ['you', 'Sounded tired.'], ['doc', 'Same, buddy. Same.']],
  noOil: [['you', 'Still no oil.'], ['doc', 'Deeper. It\'s always deeper.']],
  boneArrive: [
    ['doc', 'Bone Mountains. Real hills, finally. Uphill slows you, downhill... does not.'],
    ['doc', 'Wheels slide back down the steep stuff. Treads can climb it. Keep that in mind.'],
  ],
  firstSlip: [['you', 'We\'re sliding backwards!'], ['doc', 'Too steep for tires. Treads, Hank. TREADS.']],
  nearBoneKing: [['doc', 'Big reading on that plateau. Something up there is... assembling itself.']],
  boneKingAwake: [['you', 'It\'s a skeleton. A huge one. With a crown.'], ['doc', 'Aim for the crown. Or the everything.']],
  boneKingDead: [['you', 'Still no oil.'], ['doc', 'I\'m starting to think Hell has a very deep oil field.']],
  floodArrive: [
    ['you', 'Doc. There\'s a city down here. A whole drowned city.'],
    ['doc', 'Fascinating. And the streets are canals. Deep ones. The car does NOT swim, Hank.'],
    ['doc', 'Bolt on two Pontoons and you\'ll float. Treads are too heavy: you\'ll sink like a brick. Use the bridges.'],
  ],
  firstWade: [['you', 'Water\'s getting in the doors.'], ['doc', 'Shallow is fine. Deep is not. Stay out of the middle of those canals.']],
  firstSink: [['doc', 'Hank, you\'re UNDER the water! The engine is flooding, get out of there!'], ['you', 'Glub.']],
  firstFloat: [['you', 'We\'re floating! I\'m a boat!'], ['doc', 'You\'re a very bad boat. Steer early, it slides.']],
  nearLeviathan: [['doc', 'Something enormous is moving under that plaza. Sonar says... long. Very long.']],
  leviathanAwake: [['you', 'SEA SERPENT. SEA SERPENT, DOC.'], ['doc', 'Shoot it when it\'s up. When it dives, keep moving!']],
  swampArrive: [
    ['you', 'The pipe goes into a swamp. A swamp of... is that blood?'],
    ['doc', 'Blood-mud. It grabs anything heavy. The bigger your build, the more it sucks you in.'],
    ['doc', 'Go light, or bolt on Mud Tires. Or stay on the boardwalks, somebody built those for a reason.'],
  ],
  firstStuck: [['you', 'I\'m stuck. I\'m STUCK, Doc.'], ['doc', 'You\'re too heavy! Lose some armor or get Mud Tires. Or find a boardwalk.']],
  nearBogMother: [['doc', 'Big heat signature in that pool. And dozens of smaller ones around it. Eggs?'], ['you', 'Please don\'t say eggs.']],
  bogMotherAwake: [['you', 'IT\'S A TOAD. A GIANT HAIRY TOAD.'], ['doc', 'Watch the tongue! If it grabs you, shoot her till she lets go!']],
  bogMotherDead: [
    ['doc', 'She\'s down. And the pipe... it goes straight down under her pool. Into something cold.'],
    ['you', 'Cold? In Hell?'],
    ['doc', 'Pack a sweater.'],
  ],
  iceArrive: [
    ['you', 'Doc... it\'s snowing. In Hell.'],
    ['doc', 'The very bottom. Frozen solid. The ice is like glass: you\'ll slide everywhere. Spiked Tires will help.'],
    ['doc', 'And the cold will freeze your engine if you dawdle. Keep moving fast, or bolt on Heaters.'],
  ],
  firstSlide: [['you', 'No grip! NO GRIP!'], ['doc', 'Steer into the slide. Gently. Like a figure skater. A two-ton figure skater.']],
  firstCold: [['doc', 'Engine temperature is dropping fast. Floor it, the engine heat will keep it alive.'], ['you', 'My fingers are numb, Doc.'], ['doc', 'The CAR\'S fingers, Hank. Focus.']],
  nearWarden: [['doc', 'The pipe ends at the glacier ahead. And there\'s something frozen in it. Something with three faces.']],
  wardenAwake: [['you', 'It\'s moving. The ice is cracking!'], ['doc', 'It can\'t leave the glacier. Stay out of its reach, watch the spikes, and don\'t stand in its breath!']],
  wardenDead: [
    ['doc', 'It\'s over. And behind it, in the ice... a pump. A gigantic pump.'],
    ['you', 'Somebody\'s been pumping oil OUT of Hell?'],
    ['doc', 'There\'s a stamp on it. \'Property of the Throne.\' Hank, I think we\'ve found who\'s been raising gas prices.'],
  ],
  leviathanDead: [
    ['doc', 'It\'s sinking. Good riddance.'],
    ['you', 'Doc... the water\'s draining. There\'s a pipe down there. A big one.'],
    ['doc', 'An OIL pipe, Hank. Somebody down here has been pumping it. Follow it.'],
  ],
};

// What bosses do when they die.
//   roar: a big monster roar.   line: a spoken line (with a voice).
export const BOSS_DEATH = {
  ashTitan: { roar: true },
  magmaColossus: { line: 'Damn it.', voice: { pitch: 0.1, rate: 0.55 } },
  boneKing: { roar: true }, // (placeholder: falls apart with a roar; tell Claude what it should do)
  leviathan: { roar: true }, // (a long gurgling roar as it sinks)
  frozenWarden: { roar: true }, // (placeholder: shatters with a roar; tell Claude what it should do)
  bogMother: { line: 'My... babies...', voice: { pitch: 0.3, rate: 0.6 } }, // (placeholder: tell Claude what she should do)
};
