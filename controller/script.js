const $ = id => document.getElementById(id);
const tipoSel = $('tipo'), speedSel = $('speed');
const results = $('results'), derivation = $('derivation'), timeLbl = $('timeLbl'), statusEl = $('status');
const btnRun = $('btnRun'), btnReset = $('btnReset'), btnSound = $('btnSound');
const wrapEl = $('sceneWrap');

// ---------- LÍMITES DEL SIMULADOR ----------
const MASS_MIN = 0.1, MASS_MAX = 10000, V_MAX = 20;
const S = { m1: 2, m2: 3, v1: 4, v2: -2 };   // estado de entrada (fuente única de verdad)

// ---------- UTILIDADES DE FORMATO ----------
function fmt(x, d = 2, sign = false) {
    const a = Math.abs(x).toFixed(d), zero = parseFloat(a) === 0;
    let [i, f] = a.split('.');
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
    return (x < 0 && !zero ? '−' : (sign && !zero ? '+' : '')) + i + (f ? '.' + f : '');
}
const fmtM = m => fmt(m, m >= 1000 ? 0 : 2);
const q = x => x < 0 ? '(' + fmt(x) + ')' : fmt(x);

// ---------- CONTROLES ----------
const sToM = s => parseFloat((MASS_MIN * Math.pow(10, 5 * s / 1000)).toPrecision(3));   // slider logarítmico 0..1000 -> 0.1..10 000 kg
const mToS = m => 1000 * Math.log10(m / MASS_MIN) / 5;

function limitMsg(id, msg) { const el = $(id); el.textContent = msg; el.classList.toggle('show', !!msg); }

function setMass(i, val, fromSlider) {
    let m = parseFloat(val); if (!isFinite(m)) m = S['m' + i];
    const typed = m, over = m > MASS_MAX, under = m < MASS_MIN;
    m = Math.min(MASS_MAX, Math.max(MASS_MIN, parseFloat(m.toFixed(3))));
    S['m' + i] = m;
    if (!fromSlider) $('m' + i).value = mToS(m);
    $('m' + i + 'n').value = m;
    $('m' + i + 'tag').textContent = fmtM(m) + ' kg';
    const preset = $('m' + i + 'preset');
    const match = [...preset.options].find(o => o.value !== 'custom' && Math.abs(parseFloat(o.value) - m) < 1e-9);
    preset.value = match ? match.value : 'custom';
    let msg = '';
    if (over) msg = `⚠ Límite de masa: ingresaste ${fmtM(typed)} kg, pero el máximo es 10 000 kg. Un cuerpo con más masa sería tan grande que, junto al otro, ya no cabría en la mesa de 16 m y la simulación dejaría de estar a escala. El valor se ajustó automáticamente a 10 000 kg.`;
    else if (under) msg = `⚠ Límite de masa: el mínimo es 0.1 kg. Con masas menores el cuerpo sería casi invisible y su momento y energía tenderían a cero. El valor se ajustó a 0.1 kg.`;
    else if (m >= MASS_MAX) msg = `ℹ Estás en el máximo (10 000 kg). Si intentas poner más, el valor se ajustará a 10 000 kg porque el cuerpo ya ocupa gran parte de la mesa de 16 m. Con una masa tan grande, el cuerpo casi no cambia su velocidad al chocar con uno liviano.`;
    limitMsg('lm' + i, msg);
}

function setVel(i, val) {
    let v = parseFloat(val); if (!isFinite(v)) v = S['v' + i];
    const typed = v, over = Math.abs(v) > V_MAX;
    v = Math.min(V_MAX, Math.max(-V_MAX, parseFloat(v.toFixed(2))));
    S['v' + i] = v;
    const sl = $('v' + i); sl.value = v; $('v' + i + 'n').value = v;
    const pct = (v + V_MAX) / (2 * V_MAX) * 100;
    sl.style.setProperty('--a', Math.min(50, pct) + '%'); sl.style.setProperty('--b', Math.max(50, pct) + '%');
    sl.style.setProperty('--c', v < 0 ? '#f59e0b' : '#17b8a6');
    $('v' + i + 'v').textContent = fmt(v, 1, true) + ' m/s';
    $('d' + i).textContent = v > 0 ? 'hacia la derecha →' : v < 0 ? '← hacia la izquierda' : 'en reposo';
    let msg = '';
    if (over) msg = `⚠ Límite de velocidad: ingresaste ${fmt(typed, 1)} m/s, pero el máximo es ±20 m/s. A mayor velocidad el cuerpo cruzaría la mesa de 16 m en menos de un segundo y no se alcanzaría a ver el choque. El valor se ajustó a ${fmt(v, 0, true)} m/s.`;
    else if (Math.abs(v) >= V_MAX) msg = `ℹ Estás en el límite de velocidad (±20 m/s). Si intentas aumentar más, el valor se ajustará automáticamente.`;
    limitMsg('lv' + i, msg);
}

[1, 2].forEach(i => {
    $('m' + i).addEventListener('input', e => { setMass(i, sToM(parseFloat(e.target.value)), true); setup(); });
    $('m' + i + 'n').addEventListener('change', e => { setMass(i, e.target.value, false); setup(); });
    $('v' + i).addEventListener('input', e => { setVel(i, e.target.value); setup(); });
    $('v' + i + 'n').addEventListener('change', e => { setVel(i, e.target.value); setup(); });
});

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

// radio visual (m): crece con la raíz cúbica de la masa para que 10 000 kg aún quepa en la mesa
function radiusM(m) { return 0.12 * Math.cbrt(m) + 0.2; }

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
let shape1 = 'bloque', shape2 = 'bloque';
function setBodyShape(idx, type) {
    if (idx === 1) shape1 = type; else shape2 = type;
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
    e.preventDefault(); radius = Math.min(34, Math.max(6, radius + e.deltaY * 0.01));
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

// ---------- FÍSICA ----------
// Estados: idle (listo) · running · paused · ended
const HWF = { billar: 1, futbol: 1, bolos: 1, custom: 1, bloque: 0.9, carro: 0.85, bici: 1.16 };   // semiancho en x / radio visual
const DT = 1 / 240, EPS = 1e-6;
let state = 'idle', collided = false, approach = false, t = 0, tc = null, acc = 0, squash = 0, particles = [], endReason = '';
let x1m, x2m, r1m, r2m, hw1, hw2, vel1, vel2, cur1, cur2, post1, post2, m1, m2, e, gap0;

function setup() {
    m1 = S.m1; m2 = S.m2; vel1 = S.v1; vel2 = S.v2; e = parseFloat(tipoSel.value);
    r1m = radiusM(m1); r2m = radiusM(m2); hw1 = r1m * HWF[shape1]; hw2 = r2m * HWF[shape2];
    x1m = -HALF + 0.3 + hw1; x2m = HALF - 0.3 - hw2;
    gap0 = (x2m - hw2) - (x1m + hw1);
    approach = vel1 > vel2 + EPS;
    if (approach) {
        post1 = ((m1 - e * m2) * vel1 + (1 + e) * m2 * vel2) / (m1 + m2);
        post2 = ((m2 - e * m1) * vel2 + (1 + e) * m1 * vel1) / (m1 + m2);
        if (Math.abs(post1) < 1e-9) post1 = 0; if (Math.abs(post2) < 1e-9) post2 = 0;
    } else { post1 = vel1; post2 = vel2; }
    cur1 = vel1; cur2 = vel2; collided = false; t = 0; tc = null; acc = 0; squash = 0; state = 'idle'; endReason = '';
    particles.forEach(p => scene.remove(p.mesh)); particles = [];
    btnRun.textContent = '▶ Simular choque'; btnRun.classList.remove('paused');
    refreshStatus(); computeAndShowStats(); updateMeshes();
}

function refreshStatus() {
    let s;
    if (state === 'idle') {
        if (!approach && Math.abs(vel1) < EPS && Math.abs(vel2) < EPS) s = 'Ambos cuerpos en reposo: no hay movimiento.';
        else if (!approach) s = 'Los cuerpos no se acercan (v₁ ≤ v₂): no habrá choque.';
        else s = `Listo · el choque ocurrirá en t = ${(gap0 / (vel1 - vel2)).toFixed(2)} s`;
    }
    else if (state === 'running') s = collided ? `Choque en t = ${tc.toFixed(2)} s · los cuerpos se separan…` : 'Simulando…';
    else if (state === 'paused') s = 'Pausado';
    else if (endReason === 'rest') s = `Finalizado en t = ${t.toFixed(2)} s: tras el choque ambos cuerpos quedaron en reposo.`;
    else if (endReason === 'static') s = 'Finalizado: ambos cuerpos están en reposo.';
    else s = `Finalizado en t = ${t.toFixed(2)} s: ${collided ? `choque en t = ${tc.toFixed(2)} s y ` : 'no hubo choque; '}los cuerpos salieron de la zona de simulación.`;
    statusEl.textContent = s;
}

function ke(m, v) { return 0.5 * m * v * v; }

function spawnSparks(x, n) {
    const geo = new THREE.SphereGeometry(0.04, 6, 6);
    for (let i = 0; i < Math.min(n, 16); i++) {
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfbbf24 })); mesh.position.set(x, 0.5, 0);
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
    model1.position.set(x1m, r1m, 0); model2.position.set(x2m, r2m, 0);
    const sqx = 1 + squash * 0.35, sqy = 1 - squash * 0.3;
    model1.scale.set(r1m * sqx, r1m * sqy, r1m * sqx); model2.scale.set(r2m * sqx, r2m * sqy, r2m * sqx);
    arrow1.position.set(x1m, r1m * 2 + 0.25, 0); arrow2.position.set(x2m, r2m * 2 + 0.25, 0);
    arrow1.setDirection(new THREE.Vector3(Math.sign(cur1) || 1, 0, 0)); arrow1.setLength(0.2 + Math.min(2.2, Math.abs(cur1) * 0.12), 0.25, 0.14);
    arrow2.setDirection(new THREE.Vector3(Math.sign(cur2) || 1, 0, 0)); arrow2.setLength(0.2 + Math.min(2.2, Math.abs(cur2) * 0.12), 0.25, 0.14);
    arrow1.visible = Math.abs(cur1) > 0.05; arrow2.visible = Math.abs(cur2) > 0.05;
}

// Un cuerpo "terminó" si está en reposo o ya salió de la zona alejándose.
function isGone(x, hw, v) {
    if (Math.abs(v) < EPS) return true;
    return v > 0 ? x - hw > HALF + 2 : x + hw < -HALF - 2;
}
function checkEnd() {
    if (!collided && approach) return;               // aún falta el choque
    if (isGone(x1m, hw1, cur1) && isGone(x2m, hw2, cur2)) {
        state = 'ended';
        endReason = (Math.abs(cur1) < EPS && Math.abs(cur2) < EPS) ? (collided ? 'rest' : 'static') : 'out';
        btnRun.textContent = '▶ Simular de nuevo'; btnRun.classList.remove('paused'); refreshStatus();
    } else if (t > 3600) { state = 'ended'; endReason = 'out'; refreshStatus(); }
}

function doCollision() {
    collided = true; tc = t; cur1 = post1; cur2 = post2;
    const rel = Math.abs(vel1 - vel2);
    spawnSparks(x1m + hw1, Math.round(4 + rel * 2) * (e < 1 ? 1 : 0.5));
    squash = Math.min(1, 0.3 + rel * 0.05); playThud(Math.min(rel, 12));
    refreshStatus();
}

// Avanza exactamente dt segundos de simulación; el instante del choque se resuelve de forma analítica (sin atravesarse).
function advance(dt) {
    let rem = dt;
    if (!collided && cur1 > cur2 + EPS) {
        const gap = (x2m - hw2) - (x1m + hw1), tcr = Math.max(0, gap / (cur1 - cur2));
        if (tcr <= rem) {
            x1m += cur1 * tcr; x2m += cur2 * tcr; t += tcr; rem -= tcr;
            doCollision(); checkEnd(); if (state !== 'running') return;   // p. ej. quedan en reposo: el cronómetro se detiene aquí
        }
    }
    x1m += cur1 * rem; x2m += cur2 * rem; t += rem;
    checkEnd();
}

function physicsStep(frameDt) {
    acc += frameDt * parseFloat(speedSel.value);
    while (acc >= DT && state === 'running') { advance(DT); acc -= DT; }
}

btnRun.addEventListener('click', () => {
    if (state === 'running') { state = 'paused'; btnRun.textContent = '▶ Continuar'; btnRun.classList.add('paused'); refreshStatus(); return; }
    if (state === 'paused') { state = 'running'; btnRun.textContent = '⏸ Pausar'; btnRun.classList.remove('paused'); refreshStatus(); return; }
    if (state === 'ended') setup();
    state = 'running'; btnRun.textContent = '⏸ Pausar'; checkEnd(); if (state === 'running') refreshStatus();
});
btnReset.addEventListener('click', setup);
tipoSel.addEventListener('change', setup);

// ---------- RÓTULOS SOBRE LOS CUERPOS ----------
function mkLbl(c) { const d = document.createElement('div'); d.className = 'body-lbl ' + c; wrapEl.appendChild(d); return d; }
const lbl = { 1: mkLbl('p1'), 2: mkLbl('p2') };
function updateLabels() {
    const on = $('chkLbl').checked, w = wrapEl.clientWidth, h = wrapEl.clientHeight;
    [[1, x1m, r1m, m1, cur1], [2, x2m, r2m, m2, cur2]].forEach(([i, x, r, m, v]) => {
        const el = lbl[i], p = new THREE.Vector3(x, 2 * r + 0.7, 0).project(camera);
        if (!on || p.z > 1) { el.style.display = 'none'; return; }
        el.style.display = 'block';
        el.style.left = Math.min(w - 70, Math.max(70, (p.x * 0.5 + 0.5) * w)) + 'px';
        el.style.top = Math.max(78, (-p.y * 0.5 + 0.5) * h) + 'px';
        el.innerHTML = `<b>Cuerpo ${i}</b> · m = ${fmtM(m)} kg<br>v = ${fmt(v, 2, true)} m/s<br>p = m·v = ${fmt(m * v)} kg·m/s<br>Ec = ½mv² = ${fmt(ke(m, v))} J`;
    });
}

// ---------- RESULTADOS ----------
function computeAndShowStats() {
    const M = m1 + m2, pi = m1 * vel1 + m2 * vel2, pf = m1 * post1 + m2 * post2;
    const Ki = ke(m1, vel1) + ke(m2, vel2), Kf = ke(m1, post1) + ke(m2, post2), dK = Ki - Kf, pct = Ki > 1e-12 ? dK / Ki * 100 : 0;
    const same = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
    const lost = dK > 1e-6;
    results.innerHTML = `
    <div class="stat"><div class="k">v₁ antes → después</div><div class="v">${fmt(vel1, 2, true)} → ${fmt(post1, 2, true)} m/s</div></div>
    <div class="stat"><div class="k">v₂ antes → después</div><div class="v">${fmt(vel2, 2, true)} → ${fmt(post2, 2, true)} m/s</div></div>
    <div class="stat good"><div class="k">Momento p (antes / después)</div><div class="v">${fmt(pi)} / ${fmt(pf)} kg·m/s</div></div>
    <div class="stat"><div class="k">Energía cinética antes</div><div class="v">${fmt(Ki)} J</div></div>
    <div class="stat ${lost ? 'warn' : 'good'}"><div class="k">Energía cinética después</div><div class="v">${fmt(Kf)} J</div></div>
    <div class="stat ${lost ? 'warn' : 'good'}"><div class="k">Energía perdida</div><div class="v">${fmt(dK)} J (${fmt(pct, 1)}%)</div></div>`;

    const tipoTxt = e === 1 ? 'elástico' : e === 0 ? 'perfectamente inelástico' : 'parcialmente inelástico';
    const vrel = vel1 - vel2, mu = m1 * m2 / M, vcm = pi / M;
    let h = `
    <div class="rs"><h4>1. Datos</h4>
      <div class="eq">m₁ = ${fmtM(m1)} kg · v₁ = ${fmt(vel1, 2, true)} m/s · m₂ = ${fmtM(m2)} kg · v₂ = ${fmt(vel2, 2, true)} m/s · e = ${e}</div>
      <p>Convención: + hacia la derecha, − hacia la izquierda. Choque <b>${tipoTxt}</b> en una dimensión, sobre superficie sin fricción (no hay fuerzas externas horizontales).</p></div>

    <div class="rs"><h4>2. Conservación del momento lineal</h4>
      <p>Durante el choque las fuerzas son internas (acción y reacción), por lo que el momento total se conserva: Σp antes = Σp después.</p>
      <div class="eq">p antes = m₁v₁ + m₂v₂ = ${fmtM(m1)}·${q(vel1)} + ${fmtM(m2)}·${q(vel2)} = ${fmt(pi)} kg·m/s</div>
      <div class="eq">p después = m₁v₁' + m₂v₂' = ${fmtM(m1)}·${q(post1)} + ${fmtM(m2)}·${q(post2)} = ${fmt(pf)} kg·m/s &nbsp; <span class="${same(pi, pf) ? 'ok' : 'bad'}">${same(pi, pf) ? '✔ se conserva' : '✘ no coincide'}</span></div></div>`;

    if (approach) {
        const n1 = (m1 - e * m2) * vel1 + (1 + e) * m2 * vel2, n2 = (m2 - e * m1) * vel2 + (1 + e) * m1 * vel1;
        h += `
    <div class="rs"><h4>3. Velocidades después del choque</h4>
      <p>Se usan dos ecuaciones: (a) conservación del momento, m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂', y (b) la definición del coeficiente de restitución, e = (v₂' − v₁') / (v₁ − v₂), es decir v₂' = v₁' + e(v₁ − v₂). Al sustituir (b) en (a) y despejar:</p>
      <div class="eq">v₁' = [(m₁ − e·m₂)·v₁ + (1 + e)·m₂·v₂] / (m₁ + m₂)</div>
      <div class="eq">v₂' = [(m₂ − e·m₁)·v₂ + (1 + e)·m₁·v₁] / (m₁ + m₂)</div>
      <p>Reemplazando los valores:</p>
      <div class="eq">v₁' = [(${fmtM(m1)} − ${e}·${fmtM(m2)})·${q(vel1)} + (1 + ${e})·${fmtM(m2)}·${q(vel2)}] / ${fmtM(M)} = ${fmt(n1)} / ${fmtM(M)}</div>
      <div class="eq res">v₁' = ${fmt(post1, 2, true)} m/s</div>
      <div class="eq">v₂' = [(${fmtM(m2)} − ${e}·${fmtM(m1)})·${q(vel2)} + (1 + ${e})·${fmtM(m1)}·${q(vel1)}] / ${fmtM(M)} = ${fmt(n2)} / ${fmtM(M)}</div>
      <div class="eq res">v₂' = ${fmt(post2, 2, true)} m/s</div>
      <p>Verificación de e: (v₂' − v₁')/(v₁ − v₂) = (${q(post2)} − ${q(post1)}) / (${q(vel1)} − ${q(vel2)}) = ${fmt((post2 - post1) / vrel, 3)} &nbsp; <span class="${same((post2 - post1) / vrel, e) ? 'ok' : 'bad'}">${same((post2 - post1) / vrel, e) ? '✔ coincide con e = ' + e : '✘'}</span></p>
      <p>Instante del choque: la separación inicial entre superficies es d = ${fmt(gap0)} m y se acercan con rapidez relativa v₁ − v₂ = ${fmt(vrel)} m/s.</p>
      <div class="eq">t<sub>c</sub> = d / (v₁ − v₂) = ${fmt(gap0)} / ${fmt(vrel)} = ${fmt(gap0 / vrel)} s</div></div>`;
    } else {
        h += `
    <div class="rs"><h4>3. Velocidades después del choque</h4>
      <p>Para que haya choque el cuerpo 1 debe alcanzar al cuerpo 2, es decir v₁ > v₂. Aquí v₁ = ${fmt(vel1, 2, true)} m/s y v₂ = ${fmt(vel2, 2, true)} m/s, así que <b>no se acercan</b>: no hay choque y las velocidades no cambian (v' = v).</p></div>`;
    }

    const Ki1 = `½·${fmtM(m1)}·${q(vel1)}² + ½·${fmtM(m2)}·${q(vel2)}²`, Kf1 = `½·${fmtM(m1)}·${q(post1)}² + ½·${fmtM(m2)}·${q(post2)}²`;
    h += `
    <div class="rs"><h4>4. Energía cinética</h4>
      <div class="eq">Ec antes = ½m₁v₁² + ½m₂v₂² = ${Ki1} = ${fmt(Ki)} J</div>
      <div class="eq">Ec después = ½m₁v₁'² + ½m₂v₂'² = ${Kf1} = ${fmt(Kf)} J</div>
      <div class="eq res">ΔEc perdida = Ec antes − Ec después = ${fmt(Ki)} − ${fmt(Kf)} = ${fmt(dK)} J (${fmt(pct, 1)} %)</div>`;
    if (approach) {
        const th = 0.5 * mu * (1 - e * e) * vrel * vrel;
        h += `<p>Comprobación con la fórmula teórica de pérdida, con masa reducida μ = m₁m₂/(m₁+m₂) = ${fmt(mu, 3)} kg:</p>
      <div class="eq">ΔEc = ½·μ·(1 − e²)·(v₁ − v₂)² = ½·${fmt(mu, 3)}·(1 − ${e}²)·${fmt(vrel)}² = ${fmt(th)} J &nbsp; <span class="${same(th, dK) ? 'ok' : 'bad'}">${same(th, dK) ? '✔ coincide' : '✘'}</span></div>`;
    }
    h += `</div>`;

    if (approach) {
        const J = m1 * (post1 - vel1);
        h += `
    <div class="rs"><h4>5. Impulso y centro de masa</h4>
      <div class="eq">J sobre el cuerpo 1 = m₁(v₁' − v₁) = ${fmtM(m1)}·(${fmt(post1)} − ${q(vel1)}) = ${fmt(J)} N·s &nbsp;|&nbsp; sobre el cuerpo 2: ${fmt(-J)} N·s</div>
      <div class="eq">v<sub>cm</sub> = (m₁v₁ + m₂v₂)/(m₁ + m₂) = ${fmt(pi)} / ${fmtM(M)} = ${fmt(vcm, 2, true)} m/s (no cambia con el choque)</div></div>`;
    }

    // ----- Conclusiones sencillas -----
    const c = [];
    if (!approach) c.push('No hubo choque porque el cuerpo de atrás no es más rápido que el de adelante. Prueba aumentar v₁ o disminuir v₂.');
    else {
        c.push(`El momento total se conservó (${fmt(pi)} kg·m/s antes y después), como ocurre en <b>todo</b> tipo de choque sin fuerzas externas.`);
        if (e === 1) c.push(lost ? 'Choque elástico, pero la energía varió por error numérico.' : `Choque <b>elástico</b>: la energía cinética también se conservó (${fmt(Ki)} J). Los cuerpos rebotan y se separan con la misma rapidez relativa con la que se acercaron.`);
        else if (e === 0) c.push(`Choque <b>perfectamente inelástico</b>: quedaron unidos y se movieron juntos a v' = ${fmt(post1, 2, true)} m/s, que es la velocidad del centro de masa. Es el caso en que más energía se pierde.`);
        else c.push(`Choque <b>parcialmente inelástico</b> (e = ${e}): los cuerpos rebotan pero se separan más lento de lo que se acercaron.`);
        if (lost) c.push(`Se perdieron ${fmt(dK)} J (${fmt(pct, 1)} % de la energía cinética). Esa energía se transformó en calor, sonido y deformación (las chispas de la simulación).`);
        const dir = (v0, v1) => Math.abs(v1) < EPS ? 'quedó en reposo' : (v0 * v1 < 0 ? 'invirtió su sentido' : (Math.abs(v1) > Math.abs(v0) ? 'aceleró' : 'frenó'));
        c.push(`Cuerpo 1 (${fmtM(m1)} kg): ${dir(vel1, post1)} (${fmt(vel1, 2, true)} → ${fmt(post1, 2, true)} m/s). Cuerpo 2 (${fmtM(m2)} kg): ${dir(vel2, post2)} (${fmt(vel2, 2, true)} → ${fmt(post2, 2, true)} m/s).`);
        if (Math.abs(m1 - m2) > 1e-9) {
            const lig = m1 < m2 ? 1 : 2, dv1 = Math.abs(post1 - vel1), dv2 = Math.abs(post2 - vel2);
            c.push(`El cuerpo más liviano (cuerpo ${lig}) cambió más su velocidad (|Δv₁| = ${fmt(dv1)} m/s frente a |Δv₂| = ${fmt(dv2)} m/s), porque ambos reciben el mismo impulso y Δv = J/m: a menor masa, mayor cambio de velocidad.${Math.max(m1, m2) / Math.min(m1, m2) >= 20 ? ' Como una masa es al menos 20 veces mayor, esa casi no se inmuta.' : ''}`);
        } else c.push('Las masas son iguales, así que los dos cuerpos experimentan el mismo cambio de velocidad (en magnitud).' + (e === 1 ? ' Con e = 1 y masas iguales, intercambian sus velocidades.' : ''));
        c.push(`Ejemplo de uso: cambia e a 1 y observa que Ec se conserva; vuelve a e = 0 y mira cuánta energía se pierde.`);
    }
    h += `<div class="rs concl"><h4>Conclusiones</h4><ul>${c.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
    derivation.innerHTML = h;
}

// ---------- BUCLE PRINCIPAL ----------
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());
    if (state === 'running') physicsStep(dt);
    if (state !== 'paused') { updateParticles(dt); squash *= 0.85; }
    timeLbl.textContent = 't = ' + t.toFixed(2) + ' s';
    updateMeshes(); applyCam(); camera.updateMatrixWorld(); updateLabels();
    renderer.render(scene, camera);
}

// ---------- PRESETS (forma 3D + masa) ----------
const VALUE_SHAPE = { '0.17': 'billar', '0.45': 'futbol', '1.2': 'carro', '2': 'bloque', '3': 'bloque', '6.8': 'bolos', '15': 'bici' };
[1, 2].forEach(i => {
    const p = $('m' + i + 'preset');
    p.addEventListener('change', () => {
        if (p.value === 'custom') { $('m' + i + 'n').focus(); return; }
        setBodyShape(i, VALUE_SHAPE[p.value] || 'custom'); setMass(i, p.value, false); setup();
    });
});
$('chkLbl').addEventListener('change', updateLabels);

setBodyShape(1, 'bloque'); setBodyShape(2, 'bloque');
setMass(1, S.m1, false); setMass(2, S.m2, false); setVel(1, S.v1); setVel(2, S.v2);
resize(); setup(); animate();