import type { SimonColor } from './colors';
import { gameReducer, initialGameState, type GameAction, type GameState } from './gameReducer';

const run = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state);

const finishPresentation = (state: GameState) =>
  run(
    state,
    { type: 'showNextRound', presentationId: state.presentationId },
    { type: 'presentationDone', presentationId: state.presentationId },
  );

// Replays the whole current sequence correctly, adding `nextColor` at round end
const playRound = (state: GameState, nextColor: SimonColor) =>
  state.sequence.reduce(
    (s, color) => gameReducer(s, { type: 'press', color, nextColor }),
    finishPresentation(state),
  );

const started = (firstColor: SimonColor = 'green') =>
  gameReducer(initialGameState, { type: 'start', firstColor });

describe('gameReducer', () => {
  it('starts a game with a single-color sequence', () => {
    const state = started('red');
    expect(state.status).toBe('presenting');
    expect(state.sequence).toEqual(['red']);
    expect(state.round).toBe(1);
    expect(state.completedRounds).toBe(0);
    expect(state.gameId).toBe(1);
  });

  it('grows the sequence by one color per round, keeping the previous one as a prefix', () => {
    const extra: SimonColor[] = ['blue', 'blue', 'yellow', 'green', 'red', 'red', 'blue', 'green', 'yellow'];
    let state = started('green');
    const lengths = [state.sequence.length];

    for (const color of extra) {
      const before = state.sequence;
      state = finishPresentation(playRound(state, color));
      expect(state.sequence.slice(0, before.length)).toEqual(before);
      expect(state.sequence.at(-1)).toBe(color);
      lengths.push(state.sequence.length);
      expect(state.round).toBe(state.sequence.length);
    }

    expect(lengths).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(state.sequence).toEqual(['green', ...extra]); // repeated colors allowed
  });

  it('ignores presses outside the player turn', () => {
    const presenting = started();
    const press: GameAction = { type: 'press', color: 'green', nextColor: 'red' };
    expect(gameReducer(presenting, press)).toBe(presenting);
    expect(gameReducer(initialGameState, press)).toBe(initialGameState);
  });

  it('loses on a wrong press in round 1 with 0 completed rounds', () => {
    const state = run(finishPresentation(started('green')), {
      type: 'press',
      color: 'red',
      nextColor: 'blue',
    });
    expect(state.status).toBe('lost');
    expect(state.completedRounds).toBe(0);
  });

  it('loses at an advanced round with the right completed count, mid-sequence', () => {
    let state = started('green');
    for (const color of ['red', 'blue', 'yellow'] as SimonColor[]) {
      state = playRound(state, color);
    }
    state = finishPresentation(state);
    expect(state.round).toBe(4);

    state = run(
      state,
      { type: 'press', color: 'green', nextColor: 'red' },
      { type: 'press', color: 'green', nextColor: 'red' }, // expected red
    );
    expect(state.status).toBe('lost');
    expect(state.completedRounds).toBe(3);
  });

  it('wins after completing round 10 and never reaches round 11', () => {
    let state = started('green');
    for (let i = 0; i < 9; i++) state = playRound(state, 'blue');
    state = playRound(state, 'red');

    expect(state.status).toBe('won');
    expect(state.completedRounds).toBe(10);
    expect(state.round).toBe(10);
    expect(state.sequence).toHaveLength(10);

    const after = run(
      state,
      { type: 'press', color: 'green', nextColor: 'red' },
      { type: 'showNextRound', presentationId: state.presentationId },
      { type: 'presentationDone', presentationId: state.presentationId },
    );
    expect(after).toBe(state);
  });

  it('keeps the finished round displayed until showNextRound', () => {
    const state = playRound(started('green'), 'red');
    expect(state.status).toBe('presenting');
    expect(state.completedRounds).toBe(1);
    expect(state.round).toBe(1);
    expect(gameReducer(state, { type: 'showNextRound', presentationId: state.presentationId }).round).toBe(2);
  });

  it('ignores stale presentation callbacks', () => {
    const state = started();
    const stale = state.presentationId - 1;
    expect(gameReducer(state, { type: 'presentationDone', presentationId: stale })).toBe(state);
    expect(gameReducer(state, { type: 'showNextRound', presentationId: stale })).toBe(state);
  });

  it('pauses an active game, keeping the sequence and round and dropping partial input', () => {
    let state = finishPresentation(playRound(started('green'), 'red')); // round 2: green, red
    state = gameReducer(state, { type: 'press', color: 'green', nextColor: 'blue' });
    expect(state.inputIndex).toBe(1);

    const paused = gameReducer(state, { type: 'pause' });
    expect(paused.status).toBe('paused');
    expect(paused.inputIndex).toBe(0);
    expect(paused.sequence).toEqual(['green', 'red']);
    expect(paused.round).toBe(2);
    expect(paused.completedRounds).toBe(1);
    expect(paused.presentationId).toBe(state.presentationId + 1);

    const presenting = started();
    expect(gameReducer(presenting, { type: 'pause' }).status).toBe('paused');
  });

  it('pausing between rounds lands on the next round', () => {
    const between = playRound(started('green'), 'red');
    expect(between.round).toBe(1);
    const paused = gameReducer(between, { type: 'pause' });
    expect(paused.round).toBe(2);
    expect(paused.completedRounds).toBe(1);
    expect(paused.sequence).toEqual(['green', 'red']);
  });

  it('does not pause an idle, finished or already paused game', () => {
    const lost = run(finishPresentation(started('green')), { type: 'press', color: 'red', nextColor: 'red' });
    const won = (() => {
      let state = started('green');
      for (let i = 0; i < 10; i++) state = playRound(state, 'blue');
      return state;
    })();
    const paused = gameReducer(started(), { type: 'pause' });
    for (const state of [initialGameState, lost, won, paused]) {
      expect(gameReducer(state, { type: 'pause' })).toBe(state);
    }
  });

  it('ignores presses and stale presentation callbacks while paused', () => {
    const presenting = started();
    const paused = gameReducer(presenting, { type: 'pause' });
    const old = presenting.presentationId;
    expect(gameReducer(paused, { type: 'presentationDone', presentationId: old })).toBe(paused);
    expect(gameReducer(paused, { type: 'showNextRound', presentationId: old })).toBe(paused);
    expect(gameReducer(paused, { type: 'press', color: 'green', nextColor: 'red' })).toBe(paused);
    expect(gameReducer(paused, { type: 'start', firstColor: 'red' })).toBe(paused);
  });

  it('resumes once into a new presentation of the same round, with no new color', () => {
    const paused = gameReducer(finishPresentation(playRound(started('green'), 'red')), { type: 'pause' });
    const resumed = gameReducer(paused, { type: 'resume' });
    expect(resumed.status).toBe('presenting');
    expect(resumed.sequence).toEqual(paused.sequence);
    expect(resumed.round).toBe(paused.round);
    expect(resumed.inputIndex).toBe(0);
    expect(resumed.presentationId).toBe(paused.presentationId + 1);

    expect(gameReducer(resumed, { type: 'resume' })).toBe(resumed);
    expect(gameReducer(initialGameState, { type: 'resume' })).toBe(initialGameState);
  });

  it('dismisses a finished game back to idle and the next game gets a new id', () => {
    const lost = run(finishPresentation(started('green')), { type: 'press', color: 'red', nextColor: 'red' });
    const idle = gameReducer(lost, { type: 'dismiss' });
    expect(idle.status).toBe('idle');
    expect(idle.round).toBe(1);
    expect(gameReducer(started(), { type: 'dismiss' }).status).toBe('presenting');

    const next = gameReducer(idle, { type: 'start', firstColor: 'yellow' });
    expect(next.gameId).toBe(lost.gameId + 1);
    expect(next.sequence).toEqual(['yellow']);
  });
});
