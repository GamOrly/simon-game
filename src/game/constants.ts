export const MAX_ROUNDS = 10;

// Presentation pace – fixed for every round (DESIGN.md §1.1)
export const TIMING = {
  colorOn: 600, // highlight + tone of each color in the sequence
  colorGap: 250, // pause between two colors
  leadIn: 1000, // wait after "Start game" before the first color
  roundCompleteHold: 1000, // finished round number stays on screen
  nextRoundLeadIn: 1000, // after showing the next round number, before its first color
  resultDelay: 1000, // after the final press (win) or a wrong press (loss), before the result
  pressMin: 300, // minimum highlight + tone of a player press
} as const;
