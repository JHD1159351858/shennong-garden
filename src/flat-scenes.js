const objects = (scene, placements) => placements.map(([asset,x,z,scale],i) => ({
  id:scene==='japanese'?`flat-${i}`:`${scene}-${i}`, assetId:`flat-${asset}`, x,z,scale,rotation:0,
}));

export const FLAT_SCENES = [
  { id:'japanese', name:'日式庭院', subtitle:'苔石 · 绣球 · 静谧', background:'/assets/flat/background.png',
    storageKey:'tingjian-flat-v1', objects:objects('japanese',[
      ['grass',3.5,-3,.85],['hosta',.7,-2.7,.85],['hydrangea',2.6,-2.1,.9],
      ['rock',4.3,-1.9,.75],['hosta',1.6,-1.2,.8],['fern',4.2,-.7,.8],
      ['hydrangea',3,.2,1],['grass',4.9,.9,.9],['hosta',4.5,1.8,.75],
      ['rock',4.2,2.8,.65],['fern',5,2.8,.6],
      ['hosta',-3.1,-.5,.8],['grass',-1.9,.4,.75],['hydrangea',-3.4,1.1,.95],
      ['fern',-1.3,1.9,.75],['rock',-2.7,2.2,.7],['grass',-4.1,3,.85],
      ['hosta',-1.8,3.1,.85],['fern',-3.4,3.25,.65],
    ]) },
  { id:'modern', name:'现代庭院', subtitle:'白墙 · 线条 · 留白', background:'/assets/flat/background-modern.png',
    storageKey:'tingjian-flat-modern-v1', objects:objects('modern',[
      ['maple',-3.4,-2.7,.8],['bench',2.6,-2.5,.85],['grass',-4.4,-1,.7],
      ['hydrangea-white',-2.6,-.8,.8],['rock',-4.1,.2,.65],['grass',4.2,-.5,.8],
      ['hosta',3.2,.25,.7],['hydrangea-white',4,1,.8],['lavender',-2.9,1.2,.75],
      ['grass',-4.2,2.4,.7],['rock',3.7,2.5,.7],['fern',4.8,3,.7],
      ['daisy',-2.6,3,.7],['pot',1.7,-1.6,.75],
    ]) },
  { id:'cottage', name:'英式花园', subtitle:'玫瑰 · 碎石 · 浪漫', background:'/assets/flat/background-cottage.png',
    storageKey:'tingjian-flat-cottage-v1', objects:objects('cottage',[
      ['rose-pink',-3.2,-2.6,.9],['hydrangea-purple',3.3,-2.7,.9],['bench',-.4,-2.5,.9],
      ['lavender',-4.1,-1.3,.7],['rose-cream',-2.3,-.7,.85],['rose-pink',3.8,-.7,.85],
      ['daisy',2.6,.1,.75],['hydrangea-pink',-3.5,.8,.9],['lavender',4.6,1,.8],
      ['daisy',-1.9,1.6,.7],['rose-cream',3.2,2,.8],['pot',4.7,2.4,.8],
      ['grass',-4.5,2.7,.8],['daisy',-2.5,3.1,.8],['lavender',2.5,3.25,.7],
    ]) },
  { id:'terrace', name:'露台花园', subtitle:'暖砖 · 花盆 · 午后', background:'/assets/flat/background-terrace.png',
    storageKey:'tingjian-flat-terrace-v1', objects:objects('terrace',[
      ['maple',-3.7,-2.4,.65],['bench',.59,-2.89,.85],['pot',-.58,.04,.8],
      ['grass',4.3,-1.8,.75],['rose-pink',-4.4,-.9,.8],
      ['hydrangea-white',3.7,.2,.8],['lavender',-4.86,.43,.8],
      ['lantern',4.7,2,.7],['rose-cream',5.01,.34,.8],
      ['daisy',-4.54,1.34,.75],['pot',1,2.77,.8],
    ]) },
];

export const ACTIVE_SCENE_KEY = 'tingjian-flat-active-scene';
