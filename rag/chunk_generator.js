const fs = require("fs");
const path = require("path");

const PRODUCTS_DIR = path.join(__dirname, "../data/products");
const OUTPUT_FILE = path.join(__dirname, "chunks", "product_chunks.json");

// SAFE JOIN HELPER
const safeJoin = (arr) => (Array.isArray(arr) ? arr.join("، ") : "");

// GET TARGET PROBLEM
function getTarget(product) {
  return (
    safeJoin(product.targets?.diseases) ||
    safeJoin(product.targets?.insects) ||
    safeJoin(product.targets?.weeds) ||
    safeJoin(product.targets?.nutrient_deficiencies) ||
    "مختلف مسائل"
  );
}

// RECOMMENDATION CHUNK
function buildRecommendationChunk(product) {
  return `
${product.product_name} اک بہترین حل اے جیہڑا ${getTarget(product)} لئی استعمال ہوندا اے۔
ایہہ خاص طور تے ${safeJoin(product.crop_applicability?.major_crops)} فصل لئی فائدہ مند اے۔
اہ دے فائدے: ${safeJoin(product.farmer_benefits)}۔
`.trim();
}

// ✅ USAGE CHUNK
function buildUsageChunk(product) {
  const method = Array.isArray(product.application_details?.application_method)
    ? safeJoin(product.application_details.application_method)
    : product.application_details?.application_method || "";

  return `
${product.product_name} نوں ${product.dosage?.per_acre || ""} فی ایکڑ استعمال کرو۔
استعمال دا طریقہ: ${method}
بہترین وقت: ${safeJoin(product.best_time_to_apply)}
احتیاطی تدابیر: ${safeJoin(product.safety?.protective_measures)}
`.trim();
}

//  MAIN FUNCTION
function generateChunks() {
  console.log("🚀 Chunk generation started...");

  // ensure output folder exists
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  const files = fs
    .readdirSync(PRODUCTS_DIR)
    .filter((file) => file.endsWith(".json"));

  console.log("📦 Total product files:", files.length);

  let chunks = [];

  files.forEach((file) => {
    const filePath = path.join(PRODUCTS_DIR, file);
    const product = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const recommendationChunk = {
      id: `${product.product_id}_rec`,
      text: buildRecommendationChunk(product),
      metadata: {
        product_name: product.product_name,
        category: product.category,
        crops: product.crop_applicability?.all_supported_crops || [],
      },
    };

    const usageChunk = {
      id: `${product.product_id}_usage`,
      text: buildUsageChunk(product),
      metadata: {
        product_name: product.product_name,
        category: product.category,
        crops: product.crop_applicability?.all_supported_crops || [],
      },
    };

    chunks.push(recommendationChunk, usageChunk);
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(chunks, null, 2), "utf-8");

  console.log("🧠 Total chunks created:", chunks.length);
  console.log("✅ Chunks generated successfully →", OUTPUT_FILE);
}

// RUN
generateChunks();
