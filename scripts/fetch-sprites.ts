/**
 * Downloads Gen 2 Gold sprites (front + back + icons) for 251 Pokemon from PokeAPI.
 * Saves to public/sprites/pokemon/front/{id}.png, back/{id}.png, icons/{id}.png
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 100;
const TOTAL_POKEMON = 251;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage(url: string, outPath: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, buffer);
    return true;
  } catch {
    return false;
  }
}

export async function fetchSprites(spritesDir: string): Promise<{ front: number; back: number; icons: number }> {
  let frontCount = 0;
  let backCount = 0;
  let iconCount = 0;

  mkdirSync(join(spritesDir, 'front'), { recursive: true });
  mkdirSync(join(spritesDir, 'back'), { recursive: true });
  mkdirSync(join(spritesDir, 'icons'), { recursive: true });

  for (let id = 1; id <= TOTAL_POKEMON; id++) {
    const isNew = await fetchPokemonSpritesById(id, spritesDir, frontCount, backCount, iconCount);
    if (!isNew) continue;

    if (id % 25 === 0 || id === TOTAL_POKEMON) {
      console.log(`  Sprites: ${id}/${TOTAL_POKEMON} (front: ${frontCount}, back: ${backCount}, icons: ${iconCount})`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return { front: frontCount, back: backCount, icons: iconCount };
}

export async function fetchPokemonSpritesById(
  pokemonId: number,
  spritesDir: string,
  frontCount: number,
  backCount: number,
  iconCount: number,
) {
  const frontPath = join(spritesDir, 'front', `${pokemonId}.png`);
  const backPath = join(spritesDir, 'back', `${pokemonId}.png`);
  const iconPath = join(spritesDir, 'icons', `${pokemonId}.png`);

  // Skip already downloaded
  if (existsSync(frontPath) && existsSync(backPath)) {
    frontCount++;
    backCount++;
    if (existsSync(iconPath)) iconCount++;
    if (pokemonId % 50 === 0 || pokemonId === TOTAL_POKEMON) {
      console.log(`  Sprites: ${pokemonId}/${TOTAL_POKEMON} (skipping existing)`);
    }
    return false;
  }

  const frontUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
  const backUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${pokemonId}.png`;
  const iconUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons/${pokemonId}.png`;

  if (frontUrl && (await downloadImage(frontUrl, frontPath))) frontCount++;
  await sleep(50);
  if (backUrl && (await downloadImage(backUrl, backPath))) backCount++;
  await sleep(50);
  if (iconUrl && (await downloadImage(iconUrl, iconPath))) iconCount++;
  return true;
}
