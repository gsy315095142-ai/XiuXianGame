import React, { useState, useEffect } from 'react';
import { Player, Item, RealmRank, EquipmentSlot, ElementType, GameMap, ArtifactSlotConfig, Card } from '../types';
import { getRealmName, SLOT_NAMES, ELEMENT_CONFIG } from '../constants';
import { Button } from './Button';
import { CardItem } from './CardItem';

const StatRow = ({ label, value, icon, color }: { label: string, value: string | number, icon: string, color: string }) => (
  <div className="flex justify-between items-center bg-slate-800 p-2 rounded-lg border border-slate-700/50">
    <span className="text-slate-400 font-bold flex items-center gap-2 text-sm">
        <span className="text-lg">{icon}</span> {label}
    </span>
    <span className={`font-mono font-bold text-lg ${color}`}>{value}</span>
  </div>
);

const EquipSlot: React.FC<{ label: string; item: Item | null }> = ({ label, item }) => (
    <div className="flex items-center gap-3 bg-slate-800 p-2.5 rounded-xl border border-slate-600 shadow-sm hover:bg-slate-700/80 transition-colors cursor-help group min-h-[72px]">
        <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-500 text-2xl shrink-0 shadow-inner group-hover:border-emerald-500 transition-colors">
            {item ? (item.icon || '🛡️') : <span className="text-xs text-slate-600 font-bold text-center leading-tight opacity-50">{label.slice(0,2)}</span>}
        </div>
        <div className="flex-1 overflow-hidden min-w-0 flex flex-col justify-center">
            {item ? (
                <>
                    <div className={`font-bold text-sm truncate ${item.rarity === 'legendary' ? 'text-amber-400' : item.rarity === 'epic' ? 'text-purple-400' : item.rarity === 'rare' ? 'text-blue-300' : 'text-white'}`}>
                        {item.name} <span className="text-[10px] text-slate-500 font-normal ml-1">Lv.{item.reqLevel}</span>
                    </div>
                    
                    {/* Detailed Stats Display */}
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                        {!!item.statBonus?.attack && <span className="text-[10px] font-mono text-amber-400">攻+{item.statBonus.attack}</span>}
                        {!!item.statBonus?.defense && <span className="text-[10px] font-mono text-slate-300">防+{item.statBonus.defense}</span>}
                        {!!item.statBonus?.maxHp && <span className="text-[10px] font-mono text-red-400">血+{item.statBonus.maxHp}</span>}
                        {!!item.statBonus?.maxSpirit && <span className="text-[10px] font-mono text-blue-400">神+{item.statBonus.maxSpirit}</span>}
                        {!!item.statBonus?.speed && <span className="text-[10px] font-mono text-emerald-400">速+{item.statBonus.speed}</span>}
                        
                        {item.statBonus?.elementalAffinities && Object.entries(item.statBonus.elementalAffinities).map(([key, value]) => {
                            const val = value as number;
                            if (val <= 0) return null;
                            const elem = key as ElementType;
                            const config = ELEMENT_CONFIG[elem];
                            return (
                                <span key={key} className={`text-[10px] font-mono flex items-center gap-0.5 ${config?.color || 'text-white'}`}>
                                    {config?.icon} {val}
                                </span>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="text-slate-500 text-xs font-bold">{label} - 空</div>
            )}
        </div>
    </div>
);

interface HomeViewProps {
  player: Player;
  realms: RealmRank[];
  maps: GameMap[]; 
  onStartAdventure: (map: GameMap) => void;
  onEquipItem: (item: Item) => void;
  onUseItem: (item: Item) => void;
  onEndGame: () => void;
  onBreakthrough: () => void;
  onRefine: (recipeId: string, materials: {itemId: string, count: number}[]) => void;
  onCraft: (blueprintId: string, materials: {itemId: string, count: number}[]) => void;
  onCraftTalisman: (cardId: string, penId: string, paperId: string) => void; 
  onManageDeck: (action: 'TO_STORAGE' | 'TO_DECK' | 'TALISMAN_TO_DECK' | 'TALISMAN_TO_INVENTORY', index: number) => void; 
  isRefining: boolean;
  itemsConfig: Item[];
  artifactConfigs?: ArtifactSlotConfig[];
  onUnlockArtifactSlot?: (index: number) => void;
  onUnequipArtifact?: (index: number) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
    player, realms, maps, onStartAdventure, onEquipItem, onUseItem, onEndGame, onBreakthrough, onRefine, onCraft, onCraftTalisman, onManageDeck, isRefining, itemsConfig,
    artifactConfigs = [], onUnlockArtifactSlot, onUnequipArtifact
}) => {
  const [activeMenu, setActiveMenu] = useState<'none' | 'bag' | 'deck' | 'alchemy' | 'forge' | 'talisman' | 'mapSelect'>('none');
  const [selectedRecipe, setSelectedRecipe] = useState<Item | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Item | null>(null);
  
  // Deck Tab State
  const [deckTab, setDeckTab] = useState<'active' | 'storage' | 'talisman'>('active');
  const [deckSortMode, setDeckSortMode] = useState<'DEFAULT' | 'ELEMENT' | 'LEVEL'>('DEFAULT');

  // Talisman State
  const [selectedTalismanCard, setSelectedTalismanCard] = useState<Card | null>(null);
  const [selectedPen, setSelectedPen] = useState<Item | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<Item | null>(null);

  const realmName = getRealmName(player.level, realms);
  
  const expPercentage = Math.min(100, (player.exp / player.maxExp) * 100);
  const canBreakthrough = player.exp >= player.maxExp;
  
  const currentRealm = realms.find(r => player.level >= r.rangeStart && player.level <= r.rangeEnd) || realms[0];
  const levelIndex = player.level - currentRealm.rangeStart;
  const levelConfig = currentRealm.levels[levelIndex];

  const currentRealmIndex = realms.indexOf(currentRealm);
  // Realms 0 (Qi) and 1 (Foundation) use "法器", others use "法宝"
  const isLowRealm = currentRealmIndex <= 1;
  const artifactSystemName = isLowRealm ? '本命法器' : '本命法宝';
  const artifactUnitName = isLowRealm ? '法器' : '法宝';

  const breakthroughCost = levelConfig ? levelConfig.breakthroughCost : 0;
  const breakthroughChance = levelConfig ? (levelConfig.breakthroughChance * 100) : 0;
  
  const alchemyUnlockLevel = 5; 
  const forgeUnlockLevel = 11; 
  const talismanUnlockLevel = 4;

  const isAlchemyUnlocked = player.level >= alchemyUnlockLevel;
  const isForgeUnlocked = player.level >= forgeUnlockLevel;
  const isTalismanUnlocked = player.level >= talismanUnlockLevel;

  const equipmentSlots: EquipmentSlot[] = [
    'mainWeapon', 'offWeapon', 
    'head', 'body', 
    'belt', 'legs', 
    'feet', 'neck', 
    'accessory', 'ring'
  ];

  const primaryElements = [ElementType.METAL, ElementType.WOOD, ElementType.WATER, ElementType.FIRE, ElementType.EARTH];
  const secondaryElements = [ElementType.LIGHT, ElementType.DARK, ElementType.WIND, ElementType.THUNDER, ElementType.ICE, ElementType.SWORD];

  // Defensive copies
  const inventory = (player.inventory || []).filter(Boolean);
  const deck = (player.deck || []).filter(Boolean);
  const cardStorage = (player.cardStorage || []).filter(Boolean);
  const talismansInDeck = (player.talismansInDeck || []).filter(Boolean);
  const artifacts = (player.artifacts || []).filter(Boolean);
  // Ensure artifact array matches slot config length, fill with null if needed
  const displayArtifacts = [...(player.artifacts || [])];
  while (displayArtifacts.length < artifactConfigs.length) {
      displayArtifacts.push(null);
  }

  const unlockedArtifactCount = player.unlockedArtifactCount || 0;
  const learnedRecipes = player.learnedRecipes || [];
  const learnedBlueprints = player.learnedBlueprints || [];

  // Sorting Helper
  const sortCards = (cards: Card[]) => {
      const sorted = [...cards];
      if (deckSortMode === 'ELEMENT') {
          sorted.sort((a, b) => a.element.localeCompare(b.element));
      } else if (deckSortMode === 'LEVEL') {
          sorted.sort((a, b) => b.reqLevel - a.reqLevel); // Descending Level
      }
      return sorted;
  };

  const displayedDeck = sortCards(deck);
  const displayedStorage = sortCards(cardStorage);

  const learnedRecipesList = learnedRecipes
    .map(rid => itemsConfig.find(i => i.id === rid))
    .filter((i): i is Item => !!i);
  
  const learnedBlueprintsList = learnedBlueprints
    .map(rid => itemsConfig.find(i => i.id === rid))
    .filter((i): i is Item => !!i);

  // Check materials
  const getMaterialStatus = (item: Item) => {
      if (!item.recipeMaterials) return { sufficient: false, mats: [] };
      const mats = item.recipeMaterials.map(rm => {
          const matItem = itemsConfig.find(i => i.id === rm.itemId);
          const ownedCountByName = inventory.filter(i => i.name === matItem?.name).length;
          
          return {
              name: matItem?.name || '未知材料',
              icon: matItem?.icon || '❓',
              needed: rm.count,
              owned: ownedCountByName,
              ok: ownedCountByName >= rm.count,
              id: rm.itemId
          };
      });
      const sufficient = mats.every(m => m.ok);
      return { sufficient, mats };
  };

  const currentRecipeStatus = selectedRecipe ? getMaterialStatus(selectedRecipe) : null;
  const currentBlueprintStatus = selectedBlueprint ? getMaterialStatus(selectedBlueprint) : null;

  // Filter inventory for Talisman Crafting
  const availablePens = inventory.filter(i => i.type === 'TALISMAN_PEN');
  const availablePapers = inventory.filter(i => i.type === 'TALISMAN_PAPER');
  const inventoryTalismans = inventory.filter(i => i.type === 'TALISMAN');

  const canCraftTalisman = selectedTalismanCard && selectedPen && selectedPaper &&
      selectedPen.reqLevel >= selectedTalismanCard.reqLevel &&
      selectedPaper.reqLevel >= selectedTalismanCard.reqLevel &&
      (selectedPen.durability || 0) > 0;

  const hasActionableItems = inventory.some(item => {
      if (!item) return false; 
      if ((item.reqLevel || 999) > player.level) return false;
      if (item.type === 'EQUIPMENT' || item.type === 'ARTIFACT') return true; 
      if (['CONSUMABLE', 'RECIPE', 'PILL', 'FORGE_BLUEPRINT'].includes(item.type)) return true;
      return false;
  });

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] p-6 space-y-6 animate-fade-in overflow-hidden selection:bg-emerald-500 selection:text-white min-w-[1200px] overflow-x-auto">
      {/* Header */}
      <header className="flex items-center justify-between bg-slate-900/90 p-5 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur z-20 shrink-0">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-emerald-900 border-4 border-emerald-500 flex items-center justify-center text-4xl font-bold shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                {player.name.charAt(0)}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-800 text-xs px-2 py-1 rounded-full border border-emerald-400 font-bold text-white">
                Lv.{player.level}
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-emerald-100 tracking-wide">{player.name}</h1>
            <div className="text-lg text-yellow-400 font-mono flex items-center gap-2 mt-1 font-bold">
                <span>💰</span> {player.gold.toLocaleString()} 灵石
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <Button variant="danger" size="lg" onClick={onEndGame} className="px-8 py-3 text-lg font-bold shadow-lg">
                退出游戏
            </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 gap-6 overflow-hidden relative">
        
        {/* Left: Menus */}
        <div className="w-80 flex flex-col gap-4 shrink-0 z-10">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 flex flex-col gap-4 h-full shadow-xl">
                <h3 className="text-slate-400 text-sm font-bold uppercase mb-2 tracking-widest border-b border-slate-600 pb-2">洞府管理</h3>
                <Button 
                    variant={activeMenu === 'bag' ? 'primary' : 'secondary'} 
                    onClick={() => setActiveMenu(activeMenu === 'bag' ? 'none' : 'bag')}
                    className="justify-start text-xl py-5 px-6 relative"
                >
                    <span className="mr-3 text-2xl">🎒</span> 储物袋
                    {hasActionableItems && (
                        <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red]"></span>
                    )}
                </Button>
                <Button 
                    variant={activeMenu === 'deck' ? 'primary' : 'secondary'} 
                    onClick={() => setActiveMenu(activeMenu === 'deck' ? 'none' : 'deck')}
                    className="justify-start text-xl py-5 px-6"
                >
                    <span className="mr-3 text-2xl">🎴</span> 本命卡组
                </Button>
                <div className="h-px bg-slate-700 my-2"></div>
                <Button 
                    variant={activeMenu === 'talisman' ? 'primary' : 'secondary'} 
                    onClick={() => isTalismanUnlocked ? setActiveMenu(activeMenu === 'talisman' ? 'none' : 'talisman') : null}
                    className={`justify-start text-xl py-5 px-6 ${!isTalismanUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={!isTalismanUnlocked ? '需炼气四层解锁' : ''}
                >
                     <span className="mr-3 text-2xl">🖌️</span> 制符台 {!isTalismanUnlocked && <span className="text-sm ml-auto">🔒 4级解锁</span>}
                </Button>
                <Button 
                    variant={activeMenu === 'alchemy' ? 'primary' : 'secondary'} 
                    onClick={() => isAlchemyUnlocked ? setActiveMenu(activeMenu === 'alchemy' ? 'none' : 'alchemy') : null}
                    className={`justify-start text-xl py-5 px-6 ${!isAlchemyUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={!isAlchemyUnlocked ? '需炼气五层解锁' : ''}
                >
                     <span className="mr-3 text-2xl">🔥</span> 炼丹房 {!isAlchemyUnlocked && <span className="text-sm ml-auto">🔒 5级解锁</span>}
                </Button>
                <Button 
                    variant={activeMenu === 'forge' ? 'primary' : 'secondary'} 
                    onClick={() => isForgeUnlocked ? setActiveMenu(activeMenu === 'forge' ? 'none' : 'forge') : null}
                    className={`justify-start text-xl py-5 px-6 ${!isForgeUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={!isForgeUnlocked ? '需筑基期解锁' : ''}
                >
                     <span className="mr-3 text-2xl">⚒️</span> 炼器房 {!isForgeUnlocked && <span className="text-sm ml-auto">🔒 筑基解锁</span>}
                </Button>
            </div>
        </div>

        {/* Center: Visual Scene */}
        <div className="flex-1 relative rounded-3xl border-2 border-emerald-900 overflow-hidden bg-black flex flex-col items-center justify-center shadow-2xl group min-w-0">
            <img src="https://res.cloudinary.com/daily-now/image/upload/f_auto,q_auto/v1/posts/e424269229e3943e067f938c53df28d8?_a=BAMCkGwi0" alt="Dongfu" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[20s]" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-slate-900/80"></div>
            
            <div className="relative z-10 flex flex-col items-center animate-bounce-slight w-full max-w-2xl px-4">
                <div className="relative">
                     <img src={player.avatarUrl} alt="Player" className="w-96 h-96 object-cover rounded-full border-[6px] border-amber-500/50 shadow-[0_0_100px_rgba(245,158,11,0.3)] mb-8" />
                     {canBreakthrough && (
                         <div className="absolute -top-4 -right-4 text-6xl animate-bounce filter drop-shadow-[0_0_10px_yellow]">⚡</div>
                     )}
                </div>
                
                <div className="bg-black/70 rounded-2xl border border-emerald-500/50 backdrop-blur-md w-full p-8 flex flex-col items-center gap-4 shadow-2xl">
                    <div className="text-emerald-200 text-5xl font-bold tracking-[0.2em] text-shadow-lg mb-2">
                        {realmName}
                    </div>
                    
                    <div className="w-full relative h-8 bg-slate-800 rounded-full border-2 border-slate-600 overflow-hidden group shadow-inner">
                        <div 
                            className={`absolute top-0 left-0 h-full transition-all duration-1000 ${canBreakthrough ? 'bg-gradient-to-r from-amber-600 to-yellow-400 animate-pulse' : 'bg-gradient-to-r from-emerald-900 via-emerald-600 to-emerald-400'}`}
                            style={{ width: `${expPercentage}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white shadow-black drop-shadow-md z-10 tracking-widest">
                            修为: {player.exp} / {player.maxExp}
                        </div>
                    </div>

                    {canBreakthrough && (
                         <div className="mt-4 w-full flex flex-col items-center animate-fade-in-up">
                            <Button 
                                variant="primary" 
                                size="lg" 
                                onClick={onBreakthrough}
                                className="w-full py-4 text-2xl bg-gradient-to-r from-amber-600 to-orange-600 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.6)] font-bold tracking-[0.2em] hover:scale-105 transition-transform"
                            >
                                ⚡ 境界突破 ⚡
                            </Button>
                            <div className="text-sm text-slate-300 mt-3 flex gap-6 bg-black/60 px-6 py-2 rounded-full border border-slate-700">
                                <span className="text-yellow-400 font-bold">消耗: {breakthroughCost} 灵石</span>
                                <span className="w-px h-4 bg-slate-600"></span>
                                <span className="text-blue-300 font-bold">成功率: {breakthroughChance.toFixed(0)}%</span>
                            </div>
                         </div>
                    )}
                </div>
            </div>
        </div>

        {/* Right: Stats & Equipment */}
        <div className="w-[450px] bg-slate-900/90 border border-slate-700 rounded-2xl p-6 flex flex-col gap-6 shrink-0 z-10 overflow-y-auto custom-scrollbar">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h3 className="text-emerald-400 text-lg font-bold border-b border-emerald-800 pb-3 mb-4 flex items-center gap-2">
                    <span>📊</span> 当前状态
                </h3>
                <div className="space-y-3 text-base">
                    <StatRow label="生命" value={`${player.stats.hp}/${player.stats.maxHp}`} icon="❤️" color="text-red-400" />
                    <StatRow label="神识" value={`${player.stats.spirit}/${player.stats.maxSpirit}`} icon="🌀" color="text-blue-400" />
                    <StatRow label="攻击" value={player.stats.attack} icon="⚔️" color="text-amber-400" />
                    <StatRow label="防御" value={player.stats.defense} icon="🛡️" color="text-slate-300" />
                    <StatRow label="速度" value={player.stats.speed} icon="👟" color="text-emerald-300" />
                </div>
                
                <h4 className="text-slate-400 font-bold text-sm mt-6 mb-3 border-b border-slate-700 pb-2">五行灵根 & 特殊亲和</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex flex-col gap-2">
                        {primaryElements.map(elem => {
                                const config = ELEMENT_CONFIG[elem];
                                const val = player.stats.elementalAffinities[elem];
                                return (
                                <div key={elem} className="flex justify-between items-center bg-slate-800 px-2 py-1.5 rounded border border-slate-700/50">
                                    <span className={`flex items-center gap-2 ${config.color} font-bold`}>
                                        <span className="text-lg">{config.icon}</span> {elem}
                                    </span>
                                    <span className="font-mono text-white font-bold">{val}</span>
                                </div>
                                )
                        })}
                    </div>
                    <div className="flex flex-col gap-2">
                        {secondaryElements.map(elem => {
                                const config = ELEMENT_CONFIG[elem];
                                const val = player.stats.elementalAffinities[elem];
                                return (
                                <div key={elem} className="flex justify-between items-center bg-slate-800 px-2 py-1.5 rounded border border-slate-700/50">
                                    <span className={`flex items-center gap-2 ${config.color} font-bold`}>
                                        <span className="text-lg">{config.icon}</span> {elem}
                                    </span>
                                    <span className="font-mono text-white font-bold">{val}</span>
                                </div>
                                )
                        })}
                    </div>
                </div>
            </div>

            {/* Artifacts Section */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h3 className="text-purple-400 text-lg font-bold border-b border-purple-800 pb-3 mb-4 flex items-center gap-2">
                    <span>🧿</span> {artifactSystemName}
                    <span className="text-xs text-slate-500 ml-auto font-normal">已解锁: {unlockedArtifactCount} / {artifactConfigs.length}</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {artifactConfigs.map((config, index) => {
                        const isUnlocked = index < unlockedArtifactCount;
                        const item = displayArtifacts[index];
                        const canUnlock = !isUnlocked && index === unlockedArtifactCount;
                        
                        return (
                            <div 
                                key={index} 
                                className={`
                                    relative p-2 rounded-lg border-2 min-h-[60px] flex items-center justify-center gap-2 transition-all
                                    ${isUnlocked 
                                        ? 'bg-slate-800 border-slate-600 hover:border-purple-500 cursor-pointer' 
                                        : 'bg-black/40 border-slate-800 opacity-70'}
                                    ${canUnlock ? 'hover:bg-slate-800 hover:border-yellow-600 cursor-pointer' : ''}
                                `}
                                onClick={() => {
                                    if (isUnlocked && item && onUnequipArtifact) {
                                        onUnequipArtifact(index);
                                    } else if (canUnlock && onUnlockArtifactSlot) {
                                        onUnlockArtifactSlot(index);
                                    }
                                }}
                            >
                                {isUnlocked ? (
                                    item ? (
                                        <>
                                            <div className="text-2xl">{item.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-white truncate">{item.name}</div>
                                                <div className="text-[9px] text-purple-300">点击卸下</div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-xs text-slate-500 font-bold">空闲{artifactUnitName}栏</div>
                                    )
                                ) : (
                                    <div className="flex flex-col items-center justify-center w-full">
                                        <div className="text-xl mb-1">🔒</div>
                                        {canUnlock && (
                                            <div className="text-[9px] text-yellow-400 text-center leading-tight">
                                                {config.cost}灵石<br/>Lv.{config.reqLevel}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h3 className="text-amber-400 text-lg font-bold border-b border-amber-800 pb-3 mb-4 flex items-center gap-2">
                    <span>🥋</span> 已装备
                </h3>
                <div className="grid grid-cols-1 gap-3 pr-1">
                    {equipmentSlots.map(slot => (
                        <EquipSlot key={slot} label={SLOT_NAMES[slot]} item={player.equipment[slot]} />
                    ))}
                </div>
            </div>
        </div>

      </div>

      {/* Bottom: Adventure Button */}
      <div className="shrink-0 pt-2">
         <Button 
            variant="primary" 
            className="w-full py-6 text-3xl font-bold tracking-[0.5em] shadow-[0_0_30px_rgba(16,185,129,0.3)] border-emerald-500 hover:bg-emerald-700 hover:scale-[1.01] active:scale-[0.99] transition-all bg-gradient-to-r from-emerald-900 via-emerald-700 to-emerald-900"
            onClick={() => setActiveMenu('mapSelect')}
         >
            🗡️ 外出历练 🗡️
         </Button>
      </div>

      {/* Map Selection Modal - Same as before but clipped for brevity if not changed */}
      {activeMenu === 'mapSelect' && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
              <div className="w-full max-w-5xl h-[85vh] bg-slate-900 border-2 border-slate-600 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
                  <button onClick={() => setActiveMenu('none')} className="absolute top-4 right-4 text-slate-400 hover:text-white text-3xl z-50">✕</button>
                  <div className="bg-slate-950 p-6 border-b border-slate-700">
                      <h3 className="text-3xl font-bold text-emerald-100 flex items-center gap-3">
                          🌍 选择历练地图
                      </h3>
                      <p className="text-slate-400 mt-2">选择一处秘境进行探索，不同的秘境拥有不同的机缘与凶险。</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {maps.map(map => {
                          const isLocked = player.level < map.reqLevel;
                          return (
                              <div key={map.id} className={`
                                  relative bg-slate-800 rounded-xl border-2 flex flex-col overflow-hidden group transition-all duration-300
                                  ${isLocked ? 'border-slate-700 opacity-60 grayscale' : 'border-slate-600 hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:-translate-y-1'}
                              `}>
                                  <div className="h-32 bg-slate-900 flex items-center justify-center text-6xl relative overflow-hidden">
                                      <div className="absolute inset-0 bg-gradient-to-t from-slate-800 to-transparent"></div>
                                      <span className="relative z-10 transform group-hover:scale-110 transition-transform duration-500">{map.icon}</span>
                                      {isLocked && <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-bold text-red-500 text-xl backdrop-blur-sm z-20">🔒 境界不足</div>}
                                  </div>
                                  <div className="p-5 flex-1 flex flex-col">
                                      <h4 className={`text-xl font-bold mb-2 ${isLocked ? 'text-slate-500' : 'text-emerald-300'}`}>{map.name}</h4>
                                      <div className="text-sm text-slate-400 mb-4 flex-1">{map.description}</div>
                                      <Button 
                                          variant={isLocked ? 'secondary' : 'primary'}
                                          disabled={isLocked}
                                          onClick={() => { if(!isLocked) onStartAdventure(map); }}
                                          className="w-full"
                                      >
                                          {isLocked ? '未解锁' : '进入历练'}
                                      </Button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {activeMenu === 'talisman' && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
              <div className="w-full max-w-6xl h-[85vh] bg-slate-900 border-2 border-yellow-700 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
                  <button onClick={() => setActiveMenu('none')} className="absolute top-4 right-4 text-slate-400 hover:text-white text-3xl z-50">✕</button>
                   <div className="bg-slate-950 p-6 border-b border-yellow-900/50 flex items-center gap-4">
                        <span className="text-4xl">🖌️</span>
                        <div><h3 className="text-3xl font-bold text-yellow-200">制符台</h3></div>
                   </div>
                   <div className="flex-1 flex overflow-hidden">
                      <div className="w-80 border-r border-slate-700 bg-slate-800/40 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                           <h4 className="text-slate-500 font-bold mb-2 uppercase text-xs tracking-widest">1. 选择卡牌</h4>
                           <div className="space-y-2">
                              {deck.map((card, idx) => (
                                  <button key={`${card.id}_${idx}`} onClick={() => setSelectedTalismanCard(card)} className={`w-full text-left p-3 rounded-lg border flex flex-col gap-1 transition-all ${selectedTalismanCard === card ? 'bg-yellow-900/40 border-yellow-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                                      <div className="font-bold text-white text-sm">{card.name} <span className="text-xs bg-slate-900 px-1 rounded">Lv.{card.reqLevel}</span></div>
                                  </button>
                              ))}
                          </div>
                      </div>
                      <div className="flex-1 flex flex-col bg-slate-900 p-6 items-center justify-center">
                          <div className="text-center text-slate-500">
                              <div className="flex gap-4 justify-center mb-4">
                                  <div className="bg-slate-800 p-4 rounded border border-slate-700 w-64 h-48 overflow-y-auto">
                                      <h4 className="text-slate-400 text-xs mb-2">2. 符笔</h4>
                                      {availablePens.map(p => <button key={p.id} onClick={() => setSelectedPen(p)} className={`block w-full text-left p-1 text-sm ${selectedPen?.id === p.id ? 'text-yellow-400' : 'text-slate-300'}`}>{p.name} ({p.durability})</button>)}
                                  </div>
                                  <div className="bg-slate-800 p-4 rounded border border-slate-700 w-64 h-48 overflow-y-auto">
                                      <h4 className="text-slate-400 text-xs mb-2">3. 符纸</h4>
                                      {availablePapers.map(p => <button key={p.id} onClick={() => setSelectedPaper(p)} className={`block w-full text-left p-1 text-sm ${selectedPaper?.id === p.id ? 'text-yellow-400' : 'text-slate-300'}`}>{p.name}</button>)}
                                  </div>
                              </div>
                              <Button size="lg" disabled={!canCraftTalisman} onClick={() => selectedTalismanCard && selectedPen && selectedPaper && onCraftTalisman(selectedTalismanCard.id, selectedPen.id, selectedPaper.id)}>制作符箓</Button>
                          </div>
                      </div>
                   </div>
              </div>
          </div>
      )}

      {activeMenu === 'alchemy' && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
              <div className="w-full max-w-6xl h-[85vh] bg-slate-900 border-2 border-amber-700 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
                  <button onClick={() => setActiveMenu('none')} className="absolute top-4 right-4 text-slate-400 hover:text-white text-3xl z-50">✕</button>
                   <div className="bg-slate-950 p-6 border-b border-amber-900/50 flex items-center gap-4">
                        <span className="text-4xl">🔥</span>
                        <div><h3 className="text-3xl font-bold text-amber-200">炼丹房</h3></div>
                   </div>
                   <div className="flex-1 flex overflow-hidden">
                      <div className="w-80 border-r border-slate-700 bg-slate-800/40 p-4 overflow-y-auto custom-scrollbar">
                           {learnedRecipesList.map(r => <button key={r.id} onClick={() => setSelectedRecipe(r)} className={`w-full text-left p-4 rounded-xl text-lg font-bold border mb-2 ${selectedRecipe?.id === r.id ? 'bg-amber-900/80 border-amber-600 text-amber-100' : 'bg-slate-800 border-transparent text-slate-400'}`}>{r.name}</button>)}
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 p-8">
                          {selectedRecipe ? (
                              <div className="flex flex-col items-center gap-4">
                                  <div className="text-6xl animate-pulse">🔥</div>
                                  <div className="text-amber-200 text-2xl">{selectedRecipe.name}</div>
                                  <div className="flex gap-4">{currentRecipeStatus?.mats.map((m,i) => <div key={i} className={`p-2 border rounded ${m.ok ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>{m.name} {m.owned}/{m.needed}</div>)}</div>
                                  <Button size="lg" disabled={!currentRecipeStatus?.sufficient || isRefining} onClick={() => selectedRecipe.recipeMaterials && onRefine(selectedRecipe.id, selectedRecipe.recipeMaterials)}>{isRefining ? '炼制中...' : '开始炼丹'}</Button>
                              </div>
                          ) : <div className="text-slate-500">请选择丹方</div>}
                      </div>
                   </div>
              </div>
          </div>
      )}

      {activeMenu === 'forge' && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
              <div className="w-full max-w-6xl h-[85vh] bg-slate-900 border-2 border-orange-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
                  <button onClick={() => setActiveMenu('none')} className="absolute top-4 right-4 text-slate-400 hover:text-white text-3xl z-50">✕</button>
                   <div className="bg-slate-950 p-6 border-b border-orange-900/50 flex items-center gap-4">
                        <span className="text-4xl">⚒️</span>
                        <div><h3 className="text-3xl font-bold text-orange-200">炼器房</h3></div>
                   </div>
                   <div className="flex-1 flex overflow-hidden">
                      <div className="w-80 border-r border-slate-700 bg-slate-800/40 p-4 overflow-y-auto custom-scrollbar">
                           {learnedBlueprintsList.map(b => <button key={b.id} onClick={() => setSelectedBlueprint(b)} className={`w-full text-left p-4 rounded-xl text-lg font-bold border mb-2 ${selectedBlueprint?.id === b.id ? 'bg-orange-900/80 border-orange-600 text-orange-100' : 'bg-slate-800 border-transparent text-slate-400'}`}>{b.name}</button>)}
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 p-8">
                          {selectedBlueprint ? (
                              <div className="flex flex-col items-center gap-4">
                                  <div className="text-6xl animate-bounce">⚒️</div>
                                  <div className="text-orange-200 text-2xl">{selectedBlueprint.name}</div>
                                  <div className="flex gap-4">{currentBlueprintStatus?.mats.map((m,i) => <div key={i} className={`p-2 border rounded ${m.ok ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>{m.name} {m.owned}/{m.needed}</div>)}</div>
                                  <Button size="lg" disabled={!currentBlueprintStatus?.sufficient || isRefining} onClick={() => selectedBlueprint.recipeMaterials && onCraft(selectedBlueprint.id, selectedBlueprint.recipeMaterials)}>{isRefining ? '锻造中...' : '开始炼器'}</Button>
                              </div>
                          ) : <div className="text-slate-500">请选择图纸</div>}
                      </div>
                   </div>
              </div>
          </div>
      )}

      {/* Bag / Deck Modal */}
      {(activeMenu === 'bag' || activeMenu === 'deck') && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 animate-fade-in bg-black/80">
                <div className="w-full max-w-7xl h-[85vh] bg-slate-900 border-2 border-slate-600 rounded-2xl flex flex-col p-8 shadow-2xl relative">
                    <button onClick={() => setActiveMenu('none')} className="absolute top-6 right-6 text-slate-400 hover:text-white text-4xl z-50">✕</button>

                    <div className="flex items-center gap-4 border-b border-slate-700 pb-6 mb-6 shrink-0">
                        <span className="text-5xl">{activeMenu === 'bag' ? '🎒' : '🎴'}</span>
                        <h3 className="text-4xl font-bold text-white tracking-wider">
                            {activeMenu === 'bag' ? '储物袋' : '本命卡组'}
                        </h3>
                        {activeMenu === 'deck' && (
                            <div className="ml-auto flex flex-col md:flex-row gap-4 items-end md:items-center">
                                {/* Sort Controls */}
                                <div className="flex gap-2 mr-4 bg-slate-800 p-1 rounded-lg">
                                    <button 
                                        className={`px-3 py-1 rounded text-xs font-bold ${deckSortMode === 'DEFAULT' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                                        onClick={() => setDeckSortMode('DEFAULT')}
                                    >默认</button>
                                    <button 
                                        className={`px-3 py-1 rounded text-xs font-bold ${deckSortMode === 'ELEMENT' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                                        onClick={() => setDeckSortMode('ELEMENT')}
                                    >按元素</button>
                                    <button 
                                        className={`px-3 py-1 rounded text-xs font-bold ${deckSortMode === 'LEVEL' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                                        onClick={() => setDeckSortMode('LEVEL')}
                                    >按境界</button>
                                </div>

                                <div className="flex gap-4">
                                    <Button 
                                        variant={deckTab === 'active' ? 'primary' : 'secondary'} 
                                        onClick={() => setDeckTab('active')}
                                    >
                                        出战卡组 ({deck.length})
                                    </Button>
                                    <Button 
                                        variant={deckTab === 'storage' ? 'primary' : 'secondary'} 
                                        onClick={() => setDeckTab('storage')}
                                    >
                                        卡牌仓库 ({cardStorage.length})
                                    </Button>
                                    <Button 
                                        variant={deckTab === 'talisman' ? 'primary' : 'secondary'} 
                                        onClick={() => setDeckTab('talisman')}
                                    >
                                        符箓仓库 ({inventoryTalismans.length})
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {activeMenu === 'bag' && (
                            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-6">
                                {inventory.map((item, idx) => {
                                    if (!item || !item.type) return null; // STRICT CHECK
                                    const canEquip = player.level >= (item.reqLevel || 0);
                                    const isArtifact = item.type === 'ARTIFACT';
                                    const isEquipable = item.type === 'EQUIPMENT' || isArtifact;
                                    const isConsumable = ['CONSUMABLE', 'RECIPE', 'PILL', 'FORGE_BLUEPRINT'].includes(item.type);
                                    
                                    return (
                                        <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-600 flex flex-col justify-between hover:bg-slate-700/80 transition-colors shadow-lg group">
                                            <div className="flex gap-4">
                                                <div className="w-16 h-16 flex-shrink-0 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center text-4xl shadow-inner group-hover:scale-105 transition-transform">
                                                    {item.icon || '📦'}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                                    <div className={`font-bold text-lg ${item.rarity === 'legendary' ? 'text-amber-400' : 'text-white'} truncate`}>{item.name}</div>
                                                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                                        {item.type === 'EQUIPMENT' ? `装备 · ${item.slot ? SLOT_NAMES[item.slot] : '未知'}` : 
                                                            item.type === 'ARTIFACT' ? '本命法宝' : 
                                                            item.type}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Description */}
                                            <div className="mt-2 text-[11px] text-slate-400 leading-snug min-h-[2.5em] line-clamp-2">
                                                {item.description}
                                            </div>

                                            {/* --- STAT DISPLAY FOR ANY ITEM WITH STATS --- */}
                                            {item.statBonus && Object.keys(item.statBonus).length > 0 && (
                                                <div className="mt-3 text-[10px] text-slate-300 grid grid-cols-2 gap-x-2 gap-y-1 bg-black/20 p-2 rounded">
                                                    {!!item.statBonus.attack && <div>攻击 <span className="text-amber-400">+{item.statBonus.attack}</span></div>}
                                                    {!!item.statBonus.defense && <div>防御 <span className="text-slate-400">+{item.statBonus.defense}</span></div>}
                                                    {!!item.statBonus.maxHp && <div>生命 <span className="text-red-400">+{item.statBonus.maxHp}</span></div>}
                                                    {!!item.statBonus.maxSpirit && <div>神识 <span className="text-blue-400">+{item.statBonus.maxSpirit}</span></div>}
                                                    {!!item.statBonus.speed && <div>速度 <span className="text-emerald-400">+{item.statBonus.speed}</span></div>}
                                                    
                                                    {item.statBonus.elementalAffinities && Object.entries(item.statBonus.elementalAffinities).map(([key, value]) => {
                                                        const val = value as number;
                                                        if (val <= 0) return null;
                                                        const elem = key as ElementType;
                                                        const config = ELEMENT_CONFIG[elem];
                                                        return (
                                                            <div key={key} className="flex items-center gap-1">
                                                                <span>{config?.icon}</span> {elem} <span className={config?.color || 'text-white'}>+{val}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            
                                            {(item.type === 'TALISMAN_PEN' || item.type === 'TALISMAN') && (
                                                <div className="mt-2 text-xs text-slate-400">
                                                    耐久: {item.durability}/{item.maxDurability}
                                                </div>
                                            )}

                                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/50">
                                                {isEquipable && (
                                                    <Button 
                                                        size="md" 
                                                        variant={canEquip ? 'outline' : 'secondary'} 
                                                        className="flex-1 text-sm font-bold"
                                                        onClick={() => onEquipItem(item)}
                                                        disabled={!canEquip}
                                                    >
                                                        {canEquip ? (isArtifact ? '祭炼' : '装备') : '境界不足'}
                                                    </Button>
                                                )}
                                                {isConsumable && (
                                                    <Button
                                                        size="md"
                                                        variant="primary"
                                                        className="flex-1 text-sm font-bold"
                                                        onClick={() => onUseItem(item)}
                                                    >
                                                        使用
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {inventory.length === 0 && <div className="col-span-full text-center text-slate-500 text-xl py-20">背包空空如也</div>}
                            </div>
                        )}
                        {/* Deck View */}
                        {activeMenu === 'deck' && (
                             <div className="flex flex-col gap-4">
                                 {deckTab === 'active' && (
                                    <div className="flex justify-between items-center text-slate-400 text-sm mb-2 px-4">
                                        <div className="flex gap-4">
                                            <span>最小卡组数量: 24</span>
                                            <span>|</span>
                                            <span>出战符箓: {talismansInDeck.length}</span>
                                        </div>
                                        <span className={deck.length < 24 ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>
                                            当前卡牌数量: {deck.length}
                                        </span>
                                    </div>
                                 )}
                                 
                                 {/* --- CARDS & TALISMANS GRID --- */}
                                 <div className="flex flex-wrap gap-4 justify-center">
                                     
                                     {/* ACTIVE TAB: Show Cards + Talismans in Deck */}
                                     {deckTab === 'active' && (
                                         <>
                                            {/* Render Cards */}
                                            {displayedDeck.map((card, idx) => {
                                                // Find original index in source deck for correct removal
                                                const originalIdx = deck.indexOf(card);
                                                return (
                                                 <div key={`${card.id}_deck_${idx}`} className="relative group transition-transform duration-200 hover:-translate-y-4 hover:shadow-xl rounded-xl">
                                                     <CardItem card={card} isPlayable={false} playerLevel={player.level} disableHoverEffect={true} />
                                                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl z-20">
                                                         <Button 
                                                            variant="danger" 
                                                            size="sm"
                                                            disabled={deck.length <= 24}
                                                            onClick={() => onManageDeck('TO_STORAGE', originalIdx)}
                                                         >
                                                             移出
                                                         </Button>
                                                     </div>
                                                 </div>
                                                )
                                            })}
                                            {/* Render Talismans in Deck */}
                                            {talismansInDeck.map((item, idx) => {
                                                 // Map item to dummy card for display
                                                 return (
                                                     <div key={`${item.id}_talisman_${idx}`} className="relative group transition-transform duration-200 hover:-translate-y-4 hover:shadow-xl rounded-xl">
                                                         {/* Custom minimal rendering for Talisman "Card" */}
                                                         <div className="w-32 h-48 border-2 border-yellow-600 bg-yellow-900/40 rounded-xl p-2 flex flex-col select-none relative">
                                                             <div className="absolute top-1 right-1 text-lg">📜</div>
                                                             <div className="font-bold text-yellow-200 text-center text-sm truncate mt-2">{item.name}</div>
                                                             <div className="flex-1 flex items-center justify-center text-4xl">⚡</div>
                                                             <div className="text-[10px] text-center text-yellow-100 bg-black/30 p-1 rounded">
                                                                 耐久: {item.durability}/{item.maxDurability}
                                                             </div>
                                                             <div className="text-[10px] text-center mt-1 text-slate-300">无需消耗灵力</div>
                                                         </div>
                                                         
                                                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl z-20">
                                                             <Button 
                                                                variant="danger" 
                                                                size="sm"
                                                                onClick={() => onManageDeck('TALISMAN_TO_INVENTORY', idx)}
                                                             >
                                                                 移出
                                                             </Button>
                                                         </div>
                                                     </div>
                                                 );
                                            })}
                                         </>
                                     )}

                                     {/* STORAGE TAB: Show Inactive Cards */}
                                     {deckTab === 'storage' && displayedStorage.map((card, idx) => {
                                         const canAdd = player.level >= card.reqLevel;
                                         // Find original index
                                         const originalIdx = cardStorage.indexOf(card);
                                         
                                         return (
                                             <div key={`${card.id}_storage_${idx}`} className="relative group transition-transform duration-200 hover:-translate-y-4 hover:shadow-xl rounded-xl">
                                                 <CardItem card={card} isPlayable={false} playerLevel={player.level} disableHoverEffect={true} />
                                                 {canAdd && (
                                                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl z-20">
                                                         <Button 
                                                            variant="primary" 
                                                            size="sm"
                                                            onClick={() => onManageDeck('TO_DECK', originalIdx)}
                                                         >
                                                             出战
                                                         </Button>
                                                     </div>
                                                 )}
                                             </div>
                                         );
                                     })}

                                     {/* TALISMAN TAB: Show Talismans in Inventory */}
                                     {deckTab === 'talisman' && inventoryTalismans.map((item, idx) => {
                                         // Find actual index in main inventory to pass to handler
                                         const realIdx = player.inventory.indexOf(item);
                                         
                                         return (
                                             <div key={`${item.id}_inv_${idx}`} className="relative group w-32 h-48 border-2 border-slate-600 bg-slate-800 rounded-xl p-2 flex flex-col select-none transition-transform duration-200 hover:-translate-y-4 hover:shadow-xl">
                                                 <div className="font-bold text-white text-center text-sm truncate mt-2">{item.name}</div>
                                                 <div className="flex-1 flex items-center justify-center text-4xl">{item.icon}</div>
                                                 <div className="text-[10px] text-center text-slate-400 bg-black/30 p-1 rounded">
                                                     耐久: {item.durability}/{item.maxDurability}
                                                 </div>
                                                 
                                                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl z-20">
                                                     <Button 
                                                        variant="primary" 
                                                        size="sm"
                                                        onClick={() => onManageDeck('TALISMAN_TO_DECK', realIdx)}
                                                     >
                                                         出战
                                                     </Button>
                                                 </div>
                                             </div>
                                         );
                                     })}

                                     {deckTab === 'storage' && cardStorage.length === 0 && (
                                         <div className="text-slate-500 py-20 text-xl font-bold">仓库为空</div>
                                     )}
                                     {deckTab === 'talisman' && inventoryTalismans.length === 0 && (
                                         <div className="text-slate-500 py-20 text-xl font-bold">没有可用的符箓</div>
                                     )}
                                 </div>
                             </div>
                        )}
                    </div>
                </div>
          </div>
      )}
      
      <style>{`
        @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>
    </div>
  );
};