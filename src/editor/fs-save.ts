/**
 * fs-save.ts — Reusable File System Access API helper.
 *
 * Picks a directory once, then saves files directly to disk with automatic backup.
 * Works in Chrome/Edge. Falls back to regular download elsewhere.
 */

// File System Access API types (not yet in default TS DOM lib)
declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
    }) => Promise<FileSystemDirectoryHandle>;
  }
  interface FileSystemDirectoryHandle {
    queryPermission(desc: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  }
}

/** Stored directory handles per type (e.g. 'map', 'tileset'). */
const dirHandles = new Map<string, FileSystemDirectoryHandle>();

/** Check if File System Access API is available. */
export function hasFSAccess(): boolean {
  return typeof window.showDirectoryPicker === 'function';
}

/**
 * Get or prompt for a directory handle for the given type.
 * On first call, asks the user to pick the folder. Reuses it after that.
 */
async function getDirHandle(type: string): Promise<FileSystemDirectoryHandle> {
  let handle = dirHandles.get(type);
  if (handle) {
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return handle;
  }

  handle = await window.showDirectoryPicker!({ id: `editor-${type}`, mode: 'readwrite' });
  dirHandles.set(type, handle);
  return handle;
}

/**
 * Save a JSON string to the target directory.
 * - Backs up existing file to backup/ subfolder
 * - Writes (or creates) the file
 *
 * @param type   - Category key, e.g. 'map' or 'tileset' (used to remember the folder)
 * @param fileName - Target filename, e.g. 'zeroville.json'
 * @param content  - The JSON string to write
 */
export async function saveToDirectory(type: string, fileName: string, content: string): Promise<void> {
  const dirHandle = await getDirHandle(type);

  // 1. Backup existing file if it exists
  try {
    const existingFile = await dirHandle.getFileHandle(fileName);
    const existingData = await (await existingFile.getFile()).text();

    // Create backup/ subdirectory
    const backupDir = await dirHandle.getDirectoryHandle('backup', { create: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = fileName.replace(/\.json$/, '');
    const backupFile = await backupDir.getFileHandle(`${baseName}_${timestamp}.json`, { create: true });

    const backupWriter = await backupFile.createWritable();
    await backupWriter.write(existingData);
    await backupWriter.close();
  } catch {
    // File doesn't exist yet — no backup needed
  }

  // 2. Write the new file
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}
