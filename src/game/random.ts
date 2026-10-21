import { COLORS, type SimonColor } from './colors';

// Game randomness only – no cryptographic RNG needed (ARCHITECTURE.md §2.3)
export function randomColor(): SimonColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)].id;
}
