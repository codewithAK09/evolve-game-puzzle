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
    }
    draw() {
        pcbCtx.save();
        if (this.history.length > 0) pcbCtx.beginPath(), pcbCtx.moveTo(this.history[0].x, this.history[0].y);
        this.history.forEach(p => pcbCtx.lineTo(p.x, p.y));
        pcbCtx.strokeStyle = '#7efcff';
        pcbCtx.lineWidth = 1.2;
        pcbCtx.shadowBlur = 18;
        pcbCtx.shadowColor = '#7efcff';
        pcbCtx.globalCompositeOperation = 'lighter';
        pcbCtx.stroke();
        pcbCtx.restore();
    }
}
for (let i = 0; i < 15; i++) traces.push(new PCBTrace());

// --- MOUSE FOLLOW & FX ---
window.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
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
        fxCtx.globalCompositeOperation = 'lighter';
        fxCtx.globalAlpha = Math.max(0, Math.min(1, this.life));
        fxCtx.fillStyle = this.color;
        fxCtx.shadowBlur = 18;
        fxCtx.shadowColor = this.color;
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

// --- GAME LOGIC (Restored from your version) ---
const size = 29;
let maze = [];
let studentPos = { x: 1, y: 1 };
let timeLeft = 20;
let timerId;

function setGameState(state) {
    document.body.className = 'state-' + state;
    if(state === 'game') { fxMode = 'none'; initGame(); }
}

function initGame() {
    generateToughMaze();
    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-count').innerText = timeLeft + 's';
        document.getElementById('progress-fill').style.width = (timeLeft/2<0)*100 + '%';
        if(timeLeft <= 0) finish(false);
    }, 1000);
}

function generateToughMaze() {
    maze = Array.from({length: size}, () => Array(size).fill(1));
    function carve(x, y) {
        const dirs = [[0,2],[2,0],[0,-2],[-2,0]].sort(()=>Math.random()-0.5);
        maze[y][x] = 0;
        for(let [dx, dy] of dirs) {
            let nx = x+dx, ny = y+dy;
            if(nx>0 && nx<size-1 && ny>0 && ny<size-1 && maze[ny][nx] === 1) {
                maze[y+dy/2][x+dx/2] = 0; carve(nx, ny);
            }
        }
    }
    carve(1, 1);
    for(let i=0; i<8; i++) { // Increased fake paths
        let rx = Math.floor(Math.random()*(size-4))+2;
        let ry = Math.floor(Math.random()*(size-4))+2;
        maze[ry][rx] = 0;
    }
    renderMaze();
}

function renderMaze() {
    const container = document.getElementById('maze-container');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${size}, 22px)`;
    for(let y=0; y<size; y++){
        for(let x=0; x<size; x++){
            const div = document.createElement('div');
            div.className = 'cell ' + (maze[y][x] === 1 ? 'wall' : '');
            if(x === studentPos.x && y === studentPos.y) div.classList.add('student');
            if(x === size-2 && y === size-2) div.classList.add('home');
            container.appendChild(div);
        }
    }
}

window.addEventListener('keydown', (e) => {
    if(!document.body.classList.contains('state-game')) return;
    let {x, y} = studentPos;
    if(e.key==='ArrowUp'||e.key==='w') y--;
    else if(e.key==='ArrowDown'||e.key==='s') y++;
    else if(e.key==='ArrowLeft'||e.key==='a') x--;
    else if(e.key==='ArrowRight'||e.key==='d') x++;

    if(maze[y] && maze[y][x] === 0) {
        studentPos = {x, y};
        document.getElementById('popSound').currentTime = 0;
        document.getElementById('popSound').play().catch(()=>{});
        renderMaze();
        if(x === size-2 && y === size-2) finish(true);
    }
});

function finish(win) {
    clearInterval(timerId);
    setGameState('end');
    document.getElementById('status-text').innerText = win ? "SUCCESS" : "FAILED";
    document.getElementById('status-text').style.color = win ? "var(--neon)" : "var(--pink)";
    document.getElementById('sub-message').innerText = win ? "Dedication proven. Welcome to EVOLVE!" : "Try hard if u want to join EVOLVE.";
    if(win) {
        fxMode = 'cracker';
        setInterval(() => {
            for(let i=0; i<20; i++) particles.push(new Particle(Math.random()*fxCanvas.width, Math.random()*fxCanvas.height, '#ff0055', 8, 3));
        }, 200);
    }
}