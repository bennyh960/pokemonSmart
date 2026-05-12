/**
 * PhoneScene — Trainer contact list for re-encounter checking.
 *
 * Shows trainers added to the player's phone after first defeat.
 * Each entry displays the trainer's name, location, and re-encounter status:
 *   - "Ready for a rematch!" — eligible now
 *   - "Training... X hours left" — on cooldown
 *   - "No more battles" — max encounters reached
 *   - "—" — no re-encounter configured
 *
 * The player cannot start a battle from the phone — they must travel to the
 * trainer's location. The phone is purely informational.
 *
 * Open with `T` key from the overworld (set in overworld.ts input handling).
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { drawText, fillRect } from '../engine/renderer.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
import { t, isRTL, getLocale } from '../i18n/i18n.js';
import { getPlayerData, hasActiveGame } from '../systems/game-state.js';
import { getReencounterStatus } from '../systems/reencounter.js';
import { getMapDisplayName, findMapForTrainer } from '../systems/map-manager.js';
import { getDayCareEntry, getDayCarePhase } from '../systems/day-care.js';
import type { PhoneContactInfo } from '../types/index.js';

/** Resolve the trainer's location label for the current locale. */
function getContactLocation(contact: PhoneContactInfo, locale: string): string {
  if (contact.mapId) {
    const name = getMapDisplayName(contact.mapId);
    return locale === 'he' ? name.he : name.en;
  }
  // Legacy fallback for contacts saved before mapId was stored
  return locale === 'he' ? contact.locationHe : contact.locationEn;
}

type StatusKind = 'ready' | 'cooldown' | 'maxReached' | 'unknown';

function getReencounterKind(contact: PhoneContactInfo): StatusKind {
  if (!hasActiveGame()) return 'unknown';
  if (contact.contactType === 'day-care') return 'unknown';
  if (contact.reencounterConfig?.infinite) return 'ready'; // infinite trainers are always ready
  const pd = getPlayerData();
  const state = pd.trainerEncounters[contact.trainerId];
  if (!state || !contact.reencounterConfig) return 'unknown';
  const fakeTrainer = { id: contact.trainerId, reencounter: contact.reencounterConfig } as Parameters<
    typeof getReencounterStatus
  >[0];
  const status = getReencounterStatus(fakeTrainer);
  if (!status.eligible) return status.reason === 'max-reached' ? 'maxReached' : 'cooldown';
  return 'ready';
}

function getStatusColor(kind: StatusKind): string {
  if (kind === 'ready') return '#44ff88';
  if (kind === 'maxReached') return '#888888';
  if (kind === 'cooldown') return '#ffaa44';
  return '#aaaaaa';
}

function getStatusLine(contact: PhoneContactInfo): string {
  if (!hasActiveGame()) return '';
  const pd = getPlayerData();

  if (contact.contactType === 'day-care') {
    const entry = getDayCareEntry(pd, contact.trainerId);
    if (!entry) return '–';
    const phase = getDayCarePhase(pd, entry);
    if (phase === 'stop-grow') return t('phone.daycare.status.stopGrow');
    if (phase === 'doing-well') return t('phone.daycare.status.wellDoing');
    return t('phone.daycare.status.adapting');
  }

  const state = pd.trainerEncounters[contact.trainerId];
  if (!state) return t('phone.status.notDefeated');

  if (contact.reencounterConfig?.infinite) return t('phone.status.infinite');

  if (!contact.reencounterConfig) {
    return t('phone.status.battles', { count: state.count });
  }

  const fakeTrainer = { id: contact.trainerId, reencounter: contact.reencounterConfig } as Parameters<
    typeof getReencounterStatus
  >[0];
  const status = getReencounterStatus(fakeTrainer);

  if (!status.eligible) {
    if (status.reason === 'max-reached') return t('phone.status.maxReached');
    if (status.reason === 'cooldown') {
      if (status.minutesLeft != null) return t('phone.status.cooldownMin', { minutes: status.minutesLeft });
      if (status.hoursLeft != null) return t('phone.status.cooldown', { hours: status.hoursLeft });
      return t('phone.status.notReady');
    }
    // 'no-config' or unexpected — not eligible
    return t('phone.status.notReady');
  }
  return t('phone.status.ready');
}

export function createPhoneScene(input: InputManager, stateMachine: StateMachine): Scene {
  let selectedIndex = 0;
  let contacts: PhoneContactInfo[] = [];
  let dialogueLine: string | null = null; // shown at bottom after selecting a contact

  return {
    enter(): void {
      selectedIndex = 0;
      dialogueLine = null;
      if (!hasActiveGame()) {
        contacts = [];
        return;
      }
      const pd = getPlayerData();
      // Resolve missing mapId for existing contacts by searching the loaded map cache
      for (const contact of pd.phoneContacts) {
        if (!contact.mapId) {
          const found = findMapForTrainer(contact.trainerId);
          // console.debug(`[DEBUG] Resolving mapId for contact ${contact.trainerId} → ${found}`);
          if (found) contact.mapId = found; // patch in place — persists on next save
        }
      }
      contacts = [...pd.phoneContacts];
    },

    exit(): void {},

    update(_dt: number): void {
      if (input.isKeyPressed('Escape') || input.isKeyPressed('Backspace')) {
        stateMachine.pop();
        return;
      }

      if (dialogueLine) {
        // Any key dismisses the dialogue line
        if (input.isKeyPressed('Enter') || input.isKeyPressed(' ') || input.isKeyPressed('Escape')) {
          dialogueLine = null;
        }
        return;
      }

      if (contacts.length === 0) return;

      if (input.isKeyPressed('ArrowUp')) {
        selectedIndex = (selectedIndex - 1 + contacts.length) % contacts.length;
      } else if (input.isKeyPressed('ArrowDown')) {
        selectedIndex = (selectedIndex + 1) % contacts.length;
      } else if (input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
        const contact = contacts[selectedIndex];
        // Show a "call" dialogue from the trainer's perspective
        dialogueLine = buildCallDialogue(contact);
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      const rtl = isRTL();
      const locale = getLocale();

      // Background
      fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, '#1a1a2e');

      // Title bar
      fillRect(ctx, 0, 0, SCREEN_W, 18, '#16213e');
      drawText(ctx, t('phone.title'), SCREEN_W / 2, 11, {
        size: 8,
        color: '#00d4ff',
        align: 'center',
      });

      if (contacts.length === 0) {
        drawText(ctx, t('phone.empty'), SCREEN_W / 2, SCREEN_H / 2, {
          size: 7,
          color: '#888',
          align: 'center',
        });
        drawText(ctx, t('phone.hint.back'), SCREEN_W / 2, SCREEN_H - 10, {
          size: 6,
          color: '#555',
          align: 'center',
        });
        return;
      }

      // Contact list
      const LIST_TOP = 24;
      const ROW_H = 28;
      const VISIBLE = 4;
      const scrollOffset = Math.max(0, selectedIndex - VISIBLE + 1);

      for (let i = 0; i < Math.min(VISIBLE, contacts.length); i++) {
        const idx = i + scrollOffset;
        if (idx >= contacts.length) break;
        const contact = contacts[idx];
        const y = LIST_TOP + i * ROW_H;
        const selected = idx === selectedIndex;

        // Row background
        fillRect(ctx, 4, y, SCREEN_W - 8, ROW_H - 2, selected ? '#0f3460' : '#16213e');
        if (selected) {
          fillRect(ctx, 4, y, 3, ROW_H - 2, '#00d4ff');
        }

        // Trainer name (top line, left/right aligned by locale)
        const nameX = rtl ? SCREEN_W - 10 : 12;
        drawText(ctx, contact.trainerName[locale as 'en' | 'he'] ?? contact.trainerName.en, nameX, y + 9, {
          size: 7,
          color: selected ? '#ffffff' : '#cccccc',
          align: rtl ? 'right' : 'left',
          direction: rtl ? 'rtl' : 'ltr',
          maxWidth: SCREEN_W / 2 - 10,
        });

        // Map location (bottom line, same side as name)
        const loc = getContactLocation(contact, locale);
        const locLabel = loc ? `@ ${loc}` : '';
        if (locLabel) {
          drawText(ctx, locLabel, nameX, y + 20, {
            size: 6,
            color: selected ? '#88ccff' : '#4488aa',
            align: rtl ? 'right' : 'left',
            direction: rtl ? 'rtl' : 'ltr',
          });
        }

        // Status (right side, opposite to name)
        const status = getStatusLine(contact);
        const statusKind = getReencounterKind(contact);
        const statusX = rtl ? 10 : SCREEN_W - 10;
        drawText(ctx, status, statusX, y + 9, {
          size: 6,
          color: getStatusColor(statusKind),
          align: rtl ? 'left' : 'right',
          direction: 'ltr',
        });
      }

      // Scroll indicator
      if (contacts.length > VISIBLE) {
        const scrollText = `${selectedIndex + 1}/${contacts.length}`;
        drawText(ctx, scrollText, SCREEN_W - 6, LIST_TOP + (VISIBLE * ROW_H) / 2, {
          size: 6,
          color: '#555',
          align: 'right',
        });
      }

      // Dialogue overlay (after pressing Enter on a contact)
      if (dialogueLine) {
        fillRect(ctx, 4, SCREEN_H - 38, SCREEN_W - 8, 34, '#0d0d1a');
        fillRect(ctx, 4, SCREEN_H - 38, SCREEN_W - 8, 2, '#00d4ff');
        drawText(ctx, dialogueLine, SCREEN_W / 2, SCREEN_H - 22, {
          size: 6,
          color: '#ffffff',
          align: 'center',
          maxWidth: SCREEN_W - 20,
          direction: rtl ? 'rtl' : 'ltr',
        });
        drawText(ctx, t('phone.hint.dismiss'), SCREEN_W / 2, SCREEN_H - 10, {
          size: 5,
          color: '#555',
          align: 'center',
        });
        return;
      }

      // Bottom hint
      drawText(ctx, t('phone.hint.controls'), SCREEN_W / 2, SCREEN_H - 6, {
        size: 5,
        color: '#444',
        align: 'center',
      });
    },
  };
}

function buildCallDialogue(contact: PhoneContactInfo): string {
  if (!hasActiveGame()) return '';
  const pd = getPlayerData();
  const locale = getLocale();
  const name = contact.trainerName[locale as 'en' | 'he'] ?? contact.trainerName.en;
  const loc = getContactLocation(contact, locale);

  if (contact.contactType === 'day-care') {
    const entry = getDayCareEntry(pd, contact.trainerId);
    if (!entry) return t('phone.daycare.call.adapting', { name, location: loc });
    const pokeName = entry.pokemon.name;
    const phase = getDayCarePhase(pd, entry);
    if (phase === 'stop-grow') return t('phone.daycare.call.stopGrow', { name, pokeName, location: loc });
    if (phase === 'doing-well') return t('phone.daycare.call.wellDoing', { name, pokeName, location: loc });
    return t('phone.daycare.call.adapting', { name, pokeName, location: loc });
  }

  const state = pd.trainerEncounters[contact.trainerId];
  if (!state) return t('phone.call.notBeaten', { name });

  if (contact.reencounterConfig?.infinite) {
    return loc ? t('phone.call.infinite', { name, location: loc }) : t('phone.call.ready', { name });
  }

  if (!contact.reencounterConfig) {
    return loc ? t('phone.call.location', { name, location: loc }) : t('phone.call.ready', { name });
  }

  const fakeTrainer = { id: contact.trainerId, reencounter: contact.reencounterConfig } as Parameters<
    typeof getReencounterStatus
  >[0];
  const status = getReencounterStatus(fakeTrainer);

  if (!status.eligible) {
    if (status.reason === 'max-reached') return t('phone.call.noMoreBattles', { name });
    if (status.minutesLeft != null) return t('phone.call.cooldownMin', { name, minutes: status.minutesLeft });
    if (status.hoursLeft != null) return t('phone.call.cooldown', { name, hours: status.hoursLeft });
    return t('phone.call.stillTraining', { name });
  }

  return loc ? t('phone.call.location', { name, location: loc }) : t('phone.call.ready', { name });
}
