// rag/utils/query_analyzer.js

// ─── CROP MAP (55 crops) ──────────────────────────────────────────────────────
const CROP_MAP = {
  cotton: ["cotton","kapas","کپاس","narma","نرما","binola","بنولہ"],
  wheat: ["wheat","gandum","گندم","gehun"],
  rice: ["rice","chawal","dhan","چاول","دھان","paddy"],
  maize: ["maize","corn","makki","مکئی","bhutta","بھٹہ"],
  sugarcane: ["sugarcane","ganna","گنا","گنے","ikh","اِکھ"],
  sorghum: ["sorghum","jowar","جوار","cholam"],
  millet: ["millet","bajra","باجرہ","pearl millet"],
  barley: ["barley","jau","جَو"],
  sunflower: ["sunflower","surajmukhi","سورج مکھی"],
  canola: ["canola","rapeseed","sarson","سرسوں","mustard","rai","رائی"],
  sesame: ["sesame","til","تل","gingelly"],
  groundnut: ["groundnut","peanut","moongphali","مونگ پھلی"],
  soybean: ["soybean","soya","soyabean","بھٹماس"],

  chickpea: ["chickpea","chana","چنا","gram"],
  lentil: ["lentil","masoor","مسور"],
  mung: ["mung","moong","مونگ"],
  mash: ["mash","urad","ماش"],
  cowpea: ["cowpea","lobia","لوبیا"],

  potato: ["potato","aloo","آلو"],
  tomato: ["tomato","tamatar","ٹماٹر"],
  onion: ["onion","pyaz","پیاز"],
  garlic: ["garlic","lehsun","لہسن"],
  chilli: ["chilli","mirch","مرچ"],
  brinjal: ["brinjal","baingan","بینگن"],
  okra: ["okra","bhindi","بھنڈی"],
  spinach: ["spinach","palak","پالک"],
  cauliflower: ["cauliflower","gobi"],
  cabbage: ["cabbage","kobi"],
  peas: ["peas","matar","مٹر"],
  carrot: ["carrot","gajar","گاجر"],
  radish: ["radish","mooli","مولی"],
  cucumber: ["cucumber","kheera","کھیرا"],

  mango: ["mango","aam","آم"],
  citrus: ["citrus","kinnow","کینو"],
  banana: ["banana","kela","کیلا"],
  guava: ["guava","amrood","امرود"],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function detectFromMap(text, map) {
  for (const [canonical, keywords] of Object.entries(map)) {
    for (const kw of keywords) {
      if (text.includes(kw)) return canonical;
    }
  }
  return null;
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export function analyzeQuery(input) {
  const text = (input || "").toLowerCase();

  const result = {
    crop: null,
    problem_type: null,
    symptoms: [],
    disease_nature: null,
    crop_stage: null,
    disease_confidence: 0,
    raw_input: input,
  };

  result.crop = detectFromMap(text, CROP_MAP);

  // ─────────────────────────────────────────
  // 🔥 FIX 3: BRAND + INGREDIENT DETECTION
  // ─────────────────────────────────────────

  const BRANDS = [
    "sooraj","nipa","roundup","faceup","wolf",
    "سورج","نیپا"
  ];

  const INGREDIENTS = [
    "imidacloprid","mancozeb","glyphosate",
    "lambda","chlorpyrifos","acetamiprid",
    "امیڈاکلوپرڈ"
  ];

  const brand = BRANDS.find(b => text.includes(b));
  const ingredient = INGREDIENTS.find(i => text.includes(i));

  result.brandInfo = {
    hasBrand: !!brand,
    brandName: brand || null,
    hasIngredient: !!ingredient,
    ingredientName: ingredient || null
  };

  return result;
}