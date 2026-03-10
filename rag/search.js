const fs = require("fs");
const path = require("path");
const cosine = require("compute-cosine-similarity");

function detectIntent(q) {
  q = q.toLowerCase();

  if (q.includes("whitefly") || q.includes("کیڑا") || q.includes("thrips"))
    return "insect";

  if (q.includes("rust") || q.includes("blight") || q.includes("پھپھوند"))
    return "disease";

  if (q.includes("سوانکی") || q.includes("weed"))
    return "weed";

  if (q.includes("کمی") || q.includes("zinc") || q.includes("کھاد"))
    return "nutrition";

  return "unknown";
}

function detectCrop(q) {
  q = q.toLowerCase();

  if (q.includes("cotton") || q.includes("کپاس")) return "cotton";
  if (q.includes("rice") || q.includes("دھان")) return "rice";
  if (q.includes("wheat") || q.includes("گندم")) return "wheat";

  return null;
}

function confidenceLabel(score) {
  if (score > 0.75) return "🟢 High";
  if (score > 0.55) return "🟡 Medium";
  return "🔴 Low";
}

function safeJoin(arr) {
  return Array.isArray(arr) && arr.length ? arr.join(", ") : "N/A";
}

async function run() {
  const { pipeline } = await import("@xenova/transformers");

  const query = process.argv[2];
  console.log("\n🌾 User Query:", query);

  const db = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../vector_store/vectors.json"))
  );

  console.log("📦 Total vectors loaded:", db.length);

  // ✅ BGE-M3
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/bge-m3"
  );

  console.log("🧠 BGE-M3 model loaded");

  const output = await embedder(query, {
    pooling: "mean",
    normalize: true
  });

  const queryVector = Array.from(output.data);

  const intent = detectIntent(query);
  const crop = detectCrop(query);

  console.log("🧠 Detected intent:", intent);
  console.log("🌾 Detected crop:", crop || "none");

  const results = db.map(item => {
    let score = cosine(queryVector, item.vector);

    const text = item.text.toLowerCase();
    const q = query.toLowerCase();

    if (text.includes(q)) score += 0.2;

    if (
      intent !== "unknown" &&
      item.metadata.intent_tags?.includes(intent)
    ) {
      score += 0.15;
    }

    if (crop && item.metadata.crops?.includes(crop)) {
      score += 0.15;
    }

    return { ...item, score };
  });

  results.sort((a, b) => b.score - a.score);

  const top = results.slice(0, 3);

  console.log("\n🔝 Top Matches:\n");

  top.forEach(r => {
    console.log(`📦 Product: ${r.metadata.product_name}`);
    console.log(`📂 Category: ${r.metadata.category}`);
    console.log(`🧪 Type: ${r.metadata.type}`);
    console.log(`🌾 Crops: ${safeJoin(r.metadata.crops)}`);
    console.log(`🎯 Controls: ${safeJoin(r.metadata.controls)}`);
    console.log(`🍄 Diseases: ${safeJoin(r.metadata.diseases)}`);
    console.log(`🌿 Weeds: ${safeJoin(r.metadata.weeds)}`);
    console.log(
      `🧬 Nutrient deficiency: ${safeJoin(
        r.metadata.nutrient_deficiency
      )}`
    );
    console.log(
      `⭐ Score: ${r.score.toFixed(3)} ${confidenceLabel(r.score)}\n`
    );
  });
}

run();