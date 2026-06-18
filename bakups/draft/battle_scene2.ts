// draft2.ts — fully decomposed version of `funcAB` from draft.ts.
//
// Same behavior as the merged funcAB, but split into focused phases that share a
// single mutable `TurnCtx`. Orchestration reads top-to-bottom in `doTurn`:
//
//   buildContext      → aliases, helpers, move selection, struggle, charge detection, pre-move effects
//   runPreMoveChecks  → self-damage fx, can't-act guard, disabled guard, ZzZ  (may end the turn)
//   resolveRedirection→ Sleep Talk / Metronome / Assist / Copycat / Mirror Move (mutates ctx.m)
//   extractFlags      → all behaviorTag booleans + hitCount / healPercent / selfCostAmount
//   consumePp
//   handleSpecialMove → curse, lock-in setup, charge, future sight, disable, haze, snore, focus punch,
//                       substitute, belly drum, baton pass, magic coat, destiny bond, protect/endure,
//                       defender-protected, counter/mirror coat  (may end the turn)
//   computeDamage     → hit/immunity/power/crit/plannedDamage/resolvedEffects → DamagePlan
//   buildMessages     → the message ladder (+ contact abilities, substitute, hazards) → string[]
//   applyImpact       → textBox + playAttackAnimation callback + phase handoff
//
// This file assumes the same ambient module scope as draft.ts (player, enemy, the *BattleState
// and *SideState objects, BTL, audio, animationDirector, and the move/battle helper functions).

type Actor = 'player' | 'enemy'

type PokemonT = typeof player
type BattleStateT = typeof playerBattleState
type SideStateT = typeof playerSideState
type HpBarT = typeof playerHpBar
type SpriteT = typeof BTL.PLY_SPRITE
type MoveT = (typeof player.moves)[number]
type MoveBattleDataT = ReturnType<typeof getMoveBattleData>
type MoveDataT = ReturnType<typeof getMove>
type AttackPhase = 'PLAYER_ATTACK' | 'ENEMY_TURN'

// Every behavior-tag flag for the current move, computed once in extractFlags().
interface MoveFlags {
  isCurse: boolean
  isChargeRelease: boolean
  isChargeStart: boolean
  isTwoTurnFly: boolean
  isTwoTurnDig: boolean
  leaveUserAtOneHp: boolean
  isRest: boolean
  isFocusEnergy: boolean
  isFacadeBoost: boolean
  isFoulPlay: boolean
  isDreamEater: boolean
  isFocusPunch: boolean
  isOhko: boolean
  isProtect: boolean
  isEndure: boolean
  isBrickBreak: boolean
  isDefog: boolean
  isStealthRock: boolean
  isSpikes: boolean
  isToxicSpikes: boolean
  isRapidSpinClear: boolean
  isSubstitute: boolean
  isBellyDrum: boolean
  isMagnitude: boolean
  isBatonPass: boolean
  isCounter: boolean
  isMirrorCoat: boolean
  isMagicCoat: boolean
  isDestinyBond: boolean
  isFutureSight: boolean
  isWeightTarget: boolean
  isWeightRatio: boolean
  isDisable: boolean
  isHaze: boolean
  isNightShade: boolean
  isSuperFang: boolean
  isWeatherMove: boolean
  isSandstormMove: boolean
  isRainDanceMove: boolean
  isSunnyDayMove: boolean
  isHailMove: boolean
  isLockInOutrage: boolean
  isLockInRollout: boolean
  isLockInRage: boolean
  isLockInUproar: boolean
}

// Lock-in "this is the final locked turn" flags, decided during handleSpecialMove setup
// and consumed later by buildMessages / applyImpact for teardown.
interface LockInFinal {
  outrage: boolean
  rollout: boolean
  uproar: boolean
}

// Shared, mutable per-turn state threaded through every phase.
interface TurnCtx {
  actor: Actor
  defenderActor: Actor
  forcedMoveIndex?: number

  attacker: PokemonT
  defender: PokemonT
  attackerBattleState: BattleStateT
  defenderBattleState: BattleStateT
  attackerSideState: SideStateT
  defenderSideState: SideStateT
  attackerHpBar: HpBarT
  defenderHpBar: HpBarT
  attackerSprite: SpriteT
  defenderSprite: SpriteT
  syncAttackerBar: () => void
  syncDefenderBar: () => void
  attackerPhase: AttackPhase

  rtl: boolean
  attackerName: string
  defenderName: string

  m: MoveT // reassigned by redirection / rollout / magnitude / reversal / return-frustration
  moveBattleData: MoveBattleDataT
  moveData: MoveDataT

  startResult: ReturnType<typeof processBeforeMoveEffects>
  turnEffectLines: string[]
  pendingChargeMoveId: number | null
  forcedChargeRelease: boolean

  isRedirected: boolean
  originalMoveName: string
  redirectMsg: string | null

  flags: MoveFlags
  lockIn: LockInFinal
  hitCount: number
  healPercent: number | null
  selfCostAmount: number

  // helpers (closures over this ctx)
  finishTurn: (lines: string[]) => void
  popNumber: (text: string, color: string, sprite?: SpriteT, dy?: number) => void
  selfHitFx: () => void
  hasContrary: (mon: PokemonT) => boolean
  usedMoveLine: () => string
  runLifecycle: (
    opts: Omit<
      Parameters<typeof runMoveLifecycle>[0],
      'move' | 'attackerActor' | 'defenderActor' | 'context' | 'overrideNextPhase'
    >,
  ) => void
}

// Everything computed by computeDamage() and consumed by buildMessages() / applyImpact().
interface DamagePlan {
  hitResult: { hit: boolean; chance: number }
  damageClass: 'physical' | 'special' | 'status'
  weatherAccOverride: number | null
  targetTypeImmune: boolean
  absorbed: boolean
  dreamEaterBlocked: boolean
  criticalHit: boolean
  magnitudeLevel: number
  movePower: number
  rawPower: number
  effectivePower: number
  plannedDamage: number
  suppressHitAudio: boolean
  allowTargetEffects: boolean
  resolvedEffectLines: string[]
  plannedHpEffectAmount: number
  defenderRageBoost: boolean
  // filled in by buildMessages, used by applyImpact:
  contactEffectsOnAttacker: Array<{ status: import('../../types/battle-metadata.js').MajorStatusId }>
  attackerContactRecoil: number
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

function doTurn(args: { forcedMoveIndex?: number; actor: Actor }): void {
  const ctx = buildContext(args)
  if (runPreMoveChecks(ctx)) return
  if (resolveRedirection(ctx)) return
  extractFlags(ctx)
  consumePp(ctx)
  if (handleSpecialMove(ctx)) return
  const plan = computeDamage(ctx)
  const msgs = buildMessages(ctx, plan)
  applyImpact(ctx, plan, msgs)
}

// ---------------------------------------------------------------------------
// Phase 1 — context + helpers + move selection + pre-move effects
// ---------------------------------------------------------------------------

function buildContext({ forcedMoveIndex, actor }: { forcedMoveIndex?: number; actor: Actor }): TurnCtx {
  const defenderActor: Actor = actor === 'player' ? 'enemy' : 'player'
  const attacker = actor === 'player' ? player : enemy
  const defender = actor === 'player' ? enemy : player
  const attackerBattleState = actor === 'player' ? playerBattleState : enemyBattleState
  const defenderBattleState = actor === 'player' ? enemyBattleState : playerBattleState
  const attackerSideState = actor === 'player' ? playerSideState : enemySideState
  const defenderSideState = actor === 'player' ? enemySideState : playerSideState
  const attackerHpBar = actor === 'player' ? playerHpBar : enemyHpBar
  const defenderHpBar = actor === 'player' ? enemyHpBar : playerHpBar
  const attackerSprite = actor === 'player' ? BTL.PLY_SPRITE : BTL.OPP_SPRITE
  const defenderSprite = actor === 'player' ? BTL.OPP_SPRITE : BTL.PLY_SPRITE
  const syncAttackerBar = actor === 'player' ? syncPlayerBar : syncEnemyBar
  const syncDefenderBar = actor === 'player' ? syncEnemyBar : syncPlayerBar
  const attackerPhase: AttackPhase = actor === 'player' ? 'PLAYER_ATTACK' : 'ENEMY_TURN'

  // Clear Destiny Bond from defender when attacker acts (bond expires on user's next turn).
  if (defenderBattleState.destinyBonded) {
    defenderBattleState.destinyBonded = false
    syncDefenderBar()
  }

  const rtl = isRTL()
  const attackerName = getPokemonDisplayName(attacker.id)

  // Move selection (player can be forced; enemy reads its planned/selected index).
  let moveIndex: number
  if (actor === 'player') {
    moveIndex = forcedMoveIndex ?? selMove
  } else {
    moveIndex = enemySelectedMoveIndex >= 0 ? enemySelectedMoveIndex : getPlannedEnemyMoveIndex()
    enemySelectedMoveIndex = -1
  }
  let m = attacker.moves[moveIndex]
  if (!m || attackerBattleState.isStruggleMode) {
    m = { ...STRUGGLE_MOVE }
  }

  // Track last move used (for Copycat / Mirror Move, also for choice item).
  attackerBattleState.lastMoveUsedId = m.id
  lastMoveUsedInBattle = m.id

  const pendingChargeMoveId = getChargingMoveId(attackerBattleState)
  const forcedChargeRelease =
    forcedMoveIndex !== undefined &&
    pendingChargeMoveId !== null &&
    attacker.moves[forcedMoveIndex]?.id === pendingChargeMoveId

  triggerStatusTurnEffects(actor, attacker, attackerBattleState)
  const startResult = processBeforeMoveEffects(attacker, attackerBattleState, Math.random, m.id)
  const turnEffectLines = startResult.events
    .map((event) => getTurnEffectLine(attackerName, event))
    .filter((line): line is string => line !== null)
  syncAttackerBar()

  const ctx: TurnCtx = {
    actor,
    defenderActor,
    forcedMoveIndex,
    attacker,
    defender,
    attackerBattleState,
    defenderBattleState,
    attackerSideState,
    defenderSideState,
    attackerHpBar,
    defenderHpBar,
    attackerSprite,
    defenderSprite,
    syncAttackerBar,
    syncDefenderBar,
    attackerPhase,
    rtl,
    attackerName,
    defenderName: getPokemonDisplayName(defender.id),
    m,
    moveBattleData: getMoveBattleData(m.id),
    moveData: getMove(m.id),
    startResult,
    turnEffectLines,
    pendingChargeMoveId,
    forcedChargeRelease,
    isRedirected: false,
    originalMoveName: getMoveDisplayName(m.id),
    redirectMsg: null,
    flags: {} as MoveFlags, // filled by extractFlags()
    lockIn: { outrage: false, rollout: false, uproar: false },
    hitCount: 1,
    healPercent: null,
    selfCostAmount: 0,
    // helpers below are assigned after ctx exists so they can close over it
    finishTurn: () => {},
    popNumber: () => {},
    selfHitFx: () => {},
    hasContrary: () => false,
    usedMoveLine: () => '',
    runLifecycle: () => {},
  }

  // --- Local helpers (close over ctx; read its mutable fields at call time) ---
  ctx.finishTurn = (lines: string[]): void => {
    textBox = createTextBox(lines, ctx.rtl)
    phase = ctx.attackerPhase
    phaseTimer = 0
  }
  ctx.popNumber = (text: string, color: string, sprite: SpriteT = ctx.attackerSprite, dy = 10): void =>
    spawnDamageNumber(text, sprite.x + sprite.w / 2, sprite.y + dy, color)
  ctx.selfHitFx = (): void => {
    flash = createFlash('#fff29a', 0.12)
    shake = createShake(1.4, 0.18)
    audio.playSFX('hit')
  }
  ctx.hasContrary = (mon: PokemonT): boolean =>
    mon.abilityId ? getAbilityBattleEffects(mon.abilityId).some((e) => e.kind === 'contraryStatChanges') : false
  ctx.usedMoveLine = (): string => t('battle.usedMove', { name: ctx.attackerName, move: getMoveDisplayName(ctx.m.id) })
  ctx.runLifecycle = (opts): void =>
    runMoveLifecycle({
      move: ctx.m,
      attackerActor: ctx.actor,
      defenderActor: ctx.defenderActor,
      context: battleAnimationContext,
      overrideNextPhase: ctx.attackerPhase,
      ...opts,
    })

  return ctx
}

// ---------------------------------------------------------------------------
// Phase 2 — pre-move checks (returns true when the turn is already finished)
// ---------------------------------------------------------------------------

function runPreMoveChecks(ctx: TurnCtx): boolean {
  const { attacker, attackerBattleState, attackerSprite, startResult, turnEffectLines, m } = ctx

  if (startResult.selfDamage > 0) {
    ctx.selfHitFx()
    ctx.popNumber(`-${startResult.selfDamage}`, '#f8d858')
  }

  if (!startResult.canAct) {
    // Player releases via forcedChargeRelease; enemy has no forced index, so detect a charge release directly.
    if (
      ctx.forcedChargeRelease ||
      (ctx.actor === 'enemy' && ctx.pendingChargeMoveId !== null && ctx.pendingChargeMoveId === m.id)
    ) {
      clearChargingMove(attackerBattleState)
    }
    ctx.finishTurn(turnEffectLines.length > 0 ? turnEffectLines : [t('battle.nothingHappened')])
    return true
  }

  if (m.id === attackerBattleState.disabledMoveId || attackerBattleState.softLockedInMovesId?.includes(m.id)) {
    ctx.finishTurn([
      ...turnEffectLines,
      t('battle.moveCantUseDisabled', { name: getPokemonDisplayName(attacker.id), move: getMoveDisplayName(m.id) }),
    ])
    return true
  }

  // ZzZ effect for sleep-usable moves used while asleep.
  if (SLEEP_USABLE_MOVE_IDS.has(m.id) && startResult.events.includes('fast-asleep')) {
    const sx = attackerSprite.x + attackerSprite.w / 2
    const sy = attackerSprite.y - 4
    spawnDamageNumber('Z', sx - 5, sy, '#b088ff')
    spawnDamageNumber('z', sx + 2, sy - 7, '#9060e0')
    spawnDamageNumber('Z', sx + 9, sy - 14, '#b088ff')
  }

  return false
}

// ---------------------------------------------------------------------------
// Phase 3 — move redirection (Sleep Talk / Metronome / Assist / Copycat / Mirror Move)
// ---------------------------------------------------------------------------

// Returns true when the redirect fizzled and already ended the turn (caller should return).
function resolveRedirection(ctx: TurnCtx): boolean {
  const { attacker, defender, defenderBattleState, attackerBattleState, actor } = ctx
  const m = ctx.m

  const redirectTag =
    ctx.moveBattleData?.behaviorTags?.find(
      (tag) =>
        tag === 'sleep-talk' || tag === 'metronome' || tag === 'assist' || tag === 'copycat' || tag === 'mirror-move',
    ) ?? null
  if (redirectTag === null) return false

  if (m.currentPp > 0) {
    if (defender.abilityId === 46) {
      m.currentPp-- // Pressure ability: additional PP reduction on foe's move
    }
    m.currentPp--
  }

  let redirectId: number | null = null
  if (redirectTag === 'sleep-talk') {
    if (attackerBattleState.majorStatus !== 'sleep') {
      ctx.finishTurn([...ctx.turnEffectLines, ctx.usedMoveLine(), t('battle.nothingHappened')])
      return true
    }
    const eligible = attacker.moves.filter((pm) => pm.id !== m.id && pm.currentPp > 0)
    if (eligible.length > 0) redirectId = eligible[Math.floor(Math.random() * eligible.length)].id
  } else if (redirectTag === 'metronome') {
    const eligible = getAllMoves().filter((mv) => !METRONOME_EXCLUDED_MOVE_IDS.has(mv.id))
    if (eligible.length > 0) {
      redirectId = eligible[Math.floor(Math.random() * eligible.length)].id
      flash = createFlash('#e080ff', 0.22)
    }
  } else if (redirectTag === 'assist') {
    if (actor === 'player') {
      const party = getPlayerData().party
      const eligible: number[] = []
      for (let i = 0; i < party.length; i++) {
        if (i === activePartyIndex) continue
        for (const pm of party[i].moves) {
          if (!ASSIST_EXCLUDED_MOVE_IDS.has(pm.id) && pm.currentPp > 0) eligible.push(pm.id)
        }
      }
      if (eligible.length > 0) redirectId = eligible[Math.floor(Math.random() * eligible.length)]
    }
    // enemy has no party — redirectId stays null, fails gracefully
  } else if (redirectTag === 'copycat') {
    redirectId = lastMoveUsedInBattle
  } else if (redirectTag === 'mirror-move') {
    redirectId = defenderBattleState.lastMoveUsedId
  }

  if (redirectId === null) {
    ctx.finishTurn([...ctx.turnEffectLines, ctx.usedMoveLine(), t('battle.noMoveToCall')])
    return true
  }

  const rmd = getMove(redirectId)
  if (rmd) {
    ctx.m = {
      ...m,
      id: redirectId,
      name: rmd.name.en,
      type: rmd.type as PokemonType,
      power: rmd.power ?? 0,
      accuracy: rmd.accuracy ?? 0,
    }
  }
  ctx.moveBattleData = getMoveBattleData(redirectId)
  ctx.moveData = getMove(redirectId)
  if (redirectTag === 'copycat') {
    ctx.redirectMsg = t('battle.copiedMove', { name: ctx.attackerName, move: getMoveDisplayName(redirectId) })
  } else if (redirectTag === 'mirror-move') {
    ctx.redirectMsg = t('battle.mirroredMove', { name: ctx.attackerName, move: getMoveDisplayName(redirectId) })
  } else {
    ctx.redirectMsg = t('battle.calledMove', { move: getMoveDisplayName(redirectId) })
  }
  ctx.isRedirected = true
  return false
}

// ---------------------------------------------------------------------------
// Phase 4 — behavior-tag flags + per-move scalars
// ---------------------------------------------------------------------------

function extractFlags(ctx: TurnCtx): void {
  const md = ctx.moveBattleData
  const has = (tag: string): boolean => md?.behaviorTags?.includes(tag) ?? false

  const isChargeRelease = !ctx.isRedirected && ctx.pendingChargeMoveId !== null && ctx.pendingChargeMoveId === ctx.m.id
  const requiresChargeTurn = has('requires-charge-turn')
  const isSandstormMove = has('sandstorm')
  const isRainDanceMove = has('rain')
  const isSunnyDayMove = has('sun')
  const isHailMove = has('hail')

  ctx.flags = {
    isCurse: has('curse'),
    isChargeRelease,
    isChargeStart: requiresChargeTurn && !isChargeRelease && !ctx.isRedirected,
    isTwoTurnFly: has('two-turn-fly'),
    isTwoTurnDig: has('two-turn-dig'),
    leaveUserAtOneHp: has('leave-user-at-1-hp'),
    isRest: has('rest'),
    isFocusEnergy: has('focus-energy'),
    isFacadeBoost: has('facade-boost'),
    isFoulPlay: has('foul-play'),
    isDreamEater: has('dream-eater'),
    isFocusPunch: has('focus-punch'),
    isOhko: has('ohko'),
    isProtect: has('protect'),
    isEndure: has('endure'),
    isBrickBreak: has('brick-break'),
    isDefog: has('defog'),
    isStealthRock: has('stealth-rock'),
    isSpikes: has('spikes'),
    isToxicSpikes: has('toxic-spikes'),
    isRapidSpinClear: has('rapid-spin-clear'),
    isSubstitute: has('substitute'),
    isBellyDrum: has('belly-drum'),
    isMagnitude: has('magnitude'),
    isBatonPass: has('baton-pass'),
    isCounter: has('counter'),
    isMirrorCoat: has('mirror-coat'),
    isMagicCoat: has('magic-coat'),
    isDestinyBond: has('destiny-bond'),
    isFutureSight: has('future-sight'),
    isWeightTarget: has('weight-target'),
    isWeightRatio: has('weight-ratio'),
    isDisable: has('disable'),
    isHaze: has('haze'),
    isNightShade: has('night-shade'),
    isSuperFang: has('super-fang'),
    isSandstormMove,
    isRainDanceMove,
    isSunnyDayMove,
    isHailMove,
    isWeatherMove: isSandstormMove || isRainDanceMove || isSunnyDayMove || isHailMove,
    isLockInOutrage: has('lock-in-outrage'),
    isLockInRollout: has('lock-in-rollout'),
    isLockInRage: has('lock-in-rage'),
    isLockInUproar: has('lock-in-uproar'),
  }

  ctx.healPercent = md?.healingPercent ?? null
  ctx.hitCount = (() => {
    const min = md?.minHits ?? null
    const max = md?.maxHits ?? null
    if (min !== null && max !== null) return Math.floor(Math.random() * (max - min + 1)) + min
    return 1
  })()
  ctx.selfCostAmount = ctx.flags.leaveUserAtOneHp && ctx.attacker.hp ? Math.max(0, ctx.attacker.hp - 1) : 0
}

function consumePp(ctx: TurnCtx): void {
  if (!ctx.isRedirected && !ctx.flags.isChargeRelease && ctx.m.currentPp > 0) {
    ctx.m.currentPp--
  }
}

// ---------------------------------------------------------------------------
// Phase 5 — special-move handlers (returns true when the turn is finished)
// ---------------------------------------------------------------------------

function handleSpecialMove(ctx: TurnCtx): boolean {
  const f = ctx.flags
  const {
    attacker,
    defender,
    attackerBattleState,
    defenderBattleState,
    attackerSideState,
    attackerName,
    defenderName,
  } = ctx
  let m = ctx.m

  // Curse (Ghost-type): pay half HP to lay the bond on the defender.
  if (f.isCurse && attacker.types.includes('ghost')) {
    if (defenderBattleState.curseActive) {
      m.currentPp++
      ctx.finishTurn([t('battle.alreadyCursed', { name: defenderName })])
      return true
    }
    ctx.moveBattleData!.statChanges = []
    attacker.hp = Math.max(1, attacker.hp - attacker.maxHp / 2)
    defenderBattleState.curseActive = true
    ctx.finishTurn([t('battle.curseGhost', { attacker: attackerName, target: defenderName })])
    return true
  }

  setupLockIn(ctx)
  m = ctx.m // setupLockIn may have reshaped Rollout's move power

  // Charge turn (Fly / Dig / Solar Beam …): vanish/charge, no damage this turn.
  if (f.isChargeStart) {
    startChargingMove(attackerBattleState, m.id)
    if (f.isTwoTurnFly) attackerBattleState.invulnerableState = 'airborne'
    else if (f.isTwoTurnDig) attackerBattleState.invulnerableState = 'underground'

    const chargeStatChanges = applyStatChanges(
      attackerBattleState,
      ctx.moveBattleData?.chargeStatChanges ?? [],
      'user',
      Math.random,
      ctx.hasContrary(attacker),
    )
    const msgs = [...ctx.turnEffectLines, getChargingLine(attackerName, getMoveDisplayName(m.id))]
    for (const change of chargeStatChanges) msgs.push(getStatChangeLine(attackerName, change))
    ctx.syncAttackerBar()
    ctx.finishTurn(msgs)
    playChargeVanishAnimation(ctx)
    return true
  } else if (f.isFutureSight) {
    const msgs = [...ctx.turnEffectLines, ctx.usedMoveLine()]
    if (attackerSideState.futureSightTurnsRemaining > 0) {
      msgs.push(t('battle.futureSightAlreadyActive'))
    } else {
      const damage = calcDamage(
        attacker,
        attackerBattleState,
        defender,
        defenderBattleState,
        ctx.defenderSideState,
        120,
        'psychic',
        'special',
      )
      attackerSideState.futureSightTurnsRemaining = 2
      attackerSideState.futureSightDamage = damage
      msgs.push(t('battle.futureSightSet', { name: attackerName }))
    }
    ctx.finishTurn(msgs)
    return true
  } else if (f.isDisable) {
    // Disable: disables the defender's last used move for 3-6 turns.
    const msgs = [...ctx.turnEffectLines, ctx.usedMoveLine()]
    if (defenderBattleState.disabledMoveId !== null || defenderBattleState.lastMoveUsedId === null) {
      msgs.push(t('battle.nothingHappened'))
    } else {
      const disabledMoveName = getMoveDisplayName(defenderBattleState.lastMoveUsedId)
      defenderBattleState.disabledMoveId = defenderBattleState.lastMoveUsedId
      defenderBattleState.disabledMoveTurnsRemaining = Math.floor(Math.random() * 4) + 3
      msgs.push(t('battle.disableSuccess', { name: getPokemonDisplayName(defender.id), move: disabledMoveName }))
    }
    ctx.finishTurn(msgs)
    return true
  } else if (f.isHaze) {
    const moveName = getMoveDisplayName(m.id)
    ctx.runLifecycle({
      hitTarget: true,
      onImpact: () => {
        attackerBattleState.statModifiers = createEmptyBattleStatModifiers()
        defenderBattleState.statModifiers = createEmptyBattleStatModifiers()
        ctx.syncAttackerBar()
        ctx.syncDefenderBar()
        return {
          endMessages: [
            ...ctx.turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.hazeCleared'),
          ],
        }
      },
    })
    return true
  }

  // Releasing a stored charge (e.g. Fly/Dig landing): drop invulnerability, then continue normally.
  if (f.isChargeRelease) {
    clearChargingMove(attackerBattleState)
    if (attackerBattleState.invulnerableState !== null) {
      attackerBattleState.invulnerableState = null
      animationDirector.setActorState(ctx.actor, { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, rotation: 0 })
    }
  }
  applyPostMoveTurnFlags(attackerBattleState, m.id)

  // Snore: fails if not asleep (move ID 173).
  if (m.id === 173 && attackerBattleState.majorStatus !== 'sleep') {
    ctx.finishTurn([...ctx.turnEffectLines, ctx.usedMoveLine(), t('battle.nothingHappened')])
    return true
  } else if (f.isFocusPunch && attackerBattleState.turnFlags.tookDamageThisTurn) {
    // Focus Punch: fails if the attacker took damage this turn.
    ctx.finishTurn([...ctx.turnEffectLines, ctx.usedMoveLine(), t('battle.focusPunchFailed', { name: attackerName })])
    return true
  } else if (f.isSubstitute) {
    // Substitute: attacker spends 1/4 max HP to create a doll.
    const cost = Math.floor(attacker.maxHp / 4)
    ctx.runLifecycle({
      hitTarget: false,
      canExecute: () => {
        if (attackerBattleState.substituteActive) {
          audio.playSFX('menu-cancel')
          return {
            success: false,
            errorMessages: [
              ...ctx.turnEffectLines,
              ctx.usedMoveLine(),
              t('battle.substituteAlreadyActive', { name: attackerName }),
            ],
          }
        }
        if (attacker.hp <= cost) {
          audio.playSFX('menu-cancel')
          return {
            success: false,
            errorMessages: [
              ...ctx.turnEffectLines,
              ctx.usedMoveLine(),
              t('battle.substituteTooWeak', { name: attackerName }),
            ],
          }
        }
        return null
      },
      onImpact: () => {
        attacker.hp -= cost
        setHP(ctx.attackerHpBar, attacker.hp)
        attackerBattleState.substituteActive = true
        attackerBattleState.substituteHitsAbsorbed = 0
        ctx.syncAttackerBar()
        return {
          endMessages: [
            ...ctx.turnEffectLines,
            ctx.usedMoveLine(),
            t('battle.substituteCreated', { name: attackerName }),
          ],
        }
      },
    })
    return true
  } else if (f.isBellyDrum) {
    // Belly Drum: pay 50% max HP to max out Attack — fails at/below 50% HP.
    const cost = Math.floor(attacker.maxHp / 2)
    const moveName = getMoveDisplayName(m.id)
    ctx.runLifecycle({
      hitTarget: false,
      canExecute: () => {
        if (attacker.hp <= cost) {
          audio.playSFX('menu-cancel')
          return {
            success: false,
            errorMessages: [
              ...ctx.turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              t('battle.bellyDrumTooWeak', { name: attackerName }),
            ],
          }
        }
        return null
      },
      onImpact: () => {
        attacker.hp = Math.max(1, attacker.hp - cost)
        setHP(ctx.attackerHpBar, attacker.hp)
        ctx.syncAttackerBar()
        const statChanges = applyStatChanges(
          attackerBattleState,
          ctx.moveBattleData!.statChanges,
          'user',
          Math.random,
          ctx.hasContrary(attacker),
        )
        ctx.popNumber(`-${cost}`, '#f8d858')
        flash = createFlash('#fff29a', 0.12)
        shake = createShake(1.4, 0.18)
        return {
          endMessages: [
            ...ctx.turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.bellyDrumCost', { name: attackerName }),
            ...statChanges.map((c) => getStatChangeLine(attackerName, c)),
          ],
        }
      },
    })
    return true
  } else if (f.isBatonPass) {
    // Baton Pass: hand the substitute to the incoming Pokemon.
    // !TODO: baton pass on the enemy side is not yet verified — test enemy carryover
    if (attackerBattleState.substituteActive) {
      pendingSubstituteCarryover = { active: true, hitsAbsorbed: attackerBattleState.substituteHitsAbsorbed }
      attackerBattleState.substituteActive = false
    }
    ctx.finishTurn([...ctx.turnEffectLines, ctx.usedMoveLine()])
    return true
  } else if (f.isMagicCoat) {
    // Magic Coat: cloak up to reflect status moves this turn.
    const moveName = getMoveDisplayName(m.id)
    ctx.runLifecycle({
      hitTarget: false,
      onImpact: () => {
        attackerBattleState.turnFlags.magicCoatActive = true
        return {
          endMessages: [
            ...ctx.turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.magicCoatActive', { name: attackerName }),
          ],
        }
      },
    })
    return true
  } else if (f.isDestinyBond) {
    // Destiny Bond: mark the defender — if it KOs the attacker before the attacker acts again, it faints too.
    const moveName = getMoveDisplayName(m.id)
    ctx.runLifecycle({
      hitTarget: false,
      onImpact: () => {
        defenderBattleState.destinyBonded = true
        ctx.syncDefenderBar()
        return {
          endMessages: [
            ...ctx.turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.destinyBondActive', { name: defenderName }),
          ],
        }
      },
    })
    return true
  } else if (f.isProtect || f.isEndure) {
    const moveName = getMoveDisplayName(m.id)
    ctx.runLifecycle({
      hitTarget: false,
      onImpact: () => {
        if (f.isProtect) {
          attackerBattleState.turnFlags.protected = true
          ctx.syncAttackerBar()
        }
        if (f.isEndure) attackerBattleState.turnFlags.endured = true
        return {
          endMessages: [
            ...ctx.turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            f.isProtect ? t('battle.protected', { name: attackerName }) : t('battle.endured', { name: attackerName }),
          ],
        }
      },
    })
    return true
  } else if (doesMoveTargetOpponent(ctx.moveBattleData) && defenderBattleState.turnFlags.protected) {
    // Defender is protected — block the attack entirely.
    ctx.finishTurn([...ctx.turnEffectLines, ctx.usedMoveLine(), t('battle.protectedBlock', { name: defenderName })])
    return true
  } else if (f.isCounter || f.isMirrorCoat) {
    const moveName = getMoveDisplayName(m.id)
    const counterDamage = f.isCounter
      ? attackerBattleState.turnFlags.physicalDamageTakenThisTurn * 2
      : attackerBattleState.turnFlags.specialDamageTakenThisTurn * 2
    ctx.runLifecycle({
      hitTarget: true,
      canExecute: () => {
        if (counterDamage <= 0 || defender.hp <= 0) {
          audio.playSFX('menu-cancel')
          return {
            success: false,
            errorMessages: [
              ...ctx.turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              t('battle.counterFailed', { name: attackerName }),
            ],
          }
        }
        return null
      },
      onImpact: () => {
        applyMoveImpact(
          defender,
          m,
          ctx.defenderHpBar,
          ctx.defenderSprite.x + ctx.defenderSprite.w / 2,
          ctx.defenderSprite.y + 10,
          counterDamage,
          false,
        )
        return { endMessages: [...ctx.turnEffectLines, t('battle.usedMove', { name: attackerName, move: moveName })] }
      },
    })
    return true
  }

  return false
}

// Lock-in bookkeeping (Outrage / Rollout / Rage / Uproar): start or advance the lock,
// reshape Rollout power, and record which turn is the final locked one.
function setupLockIn(ctx: TurnCtx): void {
  const f = ctx.flags
  const s = ctx.attackerBattleState
  let m = ctx.m

  if (f.isLockInOutrage) {
    if (s.lockedInMoveId === null) {
      s.lockedInMoveId = m.id
      s.lockInTurnsRemaining = Math.floor(Math.random() * 2) + 1
    } else {
      s.lockInTurnsRemaining--
    }
  }
  if (f.isLockInRollout) {
    if (s.lockedInMoveId === null) {
      s.lockedInMoveId = m.id
      s.rolloutTurnsActive = 1
    } else {
      s.rolloutTurnsActive = Math.min(5, s.rolloutTurnsActive + 1)
    }
    m = { ...m, power: Math.round(30 * Math.pow(2, s.rolloutTurnsActive - 1)) }
    ctx.m = m
  }
  if (f.isLockInRage && s.lockedInMoveId === null) {
    s.lockedInMoveId = m.id
    s.rageActive = true
  }
  if (f.isLockInUproar) {
    if (s.lockedInMoveId === null) {
      s.lockedInMoveId = m.id
      s.uproarTurnsRemaining = Math.floor(Math.random() * 3) + 2 // 2-4 remaining = 3-5 total
    } else {
      s.uproarTurnsRemaining--
    }
  }

  ctx.lockIn = {
    outrage: f.isLockInOutrage && s.lockInTurnsRemaining === 0,
    rollout: f.isLockInRollout && s.rolloutTurnsActive >= 5,
    uproar: f.isLockInUproar && s.uproarTurnsRemaining === 0,
  }
}

function playChargeVanishAnimation(ctx: TurnCtx): void {
  const { attackerSprite, actor } = ctx
  if (ctx.flags.isTwoTurnFly) {
    animationDirector.play(
      sequenceStep(
        callStep(() => {
          attackFx = createAttackEffect({
            kind: 'fly-vanish',
            sourceX: attackerSprite.x + attackerSprite.w / 2,
            sourceY: attackerSprite.y + attackerSprite.h / 2,
            targetX: attackerSprite.x + attackerSprite.w / 2,
            targetY: attackerSprite.y + attackerSprite.h / 2,
            color: '#a8d8ff',
            accentColor: '#ffffff',
            duration: 0.7,
          })
        }),
        tweenActorStep(actor, { y: -20, scaleX: 0.18, scaleY: 0.18, alpha: 0 }, 0.7, 'easeIn'),
      ),
    )
  } else if (ctx.flags.isTwoTurnDig) {
    animationDirector.play(
      sequenceStep(
        callStep(() => {
          attackFx = createAttackEffect({
            kind: 'dig-vanish',
            sourceX: attackerSprite.x + attackerSprite.w / 2,
            sourceY: attackerSprite.y + attackerSprite.h / 2,
            targetX: attackerSprite.x + attackerSprite.w / 2,
            targetY: attackerSprite.y + attackerSprite.h / 2,
            color: '#a07840',
            accentColor: '#c89850',
            duration: 0.5,
          })
        }),
        tweenActorStep(actor, { y: 8, scaleX: 0.1, scaleY: 0.1, alpha: 0 }, 0.5, 'easeIn'),
      ),
    )
  }
}

// ---------------------------------------------------------------------------
// Phase 6 — damage / effect computation
// ---------------------------------------------------------------------------

function computeDamage(ctx: TurnCtx): DamagePlan {
  const f = ctx.flags
  const { attacker, defender, attackerBattleState, defenderBattleState, defenderSideState, actor } = ctx
  let m = ctx.m

  const damageClass = ctx.moveData?.damageClass ?? (m.power > 0 ? 'physical' : 'status')
  const weatherAccOverride = battleWeather ? getWeatherAccuracyOverride(m.id, battleWeather.type) : null
  let hitResult = doesMoveTargetOpponent(ctx.moveBattleData)
    ? doesMoveHit(weatherAccOverride ?? m.accuracy, attackerBattleState, defenderBattleState)
    : { hit: true, chance: 100 }
  // Invulnerability (Fly/Dig) — only for moves that target the opponent.
  if (hitResult.hit && doesMoveTargetOpponent(ctx.moveBattleData) && defenderBattleState.invulnerableState !== null) {
    const isDigBypass = m.id === 89 || m.id === 90 || f.isMagnitude // Earthquake, Fissure, Magnitude
    const neverMisses = m.accuracy <= 0 || m.accuracy === null
    const bothAirborne =
      attackerBattleState.invulnerableState === 'airborne' && defenderBattleState.invulnerableState === 'airborne'
    if (!neverMisses && !(defenderBattleState.invulnerableState === 'underground' && isDigBypass) && !bothAirborne) {
      hitResult = { hit: false, chance: 0 }
    }
  }

  const hasBypassImmunity = ctx.moveBattleData?.effects?.find((effect) => effect.bayPassImuunity) ?? false
  const targetTypeImmune =
    hitResult.hit &&
    doesMoveTargetOpponent(ctx.moveBattleData) &&
    isTargetImmuneToMoveType(defender, m.type) &&
    !hasBypassImmunity

  let magnitudeLevel = 0
  if (f.isMagnitude) {
    const roll = Math.random() * 100
    if (roll < 20) {
      magnitudeLevel = 1
      m = { ...m, power: 20 }
    } else if (roll < 35) {
      magnitudeLevel = 2
      m = { ...m, power: 30 }
    } else if (roll < 75) {
      magnitudeLevel = 3
      m = { ...m, power: 60 }
    } else if (roll < 95) {
      magnitudeLevel = 4
      m = { ...m, power: 90 }
    } else {
      magnitudeLevel = 5
      m = { ...m, power: 120 }
    }
  }

  const isReversal = ctx.moveBattleData?.behaviorTags?.includes('reversal') ?? false
  if (isReversal) m = { ...m, power: Math.max(1, attacker.maxHp - attacker.hp) }

  // Return / Frustration: power scales with happiness (enemy has no party — uses itself).
  if (m.id === RETURN_MOVE_ID || m.id === FRUSTRATION_MOVE_ID) {
    const h = actor === 'player' ? calcHappiness(attacker, getPlayerData().party) : calcHappiness(attacker, [attacker])
    m = { ...m, power: m.id === RETURN_MOVE_ID ? getReturnPower(h) : getFrustrationPower(h) }
  }
  ctx.m = m

  const movePower = f.isWeightTarget
    ? getWeightTargetPower(computePokemonSize(defender).weightKg)
    : f.isWeightRatio
      ? getWeightRatioPower(computePokemonSize(attacker).weightKg, computePokemonSize(defender).weightKg)
      : m.power
  const absorbed = hitResult.hit && !targetTypeImmune && movePower > 0 && doesAbilityAbsorbMove(defender, m.type)
  const dreamEaterBlocked = f.isDreamEater && defender.status !== 'sleep'
  const attackerHappiness =
    actor === 'player'
      ? hasActiveGame()
        ? calcHappiness(attacker, getPlayerData().party)
        : 0
      : calcHappiness(attacker, [attacker])
  const criticalHit =
    hitResult.hit && !targetTypeImmune && !dreamEaterBlocked && movePower > 0 && !absorbed
      ? rollCriticalHit(m.id, defender, Math.random, attackerBattleState, getHappinessCritBonus(attackerHappiness))
      : false
  const facadeActive =
    f.isFacadeBoost && attacker.status !== null && ['burn', 'paralyze', 'poison'].includes(attacker.status as string)
  const rawPower = facadeActive ? movePower * 2 : movePower
  const digPowerBoost =
    rawPower > 0 &&
    defenderBattleState.invulnerableState === 'underground' &&
    (m.id === 89 || m.id === 90 || f.isMagnitude)
      ? 2
      : 1
  const effectivePower =
    (battleWeather && rawPower > 0
      ? Math.max(1, Math.round(rawPower * getWeatherPowerMultiplier(m.type, battleWeather.type)))
      : rawPower) * digPowerBoost
  const foulPlayAttackStat = f.isFoulPlay ? getModifiedStatValue(defender, defenderBattleState, 'attack') : undefined

  const atkAnimProfile = getAttackAnimationProfile({
    name: ctx.moveData?.name ?? { en: m.name, he: m.name },
    type: m.type,
    power: m.power,
    damageClass: ctx.moveData?.damageClass ?? (m.power > 0 ? 'physical' : 'status'),
    speciesId: attacker.id,
  })
  const suppressHitAudio = ctx.hitCount > 1 && atkAnimProfile.family === 'lunge'

  const plannedDamage = (() => {
    if (!hitResult.hit || targetTypeImmune || absorbed || dreamEaterBlocked) return 0
    if (f.isOhko) return defender.hp
    if (f.isNightShade) return attacker.level
    if (f.isSuperFang) return Math.max(1, Math.floor(defender.hp / 2))
    if (effectivePower <= 0) return 0
    const base = calcDamage(
      attacker,
      attackerBattleState,
      defender,
      defenderBattleState,
      defenderSideState,
      effectivePower,
      m.type,
      damageClass,
      criticalHit,
      foulPlayAttackStat,
    )
    const min = ctx.moveBattleData?.minimumDamage ?? null
    return min !== null ? Math.max(min, base) : base
  })()

  const allowTargetEffects =
    hitResult.hit &&
    !targetTypeImmune &&
    !absorbed &&
    !dreamEaterBlocked &&
    ((!f.isOhko && effectivePower <= 0) || plannedDamage < defender.hp)
  const targetCanStillAct = actor === 'player' ? !enemyAlreadyAttacked : enemyGoesFirst
  const resolvedEffectLines = hitResult.hit
    ? applyResolvedMoveEffects(
        attacker,
        attackerBattleState,
        ctx.attackerSideState,
        ctx.attackerName,
        defender,
        defenderBattleState,
        defenderSideState,
        ctx.defenderName,
        m,
        allowTargetEffects,
        targetCanStillAct,
        defenderBattleState.turnFlags.magicCoatActive,
      )
    : []
  const plannedHpEffectAmount = hitResult.hit
    ? calculateMoveHpEffectAmount(
        plannedDamage,
        ctx.moveBattleData?.drainPercent ?? ctx.moveBattleData?.recoilPercent ?? null,
      )
    : 0
  const defenderRageBoost = hitResult.hit && plannedDamage > 0 && defenderBattleState.rageActive

  return {
    hitResult,
    damageClass,
    weatherAccOverride,
    targetTypeImmune,
    absorbed,
    dreamEaterBlocked,
    criticalHit,
    magnitudeLevel,
    movePower,
    rawPower,
    effectivePower,
    plannedDamage,
    suppressHitAudio,
    allowTargetEffects,
    resolvedEffectLines,
    plannedHpEffectAmount,
    defenderRageBoost,
    contactEffectsOnAttacker: [],
    attackerContactRecoil: 0,
  }
}

// ---------------------------------------------------------------------------
// Phase 7 — message construction (also precomputes contact effects + hazard state)
// ---------------------------------------------------------------------------

function buildMessages(ctx: TurnCtx, plan: DamagePlan): string[] {
  const f = ctx.flags
  const {
    attacker,
    defender,
    attackerBattleState,
    defenderBattleState,
    defenderSideState,
    attackerName,
    defenderName,
  } = ctx
  const m = ctx.m
  const { hitResult, plannedDamage, effectivePower, rawPower, movePower, damageClass } = plan

  const msgs: string[] = [...ctx.turnEffectLines]
  if (ctx.isRedirected) {
    msgs.push(t('battle.usedMove', { name: attackerName, move: ctx.originalMoveName }))
    if (ctx.redirectMsg) msgs.push(ctx.redirectMsg)
  }
  msgs.push(ctx.usedMoveLine())
  if (f.isMagnitude && plan.magnitudeLevel > 0) {
    msgs.push(t('battle.magnitudeLevel', { level: plan.magnitudeLevel, power: m.power }))
  }
  if (battleWeather && doesMoveTargetOpponent(ctx.moveBattleData)) {
    const wName = getWeatherDisplayName(battleWeather.type)
    const wMult = getWeatherPowerMultiplier(m.type, battleWeather.type)
    if (rawPower > 0 && wMult > 1)
      msgs.push(t('battle.weatherPowerBoosted', { weather: wName, move: getMoveDisplayName(m.id) }))
    else if (rawPower > 0 && wMult < 1)
      msgs.push(t('battle.weatherPowerReduced', { weather: wName, move: getMoveDisplayName(m.id) }))
    if (plan.weatherAccOverride === 0)
      msgs.push(t('battle.weatherAccuracyMax', { weather: wName, move: getMoveDisplayName(m.id) }))
  }

  if (effectivePower > 0) {
    if (!hitResult.hit) {
      msgs.push(t('battle.moveMissed', { name: attackerName }))
    } else {
      if (plan.criticalHit) msgs.push(t('battle.criticalHit'))
      const et = effText(m.type, defender.types)
      if (et) msgs.push(et)
      if (plannedDamage > 0 && defender.abilityId !== null) {
        const abilityMsg = getDefenderAbilityActivationMsg(
          defender,
          defenderBattleState,
          getAbilityBattleEffects(defender.abilityId),
          m.type,
          defenderName,
        )
        if (abilityMsg) msgs.push(abilityMsg)
      }
      if (f.isWeightTarget || f.isWeightRatio) {
        const moveName = getMoveDisplayName(m.id)
        if (f.isWeightTarget) {
          const wStr = computePokemonSize(defender).weightKg.toFixed(1)
          if (movePower <= 40)
            msgs.push(t('battle.weightTargetWeak', { target: defenderName, weight: wStr, move: moveName }))
          else if (movePower <= 80)
            msgs.push(t('battle.weightTargetMedium', { target: defenderName, weight: wStr, move: moveName }))
          else msgs.push(t('battle.weightTargetStrong', { target: defenderName, weight: wStr, move: moveName }))
        } else {
          if (movePower <= 40) msgs.push(t('battle.weightRatioWeak', { move: moveName }))
          else if (movePower <= 80) msgs.push(t('battle.weightRatioMedium', { attacker: attackerName, move: moveName }))
          else
            msgs.push(t('battle.weightRatioStrong', { attacker: attackerName, target: defenderName, move: moveName }))
        }
      }
    }
  } else if (f.isOhko && hitResult.hit && !plan.targetTypeImmune) {
    msgs.push(t('battle.ohkoHit'))
  } else if ((f.isSuperFang || f.isNightShade) && hitResult.hit && !plan.targetTypeImmune) {
    if (f.isSuperFang) msgs.push(t('battle.superFangHit'))
  } else if (!hitResult.hit) {
    msgs.push(t('battle.moveMissed', { name: attackerName }))
  } else if (plan.targetTypeImmune) {
    msgs.push(t('battle.noEffect'))
  } else if (plan.dreamEaterBlocked) {
    msgs.push(t('battle.dreamEaterFailed'))
    audio.playSFX('menu-cancel')
  } else if (f.isRest) {
    msgs.push(t('battle.restSleep', { name: attackerName }))
  } else if (f.isFocusEnergy) {
    msgs.push(t('battle.focusEnergy', { name: attackerName }))
  } else if (f.isProtect || f.isEndure) {
    msgs.push(f.isProtect ? t('battle.protected', { name: attackerName }) : t('battle.endured', { name: attackerName }))
  } else if (ctx.healPercent !== null) {
    msgs.push(t('battle.healedHp', { name: attackerName }))
  } else if (f.isStealthRock) {
    msgs.push(defenderSideState.stealthRockActive ? t('battle.hazardAlreadySet') : t('battle.stealthRockSet'))
  } else if (f.isSpikes) {
    msgs.push(defenderSideState.spikesLayers < 3 ? t('battle.spikesSet') : t('battle.hazardAlreadySet'))
  } else if (f.isToxicSpikes) {
    msgs.push(defenderSideState.toxicSpikesLayers < 2 ? t('battle.toxicSpikesSet') : t('battle.hazardAlreadySet'))
  } else if (f.isWeatherMove) {
    pushWeatherMessages(ctx, msgs)
  } else if (plan.resolvedEffectLines.length === 0) {
    msgs.push(t('battle.nothingHappened'))
    audio.playSFX('menu-cancel')
  }

  if (ctx.hitCount > 1 && hitResult.hit && !plan.targetTypeImmune && !plan.dreamEaterBlocked) {
    msgs.push(t('battle.multiHit', { count: ctx.hitCount }))
  }
  if (plan.plannedHpEffectAmount > 0) {
    if (ctx.moveBattleData?.drainPercent)
      msgs.push(t('battle.drainHeal', { name: attackerName, amount: plan.plannedHpEffectAmount }))
    if (ctx.moveBattleData?.recoilPercent)
      msgs.push(t('battle.recoilHit', { name: attackerName, amount: plan.plannedHpEffectAmount }))
  }
  if (ctx.selfCostAmount > 0) msgs.push(t('battle.recoilHit', { name: attackerName, amount: ctx.selfCostAmount }))
  msgs.push(...plan.resolvedEffectLines)

  // Lock-in teardown lines.
  if (ctx.lockIn.outrage) msgs.push(t('battle.lockInOutrageStopped', { name: attackerName }))
  if (ctx.lockIn.uproar) msgs.push(t('battle.lockInUproarStopped', { name: attackerName }))
  if (plan.defenderRageBoost) msgs.push(t('battle.lockInRageBoost', { name: defenderName }))

  if (f.isBrickBreak && hitResult.hit && plannedDamage > 0) {
    if (defenderSideState.reflectTurnsRemaining > 0 || defenderSideState.lightScreenTurnsRemaining > 0)
      msgs.push(t('battle.brickBreakShatter'))
  }
  if (f.isRapidSpinClear && hitResult.hit && plannedDamage > 0) {
    const hadHazards =
      ctx.attackerSideState.stealthRockActive ||
      ctx.attackerSideState.spikesLayers > 0 ||
      ctx.attackerSideState.toxicSpikesLayers > 0
    if (hadHazards || attackerBattleState.leechSeeded) msgs.push(t('battle.rapidSpinClear', { name: attackerName }))
  }
  if (f.isDefog) msgs.push(t('battle.defogClear'))

  // Contact ability: defender's ability may status/recoil the attacker on a physical hit.
  if (hitResult.hit && damageClass === 'physical' && plannedDamage > 0 && defender.abilityId !== null) {
    for (const effect of getAbilityBattleEffects(defender.abilityId)) {
      if (effect.kind === 'contactStatusChance' && !attacker.status && Math.random() * 100 < effect.chance) {
        plan.contactEffectsOnAttacker.push({ status: effect.status })
        const statusLine = getStatusAppliedLine(attackerName, effect.status)
        if (statusLine) msgs.push(statusLine)
      }
      if (effect.kind === 'contactRecoilDamage') {
        plan.attackerContactRecoil += Math.max(1, Math.floor((attacker.maxHp * effect.damagePercent) / 100))
      }
    }
  }

  // Substitute hit message (precomputed from planned damage).
  if (
    hitResult.hit &&
    plannedDamage > 0 &&
    doesMoveTargetOpponent(ctx.moveBattleData) &&
    defenderBattleState.substituteActive
  ) {
    const attackerMoveName = ctx.moveData?.name?.en ?? m.name
    if (!isSubstituteBypass(attackerMoveName, attacker.abilityId)) {
      const subThreshold = Math.floor(defender.maxHp / 4)
      msgs.push(plannedDamage >= subThreshold ? t('battle.substituteDestroyed') : t('battle.substituteAbsorbed'))
    } else if (plannedDamage > 0) {
      msgs.push(t('battle.substituteBypassed'))
    }
  }

  applyEntryHazards(ctx)
  return msgs
}

function pushWeatherMessages(ctx: TurnCtx, msgs: string[]): void {
  const f = ctx.flags
  const newWeatherType: WeatherConditionId = f.isSandstormMove
    ? 'sandstorm'
    : f.isRainDanceMove
      ? 'rain'
      : f.isSunnyDayMove
        ? 'sun'
        : 'hail'
  if (battleWeather?.type === newWeatherType) {
    const alreadyActiveKeys: Record<WeatherConditionId, string> = {
      sandstorm: 'battle.sandstormAlreadyActive',
      rain: 'battle.rainAlreadyActive',
      sun: 'battle.sunAlreadyActive',
      hail: 'battle.hailAlreadyActive',
    }
    msgs.push(t(alreadyActiveKeys[newWeatherType]))
  } else {
    const prevWeatherType = battleWeather?.type ?? null
    if (prevWeatherType) {
      msgs.push(
        t('battle.weatherOverride', {
          new: getWeatherDisplayName(newWeatherType),
          old: getWeatherDisplayName(prevWeatherType),
        }),
      )
    }
    const boostMsgs = activateWeather(newWeatherType, ctx.actor)
    msgs.push(getWeatherStartedLine(newWeatherType))
    msgs.push(...boostMsgs)
  }
}

// Entry hazards: set state now (Magic Coat reflects status-class hazards back to the attacker's side).
function applyEntryHazards(ctx: TurnCtx): void {
  const f = ctx.flags
  const reflected =
    ctx.defenderBattleState.turnFlags.magicCoatActive &&
    ctx.m.power <= 0 &&
    (f.isStealthRock || f.isSpikes || f.isToxicSpikes)
  const target = reflected ? ctx.attackerSideState : ctx.defenderSideState
  const syncBar = reflected ? ctx.syncAttackerBar : ctx.syncDefenderBar
  if (f.isStealthRock && !target.stealthRockActive) {
    target.stealthRockActive = true
    syncBar()
  }
  if (f.isSpikes && target.spikesLayers < 3) {
    target.spikesLayers++
    syncBar()
  }
  if (f.isToxicSpikes && target.toxicSpikesLayers < 2) {
    target.toxicSpikesLayers++
    syncBar()
  }
}

// ---------------------------------------------------------------------------
// Phase 8 — animation + impact resolution
// ---------------------------------------------------------------------------

function applyImpact(ctx: TurnCtx, plan: DamagePlan, msgs: string[]): void {
  textBox = createTextBox(msgs, ctx.rtl)
  playAttackAnimation(
    ctx.attacker,
    ctx.actor,
    ctx.defenderActor,
    ctx.m,
    animationDirector,
    audio,
    battleAnimationContext,
    () => onImpactResolved(ctx, plan),
    plan.hitResult.hit && !plan.absorbed && plan.plannedDamage > 0,
    ctx.hitCount,
  )
  phase = ctx.attackerPhase
  phaseTimer = 0
}

function onImpactResolved(ctx: TurnCtx, plan: DamagePlan): void {
  const f = ctx.flags
  const { attacker, defender, attackerBattleState, defenderBattleState } = ctx
  const m = ctx.m
  const { hitCount, healPercent } = ctx
  const { plannedDamage, damageClass, suppressHitAudio } = plan

  // Rest: full heal + sleep + PP restore.
  if (f.isRest) {
    applyRestEffect(attacker, attackerBattleState)
    setHP(ctx.attackerHpBar, attacker.hp)
    setStatus(ctx.attackerHpBar, attacker.status ?? '')
    ctx.popNumber(`+${attacker.maxHp}`, '#48d870')
    audio.playSFX('heal')
  }
  // Heal % moves (Recover, Roost, Milk Drink, …).
  if (healPercent !== null) {
    const healed = applyHealPercent(attacker, healPercent, ctx.moveBattleData?.behaviorTags)
    if (healed > 0) {
      setHP(ctx.attackerHpBar, attacker.hp)
      ctx.popNumber(`+${healed}`, '#48d870')
      audio.playSFX('heal')
    }
  }
  if (f.isFocusEnergy) attackerBattleState.critBoost = true

  if (plan.hitResult.hit) {
    let totalActualDamage = 0
    const attackerMoveName = ctx.moveData?.name?.en ?? m.name
    const attackerBypassesSub = isSubstituteBypass(attackerMoveName, attacker.abilityId)
    for (let hit = 0; hit < hitCount; hit++) {
      if (defender.hp <= 0) break
      const popupY = ctx.defenderSprite.y + 10 - hit * 5
      if (
        plannedDamage > 0 &&
        defenderBattleState.substituteActive &&
        !attackerBypassesSub &&
        doesMoveTargetOpponent(ctx.moveBattleData)
      ) {
        const threshold = Math.floor(defender.maxHp / 4)
        if (plannedDamage >= threshold) {
          defenderBattleState.substituteActive = false
          defenderBattleState.substituteHitsAbsorbed = 0
          substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: ctx.defenderActor }
        } else {
          defenderBattleState.substituteHitsAbsorbed++
          substituteDollFlash = { timer: 0, duration: 0.3, color: '#ffffff', side: ctx.defenderActor }
          if (defenderBattleState.substituteHitsAbsorbed >= 2) {
            defenderBattleState.substituteActive = false
            defenderBattleState.substituteHitsAbsorbed = 0
            substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: ctx.defenderActor }
          }
        }
        continue
      }
      totalActualDamage += applyMoveImpact(
        defender,
        m,
        ctx.defenderHpBar,
        ctx.defenderSprite.x + ctx.defenderSprite.w / 2,
        popupY,
        plannedDamage,
        suppressHitAudio,
      )
    }
    // Endure: survive a lethal hit at 1 HP.
    if (defender.hp <= 0 && defenderBattleState.turnFlags.endured) {
      defender.hp = 1
      setHP(ctx.defenderHpBar, 1)
    }
    const actualDamage = totalActualDamage
    if (actualDamage > 0) {
      defenderBattleState.turnFlags.tookDamageThisTurn = true
      if (damageClass === 'physical') defenderBattleState.turnFlags.physicalDamageTakenThisTurn += actualDamage
      else if (damageClass === 'special') defenderBattleState.turnFlags.specialDamageTakenThisTurn += actualDamage
      if (plan.defenderRageBoost) {
        defenderBattleState.statModifiers.attack = applyBattleStatDelta(defenderBattleState.statModifiers.attack, 1)
      }
      const drained = applyDrainHealing(attacker, actualDamage, ctx.moveBattleData?.drainPercent ?? null)
      if (drained > 0) {
        setHP(ctx.attackerHpBar, attacker.hp)
        ctx.popNumber(`+${drained}`, '#48d870')
        audio.playSFX('heal')
      }
      const recoil = applyRecoilDamage(attacker, actualDamage, ctx.moveBattleData?.recoilPercent ?? null)
      if (recoil.damage > 0) {
        setHP(ctx.attackerHpBar, attacker.hp)
        ctx.popNumber(`-${recoil.damage}`, '#f8d858')
        ctx.selfHitFx()
      }
      // Contact ability status onto the attacker.
      for (const contactEffect of plan.contactEffectsOnAttacker) {
        applyMajorStatus(attacker, attackerBattleState, { status: contactEffect.status, chance: 100, target: 'user' })
        setStatus(ctx.attackerHpBar, attacker.status ?? '')
      }
      // Contact recoil onto the attacker (Rough Skin, Iron Barbs).
      if (plan.attackerContactRecoil > 0 && attacker.hp > 0) {
        attacker.hp = Math.max(0, attacker.hp - plan.attackerContactRecoil)
        setHP(ctx.attackerHpBar, attacker.hp)
        ctx.popNumber(`-${plan.attackerContactRecoil}`, '#f84038')
        audio.playSFX('hit')
      }
    }
  }

  if (f.leaveUserAtOneHp) {
    const selfCost = applyLeaveUserAtOneHpCost(attacker)
    if (selfCost.damage > 0) {
      setHP(ctx.attackerHpBar, attacker.hp)
      ctx.popNumber(`-${selfCost.damage}`, '#f8d858')
      ctx.selfHitFx()
    }
  }

  // Destiny Bond: if the attacker KOed the defender and the attacker carries the bond, it faints too.
  if (defender.hp <= 0 && attackerBattleState.destinyBonded) {
    attackerBattleState.destinyBonded = false
    attacker.hp = 0
    setHP(ctx.attackerHpBar, 0)
    pendingDestinyBondMsg = t('battle.destinyBondTrigger', { name: ctx.attackerName })
  }
  if (f.isBrickBreak) {
    clearScreens(ctx.defenderSideState)
    ctx.syncDefenderBar()
  }
  if (f.isRapidSpinClear) {
    clearEntryHazards(ctx.attackerSideState)
    attackerBattleState.leechSeeded = false
    ctx.syncAttackerBar()
  }
  if (f.isDefog) {
    clearEntryHazards(ctx.attackerSideState)
    clearEntryHazards(ctx.defenderSideState)
    clearScreens(ctx.attackerSideState)
    clearScreens(ctx.defenderSideState)
    ctx.syncAttackerBar()
    ctx.syncDefenderBar()
  }

  // Lock-in teardown.
  if (ctx.lockIn.outrage) {
    attackerBattleState.lockedInMoveId = null
    attackerBattleState.lockInTurnsRemaining = 0
    attackerBattleState.confusionTurnsRemaining = Math.floor(Math.random() * 4) + 2
  }
  if (f.isLockInRollout && (ctx.lockIn.rollout || !plan.hitResult.hit)) {
    attackerBattleState.lockedInMoveId = null
    attackerBattleState.rolloutTurnsActive = 0
  }
  if (ctx.lockIn.uproar) {
    attackerBattleState.lockedInMoveId = null
    attackerBattleState.uproarTurnsRemaining = 0
  }
}
