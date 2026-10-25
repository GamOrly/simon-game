import {
  addResult,
  clearHistory,
  createResult,
  HISTORY_KEY,
  loadHistory,
  type GameResult,
} from './historyStorage';

const result = (n: number, outcome: GameResult['outcome'] = 'loss'): GameResult =>
  createResult(outcome, n % 11, new Date(2026, 9, 21, 12, n));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('historyStorage', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(loadHistory()).toEqual({ ok: true, results: [] });
  });

  it('adds results at the top and reads them back after a reload', () => {
    const first = addResult([], result(1));
    expect(first.ok).toBe(true);
    const second = addResult(first.ok ? first.results : [], result(2, 'win'));
    expect(second.ok && second.results.map((r) => r.completedRounds)).toEqual([2, 1]);

    const loaded = loadHistory();
    expect(loaded.ok).toBe(true);
    expect(loaded.results).toEqual(second.ok && second.results);
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!).schemaVersion).toBe(1);
  });

  it('keeps at most ten results, newest first, dropping the oldest', () => {
    let list: GameResult[] = [];
    const added: GameResult[] = [];
    for (let i = 0; i < 11; i++) {
      const r = result(i);
      added.push(r);
      const saved = addResult(list, r);
      if (saved.ok) list = saved.results;
    }
    const loaded = loadHistory().results;
    expect(loaded).toHaveLength(10);
    expect(loaded[0].id).toBe(added[10].id);
    expect(loaded.map((r) => r.id)).not.toContain(added[0].id);
  });

  it('reports corrupt data without throwing, and the next save writes a valid list', () => {
    localStorage.setItem(HISTORY_KEY, '{not json');
    expect(loadHistory()).toEqual({ ok: false, results: [] });

    localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 2, results: [] }));
    expect(loadHistory().ok).toBe(false);

    addResult([], result(3));
    expect(loadHistory()).toMatchObject({ ok: true, results: [{ completedRounds: 3 }] });
  });

  it('drops invalid entries and keeps the valid ones', () => {
    const good = result(4, 'win');
    const bad = [
      { ...good, outcome: 'draw' },
      { ...good, completedRounds: 11 },
      { ...good, completedRounds: 2.5 },
      { ...good, finishedAt: 'yesterday' },
      { id: 'x' },
      null,
    ];
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 1, results: [...bad, good] }));
    expect(loadHistory()).toEqual({ ok: true, results: [good] });
  });

  it('clears the stored history', () => {
    addResult([], result(5));
    expect(clearHistory()).toEqual({ ok: true, results: [] });
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
    expect(loadHistory().results).toEqual([]);
  });

  it('reports blocked storage instead of throwing', () => {
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);

    expect(loadHistory()).toEqual({ ok: false, results: [] });
    expect(addResult([], result(6))).toEqual({ ok: false });
    expect(clearHistory()).toEqual({ ok: false });
  });

  it('creates results with an ISO end time and a unique id', () => {
    const now = new Date();
    const a = createResult('win', 10, now);
    const b = createResult('win', 10, now);
    expect(a.finishedAt).toBe(now.toISOString());
    expect(a.id).not.toBe(b.id);
  });
});
