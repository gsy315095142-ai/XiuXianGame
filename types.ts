
export enum GameView {
  START = 'START',
  CONFIG = 'CONFIG',
  HOME = 'HOME',
  ADVENTURE = 'ADVENTURE',
  COMBAT = 'COMBAT',
}

export enum CardType {
  ATTACK = '攻击',
  HEAL = '治疗',
  DEFEND = '防御',
  BUFF = '增益',
}

export enum NodeType {
  EMPTY = '空地',
  BATTLE = '战斗',
  TREASURE = '宝物',
  BOSS = '领主',
}

export interface Item {
  id: string;
  name: string;
  type: 'EQUIPMENT' | 'CONSUMABLE' | 'MATERIAL';
  statBonus?: Partial<Stats>;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Card {
  id: string;
  name: string;
  cost: number; // Spirit cost
  type: CardType;
  value: number; // Damage or Heal amount
  description: string;
  rarity: 'common' | 'rare' | 'epic';
}

export interface Stats {
  maxHp: number;
  hp: number;
  maxSpirit: number; // Shenshi
  spirit: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Entity {
  id: string;
  name: string;
  level: number;
  stats: Stats;
  avatarUrl: string;
}

export interface Player extends Entity {
  exp: number;
  maxExp: number;
  gold: number; // Spirit Stones
  deck: Card[];
  inventory: Item[];
  equipment: {
    weapon: Item | null;
    armor: Item | null;
    accessory: Item | null;
  };
}

export interface Enemy extends Entity {
  dropExp: number;
  dropGold: number;
  difficulty: number;
  deck: Card[]; // Enemies now have decks
}

export interface MapNode {
  id: number;
  type: NodeType;
  visited: boolean;
  x: number; // Grid layout X
  y: number; // Grid layout Y
  content?: string; // Flavor text
}

export interface EnemyTemplate {
  name: string;
  baseStats: Stats;
  cardIds: string[]; // IDs of cards this enemy uses
}

export interface GameConfig {
  mapNodeCount: number;
  itemDropRate: number; // 0-1
  items: Item[];
  cards: Card[];
  enemies: EnemyTemplate[];
  playerInitialDeckIds: string[];
  playerInitialStats: Stats;
}
