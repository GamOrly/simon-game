import { useEffect, useRef } from 'react';

type Props = {
  onCancel: () => void;
  onConfirm: () => void;
};

/** Delete-history confirmation: a layer inside About, not a third screen. */
export function ConfirmDialog({ onCancel, onConfirm }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the safe action first; Escape cancels
  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="confirm" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        className="confirm__card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        <h2 id="confirm-title" className="confirm__title">
          למחוק את ההיסטוריה?
        </h2>
        <p id="confirm-desc" className="confirm__desc">
          כל תוצאות המשחקים יימחקו.
        </p>
        <div className="confirm__actions">
          {/* RTL: the first button sits on the right, as in the mockup */}
          <button type="button" className="btn-danger" onClick={onConfirm}>
            מחק
          </button>
          <button type="button" ref={cancelRef} className="btn-cancel" onClick={onCancel}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
