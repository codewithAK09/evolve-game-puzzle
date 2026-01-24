const pcbCanvas = document.getElementById('pcb-canvas');
const pcbCtx = pcbCanvas.getContext('2d');
const fxCanvas = document.getElementById('fx-canvas');
const fxCtx = fxCanvas.getContext('2d');
const cursor = document.getElementById('cursor-follower');

let particles = [];
let fxMode = 'sparkle';
let traces = [];

function resize() {
    pcbCanvas.width = fxCanvas.width = window.innerWidth;
    pcbCanvas.height = fxCanvas.height = window.innerHeight;
}
window.onresize = resize;
resize();

// --- PCB TRACE ANIMATION ---
class PCBTrace {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * pcbCanvas.width;
        this.y = Math.random() * pcbCanvas.height;
        this.vx = (Math.random() > 0.5 ? 2 : -2);
        this.vy = 0;
        this.history = [];
    }
    update() {
        this.history.push({x: this.x, y: this.y});
        if (this.history.length > 30) this.history.shift();
        this.x += this.vx; this.y += this.vy;
        if (Math.random() > 0.97) {
            if (this.vx !== 0) { this.vy = (Math.random() > 0.5 ? 2 : -2); this.vx = 0; }
            else { this.vx = (Math.random() > 0.5 ? 2 : -2); this.vy = 0; }
        }
        if(this.x < 0 || this.x > pcbCanvas.width || this.y < 0 || this.y > pcbCanvas.height) this.reset();
    }
    draw() {
        pcbCtx.save();
        if (this.history.length > 0) {
            pcbCtx.beginPath();
            pcbCtx.moveTo(this.history[0].x, this.history[0].y);
            this.history.forEach(p => pcbCtx.lineTo(p.x, p.y));
            pcbCtx.strokeStyle = '#7efcff';
            pcbCtx.lineWidth = 1.2;
            pcbCtx.stroke();
        }
        pcbCtx.restore();
    }
}
for (let i = 0; i < 15; i++) traces.push(new PCBTrace());

// --- FX & PARTICLES ---
window.addEventListener('mousemove', (e) => {
    if(cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }
    if (Math.random() > 0.3) particles.push(new Particle(e.clientX, e.clientY, '#00f2ff', 6, 4));
});

class Particle {
    constructor(x, y, color, speed = 2, size = 3) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random()-0.5)*speed; this.vy = (Math.random()-0.5)*speed;
        this.life = 1;
        this.size = size;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 0.015; }
    draw() {
        fxCtx.save();
        fxCtx.globalAlpha = Math.max(0, this.life);
        fxCtx.fillStyle = this.color;
        fxCtx.beginPath();
        fxCtx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        fxCtx.fill();
        fxCtx.restore();
    }
}

function globalLoop() {
    pcbCtx.fillStyle = 'rgba(2, 2, 5, 0.06)';
    pcbCtx.fillRect(0, 0, pcbCanvas.width, pcbCanvas.height);
    traces.forEach(t => { t.update(); t.draw(); });

    fxCtx.clearRect(0,0,fxCanvas.width, fxCanvas.height);
    if(fxMode === 'sparkle' && Math.random() > 0.85)
        particles.push(new Particle(Math.random()*fxCanvas.width, Math.random()*fxCanvas.height, '#00f2ff', 1.5, 2));
    
    particles.forEach((p, i) => { 
        p.update(); p.draw(); 
        if(p.life <= 0) particles.splice(i, 1); 
    });
    requestAnimationFrame(globalLoop);
}
globalLoop();

// --- IMPOSSIBLE MAZE LOGIC ---
const size = 33; 
let maze = [];
let studentPos = { x: 1, y: 1 };
let timeLeft = 25; 
let timerId;

function setGameState(state) {
    document.body.className = 'state-' + state;
    if(state === 'game') { 
        fxMode = 'none'; 
        studentPos = { x: 1, y: 1 };
        timeLeft = 25;
        initGame(); 
    }
}

function initGame() {
    generateImpossibleMaze();
    if(timerId) clearInterval(timerId);
    timerId = setInterval(() => {
        timeLeft--;
        const timeEl = document.getElementById('timer-count');
        const progressEl = document.getElementById('progress-fill');
        if(timeEl) timeEl.innerText = timeLeft + 's';
        if(progressEl) progressEl.style.width = (timeLeft/25)*100 + '%';
        if(timeLeft <= 0) finish(false);
    }, 1000);
}

function generateImpossibleMaze() {
    maze = Array.from({length: size}, () => Array(size).fill(1));

    function carve(x, y) {
        const dirs = [[0,2],[2,0],[0,-2],[-2,0]].sort(()=>Math.random()-0.5);
        maze[y][x] = 0;

        for(let [dx, dy] of dirs) {
            let nx = x + dx, ny = y + dy;
            if(nx > 0 && nx < size-1 && ny > 0 && ny < size-1 && maze[ny][nx] === 1) {
                maze[y + dy/2][x + dx/2] = 0;
                carve(nx, ny);
            }
        }
    }
    carve(1, 1);

    maze[size-2][size-2] = 0;
    if(Math.random() > 0.5) maze[size-3][size-2] = 0; 
    else maze[size-2][size-3] = 0;

    renderMaze();
}

function renderMaze() {
    const container = document.getElementById('maze-container');
    if(!container) return;
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${size}, 20px)`;

    for(let y=0; y<size; y++){
        for(let x=0; x<size; x++){
            const div = document.createElement('div');
            div.className = 'cell ';
            
            // Maze visual state (Fog of War effects removed)
            if(maze[y][x] === 1) div.classList.add('wall');
            if(x === studentPos.x && y === studentPos.y) div.classList.add('student');
            if(x === size-2 && y === size-2) div.classList.add('home');
            
            container.appendChild(div);
        }
    }
}

// --- MOVEMENT CONTROLS ---
let moveInterval = null;
let currentDir = null; 
const moveDelay = 110; 

function tryMove(dx, dy) {
    if(!document.body.classList.contains('state-game')) return;
    let x = studentPos.x + dx;
    let y = studentPos.y + dy;
    
    if(maze[y] && maze[y][x] === 0) {
        studentPos = {x, y};
        const pop = document.getElementById('popSound');
        if(pop) { pop.currentTime = 0; pop.play().catch(()=>{}); }
        renderMaze(); 
        if(x === size-2 && y === size-2) finish(true);
    }
}

function moveOnceByDir(dir) {
    if(dir === 'up') tryMove(0, -1);
    else if(dir === 'down') tryMove(0, 1);
    else if(dir === 'left') tryMove(-1, 0);
    else if(dir === 'right') tryMove(1, 0);
}

function keyToDir(key) {
    const k = key.toLowerCase();
    if(key === 'ArrowUp' || k === 'w') return 'up';
    if(key === 'ArrowDown' || k === 's') return 'down';
    if(key === 'ArrowLeft' || k === 'a') return 'left';
    if(key === 'ArrowRight' || k === 'd') return 'right';
    return null;
}

window.addEventListener('keydown', (e) => {
    const dir = keyToDir(e.key);
    if(!dir || !document.body.classList.contains('state-game')) return;
    if(currentDir === dir && moveInterval) return;
    currentDir = dir;
    moveOnceByDir(dir);
    if(moveInterval) clearInterval(moveInterval);
    moveInterval = setInterval(() => moveOnceByDir(dir), moveDelay);
});

window.addEventListener('keyup', (e) => {
    const dir = keyToDir(e.key);
    if(dir && dir === currentDir) {
        currentDir = null;
        if(moveInterval) { clearInterval(moveInterval); moveInterval = null; }
    }
});

function finish(win) {
    clearInterval(timerId);
    if(moveInterval) clearInterval(moveInterval);
    setGameState('end');
    
    const statusText = document.getElementById('status-text
