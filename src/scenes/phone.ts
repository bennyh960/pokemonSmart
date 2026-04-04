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
import type { PhoneContactInfo } from '../types/index.js';

// Re-encounter status needs to be checked without a full TrainerData object.
// We only need the persisted encounter state and the config — but config is in
// the trainer's map JSON which we don't load here. So we just show the raw count
// and whether cooldown has passed based on the saved encounter state.
//
// For full status we would need the trainer's reencounter config. We work around
// this by storing what we need at registration time. For now we show what we know.

const MS_PER_HOUR = 3_600_000;

function getStatusLine(contact: PhoneContactInfo): string {
  if (!hasActiveGame()) return '';
  const pd = getPlayerData();
  const state = pd.trainerEncounters[contact.trainerId];
  if (!state) return t('phone.status.notDefeated');
  // We don't have the reencounter config here (it lives in the map JSON),
  // so we show the last-defeat time as a hint only
  const hoursSince = (Date.now() - state.lastDefeatedAt) / MS_PER_HOUR;
  const timeLine = hoursSince < 1
    ? t('phone.status.justBattled')
    : t('phone.status.hoursSince', { hours: Math.floor(hoursSince) });
  return `${t('phone.status.battles', { count: state.count })}  ${timeLine}`;
}

export function createPhoneScene(
  input: InputManager,
  stateMachine: StateMachine,
): Scene {
  let selectedIndex = 0;
  let contacts: PhoneContactInfo[] = [];
  let dialogueLine: string | null = null;  // shown at bottom after selecting a contact

  return {
    enter(): void {
      selectedIndex = 0;
      dialogueLine = null;
      contacts = hasActiveGame() ? [...getPlayerData().phoneContacts] : [];
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

        // Trainer name
        const nameX = rtl ? SCREEN_W - 10 : 12;
        const name = contact.trainerName;
        drawText(ctx, name, nameX, y + 9, {
          size: 7,
          color: selected ? '#ffffff' : '#cccccc',
          align: rtl ? 'right' : 'left',
          direction: rtl ? 'rtl' : 'ltr',
        });

        // Location
        const loc = locale === 'he' ? contact.locationHe : contact.locationEn;
        if (loc) {
          const locX = rtl ? SCREEN_W - 10 : 12;
          drawText(ctx, loc, locX, y + 18, {
            size: 6,
            color: selected ? '#88ccff' : '#666',
            align: rtl ? 'right' : 'left',
            direction: rtl ? 'rtl' : 'ltr',
          });
        }

        // Status on right side
        const status = getStatusLine(contact);
        const statusX = rtl ? 10 : SCREEN_W - 10;
        drawText(ctx, status, statusX, y + 9, {
          size: 6,
          color: '#aaaaaa',
          align: rtl ? 'left' : 'right',
          direction: 'ltr',
        });
      }

      // Scroll indicator
      if (contacts.length > VISIBLE) {
        const scrollText = `${selectedIndex + 1}/${contacts.length}`;
        drawText(ctx, scrollText, SCREEN_W - 6, LIST_TOP + VISIBLE * ROW_H / 2, {
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
  const state = pd.trainerEncounters[contact.trainerId];
  const locale = getLocale();
  const name = contact.trainerName;
  const loc = locale === 'he' ? contact.locationHe : contact.locationEn;

  if (!state) {
    return t('phone.call.notBeaten', { name });
  }

  const hoursSince = (Date.now() - state.lastDefeatedAt) / MS_PER_HOUR;
  // We don't know the exact timeInterval from here, but we show a contextual line
  if (hoursSince < 1) {
    return t('phone.call.stillTraining', { name });
  }

  const locLine = loc ? t('phone.call.location', { name, location: loc }) : t('phone.call.ready', { name });
  return locLine;
}
