const fs = require("fs");
const path = require("path");

const productsDir = path.join(__dirname, "../data/products");
const outputDir = path.join(__dirname, "chunks");
const outputFile = path.join(outputDir, "product_chunks.json");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const files = fs.readdirSync(productsDir);

let chunks = [];

files.forEach(file => {
  if (!file.endsWith(".json")) return;

  const product = JSON.parse(
    fs.readFileSync(path.join(productsDir, file), "utf-8")
  );

  const text = `
Product: ${product.product_name}
Category: ${product.category}
Type: ${product.type}

Crops: ${(product.crops || []).join(", ")}

Controls: ${(product.controls || []).join(", ")}
Diseases: ${(product.diseases || []).join(", ")}
Weeds: ${(product.weeds || []).join(", ")}
Nutrient deficiency: ${(product.nutrient_deficiency || []).join(", ")}

Description:
${product.description}

Recommendation:
${product.recommendation}
`;

  chunks.push({
    text,
    metadata: {
      product: product.product_name,
      category: product.category,
      type: product.type,
      crops: product.crops || [],
      controls: product.controls || [],
      diseases: product.diseases || [],
      weeds: product.weeds || [],
      nutrient_deficiency: product.nutrient_deficiency || [],
      intent_tags: [
        product.category === "Insecticide" ? "insect" :
        product.category === "Fungicide" ? "disease" :
        product.category === "Herbicide" ? "weed" :
        "nutrition"
      ]
    }
  });

});

fs.writeFileSync(outputFile, JSON.stringify(chunks, null, 2));

console.log(`✅ Chunks generated: ${chunks.length}`);
