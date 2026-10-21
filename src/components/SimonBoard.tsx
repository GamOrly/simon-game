import type { KeyboardEvent, PointerEvent } from 'react';
import { COLORS, type SimonColor } from '../game/colors';

type Props = {
  activeColor: SimonColor | null;
  dimmed: boolean; // other pads are dimmed while the sequence is presented
  inputEnabled: boolean;
  onPadDown: (color: SimonColor) => void;
  onPadUp: () => void;
};

const isActivationKey = (event: KeyboardEvent) => event.key === 'Enter' || event.key === ' ';

export function SimonBoard({ activeColor, dimmed, inputEnabled, onPadDown, onPadUp }: Props) {
  return (
    <div className={`board${dimmed ? ' board--dimmed' : ''}`} role="group" aria-label="לוח המשחק">
      {COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          className={`board__pad board__pad--${color.id} board__pad--${color.position}${
            activeColor === color.id ? ' board__pad--lit' : ''
          }`}
          aria-label={color.label}
          aria-disabled={!inputEnabled}
          data-position={color.position}
          // Judge on pointerdown so touch feedback is immediate (ADR-2)
          onPointerDown={(event: PointerEvent) => {
            if (event.button !== 0) return;
            event.preventDefault();
            onPadDown(color.id);
          }}
          onKeyDown={(event) => {
            if (!isActivationKey(event) || event.repeat) return;
            event.preventDefault();
            onPadDown(color.id);
          }}
          onKeyUp={(event) => {
            if (isActivationKey(event)) onPadUp();
          }}
          onContextMenu={(event) => event.preventDefault()}
        />
      ))}
      <div className="board__center" aria-hidden="true" />
    </div>
  );
}
