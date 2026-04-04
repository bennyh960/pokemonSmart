export type QuestionCategory =
  | 'math-addition' | 'math-subtraction' | 'math-multiplication' | 'math-division' | 'math-mixed'
  | 'logic-patterns' | 'logic-sequences' | 'logic-reasoning'
  | 'english-words' | 'english-sentences'
  | 'clock-reading'
  | 'game-logic'
  | 'placeholder';   // development stub — renders "Press Enter to continue"

export interface QuestionSetDef {
  id: string;
  label: string;
  category: QuestionCategory;
  difficultyMin: number;
  difficultyMax: number;
  tags?: string[];
}

export const QUESTION_SETS: Record<string, QuestionSetDef> = {
  'placeholder': {
    id: 'placeholder',
    label: 'Placeholder (Press Enter)',
    category: 'placeholder',
    difficultyMin: 1,
    difficultyMax: 1,
  },
};

export function getQuestionSet(id: string): QuestionSetDef | undefined {
  return QUESTION_SETS[id];
}
