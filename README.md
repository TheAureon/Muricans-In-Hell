# HellDrivers

*(A loving nod to Helldivers. Same spirit, but you never leave the car.)*

An open-world, low-poly 3D browser game: invade Hell in a car you build
yourself (and never, ever get out of).

**The story:** gas hit fifteen bucks a gallon. Hank "Redline" Mercer (retired
F1 champion, ex-military) and his genius friend Dr. Wendell "Doc" Pike figure
the biggest untapped oil field has to be in Hell. Doc builds a machine that
rips holes in reality, they drive through, and set up a walled base with a
garage in the Ash Plains. A new game opens with the story (rewatch it from
**STORY** in the menu), and Doc talks to you over the radio as you play. All
the words are in `src/story/story.js` (names are placeholders: change them
there).

- **The base:** you start inside Doc's walls. Drive into the hangar and press
  **G** to build. Demons can't get past the walls and gate wards.
- **Teleporters** need hell magic, so they only exist at a source (look for a
  purple light in the sky). The Ash Plains has none; the Lava Rivers has one
  somewhere. Reach it to set it up: its field heals you completely, and **F**
  on the pad teleports you home to the garage (and back from the base pad).
  Away from base, the garage is only reachable that way.
- **Jobs:** Doc radios in jobs that move the story along: road tests,
  seismic surveys hunting for the oil, demon samples, finding hell magic.
  Open the **job board** (**J** or the JOBS button) to accept them. Your jobs
  show on the right; places to go are marked with beams of light and a
  second arrow at the top. Finished jobs pay souls and unlock the next one.
  Jobs stay done when you wreck. (They live in `src/missions/missions.js`;
  anyone in the cast can give jobs, so new characters can hand them out later.)
- **Wrecked?** The run starts over (souls, unlocks, chassis, build), but you
  respawn at the region's teleporter if you've set one up, or at its start.
  Regions reached, bosses beaten and teleporters are remembered.

**Current stage: Milestone 7 — regions (part 1: the Lava Rivers).** Beat the
Ash Titan and a **Hellgate** opens next to its arena: drive through it to
reach region 2, **the Lava Rivers**: black basalt plains cut by rivers of
lava. Lava burns your car from below and bogs it down, so you'll want an
Armored Car (or better) and **Hover Fans** (each fan = 25% less burn and
drag, 4 = immune). Cross on the dark crust bridges. New demons: **Fire Imps**
(their claws set you on fire) and **Magma Brutes** (ramming one burns your
front). The boss, **the Magma Colossus**, waits on an island in a lake of lava
and throws lava bombs that leave burning pools.

**Graphics:** pick **Low / Medium / High** in the main menu. Low is the
fastest (simple lighting, no shadows). Medium adds shadows, headlights, gun
flashes and glowing eyes/lava. High adds soft shadows, bloom and explosion
flashes. Demons are animated on the graphics card (legs, arms, heads, tails
and wings all move), so hundreds of them stay cheap to draw.

**Region 3, the Bone Mountains** (new): the first region with real hills.
Uphill slows you down, downhill speeds you up, and on a slope too steep for
your tires you slide back down. Cars manage the valleys; treads (Half-Track,
HELL TANK) climb the steep stuff, and the Bone King waits on the highest
plateau. New demons: charging **Bone Rams** and spear-throwing **Bone
Archers**.

The garage also has a button in the bottom-right corner (it lights up when
you're at the base).

Souls from kills buy parts and chassis upgrades in the garage (**G**):
Muscle Car → Armored Car → Half-Track → **HELL TANK**.

Get wrecked (lose the cabin) and the whole run starts over, back in the Ash
Plains: a complete stock car, the starting parts kit, zero souls, nothing unlocked, fresh demons, and
the Titan asleep again. (Set `progression.keepOnWreck` to `true` in
`src/settings.js` to keep souls and unlocks.)

Damage is physical: every body section and bolted-on part takes its own
damage and breaks off as that actual piece. Press **E** to grab scrap, then
bolt it back on in the garage (**G**), anywhere you like.

## How to play (easiest)

Double-click **`HELLDRIVERS.html`**. That's it: no install, works offline.
**On a website:** upload the main folder (or just `index.html`). `index.html`
is the same ready-to-play game as `HELLDRIVERS.html`, so a website that opens
`index.html` by default gets the game. (The developer page in `src/index.html`
only runs through `npm start`; if anything opens it directly, it jumps to the
game.)

To rebuild `HELLDRIVERS.html` and `index.html` after changing code: `npm run build:single`.

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
| G | Garage: build + repair (only at the base) |
| F | Teleport (standing on a teleporter pad) |
| J | Job board: accept and track jobs |
| C | Dev / creative panel: no enemies, no damage, free building, jump to any region |
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
  core/               input, physics setup, sound, random numbers, graphics quality
  regions/            one data file per region (Ash Plains, Lava Rivers, Bone Mountains) + the travel order
  story/              the story text (story.js), the radio, the intro panels
  missions/           the jobs (missions.js), goal kinds (goals.js), the job tracker
  world/              sky, ground, scenery, lava (hazards), Hellgates, lighting, effects, gore, scrap
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
