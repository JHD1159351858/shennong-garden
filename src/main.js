import './style.css';
import { createIcons, Sprout, Leaf, Undo2, Redo2, CircleCheck, Upload, LayoutGrid, Box, Mountain, Grid2x2, CircleHelp, Minus, Plus, Copy, Trash2, MousePointer2, Search } from 'lucide';
import { ASSETS as ORIGINAL_ASSETS } from './catalog.js';
import { REALISM_ASSETS } from './realism-catalog.js';
import { createStore } from './state.js';
import { createGardenScene } from './garden-scene.js';

const iconSet = { Sprout, Leaf, Undo2, Redo2, CircleCheck, Upload, LayoutGrid, Box, Mountain, Grid2x2, CircleHelp, Minus, Plus, Copy, Trash2, MousePointer2, Search };
const icons = () => createIcons({ icons: iconSet });
const $ = selector => document.querySelector(selector);
const realism = new URLSearchParams(location.search).get('study') === 'realism';
const corner = realism && new URLSearchParams(location.search).get('layout') === 'corner';
const ASSETS = realism ? REALISM_ASSETS : ORIGINAL_ASSETS;
const storageKey = corner ? 'tingjian-realism-corner-v1' : realism ? 'tingjian-realism-v1' : 'tingjian-garden-v1';
let scene, selectedId = null, pendingAsset = null, currentView = 'angle', category = '全部', thumbnails = {}, toastTimer;
let ready = false, gridVisible = false;
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2800);
}

function initialGarden() {
  if (realism) return initialRealismGarden();
  const placements = [
    ['tree-maple',3.35,-1.9,1],['tree-small',-2.55,-2.45,.85],
    ['bush-flower',1.5,-2.35,1],['bush-flower',3.65,.25,.85],['bush-flower',-2.9,.1,.8],
    ['fern',-2.8,1.3,.9],['fern',2.3,1.35,1],['fern',4.5,-1.55,.9],
    ['grass',2.55,-.4,1],['grass',-2.4,-1.4,.85],['grass',3.8,2.5,.85],
    ['flowers',1.2,1.5,1],['flowers',1.5,2.6,.8],['flowers',2.6,2.4,.9],['flowers',-.2,-2.4,.75],
    ['rock',2.9,.6,1],['rock',-2.3,2.5,.8],['rock',4.3,-2.6,.8],
    ['lantern',-4.35,1.6,.8]
  ];
  return placements.filter(([assetId]) => ASSETS.some(a => a.id === assetId)).map(([assetId,x,z,scale],i) => ({id:`initial-${i}`,assetId,x,z,scale,rotation:(i%4)*.7}));
}
function initialRealismGarden() {
  const [fern, shrub, flower, rock] = ASSETS.map(asset => asset.id);
  if (corner) {
    const placements = [
      [rock,1.5,.05,1.2],[rock,3.25,-1.4,.9],[rock,.75,1.9,.65],[rock,-2.65,.2,.85],
      [shrub,-.2,-2.7,1.3],[shrub,.75,-2.55,1.45],[shrub,1.8,-2.7,1.3],
      [shrub,2.85,-2.6,1.5],[shrub,3.85,-2.65,1.25],[shrub,4.7,-2.45,1.4],
      [shrub,3.8,-1.4,1.1],[shrub,4.8,-1.2,.95],[shrub,2.1,-1.25,.85],
      [shrub,3.85,.1,.85],[shrub,4.75,.55,1.05],[shrub,4.3,1.55,.8],
      [shrub,-2.85,-2.6,1.2],[shrub,-1.9,-2.75,.95],[shrub,-3.1,-1.3,.8],
      [fern,.55,-1.35,.95],[fern,1.25,-.95,.8],[fern,2.6,-.4,1.15],
      [fern,3.25,.55,1.0],[fern,3.8,1.25,.95],[fern,2.35,1.1,.85],
      [fern,1.5,1.15,.7],[fern,2.75,2.05,.85],[fern,4.8,2.6,.9],
      [fern,-2.8,.95,1.0],[fern,-2.7,-.8,.85],[fern,-2.85,2.5,.8],
      [flower,.25,-1.85,.85],[flower,.75,-.45,.65],[flower,1.05,.65,.65],
      [flower,1.65,1.7,.7],[flower,2.15,2.55,.8],[flower,3.25,2.7,.85],
      [flower,3.45,1.6,.65],[flower,4.5,1.0,.75],[flower,2.75,-1.6,.75],
      [flower,-2.3,1.7,.75],[flower,-2.15,-.6,.7],[flower,-1.4,-2.55,.75],
      [fern,4.7,-.35,.9],[fern,3.65,-.55,.85],[flower,1.25,2.6,.65]
    ];
    return placements.map(([assetId,x,z,scale],i)=>({id:`corner-${i}`,assetId,x,z,scale,rotation:(i*2.399)%6.283}));
  }
  const placements = [
    [rock,1.6,.2,1.3],[rock,3.6,-1.5,.9],[rock,-2.6,.1,.8],
    [shrub,2.1,-2.2,1.25],[shrub,3.3,-2.15,1.1],[shrub,4.15,-1.75,.9],
    [shrub,-2.6,-2.45,.95],[shrub,-1.8,-2.6,.8],
    [fern,.8,-.6,1.1],[fern,2.7,-.4,.95],[fern,3.6,.2,1.1],[fern,4.3,-.8,.8],
    [fern,1.5,1.4,.85],[fern,3.1,1.25,.8],[fern,-2.7,1.15,.85],[fern,-2.8,-1,.9],
    [flower,1,-1.8,1.1],[flower,.1,-2.2,.95],[flower,3.15,-1.25,.9],
    [flower,2.3,.95,.85],[flower,4,1.5,1],[flower,3.8,2.3,.8],
    [flower,-2.15,.75,.9],[flower,-1.8,-1.6,.8],[flower,2.2,2.1,.8],
    [fern,4.45,1.7,.9],[shrub,4.6,-2.5,1],[flower,4.6,.7,.9]
  ];
  return placements.map(([assetId,x,z,scale],i)=>({id:`realism-${i}`,assetId,x,z,scale,rotation:(i*2.399)%6.283}));
}
let store = createStore(initialGarden());
let restoreError = '';
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    const validator = createStore();
    validator.restore(saved, ASSETS.map(a => a.id));
    store = createStore(validator.objects);
  }
} catch { restoreError = '本机作品无法读取，已载入示例庭院。'; }

function persist(manual = false) {
  try {
    localStorage.setItem(storageKey,store.serialize());
    $('#save-status').textContent = '已保存到本机';
    if(manual) toast('庭院已保存到本机');
  } catch {
    $('#save-status').textContent = '尚未保存';
    toast('浏览器未能保存，建议先导出作品图片');
  }
}
function updateToolbar() {
  const object = store.objects.find(o => o.id === selectedId);
  if (!object) selectedId = null;
  $('#selected-tools').hidden = !object;
  if (object) {
    $('#selected-name').textContent = ASSETS.find(a => a.id === object.assetId)?.name || '素材';
    const angle = Math.round(((object.rotation*180/Math.PI)%360+360)%360);
    $('#rotation').value = angle;
    $('#rotation-value').textContent = `${angle}°`;
    $('#scale').value = Math.round(object.scale*100);
    $('#scale-value').textContent = `${Math.round(object.scale*100)}%`;
  }
  $('#undo').disabled = !store.canUndo;
  $('#redo').disabled = !store.canRedo;
  $('#object-count').textContent = store.objects.length;
  scene?.setSelected(selectedId);
}
function select(id) { selectedId = id; updateToolbar(); }
function setView(view) {
  if(!ready) return;
  currentView = view;
  $('.garden').dataset.view = view;
  scene.setView(view);
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active',button.dataset.view === view);
    button.setAttribute('aria-pressed',String(button.dataset.view === view));
  });
  const hints = {top:'拖动植物，找到它最合适的位置。',angle:'换个角度，看看你的植物组合。',front:'从庭院一侧，感受植物的高低层次。'};
  $('#view-hint').textContent = hints[view];
  $('#instruction').textContent = view === 'top' ? '拖动植物调整位置 · 点空白处取消选择' : '切换到俯视，即可拖动植物';
  if(view !== 'top') cancelPlacement();
}
function cancelPlacement() {
  pendingAsset = null;
  scene?.setPlacementMode(false);
  document.querySelectorAll('.asset').forEach(b => b.classList.remove('is-pending'));
  if(currentView==='top') $('#instruction').textContent = '拖动植物调整位置 · 点空白处取消选择';
}
function chooseAsset(id) {
  if(!ready) return;
  setView('top');
  pendingAsset = id;
  scene.setPlacementMode(true);
  select(null);
  document.querySelectorAll('.asset').forEach(b => b.classList.toggle('is-pending', b.dataset.asset === id));
  $('#instruction').textContent = `在庭院内点击，放下${ASSETS.find(a => a.id===id).name} · Esc 取消`;
}
function place(point) {
  if(!pendingAsset || !point || currentView !== 'top') return;
  const id=store.add(pendingAsset,point.x,point.z);
  cancelPlacement(); select(id);
}
function renderAssets() {
  const search = $('#search').value.trim();
  const matches = ASSETS.filter(a => (category==='全部'||a.category===category) && `${a.name}${a.description}`.includes(search));
  $('#assets').replaceChildren();
  $('#no-results').hidden=matches.length>0;
  matches.forEach(asset => {
    const button=document.createElement('button');
    button.className='asset'; button.dataset.asset=asset.id;
    button.setAttribute('aria-label',`放置${asset.name}`); button.title=asset.description;
    const preview=document.createElement('span'); preview.className='asset-preview';
    const img=document.createElement('img'); img.src=thumbnails[asset.id];img.alt=asset.name;img.draggable=false;preview.append(img);
    const name=document.createElement('span');name.className='asset-name';name.textContent=asset.name;
    const type=document.createElement('span');type.className='asset-type';type.textContent=asset.category+' · 可重复摆放';
    const plus=document.createElement('span');plus.className='asset-add';plus.innerHTML='<i data-lucide="plus"></i>';
    button.append(preview,name,type,plus);
    button.addEventListener('pointerdown',event=>startAssetDrag(event,asset));
    button.addEventListener('click',event=>{ if(event.detail===0) chooseAsset(asset.id); });
    $('#assets').append(button);
  });
  icons();
}
function startAssetDrag(event,asset) {
  if(!ready||event.button!==0) return;
  event.preventDefault();
  chooseAsset(asset.id);
  const startX=event.clientX,startY=event.clientY;let moved=false;
  const ghost=$('#drag-ghost');
  ghost.replaceChildren();const img=document.createElement('img');img.src=thumbnails[asset.id];ghost.append(img);
  const target=event.currentTarget;
  target.setPointerCapture(event.pointerId);
  function move(e){
    if(e.pointerId!==event.pointerId) return;
    moved ||= Math.hypot(e.clientX-startX,e.clientY-startY)>6;
    if(moved){ghost.hidden=false;ghost.style.left=`${e.clientX-45}px`;ghost.style.top=`${e.clientY-55}px`;}
  }
  function finish(e){
    if(e.pointerId!==event.pointerId) return;
    ghost.hidden=true;target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',finish);target.removeEventListener('pointercancel',cancel);
    if(target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
    if(moved){const p=scene.getPlacement(e.clientX,e.clientY);if(p) place(p);else cancelPlacement();}
  }
  function cancel(e){moved=false;finish(e);cancelPlacement();}
  target.addEventListener('pointermove',move);target.addEventListener('pointerup',finish);target.addEventListener('pointercancel',cancel);
}

icons();
$('#study-switch').href = corner ? './?study=realism' : './?study=realism&layout=corner';
$('#study-switch').textContent = corner ? '之前的布局' : '近景样板';
if (realism) {
  document.body.classList.add('realism-study');
  document.title = corner ? '庭间 · 苔石边的花境' : '庭间 · 写实花境验证';
  $('.brand').href = './';
  $('.project-title > span').textContent = corner ? '苔石边的花境' : '雨后的花境一角';
  $('.edition').textContent = corner ? '近景样板' : '写实验证';
  $('.scene-heading h1').textContent = '走近一点，看看自然。';
  $('.library-heading h2').textContent = '花境的四种笔触';
  $('.asset-total').textContent = '04';
  $('.library-footer p').textContent = '3 种植物 · 1 种景石 · 独立存档';
  $('[data-category="装饰"]').hidden = true;
}
document.querySelectorAll('button[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{
  category=b.dataset.category;
  document.querySelectorAll('[data-category]').forEach(x=>x.classList.toggle('active',x===b));
  renderAssets();
}));
$('#search').addEventListener('input',()=>{if(ready)renderAssets();});
$('#undo').addEventListener('click',()=>store.undo());$('#redo').addEventListener('click',()=>store.redo());
$('#save').addEventListener('click',()=>persist(true));
$('#grid').addEventListener('click',()=>{gridVisible=!gridVisible;scene?.setGrid(gridVisible);$('#grid').setAttribute('aria-pressed',String(gridVisible));});
$('#zoom-in').addEventListener('click',()=>scene?.zoom(.15));$('#zoom-out').addEventListener('click',()=>scene?.zoom(-.15));
$('#fit').addEventListener('click',()=>scene?.resetView());
$('#delete').addEventListener('click',()=>{if(selectedId)store.remove(selectedId);});
$('#duplicate').addEventListener('click',()=>{
  const object=store.objects.find(o=>o.id===selectedId);if(!object)return;
  const clone={...object,id:crypto.randomUUID(),x:Math.min(5.5,object.x+.5),z:Math.min(3.5,object.z+.4)};
  store.replace([...store.objects,clone]);select(clone.id);toast('已复制，可在俯视下拖动');
});
for(const [id,key,convert] of [['rotation','rotation',v=>v*Math.PI/180],['scale','scale',v=>v/100]]){
  $(`#${id}`).addEventListener('input',e=>{
    const value=Number(e.target.value);$(`#${id}-value`).textContent=`${value}${id==='rotation'?'°':'%'}`;
    scene.sync(store.objects.map(o=>o.id===selectedId?{...o,[key]:convert(value)}:o));scene.setSelected(selectedId);
  });
  $(`#${id}`).addEventListener('change',e=>{if(selectedId)store.update(selectedId,{[key]:convert(Number(e.target.value))});});
}
$('#export').addEventListener('click',async()=>{
  if(!ready)return;
  try{
    const blob=await (await fetch(scene.capture())).blob();
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=realism?'庭间-写实花境验证.png':'庭间-雨后的小庭院.png';document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);toast('作品图片已生成，请查看浏览器下载');
  }catch{toast('图片导出失败，请稍后重试');}
});
$('#clear').addEventListener('click',()=>$('#clear-dialog').showModal());
$('#cancel-clear').addEventListener('click',()=>$('#clear-dialog').close());
$('#confirm-clear').addEventListener('click',()=>{store.replace([]);$('#clear-dialog').close();toast('庭院已清空，可随时撤销');});
$('#help').addEventListener('click',()=>$('#help-dialog').showModal());$('#close-help').addEventListener('click',()=>$('#help-dialog').close());
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){cancelPlacement();scene?.sync(store.objects);updateToolbar();}
  if(e.target.matches('input,textarea')||document.querySelector('dialog[open]'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?store.redo():store.undo();}
  if(e.key==='Delete'&&selectedId)store.remove(selectedId);
});

async function start(){
  try{
    scene=await createGardenScene($('#scene'),{
      onSelect:id=>{if(!pendingAsset)select(id);},
      onMove:(id,point)=>store.update(id,point),
      onPlace:point=>place(point),
      realistic:realism
    });
    await scene.loadAssets(ASSETS);
    thumbnails=scene.getThumbnails();
    scene.sync(store.objects);ready=true;
    renderAssets();updateToolbar();setView('angle');
    store.subscribe(objects=>{scene.sync(objects);updateToolbar();persist();});
    $('#loading').hidden=true;
    if(restoreError)toast(restoreError);else persist();
  }catch(error){
    console.error(error);$('#loading-text').textContent='素材或图形环境载入失败，请刷新重试。';$('#loading strong').textContent='小庭院暂时未能打开';
  }
}
start();
