// Main Controller App
window.QB = window.QB || {};

let currentQuestionsList = [];
let parsedPdfQuestions = [];
let chartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  QB.initFirebaseInstance();
  await loadDashboardData();
  initDailyChart();

  window.switchTab = switchTab;
  window.openConfigModal = openConfigModal;
  window.closeConfigModal = closeConfigModal;
  window.saveConfigFromModal = saveConfigFromModal;
  window.handlePdfUpload = handlePdfUpload;
  window.parseRawText = parseRawText;
  window.saveAllParsedQuestions = saveAllParsedQuestions;
  window.loadPracticeQuestions = loadPracticeQuestions;
  window.attemptQuestion = attemptQuestion;
  window.updateQuestionStatus = updateQuestionStatus;
  window.renderQuestionsTable = renderQuestionsTable;
  window.openCreateDeckModal = openCreateDeckModal;
  window.flipDeckCard = flipDeckCard;
  window.deleteQuestion = deleteQuestion;
  window.clearAllQuestions = clearAllQuestions;
});

async function loadDashboardData() {
  currentQuestionsList = await QB.fetchQuestions();

  const total = currentQuestionsList.length;
  const pending = currentQuestionsList.filter(q => q.status === 'pending').length;
  const solved = currentQuestionsList.filter(q => q.status === 'solved').length;
  const revision = currentQuestionsList.filter(q => q.status === 'needs_revision').length;

  document.getElementById('stat-total').innerText = total;
  document.getElementById('stat-pending').innerText = pending;
  document.getElementById('stat-solved').innerText = solved;
  document.getElementById('stat-revision').innerText = revision;

  const reports = QB.getDailyReports();
  const today = new Date().toISOString().split('T')[0];
  const todayReport = reports.find(r => r.date === today) || { attemptedCount: 0, correctCount: 0, wrongCount: 0 };

  document.getElementById('today-attempted').innerText = todayReport.attemptedCount;
  document.getElementById('today-correct').innerText = todayReport.correctCount;
  document.getElementById('today-wrong').innerText = todayReport.wrongCount;

  renderQuestionsTable();
  renderDecks();
}

function switchTab(tabName) {
  ['dashboard', 'practice', 'pdf', 'decks'].forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    const nav = document.getElementById(`nav-${t}`);
    if (t === tabName) {
      el.classList.remove('hidden');
      if (nav) {
        nav.className = "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 text-indigo-400 bg-indigo-950/60 border border-indigo-800/40";
      }
    } else {
      el.classList.add('hidden');
      if (nav) {
        nav.className = "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 text-slate-400 hover:text-slate-200";
      }
    }
  });

  if (tabName === 'practice') {
    loadPracticeQuestions();
  }
}

function renderQuestionsTable() {
  const tbody = document.getElementById('recent-questions-tbody');
  if (!tbody) return;

  if (currentQuestionsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400">No questions in database. Sync from Testbook or upload PDF!</td></tr>`;
    return;
  }

  tbody.innerHTML = currentQuestionsList.map(q => {
    let statusBadge = `<span class="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">Pending</span>`;
    if (q.status === 'solved') {
      statusBadge = `<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">Solved</span>`;
    } else if (q.status === 'needs_revision') {
      statusBadge = `<span class="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">Needs Study</span>`;
    }

    return `
      <tr class="hover:bg-slate-900/40 transition">
        <td class="p-3 font-medium text-slate-200 max-w-md truncate">${escapeHtml(q.questionText)}</td>
        <td class="p-3 text-slate-400 text-xs">${escapeHtml(q.subject || 'General')}</td>
        <td class="p-3 text-xs"><span class="bg-slate-800 text-indigo-300 px-2 py-0.5 rounded-md border border-slate-700 uppercase font-mono">${q.source}</span></td>
        <td class="p-3">${statusBadge}</td>
        <td class="p-3 flex items-center space-x-2">
          <button onclick="switchTab('practice')" class="text-xs bg-indigo-600/80 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition font-medium">Attempt</button>
          <button onclick="deleteQuestion('${q.id}')" class="text-xs bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-rose-500/30 transition" title="Delete Question">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function deleteQuestion(qId) {
  if (confirm("Are you sure you want to delete this question?")) {
    await QB.deleteQuestion(qId);
    await loadDashboardData();
  }
}

async function clearAllQuestions() {
  if (confirm("Are you sure you want to clear ALL questions from the database? This cannot be undone.")) {
    await QB.clearAllQuestions();
    await loadDashboardData();
  }
}

function loadPracticeQuestions() {
  const container = document.getElementById('quiz-card-container');
  if (!container) return;

  const statusFilter = document.getElementById('practice-filter-status')?.value || 'pending';
  const sourceFilter = document.getElementById('practice-filter-source')?.value || 'all';

  let filtered = [...currentQuestionsList];
  if (statusFilter !== 'all') {
    filtered = filtered.filter(q => q.status === statusFilter);
  }
  if (sourceFilter !== 'all') {
    filtered = filtered.filter(q => q.source === sourceFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="glass p-8 rounded-2xl border border-slate-800 text-center space-y-3">
        <div class="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400 text-xl">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h3 class="font-bold text-lg text-white">No Matching Questions Found</h3>
        <p class="text-xs text-slate-400">All questions in this filter have been completed or none match your selection.</p>
        <button onclick="switchTab('pdf')" class="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">Upload PDF Questions</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((q, idx) => {
    const optionsHtml = q.options.map((opt, optIdx) => `
      <button onclick="attemptQuestion('${q.id}', ${optIdx}, ${q.correctAnswerIndex})" id="opt-${q.id}-${optIdx}" class="w-full text-left p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm text-slate-200 transition flex items-center space-x-3 group">
        <span class="w-7 h-7 rounded-lg bg-slate-800 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white font-bold text-xs flex items-center justify-center border border-slate-700 transition">
          ${String.fromCharCode(65 + optIdx)}
        </span>
        <span class="flex-1">${escapeHtml(opt)}</span>
      </button>
    `).join('');

    return `
      <div class="glass p-6 rounded-2xl border border-slate-800 space-y-5 mb-6">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            Question ${idx + 1} of ${filtered.length} • <span class="text-indigo-400 uppercase">${q.subject || 'General'}</span>
          </span>
          <div class="flex items-center space-x-2">
            <span class="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md font-mono">${q.source}</span>
            <button onclick="deleteQuestion('${q.id}')" class="text-xs text-rose-400 hover:text-rose-300 p-1" title="Delete Question">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>

        <h3 class="text-base font-semibold text-white leading-relaxed">${escapeHtml(q.questionText)}</h3>

        <div class="space-y-2.5" id="options-container-${q.id}">
          ${optionsHtml}
        </div>

        <div id="explanation-box-${q.id}" class="hidden p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-3">
          <div class="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
            <i class="fa-solid fa-lightbulb"></i>
            <span>Detailed Solution & Explanation</span>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(q.explanation)}</p>

          <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span class="text-xs text-slate-400">Mark question status:</span>
            <div class="flex space-x-2">
              <button onclick="updateQuestionStatus('${q.id}', 'solved')" class="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold transition">
                <i class="fa-solid fa-check mr-1"></i> Solved / Mastered
              </button>
              <button onclick="updateQuestionStatus('${q.id}', 'needs_revision')" class="text-xs bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold transition">
                <i class="fa-solid fa-rotate-right mr-1"></i> Needs Revision
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function attemptQuestion(qId, selectedIdx, correctIdx) {
  const optionsBox = document.getElementById(`options-container-${qId}`);
  const explanationBox = document.getElementById(`explanation-box-${qId}`);
  if (!optionsBox) return;

  const buttons = optionsBox.querySelectorAll('button');
  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === correctIdx) {
      btn.className = "w-full text-left p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-sm text-emerald-200 flex items-center space-x-3";
    } else if (idx === selectedIdx && selectedIdx !== correctIdx) {
      btn.className = "w-full text-left p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-sm text-rose-200 flex items-center space-x-3";
    }
  });

  const isCorrect = (selectedIdx === correctIdx);
  if (explanationBox) {
    explanationBox.classList.remove('hidden');
  }

  const newStatus = isCorrect ? 'solved' : 'needs_revision';
  await QB.updateQuestionStatus(qId, newStatus, selectedIdx);
  await loadDashboardData();
}

async function updateQuestionStatus(qId, status) {
  await QB.updateQuestionStatus(qId, status);
  await loadDashboardData();
  loadPracticeQuestions();
}

async function handlePdfUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('pdf-status');
  statusEl.innerText = "Extracting text from PDF...";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items.map(item => item.str);
      fullText += pageStrings.join(" ") + "\n";
    }

    statusEl.innerText = `Extracted text from ${pdf.numPages} pages. Parsing MCQs...`;
    parsedPdfQuestions = QB.parseTextToMCQs(fullText, "pdf");
    renderParsedPreview();
  } catch (err) {
    console.error("PDF Parsing error:", err);
    statusEl.innerText = "Error extracting PDF text: " + err.message;
  }
}

function parseRawText() {
  const rawText = document.getElementById('raw-text-input')?.value || '';
  if (!rawText.trim()) return;
  parsedPdfQuestions = QB.parseTextToMCQs(rawText, "manual");
  renderParsedPreview();
}

function renderParsedPreview() {
  const container = document.getElementById('pdf-parsed-preview');
  const list = document.getElementById('parsed-questions-list');
  const countEl = document.getElementById('parsed-count');

  if (!container || !list) return;

  countEl.innerText = parsedPdfQuestions.length;
  container.classList.remove('hidden');

  list.innerHTML = parsedPdfQuestions.map((q, idx) => `
    <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
      <div class="flex items-center justify-between text-xs text-indigo-400 font-semibold">
        <span>Question ${idx + 1}</span>
        <span>Correct Answer: Option ${String.fromCharCode(65 + q.correctAnswerIndex)}</span>
      </div>
      <p class="text-sm font-semibold text-white">${escapeHtml(q.questionText)}</p>
      <div class="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
        ${q.options.map((opt, oIdx) => `<div class="bg-slate-950 p-2 rounded-lg border border-slate-800">${String.fromCharCode(65 + oIdx)}) ${escapeHtml(opt)}</div>`).join('')}
      </div>
      <p class="text-xs text-slate-400 italic pt-1">Solution: ${escapeHtml(q.explanation)}</p>
    </div>
  `).join('');
}

async function saveAllParsedQuestions() {
  if (parsedPdfQuestions.length === 0) return;
  for (const q of parsedPdfQuestions) {
    await QB.saveQuestion(q);
  }
  alert(`Successfully saved ${parsedPdfQuestions.length} questions to database!`);
  parsedPdfQuestions = [];
  document.getElementById('pdf-parsed-preview').classList.add('hidden');
  await loadDashboardData();
  switchTab('dashboard');
}

function renderDecks() {
  const grid = document.getElementById('decks-grid');
  if (!grid) return;

  const decks = QB.getDecks();
  grid.innerHTML = decks.map(d => `
    <div class="glass p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between text-xs text-violet-400 mb-2 font-semibold">
          <span>${escapeHtml(d.subject)}</span>
          <span>${d.cards.length} Flashcards</span>
        </div>
        <h3 class="font-bold text-base text-white">${escapeHtml(d.title)}</h3>
      </div>

      <div class="card-flip cursor-pointer h-36 my-2" onclick="flipDeckCard(this)">
        <div class="card-inner w-full h-full relative rounded-xl border border-violet-500/30 bg-violet-950/20 p-4 flex items-center justify-center text-center">
          <div class="card-front text-sm font-semibold text-slate-200">
            ${escapeHtml(d.cards[0]?.front || 'Empty Card')}
            <div class="text-xs text-violet-400 font-normal mt-2">Click to flip answer</div>
          </div>
          <div class="card-back absolute inset-0 rounded-xl bg-slate-900 p-4 flex items-center justify-center text-xs text-slate-300 leading-relaxed overflow-y-auto">
            ${escapeHtml(d.cards[0]?.back || 'No Answer')}
          </div>
        </div>
      </div>

      <button onclick="alert('Deck Review mode initiated for: ${escapeHtml(d.title)}')" class="w-full py-2 bg-violet-600/30 hover:bg-violet-600 text-violet-200 hover:text-white rounded-xl text-xs font-semibold border border-violet-500/40 transition">
        Review Full Deck (${d.cards.length})
      </button>
    </div>
  `).join('');
}

function flipDeckCard(el) {
  const inner = el.querySelector('.card-inner');
  if (inner) inner.classList.toggle('flipped');
}

function openCreateDeckModal() {
  const title = prompt("Enter Deck Title (e.g. Formula Notes):");
  if (!title) return;
  const subject = prompt("Enter Subject:", "General");
  const front = prompt("Card Question/Front (e.g. Pythagoras Theorem):");
  const back = prompt("Card Answer/Formula (e.g. a^2 + b^2 = c^2):");

  if (title && front && back) {
    const newDeck = {
      id: "deck_" + Date.now(),
      title,
      subject: subject || "General",
      createdAt: new Date().toISOString(),
      cards: [{ front, back }]
    };
    QB.saveDeck(newDeck);
    renderDecks();
  }
}

function initDailyChart() {
  const ctx = document.getElementById('dailyReportChart')?.getContext('2d');
  if (!ctx) return;

  const reports = QB.getDailyReports();
  const labels = reports.map(r => r.date).reverse();
  const attemptedData = reports.map(r => r.attemptedCount).reverse();
  const correctData = reports.map(r => r.correctCount).reverse();

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['Today'],
      datasets: [
        {
          label: 'Attempted Questions',
          data: attemptedData.length ? attemptedData : [0],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Correct Answers',
          data: correctData.length ? correctData : [0],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
        y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255, 255, 255, 0.05)' }, beginAtZero: true }
      }
    }
  });
}

function openConfigModal() {
  const cfg = QB.getFirebaseConfig();
  document.getElementById('cfg-project-id').value = cfg.projectId || '';
  document.getElementById('cfg-api-key').value = cfg.apiKey || '';
  document.getElementById('modal-config').classList.remove('hidden');
}

function closeConfigModal() {
  document.getElementById('modal-config').classList.add('hidden');
}

function saveConfigFromModal() {
  const projectId = document.getElementById('cfg-project-id').value.trim();
  const apiKey = document.getElementById('cfg-api-key').value.trim();
  QB.saveFirebaseConfig({ projectId, apiKey });
  closeConfigModal();
  alert("Firebase configuration saved!");
  loadDashboardData();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, match => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[match];
  });
}
