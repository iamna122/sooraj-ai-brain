const fs = require("fs");
const path = require("path");

const PRODUCTS_DIR = path.join(__dirname, "../data/products");
const OUTPUT = path.join(__dirname, "chunks/product_chunks.json");
const QUERIES_DIR = path.join(__dirname, "../data/farmer_queries");

/*
SAFE ARRAY HELPERS
*/

const toArray = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return Object.values(value).flat();
  return [value];
};

const unique = value => {
  const arr = toArray(value);
  return [...new Set(arr.filter(Boolean))];
};

/*
LOAD FARMER QUERIES
*/

function loadFarmerQueries() {
  const files = fs.readdirSync(QUERIES_DIR);

  const queries = {
    insect: [],
    disease: [],
    nutrition: [],
    weed: []
  };

  files.forEach(file => {
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

  Object.keys(queries).forEach(k => {
    queries[k] = unique(queries[k]);
  });

  return queries;
}

/*
CATEGORY → PROBLEM TYPE
*/

function detectProblemType(category) {
  const c = (category || "").toLowerCase();

  if (c.includes("fungicide")) return "disease";
  if (c.includes("insecticide")) return "insect";
  if (c.includes("herbicide")) return "weed";
  if (c.includes("fertilizer")) return "nutrition";

  return "general";
}

/*
BUILD CHUNKS
*/

function buildChunks(product, farmerQueries) {
  const chunks = [];

  const problemType = detectProblemType(product.category);

  // ✅ FIXED MAPPING (CRITICAL)
  const crops = unique(
    product.crop_applicability?.all_supported_crops ||
    product.crop_applicability?.major_crops ||
    []
  );

  const diseases = unique(product.targets?.diseases || []);
  const weeds = unique(product.targets?.weeds || []);
  const insects = unique(product.targets?.insects || []);
  const nutrients = unique(product.targets?.nutrient_deficiencies || []);

  const controls = unique([
    ...diseases,
    ...weeds,
    ...insects
  ]);

  const symptoms = unique(product.farmer_symptoms || []);

  const queries = unique(product.farmer_problem_queries);
  const keywords = unique(product.search_keywords);

  const relevantQueries = farmerQueries[problemType] || [];

  // ============================================================
  // ✅ FULL PRODUCT CHUNK (NOW CORRECT)
  // ============================================================

  const productText = `
Product: ${product.product_name}
Category: ${product.category}
Type: ${product.product_type || ""}

Problem Type: ${problemType}

Crops: ${crops.join(", ")}
Controls: ${controls.join(", ")}
Diseases: ${diseases.join(", ")}
Weeds: ${weeds.join(", ")}
Nutrient deficiency: ${nutrients.join(", ")}

Description:
${product.master_descriptions?.english || ""}
`;

  chunks.push({
    text: productText.trim(),
    metadata: {
      product_name: product.product_name,
      category: product.category,
      type: product.product_type || null,
      crops,
      controls,
      diseases,
      weeds,
      nutrient_deficiency: nutrients,
      problem_type: problemType,
      chunk_type: "product"
    }
  });

  // ============================================================
  // SYMPTOMS
  // ============================================================

  symptoms.forEach(symptom => {
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

  // ============================================================
  // PRODUCT QUERIES
  // ============================================================

  queries.forEach(q => {
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

  // ============================================================
  // FARMER QUERY LIBRARY
  // ============================================================

  relevantQueries.forEach(q => {
    chunks.push({
      text: q,
      metadata: {
        category: product.category,
        problem_type: problemType,
        chunk_type: "farmer_query"
      }
    });
  });

  // ============================================================
  // KEYWORDS
  // ============================================================

  keywords.forEach(k => {
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

/*
MAIN
*/

function run() {
  const farmerQueries = loadFarmerQueries();

  console.log(`🌾 Farmer queries loaded`);
  console.log(`Insect: ${farmerQueries.insect.length}`);
  console.log(`Disease: ${farmerQueries.disease.length}`);
  console.log(`Nutrition: ${farmerQueries.nutrition.length}`);
  console.log(`Weed: ${farmerQueries.weed.length}`);

  const files = fs.readdirSync(PRODUCTS_DIR);

  const chunks = [];

  files.forEach(file => {
    const product = JSON.parse(
      fs.readFileSync(path.join(PRODUCTS_DIR, file))
    );

    chunks.push(...buildChunks(product, farmerQueries));
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(chunks, null, 2));

  console.log(`✅ Chunks generated: ${chunks.length}`);
}

run();