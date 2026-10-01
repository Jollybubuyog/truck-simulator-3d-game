import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// ============ DEBUG MODE ============
const DEBUG = {
  enabled: true,
  showColliders: false,
  showVelocity: false,
  showPhysics: false,
  showGrid: false,
  logPhysics: false,
  fps: 0,
  frameCount: 0,
  lastTime: performance.now(),
};

// ============ SCENE SETUP ============
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xaad9ff, 20, 130);
scene.background = new THREE.Color(0xbfe5ff);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 6, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;
document.body.appendChild(renderer.domElement);

// ============ LIGHTING ============
const hemi = new THREE.HemisphereLight(0xffffff, 0x5a7280, 1.1);
scene.add(hemi);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
dirLight.position.set(10, 25, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.far = 150;
scene.add(dirLight);

// ============ DEBUG HELPERS ============
const debugGroup = new THREE.Group();
debugGroup.name = "DebugGroup";
scene.add(debugGroup);

function drawDebugLine(from, to, color = 0xff0000) {
  const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
  debugGroup.add(line);
  setTimeout(() => debugGroup.remove(line), 16);
}

function drawDebugBox(pos, size = 1, color = 0x00ff00) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity: 0.5,
  });
  const box = new THREE.Mesh(geometry, material);
  box.position.copy(pos);
  debugGroup.add(box);
  setTimeout(() => debugGroup.remove(box), 16);
}

function drawDebugGrid(size = 20, step = 1) {
  const gridHelper = new THREE.GridHelper(size, size / step, 0x444444, 0x888888);
  gridHelper.position.y = 0.01;
  debugGroup.add(gridHelper);
}

// ============ ROAD ============
const roadGroup = new THREE.Group();
scene.add(roadGroup);

const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
const road = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 200), roadMaterial);
road.position.y = -0.5;
road.receiveShadow = true;
roadGroup.add(road);

const laneMarkMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
for (let i = -4; i <= 4; i += 2) {
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 6), laneMarkMaterial);
  line.position.set(i, 0.01, 0);
  roadGroup.add(line);
}

// ============ GROUND ============
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x7fbf6a, roughness: 0.9 })
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

// ============ TRUCK ============
const truck = new THREE.Group();
truck.name = "Truck";
scene.add(truck);

const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xd62828, metalness: 0.3 });
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2d34 });

const truckBody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 6.5), bodyMaterial);
truckBody.position.y = 1.2;
truckBody.castShadow = true;
truckBody.receiveShadow = true;
truck.add(truckBody);

const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.5, 2.6), darkMaterial);
cabin.position.set(0, 2.1, -1.2);
cabin.castShadow = true;
cabin.receiveShadow = true;
truck.add(cabin);

const trailer = new THREE.Mesh(
  new THREE.BoxGeometry(3.3, 2.3, 7.2),
  new THREE.MeshStandardMaterial({ color: 0xf7b267, metalness: 0.2 })
);
trailer.position.set(0, 1.8, 5.2);
trailer.castShadow = true;
trailer.receiveShadow = true;
truck.add(trailer);

// ============ WHEELS ============
const wheels = [];
const wheelGeometry = new THREE.CylinderGeometry(0.55, 0.55, 0.6, 18);
const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
const wheelPositions = [
  [-1.6, 0.55, -2.2],
  [1.6, 0.55, -2.2],
  [-1.6, 0.55, 1.5],
  [1.6, 0.55, 1.5],
  [-1.6, 0.55, 4.5],
  [1.6, 0.55, 4.5],
  [-1.6, 0.55, 7.2],
  [1.6, 0.55, 7.2],
];

wheelPositions.forEach(([x, y, z]) => {
  const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(x, y, z);
  wheel.castShadow = true;
  wheel.receiveShadow = true;
  truck.add(wheel);
  wheels.push(wheel);
});

truck.position.set(0, 0, 6);

// ============ CONTROLS ============
const keys = { forward: false, backward: false, left: false, right: false };
window.addEventListener("keydown", (e) => {
  if (e.key === "w" || e.key === "ArrowUp") keys.forward = true;
  if (e.key === "s" || e.key === "ArrowDown") keys.backward = true;
  if (e.key === "a" || e.key === "ArrowLeft") keys.left = true;
  if (e.key === "d" || e.key === "ArrowRight") keys.right = true;

  // Debug toggle
  if (e.key === "~") DEBUG.enabled = !DEBUG.enabled;
  if (e.key === "1") DEBUG.showColliders = !DEBUG.showColliders;
  if (e.key === "2") DEBUG.showVelocity = !DEBUG.showVelocity;
  if (e.key === "3") DEBUG.showPhysics = !DEBUG.showPhysics;
  if (e.key === "4") DEBUG.showGrid = !DEBUG.showGrid;
  if (e.key === "5") DEBUG.logPhysics = !DEBUG.logPhysics;
  if (e.key === "c") console.clear();
});

window.addEventListener("keyup", (e) => {
  if (e.key === "w" || e.key === "ArrowUp") keys.forward = false;
  if (e.key === "s" || e.key === "ArrowDown") keys.backward = false;
  if (e.key === "a" || e.key === "ArrowLeft") keys.left = false;
  if (e.key === "d" || e.key === "ArrowRight") keys.right = false;
});

// ============ PHYSICS STATE ============
const physics = {
  speed: 0,
  steering: 0,
  acceleration: 0,
  friction: 0.985,
  maxForwardSpeed: 35,
  maxReverseSpeed: -18,
  lateralSlip: 0,
  wheelRotation: 0,
};

let score = 0;
let lastTime = 0;
let truckCollided = false;

const obstacles = [];
const trees = [];
const pickupGroup = new THREE.Group();
scene.add(pickupGroup);

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// ============ OBSTACLES ============
function createObstacle(z) {
  const type = Math.random() < 0.6 ? "car" : "barrier";
  const obstacle = new THREE.Group();
  obstacle.userData = {
    type,
    velocity: 0,
    width: type === "car" ? 2.1 : 2.8,
    length: type === "car" ? 3.8 : 1.2,
  };

  if (type === "car") {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.2, 3.8),
      new THREE.MeshStandardMaterial({ color: 0x3a86ff, metalness: 0.4 })
    );
    body.position.y = 0.9;
    body.castShadow = true;
    body.receiveShadow = true;
    obstacle.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xcfe8ff })
    );
    cabin.position.set(0, 1.5, -0.2);
    cabin.castShadow = true;
    obstacle.add(cabin);

    for (const [x, y, zPos] of [
      [-1, 0.5, -1.2],
      [1, 0.5, -1.2],
      [-1, 0.5, 1.2],
      [1, 0.5, 1.2],
    ]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 0.35, 16),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, zPos);
      wheel.castShadow = true;
      obstacle.add(wheel);
    }
  } else {
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.3, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xe76f51 })
    );
    barrier.position.y = 0.8;
    barrier.castShadow = true;
    barrier.receiveShadow = true;
    obstacle.add(barrier);
  }

  obstacle.position.x = randomBetween(-6, 6);
  obstacle.position.z = z;
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
  trunk.receiveShadow = true;

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x3cb371 })
  );
  canopy.position.y = 2.2;
  canopy.castShadow = true;
  canopy.receiveShadow = true;

  const tree = new THREE.Group();
  tree.userData = { width: 2.2, length: 2.2 };
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
  pickup.castShadow = true;
  pickup.userData = { collected: false, type: "pickup" };
  pickupGroup.add(pickup);
}

for (let i = 0; i < 16; i++) {
  createObstacle(-30 - i * 18);
  if (i % 2 === 0) createTree(-25 - i * 18);
}
for (let i = 0; i < 8; i++) {
  createPickup(-45 - i * 26);
}

function updateHud() {
  document.getElementById("score").textContent = Math.floor(score);
  document.getElementById("speed").textContent = Math.abs(Math.floor(physics.speed * 24));
  document.getElementById("debug-info").textContent = DEBUG.enabled
    ? `FPS: ${DEBUG.fps} | Speed: ${(physics.speed * 24).toFixed(1)} | Pos: (${truck.position.x.toFixed(1)}, ${truck.position.z.toFixed(1)}) | Steering: ${physics.steering.toFixed(2)}`
    : "";
}

// ============ COLLISION DETECTION ============
function checkCollision(pos1, size1, pos2, size2) {
  const dx = Math.abs(pos1.x - pos2.x);
  const dz = Math.abs(pos1.z - pos2.z);
  return dx < size1.x / 2 + size2.x / 2 && dz < size1.z / 2 + size2.z / 2;
}

// ============ ANIMATION LOOP ============
function animate(now) {
  // FPS Counter
  DEBUG.frameCount++;
  if (now - DEBUG.lastTime > 1000) {
    DEBUG.fps = DEBUG.frameCount;
    DEBUG.frameCount = 0;
    DEBUG.lastTime = now;
  }

  const delta = Math.min((now - lastTime) / 1000 || 0.016, 0.033);
  lastTime = now;

  // ========== TRUCK PHYSICS ==========
  const accel = keys.forward ? 25 : 0;
  const brake = keys.backward ? 30 : 0;
  const steerPower = 1.5;

  if (keys.forward) physics.speed += accel * delta;
  if (keys.backward) physics.speed -= brake * delta;
  physics.speed *= physics.friction;

  physics.speed = THREE.MathUtils.clamp(physics.speed, physics.maxReverseSpeed, physics.maxForwardSpeed);

  if (DEBUG.logPhysics) {
    console.log(`Speed: ${physics.speed.toFixed(2)}, Steering: ${physics.steering.toFixed(2)}`);
  }

  // Rotation based on speed
  if (Math.abs(physics.speed) > 0.05) {
    truck.rotation.y = THREE.MathUtils.lerp(truck.rotation.y, physics.steering * 0.3, 0.08);
  }

  // Steering input
  physics.steering = 0;
  if (keys.left)
    physics.steering -= steerPower * delta * (0.8 + Math.abs(physics.speed) / 30);
  if (keys.right)
    physics.steering += steerPower * delta * (0.8 + Math.abs(physics.speed) / 30);

  truck.rotation.z = THREE.MathUtils.lerp(truck.rotation.z, -physics.steering * 0.35, 0.1);

  // Position update
  truck.position.x += physics.steering * (physics.speed * 0.11) * delta * 2.8;
  truck.position.x = THREE.MathUtils.clamp(truck.position.x, -7.2, 7.2);
  truck.position.z += physics.speed * delta * 2.5;

  // Wheel rotation
  physics.wheelRotation += physics.speed * delta;
  wheels.forEach((wheel) => {
    wheel.rotation.x = physics.wheelRotation;
  });

  // ========== DEBUG VISUALIZATION ==========
  if (DEBUG.showGrid) drawDebugGrid();
  if (DEBUG.showColliders) {
    drawDebugBox(truck.position, 1, 0xff0000);
  }
  if (DEBUG.showVelocity) {
    const velocityEnd = new THREE.Vector3(
      truck.position.x + physics.steering * 2,
      truck.position.y,
      truck.position.z + physics.speed
    );
    drawDebugLine(truck.position, velocityEnd, 0x00ff00);
  }

  // ========== CAMERA FOLLOW ==========
  camera.position.x += (truck.position.x - camera.position.x) * 0.08;
  camera.position.y = 6 + Math.abs(physics.speed) * 0.04;
  camera.position.z = truck.position.z + 12;
  camera.lookAt(truck.position.x, 1.2, truck.position.z - 12);

  // ========== ROAD SCROLL ==========
  roadGroup.position.z = -((truck.position.z + 100) % 18);
  road.position.z = -truck.position.z * 0.5;

  // ========== OBSTACLES ==========
  for (const obstacle of obstacles) {
    obstacle.position.z += physics.speed * delta * 2.5;

    if (obstacle.position.z > 30) {
      obstacle.position.z = -120;
      obstacle.position.x = randomBetween(-6, 6);
      truckCollided = false;
    }

    const collision = checkCollision(
      truck.position,
      { x: 3.2, z: 6.5 },
      obstacle.position,
      { x: obstacle.userData.width, z: obstacle.userData.length }
    );

    if (collision && !truckCollided) {
      physics.speed *= -0.25;
      truck.position.x += (truck.position.x < obstacle.position.x ? -1 : 1) * 0.7;
      truckCollided = true;

      if (DEBUG.enabled) console.log("Collision detected!");
    }

    if (DEBUG.showColliders) {
      drawDebugBox(
        obstacle.position,
        Math.max(obstacle.userData.width, obstacle.userData.length),
        0x00ff00
      );
    }
  }

  // ========== TREES ==========
  for (const tree of trees) {
    tree.position.z += physics.speed * delta * 2.5;
    if (tree.position.z > 30) {
      tree.position.z = -120;
      tree.position.x = randomBetween(-12, 12);
    }

    if (DEBUG.showColliders) {
      drawDebugBox(tree.position, 2, 0x0000ff);
    }
  }

  // ========== PICKUPS ==========
  for (const pickup of pickupGroup.children) {
    pickup.rotation.y += 0.1;
    pickup.position.z += physics.speed * delta * 2.5;

    if (pickup.position.z > 30) {
      pickup.position.z = -120;
      pickup.position.x = randomBetween(-6, 6);
      pickup.userData.collected = false;
      pickup.visible = true;
    }

    const pickupCollision = checkCollision(
      truck.position,
      { x: 3.2, z: 6.5 },
      pickup.position,
      { x: 1.5, z: 1.5 }
    );

    if (!pickup.userData.collected && pickupCollision) {
      pickup.userData.collected = true;
      pickup.visible = false;
      score += 10;

      if (DEBUG.enabled) console.log("Pickup collected! Score:", Math.floor(score));
    }

    if (DEBUG.showColliders && pickup.visible) {
      drawDebugBox(pickup.position, 1, 0xffff00);
    }
  }

  score += Math.abs(physics.speed) * delta * 0.3;
  updateHud();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// ========== RESIZE HANDLER ==========
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ========== CONSOLE LOG ON LOAD ==========
console.log(`
🚚 TRUCK SIMULATOR 3D - DEBUG CONSOLE
=====================================
Controls:
  W/↑ - Forward
  S/↓ - Reverse
  A/← - Left
  D/→ - Right

Debug Keys (press ~ to toggle console):
  ~ - Toggle debug mode
  1 - Toggle collision boxes
  2 - Show velocity vector
  3 - Show physics data
  4 - Toggle grid
  5 - Log physics (console)
  C - Clear console

Check console for physics logs when Debug Mode is enabled.
`);
