

import React, { useState } from 'react';
import { GameView, Player, MapNode, NodeType, Enemy, GameConfig, Item, EquipmentSlot, ElementType, Card } from './types';
import { DEFAULT_GAME_CONFIG, generatePlayerFromConfig, getRandomEnemyFromConfig, getRealmName, SLOT_NAMES, createZeroElementStats, generateSkillBook } from './constants';
import { HomeView } from './components/HomeView';
import { AdventureView } from './components/AdventureView';
import { CombatView } from './components/CombatView';
import { StartScreen } from './components/StartScreen';
import { ConfigScreen } from './components/ConfigScreen';
import { CardItem } from './components/CardItem';
import { Button } from './components/Button';

// Interaction State Type
type NodeInteraction = 
  | { type: 'COMBAT', node: MapNode, enemy: Enemy }
  | { type: 'REWARD', node: MapNode, reward: { type: 'ITEM' | 'GOLD', value: Item | number, message: string } }
  | { type: 'EMPTY', node: MapNode }
  | { type: 'MERCHANT', node: MapNode, inventory: Item[] };

export default function App() {
  // --- Game State ---
  const [view, setView] = useState<GameView>(GameView.START);
  const [config, setConfig] = useState<GameConfig>(DEFAULT_GAME_CONFIG);
  
  // Initialized when game starts
  const [player, setPlayer] = useState<Player | null>(null);
  
  // Adventure State
  const [mapNodes, setMapNodes] = useState<MapNode[]>([]);
  const [currentNode, setCurrentNode] = useState<number | null>(null);
  
  // Combat State
  const [activeEnemy, setActiveEnemy] = useState<Enemy | null>(null);

  // Modal States
  const [acquiredCard, setAcquiredCard] = useState<Card | null>(null);
  const [interaction, setInteraction] = useState<NodeInteraction | null>(null);
  
  // Shop State (Transient)
  const [merchantTab, setMerchantTab] = useState<'BUY' | 'SELL'>('BUY');
  
  // Breakthrough Result State
  const [breakthroughResult, setBreakthroughResult] = useState<{success: boolean, message: string, statsGained?: string} | null>(null);

  // --- Start Logic ---
  const handleStartGame = () => {
    const newPlayer = generatePlayerFromConfig(config);
    setPlayer(newPlayer);
    setView(GameView.HOME);
  };

  // --- Actions ---

  const generateMap = () => {
    const count = config.mapNodeCount;
    // Get weights or default
    const w = config.eventWeights || { merchant: 0.15, treasure: 0.25, battle: 0.30, empty: 0.30 };
    const totalWeight = w.merchant + w.treasure + w.battle + w.empty;

    const nodes: MapNode[] = Array.from({ length: count }, (_, i) => {
        const rand = Math.random() * totalWeight;
        let type = NodeType.EMPTY;
        
        // Weighted Random Selection
        let cum = 0;
        if (rand < (cum += w.merchant)) type = NodeType.MERCHANT;
        else if (rand < (cum += w.treasure)) type = NodeType.TREASURE;
        else if (rand < (cum += w.battle)) type = NodeType.BATTLE;
        else type = NodeType.EMPTY;

        return {
            id: i,
            type: type,
            visited: false,
            x: 0, 
            y: 0
        };
    });
    // Ensure node 0 is safe
    nodes[0].type = NodeType.EMPTY;
    // Ensure last node is Boss
    nodes[nodes.length - 1].type = NodeType.BOSS;
    setMapNodes(nodes);
    setCurrentNode(null);
  };

  const startAdventure = () => {
    generateMap();
    setView(GameView.ADVENTURE);
  };

  // 1. Player Clicks Node -> Calculate Outcome & Show Modal
  const handleNodeClick = (node: MapNode) => {
    if (!player) return;

    if (node.type === NodeType.BATTLE || node.type === NodeType.BOSS) {
      // Preview Enemy
      const enemy = getRandomEnemyFromConfig(player.level, config);
      setInteraction({ type: 'COMBAT', node, enemy });
    } 
    else if (node.type === NodeType.TREASURE) {
      // Preview Reward
      const currentRealm = config.realms.find(r => player.level >= r.rangeStart && player.level <= r.rangeEnd) || config.realms[0];
      
      // Reward Logic: Prioritize Realm Items
      if (Math.random() < config.itemDropRate && config.items.length > 0) {
        let validItems: Item[] = [];
        if (currentRealm) {
            validItems = config.items.filter(i => i.reqLevel >= currentRealm.rangeStart && i.reqLevel <= currentRealm.rangeEnd);
        }
        if (validItems.length === 0) validItems = config.items;
        
        const item = validItems[Math.floor(Math.random() * validItems.length)];
        
        setInteraction({
            type: 'REWARD',
            node,
            reward: {
                type: 'ITEM',
                value: item,
                message: '发现了一个古朴的宝箱，里面似乎藏着宝物...'
            }
        });
      } else {
         const min = currentRealm.minGoldDrop || 10;
         const max = currentRealm.maxGoldDrop || 50;
         const foundGold = Math.floor(Math.random() * (max - min + 1)) + min;
         
         setInteraction({
            type: 'REWARD',
            node,
            reward: {
                type: 'GOLD',
                value: foundGold,
                message: '发现了一个遗落的钱袋。'
            }
        });
      }
    } 
    else if (node.type === NodeType.MERCHANT) {
        // Generate Merchant Inventory
        const currentRealm = config.realms.find(r => player.level >= r.rangeStart && player.level <= r.rangeEnd);
        let validItems = config.items;
        if (currentRealm) {
             // Filter roughly by level so merchant isn't selling garbage or god-tier only
             validItems = config.items.filter(i => Math.abs(i.reqLevel - player.level) <= 5);
        }
        if (validItems.length === 0) validItems = config.items;

        // Pick 4-8 random items
        const count = 4 + Math.floor(Math.random() * 5);
        const shopInventory: Item[] = [];
        for(let i=0; i<count; i++) {
            const item = validItems[Math.floor(Math.random() * validItems.length)];
            // Avoid duplicates in display id
            shopInventory.push({ ...item, id: `${item.id}_shop_${i}` });
        }

        setInteraction({ type: 'MERCHANT', node, inventory: shopInventory });
        setMerchantTab('BUY');
    }
    else {
        // Empty Node
        setInteraction({ type: 'EMPTY', node });
    }
  };

  // 2. User Confirms Modal -> Execute Move & State Change
  const handleInteractionConfirm = () => {
      if (!interaction || !player) return;

      const { node, type } = interaction;

      // Update Map Visited
      const newNodes = mapNodes.map(n => n.id === node.id ? { ...n, visited: true } : n);
      setMapNodes(newNodes);
      setCurrentNode(node.id);

      if (type === 'COMBAT') {
          const enemy = (interaction as any).enemy;
          setActiveEnemy(enemy);
          setView(GameView.COMBAT);
      } else if (type === 'REWARD') {
          const reward = (interaction as any).reward;
          setPlayer(prev => {
              if (!prev) return null;
              if (reward.type === 'ITEM') {
                  return { ...prev, inventory: [...prev.inventory, reward.value as Item] };
              } else {
                  return { ...prev, gold: prev.gold + (reward.value as number) };
              }
          });
      } else if (type === 'MERCHANT') {
          // Just close modal, player has finished trading
      } else {
          // Empty node, just moved
      }

      setInteraction(null);
  };

  // Merchant Logic
  const handleBuyItem = (item: Item) => {
      if (!player) return;
      if (player.gold < item.price) {
          alert("灵石不足！");
          return;
      }
      
      setPlayer(prev => {
          if (!prev) return null;
          return {
              ...prev,
              gold: prev.gold - item.price,
              inventory: [...prev.inventory, { ...item, id: `bought_${Date.now()}_${item.id}` }]
          };
      });
      
      // Remove bought item from shop list (optional, maybe infinite stock? let's remove for realism)
      if (interaction?.type === 'MERCHANT') {
          setInteraction(prev => {
              if (prev?.type !== 'MERCHANT') return prev;
              return {
                  ...prev,
                  inventory: prev.inventory.filter(i => i.id !== item.id)
              }
          });
      }
  };

  const handleSellItem = (item: Item) => {
      if (!player) return;
      const sellPrice = Math.floor(item.price * 0.5); // Sell for 50% value

      setPlayer(prev => {
          if (!prev) return null;
          return {
              ...prev,
              gold: prev.gold + sellPrice,
              inventory: prev.inventory.filter(i => i.id !== item.id)
          };
      });
  };


  const handleCombatWin = (rewards: { exp: number, gold: number, drops: Item[] }) => {
    setPlayer(prev => {
        if (!prev) return null;
        const newExp = prev.exp + rewards.exp;
        
        // NO AUTO LEVEL UP - Just accumulate exp
        let updatedPlayer = { ...prev };
        updatedPlayer = {
            ...updatedPlayer,
            exp: newExp,
        };

        updatedPlayer.gold += rewards.gold;
        if (rewards.drops.length > 0) {
            updatedPlayer.inventory = [...updatedPlayer.inventory, ...rewards.drops];
        }

        return updatedPlayer;
    });
    
    if (activeEnemy?.name.includes('领主') || (currentNode !== null && currentNode === mapNodes.length - 1)) {
         setView(GameView.HOME);
    } else {
        setView(GameView.ADVENTURE);
    }
    setActiveEnemy(null);
  };

  const handleCombatLose = () => {
    setPlayer(prev => prev ? ({
        ...prev,
        stats: { ...prev.stats, hp: Math.floor(prev.stats.maxHp * 0.1) } 
    }) : null);
    setView(GameView.HOME);
    setActiveEnemy(null);
  };

  // New: Manual Breakthrough Logic
  const handleBreakthrough = () => {
      if (!player) return;
      
      // Find current config
      const currentRealm = config.realms.find(r => player.level >= r.rangeStart && player.level <= r.rangeEnd) || config.realms[0];
      const cost = currentRealm.breakthroughCost || 0;
      const chance = currentRealm.breakthroughChance || 0.5;

      if (player.gold < cost) {
          alert(`灵石不足！突破需要 ${cost} 灵石。`);
          return;
      }

      // Pay cost
      setPlayer(prev => prev ? ({ ...prev, gold: prev.gold - cost }) : null);

      // Roll for success
      const roll = Math.random();
      if (roll <= chance) {
          // SUCCESS
          setPlayer(prev => {
              if (!prev) return null;
              const newLevel = prev.level + 1;
              const expLeft = prev.exp - prev.maxExp; // Consume exp
              
              // Find next realm config (if level moves to next realm, use that, else use current)
              // Actually, stat growth is usually defined by the level you just completed or the one you are in.
              // Let's use the current realm's growth config for this level up.
              
              const statsGainedMsg = `HP+${currentRealm.hpGrowth}, 攻+${currentRealm.atkGrowth}, 防+${currentRealm.defGrowth}, 神+${currentRealm.spiritGrowth}, 速+${currentRealm.speedGrowth}`;
              
              // Calculate next Max Exp
              const nextRealm = config.realms.find(r => newLevel >= r.rangeStart && newLevel <= r.rangeEnd) || currentRealm;
              // If entering new realm, expReq might change significantly.
              // If staying in same realm, maybe scale slightly? For now, keep realm base req.
              // A simple scaling: Base + (LevelInRealm * 10%)?
              // The request asked for "Accumulate", but maxExp logic usually fixed per realm or formula.
              // Let's use the `expReq` from the realm config of the NEW level.
              const nextMaxExp = nextRealm.expReq;

              setBreakthroughResult({
                  success: true,
                  message: '突破成功！境界提升！',
                  statsGained: statsGainedMsg
              });

              return {
                  ...prev,
                  level: newLevel,
                  exp: expLeft,
                  maxExp: nextMaxExp,
                  stats: {
                      ...prev.stats,
                      maxHp: prev.stats.maxHp + (currentRealm.hpGrowth || 0),
                      hp: prev.stats.maxHp + (currentRealm.hpGrowth || 0), // Full heal on level up? Or just increase cap? Let's increase current too.
                      attack: prev.stats.attack + (currentRealm.atkGrowth || 0),
                      defense: prev.stats.defense + (currentRealm.defGrowth || 0),
                      maxSpirit: prev.stats.maxSpirit + (currentRealm.spiritGrowth || 0),
                      spirit: prev.stats.maxSpirit + (currentRealm.spiritGrowth || 0),
                      speed: prev.stats.speed + (currentRealm.speedGrowth || 0),
                  }
              };
          });
      } else {
          // FAILURE
          setBreakthroughResult({
              success: false,
              message: '突破失败... 灵力逆流，损失了部分灵石，境界未得寸进。',
          });
          // Player loses gold (already deducted) and keeps EXP.
      }
  };

  const handleUseItem = (item: Item) => {
      if (!player) return;
      if (item.type !== 'CONSUMABLE') return;

      const parts = item.id.split('_');
      if (parts[0] === 'book') {
          const elem = parts[1] as ElementType;
          const bookLevel = parseInt(parts[2]);

          const realm = config.realms.find(r => bookLevel >= r.rangeStart && bookLevel <= r.rangeEnd);
          
          if (!realm) {
              alert("这本心法残缺不全，无法领悟！");
              return;
          }

          const validCards = config.cards.filter(c => 
              c.element === elem && 
              c.reqLevel >= realm.rangeStart &&
              c.reqLevel <= realm.rangeEnd + 5
          );

          if (validCards.length > 0) {
              const newCard = validCards[Math.floor(Math.random() * validCards.length)];
              
              setPlayer(prev => {
                  if (!prev) return null;
                  return {
                      ...prev,
                      deck: [...prev.deck, newCard],
                      inventory: prev.inventory.filter(i => i.id !== item.id) 
                  };
              });

              setAcquiredCard(newCard);
          } else {
              alert(`你研读了${item.name}，却发现书中记载的法术早已失传...`);
              setPlayer(prev => prev ? ({ ...prev, inventory: prev.inventory.filter(i => i.id !== item.id) }) : null);
          }
      } else {
          alert("此物品暂无使用效果。");
      }
  };

  const handleEquip = (item: Item) => {
      if (!player) return;
      
      if (player.level < (item.reqLevel || 1)) {
          alert(`你的境界不足，无法驾驭此宝物！(需要: ${getRealmName(item.reqLevel || 1, config.realms)})`);
          return;
      }

      if (item.type !== 'EQUIPMENT' && item.type !== 'ARTIFACT') {
          alert("此物品无法装备！");
          return;
      }

      if (!item.slot) {
          alert("此装备位置未知，无法装备！");
          return;
      }

      const existingItem = player.equipment[item.slot];
      let newInventory = player.inventory.filter(i => i.id !== item.id);
      if (existingItem) {
          newInventory.push(existingItem);
      }

      alert(`装备了 ${item.name} 于 [${SLOT_NAMES[item.slot]}]`);

      setPlayer(prev => {
          if (!prev) return null;
          
          const attackDiff = (item.statBonus?.attack || 0) - (existingItem?.statBonus?.attack || 0);
          const defenseDiff = (item.statBonus?.defense || 0) - (existingItem?.statBonus?.defense || 0);
          const maxHpDiff = (item.statBonus?.maxHp || 0) - (existingItem?.statBonus?.maxHp || 0);
          const maxSpiritDiff = (item.statBonus?.maxSpirit || 0) - (existingItem?.statBonus?.maxSpirit || 0);
          const speedDiff = (item.statBonus?.speed || 0) - (existingItem?.statBonus?.speed || 0);

          const newAffinities = { ...prev.stats.elementalAffinities };
          
          if (existingItem?.statBonus?.elementalAffinities) {
               Object.entries(existingItem.statBonus.elementalAffinities).forEach(([k, v]) => {
                   newAffinities[k as ElementType] -= (v as number);
               });
          }
          if (item.statBonus?.elementalAffinities) {
              Object.entries(item.statBonus.elementalAffinities).forEach(([k, v]) => {
                   newAffinities[k as ElementType] = (newAffinities[k as ElementType] || 0) + (v as number);
               });
          }

          return {
            ...prev,
            stats: {
                ...prev.stats,
                attack: prev.stats.attack + attackDiff,
                defense: prev.stats.defense + defenseDiff,
                maxHp: prev.stats.maxHp + maxHpDiff,
                maxSpirit: prev.stats.maxSpirit + maxSpiritDiff,
                speed: prev.stats.speed + speedDiff,
                elementalAffinities: newAffinities
            },
            equipment: {
                ...prev.equipment,
                [item.slot!]: item
            },
            inventory: newInventory
          };
      });
  };

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 font-sans overflow-hidden selection:bg-emerald-500 selection:text-white relative">
      
      {/* Exploration Interaction Modal */}
      {interaction && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className={`
                bg-slate-900 border-2 rounded-xl p-6 shadow-2xl flex flex-col items-center max-h-[80vh] w-full
                ${interaction.type === 'COMBAT' ? 'border-red-600 shadow-red-900/40 max-w-sm' : 
                  interaction.type === 'REWARD' ? 'border-amber-500 shadow-amber-900/40 max-w-sm' : 
                  interaction.type === 'MERCHANT' ? 'border-amber-700 shadow-amber-900/40 max-w-lg' : 'border-slate-500 max-w-sm'}
            `}>
                {/* Header */}
                <h2 className={`text-2xl font-bold mb-4 ${interaction.type === 'COMBAT' ? 'text-red-500' : interaction.type === 'REWARD' ? 'text-amber-400' : interaction.type === 'MERCHANT' ? 'text-amber-300' : 'text-slate-300'}`}>
                    {interaction.type === 'COMBAT' ? '⚔️ 遭遇强敌' : interaction.type === 'REWARD' ? '🎁 意外发现' : interaction.type === 'MERCHANT' ? '⚖️ 游方散修' : '👣 平静之地'}
                </h2>

                {/* Content */}
                <div className="mb-6 w-full flex flex-col items-center overflow-y-auto custom-scrollbar">
                    
                    {interaction.type === 'COMBAT' && interaction.enemy && (
                        <>
                            <div className="relative mb-3">
                                <img src={interaction.enemy.avatarUrl} className="w-24 h-24 rounded-full border-4 border-red-800" alt="Enemy" />
                                <div className="absolute -bottom-2 -right-2 bg-black/80 text-red-400 text-xs px-2 py-1 rounded border border-red-600">
                                    Lv.{interaction.enemy.level}
                                </div>
                            </div>
                            <div className="text-xl font-bold text-red-200">{interaction.enemy.name}</div>
                            <div className="text-sm text-red-400 mt-1 font-mono">
                                境界: {getRealmName(interaction.enemy.level, config.realms)}
                            </div>
                            <div className="text-xs text-slate-500 mt-2 text-center">
                                此地妖气冲天，似乎有一场恶战...
                            </div>
                        </>
                    )}

                    {interaction.type === 'REWARD' && interaction.reward && (
                        <>
                            <div className={`w-20 h-20 bg-slate-800 rounded-lg border-2 ${interaction.reward.type === 'ITEM' ? 'border-emerald-600' : 'border-yellow-500'} flex items-center justify-center text-4xl mb-3`}>
                                {interaction.reward.type === 'ITEM' ? ((interaction.reward.value as Item).type === 'CONSUMABLE' ? '📚' : '⚔️') : '💎'}
                            </div>
                            <div className={`text-lg font-bold ${interaction.reward.type === 'ITEM' && (interaction.reward.value as Item).rarity === 'legendary' ? 'text-amber-400' : 'text-white'}`}>
                                {interaction.reward.type === 'ITEM' ? (interaction.reward.value as Item).name : `灵石 x${interaction.reward.value}`}
                            </div>
                            {interaction.reward.type === 'ITEM' && (
                                <div className="text-xs text-slate-500 mt-1 max-w-[200px] text-center">
                                    {(interaction.reward.value as Item).description}
                                </div>
                            )}
                            <div className="text-sm text-slate-400 mt-3 text-center italic">
                                "{interaction.reward.message}"
                            </div>
                        </>
                    )}

                    {interaction.type === 'MERCHANT' && (
                        <div className="w-full">
                            <div className="text-center text-slate-300 text-sm mb-4 italic">"道友请留步，在这个荒郊野外相遇也是缘分，不如互通有无？"</div>
                            
                            <div className="flex justify-between items-center mb-4 bg-slate-950 p-2 rounded border border-slate-700">
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setMerchantTab('BUY')}
                                        className={`px-3 py-1 rounded text-sm font-bold ${merchantTab === 'BUY' ? 'bg-amber-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        购买
                                    </button>
                                    <button 
                                        onClick={() => setMerchantTab('SELL')}
                                        className={`px-3 py-1 rounded text-sm font-bold ${merchantTab === 'SELL' ? 'bg-emerald-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        出售
                                    </button>
                                </div>
                                <div className="text-yellow-400 font-mono font-bold text-sm">
                                    💰 {player?.gold}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                                {merchantTab === 'BUY' ? (
                                    <>
                                        {interaction.inventory.length === 0 && <div className="text-center text-slate-500 py-4">已被买空</div>}
                                        {interaction.inventory.map((item) => (
                                            <div key={item.id} className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700">
                                                <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center text-xl">{item.icon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-bold truncate ${item.rarity === 'legendary' ? 'text-amber-400' : 'text-white'}`}>{item.name}</div>
                                                    <div className="text-[10px] text-slate-400">{getRealmName(item.reqLevel, config.realms)}</div>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleBuyItem(item)}
                                                    disabled={(player?.gold || 0) < item.price}
                                                    className="shrink-0 text-xs px-2 py-1"
                                                >
                                                    💰 {item.price}
                                                </Button>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {player?.inventory.length === 0 && <div className="text-center text-slate-500 py-4">你的储物袋空空如也</div>}
                                        {player?.inventory.map((item) => (
                                            <div key={item.id} className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700">
                                                <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center text-xl">{item.icon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-bold truncate ${item.rarity === 'legendary' ? 'text-amber-400' : 'text-white'}`}>{item.name}</div>
                                                    <div className="text-[10px] text-slate-400">回收价</div>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    variant="primary"
                                                    onClick={() => handleSellItem(item)}
                                                    className="shrink-0 text-xs px-2 py-1 bg-emerald-800 hover:bg-emerald-700 border-emerald-600"
                                                >
                                                    +{Math.floor(item.price * 0.5)}
                                                </Button>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {interaction.type === 'EMPTY' && (
                         <>
                            <div className="text-5xl mb-3">🍃</div>
                            <div className="text-slate-400 text-center">
                                四周静悄悄的，没有什么特别的发现。<br/>
                                是一个修整的好地方。
                            </div>
                         </>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 w-full">
                    {interaction.type !== 'MERCHANT' && (
                        <Button 
                            variant="secondary" 
                            className="flex-1"
                            onClick={() => setInteraction(null)}
                        >
                            {interaction.type === 'COMBAT' ? '暂且退避' : '取消'}
                        </Button>
                    )}
                    <Button 
                        variant={interaction.type === 'COMBAT' ? 'danger' : 'primary'} 
                        className="flex-1"
                        onClick={handleInteractionConfirm}
                    >
                        {interaction.type === 'COMBAT' ? '开始战斗' : interaction.type === 'REWARD' ? '收入囊中' : interaction.type === 'MERCHANT' ? '告辞' : '继续前行'}
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* Breakthrough Result Modal */}
      {breakthroughResult && (
        <div className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
             <div className={`
                p-8 rounded-xl border-4 max-w-sm w-full shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col items-center text-center
                ${breakthroughResult.success ? 'bg-emerald-950 border-emerald-400 shadow-emerald-900/50' : 'bg-red-950 border-red-500 shadow-red-900/50'}
             `}>
                 <div className="text-6xl mb-4 animate-bounce-slight">
                     {breakthroughResult.success ? '⚡' : '💥'}
                 </div>
                 <h2 className={`text-3xl font-bold mb-2 ${breakthroughResult.success ? 'text-emerald-300' : 'text-red-400'}`}>
                     {breakthroughResult.success ? '突破成功!' : '突破失败'}
                 </h2>
                 <p className="text-slate-300 mb-6">
                     {breakthroughResult.message}
                 </p>
                 {breakthroughResult.statsGained && (
                     <div className="bg-black/40 p-3 rounded mb-6 text-sm text-emerald-200 font-mono">
                         {breakthroughResult.statsGained}
                     </div>
                 )}
                 <Button 
                    variant={breakthroughResult.success ? 'primary' : 'secondary'}
                    onClick={() => setBreakthroughResult(null)}
                    size="lg"
                    className="w-full"
                 >
                     {breakthroughResult.success ? '感受力量' : '再接再厉'}
                 </Button>
             </div>
        </div>
      )}

      {/* Acquired Card Modal */}
      {acquiredCard && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border-2 border-emerald-500 rounded-xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(16,185,129,0.3)] flex flex-col items-center transform scale-100 transition-all">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300 mb-6 tracking-widest text-center">
                    ✨ 顿悟 ✨
                </h2>
                <div className="mb-6 transform scale-110">
                    <CardItem card={acquiredCard} isPlayable={false} />
                </div>
                <div className="text-center text-slate-300 mb-8">
                    你研读了心法，灵光一闪<br/>
                    成功领悟了招式<br/>
                    <span className="font-bold text-emerald-400 text-lg mt-2 block">[{acquiredCard.name}]</span>
                </div>
                <Button 
                    variant="primary" 
                    size="lg" 
                    className="w-full"
                    onClick={() => setAcquiredCard(null)}
                >
                    收入囊中
                </Button>
            </div>
        </div>
      )}

      {view === GameView.START && (
        <StartScreen 
          onStart={handleStartGame}
          onConfig={() => setView(GameView.CONFIG)}
        />
      )}

      {view === GameView.CONFIG && (
        <ConfigScreen 
          config={config}
          onSave={(newConfig) => {
            setConfig(newConfig);
            setView(GameView.START);
          }}
          onCancel={() => setView(GameView.START)}
        />
      )}

      {view === GameView.HOME && player && (
        <HomeView 
          player={player} 
          realms={config.realms}
          onStartAdventure={startAdventure} 
          onEquipItem={handleEquip}
          onUseItem={handleUseItem}
          onEndGame={() => {
            setPlayer(null);
            setView(GameView.START);
          }}
          onBreakthrough={handleBreakthrough}
        />
      )}

      {view === GameView.ADVENTURE && player && (
        <AdventureView 
          mapNodes={mapNodes} 
          currentLocationId={currentNode} 
          onNodeClick={handleNodeClick}
          onRetreat={() => setView(GameView.HOME)}
        />
      )}

      {view === GameView.COMBAT && player && activeEnemy && (
        <CombatView 
          player={player} 
          enemy={activeEnemy}
          onWin={handleCombatWin}
          onLose={handleCombatLose}
        />
      )}
    </div>
  );
}