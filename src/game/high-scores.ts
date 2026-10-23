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

export function playerName(value: string): string {
  return value.toUpperCase().replace(/[^A-Z ]/g, '').slice(0, 16);
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
  if (rank === null || !Number.isInteger(entry.level) || entry.level < 0 || entry.level > 11) return [...table];
  const result = [...table];
  result.splice(rank, 0, {
    ...entry,
    name: playerName(entry.name).padEnd(16, ' '),
  });
  return result.slice(0, HIGH_SCORE_LIMIT);
}

function validEntry(value: unknown): value is HighScore {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.name === 'string' && /^[A-Z ]{0,16}$/.test(row.name)
    && typeof row.score === 'number' && Number.isSafeInteger(row.score) && row.score > 0 && row.score <= MAX_HIGH_SCORE
    && typeof row.level === 'number' && Number.isInteger(row.level) && row.level >= 0 && row.level <= 11;
}

export function loadHighScores(storage: StorageAccess | null): HighScores {
  const data = readStoredValue(storage, HIGH_SCORES_KEY);
  if (!Array.isArray(data) || data.length !== 3) return [[], [], []];
  const tables = data.map((value: unknown) => Array.isArray(value)
    ? value.filter(validEntry).sort((a, b) => b.score - a.score).slice(0, HIGH_SCORE_LIMIT) : []);
  return [tables[0]!, tables[1]!, tables[2]!];
}

export function saveHighScores(storage: StorageAccess | null, tables: HighScores): boolean {
  return writeStoredValue(storage, HIGH_SCORES_KEY, tables);
}

export function recordHighScore(tables: HighScores, difficulty: Difficulty, entry: HighScore): HighScores {
  const updated: HighScores = [[...tables[0]], [...tables[1]], [...tables[2]]];
  updated[difficulty] = insertHighScore(updated[difficulty], entry);
  return updated;
}
