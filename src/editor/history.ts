import type { EditorCommand } from './types.js';
import type { EditorState } from './editor-state.js';

/** Manages undo/redo via command pattern. */
export class HistoryManager {
  private undoStack: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];
  private maxSize = 100;
  private state: EditorState;

  constructor(state: EditorState) {
    this.state = state;
  }

  /** Execute a command and push onto undo stack. Clears redo. */
  execute(command: EditorCommand): void {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxSize) this.undoStack.shift();
    this.redoStack = [];
    this.state.emit('history-changed');
  }

  /** Push a command that was already applied (skip execute). Used by fill tool to avoid double-apply. */
  executeAlreadyApplied(command: EditorCommand): void {
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxSize) this.undoStack.shift();
    this.redoStack = [];
    this.state.emit('history-changed');
  }

  undo(): void {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.undo();
    this.redoStack.push(cmd);
    this.state.emit('history-changed');
    this.state.emit('map-modified');
  }

  redo(): void {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    cmd.execute();
    this.undoStack.push(cmd);
    this.state.emit('history-changed');
    this.state.emit('map-modified');
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }
  clear(): void { this.undoStack = []; this.redoStack = []; this.state.emit('history-changed'); }
}
