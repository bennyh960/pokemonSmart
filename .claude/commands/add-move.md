 Add move [MOVE NAME] to the existing battle system using the current metadata-first approach.
 
 First check whether the move can be implemented only through existing metadata in:
 - src/data/move-battle-overrides.ts
 
 Reuse existing helpers where possible:
 - statusEffect(...)
 - volatileEffect(...)
 - userStages(...)
 - targetStages(...)
 - chargingMove(...)
 
 Do not add new engine logic unless the move cannot fit the current metadata model.
 
 If it does fit:
 1. Add the move override.
 2. Add/adjust tests in:
    - src/services/__tests__/battle-metadata.test.ts
    - src/systems/__tests__/battle-system.test.ts
 3. Run:
    - npm test
    - npm run build
 
 If it does NOT fit, explain which new runtime concept is missing:
 - per-battler state
 - side-field state
 - whole-field state
 - special move-specific behavior