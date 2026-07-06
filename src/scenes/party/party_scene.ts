// The party_scene is moved to react base
// we keep here stats that been used by other scenes to know which pokemon is selected in the party scene

export let selectedPartyIndex: number = -1;

export function setPartyIndex(index: number): void {
  selectedPartyIndex = index;
}

export function clearSelectedPartyIndex(): void {
  selectedPartyIndex = -1;
}
