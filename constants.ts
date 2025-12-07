import { Card, CardType, Item, Player, GameConfig, Enemy, EnemyTemplate, RealmRank, EquipmentSlot, Stats, ElementType, RealmLevelConfig } from './types';

export const MAX_HAND_SIZE = 10;
export const DRAW_COUNT_PER_TURN = 7;

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
    [ElementType.METAL]: { color: 'text-yellow-400', icon: '⚙️', bg: 'bg-yellow-900' },
    [ElementType.WOOD]: { color: 'text-green-400', icon: '🌲', bg: 'bg-green-800' },
    [ElementType.WATER]: { color: 'text-blue-400', icon: '💧', bg: 'bg-blue-800' },
    [ElementType.FIRE]: { color: 'text-red-500', icon: '🔥', bg: 'bg-red-900' },
    [ElementType.EARTH]: { color: 'text-[#8B4513]', icon: '⛰️', bg: 'bg-[#3E2723]' }, // Coffee/Brown
    [ElementType.LIGHT]: { color: 'text-yellow-200', icon: '☀️', bg: 'bg-yellow-700' },
    [ElementType.DARK]: { color: 'text-purple-400', icon: '🌑', bg: 'bg-purple-900' },
    [ElementType.WIND]: { color: 'text-teal-300', icon: '💨', bg: 'bg-teal-800' },
    [ElementType.THUNDER]: { color: 'text-indigo-400', icon: '⚡', bg: 'bg-indigo-800' },
    [ElementType.ICE]: { color: 'text-cyan-200', icon: '❄️', bg: 'bg-cyan-800' },
    [ElementType.SWORD]: { color: 'text-slate-200', icon: '⚔️', bg: 'bg-slate-700' },
};

// Helper to generate default levels
const generateLevels = (
    count: number, 
    names: string[], 
    baseExp: number, 
    hp: number, 
    atk: number, 
    def: number, 
    spi: number, 
    spd: number, 
    cost: number,
    chance: number
): RealmLevelConfig[] => {
    return Array.from({ length: count }, (_, i) => ({
        name: names[Math.min(i, names.length - 1)] || `${i+1}层`,
        expReq: baseExp,
        hpGrowth: hp,
        atkGrowth: atk,
        defGrowth: def,
        spiritGrowth: spi,
        speedGrowth: spd,
        breakthroughCost: cost,
        breakthroughChance: chance
    }));
};

export const DEFAULT_REALMS: RealmRank[] = [
  { 
      name: '炼气期', 
      rangeStart: 1, 
      rangeEnd: 10, 
      minGoldDrop: 10, 
      maxGoldDrop: 50,
      levels: generateLevels(
          10, 
          ['一层', '二层', '三层', '四层', '五层', '六层', '七层', '八层', '九层', '大圆满'],
          100, 
          10, 2, 0, 1, 1, 
          50, 1.0 
      )
  },
  { 
      name: '筑基期', 
      rangeStart: 11, 
      rangeEnd: 14, 
      minGoldDrop: 50, 
      maxGoldDrop: 200,
      levels: generateLevels(
          4,
          ['初期', '中期', '后期', '假丹'],
          500,
          50, 8, 2, 3, 2,
          500, 0.8
      )
  },
  { 
      name: '结丹期', 
      rangeStart: 15, 
      rangeEnd: 18, 
      minGoldDrop: 200, 
      maxGoldDrop: 800,
      levels: generateLevels(
          4,
          ['初期', '中期', '后期', '后期巅峰'],
          2000,
          200, 20, 10, 10, 5,
          2000, 0.6
      )
  },
  { 
      name: '元婴期', 
      rangeStart: 19, 
      rangeEnd: 24, 
      minGoldDrop: 1000, 
      maxGoldDrop: 3000,
      levels: generateLevels(
          6,
          ['初期', '初期巅峰', '中期', '中期巅峰', '后期', '后期巅峰'],
          10000,
          1000, 100, 50, 50, 10,
          10000, 0.4
      )
  },
  { 
      name: '化神期', 
      rangeStart: 25, 
      rangeEnd: 30, 
      minGoldDrop: 5000, 
      maxGoldDrop: 10000,
      levels: generateLevels(
          6,
          ['初期', '初期巅峰', '中期', '中期巅峰', '后期', '后期巅峰'],
          50000,
          5000, 500, 200, 100, 20,
          50000, 0.2
      )
  },
];

export const getRealmName = (level: number, realms: RealmRank[] = DEFAULT_REALMS): string => {
    const realm = realms.find(r => level >= r.rangeStart && level <= r.rangeEnd);
    if (realm) {
        const index = level - realm.rangeStart;
        if (realm.levels && realm.levels[index]) {
            return `${realm.name} ${realm.levels[index].name}`;
        }
        return `${realm.name} ${index + 1}层`;
    }
    return `未知境界 Lv.${level}`;
};

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

export const generateSkillBook = (level: number, element: ElementType): Item => {
    const realm = DEFAULT_REALMS.find(r => level >= r.rangeStart && level <= r.rangeEnd) || DEFAULT_REALMS[0];
    const basePrice = 50 * (Math.floor(level / 5) + 1);
    
    return {
        id: `book_${element}_${level}_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        name: `《${element}·${realm.name}心法》`,
        icon: '📖',
        type: 'CONSUMABLE',
        description: `使用后随机领悟一张${realm.name}${element}属性卡牌。`,
        rarity: 'rare',
        reqLevel: realm.rangeStart,
        statBonus: { elementalAffinities: createZeroElementStats() },
        price: basePrice
    };
};

// --- Initial Manual Content ---

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
  reqLevel: 1, // Changed to 1 for starter deck compatibility
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
  icon: '🗡️',
  type: 'EQUIPMENT',
  slot: 'mainWeapon',
  statBonus: { attack: 2, elementalAffinities: { ...createZeroElementStats(), [ElementType.SWORD]: 1, [ElementType.WOOD]: 1 } },
  description: '一把普通的桃木剑，略微提升攻击力与木系亲和。',
  rarity: 'common',
  reqLevel: 1,
  price: 20,
};

export const IRON_SWORD: Item = {
  id: 'eq_iron_sword',
  name: '铁剑',
  icon: '⚔️',
  type: 'EQUIPMENT',
  slot: 'mainWeapon',
  statBonus: { attack: 5, elementalAffinities: { ...createZeroElementStats(), [ElementType.SWORD]: 2, [ElementType.METAL]: 1 } },
  description: '凡铁锻造的剑。',
  rarity: 'common',
  reqLevel: 5,
  price: 100,
};

export const LEATHER_ARMOR: Item = {
  id: 'eq_leather_armor',
  name: '皮甲',
  icon: '🧥',
  type: 'EQUIPMENT',
  slot: 'body',
  statBonus: { defense: 2, elementalAffinities: { ...createZeroElementStats(), [ElementType.EARTH]: 1 } },
  description: '野兽毛皮制成的护甲。',
  rarity: 'common',
  reqLevel: 2,
  price: 50,
};

export const JADE_PENDANT: Item = {
    id: 'eq_jade',
    name: '灵玉佩',
    icon: '🧿',
    type: 'ARTIFACT',
    slot: 'accessory',
    statBonus: { maxSpirit: 2, elementalAffinities: { ...createZeroElementStats(), [ElementType.WATER]: 1, [ElementType.WOOD]: 1 } },
    description: '温润的玉佩，能滋养神识。',
    rarity: 'rare',
    reqLevel: 3,
    price: 300,
};

const MANUAL_ITEMS = [WOODEN_SWORD, IRON_SWORD, LEATHER_ARMOR, JADE_PENDANT];

// --- Procedural Generation Content ---

const GENERATED_CARDS: Card[] = [];
const GENERATED_ITEMS: Item[] = [];
const GENERATED_BOOKS: Item[] = [];
const GENERATED_ALCHEMY_ITEMS: Item[] = [];
const GENERATED_FORGE_ITEMS: Item[] = [];
const GENERATED_TALISMAN_ITEMS: Item[] = [];

// Adjusted Levels for New Realm Ranges
const REALMS_GEN_CONFIG = [
    { name: '炼气', level: 1, limit: 10, prefix: '凡品' },
    { name: '筑基', level: 11, limit: 20, prefix: '灵品' },
    { name: '结丹', level: 15, limit: 50, prefix: '玄品' },
    { name: '元婴', level: 19, limit: 100, prefix: '地品' },
    { name: '化神', level: 25, limit: 200, prefix: '天品' },
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

const ICON_POOLS: Record<EquipmentSlot, string[]> = {
    mainWeapon: ['⚔️', '🗡️', '🪓', '🏹', '🪄', '📏', '🥢'],
    offWeapon: ['🛡️', '📛', '📜', '🏺'],
    head: ['🪖', '👑', '🧢', '🎩', '⛑️'],
    body: ['👕', '🥋', '🎽', '🧥', '👚'],
    legs: ['👖', '🩳', '👗'],
    feet: ['👞', '👢', '👟', '👡'],
    neck: ['📿', '🏅', '🎖️'],
    accessory: ['🧿', '🔮', '🏮', '🪞', '🔔'],
    ring: ['💍', '💎'],
    belt: ['🎗️', '🥋']
};

const MATERIAL_NAMES = ['灵草', '妖丹', '矿石', '灵泉', '火精', '异木', '玄铁', '玉髓', '兽骨', '魂石'];
const MATERIAL_ICONS = ['🌿', '🔮', '🪨', '💧', '🔥', '🪵', '⚒️', '💎', '🦴', '👻'];

const FORGE_MAT_NAMES = ['精铁', '赤铜', '星砂', '秘银', '寒铁', '雷木', '金精', '龙鳞', '凤羽', '定海石'];
const FORGE_MAT_ICONS = ['🧱', '🔶', '✨', '💿', '🧊', '⚡', '🔱', '🐉', '🪶', '🗿'];
const ARTIFACT_NAMES = ['混元珠', '照妖镜', '翻天印', '紫金铃', '捆仙绳'];
const ARTIFACT_ICONS = ['🔮', '🪞', '🧱', '🔔', '🎗️'];

const PILL_TYPES = [
    { name: '大力丸', stat: 'attack', icon: '🔴' },
    { name: '护体丹', stat: 'defense', icon: '🛡️' },
    { name: '益寿丹', stat: 'maxHp', icon: '❤️' },
    { name: '养神丹', stat: 'maxSpirit', icon: '🌀' },
    { name: '神行丹', stat: 'speed', icon: '👟' },
    // 5 Element pills
    { name: '金灵丹', element: ElementType.METAL, icon: '🌕' },
    { name: '木灵丹', element: ElementType.WOOD, icon: '🌲' },
    { name: '水灵丹', element: ElementType.WATER, icon: '💧' },
    { name: '火灵丹', element: ElementType.FIRE, icon: '🔥' },
    { name: '土灵丹', element: ElementType.EARTH, icon: '🧱' },
];

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

REALMS_GEN_CONFIG.forEach((realm, rIdx) => {
    // 1. Cards Generation
    for (let i = 0; i < 10; i++) {
        let type;
        if (i < 3) {
            type = CardType.ATTACK;
        } else {
            type = Object.values(CardType)[randInt(0, 3)]; 
        }

        const element = Object.values(ElementType)[randInt(0, 10)];
        const isPierce = type === CardType.ATTACK && Math.random() < 0.2;
        
        const val = randInt(Math.max(1, Math.floor(realm.limit * 0.3)), realm.limit);
        
        let cost = 1;
        const powerRatio = val / realm.limit;
        if (realm.limit <= 10) cost = powerRatio > 0.8 ? 2 : 1;
        else if (realm.limit <= 20) cost = randInt(1, 2);
        else cost = randInt(1, 4);
        if (cost > 5) cost = 5;

        const elemCost = Math.max(1, Math.floor(cost * (0.5 + Math.random() * 0.5)));

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

    // 2. Growth Cards
    Object.values(ElementType).forEach((element, idx) => {
        const val = Math.max(1, Math.floor(realm.limit * 0.2)); 
        GENERATED_CARDS.push({
            id: `gen_c_growth_${realm.level}_${element}`,
            name: `${realm.prefix}·${element}源`,
            cost: 1,
            element: element,
            elementCost: 1,
            type: CardType.GROWTH,
            value: val,
            description: `本场战斗中，${element}属性上限增加${val}点，并恢复等量属性。`,
            rarity: 'rare',
            reqLevel: realm.level,
            tags: []
        });
    });

    // 3. Items Generation
    for (let i = 0; i < 10; i++) {
        const slot = EQUIP_SLOTS_LIST[i % EQUIP_SLOTS_LIST.length]; 
        const slotName = randPick(EQUIP_NAMES[slot]);
        const icon = randPick(ICON_POOLS[slot]);
        const rarity = i > 7 ? 'legendary' : i > 5 ? 'epic' : i > 3 ? 'rare' : 'common';
        
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
        
        const numElements = randInt(1, 2);
        for(let e=0; e<numElements; e++) {
            const el = Object.values(ElementType)[randInt(0, 10)];
            const bonus = Math.max(1, Math.floor(realm.limit * 0.1));
            // @ts-ignore
            statBonus.elementalAffinities[el] += bonus;
        }

        const itemName = `${realm.prefix}·${slotName}`;
        const rarityMultipliers = { common: 10, rare: 50, epic: 200, legendary: 1000 };
        const price = Math.floor(realm.level * rarityMultipliers[rarity] + randInt(0, 50));

        GENERATED_ITEMS.push({
            id: `gen_eq_${realm.level}_${i}`,
            name: itemName,
            icon: icon,
            type: 'EQUIPMENT',
            slot: slot,
            statBonus: statBonus,
            description: `${realm.name}修士使用的${slotName}。蕴含五行之力。`,
            rarity: rarity,
            reqLevel: realm.level,
            price: price
        });
    }

    // 4. Skill Books
    Object.values(ElementType).forEach(elem => {
        GENERATED_BOOKS.push(generateSkillBook(realm.level, elem));
    });

    // 5. Alchemy Generation (Materials, Pills, Recipes)
    
    // 5a. Materials (10 per realm)
    const realmMaterials: Item[] = [];
    for(let m=0; m<10; m++) {
        const matName = `${realm.name}${MATERIAL_NAMES[m]}`;
        const mat: Item = {
            id: `mat_${realm.level}_${m}`,
            name: matName,
            icon: MATERIAL_ICONS[m],
            type: 'MATERIAL',
            description: `产自${realm.name}的${MATERIAL_NAMES[m]}，是炼制${realm.name}丹药的材料。`,
            rarity: m > 7 ? 'epic' : m > 4 ? 'rare' : 'common',
            reqLevel: realm.level,
            price: (m + 1) * 10 * Math.ceil(realm.level/5),
            statBonus: { elementalAffinities: createZeroElementStats() }
        };
        realmMaterials.push(mat);
        GENERATED_ALCHEMY_ITEMS.push(mat);
    }

    // 5b. Pills & Recipes (10 types per realm)
    PILL_TYPES.forEach((pt, idx) => {
        const isElement = !!pt.element;
        // Pill Stat Calculation
        const statBonus: Partial<Stats> = { elementalAffinities: createZeroElementStats() };
        let desc = "";
        let val = 0;
        
        if (isElement) {
             val = Math.max(1, Math.floor(realm.limit * 0.1));
             // @ts-ignore
             statBonus.elementalAffinities[pt.element] = val;
             desc = `永久增加${val}点${pt.element}属性亲和。`;
        } else {
             val = Math.max(1, Math.floor(realm.limit * 0.1));
             // HP needs higher scaling
             if (pt.stat === 'maxHp') val *= 10;
             if (pt.stat === 'attack') val = Math.max(1, Math.floor(val / 2));
             // @ts-ignore
             statBonus[pt.stat] = val;
             desc = `永久增加${val}点${pt.name.replace('丹','')}。`;
        }

        const pillId = `pill_${realm.level}_${idx}`;
        const pill: Item = {
            id: pillId,
            name: `${realm.prefix}·${pt.name}`,
            icon: pt.icon,
            type: 'PILL',
            description: desc,
            rarity: 'rare',
            reqLevel: realm.level,
            price: 500 * Math.ceil(realm.level / 5),
            statBonus: statBonus,
            maxUsage: 10 // Hardcap usage
        };
        GENERATED_ALCHEMY_ITEMS.push(pill);

        // Recipe
        // Pick 2-4 random materials from THIS realm
        const matCount = randInt(2, 4);
        const recipeMaterials = [];
        for(let k=0; k<matCount; k++) {
             const mat = randPick(realmMaterials);
             recipeMaterials.push({ itemId: mat.id, count: randInt(1, 3) });
        }

        const recipe: Item = {
            id: `recipe_${realm.level}_${idx}`,
            name: `丹方: ${pill.name}`,
            icon: '📜',
            type: 'RECIPE',
            description: `记录了炼制${pill.name}的方法。需: ${recipeMaterials.map(rm => {
                const m = realmMaterials.find(x => x.id === rm.itemId);
                return `${m?.name}x${rm.count}`;
            }).join(', ')}`,
            rarity: 'rare',
            reqLevel: realm.level,
            price: pill.price * 2,
            statBonus: { elementalAffinities: createZeroElementStats() },
            recipeResult: pillId,
            recipeMaterials: recipeMaterials,
            successRate: 0.5 + (Math.random() * 0.4) // 50% - 90%
        };
        GENERATED_ALCHEMY_ITEMS.push(recipe);
    });

    // 6. Forge Generation (Materials, Blueprints, Artifacts)
    
    // 6a. Forge Materials (10 per realm)
    const forgeMaterials: Item[] = [];
    for(let m=0; m<10; m++) {
        const matName = `${realm.name}${FORGE_MAT_NAMES[m]}`;
        const mat: Item = {
            id: `fmat_${realm.level}_${m}`,
            name: matName,
            icon: FORGE_MAT_ICONS[m],
            type: 'FORGE_MATERIAL',
            description: `产自${realm.name}的${FORGE_MAT_NAMES[m]}，是炼制${realm.name}法宝的珍贵材料。`,
            rarity: m > 7 ? 'epic' : m > 4 ? 'rare' : 'common',
            reqLevel: realm.level,
            price: (m + 1) * 20 * Math.ceil(realm.level/5),
            statBonus: { elementalAffinities: createZeroElementStats() }
        };
        forgeMaterials.push(mat);
        GENERATED_FORGE_ITEMS.push(mat);
    }

    // 6b. Artifacts & Blueprints (5 per realm)
    ARTIFACT_NAMES.forEach((an, idx) => {
        const artId = `art_${realm.level}_${idx}`;
        const bonus = Math.max(1, Math.floor(realm.limit * 0.2));
        
        // Random stats for artifact
        const statBonus: Partial<Stats> = { 
            elementalAffinities: createZeroElementStats(),
            maxSpirit: randInt(5, 10) * Math.ceil(realm.level/5),
            attack: randInt(1, realm.limit),
            defense: randInt(1, Math.ceil(realm.limit/2))
        };

        const artifact: Item = {
            id: artId,
            name: `${realm.prefix}·${an}`,
            icon: ARTIFACT_ICONS[idx],
            type: 'ARTIFACT',
            slot: 'accessory', // Just a default, artifacts use special slots anyway
            description: `炼制而成的${realm.name}本命法宝，威力不俗。`,
            rarity: 'epic',
            reqLevel: realm.level,
            price: 2000 * Math.ceil(realm.level / 5),
            statBonus: statBonus
        };
        GENERATED_FORGE_ITEMS.push(artifact);

        // Blueprint
        const matCount = randInt(2, 4);
        const forgeRequirements = [];
        for(let k=0; k<matCount; k++) {
             const mat = randPick(forgeMaterials);
             forgeRequirements.push({ itemId: mat.id, count: randInt(2, 5) });
        }

        const blueprint: Item = {
            id: `bp_${realm.level}_${idx}`,
            name: `图纸: ${artifact.name}`,
            icon: '🗺️',
            type: 'FORGE_BLUEPRINT',
            description: `记录了打造${artifact.name}的方法。需: ${forgeRequirements.map(rm => {
                const m = forgeMaterials.find(x => x.id === rm.itemId);
                return `${m?.name}x${rm.count}`;
            }).join(', ')}`,
            rarity: 'rare',
            reqLevel: realm.level,
            price: artifact.price * 0.5,
            statBonus: { elementalAffinities: createZeroElementStats() },
            recipeResult: artId,
            recipeMaterials: forgeRequirements,
            successRate: 0.4 + (Math.random() * 0.3) // 40% - 70%
        };
        GENERATED_FORGE_ITEMS.push(blueprint);
    });

    // 7. Talisman (Pens and Papers)
    
    // 7a. Papers
    const paper: Item = {
        id: `paper_${realm.level}`,
        name: `${realm.name}符纸`,
        icon: '🟨',
        type: 'TALISMAN_PAPER',
        description: `产自${realm.name}的灵纸，可承载${realm.name}期的法术。`,
        rarity: 'common',
        reqLevel: realm.level,
        price: 20 * Math.ceil(realm.level/5),
        statBonus: { elementalAffinities: createZeroElementStats() }
    };
    GENERATED_TALISMAN_ITEMS.push(paper);

    // 7b. Pens
    const penDurability = 10 * (rIdx + 1);
    const pen: Item = {
        id: `pen_${realm.level}`,
        name: `${realm.prefix}符笔`,
        icon: '🖌️',
        type: 'TALISMAN_PEN',
        description: `${realm.name}修士常用的符笔。耐久度: ${penDurability}。`,
        rarity: 'rare',
        reqLevel: realm.level,
        price: 500 * Math.ceil(realm.level/5),
        maxDurability: penDurability,
        durability: penDurability,
        statBonus: { elementalAffinities: createZeroElementStats() }
    };
    GENERATED_TALISMAN_ITEMS.push(pen);

});

export const INITIAL_CARDS = [...MANUAL_CARDS, ...GENERATED_CARDS];
export const INITIAL_ITEMS = [...MANUAL_ITEMS, ...GENERATED_ITEMS, ...GENERATED_BOOKS, ...GENERATED_ALCHEMY_ITEMS, ...GENERATED_FORGE_ITEMS, ...GENERATED_TALISMAN_ITEMS];

// --- Procedural Generation: Enemies ---

const GENERATED_ENEMIES: EnemyTemplate[] = [];
const ENEMY_REALM_CONFIG = [
    { name: '炼气', minLv: 1, maxLv: 10, hpRange: [30, 80], atkRange: [3, 8], spirit: 5, elementLimit: 5, prefix: ['狂暴', '变异', '剧毒', '赤血', '幽暗', '灵动', '坚硬', '疾风', '魔化', '幼年'] },
    { name: '筑基', minLv: 11, maxLv: 14, hpRange: [150, 300], atkRange: [15, 25], spirit: 15, elementLimit: 20, prefix: ['千年', '玄铁', '紫炎', '寒冰', '鬼面', '铁甲', '幻影', '血手', '噬魂', '飞天'] },
    { name: '结丹', minLv: 15, maxLv: 18, hpRange: [800, 1500], atkRange: [40, 60], spirit: 40, elementLimit: 50, prefix: ['三眼', '六臂', '吞天', '覆海', '裂地', '万古', '不灭', '修罗', '九幽', '太上'] },
    { name: '元婴', minLv: 19, maxLv: 24, hpRange: [4000, 8000], atkRange: [80, 120], spirit: 100, elementLimit: 100, prefix: ['洪荒', '混沌', '造化', '涅槃', '虚空', '星辰', '昊天', '元始', '寂灭', '无相'] },
    { name: '化神', minLv: 25, maxLv: 30, hpRange: [20000, 50000], atkRange: [200, 400], spirit: 200, elementLimit: 200, prefix: ['太古', '灭世', '诛仙', '神魔', '永恒'] },
];

const ENEMY_BASE_NAMES = ['妖狼', '巨蟒', '魔猿', '剑修', '散人', '鬼王', '灵狐', '石魔', '花妖', '巨虫'];

ENEMY_REALM_CONFIG.forEach((config) => {
    for (let i = 0; i < 10; i++) {
        const level = randInt(config.minLv, config.maxLv);
        const name = `${randPick(config.prefix)}${ENEMY_BASE_NAMES[i % ENEMY_BASE_NAMES.length]}`;
        
        const realmAttackCards = INITIAL_CARDS.filter(c => 
            c.type === CardType.ATTACK && 
            c.reqLevel >= config.minLv && 
            c.reqLevel <= config.maxLv + 2
        );

        let mainElement: ElementType;
        let primaryCardId: string;

        if (realmAttackCards.length > 0) {
            const card = randPick(realmAttackCards);
            mainElement = card.element;
            primaryCardId = card.id;
        } else {
             const anyAttack = INITIAL_CARDS.filter(c => c.type === CardType.ATTACK && c.reqLevel <= level);
             if (anyAttack.length > 0) {
                 const card = randPick(anyAttack);
                 mainElement = card.element;
                 primaryCardId = card.id;
             } else {
                 mainElement = ElementType.SWORD;
                 primaryCardId = 'c_strike';
             }
        }

        const affs = createZeroElementStats();
        affs[mainElement] = randInt(Math.floor(config.elementLimit * 0.5), config.elementLimit);
        
        const deck: string[] = [primaryCardId];
        const deckSize = 3 + Math.floor(level / 5);
        
        const validCards = INITIAL_CARDS.filter(c => c.reqLevel <= level + 1); 
        
        if (validCards.length > 0) {
            for(let k=1; k<deckSize; k++) {
                deck.push(randPick(validCards).id);
            }
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
  ...GENERATED_ENEMIES
];

export const DEFAULT_GAME_CONFIG: GameConfig = {
  itemDropRate: 0.3,
  maps: [
      {
          id: 'map_village',
          name: '新手村后山',
          icon: '🏞️',
          description: '灵气稀薄之地，有一些野兽出没，适合初入修仙界的菜鸟。',
          reqLevel: 1,
          nodeCount: 12,
          eventWeights: { merchant: 0.15, treasure: 0.25, battle: 0.3, empty: 0.3 }
      },
      {
          id: 'map_forest',
          name: '迷雾森林',
          icon: '🌲',
          description: '常年被迷雾笼罩，深处有妖兽盘踞，筑基期修士的试炼场。',
          reqLevel: 11,
          nodeCount: 16,
          eventWeights: { merchant: 0.1, treasure: 0.3, battle: 0.4, empty: 0.2 }
      },
      {
          id: 'map_canyon',
          name: '烈风峡谷',
          icon: '🏜️',
          description: '狂风肆虐的峡谷，这里的天材地宝更多，但危险也随之增加。',
          reqLevel: 15,
          nodeCount: 20,
          eventWeights: { merchant: 0.05, treasure: 0.35, battle: 0.5, empty: 0.1 }
      },
      {
          id: 'map_ruins',
          name: '上古遗迹',
          icon: '🏛️',
          description: '上古大能留下的洞府遗迹，机缘与死亡并存。',
          reqLevel: 19,
          nodeCount: 25,
          eventWeights: { merchant: 0.05, treasure: 0.4, battle: 0.5, empty: 0.05 }
      }
  ],
  items: INITIAL_ITEMS,
  cards: INITIAL_CARDS,
  enemies: INITIAL_ENEMY_TEMPLATES,
  realms: DEFAULT_REALMS,
  artifactSlotConfigs: [
      { id: 0, reqLevel: 1, cost: 0 },
      { id: 1, reqLevel: 10, cost: 1000 },
      { id: 2, reqLevel: 20, cost: 5000 },
      { id: 3, reqLevel: 30, cost: 20000 },
      { id: 4, reqLevel: 40, cost: 100000 },
  ],
  // Increased Initial Deck to 24 Cards, ALL Level 1
  playerInitialDeckIds: [
      'c_strike', 'c_strike', 'c_strike', 'c_strike', 'c_strike', 'c_strike', 'c_strike', 'c_strike', 'c_strike', 'c_strike', 
      'c_defend', 'c_defend', 'c_defend', 'c_defend', 'c_defend', 'c_defend', 'c_defend', 'c_defend',
      'c_meditate', 'c_meditate', 'c_meditate', 'c_meditate',
      'c_heal', 'c_heal'
  ],
  playerInitialStats: {
    maxHp: 100,
    hp: 100,
    maxSpirit: 5,
    spirit: 5,
    attack: 5,
    defense: 0,
    speed: 10,
    elementalAffinities: {
        [ElementType.METAL]: 1,
        [ElementType.WOOD]: 1,
        [ElementType.WATER]: 1,
        [ElementType.FIRE]: 1,
        [ElementType.EARTH]: 1,
        [ElementType.LIGHT]: 1,
        [ElementType.DARK]: 1,
        [ElementType.WIND]: 1,
        [ElementType.THUNDER]: 1,
        [ElementType.ICE]: 1,
        [ElementType.SWORD]: 1,
    }
  }
};

export const generatePlayerFromConfig = (config: GameConfig): Player => {
  const deck = config.playerInitialDeckIds
    .map(id => config.cards.find(c => c.id === id))
    .filter((c): c is Card => !!c);
    
  // Fallback if config deck is broken
  if (deck.length === 0 && config.cards.length > 0) {
      deck.push(config.cards[0]);
  }

  const initialStats: Stats = JSON.parse(JSON.stringify(config.playerInitialStats));
  const firstRealm = config.realms[0];
  const firstLevelExp = firstRealm && firstRealm.levels[0] ? firstRealm.levels[0].expReq : 100;

  return {
    id: 'player_1',
    name: '郭郭',
    level: 1,
    avatarUrl: 'https://picsum.photos/seed/cultivator/200/200',
    exp: 0,
    maxExp: firstLevelExp,
    gold: 0,
    stats: initialStats,
    deck: deck,
    cardStorage: [], // Initialize empty storage
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
    // Initialize Artifacts
    artifacts: Array(config.artifactSlotConfigs.length).fill(null),
    unlockedArtifactCount: 1, // Default 1 unlocked
    learnedRecipes: [],
    pillUsage: {},
    learnedBlueprints: [],
    talismansInDeck: [] // Initialize empty talisman deck
  };
};

export const getRandomEnemyFromConfig = (playerLevel: number, config: GameConfig): Enemy => {
  let possibleEnemies = config.enemies.filter(e => 
      e.minPlayerLevel <= playerLevel + 1 && 
      e.minPlayerLevel >= Math.max(1, playerLevel - 3)
  );
  
  if (possibleEnemies.length === 0) {
      possibleEnemies = config.enemies.filter(e => e.minPlayerLevel <= playerLevel);
  }

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
  const difficultyMultiplier = 1 + (Math.random() * 0.2 - 0.1); 
  
  const enemyDeck = template.cardIds
    .map(id => config.cards.find(c => c.id === id))
    .filter((c): c is Card => !!c);
  
  if (enemyDeck.length === 0 && config.cards.length > 0) {
      let mainAffinity = ElementType.SWORD;
      let maxAff = -1;
      // @ts-ignore
      Object.entries(template.baseStats.elementalAffinities).forEach(([k,v]) => {
          if ((v as number) > maxAff) {
              maxAff = v as number;
              mainAffinity = k as ElementType;
          }
      });

      const affinityCards = config.cards.filter(c => c.element === mainAffinity && c.type === CardType.ATTACK && c.reqLevel <= playerLevel + 1);
      if (affinityCards.length > 0) {
          enemyDeck.push(randPick(affinityCards));
      } else {
          enemyDeck.push(config.cards[0]);
      }
      
      const levelAppropriateCards = config.cards.filter(c => c.reqLevel <= playerLevel);
      if (levelAppropriateCards.length > 0) {
          enemyDeck.push(levelAppropriateCards[Math.floor(Math.random() * levelAppropriateCards.length)]);
      }
  }

  const affs = {...template.baseStats.elementalAffinities};

  return {
    id: `enemy_${Date.now()}`,
    name: template.name,
    level: template.minPlayerLevel, 
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