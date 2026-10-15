# HellDrivers

*(A loving nod to Helldivers. Same spirit, but you never leave the car.)*

An open-world, low-poly 3D browser game: invade Hell in a car you build
yourself (and never, ever get out of).

**Current stage: Milestone 6 — progression.** Every demon you kill drops
**souls**. Spend them in the garage (**G**) to buy parts, unlock new ones
(Heavy Armor, Saw Blade, Hell Cannon...), and upgrade your ride from Muscle
Car → Armored Car → Half-Track → **HELL TANK**. Five kinds of demons roam the
Ash Plains, nastier the further you go; follow the arrow to wake the Ash Titan.

Get wrecked (lose the cabin) and the whole run starts over: a complete stock
car, the starting parts kit, zero souls, nothing unlocked, fresh demons, and
the Titan asleep again. (Set `progression.keepOnWreck` to `true` in
`src/settings.js` to keep souls and unlocks.)

Damage is physical: every body section and bolted-on part takes its own
damage and breaks off as that actual piece. Press **E** to grab scrap, then
bolt it back on in the garage (**G**), anywhere you like.

## How to play (easiest)

Double-click **`HELLDRIVERS.html`**. That's it: no install, works offline.
(The developer version of the page lives in `src/index.html`; it only works through `npm start`.)

To rebuild `HELLDRIVERS.html` after changing code: `npm run build:single`.

## How to run it (developer mode, live-reloads when you edit settings)

You need [Node.js](https://nodejs.org) (the "LTS" version) installed once.
Then, in a terminal inside this folder:

```
npm install && npm start
```

Your browser opens the game at http://localhost:5173. (After the first time,
`npm start` alone is enough.) Stop it with `Ctrl + C` in the terminal.

## Controls

| Key | Action |
| --- | --- |
| W / S (or arrows) | Gas / brake, then reverse |
| A / D | Steer |
| Space | Handbrake (drift!) |
| Mouse | Aim the roof gun |
| Click (hold) | Fire the roof gun |
| Mouse wheel | Zoom camera |
| R | Unstick the car |
| Backspace | Back to the start |
| E | Grab scrap that fell off your car |
| R (in garage) | Turn a loose car piece before placing it |
| Ctrl/⌘ + Z (in garage) | Undo the last change |
| G | Garage: build + repair (pauses; not with demons close) |
| T | Live tuning panel |
| M | Mute |
| H | Hide help |

## Changing how it feels

All the "feel" numbers (speed, turning, weight, grip, camera) are in
**`src/settings.js`**, each with a plain-English comment. Edit a number,
save, and the game reloads. Or press **T** in-game to drag sliders live.

## Folder layout

```
src/
  index.html          the web page (developer version)
  main.js             starts the game and runs the main loop
  settings.js         ALL the tweakable feel numbers
  style.css           look of the on-screen text
  core/               input, physics setup, sound, random numbers
  regions/            one data file per region (Ash Plains so far)
  world/              sky, ground, scenery, visual effects, gore, scrap
  vehicle/            the car's driving physics, 3D model, parts + build grid
  demons/             demon types (data), 3D models, spawning + AI, the boss, fireballs
  combat/             bullets and the damage-per-minute tracker
  camera/             the chase camera
  ui/                 speedometer, help text, tuning panel, garage
```

## Tech

Three.js (3D graphics), Rapier (physics), Vite (dev server / build).
Everything is generated from code: no art or sound files.

To make a version for a website: `npm run build`, then upload the `dist/` folder.
