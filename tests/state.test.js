import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/state.js';

const plant = { id: 'plant-1', assetId: 'hydrangea', x: 1, z: -1, rotation: 0, scale: 1 };
const assets = ['hydrangea', 'rock'];
const saved = (objects, version = 1) => JSON.stringify({ version, objects });

test('new plants receive an identity and can be moved, rotated, scaled, and deleted', () => {
  const store = createStore();
  assert.deepEqual(store.objects, []);
  const id = store.add('hydrangea', 2, -1);
  assert.equal(typeof id, 'string');
  assert.deepEqual(store.objects, [{ id, assetId: 'hydrangea', x: 2, z: -1, rotation: 0, scale: 1 }]);
  store.update(id, { x: 3, z: 2, rotation: Math.PI / 2, scale: 1.2 });
  assert.deepEqual(store.objects[0], { id, assetId: 'hydrangea', x: 3, z: 2, rotation: Math.PI / 2, scale: 1.2 });
  store.remove(id);
  assert.deepEqual(store.objects, []);
});

test('position and size remain within the courtyard editing limits', () => {
  const store = createStore([plant]);
  store.update(plant.id, { x: 100, z: -100, scale: 3 });
  assert.deepEqual(store.objects[0], { ...plant, x: 5.5, z: -3.5, scale: 1.8 });
  store.update(plant.id, { x: -100, z: 100, scale: 0.1 });
  assert.deepEqual(store.objects[0], { ...plant, x: -5.5, z: 3.5, scale: 0.5 });
});

test('undo and redo restore a complete edit, and a new edit discards redo', () => {
  const store = createStore([plant]);
  store.update(plant.id, { x: 2, z: 2, rotation: 1, scale: 1.5 });
  assert.equal(store.canUndo, true);
  store.undo();
  assert.deepEqual(store.objects, [plant]);
  assert.equal(store.canUndo, false);
  assert.equal(store.canRedo, true);
  store.redo();
  assert.equal(store.objects[0].scale, 1.5);
  store.undo();
  store.remove(plant.id);
  assert.equal(store.canRedo, false);
});

test('unchanged updates and missing selections do not create history or notifications', () => {
  const store = createStore([plant]);
  let changes = 0;
  store.subscribe(() => { changes++; });
  store.update(plant.id, { x: plant.x });
  store.update('missing', { x: 2 });
  store.remove('missing');
  store.replace([{ ...plant }]);
  store.undo();
  store.redo();
  assert.equal(store.canUndo, false);
  assert.equal(changes, 0);
});

test('subscribers see updated history flags and can unsubscribe', () => {
  const store = createStore();
  const seen = [];
  const unsubscribe = store.subscribe(objects => seen.push([objects.length, store.canUndo, store.canRedo]));
  store.add('rock', 0, 0);
  store.undo();
  store.redo();
  unsubscribe();
  store.remove(store.objects[0].id);
  assert.deepEqual(seen, [[1, true, false], [0, false, true], [1, true, false]]);
});

test('the latest 50 changes can be undone without losing their redo history', () => {
  const store = createStore([plant]);
  for (let rotation = 1; rotation <= 55; rotation++) store.update(plant.id, { rotation });
  for (let i = 0; i < 60; i++) store.undo();
  assert.equal(store.objects[0].rotation, 5);
  assert.equal(store.canUndo, false);
  for (let i = 0; i < 50; i++) store.redo();
  assert.equal(store.objects[0].rotation, 55);
  assert.equal(store.canRedo, false);
});

test('saved JSON restores the same plants and the whole restore is one undo step', () => {
  const source = createStore([plant]);
  source.add('rock', -1, 2);
  const json = source.serialize();
  assert.deepEqual(Object.keys(JSON.parse(json)), ['version', 'objects']);
  assert.equal(JSON.parse(json).version, 1);
  const target = createStore();
  target.restore(json, new Set(assets));
  assert.deepEqual(target.objects, source.objects);
  target.undo();
  assert.deepEqual(target.objects, []);
  target.redo();
  assert.deepEqual(target.objects, source.objects);
});

test('invalid imports leave both the scene and history unchanged', () => {
  const store = createStore([plant]);
  const invalid = [
    '{broken',
    saved([plant], 2),
    saved({ plant }),
    saved([{ ...plant, assetId: 'unknown' }]),
    saved([plant, plant]),
    saved([{ ...plant, id: '' }]),
    saved([{ ...plant, x: null }]),
    saved([{ ...plant, z: '1' }]),
    saved([{ ...plant, rotation: null }]),
    saved([{ ...plant, scale: 0 }]),
    saved([{ ...plant, x: 200 }]),
    saved([plant, { ...plant, id: 'second', scale: null }]),
  ];
  for (const json of invalid) {
    assert.throws(() => store.restore(json, assets));
    assert.deepEqual(store.objects, [plant]);
    assert.equal(store.canUndo, false);
  }
});

test('initialization and replacement copy incoming objects', () => {
  const initial = [{ ...plant }];
  const store = createStore(initial);
  initial[0].x = 5;
  assert.equal(store.objects[0].x, 1);
  const replacement = [{ ...plant, x: 2 }];
  store.replace(replacement);
  replacement[0].x = 4;
  assert.equal(store.objects[0].x, 2);
  store.undo();
  assert.equal(store.objects[0].x, 1);
});
