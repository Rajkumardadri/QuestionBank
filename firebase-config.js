// QuestionBank Firebase & Storage Integration Module
window.QB = window.QB || {};

// Configured for Firebase Project: questionsbank-23100
const DEFAULT_CONFIG = {
  apiKey: "AIzaSyCw_eug46aDoSnluYLqFJE7ub89105s6k0",
  authDomain: "questionsbank-23100.firebaseapp.com",
  projectId: "questionsbank-23100",
  storageBucket: "questionsbank-23100.appspot.com",
  messagingSenderId: "224623678941",
  appId: "1:224623678941:web:48a2d7d8699f62202a9234"
};

QB.getFirebaseConfig = function() {
  const saved = localStorage.getItem("qb_firebase_config");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.projectId && parsed.apiKey) return parsed;
    } catch (e) {}
  }
  return DEFAULT_CONFIG;
};

QB.saveFirebaseConfig = function(config) {
  localStorage.setItem("qb_firebase_config", JSON.stringify(config));
  QB.initFirebaseInstance();
};

QB.db = null;

QB.initFirebaseInstance = function() {
  const config = QB.getFirebaseConfig();
  if (config.projectId && config.apiKey && window.firebase) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      QB.db = firebase.firestore();
      console.log("✅ Firebase Firestore successfully connected for project:", config.projectId);
    } catch (err) {
      console.error("⚠️ Firebase initialization error:", err);
      QB.db = null;
    }
  } else {
    console.log("ℹ️ Running in Local Storage Backup mode.");
    QB.db = null;
  }
};

QB.fetchQuestions = async function() {
  if (QB.db) {
    try {
      const snapshot = await QB.db.collection("questions").orderBy("createdAt", "desc").get();
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      if (list.length > 0) return list;
    } catch (err) {
      console.warn("Firestore fetch error, reading from local backup:", err);
    }
  }

  const local = localStorage.getItem("qb_local_questions");
  if (local) {
    try { return JSON.parse(local); } catch(e){}
  }
  return QB.getMockQuestions();
};

QB.saveQuestion = async function(questionData) {
  const qObj = {
    id: questionData.id || "q_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    title: questionData.title || "Untitled Question",
    questionText: questionData.questionText || "",
    options: questionData.options || [],
    correctAnswerIndex: typeof questionData.correctAnswerIndex === 'number' ? questionData.correctAnswerIndex : 0,
    explanation: questionData.explanation || "No explanation provided.",
    source: questionData.source || "manual",
    status: questionData.status || "pending",
    subject: questionData.subject || "General",
    tags: questionData.tags || [],
    createdAt: questionData.createdAt || new Date().toISOString(),
    lastAttemptedAt: questionData.lastAttemptedAt || null,
    userSelectedOption: questionData.userSelectedOption ?? null
  };

  if (QB.db) {
    try {
      await QB.db.collection("questions").doc(qObj.id).set(qObj);
    } catch (err) {
      console.warn("Firestore save error, fallback to local storage:", err);
    }
  }

  const questions = await QB.fetchQuestions();
  const idx = questions.findIndex(q => q.id === qObj.id);
  if (idx >= 0) questions[idx] = qObj;
  else questions.unshift(qObj);
  localStorage.setItem("qb_local_questions", JSON.stringify(questions));

  return qObj;
};

QB.updateQuestionStatus = async function(questionId, newStatus, selectedIdx = null) {
  const questions = await QB.fetchQuestions();
  const q = questions.find(item => item.id === questionId);
  if (q) {
    q.status = newStatus;
    q.lastAttemptedAt = new Date().toISOString();
    if (selectedIdx !== null) q.userSelectedOption = selectedIdx;
    await QB.saveQuestion(q);
    QB.recordDailyAttempt(newStatus === "solved");
  }
};

QB.recordDailyAttempt = function(isCorrect) {
  const today = new Date().toISOString().split('T')[0];
  const reports = QB.getDailyReports();
  let todayReport = reports.find(r => r.date === today);
  if (!todayReport) {
    todayReport = { date: today, attemptedCount: 0, correctCount: 0, wrongCount: 0 };
    reports.unshift(todayReport);
  }
  todayReport.attemptedCount += 1;
  if (isCorrect) todayReport.correctCount += 1;
  else todayReport.wrongCount += 1;

  localStorage.setItem("qb_local_daily_reports", JSON.stringify(reports));
};

QB.getDailyReports = function() {
  const raw = localStorage.getItem("qb_local_daily_reports");
  if (raw) {
    try { return JSON.parse(raw); } catch(e){}
  }
  return [{ date: new Date().toISOString().split('T')[0], attemptedCount: 0, correctCount: 0, wrongCount: 0 }];
};

QB.getDecks = function() {
  const raw = localStorage.getItem("qb_local_decks");
  if (raw) {
    try { return JSON.parse(raw); } catch(e){}
  }
  return [
    {
      id: "deck_1",
      title: "High Yield Quantitative Formulas",
      subject: "Mathematics",
      cards: [
        { front: "Speed, Distance & Time Formula", back: "Speed = Distance / Time. Relative Speed (Opposite Direction) = S1 + S2." },
        { front: "Compound Interest (2 Years Diff)", back: "Difference between CI & SI for 2 years = Principal * (Rate / 100)^2." }
      ]
    }
  ];
};

QB.saveDeck = function(deck) {
  const decks = QB.getDecks();
  const idx = decks.findIndex(d => d.id === deck.id);
  if (idx >= 0) decks[idx] = deck;
  else decks.unshift(deck);
  localStorage.setItem("qb_local_decks", JSON.stringify(decks));
};

QB.getMockQuestions = function() {
  return [
    {
      id: "demo_1",
      title: "Profit and Loss Missed Question",
      questionText: "If the cost price of 12 articles is equal to the selling price of 10 articles, what is the profit percentage?",
      options: ["16.66%", "20%", "25%", "30%"],
      correctAnswerIndex: 1,
      explanation: "Let CP of 1 article = ₹1. Total CP of 12 = ₹12. SP of 10 = ₹12 => SP of 1 article = ₹1.2. Profit % = (0.2 / 1) * 100 = 20%.",
      source: "testbook",
      status: "pending",
      subject: "Quantitative Aptitude",
      createdAt: new Date().toISOString()
    },
    {
      id: "demo_2",
      title: "Indian Polity Article Question",
      questionText: "Which article of the Indian Constitution guarantees Equality before Law?",
      options: ["Article 12", "Article 14", "Article 19", "Article 21"],
      correctAnswerIndex: 1,
      explanation: "Article 14 of the Indian Constitution provides for equality before law and equal protection of laws.",
      source: "pdf",
      status: "needs_revision",
      subject: "General Awareness",
      createdAt: new Date().toISOString()
    }
  ];
};
