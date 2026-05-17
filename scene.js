/**
 * scene.js — 3D场景初始化
 * 
 * 作用：创建Three.js核心对象（场景、相机、渲染器、灯光、地面），
 *       构建游戏世界的基础3D环境。
 */

const container = document.getElementById('canvas-container');

// ==================== 核心Three.js对象 ====================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f0f23);
scene.fog = new THREE.Fog(0x0f0f23, 15, 45);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// ==================== 灯光系统 ====================
const ambientLight = new THREE.AmbientLight(0x4040a0, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(20, 30, 15);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.bounds = [-50, 50, 50, -50];
scene.add(dirLight);

// ==================== 地面与网格 ====================
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.9
    })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const gridHelper = new THREE.GridHelper(100, 40, 0x333355, 0x222244);
scene.add(gridHelper);

// ==================== 窗口自适应 ====================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});