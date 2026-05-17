/**
 * config.js — 游戏配置与状态枚举
 * 
 * 作用：集中管理所有游戏常量、状态枚举和运行时配置。
 *       所有数值参数统一从这里读取，便于平衡性调整。
 */

// ==================== 状态机枚举 ====================
const GameState = {
    START: 0,
    PLAYING: 1,
    UPGRADE: 2,
    BREAK: 3,
    GAMEOVER: 4
};

const WaveState = {
    SPAWNING: 0,
    BREAK: 1
};

// ==================== 基础配置（只读常量） ====================
const BASE_CONFIG = Object.freeze({
    // 移动与视角
    playerSpeed: 0.085,
    lookSensitivity: 0.002,
    touchLookSensitivity: 0.18,
    joystickDeadzone: 0.12,
    
    // 生命值
    playerMaxHp: 80,
    
    // 子弹参数
    bulletSpeed: 0.65,
    bulletDamage: 12,
    bulletInterval: 400,
    bulletLife: 80,
    
    // 敌人参数
    enemyBaseHp: 45,
    enemyBaseSpeed: 0.058,
    enemyBaseDamage: 15,
    
    // 波次参数
    waveInterval: 3000,
    breakDuration: 5000,
    
    // 经验系统
    expRadius: 1.2,
    expMagnetRadius: 4,
    upgradeHealPercent: 0.2,
    
    // 受伤与无敌
    damageCooldown: 300,
    speedBoostDuration: 1000,
    speedBoostMultiplier: 2.0,
    
    // 自动开火
    autoFireRange: 22,
    autoFireAngle: 0.06,
    
    // 小地图
    minimapRange: 30,
    minimapSize: 320,
    minimapUpdateInterval: 3,
    
    // 碰撞与物理
    enemyCollisionDist: 2,
    enemyCollisionPush: 0.04,
    playerHitDist: 1.3,
    playerHitPush: 0.6,
    
    // 视觉效果
    muzzleFlashDuration: 60,
    gunRecoilDistance: 0.1,
    gunRecoilDuration: 80,
    screenShakeDecay: 0.85,
    particleGravity: 0.012,
    damageTextLife: 40,
    damageTextRiseSpeed: 0.025,
    
    // 生成参数
    spawnDistMin: 26,
    spawnDistMax: 42,
    
    // 动画
    headBobSpeed: 10,
    headBobAmount: 0.03,
    invincibleFlashSpeed: 10,
    
    // 性能
    raycastInterval: 3,
    
    // 新增：血条配置
    healthBarWidth: 1.2,       // 血条宽度系数
    healthBarHeight: 0.15,     // 血条高度系数
    healthBarOffsetY: 0.8      // 血条头顶偏移量
});

// ========== 运行时状态（可修改，随升级变化） ===========
const runtime = {
    playerSpeed: BASE_CONFIG.playerSpeed,
    playerMaxHp: BASE_CONFIG.playerMaxHp,
    bulletDamage: BASE_CONFIG.bulletDamage,
    bulletInterval: BASE_CONFIG.bulletInterval,
    enemyBaseHp: BASE_CONFIG.enemyBaseHp,
    enemyBaseSpeed: BASE_CONFIG.enemyBaseSpeed,
    enemyBaseDamage: BASE_CONFIG.enemyBaseDamage,
    expMagnetRadius: BASE_CONFIG.expMagnetRadius,
    scatterShot: false,
    pierceShot: false
};

// ============= 一次性升级记录 =========
const selectedOnceUpgrades = new Set();