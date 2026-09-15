const STORAGE_KEY = "type-test-history";
const WARMUP_TEXT = "the quick brown fox jumps over the lazy dog";

const textDisplay = document.getElementById("textDisplay");
const stream = document.getElementById("stream");
const inputArea = document.getElementById("inputArea");
const wpmEl = document.getElementById("wpm");
const timeEl = document.getElementById("time");
const sentencesEl = document.getElementById("sentences");
const charsEl = document.getElementById("chars");
const phaseMsg = document.getElementById("phaseMsg");
const startTestBtn = document.getElementById("startTestBtn");
const restartBtn = document.getElementById("restartBtn");
const endRaceBtn = document.getElementById("endRaceBtn");
const resultsPanel = document.getElementById("resultsPanel");
const againBtn = document.getElementById("againBtn");
const clearBtn = document.getElementById("clearBtn");

const finalWpm = document.getElementById("finalWpm");
const finalTime = document.getElementById("finalTime");
const finalSentences = document.getElementById("finalSentences");
const finalChars = document.getElementById("finalChars");

const histBestTime = document.getElementById("histBestTime");
const histWorstTime = document.getElementById("histWorstTime");
const histBestWpm = document.getElementById("histBestWpm");
const histWorstWpm = document.getElementById("histWorstWpm");
const histAvgWpm = document.getElementById("histAvgWpm");
const histTests = document.getElementById("histTests");

let spans = [];
let target = "";
let typed = "";
let startTime = null;
let timerInterval = null;
let correct = 0;
let isDone = false;
let phase = "warmup"; /* warmup | ready | race | done */
let lastWarmupWpm = null;
let goal = 1;
let sentEnds = [];

/* ------------------------------------------------ rendering */

function renderSpans(text) {
  stream.innerHTML = "";
  spans = [];
  target = text;
  sentEnds = [];

  for (let i = 0; i < target.length; i++) {
    const ch = document.createElement("span");
    ch.className = "char pending";
    ch.textContent = target[i];
    stream.appendChild(ch);
    spans[i] = ch;
    if (target[i] === "." || target[i] === "?") sentEnds.push(i);
  }
}

function countCorrect() {
  let c = 0;
  const n = Math.min(typed.length, target.length);
  for (let i = 0; i < n; i++) {
    if (typed[i] === target[i]) c++;
  }
  return c;
}

function repaint() {
  for (let i = 0; i < spans.length; i++) {
    const sp = spans[i];
    if (!sp) continue;
    if (i < typed.length) {
      if (typed[i] === target[i]) sp.className = "char correct";
      else sp.className = "char incorrect";
    } else if (i === typed.length) {
      sp.className = "char current";
    } else {
      sp.className = "char pending";
    }
  }
  correct = countCorrect();
}

function updateScroll() {
  const ref = spans[Math.max(0, typed.length - 1)] || spans[0];
  if (!ref) return;
  const lineH = spans[0].offsetHeight || 54;
  const line = Math.floor(ref.offsetTop / lineH);
  const targetY = Math.max(0, line - 1) * lineH;
  stream.style.transform = "translateY(" + (-targetY) + "px)";
}

/* ------------------------------------------------ goals */

function calcGoal(wpm) {
  const dec = Math.floor(wpm / 10);
  return Math.min(10.5, Math.max(0.5, dec * 0.5));
}

function goalLabel() {
  return (goal % 1 === 0 ? goal : goal.toFixed(1));
}

function buildGoalText() {
  const full = Math.floor(goal);
  const parts = [];

  for (let i = 0; i < full; i++) {
    parts.push(nextSentence());
  }

  if (goal % 1 === 0.5) {
    const words = nextSentence().split(" ");
    const half = Math.ceil(words.length / 2);
    parts.push(words.slice(0, half).join(" "));
  }

  target = parts.join(" ");
}

/* ------------------------------------------------ timing */

function getElapsed() {
  return startTime ? (Date.now() - startTime) / 1000 : 0;
}

function getSentencesDone() {
  let d = 0;
  for (let i = 0; i < sentEnds.length; i++) {
    if (sentEnds[i] < typed.length) d++;
  }
  return d;
}

function updateStats() {
  if (startTime === null || isDone) return;
  const elapsed = getElapsed();
  const minutes = elapsed / 60;
  wpmEl.textContent = minutes > 0 ? Math.round((correct / 5) / minutes) : 0;
  timeEl.textContent = Math.round(elapsed) + "s";
  sentencesEl.textContent = getSentencesDone();
  charsEl.textContent = correct;
}

/* ------------------------------------------------ input */

function inputHandler() {
  if (isDone) return;

  let val = inputArea.value;
  if (val.charAt(0) === "\n" || val.charAt(0) === "\r") {
    val = val.replace(/^[\r\n]+/, "");
    inputArea.value = val;
  }

  if (startTime === null && val.length > 0) {
    startTime = Date.now();
    timerInterval = setInterval(updateStats, 100);
    textDisplay.classList.add("active");
  }

  const oldLen = typed.length;

  if (val.length < typed.length) {
    typed = val;
    let t = 0;
    while (t < typed.length && typed[t] === target[t]) t++;
    for (let k = t; k <= oldLen; k++) {
      const sp = spans[k];
      if (sp) {
        sp.textContent = target[k];
        sp.className = "char pending";
      }
    }
  } else {
    typed = val.slice(0, target.length);
    if (typed.length !== val.length) inputArea.value = typed;
  }

  repaint();
  updateScroll();

  if (typed.length >= target.length) {
    updateStats();
    return;
  }

  updateStats();
}

inputArea.addEventListener("input", inputHandler);
inputArea.addEventListener("keydown", function (e) {
  if (e.key === "Enter") e.preventDefault();
});

textDisplay.addEventListener("click", function () {
  if (!isDone && !inputArea.disabled) inputArea.focus();
});

/* ------------------------------------------------ finish */

function showResults() {
  const elapsed = getElapsed();
  const minutes = elapsed / 60;
  const wpm = minutes > 0 ? Math.round((correct / 5) / minutes) : 0;

  finalWpm.textContent = wpm;
  finalTime.textContent = elapsed.toFixed(1) + "s";
  finalSentences.textContent = goalLabel();
  finalChars.textContent = correct;

  resultsPanel.classList.add("show");
  resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });

  return { wpm, elapsed };
}

function finishTest() {
  if (isDone || startTime === null) return;
  isDone = true;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  inputArea.disabled = true;
  inputArea.blur();
  textDisplay.classList.remove("active");

  const r = showResults();

  phase = "done";
  endRaceBtn.style.display = "none";
  restartBtn.style.display = "inline-block";
  againBtn.style.display = "inline-block";

  addResult({
    date: Date.now(),
    wpm: r.wpm,
    timeMs: Math.round(r.elapsed * 1000),
    chars: correct,
    sentences: goal
  });

  setPhaseMsg();
  updateStats();
}

function endRace() {
  if (isDone || phase !== "race") return;
  isDone = true;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  inputArea.disabled = true;
  inputArea.blur();
  textDisplay.classList.remove("active");

  phase = "done";
  endRaceBtn.style.display = "none";
  resultsPanel.classList.remove("show");
  resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  document.querySelector(".history-panel").scrollIntoView({ behavior: "smooth", block: "start" });

  wpmEl.textContent = "0";
  timeEl.textContent = "0s";
  sentencesEl.textContent = "0";
  charsEl.textContent = "0";

  setPhaseMsg();
}

/* ------------------------------------------------ warmup */

function finishWarmup() {
  if (isDone || startTime === null) return;
  isDone = true;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  inputArea.disabled = true;
  inputArea.blur();
  textDisplay.classList.remove("active");

  const elapsed = getElapsed();
  const minutes = elapsed / 60;
  lastWarmupWpm = minutes > 0 ? Math.round((correct / 5) / minutes) : 0;
  goal = calcGoal(lastWarmupWpm);

  phase = "ready";
  startTestBtn.style.display = "inline-block";
  restartBtn.style.display = "none";
  endRaceBtn.style.display = "none";

  phaseMsg.innerHTML =
    "Congratulations! Your WPM is <b>" + lastWarmupWpm +
    "</b> and your time is <b>" + elapsed.toFixed(1) + "s</b>. " +
    "Your test is <b>" + goalLabel() + " sentence" + (goal === 1 ? "" : "s") +
    "</b>. Press <b>Start Test</b> or press <b>Enter</b>.";

  resultsPanel.classList.remove("show");
  phaseMsg.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ------------------------------------------------ modes */

function buildWarmup() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  phase = "warmup";
  startTime = null;
  typed = "";
  correct = 0;
  isDone = false;
  goal = 1;

  resultsPanel.classList.remove("show");
  textDisplay.classList.remove("active");
  inputArea.value = "";
  inputArea.disabled = false;

  startTestBtn.style.display = "none";
  restartBtn.style.display = "inline-block";
  endRaceBtn.style.display = "none";
  againBtn.style.display = "none";

  stream.style.transition = "none";
  stream.style.transform = "translateY(0px)";
  stream.innerHTML = "";

  renderSpans(WARMUP_TEXT);
  repaint();
  updateScroll();

  phaseMsg.innerHTML = "";
  wpmEl.textContent = "0";
  timeEl.textContent = "0s";
  sentencesEl.textContent = "0";
  charsEl.textContent = "0";

  if (window.innerWidth > 600) inputArea.focus();
}

function startTest() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  phase = "race";
  startTime = null;
  typed = "";
  correct = 0;
  isDone = false;

  resultsPanel.classList.remove("show");
  textDisplay.classList.remove("active");
  inputArea.value = "";
  inputArea.disabled = false;

  startTestBtn.style.display = "none";
  againBtn.style.display = "none";
  restartBtn.style.display = "none";
  endRaceBtn.style.display = "inline-block";

  stream.style.transition = "none";
  stream.style.transform = "translateY(0px)";
  stream.innerHTML = "";

  buildGoalText();
  renderSpans(target);
  repaint();
  updateScroll();

  phaseMsg.innerHTML = "";
  updateStats();
  if (window.innerWidth > 600) inputArea.focus();
}

/* ------------------------------------------------ restart */

function avgWpmFromHistory() {
  const h = loadHistory();
  if (h.length === 0) return null;
  let sum = 0;
  for (const r of h) sum += r.wpm;
  return Math.round(sum / h.length);
}

function restart() {
  const avg = avgWpmFromHistory();
  if (avg !== null) {
    lastWarmupWpm = avg;
    goal = calcGoal(avg);
    startTest();
  } else {
    buildWarmup();
  }
}

/* ------------------------------------------------ phase message */

function setPhaseMsg() {
  if (phase === "done") {
    phaseMsg.textContent = "Nice work! Have another go or check your history below.";
  }
}

/* ------------------------------------------------ history */

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function addResult(r) {
  const h = loadHistory();
  h.push(r);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  } catch (e) {}
  renderHistory();
}

function fmtTime(ms) {
  if (ms === null || ms === undefined) return "-";
  return (ms / 1000).toFixed(1) + "s";
}

function renderHistory() {
  const h = loadHistory();

  if (h.length === 0) {
    histBestTime.textContent = "-";
    histWorstTime.textContent = "-";
    histBestWpm.textContent = "-";
    histWorstWpm.textContent = "-";
    histAvgWpm.textContent = "-";
    histTests.textContent = "0";
    return;
  }

  let bestTime = h[0].timeMs;
  let worstTime = h[0].timeMs;
  let bestWpm = h[0].wpm;
  let worstWpm = h[0].wpm;
  let sumWpm = 0;

  for (const r of h) {
    if (r.timeMs < bestTime) bestTime = r.timeMs;
    if (r.timeMs > worstTime) worstTime = r.timeMs;
    if (r.wpm > bestWpm) bestWpm = r.wpm;
    if (r.wpm < worstWpm) worstWpm = r.wpm;
    sumWpm += r.wpm;
  }

  histBestTime.textContent = fmtTime(bestTime);
  histWorstTime.textContent = fmtTime(worstTime);
  histBestWpm.textContent = bestWpm;
  histWorstWpm.textContent = worstWpm;
  histAvgWpm.textContent = Math.round(sumWpm / h.length);
  histTests.textContent = h.length;
}

clearBtn.addEventListener("click", function () {
  if (!confirm("Clear all of your typing history?")) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  renderHistory();
});

startTestBtn.addEventListener("click", startTest);
againBtn.addEventListener("click", restart);
restartBtn.addEventListener("click", restart);
endRaceBtn.addEventListener("click", endRace);

/* ------------------------------------------------ keyboard */

window.addEventListener("keydown", function (e) {
  if (e.key !== "Enter" || e.repeat) return;

  if (typed.length >= target.length && startTime !== null && !isDone) {
    e.preventDefault();
    if (phase === "warmup") finishWarmup();
    else finishTest();
  } else if (phase === "ready" && inputArea.disabled) {
    e.preventDefault();
    startTest();
  } else if (phase === "done") {
    e.preventDefault();
    restart();
  } else if (document.activeElement !== inputArea && !inputArea.disabled) {
    e.preventDefault();
    inputArea.focus();
  }
});

/* ------------------------------------------------ init */

renderHistory();
restart();
