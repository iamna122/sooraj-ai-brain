import { SYMPTOM_DISEASE_MAP } from "./symptom_disease_map.js";

export function mapSymptomsToDiseases(symptoms = []) {
  let possibleDiseases = [];

  symptoms.forEach(symptom => {
    if (SYMPTOM_DISEASE_MAP[symptom]) {
      possibleDiseases.push(...SYMPTOM_DISEASE_MAP[symptom]);
    }
  });

  return [...new Set(possibleDiseases)];
}