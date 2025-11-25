import React, { useState, useRef } from 'react';
import { GameConfig, Card, Item, EnemyTemplate, CardType, ItemType, EquipmentSlot, ElementType } from '../types';
import { getRealmName, SLOT_NAMES, createZeroElementStats } from '../constants';
import { Button } from './Button';
import * as XLSX from 'xlsx';

interface ConfigScreenProps {
  config: GameConfig;
  onSave: (newConfig: GameConfig) => void;
  onCancel: () => void;
}

// Helpers to create empty objects
const createEmptyItem = (type: ItemType, level: number = 1): Item => ({
  id: `item_${Date.now()}`,
  name: '新物品',
  icon: type === 'EQUIPMENT' ? '⚔️' : type === 'CONSUMABLE' ? '💊' : '🏺', // Default icon
  type: type,
  slot: type === 'EQUIPMENT' ? 'mainWeapon' : undefined,
  description: '描述...',
  rarity: 'common',
  reqLevel: level,
  price: 50 * level,
  statBonus: { attack: 0, elementalAffinities: createZeroElementStats() }
});

const createEmptyCard = (level: number = 1): Card => ({
  id: `card_${Date.now()}`,
  name: '新卡牌',
  type: CardType.ATTACK,
  cost: 1,
  element: ElementType.SWORD,
  elementCost: 1,
  value: 5 * level,
  description: '效果...',
  rarity: 'common',
  reqLevel: level,
  tags: []
});

const createEmptyEnemy = (level: number = 1): EnemyTemplate => ({
  name: '新敌人',
  baseStats: { maxHp: 50 * level, hp: 50 * level, maxSpirit: 10 + level, spirit: 10 + level, attack: 5 + level, defense: 0, speed: 10, elementalAffinities: createZeroElementStats() },
  cardIds: [],
  minPlayerLevel: level
});

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ config, onSave, onCancel }) => {
  const [localConfig, setLocalConfig] = useState<GameConfig>(JSON.parse(JSON.stringify(config)));
  const [activeTab, setActiveTab] = useState<'realms' | 'map' | 'items' | 'enemies' | 'cards' | 'player'>('realms');
  const [itemSubTab, setItemSubTab] = useState<ItemType>('EQUIPMENT');
  
  // Filter State
  const [realmFilter, setRealmFilter] = useState<string>('ALL');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSave(localConfig);
  };

  // --- Filtering Helpers ---
  const filterByRealm = (level: number) => {
      if (realmFilter === 'ALL') return true;
      const realm = localConfig.realms.find(r => r.name === realmFilter);
      if (!realm) return true;
      return level >= realm.rangeStart && level <= realm.rangeEnd;
  };

  const getFilterStartLevel = () => {
      if (realmFilter === 'ALL') return 1;
      const realm = localConfig.realms.find(r => r.name === realmFilter);
      return realm ? realm.rangeStart : 1;
  };

  const renderRealmFilter = () => (
      <select
          value={realmFilter}
          onChange={(e) => setRealmFilter(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-300 outline-none focus:border-emerald-500 cursor-pointer"
      >
          <option value="ALL">全部境界</option>
          {localConfig.realms.map(r => (
              <option key={r.name} value={r.name}>{r.name}</option>
          ))}
      </select>
  );

  const handleExportExcel = () => {
    try {
        const wb = XLSX.utils.book_new();

        // 1. General Config Sheet
        const generalData = [
            { Key: 'mapNodeCount', Value: localConfig.mapNodeCount },
            { Key: 'itemDropRate', Value: localConfig.itemDropRate },
            // Map Event Weights
            { Key: 'weight_merchant', Value: localConfig.eventWeights?.merchant ?? 0.15 },
            { Key: 'weight_treasure', Value: localConfig.eventWeights?.treasure ?? 0.25 },
            { Key: 'weight_battle', Value: localConfig.eventWeights?.battle ?? 0.30 },
            { Key: 'weight_empty', Value: localConfig.eventWeights?.empty ?? 0.30 },

            { Key: 'player_maxHp', Value: localConfig.playerInitialStats.maxHp },
            { Key: 'player_maxSpirit', Value: localConfig.playerInitialStats.maxSpirit },
            { Key: 'player_attack', Value: localConfig.playerInitialStats.attack },
            { Key: 'player_defense', Value: localConfig.playerInitialStats.defense },
            { Key: 'player_speed', Value: localConfig.playerInitialStats.speed },
            // Flatten player affinities
            ...Object.entries(localConfig.playerInitialStats.elementalAffinities).map(([k, v]) => ({ Key: `player_affinity_${k}`, Value: v }))
        ];
        const wsGeneral = XLSX.utils.json_to_sheet(generalData);
        XLSX.utils.book_append_sheet(wb, wsGeneral, "General");

        // 2. Realms Sheet
        const realmsData = localConfig.realms.map(r => ({
            ...r,
            subRanks: (r.subRanks || []).join(',') // Flatten subRanks for Excel
        }));
        const wsRealms = XLSX.utils.json_to_sheet(realmsData);
        XLSX.utils.book_append_sheet(wb, wsRealms, "Realms");

        // 3. Items Sheet (Flattened stats)
        const itemsData = localConfig.items.map(item => {
            const row: any = {
                id: item.id,
                name: item.name,
                icon: item.icon || '📦', // Export icon
                type: item.type,
                slot: item.slot || '',
                description: item.description,
                rarity: item.rarity,
                reqLevel: item.reqLevel,
                price: item.price || 0,
                stat_attack: item.statBonus?.attack || 0,
                stat_defense: item.statBonus?.defense || 0,
                stat_maxHp: item.statBonus?.maxHp || 0,
                stat_maxSpirit: item.statBonus?.maxSpirit || 0,
                stat_speed: item.statBonus?.speed || 0,
            };
            // Flatten Affinities
            if (item.statBonus?.elementalAffinities) {
                Object.entries(item.statBonus.elementalAffinities).forEach(([k, v]) => {
                    row[`stat_affinity_${k}`] = v;
                });
            }
            return row;
        });
        const wsItems = XLSX.utils.json_to_sheet(itemsData);
        XLSX.utils.book_append_sheet(wb, wsItems, "Items");

        // 4. Cards Sheet
        const cardsData = localConfig.cards.map(card => ({
            id: card.id,
            name: card.name,
            type: card.type,
            cost: card.cost,
            element: card.element,
            elementCost: card.elementCost,
            value: card.value,
            description: card.description,
            rarity: card.rarity,
            reqLevel: card.reqLevel,
            tags: (card.tags || []).join(',')
        }));
        const wsCards = XLSX.utils.json_to_sheet(cardsData);
        XLSX.utils.book_append_sheet(wb, wsCards, "Cards");

        // 5. Enemies Sheet
        const enemiesData = localConfig.enemies.map(e => ({
            name: e.name,
            minPlayerLevel: e.minPlayerLevel,
            hp: e.baseStats.maxHp,
            spirit: e.baseStats.maxSpirit,
            attack: e.baseStats.attack,
            defense: e.baseStats.defense,
            speed: e.baseStats.speed,
            cardIds: e.cardIds.join(','),
        }));
        const wsEnemies = XLSX.utils.json_to_sheet(enemiesData);
        XLSX.utils.book_append_sheet(wb, wsEnemies, "Enemies");

        // 6. Player Deck Sheet
        const deckData = localConfig.playerInitialDeckIds.map(id => ({ cardId: id }));
        const wsDeck = XLSX.utils.json_to_sheet(deckData);
        XLSX.utils.book_append_sheet(wb, wsDeck, "PlayerDeck");

        XLSX.writeFile(wb, "cultivation_config.xlsx");
    } catch (error) {
        console.error("Export Error:", error);
        alert("导出Excel失败，请查看控制台错误。");
    }
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
              const data = new Uint8Array(event.target?.result as ArrayBuffer);
              const wb = XLSX.read(data, { type: 'array' });
              const newConfig = { ...localConfig };

              // 1. General
              const wsGeneral = wb.Sheets['General'];
              if (wsGeneral) {
                  const genData = XLSX.utils.sheet_to_json<{Key: string, Value: any}>(wsGeneral);
                  const map: Record<string, any> = {};
                  genData.forEach(r => map[r.Key] = r.Value);
                  
                  if (map['mapNodeCount']) newConfig.mapNodeCount = parseInt(map['mapNodeCount']);
                  if (map['itemDropRate']) newConfig.itemDropRate = parseFloat(map['itemDropRate']);
                  
                  // Map Weights
                  const wMerchant = parseFloat(map['weight_merchant'] || 0.15);
                  const wTreasure = parseFloat(map['weight_treasure'] || 0.25);
                  const wBattle = parseFloat(map['weight_battle'] || 0.30);
                  const wEmpty = parseFloat(map['weight_empty'] || 0.30);
                  newConfig.eventWeights = { merchant: wMerchant, treasure: wTreasure, battle: wBattle, empty: wEmpty };
                  
                  const affs = createZeroElementStats();
                  Object.values(ElementType).forEach(el => {
                      if (map[`player_affinity_${el}`]) affs[el] = parseInt(map[`player_affinity_${el}`]);
                  });

                  newConfig.playerInitialStats = {
                      ...newConfig.playerInitialStats,
                      maxHp: parseInt(map['player_maxHp'] || 100),
                      hp: parseInt(map['player_maxHp'] || 100),
                      maxSpirit: parseInt(map['player_maxSpirit'] || 10),
                      spirit: parseInt(map['player_maxSpirit'] || 10),
                      attack: parseInt(map['player_attack'] || 5),
                      defense: parseInt(map['player_defense'] || 0),
                      speed: parseInt(map['player_speed'] || 10),
                      elementalAffinities: affs
                  };
              }

              // 2. Realms
              const wsRealms = wb.Sheets['Realms'];
              if (wsRealms) {
                  const rawRealms = XLSX.utils.sheet_to_json<any>(wsRealms);
                  newConfig.realms = rawRealms.map(r => ({
                      ...r,
                      subRanks: r.subRanks ? String(r.subRanks).split(',') : []
                  }));
              }

              // 3. Items
              const wsItems = wb.Sheets['Items'];
              if (wsItems) {
                  const rawItems = XLSX.utils.sheet_to_json<any>(wsItems);
                  newConfig.items = rawItems.map(r => {
                      const affs = createZeroElementStats();
                      Object.keys(r).forEach(k => {
                          if (k.startsWith('stat_affinity_')) {
                              const elem = k.replace('stat_affinity_', '') as ElementType;
                              affs[elem] = r[k];
                          }
                      });

                      return {
                        id: r.id,
                        name: r.name,
                        icon: r.icon || '📦', // Import icon
                        type: r.type,
                        slot: r.slot || undefined,
                        description: r.description,
                        rarity: r.rarity,
                        reqLevel: r.reqLevel,
                        price: r.price || 0,
                        statBonus: {
                            attack: r.stat_attack || 0,
                            defense: r.stat_defense || 0,
                            maxHp: r.stat_maxHp || 0,
                            maxSpirit: r.stat_maxSpirit || 0,
                            speed: r.stat_speed || 0,
                            elementalAffinities: affs
                        }
                      }
                  });
              }

              // 4. Cards
              const wsCards = wb.Sheets['Cards'];
              if (wsCards) {
                  const rawCards = XLSX.utils.sheet_to_json<any>(wsCards);
                  newConfig.cards = rawCards.map(r => ({
                      id: r.id,
                      name: r.name,
                      type: r.type,
                      cost: r.cost,
                      element: r.element || ElementType.SWORD,
                      elementCost: r.elementCost || 1,
                      value: r.value,
                      description: r.description,
                      rarity: r.rarity,
                      reqLevel: r.reqLevel,
                      tags: r.tags ? String(r.tags).split(',') : []
                  }));
              }

              // 5. Enemies (Basic)
              const wsEnemies = wb.Sheets['Enemies'];
              if (wsEnemies) {
                  const rawEnemies = XLSX.utils.sheet_to_json<any>(wsEnemies);
                  newConfig.enemies = rawEnemies.map(r => ({
                      name: r.name,
                      minPlayerLevel: r.minPlayerLevel,
                      baseStats: {
                          maxHp: r.hp,
                          hp: r.hp,
                          maxSpirit: r.spirit,
                          spirit: r.spirit,
                          attack: r.attack,
                          defense: r.defense,
                          speed: r.speed,
                          elementalAffinities: createZeroElementStats() // simplified import
                      },
                      cardIds: r.cardIds ? String(r.cardIds).split(',') : []
                  }));
              }

              // 6. Deck
              const wsDeck = wb.Sheets['PlayerDeck'];
              if (wsDeck) {
                  const rawDeck = XLSX.utils.sheet_to_json<{cardId: string}>(wsDeck);
                  newConfig.playerInitialDeckIds = rawDeck.map(r => r.cardId);
              }

              setLocalConfig(newConfig);
              alert("Excel配置导入成功！");
          } catch (err) {
              console.error(err);
              alert("读取Excel失败，请确保文件格式正确。");
          }
      };
      reader.readAsArrayBuffer(file);
      e.target.value = ''; // Reset
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

  // Helper to generate Level Options
  const maxLevel = localConfig.realms.reduce((max, r) => Math.max(max, r.rangeEnd), 30);
  const levelOptions = Array.from({ length: maxLevel }, (_, i) => i + 1).map(lv => (
      <option key={lv} value={lv}>
          {getRealmName(lv, localConfig.realms)}
      </option>
  ));

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
                accept=".xlsx, .xls" 
                onChange={handleFileChange} 
            />
            
            <Button variant="outline" size="sm" onClick={handleExportExcel}>📊 导出Excel</Button>
            <Button variant="outline" size="sm" onClick={handleImportClick}>📂 导入Excel</Button>
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
               {/* Realm Config UI (unchanged) */}
               <div className="flex justify-between items-center mb-2">
                   <h3 className="text-lg font-bold text-slate-200">修仙境界划分</h3>
               </div>
               <div className="grid gap-4">
                  {localConfig.realms.map((realm, idx) => (
                      <div key={idx} className="bg-slate-800 p-4 rounded border border-slate-700">
                          <div className="flex flex-wrap items-end gap-2 mb-2">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-500">名称</label>
                                <input 
                                    value={realm.name}
                                    onChange={(e) => {
                                        const newRealms = [...localConfig.realms];
                                        newRealms[idx].name = e.target.value;
                                        setLocalConfig({...localConfig, realms: newRealms});
                                    }}
                                    className="block w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-500">起始等级</label>
                                <input 
                                        type="number"
                                        value={realm.rangeStart}
                                        onChange={(e) => {
                                            const newRealms = [...localConfig.realms];
                                            newRealms[idx].rangeStart = parseInt(e.target.value);
                                            setLocalConfig({...localConfig, realms: newRealms});
                                        }}
                                        className="block w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-500">结束等级</label>
                                <input 
                                        type="number"
                                        value={realm.rangeEnd}
                                        onChange={(e) => {
                                            const newRealms = [...localConfig.realms];
                                            newRealms[idx].rangeEnd = parseInt(e.target.value);
                                            setLocalConfig({...localConfig, realms: newRealms});
                                        }}
                                        className="block w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-500">突破经验</label>
                                <input 
                                        type="number"
                                        value={realm.expReq}
                                        onChange={(e) => {
                                            const newRealms = [...localConfig.realms];
                                            newRealms[idx].expReq = parseInt(e.target.value);
                                            setLocalConfig({...localConfig, realms: newRealms});
                                        }}
                                        className="block w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                                    />
                            </div>
                            <div className="flex flex-col border-l border-slate-600 pl-2">
                                <label className="text-[10px] text-yellow-500">灵石(Min)</label>
                                <input 
                                        type="number"
                                        value={realm.minGoldDrop || 10}
                                        onChange={(e) => {
                                            const newRealms = [...localConfig.realms];
                                            newRealms[idx].minGoldDrop = parseInt(e.target.value);
                                            setLocalConfig({...localConfig, realms: newRealms});
                                        }}
                                        className="block w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-yellow-300"
                                    />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-yellow-500">灵石(Max)</label>
                                <input 
                                        type="number"
                                        value={realm.maxGoldDrop || 50}
                                        onChange={(e) => {
                                            const newRealms = [...localConfig.realms];
                                            newRealms[idx].maxGoldDrop = parseInt(e.target.value);
                                            setLocalConfig({...localConfig, realms: newRealms});
                                        }}
                                        className="block w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-yellow-300"
                                    />
                            </div>
                          </div>
                          <div className="flex flex-col mt-2 border-t border-slate-700 pt-2">
                              <label className="text-[10px] text-slate-400">小境界名称 (用逗号分隔，按顺序对应等级)</label>
                              <input 
                                  type="text"
                                  placeholder="例如: 初期,中期,后期"
                                  value={(realm.subRanks || []).join(',')}
                                  onChange={(e) => {
                                      const newRealms = [...localConfig.realms];
                                      const val = e.target.value;
                                      newRealms[idx].subRanks = val ? val.split(',') : [];
                                      setLocalConfig({...localConfig, realms: newRealms});
                                  }}
                                  className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300"
                              />
                          </div>
                      </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'map' && (
             <div className="space-y-6 max-w-lg">
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                    <label className="block text-sm text-slate-400 mb-1">探险节点数量</label>
                    <input 
                        type="number"
                        value={localConfig.mapNodeCount}
                        onChange={(e) => setLocalConfig({...localConfig, mapNodeCount: parseInt(e.target.value)})}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                    />
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                    <label className="block text-sm text-slate-400 mb-1">宝箱获得物品概率 (0-1)</label>
                    <input 
                        type="number"
                        step="0.05"
                        max="1"
                        min="0"
                        value={localConfig.itemDropRate}
                        onChange={(e) => setLocalConfig({...localConfig, itemDropRate: parseFloat(e.target.value)})}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                    />
                    <div className="text-[10px] text-slate-500 mt-1">剩余概率为获得灵石</div>
                </div>

                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                    <h4 className="text-sm text-slate-200 font-bold mb-3 border-b border-slate-600 pb-2">事件触发权重</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-amber-300 mb-1">⚖️ 游商权重</label>
                            <input 
                                type="number"
                                step="0.1"
                                value={localConfig.eventWeights?.merchant ?? 0.15}
                                onChange={(e) => setLocalConfig({
                                    ...localConfig, 
                                    eventWeights: { ...(localConfig.eventWeights || { merchant:0.15, treasure:0.25, battle:0.3, empty:0.3 }), merchant: parseFloat(e.target.value) } 
                                })}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-yellow-300 mb-1">🎁 宝物权重</label>
                            <input 
                                type="number"
                                step="0.1"
                                value={localConfig.eventWeights?.treasure ?? 0.25}
                                onChange={(e) => setLocalConfig({
                                    ...localConfig, 
                                    eventWeights: { ...(localConfig.eventWeights || { merchant:0.15, treasure:0.25, battle:0.3, empty:0.3 }), treasure: parseFloat(e.target.value) } 
                                })}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-red-400 mb-1">⚔️ 战斗权重</label>
                            <input 
                                type="number"
                                step="0.1"
                                value={localConfig.eventWeights?.battle ?? 0.30}
                                onChange={(e) => setLocalConfig({
                                    ...localConfig, 
                                    eventWeights: { ...(localConfig.eventWeights || { merchant:0.15, treasure:0.25, battle:0.3, empty:0.3 }), battle: parseFloat(e.target.value) } 
                                })}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">🍃 空地权重</label>
                            <input 
                                type="number"
                                step="0.1"
                                value={localConfig.eventWeights?.empty ?? 0.30}
                                onChange={(e) => setLocalConfig({
                                    ...localConfig, 
                                    eventWeights: { ...(localConfig.eventWeights || { merchant:0.15, treasure:0.25, battle:0.3, empty:0.3 }), empty: parseFloat(e.target.value) } 
                                })}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-slate-700 pb-2 mb-4">
                  {['EQUIPMENT', 'CONSUMABLE', 'ARTIFACT'].map(type => (
                      <button 
                        key={type}
                        onClick={() => setItemSubTab(type as ItemType)}
                        className={`px-3 py-1 rounded text-sm font-bold ${itemSubTab === type ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' : 'text-slate-500 hover:bg-slate-800'}`}
                      >
                         {type === 'EQUIPMENT' ? '🗡️ 装备' : type === 'CONSUMABLE' ? '💊 道具' : '✨ 法宝'}
                      </button>
                  ))}
              </div>

              <div className="flex justify-between items-center mb-4">
                <Button size="sm" onClick={() => setLocalConfig({...localConfig, items: [...localConfig.items, createEmptyItem(itemSubTab, getFilterStartLevel())]})}>
                    + 新增物品
                </Button>
                {renderRealmFilter()}
              </div>

              <div className="grid gap-4">
                {localConfig.items.filter(i => i.type === itemSubTab && filterByRealm(i.reqLevel)).map((item) => {
                   const realIndex = localConfig.items.findIndex(i => i.id === item.id);
                   
                   return (
                   <div key={item.id + realIndex} className="bg-slate-800 p-4 rounded border border-slate-700 flex flex-col gap-2 relative group">
                      <button 
                        className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700 p-1 rounded z-10"
                        onClick={() => {
                            const newItems = localConfig.items.filter((_, i) => i !== realIndex);
                            setLocalConfig({...localConfig, items: newItems});
                        }}
                      >
                          🗑️
                      </button>
                      <div className="flex gap-4 items-center">
                          {/* Icon Input */}
                          <input 
                              value={item.icon}
                              onChange={(e) => {
                                const newItems = [...localConfig.items];
                                newItems[realIndex].icon = e.target.value;
                                setLocalConfig({...localConfig, items: newItems});
                              }}
                              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xl w-12 text-center"
                              title="物品图标"
                          />

                          <input 
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...localConfig.items];
                                newItems[realIndex].name = e.target.value;
                                setLocalConfig({...localConfig, items: newItems});
                              }}
                              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm font-bold w-1/4"
                          />
                           {(itemSubTab === 'EQUIPMENT' || itemSubTab === 'ARTIFACT') && (
                                <select 
                                    value={item.slot || 'mainWeapon'}
                                    onChange={(e) => {
                                        const newItems = [...localConfig.items];
                                        newItems[realIndex].slot = e.target.value as EquipmentSlot;
                                        setLocalConfig({...localConfig, items: newItems});
                                    }}
                                    className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-amber-300 w-1/4"
                                >
                                    {Object.entries(SLOT_NAMES).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                           )}
                           
                           {/* Level Select */}
                           <select 
                                value={item.reqLevel || 1}
                                onChange={(e) => {
                                    const newItems = [...localConfig.items];
                                    newItems[realIndex].reqLevel = parseInt(e.target.value);
                                    setLocalConfig({...localConfig, items: newItems});
                                }}
                                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs w-32"
                            >
                                {levelOptions}
                            </select>

                            {/* Price Input */}
                            <div className="flex items-center gap-1">
                                <span className="text-yellow-500 text-xs">💰</span>
                                <input 
                                    type="number"
                                    value={item.price || 0}
                                    onChange={(e) => {
                                        const newItems = [...localConfig.items];
                                        newItems[realIndex].price = parseInt(e.target.value);
                                        setLocalConfig({...localConfig, items: newItems});
                                    }}
                                    className="bg-slate-900 border border-slate-600 rounded px-1 py-1 text-xs w-16 text-yellow-300"
                                    placeholder="价格"
                                    title="购买价格"
                                />
                            </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                            {['attack', 'defense', 'maxHp', 'maxSpirit', 'speed'].map(stat => (
                                <div key={stat} className="flex flex-col">
                                    <span className="text-[10px] text-slate-500">{stat}</span>
                                    <input 
                                        type="number"
                                        // @ts-ignore
                                        value={item.statBonus?.[stat] || 0}
                                        onChange={(e) => {
                                            const newItems = [...localConfig.items];
                                            // @ts-ignore
                                            newItems[realIndex].statBonus = { ...newItems[realIndex].statBonus, [stat]: parseInt(e.target.value) };
                                            setLocalConfig({...localConfig, items: newItems});
                                        }}
                                        className="bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs"
                                    />
                                </div>
                            ))}
                      </div>

                      {/* Element Bonus Config */}
                      <div className="border-t border-slate-700 pt-2">
                        <span className="text-xs text-slate-400 block mb-1">元素亲和加成:</span>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(ElementType).map(elem => (
                                <div key={elem} className="flex items-center gap-1 bg-slate-900 rounded px-1">
                                    <span className="text-[10px] text-slate-500">{elem}</span>
                                    <input 
                                        type="number"
                                        className="w-8 bg-transparent text-xs text-white border-none outline-none text-right"
                                        value={item.statBonus?.elementalAffinities?.[elem] || 0}
                                        onChange={(e) => {
                                            const newItems = [...localConfig.items];
                                            const affs = { ...(newItems[realIndex].statBonus?.elementalAffinities || createZeroElementStats()) };
                                            affs[elem] = parseInt(e.target.value);
                                            newItems[realIndex].statBonus = { ...newItems[realIndex].statBonus, elementalAffinities: affs };
                                            setLocalConfig({...localConfig, items: newItems});
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                      </div>
                   </div>
                )})}
              </div>
            </div>
          )}
          
          {activeTab === 'enemies' && (
             <div className="space-y-4">
                {/* Enemy Config UI (unchanged logic) */}
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-slate-200">敌人配置</h3>
                    <div className="flex items-center gap-2">
                        {renderRealmFilter()}
                        <Button size="sm" onClick={() => setLocalConfig({...localConfig, enemies: [...localConfig.enemies, createEmptyEnemy(getFilterStartLevel())]})}>
                            + 新增敌人
                        </Button>
                    </div>
                </div>
                
                <div className="grid gap-6">
                    {localConfig.enemies.filter(e => filterByRealm(e.minPlayerLevel)).map((enemy) => {
                        // Find original index to update state correctly
                        const originalIdx = localConfig.enemies.indexOf(enemy);
                        return (
                        <div key={originalIdx} className="bg-slate-800 p-4 rounded border border-slate-700 relative group">
                            <button 
                                className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700 p-1 rounded z-10"
                                onClick={() => {
                                    const newEnemies = localConfig.enemies.filter((_, i) => i !== originalIdx);
                                    setLocalConfig({...localConfig, enemies: newEnemies});
                                }}
                            >
                                🗑️
                            </button>
                            
                            <div className="flex flex-wrap gap-4 mb-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase block">Name</label>
                                    <input 
                                        value={enemy.name}
                                        onChange={(e) => {
                                            const newEnemies = [...localConfig.enemies];
                                            newEnemies[originalIdx].name = e.target.value;
                                            setLocalConfig({...localConfig, enemies: newEnemies});
                                        }}
                                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm font-bold w-40"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase block">Min Level</label>
                                    <select 
                                        value={enemy.minPlayerLevel}
                                        onChange={(e) => {
                                            const newEnemies = [...localConfig.enemies];
                                            newEnemies[originalIdx].minPlayerLevel = parseInt(e.target.value);
                                            setLocalConfig({...localConfig, enemies: newEnemies});
                                        }}
                                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs w-32"
                                    >
                                        {levelOptions}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="bg-slate-900/50 p-2 rounded mb-4">
                                <h5 className="text-xs text-slate-400 mb-2 font-bold">基础属性</h5>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                     {['maxHp', 'maxSpirit', 'attack', 'defense', 'speed'].map(stat => (
                                        <div key={stat}>
                                            <label className="text-[9px] text-slate-500 uppercase block">{stat}</label>
                                            <input 
                                                type="number"
                                                // @ts-ignore
                                                value={enemy.baseStats[stat]}
                                                onChange={(e) => {
                                                    const newEnemies = [...localConfig.enemies];
                                                    // @ts-ignore
                                                    newEnemies[originalIdx].baseStats = { ...newEnemies[originalIdx].baseStats, [stat]: parseInt(e.target.value) };
                                                    if(stat === 'maxHp') newEnemies[originalIdx].baseStats.hp = parseInt(e.target.value);
                                                    if(stat === 'maxSpirit') newEnemies[originalIdx].baseStats.spirit = parseInt(e.target.value);
                                                    setLocalConfig({...localConfig, enemies: newEnemies});
                                                }}
                                                className="w-full bg-slate-800 border border-slate-600 rounded px-1 text-xs"
                                            />
                                        </div>
                                     ))}
                                </div>
                                
                                <h5 className="text-xs text-slate-400 mt-2 mb-1 font-bold">元素亲和</h5>
                                <div className="flex flex-wrap gap-1">
                                    {Object.values(ElementType).map(elem => (
                                        <div key={elem} className="flex items-center gap-1 bg-slate-800 rounded px-1 border border-slate-700">
                                            <span className="text-[9px] text-slate-500">{elem}</span>
                                            <input 
                                                type="number"
                                                className="w-6 bg-transparent text-[10px] text-white border-none outline-none text-right"
                                                value={enemy.baseStats.elementalAffinities?.[elem] || 0}
                                                onChange={(e) => {
                                                    const newEnemies = [...localConfig.enemies];
                                                    const affs = { ...(newEnemies[originalIdx].baseStats.elementalAffinities || createZeroElementStats()) };
                                                    affs[elem] = parseInt(e.target.value);
                                                    newEnemies[originalIdx].baseStats.elementalAffinities = affs;
                                                    setLocalConfig({...localConfig, enemies: newEnemies});
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900/50 p-2 rounded">
                                <h5 className="text-xs text-slate-400 mb-2 font-bold">携带卡组 (ID列表)</h5>
                                <div className="flex flex-wrap gap-2">
                                    {enemy.cardIds.map((cid, cidx) => (
                                        <div key={cidx} className="bg-slate-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                                            <span className="text-slate-200">{localConfig.cards.find(c => c.id === cid)?.name || cid}</span>
                                            <button 
                                                className="text-red-400 hover:text-white"
                                                onClick={() => {
                                                    const newEnemies = [...localConfig.enemies];
                                                    const newDeck = [...enemy.cardIds];
                                                    newDeck.splice(cidx, 1);
                                                    newEnemies[originalIdx].cardIds = newDeck;
                                                    setLocalConfig({...localConfig, enemies: newEnemies});
                                                }}
                                            >×</button>
                                        </div>
                                    ))}
                                    <select 
                                        className="bg-slate-800 border border-slate-600 rounded text-xs px-2 py-1 w-32"
                                        value=""
                                        onChange={(e) => {
                                            if(!e.target.value) return;
                                            const newEnemies = [...localConfig.enemies];
                                            newEnemies[originalIdx].cardIds = [...enemy.cardIds, e.target.value];
                                            setLocalConfig({...localConfig, enemies: newEnemies});
                                        }}
                                    >
                                        <option value="">+ 添加卡牌</option>
                                        {localConfig.cards.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.cost}耗)</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    );})}
                </div>
             </div>
          )}

          {activeTab === 'cards' && (
             <div className="space-y-4">
                {/* Card Config UI (unchanged) */}
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-slate-200">卡牌库 ({localConfig.cards.length})</h3>
                    <div className="flex items-center gap-2">
                        {renderRealmFilter()}
                        <Button size="sm" onClick={() => setLocalConfig({...localConfig, cards: [...localConfig.cards, createEmptyCard(getFilterStartLevel())]})}>
                            + 新增卡牌
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {localConfig.cards.filter(c => filterByRealm(c.reqLevel)).map((card) => {
                        const originalIdx = localConfig.cards.indexOf(card);
                        return (
                        <div key={originalIdx} className="bg-slate-800 p-3 rounded border border-slate-700 flex flex-col gap-2 relative group">
                            <button 
                                    className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700 p-1 rounded z-10"
                                    onClick={() => {
                                        const newCards = localConfig.cards.filter((_, i) => i !== originalIdx);
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
                                    newCards[originalIdx].name = e.target.value;
                                    setLocalConfig({...localConfig, cards: newCards});
                                }}
                                className="bg-slate-900 font-bold text-emerald-300 border-none rounded px-1 w-1/3"
                            />
                            <select 
                                value={card.type}
                                onChange={(e) => {
                                    const newCards = [...localConfig.cards];
                                    newCards[originalIdx].type = e.target.value as CardType;
                                    setLocalConfig({...localConfig, cards: newCards});
                                }}
                                className="bg-slate-900 text-xs text-slate-300 rounded w-1/4"
                            >
                                {Object.values(CardType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <div className="flex items-center gap-1 w-1/3 justify-end">
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">Req Lv</span>
                                    <select 
                                        value={card.reqLevel || 1}
                                        onChange={(e) => {
                                            const newCards = [...localConfig.cards];
                                            newCards[originalIdx].reqLevel = parseInt(e.target.value);
                                            setLocalConfig({...localConfig, cards: newCards});
                                        }}
                                        className="bg-slate-900 border border-slate-600 rounded px-1 text-xs w-24"
                                    >
                                        {levelOptions}
                                    </select>
                            </div>
                            </div>
                            <div className="flex gap-2 text-xs flex-wrap">
                                <div className="flex items-center gap-1">
                                    <span className="text-blue-400 font-bold">Spirit:</span>
                                    <input type="number" value={card.cost} onChange={(e) => {
                                        const newCards = [...localConfig.cards];
                                        newCards[originalIdx].cost = parseInt(e.target.value);
                                        setLocalConfig({...localConfig, cards: newCards});
                                    }} className="w-8 bg-slate-900 rounded px-1" />
                                </div>
                                
                                {/* Element Config */}
                                <div className="flex items-center gap-1">
                                    <select 
                                        value={card.element} 
                                        onChange={(e) => {
                                            const newCards = [...localConfig.cards];
                                            newCards[originalIdx].element = e.target.value as ElementType;
                                            setLocalConfig({...localConfig, cards: newCards});
                                        }}
                                        className="bg-slate-900 rounded px-1 w-12"
                                    >
                                        {Object.values(ElementType).map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                    <input type="number" value={card.elementCost} onChange={(e) => {
                                        const newCards = [...localConfig.cards];
                                        newCards[originalIdx].elementCost = parseInt(e.target.value);
                                        setLocalConfig({...localConfig, cards: newCards});
                                    }} className="w-8 bg-slate-900 rounded px-1" />
                                </div>

                                <div className="flex items-center gap-1">
                                    <span>Val:</span>
                                    <input type="number" value={card.value} onChange={(e) => {
                                        const newCards = [...localConfig.cards];
                                        newCards[originalIdx].value = parseInt(e.target.value);
                                        setLocalConfig({...localConfig, cards: newCards});
                                    }} className="w-10 bg-slate-900 rounded px-1" />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-1">
                            <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={card.tags?.includes('PIERCE') || false}
                                        onChange={(e) => {
                                            const newCards = [...localConfig.cards];
                                            let tags = card.tags || [];
                                            if (e.target.checked) tags = [...tags, 'PIERCE'];
                                            else tags = tags.filter(t => t !== 'PIERCE');
                                            newCards[originalIdx].tags = tags;
                                            setLocalConfig({...localConfig, cards: newCards});
                                        }}
                                        className="rounded bg-slate-900 border-slate-600"
                                    />
                                    穿刺效果
                            </label>
                            </div>
                            <textarea 
                            value={card.description} 
                            onChange={(e) => {
                                const newCards = [...localConfig.cards];
                                newCards[originalIdx].description = e.target.value;
                                setLocalConfig({...localConfig, cards: newCards});
                            }}
                            className="w-full bg-slate-900 text-xs text-slate-400 rounded p-1 resize-none h-12"
                            />
                        </div>
                    );})}
                </div>
             </div>
          )}

          {activeTab === 'player' && (
             <div className="space-y-6">
                 {/* Player config UI (unchanged) */}
                 <div className="bg-slate-800 p-4 rounded border border-slate-700">
                    <h4 className="text-slate-400 text-sm mb-2">基础属性</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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

                    <h4 className="text-slate-400 text-sm mb-2">初始元素亲和</h4>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                        {Object.values(ElementType).map(elem => (
                             <div key={elem}>
                                <label className="block text-[10px] text-slate-500 text-center">{elem}</label>
                                <input 
                                    type="number" 
                                    value={localConfig.playerInitialStats.elementalAffinities[elem]} 
                                    onChange={(e) => {
                                        const newStats = {...localConfig.playerInitialStats};
                                        newStats.elementalAffinities = { ...newStats.elementalAffinities, [elem]: parseInt(e.target.value) };
                                        setLocalConfig({...localConfig, playerInitialStats: newStats});
                                    }}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-1 py-1 text-center text-xs"
                                />
                             </div>
                        ))}
                    </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-200 mb-3">初始牌组</h3>
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