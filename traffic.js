// Dynamic Highway Traffic AI & Vehicle Generator System
class TrafficSystem {
  constructor(scene) {
    this.scene = scene;

    // 4 Highway Lanes (Road width 16.4)
    this.lanes = [-5.7, -1.9, 1.9, 5.7];

    // Traffic vehicle pool
    this.vehicles = [];
    this.maxVehicles = 12;

    // Collision & Near-miss callbacks
    this.onCrashCallback = null;
    this.onNearMissCallback = null;

    // Particle debris group for crashes
    this.debrisParticles = [];
    this.debrisGroup = new THREE.Group();
    this.scene.add(this.debrisGroup);

    // Vehicle types palette
    this.vehicleColors = [
      0x2563eb, // Royal Blue
      0xdc2626, // Crimson Red
      0xf59e0b, // Amber Gold
      0x10b981, // Emerald
      0x64748b, // Slate Grey
      0x0f172a, // Deep Black
      0xf8fafc, // Pearl White
      0x8b5cf6, // Violet
      0xe11d48, // Ruby
      0xd97706  // Orange
    ];

    this.gameMode = 'oneway';
    this.initPool();
  }

  // Set race mode and configure traffic directions
  setMode(mode) {
    this.gameMode = mode || 'oneway';
    this.reset();
  }

  // Pre-generate traffic pool
  initPool() {
    for (let i = 0; i < this.maxVehicles; i++) {
      const type = this.getRandomType();
      const color = this.vehicleColors[Math.floor(Math.random() * this.vehicleColors.length)];
      const vehicle = this.createVehicleMesh(type, color);

      vehicle.type = type;
      vehicle.laneIndex = i % 4;
      vehicle.targetLaneIndex = vehicle.laneIndex;
      vehicle.x = this.lanes[vehicle.laneIndex];
      vehicle.targetX = vehicle.x;
      vehicle.z = -60 - (i * 28) - Math.random() * 20;
      vehicle.speed = this.getBaseSpeedForType(type);
      vehicle.laneChangeTimer = 4 + Math.random() * 8;
      vehicle.isChangingLane = false;
      vehicle.nearMissTriggered = false;
      vehicle.isOncoming = false;
      vehicle.active = true;

      vehicle.mesh.position.set(vehicle.x, 0, vehicle.z);
      this.vehicles.push(vehicle);
      this.scene.add(vehicle.mesh);
    }
  }

  getRandomType() {
    const rand = Math.random();
    if (rand < 0.35) return 'sedan';
    if (rand < 0.55) return 'suv';
    if (rand < 0.72) return 'sports';
    if (rand < 0.88) return 'van';
    return 'truck'; // 18-wheeler semi
  }

  getBaseSpeedForType(type) {
    switch (type) {
      case 'truck': return 65 + Math.random() * 15;
      case 'van': return 75 + Math.random() * 15;
      case 'suv': return 85 + Math.random() * 20;
      case 'sedan': return 90 + Math.random() * 20;
      case 'sports': return 105 + Math.random() * 25;
      default: return 85;
    }
  }

  // Build high-detail procedural 3D traffic vehicles
  createVehicleMesh(type, colorHex) {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.7,
      roughness: 0.3
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      transmission: 0.7,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9
    });

    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });

    let width = 1.8;
    let height = 1.3;
    let length = 4.2;
    const wheels = [];

    if (type === 'sedan') {
      width = 1.8; height = 1.25; length = 4.1;
      // Main Lower Body
      const bodyGeo = new THREE.BoxGeometry(width, 0.45, length);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.42;
      body.castShadow = true;
      group.add(body);

      // Cabin / Roof
      const cabinGeo = new THREE.BoxGeometry(1.6, 0.46, 2.2);
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(0, 0.78, -0.1);
      cabin.castShadow = true;
      group.add(cabin);

      // Roof cover
      const roofGeo = new THREE.BoxGeometry(1.56, 0.05, 1.8);
      const roof = new THREE.Mesh(roofGeo, bodyMat);
      roof.position.set(0, 1.02, -0.1);
      group.add(roof);

    } else if (type === 'sports') {
      width = 1.85; height = 1.15; length = 4.3;
      // Low Sleek Body
      const bodyGeo = new THREE.BoxGeometry(width, 0.38, length);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.36;
      body.castShadow = true;
      group.add(body);

      // Low windshield cabin
      const cabinGeo = new THREE.BoxGeometry(1.55, 0.42, 1.9);
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(0, 0.68, 0.1);
      cabin.castShadow = true;
      group.add(cabin);

      // Rear Racing Wing / Spoiler
      const wingBar = new THREE.BoxGeometry(1.7, 0.06, 0.3);
      const wing = new THREE.Mesh(wingBar, darkMat);
      wing.position.set(0, 0.78, 1.8);
      group.add(wing);

      const standGeo = new THREE.BoxGeometry(0.08, 0.28, 0.15);
      const leftStand = new THREE.Mesh(standGeo, darkMat);
      leftStand.position.set(-0.6, 0.64, 1.8);
      const rightStand = new THREE.Mesh(standGeo, darkMat);
      rightStand.position.set(0.6, 0.64, 1.8);
      group.add(leftStand, rightStand);

    } else if (type === 'suv') {
      width = 1.95; height = 1.55; length = 4.4;
      // Sturdy Boxy Body
      const bodyGeo = new THREE.BoxGeometry(width, 0.6, length);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.55;
      body.castShadow = true;
      group.add(body);

      // High Cabin
      const cabinGeo = new THREE.BoxGeometry(1.75, 0.6, 2.7);
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(0, 1.05, 0.1);
      cabin.castShadow = true;
      group.add(cabin);

      // Roof Rack Rails
      const railGeo = new THREE.BoxGeometry(0.06, 0.06, 2.3);
      const leftRail = new THREE.Mesh(railGeo, darkMat);
      leftRail.position.set(-0.7, 1.38, 0.1);
      const rightRail = new THREE.Mesh(railGeo, darkMat);
      rightRail.position.set(0.7, 1.38, 0.1);
      group.add(leftRail, rightRail);

    } else if (type === 'van') {
      width = 2.0; height = 1.9; length = 5.0;
      // Front Van Cab
      const cabGeo = new THREE.BoxGeometry(width, 0.9, 1.6);
      const cab = new THREE.Mesh(cabGeo, bodyMat);
      cab.position.set(0, 0.75, -1.6);
      cab.castShadow = true;
      group.add(cab);

      // Windshield
      const windGeo = new THREE.BoxGeometry(1.8, 0.5, 0.9);
      const wind = new THREE.Mesh(windGeo, glassMat);
      wind.position.set(0, 1.25, -1.35);
      group.add(wind);

      // Large Cargo Rear Container
      const cargoGeo = new THREE.BoxGeometry(width, 1.35, 3.2);
      const cargoMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
      const cargo = new THREE.Mesh(cargoGeo, cargoMat);
      cargo.position.set(0, 1.05, 0.8);
      cargo.castShadow = true;
      group.add(cargo);

    } else if (type === 'truck') {
      // 18-Wheeler Highway Semi-Trailer
      width = 2.4; height = 3.1; length = 9.8;

      // Semi-Tractor Front Cab
      const tractorMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.8, roughness: 0.2 });
      const cabGeo = new THREE.BoxGeometry(2.3, 1.8, 2.8);
      const cab = new THREE.Mesh(cabGeo, tractorMat);
      cab.position.set(0, 1.3, -3.3);
      cab.castShadow = true;
      group.add(cab);

      // Windshield on Cab
      const windGeo = new THREE.BoxGeometry(2.1, 0.65, 0.8);
      const wind = new THREE.Mesh(windGeo, glassMat);
      wind.position.set(0, 1.7, -4.2);
      group.add(wind);

      // Chrome Vertical Exhaust Stacks
      const stackGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8);
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
      const leftStack = new THREE.Mesh(stackGeo, chromeMat);
      leftStack.position.set(-1.18, 2.0, -2.2);
      const rightStack = new THREE.Mesh(stackGeo, chromeMat);
      rightStack.position.set(1.18, 2.0, -2.2);
      group.add(leftStack, rightStack);

      // Long Articulated Highway Cargo Trailer
      const trailerGeo = new THREE.BoxGeometry(2.36, 2.4, 6.6);
      const trailerMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.3,
        roughness: 0.5
      });
      const trailer = new THREE.Mesh(trailerGeo, trailerMat);
      trailer.position.set(0, 1.75, 1.5);
      trailer.castShadow = true;
      group.add(trailer);
    }

    // Headlights (facing forward, -Z)
    const hlGeo = new THREE.BoxGeometry(0.3, 0.12, 0.05);
    const hlLeft = new THREE.Mesh(hlGeo, headlightMat);
    hlLeft.position.set(-width * 0.36, 0.42, -length * 0.5);
    const hlRight = new THREE.Mesh(hlGeo, headlightMat);
    hlRight.position.set(width * 0.36, 0.42, -length * 0.5);
    group.add(hlLeft, hlRight);

    // Taillights (facing rear, +Z)
    const tlGeo = new THREE.BoxGeometry(0.35, 0.1, 0.05);
    const tlLeft = new THREE.Mesh(tlGeo, taillightMat);
    tlLeft.position.set(-width * 0.36, 0.45, length * 0.5);
    const tlRight = new THREE.Mesh(tlGeo, taillightMat);
    tlRight.position.set(width * 0.36, 0.45, length * 0.5);
    group.add(tlLeft, tlRight);

    // Wheels
    const wheelRadius = type === 'truck' ? 0.45 : 0.32;
    const wheelWidth = type === 'truck' ? 0.32 : 0.22;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });

    const wheelZPositions = type === 'truck'
      ? [-3.8, -2.6, 2.4, 4.0]
      : [-length * 0.32, length * 0.32];

    wheelZPositions.forEach(zPos => {
      const wL = new THREE.Mesh(wheelGeo, wheelMat);
      wL.position.set(-width * 0.5, wheelRadius, zPos);
      wL.castShadow = true;
      group.add(wL);
      wheels.push(wL);

      const wR = new THREE.Mesh(wheelGeo, wheelMat);
      wR.position.set(width * 0.5, wheelRadius, zPos);
      wR.castShadow = true;
      group.add(wR);
      wheels.push(wR);
    });

    return {
      mesh: group,
      wheels: wheels,
      width: width,
      height: height,
      length: length,
      halfWidth: width * 0.48,
      halfLength: length * 0.48
    };
  }

  // Update all traffic AI vehicles, relative scrolling, and collision checks
  update(delta, playerSpeedKmh, player) {
    // Player world translation factor: speed in km/h to units/sec
    const playerSpeedUnits = (playerSpeedKmh / 3.6) * 1.2;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];

      // 1. Longitudinal movement (Relative to player)
      const vehicleSpeedUnits = (v.speed / 3.6) * 1.2;
      let relativeVelocity;

      if (v.isOncoming) {
        // Head-on oncoming traffic: velocities combine towards player (+Z)
        relativeVelocity = playerSpeedUnits + vehicleSpeedUnits;
      } else {
        // Same-direction traffic: relative speed
        relativeVelocity = playerSpeedUnits - vehicleSpeedUnits;
      }

      v.z += relativeVelocity * delta;

      // 2. Lateral lane keeping & smooth lane changing AI
      v.laneChangeTimer -= delta;
      if (v.laneChangeTimer <= 0 && !v.isChangingLane) {
        const canChange = Math.random() < 0.35;
        if (canChange) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          const nextLane = v.laneIndex + dir;

          let laneAllowed = false;
          if (this.gameMode === 'twoway') {
            if (v.isOncoming) {
              // Oncoming cars stay strictly within left lanes (0 and 1)
              laneAllowed = (nextLane >= 0 && nextLane <= 1);
            } else {
              // Forward cars stay strictly within right lanes (2 and 3)
              laneAllowed = (nextLane >= 2 && nextLane <= 3);
            }
          } else {
            // One-way / Time attack: all 4 lanes allowed
            laneAllowed = (nextLane >= 0 && nextLane < this.lanes.length);
          }

          if (laneAllowed && this.isLaneClear(nextLane, v.z, 24)) {
            v.targetLaneIndex = nextLane;
            v.targetX = this.lanes[nextLane];
            v.isChangingLane = true;
          }
        }
        v.laneChangeTimer = 5 + Math.random() * 8;
      }

      // Smooth interpolation towards target lane X
      if (v.isChangingLane) {
        const lateralStep = (v.targetX - v.x) * 3.0 * delta;
        v.x += lateralStep;
        if (Math.abs(v.targetX - v.x) < 0.05) {
          v.x = v.targetX;
          v.laneIndex = v.targetLaneIndex;
          v.isChangingLane = false;
        }
      }

      // Rotate wheels to simulate driving
      const spinSpeed = (v.speed / 3.6) * delta * 4.5;
      v.wheels.forEach(w => {
        w.rotation.x -= spinSpeed;
      });

      // Update mesh position
      v.mesh.position.x = v.x;
      v.mesh.position.z = v.z;

      // 3. Collision Detection with Player
      if (player && this.checkCollision(player, v)) {
        this.triggerCrashDebris(player.x, player.z);
        if (this.onCrashCallback) {
          this.onCrashCallback(v);
        }
      }

      // 4. Near-miss (Close Call) Detection
      if (player && !v.nearMissTriggered && playerSpeedKmh > 70) {
        const dx = Math.abs(player.x - v.x);
        const dz = Math.abs(player.z - v.z);
        const playerHalfWidth = 0.88;
        const playerHalfLength = 2.05;
        const collisionWidth = playerHalfWidth + v.halfWidth;
        const collisionLength = playerHalfLength + v.halfLength;

        // Player is closely alongside without crashing:
        // dx within close threshold and dz overlapping along the car's body length
        if (dx >= collisionWidth && dx <= collisionWidth + 1.4 && dz <= collisionLength + 1.2) {
          v.nearMissTriggered = true;
          if (this.onNearMissCallback) {
            this.onNearMissCallback(v);
          }
        }
      }

      // 5. Recycle vehicle when far behind or far ahead
      if (v.z > 40) {
        this.recycleVehicleAhead(v);
      } else if (!v.isOncoming && v.z < -460) {
        v.z = -140 - Math.random() * 120;
      }
    }

    // Update crash debris explosion particles
    this.updateDebris(delta);
  }

  // Check if lane is clear around a specific Z distance
  isLaneClear(laneIndex, targetZ, safetyMargin) {
    for (let i = 0; i < this.vehicles.length; i++) {
      const other = this.vehicles[i];
      if (other.laneIndex === laneIndex || other.targetLaneIndex === laneIndex) {
        if (Math.abs(other.z - targetZ) < safetyMargin) {
          return false;
        }
      }
    }
    return true;
  }

  // Recycle vehicle to the furthest horizon ahead of player
  recycleVehicleAhead(vehicle) {
    if (this.gameMode === 'twoway') {
      // Half oncoming (lanes 0, 1), half forward (lanes 2, 3)
      const chooseOncoming = Math.random() < 0.5;
      if (chooseOncoming) {
        vehicle.isOncoming = true;
        vehicle.laneIndex = Math.random() < 0.5 ? 0 : 1;
        vehicle.mesh.rotation.y = Math.PI; // Face player
      } else {
        vehicle.isOncoming = false;
        vehicle.laneIndex = Math.random() < 0.5 ? 2 : 3;
        vehicle.mesh.rotation.y = 0; // Face forward
      }
    } else {
      vehicle.isOncoming = false;
      vehicle.laneIndex = Math.floor(Math.random() * this.lanes.length);
      vehicle.mesh.rotation.y = 0;
    }

    // Find min Z among vehicles in similar stream
    let furthestZ = -140;
    for (let i = 0; i < this.vehicles.length; i++) {
      if (this.vehicles[i].isOncoming === vehicle.isOncoming && this.vehicles[i].z < furthestZ) {
        furthestZ = this.vehicles[i].z;
      }
    }

    vehicle.targetLaneIndex = vehicle.laneIndex;
    vehicle.x = this.lanes[vehicle.laneIndex];
    vehicle.targetX = vehicle.x;
    // Oncoming spawns further away because combined speed approaches faster
    const spawnPadding = vehicle.isOncoming ? (160 + Math.random() * 100) : (40 + Math.random() * 45);
    vehicle.z = Math.min(furthestZ - spawnPadding, -180 - Math.random() * 80);
    vehicle.speed = this.getBaseSpeedForType(vehicle.type);
    vehicle.isChangingLane = false;
    vehicle.nearMissTriggered = false;
    vehicle.laneChangeTimer = 4 + Math.random() * 8;

    vehicle.mesh.position.set(vehicle.x, 0, vehicle.z);
  }

  // Accurate 2D AABB Box Collision Check
  checkCollision(player, vehicle) {
    const playerHalfWidth = 0.88; // 1.76m width
    const playerHalfLength = 2.05; // 4.1m length

    const dx = Math.abs(player.x - vehicle.x);
    const dz = Math.abs(player.z - vehicle.z);

    const collisionX = dx < (playerHalfWidth + vehicle.halfWidth);
    const collisionZ = dz < (playerHalfLength + vehicle.halfLength);

    return collisionX && collisionZ;
  }

  // Explosive Crash Debris Effect
  triggerCrashDebris(x, z) {
    const debrisCount = 35;
    const particleGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    for (let i = 0; i < debrisCount; i++) {
      const mat = i % 3 === 0 ? sparkMat : (i % 3 === 1 ? metalMat : redMat);
      const piece = new THREE.Mesh(particleGeo, mat);
      piece.position.set(
        x + (Math.random() - 0.5) * 1.5,
        0.5 + Math.random() * 1.2,
        z + (Math.random() - 0.5) * 2.0
      );

      // Random explosive velocity vectors
      piece.userData = {
        vx: (Math.random() - 0.5) * 18,
        vy: 4 + Math.random() * 12,
        vz: (Math.random() - 0.5) * 18,
        rotX: (Math.random() - 0.5) * 15,
        rotY: (Math.random() - 0.5) * 15,
        rotZ: (Math.random() - 0.5) * 15,
        life: 1.5
      };

      this.debrisParticles.push(piece);
      this.debrisGroup.add(piece);
    }
  }

  updateDebris(delta) {
    for (let i = this.debrisParticles.length - 1; i >= 0; i--) {
      const p = this.debrisParticles[i];
      p.userData.life -= delta;

      p.position.x += p.userData.vx * delta;
      p.position.y += p.userData.vy * delta;
      p.position.z += p.userData.vz * delta;

      p.userData.vy -= 25 * delta; // Gravity

      // Floor bounce
      if (p.position.y < 0.1) {
        p.position.y = 0.1;
        p.userData.vy = -p.userData.vy * 0.45;
        p.userData.vx *= 0.7;
        p.userData.vz *= 0.7;
      }

      p.rotation.x += p.userData.rotX * delta;
      p.rotation.y += p.userData.rotY * delta;
      p.rotation.z += p.userData.rotZ * delta;

      if (p.userData.life <= 0) {
        this.debrisGroup.remove(p);
        this.debrisParticles.splice(i, 1);
      }
    }
  }

  // Reset traffic for new race
  reset() {
    // Clear debris
    this.debrisParticles.forEach(p => this.debrisGroup.remove(p));
    this.debrisParticles = [];

    // Respawn vehicles with mode layout
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];

      if (this.gameMode === 'twoway') {
        const isOncoming = (i % 2 === 0);
        v.isOncoming = isOncoming;

        if (isOncoming) {
          // Oncoming lanes: 0 (-5.7) or 1 (-1.9)
          v.laneIndex = (i % 4 === 0) ? 0 : 1;
          v.mesh.rotation.y = Math.PI; // Face towards player (+Z)
          // Oncoming vehicles start further down the highway
          v.z = -120 - (i * 38) - Math.random() * 30;
        } else {
          // Forward lanes: 2 (1.9) or 3 (5.7)
          v.laneIndex = (i % 4 === 2) ? 2 : 3;
          v.mesh.rotation.y = 0; // Face away (-Z)
          v.z = -70 - (i * 28) - Math.random() * 20;
        }
      } else {
        // One-Way / Time Attack mode: all vehicles drive forward
        v.isOncoming = false;
        v.laneIndex = i % 4;
        v.mesh.rotation.y = 0;
        v.z = -70 - (i * 30) - Math.random() * 20;
      }

      v.targetLaneIndex = v.laneIndex;
      v.x = this.lanes[v.laneIndex];
      v.targetX = v.x;
      v.speed = this.getBaseSpeedForType(v.type);
      v.isChangingLane = false;
      v.nearMissTriggered = false;
      v.laneChangeTimer = 3 + Math.random() * 8;
      v.mesh.position.set(v.x, 0, v.z);
    }
  }
}
