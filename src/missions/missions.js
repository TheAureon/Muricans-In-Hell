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
//                floatTime  { seconds }  (float on deep water with Pontoons, total time)
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

  // ---------------- THE FLOODED CITY ----------------
  {
    id: 'floodSource', giver: 'doc', region: 'flooded_city',
    title: 'Hell Magic, Soggy',
    brief: 'There\'s a hell-magic source somewhere in this drowned city. Find it for a teleporter.',
    offer: [['doc', 'Hell magic, east side of the city. Get there and I\'ll link it up. Use the bridges.']],
    goals: [{ kind: 'teleporter', label: 'Find the hell-magic source' }],
    reward: { souls: 450 },
    done: [['doc', 'Linked. Now get back here and let me bolt some floats on you.']],
  },
  {
    id: 'seaTrial', giver: 'doc', region: 'flooded_city', after: ['floodSource'],
    title: 'Sea Trial',
    brief: 'Doc wants proof the Pontoons work. Float on deep water for a while (2 Pontoons, wheels only).',
    offer: [
      ['doc', 'Pontoons. Two of them, on the sides. Then drive into a canal and stay afloat for twenty seconds.'],
      ['you', 'And if they don\'t work?'],
      ['doc', 'Then I\'ll write that down too.'],
    ],
    goals: [{ kind: 'floatTime', seconds: 20, label: 'Float on deep water' }],
    reward: { souls: 400 },
    done: [['doc', 'Buoyancy confirmed. You are officially a boat.'], ['you', 'Captain Redline.']],
  },
  {
    id: 'canalSurvey', giver: 'doc', region: 'flooded_city', after: ['seaTrial'],
    title: 'Dive Survey',
    brief: 'Drop sensors in the middle of three canals, where the water is deepest. You\'ll have to float out there.',
    offer: [['doc', 'Sound travels best through water. Drop three sensors in the deep middle of the canals. Float out to them.']],
    goals: [{ kind: 'reach', label: 'Drop sensors in the canals', points: [{ x: -720, z: 120 }, { x: 380, z: 720 }, { x: 720, z: -380 }] }],
    reward: { souls: 700 },
    done: [
      ['doc', 'There\'s something under the plaza lake. Metal. A pipe... and something wrapped around it.'],
      ['you', 'Something big?'],
      ['doc', 'Something alive.'],
    ],
  },
  {
    id: 'gasLeak', giver: 'doc', region: 'flooded_city',
    title: 'Gas Leak',
    brief: 'Bloaters are full of rotten gas. Pop five of them with your guns, from a safe distance.',
    offer: [['doc', 'Those swollen ones? Full of gas. Do NOT ram them. Shoot five of them from far away. I want to know what\'s in them.']],
    goals: [{ kind: 'kill', demon: 'bloater', count: 5, by: 'gun', label: 'Shoot Bloaters' }],
    reward: { souls: 500 },
    done: [['doc', 'Methane, sulfur and... more crude. Everything down here is full of oil, Hank. Except the oil wells.']],
  },

  // ---------------- THE BLOOD SWAMP ----------------
  {
    id: 'swampSource', giver: 'doc', region: 'blood_swamp',
    title: 'Hell Magic, Sticky',
    brief: 'The hell-magic source is out on a dry island. Follow the north-west boardwalk.',
    offer: [['doc', 'Hell magic, north-west, on a dry island. There\'s a boardwalk most of the way. Stay on it.']],
    goals: [{ kind: 'teleporter', label: 'Find the hell-magic source' }],
    reward: { souls: 500 },
    done: [['doc', 'Linked. Now come home and let me take some weight off that car.']],
  },
  {
    id: 'lightFoot', giver: 'doc', region: 'blood_swamp', after: ['swampSource'],
    title: 'Light Footed',
    brief: 'Plant sensors at three spots deep in the bog, far from any boardwalk. Strip the car down or bolt on Mud Tires.',
    offer: [
      ['doc', 'Three sensors, deep in the mud, nowhere near a boardwalk.'],
      ['you', 'The car weighs two tons, Doc.'],
      ['doc', 'Then make it weigh less. Or bolt on Mud Tires. Science requires sacrifice. Usually armor.'],
    ],
    goals: [{ kind: 'reach', label: 'Plant sensors in the bog', points: [{ x: -300, z: 100 }, { x: 100, z: -400 }, { x: 200, z: 200 }] }],
    reward: { souls: 800 },
    done: [['doc', 'The pipe runs right under the Bog Mother\'s pool. And it\'s COLD down there. Ice cold.'], ['you', 'Ice. In Hell.'], ['doc', 'Hell\'s full of surprises.']],
  },
  {
    id: 'leechCull', giver: 'doc', region: 'blood_swamp',
    title: 'Leech Cull',
    brief: 'The leeches are getting into the base\'s water supply somehow. Thin them out.',
    offer: [['doc', 'Something keeps getting into the base\'s water tank. Something with teeth. Kill forty leeches. Please.']],
    goals: [{ kind: 'kill', demon: 'leech', count: 40, label: 'Kill Blood Leeches' }],
    reward: { souls: 500 },
    done: [['doc', 'The tank\'s quiet. Mostly. I\'m not drinking from it either way.']],
  },
  {
    id: 'toadHunt', giver: 'doc', region: 'blood_swamp', after: ['leechCull'],
    title: 'Toad Hunt',
    brief: 'Mire Toads spit blood with frightening accuracy. Doc wants six of their throat sacs.',
    offer: [['doc', 'Those Mire Toads hit you from sixty meters with a ball of blood. I want to know how. Six of them.']],
    goals: [{ kind: 'kill', demon: 'mireToad', count: 6, label: 'Take down Mire Toads' }],
    reward: { souls: 650 },
    done: [['doc', 'The throat sac is a pressure pump. A natural one. I could build an oil pump on the same idea.'], ['you', 'Doc, are you going to make me drive a toad?'], ['doc', 'Not yet.']],
  },

  // ---------------- ICE HELL ----------------
  {
    id: 'iceSource', giver: 'doc', region: 'ice_hell',
    title: 'Hell Magic, Frozen',
    brief: 'The hell-magic source is at the end of the north-west snow road. Its field will thaw you out, too.',
    offer: [['doc', 'Hell magic, north-west, at the end of the snow road. Stay on the snow, it has grip. The field will warm the engine up too.']],
    goals: [{ kind: 'teleporter', label: 'Find the hell-magic source' }],
    reward: { souls: 600 },
    done: [['doc', 'Linked. And warm. Come home whenever you need to thaw.']],
  },
  {
    id: 'iceDancing', giver: 'doc', region: 'ice_hell', after: ['iceSource'],
    title: 'Ice Dancing',
    brief: 'Doc wants data on how the car handles on ice. Drift. A lot.',
    offer: [['doc', 'I need handling data on the ice. Drift for thirty seconds. Total.'], ['you', 'Doc. I was an F1 champion.'], ['doc', 'Then this should be easy, shouldn\'t it?']],
    goals: [{ kind: 'drift', seconds: 30, label: 'Drift' }],
    reward: { souls: 600 },
    done: [['doc', 'Beautiful. Terrifying, but beautiful.'], ['you', 'Still got it.']],
  },
  {
    id: 'deepFreeze', giver: 'doc', region: 'ice_hell', after: ['iceSource'],
    title: 'Deep Freeze',
    brief: 'Plant sensors at three spots out on the open ice, far from the snow roads, to trace where the pipe goes.',
    offer: [['doc', 'The pipe runs under the ice. Three sensors, out on the open ice. Keep moving, keep warm.']],
    goals: [{ kind: 'reach', label: 'Plant sensors on the ice', points: [{ x: -650, z: -300 }, { x: 300, z: 300 }, { x: 250, z: -650 }] }],
    reward: { souls: 900 },
    done: [['doc', 'It all leads to the Warden\'s glacier. Whatever is pumping the oil is frozen in there with it.']],
  },
  {
    id: 'wraithHunt', giver: 'doc', region: 'ice_hell',
    title: 'Ghost Story',
    brief: 'Frost Wraiths keep chilling the engine. Doc wants to know what they\'re made of.',
    offer: [['doc', 'Those floating things that freeze the engine. Get me twenty of them. Shoot them, they\'re fast.']],
    goals: [{ kind: 'kill', demon: 'frostWraith', count: 20, label: 'Kill Frost Wraiths' }],
    reward: { souls: 600 },
    done: [['doc', 'Ice, sorrow, and... antifreeze. Hell\'s own antifreeze. I\'m keeping some.']],
  },

  // ---------------- THE IRON FOUNDRY ----------------
  {
    id: 'foundrySource', giver: 'doc', region: 'iron_foundry',
    title: 'Hell Magic, Industrial',
    brief: 'The hell-magic source is north-west, at the end of the north belt (watch the crushers).',
    offer: [['doc', 'Hell magic, north-west. Ride the north belt most of the way. Time the crushers. Please time the crushers.']],
    goals: [{ kind: 'teleporter', label: 'Find the hell-magic source' }],
    reward: { souls: 700 },
    done: [['doc', 'Linked. And you\'re still in one piece. Mostly one piece.']],
  },
  {
    id: 'turretBreaker', giver: 'doc', region: 'iron_foundry',
    title: 'Scrap Metal',
    brief: 'The gun towers make the whole foundry a shooting gallery. Blow up ten of them.',
    offer: [['doc', 'Those gun towers. Ten of them. Blow them up and the foundry gets a lot quieter. Jammers help, by the way.']],
    goals: [{ kind: 'kill', demon: 'turret', count: 10, label: 'Destroy turrets' }],
    reward: { souls: 900 },
    done: [['doc', 'Good work. Their targeting chips are... ooh. I can use these.']],
  },
  {
    id: 'sabotage', giver: 'doc', region: 'iron_foundry', after: ['foundrySource'],
    title: 'Sabotage',
    brief: 'Plant Doc\'s little surprises at three refinery valves, out among the machines.',
    offer: [['doc', 'Three refinery valves. I\'ve marked them. Drive up to each one and I\'ll do the rest.'], ['you', 'What\'s the rest?'], ['doc', 'Science. Loud science.']],
    goals: [{ kind: 'reach', label: 'Sabotage the valves', points: [{ x: 600, z: 150 }, { x: -720, z: -250 }, { x: 150, z: 850 }] }],
    reward: { souls: 1100 },
    done: [['doc', 'Three valves rigged. When the Colossus goes down, this whole place loses pressure.'], ['you', 'Loud science.'], ['doc', 'Loud science.']],
  },
  {
    id: 'huskHunt', giver: 'doc', region: 'iron_foundry',
    title: 'Spare Parts',
    brief: 'The Iron Husks are half machine. Doc wants their parts.',
    offer: [['doc', 'Those Iron Husks are half machine. Fifteen of them, and I can build you something nice.']],
    goals: [{ kind: 'kill', demon: 'ironHusk', count: 15, label: 'Take down Iron Husks' }],
    reward: { souls: 800 },
    done: [['doc', 'Demon-forged pistons. Your engine is going to love these.']],
  },
];
