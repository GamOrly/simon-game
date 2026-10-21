import { COLORS } from '../game/colors';

export function SimonBoard() {
  return (
    <div className="board" role="group" aria-label="לוח המשחק">
      {COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          className={`board__pad board__pad--${color.id} board__pad--${color.position}`}
          aria-label={color.label}
          data-position={color.position}
        />
      ))}
      <div className="board__center" aria-hidden="true" />
    </div>
  );
}
