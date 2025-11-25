
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
          // Simple name matching fallback or id prefix matching because generated IDs vary
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
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] p-6 space-y-6 animate-fade-in overflow-hidden selection:bg-emerald-500 selection:text-white">
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
            </div>
        </div>

        {/* Center: Visual Scene (Expands) */}
        <div className="flex-1 relative rounded-3xl border-2 border-emerald-900 overflow-hidden bg-black flex flex-col items-center justify-center shadow-2xl group">
            <img src="https://picsum.photos/seed/dongfu_bg/1920/1080" alt="Dongfu" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[20s]" />
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
        <div className="w-[450px] bg-slate-900/90 border border-slate-700 rounded-2xl p-6 flex flex-col gap-6 shrink-0 z-10 overflow-y-auto shadow-xl custom-scrollbar">
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
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
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
            onClick={onStartAdventure}
         >
            🗡️ 外出历练 🗡️
         </Button>
      </div>

      {/* --- Full Screen Modals --- */}
      
      {/* Alchemy Modal */}
      {activeMenu === 'alchemy' && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
              <div className="w-full max-w-6xl h-[85vh] bg-slate-900 border-2 border-amber-700 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
                  {/* Close Button */}
                  <button onClick={() => setActiveMenu('none')} className="absolute top-4 right-4 text-slate-400 hover:text-white text-3xl z-50">✕</button>

                  {/* Header */}
                  <div className="flex justify-between items-center bg-amber-950/60 p-6 border-b border-amber-800">
                      <h3 className="text-3xl font-bold text-amber-200 flex items-center gap-4">
                          <span className="text-4xl">🔥</span> 炼丹房
                      </h3>
                  </div>

                  <div className="flex-1 flex overflow-hidden">
                      {/* Recipe List */}
                      <div className="w-80 border-r border-slate-700 bg-slate-800/40 p-4 overflow-y-auto custom-scrollbar">
                          <div className="text-sm text-amber-500/80 font-bold mb-4 px-2 tracking-widest uppercase">已掌握丹方 ({learnedRecipesList.length})</div>
                          {learnedRecipesList.length === 0 && (
                              <div className="text-slate-500 text-center mt-10 p-4 border border-dashed border-slate-700 rounded-lg">
                                  暂无丹方<br/><span className="text-sm">请前往游商购买</span>
                              </div>
                          )}
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
                          </div>
                      </div>

                      {/* Furnace Area */}
                      <div className="flex-1 flex flex-col items-center relative bg-[url('https://picsum.photos/seed/furnace_bg/1600/900')] bg-cover bg-center">
                          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
                          
                          {selectedRecipe && targetPill ? (
                              <div className="z-10 w-full h-full p-10 flex flex-col items-center">
                                  {/* Top Info */}
                                  <div className="flex items-start gap-8 mb-10 bg-black/40 p-6 rounded-2xl border border-amber-900/50 backdrop-blur-md max-w-2xl w-full">
                                      <div className="relative group shrink-0">
                                          <div className="w-28 h-28 rounded-full border-4 border-amber-500 bg-black/60 flex items-center justify-center text-6xl shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                                              {targetPill.icon}
                                          </div>
                                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-900 text-xs px-3 py-1 rounded-full border border-amber-700 text-amber-200 font-bold whitespace-nowrap">
                                              {getRealmName(targetPill.reqLevel, realms).split(' ')[0]} 品阶
                                          </div>
                                      </div>
                                      <div className="flex-1">
                                          <div className="text-3xl font-bold text-amber-200 mb-2">{targetPill.name}</div>
                                          <div className="text-lg text-slate-300 leading-relaxed mb-3">{targetPill.description}</div>
                                          <div className="flex items-center gap-4">
                                              <div className="text-base text-green-400 font-mono bg-green-900/30 px-3 py-1 rounded border border-green-800">
                                                  成功率: {(selectedRecipe.successRate! * 100).toFixed(0)}%
                                              </div>
                                              <div className="text-base text-blue-300 font-mono bg-blue-900/30 px-3 py-1 rounded border border-blue-800">
                                                  最大服用: {targetPill.maxUsage}次
                                              </div>
                                          </div>
                                      </div>
                                  </div>

                                  {/* Visual Furnace */}
                                  <div className="flex-1 flex items-center justify-center relative w-full">
                                      <div className="relative">
                                          <div className="text-[12rem] filter drop-shadow-[0_0_50px_orange] animate-pulse relative z-10">
                                              ⚗️
                                          </div>
                                          {/* Animated Fire */}
                                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-6xl text-red-500 animate-bounce flex gap-2 opacity-80">
                                              🔥<span className="scale-125">🔥</span>🔥
                                          </div>
                                      </div>
                                  </div>

                                  {/* Bottom Control Panel */}
                                  <div className="w-full max-w-4xl bg-slate-900/90 rounded-2xl p-6 border border-slate-700 mt-6 shadow-2xl">
                                      <div className="grid grid-cols-4 gap-6 mb-8">
                                          {currentRecipeStatus?.mats.map((mat, idx) => (
                                              <div key={idx} className="flex flex-col items-center gap-3 bg-slate-800 p-4 rounded-xl border border-slate-700">
                                                  <div className="w-16 h-16 bg-slate-900 rounded-lg border border-slate-600 flex items-center justify-center text-4xl relative">
                                                      {mat.icon}
                                                      <div className={`absolute -top-3 -right-3 text-sm px-2 py-0.5 rounded-full border-2 font-bold shadow-md ${mat.ok ? 'bg-green-900 border-green-500 text-green-200' : 'bg-red-900 border-red-500 text-red-200'}`}>
                                                          {mat.owned}/{mat.needed}
                                                      </div>
                                                  </div>
                                                  <div className="text-sm font-bold text-slate-300 text-center">{mat.name}</div>
                                              </div>
                                          ))}
                                      </div>
                                      
                                      <Button 
                                          size="lg" 
                                          className="w-full py-5 text-2xl bg-gradient-to-r from-amber-700 via-red-600 to-amber-700 border-amber-500 text-amber-100 font-bold tracking-[0.3em] shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:brightness-110 disabled:grayscale"
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
                              <div className="z-10 flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                                  <span className="text-8xl opacity-20">📜</span>
                                  <span className="text-2xl">请从左侧选择一个丹方</span>
                              </div>
                          )}

                          {/* Refining Overlay */}
                          {isRefining && (
                              <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center backdrop-blur-sm">
                                  <div className="text-4xl font-bold text-amber-400 mb-8 animate-pulse tracking-widest">炼丹中...</div>
                                  <div className="w-[600px] h-6 bg-slate-800 rounded-full overflow-hidden border-2 border-amber-900 box-content p-1">
                                      <div className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 w-full origin-left animate-[progress_10s_linear_forwards] rounded-full shadow-[0_0_20px_orange]"></div>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Bag / Deck Modal (Full Screen) */}
      {(activeMenu === 'bag' || activeMenu === 'deck') && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
                <div className="w-full max-w-7xl h-[85vh] bg-slate-900 border-2 border-slate-600 rounded-2xl flex flex-col p-8 shadow-2xl relative">
                    {/* Close Button */}
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
                                {player.inventory.length === 0 && <div className="text-slate-500 col-span-full text-center text-2xl mt-20">暂无物品</div>}
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
                                    
                                    let pillInfo = null;
                                    if (item.type === 'PILL') {
                                        const used = player.pillUsage[item.id] || 0;
                                        const max = item.maxUsage || 1;
                                        pillInfo = <div className="text-xs text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded inline-block mt-1">服用: {used}/{max}</div>
                                    }

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
                                                            item.type === 'ARTIFACT' ? '法宝' : 
                                                            item.type === 'MATERIAL' ? '药材' :
                                                            item.type === 'RECIPE' ? '丹方' :
                                                            item.type === 'PILL' ? '丹药' : '道具'}
                                                    </div>
                                                    <div className={`text-xs mt-1 ${canEquip ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        需 {getRealmName(item.reqLevel, realms)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 bg-slate-900/50 p-2 rounded text-xs text-slate-300 min-h-[40px] line-clamp-2">
                                                {item.description}
                                            </div>
                                            
                                            {statsDesc.length > 0 && (
                                                <div className="text-xs text-emerald-300 mt-2 font-mono bg-emerald-900/20 p-1 rounded px-2">
                                                    {statsDesc.join(', ')}
                                                </div>
                                            )}
                                            {pillInfo}
                                            
                                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/50">
                                                {isEquipable && (
                                                    <Button 
                                                        size="md" 
                                                        variant={canEquip ? 'outline' : 'secondary'} 
                                                        className="flex-1 text-sm font-bold"
                                                        onClick={() => onEquipItem(item)}
                                                        disabled={!canEquip}
                                                    >
                                                        {canEquip ? '装备' : '境界不足'}
                                                    </Button>
                                                )}
                                                {isConsumable && (
                                                    <Button
                                                        size="md"
                                                        variant="primary"
                                                        className="flex-1 text-sm font-bold"
                                                        onClick={() => onUseItem(item)}
                                                    >
                                                        {item.type === 'RECIPE' ? '学习' : '使用'}
                                                    </Button>
                                                )}
                                                {isMaterial && <div className="text-xs text-slate-600 text-center w-full py-2 bg-slate-900/50 rounded">炼丹材料</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activeMenu === 'deck' && (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 p-4">
                                {player.deck.map((card, idx) => (
                                    <div key={idx} className="transform hover:scale-105 transition-transform duration-300">
                                        <div className="scale-110 origin-top-left">
                                            <CardItem card={card} isPlayable={false} playerLevel={player.level} />
                                        </div>
                                    </div>
                                ))}
                                </div>
                        )}
                    </div>
                </div>
          </div>
      )}
      
      <style>{`
        @keyframes progress {
            0% { width: 0%; }
            100% { width: 100%; }
        }
        /* Hide scrollbar for Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .no-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #1e293b;
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #64748b;
        }
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
                        {item.statBonus?.maxHp ? `血+${item.statBonus.maxHp} ` : ''}
                        {item.statBonus?.defense ? `防+${item.statBonus.defense} ` : ''}
                        {!item.statBonus?.attack && !item.statBonus?.maxHp && !item.statBonus?.defense && '特殊属性'}
                    </div>
                </div>
            ) : (
                <div className="text-slate-500 text-xs font-bold">{label} - 空</div>
            )}
        </div>
    </div>
);
