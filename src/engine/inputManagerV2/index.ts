export { InputManager, inputManager } from './InputManager';

export { attachKeyboardAdapter } from './adapters/keyboardadapter';
export { attachPointerAdapter } from './adapters/pointerAdapter';
export { attachVirtualButton } from './adapters/virtualButtonAdapter';

export { createVirtualControlPad } from './dom/VirtualControlPad';
export type { VirtualControlPad, ExtraKeyConfig } from './dom/VirtualControlPad';

export { useIsTouchPrimary } from './react/useIsTouchPrimary';
export { isTouchPrimaryDevice, watchTouchPrimaryDevice } from './utils/deviceDetection';

export { useInputLayer } from './react/useInputLayer';
export type { UseInputLayerOptions } from './react/useInputLayer';
export { useInputStack } from './react/useInputStack';

export { VirtualKeyButton } from './react/Virtualkeybutton';
export type { VirtualKeyButtonProps } from './react/Virtualkeybutton';

export type {
  Point,
  InputSource,
  KeyBinding,
  HitTestResult,
  PointerHitTest,
  InputActionEvent,
  InputLayer,
  InputLogEntry,
} from './types';

// My Last Commit before relase
