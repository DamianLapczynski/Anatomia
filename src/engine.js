// Silnik 3D: ładowanie modeli, stany widoczności/podświetlenia, wskazywanie, kamera.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { fixWinding } from './geom.js';
import { patchSurface, patchFaceForward, addSurfaceAttributes } from './surface.js';
import { LOOKS } from './looks.js';

export const FILES = ['skeleton', 'muscles', 'insertions', 'nerves', 'cardio', 'joints', 'cns'];
const BASE = import.meta.env.BASE_URL;
const SURFACE = { skeleton: 'bone', muscles: 'muscle' }; // pliki z fakturą powierzchni (src/surface.js)
const SURF_LAYER = { bones: 'bone', muscles: 'muscle' };
const THIN = ['fascia', 'joints', 'attachments', 'cns', 'heart'];
function patchLayer(m, layer) {
  if (SURF_LAYER[layer]) patchSurface(m, SURF_LAYER[layer]);
  else if (THIN.includes(layer)) patchFaceForward(m);
  return m;
}

export class Engine extends EventTarget {
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // neutralne mapowanie tonów: miękkie światła bez przepaleń, kolory warstw bez przesunięcia barw
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.scene = new THREE.Scene();
    // oświetlenie otoczenia (IBL): miękkie odbicia i cieniowanie zamiast płaskiego „plastiku”
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.3;
    pmrem.dispose();
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

    // światło kluczowe z góry-z boku, wypełnienie z dołu, kontra od tyłu dla czytelnego obrysu (wartości: src/looks.js)
    const hemi = new THREE.HemisphereLight(), key = new THREE.DirectionalLight(), fill = new THREE.DirectionalLight(), rim = new THREE.DirectionalLight();
    this.scene.add(hemi);
    for (const l of [key, fill, rim]) { l.target.position.set(0, 0, -1); this.camera.add(l, l.target); }
    this.lights = { hemi, key, fill, rim };
    this.scene.add(this.camera);
    // miękki cień pod stopami – „uziemia” sylwetkę w jasnych stylach
    const sc = document.createElement('canvas'); sc.width = sc.height = 128;
    const g2 = sc.getContext('2d'), grd = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = grd; g2.fillRect(0, 0, 128, 128);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, toneMapped: false }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = -0.004; this.shadow.renderOrder = -1;
    this.scene.add(this.shadow);
    this.insets = { l: 0, r: 0, t: 0, b: 0 };
    this.setLook('graphite');
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

    new ResizeObserver(() => this.resize()).observe(canvas);
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
        const nrm = mesh.geometry.attributes.normal;
        if (nrm && !(nrm.array instanceof Float32Array)) {
          const fn = new Float32Array(nrm.count * 3);
          for (let i = 0; i < nrm.count; i++) { fn[i * 3] = nrm.getX(i); fn[i * 3 + 1] = nrm.getY(i); fn[i * 3 + 2] = nrm.getZ(i); }
          mesh.geometry.setAttribute('normal', new THREE.BufferAttribute(fn, 3));
        }
        // siatki lustrzane (prawie cała lewa strona) mają odwróconą kolejność wierzchołków – bez tego
        // przeglądarka rysuje wewnętrzną ścianę zamiast powierzchni
        fixWinding(mesh.geometry);
        // normalne w pliku są 8-bitowe (schodki na gładkich kościach) – liczymy je od nowa we float
        mesh.geometry.computeVertexNormals();
        if (SURFACE[file]) addSurfaceAttributes(mesh.geometry, SURFACE[file]);
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
      const thin = THIN.includes(arg);
      m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, side: thin ? THREE.DoubleSide : THREE.FrontSide });
      if (arg === 'bones') { m.roughness = 0.52; } // kość: matowa, z delikatnym połyskiem
      if (arg === 'muscles') { m.roughness = 0.46; } // wilgotna powięź – lekki refleks
      if (arg === 'arteries' || arg === 'veins') { m.roughness = 0.32; } // naczynia: gładka, wilgotna ściana
      if (arg === 'heart') { m.roughness = 0.38; }
      if (arg === 'nerves') { m.roughness = 0.42; }
      if (arg === 'cns') { m.roughness = 0.55; }
      patchLayer(m, arg);
      if (arg === 'attachments') { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; m.roughness = 0.4; }
      if (arg === 'fascia') { m.transparent = true; m.opacity = 0.3; m.depthWrite = false; }
      if (kind === 'sel') { m.emissive = new THREE.Color(this.look.sel); m.emissiveIntensity = 0.55; m.transparent = false; m.opacity = 1; m.depthWrite = true; }
    } else if (kind === 'ghost') {
      m = new THREE.MeshStandardMaterial({ color: this.look.ghost[0], transparent: true, opacity: this.look.ghost[1], depthWrite: false, roughness: 1, side: THREE.FrontSide }); // jedna strona = połowa kosztu wypełniania ekranu
    } else if (kind === 'tint') {
      m = new THREE.MeshStandardMaterial({ color: new THREE.Color(arg), roughness: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(arg), emissiveIntensity: 0.18 });
    } else if (kind === 'fade') { // base z przezroczystością warstwy
      const [layer, op] = arg.split('@');
      m = this.material(`base:${layer}`).clone();
      patchLayer(m, layer); // clone() nie kopiuje onBeforeCompile
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

  focus(ids, { dir = null, pad = 1.35, ms = 550, frontal = false } = {}) {
    const box = ids instanceof THREE.Box3 ? ids : this.boxOf(ids);
    if (box.isEmpty()) return;
    const sph = box.getBoundingSphere(new THREE.Sphere());
    // dopasowanie do widocznego okna, nie do całego płótna pod panelami
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1, I = this.insets;
    const vw = Math.max(80, w - I.l - I.r), vh = Math.max(80, h - I.t - I.b);
    const aspect = vw / vh;
    const fov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * (vh / h));
    let fit = Math.max(sph.radius, 0.03) / Math.sin(Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * aspect)) / 2);
    if (frontal) { // widok z przodu: dopasuj do wysokości i szerokości, nie do kuli
      const s = box.getSize(new THREE.Vector3()), t = Math.tan(fov / 2);
      fit = Math.max(s.y / 2 / t, s.x / 2 / (t * aspect)) + s.z / 2;
    }
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

  /** Obrót kamery wokół celu (radiany) – dla klawiatury. */
  orbit(dAz, dPol) {
    this._anim = null;
    const t = this.controls.target, off = this.camera.position.clone().sub(t), sph = new THREE.Spherical().setFromVector3(off);
    sph.theta += dAz; sph.phi = THREE.MathUtils.clamp(sph.phi + dPol, 0.05, Math.PI - 0.05);
    off.setFromSpherical(sph); this.camera.position.copy(t).add(off); this.camera.lookAt(t);
    this.controls.update(); this.invalidate();
  }

  zoom(f) {
    this._anim = null;
    const t = this.controls.target, off = this.camera.position.clone().sub(t);
    off.setLength(THREE.MathUtils.clamp(off.length() * f, this.controls.minDistance, this.controls.maxDistance));
    this.camera.position.copy(t).add(off); this.controls.update(); this.invalidate();
  }

  project(v) {
    const p = v.clone().project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height, behind: p.z > 1 };
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // przesunięcie środka rzutowania na środek widocznej części (między panelami)
    const { l, r, t, b } = this.insets;
    if (l || r || t || b) this.camera.setViewOffset(w, h, (r - l) / 2, (b - t) / 2, w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  invalidate() { this._dirty = true; }

  /** Oprawa sceny dla stylu (src/looks.js): światło, ekspozycja, duch, zaznaczenie, cień. */
  setLook(name) {
    const L = LOOKS[name] ?? LOOKS.graphite;
    this.look = L;
    this.renderer.toneMappingExposure = L.exposure;
    this.scene.environmentIntensity = L.env;
    const { hemi, key, fill, rim } = this.lights;
    hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2];
    for (const [l, [c, i, p]] of [[key, L.key], [fill, L.fill], [rim, L.rim]]) { l.color.set(c); l.intensity = i; l.position.set(...p); }
    for (const [k, m] of this.materials ?? []) {
      if (k === 'ghost') { m.color.set(L.ghost[0]); m.opacity = L.ghost[1]; }
      else if (k.startsWith('sel:')) m.emissive.set(L.sel);
    }
    this.shadow.material.color.set(L.shadow[0]); this.shadow.material.opacity = L.shadow[1];
    this.shadow.visible = L.shadow[1] > 0;
    this.invalidate();
  }

  /** Obszar zasłonięty przez pływające panele (px) – środek kadru i dopasowanie liczymy dla reszty. */
  setInsets(ins) {
    const n = { l: 0, r: 0, t: 0, b: 0, ...ins };
    if (['l', 'r', 't', 'b'].every((k) => Math.abs(n[k] - this.insets[k]) < 0.5)) return;
    this.insets = n; this.resize();
  }

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
