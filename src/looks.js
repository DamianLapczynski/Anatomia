// Oprawa sceny 3D dla każdego stylu: światło, ekspozycja, kolor „ducha” (reszta ciała w izolacji),
// kolor podświetlenia zaznaczenia i miękki cień pod stopami. Kolory tkanek zostają te same –
// czerwony mięsień i żółty nerw muszą znaczyć to samo w każdym stylu.
// key / fill / rim: [kolor, natężenie, [x, y, z] w układzie kamery]
const BASE = {
  exposure: 0.95, env: 0.3,
  hemi: [0xfff6ea, 0x2c303a, 0.3],
  key: [0xfff4e6, 1.7, [0.7, 0.85, 0.8]],
  fill: [0xdfe8ff, 0.25, [-0.8, -0.3, 0.6]],
  rim: [0xffffff, 0.75, [-0.4, 0.5, -1]],
  ghost: [0x9fb0c8, 0.1], sel: 0x1c7dff, shadow: [0x000000, 0],
};

export const LOOKS = {
  graphite: BASE,
  light: { ...BASE, ghost: [0x7d8aa3, 0.13], sel: 0x007aff, shadow: [0x1c2433, 0.22] },
  midnight: { ...BASE, ghost: [0x9a98ff, 0.1], sel: 0x7d7aff, rim: [0xb9b6ff, 0.9, [-0.4, 0.5, -1]] },
  titanium: { ...BASE, ghost: [0xcbb592, 0.09], sel: 0xd9ad6a, rim: [0xffe4bd, 0.85, [-0.4, 0.5, -1]] },

  // ciepłe studio, jak fotografia preparatu na papierze
  atlas: {
    exposure: 0.98, env: 0.34,
    hemi: [0xfff2df, 0x6e5c49, 0.42],
    key: [0xfff0db, 1.55, [0.6, 0.9, 0.75]],
    fill: [0xffe7cf, 0.32, [-0.85, -0.2, 0.6]],
    rim: [0xffffff, 0.3, [-0.4, 0.5, -1]],
    ghost: [0x9a8670, 0.11], sel: 0x9e2b25, shadow: [0x4a3424, 0.3],
  },
  // galeria nocą: twarde światło z góry, złota kontra, prawie zero wypełnienia
  noir: {
    exposure: 0.92, env: 0.16,
    hemi: [0xffffff, 0x0a0a0a, 0.1],
    key: [0xfff1d8, 2.4, [-0.45, 1.1, 0.55]],
    fill: [0xbfd0ff, 0.08, [0.9, -0.3, 0.5]],
    rim: [0xffd79a, 1.6, [0.5, 0.35, -1]],
    ghost: [0xcfc3ad, 0.06], sel: 0xd6b06c, shadow: [0x000000, 0],
  },
  // jasne, rozproszone światło przez mleczne szkło
  glass: {
    exposure: 1.02, env: 0.5,
    hemi: [0xffffff, 0xcfc6ff, 0.55],
    key: [0xffffff, 1.35, [0.55, 0.9, 0.85]],
    fill: [0xffd9ec, 0.38, [-0.85, -0.2, 0.6]],
    rim: [0xcfe4ff, 0.7, [-0.4, 0.5, -1]],
    ghost: [0xa2a6e4, 0.075], sel: 0x5856d6, shadow: [0x3b2d7a, 0.18],
  },
  // głębina: chłodne światło z góry, morska poświata od tyłu
  depth: {
    exposure: 0.95, env: 0.26,
    hemi: [0xd6fff6, 0x04161d, 0.26],
    key: [0xeefcff, 1.6, [0.5, 1.0, 0.7]],
    fill: [0x5fd6c6, 0.22, [-0.9, -0.3, 0.5]],
    rim: [0x4ff0dc, 1.15, [-0.5, 0.4, -1]],
    ghost: [0x3fb3a6, 0.06], sel: 0x22c7b4, shadow: [0x000000, 0],
  },
  // ── rodzina noir ──
  // onyks: zimne białe światło z góry, stalowo-niebieska kontra
  onyx: {
    exposure: 0.92, env: 0.16,
    hemi: [0xf2f6ff, 0x08090b, 0.1],
    key: [0xf4f8ff, 2.35, [-0.45, 1.1, 0.55]],
    fill: [0xbcd0ff, 0.08, [0.9, -0.3, 0.5]],
    rim: [0xc8dcff, 1.5, [0.5, 0.35, -1]],
    ghost: [0xc4ccd8, 0.06], sel: 0xa9bad0, shadow: [0x000000, 0],
  },
  // aksamit: ciepłe światło, rubinowa kontra od tyłu
  velvet: {
    exposure: 0.92, env: 0.15,
    hemi: [0xfff0ee, 0x0a0405, 0.1],
    key: [0xfff1e8, 2.25, [-0.45, 1.1, 0.55]],
    fill: [0xffc9cf, 0.07, [0.9, -0.3, 0.5]],
    rim: [0xff6f80, 1.45, [0.5, 0.35, -1]],
    ghost: [0xcf9aa1, 0.06], sel: 0xc23a4c, shadow: [0x000000, 0],
  },
  // światłocień: jedno ciepłe światło z boku, prawie zero wypełnienia
  chiaro: {
    exposure: 0.95, env: 0.1,
    hemi: [0xffe9cc, 0x050302, 0.06],
    key: [0xffd9a6, 2.7, [-1.0, 0.55, 0.3]],
    fill: [0xffcf99, 0.04, [0.9, -0.3, 0.5]],
    rim: [0xffb46a, 0.65, [0.8, 0.25, -1]],
    ghost: [0xc4a67e, 0.05], sel: 0xd98b35, shadow: [0x000000, 0],
  },
  // szmaragd: chłodne światło, zielona kontra
  emerald: {
    exposure: 0.92, env: 0.16,
    hemi: [0xf0fff8, 0x030806, 0.1],
    key: [0xf2fff9, 2.25, [-0.45, 1.1, 0.55]],
    fill: [0xb8ffe0, 0.07, [0.9, -0.3, 0.5]],
    rim: [0x52e0a6, 1.35, [0.5, 0.35, -1]],
    ghost: [0x96cdb2, 0.06], sel: 0x2fae7c, shadow: [0x000000, 0],
  },
};
