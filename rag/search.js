const fs = require("fs");
const path = require("path");
const similarity = require("compute-cosine-similarity");

async function run() {
  const query = process.argv[2];

  if (!query) {
    console.log("❌ Please provide a search query");
    return;
  }

  const { pipeline } = await import("@xenova/transformers");

  console.log("🌾 User Query:", query);
  console.log("--------------------------------------------------");

  // ✅ Load vector DB
  const dbPath = path.join(__dirname, "../vector_store/vectors.json");

  if (!fs.existsSync(dbPath)) {
    console.log("❌ vectors.json not found. Run embed script first.");
    return;
  }

  const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  console.log("📦 Total vectors loaded:", db.length);

  // ✅ Load embedding model
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  console.log("🧠 Embedding model loaded");

  // ✅ Create query embedding
  const output = await embedder(query, {
    pooling: "mean",
    normalize: true,
  });

  const queryVector = Array.from(output.data);

  // ✅ Compute similarity
  const results = db.map((item) => ({
    text: item.text,
    product: item.metadata?.product || "unknown",
    score: similarity(queryVector, item.vector),
  }));

  results.sort((a, b) => b.score - a.score);

  console.log("\n🔝 Top Matches:\n");

  results.slice(0, 3).forEach((r) => {
    console.log(`📦 Product: ${r.product}`);
    console.log(`⭐ Score: ${r.score.toFixed(3)}`);
    console.log(`📝 ${r.text.substring(0, 120)}...\n`);
  });
}

run();
