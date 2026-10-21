import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { playLose, playWin, startTone, stopAll, stopTone, unlockAudio } from '../audio/audioEngine';
import type { SimonColor } from './colors';
import { TIMING } from './constants';
import { gameReducer, initialGameState, isGameActive } from './gameReducer';
import { randomColor } from './random';
import { playSequence } from './sequenceController';

type Press = {
  color: SimonColor;
  timer: ReturnType<typeof setTimeout>;
  released: boolean;
  minElapsed: boolean;
};

/**
 * Owns the game session. Lives in App so switching screens does not unmount it (ADR-2).
 * The reducer stays pure; timers, audio and highlights are handled here.
 */
export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [activeColor, setActiveColor] = useState<SimonColor | null>(null);
  const [resultVisible, setResultVisible] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const pressRef = useRef<Press | null>(null);
  const unlockToken = useRef(0); // invalidates a pending start/resume (audio unlock in progress)
  const unlocking = useRef(false);

  const endPress = useCallback(() => {
    const press = pressRef.current;
    if (!press) return;
    pressRef.current = null;
    clearTimeout(press.timer);
    stopTone(press.color);
    setActiveColor((current) => (current === press.color ? null : current));
  }, []);

  // Sequence presentation: one cancellable timeline per presentationId
  useEffect(() => {
    if (state.status !== 'presenting') return;
    const controller = new AbortController();
    const presentationId = state.presentationId;

    void playSequence(state.sequence, controller.signal, {
      isRoundAdvance: state.round < state.sequence.length,
      onShowNextRound: () => dispatch({ type: 'showNextRound', presentationId }),
      onColorOn: (color) => {
        setActiveColor(color);
        startTone(color);
      },
      onColorOff: (color) => {
        setActiveColor(null);
        stopTone(color);
      },
      onDone: () => dispatch({ type: 'presentationDone', presentationId }),
    });

    return () => controller.abort();
    // Only a new presentation restarts the timeline; showNextRound must not
  }, [state.status, state.presentationId]);

  // Result message and end sound appear together after a fixed delay
  useEffect(() => {
    if (state.status !== 'won' && state.status !== 'lost') return;
    const outcome = state.status;
    const timer = setTimeout(() => {
      setResultVisible(true);
      if (outcome === 'won') playWin();
      else playLose();
    }, TIMING.resultDelay);
    return () => clearTimeout(timer);
  }, [state.status]);

  const padUp = useCallback(() => {
    const press = pressRef.current;
    if (!press) return;
    press.released = true;
    if (press.minElapsed) endPress();
  }, [endPress]);

  // The pad may become disabled before the finger lifts, so listen on window (ADR-2)
  useEffect(() => {
    window.addEventListener('pointerup', padUp);
    window.addEventListener('pointercancel', padUp);
    return () => {
      window.removeEventListener('pointerup', padUp);
      window.removeEventListener('pointercancel', padUp);
      endPress();
    };
  }, [padUp, endPress]);

  const padDown = useCallback(
    (color: SimonColor) => {
      if (stateRef.current.status !== 'awaitingInput') return;
      endPress();

      setActiveColor(color);
      startTone(color);
      const press: Press = {
        color,
        released: false,
        minElapsed: false,
        timer: setTimeout(() => {
          press.minElapsed = true;
          if (press.released) endPress();
        }, TIMING.pressMin),
      };
      pressRef.current = press;

      dispatch({ type: 'press', color, nextColor: randomColor() });
    },
    [endPress],
  );

  // Start and resume both unlock audio from the click gesture first (autoplay policy)
  const unlockThen = useCallback((action: () => void) => {
    unlocking.current = true;
    const token = ++unlockToken.current;

    void unlockAudio().then((ok) => {
      if (token !== unlockToken.current) return;
      unlocking.current = false;
      setAudioError(!ok);
      // Never present a silent sequence that pretends sound is playing
      if (ok) action();
    });
  }, []);

  const startGame = useCallback(() => {
    if (stateRef.current.status !== 'idle' || unlocking.current) return;
    unlockThen(() => dispatch({ type: 'start', firstColor: randomColor() }));
  }, [unlockThen]);

  const resumeGame = useCallback(() => {
    if (stateRef.current.status !== 'paused' || unlocking.current) return;
    unlockThen(() => dispatch({ type: 'resume' }));
  }, [unlockThen]);

  // Single pause entry point: navigation to About, hidden page, pagehide (ADR-3)
  const pause = useCallback(() => {
    unlockToken.current++;
    unlocking.current = false;
    endPress();
    if (!isGameActive(stateRef.current)) return;
    stopAll();
    setActiveColor(null);
    dispatch({ type: 'pause' });
  }, [endPress]);

  // Returning to the page does nothing: resuming is always manual
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') pause();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', pause);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', pause);
    };
  }, [pause]);

  const dismiss = useCallback(() => {
    setResultVisible(false);
    stopAll();
    dispatch({ type: 'dismiss' });
  }, []);

  return { state, activeColor, resultVisible, audioError, startGame, resumeGame, pause, padDown, padUp, dismiss };
}

export type Game = ReturnType<typeof useGame>;
