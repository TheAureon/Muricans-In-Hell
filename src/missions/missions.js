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
//    giver     who offers it ('doc', 'buck', 'grizzle', 'carol', ...)
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
//                airTime    { seconds }  (time in the air, total)
//                speed      { kmh }      (hit this speed once)
//                scrap      { count }    (grab parts that fell off, E)
//                souls      { count }    (collect souls)
//                teleports  { count }    (go through teleport mirrors)
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

  // ---------------- SCREAMING CANYON ----------------
  {
    id: 'canyonSource', giver: 'doc', region: 'screaming_canyon',
    title: 'Hell Magic, Windy',
    brief: 'The hell-magic source is in a wide alcove halfway up the canyon. Jump the chasms to get there.',
    offer: [['doc', 'Hell magic, in an alcove halfway up the canyon. Jump the chasms. All of them. Don\'t fall in any.']],
    goals: [{ kind: 'teleporter', label: 'Find the hell-magic source' }],
    reward: { souls: 800 },
    done: [['doc', 'Linked. Now if you fall in a chasm, at least you\'ll come back somewhere halfway.']],
  },
  {
    id: 'airtime', giver: 'doc', region: 'screaming_canyon',
    title: 'Frequent Flyer',
    brief: 'Doc is studying the canyon\'s updrafts. Spend 15 seconds in the air (jumps add up).',
    offer: [['doc', 'The updrafts here are fascinating. Spend fifteen seconds in the air. Total. Jumps count.'], ['you', 'Finally a job I was born for.']],
    goals: [{ kind: 'airTime', seconds: 15, label: 'Time in the air' }],
    reward: { souls: 800 },
    done: [['doc', 'Fifteen seconds of flight. In a muscle car. I\'m writing a paper.']],
  },
  {
    id: 'harpyHunt', giver: 'doc', region: 'screaming_canyon',
    title: 'Pest Control',
    brief: 'The harpies keep stealing parts off the car. Bring down twenty of them.',
    offer: [['doc', 'The harpies are stealing our parts. OUR parts, Hank. Shoot down twenty of them.']],
    goals: [{ kind: 'kill', demon: 'harpy', count: 20, label: 'Shoot down harpies' }],
    reward: { souls: 900 },
    done: [['doc', 'And they had our parts in their nests. And somebody\'s wedding ring. And a trombone.']],
  },
  {
    id: 'convoyTrail', giver: 'doc', region: 'screaming_canyon', after: ['canyonSource'],
    title: 'Follow the Barrels',
    brief: 'Plant trackers at three spots along the convoy route, deep in the canyon.',
    offer: [['doc', 'The barrel convoys go up this canyon. Plant three trackers along the route and we\'ll see exactly where the oil goes.']],
    goals: [{ kind: 'reach', label: 'Plant trackers', points: [{ x: -600, z: -400 }, { x: 100, z: -850 }, { x: 820, z: -330 }] }],
    reward: { souls: 1200 },
    done: [['doc', 'All three are pinging. The oil goes past the Harpy Queen\'s nest... and out into a desert of mirrors.']],
  },

  // ---------------- THE MIRROR WASTES ----------------
  {
    id: 'mirrorSource', giver: 'doc', region: 'mirror_wastes',
    title: 'Hell Magic, Reflected',
    brief: 'The hell-magic source is in a wide alcove on the way. Maybe. If it isn\'t a reflection.',
    offer: [['doc', 'Hell magic in an alcove up the canyon. Or a reflection of it. Only one way to find out.']],
    goals: [{ kind: 'teleporter', label: 'Find the hell-magic source' }],
    reward: { souls: 900 },
    done: [['doc', 'Linked. It was real. I think. The teleporter says so, anyway.']],
  },
  {
    id: 'mirrorBreaker', giver: 'doc', region: 'mirror_wastes',
    title: 'Seven Years Bad Luck',
    brief: 'Shatter fifteen REAL mirrors (ram them or shoot them). The fake ones don\'t count.',
    offer: [['doc', 'Every real mirror out there is a window for the Throne to watch us. Break fifteen. Real ones.'], ['you', 'That\'s a lot of bad luck.'], ['doc', 'We\'re in Hell, Hank. It can\'t get much worse.']],
    goals: [{ kind: 'kill', demon: 'mirror', count: 15, label: 'Shatter real mirrors' }],
    reward: { souls: 1100 },
    done: [['doc', 'Fifteen windows closed. It\'s gone very quiet in here.']],
  },
  {
    id: 'portalHop', giver: 'doc', region: 'mirror_wastes', after: ['mirrorSource'],
    title: 'Through the Looking Glass',
    brief: 'Doc wants to map the teleport mirrors. Go through five of them.',
    offer: [['doc', 'Those framed mirrors move you around. Go through five so I can map where they lead.']],
    goals: [{ kind: 'teleports', count: 5, label: 'Go through teleport mirrors' }],
    reward: { souls: 1000 },
    done: [['doc', 'Mapped. It\'s a loop... with a door to the great mirror at the end. That\'s where it is. Whatever \'it\' is.']],
  },
  {
    id: 'selfHelp', giver: 'doc', region: 'mirror_wastes',
    title: 'Know Thyself',
    brief: 'Your reflections keep climbing out of the mirrors. Shatter three of them.',
    offer: [['doc', 'Three of your reflections. Shatter them. Try not to take it personally.']],
    goals: [{ kind: 'kill', demon: 'mirrorClone', count: 3, label: 'Shatter your reflections' }],
    reward: { souls: 1200 },
    done: [['you', 'That felt weird.'], ['doc', 'Therapy is cheaper than gas these days. We should both try it.']],
  },

  // ---------------- THE THRONE ----------------
  {
    id: 'throneSource', giver: 'doc', region: 'the_throne',
    title: 'Hell Magic, Final',
    brief: 'The last hell-magic source, halfway up the golden road. You\'ll want a way home if this goes badly.',
    offer: [['doc', 'One last hell-magic source, halfway up the road. Link it. If this goes badly, I want you coming back halfway, not from the bottom.']],
    goals: [{ kind: 'teleporter', label: 'Find the hell-magic source' }],
    reward: { souls: 1500 },
    done: [['doc', 'Linked. Last one. Feels strange to say that.']],
  },
  {
    id: 'hostileTakeover', giver: 'doc', region: 'the_throne',
    title: 'Hostile Takeover',
    brief: 'Infernal Petroleum Security is everywhere. Lay off twenty of them.',
    offer: [['doc', 'Those suits with shotguns are Infernal Petroleum Security. Let\'s do some downsizing. Twenty of them.']],
    goals: [{ kind: 'kill', demon: 'security', count: 20, label: 'Lay off Security' }],
    reward: { souls: 1500 },
    done: [['you', 'Consider yourselves terminated.'], ['doc', 'I\'m going to pretend you didn\'t say that.']],
  },
  {
    id: 'theGauntlet', giver: 'doc', region: 'the_throne', after: ['throneSource'],
    title: 'The Gauntlet',
    brief: 'Plant Doc\'s trackers in the ice, the mud and the mirrors along the road.',
    offer: [['doc', 'I need readings from the ice, the mud and the mirrors on this road. Plant a tracker in each. Then we know what we\'re walking into.']],
    goals: [{ kind: 'reach', label: 'Plant trackers', points: [{ x: 126, z: 1097 }, { x: -721, z: 1139 }, { x: 232, z: -834 }] }],
    reward: { souls: 2000 },
    done: [['doc', 'All three pinging. Everything on this road feeds the palace. Cut off the head, and the whole thing stops.']],
  },
  // =================================================================
  //  BUCK "BOOTLEGGER" DAWSON: a washed-up stock-car racer who came to
  //  Hell for the oil too. Stunts and speed (and races, see races.js).
  // =================================================================
  {
    id: 'buckHello', giver: 'buck', region: 'lava_rivers',
    title: 'New Kid In Town',
    brief: 'A loudmouth stock-car racer wants to see if the "F1 champ" can actually drive. Drift, and go fast.',
    offer: [
      ['buck', 'Well, well. Hank Redline Mercer. Buck Dawson, three-time dirt track champion. I came down here for the oil, same as you.'],
      ['you', 'Never heard of you.'],
      ['buck', 'You will. F1 boys can\'t drive on dirt. Prove me wrong: hit 150 and slide it around for a while.'],
    ],
    goals: [{ kind: 'speed', kmh: 150 }, { kind: 'drift', seconds: 20 }],
    reward: { souls: 300 },
    done: [['buck', 'Huh. Not bad for a guy who needs a pit crew to change a tire.'], ['you', 'I had four pit crews.'],
      ['buck', 'Tell you what. I set up a race course in every region. Doc\'s mirror gizmo makes a copy of you to race. Find the start gate. Beat yourself, I pay.']],
  },
  {
    id: 'buckAir', giver: 'buck', region: 'bone_mountains', after: ['buckHello'],
    title: 'Hang Time',
    brief: 'Buck says real drivers fly. Spend time in the air off the mountain ridges.',
    offer: [['buck', 'These mountains are a ramp park, Mercer. Get some air. Six seconds total, and I\'ll stop calling you Formula Wimp.']],
    goals: [{ kind: 'airTime', seconds: 6 }],
    reward: { souls: 400 },
    done: [['buck', 'Okay. That was pretty. Don\'t tell anyone I said that.']],
  },
  {
    id: 'buckRam', giver: 'buck', region: 'flooded_city', after: ['buckAir'],
    title: 'Trading Paint',
    brief: 'Buck\'s challenge: run over 25 demons. No guns. Just bumper.',
    offer: [['buck', 'Where I come from, you don\'t shoot the competition. You put \'em in the wall. Run over twenty-five of these wet freaks.']],
    goals: [{ kind: 'kill', count: 25, by: 'ram', label: 'Run demons over' }],
    reward: { souls: 600 },
    done: [['buck', 'Now THAT is racing.']],
  },
  {
    id: 'buckCanyon', giver: 'buck', region: 'screaming_canyon',
    title: 'Canyon Jumper',
    brief: 'The chasms here are the biggest jumps in Hell. Buck wants 25 seconds of air.',
    offer: [['buck', 'Biggest gaps I ever saw, Mercer. Twenty-five seconds of hang time, total. If you fall in, I\'m keeping your car.']],
    goals: [{ kind: 'airTime', seconds: 25 }],
    reward: { souls: 900 },
    done: [['buck', 'You\'re crazy. I respect crazy.']],
  },

  // =================================================================
  //  GRIZZLE: a demon mechanic who switched sides (Infernal Petroleum
  //  never paid overtime). Works the garage at base, runs the paint shop.
  //  Hunting and salvage jobs.
  // =================================================================
  {
    id: 'grizzleHello', giver: 'grizzle', region: 'ash_plains', after: ['ashSurvey'],
    title: 'The New Guy',
    brief: 'A demon showed up at the base asking for a job. He wants Spiker spines to make you better parts.',
    offer: [
      ['doc', 'Hank, don\'t panic, but there\'s a demon in the garage. He says he\'s a mechanic.'],
      ['grizzle', 'Grizzle. Fixed engines for Infernal Petroleum for nine hundred years. Never got a day off. So I quit.'],
      ['grizzle', 'Bring me four Spikers. Their spines make good steel. I also paint cars now. Ask me in the garage.'],
    ],
    goals: [{ kind: 'kill', demon: 'spiker', count: 4, label: 'Hunt Spikers' }],
    reward: { souls: 250 },
    done: [['grizzle', 'Good spines. You and me, we\'ll get along.'], ['doc', 'He reorganized my whole toolbox. I hate that it\'s better.']],
  },
  {
    id: 'grizzleScrap', giver: 'grizzle', region: 'ash_plains', after: ['grizzleHello'],
    title: 'Waste Not',
    brief: 'Grizzle hates waste. When parts get knocked off your car, grab them back (E). Five pieces.',
    offer: [['grizzle', 'You keep leaving parts all over Hell. Every piece that falls off, you pick it back up. E. Five of them, so I know you can learn.']],
    goals: [{ kind: 'scrap', count: 5 }],
    reward: { souls: 250 },
    done: [['grizzle', 'See? Free parts.']],
  },
  {
    id: 'grizzleRams', giver: 'grizzle', region: 'bone_mountains',
    title: 'Horn Collection',
    brief: 'Bone Ram horns make the best ram spikes in Hell. Grizzle wants six.',
    offer: [['grizzle', 'Bone Rams. Their horns are harder than steel. Bring down six and I\'ll stop buying spikes from the black market.']],
    goals: [{ kind: 'kill', demon: 'boneRam', count: 6, label: 'Hunt Bone Rams' }],
    reward: { souls: 450 },
    done: [['grizzle', 'Beautiful horns. Don\'t ask what I do with the rest.']],
  },
  {
    id: 'grizzleBog', giver: 'grizzle', region: 'blood_swamp',
    title: 'Swamp Grease',
    brief: 'Mire Toad fat is the best axle grease there is. Grizzle wants four toads and three bloaters.',
    offer: [['grizzle', 'Mire Toads are full of grease. The good kind. Four toads. And three Bloaters, for... reasons.']],
    goals: [{ kind: 'kill', demon: 'mireToad', count: 4, label: 'Hunt Mire Toads' }, { kind: 'kill', demon: 'bloater', count: 3, label: 'Pop Bloaters' }],
    reward: { souls: 600 },
    done: [['grizzle', 'Ahh. Smells like home. Terrible.']],
  },
  {
    id: 'grizzleTurrets', giver: 'grizzle', region: 'iron_foundry',
    title: 'Spare Parts',
    brief: 'The foundry turrets are full of good parts. Grizzle wants eight of them torn down.',
    offer: [['grizzle', 'I built half of these turrets. Lousy pay. Tear down eight and I\'ll strip them for parts.']],
    goals: [{ kind: 'kill', demon: 'turret', count: 8, label: 'Wreck turrets' }],
    reward: { souls: 900 },
    done: [['grizzle', 'Nine hundred years I waited to see that.']],
  },
  {
    id: 'grizzleBrutes', giver: 'grizzle', region: 'ice_hell',
    title: 'Coolant',
    brief: 'Frost Brutes have frozen blood: perfect engine coolant. Grizzle wants two.',
    offer: [['grizzle', 'Frost Brute blood never thaws. Best coolant there is. Get me two. Big ones. They\'re all big ones.']],
    goals: [{ kind: 'kill', demon: 'frostBrute', count: 2, label: 'Hunt Frost Brutes' }],
    reward: { souls: 800 },
    done: [['grizzle', 'Your engine will run cold forever now. Well. Cooler.']],
  },

  // =================================================================
  //  CAROL FINCH: the Devil's Executive Assistant for four thousand
  //  years, fired by email. Leaks company secrets; sabotage jobs (and
  //  she knows where things are hidden, see secrets.js).
  // =================================================================
  {
    id: 'carolHello', giver: 'carol', region: 'bone_mountains',
    title: 'Dead Drops',
    brief: 'Someone is hacking Doc\'s radio. She says she has Infernal Petroleum secrets, left at two spots in the mountains.',
    offer: [
      ['carol', 'Is this thing on? Hello? Hank Mercer? Carol Finch. Executive Assistant to the CEO of Infernal Petroleum. Former.'],
      ['carol', 'Four thousand years of service, and he fired me. By email. With a typo.'],
      ['carol', 'I left a few files for you in the mountains. Go pick them up. And then let\'s ruin him.'],
    ],
    goals: [{ kind: 'reach', label: 'Pick up the files', points: [{ x: 240, z: 140 }, { x: 60, z: 280 }] }],
    reward: { souls: 350 },
    done: [['carol', 'Those are the quarterly reports. Read page forty. He is NOT a nice man.'], ['doc', 'She knows things, Hank. I don\'t trust her. But she knows things.']],
  },
  {
    id: 'carolPipes', giver: 'carol', region: 'flooded_city', after: ['carolHello'],
    title: 'Pipe Dreams',
    brief: 'The flooded city hides Infernal Petroleum\'s pipelines. Carol knows where the valves are.',
    offer: [['carol', 'His pipelines run under this whole city. Three valves. Drive over them and Doc\'s little gadget will jam them open. Oil everywhere. Good.']],
    goals: [{ kind: 'reach', label: 'Jam the valves', points: [{ x: -680, z: 160 }, { x: 420, z: 680 }, { x: 680, z: -340 }] }],
    reward: { souls: 600 },
    done: [['carol', 'I can hear him screaming from here. Delightful.']],
  },
  {
    id: 'carolHusks', giver: 'carol', region: 'iron_foundry',
    title: 'Restructuring',
    brief: 'The Iron Husks are company security. Carol wants ten of them "let go".',
    offer: [['carol', 'Those Iron Husks guard the foundry. I wrote their contracts. No severance. Let ten of them go, please.']],
    goals: [{ kind: 'kill', demon: 'ironHusk', count: 10, label: 'Let Iron Husks go' }],
    reward: { souls: 900 },
    done: [['carol', 'I\'ll send them a card. No, I won\'t.']],
  },
  {
    id: 'carolMirrors', giver: 'carol', region: 'mirror_wastes',
    title: 'Vanity',
    brief: 'The Devil LOVES his mirrors. Carol wants eight of them smashed.',
    offer: [['carol', 'He had me polish these mirrors. Every day. For centuries. Smash eight of them. I\'ll be listening.']],
    goals: [{ kind: 'kill', demon: 'mirror', count: 8, label: 'Smash mirrors' }],
    reward: { souls: 1100 },
    done: [['carol', 'Seven years of bad luck each. For HIM. Wonderful.']],
  },
  {
    id: 'carolFinal', giver: 'carol', region: 'the_throne',
    title: 'Exit Interview',
    brief: 'Carol\'s last request: take out his personal security detail. Ten of them.',
    offer: [['carol', 'His personal security. The ones who walked me out of the building with a cardboard box. Ten of them. Then go get him.']],
    goals: [{ kind: 'kill', demon: 'security', count: 10, label: 'Fire his security' }],
    reward: { souls: 1500 },
    done: [['carol', 'Thank you, Hank. Truly. Now go give him my notice.']],
  },
];
