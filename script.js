// =================================================================
// IMPORTS
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// =================================================================
// FIREBASE CONFIGURATION
// =================================================================
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDlB1XOAUnLepi5g9bgPeNFtwNyUgBNLJs",
  authDomain: "quizify-bae37.firebaseapp.com",
  projectId: "quizify-bae37",
  storageBucket: "quizify-bae37.firebasestorage.app",
  messagingSenderId: "633885331182",
  appId: "1:633885331182:web:831b064cb5f54fb5adadff",
  measurementId: "G-KNCDMN1HVF"
};

// =================================================================
// INITIALIZE FIREBASE & GET DOM ELEMENTS
// =================================================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- Auth Elements ---
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const usernameInput = document.getElementById("auth-username");
const authBtn = document.getElementById("auth-action-btn");
const toggleText = document.getElementById("toggle-auth-mode");
const googleLoginBtn = document.getElementById("google-login-btn");
const authTitle = document.getElementById("auth-title");

// --- Quiz Elements ---
const questionTextElement = document.getElementById("question-text");
const optionsContainer = document.getElementById("options");
const nextBtn = document.getElementById("next-btn");
const startBtn = document.getElementById("start-btn");
const difficultySelect = document.getElementById("difficulty");
const timerElement = document.getElementById("timer");

// =================================================================
// STATE VARIABLES
// =================================================================
let questions = []; 
let currentQuestionIndex = 0;
let score = 0;
let isLoginMode = true;
let timer;
let timeLeft = 30;

// =================================================================
// AUTHENTICATION LOGIC
// =================================================================
toggleText.addEventListener("click", (event) => {
    if (event.target.id === "switch-mode") {
        isLoginMode = !isLoginMode;
        authTitle.textContent = isLoginMode ? "Login" : "Register";
        authBtn.textContent = isLoginMode ? "Login" : "Register";
        usernameInput.style.display = isLoginMode ? "none" : "block";
        toggleText.innerHTML = isLoginMode
            ? `Don't have an account? <span id="switch-mode" style="cursor: pointer; color: #00ffff; text-decoration: underline;">Create Account</span>`
            : `Already have an account? <span id="switch-mode" style="cursor: pointer; color: #00ffff; text-decoration: underline;">Login</span>`;
    }
});

authBtn.addEventListener("click", () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    const username = usernameInput.value;
    if (!email || !password) return alert("Please enter both email and password.");
    if (isLoginMode) {
        signInWithEmailAndPassword(auth, email, password)
            .then(userCred => showMainApp(userCred.user.displayName || userCred.user.email))
            .catch(err => alert(err.message));
    } else {
        if (!username) return alert("Please enter a username for registration.");
        createUserWithEmailAndPassword(auth, email, password)
            .then(userCred => updateProfile(userCred.user, { displayName: username }).then(() => showMainApp(username)))
            .catch(err => alert(err.message));
    }
});

googleLoginBtn.addEventListener("click", () => {
    signInWithPopup(auth, provider)
        .then(result => showMainApp(result.user.displayName || result.user.email))
        .catch(err => alert(err.message));
});

function showMainApp(name) {
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("main-app").style.display = "block";
    document.getElementById("user-display-name").textContent = name;
}

// =================================================================
// QUIZ LOGIC
// =================================================================
startBtn.addEventListener("click", startQuiz);

async function startQuiz() {
    const difficulty = difficultySelect.value === "all" ? "" : `&difficulty=${difficultySelect.value}`;
    const amount = 10;
    const apiUrl = `https://opentdb.com/api.php?amount=${amount}${difficulty}&type=multiple`;

    questionTextElement.textContent = "Loading questions...";
    optionsContainer.innerHTML = "";
    timerElement.style.display = "none";
    nextBtn.style.display = "none";

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        questions = data.results.map(apiQuestion => {
            const formattedQuestion = { question: apiQuestion.question };
            const answers = [...apiQuestion.incorrect_answers, apiQuestion.correct_answer];
            formattedQuestion.answers = answers
                .sort(() => Math.random() - 0.5)
                .map(answer => ({
                    text: answer,
                    correct: answer === apiQuestion.correct_answer
                }));
            return formattedQuestion;
        });

        currentQuestionIndex = 0;
        score = 0;
        nextBtn.textContent = "Next";
        document.getElementById("quiz-section").style.display = "block";
        document.querySelector(".quiz-settings").style.display = "none";
        showQuestion();
    } catch (error) {
        questionTextElement.textContent = "Failed to load questions. Please try again.";
    }
}

function showQuestion() {
    resetState();
    let currentQuestion = questions[currentQuestionIndex];
    let questionNo = currentQuestionIndex + 1;
    questionTextElement.innerHTML = `${questionNo}. ${currentQuestion.question}`;

    currentQuestion.answers.forEach(answer => {
        const button = document.createElement("button");
        button.innerHTML = answer.text;
        if (answer.correct) {
            button.dataset.correct = "true";
        }
        button.addEventListener("click", selectAnswer);
        optionsContainer.appendChild(button);
    });

    startTimer();
}

function startTimer() {
    timeLeft = 30;
    timerElement.textContent = `Time Left: ${timeLeft}`;
    timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `Time Left: ${timeLeft}`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            handleNextButton();
        }
    }, 1000);
}

function resetState() {
    clearInterval(timer);
    nextBtn.style.display = "block";
    nextBtn.disabled = true;
    timerElement.style.display = "block";
    optionsContainer.innerHTML = "";
}

function selectAnswer(e) {
    const allOptions = document.querySelectorAll("#options button");
    allOptions.forEach(btn => btn.classList.remove('selected'));
    e.target.classList.add('selected');
    nextBtn.disabled = false;
}

function handleNextButton() {
    clearInterval(timer);
    const selectedBtn = document.querySelector("#options button.selected");
    if (selectedBtn && selectedBtn.dataset.correct === "true") {
        score++;
    }
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        showQuestion();
    } else {
        showScore();
    }
}

function showScore() {
    resetState();
    timerElement.style.display = "none";
    questionTextElement.innerHTML = `You scored ${score} out of ${questions.length}!`;
    nextBtn.textContent = "Play Again";
    nextBtn.disabled = false;
}

nextBtn.addEventListener("click", () => {
    if (currentQuestionIndex < questions.length) {
        handleNextButton();
    } else {
        document.getElementById("quiz-section").style.display = "none";
        document.querySelector(".quiz-settings").style.display = "block";
    }
});