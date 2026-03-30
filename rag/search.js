const fs = require("fs");
const path = require("path");
const cosine = require("compute-cosine-similarity");

// ============================================================
// Disease Detection
// ============================================================
function detectDiseaseKeywords(query) {
  query = query.toLowerCase();

  const map = {
    "leaf spot": ["daagh", "dhabba", "spots"],
    "rust": ["zang", "rust"],
    "blight": ["jalao", "blight"],
    "powdery mildew": ["safed powder", "powdery"],
    "downy mildew": ["downy"]
  };

  let detected = [];

  for (let disease in map) {
    if (map[disease].some(k => query.includes(k))) {
      detected.push(disease);
    }
  }

  return detected;
}

// ============================================================
// Problem Type Detection
// ============================================================
function detectProblemType(query) {
  query = query.toLowerCase();

  if (["keera", "insect", "bug"].some(k => query.includes(k))) return "insect";
  if (["daagh", "dhabba", "fungus", "blight", "rust"].some(k => query.includes(k))) return "disease";
  if (["ghaas", "weed"].some(k => query.includes(k))) return "weed";
  if (["zard", "deficiency"].some(k => query.includes(k))) return "nutrition";

  return "unknown";
}

// ============================================================
// Crop Detection
// ============================================================
function detectCrop(q) {
  q = q.toLowerCase();

  if (q.includes("cotton") || q.includes("کپاس")) return "cotton";
  if (q.includes("rice") || q.includes("دھان")) return "rice";
  if (q.includes("wheat") || q.includes("گندم")) return "wheat";

  return null;
}

// ============================================================
// Helpers
// ============================================================
function confidenceLabel(score) {
  if (score > 0.75) return "🟢 High";
  if (score > 0.55) return "🟡 Medium";
  return "🔴 Low";
}

function extractField(text, field) {
  const lines = text.split("\n");

  for (let line of lines) {
    if (line.toLowerCase().startsWith(field.toLowerCase() + ":")) {
      const value = line.split(":")[1]?.trim();
      return value && value !== "" ? value : "N/A";
    }
  }

  return "N/A";
}

// ============================================================
// MAIN
// ============================================================
async function run() {
  const { pipeline } = await import("@xenova/transformers");

  const query = process.argv[2];
  console.log("\n🌾 User Query:", query);

  const db = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../vector_store/vectors.json"))
  );

  console.log("📦 Total vectors loaded:", db.length);

  const embedder = await pipeline("feature-extraction", "Xenova/bge-m3");
  console.log("🧠 BGE-M3 model loaded");

  const output = await embedder(query, {
    pooling: "mean",
    normalize: true
  });

  const queryVector = Array.from(output.data);

  // ============================================================
  // DETECTION (FIXED ORDER)
  // ============================================================
  const detectedDiseases = detectDiseaseKeywords(query);
  let problemType = detectProblemType(query);
  const crop = detectCrop(query);

  // 🔥 override logic (CRITICAL FIX)
  if (detectedDiseases.length > 0) {
    problemType = "disease";
  }

  console.log("🧠 Detected problem type:", problemType);
  console.log("🌾 Detected crop:", crop || "none");
  console.log("🧬 Detected diseases:", detectedDiseases);

  // ============================================================
  // FILTERING (CLEAN)
  // ============================================================
  let filteredDB;

  if (problemType !== "unknown") {
    filteredDB = db.filter(item =>
      item.metadata.problem_type === problemType &&
      item.metadata.chunk_type === "product"
    );
  } else {
    // fallback → still enforce product chunks
    filteredDB = db.filter(item =>
      item.metadata.chunk_type === "product"
    );
  }

  if (filteredDB.length === 0) {
    console.log("⚠️ No filtered results → fallback to full DB");
    filteredDB = db;
  }

  console.log("📦 After filtering:", filteredDB.length);

  // ============================================================
  // SCORING (IMPROVED)
  // ============================================================
  const results = filteredDB.map(item => {
    let score = cosine(queryVector, item.vector);

    const text = item.text.toLowerCase();
    const q = query.toLowerCase();

    // keyword boost
    if (text.includes(q)) score += 0.2;

    // crop boost
    if (crop && item.metadata.crops?.includes(crop)) {
      score += 0.15;
    }

    // 🔥 disease boost
    if (
      detectedDiseases.length > 0 &&
      item.metadata.diseases?.some(d =>
        detectedDiseases.includes(d.toLowerCase())
      )
    ) {
      score += 0.3;
    }

    return { ...item, score };
  });

  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, 3);

  // ============================================================
  // DEBUG
  // ============================================================
  console.log(
    "🧪 Top Results Problem Types:",
    top.map(r => r.metadata.problem_type)
  );

  // ============================================================
  // OUTPUT
  // ============================================================
  console.log("\n🔝 Top Matches:\n");

  top.forEach(r => {
    console.log(`📦 Product: ${r.metadata.product_name}`);
    console.log(`📂 Category: ${r.metadata.category}`);
    console.log(`🧪 Type: ${r.metadata.type || "N/A"}`);

    console.log(`🌾 Crops: ${extractField(r.text, "Crops")}`);
    console.log(`🎯 Controls: ${extractField(r.text, "Controls")}`);
    console.log(`🍄 Diseases: ${extractField(r.text, "Diseases")}`);

    console.log(
      `⭐ Score: ${r.score.toFixed(3)} ${confidenceLabel(r.score)}\n`
    );
  });
}

run();