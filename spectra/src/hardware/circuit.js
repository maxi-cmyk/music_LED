// Mock circuit on a half-size breadboard: ESP32, KY-037 microphone, HW-479 RGB module, jumper wires.
// Flat fills with crisp edge lines (line-art, like the home scene); drag to orbit, hover a part to name it.
// Pins follow the README table: A0 -> GPIO 4, R/G/B -> GPIO 19/18/5, mic power -> 3V3, grounds -> a shared rail.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const CHALK = 0xf2f2ec, DIM = 0x6a6a64, RED = 0xff6b5a, GREEN = 0x8fe36a, BLUE = 0x5cbcff, WHITE = new THREE.Color(0xffffff);
const P = 2.54, H = 8.5; // breadboard hole pitch; breadboard height (mm)
const colX = (c) => (c - 14.5) * P; // 30 columns across
const rowZ = (r) => (r < 5 ? -(3.81 + (4 - r) * P) : 3.81 + (r - 5) * P); // rows a-e, trench, f-j
const railX = (j) => (j + Math.floor(j / 5) - 14) * P; // 25 holes per rail in groups of 5
const RAIL_Z = 24.7; // outer rail on the near side
const LEAK = 0.15, GAIN = [1, 0.82, 0.92]; // same band-to-colour rules as the firmware and the Overview

const flat = (color) => new THREE.MeshBasicMaterial({ color, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const line = (color) => new THREE.LineBasicMaterial({ color });
const tag = (o, color) => { o.userData.base = new THREE.Color(color); return o; }; // base colour restored after hover

// fill + edge lines for any geometry; the same pair is what hover recolours
function solid(geometry, fill, edge = DIM, angle = 30) {
  const g = new THREE.Group();
  g.add(tag(new THREE.Mesh(geometry, flat(fill)), fill), tag(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, angle), line(edge)), edge));
  return g;
}
const box = (w, h, d, fill, edge, at) => { const g = solid(new THREE.BoxGeometry(w, h, d), fill, edge); g.position.set(...at); return g; };
const cylinder = (r, h, fill, edge, at) => { const g = solid(new THREE.CylinderGeometry(r, r, h, 28), fill, edge, 40); g.position.set(...at); return g; };

// flat text lying on a surface, readable from the near side; turn: 1 runs the text along the board's depth instead
function label(text, w, h, { color = '#9a9a94', turn = 0, px = 14 } = {}) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * px * 4); c.height = Math.round(h * px * 4);
  const x = c.getContext('2d');
  x.fillStyle = color; x.font = `600 ${c.height * 0.72}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, c.width / 2, c.height / 2 + c.height * 0.04);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  const g = new THREE.Group(); g.add(m); g.rotation.y = turn * Math.PI / 2;
  return g;
}

const glowTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), grad = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.28)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = grad; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
};

// what the three bands might do in real music (same shapes as the Overview's last page), through the firmware's gain and 15% cut
// every few seconds a different mix of bands leads, so the LED visits red, yellow, green, cyan, blue, magenta and white
const SCENES = [[1, 0.08, 0.06], [1, 1, 0.06], [0.1, 1, 0.08], [0.06, 1, 1], [0.08, 0.1, 1], [1, 0.08, 1], [1, 1, 1]];
const emphasis = (t) => {
  const SCENE = 3.5, BLEND = 1, k = Math.floor(t / SCENE), x = Math.min(1, Math.max(0, (t - k * SCENE - (SCENE - BLEND)) / BLEND)), m = x * x * (3 - 2 * x);
  const a = SCENES[k % SCENES.length], b = SCENES[(k + 1) % SCENES.length];
  return a.map((v, i) => v + (b[i] - v) * m);
};
const bandColour = (t) => {
  const kick = Math.exp(-((t % 0.7) / 0.7) * 4), hat = Math.exp(-(((t + 0.35) % 1.4) / 1.4) * 10), e = emphasis(t);
  const bands = [
    (0.3 + 0.7 * kick) * (0.7 + 0.3 * Math.sin(t * 0.5) ** 2) * e[0],
    0.95 * (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.9)) ** 1.3) * e[1],
    (0.3 + 0.7 * hat) * (0.6 + 0.4 * Math.sin(t * 1.7) ** 2) * e[2],
  ].map((v, i) => v * GAIN[i]);
  const top = Math.max(...bands);
  return bands.map((v) => (v - LEAK * top > 0 ? Math.min(1, (v - LEAK * top) / (1 - LEAK)) : 0));
};

export default function start(host, onHover, onSelect = () => {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 1, 1000);
  camera.position.set(68, 100, 165);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(-6, 4, 8);
  // dragging only ever orbits (like the home scene): no panning, so a drag can never slide the model sideways
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, rotateSpeed: 0.9, minDistance: 35, maxDistance: 320, maxPolarAngle: Math.PI * 0.5 });
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };

  // the guided tour: the page's clock t moves the camera between these stops; grabbing the model takes over until the clock moves again
  const POSES = [
    { pos: [68, 100, 165], target: [-6, 4, 8], focus: [] },
    { pos: [-16, 58, 98], target: [-62, 4, 8], focus: ['mic-capsule', 'mic-board', 'wire-a0', 'wire-3v3', 'wire-gnd-mic'] },
    { pos: [52, 82, 102], target: [18, 6, -1], focus: ['esp-chip', 'esp-board'] },
    { pos: [112, 62, 94], target: [54, 4, 10], focus: ['rgb', 'wire-r', 'wire-g', 'wire-b', 'wire-gnd-led'] },
    { pos: [68, 100, 165], target: [-6, 4, 8], focus: [] }, // pulled back: the whole circuit, centred
  ];
  const V = (a) => new THREE.Vector3(...a);
  let clock = 0, anchor = 0, grabbed = false, seg = null, focusStop = -1, focus = new Set(), settled = false;
  const smooth = (x) => x * x * (3 - 2 * x);
  renderer.domElement.addEventListener('pointerdown', () => { grabbed = true; });
  renderer.domElement.addEventListener('wheel', () => { grabbed = true; }, { passive: true });
  controls.target.copy(V(POSES[0].target));
  camera.position.copy(V(POSES[0].pos));

  const table = new THREE.GridHelper(260, 26, 0x2a2a2a, 0x151515);
  table.position.set(-6, -0.05, 8);
  scene.add(table);

  const parts = new Map(); // id -> groups that light up together
  const pick = []; // meshes the pointer can hit
  const own = (id, ...groups) => {
    parts.set(id, [...(parts.get(id) ?? []), ...groups]);
    groups.forEach((g) => g.traverse((o) => { if (o.isMesh && o.userData.base) { o.userData.id = id; pick.push(o); } }));
  };
  const setHot = (id, on, fill = 0.45) => parts.get(id)?.forEach((root) => root.traverse((o) => {
    const base = o.userData.base;
    if (!base) return;
    if (o.isLineSegments) o.material.color.copy(on ? WHITE : base);
    else if (o.isMesh) o.material.color.copy(base).lerp(WHITE, on ? fill : 0);
  }));

  // ---- breadboard ----
  const board = box(82, H, 55, 0x262624, 0x8a8a84, [0, H / 2, 0]);
  scene.add(board);
  own('breadboard', board);
  const holes = [];
  for (let c = 0; c < 30; c++) for (let r = 0; r < 10; r++) holes.push([colX(c), rowZ(r)]);
  for (const z of [-24.7, -22.2, 22.2, 24.7]) for (let j = 0; j < 25; j++) holes.push([railX(j), z]);
  const holeMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5, 1.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000 }), holes.length);
  holes.forEach(([x, z], i) => holeMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, H + 0.03, z)));
  scene.add(holeMesh);
  const trench = new THREE.Mesh(new THREE.PlaneGeometry(80, 2.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  trench.position.y = H + 0.02;
  scene.add(trench);

  // ---- ESP32 dev board: USB end on the left, the lower pin row (the one that is wired) towards the viewer ----
  const BOTTOM = ['3V3', 'GND', 'D15', 'D2', 'D4', 'RX2', 'TX2', 'D5', 'D18', 'D19', 'D21', 'RX0', 'TX0', 'D22', 'D23'];
  const USED = { '3V3': 1, D4: 1, D5: 1, D18: 1, D19: 1, GND: 1 };
  const pinCol = (name) => 11 + BOTTOM.indexOf(name);
  const esp = new THREE.Group();
  const pcbY = H + 2.5, topY = pcbY + 1.6;
  const espBoard = new THREE.Group();
  espBoard.add(
    box(52, 1.6, 28.5, 0x0a1210, 0xbdbdb4, [7.61, pcbY + 0.8, -1.27]),
    box(38.1, 2.5, 2.54, 0x0b0b0b, DIM, [colX(18), H + 1.25, rowZ(0)]),
    box(38.1, 2.5, 2.54, 0x0b0b0b, DIM, [colX(18), H + 1.25, rowZ(8)]),
    box(7, 2.8, 8, 0x3a3a38, 0xaaaaa2, [-17.2, topY + 1.4, -1.27]),
    box(3.4, 1.6, 3.4, 0x2a2a28, DIM, [-9.5, topY + 0.8, -7.5]),
    box(3.4, 1.6, 3.4, 0x2a2a28, DIM, [-9.5, topY + 0.8, 4.9]),
    box(1.2, 0.5, 1.2, 0x5a1a14, RED, [-12.5, topY + 0.25, 8.5]),
  );
  const chip = box(18, 3, 25.5, 0x2c2c2a, 0xaaaaa2, [24.5, topY + 1.5, -1.27]);
  esp.add(espBoard, chip);
  BOTTOM.forEach((name, i) => {
    const used = USED[name];
    const l = label(name, 8, 2.3, { color: used ? '#f2f2ec' : '#6a6a64', turn: 1 });
    l.position.set(colX(11 + i), topY + 0.05, 7.4);
    esp.add(l);
  });
  const chipLabel = label('ESP32', 14, 4, { color: '#bdbdb4' });
  chipLabel.position.set(24.5, topY + 3.05, -1.27);
  esp.add(chipLabel);
  scene.add(esp);
  own('esp-board', espBoard);
  own('esp-chip', chip);

  // ---- KY-037 microphone module: capsule at the far end, 4-pin header (A0 G + D0) at the near end ----
  const mic = new THREE.Group();
  const micBoard = new THREE.Group();
  micBoard.add(
    box(15, 1.6, 36, 0x3a1512, RED, [0, 0.8, 0]),
    box(7, 4.5, 7, 0x1c4a7a, BLUE, [0, 3.85, -2.5]),
    box(4.5, 1.4, 5, 0x050505, DIM, [0, 2.3, 5]),
    box(10.2, 2.5, 2.54, 0x0b0b0b, DIM, [0, 2.85, 16]),
    box(1.2, 0.5, 1.2, 0x5a1a14, RED, [5.5, 1.85, 8]),
    box(1.2, 0.5, 1.2, 0x5a1a14, RED, [-5.5, 1.85, 8]),
  );
  const capsule = cylinder(4.6, 6.5, 0x5a5a55, 0xbdbdb4, [0, 1.6 + 3.25, -12]);
  const grille = new THREE.Mesh(new THREE.CircleGeometry(2.2, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  grille.position.set(0, 1.6 + 6.55, -12);
  mic.add(micBoard, capsule, grille);
  const micLabel = label('KY-037', 12, 3, { color: '#ff6b5a', turn: -1 }); // the module is turned a quarter, so the labels turn back
  micLabel.position.set(-3.8, 1.65, 4);
  mic.add(micLabel);
  [['A0', -3.81], ['G', -1.27], ['+', 1.27], ['D0', 3.81]].forEach(([name, x]) => {
    const l = label(name, 3.2, 2.2, { color: '#d9a49c', turn: -1 });
    l.position.set(x, 1.65, 12.2);
    mic.add(l);
  });
  mic.position.set(-64, 0, 6);
  mic.rotation.y = Math.PI / 2; // header end faces the breadboard
  scene.add(mic);
  own('mic-board', micBoard);
  own('mic-capsule', capsule);
  // sound arriving: rings drop onto the capsule
  const rings = [0, 1, 2].map(() => {
    const pts = Array.from({ length: 49 }, (_, i) => new THREE.Vector3(Math.cos(i / 48 * 6.2832), 0, Math.sin(i / 48 * 6.2832)));
    const r = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: CHALK, transparent: true }));
    r.position.set(0, 12, -12);
    mic.add(r);
    return r;
  });

  // ---- HW-479 RGB module: header (B G R -) on the left, one LED ----
  const rgb = new THREE.Group();
  const rgbBoard = new THREE.Group();
  rgbBoard.add(
    box(20, 1.6, 15, 0x10202a, BLUE, [0, 0.8, 0]),
    box(2.54 * 4, 2.5, 2.54, 0x0b0b0b, DIM, [0, 0, 0]),
  );
  rgbBoard.children[1].rotation.y = Math.PI / 2;
  rgbBoard.children[1].position.set(-8, 2.85, 0);
  const domeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const dome = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 4.2, 28), domeMat);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(2.6, 28, 14, 0, 6.2832, 0, Math.PI / 2), domeMat);
  stem.position.y = 1.6 + 2.1; cap.position.y = 1.6 + 4.2;
  dome.add(stem, cap);
  dome.position.set(3.5, 0, 0);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x000000, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  glow.position.set(3.5, 8.2, 0);
  const rgbLabel = label('HW-479', 9, 2.6, { color: '#5cbcff' });
  rgbLabel.position.set(-0.5, 1.65, 5.2);
  const hdr = [['B', BLUE], ['G', GREEN], ['R', RED], ['-', CHALK]];
  rgb.add(rgbBoard, dome, glow, rgbLabel);
  hdr.forEach(([name], i) => {
    const l = label(name, 2.2, 2.2, { color: '#9a9a94' });
    l.position.set(-5.2, 1.65, (i - 1.5) * P);
    rgb.add(l);
  });
  rgb.position.set(58, 0, 8);
  scene.add(rgb);
  own('rgb', rgbBoard, dome);
  // the dome is dynamic: give its meshes an id for picking without the hover recolour
  [stem, cap].forEach((m) => { m.userData.id = 'rgb'; pick.push(m); });

  // ---- wires ----
  const world = (group, x, y, z) => group.localToWorld(new THREE.Vector3(x, y, z));
  scene.updateMatrixWorld(true);
  const hole = (c, r) => new THREE.Vector3(colX(c), H, rowZ(r));
  const rail = (j) => new THREE.Vector3(railX(j), H, RAIL_Z);
  const wires = [];
  // flow: 'in' = sound travelling to the ESP32, 'out' = brightness travelling to the LED, 'dc' = steady power / ground
  const wire = (id, s, e, color, lift, flow, level = () => 1, rev = false) => {
    const at = (k, h) => { const v = s.clone().lerp(e, k); v.y = H + h; return v; };
    const curve = new THREE.CatmullRomCurve3([s, s.clone().add(new THREE.Vector3(0, 4, 0)), at(0.2, lift * 0.75), at(0.5, lift), at(0.8, lift * 0.75), e.clone().add(new THREE.Vector3(0, 4, 0)), e.clone().add(new THREE.Vector3(0, -1, 0))]);
    const g = new THREE.Group();
    g.add(tag(new THREE.Mesh(new THREE.TubeGeometry(curve, 72, 0.6, 8, false), flat(color)), color));
    // a fatter invisible tube around the wire so thin wires are easy to hover and click
    const hit = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 2, 6, false), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    hit.userData.id = id;
    pick.push(hit);
    g.add(hit);
    scene.add(g);
    own(id, g);
    wires.push({ curve, color, flow, level, rev });
  };
  // a black dupont connector on top of a header pin; the wire starts at its top
  const plug = (group, x, z) => {
    group.add(box(2.3, 8, 2.3, 0x0b0b0b, DIM, [x, 6.8, z]));
    scene.updateMatrixWorld(true);
    return world(group, x, 10.8, z);
  };
  const micPin = (x) => plug(mic, x, 16);
  const rgbPin = (z) => plug(rgb, -8, z);
  wire('wire-3v3', micPin(1.27), hole(pinCol('3V3'), 8), 0xe0453a, 14, 'dc', undefined, true);
  wire('wire-a0', micPin(-3.81), hole(pinCol('D4'), 8), 0xffa040, 22, 'in');
  wire('wire-gnd-mic', micPin(-1.27), rail(5), 0x9a6a4a, 18, 'dc');
  // ESP32 -> LED: the pulse starts at the board end and grows with that colour's band
  wire('wire-b', rgbPin(-1.5 * P), hole(pinCol('D5'), 8), BLUE, 16, 'out', (lv) => lv[2], true);
  wire('wire-g', rgbPin(-0.5 * P), hole(pinCol('D18'), 8), GREEN, 20, 'out', (lv) => lv[1], true);
  wire('wire-r', rgbPin(0.5 * P), hole(pinCol('D19'), 8), RED, 24, 'out', (lv) => lv[0], true);
  wire('wire-gnd-led', rgbPin(1.5 * P), rail(19), 0xcfcfc8, 12, 'dc');
  wire('wire-gnd-esp', hole(pinCol('GND'), 8), rail(7), 0x8a8a84, 12, 'dc');

  // pulses travelling the wires
  const pulses = wires.flatMap((w) => Array.from({ length: w.flow === 'dc' ? 2 : 3 }, (_, k) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: w.flow === 'in' ? CHALK : w.flow === 'out' ? w.color : 0x9a9a94 }));
    scene.add(m);
    return { m, w, k, n: w.flow === 'dc' ? 2 : 3 };
  }));

  // ---- pointer: hover names a part, a click (a press that does not move) pins it ----
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let hot = null, selected = null, down = null;
  const pickAt = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    return ray.intersectObjects(pick, false)[0]?.object.userData.id ?? null;
  };
  const light = () => { // a part is lit while it is hovered or selected
    for (const id of parts.keys()) setHot(id, id === hot || id === selected || focus.has(id), id === hot || id === selected ? 0.45 : 0.12); // a tour highlight is gentler than a hover
    renderer.domElement.style.cursor = hot ? 'pointer' : 'grab';
  };
  const canvas = renderer.domElement;
  const onMove = (e) => {
    if (e.buttons) return; // dragging: the orbit controls own the pointer
    const id = pickAt(e);
    if (id !== hot) { hot = id; light(); }
    onHover(hot, e.clientX, e.clientY);
  };
  const onLeave = () => { hot = null; light(); onHover(null, 0, 0); };
  const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; onLeave(); };
  const onUp = (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; }
    down = null;
    const id = pickAt(e);
    selected = id && id !== selected ? id : null;
    light();
    onSelect(selected, e.clientX, e.clientY);
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.style.cursor = 'grab';

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = Math.min(75, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(17)) / Math.min(1, camera.aspect / 1.4))));
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let t = 0, raf, previous, paused = false;
  (function frame(now = performance.now()) {
    const dt = previous === undefined ? 1 / 60 : Math.min(Math.max(0, now - previous) / 1000, 0.1); // a frame timestamp can precede the previous one by a few ms
    previous = now;
    if (!paused) t += dt * 0.7; // the same 0.7x pace as the player
    const lv = bandColour(t);
    const colour = new THREE.Color(lv[0], lv[1], lv[2]);
    domeMat.color.copy(colour).multiplyScalar(0.25 + 0.75 * Math.max(...lv));
    glow.material.color.copy(colour);
    glow.scale.setScalar(10 + 26 * Math.max(...lv));
    glow.material.opacity = Math.max(...lv) > 0 ? 0.9 : 0;
    rings.forEach((r, i) => {
      const k = (t * 0.45 + i / 3) % 1;
      r.position.y = 6.5 + (1 - k) * 14;
      r.scale.setScalar(4.6 + (1 - k) * 6);
      r.material.opacity = Math.sin(k * Math.PI) * 0.7;
    });
    pulses.forEach(({ m, w, k, n }) => {
      const u = (((t * (w.flow === 'dc' ? 0.3 : 0.45) + k / n) % 1) + 1) % 1;
      m.position.copy(w.curve.getPointAt(Math.min(0.999, w.rev ? 1 - u : u)));
      m.scale.setScalar(w.flow === 'out' ? 0.35 + 0.9 * w.level(lv) : w.flow === 'in' ? 0.7 + 0.4 * Math.sin(t * 9 + k * 2) : 0.6);
    });
    // tour camera: at rest on a stop the viewer is free; between stops the camera glides from where it was
    const stop = Math.round(clock), moving = Math.abs(clock - stop) > 1e-3;
    if (moving) {
      if (!seg) seg = { pos: grabbed ? camera.position.clone() : V(POSES[anchor].pos), target: grabbed ? controls.target.clone() : V(POSES[anchor].target) };
      const to = POSES[Math.max(0, Math.min(POSES.length - 1, clock > anchor ? anchor + 1 : anchor - 1))];
      const k = smooth(Math.min(1, Math.abs(clock - anchor)));
      camera.position.lerpVectors(seg.pos, V(to.pos), k);
      controls.target.lerpVectors(seg.target, V(to.target), k);
      settled = false;
    } else if (!settled || anchor !== stop) {
      anchor = Math.max(0, Math.min(POSES.length - 1, stop)); seg = null; grabbed = false; settled = true;
      camera.position.copy(V(POSES[anchor].pos));
      controls.target.copy(V(POSES[anchor].target));
    }
    if (stop !== focusStop) { focusStop = stop; focus = new Set(POSES[Math.max(0, Math.min(POSES.length - 1, stop))].focus); light(); }
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  })();

  return {
    setPaused: (p) => { paused = p; },
    setClock: (c) => { clock = c; },
    select: (id) => { selected = id; light(); },
    stop() {
      cancelAnimationFrame(raf);
      scene.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); });
      window.removeEventListener('resize', resize);
      controls.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
