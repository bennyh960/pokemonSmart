import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { fetchPokemobAbilitesByPokemonId } from './fetch-abilities.js';
import { fetchPokemonDataById } from './fetch-pokemon-data.js';
import { fetchEvolutionChainByPokemonId } from './fetch-evolution-chains.js';
import { fetchTmLearnsetByPokemonId } from './fetch-tm-learnsets.js';
import { fetchLearnsetByPokemonId } from './fetch-learnsets.js';
import { fetchPokemonSpritesById } from './fetch-sprites.js';

const EXTRA_POKEMONS_IDS = [
  328, 329, 330, 349, 350, 359, 371, 372, 373, 374, 375, 376, 442, 443, 444, 445, 461, 464, 466, 467, 468, 610, 611,
  612, 633, 634, 635,
];

const pokemonId = parseInt(process.argv[2], 10);

if (isNaN(pokemonId) || pokemonId <= 0) {
  console.error('Please provide a valid Pokemon ID as an argument.');
  process.exit(1);
}
if (pokemonId <= 251 || EXTRA_POKEMONS_IDS.includes(pokemonId)) {
  console.error(`That pokemon (${pokemonId}) already exists in the data.`);
  process.exit(1);
}

const pokemonDataPath = path.join(__dirname, '../src/data/pokemon.json');
const pokemonAbilitiesPath = path.join(__dirname, '../src/data/pokemon-abilities.json');
const learnsetByLevelPath = path.join(__dirname, '../src/data/learnsets.json');
const learnsetByTMPath = path.join(__dirname, '../src/data/tm-learnsets.json');
const evolutionChainsPath = path.join(__dirname, '../src/data/evolution-chains.json');
const exisitingMovesPath = path.join(__dirname, '../src/data/moves.json');
const exisitingAbilitiesPath = path.join(__dirname, '../src/data/abilities.json');
const spritesDir = path.join(__dirname, '../public/sprites/pokemon');
const pokedexScenePath = path.join(__dirname, '../src/scenes/pokedex/pokedex_scene.ts');

const pokemonData = JSON.parse(fs.readFileSync(pokemonDataPath, 'utf-8'));
const pokemonAbilities = JSON.parse(fs.readFileSync(pokemonAbilitiesPath, 'utf-8'));
const learnsetByLevel = JSON.parse(fs.readFileSync(learnsetByLevelPath, 'utf-8'));
const learnsetByTM = JSON.parse(fs.readFileSync(learnsetByTMPath, 'utf-8'));
const evolutionChains = JSON.parse(fs.readFileSync(evolutionChainsPath, 'utf-8'));

const existingMovesRaw = JSON.parse(fs.readFileSync(exisitingMovesPath, 'utf-8'));
const existingMoveIds = new Set<number>(
  Array.isArray(existingMovesRaw) ? existingMovesRaw.map((m: any) => m.id) : Object.keys(existingMovesRaw).map(Number),
);

const existingAbilitiesRaw = JSON.parse(fs.readFileSync(exisitingAbilitiesPath, 'utf-8'));
const existingAbilityIds = new Set<number>(
  Array.isArray(existingAbilitiesRaw)
    ? existingAbilitiesRaw.map((a: any) => a.id)
    : Object.keys(existingAbilitiesRaw).map(Number),
);

function saveJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function validateMoves(moves: { moveId: number }[], section: string) {
  let hasMissing = false;
  for (const move of moves) {
    if (!existingMoveIds.has(move.moveId)) {
      console.warn(`  ⚠️  WARNING: Move ID [${move.moveId}] learned via [${section}] is missing from moves.json!`);
      hasMissing = true;
    }
  }
  if (!hasMissing) {
    console.log(`  ✓ All [${section}] moves verified inside moves.json.`);
  }
}
function validateAbilities(abilities: { abilityId: number }[], section: string) {
  let hasMissing = false;
  for (const ability of abilities) {
    if (!existingAbilityIds.has(ability.abilityId)) {
      console.warn(
        `  ⚠️  WARNING: Ability ID [${ability.abilityId}] learned via [${section}] is missing from abilities.json!`,
      );
      hasMissing = true;
    }
  }
  if (!hasMissing) {
    console.log(`  ✓ All [${section}] abilities verified inside abilities.json.`);
  }
}

const handlePokemonData = async () => {
  const pokemonEntry = await fetchPokemonDataById(pokemonId);
  pokemonData.push(pokemonEntry);
  saveJson(
    pokemonDataPath,
    pokemonData.sort((a, b) => a.id - b.id),
  );
  console.log(`  ✓ Added basic stats to pokemon.json`);
};

const handlePokemonAbilities = async () => {
  const { abilities: regular, hidden } = await fetchPokemobAbilitesByPokemonId(pokemonId);
  pokemonAbilities[pokemonId] = { abilities: regular, hidden };
  saveJson(pokemonAbilitiesPath, pokemonAbilities);
  console.log(`  ✓ Added abilities to pokemon-abilities.json`);

  // extract current abilitlies data to check if ability id is there.
  // if not - console.warn
  const allAbilities = [...regular, hidden].filter((id) => id !== null).map((id) => ({ abilityId: id }));
  validateAbilities(allAbilities, 'Abilities');
};

const handleEvolutionChains = async () => {
  console.log(`Fetching evolution chain for Pokemon ${pokemonId}...`);
  // העברת true כדי לעקוף את ה-early return עבור פוקימונים מעל 251
  const evolutionChain = await fetchEvolutionChainByPokemonId(pokemonId, true);

  const newChainPokemonIds = evolutionChain.stages.map((stage: any) => stage.id);
  const existingChainIndex = evolutionChains.findIndex((existingChain: any) =>
    existingChain.stages.some((stage: any) => newChainPokemonIds.includes(stage.id)),
  );

  if (existingChainIndex !== -1) {
    console.log(`  ℹ Replacing outdated evolution chain containing related stages with the complete new chain.`);
    evolutionChains[existingChainIndex] = evolutionChain;
  } else {
    evolutionChains.push(evolutionChain);
  }

  saveJson(evolutionChainsPath, evolutionChains);
  console.log(`  ✓ Evolution chain written to evolution-chains.json`);
};

const handleLearnsetsByLevel = async () => {
  const learnset = await fetchLearnsetByPokemonId(pokemonId);
  validateMoves(learnset, 'Level-Up');

  learnsetByLevel[pokemonId] = learnset.map((e) => ({
    moveId: e.moveId,
    gen: (e as any).gen ?? 1,
    levelLearned: e.levelLearned,
  }));
  saveJson(learnsetByLevelPath, learnsetByLevel);
  console.log(`  ✓ Level-up moves written to learnsets.json`);
};

const handleLearnsetsByTM = async () => {
  const tmLearnsets = await fetchTmLearnsetByPokemonId(pokemonId);
  validateMoves(tmLearnsets, 'TM/HM');

  learnsetByTM[pokemonId] = tmLearnsets.map((entry) => ({
    moveId: entry.moveId,
    gen: (entry as any).gen ?? 1,
  }));
  saveJson(learnsetByTMPath, learnsetByTM);
  console.log(`  ✓ TM moves written to tm-learnsets.json`);
};

const handleSprites = async () => {
  fs.mkdirSync(path.join(spritesDir, 'front'), { recursive: true });
  fs.mkdirSync(path.join(spritesDir, 'back'), { recursive: true });
  fs.mkdirSync(path.join(spritesDir, 'icons'), { recursive: true });

  await fetchPokemonSpritesById(pokemonId, spritesDir, 0, 0, 0);
  console.log(`  ✓ Sprites synced.`);
};

const syncExtraPokemonIdsArray = () => {
  // Push and sort are already handling the live memory update correctly
  EXTRA_POKEMONS_IDS.push(pokemonId);
  EXTRA_POKEMONS_IDS.sort((a, b) => a - b);

  // Generating the array string dynamically based on the updated in-memory array
  const updatedArrayString = `const EXTRA_POKEMONS_IDS = [\n  ${EXTRA_POKEMONS_IDS.join(', ')}\n];`;

  // 1. Sync the script file itself for subsequent executions
  let scriptContent = fs.readFileSync(__filename, 'utf-8');
  scriptContent = scriptContent.replace(/const EXTRA_POKEMONS_IDS = \[\s*[\s\S]*?\];/g, updatedArrayString);
  fs.writeFileSync(__filename, scriptContent, 'utf-8');
  console.log(`  ✓ Updated EXTRA_POKEMONS_IDS inside script file.`);

  // 2. Sync the actual game scene using the exact same dynamic string
  if (fs.existsSync(pokedexScenePath)) {
    let pokedexContent = fs.readFileSync(pokedexScenePath, 'utf-8');
    pokedexContent = pokedexContent.replace(/const EXTRA_POKEMONS_IDS = \[\s*[\s\S]*?\];/g, updatedArrayString);
    fs.writeFileSync(pokedexScenePath, pokedexContent, 'utf-8');
    console.log(`  ✓ Successfully updated EXTRA_POKEMONS_IDS inside pokedex_scene.ts`);
  } else {
    console.warn(`  ❌ WARNING: Could not find pokedex_scene.ts at path: ${pokedexScenePath}`);
  }
};

const main = async () => {
  console.log(`=== Processing Pokemon ID: ${pokemonId} ===`);
  try {
    await handlePokemonData();
    await handlePokemonAbilities();
    await handleEvolutionChains();
    await handleLearnsetsByLevel();
    await handleLearnsetsByTM();
    await handleSprites();
    syncExtraPokemonIdsArray();
    console.log(`\n=== Done processing Pokemon ${pokemonId} Successfully ===`);

    console.log(
      `\n  📢  [REMINDER]: Please translate the Hebrew name (ID: ${pokemonId}) in both files. pokemon.json and evolution-chains.json`,
    );
  } catch (error) {
    console.error(`\n❌ Error occurred in pipeline:`, error);
  }
};

main();
