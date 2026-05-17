import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import gameConfig from "./config.json";
import { EXAM_BANKS } from "./examsConfig.js";

// ==========================================
// 1. Game State & Constants & DOM Management
// ==========================================
const DEFAULT_STATE = {
  _dirtyFlags: { cityGrid: true, popRoster: true, templeRoster: true, heroSheets: true },
  wood: 0,
  stone: 0,
  food: 30,
  metal: 0,
  energy: 0,
  money: 0,
  knowledge: 0,
  mithril: 0,
  workerLimit: 5,
  gatherFocus: 'wood',
  difficulty: 'normal', // easy, normal, hard, nightmare
  cityLayout: {
    maxSlots: 6,
    slots: Array.from({ length: 36 }, () => ({ type: null, level: 1 }))
  },
  population: [], // Array of individual resident objects
  bossInvasions: {
    activationTime: null,
    greedDefeated: false,
    angerDefeated: false,
    ignoranceDefeated: false
  }, 
  tech: {
    heroLicense: false,
    appraisalTech: false,
    huntLv4: false,
    huntLv7: false,
    secretLv4: false,
    secretLv7: false,
    automation: false,
    templeTech: false,
    autoStudyTech: false,
    clickFoodTech: false,
    clickMetalTech: false,
    clickMoneyTech: false,
    doubleClickTech: false
  },
  party: [],
  inventory: [],
  bossLevel: 1,
  secretShop: {
    items: [], // Stores current rack of secret items { item, cost, soldOut }
    lastLevel: 1
  },
  autoSell: {
    normal: false,
    magic: false,
    rare: false,
    epic: false
  }
};

const BUILDING_DATA = {
  cabin: {
    name: "居住房屋",
    desc: "提升可容納工人的上限",
    icon: "🛖",
    levels: [
      { label: "🛖 小木屋", pop: 3, cost: { wood: 25 } },
      { label: "🏡 舒適木房", pop: 8, cost: { wood: 100, stone: 30 } },
      { label: "🏢 現代公寓", pop: 20, cost: { wood: 400, stone: 200, metal: 50 } },
      { label: "🏙️ 高級大樓", pop: 50, cost: { wood: 1200, stone: 600, metal: 200 } },
      { label: "🏰 貴族官邸", pop: 120, cost: { wood: 4000, stone: 2000, metal: 500 } },
      { label: "💒 生態莊園", pop: 300, cost: { wood: 15000, stone: 8000, metal: 2000, money: 500 } },
      { label: "🕋 全息集落", pop: 700, cost: { wood: 50000, stone: 25000, metal: 6000, energy: 100 } },
      { label: "🌆 摩天巨構", pop: 1800, cost: { wood: 200000, stone: 100000, metal: 15000, energy: 300 } },
      { label: "🌍 生態穹頂", pop: 4500, cost: { wood: 800000, stone: 400000, metal: 40000, energy: 1000 } },
      { label: "🛸 星際方舟", pop: 12000, cost: { wood: 3000000, stone: 1500000, metal: 100000, energy: 3000 } }
    ]
  },
  farm: {
    name: "糧食產地",
    desc: "每秒被動生產食物",
    icon: "🌾",
    levels: [
      { label: "🌾 菜園", gen: 0.5, cost: { wood: 30, stone: 15 } },
      { label: "🚜 大型農場", gen: 2.0, cost: { wood: 150, stone: 80 } },
      { label: "🏭 自動水耕艙", gen: 6.0, cost: { stone: 300, metal: 100 } },
      { label: "🌽 生物農場巨蛋", gen: 20.0, cost: { metal: 500, energy: 200 } },
      { label: "🧬 基因培植園", gen: 60.0, cost: { metal: 1500, energy: 400 } },
      { label: "🧪 營養液巨塔", gen: 180.0, cost: { metal: 4000, energy: 1000, money: 1000 } },
      { label: "🌴 生物圈三號", gen: 500.0, cost: { metal: 12000, energy: 2500 } },
      { label: "🥗 分子烹飪網", gen: 1500.0, cost: { metal: 40000, energy: 6000 } },
      { label: "🌀 物質合成器", gen: 4000.0, cost: { metal: 150000, energy: 15000 } },
      { label: "🌟 無限豐饒之泉", gen: 12000.0, cost: { metal: 500000, energy: 40000 } }
    ]
  },
  smelter: {
    name: "礦物熔爐",
    desc: "每秒被動產出金屬材料",
    icon: "🪙",
    levels: [
      { label: "🪙 簡易熔爐", gen: 0.2, cost: { wood: 40, stone: 50 } },
      { label: "🏭 工業煉鐵廠", gen: 0.8, cost: { stone: 200, metal: 50 } },
      { label: "⚡ 高溫等離子爐", gen: 3.0, cost: { metal: 400, energy: 150 } },
      { label: "💥 核融合熔煉爐", gen: 10.0, cost: { metal: 1500, energy: 400 } },
      { label: "🌌 奈米重組儀", gen: 35.0, cost: { metal: 5000, energy: 1000 } },
      { label: "🔮 暗物質凝聚器", gen: 120.0, cost: { metal: 15000, energy: 3000, money: 2000 } },
      { label: "💎 強子粉碎煉製廠", gen: 400.0, cost: { metal: 50000, energy: 8000 } },
      { label: "🧬 分子鏈重構基站", gen: 1200.0, cost: { metal: 180000, energy: 20000 } },
      { label: "☄️ 小行星捕獲冶煉機", gen: 3500.0, cost: { metal: 600000, energy: 50000 } },
      { label: "🪐 星系物質轉換核心", gen: 10000.0, cost: { metal: 2000000, energy: 150000 } }
    ]
  },
  powerPlant: {
    name: "發電廠",
    desc: "每秒被動產生城市運作能源",
    icon: "⚡",
    levels: [
      { label: "⚡ 蒸汽發電機", gen: 0.5, cost: { stone: 80, metal: 20 } },
      { label: "☢️ 風力發電機組", gen: 2.0, cost: { stone: 300, metal: 150 } },
      { label: "⚛️ 核能發電廠", gen: 8.0, cost: { metal: 600, energy: 100 } },
      { label: "🌀 托卡馬克聚變堆", gen: 25.0, cost: { metal: 2000, money: 1000 } },
      { label: "🛰️ 軌道微波電網", gen: 80.0, cost: { metal: 6000, money: 3000 } },
      { label: "🛸 反物質反應爐", gen: 250.0, cost: { metal: 20000, money: 8000 } },
      { label: "☀️ 戴森雲接收器", gen: 800.0, cost: { metal: 80000, money: 25000 } },
      { label: "💫 奇點引力電站", gen: 2500.0, cost: { metal: 250000, money: 80000 } },
      { label: "🌌 宇宙微波背景發電", gen: 7000.0, cost: { metal: 800000, money: 250000 } },
      { label: "🎇 全維度真空提取極", gen: 20000.0, cost: { metal: 2500000, money: 800000 } }
    ]
  },
  warehouse: {
    name: "資源倉庫",
    desc: "提升 木/石/食/金屬 的最大儲存量",
    icon: "📦",
    levels: [
      { label: "📦 臨時儲藏點", cap: 100, cost: { wood: 50, stone: 30 } },
      { label: "🏭 鋼鐵貨倉", cap: 400, cost: { wood: 200, stone: 150, metal: 50 } },
      { label: "🏦 自動化物流中心", cap: 1500, cost: { stone: 600, metal: 300 } },
      { label: "🏬 全息壓縮貨櫃園", cap: 5000, cost: { stone: 2000, metal: 1000, energy: 200 } },
      { label: "🌌 超維度收納區", cap: 20000, cost: { metal: 4000, energy: 600 } },
      { label: "🛰️ 地球軌道貨倉系統", cap: 80000, cost: { metal: 15000, energy: 2000 } },
      { label: "🪐 太空電梯終端站", cap: 300000, cost: { metal: 50000, energy: 6000 } },
      { label: "💫 空間摺疊收容所", cap: 1200000, cost: { metal: 180000, energy: 20000 } },
      { label: "🌀 微型奇點倉庫", cap: 5000000, cost: { metal: 600000, energy: 60000 } },
      { label: "🌌 無限空間口袋", cap: 20000000, cost: { metal: 2000000, energy: 200000 } }
    ]
  },
  battery: {
    name: "能源電網",
    desc: "提升 能源 的最大儲備量",
    icon: "🔋",
    levels: [
      { label: "🔋 小型蓄電池組", cap: 50, cost: { stone: 60, metal: 40 } },
      { label: "📡 電流控制中心", cap: 200, cost: { stone: 200, metal: 150 } },
      { label: "🛰️ 超導網格節點", cap: 800, cost: { metal: 500, energy: 200 } },
      { label: "💠 電漿儲能容器", cap: 3000, cost: { metal: 1500, money: 800 } },
      { label: "💫 零點能存儲器", cap: 12000, cost: { metal: 5000, energy: 1000 } },
      { label: "🌌 強磁單極阱", cap: 50000, cost: { metal: 15000, energy: 3000 } },
      { label: "⚛️ 量子能階蓄電池", cap: 200000, cost: { metal: 50000, energy: 8000 } },
      { label: "💥 亞原子儲能矩陣", cap: 800000, cost: { metal: 180000, energy: 25000 } },
      { label: "💫 時空曲率電網", cap: 3000000, cost: { metal: 600000, energy: 80000 } },
      { label: "🎆 多維熱力學儲能環", cap: 12000000, cost: { metal: 2000000, energy: 250000 } }
    ]
  },
  bank: {
    name: "城鎮銀行",
    desc: "擴大金幣儲存上限，並產生利息收入",
    icon: "🏦",
    levels: [
      { label: "🏦 城鎮金庫", cap: 1000, gen: 0.5, cost: { stone: 60, metal: 30 } },
      { label: "🏛️ 中央銀行", cap: 8000, gen: 3.0, cost: { stone: 300, metal: 150 } },
      { label: "💎 皇家金融總部", cap: 50000, gen: 15.0, cost: { metal: 600, energy: 100 } },
      { label: "🏢 跨國投資財團", cap: 250000, gen: 60.0, cost: { metal: 2000, energy: 400 } },
      { label: "🌍 全球期貨交易所", cap: 1000000, gen: 250.0, cost: { metal: 8000, energy: 1500 } },
      { label: "📊 全息高頻交易中心", cap: 4000000, gen: 1000.0, cost: { metal: 30000, energy: 5000 } },
      { label: "💳 行星信用儲蓄體", cap: 15000000, gen: 3500.0, cost: { metal: 100000, energy: 15000 } },
      { label: "🌟 聯邦鑄幣總局", cap: 60000000, gen: 12000.0, cost: { metal: 350000, energy: 40000 } },
      { label: "🪙 宇宙金融主網", cap: 250000000, gen: 40000.0, cost: { metal: 1200000, energy: 120000 } },
      { label: "👑 終極造物財閥總部", cap: 1000000000, gen: 150000.0, cost: { metal: 4000000, energy: 400000 } }
    ]
  },
  school: {
    name: "學術機構",
    desc: "解鎖更高等的學院研究科技並加速產能",
    icon: "📚",
    levels: [
      { label: "📚 地方學堂", mult: 1, gen: 0.1, cost: { wood: 80, stone: 60, energy: 20 } },
      { label: "🏛️ 綜合學院", mult: 2, gen: 0.5, cost: { wood: 300, stone: 200, metal: 100 } },
      { label: "🎓 國立研究大學", mult: 3, gen: 2.0, cost: { stone: 800, metal: 400, energy: 200 } },
      { label: "🧬 皇家先進研究所", mult: 4, gen: 6.0, cost: { stone: 3000, metal: 1500, energy: 500 } },
      { label: "🔮 高能物理實驗室", mult: 5, gen: 20.0, cost: { metal: 6000, energy: 1500, money: 5000 } },
      { label: "🧠 全息智庫中心", mult: 6, gen: 65.0, cost: { metal: 20000, energy: 4000, money: 15000 } },
      { label: "🌀 重大基建算力矩陣", mult: 7, gen: 220.0, cost: { metal: 80000, energy: 10000, money: 50000 } },
      { label: "🌌 行星級智慧核心", mult: 8, gen: 800.0, cost: { metal: 300000, energy: 30000, money: 200000 } },
      { label: "🧠 宇宙神經學習網路", mult: 9, gen: 3000.0, cost: { metal: 1000000, energy: 80000, money: 800000 } },
      { label: "🌟 歐米茄全知學社", mult: 10, gen: 12000.0, cost: { metal: 3500000, energy: 250000, money: 3000000 } }
    ]
  },
  autoWood: {
    name: "自動伐木機",
    desc: "全自動高效伐木工廠，每秒消耗電力產生巨量木頭",
    icon: "⚙️",
    levels: [
      { label: "⚙️ 自動伐木 Mk-I", autoGen: 5, energyCost: 0.5, cost: { money: 100, wood: 100 } },
      { label: "⚙️ 自動伐木 Mk-II", autoGen: 15, energyCost: 1.5, cost: { money: 400, wood: 400, metal: 100 } },
      { label: "⚙️ 自動伐木 Mk-III", autoGen: 45, energyCost: 4.0, cost: { money: 1500, wood: 1500, metal: 500 } },
      { label: "⚙️ 雷射割木機群", autoGen: 150, energyCost: 12.0, cost: { money: 5000, metal: 2000, energy: 500 } },
      { label: "⚙️ 奈米砍伐陣列", autoGen: 500, energyCost: 35.0, cost: { money: 20000, metal: 8000, energy: 1500 } },
      { label: "⚙️ 全息樹木合成器", autoGen: 1600, energyCost: 100.0, cost: { money: 80000, metal: 30000, energy: 5000 } },
      { label: "⚙️ 時空軌道收割槍", autoGen: 5000, energyCost: 300.0, cost: { money: 300000, metal: 100000, energy: 15000 } },
      { label: "⚙️ 物質轉寫伐木艙", autoGen: 15000, energyCost: 900.0, cost: { money: 1200000, metal: 400000, energy: 45000 } },
      { label: "⚙️ 多維度植披收存儀", autoGen: 45000, energyCost: 2500.0, cost: { money: 5000000, metal: 1500000, energy: 120000 } },
      { label: "⚙️ 根源木元素萃取極", autoGen: 150000, energyCost: 8000.0, cost: { money: 20000000, metal: 5000000, energy: 400000 } }
    ]
  },
  autoMine: {
    name: "自動採礦機",
    desc: "地殼重型鑽探基站，每秒消耗電力快速產出石頭",
    icon: "⚙️",
    levels: [
      { label: "⚙️ 鑽探岩鑽 Mk-I", autoGen: 3, energyCost: 0.5, cost: { money: 100, stone: 100 } },
      { label: "⚙️ 鑽探岩鑽 Mk-II", autoGen: 9, energyCost: 1.5, cost: { money: 400, stone: 400, metal: 100 } },
      { label: "⚙️ 鑽探岩鑽 Mk-III", autoGen: 28, energyCost: 4.0, cost: { money: 1500, stone: 1500, metal: 500 } },
      { label: "⚙️ 電漿熔岩鑽探機", autoGen: 100, energyCost: 12.0, cost: { money: 5000, metal: 2000, energy: 500 } },
      { label: "⚙️ 地函地震採礦陣", autoGen: 350, energyCost: 35.0, cost: { money: 20000, metal: 8000, energy: 1500 } },
      { label: "⚙️ 粒子重組碎岩機", autoGen: 1100, energyCost: 100.0, cost: { money: 80000, metal: 30000, energy: 5000 } },
      { label: "⚙️ 小行星牽引鑽機", autoGen: 3500, energyCost: 300.0, cost: { money: 300000, metal: 100000, energy: 15000 } },
      { label: "⚙️ 地心引力收束儀", autoGen: 11000, energyCost: 900.0, cost: { money: 1200000, metal: 400000, energy: 45000 } },
      { label: "⚙️ 時空斷層碎裂極", autoGen: 35000, energyCost: 2500.0, cost: { money: 5000000, metal: 1500000, energy: 120000 } },
      { label: "⚙️ 星體基質坍縮器", autoGen: 100000, energyCost: 8000.0, cost: { money: 20000000, metal: 5000000, energy: 400000 } }
    ]
  },
  autoHarvest: {
    name: "智能農艙",
    desc: "密閉式液態智能培養艙，消耗電力源源不絕生產食物",
    icon: "⚙️",
    levels: [
      { label: "⚙️ 智能水耕 Mk-I", autoGen: 8, energyCost: 0.5, cost: { money: 100, food: 100 } },
      { label: "⚙️ 智能水耕 Mk-II", autoGen: 24, energyCost: 1.5, cost: { money: 400, food: 400, metal: 100 } },
      { label: "⚙️ 智能水耕 Mk-III", autoGen: 70, energyCost: 4.0, cost: { money: 1500, food: 1500, metal: 500 } },
      { label: "⚙️ 高能生長光照室", autoGen: 220, energyCost: 12.0, cost: { money: 5000, metal: 2000, energy: 500 } },
      { label: "⚙️ 生質合成工廠", autoGen: 700, energyCost: 35.0, cost: { money: 20000, metal: 8000, energy: 1500 } },
      { label: "⚙️ 全息光合培育塔", autoGen: 2200, energyCost: 100.0, cost: { money: 80000, metal: 30000, energy: 5000 } },
      { label: "⚙️ 奈米分子營養槽", autoGen: 7000, energyCost: 300.0, cost: { money: 300000, metal: 100000, energy: 15000 } },
      { label: "⚙️ 太空光譜生物巨蛋", autoGen: 22000, energyCost: 900.0, cost: { money: 1200000, metal: 400000, energy: 45000 } },
      { label: "⚙️ 微型生態次元圈", autoGen: 70000, energyCost: 2500.0, cost: { money: 5000000, metal: 1500000, energy: 120000 } },
      { label: "⚙️ 生命能階豐裕核心", autoGen: 200000, energyCost: 8000.0, cost: { money: 20000000, metal: 5000000, energy: 400000 } }
    ]
  },
  autoStudy: {
    name: "自動科研儀",
    desc: "全天候高算力伺服單元，消耗能量自我進行學術運算產出知識",
    icon: "🤖",
    levels: [
      { label: "🤖 科研伺服節點 I", autoGen: 2, energyCost: 1.0, cost: { money: 500, knowledge: 500 } },
      { label: "🤖 科研伺服節點 II", autoGen: 6, energyCost: 3.0, cost: { money: 2000, knowledge: 2000, metal: 500 } },
      { label: "🤖 分散式雲端算力陣", autoGen: 20, energyCost: 8.0, cost: { money: 8000, knowledge: 8000, metal: 2000 } },
      { label: "🤖 碳基人工神經核心", autoGen: 65, energyCost: 25.0, cost: { money: 25000, metal: 10000, energy: 3000 } },
      { label: "🤖 量子退火研究陣列", autoGen: 200, energyCost: 80.0, cost: { money: 80000, metal: 30000, energy: 10000 } },
      { label: "🤖 超維度模擬拓樸艙", autoGen: 650, energyCost: 250.0, cost: { money: 250000, metal: 100000, energy: 35000 } },
      { label: "🤖 行星級算力主機板", autoGen: 2000, energyCost: 800.0, cost: { money: 800000, metal: 300000, energy: 120000 } },
      { label: "🤖 亞光速光子運算巨構", autoGen: 7000, energyCost: 2500.0, cost: { money: 2500000, metal: 1000000, energy: 400000 } },
      { label: "🤖 時空曲率預知中心", autoGen: 22000, energyCost: 8000.0, cost: { money: 8000000, metal: 3000000, energy: 1200000 } },
      { label: "🤖 奇點全知演化矩陣", autoGen: 80000, energyCost: 25000.0, cost: { money: 25000000, metal: 10000000, energy: 4000000 } }
    ]
  },
  mithrilFactory: {
    name: "秘銀工廠",
    desc: "融合大量金屬、礦石與高純能量，提煉極其珍貴的秘銀幣",
    icon: "💠",
    levels: [
      { label: "💠 秘銀精煉機 Mk-I", autoGen: 0.02, metalCost: 0.5, stoneCost: 0.5, energyCost: 0.5, cost: { money: 500, metal: 200, energy: 50 } },
      { label: "💠 秘銀精煉機 Mk-II", autoGen: 0.08, metalCost: 1.5, stoneCost: 1.5, energyCost: 1.5, cost: { money: 2000, metal: 800, energy: 200 } },
      { label: "💠 高溫磁化熔爐", autoGen: 0.3, metalCost: 5.0, stoneCost: 5.0, energyCost: 5.0, cost: { money: 8000, metal: 3000, energy: 800 } },
      { label: "💠 重氫能熔鑄室", autoGen: 1.0, metalCost: 15.0, stoneCost: 15.0, energyCost: 15.0, cost: { money: 30000, metal: 10000, energy: 3000 } },
      { label: "💠 質子加速煉鑄陣", autoGen: 3.0, metalCost: 40.0, stoneCost: 40.0, energyCost: 40.0, cost: { money: 120000, metal: 40000, energy: 10000 } },
      { label: "💠 逆熵物質聚合器", autoGen: 8.0, metalCost: 120.0, stoneCost: 120.0, energyCost: 120.0, cost: { money: 500000, metal: 150000, energy: 40000 } },
      { label: "💠 行星級地核鍛爐", autoGen: 25.0, metalCost: 400.0, stoneCost: 400.0, energyCost: 400.0, cost: { money: 2000000, metal: 600000, energy: 150000 } },
      { label: "💠 超新星模擬聚合艙", autoGen: 80.0, metalCost: 1200.0, stoneCost: 1200.0, energyCost: 1200.0, cost: { money: 8000000, metal: 2500000, energy: 600000 } },
      { label: "💠 暗能量真空提純極", autoGen: 250.0, metalCost: 4000.0, stoneCost: 4000.0, energyCost: 4000.0, cost: { money: 30000000, metal: 10000000, energy: 2500000 } },
      { label: "💠 奇點無限秘銀核心", autoGen: 800.0, metalCost: 12000.0, stoneCost: 12000.0, energyCost: 12000.0, cost: { money: 100000000, metal: 40000000, energy: 10000000 } }
    ]
  }
};

const DIFFICULTY_MULTIPLIERS = {
  easy: {
    label: "🌱 簡單",
    color: "#10b981",
    gather: 2.0,
    enemyHp: 0.5,
    enemyAtk: 0.5,
    expMoneyMod: 1.5,
    faithChance: 0.75,            // 75% chance
    nonFaithGiantDmgMod: 0.50    // 2x weaker (0.5)
  },
  normal: {
    label: "⚔️ 一般",
    color: "#3b82f6",
    gather: 1.0,
    enemyHp: 1.0,
    enemyAtk: 1.0,
    expMoneyMod: 1.0,
    faithChance: 0.50,            // 50% chance
    nonFaithGiantDmgMod: 0.33    // 3x weaker (0.33)
  },
  hard: {
    label: "🔥 困難",
    color: "#f59e0b",
    gather: 0.7,
    enemyHp: 1.5,
    enemyAtk: 1.4,
    expMoneyMod: 0.8,
    faithChance: 0.20,            // 20% chance
    nonFaithGiantDmgMod: 0.20    // 5x weaker (0.2)
  },
  nightmare: {
    label: "💀 惡夢",
    color: "#ef4444",
    gather: 0.4,
    enemyHp: 2.5,
    enemyAtk: 2.0,
    expMoneyMod: 0.5,
    faithChance: 0.05,            // 5% chance
    nonFaithGiantDmgMod: 0.10    // 10x weaker (0.1)
  },
  test: {
    label: "🧪 測試",
    color: "#a855f7",
    gather: 10.0,
    enemyHp: 0.1,
    enemyAtk: 0.1,
    expMoneyMod: 10.0,
    faithChance: 1.00,            // 100% chance
    nonFaithGiantDmgMod: 1.00    // No weakness (1.0)
  }
};

const state = JSON.parse(JSON.stringify(DEFAULT_STATE));
window.state = state;

window.setDirty = function(key) {
  if (state._dirtyFlags) {
    state._dirtyFlags[key] = true;
  }
};

window.setDifficulty = function(key) {
  if (!DIFFICULTY_MULTIPLIERS[key]) return;
  
  if (key === 'test') {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayCode = `${y}${m}${d}`;
    
    // Bypass prompt if already verified in this browser session
    if (window.sessionStorage.getItem('gm_verified') !== todayCode) {
      const pw = prompt("🔒 請輸入管理員驗證碼：");
      if (pw !== todayCode) {
        showToast("❌ 權限不足，無法切換至測試模式！", "error");
        return;
      }
      window.sessionStorage.setItem('gm_verified', todayCode);
    }
  }

  state.difficulty = key;
  
  const modal = document.getElementById("difficultyModal");
  if (modal) modal.style.display = "none";
  
  saveGame(true); // silent save
  updateUI();
  showToast(`🎮 冒險開始！已設定為【${DIFFICULTY_MULTIPLIERS[key].label}】！`, "success");
};



// Helper functions to update multiple elements simultaneously for sync UI
function setAllText(nodeList, text) {
  nodeList.forEach(el => { if (el) el.textContent = text; });
}

function toggleAllClass(nodeList, className, condition) {
  nodeList.forEach(el => { if (el) el.classList.toggle(className, condition); });
}

function setAllClassName(nodeList, className) {
  nodeList.forEach(el => { if (el) el.className = className; });
}

// DOM References (changed to querySelectorAll to support duplicated resource cards)
const woodEls = document.querySelectorAll(".woodCount");
const woodMaxEls = document.querySelectorAll(".woodMax");
const resWoodItems = document.querySelectorAll(".res-wood");

const stoneEls = document.querySelectorAll(".stoneCount");
const stoneMaxEls = document.querySelectorAll(".stoneMax");
const resStoneItems = document.querySelectorAll(".res-stone");

const foodEls = document.querySelectorAll(".foodCount");
const foodMaxEls = document.querySelectorAll(".foodMax");
const foodRateEls = document.querySelectorAll(".foodDrainRate");
const resFoodItems = document.querySelectorAll(".res-food");

const metalEls = document.querySelectorAll(".metalCount");
const metalMaxEls = document.querySelectorAll(".metalMax");
const metalRateEls = document.querySelectorAll(".metalGenRate");
const resMetalItems = document.querySelectorAll(".res-metal");

const energyEls = document.querySelectorAll(".energyCount");
const energyMaxEls = document.querySelectorAll(".energyMax");
const energyRateEls = document.querySelectorAll(".energyGenRate");
const resEnergyItems = document.querySelectorAll(".res-energy");

const moneyEls = document.querySelectorAll(".moneyCount");
const moneyMaxEls = document.querySelectorAll(".moneyMax");
const moneyRateEls = document.querySelectorAll(".moneyGenRate");
const resMoneyItems = document.querySelectorAll(".res-money");

const knowledgeEls = document.querySelectorAll(".knowledgeCount");
const knowledgeRateEls = document.querySelectorAll(".knowledgeGenRate");

const mithrilEls = document.querySelectorAll(".mithrilCount");
const mithrilRateEls = document.querySelectorAll(".mithrilGenRate");

const workerEl = document.getElementById("workerCount");
const limitEl = document.getElementById("workerLimit");
const popBarEl = document.getElementById("popLimitBar");
const effectsLayer = document.getElementById("clickEffectsLayer");

// Target Nodes DOM
const nodeWood = document.getElementById("node-wood");
const nodeStone = document.getElementById("node-stone");
const nodeFood = document.getElementById("node-food");
const nodeMetal = document.getElementById("node-metal");
const nodeMoney = document.getElementById("node-money");
const focusBadgeText = document.getElementById("activeFocusText");

// City Base Grid DOM & Selection Variable
let selectedSlotIdx = null;
const cityGridContainer = document.getElementById("cityGridContainer");
const cityUsedSlotsEl = document.getElementById("cityUsedSlots");
const cityMaxSlotsEl = document.getElementById("cityMaxSlots");
const btnExpandCity = document.getElementById("btnExpandCity");
const expandCityCostEl = document.getElementById("expandCityCost");

const citySlotDetailOverlay = document.getElementById("citySlotDetailOverlay");
const citySlotDetailPanel = document.getElementById("citySlotDetailPanel");
const closeCityDetailBtn = document.getElementById("closeCityDetailBtn");
const slotConstructList = document.getElementById("slotConstructList");
const slotManageUi = document.getElementById("slotManageUi");

const manageBuildingName = document.getElementById("manageBuildingName");
const manageBuildingDesc = document.getElementById("manageBuildingDesc");
const manageBuildingEffect = document.getElementById("manageBuildingEffect");
const btnUpgradeBuilding = document.getElementById("btnUpgradeBuilding");
const upgradeCostTextEl = document.getElementById("upgradeCostText");
const btnDemolishBuilding = document.getElementById("btnDemolishBuilding");

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
const btnTechClickFood = document.getElementById("btnTechClickFood");
const techClickFoodStatusEl = document.getElementById("techClickFoodStatus");
const btnTechClickMetal = document.getElementById("btnTechClickMetal");
const techClickMetalStatusEl = document.getElementById("techClickMetalStatus");
const btnTechClickMoney = document.getElementById("btnTechClickMoney");
const techClickMoneyStatusEl = document.getElementById("techClickMoneyStatus");
const btnTechDoubleClick = document.getElementById("btnTechDoubleClick");
const techDoubleClickStatusEl = document.getElementById("techDoubleClickStatus");

const btnTechHero = document.getElementById("btnTechHero");
const techHeroStatusEl = document.getElementById("techHeroStatus");
const btnTechAppraisal = document.getElementById("btnTechAppraisal");
const techAppraisalStatusEl = document.getElementById("techAppraisalStatus");

const btnTechHuntLv4 = document.getElementById("btnTechHuntLv4");
const techHuntLv4StatusEl = document.getElementById("techHuntLv4Status");
const btnTechHuntLv7 = document.getElementById("btnTechHuntLv7");
const techHuntLv7StatusEl = document.getElementById("techHuntLv7Status");
const btnTechSecretLv4 = document.getElementById("btnTechSecretLv4");
const techSecretLv4StatusEl = document.getElementById("techSecretLv4Status");
const btnTechSecretLv7 = document.getElementById("btnTechSecretLv7");
const techSecretLv7StatusEl = document.getElementById("techSecretLv7Status");
const btnTechAutomation = document.getElementById("btnTechAutomation");
const techAutomationStatusEl = document.getElementById("techAutomationStatus");
const btnTechTemple = document.getElementById("btnTechTemple");
const techTempleStatusEl = document.getElementById("techTempleStatus");
const btnTechAutoStudy = document.getElementById("btnTechAutoStudy");
const techAutoStudyStatusEl = document.getElementById("techAutoStudyStatus");

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

    // Secure 'test' difficulty upon loading
    if (state.difficulty === 'test') {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const todayCode = `${y}${m}${d}`;
      
      if (window.sessionStorage.getItem('gm_verified') !== todayCode) {
        const pw = prompt("🔒 偵測到【測試模式】存檔，請輸入管理員驗證碼進行授權：");
        if (pw !== todayCode) {
          alert("❌ 權限驗證失敗！存檔難度已強制降級為「一般模式」！");
          state.difficulty = 'normal';
        } else {
          window.sessionStorage.setItem('gm_verified', todayCode);
        }
      }
    }

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
        if (p.gender === undefined) p.gender = Math.random() > 0.5 ? 'male' : 'female';
        if (p.faith === undefined) p.faith = Math.random() > 0.5;
        if (p.baseStats.lucky === undefined) p.baseStats.lucky = Math.floor(Math.random() * 21);
        if (p.baseStats.critRate === undefined) p.baseStats.critRate = +(Math.random() * 0.11).toFixed(2);
        // Ensure dynamic parameters exist
        if (p.hp === undefined) p.hp = p.baseStats.hp;
        if (p.mp === undefined) p.mp = p.baseStats.mp;
      });
    }

    // Migrate legacy building tallies into the grid slots if they exist
    if (saved.buildings && (!saved.cityLayout || !saved.cityLayout.slots || saved.cityLayout.slots.every(s => !s.type))) {
      let slotIndex = 0;
      const slotMapping = {
        cabins: 'cabin',
        farms: 'farm',
        smelter: 'smelter',
        powerPlant: 'powerPlant',
        warehouse: 'warehouse',
        battery: 'battery',
        bank: 'bank',
        school: 'school'
      };

      for (let legacyKey in slotMapping) {
        const count = saved.buildings[legacyKey] || 0;
        const newType = slotMapping[legacyKey];
        for (let i = 0; i < count; i++) {
          if (slotIndex < 36) {
            state.cityLayout.slots[slotIndex] = { type: newType, level: 1 };
            slotIndex++;
          }
        }
      }
      
      if (slotIndex > state.cityLayout.maxSlots) {
        state.cityLayout.maxSlots = Math.min(36, Math.max(6, Math.ceil(slotIndex / 3) * 3));
      }
    }

    // Ensure state.cityLayout.slots array is always at least 36 items for backward compatibility
    if (state.cityLayout && Array.isArray(state.cityLayout.slots)) {
      while (state.cityLayout.slots.length < 36) {
        state.cityLayout.slots.push({ type: null, level: 1 });
      }
    }

    // Restore UI from loaded state
    setGatherFocus(state.gatherFocus || 'wood');
    updateUI(true);
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
  updateUI(true);
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
  if (nodeFood) nodeFood.classList.remove("active");
  if (nodeMetal) nodeMetal.classList.remove("active");
  if (nodeMoney) nodeMoney.classList.remove("active");
  
  if (resource === 'wood') {
    nodeWood.classList.add("active");
    focusBadgeText.innerHTML = `🌳 採集木頭`;
  } else if (resource === 'stone') {
    nodeStone.classList.add("active");
    focusBadgeText.innerHTML = `🪨 採集石頭`;
  } else if (resource === 'food') {
    if (nodeFood) nodeFood.classList.add("active");
    focusBadgeText.innerHTML = `🍞 採集食物`;
  } else if (resource === 'metal') {
    if (nodeMetal) nodeMetal.classList.add("active");
    focusBadgeText.innerHTML = `🪙 採集金屬`;
  } else if (resource === 'money') {
    if (nodeMoney) nodeMoney.classList.add("active");
    focusBadgeText.innerHTML = `💰 賺取金錢`;
  }
}


// ==========================================
// 3.1 City Layout & Grid Functions
// ==========================================
function renderCityGrid() {
  if (!cityGridContainer) return;
  cityGridContainer.innerHTML = "";

  const maxSlots = state.cityLayout.maxSlots;
  state.cityLayout.slots.forEach((slot, idx) => {
    const tile = document.createElement("div");
    tile.className = "city-slot-tile";
    
    const isLocked = idx >= maxSlots;
    const isSelected = selectedSlotIdx === idx;

    if (isLocked) {
      tile.classList.add("locked");
      tile.innerHTML = `
        <div class="city-slot-icon">🔒</div>
        <div class="city-slot-label" style="color: #94a3b8;">未開墾</div>
      `;
    } else {
      if (isSelected) {
        tile.classList.add("active-selection");
      }
      
      if (slot && slot.type) {
        tile.classList.add("occupied");
        const db = BUILDING_DATA[slot.type];
        if (db) {
          const levelData = db.levels[slot.level - 1] || db.levels[0];
          tile.innerHTML = `
            <div class="city-slot-icon">${db.icon}</div>
            <div class="city-slot-label">${db.name}</div>
            <div class="city-slot-level">Lv.${slot.level}</div>
          `;
        }
      } else {
        tile.innerHTML = `
          <div class="city-slot-icon" style="color: rgba(255,255,255,0.15);">➕</div>
          <div class="city-slot-label" style="color: var(--text-muted); font-size:0.7rem;">點擊建造</div>
        `;
      }

      tile.addEventListener("click", () => {
        selectCitySlot(idx);
      });
    }
    cityGridContainer.appendChild(tile);
  });

  refreshCityDetailPanel();
}

function selectCitySlot(idx) {
  selectedSlotIdx = selectedSlotIdx === idx ? null : idx;
  window.setDirty('cityGrid');
  updateUI(); 
}

function checkCostAffordable(cost) {
  if (!cost) return true;
  for (let res in cost) {
    if ((state[res] || 0) < cost[res]) return false;
  }
  return true;
}

function formatCostString(cost) {
  if (!cost) return "免費";
  const mapping = { wood: '🪵', stone: '🪨', food: '🍞', metal: '🪙', energy: '⚡', money: '💰' };
  return Object.entries(cost).map(([res, val]) => `${mapping[res]} ${window.formatNumberShort(val)}`).join(" | ");
}

function refreshCityDetailPanel() {
  if (!citySlotDetailPanel || !citySlotDetailOverlay) return;

  if (selectedSlotIdx === null) {
    citySlotDetailOverlay.style.display = "none";
    slotConstructList.style.display = "none";
    slotManageUi.style.display = "none";
    return;
  }

  citySlotDetailOverlay.style.display = "flex";
  const slot = state.cityLayout.slots[selectedSlotIdx];

  if (!slot || !slot.type) {
    slotConstructList.style.display = "block";
    slotManageUi.style.display = "none";

    const optButtons = slotConstructList.querySelectorAll(".opt-build-btn");
    optButtons.forEach(btn => {
      const type = btn.getAttribute("data-type");
      
      // 自動化採集與秘銀工廠檢查
      const isAuto = ['autoWood', 'autoMine', 'autoHarvest', 'mithrilFactory'].includes(type);
      if (isAuto) {
        if (!state.tech.automation) {
          btn.style.display = "none";
          return;
        } else {
          btn.style.display = "flex";
        }
      }

      // 全自動科研儀檢查
      if (type === 'autoStudy') {
        if (!state.tech.autoStudyTech) {
          btn.style.display = "none";
          return;
        } else {
          btn.style.display = "flex";
        }
      }

      const db = BUILDING_DATA[type];
      if (db && db.levels && db.levels[0]) {
        const firstLv = db.levels[0];
        const cost = firstLv.cost;
        btn.disabled = !checkCostAffordable(cost);
        
        const costEl = btn.querySelector(".opt-cost");
        if (costEl) {
          costEl.textContent = formatCostString(cost);
        }
      }
    });
  } else {
    slotConstructList.style.display = "none";
    slotManageUi.style.display = "block";

    const db = BUILDING_DATA[slot.type];
    if (!db) return;
    const curLvl = slot.level;
    const maxLvl = db.levels.length;
    const curData = db.levels[curLvl - 1] || db.levels[0];
    const nextData = db.levels[curLvl]; 

    if (manageBuildingName) manageBuildingName.textContent = curData.label;
    if (manageBuildingDesc) manageBuildingDesc.textContent = db.desc;

    let effText = "";
    const fns = window.formatNumberShort;
    if (slot.type === 'cabin') effText = `+${fns(curData.pop)} 人口`;
    else if (slot.type === 'farm') effText = `+${fns(curData.gen)} 食/秒`;
    else if (slot.type === 'smelter') effText = `+${fns(curData.gen)} 金屬/秒`;
    else if (slot.type === 'powerPlant') effText = `+${fns(curData.gen)} 能/秒`;
    else if (slot.type === 'warehouse') effText = `儲存 +${fns(curData.cap)}`;
    else if (slot.type === 'battery') effText = `能源 +${fns(curData.cap)}`;
    else if (slot.type === 'bank') effText = `利息+${fns(curData.gen)}, 上限+${fns(curData.cap)}`;
    else if (slot.type === 'school') effText = `+${fns(curData.gen)} 知識/秒`;
    else if (slot.type === 'autoWood') effText = `+${fns(curData.autoGen)} 木/秒 (-${fns(curData.energyCost)}能)`;
    else if (slot.type === 'autoMine') effText = `+${fns(curData.autoGen)} 石/秒 (-${fns(curData.energyCost)}能)`;
    else if (slot.type === 'autoHarvest') effText = `+${fns(curData.autoGen)} 食/秒 (-${fns(curData.energyCost)}能)`;
    else if (slot.type === 'autoStudy') effText = `+${fns(curData.autoGen)} 知識/秒 (-${fns(curData.energyCost)}能)`;
    else if (slot.type === 'mithrilFactory') effText = `+${fns(curData.autoGen)} 秘銀/秒 (-${fns(curData.metalCost)}金屬 -${fns(curData.stoneCost)}礦石 -${fns(curData.energyCost)}能)`;
    
    if (manageBuildingEffect) manageBuildingEffect.textContent = effText;

    if (btnUpgradeBuilding && upgradeCostTextEl) {
      if (curLvl >= maxLvl) {
        upgradeCostTextEl.textContent = "已達最高級";
        btnUpgradeBuilding.disabled = true;
      } else if (nextData) {
        const upgradeCost = nextData.cost;
        upgradeCostTextEl.textContent = formatCostString(upgradeCost);
        btnUpgradeBuilding.disabled = !checkCostAffordable(upgradeCost);
      }
    }
  }
}

function deductResources(cost) {
  if (!cost) return;
  for (let res in cost) {
    state[res] -= cost[res];
  }
}

function constructBuilding(type) {
  if (selectedSlotIdx === null) return;
  const slot = state.cityLayout.slots[selectedSlotIdx];
  if (slot && slot.type) return; 

  const db = BUILDING_DATA[type];
  if (!db) return;
  const cost = db.levels[0].cost;
  if (!checkCostAffordable(cost)) {
    showToast("❌ 資源不足，無法建造！", "error");
    return;
  }

  deductResources(cost);
  state.cityLayout.slots[selectedSlotIdx] = { type: type, level: 1 };
  selectedSlotIdx = null; // Auto close modal on build
  showToast(`🏗️ 成功建造 ${db.levels[0].label}！`, "info");
  
  window.setDirty('cityGrid');
  window.setDirty('popRoster');
  window.setDirty('templeRoster');
  window.setDirty('heroSheets');
  updateUI();
}

function upgradeBuilding() {
  if (selectedSlotIdx === null) return;
  const slot = state.cityLayout.slots[selectedSlotIdx];
  if (!slot || !slot.type) return;

  const db = BUILDING_DATA[slot.type];
  if (!db) return;
  const nextLvlData = db.levels[slot.level];
  if (!nextLvlData) {
    showToast("❌ 建物已達最高等級！", "error");
    return;
  }

  const cost = nextLvlData.cost;
  if (!checkCostAffordable(cost)) {
    showToast("❌ 資源不足，無法升級！", "error");
    return;
  }

  deductResources(cost);
  slot.level += 1;
  showToast(`🔼 成功將建物升級至 ${nextLvlData.label}！`, "info");
  
  window.setDirty('cityGrid');
  window.setDirty('popRoster');
  window.setDirty('templeRoster');
  window.setDirty('heroSheets');
  updateUI();
}

function demolishBuilding() {
  if (selectedSlotIdx === null) return;
  const slot = state.cityLayout.slots[selectedSlotIdx];
  if (!slot || !slot.type) return;

  if (confirm(`⚠️ 您確定要拆除 [Lv.${slot.level}] 建物嗎？（不會歸還資源！）`)) {
    state.cityLayout.slots[selectedSlotIdx] = { type: null, level: 1 };
    selectedSlotIdx = null; 
    showToast(`🗑️ 建物已被拆除。`, "info");
    
    window.setDirty('cityGrid');
    window.setDirty('popRoster');
    window.setDirty('templeRoster');
    window.setDirty('heroSheets');
    updateUI();
  }
}

function expandCityLand() {
  if (state.cityLayout.maxSlots >= 36) {
    showToast("❌ 已達最大土地擴張極限！", "error");
    return;
  }

  const cost = getExpandCost();
  if (!checkCostAffordable(cost)) {
    showToast("❌ 資源不足，無法進行擴建開墾！", "error");
    return;
  }

  deductResources(cost);
  state.cityLayout.maxSlots += 3; 
  if (state.cityLayout.maxSlots > 36) state.cityLayout.maxSlots = 36;

  showToast(`🚜 成功開闢了新建地！當前可用：${state.cityLayout.maxSlots} 格`, "info");
  
  window.setDirty('cityGrid');
  updateUI();
}

// Calculate Dynamic Storage Limits based on Warehouses/Batteries
function getCityStats() {
  let warehouseCap = 0;
  let batteryCap = 0;
  let farmGen = 0;
  let smelterGen = 0;
  let powerGen = 0;
  let bankGen = 0;
  let bankMoneyCap = 0;
  let schoolMult = 0;
  let schoolGen = 0;
  let popLimit = 5; // 預設 5 人口上限
  let usedSlots = 0;

  let autoWoodGen = 0;
  let autoStoneGen = 0;
  let autoFoodGen = 0;
  let autoEnergyDrain = 0;
  let autoStudyGen = 0;

  let autoMithrilGen = 0;
  let autoMithrilMetalCost = 0;
  let autoMithrilStoneCost = 0;
  let autoMithrilEnergyCost = 0;

  if (state.cityLayout && state.cityLayout.slots) {
    state.cityLayout.slots.forEach((slot, idx) => {
      if (idx >= state.cityLayout.maxSlots) return;
      if (!slot || !slot.type) return;
      usedSlots++;
      const type = slot.type;
      const lvl = slot.level || 1;
      const db = BUILDING_DATA[type];
      if (!db || !db.levels) return;
      
      const data = db.levels[lvl - 1] || db.levels[0];
      
      switch (type) {
        case 'cabin': popLimit += (data.pop || 0); break;
        case 'farm': farmGen += (data.gen || 0); break;
        case 'smelter': smelterGen += (data.gen || 0); break;
        case 'powerPlant': powerGen += (data.gen || 0); break;
        case 'warehouse': warehouseCap += (data.cap || 0); break;
        case 'battery': batteryCap += (data.cap || 0); break;
        case 'bank':
          bankMoneyCap += (data.cap || 0);
          bankGen += (data.gen || 0);
          break;
        case 'school':
          schoolMult = Math.max(schoolMult, data.mult || 1);
          schoolGen += (data.gen || 0);
          break;
        case 'autoWood':
          autoWoodGen += (data.autoGen || 0);
          autoEnergyDrain += (data.energyCost || 0);
          break;
        case 'autoMine':
          autoStoneGen += (data.autoGen || 0);
          autoEnergyDrain += (data.energyCost || 0);
          break;
        case 'autoHarvest':
          autoFoodGen += (data.autoGen || 0);
          autoEnergyDrain += (data.energyCost || 0);
          break;
        case 'autoStudy':
          autoStudyGen += (data.autoGen || 0);
          autoEnergyDrain += (data.energyCost || 0);
          break;
        case 'mithrilFactory':
          autoMithrilGen += (data.autoGen || 0);
          autoMithrilMetalCost += (data.metalCost || 0);
          autoMithrilStoneCost += (data.stoneCost || 0);
          autoMithrilEnergyCost += (data.energyCost || 0);
          break;
      }
    });
  }
  return { warehouseCap, batteryCap, farmGen, smelterGen, powerGen, bankGen, bankMoneyCap, schoolMult, schoolGen, popLimit, usedSlots, autoWoodGen, autoStoneGen, autoFoodGen, autoEnergyDrain, autoStudyGen, autoMithrilGen, autoMithrilMetalCost, autoMithrilStoneCost, autoMithrilEnergyCost };
}

function getExpandCost() {
  const count = state.cityLayout.maxSlots;
  const times = Math.floor((count - 6) / 3);
  return {
    wood: Math.floor(100 * Math.pow(3.2, times)),
    stone: Math.floor(50 * Math.pow(3.2, times))
  };
}

// Calculate Dynamic Storage Limits based on Warehouses/Batteries
function getCapacities() {
  const stats = getCityStats();
  return {
    wood: 100 + stats.warehouseCap,
    stone: 100 + stats.warehouseCap,
    food: 100 + stats.warehouseCap,
    metal: 50 + stats.warehouseCap,
    energy: 50 + stats.batteryCap,
    money: gameConfig.economy.baseMoneyCap + stats.bankMoneyCap
  };
}

// Update Display
function updateUI(forceAll = false) {
  if (forceAll) {
    window.setDirty('cityGrid');
    window.setDirty('popRoster');
    window.setDirty('templeRoster');
    window.setDirty('heroSheets');
  }
  
  // Reactive Watch: If key techs just unlocked, schedule dynamic renders automatically
  if (state.tech.heroLicense && !window._lastHeroLicense) {
    window.setDirty('heroSheets');
    window.setDirty('popRoster');
    window._lastHeroLicense = true;
  } else if (!state.tech.heroLicense) {
    window._lastHeroLicense = false; // Reset for loading/imports
  }

  if (state.tech.templeTech && !window._lastTempleTech) {
    window.setDirty('templeRoster');
    window._lastTempleTech = true;
  } else if (!state.tech.templeTech) {
    window._lastTempleTech = false; // Reset for loading/imports
  }
  const caps = getCapacities();
  const stats = getCityStats();

  // Toggle visibility of resource nodes based on tech
  if (nodeFood) nodeFood.style.display = state.tech.clickFoodTech ? "flex" : "none";
  if (nodeMetal) nodeMetal.style.display = state.tech.clickMetalTech ? "flex" : "none";
  if (nodeMoney) nodeMoney.style.display = state.tech.clickMoneyTech ? "flex" : "none";

  const diffBadgeVal = document.getElementById("diffBadgeVal");
  const diffCfg = DIFFICULTY_MULTIPLIERS[state.difficulty || 'normal'] || DIFFICULTY_MULTIPLIERS.normal;
  if (diffBadgeVal) {
    diffBadgeVal.textContent = diffCfg.label;
    diffBadgeVal.style.color = diffCfg.color;
  }
  
  setAllText(woodEls, window.formatNumberShort(state.wood));
  setAllText(woodMaxEls, window.formatNumberShort(caps.wood));
  toggleAllClass(resWoodItems, "res-full", Math.floor(state.wood) >= caps.wood);

  setAllText(stoneEls, window.formatNumberShort(state.stone));
  setAllText(stoneMaxEls, window.formatNumberShort(caps.stone));
  toggleAllClass(resStoneItems, "res-full", Math.floor(state.stone) >= caps.stone);

  setAllText(foodEls, window.formatNumberShort(state.food));
  setAllText(foodMaxEls, window.formatNumberShort(caps.food));
  toggleAllClass(resFoodItems, "res-full", Math.floor(state.food) >= caps.food);

  setAllText(metalEls, window.formatNumberShort(state.metal));
  setAllText(metalMaxEls, window.formatNumberShort(caps.metal));
  toggleAllClass(resMetalItems, "res-full", Math.floor(state.metal) >= caps.metal);

  setAllText(energyEls, window.formatNumberShort(state.energy));
  setAllText(energyMaxEls, window.formatNumberShort(caps.energy));
  toggleAllClass(resEnergyItems, "res-full", Math.floor(state.energy) >= caps.energy);
  
  // Calculate dynamic net rates based on active population assignments
  let totalFoodCost = 0;
  let populationFoodGen = 0;
  let populationMoneyGen = 0;
  let populationKnowledgeGen = 0;
  let populationMithrilGen = 0;

  state.population.forEach(p => {
    const baseCost = gameConfig.economy.popFoodCost * p.level;
    totalFoodCost += p.assignment !== 'idle' ? baseCost : (baseCost * 0.2);

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
    } else if (p.assignment === 'mithrilSmith') {
      if (state.metal >= 1.0 * efficiency && state.stone >= 1.0 * efficiency && state.energy >= 1.0 * efficiency) {
        populationMithrilGen += 0.05 * efficiency;
      }
    }
  });

  // Calculate net food per second (scaling production by difficulty gather multiplier)
  const diffMult = diffCfg.gather;
  const passiveGen = (stats.farmGen + populationFoodGen) * diffMult;
  const netFoodRate = passiveGen - totalFoodCost;
  const sign = netFoodRate >= 0 ? "+" : "";
  setAllText(foodRateEls, `${sign}${window.formatNumberShort(netFoodRate)}/秒`);
  toggleAllClass(foodRateEls, "alert-text", netFoodRate < 0);

  // Update automated Metal rates
  const netMetalRate = stats.smelterGen * diffMult;
  setAllText(metalRateEls, `+${window.formatNumberShort(netMetalRate)}/秒`);

  // Update automated Energy rates
  const netEnergyRate = stats.powerGen * diffMult;
  setAllText(energyRateEls, `+${window.formatNumberShort(netEnergyRate)}/秒`);
  
  // Money display with dynamic scaling from banks (Config driven)
  const moneyCap = gameConfig.economy.baseMoneyCap + stats.bankMoneyCap;
  setAllText(moneyEls, window.formatNumberShort(state.money));
  setAllText(moneyMaxEls, window.formatNumberShort(moneyCap));
  toggleAllClass(resMoneyItems, "res-full", Math.floor(state.money) >= moneyCap);

  // Knowledge display
  setAllText(knowledgeEls, window.formatNumberShort(state.knowledge));

  // Money rate: bank passive + merchants active
  const netMoneyRate = stats.bankGen + populationMoneyGen;
  setAllText(moneyRateEls, `+${window.formatNumberShort(netMoneyRate)}/秒`);

  // Knowledge rate: school passive + scholars active + autoStudy active (scaled by difficulty)
  const netKnowledgeRate = ((stats.schoolGen + stats.autoStudyGen) * diffMult) + populationKnowledgeGen;
  setAllText(knowledgeRateEls, `+${window.formatNumberShort(netKnowledgeRate)}/秒`);

  // Mithril display and rate computation
  setAllText(mithrilEls, window.formatNumberShort(state.mithril || 0));
  const netMithrilRate = (stats.autoMithrilGen * diffMult) + populationMithrilGen;
  setAllText(mithrilRateEls, `+${window.formatNumberShort(netMithrilRate)}/秒`);

  const currentPop = state.population.length;
  workerEl.textContent = currentPop;
  state.workerLimit = stats.popLimit;
  limitEl.textContent = state.workerLimit;
  if (popCountDisplay) popCountDisplay.textContent = currentPop;
  if (popLimitDisplay) popLimitDisplay.textContent = state.workerLimit;
  
  const percent = (currentPop / state.workerLimit) * 100;
  popBarEl.style.width = `${Math.min(percent, 100)}%`;
  
  // Update City statistics in panel header
  if (cityUsedSlotsEl) cityUsedSlotsEl.textContent = stats.usedSlots;
  if (cityMaxSlotsEl) cityMaxSlotsEl.textContent = state.cityLayout.maxSlots;

  // Render dynamic expand cost and handle button enable/disable
  if (expandCityCostEl && btnExpandCity) {
    if (state.cityLayout.maxSlots >= 36) {
      expandCityCostEl.textContent = "已達最大領土";
      btnExpandCity.disabled = true;
    } else {
      const expCost = getExpandCost();
      expandCityCostEl.textContent = `🪵 ${expCost.wood} | 🪨 ${expCost.stone}`;
      btnExpandCity.disabled = (state.wood < expCost.wood || state.stone < expCost.stone);
    }
  }

  // Render City Grid to handle selections and tile visual rendering
  if (state._dirtyFlags.cityGrid) {
    renderCityGrid();
    state._dirtyFlags.cityGrid = false;
  }

  // Enable/Disable buttons dynamically based on current funds
  const hasBank = stats.bankMoneyCap > 0 || stats.bankGen > 0;
  const workerMoneyCost = hasBank ? gameConfig.economy.recruitBaseCost : 0;
  if (btnHireResident) {
    btnHireResident.disabled = (state.food < gameConfig.costs.worker.food || state.money < workerMoneyCost || currentPop >= state.workerLimit);
    if (hasBank) {
      const labelCost = btnHireResident.querySelector('.build-btn-cost');
      if (labelCost) labelCost.textContent = `🍞 ${gameConfig.costs.worker.food} 食 | 💰 ${gameConfig.economy.recruitBaseCost} 金`;
    }
  }

  // --- RPG & Tech UI Sync ---
  if (stats.schoolMult > 0) {
    if (researchCard) researchCard.style.display = "block";
    if (knowledgeValEl) knowledgeValEl.textContent = Math.floor(state.knowledge);

    // Click Food Tech
    const foodTCfg = gameConfig.combat.tech.clickFoodTech;
    if (state.tech.clickFoodTech) {
      if (btnTechClickFood) btnTechClickFood.disabled = true;
      if (techClickFoodStatusEl) techClickFoodStatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechClickFood) btnTechClickFood.disabled = (state.knowledge < foodTCfg.reqKnowledge || state.money < foodTCfg.reqMoney);
      if (techClickFoodStatusEl) techClickFoodStatusEl.textContent = "未研發";
    }

    // Click Metal Tech
    const metalTCfg = gameConfig.combat.tech.clickMetalTech;
    if (state.tech.clickMetalTech) {
      if (btnTechClickMetal) btnTechClickMetal.disabled = true;
      if (techClickMetalStatusEl) techClickMetalStatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechClickMetal) {
        btnTechClickMetal.disabled = (!state.tech.clickFoodTech || state.knowledge < metalTCfg.reqKnowledge || state.money < metalTCfg.reqMoney);
      }
      if (techClickMetalStatusEl) techClickMetalStatusEl.textContent = !state.tech.clickFoodTech ? "🔒 需解鎖食物" : "未研發";
    }

    // Click Money Tech
    const moneyTCfg = gameConfig.combat.tech.clickMoneyTech;
    if (state.tech.clickMoneyTech) {
      if (btnTechClickMoney) btnTechClickMoney.disabled = true;
      if (techClickMoneyStatusEl) techClickMoneyStatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechClickMoney) {
        btnTechClickMoney.disabled = (!state.tech.clickMetalTech || state.knowledge < moneyTCfg.reqKnowledge || state.money < moneyTCfg.reqMoney);
      }
      if (techClickMoneyStatusEl) techClickMoneyStatusEl.textContent = !state.tech.clickMetalTech ? "🔒 需解鎖金屬" : "未研發";
    }

    // Double Click Tech
    const dblTCfg = gameConfig.combat.tech.doubleClickTech;
    if (state.tech.doubleClickTech) {
      if (btnTechDoubleClick) btnTechDoubleClick.disabled = true;
      if (techDoubleClickStatusEl) techDoubleClickStatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechDoubleClick) {
        const reqE = dblTCfg.reqEnergy || 0;
        btnTechDoubleClick.disabled = (!state.tech.clickMoneyTech || state.knowledge < dblTCfg.reqKnowledge || state.money < dblTCfg.reqMoney || state.energy < reqE);
      }
      if (techDoubleClickStatusEl) techDoubleClickStatusEl.textContent = !state.tech.clickMoneyTech ? "🔒 需解鎖金錢" : "未研發";
    }
    
    const tCfg = gameConfig.combat.tech.heroLicense;
    if (state.tech.heroLicense) {
      if (btnTechHero) btnTechHero.disabled = true;
      if (techHeroStatusEl) techHeroStatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechHero) btnTechHero.disabled = (state.knowledge < tCfg.reqKnowledge || state.money < tCfg.reqMoney);
      if (techHeroStatusEl) techHeroStatusEl.textContent = "未研發";
    }

    // Appraisal Tech
    const appCfg = gameConfig.combat.tech.appraisalTech;
    if (state.tech.appraisalTech) {
      if (btnTechAppraisal) btnTechAppraisal.disabled = true;
      if (techAppraisalStatusEl) techAppraisalStatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechAppraisal) btnTechAppraisal.disabled = (!state.tech.heroLicense || state.knowledge < appCfg.reqKnowledge || state.money < appCfg.reqMoney);
      if (techAppraisalStatusEl) techAppraisalStatusEl.textContent = !state.tech.heroLicense ? "🔒 需前置" : "未研發";
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

    // Tech Automation
    const autoCfg = gameConfig.combat.tech.automation;
    if (state.tech.automation) {
      if (btnTechAutomation) btnTechAutomation.disabled = true;
      if (techAutomationStatusEl) techAutomationStatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechAutomation) {
        btnTechAutomation.disabled = (state.knowledge < autoCfg.reqKnowledge || state.money < autoCfg.reqMoney || state.energy < (autoCfg.reqEnergy || 0));
      }
      if (techAutomationStatusEl) techAutomationStatusEl.textContent = "未研發";
    }

    // Tech Temple
    const templeCfg = gameConfig.combat.tech.templeTech;
    if (state.tech.templeTech) {
      if (btnTechTemple) btnTechTemple.disabled = true;
      if (techTempleStatusEl) techTempleStatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechTemple) {
        btnTechTemple.disabled = (!state.tech.automation || state.knowledge < templeCfg.reqKnowledge || state.money < templeCfg.reqMoney || state.energy < (templeCfg.reqEnergy || 0));
      }
      if (techTempleStatusEl) techTempleStatusEl.textContent = !state.tech.automation ? "🔒 需前置" : "未研發";
    }

    // Tech AutoStudy
    const studyCfg = gameConfig.combat.tech.autoStudyTech;
    if (state.tech.autoStudyTech) {
      if (btnTechAutoStudy) btnTechAutoStudy.disabled = true;
      if (techAutoStudyStatusEl) techAutoStudyStatusEl.textContent = "已研發 ✅";
    } else {
      if (btnTechAutoStudy) {
        btnTechAutoStudy.disabled = (!state.tech.automation || state.knowledge < studyCfg.reqKnowledge || state.money < studyCfg.reqMoney || state.energy < (studyCfg.reqEnergy || 0));
      }
      if (techAutoStudyStatusEl) techAutoStudyStatusEl.textContent = !state.tech.automation ? "🔒 需前置" : "未研發";
    }
    // Update Quest Boss Button Text matching sequential levels
    const btnQuestBoss = document.getElementById("btnQuestBoss");
    if (btnQuestBoss) {
      const bLvl = state.bossLevel || 1;
      const bossNames = [
        "【貪】", 
        "【貪 嗔】", 
        "【貪 嗔 癡】", 
        "【地獄 6柱】", 
        "【深淵 4癡】", 
        "【滅絕 6癡】"
      ];
      const bName = bossNames[Math.min(6, bLvl) - 1] || bossNames[bossNames.length - 1];
      btnQuestBoss.textContent = `💀 挑戰巨獸 Lv.${bLvl} ${bName}`;
    }

    // Update Invasion Countdown Timer
    const invasionTimerEl = document.getElementById("bossInvasionTimer");
    const countdownTextEl = document.getElementById("bossCountdownText");
    if (invasionTimerEl && countdownTextEl) {
      const bi = state.bossInvasions || {};
      const bossesAlive = !(bi.greedDefeated && bi.angerDefeated && bi.ignoranceDefeated);
      if (state.tech.automation && bi.activationTime && bossesAlive) {
        invasionTimerEl.style.display = "block";
        const elapsed = Date.now() - bi.activationTime;
        const ONE_WEEK = 7 * 24 * 3600 * 1000;
        const remain = ONE_WEEK - elapsed;
        
        if (remain > 0) {
          const days = Math.floor(remain / (24 * 3600 * 1000));
          const hours = Math.floor((remain % (24 * 3600 * 1000)) / (3600 * 1000));
          const mins = Math.floor((remain % (3600 * 1000)) / (60 * 1000));
          const secs = Math.floor((remain % (60 * 1000)) / 1000);
          countdownTextEl.textContent = `${days}天 ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          invasionTimerEl.style.background = "rgba(239, 68, 68, 0.15)";
          invasionTimerEl.style.borderColor = "rgba(239, 68, 68, 0.3)";
        } else {
          countdownTextEl.textContent = "⚠️ 入侵中！城市隨時會遭到攻擊！";
          invasionTimerEl.style.background = "rgba(239, 68, 68, 0.35)";
          invasionTimerEl.style.borderColor = "rgba(239, 68, 68, 0.6)";
        }
      } else {
        invasionTimerEl.style.display = "none";
      }
    }
  } else {
    if (researchCard) researchCard.style.display = "none";
  }

  if (state.tech.heroLicense) {
    rpgGuildCard?.classList.remove("locked");
    if (rpgLockOverlay) rpgLockOverlay.style.display = "none";
    if (rpgUnlockedContent) rpgUnlockedContent.style.display = "block";
    if (dispatchRpgCard) dispatchRpgCard.style.display = "block";
    
    if (state._dirtyFlags.heroSheets) {
      updateHeroSheets();
      state._dirtyFlags.heroSheets = false;
    }
  } else {
    rpgGuildCard?.classList.add("locked");
    if (rpgLockOverlay) rpgLockOverlay.style.display = "flex";
    if (rpgUnlockedContent) rpgUnlockedContent.style.display = "none";
    if (dispatchRpgCard) dispatchRpgCard.style.display = "none";
  }

  const navTemple = document.getElementById("nav-temple");
  if (navTemple) {
    navTemple.style.display = state.tech.templeTech ? "flex" : "none";
  }
  if (state.tech.templeTech) {
    if (state._dirtyFlags.templeRoster) {
      renderTempleRoster();
      state._dirtyFlags.templeRoster = false;
    }
  }

  if (state._dirtyFlags.popRoster) {
    renderPopulationRoster();
    state._dirtyFlags.popRoster = false;
  }

  // Sync auto-sell checkboxes values
  if (state.autoSell) {
    const chkNormal = document.getElementById("chkAutoSellNormal");
    const chkMagic = document.getElementById("chkAutoSellMagic");
    const chkRare = document.getElementById("chkAutoSellRare");
    if (chkNormal) chkNormal.checked = !!state.autoSell.normal;
    if (chkMagic) chkMagic.checked = !!state.autoSell.magic;
    if (chkRare) chkRare.checked = !!state.autoSell.rare;
  }
}

// Removed adjustJob


// Action Click: Gather Resource
function performClick(resourceOverride = null, sourceX = null, sourceY = null) {
  const resource = resourceOverride || state.gatherFocus;
  const caps = getCapacities();
  
  const diffCfg = DIFFICULTY_MULTIPLIERS[state.difficulty || 'normal'] || DIFFICULTY_MULTIPLIERS.normal;
  let clickYield = 1 * diffCfg.gather;

  if (state.tech && state.tech.doubleClickTech) {
    clickYield *= 2;
  }
  
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
  } else if (resource === "food") {
    if (!state.tech.clickFoodTech) return;
    if (Math.floor(state.food) >= caps.food) {
      spawnFloatingText("⚠️ 倉庫已滿", "#ef4444", sourceX, sourceY);
      return;
    }
    state.food = Math.min(state.food + clickYield, caps.food);
    text = `+${clickYield % 1 === 0 ? clickYield : clickYield.toFixed(1)} 食物`;
    color = "#f472b6";
  } else if (resource === "metal") {
    if (!state.tech.clickMetalTech) return;
    if (Math.floor(state.metal) >= caps.metal) {
      spawnFloatingText("⚠️ 倉庫已滿", "#ef4444", sourceX, sourceY);
      return;
    }
    state.metal = Math.min(state.metal + clickYield, caps.metal);
    text = `+${clickYield % 1 === 0 ? clickYield : clickYield.toFixed(1)} 金屬`;
    color = "#fbbf24";
  } else if (resource === "money") {
    if (!state.tech.clickMoneyTech) return;
    if (Math.floor(state.money) >= caps.money) {
      spawnFloatingText("⚠️ 錢包已滿", "#ef4444", sourceX, sourceY);
      return;
    }
    state.money = Math.min(state.money + clickYield, caps.money);
    text = `+${clickYield % 1 === 0 ? clickYield : clickYield.toFixed(1)} 金錢`;
    color = "#eab308";
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
  const stats = getCityStats();
  const diffCfg = DIFFICULTY_MULTIPLIERS[state.difficulty || 'normal'] || DIFFICULTY_MULTIPLIERS.normal;
  const diffMult = diffCfg.gather;

  // 1. Passive food yield
  const passiveGen = stats.farmGen * diffMult;
  state.food += passiveGen;
  
  // 2. Automated Industrial Yields
  state.metal += stats.smelterGen * diffMult;
  state.energy += stats.powerGen * diffMult;

  // 2.5 Automation Machinery Energy Check & Yield
  if (stats.autoEnergyDrain > 0) {
    if (state.energy >= stats.autoEnergyDrain) {
      state.energy -= stats.autoEnergyDrain;
      state.wood += stats.autoWoodGen * diffMult;
      state.stone += stats.autoStoneGen * diffMult;
      state.food += stats.autoFoodGen * diffMult;
      state.knowledge += stats.autoStudyGen * diffMult;
    } else {
      // Power Outage Warning (throttle via random check to avoid spamming showToast)
      if (Math.random() < 0.1) {
        showToast("⚡ 電力不足！自動化機械被迫停機斷電！", "error");
      }
    }
  }

  // 2.6 Mithril Factory Energy & Metal & Stone Check & Yield
  if (stats.autoMithrilGen > 0) {
    if (state.metal >= stats.autoMithrilMetalCost && state.stone >= stats.autoMithrilStoneCost && state.energy >= stats.autoMithrilEnergyCost) {
      state.metal -= stats.autoMithrilMetalCost;
      state.stone -= stats.autoMithrilStoneCost;
      state.energy -= stats.autoMithrilEnergyCost;
      state.mithril = (state.mithril || 0) + (stats.autoMithrilGen * diffMult);
    } else {
      if (Math.random() < 0.05) {
        showToast("💠 原料不足！秘銀工廠部分生產線被迫停擺！", "error");
      }
    }
  }

  // 3. Banks generate passive income
  state.money += stats.bankGen;
  
  // 4. Population Logic
  let netWood = 0, netStone = 0, netFood = 0, netMoney = 0, netKnowledge = 0, netMithril = 0;
  const deadResidents = [];
  
  state.population.forEach(p => {
    // Calculate dynamic limits
    const eff = window.calcEffStats ? window.calcEffStats(p) : null;
    const curMaxHp = eff ? eff.maxHp : 100;
    p.maxHp = curMaxHp; // Dynamically sync to object for compatibility

    // Initialize HP stats if missing
    if (p.hp === undefined) p.hp = curMaxHp;

    // Fatigue & Recovery Logic
    if (p.assignment === 'hospital') {
      p.hp = Math.min(curMaxHp, p.hp + 5);
      window.setDirty('popRoster'); // Force redraw to animate healing progress
      
      if (p.hp >= curMaxHp) {
        p.hp = curMaxHp;
        
        const diff = state.difficulty || 'normal';
        let nextJob = 'idle';
        // Maintain current job only for Easy and Test difficulty
        if (diff === 'easy' || diff === 'test') {
          nextJob = p.previousAssignment || 'idle';
        }
        
        p.assignment = nextJob;
        delete p.previousAssignment;
        
        window.setDirty('popRoster');
        window.setDirty('heroSheets');
        window.setDirty('templeRoster');
        
        if (nextJob === 'idle') {
          showToast(`🏥 ${p.name} 已在醫院完全康復！已轉為【閒置】狀態。`, "success");
        } else {
          showToast(`🏥 ${p.name} 已在醫院完全康復！已返回：【${nextJob === 'combat' ? '出征' : '工作岗位'}】`, "success");
        }
      }
    } else if (p.assignment !== 'idle' && p.assignment !== 'combat') {
      // Different jobs drain different stamina
      const fatigueMap = {
        woodcutter: 2,
        miner: 2,
        farmer: 1,
        merchant: 1,
        scholar: 3,
        mithrilSmith: 3
      };
      const drain = fatigueMap[p.assignment] || 1;
      
      p.hp -= drain;
      if (p.hp <= 1) {
        const diff = state.difficulty || 'normal';
        if (diff === 'nightmare') {
          // In Nightmare mode, fatigue causes instant death!
          deadResidents.push(p.id);
          spawnFloatingText(`🪦 ${p.name} 勞累過度暴斃!`, "#ef4444");
          showToast(`🪦 悲報：${p.name} 工作過勞，不幸暴斃身亡！`, "error");
        } else {
          p.hp = 1;
          p.previousAssignment = p.assignment; // Back up their job
          p.assignment = 'hospital';
          window.setDirty('popRoster');
          window.setDirty('heroSheets');
          window.setDirty('templeRoster');
          showToast(`👷 ${p.name} 勞累過度體力透支，已被送去醫院！`, "warning");
        }
      }
    }

    // Resource production & food costs (only works if healthy)
    if (p.assignment === 'hospital') {
      state.food -= (gameConfig.economy.popFoodCost * p.level * 0.2); // Eats 20% while resting
      return; // Does not work!
    }

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
    if (p.assignment === 'mithrilSmith') {
      if (state.metal >= 1.0 * efficiency && state.stone >= 1.0 * efficiency && state.energy >= 1.0 * efficiency) {
        state.metal -= 1.0 * efficiency;
        state.stone -= 1.0 * efficiency;
        state.energy -= 1.0 * efficiency;
        netMithril += 0.05 * efficiency;
      }
    }
  });

  // Prune residents who died of fatigue this tick
  if (deadResidents.length > 0) {
    state.population = state.population.filter(p => !deadResidents.includes(p.id));
    window.setDirty('popRoster');
    window.setDirty('heroSheets');
    window.setDirty('templeRoster');
  }

  state.wood += netWood * diffMult;
  state.stone += netStone * diffMult;
  state.food += netFood * diffMult;
  state.money += netMoney;
  state.knowledge += netKnowledge + (stats.schoolGen * diffMult);
  state.mithril = (state.mithril || 0) + netMithril;

  // Economy caps
  const moneyCap = gameConfig.economy.baseMoneyCap + stats.bankMoneyCap;
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

  // 6. Unified Boss Invasions Triggered by Automation Technology
  if (state.tech.automation) {
    if (!state.bossInvasions.activationTime) {
      state.bossInvasions.activationTime = Date.now();
      showToast("🚨 警告：自動化信號引來了【貪、嗔、癡】三相巨獸！牠們正往城市移動，請在倒數歸零前消滅牠們！", "error");
    }
  }

  if (state.bossInvasions.activationTime) {
    const elapsed = Date.now() - state.bossInvasions.activationTime;
    const ONE_WEEK = 7 * 24 * 3600 * 1000;
    const bi = state.bossInvasions;
    const bossesAlive = !(bi.greedDefeated && bi.angerDefeated && bi.ignoranceDefeated);
    
    if (bossesAlive && elapsed >= ONE_WEEK) {
      // 1/3600 chance per tick (~once per hour of active playtime) to destroy a building
      if (Math.random() < (1 / 3600)) {
        const occupiedSlots = state.cityLayout.slots.filter(s => s && s.type);
        if (occupiedSlots.length > 0) {
          const targetSlot = occupiedSlots[Math.floor(Math.random() * occupiedSlots.length)];
          const type = targetSlot.type;
          const db = BUILDING_DATA[type];
          const displayName = db ? db.name : type;
          
          targetSlot.type = null;
          targetSlot.level = 1;
          showToast(`🚨 災厄降臨！巨獸突破了防禦，摧毀了城市中的一棟【${displayName}】！`, "error");
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

// Global short number formatting helper (K for thousands, M for millions, B for billions)
window.formatNumberShort = function(num, decimals = 1) {
  if (num === undefined || num === null || isNaN(num)) return "0";
  const isNegative = num < 0;
  const abs = Math.abs(num);
  let result = "";
  
  if (abs < 1000) {
    result = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(decimals);
  } else if (abs < 1000000) {
    result = (abs / 1000).toFixed(decimals) + "K";
  } else if (abs < 1000000000) {
    result = (abs / 1000000).toFixed(decimals) + "M";
  } else if (abs < 1000000000000) {
    result = (abs / 1000000000).toFixed(decimals) + "B";
  } else {
    result = (abs / 1000000000000).toFixed(decimals) + "T";
  }
  
  // Regex to eliminate trailing ".0" but keep letter suffix (e.g. "12.0K" -> "12K")
  return (isNegative ? "-" : "") + result.replace(/\.0([KMBT]?)$/, "$1");
};

// Calculate needed EXP for next level based on planned gaps
window.getReqExp = function(lvl) {
  const expGaps = [0, 180, 380, 600, 900, 1350, 1900, 2600, 3500, 4600];
  return expGaps[lvl] || 999999;
};

// Expose state for developer debugging and automated testing
window.gameState = state;
window.gameConfig = gameConfig;
window.updateUI = updateUI;

const NAME_PREFIXES = ["老", "大", "阿", "小", "鐵", "狂", "神", "暗", "玄", "孤"];
const MALE_SUFFIXES = ["強", "柱", "明", "風", "豪", "剛", "峰", "傑", "成", "德"];
const FEMALE_SUFFIXES = ["華", "花", "婷", "雅", "莉", "晴", "美", "玲", "雪", "薇"];

function hireResident() {
  if (state.population.length >= state.workerLimit) return;
  const stats = getCityStats();
  const hasBank = stats.bankMoneyCap > 0 || stats.bankGen > 0;
  const workerMoneyCost = hasBank ? gameConfig.economy.recruitBaseCost : 0;
  if (state.food < gameConfig.costs.worker.food || state.money < workerMoneyCost) return;

  state.food -= gameConfig.costs.worker.food;
  state.money -= workerMoneyCost;

  const slaveRange = gameConfig.economy.slaveRange || [0.8, 2.5];
  const slaveStat = (Math.random() * (slaveRange[1] - slaveRange[0]) + slaveRange[0]).toFixed(2);
  const diffCfg = DIFFICULTY_MULTIPLIERS[state.difficulty || 'normal'] || DIFFICULTY_MULTIPLIERS.normal;
  const faith = Math.random() < (diffCfg.faithChance || 0.5);
  
  const isMale = Math.random() > 0.5;
  const gender = isMale ? 'male' : 'female';
  const suffixPool = isMale ? MALE_SUFFIXES : FEMALE_SUFFIXES;
  const name = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)] + suffixPool[Math.floor(Math.random() * suffixPool.length)];

  const resident = {
    id: "res_" + Date.now() + "_" + Math.floor(Math.random()*1000),
    name: name,
    level: 1,
    exp: 0,
    jobClass: "novice",
    faith: faith,
    gender: gender,
    slaveStat: parseFloat(slaveStat),
    baseStats: {
      hp: Math.floor(Math.random() * 91) + 10, // 10 ~ 100
      mp: Math.floor(Math.random() * 46) + 5,  // 5 ~ 50
      atk: Math.floor(Math.random() * 10) + 1, // 1 ~ 10
      def: Math.floor(Math.random() * 10) + 1, // 1 ~ 10
      matk: Math.floor(Math.random() * 10),    // 0 ~ 9
      mdef: Math.floor(Math.random() * 10),    // 0 ~ 9
      spd: +(Math.random() * 1.01).toFixed(2), // 0.00 ~ 1.00
      lucky: Math.floor(Math.random() * 21),    // 0 ~ 20
      critRate: +(Math.random() * 0.11).toFixed(2) // 0.00 ~ 0.10
    },
    assignment: "idle",
    eq: { rhand: null, lhand: null, helm: null, body: null, pants: null, shoes: null }
  };

  state.population.push(resident);
  const genderIcon = gender === 'female' ? '👩' : '👨';
  showToast(`🍻 歡迎 ${genderIcon} ${name} 加入城鎮！`, "success");
  
  window.setDirty('popRoster');
  window.setDirty('heroSheets');
  window.setDirty('templeRoster');
  updateUI();
}

if (btnHireResident) {
  btnHireResident.addEventListener("click", hireResident);
}

function getSortedPopulation() {
  return [...state.population].sort((a, b) => {
    const effA = calcEffStats(a);
    const effB = calcEffStats(b);
    const maxHpA = effA?.maxHp || 100;
    const maxHpB = effB?.maxHp || 100;
    const currentHpA = a.hp !== undefined ? a.hp : maxHpA;
    const currentHpB = b.hp !== undefined ? b.hp : maxHpB;
    
    // 1. Injured first (currentHp < maxHp)
    const isInjuredA = currentHpA < maxHpA;
    const isInjuredB = currentHpB < maxHpB;
    if (isInjuredA !== isInjuredB) {
      return isInjuredA ? -1 : 1;
    }
    
    // 2. Job Class (transitioned first: jobClass !== "novice")
    const isTransA = a.jobClass !== "novice";
    const isTransB = b.jobClass !== "novice";
    if (isTransA !== isTransB) {
      return isTransA ? -1 : 1;
    }
    
    // 3. Level (highest first)
    if (b.level !== a.level) {
      return b.level - a.level;
    }
    
    // 4. Stable sort by ID
    return a.id.localeCompare(b.id);
  });
}

function renderPopulationRoster() {
  if (!populationRoster) return;

  const active = document.activeElement;
  if (active && active.tagName === "SELECT" && populationRoster.contains(active)) {
    return;
  }

  const stats = getCityStats();
  populationRoster.innerHTML = "";
  
  if (state.population.length === 0) {
    populationRoster.innerHTML = `<div class="empty-inv" style="text-align: center; color: #94a3b8; font-size: 0.9rem; padding: 1rem;">城鎮空無一人，請招募流浪者！</div>`;
    return;
  }
  
  getSortedPopulation().forEach(p => {
    const genderSym = p.gender === 'female' ? '♀️' : '♂️';
    const faithSym = p.faith ? '✨' : '🪐';
    
    const eff = calcEffStats(p);
    const maxHp = eff?.maxHp || 100;
    const currentHp = p.hp !== undefined ? p.hp : maxHp;
    const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

    const exileBtnHtml = `
      <button class="roster-action-btn btn-exile" onclick="exileResident('${p.id}')" title="流放出城，釋放床位與人口數">
        🥾 流放
      </button>
    `;

    let knowledgeBtnHtml = "";
    if (p.jobClass === "novice" && p.level < 10) {
      const reqExp = window.getReqExp(p.level);
      const remainingExp = reqExp - p.exp;
      const neededKnowledge = remainingExp * 1000;
      
      let btnText = "";
      let btnDisabled = false;

      if (state.knowledge >= neededKnowledge) {
        btnText = `📚 知識升級 (-${window.formatNumberShort(neededKnowledge)})`;
      } else {
        const canGain = Math.floor(state.knowledge / 1000);
        if (canGain > 0) {
          btnText = `📚 知識灌注 (+${canGain} EXP)`;
        } else {
          btnText = `📚 知識不足 (需 1K)`;
          btnDisabled = true;
        }
      }

      knowledgeBtnHtml = `
        <button class="roster-action-btn btn-study" 
          onclick="infuseKnowledge('${p.id}')" 
          ${btnDisabled ? "disabled" : ""} 
          title="消耗大腦知識點數，直接灌頂流浪者！(1000 知識 = 1 EXP)">
          ${btnText}
        </button>
      `;
    }

    const hpBarHtml = `
      <div>
        <div class="hp-bar-wrapper">
          <div class="hp-bar-fill" style="width: ${hpPercent}%;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-top: 4px;">
          <span style="color: #94a3b8; font-weight:500;">❤️ 精力 (體力/生命)</span>
          <span style="color: #fca5a5; font-weight:800;">${Math.floor(currentHp)} / ${Math.floor(maxHp)}</span>
        </div>
      </div>
    `;

    let statsHtml = "";
    if (eff) {
      if (state.tech.appraisalTech) {
        statsHtml = `
          <div class="roster-stats-row" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; font-size: 0.75rem; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 8px; margin: 4px 0; border: 1px solid rgba(255,255,255,0.05);">
            <div style="color: #e2e8f0; display:flex; justify-content:space-between; gap: 2px; padding-right:4px;"><span>⚔️</span> <span>${eff.atk}</span></div>
            <div style="color: #e2e8f0; display:flex; justify-content:space-between; gap: 2px; padding-right:4px;"><span>🛡️</span> <span>${eff.def}</span></div>
            <div style="color: #e2e8f0; display:flex; justify-content:space-between; gap: 2px;"><span>⚡</span> <span>${eff.spd.toFixed(1)}</span></div>
            <div style="color: #e2e8f0; display:flex; justify-content:space-between; gap: 2px; padding-right:4px;"><span>🪄</span> <span>${eff.matk}</span></div>
            <div style="color: #e2e8f0; display:flex; justify-content:space-between; gap: 2px; padding-right:4px;"><span>🔮</span> <span>${eff.mdef}</span></div>
            <div style="color: #e2e8f0; display:flex; justify-content:space-between; gap: 2px;"><span>💥</span> <span>${(eff.critRate * 100).toFixed(0)}%</span></div>
          </div>
        `;
      } else {
        statsHtml = `
          <div style="text-align: center; font-size: 0.7rem; color: #64748b; background: rgba(0,0,0,0.15); padding: 0.3rem; border-radius: 6px; margin: 4px 0; font-style: italic;">
            🔮 屬性待鑑定 (請研發水晶球)
          </div>
        `;
      }
    }

    const row = document.createElement("div");
    row.className = "roster-card";
    
    if (p.assignment === "hospital") {
      const reviveCost = p.level * 10;
      const canAfford = state.money >= reviveCost;
      
      row.innerHTML = `
        <div class="roster-header">
          <div class="roster-name-block">
            <span class="roster-name" style="color: #94a3b8; text-decoration: line-through; opacity: 0.7;">
              ${getHeroIcon(p.jobClass)} ${p.name} <span style="font-size:0.75rem; font-style:normal;">${genderSym}${faithSym}</span> (Lv.${p.level})
            </span>
            <span style="background: rgba(239,68,68,0.15); color:#ef4444; font-weight:bold; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 6px; border: 1px solid rgba(239,68,68,0.3); display: inline-flex; align-items: center; gap: 4px;">🏥 療養中(+5/s)</span>
          </div>
          <div class="roster-header-actions" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
            ${exileBtnHtml}
          </div>
        </div>
        <div class="roster-body-box" style="border-color: rgba(239,68,68,0.15) !important;">
          ${hpBarHtml}
          ${statsHtml}
          <div class="roster-assign-row">
            <span style="font-size: 0.8rem; color: #fca5a5; display: flex; align-items: center; gap: 4px; font-weight:500;">⏳ 正在醫院靜養康復</span>
            <button class="roster-action-btn btn-heal" 
              onclick="reviveHero('${p.id}')" ${canAfford ? '' : 'disabled'}>
              💖 付費急救 (💰${reviveCost})
            </button>
          </div>
        </div>
      `;
    } else {
      let assignOptions = `<option value="idle" ${p.assignment === 'idle' ? 'selected' : ''}>閒置</option>`;
      if (p.jobClass === "novice") {
        assignOptions += `
          <option value="woodcutter" ${p.assignment === 'woodcutter' ? 'selected' : ''}>伐木 (⚡-2/秒)</option>
          <option value="miner" ${p.assignment === 'miner' ? 'selected' : ''}>採礦 (⚡-2/秒)</option>
          <option value="farmer" ${p.assignment === 'farmer' ? 'selected' : ''}>農耕 (⚡-1/秒)</option>
          <option value="merchant" ${p.assignment === 'merchant' ? 'selected' : ''}>經商 (⚡-1/秒)</option>
          ${stats.schoolMult > 0 ? `<option value="scholar" ${p.assignment === 'scholar' ? 'selected' : ''}>學者 (⚡-3/秒)</option>` : ''}
          ${stats.autoMithrilGen > 0 ? `<option value="mithrilSmith" ${p.assignment === 'mithrilSmith' ? 'selected' : ''}>秘銀鑄工 (⚡-3/秒)</option>` : ''}
        `;
      }
      assignOptions += `<option value="combat" ${p.assignment === 'combat' ? 'selected' : ''}>出征 (🛡️無疲勞)</option>`;

      const jobBadge = p.jobClass !== "novice" ? `<span class="roster-badge-class">${gameConfig.heroes[p.jobClass].name}</span>` : "";

      row.innerHTML = `
        <div class="roster-header">
          <div class="roster-name-block">
            <span class="roster-name">${getHeroIcon(p.jobClass)} ${p.name} <span style="font-size:0.75rem; opacity:0.75;">${genderSym}${faithSym}</span> (Lv.${p.level})</span>
            ${jobBadge}
          </div>
          <div class="roster-header-actions" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
            ${knowledgeBtnHtml}
            ${exileBtnHtml}
          </div>
        </div>
        <div class="roster-body-box">
          ${hpBarHtml}
          ${statsHtml}
          <div class="roster-assign-row">
            <span style="font-size: 0.85rem; color: #94a3b8; font-weight: 600;">當前指派任務</span>
            <select onchange="changeResidentAssignment('${p.id}', this.value)" class="roster-assign-select">
              ${assignOptions}
            </select>
          </div>
        </div>
      `;
    }
    
    populationRoster.appendChild(row);
  });
}

function renderTempleRoster() {
  const templeRoster = document.getElementById("templeRoster");
  if (!templeRoster) return;

  const active = document.activeElement;
  if (active && active.tagName === "SELECT" && templeRoster.contains(active)) {
    return;
  }

  templeRoster.innerHTML = "";

  const eligibleHeroes = getSortedPopulation().filter(p => 
    (p.level >= 5 && p.jobClass === "novice") || 
    (p.level === 9 && p.exp >= window.getReqExp(9))
  );

  if (eligibleHeroes.length === 0) {
    templeRoster.innerHTML = `
      <div class="empty-inv" style="text-align: center; color: #94a3b8; font-size: 0.9rem; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.05);">
        👼 神殿光芒閃耀，目前沒有滿足條件的冒險者。<br>
        <span style="font-size:0.7rem; opacity:0.8;">(需 Lv.5 以上流浪者，或 Lv.9 等待升級考考驗)</span>
      </div>
    `;
    return;
  }

  eligibleHeroes.forEach(p => {
    const canPromote = p.level >= 5 && p.jobClass === "novice";
    const needsExam = p.level === 9 && p.exp >= window.getReqExp(9);
    
    const genderSym = p.gender === 'female' ? '♀️' : '♂️';
    const faithSym = p.faith ? '✨' : '🪐';
    
    const availableClasses = window.checkEligibleClasses(p);

    let actionHTML = "";
    if (canPromote) {
      const optionsHTML = availableClasses.map(k => `<option value="${k}">${gameConfig.heroes[k].name}</option>`).join("");
      actionHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.6rem; border-radius: 6px;">
          <span style="font-size: 0.75rem; color: #fcd34d; font-weight:bold;">💡 覺醒轉職選擇 (Lv.${p.level})：</span>
          <div style="display: flex; gap: 0.5rem;">
            <select id="temple_promote_${p.id}" class="roster-assign-select" style="flex: 1; font-size: 0.85rem;">
              <option value="">-- 選擇新職業 --</option>
              ${optionsHTML}
            </select>
            <button class="roster-action-btn btn-promote" style="white-space: nowrap; padding: 0.4rem 0.75rem;" onclick="window.templePromoteResident('${p.id}')">✨ 轉職</button>
          </div>
        </div>
      `;
    }
    
    if (needsExam) {
      actionHTML += `
        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; background: rgba(96,165,250,0.15); border: 1px solid rgba(96,165,250,0.3); padding: 0.6rem; border-radius: 6px;">
          <span style="font-size: 0.75rem; color: #93c5fd; font-weight:bold;">👑 神之晉升殿試 (突破至 Lv.10)：</span>
          <button class="roster-action-btn btn-exam" style="width: 100%; padding: 0.45rem !important; font-size: 0.85rem !important; font-weight:bold;" onclick="openExamModal('${p.id}', 'mathLevel10')">📖 進入考場挑戰</button>
        </div>
      `;
    }

    const card = document.createElement("div");
    card.className = "roster-card";
    card.style.border = "1px solid rgba(244, 114, 182, 0.25)";
    card.style.background = "linear-gradient(135deg, rgba(244,114,182,0.05) 0%, rgba(0,0,0,0.25) 100%)";
    
    card.innerHTML = `
      <div class="roster-header" style="border-bottom: 1px solid rgba(244,114,182,0.1); padding-bottom: 0.4rem;">
        <div class="roster-name-block" style="display:flex; flex-direction:column; gap:0.2rem; width: 100%;">
          <div style="display:flex; justify-content:space-between; align-items:center; width: 100%;">
            <span class="roster-name" style="color: #fdf2f8; font-weight:bold; font-size:0.95rem;">
              ${getHeroIcon(p.jobClass)} ${p.name} <span style="font-size:0.75rem; opacity:0.8; font-weight:normal;">${genderSym}${faithSym}</span>
            </span>
            <span class="roster-badge-class" style="background: rgba(244,114,182,0.2); border:1px solid rgba(244,114,182,0.4); color:#f9a8d4; font-weight:bold; padding: 0.15rem 0.4rem; font-size: 0.7rem;">Lv.${p.level} ${gameConfig.heroes[p.jobClass].name}</span>
          </div>
        </div>
      </div>
      <div class="roster-body-box" style="padding-top: 0.25rem;">
        ${actionHTML}
      </div>
    `;
    templeRoster.appendChild(card);
  });
}

window.templePromoteResident = function(id) {
  const select = document.getElementById(`temple_promote_${id}`);
  if (!select || !select.value) {
    showToast("請先選擇職業！", "error");
    return;
  }
  const p = state.population.find(r => r.id === id);
  if (p) {
    if (select) select.blur();
    // Open Qualification Exam Modal instead of instant promoting!
    window.openExamModal(id, 'mathPromote', select.value);
  }
};

window.exileResident = function(id) {
  const idx = state.population.findIndex(r => r.id === id);
  if (idx === -1) return;
  const p = state.population[idx];
  if (confirm(`😱 您確定要「流放」居民 ${p.name} 嗎？\n他將被放逐至荒野，且再也無法歸來！`)) {
    state.population.splice(idx, 1);
    state.party = state.party.filter(memberId => memberId !== id);
    showToast(`🥾 ${p.name} 已被流放出城...`, "warning");
    
    window.setDirty('popRoster');
    window.setDirty('heroSheets');
    window.setDirty('templeRoster');
    updateUI();
  }
};

window.infuseKnowledge = function(id) {
  const p = state.population.find(r => r.id === id);
  if (!p) return;
  
  if (p.jobClass !== "novice") {
    showToast("❌ 只有未轉職的流浪者可以接受知識灌頂！", "error");
    return;
  }
  
  if (p.level >= 10) {
    showToast("❌ 角色等級已達極限上限！", "error");
    return;
  }

  const req = window.getReqExp(p.level);
  const remainingExp = req - p.exp;
  const requiredKnowledge = remainingExp * 1000;
  
  if (state.knowledge < 1000) {
    showToast("❌ 城鎮累積知識不足，至少需要 1000 知識來轉化 1 EXP！", "error");
    return;
  }

  // Max out or consume all available knowledge to gain proportional EXP
  const spendLimit = Math.min(state.knowledge, requiredKnowledge);
  const actualSpend = Math.floor(spendLimit / 1000) * 1000;
  
  if (actualSpend <= 0) return;
  
  const expGained = actualSpend / 1000;
  
  state.knowledge -= actualSpend;
  p.exp += expGained;
  
  showToast(`📚 消耗了 ${actualSpend} 知識，注入 ${p.name} 的大腦，獲得了 ${expGained} EXP！`, "success");
  
  // Check for Level Up
  let currentReq = req;
  while (p.level < 10 && p.exp >= currentReq) {
    if (p.level === 9) {
      p.exp = currentReq;
      break;
    } else {
      p.exp -= currentReq;
      p.level += 1;
      showToast(`✨🆙 ${p.name} 的心靈開竅，等級提升至 Lv.${p.level}！`, "info");
      currentReq = window.getReqExp(p.level);
    }
  }
  
  window.setDirty('popRoster');
  window.setDirty('heroSheets');
  window.setDirty('templeRoster');
  updateUI();
};

window.reviveHero = function(id) {
  const p = state.population.find(r => r.id === id);
  if (!p) return;
  
  const reviveCost = p.level * 10;
  if (state.money < reviveCost) {
    showToast("❌ 國庫資金不足，支付不起急診費！", "error");
    return;
  }
  
  state.money -= reviveCost;
  const nextJob = p.previousAssignment || 'idle';
  p.assignment = nextJob; // Restore previous job!
  delete p.previousAssignment;
  
  const eff = calcEffStats(p);
  if (eff) {
    p.hp = eff.maxHp; // Restore HP
    p.mp = eff.maxMp; // Restore MP
  }
  
  showToast(`💖 聖光醫治成功！${p.name} 已返回：【${nextJob === 'idle' ? '閒置' : (nextJob === 'combat' ? '出征' : '工作岗位')}】`, "success");
  
  window.setDirty('popRoster');
  window.setDirty('heroSheets');
  window.setDirty('templeRoster');
  updateUI();
};

window.getHealMithrilCost = function(person, eff) {
  if (!person || !eff) return 0;
  const hpDeficit = Math.max(0, eff.maxHp - person.hp);
  const mpDeficit = Math.max(0, eff.maxMp - person.mp);
  if (hpDeficit <= 0 && mpDeficit <= 0) return 0;
  return Math.max(1, Math.ceil(person.level * 1.5 * (hpDeficit / eff.maxHp + mpDeficit / eff.maxMp)));
};

window.quickHealHero = function(personId, cost, currencyType = 'gold') {
  if (currencyType === 'mithril') {
    const currentMithril = state.mithril || 0;
    if (currentMithril < cost) {
      showToast("❌ 💠 秘銀幣不足，無法支付高級醫療費！", "error");
      return;
    }
  } else {
    if (state.money < cost) {
      showToast("❌ 💰 金錢不足，無法支付普通醫療費！", "error");
      return;
    }
  }

  const person = state.population.find(p => p.id === personId);
  if (!person) return;
  
  const eff = calcEffStats(person);
  if (!eff) return;
  
  if (currencyType === 'mithril') {
    state.mithril = (state.mithril || 0) - cost;
  } else {
    state.money -= cost;
  }
  
  person.hp = eff.maxHp;
  person.mp = eff.maxMp;
  
  // Restore duty if manually cured from hospital
  if (person.assignment === 'hospital') {
    const diff = state.difficulty || 'normal';
    let nextJob = 'idle';
    if (diff === 'easy' || diff === 'test') {
      nextJob = person.previousAssignment || 'idle';
    }
    
    person.assignment = nextJob;
    delete person.previousAssignment;
    
    if (nextJob === 'idle') {
      showToast(`💚 ${person.name} 已痊癒出院，狀態調整為【閒置】！`, "success");
    } else {
      showToast(`💚 ${person.name} 已痊癒出院並重返：【${nextJob === 'combat' ? '出征' : '工作岗位'}】！`, "success");
    }
  } else {
    if (currencyType === 'mithril') {
      showToast(`✨ 高級聖光醫治！${person.name} 的體力與魔力完全恢復！`, "success");
    } else {
      showToast(`💚 ${person.name} 已完全恢復健康與魔力！`, "success");
    }
  }
  
  window.setDirty('popRoster');
  window.setDirty('heroSheets');
  window.setDirty('templeRoster');
  updateUI();
};

window.changeResidentAssignment = function(id, newAssignment) {
  const p = state.population.find(r => r.id === id);
  if (p) {
    // Hospitalized can't be reassigned normally
    if (p.assignment === 'hospital') return;
    
    if (newAssignment === 'combat') {
      const combatants = state.population.filter(r => r.assignment === 'combat');

      if (combatants.length >= 6 && p.assignment !== 'combat') {
        showToast("出征隊伍已滿 (上限6人)！", "error");
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
    
    window.setDirty('popRoster');
    window.setDirty('heroSheets');
    updateUI();
  }
};


// Dynamic Exam Pool System for "Educational Gamification"
let currentExamContext = null;

// Fisher-Yates algorithm to shuffle options and prevent position recall
function shuffleOptions(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

window.openExamModal = function(residentId, examType, targetJobClass = null) {
  let p = null;
  if (residentId) {
    p = state.population.find(r => r.id === residentId);
    if (!p) return;
  }
  
  const pool = EXAM_BANKS[examType];
  if (!pool || pool.length === 0) return;
  
  // Pull question & shuffle options
  const questionObj = pool[Math.floor(Math.random() * pool.length)];
  const shuffledOpts = shuffleOptions(questionObj.opts);
  
  // Store into localized context
  currentExamContext = {
    id: residentId,
    type: examType,
    targetJob: targetJobClass,
    shuffledOpts: shuffledOpts,
    correctAnswerText: questionObj.ans
  };
  
  const titleEl = document.getElementById('examTitle');
  const descEl = document.getElementById('examDesc');
  const questionEl = document.getElementById('examQuestion');
  const optionsListEl = document.getElementById('examOptionsList');
  const modal = document.getElementById('examModal');
  
  // Dynamic Title configuration
  if (examType === 'mathPromote') {
    titleEl.innerHTML = `🎓【${p.name}】職業資格考試`;
    const targetName = gameConfig.heroes[targetJobClass]?.name || "";
    descEl.innerText = `※ 晉升為「${targetName}」的資格考核。需解出此數學題！`;
  } else if (examType === 'mathLevel10') {
    titleEl.innerHTML = `👑【${p.name}】神之晉升殿試`;
    descEl.innerText = `※ 突破至 Lv.10 極限上限之測驗。需解出此數學題！`;
  } else if (examType === 'englishShop') {
    titleEl.innerHTML = `🛍️【神秘商店】英文學力挑戰`;
    descEl.innerText = `※ 每日常規刷新上限 (10次) 已滿！答對此題英文即可免費進貨！`;
  } else if (examType === 'scienceHunt') {
    titleEl.innerHTML = `🌿【自然學堂】自動討伐安全考核`;
    descEl.innerText = `※ 本次高階副本掛機已滿 10 次！請解答自然問題解開安全鎖，繼續出征打寶！`;
  }
  
  // Render question and build option rows
  questionEl.innerHTML = questionObj.q;
  optionsListEl.innerHTML = shuffledOpts.map((opt, index) => {
    return `<button class="build-btn" style="padding: 0.8rem; text-align: center; justify-content: center; background: #334155; border-radius: 6px; font-size: 1rem;" onclick="window.submitExam(${index})">${opt}</button>`;
  }).join('');
  
  if (modal) modal.style.display = 'flex';
  
  // Trigger KaTeX Auto-Renderer for beautiful LaTeX formulas!
  if (typeof renderMathInElement === 'function') {
    setTimeout(() => {
      renderMathInElement(modal, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ],
        throwOnError: false
      });
    }, 20);
  }
};

window.submitExam = function(selectedIndex) {
  const modal = document.getElementById('examModal');
  if (!currentExamContext) return;
  
  let p = null;
  if (currentExamContext.id) {
    p = state.population.find(r => r.id === currentExamContext.id);
    if (!p) {
      if (modal) modal.style.display = 'none';
      currentExamContext = null;
      return;
    }
  }
  
  const selectedAnswerText = currentExamContext.shuffledOpts[selectedIndex];
  const isCorrect = selectedAnswerText === currentExamContext.correctAnswerText;
  
  if (isCorrect) {
    if (currentExamContext.type === 'mathPromote') {
      // Apply Dynamic Class promotion with Villager Level inheritance!
      p.promotedLevel = p.level; // Record their level when they transitioned!
      p.jobClass = currentExamContext.targetJob;
      p.level = 1;
      p.exp = 0;
      p.assignment = 'idle';
      showToast(`🎉 恭喜！${p.name} 通過考核，順利轉職為 ${gameConfig.heroes[p.jobClass].name}！`, "success");
    } else if (currentExamContext.type === 'mathLevel10') {
      // Apply Dynamic Cap Break!
      p.level = 10;
      p.exp = 0;
      showToast(`🎓 恭喜！${p.name} 成功突破神聖殿試，晉升至 Lv.10 極限層次！`, "success");
    } else if (currentExamContext.type === 'englishShop') {
      // Trigger free shop refresh
      rollSecretShop(false);
      renderSecretShop();
      if (!state.secretShop.refreshCount) state.secretShop.refreshCount = 0;
      state.secretShop.refreshCount++;
      showToast(`🎉 英文正確！獲得了一次免費的神秘商店刷新機會！`, "success");
    } else if (currentExamContext.type === 'scienceHunt') {
      // Unlock the AFK gating
      state.huntGateCount = 0;
      showToast(`🎉 解答正確！成功突破大自然安全鎖，出征隊伍恢復掛機戰鬥！`, "success");
      
      // Auto-resume spawn if still active on hunt
      if (combatState.active && combatState.target === "hunt") {
        spawnEnemy();
        logBattle(`➡ 自然神殿護罩散去，出征隊伍再度遭遇下一波對手！`, "log-item-heal");
      }
    }
    
    window.setDirty('popRoster');
    window.setDirty('heroSheets');
    window.setDirty('templeRoster');
    updateUI();
  } else {
    if (currentExamContext.type === 'mathPromote') {
      showToast(`❌ 答錯了！數學運算失誤，${p.name} 的轉職申請被拒絕了！`, "error");
    } else if (currentExamContext.type === 'mathLevel10') {
      showToast(`❌ 答錯了！${p.name} 無法參透數理奧秘，極限突破失敗！`, "error");
    } else if (currentExamContext.type === 'englishShop') {
      showToast(`❌ 答錯了！單字拼讀有誤，無法獲得額外刷新次數，請重試！`, "error");
    } else if (currentExamContext.type === 'scienceHunt') {
      showToast(`❌ 答錯了！知識儲備不足，無法解除大自然考核鎖，請重新作答解鎖戰鬥！`, "error");
    }
  }
  
  if (modal) modal.style.display = 'none';
  currentExamContext = null;
};

// Check eligible job classes based on docs/fight_rule.md guidelines
window.checkEligibleClasses = function(p) {
  if (!p) return [];
  const eligible = [];
  const b = p.baseStats || {};
  const isMale = p.gender === 'male';
  const isFemale = p.gender === 'female';
  const hasFaith = p.faith === true;

  // 1. 勇者 (Warrior): 男，ATK > 5, DEF > 5
  if (isMale && (b.atk || 0) > 5 && (b.def || 0) > 5) eligible.push("warrior");

  // 2. 野蠻人 (Barbarian): 男，ATK > 7, HP > 70
  if (isMale && (b.atk || 0) > 7 && (b.hp || 0) > 70) eligible.push("barbarian");

  // 3. 盾戰士 (Shield Warrior): 男，DEF > 7, HP > 70
  if (isMale && (b.def || 0) > 7 && (b.hp || 0) > 70) eligible.push("shieldWarrior");

  // 4. 盜賊 (Rogue): 幸運 > 15, 暴擊率 > 7% (0.07)
  if ((b.lucky || 0) > 15 && (b.critRate || 0) > 0.07) eligible.push("rogue");

  // 5. 弓箭手 (Archer): ATK > 7, 暴擊率 > 7%
  if ((b.atk || 0) > 7 && (b.critRate || 0) > 0.07) eligible.push("archer");

  // 6. 槍手 (Gunner): ATK > 7, 暴擊率 > 7%
  if ((b.atk || 0) > 7 && (b.critRate || 0) > 0.07) eligible.push("gunner");

  // 7. 拳擊手 (Fighter): ATK > 7, 攻速 > 0.7
  if ((b.atk || 0) > 7 && (b.spd || 0) > 0.7) eligible.push("fighter");

  // 8. 法師 (Mage): MP > 30, 魔攻 > 7
  if ((b.mp || 0) > 30 && (b.matk || 0) > 7) eligible.push("mage");

  // 9. 巫師 (Wizard): MP > 30, 魔攻 > 7
  if ((b.mp || 0) > 30 && (b.matk || 0) > 7) eligible.push("wizard");

  // 🌟 Late Game Late-Game Holy Classes (Require strict Faith and high stats)
  // 10. 牧師 (Priest): 女，MP > 40, MDEF > 8, 幸運 > 15, 信仰
  if (hasFaith && isFemale && (b.mp || 0) > 40 && (b.mdef || 0) > 8 && (b.lucky || 0) > 15) eligible.push("priest");

  // 11. 聖騎士 (Paladin): 男，ATK > 7, DEF > 7, MATK > 6, MDEF > 6, 信仰
  if (hasFaith && isMale && (b.atk || 0) > 7 && (b.def || 0) > 7 && (b.matk || 0) > 6 && (b.mdef || 0) > 6) eligible.push("paladin");

  // 12. 道士 (Taoist): ATK > 7, DEF > 7, MATK > 6, MDEF > 6, 信仰
  if (hasFaith && (b.atk || 0) > 7 && (b.def || 0) > 7 && (b.matk || 0) > 6 && (b.mdef || 0) > 6) eligible.push("taoist");

  // 13. 和尚 (Monk): 男，ATK > 7, DEF > 7, MATK > 6, MDEF > 6, 信仰
  if (hasFaith && isMale && (b.atk || 0) > 7 && (b.def || 0) > 7 && (b.matk || 0) > 6 && (b.mdef || 0) > 6) eligible.push("monk");

  return eligible;
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
    critRate: baseConfig.critRate + (person.baseStats ? (person.baseStats.critRate || 0) : 0), 
    critDmg: baseConfig.critDmg || 1.5, 
    lucky: baseConfig.lucky + (person.baseStats ? (person.baseStats.lucky || 0) : 0),
    pdr: 0, mdr: 0, udr: 0
  };
  
  // Stat scaling based on level & job transition inheritance
  const g = baseConfig.growth;
  const isPromoted = person.jobClass !== "novice";
  
  if (isPromoted) {
    const noviceConfig = gameConfig.heroes["novice"];
    const ng = noviceConfig ? noviceConfig.growth : null;
    const promotedLevel = person.promotedLevel || 5;
    const noviceLevels = promotedLevel - 1;
    const noviceScaleCurve = Math.pow(1.3, noviceLevels);
    
    // 1. Accumulate Novice (Villager) Growth
    let nHp = 0, nMp = 0, nAtk = 0, nDef = 0, nMatk = 0, nMdef = 0;
    let nSpd = 0, nHit = 0, nEvasion = 0, nCrit = 0, nLucky = 0;
    
    if (ng) {
      nHp = Math.floor(noviceLevels * (ng.hp || 0) * noviceScaleCurve);
      nMp = Math.floor(noviceLevels * (ng.mp || 0) * noviceScaleCurve);
      nAtk = Math.floor(noviceLevels * (ng.atk || 0) * noviceScaleCurve);
      nDef = Math.floor(noviceLevels * (ng.def || 0) * noviceScaleCurve);
      nMatk = Math.floor(noviceLevels * (ng.matk || 0) * noviceScaleCurve);
      nMdef = Math.floor(noviceLevels * (ng.mdef || 0) * noviceScaleCurve);
      nSpd = noviceLevels * (ng.spd || 0);
      nHit = noviceLevels * (ng.hit || 0);
      nEvasion = noviceLevels * (ng.evasion || 0);
      nCrit = noviceLevels * (ng.critRate || 0);
      nLucky = Math.floor(noviceLevels * (ng.lucky || 0) * (1 + noviceLevels * 0.08));
    }
    
    // 2. Accumulate Job Class Growth (from Lv.1 to current level)
    let jHp = 0, jMp = 0, jAtk = 0, jDef = 0, jMatk = 0, jMdef = 0;
    let jSpd = 0, jHit = 0, jEvasion = 0, jCrit = 0, jLucky = 0;
    
    const jobLevels = Math.max(0, person.level - 1);
    const jobScaleCurve = Math.pow(1.3, person.level - 1);
    
    if (g && jobLevels > 0) {
      jHp = Math.floor(jobLevels * (g.hp || 0) * jobScaleCurve);
      jMp = Math.floor(jobLevels * (g.mp || 0) * jobScaleCurve);
      jAtk = Math.floor(jobLevels * (g.atk || 0) * jobScaleCurve);
      jDef = Math.floor(jobLevels * (g.def || 0) * jobScaleCurve);
      jMatk = Math.floor(jobLevels * (g.matk || 0) * jobScaleCurve);
      jMdef = Math.floor(jobLevels * (g.mdef || 0) * jobScaleCurve);
      jSpd = jobLevels * (g.spd || 0);
      jHit = jobLevels * (g.hit || 0);
      jEvasion = jobLevels * (g.evasion || 0);
      jCrit = jobLevels * (g.critRate || 0);
      jLucky = Math.floor(jobLevels * (g.lucky || 0) * (1 + jobLevels * 0.08));
    }
    
    // 3. Apply combined growth to stats
    eff.maxHp = eff.maxHp + nHp + jHp;
    eff.maxMp = eff.maxMp + nMp + jMp;
    eff.atk = eff.atk + nAtk + jAtk;
    eff.def = eff.def + nDef + jDef;
    eff.matk = eff.matk + nMatk + jMatk;
    eff.mdef = eff.mdef + nMdef + jMdef;
    eff.spd = +(eff.spd + nSpd + jSpd).toFixed(2);
    eff.hit = +(eff.hit + nHit + jHit).toFixed(2);
    eff.evasion = +(eff.evasion + nEvasion + jEvasion).toFixed(2);
    eff.critRate = +(eff.critRate + nCrit + jCrit).toFixed(2);
    eff.lucky = eff.lucky + nLucky + jLucky;
    
  } else {
    // Standard Novice or unpromoted character growth
    const levelsGained = person.level - 1;
    const scaleCurve = Math.pow(1.3, levelsGained);
    
    if (g) {
      eff.maxHp = Math.floor(eff.maxHp + levelsGained * (g.hp || 0) * scaleCurve);
      eff.maxMp = Math.floor(eff.maxMp + levelsGained * (g.mp || 0) * scaleCurve);
      eff.atk = Math.floor(eff.atk + levelsGained * (g.atk || 0) * scaleCurve);
      eff.def = Math.floor(eff.def + levelsGained * (g.def || 0) * scaleCurve);
      eff.matk = Math.floor(eff.matk + levelsGained * (g.matk || 0) * scaleCurve);
      eff.mdef = Math.floor(eff.mdef + levelsGained * (g.mdef || 0) * scaleCurve);
      
      eff.spd = +(eff.spd + levelsGained * (g.spd || 0)).toFixed(2);
      eff.hit = +(eff.hit + levelsGained * (g.hit || 0)).toFixed(2);
      eff.evasion = +(eff.evasion + levelsGained * (g.evasion || 0)).toFixed(2);
      eff.critRate = +(eff.critRate + levelsGained * (g.critRate || 0)).toFixed(2);
      eff.lucky = Math.floor(eff.lucky + levelsGained * (g.lucky || 0) * (1 + levelsGained * 0.08));
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
  }

  // Add equipment
  if (person.eq) {
    Object.values(person.eq).forEach(item => {
      if (!item) return;
    // main stat
    if (item.mainStat && item.mainStatVal) {
      if (eff[item.mainStat] !== undefined) {
        eff[item.mainStat] += item.mainStatVal;
        // CRITICAL FIX: If it boosts hp/mp, MUST mirror to maxHp/maxMp to increase the actual stat caps!
        if (item.mainStat === "hp") eff.maxHp += item.mainStatVal;
        if (item.mainStat === "mp") eff.maxMp += item.mainStatVal;
      }
    }
    // extra stats
    if (item.extras) {
      Object.entries(item.extras).forEach(([stat, val]) => {
        if (eff[stat] !== undefined) {
          // Normal stats are whole numbers, percentages are stored as 1-100 integers but we need them as 0.01
          if (["hit", "evasion", "critRate", "pdr", "mdr", "udr"].includes(stat)) {
            eff[stat] += val / 100;
          } else if (stat === "critDmg") {
            eff[stat] += val / 100; // e.g. +50 critDmg -> +0.5x
          } else {
            eff[stat] += val;
            // CRITICAL FIX: Also mirror extra hp/mp stats onto actual cap variables!
            if (stat === "hp") eff.maxHp += val;
            if (stat === "mp") eff.maxMp += val;
          }
        }
      });
    }
    });
  }
  
  // Calculate dynamic Crit Damage based on lucky (2x to 10x, base 2.0, +0.1 per point)
  eff.critDmg = Math.max(2, Math.min(10, 2 + (eff.lucky / 10)));

  // Normalize
  eff.spd = Math.max(0.2, eff.spd);
  eff.hit = Math.min(1.0, eff.hit); // Max 100%
  eff.evasion = Math.min(0.9, eff.evasion); // Max 90%
  eff.critRate = Math.min(1.0, eff.critRate); // Max 100%
  // Cap Damage Reduction to prevent total immortality (Max 75%)
  eff.pdr = Math.min(0.75, eff.pdr);
  eff.mdr = Math.min(0.75, eff.mdr);
  eff.udr = Math.min(0.75, eff.udr);
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
      } else if (["pdr", "mdr", "udr"].includes(randomStat)) {
        // DR scaling: milder curves to ensure late game feels impactful but doesn't break game limits
        const baseFactor = randomStat === "udr" ? 1.0 : 1.5;
        statVal = Math.ceil(baseFactor * Math.pow(1.25, level - 1) * (Math.random() * 0.5 + 0.5));
        statVal = Math.min(randomStat === "udr" ? 12 : 18, statVal); // Safe limit cap per single piece roll
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
function checkAndResetShopRefresh() {
  const today = new Date().toLocaleDateString();
  if (!state.secretShop) {
    state.secretShop = { items: [], lastLevel: 1, refreshCount: 0, lastRefreshDate: today };
  }
  if (state.secretShop.lastRefreshDate !== today) {
    state.secretShop.lastRefreshDate = today;
    state.secretShop.refreshCount = 0;
  }
}

function getSecretRefreshCost(level) {
  return Math.max(5, level * 2);
}

function getSecretShopPrice(level, rarity) {
  return gameConfig.eqSpecs.price[level] || 100;
}

function getSecretShopMithrilCost(level, rarity) {
  const baseMithril = { normal: 0, magic: 2, rare: 8, epic: 25, legend: 80 };
  const base = baseMithril[rarity] || 0;
  if (base === 0) return 0;
  return Math.ceil(base * Math.pow(1.2, level - 1));
}

function rollSecretShop(isInit = false) {
  checkAndResetShopRefresh();
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
    const mithrilCost = getSecretShopMithrilCost(level, rarity);
    
    items.push({
      uid: "secret_" + Date.now() + "_" + i + "_" + Math.floor(Math.random() * 1000),
      item: generated,
      cost: price,
      mithrilCost: mithrilCost,
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
  
  checkAndResetShopRefresh();
  const dailyUsed = state.secretShop.refreshCount || 0;
  if (secretRefreshCostText) {
    if (dailyUsed >= 10) {
      secretRefreshCostText.textContent = "📝 英文挑戰 (獲得額外免費刷新)";
    } else {
      secretRefreshCostText.textContent = `🔁 刷新貨架 (💠 ${refreshCost} / 剩 ${10 - dailyUsed}次)`;
    }
  }
  
  // If items list is empty, auto-roll one!
  if (!state.secretShop.items || state.secretShop.items.length === 0) {
    rollSecretShop(true);
  }
  
  state.secretShop.items.forEach(entry => {
    const { item, cost, mithrilCost, soldOut } = entry;
    const mithCost = mithrilCost || 0;
    const rSpec = gameConfig.eqSpecs.rarities[item.rarity];
    const rColor = rSpec.color;
    
    const card = document.createElement("div");
    card.className = `secret-item-card ${soldOut ? "sold-out" : ""}`;
    card.style.borderColor = `${rColor}50`;
    
    // Icon and tags
    const icon = getSlotIcon(item.slot, item.level);
    
    // Generate stats HTML strings
    let statsHtml = `<div class="secret-item-main-stat">+ ${gameConfig.eqSpecs.statNames[item.mainStat]}: ${item.mainStatVal}</div>`;
    Object.entries(item.extras).forEach(([key, val]) => {
      const isPct = ['hit', 'evasion', 'critRate', 'critDmg', 'lifesteal', 'mlifesteal', 'pdr', 'mdr', 'udr'].includes(key);
      statsHtml += `<div class="secret-item-extra-stat">+ ${gameConfig.eqSpecs.statNames[key]}: ${val}${isPct ? '%' : ''}</div>`;
    });
    
    let buyBtnHtml = `💰 ${cost.toLocaleString()}`;
    if (mithCost > 0) {
      buyBtnHtml += ` | 💠 ${mithCost.toLocaleString()}`;
    }
    buyBtnHtml += ` 購買`;

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
        ${buyBtnHtml}
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
        const currentMithril = state.mithril || 0;
        if (currentMithril < mithCost) {
          showToast("💠 秘銀幣不足，買不起這件神裝！", "error");
          return;
        }
        if (state.inventory.length >= 24) {
          showToast("🎒 背包已滿，裝不下了！", "error");
          return;
        }
        
        // Deduct cost and deliver item
        state.money -= cost;
        state.mithril = currentMithril - mithCost;
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
    checkAndResetShopRefresh();
    const dailyUsed = state.secretShop.refreshCount || 0;
    
    if (dailyUsed >= 10) {
      // Daily 10 limit hit: Redirect to English scholar exam for FREE refreshes!
      window.openExamModal(null, 'englishShop', null);
      return;
    }
    
    const level = parseInt(secretShopLevelSelect.value);
    const cost = getSecretRefreshCost(level);
    const currentMithril = state.mithril || 0;
    
    if (currentMithril < cost) {
      showToast(`💠 秘銀幣不足！刷新貨架需要 ${cost} 秘銀幣。`, "error");
      return;
    }
    
    state.mithril = currentMithril - cost;
    if (!state.secretShop.refreshCount) state.secretShop.refreshCount = 0;
    state.secretShop.refreshCount++;
    
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
    
    checkAndResetShopRefresh();
    const dailyUsed = state.secretShop.refreshCount || 0;
    if (secretRefreshCostText) {
      if (dailyUsed >= 10) {
        secretRefreshCostText.textContent = "📝 英文挑戰 (獲得額外免費刷新)";
      } else {
        secretRefreshCostText.textContent = `🔁 刷新貨架 (💠 ${cost} / 剩 ${10 - dailyUsed}次)`;
      }
    }
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

function getMobAvatar(name, level, defaultAvatar) {
  if (level >= 8) {
    const tier3 = {
      "史萊姆": "🧊",
      "憤怒蘑菇": "🥀",
      "飛天萌蝠": "🐉",
      "嘟嘟鳥": "🦚",
      "迷你野狼": "🦁"
    };
    return tier3[name] || defaultAvatar;
  } else if (level >= 5) {
    const tier2 = {
      "史萊姆": "🌊",
      "憤怒蘑菇": "🍁",
      "飛天萌蝠": "🦅",
      "嘟嘟鳥": "🦆",
      "迷你野狼": "🦊"
    };
    return tier2[name] || defaultAvatar;
  }
  return defaultAvatar;
}


function getSlotIcon(s, level = 1) {
  const tier1 = { rhand:'🗡️', lhand:'🛡️', helm:'🪖', body:'🥋', pants:'👖', shoes:'👞' };
  const tier2 = { rhand:'⚔️', lhand:'🪞', helm:'🥽', body:'🧥', pants:'🩳', shoes:'🥾' };
  const tier3 = { rhand:'🔱', lhand:'🔮', helm:'👑', body:'🦸', pants:'🦿', shoes:'🚀' };
  
  let set = tier1;
  if (level >= 8) {
    set = tier3;
  } else if (level >= 5) {
    set = tier2;
  }
  return set[s] || '❓';
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
    let icon = getSlotIcon(item.slot, item.level);
    
    el.innerHTML = `${icon}<span class="item-lv-tag">L${item.level}</span>`;
    
    // Generate detail string
    let title = `${item.name}\n[${gameConfig.eqSpecs.slots[item.slot].name}]\n+ ${gameConfig.eqSpecs.statNames[item.mainStat]}: ${item.mainStatVal}`;
    Object.entries(item.extras).forEach(([k, v]) => {
      const isPct = ['hit', 'evasion', 'critRate', 'critDmg', 'lifesteal', 'mlifesteal', 'pdr', 'mdr', 'udr'].includes(k);
      title += `\n+ ${gameConfig.eqSpecs.statNames[k]}: ${v}${isPct ? '%' : ''}`;
    });
    title += "\n\n👉 點擊裝備 / 雙擊販售";
    
    el.title = title;
    
    // Handle Equip selection / Double-click to sell debounce
    let clickTimer = null;
    el.addEventListener("click", () => {
      clickTimer = setTimeout(() => {
        window.openEquipModal(index);
      }, 220); // 220ms window for potential double click
    });

    // Handle sell
    el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      const basePrice = gameConfig.eqSpecs.price[item.level] || 100;
      const sellVal = Math.ceil(basePrice * 0.3);
      state.inventory.splice(index, 1);
      state.money += sellVal;
      showToast(`💰 賣出裝備獲得 ${window.formatNumberShort(sellVal)}`, "info");
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
  
  // Filter healthy and sort by level DESC automatically
  const eligible = state.population
    .filter(p => p.assignment !== 'hospital')
    .sort((a, b) => b.level - a.level);

  if (eligible.length === 0) {
    showToast("目前沒有健康的村民或英雄可以裝備！", "error");
    return;
  }
  
  const modal = document.getElementById("equipModal");
  const itemNameEl = document.getElementById("equipItemName");
  const listEl = document.getElementById("equipChoicesList");
  
  if (!modal || !itemNameEl || !listEl) return;
  
  const rarColor = gameConfig.eqSpecs.rarities[item.rarity].color;
  itemNameEl.innerHTML = `裝備：<span style="color:${rarColor}; font-weight:bold;">${item.name}</span> (${gameConfig.eqSpecs.rarities[item.rarity].name})`;
  listEl.innerHTML = "";
  
  eligible.forEach(p => {
    const btn = document.createElement("button");
    btn.className = "build-btn";
    btn.style.display = "flex";
    btn.style.justifyContent = "space-between";
    btn.style.alignItems = "center";
    btn.style.padding = "0.75rem 1rem";
    btn.style.width = "100%";
    btn.style.marginBottom = "0.5rem";
    
    // Compare attributes against currently equipped
    const curEquipped = p.eq[item.slot];
    let diffHtml = "";
    const statName = gameConfig.eqSpecs.statNames[item.mainStat] || "";
    if (curEquipped) {
      const diff = item.mainStatVal - curEquipped.mainStatVal;
      if (diff > 0) {
        diffHtml = `<span style="color:#10b981; font-weight:800; font-size:0.75rem;">${statName} +${diff} ↑</span>`;
      } else if (diff < 0) {
        diffHtml = `<span style="color:#ef4444; font-weight:800; font-size:0.75rem;">${statName} ${diff} ↓</span>`;
      } else {
        diffHtml = `<span style="color:#94a3b8; font-size:0.75rem;">${statName} 無增減</span>`;
      }
    } else {
      diffHtml = `<span style="color:#10b981; font-weight:800; font-size:0.75rem;">${statName} +${item.mainStatVal} ↑</span>`;
    }

    const icon = getHeroIcon(p.jobClass);
    btn.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <span style="font-size:1.5rem;">${icon}</span>
        <div style="text-align:left;">
          <div style="font-weight:bold; color:#f8fafc;">${p.name}</div>
          <div style="font-size:0.75rem; color:#94a3b8;">${gameConfig.heroes[p.jobClass].name} (Lv.${p.level})</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem;">
        ${diffHtml}
        <span style="font-size:0.8rem; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); padding:0.2rem 0.5rem; border-radius:6px; color:#e2e8f0; white-space:nowrap;">選擇</span>
      </div>
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

// Detailed modal to view equipped item specifics & confirm unequip safely
window.openUnequipModal = function(personId, slotKey) {
  const person = state.population.find(p => p.id === personId);
  if (!person) return;
  const item = person.eq[slotKey];
  if (!item) return;
  
  const modal = document.getElementById("unequipModal");
  const card = document.getElementById("unequipCard");
  const icon = document.getElementById("unequipItemIcon");
  const title = document.getElementById("unequipItemTitle");
  const rarityEl = document.getElementById("unequipItemRarity");
  const slotEl = document.getElementById("unequipItemSlot");
  const lvEl = document.getElementById("unequipItemLevel");
  const statsEl = document.getElementById("unequipItemStats");
  const confirmBtn = document.getElementById("btnConfirmUnequip");
  
  if (!modal || !card) return;
  
  const rarCfg = gameConfig.eqSpecs.rarities[item.rarity];
  card.style.borderColor = rarCfg.color;
  
  icon.textContent = getSlotIcon(slotKey, item.level);
  title.textContent = item.name;
  title.style.color = rarCfg.color;
  
  rarityEl.textContent = `[ ${rarCfg.name} ]`;
  rarityEl.style.color = rarCfg.color;
  
  slotEl.textContent = gameConfig.eqSpecs.slots[slotKey].name;
  lvEl.textContent = `Lv.${item.level}`;
  
  const statName = gameConfig.eqSpecs.statNames[item.mainStat] || "";
  statsEl.textContent = `${statName} +${item.mainStatVal}`;
  
  confirmBtn.onclick = () => {
    if (state.inventory.length >= 24) {
      showToast("🎒 背包空間不足！無法卸下裝備。", "error");
      return;
    }
    person.eq[slotKey] = null;
    state.inventory.push(item);
    showToast(`🎒 已將 ${item.name} 收回角色背包中。`, "info");
    modal.style.display = "none";
    renderInventory();
    updateUI();
  };
  
  modal.style.display = "flex";
};

function assignCombatRows(combatParty) {
  const melee = combatParty.filter(p => !isRangedHero(p.jobClass));
  const ranged = combatParty.filter(p => isRangedHero(p.jobClass));
  
  // Up to 3 melee units in front row, rest (other melee + all ranged) in back row
  const frontList = melee.slice(0, 3);
  const backList = [...melee.slice(3), ...ranged];
  
  frontList.forEach(p => p.isFrontRow = true);
  backList.forEach(p => p.isFrontRow = false);
  
  return { frontList, backList };
}

// Render Hero sheets (updates stats & paperdoll display)
function updateHeroSheets() {
  // Priority sorting: 1st prioritize active Combat assignment, 2nd descending by level
  state.population.sort((a, b) => {
    const aCombat = a.assignment === 'combat' ? 1 : 0;
    const bCombat = b.assignment === 'combat' ? 1 : 0;
    if (aCombat !== bCombat) {
      return bCombat - aCombat;
    }
    return b.level - a.level;
  });

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

  getSortedPopulation().forEach(p => {
    // 1. Render in Guild
    const card = document.createElement("div");
    card.className = "hero-profile-card";
    card.id = `prof-${p.id}`;
    
    const eff = calcEffStats(p);
    const baseEff = calcEffStats({ ...p, eq: null });
    
    // Helper to split rendering: Base Value (White) + Equipment Bonus (Emerald Green)
    const formatStatDiff = (key, isPct = false, fixed = 0) => {
      const total = eff[key] || 0;
      const base = baseEff[key] || 0;
      if (isPct) {
        const baseVal = Math.round(base * 100);
        const totalVal = Math.round(total * 100);
        const diff = totalVal - baseVal;
        if (diff > 0) {
          return `${baseVal}% <span style="color: #34d399; font-size: 0.62rem; font-weight: bold;">(+${diff}%)</span>`;
        }
        return `${totalVal}%`;
      } else {
        const baseVal = Number(base.toFixed(fixed));
        const totalVal = Number(total.toFixed(fixed));
        const diff = Number((totalVal - baseVal).toFixed(fixed));
        if (diff > 0) {
          const diffStr = fixed > 0 ? diff.toFixed(fixed) : diff;
          return `${baseVal} <span style="color: #34d399; font-size: 0.62rem; font-weight: bold;">(+${diffStr})</span>`;
        }
        return fixed > 0 ? totalVal.toFixed(fixed) : totalVal;
      }
    };

    const genderSym = p.gender === 'female' ? '♀️' : '♂️';
    const faithSym = p.faith ? '✨' : '🪐';
    
    let html = `
      <div class="prof-top">
        <div class="prof-avatar">${getHeroIcon(p.jobClass)}</div>
        <div class="prof-meta">
          <h4>${p.name} <span style="font-size:0.7rem; opacity:0.7;">${genderSym}${faithSym}</span> (${gameConfig.heroes[p.jobClass].name})${p.assignment === 'combat' ? ' ⚔️' : ''}</h4>
          <div class="lv-exp">Lv.<span>${p.level}</span> | Exp <span>${p.exp}</span>/<span>${window.getReqExp(p.level)}</span></div>
    `;
    
    if (eff) {
      const hpPct = Math.max(0, (p.hp / eff.maxHp) * 100);
      const mpPct = Math.max(0, (p.mp / eff.maxMp) * 100);
      const hpDeficit = Math.max(0, eff.maxHp - p.hp);
      const mpDeficit = Math.max(0, eff.maxMp - p.mp);
      const healCost = Math.ceil(hpDeficit * 0.5 + mpDeficit * 1.0); 
      
      let healBtnHtml = '';
      if (p.assignment === 'hospital') {
        healBtnHtml = `
          <button class="ctrl-btn" style="margin-top: 0.4rem; width: 100%; padding: 0.25rem; font-size: 0.7rem; font-weight: bold; border-radius: 4px; border: none; background: #374151; color: #94a3b8; cursor: default;" disabled>
            🚑 重傷就醫中
          </button>
        `;
      } else if (healCost > 0) {
        const diff = state.difficulty || 'normal';
        const isCombat = (p.assignment === 'combat');
        
        let currencyType = 'gold';
        let finalCost = healCost;
        let isActDisabled = false;
        let btnLabel = "";
        
        if (diff === 'easy' || diff === 'test') {
          currencyType = 'gold';
          finalCost = healCost;
          btnLabel = `💰${finalCost}`;
        } else if (diff === 'normal') {
          if (isCombat) {
            currencyType = 'mithril';
            finalCost = window.getHealMithrilCost ? window.getHealMithrilCost(p, eff) : 1;
            btnLabel = `💠${finalCost}`;
          } else {
            currencyType = 'gold';
            finalCost = healCost;
            btnLabel = `💰${finalCost}`;
          }
        } else if (diff === 'hard') {
          if (isCombat) {
            currencyType = 'mithril';
            finalCost = (window.getHealMithrilCost ? window.getHealMithrilCost(p, eff) : 1) * 10;
            btnLabel = `💠${finalCost}`;
          } else {
            currencyType = 'gold';
            finalCost = healCost;
            btnLabel = `💰${finalCost}`;
          }
        } else if (diff === 'nightmare') {
          if (isCombat) {
            isActDisabled = true;
            btnLabel = `🚫 出征中不可治療`;
          } else {
            currencyType = 'mithril';
            finalCost = (window.getHealMithrilCost ? window.getHealMithrilCost(p, eff) : 1) * 10;
            btnLabel = `💠${finalCost}`;
          }
        }

        let canPay = true;
        if (!isActDisabled) {
          if (currencyType === 'mithril') {
            canPay = (state.mithril || 0) >= finalCost;
          } else {
            canPay = state.money >= finalCost;
          }
        } else {
          canPay = false;
        }

        if (isActDisabled) {
          healBtnHtml = `
            <button class="ctrl-btn" style="margin-top: 0.4rem; width: 100%; padding: 0.25rem; font-size: 0.7rem; font-weight: bold; border-radius: 4px; border: none; background: #374151; color: #ef4444; cursor: not-allowed;" disabled>
              ${btnLabel}
            </button>
          `;
        } else {
          const btnBg = canPay ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#4b5563';
          healBtnHtml = `
            <button class="ctrl-btn" style="margin-top: 0.4rem; width: 100%; padding: 0.25rem; font-size: 0.7rem; font-weight: bold; border-radius: 4px; border: none; background: ${btnBg}; color: white; cursor: ${canPay ? 'pointer' : 'not-allowed'}; transition: opacity 0.2s;"
              onclick="window.quickHealHero('${p.id}', ${finalCost}, '${currencyType}')" ${canPay ? '' : 'disabled'}>
              💚 恢復狀態 (${btnLabel})
            </button>
          `;
        }
      } else {
        healBtnHtml = `
          <button class="ctrl-btn" style="margin-top: 0.4rem; width: 100%; padding: 0.25rem; font-size: 0.7rem; font-weight: bold; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(16,185,129,0.05); color: #10b981; cursor: default;" disabled>
            ✅ 狀態全滿
          </button>
        `;
      }

      const combatBtnHtml = p.assignment === 'hospital' ? '' : `
        <button class="ctrl-btn" style="flex: 1; padding: 0.25rem; font-size: 0.7rem; font-weight: bold; border-radius: 4px; border: none; background: ${p.assignment === 'combat' ? '#4b5563' : '#3b82f6'}; color: white; cursor: pointer; transition: all 0.2s;" 
          onclick="window.changeResidentAssignment('${p.id}', '${p.assignment === 'combat' ? 'idle' : 'combat'}')">
          ${p.assignment === 'combat' ? '🛡️ 召回' : '⚔️ 出征'}
        </button>
      `;

      html += `
          <div class="hp-mp-roster" style="margin-top: 0.4rem; display: flex; flex-direction: column; gap: 3px; width: 100%;">
            <div class="bar-wrapper" style="height: 12px;">
              <div class="bar-fill bg-hp" style="width: ${hpPct}%"></div>
              <span class="bar-text" style="font-size: 0.65rem; line-height: 12px;">HP ${Math.floor(p.hp)}/${eff.maxHp}</span>
            </div>
            <div class="bar-wrapper" style="height: 12px;">
              <div class="bar-fill bg-mp" style="width: ${mpPct}%"></div>
              <span class="bar-text" style="font-size: 0.65rem; line-height: 12px;">MP ${Math.floor(p.mp)}/${eff.maxMp}</span>
            </div>
            ${healBtnHtml}
            <div style="display: flex; gap: 4px; margin-top: 2px; width: 100%;">
              ${combatBtnHtml}
              <button class="ctrl-btn" style="flex: 1; padding: 0.25rem; font-size: 0.7rem; font-weight: bold; border-radius: 4px; border: none; background: #ef4444; color: white; cursor: pointer; transition: all 0.2s;"
                onclick="window.exileResident('${p.id}')">
                🥾 流放
              </button>
            </div>
          </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
    
    if (eff) {
      if (state.tech.appraisalTech) {
        html += `
          <div class="prof-stats" style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.25rem;">
            <span>⚔️ 物攻: <span style="float:right">${formatStatDiff('atk')}</span></span>
            <span>🛡️ 物防: <span style="float:right">${formatStatDiff('def')}</span></span>
            <span>🪄 魔攻: <span style="float:right">${formatStatDiff('matk')}</span></span>
            <span>🔮 魔防: <span style="float:right">${formatStatDiff('mdef')}</span></span>
            <span>⚡ 速度: <span style="float:right">${formatStatDiff('spd', false, 1)}</span></span>
            <span>🎯 命中: <span style="float:right">${formatStatDiff('hit', true)}</span></span>
            <span>💨 閃避: <span style="float:right">${formatStatDiff('evasion', true)}</span></span>
            <span>💥 暴擊: <span style="float:right">${formatStatDiff('critRate', true)}</span></span>
            <span>🍀 幸運: <span style="float:right">${formatStatDiff('lucky')}</span></span>
            ${eff.pdr > 0 ? `<span style="color:#10b981;">🛡️ 物理免傷: <span style="float:right">${formatStatDiff('pdr', true)}</span></span>` : ''}
            ${eff.mdr > 0 ? `<span style="color:#a855f7;">🔮 魔法免傷: <span style="float:right">${formatStatDiff('mdr', true)}</span></span>` : ''}
            ${eff.udr > 0 ? `<span style="color:#fbbf24; font-weight:bold;">🔰 全能免傷: <span style="float:right">${formatStatDiff('udr', true)}</span></span>` : ''}
          </div>
          ${(() => {
            if (p.jobClass === "novice") {
              const poss = window.checkEligibleClasses(p);
              const possNames = poss.map(k => gameConfig.heroes[k].name);
              return `
                <div style="grid-column: 1 / span 2; margin-top: 0.5rem; background: rgba(255,255,255,0.03); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                  <div style="font-size: 0.7rem; color: #fbbf24; font-weight: bold; margin-bottom: 0.25rem;">🔮 潛能覺醒方向：</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; font-size: 0.65rem;">
                    ${possNames.length > 0 
                      ? possNames.map(n => `<span style="background: rgba(59, 130, 246, 0.2); color: #93c5fd; padding: 1px 5px; border-radius: 4px; border: 1px solid rgba(59,130,246,0.2);">${n}</span>`).join("") 
                      : '<span style="color: #94a3b8; opacity: 0.8; font-style: italic;">⚠️ 暫無適應資質</span>'}
                  </div>
                </div>
              `;
            }
            return "";
          })()}
          <div class="paperdoll" style="display:grid;">
            ${['rhand','lhand','helm','body','pants','shoes'].map(slot => {
              const eqItem = p.eq[slot];
              const icon = eqItem ? getSlotIcon(slot, eqItem.level) : getSlotIcon(slot);
              return `<div class="eq-slot" data-hero="${p.id}" data-slot="${slot}" title="${gameConfig.eqSpecs.slots[slot].name}">${icon}</div>`;
            }).join('')}
          </div>
        `;
      } else {
        html += `
          <div class="prof-stats locked-stats" style="grid-column: 1 / span 2; background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px dashed rgba(255,255,255,0.15); padding: 1.5rem; color: #94a3b8; flex-direction: column; gap: 0.5rem; min-height: 100px; margin-top: 0.5rem;">
            <span style="font-size: 1.1rem;">🔮 未鑑定屬性</span>
            <span style="font-size: 0.75rem; opacity:0.8; text-align: center;">請至研究所研發【鑑定水晶球】<br>以解鎖詳細屬性與裝備格！</span>
          </div>
        `;
      }
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
        let paperdollTitle = `${item.name}\n+ ${gameConfig.eqSpecs.statNames[item.mainStat]}: ${item.mainStatVal}`;
        if (item.extras) {
          Object.entries(item.extras).forEach(([k, v]) => {
            const isPct = ['hit', 'evasion', 'critRate', 'critDmg', 'lifesteal', 'mlifesteal', 'pdr', 'mdr', 'udr'].includes(k);
            paperdollTitle += `\n+ ${gameConfig.eqSpecs.statNames[k]}: ${v}${isPct ? '%' : ''}`;
          });
        }
        slotEl.title = paperdollTitle;
      }
      slotEl.onclick = () => {
        if (item) {
          window.openUnequipModal(p.id, slot);
        }
      };
    });
    
  });

  // 2. Render Combat Party
  if (partyGroup) {
    partyGroup.innerHTML = "";
    
    const backCol = document.createElement("div");
    backCol.className = "battle-row-container";
    backCol.id = "partyBackRow";
    
    const frontCol = document.createElement("div");
    frontCol.className = "battle-row-container";
    frontCol.id = "partyFrontRow";
    
    partyGroup.appendChild(backCol);
    partyGroup.appendChild(frontCol);
    
    const combatParty = state.population.filter(p => p.assignment === 'combat');
    const { frontList, backList } = assignCombatRows(combatParty);
    
    const renderToCol = (list, container) => {
      list.forEach(p => {
        const effStats = calcEffStats(p);
        const unit = document.createElement("div");
        
        const isFocused = combatState.focusedHeroId === p.id;
        unit.className = `combat-unit ${isFocused ? 'focused-hero' : ''}`;
        unit.id = `unit-${p.id}`;
        unit.style.cursor = p.hp > 0 ? "pointer" : "not-allowed";
        unit.style.position = "relative";
        
        if (typeof p.hp === 'undefined') { p.hp = effStats.maxHp; }
        if (typeof p.mp === 'undefined') { p.mp = effStats.maxMp; }
        p.hp = Math.min(p.hp, effStats.maxHp);
        p.mp = Math.min(p.mp, effStats.maxMp);

        const rangeTag = getHeroIcon(p.jobClass);
        const rowTag = p.isFrontRow ? '前排' : '後排';

        unit.innerHTML = `
          ${isFocused ? '<span class="combat-focus-badge" title="正在控制此英雄施展手勢法術">🎯</span>' : ''}
          <div class="unit-header">
            <span class="unit-name" style="${isFocused ? 'color:#facc15; font-weight:bold;' : ''} font-size: 0.75rem; display:flex; justify-content:space-between; width:100%;">
              <span>${rangeTag} ${p.name}</span>
              <span style="opacity:0.7; font-size:0.65rem;">Lv.<span id="b-${p.id}-lv">${p.level}</span></span>
            </span>
          </div>
          <div class="stat-bars">
            <div class="bar-wrapper"><div class="bar-fill bg-hp" id="b-${p.id}-hp-bar" style="width:${(p.hp/effStats.maxHp)*100}%"></div><span class="bar-text" id="b-${p.id}-hp-val">${Math.floor(p.hp)}/${effStats.maxHp}</span></div>
            <div class="bar-wrapper"><div class="bar-fill bg-mp" id="b-${p.id}-mp-bar" style="width:${(p.mp/effStats.maxMp)*100}%"></div><span class="bar-text" id="b-${p.id}-mp-val">${Math.floor(p.mp)}/${effStats.maxMp}</span></div>
            <div class="bar-wrapper atb-wrapper"><div class="bar-fill bg-atb" id="b-${p.id}-atb-bar" style="width:0%"></div></div>
          </div>
          <div style="position:absolute; bottom:2px; right:6px; font-size: 0.55rem; color:#94a3b8; font-style:italic; opacity:0.8;">${rowTag}</div>
        `;
        
        unit.onclick = () => {
          if (p.hp <= 0) {
            showToast("❌ 無法控制已倒下的英雄！", "error");
            return;
          }
          combatState.focusedHeroId = p.id;
          showToast(`🎯 戰術指示：全力輔助【${p.name}】進行詠唱！`, "info");
          updateHeroSheets();
        };

        container.appendChild(unit);
      });
    };
    
    renderToCol(backList, backCol);
    renderToCol(frontList, frontCol);
  }
}

function isRangedHero(jobClass) {
  const ranged = ['archer', 'gunner', 'mage', 'wizard', 'taoist'];
  return ranged.includes(jobClass);
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
  focusedHeroId: null, // UID of the hero targeted/controlled by user
  aiMode: 'basic' // 'basic' | 'balanced' | 'defensive' | 'offensive'
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

document.getElementById("devAiModeSelect")?.addEventListener("change", (e) => {
  combatState.aiMode = e.target.value;
  updateAiModeUI();
  showToast(`🧠 戰術已手動調整為：${e.target.options[e.target.selectedIndex].text}`, "info");
});

function updateAiModeUI() {
  const txtEl = document.getElementById("aiModeText");
  if (!txtEl) return;
  
  const labelMap = {
    basic: { text: "🛑 純普攻模式 (待結印)", color: "#a1a1aa" },
    balanced: { text: "⚖️ 平衡戰術 AI (運作中)", color: "#60a5fa" },
    defensive: { text: "🛡️ 守護防衛 AI (運作中)", color: "#34d399" },
    offensive: { text: "⚔️ 強攻狂暴 AI (運作中)", color: "#f87171" }
  };
  
  const mode = combatState.aiMode || 'basic';
  txtEl.innerHTML = labelMap[mode].text;
  txtEl.style.color = labelMap[mode].color;
  
  const selEl = document.getElementById("devAiModeSelect");
  if (selEl && selEl.value !== mode) selEl.value = mode;
}

function startQuest(type) {
  // Interrupt check for gated high-level hunts
  if (combatState.active) {
    if (type === 'hunt' && state.huntGateCount >= 10) {
      window.openExamModal(null, 'scienceHunt', null);
      showToast("📖 請先答對自然科安全考核測驗以恢復掛機！", "warning");
      return;
    }
    return;
  }
  
  const huntLvlEl = document.getElementById("targetHuntLevel");
  const selectedHuntLevel = huntLvlEl ? parseInt(huntLvlEl.value) : 1;
  if (type === 'hunt' && selectedHuntLevel >= 7 && state.huntGateCount >= 10) {
    window.openExamModal(null, 'scienceHunt', null);
    showToast("📖 請先答對自然科安全考核測驗！", "warning");
    return;
  }
  
  const combatParty = state.population.filter(p => p.assignment === 'combat');
  
  if (combatParty.length === 0) {
    showToast("❌ 請先在人力面板將居民指派為「出征」！", "error");
    return;
  }
  
  combatState.active = true;
  combatState.target = type;
  combatState.huntLevel = selectedHuntLevel;

  combatState.party = combatParty.map(p => p.id);
  
  // Define Front/Back rows before battle loop starts
  assignCombatRows(combatParty);
  
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
  updateAiModeUI();

  
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
      p.previousAssignment = p.assignment; // Store duty before sending to hospital!
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


function getValidTargets(attackerSide, isRanged) {
  let candidates = [];
  if (attackerSide === 'hero') {
    candidates = combatState.enemies.filter(e => e.hp > 0);
  } else {
    const combatParty = state.population.filter(p => combatState.party.includes(p.id));
    candidates = combatParty.filter(p => p.hp > 0);
  }
  
  if (candidates.length === 0) return [];
  
  if (isRanged) return candidates;
  
  const frontRowTargets = candidates.filter(u => u.isFrontRow);
  if (frontRowTargets.length > 0) {
    return frontRowTargets;
  }
  return candidates;
}

function pickBestTarget(candidates) {
  if (!candidates || candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => a.hp - b.hp);
  return sorted[0];
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
        avatar: getMobAvatar(mobData.name, avgLvl, mobData.avatar),
        hp: finalHp,
        maxHp: finalHp,
        atk: Math.floor(mobCfg.base.atk * scale * diffCfg.enemyAtk),
        def: Math.floor(mobCfg.base.def * scale),
        matk: Math.floor(mobCfg.base.matk * scale * diffCfg.enemyAtk),
        mdef: Math.floor(mobCfg.base.mdef * scale),
        spd: mobCfg.base.spd + (avgLvl * mobCfg.scaling.spdPerLvl),
        atb: 0,
        rewardExp: Math.floor((mobCfg.scaling.rewardExpBase * avgLvl / mobCount) * diffCfg.expMoneyMod),
        rewardMoney: Math.floor((mobCfg.scaling.rewardMoneyBase * avgLvl / mobCount) * diffCfg.expMoneyMod),
        isBoss: false,
        isFrontRow: i < 3, // First 3 are Front Row, remaining are Back Row
        isRanged: i >= 3 && Math.random() < 0.5
      });
    }
  } else {
    // Spawn Boss groups mapped sequentially by state.bossLevel (1 to 6)
    const bLevel = state.bossLevel || 1;
    let bossKeys = [];
    
    if (bLevel === 1) {
      bossKeys = ["greed"];
    } else if (bLevel === 2) {
      bossKeys = ["greed", "anger"];
    } else if (bLevel === 3) {
      bossKeys = ["greed", "anger", "ignorance"];
    } else if (bLevel === 4) {
      // 2 greed, 2 anger, 2 ignorance
      bossKeys = ["greed", "greed", "anger", "anger", "ignorance", "ignorance"];
    } else if (bLevel === 5) {
      // 4 ignorance
      bossKeys = ["ignorance", "ignorance", "ignorance", "ignorance"];
    } else {
      // Lv.6+: 6 ignorance
      bossKeys = ["ignorance", "ignorance", "ignorance", "ignorance", "ignorance", "ignorance"];
    }
    
    bossKeys.forEach((bType, i) => {
      const bossCfg = gameConfig.combat.bosses[bType];
      if (bossCfg) {
        const finalBoss = JSON.parse(JSON.stringify(bossCfg));
        finalBoss.hp = Math.floor(finalBoss.hp * diffCfg.enemyHp);
        finalBoss.maxHp = Math.floor(finalBoss.maxHp * diffCfg.enemyHp);
        finalBoss.atk = Math.floor(finalBoss.atk * diffCfg.enemyAtk);
        finalBoss.matk = Math.floor((finalBoss.matk || 0) * diffCfg.enemyAtk);
        if (finalBoss.rewardExp) finalBoss.rewardExp = Math.floor(finalBoss.rewardExp * diffCfg.expMoneyMod);
        if (finalBoss.rewardMoney) finalBoss.rewardMoney = Math.floor(finalBoss.rewardMoney * diffCfg.expMoneyMod);
        
        combatState.enemies.push({
          ...finalBoss,
          id: `enemy-boss-${bType}-${i}`,
          atb: 0,
          isBoss: true,
          isFrontRow: i < 3, // Stack first 3 in Front Row, remaining 3 in Back Row
          isRanged: true
        });
      }
    });
  }
  
  // Render Enemies to physical side columns
  if (enemyGroup) {
    enemyGroup.innerHTML = "";
    
    const frontCol = document.createElement("div");
    frontCol.className = "battle-row-container";
    frontCol.id = "enemyFrontRow";
    
    const backCol = document.createElement("div");
    backCol.className = "battle-row-container";
    backCol.id = "enemyBackRow";
    
    enemyGroup.appendChild(frontCol);
    enemyGroup.appendChild(backCol);
    
    combatState.enemies.forEach(e => {
      const unit = document.createElement("div");
      unit.className = "combat-unit";
      unit.id = e.id;
      unit.style.position = "relative";
      
      const rowTag = e.isFrontRow ? '前排' : '後排';
      const rangeTag = e.isRanged ? '🏹' : '🛡️';
      
      unit.innerHTML = `
        <div class="unit-header">
          <span class="unit-name" style="font-size: 0.75rem; display:flex; justify-content:space-between; width:100%;">
            <span>${rangeTag} ${e.name}</span>
          </span>
        </div>
        <div class="stat-bars" id="${e.id}-bars">
          <div class="bar-wrapper"><div class="bar-fill bg-hp" id="${e.id}-hpBar" style="width:100%"></div><span class="bar-text" id="${e.id}-hpVal">${e.hp}/${e.maxHp}</span></div>
          <div class="bar-wrapper atb-wrapper"><div class="bar-fill bg-atb" id="${e.id}-atbBar" style="width:0%"></div></div>
        </div>
        <div class="enemy-avatar" style="font-size:2rem; margin:0.1rem 0;">${e.avatar}</div>
        <div style="position:absolute; bottom:2px; right:6px; font-size: 0.55rem; color:#94a3b8; font-style:italic; opacity:0.8;">${rowTag}</div>
      `;
      
      if (e.isFrontRow) {
        frontCol.appendChild(unit);
      } else {
        backCol.appendChild(unit);
      }
    });
  }
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
    
    // Passive combat MP regeneration (Runs every frame tick)
    const mpRegen = 0.1 + (eff.matk * 0.01); // Scaled for approx 100ms clock interval
    p.mp = Math.min(eff.maxMp, (p.mp || 0) + mpRegen);
    
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

function tryCastClassSkill(p, eff) {
  if (combatState.aiMode === 'basic') return false; // In basic mode, heroes ONLY use normal attacks!
  
  // Find the lowest % HP ally for healing checks
  const getLowestAlly = () => {
    const party = state.population.filter(res => combatState.party.includes(res.id) && res.hp > 0);
    if (party.length === 0) return null;
    return party.sort((a, b) => {
      const eA = calcEffStats(a);
      const eB = calcEffStats(b);
      return (a.hp / eA.maxHp) - (b.hp / eB.maxHp);
    })[0];
  };

  // Unified helper to trigger damage flash animation
  const flashEnemy = (eId) => {
    const el = document.getElementById(eId);
    if (el) {
      el.classList.add("attack-anim");
      setTimeout(() => el.classList.remove("attack-anim"), 150);
    }
  };

  const job = p.jobClass || 'novice';
  const isRanged = isRangedHero(job);
  
  // Boss scaling and non-faith suppression calculator helper
  const calcBossAdjustments = (rawDmg, targetEnemy) => {
    let finalDmg = rawDmg;
    if (targetEnemy.isBoss) {
      if (job === "monk") {
        const mult = 3.0 + (p.level - 1) * 0.8;
        finalDmg = Math.floor(finalDmg * mult);
        logBattle(`💢 和尚爆發【降魔】真言！傷害加成 x${mult.toFixed(1)}！`, "log-item-buff");
      } else if (job === "taoist") {
        const mult = 2.0 + (p.level - 1) * 0.5;
        finalDmg = Math.floor(finalDmg * mult);
        logBattle(`☯️ 道士激發【天威】印記！傷害加成 x${mult.toFixed(1)}！`, "log-item-buff");
      } else if (job === "paladin" || job === "priest") {
        const mult = 2.5 + (p.level - 1) * 0.6;
        finalDmg = Math.floor(finalDmg * mult);
        logBattle(`✨ 聖光輝耀！傷害加成 x${mult.toFixed(1)}！`, "log-item-buff");
      }
      if (!p.faith) {
        const diffCfg = DIFFICULTY_MULTIPLIERS[state.difficulty || 'normal'] || DIFFICULTY_MULTIPLIERS.normal;
        finalDmg = Math.max(1, Math.floor(finalDmg * (diffCfg.nonFaithGiantDmgMod || 0.33)));
      }
    }
    return finalDmg;
  };

  // Skill Dictionary
  const skillMap = {
    novice: { name: "初階斬擊", cost: 5, desc: "造成 1.2 倍物理傷害" },
    warrior: { name: "聖劍裁決", cost: 20, desc: "前後排全體覆蓋 1.8 倍物理傷害！" },
    barbarian: { name: "毀滅大風車", cost: 25, desc: "瘋狂橫掃前後排全體 2.5 倍物理傷害！" },
    shieldWarrior: { name: "盾牌猛擊", cost: 15, desc: "物攻+防禦1.5倍碎盾傷害，擊退前排 30% ATB" },
    rogue: { name: "致命背刺", cost: 20, desc: "2.5 倍必中物理暴擊" },
    archer: { name: "穿透矢雨風暴", cost: 20, desc: "穿透敵陣，發射最多 6 次覆蓋全體每擊 1.2 倍物攻" },
    gunner: { name: "狙擊爆頭", cost: 20, desc: "精準轟擊最虛弱目標 2.2 倍物理傷害 (遠程)" },
    fighter: { name: "百裂神拳", cost: 20, desc: "狂暴重擊單體目標 3 次，每次 0.6 倍物攻" },
    mage: { name: "爆裂火球", cost: 25, desc: "轟擊最虛弱敵人 2.0 倍魔法傷害 (遠程)" },
    wizard: { name: "連鎖雷爆", cost: 35, desc: "轟擊所有可觸及敵人 1.2 倍魔法傷害 (遠程)" },
    priest: { name: "神聖奇蹟", cost: 40, desc: "【全體救贖】回復全體 3x魔攻+20%HP，全體 ATB 充能 100%！" },
    paladin: { name: "神績降臨", cost: 35, desc: "【天罰聖療】全體物魔混合 2x 傷害 + 吸取 30% ATB，我方全體 20% 大補！" },
    taoist: { name: "萬劍歸宗", cost: 40, desc: "【降魔】全體 3.5x魔攻轟炸，對巨獸追加額外 10%最大HP 真實傷害！" },
    monk: { name: "萬佛朝宗", cost: 35, desc: "【破法】單體 4x 物攻 (100%無視防禦)，並清空目標 100% ATB 行動條！" }
  };

  const skill = skillMap[job] || skillMap.novice;
  if (p.mp < skill.cost) return false; // Not enough MP, execute normal attack

  // 1. PRE-CHECK: Gather targets first
  const validCandidates = getValidTargets('hero', isRanged);
  const target = pickBestTarget(validCandidates); 

  // 2. PRE-CHECK: Smart Priest Healing Logic
  if (job === 'priest') {
    const weakest = getLowestAlly();
    if (!weakest) return false;
    const wEff = calcEffStats(weakest);
    const hpPct = weakest.hp / wEff.maxHp;
    
    let healThreshold = 0.85; // Balanced mode
    if (combatState.aiMode === 'defensive') healThreshold = 0.95;
    if (combatState.aiMode === 'offensive') healThreshold = 0.50;
    
    if (hpPct >= healThreshold) {
      return false; // Skip healing to save MP and do normal attack instead
    }
  }

  // 3. PRE-CHECK: Smart AOE Logic for Barbarian & Wizard
  if (job === 'barbarian' || job === 'wizard') {
    if (validCandidates.length < 2 && (combatState.aiMode === 'balanced' || combatState.aiMode === 'defensive')) {
      return false; // Conserve MP by avoiding AOE on a single surviving target
    }
  }

  // 4. PRE-CHECK: Edge case validation
  if (!target && job !== "priest") {
     return false;
  }

  // Validated! Execute Cast and deduct MP
  p.mp -= skill.cost;
  const logHeader = `<span style="color:#a855f7; font-weight:bold;">【${skill.name}】</span>`;

  // Core branching logic for the skill actions
  switch(job) {
    case 'novice': {
      let raw = Math.max(1, (eff.atk * 1.2) - target.def);
      let final = calcBossAdjustments(raw, target);
      logBattle(`⚔️ ${p.name} 發動 ${logHeader}，重擊 ${target.name} 造成 <b class="log-item-dmg">${Math.floor(final)}</b> 傷害。`);
      target.hp -= Math.floor(final);
      flashEnemy(target.id);
      break;
    }
    case 'warrior': {
      logBattle(`🗡️ ${p.name} 高舉聖劍，揮下 ${logHeader} 斬切戰場！`);
      validCandidates.forEach(c => {
        let raw = Math.max(1, (eff.atk * 1.8) - c.def);
        let final = calcBossAdjustments(raw, c);
        logBattle(`  💥 對 ${c.name} 造成 <span class="log-item-dmg">${Math.floor(final)}</span> 全體聖裁傷害。`);
        c.hp -= Math.floor(final);
        flashEnemy(c.id);
      });
      break;
    }
    case 'barbarian': {
      logBattle(`🪓 ${p.name} 咆哮如雷化身鋼鐵風暴，瘋狂旋舞 ${logHeader}！`);
      validCandidates.forEach(c => {
        let raw = Math.max(1, (eff.atk * 2.5) - c.def);
        let final = calcBossAdjustments(raw, c);
        logBattle(`  🌀 狂暴氣旋對 ${c.name} 造成高達 <span class="log-item-dmg">${Math.floor(final)}</span> 絞碎傷害！`);
        c.hp -= Math.floor(final);
        flashEnemy(c.id);
      });
      break;
    }
    case 'shieldWarrior': {
      let raw = Math.max(1, (eff.atk * 1.5 + eff.def * 1.5) - target.def);
      let final = calcBossAdjustments(raw, target);
      logBattle(`🛡️ ${p.name} 頂起山岳重盾，施展 ${logHeader} 痛擊 ${target.name} 造成 <b class="log-item-dmg">${Math.floor(final)}</b> 碎骨衝擊！`);
      target.hp -= Math.floor(final);
      flashEnemy(target.id);
      
      // Retaliation Shockwave: Reduce ATB of ALL front row enemies by 30%
      const frontEnemies = combatState.enemies.filter(e => e.isFrontRow && e.hp > 0);
      frontEnemies.forEach(fe => {
        fe.atb = Math.max(0, (fe.atb || 0) - 30);
      });
      logBattle(`  💥 重盾震撼大地，將敵方前排全體行動條擊退 30%！`, "log-item-buff");
      break;
    }
    case 'rogue': {
      // Rogue bypasses standard evasion entirely (Bypasses Miss roll entirely)
      let raw = Math.max(1, (eff.atk * 2.5) - target.def);
      let final = calcBossAdjustments(raw, target);
      logBattle(`👤 ${p.name} 閃身至死角施展 ${logHeader}，對 ${target.name} 造成致命必中的 <b style="color:#ef4444; font-size:1.2em;">CRIT!</b> <b class="log-item-dmg">${Math.floor(final)}</b> 傷害！`);
      target.hp -= Math.floor(final);
      flashEnemy(target.id);
      break;
    }
    case 'archer': {
      logBattle(`🏹 ${p.name} 拉開滿月巨弓射向高空，降下毀滅性 ${logHeader}！`);
      const maxArrows = Math.min(6, validCandidates.length * 2); // Ensure high density coverage
      for(let i = 0; i < maxArrows; i++) {
        if (validCandidates.length === 0) break;
        const rnd = validCandidates[Math.floor(Math.random() * validCandidates.length)];
        let raw = Math.max(1, (eff.atk * 1.2) - rnd.def);
        let final = calcBossAdjustments(raw, rnd);
        logBattle(`  🎯 穿透箭矢直插 ${rnd.name}，造成 <span class="log-item-dmg">${Math.floor(final)}</span> 傷害。`);
        rnd.hp -= Math.floor(final);
        flashEnemy(rnd.id);
        // In case target dies, remove it from candidate pool instantly
        if(rnd.hp <= 0) {
           const idx = validCandidates.findIndex(c => c.id === rnd.id);
           if(idx > -1) validCandidates.splice(idx, 1);
        }
      }
      break;
    }
    case 'gunner': {
      let raw = Math.max(1, (eff.atk * 2.2) - target.def);
      let final = calcBossAdjustments(raw, target);
      logBattle(`💥 ${p.name} 扣下扳機施展 ${logHeader}，子彈爆頭擊穿 ${target.name} 造成 <b class="log-item-dmg">${Math.floor(final)}</b> 穿透傷害！`);
      target.hp -= Math.floor(final);
      flashEnemy(target.id);
      break;
    }
    case 'fighter': {
      logBattle(`👊 ${p.name} 氣勢如虹打出 ${logHeader}！`);
      let count = 0;
      const intervalId = setInterval(() => {
        if (count >= 3 || target.hp <= 0) {
          clearInterval(intervalId);
          return;
        }
        let raw = Math.max(1, (eff.atk * 0.6) - target.def);
        let final = calcBossAdjustments(raw, target);
        logBattle(`  🤛 歐拉！對 ${target.name} 造成 <span class="log-item-dmg">${Math.floor(final)}</span> 打擊！`);
        target.hp -= Math.floor(final);
        flashEnemy(target.id);
        count++;
        checkBattleResolution();
      }, 80);
      break;
    }
    case 'mage': {
      // Magic vs M.Def
      let raw = Math.max(1, (eff.matk * 2.0) - target.mdef);
      let final = calcBossAdjustments(raw, target);
      logBattle(`🔥 ${p.name} 頌念咒文施展 ${logHeader}，熊熊烈焰吞噬 ${target.name} 造成 <b style="color:#f97316;" class="log-item-dmg">${Math.floor(final)}</b> 魔法傷害！`);
      target.hp -= Math.floor(final);
      flashEnemy(target.id);
      break;
    }
    case 'wizard': {
      logBattle(`⚡ ${p.name} 高舉法杖召喚 ${logHeader} 覆蓋整個戰場！`);
      validCandidates.forEach(c => {
        let raw = Math.max(1, (eff.matk * 1.2) - c.mdef);
        let final = calcBossAdjustments(raw, c);
        logBattle(`  ⛈️ 狂雷轟炸 ${c.name} 造成 <span style="color:#3b82f6;" class="log-item-dmg">${Math.floor(final)}</span> 電擊傷害。`);
        c.hp -= Math.floor(final);
        flashEnemy(c.id);
      });
      break;
    }
    case 'priest': {
      logBattle(`⛪ ${p.name} 雙手合十施展 ${logHeader}，耀眼聖光普照全軍！`);
      const aliveHeroes = state.population.filter(h => combatState.party.includes(h.id) && h.hp > 0);
      aliveHeroes.forEach(h => {
        const hEff = calcEffStats(h);
        const healAmt = Math.floor(eff.matk * 3.0 + hEff.maxHp * 0.20);
        h.hp = Math.min(hEff.maxHp, h.hp + healAmt);
        h.atb = 100; // Instant 100% ATB fill for absolute annihilation!
        
        const card = document.getElementById(`prof-${h.id}`);
        if (card) {
          card.style.boxShadow = "0 0 15px #eab308";
          setTimeout(() => card.style.boxShadow = "", 400);
        }
      });
      logBattle(`  ✨ 全體隊友血量大補，且行動條 (ATB) 瞬間灌滿 100% 爆發！`, "log-item-buff");
      break;
    }
    case 'paladin': {
      logBattle(`✨ ${p.name} 躍向半空重擊地面施展 ${logHeader}，聖光光雨落滿全場！`);
      validCandidates.forEach(c => {
        let raw = Math.max(1, (eff.atk * 2.0 + eff.matk * 2.0) - c.def);
        let final = calcBossAdjustments(raw, c);
        logBattle(`  🔱 對 ${c.name} 造成 <span class="log-item-dmg">${Math.floor(final)}</span> 混合天罰，擊退其 30% ATB！`);
        c.hp -= Math.floor(final);
        c.atb = Math.max(0, (c.atb || 0) - 30); // Strong universal stun
        flashEnemy(c.id);
      });
      
      // Heal All Allies 20% Max HP
      const aliveHeroes = state.population.filter(h => combatState.party.includes(h.id) && h.hp > 0);
      aliveHeroes.forEach(h => {
        const hEff = calcEffStats(h);
        const healAmt = Math.floor(hEff.maxHp * 0.20);
        h.hp = Math.min(hEff.maxHp, h.hp + healAmt);
      });
      logBattle(`  ❤️ 聖光回饋：我方全體隊友獲得 <b style="color:#22c55e;">+20% Max HP</b> 生命回復！`, "log-item-buff");
      break;
    }
    case 'taoist': {
      logBattle(`☯️ ${p.name} 祭起萬千黃符飛劍，引導 ${logHeader} 轟炸全體！`);
      validCandidates.forEach(c => {
        let raw = Math.max(1, (eff.matk * 3.5) - c.mdef);
        let final = calcBossAdjustments(raw, c);
        
        let bonusStr = "";
        if (c.isBoss) {
          const bonus = Math.floor(c.maxHp * 0.10); // Gigantic 10% Max HP true damage
          final += bonus;
          bonusStr = ` (內含 <b style="color:#f43f5e;">+${bonus}</b> 巨獸真傷！)`;
        }
        
        logBattle(`  ⚔️ 飛劍穿透 ${c.name} 造成 <span style="color:#eab308;" class="log-item-dmg">${Math.floor(final)}</span> 魔法傷害！${bonusStr}`);
        c.hp -= Math.floor(final);
        flashEnemy(c.id);
      });
      break;
    }
    case 'monk': {
      // Fully bypass defense completely (Def = 0), and hard-reset target ATB!
      let raw = Math.max(1, eff.atk * 4.0); 
      let final = calcBossAdjustments(raw, target);
      logBattle(`🧘 ${p.name} 雙目暴睜一掌施展 ${logHeader}，對 ${target.name} 造成 <b class="log-item-dmg">${Math.floor(final)}</b> 無防備重創！`);
      target.hp -= Math.floor(final);
      target.atb = 0; // CRITICAL FULL ATB RESET
      logBattle(`  ✋ 萬佛朝宗：${target.name} 的行動進度條 (ATB) 遭強制歸零凍結！`, "log-item-dmg");
      flashEnemy(target.id);
      break;
    }
  }

  // Universal lifesteal applies to all skill hits that are directly targeted
  if (eff.lifesteal > 0 && job !== "priest" && job !== "barbarian" && job !== "wizard") {
     // approximate heal based on final hit if scalar
     // for simplicity, standard 10% max logic or omit to avoid scaling bloat
  }

  checkBattleResolution();
  return true;
}

function heroExecuteAttack(pid) {
  const p = state.population.find(res => res.id === pid);
  if (!p) return;
  const eff = calcEffStats(p);
  
  // 1. Attempt Auto-Skill Casting (Consumes MP, performs effect, and aborts if successful)
  if (tryCastClassSkill(p, eff)) {
    return;
  }
  
  // 2. Physical Standard Attack Targeting
  const isRanged = isRangedHero(p.jobClass);
  const candidates = getValidTargets('hero', isRanged);
  const enemy = pickBestTarget(candidates);
  
  if (!enemy) return;
  
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
    
    // Non-Faith Penalty (Any non-faith character attacking a boss is severely suppressed based on difficulty)
    if (!p.faith) {
      const diffCfg = DIFFICULTY_MULTIPLIERS[state.difficulty || 'normal'] || DIFFICULTY_MULTIPLIERS.normal;
      const penalty = diffCfg.nonFaithGiantDmgMod || 0.33;
      dmg = Math.max(1, Math.floor(dmg * penalty));
    }
  }

  const nonFaithTag = (enemy.isBoss && !p.faith) ? '<span style="color:#fca5a5; font-size:0.75rem;"> (無信仰衰減)</span>' : '';
  logBattle(`${p.name} 揮擊 ${enemy.name}，造成 ${isCrit?'<b style="color:red; font-size:1.2em;">CRIT! </b>':''}<span class="log-item-dmg">${dmg}</span> 傷害${nonFaithTag}。`);
  
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
  // Helper to safely deal damage to a specific hero, trigger flash, and handle focused redirection
  const dealDmgToHero = (h, amount) => {
    h.hp = Math.max(0, h.hp - amount);
    
    // Flash animation
    const pEl = document.getElementById(`prof-${h.id}`);
    pEl?.classList.add("attack-anim");
    setTimeout(() => pEl?.classList.remove("attack-anim"), 150);

    // Redirect targeting assistance focus if target died
    if (h.id === combatState.focusedHeroId && h.hp <= 0) {
      const combatParty = state.population.filter(p => combatState.party.includes(p.id));
      const alive = combatParty.filter(p => p.hp > 0);
      const remainingAlive = alive.filter(p => p.id !== h.id);
      if (remainingAlive.length > 0) {
        combatState.focusedHeroId = remainingAlive[0].id;
        logBattle(`📣【戰場廣播】對焦英雄【${h.name}】不幸倒地！詠唱輔助轉移至【${remainingAlive[0].name}】！`, "log-item-atb");
        updateHeroSheets();
      } else {
        combatState.focusedHeroId = null;
      }
    }
  };

  // Select smart target using range and Focus Fire AI
  const candidates = getValidTargets('enemy', enemy.isRanged);
  const target = pickBestTarget(candidates);
  if (!target) return;
  
  const eff = calcEffStats(target);
  
  // Boss Unique Skill Check (60% chance to execute signature skill for high-octane endgame)
  if (enemy.isBoss && Math.random() < 0.6) {
    if (enemy.id.includes("greed")) {
      const rawDmg = Math.max(1, Math.floor((enemy.atk * 2.0) - eff.def));
      const dmg = Math.max(1, Math.floor(rawDmg * (1 - (eff.pdr || 0)) * (1 - (eff.udr || 0))));
      dealDmgToHero(target, dmg);
      // Self heal 100% of damage
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + dmg);
      logBattle(`👹【黃金暴食】${enemy.name} 吞噬 ${target.name} 造成 <b class="log-item-dmg">${dmg}</b> 粉碎傷害，並將生命轉化為巨獸體力 <span style="color:#10b981; font-weight:bold;">+${dmg} HP</span>！`, "log-item-dmg");
      checkBattleResolution();
      return;
    } 
    else if (enemy.id.includes("anger")) {
      const aliveHeroes = state.population.filter(p => combatState.party.includes(p.id) && p.hp > 0);
      logBattle(`🔥【地獄業火】${enemy.name} 仰天怒吼，引導熔岩洪流向我方全軍全域傾瀉！`, "log-item-dmg");
      aliveHeroes.forEach(h => {
        const hEff = calcEffStats(h);
        const rawMDmg = Math.max(1, Math.floor((enemy.matk * 1.2) - hEff.mdef));
        const mDmg = Math.max(1, Math.floor(rawMDmg * (1 - (hEff.mdr || 0)) * (1 - (hEff.udr || 0))));
        dealDmgToHero(h, mDmg);
        logBattle(`☄️ ${h.name} 遭受炙熱炎柱灼燒，受到 <b class="log-item-dmg">${mDmg}</b> 魔法傷害。`);
      });
      checkBattleResolution();
      return;
    } 
    else if (enemy.id.includes("ignorance")) {
      const rawMDmg = Math.max(1, Math.floor((enemy.matk * 1.5) - eff.mdef));
      const mDmg = Math.max(1, Math.floor(rawMDmg * (1 - (eff.mdr || 0)) * (1 - (eff.udr || 0))));
      dealDmgToHero(target, mDmg);
      // ATB reduction mechanics
      const drainVal = 40;
      target.atb = Math.max(0, (target.atb || 0) - drainVal);
      logBattle(`🦑【愚痴風暴】${enemy.name} 激起心智迷惘，${target.name} 遭受 <b class="log-item-dmg">${mDmg}</b> 精神衝擊，且時間序 (ATB) 被吸取 <span style="color:#f43f5e; font-weight:bold;">-${drainVal}%</span>！`, "log-item-dmg");
      checkBattleResolution();
      return;
    }
  }

  // Standard attack - Evasion check
  const evasionChance = Math.max(0, eff.evasion - ((enemy.hit||1.0) - 1.0));
  if (Math.random() < evasionChance) {
    logBattle(`👾 ${enemy.name} 攻擊 ${target.name}，被驚險地 <span style="color:#9ca3af;">Miss</span> 閃避了！`);
    return;
  }

  // Standard attack - Execution
  const rawDmg = Math.max(1, enemy.atk - eff.def);
  const dmg = Math.max(1, Math.floor(rawDmg * (1 - (eff.pdr || 0)) * (1 - (eff.udr || 0))));
  dealDmgToHero(target, dmg);
  
  logBattle(`👾 ${enemy.name} 發動物理打擊，${target.name} 受到 <b class="log-item-dmg">${dmg}</b> 傷害。`);
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
    const stats = getCityStats();
    const moneyCap = gameConfig.economy.baseMoneyCap + stats.bankMoneyCap;
    if (state.money > moneyCap) state.money = moneyCap;
    combatParty.forEach(p => {
      p.exp += totalExp;
      
      // Level up logic
      let req = window.getReqExp(p.level);
      while (p.level < 10 && p.exp >= req) {
        if (p.level === 9) {
          // Cannot level up to 10 without calculus exam
          p.exp = req; 
          break;
        } else {
          p.exp -= req; // keep leftover spillover exp
          p.level += 1;
          logBattle(`✨🆙 ${p.name} 等級提升至 Lv.${p.level}！`, "log-item-drop");
          req = window.getReqExp(p.level); // Update req for new level!
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
      const lvl = Math.min(10, Math.ceil(totalExp / 20));
      
      // Check Auto-Sell settings
      if (state.autoSell && state.autoSell[rKey]) {
        const basePrice = gameConfig.eqSpecs.price[lvl] || 100;
        const sellVal = Math.ceil(basePrice * 0.3);
        state.money += sellVal;
        const rName = gameConfig.eqSpecs.rarities[rKey]?.name || rKey;
        logBattle(`🤖 自動售出怪物掉落 [${rName}] 裝備，獲得 💰${sellVal}！`, "log-item-drop");
        updateUI();
      } else {
        if (state.inventory.length < 24) {
          const dropped = generateItem(lvl, rKey);
          state.inventory.push(dropped);
          logBattle(`🎁 怪物掉落神裝：[${dropped.name}]！`, "log-item-drop");
        } else {
          logBattle(`⚠️ 背包滿了，掉落神裝不慎遺失...`);
        }
      }
    }
    
    // Auto next hunt if not boss
    if (combatState.target === "hunt" && combatState.active) {
      const curLvl = combatState.huntLevel || 1;
      if (curLvl >= 7) {
        if (!state.huntGateCount) state.huntGateCount = 0;
        state.huntGateCount++;
        
        if (state.huntGateCount >= 10) {
          logBattle(`⚠️ 【自然學堂】高階副本討伐已達 10 次，觸發學術保護鎖，請完成自然問題以恢復自動掛機！`, "log-item-atb");
          setTimeout(() => {
            window.openExamModal(null, 'scienceHunt', null);
          }, 1000);
          return; // Force STOP spawning the next wave until solved!
        }
      }
      
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
      if (state.bossLevel < 6) {
        state.bossLevel++;
        showToast(`🏆 討伐成就解鎖！下一階段挑戰已擴增至 Lv.${state.bossLevel}！`, "success");
      } else {
        showToast("🏆 你已成功擊破終極試煉【Lv.6 滅絕境界】！城鎮的英雄們載歌載舞！", "success");
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
if (nodeFood) bindResourceNode(nodeFood, 'food');
if (nodeMetal) bindResourceNode(nodeMetal, 'metal');
if (nodeMoney) bindResourceNode(nodeMoney, 'money');

// Setup Building Card triggers

// Setup City Base system triggers
btnExpandCity?.addEventListener("click", expandCityLand);
btnUpgradeBuilding?.addEventListener("click", upgradeBuilding);
btnDemolishBuilding?.addEventListener("click", demolishBuilding);

// Close Modal triggers for City slot details
const closeCityDetail = (e) => {
  if (e) {
    e.stopPropagation();
    if (e.type === 'touchstart') e.preventDefault();
  }
  selectedSlotIdx = null;
  window.setDirty('cityGrid');
  updateUI();
};

closeCityDetailBtn?.addEventListener("click", closeCityDetail);
closeCityDetailBtn?.addEventListener("touchstart", closeCityDetail, { passive: false });
const closeOverlay = (e) => {
  if (e.target === citySlotDetailOverlay) {
    if (e) {
      e.stopPropagation();
      if (e.type === 'touchstart') e.preventDefault();
    }
    selectedSlotIdx = null;
    window.setDirty('cityGrid');
    updateUI();
  }
};
citySlotDetailOverlay?.addEventListener("click", closeOverlay);
citySlotDetailOverlay?.addEventListener("touchstart", closeOverlay, { passive: false });

document.querySelectorAll(".opt-build-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const type = btn.getAttribute("data-type");
    constructBuilding(type);
  });
});

btnTechClickFood?.addEventListener("click", () => {
  if (state.tech.clickFoodTech) return;
  const tCfg = gameConfig.combat.tech.clickFoodTech;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.tech.clickFoodTech = true;
    spawnFloatingText("🎓 採集生存術已研發!", "#f472b6");
    showToast("🍞 解鎖【採集生存術】！現在可以手動採集食物資源了！", "success");
    updateUI();
  } else {
    showToast("❌ 研究知識或金幣不足！", "error");
  }
});

btnTechClickMetal?.addEventListener("click", () => {
  if (state.tech.clickMetalTech || !state.tech.clickFoodTech) return;
  const tCfg = gameConfig.combat.tech.clickMetalTech;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.tech.clickMetalTech = true;
    spawnFloatingText("🎓 初級淘金法已研發!", "#fbbf24");
    showToast("🪙 解鎖【初級淘金法】！現在可以手動採集金屬資源了！", "success");
    updateUI();
  } else {
    showToast("❌ 研究知識或金幣不足！", "error");
  }
});

btnTechClickMoney?.addEventListener("click", () => {
  if (state.tech.clickMoneyTech || !state.tech.clickMetalTech) return;
  const tCfg = gameConfig.combat.tech.clickMoneyTech;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.tech.clickMoneyTech = true;
    spawnFloatingText("🎓 鑄幣許可權已研發!", "#eab308");
    showToast("💰 解鎖【鑄幣許可權】！現在可以手動賺取金幣了！", "success");
    updateUI();
  } else {
    showToast("❌ 研究知識或金幣不足！", "error");
  }
});

btnTechDoubleClick?.addEventListener("click", () => {
  if (state.tech.doubleClickTech || !state.tech.clickMoneyTech) return;
  const tCfg = gameConfig.combat.tech.doubleClickTech;
  const reqE = tCfg.reqEnergy || 0;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney && state.energy >= reqE) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.energy -= reqE;
    state.tech.doubleClickTech = true;
    spawnFloatingText("🎓 神經增幅模組已研發!", "#eab308");
    showToast("⚡ 解鎖【神經增幅模組】！所有手動點擊資源的效率翻倍！", "success");
    updateUI();
  } else {
    showToast("❌ 研究知識、金幣或電力不足！", "error");
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

btnTechAppraisal?.addEventListener("click", () => {
  if (state.tech.appraisalTech || !state.tech.heroLicense) return;
  const tCfg = gameConfig.combat.tech.appraisalTech;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.tech.appraisalTech = true;
    spawnFloatingText("🔮 鑑定水晶球已研發!", "#c084fc");
    showToast("🔍 解鎖【鑑定水晶球】！現在可以看到探險者的真實能力數值了！", "success");
    updateUI();
  } else {
    showToast("❌ 研究知識或金幣不足！", "error");
  }
});

btnTechTemple?.addEventListener("click", () => {
  if (state.tech.templeTech || !state.tech.automation) return;
  const tCfg = gameConfig.combat.tech.templeTech;
  const reqE = tCfg.reqEnergy || 0;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney && state.energy >= reqE) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.energy -= reqE;
    state.tech.templeTech = true;
    spawnFloatingText("🎓 轉職神殿已修復!", "#f472b6");
    showToast("🏛️ 解鎖【古老轉職神殿】！開啟神殿分頁，助英雄晉升更高階級！", "success");
    updateUI();
  } else {
    showToast("❌ 研究知識、金幣或電力不足！", "error");
  }
});

btnTechAutomation?.addEventListener("click", () => {
  if (state.tech.automation) return;
  const tCfg = gameConfig.combat.tech.automation;
  const reqE = tCfg.reqEnergy || 0;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney && state.energy >= reqE) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.energy -= reqE;
    state.tech.automation = true;
    spawnFloatingText("🎓 自動生產協議已研發!", "#34d399");
    showToast("⚙️ 解鎖【自動生產協議】！可在建地建立自動化採集機械！", "success");
    updateUI();
  } else {
    showToast("❌ 研究知識、金幣或電力不足！", "error");
  }
});

btnTechAutoStudy?.addEventListener("click", () => {
  if (state.tech.autoStudyTech || !state.tech.automation) return;
  const tCfg = gameConfig.combat.tech.autoStudyTech;
  const reqE = tCfg.reqEnergy || 0;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney && state.energy >= reqE) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.energy -= reqE;
    state.tech.autoStudyTech = true;
    spawnFloatingText("🎓 自我迭代算法已研發!", "#eab308");
    showToast("🤖 解鎖【自我迭代算法】！現在可建造強大的「自動科研儀」！", "success");
    updateUI();
  } else {
    showToast("❌ 研究知識、金幣或電力不足！", "error");
  }
});

btnTechHuntLv4?.addEventListener("click", () => {
  if (state.tech.huntLv4) return;
  const tCfg = gameConfig.combat.tech.huntLv4;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.tech.huntLv4 = true;
    spawnFloatingText("🎓 蒸汽齒輪革命已研發!", "#60a5fa");
    showToast("⚙️ 解鎖【蒸汽齒輪革命】！討伐上限開放至 Lv.6！", "success");
    updateLevelSelectors();
    updateUI();
  } else {
    showToast("❌ 研究知識或金幣不足！", "error");
  }
});

btnTechHuntLv7?.addEventListener("click", () => {
  if (state.tech.huntLv7 || !state.tech.huntLv4) return;
  const tCfg = gameConfig.combat.tech.huntLv7;
  const reqE = tCfg.reqEnergy || 0;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney && state.energy >= reqE) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.energy -= reqE;
    state.tech.huntLv7 = true;
    spawnFloatingText("🎓 反物質星航力已研發!", "#60a5fa");
    showToast("🚀 解鎖【反物質星航力】！討伐等級上限全開至 Lv.10！", "success");
    updateLevelSelectors();
    updateUI();
  } else {
    showToast("❌ 研究知識、金幣或電力不足！", "error");
  }
});

btnTechSecretLv4?.addEventListener("click", () => {
  if (state.tech.secretLv4) return;
  const tCfg = gameConfig.combat.tech.secretLv4;
  const reqE = tCfg.reqEnergy || 0;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney && state.energy >= reqE) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.energy -= reqE;
    state.tech.secretLv4 = true;
    spawnFloatingText("🎓 量子算力特區已研發!", "#60a5fa");
    showToast("🌐 解鎖【量子算力特區】！神秘商店貨架升級至 Lv.5！", "success");
    updateLevelSelectors();
    updateUI();
  } else {
    showToast("❌ 研究知識、金幣或電力不足！", "error");
  }
});

btnTechSecretLv7?.addEventListener("click", () => {
  if (state.tech.secretLv7 || !state.tech.secretLv4) return;
  const tCfg = gameConfig.combat.tech.secretLv7;
  const reqE = tCfg.reqEnergy || 0;
  if (state.knowledge >= tCfg.reqKnowledge && state.money >= tCfg.reqMoney && state.energy >= reqE) {
    state.knowledge -= tCfg.reqKnowledge;
    state.money -= tCfg.reqMoney;
    state.energy -= reqE;
    state.tech.secretLv7 = true;
    spawnFloatingText("🎓 歐米茄全知網已研發!", "#60a5fa");
    showToast("🪐 解鎖【歐米茄全知網】！神秘商店終極貨架全開至 Lv.7！", "success");
    updateLevelSelectors();
    updateUI();
  } else {
    showToast("❌ 研究知識、金幣或電力不足！", "error");
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
  currentSequence: [], // Array of recorded stable gestures (max 6)
  lastAddedGesture: null, // Track previous committed gesture to enforce alternating transitions
  
  // Debouncer parameters to filter out single-frame flicker
  lastFrameRawGesture: null, 
  stableFramesCount: 0,
  
  lastGestureTime: Date.now(), // For idle inactivity timeout
  lastUpdateTime: Date.now()
};

function resetChantState() {
  chantState.currentSequence = [];
  chantState.lastAddedGesture = null;
  chantState.lastFrameRawGesture = null;
  chantState.stableFramesCount = 0;
  chantState.lastGestureTime = Date.now();
  chantState.lastUpdateTime = Date.now();
}

function getDistance(p1, p2) {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + 
    Math.pow(p1.y - p2.y, 2) + 
    Math.pow(p1.z - p2.z, 2)
  );
}

function classifyHand(landmarks) {
  const wrist = landmarks[0];
  
  // Distance comparison from finger tip to wrist VS knuckle base (MCP) to wrist
  // If tip-to-wrist distance > knuckle-to-wrist * 1.23, the finger is extended
  const isExtended = (tipIdx, mcpIdx) => {
    const tipDist = getDistance(landmarks[tipIdx], wrist);
    const mcpDist = getDistance(landmarks[mcpIdx], wrist);
    return tipDist > (mcpDist * 1.23); // Ratio multiplier (~1.20 - 1.25) is highly stable
  };

  const indexExtended = isExtended(8, 5);
  const middleExtended = isExtended(12, 9);
  const ringExtended = isExtended(16, 13);
  const pinkyExtended = isExtended(20, 17);

  // Determine Gesture
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return "ROCK";
  } else if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return "PAPER";
  } else if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    return "SCISSORS";
  } else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return "INDEX";
  }
  
  return "OTHER";
}

// Core Spell Chanting Processor
function checkSequenceResult() {
  const seq = chantState.currentSequence.join(",");
  
  const balancedSeq = "SCISSORS,ROCK,PAPER,SCISSORS,ROCK,PAPER";
  const defensiveSeq = "ROCK,PAPER,ROCK,PAPER,ROCK,PAPER";
  const offensiveSeq = "SCISSORS,PAPER,SCISSORS,PAPER,SCISSORS,PAPER";
  
  // Visual Flash Function
  const flashBg = (color) => {
    const view = document.getElementById("combatViewport");
    if (view) {
      const orig = view.style.boxShadow;
      view.style.transition = "box-shadow 0.3s ease";
      view.style.boxShadow = `inset 0 0 60px ${color}`;
      setTimeout(() => { view.style.boxShadow = orig; }, 1000);
    }
  };

  if (seq === balancedSeq) {
    combatState.aiMode = 'balanced';
    logBattle(`✨⚖️ 結印成功！【平衡戰術 AI】引導充能完成！✨`, "log-item-buff");
    showToast("⚖️ 手勢判定：啟動平衡智能模式！", "info");
    spawnFloatingText("✨ AI BALANCED ✨", "#60a5fa");
    flashBg("rgba(96, 165, 250, 0.6)");
  } else if (seq === defensiveSeq) {
    combatState.aiMode = 'defensive';
    logBattle(`✨🛡️ 結印成功！【守護防衛 AI】堅實屏障構築！✨`, "log-item-buff");
    showToast("🛡️ 手勢判定：啟動守護智能模式！", "info");
    spawnFloatingText("🛡️ AI DEFENSIVE 🛡️", "#34d399");
    flashBg("rgba(52, 211, 153, 0.6)");
  } else if (seq === offensiveSeq) {
    combatState.aiMode = 'offensive';
    logBattle(`✨⚔️ 結印成功！【強攻狂暴 AI】狂熱怒火點燃！✨`, "log-item-buff");
    showToast("⚔️ 手勢判定：啟動強攻智能模式！", "info");
    spawnFloatingText("🔥 AI OFFENSIVE 🔥", "#f87171");
    flashBg("rgba(248, 113, 113, 0.6)");
  } else {
    logBattle(`❌ 結印失敗：序列不符，凝結的魔力潰散。`, "log-item-dmg");
    showToast("❌ 結印序列錯誤，請重新開始！", "error");
    spawnFloatingText("❌ CHANT FAILED ❌", "#ef4444");
    flashBg("rgba(239, 68, 68, 0.5)");
  }
  
  updateAiModeUI();
  resetChantState();
}

function processHandSpell(landmarks) {
  const gesture = classifyHand(landmarks);
  chantState.lastUpdateTime = Date.now();

  // --- DEBOUNCING LAYER ---
  if (gesture === chantState.lastFrameRawGesture) {
    chantState.stableFramesCount++;
  } else {
    chantState.lastFrameRawGesture = gesture;
    chantState.stableFramesCount = 1;
  }

  const DEBOUNCE_FRAMES = 4;
  
  if (chantState.stableFramesCount === DEBOUNCE_FRAMES) {
    const stableGesture = gesture;
    
    if (stableGesture !== "OTHER" && stableGesture !== chantState.lastAddedGesture) {
      chantState.currentSequence.push(stableGesture);
      chantState.lastAddedGesture = stableGesture;
      chantState.lastGestureTime = Date.now(); // Update inactivity timer!
      
      const len = chantState.currentSequence.length;
      const emojiMap = { "ROCK":"✊", "PAPER":"✋", "SCISSORS":"✌️", "INDEX":"☝️" };
      const icon = emojiMap[stableGesture] || "❔";
      logBattle(`🔮 結印印記記錄：[ ${icon} ${stableGesture} ] (${len}/6)`);
      spawnFloatingText(`${icon} ${len}/6`, "#c084fc");

      if (len === 6) {
        checkSequenceResult();
      }
    }
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
    <div style="background: rgba(15, 11, 28, 0.6); border: 1px solid rgba(168, 85, 247, 0.35); padding: 0.9rem; border-radius: 14px; width: 100%; backdrop-filter: blur(8px); box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
      <div style="font-weight: 800; font-size: 0.88rem; color: #c084fc; margin-bottom: 0.6rem; display:flex; justify-content:space-between; text-shadow: 0 0 8px rgba(168,85,247,0.4);">
        <span style="display:flex; align-items:center; gap:5px;">🔮 元素結印軌跡 (Trajectory)</span>
        <span id="chant-seq-len" style="font-family: monospace; color:#e9d5ff; background:rgba(168,85,247,0.2); padding: 1px 6px; border-radius:4px;">0 / 6</span>
      </div>
      
      <!-- Sequence Slot Array -->
      <div id="gesture-slots-container" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.4rem; margin-bottom: 1rem;">
        <div class="gesture-slot" id="slot-0" style="aspect-ratio:1; background:rgba(255,255,255,0.04); border:1px dashed rgba(255,255,255,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; color:rgba(255,255,255,0.3); transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">❔</div>
        <div class="gesture-slot" id="slot-1" style="aspect-ratio:1; background:rgba(255,255,255,0.04); border:1px dashed rgba(255,255,255,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; color:rgba(255,255,255,0.3); transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">❔</div>
        <div class="gesture-slot" id="slot-2" style="aspect-ratio:1; background:rgba(255,255,255,0.04); border:1px dashed rgba(255,255,255,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; color:rgba(255,255,255,0.3); transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">❔</div>
        <div class="gesture-slot" id="slot-3" style="aspect-ratio:1; background:rgba(255,255,255,0.04); border:1px dashed rgba(255,255,255,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; color:rgba(255,255,255,0.3); transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">❔</div>
        <div class="gesture-slot" id="slot-4" style="aspect-ratio:1; background:rgba(255,255,255,0.04); border:1px dashed rgba(255,255,255,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; color:rgba(255,255,255,0.3); transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">❔</div>
        <div class="gesture-slot" id="slot-5" style="aspect-ratio:1; background:rgba(255,255,255,0.04); border:1px dashed rgba(255,255,255,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; color:rgba(255,255,255,0.3); transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">❔</div>
      </div>
      
      <!-- AI Recipe Cheatsheet -->
      <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.6rem;">
        <div style="font-size: 0.7rem; color: #94a3b8; margin-bottom: 0.5rem; text-transform:uppercase; font-weight:700; letter-spacing:0.05em;">📜 戰術法陣秘籍 (Recipes)</div>
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.78rem; color: #cbd5e1;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:3px 6px; border-radius:4px;">
            <span style="display:flex; align-items:center; gap:4px;">⚖️ <b style="color:#60a5fa;">平衡 AI</b></span>
            <span style="font-size:0.85rem; letter-spacing:2px;">✌️✊✋✌️✊✋</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:3px 6px; border-radius:4px;">
            <span style="display:flex; align-items:center; gap:4px;">🛡️ <b style="color:#34d399;">守護 AI</b></span>
            <span style="font-size:0.85rem; letter-spacing:2px;">✊✋✊✋✊✋</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:3px 6px; border-radius:4px;">
            <span style="display:flex; align-items:center; gap:4px;">⚔️ <b style="color:#f87171;">強攻 AI</b></span>
            <span style="font-size:0.85rem; letter-spacing:2px;">✌️✋✌️✋✌️✋</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function updateChantUI() {
  const currentLen = chantState.currentSequence.length;
  const lenDisplay = document.getElementById("chant-seq-len");
  if (lenDisplay) lenDisplay.textContent = `${currentLen} / 6`;

  const emojiMap = { "ROCK": "✊", "PAPER": "✋", "SCISSORS": "✌️", "INDEX": "☝️" };
  
  for (let i = 0; i < 6; i++) {
    const slot = document.getElementById(`slot-${i}`);
    if (!slot) continue;
    
    if (i < currentLen) {
      const gesture = chantState.currentSequence[i];
      const icon = emojiMap[gesture] || "❓";
      
      if (slot.textContent !== icon) {
        slot.textContent = icon;
        slot.style.background = "rgba(168, 85, 247, 0.28)";
        slot.style.border = "1px solid rgba(192, 132, 252, 0.7)";
        slot.style.color = "#ffffff";
        slot.style.boxShadow = "0 0 12px rgba(168, 85, 247, 0.5)";
        
        // Fire an explosive elastic scale pop
        slot.style.transform = "scale(1.25) rotate(6deg)";
        setTimeout(() => {
          slot.style.transform = "scale(1) rotate(0deg)";
        }, 250);
      }
    } else {
      // Empty slot
      if (slot.textContent !== "❔") {
        slot.textContent = "❔";
        slot.style.background = "rgba(255, 255, 255, 0.04)";
        slot.style.border = "1px dashed rgba(255, 255, 255, 0.15)";
        slot.style.color = "rgba(255, 255, 255, 0.3)";
        slot.style.boxShadow = "none";
        slot.style.transform = "scale(1)";
      }
    }
  }

  const velocityBar = document.getElementById("mediaVelocityBar");
  if (velocityBar) {
    const progress = currentLen / 6;
    velocityBar.style.width = `${progress * 100}%`;
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
    // 1. Stale reset: reset if no hands are detected for 2 seconds
    if (Date.now() - chantState.lastUpdateTime > 2000 && (chantState.currentSequence.length > 0 || chantState.lastAddedGesture)) {
      resetChantState();
      updateChantUI();
    }
  }
  
  // 2. Inactivity timeout: if user stays idle on same gesture for 4 seconds, decay sequence
  if (chantState.currentSequence.length > 0 && Date.now() - chantState.lastGestureTime > 4000) {
    logBattle("🕯️ 結印中斷：凝聚的元素散佚，法印消散了。");
    resetChantState();
    updateChantUI();
  }
  
  requestAnimationFrame(predictLoop);
}

// Initialize Inventory Quick Controls
function initInventoryControls() {
  const btnSellNormal = document.getElementById("btnSellNormal");
  const btnSellMagic = document.getElementById("btnSellMagic");
  const btnSellRare = document.getElementById("btnSellRare");
  const btnSellEpic = document.getElementById("btnSellEpic");

  const chkNormal = document.getElementById("chkAutoSellNormal");
  const chkMagic = document.getElementById("chkAutoSellMagic");
  const chkRare = document.getElementById("chkAutoSellRare");

  const bulkSellByRarity = (rarityKey) => {
    let count = 0;
    let totalGold = 0;
    // Iterate backwards to safely splice
    for (let i = state.inventory.length - 1; i >= 0; i--) {
      const item = state.inventory[i];
      if (item.rarity === rarityKey) {
        const sellVal = Math.ceil((gameConfig.eqSpecs.price[item.level] || 100) * 0.3);
        totalGold += sellVal;
        state.inventory.splice(i, 1);
        count++;
      }
    }
    if (count > 0) {
      state.money += totalGold;
      const rName = gameConfig.eqSpecs.rarities[rarityKey]?.name || rarityKey;
      showToast(`💰 一鍵賣出 ${count} 件 [${rName}] 裝備，獲得 💰${totalGold.toLocaleString()}`, "info");
      renderInventory();
      updateUI();
    } else {
      const rName = gameConfig.eqSpecs.rarities[rarityKey]?.name || rarityKey;
      showToast(`🎒 背包中沒有 [${rName}] 等級的裝備可販售。`, "info");
    }
  };

  btnSellNormal?.addEventListener("click", () => bulkSellByRarity("normal"));
  btnSellMagic?.addEventListener("click", () => bulkSellByRarity("magic"));
  btnSellRare?.addEventListener("click", () => bulkSellByRarity("rare"));
  btnSellEpic?.addEventListener("click", () => bulkSellByRarity("epic"));

  const updateSetting = (key, val) => {
    if (!state.autoSell) state.autoSell = { normal: false, magic: false, rare: false, epic: false };
    state.autoSell[key] = val;
  };

  chkNormal?.addEventListener("change", (e) => updateSetting("normal", e.target.checked));
  chkMagic?.addEventListener("change", (e) => updateSetting("magic", e.target.checked));
  chkRare?.addEventListener("change", (e) => updateSetting("rare", e.target.checked));
}

// Init on DOM load
window.addEventListener("DOMContentLoaded", () => {
  initInventoryControls();
  updateAiModeUI();
  updateUI(true);
  updateLevelSelectors();
  initSkillGrid();
  initMediaPipe();
});

