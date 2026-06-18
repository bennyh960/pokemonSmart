function funcA(forcedMoveIndex?: number): void {
  // Clear Destiny Bond from enemy when player acts (bond expires on user's next turn)
  if (enemyBattleState.destinyBonded) {
    enemyBattleState.destinyBonded = false
    syncEnemyBar()
  }
  const rtl = isRTL()
  const attackerName = getPokemonDisplayName(player.id)
  const moveIndex = forcedMoveIndex ?? selMove
  let m = player.moves[moveIndex]

  if (playerBattleState.isStruggleMode) {
    m = { ...STRUGGLE_MOVE }
  }

  // Track last move used (for Copycat / Mirror Move also for choice item)
  playerBattleState.lastMoveUsedId = m.id
  lastMoveUsedInBattle = m.id

  const pendingChargeMoveId = getChargingMoveId(playerBattleState)
  const forcedChargeRelease =
    forcedMoveIndex !== undefined &&
    pendingChargeMoveId !== null &&
    player.moves[forcedMoveIndex]?.id === pendingChargeMoveId
  triggerStatusTurnEffects('player', player, playerBattleState)
  const startResult = processBeforeMoveEffects(player, playerBattleState, Math.random, m.id)
  const turnEffectLines = startResult.events
    .map((event) => getTurnEffectLine(attackerName, event))
    .filter((line): line is string => line !== null)
  syncPlayerBar()
  if (startResult.selfDamage > 0) {
    flash = createFlash('#fff29a', 0.12)
    shake = createShake(1.4, 0.18)
    spawnDamageNumber(
      `-${startResult.selfDamage}`,
      BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
      BTL.PLY_SPRITE.y + 10,
      '#f8d858',
    )
    audio.playSFX('hit')
  }

  if (!startResult.canAct) {
    if (forcedChargeRelease) {
      clearChargingMove(playerBattleState)
    }
    textBox = createTextBox(turnEffectLines.length > 0 ? turnEffectLines : [t('battle.nothingHappened')], rtl)
    phase = 'PLAYER_ATTACK'
    phaseTimer = 0
    return
  }

  if (m.id === playerBattleState.disabledMoveId || playerBattleState.softLockedInMovesId?.includes(m.id)) {
    const msgs = [...turnEffectLines]
    msgs.push(
      t('battle.moveCantUseDisabled', { name: getPokemonDisplayName(player.id), move: getMoveDisplayName(m.id) }),
    )
    textBox = createTextBox(msgs, rtl)
    phase = 'PLAYER_ATTACK'
    phaseTimer = 0
    return
  }

  // ZzZ floating text when a sleep-usable move is used while asleep
  if (SLEEP_USABLE_MOVE_IDS.has(m.id) && startResult.events.includes('fast-asleep')) {
    const sx = BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2
    const sy = BTL.PLY_SPRITE.y - 4
    spawnDamageNumber('Z', sx - 5, sy, '#b088ff')
    spawnDamageNumber('z', sx + 2, sy - 7, '#9060e0')
    spawnDamageNumber('Z', sx + 9, sy - 14, '#b088ff')
  }

  const defenderName = getPokemonDisplayName(enemy.id)
  let moveBattleData = getMoveBattleData(m.id)

  // --- Move Redirection (Sleep Talk / Metronome / Assist / Copycat / Mirror Move) ---
  const originalMoveName = getMoveDisplayName(m.id)
  const redirectTag =
    moveBattleData?.behaviorTags?.find(
      (tag) =>
        tag === 'sleep-talk' || tag === 'metronome' || tag === 'assist' || tag === 'copycat' || tag === 'mirror-move',
    ) ?? null
  let isRedirected = false
  let redirectMsg: string | null = null

  if (redirectTag !== null) {
    if (m.currentPp > 0) {
      if (enemy.abilityId === 46) {
        m.currentPp-- // Pressure ability: additional PP reduction on foe's move
      }
      m.currentPp--
    }
    let redirectId: number | null = null

    if (redirectTag === 'sleep-talk') {
      if (playerBattleState.majorStatus !== 'sleep') {
        const msgs = [
          ...turnEffectLines,
          t('battle.usedMove', { name: attackerName, move: originalMoveName }),
          t('battle.nothingHappened'),
        ]
        textBox = createTextBox(msgs, rtl)
        phase = 'PLAYER_ATTACK'
        phaseTimer = 0
        return
      }
      const eligible = player.moves.filter((pm) => pm.id !== m.id && pm.currentPp > 0)
      if (eligible.length > 0) redirectId = eligible[Math.floor(Math.random() * eligible.length)].id
    } else if (redirectTag === 'metronome') {
      const eligible = getAllMoves().filter((mv) => !METRONOME_EXCLUDED_MOVE_IDS.has(mv.id))
      if (eligible.length > 0) {
        redirectId = eligible[Math.floor(Math.random() * eligible.length)].id
        flash = createFlash('#e080ff', 0.22)
      }
    } else if (redirectTag === 'assist') {
      const party = hasActiveGame() ? getPlayerData().party : []
      const eligible: number[] = []
      for (let i = 0; i < party.length; i++) {
        if (i === activePartyIndex) continue
        for (const pm of party[i].moves) {
          if (!ASSIST_EXCLUDED_MOVE_IDS.has(pm.id) && pm.currentPp > 0) eligible.push(pm.id)
        }
      }
      if (eligible.length > 0) {
        redirectId = eligible[Math.floor(Math.random() * eligible.length)]
        flash = createFlash('#80e0ff', 0.2)
      }
    } else if (redirectTag === 'copycat') {
      redirectId = lastMoveUsedInBattle
    } else if (redirectTag === 'mirror-move') {
      redirectId = enemyBattleState.lastMoveUsedId
    }

    if (redirectId === null) {
      const msgs = [
        ...turnEffectLines,
        t('battle.usedMove', { name: attackerName, move: originalMoveName }),
        t('battle.noMoveToCall'),
      ]
      textBox = createTextBox(msgs, rtl)
      phase = 'PLAYER_ATTACK'
      phaseTimer = 0
      return
    }

    const rmd = getMove(redirectId)
    if (rmd) {
      m = {
        ...m,
        id: redirectId,
        name: rmd.name.en,
        type: rmd.type as PokemonType,
        power: rmd.power ?? 0,
        accuracy: rmd.accuracy ?? 0,
      }
    }
    moveBattleData = getMoveBattleData(redirectId)
    if (redirectTag === 'copycat') {
      redirectMsg = t('battle.copiedMove', { name: attackerName, move: getMoveDisplayName(redirectId) })
    } else if (redirectTag === 'mirror-move') {
      redirectMsg = t('battle.mirroredMove', { name: attackerName, move: getMoveDisplayName(redirectId) })
    } else {
      redirectMsg = t('battle.calledMove', { move: getMoveDisplayName(redirectId) })
    }
    isRedirected = true
  }
  // --- End Redirection ---

  const isChargeRelease = !isRedirected && pendingChargeMoveId !== null && pendingChargeMoveId === m.id
  const isCurse = moveBattleData?.behaviorTags?.includes('curse') ?? false
  const requiresChargeTurn = moveBattleData?.behaviorTags?.includes('requires-charge-turn') ?? false
  const isChargeStart = requiresChargeTurn && !isChargeRelease && !isRedirected
  const isTwoTurnFly = moveBattleData?.behaviorTags?.includes('two-turn-fly') ?? false
  const isTwoTurnDig = moveBattleData?.behaviorTags?.includes('two-turn-dig') ?? false
  const leaveUserAtOneHp = moveBattleData?.behaviorTags?.includes('leave-user-at-1-hp') ?? false
  const isRest = moveBattleData?.behaviorTags?.includes('rest') ?? false
  const isFocusEnergy = moveBattleData?.behaviorTags?.includes('focus-energy') ?? false
  const isFacadeBoost = moveBattleData?.behaviorTags?.includes('facade-boost') ?? false
  const isFoulPlay = moveBattleData?.behaviorTags?.includes('foul-play') ?? false
  const isDreamEater = moveBattleData?.behaviorTags?.includes('dream-eater') ?? false
  const isFocusPunch = moveBattleData?.behaviorTags?.includes('focus-punch') ?? false
  const isOhko = moveBattleData?.behaviorTags?.includes('ohko') ?? false
  const isProtect = moveBattleData?.behaviorTags?.includes('protect') ?? false
  const isEndure = moveBattleData?.behaviorTags?.includes('endure') ?? false
  const isBrickBreak = moveBattleData?.behaviorTags?.includes('brick-break') ?? false
  const isDefog = moveBattleData?.behaviorTags?.includes('defog') ?? false
  const isStealthRock = moveBattleData?.behaviorTags?.includes('stealth-rock') ?? false
  const isSpikes = moveBattleData?.behaviorTags?.includes('spikes') ?? false
  const isToxicSpikes = moveBattleData?.behaviorTags?.includes('toxic-spikes') ?? false
  const isRapidSpinClear = moveBattleData?.behaviorTags?.includes('rapid-spin-clear') ?? false
  const isSubstitute = moveBattleData?.behaviorTags?.includes('substitute') ?? false
  const isBellyDrum = moveBattleData?.behaviorTags?.includes('belly-drum') ?? false
  const isMagnitude = moveBattleData?.behaviorTags?.includes('magnitude') ?? false
  const isBatonPass = moveBattleData?.behaviorTags?.includes('baton-pass') ?? false
  const isCounter = moveBattleData?.behaviorTags?.includes('counter') ?? false
  const isMirrorCoat = moveBattleData?.behaviorTags?.includes('mirror-coat') ?? false
  const isMagicCoat = moveBattleData?.behaviorTags?.includes('magic-coat') ?? false
  const isDestinyBond = moveBattleData?.behaviorTags?.includes('destiny-bond') ?? false
  const isFutureSight = moveBattleData?.behaviorTags?.includes('future-sight') ?? false
  const isWeightTarget = moveBattleData?.behaviorTags?.includes('weight-target') ?? false
  const isWeightRatio = moveBattleData?.behaviorTags?.includes('weight-ratio') ?? false
  const isDisable = moveBattleData?.behaviorTags?.includes('disable') ?? false
  const isHaze = moveBattleData?.behaviorTags?.includes('haze') ?? false
  const isNightShade = moveBattleData?.behaviorTags?.includes('night-shade') ?? false
  const isSuperFang = moveBattleData?.behaviorTags?.includes('super-fang') ?? false
  const isSandstormMove = moveBattleData?.behaviorTags?.includes('sandstorm') ?? false
  const isRainDanceMove = moveBattleData?.behaviorTags?.includes('rain') ?? false
  const isSunnyDayMove = moveBattleData?.behaviorTags?.includes('sun') ?? false
  const isHailMove = moveBattleData?.behaviorTags?.includes('hail') ?? false
  const isWeatherMove = isSandstormMove || isRainDanceMove || isSunnyDayMove || isHailMove
  const healPercent = moveBattleData?.healingPercent ?? null
  const hitCount = (() => {
    const min = moveBattleData?.minHits ?? null
    const max = moveBattleData?.maxHits ?? null
    if (min !== null && max !== null) return Math.floor(Math.random() * (max - min + 1)) + min
    return 1
  })()
  const selfCostAmount = leaveUserAtOneHp && player.hp ? Math.max(0, player.hp - 1) : 0

  if (!isRedirected && !isChargeRelease && m.currentPp > 0) {
    m.currentPp--
  }
  //
  if (isCurse && player.types.includes('ghost')) {
    if (enemyBattleState.curseActive) {
      textBox = createTextBox([t('battle.alreadyCursed', { name: defenderName })], rtl)
      m.currentPp++
      phase = 'PLAYER_ATTACK'
      phaseTimer = 0
      return
    }
    moveBattleData!.statChanges = []
    player.hp = Math.max(1, player.hp - player.maxHp / 2)
    enemyBattleState.curseActive = true
    textBox = createTextBox([t('battle.curseGhost', { attacker: attackerName, target: defenderName })], rtl)
    phase = 'PLAYER_ATTACK'
    phaseTimer = 0
    return
  }

  // Lock-in behavior tags
  const isLockInOutrage = moveBattleData?.behaviorTags?.includes('lock-in-outrage') ?? false
  const isLockInRollout = moveBattleData?.behaviorTags?.includes('lock-in-rollout') ?? false
  const isLockInRage = moveBattleData?.behaviorTags?.includes('lock-in-rage') ?? false
  const isLockInUproar = moveBattleData?.behaviorTags?.includes('lock-in-uproar') ?? false
  if (isLockInOutrage) {
    if (playerBattleState.lockedInMoveId === null) {
      playerBattleState.lockedInMoveId = m.id
      playerBattleState.lockInTurnsRemaining = Math.floor(Math.random() * 2) + 1
    } else {
      playerBattleState.lockInTurnsRemaining--
    }
  }
  if (isLockInRollout) {
    if (playerBattleState.lockedInMoveId === null) {
      playerBattleState.lockedInMoveId = m.id
      playerBattleState.rolloutTurnsActive = 1
    } else {
      playerBattleState.rolloutTurnsActive = Math.min(5, playerBattleState.rolloutTurnsActive + 1)
    }
    m = { ...m, power: Math.round(30 * Math.pow(2, playerBattleState.rolloutTurnsActive - 1)) }
  }
  if (isLockInRage && playerBattleState.lockedInMoveId === null) {
    playerBattleState.lockedInMoveId = m.id
    playerBattleState.rageActive = true
  }
  if (isLockInUproar) {
    if (playerBattleState.lockedInMoveId === null) {
      playerBattleState.lockedInMoveId = m.id
      playerBattleState.uproarTurnsRemaining = Math.floor(Math.random() * 3) + 2 // 2-4 remaining = 3-5 total
    } else {
      playerBattleState.uproarTurnsRemaining--
    }
  }
  const lockInOutrageFinalTurn = isLockInOutrage && playerBattleState.lockInTurnsRemaining === 0
  const lockInRolloutFinalTurn = isLockInRollout && playerBattleState.rolloutTurnsActive >= 5
  const lockInUproarFinalTurn = isLockInUproar && playerBattleState.uproarTurnsRemaining === 0

  const moveData = getMove(m.id)
  if (isChargeStart) {
    startChargingMove(playerBattleState, m.id)
    if (isTwoTurnFly) {
      playerBattleState.invulnerableState = 'airborne'
    } else if (isTwoTurnDig) {
      playerBattleState.invulnerableState = 'underground'
    }
    const playerHasContrary = player.abilityId
      ? getAbilityBattleEffects(player.abilityId).some((e) => e.kind === 'contraryStatChanges')
      : false
    const chargeStatChanges = applyStatChanges(
      playerBattleState,
      moveBattleData?.chargeStatChanges ?? [],
      'user',
      Math.random,
      playerHasContrary,
    )
    const msgs = [...turnEffectLines, getChargingLine(attackerName, getMoveDisplayName(m.id))]
    for (const change of chargeStatChanges) {
      msgs.push(getStatChangeLine(attackerName, change))
    }
    syncPlayerBar()
    textBox = createTextBox(msgs, rtl)
    phase = 'PLAYER_ATTACK'
    phaseTimer = 0
    if (isTwoTurnFly) {
      animationDirector.play(
        sequenceStep(
          callStep(() => {
            attackFx = createAttackEffect({
              kind: 'fly-vanish',
              sourceX: BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
              sourceY: BTL.PLY_SPRITE.y + BTL.PLY_SPRITE.h / 2,
              targetX: BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
              targetY: BTL.PLY_SPRITE.y + BTL.PLY_SPRITE.h / 2,
              color: '#a8d8ff',
              accentColor: '#ffffff',
              duration: 0.7,
            })
          }),
          tweenActorStep('player', { y: -20, scaleX: 0.18, scaleY: 0.18, alpha: 0 }, 0.7, 'easeIn'),
        ),
      )
    } else if (isTwoTurnDig) {
      animationDirector.play(
        sequenceStep(
          callStep(() => {
            attackFx = createAttackEffect({
              kind: 'dig-vanish',
              sourceX: BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
              sourceY: BTL.PLY_SPRITE.y + BTL.PLY_SPRITE.h / 2,
              targetX: BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
              targetY: BTL.PLY_SPRITE.y + BTL.PLY_SPRITE.h / 2,
              color: '#a07840',
              accentColor: '#c89850',
              duration: 0.5,
            })
          }),
          tweenActorStep('player', { y: 8, scaleX: 0.1, scaleY: 0.1, alpha: 0 }, 0.5, 'easeIn'),
        ),
      )
    }
    return
  }
  // !ENDCHUNK
  if (isFutureSight) {
    const usedMove = getMoveDisplayName(m.id)
    const msgs = [...turnEffectLines, t('battle.usedMove', { name: attackerName, move: usedMove })]
    if (playerSideState.futureSightTurnsRemaining > 0) {
      msgs.push(t('battle.futureSightAlreadyActive'))
    } else {
      const damage = calcDamage(
        player,
        playerBattleState,
        enemy,
        enemyBattleState,
        enemySideState,
        120,
        'psychic',
        'special',
      )
      playerSideState.futureSightTurnsRemaining = 2
      playerSideState.futureSightDamage = damage
      msgs.push(t('battle.futureSightSet', { name: attackerName }))
    }
    textBox = createTextBox(msgs, rtl)
    phase = 'PLAYER_ATTACK'
    phaseTimer = 0
    return
  }

  // Disable: disables the enemy's last used move for 3-6 turns
  if (isDisable) {
    const usedMove = getMoveDisplayName(m.id)
    const msgs = [...turnEffectLines, t('battle.usedMove', { name: attackerName, move: usedMove })]
    if (enemyBattleState.disabledMoveId !== null || enemyBattleState.lastMoveUsedId === null) {
      msgs.push(t('battle.nothingHappened'))
    } else {
      const disabledMoveName = getMoveDisplayName(enemyBattleState.lastMoveUsedId)
      enemyBattleState.disabledMoveId = enemyBattleState.lastMoveUsedId
      enemyBattleState.disabledMoveTurnsRemaining = Math.floor(Math.random() * 4) + 3
      msgs.push(t('battle.disableSuccess', { name: getPokemonDisplayName(enemy.id), move: disabledMoveName }))
    }
    textBox = createTextBox(msgs, rtl)
    phase = 'PLAYER_ATTACK'
    phaseTimer = 0
    return
  }

  if (isHaze) {
    const moveName = getMoveDisplayName(m.id)

    runMoveLifecycle({
      move: m,
      attackerActor: 'player',
      defenderActor: 'enemy',
      context: battleAnimationContext,
      hitTarget: true,
      overrideNextPhase: 'PLAYER_ATTACK',

      onImpact: () => {
        playerBattleState.statModifiers = createEmptyBattleStatModifiers()
        enemyBattleState.statModifiers = createEmptyBattleStatModifiers()

        syncPlayerBar()
        syncEnemyBar()

        return {
          endMessages: [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.hazeCleared'),
          ],
        }
      },
    })
    return
  }

  if (isChargeRelease) {
    clearChargingMove(playerBattleState)
    if (playerBattleState.invulnerableState !== null) {
      playerBattleState.invulnerableState = null
      animationDirector.setActorState('player', { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, rotation: 0 })
    }
  }
  applyPostMoveTurnFlags(playerBattleState, m.id)

  // Snore: fails if not asleep (move ID 173)
  if (m.id === 173 && playerBattleState.majorStatus !== 'sleep') {
    const msgs = [
      ...turnEffectLines,
      t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
      t('battle.nothingHappened'),
    ]
    textBox = createTextBox(msgs, rtl)
    phase = 'PLAYER_ATTACK'
    phaseTimer = 0
    return
  }

  // Focus Punch: fails if the player took damage this turn
  if (isFocusPunch && playerBattleState.turnFlags.tookDamageThisTurn) {
    const msgs = [
      ...turnEffectLines,
      t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
      t('battle.focusPunchFailed', { name: attackerName }),
    ]
    textBox = createTextBox(msgs, rtl)
    phase = 'PLAYER_ATTACK'
    phaseTimer = 0
    return
  }

  // Substitute: player creates a doll at 1/4 max HP cost
  if (isSubstitute) {
    const cost = Math.floor(player.maxHp / 4)

    runMoveLifecycle({
      move: m,
      attackerActor: 'player',
      defenderActor: 'enemy',
      context: battleAnimationContext,
      hitTarget: false,
      overrideNextPhase: 'PLAYER_ATTACK',

      canExecute: () => {
        if (playerBattleState.substituteActive) {
          audio.playSFX('menu-cancel')
          return {
            success: false,
            errorMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
              t('battle.substituteAlreadyActive', { name: attackerName }),
            ],
          }
        }
        if (player.hp <= cost) {
          audio.playSFX('menu-cancel')
          return {
            success: false,
            errorMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
              t('battle.substituteTooWeak', { name: attackerName }),
            ],
          }
        }
        return null
      },

      // 2. All state updates and UI bar refreshes execute cleanly on impact
      onImpact: () => {
        player.hp -= cost
        setHP(playerHpBar, player.hp)
        playerBattleState.substituteActive = true
        playerBattleState.substituteHitsAbsorbed = 0

        // Fully safe execution of your scene variables!
        syncPlayerBar()

        return {
          endMessages: [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
            t('battle.substituteCreated', { name: attackerName }),
          ],
        }
      },
    })
    return
  }

  // Belly Drum: costs 50% max HP, raises Attack to max — fails if HP ≤ 50%
  if (isBellyDrum) {
    const cost = Math.floor(player.maxHp / 2)
    const moveName = getMoveDisplayName(m.id)

    runMoveLifecycle({
      move: m,
      attackerActor: 'player',
      defenderActor: 'enemy',
      context: battleAnimationContext,
      hitTarget: false,
      overrideNextPhase: 'PLAYER_ATTACK',
      canExecute: () => {
        if (player.hp <= cost) {
          audio.playSFX('menu-cancel')

          return {
            success: false,
            errorMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              t('battle.bellyDrumTooWeak', { name: attackerName }),
            ],
          }
        }
        return null
      },

      onImpact: () => {
        // 1. Deduct HP and update UI elements
        player.hp = Math.max(1, player.hp - cost)
        setHP(playerHpBar, player.hp)
        syncPlayerBar()

        // 2. Compute ability effects and apply stat modifications
        const playerHasContrary = player.abilityId
          ? getAbilityBattleEffects(player.abilityId).some((e) => e.kind === 'contraryStatChanges')
          : false

        const statChanges = applyStatChanges(
          playerBattleState,
          moveBattleData!.statChanges,
          'user',
          Math.random,
          playerHasContrary,
        )

        // 3. Trigger immediate floating text feedback
        spawnDamageNumber(`-${cost}`, BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2, BTL.PLY_SPRITE.y + 10, '#f8d858')

        // 4. Trigger visual screen feedback unique to the player path
        flash = createFlash('#fff29a', 0.12)
        shake = createShake(1.4, 0.18)

        // 5. Return array of final UI text lines to progress to PLAYER_ATTACK
        return {
          endMessages: [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.bellyDrumCost', { name: attackerName }),
            ...statChanges.map((c) => getStatChangeLine(attackerName, c)),
          ],
        }
      },
    })
    return
  }

  // Baton Pass: save substitute state for incoming Pokemon
  if (isBatonPass) {
    if (playerBattleState.substituteActive) {
      pendingSubstituteCarryover = {
        active: true,
        hitsAbsorbed: playerBattleState.substituteHitsAbsorbed,
      }
      playerBattleState.substituteActive = false
    }
    const msgs = [...turnEffectLines, t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) })]
    textBox = createTextBox(msgs, rtl)
    phase = 'PLAYER_ATTACK'
    phaseTimer = 0
    return
  }

  // Magic Coat: player cloaks themselves to reflect status moves this turn
  if (isMagicCoat) {
    const moveName = getMoveDisplayName(m.id)

    runMoveLifecycle({
      move: m,
      attackerActor: 'player',
      defenderActor: 'enemy',
      context: battleAnimationContext,
      hitTarget: false,
      overrideNextPhase: 'PLAYER_ATTACK',
      onImpact: () => {
        playerBattleState.turnFlags.magicCoatActive = true
        return {
          endMessages: [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.magicCoatActive', { name: attackerName }),
          ],
        }
      },
    })
    return
  }

  // Destiny Bond: mark the enemy with the bond — if enemy kills player before player acts again, enemy also faints
  if (isDestinyBond) {
    const moveName = getMoveDisplayName(m.id)

    runMoveLifecycle({
      move: m,
      attackerActor: 'player',
      defenderActor: 'enemy',
      context: battleAnimationContext,
      hitTarget: false,
      overrideNextPhase: 'PLAYER_ATTACK',

      onImpact: () => {
        enemyBattleState.destinyBonded = true
        syncEnemyBar()

        return {
          endMessages: [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.destinyBondActive', { name: defenderName }),
          ],
        }
      },
    })
    return
  }

  if (isProtect || isEndure) {
    const moveName = getMoveDisplayName(m.id)

    runMoveLifecycle({
      move: m,
      attackerActor: 'player',
      defenderActor: 'enemy',
      context: battleAnimationContext,
      hitTarget: false,
      overrideNextPhase: 'PLAYER_ATTACK',

      onImpact: () => {
        if (isProtect) {
          playerBattleState.turnFlags.protected = true
          syncPlayerBar()
        }
        if (isEndure) {
          playerBattleState.turnFlags.endured = true
        }

        return {
          endMessages: [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            isProtect ? t('battle.protected', { name: attackerName }) : t('battle.endured', { name: attackerName }),
          ],
        }
      },
    })
    return
  }

  // Enemy is protected — block the player attack entirely
  if (doesMoveTargetOpponent(moveBattleData) && enemyBattleState.turnFlags.protected) {
    const msgs = [
      ...turnEffectLines,
      t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
      t('battle.protectedBlock', { name: defenderName }),
    ]
    textBox = createTextBox(msgs, rtl)
    phase = 'PLAYER_ATTACK'
    phaseTimer = 0
    return
  }

  if (isCounter || isMirrorCoat) {
    const moveName = getMoveDisplayName(m.id)
    const counterDamage = isCounter
      ? playerBattleState.turnFlags.physicalDamageTakenThisTurn * 2
      : playerBattleState.turnFlags.specialDamageTakenThisTurn * 2

    runMoveLifecycle({
      move: m,
      attackerActor: 'player',
      defenderActor: 'enemy',
      context: battleAnimationContext,
      hitTarget: true,
      overrideNextPhase: 'PLAYER_ATTACK',

      canExecute: () => {
        if (counterDamage <= 0 || enemy.hp <= 0) {
          audio.playSFX('menu-cancel')
          return {
            success: false,
            errorMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              t('battle.counterFailed', { name: attackerName }),
            ],
          }
        }
        return null
      },

      onImpact: () => {
        applyMoveImpact(
          enemy,
          m,
          enemyHpBar,
          BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
          BTL.OPP_SPRITE.y + 10,
          counterDamage,
          false,
        )

        return {
          endMessages: [...turnEffectLines, t('battle.usedMove', { name: attackerName, move: moveName })],
        }
      },
    })
    return
  }

  const damageClass = moveData?.damageClass ?? (m.power > 0 ? 'physical' : 'status')
  const weatherAccOverride = battleWeather ? getWeatherAccuracyOverride(m.id, battleWeather.type) : null
  let hitResult = doesMoveTargetOpponent(moveBattleData)
    ? doesMoveHit(weatherAccOverride ?? m.accuracy, playerBattleState, enemyBattleState)
    : { hit: true, chance: 100 }
  // Invulnerability check (Fly / Dig charge turn) — only for moves that target opponent
  if (hitResult.hit && doesMoveTargetOpponent(moveBattleData) && enemyBattleState.invulnerableState !== null) {
    const isDigBypass = m.id === 89 || m.id === 90 || isMagnitude // Earthquake, Fissure, Magnitude
    const neverMisses = m.accuracy <= 0 || m.accuracy === null
    const bothAirborne =
      playerBattleState.invulnerableState === 'airborne' && enemyBattleState.invulnerableState === 'airborne'
    if (!neverMisses && !(enemyBattleState.invulnerableState === 'underground' && isDigBypass) && !bothAirborne) {
      hitResult = { hit: false, chance: 0 }
    }
  }

  const hasBypassImmunity = moveBattleData?.effects?.find((effect) => effect.bayPassImuunity) ?? false
  const targetTypeImmune =
    hitResult.hit &&
    doesMoveTargetOpponent(moveBattleData) &&
    isTargetImmuneToMoveType(enemy, m.type) &&
    !hasBypassImmunity
  let magnitudeLevel = 0
  if (isMagnitude) {
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

  const isReversal = moveBattleData?.behaviorTags?.includes('reversal') ?? false
  if (isReversal) {
    const power = Math.max(1, player.maxHp - player.hp)
    m = { ...m, power }
  }

  // Return / Frustration: power derived from happiness
  if (m.id === RETURN_MOVE_ID || m.id === FRUSTRATION_MOVE_ID) {
    const pd = getPlayerData()
    const h = calcHappiness(player, pd.party)
    m = { ...m, power: m.id === RETURN_MOVE_ID ? getReturnPower(h) : getFrustrationPower(h) }
  }
  const movePower = isWeightTarget
    ? getWeightTargetPower(computePokemonSize(enemy).weightKg)
    : isWeightRatio
      ? getWeightRatioPower(computePokemonSize(player).weightKg, computePokemonSize(enemy).weightKg)
      : m.power
  const absorbed = hitResult.hit && !targetTypeImmune && movePower > 0 && doesAbilityAbsorbMove(enemy, m.type)
  // Dream Eater: blocked if target is not asleep
  const dreamEaterBlocked = isDreamEater && enemy.status !== 'sleep'
  const playerHappiness = hasActiveGame() ? calcHappiness(player, getPlayerData().party) : 0
  const criticalHit =
    hitResult.hit && !targetTypeImmune && !dreamEaterBlocked && movePower > 0 && !absorbed
      ? rollCriticalHit(m.id, enemy, Math.random, playerBattleState, getHappinessCritBonus(playerHappiness))
      : false
  // Facade: double power when user has a status condition
  const facadeActive =
    isFacadeBoost && player.status !== null && ['burn', 'paralyze', 'poison'].includes(player.status as string)
  const rawPower = facadeActive ? movePower * 2 : movePower
  const digPowerBoost =
    rawPower > 0 && enemyBattleState.invulnerableState === 'underground' && (m.id === 89 || m.id === 90 || isMagnitude)
      ? 2
      : 1
  const effectivePower =
    (battleWeather && rawPower > 0
      ? Math.max(1, Math.round(rawPower * getWeatherPowerMultiplier(m.type, battleWeather.type)))
      : rawPower) * digPowerBoost
  // Foul Play: use target's attack stat
  const foulPlayAttackStat = isFoulPlay ? getModifiedStatValue(enemy, enemyBattleState, 'attack') : undefined
  // Compute animation profile to determine suppressAudio for multi-hit
  const atkAnimProfile = (() => {
    const md = moveData
    return getAttackAnimationProfile({
      name: md?.name ?? { en: m.name, he: m.name },
      type: m.type,
      power: m.power,
      damageClass: md?.damageClass ?? (m.power > 0 ? 'physical' : 'status'),
      speciesId: player.id,
    })
  })()
  const suppressHitAudio = hitCount > 1 && atkAnimProfile.family === 'lunge'
  const plannedDamage = (() => {
    if (!hitResult.hit || targetTypeImmune || absorbed || dreamEaterBlocked) return 0
    if (isOhko) return enemy.hp
    if (isNightShade) return player.level
    if (isSuperFang) return Math.max(1, Math.floor(enemy.hp / 2))
    if (effectivePower <= 0) return 0
    const base = calcDamage(
      player,
      playerBattleState,
      enemy,
      enemyBattleState,
      enemySideState,
      effectivePower,
      m.type,
      damageClass,
      criticalHit,
      foulPlayAttackStat,
    )
    const min = moveBattleData?.minimumDamage ?? null
    return min !== null ? Math.max(min, base) : base
  })()
  const allowTargetEffects =
    hitResult.hit &&
    !targetTypeImmune &&
    !absorbed &&
    !dreamEaterBlocked &&
    ((!isOhko && effectivePower <= 0) || plannedDamage < enemy.hp)
  const targetCanStillAct = !enemyAlreadyAttacked
  const resolvedEffectLines = hitResult.hit
    ? applyResolvedMoveEffects(
        player,
        playerBattleState,
        playerSideState,
        attackerName,
        enemy,
        enemyBattleState,
        enemySideState,
        defenderName,
        m,
        allowTargetEffects,
        targetCanStillAct,
        enemyBattleState.turnFlags.magicCoatActive,
      )
    : []
  const plannedHpEffectAmount = hitResult.hit
    ? calculateMoveHpEffectAmount(plannedDamage, moveBattleData?.drainPercent ?? moveBattleData?.recoilPercent ?? null)
    : 0
  const msgs: string[] = []
  msgs.push(...turnEffectLines)
  if (isRedirected) {
    msgs.push(t('battle.usedMove', { name: attackerName, move: originalMoveName }))
    if (redirectMsg) msgs.push(redirectMsg)
  }
  msgs.push(t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }))
  if (isMagnitude && magnitudeLevel > 0) {
    msgs.push(t('battle.magnitudeLevel', { level: magnitudeLevel, power: m.power }))
  }
  // Weather effect on this move
  if (battleWeather && doesMoveTargetOpponent(moveBattleData)) {
    const wName = getWeatherDisplayName(battleWeather.type)
    const wMult = getWeatherPowerMultiplier(m.type, battleWeather.type)
    if (rawPower > 0 && wMult > 1)
      msgs.push(t('battle.weatherPowerBoosted', { weather: wName, move: getMoveDisplayName(m.id) }))
    else if (rawPower > 0 && wMult < 1)
      msgs.push(t('battle.weatherPowerReduced', { weather: wName, move: getMoveDisplayName(m.id) }))
    if (weatherAccOverride === 0)
      msgs.push(t('battle.weatherAccuracyMax', { weather: wName, move: getMoveDisplayName(m.id) }))
  }

  if (effectivePower > 0) {
    if (!hitResult.hit) {
      msgs.push(t('battle.moveMissed', { name: attackerName }))
    } else {
      if (criticalHit) {
        msgs.push(t('battle.criticalHit'))
      }
      const et = effText(m.type, enemy.types)
      if (et) msgs.push(et)
      if (plannedDamage > 0 && enemy.abilityId !== null) {
        const abilityMsg = getDefenderAbilityActivationMsg(
          enemy,
          enemyBattleState,
          getAbilityBattleEffects(enemy.abilityId),
          m.type,
          defenderName,
        )
        if (abilityMsg) msgs.push(abilityMsg)
      }
      if (isWeightTarget || isWeightRatio) {
        const moveName = getMoveDisplayName(m.id)
        if (isWeightTarget) {
          const wStr = computePokemonSize(enemy).weightKg.toFixed(1)
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
  } else if (isOhko && hitResult.hit && !targetTypeImmune) {
    msgs.push(t('battle.ohkoHit'))
  } else if ((isSuperFang || isNightShade) && hitResult.hit && !targetTypeImmune) {
    if (isSuperFang) msgs.push(t('battle.superFangHit'))
  } else if (!hitResult.hit) {
    msgs.push(t('battle.moveMissed', { name: attackerName }))
  } else if (targetTypeImmune) {
    msgs.push(t('battle.noEffect'))
  } else if (dreamEaterBlocked) {
    msgs.push(t('battle.dreamEaterFailed'))
    audio.playSFX('menu-cancel')
  } else if (isRest) {
    msgs.push(t('battle.restSleep', { name: attackerName }))
  } else if (isFocusEnergy) {
    msgs.push(t('battle.focusEnergy', { name: attackerName }))
  } else if (isProtect || isEndure) {
    msgs.push(isProtect ? t('battle.protected', { name: attackerName }) : t('battle.endured', { name: attackerName }))
  } else if (healPercent !== null) {
    msgs.push(t('battle.healedHp', { name: attackerName }))
  } else if (isStealthRock) {
    if (!enemySideState.stealthRockActive) {
      msgs.push(t('battle.stealthRockSet'))
    } else {
      msgs.push(t('battle.hazardAlreadySet'))
    }
  } else if (isSpikes) {
    if (enemySideState.spikesLayers < 3) {
      msgs.push(t('battle.spikesSet'))
    } else {
      msgs.push(t('battle.hazardAlreadySet'))
    }
  } else if (isToxicSpikes) {
    if (enemySideState.toxicSpikesLayers < 2) {
      msgs.push(t('battle.toxicSpikesSet'))
    } else {
      msgs.push(t('battle.hazardAlreadySet'))
    }
  } else if (isWeatherMove) {
    const newWeatherType: WeatherConditionId = isSandstormMove
      ? 'sandstorm'
      : isRainDanceMove
        ? 'rain'
        : isSunnyDayMove
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
      const boostMsgs = activateWeather(newWeatherType, 'player')
      msgs.push(getWeatherStartedLine(newWeatherType))
      msgs.push(...boostMsgs)
    }
  } else if (resolvedEffectLines.length === 0) {
    msgs.push(t('battle.nothingHappened'))
    audio.playSFX('menu-cancel')
  }
  if (hitCount > 1 && hitResult.hit && !targetTypeImmune && !dreamEaterBlocked) {
    msgs.push(t('battle.multiHit', { count: hitCount }))
  }
  if (plannedHpEffectAmount > 0) {
    if (moveBattleData?.drainPercent) {
      msgs.push(t('battle.drainHeal', { name: attackerName, amount: plannedHpEffectAmount }))
    }
    if (moveBattleData?.recoilPercent) {
      msgs.push(t('battle.recoilHit', { name: attackerName, amount: plannedHpEffectAmount }))
    }
  }
  if (selfCostAmount > 0) {
    msgs.push(t('battle.recoilHit', { name: attackerName, amount: selfCostAmount }))
  }
  msgs.push(...resolvedEffectLines)

  // Lock-in teardown messages
  if (lockInOutrageFinalTurn) {
    msgs.push(t('battle.lockInOutrageStopped', { name: attackerName }))
  }
  if (lockInUproarFinalTurn) {
    msgs.push(t('battle.lockInUproarStopped', { name: attackerName }))
  }
  // Enemy Rage: if enemy is raging and was hit, its Attack rises
  const enemyRageBoost = hitResult.hit && plannedDamage > 0 && enemyBattleState.rageActive
  if (enemyRageBoost) {
    msgs.push(t('battle.lockInRageBoost', { name: defenderName }))
  }

  // Brick Break: will shatter enemy screens on impact
  if (isBrickBreak && hitResult.hit && plannedDamage > 0) {
    const hadScreens = enemySideState.reflectTurnsRemaining > 0 || enemySideState.lightScreenTurnsRemaining > 0
    if (hadScreens) {
      msgs.push(t('battle.brickBreakShatter'))
    }
  }
  // Rapid Spin: will clear own hazards + leech seed on impact
  if (isRapidSpinClear && hitResult.hit && plannedDamage > 0) {
    const hadHazards =
      playerSideState.stealthRockActive || playerSideState.spikesLayers > 0 || playerSideState.toxicSpikesLayers > 0
    const hadSeed = playerBattleState.leechSeeded
    if (hadHazards || hadSeed) {
      msgs.push(t('battle.rapidSpinClear', { name: attackerName }))
    }
  }
  // Defog: will clear all hazards and screens
  if (isDefog) {
    msgs.push(t('battle.defogClear'))
  }

  // Contact ability: enemy ability may inflict status or recoil on player when hit by physical move
  const contactEffectsOnPlayer: Array<{ status: import('../../types/battle-metadata.js').MajorStatusId }> = []
  let playerContactRecoil = 0
  if (hitResult.hit && damageClass === 'physical' && plannedDamage > 0 && enemy.abilityId !== null) {
    const enemyAbilityEffects = getAbilityBattleEffects(enemy.abilityId)
    for (const effect of enemyAbilityEffects) {
      if (effect.kind === 'contactStatusChance' && !player.status && Math.random() * 100 < effect.chance) {
        contactEffectsOnPlayer.push({ status: effect.status })
        const statusLine = getStatusAppliedLine(attackerName, effect.status)
        if (statusLine) msgs.push(statusLine)
      }
      if (effect.kind === 'contactRecoilDamage') {
        playerContactRecoil += Math.max(1, Math.floor((player.maxHp * effect.damagePercent) / 100))
      }
    }
  }

  // Substitute: precompute message based on planned damage (only for damaging moves)
  if (
    hitResult.hit &&
    plannedDamage > 0 &&
    doesMoveTargetOpponent(moveBattleData) &&
    enemyBattleState.substituteActive
  ) {
    const playerMoveName2 = moveData?.name?.en ?? m.name
    if (!isSubstituteBypass(playerMoveName2, player.abilityId)) {
      const subThreshold = Math.floor(enemy.maxHp / 4)
      if (plannedDamage >= subThreshold) {
        msgs.push(t('battle.substituteDestroyed'))
      } else {
        msgs.push(t('battle.substituteAbsorbed'))
      }
    } else if (plannedDamage > 0) {
      msgs.push(t('battle.substituteBypassed'))
    }
  }

  // Entry hazards: update state (Magic Coat redirects hazards back to player's side)
  const hazardReflectedByEnemy =
    enemyBattleState.turnFlags.magicCoatActive && m.power <= 0 && (isStealthRock || isSpikes || isToxicSpikes)
  const hazardTargetState = hazardReflectedByEnemy ? playerSideState : enemySideState
  const syncHazardBar = hazardReflectedByEnemy ? syncPlayerBar : syncEnemyBar
  if (isStealthRock && !hazardTargetState.stealthRockActive) {
    hazardTargetState.stealthRockActive = true
    syncHazardBar()
  }
  if (isSpikes && hazardTargetState.spikesLayers < 3) {
    hazardTargetState.spikesLayers++
    syncHazardBar()
  }
  if (isToxicSpikes && hazardTargetState.toxicSpikesLayers < 2) {
    hazardTargetState.toxicSpikesLayers++
    syncHazardBar()
  }

  textBox = createTextBox(msgs, rtl)
  playAttackAnimation(
    player,
    'player',
    'enemy',
    m,
    animationDirector,
    audio,
    battleAnimationContext,
    () => {
      // Rest: full heal + sleep 2 turns + all PP restored
      if (isRest) {
        applyRestEffect(player, playerBattleState)
        setHP(playerHpBar, player.hp)
        setStatus(playerHpBar, player.status ?? '')
        spawnDamageNumber(`+${player.maxHp}`, BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2, BTL.PLY_SPRITE.y + 10, '#48d870')
        audio.playSFX('heal')
      }
      // Heal % moves (Recover, Roost, Milk Drink, etc.)
      if (healPercent !== null) {
        const tags = moveBattleData?.behaviorTags

        const healed = applyHealPercent(player, healPercent, tags)
        if (healed > 0) {
          setHP(playerHpBar, player.hp)
          spawnDamageNumber(`+${healed}`, BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2, BTL.PLY_SPRITE.y + 10, '#48d870')
          audio.playSFX('heal')
        }
      }
      // Focus Energy: boost crit rate for all future moves
      if (isFocusEnergy) {
        playerBattleState.critBoost = true
      }
      if (hitResult.hit) {
        let totalActualDamage = 0
        const playerMoveName = moveData?.name?.en ?? m.name
        const playerBypassesSub = isSubstituteBypass(playerMoveName, player.abilityId)
        for (let hit = 0; hit < hitCount; hit++) {
          if (enemy.hp <= 0) break
          const popupY = BTL.OPP_SPRITE.y + 10 - hit * 5
          if (
            plannedDamage > 0 &&
            enemyBattleState.substituteActive &&
            !playerBypassesSub &&
            doesMoveTargetOpponent(moveBattleData)
          ) {
            const threshold = Math.floor(enemy.maxHp / 4)
            if (plannedDamage >= threshold) {
              enemyBattleState.substituteActive = false
              enemyBattleState.substituteHitsAbsorbed = 0
              substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: 'enemy' }
              // audio.playMoveSFX(m.name);
            } else {
              enemyBattleState.substituteHitsAbsorbed++
              substituteDollFlash = { timer: 0, duration: 0.3, color: '#ffffff', side: 'enemy' }
              // audio.playMoveSFX(m.name);
              if (enemyBattleState.substituteHitsAbsorbed >= 2) {
                enemyBattleState.substituteActive = false
                enemyBattleState.substituteHitsAbsorbed = 0
                substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: 'enemy' }
              }
            }
            continue
          }
          totalActualDamage += applyMoveImpact(
            enemy,
            m,
            enemyHpBar,
            BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
            popupY,
            plannedDamage,
            suppressHitAudio,
          )
        }
        // Endure: enemy survives lethal hit at 1 HP
        if (enemy.hp <= 0 && enemyBattleState.turnFlags.endured) {
          enemy.hp = 1
          setHP(enemyHpBar, 1)
        }
        const actualDamage = totalActualDamage
        if (actualDamage > 0) {
          enemyBattleState.turnFlags.tookDamageThisTurn = true
          if (damageClass === 'physical') enemyBattleState.turnFlags.physicalDamageTakenThisTurn += actualDamage
          else if (damageClass === 'special') enemyBattleState.turnFlags.specialDamageTakenThisTurn += actualDamage
          // Rage: enemy is in Rage and was hit — boost its Attack
          if (enemyRageBoost) {
            enemyBattleState.statModifiers.attack = applyBattleStatDelta(enemyBattleState.statModifiers.attack, 1)
          }
          const drained = applyDrainHealing(player, actualDamage, moveBattleData?.drainPercent ?? null)
          if (drained > 0) {
            setHP(playerHpBar, player.hp)
            spawnDamageNumber(`+${drained}`, BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2, BTL.PLY_SPRITE.y + 10, '#48d870')
            audio.playSFX('heal')
          }

          const recoil = applyRecoilDamage(player, actualDamage, moveBattleData?.recoilPercent ?? null)
          if (recoil.damage > 0) {
            setHP(playerHpBar, player.hp)
            spawnDamageNumber(
              `-${recoil.damage}`,
              BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
              BTL.PLY_SPRITE.y + 10,
              '#f8d858',
            )
            flash = createFlash('#fff29a', 0.12)
            shake = createShake(1.4, 0.18)
            audio.playSFX('hit')
          }

          // Apply contact ability status effects to the attacking player
          for (const contactEffect of contactEffectsOnPlayer) {
            applyMajorStatus(player, playerBattleState, {
              status: contactEffect.status,
              chance: 100,
              target: 'user',
            })
            setStatus(playerHpBar, player.status ?? '')
          }
          // Apply contact recoil damage to the attacking player (Rough Skin, Iron Barbs)
          if (playerContactRecoil > 0 && player.hp > 0) {
            player.hp = Math.max(0, player.hp - playerContactRecoil)
            setHP(playerHpBar, player.hp)
            spawnDamageNumber(
              `-${playerContactRecoil}`,
              BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
              BTL.PLY_SPRITE.y + 10,
              '#f84038',
            )
            audio.playSFX('hit')
          }
        }
      }
      if (leaveUserAtOneHp) {
        const selfCost = applyLeaveUserAtOneHpCost(player)
        if (selfCost.damage > 0) {
          setHP(playerHpBar, player.hp)
          spawnDamageNumber(
            `-${selfCost.damage}`,
            BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
            BTL.PLY_SPRITE.y + 10,
            '#f8d858',
          )
          flash = createFlash('#fff29a', 0.12)
          shake = createShake(1.4, 0.18)
          audio.playSFX('hit')
        }
      }
      // Destiny Bond: if player killed enemy and player has the bond (enemy set it), player also faints
      if (enemy.hp <= 0 && playerBattleState.destinyBonded) {
        playerBattleState.destinyBonded = false
        player.hp = 0
        setHP(playerHpBar, 0)
        pendingDestinyBondMsg = t('battle.destinyBondTrigger', { name: attackerName })
      }
      // Brick Break: clear enemy screens after hitting
      if (isBrickBreak) {
        clearScreens(enemySideState)
        syncEnemyBar()
      }
      // Rapid Spin: clear own entry hazards and leech seed after hitting
      if (isRapidSpinClear) {
        clearEntryHazards(playerSideState)
        playerBattleState.leechSeeded = false
        syncPlayerBar()
      }
      // Defog: clear all hazards and screens on both sides
      if (isDefog) {
        clearEntryHazards(playerSideState)
        clearEntryHazards(enemySideState)
        clearScreens(playerSideState)
        clearScreens(enemySideState)
        syncPlayerBar()
        syncEnemyBar()
      }
      // Lock-in teardown after move completes
      if (lockInOutrageFinalTurn) {
        playerBattleState.lockedInMoveId = null
        playerBattleState.lockInTurnsRemaining = 0
        playerBattleState.confusionTurnsRemaining = Math.floor(Math.random() * 4) + 2
      }
      if (isLockInRollout) {
        if (lockInRolloutFinalTurn || !hitResult.hit) {
          playerBattleState.lockedInMoveId = null
          playerBattleState.rolloutTurnsActive = 0
        }
      }
      if (lockInUproarFinalTurn) {
        playerBattleState.lockedInMoveId = null
        playerBattleState.uproarTurnsRemaining = 0
      }
    },
    hitResult.hit && !absorbed && plannedDamage > 0,
    hitCount,
  )
  phase = 'PLAYER_ATTACK'
  phaseTimer = 0
}

function funcB(): void {
  // Clear Destiny Bond from player when enemy acts (bond expires on user's next turn)
  if (playerBattleState.destinyBonded) {
    playerBattleState.destinyBonded = false
    syncPlayerBar()
  }
  const mi = enemySelectedMoveIndex >= 0 ? enemySelectedMoveIndex : getPlannedEnemyMoveIndex()
  enemySelectedMoveIndex = -1
  let m = enemy.moves[mi]
  if (!m) {
    m = { ...STRUGGLE_MOVE }
  }
  // console.log({ mi, enemySelectedMoveIndex, planned: getPlannedEnemyMoveIndex(), move: m.name });
  const rtl = isRTL()
  const attackerName = getPokemonDisplayName(enemy.id)
  const defenderName = getPokemonDisplayName(player.id)
  const chargingMoveId = getChargingMoveId(enemyBattleState)
  triggerStatusTurnEffects('enemy', enemy, enemyBattleState)
  const startResult = processBeforeMoveEffects(enemy, enemyBattleState, Math.random, m.id)
  const turnEffectLines = startResult.events
    .map((event) => getTurnEffectLine(attackerName, event))
    .filter((line): line is string => line !== null)
  syncEnemyBar()
  if (startResult.selfDamage > 0) {
    flash = createFlash('#fff29a', 0.12)
    shake = createShake(1.4, 0.18)
    spawnDamageNumber(
      `-${startResult.selfDamage}`,
      BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
      BTL.OPP_SPRITE.y + 10,
      '#f8d858',
    )
    audio.playSFX('hit')
  }
  const prefix: string[] = []

  let moveBattleData = getMoveBattleData(m.id)

  // ZzZ effect for sleep-usable moves used while asleep
  if (SLEEP_USABLE_MOVE_IDS.has(m.id) && startResult.events.includes('fast-asleep')) {
    const sx = BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2
    const sy = BTL.OPP_SPRITE.y - 4
    spawnDamageNumber('Z', sx - 5, sy, '#b088ff')
    spawnDamageNumber('z', sx + 2, sy - 7, '#9060e0')
    spawnDamageNumber('Z', sx + 9, sy - 14, '#b088ff')
  }

  // --- Move Redirection (Sleep Talk / Metronome / Assist / Copycat / Mirror Move) ---
  const originalMoveNameEnemy = getMoveDisplayName(m.id)
  const redirectTagEnemy =
    moveBattleData?.behaviorTags?.find(
      (tag) =>
        tag === 'sleep-talk' || tag === 'metronome' || tag === 'assist' || tag === 'copycat' || tag === 'mirror-move',
    ) ?? null
  let isRedirectedEnemy = false
  let redirectMsgEnemy: string | null = null

  if (redirectTagEnemy !== null) {
    if (m.currentPp > 0) m.currentPp--
    let redirectIdEnemy: number | null = null

    if (redirectTagEnemy === 'sleep-talk') {
      if (enemyBattleState.majorStatus !== 'sleep') {
        const msgs = [
          ...prefix,
          ...turnEffectLines,
          t('battle.usedMove', { name: attackerName, move: originalMoveNameEnemy }),
          t('battle.nothingHappened'),
        ]
        textBox = createTextBox(msgs, rtl)
        phase = 'ENEMY_TURN'
        phaseTimer = 0
        return
      }
      const eligible = enemy.moves.filter((pm) => pm.id !== m.id && pm.currentPp > 0)
      if (eligible.length > 0) redirectIdEnemy = eligible[Math.floor(Math.random() * eligible.length)].id
    } else if (redirectTagEnemy === 'metronome') {
      const eligible = getAllMoves().filter((mv) => !METRONOME_EXCLUDED_MOVE_IDS.has(mv.id))
      if (eligible.length > 0) {
        redirectIdEnemy = eligible[Math.floor(Math.random() * eligible.length)].id
        flash = createFlash('#e080ff', 0.22)
      }
    } else if (redirectTagEnemy === 'assist') {
      redirectIdEnemy = null // Enemies have no party — Assist fails
    } else if (redirectTagEnemy === 'copycat') {
      redirectIdEnemy = lastMoveUsedInBattle
    } else if (redirectTagEnemy === 'mirror-move') {
      redirectIdEnemy = playerBattleState.lastMoveUsedId
    }

    if (redirectIdEnemy === null) {
      const msgs = [
        ...prefix,
        ...turnEffectLines,
        t('battle.usedMove', { name: attackerName, move: originalMoveNameEnemy }),
        t('battle.noMoveToCall'),
      ]
      textBox = createTextBox(msgs, rtl)
      phase = 'ENEMY_TURN'
      phaseTimer = 0
      return
    }

    const rmd = getMove(redirectIdEnemy)
    if (rmd) {
      m = {
        ...m,
        id: redirectIdEnemy,
        name: rmd.name.en,
        type: rmd.type as PokemonType,
        power: rmd.power ?? 0,
        accuracy: rmd.accuracy ?? 0,
      }
    }
    moveBattleData = getMoveBattleData(redirectIdEnemy)
    if (redirectTagEnemy === 'copycat') {
      redirectMsgEnemy = t('battle.copiedMove', { name: attackerName, move: getMoveDisplayName(redirectIdEnemy) })
    } else if (redirectTagEnemy === 'mirror-move') {
      redirectMsgEnemy = t('battle.mirroredMove', { name: attackerName, move: getMoveDisplayName(redirectIdEnemy) })
    } else {
      redirectMsgEnemy = t('battle.calledMove', { move: getMoveDisplayName(redirectIdEnemy) })
    }
    isRedirectedEnemy = true
  }
  // --- End Redirection ---

  const isCurse = moveBattleData?.behaviorTags?.includes('curse') ?? false
  const isChargeRelease = !isRedirectedEnemy && chargingMoveId !== null && chargingMoveId === m.id
  const requiresChargeTurn = moveBattleData?.behaviorTags?.includes('requires-charge-turn') ?? false
  const isChargeStart = requiresChargeTurn && !isChargeRelease && !isRedirectedEnemy
  const isTwoTurnFlyEnemy = moveBattleData?.behaviorTags?.includes('two-turn-fly') ?? false
  const isTwoTurnDigEnemy = moveBattleData?.behaviorTags?.includes('two-turn-dig') ?? false
  const leaveUserAtOneHp = moveBattleData?.behaviorTags?.includes('leave-user-at-1-hp') ?? false
  const isRestEnemy = moveBattleData?.behaviorTags?.includes('rest') ?? false
  const isFocusEnergyEnemy = moveBattleData?.behaviorTags?.includes('focus-energy') ?? false
  const isFacadeBoostEnemy = moveBattleData?.behaviorTags?.includes('facade-boost') ?? false
  const isFoulPlayEnemy = moveBattleData?.behaviorTags?.includes('foul-play') ?? false
  const isDreamEaterEnemy = moveBattleData?.behaviorTags?.includes('dream-eater') ?? false
  const isFocusPunchEnemy = moveBattleData?.behaviorTags?.includes('focus-punch') ?? false
  const isOhkoEnemy = moveBattleData?.behaviorTags?.includes('ohko') ?? false
  const isProtectEnemy = moveBattleData?.behaviorTags?.includes('protect') ?? false
  const isEndureEnemy = moveBattleData?.behaviorTags?.includes('endure') ?? false
  const isBrickBreakEnemy = moveBattleData?.behaviorTags?.includes('brick-break') ?? false
  const isDefogEnemy = moveBattleData?.behaviorTags?.includes('defog') ?? false
  const isStealthRockEnemy = moveBattleData?.behaviorTags?.includes('stealth-rock') ?? false
  const isSpikesEnemy = moveBattleData?.behaviorTags?.includes('spikes') ?? false
  const isToxicSpikesEnemy = moveBattleData?.behaviorTags?.includes('toxic-spikes') ?? false
  const isRapidSpinClearEnemy = moveBattleData?.behaviorTags?.includes('rapid-spin-clear') ?? false
  const isSubstituteEnemy = moveBattleData?.behaviorTags?.includes('substitute') ?? false
  const isBellyDrumEnemy = moveBattleData?.behaviorTags?.includes('belly-drum') ?? false
  const isMagnitudeEnemy = moveBattleData?.behaviorTags?.includes('magnitude') ?? false
  const isCounterEnemy = moveBattleData?.behaviorTags?.includes('counter') ?? false
  const isMirrorCoatEnemy = moveBattleData?.behaviorTags?.includes('mirror-coat') ?? false
  const isMagicCoatEnemy = moveBattleData?.behaviorTags?.includes('magic-coat') ?? false
  const isDestinyBondEnemy = moveBattleData?.behaviorTags?.includes('destiny-bond') ?? false
  const isFutureSightEnemy = moveBattleData?.behaviorTags?.includes('future-sight') ?? false
  const isWeightTargetEnemy = moveBattleData?.behaviorTags?.includes('weight-target') ?? false
  const isWeightRatioEnemy = moveBattleData?.behaviorTags?.includes('weight-ratio') ?? false
  const isDisableEnemy = moveBattleData?.behaviorTags?.includes('disable') ?? false
  const isHazeEnemy = moveBattleData?.behaviorTags?.includes('haze') ?? false
  const isNightShadeEnemy = moveBattleData?.behaviorTags?.includes('night-shade') ?? false
  const isSuperFangEnemy = moveBattleData?.behaviorTags?.includes('super-fang') ?? false
  const isSandstormMoveEnemy = moveBattleData?.behaviorTags?.includes('sandstorm') ?? false
  const isRainDanceMoveEnemy = moveBattleData?.behaviorTags?.includes('rain') ?? false
  const isSunnyDayMoveEnemy = moveBattleData?.behaviorTags?.includes('sun') ?? false
  const isHailMoveEnemy = moveBattleData?.behaviorTags?.includes('hail') ?? false
  const isWeatherMoveEnemy = isSandstormMoveEnemy || isRainDanceMoveEnemy || isSunnyDayMoveEnemy || isHailMoveEnemy
  const healPercentEnemy = moveBattleData?.healingPercent ?? null
  const hitCountEnemy = (() => {
    const min = moveBattleData?.minHits ?? null
    const max = moveBattleData?.maxHits ?? null
    if (min !== null && max !== null) return Math.floor(Math.random() * (max - min + 1)) + min
    return 1
  })()
  const selfCostAmount = leaveUserAtOneHp ? Math.max(0, enemy.hp - 1) : 0

  if (!startResult.canAct) {
    if (isChargeRelease) {
      clearChargingMove(enemyBattleState)
    }
    const msgs = [...prefix]
    msgs.push(...(turnEffectLines.length > 0 ? turnEffectLines : [t('battle.nothingHappened')]))
    textBox = createTextBox(msgs, rtl)
    phase = 'ENEMY_TURN'
    phaseTimer = 0
    return
  }

  if (m.id === enemyBattleState.disabledMoveId) {
    const msgs = [...prefix, ...turnEffectLines]
    msgs.push(
      t('battle.moveCantUseDisabled', { name: getPokemonDisplayName(enemy.id), move: getMoveDisplayName(m.id) }),
    )
    textBox = createTextBox(msgs, rtl)
    phase = 'ENEMY_TURN'
    phaseTimer = 0
    return
  }

  if (!isRedirectedEnemy && !isChargeRelease && m.currentPp > 0) {
    m.currentPp--
  }

  // Track last move used (for Copycat / Mirror Move)
  enemyBattleState.lastMoveUsedId = m.id
  lastMoveUsedInBattle = m.id

  // Lock-in behavior tags (enemy)
  const isLockInOutrageEnemy = moveBattleData?.behaviorTags?.includes('lock-in-outrage') ?? false
  const isLockInRolloutEnemy = moveBattleData?.behaviorTags?.includes('lock-in-rollout') ?? false
  const isLockInRageEnemy = moveBattleData?.behaviorTags?.includes('lock-in-rage') ?? false
  const isLockInUproarEnemy = moveBattleData?.behaviorTags?.includes('lock-in-uproar') ?? false
  if (isLockInOutrageEnemy) {
    if (enemyBattleState.lockedInMoveId === null) {
      enemyBattleState.lockedInMoveId = m.id
      enemyBattleState.lockInTurnsRemaining = Math.floor(Math.random() * 2) + 1
    } else {
      enemyBattleState.lockInTurnsRemaining--
    }
  }
  if (isLockInRolloutEnemy) {
    if (enemyBattleState.lockedInMoveId === null) {
      enemyBattleState.lockedInMoveId = m.id
      enemyBattleState.rolloutTurnsActive = 1
    } else {
      enemyBattleState.rolloutTurnsActive = Math.min(5, enemyBattleState.rolloutTurnsActive + 1)
    }
    m = { ...m, power: Math.round(30 * Math.pow(2, enemyBattleState.rolloutTurnsActive - 1)) }
  }
  if (isLockInRageEnemy && enemyBattleState.lockedInMoveId === null) {
    enemyBattleState.lockedInMoveId = m.id
    enemyBattleState.rageActive = true
  }
  if (isLockInUproarEnemy) {
    if (enemyBattleState.lockedInMoveId === null) {
      enemyBattleState.lockedInMoveId = m.id
      enemyBattleState.uproarTurnsRemaining = Math.floor(Math.random() * 3) + 2 // 2-4 remaining = 3-5 total
    } else {
      enemyBattleState.uproarTurnsRemaining--
    }
  }
  const lockInOutrageFinalTurnEnemy = isLockInOutrageEnemy && enemyBattleState.lockInTurnsRemaining === 0
  const lockInRolloutFinalTurnEnemy = isLockInRolloutEnemy && enemyBattleState.rolloutTurnsActive >= 5
  const lockInUproarFinalTurnEnemy = isLockInUproarEnemy && enemyBattleState.uproarTurnsRemaining === 0

  if (isCurse && enemy.types.includes('ghost')) {
    if (playerBattleState.curseActive) {
      textBox = createTextBox([t('battle.alreadyCursed', { name: defenderName })], rtl)
      m.currentPp++
      phase = 'ENEMY_TURN'
      phaseTimer = 0
      return
    }
    moveBattleData!.statChanges = []
    enemy.hp = Math.max(1, enemy.hp - enemy.maxHp / 2)
    enemyBattleState.curseActive = true
    textBox = createTextBox([t('battle.curseGhost', { attacker: attackerName, target: defenderName })], rtl)
    phase = 'ENEMY_TURN'
    phaseTimer = 0
    return
  }

  const moveData = getMove(m.id)
  if (isChargeStart) {
    startChargingMove(enemyBattleState, m.id)
    if (isTwoTurnFlyEnemy) {
      enemyBattleState.invulnerableState = 'airborne'
    } else if (isTwoTurnDigEnemy) {
      enemyBattleState.invulnerableState = 'underground'
    }
    const enemyHasContrary = enemy.abilityId
      ? getAbilityBattleEffects(enemy.abilityId).some((e) => e.kind === 'contraryStatChanges')
      : false
    const chargeStatChanges = applyStatChanges(
      enemyBattleState,
      moveBattleData?.chargeStatChanges ?? [],
      'user',
      Math.random,
      enemyHasContrary,
    )
    const msgs = [...prefix, ...turnEffectLines, getChargingLine(attackerName, getMoveDisplayName(m.id))]
    for (const change of chargeStatChanges) {
      msgs.push(getStatChangeLine(attackerName, change))
    }
    syncEnemyBar()
    textBox = createTextBox(msgs, rtl)
    phase = 'ENEMY_TURN'
    phaseTimer = 0
    if (isTwoTurnFlyEnemy) {
      animationDirector.play(
        sequenceStep(
          callStep(() => {
            attackFx = createAttackEffect({
              kind: 'fly-vanish',
              sourceX: BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
              sourceY: BTL.OPP_SPRITE.y + BTL.OPP_SPRITE.h / 2,
              targetX: BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
              targetY: BTL.OPP_SPRITE.y + BTL.OPP_SPRITE.h / 2,
              color: '#a8d8ff',
              accentColor: '#ffffff',
              duration: 0.7,
            })
          }),
          tweenActorStep('enemy', { y: -20, scaleX: 0.18, scaleY: 0.18, alpha: 0 }, 0.7, 'easeIn'),
        ),
      )
    } else if (isTwoTurnDigEnemy) {
      animationDirector.play(
        sequenceStep(
          callStep(() => {
            attackFx = createAttackEffect({
              kind: 'dig-vanish',
              sourceX: BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
              sourceY: BTL.OPP_SPRITE.y + BTL.OPP_SPRITE.h / 2,
              targetX: BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
              targetY: BTL.OPP_SPRITE.y + BTL.OPP_SPRITE.h / 2,
              color: '#a07840',
              accentColor: '#c89850',
              duration: 0.5,
            })
          }),
          tweenActorStep('enemy', { y: 8, scaleX: 0.1, scaleY: 0.1, alpha: 0 }, 0.5, 'easeIn'),
        ),
      )
    }
    return
  }

  if (isFutureSightEnemy) {
    const usedMove = getMoveDisplayName(m.id)
    const msgs = [...prefix, ...turnEffectLines, t('battle.usedMove', { name: attackerName, move: usedMove })]
    if (enemySideState.futureSightTurnsRemaining > 0) {
      msgs.push(t('battle.futureSightAlreadyActive'))
    } else {
      const damage = calcDamage(
        enemy,
        enemyBattleState,
        player,
        playerBattleState,
        playerSideState,
        120,
        'psychic',
        'special',
      )
      enemySideState.futureSightTurnsRemaining = 2
      enemySideState.futureSightDamage = damage
      msgs.push(t('battle.futureSightSet', { name: attackerName }))
    }
    textBox = createTextBox(msgs, rtl)
    phase = 'ENEMY_TURN'
    phaseTimer = 0
    return
  }

  // Disable: disables the player's last used move for 3-6 turns
  if (isDisableEnemy) {
    const usedMove = getMoveDisplayName(m.id)
    const msgs = [...prefix, ...turnEffectLines, t('battle.usedMove', { name: attackerName, move: usedMove })]
    if (playerBattleState.disabledMoveId !== null || playerBattleState.lastMoveUsedId === null) {
      msgs.push(t('battle.nothingHappened'))
    } else {
      const disabledMoveName = getMoveDisplayName(playerBattleState.lastMoveUsedId)
      playerBattleState.disabledMoveId = playerBattleState.lastMoveUsedId
      playerBattleState.disabledMoveTurnsRemaining = Math.floor(Math.random() * 4) + 3
      msgs.push(t('battle.disableSuccess', { name: getPokemonDisplayName(player.id), move: disabledMoveName }))
    }
    textBox = createTextBox(msgs, rtl)
    phase = 'ENEMY_TURN'
    phaseTimer = 0
    return
  }

  if (isHazeEnemy) {
    const moveName = getMoveDisplayName(m.id)

    runMoveLifecycle({
      move: m,
      attackerActor: 'enemy',
      defenderActor: 'player',
      context: battleAnimationContext,
      hitTarget: true, //
      overrideNextPhase: 'ENEMY_TURN', //

      onImpact: () => {
        enemyBattleState.statModifiers = createEmptyBattleStatModifiers()
        playerBattleState.statModifiers = createEmptyBattleStatModifiers()

        syncPlayerBar()
        syncEnemyBar()

        return {
          endMessages: [
            ...prefix,
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.hazeCleared'),
          ],
        }
      },
    })
    return
  }

  if (isChargeRelease) {
    clearChargingMove(enemyBattleState)
    if (enemyBattleState.invulnerableState !== null) {
      enemyBattleState.invulnerableState = null
      animationDirector.setActorState('enemy', { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, rotation: 0 })
    }
  }
  applyPostMoveTurnFlags(enemyBattleState, m.id)

  // Snore: fails if not asleep (move ID 173)
  if (m.id === 173 && enemyBattleState.majorStatus !== 'sleep') {
    const msgs = [
      ...prefix,
      ...turnEffectLines,
      t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
      t('battle.nothingHappened'),
    ]
    textBox = createTextBox(msgs, rtl)
    phase = 'ENEMY_TURN'
    phaseTimer = 0
    return
  }

  // Focus Punch: fails if enemy took damage this turn
  if (isFocusPunchEnemy && enemyBattleState.turnFlags.tookDamageThisTurn) {
    const msgs = [
      ...prefix,
      ...turnEffectLines,
      t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
      t('battle.focusPunchFailed', { name: attackerName }),
    ]
    textBox = createTextBox(msgs, rtl)
    phase = 'ENEMY_TURN'
    phaseTimer = 0
    return
  }

  // Substitute: enemy creates a doll at 1/4 max HP cost
  if (isSubstituteEnemy) {
    const cost = Math.floor(enemy.maxHp / 4)

    runMoveLifecycle({
      move: m,
      attackerActor: 'enemy',
      defenderActor: 'player',
      context: battleAnimationContext,
      hitTarget: false,
      overrideNextPhase: 'ENEMY_TURN',
      // 1. Guard conditions evaluated locally on the enemy state scope
      canExecute: () => {
        if (enemyBattleState.substituteActive) {
          return {
            success: false,
            errorMessages: [
              ...prefix,
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
              t('battle.substituteAlreadyActive', { name: attackerName }),
            ],
          }
        }
        if (enemy.hp <= cost) {
          return {
            success: false,
            errorMessages: [
              ...prefix,
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
              t('battle.substituteTooWeak', { name: attackerName }),
            ],
          }
        }
        return null
      },

      // 2. State modifications and UI rendering pipelines triggered cleanly on impact
      onImpact: () => {
        enemy.hp -= cost
        setHP(enemyHpBar, enemy.hp)
        enemyBattleState.substituteActive = true
        enemyBattleState.substituteHitsAbsorbed = 0

        // Dynamic local view frame updates work natively here!
        syncEnemyBar()

        return {
          endMessages: [
            ...prefix,
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
            t('battle.substituteCreated', { name: attackerName }),
          ],
        }
      },
    })
    return
  }

  // Belly Drum: costs 50% max HP, raises Attack to max — fails if HP ≤ 50%
  if (isBellyDrumEnemy) {
    const cost = Math.floor(enemy.maxHp / 2)
    const moveName = getMoveDisplayName(m.id)

    runMoveLifecycle({
      move: m,
      attackerActor: 'enemy',
      defenderActor: 'player',
      context: battleAnimationContext,
      hitTarget: false,
      overrideNextPhase: 'ENEMY_TURN',

      canExecute: () => {
        if (enemy.hp <= cost) {
          return {
            success: false,
            errorMessages: [
              ...prefix,
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              t('battle.bellyDrumTooWeak', { name: attackerName }),
            ],
          }
        }
        return null
      },

      onImpact: () => {
        // 1. Deduct HP and update UI elements
        enemy.hp = Math.max(1, enemy.hp - cost)
        setHP(enemyHpBar, enemy.hp)
        syncEnemyBar()

        // 2. Compute ability effects and apply stat modifications
        const enemyHasContrary = enemy.abilityId
          ? getAbilityBattleEffects(enemy.abilityId).some((e) => e.kind === 'contraryStatChanges')
          : false

        const statChanges = applyStatChanges(
          enemyBattleState,
          moveBattleData!.statChanges,
          'user',
          Math.random,
          enemyHasContrary,
        )

        // 3. Trigger immediate floating text feedback
        spawnDamageNumber(`-${cost}`, BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2, BTL.OPP_SPRITE.y + 10, '#f8d858')

        // 4. Return array of final UI text lines to progress to NEXT_PHASE
        return {
          endMessages: [
            ...prefix,
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.bellyDrumCost', { name: attackerName }),
            ...statChanges.map((c) => getStatChangeLine(attackerName, c)),
          ],
        }
      },
    })
    return
  }

  // Magic Coat: enemy cloaks themselves to reflect status moves this turn
  if (isMagicCoatEnemy) {
    const moveName = getMoveDisplayName(m.id)

    runMoveLifecycle({
      move: m,
      attackerActor: 'enemy',
      defenderActor: 'player',
      context: battleAnimationContext,
      hitTarget: false,
      overrideNextPhase: 'ENEMY_TURN', // שומר על פאזת האויב וממתין לסגירת הטקסט בלולאה

      onImpact: () => {
        enemyBattleState.turnFlags.magicCoatActive = true

        return {
          endMessages: [
            ...prefix,
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.magicCoatActive', { name: attackerName }),
          ],
        }
      },
    })
    return
  }

  // Destiny Bond: mark the player with the bond — if player kills enemy before enemy acts again, player also faints
  if (isDestinyBondEnemy) {
    const moveName = getMoveDisplayName(m.id)

    runMoveLifecycle({
      move: m,
      attackerActor: 'enemy',
      defenderActor: 'player',
      context: battleAnimationContext,
      hitTarget: false,
      overrideNextPhase: 'ENEMY_TURN',

      onImpact: () => {
        playerBattleState.destinyBonded = true
        syncPlayerBar()

        return {
          endMessages: [
            ...prefix,
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.destinyBondActive', { name: defenderName }),
          ],
        }
      },
    })
    return
  }

  if (isProtectEnemy || isEndureEnemy) {
    const moveName = getMoveDisplayName(m.id)

    runMoveLifecycle({
      move: m,
      attackerActor: 'enemy',
      defenderActor: 'player',
      context: battleAnimationContext,
      hitTarget: false,
      overrideNextPhase: 'ENEMY_TURN',

      onImpact: () => {
        if (isProtectEnemy) {
          enemyBattleState.turnFlags.protected = true
          syncEnemyBar()
        }
        if (isEndureEnemy) {
          enemyBattleState.turnFlags.endured = true
        }

        return {
          endMessages: [
            ...prefix,
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            isProtectEnemy
              ? t('battle.protected', { name: attackerName })
              : t('battle.endured', { name: attackerName }),
          ],
        }
      },
    })
    return
  }

  // Player is protected — block the enemy attack entirely
  if (doesMoveTargetOpponent(moveBattleData) && playerBattleState.turnFlags.protected) {
    const msgs = [
      ...prefix,
      ...turnEffectLines,
      t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
      t('battle.protectedBlock', { name: getPokemonDisplayName(player.id) }),
    ]
    textBox = createTextBox(msgs, rtl)
    phase = 'ENEMY_TURN'
    phaseTimer = 0
    return
  }

  if (isCounterEnemy || isMirrorCoatEnemy) {
    const moveName = getMoveDisplayName(m.id)
    const counterDamage = isCounterEnemy
      ? enemyBattleState.turnFlags.physicalDamageTakenThisTurn * 2
      : enemyBattleState.turnFlags.specialDamageTakenThisTurn * 2

    runMoveLifecycle({
      move: m,
      attackerActor: 'enemy',
      defenderActor: 'player',
      context: battleAnimationContext,
      hitTarget: true,
      overrideNextPhase: 'ENEMY_TURN',

      canExecute: () => {
        if (counterDamage <= 0 || player.hp <= 0) {
          audio.playSFX('menu-cancel')
          return {
            success: false,
            errorMessages: [
              ...prefix,
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              t('battle.counterFailed', { name: attackerName }),
            ],
          }
        }
        return null
      },

      onImpact: () => {
        applyMoveImpact(
          player,
          m,
          playerHpBar,
          BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
          BTL.PLY_SPRITE.y + 10,
          counterDamage,
          false,
        )

        return {
          endMessages: [...prefix, ...turnEffectLines, t('battle.usedMove', { name: attackerName, move: moveName })],
        }
      },
    })
    return
  }

  const isReversal = moveBattleData?.behaviorTags?.includes('reversal') ?? false
  if (isReversal) {
    const power = Math.max(1, enemy.maxHp - enemy.hp)
    m.power = power
  }

  const damageClass = moveData?.damageClass ?? (m.power > 0 ? 'physical' : 'status')
  const weatherAccOverrideEnemy = battleWeather ? getWeatherAccuracyOverride(m.id, battleWeather.type) : null
  let hitResult = doesMoveTargetOpponent(moveBattleData)
    ? doesMoveHit(weatherAccOverrideEnemy ?? m.accuracy, enemyBattleState, playerBattleState)
    : { hit: true, chance: 100 }
  // Invulnerability check (Fly / Dig charge turn) — only for moves that target opponent
  if (hitResult.hit && doesMoveTargetOpponent(moveBattleData) && playerBattleState.invulnerableState !== null) {
    const isDigBypassEnemy = m.id === 89 || m.id === 90 || isMagnitudeEnemy // Earthquake, Fissure, Magnitude
    const neverMisses = m.accuracy <= 0
    const bothAirborne =
      enemyBattleState.invulnerableState === 'airborne' && playerBattleState.invulnerableState === 'airborne'
    if (!neverMisses && !(playerBattleState.invulnerableState === 'underground' && isDigBypassEnemy) && !bothAirborne) {
      hitResult = { hit: false, chance: 0 }
    }
  }

  const bayPassImmunity = moveBattleData?.effects.find((e) => e.bayPassImuunity)

  const targetTypeImmune =
    hitResult.hit &&
    doesMoveTargetOpponent(moveBattleData) &&
    isTargetImmuneToMoveType(player, m.type) &&
    !bayPassImmunity
  let magnitudeLevelEnemy = 0
  if (isMagnitudeEnemy) {
    const roll = Math.random() * 100
    if (roll < 15) {
      magnitudeLevelEnemy = 1
      m = { ...m, power: 20 }
    } else if (roll < 35) {
      magnitudeLevelEnemy = 2
      m = { ...m, power: 30 }
    } else if (roll < 65) {
      magnitudeLevelEnemy = 3
      m = { ...m, power: 60 }
    } else if (roll < 85) {
      magnitudeLevelEnemy = 4
      m = { ...m, power: 90 }
    } else {
      magnitudeLevelEnemy = 5
      m = { ...m, power: 120 }
    }
  }
  // Return / Frustration: power derived from happiness (enemy has no party)
  if (m.id === RETURN_MOVE_ID || m.id === FRUSTRATION_MOVE_ID) {
    const h = calcHappiness(enemy, [enemy])
    m = { ...m, power: m.id === RETURN_MOVE_ID ? getReturnPower(h) : getFrustrationPower(h) }
  }
  const movePowerEnemy = isWeightTargetEnemy
    ? getWeightTargetPower(computePokemonSize(player).weightKg)
    : isWeightRatioEnemy
      ? getWeightRatioPower(computePokemonSize(enemy).weightKg, computePokemonSize(player).weightKg)
      : m.power
  const absorbed = hitResult.hit && !targetTypeImmune && movePowerEnemy > 0 && doesAbilityAbsorbMove(player, m.type)
  const dreamEaterBlockedEnemy = isDreamEaterEnemy && player.status !== 'sleep'
  const enemyHappiness = calcHappiness(enemy, [enemy])
  const criticalHit =
    hitResult.hit && !targetTypeImmune && !dreamEaterBlockedEnemy && movePowerEnemy > 0 && !absorbed
      ? rollCriticalHit(m.id, player, Math.random, enemyBattleState, getHappinessCritBonus(enemyHappiness))
      : false
  const facadeActiveEnemy =
    isFacadeBoostEnemy && enemy.status !== null && ['burn', 'paralyze', 'poison'].includes(enemy.status as string)
  const rawPowerEnemy = facadeActiveEnemy ? movePowerEnemy * 2 : movePowerEnemy
  const digPowerBoostEnemy =
    rawPowerEnemy > 0 &&
    playerBattleState.invulnerableState === 'underground' &&
    (m.id === 89 || m.id === 90 || isMagnitudeEnemy)
      ? 2
      : 1
  const effectivePowerEnemy =
    (battleWeather && rawPowerEnemy > 0
      ? Math.max(1, Math.round(rawPowerEnemy * getWeatherPowerMultiplier(m.type, battleWeather.type)))
      : rawPowerEnemy) * digPowerBoostEnemy
  const foulPlayAttackStatEnemy = isFoulPlayEnemy
    ? getModifiedStatValue(player, playerBattleState, 'attack')
    : undefined
  const atkAnimProfileEnemy = (() => {
    const md = moveData
    return getAttackAnimationProfile({
      name: md?.name ?? { en: m.name, he: m.name },
      type: m.type,
      power: m.power,
      damageClass: md?.damageClass ?? (m.power > 0 ? 'physical' : 'status'),
      speciesId: enemy.id,
    })
  })()
  const suppressHitAudioEnemy = hitCountEnemy > 1 && atkAnimProfileEnemy.family === 'lunge'
  const plannedDamage = (() => {
    if (!hitResult.hit || targetTypeImmune || absorbed || dreamEaterBlockedEnemy) return 0
    if (isOhkoEnemy) return player.hp
    if (isNightShadeEnemy) return enemy.level
    if (isSuperFangEnemy) return Math.max(1, Math.floor(player.hp / 2))
    if (effectivePowerEnemy <= 0) return 0

    const base = calcDamage(
      enemy,
      enemyBattleState,
      player,
      playerBattleState,
      playerSideState,
      effectivePowerEnemy,
      m.type,
      damageClass,
      criticalHit,
      foulPlayAttackStatEnemy,
    )
    const min = moveBattleData?.minimumDamage ?? null
    return min !== null ? Math.max(min, base) : base
  })()
  const allowTargetEffects =
    hitResult.hit &&
    !targetTypeImmune &&
    !absorbed &&
    !dreamEaterBlockedEnemy &&
    ((!isOhkoEnemy && effectivePowerEnemy <= 0) || plannedDamage < player.hp)
  const targetCanStillAct = enemyGoesFirst
  const resolvedEffectLines = hitResult.hit
    ? applyResolvedMoveEffects(
        enemy,
        enemyBattleState,
        enemySideState,
        attackerName,
        player,
        playerBattleState,
        playerSideState,
        defenderName,
        m,
        allowTargetEffects,
        targetCanStillAct,
        playerBattleState.turnFlags.magicCoatActive,
      )
    : []
  const plannedHpEffectAmount = hitResult.hit
    ? calculateMoveHpEffectAmount(plannedDamage, moveBattleData?.drainPercent ?? moveBattleData?.recoilPercent ?? null)
    : 0
  const msgs = [...prefix]
  msgs.push(...turnEffectLines)
  if (isRedirectedEnemy) {
    msgs.push(t('battle.usedMove', { name: attackerName, move: originalMoveNameEnemy }))
    if (redirectMsgEnemy) msgs.push(redirectMsgEnemy)
  }
  msgs.push(t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }))
  if (isMagnitudeEnemy && magnitudeLevelEnemy > 0) {
    msgs.push(t('battle.magnitudeLevel', { level: magnitudeLevelEnemy, power: m.power }))
  }
  // Weather effect on this move
  if (battleWeather && doesMoveTargetOpponent(moveBattleData)) {
    const wName = getWeatherDisplayName(battleWeather.type)
    const wMult = getWeatherPowerMultiplier(m.type, battleWeather.type)
    if (rawPowerEnemy > 0 && wMult > 1)
      msgs.push(t('battle.weatherPowerBoosted', { weather: wName, move: getMoveDisplayName(m.id) }))
    else if (rawPowerEnemy > 0 && wMult < 1)
      msgs.push(t('battle.weatherPowerReduced', { weather: wName, move: getMoveDisplayName(m.id) }))
    if (weatherAccOverrideEnemy === 0)
      msgs.push(t('battle.weatherAccuracyMax', { weather: wName, move: getMoveDisplayName(m.id) }))
  }

  if (effectivePowerEnemy > 0) {
    if (!hitResult.hit) {
      msgs.push(t('battle.moveMissed', { name: attackerName }))
    } else {
      if (criticalHit) {
        msgs.push(t('battle.criticalHit'))
      }
      const et = effText(m.type, player.types)
      if (et) msgs.push(et)
      if (plannedDamage > 0 && player.abilityId !== null) {
        const abilityMsg = getDefenderAbilityActivationMsg(
          player,
          playerBattleState,
          getAbilityBattleEffects(player.abilityId),
          m.type,
          defenderName,
        )
        if (abilityMsg) msgs.push(abilityMsg)
      }
      if (isWeightTargetEnemy || isWeightRatioEnemy) {
        const moveName = getMoveDisplayName(m.id)
        if (isWeightTargetEnemy) {
          const wStr = computePokemonSize(player).weightKg.toFixed(1)
          if (movePowerEnemy <= 40)
            msgs.push(t('battle.weightTargetWeak', { target: defenderName, weight: wStr, move: moveName }))
          else if (movePowerEnemy <= 80)
            msgs.push(t('battle.weightTargetMedium', { target: defenderName, weight: wStr, move: moveName }))
          else msgs.push(t('battle.weightTargetStrong', { target: defenderName, weight: wStr, move: moveName }))
        } else {
          if (movePowerEnemy <= 40) msgs.push(t('battle.weightRatioWeak', { move: moveName }))
          else if (movePowerEnemy <= 80)
            msgs.push(t('battle.weightRatioMedium', { attacker: attackerName, move: moveName }))
          else
            msgs.push(t('battle.weightRatioStrong', { attacker: attackerName, target: defenderName, move: moveName }))
        }
      }
    }
  } else if (isOhkoEnemy && hitResult.hit && !targetTypeImmune) {
    msgs.push(t('battle.ohkoHit'))
  } else if ((isSuperFangEnemy || isNightShadeEnemy) && hitResult.hit && !targetTypeImmune) {
    if (isSuperFangEnemy) msgs.push(t('battle.superFangHit'))
  } else if (!hitResult.hit) {
    msgs.push(t('battle.moveMissed', { name: attackerName }))
  } else if (targetTypeImmune) {
    msgs.push(t('battle.noEffect'))
  } else if (dreamEaterBlockedEnemy) {
    msgs.push(t('battle.dreamEaterFailed'))
    audio.playSFX('menu-cancel')
  } else if (isRestEnemy) {
    msgs.push(t('battle.restSleep', { name: attackerName }))
  } else if (isFocusEnergyEnemy) {
    msgs.push(t('battle.focusEnergy', { name: attackerName }))
  } else if (healPercentEnemy !== null) {
    msgs.push(t('battle.healedHp', { name: attackerName }))
  } else if (isStealthRockEnemy) {
    if (!playerSideState.stealthRockActive) {
      msgs.push(t('battle.stealthRockSet'))
    } else {
      msgs.push(t('battle.hazardAlreadySet'))
    }
  } else if (isSpikesEnemy) {
    if (playerSideState.spikesLayers < 3) {
      msgs.push(t('battle.spikesSet'))
    } else {
      msgs.push(t('battle.hazardAlreadySet'))
    }
  } else if (isToxicSpikesEnemy) {
    if (playerSideState.toxicSpikesLayers < 2) {
      msgs.push(t('battle.toxicSpikesSet'))
    } else {
      msgs.push(t('battle.hazardAlreadySet'))
    }
  } else if (isWeatherMoveEnemy) {
    const newWeatherType: WeatherConditionId = isSandstormMoveEnemy
      ? 'sandstorm'
      : isRainDanceMoveEnemy
        ? 'rain'
        : isSunnyDayMoveEnemy
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
      const boostMsgs = activateWeather(newWeatherType, 'enemy')
      msgs.push(getWeatherStartedLine(newWeatherType))
      msgs.push(...boostMsgs)
    }
  } else if (resolvedEffectLines.length === 0) {
    audio.playSFX('menu-cancel')
    msgs.push(t('battle.nothingHappened'))
  }
  if (hitCountEnemy > 1 && hitResult.hit && !targetTypeImmune && !dreamEaterBlockedEnemy) {
    msgs.push(t('battle.multiHit', { count: hitCountEnemy }))
  }
  if (plannedHpEffectAmount > 0) {
    if (moveBattleData?.drainPercent) {
      msgs.push(t('battle.drainHeal', { name: attackerName, amount: plannedHpEffectAmount }))
    }
    if (moveBattleData?.recoilPercent) {
      msgs.push(t('battle.recoilHit', { name: attackerName, amount: plannedHpEffectAmount }))
    }
  }
  if (selfCostAmount > 0) {
    msgs.push(t('battle.recoilHit', { name: attackerName, amount: selfCostAmount }))
  }
  msgs.push(...resolvedEffectLines)

  // Lock-in teardown messages (enemy)
  if (lockInOutrageFinalTurnEnemy) {
    msgs.push(t('battle.lockInOutrageStopped', { name: attackerName }))
  }
  if (lockInUproarFinalTurnEnemy) {
    msgs.push(t('battle.lockInUproarStopped', { name: attackerName }))
  }
  // Player Rage: if player is raging and was hit, their Attack rises
  const playerRageBoost = hitResult.hit && plannedDamage > 0 && playerBattleState.rageActive
  if (playerRageBoost) {
    msgs.push(t('battle.lockInRageBoost', { name: defenderName }))
  }

  // Brick Break: will shatter player screens on impact
  if (isBrickBreakEnemy && hitResult.hit && plannedDamage > 0) {
    const hadScreens = playerSideState.reflectTurnsRemaining > 0 || playerSideState.lightScreenTurnsRemaining > 0
    if (hadScreens) {
      msgs.push(t('battle.brickBreakShatter'))
    }
  }
  // Rapid Spin: will clear own hazards + leech seed on impact
  if (isRapidSpinClearEnemy && hitResult.hit && plannedDamage > 0) {
    const hadHazards =
      enemySideState.stealthRockActive || enemySideState.spikesLayers > 0 || enemySideState.toxicSpikesLayers > 0
    const hadSeed = enemyBattleState.leechSeeded
    if (hadHazards || hadSeed) {
      msgs.push(t('battle.rapidSpinClear', { name: attackerName }))
    }
  }
  // Defog: will clear all hazards and screens
  if (isDefogEnemy) {
    msgs.push(t('battle.defogClear'))
  }

  // Contact ability: player ability may inflict status or recoil on enemy when enemy uses physical move
  const contactEffectsOnEnemy: Array<{ status: import('../../types/battle-metadata.js').MajorStatusId }> = []
  let enemyContactRecoil = 0
  if (hitResult.hit && damageClass === 'physical' && plannedDamage > 0 && player.abilityId !== null) {
    const playerAbilityEffects = getAbilityBattleEffects(player.abilityId)
    for (const effect of playerAbilityEffects) {
      if (effect.kind === 'contactStatusChance' && !enemy.status && Math.random() * 100 < effect.chance) {
        contactEffectsOnEnemy.push({ status: effect.status })
        const statusLine = getStatusAppliedLine(attackerName, effect.status)
        if (statusLine) msgs.push(statusLine)
      }
      if (effect.kind === 'contactRecoilDamage') {
        enemyContactRecoil += Math.max(1, Math.floor((enemy.maxHp * effect.damagePercent) / 100))
      }
    }
  }

  // Substitute: precompute message based on planned damage (only for damaging moves)
  if (
    hitResult.hit &&
    plannedDamage > 0 &&
    doesMoveTargetOpponent(moveBattleData) &&
    playerBattleState.substituteActive
  ) {
    const enemyMoveName = moveData?.name?.en ?? m.name
    if (!isSubstituteBypass(enemyMoveName, enemy.abilityId)) {
      const subThreshold = Math.floor(player.maxHp / 4)
      if (plannedDamage >= subThreshold) {
        msgs.push(t('battle.substituteDestroyed'))
      } else {
        msgs.push(t('battle.substituteAbsorbed'))
      }
    } else if (plannedDamage > 0) {
      msgs.push(t('battle.substituteBypassed'))
    }
  }

  // Entry hazards: update state (Magic Coat redirects hazards back to enemy's side)
  const hazardReflectedByPlayer =
    playerBattleState.turnFlags.magicCoatActive &&
    m.power <= 0 &&
    (isStealthRockEnemy || isSpikesEnemy || isToxicSpikesEnemy)
  const enemyHazardTargetState = hazardReflectedByPlayer ? enemySideState : playerSideState
  const syncEnemyHazardBar = hazardReflectedByPlayer ? syncEnemyBar : syncPlayerBar
  if (isStealthRockEnemy && !enemyHazardTargetState.stealthRockActive) {
    enemyHazardTargetState.stealthRockActive = true
    syncEnemyHazardBar()
  }
  if (isSpikesEnemy && enemyHazardTargetState.spikesLayers < 3) {
    enemyHazardTargetState.spikesLayers++
    syncEnemyHazardBar()
  }
  if (isToxicSpikesEnemy && enemyHazardTargetState.toxicSpikesLayers < 2) {
    enemyHazardTargetState.toxicSpikesLayers++
    syncEnemyHazardBar()
  }

  textBox = createTextBox(msgs, rtl)
  playAttackAnimation(
    enemy,
    'enemy',
    'player',
    m,
    animationDirector,
    audio,
    battleAnimationContext,
    () => {
      // Rest: full heal + sleep 2 turns + all PP restored
      if (isRestEnemy) {
        applyRestEffect(enemy, enemyBattleState)
        setHP(enemyHpBar, enemy.hp)
        setStatus(enemyHpBar, enemy.status ?? '')
        spawnDamageNumber(`+${enemy.maxHp}`, BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2, BTL.OPP_SPRITE.y + 10, '#48d870')
        audio.playSFX('heal')
      }
      // Heal % moves (Recover, Roost, Milk Drink, etc.)
      if (healPercentEnemy !== null) {
        const tags = moveBattleData?.behaviorTags
        const healed = applyHealPercent(enemy, healPercentEnemy, tags)
        if (healed > 0) {
          setHP(enemyHpBar, enemy.hp)
          spawnDamageNumber(`+${healed}`, BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2, BTL.OPP_SPRITE.y + 10, '#48d870')
          audio.playSFX('heal')
        }
      }
      // Focus Energy: boost crit rate for all future moves
      if (isFocusEnergyEnemy) {
        enemyBattleState.critBoost = true
      }
      if (hitResult.hit) {
        let totalActualDamageEnemy = 0
        const enemyMoveName2 = moveData?.name?.en ?? m.name
        const enemyBypassesSub = isSubstituteBypass(enemyMoveName2, enemy.abilityId)
        for (let hit = 0; hit < hitCountEnemy; hit++) {
          if (player.hp <= 0) break
          const popupY = BTL.PLY_SPRITE.y + 10 - hit * 5
          if (
            plannedDamage > 0 &&
            playerBattleState.substituteActive &&
            !enemyBypassesSub &&
            doesMoveTargetOpponent(moveBattleData)
          ) {
            const threshold = Math.floor(player.maxHp / 4)
            if (plannedDamage >= threshold) {
              playerBattleState.substituteActive = false
              playerBattleState.substituteHitsAbsorbed = 0
              substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: 'player' }
              // audio.playMoveSFX(m.name);
            } else {
              playerBattleState.substituteHitsAbsorbed++
              substituteDollFlash = { timer: 0, duration: 0.3, color: '#ffffff', side: 'player' }
              // audio.playMoveSFX(m.name);
              if (playerBattleState.substituteHitsAbsorbed >= 2) {
                playerBattleState.substituteActive = false
                playerBattleState.substituteHitsAbsorbed = 0
                substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: 'player' }
              }
            }
            continue
          }
          totalActualDamageEnemy += applyMoveImpact(
            player,
            m,
            playerHpBar,
            BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
            popupY,
            plannedDamage,
            suppressHitAudioEnemy,
          )
        }
        // Endure: survive lethal hit at 1 HP
        if (player.hp <= 0 && playerBattleState.turnFlags.endured) {
          player.hp = 1
          setHP(playerHpBar, 1)
        }
        const actualDamage = totalActualDamageEnemy
        if (actualDamage > 0) {
          playerBattleState.turnFlags.tookDamageThisTurn = true
          if (damageClass === 'physical') playerBattleState.turnFlags.physicalDamageTakenThisTurn += actualDamage
          else if (damageClass === 'special') playerBattleState.turnFlags.specialDamageTakenThisTurn += actualDamage
          // Rage: player is in Rage and was hit — boost their Attack
          if (playerRageBoost) {
            playerBattleState.statModifiers.attack = applyBattleStatDelta(playerBattleState.statModifiers.attack, 1)
          }
          const drained = applyDrainHealing(enemy, actualDamage, moveBattleData?.drainPercent ?? null)
          if (drained > 0) {
            setHP(enemyHpBar, enemy.hp)
            spawnDamageNumber(`+${drained}`, BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2, BTL.OPP_SPRITE.y + 10, '#48d870')
            audio.playSFX('heal')
          }

          const recoil = applyRecoilDamage(enemy, actualDamage, moveBattleData?.recoilPercent ?? null)
          if (recoil.damage > 0) {
            setHP(enemyHpBar, enemy.hp)
            spawnDamageNumber(
              `-${recoil.damage}`,
              BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
              BTL.OPP_SPRITE.y + 10,
              '#f8d858',
            )
            flash = createFlash('#fff29a', 0.12)
            shake = createShake(1.4, 0.18)
            audio.playSFX('hit')
          }

          // Apply contact ability status effects to the attacking enemy
          for (const contactEffect of contactEffectsOnEnemy) {
            applyMajorStatus(enemy, enemyBattleState, { status: contactEffect.status, chance: 100, target: 'user' })
            setStatus(enemyHpBar, enemy.status ?? '')
          }
          // Apply contact recoil damage to the attacking enemy (Rough Skin, Iron Barbs)
          if (enemyContactRecoil > 0 && enemy.hp > 0) {
            enemy.hp = Math.max(0, enemy.hp - enemyContactRecoil)
            setHP(enemyHpBar, enemy.hp)
            spawnDamageNumber(
              `-${enemyContactRecoil}`,
              BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
              BTL.OPP_SPRITE.y + 10,
              '#f84038',
            )
            audio.playSFX('hit')
          }
        }
      }
      if (leaveUserAtOneHp) {
        const selfCost = applyLeaveUserAtOneHpCost(enemy)
        if (selfCost.damage > 0) {
          setHP(enemyHpBar, enemy.hp)
          spawnDamageNumber(
            `-${selfCost.damage}`,
            BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
            BTL.OPP_SPRITE.y + 10,
            '#f8d858',
          )
          flash = createFlash('#fff29a', 0.12)
          shake = createShake(1.4, 0.18)
          audio.playSFX('hit')
        }
      }
      // Destiny Bond: if enemy killed player and enemy has the bond (player set it), enemy also faints
      if (player.hp <= 0 && enemyBattleState.destinyBonded) {
        enemyBattleState.destinyBonded = false
        enemy.hp = 0
        setHP(enemyHpBar, 0)
        pendingDestinyBondMsg = t('battle.destinyBondTrigger', { name: attackerName })
      }
      // Brick Break: clear player screens after hitting
      if (isBrickBreakEnemy) {
        clearScreens(playerSideState)
        syncPlayerBar()
      }
      // Rapid Spin: clear own entry hazards and leech seed after hitting
      if (isRapidSpinClearEnemy) {
        clearEntryHazards(enemySideState)
        enemyBattleState.leechSeeded = false
        syncEnemyBar()
      }
      // Defog: clear all hazards and screens on both sides
      if (isDefogEnemy) {
        clearEntryHazards(playerSideState)
        clearEntryHazards(enemySideState)
        clearScreens(playerSideState)
        clearScreens(enemySideState)
        syncPlayerBar()
        syncEnemyBar()
      }
      // Lock-in teardown after move completes (enemy)
      if (lockInOutrageFinalTurnEnemy) {
        enemyBattleState.lockedInMoveId = null
        enemyBattleState.lockInTurnsRemaining = 0
        enemyBattleState.confusionTurnsRemaining = Math.floor(Math.random() * 4) + 2
      }
      if (isLockInRolloutEnemy) {
        if (lockInRolloutFinalTurnEnemy || !hitResult.hit) {
          enemyBattleState.lockedInMoveId = null
          enemyBattleState.rolloutTurnsActive = 0
        }
      }
      if (lockInUproarFinalTurnEnemy) {
        enemyBattleState.lockedInMoveId = null
        enemyBattleState.uproarTurnsRemaining = 0
      }
    },
    hitResult.hit && !absorbed && plannedDamage > 0,
    hitCountEnemy,
  )
  phase = 'ENEMY_TURN'
  phaseTimer = 0
}

// try to combine do attack and enemy turn
function funcAB({ forcedMoveIndex, actor }: { forcedMoveIndex?: number; actor: 'player' | 'enemy' }): void {
  const attackerBattleState = actor === 'player' ? playerBattleState : enemyBattleState
  const defenderBattleState = actor === 'player' ? enemyBattleState : playerBattleState
  const syncAttackerBar = actor === 'player' ? syncPlayerBar : syncEnemyBar
  const syncDefenderBar = actor === 'player' ? syncEnemyBar : syncPlayerBar
  const defenderActor: 'player' | 'enemy' = actor === 'player' ? 'enemy' : 'player'
  const attacker = actor === 'player' ? player : enemy
  const defender = actor === 'player' ? enemy : player

  const attackerSideState = actor === 'player' ? playerSideState : enemySideState
  const defenderSideState = actor === 'player' ? enemySideState : playerSideState
  const attackerHpBar = actor === 'player' ? playerHpBar : enemyHpBar
  const defenderHpBar = actor === 'player' ? enemyHpBar : playerHpBar

  const attackerSprite = actor === 'player' ? BTL.PLY_SPRITE : BTL.OPP_SPRITE
  const defenderSprite = actor === 'player' ? BTL.OPP_SPRITE : BTL.PLY_SPRITE
  const attackerPhase = actor === 'player' ? 'PLAYER_ATTACK' : 'ENEMY_TURN'

  // Clear Destiny Bond from defender when attacker acts (bond expires on user's next turn)
  if (defenderBattleState.destinyBonded) {
    defenderBattleState.destinyBonded = false
    syncDefenderBar()
  }
  const rtl = isRTL()
  const attackerName = getPokemonDisplayName(attacker.id)

  // --- Local helpers (scoped here on purpose: only funcAB consumes them) ---
  // Render the text box and hand control back to the attacker's phase, ending the turn.
  const finishTurn = (lines: string[]): void => {
    textBox = createTextBox(lines, rtl)
    phase = attackerPhase
    phaseTimer = 0
  }
  // Float a damage/heal number centered over a sprite (defaults to the attacker's sprite).
  const popNumber = (text: string, color: string, sprite = attackerSprite, dy = 10): void =>
    spawnDamageNumber(text, sprite.x + sprite.w / 2, sprite.y + dy, color)
  // Screen feedback for the attacker taking a hit (flash + shake + sfx).
  const selfHitFx = (): void => {
    flash = createFlash('#fff29a', 0.12)
    shake = createShake(1.4, 0.18)
    audio.playSFX('hit')
  }
  // Whether a Pokemon's ability inverts stat changes (Contrary).
  const hasContrary = (mon: typeof attacker): boolean =>
    mon.abilityId ? getAbilityBattleEffects(mon.abilityId).some((e) => e.kind === 'contraryStatChanges') : false
  // The standard "<name> used <move>!" line for the current move `m`.
  const usedMoveLine = (): string => t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) })
  // Common runMoveLifecycle wrapper: fills in the per-turn boilerplate shared by every special move.
  const runLifecycle = (
    opts: Omit<
      Parameters<typeof runMoveLifecycle>[0],
      'move' | 'attackerActor' | 'defenderActor' | 'context' | 'overrideNextPhase'
    >,
  ): void =>
    runMoveLifecycle({
      move: m,
      attackerActor: actor,
      defenderActor,
      context: battleAnimationContext,
      overrideNextPhase: attackerPhase,
      ...opts,
    })
  // --- End local helpers ---

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

  // Track last move used (for Copycat / Mirror Move also for choice item)
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
  if (startResult.selfDamage > 0) {
    selfHitFx()
    popNumber(`-${startResult.selfDamage}`, '#f8d858')
  }

  if (!startResult.canAct) {
    // Player releases via forcedChargeRelease; enemy has no forced index, so detect a charge release directly
    if (forcedChargeRelease || (actor === 'enemy' && pendingChargeMoveId !== null && pendingChargeMoveId === m.id)) {
      clearChargingMove(attackerBattleState)
    }
    finishTurn(turnEffectLines.length > 0 ? turnEffectLines : [t('battle.nothingHappened')])
    return
  }

  if (m.id === attackerBattleState.disabledMoveId || attackerBattleState.softLockedInMovesId?.includes(m.id)) {
    const msgs = [...turnEffectLines]
    msgs.push(
      t('battle.moveCantUseDisabled', { name: getPokemonDisplayName(attacker.id), move: getMoveDisplayName(m.id) }),
    )
    finishTurn(msgs)
    return
  }

  // ZzZ effect for sleep-usable moves used while asleep
  if (SLEEP_USABLE_MOVE_IDS.has(m.id) && startResult.events.includes('fast-asleep')) {
    const sx = attackerSprite.x + attackerSprite.w / 2
    const sy = attackerSprite.y - 4
    spawnDamageNumber('Z', sx - 5, sy, '#b088ff')
    spawnDamageNumber('z', sx + 2, sy - 7, '#9060e0')
    spawnDamageNumber('Z', sx + 9, sy - 14, '#b088ff')
  }

  const defenderName = getPokemonDisplayName(defender.id)
  const attackerParty = actor === 'player' ? getPlayerData().party : (trainerData?.party ?? [])

  let moveBattleData = getMoveBattleData(m.id)

  // --- Move Redirection (Sleep Talk / Metronome / Assist / Copycat / Mirror Move) ---
  const originalMoveName = getMoveDisplayName(m.id)
  const redirectTag =
    moveBattleData?.behaviorTags?.find(
      (tag) =>
        tag === 'sleep-talk' || tag === 'metronome' || tag === 'assist' || tag === 'copycat' || tag === 'mirror-move',
    ) ?? null
  let isRedirected = false
  let redirectMsg: string | null = null

  if (redirectTag !== null) {
    if (m.currentPp > 0) {
      if (defender.abilityId === 46) {
        m.currentPp-- // Pressure ability: additional PP reduction on foe's move
      }
      m.currentPp--
    }
    let redirectId: number | null = null

    if (redirectTag === 'sleep-talk') {
      if (attackerBattleState.majorStatus !== 'sleep') {
        const msgs = [
          ...turnEffectLines,
          t('battle.usedMove', { name: attackerName, move: originalMoveName }),
          t('battle.nothingHappened'),
        ]
        textBox = createTextBox(msgs, rtl)
        phase = attackerPhase
        phaseTimer = 0
        return
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
        const eligible: number[] = []
        for (let i = 0; i < attackerParty.length; i++) {
          if (actor === 'player' && i === activePartyIndex) continue
          for (const pm of attackerParty[i].moves) {
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
      const msgs = [
        ...turnEffectLines,
        t('battle.usedMove', { name: attackerName, move: originalMoveName }),
        t('battle.noMoveToCall'),
      ]
      textBox = createTextBox(msgs, rtl)
      phase = attackerPhase
      phaseTimer = 0
      return
    }

    const rmd = getMove(redirectId)
    if (rmd) {
      m = {
        ...m,
        id: redirectId,
        name: rmd.name.en,
        type: rmd.type as PokemonType,
        power: rmd.power ?? 0,
        accuracy: rmd.accuracy ?? 0,
      }
    }
    moveBattleData = getMoveBattleData(redirectId)
    if (redirectTag === 'copycat') {
      redirectMsg = t('battle.copiedMove', { name: attackerName, move: getMoveDisplayName(redirectId) })
    } else if (redirectTag === 'mirror-move') {
      redirectMsg = t('battle.mirroredMove', { name: attackerName, move: getMoveDisplayName(redirectId) })
    } else {
      redirectMsg = t('battle.calledMove', { move: getMoveDisplayName(redirectId) })
    }
    isRedirected = true
  }

  // --- End Redirection ---

  const isChargeRelease = !isRedirected && pendingChargeMoveId !== null && pendingChargeMoveId === m.id
  const isCurse = moveBattleData?.behaviorTags?.includes('curse') ?? false
  const requiresChargeTurn = moveBattleData?.behaviorTags?.includes('requires-charge-turn') ?? false
  const isChargeStart = requiresChargeTurn && !isChargeRelease && !isRedirected
  const isTwoTurnFly = moveBattleData?.behaviorTags?.includes('two-turn-fly') ?? false
  const isTwoTurnDig = moveBattleData?.behaviorTags?.includes('two-turn-dig') ?? false
  const leaveUserAtOneHp = moveBattleData?.behaviorTags?.includes('leave-user-at-1-hp') ?? false
  const isRest = moveBattleData?.behaviorTags?.includes('rest') ?? false
  const isFocusEnergy = moveBattleData?.behaviorTags?.includes('focus-energy') ?? false
  const isFacadeBoost = moveBattleData?.behaviorTags?.includes('facade-boost') ?? false
  const isFoulPlay = moveBattleData?.behaviorTags?.includes('foul-play') ?? false
  const isDreamEater = moveBattleData?.behaviorTags?.includes('dream-eater') ?? false
  const isFocusPunch = moveBattleData?.behaviorTags?.includes('focus-punch') ?? false
  const isOhko = moveBattleData?.behaviorTags?.includes('ohko') ?? false
  const isProtect = moveBattleData?.behaviorTags?.includes('protect') ?? false
  const isEndure = moveBattleData?.behaviorTags?.includes('endure') ?? false
  const isBrickBreak = moveBattleData?.behaviorTags?.includes('brick-break') ?? false
  const isDefog = moveBattleData?.behaviorTags?.includes('defog') ?? false
  const isStealthRock = moveBattleData?.behaviorTags?.includes('stealth-rock') ?? false
  const isSpikes = moveBattleData?.behaviorTags?.includes('spikes') ?? false
  const isToxicSpikes = moveBattleData?.behaviorTags?.includes('toxic-spikes') ?? false
  const isRapidSpinClear = moveBattleData?.behaviorTags?.includes('rapid-spin-clear') ?? false
  const isSubstitute = moveBattleData?.behaviorTags?.includes('substitute') ?? false
  const isBellyDrum = moveBattleData?.behaviorTags?.includes('belly-drum') ?? false
  const isMagnitude = moveBattleData?.behaviorTags?.includes('magnitude') ?? false
  // TODO : isBatonPass didnt checked yet on enemy
  const isBatonPass = moveBattleData?.behaviorTags?.includes('baton-pass') ?? false
  const isCounter = moveBattleData?.behaviorTags?.includes('counter') ?? false
  const isMirrorCoat = moveBattleData?.behaviorTags?.includes('mirror-coat') ?? false
  const isMagicCoat = moveBattleData?.behaviorTags?.includes('magic-coat') ?? false
  const isDestinyBond = moveBattleData?.behaviorTags?.includes('destiny-bond') ?? false
  const isFutureSight = moveBattleData?.behaviorTags?.includes('future-sight') ?? false
  const isWeightTarget = moveBattleData?.behaviorTags?.includes('weight-target') ?? false
  const isWeightRatio = moveBattleData?.behaviorTags?.includes('weight-ratio') ?? false
  const isDisable = moveBattleData?.behaviorTags?.includes('disable') ?? false
  const isHaze = moveBattleData?.behaviorTags?.includes('haze') ?? false
  const isNightShade = moveBattleData?.behaviorTags?.includes('night-shade') ?? false
  const isSuperFang = moveBattleData?.behaviorTags?.includes('super-fang') ?? false
  const isSandstormMove = moveBattleData?.behaviorTags?.includes('sandstorm') ?? false
  const isRainDanceMove = moveBattleData?.behaviorTags?.includes('rain') ?? false
  const isSunnyDayMove = moveBattleData?.behaviorTags?.includes('sun') ?? false
  const isHailMove = moveBattleData?.behaviorTags?.includes('hail') ?? false
  const isWeatherMove = isSandstormMove || isRainDanceMove || isSunnyDayMove || isHailMove
  const healPercent = moveBattleData?.healingPercent ?? null
  const hitCount = (() => {
    const min = moveBattleData?.minHits ?? null
    const max = moveBattleData?.maxHits ?? null
    if (min !== null && max !== null) return Math.floor(Math.random() * (max - min + 1)) + min
    return 1
  })()

  const selfCostAmount = leaveUserAtOneHp && attacker.hp ? Math.max(0, attacker.hp - 1) : 0

  if (!isRedirected && !isChargeRelease && m.currentPp > 0) {
    m.currentPp--
  }

  if (isCurse && attacker.types.includes('ghost')) {
    if (defenderBattleState.curseActive) {
      m.currentPp++
      finishTurn([t('battle.alreadyCursed', { name: defenderName })])
      return
    }
    moveBattleData!.statChanges = []
    attacker.hp = Math.max(1, attacker.hp - attacker.maxHp / 2)
    defenderBattleState.curseActive = true
    finishTurn([t('battle.curseGhost', { attacker: attackerName, target: defenderName })])
    return
  }

  // Lock-in behavior tags
  const isLockInOutrage = moveBattleData?.behaviorTags?.includes('lock-in-outrage') ?? false
  const isLockInRollout = moveBattleData?.behaviorTags?.includes('lock-in-rollout') ?? false
  const isLockInRage = moveBattleData?.behaviorTags?.includes('lock-in-rage') ?? false
  const isLockInUproar = moveBattleData?.behaviorTags?.includes('lock-in-uproar') ?? false
  if (isLockInOutrage) {
    if (attackerBattleState.lockedInMoveId === null) {
      attackerBattleState.lockedInMoveId = m.id
      attackerBattleState.lockInTurnsRemaining = Math.floor(Math.random() * 2) + 1
    } else {
      attackerBattleState.lockInTurnsRemaining--
    }
  }
  if (isLockInRollout) {
    if (attackerBattleState.lockedInMoveId === null) {
      attackerBattleState.lockedInMoveId = m.id
      attackerBattleState.rolloutTurnsActive = 1
    } else {
      attackerBattleState.rolloutTurnsActive = Math.min(5, attackerBattleState.rolloutTurnsActive + 1)
    }
    m = { ...m, power: Math.round(30 * Math.pow(2, attackerBattleState.rolloutTurnsActive - 1)) }
  }
  if (isLockInRage && attackerBattleState.lockedInMoveId === null) {
    attackerBattleState.lockedInMoveId = m.id
    attackerBattleState.rageActive = true
  }
  if (isLockInUproar) {
    if (attackerBattleState.lockedInMoveId === null) {
      attackerBattleState.lockedInMoveId = m.id
      attackerBattleState.uproarTurnsRemaining = Math.floor(Math.random() * 3) + 2 // 2-4 remaining = 3-5 total
    } else {
      attackerBattleState.uproarTurnsRemaining--
    }
  }
  const lockInOutrageFinalTurn = isLockInOutrage && attackerBattleState.lockInTurnsRemaining === 0
  const lockInRolloutFinalTurn = isLockInRollout && attackerBattleState.rolloutTurnsActive >= 5
  const lockInUproarFinalTurn = isLockInUproar && attackerBattleState.uproarTurnsRemaining === 0

  const moveData = getMove(m.id)
  if (isChargeStart) {
    startChargingMove(attackerBattleState, m.id)
    if (isTwoTurnFly) {
      attackerBattleState.invulnerableState = 'airborne'
    } else if (isTwoTurnDig) {
      attackerBattleState.invulnerableState = 'underground'
    }
    const chargeStatChanges = applyStatChanges(
      attackerBattleState,
      moveBattleData?.chargeStatChanges ?? [],
      'user',
      Math.random,
      hasContrary(attacker),
    )
    const msgs = [...turnEffectLines, getChargingLine(attackerName, getMoveDisplayName(m.id))]
    for (const change of chargeStatChanges) {
      msgs.push(getStatChangeLine(attackerName, change))
    }
    syncAttackerBar()
    finishTurn(msgs)
    if (isTwoTurnFly) {
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
    } else if (isTwoTurnDig) {
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
    return
  } else if (isFutureSight) {
    const msgs = [...turnEffectLines, usedMoveLine()]
    if (attackerSideState.futureSightTurnsRemaining > 0) {
      msgs.push(t('battle.futureSightAlreadyActive'))
    } else {
      const damage = calcDamage(
        attacker,
        attackerBattleState,
        defender,
        defenderBattleState,
        defenderSideState,
        120,
        'psychic',
        'special',
      )
      attackerSideState.futureSightTurnsRemaining = 2
      attackerSideState.futureSightDamage = damage
      msgs.push(t('battle.futureSightSet', { name: attackerName }))
    }
    finishTurn(msgs)
    return
  } else if (isDisable) {
    // Disable: disables the defender's last used move for 3-6 turns
    const msgs = [...turnEffectLines, usedMoveLine()]
    if (defenderBattleState.disabledMoveId !== null || defenderBattleState.lastMoveUsedId === null) {
      msgs.push(t('battle.nothingHappened'))
    } else {
      const disabledMoveName = getMoveDisplayName(defenderBattleState.lastMoveUsedId)
      defenderBattleState.disabledMoveId = defenderBattleState.lastMoveUsedId
      defenderBattleState.disabledMoveTurnsRemaining = Math.floor(Math.random() * 4) + 3
      msgs.push(t('battle.disableSuccess', { name: getPokemonDisplayName(defender.id), move: disabledMoveName }))
    }
    finishTurn(msgs)
    return
  } else if (isHaze) {
    const moveName = getMoveDisplayName(m.id)

    runLifecycle({
      hitTarget: true,
      onImpact: () => {
        attackerBattleState.statModifiers = createEmptyBattleStatModifiers()
        defenderBattleState.statModifiers = createEmptyBattleStatModifiers()

        syncAttackerBar()
        syncDefenderBar()

        return {
          endMessages: [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.hazeCleared'),
          ],
        }
      },
    })
    return
  }

  if (isChargeRelease) {
    clearChargingMove(attackerBattleState)
    if (attackerBattleState.invulnerableState !== null) {
      attackerBattleState.invulnerableState = null
      animationDirector.setActorState(actor, { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, rotation: 0 })
    }
  }
  applyPostMoveTurnFlags(attackerBattleState, m.id)

  // Snore: fails if not asleep (move ID 173)
  if (m.id === 173 && attackerBattleState.majorStatus !== 'sleep') {
    const msgs = [
      ...turnEffectLines,
      t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
      t('battle.nothingHappened'),
    ]
    finishTurn(msgs)
    return
  } else if (isFocusPunch && attackerBattleState.turnFlags.tookDamageThisTurn) {
    // Focus Punch: fails if the attacker took damage this turn
    const msgs = [
      ...turnEffectLines,
      t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
      t('battle.focusPunchFailed', { name: attackerName }),
    ]
    finishTurn(msgs)
    return
  } else if (isSubstitute) {
    // Substitute: attacker creates a doll at 1/4 max HP cost
    const cost = Math.floor(attacker.maxHp / 4)

    runLifecycle({
      hitTarget: false,
      canExecute: () => {
        if (attackerBattleState.substituteActive) {
          audio.playSFX('menu-cancel')
          return {
            success: false,
            errorMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
              t('battle.substituteAlreadyActive', { name: attackerName }),
            ],
          }
        }
        if (attacker.hp <= cost) {
          audio.playSFX('menu-cancel')
          return {
            success: false,
            errorMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
              t('battle.substituteTooWeak', { name: attackerName }),
            ],
          }
        }
        return null
      },

      // All state updates and UI bar refreshes execute cleanly on impact
      onImpact: () => {
        attacker.hp -= cost
        setHP(attackerHpBar, attacker.hp)
        attackerBattleState.substituteActive = true
        attackerBattleState.substituteHitsAbsorbed = 0

        syncAttackerBar()

        return {
          endMessages: [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
            t('battle.substituteCreated', { name: attackerName }),
          ],
        }
      },
    })
    return
  } else if (isBellyDrum) {
    // Belly Drum: costs 50% max HP, raises Attack to max — fails if HP ≤ 50%
    const cost = Math.floor(attacker.maxHp / 2)
    const moveName = getMoveDisplayName(m.id)

    runLifecycle({
      hitTarget: false,
      canExecute: () => {
        if (attacker.hp <= cost) {
          audio.playSFX('menu-cancel')

          return {
            success: false,
            errorMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              t('battle.bellyDrumTooWeak', { name: attackerName }),
            ],
          }
        }
        return null
      },

      onImpact: () => {
        // 1. Deduct HP and update UI elements
        attacker.hp = Math.max(1, attacker.hp - cost)
        setHP(attackerHpBar, attacker.hp)
        syncAttackerBar()

        // 2. Compute ability effects and apply stat modifications
        const statChanges = applyStatChanges(
          attackerBattleState,
          moveBattleData!.statChanges,
          'user',
          Math.random,
          hasContrary(attacker),
        )

        // 3. Trigger immediate floating text feedback
        popNumber(`-${cost}`, '#f8d858')

        // 4. Trigger visual screen feedback
        flash = createFlash('#fff29a', 0.12)
        shake = createShake(1.4, 0.18)

        // 5. Return array of final UI text lines to progress to the attacker phase
        return {
          endMessages: [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.bellyDrumCost', { name: attackerName }),
            ...statChanges.map((c) => getStatChangeLine(attackerName, c)),
          ],
        }
      },
    })
    return
  } else if (isBatonPass) {
    // Baton Pass: save substitute state for incoming Pokemon
    // !TODO: baton pass on the enemy side is not yet verified — test enemy carryover
    if (attackerBattleState.substituteActive) {
      pendingSubstituteCarryover = {
        active: true,
        hitsAbsorbed: attackerBattleState.substituteHitsAbsorbed,
      }
      attackerBattleState.substituteActive = false
    }
    const msgs = [...turnEffectLines, t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) })]
    finishTurn(msgs)
    return
  } else if (isMagicCoat) {
    // Magic Coat: attacker cloaks themselves to reflect status moves this turn
    const moveName = getMoveDisplayName(m.id)

    runLifecycle({
      hitTarget: false,
      onImpact: () => {
        attackerBattleState.turnFlags.magicCoatActive = true
        return {
          endMessages: [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.magicCoatActive', { name: attackerName }),
          ],
        }
      },
    })
    return
  } else if (isDestinyBond) {
    // Destiny Bond: mark the defender with the bond — if defender kills attacker before attacker acts again, defender also faints
    const moveName = getMoveDisplayName(m.id)

    runLifecycle({
      hitTarget: false,
      onImpact: () => {
        defenderBattleState.destinyBonded = true
        syncDefenderBar()

        return {
          endMessages: [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            t('battle.destinyBondActive', { name: defenderName }),
          ],
        }
      },
    })
    return
  } else if (isProtect || isEndure) {
    const moveName = getMoveDisplayName(m.id)

    runLifecycle({
      hitTarget: false,
      onImpact: () => {
        if (isProtect) {
          attackerBattleState.turnFlags.protected = true
          syncAttackerBar()
        }
        if (isEndure) {
          attackerBattleState.turnFlags.endured = true
        }

        return {
          endMessages: [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: moveName }),
            isProtect ? t('battle.protected', { name: attackerName }) : t('battle.endured', { name: attackerName }),
          ],
        }
      },
    })
    return
  } else if (doesMoveTargetOpponent(moveBattleData) && defenderBattleState.turnFlags.protected) {
    // Defender is protected — block the attack entirely
    const msgs = [
      ...turnEffectLines,
      t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
      t('battle.protectedBlock', { name: defenderName }),
    ]
    finishTurn(msgs)
    return
  } else if (isCounter || isMirrorCoat) {
    const moveName = getMoveDisplayName(m.id)
    const counterDamage = isCounter
      ? attackerBattleState.turnFlags.physicalDamageTakenThisTurn * 2
      : attackerBattleState.turnFlags.specialDamageTakenThisTurn * 2

    runLifecycle({
      hitTarget: true,
      canExecute: () => {
        if (counterDamage <= 0 || defender.hp <= 0) {
          audio.playSFX('menu-cancel')
          return {
            success: false,
            errorMessages: [
              ...turnEffectLines,
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
          defenderHpBar,
          defenderSprite.x + defenderSprite.w / 2,
          defenderSprite.y + 10,
          counterDamage,
          false,
        )

        return {
          endMessages: [...turnEffectLines, t('battle.usedMove', { name: attackerName, move: moveName })],
        }
      },
    })
    return
  }

  const damageClass = moveData?.damageClass ?? (m.power > 0 ? 'physical' : 'status')
  const weatherAccOverride = battleWeather ? getWeatherAccuracyOverride(m.id, battleWeather.type) : null
  let hitResult = doesMoveTargetOpponent(moveBattleData)
    ? doesMoveHit(weatherAccOverride ?? m.accuracy, attackerBattleState, defenderBattleState)
    : { hit: true, chance: 100 }
  // Invulnerability check (Fly / Dig charge turn) — only for moves that target opponent
  if (hitResult.hit && doesMoveTargetOpponent(moveBattleData) && defenderBattleState.invulnerableState !== null) {
    const isDigBypass = m.id === 89 || m.id === 90 || isMagnitude // Earthquake, Fissure, Magnitude
    const neverMisses = m.accuracy <= 0 || m.accuracy === null
    const bothAirborne =
      attackerBattleState.invulnerableState === 'airborne' && defenderBattleState.invulnerableState === 'airborne'
    if (!neverMisses && !(defenderBattleState.invulnerableState === 'underground' && isDigBypass) && !bothAirborne) {
      hitResult = { hit: false, chance: 0 }
    }
  }

  const hasBypassImmunity = moveBattleData?.effects?.find((effect) => effect.bayPassImuunity) ?? false
  const targetTypeImmune =
    hitResult.hit &&
    doesMoveTargetOpponent(moveBattleData) &&
    isTargetImmuneToMoveType(defender, m.type) &&
    !hasBypassImmunity
  let magnitudeLevel = 0
  if (isMagnitude) {
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

  const isReversal = moveBattleData?.behaviorTags?.includes('reversal') ?? false
  if (isReversal) {
    const power = Math.max(1, attacker.maxHp - attacker.hp)
    m = { ...m, power }
  }

  // Return / Frustration: power derived from happiness (enemy has no party — uses itself)
  if (m.id === RETURN_MOVE_ID || m.id === FRUSTRATION_MOVE_ID) {
    const h = actor === 'player' ? calcHappiness(attacker, getPlayerData().party) : calcHappiness(attacker, [attacker])
    m = { ...m, power: m.id === RETURN_MOVE_ID ? getReturnPower(h) : getFrustrationPower(h) }
  }
  const movePower = isWeightTarget
    ? getWeightTargetPower(computePokemonSize(defender).weightKg)
    : isWeightRatio
      ? getWeightRatioPower(computePokemonSize(attacker).weightKg, computePokemonSize(defender).weightKg)
      : m.power
  const absorbed = hitResult.hit && !targetTypeImmune && movePower > 0 && doesAbilityAbsorbMove(defender, m.type)
  // Dream Eater: blocked if target is not asleep
  const dreamEaterBlocked = isDreamEater && defender.status !== 'sleep'
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
  // Facade: double power when user has a status condition
  const facadeActive =
    isFacadeBoost && attacker.status !== null && ['burn', 'paralyze', 'poison'].includes(attacker.status as string)
  const rawPower = facadeActive ? movePower * 2 : movePower
  const digPowerBoost =
    rawPower > 0 &&
    defenderBattleState.invulnerableState === 'underground' &&
    (m.id === 89 || m.id === 90 || isMagnitude)
      ? 2
      : 1
  const effectivePower =
    (battleWeather && rawPower > 0
      ? Math.max(1, Math.round(rawPower * getWeatherPowerMultiplier(m.type, battleWeather.type)))
      : rawPower) * digPowerBoost
  // Foul Play: use target's attack stat
  const foulPlayAttackStat = isFoulPlay ? getModifiedStatValue(defender, defenderBattleState, 'attack') : undefined
  // Compute animation profile to determine suppressAudio for multi-hit
  const atkAnimProfile = (() => {
    const md = moveData
    return getAttackAnimationProfile({
      name: md?.name ?? { en: m.name, he: m.name },
      type: m.type,
      power: m.power,
      damageClass: md?.damageClass ?? (m.power > 0 ? 'physical' : 'status'),
      speciesId: attacker.id,
    })
  })()
  const suppressHitAudio = hitCount > 1 && atkAnimProfile.family === 'lunge'
  const plannedDamage = (() => {
    if (!hitResult.hit || targetTypeImmune || absorbed || dreamEaterBlocked) return 0
    if (isOhko) return defender.hp
    if (isNightShade) return attacker.level
    if (isSuperFang) return Math.max(1, Math.floor(defender.hp / 2))
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
    const min = moveBattleData?.minimumDamage ?? null
    return min !== null ? Math.max(min, base) : base
  })()
  const allowTargetEffects =
    hitResult.hit &&
    !targetTypeImmune &&
    !absorbed &&
    !dreamEaterBlocked &&
    ((!isOhko && effectivePower <= 0) || plannedDamage < defender.hp)
  const targetCanStillAct = actor === 'player' ? !enemyAlreadyAttacked : enemyGoesFirst
  const resolvedEffectLines = hitResult.hit
    ? applyResolvedMoveEffects(
        attacker,
        attackerBattleState,
        attackerSideState,
        attackerName,
        defender,
        defenderBattleState,
        defenderSideState,
        defenderName,
        m,
        allowTargetEffects,
        targetCanStillAct,
        defenderBattleState.turnFlags.magicCoatActive,
      )
    : []
  const plannedHpEffectAmount = hitResult.hit
    ? calculateMoveHpEffectAmount(plannedDamage, moveBattleData?.drainPercent ?? moveBattleData?.recoilPercent ?? null)
    : 0
  const msgs: string[] = []
  msgs.push(...turnEffectLines)
  if (isRedirected) {
    msgs.push(t('battle.usedMove', { name: attackerName, move: originalMoveName }))
    if (redirectMsg) msgs.push(redirectMsg)
  }
  msgs.push(t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }))
  if (isMagnitude && magnitudeLevel > 0) {
    msgs.push(t('battle.magnitudeLevel', { level: magnitudeLevel, power: m.power }))
  }
  // Weather effect on this move
  if (battleWeather && doesMoveTargetOpponent(moveBattleData)) {
    const wName = getWeatherDisplayName(battleWeather.type)
    const wMult = getWeatherPowerMultiplier(m.type, battleWeather.type)
    if (rawPower > 0 && wMult > 1)
      msgs.push(t('battle.weatherPowerBoosted', { weather: wName, move: getMoveDisplayName(m.id) }))
    else if (rawPower > 0 && wMult < 1)
      msgs.push(t('battle.weatherPowerReduced', { weather: wName, move: getMoveDisplayName(m.id) }))
    if (weatherAccOverride === 0)
      msgs.push(t('battle.weatherAccuracyMax', { weather: wName, move: getMoveDisplayName(m.id) }))
  }

  if (effectivePower > 0) {
    if (!hitResult.hit) {
      msgs.push(t('battle.moveMissed', { name: attackerName }))
    } else {
      if (criticalHit) {
        msgs.push(t('battle.criticalHit'))
      }
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
      if (isWeightTarget || isWeightRatio) {
        const moveName = getMoveDisplayName(m.id)
        if (isWeightTarget) {
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
  } else if (isOhko && hitResult.hit && !targetTypeImmune) {
    msgs.push(t('battle.ohkoHit'))
  } else if ((isSuperFang || isNightShade) && hitResult.hit && !targetTypeImmune) {
    if (isSuperFang) msgs.push(t('battle.superFangHit'))
  } else if (!hitResult.hit) {
    msgs.push(t('battle.moveMissed', { name: attackerName }))
  } else if (targetTypeImmune) {
    msgs.push(t('battle.noEffect'))
  } else if (dreamEaterBlocked) {
    msgs.push(t('battle.dreamEaterFailed'))
    audio.playSFX('menu-cancel')
  } else if (isRest) {
    msgs.push(t('battle.restSleep', { name: attackerName }))
  } else if (isFocusEnergy) {
    msgs.push(t('battle.focusEnergy', { name: attackerName }))
  } else if (isProtect || isEndure) {
    msgs.push(isProtect ? t('battle.protected', { name: attackerName }) : t('battle.endured', { name: attackerName }))
  } else if (healPercent !== null) {
    msgs.push(t('battle.healedHp', { name: attackerName }))
  } else if (isStealthRock) {
    if (!defenderSideState.stealthRockActive) {
      msgs.push(t('battle.stealthRockSet'))
    } else {
      msgs.push(t('battle.hazardAlreadySet'))
    }
  } else if (isSpikes) {
    if (defenderSideState.spikesLayers < 3) {
      msgs.push(t('battle.spikesSet'))
    } else {
      msgs.push(t('battle.hazardAlreadySet'))
    }
  } else if (isToxicSpikes) {
    if (defenderSideState.toxicSpikesLayers < 2) {
      msgs.push(t('battle.toxicSpikesSet'))
    } else {
      msgs.push(t('battle.hazardAlreadySet'))
    }
  } else if (isWeatherMove) {
    const newWeatherType: WeatherConditionId = isSandstormMove
      ? 'sandstorm'
      : isRainDanceMove
        ? 'rain'
        : isSunnyDayMove
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
      const boostMsgs = activateWeather(newWeatherType, actor)
      msgs.push(getWeatherStartedLine(newWeatherType))
      msgs.push(...boostMsgs)
    }
  } else if (resolvedEffectLines.length === 0) {
    msgs.push(t('battle.nothingHappened'))
    audio.playSFX('menu-cancel')
  }
  if (hitCount > 1 && hitResult.hit && !targetTypeImmune && !dreamEaterBlocked) {
    msgs.push(t('battle.multiHit', { count: hitCount }))
  }
  if (plannedHpEffectAmount > 0) {
    if (moveBattleData?.drainPercent) {
      msgs.push(t('battle.drainHeal', { name: attackerName, amount: plannedHpEffectAmount }))
    }
    if (moveBattleData?.recoilPercent) {
      msgs.push(t('battle.recoilHit', { name: attackerName, amount: plannedHpEffectAmount }))
    }
  }
  if (selfCostAmount > 0) {
    msgs.push(t('battle.recoilHit', { name: attackerName, amount: selfCostAmount }))
  }
  msgs.push(...resolvedEffectLines)

  // Lock-in teardown messages
  if (lockInOutrageFinalTurn) {
    msgs.push(t('battle.lockInOutrageStopped', { name: attackerName }))
  }
  if (lockInUproarFinalTurn) {
    msgs.push(t('battle.lockInUproarStopped', { name: attackerName }))
  }
  // Defender Rage: if defender is raging and was hit, its Attack rises
  const defenderRageBoost = hitResult.hit && plannedDamage > 0 && defenderBattleState.rageActive
  if (defenderRageBoost) {
    msgs.push(t('battle.lockInRageBoost', { name: defenderName }))
  }

  // Brick Break: will shatter defender screens on impact
  if (isBrickBreak && hitResult.hit && plannedDamage > 0) {
    const hadScreens = defenderSideState.reflectTurnsRemaining > 0 || defenderSideState.lightScreenTurnsRemaining > 0
    if (hadScreens) {
      msgs.push(t('battle.brickBreakShatter'))
    }
  }
  // Rapid Spin: will clear own hazards + leech seed on impact
  if (isRapidSpinClear && hitResult.hit && plannedDamage > 0) {
    const hadHazards =
      attackerSideState.stealthRockActive ||
      attackerSideState.spikesLayers > 0 ||
      attackerSideState.toxicSpikesLayers > 0
    const hadSeed = attackerBattleState.leechSeeded
    if (hadHazards || hadSeed) {
      msgs.push(t('battle.rapidSpinClear', { name: attackerName }))
    }
  }
  // Defog: will clear all hazards and screens
  if (isDefog) {
    msgs.push(t('battle.defogClear'))
  }

  // Contact ability: defender ability may inflict status or recoil on attacker when hit by physical move
  const contactEffectsOnAttacker: Array<{ status: import('../../types/battle-metadata.js').MajorStatusId }> = []
  let attackerContactRecoil = 0
  if (hitResult.hit && damageClass === 'physical' && plannedDamage > 0 && defender.abilityId !== null) {
    const defenderAbilityEffects = getAbilityBattleEffects(defender.abilityId)
    for (const effect of defenderAbilityEffects) {
      if (effect.kind === 'contactStatusChance' && !attacker.status && Math.random() * 100 < effect.chance) {
        contactEffectsOnAttacker.push({ status: effect.status })
        const statusLine = getStatusAppliedLine(attackerName, effect.status)
        if (statusLine) msgs.push(statusLine)
      }
      if (effect.kind === 'contactRecoilDamage') {
        attackerContactRecoil += Math.max(1, Math.floor((attacker.maxHp * effect.damagePercent) / 100))
      }
    }
  }

  // Substitute: precompute message based on planned damage (only for damaging moves)
  if (hitResult.hit && plannedDamage > 0 && doesMoveTargetOpponent(moveBattleData) && defenderBattleState.substituteActive) {
    const attackerMoveName = moveData?.name?.en ?? m.name
    if (!isSubstituteBypass(attackerMoveName, attacker.abilityId)) {
      const subThreshold = Math.floor(defender.maxHp / 4)
      if (plannedDamage >= subThreshold) {
        msgs.push(t('battle.substituteDestroyed'))
      } else {
        msgs.push(t('battle.substituteAbsorbed'))
      }
    } else if (plannedDamage > 0) {
      msgs.push(t('battle.substituteBypassed'))
    }
  }

  // Entry hazards: update state (Magic Coat redirects hazards back to attacker's side)
  const hazardReflectedByDefender =
    defenderBattleState.turnFlags.magicCoatActive && m.power <= 0 && (isStealthRock || isSpikes || isToxicSpikes)
  const hazardTargetState = hazardReflectedByDefender ? attackerSideState : defenderSideState
  const syncHazardBar = hazardReflectedByDefender ? syncAttackerBar : syncDefenderBar
  if (isStealthRock && !hazardTargetState.stealthRockActive) {
    hazardTargetState.stealthRockActive = true
    syncHazardBar()
  }
  if (isSpikes && hazardTargetState.spikesLayers < 3) {
    hazardTargetState.spikesLayers++
    syncHazardBar()
  }
  if (isToxicSpikes && hazardTargetState.toxicSpikesLayers < 2) {
    hazardTargetState.toxicSpikesLayers++
    syncHazardBar()
  }

  textBox = createTextBox(msgs, rtl)
  playAttackAnimation(
    attacker,
    actor,
    defenderActor,
    m,
    animationDirector,
    audio,
    battleAnimationContext,
    () => {
      // Rest: full heal + sleep 2 turns + all PP restored
      if (isRest) {
        applyRestEffect(attacker, attackerBattleState)
        setHP(attackerHpBar, attacker.hp)
        setStatus(attackerHpBar, attacker.status ?? '')
        popNumber(`+${attacker.maxHp}`, '#48d870')
        audio.playSFX('heal')
      }
      // Heal % moves (Recover, Roost, Milk Drink, etc.)
      if (healPercent !== null) {
        const tags = moveBattleData?.behaviorTags

        const healed = applyHealPercent(attacker, healPercent, tags)
        if (healed > 0) {
          setHP(attackerHpBar, attacker.hp)
          popNumber(`+${healed}`, '#48d870')
          audio.playSFX('heal')
        }
      }
      // Focus Energy: boost crit rate for all future moves
      if (isFocusEnergy) {
        attackerBattleState.critBoost = true
      }
      if (hitResult.hit) {
        let totalActualDamage = 0
        const attackerMoveName = moveData?.name?.en ?? m.name
        const attackerBypassesSub = isSubstituteBypass(attackerMoveName, attacker.abilityId)
        for (let hit = 0; hit < hitCount; hit++) {
          if (defender.hp <= 0) break
          const popupY = defenderSprite.y + 10 - hit * 5
          if (
            plannedDamage > 0 &&
            defenderBattleState.substituteActive &&
            !attackerBypassesSub &&
            doesMoveTargetOpponent(moveBattleData)
          ) {
            const threshold = Math.floor(defender.maxHp / 4)
            if (plannedDamage >= threshold) {
              defenderBattleState.substituteActive = false
              defenderBattleState.substituteHitsAbsorbed = 0
              substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: defenderActor }
            } else {
              defenderBattleState.substituteHitsAbsorbed++
              substituteDollFlash = { timer: 0, duration: 0.3, color: '#ffffff', side: defenderActor }
              if (defenderBattleState.substituteHitsAbsorbed >= 2) {
                defenderBattleState.substituteActive = false
                defenderBattleState.substituteHitsAbsorbed = 0
                substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: defenderActor }
              }
            }
            continue
          }
          totalActualDamage += applyMoveImpact(
            defender,
            m,
            defenderHpBar,
            defenderSprite.x + defenderSprite.w / 2,
            popupY,
            plannedDamage,
            suppressHitAudio,
          )
        }
        // Endure: defender survives lethal hit at 1 HP
        if (defender.hp <= 0 && defenderBattleState.turnFlags.endured) {
          defender.hp = 1
          setHP(defenderHpBar, 1)
        }
        const actualDamage = totalActualDamage
        if (actualDamage > 0) {
          defenderBattleState.turnFlags.tookDamageThisTurn = true
          if (damageClass === 'physical') defenderBattleState.turnFlags.physicalDamageTakenThisTurn += actualDamage
          else if (damageClass === 'special') defenderBattleState.turnFlags.specialDamageTakenThisTurn += actualDamage
          // Rage: defender is in Rage and was hit — boost its Attack
          if (defenderRageBoost) {
            defenderBattleState.statModifiers.attack = applyBattleStatDelta(defenderBattleState.statModifiers.attack, 1)
          }
          const drained = applyDrainHealing(attacker, actualDamage, moveBattleData?.drainPercent ?? null)
          if (drained > 0) {
            setHP(attackerHpBar, attacker.hp)
            popNumber(`+${drained}`, '#48d870')
            audio.playSFX('heal')
          }

          const recoil = applyRecoilDamage(attacker, actualDamage, moveBattleData?.recoilPercent ?? null)
          if (recoil.damage > 0) {
            setHP(attackerHpBar, attacker.hp)
            popNumber(`-${recoil.damage}`, '#f8d858')
            selfHitFx()
          }

          // Apply contact ability status effects to the attacker
          for (const contactEffect of contactEffectsOnAttacker) {
            applyMajorStatus(attacker, attackerBattleState, {
              status: contactEffect.status,
              chance: 100,
              target: 'user',
            })
            setStatus(attackerHpBar, attacker.status ?? '')
          }
          // Apply contact recoil damage to the attacker (Rough Skin, Iron Barbs)
          if (attackerContactRecoil > 0 && attacker.hp > 0) {
            attacker.hp = Math.max(0, attacker.hp - attackerContactRecoil)
            setHP(attackerHpBar, attacker.hp)
            popNumber(`-${attackerContactRecoil}`, '#f84038')
            audio.playSFX('hit')
          }
        }
      }
      if (leaveUserAtOneHp) {
        const selfCost = applyLeaveUserAtOneHpCost(attacker)
        if (selfCost.damage > 0) {
          setHP(attackerHpBar, attacker.hp)
          popNumber(`-${selfCost.damage}`, '#f8d858')
          selfHitFx()
        }
      }
      // Destiny Bond: if attacker killed defender and attacker has the bond (defender set it), attacker also faints
      if (defender.hp <= 0 && attackerBattleState.destinyBonded) {
        attackerBattleState.destinyBonded = false
        attacker.hp = 0
        setHP(attackerHpBar, 0)
        pendingDestinyBondMsg = t('battle.destinyBondTrigger', { name: attackerName })
      }
      // Brick Break: clear defender screens after hitting
      if (isBrickBreak) {
        clearScreens(defenderSideState)
        syncDefenderBar()
      }
      // Rapid Spin: clear own entry hazards and leech seed after hitting
      if (isRapidSpinClear) {
        clearEntryHazards(attackerSideState)
        attackerBattleState.leechSeeded = false
        syncAttackerBar()
      }
      // Defog: clear all hazards and screens on both sides
      if (isDefog) {
        clearEntryHazards(attackerSideState)
        clearEntryHazards(defenderSideState)
        clearScreens(attackerSideState)
        clearScreens(defenderSideState)
        syncAttackerBar()
        syncDefenderBar()
      }
      // Lock-in teardown after move completes
      if (lockInOutrageFinalTurn) {
        attackerBattleState.lockedInMoveId = null
        attackerBattleState.lockInTurnsRemaining = 0
        attackerBattleState.confusionTurnsRemaining = Math.floor(Math.random() * 4) + 2
      }
      if (isLockInRollout) {
        if (lockInRolloutFinalTurn || !hitResult.hit) {
          attackerBattleState.lockedInMoveId = null
          attackerBattleState.rolloutTurnsActive = 0
        }
      }
      if (lockInUproarFinalTurn) {
        attackerBattleState.lockedInMoveId = null
        attackerBattleState.uproarTurnsRemaining = 0
      }
    },
    hitResult.hit && !absorbed && plannedDamage > 0,
    hitCount,
  )
  phase = attackerPhase
  phaseTimer = 0
}
