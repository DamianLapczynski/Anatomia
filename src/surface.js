// Detal powierzchni liczony w shaderze (bez tekstur do pobrania):
//  • mięśnie – pasma włókien biegnące wzdłuż osi mięśnia + delikatny relief; ścięgna gładkie i z połyskiem,
//  • kości – drobna, porowata faktura; chrząstka gładka i lśniąca.
// Wzór liczony jest od pozycji spoczynkowej (atrybut `rest`), więc nie „pływa” podczas animacji ruchu.
// Gdy wzór robi się mniejszy niż piksel (oddalenie), wygasza się sam – bez migotania.
import * as THREE from 'three';

const NOISE = /* glsl */ `
varying vec3 vRest;
#ifdef SURF_MUSCLE
varying vec3 vFiber;
#endif
float sHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float sNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(sHash(i), sHash(i + vec3(1, 0, 0)), f.x), mix(sHash(i + vec3(0, 1, 0)), sHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(sHash(i + vec3(0, 0, 1)), sHash(i + vec3(1, 0, 1)), f.x), mix(sHash(i + vec3(0, 1, 1)), sHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
vec3 sPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
  vec3 sx = normalize(dFdx(surf_pos)), sy = normalize(dFdy(surf_pos));
  vec3 r1 = cross(sy, surf_norm), r2 = cross(surf_norm, sx);
  float det = dot(sx, r1) * faceDir;
  return normalize(abs(det) * surf_norm - sign(det) * (dHdxy.x * r1 + dHdxy.y * r2));
}
`;

// h – wysokość wzoru (0..1), aa – wygaszanie przy oddaleniu, k – udział tkanki (1 = brzusiec/kość, 0 = ścięgno/chrząstka)
const SAMPLE = /* glsl */ `
  float sH = 0.0, sAA = 0.0, sK = 0.0;
  {
#ifdef SURF_MUSCLE
    vec3 d = normalize(vFiber);
    vec3 a = abs(d.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 u = normalize(cross(d, a)), v = cross(d, u);
    vec3 q = vec3(dot(vRest, d) * 34.0, dot(vRest, u) * 520.0, dot(vRest, v) * 520.0);
    sH = sNoise(q) * 0.62 + sNoise(q * vec3(1.7, 2.3, 2.3) + 11.3) * 0.38;
    sAA = clamp(1.6 - length(fwidth(q.yz)) * 0.9, 0.0, 1.0);
    sK = clamp((vColor.r - vColor.g) * 3.2 - 0.25, 0.0, 1.0);
#else
    vec3 q = vRest * 260.0;
    sH = sNoise(q) * 0.55 + sNoise(q * 2.7 + 5.1) * 0.3 + sNoise(q * 7.3 + 1.7) * 0.15;
    sAA = clamp(1.6 - length(fwidth(q)) * 0.7, 0.0, 1.0);
    sK = clamp(1.0 - (vColor.b - vColor.r) * 8.0, 0.0, 1.0);
#endif
  }
`;

/** Dokleja do materiału faktury włókien (kind = 'muscle') albo kości (kind = 'bone'). */
export function patchSurface(m, kind) {
  m.userData.surface = kind;
  m.customProgramCacheKey = () => `surf-${kind}`;
  m.onBeforeCompile = (sh) => {
    sh.defines = { ...(sh.defines ?? {}), [kind === 'muscle' ? 'SURF_MUSCLE' : 'SURF_BONE']: '' };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec3 rest;
varying vec3 vRest;
#ifdef SURF_MUSCLE
attribute vec3 fiber;
varying vec3 vFiber;
#endif`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vRest = rest;
#ifdef SURF_MUSCLE
vFiber = fiber;
#endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
${SAMPLE}
#ifdef SURF_MUSCLE
  // głębsza, „mięsista” czerwień brzuśca + jaśniejsze i ciemniejsze pasma włókien
  diffuseColor.rgb *= mix(vec3(1.0), vec3(0.93, 0.8, 0.8), sK);
  diffuseColor.rgb *= mix(1.0, 0.8 + 0.4 * sH, sK * sAA);
#else
  diffuseColor.rgb *= mix(1.0, 0.88 + 0.22 * sH, sK * sAA);
#endif`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
#ifdef SURF_MUSCLE
  roughnessFactor = mix(0.3, roughnessFactor + 0.08 * (sH - 0.5), sK); // ścięgno: gładkie i lśniące
#else
  roughnessFactor = mix(0.28, roughnessFactor + 0.12 * (sH - 0.5), sK); // chrząstka stawowa: śliska
#endif`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
#ifdef SURF_MUSCLE
  normal = sPerturb(-vViewPosition, normal, vec2(dFdx(sH), dFdy(sH)) * 0.55 * sK * sAA, faceDirection);
#else
  normal = sPerturb(-vViewPosition, normal, vec2(dFdx(sH), dFdy(sH)) * 0.4 * sK * sAA, faceDirection);
#endif`);
  };
  return m;
}

/** Atrybuty potrzebne fakturom: pozycja spoczynkowa i (dla mięśni) oś włókien z analizy głównych składowych. */
export function addSurfaceAttributes(geo, kind) {
  const P = geo.attributes.position.array, n = P.length / 3;
  geo.setAttribute('rest', new THREE.BufferAttribute(P.slice(), 3));
  if (kind !== 'muscle') return;
  // kowariancja wierzchołków → najdłuższa oś bryły (iteracja potęgowa)
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < P.length; i += 3) { cx += P[i]; cy += P[i + 1]; cz += P[i + 2]; }
  cx /= n; cy /= n; cz /= n;
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (let i = 0; i < P.length; i += 3) {
    const x = P[i] - cx, y = P[i + 1] - cy, z = P[i + 2] - cz;
    xx += x * x; xy += x * y; xz += x * z; yy += y * y; yz += y * z; zz += z * z;
  }
  let v = [0.3, 1, 0.2];
  for (let k = 0; k < 24; k++) {
    const w = [xx * v[0] + xy * v[1] + xz * v[2], xy * v[0] + yy * v[1] + yz * v[2], xz * v[0] + yz * v[1] + zz * v[2]];
    const l = Math.hypot(...w) || 1; v = w.map((c) => c / l);
  }
  const F = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) F.set(v, i * 3);
  geo.setAttribute('fiber', new THREE.BufferAttribute(F, 3));
}
