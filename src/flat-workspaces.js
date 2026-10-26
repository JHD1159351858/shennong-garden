import { createStore } from './state.js';
import { FLAT_ASSETS } from './flat-catalog.js';
import { FLAT_SCENES, ACTIVE_SCENE_KEY } from './flat-scenes.js';

export function activeFlatScene(storage) {
  const saved = storage.getItem(ACTIVE_SCENE_KEY);
  return FLAT_SCENES.find(scene=>scene.id===saved) || FLAT_SCENES[0];
}

export function loadFlatWorkspace(storage, definition) {
  const saved = storage.getItem(definition.storageKey);
  if (!saved) return createStore(definition.objects);
  const restored = createStore();
  restored.restore(saved, FLAT_ASSETS.map(asset=>asset.id));
  return createStore(restored.objects);
}

export function saveFlatWorkspace(storage, definition, store) {
  storage.setItem(definition.storageKey, store.serialize());
  storage.setItem(ACTIVE_SCENE_KEY, definition.id);
}

export function changeFlatColor(store, objectId, assetId) {
  const object = store.objects.find(item=>item.id===objectId);
  const current = FLAT_ASSETS.find(asset=>asset.id===object?.assetId);
  const next = FLAT_ASSETS.find(asset=>asset.id===assetId);
  if (!current || current.family!==next?.family) return false;
  return store.replace(store.objects.map(item=>item.id===objectId?{...item,assetId}:item));
}
