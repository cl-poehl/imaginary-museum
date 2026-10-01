"use client";

// The museum's sound, off until the visitor turns it on: a soft room tone (brown
// noise through a low-pass filter, slowly breathing, like air in a large hall)
// and the audio guide, a short spoken introduction as you come into each room
// (made by scripts/audio-guide.mjs). The room tone dips while the guide speaks.

const TONE = 0.05;
const UNDER_VOICE = 0.018;

let on = false;
let ctx: AudioContext | null = null;
let tone: GainNode | null = null;
let voice: HTMLAudioElement | null = null;
let voiceSrc: string | null = null;

function roomTone(c: AudioContext) {
  // Four seconds of brown noise, looped.
  const buffer = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 380;
  // The air moves: the filter opens and closes over about twenty seconds.
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.05;
  const depth = c.createGain();
  depth.gain.value = 120;
  lfo.connect(depth).connect(filter.frequency);
  const gain = c.createGain();
  gain.gain.value = 0;
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start();
  lfo.start();
  return gain;
}

function fadeTone(to: number, seconds = 1.2) {
  if (!ctx || !tone) return;
  tone.gain.cancelScheduledValues(ctx.currentTime);
  tone.gain.setTargetAtTime(to, ctx.currentTime, seconds / 3);
}

/** Turns the room tone on or off (call from a click: browsers only allow sound after one). */
export function setSound(next: boolean) {
  on = next;
  if (on) {
    ctx ??= new AudioContext();
    tone ??= roomTone(ctx);
    void ctx.resume();
    fadeTone(voice && !voice.paused ? UNDER_VOICE : TONE);
  } else {
    playGuide(null);
    fadeTone(0, 0.6);
  }
}

/** Plays a guide clip (null stops it). The same clip again is left playing, or finished. */
export function playGuide(src: string | null) {
  if (src === voiceSrc) return;
  voice?.pause();
  voiceSrc = src;
  voice = null;
  if (!src) {
    if (on) fadeTone(TONE);
    return;
  }
  const v = new Audio(src);
  voice = v;
  v.onended = () => {
    if (voice === v && on) fadeTone(TONE, 2);
  };
  fadeTone(UNDER_VOICE, 0.6);
  v.play().catch(() => {
    // Not allowed yet (no click since the page opened), or the clip is missing.
  });
}
