// PDF & Raw Text Question Extraction Engine
window.QB = window.QB || {};

QB.parseTextToMCQs = function(rawText, sourceTag = "pdf") {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const questions = [];
  let currentQuestion = null;

  const questionRegex = /^(?:Q(?:uestion)?[\s.#:-]*\d+|\d+[\s.:)-]+)(.+)/i;
  const optionRegex = /^(?:[A-Da-d1-4][\s.):|-]+|\([A-Da-d1-4]\)\s*)(.+)/;
  const answerRegex = /^(?:Ans(?:wer)?|Correct\s*Option)[\s.#:-]*([A-Da-d1-4])?/i;
  const explanationRegex = /^(?:Exp(?:lanation)?|Solution)[\s.#:-]*(.+)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const qMatch = line.match(questionRegex);
    const isNewQuestion = qMatch && !line.match(optionRegex) && !line.match(answerRegex);

    if (isNewQuestion) {
      if (currentQuestion && currentQuestion.questionText) {
        questions.push(finalizeQuestion(currentQuestion, sourceTag));
      }
      currentQuestion = {
        title: line.substring(0, 50) + "...",
        questionText: line.replace(questionRegex, '$1').trim() || line,
        options: [],
        correctAnswerIndex: 0,
        explanation: "",
        subject: "Extracted PDF"
      };
      continue;
    }

    if (!currentQuestion) {
      currentQuestion = {
        title: "Extracted Question 1",
        questionText: line,
        options: [],
        correctAnswerIndex: 0,
        explanation: "",
        subject: "Extracted PDF"
      };
      continue;
    }

    const optMatch = line.match(optionRegex);
    if (optMatch && currentQuestion.options.length < 4) {
      const optionText = line.replace(/^(?:[A-Da-d1-4][\s.):|-]+|\([A-Da-d1-4]\)\s*)/, '').trim();
      if (optionText) {
        currentQuestion.options.push(optionText);
      }
      continue;
    }

    const ansMatch = line.match(answerRegex);
    if (ansMatch) {
      const ansChar = ansMatch[1] ? ansMatch[1].toUpperCase() : null;
      if (ansChar) {
        if (['A', '1'].includes(ansChar)) currentQuestion.correctAnswerIndex = 0;
        else if (['B', '2'].includes(ansChar)) currentQuestion.correctAnswerIndex = 1;
        else if (['C', '3'].includes(ansChar)) currentQuestion.correctAnswerIndex = 2;
        else if (['D', '4'].includes(ansChar)) currentQuestion.correctAnswerIndex = 3;
      }
      continue;
    }

    const expMatch = line.match(explanationRegex);
    if (expMatch) {
      currentQuestion.explanation = expMatch[1] || "";
      continue;
    }

    if (currentQuestion.options.length === 0) {
      currentQuestion.questionText += " " + line;
    } else {
      if (!currentQuestion.explanation) {
        currentQuestion.explanation = line;
      } else {
        currentQuestion.explanation += " " + line;
      }
    }
  }

  if (currentQuestion && currentQuestion.questionText) {
    questions.push(finalizeQuestion(currentQuestion, sourceTag));
  }

  return questions;
};

function finalizeQuestion(q, sourceTag) {
  while (q.options.length < 4) {
    q.options.push(`Option ${String.fromCharCode(65 + q.options.length)}`);
  }
  return {
    id: "q_pdf_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
    title: q.questionText.substring(0, 45) + "...",
    questionText: q.questionText,
    options: q.options.slice(0, 4),
    correctAnswerIndex: q.correctAnswerIndex,
    explanation: q.explanation || "Extracted from PDF question paper.",
    source: sourceTag,
    status: "pending",
    subject: q.subject || "General",
    tags: ["PDF-Import"],
    createdAt: new Date().toISOString()
  };
}
