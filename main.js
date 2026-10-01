import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const ui = {
  score: document.getElementById("score"),
  speed: document.getElementById("speed"),
  fps: document.getElementById("fps"),
  debugInfo: document.getElementById("debug-info"),
};

const DEBUG = {
  enabled: true,
  showGrid: false,
  showColliders: false,
  showVelocity: false,
  showPhysics: false,
};

const game = {
  score: 0,
  speed: 0,
  steering: 0,
  lastFrame: 0,
  tick: 0,
  truckCollided: false,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe5ff);
scene.fog = new THREE.Fog(0xbfe5ff, 20, 130);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 6, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xffffff, 0x5a7280, 1.2);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.3);
sun.position.set(10, 25, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
scene.add(sun);

const roadGroup = new THREE.Group();
scene.add(roadGroup);

const road = new THREE.Mesh(
  new THREE.BoxGeometry(20, 0.4, 200),
  new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 })
);
road.position.y = -0.5;
road.receiveShadow = true;
roadGroup.add(road);

const laneMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
for (let x = -4; x <= 4; x += 2) {
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 6), laneMaterial);
  line.position.set(x, 0.01, 0);
  roadGroup.add(line);
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x7fbf6a, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1;
ground.receiveShadow = true;
scene.add(ground);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(200, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xbfe5ff, side: THREE.BackSide })
);
scene.add(sky);

const debugGroup = new THREE.Group();
scene.add(debugGroup);

const gridHelper = new THREE.GridHelper(60, 60, 0x555555, 0x888888);
gridHelper.position.y = 0.02;
gridHelper.visible = false;
scene.add(gridHelper);

const truck = new THREE.Group();
scene.add(truck);

const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.5, metalness: 0.2 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.7 });

const truckBody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 6.5), bodyMat);
truckBody.position.y = 1.2;
truckBody.castShadow = true;
truckBody.receiveShadow = true;
truck.add(truckBody);

const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.5, 2.6), darkMat);
cabin.position.set(0, 2.1, -1.2);
cabin.castShadow = true;
truck.add(cabin);

const trailer = new THREE.Mesh(
  new THREE.BoxGeometry(3.3, 2.3, 7.2),
  new THREE.MeshStandardMaterial({ color: 0xf7b267, roughness: 0.6})
);
trailer.position.set(0, 1.8, 5.2);
trailer.castShadow = true;
truck.add(trailer);

const wheels = [];
const wheelGeom = new THREE.CylinderGeometry(0.55, 0.55, 0.6, 18);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

const wheelPositions = [
  [-1.6, 0.55, -2.2], [1.6, 0.55, -2.2],
  [-1.6, 0.55, 1.5], [1.6, 0.55, 1.5],
  [-1.6, 0.55, 4.5], [1.6, 0.55, 4.5],
  [-1.6, 0.55, 7.2], [1.6, 0.55, 7.2],
];

wheelPositions.forEach(([x, y, z]) => {
  const wheel = new THREE.Mesh(wheelGeom, wheelMat);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(x, y, z);
  wheel.castShadow = true;
  wheel.receiveShadow = true;
  truck.add(wheel);
  wheels.push(wheel);
});

truck.position.set(0, 0, 6);

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === "w" || event.key === "ArrowUp") keys.forward = true;
  if (key === "s" || event.key === "ArrowDown") keys.backward = true;
  if (key === "a" || event.key === "ArrowLeft") keys.left = true;
  if (key === "d" || event.key === "ArrowRight") keys.right = true;

  if (event.key === "~") DEBUG.enabled = !DEBUG.enabled;
  if (event.key === "1") DEBUG.showColliders = !DEBUG.showColliders;
  if (event.key === "2") DEBUG.showVelocity = !DEBUG.showVelocity;
  if (event.key === "3") DEBUG.showPhysics = !DEBUG.showPhysics;
  if (event.key === "4") DEBUG.showGrid = !DEBUG.showGrid;
  if (event.key === "5") console.log("Debug physics enabled");
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();

  if (key === "w" || event.key === "ArrowUp") keys.forward = false;
  if (key === "s" || event.key === "ArrowDown") keys.backward = false;
  if (key === "a" || event.key === "ArrowLeft") keys.left = false;
  if (key === "d" || event.key === "ArrowRight") keys.right = false;
});

const obstacles = [];
const trees = [];
const pickupGroup = new THREE.Group();
scene.add(pickupGroup);

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function createObstacle(z) {
  const type = Math.random() < 0.6 ? "car" : "barrier";
  const obstacle = new THREE.Group();
  obstacle.userData = {
    type,
    width: type === "car" ? 2.1 : 2.8,
    length: type === "car" ? 3.8 : 1.2,
  };

  if (type === "car") {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.2, 3.8),
      new THREE.MeshStandardMaterial({ color: 0x3a86ff, roughness: 0.45 })
    );
    body.position.y = 0.9;
    body.castShadow = true;
    obstacle.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xcfe8ff })
    );
    cabin.position.set(0, 1.5, -0.2);
    obstacle.add(cabin);

    for (const [x, y, zPos] of [
      [-1, 0.5, -1.2], [1, 0.5, -1.2],
      [-1, 0.5, 1.2], [1, 0.5, 1.2],
    ]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 0.35, 16),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, zPos);
      obstacle.add(wheel);
    }
  } else {
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.3, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xe76f51 })
    );
    barrier.position.y = 0.8;
    obstacle.add(barrier);
  }

  obstacle.position.set(randomBetween(-6, 6), 0, z);
  scene.add(obstacle);
  obstacles.push(obstacle);
}

function createTree(z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.38, 1.8, 10),
    new THREE.MeshStandardMaterial({ color: 0x7d4b25 })
  );
  trunk.position.y = 0.9;
  trunk.castShadow = true;

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x3cb371 })
  );
  canopy.position.y = 2.2;
  canopy.castShadow = true;

  const tree = new THREE.Group();
  tree.add(trunk, canopy);
  tree.position.set(randomBetween(-12, 12), 0, z);
  scene.add(tree);
  trees.push(tree);
}

function createPickup(z) {
  const pickup = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.7, 0),
    new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x3d2f00 })
  );
  pickup.position.set(randomBetween(-6, 6), 1.6, z);
  pickup.rotation.x = Math.PI / 4;
  pickup.userData = { collected: false };
  pickupGroup.add(pickup);
}

for (let i = 0; i < 16; i++) {
  createObstacle(-30 - i * 18);
  if (i % 2 === 0) createTree(-25 - i * 18);
}
for (let i = 0; i < 8; i++) {
  createPickup(-45 - i * 26);
}

function drawDebugBox(pos, size, color = 0xff0000) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.5 })
  );
  mesh.position.copy(pos);
  debugGroup.add(mesh);
  setTimeout(() => debugGroup.remove(mesh), 16);
}

function drawDebugLine(from, to, color = 0x00ff00) {
  const points = [from.clone(), to.clone()];
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(
    geom,
    new THREE.LineBasicMaterial({ color })
  );
  debugGroup.add(line);
  setTimeout(() => debugGroup.remove(line), 16);
}

function updateHud() {
  if (ui.score) ui.score.textContent = Math.floor(game.score);
  if (ui.speed) ui.speed.textContent = Math.abs(Math.floor(game.speed * 24));
  if (ui.fps) ui.fps.textContent = String(Math.max(1, Math.round(60 / Math.max(1, 1 + game.tick * 0.01))));

  if (ui.debugInfo) {
    ui.debugInfo.textContent = DEBUG.enabled
      ? `Debug: ON | Speed: ${(game.speed * 24).toFixed(1)} | Pos: (${truck.position.x.toFixed(1)}, ${truck.position.z.toFixed(1)})`
      : "Debug: OFF";
  }
}

function checkCollision(aPos, aSize, bPos, bSize) {
  const dx = Math.abs(aPos.x - bPos.x);
  const dz = Math.abs(aPos.z - bPos.z);
  return dx < aSize.x / 2 + bSize.x / 2 && dz < aSize.z / 2 + bSize.z / 2;
}

function animate(now) {
  const delta = Math.min((now - game.lastFrame) / 1000 || 0.016, 0.033);
  game.lastFrame = now;
  game.tick += 1;

  const accel = keys.forward ? 25 : 0;
  const brake = keys.backward ? 30 : 0;
  const steerPower = 1.5;

  if (keys.forward) game.speed += accel * delta;
  if (keys.backward) game.speed -= brake * delta;
  game.speed *= 0.985;
  game.speed = THREE.MathUtils.clamp(game.speed, -18, 35);

  game.steering = 0;
  if (keys.left) game.steering -= steerPower * delta * (0.8 + Math.abs(game.speed) / 30);
  if (keys.right) game.steering += steerPower * delta * (0.8 + Math.abs(game.speed) / 30);

  if (Math.abs(game.speed) > 0.05) {
    truck.rotation.y = THREE.MathUtils.lerp(truck.rotation.y, game.steering * 0.3, 0.08);
  }

  truck.rotation.z = THREE.MathUtils.lerp(truck.rotation.z, -game.steering * 0.35, 0.1);
  truck.position.x += game.steering * (game.speed * 0.11) * delta * 2.8;
  truck.position.x = THREE.MathUtils.clamp(truck.position.x, -7.2, 7.2);
  truck.position.z += game.speed * delta * 2.5;

  wheels.forEach((wheel) => {
    wheel.rotation.x += game.speed * delta * 0.6;
  });

  camera.position.x += (truck.position.x - camera.position.x) * 0.08;
  camera.position.y = 6 + Math.abs(game.speed) * 0.04;
  camera.position.z = truck.position.z + 12;
  camera.lookAt(truck.position.x, 1.2, truck.position.z - 12);

  roadGroup.position.z = -((truck.position.z + 100) % 18);

  gridHelper.visible = DEBUG.showGrid;

  if (DEBUG.showColliders) {
    drawDebugBox(truck.position, 3.5, 0xff0000);
  }

  if (DEBUG.showVelocity) {
    drawDebugLine(
      truck.position,
      new THREE.Vector3(truck.position.x + game.steering * 5, truck.position.y, truck.position.z + game.speed * 0.4),
      0x00ff00
    );
  }

  for (const obstacle of obstacles) {
    obstacle.position.z += game.speed * delta * 2.5;

    if (obstacle.position.z > 30) {
      obstacle.position.z = -120;
      obstacle.position.x = randomBetween(-6, 6);
      game.truckCollided = false;
    }

    const collision = checkCollision(
      truck.position,
      { x: 3.2, z: 6.5 },
      obstacle.position,
      { x: obstacle.userData.width, z: obstacle.userData.length }
    );

    if (collision && !game.truckCollided) {
      game.speed *= -0.25;
      truck.position.x += truck.position.x < obstacle.position.x ? -1 : 1;
      game.truckCollided = true;
    }

    if (DEBUG.showColliders) {
      drawDebugBox(obstacle.position, Math.max(obstacle.userData.width, obstacle.userData.length), 0x00ff00);
    }
  }

  for (const tree of trees) {
    tree.position.z += game.speed * delta * 2.5;
    if (tree.position.z > 30) {
      tree.position.z = -120;
      tree.position.x = randomBetween(-12, 12);
    }
  }

  for (const pickup of pickupGroup.children) {
    pickup.rotation.y += 0.1;
    pickup.position.z += game.speed * delta * 2.5;

    if (pickup.position.z > 30) {
      pickup.position.z = -120;
      pickup.position.x = randomBetween(-6, 6);
      pickup.userData.collected = false;
      pickup.visible = true;
    }

    const pickupHit = checkCollision(
      truck.position,
      { x: 3.2, z: 6.5 },
      pickup.position,
      { x: 1.5, z: 1.5 }
    );

    if (!pickup.userData.collected && pickupHit) {
      pickup.userData.collected = true;
      pickup.visible = false;
      game.score += 10;
    }

    if (DEBUG.showColliders && pickup.visible) {
      drawDebugBox(pickup.position, 1.2, 0xffff00);
    }
  }

  game.score += Math.abs(game.speed) * delta * 0.3;

  if (DEBUG.showPhysics) {
    console.log(`speed=${game.speed.toFixed(2)} steering=${game.steering.toFixed(2)} x=${truck.position.x.toFixed(1)} z=${truck.position.z.toFixed(1)}`);
  }

  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(animate);
console.log("Truck simulator started.");
console.log("Controls: W/S/A/D or arrow keys");
console.log("Debug keys: ~, 1, 2, 3, 4");
