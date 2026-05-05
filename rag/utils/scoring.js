import cosine from "compute-cosine-similarity";

export const BOOSTS = {
  keywordMatch:       0.08,
  cropMatch:          0.15,
  diseaseMatch:       0.40,
  correctType:        0.50,
  wrongTypePenalty:  -0.25,
  comboBonus:         0.10,
};

const NATURE_TYPE_MAP = {
  fungal: {
    correct:   ["fungicide"],
    acceptable:["fungicide + bactericide", "combo", "systemic"],
    wrong:     ["bactericide", "insecticide", "herbicide"],
  },
  bacterial: {
    correct:   ["bactericide"],
    acceptable:["combo"],
    wrong:     ["fungicide", "insecticide"],
  },
  viral: {
    correct:   ["insecticide"],
    acceptable:["systemic", "combo"],
    wrong:     [],
  },
  nutritional: {
    correct:   ["fertilizer", "nutrient", "zinc", "iron"],
    acceptable:["bio stimulant"],
    wrong:     ["fungicide", "insecticide"],
  },
};

function extractKeywords(query) {
  return query.toLowerCase().split(/\s+/).filter(w => w.length >= 4);
}

export function computeScore(item, queryVector, queryInfo) {
  const { query = "", detectedDiseases = [], problemType = null, crop = null, diseaseNature = null } = queryInfo;

  let score = cosine(queryVector, item.vector) || 0;

  const chunkText = (item.text || "").toLowerCase();
  const productType = String(item.metadata?.type || "").toLowerCase();

  const keywords = extractKeywords(query);
  const keywordHits = keywords.filter(kw => chunkText.includes(kw)).length;
  if (keywordHits > 0) {
    score += BOOSTS.keywordMatch * Math.min(keywordHits, 3) * 0.5;
  }

  if (crop && item.metadata?.crops?.includes(crop)) {
    score += BOOSTS.cropMatch;
  }

  if (detectedDiseases.length > 0 && Array.isArray(item.metadata?.diseases)) {
    const productDiseases = item.metadata.diseases.map(d => d.toLowerCase());
    const matchCount = detectedDiseases.filter(d => productDiseases.includes(d.toLowerCase())).length;

    if (matchCount > 0) {
      score += BOOSTS.diseaseMatch;
    }
  }

  if (problemType === "disease" && diseaseNature && NATURE_TYPE_MAP[diseaseNature]) {
    const map = NATURE_TYPE_MAP[diseaseNature];

    if (map.correct.some(t => productType.includes(t))) {
      score += BOOSTS.correctType;
    } else if (map.wrong.some(t => productType.includes(t))) {
      score += BOOSTS.wrongTypePenalty;
    }
  }

  if (productType.includes("combo")) {
    score += BOOSTS.comboBonus;
  }

  return parseFloat(score.toFixed(4));
}

// ✅ STRONG fertilizer detection
export function isFertilizerProduct(item) {
  const category = (item.metadata?.category || "").toLowerCase();
  const type = String(item.metadata?.type || "").toLowerCase();
  const name = (item.metadata?.product_name || "").toLowerCase();

  const signals = [
    "fertilizer","nutrient","npk","dap","urea",
    "potash","nitrogen","phosphorus","zinc",
    "iron","boron","micronutrient","کھاد"
  ];

  return signals.some(s =>
    category.includes(s) ||
    type.includes(s) ||
    name.includes(s)
  );
}

export function isFertilizerQuery(query, diseaseNature) {
  const q = query.toLowerCase();

  if (diseaseNature === "nutritional") return true;

  return [
    "fertilizer","khad","کھاد",
    "nitrogen","phosphorus","potash",
    "npk","urea","dap",
    "yellow","pale"
  ].some(k => q.includes(k));
}