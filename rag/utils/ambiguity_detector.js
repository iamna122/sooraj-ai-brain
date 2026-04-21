// rag/utils/ambiguity_detector.js

// ─── FIELD WEIGHTS ────────────────────────────────────────────────────────────
// How much each field contributes to "we have enough info to recommend".
// Total of required fields = 1.0. When score >= CONFIDENCE_THRESHOLD, recommend.
const FIELD_WEIGHTS = {
  crop:           0.35,   // most important — without crop, products may not match
  symptoms:       0.35,   // second most important — drives disease detection
  problem_type:   0.20,   // helps narrow product category
  crop_stage:     0.10,   // useful but not blocking
};

const CONFIDENCE_THRESHOLD = 0.70;  // need at least this to skip follow-up

// ─── GENERIC SYMPTOMS that need clarification ─────────────────────────────────
// These symptoms alone aren't specific enough to recommend confidently.
const GENERIC_SYMPTOMS = [
  "leaf spot",    // fungal? bacterial? need more
  "yellowing",    // nutritional? viral? fungal?
  "wilt",         // fusarium? bacterial? root rot?
];

// ─── PROBLEM TYPE → MINIMUM REQUIRED FIELDS ───────────────────────────────────
// Different problem types need different info to be actionable.
const REQUIRED_BY_TYPE = {
  disease:   ["crop", "symptoms"],          // need both to pick fungicide vs bactericide
  insect:    ["crop"],                       // crop alone is often enough for insecticide
  weed:      ["crop"],                       // crop determines which herbicide is safe
  nutrition: ["crop", "symptoms"],          // need symptom to pick right micronutrient
  unknown:   ["crop", "symptoms"],
};

// ------------------------------------------------------------
// Main export
// ------------------------------------------------------------
export function detectAmbiguity(data) {
  const missing   = [];
  const warnings  = [];   // non-blocking issues (lower confidence but still recommend)

  const problemType = data.problem_type || "unknown";
  const required    = REQUIRED_BY_TYPE[problemType] || REQUIRED_BY_TYPE.unknown;

  // ── Hard requirements (based on problem type) ──────────────────────────────
  if (required.includes("crop") && !data.crop) {
    missing.push("crop");
  }

  if (required.includes("symptoms")) {
    if (!data.symptoms || data.symptoms.length === 0) {
      missing.push("symptoms");
    } else if (data.symptoms.every(s => GENERIC_SYMPTOMS.includes(s))) {
      // All symptoms are generic — ask for detail but treat as warning, not blocker
      // Exception: if disease_nature is already resolved, we don't need more detail
      if (!data.disease_nature || data.disease_nature === "unknown") {
        warnings.push("symptom_detail");
      }
    }
  }

  // ── Confidence score ───────────────────────────────────────────────────────
  // Even if nothing is "missing", low confidence score = ask a follow-up
  let confidence = 0;
  if (data.crop)                          confidence += FIELD_WEIGHTS.crop;
  if (data.symptoms?.length > 0)          confidence += FIELD_WEIGHTS.symptoms;
  if (data.problem_type)                  confidence += FIELD_WEIGHTS.problem_type;
  if (data.crop_stage)                    confidence += FIELD_WEIGHTS.crop_stage;

  const isAmbiguous =
    missing.length > 0 ||                       // hard requirement missing
    confidence < CONFIDENCE_THRESHOLD;          // not enough info overall

  return {
    isAmbiguous,
    missingFields: [...missing, ...warnings],   // warnings go to question generator too
    confidence:    parseFloat(confidence.toFixed(2)),
    hardMissing:   missing,                     // question_generator can prioritize these
    warnings,
  };
}