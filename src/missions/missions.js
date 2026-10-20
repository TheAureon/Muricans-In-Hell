// =====================================================================
//  MISSIONS (JOBS): every job someone can give you lives here.
// =====================================================================
//  Each job has a GIVER (who asks: anyone in CAST in story/story.js, so a
//  new character can start handing out jobs just by being added there and
//  named here). Jobs are offered over the radio when their conditions are
//  met; you accept them on the job board (J). Finishing one pays souls and
//  can unlock the next job in a chain.
//
//  A job:
//    id        unique name (used in the save)
//    giver     who offers it ('doc', ...)
//    region    the region it's offered and done in (leave out = anywhere)
//    after     jobs that must be finished first
//    afterBoss a region whose boss must be beaten first
//    title     short name;   brief: what the giver wants, in a sentence
//    offer     radio lines when it's offered  ([who, line], ...)
//    goals     what to do (all of them). Kinds (see missions/goals.js):
//                kill       { demon: 'imp' (or a list, or leave out = any), count, by: 'ram' (optional) }
//                reach      { points: [{ x, z }], label } (drive into each beam)
//                teleporter {}  (set up this region's teleporter)
//                boss       {}  (beat this region's boss)
//                lavaTime   { seconds }  (drive on lava, total time)
//                drift      { seconds }  (drift, total time)
//    reward    { souls }
//    done      radio lines when it's finished
// =====================================================================

export const MISSIONS = [
  // ---------------- THE ASH PLAINS ----------------
  {
    id: 'roadTest', giver: 'doc', region: 'ash_plains',
    title: 'Road Test',
    brief: 'Doc wants to see how demons hold up against two tons of Detroit steel.',
    offer: [
      ['doc', 'Before you go oil hunting: I want data. How do these things react to a car at speed?'],
      ['doc', 'Ram five imps for me. Run them over, don\'t shoot them. For science.'],
    ],
    goals: [{ kind: 'kill', demon: 'imp', count: 5, by: 'ram', label: 'Ram imps' }],
    reward: { souls: 120 },
    done: [['doc', 'Fascinating. They... pop.'], ['you', 'I could\'ve told you that.']],
  },
  {
    id: 'ashSurvey', giver: 'doc', region: 'ash_plains', after: ['roadTest'],
    title: 'Seismic Survey',
    brief: 'Oil is underground. Plant Doc\'s seismic sensors at three marked spots so he can listen to the ground.',
    offer: [
      ['doc', 'Oil is underground, so we listen to the ground. I\'ve marked three spots out on the plains.'],
      ['doc', 'Drive into each beam of light and I\'ll drop a sensor.'],
    ],
    goals: [{ kind: 'reach', label: 'Plant sensors', points: [{ x: -420, z: 260 }, { x: 380, z: -380 }, { x: 520, z: 300 }] }],
    reward: { souls: 250 },
    done: [
      ['doc', 'Readings are in. The plains are bone dry... but something is pumping, deep down. Past the big one\'s arena.'],
      ['you', 'So we go through the big one.'],
    ],
  },
  {
    id: 'specimens', giver: 'doc', region: 'ash_plains', after: ['ashSurvey'],
    title: 'Field Specimens',
    brief: 'Doc needs tissue samples from the biggest demons out there.',
    offer: [['doc', 'I need tissue samples. Big ones. Bring down three Ash Brutes. They\'re out past the rocks, far from base.']],
    goals: [{ kind: 'kill', demon: 'brute', count: 3, label: 'Take down Ash Brutes' }],
    reward: { souls: 300 },
    done: [
      ['doc', 'Hank. Their blood is four percent crude oil.'],
      ['you', 'So we\'re on the right track.'],
      ['doc', 'We\'re on a very disgusting track. But yes.'],
    ],
  },

  // ---------------- THE LAVA RIVERS ----------------
  {
    id: 'lavaSource', giver: 'doc', region: 'lava_rivers',
    title: 'Hell Magic',
    brief: 'Find this region\'s source of hell magic so Doc can lock a teleporter onto it.',
    offer: [['doc', 'Priority one: find that hell-magic source. Drive into its field and I can lock a teleporter on it. Then you can come home.']],
    goals: [{ kind: 'teleporter', label: 'Find the hell-magic source' }],
    reward: { souls: 300 },
    done: [['doc', 'Pads are synced. Home is one button away now.']],
  },
  {
    id: 'heatTest', giver: 'doc', region: 'lava_rivers', after: ['lavaSource'],
    title: 'Heat Test',
    brief: 'Doc wants to know how long the car lasts on lava.',
    offer: [
      ['doc', 'I need to know how long the car survives on lava. Spend eight seconds on it.'],
      ['doc', 'Total. Not in one go. Please not in one go.'],
    ],
    goals: [{ kind: 'lavaTime', seconds: 8, label: 'Drive on lava' }],
    reward: { souls: 300 },
    done: [['doc', 'Got it. Paint\'s gone, tires are... mostly tires. Good data.'], ['you', 'My car is crying, Doc.']],
  },
  {
    id: 'lavaSurvey', giver: 'doc', region: 'lava_rivers', after: ['lavaSource'],
    title: 'Deep Listening',
    brief: 'Three more seismic sensors. The rock here is thinner, so the readings should be clearer.',
    offer: [['doc', 'The crust is thinner here. Plant three more sensors, I\'ll get a clearer picture of what\'s down there.']],
    goals: [{ kind: 'reach', label: 'Plant sensors', points: [{ x: 260, z: 560 }, { x: -880, z: 120 }, { x: 760, z: -640 }] }],
    reward: { souls: 400 },
    done: [
      ['doc', 'Strong signal. A huge reservoir, under the mountains past the Colossus.'],
      ['you', 'Mountains. Great. The car loves mountains.'],
    ],
  },

  // ---------------- THE BONE MOUNTAINS ----------------
  {
    id: 'boneSource', giver: 'doc', region: 'bone_mountains',
    title: 'Hell Magic, Again',
    brief: 'There\'s a hell-magic source in these mountains too. Find it for a teleporter.',
    offer: [['doc', 'Picking up hell magic in these hills too. Find it and I\'ll link it to base, same as before.']],
    goals: [{ kind: 'teleporter', label: 'Find the hell-magic source' }],
    reward: { souls: 400 },
    done: [['doc', 'Linked. You\'re getting good at this.']],
  },
  {
    id: 'ridgeSurvey', giver: 'doc', region: 'bone_mountains', after: ['boneSource'],
    title: 'Ridge Survey',
    brief: 'Sound carries from high up. Plant sensors on three peaks. Wheels won\'t make it: bring treads.',
    offer: [
      ['doc', 'Sound carries from high up. I want sensors on three peaks.'],
      ['doc', 'Tires will slide right off those. Bring treads: the Half-Track or better.'],
    ],
    goals: [{ kind: 'reach', label: 'Plant sensors on the peaks', points: [{ x: 280, z: 100 }, { x: 100, z: 320 }, { x: 340, z: -400 }] }],
    reward: { souls: 600 },
    done: [
      ['doc', 'Hank. It\'s right under us. All of it. The biggest oil field I\'ve ever seen.'],
      ['you', 'So we drill?'],
      ['doc', 'Not yet. Something down there is... moving. I need to think.'],
    ],
  },
  {
    id: 'ramHorns', giver: 'doc', region: 'bone_mountains', after: ['boneSource'],
    title: 'Ram Horns',
    brief: 'Bone Rams charge at highway speed on bone legs. Doc wants to know how.',
    offer: [['doc', 'Those Bone Rams charge at eighty on legs made of nothing. I want to know how. Bring four down.']],
    goals: [{ kind: 'kill', demon: 'boneRam', count: 4, label: 'Take down Bone Rams' }],
    reward: { souls: 450 },
    done: [['doc', 'Hell magic in the joints. Like a teleporter, but for knees.'], ['you', 'Can I get some for the car?'], ['doc', '...Maybe.']],
  },
];
