
import React, { useEffect, useState, useRef } from 'react';
import { Player, Enemy, Card, CardType, ElementType, Item } from '../types';
import { MAX_HAND_SIZE, DRAW_COUNT_PER_TURN, ELEMENT_CONFIG, generateSkillBook, getRealmName } from '../constants';
import { CardItem } from './CardItem';
import { Button } from './Button';

interface CombatViewProps {
  player: Player;
  enemy: Enemy;
  onWin: (rewards: { exp: number, gold: number, drops: Item[] }) => void;
  onLose: () => void;
}

type Turn = 'PLAYER' | 'ENEMY';
type VfxType = 'SLASH' | 'HEAL' | 'SHIELD' | 'BUFF';

interface VisualEffectState {
  id: number;
  type: VfxType;
  target: 'PLAYER' | 'ENEMY';
}

export const CombatView: React.FC<CombatViewProps> = ({ player: initialPlayer, enemy: initialEnemy, onWin, onLose }) => {
  // Combat State
  const [playerHp, setPlayerHp] = useState(initialPlayer.stats.hp);
  const [playerSpirit, setPlayerSpirit] = useState(initialPlayer.stats.spirit);
  const [playerBlock, setPlayerBlock] = useState(0);
  
  // Track MAX elements for combat session (for GROWTH cards)
  const [playerMaxElements, setPlayerMaxElements] = useState<Record<ElementType, number>>({...initialPlayer.stats.elementalAffinities});
  // Track CURRENT available elements
  const [playerElements, setPlayerElements] = useState<Record<ElementType, number>>({...initialPlayer.stats.elementalAffinities});
  
  const [enemyHp, setEnemyHp] = useState(initialEnemy.stats.hp);
  const [enemyBlock, setEnemyBlock] = useState(0);
  const [enemySpirit, setEnemySpirit] = useState(initialEnemy.stats.spirit);
  // Enemy elements simplified
  const [enemyElements, setEnemyElements] = useState<Record<ElementType, number>>({...initialEnemy.stats.elementalAffinities});

  const [deck, setDeck] = useState<Card[]>([...initialPlayer.deck].sort(() => Math.random() - 0.5));
  const [hand, setHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);

  const [turn, setTurn] = useState<Turn>('PLAYER');
  const [combatLog, setCombatLog] = useState<string[]>(['战斗开始!']);

  // UI State for Enemy Move
  const [activeEnemyCard, setActiveEnemyCard] = useState<Card | null>(null);
  
  // VFX State
  const [activeVfx, setActiveVfx] = useState<VisualEffectState | null>(null);

  // Logic Refs (Source of Truth for async sequences)
  const statsRef = useRef({
      playerHp: initialPlayer.stats.hp,
      playerBlock: 0,
      enemyHp: initialEnemy.stats.hp,
      enemyBlock: 0
  });

  const [combatResult, setCombatResult] = useState<{
      win: boolean;
      rewards?: { exp: number; gold: number; drops: Item[] };
  } | null>(null);
  
  const combatEndedRef = useRef(false);
  
  // Define element groups for rendering layout
  const primaryElements = [ElementType.METAL, ElementType.WOOD, ElementType.WATER, ElementType.FIRE, ElementType.EARTH];
  const secondaryElements = [ElementType.LIGHT, ElementType.DARK, ElementType.WIND, ElementType.THUNDER, ElementType.ICE, ElementType.SWORD];

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
    if (combatEndedRef.current) return;

    if (enemyHp <= 0) {
      combatEndedRef.current = true;
      addLog('敌人倒下了！胜利！');
      
      // Calculate Rewards Locally
      const drops: Item[] = [];
      // 30% chance to drop Skill Book
      if (Math.random() < 0.3) {
          const elements = Object.values(ElementType);
          const randElem = elements[Math.floor(Math.random() * elements.length)];
          const book = generateSkillBook(initialPlayer.level, randElem);
          drops.push(book);
      }

      const rewards = {
          exp: initialEnemy.dropExp,
          gold: initialEnemy.dropGold,
          drops: drops
      };

      setTimeout(() => {
          setCombatResult({ win: true, rewards });
      }, 1000);
    }

    if (playerHp <= 0) {
      combatEndedRef.current = true;
      addLog('你力竭倒下了...');
      setTimeout(() => {
          setCombatResult({ win: false });
      }, 1000);
    }
  }, [enemyHp, playerHp, initialEnemy, initialPlayer.level]);

  // --- VFX Helper ---
  const triggerVfx = (cardType: CardType, caster: 'PLAYER' | 'ENEMY') => {
      let type: VfxType = 'BUFF';
      let target: 'PLAYER' | 'ENEMY' = caster;

      switch (cardType) {
          case CardType.ATTACK:
              type = 'SLASH';
              target = caster === 'PLAYER' ? 'ENEMY' : 'PLAYER';
              break;
          case CardType.HEAL:
              type = 'HEAL';
              target = caster;
              break;
          case CardType.DEFEND:
              type = 'SHIELD';
              target = caster;
              break;
          case CardType.BUFF:
          case CardType.GROWTH:
              type = 'BUFF';
              target = caster;
              break;
      }

      setActiveVfx({ id: Date.now(), type, target });
      setTimeout(() => setActiveVfx(null), 800); // Clear effect after animation
  };

  // --- Mechanics ---

  // Unified effect resolver
  const resolveCardEffect = (card: Card, source: 'PLAYER' | 'ENEMY') => {
      const isPierce = card.tags?.includes('PIERCE');
      const stats = statsRef.current;

      if (source === 'PLAYER') {
          switch (card.type) {
            case CardType.ATTACK:
                let dmg = Math.max(0, card.value + initialPlayer.stats.attack);
                let blocked = 0;
                if (!isPierce) {
                    blocked = Math.min(dmg, stats.enemyBlock);
                    dmg -= blocked;
                    stats.enemyBlock -= blocked;
                    setEnemyBlock(stats.enemyBlock);
                } else {
                    addLog('>>> 穿刺攻击！无视护盾！');
                }
                stats.enemyHp -= dmg;
                setEnemyHp(stats.enemyHp);
                addLog(`你使用 ${card.name}，造成 ${dmg} 伤害${blocked > 0 ? ` (${blocked} 被格挡)` : ''}`);
                break;
            case CardType.HEAL:
                stats.playerHp = Math.min(initialPlayer.stats.maxHp, stats.playerHp + card.value);
                setPlayerHp(stats.playerHp);
                addLog(`你使用 ${card.name}，恢复 ${card.value} 生命`);
                break;
            case CardType.DEFEND:
                stats.playerBlock += card.value;
                setPlayerBlock(stats.playerBlock);
                addLog(`你使用 ${card.name}，增加 ${card.value} 护盾`);
                break;
            case CardType.BUFF:
                if (card.id === 'c_meditate') {
                    setPlayerSpirit(prev => Math.min(initialPlayer.stats.maxSpirit, prev + card.value));
                    addLog(`你冥想恢复了 ${card.value} 神识`);
                }
                break;
            case CardType.GROWTH:
                setPlayerMaxElements(prev => {
                    const newMax = { ...prev };
                    newMax[card.element] = (newMax[card.element] || 0) + card.value;
                    return newMax;
                });
                setPlayerElements(prev => {
                    const newElems = { ...prev };
                    newElems[card.element] = (newElems[card.element] || 0) + card.value;
                    return newElems;
                });
                addLog(`你运转 ${card.name}，${card.element}属性上限提升 ${card.value} 点！`);
                break;
          }
      } else {
          // Enemy Logic
          switch (card.type) {
            case CardType.ATTACK:
                let dmg = Math.max(0, card.value + initialEnemy.stats.attack);
                let blocked = 0;
                if (!isPierce) {
                     blocked = Math.min(dmg, stats.playerBlock);
                     dmg -= blocked;
                     stats.playerBlock -= blocked;
                     setPlayerBlock(stats.playerBlock);
                } else {
                     addLog('>>> 敌人穿刺攻击！无视你的护盾！');
                }
                stats.playerHp -= dmg;
                setPlayerHp(stats.playerHp);
                addLog(`${initialEnemy.name} 使用 ${card.name}，造成 ${dmg} 伤害${blocked > 0 ? ` (${blocked} 被格挡)` : ''}`);
                break;
            case CardType.HEAL:
                stats.enemyHp = Math.min(initialEnemy.stats.maxHp, stats.enemyHp + card.value);
                setEnemyHp(stats.enemyHp);
                addLog(`${initialEnemy.name} 使用 ${card.name}，恢复 ${card.value} 生命`);
                break;
            case CardType.DEFEND:
                stats.enemyBlock += card.value;
                setEnemyBlock(stats.enemyBlock);
                addLog(`${initialEnemy.name} 使用 ${card.name}，增加 ${card.value} 护盾`);
                break;
            case CardType.BUFF:
                setEnemySpirit(prev => Math.min(initialEnemy.stats.maxSpirit, prev + card.value));
                addLog(`${initialEnemy.name} 恢复了神识`);
                break;
            case CardType.GROWTH:
                addLog(`${initialEnemy.name} 气息暴涨，提升了元素之力！`);
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
    if (combatEndedRef.current) return;
    setTurn('PLAYER');
    setPlayerSpirit(initialPlayer.stats.maxSpirit); 
    
    // Refill Elements based on CURRENT MAX CAPS (which might have been boosted by GROWTH cards)
    setPlayerElements({...playerMaxElements}); 
    
    // Reset Player Block at start of turn
    statsRef.current.playerBlock = 0;
    setPlayerBlock(0);
    
    drawCards(DRAW_COUNT_PER_TURN); 
  };

  const playCard = (cardIndex: number) => {
    if (turn !== 'PLAYER' || combatEndedRef.current) return;
    const card = hand[cardIndex];

    if (initialPlayer.level < (card.reqLevel || 1)) {
        addLog(`境界不足，无法使用此卡(需Lv.${card.reqLevel})`);
        return;
    }

    if (playerSpirit < card.cost) {
      addLog('神识不足！');
      return;
    }

    // Check Element Cost
    const currentElemVal = playerElements[card.element] || 0;
    if (currentElemVal < card.elementCost) {
        addLog(`${card.element}属性不足！需要 ${card.elementCost}，当前 ${currentElemVal}`);
        return;
    }

    setPlayerSpirit(prev => prev - card.cost);
    setPlayerElements(prev => ({
        ...prev,
        [card.element]: prev[card.element] - card.elementCost
    }));

    triggerVfx(card.type, 'PLAYER');
    
    // Slight delay for damage number to appear after effect starts
    setTimeout(() => {
        resolveCardEffect(card, 'PLAYER');
    }, 200);

    const newHand = [...hand];
    newHand.splice(cardIndex, 1);
    setHand(newHand);
    setDiscardPile(prev => [...prev, card]);
  };

  const endTurn = () => {
    if (combatEndedRef.current) return;
    setTurn('ENEMY');
    setTimeout(executeEnemyTurn, 1000);
  };

  // --- Enemy Mechanics ---

  const executeEnemyTurn = async () => {
    if (combatEndedRef.current || statsRef.current.enemyHp <= 0) return;

    // Reset Enemy Block at start of their turn
    statsRef.current.enemyBlock = 0;
    setEnemyBlock(0);

    setEnemySpirit(initialEnemy.stats.maxSpirit);
    setEnemyElements({...initialEnemy.stats.elementalAffinities});
    
    const enemyDeck = initialEnemy.deck && initialEnemy.deck.length > 0 ? initialEnemy.deck : [];
    
    // Choose actions
    const actionsToPlay: Card[] = [];
    if (enemyDeck.length > 0) {
        let currentSpirit = initialEnemy.stats.maxSpirit; 
        let currentElements = {...initialEnemy.stats.elementalAffinities};
        const maxActions = 2; // AI attempts to play up to 2 cards

        for (let i = 0; i < maxActions; i++) {
            // Filter cards that can be paid for
            const availableCards = enemyDeck.filter(c => 
                c.cost <= currentSpirit && (currentElements[c.element] || 0) >= c.elementCost
            );

            if (availableCards.length > 0) {
                const card = availableCards[Math.floor(Math.random() * availableCards.length)];
                actionsToPlay.push(card);
                currentSpirit -= card.cost;
                currentElements[card.element] -= card.elementCost;
            }
        }
    }

    if (actionsToPlay.length > 0) {
        for (const card of actionsToPlay) {
            if (combatEndedRef.current) break;
            // 1. Show Card
            setActiveEnemyCard(card);
            await new Promise(r => setTimeout(r, 2000)); // Display time: 2 seconds

            // 2. Trigger VFX
            triggerVfx(card.type, 'ENEMY');

            // 3. Resolve Effect
            resolveCardEffect(card, 'ENEMY');
            
            // 4. Hide Card
            setActiveEnemyCard(null);
            await new Promise(r => setTimeout(r, 500)); // Pause between cards
        }
    } else {
        // Fallback Attack
        if (!combatEndedRef.current) {
            // Basic attack visual
            triggerVfx(CardType.ATTACK, 'ENEMY');
            
            setTimeout(() => {
                let dmg = initialEnemy.stats.attack;
                const blockedDmg = Math.min(dmg, statsRef.current.playerBlock);
                dmg -= blockedDmg;
                
                statsRef.current.playerBlock -= blockedDmg;
                setPlayerBlock(statsRef.current.playerBlock);
                
                statsRef.current.playerHp -= dmg;
                setPlayerHp(statsRef.current.playerHp);
                
                addLog(`${initialEnemy.name} 猛扑过来，造成 ${dmg} 伤害!`);
            }, 200);
            
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    startPlayerTurn();
  };

  const handleModalConfirm = () => {
      if (combatResult?.win && combatResult.rewards) {
          onWin(combatResult.rewards);
      } else {
          onLose();
      }
  };

  const renderElementBadge = (elem: ElementType, val: number) => {
      const config = ELEMENT_CONFIG[elem];
      return (
          <div key={elem} className={`flex items-center gap-1 px-2 py-0.5 rounded border border-slate-600/50 ${config.bg} ${val === 0 ? 'opacity-40 grayscale' : 'bg-opacity-60'}`} title={`${elem}灵力`}>
              <span className="text-[10px]">{config.icon}</span>
              <span className={`text-xs font-bold ${val > 0 ? config.color : 'text-gray-500'}`}>{val}</span>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50 overflow-hidden">
        
        {/* VFX Layer */}
        {activeVfx && (
             <div className="absolute inset-0 z-[60] pointer-events-none flex items-center justify-center">
                 {/* 
                    Positioning Logic:
                    ENEMY target -> Top half (top-[20vh])
                    PLAYER target -> Bottom half (bottom-[20vh])
                 */}
                 <div className={`absolute ${activeVfx.target === 'ENEMY' ? 'top-[20vh]' : 'bottom-[20vh]'}`}>
                     <VisualEffect type={activeVfx.type} />
                 </div>
             </div>
        )}

        {/* Active Enemy Card (No Backdrop, Floating Below Button) */}
        {activeEnemyCard && (
            <div className="absolute top-[50vh] left-1/2 -translate-x-1/2 z-[40] pointer-events-none mt-8">
                <div className="transform scale-110 shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-bounce-slight pointer-events-auto">
                    <CardItem card={activeEnemyCard} isPlayable={false} />
                    <div className="text-center mt-4 text-xl font-bold text-red-500 text-shadow-lg bg-black/50 px-4 py-1 rounded whitespace-nowrap">
                        {initialEnemy.name} 使用了这张卡!
                    </div>
                </div>
            </div>
        )}

        {/* Combat Result Modal */}
        {combatResult && (
            <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-slate-900 border-2 border-emerald-600 rounded-xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(5,150,105,0.4)] flex flex-col items-center">
                    <h2 className={`text-4xl font-bold mb-6 ${combatResult.win ? 'text-emerald-400' : 'text-red-500'}`}>
                        {combatResult.win ? '战斗胜利' : '战斗失败'}
                    </h2>
                    
                    {combatResult.win && combatResult.rewards && (
                        <div className="w-full space-y-4 mb-8">
                             <div className="bg-slate-800 p-4 rounded border border-slate-700">
                                <h3 className="text-slate-400 font-bold mb-2 border-b border-slate-600 pb-1">获得奖励</h3>
                                <div className="flex justify-between items-center mb-1">
                                    <span>✨ 修为经验</span>
                                    <span className="font-mono text-emerald-300">+{combatResult.rewards.exp}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>💎 灵石</span>
                                    <span className="font-mono text-yellow-300">+{combatResult.rewards.gold}</span>
                                </div>
                             </div>

                             {combatResult.rewards.drops.length > 0 && (
                                 <div className="bg-slate-800 p-4 rounded border border-slate-700">
                                    <h3 className="text-slate-400 font-bold mb-2 border-b border-slate-600 pb-1">战利品</h3>
                                    <div className="space-y-2">
                                        {combatResult.rewards.drops.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <div className={`w-8 h-8 flex items-center justify-center rounded bg-slate-700 border border-slate-600 text-xs`}>
                                                    {item.type === 'CONSUMABLE' ? '📚' : '🎁'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className={`text-sm font-bold ${item.rarity === 'rare' ? 'text-blue-300' : 'text-white'}`}>{item.name}</div>
                                                    <div className="text-[10px] text-slate-500 truncate">{item.description}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                 </div>
                             )}
                        </div>
                    )}

                    {!combatResult.win && (
                        <div className="text-slate-400 mb-8 text-center">
                            你身受重伤，不得不逃回洞府休养生息...<br/>
                            <span className="text-xs text-red-500 mt-2 block">损失了部分当前生命值</span>
                        </div>
                    )}

                    <Button onClick={handleModalConfirm} size="lg" className="w-full">
                        {combatResult.win ? '收入囊中' : '狼狈逃窜'}
                    </Button>
                </div>
            </div>
        )}

        {/* Top: Enemy Area */}
        <div className="h-[40vh] bg-[url('https://picsum.photos/seed/dungeon/1920/600')] bg-cover bg-center relative flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60"></div>
            
            <div className="relative z-10 flex flex-col items-center animate-bounce-slight w-full max-w-md">
                <div className="relative group">
                    <img src={initialEnemy.avatarUrl} className="w-28 h-28 rounded-full border-4 border-red-800 shadow-[0_0_20px_rgba(220,38,38,0.6)] transition-transform group-hover:scale-105" alt="Enemy" />
                    {enemyBlock > 0 && (
                        <div className="absolute -top-2 -right-8 flex items-center text-blue-200 font-bold border border-blue-500 px-2 rounded bg-blue-900/80 z-20 shadow-lg animate-pulse">
                            🛡️ {enemyBlock}
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-center mt-2 w-full">
                    <h3 className="text-2xl font-bold text-red-200 text-shadow">{initialEnemy.name}</h3>
                    
                    {/* Enemy HP Bar */}
                    <div className="w-full max-w-[300px] h-4 bg-gray-700 rounded-full mt-1 border border-gray-600 overflow-hidden relative shadow-lg">
                        <div 
                            className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300" 
                            style={{ width: `${Math.max(0, (enemyHp / initialEnemy.stats.maxHp) * 100)}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white text-shadow-sm">
                            {Math.max(0, enemyHp)} / {initialEnemy.stats.maxHp}
                        </span>
                    </div>

                    {/* Enemy Extra Info (Realm, Spirit, Elements) */}
                    <div className="flex flex-wrap justify-center gap-3 mt-2 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                        <span className="text-xs font-bold text-amber-400">{getRealmName(initialEnemy.level)}</span>
                        <span className="text-xs text-blue-300 font-mono">神识:{enemySpirit}/{initialEnemy.stats.maxSpirit}</span>
                    </div>
                    {/* Enemy Elements (Only > 0) */}
                    <div className="flex gap-1 mt-1 justify-center">
                        {Object.entries(enemyElements).map(([elem, val]) => {
                            const v = val as number;
                            if (v <= 0) return null;
                            const config = ELEMENT_CONFIG[elem as ElementType];
                            return (
                                <div key={elem} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-600/50 ${config.bg} bg-opacity-60`} title={`${elem}灵力`}>
                                    <span className="text-[10px]">{config.icon}</span>
                                    <span className={`text-[10px] font-bold ${config.color}`}>{v}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>

        {/* Turn Indicator & Combat Log */}
        <div className="absolute top-[38vh] left-1/2 -translate-x-1/2 z-20 flex items-center">
             <div className={`
                    px-8 py-2 rounded-full font-bold text-lg border-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 flex items-center gap-2 whitespace-nowrap
                    ${turn === 'PLAYER' ? 'bg-emerald-600 border-emerald-400 text-white scale-110' : 'bg-red-900 border-red-700 text-gray-300'}
                `}>
                    {turn === 'PLAYER' ? '🟢 你的回合' : '🔴 敌方回合'}
                    {turn === 'PLAYER' && <Button size="sm" variant="danger" onClick={endTurn} className="ml-4 py-0.5 text-xs">结束</Button>}
             </div>

             {/* Combat Log to the right of the button */}
             <div className="absolute left-full ml-6 w-72 text-left pointer-events-none">
                {combatLog.slice().reverse().map((log, i) => (
                    <div key={i} className={`text-sm drop-shadow-md animate-fade-in bg-black/50 p-1.5 mb-1 rounded backdrop-blur-sm border-l-2 ${i === 0 ? 'text-white border-emerald-400 font-bold scale-105' : 'text-slate-400 border-transparent'}`}>
                        {log}
                    </div>
                ))}
            </div>
        </div>

        {/* Bottom: Player Area */}
        <div className="flex-1 bg-gradient-to-t from-slate-900 to-slate-800 relative overflow-hidden flex flex-col justify-end">
            
            {/* Hand Cards Area - Middle Lower */}
            {/* Moved up by increasing bottom padding to pb-52 */}
            <div className="flex-1 flex items-end justify-center pb-52 overflow-hidden z-10 pointer-events-none w-full">
                 <div className="flex gap-3 px-4 pointer-events-auto items-end h-[240px] w-full max-w-[95%] overflow-x-auto no-scrollbar justify-center">
                    {hand.map((card, idx) => (
                        <div key={`${card.id}-${idx}`} className="transform hover:-translate-y-4 transition-transform duration-200 flex-shrink-0 mb-2">
                             <CardItem 
                                card={card} 
                                isPlayable={turn === 'PLAYER' && playerSpirit >= card.cost}
                                playerLevel={initialPlayer.level}
                                currentElement={playerElements[card.element]}
                                onClick={() => playCard(idx)}
                             />
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats Panel - Bottom Center (Redesigned) */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-full max-w-3xl flex flex-col items-center gap-2 z-20 pointer-events-none">
                
                {/* Avatar & HP - Centered */}
                <div className="flex items-center gap-4 bg-slate-900/90 px-6 py-2 rounded-full border border-slate-600 shadow-xl pointer-events-auto backdrop-blur-md">
                     {/* Avatar + Level */}
                     <div className="relative shrink-0">
                         <img src={initialPlayer.avatarUrl} alt="Player" className="w-14 h-14 rounded-full border-2 border-emerald-500 shadow-lg object-cover" />
                         <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-900 text-[9px] px-2 rounded border border-emerald-600 whitespace-nowrap text-emerald-200 font-bold">
                            {getRealmName(initialPlayer.level)}
                         </div>
                     </div>
                     {/* HP Bar */}
                     <div className="flex flex-col gap-1 w-48">
                         <div className="flex justify-between items-end text-xs font-bold">
                            <span className="text-emerald-400">HP</span>
                            <span className="text-slate-300">{Math.max(0, playerHp)} / {initialPlayer.stats.maxHp}</span>
                         </div>
                         <div className="h-3 bg-gray-800 rounded-full border border-gray-700 overflow-hidden relative">
                             <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all" style={{ width: `${Math.max(0, (playerHp / initialPlayer.stats.maxHp) * 100)}%` }}></div>
                         </div>
                         {playerBlock > 0 && (
                             <div className="text-blue-300 text-[10px] font-bold mt-0.5 flex items-center gap-1">
                                🛡️ 护盾 {playerBlock}
                             </div>
                         )}
                     </div>
                </div>

                {/* Spirit & Elements - Centered below */}
                <div className="flex items-center gap-4 bg-black/60 px-4 py-2 rounded-xl backdrop-blur-sm border border-slate-700/50 pointer-events-auto">
                     {/* Spirit */}
                     <div className="flex items-center gap-2 border-r border-slate-600/50 pr-4 h-full">
                         <span className="text-[10px] text-blue-400 font-bold uppercase">神识</span>
                         <div className="flex gap-0.5">
                            {Array.from({ length: initialPlayer.stats.maxSpirit }).map((_, i) => (
                                <div key={i} className={`w-2.5 h-2.5 rounded-full border border-blue-400 transition-all ${i < playerSpirit ? 'bg-blue-500 shadow-[0_0_5px_blue]' : 'bg-transparent opacity-30'}`}></div>
                            ))}
                         </div>
                     </div>
                     
                     {/* Elements - Split into 2 Rows */}
                     <div className="flex flex-col gap-1 items-center">
                        <div className="flex gap-2">
                            {primaryElements.map(elem => renderElementBadge(elem, playerElements[elem] || 0))}
                        </div>
                        <div className="flex gap-2">
                            {secondaryElements.map(elem => renderElementBadge(elem, playerElements[elem] || 0))}
                        </div>
                     </div>
                </div>
            </div>

        </div>
        
        <style>{`
          @keyframes slash {
            0% { transform: scale(0.5) rotate(-45deg); opacity: 0; }
            50% { transform: scale(1.5) rotate(0deg); opacity: 1; }
            100% { transform: scale(1) rotate(45deg); opacity: 0; }
          }
          @keyframes floatUp {
            0% { transform: translateY(0) scale(0.8); opacity: 0; }
            20% { opacity: 1; transform: translateY(-20px) scale(1.2); }
            100% { transform: translateY(-60px) scale(1); opacity: 0; }
          }
          @keyframes shieldPulse {
             0% { transform: scale(0.9); opacity: 0; box-shadow: 0 0 0 rgba(59, 130, 246, 0); }
             50% { transform: scale(1.1); opacity: 0.8; box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
             100% { transform: scale(1); opacity: 0; box-shadow: 0 0 0 rgba(59, 130, 246, 0); }
          }
          .animate-slash { animation: slash 0.5s ease-out forwards; }
          .animate-heal { animation: floatUp 1.5s ease-out forwards; }
          .animate-shield { animation: shieldPulse 0.8s ease-out forwards; }
        `}</style>
    </div>
  );
};

// Sub-component for rendering visual effects
const VisualEffect: React.FC<{ type: VfxType }> = ({ type }) => {
    if (type === 'SLASH') {
        return (
            <div className="text-6xl text-red-500 font-bold animate-slash filter drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">
                ⚔️ 斩!
            </div>
        );
    }
    if (type === 'HEAL') {
        return (
            <div className="relative">
                 <div className="absolute -left-8 -top-4 text-4xl animate-heal animation-delay-100">💚</div>
                 <div className="absolute left-0 top-0 text-5xl animate-heal">✨</div>
                 <div className="absolute left-8 -top-8 text-4xl animate-heal animation-delay-200">➕</div>
            </div>
        );
    }
    if (type === 'SHIELD') {
        return (
            <div className="w-40 h-40 rounded-full border-4 border-blue-400 bg-blue-500/30 animate-shield shadow-[0_0_30px_blue]"></div>
        );
    }
    if (type === 'BUFF') {
         return (
            <div className="relative">
                 <div className="absolute -left-6 top-0 text-4xl animate-heal text-yellow-300">⬆️</div>
                 <div className="absolute left-6 top-4 text-4xl animate-heal text-yellow-300 animation-delay-200">🔥</div>
            </div>
         );
    }
    return null;
};
