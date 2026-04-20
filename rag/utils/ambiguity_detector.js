export function detectAmbiguity(data) {
  let missing = [];

  // crop must exist
  if (!data.crop) missing.push("crop");

  // symptoms must exist
  if (!data.symptoms || data.symptoms.length === 0) {
    missing.push("symptoms");
  }

  // 🔥 leaf spot is too generic → still ambiguous
  if (data.symptoms?.includes("leaf spot")) {
    missing.push("symptom_detail");
  }

  // 🔥 crop stage always required
  if (!data.crop_stage) {
    missing.push("crop_stage");
  }

  return {
    isAmbiguous: missing.length > 0,
    missingFields: missing
  };
}