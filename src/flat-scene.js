const WIDTH = 1600;
const HEIGHT = 1100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`无法载入二维素材：${url}`));
    image.src = url;
  });
}

function prepareCutout(image) {
  const source = document.createElement('canvas');
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const context = source.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, source.width, source.height).data;
  const alpha = new Uint8Array(source.width * source.height);
  let left = source.width, top = source.height, right = 0, bottom = 0;
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const value = pixels[(y * source.width + x) * 4 + 3];
      alpha[y * source.width + x] = value;
      if (value < 12) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (left > right) throw new Error('植物素材没有可见像素。');
  const crop = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = '#253123';
  context.fillRect(0, 0, source.width, source.height);
  return { image, shadow: source, alpha, crop };
}

function project(x, z) {
  const depth = (z + 3.5) / 7;
  return {
    x: WIDTH * (.5 + x / 11 * (.66 + .34 * depth)),
    y: HEIGHT * (.4 + .54 * depth),
    perspective: .55 + .45 * depth,
  };
}

function unproject(x, y) {
  const depth = (y / HEIGHT - .4) / .54;
  return { x: (x / WIDTH - .5) * 11 / (.66 + .34 * depth), z: depth * 7 - 3.5 };
}

export async function createFlatGardenScene(container, { onSelect, onMove, onPlace, backgroundUrl = '/assets/flat/background.png' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'flat-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '固定斜视角二维庭院，可拖动植物调整位置');
  container.append(canvas);
  const context = canvas.getContext('2d');
  const templates = new Map();
  const backgrounds = new Map();
  const cutouts = new Map();
  let background, objects = [], selected = null, placementMode = false, gesture = null;
  let frame = 0, disposed = false, fit = { x: 0, y: 0, scale: 1 }, ratio = 1;
  let backgroundRequest = 0;

  async function setBackground(url) {
    const request = ++backgroundRequest;
    if (!backgrounds.has(url)) {
      backgrounds.set(url, loadImage(url).catch(error => {
        backgrounds.delete(url);
        throw error;
      }));
    }
    const next = await backgrounds.get(url);
    if (disposed || request !== backgroundRequest) return false;
    cancelGesture();
    selected = null;
    background = next;
    render();
    return true;
  }

  function orderedObjects() {
    return [...objects].sort((a, b) => a.z - b.z);
  }

  function bounds(object) {
    const asset = templates.get(object.assetId);
    if (!asset) return null;
    const root = project(object.x, object.z);
    const width = WIDTH * asset.width * root.perspective * object.scale;
    const height = width * asset.crop.height / asset.crop.width;
    return { asset, root, x: root.x - width / 2, y: root.y - height, width, height };
  }

  function drawShadow(target, box) {
    const { asset, root, width, height } = box;
    const { crop } = asset;
    target.save();
    target.translate(root.x, root.y);
    target.transform(.78, 0, -.24, -.13, width * .025, 1);
    target.globalAlpha = .14;
    target.filter = `blur(${Math.max(2, width * .018)}px)`;
    target.drawImage(asset.shadow, crop.x, crop.y, crop.width, crop.height, -width / 2, -height, width, height);
    target.restore();
    target.save();
    target.translate(root.x, root.y - 1);
    target.scale(width * .31, Math.max(7, width * .055));
    const contact = target.createRadialGradient(0, 0, 0, 0, 0, 1);
    contact.addColorStop(0, 'rgba(28,35,23,.32)');
    contact.addColorStop(.45, 'rgba(28,35,23,.17)');
    contact.addColorStop(1, 'rgba(28,35,23,0)');
    target.fillStyle = contact;
    target.fillRect(-1, -1, 2, 2);
    target.restore();
  }

  function paint(target, selectionVisible) {
    target.fillStyle = '#e7e9df';
    target.fillRect(0, 0, WIDTH, HEIGHT);
    if (background) target.drawImage(background, 0, 0, WIDTH, HEIGHT);
    const boxes = orderedObjects().map(object => ({ object, box: bounds(object) })).filter(item => item.box);
    for (const { box } of boxes) drawShadow(target, box);
    for (const { box } of boxes) {
      const { asset, x, y, width, height } = box;
      const { crop } = asset;
      target.drawImage(asset.image, crop.x, crop.y, crop.width, crop.height, x, y, width, height);
    }
    if (selectionVisible) {
      const chosen = boxes.find(item => item.object.id === selected)?.box;
      if (chosen) {
        target.save();
        target.strokeStyle = '#fff8dc';
        target.lineWidth = 2 / fit.scale;
        target.setLineDash([7 / fit.scale, 4 / fit.scale]);
        target.strokeRect(chosen.x - 5, chosen.y - 5, chosen.width + 10, chosen.height + 10);
        target.restore();
      }
    }
  }

  function draw() {
    frame = 0;
    if (disposed) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#e7e9df';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(ratio * fit.scale, 0, 0, ratio * fit.scale, ratio * fit.x, ratio * fit.y);
    context.save();
    context.beginPath(); context.rect(0, 0, WIDTH, HEIGHT); context.clip();
    paint(context, true);
    context.restore();
  }

  function render() {
    if (!disposed && !frame) frame = requestAnimationFrame(draw);
  }

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    fit.scale = Math.min(width / WIDTH, height / HEIGHT);
    fit.x = (width - WIDTH * fit.scale) / 2;
    fit.y = (height - HEIGHT * fit.scale) / 2;
    render();
  }

  function scenePoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: (clientX - rect.left - fit.x) / fit.scale, y: (clientY - rect.top - fit.y) / fit.scale };
  }

  function getPlacement(clientX, clientY) {
    const point = scenePoint(clientX, clientY);
    if (point.x < 0 || point.x > WIDTH || point.y < HEIGHT * .38 || point.y > HEIGHT * .96) return null;
    const position = unproject(point.x, point.y);
    if (Math.abs(position.x) > 5.5 || Math.abs(position.z) > 3.5) return null;
    return position;
  }

  function hitObject(point) {
    const ordered = orderedObjects();
    for (let i = ordered.length - 1; i >= 0; i--) {
      const object = ordered[i], box = bounds(object);
      if (!box || point.x < box.x || point.x >= box.x + box.width || point.y < box.y || point.y >= box.y + box.height) continue;
      const px = Math.floor(box.asset.crop.x + (point.x - box.x) / box.width * box.asset.crop.width);
      const py = Math.floor(box.asset.crop.y + (point.y - box.y) / box.height * box.asset.crop.height);
      if (box.asset.alpha[py * box.asset.image.naturalWidth + px] >= 24) return object;
    }
    return null;
  }

  function cancelGesture() {
    if (!gesture) return;
    const { pointerId, id, original } = gesture;
    const object = objects.find(item => item.id === id);
    if (object && original) Object.assign(object, original);
    gesture = null;
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    canvas.style.cursor = placementMode ? 'crosshair' : 'grab';
    render();
  }

  function pointerDown(event) {
    if (event.button !== 0 || gesture) return;
    canvas.focus({ preventScroll: true });
    const point = scenePoint(event.clientX, event.clientY);
    const object = placementMode ? null : hitObject(point);
    const root = object && project(object.x, object.z);
    gesture = { pointerId: event.pointerId, id: object?.id, original: object && { x: object.x, z: object.z },
      offset: root && { x: root.x - point.x, y: root.y - point.y },
      clientX: event.clientX, clientY: event.clientY, moved: false };
    onSelect?.(object?.id || null);
    canvas.setPointerCapture(event.pointerId);
  }

  function pointerMove(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - gesture.clientX, event.clientY - gesture.clientY) > 4) gesture.moved = true;
    const object = objects.find(item => item.id === gesture.id);
    if (!object || !gesture.moved) return;
    const point = scenePoint(event.clientX, event.clientY);
    const position = unproject(point.x + gesture.offset.x, clamp(point.y + gesture.offset.y, HEIGHT * .4, HEIGHT * .94));
    object.x = clamp(position.x, -5.5, 5.5);
    object.z = clamp(position.z, -3.5, 3.5);
    canvas.style.cursor = 'grabbing';
    render();
  }

  function pointerUp(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const ended = gesture;
    gesture = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    const object = objects.find(item => item.id === ended.id);
    if (object && ended.moved) {
      if (Math.abs(object.x - ended.original.x) > .0001 || Math.abs(object.z - ended.original.z) > .0001) onMove?.(object.id, { x: object.x, z: object.z });
    } else if (!object && !ended.moved) {
      const point = getPlacement(event.clientX, event.clientY);
      if (point) onPlace?.(point);
    }
    canvas.style.cursor = placementMode ? 'crosshair' : 'grab';
    render();
  }

  const onKey = event => { if (event.key === 'Escape') cancelGesture(); };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', cancelGesture);
  canvas.addEventListener('lostpointercapture', cancelGesture);
  window.addEventListener('keydown', onKey);
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  await setBackground(backgroundUrl);

  return {
    async loadAssets(assets) {
      await Promise.all(assets.map(async asset => {
        if (!cutouts.has(asset.url)) {
          cutouts.set(asset.url, loadImage(asset.url).then(prepareCutout).catch(error => {
            cutouts.delete(asset.url);
            throw error;
          }));
        }
        const cutout = await cutouts.get(asset.url);
        if (!disposed) templates.set(asset.id, { ...asset, ...cutout });
      }));
      render();
    },
    setBackground,
    sync(nextObjects) { objects = nextObjects.map(object => ({ ...object })); render(); },
    setSelected(id) { selected = id; render(); },
    getPlacement,
    setPlacementMode(value) { placementMode = value; canvas.style.cursor = value ? 'crosshair' : 'grab'; },
    capture() {
      const exported = document.createElement('canvas');
      exported.width = WIDTH; exported.height = HEIGHT;
      paint(exported.getContext('2d'), false);
      return exported.toDataURL('image/png');
    },
    dispose() {
      disposed = true;
      cancelGesture(); cancelAnimationFrame(frame); observer.disconnect();
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', cancelGesture);
      canvas.removeEventListener('lostpointercapture', cancelGesture);
      window.removeEventListener('keydown', onKey);
      templates.clear(); backgrounds.clear(); cutouts.clear(); canvas.remove();
    },
  };
}
