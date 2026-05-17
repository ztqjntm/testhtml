/**
 * entities.js — 游戏实体定义
 * 
 * 作用：定义游戏中所有动态实体类（敌人、子弹、经验球、粒子），
 *       每个类封装自己的更新逻辑和生命周期管理。
 */

// ==================== 数据集合 ====================
const enemies = [];
const bullets = [];
const expOrbs = [];
const activeParticles = [];
const damageTexts = [];
const itemDrops = [];

// ==================== 复用的数学对象 ====================
const _vec3 = new THREE.Vector3();
const _toEnemy = new THREE.Vector3();

// ==================== 敌人类 ====================
class Enemy {
    constructor(type = 'normal') {
        this.type = type;
        const waveMult = 1 + wave * 0.18;

        // 根据类型和波次计算属性
        this.hp = (runtime.enemyBaseHp + wave * 8) *
            (type === 'boss' ? 4 : (type === 'elite' ? 2 : 1));
        this.speed = (runtime.enemyBaseSpeed + wave * 0.005) *
            (type === 'boss' ? 0.65 : 1);
        this.damage = (runtime.enemyBaseDamage + wave * 2.5) *
            (type === 'boss' ? 2 : 1);
        this.size = type === 'boss' ? 2.8 : (type === 'elite' ? 1.6 : 1);
        this.expValue = type === 'boss' ? 50 : (type === 'elite' ? 25 : 10);
        this.maxHp = this.hp;

        // 创建网格
        const geo = new THREE.BoxGeometry(this.size, this.size, this.size);
        const color = type === 'boss' ? 0xff0044 :
            (type === 'elite' ? 0xff8800 : 0xff3333);
        this.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.25,
            roughness: 0.4
        }));

        // 随机生成位置
        const angle = Math.random() * Math.PI * 2;
        const dist = BASE_CONFIG.spawnDistMin +
            Math.random() * (BASE_CONFIG.spawnDistMax - BASE_CONFIG.spawnDistMin);
        this.mesh.position.set(
            playerGroup.position.x + Math.cos(angle) * dist,
            this.size / 2,
            playerGroup.position.z + Math.sin(angle) * dist
        );
        this.mesh.castShadow = true;
        scene.add(this.mesh);
        // ===== 新增：血量条 =====
    const barWidth = this.size * 0.6;
    const barHeight = this.size * 0.08;
    this.healthBar = createHealthBarSprite(barWidth, barHeight);
    this.healthBar.sprite.position.set(
        0, 
        this.size / 2 + BASE_CONFIG.healthBarOffsetY * this.size * 0.5, 
        0
    );
    this.mesh.add(this.healthBar.sprite);
    
    // 初始化血量条显示
    updateHealthBar(this.healthBar, this.hp, this.maxHp);
    }

    /** 每帧更新：追踪玩家 + 敌人间碰撞推开 */
    update() {
        const px = playerGroup.position.x;
        const pz = playerGroup.position.z;
        const dx = px - this.mesh.position.x;
        const dz = pz - this.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 1) {
            this.mesh.position.x += (dx / dist) * this.speed;
            this.mesh.position.z += (dz / dist) * this.speed;
        }

        // 与其他敌人碰撞推开
        enemies.forEach(other => {
            if (other === this) return;
            const ox = this.mesh.position.x - other.mesh.position.x;
            const oz = this.mesh.position.z - other.mesh.position.z;
            const od = Math.sqrt(ox * ox + oz * oz);
            if (od < BASE_CONFIG.enemyCollisionDist && od > 0.1) {
                this.mesh.position.x += (ox / od) * BASE_CONFIG.enemyCollisionPush;
                this.mesh.position.z += (oz / od) * BASE_CONFIG.enemyCollisionPush;
            }
        });

        this.mesh.lookAt(px, this.mesh.position.y, pz);
        this.healthBar.sprite.material.rotation = 0;
    }

    /** 受到伤害 */
    takeDamage(dmg) {
        this.hp -= dmg;
        // 新增：更新血量条
    updateHealthBar(this.healthBar, this.hp, this.maxHp);
    
    this.mesh.material.emissiveIntensity = 1;
        this.mesh.material.emissiveIntensity = 1;
        setTimeout(() => {
            if (this.mesh) this.mesh.material.emissiveIntensity = 0.25;
        }, 100);
        showDamageText(Math.floor(dmg), this.mesh.position);
        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    /** 死亡处理：掉落经验、粒子效果、更新统计 */
    die() {
        createExpOrb(this.mesh.position.x, this.mesh.position.z, this.expValue);
        createParticles(this.mesh.position, this.mesh.material.color, 10);
        scene.remove(this.mesh);
        enemies.splice(enemies.indexOf(this), 1);

        kills++;
        currentCombo++;
        if (currentCombo > maxCombo) maxCombo = currentCombo;
        clearTimeout(comboTimer);
        comboTimer = setTimeout(() => currentCombo = 0, 3500);
        updateHUD();
    }

    /** 强制销毁（游戏重置时） */
    destroy() {
        scene.remove(this.mesh);
    }
}

// ==================== 子弹类 ====================
class Bullet {
    constructor() {
        this.mesh = bulletPool.acquire();
        this.active = false;
        this.dx = 0;
        this.dz = 0;
        this.speed = 0;
        this.damage = 0;
        this.life = 0;
        this.hitEnemies = [];
    }

    /** 发射子弹 */
    spawn(x, y, z, dx, dz, dmg) {
        this.mesh.position.set(x, y, z);
        this.mesh.rotation.y = Math.atan2(dx, dz);
        this.mesh.visible = true;
        this.dx = dx;
        this.dz = dz;
        this.speed = BASE_CONFIG.bulletSpeed;
        this.damage = dmg;
        this.life = BASE_CONFIG.bulletLife;
        this.hitEnemies = [];
        this.active = true;
        scene.add(this.mesh);
    }

    /** 每帧更新：移动 + 碰撞检测 */
    update() {
        if (!this.active) return false;

        this.mesh.position.x += this.dx * this.speed;
        this.mesh.position.z += this.dz * this.speed;
        this.life--;

        if (this.life <= 0) {
            this.recycle();
            return false;
        }

        // 检测与敌人碰撞
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (this.hitEnemies.includes(e)) continue;

            const ex = this.mesh.position.x - e.mesh.position.x;
            const ez = this.mesh.position.z - e.mesh.position.z;
            if (Math.sqrt(ex * ex + ez * ez) < e.size * 0.7) {
                e.takeDamage(this.damage);
                this.hitEnemies.push(e);
                createParticles(this.mesh.position, 0xffdd00, 3);

                if (!runtime.pierceShot || this.hitEnemies.length > 1) {
                    this.recycle();
                    return false;
                }
            }
        }
        return true;
    }

    /** 回收子弹到对象池 */
    recycle() {
        this.active = false;
        scene.remove(this.mesh);
        bulletPool.release(this.mesh);
    }
}

// ==================== 经验球类 ====================
class ExpOrb {
    constructor(x, z, val) {
        this.value = val;
        const s = 0.25 + val * 0.008;
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(s, s, s),
            new THREE.MeshStandardMaterial({
                color: 0xffd700,
                emissive: 0xffd700,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.9
            })
        );
        this.mesh.position.set(x, s / 2, z);
        this.baseY = s / 2;
        this.offset = Math.random() * Math.PI * 2;
        scene.add(this.mesh);
    }

    /** 每帧更新：浮动动画 + 吸附检测 */
    update(t) {
        this.mesh.position.y = this.baseY + Math.sin(t * 3 + this.offset) * 0.25;
        this.mesh.rotation.y += 0.04;
        this.mesh.rotation.x += 0.025;

        const dx = playerGroup.position.x - this.mesh.position.x;
        const dz = playerGroup.position.z - this.mesh.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);

        // 直接拾取范围
        if (d < BASE_CONFIG.expRadius) {
            collectExp(this.value);
            scene.remove(this.mesh);
            return false;
        }

        // 磁力吸附范围
        if (d < runtime.expMagnetRadius) {
            const sp = 0.1 + (runtime.expMagnetRadius - d) * 0.025;
            this.mesh.position.x += (dx / d) * sp;
            this.mesh.position.z += (dz / d) * sp;
        }
        return true;
    }

    destroy() {
        scene.remove(this.mesh);
    }
}

// ==================== 粒子类 ====================
class Particle {
    constructor() {
        this.mesh = particlePool.acquire();
        this.active = false;
        this.life = 0;
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
    }

    spawn(pos, color, vx, vy, vz) {
        this.mesh.position.copy(pos);
        this.mesh.material.color.set(color);
        this.mesh.visible = true;
        this.life = 50;
        this.vx = vx;
        this.vy = vy;
        this.vz = vz;
        this.active = true;
        scene.add(this.mesh);
    }

    update() {
        if (!this.active) return false;

        this.mesh.position.x += this.vx;
        this.mesh.position.y += this.vy;
        this.mesh.position.z += this.vz;
        this.vy -= BASE_CONFIG.particleGravity;
        this.mesh.rotation.x += 0.1;
        this.mesh.rotation.y += 0.1;
        this.life--;

        if (this.life <= 0 || this.mesh.position.y < 0) {
            this.recycle();
            return false;
        }
        return true;
    }

    recycle() {
        this.active = false;
        scene.remove(this.mesh);
        particlePool.release(this.mesh);
    }
}

// ==================== 实体工厂函数 ====================

/** 创建经验球 */
function createExpOrb(x, z, v) {
    expOrbs.push(new ExpOrb(x, z, v));
}

/** 创建粒子爆炸效果 */
function createParticles(pos, color, count) {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 0.06 + Math.random() * 0.14;
        const p = new Particle();
        p.spawn(pos, c, Math.cos(a) * s, 0.15 + Math.random() * 0.25, Math.sin(a) * s);
        activeParticles.push(p);
    }
}

/** 显示伤害飘字 */
function showDamageText(dmg, pos) {
    const el = document.createElement('div');
    el.className = 'damage-text';
    el.textContent = dmg;
    document.body.appendChild(el);
    damageTexts.push({
        el,
        pos: pos.clone(),
        life: BASE_CONFIG.damageTextLife,
        vy: BASE_CONFIG.damageTextRiseSpeed
    });
}

/** 清理所有伤害文字 */
function clearDamageTexts() {
    damageTexts.forEach(dt => dt.el.remove());
    damageTexts.length = 0;
}

/** 收集经验 */
function collectExp(v) {
    currentExp += v;
    totalExpCollected += v;
    if (currentExp >= expNeeded) {
        currentExp -= expNeeded;
        expNeeded = Math.floor(expNeeded * 1.5);
        level++;
        showUpgrade();
    }
    updateHUD();
}