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

/** Load an image from a URL, returning from cache if available. */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached) return cached;

  const inflight = pending.get(url);
  if (inflight) return inflight;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    loading.add(url);
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
      loading.delete(url);
      pending.delete(url);
      resolve(img);
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
