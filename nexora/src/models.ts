// Procedural, genuinely 3D product models. No external meshes: every surface is generated here,
// so the watch and glasses stay identical in every scene.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface WatchModel {
  group: THREE.Group;
  layers: THREE.Object3D[]; // separable layers for the "exploded" transformation
  body: THREE.MeshPhysicalMaterial;
  screen: THREE.CanvasTexture;
  drawScreen: (t: number, bpm: number) => void;
}

export function createWatch(): WatchModel {
  const group = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({
    color: '#d9e2ff', metalness: 1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05,
    iridescence: 0.9, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 900],
  });

  // Case
  const caseMesh = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.8, 0.42, 6, 0.32), body);
  // Floating sensor core (rear)
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.55, 0.12, 64).rotateX(Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: '#0b0d18', metalness: 0.4, roughness: 0.2, emissive: '#3ff8ff', emissiveIntensity: 0.25 }),
  );
  core.position.z = -0.27;
  // Sensor LEDs
  for (let i = 0; i < 6; i++) {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), new THREE.MeshBasicMaterial({ color: i % 2 ? '#8a3dff' : '#3ff8ff' }));
    const a = (i / 6) * Math.PI * 2;
    led.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, -0.34);
    core.add(led);
  }

  // Display (canvas texture → real live UI on the model)
  const cvs = document.createElement('canvas');
  cvs.width = 512; cvs.height = 620;
  const ctx = cvs.getContext('2d')!;
  const screen = new THREE.CanvasTexture(cvs);
  screen.colorSpace = THREE.SRGBColorSpace;
  const display = new THREE.Mesh(
    new RoundedBoxGeometry(1.28, 1.56, 0.04, 4, 0.22),
    new THREE.MeshPhysicalMaterial({ map: screen, emissiveMap: screen, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.05, metalness: 0, clearcoat: 1 }),
  );
  display.position.z = 0.23;
  // Glass lens
  const glass = new THREE.Mesh(
    new RoundedBoxGeometry(1.36, 1.64, 0.06, 4, 0.26),
    new THREE.MeshPhysicalMaterial({ transmission: 1, thickness: 0.4, roughness: 0, ior: 1.7, transparent: true, opacity: 0.35, iridescence: 1 }),
  );
  glass.position.z = 0.27;
  // Crown
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 32).rotateZ(Math.PI / 2), body);
  crown.position.set(0.8, 0.3, 0);
  caseMesh.add(crown);

  // Strap: segmented liquid links following a curve
  const strap = new THREE.Group();
  const linkMat = new THREE.MeshPhysicalMaterial({ color: '#1a1c2a', metalness: 0.7, roughness: 0.3, iridescence: 0.6 });
  const linkGeo = new RoundedBoxGeometry(1.15, 0.22, 0.12, 3, 0.05);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.1 && Math.cos(a) > 0) continue; // gap for the case
    const link = new THREE.Mesh(linkGeo, linkMat);
    link.position.set(0, Math.sin(a) * 1.7, -1.1 + Math.cos(a) * 1.1);
    link.rotation.x = Math.atan2(-Math.sin(a) * 1.1, Math.cos(a) * 1.7);
    strap.add(link);
  }
  strap.position.z = 0.0;

  group.add(strap, caseMesh, core, display, glass);
  const drawScreen = (t: number, bpm: number) => {
    ctx.fillStyle = '#020309';
    ctx.fillRect(0, 0, 512, 620);
    const g = ctx.createRadialGradient(256, 310, 10, 256, 310, 320);
    g.addColorStop(0, 'rgba(63,248,255,0.25)');
    g.addColorStop(1, 'rgba(138,61,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 620);
    ctx.lineWidth = 10;
    for (let r = 0; r < 3; r++) {
      ctx.strokeStyle = ['#3ff8ff', '#8a3dff', '#ff3fd8'][r];
      ctx.beginPath();
      const start = -Math.PI / 2;
      ctx.arc(256, 260, 170 - r * 26, start, start + Math.PI * 2 * (0.45 + 0.4 * Math.abs(Math.sin(t * 0.3 + r))));
      ctx.stroke();
    }
    ctx.fillStyle = '#e8f6ff';
    ctx.font = '600 92px "Unbounded", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(Math.round(bpm)), 256, 290);
    ctx.font = '500 26px "JetBrains Mono", monospace';
    ctx.fillStyle = '#3ff8ff';
    ctx.fillText('BPM · SYNCED', 256, 335);
    // ECG trace
    ctx.strokeStyle = '#3ff8ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = 0; x < 512; x += 4) {
      const p = ((x / 512) * 4 + t * 1.2) % 1;
      const y = 520 - (p > 0.48 && p < 0.52 ? 70 * Math.sin((p - 0.48) * 78) : 4 * Math.sin(x * 0.05 + t));
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(232,246,255,0.6)';
    ctx.fillText('2050.11.18 · NEXORA OS', 256, 590);
    screen.needsUpdate = true;
  };
  drawScreen(0, 64);

  return { group, layers: [strap, caseMesh, core, display, glass], body, screen, drawScreen };
}

export interface GlassesModel {
  group: THREE.Group;
  frame: THREE.MeshPhysicalMaterial;
  lens: THREE.MeshPhysicalMaterial;
  lensMeshes: THREE.Mesh[];
}

export function createGlasses(): GlassesModel {
  const group = new THREE.Group();
  const frame = new THREE.MeshPhysicalMaterial({ color: '#cfd8ff', metalness: 1, roughness: 0.15, clearcoat: 1, iridescence: 0.8 });
  const lens = new THREE.MeshPhysicalMaterial({
    color: '#3ff8ff', transmission: 0.85, thickness: 0.3, roughness: 0.02, ior: 1.6, iridescence: 1,
    iridescenceThicknessRange: [100, 800], transparent: true, opacity: 0.85, emissive: '#3ff8ff', emissiveIntensity: 0.15,
  });

  // A single continuous visor-like lens shape, extruded
  const shape = new THREE.Shape();
  shape.moveTo(-1.05, 0.25);
  shape.bezierCurveTo(-1.05, 0.55, -0.2, 0.55, -0.1, 0.32);
  shape.quadraticCurveTo(0, 0.2, 0.1, 0.32);
  shape.bezierCurveTo(0.2, 0.55, 1.05, 0.55, 1.05, 0.25);
  shape.bezierCurveTo(1.05, -0.35, 0.25, -0.4, 0.12, -0.05);
  shape.quadraticCurveTo(0, 0.08, -0.12, -0.05);
  shape.bezierCurveTo(-0.25, -0.4, -1.05, -0.35, -1.05, 0.25);
  const lensGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 4, curveSegments: 48 });
  lensGeo.center();
  const lensMesh = new THREE.Mesh(lensGeo, lens);
  bend(lensGeo, 0.35);

  // Frame: outline tube following the lens edge
  const pts = shape.getSpacedPoints(160).map((p) => new THREE.Vector3(p.x, p.y - 0.09, 0));
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const frameGeo = new THREE.TubeGeometry(curve, 320, 0.035, 12, true);
  bend(frameGeo, 0.35);
  const frameMesh = new THREE.Mesh(frameGeo, frame);

  // Temples
  const temples: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const tc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 1.04, 0.15, -0.36), new THREE.Vector3(s * 1.08, 0.16, -1.2), new THREE.Vector3(s * 1.02, 0.0, -2.0),
    ]);
    const t = new THREE.Mesh(new THREE.TubeGeometry(tc, 40, 0.04, 10), frame);
    temples.push(t);
  }
  // Projector nodes
  for (const s of [-1, 1]) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 24), new THREE.MeshBasicMaterial({ color: '#3ff8ff' }));
    node.position.set(s * 0.98, 0.32, -0.3);
    group.add(node);
  }
  group.add(lensMesh, frameMesh, ...temples);
  return { group, frame, lens, lensMeshes: [lensMesh] };
}

// Wrap flat geometry around a cylinder so the visor curves around the face.
function bend(geo: THREE.BufferGeometry, k: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, pos.getZ(i) - k * x * x);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}
