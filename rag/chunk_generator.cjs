const fs = require("fs");
const path = require("path");

console.log("🚀 NEW CHUNK GENERATOR RUNNING...");

// ================= PATHS =================
const PRODUCTS_DIR = path.join(__dirname, "../data/products");
const OUTPUT_DIR = path.join(__dirname, "chunks");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "product_chunks.json");
const QUERIES_DIR = path.join(__dirname, "../data/farmer_queries");

// ================= HELPERS =================
function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return Object.values(value).flat();
  return [value];
}

function unique(value) {
  const arr = toArray(value);
  return [...new Set(arr.filter(Boolean))];
}

// ================= LOAD FARMER QUERIES =================
function loadFarmerQueries() {
  const files = fs.readdirSync(QUERIES_DIR);

  const queries = {
    insect: [],
    disease: [],
    nutrition: [],
    weed: [],
  };

  files.forEach((file) => {
    const filePath = path.join(QUERIES_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath));

    const key = Object.keys(data)[0];
    const list = data[key];

    if (!Array.isArray(list)) return;

    if (file.includes("insect")) queries.insect.push(...list);
    if (file.includes("disease")) queries.disease.push(...list);
    if (file.includes("nutrition")) queries.nutrition.push(...list);
    if (file.includes("weed")) queries.weed.push(...list);
  });

  Object.keys(queries).forEach((k) => {
    queries[k] = unique(queries[k]);
  });

  return queries;
}

// ================= PROBLEM TYPE =================
function detectProblemType(category) {
  const c = (category || "").toLowerCase();

  if (c.includes("fungicide")) return "disease";
  if (c.includes("insecticide")) return "insect";
  if (c.includes("herbicide")) return "weed";
  if (c.includes("fertilizer") || c.includes("nutrition")) return "nutrition";

  return "general";
}

// ================= BUILD CHUNKS =================
function buildChunks(product, farmerQueries) {
  const chunks = [];
  const problemType = detectProblemType(product.category);

  // CROPS
  const crops = unique([
    ...(product.crops?.all || []),
    ...(product.crops?.major || [])
  ]);

  // DISEASES
  const diseases = unique([
  ...(product.target_diseases || []),
  ...(product.disease_categories?.foliar_diseases || []),
  ...(product.disease_categories?.airborne_diseases || []),
  ...(product.disease_categories?.water_related_diseases || []),
  ...(product.disease_categories?.major_crop_diseases || [])
]);
  // OTHER FIELDS
  const weeds = unique(product.target_weeds || []);
  const insects = unique(product.target_pests || []);
  const nutrients = unique(product.target_nutrient_deficiencies || []);

  const controls = unique([
    ...diseases,
    ...weeds,
    ...insects
  ]);

  const symptoms = unique([
    ...(product.symptoms?.urdu || []),
    ...(product.symptoms?.punjabi || []),
    ...(product.symptoms?.roman_urdu || []),
    ...(product.symptoms?.english || [])
  ]);

  const queries = unique(product.farmer_problem_queries || []);
  const keywords = unique(product.search_keywords || []);
  const relevantQueries = farmerQueries[problemType] || [];

  // PRODUCT TEXT
  const productText = `
Product: ${product.product_name}
Category: ${product.category}
Type: ${product.type || product.product_type || ""}

Problem Type: ${problemType}

Crops: ${crops.join(", ")}
Controls: ${controls.join(", ")}
Diseases: ${diseases.join(", ")}
Weeds: ${weeds.join(", ")}
Nutrient deficiency: ${nutrients.join(", ")}

Description:
${product.multilingual_description?.english || product.description || ""}
`;

  chunks.push({
    text: productText.trim(),
    metadata: {
      product_name: product.product_name,
      category: product.category,
      type: product.type || product.product_type || null,
      crops,
      controls,
      diseases,
      weeds,
      nutrient_deficiency: nutrients,
      problem_type: problemType,
      chunk_type: "product"
    }
  });

  // SYMPTOMS
  symptoms.forEach((symptom) => {
    chunks.push({
      text: symptom,
      metadata: {
        product_name: product.product_name,
        category: product.category,
        problem_type: problemType,
        chunk_type: "symptom"
      }
    });
  });

  // PRODUCT QUERIES
  queries.forEach((q) => {
    chunks.push({
      text: q,
      metadata: {
        product_name: product.product_name,
        category: product.category,
        problem_type: problemType,
        chunk_type: "product_query"
      }
    });
  });

  // FARMER QUERY LIB
  relevantQueries.forEach((q) => {
    chunks.push({
      text: q,
      metadata: {
        category: product.category,
        problem_type: problemType,
        chunk_type: "farmer_query"
      }
    });
  });

  // KEYWORDS
  keywords.forEach((k) => {
    chunks.push({
      text: k,
      metadata: {
        product_name: product.product_name,
        category: product.category,
        problem_type: problemType,
        chunk_type: "keyword"
      }
    });
  });

  return chunks;
}

// ================= MAIN =================
function run() {
  console.log("🚀 RUN FUNCTION STARTED");

  const farmerQueries = loadFarmerQueries();
  console.log("🌾 Farmer queries loaded");

  const files = fs.readdirSync(PRODUCTS_DIR);
  const chunks = [];

  files.forEach((file) => {
    const product = JSON.parse(
      fs.readFileSync(path.join(PRODUCTS_DIR, file))
    );

    chunks.push(...buildChunks(product, farmerQueries));
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(chunks, null, 2));

  console.log("✅ Chunks generated:", chunks.length);
  console.log("📁 Saved at:", OUTPUT_FILE);
}

// ================= RUN =================
run();