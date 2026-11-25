/* =====================================================================
 * game.js — ម៉ាស៊ីនហ្គេម «អង្គរ: ដំណើរផ្សងព្រេង» (Angkor: The Adventure)
 * ---------------------------------------------------------------------
 * ឯកសារនេះមាន៖
 *   ១. ការរៀបចំ Three.js (ឆាក កាមេរ៉ា ពន្លឺ មេឃ)
 *   ២. ការសាងសង់ពិភពលោក (ប្រាសាទអង្គរវត្ត ផ្សារ ភូមិ ទីក្រុងទំនើប ទន្លេ)
 *   ៣. តួអង្គខ្មែរ (ប្រុស/ស្រី) និងអាវុធ (ដាវ/កាំបិត)
 *   ៤. អ្នកលេង កាមេរ៉ា Third-person ការប៉ះទង្គិច
 *   ៥. សត្រូវ ប្រព័ន្ធប្រយុទ្ធ កាក់ប្រាក់
 *   ៦. យានជំនិះ (ម៉ូតូ រថយន្ត ទូកង)
 *   ៧. របៀបលេងទាំង ៥ (ផ្សងព្រេង ប្រយុទ្ធ បេសកកម្ម ប្រណាំង ពហុអ្នកលេង)
 *   ៨. ផែនទីតូច (Minimap)
 * ឯកសារនេះប្រើ AG.ui, AG.audio, AG.input, AG.t ដែលកំណត់ក្នុង main.js
 * ===================================================================== */
(function () {
  'use strict';
  const AG = (window.AG = window.AG || {});
  const G = (AG.game = {});
  const T = THREE;

  // ជំនួយ៖ ហៅមុខងារ UI/សំឡេង ដោយសុវត្ថិភាព (បើមិនទាន់មាន ក៏មិនខូច)
  const ui = new Proxy({}, { get: (_, k) => (...a) => (AG.ui && AG.ui[k] ? AG.ui[k](...a) : undefined) });
  const sfx = (n, o) => AG.audio && AG.audio.play(n, o);
  const t = (k, ...a) => (AG.t ? AG.t(k, ...a) : k);
  const input = () => AG.input || { keys: {}, dx: 0, dy: 0 };

  const HALF = 198;            // ព្រំដែនពិភពលោក
  const RIVER = { z0: 135, z1: 175 };
  G.HALF = HALF;

  // លេខចៃដន្យដែលមានគ្រាប់ពូជ (ពិភពលោកដូចគ្នារាល់ពេល)
  let seed = 20261125;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rr = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  // =================================================================
  // ១. ការរៀបចំ Three.js
  // =================================================================
  let renderer, scene, camera, sun, sky;
  const SUN_DIR = new T.Vector3(-0.45, 0.42, 0.8).normalize();

  G.init = function (canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // ទូរស័ព្ទ៖ បន្ថយភាពច្បាស់បន្តិច ដើម្បីឲ្យលេងបានរលូន
    G.mobile = matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio, G.mobile ? 1.25 : 1.75));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    scene = new T.Scene();
    scene.fog = new T.Fog(0xf3cf94, 90, 330);
    camera = new T.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1200);
    fitCamera();
    G.scene = scene; G.camera = camera;

    // មេឃពណ៌មាសពេលរសៀល (Shader gradient)
    sky = new T.Mesh(new T.SphereGeometry(900, 32, 16), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color(0x5b8fd0) }, mid: { value: new T.Color(0xf4c47e) },
        hor: { value: new T.Color(0xffe1a6) }, sd: { value: SUN_DIR } },
      vertexShader: 'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform vec3 top,mid,hor,sd;varying vec3 v;void main(){float h=v.y;
        vec3 c=mix(hor,mid,smoothstep(0.,.18,h));c=mix(c,top,smoothstep(.18,.75,h));
        if(h<0.)c=hor*.95;float s=max(dot(v,sd),0.);
        c+=vec3(1.,.8,.45)*pow(s,10.)*.35+vec3(1.,.95,.7)*pow(s,300.);gl_FragColor=vec4(c,1.);}`
    }));
    scene.add(sky);

    scene.add(new T.HemisphereLight(0xfff0d0, 0x5a6b30, 0.75));
    sun = new T.DirectionalLight(0xffe0b0, 0.95);
    sun.castShadow = true;
    sun.shadow.mapSize.set(G.mobile ? 1024 : 2048, G.mobile ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 220 });
    sun.shadow.bias = -0.0006;
    scene.add(sun, sun.target);

    buildWorld();
    createPlayer();
    addEventListener('resize', () => {
      fitCamera();
      renderer.setSize(innerWidth, innerHeight);
    });
    G.clock = new T.Clock();
    requestAnimationFrame(loop);
  };

  // ទូរស័ព្ទបញ្ឈរ៖ ពង្រីកមុំមើល ដើម្បីឲ្យឃើញទូលាយ
  function fitCamera() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1 ? 80 : 62;
    camera.updateProjectionMatrix();
  }

  // =================================================================
  // ២. ឧបករណ៍ជំនួយសម្រាប់សាងសង់
  // =================================================================
  const BOX = new T.BoxGeometry(1, 1, 1);
  const matCache = {};
  // សម្ភារៈ Low-poly (cache តាមពណ៌ ដើម្បីលឿន)
  const M = (c, o = {}) => {
    const key = c + JSON.stringify(o);
    return matCache[key] || (matCache[key] = new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, o)));
  };
  const C = { // ពណ៌ប្រពៃណីខ្មែរ៖ មាស និងក្រហម
    grass: 0x6e9e3e, asphalt: 0x3b3d42, line: 0xf2c94c, sand: 0xd9bf8a, stone: 0xb89c74, stoneD: 0x8e7656,
    stoneL: 0xcdb48c, wood: 0x7a4a28, woodL: 0xa8703c, roof: 0xa33a24, gold: 0xd4a52a, red: 0xb3261e,
    cream: 0xeedcb4, water: 0x4f86a8, skin: 0xb97a4e
  };

  const solids = [];   // ប្រអប់ប៉ះទង្គិច {x0,x1,z0,z1,top,water}
  const mapRects = []; // សម្រាប់ផែនទីតូច
  function addSolid(x0, x1, z0, z1, top = Infinity, water = false) { solids.push({ x0, x1, z0, z1, top, water }); }
  function mapRect(x0, x1, z0, z1, color) { mapRects.push({ x0, x1, z0, z1, color }); }

  // box(): ប្រអប់មួយ (y = បាត) ហើយបើ sol ត្រូវបានផ្ដល់ → បន្ថែមការប៉ះទង្គិច
  function box(w, h, d, x, y, z, m, parent, sol) {
    const b = new T.Mesh(BOX, typeof m === 'number' ? M(m) : m);
    b.scale.set(w, h, d); b.position.set(x, y + h / 2, z);
    b.castShadow = b.receiveShadow = true;
    (parent || scene).add(b);
    if (sol !== undefined) addSolid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, sol === true ? y + h : sol);
    return b;
  }
  // part(): ប្រអប់សម្រាប់តួអង្គ (y = ចំណុចកណ្ដាល)
  function part(parent, w, h, d, x, y, z, m) {
    const b = new T.Mesh(BOX, m); b.scale.set(w, h, d); b.position.set(x, y, z);
    b.castShadow = true; parent.add(b); return b;
  }

  // កម្ពស់ផ្ទៃដីនៅចំណុច (x,z)
  function floorAt(x, z) {
    let f = 0;
    for (const s of solids) if (s.top !== Infinity && x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1 && s.top > f) f = s.top;
    return f;
  }
  // តើកន្លែងនេះត្រូវបានរាំងទេ? (r = កាំ, step = កម្ពស់អាចឡើងបាន)
  function blocked(x, z, y, r = 0.4, opt = {}) {
    if (Math.abs(x) > HALF || Math.abs(z) > HALF) return true;
    const step = opt.step ?? 0.4;
    for (const s of solids) {
      if (s.water && opt.boat) continue;
      if (x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1 && s.top > y + step) return true;
    }
    if (opt.boat && !(z - r > RIVER.z0 && z + r < RIVER.z1)) return true;
    return false;
  }
  G.floorAt = floorAt; G.blocked = blocked;

  // Texture តូចៗ (បង្កើតដោយ Canvas គ្មានរូបភាពខាងក្រៅ)
  function canvasTex(w, h, draw, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tx = new T.CanvasTexture(c);
    if (rep) { tx.wrapS = tx.wrapT = T.RepeatWrapping; }
    return tx;
  }
  // ក្រមាក្រឡាចត្រង្គ ក្រហម-ស
  const kramaTex = canvasTex(32, 32, (g) => {
    g.fillStyle = '#f5efe0'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = 'rgba(179,38,30,.85)';
    for (let i = 0; i < 32; i += 8) { g.fillRect(i, 0, 4, 32); g.fillRect(0, i, 32, 4); }
  }, true);
  kramaTex.repeat.set(2, 2);
  const kramaMat = new T.MeshStandardMaterial({ map: kramaTex, roughness: 1 });

  // =================================================================
  // ៣. ការសាងសង់ពិភពលោក
  // =================================================================
  const roads = [
    [-110, 110, 110, 110], [110, 110, 110, -90], [110, -90, -110, -90], [-110, -90, -110, 110], // ផ្លូវក្រវ៉ាត់ (ring)
    [0, -105, 0, 110],   // មហាវិថីខាងជើង-ត្បូង
    [-110, 0, 110, 0]    // មហាវិថីខាងកើត-លិច
  ];
  const ROAD_W = 12;
  const palmSpots = [], treeSpots = [];
  G.roads = roads;

  function buildWorld() {
    // ---------- ផ្ទៃដី ----------
    const ground = new T.Mesh(new T.PlaneGeometry(HALF * 2 + 40, HALF * 2 + 40), M(C.grass, { roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    // ---------- ផ្លូវធំៗ ----------
    const dashGeo = new T.BoxGeometry(0.35, 0.02, 3);
    const dashes = [];
    for (const [x0, z0, x1, z1] of roads) {
      const len = Math.hypot(x1 - x0, z1 - z0) + ROAD_W;
      const horiz = z0 === z1;
      const r = new T.Mesh(BOX, M(C.asphalt, { roughness: 1 }));
      r.scale.set(horiz ? len : ROAD_W, 0.04, horiz ? ROAD_W : len);
      r.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); r.receiveShadow = true; scene.add(r);
      // គែមផ្លូវពណ៌ស្រាល
      for (const s of [-1, 1]) {
        const e = new T.Mesh(BOX, M(0xcfc6b0)); e.scale.set(horiz ? len : 0.5, 0.06, horiz ? 0.5 : len);
        e.position.set((x0 + x1) / 2 + (horiz ? 0 : s * ROAD_W / 2), 0.03, (z0 + z1) / 2 + (horiz ? s * ROAD_W / 2 : 0));
        scene.add(e);
      }
      const n = Math.floor(len / 7);
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n;
        dashes.push([x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, horiz]);
      }
      mapRect(Math.min(x0, x1) - (horiz ? 0 : ROAD_W / 2), Math.max(x0, x1) + (horiz ? 0 : ROAD_W / 2),
        Math.min(z0, z1) - (horiz ? ROAD_W / 2 : 0), Math.max(z0, z1) + (horiz ? ROAD_W / 2 : 0), '#4a4c52');
    }
    const dm = new T.InstancedMesh(dashGeo, M(C.line), dashes.length);
    const o = new T.Object3D();
    dashes.forEach(([x, z, h], i) => { o.position.set(x, 0.05, z); o.rotation.y = h ? Math.PI / 2 : 0; o.updateMatrix(); dm.setMatrixAt(i, o.matrix); });
    scene.add(dm);

    // ---------- ទន្លេ (ខាងត្បូង) ----------
    const water = new T.Mesh(BOX, M(C.water, { roughness: 0.15, metalness: 0.35 }));
    water.scale.set(HALF * 2 + 40, 0.06, RIVER.z1 - RIVER.z0); water.position.set(0, 0.03, (RIVER.z0 + RIVER.z1) / 2);
    water.receiveShadow = true; scene.add(water);
    G.water = water;
    addSolid(-HALF - 20, HALF + 20, RIVER.z0, RIVER.z1, Infinity, true);
    box(HALF * 2 + 40, 0.06, 19, 0, 0, 125.5, C.sand);          // ឆ្នេរខ្សាច់/មាត់ទន្លេ
    box(HALF * 2 + 40, 0.06, HALF - RIVER.z1 + 20, 0, 0, (RIVER.z1 + HALF + 20) / 2, M(0x7aa848)); // ច្រាំងម្ខាងទៀត
    mapRect(-HALF, HALF, RIVER.z0, RIVER.z1, '#4f86a8');
    for (let x = -180; x <= 180; x += 24) { streetLamp(x, 120); }

    buildAngkorWat(0, -150);
    buildMonument();
    buildMarket(55, 55);
    buildVillage();
    buildCity();
    buildForest();

    // ដើមត្នោតតាមផ្លូវ និងជុំវិញ
    for (let z = -80; z <= 92; z += 12) { if (Math.abs(z) > 20) { addPalm(-8.5, z, rr(7, 9)); addPalm(8.5, z + 6, rr(7, 9)); } }
    for (let i = 0; i < 220; i++) {
      const x = (rnd() - 0.5) * 390, z = (rnd() - 0.5) * 390;
      if (z > 112 && z < 182) continue;                               // ទន្លេ
      if (Math.abs(x) < 120 && z > -98 && z < 120) continue;          // ក្នុងទីក្រុង
      if (Math.abs(x) < 52 && z < -98) continue;                      // ប្រាសាទ
      if (x < -118 && z > 5 && z < 125) continue;                     // វាលស្រែ
      if (blocked(x, z, 0, 1.5)) continue;
      addPalm(x, z, 6 + rnd() * 5);
    }
    buildPalms();
    buildRice();
  }

  // ---------- ចង្កៀងផ្លូវ (ពណ៌មាស) ----------
  function streetLamp(x, z) {
    box(0.18, 4.2, 0.18, x, 0, z, 0x2b2b2b);
    box(0.6, 0.45, 0.6, x, 4.2, z, M(C.gold, { emissive: 0x553300 }));
    addSolid(x - 0.2, x + 0.2, z - 0.2, z + 0.2);
  }

  // ---------- ប្រាសាទអង្គរវត្ត ----------
  function tower(x, z, y, s, parent) {
    const p = parent || scene;
    let size = 3.2 * s, yy = y;
    box(size * 1.15, 1.4 * s, size * 1.15, x, yy, z, C.stoneD, p); yy += 1.4 * s;
    for (let i = 0; i < 7; i++) {
      const h = 0.9 * s;
      box(size, h, size, x, yy, z, i % 2 ? C.stoneL : C.stone, p);
      if (i % 2 === 0) for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]])
        box(size * 0.18, h * 0.6, size * 0.18, x + dx * size / 2, yy + h, z + dz * size / 2, C.stoneD, p);
      yy += h; size *= 0.83;
    }
    const tip = box(size * 0.7, 1.3 * s, size * 0.7, x, yy, z, C.stoneL, p); tip.rotation.y = Math.PI / 4;
    box(size * 0.25, 1 * s, size * 0.25, x, yy + 1.3 * s, z, C.stoneD, p);
  }
  function buildAngkorWat(cx, cz) {
    // គូទឹក
    const moat = new T.Mesh(BOX, M(C.water, { roughness: 0.15, metalness: 0.35 }));
    moat.scale.set(90, 0.08, 90); moat.position.set(cx, 0.02, cz); scene.add(moat);
    addSolid(cx - 45, cx - 3, cz + 38, cz + 45); addSolid(cx + 3, cx + 45, cz + 38, cz + 45);   // ខាងត្បូង (ទុកស្ពាន)
    addSolid(cx - 45, cx + 45, cz - 45, cz - 38);
    addSolid(cx - 45, cx - 38, cz - 38, cz + 38); addSolid(cx + 38, cx + 45, cz - 38, cz + 38);
    mapRect(cx - 45, cx + 45, cz - 45, cz + 45, '#4f86a8');
    // កោះ និងស្ពាន
    box(76, 0.3, 76, cx, 0, cz, M(0x79a84a), null, 0.3);
    box(6, 0.3, 9, cx, 0, cz + 41.5, C.stoneL, null, 0.3);
    for (const sx of [-3.2, 3.2]) box(0.5, 0.7, 9, cx + sx, 0.3, cz + 41.5, C.stoneD); // ដងស្ពាននាគ
    mapRect(cx - 38, cx + 38, cz - 38, cz + 38, '#79a84a');
    // រោងព័ទ្ធជុំវិញ មានខ្លោងទ្វារខាងត្បូង
    const W = 28, Z0 = cz + 22, Z1 = cz - 32, H = 3.4;
    box(W - 4, H, 1.2, cx - (W + 4) / 2, 0.3, Z0, C.stone, null, Infinity);
    box(W - 4, H, 1.2, cx + (W + 4) / 2, 0.3, Z0, C.stone, null, Infinity);
    box(W * 2, H, 1.2, cx, 0.3, Z1, C.stone, null, Infinity);
    box(1.2, H, Z0 - Z1, cx - W, 0.3, (Z0 + Z1) / 2, C.stone, null, Infinity);
    box(1.2, H, Z0 - Z1, cx + W, 0.3, (Z0 + Z1) / 2, C.stone, null, Infinity);
    for (let i = -W; i <= W; i += 4) { box(1.5, 0.5, 1.5, cx + i, 0.3 + H, Z0, C.stoneD); box(1.5, 0.5, 1.5, cx + i, 0.3 + H, Z1, C.stoneD); }
    box(8.6, 1.4, 2, cx, 0.3 + H, Z0, C.stoneD);
    tower(cx, Z0, 0.3 + H + 1.4, 0.6);
    mapRect(cx - W, cx + W, Z1, Z0, '#b89c74');
    // ថ្នាក់បី (លោតឡើងបាន) + ជណ្ដើរ
    const tiers = [[32, 28, 0.3], [22, 19, 1.8], [14, 14, 3.3]];
    for (const [w, d, y] of tiers) {
      box(w, 1.5, d, cx, y, cz, C.stone, null, y + 1.5);
      box(w + 0.5, 0.25, d + 0.5, cx, y + 1.5, cz, C.stoneD);
      const zs = cz + d / 2 + 1;
      box(4, 0.75, 2, cx, y, zs, C.stoneL, null, y + 0.75);
    }
    const TOP = 4.8;
    for (const [dx, dz] of [[-5.2, -5.2], [5.2, -5.2], [-5.2, 5.2], [5.2, 5.2]]) {
      tower(cx + dx, cz + dz, TOP, 0.8);
      addSolid(cx + dx - 1.5, cx + dx + 1.5, cz + dz - 1.5, cz + dz + 1.5);
    }
    tower(cx, cz, TOP, 1.25);
    addSolid(cx - 2.3, cx + 2.3, cz - 2.3, cz + 2.3);
    G.templeGate = new T.Vector3(cx, 0.3, cz + 46);
  }

  // ---------- វិមានឯករាជ្យ (កណ្ដាលផ្លូវរង្វង់) ----------
  function buildMonument() {
    const ring = new T.Mesh(new T.CylinderGeometry(17, 17, 0.05, 32), M(C.asphalt, { roughness: 1 }));
    ring.position.y = 0.03; scene.add(ring);
    const lawn = new T.Mesh(new T.CylinderGeometry(9.5, 9.5, 0.3, 24), M(0x7fb04a)); lawn.position.y = 0.15; scene.add(lawn);
    const red = M(0xb5654a), redL = M(0xc98466);
    box(8, 1.2, 8, 0, 0.3, 0, red, null, Infinity);
    let s = 6.6, y = 1.5;
    for (let i = 0; i < 5; i++) {
      box(s, 1.9, s, 0, y, 0, i % 2 ? redL : red);
      for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const c = new T.Mesh(new T.ConeGeometry(0.35, 1.1, 6), M(C.gold));
        c.position.set(dx * s / 2, y + 2.4, dz * s / 2); c.castShadow = true; scene.add(c);
      }
      y += 1.9; s *= 0.78;
    }
    const spire = new T.Mesh(new T.ConeGeometry(s * 0.6, 3.5, 8), M(C.gold)); spire.position.set(0, y + 1.75, 0); scene.add(spire);
    mapRect(-5, 5, -5, 5, '#c46a4a');
  }

  // ---------- ផ្សារធំថ្មី (ដំបូលមូល) និងតូបលក់ ----------
  function buildMarket(cx, cz) {
    box(78, 0.08, 78, cx, 0, cz, M(0xd8c9a8));
    mapRect(cx - 39, cx + 39, cz - 39, cz + 39, '#d8c9a8');
    const yellow = M(0xead08a);
    const base = new T.Mesh(new T.CylinderGeometry(12, 12.5, 6, 8), yellow); base.position.set(cx, 3, cz); base.castShadow = base.receiveShadow = true; scene.add(base);
    const dome = new T.Mesh(new T.SphereGeometry(11.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf1dc9c, { flatShading: true }));
    dome.position.set(cx, 6, cz); dome.castShadow = true; scene.add(dome);
    box(2.4, 2.4, 2.4, cx, 17, cz, yellow); box(1, 1.5, 1, cx, 19.4, cz, M(C.gold));
    for (let i = 0; i < 4; i++) { // ស្លាបទាំង ៤
      const a = i * Math.PI / 2, dx = Math.round(Math.sin(a)), dz = Math.round(Math.cos(a));
      box(dx ? 14 : 10, 5, dx ? 10 : 14, cx + dx * 18, 0, cz + dz * 18, yellow, null, Infinity);
      box(dx ? 14.6 : 10.6, 0.6, dx ? 10.6 : 14.6, cx + dx * 18, 5, cz + dz * 18, M(C.red));
    }
    addSolid(cx - 12, cx + 12, cz - 12, cz + 12);
    mapRect(cx - 12, cx + 12, cz - 12, cz + 12, '#ead08a');
    // តូបលក់ មានដំបូលឆ្នូតក្រហម-មាស
    for (const z of [cz - 33, cz + 33]) for (let x = cx - 28; x <= cx + 28; x += 8) stall(x, z);
    for (const x of [cx - 33, cx + 33]) for (let z = cz - 20; z <= cz + 20; z += 8) stall(x, z);
  }
  function stall(x, z) {
    for (const [dx, dz] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) box(0.12, 2.4, 0.12, x + dx, 0, z + dz, C.wood);
    box(3.4, 0.9, 1.6, x, 0, z, C.woodL, null, Infinity);
    for (let i = 0; i < 4; i++) box(0.85, 0.12, 2.8, x - 1.275 + i * 0.85, 2.4, z, M(i % 2 ? C.gold : C.red));
    const goods = [0xe85d2a, 0x7cbf3a, 0xf2d04a, 0x9c4dcc];
    for (let i = 0; i < 3; i++) box(0.6, 0.3, 0.6, x - 1 + i, 0.9, z, M(goods[(x + z + i) & 3]));
    mapRect(x - 1.7, x + 1.7, z - 1.3, z + 1.3, '#b3261e');
  }

  // ---------- ផ្ទះខ្មែរបុរាណ (ផ្ទះឈើខ្ពស់ ដំបូលពីរជាន់) ----------
  function khmerHouse(x, z, rot = 0, s = 1) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot; g.scale.setScalar(s);
    for (const px of [-2.6, 0, 2.6]) for (const pz of [-2.1, 2.1]) box(0.3, 2.2, 0.3, px, 0, pz, C.wood, g);
    box(6, 0.25, 5, 0, 2.2, 0, C.woodL, g);
    box(5.2, 2.1, 4.2, 0, 2.45, 0, C.wood, g);
    box(1, 1.6, 0.1, 0, 2.45, 2.12, 0x3a2414, g);
    for (const wx of [-1.7, 1.7]) box(0.8, 0.6, 0.1, wx, 3.2, 2.12, 0x3a2414, g);
    const roof = new T.Mesh(new T.ConeGeometry(1, 1, 4), M(C.roof));
    roof.rotation.y = Math.PI / 4; roof.scale.set(4.9, 3.2, 4.1); roof.position.y = 6.15; roof.castShadow = true;
    const roof2 = roof.clone(); roof2.scale.set(2.6, 2, 2); roof2.position.y = 7.65;
    // ក្បាច់ចុងដំបូល (ពណ៌មាស)
    for (const sx of [-1, 1]) { const k = new T.Mesh(new T.ConeGeometry(0.12, 0.9, 5), M(C.gold)); k.position.set(sx * 1.2, 8.9, 0); k.rotation.z = -sx * 0.5; g.add(k); }
    g.add(roof, roof2);
    const st = box(1.1, 0.12, 2.6, 0, 0, 3.3, C.woodL, g); st.rotation.x = 0.75; st.position.y = 1.1;
    box(0.7, 0.8, 0.7, 2.2, 0, 3.1, 0x6b4a3a, g);
    scene.add(g);
    const hw = 3.1 * s, hd = 2.6 * s;
    const sw = Math.abs(Math.sin(rot)) > 0.5;
    addSolid(x - (sw ? hd : hw), x + (sw ? hd : hw), z - (sw ? hw : hd), z + (sw ? hw : hd));
    mapRect(x - hw, x + hw, z - hd, z + hd, '#a33a24');
  }
  const houseSpots = [[-30, 30, 0], [-45, 28, 0], [-62, 30, 0], [-80, 32, 0], [-30, 52, Math.PI], [-48, 75, 0], [-75, 70, 0],
    [-90, 52, Math.PI / 2], [-30, 92, Math.PI], [-60, 95, Math.PI], [-88, 92, Math.PI]];
  function buildVillage() {
    for (const [x, z, r] of houseSpots) khmerHouse(x, z, r);
    for (let i = 0; i < 40; i++) {
      const x = -20 - rnd() * 82, z = 20 + rnd() * 82;
      if (!blocked(x, z, 0, 3.5)) addPalm(x, z, 6 + rnd() * 4);
    }
    // អណ្ដូងទឹកកណ្ដាលភូមិ
    const well = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 0.9, 10), M(C.stoneL)); well.position.set(-55, 0.45, 52); well.castShadow = true; scene.add(well);
    addSolid(-56.1, -53.9, 50.9, 53.1);
  }
  function buildRice() { // វាលស្រែ (ខាងលិចផ្លូវក្រវ៉ាត់)
    for (let x = -185; x < -120; x += 16) for (let z = 10; z < 120; z += 14) {
      box(14.5, 0.08, 12.5, x + 8, 0, z + 7, M((x / 16 + z / 14) & 1 ? 0x9cc24a : 0x86b83e));
      box(15, 0.25, 0.5, x + 8, 0, z, M(0x7a6a3a));
    }
    mapRect(-185, -121, 10, 122, '#9cc24a');
  }

  // ---------- ទីក្រុងទំនើប (អគារមានបង្អួច) ----------
  function windowTex(base, win) {
    return canvasTex(64, 64, (g) => {
      g.fillStyle = base; g.fillRect(0, 0, 64, 64);
      g.fillStyle = win;
      for (let y = 6; y < 64; y += 32) for (let x = 6; x < 64; x += 32) g.fillRect(x, y, 20, 18);
    }, true);
  }
  function buildCity() {
    const looks = [['#efe6d2', '#4a6f8f'], ['#d9d4cc', '#2e4a63'], ['#c9dce8', '#30506c'], ['#f2e3c0', '#7a5230']];
    const lots = [];
    for (let x = 22; x <= 92; x += 17) for (let z = -22; z >= -80; z -= 17) lots.push([x, z]);
    for (const [x, z] of lots) {
      const w = 9 + rnd() * 5, d = 9 + rnd() * 5, h = 8 + rnd() * 34;
      const [b, wn] = looks[Math.floor(rnd() * 4)];
      const tx = windowTex(b, wn); tx.repeat.set(Math.round(w / 4), Math.round(h / 4));
      const m = new T.MeshStandardMaterial({ map: tx, roughness: 0.7 });
      box(w, h, d, x, 0, z, m, null, Infinity);
      box(w + 0.4, 0.6, d + 0.4, x, h, z, M(h > 30 ? C.gold : 0x9a9a9a));
      mapRect(x - w / 2, x + w / 2, z - d / 2, z + d / 2, '#9aa6b2');
    }
    // ផ្លូវដើរថ្មក្នុងសង្កាត់
    box(86, 0.05, 72, 57, 0, -51, M(0xb9b2a2));
  }

  // ---------- ព្រៃ ប្រាសាទបាក់បែក និងភ្នំតូច (ខាងជើងលិច) ----------
  function buildForest() {
    // ប្រាសាទបាក់បែកមានដើមឈើដុះលើ (ដូចប្រាសាទតាព្រហ្ម)
    const cx = -60, cz = -45, moss = M(0x8a8a6a);
    box(18, 0.6, 14, cx, 0, cz, moss, null, 0.6);
    tower(cx, cz - 2, 0.6, 0.7);
    addSolid(cx - 1.6, cx + 1.6, cz - 3.6, cz - 0.4);
    for (const [dx, dz, h] of [[-6, 3, 2.5], [6, 3, 1.6], [-6, -4, 1.2], [5, -5, 3]]) box(2.4, h, 2.4, cx + dx, 0.6, cz + dz, moss, null, Infinity);
    for (let i = 0; i < 6; i++) box(1.2, 0.8, 0.9, cx - 8 + rnd() * 16, 0, cz + 8 + rnd() * 4, moss);
    treeSpots.push([cx + 6, cz - 5, 7]);
    mapRect(cx - 9, cx + 9, cz - 7, cz + 7, '#8a8a6a');
    // ភ្នំតូច (ភ្នំនាងកង្រី) — ថ្នាក់លោតឡើងបាន
    const hx = -84, hz = -72;
    [[20, 1.4], [14, 2.8], [8, 4.2]].forEach(([s, top], i) => box(s, 1.4, s, hx, top - 1.4, hz, M(i % 2 ? 0x7c8a4a : 0x6e7a40), null, top));
    mapRect(hx - 10, hx + 10, hz - 10, hz + 10, '#6e7a40');
    for (let i = 0; i < 55; i++) {
      const x = -14 - rnd() * 90, z = -14 - rnd() * 70;
      if (blocked(x, z, 0, 2.2)) continue;
      if (rnd() < 0.55) treeSpots.push([x, z, 5 + rnd() * 4]); else addPalm(x, z, 6 + rnd() * 4);
    }
  }

  // ---------- ដើមត្នោត និងដើមឈើ (InstancedMesh ដើម្បីលឿន) ----------
  function addPalm(x, z, h) { palmSpots.push([x, z, h]); addSolid(x - 0.35, x + 0.35, z - 0.35, z + 0.35); }
  function buildPalms() {
    const trunk = new T.InstancedMesh(new T.CylinderGeometry(0.17, 0.26, 1, 6), M(0x5a4632), palmSpots.length + treeSpots.length);
    const crown = new T.InstancedMesh(new T.SphereGeometry(1, 8, 6), M(0x2f6b2a, { flatShading: true }), palmSpots.length);
    const leafy = new T.InstancedMesh(new T.SphereGeometry(1, 7, 5), M(0x3d7d2c, { flatShading: true }), treeSpots.length * 2);
    trunk.castShadow = crown.castShadow = leafy.castShadow = true;
    const o = new T.Object3D();
    let i = 0;
    palmSpots.forEach(([x, z, h], k) => {
      o.position.set(x, h / 2, z); o.scale.set(1, h, 1); o.rotation.set(0, 0, 0); o.updateMatrix(); trunk.setMatrixAt(i++, o.matrix);
      o.position.set(x, h + 0.5, z); o.scale.set(1.9, 1.25, 1.9); o.updateMatrix(); crown.setMatrixAt(k, o.matrix);
    });
    treeSpots.forEach(([x, z, h], k) => {
      o.position.set(x, h / 2, z); o.scale.set(1.6, h, 1.6); o.updateMatrix(); trunk.setMatrixAt(i++, o.matrix);
      o.position.set(x, h + 1, z); o.scale.set(3.6, 2.2, 3.6); o.updateMatrix(); leafy.setMatrixAt(k * 2, o.matrix);
      o.position.set(x + 1.2, h + 2, z - 0.8); o.scale.set(2.4, 1.6, 2.4); o.updateMatrix(); leafy.setMatrixAt(k * 2 + 1, o.matrix);
      addSolid(x - 0.5, x + 0.5, z - 0.5, z + 0.5);
    });
    scene.add(trunk, crown, leafy);
  }

  // =================================================================
  // ៤. តួអង្គខ្មែរ និងអាវុធ
  // =================================================================
  // o = {gender:'m'|'f', top, bottom, accent, skin, bandit:boolean}
  function makeHuman(o) {
    const g = new T.Group();
    const skin = M(o.skin || C.skin), topM = M(o.top), botM = M(o.bottom), acc = M(o.accent || C.gold), dark = M(0x1a1410);
    const f = o.gender === 'f', hip = 0.9;
    const legs = [], arms = [];
    for (const sx of [1, -1]) { // ជើង (sx=1 ឆ្វេង, -1 ស្ដាំ)
      const L = new T.Group(); L.position.set(sx * 0.11, hip, 0);
      if (f) part(L, 0.11, 0.8, 0.11, 0, -0.45, 0, skin);
      else { part(L, 0.19, 0.5, 0.21, 0, -0.25, 0, botM); part(L, 0.12, 0.38, 0.12, 0, -0.68, 0, skin); }
      part(L, 0.13, 0.07, 0.24, 0, -0.88, 0.04, dark);
      g.add(L); legs.push(L);
    }
    if (f) { // សំពត់ហូល (ស្រី)
      const sk = new T.Mesh(new T.CylinderGeometry(0.19, 0.26, 0.8, 8), botM); sk.position.y = hip - 0.38; sk.castShadow = true; g.add(sk);
    } else part(g, 0.42, 0.22, 0.26, 0, hip - 0.04, 0, botM); // សំពត់ចងក្បិន (ប្រុស)
    part(g, f ? 0.38 : 0.44, 0.56, 0.24, 0, hip + 0.3, 0, topM);   // ដងខ្លួន
    part(g, f ? 0.4 : 0.46, 0.07, 0.26, 0, hip + 0.04, 0, acc);     // ខ្សែក្រវាត់មាស
    if (f) { const sb = part(g, 0.12, 0.72, 0.27, 0.04, hip + 0.32, 0, acc); sb.rotation.z = 0.55; } // ស្បៃ
    else if (!o.bandit) { part(g, 0.48, 0.08, 0.28, 0, hip + 0.56, 0, kramaMat); const k = part(g, 0.1, 0.6, 0.27, -0.06, hip + 0.3, 0, kramaMat); k.rotation.z = -0.5; } // ក្រមា
    for (const sx of [1, -1]) { // ដៃ
      const A = new T.Group(); A.position.set(sx * (f ? 0.25 : 0.28), hip + 0.53, 0);
      part(A, 0.12, 0.28, 0.12, 0, -0.14, 0, topM);
      part(A, 0.1, 0.3, 0.1, 0, -0.42, 0, skin);
      const hand = new T.Group(); hand.position.y = -0.6; part(hand, 0.1, 0.1, 0.1, 0, 0, 0, skin); A.add(hand); A.hand = hand;
      g.add(A); arms.push(A);
    }
    part(g, 0.1, 0.08, 0.1, 0, hip + 0.62, 0, skin); // ក
    const head = new T.Mesh(new T.SphereGeometry(0.15, 10, 8), skin); head.position.y = hip + 0.78; head.castShadow = true; g.add(head);
    for (const sx of [-0.05, 0.05]) part(g, 0.03, 0.03, 0.02, sx, hip + 0.8, 0.14, dark);
    const hair = new T.Mesh(new T.SphereGeometry(0.158, 10, 6, 0, Math.PI * 2, 0, Math.PI / 1.9), dark); hair.position.y = hip + 0.8; hair.rotation.x = -0.25; g.add(hair);
    if (f) {
      const bun = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), dark); bun.position.set(0, hip + 0.9, -0.12); g.add(bun);
      const fl = new T.Mesh(new T.OctahedronGeometry(0.05), acc); fl.position.set(0.09, hip + 0.92, -0.08); g.add(fl);
    }
    if (o.bandit) part(g, 0.32, 0.1, 0.32, 0, hip + 0.73, 0.01, M(C.red)); // ក្រមាបិទមុខ
    const h = { g, legs, arms, t: Math.random() * 6, weapon: null, wtype: null, gender: o.gender };
    h.setWeapon = (type) => {
      if (h.weapon) arms[1].hand.remove(h.weapon);
      h.wtype = type; h.weapon = type ? makeWeapon(type) : null;
      if (h.weapon) arms[1].hand.add(h.weapon);
    };
    return h;
  }
  // ដាវ ឬ កាំបិតខ្មែរ
  function makeWeapon(type) {
    const w = new T.Group();
    const steel = M(0xdfe6ee, { metalness: 0.75, roughness: 0.3 });
    if (type === 'sword') {
      part(w, 0.05, 0.035, 0.95, 0, 0, 0.6, steel);
      part(w, 0.28, 0.05, 0.05, 0, 0, 0.12, M(C.gold));
      part(w, 0.05, 0.05, 0.22, 0, 0, 0, M(C.red));
      part(w, 0.07, 0.07, 0.06, 0, 0, -0.12, M(C.gold));
    } else {
      const b = part(w, 0.05, 0.03, 0.4, 0, 0, 0.3, steel); b.rotation.y = 0.12;
      part(w, 0.06, 0.06, 0.16, 0, 0, 0.02, M(0x5a3418));
      part(w, 0.08, 0.08, 0.03, 0, 0, 0.11, M(C.gold));
    }
    return w;
  }
  // ចលនាតួអង្គ៖ spd (0..1.5), atk (0..1 ដំណាក់កាលវាយ), air, sit
  function animHuman(h, dt, spd, atk, air, sit) {
    h.t += dt * (3 + spd * 7);
    const sw = Math.sin(h.t) * 0.75 * Math.min(spd, 1.2);
    const [lL, rL] = h.legs, [lA, rA] = h.arms;
    if (sit) { lL.rotation.x = rL.rotation.x = -1.45; lA.rotation.x = rA.rotation.x = -1.1; lA.rotation.z = rA.rotation.z = 0; return; }
    lL.rotation.x = air ? -0.5 : sw; rL.rotation.x = air ? 0.3 : -sw;
    lA.rotation.x = -sw * 0.8; lA.rotation.z = 0.08;
    if (atk > 0) {
      const a = atk < 0.3 ? -0.4 - 2.5 * (atk / 0.3) : -2.9 + 2.6 * ((atk - 0.3) / 0.7);
      rA.rotation.x = a; rA.rotation.z = -0.35 * Math.sin(atk * Math.PI);
    } else { rA.rotation.x = sw * 0.8 - (h.weapon ? 0.35 : 0); rA.rotation.z = -0.08; }
  }
  G.makeHuman = makeHuman; G.animHuman = animHuman;

  // =================================================================
  // ៥. អ្នកលេង
  // =================================================================
  const WEAPONS = {
    sword: { dmg: 28, range: 2.7, cd: 0.55, st: 12, arc: 0.25, dur: 0.42 },
    knife: { dmg: 16, range: 1.9, cd: 0.28, st: 6, arc: 0.1, dur: 0.24 }
  };
  const P = G.player = {
    h: null, pos: new T.Vector3(), vy: 0, onGround: true, rot: 0,
    hp: 100, maxHp: 100, st: 100, maxSt: 100, stIdle: 0, money: 0,
    weapon: 'sword', atk: 0, atkCd: 0, hitDone: false, vehicle: null, dead: false, look: { gender: 'm', outfit: 0 }, name: 'Player'
  };
  const OUTFITS = { // សម្លៀកបំពាក់ខ្មែរ ៣ ពណ៌
    m: [{ top: 0xf3ead6, bottom: 0xb3261e, accent: C.gold }, { top: 0x1f3a6b, bottom: 0xd4a52a, accent: 0xb3261e }, { top: 0xe6c27a, bottom: 0x5a2a7a, accent: C.gold }],
    f: [{ top: 0xb3261e, bottom: 0xd4a52a, accent: 0xf2d27a }, { top: 0xf3ead6, bottom: 0x7a1f4f, accent: C.gold }, { top: 0x2f6b5a, bottom: 0xb3261e, accent: C.gold }]
  };
  G.OUTFITS = OUTFITS;
  try { P.money = +localStorage.getItem('angkor-money') || 0; } catch (e) {}
  const saveMoney = () => { try { localStorage.setItem('angkor-money', P.money); } catch (e) {} };

  function createPlayer() { setLook(P.look.gender, P.look.outfit); P.pos.set(0, 0, 24); }
  function setLook(gender, outfit) {
    const old = P.h && P.h.g;
    P.look = { gender, outfit };
    P.h = makeHuman(Object.assign({ gender }, OUTFITS[gender][outfit]));
    P.h.setWeapon(P.weapon);
    if (old) { const par = old.parent; P.h.g.position.copy(old.position); P.h.g.rotation.copy(old.rotation); par && par.remove(old); (par || scene).add(P.h.g); }
    else scene.add(P.h.g);
  }
  G.setLook = setLook;
  G.setName = n => { P.name = n || 'Player'; };
  G.setWeapon = (w) => { P.weapon = w; P.h.setWeapon(w); ui.toast(t(w === 'sword' ? 'wSword' : 'wKnife')); };
  G.addMoney = (v) => { P.money = Math.max(0, P.money + v); saveMoney(); };

  // =================================================================
  // ៦. កាមេរ៉ា Third-person (ដូច GTA)
  // =================================================================
  const cam = { yaw: Math.PI, pitch: 0.28, dist: 6, idle: 0, pos: new T.Vector3(), target: new T.Vector3() };
  const tmpV = new T.Vector3(), tmpV2 = new T.Vector3();
  function updateCamera(dt, snap) {
    const inp = input();
    if (inp.dx || inp.dy) { cam.idle = 0; cam.yaw -= inp.dx * 0.0026; cam.pitch = clamp(cam.pitch + inp.dy * 0.0022, -0.25, 1.15); }
    else cam.idle += dt;
    inp.dx = inp.dy = 0;
    const v = P.vehicle;
    let base, dist;
    if (v) {
      base = tmpV.set(v.g.position.x, v.g.position.y + 1.6, v.g.position.z);
      dist = v.type === 'car' ? 9.5 : v.type === 'boat' ? 11 : 7.5;
      if (cam.idle > 0.8) cam.yaw += angDiff(v.heading + Math.PI, cam.yaw) * Math.min(1, 3 * dt);
    } else {
      base = tmpV.set(P.pos.x, P.pos.y + 1.55, P.pos.z);
      dist = cam.dist;
      // ឆ្លៀងស្មាបន្តិច (over-the-shoulder)
      // ក្នុងម៉ឺនុយ ផ្លាស់តួអង្គទៅខាងស្ដាំអេក្រង់ (ម៉ឺនុយនៅខាងឆ្វេង)
      const sh = G.running ? 0.55 : -1.5;
      base.x += Math.cos(cam.yaw) * sh; base.z -= Math.sin(cam.yaw) * sh;
    }
    const hz = Math.cos(cam.pitch) * dist;
    const want = tmpV2.set(base.x + Math.sin(cam.yaw) * hz, base.y + Math.sin(cam.pitch) * dist, base.z + Math.cos(cam.yaw) * hz);
    want.y = Math.max(want.y, floorAt(want.x, want.z) + 0.6);
    if (snap) cam.pos.copy(want); else cam.pos.lerp(want, 1 - Math.exp(-10 * dt));
    camera.position.copy(cam.pos);
    camera.lookAt(base);
    sky.position.copy(camera.position);
    const fp = v ? v.g.position : P.pos;
    sun.position.copy(fp).addScaledVector(SUN_DIR, 110); sun.target.position.copy(fp);
  }

  // =================================================================
  // ៧. ចលនាអ្នកលេង ការលោត ថាមពល និងការវាយ
  // =================================================================
  function updatePlayer(dt) {
    const k = input().keys;
    const h = P.h;
    P.atkCd -= dt;
    if (P.dead) { animHuman(h, dt, 0, 0, false, false); return; }
    if (P.vehicle) { animHuman(h, dt, 0, 0, false, true); return; }
    const fwd = tmpV.set(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
    let mx = 0, mz = 0;
    if (k.w) { mx += fwd.x; mz += fwd.z; }
    if (k.s) { mx -= fwd.x; mz -= fwd.z; }
    if (k.d) { mx -= fwd.z; mz += fwd.x; }
    if (k.a) { mx += fwd.z; mz -= fwd.x; }
    // Joystick លើទូរស័ព្ទ (ឡើងលើ = ទៅមុខតាមកាមេរ៉ា)
    const j = input().joy;
    let jmag = 1;
    if (j && j.mag > 0.12) { mx = fwd.x * -j.y - fwd.z * j.x; mz = fwd.z * -j.y + fwd.x * j.x; jmag = j.mag; }
    const moving = mx || mz;
    const running = moving && (k.shift || jmag > 0.95) && P.st > 1;
    const speed = running ? 9.5 : 5 * Math.max(0.45, Math.min(1, jmag));
    if (running) { P.st -= 20 * dt; P.stIdle = 0; }
    if (moving) {
      const l = Math.hypot(mx, mz); mx = mx / l * speed * dt; mz = mz / l * speed * dt;
      if (!blocked(P.pos.x + mx, P.pos.z, P.pos.y)) P.pos.x += mx;
      if (!blocked(P.pos.x, P.pos.z + mz, P.pos.y)) P.pos.z += mz;
      if (P.atk <= 0) P.rot += angDiff(Math.atan2(mx, mz), P.rot) * Math.min(1, 12 * dt);
    }
    // លោត
    const fl = floorAt(P.pos.x, P.pos.z);
    if (k[' '] && P.onGround && P.st > 8) { P.vy = 9.5; P.onGround = false; P.st -= 8; P.stIdle = 0; sfx('jump'); }
    if (P.onGround && P.pos.y > fl + 0.02) P.onGround = false;
    P.vy -= 25 * dt; P.pos.y += P.vy * dt;
    if (P.pos.y <= fl) { P.pos.y = fl; P.vy = 0; P.onGround = true; }
    // ថាមពលកើនឡើងវិញ
    P.stIdle += dt;
    if (P.stIdle > 0.7) P.st = Math.min(P.maxSt, P.st + 18 * dt);
    // ការវាយ (ចុច Mouse ឆ្វេង)
    const W = WEAPONS[P.weapon];
    if (input().attack && P.atkCd <= 0 && P.st >= W.st) {
      P.atkCd = W.cd; P.atk = 0.0001; P.hitDone = false; P.st -= W.st; P.stIdle = 0;
      P.rot = Math.atan2(fwd.x, fwd.z); sfx('swing');
    }
    if (P.atk > 0) {
      P.atk += dt / W.dur;
      if (!P.hitDone && P.atk > 0.45) { P.hitDone = true; doPlayerHit(W); }
      if (P.atk >= 1) P.atk = 0;
    }
    h.g.position.copy(P.pos); h.g.rotation.y = P.rot;
    animHuman(h, dt, moving ? speed / 6 : 0, P.atk, !P.onGround, false);
  }
  const hitHooks = []; // សម្រាប់ Multiplayer (វាយអ្នកលេងផ្សេង)
  G.onPlayerHit = fn => hitHooks.push(fn);
  function doPlayerHit(W) {
    const fx = Math.sin(P.rot), fz = Math.cos(P.rot);
    const inArc = (x, z, y, extra = 0) => {
      const dx = x - P.pos.x, dz = z - P.pos.z, d = Math.hypot(dx, dz) || 0.01;
      return d < W.range + extra && Math.abs(y - P.pos.y) < 1.7 && (d < 0.9 || (dx * fx + dz * fz) / d > W.arc) ? { d, nx: dx / d, nz: dz / d } : null;
    };
    for (const e of enemies) {
      if (e.dead) continue;
      const r = inArc(e.pos.x, e.pos.z, e.pos.y, e.big ? 0.5 : 0);
      if (r) damageEnemy(e, Math.round(W.dmg * rr(0.85, 1.2)), r.nx, r.nz);
    }
    for (const fn of hitHooks) fn(W, inArc);
  }
  G.damagePlayer = function (d, fromName) {
    if (P.dead) return;
    P.hp = Math.max(0, P.hp - d);
    floatText(P.pos, '-' + d, 'hurt'); ui.hurtFlash(); sfx('hurt');
    if (P.hp <= 0) {
      P.dead = true;
      if (mode && mode.onDeath) mode.onDeath(); else defaultDeath();
    }
  };
  function defaultDeath() {
    const lost = Math.floor(P.money * 0.1);
    G.addMoney(-lost);
    ui.toast(t('youFainted', lost));
    setTimeout(() => respawn(mode && mode.spawn), 1600);
  }
  function respawn(sp) {
    if (P.vehicle) exitVehicle();
    P.dead = false; P.hp = P.maxHp; P.st = P.maxSt; P.vy = 0;
    const s = sp || [0, 24];
    P.pos.set(s[0], floorAt(s[0], s[1]), s[1]);
    P.h.g.rotation.x = 0;
    updateCamera(0, true);
  }
  G.healPlayer = (hp, st) => { P.hp = Math.min(P.maxHp, P.hp + hp); P.st = Math.min(P.maxSt, P.st + (st || 0)); };

  // =================================================================
  // ៨. អក្សរលោត (លេខខូច ប្រាក់)
  // =================================================================
  let floats = [];
  function floatText(pos, text, cls) {
    const box = document.getElementById('floats'); if (!box) return;
    const el = document.createElement('div'); el.className = 'float ' + cls; el.textContent = text; box.appendChild(el);
    floats.push({ el, p: new T.Vector3(pos.x, pos.y + 2.1, pos.z), t: 0 });
  }
  G.floatText = floatText;
  function updateFloats(dt) {
    for (const f of floats) {
      f.t += dt; f.p.y += dt * 1.3;
      tmpV.copy(f.p).project(camera);
      if (tmpV.z > 1 || f.t > 0.9) { f.el.remove(); f.dead = true; continue; }
      f.el.style.transform = `translate(${(tmpV.x * 0.5 + 0.5) * innerWidth}px,${(-tmpV.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-50%)`;
      f.el.style.opacity = 1 - f.t / 0.9;
    }
    floats = floats.filter(f => !f.dead);
  }

  // =================================================================
  // ៩. សត្រូវ (ចោរ) — AI ដើររក និងវាយ
  // =================================================================
  let enemies = [];
  const BAR_FG = new T.PlaneGeometry(1, 0.12); BAR_FG.translate(0.5, 0, 0);
  const BAR_BG = new T.PlaneGeometry(1.1, 0.22);
  function makeBar(color) {
    const g = new T.Group();
    g.add(new T.Mesh(BAR_BG, new T.MeshBasicMaterial({ color: 0x1a0d06, fog: false })));
    const fg = new T.Mesh(BAR_FG, new T.MeshBasicMaterial({ color, fog: false })); fg.position.set(-0.5, 0, 0.01);
    g.add(fg); g.fg = fg; scene.add(g); return g;
  }
  // spawnEnemy(x,z,{big, target})
  function spawnEnemy(x, z, o = {}) {
    if (blocked(x, z, floorAt(x, z), 0.5)) return null;
    const big = !!o.big;
    const h = makeHuman({ gender: 'm', top: big ? 0x3a1010 : 0x262626, bottom: big ? 0xb3261e : 0x3a3a3a, accent: big ? C.gold : 0x555555, bandit: true });
    h.setWeapon(big ? 'sword' : 'knife');
    if (big) h.g.scale.setScalar(1.3);
    h.g.position.set(x, floorAt(x, z), z); scene.add(h.g);
    const lv = o.level || 1;
    const e = { h, pos: h.g.position, rot: 0, hp: (big ? 160 : 55) + lv * 8, big, speed: (big ? 3.4 : 4.1) + Math.min(lv, 8) * 0.12,
      dmg: (big ? 16 : 8) + lv, atkCd: 1, atk: 0, kx: 0, kz: 0, dead: false, deathT: 0, wA: 0, wT: 0,
      bar: makeBar(big ? 0xffb02a : 0xff4a3a), target: o.target || null, aggro: o.aggro ?? 30, home: new T.Vector3(x, 0, z) };
    e.maxHp = e.hp;
    enemies.push(e);
    return e;
  }
  function damageEnemy(e, d, nx, nz) {
    e.hp -= d; e.flash = 0.15; e.kx = nx * (e.big ? 4 : 9); e.kz = nz * (e.big ? 4 : 9);
    floatText(e.pos, '-' + d, 'dmg'); sfx('hit');
    if (e.hp <= 0 && !e.dead) {
      e.dead = true; e.deathT = 0;
      const n = e.big ? 5 : 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) dropCoin(e.pos, (1 + Math.floor(Math.random() * 3)) * 100);
      if (mode && mode.onKill) mode.onKill(e);
    }
  }
  function updateEnemies(dt) {
    const now = performance.now();
    for (const e of enemies) {
      const g = e.h.g;
      if (e.dead) {
        e.deathT += dt;
        g.rotation.x = Math.max(-Math.PI / 2, -e.deathT * 5);
        e.bar.visible = false;
        if (e.deathT > 1.6) { scene.remove(g); scene.remove(e.bar); e.remove = true; }
        continue;
      }
      // ជ្រើសគោលដៅ៖ អ្នកលេង (បើនៅជិត) ឬ គោលដៅបេសកកម្ម (ឧ. ទ្វារប្រាសាទ)
      const pd = Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z);
      let tx, tz, mode2 = 'wander';
      const pv = P.vehicle ? P.vehicle.g.position : P.pos;
      if (!P.dead && pd < (e.target ? 10 : e.aggro)) { tx = pv.x; tz = pv.z; mode2 = 'player'; }
      else if (e.target) { tx = e.target.x; tz = e.target.z; mode2 = 'target'; }
      let mx = 0, mz = 0, sp = e.speed;
      if (mode2 !== 'wander') {
        const dx = tx - e.pos.x, dz = tz - e.pos.z, d = Math.hypot(dx, dz);
        const reach = mode2 === 'target' ? 2.5 : (e.big ? 1.7 : 1.3);
        if (d > reach) { mx = dx / d; mz = dz / d; }
        else if (e.atkCd <= 0 && e.atk <= 0) { e.atk = 0.0001; e.atkCd = e.big ? 1.6 : 1.15; e.rot = Math.atan2(dx, dz); }
      } else {
        e.wT -= dt;
        if (e.wT <= 0) { e.wA = Math.random() * Math.PI * 2; e.wT = 2 + Math.random() * 3;
          if (e.home.distanceTo(e.pos) > 18) e.wA = Math.atan2(e.home.x - e.pos.x, e.home.z - e.pos.z); }
        mx = Math.sin(e.wA); mz = Math.cos(e.wA); sp *= 0.35;
      }
      for (const o of enemies) { // កុំឲ្យជាន់គ្នា
        if (o === e || o.dead) continue;
        const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z, od = Math.hypot(ox, oz);
        if (od < 1.2 && od > 0) { mx += ox / od * 0.8; mz += oz / od * 0.8; }
      }
      const vx = mx * sp * dt + e.kx * dt, vz = mz * sp * dt + e.kz * dt;
      e.kx *= Math.exp(-8 * dt); e.kz *= Math.exp(-8 * dt);
      if (!blocked(e.pos.x + vx, e.pos.z, e.pos.y, 0.4)) e.pos.x += vx; else e.wT = 0;
      if (!blocked(e.pos.x, e.pos.z + vz, e.pos.y, 0.4)) e.pos.z += vz; else e.wT = 0;
      e.pos.y = floorAt(e.pos.x, e.pos.z);
      if ((mx || mz) && e.atk <= 0) e.rot += angDiff(Math.atan2(mx, mz), e.rot) * Math.min(1, 8 * dt);
      g.rotation.y = e.rot;
      // ការវាយរបស់សត្រូវ
      e.atkCd -= dt;
      if (e.atk > 0) {
        e.atk += dt / (e.big ? 0.55 : 0.4);
        if (!e.hitDone && e.atk > 0.5) {
          e.hitDone = true;
          if (mode2 === 'player' && pd < (e.big ? 2.3 : 1.8) && Math.abs(P.pos.y - e.pos.y) < 1.3) {
            G.damagePlayer(P.vehicle ? Math.round(e.dmg * 0.5) : e.dmg);
          } else if (mode2 === 'target' && mode && mode.onTargetHit) mode.onTargetHit(e.dmg);
        }
        if (e.atk >= 1) { e.atk = 0; e.hitDone = false; }
      }
      e.flash = (e.flash || 0) - dt;
      animHuman(e.h, dt, (mx || mz) ? sp / 5 : 0, e.atk, false, false);
      if (e.flash > 0) g.position.y += 0.05;
      e.bar.position.set(e.pos.x, e.pos.y + (e.big ? 2.7 : 2.15), e.pos.z);
      e.bar.quaternion.copy(camera.quaternion);
      e.bar.fg.scale.x = Math.max(0.001, e.hp / e.maxHp);
    }
    enemies = enemies.filter(e => !e.remove);
  }
  function clearEnemies() { for (const e of enemies) { scene.remove(e.h.g); scene.remove(e.bar); } enemies = []; }
  G.enemies = () => enemies;

  // ---------- កាក់ប្រាក់ ----------
  let coins = [];
  const coinGeo = new T.CylinderGeometry(0.3, 0.3, 0.07, 14); coinGeo.rotateX(Math.PI / 2);
  const coinMat = M(0xffc83a, { metalness: 0.8, roughness: 0.3, emissive: 0x5a3a00 });
  function dropCoin(pos, value) {
    const m = new T.Mesh(coinGeo, coinMat);
    m.position.set(pos.x + rr(-0.9, 0.9), pos.y, pos.z + rr(-0.9, 0.9)); scene.add(m);
    coins.push({ m, value, t: 0, by: pos.y + 0.6 });
  }
  function updateCoins(dt) {
    for (const c of coins) {
      c.t += dt; c.m.rotation.y += dt * 4; c.m.position.y = c.by + Math.sin(c.t * 4) * 0.12;
      const d = Math.hypot(c.m.position.x - P.pos.x, c.m.position.z - P.pos.z);
      if (!P.dead && d < 1.5 && Math.abs(c.by - P.pos.y) < 2.2) {
        G.addMoney(c.value); floatText(c.m.position, '+' + c.value + '៛', 'gold'); sfx('coin');
        scene.remove(c.m); c.dead = true;
      } else if (c.t > 30) { scene.remove(c.m); c.dead = true; }
    }
    coins = coins.filter(c => !c.dead);
  }

  // =================================================================
  // ១០. យានជំនិះ (ម៉ូតូ រថយន្ត ទូកង)
  // =================================================================
  const vehicles = [];
  function wheel(parent, x, y, z, r, w) {
    const wh = new T.Mesh(new T.CylinderGeometry(r, r, w, 12), M(0x1b1b1b)); wh.rotation.z = Math.PI / 2; wh.position.set(x, y, z);
    wh.castShadow = true; parent.add(wh); return wh;
  }
  function makeVehicleMesh(type, color) {
    const g = new T.Group(); const body = M(color, { roughness: 0.4, metalness: 0.3 });
    const wheels = [];
    if (type === 'moto') {
      wheels.push(wheel(g, 0, 0.32, 0.75, 0.32, 0.12), wheel(g, 0, 0.32, -0.75, 0.32, 0.12));
      part(g, 0.3, 0.35, 1.3, 0, 0.6, 0, body);
      part(g, 0.32, 0.12, 0.7, 0, 0.85, -0.2, M(0x1a1a1a));
      part(g, 0.7, 0.06, 0.06, 0, 1.1, 0.62, M(0x888888));
      part(g, 0.08, 0.5, 0.08, 0, 0.85, 0.65, M(0x888888));
      part(g, 0.18, 0.14, 0.08, 0, 0.95, 0.75, M(0xfff3b0, { emissive: 0x887722 }));
    } else if (type === 'car') {
      for (const [x, z] of [[-0.85, 1.2], [0.85, 1.2], [-0.85, -1.2], [0.85, -1.2]]) wheels.push(wheel(g, x, 0.38, z, 0.38, 0.25));
      part(g, 1.8, 0.6, 3.8, 0, 0.75, 0, body);
      part(g, 1.6, 0.6, 1.9, 0, 1.35, -0.25, M(0x9fc3d8, { roughness: 0.1, metalness: 0.5 }));
      part(g, 1.65, 0.08, 2, 0, 1.68, -0.25, body);
      part(g, 1.9, 0.1, 0.12, 0, 0.75, 1.92, M(C.gold));
      for (const sx of [-0.6, 0.6]) part(g, 0.3, 0.15, 0.05, sx, 0.85, 1.92, M(0xfff3b0, { emissive: 0x887722 }));
    } else { // ទូកង (Khmer racing boat) មានក្បាលនាគ
      const hull = part(g, 1.1, 0.5, 7, 0, 0.1, 0, body);
      for (const sx of [-0.56, 0.56]) part(g, 0.06, 0.14, 7.05, sx, 0.3, 0, M(C.gold)); // ឆ្នូតមាសសងខាង
      const bow = new T.Mesh(new T.ConeGeometry(0.55, 1.6, 4), body); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(0, 0.1, 4.3); g.add(bow);
      const neck = part(g, 0.25, 1.2, 0.25, 0, 0.8, 4.4, M(C.gold)); neck.rotation.x = 0.4;
      const head = new T.Mesh(new T.ConeGeometry(0.22, 0.7, 5), M(C.gold)); head.rotation.x = Math.PI / 2; head.position.set(0, 1.35, 4.85); g.add(head);
      for (let i = -2; i <= 2; i++) part(g, 0.9, 0.06, 0.25, 0, 0.35, i * 1.2, M(C.woodL)); // កៅអីអ្នកអុំ
      hull.receiveShadow = true;
    }
    g.wheels = wheels;
    return g;
  }
  G.makeVehicleMesh = makeVehicleMesh;
  const VSPEC = { moto: { max: 26, accel: 15, turn: 2.4, r: 0.7, seat: [0, 0.55, -0.15] },
    car: { max: 32, accel: 12, turn: 1.7, r: 1.4, seat: [-0.4, 0.45, -0.2] },
    boat: { max: 22, accel: 9, turn: 1.3, r: 1.2, seat: [0, 0.2, -2.4] } };
  function addVehicle(type, color, x, z, heading, o = {}) {
    const g = makeVehicleMesh(type, color);
    const y = type === 'boat' ? -0.12 : 0;
    g.position.set(x, y, z); g.rotation.y = heading; scene.add(g);
    const v = Object.assign({ type, g, heading, speed: 0, spec: VSPEC[type], hp: 100, ai: null, color }, o);
    vehicles.push(v);
    if (!o.noInteract) addInteract({ pos: g.position, r: type === 'boat' ? 5 : 2.8, label: () => t('enter_' + type), use: () => enterVehicle(v), r2: 0, active: () => !P.vehicle && !v.ai && !v.locked, perm: !o.temp, veh: v });
    return v;
  }
  function removeVehicle(v) { scene.remove(v.g); const i = vehicles.indexOf(v); if (i >= 0) vehicles.splice(i, 1); interacts = interacts.filter(it => it.veh !== v); }
  function enterVehicle(v) {
    if (P.vehicle) return;
    P.vehicle = v; v.driver = P;
    scene.remove(P.h.g); v.g.add(P.h.g);
    P.h.g.position.set(...v.spec.seat); P.h.g.rotation.set(0, 0, 0);
    P.atk = 0;
    cam.yaw = v.heading + Math.PI;
    sfx('engineStart'); AG.audio && AG.audio.engine(true, v.type);
  }
  function exitVehicle() {
    const v = P.vehicle; if (!v) return;
    v.g.remove(P.h.g); scene.add(P.h.g);
    const side = new T.Vector3(Math.cos(v.heading), 0, -Math.sin(v.heading)).multiplyScalar(v.spec.r + 1.2);
    let nx = v.g.position.x + side.x, nz = v.g.position.z + side.z;
    if (blocked(nx, nz, 0)) { nx = v.g.position.x - side.x; nz = v.g.position.z - side.z; }
    if (v.type === 'boat') { nx = v.g.position.x; nz = RIVER.z0 - 3; } // ចេញពីទូក → ឡើងច្រាំង
    P.pos.set(nx, floorAt(nx, nz), nz); P.rot = v.heading;
    v.driver = null; v.speed = 0; P.vehicle = null;
    AG.audio && AG.audio.engine(false);
  }
  G.exitVehicle = exitVehicle;
  // រូបវិទ្យាយានជំនិះ (arcade)
  function driveVehicle(v, dt, ctl) {
    const s = v.spec;
    if (ctl.up) v.speed += s.accel * dt;
    else if (ctl.down) v.speed -= (v.speed > 0 ? s.accel * 1.6 : s.accel * 0.6) * dt;
    else v.speed *= Math.exp(-0.9 * dt);
    if (ctl.brake) v.speed *= Math.exp(-4 * dt);
    v.speed = clamp(v.speed, -s.max * 0.35, s.max * (ctl.boost ? 1.15 : 1));
    const steer = (ctl.left ? 1 : 0) - (ctl.right ? 1 : 0);
    const turnF = clamp(v.speed / 8, -1, 1);
    v.heading += steer * s.turn * turnF * dt;
    const nx = v.g.position.x + Math.sin(v.heading) * v.speed * dt, nz = v.g.position.z + Math.cos(v.heading) * v.speed * dt;
    const opt = v.type === 'boat' ? { boat: true } : { step: 0.45 };
    if (!v.ai && blocked(nx, nz, v.g.position.y, s.r, opt)) {
      if (Math.abs(v.speed) > 8) { sfx('crash'); if (v.driver && mode !== Modes.racing) G.damagePlayer(Math.round(Math.abs(v.speed) * 0.4)); }
      v.speed *= -0.3;
    } else { v.g.position.x = nx; v.g.position.z = nz; }
    if (v.type !== 'boat') v.g.position.y = floorAt(v.g.position.x, v.g.position.z);
    else v.g.position.y = -0.12 + Math.sin(performance.now() * 0.003 + v.g.position.x) * 0.06;
    v.g.rotation.y = v.heading;
    if (v.type === 'moto') v.g.rotation.z = -steer * clamp(v.speed / s.max, 0, 1) * 0.35;
    for (const w of v.g.wheels) w.rotation.x += v.speed * dt * 2.5;
  }
  function updateVehicles(dt) {
    const k = input().keys;
    for (const v of vehicles) {
      if (v === P.vehicle) {
        const locked = mode && mode.lockControls;
        const j = input().joy || { x: 0, y: 0 };
        driveVehicle(v, dt, locked ? {} : { up: k.w || j.y < -0.3, down: k.s || j.y > 0.45, left: k.a || j.x < -0.3, right: k.d || j.x > 0.3, brake: k[' '], boost: k.shift });
        AG.audio && AG.audio.engineRate(0.7 + Math.abs(v.speed) / v.spec.max);
        P.pos.copy(v.g.position);
      } else if (v.ai) aiDrive(v, dt);
      else if (Math.abs(v.speed) > 0.1) driveVehicle(v, dt, {});
    }
  }

  // =================================================================
  // ១១. វត្ថុអាចធ្វើសកម្មភាពបាន (ចុច E)
  // =================================================================
  let interacts = [];
  function addInteract(it) { interacts.push(it); return it; }
  let nearest = null;
  function updateInteract() {
    nearest = null; let best = 1e9;
    const p = P.vehicle ? P.vehicle.g.position : P.pos;
    if (!P.dead) for (const it of interacts) {
      if (it.active && !it.active()) continue;
      const d = Math.hypot(it.pos.x - p.x, it.pos.z - p.z);
      if (d < it.r && d < best && Math.abs((it.pos.y || 0) - p.y) < 3) { best = d; nearest = it; }
    }
    if (P.vehicle && !(mode && mode.lockExit)) ui.prompt(t('exitHint'));
    else ui.prompt(nearest ? nearest.label() : '');
  }
  G.interact = function () { // ហៅពេលចុច E
    if (P.dead) return;
    if (P.vehicle) { if (!(mode && mode.lockExit)) exitVehicle(); return; }
    if (nearest) { sfx('click'); nearest.use(); }
  };

  // ---------- សញ្ញាលោតពីលើ (marker) ----------
  const markers3d = [];
  function marker(pos, color = C.gold, h = 2.6) {
    const m = new T.Mesh(new T.OctahedronGeometry(0.24), M(color, { emissive: color, emissiveIntensity: 0.4 }));
    m.position.set(pos.x, (pos.y || 0) + h, pos.z); m.userData.by = m.position.y; scene.add(m); markers3d.push(m); return m;
  }
  function updateMarkers(dt) { const tt = performance.now() * 0.003; for (const m of markers3d) { m.rotation.y += dt * 2; m.position.y = m.userData.by + Math.sin(tt) * 0.2; } }

  // ---------- NPC (អ្នកភូមិ អ្នកលក់) ----------
  const npcs = [];
  function addNPC(x, z, look, rot = 0, wander = 0) {
    const h = makeHuman(look); h.g.position.set(x, floorAt(x, z), z); h.g.rotation.y = rot; scene.add(h.g);
    const n = { h, home: new T.Vector3(x, 0, z), wander, tgt: null, wait: Math.random() * 3 }; npcs.push(n); return n;
  }
  function updateNPCs(dt) {
    for (const n of npcs) {
      let spd = 0;
      if (n.wander) {
        n.wait -= dt;
        if (!n.tgt && n.wait <= 0) n.tgt = new T.Vector3(n.home.x + rr(-n.wander, n.wander), 0, n.home.z + rr(-n.wander, n.wander));
        if (n.tgt) {
          const g = n.h.g.position, dx = n.tgt.x - g.x, dz = n.tgt.z - g.z, d = Math.hypot(dx, dz);
          if (d < 0.5) { n.tgt = null; n.wait = 2 + Math.random() * 4; }
          else { const sx = dx / d * 1.6 * dt, sz = dz / d * 1.6 * dt;
            if (blocked(g.x + sx, g.z + sz, 0, 0.4)) { n.tgt = null; n.wait = 1; } else { g.x += sx; g.z += sz; spd = 0.35; n.h.g.rotation.y = Math.atan2(dx, dz); } }
        }
      }
      animHuman(n.h, dt, spd, 0, false, false);
    }
  }
  const randLook = () => { const gen = Math.random() < 0.5 ? 'm' : 'f'; return Object.assign({ gender: gen }, OUTFITS[gen][Math.floor(Math.random() * 3)]); };

  // វត្ថុអចិន្ត្រៃយ៍ (មានគ្រប់របៀបលេង)៖ អ្នកលក់ អ្នកភូមិ យានជំនិះ
  function setupPermanent() {
    const food = addNPC(47, 22.6, { gender: 'f', top: 0x2f6b5a, bottom: 0xb3261e, accent: C.gold }, 0);
    addInteract({ pos: food.h.g.position, r: 3, perm: true, label: () => t('buyFood'), use: () => buy(500, 45, 20, 'foodName') });
    const drink = addNPC(63, 22.6, { gender: 'm', top: 0xf3ead6, bottom: 0x1f3a6b, accent: C.gold }, 0);
    addInteract({ pos: drink.h.g.position, r: 3, perm: true, label: () => t('buyDrink'), use: () => buy(300, 10, 100, 'drinkName') });
    marker(food.h.g.position, 0x3fd46a, 2.4); marker(drink.h.g.position, 0x3fd46a, 2.4);
    for (let i = 0; i < 6; i++) addNPC(rr(30, 80), rr(25, 85), randLook(), 0, 8);
    for (let i = 0; i < 6; i++) addNPC(rr(-85, -30), rr(35, 90), randLook(), 0, 7);
    addVehicle('moto', 0xb3261e, 36, 14, Math.PI / 2);
    addVehicle('moto', 0x1f3a6b, -42, 40, 0);
    addVehicle('car', 0xd4a52a, 20, -9, Math.PI / 2);
    addVehicle('car', 0xf3ead6, -20, 9, -Math.PI / 2);
    addVehicle('boat', 0xb3261e, -60, 137.6, Math.PI / 2);
    // ទូកចតតាមច្រាំង (តុបតែង)
    for (const x of [-120, 40, 130]) { const b = makeVehicleMesh('boat', 0x7a4a28); b.position.set(x, -0.12, 138.5); b.rotation.y = Math.PI / 2; scene.add(b); }
  }
  function buy(price, hp, st, nameKey) {
    if (P.money < price) { ui.toast(t('notEnough')); sfx('error'); return; }
    G.addMoney(-price); G.healPlayer(hp, st); sfx('coin'); ui.toast(t('bought', t(nameKey), price));
  }

  // =================================================================
  // ១២. របៀបលេង (Game Modes)
  // =================================================================
  let mode = null, modeName = '';
  let modeObjs = [];          // វត្ថុរបស់ mode (លុបពេលចេញ)
  G.markers = [];             // សញ្ញាលើផែនទីតូច {x,z,color,kind,r}
  const addModeObj = o => { scene.add(o); modeObjs.push(o); return o; };
  function modeMarker(pos, color, h) { const m = marker(pos, color, h); modeObjs.push(m); return m; }

  function cleanupMode() {
    if (mode && mode.end) mode.end();
    if (P.vehicle) exitVehicle();
    clearEnemies();
    for (const c of coins) scene.remove(c.m); coins = [];
    for (const o of modeObjs) { scene.remove(o); const i = markers3d.indexOf(o); if (i >= 0) markers3d.splice(i, 1); }
    modeObjs = [];
    for (let i = npcs.length - 1; i >= 0; i--) if (!npcs[i].h.g.parent) npcs.splice(i, 1);
    for (const v of vehicles.slice()) if (v.temp) removeVehicle(v);
    interacts = interacts.filter(it => it.perm);
    G.markers = [];
    ui.objective(null); ui.race(null); ui.bigText('');
    mode = null;
  }
  G.startMode = function (name, opts = {}) {
    cleanupMode();
    modeName = name; mode = Modes[name];
    P.dead = false; P.hp = P.maxHp; P.st = P.maxSt;
    respawn(mode.spawn);
    mode.start(opts);
    G.running = true; G.paused = false;
  };
  G.stopMode = function () { cleanupMode(); G.running = false; };
  G.modeName = () => modeName;
  G._mode = () => mode;

  // ---------- ឧបករណ៍ទូទៅសម្រាប់ mode ----------
  function chest(x, z, onOpen) {
    const y = floorAt(x, z);
    const g = new T.Group(); g.position.set(x, y, z);
    part(g, 1, 0.55, 0.7, 0, 0.28, 0, M(C.red));
    const lid = new T.Group(); lid.position.set(0, 0.55, -0.35); g.add(lid);
    part(lid, 1.04, 0.2, 0.74, 0, 0.1, 0.35, M(C.gold, { metalness: 0.6, roughness: 0.4 }));
    part(g, 0.16, 0.2, 0.05, 0, 0.45, 0.36, M(C.gold));
    addModeObj(g);
    const c = { g, lid, open: false };
    c.it = addInteract({ pos: g.position, r: 2.4, label: () => t('openChest'), active: () => !c.open, use: () => { c.open = true; lid.rotation.x = -1.9; sfx('chest'); onOpen(c); } });
    return c;
  }

  const Modes = {};

  // ===== ក. ផ្សងព្រេង (Adventure): កំណប់ និងរឿងព្រេងខ្មែរ =====
  const LEGENDS = [ // [x, z, key]
    [96, 128, 'lg1'], [84, 84, 'lg2'], [-84, -72, 'lg3'], [-60, -40, 'lg4'], [0, -145, 'lg5']
  ];
  Modes.adventure = {
    spawn: [-38, 24],
    start() {
      const st = this.st = { talked: false, found: 0, chests: [] };
      const teller = addNPC(-35, 31, { gender: 'm', top: 0xf3ead6, bottom: 0x6b4a2a, accent: C.gold, skin: 0xa86e45 }, Math.PI);
      modeObjs.push(teller.h.g);
      const tm = modeMarker(teller.h.g.position, C.gold);
      addInteract({ pos: teller.h.g.position, r: 3, label: () => t('talkTeller'), use: () => {
        if (!st.talked) { st.talked = true; scene.remove(tm); this.refresh(); }
        ui.dialog(t('tellerName'), st.found >= 5 ? t('tellerDone') : t('tellerIntro'), [{ label: t('ok') }]);
      } });
      LEGENDS.forEach(([x, z, key], i) => {
        const c = chest(x, z, () => {
          st.found++; G.addMoney(1000); this.refresh();
          ui.dialog(t(key + 't'), t(key + 'b') + '\n\n' + t('rewardMoney', 1000), [{ label: t('ok') }]);
          if (st.found === 5) setTimeout(() => { G.addMoney(10000); sfx('win'); ui.dialog(t('advWinT'), t('advWinB'), [{ label: t('ok') }]); }, 400);
        });
        c.key = key; c.idx = i; st.chests.push(c);
      });
      // ចោរដើរល្បាតក្នុងព្រៃ
      this.banditT = 0;
      for (let i = 0; i < 4; i++) spawnEnemy(-40 - rnd() * 50, -25 - rnd() * 45, { aggro: 18 });
      this.refresh();
      ui.toast(t('advStart'));
    },
    refresh() {
      const st = this.st;
      G.markers = st.talked ? st.chests.filter(c => !c.open).map(c => ({ x: c.g.position.x + (c.idx % 2 ? 6 : -5), z: c.g.position.z + (c.idx % 2 ? -4 : 6), color: 'rgba(255,200,60,.35)', kind: 'area', r: 14 })) : [{ x: -35, z: 31, color: '#ffd23a', kind: 'star' }];
      const lines = st.talked ? st.chests.map(c => (c.open ? '✔ ' : '• ') + t(c.key + 'h')) : [t('advTalkFirst')];
      ui.objective(t('modeAdventure') + ' — ' + t('treasures', st.found, 5), lines);
    },
    update(dt) {
      this.banditT += dt;
      if (this.banditT > 12) { this.banditT = 0; if (enemies.filter(e => !e.dead).length < 5) spawnEnemy(-40 - Math.random() * 50, -25 - Math.random() * 45, { aggro: 18 }); }
    }
  };

  // ===== ខ. ប្រយុទ្ធ (Combat): ប្រយុទ្ធជាមួយចោរជារលក =====
  Modes.combat = {
    spawn: [0, 24],
    start() {
      this.wave = 0; this.kills = 0; this.earned0 = P.money; this.break = 2.5; this.toSpawn = 0; this.spawnT = 0;
      this.update(0);
      ui.toast(t('combatStart'));
    },
    update(dt) {
      const alive = enemies.filter(e => !e.dead).length;
      if (this.toSpawn > 0) {
        this.spawnT -= dt;
        if (this.spawnT <= 0) {
          this.spawnT = 0.8;
          const a = Math.random() * Math.PI * 2, r = 22 + Math.random() * 8;
          const big = this.wave % 5 === 0 && this.toSpawn === 1;
          if (spawnEnemy(P.pos.x + Math.cos(a) * r, P.pos.z + Math.sin(a) * r, { level: this.wave, big, aggro: 80 })) this.toSpawn--;
        }
      } else if (alive === 0) {
        this.break -= dt;
        if (this.break <= 0) {
          this.wave++; this.toSpawn = 2 + this.wave + (this.wave % 5 === 0 ? 1 : 0); this.break = 4;
          ui.bigText(t('waveN', this.wave), 1600); sfx('wave');
          if (this.wave > 1) G.healPlayer(25, 50);
        }
      }
      ui.objective(t('modeCombat'), [t('waveN', this.wave), t('kills', this.kills), t('enemiesLeft', alive + this.toSpawn), t('switchWeapon')]);
      G.markers = [];
    },
    onKill() { this.kills++; },
    onDeath() {
      sfx('lose');
      const earned = Math.max(0, P.money - this.earned0);
      setTimeout(() => ui.results(t('gameOver'), [t('waveReached', this.wave), t('kills', this.kills), t('moneyEarned', earned)],
        [{ label: t('retry'), action: () => G.startMode('combat') }, { label: t('backMenu'), action: () => ui.toMenu() }]), 900);
    }
  };

  // ===== គ. បេសកកម្ម (Missions): ជួយអ្នកភូមិ ដឹកទំនិញ ការពារប្រាសាទ =====
  Modes.missions = {
    spawn: [30, 18],
    start() {
      this.active = null;
      const givers = [
        { id: 'help', x: -58, z: 44, look: { gender: 'm', top: 0x6b8a3a, bottom: 0x3a2a1a, accent: C.gold, skin: 0xa86e45 } },
        { id: 'deliver', x: 42, z: 28, look: { gender: 'f', top: 0xd4a52a, bottom: 0xb3261e, accent: 0xf3ead6 } },
        { id: 'defend', x: 5, z: -100, look: { gender: 'm', top: 0xb3261e, bottom: 0xd4a52a, accent: C.gold } }
      ];
      this.givers = givers.map(gv => {
        const n = addNPC(gv.x, gv.z, gv.look, Math.PI * (gv.id === 'defend' ? 0 : 1)); modeObjs.push(n.h.g);
        const mk = modeMarker(n.h.g.position, C.red);
        addInteract({ pos: n.h.g.position, r: 3, label: () => t('talk_' + gv.id), active: () => !this.active || this.active.id === gv.id, use: () => this.talk(gv.id) });
        return Object.assign(gv, { n, mk });
      });
      this.done = {};
      this.refresh();
      ui.toast(t('missionsStart'));
    },
    refresh() {
      if (!this.active) {
        G.markers = this.givers.map(g => ({ x: g.x, z: g.z, color: this.done[g.id] ? '#7dffa8' : '#ff5a4a', kind: 'star' }));
        ui.objective(t('modeMissions'), this.givers.map(g => (this.done[g.id] ? '✔ ' : '• ') + t('m_' + g.id)));
      } else this.active.hud();
    },
    talk(id) {
      if (this.active) { this.active.talk && this.active.talk(); return; }
      ui.dialog(t('m_' + id), t('m_' + id + '_desc'), [{ label: t('accept'), action: () => this['start_' + id]() }, { label: t('later') }]);
    },
    finish(id, reward) {
      this.done[id] = true; G.addMoney(reward); sfx('win');
      ui.dialog(t('missionDone'), t('m_' + id) + '\n' + t('rewardMoney', reward), [{ label: t('ok') }]);
      this.cleanupActive(); this.refresh();
    },
    fail(reason) { sfx('lose'); ui.dialog(t('missionFail'), reason, [{ label: t('ok') }]); this.cleanupActive(); this.refresh(); },
    cleanupActive() { const a = this.active; if (a && a.objs) for (const o of a.objs) { scene.remove(o); const i = markers3d.indexOf(o); if (i >= 0) markers3d.splice(i, 1); } if (a && a.its) interacts = interacts.filter(it => !a.its.includes(it)); this.active = null; },
    // --- ជួយអ្នកភូមិ៖ ប្រមូលបាវស្រូវ ៦ ---
    start_help() {
      const a = this.active = { id: 'help', got: 0, carried: 0, objs: [], its: [], sacks: [] };
      for (let i = 0; i < 6; i++) {
        const x = -130 - Math.random() * 55, z = 15 + Math.random() * 100;
        const s = new T.Group(); s.position.set(x, 0, z);
        part(s, 0.7, 0.8, 0.5, 0, 0.4, 0, M(0xb08a4a)); part(s, 0.3, 0.15, 0.3, 0, 0.88, 0, M(0x8a6a3a));
        scene.add(s); a.objs.push(s);
        const sk = { s, taken: false };
        a.sacks.push(sk);
        a.its.push(addInteract({ pos: s.position, r: 2.2, label: () => t('pickSack'), active: () => !sk.taken, use: () => { sk.taken = true; scene.remove(s); a.carried++; sfx('pickup'); this.refresh(); } }));
      }
      a.talk = () => {
        if (a.carried >= 6) this.finish('help', 2500);
        else ui.dialog(t('m_help'), t('helpProgress', a.carried, 6), [{ label: t('ok') }]);
      };
      a.hud = () => {
        G.markers = a.sacks.filter(s => !s.taken).map(s => ({ x: s.s.position.x, z: s.s.position.z, color: '#ffd23a', kind: 'dot' }));
        if (a.carried >= 6) G.markers.push({ x: -58, z: 44, color: '#ff5a4a', kind: 'star' });
        ui.objective(t('m_help'), [t('sacks', a.carried, 6), a.carried >= 6 ? t('returnFarmer') : t('findSacks')]);
      };
      this.refresh();
    },
    // --- ដឹកជញ្ជូនទំនិញ៖ ដឹកទៅ ៣ កន្លែង ក្នុងពេលកំណត់ ---
    start_deliver() {
      const dests = [[-45, 66, 'dVillage'], [30, -16, 'dCity'], [0, -96, 'dTemple']];
      const a = this.active = { id: 'deliver', i: 0, time: 200, objs: [], its: [] };
      const ring = new T.Mesh(new T.TorusGeometry(2.2, 0.18, 6, 24), M(C.gold, { emissive: 0x664400 }));
      ring.rotation.x = Math.PI / 2; scene.add(ring); a.objs.push(ring);
      const place = () => { const [x, z] = dests[a.i]; ring.position.set(x, 0.3, z); };
      place(); sfx('pickup'); ui.toast(t('gotPackage'));
      a.update = (dt) => {
        a.time -= dt;
        const [x, z] = dests[a.i]; const p = P.vehicle ? P.vehicle.g.position : P.pos;
        ring.rotation.z += dt * 2;
        if (Math.hypot(p.x - x, p.z - z) < 4) {
          a.i++; sfx('coin'); ui.toast(t('delivered', a.i, 3));
          if (a.i >= 3) { this.finish('deliver', 3000 + Math.floor(a.time) * 10); return; }
          place();
        }
        if (a.time <= 0) this.fail(t('timeUp'));
      };
      a.hud = () => {
        const [x, z, k] = dests[Math.min(a.i, 2)];
        G.markers = [{ x, z, color: '#ffd23a', kind: 'star' }];
        ui.objective(t('m_deliver'), [t('deliverTo', t(k)), t('delivered', a.i, 3), t('timeLeft', Math.max(0, Math.ceil(a.time))), t('useMoto')]);
      };
      this.refresh();
    },
    // --- ការពារប្រាសាទ៖ រលកចោរ ៣ ---
    start_defend() {
      const a = this.active = { id: 'defend', wave: 0, toSpawn: 0, spawnT: 0, hp: 600, max: 600, brk: 3, objs: [], its: [] };
      const gate = G.templeGate;
      a.update = (dt) => {
        const alive = enemies.filter(e => !e.dead).length;
        if (a.toSpawn > 0) {
          a.spawnT -= dt;
          if (a.spawnT <= 0) {
            a.spawnT = 1.1;
            const sp = [[0, -60], [-60, -88], [60, -88], [-25, -75], [25, -75]][Math.floor(Math.random() * 5)];
            if (spawnEnemy(sp[0] + rr(-3, 3), sp[1] + rr(-3, 3), { target: gate, level: a.wave * 2, big: a.wave === 3 && a.toSpawn === 1 })) a.toSpawn--;
          }
        } else if (alive === 0) {
          if (a.wave >= 3) { this.finish('defend', 5000); return; }
          a.brk -= dt;
          if (a.brk <= 0) { a.wave++; a.toSpawn = [0, 5, 8, 11][a.wave]; a.brk = 5; ui.bigText(t('waveN', a.wave) + ' / 3', 1600); sfx('wave'); }
        }
      };
      a.hit = (d) => { a.hp -= d; ui.hurtFlash(0.3); if (a.hp <= 0) { clearEnemies(); this.fail(t('templeFell')); } };
      a.hud = () => {
        G.markers = [{ x: gate.x, z: gate.z, color: '#ff5a4a', kind: 'star' }];
        ui.objective(t('m_defend'), [t('templeHp', Math.max(0, Math.ceil(a.hp)), a.max), t('waveN', a.wave) + ' / 3', t('enemiesLeft', enemies.filter(e => !e.dead).length + a.toSpawn)]);
      };
      this.refresh();
    },
    onTargetHit(d) { if (this.active && this.active.hit) this.active.hit(d); },
    update(dt) { if (this.active && this.active.update) this.active.update(dt); if (this.active) this.active.hud(); },
    end() { this.cleanupActive(); }
  };

  // ===== ឃ. ប្រណាំង (Racing): ម៉ូតូ/រថយន្ត តាមផ្លូវក្រុង ឬ ទូកង តាមទន្លេ =====
  const ROUTES = {
    city: [[-60, 110], [60, 110], [104, 104], [110, 60], [110, -60], [104, -84], [60, -90], [-60, -90], [-104, -84], [-110, -60], [-110, 60], [-104, 104]],
    river: [[-120, 145], [-60, 141], [20, 149], [100, 141], [160, 150], [168, 160], [100, 167], [20, 161], [-60, 168], [-140, 165], [-170, 155], [-162, 146]]
  };
  const RIVAL_COLORS = [0x1f3a6b, 0x2f6b5a, 0x5a2a7a];
  Modes.racing = {
    spawn: [-80, 104],
    start(o) {
      const route = o.route || 'city-moto';
      const [track, vtype] = route.split('-');
      const pts = this.pts = ROUTES[track];
      this.laps = 2; this.lockControls = true; this.lockExit = true; this.finished = false; this.time = 0;
      this.count = 3.5; this.lastCount = 4;
      const start = track === 'city' ? [-88, 110] : [-150, 145];
      const heading = Math.PI / 2;
      this.racers = [];
      // អ្នកលេងចាប់ផ្ដើមជួរក្រោយ ដើម្បីកុំឲ្យកាមេរ៉ាជាន់គូប្រកួត
      const grid = track === 'city' ? [[-8, -2.5], [0, -2.5], [0, 2.5], [-8, 2.5]] : [[-11, -3], [0, -3], [0, 3], [-11, 3]];
      grid.forEach(([dx, dz], i) => {
        const v = addVehicle(vtype, i === 0 ? 0xb3261e : RIVAL_COLORS[i - 1], start[0] + dx, start[1] + dz, heading, { temp: true, noInteract: true });
        const r = { v, lap: 0, cp: 0, done: false, name: i === 0 ? P.name : t('rival', i), you: i === 0, finishT: 0 };
        if (i > 0) { v.ai = { skill: 0.86 + Math.random() * 0.1 + i * 0.015, off: rr(-2, 2) }; v.racer = r;
          const rider = makeHuman(randLook()); rider.g.position.set(...v.spec.seat); animHuman(rider, 0, 0, 0, false, true); v.g.add(rider.g); }
        this.racers.push(r);
      });
      enterVehicle(this.racers[0].v);
      this.player = this.racers[0];
      // ច្រកឆ្លងកាត់ (checkpoint) ជារង្វង់មាស
      this.rings = pts.map(([x, z], i) => {
        const n = pts[(i + 1) % pts.length];
        const r = new T.Mesh(new T.TorusGeometry(track === 'city' ? 6.5 : 7, 0.3, 6, 28), M(C.gold, { emissive: 0x553300, transparent: true, opacity: 0.85 }));
        r.position.set(x, track === 'city' ? 3 : 2.5, z); r.rotation.y = Math.atan2(n[0] - x, n[1] - z);
        return addModeObj(r);
      });
      updateCamera(0, true);
      this.hud();
    },
    progress(r) { const n = this.pts.length; const [x, z] = this.pts[r.cp % n]; const p = r.v.g.position; return r.lap * n + r.cp - Math.min(1, Math.hypot(p.x - x, p.z - z) / 60); },
    update(dt) {
      if (this.count > 0) {
        this.count -= dt;
        const c = Math.ceil(this.count);
        if (c !== this.lastCount) { this.lastCount = c; if (c > 0) { ui.bigText(String(c), 800); sfx('beep'); } else { ui.bigText(t('go'), 900); sfx('go'); this.lockControls = false; } }
        return;
      }
      if (!this.finished) this.time += dt;
      const n = this.pts.length;
      for (const r of this.racers) {
        if (r.done) continue;
        const [x, z] = this.pts[r.cp % n], p = r.v.g.position;
        if (Math.hypot(p.x - x, p.z - z) < (r.you ? 11 : 6)) {
          r.cp++;
          if (r.cp >= n) { r.cp = 0; r.lap++; if (r.you && r.lap < this.laps) { ui.bigText(t('lapN', r.lap + 1, this.laps), 1200); sfx('beep'); } }
          if (r.lap >= this.laps) { r.done = true; r.finishT = this.time; if (r.you) this.finish(); }
          else if (r.you) sfx('checkpoint');
        }
      }
      this.rings.forEach((g, i) => { const cur = this.player.cp % n; g.visible = i === cur || i === (cur + 1) % n; g.material = M(C.gold, { emissive: i === cur ? 0xaa6600 : 0x221100, transparent: true, opacity: i === cur ? 0.95 : 0.35 }); });
      this.hud();
    },
    position() {
      const sorted = this.racers.slice().sort((a, b) => (b.done - a.done) || (a.done && b.done ? a.finishT - b.finishT : this.progress(b) - this.progress(a)));
      return sorted.indexOf(this.player) + 1;
    },
    hud() {
      const n = this.pts.length;
      const [x, z] = this.pts[this.player.cp % n];
      G.markers = [{ x, z, color: '#ffd23a', kind: 'star' }];
      ui.race({ lap: Math.min(this.player.lap + 1, this.laps), laps: this.laps, pos: this.position(), total: this.racers.length, time: this.time, speed: Math.abs(this.player.v.speed) * 3.6 });
    },
    finish() {
      this.finished = true; this.lockControls = true;
      const pos = this.position();
      const prize = [0, 5000, 3000, 1500, 500][pos];
      G.addMoney(prize); sfx(pos === 1 ? 'win' : 'finish');
      const fmt = s => Math.floor(s / 60) + ':' + (s % 60).toFixed(2).padStart(5, '0');
      setTimeout(() => ui.results(t('raceFinish'), [t('yourPos', pos, this.racers.length), t('yourTime', fmt(this.time)), t('rewardMoney', prize)],
        [{ label: t('retry'), action: () => G.startMode('racing', { route: this.route }) }, { label: t('backMenu'), action: () => ui.toMenu() }]), 700);
    },
    end() { AG.audio && AG.audio.engine(false); }
  };
  const _rs = Modes.racing.start; Modes.racing.start = function (o) { this.route = o.route || 'city-moto'; _rs.call(this, o); };
  // AI បើកបរតាមចំណុចផ្លូវ
  function aiDrive(v, dt) {
    const m = mode === Modes.racing ? Modes.racing : null;
    if (!m || m.count > 0 || v.racer.done) { v.speed *= Math.exp(-2 * dt); driveVehicle(v, dt, {}); return; }
    const pts = m.pts, n = pts.length, r = v.racer;
    const [x, z] = pts[r.cp % n];
    const p = v.g.position;
    const want = Math.atan2(x + v.ai.off - p.x, z + v.ai.off - p.z);
    const d = angDiff(want, v.heading);
    const ctl = { up: Math.abs(d) < 0.9 || v.speed < 8, left: d > 0.05, right: d < -0.05, brake: Math.abs(d) > 0.6 && v.speed > 14 };
    const capped = v.spec.max * v.ai.skill;
    driveVehicle(v, dt, ctl);
    if (v.speed > capped) v.speed = capped;
  }

  // ===== ង. ពហុអ្នកលេង (Multiplayer): ដើរលេងសេរីជាមួយមិត្តភក្តិ =====
  Modes.multiplayer = {
    spawn: [0, 24],
    start() { ui.objective(t('modeMulti'), [t('mpHint1'), t('mpHint2')]); },
    update() { G.markers = (AG.mp && AG.mp.mapMarkers()) || []; }
  };

  // =================================================================
  // ១៣. ផែនទីតូច (Minimap)
  // =================================================================
  let mmCtx = null, mmT = 0;
  G.setMinimap = (canvas) => { mmCtx = canvas.getContext('2d'); };
  function drawMinimap() {
    if (!mmCtx) return;
    const c = mmCtx, W = c.canvas.width, H = c.canvas.height, range = 110, s = W / (range * 2);
    const p = P.vehicle ? P.vehicle.g.position : P.pos;
    const X = x => (x - p.x) * s + W / 2, Z = z => (z - p.z) * s + H / 2;
    c.fillStyle = '#5e8a36'; c.fillRect(0, 0, W, H);
    for (const r of mapRects) {
      if (r.x1 < p.x - range || r.x0 > p.x + range || r.z1 < p.z - range || r.z0 > p.z + range) continue;
      c.fillStyle = r.color; c.fillRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
    }
    for (const m of G.markers) {
      const mx = X(m.x), mz = Z(m.z);
      if (m.kind === 'area') { c.fillStyle = m.color; c.beginPath(); c.arc(mx, mz, m.r * s, 0, 7); c.fill(); continue; }
      const cx = clamp(mx, 8, W - 8), cz = clamp(mz, 8, H - 8);
      c.fillStyle = m.color; c.strokeStyle = '#2a1206'; c.lineWidth = 2;
      c.beginPath();
      if (m.kind === 'star') { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rad = i % 2 ? 3 : 7; c.lineTo(cx + Math.cos(a) * rad, cz + Math.sin(a) * rad); } }
      else c.arc(cx, cz, 4, 0, 7);
      c.closePath(); c.stroke(); c.fill();
    }
    c.fillStyle = '#ff3b2f';
    for (const e of enemies) if (!e.dead) { c.beginPath(); c.arc(X(e.pos.x), Z(e.pos.z), e.big ? 4 : 3, 0, 7); c.fill(); }
    // អ្នកលេង (ព្រួញ)
    const ang = P.vehicle ? P.vehicle.heading : P.rot;
    c.save(); c.translate(W / 2, H / 2); c.rotate(-ang + Math.PI);
    c.fillStyle = '#ffd23a'; c.strokeStyle = '#2a1206'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -8); c.lineTo(6, 6); c.lineTo(0, 3); c.lineTo(-6, 6); c.closePath(); c.stroke(); c.fill();
    c.restore();
  }

  // =================================================================
  // ១៤. រង្វិលជុំហ្គេម (Game Loop)
  // =================================================================
  let hudT = 0;
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(G.clock.getDelta(), 0.05);
    if (G.running && !G.paused) {
      updatePlayer(dt);
      updateVehicles(dt);
      updateEnemies(dt);
      updateCoins(dt);
      updateNPCs(dt);
      if (mode && mode.update) mode.update(dt);
      updateInteract();
      if (AG.mp && AG.mp.update) AG.mp.update(dt);
    } else if (!G.running) {
      // ម៉ឺនុយ៖ កាមេរ៉ាវិលជុំវិញតួអង្គ (មើលសម្លៀកបំពាក់)
      cam.yaw += dt * 0.25; cam.pitch = 0.12; cam.dist = 4;
      P.h.g.position.copy(P.pos); animHuman(P.h, dt, 0, 0, false, false); updateNPCs(dt);
    }
    if (G.running) cam.dist = innerHeight > innerWidth ? 7.5 : 6; // បញ្ឈរ៖ កាមេរ៉ាឆ្ងាយបន្តិច
    updateMarkers(dt);
    updateCamera(dt, false);
    updateFloats(dt);
    hudT += dt; mmT += dt;
    if (hudT > 0.1) {
      hudT = 0;
      ui.hud({ hp: P.hp, maxHp: P.maxHp, st: P.st, maxSt: P.maxSt, money: P.money, weapon: P.weapon, veh: P.vehicle ? { type: P.vehicle.type, speed: Math.abs(P.vehicle.speed) * 3.6 } : null });
    }
    if (mmT > 0.08) { mmT = 0; drawMinimap(); }
    renderer.render(scene, camera);
  }

  // បង្កើតវត្ថុអចិន្ត្រៃយ៍ ក្រោយពិភពលោករួច
  const _init = G.init;
  G.init = function (canvas) { _init(canvas); setupPermanent(); G.running = false; };

  // ទិន្នន័យសម្រាប់ Multiplayer
  G.getPlayerState = () => {
    const v = P.vehicle;
    return { x: +P.pos.x.toFixed(2), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(2), r: +P.rot.toFixed(2), atk: +P.atk.toFixed(2),
      mv: input().keys.w || input().keys.a || input().keys.s || input().keys.d ? 1 : 0, w: P.weapon, look: P.look, name: P.name,
      v: v ? { t: v.type, x: +v.g.position.x.toFixed(2), z: +v.g.position.z.toFixed(2), h: +v.heading.toFixed(2), c: v.color } : null };
  };
})();
