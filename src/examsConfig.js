export const EXAM_BANKS = {
  mathPromote: [ // Lv.5 Job Change (Easy/Medium Math)
    { q: "試問複數單位平方 $i^2$ 的值是多少？", opts: ["1", "-1", "0", "$i$"], ans: "-1" },
    { q: "代數求解：$2x + 7 = 15$，請問 $x = $？", opts: ["3", "4", "5", "8"], ans: "4" },
    { q: "對數計算：$\\log_{10}(1000)$ 等於？", opts: ["1", "2", "3", "4"], ans: "3" },
    { q: "直角三角形兩股長度為 3 與 4，其斜邊長度為？", opts: ["4", "5", "6", "7"], ans: "5" },
    { q: "平面直角座標系中，點 $(3, 4)$ 到原點的距離為？", opts: ["3", "4", "5", "7"], ans: "5" },
    { q: "若一個圓的半徑為 $r$，其面積公式為？", opts: ["$2\\pi r$", "$\\pi r^2$", "$\\frac{4}{3}\\pi r^3$", "$\\pi r$"], ans: "$\\pi r^2$" }
  ],
  mathLevel10: [ // Lv.9 -> Lv.10 (Hard Math / Calculus)
    { q: "求自然對數的導數：$\\frac{d}{dx} (\\ln x) = $？", opts: ["$\\frac{1}{x}$", "$e^x$", "$x$", "$\\frac{1}{x^2}$"], ans: "$\\frac{1}{x}$" },
    { q: "計算定積分：$\\int_0^1 3x^2 dx = $？", opts: ["0.5", "1", "2", "3"], ans: "1" },
    { q: "三角函數恆等式：$\\sin^2 \\theta + \\cos^2 \\theta = $？", opts: ["0", "1", "2", "不存在"], ans: "1" },
    { q: "求極限值：$\\lim_{x \\to \\infty} \\frac{2x^2 + x}{x^2 - 1} = $？", opts: ["0", "1", "2", "$\\infty$"], ans: "2" },
    { q: "求導數：$\\frac{d}{dx} (e^{2x}) = $？", opts: ["$e^{2x}$", "$2e^{2x}$", "$\\frac{1}{2}e^{2x}$", "$2x e^{2x-1}$"], ans: "$2e^{2x}$" }
  ],
  englishShop: [ // Dynamic Extra Shop Refresh Exam (English Practice)
    { q: "下列英文單字何者是「形容詞 (Adjective)」？", opts: ["Beauty", "Beautiful", "Beautify", "Beautifully"], ans: "Beautiful" },
    { q: "介係詞辨析：\"He is interested ____ music.\"", opts: ["in", "on", "at", "with"], ans: "in" },
    { q: "英文單字填空：\"I need to ______ my homework.\"", opts: ["make", "do", "take", "have"], ans: "do" },
    { q: "單字 \"Abundant\" 的最接近同義詞是？", opts: ["Scarce", "Rare", "Plentiful", "Hidden"], ans: "Plentiful" },
    { q: "慣用語 \"A piece of cake\" 的含意是？", opts: ["一塊蛋糕", "奢侈享受", "非常簡單的事", "麻煩的開端"], ans: "非常簡單的事" },
    { q: "英文單字 \"Generous\" (慷慨的) 其反義詞是？", opts: ["Kind", "Helpful", "Stingy", "Rich"], ans: "Stingy" },
    { q: "動詞 \"write\" 的過去分詞 (Past Participle) 為何？", opts: ["wrote", "written", "writing", "writes"], ans: "written" },
    { q: "單字 \"Incredible\" (不可思議的) 的同義詞是：", opts: ["Ordinary", "Boring", "Amazing", "Simple"], ans: "Amazing" },
    { q: "慣用語 \"Break a leg\" 在口語中的含意是？", opts: ["祝你好運！", "折斷大腿", "遭遇不幸", "快點跑開"], ans: "祝你好運！" },
    { q: "中翻英：「冒險」最對應的英文單字是？", opts: ["Advance", "Adventure", "Adversity", "Advice"], ans: "Adventure" }
  ],
  scienceHunt: [ // Dynamic High Level Hunt Interrupt (Science Trivia)
    { q: "下列關於「光合作用」的敘述，何者正確？", opts: ["放出大量一氧化碳", "主要利用葉綠素將二氧化碳與水轉化為糖與氧", "主要在夜間進行", "這是動物獲取熱量的唯一途徑"], ans: "主要利用葉綠素將二氧化碳與水轉化為糖與氧" },
    { q: "太陽系中，哪一顆行星因表面覆蓋大量氧化鐵而顯現紅色，被稱為「紅色星球」？", opts: ["水星", "金星", "火星", "土星"], ans: "火星" },
    { q: "在標準一大氣壓下，純水的「沸點」為攝氏幾度？", opts: ["0度", "50度", "100度", "200度"], ans: "100度" },
    { q: "人體血液中，主要負責輸送氧氣的「紅血球成分」是什麼？", opts: ["白血球", "血小板", "血紅素", "淋巴液"], ans: "血紅素" },
    { q: "牛頓第二運動定律中，力與質量、加速度的關係式為何？", opts: ["$E = mc^2$", "$F = ma$", "$V = IR$", "$P = IV$"], ans: "$F = ma$" },
    { q: "物質若不經過液態，由固體直接轉變為氣體的物理現象稱為？", opts: ["汽化", "昇華", "凝固", "熔化"], ans: "昇華" },
    { q: "下列哪一項是目前科學界公認生物體的基本結構與功能單位？", opts: ["分子", "原子", "細胞", "器官"], ans: "細胞" },
    { q: "地球的大氣層中，所佔體積比例「最高」的氣體是？", opts: ["氧氣", "二氧化碳", "氫氣", "氮氣"], ans: "氮氣" },
    { q: "「酸雨」的主要形成原因，是因為空氣中含有過多的何種污染物？", opts: ["二氧化碳", "硫氧化物與氮氧化物", "惰性氣體", "水蒸氣"], ans: "硫氧化物與氮氧化物" },
    { q: "在力學計算中，一個物體在地球表面受到的重力加速度 $g$ 大約是多少？", opts: ["$9.8 \\text{ m/s}^2$", "$1.6 \\text{ m/s}^2$", "$12.5 \\text{ m/s}^2$", "$3.6 \\text{ m/s}^2$"], ans: "$9.8 \\text{ m/s}^2$" }
  ]
};
