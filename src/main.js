import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// ==========================================
// 1. Game State & Constants & DOM Management
// ==========================================
const state = {
  wood: 0,
  stone: 0,
  food: 30,
  metal: 0,
  energy: 0,
  money: 0,
  knowledge: 0,
  workers: 0,
  workerLimit: 5,
  gatherFocus: 'wood',
  buildings: {
    cabins: 0,
    farms: 0,
    smelter: 0,
    powerPlant: 0,
    warehouse: 0,
    battery: 0,
    bank: 0,
    school: 0
  },
  jobs: {
    woodcutter: 0,
    miner: 0,
    farmer: 0,
    merchant: 0,
    scholar: 0
  }
};

const COSTS = {
  worker: { food: 20 },
  cabin: { wood: 25 },
  farm: { wood: 30, stone: 15 },
  smelter: { wood: 40, stone: 50 },
  powerPlant: { stone: 80, metal: 20 },
  warehouse: { wood: 50, stone: 30 },
  battery: { stone: 60, metal: 40 },
  bank: { wood: 60, metal: 30 },
  school: { wood: 80, stone: 60, energy: 20 }
};

// DOM References
const woodEl = document.getElementById("woodCount");
const woodMaxEl = document.getElementById("woodMax");
const resWoodItem = document.getElementById("res-wood");

const stoneEl = document.getElementById("stoneCount");
const stoneMaxEl = document.getElementById("stoneMax");
const resStoneItem = document.getElementById("res-stone");

const foodEl = document.getElementById("foodCount");
const foodMaxEl = document.getElementById("foodMax");
const foodRateEl = document.getElementById("foodDrainRate");
const resFoodItem = document.getElementById("res-food");

const metalEl = document.getElementById("metalCount");
const metalMaxEl = document.getElementById("metalMax");
const metalRateEl = document.getElementById("metalGenRate");
const resMetalItem = document.getElementById("res-metal");

const energyEl = document.getElementById("energyCount");
const energyMaxEl = document.getElementById("energyMax");
const energyRateEl = document.getElementById("energyGenRate");
const resEnergyItem = document.getElementById("res-energy");

const moneyEl = document.getElementById("moneyCount");
const moneyMaxEl = document.getElementById("moneyMax");
const moneyRateEl = document.getElementById("moneyGenRate");
const resMoneyItem = document.getElementById("res-money");

const knowledgeEl = document.getElementById("knowledgeCount");
const knowledgeRateEl = document.getElementById("knowledgeGenRate");

const workerEl = document.getElementById("workerCount");
const limitEl = document.getElementById("workerLimit");
const popBarEl = document.getElementById("popLimitBar");
const effectsLayer = document.getElementById("clickEffectsLayer");

// Target Nodes DOM
const nodeWood = document.getElementById("node-wood");
const nodeStone = document.getElementById("node-stone");
const focusBadgeText = document.getElementById("activeFocusText");

// Build Panel DOM
const cabinCountEl = document.getElementById("cabinCount");
const farmCountEl = document.getElementById("farmCount");
const smelterCountEl = document.getElementById("smelterCount");
const powerCountEl = document.getElementById("powerCount");
const warehouseCountEl = document.getElementById("warehouseCount");
const batteryCountEl = document.getElementById("batteryCount");

const bankCountEl = document.getElementById("bankCount");
const schoolCountEl = document.getElementById("schoolCount");

const btnHireWorker = document.getElementById("btn-hire-worker");
const btnBuildCabin = document.getElementById("btn-build-cabin");
const btnBuildFarm = document.getElementById("btn-build-farm");
const btnBuildSmelter = document.getElementById("btn-build-smelter");
const btnBuildPower = document.getElementById("btn-build-power");
const btnBuildWarehouse = document.getElementById("btn-build-warehouse");
const btnBuildBattery = document.getElementById("btn-build-battery");
const btnBuildBank = document.getElementById("btn-build-bank");
const btnBuildSchool = document.getElementById("btn-build-school");

// Dispatch Panel DOM
const idleCountEl = document.getElementById("idleWorkers");
const cntWoodcutterEl = document.getElementById("cnt-woodcutter");
const cntMinerEl = document.getElementById("cnt-miner");
const cntFarmerEl = document.getElementById("cnt-farmer");
const cntMerchantEl = document.getElementById("cnt-merchant");
const cntScholarEl = document.getElementById("cnt-scholar");

// Mobile Tab DOM
const navItems = document.querySelectorAll(".nav-item");
const tabColumns = document.querySelectorAll(".tab-column");

// ==========================================
// 2. Save / Load / Toast System
// ==========================================

const SAVE_KEY = "ai_clicker_save_v1";
const toastEl = document.getElementById("toastNotification");
let toastTimer = null;

function showToast(message, type = "success") {
  toastEl.textContent = message;
  toastEl.className = `toast-notification toast-${type} show`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2500);
}

function saveGame() {
  try {
    const saveData = {
      version: 1,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state)) // deep clone
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    showToast("💾 存檔成功！", "success");
  } catch (e) {
    showToast("❌ 存檔失敗：" + e.message, "error");
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      showToast("📂 找不到存檔！", "error");
      return false;
    }
    const saveData = JSON.parse(raw);
    const saved = saveData.state;

    // Deep merge — only restore known state keys
    Object.keys(state).forEach(key => {
      if (saved[key] !== undefined) {
        if (typeof state[key] === 'object' && state[key] !== null) {
          Object.assign(state[key], saved[key]);
        } else {
          state[key] = saved[key];
        }
      }
    });

    // Restore UI from loaded state
    setGatherFocus(state.gatherFocus || 'wood');
    updateUI();

    const date = new Date(saveData.timestamp);
    showToast(`📂 讀檔成功！（${date.toLocaleTimeString('zh-TW')}）`, "info");
    return true;
  } catch (e) {
    showToast("❌ 讀檔失敗：" + e.message, "error");
    return false;
  }
}

function resetGame() {
  if (!confirm("確定要刪除存檔並重置遊戲嗎？\n（此操作無法復原）")) return;
  localStorage.removeItem(SAVE_KEY);
  // Reset all state fields back to defaults
  state.wood = 0; state.stone = 0; state.food = 30;
  state.metal = 0; state.energy = 0; state.money = 0; state.knowledge = 0;
  state.workers = 0; state.workerLimit = 5; state.gatherFocus = 'wood';
  Object.keys(state.buildings).forEach(k => state.buildings[k] = 0);
  Object.keys(state.jobs).forEach(k => state.jobs[k] = 0);
  setGatherFocus('wood');
  updateUI();
  showToast("🗑️ 已重置！重新開始！", "error");
}

// Bind save/load/reset buttons
document.getElementById("btn-save").addEventListener("click", saveGame);
document.getElementById("btn-load").addEventListener("click", loadGame);
document.getElementById("btn-reset").addEventListener("click", resetGame);

// Auto-save every 30 seconds
setInterval(() => {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, timestamp: Date.now(), state: JSON.parse(JSON.stringify(state)) }));
}, 30000);

// ==========================================
// 3. Set Active Gathering Focus
// ==========================================

function setGatherFocus(resource) {
  state.gatherFocus = resource;
  
  // Update node highlights
  nodeWood.classList.remove("active");
  nodeStone.classList.remove("active");
  
  if (resource === 'wood') {
    nodeWood.classList.add("active");
    focusBadgeText.innerHTML = `🌳 採集木頭`;
  } else if (resource === 'stone') {
    nodeStone.classList.add("active");
    focusBadgeText.innerHTML = `🪨 採集石頭`;
  }
}

// Calculate Dynamic Storage Limits based on Warehouses/Batteries
function getCapacities() {
  const whBonus = state.buildings.warehouse * 100;
  const batBonus = state.buildings.battery * 100;
  return {
    wood: 100 + whBonus,
    stone: 100 + whBonus,
    food: 100 + whBonus,
    metal: 50 + whBonus,
    energy: 50 + batBonus
  };
}

// Update Display
function updateUI() {
  const caps = getCapacities();
  
  woodEl.textContent = Math.floor(state.wood);
  woodMaxEl.textContent = caps.wood;
  resWoodItem.classList.toggle("res-full", Math.floor(state.wood) >= caps.wood);

  stoneEl.textContent = Math.floor(state.stone);
  stoneMaxEl.textContent = caps.stone;
  resStoneItem.classList.toggle("res-full", Math.floor(state.stone) >= caps.stone);

  foodEl.textContent = Math.floor(state.food);
  foodMaxEl.textContent = caps.food;
  resFoodItem.classList.toggle("res-full", Math.floor(state.food) >= caps.food);

  metalEl.textContent = Math.floor(state.metal);
  metalMaxEl.textContent = caps.metal;
  resMetalItem.classList.toggle("res-full", Math.floor(state.metal) >= caps.metal);

  energyEl.textContent = Math.floor(state.energy);
  energyMaxEl.textContent = caps.energy;
  resEnergyItem.classList.toggle("res-full", Math.floor(state.energy) >= caps.energy);
  
  // Calculate net food per second
  const passiveGen = (state.buildings.farms * 1.0) + (state.jobs.farmer * 0.5);
  const passiveCon = state.workers * 0.5;
  const netFoodRate = passiveGen - passiveCon;
  const sign = netFoodRate >= 0 ? "+" : "";
  foodRateEl.textContent = `${sign}${netFoodRate.toFixed(1)}/秒`;
  foodRateEl.className = netFoodRate < 0 ? "res-rate alert-text" : "res-rate";

  // Update automated Metal rates
  const netMetalRate = state.buildings.smelter * 0.3;
  metalRateEl.textContent = `+${netMetalRate.toFixed(1)}/秒`;

  // Update automated Energy rates
  const netEnergyRate = state.buildings.powerPlant * 1.0;
  energyRateEl.textContent = `+${netEnergyRate.toFixed(1)}/秒`;
  
  // Money display
  moneyEl.textContent = Math.floor(state.money);
  moneyMaxEl.textContent = 1000;
  resMoneyItem.classList.toggle("res-full", Math.floor(state.money) >= 1000);

  // Knowledge display (no cap, just count)
  knowledgeEl.textContent = Math.floor(state.knowledge);

  // Money rate: bank passive + merchants active
  const netMoneyRate = (state.buildings.bank * 1.0) + (state.jobs.merchant * 2.0);
  moneyRateEl.textContent = `+${netMoneyRate.toFixed(1)}/秒`;

  // Knowledge rate: scholars only
  const netKnowledgeRate = state.jobs.scholar * 1.0;
  knowledgeRateEl.textContent = `+${netKnowledgeRate.toFixed(1)}/秒`;

  workerEl.textContent = state.workers;
  state.workerLimit = 5 + (state.buildings.cabins * 5);
  limitEl.textContent = state.workerLimit;
  
  const percent = (state.workers / state.workerLimit) * 100;
  popBarEl.style.width = `${Math.min(percent, 100)}%`;
  
  // Update Building level trackers
  cabinCountEl.textContent = state.buildings.cabins;
  farmCountEl.textContent = state.buildings.farms;
  smelterCountEl.textContent = state.buildings.smelter;
  powerCountEl.textContent = state.buildings.powerPlant;
  warehouseCountEl.textContent = state.buildings.warehouse;
  batteryCountEl.textContent = state.buildings.battery;
  bankCountEl.textContent = state.buildings.bank;
  schoolCountEl.textContent = state.buildings.school;

  // Show/hide merchant and scholar jobs based on prerequisites
  document.getElementById('job-merchant').style.opacity = '1';
  document.getElementById('job-scholar').style.opacity = state.buildings.school > 0 ? '1' : '0.3';

  // Update Job allocation counters
  const assignedCount = state.jobs.woodcutter + state.jobs.miner + state.jobs.farmer + state.jobs.merchant + state.jobs.scholar;
  const idleWorkers = Math.max(0, state.workers - assignedCount);
  idleCountEl.textContent = idleWorkers;
  cntWoodcutterEl.textContent = state.jobs.woodcutter;
  cntMinerEl.textContent = state.jobs.miner;
  cntFarmerEl.textContent = state.jobs.farmer;
  cntMerchantEl.textContent = state.jobs.merchant;
  cntScholarEl.textContent = state.jobs.scholar;

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
  btnBuildSmelter.disabled = (state.wood < COSTS.smelter.wood || state.stone < COSTS.smelter.stone);
  btnBuildPower.disabled = (state.stone < COSTS.powerPlant.stone || state.metal < COSTS.powerPlant.metal);
  btnBuildWarehouse.disabled = (state.wood < COSTS.warehouse.wood || state.stone < COSTS.warehouse.stone);
  btnBuildBattery.disabled = (state.stone < COSTS.battery.stone || state.metal < COSTS.battery.metal);
  btnBuildBank.disabled = (state.wood < COSTS.bank.wood || state.metal < COSTS.bank.metal);
  btnBuildSchool.disabled = (state.wood < COSTS.school.wood || state.stone < COSTS.school.stone || state.energy < COSTS.school.energy);
}

// Dispatch Logic: Assign jobs
function adjustJob(jobName, delta) {
  const assignedCount = state.jobs.woodcutter + state.jobs.miner + state.jobs.farmer + state.jobs.merchant + state.jobs.scholar;
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
  const caps = getCapacities();
  let text = "";
  let color = "";

  if (resource === "wood") {
    if (Math.floor(state.wood) >= caps.wood) return; // Prevent gathering if full
    state.wood = Math.min(state.wood + 1, caps.wood);
    text = "+1 木頭";
    color = "#818cf8"; // indigo
  } else if (resource === "stone") {
    if (Math.floor(state.stone) >= caps.stone) return; // Prevent gathering if full
    state.stone = Math.min(state.stone + 1, caps.stone);
    text = "+1 石頭";
    color = "#94a3b8"; // slate
  } else {
    return; // Non-clickable resource
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
  const caps = getCapacities();

  // 1. Passive food yield (Farms: +1/s, Farmers: +0.5/s)
  const passiveGen = (state.buildings.farms * 1) + (state.jobs.farmer * 0.5);
  state.food += passiveGen;
  
  // 2. Worker Consumption (eats 0.5 food/s each)
  const passiveCon = state.workers * 0.5;
  state.food -= passiveCon;
  
  // 3. Specialized Worker Yields (Lumberjacks: +0.6/s, Miners: +0.3/s)
  state.wood += state.jobs.woodcutter * 0.6;
  state.stone += state.jobs.miner * 0.3;

  // 4. Automated Industrial Yields (Smelters: +0.3/s Metal, Power Plants: +1.0/s Energy)
  state.metal += state.buildings.smelter * 0.3;
  state.energy += state.buildings.powerPlant * 1.0;

  // 5. Economy: Banks generate passive income; Merchants trade wood+stone for money
  state.money += state.buildings.bank * 1.0;
  const merchantIncome = state.jobs.merchant * 2.0;
  const merchantWoodCost = state.jobs.merchant * 0.2;
  const merchantStoneCost = state.jobs.merchant * 0.2;
  if (state.wood >= merchantWoodCost && state.stone >= merchantStoneCost) {
    state.wood -= merchantWoodCost;
    state.stone -= merchantStoneCost;
    state.money += merchantIncome;
  }
  state.money = Math.min(state.money, 1000);

  // 6. Knowledge: Scholars generate research (with food+money cost)
  if (state.jobs.scholar > 0) {
    const scholarFoodCost = state.jobs.scholar * 0.5;
    const scholarMoneyCost = state.jobs.scholar * 1.0;
    if (state.food >= scholarFoodCost && state.money >= scholarMoneyCost) {
      state.food -= scholarFoodCost;
      state.money -= scholarMoneyCost;
      state.knowledge += state.jobs.scholar * 1.0;
    }
  }

  // Apply resource caps (Food, Wood, Stone, Metal, Energy)
  state.wood = Math.min(state.wood, caps.wood);
  state.stone = Math.min(state.stone, caps.stone);
  state.food = Math.min(state.food, caps.food);
  state.metal = Math.min(state.metal, caps.metal);
  state.energy = Math.min(state.energy, caps.energy);
  
  // 5. Handle Survival / Hunger Deaths
  if (state.food < 0) {
    state.food = 0;
    // Starving condition: 25% chance per sec to lose worker
    if (state.workers > 0 && Math.random() < 0.25) {
      state.workers -= 1;
      spawnFloatingText("👷 飢荒工人逃亡!", "#ef4444");

      // Sync job state: Deduct 1 worker from jobs if we have no idle pool remaining
      const totalAssigned = state.jobs.woodcutter + state.jobs.miner + state.jobs.farmer + state.jobs.merchant + state.jobs.scholar;
      if (totalAssigned > state.workers) {
        // Priority to remove from: Woodcutters first, Miners second, Merchants, Scholars, Farmers last
        if (state.jobs.woodcutter > 0) {
          state.jobs.woodcutter -= 1;
        } else if (state.jobs.miner > 0) {
          state.jobs.miner -= 1;
        } else if (state.jobs.merchant > 0) {
          state.jobs.merchant -= 1;
        } else if (state.jobs.scholar > 0) {
          state.jobs.scholar -= 1;
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

// Auto-load save on startup (silently, no toast)
(function initLoad() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { updateUI(); return; }
    const saveData = JSON.parse(raw);
    const saved = saveData.state;
    Object.keys(state).forEach(key => {
      if (saved[key] !== undefined) {
        if (typeof state[key] === 'object' && state[key] !== null) {
          Object.assign(state[key], saved[key]);
        } else {
          state[key] = saved[key];
        }
      }
    });
    setGatherFocus(state.gatherFocus || 'wood');
    updateUI();
    const date = new Date(saveData.timestamp);
    showToast(`✅ 自動讀取存檔（${date.toLocaleTimeString('zh-TW')}）`, "info");
  } catch(e) {
    updateUI();
  }
})();

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

btnBuildSmelter.addEventListener("click", () => {
  if (state.wood >= COSTS.smelter.wood && state.stone >= COSTS.smelter.stone) {
    state.wood -= COSTS.smelter.wood;
    state.stone -= COSTS.smelter.stone;
    state.buildings.smelter += 1;
    spawnFloatingText("+1 熔爐 🪙", "#38bdf8");
    updateUI();
  }
});

btnBuildPower.addEventListener("click", () => {
  if (state.stone >= COSTS.powerPlant.stone && state.metal >= COSTS.powerPlant.metal) {
    state.stone -= COSTS.powerPlant.stone;
    state.metal -= COSTS.powerPlant.metal;
    state.buildings.powerPlant += 1;
    spawnFloatingText("+1 電廠 ⚡", "#facc15");
    updateUI();
  }
});

btnBuildWarehouse.addEventListener("click", () => {
  if (state.wood >= COSTS.warehouse.wood && state.stone >= COSTS.warehouse.stone) {
    state.wood -= COSTS.warehouse.wood;
    state.stone -= COSTS.warehouse.stone;
    state.buildings.warehouse += 1;
    spawnFloatingText("+1 倉庫 📦", "#10b981");
    updateUI();
  }
});

btnBuildBattery.addEventListener("click", () => {
  if (state.stone >= COSTS.battery.stone && state.metal >= COSTS.battery.metal) {
    state.stone -= COSTS.battery.stone;
    state.metal -= COSTS.battery.metal;
    state.buildings.battery += 1;
    spawnFloatingText("+1 蓄電池 🔋", "#f59e0b");
    updateUI();
  }
});

btnBuildBank.addEventListener("click", () => {
  if (state.wood >= COSTS.bank.wood && state.metal >= COSTS.bank.metal) {
    state.wood -= COSTS.bank.wood;
    state.metal -= COSTS.bank.metal;
    state.buildings.bank += 1;
    spawnFloatingText("+1 銀行 💰", "#facc15");
    updateUI();
  }
});

btnBuildSchool.addEventListener("click", () => {
  if (state.wood >= COSTS.school.wood && state.stone >= COSTS.school.stone && state.energy >= COSTS.school.energy) {
    state.wood -= COSTS.school.wood;
    state.stone -= COSTS.school.stone;
    state.energy -= COSTS.school.energy;
    state.buildings.school += 1;
    spawnFloatingText("+1 學院 📚", "#a78bfa");
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
