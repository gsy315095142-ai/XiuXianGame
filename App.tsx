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

  // Modal State
  const [acquiredCard, setAcquiredCard] = useState<Card | null>(null);
  
  // --- Start Logic ---
  const handleStartGame = () => {
    const newPlayer = generatePlayerFromConfig(config);
    setPlayer(newPlayer);
    setView(GameView.HOME);
  };

  // --- Actions ---

  const generateMap = () => {
    const count = config.mapNodeCount;
    const nodes: MapNode[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      type: Math.random() > 0.7 ? NodeType.TREASURE : Math.random() > 0.4 ? NodeType.BATTLE : NodeType.EMPTY,
      visited: false,
      x: 0, 
      y: 0
    }));
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

  const handleMove = (node: MapNode) => {
    if (!player) return;

    // Update Visited
    const newNodes = mapNodes.map(n => n.id === node.id ? { ...n, visited: true } : n);
    setMapNodes(newNodes);
    setCurrentNode(node.id);

    // Process Node Event
    if (node.type === NodeType.BATTLE || node.type === NodeType.BOSS) {
      // Use player level to determine enemy
      const enemy = getRandomEnemyFromConfig(player.level, config);
      setActiveEnemy(enemy);
      setView(GameView.COMBAT);
    } else if (node.type === NodeType.TREASURE) {
      // Exploration Reward Logic: Prioritize Realm Items
      if (Math.random() < config.itemDropRate && config.items.length > 0) {
        // Filter items that match player's realm (approx level range)
        const currentRealm = config.realms.find(r => player.level >= r.rangeStart && player.level <= r.rangeEnd);
        let validItems: Item[] = [];
        
        if (currentRealm) {
            validItems = config.items.filter(i => i.reqLevel >= currentRealm.rangeStart && i.reqLevel <= currentRealm.rangeEnd);
        }
        
        // If no items in realm found, fallback to all items
        if (validItems.length === 0) validItems = config.items;
        
        const item = validItems[Math.floor(Math.random() * validItems.length)];
        
        alert(`你发现了一个宝箱，里面是: ${item.name}!`);
        setPlayer(prev => prev ? ({ ...prev, inventory: [...prev.inventory, item] }) : null);
      } else {
         const foundGold = Math.floor(Math.random() * 50) + 10;
         alert(`你发现了一个宝箱，获得了 ${foundGold} 灵石!`);
         setPlayer(prev => prev ? ({ ...prev, gold: prev.gold + foundGold }) : null);
      }
    }
  };

  const handleCombatWin = (rewards: { exp: number, gold: number, drops: Item[] }) => {
    setPlayer(prev => {
        if (!prev) return null;
        const newExp = prev.exp + rewards.exp;
        const levelUp = newExp >= prev.maxExp;
        
        let updatedPlayer = { ...prev };

        if (levelUp) {
            const newLevel = prev.level + 1;
            const currentRealm = config.realms.find(r => newLevel >= r.rangeStart && newLevel <= r.rangeEnd);
            const nextMaxExp = currentRealm ? currentRealm.expReq : Math.floor(prev.maxExp * 1.5);
            
            // NOTE: We don't alert here anymore to not interrupt the Combat Result Modal flow, 
            // the level up will be visible on the Home Screen.

            updatedPlayer = {
                ...updatedPlayer,
                exp: newExp - prev.maxExp,
                level: newLevel,
                maxExp: nextMaxExp,
                stats: {
                    ...prev.stats,
                    maxHp: prev.stats.maxHp + 10,
                    hp: prev.stats.maxHp + 10,
                    attack: prev.stats.attack + 2
                }
            };
        } else {
            updatedPlayer = {
                ...updatedPlayer,
                exp: newExp,
            };
        }

        updatedPlayer.gold += rewards.gold;
        if (rewards.drops.length > 0) {
            updatedPlayer.inventory = [...updatedPlayer.inventory, ...rewards.drops];
        }

        return updatedPlayer;
    });
    
    if (activeEnemy?.name.includes('领主') || (currentNode !== null && currentNode === mapNodes.length - 1)) {
         // Boss clear
         setView(GameView.HOME);
    } else {
        setView(GameView.ADVENTURE);
    }
    setActiveEnemy(null);
  };

  const handleCombatLose = () => {
    // Alert logic handled in CombatView modal now, only state update here
    setPlayer(prev => prev ? ({
        ...prev,
        stats: { ...prev.stats, hp: Math.floor(prev.stats.maxHp * 0.1) } // Return with 10% hp
    }) : null);
    setView(GameView.HOME);
    setActiveEnemy(null);
  };

  const handleUseItem = (item: Item) => {
      if (!player) return;

      if (item.type !== 'CONSUMABLE') return;

      // Logic for Skill Books
      // Check ID format: book_{element}_{level}_...
      const parts = item.id.split('_');
      if (parts[0] === 'book') {
          const elem = parts[1] as ElementType;
          const bookLevel = parseInt(parts[2]);

          // Find realm for this book level
          const realm = config.realms.find(r => bookLevel >= r.rangeStart && bookLevel <= r.rangeEnd);
          
          if (!realm) {
              alert("这本心法残缺不全，无法领悟！");
              return;
          }

          // Find valid cards in config: Matching Element AND Realm Level Range
          // Allowing cards slightly higher level (e.g. within realm + 5)
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
                      inventory: prev.inventory.filter(i => i.id !== item.id) // Consume item
                  };
              });

              // Show Modal instead of alert
              setAcquiredCard(newCard);
          } else {
              alert(`你研读了${item.name}，却发现书中记载的法术早已失传... (配置中无对应卡牌)`);
              setPlayer(prev => prev ? ({ ...prev, inventory: prev.inventory.filter(i => i.id !== item.id) }) : null);
          }
      } else {
          // Other consumables logic can go here (potions etc)
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

      // Unequip existing item in that slot if any
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

          // Handle Element Affinities Merging
          const newAffinities = { ...prev.stats.elementalAffinities };
          
          // Remove old stats
          if (existingItem?.statBonus?.elementalAffinities) {
               Object.entries(existingItem.statBonus.elementalAffinities).forEach(([k, v]) => {
                   newAffinities[k as ElementType] -= (v as number);
               });
          }
          // Add new stats
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
        />
      )}

      {view === GameView.ADVENTURE && player && (
        <AdventureView 
          mapNodes={mapNodes} 
          currentLocationId={currentNode} 
          onMove={handleMove}
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