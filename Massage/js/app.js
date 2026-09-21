// Main App Controller
const PAYMENT_PASSWORD = 'jjaakkeelol';
let isProcessingPayment = false;

async function initializeApp() {
    try {
        // Initialize storage
        await storage.init();

        // Initialize managers
        await pointsManager.initialize();
        await historyManager.initialize();
        await totalsManager.initialize();

        // Initialize UI components
        ui.initializeCustomDisplay();

        // Check for active session recovery
        const recoveredSession = await sessionManager.recoverSession();
        if (recoveredSession) {
            ui.showActiveSession(
                Math.floor(recoveredSession.duration / 60),
                recoveredSession.price,
                recoveredSession.isPaid
            );
        } else {
            // Refresh all displays
            await ui.refreshAllDisplays();
        }

        // Setup event listeners
        setupEventListeners();

        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('Failed to initialize the app. Please refresh the page.');
    }
}

function setupEventListeners() {
    // Duration buttons
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const minutes = parseInt(btn.dataset.minutes);
            const price = parseFloat(btn.dataset.price);
            ui.selectDuration(minutes, price);
            ui.showSessionSetup(minutes, price);
        });
    });

    // Custom slider
    const customSlider = document.getElementById('custom-slider');
    customSlider.addEventListener('input', (e) => {
        const seconds = parseInt(e.target.value);
        ui.updateCustomDisplay(seconds);
    });

    // Custom start button
    document.getElementById('custom-start-btn').addEventListener('click', () => {
        const seconds = ui.customDuration;
        const minutes = seconds / 60;
        const price = seconds / 30; // 30 seconds = 1 baht, so 1 second = 1/30 baht
        ui.showSessionSetup(minutes, price);
    });

    // Free massage buttons
    document.getElementById('free-5min').addEventListener('click', () => startFreeMassage(5, 30));
    document.getElementById('free-10min').addEventListener('click', () => startFreeMassage(10, 60));
    document.getElementById('free-15min').addEventListener('click', () => startFreeMassage(15, 90));

    // Session setup back button
    document.getElementById('session-setup-back').addEventListener('click', () => {
        ui.returnToMain();
    });

    // Start session button
    document.getElementById('start-session-btn').addEventListener('click', startPaidSession);

    // Free session setup back button
    document.getElementById('free-session-setup-back').addEventListener('click', () => {
        ui.returnToMain();
    });

    // Start free session button
    document.getElementById('start-free-session-btn').addEventListener('click', () => {
        const minutes = parseInt(document.getElementById('free-session-setup-title').textContent.match(/\d+/)[0]);
        startFreeSession(minutes);
    });

    // Finish session button
    document.getElementById('finish-session-btn').addEventListener('click', finishSession);

    // Confirm payment button
    document.getElementById('confirm-payment-btn').addEventListener('click', confirmPayment);

    // Return to main button
    document.getElementById('return-btn').addEventListener('click', () => {
        ui.returnToMain();
    });

    // Password input enter key
    document.getElementById('password-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmPayment();
        }
    });

    // Clear all data button
    document.getElementById('clear-all-btn').addEventListener('click', clearAllData);
}

async function clearAllData() {
    const confirmed = confirm('Are you sure you want to clear ALL data? This cannot be undone.');
    if (!confirmed) {
        return;
    }

    try {
        if (sessionManager.timerInterval) {
            clearInterval(sessionManager.timerInterval);
            sessionManager.timerInterval = null;
        }
        sessionManager.clearCurrentSession();

        await storage.clearAllData();
        await pointsManager.initialize();
        await historyManager.initialize();
        await totalsManager.initialize();
        await ui.refreshAllDisplays();
        alert('All data cleared.');
    } catch (error) {
        console.error('Failed to clear data:', error);
        alert('Failed to clear data. Please try again.');
    }
}

async function startPaidSession() {
    try {
        // Use the pending session setup data from UI manager
        const sessionSetup = ui.pendingSessionSetup;
        if (!sessionSetup) {
            throw new Error('Session setup data not found');
        }

        const { minutes, price } = sessionSetup;
        const durationSeconds = Math.round(minutes * 60);

        await sessionManager.startSession(durationSeconds, price, true);
        ui.showActiveSession(minutes, price, true);
    } catch (error) {
        console.error('Failed to start session:', error);
        alert('Failed to start session. Please try again.');
    }
}

async function startFreeMassage(minutes, requiredPoints) {
    try {
        const points = await pointsManager.getPoints();
        if (points < requiredPoints) {
            alert(`You need ${requiredPoints} points for a free ${minutes} minute massage.`);
            return;
        }

        ui.showFreeSessionSetup(minutes);
    } catch (error) {
        console.error('Failed to check points:', error);
        alert('Failed to check points. Please try again.');
    }
}

async function startFreeSession(minutes) {
    try {
        const requiredPoints = minutes * 6; // 5 min = 30 points, so 1 min = 6 points
        const durationSeconds = minutes * 60;

        // Deduct points
        await pointsManager.deductPoints(requiredPoints);

        // Start session
        await sessionManager.startSession(durationSeconds, 0, false);
        ui.showActiveSession(minutes, 0, false);
    } catch (error) {
        console.error('Failed to start free session:', error);
        if (error.message === 'Insufficient points') {
            alert('Not enough points for this free massage.');
        } else {
            alert('Failed to start free session. Please try again.');
        }
    }
}

async function finishSession() {
    try {
        const session = await sessionManager.finishSession();
        
        if (session.isPaid) {
            // Show payment screen for paid sessions
            // Session data is still available in sessionManager.getCurrentSession()
            ui.showPaymentScreen(session.price);
        } else {
            // Free session - just record and return to main
            const minutes = session.duration / 60;
            const pointsUsed = minutes * 6; // 1 min = 6 points for free massages

            await historyManager.addFreeEntry(minutes, pointsUsed);
            await totalsManager.updateTotals(minutes, 0, false);
            
            // Clear session data
            sessionManager.clearCurrentSession();

            ui.showSuccessScreen('Free Massage Completed!');
        }
    } catch (error) {
        console.error('Failed to finish session:', error);
        alert('Failed to finish session. Please try again.');
    }
}

async function confirmPayment() {
    if (isProcessingPayment) {
        return; // Prevent duplicate payments
    }

    const password = document.getElementById('password-input').value;
    
    if (!password) {
        ui.showPaymentError('Please enter the password');
        return;
    }

    isProcessingPayment = true;

    try {
        if (password !== PAYMENT_PASSWORD) {
            ui.showPaymentError('Incorrect password. Please try again.');
            isProcessingPayment = false;
            return;
        }

        // Get session data from session manager
        const session = sessionManager.getCurrentSession();
        if (!session) {
            ui.showPaymentError('Session data not found. Please try again.');
            isProcessingPayment = false;
            return;
        }

        const minutes = session.duration / 60;
        const price = session.price;
        const pointsEarned = minutes; // 1 minute = 1 point

        // Add to history (includes duplicate check)
        await historyManager.addPaidEntry(minutes, price, pointsEarned);

        // Queue points to be counted up on the main screen
        ui.pendingPointsAward = pointsEarned;

        // Update totals
        await totalsManager.updateTotals(minutes, price, true);

        // Clear session data
        sessionManager.clearCurrentSession();

        ui.showSuccessScreen('Payment Confirmed!');
    } catch (error) {
        console.error('Payment confirmation failed:', error);
        if (error.message === 'Duplicate entry') {
            ui.showPaymentError('This payment has already been processed.');
        } else {
            ui.showPaymentError('Payment confirmation failed. Please try again.');
        }
    } finally {
        isProcessingPayment = false;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
