// The kinds of goal a job can have. Each kind says:
//   total(goal)              how much is needed (count, seconds, points...)
//   on: { event(goal, e, s) } how much a game event adds (s = saved state)
//   already(goal, world)     true if it's done before you even start (optional)
//   points(goal, s)          places to mark with a beam of light (optional)
//   show(n, total)           how the progress reads (optional)
// The game sends events: kill { type, source }, tick { pos }, lava { dt },
// drift { dt }, teleporter {}, boss {}.
// A new kind of goal is just a new entry here.
import { DEMON_TYPES } from '../demons/demonTypes.js';

const listOf = (v) => (v == null ? null : [].concat(v));

export const GOALS = {
  kill: {
    total: (g) => g.count,
    label: (g) => `${g.by === 'ram' ? 'Ram' : 'Kill'} ${(listOf(g.demon) || ['demon']).map((t) => DEMON_TYPES[t]?.name || t).join(' / ')}s`,
    on: {
      kill: (g, e) => ((!g.demon || listOf(g.demon).includes(e.type)) && (!g.by || g.by === e.source) ? 1 : 0),
    },
  },
  reach: {
    total: (g) => g.points.length,
    label: () => 'Reach the marked spots',
    points: (g, s) => g.points.filter((_, i) => !s.hit?.[i]),
    on: {
      tick: (g, e, s) => {
        s.hit ||= [];
        let n = 0;
        g.points.forEach((p, i) => {
          if (!s.hit[i] && Math.hypot(e.pos.x - p.x, e.pos.z - p.z) < (g.radius || 9)) { s.hit[i] = true; n++; }
        });
        return n;
      },
    },
  },
  teleporter: {
    total: () => 1,
    label: () => 'Set up the teleporter',
    already: (g, w) => !!w.progress.teleporters[w.region.id],
    on: { teleporter: () => 1 },
    show: () => '',
  },
  boss: {
    total: () => 1,
    label: (g, w) => `Beat ${w?.region.boss?.name || 'the boss'}`,
    already: (g, w) => !!w.progress.cleared[w.region.id],
    on: { boss: () => 1 },
    show: () => '',
  },
  lavaTime: {
    total: (g) => g.seconds,
    label: () => 'Drive on lava',
    on: { lava: (g, e) => e.dt },
    show: (n, t) => `${Math.floor(n)}/${t}s`,
  },
  drift: {
    total: (g) => g.seconds,
    label: () => 'Drift',
    on: { drift: (g, e) => e.dt },
    show: (n, t) => `${Math.floor(n)}/${t}s`,
  },
};
