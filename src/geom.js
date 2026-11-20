// Wspólne operacje na geometrii – używane w aplikacji i w narzędziach Node (tools/bake_ao.mjs).

/** Odwraca trójkąty, jeśli normalne geometrii wskazują średnio do środka bryły. */
export function fixWinding(geo) {
  const P = geo.attributes.position.array, I = geo.index?.array;
  if (!I) return false;
  let cx = 0, cy = 0, cz = 0; const n = P.length / 3;
  for (let i = 0; i < P.length; i += 3) { cx += P[i]; cy += P[i + 1]; cz += P[i + 2]; }
  cx /= n; cy /= n; cz /= n;
  let out = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    out += (uy * vz - uz * vy) * (P[a] + P[b] + P[c] - 3 * cx) + (uz * vx - ux * vz) * (P[a + 1] + P[b + 1] + P[c + 1] - 3 * cy) + (ux * vy - uy * vx) * (P[a + 2] + P[b + 2] + P[c + 2] - 3 * cz);
  }
  if (out >= 0) return false;
  for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; }
  geo.index.needsUpdate = true;
  return true;
}
