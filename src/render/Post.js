import * as THREE from 'three';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor, tDepth;
uniform vec2 texel;
uniform float near, far, levels, outline, sat, contrast;
float lin(float d) { float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float bayer(vec2 p) { vec2 q = mod(p, 4.0); float x = q.x, y = q.y;
  float v = mod(x, 2.0) * 2.0 + mod(y, 2.0) * 3.0 + step(2.0, x) * 8.0 - step(2.0, x) * mod(y, 2.0) * 8.0 + step(2.0, y) * 4.0;
  return fract(v * 0.0625 + 0.03125) - 0.5; }
void main() {
  vec3 c = texture2D(tColor, vUv).rgb;
  float d0 = lin(texture2D(tDepth, vUv).r);
  float dl = lin(texture2D(tDepth, vUv - vec2(texel.x, 0.0)).r), dr = lin(texture2D(tDepth, vUv + vec2(texel.x, 0.0)).r);
  float du = lin(texture2D(tDepth, vUv - vec2(0.0, texel.y)).r), dd = lin(texture2D(tDepth, vUv + vec2(0.0, texel.y)).r);
  float lap = abs(dl + dr - 2.0 * d0) + abs(du + dd - 2.0 * d0);
  float e = smoothstep(0.035 * d0 + 0.05, 0.07 * d0 + 0.12, lap);
  // only darken the pixel that is FARTHER than a neighbour (outer silhouette) so objects keep their size
  float nearest = min(min(dl, dr), min(du, dd));
  e *= step(0.0, d0 - nearest - 0.02 * d0);
  vec3 s = toSRGB(c);
  float l = dot(s, vec3(0.299, 0.587, 0.114)); s = mix(vec3(l), s, sat); s = (s - 0.5) * contrast + 0.5;
  vec3 ink = mix(s * 0.22, vec3(0.04, 0.05, 0.10), 0.55);
  s = mix(s, ink, e * outline);
  vec2 px = floor(vUv / texel);
  s = floor(s * levels + 0.5 + bayer(px) * 0.55) / levels;
  gl_FragColor = vec4(clamp(s, 0.0, 1.0), 1.0);
}`;

/** Pixel-art look: render the scene into a low-res target, then outline + grade + dither it onto the canvas. */
export class Post {
  constructor(renderer, opts = {}) {
    this.r = renderer; this.enabled = opts.enabled !== false; this.rt = null;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
      uniforms: { tColor: { value: null }, tDepth: { value: null }, texel: { value: new THREE.Vector2() }, near: { value: 0.3 }, far: { value: 600 }, levels: { value: 40 }, outline: { value: 0.85 }, sat: { value: 1.18 }, contrast: { value: 1.06 } },
    }));
    this.quad.frustumCulled = false; this.scene = new THREE.Scene(); this.scene.add(this.quad); this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setSize(w, h) {
    if (this.rt) this.rt.dispose();
    const dt = new THREE.DepthTexture(w, h); dt.type = THREE.UnsignedIntType; dt.minFilter = dt.magFilter = THREE.NearestFilter;
    this.rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: dt, depthBuffer: true, type: THREE.HalfFloatType });
    const u = this.quad.material.uniforms; u.tColor.value = this.rt.texture; u.tDepth.value = dt; u.texel.value.set(1 / w, 1 / h);
  }
  render(scene, camera) {
    if (!this.enabled || !this.rt) { this.r.render(scene, camera); return; }
    const u = this.quad.material.uniforms; u.near.value = camera.near; u.far.value = camera.far;
    this.r.setRenderTarget(this.rt); this.r.render(scene, camera); this.r.setRenderTarget(null); this.r.render(this.scene, this.cam);
  }
}
