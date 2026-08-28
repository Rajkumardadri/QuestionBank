// QuestionBank Firebase & Storage Integration Module
window.QB = window.QB || {};

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
      console.log("✅ Firebase Firestore connected:", config.projectId);
    } catch (err) {
      console.error("⚠️ Firebase initialization error:", err);
      QB.db = null;
    }
  } else {
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
      console.warn("Firestore fetch error, reading local backup:", err);
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
      console.warn("Firestore save error:", err);
    }
  }

  const questions = await QB.fetchQuestions();
  const idx = questions.findIndex(q => q.id === qObj.id);
  if (idx >= 0) questions[idx] = qObj;
  else questions.unshift(qObj);
  localStorage.setItem("qb_local_questions", JSON.stringify(questions));

  return qObj;
};

// Delete single question from Firestore & LocalStorage
QB.deleteQuestion = async function(questionId) {
  if (QB.db) {
    try {
      await QB.db.collection("questions").doc(questionId).delete();
    } catch (err) {
      console.warn("Firestore delete error:", err);
    }
  }

  const local = localStorage.getItem("qb_local_questions");
  if (local) {
    try {
      let list = JSON.parse(local);
      list = list.filter(q => q.id !== questionId);
      localStorage.setItem("qb_local_questions", JSON.stringify(list));
    } catch (e) {}
  }
};

// Clear All Questions
QB.clearAllQuestions = async function() {
  if (QB.db) {
    try {
      const snapshot = await QB.db.collection("questions").get();
      const batch = QB.db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (err) {
      console.warn("Firestore clear batch error:", err);
    }
  }
  localStorage.removeItem("qb_local_questions");
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
  return [];
};
