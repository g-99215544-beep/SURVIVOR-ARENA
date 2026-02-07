import { PowerupDefinition } from "./types";

export const CONFIG = {
  CANVAS_WIDTH: 900,
  CANVAS_HEIGHT: 650,
  PLAYER_BASE_HP: 100,
  PLAYER_SPEED: 4,
  PLAYER_RADIUS: 16,
  
  // Costs for Shop (Meta progression)
  UPGRADE_COSTS: {
    damage: [100, 250, 500, 1000, 2000],
    maxHp: [150, 300, 600, 1200, 2500],
    defense: [200, 400, 800, 1500, 3000]
  },
  
  // Wave Config
  WAVE_DURATION: 1800, // frames (30s at 60fps)
  BASE_XP_TO_LEVEL: 100,
  XP_SCALE: 1.2,
};

// --- PASSIVES ---
const PASSIVES: Record<string, PowerupDefinition> = {
  heFuel: {
    id: 'heFuel', name: 'HE Fuel', icon: '⛽', type: 'passive', maxLevel: 5,
    description: 'Increases all weapon range and projectile size.',
    stats: { rangeMod: 1.1, sizeMod: 1.1 },
    onUpgrade: (s) => { s.rangeMod += 0.1; s.sizeMod += 0.1; }
  },
  energyCube: {
    id: 'energyCube', name: 'Energy Cube', icon: '🧊', type: 'passive', maxLevel: 5,
    description: 'Reduces weapon cooldowns.',
    stats: { cooldownMod: 0.9 },
    onUpgrade: (s) => { s.cooldownMod -= 0.08; }
  },
  ammoThruster: {
    id: 'ammoThruster', name: 'Ammo Thruster', icon: '🚀', type: 'passive', maxLevel: 5,
    description: 'Increases projectile flight speed.',
    stats: { speedMod: 1.1 },
    onUpgrade: (s) => { s.speedMod += 0.1; }
  },
  fitnessGuide: {
    id: 'fitnessGuide', name: 'Fitness Guide', icon: '📘', type: 'passive', maxLevel: 5,
    description: 'Increases Max HP.',
    stats: { hpBonus: 20 },
    onUpgrade: (s) => { s.hpBonus += 20; }
  },
  sportsShoes: {
    id: 'sportsShoes', name: 'Sports Shoes', icon: '👟', type: 'passive', maxLevel: 5,
    description: 'Increases Movement Speed.',
    stats: { moveSpeedMod: 1.1 },
    onUpgrade: (s) => { s.moveSpeedMod += 0.1; }
  },
  magnet: {
    id: 'magnet', name: 'Magnet', icon: '🧲', type: 'passive', maxLevel: 5,
    description: 'Increases item pickup range.',
    stats: { pickupRange: 30 },
    onUpgrade: (s) => { s.pickupRange += 20; }
  },
  exoBracer: {
    id: 'exoBracer', name: 'Exo Bracer', icon: '🦾', type: 'passive', maxLevel: 5,
    description: 'Increases duration of effects.',
    stats: { durationMod: 1.1 },
    onUpgrade: (s) => { s.durationMod += 0.1; }
  },
  energyDrink: {
    id: 'energyDrink', name: 'Energy Drink', icon: '🥤', type: 'passive', maxLevel: 5,
    description: 'Regenerates HP over time.',
    stats: { regen: 1 }, // HP per 5 seconds
    onUpgrade: (s) => { s.regen += 1; }
  },
};

// --- WEAPONS ---
const WEAPONS: Record<string, PowerupDefinition> = {
  // 0. Starting Pistol (Magic Missile style)
  pistol: {
    id: 'pistol', name: 'Pistol', icon: '🔫', type: 'weapon', maxLevel: 5,
    description: 'Fires rounds at nearest enemy.',
    stats: { damage: 15, cooldown: 40, count: 1, speed: 12, pierce: 1 },
    evolvedForm: 'magnum',
    sprite: '🔫',
    onUpgrade: (s, l) => { s.damage += 5; if(l===3) s.count++; if(l===5) s.pierce += 1; }
  },
  magnum: {
    id: 'magnum', name: 'Magnum', icon: '🤠', type: 'weapon', maxLevel: 1, isEvolved: true,
    description: 'High caliber rounds that pierce enemies.',
    stats: { damage: 45, cooldown: 35, count: 2, speed: 18, pierce: 3 },
    sprite: '🤠',
    onUpgrade: () => {}
  },

  // 1. RPG
  rpg: {
    id: 'rpg', name: 'RPG', icon: '🚀', type: 'weapon', maxLevel: 5,
    description: 'Fires rockets that explode on impact.',
    stats: { damage: 30, cooldown: 60, count: 1, speed: 7, area: 40 },
    evolvedForm: 'sharkmawGun',
    sprite: '🚀',
    onUpgrade: (s, l) => { s.damage += 10; if(l===3) s.count++; if(l===5) s.area += 20; }
  },
  sharkmawGun: {
    id: 'sharkmawGun', name: 'Sharkmaw Gun', icon: '🦈', type: 'weapon', maxLevel: 1, isEvolved: true,
    description: 'Huge AoE rockets, very high boss damage.',
    stats: { damage: 80, cooldown: 40, count: 2, speed: 9, area: 80 },
    sprite: '🦈',
    onUpgrade: () => {}
  },

  // 2. Lightning Emitter
  lightning: {
    id: 'lightning', name: 'Lightning Emitter', icon: '⚡', type: 'weapon', maxLevel: 5,
    description: 'Lightning strikes random enemies.',
    stats: { damage: 15, cooldown: 45, count: 2 },
    evolvedForm: 'supercell',
    onUpgrade: (s, l) => { s.damage += 5; s.count += 1; if(l===5) s.cooldown -= 5; }
  },
  supercell: {
    id: 'supercell', name: 'Supercell', icon: '🌩️', type: 'weapon', maxLevel: 1, isEvolved: true,
    description: 'Continuous lightning storms, high DPS.',
    stats: { damage: 35, cooldown: 20, count: 6 },
    onUpgrade: () => {}
  },

  // 3. Drill Shot
  drill: {
    id: 'drill', name: 'Drill Shot', icon: '🔩', type: 'weapon', maxLevel: 5,
    description: 'Drill projectile penetrates enemies.',
    stats: { damage: 10, cooldown: 50, count: 1, speed: 6, duration: 120 },
    evolvedForm: 'whistlingArrow',
    sprite: '🔩',
    onUpgrade: (s, l) => { s.damage += 5; if(l===3) s.count++; if(l===5) s.speed += 2; }
  },
  whistlingArrow: {
    id: 'whistlingArrow', name: 'Whistling Arrow', icon: '🏹', type: 'weapon', maxLevel: 1, isEvolved: true,
    description: 'Homing arrows, strong boss damage.',
    stats: { damage: 25, cooldown: 40, count: 2, speed: 12, duration: 200, homing: true },
    sprite: '🏹',
    onUpgrade: () => {}
  },

  // 4. Molotov
  molotov: {
    id: 'molotov', name: 'Molotov', icon: '🍾', type: 'weapon', maxLevel: 5,
    description: 'Drops fire patches.',
    stats: { damage: 5, cooldown: 60, count: 1, speed: 5, duration: 180, radius: 40 },
    evolvedForm: 'fuelBarrel',
    sprite: '🍾',
    onUpgrade: (s, l) => { s.damage += 2; if(l===3) s.count++; if(l===5) s.radius += 15; }
  },
  fuelBarrel: {
    id: 'fuelBarrel', name: 'Fuel Barrel', icon: '🛢️', type: 'weapon', maxLevel: 1, isEvolved: true,
    description: 'Massive burn zones, strong wave clear.',
    stats: { damage: 12, cooldown: 40, count: 3, speed: 6, duration: 300, radius: 60, color: '#3b82f6' },
    sprite: '🛢️',
    onUpgrade: () => {}
  },

  // 5. Soccer Ball
  soccer: {
    id: 'soccer', name: 'Soccer Ball', icon: '⚽', type: 'weapon', maxLevel: 5,
    description: 'Bouncing ball hits enemies.',
    stats: { damage: 20, cooldown: 50, count: 1, speed: 8, bounces: 3 },
    evolvedForm: 'quantumBall',
    sprite: '⚽',
    onUpgrade: (s, l) => { s.damage += 5; if(l===3) s.count++; if(l===5) s.bounces += 2; }
  },
  quantumBall: {
    id: 'quantumBall', name: 'Quantum Ball', icon: '⚛️', type: 'weapon', maxLevel: 1, isEvolved: true,
    description: 'Rapid ricochet attacks.',
    stats: { damage: 45, cooldown: 40, count: 3, speed: 14, bounces: 10 },
    sprite: '⚛️',
    onUpgrade: () => {}
  },

  // 6. Boomerang
  boomerang: {
    id: 'boomerang', name: 'Boomerang', icon: '🪃', type: 'weapon', maxLevel: 5,
    description: 'Travels out and comes back.',
    stats: { damage: 15, cooldown: 45, count: 1, speed: 7, duration: 120 },
    evolvedForm: 'magneticDart',
    sprite: '🪃',
    onUpgrade: (s, l) => { s.damage += 5; if(l===3) s.count++; if(l===5) s.pierce = 99; }
  },
  magneticDart: {
    id: 'magneticDart', name: 'Magnetic Dart', icon: '🎯', type: 'weapon', maxLevel: 1, isEvolved: true,
    description: 'Homing return, multi-hit damage.',
    stats: { damage: 30, cooldown: 30, count: 2, speed: 9, duration: 150, homing: false }, // Logic handled in engine
    sprite: '🎯',
    onUpgrade: () => {}
  },

  // 7. Durian
  durian: {
    id: 'durian', name: 'Durian', icon: '🥝', type: 'weapon', maxLevel: 5,
    description: 'Rolling spiked durian.',
    stats: { damage: 25, cooldown: 80, count: 1, speed: 3, duration: 200, size: 20 },
    evolvedForm: 'caltrops',
    sprite: '🥝',
    onUpgrade: (s, l) => { s.damage += 10; if(l===3) s.size += 10; if(l===5) s.duration += 100; }
  },
  caltrops: {
    id: 'caltrops', name: 'Caltrops', icon: '⛓️', type: 'weapon', maxLevel: 1, isEvolved: true,
    description: 'Persistent spinning spikes AoE.',
    stats: { damage: 50, cooldown: 60, count: 1, speed: 4, duration: 400, size: 40, spike: true },
    sprite: '⛓️',
    onUpgrade: () => {}
  },

  // 8. Guardian
  guardian: {
    id: 'guardian', name: 'Guardian', icon: '🛡️', type: 'weapon', maxLevel: 5,
    description: 'Spinning discs around player.',
    stats: { damage: 8, cooldown: 0, count: 2, speed: 0.05, duration: 180, radius: 60, interval: 300 }, // interval for respawn
    evolvedForm: 'defender',
    sprite: '🛡️',
    onUpgrade: (s, l) => { s.damage += 2; if(l===3) s.count++; if(l===5) s.duration += 60; }
  },
  defender: {
    id: 'defender', name: 'Defender', icon: '🔰', type: 'weapon', maxLevel: 1, isEvolved: true,
    description: 'Permanent rotating shield blocks projectiles.',
    stats: { damage: 15, cooldown: 0, count: 5, speed: 0.08, duration: 9999, radius: 75, interval: 0 },
    sprite: '🔰',
    onUpgrade: () => {}
  },

  // 9. Forcefield
  forcefield: {
    id: 'forcefield', name: 'Forcefield', icon: '⭕', type: 'weapon', maxLevel: 5,
    description: 'Energy aura damages nearby enemies.',
    stats: { damage: 5, radius: 60, tickRate: 20, slow: 0 },
    evolvedForm: 'pressureForcefield',
    onUpgrade: (s, l) => { s.damage += 2; s.radius += 5; if(l===5) s.slow = 0.3; }
  },
  pressureForcefield: {
    id: 'pressureForcefield', name: 'Pressure Forcefield', icon: '🌌', type: 'weapon', maxLevel: 1, isEvolved: true,
    description: 'Large slow zone, high survivability.',
    stats: { damage: 15, radius: 100, tickRate: 10, slow: 0.5, color: '#f472b6' },
    onUpgrade: () => {}
  },

  // 10. Laser Launcher
  laser: {
    id: 'laser', name: 'Laser Launcher', icon: '🔫', type: 'weapon', maxLevel: 5,
    description: 'Fires laser beams.',
    stats: { damage: 20, cooldown: 60, count: 1, duration: 15 },
    evolvedForm: 'deathRay',
    onUpgrade: (s, l) => { s.damage += 5; if(l===3) s.count++; if(l===5) s.duration += 10; }
  },
  deathRay: {
    id: 'deathRay', name: 'Death Ray', icon: '🔦', type: 'weapon', maxLevel: 1, isEvolved: true,
    description: 'Continuous sweeping laser DPS.',
    stats: { damage: 45, cooldown: 30, count: 3, duration: 25, thickness: 20 },
    onUpgrade: () => {}
  },

  // 11. Drones
  drones: {
    id: 'drones', name: 'Drones A+B', icon: '🛸', type: 'weapon', maxLevel: 5,
    description: 'Two drones shoot enemies.',
    stats: { damage: 10, cooldown: 20, count: 1 }, // Count per drone
    evolvedForm: 'destroyer',
    sprite: '🛸',
    onUpgrade: (s, l) => { s.damage += 3; if(l===3) s.cooldown -= 2; if(l===5) s.count++; }
  },
  destroyer: {
    id: 'destroyer', name: 'Destroyer', icon: '👾', type: 'weapon', maxLevel: 1, isEvolved: true,
    description: 'Merged drones with missiles, top DPS.',
    stats: { damage: 40, cooldown: 10, count: 2, rocket: true },
    sprite: '👾',
    onUpgrade: () => {}
  }
};

export const POWERUPS: Record<string, PowerupDefinition> = { ...PASSIVES, ...WEAPONS };