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
  label?: { en: string; he: string };
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
    {
      id: 'zeroville/zeroville',
      x1: 190,
      x2: 220,
      y1: 130,
      y2: 150,
      title: [50, -150],
      label: { en: 'Zeroville', he: 'זירוויל' },
    },
    {
      id: 'sumville/sumville',
      x1: 400,
      y1: 80,
      x2: 480,
      y2: 150,
      title: [30, -30],
      label: { en: 'Sumville', he: 'סומוויל' },
    },
    {
      id: 'minusburg/minusburg',
      x1: 580,
      y1: 80,
      x2: 650,
      y2: 120,
      title: [30, -60],
      label: { en: 'Minusburg', he: 'מינוסבורג' },
    },
    {
      id: 'multiplia/multiplia',
      x1: 370,
      y1: 210,
      x2: 480,
      y2: 240,
      title: [40, -60],
      label: { en: 'Multiplia', he: 'מולטיפליה' },
    },
    {
      id: 'dividia/dividia',
      x1: 480,
      y1: 320,
      x2: 520,
      y2: 380,
      title: [20, -40],
      label: { en: 'Dividia', he: 'דיבידיה' },
    },
    {
      id: 'fractalis/fractalis',
      x1: 190,
      x2: 310,
      y1: 390,
      y2: 450,
      title: [-30, 0],
      label: { en: 'Fractalis', he: 'פרקטליס' },
    },
    {
      id: 'symmetrika/symmetrika',
      x1: 170,
      x2: 220,
      y1: 250,
      y2: 310,
      title: [30, -20],
      label: { en: 'Symmetrika', he: 'סימטריקה' },
    },
    {
      id: 'percentile/percentile',
      x1: 30,
      y1: 250,
      x2: 100,
      y2: 320,
      title: [0, 0],
      label: { en: 'Percentile', he: 'פרסנטייל' },
    },
    {
      id: 'algebria/algebria',
      x1: 60,
      x2: 120,
      y1: 30,
      y2: 90,
      title: [20, -30],
      label: { en: 'Algebria', he: 'אלגבריה' },
    },
  ],
  routes: [
    { id: 'routes/route-1', x1: 220, y1: 130, x2: 390, y2: 110, title: [50, -10] },
    { id: 'routes/route-2', x1: 480, y1: 130, x2: 580, y2: 90, title: [0, -20] },
    { id: 'routes/route-3', x1: 650, y1: 80, x2: 720, y2: 200, title: [0, -20] },
    { id: 'routes/route-4', x1: 530, y1: 180, x2: 630, y2: 220, title: [0, -20] },
    { id: 'routes/route-5', x1: 450, y1: 280, x2: 530, y2: 325, title: [50, -20] },
    { id: 'routes/route-6', x1: 420, y1: 150, x2: 460, y2: 215, title: [0, -20] },
    { id: 'routes/route-7', x1: 470, y1: 320, x2: 400, y2: 400, title: [50, -20] },
    { id: 'routes/route-8', x1: 180, y1: 400, x2: 245, y2: 300, title: [50, -20] },
    { id: 'routes/route-9', x1: 220, y1: 280, x2: 320, y2: 305, title: [50, -20] },
    { id: 'routes/route-10', x1: 190, y1: 160, x2: 240, y2: 240, title: [-20, 50] },
    { id: 'routes/route-11', x1: 90, y1: 270, x2: 170, y2: 300, title: [50, -20] },
    { id: 'routes/route-12', x1: 255, y1: 270, x2: 140, y2: 300, title: [-20, 50] },
  ],
};

export default mapManifest;
