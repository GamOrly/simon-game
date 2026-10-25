import { MAX_ROUNDS } from '../game/constants';

// Pure history repository: the only module that touches localStorage (ADR-4)
export const HISTORY_KEY = 'simon.history.v1';
export const MAX_RESULTS = 10;

export type GameOutcome = 'win' | 'loss';

export type GameResult = {
  id: string;
  finishedAt: string; // ISO 8601
  completedRounds: number; // 0–10
  outcome: GameOutcome;
};

type HistoryData = { schemaVersion: 1; results: GameResult[] };

// Functions report failure in the result instead of throwing
export type LoadResult = { ok: boolean; results: GameResult[] };
export type WriteResult = { ok: true; results: GameResult[] } | { ok: false };

function isGameResult(value: unknown): value is GameResult {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.finishedAt === 'string' &&
    !Number.isNaN(Date.parse(r.finishedAt)) &&
    Number.isInteger(r.completedRounds) &&
    (r.completedRounds as number) >= 0 &&
    (r.completedRounds as number) <= MAX_ROUNDS &&
    (r.outcome === 'win' || r.outcome === 'loss')
  );
}

export function loadHistory(): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(HISTORY_KEY);
  } catch {
    return { ok: false, results: [] };
  }
  if (raw === null) return { ok: true, results: [] };

  try {
    const data = JSON.parse(raw) as Partial<HistoryData> | null;
    if (data?.schemaVersion !== 1 || !Array.isArray(data.results)) return { ok: false, results: [] };
    // Invalid entries are dropped silently; valid ones are kept
    return { ok: true, results: data.results.filter(isGameResult).slice(0, MAX_RESULTS) };
  } catch {
    return { ok: false, results: [] };
  }
}

function write(results: GameResult[]): WriteResult {
  const data: HistoryData = { schemaVersion: 1, results };
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
    return { ok: true, results };
  } catch {
    return { ok: false };
  }
}

/** Adds a result at the top and keeps only the newest ten. */
export function addResult(current: GameResult[], result: GameResult): WriteResult {
  return write([result, ...current].slice(0, MAX_RESULTS));
}

export function clearHistory(): WriteResult {
  try {
    localStorage.removeItem(HISTORY_KEY);
    return { ok: true, results: [] };
  } catch {
    return { ok: false };
  }
}

// crypto.randomUUID is unavailable over plain HTTP (ADR-4)
export function createResult(outcome: GameOutcome, completedRounds: number, now = new Date()): GameResult {
  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    finishedAt: now.toISOString(),
    completedRounds,
    outcome,
  };
}
