const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400;
canvas.height = 400;

let gameState = {
    active: false,
    currentRoute: null,
    level: 1,
    hp: 100,
    stress: 40,
    playerX: 180,
    obstacles: [],
    spawnRate: 0.03,
    buffActive: false,
    levelTimer: null,
    audio: new Audio('retro_theme.mp3'),
    charImg: new Image(),
    obsImgs: {}
};

gameState.audio.loop = true;

const obstacleFiles = ['log.png', 'bush.png', 'rock.png'];
obstacleFiles.forEach(file => {
    const img = new Image();
    img.src = `img/${file}`;
    gameState.obsImgs[file.split('.')[0]] = img;
});

const routes = {
    island: {
        receiptId: "ISLAND GUARDIAN",
        levels: [
            { header: "DAILY DUTY", obs: "log", q: "IT'S A BUSY DAY, WHAT SHOULD I DO?", 
              options: [{n: "Handle Court Case", c:true, i:"court.png"}, {n: "Buy Wife Snack", c:true, i:"snack.png"}, {n: "Take Gaming Break", c:false, i:"game.png"}] },
            { header: "CRAVING ALERT BOSS", obs: "bush", q: "WIFE IS CRAVING, WHAT SHOULD I DO?", 
              options: [{n: "Buy the food immediately", c:true, i:"food.png"}, {n: "Say ‘5 menit lagi ya bebi’", c:false, i:"talk.png"}, {n: "Cook something for wife", c:false, i:"cook.png"}] },
            { header: "SELF DOUBT", obs: "rock", q: "“Am I ready to be a father?”", 
              options: [{n: "Parent Buff", c:true, i:"parent.png"}, {n: "Sister Buff", c:true, i:"sister.png"}] }
        ]
    },
    scholar: {
        receiptId: "OVERSEAS SCHOLAR",
        levels: [
            { header: "DEADLINE DUNGEON", obs: "log", q: "IT'S A BUSY DAY, WHAT SHOULD I DO?", 
              options: [{n: "Write Thesis", c:true, i:"thesis.png"}, {n: "Watch Anime", c:false, i:"anime.png"}, {n: "Call Fiancé", c:true, i:"love.png"}] },
            { header: "TIME ZONE MONSTER", obs: "bush", q: "TOMMORROW IS THE WEEKEND, WHAT SHOULD I DO TONIGHT?.", 
              options: [{n: "Sleep all day until noon", c:false, i:"sleep.png"}, {n: "Video call with fiancé", c:true, i:"love.png"}, {n: "Gaming all night long", c:false, i:"game.png"}] },
            { header: "DISTANCE DOUBT", obs: "rock", q: "“Is LDR too hard?”", 
              options: [{n: "Parent Buff", c:true, i:"parent.png"}, {n: "Sister Buff", c:true, i:"sister.png"}] }
        ]
    }
};

const screens = {
    container: document.getElementById('game-container'),
    start: document.getElementById('start-page'),
    header: document.getElementById('game-header'),
    stats: document.getElementById('stats-bar'),
    select: document.getElementById('char-select'),
    canvas: document.getElementById('gameCanvas'),
    controls: document.getElementById('mobile-controls'),
    popup: document.getElementById('popup-overlay'),
    receipt: document.getElementById('receipt-page')
};

document.getElementById('btn-start-init').addEventListener('click', () => {
    screens.start.classList.add('hidden');
    screens.header.classList.remove('hidden');
    screens.select.classList.remove('hidden');
    gameState.audio.play(); 
});

document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        gameState.currentRoute = routes[e.target.dataset.char];
        gameState.charImg.src = `img/${e.target.dataset.char}_idle.png`;
        gameState.stress = 40; // Initial stress
        startLevel(1);
    });
});

function startLevel(lvl) {
    gameState.level = lvl;
    gameState.hp = 100; // Reset HP per level [cite: 25]
    gameState.spawnRate = 0.03 + (lvl - 1) * 0.02; // Increase difficulty [cite: 8]
    if (gameState.buffActive && lvl === 3) gameState.spawnRate -= 0.03; // Buff effect [cite: 8]
    
    gameState.obstacles = [];
    gameState.playerX = 180; // Center position [cite: 15]
    
    screens.container.classList.remove('low-hp-flash');
    
    screens.select.classList.add('hidden');
    screens.stats.classList.remove('hidden');
    updateStats();

    if (lvl === 3 && !gameState.buffActive) {
        showQnA(); 
    } else {
        startMinigame();
    }
}

function startMinigame() {
    gameState.active = true;
    screens.canvas.classList.remove('hidden');
    screens.controls.classList.remove('hidden');
    
    if (gameState.levelTimer) clearTimeout(gameState.levelTimer);
    
    gameState.levelTimer = setTimeout(() => {
        if (gameState.active) {
            gameState.active = false;
            finishMinigamePhase();
        }
    }, 15000); 
    
    gameLoop();
}

function finishMinigamePhase() {
    if (gameState.level < 3) {
        showQnA(); 
    } else {
        showNotice("MISSION COMPLETE", "Congratulations! You've Conquered The Journey.", () => showReceipt(), "VIEW CREDITS");
    }
}

function gameLoop() {
    if (!gameState.active) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(gameState.charImg, gameState.playerX, 320, 60, 60);

    if (Math.random() < gameState.spawnRate) {
        gameState.obstacles.push({ x: Math.random() * (canvas.width - 50), y: -50 });
    }

    const obsType = gameState.currentRoute.levels[gameState.level - 1].obs;
    gameState.obstacles.forEach((obs, i) => {
        obs.y += 5; // Fall speed

        if (gameState.obsImgs[obsType]) {
            ctx.drawImage(gameState.obsImgs[obsType], obs.x, obs.y, 50, 50);
        }

        if (obs.y > 300 && obs.y < 370 && obs.x > gameState.playerX - 40 && obs.x < gameState.playerX + 50) {
            gameState.obstacles.splice(i, 1);
            hitObstacle();
        }
        
        if (obs.y > 400) gameState.obstacles.splice(i, 1);
    });

    requestAnimationFrame(gameLoop);
}

document.getElementById('left-btn').addEventListener('click', () => {
    if (gameState.playerX > 10) gameState.playerX -= 40; // Snappier movement for bigger char
});

document.getElementById('right-btn').addEventListener('click', () => {
    if (gameState.playerX < 330) gameState.playerX += 40;
});

function showQnA() {
    const levelData = gameState.currentRoute.levels[gameState.level - 1];
    const container = document.getElementById('qna-options');
    
    document.getElementById('popup-box').classList.remove('hidden');
    document.getElementById('notice-box').classList.add('hidden');
    screens.popup.classList.remove('hidden');

    container.innerHTML = '';
    document.getElementById('popup-header').innerText = `LEVEL ${gameState.level}`;
    document.getElementById('popup-text').innerText = levelData.q;
    
    levelData.options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'option-box';
        div.innerHTML = `<img src="img/${opt.i}"><span>${opt.n}</span>`;
        div.onclick = () => handleChoice(opt.c, opt.n);
        container.appendChild(div);
    });
}

function showNotice(header, text, callback, btnText = "OK", isGameOver = false) {
    const noticeBox = document.getElementById('notice-box');
    const qnaBox = document.getElementById('popup-box');
    
    qnaBox.classList.add('hidden');
    noticeBox.classList.remove('hidden');
    screens.popup.classList.remove('hidden');

    document.getElementById('notice-header').innerText = header;
    document.getElementById('notice-text').innerText = text;
    
    const btn = document.getElementById('notice-confirm-btn');
    btn.innerText = btnText;

    if (isGameOver) {
        noticeBox.classList.add('game-over-theme');
        btn.style.backgroundColor = "#ff4444";
        btn.style.color = "white";
    } else {
        noticeBox.classList.remove('game-over-theme');
        btn.style.backgroundColor = "rgb(255, 239, 60)";
        btn.style.color = "black";
    }

    btn.onclick = () => {
        screens.popup.classList.add('hidden');
        noticeBox.classList.add('hidden'); // Hide the box too
        if (callback) callback();
    };
}

function hitObstacle() {
    gameState.hp -= 10;
    screens.container.classList.add('screen-shake');
    setTimeout(() => screens.container.classList.remove('screen-shake'), 200);
    updateStats();
    
    if (gameState.hp <= 0) {
        gameState.active = false;
        clearTimeout(gameState.levelTimer);
        showNotice("SYSTEM FAILURE", "Too Much Damage! Try Again.", () => startLevel(gameState.level), "RESTART", true);
    }
}

function handleChoice(isCorrect, name) {
    const warnEl = document.getElementById('warning-text');
    
    if (isCorrect) {
        gameState.stress = Math.max(10, gameState.stress - 15);
        updateStats(); 
        
        warnEl.classList.add('hidden'); 
        
        if (gameState.level === 3 && !gameState.buffActive) {
            showNotice("POWER UP", `ACTIVATE ${name.toUpperCase()}?`, () => {
                gameState.buffActive = true;
                startLevel(3); 
            }, "YES");
        } else {
            showNotice("LEVEL CLEAR", "Path cleared! Proceed to next stage.", () => startLevel(gameState.level + 1));
        }
    } else {
        gameState.stress += 15;
        updateStats(); 

        if (gameState.stress >= 100) {
            gameState.active = false;
            showNotice("STRESS OVERLOAD", "Mission Failed. Take a deep breath!", () => location.reload(), "TRY AGAIN", true);
            return;
        }

        warnEl.classList.remove('hidden');
        if (gameState.stress <= 55) warnEl.innerText = "⚠ Hey... that doesn’t feel right.";
        else if (gameState.stress <= 70) warnEl.innerText = "⚠ Are you sure? Something feels off.";
        else warnEl.innerText = "⚠ Last warning… Choose wisely.";
    }
}

function updateStats() {
    const hpBar = document.getElementById('hp-fill');
    const stressBar = document.getElementById('stress-fill');
    
    hpBar.style.width = gameState.hp + "%";
    stressBar.style.width = gameState.stress + "%";
    
    if (gameState.hp <= 30) {
        hpBar.style.backgroundColor = "red";
        screens.container.classList.add('low-hp-flash');
    } else {
        hpBar.style.backgroundColor = gameState.hp <= 60 ? "yellow" : "green";
        screens.container.classList.remove('low-hp-flash');
    }

    if (gameState.stress >= 85) {
        stressBar.style.backgroundColor = "red"; 
    } else if (gameState.stress >= 70) {
        stressBar.style.backgroundColor = "orange"; 
    } else {
        stressBar.style.backgroundColor = "cyan"; 
    }
}

document.getElementById('left-btn').onclick = () => { if(gameState.playerX > 10) gameState.playerX -= 30; };
document.getElementById('right-btn').onclick = () => { if(gameState.playerX < 350) gameState.playerX += 30; };

function showReceipt() {
    screens.container.classList.remove('low-hp-flash');
    screens.canvas.classList.add('hidden');
    screens.controls.classList.add('hidden');
    screens.stats.classList.add('hidden');
    screens.header.classList.add('hidden');
    screens.receipt.classList.remove('hidden');
    
    const isIsland = gameState.currentRoute.receiptId === "ISLAND GUARDIAN";
    const mainEl = document.getElementById('receipt-main-content');
    const msgEl = document.getElementById('personal-message');

    mainEl.innerHTML = isIsland ? `
        <div style="text-align:center"><b>ISLAND GUARDIAN</b></div>
        <div class="receipt-divider"></div>
        <pre style="font-size: 0.8rem;">
Court Responsibility... +20
Husband Patience....... +50
Future Dad Energy...... +999
Island Survival........ MAX
Gaming Reflex.......... EPIC
        </pre>
        <div class="receipt-divider">TOTAL VALUE: LEGENDARY</div>
        <div class="receipt-divider"></div>
        <div style="text-align:center; font-size: 0.8rem;">
            <b>TITLE UNLOCKED:</b><br>
            GUARDIAN OF TWO HEARTS
        </div>
    ` : `
        <div style="text-align:center"><b>OVERSEAS SCHOLAR</b></div>
        <div class="receipt-divider"></div>
        <pre style="font-size: 0.8rem;">
Academic Endurance..... +80
LDR Loyalty............ +100
Husband Potential...... SSS
Thesis Damage.......... -999
Coffee Consumption..... ∞
        </pre>
        <div class="receipt-divider">TOTAL VALUE: MYTHIC RARE</div>
        <div class="receipt-divider"></div>
        <div style="text-align:center; font-size: 0.8rem;">
            <b>TITLE UNLOCKED:</b><br>
            SCHOLAR OF TWO WORLDS
        </div>
    `;
    msgEl.innerHTML = isIsland ? `
        <p>Serving the law on a small island is no small feat, but being a great husband and father is your greatest mission yet. Take care of the little one on the way!</p>
        <p>Happy Birthday! Can’t wait to meet the newest member of the 'team'.</p>
        <div class="receipt-footer">— Love, Mom, Dad, & Sisters</div>
    ` : `
        <p>Distance is just a technicality; your hard work is legendary. We are so proud of your Master's journey. A beautiful future is waiting back home!</p>
        <p>Happy Birthday! We’re always cheering for you from across the ocean.</p>
        <div class="receipt-footer">— Love, Mom, Dad, & Sisters</div>
    `;
}

document.getElementById('play-again-btn').onclick = () => location.reload();
