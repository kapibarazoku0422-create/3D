import * as THREE from "three";

const capyFur = new THREE.MeshStandardMaterial({ color: 0xb98259, roughness: 0.98 });
const capyFace = new THREE.MeshStandardMaterial({ color: 0xc9956c, roughness: 0.97 });
const capyShade = new THREE.MeshStandardMaterial({ color: 0x6d4631, roughness: 1 });
const pawMat = new THREE.MeshStandardMaterial({ color: 0xaeb7b8, roughness: 0.88 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x111312, roughness: 0.55 });
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x111312, side: THREE.BackSide });
const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x050706, roughness: 0.15, metalness: 0.18, clearcoat: 1 });
const noseMat = new THREE.MeshStandardMaterial({ color: 0x9ba4a4, roughness: 0.6 });
const yamMat = new THREE.MeshStandardMaterial({ color: 0xf0c9a6, roughness: 0.98 });
const yamShade = new THREE.MeshStandardMaterial({ color: 0xe2b58f, roughness: 1 });
const peelMat = new THREE.MeshStandardMaterial({ color: 0xf7f2e8, roughness: 1 });
const rootMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 1 });
const mouthMat = new THREE.MeshStandardMaterial({ color: 0x181717, roughness: 0.8 });
const mouthInsideMat = new THREE.MeshStandardMaterial({ color: 0xf1c6a3, roughness: 1 });

function mesh(geometry, material, cast = true) {
  const item = new THREE.Mesh(geometry, material);
  item.castShadow = cast;
  item.receiveShadow = true;
  return item;
}

function sphere(scale, material, position, segments = 20) {
  const item = mesh(new THREE.SphereGeometry(1, segments, Math.max(10, segments - 6)), material);
  item.scale.set(...scale);
  item.position.set(...position);
  return item;
}

function outlinedSphere(scale, material, position, outline = 0.045) {
  const part = new THREE.Group();
  part.position.set(...position);
  const shell = mesh(new THREE.SphereGeometry(1, 22, 16), outlineMat, false);
  shell.scale.set(scale[0] + outline, scale[1] + outline, scale[2] + outline);
  const inside = mesh(new THREE.SphereGeometry(1, 22, 16), material);
  inside.scale.set(...scale);
  part.add(shell, inside);
  part.userData.inside = inside;
  return part;
}

function cylinder(radius, height, material, position, sides = 10) {
  const item = mesh(new THREE.CylinderGeometry(radius, radius * 0.88, height, sides), material);
  item.position.set(...position);
  return item;
}

function addFurMarks(root) {
  const markMaterial = new THREE.MeshBasicMaterial({ color: 0x3d2b21 });
  const marks = [
    [-0.52, 1.62, 1.15, 0.18], [-0.72, 1.46, 0.62, -0.15], [-0.8, 1.3, 0.05, 0.12],
    [-0.76, 1.6, -0.48, -0.18], [-0.55, 1.18, 1.0, -0.1], [-0.7, 1.05, 0.35, 0.16],
    [-0.68, 1.82, 0.45, 0.12], [-0.5, 1.88, -0.25, -0.14], [-0.48, 1.28, -0.92, 0.2],
  ];
  [-1, 1].forEach((side) => {
    marks.forEach(([x, y, z, tilt], index) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * (Math.abs(x) + 0.12), y, z - 0.18),
        new THREE.Vector3(side * (Math.abs(x) + 0.18), y + 0.07, z),
        new THREE.Vector3(side * (Math.abs(x) + 0.1), y + tilt * 0.15, z + 0.2),
      ]);
      const line = mesh(new THREE.TubeGeometry(curve, 6, 0.018, 5, false), markMaterial, false);
      line.name = `fur-mark-${side}-${index}`;
      root.add(line);
    });
  });
}

export function createCapybara({ scale = 1, crown = false } = {}) {
  const root = new THREE.Group();
  root.name = "capybara";

  // 原画の長い背中と低い腹を、重なった楕円で再現。
  const body = outlinedSphere([1.08, 0.64, 1.92], capyFur, [0, 1.23, 0.25], 0.055);
  body.rotation.x = -0.035;
  const rump = outlinedSphere([1.04, 0.7, 1.05], capyFur, [0, 1.3, 1.08], 0.05);
  const shoulder = outlinedSphere([0.9, 0.72, 0.82], capyFace, [0, 1.48, -1.05], 0.05);
  const neck = outlinedSphere([0.7, 0.66, 0.7], capyFace, [0, 1.78, -1.35], 0.045);
  const head = outlinedSphere([0.72, 0.67, 0.76], capyFace, [0, 2.05, -1.62], 0.055);
  const brow = outlinedSphere([0.65, 0.38, 0.48], capyFace, [0, 2.32, -1.72], 0.04);
  const snout = outlinedSphere([0.5, 0.34, 0.62], capyFace, [0, 1.91, -2.15], 0.05);
  root.add(body, rump, shoulder, neck, head, brow, snout);

  const nose = outlinedSphere([0.34, 0.24, 0.14], noseMat, [0, 1.91, -2.72], 0.025);
  root.add(nose);
  [-0.12, 0.12].forEach((x) => {
    const nostril = sphere([0.042, 0.06, 0.028], darkMat, [x, 1.96, -2.865], 8);
    root.add(nostril);
  });

  [-0.44, 0.44].forEach((x) => {
    const ear = outlinedSphere([0.19, 0.25, 0.12], pawMat, [x, 2.66, -1.51], 0.025);
    const inner = sphere([0.1, 0.14, 0.065], darkMat, [x, 2.67, -1.63], 10);
    root.add(ear, inner);
  });

  // 原画のピクセル風グラサン。レンズ下端の段差も小さなブロックで作る。
  const glasses = new THREE.Group();
  [-1, 1].forEach((side) => {
    const lens = mesh(new THREE.BoxGeometry(0.58, 0.29, 0.105), lensMat);
    lens.position.set(side * 0.31, 2.27, -2.24);
    lens.rotation.z = side * 0.065;
    glasses.add(lens);
    for (let step = 0; step < 3; step++) {
      const pixel = mesh(new THREE.BoxGeometry(0.12, 0.075, 0.11), lensMat);
      pixel.position.set(side * (0.12 + step * 0.13), 2.08 - step * 0.03, -2.245);
      glasses.add(pixel);
    }
    const temple = mesh(new THREE.BoxGeometry(0.43, 0.06, 0.065), darkMat);
    temple.position.set(side * 0.65, 2.3, -2.02);
    temple.rotation.y = side * 0.58;
    glasses.add(temple);
  });
  const bridge = mesh(new THREE.BoxGeometry(0.18, 0.06, 0.07), darkMat);
  bridge.position.set(0, 2.28, -2.29);
  glasses.add(bridge);
  root.add(glasses);

  const legs = [];
  [[-0.66, -0.78], [0.66, -0.78], [-0.72, 1.08], [0.72, 1.08]].forEach(([x, z], index) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.9, z);
    const upper = outlinedSphere([0.25, 0.48, 0.27], capyFace, [0, -0.28, 0], 0.03);
    const shin = cylinder(0.17, 0.48, capyFace, [0, -0.62, -0.02], 9);
    const paw = outlinedSphere([0.32, 0.17, 0.47], pawMat, [0, -0.88, -0.12], 0.025);
    pivot.add(upper, shin, paw);
    pivot.userData.phase = index % 2 ? Math.PI : 0;
    legs.push(pivot);
    root.add(pivot);
  });

  addFurMarks(root);

  let crownGroup = null;
  if (crown) {
    crownGroup = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ color: 0xe7bb4b, metalness: 0.65, roughness: 0.24, emissive: 0x4d2a04, emissiveIntensity: 0.18 });
    const base = mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.2, 8), gold);
    crownGroup.add(base);
    for (let i = 0; i < 5; i++) {
      const point = mesh(new THREE.ConeGeometry(0.12, 0.48, 5), gold);
      const angle = (i / 5) * Math.PI * 2;
      point.position.set(Math.sin(angle) * 0.32, 0.28, Math.cos(angle) * 0.32);
      crownGroup.add(point);
    }
    crownGroup.position.set(0, 2.9, -1.58);
    root.add(crownGroup);
  }

  root.scale.setScalar(scale);
  root.userData = { type: "capybara", legs, body, head, glasses, crown: crownGroup, baseScale: scale };
  return root;
}

function yamLobe(position, size, material = yamMat, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.z = rotation;
  const outline = sphere([size[0] + 0.07, size[1] + 0.07, size[2] + 0.06], outlineMat, [0, 0, 0]);
  outline.material = outlineMat;
  const peel = sphere([size[0], size[1], size[2]], peelMat, [0, 0, 0]);
  const flesh = sphere([size[0] * 0.88, size[1] * 0.91, size[2] * 0.94], material, [0.035, 0, -0.08]);
  group.add(outline, peel, flesh);
  return group;
}

export function createYam({ scale = 1, boss = false } = {}) {
  const root = new THREE.Group();
  root.name = boss ? "yam-boss" : "yam";
  const body = new THREE.Group();
  root.add(body);

  // 白い皮の縁を残しながら、原画の不規則な節を重ねる。
  const lobes = [
    [[-0.04, 0.48, 0], [0.52, 0.67, 0.45], yamShade, -0.09],
    [[0.06, 1.18, 0], [0.62, 0.85, 0.53], yamMat, 0.08],
    [[-0.08, 1.94, 0], [0.6, 0.72, 0.54], yamShade, -0.05],
    [[0.08, 2.58, 0], [0.58, 0.68, 0.51], yamMat, 0.09],
    [[-0.05, 3.2, 0], [0.5, 0.62, 0.46], yamMat, -0.08],
  ];
  lobes.forEach(([position, size, material, rotation]) => body.add(yamLobe(position, size, material, rotation)));

  // 顔は原画と同じ、縦長の目・小さな点・大きく開いた口。
  [-0.2, 0.2].forEach((x, index) => {
    const eye = mesh(new THREE.CapsuleGeometry(0.055, index ? 0.34 : 0.42, 5, 8), darkMat);
    eye.position.set(x, 2.68 + index * 0.02, -0.58);
    root.add(eye);
  });
  const browDot = sphere([0.065, 0.07, 0.035], darkMat, [-0.16, 3.25, -0.51], 8);
  root.add(browDot);
  const mouthFill = sphere([0.27, 0.32, 0.035], mouthInsideMat, [0.04, 2.03, -0.61], 16);
  const mouthRing = mesh(new THREE.TorusGeometry(0.3, 0.057, 9, 22), mouthMat);
  mouthRing.position.set(0.04, 2.03, -0.645);
  mouthRing.scale.y = 1.2;
  mouthRing.rotation.z = -0.18;
  root.add(mouthFill, mouthRing);

  const spots = [[-0.34, 1.24], [0.29, 0.92], [-0.31, 2.2], [0.37, 1.7], [-0.34, 3.02], [0.12, 0.52], [0.37, 2.45], [-0.05, 1.5]];
  spots.forEach(([x, y], i) => {
    const spot = sphere([0.045 + (i % 3) * 0.012, 0.05, 0.026], rootMat, [x, y, -0.585], 8);
    root.add(spot);
  });

  const roots = [];
  for (let i = 0; i < (boss ? 15 : 10); i++) {
    const angle = (i / (boss ? 15 : 10)) * Math.PI * 2;
    const height = 0.65 + (i % 4) * 0.13;
    const hair = cylinder(0.035, height, rootMat, [Math.sin(angle) * 0.3, 3.77, Math.cos(angle) * 0.22], 7);
    hair.rotation.z = Math.sin(angle) * 0.52;
    hair.rotation.x = Math.cos(angle) * 0.52;
    roots.push(hair);
    root.add(hair);
  }
  for (let i = 0; i < 5; i++) {
    const rootlet = cylinder(0.026, 0.48 + (i % 2) * 0.12, rootMat, [(i - 2) * 0.14, -0.04, 0], 7);
    rootlet.rotation.z = (i - 2) * 0.16;
    root.add(rootlet);
  }

  if (boss) {
    const auraMat = new THREE.MeshStandardMaterial({ color: 0x7f1720, emissive: 0x3a0508, emissiveIntensity: 0.8, metalness: 0.2, roughness: 0.45 });
    const ring = mesh(new THREE.TorusGeometry(0.78, 0.09, 10, 24), auraMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 3.38;
    root.add(ring);
  }

  root.scale.setScalar(scale);
  root.userData = { type: "yam", body, roots, baseScale: scale, boss };
  return root;
}

export function animateCharacter(group, time, speed = 0, attacking = false) {
  if (!group?.userData) return;
  if (group.userData.type === "capybara") {
    const stride = Math.min(speed * 0.15, 0.58);
    group.userData.legs.forEach((leg) => {
      leg.rotation.x = Math.sin(time * (speed > 0.2 ? 9 : 2) + leg.userData.phase) * stride;
    });
    group.userData.body.position.y = 1.23 + Math.sin(time * (speed > 0.2 ? 9 : 2)) * (speed > 0.2 ? 0.035 : 0.018);
    group.userData.head.rotation.x = attacking ? -0.3 : Math.sin(time * 1.7) * 0.025;
  } else if (group.userData.type === "yam") {
    group.userData.body.rotation.z = Math.sin(time * (speed > 0.1 ? 7 : 1.8)) * (speed > 0.1 ? 0.085 : 0.02);
    group.userData.roots.forEach((hair, i) => {
      hair.rotation.y = Math.sin(time * 2.2 + i) * 0.15;
    });
  }
}

export function setCharacterHit(group, hit) {
  group.traverse((child) => {
    if (!child.isMesh || !child.material?.emissive) return;
    if (hit) {
      child.userData.oldEmissive = child.material.emissive.getHex();
      child.material = child.material.clone();
      child.material.emissive.setHex(0xffdddd);
      child.material.emissiveIntensity = 1.5;
    } else if (child.userData.oldEmissive !== undefined) {
      child.material.emissive.setHex(child.userData.oldEmissive);
      child.material.emissiveIntensity = 0;
    }
  });
}
