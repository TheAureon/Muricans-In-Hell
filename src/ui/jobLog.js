// The job board screen (J): new jobs to accept, jobs in progress, jobs done.
// The game pauses while it's open.
import { REGIONS } from '../regions/index.js';

const regionName = (id) => REGIONS.find((r) => r.id === id)?.name || '';

export class JobLog {
  constructor(board) {
    this.board = board;
    this.open = false;
    const el = document.createElement('div');
    el.id = 'joblog';
    document.body.appendChild(el);
    this.el = el;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.accept) board.accept(b.dataset.accept);
      else if (b.dataset.track) board.track(b.dataset.track);
      else if (b.dataset.close) this.toggle(false);
      this.render();
    });
  }

  toggle(on = !this.open) {
    this.open = on;
    this.el.classList.toggle('on', on);
    document.body.classList.toggle('joblog-open', on);
    if (on) this.render();
  }

  render() {
    if (!this.open) return;
    const B = this.board;
    const card = (m) => {
      const status = B.status(m), who = B.giver(m);
      const away = !B.here(m) ? `<span class="jl-away">in ${regionName(m.region)}</span>` : '';
      const goals = m.goals.map((g, i) => {
        const info = B.goalInfo(m, i);
        return `<li class="${info.done ? 'ok' : ''}">${info.done ? '✔' : '◇'} ${info.label}${status === 'active' && info.progress ? ` <b>${info.progress}</b>` : ''}</li>`;
      }).join('');
      const button = status === 'offered' ? `<button class="jl-accept" data-accept="${m.id}">ACCEPT</button>`
        : status === 'active' ? (B.tracked === m.id ? '<span class="jl-tracked">◆ TRACKING</span>' : `<button class="jl-track" data-track="${m.id}">TRACK</button>`)
        : '';
      return `<div class="jl-card ${status}" style="--c:${who.color}">
        <div class="jl-who">${who.name}</div>
        <div class="jl-body">
          <div class="jl-title">${m.title} ${away}</div>
          <p>${m.brief}</p>
          ${status !== 'done' ? `<ul>${goals}</ul>` : ''}
          ${m.reward?.souls ? `<div class="jl-reward">✦ ${m.reward.souls} souls</div>` : ''}
        </div>
        <div class="jl-act">${button}</div>
      </div>`;
    };
    const section = (title, list, empty) => `<h3>${title}</h3>${list.length ? list.map(card).join('') : `<div class="jl-empty">${empty}</div>`}`;
    this.el.innerHTML = `<div class="jl-panel">
      <div class="jl-head"><b>JOB BOARD</b><small>Things people need done in Hell. Finish them for souls.</small><button class="jl-close" data-close="1">✕</button></div>
      <div class="jl-scroll">
        ${section('NEW', B.byStatus('offered'), 'Nothing new. Keep your radio on.')}
        ${section('IN PROGRESS', B.byStatus('active'), 'No jobs taken.')}
        ${B.byStatus('done').length ? section('DONE', B.byStatus('done'), '') : ''}
      </div>
      <div class="jl-foot"><b>J</b> or <b>ESC</b> to close</div>
    </div>`;
  }
}
