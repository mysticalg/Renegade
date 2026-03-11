import { GameModel, LEVELS } from './gameLogic.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const levelLabel = document.getElementById('levelLabel');
const scoreLabel = document.getElementById('scoreLabel');
const playerHealth = document.getElementById('playerHealth');
const messageBar = document.getElementById('messageBar');
const helpButton = document.getElementById('helpButton');
const helpPanel = document.getElementById('helpPanel');

const game = new GameModel();
const keys = new Set();

helpButton.addEventListener('click', () => {
  helpPanel.hidden = !helpPanel.hidden;
});

window.addEventListener('keydown', (event) => {
  keys.add(event.key.toLowerCase());
  if (event.key.toLowerCase() === 'j') game.playerAttack('punch');
  if (event.key.toLowerCase() === 'k') game.playerAttack('kick');
  if (event.key.toLowerCase() === 'l') game.playerAttack('special');
  if (event.key.toLowerCase() === 'r' && game.state !== 'fighting') game.reset();
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));

function drawBlockFighter(f, color) {
  const x = Math.round(f.x);
  const y = Math.round(f.y);
  ctx.fillStyle = color;
  ctx.fillRect(x - 12, y - 34, 24, 28);
  ctx.fillRect(x - 10, y - 6, 20, 24);
  ctx.fillRect(x - 18, y - 2, 8, 10);
  ctx.fillRect(x + 10, y - 2, 8, 10);
  ctx.fillRect(x - 10, y + 18, 8, 16);
  ctx.fillRect(x + 2, y + 18, 8, 16);

  // Health bars help the player read enemy status quickly.
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 16, y - 44, 32, 5);
  ctx.fillStyle = '#80ed99';
  ctx.fillRect(x - 16, y - 44, (f.health / f.maxHealth) * 32, 5);
}

function drawBackground(level) {
  ctx.fillStyle = level.palette.sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = level.palette.deco;
  for (let i = 0; i < canvas.width; i += 70) {
    const h = 45 + (i % 140);
    ctx.fillRect(i, 160, 38, h);
  }
  ctx.fillStyle = level.palette.ground;
  ctx.fillRect(0, 300, canvas.width, 240);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let y = 300; y < 540; y += 28) ctx.fillRect(0, y, canvas.width, 2);
}

function updateInput() {
  const left = keys.has('arrowleft') || keys.has('a');
  const right = keys.has('arrowright') || keys.has('d');
  const up = keys.has('arrowup') || keys.has('w');
  const down = keys.has('arrowdown') || keys.has('s');
  game.movePlayer((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
}

function render() {
  const level = LEVELS[game.levelIndex];
  drawBackground(level);
  drawBlockFighter(game.player, '#f8f8ff');
  game.enemies.filter((e) => e.alive).forEach((e) => drawBlockFighter(e, '#ff595e'));
  if (game.boss?.alive) drawBlockFighter(game.boss, '#fca311');

  ctx.fillStyle = '#f8f8ff';
  ctx.font = '18px monospace';
  ctx.fillText(level.name, 24, 28);
  ctx.fillText(`Stamina ${Math.round(game.player.stamina)}`, 24, 52);

  if (game.state !== 'fighting') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(220, 220, 520, 110);
    ctx.fillStyle = '#fff';
    ctx.font = '22px monospace';
    ctx.fillText(game.state === 'won' ? 'VICTORY!' : 'DEFEATED', 400, 268);
    ctx.font = '16px monospace';
    ctx.fillText('Press R to restart', 380, 300);
  }

  levelLabel.textContent = `Stage ${game.levelIndex + 1}`;
  scoreLabel.textContent = `Score: ${game.score}`;
  playerHealth.textContent = `HP: ${Math.round(game.player.health)}`;
  messageBar.textContent = game.message;
}

let prev = performance.now();
function frame(now) {
  const dt = Math.min(0.04, (now - prev) / 1000);
  prev = now;
  updateInput();
  game.update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
