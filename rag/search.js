const fs = require("fs");
const path = require("path");
const cosineSimilarity = require("cosine-similarity");

// paths
const VECTOR_DB = path.join(__dirname, "../vector_store/vectors.json");

// load vector DB
const db = JSON.parse(fs.readFileSync(VECTOR_DB, "utf-8"));

// 🧠 LOAD EMBEDDING MODEL
let embedder;
async function loadModel() {
  const { pipeline } = await import("@xenova/transformers");
  embedder = await pipeline(
    "feature-extraction",
    "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
  );
}

// 🧠 GET QUERY EMBEDDING
async function embed(text) {
  const output = await embedder(text, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}

// 🧠 DETECT FARMER INTENT
function detectIntent(query) {
  query = query.toLowerCase();

  if (
    query.includes("کیڑا") ||
    query.includes("سفید مکھی") ||
    query.includes("thrips") ||
    query.includes("aphid")
  ) return "insect";

  if (
    query.includes("جڑی بوٹی") ||
    query.includes("گھاس") ||
    query.includes("سوانکی") ||
    query.includes("ڈیلا")
  ) return "weed";

  if (
    query.includes("بیماری") ||
    query.includes("داغ") ||
    query.includes("بلائٹ") ||
    query.includes("بلاسٹ") ||
    query.includes("جھلساؤ") ||
    query.includes("پھپھوند")
  ) return "disease";

  if (
    query.includes("کمی") ||
    query.includes("پیلا") ||
    query.includes("ٹلرنگ") ||
    query.includes("زنک")
  ) return "nutrition";

  return "unknown";
}

// 🧠 CATEGORY → INTENT MAP
function categoryToIntent(category) {
  if (!category) return "";

  category = category.toLowerCase();

  if (category.includes("insect")) return "insect";
  if (category.includes("herb")) return "weed";
  if (category.includes("fung")) return "disease";
  if (category.includes("nutrition")) return "nutrition";

  return "";
}

// 🚀 SEARCH FUNCTION
async function search(query) {
  await loadModel();

  console.log("\n🌾 User Query:", query);
  console.log("--------------------------------------------------");

  const queryVector = await embed(query);
  const farmerIntent = detectIntent(query);

  console.log("🧠 Detected intent:", farmerIntent);

  const scored = db.map((item) => {
    let score = cosineSimilarity(queryVector, item.vector);

    const productIntent = categoryToIntent(item.metadata.category);

    // ✅ BOOST IF INTENT MATCHES
    if (farmerIntent === productIntent) {
      score += 0.15;
    }

    // ❌ PENALIZE WRONG CATEGORY
    if (
      farmerIntent !== "unknown" &&
      productIntent &&
      farmerIntent !== productIntent
    ) {
      score -= 0.15;
    }

    return {
      ...item,
      score,
    };
  });

  // sort
  scored.sort((a, b) => b.score - a.score);

  const TOP_K = 3;
  const CONFIDENCE_THRESHOLD = 0.40;

  console.log(
    "🧪 Top matches:",
    scored.slice(0, 3).map((i) => ({
      product: i.metadata.product_name,
      score: i.score.toFixed(3),
    }))
  );

  console.log("🔍 Top score:", scored[0].score.toFixed(3));

  if (scored[0].score < CONFIDENCE_THRESHOLD) {
    console.log("❗ مسئلہ واضح نہیں۔ مہربانی کرکے مزید تفصیل دسو۔");
    return;
  }

  console.log("\n🏆 Top Recommendations:\n");

  scored.slice(0, TOP_K).forEach((item, index) => {
    console.log(`🥇 Rank ${index + 1}`);
    console.log(`📦 Product: ${item.metadata.product_name}`);
    console.log(`📊 Score: ${item.score.toFixed(3)}`);
    console.log(`📄 Reason:\n${item.text}`);
    console.log("--------------------------------------------------");
  });
}

// run
const userQuery = process.argv[2];
search(userQuery);
