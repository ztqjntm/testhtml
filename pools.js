/**
 * pools.js — 对象池系统
 * 
 * 作用：实现对象池模式，避免频繁创建/销毁Three.js对象带来的GC压力。
 *       管理子弹和粒子的分配与回收。
 */

// ==================== 对象池基类 ====================
class ObjectPool {
    /**
     * @param {Function} factory - 创建新对象的工厂函数
     * @param {Function} resetFn - 重置对象状态的函数
     * @param {number} initialSize - 初始池大小
     */
    constructor(factory, resetFn, initialSize = 10) {
        this.pool = [];
        this.factory = factory;
        this.resetFn = resetFn;
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(factory());
        }
    }

    /** 获取一个可用对象 */
    acquire() {
        return this.pool.length > 0 ? this.pool.pop() : this.factory();
    }

    /** 回收对象到池中 */
    release(obj) {
        this.resetFn(obj);
        this.pool.push(obj);
    }

    /** 清空池 */
    clear() {
        this.pool = [];
    }
}

// ==================== 子弹对象池 ====================
const bulletGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.5);
const bulletMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdd00,
    emissive: 0xffaa00,
    emissiveIntensity: 1
});

const bulletPool = new ObjectPool(
    () => new THREE.Mesh(bulletGeometry, bulletMaterial.clone()),
    (mesh) => {
        mesh.position.set(0, -100, 0);
        mesh.visible = false;
        mesh.rotation.set(0, 0, 0);
    },
    50
);

// =============== 粒子对象池 ==============
const particleGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);

const particlePool = new ObjectPool(
    () => new THREE.Mesh(
        particleGeometry,
        new THREE.MeshStandardMaterial({ color: 0xffffff })
    ),
    (mesh) => {
        mesh.position.set(0, -100, 0);
        mesh.visible = false;
        mesh.material.color.setHex(0xffffff);
    },
    100
);