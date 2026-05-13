import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// ==========================================
// 1. Game State & Constants & DOM Management
// ==========================================
const state = {
  wood: 0,
  stone: 0,
  food: 20, // Start with 20 food so hiring is immediately playable
  workers: 0,
  workerLimit: 5,
  foodConsumptionRate: 0,
  gatherFocus: 'wood',
  buildings: {
    cabins: 0,
    farms: 0
  },
  jobs: {
    woodcutter: 0,
    miner: 0,
    farmer: 0
  }
};

const COSTS = {
  worker: { food: 20 },
  cabin: { wood: 25 },
  farm: { wood: 30, stone: 15 }
};

// DOM References
const woodEl = document.getElementById("woodCount");
const stoneEl = document.getElementById("stoneCount");
const foodEl = document.getElementById("foodCount");
const foodRateEl = document.getElementById("foodDrainRate");
const workerEl = document.getElementById("workerCount");
const limitEl = document.getElementById("workerLimit");
const popBarEl = document.getElementById("popLimitBar");
const effectsLayer = document.getElementById("clickEffectsLayer");

// Target Nodes DOM
const nodeWood = document.getElementById("node-wood");
const nodeStone = document.getElementById("node-stone");
const nodeFood = document.getElementById("node-food");
const focusBadgeText = document.getElementById("activeFocusText");

// Build Panel DOM
const cabinCountEl = document.getElementById("cabinCount");
const farmCountEl = document.getElementById("farmCount");
const btnHireWorker = document.getElementById("btn-hire-worker");
const btnBuildCabin = document.getElementById("btn-build-cabin");
const btnBuildFarm = document.getElementById("btn-build-farm");

// Dispatch Panel DOM
const idleCountEl = document.getElementById("idleWorkers");
const cntWoodcutterEl = document.getElementById("cnt-woodcutter");
const cntMinerEl = document.getElementById("cnt-miner");
const cntFarmerEl = document.getElementById("cnt-farmer");

// Mobile Tab DOM
const navItems = document.querySelectorAll(".nav-item");
const tabColumns = document.querySelectorAll(".tab-column");

// Set Active Gathering Focus
function setGatherFocus(resource) {
  state.gatherFocus = resource;
  
  // Update node highlights
  nodeWood.classList.remove("active");
  nodeStone.classList.remove("active");
  nodeFood.classList.remove("active");
  
  if (resource === 'wood') {
    nodeWood.classList.add("active");
    focusBadgeText.innerHTML = `🌳 採集木頭`;
  } else if (resource === 'stone') {
    nodeStone.classList.add("active");
    focusBadgeText.innerHTML = `🪨 採集石頭`;
  } else {
    nodeFood.classList.add("active");
    focusBadgeText.innerHTML = `🌾 搜尋食物`;
  }
}

// Update Display
function updateUI() {
  woodEl.textContent = Math.floor(state.wood);
  stoneEl.textContent = Math.floor(state.stone);
  foodEl.textContent = Math.floor(state.food);
  
  // Calculate net food per second
  const passiveGen = (state.buildings.farms * 1.0) + (state.jobs.farmer * 0.5);
  const passiveCon = state.workers * 0.5;
  const netFoodRate = passiveGen - passiveCon;
  const sign = netFoodRate >= 0 ? "+" : "";
  foodRateEl.textContent = `${sign}${netFoodRate.toFixed(1)}/秒`;
  foodRateEl.className = netFoodRate < 0 ? "res-rate alert-text" : "res-rate";
  
  workerEl.textContent = state.workers;
  state.workerLimit = 5 + (state.buildings.cabins * 5);
  limitEl.textContent = state.workerLimit;
  
  const percent = (state.workers / state.workerLimit) * 100;
  popBarEl.style.width = `${Math.min(percent, 100)}%`;
  
  // Update Building level trackers
  cabinCountEl.textContent = state.buildings.cabins;
  farmCountEl.textContent = state.buildings.farms;

  // Update Job allocation counters
  const assignedCount = state.jobs.woodcutter + state.jobs.miner + state.jobs.farmer;
  const idleWorkers = Math.max(0, state.workers - assignedCount);
  idleCountEl.textContent = idleWorkers;
  cntWoodcutterEl.textContent = state.jobs.woodcutter;
  cntMinerEl.textContent = state.jobs.miner;
  cntFarmerEl.textContent = state.jobs.farmer;

  // Enable/Disable Job control buttons
  document.querySelectorAll('.ctrl-btn.btn-minus').forEach(btn => {
    const jobName = btn.getAttribute('data-job');
    btn.disabled = (state.jobs[jobName] <= 0);
  });
  document.querySelectorAll('.ctrl-btn.btn-plus').forEach(btn => {
    btn.disabled = (idleWorkers <= 0);
  });
  
  // Enable/Disable buttons dynamically based on current funds
  btnHireWorker.disabled = (state.food < COSTS.worker.food || state.workers >= state.workerLimit);
  btnBuildCabin.disabled = (state.wood < COSTS.cabin.wood);
  btnBuildFarm.disabled = (state.wood < COSTS.farm.wood || state.stone < COSTS.farm.stone);
}

// Dispatch Logic: Assign jobs
function adjustJob(jobName, delta) {
  const assignedCount = state.jobs.woodcutter + state.jobs.miner + state.jobs.farmer;
  const idleWorkers = state.workers - assignedCount;

  if (delta > 0 && idleWorkers > 0) {
    state.jobs[jobName] += 1;
  } else if (delta < 0 && state.jobs[jobName] > 0) {
    state.jobs[jobName] -= 1;
  }
  updateUI();
}

// Action Click: Gather Resource
function performClick(resourceOverride = null, sourceX = null, sourceY = null) {
  const resource = resourceOverride || state.gatherFocus;
  let text = "";
  let color = "";

  if (resource === "wood") {
    state.wood += 1;
    text = "+1 木頭";
    color = "#818cf8"; // indigo
  } else if (resource === "stone") {
    state.stone += 1;
    text = "+1 石頭";
    color = "#94a3b8"; // slate
  } else {
    state.food += 1;
    text = "+1 食物";
    color = "#f59e0b"; // amber
  }

  // If manual click, swap the AI targeting lock-on
  if (resourceOverride) {
    setGatherFocus(resourceOverride);
  }

  updateUI();
  spawnFloatingText(text, color, sourceX, sourceY);
}

// Spawn floating text particles
function spawnFloatingText(text, color, clientX = null, clientY = null) {
  const span = document.createElement("span");
  span.className = "floating-num";
  span.style.color = color;
  span.textContent = text;

  let x, y;
  if (clientX !== null && clientY !== null) {
    const rect = effectsLayer.getBoundingClientRect();
    x = clientX - rect.left;
    y = clientY - rect.top;
  } else {
    // AI/Automated spawning relative to focused node container
    const activeNodeEl = document.getElementById(`node-${state.gatherFocus}`);
    if (activeNodeEl) {
      const rectNode = activeNodeEl.getBoundingClientRect();
      const rectLayer = effectsLayer.getBoundingClientRect();
      x = (rectNode.left - rectLayer.left) + (rectNode.width / 2) + (Math.random() * 60 - 30);
      y = (rectNode.top - rectLayer.top) + (rectNode.height / 2) + (Math.random() * 60 - 30);
    } else {
      const rect = effectsLayer.getBoundingClientRect();
      x = rect.width / 2 + (Math.random() * 60 - 30);
      y = rect.height / 2 + (Math.random() * 60 - 30);
    }
  }

  span.style.left = `${x}px`;
  span.style.top = `${y}px`;
  span.style.setProperty('--drift-x', `${(Math.random() - 0.5) * 40}px`);
  
  effectsLayer.appendChild(span);
  
  setTimeout(() => {
    span.remove();
  }, 800);
}

// ==========================================
// Game Tick Loops (Farms, Consumptions, Jobs)
// ==========================================
function gameTick() {
  // 1. Passive food yield (Farms: +1/s, Farmers: +0.5/s)
  const passiveGen = (state.buildings.farms * 1) + (state.jobs.farmer * 0.5);
  state.food += passiveGen;
  
  // 2. Worker Consumption (eats 0.5 food/s each)
  const passiveCon = state.workers * 0.5;
  state.food -= passiveCon;
  
  // 3. Specialized Worker Yields (Lumberjacks: +0.6/s, Miners: +0.3/s)
  state.wood += state.jobs.woodcutter * 0.6;
  state.stone += state.jobs.miner * 0.3;
  
  // 4. Handle Survival / Hunger Deaths
  if (state.food < 0) {
    state.food = 0;
    // Starving condition: 25% chance per sec to lose worker
    if (state.workers > 0 && Math.random() < 0.25) {
      state.workers -= 1;
      spawnFloatingText("👷 飢荒工人逃亡!", "#ef4444");

      // Sync job state: Deduct 1 worker from jobs if we have no idle pool remaining
      const totalAssigned = state.jobs.woodcutter + state.jobs.miner + state.jobs.farmer;
      if (totalAssigned > state.workers) {
        // Priority to remove from: Woodcutters first, Miners second, Farmers last
        if (state.jobs.woodcutter > 0) {
          state.jobs.woodcutter -= 1;
        } else if (state.jobs.miner > 0) {
          state.jobs.miner -= 1;
        } else if (state.jobs.farmer > 0) {
          state.jobs.farmer -= 1;
        }
      }
    }
  }
  
  updateUI();
}

// Initialize background engine loop
setInterval(gameTick, 1000);

// ==========================================
// Native Touch/Mouse Bindings
// ==========================================
function bindResourceNode(el, resourceType) {
  const handler = (e) => {
    e.preventDefault();
    let clientX = null, clientY = null;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.button === 0) {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    performClick(resourceType, clientX, clientY);
  };
  
  el.addEventListener("mousedown", handler);
  el.addEventListener("touchstart", handler, { passive: false });
}

bindResourceNode(nodeWood, 'wood');
bindResourceNode(nodeStone, 'stone');
bindResourceNode(nodeFood, 'food');

// Setup Building Card triggers
btnHireWorker.addEventListener("click", () => {
  if (state.food >= COSTS.worker.food && state.workers < state.workerLimit) {
    state.food -= COSTS.worker.food;
    state.workers += 1;
    spawnFloatingText("+1 工人 👷", "#10b981");
    updateUI();
  }
});

btnBuildCabin.addEventListener("click", () => {
  if (state.wood >= COSTS.cabin.wood) {
    state.wood -= COSTS.cabin.wood;
    state.buildings.cabins += 1;
    spawnFloatingText("+1 木屋 🏚️", "#818cf8");
    updateUI();
  }
});

btnBuildFarm.addEventListener("click", () => {
  if (state.wood >= COSTS.farm.wood && state.stone >= COSTS.farm.stone) {
    state.wood -= COSTS.farm.wood;
    state.stone -= COSTS.farm.stone;
    state.buildings.farms += 1;
    spawnFloatingText("+1 農田 🌾", "#f59e0b");
    updateUI();
  }
});

// Bind Dispatch Ctrl Buttons
document.querySelectorAll(".ctrl-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const job = btn.getAttribute("data-job");
    const isPlus = btn.classList.contains("btn-plus");
    adjustJob(job, isPlus ? 1 : -1);
  });
});

// Hook Up Responsive Tab Click Handlers
navItems.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");
    
    // Update buttons styles
    navItems.forEach(n => n.classList.remove("active"));
    btn.classList.add("active");
    
    // Toggle visibility of sections
    tabColumns.forEach(col => {
      if (col.id === target) {
        col.classList.add("active");
      } else {
        col.classList.remove("active");
      }
    });
  });
});

// ==========================================
// 2. AI & Hand Landmarker Integration
// ==========================================

let handLandmarker = undefined;
let webcamRunning = false;

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("outputCanvas");
const canvasCtx = canvasElement.getContext("2d");
const modelLoader = document.getElementById("modelLoader");
const webcamToggleBtn = document.getElementById("webcamToggleBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const velocityBar = document.getElementById("velocityBar");

// Initialize AI
async function initMediaPipe() {
  try {
    // Use CDN assets to guarantee fast load and zero bloat
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
    );
    
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 1, // Target 1 hand for optimized clicker focus
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6
    });
    
    // Fully loaded
    modelLoader.style.opacity = "0";
    setTimeout(() => modelLoader.style.display = "none", 400);
    
    webcamToggleBtn.disabled = false;
    statusText.innerText = "AI 系統就緒";
    statusDot.style.backgroundColor = "#3b82f6"; // Ready blue
  } catch (error) {
    console.error("MediaPipe Init Failed:", error);
    modelLoader.innerText = "模型載入失敗，請重新整理或檢查網絡連線。";
  }
}

// Toggle Camera Logic
webcamToggleBtn.addEventListener("click", async () => {
  if (!handLandmarker) return;

  if (webcamRunning) {
    webcamRunning = false;
    webcamToggleBtn.innerHTML = `<span class="btn-icon">🎥</span> 開啟視訊鏡頭`;
    statusText.innerText = "AI 離線";
    statusDot.classList.remove("active");
    statusDot.style.backgroundColor = "#ef4444";
    velocityBar.style.width = "0%";
    
    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    video.srcObject = null;
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  } else {
    try {
      statusText.innerText = "連線中...";
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
      });
      
      video.srcObject = stream;
      webcamRunning = true;
      webcamToggleBtn.innerHTML = `<span class="btn-icon">⏹️</span> 關閉視訊鏡頭`;
      statusText.innerText = "追蹤啟動中";
      
      video.addEventListener("loadeddata", () => {
        statusText.innerText = "偵測進行中";
        statusDot.classList.add("active");
        predictLoop();
      });
    } catch (err) {
      console.error("Camera Error:", err);
      statusText.innerText = "相機存取錯誤";
      webcamRunning = false;
    }
  }
});

// ==========================================
// 3. Finger Motion Vector tracking
// ==========================================

let lastVideoTime = -1;
let results = undefined;

// Position tracking state
let prevIndexTip = null; // Stores {x, y} of Landmark 8 in previous frame
let accumulatedMotion = 0; // Accumulated distance
const CLICK_THRESHOLD = 0.22; // Total distance accumulation that triggers a click
const MOTION_DECAY = 0.92; // Natural slowing down per frame

function processHandMotion(landmarks) {
  // Landmark 8 is the Index Finger Tip
  const indexTip = landmarks[8];
  
  if (prevIndexTip) {
    // Calculate 2D Euclidean Distance delta
    const dx = indexTip.x - prevIndexTip.x;
    const dy = indexTip.y - prevIndexTip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Filter out micro-tremors or tiny shifts (noise reduction)
    if (dist > 0.005) {
      accumulatedMotion += dist;
    }
  }
  
  // Apply decay to stabilize meter and reward constant motion
  accumulatedMotion *= MOTION_DECAY;
  if (accumulatedMotion < 0) accumulatedMotion = 0;
  
  // Render intensity onto meter (normalize threshold to visual 0-100%)
  const visualPercent = Math.min((accumulatedMotion / CLICK_THRESHOLD) * 100, 100);
  velocityBar.style.width = `${visualPercent}%`;
  
  // Trigger Action if user moves index finger rapidly enough
  if (accumulatedMotion >= CLICK_THRESHOLD) {
    performClick();
    accumulatedMotion = 0; // Reset meter after a successful trigger
    
    // Flash the meter briefly for impact
    velocityBar.style.backgroundColor = "#ffffff";
    setTimeout(() => velocityBar.style.backgroundColor = "", 100);
  }
  
  prevIndexTip = { x: indexTip.x, y: indexTip.y };
}

// ==========================================
// 4. Render & Visualization Loop
// ==========================================

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [5, 9], [9, 10], [10, 11], [11, 12], // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [0, 17] // Palm
];

function drawOverlay(landmarks) {
  canvasCtx.lineWidth = 4;
  
  // 1. Draw connections/bones
  for (const conn of HAND_CONNECTIONS) {
    const p1 = landmarks[conn[0]];
    const p2 = landmarks[conn[1]];
    
    canvasCtx.beginPath();
    canvasCtx.moveTo(p1.x * canvasElement.width, p1.y * canvasElement.height);
    canvasCtx.lineTo(p2.x * canvasElement.width, p2.y * canvasElement.height);
    
    const grad = canvasCtx.createLinearGradient(
      p1.x * canvasElement.width, p1.y * canvasElement.height,
      p2.x * canvasElement.width, p2.y * canvasElement.height
    );
    grad.addColorStop(0, "#6366f1"); // Indigo
    grad.addColorStop(1, "#10b981"); // Emerald
    
    canvasCtx.strokeStyle = grad;
    canvasCtx.stroke();
  }

  // 2. Draw joints
  landmarks.forEach((pt, idx) => {
    canvasCtx.beginPath();
    canvasCtx.arc(pt.x * canvasElement.width, pt.y * canvasElement.height, idx === 8 ? 8 : 4, 0, 2 * Math.PI);
    
    // Highlight Index Tip!
    if (idx === 8) {
      canvasCtx.fillStyle = "#fcd34d"; // Highlight index finger tip in gold
      canvasCtx.strokeStyle = "#ffffff";
      canvasCtx.lineWidth = 2;
      canvasCtx.fill();
      canvasCtx.stroke();
    } else {
      canvasCtx.fillStyle = "#ffffff";
      canvasCtx.fill();
    }
  });
}

async function predictLoop() {
  if (!webcamRunning) return;
  
  // Scale drawing canvas properly (only if video element dimensions are active)
  if (video.videoWidth > 0 && canvasElement.width !== video.videoWidth) {
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;
  }
  
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  
  let startTimeMs = performance.now();
  
  if (lastVideoTime !== video.currentTime && video.readyState >= 2) {
    lastVideoTime = video.currentTime;
    results = handLandmarker.detectForVideo(video, startTimeMs);
  }
  
  if (results && results.landmarks && results.landmarks.length > 0) {
    const currentHand = results.landmarks[0];
    processHandMotion(currentHand);
    drawOverlay(currentHand);
  } else {
    // No hand detected -> decay motion
    accumulatedMotion *= 0.85;
    velocityBar.style.width = `${Math.min((accumulatedMotion / CLICK_THRESHOLD) * 100, 100)}%`;
    prevIndexTip = null;
  }
  
  requestAnimationFrame(predictLoop);
}

// Init on DOM load
window.addEventListener("DOMContentLoaded", () => {
  updateUI();
  initMediaPipe();
});
