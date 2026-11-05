// THE CREDITS: a slow scroll after the ending. Click, Space or Esc skips.
import { CREDITS } from '../story/story.js';

export function showCredits() {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.id = 'credits';
    el.innerHTML = `<div class="c-roll">${CREDITS.map(([a, b]) => (a || b
      ? `<div class="c-row${b ? '' : ' c-head'}"><b>${a}</b>${b ? `<span>${b}</span>` : ''}</div>`
      : '<div class="c-gap"></div>')).join('')}</div><div class="c-skip">CLICK / SPACE: skip</div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    const roll = el.querySelector('.c-roll');
    const start = performance.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('keydown', onKey);
      el.classList.remove('on');
      setTimeout(() => { el.remove(); resolve(); }, 800);
    };
    const onKey = (e) => { if (['Space', 'Enter', 'Escape'].includes(e.code)) { e.preventDefault(); finish(); } };
    window.addEventListener('keydown', onKey);
    el.addEventListener('click', finish);
    const tick = () => {
      if (done) return;
      const t = (performance.now() - start) / 1000;
      const y = window.innerHeight - t * 55;
      roll.style.transform = `translateY(${y}px)`;
      if (y < -roll.offsetHeight - 40) finish();
      else requestAnimationFrame(tick);
    };
    tick();
  });
}
