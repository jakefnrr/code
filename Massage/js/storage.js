// Cloud KV Storage Manager (shared for everyone) with local mirror.
// Uses ../shared/cloud-store.js -> GET/POST /api/shared?key=massage:room:global
// Legacy IndexedDB data is imported once so no history is lost.
const MASSAGE_APP = 'massage';
const LEGACY_DB_NAME = 'MassageAppDB';

class StorageManager {
    constructor() {
        this.store = null;
        this.data = { points: 0, paidHistory: [], freeHistory: [], totals: { totalTime: 0, moneySpent: 0, paidTime: 0, freeTime: 0 }, activeSession: null };
        this.saveTimer = null;
    }

    async init() {
        if (window.CloudStore) {
            const room = CloudStore.roomFromURL ? CloudStore.roomFromURL() : 'global';
            this.store = CloudStore.forRoom(MASSAGE_APP, room);
            const cloud = await this.store.load(null);
            if (cloud && typeof cloud === 'object') {
                this.data = { ...this.data, ...cloud };
            } else {
                // No cloud data yet: try legacy IndexedDB, then seed cloud
                await this.importLegacyIndexedDB();
                await this.persist();
            }
        } else {
            // file:// or script missing: localStorage mirror only
            try {
                const raw = localStorage.getItem('cloud:' + MASSAGE_APP + ':room:global');
                if (raw) this.data = { ...this.data, ...JSON.parse(raw) };
            } catch {}
            await this.importLegacyIndexedDB();
        }
        // Poll for shared updates (so all devices see same history/points)
        setInterval(() => this.refreshFromCloud(), 15000);
        window.addEventListener('cloud-sync', () => this.refreshFromCloud());
    }

    async refreshFromCloud() {
        if (!this.store) return;
        try {
            const cloud = await this.store.load(undefined);
            if (cloud && typeof cloud === 'object') {
                this.data = { ...this.data, ...cloud };
                try { localStorage.setItem('cloud:' + MASSAGE_APP + ':room:global', JSON.stringify(this.data)); } catch {}
                if (window.pointsManager) await pointsManager.refreshPoints().catch(() => {});
                if (window.historyManager) await historyManager.refreshHistory().catch(() => {});
                if (window.totalsManager) await totalsManager.refreshTotals().catch(() => {});
                if (window.ui && ui.currentScreen === 'main-screen') ui.renderStats().catch(() => {});
            }
        } catch {}
    }

    async persist(debounced = true) {
        try { localStorage.setItem('cloud:' + MASSAGE_APP + ':room:global', JSON.stringify(this.data)); } catch {}
        if (!this.store) return;
        if (!debounced) { await this.store.save(this.data); return; }
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.store.save(this.data), 600);
    }

    async importLegacyIndexedDB() {
        // One-time import from old IndexedDB stores if cloud/local is empty
        if (this.data.paidHistory.length || this.data.freeHistory.length || this.data.points) return;
        try {
            const openReq = indexedDB.open(LEGACY_DB_NAME);
            const db = await new Promise((res, rej) => { openReq.onsuccess = () => res(openReq.result); openReq.onerror = () => rej(openReq.error); });
            const getAll = (store) => new Promise((res) => {
                try {
                    const tx = db.transaction([store], 'readonly');
                    const rq = tx.objectStore(store).getAll();
                    rq.onsuccess = () => res(rq.result || []);
                    rq.onerror = () => res([]);
                } catch { res([]); }
            });
            const get = (store, key) => new Promise((res) => {
                try {
                    const tx = db.transaction([store], 'readonly');
                    const rq = tx.objectStore(store).get(key);
                    rq.onsuccess = () => res(rq.result);
                    rq.onerror = () => res(null);
                } catch { res(null); }
            });
            const names = Array.from(db.objectStoreNames || []);
            if (names.includes('paidHistory')) this.data.paidHistory = (await getAll('paidHistory')).sort((a, b) => b.timestamp - a.timestamp);
            if (names.includes('freeHistory')) this.data.freeHistory = (await getAll('freeHistory')).sort((a, b) => b.timestamp - a.timestamp);
            if (names.includes('points')) { const p = await get('points', 'current'); if (p) this.data.points = p.points || 0; }
            if (names.includes('totals')) { const t = await get('totals', 'current'); if (t) this.data.totals = { ...this.data.totals, ...t }; }
            if (names.includes('activeSession')) { const s = await get('activeSession', 'current'); if (s) this.data.activeSession = s; }
            db.close();
        } catch {}
    }

    // ---- Points ----
    async getPoints() { return this.data.points || 0; }
    async setPoints(points) { this.data.points = points; await this.persist(); }
    async addPoints(n) { this.data.points = (this.data.points || 0) + n; await this.persist(); return this.data.points; }
    async deductPoints(n) {
        if ((this.data.points || 0) < n) throw new Error('Insufficient points');
        this.data.points -= n; await this.persist(); return this.data.points;
    }

    // ---- History ----
    async addPaidHistory(entry) {
        if (this.data.paidHistory.some(e => e.id === entry.id)) throw new Error('Duplicate entry');
        this.data.paidHistory.unshift(entry);
        this.data.paidHistory.sort((a, b) => b.timestamp - a.timestamp);
        await this.persist();
    }
    async addFreeHistory(entry) {
        if (this.data.freeHistory.some(e => e.id === entry.id)) throw new Error('Duplicate entry');
        this.data.freeHistory.unshift(entry);
        this.data.freeHistory.sort((a, b) => b.timestamp - a.timestamp);
        await this.persist();
    }
    async getPaidHistory() { return [...this.data.paidHistory].sort((a, b) => b.timestamp - a.timestamp); }
    async getFreeHistory() { return [...this.data.freeHistory].sort((a, b) => b.timestamp - a.timestamp); }
    async getAllHistory() {
        const paid = this.data.paidHistory.map(e => ({ ...e, type: 'paid' }));
        const free = this.data.freeHistory.map(e => ({ ...e, type: 'free' }));
        return [...paid, ...free].sort((a, b) => b.timestamp - a.timestamp);
    }

    // ---- Totals ----
    async getTotals() { return { id: 'current', ...this.data.totals }; }
    async updateTotals(updates) { this.data.totals = { ...this.data.totals, ...updates }; await this.persist(); return this.getTotals(); }

    // ---- Active session ----
    async getActiveSession() { return this.data.activeSession; }
    async setActiveSession(session) { this.data.activeSession = { id: 'current', ...session }; await this.persist(false); }
    async clearActiveSession() { this.data.activeSession = null; await this.persist(false); }

    async getMeta() { return { id: 'version', version: 2 }; }
    async setMeta() {}
    async clearAllData() {
        this.data = { points: 0, paidHistory: [], freeHistory: [], totals: { totalTime: 0, moneySpent: 0, paidTime: 0, freeTime: 0 }, activeSession: null };
        await this.persist(false);
    }

    syncStatus() { return this.store ? this.store.status() : 'local-only'; }
}

const storage = new StorageManager();
