// Session Management with Timer Recovery
class SessionManager {
    constructor() {
        this.currentSession = null;
        this.timerInterval = null;
        this.isPaid = true;
    }

    async startSession(durationSeconds, price, isPaid = true) {
        // Check for existing active session
        const existingSession = await storage.getActiveSession();
        if (existingSession) {
            throw new Error('Session already in progress');
        }

        const sessionId = this.generateSessionId();
        const startTime = Date.now();
        const endTime = startTime + (durationSeconds * 1000);

        this.currentSession = {
            id: sessionId,
            duration: durationSeconds,
            price: price,
            isPaid: isPaid,
            startTime: startTime,
            endTime: endTime,
            status: 'active'
        };

        // Save to storage
        await storage.setActiveSession(this.currentSession);

        return this.currentSession;
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getRemainingTime() {
        if (!this.currentSession) return 0;

        const now = Date.now();
        const remaining = Math.max(0, this.currentSession.endTime - now);
        return Math.ceil(remaining / 1000);
    }

    async recoverSession() {
        const savedSession = await storage.getActiveSession();
        if (!savedSession) {
            return null;
        }

        // Check if session is still valid
        const now = Date.now();
        if (now >= savedSession.endTime) {
            // Session has finished
            savedSession.status = 'completed';
            await storage.clearActiveSession();
            return null;
        }

        this.currentSession = savedSession;
        this.isPaid = savedSession.isPaid;

        return this.currentSession;
    }

    async finishSession() {
        if (!this.currentSession) {
            throw new Error('No active session');
        }

        const sessionData = { ...this.currentSession };
        
        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Clear from storage
        await storage.clearActiveSession();

        // Keep currentSession for potential use in payment
        // Will be cleared after payment confirmation
        
        return sessionData;
    }

    async cancelSession() {
        if (!this.currentSession) {
            throw new Error('No active session');
        }

        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Clear from storage
        await storage.clearActiveSession();

        this.currentSession = null;
    }

    getCurrentSession() {
        return this.currentSession;
    }

    clearCurrentSession() {
        this.currentSession = null;
    }

    isSessionActive() {
        return this.currentSession !== null;
    }
}

// Create global session manager instance
const sessionManager = new SessionManager();
