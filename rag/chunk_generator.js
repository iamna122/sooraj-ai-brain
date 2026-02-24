const fs = require("fs");
const path = require("path");

const productsDir = path.join(__dirname, "../data/products");
const outPath = path.join(__dirname, "chunks/product_chunks.json");

function safe(val) {
  if (!val) return "";
  if (Array.isArray(val)) return val.join(", ");
  return val;
}

function buildSearchText(p) {
  return `
Product: ${safe(p.product_name)}

Category: ${safe(p.category)}

Type: ${safe(p.type)}

Crops: ${safe(p.crops)}

Controls / Solves: ${safe(p.controls)}

Diseases: ${safe(p.diseases)}

Weeds: ${safe(p.weeds)}

Nutrient deficiency: ${safe(p.nutrient_deficiency)}

Description:
${safe(p.description)}

Recommendation:
${safe(p.recommendation)}
`;
}

function run() {
  const files = fs.readdirSync(productsDir);

  let chunks = [];

  for (const file of files) {
    const json = JSON.parse(
      fs.readFileSync(path.join(productsDir, file), "utf-8")
    );

    chunks.push({
      text: buildSearchText(json),
      metadata: {
        product: json.product_name,
        category: json.category,
      },
    });
  }

  fs.writeFileSync(outPath, JSON.stringify(chunks, null, 2));

  console.log("✅ Chunks generated:", chunks.length);
}

run();
