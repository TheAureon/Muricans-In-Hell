// THE RADIO: Doc (and you) talking while you drive. Subtitles in a box at
// the top left, typed out, with a computer voice if the browser has one
// (muted with M like everything else). Each conversation plays only once,
// ever (remembered in the browser).
import { CAST, RADIO } from './story.js';

const SEEN_KEY = 'helldrive.story';
// Conversations that interrupt whatever is being said.
const IMPORTANT = new Set(['start', 'lavaArrive', 'titanAwake', 'titanDead', 'colossusDead', 'teleporterFound', 'wrecked']);

export class Radio {
  constructor(audio) {
    this.audio = audio;
    this.queue = [];
    this.current = null;
    try { this.seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { this.seen = new Set(); }
    const el = document.createElement('div');
    el.id = 'radio';
    el.innerHTML = '<div class="r-who"><span class="r-dot"></span><b></b><small>RADIO</small></div><div class="r-text"></div>';
    document.getElementById('hud').appendChild(el);
    this.el = el;
    this.whoEl = el.querySelector('b');
    this.textEl = el.querySelector('.r-text');
    this.voices = [];
    if (window.speechSynthesis) {
      const load = () => { this.voices = speechSynthesis.getVoices(); };
      load();
      speechSynthesis.onvoiceschanged = load;
    }
  }

  hasSeen(id) { return this.seen.has(id); }
  markSeen(id) {
    this.seen.add(id);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...this.seen])); } catch { /* ignore */ }
  }

  // Play a conversation from story.js, once. Returns true if it played.
  // Big story moments cut in right away; small tips wait for a quiet radio
  // (they're skipped for now, not lost, if Doc is busy talking).
  say(id, { force = false } = {}) {
    if (!RADIO[id] || (!force && this.seen.has(id))) return false;
    const big = IMPORTANT.has(id);
    if (!big && (this.queue.length > 0 || (this.current && this.current.t < 1.5))) return false;
    if (big) { this.queue = []; this.current = null; window.speechSynthesis?.cancel(); }
    this.markSeen(id);
    for (const [who, line] of RADIO[id]) this.queue.push({ who, line });
    return true;
  }

  // Wipe the memory of what's been said (new game).
  static forget() { try { localStorage.removeItem(SEEN_KEY); } catch { /* ignore */ } }

  update(dt) {
    if (!this.current && this.queue.length) this.#start(this.queue.shift());
    const c = this.current;
    if (!c) return;
    c.t += dt;
    const chars = Math.min(c.line.length, Math.floor(c.t * 45));
    if (chars !== c.shown) { c.shown = chars; this.textEl.textContent = c.line.slice(0, chars); }
    if (c.t > c.line.length / 45 + 2.2 + c.line.length * 0.025) {
      this.current = null;
      if (!this.queue.length) this.el.classList.remove('on');
    }
  }

  #start(msg) {
    const who = CAST[msg.who];
    this.current = { ...msg, t: 0, shown: -1 };
    this.whoEl.textContent = who.name;
    this.whoEl.style.color = who.color;
    this.el.classList.toggle('you', msg.who === 'you');
    this.el.classList.add('on');
    this.#speak(msg.line, msg.who === 'doc' ? { pitch: 1.25, rate: 1.08 } : { pitch: 0.7, rate: 1.0 });
  }

  #speak(text, { pitch, rate }) {
    if (!window.speechSynthesis || this.audio.muted || !this.audio.ctx) return;
    const u = new SpeechSynthesisUtterance(text.replace(/\.\.\./g, ','));
    u.pitch = pitch; u.rate = rate; u.volume = 0.8;
    const en = this.voices.filter((v) => v.lang?.startsWith('en'));
    if (en.length) u.voice = en[0];
    speechSynthesis.speak(u);
  }

  clear() {
    this.queue = [];
    this.current = null;
    this.el.classList.remove('on');
    window.speechSynthesis?.cancel();
  }
}

// A one-off spoken line (e.g. a boss's last words), with a big subtitle.
export function speakLine(text, voice, audio) {
  const el = document.createElement('div');
  el.className = 'boss-line';
  el.textContent = `“${text}”`;
  document.getElementById('hud').appendChild(el);
  setTimeout(() => el.remove(), 4000);
  if (!window.speechSynthesis || audio.muted || !audio.ctx) return;
  const u = new SpeechSynthesisUtterance(text);
  u.pitch = voice?.pitch ?? 0.5; u.rate = voice?.rate ?? 0.8; u.volume = 1;
  const en = speechSynthesis.getVoices().filter((v) => v.lang?.startsWith('en'));
  // A deeper (often male) voice if there is one.
  const deep = en.find((v) => /(^|[^e])male|david|daniel|fred|alex|george|james/i.test(v.name)) || en[0];
  if (deep) u.voice = deep;
  speechSynthesis.speak(u);
}
