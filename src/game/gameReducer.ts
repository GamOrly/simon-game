import type { SimonColor } from './colors';
import { MAX_ROUNDS } from './constants';

export type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost';

export type GameState = {
  status: GameStatus;
  sequence: SimonColor[];
  round: number; // displayed round, 1–10
  inputIndex: number;
  completedRounds: number;
  gameId: number;
  presentationId: number; // identifies the current presentation; stale callbacks are ignored
};

// Random colors are generated outside the reducer and passed in (ADR-2)
export type GameAction =
  | { type: 'start'; firstColor: SimonColor }
  | { type: 'press'; color: SimonColor; nextColor: SimonColor }
  | { type: 'showNextRound'; presentationId: number }
  | { type: 'presentationDone'; presentationId: number }
  | { type: 'abandon' }
  | { type: 'dismiss' };

export const initialGameState: GameState = {
  status: 'idle',
  sequence: [],
  round: 1,
  inputIndex: 0,
  completedRounds: 0,
  gameId: 0,
  presentationId: 0,
};

export function isGameActive(state: GameState): boolean {
  return state.status === 'presenting' || state.status === 'awaitingInput';
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle') return state;
      return {
        ...initialGameState,
        status: 'presenting',
        sequence: [action.firstColor],
        gameId: state.gameId + 1,
        presentationId: state.presentationId + 1,
      };

    case 'press': {
      if (state.status !== 'awaitingInput') return state;
      if (action.color !== state.sequence[state.inputIndex]) {
        return { ...state, status: 'lost' };
      }
      if (state.inputIndex + 1 < state.sequence.length) {
        return { ...state, inputIndex: state.inputIndex + 1 };
      }
      if (state.round >= MAX_ROUNDS) {
        return { ...state, status: 'won', inputIndex: 0, completedRounds: MAX_ROUNDS };
      }
      // Round complete: count it and add a color now; the displayed round
      // advances later via showNextRound (ADR-10)
      return {
        ...state,
        status: 'presenting',
        sequence: [...state.sequence, action.nextColor],
        inputIndex: 0,
        completedRounds: state.round,
        presentationId: state.presentationId + 1,
      };
    }

    case 'showNextRound':
      if (
        state.status !== 'presenting' ||
        action.presentationId !== state.presentationId ||
        state.round >= state.sequence.length
      ) {
        return state;
      }
      return { ...state, round: state.sequence.length };

    case 'presentationDone':
      if (state.status !== 'presenting' || action.presentationId !== state.presentationId) {
        return state;
      }
      return { ...state, status: 'awaitingInput', inputIndex: 0 };

    // Temporary until Milestone 3: leaving to About cancels the game (ADR-3)
    case 'abandon':
      if (!isGameActive(state)) return state;
      return {
        ...initialGameState,
        gameId: state.gameId,
        presentationId: state.presentationId + 1,
      };

    case 'dismiss':
      if (state.status !== 'won' && state.status !== 'lost') return state;
      return {
        ...initialGameState,
        gameId: state.gameId,
        presentationId: state.presentationId,
      };
  }
}
