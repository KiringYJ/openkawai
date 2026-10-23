import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY } from '../src/config/settings';
import { type StorageAccess } from '../src/config/storage';
import {
  HIGH_SCORES_KEY, MAX_HIGH_SCORE, highScoreRank, insertHighScore, loadHighScores, playerName,
  qualifiesForHighScore, recordHighScore, saveHighScores,
} from '../src/game/high-scores';

function memoryStorage(): StorageAccess {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

describe('settings persistence', () => {
  it('remembers theme, mode, and next-game Classic difficulty', () => {
    const storage = memoryStorage();
    expect(saveSettings(storage, { tileTheme: 'openmoji', mode: 'zen', difficulty: 2 })).toBe(true);
    expect(loadSettings(storage)).toEqual({ tileTheme: 'openmoji', mode: 'zen', difficulty: 2 });
    expect(saveSettings(storage, { ...loadSettings(storage), mode: 'classic' })).toBe(true);
    expect(loadSettings(storage)).toEqual({ tileTheme: 'openmoji', mode: 'classic', difficulty: 2 });
  });

  it('keeps existing preferences in Classic mode when no mode was stored', () => {
    const storage = memoryStorage();
    storage.setItem(SETTINGS_KEY, JSON.stringify({ tileTheme: 'openmoji', difficulty: 2 }));
    expect(loadSettings(storage)).toEqual({ tileTheme: 'openmoji', mode: 'classic', difficulty: 2 });
  });

  it('remembers Fluent Animated and migrates the retired Fluent Flat setting', () => {
    const storage = memoryStorage();
    expect(saveSettings(storage, { tileTheme: 'fluentanimated', mode: 'classic', difficulty: 0 })).toBe(true);
    expect(loadSettings(storage)).toEqual({ tileTheme: 'fluentanimated', mode: 'classic', difficulty: 0 });

    storage.setItem(SETTINGS_KEY, JSON.stringify({ tileTheme: 'fluentflat', difficulty: 2 }));
    expect(loadSettings(storage)).toEqual({ tileTheme: 'fluentanimated', mode: 'classic', difficulty: 2 });
  });

  it('falls back independently for unknown or malformed values', () => {
    const storage = memoryStorage();
    storage.setItem(SETTINGS_KEY, '{broken');
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
    storage.setItem(SETTINGS_KEY, JSON.stringify({ tileTheme: '../../secret', difficulty: 0 }));
    expect(loadSettings(storage)).toEqual({ ...DEFAULT_SETTINGS, difficulty: 0 });
    storage.setItem(SETTINGS_KEY, JSON.stringify({ tileTheme: 'noto', difficulty: 9 }));
    expect(loadSettings(storage)).toEqual({ tileTheme: 'noto', mode: 'classic', difficulty: 1 });
    storage.setItem(SETTINGS_KEY, JSON.stringify({ tileTheme: 'noto', mode: 'unknown', difficulty: 2 }));
    expect(loadSettings(storage)).toEqual({ tileTheme: 'noto', mode: 'classic', difficulty: 2 });
    storage.setItem(SETTINGS_KEY, JSON.stringify({ tileTheme: 'noto', mode: 'zen', difficulty: -1 }));
    expect(loadSettings(storage)).toEqual({ tileTheme: 'noto', mode: 'zen', difficulty: 1 });
  });

  it('keeps the game usable when browser storage is unavailable', () => {
    const storage: StorageAccess = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); } };
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings(storage, DEFAULT_SETTINGS)).toBe(false);
    expect(loadHighScores(storage)).toEqual([[], [], []]);
    expect(saveHighScores(null, [[], [], []])).toBe(false);
  });
});

describe('high scores (RE-0019)', () => {
  it('requires strictly more than tenth place and inserts new ties below existing ties', () => {
    const table = Array.from({ length: 10 }, (_, index) => ({ name: 'PLAYER', score: 10 - index, level: 0 }));
    expect(qualifiesForHighScore(table, 1)).toBe(false);
    expect(qualifiesForHighScore(table, 2)).toBe(true);
    expect(highScoreRank(table, 2)).toBe(9);
    const result = insertHighScore(table, { name: 'NEW', score: 2, level: 1 });
    expect(result).toHaveLength(10);
    expect(result[8]?.name).toBe('PLAYER');
    expect(result[9]?.name.trim()).toBe('NEW');
    expect(qualifiesForHighScore([], 0)).toBe(false);
  });

  it('keeps the three difficulty tables separate and preserves ALL PASS', () => {
    const tables = recordHighScore([[], [], []], 2, { name: 'WINNER', score: 25000, level: 11 });
    expect(tables[0]).toEqual([]);
    expect(tables[1]).toEqual([]);
    expect(tables[2][0]).toMatchObject({ score: 25000, level: 11 });
    const storage = memoryStorage();
    expect(saveHighScores(storage, tables)).toBe(true);
    expect(loadHighScores(storage)).toEqual(tables);
  });

  it('accepts only the 16-character Latin name vocabulary, including empty names', () => {
    expect(playerName('abc 中文 !123')).toBe('ABC  ');
    expect(playerName('abcdefghijklmnopqr')).toBe('ABCDEFGHIJKLMNOP');
    expect(insertHighScore([], { name: '', score: 4, level: 0 })[0]?.name).toBe(' '.repeat(16));
  });

  it('rejects corrupt persisted rows and sorts valid records', () => {
    const storage = memoryStorage();
    storage.setItem(HIGH_SCORES_KEY, JSON.stringify([[{ name: 'OK', score: 3, level: 0 },
      { name: 'TOP', score: 5, level: 11 }, { name: '<script>', score: 99, level: 0 },
      { name: 'BAD', score: -1, level: 0 }, { name: 'BAD', score: 8, level: 12 },
      { name: 'OVERFLOW', score: MAX_HIGH_SCORE + 1, level: 0 }], null, []]));
    expect(loadHighScores(storage)[0].map((row) => row.score)).toEqual([5, 3]);
    expect(loadHighScores(storage)[1]).toEqual([]);
  });

  it('previews a pending record without changing persisted tables and bounds scores to u32', () => {
    const storage = memoryStorage();
    const original = [{ name: 'FIRST', score: 5, level: 0 }];
    saveHighScores(storage, [original, [], []]);
    const preview = insertHighScore(original, { name: 'PENDING', score: 5, level: 1 });
    expect(highScoreRank(original, 5)).toBe(1);
    expect(preview[1]?.name.trim()).toBe('PENDING');
    expect(loadHighScores(storage)[0]).toEqual(original);
    expect(qualifiesForHighScore([], MAX_HIGH_SCORE)).toBe(true);
    expect(qualifiesForHighScore([], MAX_HIGH_SCORE + 1)).toBe(false);
    expect(insertHighScore([], { name: 'BAD', score: 5, level: 12 })).toEqual([]);
  });
});
