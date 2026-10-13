// Nature, Terrain, Sky, and Infinite Highway Scenery System
class EnvironmentSystem {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    // Road chunk parameters
    this.chunkLength = 120;
    this.chunkCount = 6;
    this.totalTrackLength = this.chunkLength * this.chunkCount;
    this.roadChunks = [];

    // Nature asset pools
    this.trees = [];
    this.rocks = [];
    this.clouds = [];
    this.turbines = [];
    this.rainParticles = null;
    this.currentEnv = 'sunny';

    // Textures
    this.roadTexture = TextureFactory.createRoadTexture();
    this.grassTexture = TextureFactory.createGrassTexture();
    this.guardrailTexture = TextureFactory.createGuardrailTexture();
    this.mountainTexture = TextureFactory.createMountainTexture();

    // Lighting setup
    this.setupLighting();
    this.createDistantMountains();
    this.createClouds();
    this.createWindTurbines();
    this.createRoadChunks();
    this.createRainSystem();

    this.setPreset('sunny');
  }

  setupLighting() {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(this.ambientLight);

    // Main Sun Directional Light
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    this.sunLight.position.set(40, 70, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 250;
    this.sunLight.shadow.camera.left = -30;
    this.sunLight.shadow.camera.right = 30;
    this.sunLight.shadow.camera.top = 30;
    this.sunLight.shadow.camera.bottom = -30;
    this.scene.add(this.sunLight);

    // Atmospheric Fog
    this.scene.fog = new THREE.FogExp2(0xcbe3f7, 0.0045);
  }

  // Majestic distant mountain ridges
  createDistantMountains() {
    this.mountainsGroup = new THREE.Group();

    const mountainGeo = new THREE.ConeGeometry(45, 90, 7);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      map: this.mountainTexture,
      roughness: 0.9,
      flatShading: true
    });

    // Create left and right mountain ranges
    const rangeLength = 400;
    for (let i = 0; i < 28; i++) {
      const scale = 0.8 + Math.random() * 1.5;
      const mesh = new THREE.Mesh(mountainGeo, mountainMat);
      const isLeft = i % 2 === 0;
      const x = isLeft ? -(90 + Math.random() * 70) : (90 + Math.random() * 70);
      const z = -200 + (i / 28) * rangeLength * 2;
      const y = (mountainGeo.parameters.height * scale) / 2 - 10;

      mesh.position.set(x, y, z);
      mesh.scale.set(scale, scale * (0.8 + Math.random() * 0.5), scale);
      mesh.rotation.y = Math.random() * Math.PI;
      this.mountainsGroup.add(mesh);
    }

    this.scene.add(this.mountainsGroup);
  }

  // 3D Fluffy Cumulus Clouds drifting across the sky
  createClouds() {
    this.cloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      flatShading: true
    });

    for (let c = 0; c < 22; c++) {
      const cloud = new THREE.Group();
      const puffCount = 5 + Math.floor(Math.random() * 5);

      for (let p = 0; p < puffCount; p++) {
        const radius = 6 + Math.random() * 8;
        const puffGeo = new THREE.DodecahedronGeometry(radius, 1);
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(
          (Math.random() - 0.5) * 22,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 16
        );
        cloud.add(puff);
      }

      cloud.position.set(
        (Math.random() - 0.5) * 360,
        60 + Math.random() * 35,
        -250 + Math.random() * 500
      );
      this.clouds.push(cloud);
      this.cloudsGroup.add(cloud);
    }
    this.scene.add(this.cloudsGroup);
  }

  // Wind Turbines in the scenic valley
  createWindTurbines() {
    this.turbinesGroup = new THREE.Group();
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

    const turbinePositions = [
      { x: -75, z: -80 },
      { x: -110, z: 40 },
      { x: 80, z: -140 },
      { x: 95, z: 90 }
    ];

    turbinePositions.forEach(pos => {
      const turbine = new THREE.Group();

      // Tower
      const towerGeo = new THREE.CylinderGeometry(0.8, 1.6, 40, 12);
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.y = 20;
      turbine.add(tower);

      // Nacelle
      const nacelleGeo = new THREE.BoxGeometry(2.5, 2.2, 5);
      const nacelle = new THREE.Mesh(nacelleGeo, towerMat);
      nacelle.position.set(0, 40, 0);
      turbine.add(nacelle);

      // Rotor blades
      const rotor = new THREE.Group();
      rotor.position.set(0, 40, -2.6);

      for (let b = 0; b < 3; b++) {
        const bladeGeo = new THREE.BoxGeometry(0.5, 18, 0.15);
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 9;
        blade.rotation.z = (b * Math.PI * 2) / 3;
        rotor.add(blade);
      }
      turbine.add(rotor);
      turbine.rotor = rotor;

      turbine.position.set(pos.x, 0, pos.z);
      this.turbines.push(turbine);
      this.turbinesGroup.add(turbine);
    });

    this.scene.add(this.turbinesGroup);
  }

  // Create infinite road chunks that recycle
  createRoadChunks() {
    for (let i = 0; i < this.chunkCount; i++) {
      const zOffset = -i * this.chunkLength;
      const chunk = this.buildHighwayChunk(zOffset);
      this.roadChunks.push(chunk);
      this.scene.add(chunk);
    }
  }

  buildHighwayChunk(zOffset) {
    const chunk = new THREE.Group();
    chunk.position.z = zOffset;

    // 1. Asphalt Highway Surface (16 units wide, 4 driving lanes)
    const roadWidth = 16.4;
    const roadGeo = new THREE.PlaneGeometry(roadWidth, this.chunkLength, 1, 10);
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTexture,
      roughness: 0.65,
      metalness: 0.1
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.y = 0;
    roadMesh.receiveShadow = true;
    chunk.add(roadMesh);

    // 2. Grassy Embankments / Natural Terrain on sides
    const terrainWidth = 90;
    const terrainGeo = new THREE.PlaneGeometry(terrainWidth, this.chunkLength, 8, 8);

    // Add gentle organic height variation to the terrain
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      // Elevate terrain outward from road
      const distFromEdge = Math.abs(x) / (terrainWidth / 2);
      const elevation = Math.pow(distFromEdge, 1.6) * 12 + Math.sin(x * 0.2) * 1.5;
      posAttr.setZ(i, elevation);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: this.grassTexture,
      roughness: 0.85,
      metalness: 0.05
    });

    // Left Grass Field
    const leftTerrain = new THREE.Mesh(terrainGeo, terrainMat);
    leftTerrain.rotation.x = -Math.PI / 2;
    leftTerrain.rotation.z = Math.PI;
    leftTerrain.position.set(-(roadWidth / 2 + terrainWidth / 2), -0.05, 0);
    leftTerrain.receiveShadow = true;
    chunk.add(leftTerrain);

    // Right Grass Field
    const rightTerrain = new THREE.Mesh(terrainGeo, terrainMat);
    rightTerrain.rotation.x = -Math.PI / 2;
    rightTerrain.position.set(roadWidth / 2 + terrainWidth / 2, -0.05, 0);
    rightTerrain.receiveShadow = true;
    chunk.add(rightTerrain);

    // 3. Highway Guardrails (Left and Right)
    const guardrailGeo = new THREE.BoxGeometry(0.35, 0.8, this.chunkLength);
    const guardrailMat = new THREE.MeshStandardMaterial({
      map: this.guardrailTexture,
      metalness: 0.8,
      roughness: 0.3
    });

    const guardrailL = new THREE.Mesh(guardrailGeo, guardrailMat);
    guardrailL.position.set(-roadWidth / 2 - 0.2, 0.45, 0);
    const guardrailR = new THREE.Mesh(guardrailGeo, guardrailMat);
    guardrailR.position.set(roadWidth / 2 + 0.2, 0.45, 0);
    chunk.add(guardrailL);
    chunk.add(guardrailR);

    // Guardrail support posts every 8 meters
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7 });
    for (let p = -this.chunkLength / 2; p < this.chunkLength / 2; p += 8) {
      const postL = new THREE.Mesh(postGeo, postMat);
      postL.position.set(-roadWidth / 2 - 0.2, 0.4, p);
      const postR = new THREE.Mesh(postGeo, postMat);
      postR.position.set(roadWidth / 2 + 0.2, 0.4, p);
      chunk.add(postL);
      chunk.add(postR);
    }

    // 4. Street Lamps (Every 40m)
    for (let l = -this.chunkLength / 2 + 20; l < this.chunkLength / 2; l += 40) {
      this.addStreetLamp(chunk, -roadWidth / 2 - 1.2, l, false);
      this.addStreetLamp(chunk, roadWidth / 2 + 1.2, l, true);
    }

    // 5. Rich Scenic Forest Trees & Nature Assets
    this.populateChunkNature(chunk, roadWidth);

    // 6. Overhead Highway Sign Gantry / Checkpoint Gate
    if (Math.abs(zOffset) % 240 === 0) {
      this.addHighwayGantry(chunk, roadWidth);
    } else if (Math.abs(zOffset) % 360 === 120) {
      this.addCheckpointGantry(chunk, roadWidth);
    }

    // 7. Highway Collectibles (Coins & Nitro Canisters)
    this.addChunkPickups(chunk);

    return chunk;
  }

  // 3D Glowing Checkpoint Arch
  addCheckpointGantry(chunk, roadWidth) {
    const arch = new THREE.Group();
    arch.position.set(0, 0, 0);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const neonGreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });

    // Pillars
    const pGeo = new THREE.BoxGeometry(0.5, 9, 0.5);
    const pL = new THREE.Mesh(pGeo, pillarMat);
    pL.position.set(-roadWidth / 2 - 1.2, 4.5, 0);
    const pR = new THREE.Mesh(pGeo, pillarMat);
    pR.position.set(roadWidth / 2 + 1.2, 4.5, 0);
    arch.add(pL, pR);

    // Overhead Gate
    const beamGeo = new THREE.BoxGeometry(roadWidth + 3, 0.6, 0.6);
    const beam = new THREE.Mesh(beamGeo, pillarMat);
    beam.position.set(0, 8.8, 0);
    arch.add(beam);

    // Glowing Neon Banner
    const bannerGeo = new THREE.PlaneGeometry(8, 1.6);
    const bannerMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.85 });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 8.5, 0.35);
    arch.add(banner);

    chunk.add(arch);
  }

  // Add 3D Coins & NOS Bottles to Road Chunk
  addChunkPickups(chunk) {
    chunk.pickups = [];
    const lanes = [-5.7, -1.9, 1.9, 5.7];

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xd97706,
      emissiveIntensity: 0.5
    });

    const nosMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x0088ff,
      emissiveIntensity: 0.6
    });

    // 2-3 items per chunk
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const isNos = Math.random() < 0.3; // 30% NOS bottle, 70% Coin
      const laneX = lanes[Math.floor(Math.random() * lanes.length)];
      const zPos = -this.chunkLength / 2 + 20 + (i * 38) + (Math.random() - 0.5) * 10;

      let itemMesh;
      if (isNos) {
        // NOS Bottle
        const bottle = new THREE.Group();
        const canGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.9, 12);
        const can = new THREE.Mesh(canGeo, nosMat);
        const topGeo = new THREE.SphereGeometry(0.24, 10, 8);
        const top = new THREE.Mesh(topGeo, nosMat);
        top.position.y = 0.45;
        bottle.add(can, top);
        bottle.itemType = 'nos';
        itemMesh = bottle;
      } else {
        // Golden Star Coin
        const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16);
        coinGeo.rotateX(Math.PI / 2);
        const coin = new THREE.Mesh(coinGeo, goldMat);
        coin.itemType = 'coin';
        itemMesh = coin;
      }

      itemMesh.position.set(laneX, 0.75, zPos);
      itemMesh.castShadow = true;
      chunk.add(itemMesh);
      chunk.pickups.push(itemMesh);
      if (!this.allPickups) this.allPickups = [];
      this.allPickups.push({ mesh: itemMesh, chunk: chunk });
    }
  }

  addStreetLamp(chunk, x, z, isRightSide) {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, 0, z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.18, 9, 8);
    const pole = new THREE.Mesh(poleGeo, metalMat);
    pole.position.y = 4.5;
    lampGroup.add(pole);

    // Arm reaching over highway
    const armGeo = new THREE.BoxGeometry(2.4, 0.12, 0.12);
    const arm = new THREE.Mesh(armGeo, metalMat);
    arm.position.set(isRightSide ? -1.1 : 1.1, 8.8, 0);
    lampGroup.add(arm);

    // Lantern fixture
    const lanternGeo = new THREE.BoxGeometry(0.8, 0.2, 0.4);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 0.8
    });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(isRightSide ? -2.2 : 2.2, 8.7, 0);
    lampGroup.add(lantern);

    chunk.add(lampGroup);
  }

  addHighwayGantry(chunk, roadWidth) {
    const gantry = new THREE.Group();
    gantry.position.set(0, 0, 0);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 });

    // Left and right pillars
    const pillarGeo = new THREE.CylinderGeometry(0.25, 0.25, 8.5, 8);
    const pL = new THREE.Mesh(pillarGeo, frameMat);
    pL.position.set(-roadWidth / 2 - 1.5, 4.25, 0);
    const pR = new THREE.Mesh(pillarGeo, frameMat);
    pR.position.set(roadWidth / 2 + 1.5, 4.25, 0);
    gantry.add(pL);
    gantry.add(pR);

    // Overhead truss beam
    const trussGeo = new THREE.BoxGeometry(roadWidth + 4, 0.8, 0.8);
    const truss = new THREE.Mesh(trussGeo, frameMat);
    truss.position.set(0, 8.2, 0);
    gantry.add(truss);

    // Green Highway Direction Board
    const signTexture = TextureFactory.createSignTexture("HIGHWAY HORIZON", "NORTH SPEEDWAY ➜");
    const signGeo = new THREE.PlaneGeometry(7.5, 2.2);
    const signMat = new THREE.MeshBasicMaterial({ map: signTexture });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, 8.0, 0.45);
    gantry.add(signMesh);

    chunk.add(gantry);
  }

  // Populate lush forest trees, alpine pines, deciduous oaks, and rocks
  populateChunkNature(chunk, roadWidth) {
    const halfLen = this.chunkLength / 2;

    // Left and right roadside zones
    const sideZones = [
      { minX: -55, maxX: -roadWidth / 2 - 4 },
      { minX: roadWidth / 2 + 4, maxX: 55 }
    ];

    sideZones.forEach(zone => {
      // 1. Tall Alpine Pine Trees
      for (let i = 0; i < 22; i++) {
        const x = zone.minX + Math.random() * (zone.maxX - zone.minX);
        const z = -halfLen + Math.random() * this.chunkLength;
        const scale = 0.8 + Math.random() * 0.9;
        const tree = this.createPineTree(scale);
        tree.position.set(x, 0, z);
        chunk.add(tree);
      }

      // 2. Leafy Deciduous / Oak Trees
      for (let i = 0; i < 14; i++) {
        const x = zone.minX + Math.random() * (zone.maxX - zone.minX);
        const z = -halfLen + Math.random() * this.chunkLength;
        const scale = 0.9 + Math.random() * 0.8;
        const isAutumn = Math.random() > 0.6;
        const tree = this.createDeciduousTree(scale, isAutumn);
        tree.position.set(x, 0, z);
        chunk.add(tree);
      }

      // 3. Roadside Natural Rocks & Boulders
      for (let i = 0; i < 8; i++) {
        const x = zone.minX + Math.random() * (zone.maxX - zone.minX);
        const z = -halfLen + Math.random() * this.chunkLength;
        const rock = this.createRock();
        rock.position.set(x, 0.4, z);
        chunk.add(rock);
      }
    });
  }

  createPineTree(scale = 1.0) {
    const group = new THREE.Group();
    group.scale.set(scale, scale, scale);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.75;
    trunk.castShadow = true;
    group.add(trunk);

    // Multi-tier layered pine cones
    const pineGreen = 0x14532d;
    const foliageMat = new THREE.MeshStandardMaterial({
      color: pineGreen,
      roughness: 0.8,
      flatShading: true
    });

    const tiers = [
      { r: 2.6, h: 3.5, y: 3.8 },
      { r: 2.1, h: 3.2, y: 5.6 },
      { r: 1.5, h: 2.8, y: 7.2 },
      { r: 0.9, h: 2.2, y: 8.6 }
    ];

    tiers.forEach(t => {
      const coneGeo = new THREE.ConeGeometry(t.r, t.h, 7);
      const cone = new THREE.Mesh(coneGeo, foliageMat);
      cone.position.y = t.y;
      cone.castShadow = true;
      group.add(cone);
    });

    return group;
  }

  createDeciduousTree(scale = 1.0, isAutumn = false) {
    const group = new THREE.Group();
    group.scale.set(scale, scale, scale);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.6, 4.0, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.0;
    trunk.castShadow = true;
    group.add(trunk);

    // Canopy foliage clusters
    const foliageColor = isAutumn
      ? (Math.random() > 0.5 ? 0xd97706 : 0xef4444)
      : (Math.random() > 0.5 ? 0x22c55e : 0x16a34a);

    const foliageMat = new THREE.MeshStandardMaterial({
      color: foliageColor,
      roughness: 0.75,
      flatShading: true
    });

    const canopyGeo = new THREE.DodecahedronGeometry(2.6, 1);
    const canopy = new THREE.Mesh(canopyGeo, foliageMat);
    canopy.position.y = 5.2;
    canopy.castShadow = true;
    group.add(canopy);

    const subPuff1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), foliageMat);
    subPuff1.position.set(1.2, 4.6, 0.8);
    group.add(subPuff1);

    const subPuff2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), foliageMat);
    subPuff2.position.set(-1.1, 4.4, -0.6);
    group.add(subPuff2);

    return group;
  }

  createRock() {
    const radius = 0.8 + Math.random() * 1.4;
    const rockGeo = new THREE.DodecahedronGeometry(radius, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.9,
      flatShading: true
    });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rock.scale.set(1.2, 0.7, 1);
    rock.castShadow = true;
    return rock;
  }

  // Rain Storm System
  createRainSystem() {
    const rainCount = 3500;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 80;
      positions[i + 1] = Math.random() * 50;
      positions[i + 2] = (Math.random() - 0.5) * 120;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.25,
      transparent: true,
      opacity: 0.65
    });

    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  // Dynamic Weather & Environment Preset Switcher
  setPreset(type) {
    this.currentEnv = type;
    const rainCanvas = document.getElementById('rain-canvas-overlay');

    if (type === 'sunny') {
      this.renderer.setClearColor(0x87ceeb);
      this.scene.fog.color.setHex(0xcbe3f7);
      this.scene.fog.density = 0.0042;
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.7;
      this.sunLight.color.setHex(0xfffbeb);
      this.sunLight.intensity = 1.3;
      this.sunLight.position.set(40, 70, 50);
      if (this.rainParticles) this.rainParticles.visible = false;
      if (rainCanvas) rainCanvas.classList.remove('active');
    }
    else if (type === 'sunset') {
      this.renderer.setClearColor(0xf97316);
      this.scene.fog.color.setHex(0xfb923c);
      this.scene.fog.density = 0.0055;
      this.ambientLight.color.setHex(0xfed7aa);
      this.ambientLight.intensity = 0.5;
      this.sunLight.color.setHex(0xf97316);
      this.sunLight.intensity = 1.5;
      this.sunLight.position.set(-60, 25, -70);
      if (this.rainParticles) this.rainParticles.visible = false;
      if (rainCanvas) rainCanvas.classList.remove('active');
    }
    else if (type === 'rain') {
      this.renderer.setClearColor(0x334155);
      this.scene.fog.color.setHex(0x475569);
      this.scene.fog.density = 0.012;
      this.ambientLight.color.setHex(0x94a3b8);
      this.ambientLight.intensity = 0.45;
      this.sunLight.color.setHex(0xcbd5e1);
      this.sunLight.intensity = 0.6;
      if (this.rainParticles) this.rainParticles.visible = true;
      if (rainCanvas) rainCanvas.classList.add('active');
    }
    else if (type === 'night') {
      this.renderer.setClearColor(0x050811);
      this.scene.fog.color.setHex(0x0a1128);
      this.scene.fog.density = 0.0065;
      this.ambientLight.color.setHex(0x1e293b);
      this.ambientLight.intensity = 0.25;
      this.sunLight.color.setHex(0x38bdf8);
      this.sunLight.intensity = 0.35;
      this.sunLight.position.set(0, 50, -50);
      if (this.rainParticles) this.rainParticles.visible = false;
      if (rainCanvas) rainCanvas.classList.remove('active');
    }
  }

  // Update infinite highway scroll based on player's velocity
  update(delta, playerSpeedKmh) {
    // Translate speed km/h to 3D world units
    const forwardSpeedUnits = (playerSpeedKmh / 3.6) * 1.2;
    const moveDistance = forwardSpeedUnits * delta;

    // Move all chunks towards player (+Z direction)
    for (let i = 0; i < this.roadChunks.length; i++) {
      const chunk = this.roadChunks[i];
      chunk.position.z += moveDistance;

      // When chunk passes completely behind player camera, loop it to the furthest front
      if (chunk.position.z > this.chunkLength * 1.5) {
        // Find furthest chunk ahead
        let minZ = 0;
        for (let j = 0; j < this.roadChunks.length; j++) {
          if (this.roadChunks[j].position.z < minZ) {
            minZ = this.roadChunks[j].position.z;
          }
        }
        chunk.position.z = minZ - this.chunkLength;

        // Respawn pickups on recycled chunk
        if (chunk.pickups) {
          chunk.pickups.forEach(p => {
            p.visible = true;
            p.collected = false;
          });
        }
      }
    }

    // Scroll wind turbines with scenery parallax so they naturally move past
    this.turbines.forEach(t => {
      t.position.z += moveDistance * 0.5;
      if (t.position.z > 160) {
        t.position.z = -280 - Math.random() * 80;
      }
      if (t.rotor) {
        t.rotor.rotation.z += delta * 1.8;
      }
    });

    // Slowly drift clouds
    this.clouds.forEach(c => {
      c.position.x += delta * 2.0;
      if (c.position.x > 200) c.position.x = -200;
    });

    // Animate active collectibles (spin coins & NOS)
    if (this.allPickups) {
      for (let i = 0; i < this.allPickups.length; i++) {
        const mesh = this.allPickups[i].mesh;
        if (mesh.visible) {
          mesh.rotation.y += delta * 3.2;
        }
      }
    }

    // Rain drop animation
    if (this.rainParticles && this.rainParticles.visible) {
      const positions = this.rainParticles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= delta * 70;
        if (positions[i] < 0) {
          positions[i] = 45;
        }
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Check player collisions with floating gold coins & nitro canisters
  checkPickups(player, onCollect) {
    if (!player || !this.allPickups) return;
    const playerHalfWidth = 0.95;
    const playerHalfLength = 2.1;

    for (let i = 0; i < this.allPickups.length; i++) {
      const item = this.allPickups[i];
      const mesh = item.mesh;
      if (!mesh.visible || mesh.collected) continue;

      const worldZ = item.chunk.position.z + mesh.position.z;
      const worldX = mesh.position.x;

      const dx = Math.abs(player.x - worldX);
      const dz = Math.abs(player.z - worldZ);

      if (dx < (playerHalfWidth + 0.55) && dz < (playerHalfLength + 0.8)) {
        mesh.visible = false;
        mesh.collected = true;
        if (onCollect) {
          onCollect(mesh);
        }
      }
    }
  }
}
