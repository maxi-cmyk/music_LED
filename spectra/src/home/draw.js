// 3D epicycles: three chained phasors (bass, mids, treble) whose tips trace helices
// down a time axis. Coloured helices are the pure components; the white one is their sum.
// With the mic on, band energy (same bands as the ESP32 firmware) drives the radii.
import * as THREE from 'three';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// Reuse the webpage FFT; adapt microphone band strengths for the animation.
import { createMicrophone } from './microphone.mjs';
import { REST_RADIUS, RADIUS_RANGE } from './mic-response.mjs';

// [idle radius, angular speed rad/s, phase, colour]
const CIRCLES = [
  [0.9, 1.0, 0, 0xff6b5a, ],
  [0.9, 3.1, 1.3, 0x8fe36a, ],
  [0.9, 7.3, 2.6, 0x5cbcff, ],
];
const N = 360, DZ = 0.03; // trail points, spacing along the time axis

export default function start(host, onMicState) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(6, 4, 9);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;
  controls.target.set(0, 0, -N * DZ / 2);
  renderer.domElement.addEventListener('pointerdown', () => (controls.autoRotate = false));

  const mat = (color, op = 1) => new THREE.LineBasicMaterial({
    color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, vertexColors: false });
  const ring = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 65 }, (_, i) => new THREE.Vector3(Math.cos(i / 64 * 6.2832), Math.sin(i / 64 * 6.2832))));

  // one trail = positions + per-vertex colour that fades with age
  const trail = (hex) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const c = new THREE.Color(hex), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) [c.r, c.g, c.b].forEach((v, k) => (col[i * 3 + k] = v * (1 - (i / N) ** 3)));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending }));
    l.frustumCulled = false;
    scene.add(l);
    return g.attributes.position;
  };
  const sumTrail = trail(0xf2f2ec);
  const parts = CIRCLES.map(([, , , hex]) => trail(hex));
  const push = (attr, x, y) => {
    attr.array.copyWithin(3, 0, (N - 1) * 3);
    attr.array[0] = x; attr.array[1] = y; attr.array[2] = 0;
    for (let i = 0; i < N; i++) attr.array[i * 3 + 2] = -i * DZ;
    attr.needsUpdate = true;
  };

  const rings = CIRCLES.map(([, , , hex]) => {
    const r = new THREE.Line(ring, mat(hex, 0.7));
    const arm = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), mat(hex));
    scene.add(r, arm);
    return { r, arm };
  });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07), new THREE.MeshBasicMaterial({ color: 0xf2f2ec }));
  scene.add(tip);
  // dotted-ish guide from tip to the time axis origin plane
  const grid = new THREE.GridHelper(8, 16, 0x333333, 0x1a1a1a);
  grid.position.set(0, -2.6, -N * DZ / 2); grid.scale.z = 1.4;
  scene.add(grid);

  const microphone = createMicrophone(onMicState);

  // axis orientation gizmo; click an axis to snap the camera there
  const gizmo = new ViewHelper(camera, renderer.domElement);
  gizmo.center = controls.target;
  gizmo.location.right = 8;
  // ViewHelper's own animation slerps through a degenerate lookAt at the poles (red -> green swings sideways),
  // so read where it would end up and animate polar/azimuth angles ourselves.
  let snap = null;
  renderer.domElement.addEventListener('pointerdown', (e) => {
    snap = null;
    const pos = camera.position.clone(), quat = camera.quaternion.clone();
    if (!gizmo.handleClick(e)) return;
    e.stopImmediatePropagation(); // don't start an orbit drag from the gizmo
    controls.autoRotate = false;
    const from = new THREE.Spherical().setFromVector3(pos.clone().sub(controls.target));
    gizmo.update(1e3); // jump to the end of the animation, then undo
    const to = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    camera.position.copy(pos); camera.quaternion.copy(quat);
    if (Math.sin(to.phi) < 0.01) { // at a pole azimuth is undefined: keep the current one
      to.phi = to.phi < 1 ? 0.001 : Math.PI - 0.001;
      to.theta = from.theta;
    }
    const turn = ((to.theta - from.theta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    snap = { from, dPhi: to.phi - from.phi, dTheta: turn, t: 0 };
  }, { capture: true });

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    gizmo.location.bottom = h * 0.07; // keep clear of the page's bottom edge
    camera.aspect = w / h;
    // keep the horizontal field of view constant so narrow containers don't crop the sides
    camera.fov = Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(30)) / Math.min(1, camera.aspect))));
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let t = 0, raf, previousTime, radii = CIRCLES.map(([radius]) => radius);
  (function frame(now = performance.now()) {
    const dt = previousTime === undefined ? 1 / 60 : Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;
    t += dt;
    const response = microphone.read(dt);
    const targets = response
      ? response.levels.map((level) => REST_RADIUS + RADIUS_RANGE * level)
      : CIRCLES.map(([radius], i) => radius * (1 + 0.25 * Math.sin(t * 0.25 + i * 2)));
    radii = targets.map((target, i) => radii[i] + (target - radii[i]) * -Math.expm1(-dt / 0.08));
    if (response) onMicState?.('live', response.calibrating
      ? 'Keep quiet briefly while the microphone adjusts.' : 'Microphone on.');

    let x = 0, y = 0;
    CIRCLES.forEach(([, speed, phase], i) => {
      const r = radii[i], a = speed * t + phase;
      const { r: rg, arm } = rings[i];
      rg.position.set(x, y, 0); rg.scale.set(r, r, 1);
      arm.position.set(x, y, 0); arm.scale.set(r, 1, 1); arm.rotation.z = a;
      push(parts[i], r * Math.cos(a), r * Math.sin(a));
      x += r * Math.cos(a); y += r * Math.sin(a);
    });
    tip.position.set(x, y, 0);
    push(sumTrail, x, y);

    if (snap) {
      snap.t = Math.min(snap.t + dt / 0.5, 1);
      const k = snap.t * snap.t * (3 - 2 * snap.t);
      camera.position.setFromSphericalCoords(snap.from.radius, snap.from.phi + snap.dPhi * k, snap.from.theta + snap.dTheta * k).add(controls.target);
      if (snap.t === 1) snap = null;
    }
    controls.update();
    renderer.autoClear = true;
    renderer.render(scene, camera);
    renderer.autoClear = false;
    gizmo.render(renderer);
    raf = requestAnimationFrame(frame);
  })();

  return {
    enableMic: microphone.start,
    disableMic: microphone.stop,
    stop() {
      cancelAnimationFrame(raf);
      microphone.stop();
      scene.traverse((object) => {
        object.geometry?.dispose();
        object.material?.dispose();
      });
      window.removeEventListener('resize', resize);
      controls.dispose(); gizmo.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
