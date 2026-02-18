const fs = require("fs");
const path = require("path");

const VECTOR_DB = path.join(__dirname, "../vector_store/vectors.json");

// cosine similarity
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

async function search(query) {
  const { pipeline } = await import("@xenova/transformers");

  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
  );

  const db = JSON.parse(fs.readFileSync(VECTOR_DB, "utf-8"));

  // embed user query
  const output = await embedder(query, {
    pooling: "mean",
    normalize: true,
  });

  const queryVector = Array.from(output.data);

  // score all vectors
  const scored = db.map((item) => ({
    score: cosineSimilarity(queryVector, item.vector),
    ...item,
  }));

  // sort best → worst
  scored.sort((a, b) => b.score - a.score);

  const TOP_K = 3;

  // DEVELOPMENT THRESHOLD (for small dataset)
  const CONFIDENCE_THRESHOLD = 0.35;

  console.log("\n🌾 User Query:", query);
  console.log("--------------------------------------------------");

  // show top-3 scores for debugging
  console.log(
    "🧪 Top matches:",
    scored.slice(0, 3).map((i) => ({
      product: i.metadata.product_name,
      score: i.score.toFixed(3),
    }))
  );

  console.log("🔍 Top score:", scored[0].score.toFixed(3));

  // safety check
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

const userQuery = process.argv[2];

search(userQuery);
