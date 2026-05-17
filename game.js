/**
 * game.js — 核心游戏逻辑
 * 
 * 作用：管理游戏主状态机、玩家属性、波次系统、开火逻辑、
 *       升级系统、受伤与加速机制、游戏结束与重置。
 */

// ==================== 游戏状态变量 ====================
let gameState = GameState.START;
let waveState = WaveState.SPAWNING;

let wave = 1;
let kills = 0;
let level = 1;
let currentExp = 0;
let expNeeded = 20;
let playerHp = BASE_CONFIG.playerMaxHp;
let survivalTime = 0;
let maxCombo = 0;
let currentCombo = 0;
let comboTimer = null;
let shootTimer = 0;
let totalExpCollected = 0;

let lastDamageTime = -9999;
let speedBoostActive = false;
let speedBoostEndTime = 0;
let currentSpeedMultiplier = 1.0;

let enemiesToSpawn = 0;
let waveSpawned = false;
let breakStartTime = 0;

let cameraYaw = 0;
let cameraPitch = 0;
let screenShakeX = 0;
let screenShakeY = 0;

let minimapFrameCounter = 0;
let raycastFrameCounter = 0;

// ==================== 复用数学对象 ====================
const _forward = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _moveVec = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();

// ==================== 玩家实体 ====================
const playerGroup = new THREE.Group();
scene.add(playerGroup);

const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x003322,
    emissiveIntensity: 0.3,
    roughness: 0.3,
    transparent: true,
    opacity: 0
});

const playerBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.9, 0.9),
    bodyMat
);
playerBody.position.y = 0.45;
playerBody.castShadow = true;
playerGroup.add(playerBody);

// 枪械模型
const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.9),
    new THREE.MeshStandardMaterial({
        color: 0x555566,
        metalness: 0.7,
        roughness: 0.2
    })
);
gun.position.set(0.25, -0.25, -0.5);
gun.rotation.y = Math.PI;
camera.add(gun);

// 枪口闪光
const muzzle = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffaa00 })
);
muzzle.position.set(0.25, -0.25, -0.95);
muzzle.visible = false;
camera.add(muzzle);

// 加速光环
const boostRing = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.8, 32),
    new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
    })
);
boostRing.rotation.x = -Math.PI / 2;
boostRing.position.y = 0.05;
playerGroup.add(boostRing);

// ==================== 波次管理 ====================

/** 开始新波次 */
function startWave() {
    enemiesToSpawn = Math.floor(4 + wave * 1.2);
    waveState = WaveState.SPAWNING;
    waveSpawned = true;

    const alert = document.getElementById('waveAlert');
    alert.textContent = wave % 10 === 0 ? `★ BOSS 波次 ${wave} ★` : `波次 ${wave}`;
    alert.style.color = wave % 10 === 0 ? '#ff0044' : '#ff4444';
    alert.style.opacity = 1;
    setTimeout(() => alert.style.opacity = 0, 2500);
    updateHUD();
    // 开始游戏时锁定指针
    requestPointerLock();
}

/** 开始波次间休息 */
function startBreak() {
    waveState = WaveState.BREAK;
    breakStartTime = Date.now();

    const alert = document.getElementById('breakAlert');
    const timer = document.getElementById('breakTimer');
    alert.style.opacity = 1;
    timer.style.opacity = 1;
    timer.textContent = '5';

    let remaining = 5;
    const countdown = setInterval(() => {
        remaining--;
        if (remaining > 0) timer.textContent = remaining;
        else timer.textContent = '0';
        if (remaining <= 0 || waveState !== WaveState.BREAK) {
            clearInterval(countdown);
            alert.style.opacity = 0;
            timer.style.opacity = 0;
        }
    }, 1000);

    setTimeout(() => {
        if (waveState === WaveState.BREAK) {
            wave++;
            startWave();
        }
    }, BASE_CONFIG.breakDuration);
}

/** 更新波次状态：生成敌人或进入休息 */
function updateWave(time) {
    if (waveState !== WaveState.SPAWNING) return;

    if (enemiesToSpawn > 0 && Math.random() < 0.08) {
        let type = 'normal';
        const r = Math.random();
        if (wave % 10 === 0 && enemiesToSpawn === Math.floor(4 + wave * 1.2)) {
            type = 'boss';
        } else if (r < 0.1 + wave * 0.012) {
            type = 'elite';
        }
        enemies.push(new Enemy(type));
        enemiesToSpawn--;
    } else if (enemies.length === 0 && enemiesToSpawn === 0 && waveSpawned) {
        startBreak();
    }
}

// ==================== 开火系统 ====================

/** 发射一颗子弹 */
function fireBullet() {
    _forward.set(0, 0, -1);
    _euler.set(cameraPitch, cameraYaw, 0);
    _forward.applyEuler(_euler);

    const flatForward = _vec3.set(_forward.x, 0, _forward.z).normalize();
    if (flatForward.length() < 0.001) flatForward.set(0, 0, -1);

    const dmg = runtime.bulletDamage + level * 2;
    const bx = playerGroup.position.x + flatForward.x * 0.5;
    const bz = playerGroup.position.z + flatForward.z * 0.5;

    // 主子弹
    const b = new Bullet();
    b.spawn(bx, 0.5, bz, flatForward.x, flatForward.z, dmg);
    bullets.push(b);

    // 散射弹
    if (runtime.scatterShot) {
        const sp = 0.18;
        const perpX = -flatForward.z;
        const perpZ = flatForward.x;

        const b1 = new Bullet();
        b1.spawn(bx, 0.5, bz,
            flatForward.x + perpX * sp,
            flatForward.z + perpZ * sp,
            dmg * 0.6);
        bullets.push(b1);

        const b2 = new Bullet();
        b2.spawn(bx, 0.5, bz,
            flatForward.x - perpX * sp,
            flatForward.z - perpZ * sp,
            dmg * 0.6);
        bullets.push(b2);
    }

    // 枪口闪光
    muzzle.visible = true;
    setTimeout(() => muzzle.visible = false, BASE_CONFIG.muzzleFlashDuration);

    // 枪械后坐力
    gun.position.z = -0.5 + BASE_CONFIG.gunRecoilDistance;
    setTimeout(() => gun.position.z = -0.5, BASE_CONFIG.gunRecoilDuration);

    // UI 开火指示
    const fireIndicator = document.getElementById('fireIndicator');
    fireIndicator.classList.add('active');
    setTimeout(() => fireIndicator.classList.remove('active'), 100);
}

/** 自动开火检测（射线检测 + 角度检测） */
function updateAutoFire(time) {
    if (waveState === WaveState.BREAK) return;
    if (time - shootTimer < runtime.bulletInterval) return;

    raycastFrameCounter++;
    if (raycastFrameCounter < BASE_CONFIG.raycastInterval) return;
    raycastFrameCounter = 0;

    _forward.set(0, 0, -1);
    _euler.set(cameraPitch, cameraYaw, 0);
    _forward.applyEuler(_euler);

    _raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const enemyMeshes = enemies.map(e => e.mesh);
    const intersects = _raycaster.intersectObjects(enemyMeshes);

    let target = null;

    // 射线直接命中
    if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.distance < BASE_CONFIG.autoFireRange) {
            target = enemies.find(e => e.mesh === hit.object);
        }
    }

    // 角度范围内最近敌人
    if (!target) {
        let bestAngle = Infinity;
        enemies.forEach(e => {
            _toEnemy.subVectors(e.mesh.position, camera.position).normalize();
            const angle = _forward.angleTo(_toEnemy);
            const dist = camera.position.distanceTo(e.mesh.position);
            if (angle < BASE_CONFIG.autoFireAngle &&
                dist < BASE_CONFIG.autoFireRange &&
                angle < bestAngle) {
                bestAngle = angle;
                target = e;
            }
        });
    }

    const crosshairDot = document.getElementById('crosshair-dot');
    if (target) {
        crosshairDot.classList.add('active');
        if (autoFireEnabled) {
            shootTimer = time;
            fireBullet();
        }
    } else {
        crosshairDot.classList.remove('active');
    }
}

/** 手动开火更新 */
function updateManualFire(time) {
    if (waveState === WaveState.BREAK) return;
    if (!manualFirePressed) return;
    if (time - shootTimer < runtime.bulletInterval) return;

    shootTimer = time;
    fireBullet();
}

// ==================== 升级系统 ====================

const upgrades = [
    { name: '火力强化', desc: '子弹伤害 +25%', icon: '🔥', once: false, apply: () => runtime.bulletDamage *= 1.25 },
    { name: '快速射击', desc: '射速 +20%', icon: '⚡', once: false, apply: () => runtime.bulletInterval *= 0.8 },
    { name: '机动装甲', desc: '移速 +15%', icon: '🏃', once: false, apply: () => runtime.playerSpeed *= 1.15 },
    { name: '生命扩容', desc: '最大生命 +25', icon: '❤️', once: false, apply: () => { runtime.playerMaxHp += 25; playerHp += 25; } },
    { name: '磁力收集', desc: '经验吸附 +3', icon: '🧲', once: false, apply: () => runtime.expMagnetRadius += 3 },
    { name: '散射弹', desc: '额外2发子弹', icon: '🔱', once: true, apply: () => runtime.scatterShot = true },
    { name: '穿甲弹', desc: '子弹穿透1次', icon: '➡️', once: true, apply: () => runtime.pierceShot = true },
    { name: '暴击之眼', desc: '暴击率 +20%', icon: '💥', once: false, apply: () => { } }
];

/** 显示升级菜单 */
function showUpgrade() {
    gameState = GameState.UPGRADE;
    const menu = document.getElementById('upgradeMenu');
    const list = document.getElementById('upgradeList');
    list.innerHTML = '';

    // 过滤已选的一次性升级
    const available = upgrades.filter(u => !u.once || !selectedOnceUpgrades.has(u.name));
    let choices = [];
    const pool = [...available];

    while (choices.length < 3 && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        const pick = pool.splice(idx, 1)[0];
        choices.push(pick);
    }

    choices.forEach(u => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
            <div class="upgrade-icon">${u.icon}</div>
            <div class="upgrade-name">${u.name}</div>
            <div class="upgrade-desc">${u.desc}</div>
        `;
        card.onclick = () => {
            u.apply();
            if (u.once) selectedOnceUpgrades.add(u.name);
            playerHp = Math.min(
                playerHp + runtime.playerMaxHp * BASE_CONFIG.upgradeHealPercent,
                runtime.playerMaxHp
            );
            updateHUD();
            menu.style.display = 'none';
            gameState = GameState.PLAYING;
        };
        list.appendChild(card);
    });

    menu.style.display = 'flex';
}

// ==================== 受伤与加速 ====================

/** 玩家受到伤害 */
function playerTakeDamage(dmg) {
    if (gameState !== GameState.PLAYING) return;

    const now = Date.now();
    if (now - lastDamageTime < BASE_CONFIG.damageCooldown) return;

    lastDamageTime = now;
    playerHp -= dmg;

    // 受伤闪烁
    bodyMat.emissive.setHex(0xff0000);
    bodyMat.emissiveIntensity = 1;
    setTimeout(() => {
        bodyMat.emissive.setHex(0x003322);
        bodyMat.emissiveIntensity = 0.3;
    }, 120);

    // 屏幕震动
    screenShakeX = (Math.random() - 0.5) * 0.5;
    screenShakeY = (Math.random() - 0.5) * 0.5;

    activateSpeedBoost();

    if (playerHp <= 0) {
        playerHp = 0;
        gameOver();
    }
    updateHUD();
}

/** 激活肾上腺素加速 */
function activateSpeedBoost() {
    const now = Date.now();
    speedBoostActive = true;
    speedBoostEndTime = now + BASE_CONFIG.speedBoostDuration;
    currentSpeedMultiplier = BASE_CONFIG.speedBoostMultiplier;

    const indicator = document.getElementById('speedBoostIndicator');
    indicator.style.opacity = 1;
    boostRing.material.opacity = 0.6;

    setTimeout(() => {
        speedBoostActive = false;
        currentSpeedMultiplier = 1.0;
        indicator.style.opacity = 0;
        boostRing.material.opacity = 0;
    }, BASE_CONFIG.speedBoostDuration);
}

/** 更新加速视觉效果 */
function updateSpeedBoost(time) {
    if (!speedBoostActive) return;
    const progress = (speedBoostEndTime - time) / BASE_CONFIG.speedBoostDuration;
    boostRing.scale.setScalar(1 + (1 - progress) * 0.5);
    boostRing.material.opacity = 0.6 * progress;
    boostRing.rotation.z += 0.1;
}

// ==================== 游戏结束与重置 ====================

/** 游戏结束 */
function gameOver() {
    gameState = GameState.GAMEOVER;
    const panel = document.getElementById('gameOver');
    const stats = document.getElementById('stats');
    const m = Math.floor(survivalTime / 60);
    const s = Math.floor(survivalTime % 60);

    stats.innerHTML = `
        <div class="stat-row"><span class="stat-label">⏱️ 生存时间</span><span class="stat-value">${m}分${s}秒</span></div>
        <div class="stat-row"><span class="stat-label">💀 击杀总数</span><span class="stat-value">${kills}</span></div>
        <div class="stat-row"><span class="stat-label">🌊 到达波次</span><span class="stat-value">${wave}</span></div>
        <div class="stat-row"><span class="stat-label">🔥 最高连杀</span><span class="stat-value">${maxCombo}</span></div>
        <div class="stat-row"><span class="stat-label">⭐ 累计经验</span><span class="stat-value">${totalExpCollected}</span></div>
        <div class="stat-row"><span class="stat-label">📊 最终等级</span><span class="stat-value">${level}</span></div>
    `;
    panel.style.display = 'flex';
    clearDamageTexts();
    // 游戏结束时退出指针锁定
    exitPointerLock();
}

/** 完全重置游戏 */
function resetGame() {
    // 清理所有实体
    enemies.forEach(e => e.destroy());
    enemies.length = 0;

    bullets.forEach(b => b.recycle());
    bullets.length = 0;

    expOrbs.forEach(o => o.destroy());
    expOrbs.length = 0;

    activeParticles.forEach(p => p.recycle());
    activeParticles.length = 0;

    clearDamageTexts();
    selectedOnceUpgrades.clear();

    // 重置运行时配置
    runtime.playerSpeed = BASE_CONFIG.playerSpeed;
    runtime.playerMaxHp = BASE_CONFIG.playerMaxHp;
    runtime.bulletDamage = BASE_CONFIG.bulletDamage;
    runtime.bulletInterval = BASE_CONFIG.bulletInterval;
    runtime.enemyBaseHp = BASE_CONFIG.enemyBaseHp;
    runtime.enemyBaseSpeed = BASE_CONFIG.enemyBaseSpeed;
    runtime.enemyBaseDamage = BASE_CONFIG.enemyBaseDamage;
    runtime.expMagnetRadius = BASE_CONFIG.expMagnetRadius;
    runtime.scatterShot = false;
    runtime.pierceShot = false;

    // 重置游戏状态
    gameState = GameState.START;
    waveState = WaveState.SPAWNING;
    wave = 1;
    kills = 0;
    level = 1;
    currentExp = 0;
    expNeeded = 20;
    playerHp = BASE_CONFIG.playerMaxHp;
    survivalTime = 0;
    maxCombo = 0;
    currentCombo = 0;
    comboTimer = null;
    shootTimer = 0;
    totalExpCollected = 0;
    lastDamageTime = -9999;
    speedBoostActive = false;
    speedBoostEndTime = 0;
    currentSpeedMultiplier = 1.0;
    enemiesToSpawn = 0;
    waveSpawned = false;
    cameraYaw = 0;
    cameraPitch = 0;
    screenShakeX = 0;
    screenShakeY = 0;

    playerGroup.position.set(0, 0, 0);
    bulletPool.clear();
    particlePool.clear();

    updateHUD();
    // 重置时退出指针锁定
    exitPointerLock();
}

/** 更新 HUD 显示 */
function updateHUD() {
    document.getElementById('wave').textContent = wave;
    document.getElementById('kills').textContent = kills;
    document.getElementById('level').textContent = level;
    document.getElementById('combo').textContent = currentCombo;
    document.getElementById('hpFill').style.width =
        Math.max(0, playerHp / runtime.playerMaxHp * 100) + '%';
    document.getElementById('expFill').style.width =
        Math.min(100, currentExp / expNeeded * 100) + '%';
}