// rag/utils/ambiguity_detector.js

// ─────────────────────────────────────────────────────────────
// 🎯 Helper Functions (NEW - Fix 2)
// ─────────────────────────────────────────────────────────────

function hasSpecificPestOrDisease(query, analysis) {
  const specificTerms = [
    "whitefly", "fruit fly", "stem borer", "aphid",
    "rust", "blight", "blast",
    "سفید مکھی", "تیلا", "زنگ", "بلاسٹ"
  ];

  const q = query.toLowerCase();

  return (
    specificTerms.some(term => q.includes(term.toLowerCase())) ||
    (analysis.diseases && analysis.diseases.length > 0)
  );
}

function hasSpecificProduct(query) {
  const products = [
    "imidacloprid", "mancozeb", "round-up", "glyphosate",
    "lambda", "chlorpyrifos", "sooraj"
  ];

  const q = query.toLowerCase();
  return products.some(p => q.includes(p));
}

function hasSpecificProductType(query) {
  const types = [
    "fertilizer", "khad", "کھاد",
    "nitrogen", "phosphorus", "potash",
    "npk", "urea", "dap",
    "herbicide", "fungicide", "insecticide"
  ];

  const q = query.toLowerCase();
  return types.some(t => q.includes(t.toLowerCase()));
}

// ─────────────────────────────────────────────────────────────
// 🧠 Main Ambiguity Detector
// ─────────────────────────────────────────────────────────────

export function detectAmbiguity(analysis) {
  const {
    raw_query = "",
    crop = null,
    diseases = [],
    problem_type = null,
    disease_nature = null,
    isPreventive = false
  } = analysis;

  const query = raw_query.toLowerCase();

  // ─────────────────────────────────────────
  // ✅ BYPASS 1: Specific product
  // ─────────────────────────────────────────
  if (hasSpecificProduct(query)) {
    return {
      isAmbiguous: false,
      confidence: 0.85,
      missingFields: [],
      hardMissing: [],
      warnings: []
    };
  }

  // ─────────────────────────────────────────
  // ✅ BYPASS 2: Specific pest/disease
  // ─────────────────────────────────────────
  if (hasSpecificPestOrDisease(query, analysis)) {
    if (!crop || crop === "unknown") {
      return {
        isAmbiguous: true,
        confidence: 0.5,
        missingFields: ["crop"],
        hardMissing: ["crop"],
        warnings: ["Crop missing for disease-specific query"]
      };
    }

    return {
      isAmbiguous: false,
      confidence: 0.75,
      missingFields: [],
      hardMissing: [],
      warnings: []
    };
  }

  // ─────────────────────────────────────────
  // ✅ BYPASS 3: Specific product type
  // ─────────────────────────────────────────
  if (hasSpecificProductType(query)) {
    return {
      isAmbiguous: false,
      confidence: 0.7,
      missingFields: [],
      hardMissing: [],
      warnings: []
    };
  }

  // ─────────────────────────────────────────
  // ✅ PREVENTIVE QUERIES (Fix 4 partial)
  // ─────────────────────────────────────────
  if (isPreventive) {
    if (!crop || crop === "unknown") {
      return {
        isAmbiguous: true,
        confidence: 0.4,
        missingFields: ["crop"],
        hardMissing: ["crop"],
        warnings: ["Preventive query but crop missing"]
      };
    }

    return {
      isAmbiguous: false,
      confidence: 0.7,
      missingFields: [],
      hardMissing: [],
      warnings: []
    };
  }

  // ─────────────────────────────────────────
  // ⚠️ DEFAULT LOGIC (fallback)
  // ─────────────────────────────────────────

  const missingFields = [];
  const hardMissing = [];
  const warnings = [];

  if (!crop || crop === "unknown") {
    missingFields.push("crop");
    hardMissing.push("crop");
  }

  if (!problem_type || problem_type === "unknown") {
    missingFields.push("problem_type");
  }

  if (diseases.length === 0 && problem_type === "disease") {
    missingFields.push("symptoms");
  }

  const isAmbiguous = hardMissing.length > 0;

  return {
    isAmbiguous,
    confidence: isAmbiguous ? 0.4 : 0.6,
    missingFields,
    hardMissing,
    warnings
  };
}