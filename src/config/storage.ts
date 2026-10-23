export interface StorageAccess {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function browserStorage(): StorageAccess | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredValue(storage: StorageAccess | null, key: string): unknown {
  try {
    const value = storage?.getItem(key);
    return value ? JSON.parse(value) as unknown : null;
  } catch {
    return null;
  }
}

export function writeStoredValue(storage: StorageAccess | null, key: string, value: unknown): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
