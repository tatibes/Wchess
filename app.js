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
    scene.fog = new THREE.FogExp2(0x0a0b10, 0.025);

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
    function buildCathedral() {
      const cathedralGroup = new THREE.Group();

      // Stone floor
      const floorGeo = new THREE.PlaneGeometry(50, 50);
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x0f1118,
        roughness: 0.4,
        metalness: 0.1,
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.1;
      floor.receiveShadow = true;
      cathedralGroup.add(floor);

      // Pillars
      const pillarGeo = new THREE.CylinderGeometry(0.6, 0.8, 20, 8);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1a1c23, roughness: 0.8 });

      const pillarX = [-10, 10];
      const pillarZ = [-12, -4, 4, 12];

      pillarX.forEach(x => {
        pillarZ.forEach(z => {
          const pillar = new THREE.Mesh(pillarGeo, pillarMat);
          pillar.position.set(x, 10, z);
          pillar.castShadow = true;
          pillar.receiveShadow = true;
          cathedralGroup.add(pillar);
        });
      });

      scene.add(cathedralGroup);
    }
    buildCathedral();

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

    // Marble tile vs Obsidian tile materials
    const lightTileMat = new THREE.MeshStandardMaterial({
      color: 0xd8d3c8,
      roughness: 0.3,
      metalness: 0.1,
    });
    const darkTileMat = new THREE.MeshStandardMaterial({
      color: 0x1f232d,
      roughness: 0.5,
      metalness: 0.2,
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
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.6, metalness: 0.5 });
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
      color: 0xf4f1ea,
      roughness: 0.18,
      metalness: 0.12,
      bumpScale: 0.05
    });
    const blackPieceMat = new THREE.MeshStandardMaterial({
      color: 0x12141a,
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
            const pieceMesh = createPieceGeometry(piece.type);
            
            // Assign material
            const mat = piece.color === 'w' ? whitePieceMat : blackPieceMat;
            pieceMesh.traverse(c => { if (c.isMesh) c.material = mat; });

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

    /* =========================================================================
       ANIMATED PIECE MOVEMENT & COMBAT
       ========================================================================= */
    function animateMove(fromSquare, toSquare, isCapture, onComplete) {
      const pieceMesh = pieceMap.get(fromSquare);
      if (!pieceMesh) return;

      const targetCoords = getSquareCoords(toSquare);
      const startPos = pieceMesh.position.clone();
      const endPos = new THREE.Vector3(targetCoords.x, 0, targetCoords.z);

      const capturedMesh = pieceMap.get(toSquare);
      pieceMesh.userData.isAnimating = true;

      const startTime = performance.now();
      const duration = isCapture ? 800 : 500;

      audio.playSlide();

      function animStep(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Arc trajectory
        const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, progress);
        currentPos.y = Math.sin(progress * Math.PI) * (isCapture ? 1.5 : 0.6);
        pieceMesh.position.copy(currentPos);

        // Mid-point capture shatter trigger
        if (isCapture && progress >= 0.5 && capturedMesh && capturedMesh.visible) {
          capturedMesh.visible = false;
          triggerShatterExplosion(endPos, capturedMesh.userData.piece.color === 'w');
        }

        if (progress < 1) {
          requestAnimationFrame(animStep);
        } else {
          pieceMesh.position.copy(endPos);
          pieceMesh.userData.isAnimating = false;
          if (onComplete) onComplete();
        }
      }

      requestAnimationFrame(animStep);
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

      // Subtle piece levitation & breathing idle animation
      pieceMap.forEach((mesh, sq) => {
        if (mesh.userData && mesh.userData.isAnimating) {
          return;
        }

        if (gameState.selectedSquare === sq) {
          // Floating higher when selected
          mesh.position.y = 0.25 + Math.sin(time * 5) * 0.08;
        } else {
          const fileIndex = sq.charCodeAt(0) - 97;
          mesh.position.y = Math.sin(time * 2 + fileIndex) * 0.02;
        }
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
  