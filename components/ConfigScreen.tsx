

import React, { useState, useRef } from 'react';
import { GameConfig, Card, Item, EnemyTemplate, CardType, ItemType, EquipmentSlot } from '../types';
import { SLOT_NAMES } from '../constants';
import { Button } from './Button';

interface ConfigScreenProps {
  config: GameConfig;
  onSave: (newConfig: GameConfig) => void;
  onCancel: () => void;
}

// Helpers to create empty objects
const createEmptyItem = (type: ItemType): Item => ({
  id: `item_${Date.now()}`,
  name: '新物品',
  type: type,
  slot: type === 'EQUIPMENT' ? 'mainWeapon' : undefined,
  description: '描述...',
  rarity: 'common',
  reqLevel: 1,
  statBonus: { attack: 0 }
});

const createEmptyCard = (): Card => ({
  id: `card_${Date.now()}`,
  name: '新卡牌',
  type: CardType.ATTACK,
  cost: 1,
  value: 5,
  description: '效果...',
  rarity: 'common',
  reqLevel: 1,
  tags: []
});

const createEmptyEnemy = (): EnemyTemplate => ({
  name: '新敌人',
  baseStats: { maxHp: 50, hp: 50, maxSpirit: 10, spirit: 10, attack: 5, defense: 0, speed: 10 },
  cardIds: [],
  minPlayerLevel: 1
});

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ config, onSave, onCancel }) => {
  const [localConfig, setLocalConfig] = useState<GameConfig>(JSON.parse(JSON.stringify(config)));
  const [activeTab, setActiveTab] = useState<'realms' | 'map' | 'items' | 'enemies' | 'cards' | 'player'>('realms');
  
  // Sub-tab for Items
  const [itemSubTab, setItemSubTab] = useState<ItemType>('EQUIPMENT');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSave(localConfig);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localConfig, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "cultivation_config.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const importedConfig = JSON.parse(event.target?.result as string);
              // Basic validation check
              if (!importedConfig.realms || !importedConfig.items || !importedConfig.cards) {
                  alert("无效的配置文件格式！");
                  return;
              }
              setLocalConfig(importedConfig);
              alert("配置导入成功！请记得点击保存。");
          } catch (err) {
              alert("读取文件失败，请检查文件是否为有效的JSON格式。");
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset file input
  };

  const renderTabButton = (id: typeof activeTab, label: string) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors whitespace-nowrap ${
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
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex flex-col md:flex-row justify-between items-center shrink-0 gap-4">
          <h2 className="text-2xl font-bold text-emerald-100">游戏配置</h2>
          
          <div className="flex gap-2 flex-wrap justify-center">
            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={handleFileChange} 
            />
            
            <Button variant="outline" size="sm" onClick={handleExport}>📤 导出配置</Button>
            <Button variant="outline" size="sm" onClick={handleImportClick}>📥 导入配置</Button>
            <div className="w-px h-8 bg-slate-600 mx-2 hidden md:block"></div>
            <Button variant="secondary" onClick={onCancel}>取消</Button>
            <Button variant="primary" onClick={handleSave}>保存配置</Button>
          </div>
        </div>

        <div className="flex border-b border-slate-700 bg-slate-950 px-4 pt-2 gap-1 overflow-x-auto shrink-0">
          {renderTabButton('realms', '⛰️ 境界设置')}
          {renderTabButton('map', '🌍 地图与掉落')}
          {renderTabButton('items', '💎 物品库')}
          {renderTabButton('enemies', '👿 敌人配置')}
          {renderTabButton('cards', '🎴 卡牌库')}
          {renderTabButton('player', '🧘 玩家初始')}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
          
          {activeTab === 'realms' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center mb-2">
                   <h3 className="text-lg font-bold text-slate-200">修仙境界划分</h3>
                   <p className="text-xs text-slate-500">定义每个阶段的等级范围和升级所需经验</p>
               </div>
               
               <div className="grid gap-4">
                  {localConfig.realms.map((realm, idx) => (
                      <div key={idx} className="bg-slate-800 p-4 rounded border border-slate-700 flex flex-wrap items-end gap-4">
                          <div>
                              <label className="text-xs text-emerald-500 font-bold">境界名称</label>
                              <input 
                                  value={realm.name}
                                  onChange={(e) => {
                                      const newRealms = [...localConfig.realms];
                                      newRealms[idx].name = e.target.value;
                                      setLocalConfig({...localConfig, realms: newRealms});
                                  }}
                                  className="block w-32 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                              />
                          </div>
                          <div>
                              <label className="text-xs text-slate-500">起始等级</label>
                              <input 
                                  type="number"
                                  value={realm.rangeStart}
                                  onChange={(e) => {
                                      const newRealms = [...localConfig.realms];
                                      newRealms[idx].rangeStart = parseInt(e.target.value);
                                      setLocalConfig({...localConfig, realms: newRealms});
                                  }}
                                  className="block w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                              />
                          </div>
                          <div>
                              <label className="text-xs text-slate-500">结束等级</label>
                              <input 
                                  type="number"
                                  value={realm.rangeEnd}
                                  onChange={(e) => {
                                      const newRealms = [...localConfig.realms];
                                      newRealms[idx].rangeEnd = parseInt(e.target.value);
                                      setLocalConfig({...localConfig, realms: newRealms});
                                  }}
                                  className="block w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                              />
                          </div>
                          <div>
                              <label className="text-xs text-amber-500 font-bold">升级所需EXP</label>
                              <input 
                                  type="number"
                                  value={realm.expReq}
                                  onChange={(e) => {
                                      const newRealms = [...localConfig.realms];
                                      newRealms[idx].expReq = parseInt(e.target.value);
                                      setLocalConfig({...localConfig, realms: newRealms});
                                  }}
                                  className="block w-32 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                              />
                          </div>
                      </div>
                  ))}
                  <div className="text-xs text-slate-500 mt-2">
                      * 游戏逻辑会根据玩家当前等级自动匹配所在的境界范围。请确保等级范围连续且不重叠。
                  </div>
               </div>
            </div>
          )}

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
              {/* Sub-tabs for Item Categories */}
              <div className="flex gap-2 border-b border-slate-700 pb-2 mb-4">
                  <button 
                      onClick={() => setItemSubTab('EQUIPMENT')}
                      className={`px-3 py-1 rounded text-sm font-bold ${itemSubTab === 'EQUIPMENT' ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' : 'text-slate-500 hover:bg-slate-800'}`}
                  >
                      🗡️ 装备库
                  </button>
                  <button 
                      onClick={() => setItemSubTab('CONSUMABLE')}
                      className={`px-3 py-1 rounded text-sm font-bold ${itemSubTab === 'CONSUMABLE' ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' : 'text-slate-500 hover:bg-slate-800'}`}
                  >
                      💊 道具库
                  </button>
                  <button 
                      onClick={() => setItemSubTab('ARTIFACT')}
                      className={`px-3 py-1 rounded text-sm font-bold ${itemSubTab === 'ARTIFACT' ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' : 'text-slate-500 hover:bg-slate-800'}`}
                  >
                      ✨ 法宝库
                  </button>
              </div>

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-200">
                    {itemSubTab === 'EQUIPMENT' && '装备列表'}
                    {itemSubTab === 'CONSUMABLE' && '道具列表'}
                    {itemSubTab === 'ARTIFACT' && '法宝列表'}
                </h3>
                <Button size="sm" onClick={() => setLocalConfig({...localConfig, items: [...localConfig.items, createEmptyItem(itemSubTab)]})}>
                    + 新增{itemSubTab === 'EQUIPMENT' ? '装备' : itemSubTab === 'CONSUMABLE' ? '道具' : '法宝'}
                </Button>
              </div>

              <div className="grid gap-4">
                {localConfig.items.filter(i => i.type === itemSubTab).map((item) => {
                   // Find the actual index in the main array to update correctly
                   const realIndex = localConfig.items.findIndex(i => i.id === item.id);
                   
                   return (
                   <div key={item.id + realIndex} className="bg-slate-800 p-4 rounded border border-slate-700 flex gap-4 items-start relative group">
                      <button 
                        className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700 p-1 rounded z-10"
                        onClick={() => {
                            const newItems = localConfig.items.filter((_, i) => i !== realIndex);
                            setLocalConfig({...localConfig, items: newItems});
                        }}
                      >
                          🗑️
                      </button>
                      <div className="flex-1 grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs text-slate-500">名称</label>
                            <input 
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...localConfig.items];
                                newItems[realIndex].name = e.target.value;
                                setLocalConfig({...localConfig, items: newItems});
                              }}
                              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          
                          {/* Slot Selector for Equipment/Artifact */}
                          {(itemSubTab === 'EQUIPMENT' || itemSubTab === 'ARTIFACT') && (
                              <div>
                                <label className="text-xs text-amber-500 font-bold">佩戴部位</label>
                                <select 
                                    value={item.slot || 'mainWeapon'}
                                    onChange={(e) => {
                                        const newItems = [...localConfig.items];
                                        newItems[realIndex].slot = e.target.value as EquipmentSlot;
                                        setLocalConfig({...localConfig, items: newItems});
                                    }}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-amber-300"
                                >
                                    {Object.entries(SLOT_NAMES).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                              </div>
                          )}
                          
                          {itemSubTab === 'CONSUMABLE' && (
                              <div>
                                <label className="text-xs text-slate-500">类型</label>
                                <div className="text-sm text-slate-400 pt-1">消耗品</div>
                              </div>
                          )}

                          <div>
                            <label className="text-xs text-slate-500">需求等级</label>
                            <input 
                              type="number"
                              value={item.reqLevel || 1}
                              onChange={(e) => {
                                const newItems = [...localConfig.items];
                                newItems[realIndex].reqLevel = parseInt(e.target.value);
                                setLocalConfig({...localConfig, items: newItems});
                              }}
                              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          
                          {/* Stats Configuration */}
                          <div>
                            <label className="text-xs text-slate-500">攻击加成</label>
                            <input 
                              type="number"
                              value={item.statBonus?.attack || 0}
                              onChange={(e) => {
                                const newItems = [...localConfig.items];
                                newItems[realIndex].statBonus = { ...newItems[realIndex].statBonus, attack: parseInt(e.target.value) };
                                setLocalConfig({...localConfig, items: newItems});
                              }}
                              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">防御加成</label>
                            <input 
                              type="number"
                              value={item.statBonus?.defense || 0}
                              onChange={(e) => {
                                const newItems = [...localConfig.items];
                                newItems[realIndex].statBonus = { ...newItems[realIndex].statBonus, defense: parseInt(e.target.value) };
                                setLocalConfig({...localConfig, items: newItems});
                              }}
                              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                            />
                          </div>
                           <div>
                            <label className="text-xs text-slate-500">HP加成</label>
                            <input 
                              type="number"
                              value={item.statBonus?.maxHp || 0}
                              onChange={(e) => {
                                const newItems = [...localConfig.items];
                                newItems[realIndex].statBonus = { ...newItems[realIndex].statBonus, maxHp: parseInt(e.target.value) };
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
                                newItems[realIndex].description = e.target.value;
                                setLocalConfig({...localConfig, items: newItems});
                              }}
                              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                            />
                          </div>
                      </div>
                   </div>
                )})}
                {localConfig.items.filter(i => i.type === itemSubTab).length === 0 && (
                    <div className="text-slate-500 text-center py-8">暂无此分类物品</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'enemies' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-200">敌人配置 ({localConfig.enemies.length})</h3>
                <Button size="sm" onClick={() => setLocalConfig({...localConfig, enemies: [...localConfig.enemies, createEmptyEnemy()]})}>
                    + 新增敌人
                </Button>
              </div>

              {localConfig.enemies.map((enemy, idx) => (
                <div key={idx} className="bg-slate-800 p-4 rounded border border-slate-700 relative group">
                  <button 
                        className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700 p-1 rounded"
                        onClick={() => {
                            const newEnemies = localConfig.enemies.filter((_, i) => i !== idx);
                            setLocalConfig({...localConfig, enemies: newEnemies});
                        }}
                  >
                          🗑️ 删除
                  </button>
                  <div className="flex flex-wrap gap-4 mb-4 items-end pr-10">
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
             <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-slate-200">卡牌库 ({localConfig.cards.length})</h3>
                    <Button size="sm" onClick={() => setLocalConfig({...localConfig, cards: [...localConfig.cards, createEmptyCard()]})}>
                        + 新增卡牌
                    </Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {localConfig.cards.map((card, idx) => (
                    <div key={card.id + idx} className="bg-slate-800 p-3 rounded border border-slate-700 flex flex-col gap-2 relative group">
                        <button 
                                className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700 p-1 rounded z-10"
                                onClick={() => {
                                    const newCards = localConfig.cards.filter((_, i) => i !== idx);
                                    setLocalConfig({...localConfig, cards: newCards});
                                }}
                        >
                                🗑️
                        </button>
                        <div className="flex justify-between gap-2 pr-6">
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
                         {/* Pierce Toggle */}
                         <div className="flex items-center gap-1 ml-auto">
                            <label className="flex items-center gap-1 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={card.tags?.includes('PIERCE') || false}
                                    onChange={(e) => {
                                        const newCards = [...localConfig.cards];
                                        if (e.target.checked) {
                                            newCards[idx].tags = [...(newCards[idx].tags || []), 'PIERCE'];
                                        } else {
                                            newCards[idx].tags = (newCards[idx].tags || []).filter(t => t !== 'PIERCE');
                                        }
                                        setLocalConfig({...localConfig, cards: newCards});
                                    }}
                                    className="rounded bg-slate-700 border-slate-500"
                                />
                                <span className={card.tags?.includes('PIERCE') ? 'text-amber-400 font-bold' : 'text-slate-500'}>穿刺</span>
                            </label>
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
                            <span className="text-sm text-emerald-200 truncate max-w-[80px]">{card.name}</span>
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