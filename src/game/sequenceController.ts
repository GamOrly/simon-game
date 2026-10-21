import type { SimonColor } from './colors';
import { TIMING } from './constants';

/** setTimeout as a Promise that rejects (and clears the timer) when aborted. */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

type PlaybackCallbacks = {
  isRoundAdvance: boolean; // a round was just completed; show its number first
  onShowNextRound: () => void;
  onColorOn: (color: SimonColor) => void;
  onColorOff: (color: SimonColor) => void;
  onDone: () => void;
};

/**
 * Runs one presentation timeline at a fixed pace (DESIGN.md §1.1).
 * Abort the signal to cancel; no callback runs after cancellation.
 */
export async function playSequence(sequence: SimonColor[], signal: AbortSignal, cb: PlaybackCallbacks) {
  try {
    if (cb.isRoundAdvance) {
      await sleep(TIMING.roundCompleteHold, signal);
      cb.onShowNextRound();
      await sleep(TIMING.nextRoundLeadIn, signal);
    } else {
      await sleep(TIMING.leadIn, signal);
    }

    for (let i = 0; i < sequence.length; i++) {
      const color = sequence[i];
      cb.onColorOn(color);
      try {
        await sleep(TIMING.colorOn, signal);
      } finally {
        cb.onColorOff(color);
      }
      if (i < sequence.length - 1) await sleep(TIMING.colorGap, signal);
    }

    cb.onDone();
  } catch (error) {
    if (!signal.aborted) throw error;
  }
}
