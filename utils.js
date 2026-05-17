/**
 * utils.js — 工具函数集合
 * 
 * 作用：提供摇杆计算、向量数学、角度计算等通用工具函数。
 *       避免在多个模块中重复实现相同逻辑。
 */

/**
 * 获取摇杆中心坐标
 * @param {HTMLElement} el - 摇杆DOM元素
 * @returns {{x: number, y: number}} 中心点坐标
 */
function getJoystickCenter(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * 更新摇杆旋钮位置
 * @param {HTMLElement} knob - 旋钮元素
 * @param {number} dx - X偏移
 * @param {number} dy - Y偏移
 */
function updateKnob(knob, dx, dy) {
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

/**
 * 重置摇杆旋钮到中心
 * @param {HTMLElement} knob - 旋钮元素
 */
function resetKnob(knob) {
    knob.style.transform = `translate(-50%, -50%)`;
}

/**
 * 应用摇杆死区处理
 * @param {number} x - 原始X值 (-1 ~ 1)
 * @param {number} y - 原始Y值 (-1 ~ 1)
 * @returns {{x: number, y: number}} 死区处理后的值
 */
function applyJoystickDeadzone(x, y) {
    const dist = Math.sqrt(x * x + y * y);
    if (dist < BASE_CONFIG.joystickDeadzone) {
        return { x: 0, y: 0 };
    }
    const scale = (dist - BASE_CONFIG.joystickDeadzone) / (1 - BASE_CONFIG.joystickDeadzone);
    return { x: (x / dist) * scale, y: (y / dist) * scale };
}

/**
 * 计算两点间距离（2D平面，忽略Y轴）
 * @param {number} x1 
 * @param {number} z1 
 * @param {number} x2 
 * @param {number} z2 
 * @returns {number} 距离
 */
function distance2D(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dz * dz);
}

/**
 * 限制数值在范围内
 * @param {number} val 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

/**
 * 角度标准化到 0 ~ 2π
 * @param {number} angle 
 * @returns {number}
 */
function normalizeAngle(angle) {
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;
    return angle;
}
// ============= 血量条工具函数 ==============

/**
 * 创建血条纹理（CanvasTexture）
 * @returns {{texture: THREE.CanvasTexture, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}}
 */
function createHealthBarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    // 背景
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 128, 16);
    
    // 默认填充（红色）
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(2, 2, 124, 12);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return { texture, canvas, ctx };
}

/**
 * 创建血条 Sprite
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @returns {{sprite: THREE.Sprite, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, texture: THREE.CanvasTexture}}
 */
function createHealthBarSprite(width, height) {
    const { texture, canvas, ctx } = createHealthBarTexture();
    const material = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true,
        depthTest: false,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(width, height, 1);
    sprite.renderOrder = 999;
    return { sprite, canvas, ctx, texture };
}

/**
 * 更新血条显示
 * @param {{sprite: THREE.Sprite, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, texture: THREE.CanvasTexture}} healthBar - 血条对象
 * @param {number} currentHp - 当前血量
 * @param {number} maxHp - 最大血量
 */
function updateHealthBar(healthBar, currentHp, maxHp) {
    const ratio = Math.max(0, currentHp / maxHp);
    const ctx = healthBar.ctx;
    const canvas = healthBar.canvas;
    
    // 清空
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 根据血量比例变色
    let color;
    if (ratio > 0.6) color = '#00ff88';      // 绿色（高血量）
    else if (ratio > 0.3) color = '#ffaa00';   // 黄色（中血量）
    else color = '#ff3333';                      // 红色（低血量）
    
    // 填充条
    ctx.fillStyle = color;
    ctx.fillRect(2, 2, (canvas.width - 4) * ratio, canvas.height - 4);
    
    // 边框
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // 标记纹理需要更新
    healthBar.texture.needsUpdate = true;
}