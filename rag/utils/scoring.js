// rag/utils/scoring.js
import cosine from "compute-cosine-similarity";

// ─── BOOST VALUES ─────────────────────────────────────────────────────────────
// Tune these as your dataset grows. Keep diseaseMatch high — it's your
// strongest signal. correctType boost should always exceed wrongTypePenalty
// in absolute value so correct products always win.
export const BOOSTS = {
  keywordMatch:       0.08,   // individual keyword hit in chunk text
  cropMatch:          0.15,   // product covers detected crop
  diseaseMatch:       0.40,   // product controls a detected disease
  correctType:        0.50,   // product type matches disease nature (fungal→fungicide)
  wrongTypePenalty:  -0.25,   // product type is the WRONG treatment type
                              // (only applied when we're confident about nature)
  comboBonus:         0.10,   // product is a combo that covers multiple problem types
};

// ─── DISEASE NATURE → PRODUCT TYPE MAP ───────────────────────────────────────
// Defines which product types are correct, acceptable, or wrong
// for each disease nature. This is your domain intelligence layer.
const NATURE_TYPE_MAP = {
  fungal: {
    correct:   ["fungicide"],
    acceptable:["fungicide + bactericide", "combo", "systemic"],
    wrong:     ["bactericide", "insecticide", "herbicide", "weedicide"],
  },
  bacterial: {
    correct:   ["bactericide"],
    acceptable:["fungicide + bactericide", "combo"],
    wrong:     ["fungicide", "insecticide", "herbicide", "weedicide"],
  },
  viral: {
    // No direct antiviral — boost insecticides (kill virus vectors) and
    // growth promoters. Don't penalize anything hard here.
    correct:   ["insecticide"],   // kill aphids/whitefly that spread virus
    acceptable:["systemic", "combo"],
    wrong:     [],                // nothing is outright wrong for viral
  },
  nutritional: {
    correct:   ["fertilizer", "micronutrient", "zinc", "iron", "foliar"],
    acceptable:["growth promoter", "bio stimulant"],
    wrong:     ["fungicide", "bactericide", "insecticide", "herbicide"],
  },
  mite: {
    correct:   ["acaricide", "miticide"],
    acceptable:["insecticide", "combo"],
    wrong:     ["fungicide", "bactericide", "herbicide", "weedicide"],
  },
};

// ─── KEYWORD EXTRACTION ───────────────────────────────────────────────────────
// Split query into meaningful tokens (≥4 chars) for individual keyword matching.
// Much more useful than matching the entire query string.
function extractKeywords(query) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length >= 4);
}

// ─── CONFIDENCE LABEL ─────────────────────────────────────────────────────────
// Aligned with thresholds in search_recommendation.js
export function confidenceLabel(score) {
  if (score >= 0.45) return "🟢 High";
  if (score >= 0.30) return "🟡 Medium";
  return "🔴 Low";
}

export const safeJoin = arr =>
  Array.isArray(arr) && arr.length ? arr.join(", ") : "N/A";

// ------------------------------------------------------------
// 🧮 Main Scoring Function
// ------------------------------------------------------------
export function computeScore(item, queryVector, queryInfo) {
  const {
    query        = "",
    detectedDiseases = [],
    problemType  = null,
    crop         = null,
    diseaseNature = null,
  } = queryInfo;

  // ── Base: semantic similarity ──────────────────────────────────────────────
  let score = cosine(queryVector, item.vector) || 0;

  const chunkText   = (item.text || "").toLowerCase();
  const productType = String(item.metadata?.type || "").toLowerCase();

  // ── Keyword boost ──────────────────────────────────────────────────────────
  // Check individual meaningful tokens against chunk text — not the full string.
  const keywords = extractKeywords(query);
  const keywordHits = keywords.filter(kw => chunkText.includes(kw)).length;
  if (keywordHits > 0) {
    // Diminishing returns: first hit = full boost, extra hits add less
    score += BOOSTS.keywordMatch * Math.min(keywordHits, 3) * 0.5;
  }

  // ── Crop match boost ───────────────────────────────────────────────────────
  if (crop && item.metadata?.crops?.includes(crop)) {
    score += BOOSTS.cropMatch;
  }

  // ── Disease match boost ────────────────────────────────────────────────────
  if (detectedDiseases.length > 0 && Array.isArray(item.metadata?.diseases)) {
    const productDiseases = item.metadata.diseases.map(d => d.toLowerCase());
    const matchCount = detectedDiseases.filter(d =>
      productDiseases.includes(d.toLowerCase())
    ).length;

    if (matchCount > 0) {
      // Proportional boost: more disease matches = higher score
      const matchRatio = matchCount / detectedDiseases.length;
      score += BOOSTS.diseaseMatch * Math.min(matchRatio + 0.5, 1.0);
    }
  }

  // ── Disease nature intelligence ────────────────────────────────────────────
  // This is the core fix for fungicide vs bactericide ranking.
  // Only apply when we actually know the disease nature — never penalize
  // based on uncertainty.
  if (problemType === "disease" && diseaseNature && NATURE_TYPE_MAP[diseaseNature]) {
    const map = NATURE_TYPE_MAP[diseaseNature];

    const isCorrect    = map.correct.some(t => productType.includes(t));
    const isAcceptable = map.acceptable.some(t => productType.includes(t));
    const isWrong      = map.wrong.some(t => productType.includes(t));

    if (isCorrect) {
      score += BOOSTS.correctType;
    } else if (isAcceptable) {
      score += BOOSTS.correctType * 0.4;   // partial boost for combo/systemic
    } else if (isWrong) {
      score += BOOSTS.wrongTypePenalty;
    }
    // If none match (unknown product type) — no change, don't penalize uncertainty
  }

  // ── Combo product bonus ────────────────────────────────────────────────────
  // Combo products that cover multiple problem types get a small bonus
  // because they're safer recommendations when nature is uncertain.
  if (
    productType.includes("combo") ||
    productType.includes("fungicide + bactericide")
  ) {
    score += BOOSTS.comboBonus;
  }

  return parseFloat(score.toFixed(4));
}