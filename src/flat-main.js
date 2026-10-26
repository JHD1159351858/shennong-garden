import './flat-style.css';
import { createIcons, Sprout, Leaf, Undo2, Redo2, CircleCheck, Download, Copy, Trash2, MousePointer2, Image, ArrowUpRight, Plus } from 'lucide';
import { FLAT_ASSETS, FLAT_FAMILIES } from './flat-catalog.js';
import { FLAT_SCENES } from './flat-scenes.js';
import { activeFlatScene, loadFlatWorkspace, saveFlatWorkspace, changeFlatColor } from './flat-workspaces.js';
import { createStore } from './state.js';
import { createFlatGardenScene } from './flat-scene.js';

const icons = () => createIcons({ icons:{ Sprout, Leaf, Undo2, Redo2, CircleCheck, Download, Copy, Trash2, MousePointer2, Image, ArrowUpRight, Plus } });
const $ = selector => document.querySelector(selector);
const byId = id => FLAT_ASSETS.find(asset => asset.id === id);
const libraryColors = new Map(FLAT_FAMILIES.map(family=>[family.id,family.variants[0].id]));
const workspaces = new Map();
let currentScene = FLAT_SCENES[0], category = '全部', unsubscribe;
let restoreError = '', scene, selectedId = null, pendingAsset = null, ready = false, toastTimer;
try { currentScene = activeFlatScene(localStorage); } catch { restoreError = '浏览器未开放本机存储，作品暂不能自动保存。'; }
function workspace(definition) {
  if(!workspaces.has(definition.id)) workspaces.set(definition.id,loadFlatWorkspace(localStorage,definition));
  return workspaces.get(definition.id);
}
let store;
try { store=workspace(currentScene); }
catch { store=createStore(currentScene.objects);workspaces.set(currentScene.id,store);restoreError='本机作品无法读取，已显示示例花境；原存档尚未覆盖。'; }

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>$('#toast').classList.remove('show'),2800);
}
function persist(manual = false) {
  try {
    saveFlatWorkspace(localStorage,currentScene,store);
    $('#save-status').textContent = '已保存到本机';
    if(manual) toast(`${currentScene.name}已保存到本机`);
  } catch {
    $('#save-status').textContent = '尚未保存';
    toast('浏览器未能保存，请先导出作品图片');
  }
}
function swatch(asset, label, active, onClick) {
  const button=document.createElement('button');button.className='color-swatch';button.type='button';
  button.style.setProperty('--swatch',asset.swatch);button.title=asset.color;
  button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(active));
  button.addEventListener('click',onClick);return button;
}
function updateToolbar() {
  const object = store.objects.find(item=>item.id===selectedId);
  if(!object) selectedId = null;
  $('#selected-tools').hidden = !object;
  if(object) {
    $('#selected-name').textContent = byId(object.assetId).name;
    $('#scale').value = Math.round(object.scale*100);
    $('#scale-value').textContent = `${Math.round(object.scale*100)}%`;
    const asset=byId(object.assetId),family=FLAT_FAMILIES.find(item=>item.id===asset.family);
    const colors=$('#selected-colors');colors.replaceChildren();colors.hidden=family.variants.length<2;
    for(const variant of family.variants) colors.append(swatch(variant,`将选中植物改为${variant.name}`,variant.id===object.assetId,()=>{
      if(ready) changeFlatColor(store,selectedId,variant.id);
    }));
  }
  $('#undo').disabled = !ready || !store.canUndo;
  $('#redo').disabled = !ready || !store.canRedo;
  $('#object-count').textContent = store.objects.length;
  scene?.setSelected(selectedId);
}
function select(id) { selectedId=id; updateToolbar(); }
function cancelPlacement() {
  pendingAsset = null;
  scene?.setPlacementMode(false);
  document.querySelectorAll('.asset').forEach(button=>button.classList.remove('is-pending'));
  $('#instruction').textContent = '拖动调整位置 · 点选可改大小与花色';
}
function chooseAsset(id) {
  if(!ready) return;
  pendingAsset=id;
  scene.setPlacementMode(true);
  select(null);
  document.querySelectorAll('.asset').forEach(button=>button.classList.toggle('is-pending',button.dataset.asset===id));
  $('#instruction').textContent = `在庭院地面点击，放下${byId(id).name} · Esc 取消`;
}
function place(point) {
  if(!ready || !pendingAsset || !point) return;
  const id=store.add(pendingAsset,point.x,point.z);
  cancelPlacement(); select(id);
}
function startAssetDrag(event,asset) {
  if(!ready || event.button!==0) return;
  event.preventDefault();
  chooseAsset(asset.id);
  const startX=event.clientX,startY=event.clientY,target=event.currentTarget;
  const ghost=$('#drag-ghost');
  const image=document.createElement('img'); image.src=asset.url; ghost.replaceChildren(image);
  let moved=false;
  target.setPointerCapture(event.pointerId);
  function move(e) {
    if(e.pointerId!==event.pointerId) return;
    moved ||= Math.hypot(e.clientX-startX,e.clientY-startY)>6;
    if(moved) { ghost.hidden=false;ghost.style.left=`${e.clientX-55}px`;ghost.style.top=`${e.clientY-70}px`; }
  }
  function finish(e) {
    if(e.pointerId!==event.pointerId) return;
    ghost.hidden=true;
    target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',finish);target.removeEventListener('pointercancel',cancel);
    if(target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
    if(moved) { const point=scene.getPlacement(e.clientX,e.clientY);if(point) place(point);else cancelPlacement(); }
  }
  function cancel(e) { moved=false;finish(e);cancelPlacement(); }
  target.addEventListener('pointermove',move);target.addEventListener('pointerup',finish);target.addEventListener('pointercancel',cancel);
}
function renderAssets() {
  $('#assets').replaceChildren();
  for(const family of FLAT_FAMILIES.filter(item=>category==='全部'||item.category===category)) {
    const asset=byId(libraryColors.get(family.id));
    const card=document.createElement('article');card.className='asset-card';
    const button=document.createElement('button');button.className='asset';button.dataset.asset=asset.id;
    button.setAttribute('aria-label',`放置${asset.name}`);
    const preview=document.createElement('span');preview.className='asset-preview';
    const image=document.createElement('img');image.src=asset.url;image.alt=asset.name;image.draggable=false;preview.append(image);
    const name=document.createElement('span');name.className='asset-name';name.textContent=asset.name;
    const detail=document.createElement('span');detail.className='asset-detail';detail.textContent=asset.category+' · 可重复摆放';
    const add=document.createElement('span');add.className='asset-add';add.innerHTML='<i data-lucide="plus"></i>';
    button.append(preview,name,detail,add);
    button.addEventListener('pointerdown',event=>startAssetDrag(event,asset));
    button.addEventListener('click',event=>{if(event.detail===0) chooseAsset(asset.id);});
    card.append(button);
    if(family.variants.length>1) {
      const colors=document.createElement('div');colors.className='asset-colors';
      colors.setAttribute('aria-label',`${family.name}花色`);
      for(const variant of family.variants) colors.append(swatch(variant,`素材库选择${variant.name}`,variant.id===asset.id,()=>{
        libraryColors.set(family.id,variant.id);
        if(pendingAsset && byId(pendingAsset).family===family.id) cancelPlacement();
        renderAssets();
      }));
      card.append(colors);
    } else {
      const caption=document.createElement('span');caption.className='asset-color-label';caption.textContent=asset.color;card.append(caption);
    }
    $('#assets').append(card);
  }
  icons();
}

function renderFilters() {
  for(const name of ['全部','花卉','观叶','观赏草','景石','装饰']) {
    const button=document.createElement('button');button.textContent=name;button.className='category-chip';
    button.setAttribute('aria-pressed',String(name===category));
    button.addEventListener('click',()=>{
      category=name;cancelPlacement();
      for(const sibling of $('#categories').children) sibling.setAttribute('aria-pressed',String(sibling===button));
      renderAssets();
    });$('#categories').append(button);
  }
}
function updateSceneButtons() {
  for(const button of $('#scene-options').children) {
    button.setAttribute('aria-pressed',String(button.dataset.scene===currentScene.id));button.disabled=!ready;
  }
  $('#current-scene').textContent=currentScene.name;
  document.title=`庭间 · ${currentScene.name} · 二维`;
}
function bindStore() {
  unsubscribe?.();
  unsubscribe=store.subscribe(objects=>{scene.sync(objects);updateToolbar();persist();});
  scene.sync(store.objects);updateToolbar();
}
async function switchScene(definition) {
  if(!ready || definition.id===currentScene.id)return;
  ready=false;cancelPlacement();select(null);updateSceneButtons();
  $('#export').disabled=true;$('#save').disabled=true;$('#loading').hidden=false;
  $('#loading strong').textContent=`走进${definition.name}`;
  try {
    const nextStore=workspace(definition);
    if(!await scene.setBackground(definition.background))return;
    currentScene=definition;store=nextStore;bindStore();persist();
  } catch(error) { console.error(error);toast('场景暂未打开，已保留当前花境，请稍后重试'); }
  finally {
    ready=true;$('#loading').hidden=true;$('#export').disabled=false;$('#save').disabled=false;
    updateToolbar();updateSceneButtons();
  }
}
function renderScenes() {
  for(const definition of FLAT_SCENES) {
    const button=document.createElement('button');button.className='scene-option';button.dataset.scene=definition.id;
    button.setAttribute('aria-label',`切换到${definition.name}`);
    const image=document.createElement('img');image.src=definition.background;image.alt='';
    const text=document.createElement('span');const name=document.createElement('strong');name.textContent=definition.name;
    const detail=document.createElement('small');detail.textContent=definition.subtitle;text.append(name,detail);button.append(image,text);
    button.addEventListener('click',()=>switchScene(definition));$('#scene-options').append(button);
  }updateSceneButtons();
}

$('#undo').addEventListener('click',()=>store.undo());
$('#redo').addEventListener('click',()=>store.redo());
$('#save').addEventListener('click',()=>{if(ready) persist(true);});
$('#delete').addEventListener('click',()=>{if(ready&&selectedId)store.remove(selectedId);});
$('#duplicate').addEventListener('click',()=>{
  const object=store.objects.find(item=>item.id===selectedId);if(!ready||!object)return;
  const clone={...object,id:crypto.randomUUID(),x:Math.min(5.5,object.x+.45),z:Math.min(3.5,object.z+.25)};
  store.replace([...store.objects,clone]);select(clone.id);
});
$('#scale').addEventListener('input',event=>{
  const scale=Number(event.target.value)/100;
  $('#scale-value').textContent=`${Math.round(scale*100)}%`;
  scene.sync(store.objects.map(object=>object.id===selectedId?{...object,scale}:object));
});
$('#scale').addEventListener('change',event=>{if(selectedId)store.update(selectedId,{scale:Number(event.target.value)/100});});
$('#export').addEventListener('click',async()=>{
  if(!ready)return;
  try {
    const blob=await(await fetch(scene.capture())).blob();
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`庭间-${currentScene.name}.png`;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);toast('作品图片已生成，请查看浏览器下载');
  } catch { toast('图片导出失败，请稍后重试'); }
});
document.addEventListener('keydown',event=>{
  if(!ready)return;
  if(event.key==='Escape') {cancelPlacement();scene?.sync(store.objects);updateToolbar();}
  if(event.target.matches('input,textarea'))return;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z') {event.preventDefault();event.shiftKey?store.redo():store.undo();}
  if(event.key==='Delete'&&selectedId)store.remove(selectedId);
});
icons();
renderScenes();renderFilters();
async function start() {
  try {
    scene=await createFlatGardenScene($('#flat-scene'),{
      backgroundUrl:currentScene.background,
      onSelect:id=>{if(ready&&!pendingAsset)select(id);},
      onMove:(id,point)=>{if(ready)store.update(id,point);},
      onPlace:point=>place(point),
    });
    await scene.loadAssets(FLAT_ASSETS);
    scene.sync(store.objects);ready=true;
    renderAssets();bindStore();updateSceneButtons();
    $('#loading').hidden=true;$('#export').disabled=false;
    if(restoreError)toast(restoreError);else persist();
  } catch(error) {
    console.error(error);
    $('#loading strong').textContent='花境素材暂时未能打开';
    $('#loading-text').textContent='请确认本地服务正在运行，刷新后重试。';
  }
}
start();
