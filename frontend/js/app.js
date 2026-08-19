/**
 * Hangman Pro - Frontend Application Controller & Web Audio Engine
 * Handles REST API integrations, JWT Auth, Sound Effects, Keyboard Inputs, and State
 */

const API_BASE = '/api';

// Global State
let currentUser = null;
let authToken = localStorage.getItem('hangman_jwt_token') || null;
let currentGameId = null;
let isSoundEnabled = true;
let canvasEngine = null;

// Web Audio API Synthesizer
class SoundSynthesizer {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
    }

    playClick() {
        if (!isSoundEnabled) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playCorrect() {
        if (!isSoundEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playWrong() {
        if (!isSoundEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now); // A3
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.25); // Drop

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    playWin() {
        if (!isSoundEnabled) return;
        this.init();
        if (!this.ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C6 Fanfare
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime + (i * 0.1);

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        });
    }

    playLoss() {
        if (!isSoundEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
    }
}

const soundFX = new SoundSynthesizer();

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Canvas Engine
    canvasEngine = new HangmanCanvasEngine('hangmanCanvas');

    // Build Virtual QWERTY Keyboard
    buildVirtualKeyboard();

    // Attach Physical Keyboard Listener
    document.addEventListener('keydown', handlePhysicalKeyPress);

    // Auto-login check if JWT token exists
    if (authToken) {
        verifyTokenAndLoad();
    } else {
        showAuthSection();
    }
});

// AUTHENTICATION LOGIC
function switchAuthTab(tab) {
    soundFX.playClick();
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const alertBox = document.getElementById('authAlert');

    alertBox.classList.add('hidden');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLoginBtn.classList.add('active');
        tabRegisterBtn.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabLoginBtn.classList.remove('active');
        tabRegisterBtn.classList.add('active');
    }
}

function showAuthAlert(message, type = 'error') {
    const alertBox = document.getElementById('authAlert');
    alertBox.textContent = message;
    alertBox.className = `auth-alert ${type}`;
    alertBox.classList.remove('hidden');
}

function togglePasswordVisibility(inputId, toggleBtn) {
    soundFX.playClick();
    const input = document.getElementById(inputId);
    const icon = toggleBtn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-regular fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fa-regular fa-eye';
    }
}

function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    let score = 0;
    if (password.length >= 6) score += 25;
    if (password.length >= 10) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9!@#$%^&*]/.test(password)) score += 25;

    strengthBar.style.width = score + '%';
    if (score <= 25) {
        strengthBar.style.backgroundColor = '#ef4444';
        strengthText.textContent = 'Weak Password';
    } else if (score <= 50) {
        strengthBar.style.backgroundColor = '#f59e0b';
        strengthText.textContent = 'Medium Password';
    } else if (score <= 75) {
        strengthBar.style.backgroundColor = '#3b82f6';
        strengthText.textContent = 'Good Password';
    } else {
        strengthBar.style.backgroundColor = '#10b981';
        strengthText.textContent = 'Strong Password!';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    soundFX.playClick();

    const identifier = document.getElementById('loginIdentifier').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username_or_email: identifier, password: password })
        });
        const data = await res.json();

        if (!res.ok) {
            showAuthAlert(data.error || 'Login failed.', 'error');
            soundFX.playWrong();
            return;
        }

        // Save Auth Session
        authToken = data.token;
        localStorage.setItem('hangman_jwt_token', authToken);
        currentUser = data.user;

        showAuthAlert('Login successful! Redirecting...', 'success');
        soundFX.playWin();

        setTimeout(() => {
            showGameSection();
        }, 600);

    } catch (err) {
        showAuthAlert('Network error connecting to backend API.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    soundFX.playClick();

    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, email: email, password: password })
        });
        const data = await res.json();

        if (!res.ok) {
            showAuthAlert(data.error || 'Registration failed.', 'error');
            soundFX.playWrong();
            return;
        }

        authToken = data.token;
        localStorage.setItem('hangman_jwt_token', authToken);
        currentUser = data.user;

        showAuthAlert('Account created successfully!', 'success');
        soundFX.playWin();

        setTimeout(() => {
            showGameSection();
        }, 600);

    } catch (err) {
        showAuthAlert('Network error during registration.', 'error');
    }
}

async function verifyTokenAndLoad() {
    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (res.ok && data.user) {
            currentUser = data.user;
            showGameSection();
        } else {
            handleLogout();
        }
    } catch (err) {
        handleLogout();
    }
}

function handleLogout() {
    soundFX.playClick();
    authToken = null;
    currentUser = null;
    localStorage.removeItem('hangman_jwt_token');
    showAuthSection();
}

function showAuthSection() {
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('gameSection').classList.add('hidden');
}

function showGameSection() {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('gameSection').classList.remove('hidden');

    // Update Header User Profile & Stats
    updateNavbarUserStats();

    // Start New Game Session
    startNewGame();
}

function updateNavbarUserStats() {
    if (!currentUser) return;
    document.getElementById('navUsername').textContent = currentUser.username;
    document.getElementById('userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();

    const stats = currentUser.stats || {};
    document.getElementById('navHighScore').textContent = stats.high_score || 0;
    document.getElementById('navStreak').textContent = stats.current_streak || 0;
    document.getElementById('navWins').textContent = `${stats.games_won || 0}/${stats.games_played || 0}`;
}

// GAMEPLAY LOGIC
async function startNewGame() {
    const category = document.getElementById('categorySelect').value;
    const difficulty = document.getElementById('difficultySelect').value;

    try {
        const res = await fetch(`${API_BASE}/game/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ category: category, difficulty: difficulty })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Failed to start game.');
            return;
        }

        currentGameId = data.game_id;

        // Reset UI Components
        renderWordBlanks(data.masked_word);
        resetKeyboard();
        hideHint();

        // Update Canvas & Badges
        document.getElementById('gameCategory').textContent = data.category;
        document.getElementById('difficultyPill').textContent = data.difficulty.toUpperCase();
        document.getElementById('currentStageNum').textContent = '0';
        document.getElementById('maxStageNum').textContent = data.max_attempts;
        document.getElementById('attemptsText').textContent = `${data.attempts_remaining} Attempts Left`;

        canvasEngine.setStage(0, data.max_attempts);

    } catch (err) {
        console.error('Error starting game:', err);
    }
}

function restartGameWithSettings() {
    soundFX.playClick();
    startNewGame();
}

function renderWordBlanks(maskedWordString) {
    const container = document.getElementById('wordDisplay');
    container.innerHTML = '';
    const letters = maskedWordString.split(' ');

    letters.forEach(char => {
        const tile = document.createElement('div');
        tile.className = 'letter-tile';
        if (char !== '_') {
            tile.textContent = char;
            tile.style.borderBottomColor = '#10b981';
        } else {
            tile.textContent = '';
        }
        container.appendChild(tile);
    });
}

function buildVirtualKeyboard() {
    const rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
    ];

    rows.forEach((row, idx) => {
        const rowDiv = document.getElementById(`kbRow${idx + 1}`);
        rowDiv.innerHTML = '';
        row.forEach(letter => {
            const btn = document.createElement('button');
            btn.className = 'key-btn';
            btn.dataset.letter = letter;
            btn.textContent = letter;
            btn.onclick = () => submitGuess(letter);
            rowDiv.appendChild(btn);
        });
    });
}

function resetKeyboard() {
    const keys = document.querySelectorAll('.key-btn');
    keys.forEach(key => {
        key.className = 'key-btn';
        key.disabled = false;
    });
}

function handlePhysicalKeyPress(e) {
    // Only handle if game section is visible
    if (document.getElementById('gameSection').classList.contains('hidden')) return;
    
    // Ignore input if user is inside an input box
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    const letter = e.key.toUpperCase();
    if (/^[A-Z]$/.test(letter)) {
        const keyBtn = document.querySelector(`.key-btn[data-letter="${letter}"]`);
        if (keyBtn && !keyBtn.disabled) {
            submitGuess(letter);
        }
    }
}

async function submitGuess(letter) {
    if (!currentGameId) return;

    const keyBtn = document.querySelector(`.key-btn[data-letter="${letter}"]`);
    if (keyBtn) keyBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/game/guess`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ game_id: currentGameId, letter: letter })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Invalid guess.');
            return;
        }

        // Update Key Status Color
        if (keyBtn) {
            keyBtn.classList.add(data.is_correct ? 'correct' : 'wrong');
        }

        // Play Sound
        if (data.is_correct) {
            soundFX.playCorrect();
        } else {
            soundFX.playWrong();
        }

        // Update Word Blanks & Canvas Stage
        renderWordBlanks(data.masked_word);
        document.getElementById('attemptsText').textContent = `${data.attempts_remaining} Attempts Left`;
        document.getElementById('currentStageNum').textContent = data.stage;

        canvasEngine.setStage(data.stage, data.max_attempts);

        // Game Over Evaluation
        if (data.status === 'WON') {
            soundFX.playWin();
            canvasEngine.triggerVictory();
            if (data.user_stats) currentUser.stats = data.user_stats;
            updateNavbarUserStats();
            setTimeout(() => showGameResultModal(true, data), 600);
        } else if (data.status === 'LOST') {
            soundFX.playLoss();
            if (data.user_stats) currentUser.stats = data.user_stats;
            updateNavbarUserStats();
            setTimeout(() => showGameResultModal(false, data), 700);
        }

    } catch (err) {
        console.error('Error processing guess:', err);
    }
}

async function requestHint() {
    if (!currentGameId) return;
    soundFX.playClick();

    try {
        const res = await fetch(`${API_BASE}/game/hint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ game_id: currentGameId })
        });
        const data = await res.json();

        if (res.ok) {
            document.getElementById('hintText').textContent = data.hint;
            document.getElementById('hintBox').classList.remove('hidden');
        }
    } catch (err) {
        console.error('Error fetching hint:', err);
    }
}

function hideHint() {
    document.getElementById('hintBox').classList.add('hidden');
}

// MODAL WINDOW CONTROL
function showGameResultModal(isWin, data) {
    const modal = document.getElementById('gameResultModal');
    const header = document.getElementById('modalHeader');
    
    if (isWin) {
        header.innerHTML = `<h2 style="color: #10b981"><i class="fa-solid fa-trophy"></i> VICTORY!</h2>`;
    } else {
        header.innerHTML = `<h2 style="color: #ef4444"><i class="fa-solid fa-skull"></i> EXECUTED!</h2>`;
    }

    document.getElementById('modalSecretWord').textContent = data.secret_word;
    document.getElementById('modalDefinition').textContent = data.definition || '';
    document.getElementById('modalEarnedScore').textContent = `+${data.score || 0} PTS`;
    document.getElementById('modalCurrentStreak').textContent = `${data.user_stats?.current_streak || 0} 🔥`;

    modal.classList.remove('hidden');
}

function closeResultModalAndPlayNext() {
    soundFX.playClick();
    document.getElementById('gameResultModal').classList.add('hidden');
    startNewGame();
}

async function openLeaderboard() {
    soundFX.playClick();
    const modal = document.getElementById('leaderboardModal');
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">Loading leaderboard...</td></tr>`;
    modal.classList.remove('hidden');

    try {
        const res = await fetch(`${API_BASE}/leaderboard`);
        const data = await res.json();

        tbody.innerHTML = '';
        if (data.leaderboard && data.leaderboard.length > 0) {
            data.leaderboard.forEach((player, idx) => {
                const tr = document.createElement('tr');
                const rankBadge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                tr.innerHTML = `
                    <td><strong>${rankBadge}</strong></td>
                    <td><strong>${player.username}</strong></td>
                    <td><span class="highlight">${player.score || 0}</span></td>
                    <td>${player.wins || 0}</td>
                    <td>${player.best_streak || 0} 🔥</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">No players registered yet. Be the first!</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef4444">Failed to load leaderboard.</td></tr>`;
    }
}

async function openStatsModal() {
    soundFX.playClick();
    const modal = document.getElementById('statsModal');
    modal.classList.remove('hidden');

    if (!currentUser) return;

    try {
        const res = await fetch(`${API_BASE}/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();

        const stats = data.stats || {};
        const played = stats.games_played || 0;
        const won = stats.games_won || 0;
        const winRate = played > 0 ? Math.round((won / played) * 100) : 0;

        document.getElementById('statPlayed').textContent = played;
        document.getElementById('statWon').textContent = won;
        document.getElementById('statWinRate').textContent = `${winRate}%`;
        document.getElementById('statBestStreak').textContent = stats.best_streak || 0;

        // Render Recent Match History Table
        const historyBody = document.getElementById('historyBody');
        historyBody.innerHTML = '';

        if (data.recent_games && data.recent_games.length > 0) {
            data.recent_games.forEach(g => {
                const tr = document.createElement('tr');
                const isWon = g.status === 'WON';
                tr.innerHTML = `
                    <td><strong>${g.word}</strong></td>
                    <td>${g.category}</td>
                    <td><span class="difficulty-pill">${g.difficulty.toUpperCase()}</span></td>
                    <td><span style="color: ${isWon ? '#10b981' : '#ef4444'}; font-weight:700">${g.status}</span></td>
                    <td>+${g.score || 0}</td>
                `;
                historyBody.appendChild(tr);
            });
        } else {
            historyBody.innerHTML = `<tr><td colspan="5" style="text-align:center">No game history recorded yet.</td></tr>`;
        }

    } catch (err) {
        console.error('Error fetching user stats:', err);
    }
}

function closeModal(modalId) {
    soundFX.playClick();
    document.getElementById(modalId).classList.add('hidden');
}

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    const btn = document.getElementById('soundToggleBtn');
    if (isSoundEnabled) {
        btn.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
        soundFX.playClick();
    } else {
        btn.innerHTML = `<i class="fa-solid fa-volume-xmark" style="color: #ef4444"></i>`;
    }
}
