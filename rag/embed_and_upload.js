const fs = require("fs");
const path = require("path");

const CHUNKS_FILE = path.join(__dirname, "chunks", "product_chunks.json");
const OUTPUT_FILE = path.join(__dirname, "../vector_store/vectors.json");

async function run() {
  console.log("🚀 Embedding process started...");

  const { pipeline } = await import("@xenova/transformers");

  const chunks = JSON.parse(fs.readFileSync(CHUNKS_FILE, "utf-8"));
  console.log("📦 Chunks loaded:", chunks.length);

  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
  );

  console.log("🧠 Embedding model loaded");

  const vectorDB = [];

  for (const chunk of chunks) {
    const output = await embedder(chunk.text, {
      pooling: "mean",
      normalize: true,
    });

    vectorDB.push({
      id: chunk.id,
      vector: Array.from(output.data),
      metadata: chunk.metadata,
      text: chunk.text,
    });
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vectorDB, null, 2));

  console.log("✅ Vector DB saved → vector_store/vectors.json");
}

run();
