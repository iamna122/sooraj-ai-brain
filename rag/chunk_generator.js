const fs = require("fs");
const path = require("path");

const PRODUCTS_DIR = path.join(__dirname, "../data/products");
const OUTPUT = path.join(__dirname, "chunks/product_chunks.json");

// ✅ SAFE ARRAY HELPERS
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

// ✅ BUILD ONE RICH CHUNK PER PRODUCT
function buildChunk(product) {
  const crops = unique(product.crops?.all || product.crops || []);
  const controls = unique(product.target_pests || product.controls);
  const diseases = unique(product.target_diseases || product.diseases);
  const weeds = unique(product.target_weeds || product.weeds);
  const nutrition = unique(
    product.target_nutrient_deficiencies || product.nutrient_deficiency
  );

  const symptoms = unique([
    ...(product.symptoms?.english || []),
    ...(product.symptoms?.urdu || []),
    ...(product.symptoms?.punjabi || []),
    ...(product.symptoms?.roman_urdu || [])
  ]);

  const queries = unique(product.farmer_problem_queries);
  const keywords = unique(product.search_keywords);

  const text = `
Product: ${product.product_name}
Category: ${product.category}
Type: ${product.type || ""}

Crops: ${crops.join(", ")}

Controls: ${controls.join(", ")}
Diseases: ${diseases.join(", ")}
Weeds: ${weeds.join(", ")}
Nutrient deficiency: ${nutrition.join(", ")}

Farmer Symptoms:
${symptoms.join(", ")}

Farmer Queries:
${queries.join(", ")}

Search Keywords:
${keywords.join(", ")}

Description:
${product.multilingual_description?.english || product.description || ""}

Urdu:
${product.multilingual_description?.urdu || ""}

Punjabi:
${product.multilingual_description?.punjabi || ""}

Recommendation:
${product.recommendation || ""}
`;

  return {
    text,
    metadata: {
      product_name: product.product_name,
      category: product.category,
      type: product.type || "N/A",
      crops,
      controls,
      diseases,
      weeds,
      nutrient_deficiency: nutrition,
      intent_tags: unique(product.intent_tags)
    }
  };
}

function run() {
  const files = fs.readdirSync(PRODUCTS_DIR);

  const chunks = [];

  files.forEach(file => {
    const product = JSON.parse(
      fs.readFileSync(path.join(PRODUCTS_DIR, file))
    );

    chunks.push(buildChunk(product));
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(chunks, null, 2));

  console.log(`✅ Chunks generated: ${chunks.length}`);
}

run();
