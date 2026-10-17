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
  you: { name: 'HANK', full: 'Hank "Redline" Mercer', color: '#ffb070' },
  doc: { name: 'DOC', full: 'Dr. Wendell "Doc" Pike', color: '#7fd8ff' },
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
    ['doc', 'It\'s down! And... whoa. The readings around the arena just went crazy. There\'s a tear opening. That leads deeper.'],
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
};

// What bosses do when they die.
//   roar: a big monster roar.   line: a spoken line (with a voice).
export const BOSS_DEATH = {
  ashTitan: { roar: true },
  magmaColossus: { line: 'Damn it.', voice: { pitch: 0.1, rate: 0.55 } },
};
