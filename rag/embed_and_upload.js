const fs = require("fs");
const path = require("path");

async function run() {
  const { pipeline } = await import("@xenova/transformers");

  console.log("🚀 Embedding process started...");

  // ✅ YOUR REAL FILE
  const chunksPath = path.join(__dirname, "chunks", "product_chunks.json");

  if (!fs.existsSync(chunksPath)) {
    console.error("❌ File not found:", chunksPath);
    return;
  }

  const chunks = JSON.parse(fs.readFileSync(chunksPath, "utf-8"));

  console.log("📦 Total chunks:", chunks.length);

  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  console.log("🧠 Model loaded");

  const db = [];

  for (const chunk of chunks) {
    const output = await embedder(chunk.text, {
      pooling: "mean",
      normalize: true,
    });

    db.push({
      text: chunk.text,
      vector: Array.from(output.data),
      metadata: chunk.metadata,
    });
  }

  const outPath = path.join(__dirname, "../vector_store/vectors.json");

  fs.writeFileSync(outPath, JSON.stringify(db, null, 2));

  console.log("✅ Saved → vector_store/vectors.json");
}

run();
