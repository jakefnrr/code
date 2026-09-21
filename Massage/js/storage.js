// IndexedDB Storage Manager with Versioning
const DB_NAME = 'MassageAppDB';
const DB_VERSION = 1;

const STORES = {
    POINTS: 'points',
    PAID_HISTORY: 'paidHistory',
    FREE_HISTORY: 'freeHistory',
    TOTALS: 'totals',
    ACTIVE_SESSION: 'activeSession',
    META: 'meta'
};

class StorageManager {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create stores if they don't exist
                if (!db.objectStoreNames.contains(STORES.POINTS)) {
                    db.createObjectStore(STORES.POINTS, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.PAID_HISTORY)) {
                    const paidStore = db.createObjectStore(STORES.PAID_HISTORY, { keyPath: 'id' });
                    paidStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.FREE_HISTORY)) {
                    const freeStore = db.createObjectStore(STORES.FREE_HISTORY, { keyPath: 'id' });
                    freeStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.TOTALS)) {
                    db.createObjectStore(STORES.TOTALS, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.ACTIVE_SESSION)) {
                    db.createObjectStore(STORES.ACTIVE_SESSION, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.META)) {
                    db.createObjectStore(STORES.META, { keyPath: 'id' });
                }
            };
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async set(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Points operations
    async getPoints() {
        const data = await this.get(STORES.POINTS, 'current');
        return data ? data.points : 0;
    }

    async setPoints(points) {
        await this.set(STORES.POINTS, { id: 'current', points, updatedAt: Date.now() });
    }

    async addPoints(pointsToAdd) {
        const currentPoints = await this.getPoints();
        const newPoints = currentPoints + pointsToAdd;
        await this.setPoints(newPoints);
        return newPoints;
    }

    async deductPoints(pointsToDeduct) {
        const currentPoints = await this.getPoints();
        if (currentPoints < pointsToDeduct) {
            throw new Error('Insufficient points');
        }
        const newPoints = currentPoints - pointsToDeduct;
        await this.setPoints(newPoints);
        return newPoints;
    }

    // History operations
    async addPaidHistory(entry) {
        // Check for duplicates
        const existing = await this.get(STORES.PAID_HISTORY, entry.id);
        if (existing) {
            throw new Error('Duplicate entry');
        }
        await this.set(STORES.PAID_HISTORY, entry);
    }

    async addFreeHistory(entry) {
        // Check for duplicates
        const existing = await this.get(STORES.FREE_HISTORY, entry.id);
        if (existing) {
            throw new Error('Duplicate entry');
        }
        await this.set(STORES.FREE_HISTORY, entry);
    }

    async getPaidHistory() {
        const history = await this.getAll(STORES.PAID_HISTORY);
        return history.sort((a, b) => b.timestamp - a.timestamp);
    }

    async getFreeHistory() {
        const history = await this.getAll(STORES.FREE_HISTORY);
        return history.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Totals operations
    async getTotals() {
        const data = await this.get(STORES.TOTALS, 'current');
        return data || {
            id: 'current',
            totalTime: 0,
            moneySpent: 0,
            paidTime: 0,
            freeTime: 0
        };
    }

    async updateTotals(updates) {
        const current = await this.getTotals();
        const updated = { ...current, ...updates };
        await this.set(STORES.TOTALS, updated);
        return updated;
    }

    // Active session operations
    async getActiveSession() {
        return await this.get(STORES.ACTIVE_SESSION, 'current');
    }

    async setActiveSession(session) {
        await this.set(STORES.ACTIVE_SESSION, { id: 'current', ...session });
    }

    async clearActiveSession() {
        await this.delete(STORES.ACTIVE_SESSION, 'current');
    }

    // Meta operations (for version tracking)
    async getMeta() {
        const data = await this.get(STORES.META, 'version');
        return data || { id: 'version', version: DB_VERSION };
    }

    async setMeta(meta) {
        await this.set(STORES.META, meta);
    }

    async clearAllData() {
        const stores = [
            STORES.POINTS,
            STORES.PAID_HISTORY,
            STORES.FREE_HISTORY,
            STORES.TOTALS,
            STORES.ACTIVE_SESSION,
            STORES.META
        ];
        for (const storeName of stores) {
            await this.clear(storeName);
        }
    }
}

// Create global storage instance
const storage = new StorageManager();
