// rag/utils/detection.js
export function detectDiseaseKeywords(query) {
  query = query.toLowerCase();

  const map = {
    "leaf spot": ["daagh", "dhabba", "spots"],
    "rust": ["zang", "rust"],
    "blight": ["jalao", "blight"],
    "powdery mildew": ["safed powder", "powdery"],
    "downy mildew": ["downy"]
  };

  const detected = [];

  for (const disease in map) {
    if (map[disease].some(k => query.includes(k))) detected.push(disease);
  }

  return detected;
}

// ------------------------------------------------------------
// 🌿 Disease Nature Detection
// ------------------------------------------------------------
export function detectDiseaseNature(detectedDiseases, query) {
  const fungal = ["leaf spot", "rust", "blight", "powdery mildew", "downy mildew"];
  const bacterial = ["bacterial", "bacterial blight"];

  const scores = { fungal: 0, bacterial: 0 };

  detectedDiseases.forEach(d => {
    if (fungal.includes(d)) scores.fungal++;
    if (bacterial.includes(d)) scores.bacterial++;
  });

  const q = query.toLowerCase();
  if (q.includes("daagh") || q.includes("fungus")) scores.fungal++;
  if (q.includes("bacterial")) scores.bacterial++;

  if (scores.fungal > scores.bacterial) return "fungal";
  if (scores.bacterial > scores.fungal) return "bacterial";
  return "unknown";
}

// ------------------------------------------------------------
// 🌾 Problem Type Detection
// ------------------------------------------------------------
export function detectProblemType(query) {
  query = query.toLowerCase();

  if (["keera", "insect", "bug"].some(k => query.includes(k))) return "insect";
  if (["daagh", "dhabba", "fungus", "blight", "rust"].some(k => query.includes(k))) return "disease";
  if (["ghaas", "weed"].some(k => query.includes(k))) return "weed";
  if (["zard", "deficiency"].some(k => query.includes(k))) return "nutrition";

  return "unknown";
}

// ------------------------------------------------------------
// 🌾 Crop Detection
// ------------------------------------------------------------
export function detectCrop(query) {
  query = query.toLowerCase();

  if (query.includes("cotton") || query.includes("کپاس")) return "cotton";
  if (query.includes("rice") || query.includes("دھان")) return "rice";
  if (query.includes("wheat") || query.includes("گندم")) return "wheat";

  return null;
}
