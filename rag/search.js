const fs = require("fs");
const path = require("path");
const cosine = require("compute-cosine-similarity");

async function run() {
  const { pipeline } = await import("@xenova/transformers");

  const query = process.argv[2];
  if (!query) {
    console.log("❌ Please provide a query");
    return;
  }

  console.log("\n🌾 User Query:", query);

  // 📦 LOAD VECTOR DB
  const db = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../vector_store/vectors.json"),
      "utf-8"
    )
  );

  console.log("📦 Total vectors loaded:", db.length);

  // 🧠 LOAD MODEL
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  console.log("🧠 Embedding model loaded");

  // 🔎 QUERY EMBEDDING
  const output = await embedder(query, {
    pooling: "mean",
    normalize: true,
  });

  const queryVector = Array.from(output.data);

  // 🧠 INTENT DETECTION
  const intent =
    /whitefly|aphid|jassid|thrips|hopper|کیڑا/.test(query) ? "insect" :
    /کمی|deficiency|zinc|کھاد/.test(query) ? "nutrition" :
    /rust|blight|mildew|پھپھوند/.test(query) ? "disease" :
    /weed|گھاس|سوانکی/.test(query) ? "weed" :
    "unknown";

  console.log("🧠 Detected intent:", intent);

  // 🎯 INTENT FILTER
  let filtered = db;

  if (intent !== "unknown") {
    filtered = db.filter(item =>
      item.metadata.intent_tags?.includes(intent)
    );
  }

  // 📊 SCORING
  const results = filtered.map(item => {

    if (!item.vector) return null;

    const score = cosine(queryVector, item.vector);

    // 🔥 KEYWORD BOOST
    let boost = 0;

    const text = item.text.toLowerCase();
    const q = query.toLowerCase();

    if (text.includes("whitefly") && q.includes("whitefly")) boost += 0.25;
    if (text.includes("zinc") && q.includes("zinc")) boost += 0.25;
    if (text.includes("rust") && q.includes("rust")) boost += 0.25;

    return {
      ...item,
      score: score + boost
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.score - a.score);

  // 🏆 OUTPUT
  console.log("\n🔝 Top Matches:\n");

  results.slice(0, 3).forEach(r => {

    const m = r.metadata || {};

    console.log(`📦 Product: ${m.product || "N/A"}`);
    console.log(`📂 Category: ${m.category || "N/A"}`);
    console.log(`🧪 Type: ${m.type || "N/A"}`);

    console.log(`🌾 Crops: ${(m.crops || []).join(", ") || "N/A"}`);

    console.log(`🎯 Controls: ${(m.controls || []).join(", ") || "N/A"}`);
    console.log(`🍄 Diseases: ${(m.diseases || []).join(", ") || "N/A"}`);
    console.log(`🌿 Weeds: ${(m.weeds || []).join(", ") || "N/A"}`);

    console.log(
      `🧬 Nutrient deficiency: ${(m.nutrient_deficiency || []).join(", ") || "N/A"}`
    );

    console.log(`⭐ Score: ${r.score.toFixed(3)}\n`);
  });

}

run();
