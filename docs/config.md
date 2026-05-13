# 遊戲配置文件說明 (docs/config.md)

本文件說明存放在 `/src/config.json` 的全局配置檔各項參數意義。未來若要調整遊戲數值平衡（建造成本、怪獸強度、金幣收益等），只需直接修改 `config.json` 即可。

---

## 📋 配置目錄架構說明

### 1. `costs` (建造成本)
定義聘僱人口與建造各類設施所需的基礎資源消耗量。
- **格式**：`"建材種類": 消耗數量`
- **項目**：
  - `worker`: 招募工人的基本食物消耗。
  - `cabin`: 建造小屋 (木頭)。
  - `farm`: 建造農場 (木頭、石頭)。
  - `smelter`: 建造熔煉廠 (木頭、石頭)。
  - `powerPlant`: 建造發電廠 (石頭、金屬)。
  - `warehouse`: 建造倉庫 (木頭、石頭)。
  - `battery`: 建造蓄電池組 (石頭、金屬)。
  - `bank`: 建造銀行 (石頭、金屬)。
  - `school`: 建造學院 (木頭、石頭、能源)。

### 2. `economy` (經濟動態機制)
配置全域的資源及金幣上限、與學者的資源消耗係數。
- `baseMoneyCap`: 初始最高能持有的金幣量 (基礎為 1,000)。
- `bankMoneyBonus`: 每一棟銀行能為玩家提升的「金幣上限」空間 (基礎為 50,000)。
  - **公式**：$\text{總金幣上限} = baseMoneyCap + (\text{銀行數} \times bankMoneyBonus)$
- `recruitBaseCost`: 在第一座銀行建立後，招募人口額外收取的通貨膨脹金幣費 (基礎為 5 💰)。
- `scholarFoodCost` / `scholarMoneyCost` / `scholarEnergyCost`: 學者每秒產出 1.0 知識點數時，各自需要消耗的「食物、金幣、能源」比率。

### 3. `eqSpecs` (RPG 裝備庫規格)
調整商店白板裝價格、紙娃娃部位強度倍率、裝備稀有度。
- `price`: 陣列型態。索引 [1]~[7] 為裝備 Lv.1 ~ Lv.7 的白板售價。
- `slots`: 定義裝備的 6 個部位。
  - `name`: UI 上顯示的中文部位名稱。
  - `mainStat`: 該部位的主屬性 (例如：`body` 主屬性為 `hp`)。
  - `scale`: 該部位屬性的縮放乘數 (乘數越高，每級獲得屬性越多)。
- `rarities`: 稀有度級別配置 (`normal`, `magic`, `rare`, `epic`, `legend`)。
  - `name`: 稀有度中文名稱。
  - `color`: UI 渲染的霓虹邊框十六進位色彩。
  - `extraStats`: 此稀有度裝備在掉落時會隨機附魔的「額外詞條個數」。
  - `mult`: 該稀有度的基礎主屬性乘法係數。

### 4. `heroes` (英雄初始屬性模板)
定義無畏勇者（Warrior）與元素法師（Mage）的初始數值框架與招募費用。
- `hireCost`: 冒險者公會中的招募金幣門檻。
- `hp` / `maxHp` / `mp` / `maxMp`: 基礎生存血量與魔力池上限。
- `atk` (物攻)、`def` (物防)、`matk` (魔攻)、`mdef` (魔防)、`spd` (速度)。
- `lifesteal`: 物理吸血比率；`mlifesteal`: 魔法吸血比率。
> **等級成長公式**：英雄升級時，所有基礎屬性將會依據 $(1 + (Level - 1) \times 0.2)$ 的縮放曲線自動成長。

### 5. `combat` (小怪與魔王設定)
設定副本遠征的怪獸資料與成長曲線。
- `tech.heroLicense`: 研發英雄招募令所需的知識點數 (`reqKnowledge`) 與金幣點數 (`reqMoney`)。
- `mobs`: 可愛小怪的基本庫。
  - `list`: 小怪的隨機名字與 Emoji 圖示清單。
  - `base`: Lv.1 怪物的基礎血量與攻擊力配置。
  - `scaling.levelMult`: 怪獸隨英雄隊伍平均等級的指數成長係數 (基礎為 1.4)。
  - `scaling.duoMult`: 當啟用「雙人組隊」出征時，野生小怪血量會乘以此係數進行難度縮放 (基礎為 1.8)。
  - `scaling.rewardExpBase` / `rewardMoneyBase`: 怪物等級 1 的基礎經驗值與金幣獎勵基準。
- `bosses`: 貪 (Greed)、嗔 (Anger)、癡 (Ignorance) 三大終極魔王的屬性配置區。
  - 包含固定的 `hp`, `atk`, `def`, `matk`, `mdef`, `spd` 與高額報酬設定。

---

## 📝 開發者修改建議
1. **調整經濟難度**：如果覺得工人死太快或產錢太難，可以直接下修 `costs.worker.food` 或上修 `economy.bankMoneyBonus`。
2. **增加新部位或稀有度**：可以直接在 `slots` 或 `rarities` 項目中增加 JSON 物件，JavaScript 底層的隨機生成器會自動動態抓取鍵值渲染，無需重複修改程式邏輯！
