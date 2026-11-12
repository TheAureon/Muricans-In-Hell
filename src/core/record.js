// YOUR RECORD: lifetime stats, kept across every run (even NEW RUN keeps
// them: it's your driving career). Shown on the STATS tab of the logbook
// (J) and on the title menu.
//
// It listens to the same game events the jobs do (see missions/goals.js),
// plus a few of its own: wreck { cause }, souls { n }, jobDone {},
// secret {}, bounty {}, race {}, event {}, drive { dt, speed, airborne }.
import { DEMON_TYPES } from '../demons/demonTypes.js';
import { SETTINGS } from '../settings.js';

const KEY = 'helldrive.record';

const BLANK = () => ({
  kills: 0, ramKills: 0, byType: {},
  bosses: 0, bossByName: {},
  wrecks: 0, causes: {},
  souls: 0, jobs: 0, secrets: 0, bounties: 0, races: 0, events: 0, teleporters: 0,
  distance: 0, topSpeed: 0, longestJump: 0, airTime: 0, driftTime: 0, lavaTime: 0, floatTime: 0,
  playTime: 0, mirrorsSmashed: 0,
});

// Nice names for things that aren't demons.
const EXTRA_NAMES = { turret: 'Turret', mirrorClone: 'Mirror Hank', mirror: 'Mirror' };
export const nameOf = (type) => DEMON_TYPES[type]?.name || EXTRA_NAMES[type] || type;

export class Record {
  constructor() {
    this.d = BLANK();
    this.jump = 0;       // current time in the air
    this.dirty = 0;      // seconds since the last save
    try { Object.assign(this.d, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* fresh */ }
  }

  save() {
    if (SETTINGS.dev.creative) return;
    try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch { /* ignore */ }
    this.dirty = 0;
  }

  // A game event (the same ones the job board gets, and more).
  on(type, e = {}) {
    if (SETTINGS.dev.creative) return;
    const d = this.d;
    switch (type) {
      case 'kill':
        if (e.type === 'mirror') { d.mirrorsSmashed++; break; }
        d.kills++;
        if (e.source === 'ram') d.ramKills++;
        d.byType[e.type] = (d.byType[e.type] || 0) + 1;
        break;
      case 'boss': d.bosses++; if (e.name) d.bossByName[e.name] = (d.bossByName[e.name] || 0) + 1; this.save(); break;
      case 'wreck': d.wrecks++; d.causes[e.cause || 'Demons'] = (d.causes[e.cause || 'Demons'] || 0) + 1; this.save(); break;
      case 'souls': d.souls += e.n || 0; break;
      case 'jobDone': d.jobs++; break;
      case 'teleporter': d.teleporters++; break;
      case 'secret': d.secrets++; break;
      case 'bounty': d.bounties++; break;
      case 'race': d.races++; break;
      case 'event': d.events++; break;
      case 'drift': d.driftTime += e.dt; break;
      case 'lava': d.lavaTime += e.dt; break;
      case 'float': d.floatTime += e.dt; break;
      case 'drive':
        d.playTime += e.dt;
        d.distance += e.speed * e.dt;
        if (e.speed > d.topSpeed) d.topSpeed = e.speed;
        if (e.airborne) { this.jump += e.dt; d.airTime += e.dt; } else {
          if (this.jump > d.longestJump) d.longestJump = this.jump;
          this.jump = 0;
        }
        if ((this.dirty += e.dt) > 20) this.save();
        break;
    }
  }

  // The stats, ready to show: [[section, [[label, value], ...]], ...]
  rows() {
    const d = this.d;
    const time = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`);
    const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
    const killList = top(d.byType, 6).map(([t, n]) => [nameOf(t), n]);
    const causes = top(d.causes, 4).map(([c, n]) => [c, n]);
    return [
      ['CAREER', [
        ['Time in Hell', time(d.playTime)],
        ['Distance driven', `${(d.distance / 1000).toFixed(1)} km`],
        ['Top speed', `${Math.round(d.topSpeed * 3.6)} km/h`],
        ['Souls earned', Math.floor(d.souls)],
        ['Jobs done', d.jobs],
        ['Teleporters set up', d.teleporters],
        ['Secrets found', d.secrets],
        ['Bounties claimed', d.bounties],
        ['Races won', d.races],
        ['Events survived', d.events],
      ]],
      ['CARNAGE', [
        ['Kills', d.kills],
        ['Run over', d.ramKills],
        ['Bosses killed', d.bosses],
        ['Mirrors smashed', d.mirrorsSmashed],
        ...killList,
      ]],
      ['STUNTS', [
        ['Longest jump', `${d.longestJump.toFixed(1)} s`],
        ['Time in the air', time(d.airTime)],
        ['Time drifting', time(d.driftTime)],
        ['Time on lava', time(d.lavaTime)],
        ['Time afloat', time(d.floatTime)],
      ]],
      ['WRECKS', [
        ['Times wrecked', d.wrecks],
        ...(causes.length ? causes : [['(never! yet)', '']]),
      ]],
    ];
  }

  // The stats as HTML.
  html() {
    return `<div class="rec">${this.rows().map(([title, rows]) => `
      <div class="rec-sec"><h3>${title}</h3>
        ${rows.map(([k, v]) => `<div class="rec-row"><span>${k}</span><b>${v}</b></div>`).join('')}
      </div>`).join('')}</div>`;
  }
}
