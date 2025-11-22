
import { Card, CardType, Item, Player, GameConfig, Enemy, EnemyTemplate } from './types';

export const MAX_HAND_SIZE = 10;
export const DRAW_COUNT_PER_TURN = 5;

// Initial Cards
export const BASIC_STRIKE: Card = {
  id: 'c_strike',
  name: '基础剑诀',
  cost: 1,
  type: CardType.ATTACK,
  value: 8,
  description: '造成8点伤害',
  rarity: 'common',
};

export const BASIC_DEFEND: Card = {
  id: 'c_defend',
  name: '护体金光',
  cost: 1,
  type: CardType.DEFEND,
  value: 5,
  description: '获得5点护甲',
  rarity: 'common',
};

export const MEDITATE: Card = {
  id: 'c_meditate',
  name: '聚气',
  cost: 0,
  type: CardType.BUFF,
  value: 2,
  description: '恢复2点神识',
  rarity: 'common',
};

export const FIREBALL: Card = {
  id: 'c_fireball',
  name: '火球术',
  cost: 3,
  type: CardType.ATTACK,
  value: 20,
  description: '造成20点大量伤害',
  rarity: 'rare',
};

export const HEAL_SPELL: Card = {
  id: 'c_heal',
  name: '回春术',
  cost: 2,
  type: CardType.HEAL,
  value: 10,
  description: '恢复10点生命值',
  rarity: 'rare',
};

export const INITIAL_CARDS = [BASIC_STRIKE, BASIC_DEFEND, MEDITATE, FIREBALL, HEAL_SPELL];

// Initial Equipment
export const WOODEN_SWORD: Item = {
  id: 'eq_wood_sword',
  name: '桃木剑',
  type: 'EQUIPMENT',
  statBonus: { attack: 2 },
  description: '一把普通的桃木剑，略微提升攻击力。',
  rarity: 'common',
};

export const IRON_SWORD: Item = {
  id: 'eq_iron_sword',
  name: '铁剑',
  type: 'EQUIPMENT',
  statBonus: { attack: 5 },
  description: '凡铁锻造的剑。',
  rarity: 'common',
};

export const INITIAL_ITEMS = [WOODEN_SWORD, IRON_SWORD];

export const INITIAL_ENEMY_TEMPLATES: EnemyTemplate[] = [
  {
    name: '野猪',
    baseStats: { maxHp: 60, hp: 60, maxSpirit: 10, spirit: 10, attack: 6, defense: 0, speed: 8 },
    cardIds: ['c_strike'],
  },
  {
    name: '青蛇',
    baseStats: { maxHp: 50, hp: 50, maxSpirit: 10, spirit: 10, attack: 8, defense: 0, speed: 12 },
    cardIds: ['c_strike', 'c_strike'],
  },
  {
    name: '魔修',
    baseStats: { maxHp: 80, hp: 80, maxSpirit: 10, spirit: 10, attack: 10, defense: 2, speed: 10 },
    cardIds: ['c_strike', 'c_defend', 'c_fireball'],
  },
];

export const DEFAULT_GAME_CONFIG: GameConfig = {
  mapNodeCount: 12,
  itemDropRate: 0.3,
  items: INITIAL_ITEMS,
  cards: INITIAL_CARDS,
  enemies: INITIAL_ENEMY_TEMPLATES,
  playerInitialDeckIds: ['c_strike', 'c_strike', 'c_strike', 'c_defend', 'c_defend', 'c_meditate', 'c_fireball', 'c_heal'],
  playerInitialStats: {
    maxHp: 100,
    hp: 100,
    maxSpirit: 5,
    spirit: 5,
    attack: 5,
    defense: 0,
    speed: 10,
  },
};

export const generatePlayerFromConfig = (config: GameConfig): Player => {
  const deck = config.playerInitialDeckIds.map(id => config.cards.find(c => c.id === id)!).filter(Boolean);
  return {
    id: 'player_1',
    name: '郭郭',
    level: 1,
    avatarUrl: 'https://picsum.photos/seed/cultivator/200/200',
    exp: 0,
    maxExp: 100,
    gold: 0,
    stats: { ...config.playerInitialStats },
    deck: deck,
    inventory: [WOODEN_SWORD],
    equipment: { weapon: null, armor: null, accessory: null },
  };
};

export const getRandomEnemyFromConfig = (playerLevel: number, config: GameConfig): Enemy => {
  const template = config.enemies[Math.floor(Math.random() * config.enemies.length)];
  const difficultyMultiplier = 1 + (playerLevel * 0.2);
  
  // Build enemy deck
  const enemyDeck = template.cardIds.map(id => config.cards.find(c => c.id === id)).filter(c => c !== undefined) as Card[];
  // Fallback if deck is empty
  if (enemyDeck.length === 0) enemyDeck.push(BASIC_STRIKE);

  return {
    id: `enemy_${Date.now()}`,
    name: template.name,
    level: playerLevel,
    avatarUrl: `https://picsum.photos/seed/${template.name}/200/200`,
    stats: {
      maxHp: Math.floor(template.baseStats.maxHp * difficultyMultiplier),
      hp: Math.floor(template.baseStats.maxHp * difficultyMultiplier),
      maxSpirit: template.baseStats.maxSpirit,
      spirit: template.baseStats.maxSpirit,
      attack: Math.floor(template.baseStats.attack * difficultyMultiplier),
      defense: Math.floor(template.baseStats.defense * difficultyMultiplier),
      speed: Math.floor(template.baseStats.speed * difficultyMultiplier),
    },
    dropExp: 20 * playerLevel,
    dropGold: 10 * playerLevel,
    difficulty: playerLevel,
    deck: enemyDeck
  };
};
