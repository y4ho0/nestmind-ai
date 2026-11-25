/**
 * NestMind 4.0 — Procedural Web Audio Psychological Soundscape Engine
 * Zero external audio dependencies (no MP3/WAV fetches that could 404).
 * Exposes window.NestAudio: toggle(), unlock(), setProgress(progress, act),
 * playGlitch(intensity), triggerClimax(), reset().
 */
(function () {
  'use strict';

  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  const MASTER_GAIN_ON = 0.28;

  // Warm Fmaj7 / Cmaj7 sunlit wellness frequencies -> Act 3+ minor/dissonant frequencies
  const CALM_FREQS = [174.61, 220.0, 261.63, 329.63]; // F3, A3, C4, E4 (Fmaj7)
  const EERIE_FREQS = [146.83, 174.61, 207.65, 277.18]; // D3, F3, G#3, C#4 (diminished/minor tension)

  let ctx = null;
  let masterGain = null;
  let compressor = null;
  let noiseBuffer = null;

  // Continuous layer nodes
  let padOscs = [];
  let padFilter = null;
  let padGain = null;

  let humOsc60 = null;
  let humOsc120 = null;
  let humGain = null;

  let staticSource = null;
  let staticFilter = null;
  let staticGain = null;

  let metalOsc = null;
  let metalFilter = null;
  let metalGain = null;

  let rumbleOsc = null;
  let rumbleGain = null;

  let tinnitusOsc = null;
  let tinnitusGain = null;

  let aftermathGain = null;
  let aftermathOsc1 = null;
  let aftermathOsc2 = null;

  // Scheduled pulse timers
  let pulseTimerId = 0;
  let nextHeartbeatTime = 0;
  let nextWhisperTime = 0;

  const state = {
    enabled: false,
    manuallyMuted: false,
    initialized: false,
    progress: 0,
    act: 1,
    climaxMode: false,
  };

  function deriveAct(p, explicitAct) {
    if (explicitAct >= 1 && explicitAct <= 5) return explicitAct | 0;
    if (p < 0.22) return 1;
    if (p < 0.44) return 2;
    if (p < 0.68) return 3;
    if (p < 0.88) return 4;
    return 5;
  }

  function createNoiseBuffer(audioCtx) {
    const length = audioCtx.sampleRate * 3;
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    // Blended pink-ish / white noise for organic static & whispers
    let b0 = 0,
      b1 = 0,
      b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = clamp((b0 + b1 + b2 + white * 0.35) * 0.22, -1, 1);
    }
    return buffer;
  }

  function makeDistortionCurve(amount) {
    const samples = 512;
    const curve = new Float32Array(samples);
    const k = amount;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  function initGraph() {
    if (state.initialized && ctx) return true;
    if (typeof window === 'undefined') return false;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    try {
      ctx = new AudioCtx();
    } catch (_err) {
      ctx = null;
      return false;
    }

    noiseBuffer = createNoiseBuffer(ctx);

    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 18;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.2;

    masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    // 1. Act 1–3 Ambient Pad (Warm Fmaj7 luxury wellness -> detuned uncanny -> minor)
    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 920;
    padFilter.Q.value = 0.8;

    padGain = ctx.createGain();
    padGain.gain.value = 0.14;
    padFilter.connect(padGain);
    padGain.connect(compressor);

    // Slow breathing LFO on pad filter
    const padLfo = ctx.createOscillator();
    const padLfoGain = ctx.createGain();
    padLfo.type = 'sine';
    padLfo.frequency.value = 0.14;
    padLfoGain.gain.value = 160;
    padLfo.connect(padLfoGain);
    padLfoGain.connect(padFilter.frequency);
    padLfo.start();

    padOscs = CALM_FREQS.map((freq, idx) => {
      const osc = ctx.createOscillator();
      const vGain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      vGain.gain.value = idx === 0 ? 0.32 : 0.22;
      osc.connect(vGain);
      vGain.connect(padFilter);
      osc.start();
      return osc;
    });

    // 2. Act 2+ 60Hz / 120Hz Electrical Fluorescent Hum
    humGain = ctx.createGain();
    humGain.gain.value = 0.0;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 260;
    humFilter.connect(humGain);
    humGain.connect(compressor);

    humOsc60 = ctx.createOscillator();
    humOsc60.type = 'sawtooth';
    humOsc60.frequency.value = 60;
    const g60 = ctx.createGain();
    g60.gain.value = 0.45;
    humOsc60.connect(g60);
    g60.connect(humFilter);
    humOsc60.start();

    humOsc120 = ctx.createOscillator();
    humOsc120.type = 'sine';
    humOsc120.frequency.value = 120;
    const g120 = ctx.createGain();
    g120.gain.value = 0.3;
    humOsc120.connect(g120);
    g120.connect(humFilter);
    humOsc120.start();

    // 3. Act 3+ Filtered Surveillance Radio Static & Metallic Sub-Harmonic Resonance
    staticSource = ctx.createBufferSource();
    staticSource.buffer = noiseBuffer;
    staticSource.loop = true;

    staticFilter = ctx.createBiquadFilter();
    staticFilter.type = 'bandpass';
    staticFilter.frequency.value = 1850;
    staticFilter.Q.value = 3.2;

    staticGain = ctx.createGain();
    staticGain.gain.value = 0.0;

    staticSource.connect(staticFilter);
    staticFilter.connect(staticGain);
    staticGain.connect(compressor);
    staticSource.start();

    metalOsc = ctx.createOscillator();
    metalOsc.type = 'sawtooth';
    metalOsc.frequency.value = 73.42; // D2 metallic sub-harmonic
    metalFilter = ctx.createBiquadFilter();
    metalFilter.type = 'bandpass';
    metalFilter.frequency.value = 294;
    metalFilter.Q.value = 9.5;
    metalGain = ctx.createGain();
    metalGain.gain.value = 0.0;
    metalOsc.connect(metalFilter);
    metalFilter.connect(metalGain);
    metalGain.connect(compressor);
    metalOsc.start();

    // 4. Act 5 Deep Sub-Bass Rumble & High-Frequency Tinnitus Ring
    rumbleOsc = ctx.createOscillator();
    rumbleOsc.type = 'sine';
    rumbleOsc.frequency.value = 36.7;
    rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.0;
    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(compressor);
    rumbleOsc.start();

    tinnitusOsc = ctx.createOscillator();
    tinnitusOsc.type = 'sine';
    tinnitusOsc.frequency.value = 6780;
    tinnitusGain = ctx.createGain();
    tinnitusGain.gain.value = 0.0;
    tinnitusOsc.connect(tinnitusGain);
    tinnitusGain.connect(compressor);
    tinnitusOsc.start();

    // 5. Post-Climax Eerie Hollow Room Drone
    aftermathGain = ctx.createGain();
    aftermathGain.gain.value = 0.0;
    const afterFilter = ctx.createBiquadFilter();
    afterFilter.type = 'lowpass';
    afterFilter.frequency.value = 240;
    afterFilter.connect(aftermathGain);
    aftermathGain.connect(compressor);

    aftermathOsc1 = ctx.createOscillator();
    aftermathOsc1.type = 'triangle';
    aftermathOsc1.frequency.value = 55.0; // A1
    aftermathOsc2 = ctx.createOscillator();
    aftermathOsc2.type = 'sine';
    aftermathOsc2.frequency.value = 81.8; // Slightly flat hollow fifth
    aftermathOsc1.connect(afterFilter);
    aftermathOsc2.connect(afterFilter);
    aftermathOsc1.start();
    aftermathOsc2.start();

    state.initialized = true;
    applyProgressParams();
    startPulseScheduler();
    return true;
  }

  function applyProgressParams() {
    if (!state.initialized || !ctx) return;

    const now = ctx.currentTime;
    const p = state.progress;
    const tau = 0.14;

    if (state.climaxMode) {
      // During climax / hollow aftermath drone, pull back normal layers and hold eerie room drone
      padGain.gain.setTargetAtTime(0.0, now, 0.08);
      humGain.gain.setTargetAtTime(0.015, now, 0.2);
      staticGain.gain.setTargetAtTime(0.018, now, 0.3);
      metalGain.gain.setTargetAtTime(0.02, now, 0.3);
      tinnitusGain.gain.setTargetAtTime(0.008, now, 0.5);
      rumbleGain.gain.setTargetAtTime(0.08, now, 0.4);
      return;
    }

    aftermathGain.gain.setTargetAtTime(0.0, now, 0.12);

    // Act 1 (0 .. 0.22): Warm major-seventh pad, zero horror artifacts
    const padLevel =
      p < 0.22
        ? 0.16
        : p < 0.44
        ? lerp(0.16, 0.13, (p - 0.22) / 0.22)
        : p < 0.68
        ? lerp(0.13, 0.075, (p - 0.44) / 0.24)
        : lerp(0.075, 0.02, clamp((p - 0.68) / 0.2, 0, 1));
    padGain.gain.setTargetAtTime(padLevel, now, tau);

    const morphMinor = clamp((p - 0.38) / 0.28, 0, 1);
    const detuneFactor = p < 0.2 ? 0 : clamp((p - 0.2) / 0.24, 0, 1);
    const detuneSigns = [-1, 1, -0.8, 1.15];

    for (let i = 0; i < padOscs.length; i++) {
      const targetFreq = lerp(CALM_FREQS[i], EERIE_FREQS[i], morphMinor);
      padOscs[i].frequency.setTargetAtTime(targetFreq, now, 0.22);
      // Act 2: subtle 18–35 cent uncanny detuning, widening further in Act 3
      const cents = detuneSigns[i] * (detuneFactor * (22 + i * 4.5) + morphMinor * 16);
      padOscs[i].detune.setTargetAtTime(cents, now, 0.18);
    }
    padFilter.frequency.setTargetAtTime(lerp(960, 420, clamp((p - 0.22) / 0.5, 0, 1)), now, 0.2);

    // Act 2+: Faint 60Hz electrical fluorescent hum
    const humAmt =
      p < 0.2
        ? 0.0
        : p < 0.44
        ? lerp(0.0, 0.032, (p - 0.2) / 0.24)
        : p < 0.75
        ? 0.036
        : 0.02;
    humGain.gain.setTargetAtTime(humAmt, now, tau);

    // Act 3 (0.44 .. 0.68): Filtered radio static & metallic sub-harmonic resonance
    const staticAmt =
      p < 0.4
        ? 0.0
        : p < 0.68
        ? lerp(0.005, 0.055, (p - 0.4) / 0.28)
        : lerp(0.055, 0.03, clamp((p - 0.68) / 0.25, 0, 1));
    staticGain.gain.setTargetAtTime(staticAmt, now, tau);
    staticFilter.frequency.setTargetAtTime(lerp(1450, 2450, (Math.sin(now * 0.7) + 1) * 0.5), now, 0.25);

    const metalAmt =
      p < 0.42
        ? 0.0
        : p < 0.72
        ? lerp(0.0, 0.055, (p - 0.42) / 0.3)
        : 0.045;
    metalGain.gain.setTargetAtTime(metalAmt, now, tau);
    metalFilter.frequency.setTargetAtTime(lerp(240, 410, clamp((p - 0.42) / 0.45, 0, 1)), now, 0.2);

    // Act 5 (0.85 .. 1.0): Tense high-frequency tinnitus ring & deep sub-bass rumble
    const act5Factor = clamp((p - 0.84) / 0.14, 0, 1);
    tinnitusGain.gain.setTargetAtTime(act5Factor * 0.022, now, 0.18);
    const rumbleFactor = clamp((p - 0.68) / 0.3, 0, 1);
    rumbleGain.gain.setTargetAtTime(rumbleFactor * 0.16 + act5Factor * 0.12, now, 0.18);
    rumbleOsc.frequency.setTargetAtTime(lerp(42, 31, act5Factor), now, 0.2);
  }

  function scheduleHeartbeatThump(when, startFreq, endFreq, peakGain) {
    if (!ctx || !compressor) return;
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, when);
    osc.frequency.exponentialRampToValueAtTime(endFreq, when + 0.13);

    lp.type = 'lowpass';
    lp.frequency.value = 125;

    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peakGain, when + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.19);

    osc.connect(lp);
    lp.connect(g);
    g.connect(compressor);

    osc.start(when);
    osc.stop(when + 0.21);
  }

  function scheduleStereoWhisper(when, intensity) {
    if (!ctx || !noiseBuffer || !compressor) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;

    const dur = 0.45 + Math.random() * 0.55;
    const offset = Math.random() * Math.max(0.1, noiseBuffer.duration - dur - 0.05);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    const baseF = 680 + Math.random() * 820;
    bp.frequency.setValueAtTime(baseF, when);
    bp.frequency.linearRampToValueAtTime(baseF * (0.75 + Math.random() * 0.55), when + dur);
    bp.Q.value = 4.8;

    const g = ctx.createGain();
    const peak = (0.045 + Math.random() * 0.045) * intensity;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    src.connect(bp);
    bp.connect(g);

    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      const startPan = (Math.random() > 0.5 ? 1 : -1) * (0.45 + Math.random() * 0.48);
      panner.pan.setValueAtTime(startPan, when);
      panner.pan.linearRampToValueAtTime(-startPan * 0.65, when + dur);
      g.connect(panner);
      panner.connect(compressor);
    } else {
      g.connect(compressor);
    }

    src.start(when, offset, dur + 0.02);
  }

  function startPulseScheduler() {
    if (pulseTimerId || typeof window === 'undefined') return;
    pulseTimerId = window.setInterval(() => {
      if (!state.enabled || !ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const p = state.progress;

      // Act 4–5 Claustrophobic lowpass lub-dub heartbeat (65 BPM -> 135 BPM as progress -> 0.94)
      if (p >= 0.64 && !state.climaxMode) {
        const dreadT = clamp((p - 0.64) / 0.3, 0, 1);
        const bpm = lerp(65, 135, dreadT);
        const period = 60 / bpm;
        const level = lerp(0.14, 0.34, dreadT);

        if (nextHeartbeatTime < now) nextHeartbeatTime = now + 0.03;
        while (nextHeartbeatTime < now + 0.22) {
          scheduleHeartbeatThump(nextHeartbeatTime, 60, 33, level);
          scheduleHeartbeatThump(nextHeartbeatTime + Math.min(0.19, period * 0.32), 50, 28, level * 0.74);
          nextHeartbeatTime += period;
        }
      } else {
        nextHeartbeatTime = 0;
      }

      // Act 4 Stereo-panned breathy noise whispers
      if (p >= 0.66 && p <= 0.96 && !state.climaxMode) {
        if (nextWhisperTime < now) nextWhisperTime = now + 0.4;
        if (nextWhisperTime < now + 0.25) {
          const wIntensity = clamp((p - 0.64) / 0.24, 0.35, 1.0);
          scheduleStereoWhisper(nextWhisperTime, wIntensity);
          nextWhisperTime += 1.6 + Math.random() * 2.2;
        }
      }
    }, 95);
  }

  function setEnabledState(nextEnabled) {
    state.enabled = Boolean(nextEnabled);
    if (!ctx || !masterGain) return state.enabled;

    if (state.enabled && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
    if (state.enabled) {
      applyProgressParams();
      masterGain.gain.linearRampToValueAtTime(MASTER_GAIN_ON, now + 0.22);
    } else {
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    }
    return state.enabled;
  }

  const NestAudio = {
    toggle() {
      const ok = initGraph();
      if (!ok) {
        state.enabled = false;
        return false;
      }
      const next = !state.enabled;
      state.manuallyMuted = !next;
      return setEnabledState(next);
    },

    unlock() {
      if (state.manuallyMuted) return false;
      if (state.enabled && ctx) {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return true;
      }
      const ok = initGraph();
      if (!ok) return false;
      return setEnabledState(true);
    },

    setProgress(progress, act) {
      state.progress = clamp(Number(progress) || 0, 0, 1);
      state.act = deriveAct(state.progress, Number(act));
      if (state.initialized) {
        applyProgressParams();
      }
    },

    playGlitch(intensity = 0.5) {
      if (!state.enabled || !state.initialized || !ctx || !noiseBuffer || !compressor) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const amt = clamp(Number(intensity) || 0.5, 0.1, 1.0);
      const now = ctx.currentTime;
      const dur = 0.055 + amt * 0.055;

      // Sharp filtered static burst
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1600 + Math.random() * 1900, now);
      bp.Q.value = 2.4;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.24 * amt, now + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      src.connect(bp);
      bp.connect(g);
      g.connect(compressor);
      src.start(now, Math.random() * 1.5, dur + 0.01);

      // Mechanical smart-lock relay click snap
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(920, now);
      clickOsc.frequency.exponentialRampToValueAtTime(110, now + 0.028);
      clickGain.gain.setValueAtTime(0.16 * amt, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);
      clickOsc.connect(clickGain);
      clickGain.connect(compressor);
      clickOsc.start(now);
      clickOsc.stop(now + 0.035);
    },

    triggerClimax() {
      state.climaxMode = true;
      if (!state.enabled || !state.initialized || !ctx || !compressor) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      applyProgressParams();

      // 1. Dissonant Metallic Cluster Screech (~1.4s)
      const shaper = ctx.createWaveShaper();
      shaper.curve = makeDistortionCurve(95);
      shaper.oversample = '2x';

      const screechFilter = ctx.createBiquadFilter();
      screechFilter.type = 'bandpass';
      screechFilter.frequency.setValueAtTime(1950, now);
      screechFilter.frequency.exponentialRampToValueAtTime(760, now + 1.55);
      screechFilter.Q.value = 3.6;

      const screechGain = ctx.createGain();
      screechGain.gain.setValueAtTime(0.0001, now);
      screechGain.gain.linearRampToValueAtTime(0.32, now + 0.025);
      screechGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.65);

      shaper.connect(screechFilter);
      screechFilter.connect(screechGain);
      screechGain.connect(compressor);

      const clusterFreqs = [466.16, 554.37, 783.99, 1108.73];
      clusterFreqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(
          idx % 2 === 0 ? f * 1.14 : f * 0.84,
          now + 1.45
        );
        const vg = ctx.createGain();
        vg.gain.value = 0.26;
        osc.connect(vg);
        vg.connect(shaper);
        osc.start(now);
        osc.stop(now + 1.68);
      });

      // 2. Massive Sub-Bass Drop (45Hz -> 22Hz)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(45, now);
      subOsc.frequency.exponentialRampToValueAtTime(22, now + 1.65);
      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.linearRampToValueAtTime(0.68, now + 0.02);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.78);
      subOsc.connect(subGain);
      subGain.connect(compressor);
      subOsc.start(now);
      subOsc.stop(now + 1.82);

      // 3. Distorted Static Burst
      if (noiseBuffer) {
        const stSrc = ctx.createBufferSource();
        stSrc.buffer = noiseBuffer;
        const stGain = ctx.createGain();
        stGain.gain.setValueAtTime(0.0001, now);
        stGain.gain.linearRampToValueAtTime(0.38, now + 0.012);
        stGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
        stSrc.connect(shaper);
        stSrc.connect(stGain);
        stGain.connect(compressor);
        stSrc.start(now, 0, 0.55);
      }

      // 4. Settle after ~1.8s into eerie hollow room drone
      if (aftermathGain) {
        aftermathGain.gain.cancelScheduledValues(now);
        aftermathGain.gain.setValueAtTime(0.0001, now + 1.35);
        aftermathGain.gain.linearRampToValueAtTime(0.14, now + 2.1);
      }
    },

    reset() {
      state.climaxMode = false;
      state.progress = 0;
      state.act = 1;
      nextHeartbeatTime = 0;
      nextWhisperTime = 0;

      if (state.initialized && ctx) {
        const now = ctx.currentTime;
        if (aftermathGain) {
          aftermathGain.gain.cancelScheduledValues(now);
          aftermathGain.gain.setTargetAtTime(0.0, now, 0.08);
        }
        applyProgressParams();
      }
    },
  };

  if (typeof window !== 'undefined') {
    window.NestAudio = NestAudio;
  }
})();
