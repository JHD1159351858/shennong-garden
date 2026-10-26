const copy = objects => objects.map(({ id, assetId, x, z, rotation, scale }) => ({ id, assetId, x, z, rotation, scale }));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createStore(initialObjects = []) {
  let objects = copy(initialObjects);
  const past = [];
  const future = [];
  const listeners = new Set();
  const notify = () => listeners.forEach(listener => listener(objects));

  function replace(nextObjects) {
    const next = copy(nextObjects);
    if (JSON.stringify(next) === JSON.stringify(objects)) return false;
    past.push(objects);
    if (past.length > 50) past.shift();
    objects = next;
    future.length = 0;
    notify();
    return true;
  }

  return {
    get objects() { return objects; },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    add(assetId, x, z) {
      const id = crypto.randomUUID();
      replace([...objects, { id, assetId, x: clamp(x, -5.5, 5.5), z: clamp(z, -3.5, 3.5), rotation: 0, scale: 1 }]);
      return id;
    },
    update(id, patch) {
      return replace(objects.map(object => {
        if (object.id !== id) return object;
        const next = { ...object };
        for (const key of ['x', 'z', 'rotation', 'scale']) {
          if (patch[key] === undefined) continue;
          if (!Number.isFinite(patch[key])) throw new Error('位置、旋转角和大小必须是有效数字。');
          next[key] = patch[key];
        }
        next.x = clamp(next.x, -5.5, 5.5);
        next.z = clamp(next.z, -3.5, 3.5);
        next.scale = clamp(next.scale, 0.5, 1.8);
        return next;
      }));
    },
    remove(id) {
      return replace(objects.filter(object => object.id !== id));
    },
    replace,
    undo() {
      if (!past.length) return false;
      future.push(objects);
      objects = past.pop();
      notify();
      return true;
    },
    redo() {
      if (!future.length) return false;
      past.push(objects);
      objects = future.pop();
      notify();
      return true;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    serialize() {
      return JSON.stringify({ version: 1, objects });
    },
    restore(json, validAssetIds) {
      const document = JSON.parse(json);
      if (!document || document.version !== 1 || !Array.isArray(document.objects)) {
        throw new Error('作品文件格式或版本不支持。');
      }
      const assets = new Set(validAssetIds);
      const ids = new Set();
      for (const object of document.objects) {
        if (!object || typeof object.id !== 'string' || !object.id.trim() || ids.has(object.id)) {
          throw new Error('作品中的素材编号无效或重复。');
        }
        if (!assets.has(object.assetId)) throw new Error('作品包含当前素材库不支持的素材。');
        if (!['x', 'z', 'rotation', 'scale'].every(key => Number.isFinite(object[key])) ||
          Math.abs(object.x) > 5.5 || Math.abs(object.z) > 3.5 || object.scale < 0.5 || object.scale > 1.8) {
          throw new Error('作品中的位置或大小超出有效范围。');
        }
        ids.add(object.id);
      }
      return replace(document.objects);
    },
  };
}
