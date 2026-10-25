import { useCallback, useRef, useState } from 'react';
import { addResult, clearHistory, createResult, loadHistory, type GameOutcome } from './historyStorage';

/** Holds the saved results and the failure flags of the last load, save and clear. */
export function useHistory() {
  // Read storage once, shared by both initial states
  const [initial] = useState(loadHistory);
  const [results, setResults] = useState(initial.results);
  const [loadFailed, setLoadFailed] = useState(!initial.ok);
  const [saveFailed, setSaveFailed] = useState(false);
  const [clearFailed, setClearFailed] = useState(false);

  // Consecutive records must build on the latest list, not a stale render
  const resultsRef = useRef(results);
  resultsRef.current = results;

  const record = useCallback((outcome: GameOutcome, completedRounds: number) => {
    const saved = addResult(resultsRef.current, createResult(outcome, completedRounds));
    if (saved.ok) {
      resultsRef.current = saved.results;
      setResults(saved.results);
      setLoadFailed(false);
    }
    // A failed save leaves the list as it is: never show an unsaved result
    setSaveFailed(!saved.ok);
  }, []);

  const clear = useCallback(() => {
    const cleared = clearHistory();
    if (cleared.ok) {
      resultsRef.current = [];
      setResults([]);
      setLoadFailed(false);
    }
    setClearFailed(!cleared.ok);
  }, []);

  return { results, loadFailed, saveFailed, clearFailed, record, clear };
}

export type History = ReturnType<typeof useHistory>;
