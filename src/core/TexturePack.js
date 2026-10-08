// In-browser texture pack installer: the player picks the "PNG - Pixel Art Textures" zip they downloaded,
// the game unpacks just the files it needs, processes them like tools/build_textures.py, and keeps them in
// IndexedDB so they load automatically from then on. Nothing from the pack is ever shipped with the game.

// name -> [path inside PNGs/, size, brightness]
export const PACK_MAP = {"ground_grass_a": ["Grass/Grass_02_Green_1.png", 64, 1.35], "ground_grass_b": ["Grass/Grass_01_Green_2.png", 64, 1.45], "ground_forest": ["Grass/Grass_02_Green_3.png", 64, 1.0], "ground_sand": ["Sand/Sand_01_Yellow_1.png", 64, 1.0], "ground_dirt": ["Dirt/Dirt_Pebbles_02_Brown_1.png", 64, 1.15], "ground_clay": ["Dirt/Dirt_Rocks_02_Brown_1.png", 64, 1.1], "ground_rock": ["Rockface/Rock_Grey_02.png", 64, 0.9], "ground_pavement": ["Concrete/Concrete_01_Grey_2.png", 64, 1.05], "ground_asphalt": ["Concrete/Concrete_01_Grey_5.png", 64, 0.55], "ground_gravel": ["Gravel/Gravel_01_Grey_1.png", 64, 1.0], "water": ["Water/Water_01_Blue_2.png", 128, 0.95], "wall_brick": ["Bricks/Bricks/Bricks_01_Orange_1.png", 64, 1.0], "wall_brick_red": ["Bricks/Bricks/Bricks_03_Red_2.png", 64, 1.0], "wall_grey": ["Bricks/Bricks/Bricks_02_Grey_2.png", 64, 1.05], "wall_tan": ["Bricks/Bricks/Bricks_04_Yellow_2_1.png", 64, 1.0], "wall_civic": ["Bricks/Bricks/Bricks_04_Yellow_3.png", 64, 1.0], "wall_stone": ["Stones/Stones_Loose_01_Grey_1.png", 64, 1.05], "wall_planks": ["Wood/Wood_Planks_01_Brown_2.png", 64, 1.0], "wall_logs": ["Wood/Wood_Planks_01_Brown_3.png", 64, 0.9], "wall_stucco": ["Wall/Wall_01_Stucco_Grey_3.png", 64, 1.25], "wall_white": ["Wall/Wall_01_Stucco_Grey_2.png", 64, 1.35], "wall_industrial": ["Bricks/Bricks/Bricks_05_Brown_2.png", 64, 1.0], "roof_tiles_red": ["Roofing/Roof_Tiles_01_Red_1.png", 64, 1.5], "roof_tiles_grey": ["Roofing/Roof_Tiles_01_Grey_1.png", 64, 1.35], "roof_tiles_blue": ["Roofing/Roof_Tiles_01_Blue_1.png", 64, 1.4], "roof_thatch": ["Wood/Wood_Pattern_01_Yellow_1.png", 64, 0.95], "roof_gravel": ["Gravel/Gravel_01_Grey_1.png", 64, 0.9], "floor_wood": ["Wood/Wood_Planks_01_Brown_1.png", 64, 1.1], "floor_wood_dark": ["Wood/Wood_Planks_01_Brown_4.png", 64, 0.95], "floor_tile": ["Tiles/Tiles Rectangle/Tiles_Rectangle_01_White_1.png", 64, 1.05], "floor_tile_grey": ["Tiles/Tiles Rectangle/Tiles_Rectangle_01_Grey_1.png", 64, 1.0], "floor_carpet_red": ["Patterns/Pattern_01_Retro_Carpet_Red_1.png", 64, 1.0], "floor_carpet_green": ["Patterns/Pattern_01_Retro_Carpet_Green_1.png", 64, 1.0], "int_wallpaper_red": ["Wall/Wallpaper_01_Red_1.png", 64, 1.05], "int_wallpaper_green": ["Wall/Wallpaper_03_Green_1.png", 64, 1.05], "int_wallpaper_white": ["Wall/Wallpaper_02_White_1.png", 64, 1.1], "int_wallpaper_blue": ["Wall/Pattern_02_BlueWhite_Wallpaper_1.png", 64, 1.05], "int_paint_yellow": ["Painted Wall/Painted_Wall_01_Yellow_1.png", 64, 1.1], "int_paint_green": ["Painted Wall/Painted_Wall_01_Green_1.png", 64, 1.1], "int_paint_grey": ["Painted Wall/Painted_Wall_01_Grey_1.png", 64, 1.1], "int_paint_blue": ["Painted Wall/Painted_Wall_01_Blue_1.png", 64, 1.1], "int_stucco": ["Wall/Wall_01_Stucco_Yellow_1.png", 64, 1.1], "int_planks": ["Wood/Wood_Planks_01_Brown_2.png", 64, 0.95], "bark": ["Wood/Wood_Bark_01.png", 32, 1.0], "leaves": ["Foliage/Foliage_Leaves_01_Green_1.png", 32, 1.2], "rock": ["Rockface/Rock_Grey_01.png", 64, 1.0]};
// stored as soft greyscale so the game can tint them
export const PACK_GREY = {"fab_plaid": "Fabric/Fabric_Plaid_01_Red_1.png", "fab_gingham": "Fabric/Fabric_Gingam_01_Blue_1.png", "fab_cord": "Fabric/Fabric_Corduroy_01_Brown_1.png", "fab_hound": "Fabric/Fabric_Houndstooth_01_BlackWhite_1.png", "fab_diamond": "Fabric/Fabric_Diamond_01_Blue_1.png", "fab_padded": "Fabric/Fabric_Padded_02_Grey_1.png", "fab_plain": "Fabric/Fabric_Plain_01_Grey_3.png", "fab_wood": "Wood/Wood_Planks_01_Brown_2.png"};
// alpha-trimmed to the visible frame: [path, width]
export const PACK_TRIM = {"win_modern": ["Windows/Window 04/Window_04_Double_1.png", 48], "win_old": ["Windows/Window 02/Window_Old_Single_1.png", 48], "door_blue": ["Doors/Door Wood 01/Door_Wood_Blue_1.png", 48], "door_green": ["Doors/Door Wood 01/Door_Wood_Green_1.png", 48]};

const DB = 'samcity-textures', STORE = 'tex';
function idb() { return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function tx(mode, fn) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction(STORE, mode), st = t.objectStore(STORE), out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); }

/** All stored textures as { name: Blob } (empty if none installed). */
export async function loadStored() {
  try {
    const db = await idb(); return await new Promise((res) => { const out = {}, t = db.transaction(STORE, 'readonly'), c = t.objectStore(STORE).openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else res(out); }; c.onerror = () => res({}); });
  } catch (e) { return {}; }
}
export async function clearStored() { try { await tx('readwrite', (st) => st.clear()); } catch (e) { /* nothing to clear */ } }
export async function hasStored() { const s = await loadStored(); return Object.keys(s).length; }

// ---------- a tiny zip reader (central directory + native deflate) ----------
async function readZip(file) {
  const tailLen = Math.min(file.size, 65557 + 22), tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer());
  let eocd = -1; for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('That does not look like a zip file.');
  let count = tail.getUint16(eocd + 10, true), cdSize = tail.getUint32(eocd + 12, true), cdOff = tail.getUint32(eocd + 16, true);
  if (cdOff === 0xffffffff || count === 0xffff) {   // zip64
    const loc = eocd - 20; if (loc >= 0 && tail.getUint32(loc, true) === 0x07064b50) { const z64 = Number(tail.getBigUint64(loc + 8, true)), r = new DataView(await file.slice(z64, z64 + 56).arrayBuffer()); count = Number(r.getBigUint64(32, true)); cdSize = Number(r.getBigUint64(40, true)); cdOff = Number(r.getBigUint64(48, true)); }
  }
  const cd = new DataView(await file.slice(cdOff, cdOff + cdSize).arrayBuffer()), dec = new TextDecoder(), entries = new Map(); let p = 0;
  for (let n = 0; n < count && p + 46 <= cd.byteLength; n++) {
    if (cd.getUint32(p, true) !== 0x02014b50) break;
    const method = cd.getUint16(p + 10, true); let comp = cd.getUint32(p + 20, true); const nl = cd.getUint16(p + 28, true), el = cd.getUint16(p + 30, true), cl = cd.getUint16(p + 32, true); let off = cd.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, p + 46, nl)).replace(/\\/g, '/');
    if (comp === 0xffffffff || off === 0xffffffff) { let q = p + 46 + nl; const qe = q + el; while (q < qe) { const id = cd.getUint16(q, true), sz = cd.getUint16(q + 2, true); if (id === 1) { let r = q + 4; if (cd.getUint32(p + 24, true) === 0xffffffff) r += 8; if (comp === 0xffffffff) { comp = Number(cd.getBigUint64(r, true)); r += 8; } if (off === 0xffffffff) off = Number(cd.getBigUint64(r, true)); } q += 4 + sz; } }
    entries.set(name, { method, comp, off }); p += 46 + nl + el + cl;
  }
  const read = async (e) => {
    const h = new DataView(await file.slice(e.off, e.off + 30).arrayBuffer()), start = e.off + 30 + h.getUint16(26, true) + h.getUint16(28, true), raw = file.slice(start, start + e.comp);
    if (e.method === 0) return raw; if (e.method !== 8) throw new Error('unsupported zip compression');
    return new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
  };
  return { entries, read };
}

/** Find a pack file by its path under PNGs/ (zip, or files from a picked folder). */
function finder(src) {
  if (src.zip) { const names = [...src.zip.entries.keys()]; return async (rel) => { const n = names.find((k) => k.endsWith('PNGs/' + rel) || k.endsWith('/' + rel) || k === rel); if (!n) return null; return src.zip.read(src.zip.entries.get(n)); }; }
  return async (rel) => { const f = src.files.find((q) => (q.webkitRelativePath || q.name).replace(/\\/g, '/').endsWith(rel)); return f || null; };
}

// ---------- processing (mirrors tools/build_textures.py) ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
/** Box-filter downscale (average of each source block), like PIL's Image.BOX. */
function boxResize(img, w, h) {
  const s = canvas(img.width, img.height), sx = s.getContext('2d', { willReadFrequently: true }); sx.drawImage(img, 0, 0); const src = sx.getImageData(0, 0, img.width, img.height).data;
  const out = canvas(w, h), ox = out.getContext('2d', { willReadFrequently: true }), od = ox.createImageData(w, h), fx = img.width / w, fy = img.height / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x0 = Math.floor(x * fx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx)), y0 = Math.floor(y * fy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy)); let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * img.width + xx) * 4; r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3]; n++; }
    const o = (y * w + x) * 4; od.data[o] = r / n; od.data[o + 1] = g / n; od.data[o + 2] = b / n; od.data[o + 3] = a / n;
  }
  ox.putImageData(od, 0, 0); return out;
}
const toBlob = (c) => new Promise((res) => c.toBlob(res, 'image/png'));

/**
 * Install from a zip File (or an array of Files from a picked folder). onProgress(done, total).
 * Returns the number of textures stored.
 */
export async function installPack(input, onProgress = () => {}) {
  const src = input instanceof File || (input && input.slice && !Array.isArray(input)) ? { zip: await readZip(input) } : { files: [...input] };
  const find = finder(src), jobs = [...Object.entries(PACK_MAP).map(([k, v]) => ['map', k, v]), ...Object.entries(PACK_GREY).map(([k, v]) => ['grey', k, v]), ...Object.entries(PACK_TRIM).map(([k, v]) => ['trim', k, v])];
  const out = {}; let done = 0;
  for (const [kind, name, spec] of jobs) {
    try {
      const blob = await find(kind === 'grey' ? spec : spec[0]); if (!blob) { onProgress(++done, jobs.length); continue; }
      const img = await createImageBitmap(blob);
      if (kind === 'map') {
        const [, size, bright] = spec, c = boxResize(img, size, size), x = c.getContext('2d', { willReadFrequently: true }), d = x.getImageData(0, 0, size, size);
        for (let i = 0; i < d.data.length; i += 4) { d.data[i] = Math.min(255, d.data[i] * bright); d.data[i + 1] = Math.min(255, d.data[i + 1] * bright); d.data[i + 2] = Math.min(255, d.data[i + 2] * bright); d.data[i + 3] = 255; }
        x.putImageData(d, 0, 0); out[name] = await toBlob(c);
      } else if (kind === 'grey') {
        const c = boxResize(img, 32, 32), x = c.getContext('2d', { willReadFrequently: true }), d = x.getImageData(0, 0, 32, 32), L = []; for (let i = 0; i < d.data.length; i += 4) L.push(0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2]);
        const mean = L.reduce((a, b) => a + b, 0) / L.length; L.forEach((v, j) => { const g = Math.max(0, Math.min(255, Math.round(222 + (v - mean) * 0.75))); d.data[j * 4] = d.data[j * 4 + 1] = d.data[j * 4 + 2] = g; d.data[j * 4 + 3] = 255; });
        x.putImageData(d, 0, 0); out[name] = await toBlob(c);
      } else {
        const full = canvas(img.width, img.height), fx = full.getContext('2d', { willReadFrequently: true }); fx.drawImage(img, 0, 0); const d = fx.getImageData(0, 0, img.width, img.height).data; let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
        for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (d[(y * img.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
        let crop = full; if (x1 >= 0) { crop = canvas(x1 - x0 + 1, y1 - y0 + 1); crop.getContext('2d', { willReadFrequently: true }).drawImage(full, -x0, -y0); }
        const w = spec[1], h = Math.max(8, Math.round(w * crop.height / crop.width)); out[name] = await toBlob(boxResize(crop, w, h));
      }
    } catch (e) { /* skip anything odd */ }
    onProgress(++done, jobs.length);
  }
  const n = Object.keys(out).length; if (!n) throw new Error('No textures found. Pick the "PNG - Pixel Art Textures" zip.');
  await clearStored(); await tx('readwrite', (st) => { for (const [k, v] of Object.entries(out)) st.put(v, k); });
  return n;
}
