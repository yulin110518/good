export enum GameStatus {
  INTRO = 'INTRO',
  GAME_INFO = 'GAME_INFO',
  STORY = 'STORY',
  DIFFICULTY_SELECT = 'DIFFICULTY_SELECT',
  PLAYING = 'PLAYING',
  ROUND_END = 'ROUND_END',
  WON = 'WON',
  LOST = 'LOST'
}

export enum Difficulty {
  EASY = 'EASY',
  HARD = 'HARD',
  HELL = 'HELL'
}

export interface Point {
  x: number;
  y: number;
}
// ... rest of the file

export interface Entity {
  id: string;
  x: number;
  y: number;
}

export interface Rocket extends Entity {
  targetX: number;
  targetY: number;
  speed: number;
  progress: number; // 0 to 1
}

export interface Missile extends Entity {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number; // 0 to 1
}

export interface Explosion extends Entity {
  radius: number;
  maxRadius: number;
  growing: boolean;
  alpha: number;
}

export interface City extends Entity {
  active: boolean;
}

export interface Turret extends Entity {
  ammo: number;
  maxAmmo: number;
  active: boolean;
}

export interface Upgrades {
  beamThickness: number; // 0, 1, 2, 3
  explosionRadius: number; // 0, 1, 2, 3
  splitShot: number; // 0, 1, 2, 3
}

export interface GameState {
  score: number;
  coins: number;
  status: GameStatus;
  difficulty: Difficulty;
  rockets: Rocket[];
  missiles: Missile[];
  explosions: Explosion[];
  cities: City[];
  turrets: Turret[];
  level: number;
  round: number;
  totalRocketsInRound: number;
  rocketsSpawnedInRound: number;
  rocketsDestroyedInRound: number;
  upgrades: Upgrades;
}
