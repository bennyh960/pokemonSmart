import { useEffect, useState } from 'react';
import { isTouchPrimaryDevice, watchTouchPrimaryDevice } from '../utils/deviceDetection';

/**
 * Live-updating "is touch the primary input" flag for use inside React
 * components — e.g. a settings screen that shows different hint text on
 * touch vs. desktop. For deciding whether to CREATE the plain-DOM control
 * pad at bootstrap, use isTouchPrimaryDevice() directly instead; that code
 * runs once, outside React, before any component exists.
 */
export function useIsTouchPrimary(): boolean {
  const [isTouch, setIsTouch] = useState(isTouchPrimaryDevice);
  useEffect(() => watchTouchPrimaryDevice(setIsTouch), []);
  return isTouch;
}
