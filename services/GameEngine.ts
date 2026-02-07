import { CONFIG, POWERUPS } from "../constants";
import { PersistentData, PlayerPowerup, InputState } from "../types";
import { soundManager } from "./SoundManager";

// --- HELPERS ---
const getNearestEnemies = (player: {x:number, y:number}, enemies: Enemy[], count: number) => {
    return [...enemies].sort((a,b) => {
        const da = Math.hypot(a.x - player.x, a.y - player.y);
        const db = Math.hypot(b.x - player.x, b.y - player.y);
        return da - db;
    }).slice(0, count);
};

const getRandomEnemy = (enemies: Enemy[]) => {
    if (enemies.length === 0) return null;
    return enemies[Math.floor(Math.random() * enemies.length)];
};

class Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
  constructor(x: number, y: number, color: string, speed = 2, size = 3) {
    this.x = x; this.y = y; this.color = color;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 20 + Math.random() * 20;
    this.maxLife = this.life;
    this.size = size;
  }
  update() { this.x += this.vx; this.y += this.vy; this.life--; }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class FloatingText {
    x: number; y: number; text: string; life = 60; color: string;
    constructor(x: number, y: number, text: string, color: string) {
        this.x = x; this.y = y; this.text = text; this.color = color;
    }
    update() { this.y -= 0.5; this.life--; }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.globalAlpha = this.life / 60;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

class Enemy {
  x: number; y: number; hp: number; maxHp: number;
  speed: number; damage: number; radius: number;
  type: 'basic' | 'fast' | 'tank' | 'boss';
  color: string;
  isSlowed: boolean = false;
  sprite: string;
  
  constructor(w: number, h: number, wave: number, isBoss = false) {
    const side = Math.floor(Math.random() * 4);
    if(side === 0) { this.x = Math.random() * w; this.y = -30; }
    else if(side === 1) { this.x = w + 30; this.y = Math.random() * h; }
    else if(side === 2) { this.x = Math.random() * w; this.y = h + 30; }
    else { this.x = -30; this.y = Math.random() * h; }

    const scaler = 1 + (wave - 1) * 0.4;
    
    if (isBoss) {
        this.type = 'boss';
        this.hp = 500 * scaler;
        this.speed = 1.5;
        this.radius = 40;
        this.color = '#ef4444';
        this.damage = 20;
        this.sprite = '👹'; // Ogre
    } else {
        const rand = Math.random();
        if (rand < 0.1 && wave > 2) {
            this.type = 'tank';
            this.hp = 60 * scaler;
            this.speed = 0.8;
            this.radius = 20;
            this.color = '#8b5cf6';
            this.damage = 15;
            this.sprite = '🦍'; // Gorilla
        } else if (rand < 0.3 && wave > 3) {
            this.type = 'fast';
            this.hp = 15 * scaler;
            this.speed = 2.5;
            this.radius = 12;
            this.color = '#f59e0b';
            this.damage = 8;
            this.sprite = '🦇'; // Bat
        } else {
            this.type = 'basic';
            this.hp = 20 * scaler;
            this.speed = 1.2;
            this.radius = 14;
            this.color = '#dc2626';
            this.damage = 10;
            this.sprite = '🧟'; // Zombie
        }
    }
    this.maxHp = this.hp;
  }
}

// Stationary or Moving Areas (Molotov, Forcefield)
class Zone {
    x: number; y: number; radius: number; damage: number; duration: number;
    color: string; tickRate: number; timer: number = 0;
    isMobile: boolean; slowEffect: number;
    
    constructor(x: number, y: number, r: number, dmg: number, dur: number, color: string, tick: number, mobile = false, slow = 0) {
        this.x = x; this.y = y; this.radius = r; this.damage = dmg;
        this.duration = dur; this.color = color; this.tickRate = tick;
        this.isMobile = mobile; this.slowEffect = slow;
    }
}

class Projectile {
    x: number; y: number; vx: number; vy: number;
    damage: number; radius: number; life: number;
    type: 'normal'|'explosive'|'bounce'|'pierce'|'boomerang'|'orbit'|'homing';
    hitList: Enemy[] = [];
    sprite?: string;
    
    // Logic flags
    gravity: number = 0;
    bouncesLeft: number = 0;
    pierceLeft: number = 0;
    isReturning: boolean = false; // Boomerang
    aoeRadius: number = 0; // Explosive
    owner: {x:number, y:number} | null = null; // For orbit/boomerang
    angle: number = 0; // For orbit
    orbitRadius: number = 0;
    target: Enemy | null = null; // Homing

    constructor(x: number, y: number, vx: number, vy: number, damage: number, life: number, type: string) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.damage = damage; this.life = life;
        this.type = type as any;
        this.radius = 6;
    }
}

class Beam {
    startX: number; startY: number; endX: number; endY: number;
    width: number; color: string; life: number; maxLife: number;
    constructor(sx: number, sy: number, ex: number, ey: number, color: string, w: number, life: number) {
        this.startX = sx; this.startY = sy;
        this.endX = ex; this.endY = ey;
        this.color = color;
        this.width = w;
        this.life = life;
        this.maxLife = life;
    }
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId: number = 0;
  
  private running = false;
  private paused = false;
  private wave = 1;
  private waveTimer = 0;
  private time = 0;
  
  private player = { 
      x: 0, y: 0, hp: 100, maxHp: 100, xp: 0, xpToLevel: 100, 
      level: 1, radius: 16, invuln: 0, sprite: '🧙‍♂️', facing: 1 
  };
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private zones: Zone[] = [];
  private beams: Beam[] = [];
  private particles: Particle[] = [];
  private texts: FloatingText[] = [];
  private drops: {x: number, y: number, type: 'xp'|'coin', value: number}[] = [];
  
  private powerups: Map<string, PlayerPowerup> = new Map();
  private persistentData: PersistentData;
  private sessionCoins = 0;
  private kills = 0;
  
  // Sprite Cache (Supports Image or Canvas(for Emojis))
  private spriteCache: Record<string, HTMLCanvasElement | HTMLImageElement> = {};

  // Timers for weapons that have complex intervals (like Guardian)
  private weaponTimers: Record<string, number> = {};

  public onStateUpdate: (stats: any) => void = () => {};
  public onLevelUp: (options: string[]) => void = () => {};
  public onGameOver: (stats: any) => void = () => {};
  public onWaveComplete: (wave: number) => void = () => {};

  public input: InputState = { dx: 0, dy: 0, isActive: false };

  constructor(canvas: HTMLCanvasElement, savedData: PersistentData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.persistentData = savedData;
    this.loadSprites();
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  // --- SPRITE SYSTEM ---
  private loadSprites() {
      // ---------------------------------------------------------
      // PASTE YOUR IMAGE URLS HERE
      // Example: '🧙‍♂️': 'https://example.com/my-wizard.png',
      // ---------------------------------------------------------
      const CUSTOM_SPRITES: Record<string, string> = {
          // --- CHARACTER ---
          '🧙‍♂️': '', // Player

          // --- ENEMIES ---
          '🧟': '', // Zombie (Basic)
          '🦇': '', // Bat (Fast)
          '🦍': '', // Gorilla (Tank)
          '👹': '', // Ogre (Boss)

          // --- DROPS ---
          '💎': '', // XP Gem
          '💰': '', // Coin

          // --- WEAPONS ---
          '🔫': '', // Pistol
          '🤠': '', // Magnum
          '🚀': '', // RPG
          '🦈': '', // Sharkmaw (RPG Evolved)
          '⚡': '', // Lightning (No sprite usually, beam)
          '🔩': '', // Drill
          '🏹': '', // Whistling Arrow
          '🍾': '', // Molotov
          '🛢️': '', // Fuel Barrel
          '⚽': '', // Soccer Ball
          '⚛️': '', // Quantum Ball
          '🪃': '', // Boomerang
          '🎯': '', // Magnetic Dart
          '🥝': '', // Durian
          '⛓️': '', // Caltrops
          '🛡️': '', // Guardian
          '🔰': '', // Defender
          '🛸': '', // Drones
          '👾': '', // Destroyer
      };

      // 1. Load Custom Images
      Object.entries(CUSTOM_SPRITES).forEach(([key, url]) => {
          if (url && url.length > 0) {
              const img = new Image();
              img.src = url;
              img.onload = () => {
                  this.spriteCache[key] = img;
              };
          }
      });

      // 2. Generate Fallback Emojis (Will be used if no URL is provided above)
      const assets = [
          '🧙‍♂️', '🧟', '🦇', '🦍', '👹',
          '💎', '💰',
          '🔫', '🤠', '🚀', '🦈', '🔩', '🏹', '🍾', '🛢️', '⚽', '⚛️', '🪃', '🎯', '🥝', '⛓️', '🛡️', '🔰', '🛸', '👾'
      ];

      assets.forEach(emoji => {
          // Only create emoji sprite if we don't have a custom image loaded yet
          // Note: Since image loading is async, we create the emoji first as a placeholder.
          // The image will overwrite it in the cache when it finishes loading.
          if (!this.spriteCache[emoji]) {
              this.spriteCache[emoji] = this.createEmojiSprite(emoji, 64);
          }
      });
  }

  private createEmojiSprite(emoji: string, size: number): HTMLCanvasElement {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d')!;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${size*0.8}px sans-serif`;
      ctx.fillText(emoji, size/2, size/2 + size*0.05);
      return c;
  }
  // ----------------------

  private resize = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  public cleanup() {
    window.removeEventListener('resize', this.resize);
    cancelAnimationFrame(this.rafId);
    this.running = false;
  }

  public start() {
    this.reset();
    this.running = true;
    
    // STARTING EQUIPMENT (Auto-equip Pistol)
    this.upgradePowerup('pistol');
    
    // TRIGGER INITIAL SELECTION - REMOVED
    // const allKeys = Object.keys(POWERUPS);
    // const starters = allKeys.filter(k => !POWERUPS[k].isEvolved);
    // const choices = starters.sort(() => 0.5 - Math.random()).slice(0, 5);
    // this.onLevelUp(choices);
    // this.paused = true;
    
    this.draw(); 
    this.loop();
  }

  public pause(isPaused: boolean) {
    this.paused = isPaused;
  }

  public upgradePowerup(id: string) {
    const def = POWERUPS[id];

    if (!this.powerups.has(id)) {
        this.powerups.set(id, { id, level: 1, stats: JSON.parse(JSON.stringify(def.stats)) });
    } else {
        const p = this.powerups.get(id)!;
        
        // EVOLUTION CHECK
        if (p.level >= def.maxLevel && def.evolvedForm) {
            const newId = def.evolvedForm;
            const newDef = POWERUPS[newId];
            this.powerups.delete(id);
            this.powerups.set(newId, { id: newId, level: 1, stats: JSON.parse(JSON.stringify(newDef.stats)) });
            
            this.texts.push(new FloatingText(this.player.x, this.player.y - 30, "EVOLUTION!", "#FFD700"));
            soundManager.play('levelup');
        } else {
            if (p.level < def.maxLevel) {
                p.level++;
                def.onUpgrade(p.stats, p.level);
            }
        }
    }
    this.recalcStats();
    this.paused = false;
  }

  private reset() {
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    this.player.xp = 0;
    this.player.level = 1;
    this.player.xpToLevel = CONFIG.BASE_XP_TO_LEVEL;
    
    const maxHp = CONFIG.PLAYER_BASE_HP + (this.persistentData.upgrades.maxHp * 25);
    this.player.maxHp = maxHp;
    this.player.hp = maxHp;

    this.sessionCoins = 0;
    this.kills = 0;
    this.wave = 1;
    this.waveTimer = 0;
    this.time = 0;
    
    this.enemies = [];
    this.projectiles = [];
    this.zones = [];
    this.beams = [];
    this.drops = [];
    this.particles = [];
    this.texts = [];
    this.powerups.clear();
    this.weaponTimers = {};
  }

  private recalcStats() {
      let hpBonus = this.persistentData.upgrades.maxHp * 25;
      if (this.powerups.has('fitnessGuide')) hpBonus += this.powerups.get('fitnessGuide')!.stats.hpBonus;
      
      const oldMax = this.player.maxHp;
      this.player.maxHp = CONFIG.PLAYER_BASE_HP + hpBonus;
      if (this.player.maxHp > oldMax) {
          this.player.hp += (this.player.maxHp - oldMax);
      }
  }

  private loop = () => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);
    if (this.paused) return;
    this.update();
    this.draw();
  }

  private update() {
    this.time++;
    this.waveTimer++;

    // Global Stats modifiers
    let cdr = 1.0;
    if (this.powerups.has('energyCube')) cdr *= this.powerups.get('energyCube')!.stats.cooldownMod;
    
    let rangeMod = 1.0;
    let sizeMod = 1.0;
    if (this.powerups.has('heFuel')) {
        const s = this.powerups.get('heFuel')!.stats;
        rangeMod = s.rangeMod;
        sizeMod = s.sizeMod;
    }

    let projSpeedMod = 1.0;
    if (this.powerups.has('ammoThruster')) projSpeedMod *= this.powerups.get('ammoThruster')!.stats.speedMod;
    
    let durationMod = 1.0;
    if (this.powerups.has('exoBracer')) durationMod *= this.powerups.get('exoBracer')!.stats.durationMod;

    // Passive Regen
    if (this.time % 300 === 0 && this.powerups.has('energyDrink')) {
        const regen = this.powerups.get('energyDrink')!.stats.regen;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + regen);
        this.texts.push(new FloatingText(this.player.x, this.player.y - 10, `+${regen}`, '#0f0'));
    }

    // --- WAVE LOGIC ---
    if (this.waveTimer > CONFIG.WAVE_DURATION) {
        this.wave++;
        this.waveTimer = 0;
        this.onWaveComplete(this.wave);
        if (this.wave % 5 === 0) {
             this.enemies.push(new Enemy(this.canvas.width, this.canvas.height, this.wave, true));
             soundManager.play('boss');
        }
    }
    const spawnInterval = Math.max(15, 50 - ((this.wave - 1) * 3));
    const spawnBatch = 1 + Math.floor((this.wave - 1) / 2);
    if (this.time % spawnInterval === 0) {
        for(let i=0; i<spawnBatch; i++) this.enemies.push(new Enemy(this.canvas.width, this.canvas.height, this.wave));
    }

    // --- PLAYER MOVEMENT ---
    let speed = CONFIG.PLAYER_SPEED;
    if (this.powerups.has('sportsShoes')) speed *= this.powerups.get('sportsShoes')!.stats.moveSpeedMod;

    if (this.input.isActive) {
        this.player.x += this.input.dx * speed;
        this.player.y += this.input.dy * speed;
        this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
        this.player.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.y));
        
        if (this.input.dx !== 0) {
            this.player.facing = this.input.dx > 0 ? 1 : -1;
        }
    }

    // --- WEAPON FIRING LOGIC ---
    let dmgGlobal = 1 + (this.persistentData.upgrades.damage * 0.15); 

    this.powerups.forEach(p => {
        const def = POWERUPS[p.id];
        if (def.type !== 'weapon') return;

        const s = p.stats;
        const cooldown = Math.max(5, Math.floor(s.cooldown * cdr));
        
        if (!this.weaponTimers[p.id]) this.weaponTimers[p.id] = 0;
        this.weaponTimers[p.id]++;

        if (this.weaponTimers[p.id] >= cooldown) {
            let fired = false;

            // 12. Pistol / Magnum (Starter)
            if (p.id === 'pistol' || p.id === 'magnum') {
                 const count = s.count;
                 const targets = getNearestEnemies(this.player, this.enemies, 1);
                 
                 if(targets.length > 0) {
                     const t = targets[0];
                     const angle = Math.atan2(t.y - this.player.y, t.x - this.player.x);
                     
                     for(let i=0; i<count; i++) {
                         // Slight spread if multiple
                         const spread = count > 1 ? (i - (count-1)/2) * 0.1 : 0;
                         const finalAngle = angle + spread;
                         
                         const type = (s.pierce && s.pierce > 1) ? 'pierce' : 'normal';
                         const proj = new Projectile(this.player.x, this.player.y, Math.cos(finalAngle)*s.speed*projSpeedMod, Math.sin(finalAngle)*s.speed*projSpeedMod, s.damage*dmgGlobal, 60, type);
                         proj.radius = 5;
                         proj.sprite = def.sprite;
                         if (s.pierce) proj.pierceLeft = s.pierce;
                         this.projectiles.push(proj);
                     }
                     fired = true;
                 }
            }

            // 1. RPG & Sharkmaw
            else if (p.id === 'rpg' || p.id === 'sharkmawGun') {
                const targets = getNearestEnemies(this.player, this.enemies, s.count);
                targets.forEach(t => {
                    const angle = Math.atan2(t.y - this.player.y, t.x - this.player.x);
                    const proj = new Projectile(this.player.x, this.player.y, Math.cos(angle)*s.speed*projSpeedMod, Math.sin(angle)*s.speed*projSpeedMod, s.damage*dmgGlobal, 100, 'explosive');
                    proj.aoeRadius = s.area * sizeMod;
                    proj.radius = 8;
                    proj.sprite = def.sprite;
                    this.projectiles.push(proj);
                });
                if(targets.length > 0) fired = true;
            }

            // 2. Lightning
            else if (p.id === 'lightning' || p.id === 'supercell') {
                for(let i=0; i<s.count; i++) {
                    const t = getRandomEnemy(this.enemies);
                    if (t) {
                        t.hp -= s.damage * dmgGlobal;
                        this.texts.push(new FloatingText(t.x, t.y - 20, Math.floor(s.damage*dmgGlobal).toString(), '#ffeb3b'));
                        this.beams.push(new Beam(t.x, t.y - 100, t.x, t.y, '#ffeb3b', 4, 15));
                        fired = true;
                    }
                }
            }

            // 3. Drill / Whistling
            else if (p.id === 'drill' || p.id === 'whistlingArrow') {
                 const isHoming = !!s.homing;
                 const count = s.count;
                 for(let i=0; i<count; i++) {
                     let angle = Math.random() * Math.PI * 2;
                     if(isHoming) {
                         const t = getRandomEnemy(this.enemies);
                         if(t) angle = Math.atan2(t.y - this.player.y, t.x - this.player.x);
                     } else {
                         if (this.input.isActive) angle = Math.atan2(this.input.dy, this.input.dx);
                     }
                     
                     const proj = new Projectile(this.player.x, this.player.y, Math.cos(angle)*s.speed*projSpeedMod, Math.sin(angle)*s.speed*projSpeedMod, s.damage*dmgGlobal, s.duration*durationMod, isHoming ? 'homing' : 'pierce');
                     proj.radius = 4;
                     proj.pierceLeft = 999;
                     proj.sprite = def.sprite;
                     if(isHoming) proj.target = getRandomEnemy(this.enemies);
                     this.projectiles.push(proj);
                     fired = true;
                 }
            }

            // 4. Molotov / Fuel Barrel
            else if (p.id === 'molotov' || p.id === 'fuelBarrel') {
                const count = s.count;
                for(let i=0; i<count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = (Math.random() * 2 + 2) * rangeMod;
                    const proj = new Projectile(this.player.x, this.player.y, Math.cos(angle)*speed, Math.sin(angle)*speed, s.damage*dmgGlobal, 40, 'normal');
                    proj.sprite = def.sprite;
                    const onDeath = (lastX: number, lastY: number) => {
                        this.zones.push(new Zone(lastX, lastY, s.radius * sizeMod, s.damage*dmgGlobal, s.duration*durationMod, p.id==='fuelBarrel'?'#3b82f6':'#f97316', 15));
                    };
                    (proj as any).onDeath = onDeath;
                    this.projectiles.push(proj);
                }
                fired = true;
            }

            // 5. Soccer / Quantum
            else if (p.id === 'soccer' || p.id === 'quantumBall') {
                 const targets = getNearestEnemies(this.player, this.enemies, 1);
                 if (targets.length > 0) {
                     for(let i=0; i<s.count; i++) {
                         const angle = Math.atan2(targets[0].y - this.player.y, targets[0].x - this.player.x) + (i*0.5);
                         const proj = new Projectile(this.player.x, this.player.y, Math.cos(angle)*s.speed*projSpeedMod, Math.sin(angle)*s.speed*projSpeedMod, s.damage*dmgGlobal, 300, 'bounce');
                         proj.bouncesLeft = s.bounces;
                         proj.radius = 10;
                         proj.sprite = def.sprite;
                         this.projectiles.push(proj);
                     }
                     fired = true;
                 }
            }

            // 6. Boomerang / Magnet
            else if (p.id === 'boomerang' || p.id === 'magneticDart') {
                const target = getNearestEnemies(this.player, this.enemies, 1)[0];
                let angle = this.input.isActive ? Math.atan2(this.input.dy, this.input.dx) : 0;
                if(target) angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);

                for(let i=0; i<s.count; i++) {
                    const spread = (i - (s.count-1)/2) * 0.3;
                    const proj = new Projectile(this.player.x, this.player.y, Math.cos(angle+spread)*s.speed*projSpeedMod, Math.sin(angle+spread)*s.speed*projSpeedMod, s.damage*dmgGlobal, s.duration*durationMod, 'boomerang');
                    proj.owner = this.player;
                    proj.radius = 8;
                    proj.pierceLeft = 999;
                    proj.sprite = def.sprite;
                    if(s.homing) proj.type = 'homing';
                    this.projectiles.push(proj);
                }
                fired = true;
            }

            // 7. Durian / Caltrop
            else if (p.id === 'durian' || p.id === 'caltrops') {
                const durianCount = this.projectiles.filter(pr => (pr as any).sourceId === p.id).length;
                if(durianCount < s.count) {
                    const angle = Math.random() * Math.PI * 2;
                    const proj = new Projectile(this.player.x, this.player.y, Math.cos(angle)*s.speed*projSpeedMod, Math.sin(angle)*s.speed*projSpeedMod, s.damage*dmgGlobal, s.duration*durationMod, 'pierce');
                    proj.radius = s.size * sizeMod;
                    proj.pierceLeft = 9999;
                    proj.sprite = def.sprite;
                    (proj as any).sourceId = p.id;
                    this.projectiles.push(proj);
                    fired = true;
                }
            }

            // 8. Guardian / Defender
            else if (p.id === 'guardian' || p.id === 'defender') {
                 const active = this.projectiles.filter(pr => (pr as any).sourceId === p.id);
                 if (active.length === 0) {
                     for(let i=0; i<s.count; i++) {
                         const proj = new Projectile(this.player.x, this.player.y, 0, 0, s.damage*dmgGlobal, s.duration*durationMod, 'orbit');
                         proj.radius = 12;
                         proj.orbitRadius = s.radius * rangeMod;
                         proj.angle = (Math.PI*2 / s.count) * i;
                         proj.owner = this.player;
                         proj.pierceLeft = 9999;
                         proj.sprite = def.sprite;
                         (proj as any).rotSpeed = s.speed;
                         (proj as any).sourceId = p.id;
                         this.projectiles.push(proj);
                     }
                     fired = true;
                 }
            }
            
            // 9. Forcefield
            else if (p.id === 'forcefield' || p.id === 'pressureForcefield') {
                const existing = this.zones.find(z => (z as any).sourceId === p.id);
                if (!existing) {
                    const z = new Zone(this.player.x, this.player.y, s.radius*sizeMod, s.damage*dmgGlobal, 999999, p.id==='forcefield'?'rgba(0,255,255,0.2)':'rgba(244,114,182,0.3)', s.tickRate, true, s.slow);
                    (z as any).sourceId = p.id;
                    this.zones.push(z);
                    fired = true;
                } else {
                    existing.radius = s.radius * sizeMod;
                    existing.damage = s.damage * dmgGlobal;
                    existing.slowEffect = s.slow;
                }
            }

            // 10. Laser
            else if (p.id === 'laser' || p.id === 'deathRay') {
                 const count = s.count;
                 const targets = getNearestEnemies(this.player, this.enemies, count);
                 
                 for(let i=0; i<targets.length; i++) {
                     const t = targets[i];
                     const angle = Math.atan2(t.y - this.player.y, t.x - this.player.x);
                     const len = 400 * rangeMod;
                     const ex = this.player.x + Math.cos(angle) * len;
                     const ey = this.player.y + Math.sin(angle) * len;
                     
                     const beam = new Beam(this.player.x, this.player.y, ex, ey, p.id==='deathRay'?'#f00':'#0ff', s.thickness || 5, s.duration);
                     this.beams.push(beam);
                     
                     this.enemies.forEach(e => {
                         const dx = ex - this.player.x;
                         const dy = ey - this.player.y;
                         const tVal = ((e.x - this.player.x) * dx + (e.y - this.player.y) * dy) / (dx*dx + dy*dy);
                         const tClamped = Math.max(0, Math.min(1, tVal));
                         const closestX = this.player.x + tClamped * dx;
                         const closestY = this.player.y + tClamped * dy;
                         const dist = Math.hypot(e.x - closestX, e.y - closestY);
                         if(dist < (s.thickness || 10) + e.radius) {
                             e.hp -= s.damage * dmgGlobal;
                             this.texts.push(new FloatingText(e.x, e.y, Math.floor(s.damage*dmgGlobal).toString(), '#fff'));
                         }
                     });
                 }
                 if(targets.length > 0) fired = true;
            }

            // 11. Drones
            else if (p.id === 'drones' || p.id === 'destroyer') {
                 const count = s.count;
                 const targets = getNearestEnemies(this.player, this.enemies, count);
                 targets.forEach(t => {
                     const angle = Math.atan2(t.y - this.player.y, t.x - this.player.x);
                     const type = s.rocket ? 'explosive' : 'normal';
                     const proj = new Projectile(this.player.x, this.player.y, Math.cos(angle)*10, Math.sin(angle)*10, s.damage*dmgGlobal, 60, type);
                     proj.radius = 4;
                     proj.sprite = def.sprite;
                     if(s.rocket) { proj.aoeRadius = 30 * sizeMod; }
                     this.projectiles.push(proj);
                 });
                 if(targets.length>0) fired = true;
            }

            if (fired) {
                this.weaponTimers[p.id] = 0;
            }
        }
    });

    // --- PROJECTILES UPDATE ---
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        
        // Physics per type
        if (p.type === 'normal' || p.type === 'explosive' || p.type === 'pierce' || p.type === 'bounce') {
            p.x += p.vx; 
            p.y += p.vy;
            p.vy += p.gravity;
        } 
        else if (p.type === 'boomerang') {
            if (p.isReturning && p.owner) {
                const dx = p.owner.x - p.x;
                const dy = p.owner.y - p.y;
                const dist = Math.hypot(dx, dy);
                const speed = Math.hypot(p.vx, p.vy);
                p.vx = (dx/dist) * speed;
                p.vy = (dy/dist) * speed;
                if (dist < 20) p.life = 0;
            } else {
                p.x += p.vx; 
                p.y += p.vy;
                p.life--;
                if(p.life < 20) p.isReturning = true;
            }
            p.x += p.vx; p.y += p.vy;
        }
        else if (p.type === 'orbit') {
            if(p.owner) {
                p.angle += (p as any).rotSpeed;
                p.x = p.owner.x + Math.cos(p.angle) * p.orbitRadius;
                p.y = p.owner.y + Math.sin(p.angle) * p.orbitRadius;
            }
            p.life--;
        }
        else if (p.type === 'homing') {
            if (p.target && p.target.hp > 0) {
                const dx = p.target.x - p.x;
                const dy = p.target.y - p.y;
                const dist = Math.hypot(dx, dy);
                const speed = 10;
                p.vx = (dx/dist) * speed;
                p.vy = (dy/dist) * speed;
            }
            p.x += p.vx; p.y += p.vy;
            p.life--;
        }

        if (p.type !== 'boomerang' && p.type !== 'orbit') {
            if (p.x < -100 || p.x > this.canvas.width + 100 || p.y < -100 || p.y > this.canvas.height + 100) {
                p.life = 0;
            }
        }

        if (p.life > 0) {
            let hit = false;
            for (const e of this.enemies) {
                if (p.hitList.includes(e)) continue;
                
                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                if (dist < e.radius + p.radius) {
                    hit = true;
                    e.hp -= p.damage;
                    this.texts.push(new FloatingText(e.x, e.y, Math.floor(p.damage).toString(), '#fff'));
                    p.hitList.push(e);

                    if (p.type === 'explosive') {
                        this.enemies.forEach(subE => {
                            if(subE === e) return;
                            if(Math.hypot(subE.x - p.x, subE.y - p.y) < p.aoeRadius) {
                                subE.hp -= p.damage;
                            }
                        });
                        for(let k=0;k<5;k++) this.particles.push(new Particle(p.x, p.y, '#f00', 4));
                        p.life = 0; 
                    }
                    else if (p.type === 'bounce') {
                        if (p.bouncesLeft > 0) {
                            p.bouncesLeft--;
                            const newT = getNearestEnemies({x: p.x, y: p.y}, this.enemies.filter(en => en !== e), 1)[0];
                            if(newT) {
                                const ang = Math.atan2(newT.y - p.y, newT.x - p.x);
                                const spd = Math.hypot(p.vx, p.vy);
                                p.vx = Math.cos(ang) * spd;
                                p.vy = Math.sin(ang) * spd;
                                p.hitList = []; 
                            } else {
                                p.vx = -p.vx; p.vy = -p.vy;
                            }
                        } else {
                            p.life = 0;
                        }
                    }
                    else if (p.type === 'pierce' || p.type === 'boomerang' || p.type === 'orbit' || p.type === 'homing') {
                        p.pierceLeft--;
                        if(p.pierceLeft <= 0) p.life = 0;
                    } 
                    else {
                        p.life = 0;
                    }
                    
                    break; 
                }
            }
            if (hit && (p as any).onDeath && p.life <= 0) {
                (p as any).onDeath(p.x, p.y);
            }
        }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);

    // --- ZONES UPDATE ---
    for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        if (z.isMobile) { z.x = this.player.x; z.y = this.player.y; }
        z.duration--;
        z.timer++;
        
        if (z.timer >= z.tickRate) {
            z.timer = 0;
            this.enemies.forEach(e => {
                if(Math.hypot(e.x - z.x, e.y - z.y) < z.radius + e.radius) {
                    e.hp -= z.damage;
                    if(z.slowEffect > 0) e.isSlowed = true;
                    if(Math.random() > 0.7) this.texts.push(new FloatingText(e.x, e.y, Math.floor(z.damage).toString(), z.color));
                }
            });
        }
        if (z.duration <= 0) this.zones.splice(i, 1);
    }

    // --- BEAMS UPDATE ---
    for (let i = this.beams.length - 1; i >= 0; i--) {
        this.beams[i].life--;
        if (this.beams[i].life <= 0) this.beams.splice(i, 1);
    }

    // --- ENEMIES UPDATE ---
    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.hp <= 0) {
            this.kills++;
            this.drops.push({x: e.x, y: e.y, type: 'xp', value: e.type === 'boss' ? 50 : 10});
            if (Math.random() > 0.8 || e.type === 'boss') {
                this.drops.push({x: e.x + 5, y: e.y, type: 'coin', value: e.type === 'boss' ? 50 : 1});
            }
            for(let k=0;k<5;k++) this.particles.push(new Particle(e.x, e.y, e.color));
            this.enemies.splice(i, 1);
            continue;
        }

        const dx = this.player.x - e.x;
        const dy = this.player.y - e.y;
        const dist = Math.hypot(dx, dy);
        
        let moveSpeed = e.speed;
        if (e.isSlowed) moveSpeed *= 0.5;
        e.isSlowed = false; // Reset for next frame

        if (dist > 0) {
            e.x += (dx/dist) * moveSpeed;
            e.y += (dy/dist) * moveSpeed;
        }

        if (dist < e.radius + this.player.radius && this.player.invuln <= 0) {
            const defense = this.persistentData.upgrades.defense * 0.05;
            const dmg = Math.max(1, e.damage * (1 - defense));
            this.player.hp -= dmg;
            this.player.invuln = 30;
            this.texts.push(new FloatingText(this.player.x, this.player.y, `-${Math.floor(dmg)}`, '#ff0000'));
            soundManager.play('hit');
            
            if (this.player.hp <= 0) {
                this.running = false;
                soundManager.play('death');
                this.onGameOver({
                    time: this.time,
                    kills: this.kills,
                    coins: this.sessionCoins,
                    level: this.player.level,
                    wave: this.wave
                });
            }
        }
    }
    
    if (this.player.invuln > 0) this.player.invuln--;

    // --- DROPS ---
    let pickupRange = 40;
    if (this.powerups.has('magnet')) pickupRange += this.powerups.get('magnet')!.stats.pickupRange;
    
    for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i];
        const dist = Math.hypot(d.x - this.player.x, d.y - this.player.y);
        
        if (dist < pickupRange + 60) {
            d.x += (this.player.x - d.x) * 0.15;
            d.y += (this.player.y - d.y) * 0.15;
            
            if (dist < this.player.radius + 10) {
                if (d.type === 'xp') {
                    this.player.xp += d.value;
                    soundManager.play('xp');
                    if (this.player.xp >= this.player.xpToLevel) {
                        this.player.xp -= this.player.xpToLevel;
                        this.player.level++;
                        this.player.xpToLevel = Math.floor(this.player.xpToLevel * CONFIG.XP_SCALE);
                        this.paused = true;
                        
                        const allKeys = Object.keys(POWERUPS);
                        const available = allKeys.filter(k => {
                            const def = POWERUPS[k];
                            // Don't show evolved directly
                            if (def.isEvolved) return false;
                            
                            const owned = this.powerups.get(k);
                            // New item
                            if (!owned) return true;
                            // Upgrade existing
                            if (owned.level < def.maxLevel) return true;
                            
                            // Check Evolution availability (no requirement)
                            if (owned.level === def.maxLevel && def.evolvedForm) {
                                return true;
                            }
                            return false;
                        });
                        
                        const weightedOptions = available.map(k => ({
                            key: k,
                            weight: this.powerups.has(k) ? 10 : 1 // Owned = 10x weight
                        }));

                        const choices: string[] = [];
                        while(choices.length < 4 && weightedOptions.length > 0) {
                           const totalWeight = weightedOptions.reduce((a,b) => a + b.weight, 0);
                           let random = Math.random() * totalWeight;
                           for(let i=0; i<weightedOptions.length; i++) {
                               random -= weightedOptions[i].weight;
                               if(random <= 0) {
                                   choices.push(weightedOptions[i].key);
                                   weightedOptions.splice(i, 1);
                                   break;
                               }
                           }
                        }
                        
                        this.onLevelUp(choices);
                    }
                } else {
                    this.sessionCoins += d.value;
                    soundManager.play('coin');
                }
                this.drops.splice(i, 1);
            }
        }
    }
    
    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => p.life > 0);
    this.texts.forEach(t => t.update());
    this.texts = this.texts.filter(t => t.life > 0);

    if (this.time % 5 === 0) {
        this.onStateUpdate({
            hp: this.player.hp,
            maxHp: this.player.maxHp,
            xp: this.player.xp,
            xpToLevel: this.player.xpToLevel,
            level: this.player.level,
            coins: this.sessionCoins,
            wave: this.wave,
            time: Math.floor(this.time / 60),
            kills: this.kills
        });
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    const gridSize = 50;
    ctx.beginPath();
    for(let x=0; x<=this.canvas.width; x+=gridSize) { ctx.moveTo(x,0); ctx.lineTo(x,this.canvas.height); }
    for(let y=0; y<=this.canvas.height; y+=gridSize) { ctx.moveTo(0,y); ctx.lineTo(this.canvas.width,y); }
    ctx.stroke();

    // Zones (Floor)
    this.zones.forEach(z => {
        ctx.fillStyle = z.color;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    });

    // Drops
    this.drops.forEach(d => {
        const sprite = d.type === 'xp' ? this.spriteCache['💎'] : this.spriteCache['💰'];
        if (sprite) {
            ctx.drawImage(sprite, d.x - 10, d.y - 10, 20, 20);
        } else {
            ctx.fillStyle = d.type === 'xp' ? '#3b82f6' : '#fbbf24';
            ctx.beginPath(); ctx.arc(d.x, d.y, 5, 0, Math.PI*2); ctx.fill();
        }
    });

    // Beams
    this.beams.forEach(b => {
        ctx.globalAlpha = b.life / b.maxLife;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.startX, b.startY);
        ctx.lineTo(b.endX, b.endY);
        ctx.stroke();
        ctx.globalAlpha = 1;
    });

    // Player
    ctx.save();
    ctx.shadowBlur = 15; ctx.shadowColor = '#60a5fa';
    if (this.player.invuln > 0) ctx.globalAlpha = 0.5;
    
    const pSprite = this.spriteCache[this.player.sprite];
    if (pSprite) {
        ctx.translate(this.player.x, this.player.y);
        ctx.scale(this.player.facing, 1); // Flip based on movement
        ctx.drawImage(pSprite, -24, -24, 48, 48); // Draw centered
    } else {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath(); ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Enemies
    this.enemies.forEach(e => {
        const eSprite = this.spriteCache[e.sprite];
        if (eSprite) {
             const size = e.radius * 2.5;
             ctx.save();
             ctx.translate(e.x, e.y);
             if (e.x < this.player.x) ctx.scale(-1, 1); // Face player
             ctx.drawImage(eSprite, -size/2, -size/2, size, size);
             ctx.restore();
        } else {
            ctx.fillStyle = e.color;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2); ctx.fill();
        }
        
        if(e.hp < e.maxHp) {
            ctx.fillStyle = '#f00';
            ctx.fillRect(e.x - 10, e.y - e.radius - 8, 20 * (e.hp/e.maxHp), 4);
        }
    });

    // Projectiles
    this.projectiles.forEach(p => {
        const sprite = p.sprite ? this.spriteCache[p.sprite] : null;
        if (sprite) {
            ctx.save();
            ctx.translate(p.x, p.y);
            // Rotation logic
            const angle = Math.atan2(p.vy, p.vx);
            ctx.rotate(angle + Math.PI/4); // Adjust for emoji orientation
            
            const size = p.radius * 3;
            ctx.drawImage(sprite, -size/2, -size/2, size, size);
            ctx.restore();
        } else {
            ctx.fillStyle = '#fff';
            if(p.type === 'explosive') ctx.fillStyle = '#f87171';
            if(p.type === 'boomerang') ctx.fillStyle = '#fbbf24';
            if(p.type === 'bounce') ctx.fillStyle = '#fff';
            
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
        }
    });

    this.particles.forEach(p => p.draw(ctx));
    this.texts.forEach(t => t.draw(ctx));
  }
}