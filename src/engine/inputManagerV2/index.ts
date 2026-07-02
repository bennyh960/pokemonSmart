export { InputManager, inputManager } from './inputManager';

export { attachKeyboardAdapter } from './adapters/Keyboardadapter';
export { attachPointerAdapter } from './adapters/PointerAdapter';

export { useInputLayer } from './react/Useinputlayer';
export type { UseInputLayerOptions } from './react/Useinputlayer';
export { useInputStack } from './react/Useinputstack';

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
