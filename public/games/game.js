// ==========================================
// 🏔️ 점프맵 PRO - AI Hybrid Edition (Final)
// ==========================================

// --- 1. Global Setup & DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');

// UI Elements
const uiIds = ['startScreen', 'clearScreen', 'shopModal', 'skillShopModal', 'customizeModal', 'achievementModal', 'messageOverlay', 'achievementPopups'];
const ui = {};
uiIds.forEach(id => ui[id] = document.getElementById(id));

// --- 2. Audio System ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bgmOsc = null, bgmGain = null;

const Sounds = {
    play: (freq, type, dur, vol = 0.1) => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + dur);
    },
    jump: () => Sounds.play(400, 'sine', 0.1, 0.08),
    doubleJump: () => Sounds.play(600, 'sine', 0.15, 0.08),
    dash: () => { Sounds.play(200, 'sawtooth', 0.1, 0.05); setTimeout(() => Sounds.play(400, 'sawtooth', 0.1, 0.05), 50); },
    coin: () => { Sounds.play(1200, 'sine', 0.1, 0.05); setTimeout(() => Sounds.play(1800, 'square', 0.1, 0.03), 50); },
    hit: () => Sounds.play(100, 'sawtooth', 0.3, 0.15),
    portal: () => { Sounds.play(300, 'sine', 0.2, 0.1); Sounds.play(600, 'sine', 0.3, 0.1); },
    boss: () => { Sounds.play(80, 'sawtooth', 0.5, 0.2); Sounds.play(100, 'square', 0.5, 0.15); },
    skill: () => { Sounds.play(500, 'square', 0.1, 0.1); Sounds.play(800, 'square', 0.2, 0.1); },
    achievement: () => { Sounds.play(523, 'sine', 0.15, 0.1); setTimeout(() => Sounds.play(659, 'sine', 0.15, 0.1), 150); setTimeout(() => Sounds.play(784, 'sine', 0.3, 0.1), 300); },
    error: () => Sounds.play(150, 'square', 0.2, 0.1),
    buy: () => { Sounds.play(600, 'sine', 0.1, 0.1); setTimeout(() => Sounds.play(1200, 'sine', 0.2, 0.1), 100); }
};

function startBGM(floor) {
    stopBGM();
    bgmGain = audioCtx.createGain();
    bgmGain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    bgmGain.connect(audioCtx.destination);
    
    const baseFreq = floor < 34 ? 130 : floor < 67 ? 165 : 110;
    bgmOsc = audioCtx.createOscillator();
    bgmOsc.type = 'triangle';
    bgmOsc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    bgmOsc.connect(bgmGain);
    bgmOsc.start();
}

function stopBGM() {
    if (bgmOsc) { try { bgmOsc.stop(); } catch(e) {} bgmOsc = null; }
}

// --- 3. Configuration & State ---
const CONFIG = {
    FLOOR_HEIGHT: 600,
    TOTAL_FLOORS: 100,
    GRAVITY: 0.65,
    TERMINAL_VELOCITY: 18,
    BOSS_FLOORS: [25, 50, 75, 100]
};

// Utils
const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
const lerp = (a, b, t) => a + (b - a) * t;

// Game State (순서 중요: AI 클래스보다 먼저 정의되어야 함)
const game = {
    running: false, paused: false, startTime: 0,
    score: 0, coins: 0, totalCoins: parseInt(localStorage.getItem('jumpmap_coins') || '0'),
    jumpCount: 0, currentFloor: 1, maxFloor: 1,
    camera: { x: 0, y: 0, targetY: 0 },
    shake: 0, timeFrozen: false, freezeEndTime: 0,
    inBossFight: false, currentBoss: null,
    currentGravity: CONFIG.GRAVITY,

    // [추가됨] 콤보 시스템 변수
    combo: 0,
    comboTimer: 0,
    maxComboTime: 3000 // 3초 유지
};

// Player State
const player = {
    x: 0, y: 0, w: 36, h: 48, vx: 0, vy: 0,
    baseSpeed: 7, baseJump: 16.5, speed: 7, jumpForce: 16.5,
    grounded: false, facing: 1, scaleX: 1, scaleY: 1, trail: [],
    buffs: { doubleJump: 0, shield: false, superPotion: 0 },
    airJumpAvailable: false, wallSliding: false, wallDir: 0,
    canDash: true, dashLastTime: 0, isDashing: false, lives: 1,
    color: '#6366f1', hat: 'none', trailType: 'none',
    pet: null, petX: 0, petY: 0,
    skills: { 1: true, 2: false, 3: false },
    skillCooldowns: { 1: 0, 2: 0, 3: 0 },
    skillMaxCooldowns: { 1: 5000, 2: 15000, 3: 20000 },
    upgrades: {
        jump: parseInt(localStorage.getItem('upg_jump') || '0'),
        speed: parseInt(localStorage.getItem('upg_speed') || '0'),
        dash: parseInt(localStorage.getItem('upg_dash') || '0'),
        life: parseInt(localStorage.getItem('upg_life') || '0')
    },
    magnet: localStorage.getItem('has_magnet') === 'true'
};

const keys = {};

// --- Mobile Control Setup (키 입력 변수 아래에 배치) ---
const mobileState = { left: false, right: false, jump: false, dash: false, skill1: false };

function setupMobileControls() {
    const bindBtn = (id, key) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        
        const start = (e) => { 
            if(e.cancelable) e.preventDefault(); 
            mobileState[key] = true; 
            handleMobileInput(key, true); 
        };
        const end = (e) => { 
            if(e.cancelable) e.preventDefault(); 
            mobileState[key] = false; 
            handleMobileInput(key, false); 
        };
        
        btn.addEventListener('touchstart', start, { passive: false });
        btn.addEventListener('touchend', end, { passive: false });
        // PC 테스트용
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', end);
        btn.addEventListener('mouseleave', end);
    };

    bindBtn('btnLeft', 'left');
    bindBtn('btnRight', 'right');
    bindBtn('btnJump', 'jump');
    bindBtn('btnDash', 'dash');
    bindBtn('btnSkill1', 'skill1');
}

function handleMobileInput(key, pressed) {
    if (key === 'left') keys['ArrowLeft'] = pressed;
    if (key === 'right') keys['ArrowRight'] = pressed;
    if (key === 'jump') keys['ArrowUp'] = pressed;
    
    if (pressed) {
        if (key === 'dash') performDash();
        if (key === 'skill1') useSkill(1);
    }
}

// 모바일 컨트롤 초기화
setupMobileControls();

// World Objects
let platforms = [], coins = [], particles = [];
let enemies = [], portals = [], gravityZones = [], bosses = [], bgStars = [];

// --- 4. Hybrid AI System (DQN + Rule-Based + DDA) ---
const CHASER_CONFIG = {
    UPDATE_INTERVAL: 60,  // 0.06초마다 판단
    BASE_SPEED: 7.5,      // 기본 속도
    JUMP_FORCE: 18,       // 점프력
    EXPLORATION_RATE: 0.2,// 20% 확률로 신경망의 예측을 시도
    MEMORY_SIZE: 500      // 학습 데이터 저장
};

class ChaserAI {
    constructor() {
        this.x = 0; this.y = 0; this.w = 36; this.h = 48;
        this.vx = 0; this.vy = 0;
        this.active = false;
        this.grounded = false;
        
        // AI Brain
        this.model = null;
        this.memory = [];
        this.lastDecisionTime = 0;
        this.action = 3; // 0:Left, 1:Right, 2:Jump, 3:Wait
        
        // Dynamic Difficulty
        this.difficulty = 1.0;
        this.failCount = 0;
        this.mode = 'chase'; // 'chase', 'ambush'
        
        this.initModel();
    }

    async initModel() {
        if (typeof tf !== 'undefined') {
            // Input: [dx, dy, vx, vy, grounded, holeAhead, playerVx, playerVy]
            this.model = tf.sequential();
            this.model.add(tf.layers.dense({ units: 24, activation: 'relu', inputShape: [8] }));
            this.model.add(tf.layers.dense({ units: 24, activation: 'relu' }));
            this.model.add(tf.layers.dense({ units: 4, activation: 'linear' })); 
            this.model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
        }
    }

    reset(startX, startY) {
        this.x = startX; this.y = startY;
        this.vx = 0; this.vy = 0;
        this.active = true;
        this.difficulty = 1.0;
        if (player.lives < 2) this.difficulty = 0.8;
    }

    // [핵심 수정 1] 폭발적 난이도 증가 로직
    updateDifficulty() {
        const distY = this.y - player.y; // 양수면 AI가 아래에 있음
        
        // 플레이어가 미친듯이 올라가는 중 (vy < -12)
        if (player.vy < -12) { 
            this.difficulty = 2.5; // 속도 2.5배 폭주
            this.mode = 'chase';
        }
        else {
            // 멀어지면 가속, 가까워지면 약간 감속하지만 최소 1.0 유지 (절대 안 멈춤)
            if (distY > 600) this.difficulty = Math.min(this.difficulty + 0.02, 1.8);
            else if (distY < 150) this.difficulty = Math.max(this.difficulty - 0.01, 1.0);
            else this.difficulty = 1.2;
        }

        if (player.vy > 5 && distY < 400) this.mode = 'ambush';
        else this.mode = 'chase';
    }

    // [오류 해결 부분] 이 함수가 없어서 에러가 났던 것입니다.
    getInputs() {
        const dx = (player.x - this.x) / 1000;
        const dy = (player.y - this.y) / 1000;
        const vx = this.vx / 20;
        const vy = this.vy / 20;
        const grounded = this.grounded ? 1 : 0;
        const hole = this.checkHole(this.vx > 0 ? 1 : -1) ? 1 : 0;
        return [dx, dy, vx, vy, grounded, hole, player.vx/20, player.vy/20];
    }

    // [핵심 수정 2] 멈추지 않는 추격 예측
    predict() {
        if (!this.active) return;
        
        // 1. Rule-Based (선생님)
        let ruleAction = 0; // 기본값을 '이동'으로 변경 (대기 없음)

        const targetX = (this.mode === 'ambush') ? player.x + player.vx * 20 : player.x;
        const dx = targetX - this.x;
        const dy = player.y - this.y;
        
        // A. 수평 이동: 아주 조금만 떨어져도 즉시 이동
        if (Math.abs(dx) > 5) {
            ruleAction = dx > 0 ? 1 : 0;
        } else {
            // 발 밑에 도달했으면 점프 공격 시도
            if (dy < -10) ruleAction = 2; 
            else ruleAction = 3; 
        }
        
        // B. 점프 판단
        const wallAhead = this.checkWall(dx > 0 ? 1 : -1);
        const holeAhead = this.checkHole(dx > 0 ? 1 : -1);
        
        if (this.grounded) {
            if (wallAhead || holeAhead) {
                ruleAction = 2;
            }
            // 플레이어가 위에 있고 가까우면 점프 (멈춘 플레이어 공격)
            else if (dy < -50 && Math.abs(dx) < 100) {
                ruleAction = 2;
            }
        }

        // 2. Neural Network (학생)
        if (Math.random() < CHASER_CONFIG.EXPLORATION_RATE && this.model) {
            try {
                const inputTensor = tf.tensor2d([this.getInputs()]); // 여기서 getInputs 호출
                const prediction = this.model.predict(inputTensor);
                const predictedAction = prediction.argMax(1).dataSync()[0];
                inputTensor.dispose();
                prediction.dispose();
                
                if (predictedAction !== 2 && holeAhead) {
                    this.action = 2; 
                } else {
                    this.action = predictedAction;
                }
            } catch(e) { this.action = ruleAction; }
        } else {
            this.action = ruleAction;
        }

        this.remember(this.getInputs(), ruleAction);
    }

    remember(state, idealAction) {
        if (this.memory.length > CHASER_CONFIG.MEMORY_SIZE) this.memory.shift();
        this.memory.push({ state, action: idealAction });
    }

    async train() {
        if (this.memory.length < 50 || !this.model) return;

        const batch = this.memory.slice(-32);
        const xs = tf.tensor2d(batch.map(m => m.state));
        const ys = tf.tensor1d(batch.map(m => m.action), 'int32');
        const ysOneHot = tf.oneHot(ys, 4);

        try {
            const h = await this.model.fit(xs, ysOneHot, { epochs: 1, verbose: 0 });
            const loss = h.history.loss[0];

            // UI 업데이트
            const statusEl = document.getElementById('aiStatus');
            const lossEl = document.getElementById('aiLoss');

            if(statusEl && lossEl) {
                statusEl.classList.remove('hidden');
                lossEl.textContent = loss.toFixed(4); // 소수점 4자리까지 표시

                // 0.1보다 크면(멍청함) 빨강, 0.05보다 작으면(똑똑함) 초록
                if (loss > 0.1) lossEl.style.color = '#fca5a5'; // 연한 빨강
                else if (loss < 0.05) lossEl.style.color = '#86efac'; // 연한 초록
                else lossEl.style.color = '#fde047'; // 노랑 (보통)
            }
        } catch(e) {}

        xs.dispose(); ys.dispose(); ysOneHot.dispose();
    }

    update() {
        if (!this.active || game.paused) return;

        const now = Date.now();
        if (now - this.lastDecisionTime > CHASER_CONFIG.UPDATE_INTERVAL) {
            this.updateDifficulty();
            this.predict();
            this.lastDecisionTime = now;
            if (Math.random() < 0.01) this.train();
        }

        const speed = CHASER_CONFIG.BASE_SPEED * this.difficulty;
        if (this.action === 0) this.vx -= 1;
        if (this.action === 1) this.vx += 1;
        if (this.action === 2 && this.grounded) {
            this.vy = -CHASER_CONFIG.JUMP_FORCE * Math.min(this.difficulty, 1.2);
            this.grounded = false;
        }

        this.vx = clamp(this.vx, -speed, speed);
        this.vx *= 0.9;
        this.vy += game.currentGravity;
        this.x += this.vx;
        this.y += this.vy;

        this.grounded = false;
        platforms.forEach(p => {
             if (Math.abs(p.y - this.y) > 100) return;
             if (this.vy >= 0 && 
                 this.y + this.h >= p.y && this.y + this.h <= p.y + this.vy + 20 &&
                 this.x + this.w > p.x && this.x < p.x + p.w) {
                 this.y = p.y - this.h;
                 this.vy = 0;
                 this.grounded = true;
             }
        });

        if (checkCollision(player, this)) {
            hitPlayer();
            this.vx = -this.vx * 2;
            this.vy = -5;
        }

        const distY = this.y - player.y;
        if (distY > 1200) { 
            this.x = player.x;
            this.y = player.y + 800;
            this.failCount++;
            this.difficulty += 0.05;
        }
    }

    checkWall(dir) {
        const checkX = this.x + (this.w/2) + (dir * 40);
        return platforms.some(p => 
            checkX > p.x && checkX < p.x + p.w &&
            Math.abs((this.y + this.h/2) - (p.y + p.h/2)) < 30
        );
    }
    
    checkHole(dir) {
        const checkX = this.x + (this.w/2) + (dir * 60);
        const platformBelowMe = platforms.some(p => this.x+this.w/2 > p.x && this.x+this.w/2 < p.x+p.w && Math.abs((this.y+this.h)-p.y) < 20);
        const platformAhead = platforms.some(p => checkX > p.x && checkX < p.x+p.w && Math.abs((this.y+this.h+20) - p.y) < 50);
        return platformBelowMe && !platformAhead;
    }

    draw() {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        
        const auraColor = this.mode === 'ambush' ? '#f59e0b' : (this.difficulty > 1.2 ? '#ef4444' : '#6366f1');
        ctx.shadowBlur = 10 * this.difficulty;
        ctx.shadowColor = auraColor;
        
        ctx.fillStyle = auraColor;
        ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        
        ctx.fillStyle = '#000';
        ctx.fillRect(-10, -10, 8, 8); ctx.fillRect(2, -10, 8, 8);
        
        const dx = player.x - this.x;
        const lookDir = dx > 0 ? 2 : -2;
        ctx.fillStyle = '#fff';
        ctx.fillRect(-8 + lookDir, -8, 4, 4); ctx.fillRect(4 + lookDir, -8, 4, 4);

        if (this.difficulty > 1.2) {
            ctx.fillStyle = '#ff0000';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("ANGRY", 0, -30);
        }
        ctx.restore();
    }
}

const chaser = new ChaserAI();

// --- 5. Achievement System ---
const achievements = {
    first_jump: { name: '첫 발걸음', desc: '첫 점프 성공', icon: '🦵', unlocked: false },
    floor_10: { name: '10층 돌파', desc: '10층에 도달', icon: '🏃', unlocked: false },
    floor_25: { name: '1/4 정복', desc: '25층에 도달', icon: '⭐', unlocked: false },
    floor_50: { name: '중간 지점', desc: '50층에 도달', icon: '🌟', unlocked: false },
    floor_75: { name: '거의 다 왔어', desc: '75층에 도달', icon: '💫', unlocked: false },
    floor_100: { name: '전설의 정복자', desc: '100층 클리어', icon: '👑', unlocked: false },
    coins_100: { name: '동전 수집가', desc: '코인 100개 모으기', icon: '💰', unlocked: false },
    coins_500: { name: '부자', desc: '코인 500개 모으기', icon: '💎', unlocked: false },
    first_boss: { name: '보스 슬레이어', desc: '첫 보스 처치', icon: '👹', unlocked: false },
    portal_user: { name: '차원 여행자', desc: '포탈 사용', icon: '🌀', unlocked: false },
    pet_owner: { name: '동반자', desc: '첫 펫 획득', icon: '🐾', unlocked: false },
    speed_demon: { name: '스피드 데몬', desc: '3분 내 클리어', icon: '⚡', unlocked: false },
    no_damage: { name: '무적', desc: '피해 없이 25층 도달', icon: '🛡️', unlocked: false },
    skill_master: { name: '스킬 마스터', desc: '모든 스킬 구매', icon: '🔮', unlocked: false }
};

Object.keys(achievements).forEach(key => {
    if (localStorage.getItem(`ach_${key}`) === 'true') achievements[key].unlocked = true;
});

function unlockAchievement(key) {
    if (achievements[key] && !achievements[key].unlocked) {
        achievements[key].unlocked = true;
        localStorage.setItem(`ach_${key}`, 'true');
        Sounds.achievement();
        showAchievementPopup(achievements[key]);
        game.score += 1000;
        updateUI();
    }
}

function showAchievementPopup(ach) {
    const popup = document.createElement('div');
    popup.className = 'achievement-popup bg-gradient-to-r from-yellow-600 to-amber-500 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3';
    popup.innerHTML = `<span class="text-3xl">${ach.icon}</span><div><div class="font-bold text-white">업적 달성!</div><div class="text-sm text-yellow-100">${ach.name}</div></div>`;
    ui.achievementPopups.appendChild(popup);
    setTimeout(() => popup.remove(), 3500);
}

function updateAchievementList() {
    const list = document.getElementById('achievementList');
    list.innerHTML = '';
    Object.entries(achievements).forEach(([key, ach]) => {
        const div = document.createElement('div');
        div.className = `p-4 rounded-xl border-2 ${ach.unlocked ? 'bg-green-900/30 border-green-500' : 'bg-gray-800/50 border-gray-600 opacity-60'}`;
        div.innerHTML = `<div class="flex items-center gap-3"><span class="text-3xl ${ach.unlocked ? '' : 'grayscale'}">${ach.icon}</span><div><div class="font-bold ${ach.unlocked ? 'text-green-400' : 'text-gray-400'}">${ach.name}</div><div class="text-xs text-gray-400">${ach.desc}</div></div>${ach.unlocked ? '<span class="ml-auto text-green-400">✓</span>' : ''}</div>`;
        list.appendChild(div);
    });
}

// --- 6. Initialization & Game Loop ---
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

function initGame() {
    // Reset Stats
    player.jumpForce = player.baseJump + player.upgrades.jump * 1.5;
    player.speed = player.baseSpeed + player.upgrades.speed * 0.8;
    player.lives = 1 + player.upgrades.life;
    player.x = canvas.width / 2 - player.w / 2;
    player.y = canvas.height - 200;
    player.vx = 0; player.vy = 0;
    player.buffs = { doubleJump: 0, shield: false, superPotion: 0 };
    player.canDash = true; player.skillCooldowns = { 1: 0, 2: 0, 3: 0 };
    player.petX = player.x; player.petY = player.y;
    player.lastPlatform = null;
    game.running = true; game.paused = false; game.startTime = Date.now();
    game.score = 0; game.coins = 0; game.jumpCount = 0;
    game.currentFloor = 1; game.maxFloor = 1;
    game.camera.y = 0; game.camera.targetY = 0;
    game.timeFrozen = false; game.inBossFight = false; game.currentBoss = null;

    // AI Chaser Reset
    chaser.active = false;
    setTimeout(() => {
        if (game.running) {
            chaser.reset(platforms[0].x + 50, platforms[0].y - 50);
            showMessage('추격자 등장!', 'red', '💀');
            Sounds.boss();
        }
    }, 3000);

    createWorld(); createBackground(); updateUI(); updateBuffUI(); startBGM(1);
}

function createWorld() {
    platforms = []; coins = []; enemies = [];
    portals = []; gravityZones = []; bosses = [];

    let prevX = canvas.width / 2 - 250;
    let prevW = 500;
    let currentY = canvas.height - 50;
    
    platforms.push({ x: prevX, y: currentY, w: prevW, h: 40, type: 'start', floor: 1, main: true });

    for (let f = 2; f <= CONFIG.TOTAL_FLOORS; f++) {
        const targetY = canvas.height - 50 - (f - 1) * CONFIG.FLOOR_HEIGHT;
        const isBossLevel = CONFIG.BOSS_FLOORS.includes(f);
        const distToTravel = currentY - targetY;
        const stepCount = Math.floor(distToTravel / 140); 
        const dy = distToTravel / stepCount;

        for (let s = 1; s <= stepCount; s++) {
            const isLastStep = s === stepCount;
            const thisY = currentY - s * dy;
            let type = 'normal';
            let w = Math.max(80, 160 - (f/100) * 60);

            if (isLastStep && isBossLevel) {
                w = 600; type = 'boss';
                const bossX = canvas.width / 2 - w / 2;
                platforms.push({ x: bossX, y: thisY, w: w, h: 40, type: 'boss', floor: f, main: true });
                bosses.push({
                    floor: f, x: canvas.width / 2, y: thisY - 150, w: 100, h: 100,
                    hp: 100 + f * 5, maxHp: 100 + f * 5, phase: 1, attackTimer: 0,
                    name: f === 25 ? '🔥 화염 골렘' : f === 50 ? '❄️ 얼음 거인' : f === 75 ? '⚡ 번개 정령' : '👑 공허의 지배자',
                    defeated: false
                });
                prevX = bossX; prevW = w;
                continue;
            }

            if (isLastStep && f % 10 === 0) { w = 300; type = 'checkpoint'; }

            let minJump = 80;
            let maxJump = 220;
            let dir = Math.random() < 0.5 ? -1 : 1;
            let centerPrev = prevX + prevW / 2;
            if (centerPrev < 200) dir = 1;
            if (centerPrev > canvas.width - 200) dir = -1;
            let shift = dir * rand(minJump, maxJump);
            let newCenter = clamp(centerPrev + shift, 100, canvas.width - 100);
            let x = newCenter - w / 2;

            if (!isBossLevel && !isLastStep) {
                 const r = Math.random();
                 if (r < 0.15) type = 'moving';
                 else if (r < 0.25) type = 'ice';
                 else if (r < 0.35) type = 'bouncy';
                 else if (r < 0.45 && f > 20) type = 'ghost';
            }

            platforms.push({
                x, y: thisY + rand(-10, 10), w, h: 20, type, floor: isLastStep ? f : f-1, main: isLastStep,
                baseX: x, moveOffset: rand(0, Math.PI*2), moveSpeed: 0.02 + (f/2000), moveRange: 100,
                opacity: 1, fading: false, crumbleTime: 0, respawnTime: 0
            });
            prevX = x; prevW = w;

            if (Math.random() < 0.3) {
                coins.push({ x: x + w/2 - 10, y: thisY - 30, w: 20, h: 20, baseY: thisY - 30, floatOffset: rand(0, Math.PI*2), collected: false, value: Math.random() < 0.1 ? 5 : 1 });
            }
            if (f > 5 && Math.random() < 0.1) {
                 enemies.push({ x: x, y: thisY - 40, w: 30, h: 30, type: 'patrol', startX: x, range: w, speed: 1, offset: rand(0, Math.PI), hp: 1 });
            }
        }
        
        if (f % 35 === 0 && f < 95) {
             const p = platforms[platforms.length-1];
             let targetF = Math.min(f + rand(3, 8), 100);
             portals.push({ x: p.x + p.w/2 - 25, y: p.y - 60, w: 50, h: 70, fromFloor: f, toFloor: Math.floor(targetF), active: true });
        }
        if (f > 30 && Math.random() < 0.08) {
            gravityZones.push({ x: rand(50, canvas.width - 200), y: targetY - 120, w: 150, h: 150, type: Math.random() < 0.6 ? 'low' : 'reverse' });
        }
        currentY = targetY;
    }
    platforms.push({ x: canvas.width/2 - 200, y: currentY - 600, w: 400, h: 40, type: 'goal', floor: 100, main: true });
}

function createBackground() {
    bgStars = [];
    for (let i = 0; i < 300; i++) {
        bgStars.push({ x: rand(0, canvas.width), y: rand(-CONFIG.TOTAL_FLOORS * CONFIG.FLOOR_HEIGHT, canvas.height), size: rand(0.5, 3), alpha: rand(0.3, 1), twinkle: rand(0, Math.PI * 2) });
    }
}

// --- 7. Input Handling ---
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') performDash();
    if (e.code === 'KeyQ') useSkill(1);
    if (e.code === 'KeyE') useSkill(2);
    if (e.code === 'KeyR' && !e.ctrlKey) useSkill(3);
});
window.addEventListener('keyup', e => keys[e.code] = false);

// --- 8. Core Game Logic (Update) ---
function useSkill(num) {
    if (!player.skills[num]) return;
    if (player.skillCooldowns[num] > 0) return;
    const cooldownReduction = player.pet === 'dragon' ? 0.8 : 1;
    player.skillCooldowns[num] = player.skillMaxCooldowns[num] * cooldownReduction;
    Sounds.skill();

    if (num === 1) {
        player.vx = player.facing * 30; player.isDashing = true; game.shake = 10;
        for (let i = 0; i < 30; i++) createParticle(player.x + player.w/2, player.y + player.h/2, 1, '#ff6b35', 8);
        showMessage('파이어 대시!', 'red', '🔥');
    } else if (num === 2) {
        game.timeFrozen = true; game.freezeEndTime = Date.now() + 3000;
        showMessage('시간 정지!', 'cyan', '❄️');
    } else if (num === 3) {
        player.vy = -35;
        for (let i = 0; i < 40; i++) createParticle(player.x + player.w/2, player.y + player.h, 1, '#fbbf24', 10);
        showMessage('썬더 점프!', 'yellow', '⚡');
    }
}

function updateSkillCooldowns() {
    const now = Date.now();
    [1, 2, 3].forEach(num => {
        if (player.skillCooldowns[num] > 0) {
            player.skillCooldowns[num] -= 16;
            if (player.skillCooldowns[num] < 0) player.skillCooldowns[num] = 0;
        }
        const pct = (player.skillCooldowns[num] / player.skillMaxCooldowns[num]) * 100;
        const el = document.getElementById(`skill${num}Cooldown`);
        if(el) el.style.height = `${pct}%`;
    });
    if (game.timeFrozen && now >= game.freezeEndTime) game.timeFrozen = false;
}

function update() {
    if (!game.running || game.paused) return;
    const now = Date.now();
    updateSkillCooldowns();
    if (game.combo > 0) {
        game.comboTimer -= 16;
        if (game.comboTimer <= 0) game.combo = 0;
    }
    
    // AI Update Call
    chaser.update();

    // Gravity Zones
    let inGravityZone = false;
    gravityZones.forEach(gz => {
        if (player.x < gz.x + gz.w && player.x + player.w > gz.x &&
            player.y < gz.y + gz.h && player.y + player.h > gz.y) {
            inGravityZone = true;
            if (gz.type === 'low') game.currentGravity = CONFIG.GRAVITY * 0.3;
            else if (gz.type === 'reverse') game.currentGravity = -CONFIG.GRAVITY * 0.5;
        }
    });
    if (!inGravityZone) game.currentGravity = CONFIG.GRAVITY;

    // Movement
    const moveLeft = keys['ArrowLeft'] || keys['KeyA'];
    const moveRight = keys['ArrowRight'] || keys['KeyD'];
    const jumpKey = keys['ArrowUp'] || keys['Space'] || keys['KeyW'];

    player.wallSliding = false; player.wallDir = 0;
    if (!player.canDash && now - player.dashLastTime >= (1500 - player.upgrades.dash * 200)) player.canDash = true;

    if (player.isDashing) {
        player.vx *= 0.95; if (Math.abs(player.vx) < 5) player.isDashing = false;
    } else {
        const speedMult = player.pet === 'cat' ? 1.1 : 1;
        const potionMult = player.buffs.superPotion > 0 ? 1.3 : 1;
        if (moveLeft) { player.vx -= 1.5; player.facing = -1; }
        else if (moveRight) { player.vx += 1.5; player.facing = 1; }
        else player.vx *= 0.8;
        player.vx = clamp(player.vx, -player.speed * speedMult * potionMult, player.speed * speedMult * potionMult);
    }

    player.x += player.vx;
    if (player.x < 0) { player.x = 0; player.vx = 0; }
    if (player.x + player.w > canvas.width) { player.x = canvas.width - player.w; player.vx = 0; }

    // Wall Slide
    if (!player.grounded && player.vy > 0) {
        platforms.forEach(p => {
            if (p.opacity < 0.5) return;
            if (player.y + player.h > p.y && player.y < p.y + p.h) {
                if (Math.abs(player.x + player.w - p.x) < 10) { player.wallSliding = true; player.wallDir = -1; }
                else if (Math.abs(player.x - (p.x + p.w)) < 10) { player.wallSliding = true; player.wallDir = 1; }
            }
        });
    }

    if (player.wallSliding) player.vy = 3;
    else {
        const jumpMult = player.pet === 'bird' ? 1.15 : 1;
        player.vy += game.currentGravity;
        player.vy = clamp(player.vy, -CONFIG.TERMINAL_VELOCITY * jumpMult, CONFIG.TERMINAL_VELOCITY);
    }
    player.y += player.vy;
    player.scaleX = lerp(player.scaleX, 1, 0.1); player.scaleY = lerp(player.scaleY, 1, 0.1);

    // Collisions
    let onGround = false;
    platforms.forEach(p => {
        if (p.type === 'ghost') {
            if (p.fading) {
                p.opacity -= 0.05;
                if (p.opacity <= 0) { p.opacity = 0; p.fading = false; p.respawnTime = now + 2000; }
            } else if (p.opacity === 0 && p.respawnTime && now > p.respawnTime) {
                p.opacity = 1; p.respawnTime = 0; createParticle(p.x + p.w/2, p.y + p.h/2, 10, '#c4b5fd', 2);
            }
        }
        if (p.opacity < 0.1) return;

        if (p.type === 'moving' && !game.timeFrozen) {
            const prevX = p.x;
            p.x = p.baseX + Math.sin(now * 0.001 * 2 + p.moveOffset) * p.moveRange;
            if (player.grounded && player.y + player.h === p.y && player.x + player.w > p.x && player.x < p.x + p.w) {
                player.x += p.x - prevX;
            }
        }

        if (player.vy >= 0 && player.y + player.h >= p.y && player.y + player.h <= p.y + player.vy + 15 &&
            player.x + player.w > p.x + 5 && player.x < p.x + p.w - 5) {
            
            player.y = p.y - player.h; player.vy = 0; onGround = true; player.isDashing = false;
            
            if (!player.grounded) {
                // [추가됨] 콤보 & 점수 로직
                if (player.lastPlatform !== p) {
                    game.combo++;
                    game.comboTimer = game.maxComboTime;
                    player.lastPlatform = p; // 현재 발판을 기억함

                    // 콤보 보너스 효과
                    if (game.combo > 1) {
                        game.score += 10 * game.combo;
                        if (game.combo % 5 === 0) {
                            createParticle(player.x, player.y, 10, '#facc15', 5);
                            showMessage(`${game.combo} COMBO!`, 'yellow', '🔥');
                        }
                    }
                }
                // 착지 이펙트 (콤보 여부와 상관없이 발생)
                createParticle(player.x + player.w/2, player.y + player.h, 5, '#fff', 3);
                if (p.type === 'bouncy') {
                    const jumpMult = player.pet === 'bird' ? 1.15 : 1;
                    player.vy = -player.jumpForce * 1.5 * jumpMult;
                    player.scaleY = 1.4; player.scaleX = 0.7;
                    createParticle(player.x + player.w/2, player.y + player.h, 12, '#f472b6', 6);
                    onGround = false;
                } else { player.scaleY = 0.7; player.scaleX = 1.3; }

                if (p.type === 'ghost' && !p.fading && p.opacity === 1) p.fading = true;
                if (p.type === 'ice') player.vx *= 1.2;

                if (p.main && p.floor > game.maxFloor) {
                    game.maxFloor = p.floor;
                    game.score += 100 * (p.floor - game.currentFloor);
                    game.currentFloor = p.floor;
                    if (p.floor === 34 || p.floor === 67) startBGM(p.floor);
                    if (p.floor >= 10) unlockAchievement('floor_10');
                    if (p.floor >= 25) unlockAchievement('floor_25');
                    if (p.floor >= 50) unlockAchievement('floor_50');
                    if (p.floor >= 75) unlockAchievement('floor_75');
                    updateUI();
                }

                if (p.type === 'boss') {
                    const boss = bosses.find(b => b.floor === p.floor && !b.defeated);
                    if (boss) {
                        game.inBossFight = true; game.currentBoss = boss;
                        document.getElementById('bossHealthContainer').classList.remove('hidden');
                        document.getElementById('bossName').textContent = boss.name;
                        Sounds.boss(); showMessage(`${boss.name} 등장!`, 'red', '👹');
                    }
                }
                if (p.type === 'goal') gameClear();
            }
        }
    });
    player.grounded = onGround;
    if (player.grounded) player.airJumpAvailable = true;

    if (jumpKey && !player.jumpLocked) {
        if (player.grounded) { performJump(); player.jumpLocked = true; if (game.jumpCount === 1) unlockAchievement('first_jump'); }
        else if (player.wallSliding) { performWallJump(); player.jumpLocked = true; }
        else if (player.buffs.doubleJump > 0 && player.airJumpAvailable) { performJump(true); player.airJumpAvailable = false; player.jumpLocked = true; }
    }
    if (!jumpKey) player.jumpLocked = false;

    // Items
    const coinMult = player.pet === 'star' ? 1.5 : 1;
    coins.forEach(coin => {
        if (coin.collected) return;
        coin.y = coin.baseY + Math.sin(now * 0.005 + coin.floatOffset) * 3;
        if (player.magnet) {
            const dx = (player.x + player.w/2) - (coin.x + coin.w/2);
            const dy = (player.y + player.h/2) - (coin.y + coin.h/2);
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d < 400) { coin.x += (dx / d) * 15; coin.y += (dy / d) * 15; coin.baseY += (dy / d) * 15; }
        }
        if (checkCollision(player, coin)) {
            coin.collected = true;
            const value = Math.floor(coin.value * coinMult);
            game.coins += value; game.totalCoins += value; game.score += 50 * value;
            localStorage.setItem('jumpmap_coins', game.totalCoins);
            Sounds.coin(); createParticle(coin.x + coin.w/2, coin.y + coin.h/2, 8, '#fde047', 3);
            if (game.totalCoins >= 100) unlockAchievement('coins_100');
            if (game.totalCoins >= 500) unlockAchievement('coins_500');
            updateUI();
        }
    });

    // Portals
    portals.forEach(portal => {
        if (!portal.active) return;
        if (checkCollision(player, portal)) {
            const targetPlatform = platforms.find(p => p.floor === portal.toFloor && p.main);
            if (targetPlatform) {
                player.x = targetPlatform.x + targetPlatform.w/2 - player.w/2;
                player.y = targetPlatform.y - player.h - 50;
                player.vy = 0;
                game.camera.targetY = -(player.y - canvas.height * 0.6);
                game.camera.y = game.camera.targetY;
                Sounds.portal(); createParticle(player.x + player.w/2, player.y + player.h/2, 30, '#a855f7', 8);
                showMessage(`${portal.toFloor}층으로 이동!`, 'purple', '🌀');
                portal.active = false; unlockAchievement('portal_user');
                game.currentFloor = portal.toFloor; if(game.currentFloor > game.maxFloor) game.maxFloor = game.currentFloor;
                updateUI();
            }
        }
    });

    // Enemies
    if (!game.timeFrozen) {
        enemies.forEach(enemy => {
            if (enemy.hp <= 0) return;
            if (enemy.type === 'patrol') enemy.x = enemy.startX + Math.sin(now * 0.002 * enemy.speed + enemy.offset) * enemy.range;
            else if (enemy.type === 'projectile') { enemy.x += enemy.vx; enemy.y += enemy.vy; enemy.lifetime--; if (enemy.lifetime <= 0) enemy.hp = 0; }

            if (checkCollision(player, enemy)) {
                if (player.vy > 0 && player.y + player.h < enemy.y + enemy.h/2 + 10) {
                    enemy.hp = 0; player.vy = -12; game.score += 200; Sounds.hit(); createParticle(enemy.x + enemy.w/2, enemy.y + enemy.h/2, 15, '#ef4444', 5);
                } else hitPlayer();
            }
        });

        if (game.inBossFight && game.currentBoss) {
            const boss = game.currentBoss;
            boss.x = canvas.width/2 + Math.sin(now * 0.001) * 200;
            boss.y = boss.y + Math.sin(now * 0.002) * 2;
            boss.attackTimer++;
            if (boss.attackTimer > 100) {
                boss.attackTimer = 0;
                for (let i = 0; i < 3; i++) {
                    enemies.push({ x: boss.x, y: boss.y + boss.h, w: 15, h: 15, type: 'projectile', vx: rand(-4, 4), vy: 5, hp: 1, lifetime: 200 });
                }
            }
            if (checkCollision(player, boss)) {
                if (player.vy > 0 && player.y + player.h < boss.y + boss.h/2) {
                    boss.hp -= 10; player.vy = -15; game.shake = 10; Sounds.hit(); createParticle(boss.x + boss.w/2, boss.y, 20, '#ff6b35', 8);
                    if (boss.hp <= 0) {
                        boss.defeated = true; game.inBossFight = false; game.currentBoss = null; game.score += 5000;
                        document.getElementById('bossHealthContainer').classList.add('hidden');
                        showMessage('보스 처치!', 'yellow', '🎉'); unlockAchievement('first_boss');
                        for (let i = 0; i < 30; i++) coins.push({ x: boss.x + rand(-50, 50), y: boss.y + rand(-50, 50), w: 20, h: 20, baseY: boss.y + rand(-50, 50), floatOffset: rand(0, Math.PI*2), collected: false, value: 5 });
                    }
                    document.getElementById('bossHealthBar').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
                    document.getElementById('bossHpText').textContent = `${Math.ceil((boss.hp / boss.maxHp) * 100)}%`;
                } else hitPlayer();
            }
        }
    }

    if (player.buffs.doubleJump > 0) player.buffs.doubleJump -= 16;
    if (player.buffs.superPotion > 0) player.buffs.superPotion -= 16;
    if (player.pet) { player.petX = lerp(player.petX, player.x - 30, 0.1); player.petY = lerp(player.petY, player.y - 10, 0.1); }

    const targetCamY = -(player.y - canvas.height * 0.6);
    game.camera.targetY = targetCamY; 
    
    // 낙사 리스폰
    if (player.y > platforms[0].y + 300 || player.y > -game.camera.y + canvas.height + 800) respawn();
    
    game.camera.y += (game.camera.targetY - game.camera.y) * 0.08;
    if (game.shake > 0) game.shake *= 0.9;
    updateParticles(); updateTimeUI();
}

// --- 9. Drawing ---
function draw() {
    drawBackground();
    ctx.save();
    const shakeX = (Math.random() - 0.5) * game.shake;
    const shakeY = (Math.random() - 0.5) * game.shake;
    ctx.translate(shakeX, game.camera.y + shakeY);

    // Gravity Zones
    gravityZones.forEach(gz => {
        if (gz.y + game.camera.y < -200 || gz.y + game.camera.y > canvas.height + 200) return;
        ctx.save(); ctx.globalAlpha = 0.3;
        if (gz.type === 'low') { ctx.fillStyle = '#22d3ee'; ctx.strokeStyle = '#06b6d4'; } else { ctx.fillStyle = '#a855f7'; ctx.strokeStyle = '#7c3aed'; }
        ctx.fillRect(gz.x, gz.y, gz.w, gz.h); ctx.strokeRect(gz.x, gz.y, gz.w, gz.h);
        ctx.globalAlpha = 1; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(gz.type === 'low' ? '🪶' : '🔄', gz.x + gz.w/2, gz.y + gz.h/2); ctx.restore();
    });

    // Portals
    portals.forEach(p => {
        if (!p.active) return;
        if (p.y + game.camera.y < -100 || p.y + game.camera.y > canvas.height + 100) return;
        ctx.save(); ctx.translate(p.x + p.w/2, p.y + p.h/2);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.8)'); gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.ellipse(0, 0, 30 + Math.sin(Date.now() * 0.005) * 5, 40, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a855f7'; ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🌀', 0, 8); ctx.restore();
    });

    // Platforms
    platforms.forEach(p => {
        if (p.y + game.camera.y < -50 || p.y + game.camera.y > canvas.height + 50) return;
        if (p.opacity < 0.1) return;
        ctx.save(); ctx.globalAlpha = p.opacity;
        let colorTop, colorSide;
        switch(p.type) {
            case 'start': colorTop = '#4ade80'; colorSide = '#16a34a'; break;
            case 'goal': colorTop = '#fbbf24'; colorSide = '#d97706'; break;
            case 'checkpoint': colorTop = '#facc15'; colorSide = '#ca8a04'; break;
            case 'boss': colorTop = '#ef4444'; colorSide = '#b91c1c'; break;
            case 'ice': colorTop = '#a5f3fc'; colorSide = '#06b6d4'; break;
            case 'bouncy': colorTop = '#f9a8d4'; colorSide = '#ec4899'; break;
            case 'moving': colorTop = '#818cf8'; colorSide = '#4f46e5'; break;
            case 'ghost': colorTop = '#c4b5fd'; colorSide = '#8b5cf6'; break;
            default: colorTop = '#94a3b8'; colorSide = '#475569';
        }
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(p.x + 5, p.y + 5, p.w, p.h);
        ctx.fillStyle = colorSide; ctx.fillRect(p.x, p.y + 5, p.w, p.h - 5);
        ctx.fillStyle = colorTop; ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h - 5, 4); ctx.fill();
        if (p.main && p.type !== 'moving') {
            ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
            const label = p.type === 'start' ? 'START' : p.type === 'goal' ? '🏆 GOAL' : p.type === 'boss' ? `BOSS ${p.floor}F` : `${p.floor}F`;
            ctx.fillText(label, p.x + p.w/2, p.y - 8);
        }

        // [추가됨] 체크포인트 깃발 그리기
        if (p.type === 'checkpoint' || p.type === 'start') {
            const flagX = p.x + p.w - 30;
            const flagY = p.y - 35;
            ctx.fillStyle = '#475569'; ctx.fillRect(flagX, flagY, 4, 35); // 깃대
            ctx.fillStyle = (game.maxFloor >= p.floor) ? '#22c55e' : '#ef4444'; // 녹색 or 빨강
            ctx.beginPath(); ctx.moveTo(flagX + 4, flagY); ctx.lineTo(flagX + 25, flagY + 8); ctx.lineTo(flagX + 4, flagY + 16); ctx.fill();
        }

        ctx.restore();
    });

    // Coins
    coins.forEach(c => {
        if (c.collected) return;
        ctx.save(); ctx.translate(c.x + c.w/2, c.y + c.h/2);
        ctx.scale(Math.abs(Math.sin(Date.now() * 0.005)), 1);
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fillStyle = c.value > 1 ? '#fbbf24' : '#facc15'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#eab308'; ctx.stroke();
        ctx.fillStyle = '#eab308'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.value > 1 ? '★' : '$', 0, 1); ctx.restore();
    });

    // Enemies
    enemies.forEach(e => {
        if (e.hp <= 0) return;
        if (e.y + game.camera.y < -100 || e.y + game.camera.y > canvas.height + 100) return;
        ctx.save(); ctx.translate(e.x + e.w/2, e.y + e.h/2);
        if (e.type === 'projectile') { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.fillStyle = '#22c55e'; ctx.fillRect(-15, -15, 30, 30); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-5, -5, 3, 0, Math.PI * 2); ctx.arc(5, -5, 3, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
    });

    drawBoss();
    drawPlayer();
    chaser.draw();
    if (game.combo > 1) {
        ctx.save();
        ctx.translate(player.x + player.w/2, player.y - 40);
        const scale = 1 + Math.sin(Date.now() * 0.02) * 0.1;
        ctx.scale(scale, scale);

        ctx.font = '900 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000'; ctx.strokeText(`${game.combo} COMBO!`, 0, 0);
        ctx.fillStyle = '#facc15'; ctx.fillText(`${game.combo} COMBO!`, 0, 0);

        // 콤보 게이지 바
        const pct = game.comboTimer / game.maxComboTime;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-20, 10, 40, 4);
        ctx.fillStyle = '#facc15'; ctx.fillRect(-20, 10, 40 * pct, 4);
        ctx.restore();
    }
    if (player.pet) {
        ctx.save(); ctx.translate(player.petX + 15, player.petY + 24 + Math.sin(Date.now() * 0.005) * 5);
        ctx.font = '24px sans-serif'; ctx.textAlign = 'center';
        const petEmoji = player.pet === 'cat' ? '🐱' : player.pet === 'bird' ? '🐦' : player.pet === 'dragon' ? '🐉' : '⭐';
        ctx.fillText(petEmoji, 0, 0); ctx.restore();
    }
    particles.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1; ctx.restore();

    if (game.timeFrozen) { ctx.fillStyle = 'rgba(0, 200, 255, 0.1)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    drawMinimap();
    if (game.running) { requestAnimationFrame(draw); update(); }
}

function drawBoss() {
    if (!game.currentBoss || game.currentBoss.defeated) return;
    const boss = game.currentBoss;
    ctx.save(); ctx.translate(boss.x, boss.y);
    
    ctx.globalAlpha = 0.5;
    const gradient = ctx.createRadialGradient(0, 0, 40, 0, 0, 70);
    gradient.addColorStop(0, boss.floor === 25 ? '#ef4444' : boss.floor === 50 ? '#06b6d4' : '#eab308');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(0, 0, 70 + Math.sin(Date.now()*0.01)*5, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = boss.floor === 25 ? '#b91c1c' : boss.floor === 50 ? '#1e40af' : '#854d0e';
    ctx.beginPath(); 
    for(let i=0; i<8; i++) {
        const angle = (i/8)*Math.PI*2 + Date.now()*0.002;
        const r = 40 + Math.sin(Date.now()*0.01 + i)*5;
        ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
    }
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-15, -10, 10, 0, Math.PI * 2); ctx.arc(15, -10, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-15, -10, 4, 0, Math.PI * 2); ctx.arc(15, -10, 4, 0, Math.PI * 2); ctx.fill();
    
    ctx.restore();
}

function drawBackground() {
    const progress = game.currentFloor / CONFIG.TOTAL_FLOORS;
    let c1, c2;
    if (progress < 0.33) { c1 = [20, 60, 40]; c2 = [10, 30, 50]; }
    else if (progress < 0.66) { c1 = [40, 80, 120]; c2 = [80, 60, 100]; }
    else { c1 = [10, 5, 30]; c2 = [30, 10, 50]; }
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgb(${c1.join(',')})`); gradient.addColorStop(1, `rgb(${c2.join(',')})`);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    bgStars.forEach(s => {
        const y = (s.y + game.camera.y * 0.5) % (canvas.height + 500);
        if (y > -10 && y < canvas.height + 10) {
            ctx.globalAlpha = s.alpha * (0.5 + 0.5 * Math.sin(now * 0.002 + s.twinkle));
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, y, s.size, 0, Math.PI * 2); ctx.fill();
        }
    });
    ctx.globalAlpha = 1;
}

function drawPlayer() {
    if (player.trailType !== 'none') {
        player.trail.forEach((t, i) => {
            ctx.globalAlpha = t.alpha;
            let trailColor = player.color;
            if (player.trailType === 'fire') trailColor = `hsl(${20 + i * 5}, 100%, 50%)`;
            else if (player.trailType === 'ice') trailColor = `hsl(${200 + i * 3}, 80%, 60%)`;
            else if (player.trailType === 'rainbow') trailColor = `hsl(${(Date.now() / 10 + i * 20) % 360}, 80%, 60%)`;
            else if (player.trailType === 'star') trailColor = '#fbbf24'; else if (player.trailType === 'shadow') trailColor = '#1e1b4b';
            ctx.fillStyle = trailColor; ctx.beginPath(); ctx.roundRect(t.x, t.y, t.w, t.h, 6); ctx.fill();
            t.alpha -= 0.08;
        });
        ctx.globalAlpha = 1;
    }
    player.trail.push({ x: player.x, y: player.y, w: player.w, h: player.h, alpha: 0.4 });
    if (player.trail.length > 8) player.trail.shift();

    ctx.save(); ctx.translate(player.x + player.w/2, player.y + player.h); ctx.scale(player.scaleX, player.scaleY);
    ctx.fillStyle = player.isDashing ? '#22d3ee' : (player.buffs.shield ? '#60a5fa' : player.color);
    ctx.beginPath(); ctx.roundRect(-player.w/2, -player.h, player.w, player.h, 6); ctx.fill();
    if (player.buffs.doubleJump > 0) {
        ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(-player.w/2, -player.h/2); ctx.lineTo(-player.w, -player.h); ctx.lineTo(-player.w/2, -player.h + 10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(player.w/2, -player.h/2); ctx.lineTo(player.w, -player.h); ctx.lineTo(player.w/2, -player.h + 10); ctx.fill();
    }
    const eyeOffset = player.facing * 5;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-8 + eyeOffset, -35, 6, 0, Math.PI * 2); ctx.arc(8 + eyeOffset, -35, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-8 + eyeOffset + player.facing, -35, 3, 0, Math.PI * 2); ctx.arc(8 + eyeOffset + player.facing, -35, 3, 0, Math.PI * 2); ctx.fill();
    if (player.hat !== 'none') {
        ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
        const hatEmoji = player.hat === 'crown' ? '👑' : player.hat === 'wizard' ? '🎩' : player.hat === 'party' ? '🎉' : player.hat === 'halo' ? '😇' : '😈';
        ctx.fillText(hatEmoji, 0, -player.h - 5);
    }
    if (player.buffs.shield) { ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -player.h/2, player.w, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
}

function drawMinimap() {
    const mCtx = minimapCtx; mCtx.fillStyle = 'rgba(0, 0, 0, 0.8)'; mCtx.fillRect(0, 0, 96, 160);
    const viewRange = 2000; const scale = 160 / viewRange;
    platforms.forEach(p => {
        const relY = player.y - p.y;
        if (Math.abs(relY) < viewRange / 2) {
            const y = 80 - relY * scale; const x = (p.x / canvas.width) * 96; const w = (p.w / canvas.width) * 96;
            mCtx.fillStyle = p.type === 'checkpoint' ? '#facc15' : p.type === 'boss' ? '#ef4444' : '#6b7280';
            mCtx.fillRect(x, y, Math.max(w, 2), 2);
        }
    });
    mCtx.fillStyle = '#22d3ee'; mCtx.beginPath(); mCtx.arc(48, 80, 4, 0, Math.PI * 2); mCtx.fill();
}

// --- 10. Helper Functions ---
function performJump(isDouble = false) {
    const jumpMult = player.pet === 'bird' ? 1.15 : 1; const potionMult = player.buffs.superPotion > 0 ? 1.2 : 1;
    player.vy = -player.jumpForce * (isDouble ? 0.9 : 1) * jumpMult * potionMult;
    player.scaleX = 0.8; player.scaleY = 1.3; game.jumpCount++;
    if (isDouble) Sounds.doubleJump(); else Sounds.jump();
    createParticle(player.x + player.w/2, player.y + player.h, 8, isDouble ? '#fbbf24' : '#fff', 3);
}

function performWallJump() {
    player.vy = -player.jumpForce * 0.9; player.vx = player.wallDir * 10;
    player.scaleX = 0.8; player.scaleY = 1.2; game.jumpCount++;
    Sounds.jump(); createParticle(player.wallDir === -1 ? player.x + player.w : player.x, player.y + player.h/2, 10, '#fff', 4);
}

function performDash() {
    if (!player.canDash) return;
    player.canDash = false; player.isDashing = true; player.dashLastTime = Date.now();
    let dashDir = player.facing;
    if (keys['ArrowLeft'] || keys['KeyA']) dashDir = -1;
    if (keys['ArrowRight'] || keys['KeyD']) dashDir = 1;
    player.vx = dashDir * (20 + player.upgrades.dash * 3); player.vy = 0; game.shake = 5;
    Sounds.dash(); createParticle(player.x + player.w/2, player.y + player.h/2, 15, '#06b6d4', 6);
}

function hitPlayer() {
    if (player.buffs.shield) { player.buffs.shield = false; game.shake = 5; Sounds.hit(); showMessage('방어 성공!', 'blue', '🛡️'); updateBuffUI(); return; }
    player.lives--; player.vy = -12; player.vx = player.facing * -10; game.shake = 15; Sounds.hit(); createParticle(player.x + player.w/2, player.y + player.h/2, 20, '#ef4444', 6);
    if (player.lives <= 0) respawn(); else showMessage(`피격! 남은 생명: ${player.lives}`, 'red', '💔');
}

function respawn() {
    game.combo = 0;
    game.comboTimer = 0;
    player.lastPlatform = null; // 방금 밟은 발판 정보도 초기화
    let respawnPoint = platforms[0];
    const checkpoints = platforms.filter(p => (p.type === 'checkpoint' || p.type === 'start' || p.type === 'boss') && p.floor <= game.currentFloor);
    if (checkpoints.length > 0) { checkpoints.sort((a, b) => b.floor - a.floor); respawnPoint = checkpoints[0]; }
    
    player.x = respawnPoint.x + respawnPoint.w/2 - player.w/2;
    player.y = respawnPoint.y - player.h - 50;
    player.vx = 0; player.vy = 0; player.lives = 1 + player.upgrades.life;
    game.camera.targetY = -(player.y - canvas.height * 0.7); game.camera.y = game.camera.targetY;
    game.inBossFight = false; game.currentBoss = null;
    document.getElementById('bossHealthContainer').classList.add('hidden');
    game.score = Math.max(0, game.score - 500); updateUI();
    
    // --- [중요] AI 캠핑 방지 로직 ---
    if (chaser.active) {
        if (game.currentFloor <= 5) {
            // 초반 5층 이하: AI를 시작 지점으로 강제 이동시키고 3초간 비활성화
            chaser.reset(platforms[0].x, platforms[0].y - 50);
            chaser.active = false;
            showMessage('AI가 잠시 멈춥니다', 'green', '🛡️');
            setTimeout(() => { if(game.running) chaser.active = true; }, 3000);
        } else {
            // 중반 이후: AI를 플레이어 화면 밖 아주 먼 아래로 이동 (800px 아래)
            chaser.x = player.x;
            chaser.y = player.y + 800;
            chaser.vx = 0;
            chaser.vy = 0;
            chaser.mode = 'chase'; // 매복 모드 해제
        }
    }

    showMessage(`${respawnPoint.floor}층 재시작`, 'white', '🔄');
}

// [추가됨] 데이터 초기화 기능
function resetGameData() {
    if (confirm("⚠️ 경고: 모든 게임 데이터를 삭제하시겠습니까?\n\n- 모은 코인\n- 구매한 스킬 및 업그레이드\n- 업적\n\n이 모두 사라지며 되돌릴 수 없습니다.")) {
        localStorage.clear();
        location.reload(); // 페이지 새로고침
    }
}

function gameClear() {
    game.running = false; stopBGM(); unlockAchievement('floor_100');
    const elapsed = Math.floor((Date.now() - game.startTime) / 1000);
    if (elapsed < 180) unlockAchievement('speed_demon');
    Sounds.achievement();
    const min = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const sec = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('clearScore').textContent = game.score;
    document.getElementById('clearTime').textContent = `${min}:${sec}`;
    ui.clearScreen.classList.remove('hidden');
}

function checkCollision(r1, r2) { return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y; }
function createParticle(x, y, count, color, speed = 3) {
    for (let i = 0; i < count; i++) { if (particles.length > 300) particles.shift(); particles.push({ x, y, vx: rand(-speed, speed), vy: rand(-speed, speed), life: 1, decay: rand(0.03, 0.06), color, size: rand(2, 5) }); }
}
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= p.decay; if (p.life <= 0) particles.splice(i, 1); }
}
function updateUI() {
    document.getElementById('floorDisplay').textContent = game.currentFloor;
    document.getElementById('progressBar').style.width = `${(game.currentFloor / CONFIG.TOTAL_FLOORS) * 100}%`;
    document.getElementById('scoreDisplay').textContent = game.score;
    document.getElementById('coinDisplay').textContent = `💰 ${game.totalCoins}`;
    document.getElementById('shopCoins').textContent = game.totalCoins;
    if(document.getElementById('skillShopCoins')) document.getElementById('skillShopCoins').textContent = game.totalCoins;
}
function updateTimeUI() {
    const elapsed = Math.floor((Date.now() - game.startTime) / 1000);
    const min = Math.floor(elapsed / 60).toString().padStart(2, '0'); const sec = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('timeDisplay').textContent = `${min}:${sec}`;
}
function updateBuffUI() {
    const container = document.getElementById('buffContainer'); container.innerHTML = '';
    if (player.buffs.doubleJump > 0) container.innerHTML += `<div class="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500 flex items-center justify-center text-lg">⚡</div>`;
    if (player.buffs.shield) container.innerHTML += `<div class="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500 flex items-center justify-center text-lg">🛡️</div>`;
    if (player.buffs.superPotion > 0) container.innerHTML += `<div class="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500 flex items-center justify-center text-lg">🧪</div>`;
    if (player.magnet) container.innerHTML += `<div class="w-8 h-8 rounded-lg bg-yellow-600/20 border border-yellow-600 flex items-center justify-center text-lg">🧲</div>`;
    const petDisplay = document.getElementById('petDisplay');
    if (player.pet) { petDisplay.classList.remove('hidden'); const petEmoji = player.pet === 'cat' ? '🐱' : player.pet === 'bird' ? '🐦' : player.pet === 'dragon' ? '🐉' : '⭐'; petDisplay.textContent = petEmoji; } else petDisplay.classList.add('hidden');
}
function showMessage(text, color = 'white', icon = '') {
    const el = document.getElementById('messageOverlay');
    document.getElementById('messageText').textContent = text; document.getElementById('messageIcon').textContent = icon;
    document.getElementById('messageText').className = `text-${color}-300 font-bold text-xl`;
    el.style.opacity = '1'; el.style.transform = 'translate(-50%, -50%) scale(1)';
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%, -50%) scale(0.9)'; }, 2000);
}

// --- 11. Modal Functions ---
function toggleModal(id) {
    const modal = document.getElementById(id); const isHidden = modal.classList.contains('hidden');
    document.querySelectorAll('.modal-overlay').forEach(m => { if (m.id !== 'startScreen' && m.id !== 'clearScreen') m.classList.add('hidden'); });
    if (isHidden) { modal.classList.remove('hidden'); game.paused = true; if (id === 'achievementModal') updateAchievementList(); updateUpgradeUI(); }
    else { modal.classList.add('hidden'); game.paused = false; }
}
function buyItem(item, cost) {
    if (game.totalCoins >= cost) {
        game.totalCoins -= cost; localStorage.setItem('jumpmap_coins', game.totalCoins); updateUI(); Sounds.buy();
        if (item === 'shield') player.buffs.shield = true;
        else if (item === 'potion') player.buffs.superPotion = 30000;
        else if (item === 'magnet') { player.magnet = true; localStorage.setItem('has_magnet', 'true'); }
        updateBuffUI(); showMessage('구매 완료!', 'green', '✅');
    } else { Sounds.error(); showMessage('코인이 부족합니다!', 'red', '❌'); }
}
function buyPet(pet, cost) {
    if (game.totalCoins >= cost) {
        game.totalCoins -= cost; localStorage.setItem('jumpmap_coins', game.totalCoins);
        player.pet = pet; localStorage.setItem('player_pet', pet);
        updateUI(); updateBuffUI(); Sounds.buy(); unlockAchievement('pet_owner'); showMessage('펫 획득!', 'pink', '🐾');
    } else { Sounds.error(); showMessage('코인이 부족합니다!', 'red', '❌'); }
}
function buyUpgrade(type) {
    const costs = { jump: 20, speed: 20, dash: 30, life: 50 };
    const maxLevels = { jump: 5, speed: 5, dash: 5, life: 3 };
    if (player.upgrades[type] >= maxLevels[type]) { showMessage('이미 최대 레벨입니다!', 'yellow', '⚠️'); return; }
    if (game.totalCoins >= costs[type]) {
        game.totalCoins -= costs[type]; player.upgrades[type]++;
        localStorage.setItem('jumpmap_coins', game.totalCoins); localStorage.setItem(`upg_${type}`, player.upgrades[type]);
        player.jumpForce = player.baseJump + player.upgrades.jump * 1.5;
        player.speed = player.baseSpeed + player.upgrades.speed * 0.8;
        player.lives = 1 + player.upgrades.life;
        updateUI(); updateUpgradeUI(); Sounds.buy(); showMessage('업그레이드 완료!', 'cyan', '⬆️');
    } else { Sounds.error(); showMessage('코인이 부족합니다!', 'red', '❌'); }
}
function buySkill(num) {
    const costs = { 2: 80, 3: 120 };
    if (player.skills[num]) { showMessage('이미 보유중입니다!', 'yellow', '⚠️'); return; }
    if (game.totalCoins >= costs[num]) {
        game.totalCoins -= costs[num]; player.skills[num] = true;
        localStorage.setItem('jumpmap_coins', game.totalCoins); localStorage.setItem(`skill_${num}`, 'true');
        updateUI(); Sounds.buy(); showMessage('스킬 해금!', 'purple', '🔮');
        document.getElementById(`skill${num}Btn`).textContent = '보유중'; document.getElementById(`skill${num}Btn`).disabled = true; document.getElementById(`skill${num}Btn`).classList.add('opacity-50');
        if (player.skills[2] && player.skills[3]) unlockAchievement('skill_master');
    } else { Sounds.error(); showMessage('코인이 부족합니다!', 'red', '❌'); }
}
function updateUpgradeUI() {
    if(document.getElementById('jumpLv')) document.getElementById('jumpLv').textContent = player.upgrades.jump;
    if(document.getElementById('speedLv')) document.getElementById('speedLv').textContent = player.upgrades.speed;
    if(document.getElementById('dashLv')) document.getElementById('dashLv').textContent = player.upgrades.dash;
    if(document.getElementById('lifeLv')) document.getElementById('lifeLv').textContent = player.upgrades.life;
    if (player.skills[2] && document.getElementById('skill2Btn')) { document.getElementById('skill2Btn').textContent = '보유중'; document.getElementById('skill2Btn').classList.add('opacity-50'); }
    if (player.skills[3] && document.getElementById('skill3Btn')) { document.getElementById('skill3Btn').textContent = '보유중'; document.getElementById('skill3Btn').classList.add('opacity-50'); }
}
function setColor(color) { player.color = color; localStorage.setItem('player_color', color); showMessage('색상 변경!', 'pink', '🎨'); }
function setHat(hat) { player.hat = hat; localStorage.setItem('player_hat', hat); showMessage('모자 변경!', 'yellow', '🎩'); }
function setTrail(trail) { player.trailType = trail; localStorage.setItem('player_trail', trail); showMessage('트레일 변경!', 'cyan', '✨'); }
function restartGame() { ui.clearScreen.classList.add('hidden'); initGame(); draw(); }
function loadSavedData() {
    player.color = localStorage.getItem('player_color') || '#6366f1';
    player.hat = localStorage.getItem('player_hat') || 'none';
    player.trailType = localStorage.getItem('player_trail') || 'none';
    player.pet = localStorage.getItem('player_pet') || null;
    player.skills[2] = localStorage.getItem('skill_2') === 'true';
    player.skills[3] = localStorage.getItem('skill_3') === 'true';
}

loadSavedData(); updateUpgradeUI();
document.getElementById('startBtn').addEventListener('click', () => {
    ui.startScreen.classList.add('hidden');
    if (audioCtx.state === 'suspended') audioCtx.resume();
    initGame(); draw();
});
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}
