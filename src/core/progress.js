// Your progress. Two kinds:
//  RUN   souls (the currency), unlocked parts and the chassis tier. A wreck
//        wipes these (unless settings.progression.keepOnWreck).
//  WORLD where you are: the region you're in, bosses beaten, teleporters
//        set up. A wreck never wipes these: Hell remembers where you've been.
// Kept in the browser.
import { SETTINGS } from '../settings.js';

const KEY = 'helldrive.progress';

export class Progress {
  constructor() {
    this.listeners = [];
    this.#load();
  }

  #load() {
    this.reset();
    this.region = null;     // null = the first region
    this.cleared = {};      // region id -> true
    this.teleporters = {};  // region id -> true (set up)
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || '{}');
      this.souls = d.souls || 0;
      this.unlocked = new Set([...this.unlocked, ...(d.unlocked || [])]);
      this.tier = Math.min(d.tier || 0, SETTINGS.chassisTiers.length - 1);
      this.cleared = d.cleared || {};
      this.region = d.region || null;
      this.teleporters = d.teleporters || {};
    } catch { /* fresh start */ }
  }

  // A brand new game (nothing saved yet)?
  get fresh() { return this.souls < 1 && this.tier === 0 && !this.region && !Object.keys(this.cleared).length; }

  // Back to square one for the RUN (what a wreck does).
  reset() {
    this.souls = 0;
    this.unlocked = new Set(Object.entries(SETTINGS.shop).filter(([, s]) => !s.unlock).map(([t]) => t));
    this.tier = 0;
  }

  get tierInfo() { return SETTINGS.chassisTiers[this.tier]; }
  get nextTier() { return SETTINGS.chassisTiers[this.tier + 1] || null; }
  // Creative mode (dev panel): everything unlocked and free, and nothing
  // you do there touches your real saved progress.
  get creative() { return SETTINGS.dev.creative; }

  isUnlocked(type) { return this.creative || !SETTINGS.shop[type] || this.unlocked.has(type); }

  addSouls(n) { if (this.creative) return; this.souls += n; this.save(); this.#emit(); }

  // Spend souls. Returns false (and changes nothing) if you can't afford it.
  spend(n) {
    if (this.creative) return true;
    if (this.souls < n) return false;
    this.souls -= n;
    this.save();
    this.#emit();
    return true;
  }

  unlock(type) {
    const cost = SETTINGS.shop[type]?.unlock ?? 0;
    if (this.isUnlocked(type) || !this.spend(cost)) return false;
    this.unlocked.add(type);
    this.save();
    return true;
  }

  upgradeTier() {
    const next = this.nextTier;
    if (!next || !this.spend(next.cost)) return false;
    this.tier++;
    this.save();
    this.#emit();
    return true;
  }

  onChange(fn) { this.listeners.push(fn); }
  #emit() { for (const fn of this.listeners) fn(this); }

  // Throw away creative-mode changes: reload the real saved progress.
  reloadSaved() { this.#load(); this.#emit(); }

  save() {
    if (this.creative) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({
        souls: this.souls, unlocked: [...this.unlocked], tier: this.tier,
        cleared: this.cleared, region: this.region, teleporters: this.teleporters,
      }));
    } catch { /* storage blocked: fine */ }
  }
}
