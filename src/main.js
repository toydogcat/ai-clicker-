import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import gameConfig from "./config.json";

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
  population: [], // Array of individual resident objects
  bossInvasions: {}, // { greed: timestamp, anger: timestamp, ignorance: timestamp }
  tech: {
    heroLicense: false
  },
  party: [],
  inventory: []
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

const btnBuildCabin = document.getElementById("btn-build-cabin");
const btnBuildFarm = document.getElementById("btn-build-farm");
const btnBuildSmelter = document.getElementById("btn-build-smelter");
const btnBuildPower = document.getElementById("btn-build-power");
const btnBuildWarehouse = document.getElementById("btn-build-warehouse");
const btnBuildBattery = document.getElementById("btn-build-battery");
const btnBuildBank = document.getElementById("btn-build-bank");
const btnBuildSchool = document.getElementById("btn-build-school");

// Dispatch Panel DOM
const btnHireResident = document.getElementById("btn-hire-resident");
const popCountDisplay = document.getElementById("popCountDisplay");
const popLimitDisplay = document.getElementById("popLimitDisplay");
const populationRoster = document.getElementById("populationRoster");

// --- RPG & Academy Tech DOM Caches ---
const rpgGuildCard = document.getElementById("rpgGuildCard");
const rpgLockOverlay = document.getElementById("rpgLockOverlay");
const rpgUnlockedContent = document.querySelector(".rpg-unlocked-content");
const btnTechHero = document.getElementById("btnTechHero");
const researchCard = document.getElementById("researchCard");
const knowledgeValEl = document.getElementById("knowledgeVal");
const techHeroStatusEl = document.getElementById("techHeroStatus");
const invCountEl = document.getElementById("invCount");
const inventoryContainer = document.getElementById("inventoryContainer");
const skillDock = document.getElementById("skillDock");
const battleLogEl = document.getElementById("battleLog");


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

function saveGame(silent = false) {
  try {
    const saveData = {
      version: 1,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state)) // deep clone
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    
    if (silent === true) return; // explicitly check for true boolean
    
    const exportFile = confirm("💾 已存檔至瀏覽器快取！\n\n是否要額外「匯出為 JSON 存檔檔案」備份到電腦？");
    if (exportFile) {
      const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai_clicker_save_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("📤 存檔檔案已下載！", "success");
    } else {
      showToast("💾 存檔成功！", "success");
    }
  } catch (e) {
    showToast("❌ 存檔失敗：" + e.message, "error");
  }
}

function loadGame(directRaw = null) {
  try {
    // If directly invoked by event handler, directRaw might be a PointerEvent object. Force null unless string.
    let raw = (typeof directRaw === 'string') ? directRaw : null;
    if (!raw) {
      const localOnly = confirm("【讀取存檔選項】\n\n「確定」：讀取瀏覽器快取存檔\n「取消」：匯入外部 .json 檔案");
      if (localOnly) {
        raw = localStorage.getItem(SAVE_KEY);
        if (!raw) {
          showToast("📂 找不到本機快取存檔！", "error");
          return false;
        }
      } else {
        // Trigger file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => {
            try {
              const parsed = JSON.parse(ev.target.result);
              if (parsed && parsed.state) {
                // Re-call loadGame with raw data directly
                loadGame(ev.target.result);
              } else {
                showToast("❌ 格式不符！這不是一個有效的存檔 JSON", "error");
              }
            } catch (err) {
              showToast("❌ 檔案損毀或解析失敗！", "error");
            }
          };
          reader.readAsText(file);
        };
        input.click();
        return;
      }
    }

    const saveData = JSON.parse(raw);
    const saved = saveData.state;

    // Deep merge — only restore known state keys
    Object.keys(state).forEach(key => {
      if (saved[key] !== undefined) {
        if (typeof state[key] === 'object' && state[key] !== null) {
          state[key] = JSON.parse(JSON.stringify(saved[key]));
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
  // Reset all state fields back to defaults matching the schema
  state.wood = 0; state.stone = 0; state.food = 30;
  state.metal = 0; state.energy = 0; state.money = 0; state.knowledge = 0;
  state.workerLimit = 5; state.gatherFocus = 'wood';
  Object.keys(state.buildings).forEach(k => state.buildings[k] = 0);
  state.population = [];
  state.bossInvasions = {};
  state.tech = { heroLicense: false };
  state.party = [];
  state.inventory = [];
  
  setGatherFocus('wood');
  updateUI();
  showToast("🗑️ 已重置！重新開始！", "error");
}

// Bind save/load/reset buttons
document.getElementById("btn-save").addEventListener("click", () => saveGame());
document.getElementById("btn-load").addEventListener("click", () => loadGame());
document.getElementById("btn-reset").addEventListener("click", () => resetGame());

// Auto-save every 30 seconds
setInterval(() => {
  saveGame(true);
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
  
  // Calculate dynamic net rates based on active population assignments
  let totalFoodCost = 0;
  let populationFoodGen = 0;
  let populationMoneyGen = 0;
  let populationKnowledgeGen = 0;

  state.population.forEach(p => {
    // Food consumption (Novices and Heroes eat similarly, Heroes also eat since they level up)
    const baseCost = gameConfig.economy.popFoodCost * p.level;
    totalFoodCost += p.assignment !== 'idle' ? baseCost : (baseCost * 0.2);

    // Job production efficiency
    const efficiency = 1.0 * p.level * p.slaveStat;
    if (p.assignment === 'farmer') {
      populationFoodGen += 0.5 * efficiency;
    } else if (p.assignment === 'merchant') {
      if (state.wood >= 0.2 * efficiency && state.stone >= 0.2 * efficiency) {
        populationMoneyGen += 2.0 * efficiency;
      }
    } else if (p.assignment === 'scholar') {
      const eCfg = gameConfig.economy;
      if (state.food >= eCfg.scholarFoodCost * efficiency && state.money >= eCfg.scholarMoneyCost * efficiency && state.energy >= eCfg.scholarEnergyCost * efficiency) {
        populationKnowledgeGen += 1.0 * efficiency;
      }
    }
  });

  // Calculate net food per second
  const passiveGen = (state.buildings.farms * 1.0) + populationFoodGen;
  const netFoodRate = passiveGen - totalFoodCost;
  const sign = netFoodRate >= 0 ? "+" : "";
  foodRateEl.textContent = `${sign}${netFoodRate.toFixed(1)}/秒`;
  foodRateEl.className = netFoodRate < 0 ? "res-rate alert-text" : "res-rate";

  // Update automated Metal rates
  const netMetalRate = state.buildings.smelter * 0.3;
  metalRateEl.textContent = `+${netMetalRate.toFixed(1)}/秒`;

  // Update automated Energy rates
  const netEnergyRate = state.buildings.powerPlant * 1.0;
  energyRateEl.textContent = `+${netEnergyRate.toFixed(1)}/秒`;
  
  // Money display with dynamic scaling from banks (Config driven)
  const moneyCap = gameConfig.economy.baseMoneyCap + (state.buildings.bank * gameConfig.economy.bankMoneyBonus);
  moneyEl.textContent = Math.floor(state.money);
  moneyMaxEl.textContent = moneyCap >= 1000 ? (moneyCap >= 10000 ? (moneyCap/1000) + 'k' : moneyCap) : moneyCap;
  resMoneyItem.classList.toggle("res-full", Math.floor(state.money) >= moneyCap);

  // Knowledge display (no cap, just count)
  knowledgeEl.textContent = Math.floor(state.knowledge);

  // Money rate: bank passive + merchants active
  const netMoneyRate = (state.buildings.bank * 1.0) + populationMoneyGen;
  moneyRateEl.textContent = `+${netMoneyRate.toFixed(1)}/秒`;

  // Knowledge rate: scholars only
  const netKnowledgeRate = populationKnowledgeGen;
  knowledgeRateEl.textContent = `+${netKnowledgeRate.toFixed(1)}/秒`;

  const currentPop = state.population.length;
  workerEl.textContent = currentPop;
  state.workerLimit = 5 + (state.buildings.cabins * 5);
  limitEl.textContent = state.workerLimit;
  if (popCountDisplay) popCountDisplay.textContent = currentPop;
  if (popLimitDisplay) popLimitDisplay.textContent = state.workerLimit;
  
  const percent = (currentPop / state.workerLimit) * 100;
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

  // Enable/Disable buttons dynamically based on current funds
  const workerMoneyCost = state.buildings.bank > 0 ? gameConfig.economy.recruitBaseCost : 0;
  if (btnHireResident) {
    btnHireResident.disabled = (state.food < gameConfig.costs.worker.food || state.money < workerMoneyCost || currentPop >= state.workerLimit);
    if (state.buildings.bank > 0) {
      btnHireResident.querySelector('.build-btn-cost').textContent = `🍞 ${gameConfig.costs.worker.food} 食 | 💰 ${gameConfig.economy.recruitBaseCost} 金`;
    }
  }

  btnBuildCabin.disabled = (state.wood < gameConfig.costs.cabin.wood);
  btnBuildFarm.disabled = (state.wood < gameConfig.costs.farm.wood || state.stone < gameConfig.costs.farm.stone);
  btnBuildSmelter.disabled = (state.wood < gameConfig.costs.smelter.wood || state.stone < gameConfig.costs.smelter.stone);
  btnBuildPower.disabled = (state.stone < gameConfig.costs.powerPlant.stone || state.metal < gameConfig.costs.powerPlant.metal);
  btnBuildWarehouse.disabled = (state.wood < gameConfig.costs.warehouse.wood || state.stone < gameConfig.costs.warehouse.stone);
  btnBuildBattery.disabled = (state.stone < gameConfig.costs.battery.stone || state.metal < gameConfig.costs.battery.metal);
  btnBuildBank.disabled = (state.stone < gameConfig.costs.bank.stone || state.metal < gameConfig.costs.bank.metal);
  btnBuildSchool.disabled = (state.wood < gameConfig.costs.school.wood || state.stone < gameConfig.costs.school.stone || state.energy < gameConfig.costs.school.energy);

  // --- RPG & Tech UI Sync ---
  if (state.buildings.school > 0) {
    if (researchCard) researchCard.style.display = "block";
    if (knowledgeValEl) knowledgeValEl.textContent = Math.floor(state.knowledge);
    
    const tCfg = gameConfig.combat.tech.heroLicense;
    if (state.tech.heroLicense) {
      if (btnTechHero) btnTechHero.disabled = true;
      if (techHeroStatusEl) techHeroStatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechHero) btnTechHero.disabled = (state.knowledge < tCfg.reqKnowledge || state.money < tCfg.reqMoney);
      if (techHeroStatusEl) techHeroStatusEl.textContent = "未研發";
    }
  } else {
    if (researchCard) researchCard.style.display = "none";
  }

  if (state.tech.heroLicense) {
    rpgGuildCard?.classList.remove("locked");
    if (rpgLockOverlay) rpgLockOverlay.style.display = "none";
    if (rpgUnlockedContent) rpgUnlockedContent.style.display = "block";
    updateHeroSheets();
  } else {
    rpgGuildCard?.classList.add("locked");
    if (rpgLockOverlay) rpgLockOverlay.style.display = "flex";
    if (rpgUnlockedContent) rpgUnlockedContent.style.display = "none";
  }

  renderPopulationRoster();
}

// Removed adjustJob


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

  // 1. Passive food yield (Farms: +1/s)
  const passiveGen = (state.buildings.farms * 1);
  state.food += passiveGen;
  
  // 2. Automated Industrial Yields (Smelters: +0.3/s Metal, Power Plants: +1.0/s Energy)
  state.metal += state.buildings.smelter * 0.3;
  state.energy += state.buildings.powerPlant * 1.0;

  // 3. Banks generate passive income
  state.money += state.buildings.bank * 1.0;
  
  // 4. Population Logic
  let netWood = 0, netStone = 0, netFood = 0, netMoney = 0, netKnowledge = 0;
  
  state.population.forEach(p => {
    let foodCost = gameConfig.economy.popFoodCost * p.level;
    let efficiency = 1.0 * p.level * p.slaveStat;

    if (p.assignment !== 'idle') {
      state.food -= foodCost;
    } else {
      state.food -= (foodCost * 0.2); // Idle eats 20%
    }
    
    if (p.assignment === 'woodcutter') netWood += 0.6 * efficiency;
    if (p.assignment === 'miner') netStone += 0.3 * efficiency;
    if (p.assignment === 'farmer') netFood += 0.5 * efficiency;
    if (p.assignment === 'merchant') {
      if (state.wood >= 0.2 * efficiency && state.stone >= 0.2 * efficiency) {
        state.wood -= 0.2 * efficiency;
        state.stone -= 0.2 * efficiency;
        netMoney += 2.0 * efficiency;
      }
    }
    if (p.assignment === 'scholar') {
      let eCfg = gameConfig.economy;
      if (state.food >= eCfg.scholarFoodCost * efficiency && state.money >= eCfg.scholarMoneyCost * efficiency && state.energy >= eCfg.scholarEnergyCost * efficiency) {
        state.food -= eCfg.scholarFoodCost * efficiency;
        state.money -= eCfg.scholarMoneyCost * efficiency;
        state.energy -= eCfg.scholarEnergyCost * efficiency;
        netKnowledge += 1.0 * efficiency;
      }
    }
  });

  state.wood += netWood;
  state.stone += netStone;
  state.food += netFood;
  state.money += netMoney;
  state.knowledge += netKnowledge;

  // Economy caps
  const moneyCap = gameConfig.economy.baseMoneyCap + (state.buildings.bank * gameConfig.economy.bankMoneyBonus);
  state.money = Math.min(state.money, moneyCap);

  // Apply resource caps (Food, Wood, Stone, Metal, Energy)
  state.wood = Math.min(state.wood, caps.wood);
  state.stone = Math.min(state.stone, caps.stone);
  state.food = Math.min(state.food, caps.food);
  state.metal = Math.min(state.metal, caps.metal);
  state.energy = Math.min(state.energy, caps.energy);
  
  // 5. Handle Survival / Hunger Deaths
  if (state.food <= 0) {
    state.food = 0;
    if (state.population.length > 0 && Math.random() < 0.25) {
      let index = Math.floor(Math.random() * state.population.length);
      state.population.splice(index, 1);
      spawnFloatingText("👷 飢荒居民死亡!", "#ef4444");
    }
  }

  // 6. Boss Invasions
  const totalBuildings = Object.values(state.buildings).reduce((a, b) => a + b, 0);
  if (totalBuildings >= 50 && !state.bossInvasions.greed && !state.bossInvasions.greedDefeated) {
    state.bossInvasions.greed = Date.now();
    showToast("⚠️ 【貪】之巨獸出現了！請在一週內討伐！", "error");
  }
  if (totalBuildings >= 100 && !state.bossInvasions.anger && !state.bossInvasions.angerDefeated) {
    state.bossInvasions.anger = Date.now();
    showToast("⚠️ 【嗔】之巨獸出現了！請在一週內討伐！", "error");
  }
  if (totalBuildings >= 200 && !state.bossInvasions.ignorance && !state.bossInvasions.ignoranceDefeated) {
    state.bossInvasions.ignorance = Date.now();
    showToast("⚠️ 【癡】之巨獸出現了！請在一週內討伐！", "error");
  }

  for (let bossKey in state.bossInvasions) {
    let ts = state.bossInvasions[bossKey];
    if (typeof ts === 'number' && ts > 0 && (Date.now() - ts) > 7 * 24 * 3600 * 1000) {
      // 1/3600 chance per tick (~once per hour of playtime)
      if (Math.random() < (1 / 3600)) {
        const bKeys = Object.keys(state.buildings).filter(k => state.buildings[k] > 0);
        if (bKeys.length > 0) {
          let target = bKeys[Math.floor(Math.random() * bKeys.length)];
          state.buildings[target]--;
          showToast(`🚨 巨獸摧毀了一棟 ${target}！`, "error");
        }
      }
    }
  }
  
  updateUI();
}

// ==========================================
// 6. RPG Core Mechanics & UI Managers
// ==========================================

// Tab switching inside RPG Guild
document.querySelectorAll(".rpg-sub-tab").forEach(tabBtn => {
  tabBtn.addEventListener("click", () => {
    document.querySelectorAll(".rpg-sub-tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".rpg-panel").forEach(p => p.classList.remove("active"));
    tabBtn.classList.add("active");
    const panelId = `rpg-${tabBtn.dataset.rpgTab}`;
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add("active");
    
    if (tabBtn.dataset.rpgTab === "inventory-panel") {
      renderInventory();
    }
  });
});

// Calculate needed EXP for next level based on planned gaps
window.getReqExp = function(lvl) {
  const expGaps = [0, 100, 205, 300, 419, 563, 728, 916, 1122, 1347];
  return expGaps[lvl] || 999999;
};

// Expose state for developer debugging and automated testing
window.gameState = state;
window.gameConfig = gameConfig;
window.updateUI = updateUI;

const NAME_PREFIXES = ["老", "大", "阿", "小", "鐵", "狂", "神", "暗"];
const NAME_SUFFIXES = ["王", "明", "華", "狗", "柱", "強", "花", "風"];

function hireResident() {
  if (state.population.length >= state.workerLimit) return;
  const workerMoneyCost = state.buildings.bank > 0 ? gameConfig.economy.recruitBaseCost : 0;
  if (state.food < gameConfig.costs.worker.food || state.money < workerMoneyCost) return;

  state.food -= gameConfig.costs.worker.food;
  state.money -= workerMoneyCost;

  const slaveRange = gameConfig.economy.slaveRange || [0.8, 2.5];
  const slaveStat = (Math.random() * (slaveRange[1] - slaveRange[0]) + slaveRange[0]).toFixed(2);
  const faith = Math.random() > 0.5;
  const name = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)] + NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];

  const resident = {
    id: "res_" + Date.now() + "_" + Math.floor(Math.random()*1000),
    name: name,
    level: 1,
    exp: 0,
    jobClass: "novice",
    faith: faith,
    slaveStat: parseFloat(slaveStat),
    baseStats: {
      hp: Math.floor(Math.random() * 20) + 10,
      mp: Math.floor(Math.random() * 10) + 5,
      atk: Math.floor(Math.random() * 5) + 1,
      def: Math.floor(Math.random() * 5) + 1,
      matk: Math.floor(Math.random() * 5),
      mdef: Math.floor(Math.random() * 5),
      spd: +(Math.random() * 0.3).toFixed(2)
    },
    assignment: "idle",
    eq: { rhand: null, lhand: null, helm: null, body: null, pants: null, shoes: null }
  };

  state.population.push(resident);
  showToast(`🍻 歡迎 ${name} 加入城鎮！`, "success");
  updateUI();
}

if (btnHireResident) {
  btnHireResident.addEventListener("click", hireResident);
}

function renderPopulationRoster() {
  if (!populationRoster) return;
  populationRoster.innerHTML = "";
  
  if (state.population.length === 0) {
    populationRoster.innerHTML = `<div class="empty-inv" style="text-align: center; color: #94a3b8; font-size: 0.9rem; padding: 1rem;">城鎮空無一人，請招募流浪者！</div>`;
    return;
  }
  
  state.population.forEach((p, index) => {
    const canPromote = p.level >= 5 && p.jobClass === "novice";
    const needsExam = p.level === 9 && p.exp >= window.getReqExp(9);
    
    // Determine available classes for promotion based on faith and base stats
    const allHeroKeys = Object.keys(gameConfig.heroes).filter(k => k !== "novice");
    const faithClasses = ["priest", "paladin", "taoist", "monk"];
    
    // Filter logic based on faith and some basic stat thresholds to simulate potential
    const availableClasses = allHeroKeys.filter(k => {
      if (p.faith && !faithClasses.includes(k)) return false;
      if (!p.faith && faithClasses.includes(k)) return false;
      
      // Simple stat requirements
      if (k === "warrior" && p.baseStats.atk < 3) return false;
      if (k === "mage" && p.baseStats.matk < 2) return false;
      if (k === "shieldWarrior" && p.baseStats.def < 3) return false;
      if (k === "rogue" && p.baseStats.spd < 0.1) return false;
      return true;
    });

    let promoteHTML = "";
    if (canPromote) {
      const optionsHTML = availableClasses.map(k => `<option value="${k}">${gameConfig.heroes[k].name}</option>`).join("");
      promoteHTML = `
        <select id="promote_${p.id}" class="job-select" style="margin-left:0.5rem;">
          <option value="">選擇職業...</option>
          ${optionsHTML}
        </select>
        <button class="ctrl-btn" onclick="promoteResident('${p.id}')">轉職</button>
      `;
    } else if (p.jobClass !== "novice") {
      promoteHTML = `<span style="margin-left:0.5rem; color:#fde047; font-weight:bold;">[${gameConfig.heroes[p.jobClass].name}]</span>`;
    }

    if (needsExam) {
      promoteHTML += `<button class="ctrl-btn" style="margin-left:0.5rem; background:#ef4444;" onclick="openExamModal('${p.id}')">📖 參加微積分升級考</button>`;
    }

    const row = document.createElement("div");
    row.className = "job-row";
    row.style = "padding: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;";
    
    let assignOptions = `<option value="idle" ${p.assignment === 'idle' ? 'selected' : ''}>閒置</option>`;
    if (p.jobClass === "novice") {
      assignOptions += `
        <option value="woodcutter" ${p.assignment === 'woodcutter' ? 'selected' : ''}>伐木</option>
        <option value="miner" ${p.assignment === 'miner' ? 'selected' : ''}>採礦</option>
        <option value="farmer" ${p.assignment === 'farmer' ? 'selected' : ''}>農耕</option>
        <option value="merchant" ${p.assignment === 'merchant' ? 'selected' : ''}>經商</option>
        ${state.buildings.school > 0 ? `<option value="scholar" ${p.assignment === 'scholar' ? 'selected' : ''}>學者</option>` : ''}
      `;
    }
    assignOptions += `<option value="combat" ${p.assignment === 'combat' ? 'selected' : ''}>出征 (編入隊伍)</option>`;

    row.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="job-title" style="font-size: 1.1rem; color: #e2e8f0;">${p.name} (Lv.${p.level})</span>
          ${promoteHTML}
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 0.3rem 0.5rem; border-radius: 4px;">
        <span style="font-size: 0.8rem; color: #94a3b8;">當前指派：</span>
        <select onchange="changeResidentAssignment('${p.id}', this.value)" class="job-select" style="padding: 0.2rem; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px;">
          ${assignOptions}
        </select>
      </div>
    `;
    populationRoster.appendChild(row);
  });
}

window.changeResidentAssignment = function(id, newAssignment) {
  const p = state.population.find(r => r.id === id);
  if (p) {
    if (newAssignment === 'combat') {
      const combatants = state.population.filter(r => r.assignment === 'combat');
      if (combatants.length >= 4 && p.assignment !== 'combat') {
        showToast("出征隊伍已滿 (上限4人)！", "error");
        updateUI();
        return;
      }
    }
    // Prevent non-novice from doing labor
    if (p.jobClass !== "novice" && !['idle', 'combat'].includes(newAssignment)) {
      showToast("職業英雄拒絕從事基層勞動！", "error");
      updateUI();
      return;
    }
    p.assignment = newAssignment;
    updateUI();
  }
};

window.promoteResident = function(id) {
  const select = document.getElementById(`promote_${id}`);
  if (!select || !select.value) {
    showToast("請先選擇職業！", "error");
    return;
  }
  const p = state.population.find(r => r.id === id);
  if (p) {
    p.jobClass = select.value;
    showToast(`🎉 ${p.name} 成功轉職為 ${gameConfig.heroes[p.jobClass].name}！`, "success");
    updateUI();
  }
};

let currentExamResidentId = null;

window.openExamModal = function(id) {
  currentExamResidentId = id;
  const modal = document.getElementById('examModal');
  if (modal) modal.style.display = 'flex';
};

window.submitExam = function(answer) {
  const modal = document.getElementById('examModal');
  if (answer === 1) {
    const p = state.population.find(r => r.id === currentExamResidentId);
    if (p && p.level === 9) {
      p.level = 10;
      p.exp = 0;
      showToast(`🎓 恭喜！${p.name} 答對了微積分，突破界限升至 Lv.10！解鎖終極大招！`, "success");
      updateUI();
    }
  } else {
    showToast("❌ 答錯了！請回去重新準備微積分考試。", "error");
  }
  if (modal) modal.style.display = 'none';
  currentExamResidentId = null;
};

// Calculate effective stats (base + equipment + hidden stats)
window.calcEffStats = function(person) {
  if (!person) return null;
  const baseConfig = gameConfig.heroes[person.jobClass];
  if (!baseConfig) return null;
  
  // Start with copy of base stats + personal baseStats
  const eff = {
    hp: baseConfig.hp + (person.baseStats ? person.baseStats.hp : 0),
    maxHp: baseConfig.maxHp + (person.baseStats ? person.baseStats.hp : 0),
    mp: baseConfig.mp + (person.baseStats ? person.baseStats.mp : 0),
    maxMp: baseConfig.maxMp + (person.baseStats ? person.baseStats.mp : 0),
    atk: baseConfig.atk + (person.baseStats ? person.baseStats.atk : 0),
    def: baseConfig.def + (person.baseStats ? person.baseStats.def : 0),
    matk: baseConfig.matk + (person.baseStats ? person.baseStats.matk : 0),
    mdef: baseConfig.mdef + (person.baseStats ? person.baseStats.mdef : 0),
    spd: baseConfig.spd + (person.baseStats ? person.baseStats.spd : 0),
    lifesteal: baseConfig.lifesteal, mlifesteal: baseConfig.mlifesteal,
    hit: baseConfig.hit || 0.9, evasion: baseConfig.evasion || 0.05, 
    critRate: baseConfig.critRate || 0.05, critDmg: baseConfig.critDmg || 1.5, 
    lucky: baseConfig.lucky || 5
  };
  
  // Stat scaling based on level
  const g = baseConfig.growth;
  const levelsGained = person.level - 1;
  if (g) {
    eff.maxHp = Math.floor(eff.maxHp + levelsGained * (g.hp || 0));
    eff.maxMp = Math.floor(eff.maxMp + levelsGained * (g.mp || 0));
    eff.atk = Math.floor(eff.atk + levelsGained * (g.atk || 0));
    eff.def = Math.floor(eff.def + levelsGained * (g.def || 0));
    eff.matk = Math.floor(eff.matk + levelsGained * (g.matk || 0));
    eff.mdef = Math.floor(eff.mdef + levelsGained * (g.mdef || 0));
    eff.spd = +(eff.spd + levelsGained * (g.spd || 0)).toFixed(2);
    eff.hit = +(eff.hit + levelsGained * (g.hit || 0)).toFixed(2);
    eff.evasion = +(eff.evasion + levelsGained * (g.evasion || 0)).toFixed(2);
    eff.critRate = +(eff.critRate + levelsGained * (g.critRate || 0)).toFixed(2);
    eff.lucky = eff.lucky + levelsGained * (g.lucky || 0);
  } else {
    const lvlMult = 1 + levelsGained * 0.2;
    eff.maxHp = Math.floor(eff.maxHp * lvlMult);
    eff.maxMp = Math.floor(eff.maxMp * lvlMult);
    eff.atk = Math.floor(eff.atk * lvlMult);
    eff.def = Math.floor(eff.def * lvlMult);
    eff.matk = Math.floor(eff.matk * lvlMult);
    eff.mdef = Math.floor(eff.mdef * lvlMult);
    eff.spd = +(eff.spd * (1 + levelsGained * 0.05)).toFixed(2);
    eff.hit = +(eff.hit * (1 + levelsGained * 0.05)).toFixed(2);
    eff.evasion = +(eff.evasion * (1 + levelsGained * 0.05)).toFixed(2);
    eff.lucky = eff.lucky + levelsGained * 2;
  }

  // Add equipment
  if (person.eq) {
    Object.values(person.eq).forEach(item => {
      if (!item) return;
    // main stat
    if (item.mainStat && item.mainStatVal) {
      if (eff[item.mainStat] !== undefined) eff[item.mainStat] += item.mainStatVal;
    }
    // extra stats
    if (item.extras) {
      Object.entries(item.extras).forEach(([stat, val]) => {
        if (eff[stat] !== undefined) {
          // Normal stats are whole numbers, percentages are stored as 1-100 integers but we need them as 0.01
          if (["hit", "evasion", "critRate"].includes(stat)) {
            eff[stat] += val / 100;
          } else if (stat === "critDmg") {
            eff[stat] += val / 100; // e.g. +50 critDmg -> +0.5x
          } else {
            eff[stat] += val;
          }
        }
      });
    }
    });
  }
  
  // Normalize
  eff.spd = Math.max(0.2, eff.spd);
  eff.hit = Math.min(1.0, eff.hit); // Max 100%
  eff.evasion = Math.min(0.9, eff.evasion); // Max 90%
  eff.critRate = Math.min(1.0, eff.critRate); // Max 100%
  return eff;
}

// Generate randomized equipment
function generateItem(level, rarityKey = "normal", slot = null) {
  const slots = Object.keys(gameConfig.eqSpecs.slots);
  const finalSlot = slot || slots[Math.floor(Math.random() * slots.length)];
  const slotSpec = gameConfig.eqSpecs.slots[finalSlot];
  
  const rKey = rarityKey;
  const rSpec = gameConfig.eqSpecs.rarities[rKey];
  
  // Base value scaling with level
  const levelScale = Math.pow(1.5, level - 1);
  
  // Main Stat
  const baseMain = Math.ceil(slotSpec.scale * 5 * levelScale * rSpec.mult);
  
  const item = {
    id: "item_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    name: `${rSpec.name}的 Lv.${level} ${slotSpec.name}`,
    slot: finalSlot,
    level: level,
    rarity: rKey,
    mainStat: slotSpec.mainStat,
    mainStatVal: baseMain,
    extras: {}
  };
  
  // Append extra random stats
  if (rSpec.extraStats > 0) {
    const potentialStats = gameConfig.eqSpecs.statList.filter(s => s !== slotSpec.mainStat);
    for (let i = 0; i < rSpec.extraStats; i++) {
      const randomStat = potentialStats[Math.floor(Math.random() * potentialStats.length)];
      let statVal = 0;
      if (randomStat === "hp") {
        statVal = Math.ceil(20 * levelScale * (Math.random() * 0.5 + 0.5));
      } else if (randomStat === "spd") {
        statVal = +(0.1 * levelScale * (Math.random() * 0.5 + 0.5)).toFixed(2);
      } else if (randomStat.includes("lifesteal")) {
        statVal = Math.ceil(2 * levelScale * (Math.random() * 0.5 + 0.5));
      } else {
        statVal = Math.ceil(3 * levelScale * (Math.random() * 0.5 + 0.5));
      }
      item.extras[randomStat] = (item.extras[randomStat] || 0) + statVal;
    }
  }
  
  return item;
}

// Buy White Item
document.querySelectorAll(".buy-eq-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const slot = btn.dataset.slot;
    const level = parseInt(document.getElementById("shopLevelSelect").value);
    const price = gameConfig.eqSpecs.price[level] || 999999;
    
    if (state.money < price) {
      showToast("💰 金幣不足！", "error");
      return;
    }
    if (state.inventory.length >= 24) {
      showToast("🎒 背包滿了 (上限24格)！", "error");
      return;
    }
    
    state.money -= price;
    const newItem = generateItem(level, "normal", slot);
    state.inventory.push(newItem);
    showToast(`🛒 購買了 [${newItem.name}]`, "success");
    renderInventory();
    updateUI();
  });
});

// Recruit Heroes
window.hireHero = function(heroKey) {
  const hero = state.heroes[heroKey];
  const cost = gameConfig.heroes[heroKey].hireCost;
  if (state.money < cost) {
    showToast("💰 聘僱費用不足！", "error");
    return;
  }
  if (state.party.length >= 4) {
    showToast("队伍已滿 (上限4人)！", "error");
    return;
  }
  state.money -= cost;
  hero.unlocked = true;
  state.party.push(heroKey);
  showToast(`🎉 已招募 ${gameConfig.heroes[heroKey].name}！`, "success");
  updateUI();
};

function getHeroIcon(k) {
  const icons = { warrior:'⚔️', barbarian:'🪓', shieldWarrior:'🛡️', rogue:'🗡️', archer:'🏹', gunner:'🔫', fighter:'🥊', mage:'🔮', wizard:'📜', priest:'✨', taoist:'☯️', monk:'📿' };
  return icons[k] || '👤';
}

function getSlotIcon(s) {
  const i = { rhand:'🗡️', lhand:'🛡️', helm:'🪖', body:'🥋', pants:'👖', shoes:'👞' };
  return i[s] || '❓';
}

// Render inventory grid
window.renderInventory = function() {
  if (!inventoryContainer) return;
  inventoryContainer.innerHTML = "";
  invCountEl.textContent = state.inventory.length;
  
  if (state.inventory.length === 0) {
    inventoryContainer.innerHTML = '<div class="empty-inv">背包是空的，快去打寶吧！</div>';
    return;
  }
  
  state.inventory.forEach((item, index) => {
    const el = document.createElement("div");
    el.className = `inv-item`;
    el.style.borderColor = gameConfig.eqSpecs.rarities[item.rarity].color;
    el.style.boxShadow = `inset 0 0 8px ${gameConfig.eqSpecs.rarities[item.rarity].color}40`;
    
    // Icon lookup
    let icon = getSlotIcon(item.slot);
    
    el.innerHTML = `${icon}<span class="item-lv-tag">L${item.level}</span>`;
    
    // Generate detail string
    let title = `${item.name}\n[${gameConfig.eqSpecs.slots[item.slot].name}]\n+ ${gameConfig.eqSpecs.statNames[item.mainStat]}: ${item.mainStatVal}`;
    Object.entries(item.extras).forEach(([k, v]) => {
      title += `\n+ ${gameConfig.eqSpecs.statNames[k]}: ${v}${k.includes('lifesteal') ? '%' : ''}`;
    });
    title += "\n\n👉 點擊裝備 / 雙擊販售";
    
    el.title = title;
    
    // Handle Equip selection
    el.addEventListener("click", () => {
      const unlockedHeroes = Object.keys(state.heroes).filter(k => state.heroes[k].unlocked);
      if (unlockedHeroes.length === 0) {
        showToast("尚未招募任何英雄！", "error");
        return;
      }
      let targetHero = null;
      if (unlockedHeroes.length === 1) {
        targetHero = unlockedHeroes[0];
      } else {
        const promptStr = unlockedHeroes.map((k, i) => `${i+1}: ${gameConfig.heroes[k].name}`).join(", ");
        const choice = prompt(`裝備給誰？\n${promptStr}`);
        const idx = parseInt(choice) - 1;
        if (!isNaN(idx) && unlockedHeroes[idx]) {
          targetHero = unlockedHeroes[idx];
        }
      }
      if (targetHero) {
        equipItem(index, targetHero);
      }
    });

    // Handle sell
    el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const sellVal = Math.ceil(gameConfig.eqSpecs.price[item.level] * 0.3);
      state.inventory.splice(index, 1);
      state.money += sellVal;
      showToast(`💰 賣出裝備獲得 ${sellVal}`, "info");
      renderInventory();
      updateUI();
    });
    
    inventoryContainer.appendChild(el);
  });
};

window.equipItem = function(invIndex, heroKey) {
  const item = state.inventory[invIndex];
  const hero = state.heroes[heroKey];
  const oldItem = hero.eq[item.slot];
  
  // Equip
  hero.eq[item.slot] = item;
  state.inventory.splice(invIndex, 1); // remove from inv
  
  // Return old to inv
  if (oldItem) {
    state.inventory.push(oldItem);
  }
  
  showToast(`🛡️ ${gameConfig.heroes[heroKey].name} 裝備了 [${item.name}]`, "success");
  renderInventory();
  updateUI();
};

// Render Hero sheets (updates stats & paperdoll display)
function updateHeroSheets() {
  const guildRoster = document.getElementById("guildRoster");
  if (!guildRoster) return;
  
  guildRoster.innerHTML = "";
  
  const combatParty = state.population.filter(p => p.assignment === 'combat');

  // Render dynamic party readout list in the Mission Panel
  const partyStatusList = document.getElementById("partyStatusList");
  if (partyStatusList) {
    if (combatParty.length === 0) {
      partyStatusList.innerHTML = `⏳ 尚未指派任何英雄，請在人力面板將居民指派為「出征」。`;
    } else {
      partyStatusList.innerHTML = combatParty.map(p => {
        return `<span style="background:rgba(255,255,255,0.1); padding: 0.25rem 0.5rem; border-radius:4px; border: 1px solid #475569; display: flex; align-items: center; gap: 0.25rem;">
          ${getHeroIcon(p.jobClass)} ${p.name}
        </span>`;
      }).join('');
    }
  }
  
  // Render Party Group
  const partyGroup = document.getElementById("partyGroup");
  if (partyGroup) partyGroup.innerHTML = "";

  state.population.forEach(p => {
    // 1. Render in Guild
    const card = document.createElement("div");
    card.className = "hero-profile-card";
    card.id = `prof-${p.id}`;
    
    const eff = calcEffStats(p);
    
    let html = `
      <div class="prof-top">
        <div class="prof-avatar">${getHeroIcon(p.jobClass)}</div>
        <div class="prof-meta">
          <h4>${p.name} (${gameConfig.heroes[p.jobClass].name})${p.assignment === 'combat' ? ' ⚔️' : ''}</h4>
          <div class="lv-exp">Lv.<span>${p.level}</span> | Exp <span>${p.exp}</span>/<span>${window.getReqExp(p.level)}</span></div>
        </div>
      </div>
    `;
    
    if (eff) {
      html += `
        <div class="prof-stats" style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.25rem;">
          <span>⚔️ 物攻: <span style="float:right">${eff.atk}</span></span>
          <span>🛡️ 物防: <span style="float:right">${eff.def}</span></span>
          <span>🪄 魔攻: <span style="float:right">${eff.matk}</span></span>
          <span>🔮 魔防: <span style="float:right">${eff.mdef}</span></span>
          <span>⚡ 速度: <span style="float:right">${eff.spd.toFixed(1)}</span></span>
          <span>🎯 命中: <span style="float:right">${(eff.hit * 100).toFixed(0)}%</span></span>
          <span>💨 閃避: <span style="float:right">${(eff.evasion * 100).toFixed(0)}%</span></span>
          <span>💥 暴擊: <span style="float:right">${(eff.critRate * 100).toFixed(0)}%</span></span>
          <span>🍀 幸運: <span style="float:right">${eff.lucky}</span></span>
        </div>
        <div class="paperdoll" style="display:grid;">
          ${['rhand','lhand','helm','body','pants','shoes'].map(slot => `<div class="eq-slot" data-hero="${p.id}" data-slot="${slot}" title="${gameConfig.eqSpecs.slots[slot].name}">${getSlotIcon(slot)}</div>`).join('')}
        </div>
      `;
    }
    card.innerHTML = html;
    guildRoster.appendChild(card);
    
    // Bind paperdoll clicks
    ['rhand','lhand','helm','body','pants','shoes'].forEach(slot => {
      const slotEl = card.querySelector(`.eq-slot[data-slot="${slot}"]`);
      if(!slotEl) return;
      const item = p.eq[slot];
      if (item) {
        slotEl.classList.add("equipped");
        slotEl.style.borderColor = gameConfig.eqSpecs.rarities[item.rarity].color;
        slotEl.title = `${item.name}\n+ ${gameConfig.eqSpecs.statNames[item.mainStat]}: ${item.mainStatVal}`;
      }
      slotEl.onclick = () => {
        if (item) {
           if (state.inventory.length >= 24) {
             showToast("🎒 背包已滿！", "error"); return;
           }
           p.eq[slot] = null;
           state.inventory.push(item);
           showToast(`脫下裝備`, "info");
           renderInventory();
           updateUI();
        }
      };
    });
    
    // 2. Render in Combat Party
    if (partyGroup && p.assignment === 'combat') {
      const effStats = calcEffStats(p);
      const unit = document.createElement("div");
      unit.className = "combat-unit";
      unit.id = `unit-${p.id}`;
      // Initialize combat temp stats if not present
      if (typeof p.hp === 'undefined') { p.hp = effStats.maxHp; }
      if (typeof p.mp === 'undefined') { p.mp = effStats.maxMp; }
      // Ensure HP isn't over max due to unequip
      p.hp = Math.min(p.hp, effStats.maxHp);
      p.mp = Math.min(p.mp, effStats.maxMp);

      unit.innerHTML = `
        <div class="unit-header">
          <span class="unit-name">${p.name} Lv.<span id="b-${p.id}-lv">${p.level}</span></span>
        </div>
        <div class="stat-bars">
          <div class="bar-wrapper"><div class="bar-fill bg-hp" id="b-${p.id}-hp-bar" style="width:${(p.hp/effStats.maxHp)*100}%"></div><span class="bar-text" id="b-${p.id}-hp-val">${Math.floor(p.hp)}/${effStats.maxHp}</span></div>
          <div class="bar-wrapper"><div class="bar-fill bg-mp" id="b-${p.id}-mp-bar" style="width:${(p.mp/effStats.maxMp)*100}%"></div><span class="bar-text" id="b-${p.id}-mp-val">${Math.floor(p.mp)}/${effStats.maxMp}</span></div>
          <div class="bar-wrapper atb-wrapper"><div class="bar-fill bg-atb" id="b-${p.id}-atb-bar" style="width:0%"></div></div>
        </div>
      `;
      partyGroup.appendChild(unit);
    }
  });
}

// ==========================================
// 7. ATB Combat Engine
// ==========================================
let combatInterval = null;
let combatState = {
  active: false,
  target: "cute_mobs", // cute_mobs or boss_id
  bossType: "greed",
  enemy: null, // currently fighting object
  party: [] // keys like "warrior", "mage"
};

function logBattle(msg, cssClass="") {
  if (!battleLogEl) return;
  const line = document.createElement("div");
  if (cssClass) line.className = cssClass;
  line.innerHTML = msg;
  battleLogEl.appendChild(line);
  battleLogEl.scrollTop = battleLogEl.scrollHeight;
}

// Start Hunting!
document.getElementById("btnQuestHunt")?.addEventListener("click", () => startQuest("hunt"));
document.getElementById("btnQuestBoss")?.addEventListener("click", () => {
  const bossSelectRow = document.getElementById("bossSelectRow");
  if (bossSelectRow.style.display === "none") {
    bossSelectRow.style.display = "block";
    showToast("👹 選擇魔王後，再次點擊確認出征！", "info");
  } else {
    startQuest("boss");
  }
});
document.getElementById("btnQuestRetreat")?.addEventListener("click", stopQuest);

function startQuest(type) {
  if (combatState.active) return;
  
  const combatParty = state.population.filter(p => p.assignment === 'combat');
  
  if (combatParty.length === 0) {
    showToast("❌ 請先在人力面板將居民指派為「出征」！", "error");
    return;
  }
  
  combatState.active = true;
  combatState.target = type;
  combatState.bossType = document.getElementById("targetBoss") ? document.getElementById("targetBoss").value : "greed";
  combatState.party = combatParty.map(p => p.id);
  
  // Reset dynamic fight parameters
  combatParty.forEach(p => {
    const eff = calcEffStats(p);
    p.hp = eff.maxHp;
    p.mp = eff.maxMp;
    p.atb = 0;
  });
  
  spawnEnemy();
  
  const btnQuestHunt = document.getElementById("btnQuestHunt");
  if (btnQuestHunt) btnQuestHunt.disabled = true;
  const btnQuestBoss = document.getElementById("btnQuestBoss");
  if (btnQuestBoss) btnQuestBoss.disabled = true;
  const btnQuestRetreat = document.getElementById("btnQuestRetreat");
  if (btnQuestRetreat) btnQuestRetreat.disabled = false;
  
  skillDock.style.display = "block";
  
  logBattle(`🚀 隊伍出征！迎擊敵人！`);
  
  if (combatInterval) clearInterval(combatInterval);
  combatInterval = setInterval(processCombatFrame, 100);
}

function stopQuest() {
  combatState.active = false;
  if (combatInterval) clearInterval(combatInterval);
  combatInterval = null;
  
  const btnQuestHunt = document.getElementById("btnQuestHunt");
  if (btnQuestHunt) btnQuestHunt.disabled = false;
  const btnQuestBoss = document.getElementById("btnQuestBoss");
  if (btnQuestBoss) btnQuestBoss.disabled = false;
  const btnQuestRetreat = document.getElementById("btnQuestRetreat");
  if (btnQuestRetreat) btnQuestRetreat.disabled = true;
  
  skillDock.style.display = "none";
  
  const enemyGroup = document.getElementById("enemyGroup");
  if (enemyGroup) enemyGroup.innerHTML = '<div class="combat-unit"><div class="unit-header"><span class="unit-name">已撤退</span></div><div class="enemy-avatar">❔</div></div>';
  
  logBattle("🏳️ 戰略性撤離，部隊返回營地安整。");
  updateUI();
}

function spawnEnemy() {
  let avgLvl = 1;
  let total = 0;
  const combatParty = state.population.filter(p => combatState.party.includes(p.id));
  combatParty.forEach(p => total += p.level);
  if(combatParty.length > 0) avgLvl = Math.ceil(total / combatParty.length);
  
  combatState.enemies = [];
  const enemyGroup = document.getElementById("enemyGroup");
  if (enemyGroup) enemyGroup.innerHTML = "";

  if (combatState.target === "hunt") {
    // Spawn 3 to 6 monsters
    const mobCount = Math.floor(Math.random() * 4) + 3; // 3~6
    const mobCfg = gameConfig.combat.mobs;
    
    for (let i = 0; i < mobCount; i++) {
      const idx = Math.floor(Math.random() * mobCfg.list.length);
      const mobData = mobCfg.list[idx];
      
      const scale = Math.pow(mobCfg.scaling.levelMult, avgLvl - 1);
      // Removed duoScale since party size is dynamic, adjust by a flat logic or keep as is.
      const eId = `enemy-${i}`;
      combatState.enemies.push({
        id: eId,
        name: `Lv.${avgLvl} ${mobData.name}`,
        avatar: mobData.avatar,
        hp: Math.floor(mobCfg.base.hp * scale),
        maxHp: Math.floor(mobCfg.base.hp * scale),
        atk: Math.floor(mobCfg.base.atk * scale),
        def: Math.floor(mobCfg.base.def * scale),
        matk: Math.floor(mobCfg.base.matk * scale),
        mdef: Math.floor(mobCfg.base.mdef * scale),
        spd: mobCfg.base.spd + (avgLvl * mobCfg.scaling.spdPerLvl),
        atb: 0,
        rewardExp: Math.floor(mobCfg.scaling.rewardExpBase * avgLvl / mobCount),
        rewardMoney: Math.floor(mobCfg.scaling.rewardMoneyBase * avgLvl / mobCount),
        isBoss: false
      });
    }
  } else {
    // Spawn 1 Boss + 2 Minions? Or just 1 Boss for now
    const bType = combatState.bossType;
    const bossCfg = gameConfig.combat.bosses[bType];
    if (bossCfg) {
      combatState.enemies.push({
        ...JSON.parse(JSON.stringify(bossCfg)),
        id: 'enemy-boss',
        atb: 0,
        isBoss: true
      });
    }
  }
  
  // Render Enemies
  combatState.enemies.forEach(e => {
    if (!enemyGroup) return;
    const unit = document.createElement("div");
    unit.className = "combat-unit";
    unit.id = e.id;
    unit.innerHTML = `
      <div class="unit-header"><span class="unit-name">${e.name}</span></div>
      <div class="stat-bars" id="${e.id}-bars">
        <div class="bar-wrapper"><div class="bar-fill bg-hp" id="${e.id}-hpBar" style="width:100%"></div><span class="bar-text" id="${e.id}-hpVal">${e.hp}/${e.maxHp}</span></div>
        <div class="bar-wrapper atb-wrapper"><div class="bar-fill bg-atb" id="${e.id}-atbBar" style="width:0%"></div></div>
      </div>
      <div class="enemy-avatar" style="font-size:2rem; margin:0.2rem 0;">${e.avatar}</div>
    `;
    enemyGroup.appendChild(unit);
  });
}

// Main ATB Combat Engine Clock (Runs every 100ms)
function processCombatFrame() {
  if (!combatState.active || !combatState.enemies || combatState.enemies.length === 0) return;
  
  // 1. Drive Monster ATBs
  combatState.enemies.forEach(enemy => {
    if (enemy.hp <= 0) return;
    enemy.atb += enemy.spd * 2.5; // normalized scale
    if (enemy.atb >= 100) {
      enemy.atb = 0;
      enemyExecuteAttack(enemy);
    }
  });
  
  // 2. Drive Heroes ATBs
  combatState.party.forEach(pid => {
    const p = state.population.find(res => res.id === pid);
    if (!p || p.hp <= 0) return; // dead can't act
    const eff = calcEffStats(p);
    
    if (p.atb === undefined) p.atb = 0;
    
    // Normal auto attacks execute at 100%
    if (p.atb < 100) {
       p.atb += eff.spd * 2.5;
    }
    
    if (p.atb >= 100 && !combatState.casting) {
       p.atb = 0;
       heroExecuteAttack(pid);
    }
  });
  
  // 3. UI Refresher
  updateCombatBars();
}

function heroExecuteAttack(pid) {
  const p = state.population.find(res => res.id === pid);
  if (!p) return;
  const eff = calcEffStats(p);
  
  // Find a random alive enemy
  const aliveEnemies = combatState.enemies.filter(e => e.hp > 0);
  if (aliveEnemies.length === 0) return;
  const enemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
  
  // Calculate Hit / Miss
  const evasionChance = Math.max(0, (enemy.evasion||0.05) - (eff.hit - 1.0));
  if (Math.random() < evasionChance) {
     logBattle(`${p.name} 攻擊 ${enemy.name}，但是 <span style="color:#9ca3af;">Miss</span> 了！`);
     checkBattleResolution();
     return;
  }
  
  // Calculate base physical attack
  let dmg = Math.max(1, eff.atk - enemy.def);
  
  // Crit
  let isCrit = false;
  if (Math.random() < eff.critRate) {
    isCrit = true;
    dmg = Math.floor(dmg * eff.critDmg);
  }
  
  // Boss Killer Trait
  if (enemy.isBoss) {
    if (p.jobClass === "monk") {
      const mult = 3.0 + (p.level - 1) * 0.8;
      dmg = Math.floor(dmg * mult);
      logBattle(`💢 和尚發動【降魔】真言！物理穿透倍率爆發 x${mult.toFixed(1)}！`, "log-item-buff");
    } else if (p.jobClass === "taoist") {
      const mult = 2.0 + (p.level - 1) * 0.5;
      dmg = Math.floor(dmg * mult);
      logBattle(`☯️ 道士引動【天威】印記！魔法特攻倍率爆發 x${mult.toFixed(1)}！`, "log-item-buff");
    } else if (p.jobClass === "paladin" || p.jobClass === "priest") {
      const mult = 2.5 + (p.level - 1) * 0.6;
      dmg = Math.floor(dmg * mult);
      logBattle(`✨ 聖光照耀！對巨獸傷害特攻倍率 x${mult.toFixed(1)}！`, "log-item-buff");
    }
  }

  logBattle(`${p.name} 揮擊 ${enemy.name}，造成 ${isCrit?'<b style="color:red; font-size:1.2em;">CRIT!</b> ':''}<span class="log-item-dmg">${dmg}</span> 傷害。`);
  
  enemy.hp -= dmg;
  
  // Lifesteal proc
  if (eff.lifesteal > 0) {
    const heal = Math.floor(dmg * (eff.lifesteal / 100));
    p.hp = Math.min(eff.maxHp, p.hp + heal);
  }
  
  // Flash animation effect
  const av = document.getElementById(enemy.id);
  if (av) {
    av.classList.add("attack-anim");
    setTimeout(() => av.classList.remove("attack-anim"), 150);
  }

  checkBattleResolution();
}

function enemyExecuteAttack(enemy) {
  // Select random alive party member
  const combatParty = state.population.filter(p => combatState.party.includes(p.id));
  const alive = combatParty.filter(p => p.hp > 0);
  if (alive.length === 0) return;
  
  const target = alive[Math.floor(Math.random() * alive.length)];
  const eff = calcEffStats(target);
  
  // Evade?
  const evasionChance = Math.max(0, eff.evasion - ((enemy.hit||1.0) - 1.0)); // Enemies don't have hit stat yet, assume 1.0
  if (Math.random() < evasionChance) {
    logBattle(`👾 ${enemy.name} 攻擊 ${target.name}，被驚險地 <span style="color:#9ca3af;">Miss</span> 閃避了！`);
    return;
  }

  const dmg = Math.max(1, enemy.atk - eff.def);
  target.hp = Math.max(0, target.hp - dmg);
  
  logBattle(`👾 ${enemy.name} 發動攻擊，${target.name} 受到 <b class="log-item-dmg">${dmg}</b> 傷害。`);
  
  // Flash animation
  const pEl = document.getElementById(`prof-${target.id}`);
  pEl?.classList.add("attack-anim");
  setTimeout(() => pEl?.classList.remove("attack-anim"), 150);

  checkBattleResolution();
}

function checkBattleResolution() {
  const aliveEnemies = combatState.enemies.filter(e => e.hp > 0);
  const combatParty = state.population.filter(p => combatState.party.includes(p.id));
  const aliveHeroes = combatParty.filter(p => p.hp > 0);
  
  if (aliveEnemies.length === 0) {
    // Victory!
    logBattle(`🏆 勝利！擊退了所有敵人！`, "log-item-heal");
    
    // Grant EXP & Money
    let totalExp = 0;
    let totalMoney = 0;
    combatState.enemies.forEach(e => {
       totalExp += (e.rewardExp || 0);
       totalMoney += (e.rewardMoney || 0);
    });
    
    state.money += totalMoney;
    combatParty.forEach(p => {
      p.exp += totalExp;
      
      // Level up logic
      const req = window.getReqExp(p.level);
      if (p.level < 10 && p.exp >= req) {
        if (p.level === 9) {
          // Cannot level up to 10 without calculus exam
          p.exp = req; 
        } else {
          p.exp -= req; // keep leftover spillover exp
          p.level += 1;
          logBattle(`✨🆙 ${p.name} 等級提升至 Lv.${p.level}！`, "log-item-drop");
        }
      }
    });
    
    // Roll for drop (White 50%, Magic 30%, Rare 15%, Epic 4%, Legend 1%)
    const roll = Math.random();
    let rKey = null;
    if (roll < 0.02) rKey = "legend";
    else if (roll < 0.08) rKey = "epic";
    else if (roll < 0.25) rKey = "rare";
    else if (roll < 0.55) rKey = "magic";
    
    if (rKey) {
      const lvl = Math.min(7, Math.ceil(totalExp / 20));
      if (state.inventory.length < 24) {
        const dropped = generateItem(lvl, rKey);
        state.inventory.push(dropped);
        logBattle(`🎁 怪物掉落神裝：[${dropped.name}]！`, "log-item-drop");
      } else {
        logBattle(`⚠️ 背包滿了，掉落神裝不慎遺失...`);
      }
    }
    
    // Auto next hunt if not boss
    if (combatState.target === "hunt" && combatState.active) {
      setTimeout(() => {
        if (combatState.active) {
          spawnEnemy();
          logBattle(`➡ 遭遇下一波對手！`);
        }
      }, 1500);
    } else if (combatState.target === "boss" || combatState.enemies.some(e=>e.isBoss)) {
      logBattle(`👑 史詩成就！你討伐了古老的巨獸，城鎮的危機解除！`, "log-item-drop");
      stopQuest();
    }
    
  } else if (aliveHeroes.length === 0) {
    // Defeat!
    logBattle(`💀 戰敗... 全軍覆沒，返回營地復合。`, "log-item-dmg");
    stopQuest();
  }
}

function updateCombatBars() {
  if (!combatState.enemies) return;
  
  // Enemies
  combatState.enemies.forEach(enemy => {
    if(enemy.hp <= 0) {
      const unit = document.getElementById(enemy.id);
      if(unit) unit.style.opacity = "0.3";
      return;
    }
    const eHpPct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
    const hpBar = document.getElementById(`${enemy.id}-hpBar`);
    const hpVal = document.getElementById(`${enemy.id}-hpVal`);
    const atbBar = document.getElementById(`${enemy.id}-atbBar`);
    
    if(hpBar) hpBar.style.width = `${eHpPct}%`;
    if(hpVal) hpVal.textContent = `${enemy.hp}/${enemy.maxHp}`;
    if(atbBar) atbBar.style.width = `${enemy.atb}%`;
  });
  
  // Heroes
  combatState.party.forEach(pk => {
    const hero = state.heroes[pk];
    const eff = calcEffStats(pk);
    
    const hpPct = Math.max(0, (hero.hp / eff.maxHp) * 100);
    const mpPct = Math.max(0, (hero.mp / eff.maxMp) * 100);
    const atbPct = hero.atb || 0;
    
    const lvEl = document.getElementById(`b-${pk}-lv`);
    const hpBarEl = document.getElementById(`b-${pk}-hp-bar`);
    const hpValEl = document.getElementById(`b-${pk}-hp-val`);
    const mpBarEl = document.getElementById(`b-${pk}-mp-bar`);
    const mpValEl = document.getElementById(`b-${pk}-mp-val`);
    const atbBarEl = document.getElementById(`b-${pk}-atb-bar`);
    
    if(lvEl) lvEl.textContent = hero.level;
    if(hpBarEl) hpBarEl.style.width = `${hpPct}%`;
    if(hpValEl) hpValEl.textContent = `${hero.hp}/${eff.maxHp}`;
    if(mpBarEl) mpBarEl.style.width = `${mpPct}%`;
    if(mpValEl) mpValEl.textContent = `${hero.mp}/${eff.maxMp}`;
    if(atbBarEl) atbBarEl.style.width = `${atbPct}%`;
  });
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
          state[key] = JSON.parse(JSON.stringify(saved[key]));
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

btnBuildCabin.addEventListener("click", () => {
  if (state.wood >= gameConfig.costs.cabin.wood) {
    state.wood -= gameConfig.costs.cabin.wood;
    state.buildings.cabins += 1;
    spawnFloatingText("+1 木屋 🏚️", "#818cf8");
    updateUI();
  }
});

btnBuildFarm.addEventListener("click", () => {
  if (state.wood >= gameConfig.costs.farm.wood && state.stone >= gameConfig.costs.farm.stone) {
    state.wood -= gameConfig.costs.farm.wood;
    state.stone -= gameConfig.costs.farm.stone;
    state.buildings.farms += 1;
    spawnFloatingText("+1 農田 🌾", "#f59e0b");
    updateUI();
  }
});

btnBuildSmelter.addEventListener("click", () => {
  if (state.wood >= gameConfig.costs.smelter.wood && state.stone >= gameConfig.costs.smelter.stone) {
    state.wood -= gameConfig.costs.smelter.wood;
    state.stone -= gameConfig.costs.smelter.stone;
    state.buildings.smelter += 1;
    spawnFloatingText("+1 熔爐 🪙", "#38bdf8");
    updateUI();
  }
});

btnBuildPower.addEventListener("click", () => {
  if (state.stone >= gameConfig.costs.powerPlant.stone && state.metal >= gameConfig.costs.powerPlant.metal) {
    state.stone -= gameConfig.costs.powerPlant.stone;
    state.metal -= gameConfig.costs.powerPlant.metal;
    state.buildings.powerPlant += 1;
    spawnFloatingText("+1 電廠 ⚡", "#facc15");
    updateUI();
  }
});

btnBuildWarehouse.addEventListener("click", () => {
  if (state.wood >= gameConfig.costs.warehouse.wood && state.stone >= gameConfig.costs.warehouse.stone) {
    state.wood -= gameConfig.costs.warehouse.wood;
    state.stone -= gameConfig.costs.warehouse.stone;
    state.buildings.warehouse += 1;
    spawnFloatingText("+1 倉庫 📦", "#10b981");
    updateUI();
  }
});

btnBuildBattery.addEventListener("click", () => {
  if (state.stone >= gameConfig.costs.battery.stone && state.metal >= gameConfig.costs.battery.metal) {
    state.stone -= gameConfig.costs.battery.stone;
    state.metal -= gameConfig.costs.battery.metal;
    state.buildings.battery += 1;
    spawnFloatingText("+1 蓄電池 🔋", "#f59e0b");
    updateUI();
  }
});

btnBuildBank.addEventListener("click", () => {
  if (state.stone >= gameConfig.costs.bank.stone && state.metal >= gameConfig.costs.bank.metal) {
    state.stone -= gameConfig.costs.bank.stone;
    state.metal -= gameConfig.costs.bank.metal;
    state.buildings.bank += 1;
    spawnFloatingText("+1 銀行 💰", "#facc15");
    updateUI();
  }
});

btnBuildSchool.addEventListener("click", () => {
  if (state.wood >= gameConfig.costs.school.wood && state.stone >= gameConfig.costs.school.stone && state.energy >= gameConfig.costs.school.energy) {
    state.wood -= gameConfig.costs.school.wood;
    state.stone -= gameConfig.costs.school.stone;
    state.energy -= gameConfig.costs.school.energy;
    state.buildings.school += 1;
    spawnFloatingText("+1 學院 📚", "#a78bfa");
    updateUI();
  }
});

btnTechHero?.addEventListener("click", () => {
  if (state.tech.heroLicense) return;
  const tCfg = gameConfig.combat.tech.heroLicense;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.tech.heroLicense = true;
    spawnFloatingText("🎓 英雄招募令已研發!", "#60a5fa");
    showToast("⚔️ 解鎖【英雄招募令】！現在可以招募探險者討伐怪物了！", "success");
    updateUI();
  } else {
    showToast("❌ 研究知識或金幣不足！", "error");
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
