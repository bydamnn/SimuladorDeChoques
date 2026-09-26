const $ = id => document.getElementById(id);
const m1i = $('m1'), m2i = $('m2'), v1i = $('v1'), v2i = $('v2'), tipoSel = $('tipo');
const m1v = $('m1v'), m2v = $('m2v'), v1v = $('v1v'), v2v = $('v2v');
const results = $('results'), timeLbl = $('timeLbl');
const btnRun = $('btnRun'), btnReset = $('btnReset'), btnSound = $('btnSound');
const wrapEl = $('sceneWrap');

function syncLabels() {
    m1v.textContent = parseFloat(m1i.value).toFixed(1);
    m2v.textContent = parseFloat(m2i.value).toFixed(1);
    v1v.textContent = parseFloat(v1i.value).toFixed(1) + ' m/s';
    v2v.textContent = parseFloat(v2i.value).toFixed(1) + ' m/s';
    $('m1tag').textContent = parseFloat(m1i.value).toFixed(2) + ' kg';
    $('m2tag').textContent = parseFloat(m2i.value).toFixed(2) + ' kg';
}
[m1i, m2i, v1i, v2i].forEach(el => el.addEventListener('input', () => { syncLabels(); if (!playing) setup(); }));
syncLabels();

let soundOn = true;
btnSound.addEventListener('click', () => { soundOn = !soundOn; btnSound.textContent = '🔊 Sonido: ' + (soundOn ? 'ON' : 'OFF'); });
let actx = null;
function playThud(intensity) {
    if (!soundOn) return;
    try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(120 + intensity * 40, actx.currentTime);
        o.frequency.exponentialRampToValueAtTime(40, actx.currentTime + 0.15);
        g.gain.setValueAtTime(Math.min(0.5, 0.15 + intensity * 0.05), actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.25);
        o.connect(g); g.connect(actx.destination);
        o.start(); o.stop(actx.currentTime + 0.25);
    } catch (e) { }
}

// ---------- THREE.JS SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1c);
scene.fog = new THREE.Fog(0x0a0f1c, 18, 40);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
wrapEl.appendChild(renderer.domElement);

function resize() {
    const w = wrapEl.clientWidth, h = wrapEl.clientHeight;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

const amb = new THREE.AmbientLight(0x8899cc, 0.55); scene.add(amb);
const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(6, 10, 6); dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
dir.shadow.camera.left = -14; dir.shadow.camera.right = 14; dir.shadow.camera.top = 14; dir.shadow.camera.bottom = -14;
scene.add(dir);
const accentLight = new THREE.PointLight(0x4f6df5, 0.6, 20); accentLight.position.set(-6, 4, -4); scene.add(accentLight);

const HALF = 8;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: 0.95, metalness: 0.05 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.005; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(20, 20, 0x2a3a5c, 0x18223a); scene.add(grid);

function radiusM(m) { return 0.16 * Math.cbrt(m) + 0.18; }

// ---------- MODELOS 3D REALES (construidos con geometría, sin archivos externos) ----------
function texBilliard() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const cx = c.getContext('2d');
    cx.fillStyle = '#f7f2e7'; cx.fillRect(0, 0, 256, 256);
    cx.beginPath(); cx.arc(128, 88, 46, 0, Math.PI * 2); cx.fillStyle = '#f2c94c'; cx.fill();
    cx.lineWidth = 4; cx.strokeStyle = '#2b2b2b'; cx.stroke();
    cx.fillStyle = '#1a1a1a'; cx.font = 'bold 42px Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('9', 128, 92);
    return new THREE.CanvasTexture(c);
}
function texSoccer() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const cx = c.getContext('2d');
    cx.fillStyle = '#f2f2f2'; cx.fillRect(0, 0, 256, 256); cx.fillStyle = '#141414';
    function pent(x0, y0, r, rot) {
        cx.beginPath();
        for (let i = 0; i < 5; i++) { const a = rot + i * (Math.PI * 2 / 5) - Math.PI / 2; const x = x0 + r * Math.cos(a), y = y0 + r * Math.sin(a); i === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y); }
        cx.closePath(); cx.fill();
    }
    pent(128, 128, 42, 0); pent(40, 60, 26, 0.6); pent(210, 55, 26, 1.1); pent(30, 200, 26, 2.1); pent(220, 205, 26, 2.8); pent(128, 240, 24, 0.3);
    return new THREE.CanvasTexture(c);
}
function texConcrete() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const cx = c.getContext('2d');
    cx.fillStyle = '#9aa0a6'; cx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 700; i++) { const g = Math.random() > 0.5 ? 20 : 255; cx.fillStyle = `rgba(${g},${g},${g},${(Math.random() * 0.08).toFixed(2)})`; cx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    cx.strokeStyle = 'rgba(0,0,0,.25)'; cx.lineWidth = 3; cx.strokeRect(4, 4, 248, 248);
    return new THREE.CanvasTexture(c);
}
function buildBallGroup(color, texture, metal, rough) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshStandardMaterial({ color, map: texture || null, metalness: metal, roughness: rough }));
    mesh.castShadow = true; const g = new THREE.Group(); g.add(mesh); return g;
}
function buildBloque() {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2, 1.4), new THREE.MeshStandardMaterial({ map: texConcrete(), roughness: 0.9, metalness: 0.05 }));
    mesh.castShadow = true; const g = new THREE.Group(); g.add(mesh); return g;
}
function buildBolos() {
    const g = buildBallGroup(0x111111, null, 0.2, 0.15);
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.6 });
    [[-0.25, 0.55, 0.55], [0.25, 0.55, 0.55], [0, 0.65, 0.35]].forEach(p => {
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10), holeMat);
        h.position.set(p[0], p[1], p[2]); h.rotation.x = Math.PI / 2.3; g.add(h);
    });
    return g;
}
function buildCarro(color) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.35 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.95), bodyMat); body.position.y = -0.35; body.castShadow = true; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.8), new THREE.MeshStandardMaterial({ color: 0x1c3557, metalness: 0.6, roughness: 0.25 }));
    cabin.position.set(-0.05, 0.06, 0); cabin.castShadow = true; g.add(cabin);
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16);
    [[-0.55, -0.65, 0.45], [0.55, -0.65, 0.45], [-0.55, -0.65, -0.45], [0.55, -0.65, -0.45]].forEach(p => {
        const wh = new THREE.Mesh(wheelGeo, wheelMat); wh.rotation.x = Math.PI / 2; wh.position.set(p[0], p[1], p[2]); wh.castShadow = true; g.add(wh);
    });
    return g;
}
function buildBici(color) {
    const g = new THREE.Group();
    const wheelGeo = new THREE.TorusGeometry(0.6, 0.06, 8, 24);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.4, roughness: 0.5 });
    [-0.55, 0.55].forEach(x => { const w = new THREE.Mesh(wheelGeo, wheelMat); w.position.set(x, -0.4, 0); w.castShadow = true; g.add(w); });
    const frameMat = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.4 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 0.07), frameMat); frame.position.set(0, 0.05, 0); frame.castShadow = true; g.add(frame);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), frameMat); seat.position.set(-0.2, 0.32, 0); seat.castShadow = true; g.add(seat);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), frameMat); handle.position.set(0.5, 0.32, 0); handle.castShadow = true; g.add(handle);
    return g;
}
const shapeBuilders = {
    billar: (color) => buildBallGroup(0xffffff, texBilliard(), 0.15, 0.15),
    futbol: (color) => buildBallGroup(0xffffff, texSoccer(), 0.05, 0.55),
    carro: buildCarro, bloque: () => buildBloque(), bolos: () => buildBolos(), bici: buildBici,
    custom: (color) => buildBallGroup(color, null, 0.3, 0.4)
};
function makeModel(type, color) { return (shapeBuilders[type] || shapeBuilders.custom)(color); }
function disposeModel(m) { m.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); }

let model1 = makeModel('bloque', 0x2196f0), model2 = makeModel('bloque', 0xec4899);
scene.add(model1); scene.add(model2);
function setBodyShape(idx, type) {
    const color = idx === 1 ? 0x2196f0 : 0xec4899;
    const old = idx === 1 ? model1 : model2;
    scene.remove(old); disposeModel(old);
    const fresh = makeModel(type, color);
    if (idx === 1) model1 = fresh; else model2 = fresh;
    scene.add(fresh);
}

const arrow1 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x60a5fa, 0.3, 0.18);
const arrow2 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xf472b6, 0.3, 0.18);
scene.add(arrow1, arrow2);

// custom orbit camera
let theta = 0.78, phi = 0.9, radius = 15, target = new THREE.Vector3(0, 0.6, 0);
function applyCam() {
    camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(target);
}
let dragging = false, lastX = 0, lastY = 0;
renderer.domElement.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('pointerup', () => dragging = false);
window.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
    theta -= dx * 0.006; phi = Math.min(Math.PI - 0.15, Math.max(0.15, phi - dy * 0.006));
    setActiveViewBtn(null);
});
wrapEl.addEventListener('wheel', e => {
    e.preventDefault(); radius = Math.min(28, Math.max(6, radius + e.deltaY * 0.01));
}, { passive: false });

const presets = {
    frontal: { theta: 0, phi: Math.PI / 2.05, radius: 14 },
    lateral: { theta: Math.PI / 2, phi: Math.PI / 2.05, radius: 14 },
    superior: { theta: 0.25, phi: 0.3, radius: 16 },
    isometrica: { theta: 0.78, phi: 0.9, radius: 15 }
};
function setActiveViewBtn(name) {
    document.querySelectorAll('.viewbtn').forEach(b => b.classList.toggle('active', b.dataset.p === name));
}
document.querySelectorAll('.viewbtn').forEach(b => {
    b.addEventListener('click', () => {
        const p = presets[b.dataset.p]; theta = p.theta; phi = p.phi; radius = p.radius;
        setActiveViewBtn(b.dataset.p);
    });
});

// ---------- PHYSICS ----------
let playing = false, collided = false, t = 0, squash = 0, particles = [];
let x1m, x2m, r1m, r2m, vel1, vel2, post1, post2, m1, m2, e;

function setup() {
    m1 = parseFloat(m1i.value); m2 = parseFloat(m2i.value);
    vel1 = parseFloat(v1i.value); vel2 = parseFloat(v2i.value);
    e = parseFloat(tipoSel.value);
    r1m = radiusM(m1); r2m = radiusM(m2);
    x1m = -HALF + r1m + 0.3; x2m = HALF - r2m - 0.3;
    post1 = ((m1 - e * m2) * vel1 + (1 + e) * m2 * vel2) / (m1 + m2);
    post2 = ((m2 - e * m1) * vel2 + (1 + e) * m1 * vel1) / (m1 + m2);
    collided = false; t = 0; squash = 0; playing = false;
    particles.forEach(p => scene.remove(p.mesh)); particles = [];
    timeLbl.textContent = 't = 0.00 s';
    computeAndShowStats();
    updateMeshes();
}

function ke(m, v) { return 0.5 * m * v * v; }
function computeAndShowStats() {
    const p_i = m1 * vel1 + m2 * vel2, p_f = m1 * post1 + m2 * post2;
    const ke_i = ke(m1, vel1) + ke(m2, vel2), ke_f = ke(m1, post1) + ke(m2, post2);
    const loss = ke_i - ke_f, lossPct = ke_i !== 0 ? (loss / ke_i * 100) : 0;
    results.innerHTML = `
    <div class="stat"><div class="k">v₁ antes / después</div><div class="v">${vel1.toFixed(2)} → ${post1.toFixed(2)} m/s</div></div>
    <div class="stat"><div class="k">v₂ antes / después</div><div class="v">${vel2.toFixed(2)} → ${post2.toFixed(2)} m/s</div></div>
    <div class="stat good"><div class="k">Momento p (antes / después)</div><div class="v">${p_i.toFixed(2)} / ${p_f.toFixed(2)} kg·m/s</div></div>
    <div class="stat"><div class="k">Energía cinética antes</div><div class="v">${ke_i.toFixed(2)} J</div></div>
    <div class="stat ${loss > 0.001 ? 'warn' : 'good'}"><div class="k">Energía cinética después</div><div class="v">${ke_f.toFixed(2)} J</div></div>
    <div class="stat ${loss > 0.001 ? 'warn' : 'good'}"><div class="k">Energía perdida (choque)</div><div class="v">${loss.toFixed(2)} J (${lossPct.toFixed(1)}%)</div></div>
  `;
}

function spawnSparks(x, n) {
    const geo = new THREE.SphereGeometry(0.04, 6, 6);
    for (let i = 0; i < Math.min(n, 16); i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
        const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, 0.5, 0);
        scene.add(mesh);
        const ang = Math.random() * Math.PI * 2, sp = Math.random() * 2 + 0.8;
        particles.push({ mesh, vx: Math.cos(ang) * sp, vy: Math.random() * 2 + 1, vz: Math.sin(ang) * sp, life: 1 });
    }
}
function updateParticles(dt) {
    particles.forEach(p => {
        p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
        p.vy -= 6 * dt; p.life -= 1.6 * dt;
        p.mesh.material.opacity = Math.max(0, p.life); p.mesh.material.transparent = true;
    });
    particles = particles.filter(p => { if (p.life <= 0) { scene.remove(p.mesh); return false; } return true; });
}

function updateMeshes() {
    model1.position.set(x1m, r1m, 0);
    model2.position.set(x2m, r2m, 0);
    const sqx = 1 + squash * 0.35, sqy = 1 - squash * 0.3;
    model1.scale.set(r1m * sqx, r1m * sqy, r1m * sqx);
    model2.scale.set(r2m * sqx, r2m * sqy, r2m * sqx);
    const cv1 = collided ? post1 : vel1, cv2 = collided ? post2 : vel2;
    arrow1.position.set(x1m, r1m * 2 + 0.25, 0);
    arrow2.position.set(x2m, r2m * 2 + 0.25, 0);
    arrow1.setDirection(new THREE.Vector3(Math.sign(cv1) || 1, 0, 0));
    arrow1.setLength(0.2 + Math.min(2.2, Math.abs(cv1) * 0.22), 0.25, 0.14);
    arrow2.setDirection(new THREE.Vector3(Math.sign(cv2) || 1, 0, 0));
    arrow2.setLength(0.2 + Math.min(2.2, Math.abs(cv2) * 0.22), 0.25, 0.14);
    arrow1.visible = Math.abs(cv1) > 0.05; arrow2.visible = Math.abs(cv2) > 0.05;
}

function physicsStep(dt) {
    t += dt;
    if (!collided) {
        x1m += vel1 * dt; x2m += vel2 * dt;
        if (x1m + r1m >= x2m - r2m) {
            collided = true;
            const overlap = (x1m + r1m) - (x2m - r2m);
            x1m -= overlap / 2; x2m += overlap / 2;
            const relSpeed = Math.abs(vel1 - vel2);
            spawnSparks(x1m + r1m, Math.round(4 + relSpeed * 2));
            squash = Math.min(1, 0.3 + relSpeed * 0.05);
            playThud(relSpeed);
        }
    } else {
        x1m += post1 * dt; x2m += post2 * dt;
        squash *= 0.85;
    }
    timeLbl.textContent = 't = ' + t.toFixed(2) + ' s';
    if (!(x1m > -HALF - 2 && x1m < HALF + 2 && x2m > -HALF - 2 && x2m < HALF + 2 && t < 8)) playing = false;
}

btnRun.addEventListener('click', () => { setup(); playing = true; });
btnReset.addEventListener('click', () => { setup(); });
tipoSel.addEventListener('change', () => { if (!playing) setup(); });

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(0.033, clock.getDelta());
    if (playing) physicsStep(dt);
    updateParticles(dt);
    updateMeshes();
    applyCam();
    renderer.render(scene, camera);
}
resize(); setup(); animate();

function wirePreset(presetId, sliderId) {
    const preset = document.getElementById(presetId), slider = document.getElementById(sliderId);
    preset.addEventListener('change', () => {
        if (preset.value === 'custom') return;
        slider.value = preset.value;
        slider.dispatchEvent(new Event('input'));
    });
    slider.addEventListener('input', () => {
        const match = [...preset.options].some(o => o.value !== 'custom' && parseFloat(o.value) === parseFloat(slider.value));
        preset.value = match ? slider.value : 'custom';
    });
}
wirePreset('m1preset', 'm1');
wirePreset('m2preset', 'm2');

const VALUE_SHAPE = { '0.17': 'billar', '0.45': 'futbol', '1.2': 'carro', '2': 'bloque', '3': 'bloque', '6.8': 'bolos', '15': 'bici' };
function shapeFromValue(v) { return VALUE_SHAPE[v] || 'custom'; }
const m1p = document.getElementById('m1preset'), m2p = document.getElementById('m2preset');
m1p.addEventListener('change', () => setBodyShape(1, shapeFromValue(m1p.value)));
m2p.addEventListener('change', () => setBodyShape(2, shapeFromValue(m2p.value)));
setBodyShape(1, shapeFromValue(m1p.value));
setBodyShape(2, shapeFromValue(m2p.value));