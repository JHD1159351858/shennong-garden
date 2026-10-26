import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve('public/assets/realism/models');
const choices = [
  { source: 'fern_02', node: 'fern_02_b', id: 'real-fern' },
  { source: 'calathea_orbifolia_01', node: 'calathea_orbifolia_01_a', id: 'real-shrub' },
  { source: 'periwinkle_plant', node: 'periwinkle_plant_01_LOD0', id: 'real-flower' },
  { source: 'rock_moss_set_01', node: 'rock_moss_set_01_rock01', id: 'real-rock' },
];

async function get(url) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Tingjian-local-prototype-asset-download' } });
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function obtain(url, file, md5) {
  try {
    const existing = await readFile(file);
    if (!md5 || createHash('md5').update(existing).digest('hex') === md5) return existing;
  } catch {}
  const data = await get(url);
  if (md5 && createHash('md5').update(data).digest('hex') !== md5) throw new Error(`Checksum mismatch: ${file}`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
  return data;
}

for (const choice of choices) {
  const dir = path.join(root, choice.source);
  await mkdir(dir, { recursive: true });
  const files = JSON.parse(await obtain(`https://api.polyhaven.com/files/${choice.source}`, path.join(dir, 'files.json')));
  const info = JSON.parse(await obtain(`https://api.polyhaven.com/info/${choice.source}`, path.join(dir, 'info.json')));
  const entry = files.gltf['2k'].gltf;
  const source = JSON.parse(await obtain(entry.url, path.join(dir, 'source.gltf'), entry.md5));
  for (const [filename, file] of Object.entries(entry.include)) {
    await obtain(file.url, path.join(dir, filename), file.md5);
  }
  const nodeIndex = source.nodes.findIndex(node => node.name === choice.node);
  if (nodeIndex < 0) throw new Error(`Missing variant ${choice.node}`);
  source.scenes = [{ name: choice.source, nodes: [nodeIndex] }];
  source.scene = 0;
  // Remove the source pack's display-row translation; geometry/rotation are retained.
  source.nodes[nodeIndex].translation = [0, 0, 0];
  const alpha = (files.Alpha || files.opacity)?.['2k']?.png;
  if (alpha) {
    const alphaFile = path.join(dir, 'textures', `${choice.source}_alpha_2k.png`);
    await obtain(alpha.url, alphaFile, alpha.md5);
    const material = source.materials[0];
    const texture = source.textures[material.pbrMetallicRoughness.baseColorTexture.index];
    const imageIndex = texture.source;
    const image = source.images[imageIndex];
    const combinedUri = `textures/${choice.source}_rgba_2k.webp`;
    // The official JPEG glTF loses the original opacity channel. Restore it from
    // the source's separate leaf mask so foliage remains cut out from every angle.
    execFileSync('python', ['-c', 'from PIL import Image; import sys; rgb=Image.open(sys.argv[1]).convert("RGBA"); alpha=Image.open(sys.argv[2]).convert("L"); assert rgb.size==alpha.size; rgb.putalpha(alpha); rgb.save(sys.argv[3],"WEBP",quality=94,method=6)', path.join(dir, image.uri), alphaFile, path.join(dir, combinedUri)]);
    image.uri = combinedUri;
    image.mimeType = 'image/webp';
    texture.extensions = { ...texture.extensions, EXT_texture_webp: { source: imageIndex } };
    delete texture.source;
    source.extensionsUsed = [...new Set([...(source.extensionsUsed || []), 'EXT_texture_webp'])];
    source.extensionsRequired = [...new Set([...(source.extensionsRequired || []), 'EXT_texture_webp'])];
    material.alphaMode = 'MASK';
    material.alphaCutoff = 0.5;
    if (files.arm) material.occlusionTexture = { index: material.pbrMetallicRoughness.metallicRoughnessTexture.index, strength: 0.35 };
    if (material.normalTexture) material.normalTexture.scale = 0.5;
  }
  await writeFile(path.join(dir, 'model.gltf'), JSON.stringify(source));
  console.log(JSON.stringify({ id: choice.id, source: choice.source, node: choice.node, sourcePolycount: info.polycount, sourceDimensions: info.dimensions, bytes: entry.size + Object.values(entry.include).reduce((sum, file) => sum + file.size, 0), images: source.images, accessors: source.meshes[source.nodes[nodeIndex].mesh].primitives.map(primitive => ({ position: source.accessors[primitive.attributes.POSITION], indices: source.accessors[primitive.indices] })) }));
}
