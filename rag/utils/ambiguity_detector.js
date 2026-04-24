// rag/utils/ambiguity_detector.js

const FIELD_WEIGHTS = {
  crop:         0.35,
  symptoms:     0.35,
  problem_type: 0.20,
  crop_stage:   0.10,
};

const CONFIDENCE_THRESHOLD = 0.70;

const GENERIC_SYMPTOMS = [
  "leaf spot",
  "yellowing",
  "wilt",
];

const REQUIRED_BY_TYPE = {
  disease:   ["crop", "symptoms"],
  insect:    ["crop"],
  weed:      ["crop"],
  nutrition: ["crop", "symptoms"],
  unknown:   ["crop", "symptoms"],
};

export function detectAmbiguity(data) {
  const missing  = [];
  const warnings = [];

  const problemType = data.problem_type || "unknown";
  const required    = REQUIRED_BY_TYPE[problemType] || REQUIRED_BY_TYPE.unknown;

  if (required.includes("crop") && !data.crop) {
    missing.push("crop");
  }

  if (required.includes("symptoms")) {
    if (!data.symptoms || data.symptoms.length === 0) {
      missing.push("symptoms");
    } else if (data.symptoms.every(s => GENERIC_SYMPTOMS.includes(s))) {
      if (!data.disease_nature || data.disease_nature === "unknown") {
        warnings.push("symptom_detail");
      }
    }
  }

  let confidence = 0;
  if (data.crop)                             confidence += FIELD_WEIGHTS.crop;
  if (data.symptoms && data.symptoms.length) confidence += FIELD_WEIGHTS.symptoms;
  if (data.problem_type)                     confidence += FIELD_WEIGHTS.problem_type;
  if (data.crop_stage)                       confidence += FIELD_WEIGHTS.crop_stage;

  const allRequiredPresent = required.every(field => {
    if (field === "crop")     return Boolean(data.crop);
    if (field === "symptoms") return data.symptoms && data.symptoms.length > 0;
    return true;
  });

  const isAmbiguous =
    missing.length > 0 ||
    (!allRequiredPresent && confidence < CONFIDENCE_THRESHOLD);

  return {
    isAmbiguous,
    missingFields: [...missing, ...warnings],
    confidence:    parseFloat(confidence.toFixed(2)),
    hardMissing:   missing,
    warnings,
  };
}
