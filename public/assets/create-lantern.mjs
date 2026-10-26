// Original stone lantern asset for the garden prototype. Run with Node.js.
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
};

const group = new THREE.Group();
group.name = 'Garden stone lantern';
const stone = new THREE.MeshStandardMaterial({ color: '#777b70', roughness: 0.97 });
const capStone = new THREE.MeshStandardMaterial({ color: '#676e64', roughness: 0.97 });
const warmPaper = new THREE.MeshStandardMaterial({ color: '#e9d4a5', emissive: '#b98a45', emissiveIntensity: 0.22, roughness: 0.95 });
function add(geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}
add(new THREE.CylinderGeometry(0.27, 0.35, 0.12, 8), stone, 0, 0.06, 0);
add(new THREE.CylinderGeometry(0.12, 0.16, 0.53, 8), stone, 0, 0.385, 0);
add(new THREE.CylinderGeometry(0.28, 0.13, 0.12, 8), capStone, 0, 0.71, 0);
add(new THREE.BoxGeometry(0.43, 0.08, 0.43), stone, 0, 0.79, 0);
for (const x of [-0.175, 0.175]) {
  for (const z of [-0.175, 0.175]) add(new THREE.BoxGeometry(0.07, 0.32, 0.07), stone, x, 0.99, z);
}
add(new THREE.BoxGeometry(0.24, 0.27, 0.24), warmPaper, 0, 0.985, 0);
add(new THREE.BoxGeometry(0.45, 0.06, 0.45), stone, 0, 1.18, 0);
const roof = [[0, 1.36], [0.10, 1.35], [0.18, 1.28], [0.29, 1.22], [0.39, 1.20], [0.40, 1.15], [0.32, 1.15], [0.24, 1.17], [0, 1.17]].map(([x,y]) => new THREE.Vector2(x,y));
const roofMesh = add(new THREE.LatheGeometry(roof, 4), capStone, 0, 0, 0);
roofMesh.rotation.y = Math.PI / 4;
add(new THREE.SphereGeometry(0.07, 12, 8), stone, 0, 1.405, 0);
add(new THREE.ConeGeometry(0.045, 0.09, 8), capStone, 0, 1.48, 0);
const result = await new GLTFExporter().parseAsync(group, { binary: true });
await fs.writeFile(new URL('./lantern.glb', import.meta.url), Buffer.from(result));
console.log(`Lantern exported: ${result.byteLength} bytes`);
