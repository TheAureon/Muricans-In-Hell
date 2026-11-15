// DOC'S DAILY JOB: one hard job a day, a new one every real-world day.
// It's made from the date, so everyone playing gets the same job that day
// (in the same region). It's offered in whatever region you're in, once
// you've done Doc's first job, and it pays big.
//
// It becomes a normal job (see missions.js) and goes on the job board.
import { makeRandom } from '../core/random.js';
import { REGIONS } from '../regions/index.js';
import { DEMON_TYPES } from '../demons/demonTypes.js';

// Today, as YYYY-MM-DD (your own clock).
export function today(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const isDaily = (id) => id.startsWith('daily-');

const hash = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

// The kinds of daily job. Each makes { title, brief, line, goals }.
// k = how hard (1 in the first region, up to ~3.5 in the last).
const KINDS = [
  (rng, region, k) => {
    const types = (region.demons || []).filter((d) => d.weight > 0 && DEMON_TYPES[d.type] && !DEMON_TYPES[d.type].heavy).map((d) => d.type);
    const type = types[Math.floor(rng() * types.length)] || 'imp';
    const n = Math.round((12 + rng() * 8) * Math.sqrt(k));
    const name = DEMON_TYPES[type]?.name || type;
    return { title: `Pest Control: ${name}s`, brief: `Doc needs ${n} ${name}s dead for a study. Today.`, line: `Today's study: ${name}s. I need ${n} of them. Dead. Don't ask, it's science.`,
      goals: [{ kind: 'kill', demon: type, count: n, label: `Kill ${name}s` }] };
  },
  (rng, region, k) => {
    const n = Math.round((12 + rng() * 6) * Math.sqrt(k));
    return { title: 'Crash Test', brief: `Run over ${n} demons. No guns count.`, line: `Crash test day! I need impact data. Run over ${n} demons. Bumper only.`,
      goals: [{ kind: 'kill', count: n, by: 'ram', label: 'Run demons over' }] };
  },
  (rng, region, k) => {
    const s = Math.round((25 + rng() * 15) * Math.sqrt(k));
    const kmh = 130 + Math.round(rng() * 4) * 10;
    return { title: 'Tire Torture', brief: `Drift for ${s} seconds and hit ${kmh} km/h. Doc is testing tires.`, line: `New tire compound. I need you to destroy it: drift ${s} seconds, and get her up to ${kmh}.`,
      goals: [{ kind: 'drift', seconds: s }, { kind: 'speed', kmh }] };
  },
  (rng, region, k) => {
    const n = Math.round((250 + rng() * 150) * k / 10) * 10;
    return { title: 'Soul Harvest', brief: `Collect ${n} souls. The reality ripper is hungry.`, line: `The reality ripper is running low. Bring me ${n} souls' worth of juice.`,
      goals: [{ kind: 'souls', count: n }] };
  },
  (rng, region, k) => {
    const s = Math.round((8 + rng() * 6) * Math.sqrt(k));
    const n = Math.round((12 + rng() * 6) * Math.sqrt(k));
    return { title: 'Airborne Assault', brief: `${s} seconds in the air, and ${n} kills.`, line: `Aerial study today. ${s} seconds of air time, and take out ${n} demons while you're at it.`,
      goals: [{ kind: 'airTime', seconds: s }, { kind: 'kill', count: n, label: 'Kill demons' }] };
  },
];

// Today's daily job for this region (a job, ready for the job board).
export function dailyJob(region, date = today()) {
  const rng = makeRandom(hash(`${date}:${region.id}`));
  const idx = Math.max(0, REGIONS.indexOf(region));
  const k = 1 + idx * 0.28;
  const job = KINDS[Math.floor(rng() * KINDS.length)](rng, region, k);
  return {
    id: `daily-${date}-${region.id}`,
    giver: 'doc', region: region.id, after: ['roadTest'], daily: true,
    title: `DAILY: ${job.title}`,
    brief: `${job.brief} (A new daily job every day.)`,
    offer: [['doc', 'Got a fresh one for you. The daily.'], ['doc', job.line]],
    goals: job.goals,
    reward: { souls: Math.round((500 + idx * 250) / 50) * 50 },
    done: [['doc', 'That\'s the daily done. Come back tomorrow, I\'ll think of something worse.']],
  };
}
