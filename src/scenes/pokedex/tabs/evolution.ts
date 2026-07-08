export interface EvolutionStage {
  id: number;
  name: { en: string; he: string };
  minLevel: number | null;
  trigger: string | null;
  item: string | null;
  evolvesFromId?: number | null;
  special?: { en: string; he: string };
}
