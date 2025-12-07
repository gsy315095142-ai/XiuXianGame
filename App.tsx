

import React, { useState, useEffect } from 'react';
import { GameView, Player, GameConfig, GameMap, MapNode, Enemy, Item, NodeType, Stats, Card, CardType, ElementType, RealmLevelConfig } from './types';
import { DEFAULT_GAME_CONFIG, generatePlayerFromConfig, getRandomEnemyFromConfig, createZeroElementStats, getRealmName, ELEMENT_CONFIG } from './constants';
import { StartScreen } from './components/StartScreen';
import { HomeView } from './components/HomeView';
import { AdventureView } from './components/AdventureView';
import { CombatView } from './components/CombatView';
import { ConfigScreen } from './components/ConfigScreen';

const App: React.FC = () => {
  const [view, setView] = useState<GameView>(GameView.START);
  const [config, setConfig] = useState<GameConfig>(DEFAULT_GAME_CONFIG);
  const [player, setPlayer] = useState<Player | null>(null);
  
  // Adventure State
  const [currentMap, setCurrentMap] = useState<GameMap | null>(null);
  const [mapNodes, setMapNodes] = useState<MapNode[]>([]);
  const [currentLocationId, setCurrentLocationId] = useState<number | null>(null);
  
  // Combat State
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null);

  // Crafting State
  const [isRefining, setIsRefining] = useState(false);

  // UI State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [readingItem, setReadingItem] = useState<Item | null>(null);

  // Acquired Card Modal State
  const [acquiredCard, setAcquiredCard] = useState<Card | null>(null);

  // Interaction Modal State (Adventure)
  const [interaction, setInteraction] = useState<{
      type: 'COMBAT_PREVIEW' | 'REWARD' | 'MERCHANT' | 'EMPTY';
      nodeId: number;
      data?: any; // Enemy for combat, Item/Gold for reward, etc.
  } | null>(null);
  
  // Breakthrough Modal State
  const [breakthroughResult, setBreakthroughResult] = useState<{success: boolean, msg: string} | null>(null);

  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStartGame = () => {
    const newPlayer = generatePlayerFromConfig(config);
    setPlayer(newPlayer);
    setView(GameView.HOME);
  };

  const handleStartAdventure = (map: GameMap) => {
    setCurrentMap(map);
    
    // Generate Nodes
    const nodes: MapNode[] = [];
    const weights = map.eventWeights;
    
    for (let i = 0; i < map.nodeCount; i++) {
        const rand = Math.random();
        let type = NodeType.EMPTY;
        
        if (i === map.nodeCount - 1) {
            type = NodeType.BOSS;
        } else {
            let runningSum = 0;
            if (rand < (runningSum += weights.merchant)) type = NodeType.MERCHANT;
            else if (rand < (runningSum += weights.treasure)) type = NodeType.TREASURE;
            else if (rand < (runningSum += weights.battle)) type = NodeType.BATTLE;
            else type = NodeType.EMPTY;
        }

        nodes.push({
            id: i,
            type: type,
            visited: false,
            x: 0, 
            y: 0
        });
    }
    
    setMapNodes(nodes);
    setCurrentLocationId(null);
    setView(GameView.ADVENTURE);
  };

  const handleNodeClick = (node: MapNode) => {
      // Logic split: Preview vs Action
      
      // If visited, maybe just show info or nothing (Merchant might be re-visitable?)
      // For now, allow re-visiting Merchant, prevent others
      if (node.visited && node.type !== NodeType.MERCHANT) {
          return; 
      }

      let interactionType: 'COMBAT_PREVIEW' | 'REWARD' | 'MERCHANT' | 'EMPTY' = 'EMPTY';
      let interactionData: any = null;

      if (node.type === NodeType.BATTLE || node.type === NodeType.BOSS) {
          if (player) {
              const enemy = getRandomEnemyFromConfig(player.level + (node.type === NodeType.BOSS ? 2 : 0), config);
              interactionType = 'COMBAT_PREVIEW';
              interactionData = enemy;
          }
      } else if (node.type === NodeType.TREASURE) {
          if (player && !node.visited) {
              interactionType = 'REWARD';
              
              // Determine Reward
              const realm = config.realms.find(r => player.level >= r.rangeStart && player.level <= r.rangeEnd) || config.realms[0];
              const minGold = realm.minGoldDrop || 10;
              const maxGold = realm.maxGoldDrop || 50;
              const goldFound = Math.floor(Math.random() * (maxGold - minGold + 1)) + minGold;
              
              // 30% chance for item (increased slightly)
              let drops: Item[] = [];
              if (Math.random() < 0.3 && config.items.length > 0) {
                  // Filter items close to player level
                  const possibleItems = config.items.filter(i => Math.abs(i.reqLevel - player.level) <= 5);
                  if (possibleItems.length > 0) {
                      drops.push(possibleItems[Math.floor(Math.random() * possibleItems.length)]);
                  }
              }
              
              interactionData = { gold: goldFound, drops: drops };
          }
      } else if (node.type === NodeType.MERCHANT) {
          interactionType = 'MERCHANT';
          // Generate Merchant Inventory (Random 6 items)
          const merchantItems: Item[] = [];
          const pool = config.items.filter(i => Math.abs(i.reqLevel - player.level) <= 5);
          for(let k=0; k<6; k++) {
              if (pool.length > 0) {
                  merchantItems.push(pool[Math.floor(Math.random() * pool.length)]);
              }
          }
          interactionData = { items: merchantItems };
      } else {
          interactionType = 'EMPTY';
      }

      setInteraction({
          type: interactionType,
          nodeId: node.id,
          data: interactionData
      });
  };

  const handleInteractionConfirm = () => {
      if (!interaction || !player) return;

      const { type, nodeId, data } = interaction;
      
      // Mark visited
      const newNodes = [...mapNodes];
      newNodes[nodeId].visited = true;
      setMapNodes(newNodes);
      setCurrentLocationId(nodeId);

      if (type === 'COMBAT_PREVIEW') {
          setCurrentEnemy(data);
          setView(GameView.COMBAT);
          setInteraction(null);
      } else if (type === 'REWARD') {
          // Apply rewards
          const { gold, drops } = data;
          setPlayer({
              ...player,
              gold: player.gold + gold,
              inventory: [...player.inventory, ...drops]
          });
          setInteraction(null); // Close modal
      } else if (type === 'EMPTY') {
          setInteraction(null);
      }
      // Merchant stays open until closed manually
  };
  
  const handleMerchantClose = () => {
      if (interaction && interaction.type === 'MERCHANT') {
          // Update location and visited status on close
          const newNodes = [...mapNodes];
          if (newNodes[interaction.nodeId]) {
             newNodes[interaction.nodeId].visited = true;
          }
          setMapNodes(newNodes);
          setCurrentLocationId(interaction.nodeId);
      }
      setInteraction(null);
  };
  
  const handleMerchantAction = (action: 'BUY' | 'SELL', item: Item) => {
      if (!player) return;
      
      if (action === 'BUY') {
          if (player.gold >= item.price) {
              setPlayer({
                  ...player,
                  gold: player.gold - item.price,
                  inventory: [...player.inventory, item]
              });
              showToast(`购买了 ${item.name}`);
          } else {
              alert("灵石不足！");
          }
      } else if (action === 'SELL') {
          // Sell for 50% price
          const sellPrice = Math.floor(item.price * 0.5);
          const idx = player.inventory.indexOf(item);
          if (idx > -1) {
              const newInv = [...player.inventory];
              newInv.splice(idx, 1);
              setPlayer({
                  ...player,
                  gold: player.gold + sellPrice,
                  inventory: newInv
              });
              showToast(`出售了 ${item.name}，获得 ${sellPrice} 灵石`);
          }
      }
  };

  const handleRetreat = () => {
      setView(GameView.HOME);
      setCurrentMap(null);
      setInteraction(null);
  };

  const handleCombatWin = (rewards: { exp: number, gold: number, drops: Item[] }, updatedTalismans?: Item[], updatedArtifacts?: (Item | null)[]) => {
      if (!player) return;
      
      let newExp = player.exp + rewards.exp;
      const newGold = player.gold + rewards.gold;
      const newInventory = [...player.inventory, ...rewards.drops];
      
      let newTalismanDeck = player.talismansInDeck;
      if (updatedTalismans) {
          newTalismanDeck = updatedTalismans.filter(t => (t.durability || 0) > 0);
      }
      
      // Sync artifacts (handle destruction)
      let newPlayerArtifacts = player.artifacts;
      if (updatedArtifacts) {
          newPlayerArtifacts = updatedArtifacts;
          // Check for destroyed artifacts to show toast
          const oldIds = player.artifacts.map(a => a?.id).filter(Boolean);
          const newIds = newPlayerArtifacts.map(a => a?.id).filter(Boolean);
          if (newIds.length < oldIds.length) {
              showToast("⚠️ 战斗中损毁了部分法宝！");
          }
      }

      setPlayer({
          ...player,
          exp: newExp,
          gold: newGold,
          inventory: newInventory,
          talismansInDeck: newTalismanDeck,
          artifacts: newPlayerArtifacts
      });
      
      if (currentMap) {
          setView(GameView.ADVENTURE);
      } else {
          setView(GameView.HOME);
      }
  };

  const handleCombatLose = () => {
      if (!player) return;
      const expLoss = Math.floor(player.exp * 0.1);
      setPlayer({
          ...player,
          exp: Math.max(0, player.exp - expLoss),
          hp: Math.floor(player.stats.maxHp * 0.1)
      });
      setView(GameView.HOME);
      setCurrentMap(null);
  };
  
  const calculateStatsDelta = (currentStats: Stats, newItem: Item | null, oldItem: Item | null): Stats => {
      const newStats = { ...currentStats };
      
      const applyStats = (item: Item, sign: 1 | -1) => {
          if (!item.statBonus) return;
          if (item.statBonus.maxHp) newStats.maxHp += item.statBonus.maxHp * sign;
          if (item.statBonus.maxSpirit) newStats.maxSpirit += item.statBonus.maxSpirit * sign;
          if (item.statBonus.attack) newStats.attack += item.statBonus.attack * sign;
          if (item.statBonus.defense) newStats.defense += item.statBonus.defense * sign;
          if (item.statBonus.speed) newStats.speed += item.statBonus.speed * sign;
          
          if (item.statBonus.elementalAffinities) {
              Object.entries(item.statBonus.elementalAffinities).forEach(([k, v]) => {
                  newStats.elementalAffinities[k as ElementType] += (v as number) * sign;
              });
          }
      };

      if (oldItem) applyStats(oldItem, -1);
      if (newItem) applyStats(newItem, 1);
      
      return newStats;
  };
  
  const formatStatChanges = (newItem: Item | null, oldItem: Item | null): string => {
      const changes: string[] = [];
      const stats = ['maxHp', 'maxSpirit', 'attack', 'defense', 'speed'];
      const statNames: Record<string, string> = { maxHp: '生命', maxSpirit: '神识', attack: '攻击', defense: '防御', speed: '速度' };
      
      stats.forEach(key => {
          // @ts-ignore
          const vNew = newItem?.statBonus?.[key] || 0;
          // @ts-ignore
          const vOld = oldItem?.statBonus?.[key] || 0;
          const diff = vNew - vOld;
          if (diff !== 0) {
              changes.push(`${statNames[key]} ${diff > 0 ? '+' : ''}${diff}`);
          }
      });
      
      // Elements
      const allElems = new Set([
          ...Object.keys(newItem?.statBonus?.elementalAffinities || {}),
          ...Object.keys(oldItem?.statBonus?.elementalAffinities || {})
      ]);
      
      allElems.forEach(key => {
          // @ts-ignore
          const vNew = newItem?.statBonus?.elementalAffinities?.[key] || 0;
          // @ts-ignore
          const vOld = oldItem?.statBonus?.elementalAffinities?.[key] || 0;
          const diff = vNew - vOld;
          if (diff !== 0) {
               changes.push(`${key} ${diff > 0 ? '+' : ''}${diff}`);
          }
      });
      
      if (changes.length === 0) return "属性无变化";
      return changes.join("，");
  };

  const handleEquipItem = (item: Item) => {
      if (!player || !item.slot) return;
      
      const slot = item.slot;
      const oldItem = player.equipment[slot];
      
      const newStats = calculateStatsDelta(player.stats, item, oldItem);
      
      const newInventory = player.inventory.filter(i => i.id !== item.id);
      if (oldItem) newInventory.push(oldItem);
      
      setPlayer({
          ...player,
          stats: newStats,
          equipment: {
              ...player.equipment,
              [slot]: item
          },
          inventory: newInventory
      });
      
      const changeText = formatStatChanges(item, oldItem);
      showToast(`装备了 ${item.name}。(${changeText})`);
  };

  // Called after 3s reading delay
  const finishReadingBook = (item: Item) => {
      if (!player) return;

      const bookRealm = config.realms.find(r => item.reqLevel >= r.rangeStart && item.reqLevel <= r.rangeEnd);
      const elements = Object.values(ElementType);
      const matchedElement = elements.find(e => item.name.includes(e));
      const elem = matchedElement || ElementType.SWORD;
      
      const validCards = config.cards.filter(c => c.element === elem && Math.abs(c.reqLevel - item.reqLevel) <= 5);
      
      let expGain = 0;
      let realmName = "未知";
      
      if (bookRealm) {
          realmName = bookRealm.name;
          expGain = bookRealm.skillBookExp || Math.floor((bookRealm.levels[0]?.expReq || 100) * 0.3);
      } else {
          expGain = Math.max(10, item.reqLevel * 50);
      }
      
      let msg = `研读${realmName}心法，感悟天地灵气，修为增加 ${expGain} 点！`;
      let newInventory = player.inventory.filter(i => i.id !== item.id);
      let newCardStorage = [...player.cardStorage];
      
      if (validCards.length > 0 && Math.random() < 0.7) { 
          const newCard = validCards[Math.floor(Math.random() * validCards.length)];
          
          // Show Acquired Card Modal
          setAcquiredCard(newCard);
          msg += `\n领悟了新招式: ${newCard.name}！`;
      } else {
          msg += `\n遗憾，未能领悟新招式。`;
      }
      
      showToast(msg); // Show final result in Toast
      setPlayer({
          ...player,
          exp: player.exp + expGain,
          inventory: newInventory,
          cardStorage: newCardStorage 
      });
      setReadingItem(null); // Auto close modal
  };

  const handleUseItem = (item: Item) => {
      if (!player) return;

      // Skill Book
      if (item.id.startsWith('book') || item.name.includes('心法')) {
          setReadingItem(item); // Start the reading process
          return;
      }
      
      if (item.type === 'CONSUMABLE' || item.type === 'PILL') {
          if (item.type === 'PILL' && item.maxUsage) {
             const usageKey = item.recipeResult || item.id; 
             const currentUsage = player.pillUsage[usageKey] || 0;
             if (currentUsage >= item.maxUsage) {
                 showToast("此丹药耐药性已满，无法继续服用！");
                 return;
             }
             
             const newPillUsage = { ...player.pillUsage, [usageKey]: currentUsage + 1 };
             const newStats = calculateStatsDelta(player.stats, item, null);
             
             // Precise removal
             const idx = player.inventory.findIndex(i => i.id === item.id);
             let newInv = [...player.inventory];
             if (idx > -1) {
                 newInv.splice(idx, 1);
             }

             setPlayer({
                 ...player,
                 stats: newStats,
                 inventory: newInv,
                 pillUsage: newPillUsage
             });
             
             const changeText = formatStatChanges(item, null);
             showToast(`服用了 ${item.name}。(${changeText})`);
          } else {
             const idx = player.inventory.findIndex(i => i.id === item.id);
             let newInv = [...player.inventory];
             if (idx > -1) newInv.splice(idx, 1);
             
             setPlayer({ ...player, inventory: newInv });
             showToast(`${item.name} 使用成功`);
          }
      }
      
      if (item.type === 'RECIPE') {
          if (!player.learnedRecipes.includes(item.id)) {
              const newInv = player.inventory.filter(i => i !== item);
              setPlayer({ ...player, learnedRecipes: [...player.learnedRecipes, item.id], inventory: newInv });
              showToast(`学会了丹方: ${item.name}`);
          } else {
              showToast("你已经学会了这个丹方");
          }
      }
      if (item.type === 'FORGE_BLUEPRINT') {
          if (!player.learnedBlueprints.includes(item.id)) {
              const newInv = player.inventory.filter(i => i !== item);
              setPlayer({ ...player, learnedBlueprints: [...player.learnedBlueprints, item.id], inventory: newInv });
              showToast(`学会了炼器图纸: ${item.name}`);
          } else {
              showToast("你已经学会了这个图纸");
          }
      }
  };
  
  const handleBreakthrough = () => {
      if (!player) return;
      const currentRealm = config.realms.find(r => player.level >= r.rangeStart && player.level <= r.rangeEnd) || config.realms[0];
      const levelIndex = player.level - currentRealm.rangeStart;
      const levelConfig = currentRealm.levels[levelIndex];
      
      if (!levelConfig) return;
      
      if (player.gold < levelConfig.breakthroughCost) {
          showToast("灵石不足！");
          return;
      }
      
      if (Math.random() > levelConfig.breakthroughChance) {
          setPlayer({
              ...player,
              gold: player.gold - levelConfig.breakthroughCost,
              exp: Math.floor(player.exp * 0.8)
          });
          setBreakthroughResult({ success: false, msg: "突破失败！遭遇反噬，损失部分修为。" });
          return;
      }
      
      // Success
      const nextLevel = player.level + 1;
      const newStats = { ...player.stats };
      newStats.maxHp += levelConfig.hpGrowth;
      newStats.hp = newStats.maxHp;
      newStats.maxSpirit += levelConfig.spiritGrowth;
      newStats.spirit = newStats.maxSpirit;
      newStats.attack += levelConfig.atkGrowth;
      newStats.defense += levelConfig.defGrowth;
      newStats.speed += levelConfig.speedGrowth;
      
      const nextRealm = config.realms.find(r => nextLevel >= r.rangeStart && nextLevel <= r.rangeEnd) || currentRealm;
      const nextLvlIdx = nextLevel - nextRealm.rangeStart;
      const nextExpReq = nextRealm.levels[nextLvlIdx] ? nextRealm.levels[nextLvlIdx].expReq : player.maxExp * 1.5;

      setPlayer({
          ...player,
          level: nextLevel,
          exp: 0,
          maxExp: nextExpReq,
          gold: player.gold - levelConfig.breakthroughCost,
          stats: newStats
      });
      setBreakthroughResult({ success: true, msg: "突破成功！境界提升！属性大幅增长！" });
  };
  
  const handleRefine = (recipeId: string, materials: {itemId: string, count: number}[]) => {
     if (!player) return;
     setIsRefining(true);
     
     setTimeout(() => {
         setIsRefining(false);
         let newInventory = [...player.inventory];
         
         for (const mat of materials) {
             for(let k=0; k<mat.count; k++) {
                 const idx = newInventory.findIndex(i => i.id === mat.itemId);
                 if (idx > -1) newInventory.splice(idx, 1);
             }
         }
         
         const recipeItem = config.items.find(i => i.id === recipeId);
         if (!recipeItem || !recipeItem.recipeResult) return;
         
         const resultItem = config.items.find(i => i.id === recipeItem.recipeResult);
         
         if (resultItem) {
             const success = Math.random() < (recipeItem.successRate || 0.5);
             if (success) {
                 newInventory.push(resultItem);
                 showToast(`炼制成功！获得 ${resultItem.name}`);
             } else {
                 showToast("炼制失败！材料损毁。");
             }
             
             setPlayer(prev => prev ? ({ ...prev, inventory: newInventory }) : null);
         }
     }, 2000);
  };
  
  const handleCraft = (blueprintId: string, materials: {itemId: string, count: number}[]) => {
     if (!player) return;
     setIsRefining(true);
     
     setTimeout(() => {
         setIsRefining(false);
         let newInventory = [...player.inventory];
         
         for (const mat of materials) {
             for(let k=0; k<mat.count; k++) {
                 const idx = newInventory.findIndex(i => i.id === mat.itemId);
                 if (idx > -1) newInventory.splice(idx, 1);
             }
         }
         
         const bpItem = config.items.find(i => i.id === blueprintId);
         if (!bpItem || !bpItem.recipeResult) return;
         
         const resultItem = config.items.find(i => i.id === bpItem.recipeResult);
         
         if (resultItem) {
             const success = Math.random() < (bpItem.successRate || 0.5);
             if (success) {
                 newInventory.push(resultItem);
                 showToast(`锻造成功！获得 ${resultItem.name}`);
             } else {
                 showToast("锻造失败！材料损毁。");
             }
             
             setPlayer(prev => prev ? ({ ...prev, inventory: newInventory }) : null);
         }
     }, 2000);
  };

  const handleCraftTalisman = (cardId: string, penId: string, paperId: string) => {
      if (!player) return;
      
      const card = config.cards.find(c => c.id === cardId) || player.deck.find(c => c.id === cardId) || player.cardStorage.find(c => c.id === cardId);
      const penIdx = player.inventory.findIndex(i => i.id === penId);
      const paperIdx = player.inventory.findIndex(i => i.id === paperId);
      
      if (!card || penIdx === -1 || paperIdx === -1) {
          showToast("材料不足或卡牌无效");
          return;
      }
      
      const newInventory = [...player.inventory];
      newInventory.splice(paperIdx, 1);
      
      const penItem = newInventory.find(i => i.id === penId);
      if (penItem) {
          penItem.durability = (penItem.durability || 1) - 1;
      }
      
      const talismanItem: Item = {
          id: `talisman_${card.id}_${Date.now()}`,
          name: `${card.name}符`,
          icon: '📜',
          type: 'TALISMAN',
          description: `封印了【${card.name}】的符箓，战斗中可直接使用。`,
          rarity: 'rare',
          reqLevel: card.reqLevel,
          price: 100,
          maxDurability: 3,
          durability: 3,
          talismanCardId: card.id,
          statBonus: { elementalAffinities: createZeroElementStats() }
      };
      
      newInventory.push(talismanItem);
      
      setPlayer({ ...player, inventory: newInventory });
      showToast(`制作成功！获得 ${talismanItem.name}`);
  };

  const handleManageDeck = (action: 'TO_STORAGE' | 'TO_DECK' | 'TALISMAN_TO_DECK' | 'TALISMAN_TO_INVENTORY', index: number) => {
      if (!player) return;
      
      const newPlayer = { ...player };
      
      if (action === 'TO_STORAGE') {
          if (newPlayer.deck.length <= 24) {
              showToast("卡组至少需要24张卡牌！");
              return;
          }
          const card = newPlayer.deck[index];
          newPlayer.deck.splice(index, 1);
          newPlayer.cardStorage.push(card);
      } else if (action === 'TO_DECK') {
          const card = newPlayer.cardStorage[index];
          newPlayer.cardStorage.splice(index, 1);
          newPlayer.deck.push(card);
      } else if (action === 'TALISMAN_TO_DECK') {
          const talisman = newPlayer.inventory[index];
          if (talisman.type !== 'TALISMAN') return;
          newPlayer.inventory.splice(index, 1);
          if (!newPlayer.talismansInDeck) newPlayer.talismansInDeck = [];
          newPlayer.talismansInDeck.push(talisman);
      } else if (action === 'TALISMAN_TO_INVENTORY') {
           const talisman = newPlayer.talismansInDeck[index];
           newPlayer.talismansInDeck.splice(index, 1);
           newPlayer.inventory.push(talisman);
      }
      
      setPlayer(newPlayer);
  };
  
  const handleUnlockArtifactSlot = (index: number) => {
      if (!player) return;
      const configSlot = config.artifactSlotConfigs[index];
      if (!configSlot) return;
      
      if (player.level < configSlot.reqLevel) {
          showToast(`等级不足，需要 Lv.${configSlot.reqLevel}`);
          return;
      }
      if (player.gold < configSlot.cost) {
          showToast("灵石不足");
          return;
      }
      
      setPlayer({
          ...player,
          gold: player.gold - configSlot.cost,
          unlockedArtifactCount: (player.unlockedArtifactCount || 0) + 1
      });
      showToast("栏位解锁成功！");
  };
  
  const handleUnequipArtifact = (index: number) => {
      if (!player) return;
      const artifact = player.artifacts[index];
      if (!artifact) return;
      
      const newArtifacts = [...player.artifacts];
      newArtifacts[index] = null;
      
      const newInventory = [...player.inventory, artifact];
      const newStats = calculateStatsDelta(player.stats, null, artifact);
      
      setPlayer({
          ...player,
          stats: newStats,
          inventory: newInventory,
          artifacts: newArtifacts
      });
      
      showToast(`卸下了 ${artifact.name}`);
  };

  const handleEquipItemWrapper = (item: Item) => {
      if (item.type === 'ARTIFACT') {
          if (!player) return;
          // Find slot
          const firstEmpty = player.artifacts.findIndex((a, i) => a === null && i < player.unlockedArtifactCount);
          if (firstEmpty === -1) {
              showToast("法宝栏位已满！请先卸下。");
              return;
          }
          
          const newArtifacts = [...player.artifacts];
          newArtifacts[firstEmpty] = item;
          const newInventory = player.inventory.filter(i => i.id !== item.id);
          const newStats = calculateStatsDelta(player.stats, item, null);
          
          setPlayer({
              ...player,
              stats: newStats,
              inventory: newInventory,
              artifacts: newArtifacts
          });
          
          const changeText = formatStatChanges(item, null);
          showToast(`祭炼了 ${item.name}。(${changeText})`);
          
      } else {
          handleEquipItem(item);
      }
  };
  
  const handleRepairArtifact = (artifactIndex: number, repairItemId: string) => {
       if (!player) return;
       const artifact = player.artifacts[artifactIndex];
       const repairItem = player.inventory.find(i => i.id === repairItemId);
       
       if (!artifact || !repairItem) return;
       
       const restore = repairItem.repairAmount || 0;
       const currentDurability = artifact.durability || 0;
       const maxDurability = artifact.maxDurability || 1;
       const newDurability = Math.min(maxDurability, currentDurability + restore);
       
       const newArtifacts = [...player.artifacts];
       newArtifacts[artifactIndex] = { ...artifact, durability: newDurability };
       
       const repairItemIndex = player.inventory.findIndex(i => i.id === repairItemId);
       const newInventory = [...player.inventory];
       if (repairItemIndex > -1) {
           newInventory.splice(repairItemIndex, 1);
       }
       
       setPlayer({
           ...player,
           artifacts: newArtifacts,
           inventory: newInventory
       });
       
       showToast(`修复了 ${artifact.name}，耐久恢复至 ${newDurability}`);
  };

  return (
    <div className="font-sans text-gray-200">
      {/* Toast Notification */}
      {toastMessage && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-4 rounded-xl backdrop-blur-sm z-[200] animate-fade-in text-center shadow-2xl border border-slate-600 max-w-sm">
              <div className="font-bold text-lg mb-1">提示</div>
              <div className="text-sm text-slate-200 leading-relaxed">{toastMessage}</div>
          </div>
      )}

      {/* Reading Modal */}
      {readingItem && (
          <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center animate-fade-in">
              <ReadingModal item={readingItem} onComplete={() => finishReadingBook(readingItem)} />
          </div>
      )}

      {view === GameView.START && (
        <StartScreen onStart={handleStartGame} onConfig={() => setView(GameView.CONFIG)} />
      )}
      
      {view === GameView.CONFIG && (
        <ConfigScreen config={config} onSave={(c) => { setConfig(c); setView(GameView.START); }} onCancel={() => setView(GameView.START)} />
      )}

      {view === GameView.HOME && player && (
        <>
            <HomeView 
              player={player} 
              realms={config.realms} 
              maps={config.maps}
              onStartAdventure={handleStartAdventure}
              onEquipItem={handleEquipItemWrapper}
              onUseItem={handleUseItem}
              onEndGame={() => setView(GameView.START)}
              onBreakthrough={handleBreakthrough}
              onRefine={handleRefine}
              onCraft={handleCraft}
              onCraftTalisman={handleCraftTalisman}
              onManageDeck={handleManageDeck}
              onRepairArtifact={handleRepairArtifact}
              isRefining={isRefining}
              itemsConfig={config.items}
              artifactConfigs={config.artifactSlotConfigs}
              onUnlockArtifactSlot={handleUnlockArtifactSlot}
              onUnequipArtifact={handleUnequipArtifact}
            />
            {/* Acquired Card Modal */}
            {acquiredCard && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 p-8 rounded-2xl border-2 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex flex-col items-center gap-6 max-w-md w-full relative">
                         <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl animate-pulse pointer-events-none"></div>
                         <h3 className="text-3xl font-bold text-emerald-300 drop-shadow-md">领悟新招式！</h3>
                         
                         <div className="transform scale-125 my-4 shadow-2xl rotate-3 transition-transform hover:rotate-0 duration-500">
                             <div className="w-32 h-48 border-2 border-emerald-500 bg-emerald-900/50 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                                 <div className="text-4xl mb-2">⚡</div>
                                 <div className="font-bold text-emerald-200">{acquiredCard.name}</div>
                                 <div className="text-xs text-emerald-100 mt-2">{acquiredCard.description}</div>
                             </div>
                         </div>
                         
                         <div className="text-slate-300 text-center">
                             <p>你将<span className="text-emerald-400 font-bold"> {acquiredCard.name} </span>收录进了卡牌仓库。</p>
                         </div>
                         
                         <button 
                            onClick={() => {
                                // Add to storage
                                const newStorage = [...player.cardStorage, acquiredCard];
                                setPlayer({...player, cardStorage: newStorage});
                                setAcquiredCard(null);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105"
                         >
                             收下
                         </button>
                    </div>
                </div>
            )}
        </>
      )}

      {/* Breakthrough Result Modal */}
      {breakthroughResult && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
               <div className={`bg-slate-900 p-8 rounded-2xl border-2 ${breakthroughResult.success ? 'border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.5)]' : 'border-red-500 shadow-[0_0_50px_rgba(220,38,38,0.5)]'} flex flex-col items-center gap-6 max-w-md text-center`}>
                    <div className="text-6xl mb-2">{breakthroughResult.success ? '⚡' : '💥'}</div>
                    <h3 className={`text-3xl font-bold ${breakthroughResult.success ? 'text-amber-400' : 'text-red-500'}`}>
                        {breakthroughResult.success ? '突破成功' : '突破失败'}
                    </h3>
                    <p className="text-slate-300 text-lg leading-relaxed">{breakthroughResult.msg}</p>
                    <button 
                        onClick={() => setBreakthroughResult(null)}
                        className={`font-bold py-3 px-10 rounded-full shadow-lg transition-transform hover:scale-105 ${breakthroughResult.success ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                    >
                        确定
                    </button>
               </div>
          </div>
      )}

      {/* Interaction Modal (Adventure) */}
      {interaction && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-slate-900 border-2 border-slate-600 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative">
                  {interaction.type === 'COMBAT_PREVIEW' && (
                      <div className="text-center">
                          <h3 className="text-2xl font-bold text-red-400 mb-4">⚠️ 遭遇敌人</h3>
                          <div className="flex flex-col items-center gap-4 mb-6">
                              <img src={interaction.data.avatarUrl} className="w-24 h-24 rounded-full border-2 border-red-500" />
                              <div className="text-xl text-white font-bold">{interaction.data.name} <span className="text-sm text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Lv.{interaction.data.level}</span></div>
                          </div>
                          <div className="flex gap-4 justify-center">
                              <button onClick={() => setInteraction(null)} className="px-6 py-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">撤退</button>
                              <button onClick={handleInteractionConfirm} className="px-6 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-500 shadow-lg">开始战斗</button>
                          </div>
                      </div>
                  )}
                  
                  {interaction.type === 'REWARD' && (
                      <div className="text-center">
                          <h3 className="text-2xl font-bold text-yellow-400 mb-4">✨ 发现宝藏</h3>
                          <div className="bg-slate-800 p-4 rounded-lg mb-6">
                              <div className="text-lg text-white mb-2">获得灵石: <span className="text-yellow-300 font-bold">{interaction.data.gold}</span></div>
                              {interaction.data.drops.length > 0 && (
                                  <div className="flex flex-col gap-2 mt-4">
                                      <div className="text-sm text-slate-400">获得物品:</div>
                                      <div className="flex justify-center gap-2">
                                          {interaction.data.drops.map((item: Item, i: number) => (
                                              <div key={i} className="flex items-center gap-2 bg-slate-700 px-3 py-1 rounded border border-slate-600">
                                                  <span>{item.icon}</span>
                                                  <span className="text-emerald-300">{item.name}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                          <button onClick={handleInteractionConfirm} className="px-8 py-3 rounded-full bg-yellow-600 text-white font-bold hover:bg-yellow-500 shadow-lg">收入囊中</button>
                      </div>
                  )}

                  {interaction.type === 'MERCHANT' && (
                       <div className="h-[70vh] flex flex-col">
                           <button onClick={handleMerchantClose} className="absolute top-4 right-4 text-slate-500 hover:text-white text-2xl">✕</button>
                           <h3 className="text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2">⚖️ 游商 <span className="text-sm text-slate-500 font-normal ml-2">现有灵石: {player?.gold}</span></h3>
                           
                           <div className="flex-1 flex gap-4 overflow-hidden">
                               {/* Buy Panel */}
                               <div className="flex-1 bg-slate-800/50 rounded border border-slate-700 p-4 overflow-y-auto">
                                   <h4 className="text-slate-400 font-bold mb-3 border-b border-slate-700 pb-1">购买</h4>
                                   <div className="grid grid-cols-1 gap-2">
                                       {interaction.data.items.map((item: Item, i: number) => (
                                           <div key={i} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700">
                                               <div className="flex items-center gap-2">
                                                   <span className="text-2xl">{item.icon}</span>
                                                   <div>
                                                       <div className="text-sm font-bold text-emerald-300">{item.name}</div>
                                                       <div className="text-xs text-yellow-500 font-mono">{item.price} 灵石</div>
                                                   </div>
                                               </div>
                                               <button onClick={() => handleMerchantAction('BUY', item)} className="px-3 py-1 bg-emerald-700 text-white text-xs rounded hover:bg-emerald-600">购买</button>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                               {/* Sell Panel */}
                               <div className="flex-1 bg-slate-800/50 rounded border border-slate-700 p-4 overflow-y-auto">
                                   <h4 className="text-slate-400 font-bold mb-3 border-b border-slate-700 pb-1">出售 (50%价格)</h4>
                                   <div className="grid grid-cols-1 gap-2">
                                       {player?.inventory.map((item, i) => (
                                           <div key={i} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700">
                                               <div className="flex items-center gap-2">
                                                   <span className="text-xl">{item.icon}</span>
                                                   <div className="min-w-0">
                                                       <div className="text-sm font-bold text-slate-300 truncate w-24">{item.name}</div>
                                                       <div className="text-xs text-yellow-500 font-mono">{Math.floor(item.price * 0.5)} 灵石</div>
                                                   </div>
                                               </div>
                                               <button onClick={() => handleMerchantAction('SELL', item)} className="px-3 py-1 bg-red-800 text-white text-xs rounded hover:bg-red-700">出售</button>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                           </div>
                           <div className="mt-4 flex justify-end">
                               <button onClick={handleMerchantClose} className="px-6 py-2 bg-slate-700 text-slate-200 rounded hover:bg-slate-600">离开</button>
                           </div>
                       </div>
                  )}

                  {interaction.type === 'EMPTY' && (
                      <div className="text-center py-8">
                          <h3 className="text-xl text-slate-400 mb-6">这里什么也没有...</h3>
                          <button onClick={handleInteractionConfirm} className="px-6 py-2 rounded bg-slate-700 text-white hover:bg-slate-600">继续探索</button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {view === GameView.ADVENTURE && player && currentMap && (
        <AdventureView 
          mapNodes={mapNodes}
          currentLocationId={currentLocationId}
          onNodeClick={handleNodeClick}
          onRetreat={handleRetreat}
        />
      )}

      {view === GameView.COMBAT && player && currentEnemy && (
        <CombatView 
          player={player}
          enemy={currentEnemy}
          onWin={handleCombatWin}
          onLose={handleCombatLose}
          cardsConfig={config.cards}
        />
      )}
    </div>
  );
};

// --- Internal Components ---

const ReadingModal: React.FC<{ item: Item, onComplete: () => void }> = ({ item, onComplete }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const duration = 3000; // 3s
        const interval = 30; // update every 30ms
        const step = 100 / (duration / interval);
        
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timer);
                    setTimeout(onComplete, 200); // slight delay before finish
                    return 100;
                }
                return prev + step;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [onComplete]);

    return (
        <div className="bg-slate-900 border-2 border-emerald-500 rounded-xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(16,185,129,0.3)] flex flex-col items-center">
             <div className="text-6xl mb-4 animate-bounce">📖</div>
             <h3 className="text-xl font-bold text-emerald-200 mb-6">正在研读...</h3>
             <div className="text-sm text-slate-400 mb-2">{item.name}</div>
             
             <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                 <div className="h-full bg-gradient-to-r from-emerald-600 to-green-400 transition-all duration-75 ease-linear" style={{ width: `${progress}%` }}></div>
             </div>
             <div className="mt-2 text-emerald-500 font-mono font-bold">{Math.floor(progress)}%</div>
        </div>
    );
};

export default App;
