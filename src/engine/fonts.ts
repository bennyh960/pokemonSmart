/**
 * Font constants and loader for Pokemon Math Adventure.
 *
 * English: "Press Start 2P" — pixel-perfect retro font
 * Hebrew: "Rubik" — clean, highly readable at small sizes
 *
 * Fonts are loaded from Google Fonts via <link> in index.html.
 * loadFonts() ensures they're ready before the game renders.
 */

/** Font family for English/Latin pixel text. */
export const FONT_EN = '"Press Start 2P", monospace';

/** Font family for Hebrew text (readable at small sizes). */
export const FONT_HE = '"Rubik", "Assistant", sans-serif';

/** Detect if a string contains Hebrew characters. */
export function containsHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

/** Pick the right font family based on text content. */
export function fontFor(text: string): string {
  return containsHebrew(text) ? FONT_HE : FONT_EN;
}

/**
 * Wait for both fonts to be loaded and ready.
 * Returns a promise that resolves when fonts are available.
 */
export async function loadFonts(): Promise<void> {
  if (!document.fonts) return;

  await Promise.all([
    document.fonts.load('8px "Press Start 2P"'),
    document.fonts.load('8px "Rubik"'),
  ]);
}
