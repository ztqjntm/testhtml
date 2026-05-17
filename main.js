/**
 * main.js — 游戏主循环
 * 
 * 作用：整合所有模块，驱动游戏每帧更新。
 *       处理玩家移动、相机控制、实体更新、渲染。
 */

const clock = new THREE.Clock();

/** 游戏主循环 */
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = Date.now();
    const tsec = time / 1000;

    if (gameState === GameState.PLAYING) {
        survivalTime += delta;
        updateSpeedBoost(time);

        // ===== 处理移动输入 =====
        let mx = moveInput.x;
        let mz = moveInput.y;

        // 键盘输入
        if (keys['w'] || keys['arrowup']) mz -= 1;
        if (keys['s'] || keys['arrowdown']) mz += 1;
        if (keys['a'] || keys['arrowleft']) mx -= 1;
        if (keys['d'] || keys['arrowright']) mx += 1;

        // 归一化
        const ml = Math.sqrt(mx * mx + mz * mz);
        if (ml > 1) {
            mx /= ml;
            mz /= ml;
        }

        // 计算相机方向向量
        _camForward.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
        _camRight.set(
            Math.sin(cameraYaw + Math.PI / 2),
            0,
            Math.cos(cameraYaw + Math.PI / 2)
        );

        // 应用移动
        const effectiveSpeed = runtime.playerSpeed * currentSpeedMultiplier;
        _moveVec.set(0, 0, 0)
            .addScaledVector(_camRight, mx)
            .addScaledVector(_camForward, -mz);

        if (_moveVec.length() > 0) {
            _moveVec.normalize().multiplyScalar(effectiveSpeed);
            playerGroup.position.x += _moveVec.x;
            playerGroup.position.z += _moveVec.z;
        }

        // 网格跟随玩家
        gridHelper.position.x = Math.floor(playerGroup.position.x / 2.5) * 2.5;
        gridHelper.position.z = Math.floor(playerGroup.position.z / 2.5) * 2.5;

        // 玩家朝向
        playerGroup.rotation.y = cameraYaw;

        // ===== 相机位置计算 =====
        const eyeHeight = 1.6;
        const headBob = (_moveVec.length() > 0.001)
            ? Math.sin(tsec * BASE_CONFIG.headBobSpeed) * BASE_CONFIG.headBobAmount
            : 0;

        camera.position.set(
            playerGroup.position.x + screenShakeX,
            playerGroup.position.y + eyeHeight + screenShakeY + headBob,
            playerGroup.position.z
        );

        camera.rotation.order = 'YXZ';
        camera.rotation.y = cameraYaw;
        camera.rotation.x = cameraPitch;

        // 屏幕震动衰减
        screenShakeX *= BASE_CONFIG.screenShakeDecay;
        screenShakeY *= BASE_CONFIG.screenShakeDecay;

        // ===== 无敌闪烁效果 =====
        const isInvincible = (Date.now() - lastDamageTime) < BASE_CONFIG.damageCooldown;

        if (isInvincible) {
            const flashSpeed = BASE_CONFIG.invincibleFlashSpeed;
            bodyMat.opacity = 0.5 + Math.sin(time * 0.02 * flashSpeed) * 0.3;
            bodyMat.transparent = true;
            bodyMat.emissiveIntensity = 0.6 + Math.sin(time * 0.02 * flashSpeed) * 0.3;
        } else {
            bodyMat.opacity = 0;
            bodyMat.transparent = true;
            bodyMat.emissiveIntensity = 0.3;
        }

        // ===== 更新敌人 =====
        enemies.forEach(e => {
            e.update();

            if (isInvincible) return;

            // 碰撞检测
            const dx = playerGroup.position.x - e.mesh.position.x;
            const dz = playerGroup.position.z - e.mesh.position.z;
            const d = Math.sqrt(dx * dx + dz * dz);

            if (d < BASE_CONFIG.playerHitDist) {
                playerTakeDamage(e.damage * delta * 2.5);
                e.mesh.position.x -= (dx / d) * BASE_CONFIG.playerHitPush;
                e.mesh.position.z -= (dz / d) * BASE_CONFIG.playerHitPush;
            }
        });

        // ===== 更新子弹 =====
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (!bullets[i].update()) {
                bullets.splice(i, 1);
            }
        }

        // ===== 更新经验球 =====
        for (let i = expOrbs.length - 1; i >= 0; i--) {
            if (!expOrbs[i].update(tsec)) {
                expOrbs.splice(i, 1);
            }
        }

        // ===== 更新粒子 =====
        for (let i = activeParticles.length - 1; i >= 0; i--) {
            if (!activeParticles[i].update()) {
                activeParticles.splice(i, 1);
            }
        }

        // ===== 更新伤害飘字 =====
        for (let i = damageTexts.length - 1; i >= 0; i--) {
            const dt = damageTexts[i];
            dt.pos.y += dt.vy;
            dt.life--;

            // 3D位置转屏幕坐标
            const sp = dt.pos.clone().project(camera);
            const x = (sp.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-sp.y * 0.5 + 0.5) * window.innerHeight;

            dt.el.style.left = x + 'px';
            dt.el.style.top = y + 'px';
            dt.el.style.opacity = dt.life / BASE_CONFIG.damageTextLife;

            if (dt.life <= 0) {
                dt.el.remove();
                damageTexts.splice(i, 1);
            }
        }

        // ===== 游戏逻辑更新 =====
        updateWave(time);
        updateAutoFire(time);
        updateManualFire(time);

        // ===== 小地图更新（降频） =====
        minimapFrameCounter++;
        if (minimapFrameCounter >= BASE_CONFIG.minimapUpdateInterval) {
            minimapFrameCounter = 0;
            drawMinimap();
        }
    }

    // 渲染场景
    renderer.render(scene, camera);
}

// 启动游戏循环
animate();