import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { App } from './App';
import * as audio from './audio/audioEngine';
import type { SimonColor } from './game/colors';
import { randomColor } from './game/random';
import { HISTORY_KEY, type GameResult } from './history/historyStorage';

vi.mock('./audio/audioEngine', () => ({
  TONE_FREQUENCIES: {},
  unlockAudio: vi.fn(() => Promise.resolve(true)),
  startTone: vi.fn(),
  stopTone: vi.fn(),
  playWin: vi.fn(),
  playLose: vi.fn(),
  stopAll: vi.fn(),
}));

vi.mock('./game/random', () => ({ randomColor: vi.fn() }));

vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { reset: vi.fn() }) }));

const LABELS: Record<SimonColor, string> = { green: 'ירוק', red: 'אדום', yellow: 'צהוב', blue: 'כחול' };
const SEQUENCE: SimonColor[] = ['green', 'red', 'yellow', 'blue', 'blue', 'red', 'green', 'yellow', 'green', 'red'];

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

// Every test renders in StrictMode, like main.tsx, to catch double recording
const renderApp = () =>
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

const board = () => screen.getByRole('group', { name: 'לוח המשחק' });
const pad = (color: SimonColor) => within(board()).getByRole('button', { name: LABELS[color] });
const goTo = (label: string) =>
  fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: label }));

function pressPad(color: SimonColor) {
  fireEvent.pointerDown(pad(color), { button: 0 });
  fireEvent.pointerUp(window);
}

async function startGame() {
  fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
  await act(async () => {}); // audio unlock resolves
}

const presentationMs = (round: number) => (round > 1 ? 2000 : 1000) + round * 600 + (round - 1) * 250;

/** Plays rounds 1..rounds correctly, replaying the colors each presentation played. */
async function completeRounds(rounds: number) {
  for (let round = 1; round <= rounds; round++) {
    vi.mocked(audio.startTone).mockClear();
    await advance(presentationMs(round));
    const sequence = vi.mocked(audio.startTone).mock.calls.map(([color]) => color);
    for (let i = 0; i < round; i++) {
      pressPad(sequence[i]);
      if (i < round - 1) await advance(300); // the next presentation starts at the last press
    }
  }
}

/** Starts a game and loses it after `completed` rounds. */
async function playAndLose(completed: number) {
  await startGame();
  await completeRounds(completed);
  await advance(presentationMs(completed + 1));
  pressPad(SEQUENCE[0] === 'blue' ? 'green' : 'blue');
  await advance(1000);
  fireEvent.click(screen.getByRole('button', { name: 'אישור' }));
}

const stored = (): GameResult[] => JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '{"results":[]}').results;
const cards = () => screen.queryAllByRole('listitem').filter((li) => li.classList.contains('history-card'));

function seed(results: GameResult[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 1, results }));
}

const seeded = (n: number, outcome: GameResult['outcome'], minute: number): GameResult => ({
  id: `seed-${minute}`,
  finishedAt: new Date(2026, 9, 20, 10, minute).toISOString(),
  completedRounds: n,
  outcome,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.clearAllMocks();
  vi.mocked(audio.unlockAudio).mockImplementation(() => Promise.resolve(true));
  let i = 0;
  vi.mocked(randomColor).mockImplementation(() => SEQUENCE[i++ % SEQUENCE.length]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, 'visibilityState');
});

describe('game history', () => {
  it('a loss in round 1 adds exactly one record with 0 completed rounds', async () => {
    renderApp();
    await startGame();
    await advance(presentationMs(1));
    pressPad('blue'); // first color is green
    expect(stored()).toHaveLength(1); // recorded on entering "lost", before the message

    await advance(1000);
    fireEvent.click(screen.getByRole('button', { name: 'אישור' }));
    expect(stored()).toHaveLength(1);
    expect(stored()[0]).toMatchObject({ completedRounds: 0, outcome: 'loss' });

    goTo('אודות');
    expect(cards()).toHaveLength(1);
    const card = cards()[0];
    expect(card).toHaveTextContent('שלבים שהושלמו: 0');
    expect(card).toHaveTextContent('תוצאה: הפסד');
    expect(within(card).getByText(/\d/, { selector: 'time' })).toHaveAttribute('dateTime', stored()[0].finishedAt);
  });

  it('a win adds one record with 10 completed rounds, even after navigating and re-rendering', async () => {
    renderApp();
    await startGame();
    await completeRounds(10);
    await advance(1000);
    expect(screen.getByText('כל הכבוד! ניצחת!')).toBeInTheDocument();
    expect(screen.queryByText('התוצאה לא נשמרה בהיסטוריה.')).not.toBeInTheDocument();

    goTo('אודות');
    goTo('בית');
    fireEvent.click(screen.getByRole('button', { name: 'אישור' }));
    goTo('אודות');

    expect(stored()).toHaveLength(1);
    expect(stored()[0]).toMatchObject({ completedRounds: 10, outcome: 'win' });
    expect(cards()[0]).toHaveTextContent('תוצאה: ניצחון');
  });

  it('records an advanced loss with its completed rounds', async () => {
    renderApp();
    await playAndLose(3);
    expect(stored()).toEqual([expect.objectContaining({ completedRounds: 3, outcome: 'loss' })]);
  });

  it('pausing, hiding the page, resuming or a refresh mid-game adds no record', async () => {
    seed([seeded(2, 'loss', 1)]);
    const { unmount } = renderApp();
    await startGame();
    await completeRounds(1);

    goTo('אודות');
    goTo('בית');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    window.dispatchEvent(new Event('pagehide'));
    fireEvent.click(screen.getByRole('button', { name: 'המשך משחק' }));
    await act(async () => {});
    await advance(5000);

    // Refresh in the middle of the game
    unmount();
    renderApp();
    expect(stored()).toEqual([seeded(2, 'loss', 1)]);
    goTo('אודות');
    expect(cards()).toHaveLength(1);
  });

  it('shows saved history after a reload, newest first, at most ten', async () => {
    seed([seeded(5, 'loss', 2), seeded(10, 'win', 1)]);
    const { unmount } = renderApp();
    goTo('אודות');
    expect(cards().map((c) => c.textContent)).toEqual([
      expect.stringContaining('שלבים שהושלמו: 5'),
      expect.stringContaining('שלבים שהושלמו: 10'),
    ]);
    unmount();

    // Ten older games plus one new game: the oldest is dropped
    seed(Array.from({ length: 10 }, (_, i) => seeded(i, 'loss', 20 - i)));
    renderApp();
    await playAndLose(1);
    expect(stored()).toHaveLength(10);
    expect(stored()[0]).toMatchObject({ completedRounds: 1 });
    expect(stored().map((r) => r.id)).not.toContain('seed-11');
    goTo('אודות');
    expect(cards()).toHaveLength(10);
    expect(cards()[0]).toHaveTextContent('שלבים שהושלמו: 1');
  });

  it('shows the empty state and no delete button without history', () => {
    renderApp();
    goTo('אודות');
    expect(screen.getByText('עדיין אין משחקים שמורים.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
  });

  it('"ביטול" keeps the history; "מחק" clears it after confirmation', () => {
    seed([seeded(4, 'loss', 1)]);
    renderApp();
    goTo('אודות');

    fireEvent.click(screen.getByRole('button', { name: 'מחק היסטוריה' }));
    const dialog = screen.getByRole('alertdialog', { name: 'למחוק את ההיסטוריה?' });
    expect(within(dialog).getByRole('button', { name: 'ביטול' })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: 'ביטול' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(stored()).toHaveLength(1);
    expect(cards()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'מחק היסטוריה' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(stored()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'מחק היסטוריה' }));
    fireEvent.click(screen.getByRole('button', { name: 'מחק' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
    expect(screen.getByText('עדיין אין משחקים שמורים.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
  });

  it('a failed save does not stop the game and shows a Hebrew message', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    renderApp();
    await startGame();
    await advance(presentationMs(1));
    pressPad('blue');
    await advance(1000);

    expect(screen.getByText('נפסלת!')).toBeInTheDocument();
    expect(screen.getByText('התוצאה לא נשמרה בהיסטוריה.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'אישור' }));

    goTo('אודות');
    expect(screen.getByRole('alert')).toHaveTextContent('שמירת התוצאה האחרונה נכשלה.');
    expect(screen.getByText('עדיין אין משחקים שמורים.')).toBeInTheDocument();

    goTo('בית');
    await startGame();
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
  });

  it('a failed delete keeps the records and says so', () => {
    seed([seeded(4, 'loss', 1)]);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    renderApp();
    goTo('אודות');
    fireEvent.click(screen.getByRole('button', { name: 'מחק היסטוריה' }));
    fireEvent.click(screen.getByRole('button', { name: 'מחק' }));

    expect(screen.getByRole('alert')).toHaveTextContent('מחיקת ההיסטוריה נכשלה. נסו שוב.');
    expect(cards()).toHaveLength(1);
    expect(stored()).toHaveLength(1);
  });

  it('unreadable storage shows a message and the game still starts', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    renderApp();
    goTo('אודות');
    expect(screen.getByRole('alert')).toHaveTextContent('לא ניתן לקרוא את ההיסטוריה השמורה.');

    goTo('בית');
    await startGame();
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
  });
});
