// add new pokemon by ID argv
// if pokemon exists throw error dont overide
// need to fetch sprites , moves (learnest and tm learned), evolution chain , and abilities.
// need update in pokdex schene the EXTRA_POKEMONS_IDS by adding the new pokemon id if its id above 251
import fs from 'fs';
import path from 'path';
import { fetchPokemobAbilitesByPokemonId } from './fetch-abilities';
import { fetchPokemonDataById } from './fetch-pokemon-data';
import { fetchEvolutionChainByPokemonId } from './fetch-evolution-chains';
import { fetchTmLearnsetByPokemonId } from './fetch-tm-learnsets';
import { fetchLearnsetByPokemonId } from './fetch-learnsets';
import { fetchPokemonSpritesById } from './fetch-sprites';

// alwyes make sync this with the pokdex scene EXTRA_POKEMONS_IDS
const EXTRA_POKEMONS_IDS = [
  349, 350, 374, 375, 376, 443, 444, 445, 610, 611, 612, 328, 329, 330, 371, 372, 373, 442, 359, 633, 634, 635, 461,
  464, 466, 467,
];

const pokemonId = parseInt(process.argv[2], 10);

if (isNaN(pokemonId) || pokemonId <= 0) {
  console.error('Please provide a valid Pokemon ID as an argument.');
  process.exit(1);
}
if (pokemonId <= 251 || EXTRA_POKEMONS_IDS.includes(pokemonId)) {
  console.error(
    'That pokemon already exists in the data. Please provide a new Pokemon ID that is not already in the data.',
  );
  process.exit(1);
}

const pokemonDataPath = path.join(__dirname, '../src/data/pokemon.json');
const pokemonAbilitiesPath = path.join(__dirname, '../src/data/pokemon-abilities.json');
const learnsetByLevelPath = path.join(__dirname, '../src/data/learnsets.json');
const learnsetByTMPath = path.join(__dirname, '../src/data/tm-learnsets.json');
const evolutionChainsPath = path.join(__dirname, '../src/data/evolution-chains.json');
const exisitingMovesPath = path.join(__dirname, '../src/data/moves.json');

// Spites base directory - matching your fetchPokemonSpritesById structure
const spritesDir = path.join(__dirname, '../public/sprites/pokemon');

// Read existing files
const pokemonData = JSON.parse(fs.readFileSync(pokemonDataPath, 'utf-8'));
const pokemonAbilities = JSON.parse(fs.readFileSync(pokemonAbilitiesPath, 'utf-8'));
const learnsetByLevel = JSON.parse(fs.readFileSync(learnsetByLevelPath, 'utf-8'));
const learnsetByTM = JSON.parse(fs.readFileSync(learnsetByTMPath, 'utf-8'));
const evolutionChains = JSON.parse(fs.readFileSync(evolutionChainsPath, 'utf-8'));

// Read existing moves for validation (supports both object array or indexed object)
const existingMovesRaw = JSON.parse(fs.readFileSync(exisitingMovesPath, 'utf-8'));
const existingMoveIds = new Set<number>(
  Array.isArray(existingMovesRaw) ? existingMovesRaw.map((m: any) => m.id) : Object.keys(existingMovesRaw).map(Number),
);

// Helper function to safely write JSON back to file
function saveJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Helper to log missing moves in your engine
function validateMoves(moves: { moveId: number }[], section: string) {
  for (const move of moves) {
    if (!existingMoveIds.has(move.moveId)) {
      console.warn(`⚠️  WARNING: Move ID [${move.moveId}] learned via [${section}] is missing from moves.json!`);
    }
  }
}

const handlePokemonData = async () => {
  console.log(`Fetching base data for Pokemon ${pokemonId}...`);
  const pokemonEntry = await fetchPokemonDataById(pokemonId);

  // Append to array
  pokemonData.push(pokemonEntry);
  saveJson(pokemonDataPath, pokemonData);
  console.log(`  ✓ Added ${pokemonEntry.name.en} to pokemon.json`);
};

const handlePokemonAbilities = async () => {
  console.log(`Fetching abilities for Pokemon ${pokemonId}...`);
  const { abilities: regular, hidden } = await fetchPokemobAbilitesByPokemonId(pokemonId);

  // Map ability IDs to string names or structure as you did in previous steps
  // (Assuming you map them to strings or want to see them as object)
  pokemonAbilities[pokemonId] = {
    abilities: regular,
    hidden: hidden,
  };

  saveJson(pokemonAbilitiesPath, pokemonAbilities);
  console.log(`  ✓ Added abilities to pokemon-abilities.json`);
};

const handleEvolutionChains = async () => {
  console.log(`Fetching evolution chain for Pokemon ${pokemonId}...`);
  const evolutionChain = await fetchEvolutionChainByPokemonId(pokemonId);

  // אוסף את כל מזהי הפוקימונים שקיימים בשרשרת החדשה ששלפנו עכשיו
  const newChainPokemonIds = evolutionChain.stages.map((stage: any) => stage.id);

  // מחפש האם יש שרשרת קיימת בקובץ שמכילה לפחות את אחד מהפוקימונים האלו (למשל מכילה את Rhydon או Electabuzz)
  const existingChainIndex = evolutionChains.findIndex((existingChain: any) =>
    existingChain.stages.some((stage: any) => newChainPokemonIds.includes(stage.id)),
  );

  if (existingChainIndex !== -1) {
    // מצאנו שרשרת קיימת! נעדכן אותה לשרשרת המלאה והחדשה
    const oldChainId = evolutionChains[existingChainIndex].chainId;
    console.log(`  ℹ Found existing evolution chain (ID: ${oldChainId}) containing related Pokémon.`);

    // מעדכנים את האינדקס הקיים בנתונים החדשים
    evolutionChains[existingChainIndex] = evolutionChain;

    saveJson(evolutionChainsPath, evolutionChains);
    console.log(`  ✓ Updated existing evolution chain (ID: ${evolutionChain.chainId}) with new evolutionary stages.`);
  } else {
    // שרשרת חדשה לחלוטין (כמו בלדום או גארצ'ומפ) - פשוט דוחפים לסוף
    evolutionChains.push(evolutionChain);
    saveJson(evolutionChainsPath, evolutionChains);
    console.log(`  ✓ Added brand new evolution chain (ID: ${evolutionChain.chainId}) to evolution-chains.json`);
  }
};

const handleLearnsetsByLevel = async () => {
  console.log(`Fetching level-up learnset for Pokemon ${pokemonId}...`);
  const learnset = await fetchLearnsetByPokemonId(pokemonId);

  // Validate if moves exist in your engine data
  validateMoves(learnset, 'Level-Up');

  // Map moves and inject original move generation data (defaults to 1 if unsure, or handled inside fetch)
  learnsetByLevel[pokemonId] = learnset.map((entry) => ({
    moveId: entry.moveId,
    gen: (entry as any).gen ?? 1,
    levelLearned: entry.levelLearned,
  }));

  saveJson(learnsetByLevelPath, learnsetByLevel);
  console.log(`  ✓ Added level-up moves to learnsets.json`);
};

const handleLearnsetsByTM = async () => {
  console.log(`Fetching TM learnset for Pokemon ${pokemonId}...`);
  const tmLearnsets = await fetchTmLearnsetByPokemonId(pokemonId);

  // Validate if moves exist in your engine data
  validateMoves(tmLearnsets, 'TM/HM');

  learnsetByTM[pokemonId] = tmLearnsets.map((entry) => ({
    moveId: entry.moveId,
    gen: (entry as any).gen ?? 1,
  }));

  saveJson(learnsetByTMPath, learnsetByTM);
  console.log(`  ✓ Added TM moves to tm-learnsets.json`);
};

const handleSprites = async () => {
  console.log(`Downloading sprites for Pokemon ${pokemonId}...`);
  // Ensure the target directories exist inside your public folder
  fs.mkdirSync(path.join(spritesDir, 'front'), { recursive: true });
  fs.mkdirSync(path.join(spritesDir, 'back'), { recursive: true });
  fs.mkdirSync(path.join(spritesDir, 'icons'), { recursive: true });

  await fetchPokemonSpritesById(pokemonId, spritesDir, 0, 0, 0);
  console.log(`  ✓ Sprites handled.`);
};

// Syncs EXTRA_POKEMONS_IDS inside this script file automatically
const syncExtraPokemonIdsArray = () => {
  const currentScriptPath = __filename;
  let scriptContent = fs.readFileSync(currentScriptPath, 'utf-8');

  // Add the new id to our local runtime tracker array
  EXTRA_POKEMONS_IDS.push(pokemonId);
  EXTRA_POKEMONS_IDS.sort((a, b) => a - b);

  // Regex to target and update the literal array inside this file
  const updatedArrayString = `const EXTRA_POKEMONS_IDS = [\n  ${EXTRA_POKEMONS_IDS.join(', ')}\n];`;
  scriptContent = scriptContent.replace(/const EXTRA_POKEMONS_IDS = \[\s*[\s\S]*?\];/g, updatedArrayString);

  fs.writeFileSync(currentScriptPath, scriptContent, 'utf-8');
  console.log(`  ✓ Synchronized EXTRA_POKEMONS_IDS array in script file.`);
};

// Execution pipeline
const main = async () => {
  console.log(`=== Starting Pipeline for Pokemon ID: ${pokemonId} ===\n`);
  const startTime = Date.now();

  try {
    await handlePokemonData();
    await handlePokemonAbilities();
    await handleEvolutionChains();
    await handleLearnsetsByLevel();
    await handleLearnsetsByTM();
    await handleSprites();
    syncExtraPokemonIdsArray();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== Done processing Pokemon ${pokemonId} in ${elapsed}s ===`);
  } catch (error) {
    console.error(`\n❌ PIPELINE FAILED for Pokemon ${pokemonId}:`, error);
    process.exit(1);
  }
};

main();
