

import React, { useEffect, useState } from 'react';
import { Player, Enemy, Card, CardType } from '../types';
import { MAX_HAND_SIZE, DRAW_COUNT_PER_TURN } from '../constants';
import { CardItem } from './CardItem';
import { Button } from './Button';

interface CombatViewProps {
  player: Player;
  enemy: Enemy;
  onWin: (rewards: { exp: number, gold: number }) => void;
  onLose: () => void;
}

type Turn = 'PLAYER' | 'ENEMY';

export const CombatView: React.FC<CombatViewProps> = ({ player: initialPlayer, enemy: initialEnemy, onWin, onLose }) => {
  // Combat State
  const [playerHp, setPlayerHp] = useState(initialPlayer.stats.hp);
  const [playerSpirit, setPlayerSpirit] = useState(initialPlayer.stats.spirit);
  const [playerBlock, setPlayerBlock] = useState(0);
  
  const [enemyHp, setEnemyHp] = useState(initialEnemy.stats.hp);
  const [enemyBlock, setEnemyBlock] = useState(0);
  // Enemy Spirit simplified: refreshes every turn just like player
  const [enemySpirit, setEnemySpirit] = useState(initialEnemy.stats.spirit);

  const [deck, setDeck] = useState<Card[]>([...initialPlayer.deck].sort(() => Math.random() - 0.5));
  const [hand, setHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);

  const [turn, setTurn] = useState<Turn>('PLAYER');
  const [combatLog, setCombatLog] = useState<string[]>(['战斗开始!']);
  
  // Helper to add logs
  const addLog = (msg: string) => {
    setCombatLog(prev => [...prev.slice(-4), msg]);
  };

  // Initialize Combat (Speed Check)
  useEffect(() => {
    const pSpeed = initialPlayer.stats.speed;
    const eSpeed = initialEnemy.stats.speed;
    if (pSpeed >= eSpeed) {
      addLog(`你的速度(${pSpeed})快于敌人(${eSpeed})，你先攻！`);
      startPlayerTurn();
    } else {
      addLog(`敌人速度(${eSpeed})较快，敌人先攻！`);
      setTurn('ENEMY');
      setTimeout(executeEnemyTurn, 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Win/Loss Check
  useEffect(() => {
    if (enemyHp <= 0) {
      addLog('敌人倒下了！胜利！');
      setTimeout(() => onWin({ exp: initialEnemy.dropExp, gold: initialEnemy.dropGold }), 1500);
    }
    if (playerHp <= 0) {
      addLog('你力竭倒下了...');
      setTimeout(onLose, 1500);
    }
  }, [enemyHp, playerHp, initialEnemy, onWin, onLose]);

  // --- Mechanics ---

  // Unified effect resolver
  const resolveCardEffect = (card: Card, source: 'PLAYER' | 'ENEMY') => {
      const isPierce = card.tags?.includes('PIERCE');

      if (source === 'PLAYER') {
          switch (card.type) {
            case CardType.ATTACK:
                let dmg = Math.max(0, card.value + initialPlayer.stats.attack);
                
                // Block Logic with Pierce check
                let blocked = 0;
                if (!isPierce) {
                    blocked = Math.min(dmg, enemyBlock);
                    dmg -= blocked;
                    setEnemyBlock(prev => prev - blocked);
                } else {
                    addLog('>>> 穿刺攻击！无视护盾！');
                }
                
                setEnemyHp(prev => prev - dmg);
                addLog(`你使用 ${card.name}，造成 ${dmg} 伤害${blocked > 0 ? ` (${blocked} 被格挡)` : ''}`);
                break;
            case CardType.HEAL:
                setPlayerHp(prev => Math.min(initialPlayer.stats.maxHp, prev + card.value));
                addLog(`你使用 ${card.name}，恢复 ${card.value} 生命`);
                break;
            case CardType.DEFEND:
                setPlayerBlock(prev => prev + card.value);
                addLog(`你使用 ${card.name}，增加 ${card.value} 护盾`);
                break;
            case CardType.BUFF:
                if (card.id === 'c_meditate') {
                    setPlayerSpirit(prev => Math.min(initialPlayer.stats.maxSpirit, prev + card.value));
                    addLog(`你冥想恢复了 ${card.value} 神识`);
                }
                break;
          }
      } else {
          // Enemy Logic
          switch (card.type) {
            case CardType.ATTACK:
                let dmg = Math.max(0, card.value + initialEnemy.stats.attack);
                
                // Block Logic with Pierce check
                let blocked = 0;
                if (!isPierce) {
                     blocked = Math.min(dmg, playerBlock);
                     dmg -= blocked;
                     setPlayerBlock(prev => prev - blocked);
                } else {
                     addLog('>>> 敌人穿刺攻击！无视你的护盾！');
                }

                setPlayerHp(prev => prev - dmg);
                addLog(`${initialEnemy.name} 使用 ${card.name}，造成 ${dmg} 伤害${blocked > 0 ? ` (${blocked} 被格挡)` : ''}`);
                break;
            case CardType.HEAL:
                setEnemyHp(prev => Math.min(initialEnemy.stats.maxHp, prev + card.value));
                addLog(`${initialEnemy.name} 使用 ${card.name}，恢复 ${card.value} 生命`);
                break;
            case CardType.DEFEND:
                setEnemyBlock(prev => prev + card.value);
                addLog(`${initialEnemy.name} 使用 ${card.name}，增加 ${card.value} 护盾`);
                break;
            case CardType.BUFF:
                setEnemySpirit(prev => Math.min(initialEnemy.stats.maxSpirit, prev + card.value));
                addLog(`${initialEnemy.name} 恢复了神识`);
                break;
          }
      }
  }

  const drawCards = (count: number) => {
    let currentDeck = [...deck];
    let currentDiscard = [...discardPile];
    let newHand = [...hand];

    for (let i = 0; i < count; i++) {
      if (currentDeck.length === 0) {
        if (currentDiscard.length === 0) break; 
        currentDeck = [...currentDiscard].sort(() => Math.random() - 0.5);
        currentDiscard = [];
        addLog('洗牌...');
      }
      const card = currentDeck.pop();
      if (card) {
        if (newHand.length < MAX_HAND_SIZE) {
            newHand.push(card);
        } else {
            currentDiscard.push(card);
            addLog('手牌已满，卡牌被丢弃');
        }
      }
    }

    setDeck(currentDeck);
    setDiscardPile(currentDiscard);
    setHand(newHand);
  };

  const startPlayerTurn = () => {
    setTurn('PLAYER');
    setPlayerSpirit(initialPlayer.stats.maxSpirit); 
    setPlayerBlock(0); // Reset block at start of turn (Slay the Spire style)
    drawCards(DRAW_COUNT_PER_TURN); 
  };

  const playCard = (cardIndex: number) => {
    if (turn !== 'PLAYER') return;
    const card = hand[cardIndex];

    // Check Level Requirement
    if (initialPlayer.level < (card.reqLevel || 1)) {
        addLog(`境界不足，无法使用此卡(需Lv.${card.reqLevel})`);
        return;
    }

    if (playerSpirit < card.cost) {
      addLog('神识不足！');
      return;
    }

    setPlayerSpirit(prev => prev - card.cost);
    resolveCardEffect(card, 'PLAYER');

    const newHand = [...hand];
    newHand.splice(cardIndex, 1);
    setHand(newHand);
    setDiscardPile(prev => [...prev, card]);
  };

  const endTurn = () => {
    setTurn('ENEMY');
    setTimeout(executeEnemyTurn, 1000);
  };

  // --- Enemy Mechanics ---

  const executeEnemyTurn = () => {
    if (enemyHp <= 0) return;

    setEnemySpirit(initialEnemy.stats.maxSpirit);
    setEnemyBlock(0);
    
    const enemyDeck = initialEnemy.deck && initialEnemy.deck.length > 0 ? initialEnemy.deck : [];
    
    if (enemyDeck.length > 0) {
        // Try to play 1-2 cards
        let currentSpirit = initialEnemy.stats.maxSpirit; 
        const maxActions = 2;
        let actions = 0;

        const performAction = () => {
            if (actions >= maxActions || currentSpirit <= 0) return;

            const availableCards = enemyDeck.filter(c => c.cost <= currentSpirit);
            if (availableCards.length > 0) {
                const card = availableCards[Math.floor(Math.random() * availableCards.length)];
                resolveCardEffect(card, 'ENEMY');
                currentSpirit -= card.cost;
                actions++;
            } else {
                // Basic attack fallback if spirit allows, but usually we stop here
            }
        }
        
        performAction();
        // Maybe do a second action if spirit allows
        if (currentSpirit > 0) performAction();
        
        if (actions === 0) {
             // Fallback basic attack
             let dmg = Math.max(0, initialEnemy.stats.attack);
             const blocked = Math.min(dmg, playerBlock);
             dmg -= blocked;
             setPlayerBlock(prev => prev - blocked);
             setPlayerHp(prev => prev - dmg);
             addLog(`${initialEnemy.name} 普通攻击，造成 ${dmg} 伤害`);
        }

    } else {
        // Fallback old logic
        let dmg = initialEnemy.stats.attack;
        const blockedDmg = Math.max(0, dmg - playerBlock);
        const blockUsed = dmg - blockedDmg;
        setPlayerBlock(prev => Math.max(0, prev - blockUsed));
        setPlayerHp(prev => prev - blockedDmg);
        addLog(`${initialEnemy.name} 猛扑过来，造成 ${blockedDmg} 伤害!`);
    }

    setTimeout(startPlayerTurn, 2000);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
        {/* Top: Enemy Area */}
        <div className="flex-1 bg-[url('https://picsum.photos/seed/dungeon/1920/600')] bg-cover bg-center relative flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60"></div>
            
            <div className="relative z-10 flex flex-col items-center animate-bounce-slight">
                <div className="relative">
                    <img src={initialEnemy.avatarUrl} className="w-32 h-32 rounded-full border-4 border-red-800 shadow-[0_0_20px_rgba(220,38,38,0.6)]" alt="Enemy" />
                    <div className="absolute -bottom-3 -right-3 bg-red-700 text-white text-xs px-2 py-1 rounded border border-red-400">
                        Lv.{initialEnemy.level}
                    </div>
                    {enemyBlock > 0 && (
                        <div className="absolute -top-2 -right-8 flex items-center text-blue-200 font-bold border border-blue-500 px-2 rounded bg-blue-900/80 z-20 shadow-lg">
                            🛡️ {enemyBlock}
                        </div>
                    )}
                </div>
                <h3 className="text-2xl font-bold text-red-200 mt-4 text-shadow">{initialEnemy.name}</h3>
                
                {/* Enemy HP Bar */}
                <div className="w-64 h-4 bg-gray-700 rounded-full mt-2 border border-gray-600 overflow-hidden relative">
                    <div 
                        className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300" 
                        style={{ width: `${Math.max(0, (enemyHp / initialEnemy.stats.maxHp) * 100)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white text-shadow-sm">
                        {Math.max(0, enemyHp)} / {initialEnemy.stats.maxHp}
                    </span>
                </div>
            </div>
        </div>

        {/* Middle: Combat Info & Turn Indicator */}
        <div className="h-16 bg-slate-800 border-y border-slate-600 flex items-center justify-between px-6 relative">
            <div className="text-slate-400 text-sm">
                {combatLog.map((log, i) => (
                    <div key={i} className="opacity-70 animate-fade-in">{log}</div>
                ))}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -top-5">
                <div className={`
                    px-6 py-2 rounded-full font-bold text-lg border-2 shadow-lg transition-all duration-300
                    ${turn === 'PLAYER' ? 'bg-emerald-600 border-emerald-400 text-white scale-110' : 'bg-red-900 border-red-700 text-gray-300'}
                `}>
                    {turn === 'PLAYER' ? '你的回合' : '敌方回合'}
                </div>
            </div>
            <Button 
                onClick={endTurn} 
                disabled={turn !== 'PLAYER'}
                variant="danger"
            >
                结束回合
            </Button>
        </div>

        {/* Bottom: Player Hand & Stats */}
        <div className="flex-1 bg-slate-900 p-4 flex flex-col justify-end relative overflow-hidden">
            
            {/* Player Stats Bar */}
            <div className="absolute top-2 left-4 right-4 flex justify-between items-center bg-slate-800/50 p-2 rounded-lg backdrop-blur">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-emerald-400 font-bold">HP</span>
                        <div className="w-32 h-3 bg-gray-700 rounded-full border border-gray-600 overflow-hidden relative">
                             <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.max(0, (playerHp / initialPlayer.stats.maxHp) * 100)}%` }}></div>
                             <span className="absolute inset-0 flex items-center justify-center text-[8px]">{Math.max(0, playerHp)}/{initialPlayer.stats.maxHp}</span>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-blue-400 font-bold">神识</span>
                        <div className="flex gap-1">
                            {Array.from({ length: initialPlayer.stats.maxSpirit }).map((_, i) => (
                                <div key={i} className={`w-3 h-3 rounded-full border border-blue-400 ${i < playerSpirit ? 'bg-blue-500 shadow-[0_0_5px_blue]' : 'bg-transparent'}`}></div>
                            ))}
                        </div>
                    </div>
                    {playerBlock > 0 && (
                        <div className="flex items-center text-blue-200 font-bold border border-blue-500 px-2 rounded bg-blue-900/50 shadow-lg">
                            🛡️ {playerBlock}
                        </div>
                    )}
                </div>
                
                <div className="text-xs text-slate-500">
                    牌库: {deck.length} | 弃牌: {discardPile.length}
                </div>
            </div>

            {/* Hand Cards */}
            <div className="flex justify-center items-end gap-[-40px] pb-4 overflow-x-auto min-h-[220px]">
                <div className="flex -space-x-8 hover:space-x-2 transition-all duration-300 px-10">
                    {hand.map((card, idx) => (
                        <div key={`${card.id}-${idx}`} className="transform hover:-translate-y-6 transition-transform origin-bottom">
                             <CardItem 
                                card={card} 
                                isPlayable={turn === 'PLAYER' && playerSpirit >= card.cost}
                                playerLevel={initialPlayer.level}
                                onClick={() => playCard(idx)}
                             />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};