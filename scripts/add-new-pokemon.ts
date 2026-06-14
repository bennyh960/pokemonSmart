import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// פתרון בעיית __dirname ב-ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { fetchPokemobAbilitesByPokemonId } from './fetch-abilities.js';
import { fetchPokemonDataById } from './fetch-pokemon-data.js';
import { fetchEvolutionChainByPokemonId } from './fetch-evolution-chains.js';
import { fetchTmLearnsetByPokemonId } from './fetch-tm-learnsets.js';
import { fetchLearnsetByPokemonId } from './fetch-learnsets.js';
import { fetchPokemonSpritesById } from './fetch-sprites.js';

// תמיד מסונכרן אוטומטית
const EXTRA_POKEMONS_IDS = [
  349, 350, 359, 371, 372, 373, 374, 375, 376, 442, 443, 444, 445, 461, 464, 466, 467, 610, 611, 612, 328, 329, 330,
  633, 634, 635,
];

const pokemonId = parseInt(process.argv[2], 10);

if (isNaN(pokemonId) || pokemonId <= 0) {
  console.error('Please provide a valid Pokemon ID as an argument.');
  process.exit(1);
}
if (pokemonId <= 251 || EXTRA_POKEMONS_IDS.includes(pokemonId)) {
  console.error('That pokemon already exists in the data.');
  process.exit(1);
}

// הגדרת נתיבים
const pokemonDataPath = path.join(__dirname, '../src/data/pokemon.json');
const pokemonAbilitiesPath = path.join(__dirname, '../src/data/pokemon-abilities.json');
const learnsetByLevelPath = path.join(__dirname, '../src/data/learnsets.json');
const learnsetByTMPath = path.join(__dirname, '../src/data/tm-learnsets.json');
const evolutionChainsPath = path.join(__dirname, '../src/data/evolution-chains.json');
const exisitingMovesPath = path.join(__dirname, '../src/data/moves.json');
const spritesDir = path.join(__dirname, '../public/sprites/pokemon');

// ** נתיב לקובץ הפוקדקס של המשחק שבו נמצא המערך השני שתרצה לסנכרן **
// שנה את הנתיב הזה לנתיב המדויק של קובץ הקומפוננטה/סצינה שלך!
const pokedexScenePath = path.join(__dirname, '../src/scenes/pokedex-scene.ts');

// קריאת קבצים
const pokemonData = JSON.parse(fs.readFileSync(pokemonDataPath, 'utf-8'));
const pokemonAbilities = JSON.parse(fs.readFileSync(pokemonAbilitiesPath, 'utf-8'));
const learnsetByLevel = JSON.parse(fs.readFileSync(learnsetByLevelPath, 'utf-8'));
const learnsetByTM = JSON.parse(fs.readFileSync(learnsetByTMPath, 'utf-8'));
const evolutionChains = JSON.parse(fs.readFileSync(evolutionChainsPath, 'utf-8'));

function saveJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

const handleEvolutionChains = async () => {
  console.log(`Fetching evolution chain for Pokemon ${pokemonId}...`);
  const evolutionChain = await fetchEvolutionChainByPokemonId(pokemonId);

  const newChainPokemonIds = evolutionChain.stages.map((stage: any) => stage.id);

  // חיפוש חכם: בודק אם השרשרת החדשה מתחברת לפוקימון קיים כלשהו (כמו Togepi או Togetic)
  const existingChainIndex = evolutionChains.findIndex((existingChain: any) =>
    existingChain.stages.some((stage: any) => newChainPokemonIds.includes(stage.id)),
  );

  if (existingChainIndex !== -1) {
    console.log(`  ℹ Updating existing evolution chain containing old stages with the complete new chain.`);
    evolutionChains[existingChainIndex] = evolutionChain;
  } else {
    evolutionChains.push(evolutionChain);
  }

  saveJson(evolutionChainsPath, evolutionChains);
  console.log(`  ✓ Evolution chain synchronized.`);
};

const handleLearnsetsByTM = async () => {
  console.log(`Fetching TM learnset for Pokemon ${pokemonId}...`);
  let tmLearnsets = await fetchTmLearnsetByPokemonId(pokemonId);

  // פתרון באג TM ריק עבור פוקימוני דור 4+ (כמו טוגקיס) במנוע ישן
  if (!tmLearnsets || tmLearnsets.length === 0) {
    console.log(
      `  ⚠️ TM learnset returned empty from API due to generation priority. Injecting default utility base TMs...`,
    );
    // הזרקת מהלכי בסיס אוניברסליים (כמו Protect, Toxic, Substitute, Rest) כדי שלא יישאר שבור
    tmLearnsets = [{ moveId: 92 }, { moveId: 156 }, { moveId: 164 }, { moveId: 214 }];
  }

  learnsetByTM[pokemonId] = tmLearnsets.map((entry) => ({
    moveId: entry.moveId,
    gen: (entry as any).gen ?? 1,
  }));

  saveJson(learnsetByTMPath, learnsetByTM);
  console.log(`  ✓ Added TM moves.`);
};

// פונקציה לעדכון מערך ה-IDs בשני הקבצים במקביל
const syncExtraPokemonIdsInFiles = () => {
  EXTRA_POKEMONS_IDS.push(pokemonId);
  EXTRA_POKEMONS_IDS.sort((a, b) => a - b);
  const updatedArrayString = `const EXTRA_POKEMONS_IDS = [\n  ${EXTRA_POKEMONS_IDS.join(', ')}\n];`;

  // 1. עדכון בתוך קובץ הסקריפט הנוכחי
  let scriptContent = fs.readFileSync(__filename, 'utf-8');
  scriptContent = scriptContent.replace(/const EXTRA_POKEMONS_IDS = \[\s*[\s\S]*?\];/g, updatedArrayString);
  fs.writeFileSync(__filename, scriptContent, 'utf-8');
  console.log(`  ✓ Updated EXTRA_POKEMONS_IDS in add-new-pokemon.ts`);

  // 2. עדכון בתוך קובץ הסצינה/פוקדקס של המשחק (אם הקובץ קיים)
  if (fs.existsSync(pokedexScenePath)) {
    let pokedexContent = fs.readFileSync(pokedexScenePath, 'utf-8');
    pokedexContent = pokedexContent.replace(/const EXTRA_POKEMONS_IDS = \[\s*[\s\S]*?\];/g, updatedArrayString);
    fs.writeFileSync(pokedexScenePath, pokedexContent, 'utf-8');
    console.log(`  ✓ Updated EXTRA_POKEMONS_IDS in pokedex-scene.ts`);
  } else {
    console.log(`  ℹ Pokedex scene file not found at path. Skip scene array sync.`);
  }
};

const main = async () => {
  console.log(`=== Starting Pipeline for Pokemon ID: ${pokemonId} ===\n`);
  try {
    const pokemonEntry = await fetchPokemonDataById(pokemonId);
    pokemonData.push(pokemonEntry);
    saveJson(pokemonDataPath, pokemonData);

    const { abilities: regular, hidden } = await fetchPokemobAbilitesByPokemonId(pokemonId);
    pokemonAbilities[pokemonId] = { abilities: regular, hidden };
    saveJson(pokemonAbilitiesPath, pokemonAbilities);

    await handleEvolutionChains();

    const learnset = await fetchLearnsetByPokemonId(pokemonId);
    learnsetByLevel[pokemonId] = learnset.map((e) => ({ moveId: e.moveId, gen: 1, levelLearned: e.levelLearned }));
    saveJson(learnsetByLevelPath, learnsetByLevel);

    await handleLearnsetsByTM();

    fs.mkdirSync(path.join(spritesDir, 'front'), { recursive: true });
    fs.mkdirSync(path.join(spritesDir, 'back'), { recursive: true });
    await fetchPokemonSpritesById(pokemonId, spritesDir, 0, 0, 0);

    syncExtraPokemonIdsInFiles();
    console.log(`\n=== Done processing ${pokemonEntry.name.en} ===`);
  } catch (error) {
    console.error(`\n❌ Failed:`, error);
  }
};

main();
