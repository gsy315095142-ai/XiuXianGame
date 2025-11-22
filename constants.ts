
import { Card, CardType, Item, Player, GameConfig, Enemy, EnemyTemplate, RealmRank, EquipmentSlot } from './types';

export const MAX_HAND_SIZE = 10;
export const DRAW_COUNT_PER_TURN = 5;

export const SLOT_NAMES: Record<EquipmentSlot, string> = {
  mainWeapon: '主武器',
  offWeapon: '副武器',
  head: '头部',
  body: '上身',
  belt: '腰带',
  legs: '下身',
  feet: '鞋子',
  neck: '项链',
  accessory: '首饰',
  ring: '戒指',
};

export const DEFAULT_REALMS: RealmRank[] = [
  { name: '炼气期', rangeStart: 1, rangeEnd: 9, expReq: 100 },
  { name: '筑基期', rangeStart: 10, rangeEnd: 19, expReq: 500 },
  { name: '金丹期', rangeStart: 20, rangeEnd: 29, expReq: 2000 },
  { name: '元婴期', rangeStart: 30, rangeEnd: 39, expReq: 10000 },
  { name: '化神期', rangeStart: 40, rangeEnd: 99, expReq: 50000 },
];

// Helper for Realms
export const getRealmName = (level: number, realms: RealmRank[] = DEFAULT_REALMS): string => {
    const realm = realms.find(r => level >= r.rangeStart && level <= r.rangeEnd);
    if (realm) {
        return `${realm.name} ${level - realm.rangeStart + 1}层`;
    }
    return `未知境界 Lv.${level}`;
};

// Initial Cards
export const BASIC_STRIKE: Card = {
  id: 'c_strike',
  name: '基础剑诀',
  cost: 1,
  type: CardType.ATTACK,
  value: 8,
  description: '造成8点伤害',
  rarity: 'common',
  reqLevel: 1,
};

export const BASIC_DEFEND: Card = {
  id: 'c_defend',
  name: '护体金光',
  cost: 1,
  type: CardType.DEFEND,
  value: 5,
  description: '获得5点护甲',
  rarity: 'common',
  reqLevel: 1,
};

export const MEDITATE: Card = {
  id: 'c_meditate',
  name: '聚气',
  cost: 0,
  type: CardType.BUFF,
  value: 2,
  description: '恢复2点神识',
  rarity: 'common',
  reqLevel: 1,
};

export const FIREBALL: Card = {
  id: 'c_fireball',
  name: '火球术',
  cost: 3,
  type: CardType.ATTACK,
  value: 20,
  description: '造成20点大量伤害',
  rarity: 'rare',
  reqLevel: 3,
};

export const HEAL_SPELL: Card = {
  id: 'c_heal',
  name: '回春术',
  cost: 2,
  type: CardType.HEAL,
  value: 10,
  description: '恢复10点生命值',
  rarity: 'rare',
  reqLevel: 2,
};

export const INITIAL_CARDS = [BASIC_STRIKE, BASIC_DEFEND, MEDITATE, FIREBALL, HEAL_SPELL];

// Initial Equipment
export const WOODEN_SWORD: Item = {
  id: 'eq_wood_sword',
  name: '桃木剑',
  type: 'EQUIPMENT',
  slot: 'mainWeapon',
  statBonus: { attack: 2 },
  description: '一把普通的桃木剑，略微提升攻击力。',
  rarity: 'common',
  reqLevel: 1,
};

export const IRON_SWORD: Item = {
  id: 'eq_iron_sword',
  name: '铁剑',
  type: 'EQUIPMENT',
  slot: 'mainWeapon',
  statBonus: { attack: 5 },
  description: '凡铁锻造的剑。',
  rarity: 'common',
  reqLevel: 5,
};

export const LEATHER_ARMOR: Item = {
  id: 'eq_leather_armor',
  name: '皮甲',
  type: 'EQUIPMENT',
  slot: 'body',
  statBonus: { defense: 2 },
  description: '野兽毛皮制成的护甲。',
  rarity: 'common',
  reqLevel: 2,
};

export const JADE_PENDANT: Item = {
    id: 'eq_jade',
    name: '灵玉佩',
    type: 'ARTIFACT',
    slot: 'accessory',
    statBonus: { maxSpirit: 2 },
    description: '温润的玉佩，能滋养神识。',
    rarity: 'rare',
    reqLevel: 3
};

export const INITIAL_ITEMS = [WOODEN_SWORD, IRON_SWORD, LEATHER_ARMOR, JADE_PENDANT];

export const INITIAL_ENEMY_TEMPLATES: EnemyTemplate[] = [
  {
    name: '野猪',
    baseStats: { maxHp: 60, hp: 60, maxSpirit: 10, spirit: 10, attack: 6, defense: 0, speed: 8 },
    cardIds: ['c_strike'],
    minPlayerLevel: 1,
  },
  {
    name: '青蛇',
    baseStats: { maxHp: 50, hp: 50, maxSpirit: 10, spirit: 10, attack: 8, defense: 0, speed: 12 },
    cardIds: ['c_strike', 'c_strike'],
    minPlayerLevel: 1,
  },
  {
    name: '魔修',
    baseStats: { maxHp: 80, hp: 80, maxSpirit: 10, spirit: 10, attack: 10, defense: 2, speed: 10 },
    cardIds: ['c_strike', 'c_defend', 'c_fireball'],
    minPlayerLevel: 3,
  },
  {
    name: '筑基妖兽',
    baseStats: { maxHp: 200, hp: 200, maxSpirit: 20, spirit: 20, attack: 20, defense: 10, speed: 15 },
    cardIds: ['c_fireball', 'c_fireball'],
    minPlayerLevel: 10,
  },
];

export const DEFAULT_GAME_CONFIG: GameConfig = {
  mapNodeCount: 12,
  itemDropRate: 0.3,
  items: INITIAL_ITEMS,
  cards: INITIAL_CARDS,
  enemies: INITIAL_ENEMY_TEMPLATES,
  realms: DEFAULT_REALMS,
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
  // Safe filter in case a card was deleted from config
  const deck = config.playerInitialDeckIds
    .map(id => config.cards.find(c => c.id === id))
    .filter((c): c is Card => !!c);

  // Fallback if deck is empty
  if (deck.length === 0 && config.cards.length > 0) {
      deck.push(config.cards[0]);
  }

  return {
    id: 'player_1',
    name: '郭郭',
    level: 1,
    avatarUrl: 'https://picsum.photos/seed/cultivator/200/200',
    exp: 0,
    maxExp: config.realms[0]?.expReq || 100,
    gold: 0,
    stats: { ...config.playerInitialStats },
    deck: deck,
    inventory: config.items.length > 0 ? [config.items[0]] : [],
    equipment: { 
        mainWeapon: null,
        offWeapon: null,
        head: null,
        body: null,
        belt: null,
        legs: null,
        feet: null,
        neck: null,
        accessory: null,
        ring: null,
    },
  };
};

export const getRandomEnemyFromConfig = (playerLevel: number, config: GameConfig): Enemy => {
  // Filter enemies that match the player's level range (e.g., playerLevel >= minPlayerLevel)
  let possibleEnemies = config.enemies.filter(e => playerLevel >= e.minPlayerLevel);
  
  // Fallback if no enemies match
  if (possibleEnemies.length === 0) {
     // Try to find lowest level enemy
     if (config.enemies.length > 0) {
        possibleEnemies = config.enemies.sort((a,b) => a.minPlayerLevel - b.minPlayerLevel).slice(0,1);
     } else {
         // Total emergency fallback if config is empty
         return {
             id: 'dummy', name: '影子', level: 1, avatarUrl: '', stats: {hp: 10, maxHp:10, spirit:0, maxSpirit:0, attack:1, defense:0, speed:1}, dropExp:0, dropGold:0, difficulty:1, deck:[]
         }
     }
  }
  
  // Prefer enemies closer to player level for better balance if list is large
  const template = possibleEnemies[Math.floor(Math.random() * possibleEnemies.length)];
  
  const difficultyMultiplier = 1 + (playerLevel * 0.2);
  
  // Build enemy deck safely
  const enemyDeck = template.cardIds
    .map(id => config.cards.find(c => c.id === id))
    .filter((c): c is Card => !!c);
    
  if (enemyDeck.length === 0 && config.cards.length > 0) {
      // Give them a random card if their configured cards are missing
      enemyDeck.push(config.cards[0]);
  }

  return {
    id: `enemy_${Date.now()}`,
    name: template.name,
    level: playerLevel, // Scale enemy to player level visually, though stats come from base + multiplier
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
