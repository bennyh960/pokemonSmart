import type { BilingualText } from '../../systems/npc.js';

export interface StoryCharacterDef {
  id: string;
  name: BilingualText;
  role: 'mentor' | 'rival' | 'villain' | 'ally' | 'rocket' | 'gym-leader' | 'elite-four' | 'ai' | 'civilian';
  portraitId?: string;
}

export const CHARACTERS: Record<string, StoryCharacterDef> = {
  'algorithma': {
    id: 'algorithma',
    name: { en: 'Prof. Algorithma', he: 'פרופ׳ אלגוריתמה' },
    role: 'mentor',
  },
  'remainder': {
    id: 'remainder',
    name: { en: 'Remainder', he: 'ריי-מיינדר' },
    role: 'rival',
  },
  'nullx': {
    id: 'nullx',
    name: { en: 'NULL-X', he: 'NULL-X' },
    role: 'ai',
  },
  'oak': {
    id: 'oak',
    name: { en: 'Prof. Oak', he: 'פרופ׳ אוק' },
    role: 'ally',
  },
  'gary': {
    id: 'gary',
    name: { en: 'Gary Oak', he: 'גארי אוק' },
    role: 'rival',
  },
  'brock': {
    id: 'brock',
    name: { en: 'Brock', he: 'ברוק' },
    role: 'ally',
  },
  'misty': {
    id: 'misty',
    name: { en: 'Misty', he: 'מיסטי' },
    role: 'ally',
  },
  'tracey': {
    id: 'tracey',
    name: { en: 'Tracey', he: 'טריסי' },
    role: 'ally',
  },
  'elm': {
    id: 'elm',
    name: { en: 'Prof. Elm', he: 'פרופ׳ אלם' },
    role: 'ally',
  },
  'jessie': {
    id: 'jessie',
    name: { en: 'Jessie', he: 'ג׳סי' },
    role: 'rocket',
  },
  'james': {
    id: 'james',
    name: { en: 'James', he: 'ג׳יימס' },
    role: 'rocket',
  },
  'meowth': {
    id: 'meowth',
    name: { en: 'Meowth', he: 'מיאות׳' },
    role: 'rocket',
  },
  // Gym leaders
  'adda': { id: 'adda', name: { en: 'Adda', he: 'אדה' }, role: 'gym-leader' },
  'minus': { id: 'minus', name: { en: 'Minus', he: 'מינוס' }, role: 'gym-leader' },
  'mila': { id: 'mila', name: { en: 'Mila', he: 'מילה' }, role: 'gym-leader' },
  'divon': { id: 'divon', name: { en: 'Divon', he: 'דיבון' }, role: 'gym-leader' },
  'prima': { id: 'prima', name: { en: 'Prima', he: 'פרימה' }, role: 'gym-leader' },
  'symma': { id: 'symma', name: { en: 'Symma', he: 'סימה' }, role: 'gym-leader' },
  'formax': { id: 'formax', name: { en: 'Formax', he: 'פורמקס' }, role: 'gym-leader' },
  'absa': { id: 'absa', name: { en: 'Absa', he: 'אבסה' }, role: 'gym-leader' },
  // Elite Four
  'parse': { id: 'parse', name: { en: 'PARSE', he: 'PARSE' }, role: 'elite-four' },
  'recurse': { id: 'recurse', name: { en: 'RECURSE', he: 'RECURSE' }, role: 'elite-four' },
  'null-y': { id: 'null-y', name: { en: 'NULL-Y', he: 'NULL-Y' }, role: 'elite-four' },
  'axiom': { id: 'axiom', name: { en: 'AXIOM', he: 'AXIOM' }, role: 'elite-four' },
};

export function getCharacter(id: string): StoryCharacterDef | undefined {
  return CHARACTERS[id];
}
