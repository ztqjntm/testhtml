/**
 * ui.js — 小地图与界面事件
 * 
 * 作用：绘制雷达小地图，绑定开始/重启按钮事件。
 *       小地图实时显示玩家、敌人、经验球的位置。
 */

const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');

/** 绘制小地图 */
function drawMinimap() {
    const ctx = minimapCtx;
    const size = BASE_CONFIG.minimapSize;
    const cx = size / 2;
    const cy = size / 2;
    const scale = size / (BASE_CONFIG.minimapRange * 2);
    const px = playerGroup.position.x;
    const pz = playerGroup.position.z;

    ctx.clearRect(0, 0, size, size);

    // 背景
    ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.fill();

    // 网格线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridStep = 5 * scale;
    const offsetX = -(px % 5) * scale;
    const offsetY = -(pz % 5) * scale;

    for (let i = -cx; i < cx; i += gridStep) {
        ctx.beginPath();
        ctx.moveTo(cx + i + offsetX, 0);
        ctx.lineTo(cx + i + offsetX, size);
        ctx.stroke();
    }
    for (let i = -cy; i < cy; i += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, cy + i + offsetY);
        ctx.lineTo(size, cy + i + offsetY);
        ctx.stroke();
    }

    // 经验球
    expOrbs.forEach(orb => {
        const dx = (orb.mesh.position.x - px) * scale;
        const dz = (orb.mesh.position.z - pz) * scale;
        if (Math.abs(dx) < cx - 4 && Math.abs(dz) < cy - 4) {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(cx + dx, cy + dz, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(cx + dx, cy + dz, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // 敌人
    enemies.forEach(e => {
        const dx = (e.mesh.position.x - px) * scale;
        const dz = (e.mesh.position.z - pz) * scale;
        if (Math.abs(dx) < cx - 4 && Math.abs(dz) < cy - 4) {
            const color = e.type === 'boss' ? '#ff0044' :
                (e.type === 'elite' ? '#ff8800' : '#ff4444');
            const radius = e.type === 'boss' ? 8 :
                (e.type === 'elite' ? 5 : 3.5);

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(cx + dx, cy + dz, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    });

    // 玩家（带方向箭头）
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(cameraYaw);

    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // 方向箭头
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(-5, 2);
    ctx.lineTo(5, 2);
    ctx.closePath();
    ctx.fill();

    // 外圈
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // 边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 1, 0, Math.PI * 2);
    ctx.stroke();
}

// ==================== 按钮事件绑定 ====================

/** 开始游戏 */
document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('startScreen').style.display = 'none';
    gameState = GameState.PLAYING;
    startWave();
    updateHUD();
    // 开始游戏时锁定指针
    requestPointerLock();
});

/** 重新开始 */
document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('gameOver').style.display = 'none';
    resetGame();
    document.getElementById('startScreen').style.display = 'flex';
});