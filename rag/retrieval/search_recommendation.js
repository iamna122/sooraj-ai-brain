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

import { analyzeQuery } from "../utils/query_analyzer.js";
import { detectAmbiguity } from "../utils/ambiguity_detector.js";
import { generateQuestions } from "../utils/question_generator.js";
import { getSession, updateSession } from "../utils/session_manager.js";

// ─── CONFIDENCE THRESHOLDS ────────────────────────────────────────────────────
// These control when to recommend vs ask a follow-up.
// Tune these as you expand your dataset.
const SCORE_THRESHOLD_RECOMMEND = 0.45;  // was 0.8 — that was killing all recommendations
const SCORE_THRESHOLD_LOW       = 0.30;  // below this = not enough info, always ask

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

  // ── Disease detection ──────────────────────────────────────────────────────
  // Start from session symptoms, expand with symptom mapper, then fall back
  // to keyword detection on raw query. Merge all three — no overwriting.
  const sessionSymptoms  = data.symptoms || [];
  const mappedDiseases   = mapSymptomsToDiseases(sessionSymptoms);
  const keywordDiseases  = detectDiseaseKeywords(query);

  const detectedDiseases = [
    ...new Set([...sessionSymptoms, ...mappedDiseases, ...keywordDiseases])
  ];

  // ── Problem type ───────────────────────────────────────────────────────────
  // Prefer session data, then fall back to query detection.
  // If diseases were found, override to "disease" regardless.
  let problemType =
    data.problem_type || detectProblemType(query);

  if (detectedDiseases.length > 0) problemType = "disease";

  // ── Crop ───────────────────────────────────────────────────────────────────
  const crop = data.crop || detectCrop(query);

  // ── Disease nature ─────────────────────────────────────────────────────────
  // Use what analyzeQuery already computed if available (more accurate),
  // fall back to detectDiseaseNature for backward compat.
  const diseaseNature =
    data.disease_nature || detectDiseaseNature(detectedDiseases, query);

  console.log("🧠 Problem type:", problemType);
  console.log("🌾 Crop:", crop || "none");
  console.log("🔬 Disease nature:", diseaseNature || "unknown");
  console.log("🦠 Diseases:", detectedDiseases);

  // ── Filter ─────────────────────────────────────────────────────────────────
  // Only keep product chunks. If problem type is known, narrow further.
  let filteredDB = db.filter(item => item.metadata.chunk_type === "product");

  if (problemType && problemType !== "unknown") {
    const narrowed = filteredDB.filter(
      item => item.metadata.problem_type === problemType
    );
    // Only apply the narrowing if it actually returns results.
    // If not, fall back to all products — better a broad answer than nothing.
    if (narrowed.length > 0) filteredDB = narrowed;
  }

  // ── Score ──────────────────────────────────────────────────────────────────
  // Pass disease_nature into queryInfo so computeScore can boost
  // the correct product type (fungicide for fungal, bactericide for bacterial).
  const queryInfo = {
    query,
    detectedDiseases,
    problemType,
    crop,
    diseaseNature,          // ← this is the key fix for wrong ranking
  };

  const results = filteredDB
    .map(item => ({
      ...item,
      score: computeScore(item, queryVector, queryInfo)
    }))
    .sort((a, b) => b.score - a.score);

  const top = results.slice(0, 3);

  return top.map(r => ({
    product:        r.metadata.product_name,
    type:           r.metadata.type,
    category:       r.metadata.category,
    score:          r.score,
    diseaseNature,
  }));
}

// ------------------------------------------------------------
// 🧠 INTERACTIVE LAYER
// ------------------------------------------------------------
export async function handleQuery(userInput, sessionId = "default") {
  const session = getSession(sessionId);

  // analyzeQuery now returns crop, problem_type, symptoms,
  // disease_nature, crop_stage, disease_confidence
  const analysis = analyzeQuery(userInput);
  analysis.raw_query = userInput;

  updateSession(session, analysis);

  // ── Ambiguity check ────────────────────────────────────────────────────────
  const ambiguity = detectAmbiguity(session.collectedData);
  console.log("🧪 Ambiguity:", ambiguity);

  if (ambiguity.isAmbiguous) {
    return {
      type:      "follow_up",
      questions: generateQuestions(ambiguity.missingFields)
    };
  }

  // ── Run recommendation ─────────────────────────────────────────────────────
  const result = await runRecommendation(session.collectedData);

  const topScore = result[0]?.score || 0;

  console.log("📊 Top score:", topScore);

  // ── Confidence gate ────────────────────────────────────────────────────────
  // Three tiers:
  //   < LOW      → definitely not enough info, ask again
  //   LOW–RECOMMEND → borderline, show result but flag as low confidence
  //   > RECOMMEND → confident, return final answer
  if (topScore < SCORE_THRESHOLD_LOW) {
    return {
      type:      "follow_up",
      questions: ["مزید تفصیل بتائیں — فصل کا نام، علامات، اور مسئلہ کی قسم بتائیں"]
    };
  }

  if (topScore < SCORE_THRESHOLD_RECOMMEND) {
    return {
      type:       "final_answer",
      confidence: "low",
      note:       "نتیجہ غیر یقینی ہے — مزید معلومات سے بہتر رہنمائی ممکن ہے",
      result
    };
  }

  return {
    type:       "final_answer",
    confidence: "high",
    result
  };
}

// ------------------------------------------------------------
// 🧩 CLI MODE
// ------------------------------------------------------------
if (process.argv[1].includes("search_recommendation.js")) {
  const query = process.argv[2];

  handleQuery(query).then(res => {
    console.log("\n📤 RESPONSE:\n", JSON.stringify(res, null, 2));
  });
}