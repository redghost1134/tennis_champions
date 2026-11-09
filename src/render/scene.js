import * as THREE from 'three';

export const PALETTE = { yellow: '#ffc72c', blue: '#1f56c4', white: '#f7f7f2', black: '#1c1d22', asph: '#3d4049' };

const QUALITY = {
  high: { ratio: 2, shadow: 2048, shadows: true },
  medium: { ratio: 1.5, shadow: 1024, shadows: true },
  low: { ratio: 1, shadow: 1024, shadows: false },
};

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#cfe9ff', 55, 130);

  const gradTex = new THREE.DataTexture(new Uint8Array([70, 140, 205, 255]), 4, 1, THREE.RedFormat);
  gradTex.minFilter = gradTex.magFilter = THREE.NearestFilter;
  gradTex.needsUpdate = true;
  const toon = (color, opts = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradTex, ...opts });
  const sharedToon = new Map();
  // memoised by colour + opts: for static decor only, never mutate the result
  const toonShared = (color, opts = {}) => {
    const key = color + JSON.stringify(opts);
    if (!sharedToon.has(key)) sharedToon.set(key, toon(color, opts));
    return sharedToon.get(key);
  };
  const outlineMat = new THREE.MeshBasicMaterial({ color: '#15161a', side: THREE.BackSide });
  function outline(m, s) {
    const o = new THREE.Mesh(m.geometry, outlineMat);
    o.scale.setScalar(s);
    m.add(o);
    return m;
  }
  function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene, { cast = true, recv = false, ol = 0 } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = recv;
    parent.add(m);
    if (ol) outline(m, ol);
    return m;
  }
  function textTex(txt, { bg = null, fg = '#fff', stroke = null, w = 1024, h = 160, font = 0.62 } = {}) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d');
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, w, h); }
    let size = h * font;
    c.font = `900 ${size}px Trebuchet MS`;
    const mw = c.measureText(txt).width;
    if (mw > w * 0.92) { size *= (w * 0.92) / mw; c.font = `900 ${size}px Trebuchet MS`; }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (stroke) {
      c.lineWidth = size * 0.16;
      c.strokeStyle = stroke;
      c.lineJoin = 'round';
      c.strokeText(txt, w / 2, h / 2 + 4);
    }
    c.fillStyle = fg;
    c.fillText(txt, w / 2, h / 2 + 4);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }

  // lights + sky
  scene.add(new THREE.HemisphereLight('#e3f3ff', '#5d616c', 1.25));
  const sun = new THREE.DirectionalLight('#fff0d0', 2.8);
  sun.position.set(9, 20, 7);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 60 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(200, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color('#1f78ff') }, bot: { value: new THREE.Color('#e4f5ff') } },
      vertexShader: 'varying vec3 vp;void main(){vp=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform vec3 top;uniform vec3 bot;varying vec3 vp;void main(){float h=clamp(vp.y*1.8+0.05,0.,1.);gl_FragColor=vec4(mix(bot,top,pow(h,.8)),1.);
  #include <colorspace_fragment>
  }`,
    }),
  ));

  let quality = null;
  function setQuality(q) {
    const cfg = QUALITY[q];
    if (!cfg) return;
    const sizeChanged = sun.shadow.mapSize.x !== cfg.shadow;
    const shadowsChanged = !quality || QUALITY[quality].shadows !== cfg.shadows;
    quality = q;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, cfg.ratio));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.shadowMap.enabled = cfg.shadows;
    sun.castShadow = cfg.shadows;
    if (sizeChanged) {
      sun.shadow.mapSize.set(cfg.shadow, cfg.shadow);
      sun.shadow.dispose();
    }
    if (shadowsChanged) {
      scene.traverse((o) => {
        const ms = o.material ? [].concat(o.material) : [];
        for (const m of ms) m.needsUpdate = true;
      });
    }
  }
  const resize = () => renderer.setSize(window.innerWidth, window.innerHeight, false);
  window.addEventListener('resize', resize);
  setQuality('medium');

  return { renderer, scene, toon, toonShared, outline, outlineMat, mesh, textTex, setQuality, render: (camera) => renderer.render(scene, camera) };
}
