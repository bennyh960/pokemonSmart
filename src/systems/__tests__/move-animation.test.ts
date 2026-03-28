import { describe, expect, it } from 'vitest';
import { getAttackAnimationProfile } from '../move-animation.js';

describe('getAttackAnimationProfile', () => {
  it('maps basic physical moves to lunge', () => {
    const profile = getAttackAnimationProfile({
      name: { en: 'Pound', he: 'חבטה' },
      type: 'normal',
      power: 40,
      damageClass: 'physical',
    });

    expect(profile.family).toBe('lunge');
  });

  it('maps iconic ranged special moves to beam', () => {
    const profile = getAttackAnimationProfile({
      name: { en: 'Thunderbolt', he: 'מכת ברק' },
      type: 'electric',
      power: 90,
      damageClass: 'special',
    });

    expect(profile.family).toBe('beam');
  });

  it('maps ember-like moves to projectile', () => {
    const profile = getAttackAnimationProfile({
      name: { en: 'Ember', he: 'גחל' },
      type: 'fire',
      power: 40,
      damageClass: 'special',
    });

    expect(profile.family).toBe('projectile');
  });

  it('maps self-buff status moves to self pulse', () => {
    const profile = getAttackAnimationProfile({
      name: { en: 'Swords Dance', he: 'ריקוד חרבות' },
      type: 'normal',
      power: 0,
      damageClass: 'status',
    });

    expect(profile.family).toBe('pulse');
    expect(profile.selfTarget).toBe(true);
  });

  it('maps heavy ground moves to burst', () => {
    const profile = getAttackAnimationProfile({
      name: { en: 'Earthquake', he: 'רעידת אדמה' },
      type: 'ground',
      power: 100,
      damageClass: 'physical',
    });

    expect(profile.family).toBe('burst');
  });
});
