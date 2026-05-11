// rag/utils/symptom_mapper.js
import { SYMPTOM_DISEASE_MAP } from "./symptom_disease_map.js";

// Symptoms that are nutritional should NEVER expand into
// fungal/bacterial disease names — they pollute scoring.
const NUTRITIONAL_SYMPTOMS = new Set([
  "yellowing",
  "chlorosis",
  "pale",
]);

// Diseases that must not appear in results when the detected
// symptom is nutritional — prevents fungicide being ranked for zinc deficiency.
const FUNGAL_DISEASE_NAMES = new Set([
  "rust",
  "blight",
  "leaf spot",
  "powdery mildew",
  "wilt",
  "root rot",
  "canker",
  "lesion",
]);

export function mapSymptomsToDiseases(symptoms = []) {
  const possibleDiseases = [];

  symptoms.forEach(symptom => {
    const mapped = SYMPTOM_DISEASE_MAP[symptom];
    if (!mapped) return;

    mapped.forEach(disease => {
      // Block fungal disease expansion for nutritional symptoms
      if (
        NUTRITIONAL_SYMPTOMS.has(symptom) &&
        FUNGAL_DISEASE_NAMES.has(disease.toLowerCase())
      ) {
        return; // skip this mapping
      }
      possibleDiseases.push(disease);
    });
  });

  return [...new Set(possibleDiseases)];
}