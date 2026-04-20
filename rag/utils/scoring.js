// rag/utils/scoring.js
import cosine from "compute-cosine-similarity";

export const BOOSTS = {
  keywordMatch: 0.1,
  cropMatch: 0.15,
  diseaseMatch: 0.4,
  correctType: 0.5,
  wrongTypePenalty: -0.3
};

export function confidenceLabel(score) {
  if (score > 0.75) return "🟢 High";
  if (score > 0.55) return "🟡 Medium";
  return "🔴 Low";
}

export const safeJoin = arr =>
  Array.isArray(arr) && arr.length ? arr.join(", ") : "N/A";

// ------------------------------------------------------------
// 🧮 Scoring Function
// ------------------------------------------------------------
export function computeScore(item, queryVector, queryInfo) {
  const {
    query,
    detectedDiseases,
    problemType,
    crop,
    diseaseNature
  } = queryInfo;

  let score = cosine(queryVector, item.vector);
  const text = item.text.toLowerCase();
  const q = query.toLowerCase();

  // keyword boost
  if (text.includes(q)) score += BOOSTS.keywordMatch;

  // crop boost
  if (crop && item.metadata.crops?.includes(crop)) score += BOOSTS.cropMatch;

  // disease match boost
  if (
    detectedDiseases.length > 0 &&
    item.metadata.diseases?.some(d => detectedDiseases.includes(d.toLowerCase()))
  ) {
    score += BOOSTS.diseaseMatch;
  }

  // problem‑type intelligence (fungal / bacterial)
  if (problemType === "disease") {
    const type = item.metadata.type?.toLowerCase() || "";
    const isFungicide = type.includes("fungicide");
    const isBactericide = type.includes("bactericide");

    if (diseaseNature === "fungal") {
      score += isFungicide ? BOOSTS.correctType : BOOSTS.wrongTypePenalty;
    }
    if (diseaseNature === "bacterial") {
      score += isBactericide ? BOOSTS.correctType : BOOSTS.wrongTypePenalty;
    }
  }

  return score;
}
