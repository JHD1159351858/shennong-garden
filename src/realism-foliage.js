const prepared = new WeakSet();

// Thin leaves transmit some daylight through the back; opaque PBR alone leaves
// those surfaces almost black. This term uses the existing, shadowed light.
export function prepareRealismFoliage(material) {
  if (prepared.has(material)) return material;
  prepared.add(material);
  const broadLeaf = material.name === 'calathea_orbifolia_01';
  // This scan has a median roughness of 0.43; soften its silver HDR highlights.
  if (broadLeaf && material.isMeshPhysicalMaterial) material.specularIntensity = 0.55;
  const compile = material.onBeforeCompile;
  material.onBeforeCompile = function (shader, renderer) {
    compile.call(this, shader, renderer);
    if (broadLeaf) shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\nroughnessFactor = max(roughnessFactor, 0.62);'
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_pars_fragment>',
      `#include <lights_physical_pars_fragment>
      void RE_Direct_Leaf(
        const in IncidentLight directLight, const in vec3 geometryPosition,
        const in vec3 geometryNormal, const in vec3 geometryViewDir,
        const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material,
        inout ReflectedLight reflectedLight
      ) {
        RE_Direct_Physical(directLight, geometryPosition, geometryNormal,
          geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
        float leafDot = dot(geometryNormal, directLight.direction);
        float transmitted = 0.42 * max(-leafDot, 0.0);
        float softEdge = 0.12 * pow(1.0 - abs(leafDot), 2.0);
        reflectedLight.directDiffuse += (transmitted + softEdge)
          * directLight.color * BRDF_Lambert(material.diffuseColor);
      }
      #undef RE_Direct
      #define RE_Direct RE_Direct_Leaf`
    );
  };
  material.customProgramCacheKey = () => `garden-thin-leaf-v2-${broadLeaf}`;
  material.needsUpdate = true;
  return material;
}
