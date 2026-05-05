import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";
import { mapSymptomsToDiseases } from "../utils/symptom_mapper.js";
import { detectDiseaseKeywords, detectDiseaseNature, detectProblemType, detectCrop } from "../utils/detection.js";
import { computeScore, isFertilizerProduct, isFertilizerQuery } from "../utils/scoring.js";
import { analyzeQuery } from "../utils/query_analyzer.js";
import { detectAmbiguity } from "../utils/ambiguity_detector.js";
import { generateQuestions } from "../utils/question_generator.js";
import { getSession, updateSession } from "../utils/session_manager.js";

const SCORE_THRESHOLD_RECOMMEND = 0.45;
const SCORE_THRESHOLD_LOW       = 0.30;

function loadActiveIngredients(productName) {
  try {
    const productsDir = path.join(process.cwd(), "data/products");
    const files = fs.readdirSync(productsDir);
    const normalize = s => s.toLowerCase().replace(/[%\s]/g, "_").replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_");
    const normalizedTarget = normalize(productName);
    const match = files.find(f => normalize(f.replace(".json", "")) === normalizedTarget);
    if (!match) return [];
    const raw = JSON.parse(fs.readFileSync(path.join(productsDir, match), "utf8"));
    return (raw.active_ingredients || []).map(ai => ({
      name: ai.name,
      percentage: ai.percentage,
      chemical_group: ai.chemical_group || null,
    }));
  } catch {
    return [];
  }
}

function formatActiveIngredients(ingredients) {
  if (!ingredients || ingredients.length === 0) return "N/A";
  return ingredients.map(ai => ai.name + " " + ai.percentage).join(" + ");
}

export async function runRecommendation(data) {
  const query = data.raw_query || data;
  console.log("\n🌾 User Query:", query);

  const db = JSON.parse(fs.readFileSync(path.join(process.cwd(), "vector_store/vectors.json")));
  const embedder = await pipeline("feature-extraction", "Xenova/bge-m3");
  const output = await embedder(query, { pooling: "mean", normalize: true });
  const queryVector = Array.from(output.data);

  const sessionSymptoms = data.symptoms || [];
  const mappedDiseases  = mapSymptomsToDiseases(sessionSymptoms);
  const keywordDiseases = detectDiseaseKeywords(query);
  const detectedDiseases = [...new Set([...sessionSymptoms, ...mappedDiseases, ...keywordDiseases])];

  let problemType = data.problem_type || detectProblemType(query);
  if (detectedDiseases.length > 0) problemType = "disease";

  const crop = data.crop || detectCrop(query);
  const diseaseNature = data.disease_nature || detectDiseaseNature(detectedDiseases, query);

  console.log("🧠 Problem type:", problemType);
  console.log("🌾 Crop:", crop || "none");
  console.log("🔬 Disease nature:", diseaseNature || "unknown");
  console.log("🦠 Diseases:", detectedDiseases);

  let filteredDB = db.filter(item => item.metadata.chunk_type === "product");

  if (!isFertilizerQuery(query, diseaseNature)) {
    if (problemType && problemType !== "unknown") {
      const narrowed = filteredDB.filter(item => item.metadata.problem_type === problemType);
      if (narrowed.length > 0) filteredDB = narrowed;
    }
  } else {
    console.log("🌱 Skipping problemType filtering for fertilizer query");
  }

  const queryInfo = { query, detectedDiseases, problemType, crop, diseaseNature };

  let results = filteredDB
    .map(item => {
      let score = computeScore(item, queryVector, queryInfo);

      if (isFertilizerQuery(query, diseaseNature) && isFertilizerProduct(item)) {
        score += 0.5;
      }

      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);

  if (isFertilizerQuery(query, diseaseNature)) {
    console.log("🌱 FERTILIZER QUERY DETECTED → enforcing fertilizer-only results");

    const beforeCount = results.length;
    results = results.filter(item => isFertilizerProduct(item));
    const afterCount = results.length;

    console.log(`📊 Filtered results: ${beforeCount} → ${afterCount}`);

    if (results.length === 0) {
      console.warn("❌ CRITICAL: No fertilizer products found after filtering");

      return [{
        product: "No fertilizer found",
        category: "N/A",
        type: "N/A",
        active_ingredients: "N/A",
        controls: "N/A",
        crops: "N/A",
        score: 0,
        diseaseNature,
        note: "No fertilizer products matched — check dataset metadata"
      }];
    }
  }

  const top = results.slice(0, 3);

  return top.map(r => {
    const activeIngredients = loadActiveIngredients(r.metadata.product_name);
    return {
      product: r.metadata.product_name,
      category: r.metadata.category,
      type: r.metadata.type,
      active_ingredients: formatActiveIngredients(activeIngredients),
      controls: (r.metadata.diseases || []).slice(0, 4).join(", ") || "N/A",
      crops: (r.metadata.crops || []).slice(0, 4).join(", ") || "N/A",
      score: r.score,
      diseaseNature,
    };
  });
}

export async function handleQuery(userInput, sessionId = "default") {
  const session = getSession(sessionId);

  const analysis = analyzeQuery(userInput);
  analysis.raw_query = userInput;

  // 🔥 FIX 3: BRAND / INGREDIENT DIRECT SEARCH
  if (analysis.brandInfo && (analysis.brandInfo.hasBrand || analysis.brandInfo.hasIngredient)) {
    console.log("🏷️ BRAND / INGREDIENT QUERY DETECTED");

    const db = JSON.parse(fs.readFileSync(path.join(process.cwd(), "vector_store/vectors.json")));
    const searchTerm = (analysis.brandInfo.brandName || analysis.brandInfo.ingredientName).toLowerCase();

    const matches = db.filter(item => {
  if (item.metadata.chunk_type !== "product") return false;

  const name = String(item.metadata.product_name || "").toLowerCase();
  const type = String(item.metadata.type || "").toLowerCase();
  const category = String(item.metadata.category || "").toLowerCase();
  const text = String(item.text || "").toLowerCase();

  // 🔥 STRONG MATCH: text + name (this is enough)
  return (
    name.includes(searchTerm) ||
    text.includes(searchTerm)
  );
});

    if (matches.length > 0) {
      console.log(`✅ Found ${matches.length} direct matches`);

      return {
        type: "final_answer",
        confidence: "high",
        searchType: "brand",
        result: matches.slice(0, 5).map(item => ({
          product: item.metadata.product_name,
          category: item.metadata.category,
          type: item.metadata.type,
          controls: (item.metadata.diseases || []).join(", ") || "N/A",
          crops: (item.metadata.crops || []).join(", ") || "N/A"
        }))
      };
    }

    console.log("⚠️ No direct matches — fallback");
  }

  updateSession(session, analysis);

  const ambiguity = detectAmbiguity(session.collectedData);
  console.log("🧪 Ambiguity:", ambiguity);

  if (ambiguity.isAmbiguous) {
    return {
      type: "follow_up",
      questions: generateQuestions(ambiguity.missingFields, {
        problem_type: session.collectedData.problem_type,
        symptoms: session.collectedData.symptoms,
        hardMissing: ambiguity.hardMissing,
      })
    };
  }

  const result = await runRecommendation(session.collectedData);
  const topScore = result[0]?.score || 0;

  if (topScore < SCORE_THRESHOLD_LOW) {
    return {
      type: "follow_up",
      questions: ["مزید تفصیل بتائیں — فصل کا نام، علامات، اور مسئلہ کی قسم بتائیں"]
    };
  }

  if (topScore < SCORE_THRESHOLD_RECOMMEND) {
    return {
      type: "final_answer",
      confidence: "low",
      result
    };
  }

  return { type: "final_answer", confidence: "high", result };
}

// 🔥 CLI RUNNER (VERY IMPORTANT)
if (process.argv[1].includes("search_recommendation.js")) {
  const query = process.argv[2];

if (!query) {
  console.log("❌ Please provide a query");
  process.exit(1);
}

  handleQuery(query).then(res => {
    console.log("\n📤 RESPONSE:\n", JSON.stringify(res, null, 2));
  });
}