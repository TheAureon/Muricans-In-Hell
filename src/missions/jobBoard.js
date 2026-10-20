// THE JOB BOARD: keeps track of every job (missions.js): which ones have
// been offered, which you've taken, how far along they are, which are done.
// Jobs are part of the WORLD (like bosses beaten): a wreck doesn't undo them.
// Kept in the browser.
import { MISSIONS } from './missions.js';
import { GOALS } from './goals.js';
import { CAST } from '../story/story.js';
import { SETTINGS } from '../settings.js';

const KEY = 'helldrive.missions';
const OFFER_GAP = 20; // seconds between two job offers

export class JobBoard {
  constructor({ region, progress, radio, hud, audio }) {
    this.world = { region, progress };
    this.radio = radio;
    this.hud = hud;
    this.audio = audio;
    this.talkQueue = [];  // radio lines waiting for a quiet moment
    this.offerTimer = 5;  // a few seconds into the drive before the first offer
    this.onChange = null;
    this.#load();
  }

  #load() {
    this.jobs = {};      // id -> { status: 'offered' | 'active' | 'done', goals: [{ n, hit }] }
    this.tracked = null; // the job the arrow points to
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || '{}');
      this.jobs = d.jobs || {};
      this.tracked = d.tracked || null;
    } catch { /* fresh start */ }
  }

  save() {
    if (SETTINGS.dev.creative) return;
    try { localStorage.setItem(KEY, JSON.stringify({ jobs: this.jobs, tracked: this.tracked })); } catch { /* ignore */ }
  }

  // Throw away creative-mode changes.
  reloadSaved() { this.#load(); this.#changed(); }

  static forget() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

  status(m) { return this.jobs[m.id]?.status || 'none'; }
  here(m) { return !m.region || m.region === this.world.region.id; }
  giver(m) { return CAST[m.giver] || { name: m.giver.toUpperCase(), color: '#ccc' }; }
  byStatus(status) { return MISSIONS.filter((m) => this.status(m) === status); }
  get newCount() { return this.byStatus('offered').length; }

  // Can this job be offered right now?
  #ready(m) {
    return this.status(m) === 'none' && this.here(m)
      && (m.after || []).every((id) => this.jobs[id]?.status === 'done')
      && (!m.afterBoss || this.world.progress.cleared[m.afterBoss]);
  }

  // Each frame while you're driving.
  update(dt, car) {
    if (this.talkQueue.length && this.radio.quiet) this.radio.talk(this.talkQueue.shift());
    if ((this.offerTimer -= dt) <= 0 && this.radio.quiet && !this.talkQueue.length) {
      this.offerTimer = OFFER_GAP;
      const m = MISSIONS.find((j) => this.#ready(j));
      if (m) {
        // Already done before it was ever asked for (an old save)? Then it's just done.
        if (m.goals.every((g) => GOALS[g.kind]?.already?.(g, this.world))) { this.jobs[m.id] = { status: 'done' }; this.save(); this.offerTimer = 0; }
        else this.offer(m);
      }
    }
    if (!car.wrecked) this.emit('tick', { pos: car.currPos });
  }

  offer(m) {
    this.jobs[m.id] = { status: 'offered' };
    this.save();
    if (m.offer) this.talkQueue.push([...m.offer, [m.giver, 'It\'s on the job board. Press J.']]);
    this.hud.toast(`NEW JOB from ${this.giver(m).name}: ${m.title}`, 'job');
    this.audio.chime();
    this.#changed();
  }

  accept(id) {
    const m = MISSIONS.find((j) => j.id === id);
    if (!m || this.status(m) !== 'offered') return;
    this.jobs[id] = { status: 'active', goals: m.goals.map(() => ({ n: 0 })) };
    m.goals.forEach((g, i) => { if (this.here(m) && GOALS[g.kind]?.already?.(g, this.world)) this.jobs[id].goals[i].n = this.total(g); });
    if (!this.trackedJob || !this.here(this.trackedJob)) this.tracked = id;
    this.save();
    this.audio.chime();
    this.#changed();
    this.#checkDone(m);
  }

  track(id) { this.tracked = id; this.save(); this.#changed(); }
  get trackedJob() { return MISSIONS.find((m) => m.id === this.tracked && this.status(m) === 'active') || null; }

  // Something happened in the game (see goals.js for the list).
  emit(type, e = {}) {
    for (const m of MISSIONS) {
      const st = this.jobs[m.id];
      if (st?.status !== 'active' || !this.here(m)) continue;
      let moved = false;
      m.goals.forEach((g, i) => {
        const kind = GOALS[g.kind], s = st.goals[i], total = this.total(g);
        const fn = kind?.on[type];
        if (!fn || s.n >= total) return;
        const add = fn(g, e, s);
        if (!(add > 0)) return;
        const before = s.n;
        s.n = Math.min(total, s.n + add);
        // Count-style goals pop a little message; timers just tick on the HUD.
        if (Math.floor(s.n) !== Math.floor(before)) {
          moved = true;
          if (Number.isInteger(add) && s.n < total) this.hud.toast(`${this.label(g)} ${s.n}/${total}`, 'job');
        }
      });
      if (moved) { this.save(); this.#changed(); this.#checkDone(m); }
    }
  }

  total(g) { return GOALS[g.kind]?.total(g) ?? 1; }
  label(g) { return g.label || GOALS[g.kind]?.label(g, this.world) || g.kind; }
  // How a goal reads: { label, progress, done }
  goalInfo(m, i) {
    const g = m.goals[i], total = this.total(g);
    const n = this.jobs[m.id]?.goals?.[i]?.n ?? 0;
    const done = this.status(m) === 'done' || n >= total;
    const show = GOALS[g.kind]?.show;
    return { label: this.label(g), progress: show ? show(n, total) : `${Math.floor(n)}/${total}`, done };
  }

  // Spots to mark with beams of light: the unvisited points of every active job here.
  beacons() {
    const out = [];
    for (const m of this.byStatus('active')) {
      if (!this.here(m)) continue;
      m.goals.forEach((g, i) => {
        const pts = GOALS[g.kind]?.points?.(g, this.jobs[m.id].goals[i]) || [];
        for (const p of pts) out.push({ x: p.x, z: p.z, color: this.giver(m).color, tracked: m.id === this.tracked });
      });
    }
    return out;
  }

  #checkDone(m) {
    const st = this.jobs[m.id];
    if (st?.status !== 'active' || !m.goals.every((g, i) => st.goals[i].n >= this.total(g))) return;
    st.status = 'done';
    if (this.tracked === m.id) this.tracked = this.byStatus('active').find((j) => this.here(j))?.id || null;
    this.save();
    const souls = m.reward?.souls || 0;
    if (souls) this.world.progress.addSouls(souls);
    this.hud.banner('JOB DONE', `${m.title}${souls ? `  ·  +${souls} souls` : ''}`, 5);
    this.audio.chime();
    if (m.done) this.talkQueue.unshift(m.done);
    this.offerTimer = Math.min(this.offerTimer, 8); // the next job in the chain comes soon
    this.#changed();
  }

  #changed() { this.onChange?.(this); }
}
