// THE PAINT SHOP: paint jobs for the car, bought with souls in the garage
// (Grizzle, the demon mechanic, does the spraying). Just looks: no stats.
// Paint jobs you own are kept forever, even through NEW RUN.
//
// A paint job: id, name, price (souls), colors for the body (paint), the
// two roof/hood stripes (stripe) and the trim (accent), and optionally:
//   metal  0..1 how shiny/metallic the body is
//   glow   the body glows this color a little
//   secret true = can't be bought: found in a hidden area
import { SETTINGS } from '../settings.js';

export const PAINTS = [
  { id: 'stock',     name: 'Stars & Stripes',   price: 0,    paint: 0x3a66d0, stripe: 0xf2f0ea, accent: 0xc8202a },
  { id: 'redline',   name: 'Redline',           price: 150,  paint: 0xb81818, stripe: 0x111111, accent: 0xf0f0f0 },
  { id: 'bone',      name: 'Bone White',        price: 150,  paint: 0xe4dcc4, stripe: 0x2a2420, accent: 0x8a1a10 },
  { id: 'hotrod',    name: 'Hot Rod Flames',    price: 250,  paint: 0x141418, stripe: 0xff7a10, accent: 0xffd020 },
  { id: 'muscle',    name: 'Muscle Yellow',     price: 250,  paint: 0xf0b818, stripe: 0x111111, accent: 0x111111 },
  { id: 'army',      name: 'Army Surplus',      price: 300,  paint: 0x4a5a30, stripe: 0xd8d0b0, accent: 0x2a2a20 },
  { id: 'police',    name: 'Hell Patrol',       price: 400,  paint: 0x101014, stripe: 0xf4f4f4, accent: 0x2050ff },
  { id: 'toxic',     name: 'Toxic Waste',       price: 500,  paint: 0x60c020, stripe: 0x101010, accent: 0xf0e020, glow: 0x103000 },
  { id: 'chrome',    name: 'Full Chrome',       price: 900,  paint: 0xd0d6dc, stripe: 0x30343a, accent: 0xc8202a, metal: 0.95 },
  { id: 'gold',      name: 'Solid Gold',        price: 2000, paint: 0xf0c040, stripe: 0x6a4a10, accent: 0xffffff, metal: 0.85 },
  // Secret paint jobs (hidden areas)
  { id: 'oilBaron',  name: 'Oil Baron',         secret: true, paint: 0x0a0a0a, stripe: 0xf0c040, accent: 0xf0c040, metal: 0.6 },
  { id: 'hellfire',  name: 'Hellfire',          secret: true, paint: 0x701008, stripe: 0xff9020, accent: 0xffe040, glow: 0x501000 },
  { id: 'frostbite', name: 'Frostbite',         secret: true, paint: 0x9ad8ff, stripe: 0xffffff, accent: 0x2060a0, metal: 0.4 },
  { id: 'ghost',     name: 'Ghost Rider',       secret: true, paint: 0xe8f0ff, stripe: 0x60ffd0, accent: 0x60ffd0, glow: 0x103830 },
  { id: 'mirror',    name: 'Hall of Mirrors',   secret: true, paint: 0xe0e6ee, stripe: 0xff2030, accent: 0xff2030, metal: 1 },
];
export const paintById = (id) => PAINTS.find((p) => p.id === id) || PAINTS[0];

const KEY = 'helldrive.paint';

// Which paint jobs you own and which one is on the car.
export class PaintShop {
  constructor() {
    this.owned = new Set(['stock']);
    this.current = 'stock';
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || '{}');
      for (const id of d.owned || []) this.owned.add(id);
      if (d.current && this.owned.has(d.current)) this.current = d.current;
    } catch { /* fresh */ }
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify({ owned: [...this.owned], current: this.current })); } catch { /* ignore */ } }
  has(id) { return SETTINGS.dev.creative || this.owned.has(id); }
  // Got one (bought, or found). Returns false if you already had it.
  give(id) { if (this.owned.has(id)) return false; this.owned.add(id); this.save(); return true; }
  use(id) { if (!this.has(id)) return false; this.current = id; this.save(); return true; }
}
