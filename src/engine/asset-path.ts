const ABSOLUTE_URL_RE = /^[a-z][a-z\d+\-.]*:/i;

export function toAssetUrl(path: string): string {
  if (!path) return path;
  if (ABSOLUTE_URL_RE.test(path) || path.startsWith('//') || path.startsWith('./') || path.startsWith('../')) {
    return path;
  }

  const normalized = path.replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${normalized}`;
}
