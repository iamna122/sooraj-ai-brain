// rag/retrieval/search_recommendation.js
import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";
import { mapSymptomsToDiseases } from "../utils/symptom_mapper.js";

import {
  detectDiseaseKeywords,
  detectDiseaseNature,
  detectProblemType,
  detectCrop
} from "../utils/detection.js";

import {
  computeScore,
  confidenceLabel,
  safeJoin
} from "../utils/scoring.js";

// ✅ NEW IMPORTS
import { analyzeQuery } from "../utils/query_analyzer.js";
import { detectAmbiguity } from "../utils/ambiguity_detector.js";
import { generateQuestions } from "../utils/question_generator.js";
import { getSession, updateSession } from "../utils/session_manager.js";

// ------------------------------------------------------------
// 🧾 Recommendation Generator
// ------------------------------------------------------------
function generateRecommendation(product, detectedDiseases) {
  const diseases = product.metadata.diseases || [];
  return `
👉 Recommended Product: ${product.metadata.product_name}

👉 Why:
- Controls: ${diseases.slice(0, 3).join(", ") || "multiple diseases"}
- Category: ${product.metadata.category}
- Matches problem: ${detectedDiseases.join(", ") || "general issue"}
`;
}

// ------------------------------------------------------------
// 🚀 CORE SEARCH FUNCTION
// ------------------------------------------------------------
export async function runRecommendation(data) {
  const query = data.raw_query || data;

  console.log("\n🌾 User Query:", query);

  const db = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "vector_store/vectors.json"))
  );

  const embedder = await pipeline("feature-extraction", "Xenova/bge-m3");
  const output = await embedder(query, { pooling: "mean", normalize: true });
  const queryVector = Array.from(output.data);

  // ✅ USE SESSION DATA FIRST
  let detectedDiseases =
  data.symptoms || detectDiseaseKeywords(query);

// 🔥 NEW: expand using symptom mapping
const mappedDiseases = mapSymptomsToDiseases(data.symptoms || []);

detectedDiseases = [
  ...new Set([...detectedDiseases, ...mappedDiseases])
];

  let problemType =
    data.problem_type || detectProblemType(query);

  const crop =
    data.crop || detectCrop(query);

  if (detectedDiseases.length > 0) problemType = "disease";

  const diseaseNature = detectDiseaseNature(detectedDiseases, query);

  console.log("🧠 Detected problem type:", problemType);
  console.log("🌾 Detected crop:", crop || "none");

  // FILTER
  let filteredDB =
    problemType !== "unknown"
      ? db.filter(
          item =>
            item.metadata.problem_type === problemType &&
            item.metadata.chunk_type === "product"
        )
      : db.filter(item => item.metadata.chunk_type === "product");

  if (filteredDB.length === 0) filteredDB = db;

  // SCORING
  const queryInfo = { query, detectedDiseases, problemType, crop, diseaseNature };

  const results = filteredDB.map(item => ({
    ...item,
    score: computeScore(item, queryVector, queryInfo)
  }));

  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, 3);

  return top.map(r => ({
    product: r.metadata.product_name,
    type: r.metadata.type,
    score: r.score
  }));
}

// ------------------------------------------------------------
// 🧠 INTERACTIVE LAYER
// ------------------------------------------------------------
export async function handleQuery(userInput, sessionId = "default") {
  const session = getSession(sessionId);

  const analysis = analyzeQuery(userInput);
  analysis.raw_query = userInput;

  updateSession(session, analysis);

  const ambiguity = detectAmbiguity(session.collectedData);

  console.log("🧪 Ambiguity:", ambiguity); // ✅ DEBUG

  if (ambiguity.isAmbiguous) {
    return {
      type: "follow_up",
      questions: generateQuestions(ambiguity.missingFields)
    };
  }

  const result = await runRecommendation(session.collectedData);
// 🔥 NEW: confidence check
const topScore = result[0]?.score || 0;

if (topScore < 0.8) {
  return {
    type: "follow_up",
    questions: ["مزید تفصیل بتائیں تاکہ بہتر رہنمائی دی جا سکے"]
  };
}

  return {
    type: "final_answer",
    result
  };
}

// ------------------------------------------------------------
// 🧩 CLI MODE (FIXED)
// ------------------------------------------------------------
if (process.argv[1].includes("search_recommendation.js")) {
  const query = process.argv[2];

  handleQuery(query).then(res => {
    console.log("\n📤 RESPONSE:\n", JSON.stringify(res, null, 2));
  });
}