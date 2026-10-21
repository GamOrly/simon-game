export type SimonColor = 'green' | 'red' | 'yellow' | 'blue';

export type BoardPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type ColorInfo = {
  id: SimonColor;
  label: string; // Hebrew accessible name
  position: BoardPosition; // physical position on the board, never mirrored by RTL
};

// Layout follows the Mockups (DESIGN.md §1.1)
export const COLORS: readonly ColorInfo[] = [
  { id: 'green', label: 'ירוק', position: 'top-left' },
  { id: 'red', label: 'אדום', position: 'top-right' },
  { id: 'yellow', label: 'צהוב', position: 'bottom-left' },
  { id: 'blue', label: 'כחול', position: 'bottom-right' },
];
