
import React, { useState, useRef } from 'react';
import { GameConfig, Card, Item, EnemyTemplate, CardType, ItemType, EquipmentSlot, ElementType, RealmLevelConfig, GameMap } from '../types';
import { getRealmName, SLOT_NAMES, createZeroElementStats } from '../constants';
import { Button } from './Button';
import * as XLSX from 'xlsx';

interface ConfigScreenProps {
  config: GameConfig;
  onSave: (newConfig: GameConfig) => void;
  onCancel: () => void;
}

const createEmptyItem = (type: ItemType, level: number = 1): Item => ({
  id: `item_${Date.now()}`,
  name: '新物品',
  icon: type === 'EQUIPMENT' ? '⚔️' : type === 'CONSUMABLE' ? '💊' : type === 'MATERIAL' ? '🌿' : type === 'PILL' ? '💊' : type === 'RECIPE' ? '📜' : type === 'FORGE_MATERIAL' ? '🧱' : type === 'FORGE_BLUEPRINT' ? '🗺️' : type === 'TALISMAN_PEN' ? '🖌️' : type === 'TALISMAN_PAPER' ? '🟨' : type === 'TALISMAN' ? '🏺' : '📦', 
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

const createEmptyMap = (): GameMap => ({
    id: `map_${Date.now()}`,
    name: '新地图',
    icon: '🗺️',
    description: '新的探险区域...',
    reqLevel: 1,
    nodeCount: 12,
    eventWeights: { merchant: 0.15, treasure: 0.25, battle: 0.3, empty: 0.3 }
});

const createDefaultLevelConfig = (idx: number, prev: RealmLevelConfig): RealmLevelConfig => ({
    name: `${idx + 1}层`,
    expReq: prev.expReq,
    hpGrowth: prev.hpGrowth,
    atkGrowth: prev.atkGrowth,
    defGrowth: prev.defGrowth,
    spiritGrowth: prev.spiritGrowth,
    speedGrowth: prev.speedGrowth,
    breakthroughCost: prev.breakthroughCost,
    breakthroughChance: prev.breakthroughChance,
});

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ config, onSave, onCancel }) => {
  const [localConfig, setLocalConfig] = useState<GameConfig>(JSON.parse(JSON.stringify(config)));
  const [activeTab, setActiveTab] = useState<'realms' | 'map' | 'items' | 'enemies' | 'cards' | 'player'>('realms');
  const [itemSubTab, setItemSubTab] = useState<ItemType>('EQUIPMENT');
  
  const [realmFilter, setRealmFilter] = useState<string>('ALL');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availablePills = localConfig.items.filter(i => i.type === 'PILL');
  const availableMaterials = localConfig.items.filter(i => i.type === 'MATERIAL');
  const availableArtifacts = localConfig.items.filter(i => i.type === 'ARTIFACT');
  const availableForgeMaterials = localConfig.items.filter(i => i.type === 'FORGE_MATERIAL');

  const handleSave = () => {
    onSave(localConfig);
  };

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
        // ... General Sheet ...
        const generalData = [
            { Key: 'itemDropRate', Value: localConfig.itemDropRate },
            { Key: 'player_maxHp', Value: localConfig.playerInitialStats.maxHp },
            { Key: 'player_maxSpirit', Value: localConfig.playerInitialStats.maxSpirit },
            { Key: 'player_attack', Value: localConfig.playerInitialStats.attack },
            { Key: 'player_defense', Value: localConfig.playerInitialStats.defense },
            { Key: 'player_speed', Value: localConfig.playerInitialStats.speed },
            ...Object.entries(localConfig.playerInitialStats.elementalAffinities).map(([k, v]) => ({ Key: `player_affinity_${k}`, Value: v })),
            { Key: 'artifactSlots_json', Value: JSON.stringify(localConfig.artifactSlotConfigs) }
        ];
        const wsGeneral = XLSX.utils.json_to_sheet(generalData);
        XLSX.utils.book_append_sheet(wb, wsGeneral, "General");

        // ... Maps ...
        const mapsData = localConfig.maps.map(m => ({
            id: m.id,
            name: m.name,
            icon: m.icon,
            description: m.description,
            reqLevel: m.reqLevel,
            nodeCount: m.nodeCount,
            weight_merchant: m.eventWeights.merchant,
            weight_treasure: m.eventWeights.treasure,
            weight_battle: m.eventWeights.battle,
            weight_empty: m.eventWeights.empty
        }));
        const wsMaps = XLSX.utils.json_to_sheet(mapsData);
        XLSX.utils.book_append_sheet(wb, wsMaps, "Maps");

        // ... Realms ...
        const realmsData = localConfig.realms.map(r => ({
            name: r.name,
            rangeStart: r.rangeStart,
            rangeEnd: r.rangeEnd,
            minGoldDrop: r.minGoldDrop,
            maxGoldDrop: r.maxGoldDrop,
            levels_json: JSON.stringify(r.levels) 
        }));
        const wsRealms = XLSX.utils.json_to_sheet(realmsData);
        XLSX.utils.book_append_sheet(wb, wsRealms, "Realms");

        // ... Items ...
        const itemsData = localConfig.items.map(item => {
            const row: any = {
                id: item.id,
                name: item.name,
                icon: item.icon || '📦',
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
                maxUsage: item.maxUsage || 0,
                recipeResult: item.recipeResult || '',
                successRate: item.successRate || 0,
                recipeMaterials_json: item.recipeMaterials ? JSON.stringify(item.recipeMaterials) : '',
                durability: item.durability || 0,
                maxDurability: item.maxDurability || 0
            };
            if (item.statBonus?.elementalAffinities) {
                Object.entries(item.statBonus.elementalAffinities).forEach(([k, v]) => {
                    row[`stat_affinity_${k}`] = v;
                });
            }
            return row;
        });
        const wsItems = XLSX.utils.json_to_sheet(itemsData);
        XLSX.utils.book_append_sheet(wb, wsItems, "Items");
        
        // ... Cards ...
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

        // ... Enemies ...
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

        // ... Deck ...
        const deckData = localConfig.playerInitialDeckIds.map(id => ({ cardId: id }));
        const wsDeck = XLSX.utils.json_to_sheet(deckData);
        XLSX.utils.book_append_sheet(wb, wsDeck, "PlayerDeck");

        XLSX.writeFile(wb, "cultivation_config.xlsx");
    } catch (error) {
        console.error("Export Error:", error);
        alert("导出Excel失败");
    }
  };
  
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = new Uint8Array(event.target?.result as ArrayBuffer);
              const wb = XLSX.read(data, { type: 'array' });
              const newConfig = { ...localConfig };
              
              const wsGeneral = wb.Sheets['General'];
              if (wsGeneral) {
                  const genData = XLSX.utils.sheet_to_json<{Key: string, Value: any}>(wsGeneral);
                  const map: Record<string, any> = {};
                  genData.forEach(r => map[r.Key] = r.Value);
                  if (map['itemDropRate']) newConfig.itemDropRate = parseFloat(map['itemDropRate']);
                  if (map['artifactSlots_json']) newConfig.artifactSlotConfigs = JSON.parse(map['artifactSlots_json']);
              }
              
              // Import Maps
              const wsMaps = wb.Sheets['Maps'];
              if (wsMaps) {
                  const rawMaps = XLSX.utils.sheet_to_json<any>(wsMaps);
                  newConfig.maps = rawMaps.map(r => ({
                      id: r.id,
                      name: r.name,
                      icon: r.icon,
                      description: r.description,
                      reqLevel: r.reqLevel,
                      nodeCount: r.nodeCount,
                      eventWeights: {
                          merchant: r.weight_merchant || 0,
                          treasure: r.weight_treasure || 0,
                          battle: r.weight_battle || 0,
                          empty: r.weight_empty || 0
                      }
                  }));
              }

              // Import Realms
              const wsRealms = wb.Sheets['Realms'];
              if (wsRealms) {
                  const rawRealms = XLSX.utils.sheet_to_json<any>(wsRealms);
                  newConfig.realms = rawRealms.map(r => ({
                      name: r.name,
                      rangeStart: r.rangeStart,
                      rangeEnd: r.rangeEnd,
                      minGoldDrop: r.minGoldDrop,
                      maxGoldDrop: r.maxGoldDrop,
                      levels: r.levels_json ? JSON.parse(r.levels_json) : []
                  }));
              }

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
                        icon: r.icon || '📦',
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
                        },
                        maxUsage: r.maxUsage || 0,
                        recipeResult: r.recipeResult || undefined,
                        successRate: r.successRate || 0,
                        recipeMaterials: r.recipeMaterials_json ? JSON.parse(r.recipeMaterials_json) : undefined,
                        durability: r.durability || 0,
                        maxDurability: r.maxDurability || 0
                      }
                  });
              }
              
              setLocalConfig(newConfig);
              alert("Excel配置导入成功！");
          } catch (err) { console.error(err); alert("读取Excel失败"); }
      };
      reader.readAsArrayBuffer(file);
      e.target.value = ''; 
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
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
            <Button variant="outline" size="sm" onClick={handleExportExcel}>📊 导出Excel</Button>
            <Button variant="outline" size="sm" onClick={handleImportClick}>📂 导入Excel</Button>
            <div className="w-px h-8 bg-slate-600 mx-2 hidden md:block"></div>
            <Button variant="secondary" onClick={onCancel}>取消</Button>
            <Button variant="primary" onClick={handleSave}>保存配置</Button>
          </div>
        </div>

        <div className="flex border-b border-slate-700 bg-slate-950 px-4 pt-2 gap-1 overflow-x-auto shrink-0">
          {renderTabButton('realms', '⛰️ 境界设置')}
          {renderTabButton('map', '🌍 地图配置')}
          {renderTabButton('items', '💎 物品库')}
          {renderTabButton('enemies', '👿 敌人配置')}
          {renderTabButton('cards', '🎴 卡牌库')}
          {renderTabButton('player', '🧘 玩家初始')}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50 custom-scrollbar">
          
          {/* --- REALMS TAB --- */}
          {activeTab === 'realms' && (
              <div className="space-y-6">
                  {localConfig.realms.map((realm, rIdx) => (
                      <div key={rIdx} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                          <div className="bg-slate-900 p-3 border-b border-slate-700 flex flex-wrap gap-4 items-center">
                              <h3 className="text-lg font-bold text-emerald-300">{realm.name}</h3>
                              <div className="flex items-center gap-2 text-sm">
                                  <label className="text-slate-500">范围:</label>
                                  <input type="number" className="w-16 bg-slate-800 p-1 rounded" value={realm.rangeStart} onChange={e => {
                                      const newRealms = [...localConfig.realms];
                                      newRealms[rIdx].rangeStart = parseInt(e.target.value);
                                      setLocalConfig({...localConfig, realms: newRealms});
                                  }} />
                                  <span>-</span>
                                  <input type="number" className="w-16 bg-slate-800 p-1 rounded" value={realm.rangeEnd} onChange={e => {
                                      const newRealms = [...localConfig.realms];
                                      newRealms[rIdx].rangeEnd = parseInt(e.target.value);
                                      setLocalConfig({...localConfig, realms: newRealms});
                                  }} />
                              </div>
                              <div className="flex items-center gap-2 text-sm ml-auto">
                                  <label className="text-slate-500">掉落灵石:</label>
                                  <input type="number" className="w-20 bg-slate-800 p-1 rounded" value={realm.minGoldDrop} onChange={e => {
                                      const newRealms = [...localConfig.realms];
                                      newRealms[rIdx].minGoldDrop = parseInt(e.target.value);
                                      setLocalConfig({...localConfig, realms: newRealms});
                                  }} />
                                  <span>-</span>
                                  <input type="number" className="w-20 bg-slate-800 p-1 rounded" value={realm.maxGoldDrop} onChange={e => {
                                      const newRealms = [...localConfig.realms];
                                      newRealms[rIdx].maxGoldDrop = parseInt(e.target.value);
                                      setLocalConfig({...localConfig, realms: newRealms});
                                  }} />
                              </div>
                          </div>
                          <div className="p-2 overflow-x-auto">
                              <table className="w-full text-xs text-left">
                                  <thead>
                                      <tr className="text-slate-500 border-b border-slate-700">
                                          <th className="p-2">等级</th>
                                          <th className="p-2">称号</th>
                                          <th className="p-2">所需修为</th>
                                          <th className="p-2">HP成长</th>
                                          <th className="p-2">攻成长</th>
                                          <th className="p-2">防成长</th>
                                          <th className="p-2">神识成长</th>
                                          <th className="p-2">速成长</th>
                                          <th className="p-2">突破消耗</th>
                                          <th className="p-2">成功率</th>
                                          <th className="p-2">操作</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {realm.levels.map((lvl, lIdx) => (
                                          <tr key={lIdx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                              <td className="p-2 font-mono text-slate-400">{realm.rangeStart + lIdx}</td>
                                              <td className="p-2"><input className="bg-transparent w-full" value={lvl.name} onChange={e => {
                                                  const newRealms = [...localConfig.realms];
                                                  newRealms[rIdx].levels[lIdx].name = e.target.value;
                                                  setLocalConfig({...localConfig, realms: newRealms});
                                              }} /></td>
                                              <td className="p-2"><input type="number" className="bg-transparent w-16" value={lvl.expReq} onChange={e => {
                                                  const newRealms = [...localConfig.realms];
                                                  newRealms[rIdx].levels[lIdx].expReq = parseInt(e.target.value);
                                                  setLocalConfig({...localConfig, realms: newRealms});
                                              }} /></td>
                                              <td className="p-2"><input type="number" className="bg-transparent w-12" value={lvl.hpGrowth} onChange={e => {
                                                  const newRealms = [...localConfig.realms];
                                                  newRealms[rIdx].levels[lIdx].hpGrowth = parseInt(e.target.value);
                                                  setLocalConfig({...localConfig, realms: newRealms});
                                              }} /></td>
                                              <td className="p-2"><input type="number" className="bg-transparent w-12" value={lvl.atkGrowth} onChange={e => {
                                                  const newRealms = [...localConfig.realms];
                                                  newRealms[rIdx].levels[lIdx].atkGrowth = parseInt(e.target.value);
                                                  setLocalConfig({...localConfig, realms: newRealms});
                                              }} /></td>
                                              <td className="p-2"><input type="number" className="bg-transparent w-12" value={lvl.defGrowth} onChange={e => {
                                                  const newRealms = [...localConfig.realms];
                                                  newRealms[rIdx].levels[lIdx].defGrowth = parseInt(e.target.value);
                                                  setLocalConfig({...localConfig, realms: newRealms});
                                              }} /></td>
                                              <td className="p-2"><input type="number" className="bg-transparent w-12" value={lvl.spiritGrowth} onChange={e => {
                                                  const newRealms = [...localConfig.realms];
                                                  newRealms[rIdx].levels[lIdx].spiritGrowth = parseInt(e.target.value);
                                                  setLocalConfig({...localConfig, realms: newRealms});
                                              }} /></td>
                                              <td className="p-2"><input type="number" className="bg-transparent w-12" value={lvl.speedGrowth} onChange={e => {
                                                  const newRealms = [...localConfig.realms];
                                                  newRealms[rIdx].levels[lIdx].speedGrowth = parseInt(e.target.value);
                                                  setLocalConfig({...localConfig, realms: newRealms});
                                              }} /></td>
                                              <td className="p-2"><input type="number" className="bg-transparent w-16" value={lvl.breakthroughCost} onChange={e => {
                                                  const newRealms = [...localConfig.realms];
                                                  newRealms[rIdx].levels[lIdx].breakthroughCost = parseInt(e.target.value);
                                                  setLocalConfig({...localConfig, realms: newRealms});
                                              }} /></td>
                                              <td className="p-2"><input type="number" step="0.1" className="bg-transparent w-12" value={lvl.breakthroughChance} onChange={e => {
                                                  const newRealms = [...localConfig.realms];
                                                  newRealms[rIdx].levels[lIdx].breakthroughChance = parseFloat(e.target.value);
                                                  setLocalConfig({...localConfig, realms: newRealms});
                                              }} /></td>
                                              <td className="p-2">
                                                  <button className="text-red-500" onClick={() => {
                                                      const newRealms = [...localConfig.realms];
                                                      newRealms[rIdx].levels.splice(lIdx, 1);
                                                      newRealms[rIdx].rangeEnd--;
                                                      setLocalConfig({...localConfig, realms: newRealms});
                                                  }}>X</button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                              <div className="mt-2 flex justify-center">
                                  <Button size="sm" onClick={() => {
                                      const newRealms = [...localConfig.realms];
                                      const prev = newRealms[rIdx].levels[newRealms[rIdx].levels.length - 1];
                                      newRealms[rIdx].levels.push(createDefaultLevelConfig(newRealms[rIdx].levels.length, prev));
                                      newRealms[rIdx].rangeEnd++;
                                      setLocalConfig({...localConfig, realms: newRealms});
                                  }}>+ 增加一层</Button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {/* --- MAP TAB --- */}
          {activeTab === 'map' && (
              <div className="space-y-4">
                  <div className="flex justify-end">
                      <Button size="sm" onClick={() => {
                          const newMap = createEmptyMap();
                          setLocalConfig({...localConfig, maps: [...localConfig.maps, newMap]});
                      }}>+ 新增地图</Button>
                  </div>
                  {localConfig.maps.map((map, idx) => (
                      <div key={map.id} className="bg-slate-800 p-4 rounded border border-slate-700 flex flex-col gap-3">
                          <div className="flex gap-4">
                               <div className="w-16 h-16 bg-slate-900 flex items-center justify-center text-4xl rounded border border-slate-600">
                                   <input className="bg-transparent w-full text-center outline-none" value={map.icon} onChange={e => {
                                       const newMaps = [...localConfig.maps];
                                       newMaps[idx].icon = e.target.value;
                                       setLocalConfig({...localConfig, maps: newMaps});
                                   }} />
                               </div>
                               <div className="flex-1 space-y-2">
                                   <div className="flex gap-2">
                                       <input className="bg-slate-900 p-2 rounded text-emerald-300 font-bold flex-1" value={map.name} onChange={e => {
                                           const newMaps = [...localConfig.maps];
                                           newMaps[idx].name = e.target.value;
                                           setLocalConfig({...localConfig, maps: newMaps});
                                       }} placeholder="地图名称" />
                                       <select className="bg-slate-900 p-2 rounded" value={map.reqLevel} onChange={e => {
                                           const newMaps = [...localConfig.maps];
                                           newMaps[idx].reqLevel = parseInt(e.target.value);
                                           setLocalConfig({...localConfig, maps: newMaps});
                                       }}>
                                           {levelOptions}
                                       </select>
                                   </div>
                                   <input className="w-full bg-slate-900 p-2 rounded text-slate-400 text-sm" value={map.description} onChange={e => {
                                       const newMaps = [...localConfig.maps];
                                       newMaps[idx].description = e.target.value;
                                       setLocalConfig({...localConfig, maps: newMaps});
                                   }} placeholder="地图描述" />
                               </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-900/50 p-3 rounded">
                               <div className="flex flex-col">
                                   <label className="text-xs text-slate-500">节点数量</label>
                                   <input type="number" className="bg-slate-800 p-1 rounded" value={map.nodeCount} onChange={e => {
                                       const newMaps = [...localConfig.maps];
                                       newMaps[idx].nodeCount = parseInt(e.target.value);
                                       setLocalConfig({...localConfig, maps: newMaps});
                                   }} />
                               </div>
                               <div className="flex flex-col">
                                   <label className="text-xs text-amber-500">游商权重</label>
                                   <input type="number" step="0.1" className="bg-slate-800 p-1 rounded" value={map.eventWeights.merchant} onChange={e => {
                                       const newMaps = [...localConfig.maps];
                                       newMaps[idx].eventWeights.merchant = parseFloat(e.target.value);
                                       setLocalConfig({...localConfig, maps: newMaps});
                                   }} />
                               </div>
                               <div className="flex flex-col">
                                   <label className="text-xs text-yellow-500">宝物权重</label>
                                   <input type="number" step="0.1" className="bg-slate-800 p-1 rounded" value={map.eventWeights.treasure} onChange={e => {
                                       const newMaps = [...localConfig.maps];
                                       newMaps[idx].eventWeights.treasure = parseFloat(e.target.value);
                                       setLocalConfig({...localConfig, maps: newMaps});
                                   }} />
                               </div>
                               <div className="flex flex-col">
                                   <label className="text-xs text-red-500">战斗权重</label>
                                   <input type="number" step="0.1" className="bg-slate-800 p-1 rounded" value={map.eventWeights.battle} onChange={e => {
                                       const newMaps = [...localConfig.maps];
                                       newMaps[idx].eventWeights.battle = parseFloat(e.target.value);
                                       setLocalConfig({...localConfig, maps: newMaps});
                                   }} />
                               </div>
                               <div className="flex flex-col">
                                   <label className="text-xs text-slate-500">空置权重</label>
                                   <input type="number" step="0.1" className="bg-slate-800 p-1 rounded" value={map.eventWeights.empty} onChange={e => {
                                       const newMaps = [...localConfig.maps];
                                       newMaps[idx].eventWeights.empty = parseFloat(e.target.value);
                                       setLocalConfig({...localConfig, maps: newMaps});
                                   }} />
                               </div>
                          </div>
                          <div className="flex justify-end">
                              <button className="text-red-500 text-sm underline" onClick={() => {
                                  const newMaps = localConfig.maps.filter(m => m.id !== map.id);
                                  setLocalConfig({...localConfig, maps: newMaps});
                              }}>删除地图</button>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {/* --- ITEMS TAB --- */}
          {activeTab === 'items' && (
             <div className="flex flex-col h-full">
                 <div className="flex gap-2 mb-4 overflow-x-auto shrink-0 pb-2">
                     {(['EQUIPMENT', 'CONSUMABLE', 'MATERIAL', 'RECIPE', 'PILL', 'ARTIFACT', 'FORGE_MATERIAL', 'FORGE_BLUEPRINT', 'TALISMAN_PEN', 'TALISMAN_PAPER', 'TALISMAN'] as ItemType[]).map(t => (
                         <button 
                            key={t} 
                            onClick={() => setItemSubTab(t)}
                            className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap ${itemSubTab === t ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                         >
                             {t === 'EQUIPMENT' ? '装备' : t === 'CONSUMABLE' ? '消耗品' : t === 'MATERIAL' ? '药材' : t === 'RECIPE' ? '丹方' : t === 'PILL' ? '丹药' : t === 'ARTIFACT' ? '法宝' : t === 'FORGE_MATERIAL' ? '器材' : t === 'FORGE_BLUEPRINT' ? '图纸' : t === 'TALISMAN_PEN' ? '符笔' : t === 'TALISMAN_PAPER' ? '符纸' : '符箓'}
                         </button>
                     ))}
                     <div className="ml-auto flex gap-2">
                         {renderRealmFilter()}
                         <Button size="sm" onClick={() => {
                             const newItem = createEmptyItem(itemSubTab, getFilterStartLevel());
                             setLocalConfig({...localConfig, items: [newItem, ...localConfig.items]});
                         }}>+ 新增</Button>
                     </div>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                     {localConfig.items.filter(i => i.type === itemSubTab && filterByRealm(i.reqLevel)).map(item => (
                         <div key={item.id} className="bg-slate-800 p-3 rounded border border-slate-700 text-sm">
                             <div className="flex gap-4 items-start">
                                 <div className="w-12 h-12 bg-slate-900 flex items-center justify-center text-2xl border border-slate-600 rounded">
                                     <input className="bg-transparent w-full text-center outline-none" value={item.icon} onChange={e => {
                                         const newItems = localConfig.items.map(i => i.id === item.id ? {...i, icon: e.target.value} : i);
                                         setLocalConfig({...localConfig, items: newItems});
                                     }} />
                                 </div>
                                 <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                                     <input className="bg-slate-900 p-1 rounded text-emerald-300 font-bold col-span-1" value={item.name} onChange={e => {
                                         const newItems = localConfig.items.map(i => i.id === item.id ? {...i, name: e.target.value} : i);
                                         setLocalConfig({...localConfig, items: newItems});
                                     }} placeholder="名称"/>
                                     
                                     <div className="flex items-center gap-1 col-span-1">
                                         <label className="text-slate-500 text-xs shrink-0">等级</label>
                                         <select className="bg-slate-900 p-1 rounded w-full" value={item.reqLevel} onChange={e => {
                                             const newItems = localConfig.items.map(i => i.id === item.id ? {...i, reqLevel: parseInt(e.target.value)} : i);
                                             setLocalConfig({...localConfig, items: newItems});
                                         }}>
                                             {levelOptions}
                                         </select>
                                     </div>

                                     <div className="flex items-center gap-1 col-span-1">
                                         <label className="text-slate-500 text-xs shrink-0">价格</label>
                                         <input type="number" className="bg-slate-900 p-1 rounded w-full" value={item.price} onChange={e => {
                                             const newItems = localConfig.items.map(i => i.id === item.id ? {...i, price: parseInt(e.target.value)} : i);
                                             setLocalConfig({...localConfig, items: newItems});
                                         }} />
                                     </div>
                                     
                                     <div className="flex items-center gap-1 col-span-1">
                                         <label className="text-slate-500 text-xs shrink-0">稀有度</label>
                                         <select className="bg-slate-900 p-1 rounded w-full" value={item.rarity} onChange={e => {
                                             const newItems = localConfig.items.map(i => i.id === item.id ? {...i, rarity: e.target.value as any} : i);
                                             setLocalConfig({...localConfig, items: newItems});
                                         }}>
                                             <option value="common">Common</option>
                                             <option value="rare">Rare</option>
                                             <option value="epic">Epic</option>
                                             <option value="legendary">Legendary</option>
                                         </select>
                                     </div>
                                     
                                     <input className="bg-slate-900 p-1 rounded text-xs text-slate-400 col-span-4" value={item.description} onChange={e => {
                                         const newItems = localConfig.items.map(i => i.id === item.id ? {...i, description: e.target.value} : i);
                                         setLocalConfig({...localConfig, items: newItems});
                                     }} placeholder="描述"/>
                                     
                                     {(item.type === 'EQUIPMENT' || item.type === 'ARTIFACT') && (
                                         <div className="col-span-4 grid grid-cols-6 gap-2 bg-slate-900/50 p-2 rounded">
                                             <div className="col-span-2">
                                                 <label className="text-[10px] text-slate-500 block">部位</label>
                                                 <select className="bg-slate-800 w-full text-xs p-1 rounded" value={item.slot || 'mainWeapon'} onChange={e => {
                                                     const newItems = localConfig.items.map(i => i.id === item.id ? {...i, slot: e.target.value as EquipmentSlot} : i);
                                                     setLocalConfig({...localConfig, items: newItems});
                                                 }}>
                                                     {Object.keys(SLOT_NAMES).map(k => <option key={k} value={k}>{SLOT_NAMES[k as EquipmentSlot]}</option>)}
                                                 </select>
                                             </div>
                                             {['attack', 'defense', 'maxHp', 'speed', 'maxSpirit'].map(stat => (
                                                 <div key={stat}>
                                                     <label className="text-[10px] text-slate-500 block uppercase">{stat}</label>
                                                     <input type="number" className="bg-slate-800 w-full p-1 rounded text-xs" 
                                                        // @ts-ignore
                                                        value={item.statBonus?.[stat] || 0} 
                                                        onChange={e => {
                                                            const newItems = localConfig.items.map(i => i.id === item.id ? {...i, statBonus: {...i.statBonus, [stat]: parseInt(e.target.value)}} : i);
                                                            setLocalConfig({...localConfig, items: newItems});
                                                        }}
                                                     />
                                                 </div>
                                             ))}
                                         </div>
                                     )}

                                     {(item.type === 'TALISMAN_PEN') && (
                                          <div className="col-span-4 grid grid-cols-2 gap-2 bg-slate-900/50 p-2 rounded">
                                              <div>
                                                  <label className="text-[10px] text-slate-500 block">耐久度</label>
                                                  <input type="number" className="bg-slate-800 w-full p-1 rounded text-xs" 
                                                      value={item.maxDurability || 0} 
                                                      onChange={e => {
                                                          const newItems = localConfig.items.map(i => i.id === item.id ? {...i, maxDurability: parseInt(e.target.value), durability: parseInt(e.target.value)} : i);
                                                          setLocalConfig({...localConfig, items: newItems});
                                                      }}
                                                  />
                                              </div>
                                          </div>
                                     )}

                                     {(item.type === 'RECIPE' || item.type === 'FORGE_BLUEPRINT') && (
                                         <div className="col-span-4 bg-slate-900/50 p-2 rounded space-y-2">
                                             <div className="flex gap-2 text-xs">
                                                  <div className="flex-1">
                                                      <label className="block text-slate-500">{item.type === 'RECIPE' ? '产出丹药' : '产出法宝'}</label>
                                                      <select className="w-full bg-slate-800 p-1 rounded" value={item.recipeResult || ''} onChange={e => {
                                                          const newItems = localConfig.items.map(i => i.id === item.id ? {...i, recipeResult: e.target.value} : i);
                                                          setLocalConfig({...localConfig, items: newItems});
                                                      }}>
                                                          <option value="">选择...</option>
                                                          {(item.type === 'RECIPE' ? availablePills : availableArtifacts).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                      </select>
                                                  </div>
                                                  <div className="w-24">
                                                      <label className="block text-slate-500">成功率 (0-1)</label>
                                                      <input type="number" step="0.1" className="w-full bg-slate-800 p-1 rounded" value={item.successRate || 0.5} onChange={e => {
                                                          const newItems = localConfig.items.map(i => i.id === item.id ? {...i, successRate: parseFloat(e.target.value)} : i);
                                                          setLocalConfig({...localConfig, items: newItems});
                                                      }} />
                                                  </div>
                                             </div>
                                             <div className="text-xs">
                                                 <label className="block text-slate-500 mb-1">所需材料</label>
                                                 {item.recipeMaterials?.map((mat, idx) => (
                                                     <div key={idx} className="flex gap-2 mb-1">
                                                         <select className="flex-1 bg-slate-800 p-1 rounded" value={mat.itemId} onChange={e => {
                                                             const newMats = [...(item.recipeMaterials || [])];
                                                             newMats[idx].itemId = e.target.value;
                                                             const newItems = localConfig.items.map(i => i.id === item.id ? {...i, recipeMaterials: newMats} : i);
                                                             setLocalConfig({...localConfig, items: newItems});
                                                         }}>
                                                             {(item.type === 'RECIPE' ? availableMaterials : availableForgeMaterials).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                         </select>
                                                         <input type="number" className="w-16 bg-slate-800 p-1 rounded" value={mat.count} onChange={e => {
                                                             const newMats = [...(item.recipeMaterials || [])];
                                                             newMats[idx].count = parseInt(e.target.value);
                                                             const newItems = localConfig.items.map(i => i.id === item.id ? {...i, recipeMaterials: newMats} : i);
                                                             setLocalConfig({...localConfig, items: newItems});
                                                         }} />
                                                         <button className="text-red-400 px-1" onClick={() => {
                                                             const newMats = (item.recipeMaterials || []).filter((_, i) => i !== idx);
                                                             const newItems = localConfig.items.map(i => i.id === item.id ? {...i, recipeMaterials: newMats} : i);
                                                             setLocalConfig({...localConfig, items: newItems});
                                                         }}>X</button>
                                                     </div>
                                                 ))}
                                                 <Button size="sm" className="mt-1 py-0 h-6 text-[10px]" onClick={() => {
                                                     const targetList = item.type === 'RECIPE' ? availableMaterials : availableForgeMaterials;
                                                     const newMats = [...(item.recipeMaterials || []), {itemId: targetList[0]?.id || '', count: 1}];
                                                     const newItems = localConfig.items.map(i => i.id === item.id ? {...i, recipeMaterials: newMats} : i);
                                                     setLocalConfig({...localConfig, items: newItems});
                                                 }}>+ 添加材料</Button>
                                             </div>
                                         </div>
                                     )}

                                 </div>
                                 <button className="text-red-500 text-xs mt-1" onClick={() => {
                                     const newItems = localConfig.items.filter(i => i.id !== item.id);
                                     setLocalConfig({...localConfig, items: newItems});
                                 }}>删除</button>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
          )}

          {/* --- ENEMIES TAB --- */}
          {activeTab === 'enemies' && (
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                       {renderRealmFilter()}
                       <Button size="sm" onClick={() => {
                           setLocalConfig({...localConfig, enemies: [createEmptyEnemy(getFilterStartLevel()), ...localConfig.enemies]});
                       }}>+ 新增敌人</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {localConfig.enemies.filter(e => filterByRealm(e.minPlayerLevel)).map((enemy, idx) => (
                          <div key={idx} className="bg-slate-800 p-4 rounded border border-slate-700">
                              <div className="flex justify-between mb-2">
                                  <input className="bg-slate-900 p-1 rounded font-bold text-red-300" value={enemy.name} onChange={e => {
                                      const newEnemies = [...localConfig.enemies];
                                      newEnemies[idx].name = e.target.value;
                                      setLocalConfig({...localConfig, enemies: newEnemies});
                                  }} />
                                  <select className="bg-slate-900 p-1 rounded text-xs" value={enemy.minPlayerLevel} onChange={e => {
                                      const newEnemies = [...localConfig.enemies];
                                      newEnemies[idx].minPlayerLevel = parseInt(e.target.value);
                                      setLocalConfig({...localConfig, enemies: newEnemies});
                                  }}>
                                      {levelOptions}
                                  </select>
                              </div>
                              <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                                  <div>
                                      <label>HP</label>
                                      <input type="number" className="w-full bg-slate-900 rounded" value={enemy.baseStats.maxHp} onChange={e => {
                                          const newEnemies = [...localConfig.enemies];
                                          newEnemies[idx].baseStats.maxHp = parseInt(e.target.value);
                                          newEnemies[idx].baseStats.hp = parseInt(e.target.value);
                                          setLocalConfig({...localConfig, enemies: newEnemies});
                                      }} />
                                  </div>
                                  <div>
                                      <label>ATK</label>
                                      <input type="number" className="w-full bg-slate-900 rounded" value={enemy.baseStats.attack} onChange={e => {
                                          const newEnemies = [...localConfig.enemies];
                                          newEnemies[idx].baseStats.attack = parseInt(e.target.value);
                                          setLocalConfig({...localConfig, enemies: newEnemies});
                                      }} />
                                  </div>
                                  <div>
                                      <label>SPI</label>
                                      <input type="number" className="w-full bg-slate-900 rounded" value={enemy.baseStats.maxSpirit} onChange={e => {
                                          const newEnemies = [...localConfig.enemies];
                                          newEnemies[idx].baseStats.maxSpirit = parseInt(e.target.value);
                                          newEnemies[idx].baseStats.spirit = parseInt(e.target.value);
                                          setLocalConfig({...localConfig, enemies: newEnemies});
                                      }} />
                                  </div>
                                  <div>
                                      <label>SPD</label>
                                      <input type="number" className="w-full bg-slate-900 rounded" value={enemy.baseStats.speed} onChange={e => {
                                          const newEnemies = [...localConfig.enemies];
                                          newEnemies[idx].baseStats.speed = parseInt(e.target.value);
                                          setLocalConfig({...localConfig, enemies: newEnemies});
                                      }} />
                                  </div>
                              </div>
                              <div className="bg-slate-900 p-2 rounded">
                                  <div className="text-xs text-slate-500 mb-1">卡组 (Card IDs)</div>
                                  <div className="flex flex-wrap gap-1">
                                      {enemy.cardIds.map((cid, cIdx) => (
                                          <span key={cIdx} className="bg-slate-700 px-1 rounded text-[10px] flex items-center gap-1">
                                              {localConfig.cards.find(c => c.id === cid)?.name || cid}
                                              <button className="text-red-400 font-bold" onClick={() => {
                                                  const newEnemies = [...localConfig.enemies];
                                                  newEnemies[idx].cardIds.splice(cIdx, 1);
                                                  setLocalConfig({...localConfig, enemies: newEnemies});
                                              }}>x</button>
                                          </span>
                                      ))}
                                      <button className="bg-emerald-800 px-2 rounded text-[10px]" onClick={() => {
                                          const card = localConfig.cards[0];
                                          if(card) {
                                              const newEnemies = [...localConfig.enemies];
                                              newEnemies[idx].cardIds.push(card.id);
                                              setLocalConfig({...localConfig, enemies: newEnemies});
                                          }
                                      }}>+</button>
                                  </div>
                              </div>
                              <button className="text-red-500 text-xs mt-2 underline" onClick={() => {
                                  const newEnemies = localConfig.enemies.filter((_, i) => i !== idx);
                                  setLocalConfig({...localConfig, enemies: newEnemies});
                              }}>删除敌人</button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* --- CARDS TAB --- */}
          {activeTab === 'cards' && (
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                       {renderRealmFilter()}
                       <Button size="sm" onClick={() => {
                           setLocalConfig({...localConfig, cards: [createEmptyCard(getFilterStartLevel()), ...localConfig.cards]});
                       }}>+ 新增卡牌</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {localConfig.cards.filter(c => filterByRealm(c.reqLevel)).map((card, idx) => (
                          <div key={card.id} className="bg-slate-800 p-3 rounded border border-slate-700 flex flex-col gap-2 relative">
                              <div className="flex justify-between">
                                  <input className="bg-slate-900 p-1 rounded font-bold text-emerald-300 w-1/2" value={card.name} onChange={e => {
                                      const newCards = [...localConfig.cards];
                                      newCards.find(c => c.id === card.id)!.name = e.target.value;
                                      setLocalConfig({...localConfig, cards: newCards});
                                  }} />
                                  <select className="bg-slate-900 p-1 rounded text-xs w-1/3" value={card.reqLevel} onChange={e => {
                                      const newCards = [...localConfig.cards];
                                      newCards.find(c => c.id === card.id)!.reqLevel = parseInt(e.target.value);
                                      setLocalConfig({...localConfig, cards: newCards});
                                  }}>
                                      {levelOptions}
                                  </select>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                  <select className="bg-slate-900 p-1 rounded" value={card.type} onChange={e => {
                                      const newCards = [...localConfig.cards];
                                      newCards.find(c => c.id === card.id)!.type = e.target.value as CardType;
                                      setLocalConfig({...localConfig, cards: newCards});
                                  }}>
                                      {Object.values(CardType).map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                  <select className="bg-slate-900 p-1 rounded" value={card.element} onChange={e => {
                                      const newCards = [...localConfig.cards];
                                      newCards.find(c => c.id === card.id)!.element = e.target.value as ElementType;
                                      setLocalConfig({...localConfig, cards: newCards});
                                  }}>
                                      {Object.values(ElementType).map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                  <div className="flex items-center gap-1">
                                      <label>耗</label>
                                      <input type="number" className="bg-slate-900 w-full p-1 rounded" value={card.cost} onChange={e => {
                                          const newCards = [...localConfig.cards];
                                          newCards.find(c => c.id === card.id)!.cost = parseInt(e.target.value);
                                          setLocalConfig({...localConfig, cards: newCards});
                                      }} />
                                  </div>
                                  <div className="flex items-center gap-1">
                                      <label>值</label>
                                      <input type="number" className="bg-slate-900 w-full p-1 rounded" value={card.value} onChange={e => {
                                          const newCards = [...localConfig.cards];
                                          newCards.find(c => c.id === card.id)!.value = parseInt(e.target.value);
                                          setLocalConfig({...localConfig, cards: newCards});
                                      }} />
                                  </div>
                              </div>
                              <textarea className="bg-slate-900 w-full p-1 rounded text-xs text-slate-400 h-16" value={card.description} onChange={e => {
                                  const newCards = [...localConfig.cards];
                                  newCards.find(c => c.id === card.id)!.description = e.target.value;
                                  setLocalConfig({...localConfig, cards: newCards});
                              }} />
                              
                              <div className="flex gap-2 items-center flex-wrap">
                                  <label className="text-xs text-slate-500">标签</label>
                                  <div className="flex gap-2 flex-wrap">
                                      <label className="text-[10px] flex items-center gap-1 bg-slate-900 px-1 rounded cursor-pointer select-none">
                                          <input type="checkbox" checked={card.tags?.includes('PIERCE')} onChange={e => {
                                              const newCards = [...localConfig.cards];
                                              const currentTags = card.tags || [];
                                              if (e.target.checked) newCards.find(c => c.id === card.id)!.tags = [...currentTags, 'PIERCE'];
                                              else newCards.find(c => c.id === card.id)!.tags = currentTags.filter(t => t !== 'PIERCE');
                                              setLocalConfig({...localConfig, cards: newCards});
                                          }} /> 穿刺
                                      </label>
                                      <label className="text-[10px] flex items-center gap-1 bg-slate-900 px-1 rounded cursor-pointer select-none">
                                          <input type="checkbox" checked={card.tags?.includes('BURN')} onChange={e => {
                                              const newCards = [...localConfig.cards];
                                              const currentTags = card.tags || [];
                                              if (e.target.checked) newCards.find(c => c.id === card.id)!.tags = [...currentTags, 'BURN'];
                                              else newCards.find(c => c.id === card.id)!.tags = currentTags.filter(t => t !== 'BURN');
                                              setLocalConfig({...localConfig, cards: newCards});
                                          }} /> 🔥灼烧
                                      </label>
                                      <label className="text-[10px] flex items-center gap-1 bg-slate-900 px-1 rounded cursor-pointer select-none">
                                          <input type="checkbox" checked={card.tags?.includes('FROSTBITE')} onChange={e => {
                                              const newCards = [...localConfig.cards];
                                              const currentTags = card.tags || [];
                                              if (e.target.checked) newCards.find(c => c.id === card.id)!.tags = [...currentTags, 'FROSTBITE'];
                                              else newCards.find(c => c.id === card.id)!.tags = currentTags.filter(t => t !== 'FROSTBITE');
                                              setLocalConfig({...localConfig, cards: newCards});
                                          }} /> ❄️冻伤
                                      </label>
                                  </div>
                              </div>

                              <button className="text-red-500 text-xs absolute top-2 right-2" onClick={() => {
                                  const newCards = localConfig.cards.filter(c => c.id !== card.id);
                                  setLocalConfig({...localConfig, cards: newCards});
                              }}>✖</button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* --- PLAYER TAB --- */}
          {activeTab === 'player' && (
              <div className="flex flex-col gap-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                          <h3 className="text-xl font-bold text-emerald-300 mb-4">初始属性</h3>
                          <div className="grid grid-cols-2 gap-4">
                              {['maxHp', 'maxSpirit', 'attack', 'defense', 'speed'].map(stat => (
                                  <div key={stat} className="flex flex-col">
                                      <label className="text-sm text-slate-500 uppercase">{stat}</label>
                                      <input type="number" className="bg-slate-900 p-2 rounded text-white" 
                                          // @ts-ignore
                                          value={localConfig.playerInitialStats[stat]} 
                                          onChange={e => {
                                              const newStats = {...localConfig.playerInitialStats, [stat]: parseInt(e.target.value)};
                                              setLocalConfig({...localConfig, playerInitialStats: newStats});
                                          }}
                                      />
                                  </div>
                              ))}
                          </div>
                      </div>
                      
                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                          <h3 className="text-xl font-bold text-purple-300 mb-4">本命法宝栏位解锁</h3>
                          <div className="space-y-2">
                              {localConfig.artifactSlotConfigs.map((slot, idx) => (
                                  <div key={idx} className="flex items-center gap-4 bg-slate-900 p-2 rounded border border-slate-700">
                                      <div className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded font-bold text-slate-400">
                                          {idx + 1}
                                      </div>
                                      <div className="flex flex-col flex-1">
                                          <label className="text-xs text-slate-500">解锁需求</label>
                                          <div className="flex gap-2">
                                              <select className="bg-slate-800 p-1 rounded text-xs w-24" value={slot.reqLevel} onChange={e => {
                                                  const newSlots = [...localConfig.artifactSlotConfigs];
                                                  newSlots[idx].reqLevel = parseInt(e.target.value);
                                                  setLocalConfig({...localConfig, artifactSlotConfigs: newSlots});
                                              }}>
                                                  {levelOptions}
                                              </select>
                                              <input type="number" className="bg-slate-800 p-1 rounded text-xs w-24" value={slot.cost} placeholder="灵石消耗" onChange={e => {
                                                  const newSlots = [...localConfig.artifactSlotConfigs];
                                                  newSlots[idx].cost = parseInt(e.target.value);
                                                  setLocalConfig({...localConfig, artifactSlotConfigs: newSlots});
                                              }} />
                                              <span className="text-xs self-center text-yellow-500">灵石</span>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                              <Button size="sm" onClick={() => {
                                  const newSlots = [...localConfig.artifactSlotConfigs, {id: localConfig.artifactSlotConfigs.length, reqLevel: 1, cost: 1000}];
                                  setLocalConfig({...localConfig, artifactSlotConfigs: newSlots});
                              }}>+ 增加栏位</Button>
                          </div>
                      </div>
                  </div>

                  {/* Initial Deck Configuration */}
                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                      <h3 className="text-xl font-bold text-blue-300 mb-4">初始卡组</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                          {localConfig.playerInitialDeckIds.map((cid, idx) => {
                              const card = localConfig.cards.find(c => c.id === cid);
                              return (
                                  <div key={idx} className="bg-slate-700 px-3 py-1 rounded border border-slate-600 flex items-center gap-2">
                                      <span className={card ? 'text-white' : 'text-red-400'}>{card ? card.name : cid}</span>
                                      <button 
                                          className="text-red-400 hover:text-red-200 font-bold"
                                          onClick={() => {
                                              const newDeck = [...localConfig.playerInitialDeckIds];
                                              newDeck.splice(idx, 1);
                                              setLocalConfig({...localConfig, playerInitialDeckIds: newDeck});
                                          }}
                                      >x</button>
                                  </div>
                              );
                          })}
                      </div>
                      <div className="flex gap-2 items-center">
                          <select 
                              className="bg-slate-900 p-2 rounded max-w-xs"
                              onChange={(e) => {
                                  if (e.target.value) {
                                      setLocalConfig({...localConfig, playerInitialDeckIds: [...localConfig.playerInitialDeckIds, e.target.value]});
                                      e.target.value = '';
                                  }
                              }}
                          >
                              <option value="">+ 添加卡牌</option>
                              {localConfig.cards.map(c => (
                                  <option key={c.id} value={c.id}>{c.name} (Lv.{c.reqLevel})</option>
                              ))}
                          </select>
                      </div>
                  </div>
              </div>
          )}

        </div>
      </div>
    </div>
  );
};
