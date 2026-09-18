const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const deathCountEl = document.getElementById('deathCount');
const levelIndicatorEl = document.getElementById('levelIndicator');
const messageEl = document.getElementById('message');

const TILE = 40;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const FRICTION = 0.8;

const COLORS = {
    bg: '#16213e',
    floor: '#0f3460',
    spike: '#e94560',
    door: '#ffd700',
    player: '#53d769',
    trap: '#e94560',
    safe: '#53d769',
    fake: '#53d769',
    moving: '#ff9800',
    crumbling: '#8b4513',
    invisible: '#16213e',
    lava: '#ff4500',
    coin: '#ffd700',
    saw: '#c0c0c0',
    warp: '#9b59b6',
    fallingBlock: '#666'
};

let keys = {};
let currentLevel = 0;
let deaths = 0;
let gameState = 'playing';
let deathTimer = 0;
let levelTriggers = {};
let frameCount = 0;
let messageTimer = 0;
let nextWarp = null;

const player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    width: 30,
    height: 38,
    onGround: false,
    facing: 1,
    respawnX: 0,
    respawnY: 0
};

function getLevel(name, data) {
    const entities = [];
    const spawn = { x: 60, y: 400 };
    let door = null;

    for (const obj of data) {
        switch(obj.t) {
            case 'F':
                for (let i = 0; i < obj.w; i++)
                    for (let j = 0; j < obj.h; j++)
                        entities.push({ type: 'solid', x: obj.x + i * TILE, y: obj.y + j * TILE, w: TILE, h: TILE });
                break;
            case 'S':
                for (let i = 0; i < (obj.w || 1); i++)
                    entities.push({ type: 'spike', x: obj.x + i * TILE, y: obj.y, w: TILE, h: TILE });
                break;
            case 'D':
                door = { type: 'door', x: obj.x, y: obj.y, w: 40, h: 50 };
                break;
            case 'spawn':
                spawn.x = obj.x;
                spawn.y = obj.y;
                break;
            case 'trap_floor':
                for (let i = 0; i < (obj.w || 1); i++)
                    entities.push({ 
                        type: 'trap_floor', x: obj.x + i * TILE, y: obj.y, w: TILE, h: TILE,
                        triggered: false, delay: obj.delay || 0, fallSpeed: 0, startDelay: obj.delay || 0,
                        respawnTimer: 0, respawnable: obj.respawnable !== false
                    });
                break;
            case 'trap_spike':
                entities.push({
                    type: 'trap_spike', x: obj.x, y: obj.y, w: TILE, h: TILE,
                    active: false, triggerDistance: obj.triggerDist || 120, direction: obj.dir || 'up',
                    cooldown: 0
                });
                break;
            case 'ceiling_drop':
                entities.push({
                    type: 'ceiling_drop', x: obj.x, y: obj.y, w: TILE, h: TILE,
                    triggered: false, vy: 0, falling: false, originY: obj.y, resetTimer: 0
                });
                break;
            case 'moving_platform':
                entities.push({
                    type: 'moving_platform', x: obj.x, y: obj.y, w: obj.w || TILE * 3, h: TILE / 2,
                    originX: obj.x, originY: obj.y, axis: obj.axis || 'x', range: obj.range || 120,
                    speed: obj.speed || 1, t: 0, dir: 1
                });
                break;
            case 'crumbling':
                for (let i = 0; i < (obj.w || 1); i++)
                    entities.push({
                        type: 'crumbling', x: obj.x + i * TILE, y: obj.y, w: TILE, h: TILE,
                        standing: false, timer: 0, maxTimer: obj.maxTimer || 40, broken: false, respawnTimer: 0
                    });
                break;
            case 'fake_solid':
                for (let i = 0; i < (obj.w || 1); i++)
                    entities.push({
                        type: 'fake_solid', x: obj.x + i * TILE, y: obj.y, w: TILE, h: TILE,
                        real: false, fakeTimer: 0, toggleInterval: obj.interval || 120, visible: true
                    });
                break;
            case 'warp':
                entities.push({
                    type: 'warp', x: obj.x, y: obj.y, w: TILE, h: TILE,
                    targetX: obj.targetX, targetY: obj.targetY
                });
                break;
            case 'falling_block':
                entities.push({
                    type: 'falling_block', x: obj.x, y: obj.y, w: TILE, h: TILE,
                    triggered: false, vy: 0, originY: obj.y, respawnTimer: 0
                });
                break;
            case 'lava':
                for (let i = 0; i < (obj.w || 1); i++)
                    entities.push({ type: 'lava', x: obj.x + i * TILE, y: obj.y, w: TILE, h: TILE });
                break;
            case 'saw':
                entities.push({
                    type: 'saw', x: obj.x, y: obj.y, w: 36, h: 36,
                    originX: obj.x, originY: obj.y, axis: obj.axis || 'x',
                    range: obj.range || 120, speed: obj.speed || 1, t: 0
                });
                break;
            case 'control_flip':
                entities.push({
                    type: 'control_flip', x: obj.x, y: obj.y, w: TILE, h: TILE,
                    active: false, cooldown: 0
                });
                break;
            case 'gravity_flip':
                entities.push({
                    type: 'gravity_flip', x: obj.x, y: obj.y, w: TILE, h: TILE,
                    active: false, cooldown: 0
                });
                break;
            case 'reverser':
                entities.push({
                    type: 'reverser', x: obj.x, y: obj.y, w: TILE, h: TILE,
                    triggered: false
                });
                break;
            case 'bouncer':
                for (let i = 0; i < (obj.w || 1); i++)
                    entities.push({
                        type: 'bouncer', x: obj.x + i * TILE, y: obj.y, w: TILE, h: TILE / 2
                    });
                break;
            case 'invisible_solid':
                entities.push({
                    type: 'invisible_solid', x: obj.x, y: obj.y, w: obj.w || TILE, h: obj.h || TILE,
                    visible: false, showTimer: 0, showInterval: obj.interval || 90
                });
                break;
            case 'decoy_door':
                entities.push({
                    type: 'decoy_door', x: obj.x, y: obj.y, w: 40, h: 50,
                    trapType: obj.trapType || 'spike'
                });
                break;
            case 'kill_zone':
                entities.push({
                    type: 'kill_zone', x: obj.x, y: obj.y, w: obj.w || TILE, h: obj.h || TILE
                });
                break;
            case 'flicker_solid':
                entities.push({
                    type: 'flicker_solid', x: obj.x, y: obj.y, w: TILE, h: TILE,
                    solid: true, flickerTimer: 0, interval: obj.interval || 60
                });
                break;
            case 'swapper':
                entities.push({
                    type: 'swapper', x: obj.x, y: obj.y, w: TILE, h: TILE,
                    triggered: false, swapX: obj.swapX, swapY: obj.swapY
                });
                break;
        }
    }

    return { name, entities, spawn, door };
}

const levels = [
    getLevel("Welcome", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'D', x: 720, y: 390 },
    ]),
    getLevel("Obvious", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'S', x: 320, y: 400, w: 2 },
        { t: 'D', x: 720, y: 390 },
    ]),
    getLevel("Trust", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'trap_floor', x: 280, y: 440, w: 3, delay: 30 },
        { t: 'D', x: 720, y: 390 },
    ]),
    getLevel("Surprise", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 6, h: 2 },
        { t: 'F', x: 600, y: 440, w: 5, h: 2 },
        { t: 'D', x: 720, y: 390 },
        { t: 'falling_block', x: 340, y: 300 },
        { t: 'falling_block', x: 420, y: 250 },
    ]),
    getLevel("Patience", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'S', x: 240, y: 400, w: 2 },
        { t: 'trap_spike', x: 440, y: 400, triggerDist: 100, dir: 'up' },
        { t: 'D', x: 720, y: 390 },
    ]),
    getLevel("Ceiling", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'F', x: 0, y: 80, w: 20, h: 2 },
        { t: 'ceiling_drop', x: 280, y: 160 },
        { t: 'ceiling_drop', x: 400, y: 160 },
        { t: 'ceiling_drop', x: 520, y: 160 },
        { t: 'D', x: 720, y: 390 },
    ]),
    getLevel("Moving", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 4, h: 2 },
        { t: 'moving_platform', x: 240, y: 360, w: 120, range: 100, speed: 1.5, axis: 'x' },
        { t: 'F', x: 600, y: 440, w: 5, h: 2 },
        { t: 'D', x: 720, y: 390 },
    ]),
    getLevel("Nowhere", [
        { t: 'spawn', x: 60, y: 200 },
        { t: 'F', x: 0, y: 240, w: 3, h: 2 },
        { t: 'crumbling', x: 200, y: 320, w: 2, maxTimer: 30 },
        { t: 'F', x: 440, y: 380, w: 2, h: 2 },
        { t: 'crumbling', x: 600, y: 320, w: 2, maxTimer: 25 },
        { t: 'F', x: 700, y: 280, w: 3, h: 2 },
        { t: 'D', x: 720, y: 230 },
    ]),
    getLevel("Bounce", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'bouncer', x: 360, y: 420, w: 2 },
        { t: 'F', x: 500, y: 300, w: 3, h: 1 },
        { t: 'D', x: 540, y: 250 },
    ]),
    getLevel("Deception", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'decoy_door', x: 400, y: 390, trapType: 'spike' },
        { t: 'D', x: 720, y: 390 },
    ]),
    getLevel("Flip", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'F', x: 0, y: 80, w: 20, h: 2 },
        { t: 'S', x: 200, y: 400, w: 2 },
        { t: 'S', x: 400, y: 120, w: 2 },
        { t: 'gravity_flip', x: 300, y: 400 },
        { t: 'D', x: 720, y: 130 },
    ]),
    getLevel("Warp", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'warp', x: 240, y: 400, targetX: 500, targetY: 200 },
        { t: 'F', x: 440, y: 240, w: 4, h: 2 },
        { t: 'D', x: 540, y: 190 },
    ]),
    getLevel("Control", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'control_flip', x: 360, y: 400 },
        { t: 'S', x: 480, y: 400, w: 3 },
        { t: 'D', x: 720, y: 390 },
    ]),
    getLevel("Chain", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'trap_floor', x: 200, y: 440, w: 2, delay: 0 },
        { t: 'trap_floor', x: 320, y: 440, w: 2, delay: 20 },
        { t: 'trap_floor', x: 440, y: 440, w: 2, delay: 40 },
        { t: 'trap_spike', x: 560, y: 400, triggerDist: 80 },
        { t: 'D', x: 720, y: 390 },
    ]),
    getLevel("Invisible", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'invisible_solid', x: 300, y: 320, w: 120, h: 20, interval: 120 },
        { t: 'invisible_solid', x: 500, y: 260, w: 120, h: 20, interval: 90 },
        { t: 'D', x: 720, y: 200 },
    ]),
    getLevel("Saw", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'saw', x: 300, y: 400, axis: 'x', range: 100, speed: 2 },
        { t: 'saw', x: 500, y: 300, axis: 'y', range: 80, speed: 1.5 },
        { t: 'D', x: 720, y: 390 },
    ]),
    getLevel("Swapper", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 20, h: 2 },
        { t: 'swapper', x: 360, y: 400, swapX: 600, swapY: 200 },
        { t: 'F', x: 560, y: 240, w: 3, h: 2 },
        { t: 'D', x: 680, y: 190 },
    ]),
    getLevel("Mixed", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 4, h: 2 },
        { t: 'trap_floor', x: 200, y: 440, w: 2, delay: 20 },
        { t: 'crumbling', x: 360, y: 380, w: 2, maxTimer: 25 },
        { t: 'moving_platform', x: 440, y: 320, w: 80, range: 80, speed: 1.2, axis: 'x' },
        { t: 'F', x: 600, y: 440, w: 2, h: 2 },
        { t: 'S', x: 680, y: 400 },
        { t: 'D', x: 720, y: 390 },
    ]),
    getLevel("The End?", [
        { t: 'spawn', x: 60, y: 400 },
        { t: 'F', x: 0, y: 440, w: 3, h: 2 },
        { t: 'trap_floor', x: 160, y: 440, w: 2, delay: 0 },
        { t: 'crumbling', x: 280, y: 380, w: 2, maxTimer: 20 },
        { t: 'ceiling_drop', x: 400, y: 160 },
        { t: 'moving_platform', x: 400, y: 320, w: 100, range: 100, speed: 2, axis: 'x' },
        { t: 'saw', x: 580, y: 300, axis: 'y', range: 60, speed: 2 },
        { t: 'F', x: 660, y: 440, w: 4, h: 2 },
        { t: 'D', x: 720, y: 390 },
    ]),
];

function resetLevel() {
    const level = levels[currentLevel];
    player.x = level.spawn.x;
    player.y = level.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.respawnX = level.spawn.x;
    player.respawnY = level.spawn.y;
    levelTriggers = {};
    nextWarp = null;

    for (const e of level.entities) {
        e.triggered = false;
        e.active = false;
        e.falling = false;
        e.vy = 0;
        e.fallSpeed = 0;
        e.standing = false;
        e.timer = 0;
        e.broken = false;
        e.respawnTimer = 0;
        e.cooldown = 0;
        if (e.type === 'trap_floor') e.delay = e.startDelay || 0;
        if (e.type === 'moving_platform') { e.t = 0; e.x = e.originX; e.y = e.originY; }
        if (e.type === 'saw') { e.t = 0; e.x = e.originX; e.y = e.originY; }
        if (e.type === 'ceiling_drop') { e.y = e.originY; }
        if (e.type === 'invisible_solid') { e.visible = false; e.showTimer = 0; }
        if (e.type === 'flicker_solid') { e.solid = true; e.flickerTimer = 0; }
        if (e.type === 'swapper') { e.triggered = false; }
    }

    deathCountEl.textContent = deaths;
    levelIndicatorEl.textContent = `Level ${currentLevel + 1}`;
}

function die() {
    deaths++;
    deathCountEl.textContent = deaths;
    deathTimer = 30;
    gameState = 'dying';
}

function rectCollide(a, b) {
    return a.x < b.x + b.w && a.x + a.width > b.x && a.y < b.y + b.h && a.y + a.height > b.y;
}

function rectCollideFull(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function showMessage(text, duration = 90) {
    messageEl.textContent = text;
    messageEl.style.display = 'block';
    messageTimer = duration;
}

function update() {
    frameCount++;

    if (messageTimer > 0) {
        messageTimer--;
        if (messageTimer <= 0) messageEl.style.display = 'none';
    }

    if (gameState === 'dying') {
        deathTimer--;
        if (deathTimer <= 0) {
            gameState = 'playing';
            resetLevel();
        }
        return;
    }

    if (gameState === 'won') {
        if (keys[' '] || keys['Space'] || keys['Enter'] || keys['Enter']) {
            currentLevel++;
            if (currentLevel >= levels.length) {
                currentLevel = 0;
                deaths = 0;
                showMessage("You survived! Starting over...", 120);
            }
            gameState = 'playing';
            resetLevel();
        }
        return;
    }

    if (keys['r'] || keys['R']) {
        resetLevel();
        return;
    }

    const level = levels[currentLevel];
    let controlFlip = false;
    let gravityFlip = false;

    for (const e of level.entities) {
        if (e.type === 'control_flip' && e.active) controlFlip = true;
        if (e.type === 'gravity_flip' && e.active) gravityFlip = true;
    }

    let moveDir = 0;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) moveDir = -1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) moveDir = 1;
    if (controlFlip) moveDir *= -1;

    player.vx += moveDir * 0.8;
    player.vx *= FRICTION;

    const jumpPressed = keys['ArrowUp'] || keys['w'] || keys['W'] || keys[' '];
    if (jumpPressed && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
    }

    const grav = gravityFlip ? -GRAVITY : GRAVITY;
    player.vy += grav;

    if (player.vy > 12) player.vy = 12;
    if (player.vy < -12) player.vy = -12;

    player.x += player.vx;
    player.y += player.vy;

    if (player.x < 0) { player.x = 0; player.vx = 0; }
    if (player.x + player.width > canvas.width) { player.x = canvas.width - player.width; player.vx = 0; }
    if (player.y < 0) { player.y = 0; player.vy = 0; }
    if (player.y > canvas.height + 50) { die(); return; }

    player.onGround = false;

    const allSolids = level.entities.filter(e => 
        e.type === 'solid' || 
        (e.type === 'moving_platform') ||
        (e.type === 'invisible_solid' && e.visible) ||
        (e.type === 'flicker_solid' && e.solid) ||
        (e.type === 'fake_solid' && e.real)
    );

    for (const s of allSolids) {
        if (rectCollide(player, s)) {
            const overlapX = Math.min(player.x + player.width - s.x, s.x + s.w - player.x);
            const overlapY = Math.min(player.y + player.height - s.y, s.y + s.h - player.y);

            if (overlapX < overlapY) {
                if (player.x + player.width / 2 < s.x + s.w / 2) {
                    player.x = s.x - player.width;
                } else {
                    player.x = s.x + s.w;
                }
                player.vx = 0;
            } else {
                if (player.vy > 0) {
                    player.y = s.y - player.height;
                    player.vy = 0;
                    player.onGround = true;
                    if (s.type === 'moving_platform') {
                        player.x += s.dx || 0;
                        player.y += s.dy || 0;
                    }
                } else {
                    player.y = s.y + s.h;
                    player.vy = grav > 0 ? 0.1 : 0;
                }
            }
        }
    }

    for (const e of level.entities) {
        if (e.type === 'solid') continue;

        if (e.type === 'trap_floor' && !e.triggered && !e.broken) {
            if (rectCollide(player, { x: e.x - 20, y: e.y - 20, w: e.w + 40, h: e.h + 40 })) {
                e.triggered = true;
            }
        }
        if (e.type === 'trap_floor' && e.triggered && !e.broken) {
            if (e.delay > 0) {
                e.delay--;
            } else {
                e.fallSpeed += 0.5;
                e.y += e.fallSpeed;
                if (e.y > canvas.height + 100) {
                    e.broken = true;
                    if (e.respawnable) e.respawnTimer = 300;
                }
            }
        }
        if (e.type === 'trap_floor' && e.broken && e.respawnable) {
            e.respawnTimer--;
            if (e.respawnTimer <= 0) {
                e.broken = false;
                e.triggered = false;
                e.fallSpeed = 0;
                e.delay = e.startDelay || 0;
                e.y = e.originY || e.y;
            }
        }

        if (e.type === 'trap_spike') {
            if (e.cooldown > 0) e.cooldown--;
            if (e.cooldown <= 0) {
                const dx = (player.x + player.width / 2) - (e.x + e.w / 2);
                const dy = (player.y + player.height / 2) - (e.y + e.h / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < e.triggerDistance) {
                    e.active = true;
                    e.cooldown = 60;
                } else {
                    e.active = false;
                }
            }
        }

        if (e.type === 'ceiling_drop') {
            if (!e.triggered) {
                const dx = Math.abs((player.x + player.width / 2) - (e.x + e.w / 2));
                if (dx < 60 && player.y > e.y) {
                    e.triggered = true;
                }
            }
            if (e.triggered && !e.falling) {
                e.vy += 0.3;
                e.y += e.vy;
                if (e.y > e.originY + 400) {
                    e.resetTimer = 180;
                    e.falling = true;
                }
            }
            if (e.falling) {
                e.resetTimer--;
                if (e.resetTimer <= 0) {
                    e.falling = false;
                    e.triggered = false;
                    e.vy = 0;
                    e.y = e.originY;
                }
            }
        }

        if (e.type === 'moving_platform') {
            e.t += e.speed * 0.02 * e.dir;
            const prevX = e.x;
            const prevY = e.y;
            if (e.axis === 'x') {
                e.x = e.originX + Math.sin(e.t) * e.range;
            } else {
                e.y = e.originY + Math.sin(e.t) * e.range;
            }
            e.dx = e.x - prevX;
            e.dy = e.y - prevY;
            if (e.t > Math.PI || e.t < -Math.PI) e.dir *= -1;
        }

        if (e.type === 'crumbling' && !e.broken) {
            if (rectCollide(player, e)) {
                e.standing = true;
                e.timer++;
                if (e.timer >= e.maxTimer) {
                    e.broken = true;
                    e.respawnTimer = 240;
                }
            } else {
                e.standing = false;
            }
        }
        if (e.type === 'crumbling' && e.broken) {
            e.respawnTimer--;
            if (e.respawnTimer <= 0) {
                e.broken = false;
                e.timer = 0;
            }
        }

        if (e.type === 'fake_solid') {
            e.fakeTimer++;
            if (e.fakeTimer % e.toggleInterval === 0) {
                e.real = !e.real;
                e.visible = e.real;
            }
        }

        if (e.type === 'invisible_solid') {
            e.showTimer++;
            if (e.showTimer % e.showInterval === 0) {
                e.visible = !e.visible;
            }
        }

        if (e.type === 'flicker_solid') {
            e.flickerTimer++;
            if (e.flickerTimer % e.interval === 0) {
                e.solid = !e.solid;
            }
        }

        if (e.type === 'saw') {
            e.t += e.speed * 0.02;
            if (e.axis === 'x') {
                e.x = e.originX + Math.sin(e.t) * e.range;
            } else {
                e.y = e.originY + Math.sin(e.t) * e.range;
            }
        }

        if (e.type === 'warp' && !nextWarp) {
            if (rectCollide(player, e)) {
                nextWarp = { x: e.targetX, y: e.targetY };
            }
        }

        if (e.type === 'swapper' && !e.triggered) {
            if (rectCollide(player, e)) {
                e.triggered = true;
                player.x = e.swapX;
                player.y = e.swapY;
            }
        }

        if (e.type === 'control_flip') {
            const dx = Math.abs((player.x + player.width / 2) - (e.x + e.w / 2));
            if (dx < 40 && !e.active) {
                e.active = true;
            }
        }

        if (e.type === 'gravity_flip') {
            const dx = Math.abs((player.x + player.width / 2) - (e.x + e.w / 2));
            if (dx < 40 && !e.active) {
                e.active = true;
            }
        }

        if (e.type === 'reverser' && !e.triggered) {
            if (rectCollide(player, e)) {
                e.triggered = true;
                player.vx = -player.vx * 2;
                player.vy = -Math.abs(player.vy) - 5;
            }
        }

        if ((e.type === 'spike' || e.type === 'lava' || e.type === 'kill_zone') && rectCollide(player, e)) {
            die();
            return;
        }

        if (e.type === 'trap_spike' && e.active && rectCollide(player, e)) {
            die();
            return;
        }

        if ((e.type === 'ceiling_drop' && e.triggered && !e.falling) && rectCollide(player, e)) {
            die();
            return;
        }

        if (e.type === 'saw') {
            const dx = (player.x + player.width / 2) - (e.x + e.w / 2);
            const dy = (player.y + player.height / 2) - (e.y + e.h / 2);
            if (Math.sqrt(dx * dx + dy * dy) < 28) {
                die();
                return;
            }
        }

        if (e.type === 'decoy_door' && rectCollide(player, e)) {
            if (e.trapType === 'spike') {
                for (let i = -2; i <= 2; i++) {
                    level.entities.push({
                        type: 'spike', x: e.x + i * TILE, y: e.y + 10, w: TILE, h: TILE
                    });
                }
            }
            die();
            return;
        }
    }

    if (nextWarp) {
        player.x = nextWarp.x;
        player.y = nextWarp.y;
        nextWarp = null;
    }

    if (level.door && rectCollide(player, level.door)) {
        gameState = 'won';
        showMessage("Level Clear!", 90);
    }
}

function drawPlayer() {
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = '#fff';
    const eyeX = player.x + (player.facing > 0 ? 18 : 8);
    ctx.fillRect(eyeX, player.y + 10, 6, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(eyeX + 2, player.y + 12, 3, 3);
}

function drawLevel() {
    const level = levels[currentLevel];

    for (const e of level.entities) {
        switch(e.type) {
            case 'solid':
                ctx.fillStyle = COLORS.floor;
                ctx.fillRect(e.x, e.y, e.w, e.h);
                ctx.strokeStyle = '#1a1a3e';
                ctx.strokeRect(e.x, e.y, e.w, e.h);
                break;

            case 'spike':
                ctx.fillStyle = COLORS.spike;
                ctx.beginPath();
                ctx.moveTo(e.x + e.w / 2, e.y);
                ctx.lineTo(e.x, e.y + e.h);
                ctx.lineTo(e.x + e.w, e.y + e.h);
                ctx.closePath();
                ctx.fill();
                break;

            case 'trap_floor':
                if (!e.broken) {
                    ctx.fillStyle = e.triggered ? '#ff6b6b' : COLORS.safe;
                    ctx.fillRect(e.x, e.y, e.w, e.h);
                    if (e.triggered && e.delay > 0) {
                        ctx.fillStyle = 'rgba(255,0,0,0.3)';
                        ctx.fillRect(e.x, e.y, e.w, e.h * (e.delay / (e.startDelay || 1)));
                    }
                }
                break;

            case 'trap_spike':
                if (e.active) {
                    ctx.fillStyle = COLORS.spike;
                    ctx.beginPath();
                    ctx.moveTo(e.x + e.w / 2, e.y - 20);
                    ctx.lineTo(e.x - 10, e.y + e.h);
                    ctx.lineTo(e.x + e.w + 10, e.y + e.h);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.fillStyle = 'rgba(233,69,96,0.2)';
                    ctx.fillRect(e.x, e.y, e.w, e.h);
                }
                break;

            case 'ceiling_drop':
                if (!e.falling) {
                    ctx.fillStyle = e.triggered ? '#ff6b6b' : '#888';
                    ctx.fillRect(e.x, e.y, e.w, e.h);
                }
                break;

            case 'moving_platform':
                ctx.fillStyle = COLORS.moving;
                ctx.fillRect(e.x, e.y, e.w, e.h);
                break;

            case 'crumbling':
                if (!e.broken) {
                    const shake = e.standing ? Math.sin(frameCount * 0.5) * 2 : 0;
                    ctx.fillStyle = e.timer > e.maxTimer * 0.7 ? '#ff6b6b' : COLORS.crumbling;
                    ctx.fillRect(e.x + shake, e.y, e.w, e.h);
                }
                break;

            case 'fake_solid':
                if (e.real) {
                    ctx.fillStyle = '#4a4';
                    ctx.fillRect(e.x, e.y, e.w, e.h);
                } else {
                    ctx.fillStyle = 'rgba(80,200,80,0.15)';
                    ctx.fillRect(e.x, e.y, e.w, e.h);
                }
                break;

            case 'invisible_solid':
                if (e.visible) {
                    ctx.fillStyle = 'rgba(150,100,255,0.6)';
                    ctx.fillRect(e.x, e.y, e.w, e.h);
                }
                break;

            case 'flicker_solid':
                if (e.solid) {
                    ctx.fillStyle = '#aa66ff';
                    ctx.fillRect(e.x, e.y, e.w, e.h);
                }
                break;

            case 'warp':
                ctx.fillStyle = COLORS.warp;
                ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.1) * 0.3;
                ctx.fillRect(e.x, e.y, e.w, e.h);
                ctx.globalAlpha = 1;
                break;

            case 'lava':
                ctx.fillStyle = COLORS.lava;
                ctx.fillRect(e.x, e.y, e.w, e.h);
                ctx.fillStyle = '#ff8c00';
                for (let i = 0; i < e.w; i += 8) {
                    const h = 5 + Math.sin(frameCount * 0.1 + i) * 3;
                    ctx.fillRect(e.x + i, e.y - h, 4, h);
                }
                break;

            case 'saw':
                ctx.save();
                ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
                ctx.rotate(frameCount * 0.15);
                ctx.fillStyle = COLORS.saw;
                for (let i = 0; i < 8; i++) {
                    ctx.rotate(Math.PI / 4);
                    ctx.fillRect(-3, -18, 6, 18);
                }
                ctx.restore();
                ctx.fillStyle = '#888';
                ctx.beginPath();
                ctx.arc(e.x + e.w / 2, e.y + e.h / 2, 8, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'bouncer':
                ctx.fillStyle = '#ff69b4';
                ctx.fillRect(e.x, e.y, e.w, e.h);
                ctx.fillStyle = '#ff1493';
                ctx.fillRect(e.x + 2, e.y + 2, e.w - 4, 4);
                break;

            case 'decoy_door':
                ctx.fillStyle = COLORS.door;
                ctx.fillRect(e.x, e.y, e.w, e.h);
                ctx.fillStyle = '#b8860b';
                ctx.beginPath();
                ctx.arc(e.x + 32, e.y + 25, 4, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'kill_zone':
                ctx.fillStyle = 'rgba(255,0,0,0.1)';
                ctx.fillRect(e.x, e.y, e.w, e.h);
                break;

            case 'reverser':
                ctx.fillStyle = 'rgba(255,255,0,0.3)';
                ctx.fillRect(e.x, e.y, e.w, e.h);
                ctx.fillStyle = '#ff0';
                ctx.font = '20px monospace';
                ctx.fillText('!', e.x + 12, e.y + 28);
                break;

            case 'control_flip':
                if (e.active) {
                    ctx.fillStyle = 'rgba(255,100,0,0.5)';
                    ctx.fillRect(e.x, e.y, e.w, e.h);
                } else {
                    ctx.fillStyle = 'rgba(255,100,0,0.2)';
                    ctx.fillRect(e.x, e.y, e.w, e.h);
                }
                break;

            case 'gravity_flip':
                if (e.active) {
                    ctx.fillStyle = 'rgba(0,200,255,0.5)';
                    ctx.fillRect(e.x, e.y, e.w, e.h);
                } else {
                    ctx.fillStyle = 'rgba(0,200,255,0.2)';
                    ctx.fillRect(e.x, e.y, e.w, e.h);
                }
                break;

            case 'swapper':
                ctx.fillStyle = 'rgba(200,100,255,0.4)';
                ctx.fillRect(e.x, e.y, e.w, e.h);
                break;

            case 'falling_block':
                if (!e.triggered) {
                    ctx.fillStyle = COLORS.fallingBlock;
                    ctx.fillRect(e.x, e.y, e.w, e.h);
                }
                break;
        }
    }

    if (level.door) {
        ctx.fillStyle = COLORS.door;
        ctx.fillRect(level.door.x, level.door.y, level.door.w, level.door.h);
        ctx.fillStyle = '#b8860b';
        ctx.beginPath();
        ctx.arc(level.door.x + 32, level.door.y + 25, 4, 0, Math.PI * 2);
        ctx.fill();

        if (gameState === 'won') {
            ctx.fillStyle = '#fff';
            ctx.font = '24px monospace';
            ctx.fillText('Press SPACE', level.door.x - 20, level.door.y - 20);
        }
    }
}

function draw() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawLevel();
    drawPlayer();

    if (gameState === 'dying') {
        ctx.fillStyle = `rgba(255,0,0,${deathTimer / 30 * 0.4})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

resetLevel();
gameLoop();
