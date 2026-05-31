import type { MapId } from './map-ids';

/**
 * A named region on the world map image.
 *
 * Coordinates (x1,y1,x2,y2) are in original image pixels — pick them from
 * the source image directly. The renderer multiplies everything by
 * `MapManifest.scale` at draw time, so you never have to do that math.
 *
 * `title` is the label anchor as a percentage offset from (x1,y1):
 *   title[0] = % of rect width  added to x1   (negative = left of rect)
 *   title[1] = % of rect height added to y1   (negative = above rect)
 *   e.g. [50, -30] → horizontally centred, 30% of rect height above y1
 */
type Location = {
  id: MapId;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  title: [number, number];
};

/**
 * City extends Location with an optional fly-spawn override.
 * If flySpawn is omitted the map's own `spawn` field is used when landing.
 */
type CityLocation = Location & {
  flySpawn?: { x: number; y: number };
};

/**
 * Root manifest — one per game world.
 *
 * imageData   — original PNG dimensions + path (used to compute scale ratios)
 * scale       — multiplier applied to the image and all coords at render time
 * cities      — selectable fly destinations; rect drives player-dot placement
 * routes      — label-only; not selectable for Fly
 */
type MapManifest = {
  imageData: {
    width: number;
    height: number;
    path: string;
  };
  scale: number;
  cities: CityLocation[];
  routes: Location[];
};

const mapManifest: MapManifest = {
  imageData: {
    width: 720,
    height: 495,
    path: 'public\\sprites\\overworld\\map.png',
  },
  scale: 1,
  cities: [
    { id: 'zeroville/zeroville', x1: 190, x2: 220, y1: 130, y2: 150, title: [0, -50] },
    { id: 'multiplia/multiplia', x1: 508, y1: 400, x2: 657, y2: 450, title: [0, 0] },
    { id: 'sumville/sumville', x1: 482, y1: 240, x2: 630, y2: 390, title: [10, 20] },
  ],
  routes: [{ id: 'routes/route-1', x1: 410, y1: 240, x2: 480, y2: 260, title: [-5, 0] }],
};

export default mapManifest;
