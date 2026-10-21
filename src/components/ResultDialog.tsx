import confetti from 'canvas-confetti';
import { useEffect, useRef } from 'react';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  outcome: 'won' | 'lost';
  completedRounds: number;
  onConfirm: () => void;
};

const CONFETTI_COLORS = ['#00D26A', '#FF3B30', '#FFD600', '#00A3FF'];

function completedText(n: number) {
  return n === 1 ? 'השלמת שלב אחד' : `השלמת ${n} שלבים`;
}

export function ResultDialog({ outcome, completedRounds, onConfirm }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  // Confetti on win only, cleared when the dialog closes
  useEffect(() => {
    if (outcome !== 'won') return;
    void confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.45 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
    });
    return () => {
      confetti.reset();
    };
  }, [outcome]);

  const won = outcome === 'won';

  return (
    <div className="result">
      <div className="result__card" role="dialog" aria-modal="true" aria-labelledby="result-title">
        {won ? (
          <h2 id="result-title" className="result__title result__title--won">
            כל הכבוד! ניצחת!
          </h2>
        ) : (
          <>
            <h2 id="result-title" className="result__title result__title--lost">
              נפסלת!
            </h2>
            <p className="result__detail">{completedText(completedRounds)}</p>
          </>
        )}
        <PrimaryButton ref={confirmRef} onClick={onConfirm}>
          אישור
        </PrimaryButton>
      </div>
    </div>
  );
}
