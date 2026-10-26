import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const ROOT = '/assets/realism/surfaces/';
const smooth = (a,b,value) => { const t=THREE.MathUtils.clamp((value-a)/(b-a),0,1); return t*t*(3-2*t); };
const fract = value => value-Math.floor(value);
const hash = (x,z) => fract(Math.sin(x*127.1+z*311.7)*43758.5453);
function noise(x,z) {
  const ix=Math.floor(x), iz=Math.floor(z), fx=smooth(0,1,fract(x)), fz=smooth(0,1,fract(z));
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),fx),
    THREE.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),fx),fz);
}
function bedMask(x,z) {
  const irregular=(noise(x*2.6,z*2.6)-.5)*.34+(noise(x*17,z*17)-.5)*.11;
  const boundary=.8+.64*Math.sin(z*1.15)+.22*Math.sin(z*3.2);
  return Math.max(smooth(-.16,.16,x-boundary+irregular),
    smooth(-.12,.16,-z-2.35+.22*Math.sin(x*2.1)+irregular),
    smooth(-.14,.14,-x-2.35+.25*Math.sin(z*1.7)+irregular));
}
function terrainHeight(x,z) {
  const mound=.045+.12*Math.exp(-((x-2.5)**2+(z+.6)**2)/4.8);
  return bedMask(x,z)*mound+.012*(noise(x*2.5,z*2.5)-.5);
}
const groundHeight = (x,z) => x < -3.75 && z > -3.38 && z < 3.28 ? .295 : terrainHeight(x,z);

// Shader and geometry use the same bed boundary; roots follow the raised soil.
function blendGround(material, mud, moss) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      mudMap: { value: mud.map }, mudNormal: { value: mud.normalMap }, mudRough: { value: mud.roughnessMap },
      mossMap: { value: moss.map }, mossNormal: { value: moss.normalMap }, mossRough: { value: moss.roughnessMap },
    });
    shader.vertexShader = `varying vec2 gardenUv;\n${shader.vertexShader}`
      .replace('#include <uv_vertex>', '#include <uv_vertex>\ngardenUv = uv;');
    shader.fragmentShader = `
      varying vec2 gardenUv;
      uniform sampler2D mudMap, mudNormal, mudRough, mossMap, mossNormal, mossRough;
      float gardenHash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float gardenNoise(vec2 p) {
        vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(gardenHash(i), gardenHash(i+vec2(1,0)),f.x),
          mix(gardenHash(i+vec2(0,1)),gardenHash(i+vec2(1,1)),f.x),f.y);
      }
      float bedMask(vec2 uv) {
        vec2 p = (uv-0.5)*vec2(11.0,-7.0);
        float irregular = (gardenNoise(p*2.6)-0.5)*0.34 + (gardenNoise(p*17.0)-0.5)*0.11;
        float boundary = 0.8+0.64*sin(p.y*1.15)+0.22*sin(p.y*3.2);
        float rightBed = smoothstep(-0.16,0.16,p.x-boundary+irregular);
        float backBed = smoothstep(-0.12,0.16,-p.y-2.35+0.22*sin(p.x*2.1)+irregular);
        float leftBed = smoothstep(-0.14,0.14,-p.x-2.35+0.25*sin(p.y*1.7)+irregular);
        return max(rightBed,max(backBed,leftBed));
      }
      ${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_fragment>', `
        float bed = bedMask(gardenUv);
        float mossAmount = smoothstep(0.35,0.72,gardenNoise(gardenUv*vec2(27.5,17.5))) * 0.68;
        vec2 bedUv = gardenUv*vec2(5.5,3.5);
        vec3 mossColor = texture2D(mossMap,bedUv*2.4).rgb * vec3(0.57,0.80,0.37);
        vec3 earthColor = mix(texture2D(mudMap,bedUv).rgb*vec3(0.61,0.61,0.50),mossColor,mossAmount);
        earthColor = mix(vec3(dot(earthColor,vec3(0.2126,0.7152,0.0722))),earthColor,0.78);
        vec3 gravelColor = texture2D(map,vMapUv).rgb;
        gravelColor = mix(vec3(dot(gravelColor,vec3(0.2126,0.7152,0.0722))),gravelColor,0.23) * vec3(1.02,1.04,1.04);
        diffuseColor.rgb *= mix(gravelColor,earthColor,bed);
      `)
      .replace('#include <normal_fragment_maps>', `
        vec3 mapN = texture2D(normalMap,vNormalMapUv).xyz*2.0-1.0;
        vec3 earthN = mix(texture2D(mudNormal,bedUv).xyz,texture2D(mossNormal,bedUv*2.4).xyz,mossAmount)*2.0-1.0;
        mapN = normalize(mix(mapN,earthN,bed));
        mapN.xy *= normalScale;
        normal = normalize(tbn*mapN);
      `)
      .replace('#include <roughnessmap_fragment>', `
        float earthRough = mix(texture2D(mudRough,bedUv).g,texture2D(mossRough,bedUv*2.4).g,mossAmount);
        float roughnessFactor = max(0.65,roughness*mix(texture2D(roughnessMap,vRoughnessMapUv).g,earthRough,bed));
      `);
  };
  material.customProgramCacheKey = () => 'garden-ground-blend-v3';
}

export async function buildRealismEnvironment(scene, renderer) {
  const group = new THREE.Group();
  group.name = 'Realism courtyard';
  const textures = new Set();
  const materials = new Set();
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  async function maps(name, repeatX = 1, repeatY = 1) {
    const [map, normalMap, roughnessMap] = await Promise.all(['diffuse', 'nor_gl', 'rough'].map(async kind => {
      const texture = await loader.loadAsync(`${ROOT}${name}_${kind}.jpg`);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.anisotropy = anisotropy;
      if (kind === 'diffuse') texture.colorSpace = THREE.SRGBColorSpace;
      textures.add(texture);
      return texture;
    }));
    return { map, normalMap, roughnessMap };
  }
  function mat(values) {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.94, ...values });
    materials.add(material);
    return material;
  }
  function box(w,h,d,x,y,z,material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  const [gravelMaps, mudMaps, mossMaps, woodMaps, plasterMaps, hdr] = await Promise.all([
    maps('gravel_floor', 3.3, 2.1), maps('brown_mud_leaves_01'), maps('mossy_rock'),
    maps('wood_planks', 0.9, 3.2), maps('white_plaster_02', 2.5, 1),
    new HDRLoader().loadAsync(`${ROOT}garden_nook_1k.hdr`),
  ]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(hdr);
  hdr.dispose();
  pmrem.dispose();
  const previousEnvironment = scene.environment;
  scene.environment = env.texture;
  scene.environmentIntensity = 1.1;
  scene.environmentRotation.set(0, 1.1, 0);

  const gravel = mat({ ...gravelMaps, color: '#e5e5dc', normalScale: new THREE.Vector2(0.9,0.9) });
  blendGround(gravel, mudMaps, mossMaps);
  const terrain=new THREE.PlaneGeometry(11,7,176,112);
  terrain.rotateX(-Math.PI/2);
  const vertices=terrain.attributes.position;
  for(let i=0;i<vertices.count;i++) vertices.setY(i,terrainHeight(vertices.getX(i),vertices.getZ(i)));
  terrain.computeVertexNormals();
  const ground = new THREE.Mesh(terrain,gravel);
  ground.receiveShadow = true;
  group.add(ground);

  const wood = mat({ ...woodMaps, color: '#eee3d1', normalScale: new THREE.Vector2(0.5,0.5) });
  const darkWood = mat({ ...woodMaps, color: '#73796c', normalScale: new THREE.Vector2(0.45,0.45) });
  const plaster = mat({ ...plasterMaps, color: '#eeeada', normalScale: new THREE.Vector2(0.35,0.35) });
  const stone = mat({ ...mossMaps, color: '#a9b1a9', normalScale: new THREE.Vector2(0.8,0.8) });

  // A weathered engawa veranda. Real board texture provides grain and fine seams.
  box(1.73,0.25,6.66,-4.615,0.125,-0.05,darkWood);
  box(1.73,0.045,6.66,-4.615,0.2725,-0.05,wood);
  box(0.065,0.105,6.7,-3.77,0.2425,-0.05,darkWood);
  box(0.5,0.13,1.55,-3.51,0.065,1.55,wood);

  // The full-height wall and inset shoji form an architectural background.
  box(0.18,2.85,7.12,-5.6,1.425,-0.05,plaster);
  box(11.25,2.15,0.15,0,1.075,-3.64,darkWood);
  box(11.34,0.08,0.29,0,2.165,-3.64,darkWood);
  box(0.26,0.15,7.3,-5.46,2.78,-0.05,darkWood);
  box(0.83,0.095,7.38,-5.26,2.9,-0.05,darkWood);
  for (const z of [-3.35,-1.65,0.05,1.75,3.25]) {
    box(0.15,2.73,0.12,-5.425,1.66,z,darkWood);
  }
  for (const z of [-2.5,-0.8,0.9]) {
    box(0.045,1.94,1.5,-5.485,1.5,z,plaster);
    for(let i=0;i<5;i++) box(0.035,1.98,0.026,-5.445,1.5,z-0.72+i*0.36,darkWood);
    for(let i=0;i<6;i++) box(0.035,0.026,1.47,-5.439,0.54+i*0.385,z,darkWood);
  }
  // Fine vertical slats add depth without enclosing the courtyard as a toy tray.
  const slatMaps = await maps('wood_planks',0.32,1.2);
  const slatWood = mat({ ...slatMaps, color:'#717d72', normalScale: new THREE.Vector2(0.45,0.45) });
  for(let i=0;i<43;i++) box(0.205,2.08,0.065,-3.8+i*0.22,1.04,-3.525,slatWood);
  box(9.5,0.065,0.065,0.8,2.06,-3.49,darkWood);

  // Irregular stone flags with actual rock maps, embedded into the gravel.
  const steps=[[-2.85,2.87],[-2.05,2.2],[-1.48,1.36],[-1.45,0.45],[-1.18,-0.43],[-1.56,-1.29]];
  for(let i=0;i<steps.length;i++) {
    const [x,z]=steps[i];
    const geometry=new THREE.CylinderGeometry(0.49,0.54,0.14,13);
    const positions=geometry.attributes.position;
    for(let v=0;v<positions.count;v++) {
      const px=positions.getX(v), pz=positions.getZ(v);
      const angle=Math.atan2(pz,px);
      const factor=1+.12*Math.sin(angle*3+i)+.065*Math.sin(angle*7+i*.7);
      const relief=.009*Math.sin(px*9+i)*Math.sin(pz*11+i);
      positions.setXYZ(v,px*factor,positions.getY(v)+relief,pz*factor);
    }
    geometry.computeVertexNormals();
    const step=new THREE.Mesh(geometry,stone);
    step.position.set(x,terrainHeight(x,z)+.035,z);
    step.rotation.y=i*0.83;
    step.scale.set(1.14,1,0.83);
    step.receiveShadow=step.castShadow=true;
    group.add(step);
  }

  // Small stones have real silhouettes and contact shadows at the path edge.
  let seed=7231;
  const rng=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const pebbleGeometry=new THREE.IcosahedronGeometry(1,0);
  const pebbleMaterial=mat({color:'#d2d0c4',roughness:.88});
  const pebbles=new THREE.InstancedMesh(pebbleGeometry,pebbleMaterial,4200);
  const dummy=new THREE.Object3D(), pebbleColor=new THREE.Color();
  for(let i=0;i<4200;i++) {
    let x,z;
    do { x=-3.65+rng()*9.1;z=-3.42+rng()*6.84; } while(bedMask(x,z)>.72);
    const radius=.012+rng()*.025;
    dummy.position.set(x,terrainHeight(x,z)+radius*.22,z);
    dummy.scale.set(radius*(.75+rng()*.6),radius*(.35+rng()*.3),radius*(.7+rng()*.7));
    dummy.rotation.set(rng()*.7,rng()*Math.PI*2,rng()*.7);
    dummy.updateMatrix();
    pebbles.setMatrixAt(i,dummy.matrix);
    pebbleColor.setHSL(.10+rng()*.04,.045+rng()*.07,.51+rng()*.25);
    pebbles.setColorAt(i,pebbleColor);
  }
  pebbles.castShadow=pebbles.receiveShadow=true;
  group.add(pebbles);

  const sun=new THREE.DirectionalLight('#fff5e4',2.2);
  sun.position.set(-4.5,8.5,5);
  sun.target.position.set(0,0,-0.5);
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-8,right:8,top:7,bottom:-7,near:0.5,far:24});
  sun.shadow.bias=-0.00012;
  sun.shadow.normalBias=0.018;
  sun.shadow.radius=5;
  const fill=new THREE.HemisphereLight('#eef3ef','#a7ab8f',1.4);
  group.add(sun,sun.target,fill);
  scene.add(group);

  return {
    groundHeight,
    dispose() {
      scene.remove(group);
      if(scene.environment===env.texture) scene.environment=previousEnvironment;
      group.traverse(item=>{item.geometry?.dispose();});
      for(const material of materials) material.dispose();
      for(const texture of textures) texture.dispose();
      sun.shadow.map?.dispose();
      env.dispose();
    },
  };
}
