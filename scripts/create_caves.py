import json, os

MAPS = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'maps')

def save(name, data):
    path = os.path.join(MAPS, f'{name}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'Saved: {name}.json')

def trainer(tid, name, x, y, facing, sprite, party, money, en, he):
    return {'id': tid, 'name': name, 'x': x, 'y': y, 'facing': facing, 'type': 'trainer',
            'spriteType': sprite, 'party': party, 'reward': {'money': money},
            'dialogue': [{'en': en, 'he': he}]}

def npc_entry(nid, name, x, y, facing, sprite, en, he):
    return {'id': nid, 'name': name, 'x': x, 'y': y, 'facing': facing, 'type': 'npc',
            'spriteType': sprite, 'dialogue': [{'en': en, 'he': he}]}

def poke(pid, lv):
    return {'pokemonId': pid, 'level': lv}

def cave_tiles(w, h):
    grid = []
    for row in range(h):
        r = []
        for col in range(w):
            if row == 0 or row == h - 1 or col == 0 or col == w - 1:
                r.append('mtcb2')
            else:
                r.append('g2')
        grid.append(r)
    return grid

# ── DIVIDIA CAVE ─────────────────────────────────────────────────
save('dividia-cave', {
    'id': 'dividia-cave',
    'name': 'Dividia Cave',
    'tileset': 'dpp',
    'width': 30, 'height': 15, 'tileSize': 16,
    'spawn': {'x': 15, 'y': 13},
    'transitions': [
        {'fromX': 14, 'fromY': 14, 'toMapId': 'route-5', 'toX': 15, 'toY': 1},
        {'fromX': 15, 'fromY': 14, 'toMapId': 'route-5', 'toX': 16, 'toY': 1},
        {'fromX': 14, 'fromY': 0, 'toMapId': 'primore', 'toX': 5, 'toY': 7},
        {'fromX': 15, 'fromY': 0, 'toMapId': 'primore', 'toX': 6, 'toY': 7},
    ],
    'music': 'cave',
    'encounterTableId': 'dividia-cave',
    'npcs': [
        trainer('dc-t1', 'Black Belt Shahar', 8, 7, 'right', 'char_d25760',
                [poke(66, 23), poke(67, 24), poke(68, 25)], 720,
                'This cave is a dojo!', 'המערה הזו היא דוג\'ו!'),
        trainer('dc-t2', 'Hiker Nimrod', 22, 7, 'left', 'char_d25760',
                [poke(74, 22), poke(95, 23), poke(76, 24)], 700,
                'You need strength to pass my boulders!', 'אתה צריך כוח כדי לעבור את הסלעים שלי!'),
        trainer('dc-t3', 'Youngster Itai', 14, 5, 'down', 'dani',
                [poke(41, 21), poke(42, 22), poke(169, 23)], 680,
                'Zubat in caves are my friends!', 'זובאט במערות הם החברים שלי!'),
    ],
    'objects': [
        {'key': 'caverock2', 'x': 12, 'y': 2},
        {'key': 'caverock2', 'x': 16, 'y': 2},
        {'key': 'caverock2', 'x': 14, 'y': 3},
        {'key': 'item-greatball', 'x': 5, 'y': 7,
         'interactArgs': {'itemId': 'great-ball', 'itemQty': 3, 'flag': 'item-dc-greatball'}},
    ],
    'tiles': cave_tiles(30, 15)
})

# ── SYMMETRIKA CAVE ──────────────────────────────────────────────
save('symmetrika-cave', {
    'id': 'symmetrika-cave',
    'name': 'Symmetrika Cave',
    'tileset': 'dpp',
    'width': 25, 'height': 20, 'tileSize': 16,
    'spawn': {'x': 10, 'y': 18},
    'transitions': [
        {'fromX': 9,  'fromY': 19, 'toMapId': 'route-6', 'toX': 14, 'toY': 4},
        {'fromX': 10, 'fromY': 19, 'toMapId': 'route-6', 'toX': 15, 'toY': 4},
        {'fromX': 9,  'fromY': 0,  'toMapId': 'symmetrika', 'toX': 8, 'toY': 15},
        {'fromX': 10, 'fromY': 0,  'toMapId': 'symmetrika', 'toX': 9, 'toY': 15},
    ],
    'music': 'cave',
    'encounterTableId': 'symmetrika-cave',
    'npcs': [
        trainer('sc-t1', 'Channeler Ronit', 6, 8, 'right', 'dana',
                [poke(92, 28), poke(93, 29), poke(94, 30)], 880,
                'The ghosts speak to me!', 'הרוחות מדברות אלי!'),
        trainer('sc-t2', 'Hiker Yaron', 18, 10, 'left', 'char_d25760',
                [poke(95, 28), poke(111, 29), poke(112, 30)], 860,
                'Onix rules every cave!', 'אוניקס שולט בכל מערה!'),
        trainer('sc-t3', 'Cooltrainer Shir', 12, 5, 'down', 'dana',
                [poke(200, 29), poke(93, 30), poke(197, 30)], 1000,
                'Rare Pokemon live in these shadows!', 'פוקמון נדירים חיים בצללים האלה!'),
        npc_entry('sc-brock', 'Brock', 3, 4, 'right', 'char_d25760',
                  'I found a rare serum fragment in the deepest part of this cave!',
                  'מצאתי שבר סרום נדיר בחלק העמוק ביותר של המערה הזו!'),
    ],
    'objects': [
        {'key': 'caverock2', 'x': 12, 'y': 10},
        {'key': 'caverock2', 'x': 13, 'y': 10},
        {'key': 'tressureBox', 'x': 12, 'y': 3,
         'interactArgs': {'itemId': 'ultra-ball', 'itemQty': 5, 'flag': 'item-sc-ultraball'}},
    ],
    'tiles': cave_tiles(25, 20)
})

# ── MOUNTAIN CAVE ────────────────────────────────────────────────
save('mountain-cave', {
    'id': 'mountain-cave',
    'name': 'Mountain Cave',
    'tileset': 'dpp',
    'width': 35, 'height': 20, 'tileSize': 16,
    'spawn': {'x': 28, 'y': 14},
    'transitions': [
        {'fromX': 29, 'fromY': 14, 'toMapId': 'route-7', 'toX': 1, 'toY': 4},
        {'fromX': 29, 'fromY': 15, 'toMapId': 'route-7', 'toX': 1, 'toY': 5},
        {'fromX': 1, 'fromY': 9,  'toMapId': 'route-8', 'toX': 28, 'toY': 10},
        {'fromX': 1, 'fromY': 10, 'toMapId': 'route-8', 'toX': 28, 'toY': 11},
    ],
    'music': 'cave',
    'encounterTableId': 'mountain-cave',
    'npcs': [
        trainer('mc-t1', 'Hiker Alon', 10, 7, 'down', 'char_d25760',
                [poke(74, 33), poke(75, 34), poke(76, 35)], 1100,
                'The mountains remember all battles!', 'ההרים זוכרים את כל הקרבות!'),
        trainer('mc-t2', 'Cooltrainer Ben', 22, 13, 'right', 'char_e38ab2',
                [poke(125, 33), poke(26, 34), poke(135, 34)], 1300,
                'Electric, fire, water - I have it all!', 'חשמל, אש, מים - יש לי הכל!'),
        trainer('mc-t3', 'Hiker Ziv', 5, 14, 'up', 'char_d25760',
                [poke(95, 33), poke(111, 33), poke(112, 34)], 1200,
                'STRENGTH is everything in these mountains!', 'כוח הוא הכל בהרים האלה!'),
        trainer('mc-t4', 'Cooltrainer Liel', 18, 5, 'left', 'dana',
                [poke(147, 33), poke(148, 34), poke(142, 35)], 1400,
                'Dragon and Flying - the sky is mine!', 'דרקון וטיסה - השמיים שלי!'),
    ],
    'objects': [
        {'key': 'caverock2', 'x': 15, 'y': 9},
        {'key': 'caverock2', 'x': 15, 'y': 10},
        {'key': 'caverock2', 'x': 16, 'y': 9},
        {'key': 'caverock2', 'x': 16, 'y': 10},
        {'key': 'item-revive', 'x': 8, 'y': 4,
         'interactArgs': {'itemId': 'revive', 'itemQty': 2, 'flag': 'item-mc-revive'}},
        {'key': 'item-ultra ball', 'x': 3, 'y': 15,
         'interactArgs': {'itemId': 'ultra-ball', 'itemQty': 3, 'flag': 'item-mc-ultraball'}},
    ],
    'tiles': cave_tiles(35, 20)
})

print('All 3 cave maps created.')
