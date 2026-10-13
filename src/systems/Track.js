// Track pieces for the railway, monorail and sky lift, laid one at a time (like a theme-park ride builder):
//   S straight (8 m), L / R a 45° curve (12 m radius), each with a slope of -1, 0 or +1 (1.6 m per piece),
//   and J, the joining piece that eases the end of the track into a station.
// A pose is { x, z, h, y }: position, heading (direction sin h, cos h) and height of the rails.
export const STRAIGHT = 8, RADIUS = 12, TURN = Math.PI / 4, RISE = 1.6;
export const PIECES = ['L', 'S', 'R'];

/** Walk one piece from a pose, pushing points about every metre; returns the end pose. */
export function stepPiece(pose, piece, out) {
  const { t, s = 0 } = piece, a = t === 'L' ? TURN : t === 'R' ? -TURN : 0, len = a ? RADIUS * Math.abs(a) : STRAIGHT, n = Math.max(2, Math.ceil(len));
  let { x, z, h } = pose; const y0 = pose.y;
  for (let i = 1; i <= n; i++) {
    const hm = h + a / n / 2; x += Math.sin(hm) * len / n; z += Math.cos(hm) * len / n; h += a / n;
    out.push({ x, z, y: y0 + s * RISE * (i / n) });
  }
  return { x, z, h, y: y0 + s * RISE };
}
/** A gentle curve from a pose into a station (arriving level at height y). */
export function joinTo(pose, tx, tz, ty, out) {
  const d = Math.hypot(tx - pose.x, tz - pose.z), k = d * 0.45, p1x = pose.x + Math.sin(pose.h) * k, p1z = pose.z + Math.cos(pose.h) * k, n = Math.max(2, Math.ceil(d));
  let px = pose.x, pz = pose.z;
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t, x = u * u * pose.x + 2 * u * t * p1x + t * t * tx, z = u * u * pose.z + 2 * u * t * p1z + t * t * tz;
    out.push({ x, z, y: pose.y + (ty - pose.y) * (t * t * (3 - 2 * t)) }); px = x; pz = z;
  }
  void px; void pz;
  return { x: tx, z: tz, h: Math.atan2(tx - p1x, tz - p1z), y: ty };
}
/** All the points of a laid track from its start station (and into its end station, if joined). */
export function trackPoints(tr, start, end, H) {
  const out = [{ x: start.x, z: start.z, y: H }]; let pose = { x: start.x, z: start.z, h: tr.h0, y: H };
  for (const p of tr.pieces) pose = stepPiece(pose, p, out);
  if (end) pose = joinTo(pose, end.x, end.z, H, out);
  return { pts: out, end: pose };
}
/** Where the next piece would go (for the builder's ghost). */
export function previewPiece(pose, piece) { const out = [{ x: pose.x, z: pose.z, y: pose.y }]; const end = stepPiece(pose, piece, out); return { pts: out, end }; }
