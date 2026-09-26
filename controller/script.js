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
const mat1 = new THREE.MeshStandardMaterial({ color: 0x2196f0, metalness: 0.35, roughness: 0.35, emissive: 0x0a2a4a, emissiveIntensity: 0.25 });
const mat2 = new THREE.MeshStandardMaterial({ color: 0xec4899, metalness: 0.35, roughness: 0.35, emissive: 0x4a0a2a, emissiveIntensity: 0.25 });
let sphere1 = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mat1); sphere1.castShadow = true; scene.add(sphere1);
let sphere2 = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mat2); sphere2.castShadow = true; scene.add(sphere2);

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
    sphere1.scale.set(r1m, r1m, r1m); sphere2.scale.set(r2m, r2m, r2m);
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
    sphere1.position.set(x1m, r1m, 0);
    sphere2.position.set(x2m, r2m, 0);
    const sqx = 1 + squash * 0.35, sqy = 1 - squash * 0.3;
    sphere1.scale.set(r1m * sqx, r1m * sqy, r1m * sqx);
    sphere2.scale.set(r2m * sqx, r2m * sqy, r2m * sqx);
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