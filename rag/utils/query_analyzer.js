// rag/utils/query_analyzer.js

// ─── CROP MAP (55 crops) ──────────────────────────────────────────────────────
const CROP_MAP = {
  // ── MAJOR FIELD CROPS ──
  cotton:       ["cotton", "kapas", "کپاس", "narma", "نرما", "binola", "بنولہ"],
  wheat:        ["wheat", "gandum", "گندم", "gehun"],
  rice:         ["rice", "chawal", "dhan", "چاول", "دھان", "paddy"],
  maize:        ["maize", "corn", "makki", "مکئی", "bhutta", "بھٹہ"],
  sugarcane:    ["sugarcane", "ganna", "گنا", "گنے", "ikh", "اِکھ"],
  sorghum:      ["sorghum", "jowar", "جوار", "cholam"],
  millet:       ["millet", "bajra", "باجرہ", "pearl millet"],
  barley:       ["barley", "jau", "جَو"],
  sunflower:    ["sunflower", "surajmukhi", "سورج مکھی"],
  canola:       ["canola", "rapeseed", "sarson", "سرسوں", "mustard", "rai", "رائی"],
  sesame:       ["sesame", "til", "تل", "gingelly"],
  groundnut:    ["groundnut", "peanut", "moongphali", "مونگ پھلی"],
  soybean:      ["soybean", "soya", "soyabean", "بھٹماس"],

  // ── PULSES ──
  chickpea:     ["chickpea", "chana", "چنا", "gram", "desi chana", "kabuli chana"],
  lentil:       ["lentil", "masoor", "مسور", "red lentil"],
  mung:         ["mung", "moong", "مونگ", "green gram", "mung bean"],
  mash:         ["mash", "urad", "ماش", "black gram", "urad dal"],
  cowpea:       ["cowpea", "lobia", "لوبیا", "chawli"],

  // ── VEGETABLES ──
  potato:       ["potato", "aloo", "آلو"],
  tomato:       ["tomato", "tamatar", "ٹماٹر"],
  onion:        ["onion", "pyaz", "پیاز"],
  garlic:       ["garlic", "lehsun", "لہسن"],
  chilli:       ["chilli", "chili", "mirch", "مرچ", "lal mirch", "hari mirch"],
  brinjal:      ["brinjal", "eggplant", "baingan", "بینگن"],
  okra:         ["okra", "bhindi", "بھنڈی", "ladyfinger"],
  spinach:      ["spinach", "palak", "پالک"],
  cauliflower:  ["cauliflower", "phool gobi", "پھول گوبی", "gobi"],
  cabbage:      ["cabbage", "band gobi", "بند گوبی", "kobi"],
  peas:         ["peas", "matar", "مٹر", "green peas"],
  carrot:       ["carrot", "gajar", "گاجر"],
  radish:       ["radish", "mooli", "مولی"],
  turnip:       ["turnip", "shaljam", "شلجم"],
  cucumber:     ["cucumber", "kheera", "کھیرا", "khira"],
  bitter_gourd: ["bitter gourd", "karela", "کریلا"],
  bottle_gourd: ["bottle gourd", "lauki", "لوکی", "ghiya", "دودھی"],
  tinda:        ["tinda", "ٹنڈا", "round gourd", "apple gourd"],
  pumpkin:      ["pumpkin", "kaddu", "کدو"],
  watermelon:   ["watermelon", "tarbooz", "تربوز"],
  muskmelon:    ["muskmelon", "kharbooza", "خربوزہ"],

  // ── FRUITS ──
  mango:        ["mango", "aam", "آم"],
  citrus:       ["citrus", "kinnow", "کینو", "orange", "narangi", "نارنگی", "lemon", "limoo", "لیموں", "malta"],
  banana:       ["banana", "kela", "کیلا"],
  guava:        ["guava", "amrood", "امرود"],
  pomegranate:  ["pomegranate", "anar", "انار"],
  apple:        ["apple", "seb", "سیب"],
  grape:        ["grape", "angoor", "انگور"],
  date:         ["date", "khajoor", "کھجور"],
  peach:        ["peach", "aadu", "آڑو"],
  apricot:      ["apricot", "khubani", "خوبانی"],
  fig:          ["fig", "anjeer", "انجیر"],
  plum:         ["plum", "aloo bukhara", "آلو بخارہ"],
  mulberry:     ["mulberry", "toot", "توت"],
  strawberry:   ["strawberry", "اسٹرابیری"],
  papaya:       ["papaya", "papita", "پپیتا"],

  // ── CASH / OTHER ──
  tobacco:      ["tobacco", "tambaku", "تمباکو"],
  turmeric:     ["turmeric", "haldi", "ہلدی"],
  ginger:       ["ginger", "adrak", "ادرک"],
  fennel:       ["fennel", "saunf", "سونف"],
};

// ─── PROBLEM TYPE MAP ─────────────────────────────────────────────────────────
const PROBLEM_TYPE_MAP = {
  nutrition: [
    "khad", "کھاد", "fertilizer", "nutrient",
    "zinc", "zink", "زنک",
    "nitrogen", "naitrogen",
    "yellow", "zard", "زرد", "yellowing",
    "pale", "light green",
    "iron", "loha", "لوہا",
    "deficiency", "kami", "کمی",
    "urea", "یوریا",
    "dap", "ڈی اے پی",
    "potash", "پوٹاش",
  ],
  insect: [
    "keera", "کیڑا", "insect", "bug", "pest",
    "sundi", "سنڈی", "caterpillar", "larva",
    "chittal", "چھٹل", "mite", "mites",
    "thrips", "تھرپس",
    "whitefly", "safed makkhi", "سفید مکھی",
    "aphid", "chep", "چیپ",
    "jassid", "tela", "ٹیلا",
    "bollworm", "american sundi",
    "stem borer", "tana bedhak",
    "fruit fly", "phal ki makkhi",
    "mealy bug", "mealy",
  ],
  weed: [
    "grass", "ghass", "گھاس", "weed",
    "jhari", "جھاڑی", "unwanted plant",
    "kandali", "کنڈالی",
    "lehli", "لیہلی",
    "bathu", "باتھو",
    "dumbi siti", "ڈمبی سیٹی",
  ],
  disease: [
    "bimari", "بیماری", "disease", "infection",
    "daagh", "داغ", "spot", "dhabba", "دھبہ",
    "jhulsa", "جھلسا", "blight", "scorch",
    "saray", "سڑائی", "rot", "gal",
    "powder", "powdery", "safed powder", "سفید پاؤڈر",
    "rust", "zang", "زنگ",
    "mosaic", "curl", "leaf curl",
    "wilt", "murjhana", "مرجھانا",
    "canker", "lesion", "streak",
  ],
};

// ─── SYMPTOM MAP ──────────────────────────────────────────────────────────────
const SYMPTOM_MAP = {
  "daagh":          "leaf spot",
  "دھبہ":           "leaf spot",
  "dhabba":         "leaf spot",
  "spot":           "leaf spot",
  "leaf spot":      "leaf spot",
  "safed powder":   "powdery mildew",
  "powder":         "powdery mildew",
  "powdery":        "powdery mildew",
  "سفید پاؤڈر":    "powdery mildew",
  "rust":           "rust",
  "zang":           "rust",
  "زنگ":            "rust",
  "jhulsa":         "blight",
  "جھلسا":          "blight",
  "blight":         "blight",
  "scorch":         "blight",
  "wilt":           "wilt",
  "murjhana":       "wilt",
  "مرجھانا":        "wilt",
  "mosaic":         "mosaic virus",
  "curl":           "leaf curl",
  "leaf curl":      "leaf curl",
  "yellow":         "yellowing",
  "zard":           "yellowing",
  "زرد":            "yellowing",
  "rot":            "root rot",
  "saray":          "root rot",
  "سڑائی":          "root rot",
  "canker":         "canker",
  "streak":         "streak virus",
  "lesion":         "lesion",
  "pale":           "chlorosis",
  "light green":    "chlorosis",
};

// ─── DISEASE NATURE MAP ───────────────────────────────────────────────────────
const DISEASE_NATURE_MAP = {
  "leaf spot":      "fungal",
  "powdery mildew": "fungal",
  "rust":           "fungal",
  "blight":         "fungal",
  "wilt":           "fungal",
  "root rot":       "fungal",
  "canker":         "bacterial",
  "mosaic virus":   "viral",
  "leaf curl":      "viral",
  "streak virus":   "viral",
  "yellowing":      "nutritional",
  "chlorosis":      "nutritional",
  "lesion":         "fungal",
};

// ─── STAGE MAP ────────────────────────────────────────────────────────────────
const STAGE_MAP = {
  early:      ["early", "pehle", "شروع", "seedling", "germination", "naujawan", "ابتدائی"],
  mid:        ["mid", "middle", "درمیان", "درمیانی", "beech mein", "growing", "وسط"],
  late:       ["late", "آخر", "harvest", "mature", "pakne", "پکنے", "آخری"],
  flowering:  ["flower", "phool", "پھول", "flowering", "blooming", "پھول آنا"],
  vegetative: ["vegetative", "sabz", "سبز", "green stage", "sabzi"],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Used for crop and stage detection — simple first-match wins
function detectFromMap(text, map) {
  for (const [canonical, keywords] of Object.entries(map)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) return canonical;
    }
  }
  return null;
}

// Problem type uses priority order: nutrition > insect > weed > disease
// This prevents "zard" (yellow) being classified as disease instead of nutrition
const PROBLEM_TYPE_PRIORITY = ["nutrition", "insect", "weed", "disease"];

function detectProblemType(text) {
  for (const type of PROBLEM_TYPE_PRIORITY) {
    for (const kw of PROBLEM_TYPE_MAP[type]) {
      if (text.includes(kw.toLowerCase())) return type;
    }
  }
  return null;
}

function extractSymptoms(text) {
  const found = new Set();
  for (const [kw, canonical] of Object.entries(SYMPTOM_MAP)) {
    if (text.includes(kw.toLowerCase())) {
      found.add(canonical);
    }
  }
  return [...found];
}

function detectStage(text) {
  for (const [stage, keywords] of Object.entries(STAGE_MAP)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) return stage;
    }
  }
  return null;
}

function calcConfidence(result) {
  let score = 0;
  if (result.crop)                score += 0.30;
  if (result.problem_type)        score += 0.25;
  if (result.symptoms.length > 0) score += 0.25;
  if (result.crop_stage)          score += 0.10;
  if (result.symptoms.length > 1) score += 0.10;
  return Math.min(parseFloat(score.toFixed(2)), 1.0);
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export function analyzeQuery(input) {
  const text = input.toLowerCase().replace(/\s+/g, " ").trim();

  const result = {
    crop:               null,
    problem_type:       null,
    symptoms:           [],
    disease_nature:     null,
    crop_stage:         null,
    disease_confidence: 0,
    raw_input:          input,
  };

  result.crop         = detectFromMap(text, CROP_MAP);
  result.problem_type = detectProblemType(text);
  result.symptoms     = extractSymptoms(text);

  if (result.symptoms.length > 0) {
    result.disease_nature = DISEASE_NATURE_MAP[result.symptoms[0]] || null;
  }
result.crop_stage         = detectStage(text);
  result.disease_confidence = calcConfidence(result);

  return result;
}