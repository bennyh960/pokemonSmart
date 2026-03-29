/**
 * Player onboarding helpers shared by the hero and name selection scenes.
 */

export const PLAYER_NAME_MAX_LENGTH = 12;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ');
}

export function appendToPlayerNameDraft(current: string, typedText: string): string {
  const sanitized = typedText.replace(/[\r\n\t]/g, '');
  const combined = collapseWhitespace(`${current}${sanitized}`);
  return combined.slice(0, PLAYER_NAME_MAX_LENGTH);
}

export function removeLastPlayerNameChar(current: string): string {
  return current.slice(0, -1);
}

export function finalizePlayerName(draft: string, fallback: string): string {
  const normalized = collapseWhitespace(draft).trim();
  if (normalized.length === 0) return fallback;
  return normalized.slice(0, PLAYER_NAME_MAX_LENGTH);
}
