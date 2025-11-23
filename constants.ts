

import { Card, CardType, Item, Player, GameConfig, Enemy, EnemyTemplate, RealmRank, EquipmentSlot, Stats, ElementType } from './types';

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

// UI Config for Elements
export const ELEMENT_CONFIG: Record<ElementType, { color: string, icon: string, bg: string }> = {
    [ElementType.METAL]: { color: 'text-gray-300', icon: '⚙️', bg: 'bg-gray-700' },
    [ElementType.WOOD]: { color: 'text-green-400', icon: '🌲', bg: 'bg-green-800' },
    [ElementType.WATER]: { color: 'text-blue-400', icon: '💧', bg: 'bg-blue-800' },
    [ElementType.FIRE]: { color: 'text-red-500', icon: '🔥', bg: 'bg-red-900' },
    [ElementType.EARTH]: { color: 'text-amber-600', icon: '⛰️', bg: 'bg-amber-900' },
    [ElementType.LIGHT]: { color: 'text-yellow-200', icon: '☀️', bg: 'bg-yellow-700' },
    [ElementType.DARK]: { color: 'text-purple-400', icon: '🌑', bg: 'bg-purple-900' },
    [ElementType.WIND]: { color: 'text-teal-300', icon: '💨', bg: 'bg-teal-800' },
    [ElementType.THUNDER]: { color: 'text-indigo-400', icon: '⚡', bg: 'bg-indigo-800' },
    [ElementType.ICE]: { color: 'text-cyan-200', icon: '❄️', bg: 'bg-cyan-800' },
    [ElementType.SWORD]: { color: 'text-slate-200', icon: '⚔️', bg: 'bg-slate-700' },
};

export const DEFAULT_REALMS: RealmRank[] = [
  { name: '炼气期', rangeStart: 1, rangeEnd: 9, expReq: 100 },
  { name: '筑基期', rangeStart: 10, rangeEnd: 19, expReq: 500 },
  { name: '金丹期', rangeStart: 20, rangeEnd: 29, expReq: 2000 },
  { name: '元婴期', rangeStart: 30, rangeEnd: 39, expReq: 10000 },
  { name: '化神期', rangeStart: 40, rangeEnd: 99, expReq: 50000 },
];

export const getRealmName = (level: number, realms: RealmRank[] = DEFAULT_REALMS): string => {
    const realm = realms.find(r => level >= r.rangeStart && level <= r.rangeEnd);
    if (realm) {
        return `${realm.name} ${level - realm.rangeStart + 1}层`;
    }
    return `未知境界 Lv.${level}`;
};

// Helper to init empty elements
export const createZeroElementStats = (): Record<ElementType, number> => ({
    [ElementType.METAL]: 0,
    [ElementType.WOOD]: 0,
    [ElementType.WATER]: 0,
    [ElementType.FIRE]: 0,
    [ElementType.EARTH]: 0,
    [ElementType.LIGHT]: 0,
    [ElementType.DARK]: 0,
    [ElementType.WIND]: 0,
    [ElementType.THUNDER]: 0,
    [ElementType.ICE]: 0,
    [ElementType.SWORD]: 0,
});

// Helper to generate Skill Books
export const generateSkillBook = (level: number, element: ElementType): Item => {
    // Find realm based on level
    const realm = DEFAULT_REALMS.find(r => level >= r.rangeStart && level <= r.rangeEnd) || DEFAULT_REALMS[0];
    return {
        id: `book_${element}_${level}_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        name: `《${element}·${realm.name}心法》`,
        type: 'CONSUMABLE',
        description: `使用后随机领悟一张${realm.name}${element}属性卡牌。`,
        rarity: 'rare',
        reqLevel: realm.rangeStart,
        statBonus: { elementalAffinities: createZeroElementStats() }
    };
};

// --- Initial Manual Content (Starters) ---

export const BASIC_STRIKE: Card = {
  id: 'c_strike',
  name: '基础剑诀',
  cost: 1,
  element: ElementType.SWORD,
  elementCost: 1,
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
  element: ElementType.METAL,
  elementCost: 1,
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
  element: ElementType.WOOD,
  elementCost: 0, 
  type: CardType.BUFF,
  value: 2,
  description: '恢复2点神识',
  rarity: 'common',
  reqLevel: 1,
};

export const FIREBALL: Card = {
  id: 'c_fireball',
  name: '火球术',
  cost: 2,
  element: ElementType.FIRE,
  elementCost: 2,
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
  element: ElementType.WOOD,
  elementCost: 2,
  type: CardType.HEAL,
  value: 10,
  description: '恢复10点生命值',
  rarity: 'rare',
  reqLevel: 2,
};

export const PIERCING_NEEDLE: Card = {
    id: 'c_needle',
    name: '破罡针',
    cost: 1,
    element: ElementType.METAL,
    elementCost: 2,
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
  statBonus: { attack: 2, elementalAffinities: { ...createZeroElementStats(), [ElementType.SWORD]: 1, [ElementType.WOOD]: 1 } },
  description: '一把普通的桃木剑，略微提升攻击力与木系亲和。',
  rarity: 'common',
  reqLevel: 1,
};

export const IRON_SWORD: Item = {
  id: 'eq_iron_sword',
  name: '铁剑',
  type: 'EQUIPMENT',
  slot: 'mainWeapon',
  statBonus: { attack: 5, elementalAffinities: { ...createZeroElementStats(), [ElementType.SWORD]: 2, [ElementType.METAL]: 1 } },
  description: '凡铁锻造的剑。',
  rarity: 'common',
  reqLevel: 5,
};

export const LEATHER_ARMOR: Item = {
  id: 'eq_leather_armor',
  name: '皮甲',
  type: 'EQUIPMENT',
  slot: 'body',
  statBonus: { defense: 2, elementalAffinities: { ...createZeroElementStats(), [ElementType.EARTH]: 1 } },
  description: '野兽毛皮制成的护甲。',
  rarity: 'common',
  reqLevel: 2,
};

export const JADE_PENDANT: Item = {
    id: 'eq_jade',
    name: '灵玉佩',
    type: 'ARTIFACT',
    slot: 'accessory',
    statBonus: { maxSpirit: 2, elementalAffinities: { ...createZeroElementStats(), [ElementType.WATER]: 1, [ElementType.WOOD]: 1 } },
    description: '温润的玉佩，能滋养神识。',
    rarity: 'rare',
    reqLevel: 3
};

const MANUAL_ITEMS = [WOODEN_SWORD, IRON_SWORD, LEATHER_ARMOR, JADE_PENDANT];

// --- Procedural Generation Content ---

const GENERATED_CARDS: Card[] = [];
const GENERATED_ITEMS: Item[] = [];
const GENERATED_BOOKS: Item[] = [];

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

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

REALMS_GEN_CONFIG.forEach((realm, rIdx) => {
    // 1. Generate 10 Cards per Realm
    for (let i = 0; i < 10; i++) {
        const type = Object.values(CardType)[randInt(0, 3)]; 
        const element = Object.values(ElementType)[randInt(0, 10)];
        const isPierce = type === CardType.ATTACK && Math.random() < 0.2;
        
        const val = randInt(Math.max(1, Math.floor(realm.limit * 0.3)), realm.limit);
        
        let cost = 1;
        const powerRatio = val / realm.limit;
        if (realm.limit <= 10) cost = powerRatio > 0.8 ? 2 : 1;
        else if (realm.limit <= 20) cost = randInt(1, 2);
        else cost = randInt(1, 4);
        if (cost > 5) cost = 5;

        // Calculate element cost (usually roughly equal to spirit cost or slightly less)
        const elemCost = Math.max(1, Math.floor(cost * (0.5 + Math.random() * 0.5)));

        // Names
        let nameSuffix = '';
        if (type === CardType.ATTACK) nameSuffix = randPick(['剑诀', '掌', '指', '斩', '拳', '印', '雷', '火']);
        else if (type === CardType.DEFEND) nameSuffix = randPick(['护盾', '罩', '身法', '格挡', '钟', '甲']);
        else if (type === CardType.HEAL) nameSuffix = randPick(['回春', '丹', '气', '诀', '术', '光']);
        else nameSuffix = randPick(['心法', '阵', '意', '咒']);

        const cardName = `${realm.prefix}·${element}${nameSuffix}${i+1}`;

        GENERATED_CARDS.push({
            id: `gen_c_${realm.level}_${i}`,
            name: cardName,
            cost: cost,
            element: element,
            elementCost: elemCost,
            type: type,
            value: val,
            description: `${isPierce ? '【穿刺】' : ''}${type === CardType.ATTACK ? '造成' : type === CardType.HEAL ? '恢复' : type === CardType.DEFEND ? '获得' : '增加'}${val}点${type === CardType.ATTACK ? '伤害' : type === CardType.HEAL ? '生命' : type === CardType.DEFEND ? '护盾' : '数值'}`,
            rarity: i > 8 ? 'epic' : i > 5 ? 'rare' : 'common',
            reqLevel: realm.level,
            tags: isPierce ? ['PIERCE'] : []
        });
    }

    // 2. Generate 10 Items per Realm
    for (let i = 0; i < 10; i++) {
        const slot = EQUIP_SLOTS_LIST[i % EQUIP_SLOTS_LIST.length]; 
        const slotName = randPick(EQUIP_NAMES[slot]);
        
        const statBonus: Partial<Stats> = { elementalAffinities: createZeroElementStats() };
        
        if (slot === 'mainWeapon' || slot === 'offWeapon') {
            statBonus.attack = randInt(1, realm.limit);
        } else if (['head', 'body', 'legs', 'feet'].includes(slot)) {
            const def = randInt(1, Math.ceil(realm.limit / 2));
            const hp = randInt(1, Math.ceil(realm.limit / 2));
            statBonus.defense = def;
            statBonus.maxHp = hp;
        } else {
            statBonus.maxSpirit = randInt(1, Math.ceil(realm.limit / 5)) || 1;
            statBonus.speed = randInt(1, Math.ceil(realm.limit / 5)) || 1;
        }
        
        // Items give elemental affinity bonuses randomly
        const numElements = randInt(1, 2);
        for(let e=0; e<numElements; e++) {
            const el = Object.values(ElementType)[randInt(0, 10)];
            // Affinity bonus roughly 10% of realm limit, min 1
            const bonus = Math.max(1, Math.floor(realm.limit * 0.1));
            // @ts-ignore
            statBonus.elementalAffinities[el] += bonus;
        }

        const itemName = `${realm.prefix}·${slotName}`;

        GENERATED_ITEMS.push({
            id: `gen_eq_${realm.level}_${i}`,
            name: itemName,
            type: 'EQUIPMENT',
            slot: slot,
            statBonus: statBonus,
            description: `${realm.name}修士使用的${slotName}。蕴含五行之力。`,
            rarity: i > 7 ? 'legendary' : i > 5 ? 'epic' : i > 3 ? 'rare' : 'common',
            reqLevel: realm.level
        });
    }

    // 3. Generate Skill Books (One for each element for this realm)
    Object.values(ElementType).forEach(elem => {
        GENERATED_BOOKS.push(generateSkillBook(realm.level, elem));
    });
});

// Combine Cards and Items FIRST
export const INITIAL_CARDS = [...MANUAL_CARDS, ...GENERATED_CARDS];
export const INITIAL_ITEMS = [...MANUAL_ITEMS, ...GENERATED_ITEMS, ...GENERATED_BOOKS];

// --- Procedural Generation: Enemies ---

const GENERATED_ENEMIES: EnemyTemplate[] = [];

// Config for enemy generation: 4 Realms x 10 Enemies
const ENEMY_REALM_CONFIG = [
    { name: '炼气', minLv: 1, maxLv: 9, hpRange: [30, 80], atkRange: [3, 8], spirit: 5, prefix: ['狂暴', '变异', '剧毒', '赤血', '幽暗', '灵动', '坚硬', '疾风', '魔化', '幼年'] },
    { name: '筑基', minLv: 10, maxLv: 19, hpRange: [150, 300], atkRange: [15, 25], spirit: 15, prefix: ['千年', '玄铁', '紫炎', '寒冰', '鬼面', '铁甲', '幻影', '血手', '噬魂', '飞天'] },
    { name: '金丹', minLv: 20, maxLv: 29, hpRange: [800, 1500], atkRange: [40, 60], spirit: 40, prefix: ['三眼', '六臂', '吞天', '覆海', '裂地', '万古', '不灭', '修罗', '九幽', '太上'] },
    { name: '元婴', minLv: 30, maxLv: 39, hpRange: [4000, 8000], atkRange: [80, 120], spirit: 100, prefix: ['洪荒', '混沌', '造化', '涅槃', '虚空', '星辰', '昊天', '元始', '寂灭', '无相'] },
];

const ENEMY_BASE_NAMES = ['妖狼', '巨蟒', '魔猿', '剑修', '散人', '鬼王', '灵狐', '石魔', '花妖', '巨虫'];

ENEMY_REALM_CONFIG.forEach((config) => {
    // Generate 10 enemies for this realm
    for (let i = 0; i < 10; i++) {
        const level = randInt(config.minLv, config.maxLv);
        const name = `${randPick(config.prefix)}${ENEMY_BASE_NAMES[i % ENEMY_BASE_NAMES.length]}`;
        
        // Random main element
        const mainElement = Object.values(ElementType)[randInt(0, 10)];
        const affs = createZeroElementStats();
        // Give them plenty of element affinity so they can cast cards
        affs[mainElement] = 50 + (level * 10);
        
        // Pick random cards suitable for this level
        const validCards = INITIAL_CARDS.filter(c => c.reqLevel <= level + 2); // Can use cards slightly above level
        const deck: string[] = [];
        const deckSize = 3 + Math.floor(level / 10); // Higher level enemies have larger decks
        
        if (validCards.length > 0) {
            for(let k=0; k<deckSize; k++) {
                deck.push(randPick(validCards).id);
            }
        } else {
             deck.push('c_strike');
        }

        GENERATED_ENEMIES.push({
            name: name,
            minPlayerLevel: config.minLv,
            baseStats: {
                maxHp: randInt(config.hpRange[0], config.hpRange[1]),
                hp: randInt(config.hpRange[0], config.hpRange[1]),
                maxSpirit: config.spirit,
                spirit: config.spirit,
                attack: randInt(config.atkRange[0], config.atkRange[1]),
                defense: Math.floor(level / 2),
                speed: 8 + Math.floor(level / 2),
                elementalAffinities: affs
            },
            cardIds: deck
        });
    }
});


export const INITIAL_ENEMY_TEMPLATES: EnemyTemplate[] = [
  // Basic Start Enemies
  {
    name: '野猪',
    baseStats: { maxHp: 60, hp: 60, maxSpirit: 10, spirit: 10, attack: 6, defense: 0, speed: 8, elementalAffinities: { ...createZeroElementStats(), [ElementType.EARTH]: 2 } },
    cardIds: ['c_strike'],
    minPlayerLevel: 1,
  },
  {
    name: '青蛇',
    baseStats: { maxHp: 50, hp: 50, maxSpirit: 10, spirit: 10, attack: 8, defense: 0, speed: 12, elementalAffinities: { ...createZeroElementStats(), [ElementType.WOOD]: 3 } },
    cardIds: ['c_strike', 'c_strike'],
    minPlayerLevel: 1,
  },
  // Generated Enemies
  ...GENERATED_ENEMIES
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
    // Basic affinity so players can use starter cards
    elementalAffinities: {
        [ElementType.METAL]: 5,
        [ElementType.WOOD]: 5,
        [ElementType.WATER]: 5,
        [ElementType.FIRE]: 5,
        [ElementType.EARTH]: 5,
        [ElementType.LIGHT]: 1,
        [ElementType.DARK]: 1,
        [ElementType.WIND]: 1,
        [ElementType.THUNDER]: 1,
        [ElementType.ICE]: 1,
        [ElementType.SWORD]: 10,
    }
  },
};

export const generatePlayerFromConfig = (config: GameConfig): Player => {
  const deck = config.playerInitialDeckIds
    .map(id => config.cards.find(c => c.id === id))
    .filter((c): c is Card => !!c);

  if (deck.length === 0 && config.cards.length > 0) {
      deck.push(config.cards[0]);
  }

  // Deep copy stats to avoid reference issues
  const initialStats: Stats = JSON.parse(JSON.stringify(config.playerInitialStats));

  return {
    id: 'player_1',
    name: '郭郭',
    level: 1,
    avatarUrl: 'https://picsum.photos/seed/cultivator/200/200',
    exp: 0,
    maxExp: config.realms[0]?.expReq || 100,
    gold: 0,
    stats: initialStats,
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
  // Find enemies within a reasonable level range (e.g., playerLevel - 2 to playerLevel + 5)
  // But also include low level enemies if no high level ones exist yet, or just strictly check minPlayerLevel
  // The current logic uses minPlayerLevel. Let's make it a bit more dynamic.
  
  // Filter enemies that have minPlayerLevel <= playerLevel + 1 (so you can fight slightly stronger ones)
  // And minPlayerLevel >= playerLevel - 15 (so you don't fight level 1 boars at level 50)
  
  let possibleEnemies = config.enemies.filter(e => 
      e.minPlayerLevel <= playerLevel + 1 && 
      e.minPlayerLevel >= Math.max(1, playerLevel - 15)
  );
  
  // Fallback: just get anything lower than player level
  if (possibleEnemies.length === 0) {
      possibleEnemies = config.enemies.filter(e => e.minPlayerLevel <= playerLevel);
  }

  // Fallback: Get weakest
  if (possibleEnemies.length === 0) {
     if (config.enemies.length > 0) {
        possibleEnemies = config.enemies.sort((a,b) => a.minPlayerLevel - b.minPlayerLevel).slice(0,1);
     } else {
         return {
             id: 'dummy', name: '影子', level: 1, avatarUrl: '', 
             stats: {hp: 10, maxHp:10, spirit:0, maxSpirit:0, attack:1, defense:0, speed:1, elementalAffinities: createZeroElementStats()}, 
             dropExp:0, dropGold:0, difficulty:1, deck:[]
         }
     }
  }
  
  const template = possibleEnemies[Math.floor(Math.random() * possibleEnemies.length)];
  
  // Small variance in stats
  const difficultyMultiplier = 1 + (Math.random() * 0.2 - 0.1); 
  
  const enemyDeck = template.cardIds
    .map(id => config.cards.find(c => c.id === id))
    .filter((c): c is Card => !!c);
  
  if (enemyDeck.length === 0 && config.cards.length > 0) {
      const levelAppropriateCards = config.cards.filter(c => c.reqLevel <= playerLevel);
      if (levelAppropriateCards.length > 0) {
          enemyDeck.push(levelAppropriateCards[Math.floor(Math.random() * levelAppropriateCards.length)]);
          enemyDeck.push(levelAppropriateCards[Math.floor(Math.random() * levelAppropriateCards.length)]);
      } else {
          enemyDeck.push(config.cards[0]);
      }
  }

  const affs = {...template.baseStats.elementalAffinities};

  return {
    id: `enemy_${Date.now()}`,
    name: template.name,
    level: template.minPlayerLevel, // Use template level as base
    avatarUrl: `https://picsum.photos/seed/${template.name}/200/200`,
    stats: {
      maxHp: Math.floor(template.baseStats.maxHp * difficultyMultiplier),
      hp: Math.floor(template.baseStats.maxHp * difficultyMultiplier),
      maxSpirit: template.baseStats.maxSpirit,
      spirit: template.baseStats.maxSpirit,
      attack: Math.floor(template.baseStats.attack * difficultyMultiplier),
      defense: Math.floor(template.baseStats.defense * difficultyMultiplier),
      speed: Math.floor(template.baseStats.speed * difficultyMultiplier),
      elementalAffinities: affs
    },
    dropExp: 20 * template.minPlayerLevel,
    dropGold: 10 * template.minPlayerLevel,
    difficulty: template.minPlayerLevel,
    deck: enemyDeck
  };
};
