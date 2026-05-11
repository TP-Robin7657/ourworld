const THREE = window.THREE;
THREE.MeshStandardMaterial = THREE.MeshBasicMaterial;
const canvas = document.querySelector("#world");
const places = window.MAP_PLACES || [];
const placeById = new Map(places.map((place) => [place.id, place]));
const beijing = placeById.get("beijing") || places[0];

const hint = document.querySelector("#placeHint");
const flightCard = document.querySelector("#flightCard");
const flightText = document.querySelector("#flightText");
const homeButton = document.querySelector("#homeButton");
const nextButton = document.querySelector("#nextButton");
const gallery = document.querySelector("#gallery");
const galleryKicker = document.querySelector("#galleryKicker");
const galleryTitle = document.querySelector("#galleryTitle");
const galleryLine = document.querySelector("#galleryLine");
const galleryPhoto = document.querySelector("#galleryPhoto");
const photoDate = document.querySelector("#photoDate");
const photoCount = document.querySelector("#photoCount");
const closeGallery = document.querySelector("#closeGallery");
const prevPhoto = document.querySelector("#prevPhoto");
const nextPhoto = document.querySelector("#nextPhoto");
const cover = document.querySelector("#cover");
const startButton = document.querySelector("#startButton");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else if ("outputEncoding" in renderer && THREE.sRGBEncoding) {
  renderer.outputEncoding = THREE.sRGBEncoding;
}
renderer.shadowMap.enabled = true;
renderer.toneMappingExposure = 0.82;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbcecf7, 18, 58);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(0, 13.5, 15.5);
camera.lookAt(0, 0, 0);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const markerMeshes = [];
const markers = new Map();
const textureLoader = new THREE.TextureLoader();

let currentPlace = beijing;
let galleryPlace = beijing;
let galleryIndex = 0;
let hoverPlace = null;
let isFlying = false;
let targetCamera = new THREE.Vector3(0, 13.5, 15.5);
let targetLook = new THREE.Vector3(0, 0, 0);
let lookPoint = new THREE.Vector3(0, 0, 0);
let drag = null;
let targetZoom = 1;

const colors = {
  ocean: 0x38c7ee,
  oceanDark: 0x1498be,
  land: 0x5fd357,
  landEdge: 0x2c9c49,
  sand: 0xffc84f,
  coral: 0xff6b58,
  roof: 0xf24336,
  wood: 0xb46b37,
  gold: 0xffbd2c,
  white: 0xfff8ea,
};

function project(lon, lat) {
  return {
    x: (lon / 180) * 12.6,
    z: -(lat / 90) * 6.1,
  };
}

const mapLayout = {
  "pebble-beach": { x: -8.4, z: 2.0 },
  yosemite: { x: -6.8, z: 1.2 },
  "new-york": { x: -4.6, z: -1.4 },
  "mexico-city": { x: -4.8, z: 3.2 },
  paris: { x: -1.6, z: -1.8 },
  como: { x: -0.4, z: -2.4 },
  dubai: { x: 0.2, z: 1.25 },
  xinjiang: { x: 1.0, z: -1.4 },
  tibet: { x: 1.3, z: 2.3 },
  xian: { x: 2.6, z: 0.8 },
  beijing: { x: 4.2, z: -0.9 },
  qingdao: { x: 6.8, z: -1.3 },
  shanghai: { x: 6.8, z: 1.2 },
  seoul: { x: 8.2, z: -0.4 },
  tokyo: { x: 9.4, z: -1.8 },
  lijiang: { x: 2.6, z: 3.6 },
  liuzhou: { x: 4.7, z: 3.5 },
  macau: { x: 7.4, z: 3.2 },
  sanya: { x: 6.0, z: 5.2 },
  thailand: { x: 3.5, z: 5.5 },
};

function placePosition(place) {
  return mapLayout[place.id] || project(place.lon, place.lat);
}

function roundedBox(width, height, depth, radius, color) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.08, bevelSegments: 5 });
  geometry.rotateX(-Math.PI / 2);
  geometry.center();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.82 }));
}

function blob(width, height, color, scaleY = 1) {
  const shape = new THREE.Shape();
  const steps = 72;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const wobble = 1 + 0.12 * Math.sin(a * 3) + 0.08 * Math.cos(a * 5);
    const x = Math.cos(a) * width * wobble;
    const y = Math.sin(a) * height * scaleY * wobble;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 4 });
  geometry.rotateX(-Math.PI / 2);
  geometry.center();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeLabel(text, large = false) {
  const cnv = document.createElement("canvas");
  cnv.width = large ? 420 : 320;
  cnv.height = 128;
  const ctx = cnv.getContext("2d");
  ctx.clearRect(0, 0, cnv.width, cnv.height);
  ctx.fillStyle = "rgba(255, 248, 232, 0.94)";
  roundRect(ctx, 16, 18, cnv.width - 32, 94, 34);
  ctx.fill();
  ctx.strokeStyle = "rgba(101, 76, 45, 0.32)";
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = "#463627";
  ctx.font = large ? "800 42px system-ui, sans-serif" : "800 32px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cnv.width / 2, 66);
  const texture = new THREE.CanvasTexture(cnv);
  if ("colorSpace" in texture && THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else if ("encoding" in texture && THREE.sRGBEncoding) {
    texture.encoding = THREE.sRGBEncoding;
  }
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(large ? 2.35 : 1.55, large ? 0.72 : 0.54, 1);
  return sprite;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function addLighting() {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x78a7aa, 0.85));
  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(3, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
}

function addWorld() {
  const ocean = roundedBox(29, 13.8, 0.35, 1.0, colors.ocean);
  ocean.position.y = -0.28;
  ocean.receiveShadow = true;
  scene.add(ocean);

  const continents = [
    [-8.3, 0.2, 2.1, 4.3, 0.95],
    [-5.7, 2.15, 2.7, 2.35, 0.8],
    [-4.9, -2.55, 1.7, 2.9, 1.2],
    [0.2, 1.5, 2.9, 2.4, 0.82],
    [3.6, 1.05, 4.3, 2.95, 0.75],
    [4.7, -1.5, 2.0, 1.8, 0.7],
    [8.8, -3.0, 1.6, 1.0, 0.55],
  ];
  continents.forEach(([x, z, w, h, sy], index) => {
    const land = blob(w, h, index % 2 ? 0x65d85f : 0x4fcf55, sy);
    land.position.set(x, 0.03, z);
    scene.add(land);
  });

  for (let i = 0; i < 58; i++) {
    const star = new THREE.Mesh(
      new THREE.SphereGeometry(0.035 + Math.random() * 0.055, 12, 12),
      new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? colors.gold : colors.white, roughness: 0.6 })
    );
    star.position.set(-13.2 + Math.random() * 26.4, 0.08, -6.2 + Math.random() * 12.4);
    scene.add(star);
  }
  addCloud(-6.3, -4.1, 1.0);
  addCloud(-0.6, -4.55, 0.82);
  addCloud(6.0, -4.25, 1.15);
  addWoodPath(2.0, -0.25, 4.25, -0.25, 8);
  addWoodPath(4.25, -0.25, 5.95, 1.15, 5);
  addCouple(3.55, -0.92, 0.88);
  addDecorations();
}

function addCloud(x, z, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 1.95, z);
  const parts = [
    [-0.25, 0, 0, 0.22], [0, 0.04, 0, 0.3], [0.28, 0, 0, 0.24],
    [0.08, -0.04, 0.12, 0.22],
  ];
  parts.forEach(([px, py, pz, r]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 16, 10), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    puff.position.set(px * scale, py * scale, pz * scale);
    group.add(puff);
  });
  scene.add(group);
}

function addWoodPath(x1, z1, x2, z2, count) {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const x = THREE.MathUtils.lerp(x1, x2, t);
    const z = THREE.MathUtils.lerp(z1, z2, t);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.24), new THREE.MeshStandardMaterial({ color: 0xc0773f }));
    plank.position.set(x, 0.18, z);
    plank.rotation.y = Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2;
    scene.add(plank);
  }
}

function addOrangeTree(x, z, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0.2, z);
  addCylinder(group, 0, 0.36 * scale, 0, 0.1 * scale, 0.14 * scale, 0.72 * scale, 0x9d5b2e, 12);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.46 * scale, 18, 12), new THREE.MeshStandardMaterial({ color: 0x54bf3e }));
  crown.position.y = 0.88 * scale;
  crown.scale.y = 1.05;
  group.add(crown);
  [[-0.22, 0.98, 0.22], [0.24, 1.08, -0.1], [0.12, 0.74, 0.28]].forEach(([px, py, pz]) => {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.09 * scale, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff8f26 }));
    fruit.position.set(px * scale, py * scale, pz * scale);
    group.add(fruit);
  });
  scene.add(group);
}

function addAvatar(group, x, z, colorset, scale = 1) {
  addCylinder(group, x, 0.42 * scale, z, 0.18 * scale, 0.2 * scale, 0.48 * scale, colorset.shirt, 18);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28 * scale, 22, 16), new THREE.MeshStandardMaterial({ color: 0xffc28a }));
  head.position.set(x, 0.82 * scale, z);
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.29 * scale, 22, 10), new THREE.MeshStandardMaterial({ color: colorset.hair }));
  hair.position.set(x, 0.93 * scale, z - 0.02 * scale);
  hair.scale.y = 0.55;
  group.add(hair);
  [-0.08, 0.08].forEach((dx) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025 * scale, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a1d }));
    eye.position.set(x + dx * scale, 0.84 * scale, z + 0.25 * scale);
    group.add(eye);
  });
}

function addCouple(x, z, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0.16, z);
  addAvatar(group, -0.16, 0, { shirt: 0x9c9a8e, hair: 0x6a513c }, scale);
  addAvatar(group, 0.22, 0.04, { shirt: 0x8fc8a8, hair: 0x5d2f1d }, scale * 0.94);
  group.rotation.y = -0.15;
  scene.add(group);
}

function textureFrom(src) {
  const texture = textureLoader.load(src);
  if ("colorSpace" in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  else if ("encoding" in texture && THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function addImageStand(group, place, isHome) {
  const texture = textureFrom(place.icon);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  const size = isHome ? 2.85 : 1.75;
  sprite.scale.set(size, size, 1);
  sprite.position.set(0, isHome ? 1.18 : 0.92, 0.03);
  sprite.userData.place = place;
  group.add(sprite);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(isHome ? 1.15 : 0.72, 32),
    new THREE.MeshStandardMaterial({ color: 0x866b44 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.13, 0.08);
  shadow.scale.y = 0.42;
  group.add(shadow);
}

function addLandmarkStand(group, place, isHome) {
  const inner = new THREE.Group();
  inner.position.y = 0.18;
  inner.scale.setScalar(1.4);
  addLandmark(inner, place, isHome);
  inner.userData.place = place;
  group.add(inner);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 32),
    new THREE.MeshStandardMaterial({ color: 0x866b44 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.13, 0.08);
  shadow.scale.y = 0.42;
  group.add(shadow);
}

function addCompletionBadge(group) {
  const cnv = document.createElement("canvas");
  cnv.width = 128;
  cnv.height = 128;
  const ctx = cnv.getContext("2d");
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = "#ff6b8a";
  ctx.beginPath();
  ctx.arc(64, 64, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 70px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♥", 64, 70);
  const tex = new THREE.CanvasTexture(cnv);
  if ("colorSpace" in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(0.55, 0.55, 1);
  sprite.position.set(0.5, 1.4, 0.1);
  sprite.userData.isBadge = true;
  group.add(sprite);
}

function addFlower(x, z, color) {
  const group = new THREE.Group();
  group.position.set(x, 0.22, z);
  addCylinder(group, 0, 0.08, 0, 0.015, 0.02, 0.16, 0x3f9f52, 8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color }));
    petal.position.set(Math.cos(a) * 0.06, 0.18, Math.sin(a) * 0.06);
    petal.scale.y = 0.45;
    group.add(petal);
  }
  scene.add(group);
}

function addGrass(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0.18, z);
  for (let i = 0; i < 3; i++) {
    const blade = addCone(group, (i - 1) * 0.055, 0.08, 0, 0.035, 0.2, 0x3f9f52, 5);
    blade.rotation.z = (i - 1) * 0.25;
  }
  scene.add(group);
}

function addDecorationRock(x, z, scale = 1) {
  const rock = new THREE.Mesh(new THREE.SphereGeometry(0.13 * scale, 12, 8), new THREE.MeshStandardMaterial({ color: 0xd8c9a8 }));
  rock.position.set(x, 0.2, z);
  rock.scale.set(1.3, 0.55, 0.9);
  scene.add(rock);
}

function addDecorations() {
  const flowers = [
    [-9.3, -2.2], [-8.6, 2.6], [-6.2, -3.8], [-4.7, 2.7], [-2.1, 2.8],
    [-0.5, -3.0], [0.4, 3.4], [1.7, -2.7], [2.3, 0.6], [3.3, -3.2],
    [4.2, 1.1], [5.4, -2.7], [6.4, 3.2], [8.4, -1.5], [9.6, 2.8],
  ];
  const palette = [0xff7f94, 0xffd36b, 0xffffff, 0x9bd6ff, 0xd4a0ff];
  flowers.forEach(([x, z], index) => addFlower(x, z, palette[index % palette.length]));
  for (let i = 0; i < 34; i++) {
    const x = -11 + (i * 2.17) % 22;
    const z = -4.8 + ((i * 1.31) % 9.6);
    if (Math.abs(x - 4.3) + Math.abs(z + 0.25) > 2.2) addGrass(x, z);
  }
  [[-7.2, -3.0, 1], [-3.4, 3.1, 0.8], [0.9, -3.6, 0.9], [2.3, 3.8, 0.7], [6.6, -3.2, 0.85], [9.6, 1.5, 0.7]]
    .forEach(([x, z, s]) => addDecorationRock(x, z, s));
}

function addHouse(group, big = false) {
  const size = big ? 1.1 : 0.54;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(size, size * 0.75, size),
    new THREE.MeshStandardMaterial({ color: colors.white, roughness: 0.85 })
  );
  body.position.y = size * 0.42;
  body.castShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(size * 0.83, size * 0.7, 4),
    new THREE.MeshStandardMaterial({ color: big ? colors.roof : colors.coral, roughness: 0.78 })
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = size * 0.98;
  roof.castShadow = true;
  group.add(roof);
}

function addTree(group, x, z, scale = 1) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07 * scale, 0.1 * scale, 0.45 * scale, 10),
    new THREE.MeshStandardMaterial({ color: colors.wood, roughness: 0.9 })
  );
  trunk.position.set(x, 0.23 * scale, z);
  group.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.28 * scale, 16, 12),
    new THREE.MeshStandardMaterial({ color: colors.leaf, roughness: 0.85 })
  );
  crown.position.set(x, 0.58 * scale, z);
  crown.scale.y = 1.08;
  crown.castShadow = true;
  group.add(crown);
}

function addBox(group, x, y, z, w, h, d, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function addCylinder(group, x, y, z, r1, r2, h, color, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, segments), new THREE.MeshStandardMaterial({ color }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function addCone(group, x, y, z, radius, height, color, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, segments), new THREE.MeshStandardMaterial({ color }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function addArch(group, color) {
  addBox(group, -0.26, 0.45, 0, 0.16, 0.8, 0.14, color);
  addBox(group, 0.26, 0.45, 0, 0.16, 0.8, 0.14, color);
  addBox(group, 0, 0.86, 0, 0.7, 0.16, 0.14, color);
}

function addLandmark(group, place, isHome) {
  switch (place.id) {
    case "beijing":
      addBox(group, 0, 0.34, 0, 1.65, 0.46, 0.62, 0xc93f32);
      addBox(group, 0, 0.64, 0.02, 1.9, 0.16, 0.76, colors.gold);
      addBox(group, 0, 0.82, 0, 1.42, 0.34, 0.54, 0xf3dfb2);
      addCone(group, 0, 1.22, 0, 1.08, 0.58, colors.roof, 4).rotation.y = Math.PI / 4;
      addBox(group, 0, 0.6, -0.34, 0.32, 0.28, 0.04, 0x6d2f2a);
      break;
    case "paris":
      addBox(group, 0, 0.12, 0, 0.85, 0.14, 0.18, 0x7b6149);
      addCylinder(group, -0.28, 0.44, 0, 0.045, 0.07, 0.72, 0x7b6149, 8).rotation.z = -0.16;
      addCylinder(group, 0.28, 0.44, 0, 0.045, 0.07, 0.72, 0x7b6149, 8).rotation.z = 0.16;
      addBox(group, 0, 0.64, 0, 0.6, 0.08, 0.12, 0x7b6149);
      addCone(group, 0, 1.12, 0, 0.25, 0.92, 0x7b6149, 4);
      break;
    case "pebble-beach":
      // green golf grass platform
      addCylinder(group, 0, 0.12, 0, 0.7, 0.7, 0.1, 0x6dbf90, 32);
      // flag pole + red flag (golf hole)
      addCylinder(group, -0.18, 0.4, 0.12, 0.02, 0.02, 0.5, 0xfafafa, 8);
      addBox(group, -0.05, 0.55, 0.12, 0.22, 0.14, 0.02, 0xe65a4a);
      // small school building (Stevenson)
      addBox(group, 0.28, 0.28, -0.12, 0.36, 0.32, 0.28, 0xfff2dc);
      addCone(group, 0.28, 0.5, -0.12, 0.28, 0.18, 0xc34a2c, 4).rotation.y = Math.PI / 4;
      break;
    case "yosemite":
      addCone(group, -0.22, 0.52, 0, 0.4, 0.9, 0x86c56a, 5);
      addCone(group, 0.28, 0.62, 0.05, 0.5, 1.08, 0x6fb45a, 5);
      addBox(group, 0.06, 0.15, -0.18, 0.62, 0.22, 0.18, 0x9b7044);
      break;
    case "dubai":
      addCone(group, 0, 0.82, 0, 0.2, 1.4, 0xf4d69a, 6);
      addBox(group, -0.32, 0.36, 0, 0.18, 0.62, 0.18, 0xffe0a3);
      addBox(group, 0.34, 0.28, 0, 0.16, 0.46, 0.16, 0xffe0a3);
      break;
    case "tokyo":
      addBox(group, 0, 0.28, 0, 0.9, 0.12, 0.12, 0xf04f45);
      addBox(group, -0.34, 0.58, 0, 0.12, 0.66, 0.12, 0xf04f45);
      addBox(group, 0.34, 0.58, 0, 0.12, 0.66, 0.12, 0xf04f45);
      addBox(group, 0, 0.86, 0, 1.05, 0.12, 0.12, 0xf04f45);
      addBox(group, 0, 1.02, 0, 0.78, 0.12, 0.12, 0xf04f45);
      break;
    case "shanghai":
      addCylinder(group, 0, 0.62, 0, 0.08, 0.1, 1.0, 0xbd6add, 18);
      addCylinder(group, 0, 0.92, 0, 0.24, 0.24, 0.18, 0xff8db7, 24);
      addCylinder(group, 0, 1.25, 0, 0.12, 0.12, 0.34, 0xbd6add, 18);
      addCone(group, 0, 1.55, 0, 0.08, 0.28, 0xbd6add, 18);
      break;
    case "xian":
      addBox(group, 0, 0.4, 0, 1.0, 0.5, 0.36, 0xb06b3e);
      addCone(group, 0, 0.86, 0, 0.7, 0.38, 0x5f7f52, 4).rotation.y = Math.PI / 4;
      break;
    case "macau":
      addArch(group, 0xd99a62);
      addCylinder(group, 0, 0.18, 0, 0.08, 0.08, 0.18, 0xffd36b, 16);
      break;
    case "tibet":
      addBox(group, 0, 0.32, 0, 1.05, 0.42, 0.42, 0xf6f0de);
      addBox(group, 0, 0.68, 0, 0.82, 0.28, 0.34, 0xb03c35);
      addBox(group, 0, 0.96, 0, 0.62, 0.22, 0.28, 0xfff8ea);
      addCone(group, 0, 1.22, 0, 0.28, 0.28, 0xffba31, 4).rotation.y = Math.PI / 4;
      break;
    case "sanya":
      addTree(group, -0.28, 0.05, 1.05);
      addCone(group, 0.36, 0.42, 0, 0.45, 0.76, 0x69be67, 18);
      addCylinder(group, 0.36, 0.18, 0, 0.06, 0.08, 0.36, colors.wood, 12);
      break;
    case "qingdao":
      addCylinder(group, -0.2, 0.45, 0, 0.18, 0.18, 0.78, 0xffffff, 20);
      addCone(group, -0.2, 0.95, 0, 0.22, 0.28, 0xe94d42, 20);
      addBox(group, 0.28, 0.34, 0, 0.38, 0.34, 0.3, 0xfff8ea);
      addCone(group, 0.28, 0.66, 0, 0.34, 0.26, 0xe94d42, 4).rotation.y = Math.PI / 4;
      break;
    case "lijiang":
      addCone(group, -0.2, 0.5, 0, 0.44, 0.78, 0x6fb45a, 5);
      addBox(group, 0.22, 0.36, 0, 0.52, 0.42, 0.34, 0x9b7044);
      addCone(group, 0.22, 0.7, 0, 0.42, 0.28, 0x5f7f52, 4).rotation.y = Math.PI / 4;
      break;
    case "new-york":
      addBox(group, -0.1, 0.5, 0, 0.32, 1.0, 0.32, 0x9bb0bf);
      addBox(group, 0.32, 0.36, 0, 0.22, 0.72, 0.22, 0xc7d4dc);
      addCone(group, -0.1, 1.12, 0, 0.18, 0.22, 0x9bb0bf, 16);
      addCone(group, -0.36, 0.36, 0.18, 0.16, 0.4, 0x6dbf90, 8);
      addBox(group, -0.36, 0.12, 0.18, 0.16, 0.16, 0.16, 0x6dbf90);
      break;
    case "mexico-city":
      addBox(group, 0, 0.32, 0, 1.0, 0.36, 0.5, 0xefcb88);
      addCylinder(group, -0.3, 0.66, 0, 0.18, 0.18, 0.34, 0xf2c07d, 18);
      addCylinder(group, 0.3, 0.66, 0, 0.18, 0.18, 0.34, 0xf2c07d, 18);
      addCylinder(group, 0, 0.78, 0, 0.22, 0.22, 0.42, 0xe87a55, 18);
      addCone(group, -0.3, 0.92, 0, 0.16, 0.18, 0xc34a2c, 18);
      addCone(group, 0.3, 0.92, 0, 0.16, 0.18, 0xc34a2c, 18);
      addCone(group, 0, 1.08, 0, 0.18, 0.22, 0xc34a2c, 18);
      break;
    case "seoul":
      addBox(group, 0, 0.18, 0, 0.94, 0.24, 0.34, 0xa37046);
      addBox(group, 0, 0.4, 0, 0.74, 0.2, 0.28, 0xfff2dc);
      addCone(group, 0, 0.62, 0, 0.62, 0.2, 0x4d6044, 4).rotation.y = Math.PI / 4;
      addBox(group, 0, 0.78, 0, 0.34, 0.06, 0.06, 0x6b3a26);
      break;
    case "liuzhou":
      addCylinder(group, 0, 0.22, 0, 0.36, 0.46, 0.32, 0xfff5e0, 24);
      addCylinder(group, 0, 0.4, 0, 0.4, 0.4, 0.04, 0xc4885a, 24);
      addCone(group, -0.12, 0.62, 0, 0.06, 0.32, 0xfafafa, 8);
      addCone(group, 0.12, 0.7, 0.05, 0.06, 0.32, 0xfafafa, 8);
      addCylinder(group, 0.42, 0.4, 0.05, 0.07, 0.06, 0.08, 0x8a5e3a, 16);
      addCylinder(group, 0.42, 0.45, 0.05, 0.05, 0.04, 0.04, 0xa57a4a, 12);
      break;
    case "thailand":
      addBox(group, 0, 0.16, 0, 0.78, 0.18, 0.5, 0xffe2a3);
      addBox(group, 0, 0.34, 0, 0.7, 0.14, 0.46, 0xc34a2c);
      addBox(group, 0, 0.5, 0, 0.56, 0.12, 0.36, 0xffba31);
      addCone(group, 0, 0.86, 0, 0.18, 0.42, 0xffba31, 12);
      addCylinder(group, 0, 1.16, 0, 0.03, 0.04, 0.18, 0xffba31, 8);
      addCone(group, 0, 1.3, 0, 0.05, 0.08, 0xffba31, 8);
      break;
    case "xinjiang":
      addCylinder(group, 0, 0.22, 0, 0.36, 0.4, 0.4, 0xfff2dc, 18);
      addCone(group, 0, 0.5, 0, 0.4, 0.28, 0xc99a6a, 18);
      addCone(group, -0.5, 0.42, 0.2, 0.18, 0.7, 0xeef3f7, 6);
      addCone(group, 0.46, 0.36, -0.18, 0.14, 0.58, 0xeef3f7, 6);
      addBox(group, 0.42, 0.16, 0.22, 0.22, 0.18, 0.14, 0xb1854b);
      break;
    case "como":
      addBox(group, 0, 0.18, 0, 0.74, 0.22, 0.32, 0xfff2dc);
      addCone(group, -0.16, 0.42, 0, 0.32, 0.32, 0xc34a2c, 4).rotation.y = Math.PI / 4;
      addBox(group, 0.24, 0.36, 0, 0.16, 0.42, 0.16, 0xfff2dc);
      addCone(group, 0.24, 0.66, 0, 0.13, 0.2, 0xc34a2c, 4).rotation.y = Math.PI / 4;
      addCylinder(group, -0.4, 0.06, 0.2, 0.18, 0.18, 0.06, 0x4ea7c5, 24);
      break;
    default:
      addHouse(group, isHome);
  }
}

function addMarkers() {
  places.forEach((place) => {
    const pos = placePosition(place);
    const isHome = place.id === "beijing";
    const group = new THREE.Group();
    group.position.set(pos.x, 0.38, pos.z);
    group.userData.place = place;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(isHome ? 1.0 : 0.38, isHome ? 1.12 : 0.44, isHome ? 0.38 : 0.22, 32),
      new THREE.MeshStandardMaterial({ color: isHome ? colors.gold : colors.sand, roughness: 0.72 })
    );
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    if (place.icon) {
      addImageStand(group, place, isHome);
    } else {
      addLandmarkStand(group, place, isHome);
    }

    group.scale.setScalar(isHome ? 1.45 : 0.92);
    scene.add(group);
    group.traverse((child) => {
      child.userData.place = place;
      if (child.isMesh) markerMeshes.push(child);
    });
    markers.set(place.id, group);
  });
}

const plane = new THREE.Group();
let propeller = null;
let planeSprite = null;
let planeTex = null;
function addPlane() {
  planeTex = textureLoader.load("./260506 - Anniversary Map Assets/Couple Airplane.png");
  if ("colorSpace" in planeTex && THREE.SRGBColorSpace) planeTex.colorSpace = THREE.SRGBColorSpace;
  else if ("encoding" in planeTex && THREE.sRGBEncoding) planeTex.encoding = THREE.sRGBEncoding;
  planeTex.center.set(0.5, 0.5);
  const aspect = 622 / 503;
  const w = 2.6;
  planeSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: planeTex, transparent: true, depthWrite: false }));
  planeSprite.scale.set(w, w / aspect, 1);
  plane.add(planeSprite);
  plane.visible = false;
  scene.add(plane);
}

function setPlaneFacing(facingRight) {
  if (!planeTex) return;
  planeTex.repeat.x = facingRight ? -1 : 1;
}

function updateHint(place) {
  hint.querySelector(".hint-name").textContent = place.name;
  hint.querySelector(".hint-copy").textContent = place.line;
}

function focusPlace(place, instant = false) {
  currentPlace = place;
  updateHint(place);
  const pos = placePosition(place);
  if (place.id === "beijing") {
    if (window.innerWidth < 720) {
      targetLook.set(4.7, 0, 0.1);
      targetCamera.set(4.1, 16.7, 20.5);
    } else {
      targetLook.set(1.9, 0, 0.2);
      targetCamera.set(1.6, 15.9, 18.8);
    }
  } else {
    targetLook.set(pos.x, 0, pos.z);
    targetCamera.set(pos.x, 8.2, pos.z + 8.7);
  }
  if (instant) {
    camera.position.copy(targetCamera);
    lookPoint.copy(targetLook);
    camera.lookAt(lookPoint);
  }
}

function flyTo(place) {
  if (isFlying || !place) return;
  if (place.id === currentPlace.id) {
    openGallery(place);
    return;
  }
  const from = placePosition(currentPlace);
  const to = placePosition(place);
  isFlying = true;
  plane.visible = true;
  flightText.textContent = `从${currentPlace.name}飞往${place.name}`;
  flightCard.classList.add("show");

  const startTime = performance.now();
  const duration = 1700 + Math.min(1200, Math.hypot(to.x - from.x, to.z - from.z) * 110);

  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const x = THREE.MathUtils.lerp(from.x, to.x, eased);
    const z = THREE.MathUtils.lerp(from.z, to.z, eased);
    const y = 2.15 + Math.sin(t * Math.PI) * 2.6;
    plane.position.set(x, y, z);
    plane.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    setPlaneFacing((to.x - from.x) >= 0);

    targetLook.set(x, 0, z);
    targetCamera.set(x, 10.4, z + 10.2);

    if (t < 1) requestAnimationFrame(step);
    else {
      isFlying = false;
      plane.visible = false;
      flightCard.classList.remove("show");
      focusPlace(place);
      setTimeout(() => openGallery(place), 280);
    }
  }
  requestAnimationFrame(step);
}

function openGallery(place) {
  galleryPlace = place;
  galleryIndex = 0;
  galleryKicker.textContent = place.subtitle;
  galleryTitle.textContent = place.name;
  galleryLine.textContent = place.line;
  const photoCount = (place.photos || []).length;
  const hasPhotos = photoCount > 0;
  const galleryPanel = document.querySelector(".gallery-panel");
  galleryPanel.classList.toggle("no-photos", !hasPhotos);
  galleryPanel.classList.toggle("single-photo", photoCount === 1);
  // Set landmark background for the photo frame (semi-transparent, monochrome, slow pan)
  const photoFrameEl = galleryPanel.querySelector(".photo-frame");
  if (photoFrameEl) {
    const bg = place.siteCard ? `url("./${place.siteCard}")` : (place.icon ? `url("./${place.icon}")` : "none");
    photoFrameEl.style.setProperty("--landmark-bg", bg);
  }
  if (hasPhotos) {
    renderPhoto();
  } else {
    galleryPhoto.removeAttribute("src");
    photoDate.textContent = "";
    photoCount.textContent = "";
  }
  updatePlayButton(place);
  gallery.classList.add("open");
  gallery.setAttribute("aria-hidden", "false");
}

function renderPhoto() {
  const photos = galleryPlace.photos || [];
  if (!photos.length) return;
  const idx = ((galleryIndex % photos.length) + photos.length) % photos.length;
  const photo = photos[idx];
  if (!photo) return;

  galleryPhoto.classList.add("swap");

  const img = new Image();
  img.onload = () => {
    galleryPhoto.src = photo.src;
    photoDate.textContent = photo.date;
    photoCount.textContent = `${idx + 1} / ${photos.length}`;
    galleryPhoto.classList.remove("swap");
  };
  img.onerror = () => {
    console.error(`Failed to load photo: ${photo.src}`);
    galleryPhoto.src = photo.src;
    galleryPhoto.classList.remove("swap");
  };
  img.src = photo.src;
}

function updatePlayButton(place) {
  const btn = document.querySelector("#playGameButton");
  if (!btn) return;
  const idx = places.findIndex((p) => p.id === place.id);
  const level = idx + 1;
  const done = isCompleted(place.id);
  btn.dataset.placeId = place.id;
  btn.innerHTML = done
    ? `<span class="play-btn-tag">第 ${level} 关 · 已通关 ★</span><span class="play-btn-main">再玩一次 ${place.foodTitle} 🍴</span>`
    : `<span class="play-btn-tag">第 ${level} 关</span><span class="play-btn-main">玩 ${place.foodTitle} 消消乐 🍴</span>`;
}

function nextGallery(delta) {
  const photos = galleryPlace.photos || [];
  if (!photos.length) return;
  galleryIndex = (galleryIndex + delta + photos.length) % photos.length;
  renderPhoto();
}

function setPointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickPlace(event) {
  setPointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(markerMeshes, false);
  return hits[0]?.object?.userData?.place || null;
}

function onPointerMove(event) {
  if (drag) {
    const dx = event.clientX - drag.x;
    const dz = event.clientY - drag.y;
    targetCamera.x -= dx * 0.012;
    targetCamera.z += dz * 0.014;
    targetLook.x -= dx * 0.012;
    targetLook.z += dz * 0.014;
    drag.x = event.clientX;
    drag.y = event.clientY;
    return;
  }
  hoverPlace = pickPlace(event);
  canvas.style.cursor = hoverPlace ? "pointer" : "grab";
  if (hoverPlace) updateHint(hoverPlace);
  else updateHint(currentPlace);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate(time) {
  requestAnimationFrame(animate);
  places.forEach((place) => {
    const group = markers.get(place.id);
    if (!group) return;
    const pulse = Math.sin(time * 0.0024 + place.lon) * 0.035;
    const base = place.id === "beijing" ? 1.45 : 0.92;
    group.scale.setScalar(base + pulse);
    group.rotation.y = Math.sin(time * 0.001 + place.lat) * 0.05;
  });

  if (!isFlying) {
    camera.position.lerp(targetCamera, 0.06);
    lookPoint.lerp(targetLook, 0.08);
  } else {
    camera.position.lerp(targetCamera, 0.075);
    lookPoint.lerp(targetLook, 0.09);
    if (propeller) propeller.rotation.x += 0.6;
  }
  camera.lookAt(lookPoint);
  renderer.render(scene, camera);
}

canvas.addEventListener("pointerdown", (event) => {
  drag = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY };
});
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", (event) => {
  const moved = drag ? Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 8 : false;
  drag = null;
  if (!moved) {
    const place = pickPlace(event);
    if (place) flyTo(place);
  }
});
canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const factor = Math.exp(event.deltaY * 0.0012);
  targetZoom = THREE.MathUtils.clamp(targetZoom * factor, 0.46, 1.9);
  const offset = targetCamera.clone().sub(targetLook);
  const length = THREE.MathUtils.clamp(offset.length() * factor, 5.5, 27);
  offset.normalize().multiplyScalar(length);
  targetCamera.copy(targetLook).add(offset);
}, { passive: false });

homeButton.addEventListener("click", () => flyTo(beijing));
nextButton.addEventListener("click", () => {
  const index = places.findIndex((place) => place.id === currentPlace.id);
  flyTo(places[(index + 1) % places.length]);
});
closeGallery.addEventListener("click", () => {
  gallery.classList.remove("open");
  gallery.setAttribute("aria-hidden", "true");
  window.GameAudio?.playBgm("home");
});
prevPhoto.addEventListener("click", () => nextGallery(-1));
nextPhoto.addEventListener("click", () => nextGallery(1));
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeGallery.click();
  if (event.key === "ArrowLeft") nextGallery(-1);
  if (event.key === "ArrowRight") nextGallery(1);
});
window.addEventListener("resize", resize);
startButton?.addEventListener("click", () => {
  cover.classList.add("hide");
  window.GameAudio?.playBgm("home");
});

const muteButton = document.querySelector("#muteButton");
function refreshMuteIcon() {
  if (!muteButton) return;
  muteButton.textContent = window.GameAudio?.isMuted() ? "🔇" : "🔊";
}
muteButton?.addEventListener("click", () => {
  window.GameAudio?.toggleMuted();
  refreshMuteIcon();
});
window.addEventListener("audio:muted", refreshMuteIcon);
refreshMuteIcon();

const PROGRESS_KEY = "yytp.match3.progress.v1";
const STARS_KEY = "yytp.match3.stars.v1";

function loadProgress() {
  try {
    return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || "[]"));
  } catch (e) {
    return new Set();
  }
}

function loadStars() {
  try {
    return JSON.parse(localStorage.getItem(STARS_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

function saveProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...progress]));
    localStorage.setItem(STARS_KEY, JSON.stringify(starsByPlace));
  } catch (e) {}
}

const progress = loadProgress();
const starsByPlace = loadStars();

function isCompleted(id) {
  return progress.has(id);
}

function markCompleted(id, stars) {
  const wasCompleted = progress.has(id);
  progress.add(id);
  starsByPlace[id] = Math.max(starsByPlace[id] || 0, stars);
  saveProgress();
  if (!wasCompleted) addBadgeToMarker(id);
  refreshProgressHud();
  if (progress.size >= places.length) {
    setTimeout(() => showFinale(), 600);
  }
}

function addBadgeToMarker(id) {
  const group = markers.get(id);
  if (!group) return;
  const existing = group.children.find((c) => c.userData && c.userData.isBadge);
  if (existing) return;
  addCompletionBadge(group);
}

function refreshExistingBadges() {
  progress.forEach((id) => addBadgeToMarker(id));
  refreshProgressHud();
}

function refreshProgressHud() {
  const total = places.length;
  const done = progress.size;
  const overlay = document.querySelector("#progressHud");
  if (overlay) overlay.classList.toggle("complete", done >= total);
  const doneEl = document.querySelector("#progressDone");
  if (doneEl) doneEl.textContent = done;
  const totalEl = document.querySelector("#hudTotalProgress");
  if (totalEl) totalEl.textContent = total;
  const sub = document.querySelector("#hudTotal");
  if (sub) sub.textContent = total;
}

function launchGame(place) {
  const idx = places.findIndex((p) => p.id === place.id);
  const level = idx + 1;
  gallery.classList.remove("open");
  gallery.setAttribute("aria-hidden", "true");
  window.Match3.init({
    place,
    level,
    total: places.length,
    onClose: () => {
      gallery.classList.add("open");
      gallery.setAttribute("aria-hidden", "false");
      window.GameAudio?.playBgm("home");
    },
    onComplete: (placeId, stars) => {
      window.Match3.close();
      const willTriggerFinale = !progress.has(placeId) && progress.size + 1 >= places.length;
      markCompleted(placeId, stars);
      if (!willTriggerFinale) {
        gallery.classList.add("open");
        gallery.setAttribute("aria-hidden", "false");
        updatePlayButton(places.find((p) => p.id === placeId));
        window.GameAudio?.playBgm("home");
      }
    },
  });
}

function showFinale() {
  const overlay = document.querySelector("#finale");
  if (!overlay) return;
  const total = places.length;
  ["#finaleTotalCake", "#finaleTotalSub", "#finaleTotalMsg", "#finaleTotalGem"].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = total;
  });
  gallery.classList.remove("open");
  gallery.setAttribute("aria-hidden", "true");
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  spawnConfetti(overlay);
  window.GameAudio?.playBgm("home");
}

function hideFinale() {
  const overlay = document.querySelector("#finale");
  if (!overlay) return;
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
}

function spawnConfetti(overlay) {
  const layer = overlay.querySelector(".finale-confetti");
  if (!layer) return;
  layer.innerHTML = "";
  const palette = ["#ff7f94", "#ffd36b", "#9bd6ff", "#d4a0ff", "#a8e3a3", "#ffb085"];
  for (let i = 0; i < 80; i++) {
    const s = document.createElement("span");
    s.className = "finale-piece";
    s.style.left = `${Math.random() * 100}%`;
    s.style.background = palette[i % palette.length];
    s.style.animationDelay = `${Math.random() * 4}s`;
    s.style.animationDuration = `${3.5 + Math.random() * 3.5}s`;
    s.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.appendChild(s);
  }
}

document.addEventListener("click", (e) => {
  const playBtn = e.target.closest("#playGameButton");
  if (playBtn) {
    const id = playBtn.dataset.placeId;
    const place = places.find((p) => p.id === id);
    if (place) launchGame(place);
    return;
  }
  const finaleClose = e.target.closest("#finaleBack");
  if (finaleClose) {
    hideFinale();
    return;
  }
  const finaleReset = e.target.closest("#finaleReset");
  if (finaleReset) {
    if (confirm("重置全部进度，从头再玩一次？")) {
      progress.clear();
      Object.keys(starsByPlace).forEach((k) => delete starsByPlace[k]);
      saveProgress();
      hideFinale();
      window.location.reload();
    }
    return;
  }
  const hudReset = e.target.closest("#resetButton");
  if (hudReset) {
    if (confirm("清除所有通关记录，从头开始？")) {
      progress.clear();
      Object.keys(starsByPlace).forEach((k) => delete starsByPlace[k]);
      saveProgress();
      window.location.reload();
    }
  }
});

addLighting();
addWorld();
addMarkers();
addPlane();
refreshExistingBadges();
resize();
focusPlace(beijing, true);
requestAnimationFrame(animate);
