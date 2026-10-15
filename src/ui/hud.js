// On-screen display: speedometer, drift label, crosshair, help, start screen.
const KMH = 3.6; // 1 m/s = 3.6 km/h

export class Hud {
  constructor() {
    document.getElementById('hud').innerHTML = `
      <div id="speedo">
        <div id="speed-num">0</div>
        <div id="speed-unit">KM/H</div>
        <div id="speed-bar"><div id="speed-fill"></div></div>
      </div>
      <div id="drift">DRIFT!</div>
      <div id="airborne">AIR!</div>
      <div id="help">
        <b>W / S</b> gas / brake &amp; reverse<br>
        <b>A / D</b> steer<br>
        <b>SPACE</b> handbrake (drift!)<br>
        <b>MOUSE</b> aim &nbsp; <b>CLICK</b> (hold) fire<br>
        <b>RAM</b> demons at 40+ km/h to splat them<br>
        <b>E</b> grab scrap that fell off your car<br>
        <b>WHEEL</b> zoom &nbsp; <b>R</b> unstick &nbsp; <b>BACKSPACE</b> back to start<br>
        <b>G</b> garage (build!) &nbsp; <b>T</b> tuning panel &nbsp; <b>M</b> mute &nbsp; <b>H</b> hide help
      </div>
      <div id="fps"></div>
      <div id="crosshair"></div>
      <div id="cabin-warn">⚠ CABIN CRITICAL ⚠<small>get to the garage (G) away from demons</small></div>
      <div id="prompt"></div>
      <div id="toasts"></div>
      <div id="compass"><span class="arrow">▲</span><span class="label"></span></div>
      <div id="bossbar"><div class="name"></div><div class="bar"><div class="fill"></div></div></div>
      <div id="victory">ASH PLAINS<br>CLEARED!<small>The Ash Titan is dust. Keep roaming, or press Backspace to return to the start.</small></div>
      <div id="stats">
        <div><span>KILLS</span> <b id="kills">0</b></div>
        <div class="dpm-title">DAMAGE / MINUTE</div>
        <div><span>GUN</span> <b id="dpm-gun">0</b></div>
        <div><span>RAM</span> <b id="dpm-ram">0</b></div>
      </div>
      <div id="splat"></div>
      <div id="hurt"></div>
      <div id="wrecked">WRECKED!<small>starting over: fresh car, starting kit…</small></div>`;
    this.speedNum = document.getElementById('speed-num');
    this.speedFill = document.getElementById('speed-fill');
    this.drift = document.getElementById('drift');
    this.air = document.getElementById('airborne');
    this.help = document.getElementById('help');
    this.fps = document.getElementById('fps');
    this.crosshair = document.getElementById('crosshair');
    this.fpsFrames = 0;
    this.fpsTime = 0;
    this.cabinWarn = document.getElementById('cabin-warn');
    this.prompt = document.getElementById('prompt');
    this.toasts = document.getElementById('toasts');
    this.kills = document.getElementById('kills');
    this.dpmGun = document.getElementById('dpm-gun');
    this.dpmRam = document.getElementById('dpm-ram');
    this.splatEl = document.getElementById('splat');
    this.hurt = document.getElementById('hurt');
    this.wrecked = document.getElementById('wrecked');
    this.statsTimer = 0;
    this.compass = document.getElementById('compass');
    this.bossEl = document.getElementById('bossbar');
    this.victoryEl = document.getElementById('victory');
  }

  // Arrow at the top pointing to the objective (null to hide).
  objective(label, angle) {
    this.compass.style.display = label ? 'flex' : 'none';
    if (!label) return;
    this.compass.querySelector('.label').textContent = label;
    this.compass.querySelector('.arrow').style.transform = `rotate(${angle}rad)`;
  }

  // Boss health bar (null to hide).
  bossBar(name, frac = 1, enraged = false) {
    this.bossEl.classList.toggle('on', !!name);
    if (!name) return;
    this.bossEl.querySelector('.name').textContent = name.toUpperCase() + (enraged ? ' — ENRAGED' : '');
    this.bossEl.querySelector('.fill').style.width = `${Math.max(0, frac) * 100}%`;
    this.bossEl.classList.toggle('enraged', enraged);
  }

  victory() {
    this.victoryEl.classList.add('on');
    setTimeout(() => this.victoryEl.classList.remove('on'), 8000);
  }

  // Big "SPLAT!" popup; shows a combo count for chains of ram kills.
  splat(combo) {
    const words = ['SPLAT!', 'SPLAT!', 'DOUBLE SPLAT!', 'TRIPLE SPLAT!', 'MEGA SPLAT!', 'ULTRA SPLAT!', 'SPLATTACULAR!'];
    const el = this.splatEl;
    el.textContent = combo >= words.length ? `SPLATTACULAR x${combo}!` : words[combo];
    el.classList.remove('pop');
    void el.offsetWidth; // restart the animation
    el.classList.add('pop');
    el.style.fontSize = `${Math.min(40 + combo * 5, 72)}px`;
  }

  combat(car, stats) {
    // No health bar: the car's pieces ARE the health. Just warn when the cabin is nearly gone.
    this.cabinWarn.classList.toggle('on', !car.wrecked && car.cabinFrac < 0.35);
    this.hurt.style.opacity = car.hurtTimer > 0 ? Math.min(1, car.hurtTimer * 4) : 0;
    this.wrecked.classList.toggle('on', car.wrecked);
    this.kills.textContent = stats.kills.gun + stats.kills.ram;
    if ((this.statsTimer -= 1) <= 0) {
      this.statsTimer = 15;
      const d = stats.dpm();
      this.dpmGun.textContent = d.gun;
      this.dpmRam.textContent = d.ram;
    }
  }

  update(car, topSpeed, dt, mouse) {
    const kmh = car.speed * KMH;
    this.speedNum.textContent = Math.round(kmh);
    this.speedFill.style.width = `${Math.min(100, (car.speed / topSpeed) * 100)}%`;
    this.drift.classList.toggle('on', car.drifting);
    this.air.classList.toggle('on', !car.grounded);
    this.crosshair.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;

    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime > 0.5) {
      this.fps.textContent = `${Math.round(this.fpsFrames / this.fpsTime)} FPS`;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }

  // Short message that floats up and fades (e.g. "+1 Machine Gun").
  toast(text, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    this.toasts.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  setPrompt(text) {
    if (this.prompt.textContent !== text) this.prompt.textContent = text;
    this.prompt.classList.toggle('on', !!text);
  }

  toggleHelp() { this.help.classList.toggle('hidden'); }
}

// Shows the title screen and resolves when the player clicks.
export function showStartScreen(regionName) {
  const el = document.getElementById('start');
  el.querySelector('.region').textContent = regionName;
  el.classList.add('ready');
  return new Promise((resolve) => {
    el.addEventListener('click', () => { el.remove(); resolve(); }, { once: true });
  });
}
