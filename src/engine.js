// Silnik 3D: ładowanie modeli, stany widoczności/podświetlenia, wskazywanie, kamera.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export const FILES = ['skeleton', 'muscles', 'insertions', 'nerves', 'cardio', 'joints', 'cns'];
const BASE = import.meta.env.BASE_URL;

export class Engine extends EventTarget {
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 30);
    this.camera.position.set(0, 1.0, 4.2);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 0.9, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minDistance = 0.05;
    this.controls.maxDistance = 8;
    this.controls.zoomToCursor = true;
    this.controls.addEventListener('change', () => this.invalidate());

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x4a4f5c, 1.5));
    const head = new THREE.DirectionalLight(0xffffff, 1.9);
    head.position.set(0.4, 0.6, 1);
    this.camera.add(head);
    this.scene.add(this.camera);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.overlay = new THREE.Group(); // linie działania, znaczniki
    this.scene.add(this.overlay);

    this.meta = [];
    this.meshes = []; // id -> Mesh
    this.loaded = new Set();
    this.loading = new Map();
    this.materials = new Map();
    this.state = new Map(); // id -> klucz stanu
    this.raycaster = new THREE.Raycaster();
    this.frameCallbacks = new Set();
    this._dirty = true;
    this._anim = null;

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    this.loader = loader;

    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();
    this._bindPointer();
    this.renderer.setAnimationLoop((t) => this._tick(t));
  }

  async init() {
    this.meta = await (await fetch(`${BASE}data/meta.json`)).json();
    return this.meta;
  }

  ensure(file) {
    if (this.loaded.has(file)) return Promise.resolve();
    if (this.loading.has(file)) return this.loading.get(file);
    const p = this.loader.loadAsync(`${BASE}models/${file}.glb`).then((gltf) => {
      const list = [];
      gltf.scene.traverse((o) => { if (o.isMesh) list.push(o); });
      gltf.scene.updateMatrixWorld(true);
      for (const mesh of list) {
        const id = Number(mesh.name);
        const m = this.meta[id];
        if (!m) continue;
        // geometrię przenosimy do przestrzeni świata – upraszcza animacje i pomiary
        const pos = mesh.geometry.attributes.position;
        const f = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) { f[i * 3] = pos.getX(i); f[i * 3 + 1] = pos.getY(i); f[i * 3 + 2] = pos.getZ(i); }
        mesh.geometry.setAttribute('position', new THREE.BufferAttribute(f, 3));
        mesh.geometry.applyMatrix4(mesh.matrixWorld);
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
        mesh.position.set(0, 0, 0); mesh.quaternion.identity(); mesh.scale.set(1, 1, 1);
        mesh.matrixAutoUpdate = false; mesh.matrix.identity(); mesh.matrixWorld.identity();
        mesh.userData.id = id;
        mesh.visible = false;
        this.meshes[id] = mesh;
        this.root.add(mesh);
      }
      this.loaded.add(file);
      this.loading.delete(file);
      this.dispatchEvent(new CustomEvent('loaded', { detail: file }));
    });
    this.loading.set(file, p);
    return p;
  }

  ensureAll(files = FILES) { return Promise.all(files.map((f) => this.ensure(f))); }

  // ---------- materiały ----------
  material(key) {
    let m = this.materials.get(key);
    if (m) return m;
    const [kind, arg] = key.split(':');
    if (kind === 'base' || kind === 'sel') {
      const thin = ['fascia', 'joints', 'attachments', 'cns', 'heart'].includes(arg);
      m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.02, side: thin ? THREE.DoubleSide : THREE.FrontSide });
      if (arg === 'attachments') { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; m.roughness = 0.4; }
      if (arg === 'fascia') { m.transparent = true; m.opacity = 0.55; m.depthWrite = false; }
      if (kind === 'sel') { m.emissive = new THREE.Color(0x1c7dff); m.emissiveIntensity = 0.55; m.transparent = false; m.opacity = 1; m.depthWrite = true; }
    } else if (kind === 'ghost') {
      m = new THREE.MeshStandardMaterial({ color: 0x9fb0c8, transparent: true, opacity: 0.07, depthWrite: false, roughness: 1, side: THREE.DoubleSide });
    } else if (kind === 'tint') {
      m = new THREE.MeshStandardMaterial({ color: new THREE.Color(arg), roughness: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(arg), emissiveIntensity: 0.18 });
    } else if (kind === 'fade') { // base z przezroczystością warstwy
      const [layer, op] = arg.split('@');
      m = this.material(`base:${layer}`).clone();
      m.transparent = true; m.opacity = Number(op); m.depthWrite = Number(op) > 0.6;
    }
    this.materials.set(key, m);
    return m;
  }

  /** Ustawia stan wszystkich siatek. fn(meta) -> null (ukryj) | klucz materiału. */
  apply(fn) {
    for (let id = 0; id < this.meta.length; id++) {
      const mesh = this.meshes[id];
      if (!mesh) continue;
      const key = fn(this.meta[id]);
      this.state.set(id, key);
      if (!key) { mesh.visible = false; continue; }
      mesh.visible = true;
      mesh.material = this.material(key);
      mesh.renderOrder = key.startsWith('ghost') ? 2 : key.includes('fascia') || key.startsWith('fade') ? 1 : 0;
    }
    this.invalidate();
  }

  // ---------- wskazywanie ----------
  _bindPointer() {
    let down = null;
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    c.addEventListener('pointerup', (e) => {
      if (!down) return;
      const d = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.t < 500;
      down = null;
      if (d > 7 || !quick) return;
      const hit = this.pick(e.clientX, e.clientY);
      this.dispatchEvent(new CustomEvent('pick', { detail: hit }));
    });
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || e.buttons) return;
      this._hover = { x: e.clientX, y: e.clientY };
    });
  }

  pick(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets = [];
    for (let id = 0; id < this.meshes.length; id++) {
      const m = this.meshes[id];
      if (!m || !m.visible) continue;
      const k = this.state.get(id);
      if (!k || k.startsWith('ghost')) continue;
      targets.push(m);
    }
    const hits = this.raycaster.intersectObjects(targets, false);
    if (!hits.length) return null;
    // przyczepy leżą tuż nad kością – dajemy im pierwszeństwo w tolerancji 1.5 mm
    let best = hits[0];
    for (const h of hits) {
      if (h.distance - hits[0].distance > 0.0015) break;
      if (this.meta[h.object.userData.id].f === 'insertions') { best = h; break; }
    }
    return { id: best.object.userData.id, point: best.point.clone() };
  }

  // ---------- kamera ----------
  boxOf(ids) {
    const box = new THREE.Box3();
    for (const id of ids) {
      const m = this.meshes[id];
      if (m) { const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld); box.union(b); }
      else { const bb = this.meta[id].bb; box.expandByPoint(new THREE.Vector3(bb[0], bb[1], bb[2])); box.expandByPoint(new THREE.Vector3(bb[3], bb[4], bb[5])); }
    }
    return box;
  }

  focus(ids, { dir = null, pad = 1.35, ms = 550 } = {}) {
    const box = ids instanceof THREE.Box3 ? ids : this.boxOf(ids);
    if (box.isEmpty()) return;
    const sph = box.getBoundingSphere(new THREE.Sphere());
    const aspect = this.camera.aspect;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fit = Math.max(sph.radius, 0.03) / Math.sin(Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * aspect)) / 2);
    const d = dir ? dir.clone().normalize() : this.camera.position.clone().sub(this.controls.target).normalize();
    const toPos = sph.center.clone().addScaledVector(d, fit * pad);
    const fromPos = this.camera.position.clone(), fromT = this.controls.target.clone(), toT = sph.center.clone();
    const t0 = performance.now();
    this._anim = (now) => {
      const k = Math.min(1, (now - t0) / ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.camera.position.lerpVectors(fromPos, toPos, e);
      this.controls.target.lerpVectors(fromT, toT, e);
      if (k >= 1) this._anim = null;
    };
  }

  view(name) {
    const dirs = { front: [0, 0, 1], back: [0, 0, -1], right: [-1, 0, 0], left: [1, 0, 0], top: [0, 1, 0.001] };
    const t = this.controls.target, dist = this.camera.position.distanceTo(t);
    const d = new THREE.Vector3(...dirs[name]).normalize();
    const fromPos = this.camera.position.clone(), toPos = t.clone().addScaledVector(d, dist), t0 = performance.now();
    this._anim = (now) => {
      const k = Math.min(1, (now - t0) / 450);
      this.camera.position.lerpVectors(fromPos, toPos, k).sub(t).setLength(dist).add(t);
      if (k >= 1) this._anim = null;
    };
  }

  project(v) {
    const p = v.clone().project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height, behind: p.z > 1 };
  }

  resize() {
    const p = this.canvas.parentElement;
    const w = p.clientWidth, h = p.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  invalidate() { this._dirty = true; }

  _tick(t) {
    if (this._anim) { this._anim(performance.now()); this._dirty = true; }
    for (const cb of this.frameCallbacks) if (cb(t) !== false) this._dirty = true;
    this.controls.update();
    if (!this._dirty) return;
    this._dirty = false;
    this.renderer.render(this.scene, this.camera);
    this.dispatchEvent(new Event('render'));
  }
}
