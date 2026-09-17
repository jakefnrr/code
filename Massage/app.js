let users = JSON.parse(localStorage.getItem('massageUsers')) || {};
let currentUser = null;
let selectedTotalSeconds = 0;
let sessionFreeMinutes = 0;
let customActive = false;
let timerInterval = null;
let timerEndTime = 0;
let timerRunning = false;
let timerMode = null;
let secondsRemaining = 0;

// LANGUAGE
let currentLang = localStorage.getItem('massageUILang') || 'en';

const MESSAGES = {
    'app-title': { en: 'Massage App', th: 'แอปนวด' },
    'sign-in': { en: 'Log In', th: 'เข้าสู่ระบบ' },
    'sign-up': { en: 'Sign Up', th: 'สมัครสมาชิก' },
    'username': { en: 'Username', th: 'ชื่อผู้ใช้' },
    'password': { en: 'Password', th: 'รหัสผ่าน' },
    'required-err': { en: 'Please enter a username and password.', th: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
    'exists-err': { en: 'Username already exists.', th: 'ชื่อผู้ใช้มีอยู่แล้ว' },
    'invalid-err': { en: 'Invalid username or password.', th: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
    'welcome-prefix': { en: 'Welcome, ', th: 'ยินดีต้อนรับ, ' },
    'sign-out': { en: 'Sign Out', th: 'ออกจากระบบ' },
    'points-label': { en: 'Your Points: ', th: 'คะแนนของคุณ: ' },
    'choose-duration': { en: 'Choose Massage Duration', th: 'เลือกเวลานวด' },
    'subtitle': { en: '2 Baht per minute (max 30 min)', th: 'นาทีละ 2 บาท (สูงสุด 30 นาที)' },
    'dur-5': { en: '5 min', th: '5 นาที' },
    'dur-10': { en: '10 min', th: '10 นาที' },
    'dur-15': { en: '15 min', th: '15 นาที' },
    'dur-20': { en: '20 min', th: '20 นาที' },
    'dur-25': { en: '25 min', th: '25 นาที' },
    'dur-30': { en: '30 min', th: '30 นาที' },
    'baht-10': { en: '10 Baht', th: '10 บาท' },
    'baht-20': { en: '20 Baht', th: '20 บาท' },
    'baht-30': { en: '30 Baht', th: '30 บาท' },
    'baht-40': { en: '40 Baht', th: '40 บาท' },
    'baht-50': { en: '50 Baht', th: '50 บาท' },
    'baht-60': { en: '60 Baht', th: '60 บาท' },
    'custom': { en: 'Custom', th: 'กำหนดเอง' },
    'sec-word': { en: 'sec', th: 'วินาที' },
    'redeem-title': { en: 'Redeem Free Massage', th: 'แลกนวดฟรี' },
    'free-5': { en: '5 min free', th: 'นวดฟรี 5 นาที' },
    'free-10': { en: '10 min free', th: 'นวดฟรี 10 นาที' },
    'free-15': { en: '15 min free', th: 'นวดฟรี 15 นาที' },
    'pts-25': { en: '25 points', th: '25 คะแนน' },
    'pts-55': { en: '55 points', th: '55 คะแนน' },
    'pts-85': { en: '85 points', th: '85 คะแนน' },
    'begin-session': { en: 'Begin Session', th: 'เริ่มเซสชัน' },
    'session-title': { en: 'Massage Session', th: 'เซสชันนวด' },
    'duration-prefix': { en: 'Duration: ', th: 'ระยะเวลา: ' },
    'minutes': { en: 'minutes', th: 'นาที' },
    'timer-choice': { en: 'Do you want to use your own timer or use the timer on this website?', th: 'คุณต้องการใช้ตัวจับเวลาของตัวเองหรือใช้ตัวจับเวลาของเว็บไซต์นี้?' },
    'your-timer': { en: 'My Timer', th: 'ตัวจับเวลาของฉัน' },
    'website-timer': { en: 'Website Timer', th: 'ตัวจับเวลาเว็บ' },
    'start': { en: 'Start', th: 'เริ่ม' },
    'start-timer': { en: 'Start Timer', th: 'เริ่มจับเวลา' },
    'end-session': { en: 'End Session', th: 'จบเซสชัน' },
    'cancel': { en: 'Cancel', th: 'ยกเลิก' },
    'enjoy': { en: 'Enjoy your massage!', th: 'เพลิดเพลินกับการนวดของคุณ!' },
    'free-session': { en: 'FREE SESSION', th: 'เซสชันฟรี' },
    'min-word': { en: 'min', th: 'นาที' },
    'payment-title': { en: 'Payment', th: 'ชำระเงิน' },
    'amount-due': { en: 'Amount Due: ', th: 'ยอดชำระ: ' },
    'baht': { en: 'Baht', th: 'บาท' },
    'you-earned': { en: 'You earned ', th: 'คุณได้รับ ' },
    'points-word': { en: 'points!', th: 'คะแนน!' },
    'hand-phone': { en: 'Hand the phone to Jake to confirm the payment.', th: 'ส่งโทรศัพท์ให้ Jake เพื่อยืนยันการชำระเงิน' },
    'enter-pw': { en: 'Enter password to confirm:', th: 'กรอกรหัสผ่านเพื่อยืนยัน:' },
    'enter-pw-ph': { en: 'Enter password', th: 'กรอกรหัสผ่าน' },
    'confirm-payment': { en: 'Confirm Payment', th: 'ยืนยันการชำระเงิน' },
    'pay-error': { en: 'Wrong password. Try again.', th: 'รหัสผ่านผิด กรุณาลองใหม่' },
    'pay-confirmed': { en: 'Payment confirmed! You earned ', th: 'ยืนยันการชำระเงินแล้ว! คุณได้รับ ' },
    'free-done': { en: 'Free session complete! You earned ', th: 'เซสชันฟรีเสร็จสิ้น! คุณได้รับ ' },
    'points-after': { en: ' points.', th: ' คะแนน' }
};

function t(key) {
    return MESSAGES[key] ? MESSAGES[key][currentLang] : key;
}

function applyLanguage() {
    document.querySelectorAll('[data-lang]').forEach(function (el) {
        const key = el.dataset.lang;
        const val = MESSAGES[key] ? MESSAGES[key][currentLang] : null;
        if (val === null) return;
        if (el.tagName === 'INPUT') {
            el.placeholder = val;
        } else {
            el.textContent = val;
        }
    });
    document.getElementById('lang-toggle').textContent = currentLang === 'en' ? 'ไทย' : 'English';
    document.getElementById('lang-toggle-home').textContent = currentLang === 'en' ? 'ไทย' : 'English';
    const customDisplay = document.getElementById('custom-display');
    if (customDisplay) customDisplay.textContent = formatDuration(customTotalSeconds());
    updateCustomBaht();
    if (currentUser) {
        document.getElementById('current-username').textContent = currentUser;
    }
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'th' : 'en';
    localStorage.setItem('massageUILang', currentLang);
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('payment-error').classList.add('hidden');
    applyLanguage();
}

// Request persistent storage so data survives >1 year
if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
}

function saveUsers() {
    localStorage.setItem('massageUsers', JSON.stringify(users));
    localStorage.setItem('massageUsersSavedAt', Date.now().toString());
}

// AUTH
function showAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('auth-error').classList.add('hidden');

    if (tab === 'signin') {
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
        document.getElementById('signin-form').classList.remove('hidden');
        document.getElementById('signup-form').classList.add('hidden');
    } else {
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
        document.getElementById('signup-form').classList.remove('hidden');
        document.getElementById('signin-form').classList.add('hidden');
    }
}

function handleSignUp() {
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;

    if (!username.trim() || !password) {
        showAuthError(t('required-err'));
        return;
    }

    if (users[username]) {
        if (users[username].password === password) {
            currentUser = username;
            showHome();
            return;
        }
        showAuthError(t('exists-err'));
        return;
    }

    users[username] = { password, points: 0 };
    saveUsers();
    currentUser = username;
    showHome();
}

function handleSignIn() {
    const username = document.getElementById('signin-username').value.trim();
    const password = document.getElementById('signin-password').value;

    if (!username.trim() || !password) {
        showAuthError(t('required-err'));
        return;
    }

    if (!users[username] || users[username].password !== password) {
        showAuthError(t('invalid-err'));
        return;
    }

    currentUser = username;
    showHome();
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.classList.remove('hidden');
}

function handleSignOut() {
    currentUser = null;
    selectedTotalSeconds = 0;
    clearInterval(timerInterval);
    timerRunning = false;
    document.title = 'Massage App';
    saveUsers();
    showScreen('auth-screen');
    document.getElementById('signin-username').value = '';
    document.getElementById('signin-password').value = '';
    document.getElementById('signup-username').value = '';
    document.getElementById('signup-password').value = '';
    showAuthTab('signin');
}

// SCREENS
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function showHome() {
    document.getElementById('current-username').textContent = currentUser;
    updatePointsDisplay();
    updateRedeemButtons();
    selectedTotalSeconds = 0;
    sessionFreeMinutes = 0;
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
    resetCustom();
    showScreen('home-screen');
}

function updatePointsDisplay() {
    document.getElementById('user-points').textContent = users[currentUser].points;
}

function updateRedeemButtons() {
    const pts = users[currentUser].points;
    document.getElementById('redeem-5').disabled = pts < 25;
    document.getElementById('redeem-10').disabled = pts < 55;
    document.getElementById('redeem-15').disabled = pts < 85;
}

// DURATION
function setDuration(mins, btn) {
    if (btn.classList.contains('selected')) {
        btn.classList.remove('selected');
        selectedTotalSeconds = 0;
        sessionFreeMinutes = 0;
        customActive = false;
        document.getElementById('custom-card').classList.remove('selected');
        document.getElementById('begin-session-btn').disabled = true;
        return;
    }
    selectedTotalSeconds = mins * 60;
    sessionFreeMinutes = 0;
    customActive = false;
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('custom-card').classList.remove('selected');
    document.getElementById('custom-min').value = mins;
    document.getElementById('custom-sec').value = 0;
    document.getElementById('custom-slider').value = mins * 60;
    document.getElementById('custom-display').textContent = formatDuration(mins * 60);
    updateCustomBaht();
    document.getElementById('begin-session-btn').disabled = false;
}

// CUSTOM
function resetCustom() {
    document.getElementById('custom-min').value = 5;
    document.getElementById('custom-sec').value = 0;
    document.getElementById('custom-slider').value = 300;
    customActive = true;
    selectedTotalSeconds = 300;
    sessionFreeMinutes = 0;
    document.getElementById('custom-display').textContent = formatDuration(customTotalSeconds());
    updateCustomBaht();
    document.getElementById('custom-card').classList.add('selected');
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('begin-session-btn').disabled = false;
}

function selectCustom() {
    customActive = true;
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('custom-card').classList.add('selected');
    updateCustomSelection();
}

function customTotalSeconds() {
    const min = parseInt(document.getElementById('custom-min').value, 10) || 0;
    const sec = parseInt(document.getElementById('custom-sec').value, 10) || 0;
    return Math.min(1800, min * 60 + sec);
}

function updateCustomBaht() {
    const el = document.getElementById('custom-baht');
    if (!el) return;
    const cost = Math.round((customTotalSeconds() / 60) * 2 * 100) / 100;
    el.textContent = cost + ' ' + t('baht');
}

function customMinChanged() {
    let v = parseInt(document.getElementById('custom-min').value, 10) || 0;
    if (v > 30) v = 30;
    if (v < 0) v = 0;
    document.getElementById('custom-min').value = v;
    syncSliderFromInputs();
}

function customSecChanged() {
    updateCustomSelection();
}

function customSliderMoved() {
    const secs = parseInt(document.getElementById('custom-slider').value, 10);
    document.getElementById('custom-min').value = Math.floor(secs / 60);
    document.getElementById('custom-sec').value = secs % 60;
    updateCustomSelection();
}

function syncSliderFromInputs() {
    document.getElementById('custom-slider').value = customTotalSeconds();
    updateCustomSelection();
}

function updateCustomSelection() {
    const secs = customTotalSeconds();
    customActive = secs > 0;
    selectedTotalSeconds = secs;
    sessionFreeMinutes = 0;
    document.getElementById('custom-display').textContent = formatDuration(secs);
    updateCustomBaht();
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
    if (customActive) {
        document.getElementById('custom-card').classList.add('selected');
        document.getElementById('begin-session-btn').disabled = false;
    } else {
        document.getElementById('custom-card').classList.remove('selected');
        document.getElementById('begin-session-btn').disabled = true;
    }
}

// REDEEM
function redeemFree(mins, cost) {
    if (users[currentUser].points < cost) return;
    users[currentUser].points -= cost;
    saveUsers();
    selectedTotalSeconds = mins * 60;
    sessionFreeMinutes = mins;
    customActive = false;
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('custom-card').classList.remove('selected');
    document.getElementById('begin-session-btn').disabled = false;
    updatePointsDisplay();
}

// SESSION
function beginSession() {
    if (selectedTotalSeconds <= 0) return;
    secondsRemaining = selectedTotalSeconds;
    timerMode = null;
    timerRunning = false;
    clearInterval(timerInterval);
    timerEndTime = 0;
    document.title = 'Massage App';
    document.getElementById('session-duration').textContent = formatDuration(selectedTotalSeconds);

    const freeLabel = document.getElementById('session-free-label');
    if (sessionFreeMinutes > 0) {
        freeLabel.textContent = t('free-session') + ' (' + sessionFreeMinutes + ' ' + t('min-word') + ')';
        freeLabel.classList.remove('hidden');
    } else {
        freeLabel.textContent = '';
        freeLabel.classList.add('hidden');
    }

    document.getElementById('timer-choice').classList.remove('hidden');
    document.getElementById('timer-display').classList.add('hidden');
    document.getElementById('timer-display').textContent = formatTime(secondsRemaining);
    document.getElementById('enjoy-msg').classList.add('hidden');
    const startBtn = document.getElementById('start-timer-btn');
    startBtn.textContent = t('start-timer');
    startBtn.classList.add('hidden');
    document.getElementById('end-session-btn').classList.add('hidden');

    showScreen('session-screen');
}

function chooseTimerMode(mode) {
    timerMode = mode;
    document.getElementById('timer-choice').classList.add('hidden');
    const startBtn = document.getElementById('start-timer-btn');
    if (mode === 'my') {
        document.getElementById('timer-display').classList.add('hidden');
        startBtn.textContent = t('start');
    } else {
        document.getElementById('timer-display').classList.remove('hidden');
        document.getElementById('timer-display').textContent = formatTime(secondsRemaining);
        startBtn.textContent = t('start-timer');
    }
    startBtn.classList.remove('hidden');
}

function formatDuration(totalSeconds) {
    if (totalSeconds <= 0) return '0 ' + t('min-word');
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (secs === 0) return mins + ' ' + t('min-word');
    return mins + ' ' + t('min-word') + ' ' + secs + ' ' + t('sec-word');
}

function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function startTimer() {
    if (timerMode === null) return;
    document.getElementById('start-timer-btn').classList.add('hidden');
    document.getElementById('end-session-btn').classList.remove('hidden');
    document.getElementById('enjoy-msg').classList.remove('hidden');

    if (timerMode === 'web') {
        timerEndTime = Date.now() + secondsRemaining * 1000;
        timerRunning = true;
        clearInterval(timerInterval);
        timerInterval = setInterval(timerTick, 250);
        timerTick();
    }
}

function timerTick() {
    if (!timerRunning) return;
    const remainMs = timerEndTime - Date.now();
    secondsRemaining = Math.max(0, Math.ceil(remainMs / 1000));
    const display = formatTime(secondsRemaining);
    document.getElementById('timer-display').textContent = display;
    document.title = display + ' - Massage App';
    if (secondsRemaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerRunning = false;
        endSession();
    }
}

function endSession() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerEndTime = 0;
    document.title = 'Massage App';
    const mins = selectedTotalSeconds / 60;
    const total = Math.round(mins * 2 * 100) / 100;
    const earned = Math.round(mins * 100) / 100;

    document.getElementById('payment-total').textContent = sessionFreeMinutes > 0 ? 0 : total;
    document.getElementById('points-earned').textContent = earned;
    document.getElementById('payment-password').value = '';
    document.getElementById('payment-error').classList.add('hidden');

    if (sessionFreeMinutes > 0) {
        users[currentUser].points += earned;
        saveUsers();
        showHome();
        updatePointsDisplay();
        updateRedeemButtons();
        alert(t('free-done') + earned + t('points-after'));
        return;
    }

    showScreen('payment-screen');
}

function cancelSession() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerEndTime = 0;
    document.title = 'Massage App';
    showHome();
}

// PAYMENT
function confirmPayment() {
    const pw = document.getElementById('payment-password').value;
    if (pw === 'jjaakkeelol') {
        const earned = Math.round((selectedTotalSeconds / 60) * 100) / 100;
        users[currentUser].points += earned;
        saveUsers();
        alert(t('pay-confirmed') + earned + t('points-after'));
        showHome();
    } else {
        document.getElementById('payment-error').textContent = t('pay-error');
        document.getElementById('payment-error').classList.remove('hidden');
    }
}

// Keep the countdown accurate even when the tab or app is backgrounded
document.addEventListener('visibilitychange', function () {
    if (!document.hidden && timerRunning) timerTick();
});
window.addEventListener('focus', function () {
    if (timerRunning) timerTick();
});

// Pressing Enter in an auth field logs in / signs up, without a real <form>
document.getElementById('signin-username').addEventListener('keydown', authEnterKey);
document.getElementById('signin-password').addEventListener('keydown', authEnterKey);
document.getElementById('signup-username').addEventListener('keydown', authEnterKey);
document.getElementById('signup-password').addEventListener('keydown', authEnterKey);

function authEnterKey(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (document.getElementById('signin-form').classList.contains('hidden')) {
            handleSignUp();
        } else {
            handleSignIn();
        }
    }
}

// INIT
applyLanguage();
if (currentUser) {
    showHome();
} else {
    showScreen('auth-screen');
}
