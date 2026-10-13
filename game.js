// Professional Highway Horizon 3D - Motorsport Engine & Master Controller
class HighwayGame {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.state = 'MENU'; // 'MENU' | 'PLAYING' | 'PAUSED' | 'CRASHED'
    this.gameMode = 'oneway'; // 'oneway' | 'twoway' | 'timeattack'

    // Core Metrics
    this.score = 0;
    this.distance = 0; // meters
    this.maxSpeedAchieved = 0;
    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.comboDecayTimer = 0;
    this.comboTimer = null;
    this.bestScore = parseInt(localStorage.getItem('hh_best_score') || '0', 10);

    // Time Attack Mode
    this.timeRemaining = 60.0;
    this.lastCheckpointDist = 0;

    // Speed Trap Radar
    this.lastSpeedTrapDist = 0;

    // Camera Modes
    this.cameraModes = [
      { name: 'Chase', height: 3.5, dist: 7.2, pitch: -0.12, fov: 62 },
      { name: 'Close', height: 2.5, dist: 5.6, pitch: -0.08, fov: 65 },
      { name: 'Hood', height: 1.25, dist: 0.2, pitch: 0.02, fov: 72 },
      { name: 'Drone', height: 11.0, dist: 14.0, pitch: -0.55, fov: 58 }
    ];
    this.camIndex = 0;
    this.camShake = 0;

    // Inputs
    this.input = {
      gas: false,
      brake: false,
      left: false,
      right: false,
      nitro: false
    };
    this.prevGas = false;

    // Selected vehicle & livery
    this.selectedCarModel = 'inferno';
    this.selectedColor = 0xe62020;

    // Initialize core Three.js & game systems
    this.initThree();
    this.initSystems();
    this.initInputListeners();
    this.initUI();

    // Start Main Render & Animation Loop
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // High-Fidelity WebGL Renderer
  initThree() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  initSystems() {
    this.sound = window.soundEngine;
    this.environment = new EnvironmentSystem(this.scene, this.renderer);
    this.player = new PlayerCar(this.scene, this.selectedColor);
    this.traffic = new TrafficSystem(this.scene);

    this.traffic.onCrashCallback = (vehicle) => this.onCrash(vehicle);
    this.traffic.onNearMissCallback = (vehicle) => this.onNearMiss(vehicle);

    this.camera.position.set(0, 3.5, 7.5);
    this.camera.lookAt(0, 1.2, 0);
  }

  initInputListeners() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();

      // Pause toggle (ESC)
      if (key === 'escape') {
        e.preventDefault();
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED') this.resumeGame();
        return;
      }

      // Prevent scroll & unwanted page shift for gaming keys
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key) || e.code === 'Space') {
        e.preventDefault();
      }

      if (key === 'arrowup')    this.input.gas   = true;
      if (key === 'arrowdown')  this.input.brake = true;
      if (key === 'arrowleft')  this.input.left  = true;
      if (key === 'arrowright') this.input.right = true;
      if (key === ' ' || e.code === 'Space') this.input.brake = true;

      if (key === 'shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (!this.input.nitro && this.player.nitroFuel > 5 && this.state === 'PLAYING') {
          this.sound.playNitroSound();
        }
        this.input.nitro = true;
      }

      if (key === 'h') this.sound.playHorn();
      if (key === 'c') this.toggleCamera();
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();

      if (key === 'arrowup') {
        if (this.player.speed > 110) this.sound.playTurboBlowoff();
        this.input.gas = false;
      }
      if (key === 'arrowdown') this.input.brake = false;
      if (key === 'arrowleft')  this.input.left  = false;
      if (key === 'arrowright') this.input.right = false;
      if (key === ' ' || e.code === 'Space') this.input.brake = false;
      if (key === 'shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.input.nitro = false;
    });

    // Clear stuck inputs if player alt-tabs or window loses focus
    window.addEventListener('blur', () => this.clearInputs());

    // Bind on-screen gamepad buttons (work on mouse AND touch)
    this.bindControlButton('touch-left', 'left');
    this.bindControlButton('touch-right', 'right');
    this.bindControlButton('touch-gas', 'gas');
    this.bindControlButton('touch-brake', 'brake');
    this.bindControlButton('touch-nitro', 'nitro');
  }

  // Universal button binding — mousedown+touchstart for held input, visual feedback
  bindControlButton(id, prop) {
    const el = document.getElementById(id);
    if (!el) return;

    const press = (e) => {
      e.preventDefault();
      this.input[prop] = true;
      el.classList.add('pressed');
      if (prop === 'nitro' && !this.input.nitro && this.player.nitroFuel > 5 && this.state === 'PLAYING') {
        this.sound.playNitroSound();
      }
    };
    const release = (e) => {
      e.preventDefault();
      this.input[prop] = false;
      el.classList.remove('pressed');
      if (prop === 'gas' && this.player.speed > 110) {
        this.sound.playTurboBlowoff();
      }
    };

    el.addEventListener('mousedown', press);
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', release);
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('touchcancel', () => { this.input[prop] = false; el.classList.remove('pressed'); });
  }

  clearInputs() {
    this.input.gas = false;
    this.input.brake = false;
    this.input.left = false;
    this.input.right = false;
    this.input.nitro = false;
  }

  initUI() {
    // Best score display
    const bestValEl = document.getElementById('best-val');
    if (bestValEl) bestValEl.textContent = this.bestScore.toLocaleString();

    // Start Button
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', () => this.startGame());

    // Restart Buttons
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.addEventListener('click', () => this.restartGame());

    const pauseRestartBtn = document.getElementById('pause-restart-btn');
    if (pauseRestartBtn) pauseRestartBtn.addEventListener('click', () => this.restartGame());

    // Pause & Resume Buttons
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.pauseGame());

    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) resumeBtn.addEventListener('click', () => this.resumeGame());

    // Garage menu buttons from Pause / Game Over
    const garageMenuBtn = document.getElementById('garage-menu-btn');
    if (garageMenuBtn) garageMenuBtn.addEventListener('click', () => this.openGarageMenu());

    const goGarageBtn = document.getElementById('gameover-garage-btn');
    if (goGarageBtn) goGarageBtn.addEventListener('click', () => this.openGarageMenu());

    // Game Mode Tabs
    const modeTabs = document.querySelectorAll('.mode-tab');
    modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        modeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.gameMode = tab.getAttribute('data-mode') || 'oneway';
        this.traffic.setMode(this.gameMode);

        const timerCard = document.getElementById('time-attack-card');
        if (timerCard) {
          timerCard.classList.toggle('hidden', this.gameMode !== 'timeattack');
        }
      });
    });

    // Supercar Selection Cards
    const carCards = document.querySelectorAll('.car-card');
    carCards.forEach(card => {
      card.addEventListener('click', () => {
        carCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const carKey = card.getAttribute('data-car');
        if (carKey) {
          this.selectedCarModel = carKey;
          this.player.setCarModel(carKey);
        }
      });
    });

    // Car Color Palette Chips
    const colorChips = document.querySelectorAll('.color-chip');
    colorChips.forEach(chip => {
      chip.addEventListener('click', () => {
        colorChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const hex = chip.getAttribute('data-color');
        if (hex) {
          this.selectedColor = parseInt(hex.replace('#', '0x'), 16);
          this.player.setColor(this.selectedColor);
        }
      });
    });

    // Camera Toggle Button
    const camBtn = document.getElementById('cam-toggle-btn');
    if (camBtn) camBtn.addEventListener('click', () => this.toggleCamera());

    // Audio Toggle Button (Cycles radio stations)
    const audioBtn = document.getElementById('audio-toggle-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const stationName = this.sound.toggleMusic();
        audioBtn.textContent = stationName;
      });
    }

    // Horn Button
    const hornBtn = document.getElementById('horn-btn');
    if (hornBtn) hornBtn.addEventListener('click', () => this.sound.playHorn());

    // Weather Preset Buttons
    const envBtns = [
      { id: 'env-sunny-btn', type: 'sunny' },
      { id: 'env-sunset-btn', type: 'sunset' },
      { id: 'env-rain-btn', type: 'rain' },
      { id: 'env-night-btn', type: 'night' }
    ];

    envBtns.forEach(b => {
      const btnEl = document.getElementById(b.id);
      if (btnEl) {
        btnEl.addEventListener('click', () => {
          envBtns.forEach(o => {
            const el = document.getElementById(o.id);
            if (el) el.classList.remove('active');
          });
          btnEl.classList.add('active');
          this.environment.setPreset(b.type);
        });
      }
    });
  }

  toggleCamera() {
    this.camIndex = (this.camIndex + 1) % this.cameraModes.length;
    const mode = this.cameraModes[this.camIndex];
    const nameEl = document.getElementById('cam-name');
    if (nameEl) nameEl.textContent = mode.name;
  }

  startGame() {
    this.sound.init();
    this.sound.ensureContext();

    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.remove('active');

    this.traffic.setMode(this.gameMode);
    this.resetStats();
    this.state = 'PLAYING';
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.sound.pauseSimulationSounds();
    this.clearInputs();

    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal) pauseModal.classList.add('active');

    const pSpeed = document.getElementById('pause-speed');
    const pDist = document.getElementById('pause-dist');
    const pScore = document.getElementById('pause-score');

    if (pSpeed) pSpeed.textContent = `${Math.floor(this.player.speed)} km/h`;
    if (pDist) pDist.textContent = `${Math.floor(this.distance).toLocaleString()} m`;
    if (pScore) pScore.textContent = Math.floor(this.score).toLocaleString();
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal) pauseModal.classList.remove('active');
    this.sound.resumeSimulationSounds();
    this.state = 'PLAYING';
  }

  openGarageMenu() {
    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal) pauseModal.classList.remove('active');

    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.classList.remove('active');

    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('active');

    this.state = 'MENU';
    this.resetCarToPaddock();
  }

  restartGame() {
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.classList.remove('active');

    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal) pauseModal.classList.remove('active');

    this.resetCarToPaddock();
    this.traffic.setMode(this.gameMode);
    this.resetStats();
    this.sound.resumeSimulationSounds();
    this.state = 'PLAYING';
  }

  resetCarToPaddock() {
    this.player.reset();
    this.traffic.reset();
  }

  showPickupBanner(title, points) {
    const banner = document.getElementById('combo-banner');
    const titleEl = document.getElementById('combo-title');
    const pointsEl = document.getElementById('combo-points');

    if (banner && titleEl && pointsEl) {
      titleEl.textContent = title;
      pointsEl.textContent = points > 0 ? `+${points.toLocaleString()} PTS` : 'BOOST ACTIVE';
      banner.classList.add('show');

      if (this.comboTimer) clearTimeout(this.comboTimer);
      this.comboTimer = setTimeout(() => {
        banner.classList.remove('show');
      }, 1000);
    }
  }

  resetStats() {
    this.score = 0;
    this.distance = 0;
    this.maxSpeedAchieved = 0;
    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.comboDecayTimer = 0;
    this.camShake = 0;
    this.timeRemaining = 60.0;
    this.lastCheckpointDist = 0;
    this.lastSpeedTrapDist = 0;

    const timerCard = document.getElementById('time-attack-card');
    if (timerCard) {
      timerCard.classList.toggle('hidden', this.gameMode !== 'timeattack');
      timerCard.classList.remove('urgent');
    }
  }

  onNearMiss(vehicle) {
    if (this.state !== 'PLAYING') return;

    this.comboCount++;
    this.comboMultiplier = Math.min(5, 1 + Math.floor(this.comboCount / 2));
    this.comboDecayTimer = 7.0; // 7 seconds to keep streak alive

    // Two-Way oncoming bonus multiplier
    const oncomingBonus = (this.gameMode === 'twoway' && vehicle.isOncoming) ? 2.5 : 1.0;
    const pointsAwarded = Math.round(250 * this.comboMultiplier * oncomingBonus);
    this.score += pointsAwarded;

    this.sound.playCloseCall();
    this.camShake = 0.16;

    // Display banner
    const banner = document.getElementById('combo-banner');
    const titleEl = document.getElementById('combo-title');
    const pointsEl = document.getElementById('combo-points');

    if (banner && titleEl && pointsEl) {
      const titlePrefix = oncomingBonus > 1 ? '⚠️ HEAD-ON CLOSE CALL!' : (this.comboCount > 1 ? `COMBO x${this.comboMultiplier}!` : 'CLOSE CALL!');
      titleEl.textContent = titlePrefix;
      pointsEl.textContent = `+${pointsAwarded.toLocaleString()} PTS`;
      banner.classList.add('show');

      if (this.comboTimer) clearTimeout(this.comboTimer);
      this.comboTimer = setTimeout(() => {
        banner.classList.remove('show');
      }, 1200);
    }
  }

  onCrash(vehicle) {
    if (this.state !== 'PLAYING') return;

    // Titan Shield ability: knock small car away once
    if (this.player.hasShield && vehicle.type !== 'truck') {
      this.player.hasShield = false; // consume shield
      vehicle.speed = -40; // send traffic flying forward
      this.camShake = 0.5;
      this.player.speed *= 0.7;
      this.sound.playCrash();
      return;
    }

    this.state = 'CRASHED';
    this.sound.playCrash();
    this.camShake = 1.0;
    this.player.speed = 0;

    setTimeout(() => {
      this.showGameOverModal('WRECKED ON HIGHWAY');
    }, 1100);
  }

  // Triggered when time runs out in Time Attack
  onTimeExpired() {
    this.state = 'CRASHED';
    this.sound.playHorn();
    this.showGameOverModal('TIME EXPIRED - RUN FINISHED');
  }

  showGameOverModal(title = 'WRECKED ON HIGHWAY') {
    const gameOverScreen = document.getElementById('game-over-screen');
    if (!gameOverScreen) return;

    const crashTitleEl = document.querySelector('.crash-title');
    if (crashTitleEl) crashTitleEl.textContent = title;

    const finalScoreEl = document.getElementById('final-score');
    const finalDistEl = document.getElementById('final-dist');
    const finalSpeedEl = document.getElementById('final-speed');
    const finalCombosEl = document.getElementById('final-combos');
    const recordTagEl = document.getElementById('new-record-tag');

    if (finalScoreEl) finalScoreEl.textContent = Math.floor(this.score).toLocaleString();
    if (finalDistEl) finalDistEl.textContent = `${Math.floor(this.distance).toLocaleString()} m`;
    if (finalSpeedEl) finalSpeedEl.textContent = `${Math.floor(this.maxSpeedAchieved)} km/h`;
    if (finalCombosEl) finalCombosEl.textContent = this.comboCount;

    if (this.score > this.bestScore) {
      this.bestScore = Math.floor(this.score);
      localStorage.setItem('hh_best_score', this.bestScore.toString());
      if (recordTagEl) recordTagEl.classList.remove('hidden');

      const bestValEl = document.getElementById('best-val');
      if (bestValEl) bestValEl.textContent = this.bestScore.toLocaleString();
    } else {
      if (recordTagEl) recordTagEl.classList.add('hidden');
    }

    gameOverScreen.classList.add('active');
  }

  // Speed Trap Radar Trigger
  triggerSpeedTrap() {
    const speed = Math.floor(this.player.speed);
    if (speed < 150) return;

    this.sound.playSpeedCamera();

    // Camera flash effect
    const flashEl = document.getElementById('camera-flash-overlay');
    if (flashEl) {
      flashEl.classList.add('active');
      setTimeout(() => flashEl.classList.remove('active'), 100);
    }

    // Bonus points
    const bonus = 1000 + Math.round((speed - 150) * 20);
    this.score += bonus;

    // Show speed trap banner
    const trapBanner = document.getElementById('speed-trap-banner');
    const trapText = document.getElementById('trap-speed-text');
    if (trapBanner && trapText) {
      trapText.textContent = `RADAR CLOCKED: ${speed} KM/H!`;
      trapBanner.classList.add('show');
      setTimeout(() => trapBanner.classList.remove('show'), 1600);
    }
  }

  // Checkpoint Passed in Time Attack
  triggerCheckpoint() {
    this.timeRemaining += 15.0; // Bonus 15 seconds
    this.sound.playCheckpoint();

    const banner = document.getElementById('combo-banner');
    const titleEl = document.getElementById('combo-title');
    const pointsEl = document.getElementById('combo-points');

    if (banner && titleEl && pointsEl) {
      titleEl.textContent = 'CHECKPOINT REACHED! ⏱️';
      pointsEl.textContent = '+15.0 SECONDS BONUS';
      banner.classList.add('show');
      setTimeout(() => banner.classList.remove('show'), 1400);
    }
  }

  updateCamera(delta) {
    const mode = this.cameraModes[this.camIndex];
    const speedRatio = this.player.speed / this.player.maxNormalSpeed;

    const targetFov = mode.fov + (this.player.isNitro ? 14 : speedRatio * 8);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 5);
    this.camera.updateProjectionMatrix();

    if (this.camShake > 0) {
      this.camShake = Math.max(0, this.camShake - delta * 2.5);
    }
    const shakeX = (Math.random() - 0.5) * this.camShake;
    const shakeY = (Math.random() - 0.5) * this.camShake;

    if (mode.name === 'Hood') {
      this.camera.position.x = this.player.x + shakeX;
      this.camera.position.y = this.player.y + mode.height + shakeY;
      this.camera.position.z = this.player.z - mode.dist;
      this.camera.rotation.set(mode.pitch, 0, this.player.tiltAngle * 0.4);

    } else if (mode.name === 'Drone') {
      const targetX = this.player.x * 0.4;
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX + shakeX, delta * 6);
      this.camera.position.y = mode.height + shakeY;
      this.camera.position.z = this.player.z + mode.dist;
      this.camera.lookAt(this.player.x, 1, this.player.z - 20);

    } else {
      const targetX = this.player.x * 0.65;
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX + shakeX, delta * 10);
      this.camera.position.y = mode.height + (speedRatio * 0.25) + shakeY;
      this.camera.position.z = this.player.z + mode.dist + (this.player.isNitro ? 0.8 : 0);

      const lookTarget = new THREE.Vector3(
        this.player.x * 0.8,
        1.1,
        this.player.z - 18
      );
      this.camera.lookAt(lookTarget);
      this.camera.rotation.z = this.player.tiltAngle * 0.25;
    }
  }

  updateHUD(delta) {
    const speed = Math.floor(this.player.speed);
    const speedRatio = Math.min(1.0, Math.max(0, speed / 270));

    // 1. Digital Speedometer text
    const speedEl = document.getElementById('speed-num');
    if (speedEl) speedEl.textContent = speed;

    // 2. Dynamic Sweeping Fill Arc
    const arcEl = document.getElementById('speed-indicator-arc');
    if (arcEl) {
      const dashOffset = 350 - (speedRatio * 350);
      arcEl.style.strokeDashoffset = dashOffset;
    }

    // 3. Sweeping Laser Needle (-125deg to +125deg)
    const needleGroup = document.getElementById('speed-needle-group');
    if (needleGroup) {
      const needleAngle = -125 + (speedRatio * 250);
      needleGroup.style.transform = `rotate(${needleAngle.toFixed(1)}deg)`;
    }

    // 4. Dynamic Gear Indicator & Shift Animation
    const gearEl = document.getElementById('gear-val');
    let g = 1;
    let gearMin = 0;
    let gearMax = 28;
    if (speed > 210)      { g = 6; gearMin = 210; gearMax = 270; }
    else if (speed > 165) { g = 5; gearMin = 165; gearMax = 210; }
    else if (speed > 115) { g = 4; gearMin = 115; gearMax = 165; }
    else if (speed > 68)  { g = 3; gearMin = 68;  gearMax = 115; }
    else if (speed > 28)  { g = 2; gearMin = 28;  gearMax = 68;  }

    if (gearEl) {
      if (this.lastHudGear !== undefined && this.lastHudGear !== g) {
        gearEl.classList.remove('shift-anim');
        void gearEl.offsetWidth; // force reflow for animation restart
        gearEl.classList.add('shift-anim');
      }
      this.lastHudGear = g;
      gearEl.textContent = g;
    }

    // 5. Engine RPM Simulation & Segmented Tacho Meter
    const gearRatio = Math.max(0, Math.min(1, (speed - gearMin) / (gearMax - gearMin || 1)));
    const rpm = 1.2 + (gearRatio * 6.8) + (this.player.isNitro ? 0.6 : 0);
    const rpmTextEl = document.getElementById('rpm-val-text');
    if (rpmTextEl) rpmTextEl.textContent = `${rpm.toFixed(1)}K`;

    const activeSegs = Math.min(12, Math.max(1, Math.round((rpm / 8.5) * 12)));
    const segElements = document.querySelectorAll('#rpm-segments .rpm-seg');
    if (segElements.length) {
      segElements.forEach((seg, idx) => {
        seg.classList.toggle('active', idx < activeSegs);
      });
    }

    // 6. Drive Mode Tag & Redline / Nitro Visual Alerts
    const clusterEl = document.getElementById('speedometer-cluster');
    const modeTagEl = document.getElementById('drive-mode-tag');
    const isNitroActive = this.player.isNitro && speed > 50;
    const isRedline = speed >= 185;

    if (clusterEl) {
      clusterEl.classList.toggle('speedo-nitro', isNitroActive);
      clusterEl.classList.toggle('speedo-redline', !isNitroActive && isRedline);
    }

    if (modeTagEl) {
      if (isNitroActive) {
        modeTagEl.textContent = 'HYPER BOOST';
        modeTagEl.classList.add('mode-hyper');
      } else if (isRedline) {
        modeTagEl.textContent = 'MAX ATTACK';
        modeTagEl.classList.remove('mode-hyper');
      } else if (speed > 110) {
        modeTagEl.textContent = 'SPORT+';
        modeTagEl.classList.remove('mode-hyper');
      } else {
        modeTagEl.textContent = 'SPORT';
        modeTagEl.classList.remove('mode-hyper');
      }
    }

    // Nitro Bar & Label
    const nitroFillEl = document.getElementById('nitro-bar-fill');
    const nitroTextEl = document.getElementById('nitro-percent');
    if (nitroFillEl) nitroFillEl.style.width = `${Math.floor(this.player.nitroFuel)}%`;
    if (nitroTextEl) nitroTextEl.textContent = `${Math.floor(this.player.nitroFuel)}%`;

    // Speed Lines Overlay for NOS
    const speedLinesEl = document.getElementById('speed-overlay');
    if (speedLinesEl) {
      speedLinesEl.classList.toggle('active', this.player.isNitro && speed > 90);
    }

    // Distance and Live Score
    const distEl = document.getElementById('dist-val');
    if (distEl) distEl.innerHTML = `${Math.floor(this.distance).toLocaleString()} <small>m</small>`;

    const scoreEl = document.getElementById('score-val');
    if (scoreEl) scoreEl.textContent = Math.floor(this.score).toLocaleString();

    // Multiplier Card
    const multEl = document.getElementById('mult-val');
    if (multEl) multEl.textContent = `x${this.comboMultiplier}`;

    // Two-Way Oncoming Lane Danger Badge
    const oncomingBadge = document.getElementById('oncoming-warning');
    if (oncomingBadge) {
      if (this.gameMode === 'twoway' && this.player.x < 0) {
        oncomingBadge.classList.remove('hidden');
      } else {
        oncomingBadge.classList.add('hidden');
      }
    }

    // Time Attack Clock
    if (this.gameMode === 'timeattack') {
      const timerValEl = document.getElementById('timer-val');
      const timerCard = document.getElementById('time-attack-card');
      if (timerValEl) {
        timerValEl.innerHTML = `${Math.max(0, this.timeRemaining).toFixed(1)} <small>s</small>`;
      }
      if (timerCard) {
        timerCard.classList.toggle('urgent', this.timeRemaining <= 10.0);
      }
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.state === 'PLAYING') {
      // 1. Update Player Physics
      this.player.update(delta, this.input);

      if (this.player.speed > this.maxSpeedAchieved) {
        this.maxSpeedAchieved = this.player.speed;
      }

      // 2. Accumulate Distance & Score
      const speedMps = this.player.speed / 3.6;
      this.distance += speedMps * delta;

      // Distance score bonus (enhanced in oncoming lane)
      const laneMultiplier = (this.gameMode === 'twoway' && this.player.x < 0) ? 2.0 : 1.0;
      const speedScoreFactor = (this.player.speed / 100) * this.comboMultiplier * laneMultiplier;
      this.score += (speedMps * speedScoreFactor) * delta * 10;

      // 3. Time Attack Timer Countdown & Checkpoint System
      if (this.gameMode === 'timeattack') {
        this.timeRemaining -= delta;
        if (this.timeRemaining <= 0) {
          this.onTimeExpired();
          return;
        }

        // Checkpoint every 1000m
        if (this.distance - this.lastCheckpointDist >= 1000) {
          this.lastCheckpointDist = this.distance;
          this.triggerCheckpoint();
        }
      }

      // 4. Speed Trap Radar checks every 1,200m (only when moving)
      if (this.player.speed > 20 && this.distance - this.lastSpeedTrapDist >= 1200) {
        this.lastSpeedTrapDist = this.distance;
        this.triggerSpeedTrap();
      }

      // 5. Combo streak decay
      if (this.comboDecayTimer > 0) {
        this.comboDecayTimer -= delta;
        if (this.comboDecayTimer <= 0) {
          this.comboMultiplier = 1;
          this.comboCount = 0;
        }
      }

      // 6. Sound Engine Updates (V8 multi-layer system)
      this.sound.updateEngine(this.player.speed, this.player.maxNormalSpeed, this.player.isNitro);

      // Brake squeal — fire once per hard-brake press above 60 km/h
      const hardBraking = this.player.isBraking && this.player.speed > 60;
      if (hardBraking && !this._wasBraking) {
        this.sound.playBrakeSqueal();
      }
      this._wasBraking = hardBraking;

      // Tire skid at random intervals while braking fast
      if (hardBraking && Math.random() < 0.06) this.sound.playTireSkid();

      // 7. Scenery, Traffic & Pickup Collection
      this.environment.update(delta, this.player.speed);
      this.traffic.update(delta, this.player.speed, this.player);

      // Pickup collision: coins & NOS canisters
      this.environment.checkPickups(this.player, (mesh) => {
        if (mesh.itemType === 'coin') {
          const pts = Math.round(500 * this.comboMultiplier);
          this.score += pts;
          this.sound.playCoinPickup();
          this.showPickupBanner('⭐ COIN COLLECTED!', pts);
        } else if (mesh.itemType === 'nos') {
          this.player.nitroFuel = Math.min(100, this.player.nitroFuel + 50);
          this.sound.playNosPickup();
          this.showPickupBanner('🚀 NOS REFUEL!', 0);
        }
      });

      // 8. Camera & HUD
      this.updateCamera(delta);
      this.updateHUD(delta);

    } else if (this.state === 'MENU') {
      // 360 Showroom Orbit Camera around the selected supercar
      const time = this.clock.getElapsedTime();
      this.camera.position.x = Math.sin(time * 0.45) * 6.5;
      this.camera.position.z = Math.cos(time * 0.45) * 6.5;
      this.camera.position.y = 2.2 + Math.sin(time * 0.6) * 0.4;
      this.camera.lookAt(0, 0.7, 0);

      this.environment.update(delta, 8);

    } else if (this.state === 'CRASHED') {
      this.player.mesh.rotation.y += delta * 7;
      this.player.mesh.position.y = Math.max(0.3, this.player.y + Math.sin(this.clock.getElapsedTime() * 10) * 0.2);

      this.traffic.update(delta, 0, null);
      this.environment.update(delta, 0);
      this.updateCamera(delta);
      this.sound.updateEngine(0, this.player.maxNormalSpeed, false);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.highwayGame = new HighwayGame();
});
