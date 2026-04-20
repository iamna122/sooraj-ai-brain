const QUESTION_BANK = {
  crop: "فصل کون سی ہے؟",
  symptoms: "داغ کس طرح کے ہیں؟",
  symptom_detail: "داغ کس رنگ اور شکل کے ہیں؟",
  crop_stage: "فصل کس اسٹیج پر ہے؟ (ابتدائی، درمیانی، آخری)"
};

export function generateQuestions(missingFields) {
  let questions = [];

  missingFields.forEach(field => {
    if (QUESTION_BANK[field]) {
      questions.push(QUESTION_BANK[field]);
    }
  });

  return questions.slice(0, 3);
}