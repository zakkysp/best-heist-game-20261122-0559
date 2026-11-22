// All sound is synthesized with WebAudio: no audio files, nothing fetched.
// A quiet bass loop keeps the tension, and short blips mark pickups, coins,
// the alarm and the win / caught stings. Everything is guarded so a missing
// or suspended AudioContext never breaks the game.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let musicTimer = 0;
  let step = 0;
  let sirenFlip = false;

  // A slow A-minor bass walk; 0 means rest that step.
  const BASS = [55, 0, 55, 0, 65.41, 0, 49, 0, 55, 0, 55, 0, 82.41, 73.42, 65.41, 0];
  const STEP_SEC = 0.26;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, gain, when = 0) {
    if (!ensure() || muted || !ctx) return;
    try {
      const t0 = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch { /* sound is decoration, never a crash */ }
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() { return muted; },

    pickup() {
      tone(880, 0.12, 'sine', 0.22);
      tone(1318.5, 0.2, 'sine', 0.18, 0.07);
    },
    diamond() {
      tone(1046.5, 0.14, 'sine', 0.22);
      tone(1318.5, 0.14, 'sine', 0.2, 0.08);
      tone(1760, 0.3, 'sine', 0.18, 0.16);
    },
    coin() {
      tone(2093, 0.06, 'square', 0.08);
      tone(1568, 0.09, 'square', 0.06, 0.05);
    },
    spotted() {
      tone(392, 0.22, 'sawtooth', 0.14);
      tone(311, 0.3, 'sawtooth', 0.14, 0.16);
    },
    caught() {
      tone(220, 0.5, 'sawtooth', 0.2);
      tone(110, 0.9, 'sawtooth', 0.2, 0.18);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.35, 'triangle', 0.2, i * 0.12));
    },
    sirenTick() {
      sirenFlip = !sirenFlip;
      tone(sirenFlip ? 660 : 520, 0.16, 'square', 0.045);
    },

    /** Advance the music loop by dt seconds of play time. */
    update(dt, alarm) {
      if (!ctx || muted) return;
      musicTimer += dt;
      while (musicTimer >= STEP_SEC) {
        musicTimer -= STEP_SEC;
        const f = BASS[step % BASS.length];
        if (f) tone(f, 0.24, 'triangle', alarm > 50 ? 0.16 : 0.1);
        if (step % 4 === 2) tone(1760, 0.05, 'sine', 0.03);
        step += 1;
      }
    },
  };
}
