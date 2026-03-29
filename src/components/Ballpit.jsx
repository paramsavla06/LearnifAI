import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

class ThreeScene {
  #config;
  canvas;
  camera;
  cameraMinAspect;
  cameraMaxAspect;
  cameraFov;
  maxPixelRatio;
  minPixelRatio;
  scene;
  renderer;
  #postprocessing;
  size = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0, pixelRatio: 0 };
  render = this.#renderFn;
  onBeforeRender = () => {};
  onAfterRender = () => {};
  onAfterResize = () => {};
  #isIntersecting = false;
  #isActive = false;
  isDisposed = false;
  #intersectionObserver;
  #resizeObserver;
  #resizeTimeout;
  #clock = new THREE.Clock();
  #time = { elapsed: 0, delta: 0 };
  #requestRef;

  constructor(options) {
    this.#config = { ...options };
    this.#initCamera();
    this.#initScene();
    this.#initRenderer();
    this.resize();
    this.#initEvents();
  }

  #initCamera() {
    this.camera = new THREE.PerspectiveCamera();
    this.cameraFov = this.camera.fov;
  }

  #initScene() {
    this.scene = new THREE.Scene();
  }

  #initRenderer() {
    if (this.#config.canvas) {
      this.canvas = this.#config.canvas;
    } else if (this.#config.id) {
      this.canvas = document.getElementById(this.#config.id);
    } else {
      console.error('ThreeScene: Missing canvas or id parameter');
    }
    this.canvas.style.display = 'block';
    const rendererOptions = {
      canvas: this.canvas,
      powerPreference: 'high-performance',
      ...(this.#config.rendererOptions ?? {}),
    };
    this.renderer = new THREE.WebGLRenderer(rendererOptions);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  #initEvents() {
    if (!(this.#config.size instanceof Object)) {
      window.addEventListener('resize', this.#handleResize.bind(this));
      if (this.#config.size === 'parent' && this.canvas.parentNode) {
        this.#resizeObserver = new ResizeObserver(this.#handleResize.bind(this));
        this.#resizeObserver.observe(this.canvas.parentNode);
      }
    }
    this.#intersectionObserver = new IntersectionObserver(this.#handleIntersection.bind(this), {
      root: null,
      rootMargin: '0px',
      threshold: 0,
    });
    this.#intersectionObserver.observe(this.canvas);
    document.addEventListener('visibilitychange', this.#handleVisibilityChange.bind(this));
  }

  #removeEvents() {
    window.removeEventListener('resize', this.#handleResize.bind(this));
    this.#resizeObserver?.disconnect();
    this.#intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.#handleVisibilityChange.bind(this));
  }

  #handleIntersection(entries) {
    this.#isIntersecting = entries[0].isIntersecting;
    this.#isIntersecting ? this.#startAnimation() : this.#stopAnimation();
  }

  #handleVisibilityChange() {
    if (this.#isIntersecting) {
      document.hidden ? this.#stopAnimation() : this.#startAnimation();
    }
  }

  #handleResize() {
    if (this.#resizeTimeout) clearTimeout(this.#resizeTimeout);
    this.#resizeTimeout = setTimeout(this.resize.bind(this), 100);
  }

  resize() {
    let width, height;
    if (this.#config.size instanceof Object) {
      width = this.#config.size.width;
      height = this.#config.size.height;
    } else if (this.#config.size === 'parent' && this.canvas.parentNode) {
      width = this.canvas.parentNode.offsetWidth;
      height = this.canvas.parentNode.offsetHeight;
    } else {
      width = window.innerWidth;
      height = window.innerHeight;
    }
    this.size.width = width;
    this.size.height = height;
    this.size.ratio = width / height;
    this.#updateCamera();
    this.#updateRendererSize();
    this.onAfterResize(this.size);
  }

  #updateCamera() {
    this.camera.aspect = this.size.width / this.size.height;
    if (this.camera.isPerspectiveCamera && this.cameraFov) {
      if (this.cameraMinAspect && this.camera.aspect < this.cameraMinAspect) {
        this.#adjustFov(this.cameraMinAspect);
      } else if (this.cameraMaxAspect && this.camera.aspect > this.cameraMaxAspect) {
        this.#adjustFov(this.cameraMaxAspect);
      } else {
        this.camera.fov = this.cameraFov;
      }
    }
    this.camera.updateProjectionMatrix();
    this.updateWorldSize();
  }

  #adjustFov(aspect) {
    const vFov = (2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.cameraFov / 2)) / (this.camera.aspect / aspect)));
    this.camera.fov = THREE.MathUtils.radToDeg(vFov);
  }

  updateWorldSize() {
    if (this.camera.isPerspectiveCamera) {
      const hFov = (this.camera.fov * Math.PI) / 180;
      this.size.wHeight = 2 * Math.tan(hFov / 2) * this.camera.position.length();
      this.size.wWidth = this.size.wHeight * this.camera.aspect;
    } else if (this.camera.isOrthographicCamera) {
      this.size.wHeight = this.camera.top - this.camera.bottom;
      this.size.wWidth = this.camera.right - this.camera.left;
    }
  }

  #updateRendererSize() {
    this.renderer.setSize(this.size.width, this.size.height);
    this.#postprocessing?.setSize(this.size.width, this.size.height);
    let dpr = window.devicePixelRatio;
    if (this.maxPixelRatio && dpr > this.maxPixelRatio) dpr = this.maxPixelRatio;
    if (this.minPixelRatio && dpr < this.minPixelRatio) dpr = this.minPixelRatio;
    this.renderer.setPixelRatio(dpr);
    this.size.pixelRatio = dpr;
  }

  get postprocessing() {
    return this.#postprocessing;
  }

  set postprocessing(val) {
    this.#postprocessing = val;
    this.render = val.render.bind(val);
  }

  #startAnimation() {
    if (this.#isActive) return;
    const animate = () => {
      this.#requestRef = requestAnimationFrame(animate);
      this.#time.delta = this.#clock.getDelta();
      this.#time.elapsed += this.#time.delta;
      this.onBeforeRender(this.#time);
      this.render();
      this.onAfterRender(this.#time);
    };
    this.#isActive = true;
    this.#clock.start();
    animate();
  }

  #stopAnimation() {
    if (this.#isActive) {
      cancelAnimationFrame(this.#requestRef);
      this.#isActive = false;
      this.#clock.stop();
    }
  }

  #renderFn() {
    this.renderer.render(this.scene, this.camera);
  }

  clear() {
    this.scene.traverse((obj) => {
      if (obj.isMesh && typeof obj.material === 'object' && obj.material !== null) {
        Object.keys(obj.material).forEach((key) => {
          const materialProp = obj.material[key];
          if (
            materialProp !== null &&
            typeof materialProp === 'object' &&
            typeof materialProp.dispose === 'function'
          ) {
            materialProp.dispose();
          }
        });
        obj.material.dispose();
        obj.geometry.dispose();
      }
    });
    this.scene.clear();
  }

  dispose() {
    this.#removeEvents();
    this.#stopAnimation();
    this.clear();
    this.#postprocessing?.dispose();
    this.renderer.dispose();
    // this.renderer.forceContextLoss();
    this.isDisposed = true;
  }
}

const interactionMap = new Map();
const mouseCoords = new THREE.Vector2();
let interactionActive = false;

function initInteraction(options) {
  const state = {
    position: new THREE.Vector2(),
    nPosition: new THREE.Vector2(),
    hover: false,
    touching: false,
    onEnter() {},
    onMove() {},
    onClick() {},
    onLeave() {},
    ...options,
  };

  (function register(dom, s) {
    if (!interactionMap.has(dom)) {
      interactionMap.set(dom, s);
      if (!interactionActive) {
        document.body.addEventListener('pointermove', onPointerMove);
        document.body.addEventListener('pointerleave', onPointerLeave);
        document.body.addEventListener('click', onClick);
        document.body.addEventListener('touchstart', onTouchStart, { passive: false });
        document.body.addEventListener('touchmove', onTouchMove, { passive: false });
        document.body.addEventListener('touchend', onTouchEnd, { passive: false });
        document.body.addEventListener('touchcancel', onTouchEnd, { passive: false });
        interactionActive = true;
      }
    }
  })(options.domElement, state);

  state.dispose = () => {
    interactionMap.delete(options.domElement);
    if (interactionMap.size === 0) {
      document.body.removeEventListener('pointermove', onPointerMove);
      document.body.removeEventListener('pointerleave', onPointerLeave);
      document.body.removeEventListener('click', onClick);
      document.body.removeEventListener('touchstart', onTouchStart);
      document.body.removeEventListener('touchmove', onTouchMove);
      document.body.removeEventListener('touchend', onTouchEnd);
      document.body.removeEventListener('touchcancel', onTouchEnd);
      interactionActive = false;
    }
  };
  return state;
}

function onPointerMove(e) {
  mouseCoords.x = e.clientX;
  mouseCoords.y = e.clientY;
  updateInteractions();
}

function updateInteractions() {
  for (const [dom, state] of interactionMap) {
    const rect = dom.getBoundingClientRect();
    if (isPointInRect(rect)) {
      calculatePositions(state, rect);
      if (!state.hover) {
        state.hover = true;
        state.onEnter(state);
      }
      state.onMove(state);
    } else if (state.hover && !state.touching) {
      state.hover = false;
      state.onLeave(state);
    }
  }
}

function onClick(e) {
  mouseCoords.x = e.clientX;
  mouseCoords.y = e.clientY;
  for (const [dom, state] of interactionMap) {
    const rect = dom.getBoundingClientRect();
    calculatePositions(state, rect);
    if (isPointInRect(rect)) state.onClick(state);
  }
}

function onPointerLeave() {
  for (const state of interactionMap.values()) {
    if (state.hover) {
      state.hover = false;
      state.onLeave(state);
    }
  }
}

function onTouchStart(e) {
  if (e.touches.length > 0) {
    e.preventDefault();
    mouseCoords.x = e.touches[0].clientX;
    mouseCoords.y = e.touches[0].clientY;
    for (const [dom, state] of interactionMap) {
      const rect = dom.getBoundingClientRect();
      if (isPointInRect(rect)) {
        state.touching = true;
        calculatePositions(state, rect);
        if (!state.hover) {
          state.hover = true;
          state.onEnter(state);
        }
        state.onMove(state);
      }
    }
  }
}

function onTouchMove(e) {
  if (e.touches.length > 0) {
    e.preventDefault();
    mouseCoords.x = e.touches[0].clientX;
    mouseCoords.y = e.touches[0].clientY;
    for (const [dom, state] of interactionMap) {
      const rect = dom.getBoundingClientRect();
      calculatePositions(state, rect);
      if (isPointInRect(rect)) {
        if (!state.hover) {
          state.hover = true;
          state.touching = true;
          state.onEnter(state);
        }
        state.onMove(state);
      } else if (state.hover && state.touching) {
        state.onMove(state);
      }
    }
  }
}

function onTouchEnd() {
  for (const state of interactionMap.values()) {
    if (state.touching) {
      state.touching = false;
      if (state.hover) {
        state.hover = false;
        state.onLeave(state);
      }
    }
  }
}

function calculatePositions(state, rect) {
  state.position.x = mouseCoords.x - rect.left;
  state.position.y = mouseCoords.y - rect.top;
  state.nPosition.x = (state.position.x / rect.width) * 2 - 1;
  state.nPosition.y = -(state.position.y / rect.height) * 2 + 1;
}

function isPointInRect(rect) {
  return mouseCoords.x >= rect.left && mouseCoords.x <= rect.left + rect.width &&
         mouseCoords.y >= rect.top && mouseCoords.y <= rect.top + rect.height;
}

const { randFloat, randFloatSpread } = THREE.MathUtils;
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const v3 = new THREE.Vector3();
const v4 = new THREE.Vector3();
const v5 = new THREE.Vector3();
const v6 = new THREE.Vector3();
const v7 = new THREE.Vector3();
const v8 = new THREE.Vector3();
const v9 = new THREE.Vector3();
const v10 = new THREE.Vector3();
const v11 = new THREE.Vector3();
const v12 = new THREE.Vector3();
const CONCEPTS = [
  'Artificial Intelligence', 'Neural Networks', 'Algorithms', 'Deep Learning',
  'Machine Learning', 'Big Data', 'Robotics', 'Ethical AI', 'Computer Vision',
  'NLP', 'Logic', 'Calculus', 'Probability', 'Optimization', 'Data Science'
];

function createConceptTexture(concept) {
  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, size, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 54px Inter, system-ui, sans-serif';

  // White text with glow
  ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
  ctx.shadowBlur = 15;
  ctx.fillStyle = 'white';
  ctx.fillText(concept, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

class PhysicsEngine {
  constructor(config) {
    this.config = config;
    this.positionData = new Float32Array(3 * config.count).fill(0);
    this.velocityData = new Float32Array(3 * config.count).fill(0);
    this.sizeData = new Float32Array(config.count).fill(1);
    this.center = new THREE.Vector3();
    this.#initPositions();
    this.setSizes();
  }

  #initPositions() {
    const { config, positionData } = this;
    this.center.toArray(positionData, 0);
    for (let i = 1; i < config.count; i++) {
      const idx = 3 * i;
      positionData[idx] = randFloatSpread(2 * config.maxX);
      positionData[idx + 1] = randFloatSpread(2 * config.maxY);
      positionData[idx + 2] = randFloatSpread(2 * config.maxZ);
    }
  }

  setSizes() {
    const { config, sizeData } = this;
    sizeData[0] = config.size0;
    for (let i = 1; i < config.count; i++) {
      sizeData[i] = randFloat(config.minSize, config.maxSize);
    }
  }

  update(time) {
    const { config, center, positionData, sizeData, velocityData } = this;
    let startIndex = 0;
    if (config.controlSphere0) {
      startIndex = 1;
      v1.fromArray(positionData, 0);
      v1.lerp(center, 0.1).toArray(positionData, 0);
      v4.set(0, 0, 0).toArray(velocityData, 0);
    }

    for (let i = startIndex; i < config.count; i++) {
      const idx = 3 * i;
      v2.fromArray(positionData, idx);
      v5.fromArray(velocityData, idx);
      v5.y -= time.delta * config.gravity * sizeData[i];
      v5.multiplyScalar(config.friction);
      v5.clampLength(0, config.maxVelocity);
      v2.add(v5);
      v2.toArray(positionData, idx);
      v5.toArray(velocityData, idx);
    }

    for (let i = startIndex; i < config.count; i++) {
      const idx = 3 * i;
      v2.fromArray(positionData, idx);
      v5.fromArray(velocityData, idx);
      const r1 = sizeData[i];

      for (let j = i + 1; j < config.count; j++) {
        const idx2 = 3 * j;
        v3.fromArray(positionData, idx2);
        v6.fromArray(velocityData, idx2);
        const r2 = sizeData[j];
        v7.copy(v3).sub(v2);
        const dist = v7.length();
        const minDist = r1 + r2;
        if (dist < minDist) {
          const overlap = minDist - dist;
          v8.copy(v7).normalize().multiplyScalar(0.5 * overlap);
          v9.copy(v8).multiplyScalar(Math.max(v5.length(), 1));
          v10.copy(v8).multiplyScalar(Math.max(v6.length(), 1));
          v2.sub(v8);
          v5.sub(v9);
          v2.toArray(positionData, idx);
          v5.toArray(velocityData, idx);
          v3.add(v8);
          v6.add(v10);
          v3.toArray(positionData, idx2);
          v6.toArray(velocityData, idx2);
        }
      }

      if (config.controlSphere0) {
        v7.copy(v1).sub(v2);
        const dist = v7.length();
        const minDist = r1 + sizeData[0];
        if (dist < minDist) {
          const diff = minDist - dist;
          v8.copy(v7.normalize()).multiplyScalar(diff);
          v9.copy(v8).multiplyScalar(Math.max(v5.length(), 2));
          v2.sub(v8);
          v5.sub(v9);
        }
      }

      if (Math.abs(v2.x) + r1 > config.maxX) {
        v2.x = Math.sign(v2.x) * (config.maxX - r1);
        v5.x = -v5.x * config.wallBounce;
      }
      if (config.gravity === 0) {
        if (Math.abs(v2.y) + r1 > config.maxY) {
          v2.y = Math.sign(v2.y) * (config.maxY - r1);
          v5.y = -v5.y * config.wallBounce;
        }
      } else if (v2.y - r1 < -config.maxY) {
        v2.y = -config.maxY + r1;
        v5.y = -v5.y * config.wallBounce;
      }

      const maxZ = Math.max(config.maxZ, config.maxSize);
      if (Math.abs(v2.z) + r1 > maxZ) {
        v2.z = Math.sign(v2.z) * (config.maxZ - r1);
        v5.z = -v5.z * config.wallBounce;
      }
      v2.toArray(positionData, idx);
      v5.toArray(velocityData, idx);
    }
  }
}

class ScatteredMaterial extends THREE.MeshPhysicalMaterial {
  constructor(params) {
    super(params);
    this.uniforms = {
      thicknessDistortion: { value: 0.1 },
      thicknessAmbient: { value: 0 },
      thicknessAttenuation: { value: 0.1 },
      thicknessPower: { value: 2 },
      thicknessScale: { value: 10 },
      uConceptAtlas: { value: null },
    };
    this.defines.USE_UV = '';
    this.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader = '\n uniform float thicknessPower;\n uniform float thicknessScale;\n uniform float thicknessDistortion;\n uniform float thicknessAmbient;\n uniform float thicknessAttenuation;\n ' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        '\n void RE_Direct_Scattering(const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {\n vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));\n float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;\n #ifdef USE_COLOR\n vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * vColor;\n #else\n vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * diffuse;\n #endif\n reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;\n }\n\n void main() {\n '
      );
      const replaced = THREE.ShaderChunk.lights_fragment_begin.replaceAll(
        'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
        '\n RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n RE_Direct_Scattering(directLight, vUv, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);\n '
      );
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', replaced);
    };
  }
}

const DEFAULT_CONFIG = {
  count: 200,
  colors: [0xFFD85F, 0xFFFFFF, 0x000000],
  ambientColor: 0xFFFFFF,
  ambientIntensity: 1,
  lightIntensity: 200,
  materialParams: { metalness: 0.5, roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.15 },
  minSize: 0.5,
  maxSize: 1,
  size0: 1,
  gravity: 0.5,
  friction: 0.9975,
  wallBounce: 0.95,
  maxVelocity: 0.15,
  maxX: 5,
  maxY: 5,
  maxZ: 2,
  controlSphere0: false,
  followCursor: true,
};
const dummy = new THREE.Object3D();

class SpheresInstance extends THREE.Group {
  constructor(renderer, config = {}) {
    super();
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment()).texture;
    
    this.count = finalConfig.count;
    this.config = finalConfig;
    this.physics = new PhysicsEngine(finalConfig);

    this.meshGroups = CONCEPTS.map((concept, i) => {
      const geometry = new THREE.SphereGeometry(1, 40, 40);
      const map = createConceptTexture(concept);
      const material = new THREE.MeshPhysicalMaterial({ 
        envMap: envTexture,
        map: map,
        ...finalConfig.materialParams 
      });
      material.envMapRotation.x = -Math.PI / 2;
      
      const groupSize = Math.ceil(finalConfig.count / CONCEPTS.length) + 1;
      const mesh = new THREE.InstancedMesh(geometry, material, groupSize);
      this.add(mesh);
      return mesh;
    });

    this.#initLights();
    this.#initLines();
    this.setColors(finalConfig.colors);
  }

  #initLights() {
    this.ambientLight = new THREE.AmbientLight(this.config.ambientColor, this.config.ambientIntensity);
    this.add(this.ambientLight);
    this.light = new THREE.PointLight(this.config.colors[0], this.config.lightIntensity);
    this.add(this.light);
  }

  #initLines() {
    const maxConnections = this.count * 2;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxConnections * 2 * 3), 3));
    const material = new THREE.LineBasicMaterial({
      color: this.config.colors[0],
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    this.lines = new THREE.LineSegments(geometry, material);
    this.lines.frustumCulled = false;
    this.add(this.lines);
  }

  setColors(colors) {
    if (Array.isArray(colors) && colors.length > 1) {
      const colorHelper = (function (cols) {
        let colorsArr, threeColors;
        function update(c) {
          colorsArr = c;
          threeColors = c.map((col) => new THREE.Color(col));
        }
        update(cols);
        return {
          update,
          getColorAt: function (ratio, out = new THREE.Color()) {
            const scaled = Math.max(0, Math.min(1, ratio)) * (colorsArr.length - 1);
            const idx = Math.floor(scaled);
            const start = threeColors[idx];
            if (idx >= colorsArr.length - 1) return start.clone();
            const alpha = scaled - idx;
            const end = threeColors[idx + 1];
            out.r = start.r + alpha * (end.r - start.r);
            out.g = start.g + alpha * (end.g - start.g);
            out.b = start.b + alpha * (end.b - start.b);
            return out;
          },
        };
      })(colors);

      const color = new THREE.Color();
      for (let i = 0; i < this.count; i++) {
        const groupIdx = i % CONCEPTS.length;
        const group = this.meshGroups[groupIdx];
        const instanceIdx = Math.floor(i / CONCEPTS.length);
        
        colorHelper.getColorAt(i / this.count, color);
        group.setColorAt(instanceIdx, color);
        if (i === 0) {
          this.light.color.copy(color);
        }
      }
      this.meshGroups.forEach(g => {
        if (g.instanceColor) g.instanceColor.needsUpdate = true;
      });
    }
  }

  update(time) {
    this.physics.update(time);
    
    // Reset counts for each group
    const counters = new Array(CONCEPTS.length).fill(0);

    for (let i = 0; i < this.count; i++) {
      const groupIdx = i % CONCEPTS.length;
      const group = this.meshGroups[groupIdx];
      const instanceIdx = counters[groupIdx]++;
      
      dummy.position.fromArray(this.physics.positionData, 3 * i);
      if (i === 0 && this.config.followCursor === false) {
        dummy.scale.setScalar(0);
      } else {
        dummy.scale.setScalar(this.physics.sizeData[i]);
      }
      dummy.updateMatrix();
      group.setMatrixAt(instanceIdx, dummy.matrix);
      if (i === 0) this.light.position.copy(dummy.position);
    }

    this.meshGroups.forEach((g, i) => {
      g.count = counters[i];
      g.instanceMatrix.needsUpdate = true;
    });

    // Update connections
    const posAttr = this.lines.geometry.attributes.position;
    const positions = posAttr.array;
    let lineIdx = 0;
    const maxLines = this.count * 2;
    const threshold = 3.5;

    for (let i = 0; i < this.count; i++) {
      v11.fromArray(this.physics.positionData, 3 * i);
      for (let j = i + 1; j < this.count; j++) {
        if (lineIdx >= maxLines) break;
        v12.fromArray(this.physics.positionData, 3 * j);
        const dist = v11.distanceTo(v12);
        if (dist < threshold) {
          const start = 3 * lineIdx * 2;
          positions[start] = v11.x;
          positions[start + 1] = v11.y;
          positions[start + 2] = v11.z;
          positions[start + 3] = v12.x;
          positions[start + 4] = v12.y;
          positions[start + 5] = v12.z;
          lineIdx++;
        }
      }
      if (lineIdx >= maxLines) break;
    }
    this.lines.geometry.setDrawRange(0, lineIdx * 2);
    posAttr.needsUpdate = true;
  }
}

function createBallpit(canvas, config = {}) {
  const three = new ThreeScene({ canvas, size: 'parent', rendererOptions: { antialias: true, alpha: true } });
  let spheres;
  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.camera.position.set(0, 0, 20);
  three.camera.lookAt(0, 0, 0);
  three.cameraMaxAspect = 1.5;
  three.resize();

  const init = (cfg) => {
    if (spheres) {
      three.clear();
      three.scene.remove(spheres);
    }
    spheres = new SpheresInstance(three.renderer, cfg);
    three.scene.add(spheres);
  };

  init(config);
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const intersectPoint = new THREE.Vector3();
  let paused = false;
  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';
  canvas.style.webkitUserSelect = 'none';

  const interaction = initInteraction({
    domElement: canvas,
    onMove(s) {
      raycaster.setFromCamera(s.nPosition, three.camera);
      three.camera.getWorldDirection(plane.normal);
      raycaster.ray.intersectPlane(plane, intersectPoint);
      spheres.physics.center.copy(intersectPoint);
      spheres.config.controlSphere0 = true;
    },
    onLeave() {
      spheres.config.controlSphere0 = false;
    },
  });

  three.onBeforeRender = (time) => {
    if (!paused) spheres.update(time);
  };
  three.onAfterResize = (size) => {
    spheres.config.maxX = size.wWidth / 2;
    spheres.config.maxY = size.wHeight / 2;
  };

  return {
    three,
    get spheres() { return spheres; },
    setCount(c) { init({ ...spheres.config, count: c }); },
    togglePause() { paused = !paused; },
    dispose() {
      interaction.dispose();
      three.dispose();
    },
  };
}

const Ballpit = ({ className = '', followCursor = true, ...props }) => {
  const canvasRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    instanceRef.current = createBallpit(canvas, { followCursor, ...props });
    return () => {
      if (instanceRef.current) instanceRef.current.dispose();
    };
  }, []);

  return <canvas className={className} ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
};

export default Ballpit;
