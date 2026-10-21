import type { SimonColor } from '../game/colors';

// Distinct pitch per color, inspired by the original Simon device
export const TONE_FREQUENCIES: Record<SimonColor, number> = {
  green: 415.3,
  red: 310,
  yellow: 252,
  blue: 209,
};

const ATTACK = 0.01; // seconds – short envelope avoids clicks
const RELEASE = 0.04;
const VOLUME = 0.25;
const UNLOCK_TIMEOUT_MS = 2000;

type Voice = { osc: OscillatorNode; gain: GainNode };

let context: AudioContext | null = null;
const held = new Map<SimonColor, Voice>();
const scheduled = new Set<Voice>();

function getContext(): AudioContext | null {
  if (context) return context;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

/**
 * Creates/resumes the AudioContext. Must be called synchronously from a user
 * gesture handler (mobile autoplay policy). Resolves true only when audio runs.
 */
export function unlockAudio(): Promise<boolean> {
  try {
    const ctx = getContext();
    if (!ctx) return Promise.resolve(false);
    if (ctx.state === 'running') return Promise.resolve(true);

    return new Promise<boolean>((resolve) => {
      // Some browsers never settle resume(); treat that as a failure
      const timer = setTimeout(() => resolve(false), UNLOCK_TIMEOUT_MS);
      ctx.resume().then(
        () => {
          clearTimeout(timer);
          resolve((ctx.state as AudioContextState) === 'running');
        },
        () => {
          clearTimeout(timer);
          resolve(false);
        },
      );
    });
  } catch {
    return Promise.resolve(false);
  }
}

function createVoice(ctx: AudioContext, frequency: number, type: OscillatorType, start: number): Voice {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(VOLUME, start + ATTACK);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  return { osc, gain };
}

function releaseVoice(ctx: AudioContext, voice: Voice, at = ctx.currentTime) {
  voice.gain.gain.cancelScheduledValues(at);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, at);
  voice.gain.gain.linearRampToValueAtTime(0, at + RELEASE);
  voice.osc.stop(at + RELEASE + 0.01);
}

/** Starts a color tone that lasts until stopTone (used by playback and presses). */
export function startTone(color: SimonColor) {
  const ctx = context;
  if (!ctx) return;
  stopTone(color);
  held.set(color, createVoice(ctx, TONE_FREQUENCIES[color], 'triangle', ctx.currentTime));
}

export function stopTone(color: SimonColor) {
  const voice = held.get(color);
  if (!voice || !context) return;
  held.delete(color);
  releaseVoice(context, voice);
}

// Plays notes as [frequency, startOffset, duration] in seconds
function playMotif(notes: [number, number, number][], type: OscillatorType) {
  const ctx = context;
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const [frequency, offset, duration] of notes) {
    const voice = createVoice(ctx, frequency, type, now + offset);
    scheduled.add(voice);
    voice.osc.onended = () => scheduled.delete(voice);
    releaseVoice(ctx, voice, now + offset + duration);
  }
}

/** Short rising arpeggio. */
export function playWin() {
  playMotif(
    [
      [523.25, 0, 0.14],
      [659.25, 0.15, 0.14],
      [783.99, 0.3, 0.14],
      [1046.5, 0.45, 0.4],
    ],
    'square',
  );
}

/** Low falling buzz. */
export function playLose() {
  playMotif(
    [
      [196, 0, 0.3],
      [146.83, 0.3, 0.6],
    ],
    'sawtooth',
  );
}

/** Immediately silences every active or scheduled sound. */
export function stopAll() {
  const ctx = context;
  if (!ctx) return;
  for (const color of [...held.keys()]) stopTone(color);
  for (const voice of scheduled) {
    try {
      releaseVoice(ctx, voice);
    } catch {
      // already stopped
    }
  }
  scheduled.clear();
}
