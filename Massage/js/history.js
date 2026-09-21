// History Management
class HistoryManager {
    constructor() {
        this.paidHistory = [];
        this.freeHistory = [];
    }

    async initialize() {
        this.paidHistory = await storage.getPaidHistory();
        this.freeHistory = await storage.getFreeHistory();
    }

    generateHistoryId() {
        return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async addPaidEntry(durationMinutes, price, pointsEarned) {
        const entry = {
            id: this.generateHistoryId(),
            date: new Date().toISOString(),
            duration: durationMinutes,
            price: price,
            points: pointsEarned,
            timestamp: Date.now()
        };

        try {
            await storage.addPaidHistory(entry);
            this.paidHistory.unshift(entry);
            return entry;
        } catch (error) {
            console.error('Failed to add paid history entry:', error);
            throw error;
        }
    }

    async addFreeEntry(durationMinutes, pointsUsed) {
        const entry = {
            id: this.generateHistoryId(),
            date: new Date().toISOString(),
            duration: durationMinutes,
            pointsUsed: pointsUsed,
            timestamp: Date.now()
        };

        try {
            await storage.addFreeHistory(entry);
            this.freeHistory.unshift(entry);
            return entry;
        } catch (error) {
            console.error('Failed to add free history entry:', error);
            throw error;
        }
    }

    getPaidHistory() {
        return this.paidHistory;
    }

    getFreeHistory() {
        return this.freeHistory;
    }

    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString();
    }

    formatDuration(minutes) {
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const minsDisplay = Number.isInteger(mins) ? mins : mins.toFixed(1);
            return mins > 0 ? `${hours}h ${minsDisplay}m` : `${hours}h`;
        }
        const minutesDisplay = Number.isInteger(minutes) ? minutes : minutes.toFixed(1);
        return `${minutesDisplay} min`;
    }

    formatPrice(price) {
        return `฿${price.toFixed(2)}`;
    }

    formatPoints(points) {
        const pointsDisplay = Number.isInteger(points) ? points : points.toFixed(1);
        return `+${pointsDisplay} points`;
    }

    async refreshHistory() {
        this.paidHistory = await storage.getPaidHistory();
        this.freeHistory = await storage.getFreeHistory();
    }
}

// Create global history manager instance
const historyManager = new HistoryManager();
