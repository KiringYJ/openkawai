import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY } from '../src/config/settings';
import { type StorageAccess } from '../src/config/storage';
import {
  HIGH_SCORES_KEY, MAX_HIGH_SCORE, PLAYER_NAME_LIMIT, PLAYER_NAME_MAX_CODE_UNITS,
  highScoreRank, insertHighScore, loadHighScores, parsePlayerName,
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

describe('high scores (RE-0019 ranking, Unicode web names)', () => {
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

  it.each(['KiringYJ', '阿明 Abc-123！', 'Élodie', '山田たろう', 'مرحبا', 'نام\u200cمن', '👩🏽‍💻🐱'])('preserves Unicode spelling and case across storage: %s', (name) => {
    const storage = memoryStorage();
    const tables = recordHighScore([[], [], []], 1, { name, score: 4, level: 0 });
    expect(tables[1][0]?.name).toBe(name);
    expect(saveHighScores(storage, tables)).toBe(true);
    expect(loadHighScores(storage)).toEqual(tables);
  });

  it('counts complete graphemes and rejects excess names instead of truncating them', () => {
    expect(parsePlayerName('e\u0301👩🏽‍💻🇹🇼')).toEqual({ name: 'é👩🏽‍💻🇹🇼', length: 3, valid: true });
    const family = '👨‍👩‍👧‍👦';
    const full = family.repeat(PLAYER_NAME_LIMIT);
    expect(parsePlayerName(full)).toEqual({ name: full, length: 16, valid: true });
    expect(parsePlayerName(`${full}中`).valid).toBe(false);
    expect(insertHighScore([], { name: `${full}中`, score: 4, level: 0 })).toEqual([]);
    expect(parsePlayerName('a'.repeat(17)).valid).toBe(false);
    expect(parsePlayerName('中'.repeat(16)).valid).toBe(true);
  });

  it('removes controls, direction overrides, lone surrogates, and standalone invisible formatting', () => {
    expect(parsePlayerName('\u0000A\tB\nC\u007f\u0085\u202eD\u2066E\u200b\ufeff\u2028F\u2029').name).toBe('ABCDEF');
    expect(parsePlayerName('a\ud800b\udc00c').name).toBe('abc');
    expect(parsePlayerName(' \u200d\ufe0f\u2069\u3164 ').name).toBe('');
    expect(parsePlayerName('\u2800\u2800').name).toBe('');
    expect(parsePlayerName('  小明 AbC  ').name).toBe('小明 AbC');
    expect(insertHighScore([], { name: '', score: 4, level: 0 })[0]?.name).toBe('');
  });

  it('keeps complete emoji flags but drops out-of-context tag characters', () => {
    const england = '🏴\u{e0067}\u{e0062}\u{e0065}\u{e006e}\u{e0067}\u{e007f}';
    expect(parsePlayerName(england)).toEqual({ name: england, length: 1, valid: true });
    expect(parsePlayerName('A\u{e0067}\u{e007f}').name).toBe('A');
    expect(parsePlayerName('\u{e0067}\u{e007f}').name).toBe('');
  });

  it('bounds raw size even for one oversized combining cluster', () => {
    const name = `A${'\u0301'.repeat(PLAYER_NAME_MAX_CODE_UNITS)}`;
    expect(parsePlayerName(name).valid).toBe(false);
    expect(insertHighScore([], { name, score: 4, level: 0 })).toEqual([]);
    const storage = memoryStorage();
    storage.setItem(HIGH_SCORES_KEY, JSON.stringify([[{ name, score: 4, level: 0 }], [], []]));
    expect(loadHighScores(storage)).toEqual([[], [], []]);
  });

  it('migrates legacy padded names without changing their visible spelling or storage key', () => {
    const storage = memoryStorage();
    storage.setItem(HIGH_SCORES_KEY, JSON.stringify([[{ name: 'OLD PLAYER      ', score: 4, level: 0 },
      { name: ' '.repeat(16), score: 3, level: 1 }], [], []]));
    expect(loadHighScores(storage)[0]).toEqual([
      { name: 'OLD PLAYER', score: 4, level: 0 }, { name: '', score: 3, level: 1 },
    ]);
  });

  it('normalizes direct saves and rejects over-limit names without overwriting existing records', () => {
    const storage = memoryStorage();
    expect(saveHighScores(storage, [[{ name: ' 阿明Abc\u202e ', score: 4, level: 0 }], [], []])).toBe(true);
    expect(loadHighScores(storage)[0][0]?.name).toBe('阿明Abc');
    expect(saveHighScores(storage, [[{ name: '中'.repeat(17), score: 5, level: 0 }], [], []])).toBe(false);
    expect(loadHighScores(storage)[0][0]).toEqual({ name: '阿明Abc', score: 4, level: 0 });
  });

  it('stores markup punctuation as literal name text', () => {
    const storage = memoryStorage();
    const tables = recordHighScore([[], [], []], 0, { name: '<b>小明</b>', score: 4, level: 0 });
    expect(saveHighScores(storage, tables)).toBe(true);
    expect(loadHighScores(storage)[0][0]?.name).toBe('<b>小明</b>');
  });

  it('rejects corrupt persisted rows and sorts valid records', () => {
    const storage = memoryStorage();
    storage.setItem(HIGH_SCORES_KEY, JSON.stringify([[{ name: 'OK', score: 3, level: 0 },
      { name: 'TOP', score: 5, level: 11 }, { name: 42, score: 99, level: 0 },
      { name: 'A'.repeat(17), score: 99, level: 0 },
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
