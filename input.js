/**
 * input.js — 输入处理系统
 * 
 * 作用：集中处理所有用户输入，包括键盘、触摸、摇杆。
 *       将原始输入转换为标准化的移动和视角控制信号。
 */

// ============= 输入状态 ==============
const moveInput = { x: 0, y: 0, active: false };
const keys = {};

let moveTouchId = null;
let lookTouchId = null;
let lastLookTouchX = 0;
let lastLookTouchY = 0;

// ============= DOM引用 ==============
const moveJoystickEl = document.getElementById('joystick-move');
const moveKnob = document.getElementById('moveKnob');
const fireBtn = document.getElementById('fireBtn');
const autoFireToggle = document.getElementById('autoFireToggle');

// ============= 自动开火开关 ===============
let autoFireEnabled = true;
let manualFirePressed = false;

autoFireToggle.addEventListener('click', () => {
    autoFireEnabled = !autoFireEnabled;
    if (autoFireEnabled) {
        autoFireToggle.classList.remove('off');
        fireBtn.classList.add('hidden');
    } else {
        autoFireToggle.classList.add('off');
        fireBtn.classList.remove('hidden');
    }
});

// ==================== 手动开火按钮 ====================
function setupFireButton() {
    const startHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        manualFirePressed = true;
    };
    const endHandler = (e) => {
        e.preventDefault();
        manualFirePressed = false;
    };

    fireBtn.addEventListener('touchstart', startHandler, { passive: false });
    fireBtn.addEventListener('touchend', endHandler, { passive: false });
    fireBtn.addEventListener('touchcancel', endHandler, { passive: false });
    fireBtn.addEventListener('mousedown', startHandler);
    fireBtn.addEventListener('mouseup', endHandler);
    fireBtn.addEventListener('mouseleave', () => { manualFirePressed = false; });
}
setupFireButton();

// ==================== 移动摇杆 ====================
moveJoystickEl.addEventListener('touchstart', (e) => {
    if (gameState !== GameState.PLAYING) return;
    e.preventDefault();
    e.stopPropagation();

    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (moveTouchId === null) {
            moveTouchId = t.identifier;
            const c = getJoystickCenter(moveJoystickEl);
            const max = 40;
            let dx = t.clientX - c.x;
            let dy = t.clientY - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > max) {
                dx = (dx / dist) * max;
                dy = (dy / dist) * max;
            }
            const deadzoned = applyJoystickDeadzone(dx / max, dy / max);
            moveInput.x = deadzoned.x;
            moveInput.y = deadzoned.y;
            moveInput.active = true;
            updateKnob(moveKnob, dx, dy);
        }
    }
}, { passive: false });

moveJoystickEl.addEventListener('touchmove', (e) => {
    if (gameState !== GameState.PLAYING) return;
    e.preventDefault();
    e.stopPropagation();

    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === moveTouchId) {
            const c = getJoystickCenter(moveJoystickEl);
            const max = 40;
            let dx = t.clientX - c.x;
            let dy = t.clientY - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > max) {
                dx = (dx / dist) * max;
                dy = (dy / dist) * max;
            }
            const deadzoned = applyJoystickDeadzone(dx / max, dy / max);
            moveInput.x = deadzoned.x;
            moveInput.y = deadzoned.y;
            moveInput.active = true;
            updateKnob(moveKnob, dx, dy);
        }
    }
}, { passive: false });

function endMoveTouch(t) {
    if (t.identifier === moveTouchId) {
        moveTouchId = null;
        moveInput.x = 0;
        moveInput.y = 0;
        moveInput.active = false;
        resetKnob(moveKnob);
    }
}

moveJoystickEl.addEventListener('touchend', (e) => {
    for (let t of e.changedTouches) endMoveTouch(t);
}, { passive: false });

moveJoystickEl.addEventListener('touchcancel', (e) => {
    for (let t of e.changedTouches) endMoveTouch(t);
}, { passive: false });

// ==================== 视角控制（右侧触摸） ====================
document.addEventListener('touchstart', (e) => {
    if (gameState !== GameState.PLAYING) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const fbRect = fireBtn.getBoundingClientRect();
        const onFireBtn = t.clientX >= fbRect.left - 20 &&
            t.clientX <= fbRect.right + 20 &&
            t.clientY >= fbRect.top - 20 &&
            t.clientY <= fbRect.bottom + 20;

        if (t.clientX > window.innerWidth * 0.3 &&
            lookTouchId === null &&
            t.identifier !== moveTouchId &&
            !onFireBtn) {

            const mRect = moveJoystickEl.getBoundingClientRect();
            const pad = 60;
            const onMoveStick = t.clientX >= mRect.left - pad &&
                t.clientX <= mRect.right + pad &&
                t.clientY >= mRect.top - pad &&
                t.clientY <= mRect.bottom + pad;

            if (!onMoveStick) {
                lookTouchId = t.identifier;
                lastLookTouchX = t.clientX;
                lastLookTouchY = t.clientY;
            }
        }
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (gameState !== GameState.PLAYING) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === lookTouchId) {
            const dx = t.clientX - lastLookTouchX;
            const dy = t.clientY - lastLookTouchY;
            cameraYaw -= dx * BASE_CONFIG.touchLookSensitivity * 0.01;
            cameraPitch -= dy * BASE_CONFIG.touchLookSensitivity * 0.01;
            cameraPitch = clamp(cameraPitch, -Math.PI / 2.3, Math.PI / 2.3);
            lastLookTouchX = t.clientX;
            lastLookTouchY = t.clientY;
        }
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    for (let t of e.changedTouches) {
        if (t.identifier === lookTouchId) lookTouchId = null;
    }
}, { passive: false });

document.addEventListener('touchcancel', (e) => {
    for (let t of e.changedTouches) {
        if (t.identifier === lookTouchId) lookTouchId = null;
    }
}, { passive: false });

// ==================== 键盘输入 ====================
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// ==================== 鼠标视角控制（PC端） ====================
document.addEventListener('mousemove', (e) => {
    if (gameState !== GameState.PLAYING) return;
    cameraYaw -= e.movementX * BASE_CONFIG.lookSensitivity;
    cameraPitch -= e.movementY * BASE_CONFIG.lookSensitivity;
    cameraPitch = clamp(cameraPitch, -Math.PI / 2.3, Math.PI / 2.3);
});
// ==================== 指针锁定（隐藏鼠标） ====================

/** 请求指针锁定 */
function requestPointerLock() {
    const canvas = renderer.domElement;
    canvas.requestPointerLock = canvas.requestPointerLock ||
                                canvas.mozRequestPointerLock ||
                                canvas.webkitRequestPointerLock;
    if (canvas.requestPointerLock) {
        canvas.requestPointerLock();
    }
}

/** 退出指针锁定 */
function exitPointerLock() {
    document.exitPointerLock = document.exitPointerLock ||
                               document.mozExitPointerLock ||
                               document.webkitExitPointerLock;
    if (document.exitPointerLock) {
        document.exitPointerLock();
    }
}

/** 指针锁定状态变化监听 */
document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === renderer.domElement ||
                   document.mozPointerLockElement === renderer.domElement ||
                   document.webkitPointerLockElement === renderer.domElement;
    
    if (!locked && gameState === GameState.PLAYING) {
        // 如果游戏进行中但指针锁丢失（如按ESC），暂停或处理
        // 这里不做处理，让玩家可以继续操作
    }
});

// 点击画布时请求指针锁定
renderer.domElement.addEventListener('click', () => {
    if (gameState === GameState.PLAYING) {
        requestPointerLock();
    }
});