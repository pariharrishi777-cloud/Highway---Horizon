// Procedural Canvas-based High-Res Textures for Highway Horizon 3D
const TextureFactory = {
  // Road Texture: 4-lane highway with yellow center line, white lane dashed lines, and asphalt texture
  createRoadTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base asphalt dark grey
    ctx.fillStyle = '#1e2124';
    ctx.fillRect(0, 0, 1024, 1024);

    // Add asphalt gravel noise
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 22;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
      data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Tire wear marks in driving lanes
    ctx.fillStyle = 'rgba(10, 12, 14, 0.35)';
    ctx.fillRect(200, 0, 80, 1024);
    ctx.fillRect(360, 0, 80, 1024);
    ctx.fillRect(580, 0, 80, 1024);
    ctx.fillRect(740, 0, 80, 1024);

    // Outer Shoulder Solid White Lines (edges)
    ctx.fillStyle = '#f1f5f9';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 4;
    ctx.fillRect(60, 0, 14, 1024); // Left edge line
    ctx.fillRect(950, 0, 14, 1024); // Right edge line

    // Center Double Solid Yellow Lines
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
    ctx.shadowBlur = 6;
    ctx.fillRect(504, 0, 10, 1024);
    ctx.fillRect(520, 0, 10, 1024);

    // Inner Dashed White Lane Lines (Lanes 1 & 2, Lanes 3 & 4)
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 4;

    const dashHeight = 120;
    const gapHeight = 136;
    for (let y = 0; y < 1024; y += dashHeight + gapHeight) {
      ctx.fillRect(280, y, 8, dashHeight); // Left lane separator
      ctx.fillRect(734, y, 8, dashHeight); // Right lane separator
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 10);
    texture.anisotropy = 16;
    return texture;
  },

  // Grass / Nature Ground Texture with organic variations
  createGrassTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base lush forest green
    ctx.fillStyle = '#1c4d25';
    ctx.fillRect(0, 0, 512, 512);

    // Patches of lighter emerald and darker forest hues
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 10 + Math.random() * 35;
      const greenHues = ['#226633', '#1e5229', '#2a7c3e', '#174020', '#123319'];
      ctx.fillStyle = greenHues[Math.floor(Math.random() * greenHues.length)];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Organic noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 35;
      data[i] = Math.max(0, Math.min(255, data[i] + n * 0.5));
      data[i+1] = Math.max(0, Math.min(255, data[i+1] + n));
      data[i+2] = Math.max(0, Math.min(255, data[i+2] + n * 0.5));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(24, 24);
    return texture;
  },

  // Mountain Cliff / Rock Texture
  createMountainTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#f1f5f9'); // Snow crest
    grad.addColorStop(0.25, '#94a3b8'); // Slate rock
    grad.addColorStop(0.7, '#475569'); // Dark stone
    grad.addColorStop(1, '#1e293b'); // Base pine forest zone

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Cliff stratus lines
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    for (let i = 0; i < 50; i++) {
      const y = Math.random() * 512;
      const h = 2 + Math.random() * 12;
      ctx.fillRect(0, y, 512, h);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  },

  // Guardrail texture with warning hazard stripes
  createGuardrailTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#94a3b8'; // Metal galvanized steel
    ctx.fillRect(0, 0, 128, 32);

    // Steel highlight
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 6, 128, 8);

    // Red highway reflectors at intervals
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(20, 10, 12, 12);
    ctx.fillRect(84, 10, 12, 12);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(80, 1);
    return texture;
  },

  // Tree Foliage Pine Pattern
  createFoliageTexture: function(colorHex = '#155e2d') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 128, 128);

    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#166534' : '#14532d';
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 6, 6);
    }

    return new THREE.CanvasTexture(canvas);
  },

  // Highway Overhead Billboard / Sign
  createSignTexture: function(text1 = "PARADISE VALLEY", text2 = "12 KM ➜") {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Highway green background
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 512, 128);

    // White border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 116);

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text1, 256, 55);

    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.fillText(text2, 256, 100);

    return new THREE.CanvasTexture(canvas);
  }
};
