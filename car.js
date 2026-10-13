// Professional 3D Supercar Vehicle Builder, Custom Showroom Models & Physics
class PlayerCar {
  constructor(scene, colorHex = 0xe62020) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.carColor = colorHex;
    this.carModel = 'inferno'; // 'inferno' | 'cyber' | 'venom' | 'titan'

    // Car Model Specs Database
    this.specs = {
      inferno: {
        name: 'Inferno GT',
        maxNormalSpeed: 170,
        maxNitroSpeed: 235,
        acceleration: 75,
        braking: 95,
        handling: 14,
        flameColor: 0x00f0ff,
        shield: false
      },
      cyber: {
        name: 'Cyber Phantom',
        maxNormalSpeed: 185,
        maxNitroSpeed: 255,
        acceleration: 90,
        braking: 105,
        handling: 16.5,
        flameColor: 0x00ffff,
        shield: false
      },
      venom: {
        name: 'Viper Venom',
        maxNormalSpeed: 195,
        maxNitroSpeed: 265,
        acceleration: 82,
        braking: 90,
        handling: 13.5,
        flameColor: 0xff6600,
        shield: false
      },
      titan: {
        name: 'Apex Titan',
        maxNormalSpeed: 175,
        maxNitroSpeed: 245,
        acceleration: 80,
        braking: 115,
        handling: 15,
        flameColor: 0xa855f7,
        shield: true
      }
    };

    // Movement & Physics properties
    this.x = 0;
    this.y = 0.35;
    this.z = 0;
    this.speed = 0;
    this.applySpecs('inferno');

    this.friction = 24;
    this.tiltAngle = 0;
    this.steerAngle = 0;
    this.lateralVelocity = 0; // momentum-based lateral speed (m/s)
    this.isBraking = false;
    this.isNitro = false;
    this.nitroFuel = 100;
    this.nitroRegenRate = 12; // % per second
    this.nitroBurnRate = 35;  // % per second

    // Lighting and materials
    this.headlights = [];
    this.brakeLights = [];
    this.wheels = [];
    this.frontWheels = [];
    this.exhaustFlames = [];

    // Tire Smoke Particles
    this.smokeParticles = [];
    this.smokeGroup = new THREE.Group();
    this.scene.add(this.smokeGroup);

    // Nitro Road Illumination Point Light
    this.nitroLight = new THREE.PointLight(0x00f0ff, 0, 15);
    this.nitroLight.position.set(0, 0.5, 2.5);
    this.mesh.add(this.nitroLight);

    this.buildCar();
    this.scene.add(this.mesh);
  }

  applySpecs(modelKey) {
    this.carModel = modelKey;
    const spec = this.specs[modelKey] || this.specs.inferno;
    this.maxNormalSpeed = spec.maxNormalSpeed;
    this.maxNitroSpeed = spec.maxNitroSpeed;
    this.maxSpeed = this.maxNormalSpeed;
    this.acceleration = spec.acceleration;
    this.braking = spec.braking;
    this.handling = spec.handling;
    this.hasShield = spec.shield;
  }

  setCarModel(modelKey) {
    this.applySpecs(modelKey);

    // Remove existing car sub-meshes except light
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }
    this.mesh.add(this.nitroLight);

    this.wheels = [];
    this.frontWheels = [];
    this.exhaustFlames = [];

    this.buildCar();
  }

  setColor(hex) {
    this.carColor = hex;
    if (this.bodyMaterial) {
      this.bodyMaterial.color.set(hex);
    }
  }

  buildCar() {
    // 1. High gloss metallic body paint
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.carColor,
      metalness: 0.88,
      roughness: 0.18,
      envMapIntensity: 1.3
    });

    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.5,
      metalness: 0.5
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a101f,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.82,
      transparent: true,
      opacity: 0.95
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.96,
      roughness: 0.08
    });

    // Lower Chassis
    const baseGeo = new THREE.BoxGeometry(1.82, 0.35, 4.4);
    const baseMesh = new THREE.Mesh(baseGeo, carbonMaterial);
    baseMesh.position.y = 0.25;
    baseMesh.castShadow = true;
    this.mesh.add(baseMesh);

    // Aerodynamic Main Body
    const bodyGeo = new THREE.BoxGeometry(1.72, 0.42, 4.2);
    const bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    bodyMesh.position.y = 0.5;
    bodyMesh.castShadow = true;
    this.mesh.add(bodyMesh);

    // Front Hood Wedge
    const hoodGeo = new THREE.BoxGeometry(1.68, 0.28, 1.4);
    const hoodMesh = new THREE.Mesh(hoodGeo, this.bodyMaterial);
    hoodMesh.position.set(0, 0.46, -1.4);
    hoodMesh.rotation.x = 0.08;
    this.mesh.add(hoodMesh);

    // Front Aerodynamic Splitter Lip
    const splitterWidth = this.carModel === 'titan' ? 2.05 : 1.88;
    const splitterGeo = new THREE.BoxGeometry(splitterWidth, 0.08, 0.52);
    const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
    splitter.position.set(0, 0.14, -2.18);
    this.mesh.add(splitter);

    // Cockpit / Cabin Glass
    const cabinGeo = new THREE.BoxGeometry(1.36, 0.46, 2.1);
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMaterial);
    cabinMesh.position.set(0, 0.86, 0.15);
    cabinMesh.castShadow = true;
    this.mesh.add(cabinMesh);

    // Cabin Roof
    const roofGeo = new THREE.BoxGeometry(1.28, 0.05, 1.6);
    const roofMesh = new THREE.Mesh(roofGeo, this.bodyMaterial);
    roofMesh.position.set(0, 1.1, 0.2);
    this.mesh.add(roofMesh);

    // MODEL-SPECIFIC CUSTOM ACCESSORIES:
    if (this.carModel === 'inferno') {
      // Inferno: High arched GT Wing
      const wingGeo = new THREE.BoxGeometry(1.92, 0.06, 0.42);
      const wing = new THREE.Mesh(wingGeo, carbonMaterial);
      wing.position.set(0, 1.14, 1.95);
      const sL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.12), carbonMaterial);
      sL.position.set(-0.55, 0.96, 1.95);
      const sR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.12), carbonMaterial);
      sR.position.set(0.55, 0.96, 1.95);
      this.mesh.add(wing, sL, sR);

    } else if (this.carModel === 'cyber') {
      // Cyber: Sleek active aero ducktail + Neon Underglow line
      const duckGeo = new THREE.BoxGeometry(1.78, 0.16, 0.25);
      const duck = new THREE.Mesh(duckGeo, this.bodyMaterial);
      duck.position.set(0, 0.85, 2.1);
      duck.rotation.x = -0.3;
      this.mesh.add(duck);

      // Cyber Neon side skirts
      const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const skirtGeo = new THREE.BoxGeometry(0.06, 0.06, 2.8);
      const skirtL = new THREE.Mesh(skirtGeo, neonMat);
      skirtL.position.set(-0.92, 0.18, 0);
      const skirtR = new THREE.Mesh(skirtGeo, neonMat);
      skirtR.position.set(0.92, 0.18, 0);
      this.mesh.add(skirtL, skirtR);

    } else if (this.carModel === 'venom') {
      // Venom: Muscle Twin Hood Air Intakes + Drag Spoiler
      const scoopGeo = new THREE.BoxGeometry(0.35, 0.14, 0.7);
      const scoopL = new THREE.Mesh(scoopGeo, carbonMaterial);
      scoopL.position.set(-0.4, 0.68, -1.2);
      const scoopR = new THREE.Mesh(scoopGeo, carbonMaterial);
      scoopR.position.set(0.4, 0.68, -1.2);
      this.mesh.add(scoopL, scoopR);

      const dragWing = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.35), carbonMaterial);
      dragWing.position.set(0, 0.92, 2.05);
      this.mesh.add(dragWing);

    } else if (this.carModel === 'titan') {
      // Titan: Massive GT3 Wing + Front Dive Planes (Canards)
      const bigWing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.5), carbonMaterial);
      bigWing.position.set(0, 1.35, 1.9);
      const pL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.2), carbonMaterial);
      pL.position.set(-0.75, 1.05, 1.9);
      const pR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.2), carbonMaterial);
      pR.position.set(0.75, 1.05, 1.9);
      this.mesh.add(bigWing, pL, pR);

      // Wide flared fender arches
      const fenderGeo = new THREE.BoxGeometry(2.05, 0.3, 0.9);
      const fFront = new THREE.Mesh(fenderGeo, carbonMaterial);
      fFront.position.set(0, 0.42, -1.35);
      const fRear = new THREE.Mesh(fenderGeo, carbonMaterial);
      fRear.position.set(0, 0.42, 1.35);
      this.mesh.add(fFront, fRear);
    }

    // Rear Diffuser
    const diffuserGeo = new THREE.BoxGeometry(1.7, 0.18, 0.3);
    const diffuser = new THREE.Mesh(diffuserGeo, carbonMaterial);
    diffuser.position.set(0, 0.22, 2.15);
    this.mesh.add(diffuser);

    // Twin Chrome Exhausts
    const exhaustGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.35, 16);
    exhaustGeo.rotateX(Math.PI / 2);
    const exhaustL = new THREE.Mesh(exhaustGeo, chromeMaterial);
    exhaustL.position.set(-0.45, 0.26, 2.22);
    const exhaustR = new THREE.Mesh(exhaustGeo, chromeMaterial);
    exhaustR.position.set(0.45, 0.26, 2.22);
    this.mesh.add(exhaustL, exhaustR);

    // Dynamic Nitro Flame Cones
    const spec = this.specs[this.carModel] || this.specs.inferno;
    const flameGeo = new THREE.ConeGeometry(0.14, 0.85, 16);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: spec.flameColor,
      transparent: true,
      opacity: 0.9
    });
    const flameL = new THREE.Mesh(flameGeo, flameMat);
    flameL.position.set(-0.45, 0.26, 2.65);
    flameL.visible = false;
    const flameR = new THREE.Mesh(flameGeo, flameMat.clone());
    flameR.position.set(0.45, 0.26, 2.65);
    flameR.visible = false;

    this.exhaustFlames.push(flameL, flameR);
    this.mesh.add(flameL, flameR);
    this.nitroLight.color.setHex(spec.flameColor);

    // LED Headlights
    const hlGeo = new THREE.BoxGeometry(0.35, 0.12, 0.06);
    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0f2fe,
      emissiveIntensity: 3.5
    });
    const hlLeft = new THREE.Mesh(hlGeo, hlMat);
    hlLeft.position.set(-0.62, 0.45, -2.12);
    const hlRight = new THREE.Mesh(hlGeo, hlMat);
    hlRight.position.set(0.62, 0.45, -2.12);
    this.mesh.add(hlLeft, hlRight);

    // Headlight Spotlights
    const spotL = new THREE.SpotLight(0xffffff, 1.8, 65, Math.PI / 5, 0.3);
    spotL.position.set(-0.62, 0.45, -2.12);
    spotL.target.position.set(-0.62, 0.2, -45);
    this.mesh.add(spotL);
    this.mesh.add(spotL.target);

    const spotR = new THREE.SpotLight(0xffffff, 1.8, 65, Math.PI / 5, 0.3);
    spotR.position.set(0.62, 0.45, -2.12);
    spotR.target.position.set(0.62, 0.2, -45);
    this.mesh.add(spotR);
    this.mesh.add(spotR.target);

    // Ruby Taillights
    this.tailLightMat = new THREE.MeshStandardMaterial({
      color: 0x880011,
      emissive: 0xff0022,
      emissiveIntensity: 1.2
    });
    const tlGeo = new THREE.BoxGeometry(0.45, 0.09, 0.05);
    const tlLeft = new THREE.Mesh(tlGeo, this.tailLightMat);
    tlLeft.position.set(-0.55, 0.52, 2.12);
    const tlRight = new THREE.Mesh(tlGeo, this.tailLightMat);
    tlRight.position.set(0.55, 0.52, 2.12);
    this.mesh.add(tlLeft, tlRight);

    // 4 High Detail Wheels
    const wheelRadius = 0.35;
    const wheelPositions = [
      { x: -0.92, z: -1.35, isFront: true, isRight: false },
      { x: 0.92, z: -1.35, isFront: true, isRight: true },
      { x: -0.92, z: 1.35, isFront: false, isRight: false },
      { x: 0.92, z: 1.35, isFront: false, isRight: true }
    ];

    wheelPositions.forEach(pos => {
      const wheelAssembly = this.createWheel(pos.isRight, wheelRadius);
      wheelAssembly.pivot.position.set(pos.x, wheelRadius, pos.z);
      this.mesh.add(wheelAssembly.pivot);
      this.wheels.push(wheelAssembly.spin);
      if (pos.isFront) {
        this.frontWheels.push(wheelAssembly.pivot);
      }
    });
  }

  createWheel(isRightSide, radius) {
    const pivot = new THREE.Group();
    const spin = new THREE.Group();

    const tireGeo = new THREE.CylinderGeometry(radius, radius, 0.26, 20);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    spin.add(tire);

    // Alloy Rim
    const rimGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, 0.27, 10);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    spin.add(rim);

    pivot.add(spin);

    // Red Brake Caliper
    const caliperGeo = new THREE.BoxGeometry(0.08, 0.14, 0.18);
    const caliperMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(isRightSide ? -0.1 : 0.1, 0.1, 0);
    pivot.add(caliper);

    return { pivot, spin };
  }

  reset() {
    this.x = 0;
    this.speed = 0;
    this.nitroFuel = 100;
    this.tiltAngle = 0;
    this.steerAngle = 0;
    this.lateralVelocity = 0;
    this.mesh.position.set(0, this.y, 0);
    this.mesh.rotation.set(0, 0, 0);
    const spec = this.specs[this.carModel] || this.specs.inferno;
    this.hasShield = spec.shield;

    // Clear smoke
    this.smokeParticles.forEach(p => this.smokeGroup.remove(p));
    this.smokeParticles = [];
  }

  // Spawn Tire Smoke Particles on heavy drift or braking
  emitTireSmoke() {
    const rearZ = 1.35;
    const sides = [-0.92, 0.92];

    sides.forEach(sX => {
      const puffGeo = new THREE.SphereGeometry(0.18 + Math.random() * 0.15, 6, 6);
      const puffMat = new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.45
      });
      const puff = new THREE.Mesh(puffGeo, puffMat);
      puff.position.set(
        this.x + sX + (Math.random() - 0.5) * 0.2,
        0.2 + Math.random() * 0.15,
        this.z + rearZ + (Math.random() - 0.5) * 0.3
      );
      puff.userData = {
        vx: (Math.random() - 0.5) * 1.5,
        vy: 0.8 + Math.random() * 1.2,
        vz: 2 + Math.random() * 4,
        scaleSpeed: 3.5,
        life: 0.6
      };
      this.smokeParticles.push(puff);
      this.smokeGroup.add(puff);
    });
  }

  updateSmoke(delta) {
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.userData.life -= delta;

      p.position.x += p.userData.vx * delta;
      p.position.y += p.userData.vy * delta;
      p.position.z += p.userData.vz * delta;

      const scale = 1 + (0.6 - p.userData.life) * p.userData.scaleSpeed;
      p.scale.set(scale, scale, scale);
      p.material.opacity = (p.userData.life / 0.6) * 0.45;

      if (p.userData.life <= 0) {
        this.smokeGroup.remove(p);
        this.smokeParticles.splice(i, 1);
      }
    }
  }

  update(delta, input) {
    // 1. Acceleration / Nitro
    this.isNitro = input.nitro && this.nitroFuel > 0 && input.gas;
    this.isBraking = input.brake;

    if (this.isNitro) {
      this.maxSpeed = this.maxNitroSpeed;
      this.nitroFuel = Math.max(0, this.nitroFuel - this.nitroBurnRate * delta);

      // Nitro Flames & Point light
      this.exhaustFlames.forEach(flame => {
        flame.visible = true;
        flame.scale.set(
          0.8 + Math.random() * 0.5,
          1 + Math.random() * 0.7,
          0.8 + Math.random() * 0.5
        );
      });
      this.nitroLight.intensity = 2.5 + Math.random() * 1.5;

    } else {
      this.maxSpeed = this.maxNormalSpeed;
      this.exhaustFlames.forEach(flame => flame.visible = false);
      this.nitroLight.intensity = 0;

      if (this.nitroFuel < 100) {
        this.nitroFuel = Math.min(100, this.nitroFuel + this.nitroRegenRate * delta);
      }
    }

    // Accelerating vs Braking vs Coasting
    if (input.gas) {
      const accelFactor = this.isNitro ? this.acceleration * 1.6 : this.acceleration;
      if (this.speed < this.maxSpeed) {
        this.speed = Math.min(this.maxSpeed, this.speed + accelFactor * delta);
      } else {
        // Natural smooth coasting down to normal speed when nitro ends (no sudden brick wall drop)
        this.speed = Math.max(this.maxSpeed, this.speed - 35 * delta);
      }
    } else if (this.isBraking) {
      this.speed = Math.max(0, this.speed - this.braking * delta);
    } else {
      // Natural rolling friction
      this.speed = Math.max(0, this.speed - this.friction * delta);
    }

    // Taillight brake flare
    if (this.tailLightMat) {
      if (this.isBraking) {
        this.tailLightMat.emissiveIntensity = 4.2;
        this.tailLightMat.color.setHex(0xff0033);
      } else {
        this.tailLightMat.emissiveIntensity = 1.0;
        this.tailLightMat.color.setHex(0x880011);
      }
    }

    // 2. Lateral Steering — momentum-based, real car feel
    const speedRatio = Math.min(1.0, this.speed / 50);
    let steerDir = 0;
    if (input.left) steerDir -= 1;
    if (input.right) steerDir += 1;

    // Handling determines how sharply lateral velocity builds up
    // At low speed: very responsive. At high speed: slower build-up (understeer feel)
    const handlingAtSpeed = this.handling * (0.55 + 0.45 * (1.0 - speedRatio * 0.6));
    const targetLateralVel = steerDir * handlingAtSpeed;

    // Smooth lateral velocity lerp — gives inertia / momentum feel
    const lerpRate = steerDir !== 0 ? 6.0 : 10.0; // quicker centering than building
    this.lateralVelocity = THREE.MathUtils.lerp(
      this.lateralVelocity, targetLateralVel * speedRatio, delta * lerpRate
    );

    this.x += this.lateralVelocity * delta;

    // Guardrail borders: kinetic scrape friction (not sticky)
    const maxRoadX = 7.4;
    if (this.x < -maxRoadX) {
      this.x = -maxRoadX;
      this.lateralVelocity = Math.max(0, this.lateralVelocity);
      this.speed = Math.max(0, this.speed - 75 * delta);
      if (Math.random() < 0.4 && this.speed > 35) this.emitTireSmoke();
    } else if (this.x > maxRoadX) {
      this.x = maxRoadX;
      this.lateralVelocity = Math.min(0, this.lateralVelocity);
      this.speed = Math.max(0, this.speed - 75 * delta);
      if (Math.random() < 0.4 && this.speed > 35) this.emitTireSmoke();
    }

    // 3. Visual Roll Tilt — exaggerated at speed for dramatic feel
    const tiltStrength = 0.18 * Math.min(1.0, this.speed / this.maxNormalSpeed);
    const targetTilt = -steerDir * tiltStrength;
    this.tiltAngle = THREE.MathUtils.lerp(this.tiltAngle, targetTilt, delta * 9);
    this.mesh.rotation.z = this.tiltAngle;

    let pitch = 0;
    if (this.isBraking && this.speed > 20) pitch = -0.05;
    else if (input.gas && this.speed < 130) pitch = 0.025;
    this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, pitch, delta * 9);

    // Front wheels: steering angle (strong visual articulation)
    const targetSteerAngle = steerDir * 0.55;
    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, targetSteerAngle, delta * 14);
    this.frontWheels.forEach(w => {
      w.rotation.y = this.steerAngle;
    });

    // Spin all wheels along their rolling axis
    const wheelSpinSpeed = (this.speed / 3.6) * delta * 5.0;
    this.wheels.forEach(w => {
      w.rotation.x -= wheelSpinSpeed;
    });

    // Tire smoke emission when hard braking or high-speed sharp turning
    if ((this.isBraking && this.speed > 55) || (Math.abs(steerDir) > 0 && this.speed > 130)) {
      if (Math.random() < 0.6) {
        this.emitTireSmoke();
      }
    }
    this.updateSmoke(delta);

    // Update car position
    this.mesh.position.x = this.x;
    this.mesh.position.y = this.y;
    this.mesh.position.z = this.z;
  }
}
