const cosineSimilarity = require("compute-cosine-similarity");
const db = require("../vector_store/vectors.json");

const userQuery = process.argv[2];

if (!userQuery) {
  console.log("❌ Please provide a query");
  process.exit(1);
}

console.log(`\n🌾 User Query: ${userQuery}`);
console.log("--------------------------------------------------");

// ================= INTENT DETECTION =================

const intentKeywords = {
  disease: ["rust", "mildew", "blight", "leaf spot", "جھلساؤ", "سفیدی"],
  insect: ["whitefly", "hopper", "thrips", "jassid", "سفید مکھی", "کیڑا"],
  weed: ["گھاس", "سوانکی", "deela", "weed"],
  nutrition: ["کمی", "زنک", "سلفر", "little leaf", "yellow"],
};

function detectIntent(query) {
  query = query.toLowerCase();
  for (const intent in intentKeywords) {
    if (intentKeywords[intent].some((k) => query.includes(k))) {
      return intent;
    }
  }
  return "unknown";
}

// ================= CROP DETECTION =================

const cropKeywords = {
  rice: ["دھان", "rice"],
  wheat: ["گندم", "wheat"],
  cotton: ["کپاس", "cotton"],
};

function detectCrop(query) {
  query = query.toLowerCase();
  for (const crop in cropKeywords) {
    if (cropKeywords[crop].some((k) => query.includes(k))) {
      return crop;
    }
  }
  return "none";
}

// ================= MAIN SEARCH =================

async function run() {
  // 🔥 dynamic import for ESM module
  const { pipeline } = await import("@xenova/transformers");

  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  const detectedIntent = detectIntent(userQuery);
  const detectedCrop = detectCrop(userQuery);

  console.log(`🧠 Detected intent: ${detectedIntent}`);
  console.log(`🌾 Detected crop: ${detectedCrop}`);

  const output = await embedder(userQuery, {
    pooling: "mean",
    normalize: true,
  });

  const queryVector = Array.from(output.data);

  let results = db
    .filter((item) => item.vector)
    .map((item) => {
      const score = cosineSimilarity(queryVector, item.vector) || 0;

      return {
        product: item.metadata.product_name,
        score,
        reason: item.text,
      };
    })
    .sort((a, b) => b.score - a.score);

  const topMatches = results.slice(0, 3);
  const topScore = topMatches[0]?.score || 0;

  console.log(
    "\n🧪 Top matches:",
    topMatches.map((r) => ({
      product: r.product,
      score: r.score.toFixed(3),
    }))
  );

  console.log(`🔍 Top score: ${topScore.toFixed(3)}`);

  if (topScore >= 0.8) console.log("✅ High confidence result");
  else if (topScore >= 0.5)
    console.log("⚠️ Medium confidence — مزید تصدیق بہتر اے");
  else {
    console.log("❗ مسئلہ واضح نہیں۔ مہربانی کرکے مزید تفصیل دسو۔");
    return;
  }

  console.log("\n🏆 Top Recommendations:\n");

  topMatches.forEach((r, index) => {
    console.log(`🥇 Rank ${index + 1}`);
    console.log(`📦 Product: ${r.product}`);
    console.log(`📊 Score: ${r.score.toFixed(3)}`);
    console.log(`📄 Reason:\n${r.reason}`);
    console.log("--------------------------------------------------");
  });
}

run();
