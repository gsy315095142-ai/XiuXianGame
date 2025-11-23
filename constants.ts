

import { Card, CardType, Item, Player, GameConfig, Enemy, EnemyTemplate, RealmRank, EquipmentSlot, Stats } from './types';

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

// --- Initial Manual Content (Starters) ---

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

export const PIERCING_NEEDLE: Card = {
    id: 'c_needle',
    name: '破罡针',
    cost: 2,
    type: CardType.ATTACK,
    value: 12,
    description: '造成12点伤害，无视护盾',
    rarity: 'rare',
    reqLevel: 5,
    tags: ['PIERCE']
};

const MANUAL_CARDS = [BASIC_STRIKE, BASIC_DEFEND, MEDITATE, FIREBALL, HEAL_SPELL, PIERCING_NEEDLE];

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

const MANUAL_ITEMS = [WOODEN_SWORD, IRON_SWORD, LEATHER_ARMOR, JADE_PENDANT];

// --- Procedural Generation Content ---

const GENERATED_CARDS: Card[] = [];
const GENERATED_ITEMS: Item[] = [];

const REALMS_GEN_CONFIG = [
    { name: '炼气', level: 1, limit: 10, prefix: '凡品' },
    { name: '筑基', level: 10, limit: 20, prefix: '灵品' },
    { name: '金丹', level: 20, limit: 50, prefix: '玄品' },
    { name: '元婴', level: 30, limit: 100, prefix: '地品' },
    { name: '化神', level: 40, limit: 200, prefix: '天品' },
];

const EQUIP_SLOTS_LIST: EquipmentSlot[] = ['mainWeapon', 'offWeapon', 'head', 'body', 'belt', 'legs', 'feet', 'neck', 'accessory', 'ring'];
const EQUIP_NAMES: Record<EquipmentSlot, string[]> = {
    mainWeapon: ['剑', '刀', '枪', '棍', '斧', '尺', '扇'],
    offWeapon: ['盾', '匕首', '阵盘', '符箓', '印'],
    head: ['冠', '笠', '盔', '巾', '钗'],
    body: ['甲', '袍', '衣', '铠', '裳'],
    belt: ['腰带', '束带', '索', '扣'],
    legs: ['护腿', '裤', '裙'],
    feet: ['靴', '履', '鞋'],
    neck: ['项链', '珠串', '环'],
    accessory: ['玉佩', '香囊', '令'],
    ring: ['指环', '戒', '扳指']
};

// Seeded random helper (simple)
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

REALMS_GEN_CONFIG.forEach((realm, rIdx) => {
    // 1. Generate 10 Cards per Realm
    for (let i = 0; i < 10; i++) {
        const type = Object.values(CardType)[randInt(0, 3)]; // Random Type
        const isPierce = type === CardType.ATTACK && Math.random() < 0.2;
        
        // Value Logic: Between 50% and 100% of limit, ensure at least 1
        const val = randInt(Math.max(1, Math.floor(realm.limit * 0.3)), realm.limit);
        
        // Cost Logic: Roughly based on value/limit ratio.
        // 1-10 -> cost 1
        // 10-20 -> cost 1-2
        // ...
        let cost = 1;
        const powerRatio = val / realm.limit;
        if (realm.limit <= 10) cost = powerRatio > 0.8 ? 2 : 1;
        else if (realm.limit <= 20) cost = randInt(1, 2);
        else cost = randInt(1, 4);
        
        // Ensure playable cost
        if (cost > 5) cost = 5;

        // Names
        let nameSuffix = '';
        if (type === CardType.ATTACK) nameSuffix = randPick(['剑诀', '掌', '指', '斩', '拳', '印', '雷', '火']);
        else if (type === CardType.DEFEND) nameSuffix = randPick(['护盾', '罩', '身法', '格挡', '钟', '甲']);
        else if (type === CardType.HEAL) nameSuffix = randPick(['回春', '丹', '气', '诀', '术', '光']);
        else nameSuffix = randPick(['心法', '阵', '意', '咒']);

        const cardName = `${realm.prefix}·${nameSuffix}${i+1}`;

        GENERATED_CARDS.push({
            id: `gen_c_${realm.level}_${i}`,
            name: cardName,
            cost: cost,
            type: type,
            value: val,
            description: `${isPierce ? '【穿刺】' : ''}${type === CardType.ATTACK ? '造成' : type === CardType.HEAL ? '恢复' : type === CardType.DEFEND ? '获得' : '增加'}${val}点${type === CardType.ATTACK ? '伤害' : type === CardType.HEAL ? '生命' : type === CardType.DEFEND ? '护盾' : '数值'}`,
            rarity: i > 8 ? 'epic' : i > 5 ? 'rare' : 'common',
            reqLevel: realm.level,
            tags: isPierce ? ['PIERCE'] : []
        });
    }

    // 2. Generate 10 Items per Realm
    // We try to distribute slots but also keep it random
    for (let i = 0; i < 10; i++) {
        // Simple slot rotation ensuring at least one of each slot across the game roughly, but locally random is fine
        const slot = EQUIP_SLOTS_LIST[i % EQUIP_SLOTS_LIST.length]; 
        const slotName = randPick(EQUIP_NAMES[slot]);
        
        const statBonus: Partial<Stats> = {};
        
        // Stat Generation: Strict Limit check
        // We split the 'limit' budget across relevant stats
        
        if (slot === 'mainWeapon' || slot === 'offWeapon') {
            statBonus.attack = randInt(1, realm.limit);
        } else if (['head', 'body', 'legs', 'feet'].includes(slot)) {
            // Split budget
            const def = randInt(1, Math.ceil(realm.limit / 2));
            const hp = randInt(1, Math.ceil(realm.limit / 2));
            statBonus.defense = def;
            statBonus.maxHp = hp;
        } else {
            // Accessories
            statBonus.maxSpirit = randInt(1, Math.ceil(realm.limit / 5)) || 1;
            statBonus.speed = randInt(1, Math.ceil(realm.limit / 5)) || 1;
        }

        const itemName = `${realm.prefix}·${slotName}`;

        GENERATED_ITEMS.push({
            id: `gen_eq_${realm.level}_${i}`,
            name: itemName,
            type: 'EQUIPMENT',
            slot: slot,
            statBonus: statBonus,
            description: `${realm.name}修士使用的${slotName}。`,
            rarity: i > 7 ? 'legendary' : i > 5 ? 'epic' : i > 3 ? 'rare' : 'common',
            reqLevel: realm.level
        });
    }
});

// Combine
export const INITIAL_CARDS = [...MANUAL_CARDS, ...GENERATED_CARDS];
export const INITIAL_ITEMS = [...MANUAL_ITEMS, ...GENERATED_ITEMS];

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
  {
      name: '金丹老祖',
      baseStats: { maxHp: 1000, hp: 1000, maxSpirit: 50, spirit: 50, attack: 50, defense: 30, speed: 20 },
      cardIds: ['gen_c_20_0', 'gen_c_20_1', 'gen_c_20_2'], // Uses generated cards
      minPlayerLevel: 20
  }
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
  // Also relax the condition: allow enemies slightly lower level if no exact match or high level
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
  // We can pick randomly from valid enemies
  const template = possibleEnemies[Math.floor(Math.random() * possibleEnemies.length)];
  
  const difficultyMultiplier = 1 + (playerLevel * 0.2);
  
  // Build enemy deck safely
  const enemyDeck = template.cardIds
    .map(id => config.cards.find(c => c.id === id))
    .filter((c): c is Card => !!c);
  
  // If enemy has no specific cards, give them random cards from their level range
  if (enemyDeck.length === 0 && config.cards.length > 0) {
      const levelAppropriateCards = config.cards.filter(c => c.reqLevel <= playerLevel);
      if (levelAppropriateCards.length > 0) {
          enemyDeck.push(levelAppropriateCards[Math.floor(Math.random() * levelAppropriateCards.length)]);
          enemyDeck.push(levelAppropriateCards[Math.floor(Math.random() * levelAppropriateCards.length)]);
      } else {
          enemyDeck.push(config.cards[0]);
      }
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
