

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

  // Modal / Notification State
  // We can use simple alerts for now as per previous prompts, or state if needed.

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
            x: 0, // Visuals handled by component
            y: 0
        });
    }
    
    setMapNodes(nodes);
    setCurrentLocationId(null);
    setView(GameView.ADVENTURE);
  };

  const handleNodeClick = (node: MapNode) => {
      // Mark visited
      const newNodes = [...mapNodes];
      newNodes[node.id].visited = true;
      setMapNodes(newNodes);
      setCurrentLocationId(node.id);

      // Handle Event
      switch (node.type) {
          case NodeType.BATTLE:
          case NodeType.BOSS:
              if (player) {
                const enemy = getRandomEnemyFromConfig(player.level + (node.type === NodeType.BOSS ? 2 : 0), config);
                setCurrentEnemy(enemy);
                setView(GameView.COMBAT);
              }
              break;
          case NodeType.TREASURE:
              // Simple treasure logic
              if (player) {
                  const goldFound = Math.floor(Math.random() * 50 * player.level) + 10;
                  // 20% chance for item
                  let drops: Item[] = [];
                  if (Math.random() < 0.2 && config.items.length > 0) {
                      const possibleItems = config.items.filter(i => Math.abs(i.reqLevel - player.level) <= 5);
                      if (possibleItems.length > 0) {
                        drops.push(possibleItems[Math.floor(Math.random() * possibleItems.length)]);
                      }
                  }
                  
                  alert(`发现宝藏！获得 ${goldFound} 灵石${drops.length > 0 ? ` 和 ${drops[0].name}` : ''}`);
                  setPlayer(prev => prev ? {
                      ...prev,
                      gold: prev.gold + goldFound,
                      inventory: [...prev.inventory, ...drops]
                  } : null);
              }
              break;
          case NodeType.MERCHANT:
              // Placeholder
              alert("游商路过，但你囊中羞涩（功能开发中）");
              break;
          case NodeType.EMPTY:
              // Nothing
              break;
      }
  };

  const handleRetreat = () => {
      setView(GameView.HOME);
      setCurrentMap(null);
  };

  const handleCombatWin = (rewards: { exp: number, gold: number, drops: Item[] }, updatedTalismans?: Item[]) => {
      if (!player) return;
      
      let newExp = player.exp + rewards.exp;
      const newGold = player.gold + rewards.gold;
      const newInventory = [...player.inventory, ...rewards.drops];
      
      // Update talismans durability in deck if passed back
      let newTalismanDeck = player.talismansInDeck;
      if (updatedTalismans) {
          newTalismanDeck = updatedTalismans.filter(t => (t.durability || 0) > 0); // Remove broken ones? or keep them? Usually keep broken or auto-remove. Let's auto-remove broken for deck.
          
          // Also sync inventory talismans if they were used (assuming logic handles it, but currently CombatView uses local state for deck talismans)
          // Since talismans in deck are objects in `player.talismansInDeck`, we just update that.
      }

      setPlayer({
          ...player,
          exp: newExp,
          gold: newGold,
          inventory: newInventory,
          talismansInDeck: newTalismanDeck
      });

      alert(`战斗胜利！获得 ${rewards.exp} 修为, ${rewards.gold} 灵石${rewards.drops.length > 0 ? `, ${rewards.drops.length} 件物品` : ''}`);

      if (currentMap) {
          setView(GameView.ADVENTURE);
      } else {
          setView(GameView.HOME);
      }
  };

  const handleCombatLose = () => {
      if (!player) return;
      // Penalty: Lose 10% exp
      const expLoss = Math.floor(player.exp * 0.1);
      setPlayer({
          ...player,
          exp: Math.max(0, player.exp - expLoss),
          hp: Math.floor(player.stats.maxHp * 0.1) // Recover to 10% HP
      });
      alert(`战斗失败... 损失了 ${expLoss} 修为，狼狈逃回洞府。`);
      setView(GameView.HOME);
      setCurrentMap(null);
  };
  
  const calculateStatsDelta = (currentStats: Stats, newItem: Item | null, oldItem: Item | null): Stats => {
      const newStats = { ...currentStats };
      
      const applyStats = (item: Item, sign: 1 | -1) => {
          if (!item.statBonus) return;
          if (item.statBonus.maxHp) newStats.maxHp += item.statBonus.maxHp * sign;
          // HP should probably not exceed maxHp, handled later
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

  const handleEquipItem = (item: Item) => {
      if (!player || !item.slot) return;
      
      const slot = item.slot;
      const oldItem = player.equipment[slot];
      
      // Calculate new stats
      const newStats = calculateStatsDelta(player.stats, item, oldItem);
      
      // Update inventory: remove new item, add old item
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
  };

  const handleUseItem = (item: Item) => {
      if (!player) return;

      // Skill Book
      if (item.id.startsWith('book') || item.name.includes('心法')) {
          // Identify the realm based on the ITEM'S reqLevel, not player level
          const bookRealm = config.realms.find(r => item.reqLevel >= r.rangeStart && item.reqLevel <= r.rangeEnd);
          
          const elements = Object.values(ElementType);
          const matchedElement = elements.find(e => item.name.includes(e));
          const elem = matchedElement || ElementType.SWORD; // Default
          
          const validCards = config.cards.filter(c => c.element === elem && Math.abs(c.reqLevel - item.reqLevel) <= 5);
          
          // Calculate EXP Gain using configuration from the BOOK'S realm
          let expGain = 0;
          let realmName = "未知";
          
          if (bookRealm) {
              realmName = bookRealm.name;
              expGain = bookRealm.skillBookExp || Math.floor((bookRealm.levels[0]?.expReq || 100) * 0.3);
          } else {
              expGain = Math.max(10, item.reqLevel * 50);
          }
          
          // Logic for Card Acquisition
          let msg = `研读${realmName}心法，感悟天地灵气，修为增加 ${expGain} 点！`;
          let newInventory = player.inventory.filter(i => i.id !== item.id);
          let newCardStorage = [...player.cardStorage];
          
          if (validCards.length > 0 && Math.random() < 0.7) { // 70% chance to get card
              const newCard = validCards[Math.floor(Math.random() * validCards.length)];
              newCardStorage.push(newCard);
              msg += `\n领悟了新招式: ${newCard.name}！`;
          } else {
              msg += `\n遗憾，未能领悟新招式。`;
          }
          
          alert(msg);
          setPlayer({
              ...player,
              exp: player.exp + expGain,
              inventory: newInventory,
              cardStorage: newCardStorage
          });
          return;
      }
      
      // Consumables / Pills
      if (item.type === 'CONSUMABLE' || item.type === 'PILL') {
          // Check usage limits for pills
          if (item.type === 'PILL' && item.maxUsage) {
             const usageKey = item.recipeResult || item.id; // Group by result (recipe) or ID
             const currentUsage = player.pillUsage[usageKey] || 0;
             if (currentUsage >= item.maxUsage) {
                 alert("此丹药耐药性已满，无法继续服用！");
                 return;
             }
             
             // Update usage
             const newPillUsage = { ...player.pillUsage, [usageKey]: currentUsage + 1 };
             
             // Apply Stats
             const newStats = calculateStatsDelta(player.stats, item, null);
             
             setPlayer({
                 ...player,
                 stats: newStats,
                 inventory: player.inventory.filter(i => i !== item), // Remove one instance (reference check might fail if strict equality, better by index or ID)
                 // NOTE: Inventory filtering needs to be precise. 
                 pillUsage: newPillUsage
             });
             
             // Precise removal
             const idx = player.inventory.findIndex(i => i.id === item.id);
             if (idx > -1) {
                 const newInv = [...player.inventory];
                 newInv.splice(idx, 1);
                 setPlayer(prev => prev ? ({ ...prev, stats: newStats, inventory: newInv, pillUsage: newPillUsage }) : null);
             }
             
             alert(`服用了 ${item.name}，属性获得了提升！`);
          } else {
             // Standard consumable
             // ... logic for potions (restore HP etc) if defined
             // For now assume simple stats boost or HP restore
             // If item.type == CONSUMABLE and statBonus exists, treat as HP/Spirit restore?
             
             // Simplification: Just remove it for now unless specific logic
             alert(`${item.name} 使用成功 (效果需完善)`);
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
          alert("灵石不足！");
          return;
      }
      
      if (Math.random() > levelConfig.breakthroughChance) {
          alert("突破失败！遭遇反噬，损失部分修为。");
          setPlayer({
              ...player,
              gold: player.gold - levelConfig.breakthroughCost,
              exp: Math.floor(player.exp * 0.8)
          });
          return;
      }
      
      // Success
      alert("突破成功！境界提升！属性大幅增长！");
      const nextLevel = player.level + 1;
      
      // Grow Stats
      const newStats = { ...player.stats };
      newStats.maxHp += levelConfig.hpGrowth;
      newStats.hp = newStats.maxHp;
      newStats.maxSpirit += levelConfig.spiritGrowth;
      newStats.spirit = newStats.maxSpirit;
      newStats.attack += levelConfig.atkGrowth;
      newStats.defense += levelConfig.defGrowth;
      newStats.speed += levelConfig.speedGrowth;
      
      // Next Level EXP Req
      // Find next level config
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
  };
  
  const handleRefine = (recipeId: string, materials: {itemId: string, count: number}[]) => {
     if (!player) return;
     setIsRefining(true);
     
     setTimeout(() => {
         setIsRefining(false);
         // Consume materials
         let newInventory = [...player.inventory];
         let possible = true;
         
         // Verify and remove materials
         for (const mat of materials) {
             const count = newInventory.filter(i => i.id === mat.itemId).length;
             if (count < mat.count) {
                 possible = false;
                 break;
             }
         }
         
         if (!possible) {
             alert("材料不足！");
             return;
         }
         
         // Remove materials
         for (const mat of materials) {
             for(let k=0; k<mat.count; k++) {
                 const idx = newInventory.findIndex(i => i.id === mat.itemId);
                 if (idx > -1) newInventory.splice(idx, 1);
             }
         }
         
         // Learn Recipe if not learned (should be learned to use this, but double check)
         let learnedRecipes = [...player.learnedRecipes];
         if (!learnedRecipes.includes(recipeId)) learnedRecipes.push(recipeId);
         
         const recipeItem = config.items.find(i => i.id === recipeId);
         if (!recipeItem || !recipeItem.recipeResult) return;
         
         const resultItem = config.items.find(i => i.id === recipeItem.recipeResult);
         
         if (resultItem) {
             const success = Math.random() < (recipeItem.successRate || 0.5);
             if (success) {
                 newInventory.push(resultItem);
                 alert(`炼制成功！获得 ${resultItem.name}`);
             } else {
                 alert("炼制失败！材料损毁。");
             }
             
             setPlayer(prev => prev ? ({ ...prev, inventory: newInventory, learnedRecipes }) : null);
         }
     }, 2000);
  };
  
  const handleCraft = (blueprintId: string, materials: {itemId: string, count: number}[]) => {
     // Similar to Refine
     if (!player) return;
     setIsRefining(true);
     
     setTimeout(() => {
         setIsRefining(false);
         // Consume materials
         let newInventory = [...player.inventory];
         
         // Remove materials logic (simplified for brevity, assumes check done in UI)
         for (const mat of materials) {
             for(let k=0; k<mat.count; k++) {
                 const idx = newInventory.findIndex(i => i.id === mat.itemId);
                 if (idx > -1) newInventory.splice(idx, 1);
             }
         }
         
         let learnedBlueprints = [...player.learnedBlueprints];
         if (!learnedBlueprints.includes(blueprintId)) learnedBlueprints.push(blueprintId);
         
         const bpItem = config.items.find(i => i.id === blueprintId);
         if (!bpItem || !bpItem.recipeResult) return;
         
         const resultItem = config.items.find(i => i.id === bpItem.recipeResult);
         
         if (resultItem) {
             const success = Math.random() < (bpItem.successRate || 0.5);
             if (success) {
                 newInventory.push(resultItem);
                 alert(`锻造成功！获得 ${resultItem.name}`);
             } else {
                 alert("锻造失败！材料损毁。");
             }
             
             setPlayer(prev => prev ? ({ ...prev, inventory: newInventory, learnedBlueprints }) : null);
         }
     }, 2000);
  };

  const handleCraftTalisman = (cardId: string, penId: string, paperId: string) => {
      if (!player) return;
      
      const card = config.cards.find(c => c.id === cardId) || player.deck.find(c => c.id === cardId) || player.cardStorage.find(c => c.id === cardId);
      const penIdx = player.inventory.findIndex(i => i.id === penId);
      const paperIdx = player.inventory.findIndex(i => i.id === paperId);
      
      if (!card || penIdx === -1 || paperIdx === -1) {
          alert("材料不足或卡牌无效");
          return;
      }
      
      // Consume Paper
      const newInventory = [...player.inventory];
      newInventory.splice(paperIdx, 1); // remove paper
      
      // Reduce Pen Durability
      // We need to find the pen object in the new array (indexes shifted) or update it
      // Re-find pen in newInventory
      const penItem = newInventory.find(i => i.id === penId);
      if (penItem) {
          penItem.durability = (penItem.durability || 1) - 1;
      }
      
      // Create Talisman Item
      const talismanItem: Item = {
          id: `talisman_${card.id}_${Date.now()}`,
          name: `${card.name}符`,
          icon: '📜',
          type: 'TALISMAN',
          description: `封印了【${card.name}】的符箓，战斗中可直接使用。`,
          rarity: 'rare', // could be based on card
          reqLevel: card.reqLevel,
          price: 100,
          maxDurability: 3, // Default durability for talisman
          durability: 3,
          talismanCardId: card.id,
          statBonus: { elementalAffinities: createZeroElementStats() }
      };
      
      newInventory.push(talismanItem);
      
      setPlayer({ ...player, inventory: newInventory });
      alert(`制作成功！获得 ${talismanItem.name}`);
  };

  const handleManageDeck = (action: 'TO_STORAGE' | 'TO_DECK' | 'TALISMAN_TO_DECK' | 'TALISMAN_TO_INVENTORY', index: number) => {
      if (!player) return;
      
      const newPlayer = { ...player };
      
      if (action === 'TO_STORAGE') {
          // Deck -> Storage
          if (newPlayer.deck.length <= 24) {
              alert("卡组至少需要24张卡牌！");
              return;
          }
          const card = newPlayer.deck[index];
          newPlayer.deck.splice(index, 1);
          newPlayer.cardStorage.push(card);
      } else if (action === 'TO_DECK') {
          // Storage -> Deck
          const card = newPlayer.cardStorage[index];
          newPlayer.cardStorage.splice(index, 1);
          newPlayer.deck.push(card);
      } else if (action === 'TALISMAN_TO_DECK') {
          // Inventory -> Talisman Deck
          const talisman = newPlayer.inventory[index];
          if (talisman.type !== 'TALISMAN') return;
          
          newPlayer.inventory.splice(index, 1);
          if (!newPlayer.talismansInDeck) newPlayer.talismansInDeck = [];
          newPlayer.talismansInDeck.push(talisman);
      } else if (action === 'TALISMAN_TO_INVENTORY') {
          // Talisman Deck -> Inventory
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
          alert(`等级不足，需要 Lv.${configSlot.reqLevel}`);
          return;
      }
      if (player.gold < configSlot.cost) {
          alert("灵石不足");
          return;
      }
      
      setPlayer({
          ...player,
          gold: player.gold - configSlot.cost,
          unlockedArtifactCount: (player.unlockedArtifactCount || 0) + 1
      });
  };

  const handleEquipArtifact = (item: Item, slotIndex: number) => {
       // Only called from Inventory really (by handleEquipItem logic but specialized?)
       // Actually `handleEquipItem` handles normal slots. Artifacts have dynamic slots.
       // We might need special handler or adapt `handleEquipItem`
       // For now, let's assume `handleEquipItem` handles standard slots, and we reuse it for Artifacts 
       // by assigning them a slot property 'accessory' (dummy) or implementing a specific swapper.
       
       // Given the UI in HomeView calls `onEquipItem` for everything in bag, we need `handleEquipItem` to support artifacts if possible.
       // But artifacts go into `player.artifacts[]`.
       // Let's modify `handleEquipItem` to check type.
       if (!player) return;
       
       // Check available slot
       const firstEmpty = player.artifacts.findIndex((a, i) => a === null && i < player.unlockedArtifactCount);
       
       if (firstEmpty === -1) {
           alert("法宝栏位已满！请先卸下。");
           return;
       }
       
       const newArtifacts = [...player.artifacts];
       newArtifacts[firstEmpty] = item;
       
       // Remove from inventory
       const newInventory = player.inventory.filter(i => i.id !== item.id);
       
       // Apply stats
       const newStats = calculateStatsDelta(player.stats, item, null);
       
       setPlayer({
           ...player,
           stats: newStats,
           inventory: newInventory,
           artifacts: newArtifacts
       });
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
  };

  // Override handleEquipItem to support Artifacts logic
  const handleEquipItemWrapper = (item: Item) => {
      if (item.type === 'ARTIFACT') {
          handleEquipArtifact(item, -1);
      } else {
          handleEquipItem(item);
      }
  };

  return (
    <div className="font-sans text-gray-200">
      {view === GameView.START && (
        <StartScreen onStart={handleStartGame} onConfig={() => setView(GameView.CONFIG)} />
      )}
      
      {view === GameView.CONFIG && (
        <ConfigScreen config={config} onSave={(c) => { setConfig(c); setView(GameView.START); }} onCancel={() => setView(GameView.START)} />
      )}

      {view === GameView.HOME && player && (
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
          isRefining={isRefining}
          itemsConfig={config.items}
          artifactConfigs={config.artifactSlotConfigs}
          onUnlockArtifactSlot={handleUnlockArtifactSlot}
          onUnequipArtifact={handleUnequipArtifact}
        />
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

export default App;
