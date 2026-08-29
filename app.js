// Main Controller App
window.QB = window.QB || {};

let currentQuestionsList = [];
let parsedPdfQuestions = [];
let chartInstance = null;

let activeSubjectFilter = "all";
let activeTopicFilter = "all";
let activeSubfolderFilter = "all";

// SINGLE QUESTION PRACTICE ARENA INDEX & FULLSCREEN STATE
let currentPracticeIndex = 0;
let filteredPracticeQuestions = [];
let isFullscreenMode = false;

// DECK FILTERS STATE
let deckActiveSubject = "all";
let deckActiveTopic = "all";

// MCQ PRACTICE VIEW MODE SUB-OPTION ('cards', 'vertical', or 'table')
let practiceViewMode = 'cards';

// TOPICS MANAGER NESTED LEVEL STATE
let selectedSubjectFolder = null; // null = Level 1 (All Subject Folders), string = Level 2 (Topics inside selected Subject)

// HOURLY MISTAKE SPOTLIGHT STATE
let hourlyTimerInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  QB.initFirebaseInstance();
  await loadDashboardData();
  initDailyChart();
  startHourlyTimerCountdown();

  // GLOBAL KEYBOARD SHORTCUT: LISTEN FOR 'ESC' KEY TO DISMISS FULL SCREEN MODE
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (isFullscreenMode) {
        toggleFullscreenPractice();
      }
    }
  });

  window.switchTab = switchTab;
  window.togglePracticeViewMode = togglePracticeViewMode;
  window.toggleFullscreenPractice = toggleFullscreenPractice;
  window.openConfigModal = openConfigModal;
  window.closeConfigModal = closeConfigModal;
  window.saveConfigFromModal = saveConfigFromModal;
  window.handlePdfUpload = handlePdfUpload;
  window.handleImageUpload = handleImageUpload;
  window.processImageOCR = processImageOCR;
  window.parseRawText = parseRawText;
  window.saveAllParsedQuestions = saveAllParsedQuestions;

  // GLOBAL CLIPBOARD PASTE LISTENER FOR QUESTION IMAGES (CTRL + V)
  window.addEventListener('paste', (e) => {
    // Don't intercept paste inside text inputs unless it's an image
    const items = (e.clipboardData || window.clipboardData)?.items;
    if (!items) return;
    for (let item of items) {
      if (item.type.indexOf("image") === 0) {
        const blob = item.getAsFile();
        if (blob) {
          switchTab('pdf');
          processImageOCR(blob);
          e.preventDefault();
          break;
        }
      }
    }
  });
  window.loadPracticeQuestions = loadPracticeQuestions;
  window.renderVerticalQuestions = renderVerticalQuestions;
  window.jumpToPracticeQuestion = jumpToPracticeQuestion;
  window.nextPracticeQuestion = nextPracticeQuestion;
  window.prevPracticeQuestion = prevPracticeQuestion;
  window.attemptQuestion = attemptQuestion;
  window.attemptHourlySpotlightQuestion = attemptHourlySpotlightQuestion;
  window.toggleSolutionVisibility = toggleSolutionVisibility;
  window.updateQuestionStatus = updateQuestionStatus;
  window.toggleMarkForReview = toggleMarkForReview;
  window.renderQuestionsTable = renderQuestionsTable;

  // DECKS TOPIC MANAGER WINDOW EXPORTS
  window.renderDecks = renderDecks;
  window.openCreateDeckModal = openCreateDeckModal;
  window.closeCreateDeckModal = closeCreateDeckModal;
  window.onCreateDeckSubjectChange = onCreateDeckSubjectChange;
  window.onCreateDeckTopicChange = onCreateDeckTopicChange;
  window.saveCreateDeckModal = saveCreateDeckModal;
  window.openEditDeckModal = openEditDeckModal;
  window.closeEditDeckModal = closeEditDeckModal;
  window.onEditDeckSubjectChange = onEditDeckSubjectChange;
  window.onEditDeckTopicChange = onEditDeckTopicChange;
  window.saveEditDeckModal = saveEditDeckModal;
  window.deleteDeck = deleteDeck;
  window.onDeckSubjectFilterChange = onDeckSubjectFilterChange;
  window.flipDeckCard = flipDeckCard;

  window.deleteQuestion = deleteQuestion;
  window.clearAllQuestions = clearAllQuestions;
  window.filterByHierarchy = filterByHierarchy;
  window.onSubjectDropdownChange = onSubjectDropdownChange;
  window.toggleTheme = toggleTheme;
  window.startAlertRevision = startAlertRevision;
  window.dismissAlertBanner = dismissAlertBanner;
  window.renderSRSMemorySchedule = renderSRSMemorySchedule;
  window.startSRSPracticeSession = startSRSPracticeSession;

  // TOPICS MANAGER WINDOW EXPORTS
  window.renderTopicsManager = renderTopicsManager;
  window.openSubjectFolder = openSubjectFolder;
  window.backToAllSubjects = backToAllSubjects;
  window.openEditTopicModal = openEditTopicModal;
  window.closeEditTopicModal = closeEditTopicModal;
  window.saveEditTopicModal = saveEditTopicModal;
  window.openTopicReaderModal = openTopicReaderModal;
  window.closeTopicReaderModal = closeTopicReaderModal;
  window.deleteTopic = deleteTopic;
  window.practiceSpecificTopic = practiceSpecificTopic;

  // CREATE TOPIC MODAL WINDOW EXPORTS
  window.openCreateTopicModal = openCreateTopicModal;
  window.closeCreateTopicModal = closeCreateTopicModal;
  window.onCreateSubjectSelectChange = onCreateSubjectSelectChange;
  window.saveCreateTopicModal = saveCreateTopicModal;

  // 30-DAY RECYCLE BIN WINDOW EXPORTS
  window.openRecycleBinModal = openRecycleBinModal;
  window.closeRecycleBinModal = closeRecycleBinModal;
  window.renderRecycleBin = renderRecycleBin;
  window.restoreSingleQuestion = restoreSingleQuestion;
  window.permanentDeleteSingleQuestion = permanentDeleteSingleQuestion;
  window.restoreAllDeleted = restoreAllDeleted;
  window.emptyRecycleBinPrompt = emptyRecycleBinPrompt;

  // MOVE & EDIT QUESTION WINDOW EXPORTS
  window.openMoveQuestionModal = openMoveQuestionModal;
  window.closeMoveQuestionModal = closeMoveQuestionModal;
  window.onMoveSubjectChange = onMoveSubjectChange;
  window.onMoveTopicChange = onMoveTopicChange;
  window.saveMoveQuestionModal = saveMoveQuestionModal;
  window.openEditQuestionModal = openEditQuestionModal;
  window.closeEditQuestionModal = closeEditQuestionModal;
  window.saveEditQuestionModal = saveEditQuestionModal;
});

function initTheme() {
  const savedTheme = localStorage.getItem('qb_theme') || 'dark';
  applyTheme(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

function applyTheme(theme) {
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');

  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    localStorage.setItem('qb_theme', 'dark');
    if (icon) icon.className = "fa-solid fa-moon text-indigo-400";
    if (label) label.innerText = "Dark";
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('qb_theme', 'light');
    if (icon) icon.className = "fa-solid fa-sun text-amber-500";
    if (label) label.innerText = "Light";
  }

  if (chartInstance) initDailyChart();
}

// TOGGLE FULLSCREEN FOCUS PRACTICE MODE
function toggleFullscreenPractice() {
  isFullscreenMode = !isFullscreenMode;
  const body = document.body;
  const icon = document.getElementById('fullscreen-icon');
  const text = document.getElementById('fullscreen-text');

  if (isFullscreenMode) {
    body.classList.add('is-fullscreen-practice');
    if (icon) icon.className = "fa-solid fa-compress text-rose-400";
    if (text) text.innerText = "❌ Exit Full Screen";
  } else {
    body.classList.remove('is-fullscreen-practice');
    if (icon) icon.className = "fa-solid fa-expand";
    if (text) text.innerText = "🖥️ Full Screen Mode";
  }

  if (practiceViewMode === 'cards') loadPracticeQuestions();
  else if (practiceViewMode === 'vertical') renderVerticalQuestions();
  else renderQuestionsTable();
}

function formatDateDisplay(isoStr) {
  if (!isoStr) return "Never";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "Never";
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ", " +
           d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return "Never";
  }
}

function getSourceBadgeHtml(sourceStr, q = {}) {
  const s = (sourceStr || 'manual').toLowerCase();
  const testName = q.testTitle || q.sourceTitle || q.subfolder || (sourceStr && sourceStr !== 'testbook' && sourceStr !== 'pdf' && sourceStr !== 'manual' ? sourceStr : '');

  if (testName) {
    return `<span class="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">🌐 ${escapeHtml(testName)}</span>`;
  }

  if (s.includes('testbook')) {
    return `<span class="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">🌐 Testbook Scraped</span>`;
  } else if (s.includes('pdf')) {
    return `<span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">📄 PDF Upload</span>`;
  } else {
    return `<span class="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">✏️ Manual Input</span>`;
  }
}

function formatMathSymbols(str) {
  if (!str) return "";
  let s = str;

  // 1. Fix Testbook Scraped Square Root & Fraction Noise (e.g. Ep--√Ep -> √(E/p))
  s = s.replace(/Ep[-–—]*√\s*Ep/gi, '√(E/p)');
  s = s.replace(/Ep[-–—]*√\s*E\s*p/gi, '√(E · p)');
  s = s.replace(/p\/E[-–—]*√\s*p\/E/gi, '√(p/E)');
  s = s.replace(/1\/pE[-–—]*√\s*1\/pE/gi, '√(1/pE)');

  s = s.replace(/([a-zA-Z0-9\/\s]+)[-–—]{2,}\s*√\s*([a-zA-Z0-9\/\s]+)/g, '$1 = √($2)');

  if (/\bA[\.\)]\s*[\s\S]*\bB[\.\)]\s*[\s\S]*\bC[\.\)]\s*[\s\S]*\bD[\.\)]/i.test(s) && !s.includes("<table")) {
    s = s.replace(/\s*([A-D][\.\)])\s*/g, '<br><strong class="text-indigo-600 dark:text-indigo-400 font-black">$1</strong> ');
  }

  s = s.replace(/√\s*\(?([a-zA-Z0-9\/\s\.\+\-·]+)\)?/g, (match, body) => {
    return `<span class="font-mono text-indigo-600 dark:text-indigo-400 font-black text-sm bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-300 dark:border-indigo-800/40">√(${body.trim()})</span>`;
  });

  s = s.replace(/\brho\b/gi, 'ρ');
  s = s.replace(/\bmu\b/gi, 'μ');
  s = s.replace(/\btau\b/gi, 'τ');
  s = s.replace(/\bnu\b/gi, 'ν');
  s = s.replace(/\bpi\b/gi, 'π');
  s = s.replace(/\btheta\b/gi, 'θ');
  s = s.replace(/\bsigma\b/gi, 'σ');
  s = s.replace(/\balpha\b/gi, 'α');
  s = s.replace(/\bbeta\b/gi, 'β');
  s = s.replace(/\bgamma\b/gi, 'γ');
  s = s.replace(/\bdelta\b/gi, 'Δ');
  s = s.replace(/\bomega\b/gi, 'ω');

  return s;
}

function formatSubSupScripts(str) {
  if (!str) return "";
  let formatted = formatMathSymbols(str);

  // 1. Fix reciprocal expressions like 1x -> 1/x, 1x2 -> 1/x²
  formatted = formatted.replace(/\b1([a-zA-Z])([2-9])?\b/g, (m, letter, p) => {
    return p ? `1/${letter}<sup>${p}</sup>` : `1/${letter}`;
  });

  // 2. Convert algebraic powers (e.g., x2 -> x², x3 -> x³, a2 -> a²)
  formatted = formatted.replace(/\b([a-zA-Z])([2-9])\b/g, '$1<sup>$2</sup>');

  // 3. Convert x^2, x^3, x^(n), etc.
  formatted = formatted.replace(/\^([+-]?\d+|[a-zA-Z])/g, '<sup>$1</sup>');

  // 4. Chemical / Dimensional Formulas
  formatted = formatted.replace(/([MLTθKI])(-?\d+)/g, '$1<sup>$2</sup>');
  formatted = formatted.replace(/(H|N|O|C)2/g, '$1<sub>2</sub>');
  formatted = formatted.replace(/(CO)2/g, '$1<sub>2</sub>');
  formatted = formatted.replace(/\b([PVTFAv])([1-9])\b/g, '$1<sub>$2</sub>');
  formatted = formatted.replace(/(ρ|rho)([A-Z1-9a-z])/g, '$1<sub>$2</sub>');

  // 5. Clean up spaces around equals sign = and operators
  formatted = formatted.replace(/([a-zA-Z0-9</sup></sub>])\s*=\s*([a-zA-Z0-9</sup></sub>])/g, '$1 = $2');

  return formatted;
}

function cleanQuestionTextDisplay(rawStr) {
  if (!rawStr) return "";
  let str = rawStr;

  str = str.replace(/^(?:\s*|\d+%\s*answered\s*correctly|Question\s*No\.\s*\d+|Skipped|Incorrect|Unattempted|Wrong|You:|\d{2}:\d{2}|Avg:|\d{2}:\d{2}|Marks\s*[-+\d.]+|Save|Saved|Report|Reported|Text Size\s*A-?\s*A\+?|View in (?:English|Hindi))+/gi, '');
  str = str.replace(/^(?:\s*|Save|Saved|Report|Reported|\d+%\s*answered\s*correctly|Question:\s*)+/gi, '');

  const footerIdx = str.search(/(?:Re-attempt|123456789|CEDELSubmit|SubmitSubmit|Re-attempt mode|Now You can re-attempt|View Solution|Click here|Your First Attempt|AnswersSolution|Shortcut Trick|Successive ratio|Original amount|Formula Used|Calculations?:|Given:)/i);
  if (footerIdx > 0) {
    str = str.substring(0, footerIdx);
  }

  // Deduplicate exact repeated question text (e.g., "If x+1x=5, then x2+1x2=?If x+1x=5, then x2+1x2=?")
  str = str.trim();
  if (str.length > 8) {
    const halfLen = Math.floor(str.length / 2);
    for (let offset = -2; offset <= 2; offset++) {
      const mid = halfLen + offset;
      if (mid > 0 && mid < str.length) {
        const left = str.substring(0, mid).trim();
        const right = str.substring(mid).trim();
        if (left === right) {
          str = left;
          break;
        }
      }
    }
    const dupRegex = /^([\s\S]{5,})\1$/;
    const dupMatch = str.match(dupRegex);
    if (dupMatch) {
      str = dupMatch[1];
    }
  }

  str = formatMatchListText(str.trim());
  return str;
}

function formatMatchListText(rawStr) {
  if (!rawStr) return "";
  let str = rawStr;

  if (/Match\s+list\s+I|List\s+I[\s\S]*List\s+II/i.test(str)) {
    const lines = str.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    let matchPairs = [];
    let stemLines = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (/^[A-D][\.\)]?$/i.test(line) && i + 3 < lines.length && /^[1-5][\.\)]?$/.test(lines[i+2])) {
        const itemLetter = line.toUpperCase().replace('.', '');
        const itemDesc = lines[i+1];
        const numIndex = lines[i+2].replace('.', '');
        const numDesc = lines[i+3];

        matchPairs.push(`${itemLetter}. ${itemDesc}   ➡   ${numIndex}. ${numDesc}`);
        i += 4;
        continue;
      }
      
      if (/^[A-D]\.\s+/i.test(line) && i + 1 < lines.length && /^[1-5]\.\s+/.test(lines[i+1])) {
        matchPairs.push(`${line}   ➡   ${lines[i+1]}`);
        i += 2;
        continue;
      }

      if (!line.match(/^(?:List I|List II|--------------------------------------------|\(Loss\)|\(Parameter responsible\))$/i)) {
        stemLines.push(line);
      }
      i++;
    }

    if (matchPairs.length > 0) {
      const stem = stemLines.join("\n");
      return `${stem}\n\n${matchPairs.join("\n")}`;
    }
  }

  return str;
}

function renderFormattedQuestionHTML(rawStr) {
  if (!rawStr) return "";
  let str = cleanQuestionTextDisplay(rawStr);

  if (/Match\s+list\s+I|List\s+I[\s\S]*List\s+II|➡/i.test(str)) {
    const lines = str.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    let matchPairs = [];
    let stemLines = [];

    lines.forEach(line => {
      const pairMatch = line.match(/^([A-D])[\.\)]?\s+(.*?)\s*➡\s*([1-5])[\.\)]?\s+(.*)$/i);
      if (pairMatch) {
        matchPairs.push({
          let: pairMatch[1].toUpperCase(),
          leftText: pairMatch[2],
          num: pairMatch[3],
          rightText: pairMatch[4]
        });
        return;
      }

      if (!line.match(/^(?:List I|List II|--------------------------------------------|\(Loss\)|\(Parameter responsible\))$/i)) {
        stemLines.push(line);
      }
    });

    if (matchPairs.length > 0) {
      const stemHtml = formatSubSupScripts(escapeHtml(stemLines.join("\n")));

      const tableRows = matchPairs.map(p => `
        <tr class="hover:bg-slate-100 dark:hover:bg-zinc-900 transition">
          <td class="p-3 border-r border-slate-300 dark:border-zinc-800 font-extrabold text-slate-900 dark:text-white">
            <span class="text-indigo-600 dark:text-indigo-400 font-black mr-2">${p.let}.</span>${formatSubSupScripts(escapeHtml(p.leftText))}
          </td>
          <td class="p-3 font-extrabold text-slate-900 dark:text-white">
            <span class="text-indigo-600 dark:text-indigo-400 font-black mr-2">${p.num}.</span>${formatSubSupScripts(escapeHtml(p.rightText))}
          </td>
        </tr>
      `).join('');

      const tableHtml = `
        <div class="my-4 overflow-hidden rounded-xl border border-slate-300 dark:border-zinc-800 shadow-sm">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-b border-slate-300 dark:border-zinc-800 font-black uppercase">
              <tr>
                <th class="p-3 border-r border-slate-300 dark:border-zinc-800 w-1/2">List I (Description / Parameter)</th>
                <th class="p-3 w-1/2">List II (Dimensional Formula / Match)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-300 dark:divide-zinc-800">
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;

      return `${stemHtml}${tableHtml}`;
    }
  }

  return formatSubSupScripts(escapeHtml(str));
}

function cleanExplanationDisplay(rawStr) {
  if (!rawStr) return "";
  let str = rawStr;

  str = str.replace(/^(?:\s*Solution\s*&\s*Concept:\s*|\s*Click here to see the answer now|\s*Your First Attempt Answers|\s*AnswersSolution|\s*SolutionConcept:|\s*View Solution)+/gi, '');
  str = str.replace(/^(?:\s*Click here to see the answer now|\s*Your First Attempt Answers|\s*AnswersSolution|\s*SolutionConcept:)+/gi, '');
  str = str.replace(/\n?\s*Was the solution helpful\?\s*(?:Yes\s*No|Yes|No)?[\s\S]*/gi, '');

  return formatSubSupScripts(str.trim());
}

async function loadDashboardData() {
  currentQuestionsList = await QB.fetchQuestions(false);

  currentQuestionsList.forEach(async (q) => {
    q.questionText = cleanQuestionTextDisplay(q.questionText);
    q.explanation = cleanExplanationDisplay(q.explanation);
    if (!q.subject) q.subject = "Mechanical Engineering";
    if (!q.topic) q.topic = "Fluid Mechanics";

    // Auto-migrate Thermodynamics questions that were previously saved under Fluid Mechanics
    const qTextLower = (q.questionText + " " + q.explanation + " " + (q.subfolder || "")).toLowerCase();
    const thermoKeywords = [
      "steam", "thermodynam", "ideal gas", "spontaneous", "entropy", "enthalpy",
      "carnot", "polytropic", "isothermal", "adiabatic", "refrigeran", "heat engine",
      "saturated pressure", "sub-cooled", "super-heated", "saturated condition"
    ];

    if (q.topic === "Fluid Mechanics" && thermoKeywords.some(kw => qTextLower.includes(kw))) {
      console.log(`🔄 Auto-migrating Thermodynamics question to correct topic: "${q.title || q.id}"`);
      q.topic = "Thermodynamics";
      await QB.saveQuestion(q);
    }

    if (q.questionText.includes("Newtonian fluid") && q.options && q.options.length >= 4) {
      q.options.forEach((opt, idx) => {
        if (opt.includes("Product of the fluid viscosity and the velocity gradient perpendicular")) {
          q.correctAnswerIndex = idx;
        }
      });
    }
  });

  const total = currentQuestionsList.length;
  const pending = currentQuestionsList.filter(q => q.status === 'pending').length;
  const solved = currentQuestionsList.filter(q => q.status === 'solved').length;
  const revision = currentQuestionsList.filter(q => q.status === 'needs_revision').length;

  const reports = QB.getDailyReports();
  const totalUserAttempts = reports.reduce((acc, r) => acc + (r.attemptedCount || 0), 0);
  const attemptedCount = Math.max(solved + revision, totalUserAttempts);
  const accuracyPct = attemptedCount > 0 ? Math.round((solved / attemptedCount) * 100) : 0;

  const dangerZoneCount = currentQuestionsList.filter(q => (q.wrongAttemptsCount || 0) >= 2 || q.status === 'needs_revision').length;

  if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
  if (document.getElementById('stat-attempted-total')) document.getElementById('stat-attempted-total').innerText = attemptedCount;
  if (document.getElementById('stat-solved')) document.getElementById('stat-solved').innerText = solved;
  if (document.getElementById('stat-revision')) document.getElementById('stat-revision').innerText = revision;
  if (document.getElementById('stat-accuracy')) document.getElementById('stat-accuracy').innerText = `${accuracyPct}%`;
  if (document.getElementById('stat-attempted-sub')) document.getElementById('stat-attempted-sub').innerText = `${attemptedCount} Attempted`;
  if (document.getElementById('stat-danger-count')) document.getElementById('stat-danger-count').innerText = dangerZoneCount;

  const today = new Date().toISOString().split('T')[0];
  const todayReport = reports.find(r => r.date === today) || { attemptedCount: 0, correctCount: 0, wrongCount: 0 };

  if (document.getElementById('today-attempted')) document.getElementById('today-attempted').innerText = todayReport.attemptedCount;
  if (document.getElementById('today-correct')) document.getElementById('today-correct').innerText = todayReport.correctCount;
  if (document.getElementById('today-wrong')) document.getElementById('today-wrong').innerText = todayReport.wrongCount;

  renderHourlyMistakeSpotlight();
  renderSRSMemorySchedule();
  renderRevisionAnalytics();
  renderQuestionsTable();
  renderDecks();
  renderTopicsManager();
  updateSubjectAndTopicDropdowns();
  updateDeckDropdowns();
  checkRevisionAlerts();
}

function renderSRSMemorySchedule() {
  const container = document.getElementById('srs-schedule-forecast');
  if (!container) return;

  const forecast = QB.getSRSForecast(currentQuestionsList);

  container.innerHTML = `
    <div class="p-4 rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50/80 dark:bg-rose-950/30 space-y-1">
      <div class="flex items-center justify-between text-rose-700 dark:text-rose-400 font-extrabold text-xs">
        <span>⏰ Due Today</span>
        <i class="fa-solid fa-clock-rotate-left"></i>
      </div>
      <div class="text-2xl font-black text-rose-700 dark:text-rose-400">${forecast.dueToday}</div>
      <p class="text-[10px] font-bold text-rose-800 dark:text-rose-300">Action Required Today</p>
    </div>

    <div class="p-4 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/30 space-y-1">
      <div class="flex items-center justify-between text-amber-700 dark:text-amber-400 font-extrabold text-xs">
        <span>📅 Due Tomorrow</span>
        <i class="fa-solid fa-calendar-day"></i>
      </div>
      <div class="text-2xl font-black text-amber-700 dark:text-amber-400">${forecast.dueTomorrow}</div>
      <p class="text-[10px] font-bold text-amber-800 dark:text-amber-300">Review Schedule Next</p>
    </div>

    <div class="p-4 rounded-xl border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/80 dark:bg-indigo-950/30 space-y-1">
      <div class="flex items-center justify-between text-indigo-700 dark:text-indigo-400 font-extrabold text-xs">
        <span>🗓️ In 3-7 Days</span>
        <i class="fa-solid fa-calendar-week"></i>
      </div>
      <div class="text-2xl font-black text-indigo-700 dark:text-indigo-400">${forecast.dueThisWeek}</div>
      <p class="text-[10px] font-bold text-indigo-800 dark:text-indigo-300">Upcoming Spaced Reviews</p>
    </div>

    <div class="p-4 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/30 space-y-1">
      <div class="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-extrabold text-xs">
        <span>🧠 Retained & Mastered</span>
        <i class="fa-solid fa-graduation-cap"></i>
      </div>
      <div class="text-2xl font-black text-emerald-700 dark:text-emerald-400">${forecast.retainedMastered}</div>
      <p class="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">Next Review > 7 Days</p>
    </div>
  `;
}

function startSRSPracticeSession() {
  const statusSelect = document.getElementById('practice-filter-status');
  if (statusSelect) {
    statusSelect.value = "srs_due";
  }
  switchTab('practice');

  if (practiceViewMode === 'cards') loadPracticeQuestions();
  else if (practiceViewMode === 'vertical') renderVerticalQuestions();
  else renderQuestionsTable();
}

function getSRSBadgeHtml(q) {
  if (!q) return '';
  if (!q.nextReviewDate) {
    return `<span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-xs font-black">⏰ Due Today</span>`;
  }
  const now = new Date();
  const reviewDate = new Date(q.nextReviewDate);
  const diffDays = Math.ceil((reviewDate - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return `<span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-xs font-black">⏰ Due Today</span>`;
  } else if (diffDays === 1) {
    return `<span class="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-black">📅 Due Tomorrow</span>`;
  } else {
    return `<span class="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-black">🧠 Review in ${diffDays}d</span>`;
  }
}

// HOURLY HIGH-MISTAKE SPOTLIGHT (HIGH-CONTRAST THEME COLORS)
function renderHourlyMistakeSpotlight() {
  const container = document.getElementById('hourly-mistake-card');
  if (!container) return;

  let highMistakeQuestions = currentQuestionsList.filter(q => (q.wrongAttemptsCount || 0) >= 1 || q.status === 'needs_revision');

  if (highMistakeQuestions.length === 0) {
    highMistakeQuestions = currentQuestionsList.filter(q => q.status === 'pending');
  }
  if (highMistakeQuestions.length === 0) {
    highMistakeQuestions = currentQuestionsList;
  }

  if (highMistakeQuestions.length === 0) {
    container.innerHTML = `
      <div class="p-6 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
        No questions available for hourly mistake challenge. Sync questions from Testbook or upload PDF!
      </div>
    `;
    return;
  }

  const currentHourSeed = Math.floor(Date.now() / (1000 * 60 * 60));
  const selectedIdx = currentHourSeed % highMistakeQuestions.length;
  const q = highMistakeQuestions[selectedIdx];

  const wrongCount = q.wrongAttemptsCount || (q.status === 'needs_revision' ? 2 : 1);
  const formattedContent = renderFormattedQuestionHTML(q.questionText);

  const optionsHtml = q.options.map((opt, optIdx) => `
    <button onclick="attemptHourlySpotlightQuestion('${q.id}', ${optIdx}, ${q.correctAnswerIndex})" id="spotlight-opt-${q.id}-${optIdx}" class="w-full text-left p-3.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-700/60 rounded-xl text-xs font-extrabold text-slate-900 dark:text-white transition flex items-center space-x-3 group shadow-sm">
      <span class="w-6 h-6 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 group-hover:bg-rose-600 group-hover:text-white font-extrabold text-xs flex items-center justify-center border border-slate-300 dark:border-zinc-700 transition">
        ${String.fromCharCode(65 + optIdx)}
      </span>
      <span class="flex-1 font-extrabold text-slate-900 dark:text-white">${formatSubSupScripts(escapeHtml(opt))}</span>
    </button>
  `).join('');

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <div class="flex flex-wrap items-center gap-2">
          <span class="bg-rose-600 text-white px-3 py-1 rounded-full text-xs font-black flex items-center space-x-1 shadow-sm">
            <i class="fa-solid fa-fire"></i>
            <span>❌ Failed ${wrongCount} Time${wrongCount > 1 ? 's' : ''} in Past Attempts</span>
          </span>
          <span class="text-indigo-600 dark:text-amber-400 font-extrabold">📁 ${escapeHtml(q.subject || 'General')} → 📂 ${escapeHtml(q.topic || 'General')}</span>
        </div>

        <div class="flex items-center space-x-2">
          <button onclick="practiceSpecificTopic('${escapeHtml(q.subject)}', '${escapeHtml(q.topic)}')" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-extrabold shadow-sm transition">⚡ Open Full Practice</button>
        </div>
      </div>

      <div class="text-sm font-black leading-relaxed bg-slate-100 dark:bg-black p-4 rounded-xl border border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white shadow-sm">${formattedContent}</div>

      <div class="space-y-2" id="spotlight-options-${q.id}">
        ${optionsHtml}
      </div>

      <div id="spotlight-sol-${q.id}" class="hidden p-4 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-indigo-500/40 text-xs font-semibold space-y-2">
        <div class="text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center space-x-1">
          <i class="fa-solid fa-lightbulb text-amber-500"></i>
          <span>Concept Solution Note:</span>
        </div>
        <div class="text-slate-900 dark:text-slate-200 whitespace-pre-wrap font-mono">${cleanExplanationDisplay(q.explanation)}</div>
      </div>
    </div>
  `;
}

async function attemptHourlySpotlightQuestion(qId, selectedIdx, correctIdx) {
  const container = document.getElementById(`spotlight-options-${qId}`);
  const solBox = document.getElementById(`spotlight-sol-${qId}`);
  if (!container) return;

  const buttons = container.querySelectorAll('button');
  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === correctIdx) {
      btn.className = "w-full text-left p-3.5 bg-emerald-100 dark:bg-emerald-950 border-2 border-emerald-500 rounded-xl text-xs font-extrabold text-emerald-950 dark:text-emerald-200 flex items-center justify-between";
      btn.innerHTML += `<span class="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">✓ Correct</span>`;
    } else if (idx === selectedIdx && selectedIdx !== correctIdx) {
      btn.className = "w-full text-left p-3.5 bg-rose-100 dark:bg-rose-950 border-2 border-rose-500 rounded-xl text-xs font-extrabold text-rose-950 dark:text-rose-200 flex items-center justify-between";
      btn.innerHTML += `<span class="bg-rose-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">✗ Wrong</span>`;
    }
  });

  if (solBox) solBox.classList.remove('hidden');

  const isCorrect = (selectedIdx === correctIdx);
  const newStatus = isCorrect ? 'solved' : 'needs_revision';
  await QB.updateQuestionStatus(qId, newStatus, selectedIdx);

  await loadDashboardData();
}

function startHourlyTimerCountdown() {
  if (hourlyTimerInterval) clearInterval(hourlyTimerInterval);

  function updateTimer() {
    const now = new Date();
    const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
    const diffMs = nextHour - now;

    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

    const timerEl = document.getElementById('hourly-timer-countdown');
    if (timerEl) {
      timerEl.innerText = `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
    }

    if (diffMs <= 1000) {
      setTimeout(() => renderHourlyMistakeSpotlight(), 1500);
    }
  }

  updateTimer();
  hourlyTimerInterval = setInterval(updateTimer, 1000);
}

function togglePracticeViewMode(mode) {
  practiceViewMode = mode;

  const cardsContainer = document.getElementById('quiz-card-container');
  const verticalContainer = document.getElementById('practice-vertical-container');
  const tableContainer = document.getElementById('practice-table-container');

  const btnCards = document.getElementById('btn-view-cards');
  const btnVertical = document.getElementById('btn-view-vertical');
  const btnTable = document.getElementById('btn-view-table');

  [btnCards, btnVertical, btnTable].forEach(btn => {
    if (btn) btn.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white";
  });

  if (cardsContainer) cardsContainer.classList.add('hidden');
  if (verticalContainer) verticalContainer.classList.add('hidden');
  if (tableContainer) tableContainer.classList.add('hidden');

  if (mode === 'vertical') {
    if (verticalContainer) verticalContainer.classList.remove('hidden');
    if (btnVertical) btnVertical.className = "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 bg-indigo-600 text-white shadow-sm";
    renderVerticalQuestions();
  } else if (mode === 'table') {
    if (tableContainer) tableContainer.classList.remove('hidden');
    if (btnTable) btnTable.className = "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 bg-indigo-600 text-white shadow-sm";
    renderQuestionsTable();
  } else {
    if (cardsContainer) cardsContainer.classList.remove('hidden');
    if (btnCards) btnCards.className = "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 bg-indigo-600 text-white shadow-sm";
    loadPracticeQuestions();
  }
}

function renderVerticalQuestions() {
  const container = document.getElementById('practice-vertical-container');
  if (!container) return;

  const subjectFilter = document.getElementById('practice-filter-subject')?.value || 'all';
  const topicFilter = document.getElementById('practice-filter-topic')?.value || 'all';
  const statusFilter = document.getElementById('practice-filter-status')?.value || 'all';
  const sourceFilter = document.getElementById('practice-filter-source')?.value || 'all';

  let list = [...currentQuestionsList];

  if (subjectFilter !== 'all') {
    list = list.filter(q => (q.subject || 'Mechanical Engineering') === subjectFilter);
  }
  if (topicFilter !== 'all') {
    list = list.filter(q => (q.topic || 'Fluid Mechanics') === topicFilter);
  }
  if (activeSubfolderFilter !== 'all' && activeSubfolderFilter !== '') {
    list = list.filter(q => (q.subfolder || '') === activeSubfolderFilter);
  }
  if (statusFilter === 'srs_due') {
    list = list.filter(q => QB.isSRSQuestionDue(q));
  } else if (statusFilter !== 'all') {
    const filteredByStatus = list.filter(q => q.status === statusFilter);
    if (filteredByStatus.length > 0) {
      list = filteredByStatus;
    }
  }
  if (sourceFilter !== 'all') {
    list = list.filter(q => q.source === sourceFilter);
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="glass p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center space-y-3 bg-white dark:bg-zinc-950 max-w-4xl mx-auto">
        <i class="fa-solid fa-circle-check text-4xl text-slate-500"></i>
        <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">No Questions Found in Selected Hierarchy</h3>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Sync questions from Testbook or upload PDF to populate this folder!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map((q, idx) => {
    const formattedQuestionContent = renderFormattedQuestionHTML(q.questionText);
    const cleanSol = cleanExplanationDisplay(q.explanation);

    const optionsHtml = q.options.map((opt, optIdx) => `
      <button onclick="attemptQuestion('${q.id}', ${optIdx}, ${q.correctAnswerIndex})" id="opt-${q.id}-${optIdx}" class="w-full text-left p-4 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white transition flex items-center space-x-3 group shadow-sm">
        <span class="w-7 h-7 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-slate-300 group-hover:bg-indigo-600 group-hover:text-white font-extrabold text-xs flex items-center justify-center border border-slate-300 dark:border-zinc-700 transition">
          ${String.fromCharCode(65 + optIdx)}
        </span>
        <span class="flex-1 font-extrabold text-slate-900 dark:text-white">${formatSubSupScripts(escapeHtml(opt))}</span>
      </button>
    `).join('');

    let statusBadge = `<span class="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-extrabold">Unattempted</span>`;
    if (q.status === 'solved') {
      statusBadge = `<span class="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-extrabold">✓ Correct / Solved</span>`;
    } else if (q.status === 'needs_revision') {
      statusBadge = `<span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-xs font-extrabold">✗ Incorrect / Revision</span>`;
    }

    const subheaderBadge = (q.subfolder && q.subfolder.trim()) ? ` / <span class="text-slate-900 dark:text-slate-200 font-bold">📄 ${escapeHtml(q.subfolder)}</span>` : '';

    return `
      <div class="glass p-6 rounded-2xl space-y-5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-zinc-900 -mx-6 -mt-6 p-4 rounded-t-2xl border-b border-slate-200 dark:border-zinc-800">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-black text-slate-900 dark:text-white bg-slate-200 dark:bg-black/60 px-3.5 py-1 rounded-full border border-slate-300 dark:border-zinc-800">
              Question No. ${idx + 1} <span class="text-slate-500 dark:text-slate-400 font-normal">of ${list.length}</span>
            </span>
            ${statusBadge}
            ${getSRSBadgeHtml(q)}
            <span class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black">Marks 1</span>
            ${getSourceBadgeHtml(q.source, q)}
          </div>

          <div class="flex items-center space-x-1.5">
            <button onclick="toggleMarkForReview('${q.id}')" class="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-slate-950 px-2.5 py-1 rounded-lg border border-amber-500/30 transition font-bold">🔖 Mark</button>
            <button onclick="toggleSolutionVisibility('${q.id}')" class="text-xs bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white px-2.5 py-1 rounded-lg border border-indigo-500/30 transition font-bold">💡 Solution</button>
            <button onclick="openMoveQuestionModal('${q.id}')" class="text-xs bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-zinc-700 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 transition font-bold">📦 Move</button>
            <button onclick="openEditQuestionModal('${q.id}')" class="text-xs bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-zinc-700 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 transition font-bold">✏️ Edit</button>
            <button onclick="deleteQuestion('${q.id}')" class="text-xs bg-rose-600/20 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white px-2 py-1.5 rounded-lg border border-rose-500/30 transition font-bold">🗑️</button>
          </div>
        </div>

        <div class="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center space-x-2">
          <span>Folder:</span>
          <span class="text-amber-600 dark:text-amber-400 font-black">📁 ${escapeHtml(q.subject || 'General')}</span>
          <span>/</span>
          <span class="text-indigo-600 dark:text-indigo-400 font-black">📂 ${escapeHtml(q.topic || 'General')}</span>
          ${subheaderBadge}
        </div>

        <div class="text-base font-black leading-relaxed bg-slate-100 dark:bg-black p-5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white shadow-sm">${formattedQuestionContent}</div>

        <div class="space-y-2.5" id="options-container-${q.id}">
          ${optionsHtml}
        </div>

        <div id="explanation-box-${q.id}" class="hidden p-5 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-indigo-500/40 space-y-3 shadow-xl">
          <div class="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
            <i class="fa-solid fa-lightbulb text-amber-500"></i>
            <span>Testbook Detailed Solution & Concept Note</span>
          </div>
          <div class="text-xs text-slate-900 dark:text-white font-bold leading-relaxed font-mono whitespace-pre-wrap bg-white dark:bg-black p-4 rounded-xl border border-slate-200 dark:border-zinc-800">${cleanSol}</div>

          <div class="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Update status:</span>
            <div class="flex space-x-2">
              <button onclick="updateQuestionStatus('${q.id}', 'solved')" class="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg font-extrabold transition flex items-center space-x-1">
                <i class="fa-solid fa-check"></i> <span>Solved / Mastered</span>
              </button>
              <button onclick="updateQuestionStatus('${q.id}', 'needs_revision')" class="text-xs bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-lg font-extrabold transition flex items-center space-x-1">
                <i class="fa-solid fa-rotate-right"></i> <span>Needs Revision</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openCreateTopicModal() {
  const subjSelect = document.getElementById('create-subj-select');
  const customSubjInput = document.getElementById('create-subj-custom');
  const topicInput = document.getElementById('create-topic-name');
  const subfolderInput = document.getElementById('create-subfolder-name');

  if (!subjSelect) return;

  const subjects = Array.from(new Set(currentQuestionsList.map(item => item.subject || 'Mechanical Engineering')));

  subjSelect.innerHTML = subjects.map(s => `<option value="${escapeHtml(s)}">📁 ${escapeHtml(s)}</option>`).join('') +
    `<option value="__NEW_SUBJECT__">➕ Create New Subject...</option>`;

  if (subjects.length > 0) {
    subjSelect.value = subjects[0];
    customSubjInput.classList.add('hidden');
  } else {
    subjSelect.value = "__NEW_SUBJECT__";
    customSubjInput.classList.remove('hidden');
  }

  if (topicInput) topicInput.value = "";
  if (subfolderInput) subfolderInput.value = "";

  document.getElementById('modal-create-topic').classList.remove('hidden');
}

function onCreateSubjectSelectChange() {
  const subjSelect = document.getElementById('create-subj-select');
  const customSubjInput = document.getElementById('create-subj-custom');
  if (!subjSelect || !customSubjInput) return;

  if (subjSelect.value === '__NEW_SUBJECT__') {
    customSubjInput.classList.remove('hidden');
  } else {
    customSubjInput.classList.add('hidden');
  }
}

function closeCreateTopicModal() {
  document.getElementById('modal-create-topic').classList.add('hidden');
}

async function saveCreateTopicModal() {
  const subjSelect = document.getElementById('create-subj-select');
  const customSubjInput = document.getElementById('create-subj-custom');
  const topicInput = document.getElementById('create-topic-name');
  const subfolderInput = document.getElementById('create-subfolder-name');

  let finalSubj = subjSelect.value;
  if (finalSubj === '__NEW_SUBJECT__') {
    finalSubj = customSubjInput.value.trim();
  }

  if (!finalSubj) {
    alert("Please select or enter a Subject Name.");
    return;
  }

  const finalTopic = topicInput.value.trim();
  if (!finalTopic) {
    alert("Please enter a Topic Name.");
    return;
  }

  const finalSubfolder = subfolderInput.value.trim();

  await QB.saveQuestion({
    title: `${finalTopic} Study Notes & Practice`,
    questionText: `Concept Initialization & Study Notes for ${finalTopic}${finalSubfolder ? ' -> ' + finalSubfolder : ''}`,
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctAnswerIndex: 0,
    explanation: `Folder created for [${finalSubj} -> ${finalTopic}${finalSubfolder ? ' -> ' + finalSubfolder : ''}]. Sync questions from Testbook or upload PDF to populate this folder!`,
    source: "manual",
    status: "pending",
    subject: finalSubj,
    topic: finalTopic,
    subfolder: finalSubfolder
  });

  closeCreateTopicModal();
  alert(`Successfully created Topic: [${finalSubj} -> ${finalTopic}]!`);
  await loadDashboardData();
}

function openMoveQuestionModal(qId) {
  const q = currentQuestionsList.find(item => item.id === qId);
  if (!q) return;

  document.getElementById('move-q-id').value = q.id;
  document.getElementById('move-q-subfolder').value = q.subfolder || "";

  const subjSelect = document.getElementById('move-q-subject');
  const subjects = Array.from(new Set(currentQuestionsList.map(item => item.subject || 'Mechanical Engineering')));

  subjSelect.innerHTML = subjects.map(s => `<option value="${escapeHtml(s)}">📁 ${escapeHtml(s)}</option>`).join('') +
    `<option value="__NEW_SUBJECT__">➕ Create New Subject...</option>`;

  const currentSubj = q.subject || "Mechanical Engineering";
  if (subjects.includes(currentSubj)) {
    subjSelect.value = currentSubj;
  } else if (subjects.length > 0) {
    subjSelect.value = subjects[0];
  } else {
    subjSelect.value = "__NEW_SUBJECT__";
  }

  onMoveSubjectChange(q.topic);
  document.getElementById('modal-move-question').classList.remove('hidden');
}

function onMoveSubjectChange(targetTopicToSelect = null) {
  const subjSelect = document.getElementById('move-q-subject');
  const customSubjInput = document.getElementById('move-q-subject-custom');
  const topicSelect = document.getElementById('move-q-topic');
  if (!subjSelect || !topicSelect) return;

  const selectedSubj = subjSelect.value;

  if (selectedSubj === '__NEW_SUBJECT__') {
    customSubjInput.classList.remove('hidden');
    topicSelect.innerHTML = `<option value="__NEW_TOPIC__">➕ Create New Topic...</option>`;
    onMoveTopicChange();
    return;
  } else {
    customSubjInput.classList.add('hidden');
  }

  const matchingQuestions = currentQuestionsList.filter(item => (item.subject || 'Mechanical Engineering') === selectedSubj);
  const topics = Array.from(new Set(matchingQuestions.map(item => item.topic || 'Fluid Mechanics')));

  topicSelect.innerHTML = topics.map(t => `<option value="${escapeHtml(t)}">📂 ${escapeHtml(t)}</option>`).join('') +
    `<option value="__NEW_TOPIC__">➕ Create New Topic...</option>`;

  if (targetTopicToSelect && topics.includes(targetTopicToSelect)) {
    topicSelect.value = targetTopicToSelect;
  } else if (topics.length > 0) {
    topicSelect.value = topics[0];
  } else {
    topicSelect.value = "__NEW_TOPIC__";
  }

  onMoveTopicChange();
}

function onMoveTopicChange() {
  const topicSelect = document.getElementById('move-q-topic');
  const customTopicInput = document.getElementById('move-q-topic-custom');
  if (!topicSelect) return;

  if (topicSelect.value === '__NEW_TOPIC__') {
    customTopicInput.classList.remove('hidden');
  } else {
    customTopicInput.classList.add('hidden');
  }
}

function closeMoveQuestionModal() {
  document.getElementById('modal-move-question').classList.add('hidden');
}

async function saveMoveQuestionModal() {
  const qId = document.getElementById('move-q-id').value;
  const subjSelect = document.getElementById('move-q-subject');
  const customSubjInput = document.getElementById('move-q-subject-custom');
  const topicSelect = document.getElementById('move-q-topic');
  const customTopicInput = document.getElementById('move-q-topic-custom');
  const subfolderInput = document.getElementById('move-q-subfolder');

  let finalSubj = subjSelect.value;
  if (finalSubj === '__NEW_SUBJECT__') {
    finalSubj = customSubjInput.value.trim() || "General Subject";
  }

  let finalTopic = topicSelect.value;
  if (finalTopic === '__NEW_TOPIC__') {
    finalTopic = customTopicInput.value.trim() || "General Topic";
  }

  const finalSubfolder = subfolderInput.value.trim();

  const q = currentQuestionsList.find(item => item.id === qId);
  if (q) {
    q.subject = finalSubj;
    q.topic = finalTopic;
    q.subfolder = finalSubfolder;
    await QB.saveQuestion(q);
  }

  closeMoveQuestionModal();
  await loadDashboardData();

  if (practiceViewMode === 'cards') loadPracticeQuestions();
  else if (practiceViewMode === 'vertical') renderVerticalQuestions();
  else renderQuestionsTable();
}

function openEditQuestionModal(qId) {
  const q = currentQuestionsList.find(item => item.id === qId);
  if (!q) return;

  document.getElementById('edit-q-id').value = q.id;
  document.getElementById('edit-q-text').value = q.questionText || "";
  document.getElementById('edit-q-opt-0').value = q.options[0] || "";
  document.getElementById('edit-q-opt-1').value = q.options[1] || "";
  document.getElementById('edit-q-opt-2').value = q.options[2] || "";
  document.getElementById('edit-q-opt-3').value = q.options[3] || "";
  document.getElementById('edit-q-correct-idx').value = typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0;
  document.getElementById('edit-q-explanation').value = q.explanation || "";

  document.getElementById('modal-edit-question').classList.remove('hidden');
}

function closeEditQuestionModal() {
  document.getElementById('modal-edit-question').classList.add('hidden');
}

async function saveEditQuestionModal() {
  const qId = document.getElementById('edit-q-id').value;
  const qText = document.getElementById('edit-q-text').value.trim();
  const opt0 = document.getElementById('edit-q-opt-0').value.trim() || "Option A";
  const opt1 = document.getElementById('edit-q-opt-1').value.trim() || "Option B";
  const opt2 = document.getElementById('edit-q-opt-2').value.trim() || "Option C";
  const opt3 = document.getElementById('edit-q-opt-3').value.trim() || "Option D";
  const correctIdx = parseInt(document.getElementById('edit-q-correct-idx').value, 10);
  const explanation = document.getElementById('edit-q-explanation').value.trim();

  const q = currentQuestionsList.find(item => item.id === qId);
  if (q) {
    q.questionText = qText;
    q.options = [opt0, opt1, opt2, opt3];
    q.correctAnswerIndex = correctIdx;
    q.explanation = explanation;
    await QB.saveQuestion(q);
  }

  closeEditQuestionModal();
  await loadDashboardData();

  if (practiceViewMode === 'cards') loadPracticeQuestions();
  else if (practiceViewMode === 'vertical') renderVerticalQuestions();
  else renderQuestionsTable();
}

function renderRevisionAnalytics() {
  const container = document.getElementById('revision-stats-container');
  if (!container) return;

  const subjectsMap = {};

  currentQuestionsList.forEach(q => {
    const subj = q.subject || "Mechanical Engineering";
    const top = q.topic || "Fluid Mechanics";

    if (!subjectsMap[subj]) {
      subjectsMap[subj] = {
        subjectName: subj,
        total: 0,
        solved: 0,
        revision: 0,
        pending: 0,
        topics: {}
      };
    }

    if (!subjectsMap[subj].topics[top]) {
      subjectsMap[subj].topics[top] = {
        topicName: top,
        total: 0,
        solved: 0,
        revision: 0,
        pending: 0
      };
    }

    subjectsMap[subj].total += 1;
    subjectsMap[subj].topics[top].total += 1;

    if (q.status === 'solved') {
      subjectsMap[subj].solved += 1;
      subjectsMap[subj].topics[top].solved += 1;
    } else if (q.status === 'needs_revision') {
      subjectsMap[subj].revision += 1;
      subjectsMap[subj].topics[top].revision += 1;
    } else {
      subjectsMap[subj].pending += 1;
      subjectsMap[subj].topics[top].pending += 1;
    }
  });

  const subjects = Object.keys(subjectsMap);

  if (subjects.length === 0) {
    container.innerHTML = `
      <div class="col-span-full glass p-6 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400">
        No question statistics yet. Sync questions from Testbook or upload PDF to see real-time revision analytics!
      </div>
    `;
    return;
  }

  container.innerHTML = subjects.map(subjName => {
    const s = subjectsMap[subjName];
    const subjectMasteryPct = s.total > 0 ? Math.round((s.solved / s.total) * 100) : 0;

    const topicsHtml = Object.keys(s.topics).map(topName => {
      const t = s.topics[topName];
      const topicMasteryPct = t.total > 0 ? Math.round((t.solved / t.total) * 100) : 0;

      let badgeHtml = `<span class="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">✓ 100% Mastered</span>`;
      let actionBtnHtml = `
        <button onclick="practiceSpecificTopic('${escapeHtml(subjName)}', '${escapeHtml(topName)}')" class="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1">
          <i class="fa-solid fa-play"></i> <span>Practice</span>
        </button>
      `;

      if (t.revision > 0) {
        badgeHtml = `<span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-500/30">⚠️ ${t.revision} Revision Due</span>`;
        actionBtnHtml = `
          <button onclick="practiceSpecificTopic('${escapeHtml(subjName)}', '${escapeHtml(topName)}')" class="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-black transition flex items-center space-x-1 shadow-sm">
            <i class="fa-solid fa-bolt"></i> <span>Revise Now</span>
          </button>
        `;
      } else if (t.pending > 0) {
        badgeHtml = `<span class="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/30">⏰ ${t.pending} Pending</span>`;
      }

      return `
        <div class="bg-white dark:bg-zinc-950 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2">
          <div class="flex items-center justify-between text-xs font-extrabold">
            <span class="text-slate-900 dark:text-white flex items-center space-x-1.5">
              <i class="fa-solid fa-folder text-indigo-500"></i>
              <span>${escapeHtml(topName)}</span>
            </span>
            <div class="flex items-center space-x-2">
              ${badgeHtml}
              ${actionBtnHtml}
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <div class="flex-1 bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden flex">
              <div class="bg-emerald-500 h-full" style="width: ${(t.solved / t.total) * 100}%" title="Solved: ${t.solved}"></div>
              <div class="bg-rose-500 h-full" style="width: ${(t.revision / t.total) * 100}%" title="Needs Revision: ${t.revision}"></div>
              <div class="bg-amber-500 h-full" style="width: ${(t.pending / t.total) * 100}%" title="Pending: ${t.pending}"></div>
            </div>
            <span class="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">${topicMasteryPct}% Ready</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="glass p-5 rounded-2xl space-y-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-sm">
                <i class="fa-solid fa-book"></i>
              </div>
              <div>
                <h3 class="font-black text-base text-slate-900 dark:text-white">${escapeHtml(subjName)}</h3>
                <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">${s.total} Questions • ${s.topics ? Object.keys(s.topics).length : 0} Topics</p>
              </div>
            </div>
            <span class="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/80 px-2.5 py-1 rounded-xl border border-indigo-300 dark:border-indigo-800/40">
              ${subjectMasteryPct}% Mastered
            </span>
          </div>

          <div class="w-full bg-slate-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex">
            <div class="bg-emerald-500 h-full transition-all duration-500" style="width: ${(s.solved / s.total) * 100}%"></div>
            <div class="bg-rose-500 h-full transition-all duration-500" style="width: ${(s.revision / s.total) * 100}%"></div>
            <div class="bg-amber-500 h-full transition-all duration-500" style="width: ${(s.pending / s.total) * 100}%"></div>
          </div>

          <div class="space-y-2 pt-2">
            ${topicsHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function openRecycleBinModal() {
  const modal = document.getElementById('modal-recycle-bin');
  if (modal) modal.classList.remove('hidden');
  await renderRecycleBin();
}

function closeRecycleBinModal() {
  const modal = document.getElementById('modal-recycle-bin');
  if (modal) modal.classList.add('hidden');
}

async function renderRecycleBin() {
  const listEl = document.getElementById('recycle-bin-questions-list');
  const countText = document.getElementById('recycle-count-text');
  if (!listEl) return;

  const deletedQuestions = await QB.fetchQuestions(true);

  if (countText) {
    countText.innerText = `${deletedQuestions.length} Deleted Questions in Trash (30-Day Auto Purge)`;
  }

  if (deletedQuestions.length === 0) {
    listEl.innerHTML = `
      <div class="glass p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center space-y-3 bg-white dark:bg-zinc-950">
        <i class="fa-solid fa-trash-can text-4xl text-emerald-500"></i>
        <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">Recycle Bin is Empty</h3>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">No deleted questions in trash!</p>
      </div>
    `;
    return;
  }

  const now = Date.now();

  listEl.innerHTML = deletedQuestions.map((q, idx) => {
    const expiresMs = q.expiresAt || (now + 30 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.max(0, Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24)));
    const deletedDate = q.deletedAt ? new Date(q.deletedAt).toLocaleDateString() : 'Recently';

    return `
      <div class="glass p-5 rounded-2xl space-y-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
        <div class="flex items-center justify-between text-xs font-bold">
          <div class="flex items-center space-x-2">
            <span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black">Deleted</span>
            <span class="text-slate-500 dark:text-slate-400">Deleted: ${deletedDate}</span>
          </div>
          <span class="text-amber-500 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 text-[10px]">
            ⏳ Expires & Auto-Purges in ${daysLeft} days
          </span>
        </div>

        <div class="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed line-clamp-2">${renderFormattedQuestionHTML(q.questionText)}</div>

        <div class="text-xs font-bold text-slate-500 dark:text-slate-400">
          Folder: <span class="text-indigo-600 dark:text-indigo-400 font-bold">${escapeHtml(q.subject || 'General')} → ${escapeHtml(q.topic || 'General')}</span>
        </div>

        <div class="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end space-x-2">
          <button onclick="restoreSingleQuestion('${q.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1 shadow-sm">
            <i class="fa-solid fa-rotate-left"></i>
            <span>Restore Question</span>
          </button>
          <button onclick="permanentDeleteSingleQuestion('${q.id}')" class="bg-rose-600/20 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-500/30 transition flex items-center space-x-1">
            <i class="fa-solid fa-fire"></i>
            <span>Delete Forever</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function restoreSingleQuestion(qId) {
  await QB.restoreQuestion(qId);
  await renderRecycleBin();
  await loadDashboardData();
}

async function permanentDeleteSingleQuestion(qId) {
  if (confirm("Permanently erase this question forever? It cannot be restored.")) {
    await QB.permanentDeleteQuestion(qId);
    await renderRecycleBin();
    await loadDashboardData();
  }
}

async function restoreAllDeleted() {
  if (confirm("Restore ALL deleted questions back to your active QuestionBank?")) {
    await QB.restoreAllDeletedQuestions();
    await renderRecycleBin();
    await loadDashboardData();
  }
}

async function emptyRecycleBinPrompt() {
  if (confirm("Permanently erase ALL items in the Recycle Bin forever? This action CANNOT be undone.")) {
    await QB.emptyRecycleBin();
    await renderRecycleBin();
    await loadDashboardData();
  }
}

function renderTopicsManager() {
  const grid = document.getElementById('topics-manager-grid');
  if (!grid) return;

  const query = document.getElementById('topics-search-input')?.value.toLowerCase().trim() || "";

  const subjectsMap = {};

  currentQuestionsList.forEach(q => {
    const subj = q.subject || "Mechanical Engineering";
    const top = q.topic || "Fluid Mechanics";

    if (!subjectsMap[subj]) {
      subjectsMap[subj] = {
        subjectName: subj,
        topicsCount: 0,
        questionsCount: 0,
        pendingCount: 0,
        topics: {}
      };
    }

    if (!subjectsMap[subj].topics[top]) {
      subjectsMap[subj].topics[top] = {
        subject: subj,
        topic: top,
        total: 0,
        pending: 0,
        solved: 0,
        revision: 0,
        questions: []
      };
      subjectsMap[subj].topicsCount += 1;
    }

    const tObj = subjectsMap[subj].topics[top];
    tObj.total += 1;
    subjectsMap[subj].questionsCount += 1;

    if (q.status === 'solved') tObj.solved += 1;
    else if (q.status === 'needs_revision') tObj.revision += 1;
    else {
      tObj.pending += 1;
      subjectsMap[subj].pendingCount += 1;
    }

    tObj.questions.push(q);
  });

  if (selectedSubjectFolder === null) {
    const subjNames = Object.keys(subjectsMap).filter(sName => {
      if (!query) return true;
      return sName.toLowerCase().includes(query) || Object.keys(subjectsMap[sName].topics).some(t => t.toLowerCase().includes(query));
    });

    if (subjNames.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full glass p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center space-y-3 bg-white dark:bg-zinc-950">
          <i class="fa-solid fa-folder-closed text-4xl text-amber-500"></i>
          <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">No Subjects Found</h3>
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Click "Create New Topic" above or sync questions from Testbook!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = subjNames.map(sName => {
      const sObj = subjectsMap[sName];

      return `
        <div onclick="openSubjectFolder('${escapeHtml(sName)}')" class="glass p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 cursor-pointer hover:border-indigo-500 transition shadow-sm group">
          <div class="flex items-center justify-between">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-2xl group-hover:scale-110 transition">
              <i class="fa-solid fa-folder-closed"></i>
            </div>
            <span class="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold px-3 py-1 rounded-full border border-indigo-300 dark:border-indigo-800/40">
              ${sObj.topicsCount} Topics • ${sObj.questionsCount} Questions
            </span>
          </div>

          <div>
            <h3 class="font-black text-xl text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">${escapeHtml(sName)}</h3>
            <p class="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Click to open subject folder and view all topics</p>
          </div>

          <div class="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <span>Open Folder & Topics →</span>
            <span class="text-slate-500 dark:text-slate-400 font-mono">${sObj.pendingCount} Pending</span>
          </div>
        </div>
      `;
    }).join('');

    return;
  }

  const sObj = subjectsMap[selectedSubjectFolder];

  if (!sObj) {
    selectedSubjectFolder = null;
    renderTopicsManager();
    return;
  }

  const topicNames = Object.keys(sObj.topics).filter(tName => {
    if (!query) return true;
    return tName.toLowerCase().includes(query);
  });

  const breadcrumbHeader = `
    <div class="col-span-full flex items-center justify-between bg-slate-100 dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 mb-2">
      <button onclick="backToAllSubjects()" class="bg-white dark:bg-zinc-950 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-900 dark:text-white px-4 py-2 rounded-xl text-xs font-black border border-slate-300 dark:border-zinc-800 transition flex items-center space-x-2">
        <i class="fa-solid fa-arrow-left"></i>
        <span>← Back to All Subject Folders</span>
      </button>
      <div class="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
        <span class="text-amber-500">📁 ${escapeHtml(selectedSubjectFolder)}</span>
        <span class="text-xs font-bold text-slate-500 dark:text-slate-400">(${sObj.topicsCount} Topics)</span>
      </div>
    </div>
  `;

  if (topicNames.length === 0) {
    grid.innerHTML = breadcrumbHeader + `
      <div class="col-span-full glass p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center space-y-3 bg-white dark:bg-zinc-950">
        <i class="fa-solid fa-folder-open text-4xl text-amber-500"></i>
        <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">No Topics inside ${escapeHtml(selectedSubjectFolder)}</h3>
      </div>
    `;
    return;
  }

  grid.innerHTML = breadcrumbHeader + topicNames.map(tName => {
    const t = sObj.topics[tName];

    return `
      <div class="glass p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 flex flex-col justify-between hover:border-indigo-500/50 transition shadow-sm">
        <div>
          <div class="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">
            <span>📁 ${escapeHtml(t.subject)}</span>
            <span class="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-mono text-[10px] border border-indigo-300 dark:border-indigo-800/40">${t.total} Questions</span>
          </div>
          <h3 class="font-black text-lg text-slate-900 dark:text-white flex items-center space-x-2">
            <i class="fa-solid fa-folder text-indigo-500"></i>
            <span>${escapeHtml(t.topic)}</span>
          </h3>

          <div class="grid grid-cols-3 gap-2 mt-4 text-center">
            <div class="bg-amber-50 dark:bg-amber-950/20 p-2 rounded-xl border border-amber-500/20">
              <div class="text-sm font-black text-amber-600 dark:text-amber-400">${t.pending}</div>
              <div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Pending</div>
            </div>
            <div class="bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-xl border border-emerald-500/20">
              <div class="text-sm font-black text-emerald-600 dark:text-emerald-400">${t.solved}</div>
              <div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Solved</div>
            </div>
            <div class="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-xl border border-rose-500/20">
              <div class="text-sm font-black text-rose-600 dark:text-rose-400">${t.revision}</div>
              <div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Revision</div>
            </div>
          </div>
        </div>

        <div class="space-y-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
          <div class="grid grid-cols-2 gap-2">
            <button onclick="openTopicReaderModal('${escapeHtml(t.subject)}', '${escapeHtml(t.topic)}')" class="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 shadow-sm">
              <i class="fa-solid fa-book-open"></i>
              <span>Read Notes</span>
            </button>
            <button onclick="openEditTopicModal('${escapeHtml(t.subject)}', '${escapeHtml(t.topic)}')" class="py-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-900 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-300 dark:border-zinc-700 transition flex items-center justify-center space-x-1">
              <i class="fa-solid fa-pen-to-square"></i>
              <span>Edit Topic</span>
            </button>
          </div>

          <div class="flex items-center space-x-2">
            <button onclick="practiceSpecificTopic('${escapeHtml(t.subject)}', '${escapeHtml(t.topic)}')" class="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white rounded-xl text-xs font-bold border border-emerald-500/30 transition flex items-center justify-center space-x-1">
              <i class="fa-solid fa-play"></i>
              <span>Practice Topic</span>
            </button>
            <button onclick="deleteTopic('${escapeHtml(t.subject)}', '${escapeHtml(t.topic)}')" class="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white rounded-xl text-xs border border-rose-500/30 transition" title="Move Topic Questions to Recycle Bin">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openSubjectFolder(subjName) {
  selectedSubjectFolder = subjName;
  renderTopicsManager();
}

function backToAllSubjects() {
  selectedSubjectFolder = null;
  renderTopicsManager();
}

function practiceSpecificTopic(subj, top) {
  const statusSelect = document.getElementById('practice-filter-status');
  if (statusSelect) {
    statusSelect.value = "all";
  }
  filterByHierarchy(subj, top, 'all');
}

function openEditTopicModal(subj, top) {
  document.getElementById('edit-orig-subject').value = subj;
  document.getElementById('edit-orig-topic').value = top;
  document.getElementById('edit-new-subject').value = subj;
  document.getElementById('edit-new-topic').value = top;
  document.getElementById('modal-edit-topic').classList.remove('hidden');
}

function closeEditTopicModal() {
  document.getElementById('modal-edit-topic').classList.add('hidden');
}

async function saveEditTopicModal() {
  const origSubj = document.getElementById('edit-orig-subject').value;
  const origTop = document.getElementById('edit-orig-topic').value;
  const newSubj = document.getElementById('edit-new-subject').value.trim() || origSubj;
  const newTop = document.getElementById('edit-new-topic').value.trim() || origTop;

  if (origSubj === newSubj && origTop === newTop) {
    closeEditTopicModal();
    return;
  }

  const matchingQuestions = currentQuestionsList.filter(q => (q.subject || 'Mechanical Engineering') === origSubj && (q.topic || 'Fluid Mechanics') === origTop);

  for (const q of matchingQuestions) {
    q.subject = newSubj;
    q.topic = newTop;
    await QB.saveQuestion(q);
  }

  closeEditTopicModal();
  alert(`Successfully updated topic name to [${newSubj} -> ${newTop}] across ${matchingQuestions.length} questions!`);
  await loadDashboardData();
}

function openTopicReaderModal(subj, top) {
  const modal = document.getElementById('modal-topic-reader');
  const titleEl = document.getElementById('reader-topic-title');
  const subtitleEl = document.getElementById('reader-topic-subtitle');
  const listEl = document.getElementById('reader-questions-list');

  if (!modal || !listEl) return;

  const topicQuestions = currentQuestionsList.filter(q => (q.subject || 'Mechanical Engineering') === subj && (q.topic || 'Fluid Mechanics') === top);

  titleEl.innerHTML = `<span>📖 Topic Reader: ${escapeHtml(top)}</span>`;
  subtitleEl.innerText = `Folder: [${subj} -> ${top}] • Total ${topicQuestions.length} questions & detailed concept notes`;

  listEl.innerHTML = topicQuestions.map((q, idx) => `
    <div class="glass p-5 rounded-2xl space-y-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
      <div class="flex items-center justify-between text-xs font-bold">
        <span class="text-indigo-600 dark:text-indigo-400">Question ${idx + 1} of ${topicQuestions.length}</span>
        <div class="flex items-center space-x-2">
          ${getSourceBadgeHtml(q.source, q)}
          <span class="bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[10px]">Correct: Option ${String.fromCharCode(65 + q.correctAnswerIndex)}</span>
        </div>
      </div>

      <div class="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">${renderFormattedQuestionHTML(q.questionText)}</div>

      <div class="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
        ${q.options.map((opt, oIdx) => `
          <div class="p-2.5 rounded-xl border ${oIdx === q.correctAnswerIndex ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200' : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-300'}">
            <span class="font-black mr-1">${String.fromCharCode(65 + oIdx)})</span> ${formatSubSupScripts(escapeHtml(opt))}
          </div>
        `).join('')}
      </div>

      <div class="p-4 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-indigo-500/30 text-xs font-semibold space-y-1">
        <div class="text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center space-x-1">
          <i class="fa-solid fa-lightbulb text-amber-500"></i>
          <span>Concept Solution Note:</span>
        </div>
        <div class="text-slate-900 dark:text-white whitespace-pre-wrap font-mono">${cleanExplanationDisplay(q.explanation)}</div>
      </div>

      <div class="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
        <div>
          <span>📅 Added: ${formatDateDisplay(q.createdAt)}</span> • 
          <span>⏱️ Last Attempted: ${formatDateDisplay(q.lastAttemptedAt)}</span>
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="openMoveQuestionModal('${q.id}')" class="bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white px-2.5 py-1 rounded-lg border border-indigo-500/30 transition">📦 Move</button>
          <button onclick="openEditQuestionModal('${q.id}')" class="bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-900 dark:text-slate-200 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-zinc-700 transition">✏️ Edit</button>
        </div>
      </div>
    </div>
  `).join('');

  modal.classList.remove('hidden');
}

function closeTopicReaderModal() {
  document.getElementById('modal-topic-reader').classList.add('hidden');
}

async function deleteTopic(subj, top) {
  if (confirm(`Move ALL questions inside Topic [${subj} -> ${top}] to the 30-Day Recycle Bin?`)) {
    const toDelete = currentQuestionsList.filter(q => (q.subject || 'Mechanical Engineering') === subj && (q.topic || 'Fluid Mechanics') === top);
    for (const q of toDelete) {
      await QB.deleteQuestion(q.id);
    }
    await loadDashboardData();
  }
}

function checkRevisionAlerts() {
  const banner = document.getElementById('revision-alert-banner');
  const alertMsg = document.getElementById('alert-message');
  if (!banner || !alertMsg) return;

  const revisionQuestions = currentQuestionsList.filter(q => q.status === 'needs_revision');
  const pendingQuestions = currentQuestionsList.filter(q => q.status === 'pending');

  if (revisionQuestions.length > 0) {
    const dueTopic = revisionQuestions[0].topic || "Fluid Mechanics";
    const dueSub = (revisionQuestions[0].subfolder && revisionQuestions[0].subfolder.trim()) ? ` → ${revisionQuestions[0].subfolder}` : '';
    alertMsg.innerHTML = `⚠️ <strong class="text-amber-500">Revision Alert:</strong> It's been a while since you studied <strong class="text-indigo-600 dark:text-indigo-400 font-bold">[${escapeHtml(dueTopic)}${escapeHtml(dueSub)}]</strong> (${revisionQuestions.length} questions need revision). Time to revise now!`;
    banner.classList.remove('hidden');
  } else if (pendingQuestions.length > 0) {
    const dueTopic = pendingQuestions[0].topic || "Fluid Mechanics";
    const dueSub = (pendingQuestions[0].subfolder && pendingQuestions[0].subfolder.trim()) ? ` → ${pendingQuestions[0].subfolder}` : '';
    alertMsg.innerHTML = `⏰ <strong class="text-amber-500">Study Reminder:</strong> You have un-attempted missed questions in <strong class="text-indigo-600 dark:text-indigo-400 font-bold">[${escapeHtml(dueTopic)}${escapeHtml(dueSub)}]</strong> waiting for review!`;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function startAlertRevision() {
  const revisionQuestions = currentQuestionsList.filter(q => q.status === 'needs_revision');
  const statusSelect = document.getElementById('practice-filter-status');

  if (revisionQuestions.length > 0 && statusSelect) {
    statusSelect.value = "needs_revision";
  } else if (statusSelect) {
    statusSelect.value = "pending";
  }

  switchTab('practice');

  if (practiceViewMode === 'cards') loadPracticeQuestions();
  else if (practiceViewMode === 'vertical') renderVerticalQuestions();
  else renderQuestionsTable();
}

function dismissAlertBanner() {
  const banner = document.getElementById('revision-alert-banner');
  if (banner) banner.classList.add('hidden');
}

function updateSubjectAndTopicDropdowns() {
  const subjDropdown = document.getElementById('practice-filter-subject');
  const topicDropdown = document.getElementById('practice-filter-topic');

  if (!subjDropdown || !topicDropdown) return;

  const subjects = Array.from(new Set(currentQuestionsList.map(q => q.subject || 'Mechanical Engineering')));

  subjDropdown.innerHTML = `<option value="all">📁 All Subjects</option>` +
    subjects.map(s => `<option value="${escapeHtml(s)}">📁 ${escapeHtml(s)}</option>`).join('');

  if (activeSubjectFilter !== "all") {
    subjDropdown.value = activeSubjectFilter;
  }

  onSubjectDropdownChange();
}

function updateDeckDropdowns() {
  const deckSubj = document.getElementById('deck-filter-subject');
  const deckTopic = document.getElementById('deck-filter-topic');
  if (!deckSubj || !deckTopic) return;

  const allDecks = QB.getDecks();
  const subjects = Array.from(new Set([
    ...currentQuestionsList.map(q => q.subject || 'Mechanical Engineering'),
    ...allDecks.map(d => d.subject || 'Mechanical Engineering')
  ]));

  deckSubj.innerHTML = `<option value="all">📁 All Subjects</option>` +
    subjects.map(s => `<option value="${escapeHtml(s)}">📁 ${escapeHtml(s)}</option>`).join('');

  if (deckActiveSubject !== "all") {
    deckSubj.value = deckActiveSubject;
  }

  onDeckSubjectFilterChange();
}

function onDeckSubjectFilterChange() {
  const deckSubj = document.getElementById('deck-filter-subject');
  const deckTopic = document.getElementById('deck-filter-topic');
  if (!deckSubj || !deckTopic) return;

  const selectedSubj = deckSubj.value;
  deckActiveSubject = selectedSubj;

  const allDecks = QB.getDecks();

  let filteredQs = currentQuestionsList;
  let filteredDecks = allDecks;

  if (selectedSubj !== 'all') {
    filteredQs = currentQuestionsList.filter(q => (q.subject || 'Mechanical Engineering') === selectedSubj);
    filteredDecks = allDecks.filter(d => (d.subject || 'Mechanical Engineering') === selectedSubj);
  }

  const topics = Array.from(new Set([
    ...filteredQs.map(q => q.topic || 'Fluid Mechanics'),
    ...filteredDecks.map(d => d.topic || 'Fluid Mechanics')
  ]));

  deckTopic.innerHTML = `<option value="all">📂 All Topics in ${selectedSubj === 'all' ? 'All Subjects' : selectedSubj}</option>` +
    topics.map(t => `<option value="${escapeHtml(t)}">📂 ${escapeHtml(t)}</option>`).join('');

  if (deckActiveTopic !== "all" && topics.includes(deckActiveTopic)) {
    deckTopic.value = deckActiveTopic;
  } else {
    deckActiveTopic = "all";
    deckTopic.value = "all";
  }

  renderDecks();
}

function onSubjectDropdownChange() {
  const subjDropdown = document.getElementById('practice-filter-subject');
  const topicDropdown = document.getElementById('practice-filter-topic');
  if (!subjDropdown || !topicDropdown) return;

  const selectedSubj = subjDropdown.value;
  activeSubjectFilter = selectedSubj;

  let filteredQuestions = currentQuestionsList;
  if (selectedSubj !== 'all') {
    filteredQuestions = currentQuestionsList.filter(q => (q.subject || 'Mechanical Engineering') === selectedSubj);
  }

  const topics = Array.from(new Set(filteredQuestions.map(q => q.topic || 'Fluid Mechanics')));

  topicDropdown.innerHTML = `<option value="all">📂 All Topics in ${selectedSubj === 'all' ? 'All Subjects' : selectedSubj}</option>` +
    topics.map(t => `<option value="${escapeHtml(t)}">📂 ${escapeHtml(t)}</option>`).join('');

  if (activeTopicFilter !== "all" && topics.includes(activeTopicFilter)) {
    topicDropdown.value = activeTopicFilter;
  } else {
    activeTopicFilter = "all";
  }

  currentPracticeIndex = 0;

  if (practiceViewMode === 'cards') loadPracticeQuestions();
  else if (practiceViewMode === 'vertical') renderVerticalQuestions();
  else renderQuestionsTable();
}

function filterByHierarchy(subj, top, sub) {
  activeSubjectFilter = subj;
  activeTopicFilter = top;
  activeSubfolderFilter = (sub && sub !== 'all') ? sub : 'all';

  switchTab('practice');

  const subjDropdown = document.getElementById('practice-filter-subject');
  if (subjDropdown) {
    subjDropdown.value = subj;
  }

  const topicDropdown = document.getElementById('practice-filter-topic');
  if (topicDropdown) {
    let filteredQuestions = currentQuestionsList;
    if (subj !== 'all') {
      filteredQuestions = currentQuestionsList.filter(q => (q.subject || 'Mechanical Engineering') === subj);
    }
    const topics = Array.from(new Set(filteredQuestions.map(q => q.topic || 'Fluid Mechanics')));
    topicDropdown.innerHTML = `<option value="all">📂 All Topics in ${subj === 'all' ? 'All Subjects' : subj}</option>` +
      topics.map(t => `<option value="${escapeHtml(t)}">📂 ${escapeHtml(t)}</option>`).join('');

    if (top && top !== 'all' && topics.includes(top)) {
      topicDropdown.value = top;
      activeTopicFilter = top;
    } else {
      topicDropdown.value = 'all';
      activeTopicFilter = 'all';
    }
  }

  currentPracticeIndex = 0;

  if (practiceViewMode === 'cards') loadPracticeQuestions();
  else if (practiceViewMode === 'vertical') renderVerticalQuestions();
  else renderQuestionsTable();
}

function switchTab(tabName) {
  ['dashboard', 'practice', 'pdf', 'decks', 'topics'].forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    const nav = document.getElementById(`nav-${t}`);
    if (t === tabName) {
      if (el) el.classList.remove('hidden');
      if (nav) {
        nav.className = "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/40";
      }
    } else {
      if (el) el.classList.add('hidden');
      if (nav) {
        nav.className = "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white";
      }
    }
  });

  if (tabName === 'practice') {
    if (practiceViewMode === 'cards') loadPracticeQuestions();
    else if (practiceViewMode === 'vertical') renderVerticalQuestions();
    else renderQuestionsTable();
  } else if (tabName === 'decks') {
    renderDecks();
  } else if (tabName === 'topics') {
    renderTopicsManager();
  }
}

function renderQuestionsTable() {
  const tbody = document.getElementById('recent-questions-tbody');
  if (!tbody) return;

  const searchQuery = document.getElementById('questions-table-search')?.value.toLowerCase().trim() || "";

  let filtered = currentQuestionsList;
  if (searchQuery) {
    filtered = currentQuestionsList.filter(q => 
      (q.questionText || '').toLowerCase().includes(searchQuery) ||
      (q.subject || '').toLowerCase().includes(searchQuery) ||
      (q.topic || '').toLowerCase().includes(searchQuery) ||
      (q.subfolder || '').toLowerCase().includes(searchQuery)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500 dark:text-slate-400 font-bold">No questions match your search or database is empty. Sync from Testbook or upload PDF!</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(q => {
    let statusBadge = `<span class="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-extrabold whitespace-nowrap">Skipped / Pending</span>`;
    if (q.status === 'solved') {
      statusBadge = `<span class="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-extrabold whitespace-nowrap">Solved</span>`;
    } else if (q.status === 'needs_revision') {
      statusBadge = `<span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-xs font-extrabold whitespace-nowrap">Incorrect / Wrong</span>`;
    }

    const cleanText = cleanQuestionTextDisplay(q.questionText);
    const subText = (q.subfolder && q.subfolder.trim()) ? ` → 📄 ${escapeHtml(q.subfolder)}` : '';

    return `
      <tr class="hover:bg-slate-100 dark:hover:bg-zinc-900 transition">
        <td class="p-3.5 font-extrabold text-slate-900 dark:text-white leading-relaxed">${renderFormattedQuestionHTML(cleanText)}</td>
        <td class="p-3.5 text-xs cursor-pointer" onclick="practiceSpecificTopic('${escapeHtml(q.subject)}', '${escapeHtml(q.topic)}')">
          <div class="font-black text-amber-600 dark:text-amber-400">📁 ${escapeHtml(q.subject || 'General')}</div>
          <div class="text-indigo-600 dark:text-indigo-400 font-bold">📂 ${escapeHtml(q.topic || 'General')}${subText}</div>
        </td>
        <td class="p-3.5 text-xs space-y-1.5">
          <div>${getSourceBadgeHtml(q.source, q)}</div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">📅 Added: ${formatDateDisplay(q.createdAt)}</div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">⏱️ Attempted: ${formatDateDisplay(q.lastAttemptedAt)}</div>
        </td>
        <td class="p-3.5">${statusBadge}</td>
        <td class="p-3.5">
          <div class="flex items-center space-x-1.5">
            <button onclick="practiceSpecificTopic('${escapeHtml(q.subject)}', '${escapeHtml(q.topic)}')" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition font-bold shadow-sm" title="Attempt Question">Attempt</button>
            <button onclick="openMoveQuestionModal('${q.id}')" class="text-xs bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white px-2.5 py-1.5 rounded-lg border border-indigo-500/30 transition" title="Move Question">📦</button>
            <button onclick="openEditQuestionModal('${q.id}')" class="text-xs bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-zinc-700 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 transition" title="Edit Question">✏️</button>
            <button onclick="deleteQuestion('${q.id}')" class="text-xs bg-rose-600/20 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-rose-500/30 transition" title="Move Question to Recycle Bin">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function deleteQuestion(qId) {
  if (confirm("Move this question to the 30-Day Recycle Bin? (You can restore it anytime within 30 days)")) {
    await QB.deleteQuestion(qId);
    await loadDashboardData();
  }
}

async function clearAllQuestions() {
  if (confirm("Move ALL active questions to the 30-Day Recycle Bin? (You can restore them anytime within 30 days)")) {
    await QB.clearAllQuestions();
    await loadDashboardData();
  }
}

function loadPracticeQuestions() {
  const container = document.getElementById('quiz-card-container');
  if (!container) return;

  const subjectFilter = document.getElementById('practice-filter-subject')?.value || 'all';
  const topicFilter = document.getElementById('practice-filter-topic')?.value || 'all';
  const statusFilter = document.getElementById('practice-filter-status')?.value || 'pending';
  const sourceFilter = document.getElementById('practice-filter-source')?.value || 'all';

  filteredPracticeQuestions = [...currentQuestionsList];

  if (subjectFilter !== 'all') {
    filteredPracticeQuestions = filteredPracticeQuestions.filter(q => (q.subject || 'Mechanical Engineering') === subjectFilter);
  }
  if (topicFilter !== 'all') {
    filteredPracticeQuestions = filteredPracticeQuestions.filter(q => (q.topic || 'Fluid Mechanics') === topicFilter);
  }
  if (activeSubfolderFilter !== 'all' && activeSubfolderFilter !== '') {
    filteredPracticeQuestions = filteredPracticeQuestions.filter(q => (q.subfolder || '') === activeSubfolderFilter);
  }
  if (statusFilter === 'srs_due') {
    filteredPracticeQuestions = filteredPracticeQuestions.filter(q => QB.isSRSQuestionDue(q));
  } else if (statusFilter !== 'all') {
    filteredPracticeQuestions = filteredPracticeQuestions.filter(q => q.status === statusFilter);
  }
  if (sourceFilter !== 'all') {
    filteredPracticeQuestions = filteredPracticeQuestions.filter(q => q.source === sourceFilter);
  }

  if (filteredPracticeQuestions.length === 0) {
    container.innerHTML = `
      <div class="glass p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center space-y-3 bg-white dark:bg-zinc-950 max-w-4xl mx-auto">
        <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center mx-auto text-slate-500 text-xl">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">No Questions for Selected Hierarchy</h3>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">All questions in this folder have been completed or none match your selection.</p>
        <button onclick="activeSubfolderFilter='all'; document.getElementById('practice-filter-subject').value='all'; onSubjectDropdownChange();" class="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Reset Hierarchy Filters</button>
      </div>
    `;
    return;
  }

  if (currentPracticeIndex >= filteredPracticeQuestions.length) {
    currentPracticeIndex = Math.max(0, filteredPracticeQuestions.length - 1);
  }

  const q = filteredPracticeQuestions[currentPracticeIndex];
  const totalQs = filteredPracticeQuestions.length;

  const solvedCount = filteredPracticeQuestions.filter(item => item.status === 'solved').length;
  const revisionCount = filteredPracticeQuestions.filter(item => item.status === 'needs_revision').length;
  const pendingCount = filteredPracticeQuestions.filter(item => item.status === 'pending').length;

  const formattedQuestionContent = renderFormattedQuestionHTML(q.questionText);
  const cleanSol = cleanExplanationDisplay(q.explanation);

  const optionsHtml = q.options.map((opt, optIdx) => `
    <button onclick="attemptQuestion('${q.id}', ${optIdx}, ${q.correctAnswerIndex})" id="opt-${q.id}-${optIdx}" class="w-full text-left p-4 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white transition flex items-center space-x-3 group shadow-sm">
      <span class="w-7 h-7 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-slate-300 group-hover:bg-indigo-600 group-hover:text-white font-extrabold text-xs flex items-center justify-center border border-slate-300 dark:border-zinc-700 transition">
        ${String.fromCharCode(65 + optIdx)}
      </span>
      <span class="flex-1 font-extrabold text-slate-900 dark:text-white">${formatSubSupScripts(escapeHtml(opt))}</span>
    </button>
  `).join('');

  let statusBadge = `<span class="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-extrabold">Unattempted</span>`;
  if (q.status === 'solved') {
    statusBadge = `<span class="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-extrabold">✓ Correct / Solved</span>`;
  } else if (q.status === 'needs_revision') {
    statusBadge = `<span class="bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-xs font-extrabold">✗ Incorrect / Revision</span>`;
  }

  const paletteButtonsHtml = filteredPracticeQuestions.map((item, idx) => {
    let btnBgClass = "bg-white text-slate-900 border-slate-300 font-extrabold shadow-sm hover:bg-slate-100";
    if (item.status === 'solved') {
      btnBgClass = "bg-emerald-500 text-white border-emerald-600 font-extrabold shadow-sm";
    } else if (item.status === 'needs_revision') {
      btnBgClass = "bg-rose-500 text-white border-rose-600 font-extrabold shadow-sm";
    }

    const isActive = (idx === currentPracticeIndex);
    const activeRingClass = isActive ? "ring-4 ring-indigo-500 ring-offset-2 scale-110 font-black z-10" : "hover:scale-105";

    return `
      <button onclick="jumpToPracticeQuestion(${idx})" class="w-10 h-10 rounded-xl text-xs flex items-center justify-center border transition ${btnBgClass} ${activeRingClass}">
        ${idx + 1}
      </button>
    `;
  }).join('');

  const subheaderBadge = (q.subfolder && q.subfolder.trim()) ? ` / <span class="text-slate-900 dark:text-slate-200 font-bold">📄 ${escapeHtml(q.subfolder)}</span>` : '';

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      <div class="lg:col-span-3 glass p-6 rounded-2xl space-y-5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between min-h-[550px]">
        <div class="space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-zinc-900 -mx-6 -mt-6 p-4 rounded-t-2xl border-b border-slate-200 dark:border-zinc-800">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-black text-slate-900 dark:text-white bg-slate-200 dark:bg-black/60 px-3.5 py-1 rounded-full border border-slate-300 dark:border-zinc-800">
                Question No.${currentPracticeIndex + 1} <span class="text-slate-500 dark:text-slate-400 font-normal">of ${totalQs}</span>
              </span>
              ${statusBadge}
              ${getSRSBadgeHtml(q)}
              
              <span class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black">
                Marks 1
              </span>

              ${getSourceBadgeHtml(q.source, q)}
            </div>

            <div class="flex items-center space-x-1.5">
              <button onclick="toggleMarkForReview('${q.id}')" class="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-slate-950 px-2.5 py-1 rounded-lg border border-amber-500/30 transition font-bold" title="Bookmark / Mark for Review">
                🔖 Mark
              </button>
              <button onclick="toggleSolutionVisibility('${q.id}')" class="text-xs bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white px-2.5 py-1 rounded-lg border border-indigo-500/30 transition font-bold">
                💡 Solution
              </button>
              <button onclick="openMoveQuestionModal('${q.id}')" class="text-xs bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-zinc-700 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-zinc-700 transition font-bold" title="Move Question to another folder">
                📦 Move
              </button>
              <button onclick="openEditQuestionModal('${q.id}')" class="text-xs bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-zinc-700 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-zinc-700 transition font-bold" title="Edit Question Content">
                ✏️ Edit
              </button>
              <button onclick="deleteQuestion('${q.id}')" class="text-xs bg-rose-600/20 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white px-2 py-1 rounded-lg border border-rose-500/30 transition font-bold" title="Move Question to 30-Day Recycle Bin">
                🗑️
              </button>
            </div>
          </div>

          <div class="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center space-x-2">
            <span>Folder:</span>
            <span class="text-amber-600 dark:text-amber-400 font-black">📁 ${escapeHtml(q.subject || 'General')}</span>
            <span>/</span>
            <span class="text-indigo-600 dark:text-indigo-400 font-black">📂 ${escapeHtml(q.topic || 'General')}</span>
            ${subheaderBadge}
          </div>

          <div class="text-base font-black leading-relaxed bg-slate-100 dark:bg-black p-5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white shadow-sm">${formattedQuestionContent}</div>

          <div class="space-y-2.5" id="options-container-${q.id}">
            ${optionsHtml}
          </div>

          <div id="explanation-box-${q.id}" class="hidden p-5 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-indigo-500/40 space-y-3 shadow-xl transition-all duration-300">
            <div class="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
              <i class="fa-solid fa-lightbulb text-amber-500"></i>
              <span>Testbook Detailed Solution & Concept Note</span>
            </div>
            <div class="text-xs text-slate-900 dark:text-white font-bold leading-relaxed font-mono whitespace-pre-wrap bg-white dark:bg-black p-4 rounded-xl border border-slate-200 dark:border-zinc-800">${cleanSol}</div>

            <div class="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Update status:</span>
              <div class="flex space-x-2">
                <button onclick="updateQuestionStatus('${q.id}', 'solved')" class="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg font-extrabold transition flex items-center space-x-1">
                  <i class="fa-solid fa-check"></i> <span>Solved / Mastered</span>
                </button>
                <button onclick="updateQuestionStatus('${q.id}', 'needs_revision')" class="text-xs bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-lg font-extrabold transition flex items-center space-x-1">
                  <i class="fa-solid fa-rotate-right"></i> <span>Needs Revision</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between mt-6">
          <button onclick="prevPracticeQuestion()" ${currentPracticeIndex === 0 ? 'disabled' : ''} class="px-5 py-2.5 rounded-xl text-xs font-black transition flex items-center space-x-2 ${currentPracticeIndex === 0 ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed border border-slate-300 dark:border-zinc-800' : 'bg-slate-200 dark:bg-zinc-800 hover:bg-indigo-600 hover:text-white text-slate-900 dark:text-white border border-slate-300 dark:border-zinc-700 shadow-sm'}">
            <i class="fa-solid fa-arrow-left"></i>
            <span>Previous</span>
          </button>

          <div class="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:block">
            📅 Added: ${formatDateDisplay(q.createdAt)}
          </div>

          <button onclick="nextPracticeQuestion()" ${currentPracticeIndex === totalQs - 1 ? 'disabled' : ''} class="px-6 py-2.5 rounded-xl text-xs font-black transition flex items-center space-x-2 ${currentPracticeIndex === totalQs - 1 ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed border border-slate-300 dark:border-zinc-800' : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 shadow-lg shadow-indigo-600/30'}">
            <span>Next</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>

      <div class="lg:col-span-1 glass p-5 rounded-2xl space-y-4 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
        <div class="border-b border-slate-200 dark:border-zinc-800 pb-3 space-y-2">
          <h3 class="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
            <span>SECTION : TEST</span>
            <i class="fa-solid fa-grip text-indigo-500"></i>
          </h3>

          <div class="grid grid-cols-3 gap-1.5 text-center text-[10px] font-extrabold pt-1">
            <div class="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg border border-emerald-500/30">
              <div class="text-sm font-black">${solvedCount}</div>
              <div>Correct</div>
            </div>
            <div class="bg-rose-500/20 text-rose-600 dark:text-rose-400 p-1.5 rounded-lg border border-rose-500/30">
              <div class="text-sm font-black">${revisionCount}</div>
              <div>Incorrect</div>
            </div>
            <div class="bg-white text-slate-900 border border-slate-300 p-1.5 rounded-lg shadow-sm">
              <div class="text-sm font-black text-black">${pendingCount}</div>
              <div class="text-slate-700">Unattempted</div>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-extrabold text-slate-600 dark:text-slate-400 mb-2">Question Palette (${totalQs})</label>
          <div class="grid grid-cols-5 gap-2 max-h-80 overflow-y-auto pr-1">
            ${paletteButtonsHtml}
          </div>
        </div>

        <div class="text-[11px] font-bold text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-1.5">
          <div class="flex items-center space-x-1.5"><span class="w-3 h-3 rounded-md bg-white border border-slate-300 inline-block shadow-sm"></span> <span>White = Unattempted / Pending</span></div>
          <div class="flex items-center space-x-1.5"><span class="w-3 h-3 rounded-md bg-emerald-500 inline-block"></span> <span>Green = Correct / Solved</span></div>
          <div class="flex items-center space-x-1.5"><span class="w-3 h-3 rounded-md bg-rose-500 inline-block"></span> <span>Red = Incorrect / Revision</span></div>
        </div>
      </div>

    </div>
  `;
}

function jumpToPracticeQuestion(idx) {
  if (idx >= 0 && idx < filteredPracticeQuestions.length) {
    currentPracticeIndex = idx;
    loadPracticeQuestions();
  }
}

function nextPracticeQuestion() {
  if (currentPracticeIndex < filteredPracticeQuestions.length - 1) {
    currentPracticeIndex++;
    loadPracticeQuestions();
  }
}

function prevPracticeQuestion() {
  if (currentPracticeIndex > 0) {
    currentPracticeIndex--;
    loadPracticeQuestions();
  }
}

function toggleSolutionVisibility(qId) {
  const explanationBox = document.getElementById(`explanation-box-${qId}`);
  if (explanationBox) {
    explanationBox.classList.toggle('hidden');
  }
}

async function toggleMarkForReview(qId) {
  const q = currentQuestionsList.find(item => item.id === qId);
  if (!q) return;

  const newStatus = q.status === 'needs_revision' ? 'pending' : 'needs_revision';
  await QB.updateQuestionStatus(qId, newStatus);

  if (newStatus === 'needs_revision') {
    alert("Question marked for Review / Revision! 🔖");
  } else {
    alert("Question unmarked from Review.");
  }

  await loadDashboardData();
  if (practiceViewMode === 'cards') loadPracticeQuestions();
  else if (practiceViewMode === 'vertical') renderVerticalQuestions();
  else renderQuestionsTable();
}

async function attemptQuestion(qId, selectedIdx, correctIdx) {
  const optionsBox = document.getElementById(`options-container-${qId}`);
  const explanationBox = document.getElementById(`explanation-box-${qId}`);
  if (!optionsBox) return;

  const buttons = optionsBox.querySelectorAll('button');
  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === correctIdx) {
      btn.className = "w-full text-left p-4 bg-emerald-100 dark:bg-emerald-950/90 border-2 border-emerald-500 rounded-xl text-sm font-extrabold text-emerald-950 dark:text-emerald-200 flex items-center justify-between shadow-lg shadow-emerald-500/20";
      btn.innerHTML += `<span class="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-xs">✓ Correct Answer</span>`;
    } else if (idx === selectedIdx && selectedIdx !== correctIdx) {
      btn.className = "w-full text-left p-4 bg-rose-100 dark:bg-rose-950/90 border-2 border-rose-500 rounded-xl text-sm font-extrabold text-rose-950 dark:text-rose-200 flex items-center justify-between shadow-lg shadow-rose-500/20";
      btn.innerHTML += `<span class="bg-rose-600 text-white font-bold px-2 py-0.5 rounded text-xs">✗ Your Selection</span>`;
    }
  });

  if (explanationBox) {
    explanationBox.classList.remove('hidden');
  }

  const isCorrect = (selectedIdx === correctIdx);
  const newStatus = isCorrect ? 'solved' : 'needs_revision';
  await QB.updateQuestionStatus(qId, newStatus, selectedIdx);

  const currentQ = filteredPracticeQuestions.find(item => item.id === qId);
  if (currentQ) currentQ.status = newStatus;

  updateStatsNumbersOnly();
}

async function updateStatsNumbersOnly() {
  currentQuestionsList = await QB.fetchQuestions(false);
  const total = currentQuestionsList.length;
  const pending = currentQuestionsList.filter(q => q.status === 'pending').length;
  const solved = currentQuestionsList.filter(q => q.status === 'solved').length;
  const revision = currentQuestionsList.filter(q => q.status === 'needs_revision').length;

  const reports = QB.getDailyReports();
  const totalUserAttempts = reports.reduce((acc, r) => acc + (r.attemptedCount || 0), 0);
  const attemptedCount = Math.max(solved + revision, totalUserAttempts);
  const accuracyPct = attemptedCount > 0 ? Math.round((solved / attemptedCount) * 100) : 0;

  const dangerZoneCount = currentQuestionsList.filter(q => (q.wrongAttemptsCount || 0) >= 2 || q.status === 'needs_revision').length;

  if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
  if (document.getElementById('stat-attempted-total')) document.getElementById('stat-attempted-total').innerText = attemptedCount;
  if (document.getElementById('stat-solved')) document.getElementById('stat-solved').innerText = solved;
  if (document.getElementById('stat-revision')) document.getElementById('stat-revision').innerText = revision;
  if (document.getElementById('stat-accuracy')) document.getElementById('stat-accuracy').innerText = `${accuracyPct}%`;
  if (document.getElementById('stat-attempted-sub')) document.getElementById('stat-attempted-sub').innerText = `${attemptedCount} Attempted`;
  if (document.getElementById('stat-danger-count')) document.getElementById('stat-danger-count').innerText = dangerZoneCount;

  const today = new Date().toISOString().split('T')[0];
  const todayReport = reports.find(r => r.date === today) || { attemptedCount: 0, correctCount: 0, wrongCount: 0 };

  if (document.getElementById('today-attempted')) document.getElementById('today-attempted').innerText = todayReport.attemptedCount;
  if (document.getElementById('today-correct')) document.getElementById('today-correct').innerText = todayReport.correctCount;
  if (document.getElementById('today-wrong')) document.getElementById('today-wrong').innerText = todayReport.wrongCount;

  initDailyChart();
  checkRevisionAlerts();
}

async function updateQuestionStatus(qId, status) {
  await QB.updateQuestionStatus(qId, status);
  await loadDashboardData();

  if (practiceViewMode === 'cards') loadPracticeQuestions();
  else if (practiceViewMode === 'vertical') renderVerticalQuestions();
  else renderQuestionsTable();
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
    const customSubject = document.getElementById('pdf-subject-input')?.value.trim() || "Mechanical Engineering";
    const customTopic = document.getElementById('pdf-topic-input')?.value.trim() || "Fluid Mechanics";
    const customSubfolder = document.getElementById('pdf-subfolder-input')?.value.trim() || "";

    parsedPdfQuestions = QB.parseTextToMCQs(fullText, "pdf");
    parsedPdfQuestions.forEach(q => {
      q.subject = customSubject;
      q.topic = customTopic;
      q.subfolder = customSubfolder;
    });
    renderParsedPreview();
  } catch (err) {
    console.error("PDF Parsing error:", err);
    statusEl.innerText = "Error extracting PDF text: " + err.message;
  }
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file) {
    processImageOCR(file);
  }
}

async function processImageOCR(fileOrBlob) {
  const statusEl = document.getElementById('image-ocr-status');
  const previewImg = document.getElementById('image-preview-thumb');

  if (statusEl) statusEl.innerHTML = `<span class="text-indigo-600 dark:text-indigo-400 font-bold">📷 Reading Image File...</span>`;

  if (previewImg && fileOrBlob) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewImg.classList.remove('hidden');
    };
    reader.readAsDataURL(fileOrBlob);
  }

  if (typeof Tesseract === 'undefined') {
    if (statusEl) statusEl.innerHTML = `<span class="text-rose-500 font-bold">⚠️ Tesseract OCR library loading... Please wait 2 seconds and try again.</span>`;
    return;
  }

  try {
    if (statusEl) statusEl.innerHTML = `<span class="text-indigo-600 dark:text-indigo-400 font-bold"><i class="fa-solid fa-spinner animate-spin"></i> Processing OCR... Extracting question text from image</span>`;

    const result = await Tesseract.recognize(fileOrBlob, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text' && statusEl) {
          const pct = Math.round((m.progress || 0) * 100);
          statusEl.innerHTML = `<span class="text-indigo-600 dark:text-indigo-400 font-bold"><i class="fa-solid fa-spinner animate-spin"></i> Scanning Image OCR: ${pct}%</span>`;
        }
      }
    });

    const ocrText = result.data.text || "";
    if (!ocrText.trim()) {
      if (statusEl) statusEl.innerHTML = `<span class="text-rose-500 font-bold">⚠️ No readable text found in image. Please try a clearer screenshot.</span>`;
      return;
    }

    if (statusEl) statusEl.innerHTML = `<span class="text-emerald-500 font-bold">✅ Image Text Extracted Successfully! Parsing MCQs...</span>`;

    const customSubject = document.getElementById('pdf-subject-input')?.value.trim() || "Mechanical Engineering";
    const customTopic = document.getElementById('pdf-topic-input')?.value.trim() || "Fluid Mechanics";
    const customSubfolder = document.getElementById('pdf-subfolder-input')?.value.trim() || "";

    const newParsed = QB.parseTextToMCQs(ocrText, "ocr");
    newParsed.forEach(q => {
      q.subject = customSubject;
      q.topic = customTopic;
      q.subfolder = customSubfolder;
    });

    parsedPdfQuestions = [...parsedPdfQuestions, ...newParsed];
    renderParsedPreview();
  } catch (err) {
    console.error("OCR Processing error:", err);
    if (statusEl) statusEl.innerHTML = `<span class="text-rose-500 font-bold">⚠️ Error reading image text: ${escapeHtml(err.message)}</span>`;
  }
}

function parseRawText() {
  const rawText = document.getElementById('raw-text-input')?.value || '';
  if (!rawText.trim()) return;

  const customSubject = document.getElementById('pdf-subject-input')?.value.trim() || "Mechanical Engineering";
  const customTopic = document.getElementById('pdf-topic-input')?.value.trim() || "Fluid Mechanics";
  const customSubfolder = document.getElementById('pdf-subfolder-input')?.value.trim() || "";

  parsedPdfQuestions = QB.parseTextToMCQs(rawText, "manual");
  parsedPdfQuestions.forEach(q => {
    q.subject = customSubject;
    q.topic = customTopic;
    q.subfolder = customSubfolder;
  });
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
    <div class="bg-slate-100 dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2">
      <div class="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-bold">
        <span>Question ${idx + 1} • Folder: [${escapeHtml(q.subject)} → ${escapeHtml(q.topic)}${q.subfolder ? ' → ' + escapeHtml(q.subfolder) : ''}]</span>
        <span>Correct Answer: Option ${String.fromCharCode(65 + q.correctAnswerIndex)}</span>
      </div>
      <p class="text-sm font-extrabold text-slate-900 dark:text-white">${renderFormattedQuestionHTML(q.questionText)}</p>
      <div class="grid grid-cols-2 gap-2 text-xs text-slate-900 dark:text-slate-300 font-bold pt-1">
        ${q.options.map((opt, oIdx) => `<div class="bg-white dark:bg-black p-2 rounded-lg border border-slate-200 dark:border-zinc-800">${String.fromCharCode(65 + oIdx)}) ${formatSubSupScripts(escapeHtml(opt))}</div>`).join('')}
      </div>
      <p class="text-xs text-slate-600 dark:text-slate-400 italic pt-1">Solution: ${formatSubSupScripts(escapeHtml(q.explanation))}</p>
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

  const subjFilter = document.getElementById('deck-filter-subject')?.value || 'all';
  const topicFilter = document.getElementById('deck-filter-topic')?.value || 'all';
  const searchQuery = document.getElementById('deck-search-input')?.value.toLowerCase().trim() || "";

  let decks = QB.getDecks();

  if (subjFilter !== 'all') {
    decks = decks.filter(d => (d.subject || 'Mechanical Engineering') === subjFilter);
  }
  if (topicFilter !== 'all') {
    decks = decks.filter(d => (d.topic || 'Fluid Mechanics') === topicFilter);
  }
  if (searchQuery) {
    decks = decks.filter(d => 
      (d.title || '').toLowerCase().includes(searchQuery) ||
      (d.subject || '').toLowerCase().includes(searchQuery) ||
      (d.topic || '').toLowerCase().includes(searchQuery)
    );
  }

  if (decks.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full glass p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center space-y-3 bg-white dark:bg-zinc-950">
        <i class="fa-solid fa-layer-group text-4xl text-violet-500"></i>
        <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">No Study Decks Found</h3>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Click "Create Deck from Notes" above to add flashcards for this topic!</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = decks.map(d => `
    <div class="glass p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-4 flex flex-col justify-between bg-white dark:bg-zinc-900 shadow-sm hover:border-violet-500/50 transition">
      <div>
        <div class="flex items-center justify-between text-xs font-bold mb-2">
          <span class="text-amber-600 dark:text-amber-400">📁 ${escapeHtml(d.subject || 'General')}</span>
          <span class="bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 font-mono text-[10px] px-2 py-0.5 rounded-full border border-violet-300 dark:border-violet-800/40">${d.cards ? d.cards.length : 0} Cards</span>
        </div>
        <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">📂 ${escapeHtml(d.topic || 'General Topic')}</div>
        <h3 class="font-black text-base text-slate-900 dark:text-white leading-tight">${escapeHtml(d.title)}</h3>
      </div>

      <div class="card-flip cursor-pointer h-36 my-1" onclick="flipDeckCard(this)">
        <div class="card-inner w-full h-full relative rounded-xl border border-violet-500/30 bg-violet-50 dark:bg-violet-950/20 p-4 flex items-center justify-center text-center">
          <div class="card-front text-sm font-extrabold text-slate-900 dark:text-slate-200">
            ${formatSubSupScripts(escapeHtml(d.cards && d.cards[0] ? d.cards[0].front : 'Empty Flashcard'))}
            <div class="text-xs text-violet-600 dark:text-violet-400 font-semibold mt-2">Click to flip answer</div>
          </div>
          <div class="card-back absolute inset-0 rounded-xl bg-white dark:bg-zinc-900 p-4 flex items-center justify-center text-xs text-slate-900 dark:text-slate-300 font-bold leading-relaxed overflow-y-auto border border-slate-200 dark:border-zinc-800">
            ${formatSubSupScripts(escapeHtml(d.cards && d.cards[0] ? d.cards[0].back : 'No Answer'))}
          </div>
        </div>
      </div>

      <div class="space-y-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
        <div class="grid grid-cols-2 gap-2">
          <button onclick="openEditDeckModal('${d.id}')" class="py-1.5 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-900 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-300 dark:border-zinc-700 transition flex items-center justify-center space-x-1">
            <i class="fa-solid fa-pen-to-square"></i>
            <span>Edit</span>
          </button>
          <button onclick="deleteDeck('${d.id}')" class="py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white rounded-xl text-xs font-bold border border-rose-500/30 transition flex items-center justify-center space-x-1">
            <i class="fa-solid fa-trash-can"></i>
            <span>Delete</span>
          </button>
        </div>

        <button onclick="alert('Deck Review mode initiated for: ${escapeHtml(d.title)}')" class="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-extrabold transition shadow-sm">
          Review Full Deck (${d.cards ? d.cards.length : 0})
        </button>
      </div>
    </div>
  `).join('');
}

function flipDeckCard(el) {
  const inner = el.querySelector('.card-inner');
  if (inner) inner.classList.toggle('flipped');
}

function openCreateDeckModal() {
  const subjSelect = document.getElementById('create-deck-subject');
  const customSubj = document.getElementById('create-deck-subject-custom');
  if (!subjSelect) return;

  const subjects = Array.from(new Set(currentQuestionsList.map(q => q.subject || 'Mechanical Engineering')));

  subjSelect.innerHTML = subjects.map(s => `<option value="${escapeHtml(s)}">📁 ${escapeHtml(s)}</option>`).join('') +
    `<option value="__NEW_SUBJECT__">➕ Create New Subject...</option>`;

  if (subjects.length > 0) {
    subjSelect.value = subjects[0];
    customSubj.classList.add('hidden');
  } else {
    subjSelect.value = "__NEW_SUBJECT__";
    customSubj.classList.remove('hidden');
  }

  onCreateDeckSubjectChange();

  document.getElementById('create-deck-title').value = "";
  document.getElementById('create-deck-front').value = "";
  document.getElementById('create-deck-back').value = "";

  document.getElementById('modal-create-deck').classList.remove('hidden');
}

function onCreateDeckSubjectChange() {
  const subjSelect = document.getElementById('create-deck-subject');
  const customSubj = document.getElementById('create-deck-subject-custom');
  const topicSelect = document.getElementById('create-deck-topic');
  if (!subjSelect || !topicSelect) return;

  const selectedSubj = subjSelect.value;

  if (selectedSubj === '__NEW_SUBJECT__') {
    customSubj.classList.remove('hidden');
    topicSelect.innerHTML = `<option value="__NEW_TOPIC__">➕ Create New Topic...</option>`;
    onCreateDeckTopicChange();
    return;
  } else {
    customSubj.classList.add('hidden');
  }

  const matchingQuestions = currentQuestionsList.filter(item => (item.subject || 'Mechanical Engineering') === selectedSubj);
  const topics = Array.from(new Set(matchingQuestions.map(item => item.topic || 'Fluid Mechanics')));

  topicSelect.innerHTML = topics.map(t => `<option value="${escapeHtml(t)}">📂 ${escapeHtml(t)}</option>`).join('') +
    `<option value="__NEW_TOPIC__">➕ Create New Topic...</option>`;

  if (topics.length > 0) topicSelect.value = topics[0];
  else topicSelect.value = "__NEW_TOPIC__";

  onCreateDeckTopicChange();
}

function onCreateDeckTopicChange() {
  const topicSelect = document.getElementById('create-deck-topic');
  const customTopic = document.getElementById('create-deck-topic-custom');
  if (!topicSelect) return;

  if (topicSelect.value === '__NEW_TOPIC__') {
    customTopic.classList.remove('hidden');
  } else {
    customTopic.classList.add('hidden');
  }
}

function closeCreateDeckModal() {
  document.getElementById('modal-create-deck').classList.add('hidden');
}

function saveCreateDeckModal() {
  const subjSelect = document.getElementById('create-deck-subject');
  const customSubj = document.getElementById('create-deck-subject-custom');
  const topicSelect = document.getElementById('create-deck-topic');
  const customTopic = document.getElementById('create-deck-topic-custom');
  const title = document.getElementById('create-deck-title').value.trim();
  const front = document.getElementById('create-deck-front').value.trim();
  const back = document.getElementById('create-deck-back').value.trim();

  let finalSubj = subjSelect.value === '__NEW_SUBJECT__' ? customSubj.value.trim() : subjSelect.value;
  let finalTopic = topicSelect.value === '__NEW_TOPIC__' ? customTopic.value.trim() : topicSelect.value;

  if (!title || !front || !back) {
    alert("Please fill in Title, Flashcard Front, and Flashcard Back.");
    return;
  }

  const newDeck = {
    id: "deck_" + Date.now(),
    title: title,
    subject: finalSubj || "General Subject",
    topic: finalTopic || "General Topic",
    createdAt: new Date().toISOString(),
    cards: [{ front, back }]
  };

  QB.saveDeck(newDeck);
  closeCreateDeckModal();
  updateDeckDropdowns();
  renderDecks();
}

function openEditDeckModal(deckId) {
  const decks = QB.getDecks();
  const d = decks.find(item => item.id === deckId);
  if (!d) return;

  document.getElementById('edit-deck-id').value = d.id;
  document.getElementById('edit-deck-title').value = d.title || "";
  document.getElementById('edit-deck-front').value = d.cards && d.cards[0] ? d.cards[0].front : "";
  document.getElementById('edit-deck-back').value = d.cards && d.cards[0] ? d.cards[0].back : "";

  const subjSelect = document.getElementById('edit-deck-subject');
  const subjects = Array.from(new Set(currentQuestionsList.map(q => q.subject || 'Mechanical Engineering')));

  subjSelect.innerHTML = subjects.map(s => `<option value="${escapeHtml(s)}">📁 ${escapeHtml(s)}</option>`).join('') +
    `<option value="__NEW_SUBJECT__">➕ Create New Subject...</option>`;

  const currentSubj = d.subject || "Mechanical Engineering";
  if (subjects.includes(currentSubj)) subjSelect.value = currentSubj;
  else subjSelect.value = "__NEW_SUBJECT__";

  onEditDeckSubjectChange(d.topic);

  document.getElementById('modal-edit-deck').classList.remove('hidden');
}

function onEditDeckSubjectChange(targetTopic = null) {
  const subjSelect = document.getElementById('edit-deck-subject');
  const customSubj = document.getElementById('edit-deck-subject-custom');
  const topicSelect = document.getElementById('edit-deck-topic');
  if (!subjSelect || !topicSelect) return;

  const selectedSubj = subjSelect.value;

  if (selectedSubj === '__NEW_SUBJECT__') {
    customSubj.classList.remove('hidden');
    topicSelect.innerHTML = `<option value="__NEW_TOPIC__">➕ Create New Topic...</option>`;
    onEditDeckTopicChange();
    return;
  } else {
    customSubj.classList.add('hidden');
  }

  const matchingQuestions = currentQuestionsList.filter(item => (item.subject || 'Mechanical Engineering') === selectedSubj);
  const topics = Array.from(new Set(matchingQuestions.map(item => item.topic || 'Fluid Mechanics')));

  topicSelect.innerHTML = topics.map(t => `<option value="${escapeHtml(t)}">📂 ${escapeHtml(t)}</option>`).join('') +
    `<option value="__NEW_TOPIC__">➕ Create New Topic...</option>`;

  if (targetTopic && topics.includes(targetTopic)) {
    topicSelect.value = targetTopic;
  } else if (topics.length > 0) {
    topicSelect.value = topics[0];
  } else {
    topicSelect.value = "__NEW_TOPIC__";
  }

  onEditDeckTopicChange();
}

function onEditDeckTopicChange() {
  const topicSelect = document.getElementById('edit-deck-topic');
  const customTopic = document.getElementById('edit-deck-topic-custom');
  if (!topicSelect) return;

  if (topicSelect.value === '__NEW_TOPIC__') {
    customTopic.classList.remove('hidden');
  } else {
    customTopic.classList.add('hidden');
  }
}

function closeEditDeckModal() {
  document.getElementById('modal-edit-deck').classList.add('hidden');
}

function saveEditDeckModal() {
  const dId = document.getElementById('edit-deck-id').value;
  const subjSelect = document.getElementById('edit-deck-subject');
  const customSubj = document.getElementById('edit-deck-subject-custom');
  const topicSelect = document.getElementById('edit-deck-topic');
  const customTopic = document.getElementById('edit-deck-topic-custom');
  const title = document.getElementById('edit-deck-title').value.trim();
  const front = document.getElementById('edit-deck-front').value.trim();
  const back = document.getElementById('edit-deck-back').value.trim();

  let finalSubj = subjSelect.value === '__NEW_SUBJECT__' ? customSubj.value.trim() : subjSelect.value;
  let finalTopic = topicSelect.value === '__NEW_TOPIC__' ? customTopic.value.trim() : topicSelect.value;

  const decks = QB.getDecks();
  const d = decks.find(item => item.id === dId);
  if (d) {
    d.title = title || d.title;
    d.subject = finalSubj || d.subject;
    d.topic = finalTopic || d.topic;
    d.cards = [{ front, back }];
    QB.saveDeck(d);
  }

  closeEditDeckModal();
  updateDeckDropdowns();
  renderDecks();
}

function deleteDeck(deckId) {
  if (confirm("Permanently erase this Study Deck and its flashcards?")) {
    QB.deleteDeck(deckId);
    updateDeckDropdowns();
    renderDecks();
  }
}

let subjectChartInstance = null;
let donutChartInstance = null;

function initDailyChart() {
  initSubjectBreakdownChart();
  initOverallDonutChart();
}

function initSubjectBreakdownChart() {
  const ctx = document.getElementById('subjectBreakdownChart')?.getContext('2d');
  if (!ctx) return;

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

  const subjectsMap = {};
  currentQuestionsList.forEach(q => {
    const sName = q.subject || "Mechanical Engineering";
    if (!subjectsMap[sName]) {
      subjectsMap[sName] = { solved: 0, revision: 0, pending: 0 };
    }
    if (q.status === 'solved') subjectsMap[sName].solved++;
    else if (q.status === 'needs_revision') subjectsMap[sName].revision++;
    else subjectsMap[sName].pending++;
  });

  const labels = Object.keys(subjectsMap);
  const solvedData = labels.map(s => subjectsMap[s].solved);
  const revisionData = labels.map(s => subjectsMap[s].revision);
  const pendingData = labels.map(s => subjectsMap[s].pending);

  if (subjectChartInstance) subjectChartInstance.destroy();

  subjectChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['No Subjects'],
      datasets: [
        {
          label: '✓ Solved (Mastered)',
          data: solvedData.length ? solvedData : [0],
          backgroundColor: '#10b981',
          borderRadius: 6
        },
        {
          label: '✗ Needs Revision',
          data: revisionData.length ? revisionData : [0],
          backgroundColor: '#f43f5e',
          borderRadius: 6
        },
        {
          label: '⏰ Pending / Unattempted',
          data: pendingData.length ? pendingData : [0],
          backgroundColor: '#f59e0b',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor, font: { weight: 'bold', size: 11 } } }
      },
      scales: {
        x: { ticks: { color: textColor, font: { weight: 'bold' } }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, font: { weight: 'bold' }, stepSize: 1 }, grid: { color: gridColor }, beginAtZero: true }
      }
    }
  });

  let strongestSubj = "N/A";
  let highestRatio = -1;
  let weakestSubj = "N/A";
  let highestRevision = -1;

  labels.forEach(sName => {
    const s = subjectsMap[sName];
    const total = s.solved + s.revision + s.pending;
    const ratio = total > 0 ? (s.solved / total) : 0;
    if (ratio > highestRatio && s.solved > 0) {
      highestRatio = ratio;
      strongestSubj = `${sName} (${Math.round(ratio * 100)}%)`;
    }
    if (s.revision > highestRevision) {
      highestRevision = s.revision;
      weakestSubj = `${sName} (${s.revision} Rev)`;
    }
  });

  if (document.getElementById('insight-strongest-subject')) {
    document.getElementById('insight-strongest-subject').innerText = strongestSubj !== "N/A" ? strongestSubj : "None Solved";
  }
  if (document.getElementById('insight-weakest-subject')) {
    document.getElementById('insight-weakest-subject').innerText = weakestSubj !== "N/A" ? weakestSubj : "None Due";
  }
}

function initOverallDonutChart() {
  const ctx = document.getElementById('overallDonutChart')?.getContext('2d');
  if (!ctx) return;

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#ffffff' : '#0f172a';

  const solved = currentQuestionsList.filter(q => q.status === 'solved').length;
  const revision = currentQuestionsList.filter(q => q.status === 'needs_revision').length;
  const pending = currentQuestionsList.filter(q => q.status === 'pending').length;

  if (donutChartInstance) donutChartInstance.destroy();

  donutChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Solved', 'Revision', 'Pending'],
      datasets: [{
        data: [solved, revision, pending],
        backgroundColor: ['#10b981', '#f43f5e', '#f59e0b'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor, font: { weight: 'bold', size: 10 } }
        }
      },
      cutout: '70%'
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
  alert("Firebase Configurations Saved!");
  loadDashboardData();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, match => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[match];
  });
}
