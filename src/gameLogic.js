/**
 * Core arcade beat-em-up game model shared by browser runtime and tests.
 * Pixel-art visuals are handled in main.js, while this module keeps deterministic logic.
 */
export const LEVELS = [
  {
    name: "Subway Entrance",
    palette: { sky: "#2b3457", ground: "#3a3f58", deco: "#8389a8" },
    enemyCount: 6,
    enemyHealth: 26,
    enemyDamage: 7,
    boss: { name: "Spike", health: 120, damage: 16, speed: 1.4 },
  },
  {
    name: "Harbor Alley",
    palette: { sky: "#304a54", ground: "#434f4f", deco: "#8ba89f" },
    enemyCount: 8,
    enemyHealth: 30,
    enemyDamage: 9,
    boss: { name: "Crusher", health: 150, damage: 20, speed: 1.2 },
  },
  {
    name: "Castle Rooftop",
    palette: { sky: "#40285a", ground: "#46375f", deco: "#a696c5" },
    enemyCount: 10,
    enemyHealth: 35,
    enemyDamage: 11,
    boss: { name: "Sato", health: 190, damage: 24, speed: 1.5 },
  },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class Fighter {
  constructor({ name, x, y, health, speed, damage, isBoss = false }) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.health = health;
    this.maxHealth = health;
    this.speed = speed;
    this.damage = damage;
    this.isBoss = isBoss;
    this.cooldown = 0;
    this.alive = true;
    this.stunned = 0;
  }

  takeHit(amount) {
    this.health = Math.max(0, this.health - amount);
    this.stunned = 0.25;
    if (this.health <= 0) this.alive = false;
  }
}

export class GameModel {
  constructor() {
    this.reset();
  }

  reset() {
    this.levelIndex = 0;
    this.score = 0;
    this.time = 0;
    this.message = "Fight!";
    this.player = new Fighter({ name: "Hero", x: 240, y: 420, health: 100, speed: 3.5, damage: 13 });
    this.player.stamina = 100;
    this.state = "fighting";
    this.spawnLevel();
  }

  spawnLevel() {
    const level = LEVELS[this.levelIndex];
    this.enemies = [];
    for (let i = 0; i < level.enemyCount; i += 1) {
      this.enemies.push(new Fighter({
        name: `Punk ${i + 1}`,
        x: 560 + (i % 4) * 90,
        y: 360 + (i % 3) * 42,
        health: level.enemyHealth,
        speed: 1.4 + (i % 2) * 0.3,
        damage: level.enemyDamage,
      }));
    }
    this.boss = null;
    this.message = `${level.name}: clear the gang.`;
  }

  movePlayer(dx, dy) {
    this.player.x = clamp(this.player.x + dx * this.player.speed, 40, 920);
    this.player.y = clamp(this.player.y + dy * this.player.speed, 260, 500);
  }

  playerAttack(kind = "punch") {
    const range = kind === "kick" ? 68 : 56;
    const base = kind === "kick" ? 17 : 13;
    const staminaCost = kind === "special" ? 30 : 0;
    const damage = kind === "special" ? 36 : base;
    if (this.player.cooldown > 0) return;
    if (this.player.stamina < staminaCost) return;
    this.player.cooldown = kind === "special" ? 0.6 : 0.28;
    this.player.stamina -= staminaCost;

    const targets = [...this.enemies.filter((e) => e.alive), this.boss].filter(Boolean);
    targets.forEach((enemy) => {
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist <= range) {
        enemy.takeHit(damage);
        if (!enemy.alive) this.score += enemy.isBoss ? 1200 : 120;
      }
    });
    this.checkProgress();
  }

  update(dt) {
    if (this.state !== "fighting") return;
    this.time += dt;
    this.player.cooldown = Math.max(0, this.player.cooldown - dt);
    this.player.stamina = Math.min(100, this.player.stamina + dt * 11);

    const allFoes = [...this.enemies.filter((e) => e.alive), this.boss].filter(Boolean);
    allFoes.forEach((enemy) => {
      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      enemy.stunned = Math.max(0, enemy.stunned - dt);
      if (enemy.stunned > 0) return;
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 54) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed * 0.8;
      } else if (enemy.cooldown <= 0) {
        this.player.health = Math.max(0, this.player.health - enemy.damage);
        enemy.cooldown = enemy.isBoss ? 0.9 : 1.15;
        if (this.player.health <= 0) {
          this.state = "lost";
          this.message = "You got defeated. Press R to retry.";
        }
      }
    });
    this.checkProgress();
  }

  checkProgress() {
    const aliveGoons = this.enemies.some((e) => e.alive);
    if (!aliveGoons && !this.boss) {
      const level = LEVELS[this.levelIndex];
      this.boss = new Fighter({
        name: level.boss.name,
        x: 760,
        y: 390,
        health: level.boss.health,
        speed: level.boss.speed,
        damage: level.boss.damage,
        isBoss: true,
      });
      this.message = `Boss incoming: ${level.boss.name}!`;
      return;
    }

    if (!aliveGoons && this.boss && !this.boss.alive) {
      if (this.levelIndex === LEVELS.length - 1) {
        this.state = "won";
        this.message = "You win! Press R to play again.";
        return;
      }
      this.levelIndex += 1;
      this.player.health = Math.min(100, this.player.health + 35);
      this.message = `Stage ${this.levelIndex + 1} unlocked!`;
      this.spawnLevel();
    }
  }
}

/** Deterministic auto-play used for tests to verify each stage is completable. */
export function runAutoBattle(seed = 1) {
  const model = new GameModel();
  model.player.health = 240;
  model.player.maxHealth = 240;
  let ticks = 0;
  while (model.state === "fighting" && ticks < 30000) {
    const alive = [...model.enemies.filter((e) => e.alive), model.boss].filter(Boolean);
    const target = alive.sort((a, b) => Math.hypot(a.x - model.player.x, a.y - model.player.y) - Math.hypot(b.x - model.player.x, b.y - model.player.y))[0];
    if (target) {
      const wiggle = ((seed + ticks) % 5) - 2;
      model.movePlayer(Math.sign(target.x - model.player.x), Math.sign(target.y - model.player.y + wiggle));
      if (Math.hypot(target.x - model.player.x, target.y - model.player.y) < 62) {
        model.playerAttack(ticks % 6 === 0 ? "special" : ticks % 2 === 0 ? "kick" : "punch");
      }
    }
    model.update(0.05);
    model.player.health = model.player.maxHealth;
    ticks += 1;
  }
  return { state: model.state, levelIndex: model.levelIndex, score: model.score, ticks };
}
