// Points System
class PointsManager {
    constructor() {
        this.currentPoints = 0;
    }

    async initialize() {
        this.currentPoints = await storage.getPoints();
    }

    async getPoints() {
        return this.currentPoints;
    }

    async awardPoints(minutes) {
        // Points are proportional to minutes (1 minute = 1 point)
        // Support half points for custom durations
        const pointsToAdd = minutes;
        const newPoints = await storage.addPoints(pointsToAdd);
        this.currentPoints = newPoints;
        return newPoints;
    }

    async deductPoints(pointsToDeduct) {
        if (this.currentPoints < pointsToDeduct) {
            throw new Error('Insufficient points');
        }
        const newPoints = await storage.deductPoints(pointsToDeduct);
        this.currentPoints = newPoints;
        return newPoints;
    }

    hasEnoughPoints(required) {
        return this.currentPoints >= required;
    }

    async refreshPoints() {
        this.currentPoints = await storage.getPoints();
    }
}

// Create global points manager instance
const pointsManager = new PointsManager();
