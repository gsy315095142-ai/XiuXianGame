

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
  GROWTH = '成长',
}

export enum ElementType {
  METAL = '金',
  WOOD = '木',
  WATER = '水',
  FIRE = '火',
  EARTH = '土',
  LIGHT = '光',
  DARK = '暗',
  WIND = '风',
  THUNDER = '雷',
  ICE = '冰',
  SWORD = '剑',
}

export enum NodeType {
  EMPTY = '空地',
  BATTLE = '战斗',
  TREASURE = '宝物',
  BOSS = '领主',
  MERCHANT = '游商',
}

export interface RealmRank {
  name: string;
  rangeStart: number;
  rangeEnd: number;
  expReq: number;
  minGoldDrop: number; 
  maxGoldDrop: number;
  subRanks?: string[]; 
  // Level Up Config
  hpGrowth: number;
  atkGrowth: number;
  defGrowth: number;
  spiritGrowth: number;
  speedGrowth: number;
  breakthroughCost: number; // Cost to break TO the next level
  breakthroughChance: number; // 0.0 - 1.0
}

export type ItemType = 'EQUIPMENT' | 'CONSUMABLE' | 'ARTIFACT';

export type EquipmentSlot = 
  | 'mainWeapon' 
  | 'offWeapon' 
  | 'head' 
  | 'body' 
  | 'belt' 
  | 'legs' 
  | 'feet' 
  | 'neck' 
  | 'accessory' 
  | 'ring';

export interface Item {
  id: string;
  name: string;
  icon: string; 
  type: ItemType;
  slot?: EquipmentSlot; 
  statBonus?: Partial<Stats>;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  reqLevel: number;
  price: number; 
}

export interface Card {
  id: string;
  name: string;
  cost: number; 
  element: ElementType; 
  elementCost: number; 
  type: CardType;
  value: number; 
  description: string;
  rarity: 'common' | 'rare' | 'epic';
  reqLevel: number;
  tags?: string[]; 
}

export interface Stats {
  maxHp: number;
  hp: number;
  maxSpirit: number; 
  spirit: number;
  attack: number;
  defense: number;
  speed: number;
  elementalAffinities: Record<ElementType, number>; 
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
  gold: number; 
  deck: Card[];
  inventory: Item[];
  equipment: Record<EquipmentSlot, Item | null>;
}

export interface Enemy extends Entity {
  dropExp: number;
  dropGold: number;
  difficulty: number;
  deck: Card[]; 
}

export interface MapNode {
  id: number;
  type: NodeType;
  visited: boolean;
  x: number; 
  y: number; 
  content?: string; 
}

export interface EnemyTemplate {
  name: string;
  baseStats: Stats;
  cardIds: string[]; 
  minPlayerLevel: number; 
}

export interface GameConfig {
  mapNodeCount: number;
  itemDropRate: number; 
  items: Item[];
  cards: Card[];
  enemies: EnemyTemplate[];
  realms: RealmRank[];
  playerInitialDeckIds: string[];
  playerInitialStats: Stats;
  eventWeights: {
      merchant: number;
      treasure: number; // Reward node (Item or Gold)
      battle: number;
      empty: number;
  };
}