// UI Manager
function freeMassageCost(minutes) {
    if (minutes === 5) return 50;
    if (minutes === 10) return 120;
    if (minutes === 15) return 220;
    return minutes * 10;
}

class UIManager {
    constructor() {
        this.selectedDuration = null;
        this.customDuration = 300; // 5 minutes in seconds
        this.currentScreen = 'main';
        this.pendingSessionSetup = null;
        this.pendingFreeSessionMin = null;
        this.pendingFreeMassage = null;
        this.currentPoints = 0;
        this.pendingPointsAward = 0;
        this.pointsBurstTimeout = null;
        this.pointsBurstInterval = null;
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;

        // Points only count up on the main screen, right after a massage
        if (screenId !== 'main-screen') {
            this.stopPointsBurst();
        }
    }

    deliverPendingPoints() {
        if (this.pendingPointsAward <= 0) {
            return;
        }

        const award = this.pendingPointsAward;
        const stepInterval = award <= 10 ? 200 : 100;

        this.pointsBurstTimeout = setTimeout(() => {
            let count = 0;
            this.pointsBurstInterval = setInterval(() => {
                count++;
                pointsManager.currentPoints += 1;
                this.pendingPointsAward -= 1;
                storage.setPoints(pointsManager.currentPoints).catch(err => {
                    console.error('Failed to save points:', err);
                });

                if (count >= award) {
                    clearInterval(this.pointsBurstInterval);
                    this.pointsBurstInterval = null;
                }
            }, stepInterval);
        }, 300);
    }

    stopPointsBurst() {
        if (this.pointsBurstTimeout) {
            clearTimeout(this.pointsBurstTimeout);
            this.pointsBurstTimeout = null;
        }
        if (this.pointsBurstInterval) {
            clearInterval(this.pointsBurstInterval);
            this.pointsBurstInterval = null;
        }

        if (this.pendingPointsAward > 0) {
            pointsManager.currentPoints += this.pendingPointsAward;
            this.pendingPointsAward = 0;
            storage.setPoints(pointsManager.currentPoints).catch(err => {
                console.error('Failed to save points:', err);
            });
        }
    }

    selectDuration(minutes, price) {
        // Clear previous selection
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Select new duration
        const btn = document.querySelector(`.duration-btn[data-minutes="${minutes}"]`);
        if (btn) {
            btn.classList.add('selected');
        }

        this.selectedDuration = { minutes, price };
    }

    showSessionSetup(minutes, price) {
        const minutesDisplay = Number.isInteger(minutes) ? minutes : minutes.toFixed(1);
        document.getElementById('session-setup-title').textContent = `START A ${minutesDisplay} MINUTE MASSAGE?`;
        document.getElementById('session-setup-duration').textContent = `${minutesDisplay} MIN`;
        document.getElementById('session-setup-price').textContent = `฿${price.toFixed(2)}`;
        document.getElementById('start-session-btn').textContent = 'START MASSAGE';
        // Store the session data for the start button to use
        this.pendingSessionSetup = { minutes, price };
        this.showScreen('session-setup-screen');
    }

    showFreeSessionSetup(minutes) {
        this.pendingFreeSessionMin = minutes;
        document.getElementById('free-session-setup-title').textContent = `FREE ${minutes} MIN MASSAGE`;
        document.getElementById('start-free-session-btn').textContent = 'START MASSAGE';
        this.showScreen('free-session-setup-screen');
    }

    showActiveSession(duration, price, isPaid) {
        const durationDisplay = Number.isInteger(duration) ? duration : duration.toFixed(1);
        document.getElementById('active-duration').textContent = `${durationDisplay} min`;
        document.getElementById('active-price').textContent = isPaid ? `฿${price.toFixed(2)}` : 'FREE';
        document.getElementById('timer-message').textContent = isPaid
            ? `Start a ${durationDisplay} min timer`
            : `Start a ${durationDisplay} min timer for the free massage`;
        document.getElementById('active-status').textContent = 'In Progress';
        this.showScreen('active-session-screen');
    }

    showPaymentScreen(price) {
        this.pendingFreeMassage = null;
        document.getElementById('payment-title').textContent = `PAY JAKE ฿${price}`;
        document.getElementById('payment-instruction').textContent = 'Pass the device to Jake so he can enter the password to confirm that you have paid him.';
        document.getElementById('points-needed').textContent = '';
        document.getElementById('confirm-payment-btn').textContent = 'CONFIRM PAYMENT';
        document.getElementById('password-input').value = '';
        document.getElementById('payment-error').textContent = '';
        this.showScreen('payment-screen');
    }

    showFreePasswordScreen(minutes) {
        this.pendingFreeMassage = minutes;
        document.getElementById('payment-title').textContent = `FREE ${minutes} MIN MASSAGE`;
        document.getElementById('payment-instruction').textContent = `Pass the device to Jake so he can enter the password to confirm you have enough points for the free ${minutes} min massage.`;
        document.getElementById('points-needed').textContent = `${freeMassageCost(minutes)} POINTS`;
        document.getElementById('confirm-payment-btn').textContent = 'CONFIRM FREE MASSAGE';
        document.getElementById('password-input').value = '';
        document.getElementById('payment-error').textContent = '';
        this.showScreen('payment-screen');
    }

    showPaymentError(message) {
        document.getElementById('payment-error').textContent = message;
    }

    showSuccessScreen(message) {
        document.getElementById('success-message').textContent = message;
        this.showScreen('success-screen');
    }

    updateCustomDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const price = seconds / 30; // 30 seconds = 1 baht, so 1 second = 1/30 baht

        document.getElementById('custom-minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('custom-seconds').textContent = remainingSeconds.toString().padStart(2, '0');
        document.getElementById('custom-price').textContent = `฿${price.toFixed(2)}`;

        this.customDuration = seconds;
    }

    updateFreeMassageButtons() {
        const free5Min = document.getElementById('free-5min');
        const free10Min = document.getElementById('free-10min');
        const free15Min = document.getElementById('free-15min');

        free5Min.disabled = false;
        free5Min.classList.remove('locked');
        free5Min.classList.add('unlocked');
        free10Min.disabled = false;
        free10Min.classList.remove('locked');
        free10Min.classList.add('unlocked');
        free15Min.disabled = false;
        free15Min.classList.remove('locked');
        free15Min.classList.add('unlocked');
    }

    initializeCustomDisplay() {
        this.updateCustomDisplay(300);
    }

    async refreshAllDisplays() {
        // Refresh points
        await pointsManager.refreshPoints();
        const points = await pointsManager.getPoints();
        this.currentPoints = points;

        // Update free massage buttons
        this.updateFreeMassageButtons();
    }

    async returnToMain() {
        this.selectedDuration = null;
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        this.showScreen('main-screen');
        await this.refreshAllDisplays();
        this.deliverPendingPoints();
    }
}

// Create global UI manager instance
const ui = new UIManager();
