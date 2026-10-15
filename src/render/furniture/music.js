import { box, cyl, GLOW } from './kit.js';

// Music and dancing: the function room's upright piano and parquet floor, the Irish pub's corner for the band.
export const SIZES = {
  piano: { s: [1.5, 0.6], solid: true }, pianostool: { s: [0.8, 0.4], solid: true }, dancefloor: { s: [4.4, 4.4], solid: false },
  bandcorner: { s: [2.4, 1.6], solid: false }, harpmirror: { s: [0.9, 0.1], solid: false }, bunting: { s: [4.0, 0.1], solid: false },
};
const ROSE = 0x3a2214, KEY = 0xf2eee2;
export const MAKERS = {
  // an old upright pub piano, a pint left on the top and the lid up
  piano: (g) => {
    box(g, 1.5, 1.28, 0.5, ROSE, 0, 0, -0.05); box(g, 1.56, 0.05, 0.56, 0x2a180e, 0, 1.28, -0.05);
    box(g, 1.44, 0.08, 0.3, ROSE, 0, 0.72, 0.3); box(g, 1.34, 0.025, 0.18, KEY, 0, 0.8, 0.34);
    for (let i = 0; i < 12; i++) if (i % 7 !== 2 && i % 7 !== 6) box(g, 0.05, 0.03, 0.1, 0x111111, -0.6 + i * 0.105, 0.82, 0.3);
    box(g, 0.62, 0.32, 0.03, ROSE, 0, 0.9, 0.21); box(g, 0.44, 0.28, 0.01, 0xf8f4e8, 0, 0.92, 0.23);   // the music stand and a song sheet
    for (const x of [-0.66, 0.66]) box(g, 0.08, 0.72, 0.08, ROSE, x, 0, 0.38);
    box(g, 0.08, 0.13, 0.08, 0xd8a03a, 0.5, 1.33, 0); box(g, 0.082, 0.03, 0.082, 0xf4f0e0, 0.5, 1.46, 0);
    for (const x of [-0.5, -0.38]) { cyl(g, 0.03, 0.04, 0.2, 0xd9b34a, x, 1.33, 0, { metalness: 0.6, roughness: 0.3 }); box(g, 0.025, 0.08, 0.025, 0xf6f2e0, x, 1.53, 0); }
  },
  pianostool: (g) => { box(g, 0.8, 0.07, 0.38, ROSE, 0, 0.42, 0); box(g, 0.76, 0.04, 0.34, 0x6a1a2a, 0, 0.49, 0); for (const x of [-0.34, 0.34]) for (const z of [-0.14, 0.14]) box(g, 0.05, 0.42, 0.05, ROSE, x, 0, z); },
  // a square of parquet, honey and dark oak, worn in the middle
  dancefloor: (g) => {
    const n = 6, s = 4.4 / n; box(g, 4.5, 0.012, 4.5, 0x5a3a20, 0, 0, 0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) box(g, s - 0.03, 0.02, s - 0.03, (i + j) % 2 ? 0xc9924e : 0x8a5a2e, -2.2 + (i + 0.5) * s, 0, -2.2 + (j + 0.5) * s);
  },
  // where the band plays: a low dais, a stool, a bodhrán against it and a spotlight on the wall
  bandcorner: (g) => {
    box(g, 2.4, 0.04, 1.6, 0x4a2c18, 0, 0, 0); box(g, 2.44, 0.015, 1.64, 0x2a6a3a, 0, 0.04, 0);
    box(g, 0.36, 0.05, 0.36, 0x6e4528, 0.75, 0.5, -0.4); for (const [x, z] of [[0.6, -0.55], [0.9, -0.55], [0.6, -0.25], [0.9, -0.25]]) box(g, 0.04, 0.46, 0.04, 0x6e4528, x, 0.04, z);   // the bodhrán player's stool
    const d = cyl(g, 0.24, 0.24, 0.08, 0xe8d8b0, 0.75, 0.62, -0.4); d.rotation.x = Math.PI / 2.4;
    box(g, 0.18, 0.14, 0.14, 0x1a1a1a, 0, 2.3, -0.7); box(g, 0.12, 0.1, 0.02, 0xfff0c0, 0, 2.32, -0.62, GLOW(0xffe0a0, 1.2));
  },
  // a gilt-framed advertising mirror with a harp on it
  harpmirror: (g) => {
    box(g, 0.9, 1.1, 0.04, 0xc9a04a, 0, 1.2, 0, { metalness: 0.5, roughness: 0.35 }); box(g, 0.78, 0.98, 0.02, 0x1e3a2a, 0, 1.26, 0.02, { metalness: 0.3, roughness: 0.2 });
    box(g, 0.06, 0.5, 0.01, 0xd9b34a, -0.14, 1.5, 0.035); box(g, 0.3, 0.05, 0.01, 0xd9b34a, 0.0, 1.97, 0.035).rotation.z = -0.4;
    for (let i = 0; i < 5; i++) box(g, 0.012, 0.36 - i * 0.05, 0.01, 0xf2e6c0, -0.08 + i * 0.05, 1.56, 0.036);
    box(g, 0.6, 0.1, 0.01, 0xf2e6c0, 0, 1.36, 0.035);
  },
  // a string of little flags along the wall
  bunting: (g) => { box(g, 4.0, 0.015, 0.015, 0xe8e8e8, 0, 2.55, 0); for (let i = 0; i < 12; i++) box(g, 0.2, 0.22, 0.01, [0x2a8a3a, 0xf4f4f0, 0xe88a2a][i % 3], -1.85 + i * 0.335, 2.33, 0.005); },
};
