export interface GameStats {
  hp: number;
  maxHp: number;
  xp: number;
  xpToLevel: number;
  level: number;
  coins: number;
  wave: number;
  time: number;
  kills: number;
  fps: number;
}

export interface PersistentData {
  lifetimeCoins: number;
  upgrades: {
    damage: number;
    maxHp: number;
    defense: number;
  };
}

export type PowerupType = 'weapon' | 'passive';

export interface PowerupDefinition {
  id: string;
  name: string;
  icon: string;
  type: PowerupType;
  maxLevel: number;
  description: string;
  stats: any;
  evolutionRequires?: string;
  evolvedForm?: string;
  isEvolved?: boolean;
  sprite?: string; // New: Sprite identifier (emoji or url key)
  onUpgrade: (stats: any, level: number) => void;
}

export interface PlayerPowerup {
  id: string;
  level: number;
  stats: any;
}

export interface InputState {
  dx: number;
  dy: number;
  isActive: boolean;
}