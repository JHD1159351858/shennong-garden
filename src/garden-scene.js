import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prepareRealismFoliage } from './realism-foliage.js';

const WIDTH = 11;
const DEPTH = 7;
const LIMIT_X = WIDTH / 2;
const LIMIT_Z = DEPTH / 2;
const clamp = (value, limit) => THREE.MathUtils.clamp(value, -limit, limit);
const surfaceHeight = (x, z) => x < -3.75 && z > -3.38 && z < 3.28 ? 0.295 : 0;

function random(seed = 297) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function gravelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  const rng = random();
  context.fillStyle = '#d5d0bd';
  context.fillRect(0, 0, 512, 512);
  const colors = ['#c2bdab', '#e8e3d3', '#d1cbb8', '#b3b09d', '#f0eadb'];
  for (let i = 0; i < 24000; i++) {
    context.fillStyle = colors[Math.floor(rng() * colors.length)];
    const size = 0.6 + rng() * 2.3;
    context.beginPath();
    context.ellipse(rng() * 512, rng() * 512, size, size * 0.68, rng() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2.6);
  return texture;
}

function buildCourtyard(scene) {
  const environment = new THREE.Group();
  environment.name = 'Courtyard';
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.94, ...extra });
  const gravel = material('#ffffff', { map: gravelTexture() });
  const wood = material('#75634c');
  const darkWood = material('#504d3d');
  const stone = material('#a9aaa0');
  const edge = material('#8e9180');
  const moss = material('#78915c');
  const soil = material('#9da077');

  function box(w, h, d, x, y, z, mat = wood) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    environment.add(mesh);
    return mesh;
  }

  box(WIDTH + 0.26, 0.25, DEPTH + 0.26, 0, -0.17, 0, edge);
  box(WIDTH, 0.09, DEPTH, 0, -0.045, 0, gravel);
  // The dark timber fence provides a quiet backdrop for the planting.
  for (let i = 0; i < 47; i++) {
    const mat = material(new THREE.Color('#575b4a').multiplyScalar(0.85 + (i % 4) * 0.055));
    box(0.224, 1.85, 0.09, -5.42 + i * 0.235, 0.925, -3.53, mat);
  }
  box(11.25, 0.12, 0.2, 0, 1.87, -3.53, darkWood);
  box(11.12, 0.12, 0.16, 0, 0.45, -3.47, darkWood);
  for (const x of [-5.4, -2.7, 0, 2.7, 5.4]) box(0.14, 2.02, 0.17, x, 1, -3.45, darkWood);

  // A shallow wooden veranda, with a simple plaster-and-timber garden wall.
  box(1.7, 0.24, 6.65, -4.61, 0.12, -0.05, darkWood);
  for (let i = 0; i < 30; i++) {
    box(1.72, 0.055, 0.209, -4.61, 0.267, -3.23 + i * 0.22,
      material(new THREE.Color('#a28a65').multiplyScalar(0.92 + (i % 4) * 0.04)));
  }
  box(0.45, 0.12, 1.7, -3.56, 0.06, 1.45, wood);
  box(0.12, 2.6, 5.5, -5.48, 1.3, -0.45, material('#eee7d6'));
  for (const z of [-3.2, -1.5, 0.2, 2.3]) box(0.18, 2.72, 0.13, -5.36, 1.36, z, darkWood);
  box(0.2, 0.16, 5.67, -5.35, 2.55, -0.45, darkWood);
  box(0.65, 0.12, 5.85, -5.27, 2.71, -0.45, material('#596151'));
  const windowPaper = material('#dddccc');
  for (const z of [-1.45, 0.17]) {
    box(0.06, 1.78, 1.45, -5.265, 1.34, z + 0.81, windowPaper);
    for (let i = 0; i < 4; i++) box(0.06, 1.84, 0.035, -5.22, 1.34, z + 0.12 + i * 0.46, wood);
    for (let i = 0; i < 5; i++) box(0.06, 0.03, 1.43, -5.21, 0.45 + i * 0.445, z + 0.81, wood);
  }

  const rng = random(49);
  // Slightly irregular stone steps lead from the foreground into the garden.
  const steps = [[0.1, 3.05], [-0.35, 2.18], [-0.7, 1.34], [-0.56, 0.47], [-1.04, -0.34], [-1.46, -1.12], [-1.05, -1.94], [-0.63, -2.71]];
  for (const [x, z] of steps) {
    const geometry = new THREE.CylinderGeometry(0.54, 0.57, 0.09, 7);
    const mesh = new THREE.Mesh(geometry, material(new THREE.Color('#b9b9ab').multiplyScalar(0.91 + rng() * 0.13)));
    mesh.position.set(x, 0.055, z);
    mesh.rotation.y = rng() * Math.PI;
    mesh.scale.set(1.13, 1, 0.77);
    mesh.receiveShadow = mesh.castShadow = true;
    environment.add(mesh);
  }
  // Low moss islands leave the center open and give the specimens a planted setting.
  const beds = [[2.8, -1.8, 2.1, 1.15], [-2.72, -1.8, 0.83, 1.15], [3.65, 1.6, 1.4, 1.25], [-2.6, 1.9, 0.8, 1.2]];
  for (const [x, z, sx, sz] of beds) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.025, 30), soil);
    mesh.position.set(x, 0.015, z);
    mesh.scale.set(sx, 1, sz);
    mesh.receiveShadow = true;
    environment.add(mesh);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.34, 7, 4), moss);
      patch.scale.set(1 + rng() * 0.6, 0.12, 1 + rng() * 0.6);
      patch.position.set(x + Math.cos(a) * sx * 0.83, 0.018, z + Math.sin(a) * sz * 0.83);
      patch.receiveShadow = true;
      environment.add(patch);
    }
  }
  // A few low pebble accents break the otherwise flat gravel silhouette.
  const pebbleGeo = new THREE.IcosahedronGeometry(0.025, 0);
  const pebbles = new THREE.InstancedMesh(pebbleGeo, stone, 650);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 650; i++) {
    dummy.position.set(-3.55 + rng() * 8.95, 0.012, -3.42 + rng() * 6.84);
    dummy.scale.set(0.4 + rng(), 0.25 + rng() * 0.3, 0.5 + rng());
    dummy.rotation.set(rng(), rng() * 6, rng());
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
  }
  pebbles.receiveShadow = true;
  environment.add(pebbles);
  scene.add(environment);
  return environment;
}

function addLighting(scene, shadows = true) {
  scene.add(new THREE.HemisphereLight('#fff6df', '#879576', 2.15));
  const sun = new THREE.DirectionalLight('#fff2d9', 3.3);
  sun.position.set(-3, 10, 7);
  sun.castShadow = shadows;
  if (shadows) {
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 8, bottom: -8, near: 0.2, far: 30 });
    sun.shadow.bias = -0.00025;
    sun.shadow.normalBias = 0.035;
    sun.shadow.radius = 3;
  }
  scene.add(sun);
}

export async function createGardenScene(container, { onSelect, onMove, onPlace, onReady, realistic = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  } catch {
    throw new Error('当前浏览器无法启动 3D 画布，请开启硬件加速或使用支持 WebGL 的浏览器。');
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = realistic ? 0.95 : 1.03;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = realistic ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'garden-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '庭院三维画布，切换俯视后可拖动植物和装饰');
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e5e8df');
  let realismEnvironment;
  if (realistic) {
    const { buildRealismEnvironment } = await import('./realism-environment.js');
    realismEnvironment = await buildRealismEnvironment(scene, renderer);
  } else {
    addLighting(scene);
    buildCourtyard(scene);
  }
  const groundHeight = realismEnvironment?.groundHeight || surfaceHeight;
  const objectsGroup = new THREE.Group();
  scene.add(objectsGroup);
  const grid = new THREE.GridHelper(11, 22, '#7a8b77', '#8e9b82');
  grid.position.y = 0.09;
  grid.scale.z = DEPTH / WIDTH;
  if (realistic) {
    const points = grid.geometry.attributes.position;
    for (let i = 0; i < points.count; i++) points.setY(i, groundHeight(points.getX(i), points.getZ(i) * DEPTH / WIDTH));
    points.needsUpdate = true;
  }
  grid.material.transparent = true;
  grid.material.opacity = 0.28;
  grid.material.depthWrite = false;
  grid.visible = false;
  scene.add(grid);
  const selection = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 64), new THREE.MeshBasicMaterial({ color: '#f5e6a9', transparent: true, opacity: 0.96, side: THREE.DoubleSide, depthWrite: false }));
  selection.rotation.x = -Math.PI / 2;
  selection.position.y = 0.095;
  selection.visible = false;
  scene.add(selection);

  const planCamera = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 80);
  const eyeCamera = new THREE.PerspectiveCamera(46, 1, 0.05, 100);
  let camera = planCamera;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const templates = new Map();
  const instances = new Map();
  let thumbnails = {};
  let view = 'angle';
  let placementMode = false;
  let selected = null;
  let gesture = null;
  let disposed = false;
  let frame = 0;

  function draw() {
    frame = 0;
    if (!disposed) renderer.render(scene, camera);
  }
  function render() {
    if (!disposed && !frame) frame = requestAnimationFrame(draw);
  }

  const cameraPositions = { top: [0, 19, 0.001], angle: [11, 12, 16], front: [0, 5.8, 19] };
  function fitCamera() {
    const { width, height } = container.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    if (realistic && view !== 'top') {
      camera = eyeCamera;
      camera.aspect = width / height;
      const narrow = Math.max(1, Math.sqrt(1 / camera.aspect));
      const target = new THREE.Vector3(1.2, 0.35, -0.4);
      const offset = view === 'angle' ? new THREE.Vector3(2.2, 2.65, 5.3) : new THREE.Vector3(-0.7, 1.7, 5.5);
      camera.position.copy(target).add(offset.multiplyScalar(narrow));
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      render();
      return;
    }
    camera = planCamera;
    camera.position.fromArray(cameraPositions[view]);
    camera.up.set(0, view === 'top' ? 0 : 1, view === 'top' ? -1 : 0);
    camera.lookAt(0, view === 'top' ? 0 : 0.7, 0);
    camera.updateMatrixWorld();
    // Fit the actual courtyard volume to the available canvas in every view.
    const corners = [];
    for (const x of [-5.8, 5.8]) for (const y of [-0.3, 3.15]) for (const z of [-3.8, 3.8]) corners.push(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
    const bounds = new THREE.Box3().setFromPoints(corners);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const aspect = width / height;
    const halfHeight = Math.max(size.y / 2, size.x / (aspect * 2)) * 1.065;
    camera.left = center.x - halfHeight * aspect;
    camera.right = center.x + halfHeight * aspect;
    camera.top = center.y + halfHeight;
    camera.bottom = center.y - halfHeight;
    camera.updateProjectionMatrix();
    render();
  }

  function groundPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectPlane(ground, new THREE.Vector3());
  }
  function getPlacement(clientX, clientY) {
    const point = groundPoint(clientX, clientY);
    if (!point || Math.abs(point.x) > LIMIT_X || Math.abs(point.z) > LIMIT_Z) return null;
    return { x: point.x, z: point.z };
  }
  function hitObject(clientX, clientY) {
    groundPoint(clientX, clientY);
    objectsGroup.updateMatrixWorld(true);
    const hits = raycaster.intersectObjects(objectsGroup.children, true);
    for (const hit of hits) {
      let object = hit.object;
      while (object && object.parent !== objectsGroup) object = object.parent;
      if (object?.userData.instanceId) return object;
    }
    return null;
  }
  function updateSelection() {
    const object = instances.get(selected);
    selection.visible = Boolean(object);
    if (object) {
      selection.position.x = object.position.x;
      selection.position.z = object.position.z;
      selection.position.y = object.position.y + 0.095;
      const footprint = templates.get(object.userData.assetId)?.footprint || 1;
      const radius = Math.max(0.3, footprint * object.scale.x * 0.55);
      selection.scale.setScalar(radius);
    }
    render();
  }
  function cancelGesture() {
    if (!gesture) return;
    if (gesture.object) gesture.object.position.copy(gesture.startPosition);
    const pointerId = gesture.pointerId;
    gesture = null;
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    canvas.style.cursor = view === 'top' ? 'grab' : 'default';
    updateSelection();
  }
  function onPointerDown(event) {
    if (event.button !== 0 || gesture) return;
    canvas.focus({ preventScroll: true });
    const object = placementMode && view === 'top' ? null : hitObject(event.clientX, event.clientY);
    const point = groundPoint(event.clientX, event.clientY);
    gesture = {
      pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY,
      object, startPosition: object?.position.clone(), moved: false,
      offset: object && point ? object.position.clone().sub(point) : new THREE.Vector3(),
    };
    if (object) onSelect?.(object.userData.instanceId);
    canvas.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - gesture.clientX, event.clientY - gesture.clientY) > 5) gesture.moved = true;
    if (view !== 'top' || !gesture.object || !gesture.moved) return;
    const point = groundPoint(event.clientX, event.clientY);
    if (!point) return;
    gesture.object.position.x = clamp(point.x + gesture.offset.x, LIMIT_X - 0.16);
    gesture.object.position.z = clamp(point.z + gesture.offset.z, LIMIT_Z - 0.16);
    gesture.object.position.y = groundHeight(gesture.object.position.x, gesture.object.position.z);
    canvas.style.cursor = 'grabbing';
    updateSelection();
  }
  function onPointerUp(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const ended = gesture;
    gesture = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (ended.object && ended.moved && view === 'top') {
      const { x, z } = ended.object.position;
      if (Math.abs(x - ended.startPosition.x) > 0.0001 || Math.abs(z - ended.startPosition.z) > 0.0001) onMove?.(ended.object.userData.instanceId, { x, z });
    } else if (!ended.object && !ended.moved) {
      onSelect?.(null);
      const point = getPlacement(event.clientX, event.clientY);
      if (point && view === 'top') onPlace?.(point);
    }
    canvas.style.cursor = view === 'top' ? 'grab' : 'default';
    render();
  }
  const onKey = (event) => { if (event.key === 'Escape') cancelGesture(); };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', cancelGesture);
  canvas.addEventListener('lostpointercapture', cancelGesture);
  window.addEventListener('keydown', onKey);
  const resizeObserver = new ResizeObserver(fitCamera);
  resizeObserver.observe(container);
  fitCamera();

  async function loadAssets(assets) {
    const loader = new GLTFLoader();
    await Promise.all(assets.map(async (asset) => {
      if (templates.has(asset.id)) return;
      const gltf = await loader.loadAsync(asset.url);
      const model = gltf.scene;
      // Some source files have stale accessor bounds; measure their actual vertices.
      model.traverse((node) => {
        if (!node.isMesh) return;
        node.geometry.computeBoundingBox();
        node.geometry.computeBoundingSphere();
      });
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = asset.height ? asset.height / Math.max(size.y, 0.001) : (asset.scale || 1);
      model.position.set(-center.x * scale, -bounds.min.y * scale + (realistic ? 0 : 0.035), -center.z * scale);
      model.scale.setScalar(scale);
      if (realistic && asset.category === '景石') {
        model.scale.y *= 0.72;
        model.position.y = model.position.y * 0.72 - 0.035;
      }
      model.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
        if (realistic && asset.category === '植物') {
          for (const material of [node.material].flat()) prepareRealismFoliage(material);
        }
      });
      const wrapper = new THREE.Group();
      if (asset.cluster) {
        for (let i = 0; i < asset.cluster; i++) {
          const plant = new THREE.Group();
          plant.add(model.clone(true));
          const angle = i * 2.399, radius = i ? 0.15 + (i % 3) * 0.055 : 0;
          plant.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
          plant.rotation.y = angle;
          plant.scale.setScalar(asset.cluster === 3 ? 1 - i * 0.12 : 0.85 + (i % 3) * 0.08);
          wrapper.add(plant);
        }
      } else wrapper.add(model);
      const footprint = new THREE.Box3().setFromObject(wrapper).getSize(new THREE.Vector3());
      templates.set(asset.id, { model: wrapper, footprint: Math.max(footprint.x, footprint.z) });
    }));
    thumbnails = createThumbnails();
    onReady?.();
    render();
  }

  function createThumbnails() {
    const thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    thumbRenderer.setSize(256, 256);
    thumbRenderer.setPixelRatio(1);
    thumbRenderer.outputColorSpace = THREE.SRGBColorSpace;
    thumbRenderer.toneMapping = renderer.toneMapping;
    thumbRenderer.toneMappingExposure = renderer.toneMappingExposure;
    const thumbScene = new THREE.Scene();
    addLighting(thumbScene, false);
    const thumbCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 50);
    const result = {};
    for (const [id, template] of templates) {
      const model = template.model.clone(true);
      thumbScene.add(model);
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      thumbCamera.position.copy(center).add(new THREE.Vector3(4, 2.7, 5));
      thumbCamera.lookAt(center);
      thumbCamera.updateMatrixWorld();
      const projected = [];
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) projected.push(new THREE.Vector3(x, y, z).applyMatrix4(thumbCamera.matrixWorldInverse));
      const projectionSize = new THREE.Box3().setFromPoints(projected).getSize(new THREE.Vector3());
      const half = Math.max(projectionSize.x, projectionSize.y, size.y * 0.7) * 0.55;
      Object.assign(thumbCamera, { left: -half, right: half, top: half, bottom: -half });
      thumbCamera.updateProjectionMatrix();
      thumbRenderer.render(thumbScene, thumbCamera);
      result[id] = thumbRenderer.domElement.toDataURL('image/png');
      thumbScene.remove(model);
    }
    thumbRenderer.dispose();
    thumbRenderer.forceContextLoss();
    return result;
  }

  function sync(objects) {
    const ids = new Set(objects.map((object) => object.id));
    for (const [id, instance] of instances) {
      if (!ids.has(id)) {
        objectsGroup.remove(instance);
        instances.delete(id);
      }
    }
    for (const object of objects) {
      const template = templates.get(object.assetId);
      if (!template) continue;
      let instance = instances.get(object.id);
      if (instance && instance.userData.assetId !== object.assetId) {
        objectsGroup.remove(instance);
        instances.delete(object.id);
        instance = null;
      }
      if (!instance) {
        instance = template.model.clone(true);
        instance.userData = { instanceId: object.id, assetId: object.assetId };
        instances.set(object.id, instance);
        objectsGroup.add(instance);
      }
      instance.position.set(object.x, groundHeight(object.x, object.z), object.z);
      instance.rotation.y = object.rotation || 0;
      instance.scale.setScalar(object.scale || 1);
    }
    updateSelection();
  }

  function setView(nextView) {
    if (!cameraPositions[nextView]) return;
    cancelGesture();
    view = nextView;
    planCamera.zoom = eyeCamera.zoom = 1;
    canvas.style.cursor = view === 'top' ? 'grab' : 'default';
    fitCamera();
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', cancelGesture);
    canvas.removeEventListener('lostpointercapture', cancelGesture);
    window.removeEventListener('keydown', onKey);
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    const collect = (node) => {
      if (node.geometry) geometries.add(node.geometry);
      if (node.material) for (const material of [node.material].flat()) materials.add(material);
    };
    scene.traverse(collect);
    for (const { model } of templates.values()) model.traverse(collect);
    for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    geometries.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    textures.forEach((value) => value.dispose());
    realismEnvironment?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }

  return {
    loadAssets, sync, setView, getPlacement, dispose,
    getThumbnails: () => ({ ...thumbnails }),
    setPlacementMode(enabled) { placementMode = enabled; },
    setSelected(id) { selected = id; updateSelection(); },
    setGrid(visible) { grid.visible = visible; render(); },
    zoom(delta) { camera.zoom = THREE.MathUtils.clamp(camera.zoom + delta, 0.7, 2.2); camera.updateProjectionMatrix(); render(); },
    resetView() { camera.zoom = 1; fitCamera(); },
    capture() {
      const showSelection = selection.visible;
      const showGrid = grid.visible;
      selection.visible = grid.visible = false;
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/png');
      selection.visible = showSelection;
      grid.visible = showGrid;
      render();
      return url;
    },
  };
}
