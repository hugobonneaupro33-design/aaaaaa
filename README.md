// Configuration centralisée
const CONFIG = {
  GAME_SPEED: 60,
  PLAYER_SPEED: 3.2,
  BASE_MAX_HP: 100,
  TARGET_INITIAL_HP: 150,
  RESOURCE_HARVEST_RATE: 1,
  BUILDING_COST: { wood: 3, metal: 2 },
  BUILDING_SIZE: 34,
  GRID_STEP: 40,
  COLORS: {
    background: "#1a2230",
    player: "#79c7ff",
    playerStroke: "#ffffff",
    base: "#6d8cff",
    baseStroke: "#c7d6ff",
    enemyBase: "#ff5a5a",
    enemyBaseStroke: "#ffd0d0",
    wood: "#8b5a2b",
    metal: "#a9b2c3",
    grid: "rgba(255,255,255,0.04)",
    text: "#ffffff",
    building: "#7c8b99",
    buildingStroke: "#dbe7f2"
  }
};

// Éléments du DOM
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statsEl = document.getElementById("stats");
const messageEl = document.getElementById("message");

// État du jeu
const gameState = {
  keys: {},
  wood: 0,
  metal: 0,
  baseHP: CONFIG.BASE_MAX_HP,
  targetHP: CONFIG.TARGET_INITIAL_HP,
  win: false,
  lastActionTime: 0,
  actionCooldown: 100 // ms
};

// Monde et entités
const world = {
  width: canvas.width,
  height: canvas.height
};

const player = {
  x: 150,
  y: 350,
  w: 26,
  h: 26,
  speed: CONFIG.PLAYER_SPEED,
  color: CONFIG.COLORS.player
};

const base = {
  x: 120,
  y: 520,
  w: 130,
  h: 90,
  color: CONFIG.COLORS.base,
  hp: CONFIG.BASE_MAX_HP,
  maxHP: CONFIG.BASE_MAX_HP
};

const enemyBase = {
  x: 890,
  y: 120,
  w: 140,
  h: 100,
  color: CONFIG.COLORS.enemyBase,
  hp: CONFIG.TARGET_INITIAL_HP,
  maxHP: CONFIG.TARGET_INITIAL_HP
};

const resourceNodes = [
  { x: 320, y: 200, type: "wood", amount: 30, maxAmount: 30 },
  { x: 420, y: 520, type: "wood", amount: 30, maxAmount: 30 },
  { x: 620, y: 260, type: "metal", amount: 25, maxAmount: 25 },
  { x: 760, y: 520, type: "metal", amount: 25, maxAmount: 25 }
];

const buildings = [];
const particles = []; // Système de particules

// Utilitaires
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

function distance(a, b) {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  return Math.hypot(ax - bx, ay - by);
}

function near(a, b, dist = 45) {
  return distance(a, b) < dist;
}

function createParticle(x, y, vx, vy, color, life = 30) {
  particles.push({
    x, y, vx, vy, color, life, maxLife: life,
    size: 4
  });
}

// Rendu
function drawGrid() {
  ctx.strokeStyle = CONFIG.COLORS.grid;
  ctx.lineWidth = 1;
  const step = CONFIG.GRID_STEP;
  
  for (let x = 0; x < canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  for (let y = 0; y < canvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawRect(obj, fill, stroke = null) {
  ctx.fillStyle = fill;
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
  }
}

function drawCircle(x, y, r, fill, stroke = null) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawHealthBar(obj, text = "") {
  const barWidth = obj.w;
  const barHeight = 6;
  const barY = obj.y - 12;
  
  // Fond
  ctx.fillStyle = "#ff4444";
  ctx.fillRect(obj.x, barY, barWidth, barHeight);
  
  // Santé
  const healthPercent = clamp(obj.hp / obj.maxHP, 0, 1);
  ctx.fillStyle = "#44ff44";
  ctx.fillRect(obj.x, barY, barWidth * healthPercent, barHeight);
  
  // Bordure
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.strokeRect(obj.x, barY, barWidth, barHeight);
  
  if (text) {
    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.font = "bold 12px Arial";
    ctx.fillText(text, obj.x + 5, barY - 5);
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = p.color.replace(")", `, ${alpha})`).replace("rgb", "rgba");
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateHUD() {
  statsEl.textContent = `Bois: ${gameState.wood} | Métal: ${gameState.metal} | Base: ${gameState.baseHP}/${CONFIG.BASE_MAX_HP} | Cible: ${gameState.targetHP}/${CONFIG.TARGET_INITIAL_HP}`;
  
  if (gameState.win) {
    messageEl.textContent = "🎉 Victoire ! La cible ennemie est détruite.";
    messageEl.style.color = "#44ff44";
  }
}

// Actions
function tryAction() {
  if (gameState.win) return;
  
  const now = Date.now();
  if (now - gameState.lastActionTime < gameState.actionCooldown) return;
  gameState.lastActionTime = now;

  // Récolte
  for (const node of resourceNodes) {
    if (node.amount > 0 && near(player, { x: node.x - 12, y: node.y - 12, w: 24, h: 24 })) {
      if (node.type === "wood") gameState.wood += CONFIG.RESOURCE_HARVEST_RATE;
      if (node.type === "metal") gameState.metal += CONFIG.RESOURCE_HARVEST_RATE;
      node.amount -= 1;
      
      createParticle(node.x, node.y, Math.random() - 0.5, Math.random() - 1, "rgb(255,200,100)");
      setMessage(`Tu as récolté du ${node.type}. (${node.amount} restant)`);
      updateHUD();
      return;
    }
  }

  // Dépôt de ressources
  if (near(player, base, 60)) {
    if (gameState.wood > 0 || gameState.metal > 0) {
      const healing = gameState.wood * 2 + gameState.metal * 3;
      gameState.baseHP = Math.min(CONFIG.BASE_MAX_HP, gameState.baseHP + healing);
      gameState.wood = 0;
      gameState.metal = 0;
      
      createParticle(base.x + base.w / 2, base.y, 0, -2, "rgb(100,255,100)");
      setMessage(`Ressources déposées (+${healing} HP).`);
      updateHUD();
      return;
    }
  }

  // Attaque base ennemie
  if (near(player, enemyBase, 70)) {
    if (gameState.wood >= 2 && gameState.metal >= 1) {
      gameState.wood -= 2;
      gameState.metal -= 1;
      gameState.targetHP -= 20;
      
      createParticle(enemyBase.x + enemyBase.w / 2, enemyBase.y + enemyBase.h / 2, 0, 0, "rgb(255,100,100)");
      setMessage("💥 Tu attaques la cible ennemie !");
      
      if (gameState.targetHP <= 0) {
        gameState.targetHP = 0;
        gameState.win = true;
      }
      updateHUD();
      return;
    } else {
      setMessage("❌ Pas assez de ressources (besoin: 2 bois, 1 métal)");
    }
  }

  // Construction
  if (gameState.wood >= CONFIG.BUILDING_COST.wood && gameState.metal >= CONFIG.BUILDING_COST.metal) {
    const building = {
      x: player.x + 30,
      y: player.y + 10,
      w: CONFIG.BUILDING_SIZE,
      h: CONFIG.BUILDING_SIZE,
      color: CONFIG.COLORS.building
    };
    buildings.push(building);
    gameState.wood -= CONFIG.BUILDING_COST.wood;
    gameState.metal -= CONFIG.BUILDING_COST.metal;
    
    setMessage("🏗️ Construction posée !");
    updateHUD();
  }
}

function setMessage(text) {
  messageEl.textContent = text;
  messageEl.style.color = CONFIG.COLORS.text;
}

// Mouvement
function movePlayer() {
  let dx = 0;
  let dy = 0;
  
  if (gameState.keys["ArrowUp"] || gameState.keys["z"] || gameState.keys["Z"]) dy -= player.speed;
  if (gameState.keys["ArrowDown"] || gameState.keys["s"] || gameState.keys["S"]) dy += player.speed;
  if (gameState.keys["ArrowLeft"] || gameState.keys["q"] || gameState.keys["Q"]) dx -= player.speed;
  if (gameState.keys["ArrowRight"] || gameState.keys["d"] || gameState.keys["D"]) dx += player.speed;

  player.x = clamp(player.x + dx, 0, world.width - player.w);
  player.y = clamp(player.y + dy, 0, world.height - player.h);
}

// Boucle de jeu
function update() {
  movePlayer();
  base.hp = gameState.baseHP;
  enemyBase.hp = gameState.targetHP;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Fond
  ctx.fillStyle = CONFIG.COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  drawGrid();

  // Bases
  drawRect(base, base.color, CONFIG.COLORS.baseStroke);
  drawHealthBar(base, "Ta base");
  
  drawRect(enemyBase, enemyBase.color, CONFIG.COLORS.enemyBaseStroke);
  drawHealthBar(enemyBase, "Cible ennemie");

  // Ressources
  for (const node of resourceNodes) {
    if (node.amount <= 0) continue;
    
    const color = node.type === "wood" ? CONFIG.COLORS.wood : CONFIG.COLORS.metal;
    const alpha = node.amount / node.maxAmount;
    
    drawCircle(node.x, node.y, 16, color);
    
    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${node.type[0].toUpperCase()} (${node.amount})`, node.x, node.y - 24);
    ctx.textAlign = "left";
  }

  // Bâtiments
  for (const b of buildings) {
    drawRect(b, b.color, CONFIG.COLORS.buildingStroke);
  }

  // Joueur
  drawRect(player, player.color, CONFIG.COLORS.playerStroke);
  
  // Particules
  drawParticles();

  // Écran victoire
  if (gameState.win) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🎉 VICTOIRE 🎉", canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = "20px Arial";
    ctx.fillText("La cible ennemie est détruite !", canvas.width / 2, canvas.height / 2 + 20);
    ctx.textAlign = "left";
  }
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// Événements
window.addEventListener("keydown", (e) => {
  gameState.keys[e.key] = true;
  if (e.key === "e" || e.key === "E") tryAction();
});

window.addEventListener("keyup", (e) => {
  gameState.keys[e.key] = false;
});

// Démarrage
updateHUD();
gameLoop();
