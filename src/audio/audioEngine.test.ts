import { TONE_FREQUENCIES, unlockAudio } from './audioEngine';

describe('audioEngine', () => {
  it('gives each of the four colors a different pitch', () => {
    const pitches = Object.values(TONE_FREQUENCIES);
    expect(pitches).toHaveLength(4);
    expect(new Set(pitches).size).toBe(4);
  });

  it('reports failure when Web Audio is unavailable', async () => {
    // jsdom has no AudioContext
    await expect(unlockAudio()).resolves.toBe(false);
  });
});
