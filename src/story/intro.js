// THE INTRO: a few comic-book panels telling how this all started.
// Click / Space / Enter = next (or finish the typing). Esc = skip all.
// The little pictures are drawn with plain HTML/CSS (no image files).
import { INTRO, CAST } from './story.js';

const ART = {
  gas: `<div class="a-gas"><div class="a-sign"><b>GAS</b>
          <div class="a-row"><span>REGULAR</span><em class="roll">$14.99</em></div>
          <div class="a-row"><span>PREMIUM</span><em class="roll">$19.99</em></div>
          <div class="a-row"><span>DIESEL</span><em class="roll">$22.49</em></div></div>
          <div class="a-pole"></div></div>`,
  doc: `<div class="a-blueprint"><div class="a-bp-title">PROJECT: CHEAP GAS</div>
          <div class="a-earth">EARTH</div><div class="a-arrow">↓ ↓ ↓</div><div class="a-hell">HELL<br><small>(OIL??)</small></div>
          <div class="a-note">definitely safe*<br><small>*probably</small></div></div>`,
  tear: `<div class="a-tear"><div class="a-rip"></div><div class="a-rip b"></div><div class="a-machine"><i></i><i></i><i></i></div></div>`,
  car: `<div class="a-road"><div class="a-tear small"><div class="a-rip"></div></div>
          <div class="a-car"><div class="a-cab"></div><div class="a-body"><span></span></div><i class="w1"></i><i class="w2"></i><div class="a-dust"></div></div></div>`,
  base: `<div class="a-base"><div class="a-sky"></div><div class="a-wall l"></div><div class="a-wall r"></div>
          <div class="a-hangar"><b>GARAGE</b><div class="a-door"></div></div><div class="a-flag">★</div><div class="a-pad"></div></div>`,
  go: `<div class="a-logo">HELLDRIVERS</div>`,
};

export function playIntro() {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.id = 'intro';
    el.innerHTML = `<div class="i-panel"><div class="i-art"></div><div class="i-cap"><h2></h2><p></p><div class="i-quote"></div></div></div>
      <div class="i-nav"><span class="i-dots"></span><span>CLICK / SPACE: next &nbsp;·&nbsp; ESC: skip</span></div>`;
    document.body.appendChild(el);
    const art = el.querySelector('.i-art'), h2 = el.querySelector('h2'), p = el.querySelector('p'), quote = el.querySelector('.i-quote');
    const dots = el.querySelector('.i-dots');
    let i = -1, typing = null;

    const finish = () => {
      clearInterval(typing);
      window.removeEventListener('keydown', onKey);
      el.classList.add('out');
      setTimeout(() => { el.remove(); resolve(); }, 500);
    };
    const show = (n) => {
      i = n;
      if (i >= INTRO.length) return finish();
      const s = INTRO[i];
      const panel = el.querySelector('.i-panel');
      panel.classList.remove('in'); void panel.offsetWidth; panel.classList.add('in');
      art.innerHTML = ART[s.art] || '';
      h2.textContent = s.title;
      quote.innerHTML = '';
      dots.innerHTML = INTRO.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
      // Type the text out
      let c = 0;
      p.textContent = '';
      clearInterval(typing);
      typing = setInterval(() => {
        c += 2;
        p.textContent = s.text.slice(0, c);
        if (c >= s.text.length) { clearInterval(typing); typing = null; showQuote(s); }
      }, 22);
    };
    const showQuote = (s) => {
      if (!s.quote) return;
      const who = CAST[s.quote.who];
      quote.innerHTML = `<b style="color:${who.color}">${who.name}:</b> ${s.quote.line}`;
    };
    const next = () => {
      if (typing) { // finish typing first
        clearInterval(typing); typing = null;
        p.textContent = INTRO[i].text;
        showQuote(INTRO[i]);
        return;
      }
      show(i + 1);
    };
    const onKey = (e) => {
      if (e.code === 'Escape') finish();
      else if (['Space', 'Enter', 'ArrowRight'].includes(e.code)) { e.preventDefault(); next(); }
    };
    el.addEventListener('click', next);
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => el.classList.add('on'));
    show(0);
  });
}
