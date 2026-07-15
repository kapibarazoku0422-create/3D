import * as THREE from "three";
import "./style.css";
import { createCapybara, createYam, animateCharacter, setCharacterHit } from "./models.js";
import {
  CAMPAIGN_START_STAGE,
  CAMPAIGN_EPILOGUE_STAGE,
  STORY_STAGE_COUNT,
  campaignChapters,
  campaignChapterForStage,
  campaignDialog,
  epilogueQuest,
} from "./campaign.js";

const $ = (id) => document.getElementById(id);
const canvas = $("world");
const mapCanvas = $("map");
const mapCtx = mapCanvas.getContext("2d");
const SAVE_KEY = "capybara-empire-save-v2";
const touchDevice = matchMedia("(pointer: coarse)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, touchDevice ? 1.35 : 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9db596);
scene.fog = new THREE.FogExp2(0x8fa590, 0.0135);
const camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, 0.1, 280);
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();

const hemi = new THREE.HemisphereLight(0xcfe4d9, 0x3b2e20, 2.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe7b0, 3.4);
sun.position.set(-38, 58, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(touchDevice ? 1024 : 2048, touchDevice ? 1024 : 2048);
sun.shadow.camera.left = -55; sun.shadow.camera.right = 55; sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 135;
sun.shadow.bias = -0.0003;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);
const fxRoot = new THREE.Group();
scene.add(fxRoot);

const game = {
  started: false, paused: true, dialog: false, ending: false,
  stage: 0, recruits: [], kills: 0, defeated: [], posts: [false, false],
  hp: 120, maxHp: 120, spirit: 0, xp: 0, level: 1,
  attackTime: 0, attackCooldown: 0, skillTime: 0, skillCooldown: 0,
  combo: 0, comboWindow: 0, attackQueued: false, attackLunge: 0,
  hitStop: 0, cameraShake: 0,
  invulnerable: 0, bossIntro: false, bossActive: false, lastSave: 0,
  birthShown: false, ambushTriggered: false, scriptedLoss: 0, lossHit: false,
  cameraYaw: 0, cameraPitch: 0.34, cameraDistance: 9,
  playTime: 0, target: null, sound: true, audio: null,
  chapterProgress: 0, campaignKills: 0, seenCampaignStages: [],
  campaignComplete: false, transitioning: false,
};

const keys = new Set();
const npcs = [];
const enemies = [];
const outposts = [];
const particles = [];
const damageNumbers = [];
const allies = [];
const campaignPool = [];
let campaignBoss = null;
let gate;
let player;
let moveSpeed = 0;
let cameraDragging = false;
let pointerX = 0;
let pointerY = 0;
let mobileMove = { x: 0, y: 0 };

function heightAt(x, z) {
  let h = Math.sin(x * 0.075) * 0.55 + Math.cos(z * 0.055) * 0.65 + Math.sin((x + z) * 0.038) * 0.45;
  const flatten = (cx, cz, radius) => THREE.MathUtils.smoothstep(Math.hypot(x - cx, z - cz), radius, radius * 0.35);
  h *= 1 - flatten(0, 30, 20) * 0.76;
  h *= 1 - flatten(0, -63, 22) * 0.82;
  return h;
}

function createTerrain() {
  const geo = new THREE.PlaneGeometry(150, 170, 88, 96);
  const pos = geo.attributes.position;
  const colors = [];
  const color = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = -pos.getY(i);
    const h = heightAt(x, z);
    pos.setZ(i, h);
    const variation = (Math.sin(x * 1.7 + z * 0.8) + 1) * 0.025;
    if (z < -42) color.setHSL(0.09, 0.28, 0.25 + variation);
    else if (z < 5) color.setHSL(0.19, 0.35, 0.35 + variation);
    else color.setHSL(0.23, 0.38, 0.39 + variation);
    colors.push(color.r, color.g, color.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.rotateX(-Math.PI / 2);
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  terrain.receiveShadow = true;
  world.add(terrain);

  const waterGeo = new THREE.CircleGeometry(12, 48);
  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x527e75, roughness: 0.15, metalness: 0.05, transmission: 0.08, transparent: true, opacity: 0.78 });
  const pond = new THREE.Mesh(waterGeo, waterMat);
  pond.rotation.x = -Math.PI / 2;
  pond.scale.set(1.5, 0.65, 1);
  pond.position.set(-30, -0.25, 22);
  pond.receiveShadow = true;
  world.add(pond);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x75674b, roughness: 1 });
  for (let z = 28; z > -55; z -= 3.8) {
    const x = Math.sin(z * 0.12) * 2.2;
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(2.15 + Math.random() * 0.6, 2.25, 0.08, 8), roadMat);
    stone.scale.z = 0.66;
    stone.position.set(x, heightAt(x, z) + 0.05, z);
    stone.rotation.y = Math.random() * 0.35;
    stone.receiveShadow = true;
    world.add(stone);
  }
}

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4f3828, roughness: 1 });
const leafMats = [0x365d3b, 0x466f3f, 0x526f3d].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
const rockMat = new THREE.MeshStandardMaterial({ color: 0x5d6155, roughness: 1 });

function addNature() {
  const trunkGeo = new THREE.CylinderGeometry(0.26, 0.45, 3.5, 7);
  const leafGeo = new THREE.ConeGeometry(1.5, 3.5, 8);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 76; i++) {
    let x = (Math.random() - 0.5) * 138;
    let z = (Math.random() - 0.5) * 158;
    if (Math.abs(x) < 9 && z > 42) continue;
    if (Math.abs(x) < 10 && z < 42 && z > -70) x += x < 0 ? -16 : 16;
    if (Math.hypot(x, z - 30) < 16 || Math.hypot(x, z + 63) < 20) continue;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.65;
    trunk.castShadow = true;
    const leaves = new THREE.Mesh(leafGeo, leafMats[i % leafMats.length]);
    leaves.position.y = 4.2;
    leaves.castShadow = true;
    tree.add(trunk, leaves);
    const scale = 0.7 + Math.random() * 0.8;
    tree.scale.set(scale, scale, scale);
    tree.position.set(x, heightAt(x, z), z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    world.add(tree);
  }
  for (let i = 0; i < 48; i++) {
    const x = (Math.random() - 0.5) * 138;
    const z = (Math.random() - 0.5) * 158;
    if (Math.abs(x) < 7 && z < 40 && z > -60) continue;
    const rock = new THREE.Mesh(rockGeo, rockMat);
    const s = 0.25 + Math.random() * 0.85;
    rock.scale.set(s, s * 0.65, s * 0.9);
    rock.position.set(x, heightAt(x, z) + s * 0.3, z);
    rock.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    world.add(rock);
  }
}

function banner(x, z, color = 0x8c2826, height = 5) {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x43392b, metalness: 0.2, roughness: 0.65 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, height, 8), poleMat);
  pole.position.y = height / 2;
  pole.castShadow = true;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.15), new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide }));
  cloth.position.set(0.78, height - 0.75, 0);
  const seal = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.31, 16), new THREE.MeshBasicMaterial({ color: 0xe4c86e, side: THREE.DoubleSide }));
  seal.position.set(0.78, height - 0.75, -0.008);
  group.add(pole, cloth, seal);
  group.position.set(x, heightAt(x, z), z);
  world.add(group);
  return group;
}

function addArchitecture() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x503b29, roughness: 0.95 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x25332a, roughness: 1 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x3d4038, roughness: 0.94 });
  const fireMat = new THREE.MeshStandardMaterial({ color: 0xf4a437, emissive: 0xff5a12, emissiveIntensity: 2 });

  [[-10, 33], [10, 33], [-12, 22], [12, 22]].forEach(([x, z], i) => {
    const hut = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 4), wood);
    base.position.y = 1.3; base.castShadow = true;
    const top = new THREE.Mesh(new THREE.ConeGeometry(4, 2.4, 4), roof);
    top.position.y = 3.4; top.rotation.y = Math.PI / 4; top.castShadow = true;
    hut.add(base, top);
    hut.scale.setScalar(0.68 + (i % 2) * 0.12);
    hut.position.set(x, heightAt(x, z), z);
    hut.rotation.y = i % 2 ? -0.2 : 0.2;
    world.add(hut);
  });
  banner(-4, 37); banner(4, 37); banner(0, 16, 0x8c2826, 6);
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.1, 8), fireMat);
  fire.position.set(0, heightAt(0, 29) + 0.56, 29);
  fire.castShadow = true;
  world.add(fire);
  const fireLight = new THREE.PointLight(0xff7b2c, 12, 18, 2);
  fireLight.position.set(0, heightAt(0, 29) + 2, 29);
  world.add(fireLight);

  [-1, 1].forEach((side) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(24, 7, 3.3), stone);
    wall.position.set(side * 15, heightAt(side * 15, -55) + 3.5, -55);
    wall.castShadow = true; wall.receiveShadow = true;
    world.add(wall);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 10, 10), stone);
    tower.position.set(side * 27, heightAt(side * 27, -55) + 5, -55);
    tower.castShadow = true;
    world.add(tower);
    banner(side * 27, -55, 0x5c211d, 10);
  });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(56, 8, 3.5), stone);
  backWall.position.set(0, heightAt(0, -75) + 4, -75);
  backWall.castShadow = true;
  world.add(backWall);
  gate = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 1.7), new THREE.MeshStandardMaterial({ color: 0x3a291f, metalness: 0.25, roughness: 0.7 }));
  gate.position.set(0, heightAt(0, -55) + 4, -54.5);
  gate.castShadow = true;
  world.add(gate);
}

function makeLabel(name, role, color = "#ead493") {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(8,12,10,.76)";
  ctx.beginPath(); ctx.roundRect(42, 16, 428, 92, 12); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = color; ctx.font = "500 25px sans-serif"; ctx.fillText(role, 256, 49);
  ctx.fillStyle = "#fff7df"; ctx.font = "700 36px serif"; ctx.fillText(name, 256, 88);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(5.4, 1.35, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function placeCharacter(model, x, z, label) {
  model.position.set(x, heightAt(x, z), z);
  if (label) model.add(label);
  world.add(model);
  return model;
}

function setupCharacters() {
  player = createCapybara({ scale: 0.72, crown: false });
  placeCharacter(player, 0, 69);

  const npcData = [
    { id: "advisor", name: "かぴ政宗", role: "帝国参謀", scale: 0.68, x: 3, z: 26 },
    { id: "gonta", name: "ごん太", role: "湿原の豪傑", scale: 0.9, x: -10, z: 26 },
    { id: "mame", name: "まめ千代", role: "小さな策士", scale: 0.54, x: 10, z: 24 },
    { id: "don", name: "カピドン", role: "歴戦の衛士", scale: 0.78, x: -7, z: 18 },
  ];
  npcData.forEach((data) => {
    const model = createCapybara({ scale: data.scale });
    const label = makeLabel(data.name, data.role);
    label.position.y = 4.2 / data.scale;
    placeCharacter(model, data.x, data.z, label);
    npcs.push({ ...data, model, label, recruited: false, followIndex: -1 });
  });

  const ambusher = addEnemy({ id: "ambusher", name: "長芋武者 ヤマジ", x: 0, z: 54, scale: 1.12, hp: 9999, damage: 999, region: "ambush", requiredStage: 1 });
  ambusher.model.visible = false;

  const enemyData = [
    // 木漏れ日の谷
    ["mori1", "芋次郎", -9, 12, 0.72, "forest", 4], ["mori2", "芋之助", 9, 8, 0.8, "forest", 4],
    ["mori3", "とろろ丸", -7, 2, 0.68, "forest", 4], ["mori4", "ねば吉", 8, -3, 0.88, "forest", 4],
    // 黄金湿原
    ["numa1", "ねば八", -14, -9, 0.88, "wetland", 5], ["numa2", "ヤマト芋", 14, -11, 0.82, "wetland", 5],
    ["numa3", "芋左衛門", -5, -17, 0.96, "wetland", 5], ["numa4", "ぬめ三郎", 8, -21, 0.74, "wetland", 5],
    ["numa5", "長とろ兵", -16, -26, 0.9, "wetland", 5], ["numa6", "粘之進", 15, -30, 1.0, "wetland", 5],
    // 黒土前線
    ["front1", "黒土番", -20, -36, 1.02, "front", 6], ["front2", "根張丸", 20, -39, 0.96, "front", 6],
    ["front3", "山かけ将", -9, -45, 1.08, "front", 6], ["front4", "芋奉行", 10, -47, 1.12, "front", 6],
  ];
  enemyData.forEach(([id, name, x, z, scale, region, requiredStage], index) => addEnemy({ id, name, x, z, scale, region, requiredStage, hp: 54 + index * 5, damage: 9 + Math.floor(index / 3) }));
  addEnemy({ id: "boss", name: "大長老 ナガトロ", x: 0, z: -65, scale: 1.95, hp: 680, damage: 24, boss: true, region: "boss", requiredStage: 7 });

  const poolSize = touchDevice ? 5 : 7;
  for (let i = 0; i < poolSize; i++) {
    const enemy = addEnemy({ id: `campaign-${i}`, name: "遠征長芋", x: 0, z: -10, scale: 0.9, hp: 100, damage: 10, region: "campaign", requiredStage: CAMPAIGN_START_STAGE, campaign: true });
    enemy.model.visible = false;
    campaignPool.push(enemy);
  }
  campaignBoss = addEnemy({ id: "campaign-boss", name: "遠征大将", x: 0, z: -65, scale: 1.7, hp: 1000, damage: 20, boss: true, region: "campaign", requiredStage: CAMPAIGN_START_STAGE, campaign: true });
  campaignBoss.model.visible = false;
}

function addEnemy({ id, name, x, z, scale, hp, damage, boss = false, region = "field", requiredStage = 4, campaign = false }) {
  const model = createYam({ scale, boss });
  model.position.set(x, heightAt(x, z), z);
  model.rotation.y = Math.random() * Math.PI * 2;
  world.add(model);
  const enemy = { id, name, model, hp, maxHp: hp, damage, boss, region, requiredStage, campaign, campaignStage: -1, dead: false, attackCd: Math.random() * 2, special: 0, origin: new THREE.Vector3(x, 0, z), hitIds: new Set() };
  enemies.push(enemy);
  return enemy;
}

function setupOutposts() {
  [[-16, -36], [16, -41]].forEach(([x, z], i) => {
    const marker = banner(x, z, 0x5c211d, 6);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.05, 32), new THREE.MeshBasicMaterial({ color: 0xf0c75d, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, heightAt(x, z) + 0.08, z);
    world.add(ring);
    outposts.push({ index: i, x, z, marker, ring, captured: false });
  });
}

function addAtmosphere() {
  const count = 420;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 140;
    positions[i * 3 + 1] = 1 + Math.random() * 16;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 155;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xf6dc78, size: 0.09, transparent: true, opacity: 0.5 }));
  points.name = "fireflies";
  scene.add(points);
}

function buildWorld() {
  createTerrain();
  addNature();
  addArchitecture();
  setupOutposts();
  setupCharacters();
  addAtmosphere();
}

const baseQuestData = [
  ["序章", "森に生まれた日", "木漏れ日の道を歩き、森の外を目指す", 1],
  ["序章", "逃れられない襲撃", "現れた長芋武者に立ち向かう", 1],
  ["第一章", "敗北の朝", "野営地のかぴ政宗と話し、決意を固める", 1],
  ["第二章", "ひとりでは勝てない", "3名のカピバラを仲間に迎える", 3],
  ["第三章", "木漏れ日の修行", "森の谷にいる長芋族を4体倒す", 4],
  ["第四章", "黄金湿原の戦い", "湿原に展開した長芋族を6体倒す", 6],
  ["第五章", "黒土前線", "精鋭4体を倒し、前哨旗2か所を制圧する", 6],
  ["最終章", "長芋戦役", "黒土砦で大長老ナガトロを倒す", 1],
];

const questData = [
  ...baseQuestData,
  ...campaignChapters.map((chapter) => [chapter.act, chapter.title, chapter.text, chapter.target]),
  [epilogueQuest.act, epilogueQuest.title, epilogueQuest.text, epilogueQuest.target],
];

function defeatedCount(region) {
  return enemies.filter((enemy) => enemy.region === region && enemy.dead).length;
}

function questProgress() {
  if (game.stage <= 2) return 0;
  if (game.stage === 3) return game.recruits.length;
  if (game.stage === 4) return defeatedCount("forest");
  if (game.stage === 5) return defeatedCount("wetland");
  if (game.stage === 6) return defeatedCount("front") + game.posts.filter(Boolean).length;
  if (game.stage === 7) return enemies.find((enemy) => enemy.id === "boss")?.dead ? 1 : 0;
  if (game.stage === CAMPAIGN_EPILOGUE_STAGE) return 1;
  return game.chapterProgress;
}

function updateQuestUI() {
  const q = questData[game.stage] || questData[questData.length - 1];
  const value = questProgress();
  $("chapter").textContent = q[0];
  $("quest-title").textContent = q[1];
  $("quest-text").textContent = q[2];
  $("quest-count").textContent = `${value} / ${q[3]}`;
  $("quest-bar").style.width = `${Math.min(100, value / q[3] * 100)}%`;
  $("story-progress").textContent = `CHAPTER ${Math.min(game.stage + 1, STORY_STAGE_COUNT)} / ${STORY_STAGE_COUNT}`;
  $("campaign-length").textContent = game.stage >= CAMPAIGN_START_STAGE ? "LONG CAMPAIGN・28–32H" : "第一部・旅立ち";
  outposts.forEach((post, i) => {
    post.captured = !!game.posts[i];
    post.ring.material.color.set(post.captured ? 0x62c681 : 0xf0c75d);
    post.marker.children[1].material.color.set(post.captured ? 0x8c2826 : 0x5c211d);
  });
}

function advanceStage(stage, message) {
  game.stage = stage;
  game.chapterProgress = 0;
  game.transitioning = false;
  updateQuestUI();
  updateParty();
  toast(message);
  playSound("quest");
  if (stage >= CAMPAIGN_START_STAGE) prepareCampaignChapter({ teleport: true, announce: true });
  saveGame();
  if (stage >= 4 && stage <= 6) queueMicrotask(syncJourneyProgress);
}

function syncJourneyProgress() {
  if (game.stage === 4 && defeatedCount("forest") >= 4) advanceStage(5, "森の長芋、先に全部しばいてた。黄金湿原へ行くぞ！");
  else if (game.stage === 5 && defeatedCount("wetland") >= 6) advanceStage(6, "湿原も片づいた。めんどくせーけど黒土前線へ！");
  else if (game.stage === 6) checkFrontComplete();
}

const campaignThemes = {
  dawn: { sky: 0xa9bea1, fog: 0x93aa8f, hemi: 0xd9eadc, ground: 0x443521, sun: 0xffdf9b, density: 0.013 },
  coast: { sky: 0x91b8bd, fog: 0x789fa6, hemi: 0xd8f4ef, ground: 0x33484b, sun: 0xffedc1, density: 0.012 },
  moon: { sky: 0x252b46, fog: 0x343851, hemi: 0x7887bc, ground: 0x201d2d, sun: 0xb9c9ff, density: 0.017 },
  cavern: { sky: 0x241d19, fog: 0x332822, hemi: 0x8e7864, ground: 0x160f0c, sun: 0xf0a55e, density: 0.021 },
  sky: { sky: 0xa8cad8, fog: 0xb6ced4, hemi: 0xe8fbff, ground: 0x51564d, sun: 0xfff0b8, density: 0.009 },
  final: { sky: 0x2c1719, fog: 0x451f20, hemi: 0xa45d5b, ground: 0x170b0b, sun: 0xff765c, density: 0.019 },
};

const campaignSpawns = {
  forest: [[-16, 13], [16, 10], [-11, 2], [12, -3], [-18, -12], [18, -15], [0, -22]],
  marsh: [[-18, -7], [18, -10], [-12, -18], [12, -22], [-20, -29], [20, -31], [0, -38]],
  front: [[-24, -31], [24, -34], [-16, -41], [16, -44], [-26, -48], [26, -48], [0, -50]],
  fortress: [[-19, -47], [19, -47], [-13, -58], [13, -58], [-22, -68], [22, -68], [0, -70]],
};

const campaignStarts = {
  forest: [0, 27], marsh: [0, 8], front: [0, -20], fortress: [0, -39],
};

function applyCampaignTheme(themeName) {
  const theme = campaignThemes[themeName] || campaignThemes.dawn;
  scene.background.setHex(theme.sky);
  scene.fog.color.setHex(theme.fog);
  scene.fog.density = theme.density;
  hemi.color.setHex(theme.hemi);
  hemi.groundColor.setHex(theme.ground);
  sun.color.setHex(theme.sun);
  renderer.toneMappingExposure = themeName === "final" ? 0.92 : 1.05;
}

function hideCampaignEncounter() {
  campaignPool.forEach((enemy) => {
    enemy.dead = true;
    enemy.model.visible = false;
    enemy.campaignStage = -1;
  });
  if (campaignBoss) {
    campaignBoss.dead = true;
    campaignBoss.model.visible = false;
    campaignBoss.campaignStage = -1;
  }
  game.target = null;
  game.bossActive = false;
}

function configureCampaignEnemy(enemy, chapter, slot) {
  const points = campaignSpawns[chapter.arena] || campaignSpawns.forest;
  const [x, z] = points[slot % points.length];
  const scale = 0.72 + (slot % 4) * 0.1 + chapter.actIndex * 0.035;
  const elite = chapter.elite || 1;
  const hp = Math.round((250 + chapter.stage * 42) * elite);
  enemy.name = chapter.enemies[(game.campaignKills + slot) % chapter.enemies.length];
  enemy.maxHp = hp;
  enemy.hp = hp;
  enemy.damage = Math.round((12 + chapter.stage * 0.72) * Math.min(elite, 1.3));
  enemy.dead = false;
  enemy.campaignStage = game.stage;
  enemy.attackCd = 0.7 + Math.random();
  enemy.model.scale.setScalar(scale);
  enemy.model.userData.baseScale = scale;
  enemy.model.position.set(x + (Math.random() - 0.5) * 2.5, heightAt(x, z), z + (Math.random() - 0.5) * 2.5);
  enemy.origin.copy(enemy.model.position);
  enemy.model.visible = true;
}

function respawnCampaignEnemy(enemy, stage) {
  setTimeout(() => {
    const chapter = campaignChapterForStage(game.stage);
    if (!chapter || chapter.kind !== "battle" || stage !== game.stage || game.transitioning || game.chapterProgress >= chapter.target) return;
    configureCampaignEnemy(enemy, chapter, campaignPool.indexOf(enemy));
  }, 1350);
}

function prepareCampaignChapter({ teleport = false, announce = false } = {}) {
  hideCampaignEncounter();
  const nagatoro = enemies.find((enemy) => enemy.id === "boss");
  if (nagatoro) {
    nagatoro.dead = true;
    nagatoro.model.visible = false;
  }
  if (game.stage === CAMPAIGN_EPILOGUE_STAGE) {
    applyCampaignTheme("dawn");
    if (teleport) player.position.set(0, heightAt(0, 30), 30);
    return;
  }
  const chapter = campaignChapterForStage(game.stage);
  if (!chapter) return;
  applyCampaignTheme(chapter.theme);
  if (teleport) {
    const [x, z] = chapter.kind === "talk" ? [1, 28] : (campaignStarts[chapter.arena] || campaignStarts.forest);
    player.position.set(x, heightAt(x, z), z);
    player.rotation.y = 0;
  }
  if (chapter.kind === "battle") {
    campaignPool.forEach((enemy, slot) => configureCampaignEnemy(enemy, chapter, slot));
  } else if (chapter.kind === "boss" && campaignBoss) {
    const point = (campaignSpawns[chapter.arena] || campaignSpawns.fortress).at(-1);
    campaignBoss.name = chapter.boss.name;
    campaignBoss.maxHp = chapter.boss.hp;
    campaignBoss.hp = chapter.boss.hp;
    campaignBoss.damage = chapter.boss.damage;
    campaignBoss.dead = false;
    campaignBoss.campaignStage = game.stage;
    campaignBoss.model.scale.setScalar(chapter.boss.scale);
    campaignBoss.model.userData.baseScale = chapter.boss.scale;
    campaignBoss.model.position.set(point[0], heightAt(point[0], point[1]), point[1]);
    campaignBoss.origin.copy(campaignBoss.model.position);
    campaignBoss.model.visible = true;
    game.bossActive = true;
  }
  if (announce && chapter.kind !== "talk" && !game.seenCampaignStages.includes(game.stage)) {
    game.seenCampaignStages.push(game.stage);
    setTimeout(() => {
      if (game.started && game.stage === chapter.stage && !game.dialog) showDialog(campaignDialog(chapter));
    }, 550);
  }
}

function showCampaignMilestone(final = false) {
  $("ending-kicker").textContent = final ? "THE 30-HOUR CHRONICLE COMPLETE" : "FIRST CAMPAIGN COMPLETE";
  $("ending-title").textContent = final ? "めんどくせーけど、いい帝国。" : "第一部完。帝国、建国。";
  $("ending-text").innerHTML = final
    ? "六つの戦場とすべての仲間が、長芋族との歴史に決着をつけた。<br>カピノブの帝国は、ここからも続いていく。"
    : "大長老ナガトロは倒れた。だが建国した瞬間から、<br>残党、海道、内乱、地底、そして空から新たな面倒が押し寄せる。";
  $("ending-close").textContent = final ? "帝国を歩き続ける" : "第二部・建国の火種へ";
  game.ending = true;
  game.paused = true;
  $("ending").classList.remove("hidden");
  playSound("victory");
}

function completeCampaignChapter() {
  const chapter = campaignChapterForStage(game.stage);
  if (!chapter || game.transitioning) return;
  game.transitioning = true;
  hideCampaignEncounter();
  const reward = 90 + chapter.actIndex * 45;
  gainXp(reward);
  game.hp = game.maxHp;
  game.spirit = 100;
  saveGame();
  setTimeout(() => {
    if (chapter.final) {
      game.campaignComplete = true;
      advanceStage(CAMPAIGN_EPILOGUE_STAGE, "長い戦い、今度こそ本当に終了！ 温泉行くぞ！");
      showCampaignMilestone(true);
      return;
    }
    advanceStage(game.stage + 1, `${chapter.title}、完了。次もめんどくせーけど行くぞ！`);
  }, 850);
}

function defeatCampaignEnemy(enemy) {
  enemy.dead = true;
  enemy.model.visible = false;
  game.target = null;
  game.kills++;
  game.campaignKills++;
  game.chapterProgress++;
  const chapter = campaignChapterForStage(game.stage);
  gainXp(52 + chapter.actIndex * 12);
  updateQuestUI();
  saveGame();
  if (game.chapterProgress >= chapter.target) completeCampaignChapter();
  else if (!enemy.boss) respawnCampaignEnemy(enemy, game.stage);
}

function beginAmbush() {
  if (game.ambushTriggered || game.stage !== 0) return;
  game.ambushTriggered = true;
  game.stage = 1;
  const ambusher = enemies.find((enemy) => enemy.id === "ambusher");
  ambusher.model.visible = true;
  ambusher.model.position.set(0, heightAt(0, 54), 54);
  ambusher.model.rotation.y = Math.PI;
  updateQuestUI();
  playSound("deny");
  showDialog([
    { kind: "yam", role: "やたら偉そうな長芋武者", name: "ヤマジ", text: "ネバッ！ そこの丸い毛玉！ この先は長芋専用道路だ。通行料はお前のグラサンな！" },
    { role: "生後まもないグラサン", name: "カピノブ", text: "なんだコイツ、縦に長ぇし急にカツアゲしてくるし。めんどくせーけど、グラサンは渡さねぇ！" },
  ], () => {
    game.scriptedLoss = 2.8;
    toast("強制負けイベントです。マジで勝てません");
  });
}

function updateStoryTriggers() {
  if (game.stage === 0 && player.position.z < 59) beginAmbush();
}

function updateScriptedLoss(dt) {
  const ambusher = enemies.find((enemy) => enemy.id === "ambusher");
  if (!ambusher || !ambusher.model.visible || game.lossHit) return;
  game.scriptedLoss = Math.max(0, game.scriptedLoss - dt);
  const direction = player.position.clone().sub(ambusher.model.position);
  direction.y = 0;
  const distance = direction.length();
  direction.normalize();
  ambusher.model.position.addScaledVector(direction, 8.5 * dt);
  ambusher.model.position.y = heightAt(ambusher.model.position.x, ambusher.model.position.z);
  ambusher.model.rotation.y = Math.atan2(-direction.x, -direction.z);
  animateCharacter(ambusher.model, clock.elapsedTime, 8, true);
  animateCharacter(player, clock.elapsedTime, 0, false);
  player.rotation.y = Math.atan2(direction.x, direction.z);
  if (distance < 2.8 || game.scriptedLoss <= 0.25) finishScriptedLoss(ambusher);
}

function finishScriptedLoss(ambusher) {
  if (game.lossHit) return;
  game.lossHit = true;
  game.scriptedLoss = 0;
  game.hp = 0;
  game.paused = true;
  $("damage-flash").classList.add("show");
  $("loss-scene").classList.remove("hidden");
  burst(player.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xd04c3c, 34);
  playSound("hurt");
  setTimeout(() => {
    $("damage-flash").classList.remove("show");
    $("loss-scene").classList.add("hidden");
    ambusher.name = "ヤマジ（再戦）";
    ambusher.region = "revenge";
    ambusher.requiredStage = 3;
    ambusher.maxHp = 150;
    ambusher.hp = 150;
    ambusher.damage = 14;
    ambusher.dead = false;
    ambusher.model.visible = true;
    ambusher.model.position.set(8, heightAt(8, 52), 52);
    player.position.set(0, heightAt(0, 32), 32);
    player.rotation.y = 0;
    game.hp = game.maxHp;
    game.spirit = 0;
    game.stage = 2;
    game.paused = false;
    updateQuestUI();
    updateHud();
    saveGame();
    showDialog([
      { role: "語り（ちょっと笑ってる）", name: "敗北の翌朝", text: "カピノブ、生まれてすぐ長芋にボコられる。森のはずれで拾われ、なんとも締まらない冒険初日を終えた。" },
      { role: "一回ボコられたグラサン", name: "カピノブ", text: "あの長芋マジでムカつく。めんどくせーけど、強くなって絶対しばく。まずはそこにいるカピバラに聞くか。" },
    ]);
  }, 2600);
}

function showDialog(pages, onDone) {
  game.dialog = true;
  const layer = $("dialog-layer");
  layer.classList.remove("hidden");
  let index = 0;
  const render = () => {
    const page = pages[index];
    $("dialog-role").textContent = page.role;
    $("dialog-name").textContent = page.name;
    $("dialog-text").textContent = page.text;
    $("dialog-image").src = page.kind === "yam" ? "/art/nagaimo.png" : "/art/capybara.png";
    $("dialog-next").innerHTML = index === pages.length - 1 ? "閉じる <span>▶</span>" : "次へ <span>▶</span>";
  };
  $("dialog-next").onclick = () => {
    playSound("click");
    index++;
    if (index < pages.length) render();
    else {
      layer.classList.add("hidden");
      game.dialog = false;
      if (onDone) onDone();
    }
  };
  render();
}

function interact() {
  if (!game.started || game.paused || game.dialog) return;
  let closest = null;
  let closestDist = 4.2;
  npcs.forEach((npc) => {
    const d = horizontalDistance(player.position, npc.model.position);
    if (d < closestDist) { closest = { type: "npc", item: npc }; closestDist = d; }
  });
  outposts.forEach((post) => {
    const d = Math.hypot(player.position.x - post.x, player.position.z - post.z);
    if (d < closestDist) { closest = { type: "post", item: post }; closestDist = d; }
  });
  if (!closest) return;

  if (closest.type === "post") {
    const post = closest.item;
    if (game.stage !== 6 || game.posts[post.index]) {
      toast(game.posts[post.index] ? "そこ、もう取ったって。旗二度抜きは禁止" : "まだ早い。順番くらい守るか、めんどくせーけど");
      return;
    }
    game.posts[post.index] = true;
    updateQuestUI();
    burst(new THREE.Vector3(post.x, heightAt(post.x, post.z) + 2, post.z), 0xe9c76b, 22);
    playSound("quest");
    toast(`前哨地 ${post.index + 1}、はいカピバラのものー！`);
    checkFrontComplete();
    saveGame();
    return;
  }

  const npc = closest.item;
  const campaignChapter = campaignChapterForStage(game.stage);
  if (npc.id === "advisor" && campaignChapter?.kind === "talk") {
    if (!game.seenCampaignStages.includes(game.stage)) game.seenCampaignStages.push(game.stage);
    showDialog(campaignDialog(campaignChapter), () => {
      game.chapterProgress = 1;
      updateQuestUI();
      completeCampaignChapter();
    });
    return;
  }
  if (npc.id === "advisor" && game.stage === 2) {
    showDialog([
      { role: npc.role, name: npc.name, text: "お、起きた？ お前、森で長芋にボコボコにされてたぞ。生まれた初日にあれは逆に才能ある。" },
      { role: "一回ボコられたグラサン", name: "カピノブ", text: "うるせー。あの縦長、次は絶対しばく。とはいえ一匹で行くの、正直めんどくせー。" },
      { role: npc.role, name: npc.name, text: "それな。じゃあ仲間を三匹集めろ。大きいの、小さいの、なんか強そうなの。人選はだいたい雰囲気でいい。" },
    ], () => advanceStage(3, "長芋討伐、ノリと勢いで開始！"));
    return;
  }
  if (game.stage === 3 && npc.id !== "advisor" && !npc.recruited) {
    const lines = {
      gonta: "長芋しばくの？ いいじゃん。細かい作戦はめんどくせーから、正面からドーンでいこうぜ！",
      mame: "え、長芋討伐？ 報酬は温泉三時間でお願いします。まあ体は小さいけど、態度はデカいんで。",
      don: "俺もあいつら嫌い。ぬるっとしてて持ちにくいし。とりあえず一緒に行くわ。",
    };
    showDialog([{ role: npc.role, name: npc.name, text: lines[npc.id] }], () => recruit(npc));
    return;
  }
  const fallback = npc.recruited ? "まだ行くの？ めんどくせー。でも置いてくともっと面倒だから一緒に行く。" : game.stage < 2 ? "なんか森の奥でドカーンって聞こえたけど、お前だったの？" : "かぴ政宗が呼んでたぞ。話長いけど一応聞いとけ。";
  showDialog([{ role: npc.role, name: npc.name, text: fallback }]);
}

function recruit(npc) {
  npc.recruited = true;
  npc.followIndex = allies.length;
  allies.push(npc);
  if (!game.recruits.includes(npc.id)) game.recruits.push(npc.id);
  updateParty();
  updateQuestUI();
  burst(npc.model.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xe9c76b, 18);
  toast(`${npc.name}、なんとなく仲間になった！`);
  if (game.recruits.length >= 3) advanceStage(4, "3匹そろった。人数でゴリ押すぞ！");
  else saveGame();
}

function updateParty() {
  const members = [game.stage >= CAMPAIGN_START_STAGE ? "帝" : "旅", ...allies.map((n) => n.name[0])];
  $("party-title").textContent = game.stage >= CAMPAIGN_START_STAGE ? "カピバラ帝国遠征軍" : game.stage >= 4 ? "討伐隊" : "旅の仲間";
  $("party-count").textContent = `${members.length} / 4`;
  $("party-list").innerHTML = [0, 1, 2, 3].map((i) => `<span class="${i < members.length ? "active" : ""}">${members[i] || "—"}</span>`).join("");
}

function attack() {
  if (!game.started || game.paused || game.dialog) return;
  if (game.attackCooldown > 0) {
    game.attackQueued = true;
    return;
  }
  game.combo = game.comboWindow > 0 ? game.combo % 3 + 1 : 1;
  game.comboWindow = 0.72;
  game.attackTime = game.combo === 3 ? 0.42 : 0.3;
  game.attackCooldown = game.combo === 3 ? 0.4 : 0.27;
  game.attackLunge = game.combo === 3 ? 7.5 : 4.8;
  const autoTarget = findAutoTarget(game.combo === 3 ? 11.5 : 10.5);
  if (autoTarget) {
    const aim = autoTarget.model.position.clone().sub(player.position);
    aim.y = 0;
    const aimDistance = aim.length();
    player.rotation.y = Math.atan2(-aim.x, -aim.z);
    if (aimDistance > 3.5) {
      player.position.addScaledVector(aim.normalize(), Math.min(4, aimDistance - 3.5));
      player.position.y = heightAt(player.position.x, player.position.z);
    }
    game.target = autoTarget;
  }
  playSound("attack");
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
  const center = player.position.clone().addScaledVector(forward, 1.7);
  slashEffect(center, player.rotation.y, game.combo);
  let hits = 0;
  enemies.forEach((enemy) => {
    if (enemy.dead || !enemyIsActive(enemy)) return;
    const to = enemy.model.position.clone().sub(player.position);
    const distance = Math.hypot(to.x, to.z);
    to.y = 0; to.normalize();
    const reach = (enemy.boss ? 6.5 : 6.25) + game.combo * 0.28;
    if (distance < reach && forward.dot(to) > -0.18) {
      const multiplier = game.combo === 3 ? 1.65 : game.combo === 2 ? 1.18 : 1;
      damageEnemy(enemy, Math.round((22 + game.level * 5) * multiplier), false, game.combo);
      hits++;
    }
  });
  if (hits === 0) game.cameraShake = Math.max(game.cameraShake, 0.035);
  const comboEl = $("combo-display");
  comboEl.classList.remove("show", "heavy");
  if (hits > 0) {
    comboEl.textContent = game.combo === 3 ? "3 HIT　ドゴォン！" : `${game.combo} HIT`;
    void comboEl.offsetWidth;
    comboEl.classList.add("show");
    if (game.combo === 3) comboEl.classList.add("heavy");
  }
}

function findAutoTarget(maxRange) {
  let nearest = null;
  let nearestDistance = maxRange;
  enemies.forEach((enemy) => {
    if (enemy.dead || !enemy.model.visible || !enemyIsActive(enemy)) return;
    const distance = horizontalDistance(player.position, enemy.model.position);
    if (distance < nearestDistance) { nearest = enemy; nearestDistance = distance; }
  });
  return nearest;
}

function useSkill() {
  if (!game.started || game.paused || game.dialog || game.skillCooldown > 0) return;
  if (game.spirit < 50) { toast("覇気足りねー。気合いでどうにか……は無理"); playSound("deny"); return; }
  game.spirit -= 50;
  game.skillTime = 0.72;
  game.skillCooldown = 2.4;
  game.invulnerable = 0.85;
  game.skillHits = new Set();
  playSound("skill");
  toast("どけどけー！ 帝王突進！");
}

function enemyIsActive(enemy) {
  if (enemy.region === "ambush") return false;
  if (enemy.campaign) return enemy.campaignStage === game.stage && game.stage >= CAMPAIGN_START_STAGE;
  if (enemy.boss) return game.stage >= 7;
  if (enemy.region === "revenge") return game.stage >= 3;
  return game.stage >= 2;
}

function damageEnemy(enemy, amount, skill, combo = 0) {
  if (enemy.dead) return;
  if (skill && game.skillHits.has(enemy.id)) return;
  if (skill) game.skillHits.add(enemy.id);
  enemy.hp = Math.max(0, enemy.hp - amount);
  game.spirit = Math.min(100, game.spirit + (enemy.boss ? 9 : 14));
  setCharacterHit(enemy.model, true);
  setTimeout(() => !enemy.dead && setCharacterHit(enemy.model, false), 110);
  const impactPosition = enemy.model.position.clone().add(new THREE.Vector3(0, enemy.boss ? 3 : 1.7, 0));
  const heavy = skill || combo === 3;
  burst(impactPosition, heavy ? 0xffed8e : 0xffa66e, heavy ? 30 : 16);
  impactEffect(impactPosition, heavy);
  showDamageNumber(impactPosition, amount, heavy);
  const knockback = enemy.model.position.clone().sub(player.position).setY(0).normalize();
  enemy.model.position.addScaledVector(knockback, enemy.boss ? 0.18 : heavy ? 0.72 : 0.42);
  game.hitStop = Math.max(game.hitStop, heavy ? 0.09 : 0.052);
  game.cameraShake = Math.max(game.cameraShake, heavy ? 0.32 : 0.16);
  $("hit-flash").classList.add("show");
  setTimeout(() => $("hit-flash").classList.remove("show"), heavy ? 120 : 75);
  if (touchDevice && navigator.vibrate) navigator.vibrate(heavy ? 28 : 14);
  playSound(heavy ? "heavyHit" : "hit");
  game.target = enemy;
  if (enemy.hp <= 0) defeatEnemy(enemy);
}

function defeatEnemy(enemy) {
  if (enemy.campaign) {
    defeatCampaignEnemy(enemy);
    return;
  }
  enemy.dead = true;
  enemy.model.visible = false;
  if (!game.defeated.includes(enemy.id)) game.defeated.push(enemy.id);
  if (enemy.boss) {
    game.bossActive = false;
    game.target = null;
    gainXp(350);
    advanceStage(8, "大長老ナガトロを撃破！");
    setTimeout(() => showCampaignMilestone(false), 900);
  } else {
    game.kills++;
    gainXp(42);
    toast(`${enemy.name} を倒した`);
    if (game.stage === 4 && defeatedCount("forest") >= 4) advanceStage(5, "森の長芋は全員しばいた。次、湿原！");
    else if (game.stage === 5 && defeatedCount("wetland") >= 6) advanceStage(6, "まだいるのかよ！ 次は黒土前線だ！");
    else if (game.stage === 6) checkFrontComplete();
    updateQuestUI();
    saveGame();
  }
}

function checkFrontComplete() {
  if (game.stage === 6 && defeatedCount("front") >= 4 && game.posts.every(Boolean)) {
    advanceStage(7, "すべての旅が力になった。黒土砦の門が開く！");
  } else {
    updateQuestUI();
  }
}

function gainXp(amount) {
  game.xp += amount;
  const need = game.level * 115;
  if (game.xp >= need) {
    game.xp -= need; game.level++;
    game.maxHp += 24; game.hp = game.maxHp;
    toast(`LEVEL UP　Lv.${game.level}！ なんか強くなった気がする`);
    playSound("level");
    burst(player.position.clone().add(new THREE.Vector3(0, 2, 0)), 0x8de6b1, 28);
  }
}

function hurtPlayer(amount) {
  if (game.invulnerable > 0 || game.hp <= 0) return;
  game.hp = Math.max(0, game.hp - amount);
  game.invulnerable = 0.72;
  $("damage-flash").classList.add("show");
  setTimeout(() => $("damage-flash").classList.remove("show"), 170);
  playSound("hurt");
  if (game.hp <= 0) {
    toast("痛ってぇ！ 今日はこのへんで勘弁しといてやる！");
    game.paused = true;
    setTimeout(() => {
      player.position.set(0, heightAt(0, 31), 31);
      game.hp = game.maxHp;
      game.spirit = Math.max(0, game.spirit - 25);
      game.paused = false;
    }, 1800);
  }
}

function horizontalDistance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

function burst(position, color, count = 12) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true });
  for (let i = 0; i < count; i++) {
    const item = new THREE.Mesh(new THREE.SphereGeometry(0.055 + Math.random() * 0.07, 6, 5), material.clone());
    item.position.copy(position);
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.4 + Math.random() * 4;
    item.userData.velocity = new THREE.Vector3(Math.cos(angle) * speed, 2 + Math.random() * 3.5, Math.sin(angle) * speed);
    item.userData.life = 0.65 + Math.random() * 0.35;
    particles.push(item);
    fxRoot.add(item);
  }
}

function slashEffect(position, rotation, combo = 1) {
  const colors = [0xfff1ac, 0xffc76c, 0xff704d];
  const mat = new THREE.MeshBasicMaterial({ color: colors[combo - 1], transparent: true, opacity: 0.95, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const radius = 1.25 + combo * 0.28;
  const slash = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 0.22, 34, 1, -1.15, 2.3), mat);
  slash.rotation.set(Math.PI / 2, 0, rotation + Math.PI / 2);
  slash.position.copy(position).add(new THREE.Vector3(0, 1.05, 0));
  slash.userData.life = combo === 3 ? 0.3 : 0.22;
  slash.userData.slash = true;
  particles.push(slash);
  fxRoot.add(slash);
  if (combo === 3) {
    const shock = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.95, 36), mat.clone());
    shock.rotation.x = -Math.PI / 2;
    shock.position.copy(position).setY(heightAt(position.x, position.z) + 0.12);
    shock.userData.life = 0.34;
    shock.userData.slash = true;
    particles.push(shock);
    fxRoot.add(shock);
  }
}

function impactEffect(position, heavy) {
  const mat = new THREE.MeshBasicMaterial({ color: heavy ? 0xffdf69 : 0xffffff, transparent: true, opacity: 1, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const impact = new THREE.Mesh(new THREE.RingGeometry(heavy ? 0.65 : 0.38, heavy ? 0.9 : 0.56, 24), mat);
  impact.position.copy(position);
  impact.lookAt(camera.position);
  impact.userData.life = heavy ? 0.28 : 0.18;
  impact.userData.slash = true;
  particles.push(impact);
  fxRoot.add(impact);
}

function showDamageNumber(position, amount, heavy) {
  const el = document.createElement("div");
  el.className = `damage-number${heavy ? " heavy" : ""}`;
  el.textContent = heavy ? `${amount}!!` : amount;
  $("hud").appendChild(el);
  damageNumbers.push({ el, position: position.clone(), life: heavy ? 0.9 : 0.7, maxLife: heavy ? 0.9 : 0.7 });
}

function updateDamageNumbers(dt) {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    const item = damageNumbers[i];
    item.life -= dt;
    item.position.y += dt * 1.35;
    const projected = item.position.clone().project(camera);
    item.el.style.left = `${(projected.x * 0.5 + 0.5) * innerWidth}px`;
    item.el.style.top = `${(-projected.y * 0.5 + 0.5) * innerHeight}px`;
    item.el.style.opacity = `${Math.max(0, item.life / item.maxLife)}`;
    item.el.style.transform = `translate(-50%,-50%) scale(${1 + (1 - item.life / item.maxLife) * 0.35})`;
    if (item.life <= 0) { item.el.remove(); damageNumbers.splice(i, 1); }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.userData.life -= dt;
    if (p.userData.slash) {
      p.scale.multiplyScalar(1 + dt * 5);
      p.material.opacity = Math.max(0, p.userData.life * 4);
    } else {
      p.userData.velocity.y -= 8 * dt;
      p.position.addScaledVector(p.userData.velocity, dt);
      p.material.opacity = Math.max(0, p.userData.life);
    }
    if (p.userData.life <= 0) { fxRoot.remove(p); p.geometry.dispose(); p.material.dispose(); particles.splice(i, 1); }
  }
}

function updatePlayer(dt, time) {
  let x = 0, z = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) z += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) z -= 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  x += mobileMove.x; z += -mobileMove.y;
  const move = new THREE.Vector3();
  const forward = new THREE.Vector3(-Math.sin(game.cameraYaw), 0, -Math.cos(game.cameraYaw));
  const right = new THREE.Vector3(Math.cos(game.cameraYaw), 0, -Math.sin(game.cameraYaw));
  move.addScaledVector(forward, z).addScaledVector(right, x);
  if (move.lengthSq() > 1) move.normalize();
  const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight") || Math.hypot(mobileMove.x, mobileMove.y) > 0.78;
  let speed = sprint ? 9.4 : 6.1;
  if (game.attackTime > 0) speed *= 0.22;
  if (game.skillTime > 0) {
    speed = 18;
    move.set(0, 0, -1).applyQuaternion(player.quaternion);
    enemies.forEach((enemy) => {
      if (!enemy.dead && enemyIsActive(enemy) && horizontalDistance(player.position, enemy.model.position) < (enemy.boss ? 5 : 3.2)) damageEnemy(enemy, 52 + game.level * 6, true);
    });
    burst(player.position.clone().add(new THREE.Vector3(0, 0.4, 0)), 0xe9c76b, 2);
  }
  if (game.attackTime > 0 && game.attackLunge > 0) {
    const attackForward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
    player.position.addScaledVector(attackForward, game.attackLunge * dt);
    game.attackLunge = Math.max(0, game.attackLunge - dt * 20);
  }
  moveSpeed = THREE.MathUtils.lerp(moveSpeed, move.length() * speed, 1 - Math.exp(-dt * 10));
  if (move.lengthSq() > 0.001) {
    const next = player.position.clone().addScaledVector(move, speed * dt);
    next.x = THREE.MathUtils.clamp(next.x, -69, 69);
    next.z = THREE.MathUtils.clamp(next.z, -78, 73);
    if (game.stage < 7 && next.z < -49 && Math.abs(next.x) < 7) {
      next.z = -49; toast("門かってぇ！ めんどくせーけど前哨旗を先に抜くぞ");
    }
    player.position.x = next.x; player.position.z = next.z;
    const targetRot = Math.atan2(-move.x, -move.z);
    let diff = targetRot - player.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    player.rotation.y += diff * (1 - Math.exp(-dt * 13));
  }
  player.position.y = heightAt(player.position.x, player.position.z);
  animateCharacter(player, time, moveSpeed, game.attackTime > 0);

  allies.forEach((npc, i) => {
    const angle = player.rotation.y;
    const side = (i - 1) * 2.1;
    const back = 3.2 + (i % 2) * 1.2;
    const target = new THREE.Vector3(
      player.position.x + Math.cos(angle) * side + Math.sin(angle) * back,
      0,
      player.position.z - Math.sin(angle) * side + Math.cos(angle) * back,
    );
    const delta = target.sub(npc.model.position); delta.y = 0;
    const dist = delta.length();
    if (dist > 12) npc.model.position.lerp(target, 0.5);
    else if (dist > 1.1) npc.model.position.addScaledVector(delta.normalize(), Math.min(7.5, dist * 2.2) * dt);
    npc.model.position.y = heightAt(npc.model.position.x, npc.model.position.z);
    if (dist > 0.4) npc.model.rotation.y = Math.atan2(-delta.x, -delta.z);
    animateCharacter(npc.model, time + i * 0.4, dist > 1.1 ? 5 : 0, false);
  });
  npcs.filter((n) => !n.recruited).forEach((npc, i) => animateCharacter(npc.model, time + i, 0, false));
}

function updateEnemies(dt, time) {
  game.target = null;
  let closest = Infinity;
  enemies.forEach((enemy, index) => {
    if (enemy.dead || !enemy.model.visible) return;
    if (enemy.region === "ambush") { animateCharacter(enemy.model, time, game.scriptedLoss > 0 ? 7 : 0, game.scriptedLoss > 0); return; }
    enemy.attackCd -= dt;
    const active = enemyIsActive(enemy);
    const dist = horizontalDistance(player.position, enemy.model.position);
    if (active && dist < closest && dist < (enemy.boss ? 22 : 12)) { closest = dist; game.target = enemy; }

    if (enemy.boss && !enemy.campaign && active && dist < 18 && !game.bossIntro) {
      game.bossIntro = true; game.bossActive = true;
      showDialog([
        { kind: "yam", role: "話が長そうなラスボス", name: "大長老 ナガトロ", text: "ネバァァ……よくぞ来た丸い毛玉よ。我こそは長芋族四千年の歴史を背負いし——" },
        { role: "話を最後まで聞かないグラサン", name: "カピノブ", text: "あー、話長ぇ。めんどくせーからもう戦おうぜ。こっちは森からずっと歩いてきて足パンパンなんだよ！" },
      ]);
    }

    let speed = 0;
    if (active && dist < (enemy.boss ? 25 : 15)) {
      const dir = player.position.clone().sub(enemy.model.position); dir.y = 0; dir.normalize();
      const face = Math.atan2(-dir.x, -dir.z);
      enemy.model.rotation.y = face;
      const range = enemy.boss ? 3.8 : 2.1;
      if (dist > range) {
        speed = enemy.boss ? 2.65 : 2.8 + index * 0.08;
        enemy.model.position.addScaledVector(dir, speed * dt);
      } else if (enemy.attackCd <= 0) {
        enemy.attackCd = enemy.boss ? 2.25 : 1.45 + Math.random() * 0.55;
        setTimeout(() => {
          if (!enemy.dead && horizontalDistance(player.position, enemy.model.position) < range + 1.1 && !game.paused) hurtPlayer(enemy.damage);
        }, enemy.boss ? 520 : 330);
      }
    } else if (!enemy.boss) {
      enemy.model.rotation.y += Math.sin(time * 0.4 + index) * dt * 0.12;
    }
    enemy.model.position.y = heightAt(enemy.model.position.x, enemy.model.position.z);
    const attackPose = enemy.attackCd > (enemy.boss ? 1.65 : 1.05);
    animateCharacter(enemy.model, time + index * 0.5, speed, attackPose);
    if (attackPose) enemy.model.userData.body.scale.y = 0.88 + Math.sin(time * 18) * 0.05;
    else enemy.model.userData.body.scale.y = THREE.MathUtils.lerp(enemy.model.userData.body.scale.y, 1, dt * 8);
  });
}

function updateCamera(dt) {
  const target = player.position.clone().add(new THREE.Vector3(0, 1.7, 0));
  const horizontal = Math.cos(game.cameraPitch) * game.cameraDistance;
  const desired = new THREE.Vector3(
    target.x + Math.sin(game.cameraYaw) * horizontal,
    target.y + Math.sin(game.cameraPitch) * game.cameraDistance + 1.2,
    target.z + Math.cos(game.cameraYaw) * horizontal,
  );
  const minY = heightAt(desired.x, desired.z) + 1;
  desired.y = Math.max(desired.y, minY);
  camera.position.lerp(desired, 1 - Math.exp(-dt * 8));
  if (game.cameraShake > 0) {
    const strength = game.cameraShake;
    camera.position.x += (Math.random() - 0.5) * strength;
    camera.position.y += (Math.random() - 0.5) * strength * 0.7;
    camera.position.z += (Math.random() - 0.5) * strength;
    game.cameraShake = Math.max(0, game.cameraShake - dt * 1.8);
  }
  camera.lookAt(target);
  sun.position.x = player.position.x - 38;
  sun.position.z = player.position.z + 25;
  sun.target.position.copy(player.position);
  scene.add(sun.target);
}

function updateInteraction() {
  let text = "";
  npcs.forEach((npc) => {
    if (horizontalDistance(player.position, npc.model.position) < 4.2) text = npc.id === "advisor" || npc.recruited ? `${npc.name}と話す` : `${npc.name}を勧誘する`;
  });
  outposts.forEach((post) => {
    if (Math.hypot(player.position.x - post.x, player.position.z - post.z) < 4.2) text = post.captured ? "制圧済み" : "前哨旗を制圧する";
  });
  $("interaction").classList.toggle("hidden", !text || game.dialog);
  if (text) $("interaction-text").textContent = text;
}

function updateHud() {
  $("hp-bar").style.width = `${game.hp / game.maxHp * 100}%`;
  $("hp-text").textContent = `${Math.ceil(game.hp)} / ${game.maxHp}`;
  $("spirit-bar").style.width = `${game.spirit}%`;
  $("spirit-text").textContent = `${Math.floor(game.spirit)}%`;
  $("player-level").textContent = `LV. ${game.level}`;
  const role = game.stage < 3 ? "森に生まれた者" : game.stage < 7 ? "長芋を追う旅人" : game.stage < 8 ? "カピバラ隊長" : game.stage < 20 ? "めんどくさがり建国王" : game.stage < 32 ? "六道遠征王" : "カピバラ皇帝";
  $("player-role").textContent = role;
  $("player-name").textContent = game.stage < 2 ? "カピノブ" : game.stage >= CAMPAIGN_START_STAGE ? "建国王・カピノブ" : "カピバラ・カピノブ";
  $("xp-bar").style.width = `${game.xp / (game.level * 115) * 100}%`;
  $("skill-btn").classList.toggle("cooldown", game.skillCooldown > 0 || game.spirit < 50);
  const target = game.target;
  $("target-card").classList.toggle("hidden", !target || target.boss);
  if (target && !target.boss) {
    $("target-name").textContent = target.name;
    $("target-hp").style.width = `${target.hp / target.maxHp * 100}%`;
  }
  const boss = enemies.find((enemy) => enemy.boss && !enemy.dead && enemy.model.visible && enemyIsActive(enemy));
  $("boss-bar").classList.toggle("hidden", !game.bossActive || !boss);
  if (boss) {
    $("boss-kind").textContent = boss.campaign ? "長芋族・遠征大将" : "長芋族・大族長";
    $("boss-name").textContent = boss.name;
    $("boss-hp").style.width = `${boss.hp / boss.maxHp * 100}%`;
  }
  const hours = Math.floor(game.playTime / 3600);
  const minutes = Math.floor(game.playTime % 3600 / 60);
  $("play-time").textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const campaignChapter = campaignChapterForStage(game.stage);
  if (campaignChapter) {
    $("zone-name").textContent = campaignChapter.zone;
    return;
  }
  if (game.stage === CAMPAIGN_EPILOGUE_STAGE) {
    $("zone-name").textContent = epilogueQuest.zone;
    return;
  }
  const z = player.position.z;
  $("zone-name").textContent = z > 48 ? "はじまりの森" : z > 18 ? "森のはずれ・旅人野営地" : z > -7 ? "木漏れ日の谷" : z > -34 ? "黄金湿原" : z > -53 ? "黒土の前線" : "長芋族・黒土砦";
}

function drawMinimap() {
  const w = mapCanvas.width, h = mapCanvas.height;
  mapCtx.clearRect(0, 0, w, h);
  const gradient = mapCtx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
  gradient.addColorStop(0, "#4d6541"); gradient.addColorStop(1, "#1c291f");
  mapCtx.fillStyle = gradient; mapCtx.fillRect(0, 0, w, h);
  mapCtx.strokeStyle = "rgba(221,205,155,.18)"; mapCtx.lineWidth = 9; mapCtx.beginPath(); mapCtx.moveTo(w / 2, h); mapCtx.lineTo(w / 2, 0); mapCtx.stroke();
  const mapPos = (x, z) => ({ x: w / 2 + x * 1.08, y: h / 2 + z * 1.0 });
  const camp = mapPos(0, 30); mapCtx.fillStyle = "#d5bd68"; mapCtx.beginPath(); mapCtx.arc(camp.x, camp.y, 5, 0, 7); mapCtx.fill();
  const fort = mapPos(0, -64); mapCtx.fillStyle = "#b04b39"; mapCtx.fillRect(fort.x - 5, fort.y - 5, 10, 10);
  enemies.forEach((enemy) => { if (!enemy.dead && enemyIsActive(enemy)) { const p = mapPos(enemy.model.position.x, enemy.model.position.z); mapCtx.fillStyle = enemy.boss ? "#ff3f32" : "#cd7255"; mapCtx.beginPath(); mapCtx.arc(p.x, p.y, enemy.boss ? 4 : 2, 0, 7); mapCtx.fill(); } });
  if (player) {
    const p = mapPos(player.position.x, player.position.z);
    mapCtx.save(); mapCtx.translate(p.x, p.y); mapCtx.rotate(-player.rotation.y); mapCtx.fillStyle = "#fff4ba"; mapCtx.beginPath(); mapCtx.moveTo(0, -7); mapCtx.lineTo(5, 5); mapCtx.lineTo(0, 3); mapCtx.lineTo(-5, 5); mapCtx.closePath(); mapCtx.fill(); mapCtx.restore();
  }
}

function updateGate(dt) {
  if (!gate) return;
  const targetY = game.stage >= 7 ? heightAt(0, -55) - 4.5 : heightAt(0, -55) + 4;
  gate.position.y = THREE.MathUtils.lerp(gate.position.y, targetY, 1 - Math.exp(-dt * 2.4));
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
}

function initAudio() {
  if (!game.audio) game.audio = new (window.AudioContext || window.webkitAudioContext)();
  if (game.audio.state === "suspended") game.audio.resume();
}

function playSound(kind) {
  if (!game.sound || !game.audio) return;
  const ctx = game.audio;
  const now = ctx.currentTime;
  const sounds = {
    click: [[420, 0.06, "sine", 0.035]], attack: [[130, 0.1, "sawtooth", 0.05], [80, 0.16, "sine", 0.04]],
    hit: [[82, 0.11, "square", 0.052], [180, 0.06, "triangle", 0.025]],
    heavyHit: [[48, 0.24, "sawtooth", 0.085], [95, 0.18, "square", 0.05], [260, 0.08, "triangle", 0.035]],
    hurt: [[65, 0.22, "sawtooth", 0.06]], deny: [[110, 0.16, "square", 0.025]],
    quest: [[330, 0.15, "sine", 0.045], [495, 0.22, "sine", 0.04], [660, 0.35, "sine", 0.03]],
    level: [[392, 0.16, "triangle", 0.04], [523, 0.18, "triangle", 0.04], [784, 0.4, "triangle", 0.04]],
    skill: [[90, 0.35, "sawtooth", 0.06], [360, 0.48, "triangle", 0.045]],
    victory: [[261, 0.4, "triangle", 0.04], [329, 0.4, "triangle", 0.04], [392, 0.8, "triangle", 0.05]],
  };
  (sounds[kind] || []).forEach(([frequency, duration, type, volume], i) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, now + i * 0.08);
    gain.gain.setValueAtTime(0.001, now + i * 0.08); gain.gain.exponentialRampToValueAtTime(volume, now + i * 0.08 + 0.015); gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + duration);
    osc.connect(gain).connect(ctx.destination); osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + duration + 0.02);
  });
}

function saveGame() {
  if (!game.started) return;
  const data = {
    stage: game.stage, recruits: game.recruits, kills: game.kills, defeated: game.defeated, posts: game.posts,
    hp: game.hp, maxHp: game.maxHp, spirit: game.spirit, xp: game.xp, level: game.level, playTime: game.playTime,
    position: { x: player.position.x, z: player.position.z }, bossIntro: game.bossIntro,
    birthShown: game.birthShown, ambushTriggered: game.ambushTriggered,
    chapterProgress: game.chapterProgress, campaignKills: game.campaignKills,
    seenCampaignStages: game.seenCampaignStages, campaignComplete: game.campaignComplete,
    campaignBossHp: campaignBoss?.campaignStage === game.stage ? campaignBoss.hp : null,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function applySave(data) {
  if (!data) return;
  Object.assign(game, {
    stage: Math.min(data.stage ?? 0, CAMPAIGN_EPILOGUE_STAGE), recruits: data.recruits || [], kills: data.kills || 0, defeated: data.defeated || [], posts: data.posts || [false, false],
    hp: data.hp || 120, maxHp: data.maxHp || 120, spirit: data.spirit || 0, xp: data.xp || 0, level: data.level || 1, playTime: data.playTime || 0,
    bossIntro: !!data.bossIntro, bossActive: (data.stage === 7 && !!data.bossIntro),
    birthShown: !!data.birthShown, ambushTriggered: !!data.ambushTriggered,
    chapterProgress: data.chapterProgress || 0, campaignKills: data.campaignKills || 0,
    seenCampaignStages: data.seenCampaignStages || [], campaignComplete: !!data.campaignComplete,
    resumeCampaignBossHp: Number.isFinite(data.campaignBossHp) ? data.campaignBossHp : null,
  });
  if (data.position) player.position.set(data.position.x, heightAt(data.position.x, data.position.z), data.position.z);
  if (game.stage === CAMPAIGN_START_STAGE && data.chapterProgress === undefined) {
    player.position.set(1, heightAt(1, 28), 28);
  }
  npcs.forEach((npc) => {
    if (game.recruits.includes(npc.id)) { npc.recruited = true; npc.followIndex = allies.length; allies.push(npc); }
  });
  enemies.forEach((enemy) => {
    if (game.defeated.includes(enemy.id)) { enemy.dead = true; enemy.hp = 0; enemy.model.visible = false; }
  });
  updateParty(); updateQuestUI();
}

function startGame(continueSave = false) {
  initAudio();
  if (continueSave) {
    try { applySave(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { /* begin cleanly */ }
  } else {
    localStorage.removeItem(SAVE_KEY);
  }
  game.started = true; game.paused = false;
  $("title-screen").classList.add("hidden");
  $("hud").classList.remove("hidden");
  updateQuestUI();
  updateParty();
  if (game.stage >= CAMPAIGN_START_STAGE) {
    prepareCampaignChapter({ teleport: false, announce: true });
    if (campaignBoss?.campaignStage === game.stage && Number.isFinite(game.resumeCampaignBossHp)) {
      campaignBoss.hp = THREE.MathUtils.clamp(game.resumeCampaignBossHp, 1, campaignBoss.maxHp);
    }
    game.resumeCampaignBossHp = null;
  }
  const resumedChapter = campaignChapterForStage(game.stage);
  if (resumedChapter && game.chapterProgress >= resumedChapter.target) setTimeout(completeCampaignChapter, 350);
  playSound("quest");
  toast(continueSave ? "はい再開。休憩終わりー" : "カピバラ爆誕。なぜかグラサン装備済み");
  if (!continueSave || (game.stage === 0 && !game.birthShown)) {
    game.birthShown = true;
    setTimeout(() => showDialog([
      { role: "語り（雑）", name: "はじまりの森", text: "ある朝、一匹のカピバラが森にスポーンした。名前はカピノブ。生まれた理由は不明。グラサンの入手経路はもっと不明。" },
      { role: "生まれたてなのに態度がデカい", name: "カピノブ", text: "起きたら森。説明なし。めんどくせーけど、ずっとここにいるのも暇だし歩くか。" },
    ], () => toast("左スティックかWASDで、とりあえず進め！")), 380);
  }
}

function toggleMenu(force) {
  if (!game.started || game.dialog || game.ending) return;
  const open = force ?? $("menu-layer").classList.contains("hidden");
  $("menu-layer").classList.toggle("hidden", !open);
  game.paused = open;
  if (open) saveGame();
}

function renderJournal() {
  const chapters = questData.map((quest) => quest[1]);
  $("chapter-list").innerHTML = chapters.map((name, i) => `<div class="chapter-item ${i > game.stage ? "locked" : ""}"><span>${String(i + 1).padStart(2, "0")}</span><b>${name}</b><small>${i < game.stage ? "完了" : i === game.stage ? "進行中" : "未解放"}</small></div>`).join("");
}

function setupEvents() {
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, touchDevice ? 1.35 : 1.8));
  });
  addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === "Space") attack();
    if (e.code === "KeyQ") useSkill();
    if (e.code === "KeyE") interact();
    if (e.code === "Escape") toggleMenu();
  });
  addEventListener("keyup", (e) => keys.delete(e.code));
  canvas.addEventListener("pointerdown", (e) => { if (e.button === 0) { cameraDragging = true; pointerX = e.clientX; pointerY = e.clientY; canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener("pointermove", (e) => {
    if (!cameraDragging) return;
    const dx = e.clientX - pointerX, dy = e.clientY - pointerY; pointerX = e.clientX; pointerY = e.clientY;
    game.cameraYaw -= dx * 0.0045; game.cameraPitch = THREE.MathUtils.clamp(game.cameraPitch + dy * 0.003, 0.12, 0.72);
  });
  canvas.addEventListener("pointerup", () => cameraDragging = false);
  canvas.addEventListener("wheel", (e) => { game.cameraDistance = THREE.MathUtils.clamp(game.cameraDistance + e.deltaY * 0.009, 5.5, 14); }, { passive: true });
  $("start-btn").onclick = () => startGame(false);
  $("continue-btn").onclick = () => startGame(true);
  $("pause-btn").onclick = () => toggleMenu(true);
  $("resume-btn").onclick = () => toggleMenu(false);
  $("attack-btn").onclick = attack; $("skill-btn").onclick = useSkill; $("interact-btn").onclick = interact;
  const vibrate = (duration = 12) => { if (navigator.vibrate) navigator.vibrate(duration); };
  const mobileAttackButton = $("mobile-attack");
  let attackRepeat = null;
  const stopAttackRepeat = () => { if (attackRepeat) clearInterval(attackRepeat); attackRepeat = null; };
  mobileAttackButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    mobileAttackButton.setPointerCapture(event.pointerId);
    vibrate();
    attack();
    stopAttackRepeat();
    attackRepeat = setInterval(attack, 390);
  });
  mobileAttackButton.addEventListener("pointerup", stopAttackRepeat);
  mobileAttackButton.addEventListener("pointercancel", stopAttackRepeat);
  mobileAttackButton.addEventListener("lostpointercapture", stopAttackRepeat);
  $("mobile-skill").addEventListener("pointerdown", (event) => { event.preventDefault(); vibrate(20); useSkill(); });
  $("mobile-interact").addEventListener("pointerdown", (event) => { event.preventDefault(); vibrate(); interact(); });
  $("sound-btn").onclick = () => { initAudio(); game.sound = !game.sound; $("sound-btn").textContent = game.sound ? "♪" : "×"; };
  $("restart-btn").onclick = () => { if (confirm("戦記を最初から始めますか？")) { localStorage.removeItem(SAVE_KEY); location.reload(); } };
  $("journal-btn").onclick = () => { renderJournal(); $("menu-layer").classList.add("hidden"); $("journal-layer").classList.remove("hidden"); };
  $("journal-close").onclick = () => { $("journal-layer").classList.add("hidden"); $("menu-layer").classList.remove("hidden"); };
  $("ending-close").onclick = () => { game.ending = false; game.paused = false; $("ending").classList.add("hidden"); saveGame(); };

  const joystick = $("joystick"), knob = $("joystick-knob");
  const updateJoystick = (e) => {
    const r = joystick.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width * 0.32;
    const d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    mobileMove = { x: dx / max, y: dy / max };
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  joystick.addEventListener("pointerdown", (e) => { joystick.setPointerCapture(e.pointerId); updateJoystick(e); });
  joystick.addEventListener("pointermove", (e) => { if (joystick.hasPointerCapture(e.pointerId)) updateJoystick(e); });
  const stopJoy = () => { mobileMove = { x: 0, y: 0 }; knob.style.transform = "translate(0,0)"; };
  joystick.addEventListener("pointerup", stopJoy); joystick.addEventListener("pointercancel", stopJoy);
}

function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  let dt = rawDt;
  if (game.hitStop > 0) {
    game.hitStop = Math.max(0, game.hitStop - rawDt);
    dt *= 0.06;
  }
  const time = clock.elapsedTime;
  const fireflies = scene.getObjectByName("fireflies");
  if (fireflies) { fireflies.rotation.y = time * 0.006; fireflies.material.opacity = 0.38 + Math.sin(time * 0.7) * 0.1; }
  if (game.started && !game.paused && !game.dialog) {
    game.playTime += dt;
    game.attackTime = Math.max(0, game.attackTime - dt);
    game.attackCooldown = Math.max(0, game.attackCooldown - dt);
    game.comboWindow = Math.max(0, game.comboWindow - dt);
    if (game.comboWindow <= 0) game.combo = 0;
    if (game.attackQueued && game.attackCooldown <= 0) { game.attackQueued = false; attack(); }
    game.skillTime = Math.max(0, game.skillTime - dt);
    game.skillCooldown = Math.max(0, game.skillCooldown - dt);
    game.invulnerable = Math.max(0, game.invulnerable - dt);
    if (game.scriptedLoss > 0) {
      updateScriptedLoss(dt);
    } else {
      updatePlayer(dt, time);
      updateEnemies(dt, time);
      updateStoryTriggers();
    }
    updateGate(dt);
    updateInteraction();
    updateHud();
    if (time - game.lastSave > 12) { game.lastSave = time; saveGame(); }
  }
  if (player) updateCamera(dt);
  updateParticles(dt);
  updateDamageNumbers(rawDt);
  drawMinimap();
  renderer.render(scene, camera);
}

buildWorld();
setupEvents();
updateQuestUI();
camera.position.set(0, 8, 79);
camera.lookAt(0, 2, 69);
if (localStorage.getItem(SAVE_KEY)) $("continue-btn").classList.remove("hidden");
animate();
