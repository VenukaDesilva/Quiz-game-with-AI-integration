
const builtInQuestions = [
	{
		question: "Which language runs in a web browser?",
		answers: ["Java", "C", "Python", "JavaScript"],
		correctIndex: 3,
	},
	{
		question: "What does HTML stand for?",
		answers: [
			"Hyper Text Markup Language",
			"High Text Machine Language",
			"Hyperlinks and Text Markup Language",
			"Home Tool Markup Language",
		],
		correctIndex: 0,
	},
	{
		question: "Which CSS property changes text color?",
		answers: ["font-style", "color", "background-color", "text-decoration"],
		correctIndex: 1,
	},
	{
		question: "Inside which HTML element do we put JavaScript?",
		answers: ["<js>", "<javascript>", "<script>", "<code>"],
		correctIndex: 2,
	},
	{
		question: "Which method converts JSON text into an object?",
		answers: ["JSON.parse()", "JSON.stringify()", "JSON.object()", "JSON.toObject()"],
		correctIndex: 0,
	},
];

// Live question set (can be built-in or AI generated)
let questions = builtInQuestions;

const QUESTION_COUNT = 50;

const els = {
	startScreen: document.getElementById("start-screen"),
	quizScreen: document.getElementById("quiz-screen"),
	resultScreen: document.getElementById("result-screen"),
	progressBar: document.getElementById("progress-bar"),
	startBtn: document.getElementById("start-btn"),
	nextBtn: document.getElementById("next-btn"),
	restartBtn: document.getElementById("restart-btn"),
	questionTitle: document.getElementById("question-title"),
	answers: document.getElementById("answers"),
	feedback: document.getElementById("feedback"),
	questionCounter: document.getElementById("question-counter"),
	scoreCounter: document.getElementById("score-counter"),
	resultText: document.getElementById("result-text"),
	sourceSelect: document.getElementById("source-select"),
	loadStatus: document.getElementById("load-status"),
};

let questionOrder = [];
let current = 0;
let score = 0;
let hasAnswered = false;

function showScreen(screenEl) {
	for (const el of [els.startScreen, els.quizScreen, els.resultScreen]) {
		el.classList.toggle("active", el === screenEl);
	}
}

function shuffle(array) {
	const arr = array.slice();
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

function setStatus(message) {
	if (!els.loadStatus) return;
	els.loadStatus.textContent = message || "";
}

function decodeHtmlEntities(text) {
	const t = document.createElement("textarea");
	t.innerHTML = String(text);
	return t.value;
}

async function fetchOnlineQuestions(count) {
	// Keyless public API. Not "IQ"-specific, but it is online + randomized.
	const url = `https://opentdb.com/api.php?amount=${count}&type=multiple`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Online API HTTP ${res.status}`);

	const data = await res.json();
	if (!data || data.response_code !== 0 || !Array.isArray(data.results)) {
		throw new Error("Online API returned an invalid payload");
	}

	return data.results.map((item) => {
		const question = decodeHtmlEntities(item.question);
		const correct = decodeHtmlEntities(item.correct_answer);
		const incorrect = Array.isArray(item.incorrect_answers)
			? item.incorrect_answers.map(decodeHtmlEntities)
			: [];
		const all = shuffle([correct, ...incorrect]).slice(0, 4);
		const correctIndex = all.indexOf(correct);
		return {
			question,
			answers: all,
			correctIndex: correctIndex === -1 ? 0 : correctIndex,
		};
	});
}

function updateProgress() {
	const total = questions.length;
	const percent = total === 0 ? 0 : Math.round((current / total) * 100);
	els.progressBar.style.width = `${percent}%`;
}

function setCounters() {
	const total = questions.length;
	els.questionCounter.textContent = `Question ${Math.min(current + 1, total)} / ${total}`;
	els.scoreCounter.textContent = `Score: ${score}`;
}

function renderQuestion() {
	hasAnswered = false;
	els.nextBtn.disabled = true;
	els.nextBtn.textContent = current === questions.length - 1 ? "Finish" : "Next";
	els.feedback.textContent = "";

	const q = questions[questionOrder[current]];
	els.questionTitle.textContent = q.question;

	els.answers.innerHTML = "";
	q.answers.forEach((text, idx) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "answer";
		btn.setAttribute("role", "listitem");
		btn.textContent = text;
		btn.addEventListener("click", () => selectAnswer(idx));
		els.answers.appendChild(btn);
	});

	setCounters();
	updateProgress();
}

function lockAnswers() {
	const buttons = Array.from(els.answers.querySelectorAll("button.answer"));
	buttons.forEach((b) => (b.disabled = true));
}

function selectAnswer(chosenIndex) {
	if (hasAnswered) return;
	hasAnswered = true;

	const q = questions[questionOrder[current]];
	const buttons = Array.from(els.answers.querySelectorAll("button.answer"));

	const isCorrect = chosenIndex === q.correctIndex;
	if (isCorrect) {
		score += 1;
		els.feedback.textContent = "Correct!";
	} else {
		els.feedback.textContent = `Wrong. Correct answer: ${q.answers[q.correctIndex]}`;
	}

	// Visual states
	buttons.forEach((btn, idx) => {
		if (idx === q.correctIndex) btn.classList.add("correct");
		if (idx === chosenIndex && !isCorrect) btn.classList.add("wrong");
	});

	lockAnswers();
	setCounters();
	els.nextBtn.disabled = false;
	els.nextBtn.focus();
}

function nextQuestion() {
	if (current < questions.length - 1) {
		current += 1;
		renderQuestion();
		return;
	}
	finishQuiz();
}

function finishQuiz() {
	els.progressBar.style.width = "100%";
	const total = questions.length;
	const percent = total === 0 ? 0 : Math.round((score / total) * 100);
	els.resultText.textContent = `You scored ${score}/${total} (${percent}%).`;
	showScreen(els.resultScreen);
	els.restartBtn.focus();
}

async function startQuiz() {
	const count = QUESTION_COUNT;
	const source = els.sourceSelect?.value || "builtin";

	els.startBtn.disabled = true;
	setStatus(source === "online" ? "Loading questions online…" : "Preparing quiz…");

	try {
		if (source === "online") {
			questions = await fetchOnlineQuestions(count);
			setStatus(`Loaded ${questions.length} online questions.`);
		} else {
			// Built-in fallback cannot reach 50 unless you expand the list.
			questions = shuffle(builtInQuestions);
			setStatus(`Loaded ${questions.length} built-in questions.`);
		}
	} catch (err) {
		console.error(err);
		questions = shuffle(builtInQuestions);
		setStatus("Online source not available. Using built-in questions instead.");
	} finally {
		els.startBtn.disabled = false;
	}

	if (questions.length === 0) return;
	questionOrder = shuffle([...questions.keys()]);
	current = 0;
	score = 0;
	showScreen(els.quizScreen);
	renderQuestion();
}

function restartQuiz() {
	els.progressBar.style.width = "0%";
	showScreen(els.startScreen);
	els.startBtn.focus();
}

els.startBtn.addEventListener("click", startQuiz);
els.nextBtn.addEventListener("click", nextQuestion);
els.restartBtn.addEventListener("click", restartQuiz);

// Keyboard convenience
document.addEventListener("keydown", (e) => {
	if (e.key === "Enter" && els.startScreen.classList.contains("active")) {
		if (!els.startBtn.disabled) startQuiz();
	}
});

restartQuiz();

