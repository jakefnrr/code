let users = JSON.parse(localStorage.getItem('massageUsers')) || {};
let currentUser = null;
let selectedDuration = 0;
let timerInterval = null;
let secondsRemaining = 0;
let sessionFreeMinutes = 0;

// LANGUAGE
let currentLang = localStorage.getItem('massageUILang') || 'en';

const MESSAGES = {
    'app-title': { en: 'Massage App', th: 'แอปนวด' },
    'sign-in': { en: 'Sign In', th: 'เข้าสู่ระบบ' },
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
    'start-timer': { en: 'Start Timer', th: 'เริ่มจับเวลา' },
    'end-session': { en: 'End Session', th: 'จบเซสชัน' },
    'cancel': { en: 'Cancel', th: 'ยกเลิก' },
    'free-session': { en: 'FREE SESSION', th: 'เซสชันฟรี' },
    'min-word': { en: 'min', th: 'นาที' },
    'payment-title': { en: 'Payment', th: 'ชำระเงิน' },
    'amount-due': { en: 'Amount Due: ', th: 'ยอดชำระ: ' },
    'baht': { en: 'Baht', th: 'บาท' },
    'you-earned': { en: 'You earned ', th: 'คุณได้รับ ' },
    'points-word': { en: 'points!', th: 'คะแนน!' },
    'hand-phone': { en: 'Hand the phone to the customer to confirm payment.', th: 'ส่งโทรศัพท์ให้ลูกค้าเพื่อยืนยันการชำระเงิน' },
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
    selectedDuration = 0;
    clearInterval(timerInterval);
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
    selectedDuration = 0;
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('begin-session-btn').disabled = true;
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
        selectedDuration = 0;
        document.getElementById('begin-session-btn').disabled = true;
        return;
    }
    selectedDuration = mins;
    sessionFreeMinutes = 0;
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('begin-session-btn').disabled = false;
}

// REDEEM
function redeemFree(mins, cost) {
    if (users[currentUser].points < cost) return;
    users[currentUser].points -= cost;
    saveUsers();
    selectedDuration = mins;
    sessionFreeMinutes = mins;
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('begin-session-btn').disabled = false;
    updatePointsDisplay();
}

// SESSION
function beginSession() {
    if (selectedDuration <= 0) return;
    secondsRemaining = selectedDuration * 60;
    document.getElementById('session-duration').textContent = selectedDuration;
    document.getElementById('timer-display').textContent = formatTime(secondsRemaining);
    document.getElementById('start-timer-btn').classList.remove('hidden');
    document.getElementById('end-session-btn').classList.add('hidden');

    const freeLabel = document.getElementById('session-free-label');
    if (sessionFreeMinutes > 0) {
        freeLabel.textContent = t('free-session') + ' (' + sessionFreeMinutes + ' ' + t('min-word') + ')';
        freeLabel.classList.remove('hidden');
    } else {
        freeLabel.textContent = '';
        freeLabel.classList.add('hidden');
    }

    showScreen('session-screen');
}

function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function startTimer() {
    document.getElementById('start-timer-btn').classList.add('hidden');
    document.getElementById('end-session-btn').classList.remove('hidden');

    timerInterval = setInterval(function () {
        secondsRemaining--;
        document.getElementById('timer-display').textContent = formatTime(secondsRemaining);

        if (secondsRemaining <= 0) {
            clearInterval(timerInterval);
            endSession();
        }
    }, 1000);
}

function endSession() {
    clearInterval(timerInterval);
    const total = selectedDuration * 2;
    const earned = selectedDuration;

    document.getElementById('payment-total').textContent = sessionFreeMinutes > 0 ? 0 : total;
    document.getElementById('points-earned').textContent = earned;
    document.getElementById('payment-password').value = '';
    document.getElementById('payment-error').classList.add('hidden');

    if (sessionFreeMinutes > 0) {
        users[currentUser].points += earned;
        saveUsers();
        showScreen('home-screen');
        updatePointsDisplay();
        updateRedeemButtons();
        alert(t('free-done') + earned + t('points-after'));
        return;
    }

    showScreen('payment-screen');
}

function cancelSession() {
    clearInterval(timerInterval);
    showHome();
}

// PAYMENT
function confirmPayment() {
    const pw = document.getElementById('payment-password').value;
    if (pw === 'jjaakkeelol') {
        const earned = selectedDuration;
        users[currentUser].points += earned;
        saveUsers();
        alert(t('pay-confirmed') + earned + t('points-after'));
        showHome();
    } else {
        document.getElementById('payment-error').textContent = t('pay-error');
        document.getElementById('payment-error').classList.remove('hidden');
    }
}

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
