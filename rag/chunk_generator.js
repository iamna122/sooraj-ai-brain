const fs = require("fs");
const path = require("path");

const PRODUCTS_DIR = path.join(__dirname, "../data/products");
const OUTPUT_FILE = path.join(__dirname, "chunks", "product_chunks.json");

const safeJoin = (arr) => (Array.isArray(arr) ? arr.join("، ") : "");

// 🧠 CATEGORY → PUNJABI INTENT
function getCategoryIntent(category) {
  if (!category) return "";

  const cat = category.toLowerCase();

  if (cat.includes("fung")) return "فنگسائڈ دواں";
  if (cat.includes("insect")) return "کیڑے مار دواں";
  if (cat.includes("herb")) return "جڑی بوٹی مار دواں";
  if (cat.includes("micro") || cat.includes("fertilizer") || cat.includes("nutrition"))
    return "کھاد / غذائی سپلیمنٹ";

  return category;
}

// 🎯 ALL TARGETS
function getAllTargets(product) {
  return safeJoin([
    ...(product.targets?.diseases || []),
    ...(product.targets?.insects || []),
    ...(product.targets?.weeds || []),
    ...(product.targets?.nutrient_deficiencies || []),
  ]);
}

// 👳 FARMER SYMPTOMS
function getFarmerSymptoms(product) {
  return safeJoin(product.farmer_symptoms);
}

// 🌾 RECOMMENDATION CHUNK
function buildRecommendationChunk(product) {
  return `
${product.product_name} اک مؤثر ${getCategoryIntent(product.category)} اے جو ${getAllTargets(product)} دے کنٹرول لئی استعمال ہوندا اے۔

ایہہ خاص طور تے ${safeJoin(product.crop_applicability?.major_crops)} فصل لئی فائدہ مند اے۔

اہ دے فائدے:
${safeJoin(product.farmer_benefits)}
`.trim();
}

// 👳 FARMER LANGUAGE CHUNK
function buildFarmerProblemChunk(product) {
  if (!product.farmer_symptoms) return "";

  return `
جدو کسان نوں ایہہ مسئلے نظر آون:
${getFarmerSymptoms(product)}

اوہناں لئی ${product.product_name} بہترین حل اے۔
ایہہ ${getCategoryIntent(product.category)} خاص طور تے ${safeJoin(product.crop_applicability?.major_crops)} فصل لئی بنائی گئی اے۔
`.trim();
}

// 💊 USAGE CHUNK
function buildUsageChunk(product) {
  const method = Array.isArray(product.application_details?.application_method)
    ? safeJoin(product.application_details.application_method)
    : product.application_details?.application_method || "";

  return `
${product.product_name} نوں ${product.dosage?.per_acre || ""} فی ایکڑ استعمال کرو۔

استعمال دا طریقہ:
${method}

بہترین وقت:
${safeJoin(product.best_time_to_apply)}

احتیاطی تدابیر:
${safeJoin(product.safety?.protective_measures)}
`.trim();
}

// 🚀 MAIN
function generateChunks() {
  console.log("🚀 Chunk generation started...");

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  const files = fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith(".json"));

  console.log("📦 Total product files:", files.length);

  let chunks = [];

  files.forEach((file) => {
    const product = JSON.parse(
      fs.readFileSync(path.join(PRODUCTS_DIR, file), "utf-8")
    );

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
      metadata: recommendationChunk.metadata,
    };

    chunks.push(recommendationChunk, usageChunk);

    // 👳 farmer chunk (only if exists)
    const farmerText = buildFarmerProblemChunk(product);

    if (farmerText) {
      const farmerChunk = {
        id: `${product.product_id}_farmer`,
        text: farmerText,
        metadata: recommendationChunk.metadata,
      };

      chunks.push(farmerChunk);
    }
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(chunks, null, 2));

  console.log("🧠 Total chunks created:", chunks.length);
  console.log("✅ Chunks generated successfully →", OUTPUT_FILE);
}

generateChunks();
