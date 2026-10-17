/* =============================================
   MATHSPEED – APP.JS
   ============================================= */

// ── SVG Gradient defs (injected once) ──────────
document.body.insertAdjacentHTML("afterbegin", `
<svg width="0" height="0" style="position:absolute">
  <defs>
    <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
  </defs>
</svg>`);

// ── State ───────────────────────────────────────
const state = {
  selectedTime: 60,
  difficulty: "easy",
  ops: ["add", "sub", "mul"],
  questions: [],
  answers: [],
  current: 0,
  correct: 0,
  timerInterval: null,
  timeLeft: 60,
  startTime: 0,
};

const TOTAL_Q = 20;

// ── DOM refs ────────────────────────────────────
const screens   = { start: id("screen-start"), game: id("screen-game"), result: id("screen-result") };
const timerDisp = id("timer-display");
const ringFill  = id("ring-fill");
const hudProg   = id("hud-progress");
const hudCorrect= id("hud-correct");
const qNum      = id("question-num");
const qText     = id("question-text");
const qCard     = id("question-card");
const feedIcon  = id("feedback-icon");
const progBar   = id("progress-bar");
const ansInput  = id("answer-input");
const miniHist  = id("mini-history");

function id(x) { return document.getElementById(x); }

// ── Screen Navigation ───────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// ── Config Buttons ──────────────────────────────
document.querySelectorAll(".time-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".time-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.selectedTime = +btn.dataset.time;
  });
});

document.querySelectorAll(".diff-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.difficulty = btn.dataset.diff;
  });
});

// ── Question Generator ──────────────────────────
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function getRanges(difficulty) {
  switch (difficulty) {
    case "easy":   return { add: [1,20],  sub: [1,20],  mul: [1,10], div: [1,10] };
    case "medium": return { add: [10,99], sub: [10,99], mul: [2,15], div: [2,12] };
    case "hard":   return { add: [50,999],sub: [50,999],mul: [7,25], div: [2,20] };
    default:       return { add: [1,20],  sub: [1,20],  mul: [1,10], div: [1,10] };
  }
}

function generateQuestion(ops, difficulty) {
  const ranges = getRanges(difficulty);
  const op = ops[randInt(0, ops.length - 1)];
  let a, b, answer, label;

  switch (op) {
    case "add":
      a = randInt(...ranges.add); b = randInt(...ranges.add);
      answer = a + b; label = `${a} + ${b} = ?`; break;
    case "sub":
      a = randInt(...ranges.sub); b = randInt(...ranges.sub);
      if (b > a) [a, b] = [b, a];
      answer = a - b; label = `${a} - ${b} = ?`; break;
    case "mul":
      a = randInt(...ranges.mul); b = randInt(...ranges.mul);
      answer = a * b; label = `${a} x ${b} = ?`; break;
    case "div":
      b = randInt(...ranges.div);
      answer = randInt(1, ranges.div[1]);
      a = b * answer;
      label = `${a} / ${b} = ?`; break;
  }
  return { label, answer };
}

function generateAllQuestions() {
  const ops = [];
  if (id("op-add").checked) ops.push("add");
  if (id("op-sub").checked) ops.push("sub");
  if (id("op-mul").checked) ops.push("mul");
  if (id("op-div").checked) ops.push("div");
  if (ops.length === 0) ops.push("add");

  state.ops = ops;
  state.questions = [];
  for (let i = 0; i < TOTAL_Q; i++) {
    state.questions.push(generateQuestion(ops, state.difficulty));
  }
}

// ── Start Game ──────────────────────────────────
id("btn-start").addEventListener("click", startGame);

function startGame() {
  generateAllQuestions();
  state.current = 0;
  state.correct = 0;
  state.answers = [];
  state.timeLeft = state.selectedTime;
  state.startTime = Date.now();

  miniHist.innerHTML = "";
  hudCorrect.textContent = "0";
  ansInput.value = "";

  showQuestion(0);
  updateTimer(state.timeLeft, state.selectedTime);
  updateProgressBar(0);

  showScreen("game");
  setTimeout(() => ansInput.focus(), 400);

  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(tickTimer, 1000);
}

// ── Timer ───────────────────────────────────────
function tickTimer() {
  state.timeLeft--;
  updateTimer(state.timeLeft, state.selectedTime);

  if (state.timeLeft <= 10) {
    timerDisp.classList.add("timer-urgent");
    ringFill.classList.add("urgent");
  }

  if (state.timeLeft <= 0) {
    clearInterval(state.timerInterval);
    endGame("timeout");
  }
}

function updateTimer(left, total) {
  timerDisp.textContent = left;
  const circ = 263.8937;
  const offset = circ - (left / total) * circ;
  ringFill.style.strokeDashoffset = Math.max(0, offset);
}

// ── Show Question ───────────────────────────────
function showQuestion(index) {
  const q = state.questions[index];
  qNum.textContent  = `Pregunta ${index + 1} de ${TOTAL_Q}`;
  qText.textContent = q.label;
  hudProg.textContent = `${index + 1} / ${TOTAL_Q}`;
  qCard.className = "question-card glass";
  feedIcon.textContent = "";
  ansInput.value = "";
  updateProgressBar(index);
  setTimeout(() => ansInput.focus(), 50);
}

function updateProgressBar(index) {
  progBar.style.width = `${((index) / TOTAL_Q) * 100}%`;
}

// ── Submit Answer ───────────────────────────────
function submitAnswer() {
  const raw = ansInput.value.trim();
  if (raw === "") return;

  const userAnswer = parseInt(raw, 10);
  const q = state.questions[state.current];
  const isCorrect = userAnswer === q.answer;

  // Record
  state.answers.push({
    question: q.label,
    correct: q.answer,
    user: userAnswer,
    isCorrect,
  });

  if (isCorrect) {
    state.correct++;
    hudCorrect.textContent = state.correct;
    qCard.classList.add("correct");
    feedIcon.textContent = "✅";
  } else {
    qCard.classList.add("wrong");
    feedIcon.textContent = "❌";
    qCard.classList.remove("shake");
    void qCard.offsetWidth;
    qCard.classList.add("shake");
  }

  addMiniDot(isCorrect, state.current + 1);

  state.current++;
  if (state.current >= TOTAL_Q) {
    setTimeout(() => endGame("complete"), 400);
  } else {
    setTimeout(() => showQuestion(state.current), 350);
  }
}

id("btn-submit").addEventListener("click", submitAnswer);
ansInput.addEventListener("keydown", e => { if (e.key === "Enter") submitAnswer(); });

// ── Mini History Dot ────────────────────────────
function addMiniDot(isCorrect, num) {
  const dot = document.createElement("div");
  dot.className = `mini-dot ${isCorrect ? "c" : "w"}`;
  dot.textContent = num;
  miniHist.appendChild(dot);
}

// ── End Game ────────────────────────────────────
function endGame(reason) {
  clearInterval(state.timerInterval);

  // If time ran out, mark remaining as skipped
  while (state.answers.length < TOTAL_Q) {
    const q = state.questions[state.answers.length];
    state.answers.push({ question: q.label, correct: q.answer, user: null, isCorrect: false, skipped: true });
  }

  const usedTime  = Math.round((Date.now() - state.startTime) / 1000);
  const wrongCount = state.answers.filter(a => !a.isCorrect).length;
  const avgSpeed   = state.correct > 0 ? (usedTime / Math.max(state.current, state.correct)).toFixed(1) : "--";

  // Trophy, title & motivational messages for Mari 💜
  const pct = state.correct / TOTAL_Q;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const motivations = {
    perfect: {
      trophy: "🏆",
      titles: ["Perfecta, Mari!", "Eres una crack, Mari!", "Imparable, Mari!"],
      msgs: [
        "💜 Perfecto! Eres la mas inteligente que conozco. Te amo.",
        "✨ 20 de 20! Tu cerebro es tan increible como tu. Orgullo total!",
        "🌟 Flawless! Nadie como tu, Mari. Te adoro con todo."
      ]
    },
    excellent: {
      trophy: "⭐",
      titles: ["Excelente, Mari!", "Que inteligente eres!", "Brillante, Mari!"],
      msgs: [
        "💜 Que resultado tan bonito! Cada dia me sorprendes mas. Te amo.",
        "🥰 Wow! Eres demasiado lista. Estoy muy orgulloso de ti.",
        "✨ Casi perfecta! Como tu. Sigue asi, te amo muchisimo."
      ]
    },
    good: {
      trophy: "💜",
      titles: ["Muy bien, Mari!", "Buen trabajo!", "Vas muy bien, Mari!"],
      msgs: [
        "💪 Eso es! Cada intento te hace mas fuerte. Te amo, Mari.",
        "🌸 Gran esfuerzo! Lo que mas me gusta de ti es que nunca te rindes. Te adoro.",
        "💜 Bien hecho! La practica hace al maestro... o a la maestra! Te amo."
      ]
    },
    keep_going: {
      trophy: "🌸",
      titles: ["Animo, Mari!", "Tu puedes, Mari!", "Sigue intentando!"],
      msgs: [
        "💜 No te rindas! Cada error es un paso mas cerca de lograrlo. Te amo.",
        "🔥 El camino es practicar, y ya lo estas haciendo! Orgullo de ti, Mari.",
        "🌸 Recuerda que te quiero sin importar el resultado. Vuelve a intentarlo!"
      ]
    },
    retry: {
      trophy: "💪",
      titles: ["Vamos Mari, tu puedes!", "Un intento mas!", "No te rindas!"],
      msgs: [
        "🔥 Esta es tu motivacion del dia: eres increible y lo lograras. Te amo, Mari.",
        "💜 Los grandes campeones fallan antes de ganar. Tu momento llega. Te adoro.",
        "✨ Intenta de nuevo! Yo creo en ti mas que nadie. Con amor."
      ]
    }
  };

  let tier;
  if (pct >= 1)        tier = motivations.perfect;
  else if (pct >= .8)  tier = motivations.excellent;
  else if (pct >= .6)  tier = motivations.good;
  else if (pct >= .4)  tier = motivations.keep_going;
  else                 tier = motivations.retry;

  const trophy = tier.trophy;
  const title  = pick(tier.titles);
  const motivMsg = pick(tier.msgs);

  const sub = reason === "timeout"
    ? `Se acabo el tiempo. Respondiste ${state.answers.filter(a=>!a.skipped).length} de ${TOTAL_Q} preguntas.`
    : `Completaste los ${TOTAL_Q} ejercicios, Mari!`;

  // Show motivation banner
  const motivEl = id("motiv-msg");
  if (motivEl) {
    motivEl.textContent = motivMsg;
    motivEl.style.display = "block";
  }

  id("result-trophy").textContent = trophy;
  id("result-title").textContent  = title;
  id("result-sub").textContent    = sub;
  id("score-num").textContent     = state.correct;
  id("stat-correct").textContent  = state.correct;
  id("stat-wrong").textContent    = wrongCount;
  id("stat-time").textContent     = usedTime + "s";
  id("stat-speed").textContent    = avgSpeed + "s";

  // Animate score ring
  const circ = 364.4247;
  const offset = circ - pct * circ;
  setTimeout(() => {
    id("score-ring-fill").style.strokeDashoffset = offset;
  }, 100);

  // Build errors/review list
  const errorsList = id("errors-list");
  errorsList.innerHTML = "";
  state.answers.forEach(a => {
    const item = document.createElement("div");
    item.className = `error-item ${a.isCorrect ? "correct-item" : "wrong-item"}`;

    const icon   = a.isCorrect ? "✅" : (a.skipped ? "⏭️" : "❌");
    const yourTxt = a.skipped ? '<span class="error-your">—</span>'
                  : a.isCorrect ? `<span class="error-ok">${a.user}</span>`
                  : `<span class="error-your">${a.user}</span>`;
    const okTxt  = a.isCorrect ? "" : `<span class="error-ok"> ✓ ${a.correct}</span>`;

    item.innerHTML = `
      <span>${icon}</span>
      <span class="error-expr">${a.question}</span>
      ${yourTxt}
      ${okTxt}
    `;
    errorsList.appendChild(item);
  });

  showScreen("result");
}

// ── Result Buttons ──────────────────────────────
id("btn-retry").addEventListener("click", () => {
  timerDisp.classList.remove("timer-urgent");
  ringFill.classList.remove("urgent");
  startGame();
});

id("btn-home").addEventListener("click", () => {
  clearInterval(state.timerInterval);
  timerDisp.classList.remove("timer-urgent");
  ringFill.classList.remove("urgent");
  showScreen("start");
});
