
import React, { useState } from 'react';
import { GameView, Player, MapNode, NodeType, Enemy, GameConfig, Item, EquipmentSlot, ElementType, Card, GameMap, Stats } from './types';
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
  const [currentMapConfig, setCurrentMapConfig] = useState<GameMap | null>(null);
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
  
  // Alchemy & Forge State
  const [isRefining, setIsRefining] = useState(false);
  const [refineResult, setRefineResult] = useState<{success: boolean, item?: Item} | null>(null);

  // --- Start Logic ---
  const handleStartGame = () => {
    const newPlayer = generatePlayerFromConfig(config);
    setPlayer(newPlayer);
    setView(GameView.HOME);
  };

  // --- Actions ---

  const generateMap = (mapConfig: GameMap) => {
    const count = mapConfig.nodeCount;
    const w = mapConfig.eventWeights;
    const totalWeight = w.merchant + w.treasure + w.battle + w.empty;

    const nodes: MapNode[] = Array.from({ length: count }, (_, i) => {
        const rand = Math.random() * totalWeight;
        let type = NodeType.EMPTY;
        let cum = 0;
        if (rand < (cum += w.merchant)) type = NodeType.MERCHANT;
        else if (rand < (cum += w.treasure)) type = NodeType.TREASURE;
        else if (rand < (cum += w.battle)) type = NodeType.BATTLE;
        else type = NodeType.EMPTY;

        return { id: i, type: type, visited: false, x: 0, y: 0 };
    });
    // Ensure start is empty and end is boss
    if (nodes.length > 0) nodes[0].type = NodeType.EMPTY;
    if (nodes.length > 1) nodes[nodes.length - 1].type = NodeType.BOSS;
    
    setMapNodes(nodes);
    setCurrentNode(null);
  };

  const handleSelectMap = (map: GameMap) => {
      setCurrentMapConfig(map);
      generateMap(map);
      setView(GameView.ADVENTURE);
  };

  const handleNodeClick = (node: MapNode) => {
    if (!player) return;
    
    if (node.type === NodeType.BATTLE || node.type === NodeType.BOSS) {
      const enemy = getRandomEnemyFromConfig(player.level, config);
      setInteraction({ type: 'COMBAT', node, enemy });
    } 
    else if (node.type === NodeType.TREASURE) {
      const currentRealm = config.realms.find(r => player.level >= r.rangeStart && player.level <= r.rangeEnd) || config.realms[0];
      // Chance for item vs gold
      if (Math.random() < config.itemDropRate && config.items.length > 0) {
        let validItems = config.items;
        if (currentRealm) { 
            const filtered = config.items.filter(i => i.reqLevel >= currentRealm.rangeStart && i.reqLevel <= currentRealm.rangeEnd); 
            if (filtered.length > 0) validItems = filtered;
        }
        
        const item = validItems[Math.floor(Math.random() * validItems.length)];
        setInteraction({ type: 'REWARD', node, reward: { type: 'ITEM', value: item, message: '发现了一个古朴的宝箱。' } });
      } else {
         const min = currentRealm.minGoldDrop || 10;
         const max = currentRealm.maxGoldDrop || 50;
         const goldAmount = Math.floor(Math.random() * (max - min + 1)) + min;
         setInteraction({ type: 'REWARD', node, reward: { type: 'GOLD', value: goldAmount, message: '发现了一个遗落的钱袋。' } });
      }
    } 
    else if (node.type === NodeType.MERCHANT) {
        const currentRealm = config.realms.find(r => player.level >= r.rangeStart && player.level <= r.rangeEnd);
        let validItems = config.items;
        // Filter items roughly near player level (+/- 5 levels)
        if (currentRealm) { 
            const filtered = config.items.filter(i => Math.abs(i.reqLevel - player.level) <= 5); 
            if (filtered.length > 0) validItems = filtered; 
        }
        
        // Fallback
        if (validItems.length === 0) validItems = [{ id: 'dummy', name: '石头', type: 'MATERIAL', icon: '🪨', description: '普通的石头', rarity: 'common', reqLevel: 1, price: 1 }];
        
        const count = 4 + Math.floor(Math.random() * 5);
        const shopInventory: Item[] = [];
        for(let i=0; i<count; i++) {
            const item = validItems[Math.floor(Math.random() * validItems.length)];
            if(item) shopInventory.push({ ...item, id: `${item.id}_shop_${i}_${Date.now()}` });
        }
        setInteraction({ type: 'MERCHANT', node, inventory: shopInventory });
        setMerchantTab('BUY');
    }
    else { 
        setInteraction({ type: 'EMPTY', node }); 
    }
  };

  const handleInteractionConfirm = () => {
      if (!interaction || !player) return;
      const { node, type } = interaction;
      
      // Mark visited and move
      const newNodes = mapNodes.map(n => n.id === node.id ? { ...n, visited: true } : n);
      setMapNodes(newNodes);
      setCurrentNode(node.id);
      
      if (type === 'COMBAT' && 'enemy' in interaction) { 
          setActiveEnemy(interaction.enemy); 
          setView(GameView.COMBAT); 
      }
      else if (type === 'REWARD' && 'reward' in interaction) {
          const reward = interaction.reward;
          setPlayer(prev => {
                if (!prev) return null;
                if (reward.type === 'ITEM') { return { ...prev, inventory: [...prev.inventory, reward.value as Item] }; } 
                else { return { ...prev, gold: prev.gold + (reward.value as number) }; }
          });
      }
      setInteraction(null);
  };

  const handleBuyItem = (item: Item) => {
      if (!player) return;
      if (player.gold < item.price) { alert("灵石不足！"); return; }
      
      const boughtItem = { ...item, id: `bought_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
      
      setPlayer(prev => prev ? ({ ...prev, gold: prev.gold - item.price, inventory: [...prev.inventory, boughtItem] }) : null);
      
      // Remove from merchant stock
      if (interaction?.type === 'MERCHANT') {
          setInteraction(prev => prev?.type === 'MERCHANT' ? { ...prev, inventory: prev.inventory.filter(i => i.id !== item.id) } : prev);
      }
  };

  const handleSellItem = (item: Item) => {
      if (!player) return;
      setPlayer(prev => prev ? ({ ...prev, gold: prev.gold + Math.floor(item.price * 0.5), inventory: prev.inventory.filter(i => i.id !== item.id) }) : null);
  };

  const handleCombatWin = (rewards: { exp: number, gold: number, drops: Item[] }) => {
    setPlayer(prev => {
        if (!prev) return null;
        let updatedPlayer = { ...prev };
        updatedPlayer.exp += rewards.exp;
        updatedPlayer.gold += rewards.gold;
        if (rewards.drops.length > 0) updatedPlayer.inventory = [...updatedPlayer.inventory, ...rewards.drops];
        return updatedPlayer;
    });
    const isBoss = activeEnemy?.name.includes('领主') || (activeEnemy?.difficulty || 0) > 100; // Simplified boss check
    const isLastNode = currentNode !== null && currentNode === mapNodes.length - 1;
    
    // Boss defeat or last node logic
    if (currentNode !== null && mapNodes[currentNode].type === NodeType.BOSS) {
         setView(GameView.HOME); 
    } else {
         setView(GameView.ADVENTURE);
    }
    setActiveEnemy(null);
  };

  const handleCombatLose = () => {
    setPlayer(prev => prev ? ({ ...prev, stats: { ...prev.stats, hp: Math.floor(prev.stats.maxHp * 0.1) } }) : null);
    setView(GameView.HOME);
    setActiveEnemy(null);
  };

  const handleBreakthrough = () => {
      if (!player) return;
      const currentRealm = config.realms.find(r => player.level >= r.rangeStart && player.level <= r.rangeEnd);
      if (!currentRealm) return;
      
      // 0-indexed level in levels array
      const levelIndex = player.level - currentRealm.rangeStart;
      const levelConfig = currentRealm.levels[levelIndex];
      
      if (!levelConfig) return;
      const cost = levelConfig.breakthroughCost;
      
      if (player.gold < cost) { alert(`灵石不足！需要 ${cost}`); return; }
      
      setPlayer(prev => prev ? ({ ...prev, gold: prev.gold - cost }) : null);

      if (Math.random() <= levelConfig.breakthroughChance) {
          const newLevel = player.level + 1;
          const nextRealm = config.realms.find(r => newLevel >= r.rangeStart && newLevel <= r.rangeEnd) || currentRealm;
          const nextLevelIndex = newLevel - nextRealm.rangeStart;
          const nextLevelConfig = nextRealm.levels[nextLevelIndex];
          
          const hpGain = nextLevelConfig ? nextLevelConfig.hpGrowth : 0;
          const atkGain = nextLevelConfig ? nextLevelConfig.atkGrowth : 0;
          
          setBreakthroughResult({ success: true, message: '突破成功！', statsGained: `HP+${hpGain}, 攻+${atkGain}, 防+${nextLevelConfig?.defGrowth||0}` });
          setPlayer(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  level: newLevel,
                  exp: Math.max(0, prev.exp - prev.maxExp),
                  maxExp: nextLevelConfig ? nextLevelConfig.expReq : prev.maxExp * 2,
                  stats: {
                      ...prev.stats,
                      maxHp: prev.stats.maxHp + hpGain,
                      hp: prev.stats.maxHp + hpGain, 
                      attack: prev.stats.attack + atkGain,
                      defense: prev.stats.defense + (nextLevelConfig?.defGrowth||0),
                      maxSpirit: prev.stats.maxSpirit + (nextLevelConfig?.spiritGrowth||0),
                      spirit: prev.stats.maxSpirit + (nextLevelConfig?.spiritGrowth||0),
                      speed: prev.stats.speed + (nextLevelConfig?.speedGrowth||0),
                  }
              };
          });
      } else {
          setBreakthroughResult({ success: false, message: '突破失败...' });
      }
  };

  const handleRefine = (recipeId: string, materials: {itemId: string, count: number}[]) => {
      if (!player) return;
      const recipe = config.items.find(i => i.id === recipeId);
      if (!recipe) return;
      
      let newInventory = [...player.inventory];
      for (const mat of materials) {
          for(let c=0; c<mat.count; c++) {
             // Find matching item in inventory (handling unique IDs)
             const idx = newInventory.findIndex(i => i.id === mat.itemId || i.id.startsWith(mat.itemId) || i.name === config.items.find(ci => ci.id === mat.itemId)?.name);
             if (idx > -1) newInventory.splice(idx, 1);
          }
      }
      
      setPlayer(prev => prev ? ({...prev, inventory: newInventory}) : null);
      setIsRefining(true);
      
      setTimeout(() => {
          setIsRefining(false);
          if (Math.random() <= (recipe.successRate || 0.5)) {
              const pillItem = config.items.find(i => i.id === recipe.recipeResult);
              if (pillItem) {
                  const newPill = { ...pillItem, id: `refined_${Date.now()}_${pillItem.id}` };
                  setPlayer(prev => prev ? ({...prev, inventory: [...prev.inventory, newPill]}) : null);
                  setRefineResult({ success: true, item: newPill });
              } else setRefineResult({ success: false });
          } else setRefineResult({ success: false });
      }, 3000); 
  };

  const handleCraftArtifact = (blueprintId: string, materials: {itemId: string, count: number}[]) => {
      if (!player) return;
      const blueprint = config.items.find(i => i.id === blueprintId);
      if (!blueprint) return;

      let newInventory = [...player.inventory];
      for (const mat of materials) {
          for(let c=0; c<mat.count; c++) {
             const idx = newInventory.findIndex(i => i.id === mat.itemId || i.id.startsWith(mat.itemId) || i.name === config.items.find(ci => ci.id === mat.itemId)?.name);
             if (idx > -1) newInventory.splice(idx, 1);
          }
      }

      setPlayer(prev => prev ? ({...prev, inventory: newInventory}) : null);
      setIsRefining(true); // Reuse refining state for animation

      setTimeout(() => {
          setIsRefining(false);
          if (Math.random() <= (blueprint.successRate || 0.5)) {
              const artifactItem = config.items.find(i => i.id === blueprint.recipeResult);
              if (artifactItem) {
                  const newArt = { ...artifactItem, id: `crafted_${Date.now()}_${artifactItem.id}` };
                  setPlayer(prev => prev ? ({...prev, inventory: [...prev.inventory, newArt]}) : null);
                  setRefineResult({ success: true, item: newArt });
              } else setRefineResult({ success: false });
          } else setRefineResult({ success: false });
      }, 3000);
  };

  const handleCraftTalisman = (cardId: string, penId: string, paperId: string) => {
      if (!player) return;
      const card = player.deck.find(c => c.id === cardId);
      const pen = player.inventory.find(i => i.id === penId);
      const paper = player.inventory.find(i => i.id === paperId);

      if (!card || !pen || !paper) { alert("材料丢失"); return; }
      if ((pen.durability || 0) <= 0) { alert("符笔已损坏"); return; }

      const realmRank = Math.ceil(card.reqLevel / 10); // Simple scaling: 1-10 -> 1, 11-20 -> 2
      const talismanDurability = 1 + realmRank;

      const newTalisman: Item = {
          id: `talisman_${card.id}_${Date.now()}`,
          name: `${card.name}符`,
          type: 'TALISMAN',
          icon: '📜',
          description: `封印了【${card.name}】的符箓。效果与原卡牌一致，使用不消耗灵力。`,
          rarity: card.rarity,
          reqLevel: card.reqLevel,
          price: 100,
          talismanCardId: card.id,
          maxDurability: talismanDurability,
          durability: talismanDurability,
          statBonus: { elementalAffinities: createZeroElementStats() }
      };

      setPlayer(prev => {
          if(!prev) return null;
          // Consume Pen Durability
          const updatedPen = { ...pen, durability: (pen.durability || 1) - 1 };
          
          let newInventory = prev.inventory.filter(i => i.id !== paperId && i.id !== penId); // Remove paper and old pen
          if (updatedPen.durability! > 0) {
              newInventory.push(updatedPen);
          }

          const cardIdx = prev.deck.findIndex(c => c.id === cardId);
          const newDeck = [...prev.deck];
          if (cardIdx > -1) newDeck.splice(cardIdx, 1);

          newInventory.push(newTalisman);

          return { ...prev, inventory: newInventory, deck: newDeck };
      });
      alert(`制作成功！获得了 ${newTalisman.name}`);
  };

  const handleUseItem = (item: Item) => {
      if (!player) return;
      
      if (item.type === 'RECIPE') {
          if (player.learnedRecipes.includes(item.id)) { alert("已掌握"); return; }
          setPlayer(prev => prev ? ({ ...prev, inventory: prev.inventory.filter(i => i.id !== item.id), learnedRecipes: [...prev.learnedRecipes, item.id] }) : null);
          alert(`掌握丹方：[${item.name}]`); return;
      }

      if (item.type === 'FORGE_BLUEPRINT') {
          if (player.learnedBlueprints.includes(item.id)) { alert("已掌握"); return; }
          setPlayer(prev => prev ? ({ ...prev, inventory: prev.inventory.filter(i => i.id !== item.id), learnedBlueprints: [...prev.learnedBlueprints, item.id] }) : null);
          alert(`掌握炼器图纸：[${item.name}]`); return;
      }
      
      if (item.type === 'PILL') {
          const pillRealm = config.realms.find(r => item.reqLevel >= r.rangeStart && item.reqLevel <= r.rangeEnd);
          const playerRealm = config.realms.find(r => player.level >= r.rangeStart && player.level <= r.rangeEnd);
          if (pillRealm && playerRealm && playerRealm.rangeStart < pillRealm.rangeStart) { alert("境界不足，无法承受药力！"); return; }
          
          const configItem = config.items.find(i => item.name === i.name && i.type === 'PILL');
          const baseId = configItem?.id || item.id;
          const usedCount = player.pillUsage[baseId] || 0;
          
          if (usedCount >= (item.maxUsage || 1)) { alert("该丹药耐药性已达上限，无法继续服用！"); return; }
          
          setPlayer(prev => {
              if(!prev) return null;
              const newStats = { ...prev.stats };
              if (item.statBonus?.attack) newStats.attack += item.statBonus.attack;
              if (item.statBonus?.defense) newStats.defense += item.statBonus.defense;
              if (item.statBonus?.speed) newStats.speed += item.statBonus.speed;
              if (item.statBonus?.maxSpirit) { newStats.maxSpirit += item.statBonus.maxSpirit; newStats.spirit += item.statBonus.maxSpirit; }
              if (item.statBonus?.maxHp) { newStats.maxHp += item.statBonus.maxHp; newStats.hp += item.statBonus.maxHp; }
              if (item.statBonus?.elementalAffinities) {
                   Object.entries(item.statBonus.elementalAffinities).forEach(([k,v]) => {
                       // @ts-ignore
                       newStats.elementalAffinities[k] = (newStats.elementalAffinities[k] || 0) + (v as number);
                   });
              }
              
              const newUsage = { ...prev.pillUsage };
              newUsage[baseId] = usedCount + 1;
              return { ...prev, stats: newStats, inventory: prev.inventory.filter(i => i.id !== item.id), pillUsage: newUsage }
          });
          alert("服用成功，属性提升！"); return;
      }
      
      // Skill Book
      if (item.id.startsWith('book') || item.name.includes('心法')) {
          const realm = config.realms.find(r => item.reqLevel >= r.rangeStart && item.reqLevel <= r.rangeEnd);
          const elements = Object.values(ElementType);
          const matchedElement = elements.find(e => item.name.includes(e));
          const elem = matchedElement || ElementType.SWORD; // Default
          
          const validCards = config.cards.filter(c => c.element === elem && Math.abs(c.reqLevel - item.reqLevel) <= 5);
          
          if (validCards.length > 0) {
              const newCard = validCards[Math.floor(Math.random() * validCards.length)];
              // Modified: Add to storage by default, not deck
              setAcquiredCard(newCard); // Show modal, modal handler will add to storage
              setPlayer(prev => prev ? ({ ...prev, inventory: prev.inventory.filter(i => i.id !== item.id) }) : null);
          } else {
               alert("领悟失败，没有领悟到新的招式。");
               setPlayer(prev => prev ? ({ ...prev, inventory: prev.inventory.filter(i => i.id !== item.id) }) : null);
          }
      }
  };

  const calculateStatsDelta = (currentStats: any, newItem: Item, oldItem: Item | null) => {
      const stats = { ...currentStats };
      const add = (i: Item | null, factor: number) => {
          if (!i || !i.statBonus) return;
          if (i.statBonus.attack) stats.attack += i.statBonus.attack * factor;
          if (i.statBonus.defense) stats.defense += i.statBonus.defense * factor;
          if (i.statBonus.maxHp) { stats.maxHp += i.statBonus.maxHp * factor; stats.hp += i.statBonus.maxHp * factor; }
          if (i.statBonus.maxSpirit) { stats.maxSpirit += i.statBonus.maxSpirit * factor; stats.spirit += i.statBonus.maxSpirit * factor; }
          if (i.statBonus.speed) stats.speed += i.statBonus.speed * factor;
          if (i.statBonus.elementalAffinities) {
               Object.entries(i.statBonus.elementalAffinities).forEach(([k,v]) => {
                   // @ts-ignore
                   stats.elementalAffinities[k] = (stats.elementalAffinities[k] || 0) + (v as number) * factor;
               });
          }
      };
      add(oldItem, -1); 
      add(newItem, 1);
      return stats;
  };

  const calculateStatChanges = (newItem: Item, oldItem: Item | null) => {
      const changes: string[] = [];
      const getVal = (i: Item | null, key: keyof Stats) => i?.statBonus?.[key] || 0;
      
      const diffMap: {key: keyof Stats, label: string}[] = [
          { key: 'attack', label: '攻击' },
          { key: 'defense', label: '防御' },
          { key: 'maxHp', label: '生命上限' },
          { key: 'maxSpirit', label: '神识上限' },
          { key: 'speed', label: '速度' }
      ];

      diffMap.forEach(({key, label}) => {
          // @ts-ignore
          const diff = (newItem.statBonus?.[key] || 0) - (oldItem?.statBonus?.[key] || 0);
          if (diff !== 0) changes.push(`${label}: ${diff > 0 ? '+' : ''}${diff}`);
      });
      
      // Handle Elemental Affinities separately if needed, but for prompt "1 line per attribute" basic stats are key.
      // If we want detailed elements:
      // @ts-ignore
      const allElems = new Set([...Object.keys(newItem.statBonus?.elementalAffinities || {}), ...Object.keys(oldItem?.statBonus?.elementalAffinities || {})]);
      allElems.forEach(elem => {
          // @ts-ignore
          const diff = (newItem.statBonus?.elementalAffinities?.[elem] || 0) - (oldItem?.statBonus?.elementalAffinities?.[elem] || 0);
           if (diff !== 0) changes.push(`${elem}亲和: ${diff > 0 ? '+' : ''}${diff}`);
      });

      return changes;
  };

  const handleEquip = (item: Item) => {
      if (!player) return;
      
      if (player.level < (item.reqLevel || 1)) {
          alert(`境界不足！(需: ${getRealmName(item.reqLevel || 1, config.realms)})`);
          return;
      }

      // --- ARTIFACT LOGIC ---
      if (item.type === 'ARTIFACT') {
          let slotIndex = -1;
          for (let i = 0; i < player.unlockedArtifactCount; i++) {
              if (player.artifacts[i] === null) {
                  slotIndex = i;
                  break;
              }
          }
          if (slotIndex === -1) slotIndex = 0; // Swap first if full

          const existingItem = player.artifacts[slotIndex];
          
          // Show stat changes
          const changes = calculateStatChanges(item, existingItem);

          let newInventory = player.inventory.filter(i => i.id !== item.id);
          if (existingItem) newInventory.push(existingItem);

          setPlayer(prev => {
              if (!prev) return null;
              const newStats = calculateStatsDelta(prev.stats, item, existingItem);
              const newArtifacts = [...prev.artifacts];
              newArtifacts[slotIndex] = item;

              return {
                  ...prev,
                  stats: newStats,
                  artifacts: newArtifacts,
                  inventory: newInventory
              };
          });
          
          if (changes.length > 0) alert(`祭炼成功！\n${changes.join('\n')}`);
          return;
      }

      if (item.type !== 'EQUIPMENT') { alert("无法装备"); return; }
      if (!item.slot) { alert("位置未知"); return; }

      const existingItem = player.equipment[item.slot];
      const changes = calculateStatChanges(item, existingItem);

      let newInventory = player.inventory.filter(i => i.id !== item.id);
      if (existingItem) newInventory.push(existingItem);

      setPlayer(prev => {
          if (!prev) return null;
          const newStats = calculateStatsDelta(prev.stats, item, existingItem);
          return {
            ...prev,
            stats: newStats,
            equipment: { ...prev.equipment, [item.slot!]: item },
            inventory: newInventory
          };
      });

      if (changes.length > 0) alert(`装备成功！\n${changes.join('\n')}`);
  };

  const handleUnequipArtifact = (index: number) => {
      if (!player) return;
      const item = player.artifacts[index];
      if (!item) return;
      
      // Calculate negative changes
      const changes: string[] = [];
      const getVal = (i: Item | null, key: keyof Stats) => i?.statBonus?.[key] || 0;
       
      const diffMap: {key: keyof Stats, label: string}[] = [
          { key: 'attack', label: '攻击' },
          { key: 'defense', label: '防御' },
          { key: 'maxHp', label: '生命上限' },
          { key: 'maxSpirit', label: '神识上限' },
          { key: 'speed', label: '速度' }
      ];
      diffMap.forEach(({key, label}) => {
          // @ts-ignore
          const diff = -(item.statBonus?.[key] || 0);
          if (diff !== 0) changes.push(`${label}: ${diff}`);
      });
      // @ts-ignore
      if (item.statBonus?.elementalAffinities) {
          Object.entries(item.statBonus.elementalAffinities).forEach(([k,v]) => {
              const val = -(v as number);
              if (val !== 0) changes.push(`${k}亲和: ${val}`);
          });
      }

      setPlayer(prev => {
          if (!prev) return null;
          const newStats = calculateStatsDelta(prev.stats, { ...item, statBonus: {} } as Item, item); 
          const newArtifacts = [...prev.artifacts];
          newArtifacts[index] = null;
          return {
              ...prev,
              stats: newStats,
              artifacts: newArtifacts,
              inventory: [...prev.inventory, item]
          };
      });
      
      if(changes.length > 0) alert(`法宝已卸下。\n${changes.join('\n')}`);
  };

  const handleUnlockArtifactSlot = (index: number) => {
      if (!player) return;
      const slotConfig = config.artifactSlotConfigs.find(c => c.id === index);
      if (!slotConfig) return;

      if (player.level < slotConfig.reqLevel) {
          alert(`境界不足！需要达到 ${getRealmName(slotConfig.reqLevel, config.realms)}`);
          return;
      }
      if (player.gold < slotConfig.cost) {
          alert(`灵石不足！需要 ${slotConfig.cost} 灵石`);
          return;
      }

      setPlayer(prev => {
          if (!prev) return null;
          return {
              ...prev,
              gold: prev.gold - slotConfig.cost,
              unlockedArtifactCount: prev.unlockedArtifactCount + 1
          };
      });
  };

  const handleManageDeck = (action: 'TO_STORAGE' | 'TO_DECK', index: number) => {
      if (!player) return;
      
      setPlayer(prev => {
          if (!prev) return null;
          const newDeck = [...prev.deck];
          const newStorage = [...prev.cardStorage];

          if (action === 'TO_STORAGE') {
              if (newDeck.length <= 24) {
                  alert("卡组卡牌数量不能少于24张！");
                  return prev;
              }
              const card = newDeck.splice(index, 1)[0];
              newStorage.push(card);
          } else {
              const card = newStorage.splice(index, 1)[0];
              newDeck.push(card);
          }
          return { ...prev, deck: newDeck, cardStorage: newStorage };
      });
  };

  const handleAcceptAcquiredCard = () => {
      if (!player || !acquiredCard) return;
      setPlayer(prev => {
          if (!prev) return null;
          return { ...prev, cardStorage: [...prev.cardStorage, acquiredCard] };
      });
      setAcquiredCard(null);
  };

  return (
    <div className="h-full w-full font-sans selection:bg-emerald-500 selection:text-white">
      {view === GameView.START && (
        <StartScreen 
            onStart={handleStartGame} 
            onConfig={() => setView(GameView.CONFIG)} 
        />
      )}

      {view === GameView.CONFIG && (
        <ConfigScreen 
            config={config} 
            onSave={(c) => { setConfig(c); setView(GameView.START); }} 
            onCancel={() => setView(GameView.START)} 
        />
      )}

      {view === GameView.HOME && player && (
        <HomeView 
          player={player} 
          realms={config.realms}
          maps={config.maps}
          itemsConfig={config.items}
          onStartAdventure={handleSelectMap}
          onEquipItem={handleEquip}
          onUseItem={handleUseItem}
          onEndGame={() => { setPlayer(null); setView(GameView.START); }}
          onBreakthrough={handleBreakthrough}
          onRefine={handleRefine}
          onCraft={handleCraftArtifact}
          onCraftTalisman={handleCraftTalisman}
          onManageDeck={handleManageDeck}
          isRefining={isRefining}
          artifactConfigs={config.artifactSlotConfigs}
          onUnlockArtifactSlot={handleUnlockArtifactSlot}
          onUnequipArtifact={handleUnequipArtifact}
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
            cardsConfig={config.cards} // Pass config to resolve talisman IDs
        />
      )}

      {/* --- Global Interaction Modal (Events / Merchant) --- */}
      {interaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
              <div className="bg-slate-900 border-2 border-emerald-600 rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
                  
                  {interaction.type === 'EMPTY' && (
                      <div className="text-center py-8">
                          <div className="text-6xl mb-4">🍃</div>
                          <h3 className="text-2xl font-bold text-slate-300">空无一物</h3>
                          <p className="text-slate-500 mt-2">这里什么都没有，继续前进吧。</p>
                      </div>
                  )}

                  {interaction.type === 'COMBAT' && (
                      <div className="text-center">
                          <h3 className="text-2xl font-bold text-red-500 mb-4">遭遇强敌!</h3>
                          <div className="flex justify-center mb-6">
                              <div className="relative">
                                  <img src={interaction.enemy.avatarUrl} className="w-32 h-32 rounded-full border-4 border-red-800" />
                                  <div className="absolute -bottom-3 bg-red-900 px-3 py-1 rounded text-white font-bold text-sm border border-red-500 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                      {interaction.enemy.name} (Lv.{interaction.enemy.level})
                                  </div>
                              </div>
                          </div>
                          <p className="text-slate-400 mb-6">你感知到前方有一股危险的气息，是否迎战？</p>
                      </div>
                  )}

                  {interaction.type === 'REWARD' && (
                      <div className="text-center">
                          <h3 className="text-2xl font-bold text-yellow-400 mb-4">获得机缘</h3>
                          <div className="text-6xl mb-4 animate-bounce-slight">
                              {interaction.reward.type === 'GOLD' ? '💰' : '🎁'}
                          </div>
                          <p className="text-white text-lg font-bold mb-2">{interaction.reward.message}</p>
                          <div className="bg-slate-800 p-3 rounded text-emerald-300 border border-slate-700 inline-block px-8">
                              {interaction.reward.type === 'GOLD' ? `${interaction.reward.value} 灵石` : (interaction.reward.value as Item).name}
                          </div>
                      </div>
                  )}

                  {interaction.type === 'MERCHANT' && (
                      <div className="h-[60vh] flex flex-col">
                          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                              <h3 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                                  <span>⚖️</span> 云游商人
                              </h3>
                              <div className="flex gap-2">
                                  <Button size="sm" variant={merchantTab === 'BUY' ? 'primary' : 'secondary'} onClick={() => setMerchantTab('BUY')}>购买</Button>
                                  <Button size="sm" variant={merchantTab === 'SELL' ? 'primary' : 'secondary'} onClick={() => setMerchantTab('SELL')}>出售</Button>
                              </div>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                              {merchantTab === 'BUY' ? (
                                  <div className="grid grid-cols-2 gap-3">
                                      {interaction.inventory.map(item => (
                                          <div key={item.id} className="bg-slate-800 p-3 rounded border border-slate-700 flex flex-col gap-2">
                                              <div className="flex gap-2">
                                                  <div className="text-2xl">{item.icon}</div>
                                                  <div className="min-w-0">
                                                      <div className="font-bold text-sm truncate text-white">{item.name}</div>
                                                      <div className="text-xs text-yellow-400">💰 {item.price}</div>
                                                  </div>
                                              </div>
                                              <Button size="sm" onClick={() => handleBuyItem(item)} disabled={(player?.gold || 0) < item.price}>
                                                  购买
                                              </Button>
                                          </div>
                                      ))}
                                      {interaction.inventory.length === 0 && <div className="col-span-2 text-center text-slate-500 py-10">商品已售空</div>}
                                  </div>
                              ) : (
                                  <div className="grid grid-cols-2 gap-3">
                                      {player?.inventory.map(item => (
                                          <div key={item.id} className="bg-slate-800 p-3 rounded border border-slate-700 flex flex-col gap-2">
                                              <div className="flex gap-2">
                                                  <div className="text-2xl">{item.icon}</div>
                                                  <div className="min-w-0">
                                                      <div className="font-bold text-sm truncate text-white">{item.name}</div>
                                                      <div className="text-xs text-yellow-400">回收价: {Math.floor(item.price * 0.5)}</div>
                                                  </div>
                                              </div>
                                              <Button size="sm" variant="outline" onClick={() => handleSellItem(item)}>
                                                  出售
                                              </Button>
                                          </div>
                                      ))}
                                      {player?.inventory.length === 0 && <div className="col-span-2 text-center text-slate-500 py-10">背包为空</div>}
                                  </div>
                              )}
                          </div>
                          
                          <div className="mt-4 pt-2 border-t border-slate-700 flex justify-between items-center text-yellow-400 font-bold">
                              <span>持有灵石: {player?.gold}</span>
                          </div>
                      </div>
                  )}

                  <div className="mt-6 flex justify-end gap-4">
                      {interaction.type === 'COMBAT' && (
                          <Button variant="secondary" onClick={() => setInteraction(null)}>绕道而行</Button>
                      )}
                      <Button variant="primary" onClick={handleInteractionConfirm} className="w-full">
                          {interaction.type === 'COMBAT' ? '开始战斗' : interaction.type === 'MERCHANT' ? '离开' : '确定'}
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* --- Acquired Card Modal --- */}
      {acquiredCard && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur animate-fade-in">
              <div className="flex flex-col items-center gap-16 p-8 animate-bounce-slight">
                  <h2 className="text-4xl font-bold text-yellow-300 drop-shadow-[0_0_10px_orange]">✨ 领悟新功法 ✨</h2>
                  <div className="transform scale-150 my-4">
                      <CardItem card={acquiredCard} isPlayable={false} />
                  </div>
                  <div className="text-slate-400 text-sm">已放入卡牌仓库</div>
                  <Button size="lg" onClick={handleAcceptAcquiredCard} className="px-12 text-xl">
                      收下
                  </Button>
              </div>
          </div>
      )}

      {/* --- Breakthrough Result Modal --- */}
      {breakthroughResult && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur animate-fade-in">
              <div className={`bg-slate-900 p-8 rounded-2xl border-2 ${breakthroughResult.success ? 'border-amber-500' : 'border-red-500'} max-w-md text-center shadow-2xl`}>
                  <div className="text-6xl mb-4">{breakthroughResult.success ? '⚡' : '💥'}</div>
                  <h3 className={`text-3xl font-bold mb-4 ${breakthroughResult.success ? 'text-amber-400' : 'text-red-400'}`}>
                      {breakthroughResult.message}
                  </h3>
                  {breakthroughResult.success && (
                      <div className="bg-slate-800 p-4 rounded text-emerald-300 font-mono mb-6">
                          {breakthroughResult.statsGained}
                      </div>
                  )}
                  <Button size="lg" onClick={() => setBreakthroughResult(null)} className="w-full">
                      确定
                  </Button>
              </div>
          </div>
      )}
      
      {/* --- Alchemy/Forge Refine Result Modal --- */}
      {refineResult && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur animate-fade-in">
              <div className="bg-slate-900 p-8 rounded-2xl border-2 border-emerald-500 max-w-md text-center shadow-2xl flex flex-col items-center">
                  {refineResult.success ? (
                      <>
                        <h3 className="text-3xl font-bold text-emerald-400 mb-6">炼制成功!</h3>
                        <div className="text-6xl mb-4 animate-bounce-slight">{refineResult.item?.icon}</div>
                        <div className="text-xl font-bold text-white mb-2">{refineResult.item?.name}</div>
                        <div className="text-slate-400 text-sm mb-8">{refineResult.item?.description}</div>
                      </>
                  ) : (
                      <>
                        <h3 className="text-3xl font-bold text-red-500 mb-6">炼制失败...</h3>
                        <div className="text-6xl mb-4 grayscale opacity-50">🔥</div>
                        <p className="text-slate-400 mb-8">火候未到，材料化为了一滩废渣。</p>
                      </>
                  )}
                  <Button size="lg" onClick={() => setRefineResult(null)} className="w-full">确定</Button>
              </div>
           </div>
      )}

    </div>
  );
}
