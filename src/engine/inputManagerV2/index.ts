export { InputManager, inputManager } from './inputManager';

export { attachKeyboardAdapter } from './adapters/Keyboardadapter';
export { attachPointerAdapter } from './adapters/PointerAdapter';

export { useInputLayer } from './react/useInputLayer';
export type { UseInputLayerOptions } from './react/useInputLayer';
export { useInputStack } from './react/useInputStack';

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
