const fs = require("fs");
const path = require("path");

async function run() {
  const { pipeline } = await import("@xenova/transformers");

  console.log("🚀 Embedding process started...");

  const chunksPath = path.join(__dirname, "chunks/product_chunks.json");
  const chunks = JSON.parse(fs.readFileSync(chunksPath));

  console.log("📦 Total chunks:", chunks.length);

  // ✅ BGE-M3 MODEL
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/bge-m3"
  );

  console.log("🧠 BGE-M3 model loaded");

  const db = [];

  for (const chunk of chunks) {
    const output = await embedder(chunk.text, {
      pooling: "mean",
      normalize: true
    });

    db.push({
      text: chunk.text,
      vector: Array.from(output.data),
      metadata: chunk.metadata
    });
  }

  fs.writeFileSync(
    path.join(__dirname, "../vector_store/vectors.json"),
    JSON.stringify(db, null, 2)
  );

  console.log("✅ Saved → vector_store/vectors.json");
}

run();