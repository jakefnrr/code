// Totals Calculation
class TotalsManager {
    constructor() {
        this.totals = {
            totalTime: 0,
            moneySpent: 0,
            paidTime: 0,
            freeTime: 0
        };
    }

    async initialize() {
        this.totals = await storage.getTotals();
    }

    async updateTotals(durationMinutes, price, isPaid) {
        const durationSeconds = durationMinutes * 60;

        if (isPaid) {
            this.totals.totalTime += durationSeconds;
            this.totals.moneySpent += price;
            this.totals.paidTime += durationSeconds;
        } else {
            this.totals.totalTime += durationSeconds;
            this.totals.freeTime += durationSeconds;
        }

        await storage.updateTotals(this.totals);
    }

    getTotals() {
        return { ...this.totals };
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    formatTimeMinutes(seconds) {
        const totalMinutes = seconds / 60;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0) {
            const minsDisplay = Number.isInteger(minutes) ? minutes : minutes.toFixed(1);
            return minutes > 0 ? `${hours}h ${minsDisplay}m` : `${hours}h`;
        }
        const minutesDisplay = Number.isInteger(totalMinutes) ? totalMinutes : totalMinutes.toFixed(1);
        return `${minutesDisplay}m`;
    }

    formatMoney(amount) {
        return `฿${amount.toFixed(2)}`;
    }

    async refreshTotals() {
        this.totals = await storage.getTotals();
    }
}

// Create global totals manager instance
const totalsManager = new TotalsManager();
