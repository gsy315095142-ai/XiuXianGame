

import React, { useState, useEffect } from 'react';
import { Player, Item, RealmRank, EquipmentSlot, ElementType, GameMap, ArtifactSlotConfig } from '../types';
import { getRealmName, SLOT_NAMES, ELEMENT_CONFIG } from '../constants';
import { Button } from './Button';
import { CardItem } from './CardItem';

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
  isRefining: boolean;
  itemsConfig: Item[];
  // New props for artifacts
  artifactConfigs?: ArtifactSlotConfig[];
  onUnlockArtifactSlot?: (index: number) => void;
  onUnequipArtifact?: (index: number) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
    player, realms, maps, onStartAdventure, onEquipItem, onUseItem, onEndGame, onBreakthrough, onRefine, onCraft, isRefining, itemsConfig,
    artifactConfigs = [], onUnlockArtifactSlot, onUnequipArtifact
}) => {
  const [activeMenu, setActiveMenu] = useState<'none' | 'bag' | 'deck' | 'alchemy' | 'forge' | 'mapSelect'>('none');
  const [selectedRecipe, setSelectedRecipe] = useState<Item | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Item | null>(null);

  const realmName = getRealmName(player.level, realms);
  
  const expPercentage = Math.min(100, (player.exp / player.maxExp) * 100);
  const canBreakthrough = player.exp >= player.maxExp;
  
  const currentRealm = realms.find(r => player.level >= r.rangeStart && player.level <= r.rangeEnd) || realms[0];
  const levelIndex = player.level - currentRealm.rangeStart;
  const levelConfig = currentRealm.levels[levelIndex];

  const breakthroughCost = levelConfig ? levelConfig.breakthroughCost : 0;
  const breakthroughChance = levelConfig ? (levelConfig.breakthroughChance * 100) : 0;
  
  const alchemyUnlockLevel = 5; // Qi Refining Layer 5
  const forgeUnlockLevel = 11; // Foundation (Zhuji) start
  const isAlchemyUnlocked = player.level >= alchemyUnlockLevel;
  const isForgeUnlocked = player.level >= forgeUnlockLevel;

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
  
  const learnedBlueprintsList = player.learnedBlueprints
    .map(rid => itemsConfig.find(i => i.id === rid))
    .filter((i): i is Item => !!i);

    
  // Check materials for selected recipe/blueprint
  const getMaterialStatus = (item: Item) => {
      if (!item.recipeMaterials) return { sufficient: false, mats: [] };
      const mats = item.recipeMaterials.map(rm => {
          const matItem = itemsConfig.find(i => i.id === rm.itemId);
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

  const currentBlueprintStatus = selectedBlueprint ? getMaterialStatus(selectedBlueprint) : null;
  const targetArtifact = selectedBlueprint ? itemsConfig.find(i => i.id === selectedBlueprint.recipeResult) : null;

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
        
        {/* Left: Menus (Wider) */}
        <div className="w-80 flex flex-col gap-4 shrink-0 z-10">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 flex flex-col gap-4 h-full shadow-xl">
                <h3 className="text-slate-400 text-sm font-bold uppercase mb-2 tracking-widest border-b border-slate-600 pb-2">洞府管理</h3>
                <Button 
                    variant={activeMenu === 'bag' ? 'primary' : 'secondary'} 
                    onClick={() => setActiveMenu(activeMenu === 'bag' ? 'none' : 'bag')}
                    className="justify-start text-xl py-5 px-6"
                >
                    <span className="mr-3 text-2xl">🎒</span> 储物袋
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

        {/* Center: Visual Scene (Expands) */}
        <div className="flex-1 relative rounded-3xl border-2 border-emerald-900 overflow-hidden bg-black flex flex-col items-center justify-center shadow-2xl group min-w-0">
            {/* UPDATED BACKGROUND IMAGE */}
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

        {/* Right: Stats & Equipment (Wider) */}
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
                    {/* Primary Column */}
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
                    {/* Secondary Column */}
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
                    <span>🧿</span> 本命法宝
                    <span className="text-xs text-slate-500 ml-auto font-normal">已解锁: {player.unlockedArtifactCount} / {artifactConfigs.length}</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {artifactConfigs.map((config, index) => {
                        const isUnlocked = index < player.unlockedArtifactCount;
                        const item = player.artifacts[index];
                        const canUnlock = !isUnlocked && index === player.unlockedArtifactCount; // Can only unlock next one
                        
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
                                        <div className="text-xs text-slate-500 font-bold">空闲法宝栏</div>
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

      {/* Map Selection Modal */}
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
                                      
                                      <div className="space-y-2 mb-4">
                                          <div className="flex justify-between text-xs text-slate-500 border-b border-slate-700 pb-1">
                                              <span>推荐境界</span>
                                              <span className={isLocked ? 'text-red-500 font-bold' : 'text-emerald-500'}>{getRealmName(map.reqLevel, realms)}</span>
                                          </div>
                                          <div className="flex justify-between text-xs text-slate-500 border-b border-slate-700 pb-1">
                                              <span>区域大小</span>
                                              <span>{map.nodeCount} 节点</span>
                                          </div>
                                          <div className="flex gap-2 justify-end text-[10px] text-slate-600">
                                              {map.eventWeights.merchant > 0.1 && <span className="text-amber-500">💰 游商</span>}
                                              {map.eventWeights.treasure > 0.3 && <span className="text-yellow-400">🎁 宝物多</span>}
                                              {map.eventWeights.battle > 0.4 && <span className="text-red-400">⚔️ 凶险</span>}
                                          </div>
                                      </div>

                                      <Button 
                                          variant={isLocked ? 'secondary' : 'primary'}
                                          disabled={isLocked}
                                          onClick={() => {
                                              if(!isLocked) {
                                                  onStartAdventure(map);
                                              }
                                          }}
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
      
      {/* Alchemy Modal */}
      {activeMenu === 'alchemy' && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
              <div className="w-full max-w-6xl h-[85vh] bg-slate-900 border-2 border-amber-700 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
                  <button onClick={() => setActiveMenu('none')} className="absolute top-4 right-4 text-slate-400 hover:text-white text-3xl z-50">✕</button>
                  
                   <div className="bg-slate-950 p-6 border-b border-amber-900/50 flex items-center gap-4">
                        <span className="text-4xl">🔥</span>
                        <div>
                            <h3 className="text-3xl font-bold text-amber-200">炼丹房</h3>
                            <p className="text-amber-500/60 text-sm">以天地为炉，炼万物为丹。</p>
                        </div>
                   </div>

                   <div className="flex-1 flex overflow-hidden">
                      <div className="w-80 border-r border-slate-700 bg-slate-800/40 p-4 overflow-y-auto custom-scrollbar">
                           <h4 className="text-slate-500 font-bold mb-4 uppercase text-xs tracking-widest">已掌握丹方</h4>
                           <div className="space-y-2">
                              {learnedRecipesList.map(recipe => (
                                  <button
                                      key={recipe.id}
                                      onClick={() => setSelectedRecipe(recipe)}
                                      className={`w-full text-left p-4 rounded-xl text-lg font-bold transition-all flex items-center justify-between border ${selectedRecipe?.id === recipe.id ? 'bg-amber-900/80 border-amber-600 text-amber-100 shadow-lg translate-x-1' : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                                  >
                                      <span>{recipe.name}</span>
                                      {selectedRecipe?.id === recipe.id && <span>✨</span>}
                                  </button>
                              ))}
                              {learnedRecipesList.length === 0 && <div className="text-slate-600 text-center py-10">暂无丹方</div>}
                          </div>
                      </div>
                      <div className="flex-1 flex flex-col items-center relative bg-slate-900">
                          {selectedRecipe && targetPill ? (
                             <div className="flex-1 w-full flex flex-col">
                                 <div className="flex-1 flex items-center justify-center p-8 relative">
                                      {/* Furnace Visual */}
                                      <div className="relative">
                                          <div className={`text-[120px] filter drop-shadow-[0_0_30px_rgba(245,158,11,0.5)] ${isRefining ? 'animate-bounce-slight' : ''}`}>鼎</div>
                                          {isRefining && <div className="absolute inset-0 flex items-center justify-center text-6xl animate-ping opacity-50">🔥</div>}
                                      </div>
                                      
                                      {/* Target Info */}
                                      <div className="absolute top-8 right-8 bg-slate-800 p-4 rounded-xl border border-slate-700 w-64">
                                          <div className="text-4xl mb-2 text-center">{targetPill.icon}</div>
                                          <div className="text-xl font-bold text-center text-amber-200 mb-1">{targetPill.name}</div>
                                          <div className="text-xs text-slate-400 text-center mb-3">{targetPill.description}</div>
                                          <div className="text-center text-emerald-400 font-bold text-sm bg-black/30 py-1 rounded">
                                              成功率: {((selectedRecipe.successRate || 0.5) * 100).toFixed(0)}%
                                          </div>
                                      </div>
                                 </div>

                                 {/* Materials Check */}
                                 <div className="h-1/3 bg-slate-950 border-t border-slate-800 p-6">
                                     <h4 className="text-slate-400 font-bold mb-4 flex items-center gap-2">
                                         <span>🌿</span> 所需药材
                                     </h4>
                                     <div className="flex gap-6 justify-center">
                                         {currentRecipeStatus?.mats.map((mat, i) => (
                                             <div key={i} className={`flex flex-col items-center p-3 rounded-lg border-2 ${mat.ok ? 'bg-slate-900 border-emerald-900' : 'bg-red-900/10 border-red-900'}`}>
                                                 <div className="text-3xl mb-2">{mat.icon}</div>
                                                 <div className={`font-bold text-sm ${mat.ok ? 'text-slate-300' : 'text-red-400'}`}>{mat.name}</div>
                                                 <div className={`text-xs mt-1 font-mono ${mat.ok ? 'text-emerald-500' : 'text-red-500'}`}>
                                                     {mat.owned} / {mat.needed}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                     <div className="mt-6 flex justify-center">
                                         <Button 
                                              size="lg" 
                                              className="w-64 py-3 text-lg"
                                              disabled={!currentRecipeStatus?.sufficient || isRefining}
                                              onClick={() => {
                                                  if(selectedRecipe.recipeMaterials) {
                                                      onRefine(selectedRecipe.id, selectedRecipe.recipeMaterials);
                                                  }
                                              }}
                                          >
                                              {isRefining ? '炼制中...' : '🔥 开始炼丹'}
                                          </Button>
                                     </div>
                                 </div>
                             </div>
                          ) : (
                              <div className="text-slate-500 mt-20 flex flex-col items-center">
                                  <span className="text-6xl mb-4 opacity-30">📜</span>
                                  <span>请从左侧选择丹方</span>
                              </div>
                          )}
                      </div>
                   </div>
              </div>
          </div>
      )}

      {/* Forge Modal (Crafting) */}
      {activeMenu === 'forge' && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
              <div className="w-full max-w-6xl h-[85vh] bg-slate-900 border-2 border-orange-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
                  <button onClick={() => setActiveMenu('none')} className="absolute top-4 right-4 text-slate-400 hover:text-white text-3xl z-50">✕</button>
                  
                   <div className="bg-slate-950 p-6 border-b border-orange-900/50 flex items-center gap-4">
                        <span className="text-4xl">⚒️</span>
                        <div>
                            <h3 className="text-3xl font-bold text-orange-200">炼器房</h3>
                            <p className="text-orange-500/60 text-sm">千锤百炼，铸造神兵利器。</p>
                        </div>
                   </div>

                   <div className="flex-1 flex overflow-hidden">
                      <div className="w-80 border-r border-slate-700 bg-slate-800/40 p-4 overflow-y-auto custom-scrollbar">
                           <h4 className="text-slate-500 font-bold mb-4 uppercase text-xs tracking-widest">已掌握图纸</h4>
                           <div className="space-y-2">
                              {learnedBlueprintsList.map(bp => (
                                  <button
                                      key={bp.id}
                                      onClick={() => setSelectedBlueprint(bp)}
                                      className={`w-full text-left p-4 rounded-xl text-lg font-bold transition-all flex items-center justify-between border ${selectedBlueprint?.id === bp.id ? 'bg-orange-900/80 border-orange-600 text-orange-100 shadow-lg translate-x-1' : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                                  >
                                      <span>{bp.name}</span>
                                      {selectedBlueprint?.id === bp.id && <span>✨</span>}
                                  </button>
                              ))}
                              {learnedBlueprintsList.length === 0 && <div className="text-slate-600 text-center py-10">暂无图纸</div>}
                          </div>
                      </div>
                      <div className="flex-1 flex flex-col items-center relative bg-slate-900">
                          {selectedBlueprint && targetArtifact ? (
                             <div className="flex-1 w-full flex flex-col">
                                 <div className="flex-1 flex items-center justify-center p-8 relative">
                                      {/* Anvil Visual */}
                                      <div className="relative">
                                          <div className={`text-[120px] filter drop-shadow-[0_0_30px_rgba(234,88,12,0.5)] ${isRefining ? 'animate-bounce' : ''}`}>🛡️</div>
                                          {isRefining && <div className="absolute -top-10 left-10 text-6xl animate-ping opacity-80">🔨</div>}
                                      </div>
                                      
                                      {/* Target Info */}
                                      <div className="absolute top-8 right-8 bg-slate-800 p-4 rounded-xl border border-slate-700 w-64">
                                          <div className="text-4xl mb-2 text-center">{targetArtifact.icon}</div>
                                          <div className="text-xl font-bold text-center text-orange-200 mb-1">{targetArtifact.name}</div>
                                          <div className="text-xs text-slate-400 text-center mb-3">{targetArtifact.description}</div>
                                          <div className="text-center text-emerald-400 font-bold text-sm bg-black/30 py-1 rounded">
                                              成功率: {((selectedBlueprint.successRate || 0.4) * 100).toFixed(0)}%
                                          </div>
                                      </div>
                                 </div>

                                 {/* Materials Check */}
                                 <div className="h-1/3 bg-slate-950 border-t border-slate-800 p-6">
                                     <h4 className="text-slate-400 font-bold mb-4 flex items-center gap-2">
                                         <span>🧱</span> 所需器材
                                     </h4>
                                     <div className="flex gap-6 justify-center">
                                         {currentBlueprintStatus?.mats.map((mat, i) => (
                                             <div key={i} className={`flex flex-col items-center p-3 rounded-lg border-2 ${mat.ok ? 'bg-slate-900 border-emerald-900' : 'bg-red-900/10 border-red-900'}`}>
                                                 <div className="text-3xl mb-2">{mat.icon}</div>
                                                 <div className={`font-bold text-sm ${mat.ok ? 'text-slate-300' : 'text-red-400'}`}>{mat.name}</div>
                                                 <div className={`text-xs mt-1 font-mono ${mat.ok ? 'text-emerald-500' : 'text-red-500'}`}>
                                                     {mat.owned} / {mat.needed}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                     <div className="mt-6 flex justify-center">
                                         <Button 
                                              size="lg" 
                                              className="w-64 py-3 text-lg bg-orange-700 border-orange-600 hover:bg-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.4)]"
                                              disabled={!currentBlueprintStatus?.sufficient || isRefining}
                                              onClick={() => {
                                                  if(selectedBlueprint.recipeMaterials) {
                                                      onCraft(selectedBlueprint.id, selectedBlueprint.recipeMaterials);
                                                  }
                                              }}
                                          >
                                              {isRefining ? '锻造中...' : '⚒️ 开始炼器'}
                                          </Button>
                                     </div>
                                 </div>
                             </div>
                          ) : (
                              <div className="text-slate-500 mt-20 flex flex-col items-center">
                                  <span className="text-6xl mb-4 opacity-30">🗺️</span>
                                  <span>请从左侧选择图纸</span>
                              </div>
                          )}
                      </div>
                   </div>
              </div>
          </div>
      )}

      {/* Bag / Deck Modal */}
      {(activeMenu === 'bag' || activeMenu === 'deck') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 animate-fade-in">
                <div className="w-full max-w-7xl h-[85vh] bg-slate-900 border-2 border-slate-600 rounded-2xl flex flex-col p-8 shadow-2xl relative bg-black/90">
                    <button onClick={() => setActiveMenu('none')} className="absolute top-6 right-6 text-slate-400 hover:text-white text-4xl">✕</button>

                    <div className="flex items-center gap-4 border-b border-slate-700 pb-6 mb-6">
                        <span className="text-5xl">{activeMenu === 'bag' ? '🎒' : '🎴'}</span>
                        <h3 className="text-4xl font-bold text-white tracking-wider">
                            {activeMenu === 'bag' ? '储物袋' : '本命卡组'}
                        </h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {activeMenu === 'bag' && (
                            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-6">
                                {player.inventory.map((item, idx) => {
                                    const canEquip = player.level >= item.reqLevel;
                                    const isArtifact = item.type === 'ARTIFACT';
                                    const isEquipable = item.type === 'EQUIPMENT' || isArtifact;
                                    const isConsumable = item.type === 'CONSUMABLE' || item.type === 'RECIPE' || item.type === 'PILL' || item.type === 'FORGE_BLUEPRINT';
                                    
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
                                                            item.type === 'MATERIAL' ? '药材' :
                                                            item.type === 'FORGE_MATERIAL' ? '器材' :
                                                            item.type === 'RECIPE' ? '丹方' :
                                                            item.type === 'FORGE_BLUEPRINT' ? '图纸' :
                                                            item.type === 'PILL' ? '丹药' : '道具'}
                                                    </div>
                                                </div>
                                            </div>
                                            
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
                                                        {item.type === 'RECIPE' || item.type === 'FORGE_BLUEPRINT' ? '学习' : '使用'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {/* Deck View omitted for brevity */}
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

const StatRow = ({ label, value, icon, color }: { label: string, value: string | number, icon: string, color: string }) => (
  <div className="flex justify-between items-center bg-slate-800 p-2 rounded-lg border border-slate-700/50">
    <span className="text-slate-400 font-bold flex items-center gap-2 text-sm">
        <span className="text-lg">{icon}</span> {label}
    </span>
    <span className={`font-mono font-bold text-lg ${color}`}>{value}</span>
  </div>
);

const EquipSlot: React.FC<{ label: string; item: Item | null }> = ({ label, item }) => (
    <div className="flex items-center gap-3 bg-slate-800 p-2.5 rounded-xl border border-slate-600 shadow-sm hover:bg-slate-700/80 transition-colors cursor-help">
        <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-500 text-2xl shrink-0 shadow-inner">
            {item ? (item.icon || '🛡️') : <span className="text-xs text-slate-600 font-bold text-center leading-tight opacity-50">{label.slice(0,2)}</span>}
        </div>
        <div className="flex-1 overflow-hidden min-w-0">
            {item ? (
                <div>
                    <div className={`font-bold text-sm truncate ${item.rarity === 'legendary' ? 'text-amber-400' : 'text-white'}`}>{item.name}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {item.statBonus?.attack ? `攻+${item.statBonus.attack} ` : ''}
                        {item.statBonus?.defense ? `防+${item.statBonus.defense} ` : ''}
                        {!item.statBonus?.attack && !item.statBonus?.defense && '特殊属性'}
                    </div>
                </div>
            ) : (
                <div className="text-slate-500 text-xs font-bold">{label} - 空</div>
            )}
        </div>
    </div>
);
