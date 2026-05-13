import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// ==========================================
// 1. Game State & DOM Management
// ==========================================
const state = {
  wood: 0,
  stone: 0,
  food: 10,
  workers: 0,
  workerLimit: 5,
  foodConsumptionRate: 0 // every tick
};

// DOM References
const woodEl = document.getElementById("woodCount");
const stoneEl = document.getElementById("stoneCount");
const foodEl = document.getElementById("foodCount");
const foodRateEl = document.getElementById("foodDrainRate");
const workerEl = document.getElementById("workerCount");
const limitEl = document.getElementById("workerLimit");
const popBarEl = document.getElementById("popLimitBar");
const clickTarget = document.getElementById("clickTarget");
const effectsLayer = document.getElementById("clickEffectsLayer");

// Update Display
function updateUI() {
  woodEl.textContent = Math.floor(state.wood);
  stoneEl.textContent = Math.floor(state.stone);
  foodEl.textContent = Math.floor(state.food);
  
  foodRateEl.textContent = `-${state.foodConsumptionRate}/s`;
  foodRateEl.className = state.foodConsumptionRate > 0 ? "res-rate alert-text" : "res-rate";
  
  workerEl.textContent = state.workers;
  limitEl.textContent = state.workerLimit;
  
  const percent = (state.workers / state.workerLimit) * 100;
  popBarEl.style.width = `${Math.min(percent, 100)}%`;
}

// Action Click: Gather Resource
function performClick(sourceX = null, sourceY = null) {
  // Randomly award wood (50%), stone (40%), food (10%)
  const rand = Math.random();
  let text = "";
  let color = "";

  if (rand < 0.5) {
    state.wood += 1;
    text = "+1 木頭";
    color = "#818cf8"; // indigo
  } else if (rand < 0.9) {
    state.stone += 1;
    text = "+1 石頭";
    color = "#94a3b8"; // slate
  } else {
    state.food += 1;
    text = "+1 食物";
    color = "#10b981"; // emerald
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
    // Center fallback with slight randomness
    const rect = effectsLayer.getBoundingClientRect();
    x = rect.width / 2 + (Math.random() * 60 - 30);
    y = rect.height / 2 + (Math.random() * 60 - 30);
  }

  span.style.left = `${x}px`;
  span.style.top = `${y}px`;
  
  // Add a slight random X drift for the animation
  span.style.setProperty('--drift-x', `${(Math.random() - 0.5) * 40}px`);
  
  effectsLayer.appendChild(span);
  
  // Clean up DOM after animation completes
  setTimeout(() => {
    span.remove();
  }, 800);
}

// Setup Interaction Event Listeners for Mouse/Touch
clickTarget.addEventListener("mousedown", (e) => {
  // Only trigger if it's left mouse button
  if (e.button === 0) {
    performClick(e.clientX, e.clientY);
  }
});

clickTarget.addEventListener("touchstart", (e) => {
  e.preventDefault(); // Prevent double triggers with mouse emulation
  const touch = e.touches[0];
  performClick(touch.clientX, touch.clientY);
}, { passive: false });

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
  
  // Scale drawing canvas properly
  if (canvasElement.width !== video.videoWidth) {
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
