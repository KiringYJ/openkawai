import { DEFAULT_TILE_THEME, TILE_THEMES, type TileThemeId } from '../content/tile-themes';
import type { Difficulty, GameMode } from '../content/layouts';
import { readStoredValue, writeStoredValue, type StorageAccess } from './storage';

export interface Settings {
  readonly tileTheme: TileThemeId;
  readonly mode: GameMode;
  readonly difficulty: Difficulty;
}

export const SETTINGS_KEY = 'openkawai.settings.v1';
export const DEFAULT_SETTINGS: Settings = { tileTheme: DEFAULT_TILE_THEME, mode: 'classic', difficulty: 1 };

export function loadSettings(storage: StorageAccess | null): Settings {
  const value = readStoredValue(storage, SETTINGS_KEY);
  if (!value || typeof value !== 'object') return { ...DEFAULT_SETTINGS };
  const data = value as Record<string, unknown>;
  const tileTheme = data.tileTheme === 'fluentflat' ? 'fluentanimated' : data.tileTheme;
  return {
    tileTheme: TILE_THEMES.some((theme) => theme.id === tileTheme)
      ? tileTheme as TileThemeId : DEFAULT_TILE_THEME,
    mode: data.mode === 'classic' || data.mode === 'zen' ? data.mode : DEFAULT_SETTINGS.mode,
    difficulty: data.difficulty === 0 || data.difficulty === 1 || data.difficulty === 2
      ? data.difficulty : DEFAULT_SETTINGS.difficulty,
  };
}

export function saveSettings(storage: StorageAccess | null, settings: Settings): boolean {
  return writeStoredValue(storage, SETTINGS_KEY, settings);
}
