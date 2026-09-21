// UI Manager
class UIManager {
    constructor() {
        this.selectedDuration = null;
        this.customDuration = 300; // 5 minutes in seconds
        this.currentScreen = 'main';
        this.pendingSessionSetup = null;
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

        this.pointsBurstTimeout = setTimeout(() => {
            let count = 0;
            this.pointsBurstInterval = setInterval(() => {
                count++;
                pointsManager.currentPoints += 1;
                this.pendingPointsAward -= 1;
                this.updatePointsDisplay(pointsManager.currentPoints);
                this.updateFreeMassageButtons(pointsManager.currentPoints);
                this.animatePointsPop();
                storage.setPoints(pointsManager.currentPoints).catch(err => {
                    console.error('Failed to save points:', err);
                });

                if (count >= award) {
                    clearInterval(this.pointsBurstInterval);
                    this.pointsBurstInterval = null;
                }
            }, 100);
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

        // Make sure any remaining points aren't lost
        if (this.pendingPointsAward > 0) {
            pointsManager.currentPoints += this.pendingPointsAward;
            this.pendingPointsAward = 0;
            this.updatePointsDisplay(pointsManager.currentPoints);
            this.updateFreeMassageButtons(pointsManager.currentPoints);
            storage.setPoints(pointsManager.currentPoints).catch(err => {
                console.error('Failed to save points:', err);
            });
        }
    }

    animatePointsPop() {
        ['points-display', 'total-points'].forEach(id => {
            const el = document.getElementById(id);
            el.classList.remove('points-bump');
            void el.offsetWidth;
            el.classList.add('points-bump');
        });
    }

    updatePointsDisplay(points) {
        document.getElementById('points-display').textContent = points;
        document.getElementById('total-points').textContent = points;
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
            : `Start a ${durationDisplay} min free massage`;
        document.getElementById('active-status').textContent = 'In Progress';
        this.showScreen('active-session-screen');
    }

    showPaymentScreen(price) {
        document.getElementById('payment-title').textContent = `PAY JAKE ฿${price}`;
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

    updateFreeMassageButtons(points) {
        const free5Min = document.getElementById('free-5min');
        const free10Min = document.getElementById('free-10min');
        const free15Min = document.getElementById('free-15min');

        // 5 min = 30 points
        if (points >= 30) {
            free5Min.disabled = false;
            free5Min.classList.remove('locked');
            free5Min.classList.add('unlocked');
        } else {
            free5Min.disabled = true;
            free5Min.classList.add('locked');
            free5Min.classList.remove('unlocked');
        }

        // 10 min = 60 points
        if (points >= 60) {
            free10Min.disabled = false;
            free10Min.classList.remove('locked');
            free10Min.classList.add('unlocked');
        } else {
            free10Min.disabled = true;
            free10Min.classList.add('locked');
            free10Min.classList.remove('unlocked');
        }

        // 15 min = 90 points
        if (points >= 90) {
            free15Min.disabled = false;
            free15Min.classList.remove('locked');
            free15Min.classList.add('unlocked');
        } else {
            free15Min.disabled = true;
            free15Min.classList.add('locked');
            free15Min.classList.remove('unlocked');
        }
    }

    updateHistory(history) {
        const container = document.getElementById('paid-history');
        
        if (history.length === 0) {
            container.innerHTML = '<div class="history-empty">No massages yet</div>';
            return;
        }

        container.innerHTML = history.map(entry => {
            if (entry.pointsUsed !== undefined) {
                return `
                    <div class="history-item">
                        <div class="history-date">${historyManager.formatDate(entry.date)}</div>
                        <div class="history-details">
                            <span class="history-duration">${historyManager.formatDuration(entry.duration)}</span>
                            <span class="history-amount">FREE</span>
                            <span class="history-points">${historyManager.formatPoints(entry.duration)}</span>
                        </div>
                    </div>
                `;
            }
            return `
                <div class="history-item">
                    <div class="history-date">${historyManager.formatDate(entry.date)}</div>
                    <div class="history-details">
                        <span class="history-duration">${historyManager.formatDuration(entry.duration)}</span>
                        <span class="history-amount">${historyManager.formatPrice(entry.price)}</span>
                        <span class="history-points">${historyManager.formatPoints(entry.points)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateTotals(totals) {
        document.getElementById('total-time').textContent = totalsManager.formatTime(totals.totalTime);
        document.getElementById('total-spent').textContent = totalsManager.formatMoney(totals.moneySpent);
        document.getElementById('paid-time').textContent = totalsManager.formatTimeMinutes(totals.paidTime);
        document.getElementById('free-time').textContent = totalsManager.formatTimeMinutes(totals.freeTime);
        document.getElementById('total-points').textContent = this.currentPoints || 0;
    }

    initializeCustomDisplay() {
        this.updateCustomDisplay(300);
    }

    async refreshAllDisplays() {
        // Refresh points
        await pointsManager.refreshPoints();
        const points = await pointsManager.getPoints();
        this.currentPoints = points;
        this.updatePointsDisplay(points);

        // Refresh history
        await historyManager.refreshHistory();
        const allHistory = historyManager.getPaidHistory()
            .concat(historyManager.getFreeHistory())
            .sort((a, b) => b.timestamp - a.timestamp);
        this.updateHistory(allHistory);

        // Refresh totals
        await totalsManager.refreshTotals();
        this.updateTotals(totalsManager.getTotals());

        // Update free massage buttons
        this.updateFreeMassageButtons(points);
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
