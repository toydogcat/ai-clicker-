import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import gameConfig from "./config.json";

// ==========================================
// 1. Game State & Constants & DOM Management
// ==========================================
const DEFAULT_STATE = {
  wood: 0,
  stone: 0,
  food: 30,
  metal: 0,
  energy: 0,
  money: 0,
  knowledge: 0,
  workerLimit: 5,
  gatherFocus: 'wood',
  difficulty: 'normal', // easy, normal, hard, nightmare
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
    heroLicense: false,
    huntLv4: false,
    huntLv7: false,
    secretLv4: false,
    secretLv7: false
  },
  party: [],
  inventory: [],
  bossLevel: 1,
  secretShop: {
    items: [], // Stores current rack of secret items { item, cost, soldOut }
    lastLevel: 1
  }
};

const DIFFICULTY_MULTIPLIERS = {
  easy: {
    label: "🌱 簡單",
    color: "#10b981",
    gather: 2.0,
    enemyHp: 0.5,
    enemyAtk: 0.5,
    expMoneyMod: 1.5
  },
  normal: {
    label: "⚔️ 一般",
    color: "#3b82f6",
    gather: 1.0,
    enemyHp: 1.0,
    enemyAtk: 1.0,
    expMoneyMod: 1.0
  },
  hard: {
    label: "🔥 困難",
    color: "#f59e0b",
    gather: 0.7,
    enemyHp: 1.5,
    enemyAtk: 1.4,
    expMoneyMod: 0.8
  },
  nightmare: {
    label: "💀 惡夢",
    color: "#ef4444",
    gather: 0.4,
    enemyHp: 2.5,
    enemyAtk: 2.0,
    expMoneyMod: 0.5
  },
  test: {
    label: "🧪 測試",
    color: "#a855f7",
    gather: 10.0,
    enemyHp: 0.1,
    enemyAtk: 0.1,
    expMoneyMod: 10.0
  }
};

const state = JSON.parse(JSON.stringify(DEFAULT_STATE));
window.state = state;

window.setDifficulty = function(key) {
  if (!DIFFICULTY_MULTIPLIERS[key]) return;
  state.difficulty = key;
  
  const modal = document.getElementById("difficultyModal");
  if (modal) modal.style.display = "none";
  
  saveGame(true); // silent save
  updateUI();
  showToast(`🎮 冒險開始！已設定為【${DIFFICULTY_MULTIPLIERS[key].label}】！`, "success");
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
const dispatchRpgCard = document.getElementById("dispatchRpgCard");
const rpgLockOverlay = document.getElementById("rpgLockOverlay");
const rpgUnlockedContent = document.querySelector(".rpg-unlocked-content");
const btnTechHero = document.getElementById("btnTechHero");
const techHeroStatusEl = document.getElementById("techHeroStatus");

const btnTechHuntLv4 = document.getElementById("btnTechHuntLv4");
const techHuntLv4StatusEl = document.getElementById("techHuntLv4Status");
const btnTechHuntLv7 = document.getElementById("btnTechHuntLv7");
const techHuntLv7StatusEl = document.getElementById("techHuntLv7Status");
const btnTechSecretLv4 = document.getElementById("btnTechSecretLv4");
const techSecretLv4StatusEl = document.getElementById("techSecretLv4Status");
const btnTechSecretLv7 = document.getElementById("btnTechSecretLv7");
const techSecretLv7StatusEl = document.getElementById("techSecretLv7Status");

const researchCard = document.getElementById("researchCard");
const knowledgeValEl = document.getElementById("knowledgeVal");
const invCountEl = document.getElementById("invCount");
const inventoryContainer = document.getElementById("inventoryContainer");
const skillDock = document.getElementById("skillDock");
const battleLogEl = document.getElementById("battleLog");
const secretShopGrid = document.getElementById("secretShopGrid");
const btnRefreshSecretShop = document.getElementById("btnRefreshSecretShop");
const secretShopLevelSelect = document.getElementById("secretShopLevelSelect");
const secretRefreshCostText = document.getElementById("secretRefreshCostText");

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
    if (silent !== true) {
      showToast("💾 進度已存入瀏覽器快取！", "success");
    }
  } catch (e) {
    showToast("❌ 存檔失敗：" + e.message, "error");
  }
}

function exportGame() {
  try {
    const saveData = {
      version: 1,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state))
    };
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_clicker_save_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("📤 備份檔案下載中...", "success");
  } catch (e) {
    showToast("❌ 匯出失敗：" + e.message, "error");
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      showToast("📂 找不到本機快取存檔！", "error");
      return false;
    }
    applySaveData(raw);
    return true;
  } catch (e) {
    showToast("❌ 讀檔失敗：" + e.message, "error");
    return false;
  }
}

function deepHydrate(target, source) {
  if (!source) return;
  Object.keys(target).forEach(key => {
    if (source[key] === undefined) return; // Use existing default in target
    
    if (Array.isArray(target[key])) {
      target[key] = JSON.parse(JSON.stringify(source[key]));
    } else if (typeof target[key] === 'object' && target[key] !== null) {
      if (typeof source[key] === 'object' && source[key] !== null) {
        deepHydrate(target[key], source[key]);
      }
    } else {
      target[key] = source[key];
    }
  });
}

function applySaveData(rawString) {
  try {
    const saveData = JSON.parse(rawString);
    const saved = saveData.state;

    if (!saved) {
      throw new Error("存檔資料損毀 (無 state 欄位)");
    }

    // First, restore current state entirely back to default schema defaults
    const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, fresh);

    // Recursively merge loaded state into the fresh default state
    deepHydrate(state, saved);

    // Backfill any missing resident-level fields for robust backward compatibility
    if (Array.isArray(state.population)) {
      state.population.forEach(p => {
        if (!p.eq) p.eq = {};
        if (!p.assignment) p.assignment = "idle";
        if (!p.level) p.level = 1;
        if (!p.exp) p.exp = 0;
        if (!p.baseStats) {
          p.baseStats = { hp: 100, mp: 20, atk: 10, def: 5, matk: 5, spd: 10 };
        }
        // Ensure dynamic parameters exist
        if (p.hp === undefined) p.hp = p.baseStats.hp;
        if (p.mp === undefined) p.mp = p.baseStats.mp;
      });
    }

    // Restore UI from loaded state
    setGatherFocus(state.gatherFocus || 'wood');
    updateUI();
    updateLevelSelectors();

    const date = new Date(saveData.timestamp);
    showToast(`📂 載入成功！（${date.toLocaleTimeString('zh-TW')}）`, "info");
  } catch (err) {
    showToast("❌ 載入失敗：" + err.message, "error");
  }
}

function resetGame() {
  if (!confirm("確定要刪除存檔並重置遊戲嗎？\n（此操作無法復原）")) return;
  localStorage.removeItem(SAVE_KEY);
  
  const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
  // Fully swap values while keeping reference intact
  Object.keys(state).forEach(key => delete state[key]);
  Object.assign(state, fresh);
  
  setGatherFocus('wood');
  updateUI();
  updateLevelSelectors();
  showToast("🗑️ 已重置！重新開始！", "error");
  
  const modal = document.getElementById("difficultyModal");
  if (modal) modal.style.display = "flex";
}

// Bind save/load/reset buttons
document.getElementById("btn-save").addEventListener("click", () => saveGame());
document.getElementById("btn-load").addEventListener("click", () => loadGame());
document.getElementById("btn-reset").addEventListener("click", () => resetGame());

// Bind export/import buttons
const btnExport = document.getElementById("btn-export");
const btnImport = document.getElementById("btn-import");
const importInput = document.getElementById("import-file-input");

if (btnExport) {
  btnExport.addEventListener("click", () => exportGame());
}

if (btnImport && importInput) {
  btnImport.addEventListener("click", () => {
    importInput.click(); // Directly triggered by user click -> browser security won't block!
  });
  
  importInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = ev => {
      applySaveData(ev.target.result);
      // Clear input to allow importing the same file name again if needed
      e.target.value = "";
    };
    reader.readAsText(file);
  });
}

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

  const diffBadgeVal = document.getElementById("diffBadgeVal");
  const diffCfg = DIFFICULTY_MULTIPLIERS[state.difficulty || 'normal'] || DIFFICULTY_MULTIPLIERS.normal;
  if (diffBadgeVal) {
    diffBadgeVal.textContent = diffCfg.label;
    diffBadgeVal.style.color = diffCfg.color;
  }
  
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

  // Calculate net food per second (scaling production by difficulty gather multiplier)
  const diffMult = diffCfg.gather;
  const passiveGen = ((state.buildings.farms * 1.0) + populationFoodGen) * diffMult;
  const netFoodRate = passiveGen - totalFoodCost;
  const sign = netFoodRate >= 0 ? "+" : "";
  foodRateEl.textContent = `${sign}${netFoodRate.toFixed(1)}/秒`;
  foodRateEl.className = netFoodRate < 0 ? "res-rate alert-text" : "res-rate";

  // Update automated Metal rates (scaling production by difficulty gather multiplier)
  const netMetalRate = (state.buildings.smelter * 0.3) * diffMult;
  metalRateEl.textContent = `+${netMetalRate.toFixed(1)}/秒`;

  // Update automated Energy rates (scaling production by difficulty gather multiplier)
  const netEnergyRate = (state.buildings.powerPlant * 1.0) * diffMult;
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

    // Hunt Lv4
    const hunt4Cfg = gameConfig.combat.tech.huntLv4;
    if (state.tech.huntLv4) {
      if (btnTechHuntLv4) btnTechHuntLv4.disabled = true;
      if (techHuntLv4StatusEl) techHuntLv4StatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechHuntLv4) btnTechHuntLv4.disabled = (state.knowledge < hunt4Cfg.reqKnowledge || state.money < hunt4Cfg.reqMoney);
      if (techHuntLv4StatusEl) techHuntLv4StatusEl.textContent = "未研發";
    }

    // Hunt Lv7
    const hunt7Cfg = gameConfig.combat.tech.huntLv7;
    if (state.tech.huntLv7) {
      if (btnTechHuntLv7) btnTechHuntLv7.disabled = true;
      if (techHuntLv7StatusEl) techHuntLv7StatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechHuntLv7) btnTechHuntLv7.disabled = (!state.tech.huntLv4 || state.knowledge < hunt7Cfg.reqKnowledge || state.money < hunt7Cfg.reqMoney);
      if (techHuntLv7StatusEl) techHuntLv7StatusEl.textContent = !state.tech.huntLv4 ? "🔒 需前置" : "未研發";
    }

    // Secret Lv4
    const sec4Cfg = gameConfig.combat.tech.secretLv4;
    if (state.tech.secretLv4) {
      if (btnTechSecretLv4) btnTechSecretLv4.disabled = true;
      if (techSecretLv4StatusEl) techSecretLv4StatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechSecretLv4) btnTechSecretLv4.disabled = (state.knowledge < sec4Cfg.reqKnowledge || state.money < sec4Cfg.reqMoney);
      if (techSecretLv4StatusEl) techSecretLv4StatusEl.textContent = "未研發";
    }

    // Secret Lv7
    const sec7Cfg = gameConfig.combat.tech.secretLv7;
    if (state.tech.secretLv7) {
      if (btnTechSecretLv7) btnTechSecretLv7.disabled = true;
      if (techSecretLv7StatusEl) techSecretLv7StatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechSecretLv7) btnTechSecretLv7.disabled = (!state.tech.secretLv4 || state.knowledge < sec7Cfg.reqKnowledge || state.money < sec7Cfg.reqMoney);
      if (techSecretLv7StatusEl) techSecretLv7StatusEl.textContent = !state.tech.secretLv4 ? "🔒 需前置" : "未研發";
    }
    // Update Quest Boss Button Text matching sequential levels
    const btnQuestBoss = document.getElementById("btnQuestBoss");
    if (btnQuestBoss) {
      const bLvl = state.bossLevel || 1;
      const bossNames = ["【貪】", "【貪 嗔】", "【貪 嗔 癡】"];
      const bName = bossNames[Math.min(3, bLvl) - 1] || bossNames[0];
      btnQuestBoss.textContent = `💀 挑戰巨獸 Lv.${bLvl} ${bName}`;
    }
  } else {
    if (researchCard) researchCard.style.display = "none";
  }

  if (state.tech.heroLicense) {
    rpgGuildCard?.classList.remove("locked");
    if (rpgLockOverlay) rpgLockOverlay.style.display = "none";
    if (rpgUnlockedContent) rpgUnlockedContent.style.display = "block";
    if (dispatchRpgCard) dispatchRpgCard.style.display = "block";
    updateHeroSheets();
  } else {
    rpgGuildCard?.classList.add("locked");
    if (rpgLockOverlay) rpgLockOverlay.style.display = "flex";
    if (rpgUnlockedContent) rpgUnlockedContent.style.display = "none";
    if (dispatchRpgCard) dispatchRpgCard.style.display = "none";
  }

  renderPopulationRoster();
}

// Removed adjustJob


// Action Click: Gather Resource
function performClick(resourceOverride = null, sourceX = null, sourceY = null) {
  const resource = resourceOverride || state.gatherFocus;
  const caps = getCapacities();
  
  const diffCfg = DIFFICULTY_MULTIPLIERS[state.difficulty || 'normal'] || DIFFICULTY_MULTIPLIERS.normal;
  const clickYield = 1 * diffCfg.gather;
  
  let text = "";
  let color = "";

  if (resource === "wood") {
    if (Math.floor(state.wood) >= caps.wood) {
      spawnFloatingText("⚠️ 倉庫已滿", "#ef4444", sourceX, sourceY);
      return; // Prevent gathering if full
    }
    state.wood = Math.min(state.wood + clickYield, caps.wood);
    text = `+${clickYield % 1 === 0 ? clickYield : clickYield.toFixed(1)} 木頭`;
    color = "#818cf8"; // indigo
  } else if (resource === "stone") {
    if (Math.floor(state.stone) >= caps.stone) {
      spawnFloatingText("⚠️ 倉庫已滿", "#ef4444", sourceX, sourceY);
      return; // Prevent gathering if full
    }
    state.stone = Math.min(state.stone + clickYield, caps.stone);
    text = `+${clickYield % 1 === 0 ? clickYield : clickYield.toFixed(1)} 石頭`;
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
  const diffCfg = DIFFICULTY_MULTIPLIERS[state.difficulty || 'normal'] || DIFFICULTY_MULTIPLIERS.normal;
  const diffMult = diffCfg.gather;

  // 1. Passive food yield (Farms: +1/s)
  const passiveGen = (state.buildings.farms * 1) * diffMult;
  state.food += passiveGen;
  
  // 2. Automated Industrial Yields (Smelters: +0.3/s Metal, Power Plants: +1.0/s Energy)
  state.metal += (state.buildings.smelter * 0.3) * diffMult;
  state.energy += (state.buildings.powerPlant * 1.0) * diffMult;

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

  state.wood += netWood * diffMult;
  state.stone += netStone * diffMult;
  state.food += netFood * diffMult;
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
        const buildingNames = {
          cabins: '木屋', farms: '農田', smelter: '熔爐',
          powerPlant: '發電廠', warehouse: '倉庫', battery: '蓄電池組',
          bank: '銀行', school: '學院'
        };
        const bKeys = Object.keys(state.buildings).filter(k => state.buildings[k] > 0);
        if (bKeys.length > 0) {
          let target = bKeys[Math.floor(Math.random() * bKeys.length)];
          state.buildings[target]--;
          const displayName = buildingNames[target] || target;
          showToast(`🚨 巨獸摧毀了一棟【${displayName}】！快去討伐它！`, "error");
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
    const container = tabBtn.closest(".glass-card, .rpg-unlocked-content");
    if (!container) return;
    
    container.querySelectorAll(".rpg-sub-tab").forEach(b => b.classList.remove("active"));
    container.querySelectorAll(".rpg-panel").forEach(p => p.classList.remove("active"));
    
    tabBtn.classList.add("active");
    const panelId = `rpg-${tabBtn.dataset.rpgTab}`;
    const panel = container.querySelector(`#${panelId}`);
    if (panel) panel.classList.add("active");
    
    if (tabBtn.dataset.rpgTab === "inventory-panel") {
      renderInventory();
    } else if (tabBtn.dataset.rpgTab === "secret-shop") {
      renderSecretShop();
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

  // Prevent wiping roster DOM if the user is currently interacting with a dropdown
  const active = document.activeElement;
  if (active && active.tagName === "SELECT" && populationRoster.contains(active)) {
    return;
  }

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
    
    if (p.assignment === "hospital") {
      // HOSPITAL RENDER LOGIC
      const reviveCost = p.level * 10;
      const canAfford = state.money >= reviveCost;
      
      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="job-title" style="font-size: 1.1rem; color: #94a3b8; text-decoration: line-through;">${p.name} (Lv.${p.level})</span>
            <span style="margin-left:0.5rem; color:#ef4444; font-weight:bold; font-size: 0.85rem; display: flex; align-items: center; gap: 3px;">🏥 搶救治療中</span>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(239,68,68,0.1); padding: 0.4rem 0.5rem; border-radius: 4px; border: 1px solid rgba(239,68,68,0.25);">
          <span style="font-size: 0.8rem; color: #fca5a5;">⚠️ 0 / ${calcEffStats(p)?.maxHp || 10} HP</span>
          <button class="ctrl-btn" style="background: ${canAfford ? '#10b981' : '#4b5563'}; color: white; font-weight:bold; border-radius:4px; cursor: ${canAfford ? 'pointer' : 'not-allowed'};" 
            onclick="reviveHero('${p.id}')" ${canAfford ? '' : 'disabled'}>
            💖 付費急救 (💰${reviveCost})
          </button>
        </div>
      `;
    } else {
      // NORMAL RENDER LOGIC
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
    }
    
    populationRoster.appendChild(row);
  });
}

window.reviveHero = function(id) {
  const p = state.population.find(r => r.id === id);
  if (!p) return;
  
  const reviveCost = p.level * 10;
  if (state.money < reviveCost) {
    showToast("❌ 國庫資金不足，支付不起急診費！", "error");
    return;
  }
  
  state.money -= reviveCost;
  p.assignment = 'idle'; // Rescued back to camp
  const eff = calcEffStats(p);
  if (eff) p.hp = eff.maxHp; // Restore HP
  
  showToast(`💖 聖光醫治成功！${p.name} 傷癒歸隊並返回營地！`, "success");
  updateUI();
};

window.changeResidentAssignment = function(id, newAssignment) {
  const p = state.population.find(r => r.id === id);
  if (p) {
    // Hospitalized can't be reassigned normally
    if (p.assignment === 'hospital') return;
    
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
    
    // Explicitly remove focus to permit immediate UI refresh on the next frame
    if (document.activeElement && document.activeElement.tagName === "SELECT") {
      document.activeElement.blur();
    }
    
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
    // Reset to level 5 as per design (class starts fresh at lv5)
    p.level = 5;
    p.exp = 0;
    p.assignment = 'idle'; // Heroes can no longer labor
    
    if (select) select.blur();
    
    showToast(`🎉 ${p.name} 成功轉職為 ${gameConfig.heroes[p.jobClass].name}！從 Lv.5 重新出發！`, "success");
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

// --- Secret Shop Management ---
function getSecretRefreshCost(level) {
  const baseCost = gameConfig.eqSpecs.price[level] || 100;
  return Math.max(200, Math.floor(baseCost * 0.2));
}

function getSecretShopPrice(level, rarity) {
  const basePrice = gameConfig.eqSpecs.price[level] || 100;
  const mults = { normal: 1.2, magic: 2.5, rare: 6.0, epic: 18.0, legend: 50.0 };
  const m = mults[rarity] || 1;
  return Math.floor(basePrice * m * 1.5);
}

function rollSecretShop(isInit = false) {
  const level = secretShopLevelSelect ? parseInt(secretShopLevelSelect.value) : 1;
  state.secretShop.lastLevel = level;
  const items = [];
  
  const slots = Object.keys(gameConfig.eqSpecs.slots);
  
  // Spawns 6 items
  for (let i = 0; i < 6; i++) {
    // Rolled rarity weights
    let rarity = "normal";
    const roll = Math.random();
    if (roll < 0.05) rarity = "legend"; // 5%
    else if (roll < 0.15) rarity = "epic";   // 10%
    else if (roll < 0.40) rarity = "rare";   // 25%
    else if (roll < 0.80) rarity = "magic";  // 40%
    else rarity = "normal";                  // 20%
    
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const generated = generateItem(level, rarity, slot);
    const price = getSecretShopPrice(level, rarity);
    
    items.push({
      uid: "secret_" + Date.now() + "_" + i + "_" + Math.floor(Math.random() * 1000),
      item: generated,
      cost: price,
      soldOut: false
    });
  }
  state.secretShop.items = items;
  
  if (!isInit) {
    showToast("✨ 神秘商店商品已重新進貨！", "success");
  }
}
function updateLevelSelectors() {
  // 1. Update targetHuntLevel dropdown options
  const targetHuntLevelEl = document.getElementById("targetHuntLevel");
  if (targetHuntLevelEl) {
    const currentVal = targetHuntLevelEl.value;
    targetHuntLevelEl.innerHTML = "";
    
    const allHuntOptions = [
      { v: 1, t: "🐣 Lv.1 可愛史萊姆" },
      { v: 2, t: "🐣 Lv.2 野蠻哥布林" },
      { v: 3, t: "🐣 Lv.3 瘋狂野豬" },
      { v: 4, t: "⚔️ Lv.4 骷髏小兵" },
      { v: 5, t: "⚔️ Lv.5 森林半人馬" },
      { v: 6, t: "⚔️ Lv.6 地獄犬幼犬" },
      { v: 7, t: "🔥 Lv.7 熔岩蜥蜴" },
      { v: 8, t: "🔥 Lv.8 暗影刺客" },
      { v: 9, t: "🔥 Lv.9 狂暴雙頭魔" },
      { v: 10, t: "👑 Lv.10 超巨型史萊姆王 (終極試煉)" }
    ];
    
    let maxHunt = 3;
    if (state.tech.huntLv7) maxHunt = 10;
    else if (state.tech.huntLv4) maxHunt = 6;
    
    for (let i = 0; i < maxHunt; i++) {
      const opt = document.createElement("option");
      opt.value = allHuntOptions[i].v;
      opt.textContent = allHuntOptions[i].t;
      targetHuntLevelEl.appendChild(opt);
    }
    
    // Try to restore selection if valid
    if (parseInt(currentVal) <= maxHunt) {
      targetHuntLevelEl.value = currentVal;
    } else {
      targetHuntLevelEl.value = 1;
    }
  }
  
  // 2. Update secretShopLevelSelect dropdown options
  if (secretShopLevelSelect) {
    const currentVal = secretShopLevelSelect.value;
    secretShopLevelSelect.innerHTML = "";
    
    let maxSecret = 3;
    if (state.tech.secretLv7) maxSecret = 7;
    else if (state.tech.secretLv4) maxSecret = 5;
    
    for (let i = 1; i <= maxSecret; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `Lv ${i} 等級貨架`;
      secretShopLevelSelect.appendChild(opt);
    }
    
    // Try to restore selection if valid
    if (parseInt(currentVal) <= maxSecret) {
      secretShopLevelSelect.value = currentVal;
    } else {
      secretShopLevelSelect.value = 1;
    }
  }
}


window.renderSecretShop = function() {
  if (!secretShopGrid) return;
  secretShopGrid.innerHTML = "";
  
  const curLevel = secretShopLevelSelect ? parseInt(secretShopLevelSelect.value) : 1;
  const refreshCost = getSecretRefreshCost(curLevel);
  if (secretRefreshCostText) secretRefreshCostText.textContent = `💰 ${refreshCost}`;
  
  // If items list is empty, auto-roll one!
  if (!state.secretShop.items || state.secretShop.items.length === 0) {
    rollSecretShop(true);
  }
  
  state.secretShop.items.forEach(entry => {
    const { item, cost, soldOut } = entry;
    const rSpec = gameConfig.eqSpecs.rarities[item.rarity];
    const rColor = rSpec.color;
    
    const card = document.createElement("div");
    card.className = `secret-item-card ${soldOut ? "sold-out" : ""}`;
    card.style.borderColor = `${rColor}50`;
    
    // Icon and tags
    const icon = getSlotIcon(item.slot);
    
    // Generate stats HTML strings
    let statsHtml = `<div class="secret-item-main-stat">+ ${gameConfig.eqSpecs.statNames[item.mainStat]}: ${item.mainStatVal}</div>`;
    Object.entries(item.extras).forEach(([key, val]) => {
      statsHtml += `<div class="secret-item-extra-stat">+ ${gameConfig.eqSpecs.statNames[key]}: ${val}${key.includes('lifesteal') ? '%' : ''}</div>`;
    });
    
    card.innerHTML = `
      <div class="secret-item-title-row">
        <div class="secret-item-icon">${icon}</div>
        <div class="secret-item-header-info">
          <div class="secret-item-name" style="color: ${rColor}; text-shadow: 0 0 6px ${rColor}20;">${item.name}</div>
          <div class="secret-item-badge" style="color: ${rColor}; border-color: ${rColor}80;">${rSpec.name}</div>
        </div>
      </div>
      <div class="secret-item-stats">
        ${statsHtml}
      </div>
      <button class="secret-item-buy-btn" style="border-color: ${rColor}60;">
        💰 ${cost.toLocaleString()} 購買
      </button>
    `;
    
    // Attach buy handler if not sold out
    if (!soldOut) {
      const buyBtn = card.querySelector(".secret-item-buy-btn");
      buyBtn.addEventListener("click", () => {
        if (state.money < cost) {
          showToast("💰 金幣不足，買不起這件神裝！", "error");
          return;
        }
        if (state.inventory.length >= 24) {
          showToast("🎒 背包已滿，裝不下了！", "error");
          return;
        }
        
        // Deduct cost and deliver item
        state.money -= cost;
        entry.soldOut = true;
        state.inventory.push(item);
        
        showToast(`🎉 成功入手極品裝備 [${item.name}]！`, "success");
        renderSecretShop();
        renderInventory();
        updateUI();
      });
    }
    
    secretShopGrid.appendChild(card);
  });
};

// Refresh button handler
if (btnRefreshSecretShop) {
  btnRefreshSecretShop.addEventListener("click", () => {
    const level = parseInt(secretShopLevelSelect.value);
    const cost = getSecretRefreshCost(level);
    
    if (state.money < cost) {
      showToast(`💰 餘額不足！刷新貨架需要 ${cost} 金幣。`, "error");
      return;
    }
    
    state.money -= cost;
    rollSecretShop(false);
    renderSecretShop();
    updateUI();
  });
}

// Refresh cost update on selector change
if (secretShopLevelSelect) {
  secretShopLevelSelect.addEventListener("change", () => {
    const level = parseInt(secretShopLevelSelect.value);
    const cost = getSecretRefreshCost(level);
    if (secretRefreshCostText) secretRefreshCostText.textContent = `💰 ${cost}`;
  });
}

// hireHero is replaced by the population system (招募居民 → 轉職)
// This stub is kept for backward compatibility but does nothing dangerous
window.hireHero = function(heroKey) {
  showToast("請透過人力資源面板招募居民，並轉職成英雄！", "info");
};

function getHeroIcon(k) {
  const icons = {
    novice: '👷', warrior:'⚔️', barbarian:'🪓', shieldWarrior:'🛡️',
    rogue:'🗡️', archer:'🏹', gunner:'🔫', fighter:'🥊',
    mage:'🔮', wizard:'📜', priest:'✨', paladin:'🌟', taoist:'☯️', monk:'📿'
  };
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
      window.openEquipModal(index);
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

// Custom Modal for choosing who to equip item to
window.openEquipModal = function(invIndex) {
  const item = state.inventory[invIndex];
  if (!item) return;
  
  const heroParty = state.population.filter(p => p.jobClass !== 'novice');
  if (heroParty.length === 0) {
    showToast("尚未有任何已轉職的英雄可以裝備！", "error");
    return;
  }
  
  if (heroParty.length === 1) {
    equipItem(invIndex, heroParty[0].id);
    return;
  }
  
  const modal = document.getElementById("equipModal");
  const itemNameEl = document.getElementById("equipItemName");
  const listEl = document.getElementById("equipChoicesList");
  
  if (!modal || !itemNameEl || !listEl) return;
  
  itemNameEl.textContent = `裝備：${item.name} (${gameConfig.eqSpecs.rarities[item.rarity].name})`;
  listEl.innerHTML = "";
  
  heroParty.forEach(p => {
    const btn = document.createElement("button");
    btn.className = "build-btn";
    btn.style.display = "flex";
    btn.style.justifyContent = "space-between";
    btn.style.alignItems = "center";
    btn.style.padding = "0.75rem 1rem";
    btn.style.width = "100%";
    
    const icon = getHeroIcon(p.jobClass);
    btn.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <span style="font-size:1.5rem;">${icon}</span>
        <div style="text-align:left;">
          <div style="font-weight:bold; color:#f8fafc;">${p.name}</div>
          <div style="font-size:0.75rem; color:#94a3b8;">${gameConfig.heroes[p.jobClass].name} (Lv.${p.level})</div>
        </div>
      </div>
      <span style="font-size:0.8rem; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); padding:0.2rem 0.5rem; border-radius:6px; color:#e2e8f0;">選擇</span>
    `;
    
    btn.onclick = () => {
      equipItem(invIndex, p.id);
      modal.style.display = "none";
    };
    listEl.appendChild(btn);
  });
  
  modal.style.display = "flex";
};

// equipItem now takes personId (UUID from state.population) not heroKey
window.equipItem = function(invIndex, personId) {
  const item = state.inventory[invIndex];
  const person = state.population.find(p => p.id === personId);
  if (!person) {
    showToast("❌ 找不到目標英雄！", "error");
    return;
  }
  const oldItem = person.eq[item.slot];
  
  // Equip
  person.eq[item.slot] = item;
  state.inventory.splice(invIndex, 1); // remove from inv
  
  // Return old to inv
  if (oldItem) {
    state.inventory.push(oldItem);
  }
  
  const className = gameConfig.heroes[person.jobClass]?.name || person.jobClass;
  showToast(`🛡️ ${person.name} (${className}) 裝備了 [${item.name}]`, "success");
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
      
      const isFocused = combatState.focusedHeroId === p.id;
      unit.className = `combat-unit ${isFocused ? 'focused-hero' : ''}`;
      unit.id = `unit-${p.id}`;
      unit.style.cursor = p.hp > 0 ? "pointer" : "not-allowed";
      
      // Initialize combat temp stats if not present
      if (typeof p.hp === 'undefined') { p.hp = effStats.maxHp; }
      if (typeof p.mp === 'undefined') { p.mp = effStats.maxMp; }
      // Ensure HP isn't over max due to unequip
      p.hp = Math.min(p.hp, effStats.maxHp);
      p.mp = Math.min(p.mp, effStats.maxMp);

      unit.innerHTML = `
        ${isFocused ? '<span class="combat-focus-badge" title="正在控制此英雄施展手勢法術">🎯</span>' : ''}
        <div class="unit-header">
          <span class="unit-name" style="${isFocused ? 'color:#facc15; font-weight:bold;' : ''}">${p.name} Lv.<span id="b-${p.id}-lv">${p.level}</span></span>
        </div>
        <div class="stat-bars">
          <div class="bar-wrapper"><div class="bar-fill bg-hp" id="b-${p.id}-hp-bar" style="width:${(p.hp/effStats.maxHp)*100}%"></div><span class="bar-text" id="b-${p.id}-hp-val">${Math.floor(p.hp)}/${effStats.maxHp}</span></div>
          <div class="bar-wrapper"><div class="bar-fill bg-mp" id="b-${p.id}-mp-bar" style="width:${(p.mp/effStats.maxMp)*100}%"></div><span class="bar-text" id="b-${p.id}-mp-val">${Math.floor(p.mp)}/${effStats.maxMp}</span></div>
          <div class="bar-wrapper atb-wrapper"><div class="bar-fill bg-atb" id="b-${p.id}-atb-bar" style="width:0%"></div></div>
        </div>
      `;
      
      // Handle clicking to focus this hero for spellcasting
      unit.onclick = () => {
        if (p.hp <= 0) {
          showToast("❌ 無法控制已倒下的英雄！", "error");
          return;
        }
        combatState.focusedHeroId = p.id;
        showToast(`🎯 戰術指示：全力輔助【${p.name}】進行詠唱！`, "info");
        updateHeroSheets(); // Redraw to reflect the focused ring immediately!
      };

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
  party: [], // keys like "warrior", "mage"
  focusedHeroId: null // UID of the hero targeted/controlled by user
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
document.getElementById("btnQuestHunt")?.addEventListener("click", () => {
  const huntSelectRow = document.getElementById("huntSelectRow");
  if (huntSelectRow.style.display === "none") {
    huntSelectRow.style.display = "block";
    // Close boss row to avoid clutter
    const bossSelectRow = document.getElementById("bossSelectRow");
    if (bossSelectRow) bossSelectRow.style.display = "none";
    showToast("⚔️ 選擇討伐等級後，再次點擊確認出征！", "info");
  } else {
    startQuest("hunt");
  }
});

document.getElementById("btnQuestBoss")?.addEventListener("click", () => {
  // Close hunt row to keep UI tidy, and launch boss battle immediately
  const huntSelectRow = document.getElementById("huntSelectRow");
  if (huntSelectRow) huntSelectRow.style.display = "none";
  startQuest("boss");
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
  
  // Read user selected hunt level
  const huntLvlEl = document.getElementById("targetHuntLevel");
  combatState.huntLevel = huntLvlEl ? parseInt(huntLvlEl.value) : 1;

  combatState.party = combatParty.map(p => p.id);
  
  // Reset dynamic fight parameters for the selected party
  combatParty.forEach(p => {
    const eff = calcEffStats(p);
    p.hp = eff.maxHp;
    p.mp = eff.maxMp;
    p.atb = 0;
  });
  
  // Auto-select the first hero in combat party as default spell caster focus
  combatState.focusedHeroId = combatParty[0].id;
  
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
  
  // --- 🏥 Hospital System Check ---
  // Any hero with HP <= 0 is automatically hospitalized and removed from assignment!
  const combatParty = state.population.filter(p => combatState.party.includes(p.id));
  combatParty.forEach(p => {
    if (p.hp <= 0) {
      p.assignment = "hospital";
      logBattle(`🏥 急診警告：英雄【${p.name}】重傷倒地，已由野戰擔架送往醫院搶救！`, "log-item-dmg");
    }
  });
  
  const btnQuestHunt = document.getElementById("btnQuestHunt");
  if (btnQuestHunt) btnQuestHunt.disabled = false;
  const btnQuestBoss = document.getElementById("btnQuestBoss");
  if (btnQuestBoss) btnQuestBoss.disabled = false;
  const btnQuestRetreat = document.getElementById("btnQuestRetreat");
  if (btnQuestRetreat) btnQuestRetreat.disabled = true;
  
  // Hide selections
  const huntSelectRow = document.getElementById("huntSelectRow");
  if (huntSelectRow) huntSelectRow.style.display = "none";
  const bossSelectRow = document.getElementById("bossSelectRow");
  if (bossSelectRow) bossSelectRow.style.display = "none";

  skillDock.style.display = "none";
  
  const enemyGroup = document.getElementById("enemyGroup");
  if (enemyGroup) enemyGroup.innerHTML = '<div class="combat-unit"><div class="unit-header"><span class="unit-name">已撤退</span></div><div class="enemy-avatar">❔</div></div>';
  
  logBattle("🏳️ 戰略性撤離，部隊返回營地安整。");
  updateUI();
}


function spawnEnemy() {
  let avgLvl = 1;
  if (combatState.target === "hunt") {
    avgLvl = combatState.huntLevel || 1; // Use the manual player selected level!
  } else {
    // For boss battles, still auto-scale to average level of party
    let total = 0;
    const combatParty = state.population.filter(p => combatState.party.includes(p.id));
    combatParty.forEach(p => total += p.level);
    if(combatParty.length > 0) avgLvl = Math.ceil(total / combatParty.length);
  }

  const diffCfg = DIFFICULTY_MULTIPLIERS[state.difficulty || 'normal'] || DIFFICULTY_MULTIPLIERS.normal;

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
      const eId = `enemy-${i}`;
      const finalHp = Math.floor(mobCfg.base.hp * scale * diffCfg.enemyHp);
      
      combatState.enemies.push({
        id: eId,
        name: `Lv.${avgLvl} ${mobData.name}`,
        avatar: mobData.avatar,
        hp: finalHp,
        maxHp: finalHp,
        atk: Math.floor(mobCfg.base.atk * scale * diffCfg.enemyAtk),
        def: Math.floor(mobCfg.base.def * scale),
        matk: Math.floor(mobCfg.base.matk * scale),
        mdef: Math.floor(mobCfg.base.mdef * scale),
        spd: mobCfg.base.spd + (avgLvl * mobCfg.scaling.spdPerLvl),
        atb: 0,
        rewardExp: Math.floor((mobCfg.scaling.rewardExpBase * avgLvl / mobCount) * diffCfg.expMoneyMod),
        rewardMoney: Math.floor((mobCfg.scaling.rewardMoneyBase * avgLvl / mobCount) * diffCfg.expMoneyMod),
        isBoss: false
      });
    }
  } else {
    // Spawn multiple Bosses sequentially matching current state.bossLevel (1 to 3)
    const bLevel = state.bossLevel || 1;
    const roster = [
      { key: "greed", id: "enemy-boss-greed" },
      { key: "anger", id: "enemy-boss-anger" },
      { key: "ignorance", id: "enemy-boss-ignorance" }
    ];
    
    const count = Math.min(3, bLevel);
    for (let i = 0; i < count; i++) {
      const bType = roster[i].key;
      const bossCfg = gameConfig.combat.bosses[bType];
      if (bossCfg) {
        const finalBoss = JSON.parse(JSON.stringify(bossCfg));
        finalBoss.hp = Math.floor(finalBoss.hp * diffCfg.enemyHp);
        finalBoss.maxHp = Math.floor(finalBoss.maxHp * diffCfg.enemyHp);
        finalBoss.atk = Math.floor(finalBoss.atk * diffCfg.enemyAtk);
        if (finalBoss.rewardExp) finalBoss.rewardExp = Math.floor(finalBoss.rewardExp * diffCfg.expMoneyMod);
        if (finalBoss.rewardMoney) finalBoss.rewardMoney = Math.floor(finalBoss.rewardMoney * diffCfg.expMoneyMod);
        
        combatState.enemies.push({
          ...finalBoss,
          id: roster[i].id,
          atb: 0,
          isBoss: true
        });
      }
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
  
  // If the user-focused hero died, automatically shift control to the next alive hero
  if (target.id === combatState.focusedHeroId && target.hp <= 0) {
    const remainingAlive = alive.filter(p => p.id !== target.id);
    if (remainingAlive.length > 0) {
      combatState.focusedHeroId = remainingAlive[0].id;
      logBattle(`📣【戰場廣播】對焦英雄【${target.name}】不幸倒地！詠唱輔助轉移至【${remainingAlive[0].name}】！`, "log-item-atb");
      updateHeroSheets();
    } else {
      combatState.focusedHeroId = null;
    }
  }
  
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
    const moneyCap = gameConfig.economy.baseMoneyCap + (state.buildings.bank * gameConfig.economy.bankMoneyBonus);
    if (state.money > moneyCap) state.money = moneyCap;
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
      
      // Sequential Level Unlock: If current boss level is defeated, advance it!
      const prevLevel = state.bossLevel || 1;
      if (state.bossLevel < 3) {
        state.bossLevel++;
        showToast(`🏆 討伐成就解鎖！下一階段挑戰已擴增至 Lv.${state.bossLevel}！`, "success");
      } else {
        showToast("🏆 你已成功擊破終極試煉所有巨獸！城鎮的英雄們載歌載舞！", "success");
      }
      
      // Flag matching boss keys as defeated based on previous level
      const bossMap = ["greed", "anger", "ignorance"];
      for (let i = 0; i < Math.min(3, prevLevel); i++) {
        const bName = bossMap[i];
        if (bName) {
          state.bossInvasions[bName + 'Defeated'] = true;
          delete state.bossInvasions[bName]; // Stop active invasion timer
        }
      }
      
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
  
  // Heroes — use state.population lookup by id (state.heroes no longer exists)
  combatState.party.forEach(pid => {
    const hero = state.population.find(p => p.id === pid);
    if (!hero) return;
    const eff = calcEffStats(hero);
    if (!eff) return;
    
    const hpPct = Math.max(0, (hero.hp / eff.maxHp) * 100);
    const mpPct = Math.max(0, (hero.mp / eff.maxMp) * 100);
    const atbPct = hero.atb || 0;
    
    const lvEl = document.getElementById(`b-${pid}-lv`);
    const hpBarEl = document.getElementById(`b-${pid}-hp-bar`);
    const hpValEl = document.getElementById(`b-${pid}-hp-val`);
    const mpBarEl = document.getElementById(`b-${pid}-mp-bar`);
    const mpValEl = document.getElementById(`b-${pid}-mp-val`);
    const atbBarEl = document.getElementById(`b-${pid}-atb-bar`);
    
    if(lvEl) lvEl.textContent = hero.level;
    if(hpBarEl) hpBarEl.style.width = `${hpPct}%`;
    if(hpValEl) hpValEl.textContent = `${Math.floor(hero.hp)}/${eff.maxHp}`;
    if(mpBarEl) mpBarEl.style.width = `${mpPct}%`;
    if(mpValEl) mpValEl.textContent = `${Math.floor(hero.mp)}/${eff.maxMp}`;
    if(atbBarEl) atbBarEl.style.width = `${atbPct}%`;
  });
}

// Initialize background engine loop
setInterval(gameTick, 1000);

// Auto-load save on startup (silently, no toast)
(function initLoad() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { 
      updateUI(); 
      const modal = document.getElementById("difficultyModal");
      if (modal) modal.style.display = "flex";
      return; 
    }
    // Reuse robust applySaveData with deep recursive schema migration!
    applySaveData(raw);
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

btnTechHuntLv4?.addEventListener("click", () => {
  if (state.tech.huntLv4) return;
  const tCfg = gameConfig.combat.tech.huntLv4;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.tech.huntLv4 = true;
    spawnFloatingText("🎓 戰場開拓 I 已研發!", "#60a5fa");
    showToast("⚔️ 解鎖【戰場開拓 I】！討伐上限開放至 Lv.6！", "success");
    updateLevelSelectors();
    updateUI();
  } else {
    showToast("❌ 研究知識或金幣不足！", "error");
  }
});

btnTechHuntLv7?.addEventListener("click", () => {
  if (state.tech.huntLv7 || !state.tech.huntLv4) return;
  const tCfg = gameConfig.combat.tech.huntLv7;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.tech.huntLv7 = true;
    spawnFloatingText("🎓 戰場開拓 II 已研發!", "#60a5fa");
    showToast("🔥 解鎖【戰場開拓 II】！討伐等級上限完美開放至 Lv.10！", "success");
    updateLevelSelectors();
    updateUI();
  } else {
    showToast("❌ 研究知識或金幣不足！", "error");
  }
});

btnTechSecretLv4?.addEventListener("click", () => {
  if (state.tech.secretLv4) return;
  const tCfg = gameConfig.combat.tech.secretLv4;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.tech.secretLv4 = true;
    spawnFloatingText("🎓 神秘特許證 I 已研發!", "#60a5fa");
    showToast("🔮 解鎖【神秘特許證 I】！神秘商店貨架等級擴充至 Lv.5！", "success");
    updateLevelSelectors();
    updateUI();
  } else {
    showToast("❌ 研究知識或金幣不足！", "error");
  }
});

btnTechSecretLv7?.addEventListener("click", () => {
  if (state.tech.secretLv7 || !state.tech.secretLv4) return;
  const tCfg = gameConfig.combat.tech.secretLv7;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.tech.secretLv7 = true;
    spawnFloatingText("🎓 神秘特許證 II 已研發!", "#60a5fa");
    showToast("👑 解鎖【神秘特許證 II】！神秘商店終極貨架等級全開至 Lv.7！", "success");
    updateLevelSelectors();
    updateUI();
  } else {
    showToast("❌ 研究知識或金幣不足！", "error");
  }
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
      }, { once: true });
    } catch (err) {
      console.error("Camera Error:", err);
      statusText.innerText = "相機存取錯誤";
      webcamRunning = false;
    }
  }
});

// ==========================================
// 3. Gesture Classification & Chanting Engine
// ==========================================

let lastVideoTime = -1;
let results = undefined;

let chantState = {
  skill1: 0, // index shake
  skill2: 0, // scissors shake
  skill3: 0, // scissor-rock alternate
  skill4: 0, // rock-paper alternate
  
  s1LastX: null,
  s1Direction: 0, // 0: idle, -1: left, 1: right
  
  s2LastX: null,
  s2Direction: 0,
  
  s3LastGesture: null,
  s4LastGesture: null,
  
  lastUpdateTime: Date.now()
};

const SHAKE_DIST_THRESHOLD = 0.04; // Normalized distance trigger (~25px on 640 width)

function resetChantState() {
  chantState.skill1 = 0;
  chantState.skill2 = 0;
  chantState.skill3 = 0;
  chantState.skill4 = 0;
  chantState.s1LastX = null;
  chantState.s1Direction = 0;
  chantState.s2LastX = null;
  chantState.s2Direction = 0;
  chantState.s3LastGesture = null;
  chantState.s4LastGesture = null;
}

function classifyHand(landmarks) {
  // Compare fingertips (Tip.y) to the knuckle joints (PIP.y)
  // Image top is Y=0, bottom is Y=1. Finger extended = Tip.y < PIP.y.
  const indexExtended = landmarks[8].y < landmarks[6].y;
  const middleExtended = landmarks[12].y < landmarks[10].y;
  const ringExtended = landmarks[16].y < landmarks[14].y;
  const pinkyExtended = landmarks[20].y < landmarks[18].y;

  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return "INDEX";
  } else if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    return "SCISSORS";
  } else if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return "ROCK";
  } else if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return "PAPER";
  }
  return "OTHER";
}

// Core Spell Chanting Processor
function processHandSpell(landmarks) {
  const gesture = classifyHand(landmarks);
  const wristX = landmarks[0].x; // Track movement centering around the wrist x position
  
  chantState.lastUpdateTime = Date.now();

  if (gesture === "INDEX") {
    // 1. Track Index Shake
    if (chantState.s1LastX === null) {
      chantState.s1LastX = wristX;
    } else {
      const diff = wristX - chantState.s1LastX;
      if (chantState.s1Direction === 0) {
        if (Math.abs(diff) > SHAKE_DIST_THRESHOLD) {
          chantState.s1Direction = diff > 0 ? 1 : -1;
          chantState.skill1++;
          chantState.s1LastX = wristX;
        }
      } else if (chantState.s1Direction === 1 && diff < -SHAKE_DIST_THRESHOLD) {
        chantState.s1Direction = -1;
        chantState.skill1++;
        chantState.s1LastX = wristX;
      } else if (chantState.s1Direction === -1 && diff > SHAKE_DIST_THRESHOLD) {
        chantState.s1Direction = 1;
        chantState.skill1++;
        chantState.s1LastX = wristX;
      }
    }
    
    // Reset unrelated chanting processes
    chantState.skill2 = 0; chantState.skill3 = 0; chantState.skill4 = 0;
    chantState.s2LastX = null; chantState.s2Direction = 0;
    chantState.s3LastGesture = null; chantState.s4LastGesture = null;
    
  } else if (gesture === "SCISSORS") {
    // 2. Track Scissors Shake
    if (chantState.s2LastX === null) {
      chantState.s2LastX = wristX;
    } else {
      const diff = wristX - chantState.s2LastX;
      if (chantState.s2Direction === 0) {
        if (Math.abs(diff) > SHAKE_DIST_THRESHOLD) {
          chantState.s2Direction = diff > 0 ? 1 : -1;
          chantState.skill2++;
          chantState.s2LastX = wristX;
        }
      } else if (chantState.s2Direction === 1 && diff < -SHAKE_DIST_THRESHOLD) {
        chantState.s2Direction = -1;
        chantState.skill2++;
        chantState.s2LastX = wristX;
      } else if (chantState.s2Direction === -1 && diff > SHAKE_DIST_THRESHOLD) {
        chantState.s2Direction = 1;
        chantState.skill2++;
        chantState.s2LastX = wristX;
      }
    }
    
    // 3. Track Scissors ↔ Rock Alternate
    if (chantState.s3LastGesture === null) {
      chantState.s3LastGesture = "SCISSORS";
    } else if (chantState.s3LastGesture === "ROCK") {
      chantState.s3LastGesture = "SCISSORS";
      chantState.skill3++;
    }
    
    // Reset incompatible systems
    chantState.skill1 = 0; chantState.skill4 = 0;
    chantState.s1LastX = null; chantState.s1Direction = 0;
    chantState.s4LastGesture = null;
    
  } else if (gesture === "ROCK") {
    // 3. Track Scissors ↔ Rock Alternate
    if (chantState.s3LastGesture === null) {
      chantState.s3LastGesture = "ROCK";
    } else if (chantState.s3LastGesture === "SCISSORS") {
      chantState.s3LastGesture = "ROCK";
      chantState.skill3++;
    }
    
    // 4. Track Rock ↔ Paper Alternate
    if (chantState.s4LastGesture === null) {
      chantState.s4LastGesture = "ROCK";
    } else if (chantState.s4LastGesture === "PAPER") {
      chantState.s4LastGesture = "ROCK";
      chantState.skill4++;
    }
    
    // Reset incompatible
    chantState.skill1 = 0; chantState.skill2 = 0;
    chantState.s1LastX = null; chantState.s1Direction = 0;
    chantState.s2LastX = null; chantState.s2Direction = 0;
    
  } else if (gesture === "PAPER") {
    // 4. Track Rock ↔ Paper Alternate
    if (chantState.s4LastGesture === null) {
      chantState.s4LastGesture = "PAPER";
    } else if (chantState.s4LastGesture === "ROCK") {
      chantState.s4LastGesture = "PAPER";
      chantState.skill4++;
    }
    
    // Reset incompatible
    chantState.skill1 = 0; chantState.skill2 = 0; chantState.skill3 = 0;
    chantState.s1LastX = null; chantState.s1Direction = 0;
    chantState.s2LastX = null; chantState.s2Direction = 0;
    chantState.s3LastGesture = null;
  } else {
    // Unrecognized gesture (OTHER) - optionally slightly decays but we let the 2s stale timer handle full resets.
  }
  
  // Spell Activation Phase!
  if (chantState.skill1 >= 3) {
    castSkill1();
    resetChantState();
  } else if (chantState.skill2 >= 4) {
    castSkill2();
    resetChantState();
  } else if (chantState.skill3 >= 4) {
    castSkill3();
    resetChantState();
  } else if (chantState.skill4 >= 6) {
    castSkill4();
    resetChantState();
  }

  updateChantUI();
}

// ==========================================
// 4. Spell Executions & Hero-Guided Magic
// ==========================================
function getCastingHero() {
  if (!combatState.active) return null;
  
  // 1. Try to get the hero focused by user
  let caster = state.population.find(p => p.id === combatState.focusedHeroId);
  
  // 2. Fallback if caster is dead, missing, or not currently assigned to fight
  if (!caster || caster.hp <= 0 || caster.assignment !== 'combat') {
    const combatParty = state.population.filter(p => combatState.party.includes(p.id));
    const alive = combatParty.filter(p => p.hp > 0);
    if (alive.length > 0) {
      combatState.focusedHeroId = alive[0].id;
      caster = alive[0];
      updateHeroSheets(); // Redraw layout to auto-select valid fallback
    } else {
      return null; // Everyone's dead!
    }
  }
  return caster;
}

function castSkill1() {
  const caster = getCastingHero();
  if (!caster) {
    showToast("⚠️ 元素聚集完成！但隊伍中已無人能引導回復法術。", "info");
    return;
  }
  
  const eff = calcEffStats(caster);
  const healPercent = 0.25; // 25% Max HP
  const bonusHeal = Math.floor(eff.matk * 2); // Faith multiplier
  
  const combatParty = state.population.filter(p => combatState.party.includes(p.id));
  
  logBattle(`✨【休息恢復】發動！【${caster.name}】雙手結印詠唱，降下溫暖的治癒雨！`, "log-item-heal");
  
  combatParty.forEach(p => {
    const targetEff = calcEffStats(p);
    if (p.hp > 0) {
      const heal = Math.floor(targetEff.maxHp * healPercent) + bonusHeal;
      p.hp = Math.min(targetEff.maxHp, p.hp + heal);
      logBattle(`💚 治癒雨滋潤 ${p.name}，回復了 <b class="log-item-heal">${heal}</b> HP！`, "log-item-heal");
    }
  });
  
  updateCombatBars();
  spawnFloatingText(`✨【${caster.name}】引導恢復！`, "#10b981");
}

function castSkill2() {
  const caster = getCastingHero();
  if (!caster || !combatState.enemies) {
    showToast("⚠️ 魔能匯聚完成！無施法主體或目標，釋放失敗。", "info");
    return;
  }
  
  const aliveEnemies = combatState.enemies.filter(e => e.hp > 0);
  if (aliveEnemies.length === 0) return;
  
  const eff = calcEffStats(caster);
  const dmg = 50 + Math.floor(eff.matk * 1.5);
  
  logBattle(`⚡【魔彈連射】！【${caster.name}】高舉法器，無數奧術光彈射向全場敵軍！`, "log-item-dmg");
  
  aliveEnemies.forEach(e => {
    e.hp = Math.max(0, e.hp - dmg);
    logBattle(`💥 奧術魔彈轟中 ${e.name}，造成 <b class="log-item-dmg">${dmg}</b> 魔法傷害！`, "log-item-dmg");
  });
  
  spawnFloatingText(`⚡【${caster.name}】魔彈連射！`, "#60a5fa");
  checkBattleResolution();
  updateCombatBars();
}

function castSkill3() {
  const caster = getCastingHero();
  if (!caster || !combatState.enemies) {
    showToast("⚠️ 火元素匯集完畢！可惜目前沒有主體可以發射轟擊。", "info");
    return;
  }
  
  const aliveEnemies = combatState.enemies.filter(e => e.hp > 0);
  if (aliveEnemies.length === 0) return;
  
  const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
  const eff = calcEffStats(caster);
  const dmg = 180 + Math.floor(eff.matk * 4); // Heavy single target ratio
  
  logBattle(`🔥【烈焰轟擊】！【${caster.name}】吟誦爆裂咒文，召喚巨型烈焰球！`, "log-item-dmg");
  target.hp = Math.max(0, target.hp - dmg);
  
  logBattle(`☄️ 巨大烈焰火球吞噬 ${target.name}，造成爆裂 <b class="log-item-dmg">${dmg}</b> 傷害！`, "log-item-dmg");
  
  spawnFloatingText(`🔥【${caster.name}】烈焰轟擊！`, "#f97316");
  checkBattleResolution();
  updateCombatBars();
}

function castSkill4() {
  const caster = getCastingHero();
  if (!caster || !combatState.enemies) {
    showToast("⚠️ 蒼穹天譴詠唱完畢！但無引導主體，星辰光輝消逝。", "info");
    return;
  }
  
  const aliveEnemies = combatState.enemies.filter(e => e.hp > 0);
  if (aliveEnemies.length === 0) return;
  
  const eff = calcEffStats(caster);
  const dmg = 500 + Math.floor(eff.matk * 12); // Ultimate nuke scaling
  
  logBattle(`🌌🌌【終極大招 · 蒼穹天譴】！【${caster.name}】開啟靈能界線，召喚墜落的古老星辰！`, "log-item-buff");
  
  aliveEnemies.forEach(e => {
    e.hp = Math.max(0, e.hp - dmg);
    logBattle(`☄️ 宇宙天體砸扁 ${e.name}，造成毀滅性 <b style="color:#ef4444; font-weight:800;">${dmg}</b> 真實傷害！`, "log-item-dmg");
  });
  
  spawnFloatingText(`🌌【${caster.name}】蒼穹天譴！`, "#ef4444");
  checkBattleResolution();
  updateCombatBars();
}


// ==========================================
// 5. UI Rendering & Sync
// ==========================================
function initSkillGrid() {
  const grid = document.getElementById("gestureSkillGrid");
  if (!grid) return;
  grid.innerHTML = `
    <div class="skill-chant-item" id="chant-skill-1">
      <div class="chant-info">
        <span class="chant-name">🛡️ 回復 (食指晃x3)</span>
        <span class="chant-count" id="chant-val-1">0/3</span>
      </div>
      <div class="chant-bar-wrapper"><div class="chant-bar-fill" id="chant-bar-1" style="width:0%"></div></div>
    </div>
    <div class="skill-chant-item" id="chant-skill-2">
      <div class="chant-info">
        <span class="chant-name">⚡ 魔彈 (剪刀晃x4)</span>
        <span class="chant-count" id="chant-val-2">0/4</span>
      </div>
      <div class="chant-bar-wrapper"><div class="chant-bar-fill" id="chant-bar-2" style="width:0%"></div></div>
    </div>
    <div class="skill-chant-item" id="chant-skill-3">
      <div class="chant-info">
        <span class="chant-name">🔥 烈焰 (剪刀↔拳x4)</span>
        <span class="chant-count" id="chant-val-3">0/4</span>
      </div>
      <div class="chant-bar-wrapper"><div class="chant-bar-fill" id="chant-bar-3" style="width:0%"></div></div>
    </div>
    <div class="skill-chant-item" id="chant-skill-4">
      <div class="chant-info">
        <span class="chant-name">💥 天譴 (拳↔布x6)</span>
        <span class="chant-count" id="chant-val-4">0/6</span>
      </div>
      <div class="chant-bar-wrapper"><div class="chant-bar-fill" id="chant-bar-4" style="width:0%"></div></div>
    </div>
  `;
}

function updateChantUI() {
  const fill1 = document.getElementById("chant-bar-1");
  const val1 = document.getElementById("chant-val-1");
  const fill2 = document.getElementById("chant-bar-2");
  const val2 = document.getElementById("chant-val-2");
  const fill3 = document.getElementById("chant-bar-3");
  const val3 = document.getElementById("chant-val-3");
  const fill4 = document.getElementById("chant-bar-4");
  const val4 = document.getElementById("chant-val-4");

  if (fill1) fill1.style.width = `${(chantState.skill1 / 3) * 100}%`;
  if (val1) val1.textContent = `${chantState.skill1}/3`;
  const el1 = document.getElementById("chant-skill-1");
  if (el1) el1.classList.toggle("active-chanting", chantState.skill1 > 0);

  if (fill2) fill2.style.width = `${(chantState.skill2 / 4) * 100}%`;
  if (val2) val2.textContent = `${chantState.skill2}/4`;
  const el2 = document.getElementById("chant-skill-2");
  if (el2) el2.classList.toggle("active-chanting", chantState.skill2 > 0);

  if (fill3) fill3.style.width = `${(chantState.skill3 / 4) * 100}%`;
  if (val3) val3.textContent = `${chantState.skill3}/4`;
  const el3 = document.getElementById("chant-skill-3");
  if (el3) el3.classList.toggle("active-chanting", chantState.skill3 > 0);

  if (fill4) fill4.style.width = `${(chantState.skill4 / 6) * 100}%`;
  if (val4) val4.textContent = `${chantState.skill4}/6`;
  const el4 = document.getElementById("chant-skill-4");
  if (el4) el4.classList.toggle("active-chanting", chantState.skill4 > 0);

  // Find global peak progress for AI panel
  const maxProgress = Math.max(
    chantState.skill1 / 3,
    chantState.skill2 / 4,
    chantState.skill3 / 4,
    chantState.skill4 / 6
  );
  
  if (velocityBar) {
    velocityBar.style.width = `${maxProgress * 100}%`;
    if (maxProgress >= 1.0) {
      velocityBar.style.backgroundColor = "#ffffff";
      setTimeout(() => velocityBar.style.backgroundColor = "", 150);
    }
  }
}

// ==========================================
// 6. Render & Visualization Loop
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
    processHandSpell(currentHand);
    drawOverlay(currentHand);
  } else {
    // Stale reset: reset if no hands detected for 2 seconds
    if (Date.now() - chantState.lastUpdateTime > 2000) {
      resetChantState();
      updateChantUI();
    }
  }
  
  requestAnimationFrame(predictLoop);
}

// Init on DOM load
window.addEventListener("DOMContentLoaded", () => {
  updateUI();
  updateLevelSelectors();
  initSkillGrid();
  initMediaPipe();
});

