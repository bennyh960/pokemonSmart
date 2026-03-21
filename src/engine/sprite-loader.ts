/**
 * SpriteLoader - Async image loading with cache.
 *
 * Loads images from URLs/paths and caches them to avoid duplicate loads.
 * Returns a placeholder (colored rectangle drawn to offscreen canvas)
 * when an image fails to load.
 */

/** Cache of loaded images keyed by URL. */
const imageCache = new Map<string, HTMLImageElement>();

/** Set of URLs currently being loaded (to avoid duplicate requests). */
const loading = new Set<string>();

/** Pending promises for in-flight loads. */
const pending = new Map<string, Promise<HTMLImageElement>>();

/**
 * Replace white/near-white pixels with transparency.
 * Many PokeAPI Gen 2 sprites are indexed PNGs with white backgrounds
 * and no tRNS transparency chunk.
 */
function removeWhiteBackground(source: HTMLImageElement): HTMLImageElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.naturalWidth;
  canvas.height = source.naturalHeight;
  const ctx = canvas.getContext('2d', { alpha: true })!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  // Threshold: treat pixels with R,G,B all >= 248 as background white
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] >= 248 && data[i + 1] >= 248 && data[i + 2] >= 248) {
      data[i + 3] = 0; // set alpha to 0
    }
  }
  ctx.putImageData(imageData, 0, 0);
  const result = new Image();
  result.src = canvas.toDataURL('image/png');
  return result;
}

/** Load an image from a URL, returning from cache if available. */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached) return cached;

  const inflight = pending.get(url);
  if (inflight) return inflight;

  const isSprite = url.includes('/sprites/pokemon/');

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    loading.add(url);
    const img = new Image();
    img.onload = () => {
      const final = isSprite ? removeWhiteBackground(img) : img;
      imageCache.set(url, final);
      loading.delete(url);
      pending.delete(url);
      resolve(final);
    };
    img.onerror = () => {
      loading.delete(url);
      pending.delete(url);
      reject(new Error(`Failed to load image: ${url}`));
    };
    img.src = url;
  });

  pending.set(url, promise);
  return promise;
}

/** Get a cached image synchronously, or null if not loaded yet. */
export function getCachedImage(url: string): HTMLImageElement | null {
  return imageCache.get(url) ?? null;
}

/**
 * Create a placeholder image (solid colored rectangle).
 * Useful as a fallback when sprites haven't loaded yet.
 */
export function createPlaceholder(width: number, height: number, color: string): HTMLImageElement {
  const key = `__placeholder_${width}_${height}_${color}`;
  const cached = imageCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  const img = new Image();
  img.src = canvas.toDataURL();
  imageCache.set(key, img);
  return img;
}

/** Clear the entire sprite cache. */
export function clearSpriteCache(): void {
  imageCache.clear();
  loading.clear();
  pending.clear();
}
