import { act, fireEvent, render, screen, within } from '@testing-library/react';
import confetti from 'canvas-confetti';
import { App } from './App';
import * as audio from './audio/audioEngine';
import type { SimonColor } from './game/colors';
import { randomColor } from './game/random';

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
const ALL: SimonColor[] = ['green', 'red', 'yellow', 'blue'];

const startTone = vi.mocked(audio.startTone);

function useRandomColors(colors: SimonColor[]) {
  let i = 0;
  vi.mocked(randomColor).mockImplementation(() => colors[i++ % colors.length]);
}

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

const board = () => screen.getByRole('group', { name: 'לוח המשחק' });
const pad = (color: SimonColor) => within(board()).getByRole('button', { name: LABELS[color] });
const isLit = (color: SimonColor) => pad(color).classList.contains('board__pad--lit');
const otherThan = (color: SimonColor) => ALL.find((c) => c !== color)!;

function pressPad(color: SimonColor) {
  fireEvent.pointerDown(pad(color), { button: 0 });
  fireEvent.pointerUp(window);
}

async function startGame() {
  fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
  await act(async () => {}); // audio unlock resolves
}

// Duration of one presentation of `length` colors at the fixed pace
const presentationMs = (length: number, roundAdvance: boolean) =>
  (roundAdvance ? 2000 : 1000) + length * 600 + (length - 1) * 250;

/** Lets a presentation finish and returns the colors it played. */
async function watchPresentation(length: number, roundAdvance: boolean) {
  startTone.mockClear();
  await advance(presentationMs(length, roundAdvance));
  expect(screen.getByText('התור שלך')).toBeInTheDocument();
  return startTone.mock.calls.map(([color]) => color);
}

/** Presses the colors in order; no wait after the last press. */
async function replay(sequence: SimonColor[]) {
  for (let i = 0; i < sequence.length; i++) {
    pressPad(sequence[i]);
    if (i < sequence.length - 1) await advance(300);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.mocked(audio.unlockAudio).mockImplementation(() => Promise.resolve(true));
  useRandomColors(['green', 'red', 'yellow', 'blue', 'blue', 'red', 'green', 'yellow', 'green', 'red']);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('full game', () => {
  it('presents round 1 at the fixed pace and blocks presses meanwhile', async () => {
    render(<App />);
    await startGame();

    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    expect(screen.getByText('המתן…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument();

    await advance(999);
    expect(startTone).not.toHaveBeenCalled();
    await advance(1);
    expect(startTone).toHaveBeenCalledWith('green');
    expect(isLit('green')).toBe(true);

    // A press during presentation has no effect (no tone, no loss)
    pressPad('red');
    expect(startTone).toHaveBeenCalledTimes(1);

    await advance(599);
    expect(isLit('green')).toBe(true);
    await advance(1);
    expect(isLit('green')).toBe(false);
    expect(audio.stopTone).toHaveBeenCalledWith('green');
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    expect(screen.getByText('הקש על הצבעים לפי הסדר')).toBeInTheDocument();
  });

  it('advances rounds with the defined timing and grows the sequence as a prefix', async () => {
    render(<App />);
    await startGame();
    const round1 = await watchPresentation(1, false);
    expect(round1).toHaveLength(1);

    pressPad(round1[0]);
    expect(startTone).toHaveBeenLastCalledWith(round1[0]); // press feedback
    startTone.mockClear();

    await advance(999);
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    await advance(1);
    expect(screen.getByText('שלב 2 מתוך 10')).toBeInTheDocument();
    await advance(999);
    expect(startTone).not.toHaveBeenCalled();
    await advance(1);
    expect(startTone).toHaveBeenCalledTimes(1);
    await advance(600 + 250);
    expect(startTone).toHaveBeenCalledTimes(2);
    await advance(600);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();

    const round2 = startTone.mock.calls.map(([color]) => color);
    expect(round2).toHaveLength(2);
    expect(round2.slice(0, 1)).toEqual(round1);
  });

  it('loses on the first wrong press of round 1 with 0 completed rounds', async () => {
    render(<App />);
    await startGame();
    const [first] = await watchPresentation(1, false);
    const wrong = otherThan(first);

    pressPad(wrong);
    expect(startTone).toHaveBeenLastCalledWith(wrong); // pad tone right away

    await advance(999);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(audio.playLose).not.toHaveBeenCalled();
    await advance(1);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('נפסלת!')).toBeInTheDocument();
    expect(within(dialog).getByText('השלמת 0 שלבים')).toBeInTheDocument();
    expect(audio.playLose).toHaveBeenCalledTimes(1);
    expect(audio.playWin).not.toHaveBeenCalled();
    expect(confetti).not.toHaveBeenCalled();
  });

  it('loses at an advanced round and reports the completed rounds', async () => {
    render(<App />);
    await startGame();
    let sequence = await watchPresentation(1, false);
    await replay(sequence);
    sequence = await watchPresentation(2, true);
    await replay(sequence);
    sequence = await watchPresentation(3, true);
    expect(screen.getByText('שלב 3 מתוך 10')).toBeInTheDocument();

    pressPad(sequence[0]);
    await advance(300);
    pressPad(otherThan(sequence[1]));
    await advance(1000);

    expect(screen.getByText('נפסלת!')).toBeInTheDocument();
    expect(screen.getByText('השלמת 2 שלבים')).toBeInTheDocument();
  });

  it('says "one round" after completing exactly one round', async () => {
    render(<App />);
    await startGame();
    await replay(await watchPresentation(1, false));
    const sequence = await watchPresentation(2, true);
    pressPad(otherThan(sequence[0]));
    await advance(1000);
    expect(screen.getByText('השלמת שלב אחד')).toBeInTheDocument();
  });

  it('wins after round 10 with confetti, never reaches round 11, and a new game gets a new sequence', async () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    render(<App />);
    await startGame();

    let sequence: SimonColor[] = [];
    for (let round = 1; round <= 10; round++) {
      const previous = sequence;
      sequence = await watchPresentation(round, round > 1);
      expect(sequence).toHaveLength(round);
      expect(sequence.slice(0, previous.length)).toEqual(previous);
      expect(screen.getByText(`שלב ${round} מתוך 10`)).toBeInTheDocument();
      await replay(sequence);
    }

    await advance(999);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await advance(1);
    expect(screen.getByText('כל הכבוד! ניצחת!')).toBeInTheDocument();
    expect(screen.getByText('שלב 10 מתוך 10')).toBeInTheDocument();
    expect(audio.playWin).toHaveBeenCalledTimes(1);
    expect(audio.playLose).not.toHaveBeenCalled();
    expect(confetti).toHaveBeenCalledTimes(1);

    // No round 11: nothing is presented and pads do not respond
    startTone.mockClear();
    await advance(10000);
    pressPad('green');
    expect(startTone).not.toHaveBeenCalled();
    expect(screen.queryByText('שלב 11 מתוך 10')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'אישור' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(confetti.reset).toHaveBeenCalled();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();

    useRandomColors(['yellow']);
    await startGame();
    expect(await watchPresentation(1, false)).toEqual(['yellow']);
    expect(sequence[0]).not.toBe('yellow');

    // Active game state is never persisted
    expect(storageWrite).not.toHaveBeenCalled();
    storageWrite.mockRestore();
  });

  it('"אישור" after a loss returns to the start state', async () => {
    render(<App />);
    await startGame();
    const [first] = await watchPresentation(1, false);
    pressPad(otherThan(first));
    await advance(1000);

    fireEvent.click(screen.getByRole('button', { name: 'אישור' }));
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    expect(screen.queryByText('נפסלת!')).not.toBeInTheDocument();
  });

  it('does not start a silent game when audio cannot be enabled', async () => {
    vi.mocked(audio.unlockAudio).mockResolvedValueOnce(false);
    render(<App />);
    await startGame();

    expect(screen.getByRole('alert')).toHaveTextContent('לא הצלחנו להפעיל את הצלילים');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    await advance(3000);
    expect(startTone).not.toHaveBeenCalled();

    await startGame();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
  });

  it('a fresh load (refresh) starts in the initial state', () => {
    render(<App />);
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });
});

describe('leaving to About mid-game (temporary until Milestone 3)', () => {
  const goTo = (label: string) =>
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: label }));

  it('cancels during presentation without leaving light, sound or timers', async () => {
    render(<App />);
    await startGame();
    await advance(1300);
    expect(isLit('green')).toBe(true);

    goTo('אודות');
    expect(audio.stopAll).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    goTo('בית');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    expect(ALL.some(isLit)).toBe(false);
  });

  it('cancels during the player turn, including a held press', async () => {
    render(<App />);
    await startGame();
    await replay(await watchPresentation(1, false));
    const sequence = await watchPresentation(2, true);

    fireEvent.pointerDown(pad(sequence[0]), { button: 0 }); // finger still down
    goTo('אודות');
    expect(audio.stopTone).toHaveBeenCalledWith(sequence[0]);
    expect(vi.getTimerCount()).toBe(0);

    goTo('בית');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
  });
});
