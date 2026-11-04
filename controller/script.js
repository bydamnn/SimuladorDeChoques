// ELEMENTOS DEL DOM
function $(id) {
    return document.getElementById(id);
}

const tipoSel = $('tipo');
const speedSel = $('speed');
const results = $('results');
const derivation = $('derivation');
const timeLbl = $('timeLbl');
const statusEl = $('status');
const btnRun = $('btnRun');
const btnReset = $('btnReset');
const btnSound = $('btnSound');
const wrapEl = $('sceneWrap');

// TODA LA CONFIGURACIÓN Y ESTADO DEL SIMULADOR
const MASS_MIN = 0.1;
const MASS_MAX = 10000;
const V_MAX = 20;
const HALF = 8; // Mitad del ancho de la mesa

// Objeto lobal!!!!!!! el todo de la simulación, contiene todos los parámetros y estados del simulador
const S = {
    // Parámetros de entrada
    m1: 2,
    m2: 3,
    v1: 4,
    v2: -2,
    e: 1,
    shape1: 'bloque',
    shape2: 'bloque',
    soundOn: true,

    // Estado físico dinámico
    cur1: 4,
    cur2: -2,
    post1: 0,
    post2: 0,
    x1m: 0,
    x2m: 0,
    r1m: 0,
    r2m: 0,
    hw1: 0,
    hw2: 0,
    gap0: 0,
    approach: false,

    // Estado de ejecución
    state: 'idle',
    collided: false,
    t: 0,
    tc: null,
    acc: 0,
    squash: 0,
    endReason: ''
};

// Factores de semi-ancho según el tipo de objeto
const HWF = {
    billar: 1,
    futbol: 1,
    bolos: 1,
    custom: 1,
    bloque: 0.9,
    carro: 0.85,
    bici: 1.16
};

// masa de los objetos según el tipo de objeto 
const VALUE_SHAPE = {
    '0.17': 'billar',
    '0.45': 'futbol',
    '1.2': 'carro',
    '2': 'bloque',
    '3': 'bloque',
    '6.8': 'bolos',
    '15': 'bici'
};

// FUNCIONES Y FORMATO
function fmt(x, d = 2, sign = false) {
    const absVal = Math.abs(x).toFixed(d);
    const isZero = parseFloat(absVal) === 0;

    let partes = absVal.split('.');
    let entero = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009'); // Separador de miles
    let decimal = partes[1];

    let prefijo = '';
    if (x < 0 && !isZero) {
        prefijo = '−';
    } else if (sign && !isZero) {
        prefijo = '+';
    }

    if (decimal) {
        return prefijo + entero + '.' + decimal;
    } else {
        return prefijo + entero;
    }
}

function fmtM(m) {
    if (m >= 1000) {
        return fmt(m, 0);
    } else {
        return fmt(m, 2);
    }
}

function q(x) {
    if (x < 0) {
        return '(' + fmt(x) + ')';
    } else {
        return fmt(x);
    }
}

function ke(m, v) {
    return 0.5 * m * v * v;
}

function sToM(s) {
    let masaCalculada = MASS_MIN * Math.pow(10, 5 * s / 1000);
    return parseFloat(masaCalculada.toPrecision(3));
}

function mToS(m) {
    return 1000 * Math.log10(m / MASS_MIN) / 5;
}

function limitMsg(id, msg) {
    const el = $(id);
    el.textContent = msg;
    if (msg !== '') {
        el.classList.add('show');
    } else {
        el.classList.remove('show');
    }
}

// MANEJO DE ENTRADAS DE USUARIO A LOS PARAMETROS
function setMass(i, val, fromSlider) {
    let m = parseFloat(val);
    if (!isFinite(m)) {
        m = S['m' + i];
    }

    const typed = m;
    const over = m > MASS_MAX;
    const under = m < MASS_MIN;

    m = Math.min(MASS_MAX, Math.max(MASS_MIN, parseFloat(m.toFixed(3))));
    S['m' + i] = m;

    if (!fromSlider) {
        $('m' + i).value = mToS(m);
    }

    $('m' + i + 'n').value = m;
    $('m' + i + 'tag').textContent = fmtM(m) + ' kg';

    const preset = $('m' + i + 'preset');
    let foundMatch = false;

    for (let option of preset.options) {
        if (option.value !== 'custom') {
            if (Math.abs(parseFloat(option.value) - m) < 1e-9) {
                preset.value = option.value;
                foundMatch = true;
                break;
            }
        }
    }
    if (!foundMatch) {
        preset.value = 'custom';
    }

    let msg = '';
    if (over) {
        msg = `⚠ Límite de masa: ingresaste ${fmtM(typed)} kg, pero el máximo es 10 000 kg. El valor se ajustó a 10 000 kg.`;
    } else if (under) {
        msg = `⚠ Límite de masa: el mínimo es 0.1 kg. El valor se ajustó a 0.1 kg.`;
    } else if (m >= MASS_MAX) {
        msg = `ℹ Estás en el máximo (10 000 kg).`;
    }

    limitMsg('lm' + i, msg);
}

function setVel(i, val) {
    let v = parseFloat(val);
    if (!isFinite(v)) {
        v = S['v' + i];
    }

    const typed = v;
    const over = Math.abs(v) > V_MAX;

    v = Math.min(V_MAX, Math.max(-V_MAX, parseFloat(v.toFixed(2))));
    S['v' + i] = v;

    const sl = $('v' + i);
    sl.value = v;
    $('v' + i + 'n').value = v;

    const pct = ((v + V_MAX) / (2 * V_MAX)) * 100;
    sl.style.setProperty('--a', Math.min(50, pct) + '%');
    sl.style.setProperty('--b', Math.max(50, pct) + '%');

    if (v < 0) {
        sl.style.setProperty('--c', '#f59e0b');
        $('d' + i).textContent = '← hacia la izquierda';
    } else if (v > 0) {
        sl.style.setProperty('--c', '#17b8a6');
        $('d' + i).textContent = 'hacia la derecha →';
    } else {
        sl.style.setProperty('--c', '#17b8a6');
        $('d' + i).textContent = 'en reposo';
    }

    $('v' + i + 'v').textContent = fmt(v, 1, true) + ' m/s';

    let msg = '';
    if (over) {
        msg = `⚠ Límite de velocidad: ingresaste ${fmt(typed, 1)} m/s, pero el máximo es ±20 m/s. El valor se ajustó a ${fmt(v, 0, true)} m/s.`;
    } else if (Math.abs(v) >= V_MAX) {
        msg = `Estás en el límite de velocidad (±20 m/s).`;
    }

    limitMsg('lv' + i, msg);
}

// Eventos de controles de masa y velocidad
[1, 2].forEach(function (i) {
    $('m' + i).addEventListener('input', function (e) {
        setMass(i, sToM(parseFloat(e.target.value)), true);
        setup();
    });
    $('m' + i + 'n').addEventListener('change', function (e) {
        setMass(i, e.target.value, false);
        setup();
    });
    $('v' + i).addEventListener('input', function (e) {
        setVel(i, e.target.value);
        setup();
    });
    $('v' + i + 'n').addEventListener('change', function (e) {
        setVel(i, e.target.value);
        setup();
    });
});

// audio y sonido ddel choque
let actx = null;

btnSound.addEventListener('click', function () {
    S.soundOn = !S.soundOn;
    if (S.soundOn) {
        btnSound.textContent = 'Sonido: ON';
    } else {
        btnSound.textContent = 'Sonido: OFF';
    }
});

function playThud(intensity) {
    if (!S.soundOn) return;
    try {
        if (!actx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            actx = new AudioContextClass();
        }

        // validacion q evita el bloqueo de audio por parte del navegador
        if (actx.state === 'suspended') {
            actx.resume();
        }

        const osc = actx.createOscillator();
        const gain = actx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(120 + intensity * 40, actx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, actx.currentTime + 0.15);

        const gainInitial = Math.min(0.5, 0.15 + intensity * 0.05);
        gain.gain.setValueAtTime(gainInitial, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(actx.destination);

        osc.start();
        osc.stop(actx.currentTime + 0.25);
    } catch (e) {
        //ignorar fallos de audio no soportado
    }
}

// ESCENA 3D (THREE.JS)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc2ddec);
scene.fog = new THREE.Fog(0xc2ddec, 18, 40);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
wrapEl.appendChild(renderer.domElement);

function resize() {
    const w = wrapEl.clientWidth;
    const h = wrapEl.clientHeight;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// Luces
const amb = new THREE.AmbientLight(0x8899cc, 0.55);
scene.add(amb);

const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(6, 10, 6);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
dir.shadow.camera.left = -14;
dir.shadow.camera.right = 14;
dir.shadow.camera.top = 14;
dir.shadow.camera.bottom = -14;
scene.add(dir);

const accentLight = new THREE.PointLight(0x4f6df5, 0.6, 20);
accentLight.position.set(-6, 4, -4);
scene.add(accentLight);

// Suelo y cuadricula
const groundGeo = new THREE.PlaneGeometry(30, 20);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x41444f, roughness: 0.95, metalness: 0.05 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.005;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(20, 20, 0x9aa3b5, 0x9aa3b5);
scene.add(grid);

function radiusM(m) {
    return 0.12 * Math.cbrt(m) + 0.2;
}

// CONSTRUCCIÓN DE MODELOS 3D DE OBJETOS
function texBilliard() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const cx = c.getContext('2d');
    cx.fillStyle = '#f7f2e7'; cx.fillRect(0, 0, 256, 256);
    cx.beginPath(); cx.arc(128, 88, 46, 0, Math.PI * 2); cx.fillStyle = '#f2c94c'; cx.fill();
    cx.lineWidth = 4; cx.strokeStyle = '#2b2b2b'; cx.stroke();
    cx.fillStyle = '#1a1a1a'; cx.font = 'bold 42px Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('9', 128, 92);
    return new THREE.CanvasTexture(c);
}

function texSoccer() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const cx = c.getContext('2d');
    cx.fillStyle = '#f2f2f2'; cx.fillRect(0, 0, 256, 256);
    cx.fillStyle = '#141414';

    function pent(x0, y0, r, rot) {
        cx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = rot + i * (Math.PI * 2 / 5) - Math.PI / 2;
            const x = x0 + r * Math.cos(a);
            const y = y0 + r * Math.sin(a);
            if (i === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
        }
        cx.closePath(); cx.fill();
    }
    pent(128, 128, 42, 0); pent(40, 60, 26, 0.6); pent(210, 55, 26, 1.1);
    pent(30, 200, 26, 2.1); pent(220, 205, 26, 2.8); pent(128, 240, 24, 0.3);
    return new THREE.CanvasTexture(c);
}

function texConcrete() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const cx = c.getContext('2d');
    cx.fillStyle = '#9aa0a6'; cx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 700; i++) {
        const g = Math.random() > 0.5 ? 20 : 255;
        cx.fillStyle = `rgba(${g},${g},${g},${(Math.random() * 0.08).toFixed(2)})`;
        cx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    cx.strokeStyle = 'rgba(0,0,0,.25)'; cx.lineWidth = 3; cx.strokeRect(4, 4, 248, 248);
    return new THREE.CanvasTexture(c);
}

function buildBallGroup(color, texture, metal, rough) {
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 24),
        new THREE.MeshStandardMaterial({ color: color, map: texture || null, metalness: metal, roughness: rough })
    );
    mesh.castShadow = true;
    const g = new THREE.Group();
    g.add(mesh);
    return g;
}

function buildBloque() {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 2, 1.4),
        new THREE.MeshStandardMaterial({ map: texConcrete(), roughness: 0.9, metalness: 0.05 })
    );
    mesh.castShadow = true;
    const g = new THREE.Group();
    g.add(mesh);
    return g;
}

function buildBolos() {
    const g = buildBallGroup(0x111111, null, 0.2, 0.15);
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.6 });
    const pos = [[-0.25, 0.55, 0.55], [0.25, 0.55, 0.55], [0, 0.65, 0.35]];
    pos.forEach(function (p) {
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10), holeMat);
        h.position.set(p[0], p[1], p[2]);
        h.rotation.x = Math.PI / 2.3;
        g.add(h);
    });
    return g;
}

function buildCarro(color) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.5, roughness: 0.35 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.7 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.95), bodyMat);
    body.position.y = -0.35; body.castShadow = true; g.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.8), new THREE.MeshStandardMaterial({ color: 0x1c3557, metalness: 0.6, roughness: 0.25 }));
    cabin.position.set(-0.05, 0.06, 0); cabin.castShadow = true; g.add(cabin);

    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16);
    const wheels = [[-0.55, -0.65, 0.45], [0.55, -0.65, 0.45], [-0.55, -0.65, -0.45], [0.55, -0.65, -0.45]];
    wheels.forEach(function (p) {
        const wh = new THREE.Mesh(wheelGeo, wheelMat);
        wh.rotation.x = Math.PI / 2;
        wh.position.set(p[0], p[1], p[2]);
        wh.castShadow = true;
        g.add(wh);
    });
    return g;
}

function buildBici(color) {
    const g = new THREE.Group();
    const wheelGeo = new THREE.TorusGeometry(0.6, 0.06, 8, 24);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.4, roughness: 0.5 });

    [-0.55, 0.55].forEach(function (x) {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.position.set(x, -0.4, 0);
        w.castShadow = true;
        g.add(w);
    });

    const frameMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.5, roughness: 0.4 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 0.07), frameMat);
    frame.position.set(0, 0.05, 0); frame.castShadow = true; g.add(frame);

    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), frameMat);
    seat.position.set(-0.2, 0.32, 0); seat.castShadow = true; g.add(seat);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), frameMat);
    handle.position.set(0.5, 0.32, 0); handle.castShadow = true; g.add(handle);
    return g;
}

function makeModel(type, color) {
    if (type === 'billar') return buildBallGroup(0xffffff, texBilliard(), 0.15, 0.15);
    if (type === 'futbol') return buildBallGroup(0xffffff, texSoccer(), 0.05, 0.55);
    if (type === 'carro') return buildCarro(color);
    if (type === 'bloque') return buildBloque();
    if (type === 'bolos') return buildBolos();
    if (type === 'bici') return buildBici(color);
    return buildBallGroup(color, null, 0.3, 0.4); // Custom por defecto
}

function disposeModel(m) {
    m.traverse(function (o) {
        if (o.geometry) {
            o.geometry.dispose();
        }
        if (o.material) {
            if (o.material.map) {
                o.material.map.dispose();
            }
            o.material.dispose();
        }
    });
}

// Creación de modelos iniciales
let model1 = makeModel('bloque', 0x2196f0);
let model2 = makeModel('bloque', 0xec4899);
scene.add(model1);
scene.add(model2);

function setBodyShape(idx, type) {
    let color = 0x2196f0;
    let oldModel = model1;

    if (idx === 1) {
        S.shape1 = type;
    } else {
        S.shape2 = type;
        color = 0xec4899;
        oldModel = model2;
    }

    scene.remove(oldModel);
    disposeModel(oldModel);

    const freshModel = makeModel(type, color);
    if (idx === 1) {
        model1 = freshModel;
    } else {
        model2 = freshModel;
    }
    scene.add(freshModel);
}

// flechas indicadoras de velocidad
const arrow1 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x60a5fa, 0.3, 0.18);
const arrow2 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xf472b6, 0.3, 0.18);
scene.add(arrow1);
scene.add(arrow2);

// camara de perspectiva y control de la misma
let theta = 0.78;
let phi = 0.9;
let radius = 15;
const target = new THREE.Vector3(0, 0.6, 0);

function applyCam() {
    camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    camera.position.y = target.y + radius * Math.cos(phi);
    camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
    camera.lookAt(target);
}

let dragging = false;
let lastX = 0;
let lastY = 0;

renderer.domElement.addEventListener('pointerdown', function (e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

window.addEventListener('pointerup', function () {
    dragging = false;
});

window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    theta -= dx * 0.006;
    phi = Math.min(Math.PI - 0.15, Math.max(0.15, phi - dy * 0.006));
    setActiveViewBtn(null);
});

wrapEl.addEventListener('wheel', function (e) {
    e.preventDefault();
    radius = Math.min(34, Math.max(6, radius + e.deltaY * 0.01));
}, { passive: false });

const presets = {
    frontal: { theta: 0, phi: Math.PI / 2.05, radius: 14 },
    lateral: { theta: Math.PI / 2, phi: Math.PI / 2.05, radius: 14 },
    superior: { theta: 0.25, phi: 0.3, radius: 16 },
    isometrica: { theta: 0.78, phi: 0.9, radius: 15 }
};

function setActiveViewBtn(name) {
    const buttons = document.querySelectorAll('.viewbtn');
    buttons.forEach(function (b) {
        if (b.dataset.p === name) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
}

document.querySelectorAll('.viewbtn').forEach(function (b) {
    b.addEventListener('click', function () {
        const p = presets[b.dataset.p];
        theta = p.theta;
        phi = p.phi;
        radius = p.radius;
        setActiveViewBtn(b.dataset.p);
    });
});

// SIMULACION Y APLICACION DE FOMRMULAS
const DT = 1 / 240;
const EPS = 1e-6;
let particles = [];

function setup() {
    S.e = parseFloat(tipoSel.value);
    S.r1m = radiusM(S.m1);
    S.r2m = radiusM(S.m2);

    S.hw1 = S.r1m * HWF[S.shape1];
    S.hw2 = S.r2m * HWF[S.shape2];

    S.x1m = -HALF + 0.3 + S.hw1;
    S.x2m = HALF - 0.3 - S.hw2;

    S.gap0 = (S.x2m - S.hw2) - (S.x1m + S.hw1);
    S.approach = S.v1 > S.v2 + EPS;

    if (S.approach) {
        S.post1 = ((S.m1 - S.e * S.m2) * S.v1 + (1 + S.e) * S.m2 * S.v2) / (S.m1 + S.m2);
        S.post2 = ((S.m2 - S.e * S.m1) * S.v2 + (1 + S.e) * S.m1 * S.v1) / (S.m1 + S.m2);

        if (Math.abs(S.post1) < 1e-9) S.post1 = 0;
        if (Math.abs(S.post2) < 1e-9) S.post2 = 0;
    } else {
        S.post1 = S.v1;
        S.post2 = S.v2;
    }

    S.cur1 = S.v1;
    S.cur2 = S.v2;
    S.collided = false;
    S.t = 0;
    S.tc = null;
    S.acc = 0;
    S.squash = 0;
    S.state = 'idle';
    S.endReason = '';

    particles.forEach(function (p) {
        scene.remove(p.mesh);
    });
    particles = [];

    btnRun.textContent = '▶ Simular choque';
    btnRun.classList.remove('paused');

    refreshStatus();
    computeAndShowStats();
    updateMeshes();
}

function refreshStatus() {
    let s = '';
    if (S.state === 'idle') {
        if (!S.approach && Math.abs(S.v1) < EPS && Math.abs(S.v2) < EPS) {
            s = 'Ambos cuerpos en reposo: no hay movimiento.';
        } else if (!S.approach) {
            s = 'Los cuerpos no se acercan (v₁ ≤ v₂): no habrá choque.';
        } else {
            const tiempoChoque = S.gap0 / (S.v1 - S.v2);
            s = `Listo · el choque ocurrirá en t = ${tiempoChoque.toFixed(2)} s`;
        }
    } else if (S.state === 'running') {
        if (S.collided) {
            s = `Choque en t = ${S.tc.toFixed(2)} s · los cuerpos se separan…`;
        } else {
            s = 'Simulando…';
        }
    } else if (S.state === 'paused') {
        s = 'Pausado';
    } else if (S.endReason === 'rest' || S.endReason === 'static') {
        s = `Finalizado en t = ${S.t.toFixed(2)} s: los cuerpos están en reposo.`;
    } else {
        let det = 'no hubo choque; ';
        if (S.collided) {
            det = `choque en t = ${S.tc.toFixed(2)} s y `;
        }
        s = `Finalizado en t = ${S.t.toFixed(2)} s: ${det}los cuerpos salieron de la zona de simulación.`;
    }
    statusEl.textContent = s;
}

function spawnSparks(x, n) {
    const geo = new THREE.SphereGeometry(0.04, 6, 6);
    const totalSparks = Math.min(n, 16);

    for (let i = 0; i < totalSparks; i++) {
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
        mesh.position.set(x, 0.5, 0);
        scene.add(mesh);

        const ang = Math.random() * Math.PI * 2;
        const sp = Math.random() * 2 + 0.8;

        particles.push({
            mesh: mesh,
            vx: Math.cos(ang) * sp,
            vy: Math.random() * 2 + 1,
            vz: Math.sin(ang) * sp,
            life: 1
        });
    }
}

function updateParticles(dt) {
    particles.forEach(function (p) {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 6 * dt;
        p.life -= 1.6 * dt;
        p.mesh.material.opacity = Math.max(0, p.life);
        p.mesh.material.transparent = true;
    });

    particles = particles.filter(function (p) {
        if (p.life <= 0) {
            scene.remove(p.mesh);
            return false;
        }
        return true;
    });
}

function updateMeshes() {
    model1.position.set(S.x1m, S.r1m, 0);
    model2.position.set(S.x2m, S.r2m, 0);

    const sqx = 1 + S.squash * 0.35;
    const sqy = 1 - S.squash * 0.3;

    model1.scale.set(S.r1m * sqx, S.r1m * sqy, S.r1m * sqx);
    model2.scale.set(S.r2m * sqx, S.r2m * sqy, S.r2m * sqx);

    arrow1.position.set(S.x1m, S.r1m * 2 + 0.25, 0);
    arrow2.position.set(S.x2m, S.r2m * 2 + 0.25, 0);

    let dir1 = 1;
    if (Math.sign(S.cur1) < 0) dir1 = -1;
    arrow1.setDirection(new THREE.Vector3(dir1, 0, 0));
    arrow1.setLength(0.2 + Math.min(2.2, Math.abs(S.cur1) * 0.12), 0.25, 0.14);

    let dir2 = 1;
    if (Math.sign(S.cur2) < 0) dir2 = -1;
    arrow2.setDirection(new THREE.Vector3(dir2, 0, 0));
    arrow2.setLength(0.2 + Math.min(2.2, Math.abs(S.cur2) * 0.12), 0.25, 0.14);

    arrow1.visible = Math.abs(S.cur1) > 0.05;
    arrow2.visible = Math.abs(S.cur2) > 0.05;
}

function isGone(x, hw, v) {
    if (Math.abs(v) < EPS) return true;
    if (v > 0) {
        return x - hw > HALF + 2;
    } else {
        return x + hw < -HALF - 2;
    }
}

function checkEnd() {
    if (!S.collided && S.approach) return;

    if (isGone(S.x1m, S.hw1, S.cur1) && isGone(S.x2m, S.hw2, S.cur2)) {
        S.state = 'ended';
        if (Math.abs(S.cur1) < EPS && Math.abs(S.cur2) < EPS) {
            if (S.collided) {
                S.endReason = 'rest';
            } else {
                S.endReason = 'static';
            }
        } else {
            S.endReason = 'out';
        }
        btnRun.textContent = '▶ Simular de nuevo';
        btnRun.classList.remove('paused');
        refreshStatus();
    } else if (S.t > 3600) {
        S.state = 'ended';
        S.endReason = 'out';
        refreshStatus();
    }
}

function doCollision() {
    S.collided = true;
    S.tc = S.t;
    S.cur1 = S.post1;
    S.cur2 = S.post2;

    const rel = Math.abs(S.v1 - S.v2);
    let sparkFactor = 1;
    if (S.e >= 1) sparkFactor = 0.5;

    spawnSparks(S.x1m + S.hw1, Math.round(4 + rel * 2) * sparkFactor);
    S.squash = Math.min(1, 0.3 + rel * 0.05);
    playThud(Math.min(rel, 12));
    refreshStatus();
}

function advance(dt) {
    let rem = dt;
    if (!S.collided && S.cur1 > S.cur2 + EPS) {
        const gap = (S.x2m - S.hw2) - (S.x1m + S.hw1);
        const tcr = Math.max(0, gap / (S.cur1 - S.cur2));

        if (tcr <= rem) {
            S.x1m += S.cur1 * tcr;
            S.x2m += S.cur2 * tcr;
            S.t += tcr;
            rem -= tcr;
            doCollision();
            checkEnd();
            if (S.state !== 'running') return;
        }
    }

    S.x1m += S.cur1 * rem;
    S.x2m += S.cur2 * rem;
    S.t += rem;
    checkEnd();
}

function physicsStep(frameDt) {
    S.acc += frameDt * parseFloat(speedSel.value);
    while (S.acc >= DT && S.state === 'running') {
        advance(DT);
        S.acc -= DT;
    }
}

btnRun.addEventListener('click', function () {
    if (S.state === 'running') {
        S.state = 'paused';
        btnRun.textContent = '▶ Continuar';
        btnRun.classList.add('paused');
        refreshStatus();
        return;
    }
    if (S.state === 'paused') {
        S.state = 'running';
        btnRun.textContent = '⏸ Pausar';
        btnRun.classList.remove('paused');
        refreshStatus();
        return;
    }
    if (S.state === 'ended') {
        setup();
    }
    S.state = 'running';
    btnRun.textContent = '⏸ Pausar';
    checkEnd();
    if (S.state === 'running') {
        refreshStatus();
    }
});

btnReset.addEventListener('click', setup);
tipoSel.addEventListener('change', setup);

// CARTELES CON INFORMACION ENCIMA DEL OBJ 
function mkLbl(c) {
    const d = document.createElement('div');
    d.className = 'body-lbl ' + c;
    wrapEl.appendChild(d);
    return d;
}

const lbl = { 1: mkLbl('p1'), 2: mkLbl('p2') };

function updateLabels() {
    const on = $('chkLbl').checked;
    const w = wrapEl.clientWidth;
    const h = wrapEl.clientHeight;

    const data = [
        [1, S.x1m, S.r1m, S.m1, S.cur1],
        [2, S.x2m, S.r2m, S.m2, S.cur2]
    ];

    data.forEach(function (item) {
        const i = item[0];
        const x = item[1];
        const r = item[2];
        const m = item[3];
        const v = item[4];

        const el = lbl[i];
        const p = new THREE.Vector3(x, 2 * r + 0.7, 0).project(camera);

        if (!on || p.z > 1) {
            el.style.display = 'none';
            return;
        }

        el.style.display = 'block';
        el.style.left = Math.min(w - 70, Math.max(70, (p.x * 0.5 + 0.5) * w)) + 'px';
        el.style.top = Math.max(78, (-p.y * 0.5 + 0.5) * h) + 'px';
        el.innerHTML = `<b>Cuerpo ${i}</b> · m = ${fmtM(m)} kg<br>v = ${fmt(v, 2, true)} m/s<br>p = m·v = ${fmt(m * v)} kg·m/s<br>Ec = ½mv² = ${fmt(ke(m, v))} J`;
    });
}

// DESGLOSE Y PROCEDIMIENTO EN LA PARTE DE RESULTADOS
function computeAndShowStats() {
    const M = S.m1 + S.m2;
    const pi = S.m1 * S.v1 + S.m2 * S.v2;
    const pf = S.m1 * S.post1 + S.m2 * S.post2;

    const Ki = ke(S.m1, S.v1) + ke(S.m2, S.v2);
    const Kf = ke(S.m1, S.post1) + ke(S.m2, S.post2);
    const dK = Ki - Kf;

    let pct = 0;
    if (Ki > 1e-12) {
        pct = (dK / Ki) * 100;
    }

    function same(a, b) {
        return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
    }

    const lost = dK > 1e-6;

    let classKf = 'good';
    let classDk = 'good';
    if (lost) {
        classKf = 'warn';
        classDk = 'warn';
    }

    results.innerHTML = `
    <div class="stat"><div class="k">v₁ antes → después</div><div class="v">${fmt(S.v1, 2, true)} → ${fmt(S.post1, 2, true)} m/s</div></div>
    <div class="stat"><div class="k">v₂ antes → después</div><div class="v">${fmt(S.v2, 2, true)} → ${fmt(S.post2, 2, true)} m/s</div></div>
    <div class="stat good"><div class="k">Momento p (antes / después)</div><div class="v">${fmt(pi)} / ${fmt(pf)} kg·m/s</div></div>
    <div class="stat"><div class="k">Energía cinética antes</div><div class="v">${fmt(Ki)} J</div></div>
    <div class="stat ${classKf}"><div class="k">Energía cinética después</div><div class="v">${fmt(Kf)} J</div></div>
    <div class="stat ${classDk}"><div class="k">Energía perdida</div><div class="v">${fmt(dK)} J (${fmt(pct, 1)}%)</div></div>`;

    let tipoTxt = 'parcialmente inelástico';
    if (S.e === 1) tipoTxt = 'elástico';
    if (S.e === 0) tipoTxt = 'perfectamente inelástico';

    const vrel = S.v1 - S.v2;
    const mu = (S.m1 * S.m2) / M;
    const vcm = pi / M;

    let markMomentum = '<span class="bad">✘ no coincide</span>';
    if (same(pi, pf)) {
        markMomentum = '<span class="ok">✔ se conserva</span>';
    }

    let h = `
    <div class="rs"><h4>1. Datos</h4>
      <div class="eq">m₁ = ${fmtM(S.m1)} kg · v₁ = ${fmt(S.v1, 2, true)} m/s · m₂ = ${fmtM(S.m2)} kg · v₂ = ${fmt(S.v2, 2, true)} m/s · e = ${S.e}</div>
      <p>Convención: + hacia la derecha, − hacia la izquierda. Choque <b>${tipoTxt}</b> en una dimensión, sobre superficie sin fricción.</p></div>

    <div class="rs"><h4>2. Conservación del momento lineal</h4>
      <p>Durante el choque las fuerzas son internas (acción y reacción), por lo que el momento total se conserva: Σp antes = Σp después.</p>
      <div class="eq">p antes = m₁v₁ + m₂v₂ = ${fmtM(S.m1)}·${q(S.v1)} + ${fmtM(S.m2)}·${q(S.v2)} = ${fmt(pi)} kg·m/s</div>
      <div class="eq">p después = m₁v₁' + m₂v₂' = ${fmtM(S.m1)}·${q(S.post1)} + ${fmtM(S.m2)}·${q(S.post2)} = ${fmt(pf)} kg·m/s &nbsp; ${markMomentum}</div></div>`;

    if (S.approach) {
        const n1 = (S.m1 - S.e * S.m2) * S.v1 + (1 + S.e) * S.m2 * S.v2;
        const n2 = (S.m2 - S.e * S.m1) * S.v2 + (1 + S.e) * S.m1 * S.v1;
        const calcE = (S.post2 - S.post1) / vrel;

        let markE = '<span class="bad">✘</span>';
        if (same(calcE, S.e)) {
            markE = `<span class="ok">✔ coincide con e = ${S.e}</span>`;
        }

        h += `
    <div class="rs"><h4>3. Velocidades después del choque</h4>
      <p>Se usan dos ecuaciones: (a) conservación del momento y (b) coeficiente de restitución, e = (v₂' − v₁') / (v₁ − v₂):</p>
      <div class="eq">v₁' = [(m₁ − e·m₂)·v₁ + (1 + e)·m₂·v₂] / (m₁ + m₂)</div>
      <div class="eq">v₂' = [(m₂ − e·m₁)·v₂ + (1 + e)·m₁·v₁] / (m₁ + m₂)</div>
      <p>Reemplazando los valores:</p>
      <div class="eq">v₁' = [(${fmtM(S.m1)} − ${S.e}·${fmtM(S.m2)})·${q(S.v1)} + (1 + ${S.e})·${fmtM(S.m2)}·${q(S.v2)}] / ${fmtM(M)} = ${fmt(n1)} / ${fmtM(M)}</div>
      <div class="eq res">v₁' = ${fmt(S.post1, 2, true)} m/s</div>
      <div class="eq">v₂' = [(${fmtM(S.m2)} − ${S.e}·${fmtM(S.m1)})·${q(S.v2)} + (1 + ${S.e})·${fmtM(S.m1)}·${q(S.v1)}] / ${fmtM(M)} = ${fmt(n2)} / ${fmtM(M)}</div>
      <div class="eq res">v₂' = ${fmt(S.post2, 2, true)} m/s</div>
      <p>Verificación de e: (${q(S.post2)} − ${q(S.post1)}) / (${q(S.v1)} − ${q(S.v2)}) = ${fmt(calcE, 3)} &nbsp; ${markE}</p>
      <div class="eq">t<sub>c</sub> = d / (v₁ − v₂) = ${fmt(S.gap0)} / ${fmt(vrel)} = ${fmt(S.gap0 / vrel)} s</div></div>`;
    } else {
        h += `
    <div class="rs"><h4>3. Velocidades después del choque</h4>
      <p>Aquí v₁ = ${fmt(S.v1, 2, true)} m/s y v₂ = ${fmt(S.v2, 2, true)} m/s, así que <b>no se acercan</b>: no hay choque y las velocidades no cambian (v' = v).</p></div>`;
    }

    const Ki1 = `½·${fmtM(S.m1)}·${q(S.v1)}² + ½·${fmtM(S.m2)}·${q(S.v2)}²`;
    const Kf1 = `½·${fmtM(S.m1)}·${q(S.post1)}² + ½·${fmtM(S.m2)}·${q(S.post2)}²`;

    h += `
    <div class="rs"><h4>4. Energía cinética</h4>
      <div class="eq">Ec antes = ½m₁v₁² + ½m₂v₂² = ${Ki1} = ${fmt(Ki)} J</div>
      <div class="eq">Ec después = ½m₁v₁'² + ½m₂v₂'² = ${Kf1} = ${fmt(Kf)} J</div>
      <div class="eq res">ΔEc perdida = Ec antes − Ec después = ${fmt(Ki)} − ${fmt(Kf)} = ${fmt(dK)} J (${fmt(pct, 1)} %)</div>`;

    if (S.approach) {
        const th = 0.5 * mu * (1 - S.e * S.e) * vrel * vrel;
        let markTh = '<span class="bad">✘</span>';
        if (same(th, dK)) {
            markTh = '<span class="ok">✔ coincide</span>';
        }

        h += `<p>Comprobación con la fórmula teórica de pérdida (μ = ${fmt(mu, 3)} kg):</p>
      <div class="eq">ΔEc = ½·μ·(1 − e²)·(v₁ − v₂)² = ½·${fmt(mu, 3)}·(1 − ${S.e}²)·${fmt(vrel)}² = ${fmt(th)} J &nbsp; ${markTh}</div>`;
    }
    h += `</div>`;

    if (S.approach) {
        const J = S.m1 * (S.post1 - S.v1);
        h += `
    <div class="rs"><h4>5. Impulso y centro de masa</h4>
      <div class="eq">J sobre el cuerpo 1 = m₁(v₁' − v₁) = ${fmtM(S.m1)}·(${fmt(S.post1)} − ${q(S.v1)}) = ${fmt(J)} N·s &nbsp;|&nbsp; sobre el cuerpo 2: ${fmt(-J)} N·s</div>
      <div class="eq">v<sub>cm</sub> = (m₁v₁ + m₂v₂)/(m₁ + m₂) = ${fmt(pi)} / ${fmtM(M)} = ${fmt(vcm, 2, true)} m/s</div></div>`;
    }

    // CONCLUSIONES
    const c = [];
    if (!S.approach) {
        c.push('No hubo choque porque el cuerpo de atrás no es más rápido que el de adelante.');
    } else {
        c.push(`El momento total se conservó (${fmt(pi)} kg·m/s antes y después), como ocurre en <b>todo</b> tipo de choque.`);

        if (S.e === 1) {
            c.push(`Choque <b>elástico</b>: la energía cinética se conservó (${fmt(Ki)} J).`);
        } else if (S.e === 0) {
            c.push(`Choque <b>perfectamente inelástico</b>: quedaron unidos y se movieron juntos a v' = ${fmt(S.post1, 2, true)} m/s.`);
        } else {
            c.push(`Choque <b>parcialmente inelástico</b> (e = ${S.e}): los cuerpos rebotan pero pierden energía.`);
        }

        if (lost) {
            c.push(`Se perdieron ${fmt(dK)} J (${fmt(pct, 1)} % de la energía cinética).`);
        }

        function getDirText(v0, v1) {
            if (Math.abs(v1) < EPS) return 'quedó en reposo';
            if (v0 * v1 < 0) return 'invirtió su sentido';
            if (Math.abs(v1) > Math.abs(v0)) return 'aceleró';
            return 'frenó';
        }

        c.push(`Cuerpo 1 (${fmtM(S.m1)} kg): ${getDirText(S.v1, S.post1)} (${fmt(S.v1, 2, true)} → ${fmt(S.post1, 2, true)} m/s).`);
        c.push(`Cuerpo 2 (${fmtM(S.m2)} kg): ${getDirText(S.v2, S.post2)} (${fmt(S.v2, 2, true)} → ${fmt(S.post2, 2, true)} m/s).`);
    }

    let listHtml = '';
    c.forEach(function (texto) {
        listHtml += `<li>${texto}</li>`;
    });

    h += `<div class="rs concl"><h4>Conclusiones</h4><ul>${listHtml}</ul></div>`;
    derivation.innerHTML = h;
}

// BUCLE PRINCIPAL DE ANIMACIÓN
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(0.05, clock.getDelta());
    if (S.state === 'running') {
        physicsStep(dt);
    }

    if (S.state !== 'paused') {
        updateParticles(dt);
        S.squash = S.squash * 0.85;
    }

    timeLbl.textContent = 't = ' + S.t.toFixed(2) + ' s';
    updateMeshes();
    applyCam();
    camera.updateMatrixWorld();
    updateLabels();

    renderer.render(scene, camera);
}

// Eventos presets de objetos
[1, 2].forEach(function (i) {
    const p = $('m' + i + 'preset');
    p.addEventListener('change', function () {
        if (p.value === 'custom') {
            $('m' + i + 'n').focus();
            return;
        }
        let shape = VALUE_SHAPE[p.value];
        if (!shape) shape = 'custom';

        setBodyShape(i, shape);
        setMass(i, p.value, false);
        setup();
    });
});

$('chkLbl').addEventListener('change', updateLabels);

// Inicialización
setBodyShape(1, 'bloque');
setBodyShape(2, 'bloque');
setMass(1, S.m1, false);
setMass(2, S.m2, false);
setVel(1, S.v1);
setVel(2, S.v2);

resize();
setup();
animate();