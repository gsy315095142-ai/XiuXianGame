
import React, { useState } from 'react';
import { GameConfig, Card, Item, EnemyTemplate, CardType } from '../types';
import { Button } from './Button';
import { getRealmName } from '../constants';

interface ConfigScreenProps {
  config: GameConfig;
  onSave: (newConfig: GameConfig) => void;
  onCancel: () => void;
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ config, onSave, onCancel }) => {
  const [localConfig, setLocalConfig] = useState<GameConfig>(JSON.parse(JSON.stringify(config)));
  const [activeTab, setActiveTab] = useState<'map' | 'items' | 'enemies' | 'cards' | 'player'>('map');

  const handleSave = () => {
    onSave(localConfig);
  };

  const renderTabButton = (id: typeof activeTab, label: string) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors ${
        activeTab === id 
          ? 'bg-slate-800 text-emerald-400 border-t-2 border-emerald-500' 
          : 'bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-emerald-100">游戏配置</h2>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel}>取消</Button>
            <Button variant="primary" onClick={handleSave}>保存配置</Button>
          </div>
        </div>

        <div className="flex border-b border-slate-700 bg-slate-950 px-4 pt-2 gap-1 overflow-x-auto">
          {renderTabButton('map', '🌍 地图与掉落')}
          {renderTabButton('items', '💎 物品库')}
          {renderTabButton('enemies', '👿 敌人配置')}
          {renderTabButton('cards', '🎴 卡牌库')}
          {renderTabButton('player', '🧘 玩家初始')}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
          {activeTab === 'map' && (
            <div className="space-y-6 max-w-lg">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">探险地图节点数量</label>
                <input 
                  type="number" 
                  value={localConfig.mapNodeCount}
                  onChange={(e) => setLocalConfig({...localConfig, mapNodeCount: parseInt(e.target.value) || 5})}
                  className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white focus:border-emerald-500 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">建议范围: 5 - 20</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">宝物/事件掉落概率 (0.0 - 1.0)</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0"
                  max="1"
                  value={localConfig.itemDropRate}
                  onChange={(e) => setLocalConfig({...localConfig, itemDropRate: parseFloat(e.target.value)})}
                  className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-200">物品库列表 ({localConfig.items.length})</h3>
              </div>
              <div className="grid gap-4">
                {localConfig.items.map((item, idx) => (
                   <div key={idx} className="bg-slate-800 p-4 rounded border border-slate-700 flex gap-4 items-start">
                      <div className="flex-1 grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs text-slate-500">名称</label>
                            <input 
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...localConfig.items];
                                newItems[idx].name = e.target.value;
                                setLocalConfig({...localConfig, items: newItems});
                              }}
                              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">需求等级</label>
                            <input 
                              type="number"
                              value={item.reqLevel || 1}
                              onChange={(e) => {
                                const newItems = [...localConfig.items];
                                newItems[idx].reqLevel = parseInt(e.target.value);
                                setLocalConfig({...localConfig, items: newItems});
                              }}
                              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">攻击加成</label>
                            <input 
                              type="number"
                              value={item.statBonus?.attack || 0}
                              onChange={(e) => {
                                const newItems = [...localConfig.items];
                                newItems[idx].statBonus = { ...newItems[idx].statBonus, attack: parseInt(e.target.value) };
                                setLocalConfig({...localConfig, items: newItems});
                              }}
                              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="text-xs text-slate-500">描述</label>
                            <input 
                              value={item.description}
                              onChange={(e) => {
                                const newItems = [...localConfig.items];
                                newItems[idx].description = e.target.value;
                                setLocalConfig({...localConfig, items: newItems});
                              }}
                              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                            />
                          </div>
                      </div>
                   </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'enemies' && (
            <div className="space-y-6">
              {localConfig.enemies.map((enemy, idx) => (
                <div key={idx} className="bg-slate-800 p-4 rounded border border-slate-700">
                  <div className="flex flex-wrap gap-4 mb-4 items-end">
                    <div>
                      <label className="text-xs text-slate-500">敌人名称</label>
                      <input 
                        value={enemy.name}
                        onChange={(e) => {
                          const newEnemies = [...localConfig.enemies];
                          newEnemies[idx].name = e.target.value;
                          setLocalConfig({...localConfig, enemies: newEnemies});
                        }}
                        className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm w-40"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-emerald-500 font-bold">出现需求(玩家等级)</label>
                      <input 
                        type="number"
                        value={enemy.minPlayerLevel || 1}
                        onChange={(e) => {
                          const newEnemies = [...localConfig.enemies];
                          newEnemies[idx].minPlayerLevel = parseInt(e.target.value);
                          setLocalConfig({...localConfig, enemies: newEnemies});
                        }}
                        className="block bg-slate-900 border border-emerald-600 rounded px-2 py-1 text-sm w-40"
                      />
                    </div>
                    <div className="flex gap-2">
                       {['maxHp', 'attack', 'speed'].map(stat => (
                         <div key={stat}>
                            <label className="text-xs text-slate-500 capitalize">{stat}</label>
                            <input 
                              type="number"
                              value={enemy.baseStats[stat as keyof typeof enemy.baseStats]}
                              onChange={(e) => {
                                const newEnemies = [...localConfig.enemies];
                                // @ts-ignore
                                newEnemies[idx].baseStats[stat] = parseInt(e.target.value);
                                setLocalConfig({...localConfig, enemies: newEnemies});
                              }}
                              className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm w-20"
                            />
                         </div>
                       ))}
                    </div>
                  </div>
                  <div>
                     <label className="text-xs text-slate-500 mb-1 block">携带卡牌 (ID)</label>
                     <div className="flex flex-wrap gap-2 bg-slate-900 p-2 rounded border border-slate-700 min-h-[40px]">
                        {localConfig.cards.map(card => (
                          <label key={card.id} className={`flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer select-none border ${enemy.cardIds.includes(card.id) ? 'bg-emerald-900 border-emerald-500 text-emerald-200' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                            <input 
                              type="checkbox" 
                              checked={enemy.cardIds.includes(card.id)}
                              onChange={(e) => {
                                const newEnemies = [...localConfig.enemies];
                                if (e.target.checked) {
                                  newEnemies[idx].cardIds.push(card.id);
                                } else {
                                  newEnemies[idx].cardIds = newEnemies[idx].cardIds.filter(id => id !== card.id);
                                }
                                setLocalConfig({...localConfig, enemies: newEnemies});
                              }}
                              className="hidden"
                            />
                            {card.name}
                          </label>
                        ))}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'cards' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {localConfig.cards.map((card, idx) => (
                  <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-700 flex flex-col gap-2">
                    <div className="flex justify-between gap-2">
                       <input 
                          value={card.name} 
                          onChange={(e) => {
                            const newCards = [...localConfig.cards];
                            newCards[idx].name = e.target.value;
                            setLocalConfig({...localConfig, cards: newCards});
                          }}
                          className="bg-slate-900 font-bold text-emerald-300 border-none rounded px-1 w-1/3"
                       />
                       <select 
                          value={card.type}
                          onChange={(e) => {
                            const newCards = [...localConfig.cards];
                            newCards[idx].type = e.target.value as CardType;
                            setLocalConfig({...localConfig, cards: newCards});
                          }}
                          className="bg-slate-900 text-xs text-slate-300 rounded w-1/4"
                       >
                          {Object.values(CardType).map(t => <option key={t} value={t}>{t}</option>)}
                       </select>
                       <div className="flex items-center gap-1 w-1/3 justify-end">
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">Req Lv</span>
                            <input 
                              type="number"
                              value={card.reqLevel || 1}
                              onChange={(e) => {
                                const newCards = [...localConfig.cards];
                                newCards[idx].reqLevel = parseInt(e.target.value);
                                setLocalConfig({...localConfig, cards: newCards});
                              }}
                              className="w-10 bg-slate-900 rounded px-1 text-xs"
                            />
                       </div>
                    </div>
                    <div className="flex gap-2 text-xs">
                       <div className="flex items-center gap-1">
                         <span>Cost:</span>
                         <input type="number" value={card.cost} onChange={(e) => {
                             const newCards = [...localConfig.cards];
                             newCards[idx].cost = parseInt(e.target.value);
                             setLocalConfig({...localConfig, cards: newCards});
                         }} className="w-10 bg-slate-900 rounded px-1" />
                       </div>
                       <div className="flex items-center gap-1">
                         <span>Value:</span>
                         <input type="number" value={card.value} onChange={(e) => {
                             const newCards = [...localConfig.cards];
                             newCards[idx].value = parseInt(e.target.value);
                             setLocalConfig({...localConfig, cards: newCards});
                         }} className="w-10 bg-slate-900 rounded px-1" />
                       </div>
                    </div>
                    <textarea 
                      value={card.description} 
                      onChange={(e) => {
                        const newCards = [...localConfig.cards];
                        newCards[idx].description = e.target.value;
                        setLocalConfig({...localConfig, cards: newCards});
                      }}
                      className="w-full bg-slate-900 text-xs text-slate-400 rounded p-1 resize-none h-12"
                    />
                  </div>
                ))}
             </div>
          )}

          {activeTab === 'player' && (
             <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-800 p-4 rounded border border-slate-700">
                   {['maxHp', 'maxSpirit', 'attack', 'speed'].map(stat => (
                     <div key={stat}>
                       <label className="block text-xs text-slate-500 uppercase mb-1">{stat}</label>
                       <input 
                         type="number" 
                         // @ts-ignore
                         value={localConfig.playerInitialStats[stat]} 
                         onChange={(e) => {
                             const newStats = {...localConfig.playerInitialStats};
                             // @ts-ignore
                             newStats[stat] = parseInt(e.target.value);
                             setLocalConfig({...localConfig, playerInitialStats: newStats});
                         }}
                         className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white"
                       />
                     </div>
                   ))}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-200 mb-3">初始牌组选择</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {localConfig.cards.map(card => {
                       const count = localConfig.playerInitialDeckIds.filter(id => id === card.id).length;
                       return (
                         <div key={card.id} className="bg-slate-800 p-2 rounded border border-slate-600 flex justify-between items-center">
                            <span className="text-sm text-emerald-200 truncate">{card.name}</span>
                            <div className="flex items-center gap-2">
                               <button 
                                 className="w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center text-red-400"
                                 onClick={() => {
                                     const idx = localConfig.playerInitialDeckIds.indexOf(card.id);
                                     if (idx > -1) {
                                         const newDeck = [...localConfig.playerInitialDeckIds];
                                         newDeck.splice(idx, 1);
                                         setLocalConfig({...localConfig, playerInitialDeckIds: newDeck});
                                     }
                                 }}
                               >-</button>
                               <span className="w-4 text-center text-sm">{count}</span>
                               <button 
                                 className="w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center text-green-400"
                                 onClick={() => {
                                     setLocalConfig({...localConfig, playerInitialDeckIds: [...localConfig.playerInitialDeckIds, card.id]});
                                 }}
                               >+</button>
                            </div>
                         </div>
                       );
                    })}
                  </div>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
