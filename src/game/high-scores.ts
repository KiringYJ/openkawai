import type { Difficulty } from '../content/layouts';
import { readStoredValue, writeStoredValue, type StorageAccess } from '../config/storage';

export interface HighScore {
  readonly name: string;
  readonly score: number;
  /** Zero-based level index; 11 means all levels completed (RE-0019). */
  readonly level: number;
}

export type HighScores = [HighScore[], HighScore[], HighScore[]];
export const HIGH_SCORES_KEY = 'openkawai.high-scores.v1';
export const HIGH_SCORE_LIMIT = 10;
export const MAX_HIGH_SCORE = 0xffff_ffff;
export const PLAYER_NAME_LIMIT = 16;
export const PLAYER_NAME_MAX_CODE_UNITS = 1024;

const nameSegments = new Intl.Segmenter('zh-Hant', { granularity: 'grapheme' });
const nameFormatting = /[\p{Cc}\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}\p{Zl}\p{Zp}\u2800]/gu;
const joiningOrEmojiFormat = /^[\u200c\u200d\p{Variation_Selector}\u{e0020}-\u{e007f}]$/u;
const emojiTags = /[\u{e0020}-\u{e007f}]/gu;
const taggedFlag = /^\u{1f3f4}[\u{e0020}-\u{e007e}]{1,32}\u{e007f}$/u;

export interface ParsedPlayerName {
  readonly name: string;
  readonly length: number;
  readonly valid: boolean;
}

export function parsePlayerName(value: string): ParsedPlayerName {
  // Bound work even when one grapheme contains thousands of combining marks.
  if (value.length > PLAYER_NAME_MAX_CODE_UNITS) return { name: '', length: 0, valid: false };
  const text = value.replace(nameFormatting, (character) => joiningOrEmojiFormat.test(character) ? character : '').normalize('NFC');
  const parts: string[] = [];
  for (const { segment } of nameSegments.segment(text)) {
    // Keep joiners/variation selectors only with a visible base, and tags only in flags.
    const part = taggedFlag.test(segment) ? segment : segment.replace(emojiTags, '');
    parts.push(/[\p{L}\p{N}\p{P}\p{S}]/u.test(part) ? part : part.replace(/[^\p{Zs}]/gu, ''));
  }
  const name = parts.join('').trim();
  const length = Array.from(nameSegments.segment(name)).length;
  return { name, length, valid: length <= PLAYER_NAME_LIMIT && name.length <= PLAYER_NAME_MAX_CODE_UNITS };
}

export function qualifiesForHighScore(table: readonly HighScore[], score: number): boolean {
  return Number.isSafeInteger(score) && score <= MAX_HIGH_SCORE
    && score > (table[HIGH_SCORE_LIMIT - 1]?.score ?? 0);
}

export function highScoreRank(table: readonly HighScore[], score: number): number | null {
  if (!qualifiesForHighScore(table, score)) return null;
  const firstLower = table.findIndex((row) => row.score < score);
  return firstLower < 0 ? table.length : firstLower;
}

export function insertHighScore(table: readonly HighScore[], entry: HighScore): HighScore[] {
  const rank = highScoreRank(table, entry.score);
  const parsedName = parsePlayerName(entry.name);
  if (rank === null || !parsedName.valid || !Number.isInteger(entry.level) || entry.level < 0 || entry.level > 11) return [...table];
  const result = [...table];
  result.splice(rank, 0, {
    ...entry,
    name: parsedName.name,
  });
  return result.slice(0, HIGH_SCORE_LIMIT);
}

function normalizedEntry(value: unknown): HighScore | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.name !== 'string'
    || typeof row.score !== 'number' || !Number.isSafeInteger(row.score) || row.score <= 0 || row.score > MAX_HIGH_SCORE
    || typeof row.level !== 'number' || !Number.isInteger(row.level) || row.level < 0 || row.level > 11) return null;
  const parsedName = parsePlayerName(row.name);
  return parsedName.valid ? { name: parsedName.name, score: row.score, level: row.level } : null;
}

export function loadHighScores(storage: StorageAccess | null): HighScores {
  const data = readStoredValue(storage, HIGH_SCORES_KEY);
  if (!Array.isArray(data) || data.length !== 3) return [[], [], []];
  const tables = data.map((value: unknown) => Array.isArray(value)
    ? value.map(normalizedEntry).filter((entry) => entry !== null).sort((a, b) => b.score - a.score).slice(0, HIGH_SCORE_LIMIT) : []);
  return [tables[0]!, tables[1]!, tables[2]!];
}

export function saveHighScores(storage: StorageAccess | null, tables: HighScores): boolean {
  const normalized = tables.map((table) => table.map(normalizedEntry));
  if (normalized.some((table) => table.some((entry) => entry === null))) return false;
  return writeStoredValue(storage, HIGH_SCORES_KEY, normalized);
}

export function recordHighScore(tables: HighScores, difficulty: Difficulty, entry: HighScore): HighScores {
  const updated: HighScores = [[...tables[0]], [...tables[1]], [...tables[2]]];
  updated[difficulty] = insertHighScore(updated[difficulty], entry);
  return updated;
}
