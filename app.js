const ChessGameState = window.__chessGameState;
const cancelPendingAiTurn = window.__cancelPendingAiTurn;
const createUiController = window.__createUiController;
const createAiController = window.__createAiController;
const createGameController = window.__createGameController;

    /* =========================================================================
       AUDIO ENGINE (Procedural Web Audio API)
       ========================================================================= */
    class AudioEngine {
      constructor() {
        this.ctx = null;
        this.enabled = true;
      }

      init() {
        if (!this.ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      }

      playHover() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
      }

      playSlide() {
        if (!this.enabled) return;
        this.init();
        // Low stone sliding rumble
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, this.ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(150, this.ctx.currentTime + 0.3);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
      }

      playImpact() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
      }

      playShatter() {
        if (!this.enabled) return;
        this.init();
        // High frequency noise burst + low thud
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();

        this.playImpact();
      }

      playCheck() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.6);
      }
    }

    const audio = new AudioEngine();
    window.audio = audio;

    /* =========================================================================
       3D GRAPHICS & SCENE SETUP
       ========================================================================= */
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0b10);
    const sceneFog = new THREE.FogExp2(0x0a0b10, 0.025);
    scene.fog = sceneFog;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going below floor
    controls.minDistance = 6;
    controls.maxDistance = 25;

    // Camera Presets
    const CAM_PRESETS = [
      { pos: new THREE.Vector3(0, 10, 11), target: new THREE.Vector3(0, 0, 0) }, // Default White Angle
      { pos: new THREE.Vector3(0, 15, 0.1), target: new THREE.Vector3(0, 0, 0) }, // Top Down Tactical
      { pos: new THREE.Vector3(0, 10, -11), target: new THREE.Vector3(0, 0, 0) }, // Black Angle
    ];
    let currentCamIdx = 0;

    function applyCameraPreset(idx) {
      currentCamIdx = idx;
      const targetPos = CAM_PRESETS[idx].pos;
      const targetLook = CAM_PRESETS[idx].target;
      
      const startPos = camera.position.clone();
      const startTarget = controls.target.clone();
      const startTime = performance.now();
      const duration = 1000;

      function animCam(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 0.5 - Math.cos(progress * Math.PI) / 2; // Smooth step

        camera.position.lerpVectors(startPos, targetPos, ease);
        controls.target.lerpVectors(startTarget, targetLook, ease);
        controls.update();

        if (progress < 1) {
          requestAnimationFrame(animCam);
        }
      }
      requestAnimationFrame(animCam);
    }

    /* =========================================================================
       LIGHTING & CATHEDRAL ENVIRONMENT
       ========================================================================= */
    const ambientLight = new THREE.AmbientLight(0x2a2838, 0.8);
    scene.add(ambientLight);

    // Warm Directional Sunlight / Stained Glass Light
    const keyLight = new THREE.DirectionalLight(0xffe8d6, 1.8);
    keyLight.position.set(8, 18, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Subtle Cool Fill Light
    const fillLight = new THREE.DirectionalLight(0x4a6fa5, 0.6);
    fillLight.position.set(-8, 12, -8);
    scene.add(fillLight);

    // Torch point lights
    const torchColors = [0xff7700, 0xff5500];
    const torchPositions = [
      [-9, 4, -9], [9, 4, -9], [-9, 4, 9], [9, 4, 9]
    ];
    const torchLights = [];

    torchPositions.forEach((pos, i) => {
      const pLight = new THREE.PointLight(torchColors[i % 2], 1.2, 15);
      pLight.position.set(...pos);
      scene.add(pLight);
      torchLights.push(pLight);
    });

    // Build Gothic Cathedral Architecture
    const cathedralFloorMat = new THREE.MeshStandardMaterial({
      color: 0x0f1118,
      roughness: 0.4,
      metalness: 0.1,
    });
    const cathedralPillarMat = new THREE.MeshStandardMaterial({ color: 0x1a1c23, roughness: 0.8 });

    function buildCathedral() {
      const cathedralGroup = new THREE.Group();

      // Stone floor
      const floorGeo = new THREE.PlaneGeometry(50, 50);
      const floor = new THREE.Mesh(floorGeo, cathedralFloorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.1;
      floor.receiveShadow = true;
      cathedralGroup.add(floor);

      // Pillars
      const pillarGeo = new THREE.CylinderGeometry(0.6, 0.8, 20, 8);

      const pillarX = [-10, 10];
      const pillarZ = [-12, -4, 4, 12];

      pillarX.forEach(x => {
        pillarZ.forEach(z => {
          const pillar = new THREE.Mesh(pillarGeo, cathedralPillarMat);
          pillar.position.set(x, 10, z);
          pillar.castShadow = true;
          pillar.receiveShadow = true;
          cathedralGroup.add(pillar);
        });
      });

      return cathedralGroup;
    }
    const cathedralEnvironment = buildCathedral();
    scene.add(cathedralEnvironment);

    const voxelEnvironment = new THREE.Group();
    const voxelGroundMat = new THREE.MeshStandardMaterial({ color: 0x354d2c, roughness: 1 });
    const voxelGrassMat = new THREE.MeshStandardMaterial({ color: 0x658b3d, roughness: 1 });
    const voxelGrassTopMat = new THREE.MeshStandardMaterial({ color: 0x8caf50, roughness: 1 });
    const voxelDirtMat = new THREE.MeshStandardMaterial({ color: 0x70513a, roughness: 1 });
    const voxelTrunkMat = new THREE.MeshStandardMaterial({ color: 0x6c4a2d, roughness: 1 });
    const voxelLeafMat = new THREE.MeshStandardMaterial({ color: 0x4b7838, roughness: 1 });
    const voxelLightLeafMat = new THREE.MeshStandardMaterial({ color: 0x658f40, roughness: 1 });

    function addVoxelBlock(width, height, depth, x, y, z, material, parent = voxelEnvironment) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      block.position.set(x, y, z);
      block.castShadow = true;
      block.receiveShadow = true;
      parent.add(block);
      return block;
    }

    function addVoxelTree(x, z, scale = 1) {
      const trunkHeight = 2.2 * scale;
      addVoxelBlock(0.55 * scale, trunkHeight, 0.55 * scale, x, trunkHeight / 2 - 0.08, z, voxelTrunkMat);
      addVoxelBlock(2.1 * scale, 0.8 * scale, 2.1 * scale, x, trunkHeight + 0.15 * scale, z, voxelLeafMat);
      addVoxelBlock(1.65 * scale, 0.8 * scale, 1.65 * scale, x, trunkHeight + 0.85 * scale, z, voxelLightLeafMat);
      addVoxelBlock(1.05 * scale, 0.65 * scale, 1.05 * scale, x, trunkHeight + 1.55 * scale, z, voxelLeafMat);
    }

    function buildVoxelEnvironment() {
      const landscape = new THREE.Group();
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), voxelGroundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.105;
      ground.receiveShadow = true;
      landscape.add(ground);

      const edgePositions = [
        [-9, -9], [-12, -5], [-10, 1], [-12, 8],
        [9, -9], [12, -5], [10, 1], [12, 8],
        [-5, -12], [5, -12],
      ];

      edgePositions.forEach(([x, z], index) => {
        const width = index % 2 === 0 ? 2.8 : 2.2;
        const depth = index % 2 === 0 ? 2.4 : 2.8;
        addVoxelBlock(width, 0.75, depth, x, 0.275, z, voxelDirtMat, landscape);
        addVoxelBlock(width, 0.18, depth, x, 0.74, z, voxelGrassTopMat, landscape);
        addVoxelBlock(width * 0.78, 0.48, depth * 0.78, x, 1.1, z, voxelGrassMat, landscape);
      });

      addVoxelTree(-8.2, -5.5, 1.05);
      addVoxelTree(8.2, -5.5, 1.05);
      addVoxelTree(-8.5, 5.5, 0.9);
      addVoxelTree(8.5, 5.5, 0.9);
      addVoxelTree(-5.8, -10.5, 0.8);
      addVoxelTree(5.8, -10.5, 0.8);

      const cloudMat = new THREE.MeshStandardMaterial({ color: 0xb9d3d5, roughness: 1 });
      [[-11, 7, -8], [10, 8, -10], [0, 9, -14]].forEach(([x, y, z]) => {
        addVoxelBlock(2.8, 0.65, 1.2, x, y, z, cloudMat, landscape);
        addVoxelBlock(1.5, 0.55, 1.1, x + 0.9, y + 0.45, z, cloudMat, landscape);
        addVoxelBlock(1.3, 0.45, 1, x - 0.8, y + 0.35, z, cloudMat, landscape);
      });

      return landscape;
    }

    const voxelLandscape = buildVoxelEnvironment();
    voxelEnvironment.add(voxelLandscape);
    scene.add(voxelEnvironment);
    voxelEnvironment.visible = false;

    // Dust particle atmospheric system
    const particleCount = 150;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 20;
      particlePos[i + 1] = Math.random() * 12;
      particlePos[i + 2] = (Math.random() - 0.5) * 20;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.06,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    /* =========================================================================
       CHESSBOARD & HIGHLIGHTS
       ========================================================================= */
    const BOARD_SIZE = 8;
    const TILE_SIZE = 1.0;
    const OFFSET = (BOARD_SIZE * TILE_SIZE) / 2 - TILE_SIZE / 2;

    const boardGroup = new THREE.Group();
    const tiles = []; // 2D array [rank][file]

    const THEME_PALETTES = {
      classic: {
        label: 'Classic',
        icon: 'castle',
        background: 0x0a0b10,
        fog: 0x0a0b10,
        fogDensity: 0.025,
        ambient: 0x2a2838,
        keyLight: 0xffe8d6,
        fillLight: 0x4a6fa5,
        particle: 0xffd700,
        lightTile: 0xd8d3c8,
        darkTile: 0x1f232d,
        frame: 0x0c0e14,
        whitePiece: 0xf4f1ea,
        blackPiece: 0x12141a,
      },
      walnut: {
        label: 'Walnut',
        icon: 'forest',
        background: 0x0a0b10,
        fog: 0x0a0b10,
        fogDensity: 0.025,
        ambient: 0x2a2838,
        keyLight: 0xffe8d6,
        fillLight: 0x4a6fa5,
        particle: 0xffd700,
        lightTile: 0xd9b98a,
        darkTile: 0x4a3126,
        frame: 0x2b1d15,
        whitePiece: 0xf5ead2,
        blackPiece: 0x241915,
      },
      emerald: {
        label: 'Emerald',
        icon: 'eco',
        background: 0x0a0b10,
        fog: 0x0a0b10,
        fogDensity: 0.025,
        ambient: 0x2a2838,
        keyLight: 0xffe8d6,
        fillLight: 0x4a6fa5,
        particle: 0xffd700,
        lightTile: 0xd9ead8,
        darkTile: 0x163c39,
        frame: 0x0b2d2c,
        whitePiece: 0xf1f7ee,
        blackPiece: 0x112322,
      },
      voxel: {
        label: 'Voxel Grove',
        icon: 'grid_4x4',
        background: 0x6fa8c8,
        fog: 0x6fa8c8,
        fogDensity: 0.012,
        ambient: 0xc7dfa0,
        keyLight: 0xfff0cf,
        fillLight: 0x88b9d2,
        particle: 0xd9f0a2,
        lightTile: 0x91b85b,
        darkTile: 0x526f3d,
        frame: 0x493a2a,
        whitePiece: 0xe9e2c8,
        blackPiece: 0x374735,
      },
    };
    const DEFAULT_THEME = 'classic';
    const initialTheme = THEME_PALETTES[DEFAULT_THEME];

    const lightTileMat = new THREE.MeshStandardMaterial({
      color: initialTheme.lightTile,
      roughness: 0.3,
      metalness: 0.1,
    });
    const darkTileMat = new THREE.MeshStandardMaterial({
      color: initialTheme.darkTile,
      roughness: 0.5,
      metalness: 0.2,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: initialTheme.frame,
      roughness: 0.6,
      metalness: 0.5,
    });

    const tileGeo = new THREE.BoxGeometry(TILE_SIZE, 0.2, TILE_SIZE);

    for (let rank = 0; rank < 8; rank++) {
      tiles[rank] = [];
      for (let file = 0; file < 8; file++) {
        const isLight = (rank + file) % 2 === 0;
        const tile = new THREE.Mesh(tileGeo, isLight ? lightTileMat : darkTileMat);
        
        // Position coordinates mapping: file 0..7 -> X, rank 0..7 -> Z
        const x = file * TILE_SIZE - OFFSET;
        const z = (7 - rank) * TILE_SIZE - OFFSET; // Rank 8 at top (-Z)
        
        tile.position.set(x, 0, z);
        tile.receiveShadow = true;
        tile.userData = { rank, file, algebraic: String.fromCharCode(97 + file) + (rank + 1) };
        
        boardGroup.add(tile);
        tiles[rank][file] = tile;
      }
    }

    // Outer Wooden / Metallic Frame
    const frameGeo = new THREE.BoxGeometry(8.8, 0.25, 8.8);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, -0.05, 0);
    frame.receiveShadow = true;
    boardGroup.add(frame);

    scene.add(boardGroup);

    // Highlight Overlay Mesh Indicators
    const highlightGeo = new THREE.RingGeometry(0.15, 0.38, 32);
    highlightGeo.rotateX(-Math.PI / 2);

    const selectHighlightMat = new THREE.MeshBasicMaterial({ color: 0x9333ea, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const moveHighlightMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const attackHighlightMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });

    const highlightsPool = [];
    function getHighlightMesh() {
      let mesh = highlightsPool.find(m => !m.visible);
      if (!mesh) {
        mesh = new THREE.Mesh(highlightGeo, moveHighlightMat);
        scene.add(mesh);
        highlightsPool.push(mesh);
      }
      mesh.visible = true;
      return mesh;
    }

    function clearHighlights() {
      highlightsPool.forEach(m => m.visible = false);
    }

    /* =========================================================================
       PROCEDURAL 3D PIECE GENERATOR
       ========================================================================= */
    const whitePieceMat = new THREE.MeshStandardMaterial({
      color: initialTheme.whitePiece,
      roughness: 0.18,
      metalness: 0.12,
      bumpScale: 0.05
    });
    const blackPieceMat = new THREE.MeshStandardMaterial({
      color: initialTheme.blackPiece,
      roughness: 0.24,
      metalness: 0.45,
      bumpScale: 0.05
    });

    // Gold / Rune trim for elite status
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.85
    });
    const obsidianRuneMat = new THREE.MeshStandardMaterial({
      color: 0x9333ea,
      roughness: 0.2,
      metalness: 0.7,
      emissive: 0x6b21a8,
      emissiveIntensity: 0.35
    });

    const voxelPieceMaterials = {
      w: {
        base: new THREE.MeshStandardMaterial({ color: 0xe9e2c8, roughness: 0.9 }),
        light: new THREE.MeshStandardMaterial({ color: 0xf8f3dd, roughness: 0.9 }),
        dark: new THREE.MeshStandardMaterial({ color: 0xa99c79, roughness: 0.9 }),
        accent: new THREE.MeshStandardMaterial({ color: 0x7d9c49, roughness: 0.9 }),
      },
      b: {
        base: new THREE.MeshStandardMaterial({ color: 0x526f3d, roughness: 0.9 }),
        light: new THREE.MeshStandardMaterial({ color: 0x78964c, roughness: 0.9 }),
        dark: new THREE.MeshStandardMaterial({ color: 0x394b32, roughness: 0.9 }),
        accent: new THREE.MeshStandardMaterial({ color: 0x6d5235, roughness: 0.9 }),
      },
    };

    function createVoxelPieceGeometry(type, color) {
      const group = new THREE.Group();
      const materials = voxelPieceMaterials[color];

      function addBlock(width, height, depth, x, y, z, material = materials.base) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
        block.position.set(x, y, z);
        group.add(block);
        return block;
      }

      addBlock(0.78, 0.16, 0.78, 0, 0.08, 0, materials.dark);
      addBlock(0.64, 0.12, 0.64, 0, 0.22, 0, materials.accent);
      addBlock(0.72, 0.07, 0.72, 0, 0.29, 0, materials.light);

      switch (type.toLowerCase()) {
        case 'p':
          addBlock(0.4, 0.42, 0.4, 0, 0.53, 0);
          addBlock(0.52, 0.1, 0.52, 0, 0.79, 0, materials.accent);
          addBlock(0.4, 0.38, 0.4, 0, 1.03, 0, materials.light);
          addBlock(0.46, 0.09, 0.46, 0, 1.265, 0, materials.base);
          addBlock(0.14, 0.1, 0.14, 0, 1.36, 0, materials.accent);
          break;
        case 'r':
          addBlock(0.54, 0.68, 0.54, 0, 0.66, 0);
          addBlock(0.68, 0.12, 0.68, 0, 1.06, 0, materials.accent);
          addBlock(0.74, 0.16, 0.74, 0, 1.2, 0, materials.light);
          addBlock(0.17, 0.2, 0.17, -0.26, 1.38, -0.26, materials.light);
          addBlock(0.17, 0.2, 0.17, 0.26, 1.38, -0.26, materials.light);
          addBlock(0.17, 0.2, 0.17, -0.26, 1.38, 0.26, materials.light);
          addBlock(0.17, 0.2, 0.17, 0.26, 1.38, 0.26, materials.light);
          addBlock(0.44, 0.12, 0.44, 0, 1.34, 0, materials.dark);
          addBlock(0.12, 0.34, 0.12, 0, 0.66, 0.29, materials.dark);
          break;
        case 'n':
          addBlock(0.48, 0.5, 0.46, 0, 0.58, 0.04);
          addBlock(0.3, 0.5, 0.3, 0, 1.04, -0.12, materials.light);
          addBlock(0.4, 0.38, 0.42, 0, 1.32, 0.08, materials.light);
          addBlock(0.3, 0.2, 0.3, 0, 1.16, 0.3, materials.accent);
          addBlock(0.22, 0.14, 0.18, 0, 1.22, 0.52, materials.dark);
          addBlock(0.1, 0.12, 0.1, -0.12, 1.4, 0.18, materials.dark);
          addBlock(0.1, 0.12, 0.1, 0.12, 1.4, 0.18, materials.dark);
          addBlock(0.1, 0.32, 0.12, -0.2, 1.56, -0.1, materials.accent);
          addBlock(0.1, 0.32, 0.12, 0.2, 1.56, -0.1, materials.accent);
          addBlock(0.48, 0.1, 0.48, 0, 0.88, 0.04, materials.accent);
          break;
        case 'b':
          addBlock(0.48, 0.62, 0.48, 0, 0.68, 0);
          addBlock(0.58, 0.12, 0.58, 0, 1.05, 0, materials.accent);
          addBlock(0.4, 0.34, 0.4, 0, 1.28, 0, materials.light);
          addBlock(0.28, 0.22, 0.28, 0, 1.55, 0, materials.accent);
          addBlock(0.12, 0.16, 0.12, 0, 1.74, 0, materials.light);
          addBlock(0.08, 0.28, 0.08, 0, 0.69, 0.26, materials.dark);
          addBlock(0.28, 0.08, 0.08, 0, 0.72, 0.26, materials.dark);
          break;
        case 'q':
          addBlock(0.56, 0.72, 0.56, 0, 0.73, 0, materials.light);
          addBlock(0.68, 0.14, 0.68, 0, 1.16, 0, materials.accent);
          addBlock(0.76, 0.12, 0.76, 0, 1.29, 0, materials.dark);
          addBlock(0.16, 0.28, 0.16, -0.27, 1.49, -0.27, materials.light);
          addBlock(0.16, 0.28, 0.16, 0.27, 1.49, -0.27, materials.light);
          addBlock(0.16, 0.28, 0.16, -0.27, 1.49, 0.27, materials.light);
          addBlock(0.16, 0.28, 0.16, 0.27, 1.49, 0.27, materials.light);
          addBlock(0.2, 0.18, 0.2, 0, 1.46, 0, materials.accent);
          addBlock(0.1, 0.24, 0.1, 0, 1.67, 0, materials.light);
          addBlock(0.44, 0.1, 0.44, 0, 0.88, 0.03, materials.accent);
          break;
        case 'k':
          addBlock(0.58, 0.78, 0.58, 0, 0.76, 0, materials.light);
          addBlock(0.66, 0.12, 0.66, 0, 1.21, 0, materials.accent);
          addBlock(0.76, 0.14, 0.76, 0, 1.34, 0, materials.dark);
          addBlock(0.42, 0.16, 0.42, 0, 1.49, 0, materials.light);
          addBlock(0.14, 0.42, 0.14, 0, 1.78, 0, materials.accent);
          addBlock(0.38, 0.14, 0.14, 0, 1.88, 0, materials.accent);
          addBlock(0.1, 0.16, 0.1, 0, 2.07, 0, materials.light);
          addBlock(0.48, 0.1, 0.48, 0, 0.94, 0.03, materials.accent);
          break;
      }

      group.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      return group;
    }

    /* Helper: Procedural Lathe / Tiered Gothic Pedestal */
    function createGothicPedestal(baseRadius = 0.38, topRadius = 0.28, height = 0.22) {
      const group = new THREE.Group();

      // Lower beveled plinth
      const plinthGeo = new THREE.CylinderGeometry(baseRadius, baseRadius * 1.08, height * 0.4, 24);
      const plinth = new THREE.Mesh(plinthGeo);
      plinth.position.y = height * 0.2;
      group.add(plinth);

      // Torus decorative collar
      const collarGeo = new THREE.TorusGeometry(baseRadius * 0.92, 0.035, 12, 24);
      collarGeo.rotateX(Math.PI / 2);
      const collar = new THREE.Mesh(collarGeo);
      collar.position.y = height * 0.42;
      group.add(collar);

      // Fluted concavity up to waist
      const waistGeo = new THREE.CylinderGeometry(topRadius, baseRadius * 0.85, height * 0.6, 24);
      const waist = new THREE.Mesh(waistGeo);
      waist.position.y = height * 0.72;
      group.add(waist);

      return group;
    }

    function createPieceGeometry(type) {
      const group = new THREE.Group();
      const isBlack = false; // Materials will be applied uniformly afterwards

      switch (type.toLowerCase()) {
        case 'p': { // PAWN: Gothic Sentinel
          const pedestal = createGothicPedestal(0.32, 0.22, 0.18);
          
          // Tapered body with waist ring
          const bodyGeo = new THREE.CylinderGeometry(0.14, 0.22, 0.38, 16);
          const body = new THREE.Mesh(bodyGeo);
          body.position.y = 0.36;

          const ringGeo = new THREE.TorusGeometry(0.16, 0.025, 8, 20);
          ringGeo.rotateX(Math.PI / 2);
          const ring = new THREE.Mesh(ringGeo);
          ring.position.y = 0.54;

          const neckGeo = new THREE.CylinderGeometry(0.11, 0.14, 0.12, 16);
          const neck = new THREE.Mesh(neckGeo);
          neck.position.y = 0.61;

          // Spherical finial head with pinnacle spike
          const headGeo = new THREE.SphereGeometry(0.16, 20, 20);
          const head = new THREE.Mesh(headGeo);
          head.position.y = 0.76;

          const spikeGeo = new THREE.ConeGeometry(0.05, 0.14, 12);
          const spike = new THREE.Mesh(spikeGeo);
          spike.position.y = 0.94;

          group.add(pedestal, body, ring, neck, head, spike);
          break;
        }

        case 'r': { // ROOK: Fortified Gothic Bastion
          const pedestal = createGothicPedestal(0.38, 0.3, 0.22);
          
          // Fluted stone tower
          const towerGeo = new THREE.CylinderGeometry(0.27, 0.32, 0.55, 20);
          const tower = new THREE.Mesh(towerGeo);
          tower.position.y = 0.48;

          // Machicolation cornice
          const corniceGeo = new THREE.CylinderGeometry(0.35, 0.27, 0.12, 20);
          const cornice = new THREE.Mesh(corniceGeo);
          cornice.position.y = 0.78;

          // Hollow battlement core
          const coreGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.16, 20);
          const core = new THREE.Mesh(coreGeo);
          core.position.y = 0.88;
          group.add(pedestal, tower, cornice, core);

          // 4 Gothic crenellation merlons
          const merlonGeo = new THREE.BoxGeometry(0.12, 0.16, 0.12);
          const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
          angles.forEach(ang => {
            const merlon = new THREE.Mesh(merlonGeo);
            merlon.position.set(Math.cos(ang) * 0.24, 0.94, Math.sin(ang) * 0.24);
            merlon.rotation.y = -ang;
            group.add(merlon);
          });
          break;
        }

        case 'n': { // KNIGHT: War Stallion / Armored Gargoyle Charger
          const pedestal = createGothicPedestal(0.36, 0.27, 0.2);

          // Torso & Neck angled forward
          const neckGeo = new THREE.CylinderGeometry(0.15, 0.24, 0.45, 12);
          const neck = new THREE.Mesh(neckGeo);
          neck.position.set(0, 0.44, -0.06);
          neck.rotation.x = -0.35;

          // Sculpted Snout & Head
          const headGeo = new THREE.BoxGeometry(0.2, 0.26, 0.36);
          const head = new THREE.Mesh(headGeo);
          head.position.set(0, 0.68, 0.1);
          head.rotation.x = 0.28;

          // Muzzle muzzle snout taper
          const muzzleGeo = new THREE.BoxGeometry(0.16, 0.16, 0.2);
          const muzzle = new THREE.Mesh(muzzleGeo);
          muzzle.position.set(0, 0.58, 0.28);
          muzzle.rotation.x = 0.35;

          // Armored Gothic Mane Crest
          const maneGeo = new THREE.BoxGeometry(0.06, 0.46, 0.14);
          const mane = new THREE.Mesh(maneGeo);
          mane.position.set(0, 0.62, -0.16);
          mane.rotation.x = -0.4;

          // Pointed Ears
          const earGeo = new THREE.ConeGeometry(0.04, 0.15, 8);
          const earLeft = new THREE.Mesh(earGeo);
          earLeft.position.set(0.07, 0.85, -0.02);
          earLeft.rotation.z = -0.2;
          const earRight = new THREE.Mesh(earGeo);
          earRight.position.set(-0.07, 0.85, -0.02);
          earRight.rotation.z = 0.2;

          group.add(pedestal, neck, head, muzzle, mane, earLeft, earRight);
          break;
        }

        case 'b': { // BISHOP: Cathedral Cleric Mitre
          const pedestal = createGothicPedestal(0.35, 0.25, 0.2);

          // Slender fluted column
          const columnGeo = new THREE.CylinderGeometry(0.16, 0.26, 0.5, 18);
          const column = new THREE.Mesh(columnGeo);
          column.position.y = 0.44;

          // Ornamental ring collar
          const collarGeo = new THREE.TorusGeometry(0.18, 0.03, 8, 20);
          collarGeo.rotateX(Math.PI / 2);
          const collar = new THREE.Mesh(collarGeo);
          collar.position.y = 0.68;

          // Oval Mitre Head
          const mitreGeo = new THREE.SphereGeometry(0.21, 20, 20);
          mitreGeo.scale(0.8, 1.4, 0.8);
          const mitre = new THREE.Mesh(mitreGeo);
          mitre.position.y = 0.94;

          // Cathedral Miter Slit / Cross Cut Accent
          const cutGeo = new THREE.BoxGeometry(0.05, 0.24, 0.35);
          const cutAccent = new THREE.Mesh(cutGeo);
          cutAccent.position.set(0, 0.98, 0);
          cutAccent.rotation.y = Math.PI / 4;

          // Top jewel orb
          const orbGeo = new THREE.SphereGeometry(0.065, 12, 12);
          const orb = new THREE.Mesh(orbGeo);
          orb.position.y = 1.25;

          group.add(pedestal, column, collar, mitre, cutAccent, orb);
          break;
        }

        case 'q': { // QUEEN: Royal Sovereign Coronet
          const pedestal = createGothicPedestal(0.38, 0.28, 0.22);

          // Grand Imperial Dress Column
          const gownGeo = new THREE.CylinderGeometry(0.18, 0.29, 0.65, 20);
          const gown = new THREE.Mesh(gownGeo);
          gown.position.y = 0.52;

          // Lower neck torus
          const neckCollarGeo = new THREE.TorusGeometry(0.2, 0.035, 8, 24);
          neckCollarGeo.rotateX(Math.PI / 2);
          const neckCollar = new THREE.Mesh(neckCollarGeo);
          neckCollar.position.y = 0.84;

          // Flared Coronet Crown base
          const crownBaseGeo = new THREE.CylinderGeometry(0.3, 0.18, 0.28, 18);
          const crownBase = new THREE.Mesh(crownBaseGeo);
          crownBase.position.y = 1.0;

          // Coronet tines/petals
          const tinesCount = 8;
          for (let i = 0; i < tinesCount; i++) {
            const ang = (i / tinesCount) * Math.PI * 2;
            const tineGeo = new THREE.ConeGeometry(0.04, 0.14, 8);
            const tine = new THREE.Mesh(tineGeo);
            tine.position.set(Math.cos(ang) * 0.28, 1.18, Math.sin(ang) * 0.28);
            group.add(tine);
          }

          // Sovereign pearl orb
          const orbGeo = new THREE.SphereGeometry(0.09, 16, 16);
          const orb = new THREE.Mesh(orbGeo);
          orb.position.y = 1.25;

          group.add(pedestal, gown, neckCollar, crownBase, orb);
          break;
        }

        case 'k': { // KING: High Gothic Monarch with Imperial Cross
          const pedestal = createGothicPedestal(0.4, 0.3, 0.24);

          // Majestic Robed Column
          const robeGeo = new THREE.CylinderGeometry(0.21, 0.32, 0.7, 24);
          const robe = new THREE.Mesh(robeGeo);
          robe.position.y = 0.56;

          // Double collar
          const collarGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 24);
          collarGeo.rotateX(Math.PI / 2);
          const collar = new THREE.Mesh(collarGeo);
          collar.position.y = 0.92;

          // Arched Crown Cap
          const capGeo = new THREE.CylinderGeometry(0.3, 0.22, 0.22, 20);
          const cap = new THREE.Mesh(capGeo);
          cap.position.y = 1.06;

          const domeGeo = new THREE.SphereGeometry(0.26, 18, 18);
          domeGeo.scale(1, 0.6, 1);
          const dome = new THREE.Mesh(domeGeo);
          dome.position.y = 1.18;

          // Sacred Cross Finial (Gothic Crux)
          const crossVGeo = new THREE.BoxGeometry(0.07, 0.28, 0.07);
          const crossV = new THREE.Mesh(crossVGeo);
          crossV.position.y = 1.42;

          const crossHGeo = new THREE.BoxGeometry(0.22, 0.07, 0.07);
          const crossH = new THREE.Mesh(crossHGeo);
          crossH.position.y = 1.44;

          const crossJewelGeo = new THREE.SphereGeometry(0.045, 10, 10);
          const crossJewel = new THREE.Mesh(crossJewelGeo);
          crossJewel.position.y = 1.44;

          group.add(pedestal, robe, collar, cap, dome, crossV, crossH, crossJewel);
          break;
        }
      }

      // Enable realistic soft shadows for all piece components
      group.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      return group;
    }

    /* =========================================================================
       PARTICLE FX & SHATTER EXPLOSIONS
       ========================================================================= */
    const activeExplosions = [];

    function triggerShatterExplosion(position, isWhite) {
      const fragmentCount = 25;
      const fragments = [];
      const fragGeo = new THREE.TetrahedronGeometry(0.08, 1);
      const fragMat = isWhite ? whitePieceMat : blackPieceMat;

      const group = new THREE.Group();
      group.position.copy(position);

      for (let i = 0; i < fragmentCount; i++) {
        const mesh = new THREE.Mesh(fragGeo, fragMat);
        mesh.position.set(
          (Math.random() - 0.5) * 0.2,
          Math.random() * 0.4,
          (Math.random() - 0.5) * 0.2
        );
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

        const velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 5 + 2,
          (Math.random() - 0.5) * 4
        );

        group.add(mesh);
        fragments.push({ mesh, velocity, rotVel: (Math.random() - 0.5) * 10 });
      }

      scene.add(group);
      audio.playShatter();

      activeExplosions.push({
        group,
        fragments,
        startTime: performance.now(),
        duration: 1200
      });
    }

    function updateExplosions(now) {
      for (let i = activeExplosions.length - 1; i >= 0; i--) {
        const exp = activeExplosions[i];
        const elapsed = (now - exp.startTime) / 1000;

        if (elapsed > exp.duration / 1000) {
          scene.remove(exp.group);
          activeExplosions.splice(i, 1);
          continue;
        }

        exp.fragments.forEach(f => {
          f.mesh.position.addScaledVector(f.velocity, 0.016);
          f.velocity.y -= 9.8 * 0.016; // Gravity
          f.mesh.rotation.x += f.rotVel * 0.016;
          
          // Floor collision bounce
          if (f.mesh.position.y < 0) {
            f.mesh.position.y = 0;
            f.velocity.y *= -0.4;
          }
        });
      }
    }

    /* =========================================================================
       GAME STATE & CHESS ENGINE INTEGRATION
       ========================================================================= */
    const game = new Chess();
    const pieceMap = new Map(); // Square 'e4' -> THREE.Group Mesh
    const gameState = ChessGameState;

    function getSquareCoords(square) {
      const file = square.charCodeAt(0) - 97;
      const rank = parseInt(square[1]) - 1;
      return {
        x: file * TILE_SIZE - OFFSET,
        z: (7 - rank) * TILE_SIZE - OFFSET,
        file,
        rank
      };
    }

    function applyTheme(themeName) {
      const selectedTheme = THEME_PALETTES[themeName] ? themeName : DEFAULT_THEME;
      const theme = THEME_PALETTES[selectedTheme];
      const isVoxelTheme = selectedTheme === 'voxel';
      gameState.theme = selectedTheme;

      scene.background.setHex(theme.background);
      sceneFog.color.setHex(theme.fog);
      sceneFog.density = theme.fogDensity;
      ambientLight.color.setHex(theme.ambient);
      ambientLight.intensity = isVoxelTheme ? 0.65 : 0.8;
      keyLight.color.setHex(theme.keyLight);
      keyLight.intensity = isVoxelTheme ? 1.35 : 1.8;
      fillLight.color.setHex(theme.fillLight);
      particleMat.color.setHex(theme.particle);
      voxelEnvironment.visible = isVoxelTheme;
      cathedralEnvironment.visible = !isVoxelTheme;
      const subtitle = document.getElementById('game-subtitle');
      if (subtitle) subtitle.textContent = isVoxelTheme ? 'Voxel Grove' : 'Gothic Sanctuary';
      torchLights.forEach((light) => {
        light.visible = !isVoxelTheme;
      });

      lightTileMat.color.setHex(theme.lightTile);
      darkTileMat.color.setHex(theme.darkTile);
      frameMat.color.setHex(theme.frame);
      whitePieceMat.color.setHex(theme.whitePiece);
      blackPieceMat.color.setHex(theme.blackPiece);

      tiles.forEach((row) => {
        row.forEach((tile) => {
          const isLight = (tile.userData.rank + tile.userData.file) % 2 === 0;
          tile.material = isLight ? lightTileMat : darkTileMat;
        });
      });

      if (frame) {
        frame.material = frameMat;
      }

      syncBoardPieces();

      const themeLabel = document.getElementById('theme-label');
      const themeIcon = document.getElementById('theme-icon');
      if (themeLabel) themeLabel.textContent = theme.label;
      if (themeIcon) themeIcon.textContent = theme.icon;
    }

    function syncBoardPieces() {
      // Clear existing 3d piece meshes
      pieceMap.forEach(mesh => scene.remove(mesh));
      pieceMap.clear();

      const board = game.board();
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const piece = board[r][f];
          if (piece) {
            const square = String.fromCharCode(97 + f) + (8 - r);
            const isVoxelTheme = gameState.theme === 'voxel';
            const pieceMesh = isVoxelTheme
              ? createVoxelPieceGeometry(piece.type, piece.color)
              : createPieceGeometry(piece.type);
            
            // Assign material
            if (!isVoxelTheme) {
              const mat = piece.color === 'w' ? whitePieceMat : blackPieceMat;
              pieceMesh.traverse(c => { if (c.isMesh) c.material = mat; });
            }

            const coords = getSquareCoords(square);
            pieceMesh.position.set(coords.x, 0, coords.z);
            
            // Orient black pieces facing white
            if (piece.color === 'b') {
              pieceMesh.rotation.y = Math.PI;
            }

            pieceMesh.userData = { square, piece };
            scene.add(pieceMesh);
            pieceMap.set(square, pieceMesh);
          }
        }
      }
    }

    syncBoardPieces();
    applyTheme(gameState.theme || DEFAULT_THEME);

    /* =========================================================================
       PIECE MOVEMENT & COMBAT
       ========================================================================= */
    function animateMove(fromSquare, toSquare, isCapture, onComplete) {
      const pieceMesh = pieceMap.get(fromSquare);
      if (!pieceMesh) return;

      const targetCoords = getSquareCoords(toSquare);
      const endPos = new THREE.Vector3(targetCoords.x, 0, targetCoords.z);
      const capturedMesh = pieceMap.get(toSquare);

      pieceMesh.position.copy(endPos);

      if (isCapture && capturedMesh && capturedMesh.visible) {
        capturedMesh.visible = false;
        triggerShatterExplosion(endPos, capturedMesh.userData.piece.color === 'w');
      }

      if (onComplete) onComplete();
    }

    /* =========================================================================
       AI ENGINE (Minimax with Alpha-Beta & Piece-Square Evaluation)
       ========================================================================= */
    const PIECE_VALUES = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };

    const PAWN_TABLE = [
      [0,  0,  0,  0,  0,  0,  0,  0],
      [5, 10, 10,-20,-20, 10, 10,  5],
      [1, -1, -2,  0,  0, -2, -1,  1],
      [0,  0,  0,  2,  2,  0,  0,  0],
      [0,  0,  1,  2,  2,  1,  0,  0],
      [1,  1,  2,  3,  3,  2,  1,  1],
      [5,  5,  5,  5,  5,  5,  5,  5],
      [0,  0,  0,  0,  0,  0,  0,  0]
    ];

    const KNIGHT_TABLE = [
      [-5,-4,-3,-3,-3,-3,-4,-5],
      [-4,-2,  0,  0,  0,  0,-2,-4],
      [-3,  0,  1,  1,  1,  1,  0,-3],
      [-3,  0,  1,  2,  2,  1,  0,-3],
      [-3,  0,  1,  2,  2,  1,  0,-3],
      [-3,  0,  1,  1,  1,  1,  0,-3],
      [-4,-2,  0,  0,  0,  0,-2,-4],
      [-5,-4,-3,-3,-3,-3,-4,-5]
    ];

    function evaluateBoard(chessInstance) {
      let totalEval = 0;
      const board = chessInstance.board();

      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const piece = board[r][f];
          if (!piece) continue;

          let val = PIECE_VALUES[piece.type] || 0;
          if (piece.type === 'p') {
            val += (piece.color === 'w' ? PAWN_TABLE[r][f] : PAWN_TABLE[7 - r][f]) * 0.1;
          } else if (piece.type === 'n') {
            val += (piece.color === 'w' ? KNIGHT_TABLE[r][f] : KNIGHT_TABLE[7 - r][f]) * 0.1;
          }

          if (piece.color === 'w') {
            totalEval += val;
          } else {
            totalEval -= val;
          }
        }
      }
      return totalEval;
    }

    function minimax(chessInstance, depth, alpha, beta, isMaximizing) {
      if (depth === 0 || chessInstance.game_over()) {
        return evaluateBoard(chessInstance);
      }

      const moves = chessInstance.moves();
      if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
          chessInstance.move(move);
          const evaluation = minimax(chessInstance, depth - 1, alpha, beta, false);
          chessInstance.undo();
          maxEval = Math.max(maxEval, evaluation);
          alpha = Math.max(alpha, evaluation);
          if (beta <= alpha) break;
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for (const move of moves) {
          chessInstance.move(move);
          const evaluation = minimax(chessInstance, depth - 1, alpha, beta, true);
          chessInstance.undo();
          minEval = Math.min(minEval, evaluation);
          beta = Math.min(beta, evaluation);
          if (beta <= alpha) break;
        }
        return minEval;
      }
    }

    function chooseAiMove() {
      return aiController.chooseAiMove();
    }

    const turnDot = document.getElementById('turn-dot');
    const turnText = document.getElementById('turn-text');
    const aiThinkingEl = document.getElementById('ai-thinking');
    const historyList = document.getElementById('move-history-list');
    const capturedWhiteEl = document.getElementById('captured-white');
    const capturedBlackEl = document.getElementById('captured-black');

    const modalGameOver = document.getElementById('modal-gameover');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');

    const aiController = createAiController({
      game,
      gameState,
      minimax,
    });

    const uiController = createUiController({
      game,
      gameState,
      elements: {
        turnDot,
        turnText,
        aiThinkingEl,
        historyList,
        capturedWhiteEl,
        capturedBlackEl,
      }
    });

    function updateTurnIndicator() {
      return uiController.updateTurnIndicator();
    }

    function updateCapturedList() {
      return uiController.updateCapturedList();
    }

    function updateMoveHistoryList() {
      return uiController.updateMoveHistoryList();
    }

    function checkGameOver() {
      if (game.in_checkmate()) {
        const winner = game.turn() === 'w' ? 'Black (Obsidian)' : 'White (Marble)';
        modalTitle.textContent = `${winner} Prevails!`;
        modalDesc.textContent = 'A decisive checkmate has shattered the adversary’s throne.';
        modalGameOver.classList.remove('opacity-0', 'pointer-events-none');
        audio.playCheck();
      } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
        modalTitle.textContent = 'Truce of Shadows';
        modalDesc.textContent = 'The grand sanctuary falls silent. The duel ended in a draw.';
        modalGameOver.classList.remove('opacity-0', 'pointer-events-none');
      } else if (game.in_check()) {
        audio.playCheck();
      }
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const gameController = createGameController({
      game,
      gameState,
      getSquareCoords,
      clearHighlights,
      getHighlightMesh,
      selectHighlightMat,
      moveHighlightMat,
      attackHighlightMat,
      syncBoardPieces,
      updateTurnIndicator,
      updateCapturedList,
      updateMoveHistoryList,
      checkGameOver,
      animateMove,
      aiController,
      cancelPendingAiTurn,
    });

    function showTileHighlights(fromSquare) {
      return gameController.showTileHighlights(fromSquare);
    }

    function executeMove(moveObj) {
      return gameController.executeMove(moveObj);
    }

    function onPointerDown(event) {
      if (gameState.isAIThinking || gameState.isAnimating || game.game_over()) return;

      // Only respond to left click or touch
      if (event.button !== undefined && event.button !== 0) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check intersect with tiles or pieces
      const clickableObjects = [];
      tiles.forEach(row => row.forEach(t => clickableObjects.push(t)));
      pieceMap.forEach(p => {
        p.traverse(c => {
          if (c.isMesh) clickableObjects.push(c);
        });
      });

      const intersects = raycaster.intersectObjects(clickableObjects, false);
      if (intersects.length === 0) return;

      const hit = intersects[0].object;
      let clickedSquare = null;

      // Extract algebraic notation from tile or piece parent
      if (hit.userData && hit.userData.algebraic) {
        clickedSquare = hit.userData.algebraic;
      } else {
        let parent = hit.parent;
        while (parent && (!parent.userData || !parent.userData.square)) {
          parent = parent.parent;
        }
        if (parent && parent.userData && parent.userData.square) {
          clickedSquare = parent.userData.square;
        }
      }

      if (!clickedSquare) return;

      gameController.handleSelection(clickedSquare);
    }

    window.addEventListener('pointerdown', onPointerDown);

    document.getElementById('btn-sound').addEventListener('click', function() {
      audio.enabled = !audio.enabled;
      const icon = this.querySelector('.material-symbols-outlined');
      icon.textContent = audio.enabled ? 'volume_up' : 'volume_off';
    });

    document.getElementById('btn-camera').addEventListener('click', () => {
      const nextIdx = (currentCamIdx + 1) % CAM_PRESETS.length;
      applyCameraPreset(nextIdx);
    });

    const sideDrawer = document.getElementById('side-drawer');
    document.getElementById('btn-history-toggle').addEventListener('click', () => {
      sideDrawer.classList.toggle('translate-x-[120%]');
    });
    document.getElementById('btn-close-drawer').addEventListener('click', () => {
      sideDrawer.classList.add('translate-x-[120%]');
    });

    document.getElementById('btn-flip').addEventListener('click', () => {
      gameState.isFlipped = !gameState.isFlipped;
      applyCameraPreset(gameState.isFlipped ? 2 : 0);
    });

    const themeSelector = document.getElementById('theme-selector');
    const themeMenu = document.getElementById('theme-menu');
    const themeSelectButton = document.getElementById('btn-theme-select');

    function setThemeMenuOpen(isOpen) {
      themeMenu.classList.toggle('opacity-0', !isOpen);
      themeMenu.classList.toggle('pointer-events-none', !isOpen);
      themeMenu.classList.toggle('opacity-100', isOpen);
      themeMenu.classList.toggle('pointer-events-auto', isOpen);
      themeSelectButton.setAttribute('aria-expanded', String(isOpen));
    }

    themeSelectButton.addEventListener('click', () => {
      const isOpen = themeSelectButton.getAttribute('aria-expanded') === 'true';
      setThemeMenuOpen(!isOpen);
    });

    document.addEventListener('click', (event) => {
      if (!themeSelector.contains(event.target)) {
        setThemeMenuOpen(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setThemeMenuOpen(false);
      }
    });

    document.querySelectorAll('.theme-opt').forEach((opt) => {
      opt.addEventListener('click', (event) => {
        const themeName = event.currentTarget.dataset.theme;
        applyTheme(themeName);
        setThemeMenuOpen(false);
      });
    });

    function resetGame() {
      return gameController.reset();
    }

    document.getElementById('btn-restart').addEventListener('click', resetGame);
    document.getElementById('btn-modal-restart').addEventListener('click', resetGame);

    document.getElementById('btn-undo').addEventListener('click', () => {
      gameController.undo();
    });

    // Mode dropdown selection
    document.querySelectorAll('.mode-opt').forEach(opt => {
      opt.addEventListener('click', (e) => {
        gameState.gameMode = e.currentTarget.dataset.mode;
        const labels = {
          'pvp': '2 Player Local',
          'ai-easy': 'AI: Novice',
          'ai-medium': 'AI: Apprentice',
          'ai-hard': 'AI: Archmage'
        };
        const icons = {
          'pvp': 'group',
          'ai-easy': 'sentiment_satisfied',
          'ai-medium': 'smart_toy',
          'ai-hard': 'psychology'
        };
        document.getElementById('mode-label').textContent = labels[gameState.gameMode];
        document.getElementById('mode-icon').textContent = icons[gameState.gameMode];
        resetGame();
      });
    });

    // Handle Window Resizing
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    applyCameraPreset(0);
    updateTurnIndicator();

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const time = performance.now() * 0.001;
      const now = performance.now();

      // Atmospheric torch flicker
      torchLights.forEach((light, i) => {
        light.intensity = 1.0 + Math.sin(time * 6 + i * 2) * 0.25 + (Math.random() - 0.5) * 0.1;
      });

      // Dust particle floating drift
      const positions = particleGeo.attributes.position.array;
      for (let i = 1; i < particleCount * 3; i += 3) {
        positions[i] += Math.sin(time + i) * 0.003;
        if (positions[i] > 12) positions[i] = 0;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Update piece explosion fragments
      updateExplosions(now);

      controls.update();
      renderer.render(scene, camera);
    }

    window.onload = function() {
      animate();
    };
  