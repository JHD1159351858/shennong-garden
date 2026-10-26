import test from 'node:test';
import assert from 'node:assert/strict';
import { FLAT_SCENES, ACTIVE_SCENE_KEY } from '../src/flat-scenes.js';
import { activeFlatScene, loadFlatWorkspace, saveFlatWorkspace, changeFlatColor } from '../src/flat-workspaces.js';

function memoryStorage(entries=[]) {
  const values=new Map(entries);
  return { getItem:key=>values.get(key)??null, setItem:(key,value)=>values.set(key,value) };
}
const originalPlant={id:'my-existing-plant',assetId:'flat-hydrangea',x:2,z:-1,scale:1.25,rotation:0};
const originalSave=JSON.stringify({version:1,objects:[originalPlant]});

test('the existing 2D save restores without migration or changing the 3D save',()=>{
  const storage=memoryStorage([['tingjian-flat-v1',originalSave],['tingjian-v1','original 3D save']]);
  const definition=activeFlatScene(storage);
  const store=loadFlatWorkspace(storage,definition);
  assert.equal(definition.id,'japanese');
  assert.deepEqual(store.objects,[originalPlant]);
  assert.equal(store.canUndo,false);
  saveFlatWorkspace(storage,definition,store);
  assert.deepEqual(JSON.parse(storage.getItem('tingjian-flat-v1')),JSON.parse(originalSave));
  assert.equal(storage.getItem('tingjian-v1'),'original 3D save');
});

test('switching workspaces retains each layout and remembers the most recently saved scene',()=>{
  const storage=memoryStorage([['tingjian-flat-v1',originalSave]]);
  const japanese=loadFlatWorkspace(storage,FLAT_SCENES[0]);
  japanese.update(originalPlant.id,{x:-3});
  saveFlatWorkspace(storage,FLAT_SCENES[0],japanese);
  const modern=loadFlatWorkspace(storage,FLAT_SCENES[1]);
  const removed=modern.objects[0].id;
  modern.remove(removed);
  saveFlatWorkspace(storage,FLAT_SCENES[1],modern);
  assert.equal(activeFlatScene(storage).id,'modern');
  assert.deepEqual(loadFlatWorkspace(storage,FLAT_SCENES[0]).objects,[{...originalPlant,x:-3}]);
  assert.deepEqual(loadFlatWorkspace(storage,FLAT_SCENES[1]).objects,modern.objects);
  assert.equal(loadFlatWorkspace(storage,FLAT_SCENES[1]).objects.some(item=>item.id===removed),false);
});

test('flower color changes preserve placement and size, support undo/redo, and survive reload',()=>{
  const storage=memoryStorage([['tingjian-flat-v1',originalSave]]);
  const store=loadFlatWorkspace(storage,FLAT_SCENES[0]);
  assert.equal(changeFlatColor(store,originalPlant.id,'flat-hydrangea-pink'),true);
  assert.deepEqual(store.objects,[{...originalPlant,assetId:'flat-hydrangea-pink'}]);
  store.undo();assert.deepEqual(store.objects,[originalPlant]);
  store.redo();
  saveFlatWorkspace(storage,FLAT_SCENES[0],store);
  assert.deepEqual(loadFlatWorkspace(storage,FLAT_SCENES[0]).objects,store.objects);
  assert.equal(changeFlatColor(store,originalPlant.id,'flat-bench'),false);
  assert.equal(store.objects[0].assetId,'flat-hydrangea-pink');
});

test('all new scene examples survive persistence validation and an unknown scene falls back safely',()=>{
  const storage=memoryStorage([[ACTIVE_SCENE_KEY,'missing-scene']]);
  assert.equal(activeFlatScene(storage).id,'japanese');
  for(const definition of FLAT_SCENES) {
    const source=loadFlatWorkspace(storage,definition);
    saveFlatWorkspace(storage,definition,source);
    assert.deepEqual(loadFlatWorkspace(storage,definition).objects,source.objects);
  }
});
