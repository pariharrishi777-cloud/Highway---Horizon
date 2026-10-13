// Procedural Web Audio API sound generator for Highway Horizon 3D
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isMusicEnabled = true;

    // Engine sound nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.engineGain = null;

    // Wind sound node
    this.windGain = null;
    this.windFilter = null;

    // Music interval
    this.musicInterval = null;
    this.musicStep = 0;

    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master volume
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Create continuous engine sound
      this.setupEngineSound();
      this.setupWindSound();

      // Start music sequencer
      if (this.isMusicEnabled) {
        this.startMusic();
      }

      this.initialized = true;
    } catch (e) {
      console.warn("AudioContext init error:", e);
    }
  }

  ensureContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSound() {
    if (!this.ctx) return;

    // ─── Layer 1: Engine Fundamental (low growl) ───
    this.engOsc1 = this.ctx.createOscillator();
    this.engOsc1.type = 'sawtooth';
    this.engOsc1.frequency.setValueAtTime(38, this.ctx.currentTime);

    // ─── Layer 2: 2nd harmonic (mid body tone) ───
    this.engOsc2 = this.ctx.createOscillator();
    this.engOsc2.type = 'sawtooth';
    this.engOsc2.frequency.setValueAtTime(76, this.ctx.currentTime);

    // ─── Layer 3: 4th harmonic V8 cylinder fire (raspy crackle) ───
    this.engOsc3 = this.ctx.createOscillator();
    this.engOsc3.type = 'square';
    this.engOsc3.frequency.setValueAtTime(152, this.ctx.currentTime);

    // ─── Layer 4: High intake whoosh at speed ───
    this.engOsc4 = this.ctx.createOscillator();
    this.engOsc4.type = 'triangle';
    this.engOsc4.frequency.setValueAtTime(300, this.ctx.currentTime);

    // Exhaust rumble noise (short loop of bandpass filtered noise)
    const noiseLen = this.ctx.sampleRate * 1.5;
    const noiseBuf = this.ctx.createBuffer(1, noiseLen, this.ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) nd[i] = Math.random() * 2 - 1;
    this.exhaustNoise = this.ctx.createBufferSource();
    this.exhaustNoise.buffer = noiseBuf;
    this.exhaustNoise.loop = true;

    this.exhaustFilter = this.ctx.createBiquadFilter();
    this.exhaustFilter.type = 'bandpass';
    this.exhaustFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
    this.exhaustFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.exhaustGain = this.ctx.createGain();
    this.exhaustGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    // Shared bandpass shaping filter (gives engine its "throat")
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'bandpass';
    this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    // High-cut to remove thin digital edge
    this.engineHighCut = this.ctx.createBiquadFilter();
    this.engineHighCut.type = 'lowpass';
    this.engineHighCut.frequency.setValueAtTime(1600, this.ctx.currentTime);

    // Per-layer gains for mixing
    this.eng1Gain = this.ctx.createGain(); this.eng1Gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.eng2Gain = this.ctx.createGain(); this.eng2Gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
    this.eng3Gain = this.ctx.createGain(); this.eng3Gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.eng4Gain = this.ctx.createGain(); this.eng4Gain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

    // Routing: oscs → individual gains → shared filter chain → master gain
    this.engOsc1.connect(this.eng1Gain); this.eng1Gain.connect(this.engineFilter);
    this.engOsc2.connect(this.eng2Gain); this.eng2Gain.connect(this.engineFilter);
    this.engOsc3.connect(this.eng3Gain); this.eng3Gain.connect(this.engineFilter);
    this.engOsc4.connect(this.eng4Gain); this.eng4Gain.connect(this.engineFilter);
    this.exhaustNoise.connect(this.exhaustFilter);
    this.exhaustFilter.connect(this.exhaustGain);
    this.exhaustGain.connect(this.engineGain);

    this.engineFilter.connect(this.engineHighCut);
    this.engineHighCut.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engOsc1.start(); this.engOsc2.start();
    this.engOsc3.start(); this.engOsc4.start();
    this.exhaustNoise.start();

    // Track RPM state for gear shift simulation
    this._engineRpm = 0.25;
    this._engineGear = 1;
    this._engineOsc1 = this.engOsc1; // alias for legacy updateEngine reference
  }

  setupWindSound() {
    if (!this.ctx) return;
    // White noise buffer for ambient speed wind
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    whiteNoise.start();
  }

  updateEngine(speedKmh, maxSpeedKmh, isNitro) {
    if (!this.ctx || !this.engOsc1 || this.isMuted) return;

    const now = this.ctx.currentTime;
    const ratio = Math.max(0, Math.min(1.2, speedKmh / maxSpeedKmh));

    // ── Realistic 6-speed gear box simulation ──
    // Each gear covers ~16% of speed range, RPM drops on upshift (like a real box)
    const gearBreaks = [0.16, 0.30, 0.46, 0.62, 0.80, 1.0];
    let gear = 1;
    for (let g = 0; g < gearBreaks.length; g++) {
      if (ratio <= gearBreaks[g]) { gear = g + 1; break; }
    }
    if (ratio > 1.0) gear = 6;

    // RPM within gear: 0.3 (just shifted in) → 1.0 (redline, about to shift)
    const prevBreak = gear > 1 ? gearBreaks[gear - 2] : 0;
    const gearSpan = gearBreaks[gear - 1] - prevBreak;
    const rpmWithinGear = 0.30 + ((ratio - prevBreak) / gearSpan) * 0.70;
    const rpm = Math.max(0.25, Math.min(1.0, rpmWithinGear));

    // Detect upshift: brief RPM dip for gear-change feel
    if (gear !== this._engineGear) {
      this._engineGear = gear;
    }

    // Base frequency: idle ~38Hz, redline ~140Hz
    const baseFreq = 38 + rpm * 102 + (isNitro ? 22 : 0);

    // Layer 1 – fundamental growl
    this.engOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    // Layer 2 – 2nd harmonic (adds body)
    this.engOsc2.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.04);
    // Layer 3 – 4th harmonic crackle (V8 fire), grows with RPM
    this.engOsc3.frequency.setTargetAtTime(baseFreq * 4.1, now, 0.04);
    // Layer 4 – intake whoosh (only audible above 60%)
    this.engOsc4.frequency.setTargetAtTime(baseFreq * 7.0, now, 0.06);

    // Mix harmonics dynamically:
    // At idle: mostly fundamental. At high RPM: harmonics rise
    this.eng1Gain.gain.setTargetAtTime(0.7, now, 0.06);
    this.eng2Gain.gain.setTargetAtTime(0.3 + rpm * 0.25, now, 0.06);
    this.eng3Gain.gain.setTargetAtTime(rpm * 0.22 + (isNitro ? 0.08 : 0), now, 0.06);
    this.eng4Gain.gain.setTargetAtTime(Math.max(0, (ratio - 0.5) * 0.12 + (isNitro ? 0.06 : 0)), now, 0.08);

    // Exhaust rumble: rises at mid-high throttle
    this.exhaustFilter.frequency.setTargetAtTime(80 + rpm * 140, now, 0.05);
    this.exhaustGain.gain.setTargetAtTime(0.02 + rpm * 0.07, now, 0.05);

    // Bandpass centre moves up with RPM → opens the engine's "throat"
    this.engineFilter.frequency.setTargetAtTime(220 + rpm * 600 + (isNitro ? 300 : 0), now, 0.05);
    this.engineHighCut.frequency.setTargetAtTime(900 + ratio * 2200 + (isNitro ? 800 : 0), now, 0.05);

    // Master engine volume
    const vol = 0.04 + ratio * 0.13 + (isNitro ? 0.06 : 0);
    this.engineGain.gain.setTargetAtTime(vol, now, 0.05);

    // Wind roar at high speed
    if (this.windGain) {
      const windVol = ratio > 0.38 ? (ratio - 0.38) * 0.18 : 0;
      this.windGain.gain.setTargetAtTime(windVol, now, 0.12);
      this.windFilter.frequency.setTargetAtTime(500 + ratio * 1400, now, 0.1);
    }
  }

  // Hard brake squeal — screech of pads on rotors
  playBrakeSqueal() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    // Screech: high pitched sine sweep down
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2800 + Math.random() * 400, now);
    osc.frequency.linearRampToValueAtTime(1600, now + 0.35);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now); osc.stop(now + 0.4);

    // Low friction rumble underneath
    const bLen = Math.ceil(this.ctx.sampleRate * 0.4);
    const bBuf = this.ctx.createBuffer(1, bLen, this.ctx.sampleRate);
    const bData = bBuf.getChannelData(0);
    for (let i = 0; i < bLen; i++) bData[i] = (Math.random() * 2 - 1);
    const bSrc = this.ctx.createBufferSource();
    bSrc.buffer = bBuf;
    const bFilt = this.ctx.createBiquadFilter();
    bFilt.type = 'bandpass';
    bFilt.frequency.setValueAtTime(900, now);
    bFilt.Q.setValueAtTime(4, now);
    const bGain = this.ctx.createGain();
    bGain.gain.setValueAtTime(0.12, now);
    bGain.gain.exponentialRampToValueAtTime(0.005, now + 0.4);
    bSrc.connect(bFilt); bFilt.connect(bGain); bGain.connect(this.masterGain);
    bSrc.start(now); bSrc.stop(now + 0.4);
  }

  playNitroSound() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(750, this.ctx.currentTime + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(2400, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playTireSkid() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const bufferSize = this.ctx.sampleRate * 0.25;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.Q.setValueAtTime(8, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
  }

  // Turbo blow-off valve (pssshhht sound on letting off gas)
  playTurboBlowoff() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const bufferSize = this.ctx.sampleRate * 0.35;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.35);
  }

  // Checkpoint reached chime fanfare
  playCheckpoint() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + (idx * 0.08);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  // Speed Trap Radar shutter flash sound
  playSpeedCamera() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(3200, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playHorn() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Dual automotive frequencies: F4 (349 Hz) and A4 (440 Hz)
    osc1.frequency.setValueAtTime(349, this.ctx.currentTime);
    osc2.frequency.setValueAtTime(440, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.45);
    osc2.stop(this.ctx.currentTime + 0.45);
  }

  playCloseCall() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.08); // A5
    osc.frequency.setValueAtTime(1174.66, now + 0.16); // D6

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(now + 0.35);
  }

  playCrash() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    // Low boom oscillator
    const boom = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boom.frequency.setValueAtTime(140, this.ctx.currentTime);
    boom.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.8);
    boomGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    boomGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);
    boom.connect(boomGain);
    boomGain.connect(this.masterGain);
    boom.start();
    boom.stop(this.ctx.currentTime + 0.8);

    // Crunch noise
    const bufferSize = this.ctx.sampleRate * 0.6;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(200, this.ctx.currentTime + 0.6);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start();
  }

  // Golden Coin Pickup Chime
  playCoinPickup() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    const now = this.ctx.currentTime;
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    osc2.frequency.setValueAtTime(1975.53, now); // B6
    osc2.frequency.setValueAtTime(2637.02, now + 0.08); // E7

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  // Nitro NOS Canister Recharge Sound
  playNosPickup() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(2400, now + 0.35);
    filter.Q.setValueAtTime(6, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Multi-Station Radio Engine
  startMusic() {
    if (this.musicInterval || !this.ctx) return;

    this.stations = [
      { name: '📻 Synthwave 104.2', bpm: 120, bass: [110, 110, 130.81, 146.83, 110, 110, 98, 123.47], lead: [440, 523.25, 659.25, 587.33, 440, 659.25, 783.99, 659.25] },
      { name: '⚡ Cyber Bass 98.7', bpm: 135, bass: [73.42, 73.42, 82.41, 73.42, 65.41, 65.41, 98, 87.31], lead: [293.66, 329.63, 293.66, 392.00, 293.66, 440.00, 329.63, 293.66] },
      { name: '🌙 Neon Chill 88.5', bpm: 100, bass: [130.81, 130.81, 164.81, 146.83, 110, 110, 130.81, 123.47], lead: [523.25, 587.33, 659.25, 523.25, 440, 523.25, 659.25, 587.33] }
    ];
    if (this.currentStationIndex === undefined) this.currentStationIndex = 0;

    const currentTrack = this.stations[this.currentStationIndex];

    // Beat interval in ms: 60000ms / BPM
    const beatIntervalMs = Math.round(60000 / currentTrack.bpm);

    this.musicInterval = setInterval(() => {
      if (!this.isMusicEnabled || this.isMuted || !this.ctx) return;
      this.ensureContext();

      const time = this.ctx.currentTime;
      const step = this.musicStep % 8;

      // Bass synth pulse
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = this.currentStationIndex === 1 ? 'sawtooth' : 'triangle';
      bassOsc.frequency.setValueAtTime(currentTrack.bass[step] / 2, time);

      bassGain.gain.setValueAtTime(0.08, time);
      bassGain.gain.exponentialRampToValueAtTime(0.005, time + 0.2);

      const bassFilter = this.ctx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(420, time);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.masterGain);

      bassOsc.start(time);
      bassOsc.stop(time + 0.22);

      // Electronic Rhythm kick/snare
      if (step % 2 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(160, time);
        kickOsc.frequency.exponentialRampToValueAtTime(32, time + 0.12);
        kickGain.gain.setValueAtTime(0.16, time);
        kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

        kickOsc.connect(kickGain);
        kickGain.connect(this.masterGain);
        kickOsc.start(time);
        kickOsc.stop(time + 0.12);
      }

      this.musicStep++;
    }, beatIntervalMs);
  }

  cycleRadioStation() {
    this.stopMusic();
    // Ensure stations list is initialized (it is set inside startMusic, so init if missing)
    if (!this.stations) {
      this.stations = [
        { name: '📻 Synthwave 104.2', bpm: 120, bass: [110, 110, 130.81, 146.83, 110, 110, 98, 123.47], lead: [440, 523.25, 659.25, 587.33, 440, 659.25, 783.99, 659.25] },
        { name: '⚡ Cyber Bass 98.7', bpm: 135, bass: [73.42, 73.42, 82.41, 73.42, 65.41, 65.41, 98, 87.31], lead: [293.66, 329.63, 293.66, 392.00, 293.66, 440.00, 329.63, 293.66] },
        { name: '🌙 Neon Chill 88.5', bpm: 100, bass: [130.81, 130.81, 164.81, 146.83, 110, 110, 130.81, 123.47], lead: [523.25, 587.33, 659.25, 523.25, 440, 523.25, 659.25, 587.33] }
      ];
    }
    if (this.currentStationIndex === undefined) this.currentStationIndex = 0;
    this.currentStationIndex = (this.currentStationIndex + 1) % (this.stations.length + 1);

    if (this.currentStationIndex === this.stations.length) {
      this.isMusicEnabled = false;
      return '📻 Radio Off';
    } else {
      this.isMusicEnabled = true;
      this.startMusic();
      return this.stations[this.currentStationIndex].name;
    }
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  pauseSimulationSounds() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    if (this.windGain && this.ctx) {
      this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  resumeSimulationSounds() {
    if (this.engineGain && this.ctx && !this.isMuted) {
      this.engineGain.gain.setTargetAtTime(0.08, this.ctx.currentTime, 0.05);
    }
  }

  toggleMusic() {
    return this.cycleRadioStation();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

window.soundEngine = new SoundEngine();
