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

        // Update the single toggle button label (only on main/stats screens)
        const toggle = document.getElementById('screen-toggle-btn');
        if (toggle) {
            const onStats = screenId === 'stats-screen';
            const showToggle = screenId === 'main-screen' || onStats;
            toggle.style.display = showToggle ? 'block' : 'none';
            toggle.textContent = onStats ? '← GO TO MAIN' : 'GO TO STATS →';
            toggle.dataset.screen = onStats ? 'stats' : 'main';
        }

        // Points only count up on the main screen, right after a massage
        if (screenId !== 'main-screen') {
            this.stopPointsBurst();
        }

        // Stats screen needs fresh data every time it opens
        if (screenId === 'stats-screen') {
            this.renderStats().catch(() => {});
        }
    }

    toggleScreen() {
        if (this.currentScreen === 'stats-screen') {
            this.returnToMain();
        } else {
            this.showScreen('stats-screen');
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
        await this.renderStats();
    }

    async renderStats() {
        const points = await pointsManager.getPoints();
        const pv = document.getElementById('points-value');
        if (pv) pv.textContent = Number.isInteger(points) ? points : points.toFixed(1);
        const ss = document.getElementById('sync-status');
        if (ss && window.storage) ss.textContent = storage.syncStatus ? storage.syncStatus() : '';

        await historyManager.refreshHistory().catch(() => {});
        await totalsManager.refreshTotals().catch(() => {});
        const t = totalsManager.getTotals();
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('total-time', totalsManager.formatTimeMinutes(t.totalTime || 0));
        set('total-money', totalsManager.formatMoney(t.moneySpent || 0));
        set('total-paid', totalsManager.formatTimeMinutes(t.paidTime || 0));
        set('total-free', totalsManager.formatTimeMinutes(t.freeTime || 0));

        const lists = [document.getElementById('history-list'), document.getElementById('history-list-main')].filter(Boolean);
        if (!lists.length) return;
        const paid = historyManager.getPaidHistory().map(e => ({ ...e, type: 'paid' }));
        const free = historyManager.getFreeHistory().map(e => ({ ...e, type: 'free' }));
        const all = [...paid, ...free].sort((a, b) => b.timestamp - a.timestamp);
        set('total-count', String(all.length));
        const html = !all.length
            ? '<div class="history-empty">No massages yet — your full history will show up here.</div>'
            : all.map(e => {
            const date = historyManager.formatDate(e.date || new Date(e.timestamp).toISOString());
            const dur = historyManager.formatDuration(e.duration) + (e.note ? ` · ${e.note}` : '');
            const right = e.type === 'paid'
                ? `<span class="history-amount">${historyManager.formatPrice(e.price)}</span> <span class="history-points">${historyManager.formatPoints(e.points)}</span>`
                : `<span class="history-amount">FREE</span> <span class="history-points">-${e.pointsUsed || 0} pts</span>`;
            const tag = e.type === 'paid' ? 'PAID' : 'FREE';
            return `<div class="history-item"><div class="history-date">${date} · ${tag}</div><div class="history-details"><span class="history-duration">${dur}</span>${right}</div></div>`;
        }).join('');
        lists.forEach(l => { l.innerHTML = html; });
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

    shortDate(isoOrTs) {
        try {
            const d = new Date(typeof isoOrTs === 'number' ? isoOrTs : (isoOrTs || Date.now()));
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
        } catch { return ''; }
    }

    reportLine(e) {
        const mins = Number.isInteger(e.duration) ? e.duration : (+e.duration).toFixed(1);
        const note = (e.note || '').trim();
        const notePart = note ? ` ${note}.` : '.';
        const datePart = e.date ? ` ${this.shortDate(e.date)}` : '';
        if (e.type === 'free') {
            const pts = e.pointsUsed || 0;
            return `FREE : ${mins} min${notePart} (-${pts} points)${datePart}`;
        }
        return `${(+e.price).toFixed(2)} Baht : ${mins} min${notePart}${datePart}`;
    }

    async buildStatsReport() {
        await historyManager.refreshHistory().catch(() => {});
        await pointsManager.refreshPoints().catch(() => {});
        const points = await pointsManager.getPoints();
        const paid = historyManager.getPaidHistory().map(e => ({ ...e, type: 'paid' }));
        const free = historyManager.getFreeHistory().map(e => ({ ...e, type: 'free' }));
        const all = [...paid, ...free].sort((a, b) => b.timestamp - a.timestamp);
        const lines = [];
        lines.push('MASSAGE');
        lines.push('');
        lines.push(`TOTAL POINTS: ${Number.isInteger(points) ? points : (+points).toFixed(1)}`);
        lines.push('');
        lines.push('');
        lines.push('FREE MASSAGES:');
        lines.push('5 min = 50 points');
        lines.push('10 min = 120 points');
        lines.push('15 min = 220 points');
        lines.push('');
        lines.push('');
        lines.push('HISTORY:');
        lines.push('');
        all.forEach(e => lines.push(this.reportLine(e)));
        lines.push('');
        lines.push('Keep this whole report and paste it into Restore Stats to bring everything back.');
        lines.push('');
        lines.push('---MASSAGE-DATA-START---');
        lines.push(JSON.stringify({
            points,
            paidHistory: historyManager.getPaidHistory(),
            freeHistory: historyManager.getFreeHistory(),
            totals: totalsManager.getTotals()
        }));
        lines.push('---MASSAGE-DATA-END---');
        return lines.join('\n');
    }

    async copyStatsReport() {
        const out = document.getElementById('stats-report-out');
        const state = document.getElementById('copy-state');
        const text = await this.buildStatsReport();
        if (out) out.value = text;
        const done = (msg, ok) => { if (state) { state.textContent = msg; state.style.color = ok ? '#4ecca3' : '#ff6b6b'; } };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try { await navigator.clipboard.writeText(text); done('Copied — paste it into your notes app.', true); }
            catch { if (out) { out.focus(); out.select(); } done('Copy was blocked, so the text is selected — press Cmd/Ctrl + C.', false); }
            return;
        }
        if (out) { out.focus(); out.select(); }
        let ok = false;
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        done(ok ? 'Copied — paste it into your notes app.' : 'Copy was blocked, so the text is selected — press Cmd/Ctrl + C.', ok);
    }

    parseRestoreText(text) {
        const raw = String(text || '').trim();
        if (!raw) return null;
        // 1) Exact JSON block (preferred)
        const si = raw.indexOf('---MASSAGE-DATA-START---');
        const ei = raw.indexOf('---MASSAGE-DATA-END---');
        if (si !== -1 && ei !== -1 && ei > si) {
            try {
                const data = JSON.parse(raw.slice(si + '---MASSAGE-DATA-START---'.length, ei).trim());
                if (data && (Array.isArray(data.paidHistory) || Array.isArray(data.freeHistory))) return { exact: true, data };
            } catch {}
        }
        if ((raw[0] === '{' || raw[0] === '[')) {
            try {
                const data = JSON.parse(raw);
                const d = Array.isArray(data) ? { paidHistory: data } : data;
                if (d && (Array.isArray(d.paidHistory) || Array.isArray(d.freeHistory))) return { exact: true, data: d };
            } catch {}
        }
        // 2) Human-readable lines like "20.00 Baht: 10 min knee massage. Wed Sep 30" / "FREE : 5 min knee massage. (-50 points) Sat Sep 26"
        const paid = [], free = [];
        const nowYear = new Date().getFullYear();
        const parseDate = (s) => {
            if (!s) return null;
            const t = s.trim();
            // "Wed Sep 30" style (no year): pin to current year FIRST,
            // because Date.parse defaults year-less dates to 2001.
            let d = new Date(`${t} ${nowYear}`);
            if (!isNaN(d.getTime())) return d;
            d = new Date(t);
            if (!isNaN(d.getTime())) return d;
            return null;
        };
        const mkId = () => `history_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        for (const lineRaw of raw.split('\n')) {
            const line = lineRaw.trim();
            if (!line || /^(MASSAGE|TOTAL POINTS|FREE MASSAGES|HISTORY|Keep this whole|---MASSAGE|5 min =|10 min =|15 min =)/i.test(line)) continue;
            let m = line.match(/^FREE\s*:?\s*(\d+(?:\.\d+)?)\s*min\s*(.*?)(?:\(\s*-?\s*(\d+)\s*points?\s*\))?\s*([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2})?\s*$/i);
            if (m) {
                const mins = parseFloat(m[1]);
                let note = (m[2] || '').replace(/^[.\-:]+|[.\-:]+$/g, '').trim();
                const pts = m[3] ? parseInt(m[3], 10) : (mins === 5 ? 50 : mins === 10 ? 120 : mins === 15 ? 220 : mins * 10);
                const d = parseDate(m[4]);
                const ts = d ? d.getTime() : Date.now();
                free.push({ id: mkId() + Math.random().toString(36).slice(2, 6), date: d ? d.toISOString() : new Date(ts).toISOString(), duration: mins, pointsUsed: pts, note, timestamp: ts });
                continue;
            }
            m = line.match(/^(\d+(?:\.\d+)?)\s*Baht\s*:?\s*(\d+(?:\.\d+)?)\s*min\s*(.*?)([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2})?\s*$/i);
            if (m) {
                const price = parseFloat(m[1]), mins = parseFloat(m[2]);
                let rest = (m[3] || '').trim();
                const dm = rest.match(/([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2})\s*$/);
                const dateStr = m[4] || (dm ? dm[1] : '');
                if (dm) rest = rest.slice(0, dm.index).trim();
                rest = rest.replace(/\(\s*\+\s*(\d+(?:\.\d+)?)\s*min\s*free\s*\)\.?/gi, '').replace(/^[.\-:]+|[.\-:]+$/g, '').trim();
                const d = parseDate(dateStr);
                const ts = d ? d.getTime() : Date.now();
                paid.push({ id: mkId() + Math.random().toString(36).slice(2, 6), date: d ? d.toISOString() : new Date(ts).toISOString(), duration: mins, price, points: mins, note: rest, timestamp: ts });
            }
        }
        if (!paid.length && !free.length) return null;
        // Recompute points from paid lines if TOTAL POINTS header present
        let points = 0;
        const pm = raw.match(/TOTAL POINTS\s*:\s*(\d+(?:\.\d+)?)/i);
        if (pm) points = parseFloat(pm[1]);
        else points = paid.reduce((s, e) => s + e.duration, 0) - free.reduce((s, e) => s + (e.pointsUsed || 0), 0);
        return { exact: false, data: { points, paidHistory: paid, freeHistory: free } };
    }

    async restoreStatsReport() {
        const input = document.getElementById('stats-restore-in');
        const state = document.getElementById('restore-state');
        const done = (msg, ok) => { if (state) { state.textContent = msg; state.style.color = ok ? '#4ecca3' : '#ff6b6b'; } };
        const text = String((input && input.value) || '').trim();
        if (!text) { done('Paste your saved stats first.', false); return; }
        const parsed = this.parseRestoreText(text);
        if (!parsed) { done('Could not read that text — paste a full stats report.', false); return; }
        const d = parsed.data;
        const nPaid = (d.paidHistory || []).length, nFree = (d.freeHistory || []).length;
        if (!confirm(`Restore ${nPaid + nFree} massages? This replaces your current Massage data.`)) return;
        const cleanPaid = (d.paidHistory || []).filter(e => e && isFinite(+e.duration) && isFinite(+e.price)).map(e => ({
            id: String(e.id || `history_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`),
            date: e.date && !isNaN(new Date(e.date).getTime()) ? new Date(e.date).toISOString() : new Date(e.timestamp || Date.now()).toISOString(),
            duration: +e.duration, price: +e.price, points: isFinite(+e.points) ? +e.points : +e.duration,
            note: String(e.note || ''), timestamp: +e.timestamp || new Date(e.date || Date.now()).getTime()
        }));
        const cleanFree = (d.freeHistory || []).filter(e => e && isFinite(+e.duration)).map(e => ({
            id: String(e.id || `history_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`),
            date: e.date && !isNaN(new Date(e.date).getTime()) ? new Date(e.date).toISOString() : new Date(e.timestamp || Date.now()).toISOString(),
            duration: +e.duration, pointsUsed: isFinite(+e.pointsUsed) ? +e.pointsUsed : 0,
            note: String(e.note || ''), timestamp: +e.timestamp || new Date(e.date || Date.now()).getTime()
        }));
        // Recompute totals from entries so stats stay correct
        const totals = {
            totalTime: [...cleanPaid, ...cleanFree].reduce((s, e) => s + e.duration * 60, 0),
            moneySpent: cleanPaid.reduce((s, e) => s + e.price, 0),
            paidTime: cleanPaid.reduce((s, e) => s + e.duration * 60, 0),
            freeTime: cleanFree.reduce((s, e) => s + e.duration * 60, 0)
        };
        await storage.replaceAllData({ points: isFinite(+d.points) ? +d.points : 0, paidHistory: cleanPaid, freeHistory: cleanFree, totals });
        await pointsManager.refreshPoints(); await historyManager.refreshHistory(); await totalsManager.refreshTotals();
        await this.refreshAllDisplays();
        if (input) input.value = '';
        const out = document.getElementById('stats-report-out');
        if (out) out.value = await this.buildStatsReport();
        done(`Restored ${cleanPaid.length + cleanFree.length} massages.`, true);
    }

    async clearAllMassageData() {
        const state = document.getElementById('clear-state');
        const done = (msg, ok) => { if (state) { state.textContent = msg; state.style.color = ok ? '#4ecca3' : '#ff6b6b'; } };
        const all = await storage.getAllHistory().catch(() => []);
        if (!all.length && (await storage.getPoints().catch(() => 0)) === 0) { done('There is no data to clear.', false); return; }
        if (confirm('Do you want to copy your data first?\n\nPress OK to copy your stats before deleting.\nPress Cancel if you already saved it.')) {
            await this.copyStatsReport();
            const out = document.getElementById('stats-report-out');
            if (out) out.scrollIntoView({ behavior: 'smooth', block: 'center' });
            alert('Your stats are ready in the COPY box above. Paste them into your notes app, then press CLEAR ALL DATA again when ready.');
            return;
        }
        if (!confirm(`Are you SURE you want to delete ALL massage data?\n\nThis cannot be undone.`)) return;
        if (!confirm('Last chance — permanently clear all Massage data?')) return;
        await storage.clearAllData();
        await pointsManager.refreshPoints(); await historyManager.refreshHistory(); await totalsManager.refreshTotals();
        await this.refreshAllDisplays();
        const out = document.getElementById('stats-report-out');
        if (out) out.value = '';
        const rin = document.getElementById('stats-restore-in');
        if (rin) rin.value = '';
        done('All data cleared.', true);
    }
}

// Create global UI manager instance
const ui = new UIManager();
