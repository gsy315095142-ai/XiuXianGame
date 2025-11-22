
import React, { useState } from 'react';
import { GameView, Player, MapNode, NodeType, Enemy, GameConfig } from './types';
import { DEFAULT_GAME_CONFIG, generatePlayerFromConfig, getRandomEnemyFromConfig, getRealmName } from './constants';
import { HomeView } from './components/HomeView';
import { AdventureView } from './components/AdventureView';
import { CombatView } from './components/CombatView';
import { StartScreen } from './components/StartScreen';
import { ConfigScreen } from './components/ConfigScreen';

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
      // Use Configured Items/Rates
      if (Math.random() < config.itemDropRate && config.items.length > 0) {
        const item = config.items[Math.floor(Math.random() * config.items.length)];
        alert(`你发现了一个宝箱，里面是: ${item.name}!`);
        setPlayer(prev => prev ? ({ ...prev, inventory: [...prev.inventory, item] }) : null);
      } else {
         const foundGold = Math.floor(Math.random() * 50) + 10;
         alert(`你发现了一个宝箱，获得了 ${foundGold} 灵石!`);
         setPlayer(prev => prev ? ({ ...prev, gold: prev.gold + foundGold }) : null);
      }
    }
  };

  const handleCombatWin = (rewards: { exp: number, gold: number }) => {
    setPlayer(prev => {
        if (!prev) return null;
        const newExp = prev.exp + rewards.exp;
        const levelUp = newExp >= prev.maxExp;
        
        if (levelUp) {
            const newLevel = prev.level + 1;
            alert(`恭喜！你的境界突破到了 ${getRealmName(newLevel)}!`);
        }

        return {
            ...prev,
            exp: levelUp ? newExp - prev.maxExp : newExp,
            level: levelUp ? prev.level + 1 : prev.level,
            maxExp: levelUp ? Math.floor(prev.maxExp * 1.5) : prev.maxExp,
            gold: prev.gold + rewards.gold,
            stats: levelUp ? {
                ...prev.stats,
                maxHp: prev.stats.maxHp + 10,
                hp: prev.stats.maxHp + 10, // Full heal on level up
                attack: prev.stats.attack + 2
            } : prev.stats
        };
    });
    
    if (activeEnemy?.name.includes('领主') || (currentNode !== null && currentNode === mapNodes.length - 1)) {
         alert("恭喜你通过了本次试炼！");
         setView(GameView.HOME);
    } else {
        setView(GameView.ADVENTURE);
    }
    setActiveEnemy(null);
  };

  const handleCombatLose = () => {
    alert("你被打败了！不得不狼狈逃回洞府...");
    setPlayer(prev => prev ? ({
        ...prev,
        stats: { ...prev.stats, hp: Math.floor(prev.stats.maxHp * 0.1) } // Return with 10% hp
    }) : null);
    setView(GameView.HOME);
    setActiveEnemy(null);
  };

  const handleEquip = (item: any) => {
      if (!player) return;
      
      if (player.level < (item.reqLevel || 1)) {
          alert(`你的境界不足，无法驾驭此宝物！(需要: ${getRealmName(item.reqLevel || 1)})`);
          return;
      }

      alert(`装备了 ${item.name} (攻击力 +${item.statBonus?.attack || 0})`);
      setPlayer(prev => prev ? ({
          ...prev,
          stats: {
              ...prev.stats,
              attack: prev.stats.attack + (item.statBonus?.attack || 0)
          },
          equipment: {
              ...prev.equipment,
              weapon: item
          },
          inventory: prev.inventory.filter(i => i.id !== item.id)
      }) : null);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 font-sans overflow-hidden selection:bg-emerald-500 selection:text-white">
      
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
          onStartAdventure={startAdventure} 
          onEquipItem={handleEquip}
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
