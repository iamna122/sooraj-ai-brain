import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";
import { computeScore } from "../utils/scoring.js";
import { analyzeQuery } from "../utils/query_analyzer.js";
import { detectAmbiguity } from "../utils/ambiguity_detector.js";
import { generateQuestions } from "../utils/question_generator.js";
import { getSession, updateSession } from "../utils/session_manager.js";

const normalize = (str) =>
  String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// ─────────────────────────────────────────
// SAFE ARRAY HANDLER (🔥 FIX FOR YOUR ERROR)
// ─────────────────────────────────────────
const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") return [val];
  return [];
};

// ─────────────────────────────────────────
// RAG RECOMMENDATION
// ─────────────────────────────────────────
export async function runRecommendation(data) {
  const query = data.raw_query || data;

  const db = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "vector_store/vectors.json"))
  );

  const embedder = await pipeline("feature-extraction", "Xenova/bge-m3");
  const output = await embedder(query, { pooling: "mean", normalize: true });
  const queryVector = Array.from(output.data);

  let results = db
    .filter((item) => item.metadata.chunk_type === "product")
    .map((item) => ({
      ...item,
      score: computeScore(item, queryVector, data),
    }))
    .sort((a, b) => b.score - a.score);

  return results.slice(0, 3).map((r) => ({
    product: r.metadata.product_name,
    category: r.metadata.category,
    type: r.metadata.type,
    controls: toArray(r.metadata.diseases).join(", ") || "N/A",
    crops: toArray(r.metadata.crops).join(", ") || "N/A",
    score: r.score,
  }));
}

// ─────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────
export async function handleQuery(userInput, sessionId = "default") {
  const session = getSession(sessionId);

  const analysis = analyzeQuery(userInput);
  analysis.raw_query = userInput;

  // 🔥 BRAND / INGREDIENT SEARCH
  if (
    analysis.brandInfo &&
    (analysis.brandInfo.hasBrand || analysis.brandInfo.hasIngredient)
  ) {
    console.log("🏷️ BRAND / INGREDIENT QUERY DETECTED");

    const productsDir = path.join(process.cwd(), "data/products");
    const files = fs.readdirSync(productsDir);

    const searchTerm = (
      analysis.brandInfo.brandName ||
      analysis.brandInfo.ingredientName
    ).toLowerCase();

    const searchNorm = normalize(searchTerm);
    const matches = [];

    for (const file of files) {
      const filePath = path.join(productsDir, file);

      let raw = {};
      let name = normalize(file);

      try {
        const content = fs.readFileSync(filePath, "utf8");
        raw = JSON.parse(content);
        name = normalize(raw.product_name || raw.name || file);
      } catch (e) {
        console.log("⚠️ Failed to parse JSON, using filename:", file);
      }

      let ingredients = "";

      try {
        if (Array.isArray(raw.active_ingredients)) {
          ingredients = raw.active_ingredients
            .map((ai) => normalize(ai.name || ai))
            .join(" ");
        } else if (typeof raw.active_ingredients === "string") {
          ingredients = normalize(raw.active_ingredients);
        }
      } catch {}

      const text = normalize(raw.embedding_text || "");

      // console.log("DEBUG:", name, "|", ingredients);

      if (
        name.includes(searchNorm) ||
        file.includes(searchNorm) ||
        ingredients.includes(searchNorm) ||
        text.includes(searchNorm)
      ) {
        matches.push({
          product: raw.product_name || file.replace(".json", ""),
          category: raw.category || "N/A",
          type: raw.type || "N/A",
          controls: toArray(raw.diseases).join(", ") || "N/A",
          crops: toArray(raw.crops).join(", ") || "N/A",
        });
      }
    }

    if (matches.length > 0) {
      console.log(`✅ Found ${matches.length} direct matches`);

      return {
        type: "final_answer",
        confidence: "high",
        result: matches.slice(0, 5),
      };
    }

    console.log("⚠️ No direct matches — fallback");
  }

  // ─────────────────────────────────────────
  // NORMAL FLOW
  // ─────────────────────────────────────────
  updateSession(session, analysis);

  const ambiguity = detectAmbiguity(session.collectedData);

  if (ambiguity.isAmbiguous) {
    return {
      type: "follow_up",
      questions: generateQuestions(ambiguity.missingFields),
    };
  }

  const result = await runRecommendation(session.collectedData);

  return {
    type: "final_answer",
    confidence: "high",
    result,
  };
}

// ─────────────────────────────────────────
// CLI RUNNER
// ─────────────────────────────────────────
if (process.argv[1].includes("search_recommendation.js")) {
  const query = process.argv[2];

  if (!query) {
    console.log("❌ Please provide a query");
    process.exit(1);
  }

  handleQuery(query)
    .then((res) => {
      console.log("\n📤 RESPONSE:\n", JSON.stringify(res, null, 2));
    })
    .catch((err) => {
      console.error("❌ Error:", err);
    });
}