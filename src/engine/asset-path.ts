const ABSOLUTE_URL_RE = /^[a-z][a-z\d+\-.]*:/i;

export function toAssetUrl(path: string): string {
  if (!path) return path;
  if (ABSOLUTE_URL_RE.test(path) || path.startsWith('//') || path.startsWith('./') || path.startsWith('../')) {
    return path;
  }

  const base = import.meta.env.BASE_URL || '/';
  // Already resolved (safe to pass a resolved URL back through, e.g. into loadImage)
  if (base !== '/' && path.startsWith(base)) return path;

  const normalized = path.replace(/^\/+/, '');
  return `${base}${normalized}`;
}
