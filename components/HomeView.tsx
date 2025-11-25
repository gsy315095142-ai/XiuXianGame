

import React, { useState, useEffect } from 'react';
import { Player, Item, RealmRank, EquipmentSlot, ElementType } from '../types';
import { getRealmName, SLOT_NAMES, ELEMENT_CONFIG } from '../constants';
import { Button } from './Button';
import { CardItem } from './CardItem';

interface HomeViewProps {
  player: Player;
  realms: RealmRank[];
  onStartAdventure: () => void;
  onEquipItem: (item: Item) => void;
  onUseItem: (item: Item) => void;
  onEndGame: () => void;
  onBreakthrough: () => void;
  onRefine: (recipeId: string, materials: {itemId: string, count: number}[]) => void;
  isRefining: boolean;
  itemsConfig: Item[]; // Needed to lookup pill info from recipes
}

export const HomeView: React.FC<HomeViewProps> = ({ player, realms, onStartAdventure, onEquipItem, onUseItem, onEndGame, onBreakthrough, onRefine, isRefining, itemsConfig }) => {
  const [activeMenu, setActiveMenu] = useState<'none' | 'bag' | 'deck' | 'alchemy'>('none');
  const [selectedRecipe, setSelectedRecipe] = useState<Item | null>(null);

  const realmName = getRealmName(player.level, realms);
  
  const expPercentage = Math.min(100, (player.exp / player.maxExp) * 100);
  const canBreakthrough = player.exp >= player.maxExp;
  
  const currentRealm = realms.find(r => player.level >= r.rangeStart && player.level <= r.rangeEnd) || realms[0];
  const levelIndex = player.level - currentRealm.rangeStart;
  const levelConfig = currentRealm.levels[levelIndex];

  const breakthroughCost = levelConfig ? levelConfig.breakthroughCost : 0;
  const breakthroughChance = levelConfig ? (levelConfig.breakthroughChance * 100) : 0;
  
  const alchemyUnlockLevel = 5; // Qi Refining Layer 5
  const isAlchemyUnlocked = player.level >= alchemyUnlockLevel;

  const equipmentSlots: EquipmentSlot[] = [
    'mainWeapon', 'offWeapon', 
    'head', 'body', 
    'belt', 'legs', 
    'feet', 'neck', 
    'accessory', 'ring'
  ];

  const primaryElements = [ElementType.METAL, ElementType.WOOD, ElementType.WATER, ElementType.FIRE, ElementType.EARTH];
  const secondaryElements = [ElementType.LIGHT, ElementType.DARK, ElementType.WIND, ElementType.THUNDER, ElementType.ICE, ElementType.SWORD];

  const learnedRecipesList = player.learnedRecipes
    .map(rid => itemsConfig.find(i => i.id === rid))
    .filter((i): i is Item => !!i);
    
  // Check materials for selected recipe
  const getMaterialStatus = (recipe: Item) => {
      if (!recipe.recipeMaterials) return { sufficient: false, mats: [] };
      const mats = recipe.recipeMaterials.map(rm => {
          const matItem = itemsConfig.find(i => i.id === rm.itemId);
          const ownedCount = player.inventory.filter(i => i.id.startsWith(rm.itemId) || i.id === rm.itemId || (i as any).baseId === rm.itemId || i.name === matItem?.name).length;
          // Simple name matching fallback or id prefix matching because generated IDs vary
          // Ideally we use a 'baseId' concept, but for now we rely on name matching for stacked items or flexible counting
          const ownedCountByName = player.inventory.filter(i => i.name === matItem?.name).length;
          
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
  const targetPill = selectedRecipe ? itemsConfig.find(i => i.id === selectedRecipe.recipeResult) : null;

  return (
    <div className="flex flex-col h-screen w-full max-w-7xl mx-auto p-4 space-y-4 animate-fade-in overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between bg-slate-900/90 p-3 rounded-lg border border-slate-700 shadow-lg backdrop-blur z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-emerald-900 border-2 border-emerald-500 flex items-center justify-center text-xl font-bold">
                {player.name.charAt(0)}
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-emerald-100">{player.name}</h1>
            <div className="text-sm text-emerald-400 font-mono">灵石: {player.gold}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <Button variant="danger" size="sm" onClick={onEndGame}>退出</Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 gap-4 overflow-hidden relative">
        
        {/* Left: Menus */}
        <div className="w-48 flex flex-col gap-3 shrink-0 z-10">
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex flex-col gap-2 h-full">
                <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">洞府管理</h3>
                <Button 
                    variant={activeMenu === 'bag' ? 'primary' : 'secondary'} 
                    onClick={() => setActiveMenu(activeMenu === 'bag' ? 'none' : 'bag')}
                    className="justify-start"
                >
                    🎒 储物袋
                </Button>
                <Button 
                    variant={activeMenu === 'deck' ? 'primary' : 'secondary'} 
                    onClick={() => setActiveMenu(activeMenu === 'deck' ? 'none' : 'deck')}
                    className="justify-start"
                >
                    🎴 本命卡组
                </Button>
                <div className="h-px bg-slate-700 my-1"></div>
                <Button 
                    variant={activeMenu === 'alchemy' ? 'primary' : 'secondary'} 
                    onClick={() => isAlchemyUnlocked ? setActiveMenu(activeMenu === 'alchemy' ? 'none' : 'alchemy') : null}
                    className={`justify-start ${!isAlchemyUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={!isAlchemyUnlocked ? '需炼气五层解锁' : ''}
                >
                    🔥 炼丹房 {!isAlchemyUnlocked && '🔒'}
                </Button>
            </div>
        </div>

        {/* Center: Visual Scene */}
        <div className="flex-1 relative rounded-xl border-2 border-emerald-900 overflow-hidden bg-black flex flex-col items-center justify-center shadow-2xl group">
            <img src="https://picsum.photos/seed/dongfu_bg/1200/800" alt="Dongfu" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50"></div>
            
            <div className="relative z-10 flex flex-col items-center animate-bounce-slight w-full max-w-md px-4">
                <img src={player.avatarUrl} alt="Player" className="w-56 h-56 object-cover rounded-full border-4 border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.4)] mb-6" />
                
                <div className="bg-black/60 rounded-xl border border-emerald-500/50 backdrop-blur-md w-full p-4 flex flex-col items-center gap-2">
                    <div className="text-emerald-200 text-2xl font-bold tracking-widest text-shadow">
                        {realmName}
                    </div>
                    
                    <div className="w-full relative h-4 bg-slate-800 rounded-full border border-slate-600 overflow-hidden group mt-1">
                        <div 
                            className={`absolute top-0 left-0 h-full transition-all duration-1000 ${canBreakthrough ? 'bg-gradient-to-r from-amber-600 to-yellow-400 animate-pulse' : 'bg-gradient-to-r from-emerald-900 via-emerald-600 to-emerald-400'}`}
                            style={{ width: `${expPercentage}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-black drop-shadow-md z-10">
                            {player.exp} / {player.maxExp}
                        </div>
                    </div>

                    {canBreakthrough && (
                         <div className="mt-2 w-full flex flex-col items-center animate-fade-in-up">
                            <Button 
                                variant="primary" 
                                size="lg" 
                                onClick={onBreakthrough}
                                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] font-bold tracking-widest text-lg"
                            >
                                ⚡ 境界突破 ⚡
                            </Button>
                            <div className="text-[10px] text-slate-300 mt-1 flex gap-3 bg-black/50 px-3 py-1 rounded">
                                <span className="text-yellow-400">消耗: {breakthroughCost}灵石</span>
                                <span className="text-blue-300">成功率: {breakthroughChance.toFixed(0)}%</span>
                            </div>
                         </div>
                    )}
                </div>
            </div>

            {/* Alchemy Modal */}
            {activeMenu === 'alchemy' && (
                <div className="absolute inset-4 bg-slate-900/95 border border-amber-700/50 rounded-lg z-20 flex flex-col p-0 overflow-hidden shadow-2xl animate-fade-in">
                    {/* Alchemy Header */}
                    <div className="flex justify-between items-center bg-amber-950/50 p-4 border-b border-amber-800">
                        <h3 className="text-xl font-bold text-amber-200 flex items-center gap-2">🔥 炼丹房</h3>
                        <button onClick={() => setActiveMenu('none')} className="text-slate-400 hover:text-white">✕</button>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Recipe List */}
                        <div className="w-48 border-r border-slate-700 bg-slate-800/50 p-2 overflow-y-auto">
                            <div className="text-xs text-slate-400 font-bold mb-2 px-2">已掌握丹方 ({learnedRecipesList.length})</div>
                            {learnedRecipesList.length === 0 && <div className="text-xs text-slate-500 px-2">暂无丹方，请前往游商购买</div>}
                            {learnedRecipesList.map(recipe => (
                                <button
                                    key={recipe.id}
                                    onClick={() => setSelectedRecipe(recipe)}
                                    className={`w-full text-left p-2 rounded mb-1 text-sm truncate transition-colors ${selectedRecipe?.id === recipe.id ? 'bg-amber-800 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                                >
                                    {recipe.name}
                                </button>
                            ))}
                        </div>

                        {/* Furnace Area */}
                        <div className="flex-1 flex flex-col items-center relative bg-[url('https://picsum.photos/seed/furnace_bg/800/600')] bg-cover bg-center">
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
                            
                            {selectedRecipe && targetPill ? (
                                <div className="z-10 w-full h-full p-6 flex flex-col items-center">
                                    {/* Top: Pill Preview */}
                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="relative group">
                                            <div className="w-20 h-20 rounded-full border-2 border-amber-500 bg-black/50 flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                                                {targetPill.icon}
                                            </div>
                                            <div className="absolute -bottom-2 -right-2 bg-amber-900 text-[10px] px-2 rounded border border-amber-700 text-amber-200">
                                                {getRealmName(targetPill.reqLevel, realms).split(' ')[0]}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-amber-200">{targetPill.name}</div>
                                            <div className="text-xs text-slate-400 max-w-[200px] mt-1">{targetPill.description}</div>
                                            <div className="text-xs text-green-400 mt-2">成功率: {(selectedRecipe.successRate! * 100).toFixed(0)}%</div>
                                        </div>
                                    </div>

                                    {/* Middle: Furnace Animation Placeholder */}
                                    <div className="flex-1 flex items-center justify-center relative">
                                        <div className="text-8xl filter drop-shadow-[0_0_20px_orange] animate-pulse">
                                            ⚗️
                                        </div>
                                        {/* Fire Effect */}
                                        <div className="absolute bottom-10 text-4xl text-red-500 animate-bounce">
                                            🔥🔥🔥
                                        </div>
                                    </div>

                                    {/* Bottom: Materials & Action */}
                                    <div className="w-full bg-slate-900/90 rounded-xl p-4 border border-slate-700 mt-4">
                                        <div className="flex justify-around items-center mb-4">
                                            {currentRecipeStatus?.mats.map((mat, idx) => (
                                                <div key={idx} className="flex flex-col items-center gap-1">
                                                    <div className="w-10 h-10 bg-slate-800 rounded border border-slate-600 flex items-center justify-center text-xl relative">
                                                        {mat.icon}
                                                        <div className={`absolute -top-2 -right-2 text-[10px] px-1.5 rounded-full border ${mat.ok ? 'bg-green-900 border-green-500 text-green-200' : 'bg-red-900 border-red-500 text-red-200'}`}>
                                                            {mat.owned}/{mat.needed}
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">{mat.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <Button 
                                            size="lg" 
                                            className="w-full bg-gradient-to-r from-amber-700 to-red-700 border-amber-500 text-amber-100 font-bold tracking-widest shadow-lg hover:brightness-110"
                                            disabled={!currentRecipeStatus?.sufficient || isRefining}
                                            onClick={() => {
                                                if(selectedRecipe.recipeMaterials) {
                                                    onRefine(selectedRecipe.id, selectedRecipe.recipeMaterials);
                                                }
                                            }}
                                        >
                                            {isRefining ? '炼制中...' : '开始炼制'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="z-10 text-slate-500 mt-20">请选择左侧丹方</div>
                            )}

                            {/* Refining Overlay */}
                            {isRefining && (
                                <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
                                    <div className="text-2xl font-bold text-amber-400 mb-4 animate-pulse">炼丹中...</div>
                                    <div className="w-64 h-4 bg-slate-800 rounded-full overflow-hidden border border-amber-900">
                                        <div className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 w-full origin-left animate-[progress_10s_linear_forwards]"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bag/Deck Overlays */}
            {(activeMenu === 'bag' || activeMenu === 'deck') && (
                <div className="absolute inset-4 bg-slate-900/95 border border-slate-600 rounded-lg z-20 flex flex-col p-4 animate-fade-in">
                     <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-4">
                        <h3 className="text-xl font-bold text-white">
                            {activeMenu === 'bag' ? '🎒 储物袋' : '🎴 本命卡组'}
                        </h3>
                        <button onClick={() => setActiveMenu('none')} className="text-slate-400 hover:text-white">✕</button>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto">
                        {activeMenu === 'bag' && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {player.inventory.length === 0 && <div className="text-slate-500 col-span-full text-center mt-10">暂无物品</div>}
                                {player.inventory.map((item, idx) => {
                                    const canEquip = player.level >= item.reqLevel;
                                    const isEquipable = item.type === 'EQUIPMENT' || (item.type === 'ARTIFACT' && item.slot);
                                    const isConsumable = item.type === 'CONSUMABLE' || item.type === 'RECIPE' || item.type === 'PILL';
                                    const isMaterial = item.type === 'MATERIAL';
                                    
                                    const statsDesc = [];
                                    if(item.statBonus?.attack) statsDesc.push(`攻+${item.statBonus.attack}`);
                                    if(item.statBonus?.defense) statsDesc.push(`防+${item.statBonus.defense}`);
                                    if(item.statBonus?.maxHp) statsDesc.push(`血+${item.statBonus.maxHp}`);
                                    if(item.statBonus?.elementalAffinities) {
                                        Object.entries(item.statBonus.elementalAffinities).forEach(([k,v]) => {
                                            const val = v as number;
                                            if (val > 0) statsDesc.push(`${k}+${val}`);
                                        })
                                    }
                                    
                                    // Pill usage info
                                    let pillInfo = null;
                                    if (item.type === 'PILL') {
                                        const used = player.pillUsage[item.id] || 0;
                                        const max = item.maxUsage || 1;
                                        pillInfo = <div className="text-[10px] text-blue-300">服用: {used}/{max}</div>
                                    }

                                    return (
                                        <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-600 flex flex-col justify-between">
                                            <div className="flex gap-3">
                                                <div className="w-12 h-12 flex-shrink-0 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center text-2xl">
                                                    {item.icon || '📦'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-bold ${item.rarity === 'legendary' ? 'text-amber-400' : 'text-white'} truncate`}>{item.name}</div>
                                                    <div className="text-[10px] text-slate-500 mb-1">
                                                        {item.type === 'EQUIPMENT' ? `[装备 - ${item.slot ? SLOT_NAMES[item.slot] : '未知'}]` : 
                                                         item.type === 'ARTIFACT' ? '[法宝]' : 
                                                         item.type === 'MATERIAL' ? '[药材]' :
                                                         item.type === 'RECIPE' ? '[丹方]' :
                                                         item.type === 'PILL' ? '[丹药]' : '[道具]'}
                                                    </div>
                                                    <div className="text-[10px] text-emerald-400 my-1 font-mono leading-tight">{statsDesc.join(', ')}</div>
                                                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.description}</div>
                                                    {pillInfo}
                                                    <div className={`text-[10px] mt-1 ${canEquip ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        需境界: {getRealmName(item.reqLevel, realms)}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2 mt-2">
                                                {isEquipable && (
                                                    <Button 
                                                        size="sm" 
                                                        variant={canEquip ? 'outline' : 'secondary'} 
                                                        className="flex-1"
                                                        onClick={() => onEquipItem(item)}
                                                        disabled={!canEquip}
                                                    >
                                                        {canEquip ? '装备' : '境界不足'}
                                                    </Button>
                                                )}
                                                {isConsumable && (
                                                    <Button
                                                        size="sm"
                                                        variant="primary"
                                                        className="flex-1"
                                                        onClick={() => onUseItem(item)}
                                                    >
                                                        {item.type === 'RECIPE' ? '学习' : '使用'}
                                                    </Button>
                                                )}
                                                {isMaterial && <div className="text-xs text-slate-600 text-center w-full py-1">炼丹材料</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activeMenu === 'deck' && (
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
                                {player.deck.map((card, idx) => (
                                    <div key={idx} className="transform scale-90 origin-top-left">
                                        <CardItem card={card} isPlayable={false} playerLevel={player.level} />
                                    </div>
                                ))}
                             </div>
                        )}
                     </div>
                </div>
            )}
        </div>

        {/* Right: Stats & Equipment */}
        <div className="w-96 bg-slate-900/90 border border-slate-700 rounded-lg p-4 flex flex-col gap-4 shrink-0 z-10 overflow-y-auto">
            <div>
                <h3 className="text-emerald-400 font-bold border-b border-emerald-800 pb-2 mb-3">当前状态</h3>
                <div className="space-y-1 text-sm">
                    <StatRow label="生命" value={`${player.stats.hp}/${player.stats.maxHp}`} />
                    <StatRow label="神识" value={`${player.stats.spirit}/${player.stats.maxSpirit}`} />
                    <StatRow label="攻击" value={player.stats.attack} />
                    <StatRow label="防御" value={player.stats.defense} />
                    <StatRow label="速度" value={player.stats.speed} />
                </div>
                
                <h4 className="text-slate-400 font-bold text-xs mt-4 mb-2 border-b border-slate-700 pb-1">元素亲和 (每回合恢复)</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                        {primaryElements.map(elem => {
                             const config = ELEMENT_CONFIG[elem];
                             const val = player.stats.elementalAffinities[elem];
                             return (
                                <div key={elem} className="flex justify-between items-center bg-slate-800/30 px-1 rounded">
                                   <span className={`flex items-center gap-1 ${config.color}`}>
                                       {config.icon} {elem}
                                   </span>
                                   <span className="font-mono text-slate-200">{val}</span>
                                </div>
                             )
                        })}
                    </div>
                    
                    <div className="space-y-1">
                        {secondaryElements.map(elem => {
                             const config = ELEMENT_CONFIG[elem];
                             const val = player.stats.elementalAffinities[elem];
                             return (
                                <div key={elem} className="flex justify-between items-center bg-slate-800/30 px-1 rounded">
                                   <span className={`flex items-center gap-1 ${config.color}`}>
                                       {config.icon} {elem}
                                   </span>
                                   <span className="font-mono text-slate-200">{val}</span>
                                </div>
                             )
                        })}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                <h3 className="text-amber-400 font-bold border-b border-amber-800 pb-2 mb-3">已装备</h3>
                <div className="grid grid-cols-1 gap-2 pr-1">
                    {equipmentSlots.map(slot => (
                        <EquipSlot key={slot} label={SLOT_NAMES[slot]} item={player.equipment[slot]} />
                    ))}
                </div>
            </div>
        </div>

      </div>

      {/* Bottom: Action */}
      <div className="flex flex-col gap-2 shrink-0">
         <Button 
            variant="primary" 
            className="w-full py-4 text-2xl font-bold tracking-[0.5em] shadow-[0_0_20px_rgba(16,185,129,0.4)] border-emerald-500 hover:bg-emerald-700 active:scale-[0.99] transition-all"
            onClick={onStartAdventure}
         >
            外出历练
         </Button>
      </div>
      
      <style>{`
        @keyframes progress {
            0% { width: 0%; }
            100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

const StatRow = ({ label, value }: { label: string, value: string | number }) => (
  <div className="flex justify-between items-center">
    <span className="text-slate-400">{label}</span>
    <span className="font-mono text-slate-100">{value}</span>
  </div>
);

const EquipSlot: React.FC<{ label: string; item: Item | null }> = ({ label, item }) => (
    <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded border border-slate-600">
        <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center border border-slate-700 text-lg shrink-0">
            {item ? (item.icon || '🛡️') : <span className="text-[10px] text-slate-600">{label}</span>}
        </div>
        <div className="flex-1 overflow-hidden min-w-0">
            {item ? (
                <div>
                    <div className={`font-bold text-xs truncate ${item.rarity === 'legendary' ? 'text-amber-400' : 'text-white'}`}>{item.name}</div>
                    <div className="text-[9px] text-slate-400 truncate">
                        {item.statBonus?.attack ? `攻+${item.statBonus.attack} ` : ''}
                        {item.statBonus?.maxHp ? `血+${item.statBonus.maxHp} ` : ''}
                        {!item.statBonus?.attack && !item.statBonus?.maxHp && '属性加成'}
                    </div>
                </div>
            ) : (
                <div className="text-slate-600 text-[10px]">未装备</div>
            )}
        </div>
    </div>
);
