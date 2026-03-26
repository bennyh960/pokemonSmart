// Generates the safari zone map JSON
const W = 55, H = 50;

// Lake bounds (center)
const LAKE = { x1: 20, y1: 19, x2: 34, y2: 31 };

// Small pond (bottom-left sandy area)
const POND = { x1: 8, y1: 38, x2: 14, y2: 42 };

// Build base tiles grid
const tiles = [];
for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    // Check lake
    if (y >= LAKE.y1 && y <= LAKE.y2 && x >= LAKE.x1 && x <= LAKE.x2) {
      const isTop = y === LAKE.y1, isBot = y === LAKE.y2;
      const isLeft = x === LAKE.x1, isRight = x === LAKE.x2;
      if (isTop && isLeft) row.push("wt1-tl");
      else if (isTop && isRight) row.push("wt1tr");
      else if (isBot && isLeft) row.push("wt1bl");
      else if (isBot && isRight) row.push("wt1br");
      else if (isTop) row.push("wt1t");
      else if (isBot) row.push("wt1b");
      else if (isLeft) row.push("wt1l");
      else if (isRight) row.push("wt1r");
      else row.push("wt1");
    }
    // Check small pond
    else if (y >= POND.y1 && y <= POND.y2 && x >= POND.x1 && x <= POND.x2) {
      const isTop = y === POND.y1, isBot = y === POND.y2;
      const isLeft = x === POND.x1, isRight = x === POND.x2;
      if (isTop && isLeft) row.push("wt1-tl");
      else if (isTop && isRight) row.push("wt1tr");
      else if (isBot && isLeft) row.push("wt1bl");
      else if (isBot && isRight) row.push("wt1br");
      else if (isTop) row.push("wt1t");
      else if (isBot) row.push("wt1b");
      else if (isLeft) row.push("wt1l");
      else if (isRight) row.push("wt1r");
      else row.push("wt1");
    }
    // Sandy area (bottom-left quadrant)
    else if (y >= 34 && y <= 44 && x >= 3 && x <= 18 &&
             !(y >= POND.y1 && y <= POND.y2 && x >= POND.x1 && x <= POND.x2)) {
      row.push("s1-5");
    }
    // Mountain floor (top-right)
    else if (y >= 4 && y <= 14 && x >= 36 && x <= 48) {
      row.push("mtcb2");
    }
    else {
      row.push("g1");
    }
  }
  tiles.push(row);
}

// Objects
const objects = [];
function add(key, x, y) { objects.push({ key, x, y }); }

// === BORDER: rocks all around ===
// Top border (row 0, r3 is 2x2)
for (let x = 0; x < W - 1; x += 2) add("r3", x, 0);
// Bottom border
for (let x = 0; x < W - 1; x += 2) add("r3", x, H - 2);
// Left border (skip entry at y=24-26)
for (let y = 2; y < H - 2; y += 2) {
  if (y >= 23 && y <= 27) continue;
  add("r3", 0, y);
}
// Right border
for (let y = 2; y < H - 2; y += 2) {
  add("r3", W - 2, y);
}

// === TREES: scattered around grassy areas ===

// Top-left grassy area (sparse trees)
const treePositions_TL = [
  [4,4],[7,3],[10,5],[13,4],[5,8],[9,9],[12,7],[15,6],
  [3,12],[7,13],[11,11],[14,13],[6,16],[10,15],[4,17],[13,16],
  [16,4],[18,8],[16,12],[18,14],[3,14],[8,6]
];
for (const [x,y] of treePositions_TL) add("t1", x, y);

// Bottom-right dense forest
const treePositions_BR = [];
for (let x = 37; x < 52; x += 2) {
  for (let y = 34; y < 47; y += 2) {
    // Leave some gaps for walkable paths
    if ((x === 41 || x === 45) && y >= 36 && y <= 44) continue; // vertical paths
    if ((y === 38 || y === 42) && x >= 39 && x <= 49) continue; // horizontal paths
    treePositions_BR.push([x, y]);
  }
}
for (const [x,y] of treePositions_BR) add("t1", x, y);
// Add some t2 variety in the forest
for (const [x,y] of [[38,35],[42,35],[46,35],[40,37],[44,37],[48,37],[38,41],[46,41],[40,45],[48,45]]) {
  add("t2", x, y);
}

// Trees around the lake
for (const [x,y] of [[18,18],[19,18],[35,18],[36,18],[18,32],[19,32],[35,32],[36,32],
                       [17,22],[17,26],[36,22],[36,26]]) {
  add("t1", x, y);
}

// Middle-left area trees
for (const [x,y] of [[3,20],[5,22],[8,19],[12,21],[15,20],[4,28],[7,30],[11,29],[14,31],[16,28]]) {
  add("t1", x, y);
}

// === MOUNTAIN formations (top-right area) ===
// Formation 1 at (38, 5)
add("mt2tl", 38, 5); add("mt2t", 39, 5); add("mt2t", 40, 5); add("mt2tr", 41, 5);
add("mt2l", 38, 6); add("mt2r", 41, 6);
add("mt2l", 38, 7); add("mt2r", 41, 7);
add("mt2lb", 38, 8); add("mt2b", 39, 8); add("mt2b", 40, 8); add("mt2br", 41, 8);

// Formation 2 at (44, 7)
add("mt2tl", 44, 7); add("mt2t", 45, 7); add("mt2tr", 46, 7);
add("mt2l", 44, 8); add("mt2r", 46, 8);
add("mt2lb", 44, 9); add("mt2b", 45, 9); add("mt2br", 46, 9);

// Formation 3 at (36, 10)
add("mt2tl", 36, 10); add("mt2t", 37, 10); add("mt2t", 38, 10); add("mt2t", 39, 10); add("mt2tr", 40, 10);
add("mt2l", 36, 11); add("mt2r", 40, 11);
add("mt2l", 36, 12); add("mt2r", 40, 12);
add("mt2lb", 36, 13); add("mt2b", 37, 13); add("mt2b", 38, 13); add("mt2b", 39, 13); add("mt2br", 40, 13);

// Scattered rocks in mountain area
for (const [x,y] of [[43,5],[47,6],[42,11],[48,10],[45,13],[37,15],[43,14],[48,12]]) {
  add("r1", x, y);
}

// === ENCOUNTER GRASS patches ===

// Large patch top-left (rows 5-9, cols 5-14)
for (let x = 5; x <= 14; x++) {
  for (let y = 5; y <= 9; y++) {
    if ((x + y) % 3 !== 0) add("g3", x, y); // skip some for variety
  }
}

// Patch near lake top (rows 16-18, cols 22-30)
for (let x = 22; x <= 30; x++) {
  for (let y = 16; y <= 18; y++) {
    if ((x + y) % 2 !== 0) add("g4", x, y);
  }
}

// Patch near lake bottom (rows 32-34, cols 22-30)
for (let x = 22; x <= 30; x++) {
  for (let y = 32; y <= 34; y++) {
    if ((x + y) % 2 !== 0) add("g3", x, y);
  }
}

// Patch left of lake (cols 14-18, rows 22-28)
for (let x = 14; x <= 18; x++) {
  for (let y = 22; y <= 28; y++) {
    if ((x + y) % 3 !== 0) add("g3", x, y);
  }
}

// Patch right of lake (cols 36-40, rows 22-28)
for (let x = 36; x <= 40; x++) {
  for (let y = 22; y <= 28; y++) {
    if ((x + y) % 3 !== 0) add("g4", x, y);
  }
}

// Top-middle area (rows 3-8, cols 22-34)
for (let x = 22; x <= 34; x++) {
  for (let y = 3; y <= 8; y++) {
    if ((x * 3 + y * 7) % 5 !== 0) continue; // sparse
    add("g3", x, y);
  }
}

// Bottom-left sandy area gets some grass patches at edges
for (let x = 3; x <= 8; x++) {
  for (let y = 34; y <= 36; y++) {
    if ((x + y) % 3 === 0) add("g4", x, y);
  }
}

// Forest floor encounter grass (dense)
for (let x = 39; x <= 49; x++) {
  for (let y = 36; y <= 44; y++) {
    // Only in the walkable paths (where there are no trees)
    if ((x === 41 || x === 45) || ((y === 38 || y === 42) && x >= 39 && x <= 49)) {
      if ((x + y) % 2 === 0) add("g3", x, y);
    }
  }
}

// === FLOWER grass decorations ===
for (const [x,y] of [[6,7],[12,6],[8,14],[15,9],[4,11],[13,12],[25,5],[28,7],[31,4],
                       [10,26],[16,24],[5,36],[12,36],[22,35],[28,34]]) {
  add("g5", x, y);
}

// === SAND edge objects around sandy area ===
// Top edge of sand area
for (let x = 3; x <= 18; x++) {
  add("s1-2", x, 33);
}
// Left edge
for (let y = 34; y <= 44; y++) {
  add("s1-4", 2, y);
}
// Right edge
for (let y = 34; y <= 44; y++) {
  add("s1-6", 19, y);
}
// Bottom edge
for (let x = 3; x <= 18; x++) {
  add("s1-8", x, 45);
}
// Corners
add("s1", 2, 33);      // top-left
add("s1-3", 19, 33);   // top-right
add("s1-7", 2, 45);    // bottom-left
add("s1-9", 19, 45);   // bottom-right

// === ROCKS in sandy area ===
for (const [x,y] of [[5,37],[10,40],[15,39],[7,44],[13,43],[17,41],[4,41],[16,36]]) {
  add("r1", x, y);
}

// === CACTI in sandy area ===
for (const [x,y] of [[6,39],[11,37],[14,42],[9,43],[17,38]]) {
  add("kk", x, y);
}

// === BOAT on the lake ===
add("boat", 25, 24);

// === FENCE sections ===
// Fence near entry
add("f1-1", 2, 22); add("f1-2", 3, 22);
add("f1-5", 2, 28); add("f1-6", 3, 28);
add("f1-3", 2, 23); add("f1-3", 2, 24); add("f1-3", 2, 25); add("f1-3", 2, 26); add("f1-3", 2, 27);

// === BIG ROCK decorations ===
add("r3", 25, 10);
add("r3", 30, 12);
add("r3", 20, 35);
add("r3", 32, 36);

// NPCs
const npcs = [
  {
    id: "safari-guide",
    name: "Safari Guide",
    x: 4, y: 25,
    facing: "right",
    type: "npc",
    dialogue: [
      { en: "Welcome to the Safari Zone!", he: "" },
      { en: "You'll find many rare Pokemon here — in the grass, by the lake, and in the mountains!", he: "" },
      { en: "Be careful in the dense forest to the southeast!", he: "" }
    ],
    spriteType: "char_962c1b"
  },
  {
    id: "safari-fisher",
    name: "Fisherman Wade",
    x: 18, y: 24,
    facing: "right",
    type: "npc",
    dialogue: [
      { en: "I've been fishing in this lake for years!", he: "" },
      { en: "Sometimes rare water Pokemon appear in the deep water.", he: "" }
    ],
    spriteType: "trainer-m"
  },
  {
    id: "safari-hiker",
    name: "Hiker Summit",
    x: 43, y: 6,
    facing: "down",
    type: "npc",
    dialogue: [
      { en: "The mountain area is home to rock and ground type Pokemon.", he: "" },
      { en: "I once saw a Larvitar hiding among the boulders!", he: "" }
    ],
    spriteType: "trainer-m"
  },
  {
    id: "safari-ranger",
    name: "Ranger Flora",
    x: 42, y: 40,
    facing: "left",
    type: "npc",
    dialogue: [
      { en: "This forest is one of the densest in Numeria.", he: "" },
      { en: "Bug and grass Pokemon thrive here.", he: "" }
    ],
    spriteType: "trainer-f"
  },
  {
    id: "safari-scientist",
    name: "Scientist Darwin",
    x: 10, y: 39,
    facing: "up",
    type: "npc",
    dialogue: [
      { en: "I'm studying the unique ecosystem of this sandy area.", he: "" },
      { en: "Ground type Pokemon have adapted perfectly here.", he: "" }
    ],
    spriteType: "dani"
  },
  {
    id: "safari-trainer1",
    name: "Ace Trainer Rex",
    x: 28, y: 14,
    facing: "down",
    type: "trainer",
    dialogue: [
      { en: "The Safari Zone is perfect for training!", he: "" },
      { en: "Let me see how strong your team is!", he: "" }
    ],
    spriteType: "trainer-m",
    party: [
      { pokemonId: 123, level: 12 },
      { pokemonId: 130, level: 14 },
      { pokemonId: 76, level: 13 }
    ],
    reward: { money: 400, items: [{ itemId: "super-potion", quantity: 2 }] },
    lineOfSight: 4
  },
  {
    id: "safari-trainer2",
    name: "Bug Catcher Netz",
    x: 44, y: 38,
    facing: "up",
    type: "trainer",
    dialogue: [
      { en: "The bugs in this forest are incredible!", he: "" }
    ],
    spriteType: "dana",
    party: [
      { pokemonId: 127, level: 12 },
      { pokemonId: 49, level: 13 },
      { pokemonId: 212, level: 14 }
    ],
    reward: { money: 350 },
    lineOfSight: 3
  }
];

const map = {
  id: "safari",
  name: "Safari Zone",
  tileset: "dpp",
  width: W,
  height: H,
  tileSize: 16,
  spawn: { x: 2, y: 25 },
  transitions: [
    { fromX: 0, fromY: 24, toMapId: "sumville", toX: 15, toY: 15 },
    { fromX: 0, fromY: 25, toMapId: "sumville", toX: 15, toY: 16 },
    { fromX: 0, fromY: 26, toMapId: "sumville", toX: 15, toY: 17 }
  ],
  npcs,
  music: "route",
  encounterTableId: "safari",
  tiles,
  objects
};

// Custom JSON serialization for compact tile rows
const clone = { ...map };
const tilesArr = clone.tiles;
const objectsArr = clone.objects;
delete clone.tiles;
delete clone.objects;

let json = JSON.stringify(clone, null, 2);
// Remove closing brace
json = json.slice(0, -1);

// Add tiles
const tileRows = tilesArr.map(row => '    ' + JSON.stringify(row));
json += ',\n  "tiles": [\n' + tileRows.join(',\n') + '\n  ]';

// Add objects
json += ',\n  "objects": ' + JSON.stringify(objectsArr, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');

json += '\n}';

const fs = require('fs');
fs.writeFileSync('src/data/maps/safari.json', json);
console.log(`Safari map generated: ${W}x${H}, ${objectsArr.length} objects`);
